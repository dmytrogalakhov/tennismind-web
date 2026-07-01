# Solution Design: Tavily Batching and Caching

**Status:** Proposed
**Date:** July 2026
**Priority:** 5 of 5

---

## 1. Problem

The current Tavily integration makes one HTTP request per match per enrichment field. For a 8-match recap with 3 enrichment fields each, that's up to 24 sequential Tavily calls. Two failure modes:

1. **Latency**: sequential calls add 20–40 seconds to the recap run at peak load
2. **Rate limits and failures**: a single Tavily timeout mid-enrichment leaves some matches enriched and others not, causing inconsistent recap quality. When the retry logic isn't tight, the pipeline silently skips enrichment for later matches

These aren't hypothetical — we've seen partial enrichment produce recaps where the first two matches are deeply contextualised and the last three are bare scorelines.

---

## 2. Goal

- Reduce Tavily call count per pipeline run
- Make failed calls recoverable without re-running the entire enrichment step
- Eliminate silent partial enrichment — fail loudly or succeed completely

---

## 3. Current Architecture

`enrich_marquee_matches()` calls `_tavily_search(query)` per field per match:

```python
for match in matches_to_enrich:
    context["h2h"] = _tavily_search(f"{p1} vs {p2} head to head")
    context["form"] = _tavily_search(f"{p1} recent form 2026")
    context["news"] = _tavily_search(f"{p1} {p2} {tournament}")
```

Each `_tavily_search()` is a synchronous HTTP call with a 10s timeout and no caching.

---

## 4. Proposed Changes

### 4.1 Request batching with asyncio

Run all Tavily calls for a given pipeline invocation concurrently:

```python
import asyncio
import httpx

async def _tavily_search_async(client: httpx.AsyncClient, query: str) -> dict:
    resp = await client.post(
        "https://api.tavily.com/search",
        json={"query": query, "max_results": 5},
        headers={"Authorization": f"Bearer {TAVILY_API_KEY}"},
        timeout=15.0
    )
    resp.raise_for_status()
    return resp.json()

async def _enrich_all_async(queries: list[tuple[str, str]]) -> dict[str, dict]:
    """
    queries: list of (key, query_string) pairs
    returns: dict of key → result
    """
    async with httpx.AsyncClient() as client:
        tasks = {key: _tavily_search_async(client, q) for key, q in queries}
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        return {key: r for key, r in zip(tasks.keys(), results)
                if not isinstance(r, Exception)}
```

A 24-call sequential run (≈40s) becomes a 24-call concurrent run (≈8s — bounded by the slowest single call).

The existing `_tavily_search()` synchronous wrapper calls `asyncio.run(_tavily_search_async(...))` for backwards compatibility at existing call sites.

### 4.2 Query-level caching

Cache Tavily responses keyed by query string with a 6-hour TTL. Avoids repeat calls when the same player appears in multiple contexts (e.g., Djokovic appears in H2H query and also in a "next match" draw-context query):

```python
TAVILY_CACHE_PATH = "data/tavily-cache.json"
TAVILY_CACHE_TTL_HOURS = 6

def _load_tavily_cache() -> dict:
    if os.path.exists(TAVILY_CACHE_PATH):
        raw = json.load(open(TAVILY_CACHE_PATH))
        cutoff = (datetime.now() - timedelta(hours=TAVILY_CACHE_TTL_HOURS)).isoformat()
        return {k: v for k, v in raw.items() if v["cached_at"] > cutoff}
    return {}

def _save_tavily_cache(cache: dict):
    json.dump(cache, open(TAVILY_CACHE_PATH, "w"), indent=2)

def _tavily_search(query: str) -> dict:
    cache = _load_tavily_cache()
    if query in cache:
        return cache[query]["result"]
    result = asyncio.run(_tavily_search_async_single(query))
    cache[query] = {"result": result, "cached_at": datetime.now().isoformat()}
    _save_tavily_cache(cache)
    return result
```

Cache hit rate is expected to be high within a tournament day (same players queried by both recap and predictions).

### 4.3 Explicit failure handling

Replace silent partial enrichment with an explicit enrichment manifest:

```python
@dataclass
class EnrichmentResult:
    match_key: str
    h2h: dict | None
    form: dict | None
    news: dict | None
    errors: list[str]        # which fields failed and why
    enrichment_score: int    # 0-3, number of fields that succeeded
```

If `enrichment_score < 2`, the match is flagged as `partially_enriched=True` in the match context passed to the LLM. The writing prompt includes:

```
⚠ PARTIALLY ENRICHED MATCHES (enrichment_score < 2):
- Hurkacz def. Rune — only H2H data available. Do not speculate on form or news.
```

This prevents the LLM from confabulating context it wasn't given.

### 4.4 Retry with backoff

Failed async calls retry once after a 2-second delay before being marked as errors:

```python
async def _tavily_search_async(client, query: str, retries=1) -> dict:
    for attempt in range(retries + 1):
        try:
            resp = await client.post(...)
            resp.raise_for_status()
            return resp.json()
        except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
            if attempt == retries:
                raise
            await asyncio.sleep(2)
```

---

## 5. Query Deduplication

Before dispatching, collect all queries for the run and deduplicate:

```python
def _build_query_list(matches: list[dict]) -> list[tuple[str, str]]:
    seen = set()
    queries = []
    for m in matches:
        p1, p2 = m["winner"], m["loser"]
        for key, q in [
            (f"{m['key']}_h2h", f"{p1} vs {p2} head to head career"),
            (f"{m['key']}_form", f"{p1} 2026 form recent matches"),
            (f"{m['key']}_news", f"{p1} {p2} {m['tournament']}"),
        ]:
            if q not in seen:
                seen.add(q)
                queries.append((key, q))
    return queries
```

Players who appear in multiple matches (common in recaps when covering both ATP and WTA from the same tournament day) only get one form and news query.

---

## 6. Implementation Steps

1. Add `httpx` to requirements (currently using `requests` — swap selectively; keep `requests` for non-Tavily calls)
2. Write `_tavily_search_async()` and `_enrich_all_async()`
3. Add cache load/save with TTL logic; create `data/tavily-cache.json`
4. Refactor `enrich_marquee_matches()` to build query list, dispatch async, return `EnrichmentResult` objects
5. Update recap writing prompt to include `⚠ PARTIALLY ENRICHED` block
6. Add enrichment stats to recap log output: "Enriched 7/8 matches (1 partial)"
7. Clear Tavily cache at start of each orchestrator day run (not between agents — share within a day)

---

## 7. Open Questions

- **`httpx` vs `aiohttp`**: both are solid async HTTP clients. `httpx` has a synchronous API that mirrors `requests` making the migration easier. Recommendation: httpx.
- **Cache invalidation during a tournament day**: 6-hour TTL means a 10:00 prediction query and a 14:00 news query can share cached results. Fine for H2H (doesn't change intraday), questionable for news (a match could have been played between the two runs). Recommendation: cache H2H with 24h TTL, news with 2h TTL.
- **Tavily API rate limits**: the free tier allows 1000 requests/month; Pro allows unlimited. Check current plan before optimising — if we're well within limits, caching is nice-to-have rather than critical.
- **Thread safety of cache file**: if two orchestrator runs overlap (unlikely but possible), concurrent writes to `tavily-cache.json` could corrupt it. Use file locking (`fcntl.flock`) on write, or switch to a write-then-rename pattern.
