# Solution Design: Smarter RAG Usage

**Status:** Proposed
**Date:** July 2026
**Priority:** 3 of 5

---

## 1. Problem

The current RAG store deduplicates by exact semantic similarity — if we already wrote about Djokovic's forehand dominance, we won't write about it again. That's the correct behaviour for basic dedup, but two problems have emerged:

1. **Angle lock**: once a subject/angle pair is stored, we never revisit that angle even when something newsworthy happens on it. We covered "Swiatek clay dominance" in March — we shouldn't cover the same angle in July, but after a loss on clay, we absolutely should.

2. **Cross-agent bleed**: memory written by the recap agent blocks the insights agent from covering the same player. A recap fact ("Djokovic lost to Tsitsipas in R2") prevents an insights card ("Djokovic's R2 exit rate at Grand Slams") even though these are completely different content types with different purposes.

The result is an insights and predictions agent that runs out of angles after a tournament or two and falls back on generic content.

---

## 2. Goal

- Make RAG aware of content type when checking for duplicates
- Allow re-entry on angles when a significant trigger event has occurred
- Give the LLM visibility into *what we've already covered* so it can consciously choose a new angle, rather than being silently blocked

---

## 3. Current RAG Architecture

The memory store lives at `data/memory-store.json`. Each entry:

```json
{
  "id": "uuid",
  "content_type": "insights",
  "subject": "Novak Djokovic",
  "angle": "clay court dominance",
  "embedding": [...],
  "created_at": "2026-06-01"
}
```

Dedup check: cosine similarity of query embedding vs. stored embeddings. If similarity > 0.85, skip.

---

## 4. Proposed Changes

### 4.1 Scope dedup to content_type

The duplicate check should filter the store by `content_type` before comparing embeddings:

```python
def _is_duplicate(query_embedding, content_type, threshold=0.85):
    same_type = [e for e in store if e["content_type"] == content_type]
    return any(cosine_sim(query_embedding, e["embedding"]) > threshold
               for e in same_type)
```

This means a recap fact about Djokovic does not block an insights card about Djokovic.

### 4.2 Time-bounded angle decay

Entries older than a configurable TTL are excluded from the duplicate check (but not deleted — they remain for context injection):

```python
ANGLE_TTL_DAYS = {
    "insights": 60,   # insights angles stay fresh for 60 days
    "recap": 14,      # recap angles decay in 14 days (tournament-scoped)
    "prediction": 7,  # prediction angles reset each week
}

def _is_duplicate(query_embedding, content_type, threshold=0.85):
    ttl = ANGLE_TTL_DAYS.get(content_type, 30)
    cutoff = datetime.now() - timedelta(days=ttl)
    same_type = [e for e in store
                 if e["content_type"] == content_type
                 and datetime.fromisoformat(e["created_at"]) > cutoff]
    return any(cosine_sim(query_embedding, e["embedding"]) > threshold
               for e in same_type)
```

### 4.3 Trigger-based angle unlock

A new field `trigger_conditions` per entry specifies what events would allow re-entry:

```json
{
  "subject": "Iga Swiatek",
  "angle": "clay court dominance",
  "trigger_conditions": ["loss_on_clay", "tournament_end"],
  "last_event": null
}
```

When a trigger fires (e.g., Swiatek loses on clay), the entry is marked `unlocked=True` and the dedup check skips it for the next 7 days. Triggers are evaluated at the start of each pipeline run against the latest ESPN results.

### 4.4 Coverage injection ("what we've already covered")

Instead of silently blocking content, inject the recent coverage list into the generation prompt:

```
RECENT COVERAGE (last 30 days) — do not repeat these angles:
- Djokovic: "clay court survival rate" (2026-06-15, insights)
- Djokovic: "H2H vs Alcaraz" (2026-06-01, insights)
- Djokovic: "R2 exit at Roland Garros" (2026-06-08, recap)

Pick an angle NOT on this list. If there's no fresh angle, skip this player.
```

This makes the constraint visible to the LLM and gives it agency to choose — rather than having the system silently re-run and produce blocked output.

---

## 5. Data Model Changes

Current store entry:

```json
{
  "id": "uuid",
  "content_type": "insights",
  "subject": "Novak Djokovic",
  "angle": "clay court dominance",
  "embedding": [...]
}
```

Proposed additions:

```json
{
  "id": "uuid",
  "content_type": "insights",
  "subject": "Novak Djokovic",
  "angle": "clay court dominance",
  "embedding": [...],
  "created_at": "2026-06-01T10:00:00",
  "trigger_conditions": ["loss_on_clay"],
  "unlocked": false,
  "unlocked_at": null,
  "tournament": "Roland Garros 2026"
}
```

Migration: existing entries get `created_at = file_mtime`, `trigger_conditions = []`, `unlocked = false`. One-time migration script.

---

## 6. Coverage Injection Implementation

```python
def _get_coverage_summary(subject: str, content_type: str, days: int = 30) -> str:
    cutoff = datetime.now() - timedelta(days=days)
    relevant = [
        e for e in store
        if e["subject"].lower() == subject.lower()
        and datetime.fromisoformat(e["created_at"]) > cutoff
    ]
    if not relevant:
        return ""
    lines = [f"- {e['subject']}: \"{e['angle']}\" ({e['created_at'][:10]}, {e['content_type']})"]
    return "RECENT COVERAGE (do not repeat):\n" + "\n".join(lines)
```

This is injected into every insights and prediction generation prompt where a subject is known.

---

## 7. Implementation Steps

1. Add `created_at`, `trigger_conditions`, `unlocked`, `tournament` fields to store entries
2. Write one-time migration function for existing entries
3. Update `_is_duplicate()` to filter by `content_type` and apply TTL
4. Implement `_check_triggers()` — runs at pipeline start, evaluates trigger conditions against latest ESPN results
5. Implement `_get_coverage_summary()` and inject into insights/prediction prompts
6. Update `_save_store()` to write new fields on every new entry
7. Add `--rag-status` debug flag to orchestrator: prints all entries for a given subject

---

## 8. Open Questions

- **Trigger condition vocabulary**: "loss_on_clay", "tournament_end", "ranking_change" — how many triggers do we need at launch? Recommendation: ship with just `tournament_end` (easy to detect) and `loss_on_clay`/`loss_on_grass`/`loss_on_hard` (derivable from ESPN). Expand later.
- **Unlock duration**: 7 days feels right for most angles. Should it be configurable per trigger? Start fixed, parameterise later if needed.
- **Coverage injection token cost**: injecting a 10-line coverage list per subject adds ~200 tokens per card. At scale (50 cards/week) this is negligible.
- **Embedding model**: currently using OpenAI text-embedding-3-small. No change needed — the scoping changes are purely filtering logic on top of existing embeddings.
