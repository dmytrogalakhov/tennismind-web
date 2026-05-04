import Anthropic from "@anthropic-ai/sdk";
import { getRacketDatabaseText, RACKET_DATABASE } from "@/lib/racket-database";
import { getCached, setCached } from "@/lib/racket-cache";

export type RecommendedString = {
  name: string;
  type: string;
  tension_range_kg: string;
  why: string;
};

export type RecommendationResult = {
  name: string;
  brand: string;
  category: string;
  price_range_eur: string;
  specs: {
    head_size_sq_in: number;
    weight_g: number;
    balance_mm: number;
    stiffness_ra: number;
    string_pattern: string;
  };
  why: string;
  strengths: string[];
  watch_out: string;
  runner_up: string;
  recommended_string: RecommendedString;
  image_url?: string;
};

const client = new Anthropic();

export async function POST(request: Request) {
  const answers: Record<string, string> = await request.json();

  const cached = getCached(answers);
  if (cached) return Response.json(cached);

  const brandConstraint = answers.brand === "any"
    ? "Brand preference: Open to anything — RESTRICT recommendations to Babolat, Head, or Wilson only."
    : `Brand preference: ${answers.brand} — strongly prefer this brand if a suitable model exists.`;

  const prompt = `You are a professional tennis racket fitting expert. A player has answered 7 questions. Recommend the single best racket from the database below.

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
Carefully match the player's profile against every racket. Budget filtering is strict: only recommend rackets within the player's budget range.

Your response MUST be valid JSON with exactly these four fields — nothing else:

{
  "name": "Full racket name exactly as written in the database",
  "why": "2-3 sentences explaining specifically why this racket is the best match for THIS player. Be concrete — reference their age, level, style, and priority.",
  "strengths": ["3 to 4 bullet points of key strengths for this specific player"],
  "watch_out": "One sentence about the main thing this player should be aware of with this racket."
}

No markdown, no extra fields, no explanation outside the JSON.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const llm = JSON.parse(json) as { name: string; why: string; strengths: string[]; watch_out: string };

    const dbEntry = RACKET_DATABASE.find(
      (r) => r.name.toLowerCase() === llm.name.toLowerCase()
    );

    if (!dbEntry) {
      console.error("Racket not found in database:", llm.name);
      return Response.json({ error: "Recommended racket not found in database" }, { status: 500 });
    }

    const result: RecommendationResult = {
      name: dbEntry.name,
      brand: dbEntry.brand,
      category: dbEntry.category,
      price_range_eur: dbEntry.price_range_eur,
      specs: {
        head_size_sq_in: dbEntry.head_size_sq_in,
        weight_g: dbEntry.weight_g,
        balance_mm: dbEntry.balance_mm,
        stiffness_ra: dbEntry.stiffness_ra,
        string_pattern: dbEntry.string_pattern,
      },
      why: llm.why,
      strengths: llm.strengths,
      watch_out: llm.watch_out,
      runner_up: dbEntry.similar_alternatives[0] ?? "",
      recommended_string: { ...dbEntry.recommended_string },
      ...(dbEntry.image_url ? { image_url: dbEntry.image_url } : {}),
    };

    setCached(answers, result);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Racket recommendation error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
