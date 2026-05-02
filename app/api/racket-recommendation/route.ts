import Anthropic from "@anthropic-ai/sdk";
import { getRacketDatabaseText } from "@/lib/racket-database";
import { getCached, setCached } from "@/lib/racket-cache";

export type RecommendedString = {
  name: string;
  type: string;
  tension_range: string;
  why: string;
};

export type RecommendationResult = {
  name: string;
  brand: string;
  category: string;
  price_range: string;
  specs: { head_size: string; weight: string; balance: string; stiffness: string; string_pattern: string };
  why: string;
  strengths: string[];
  watch_out: string;
  runner_up: string;
  runner_up_why: string;
  recommended_string: RecommendedString;
};

const client = new Anthropic();

export async function POST(request: Request) {
  const answers: Record<string, string> = await request.json();

  const cached = getCached(answers);
  if (cached) return Response.json(cached);

  const brandConstraint = answers.brand === "any"
    ? "Brand preference: Open to anything — RESTRICT recommendations to Babolat, Head, or Wilson only."
    : `Brand preference: ${answers.brand} — strongly prefer this brand if a suitable model exists.`;

  const prompt = `You are a professional tennis racket fitting expert. A player has answered 7 questions and you must recommend the single best racket for them from the database below.

## Player Profile
- Age group: ${answers.age}
- Playing level: ${answers.skill}
- Preferred racket weight: ${answers.weight}
- Game style: ${answers.style}
- Top priority in a racket: ${answers.priority}
- Budget: ${answers.budget} (budget = under €150, mid = €150-200, premium = over €200)
- ${brandConstraint}

## Racket Database
${getRacketDatabaseText()}

## Instructions
Carefully match this player's profile against every racket in the database. Consider all 7 answers together — a beginner over 55 who prioritises comfort needs a very different racket than an aggressive advanced player aged 25.

Budget filtering is strict: if budget is "budget" (under €150), only recommend rackets with price_range starting under €150. If "mid" (€150-200), stick to rackets priced €150-220 range. If "premium" (over €200), any price is fine.

CRITICAL — you MUST use EXACT values from the database for every field:
- "name": copy EXACTLY as written in the database, character for character
- "brand": copy EXACTLY from the database
- "category": copy EXACTLY from the database
- "price_range": copy EXACTLY from the database
- All "specs" fields: copy EXACTLY from the database (head_size, weight, balance, stiffness, string_pattern)
- "runner_up": MUST be a name from the "Similar alternatives" list of the recommended racket — do not pick any other racket
- "recommended_string": copy EXACTLY from the database's "Recommended string" field for the chosen racket (name, type, tension_range, why)

Do NOT invent, paraphrase, or approximate any spec, price, or name. The only fields you may write freely are "why", "strengths", "watch_out", and "runner_up_why".

Respond ONLY with valid JSON in this exact shape, no markdown, no explanation outside the JSON:

{
  "name": "Full racket name exactly as in the database",
  "brand": "Brand name exactly as in the database",
  "category": "Category exactly as in the database",
  "price_range": "Price range exactly as in the database",
  "specs": {
    "head_size": "exactly as in the database",
    "weight": "exactly as in the database",
    "balance": "exactly as in the database",
    "stiffness": "exactly as in the database",
    "string_pattern": "exactly as in the database"
  },
  "why": "2-3 sentences explaining specifically why this racket is the best match for THIS player's answers. Be concrete — reference their age, level, style, and priority.",
  "strengths": ["3 to 4 bullet points of the key strengths for this specific player"],
  "watch_out": "One sentence about the main thing this player should be aware of with this racket.",
  "runner_up": "Name of a racket from the Similar alternatives list — exactly as written",
  "runner_up_why": "One sentence explaining why the runner-up is worth considering.",
  "recommended_string": {
    "name": "String name exactly as in the database",
    "type": "String type exactly as in the database",
    "tension_range": "Tension range exactly as in the database",
    "why": "Why description exactly as in the database"
  }
}`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    // Strip markdown code fences if Claude wrapped the JSON
    const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const result: RecommendationResult = JSON.parse(json);
    setCached(answers, result);

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Racket recommendation error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
