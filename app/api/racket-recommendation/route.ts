import Anthropic from "@anthropic-ai/sdk";
import { getRacketDatabaseText } from "@/lib/racket-database";

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
};

const client = new Anthropic();

export async function POST(request: Request) {
  const answers: Record<string, string> = await request.json();

  const prompt = `You are a professional tennis racket fitting expert. A player has answered 7 questions and you must recommend the single best racket for them from the database below.

## Player Profile
- Age group: ${answers.age}
- Playing level: ${answers.skill}
- Preferred racket weight: ${answers.weight}
- Game style: ${answers.style}
- Top priority in a racket: ${answers.priority}
- Budget: ${answers.budget} (budget = under €150, mid = €150-200, premium = over €200)
- Brand preference: ${answers.brand}

## Racket Database
${getRacketDatabaseText()}

## Instructions
Carefully match this player's profile against every racket in the database. Consider all 7 answers together — a beginner over 55 who prioritises comfort needs a very different racket than an aggressive advanced player aged 25.

Budget filtering is strict: if budget is "budget" (under €150), only recommend rackets with price_range starting under €150. If "mid" (€150-200), stick to rackets priced €150-220 range. If "premium" (over €200), any price is fine.

If the player specified a brand preference (not "any"), strongly prefer that brand, but only if a suitable model exists for their profile. Don't force a bad fit just for brand loyalty.

Respond ONLY with valid JSON in this exact shape, no markdown, no explanation outside the JSON:

{
  "name": "Full racket name exactly as in the database",
  "brand": "Brand name",
  "category": "Category from the database",
  "price_range": "Price range from the database",
  "specs": {
    "head_size": "e.g. 100 sq in",
    "weight": "e.g. 300g unstrung",
    "balance": "e.g. 320mm",
    "stiffness": "e.g. 67 RA",
    "string_pattern": "e.g. 16x19"
  },
  "why": "2-3 sentences explaining specifically why this racket is the best match for THIS player's answers. Be concrete — reference their age, level, style, and priority.",
  "strengths": ["3 to 4 bullet points of the key strengths for this specific player"],
  "watch_out": "One sentence about the main thing this player should be aware of with this racket.",
  "runner_up": "Name of the second-best racket from the database",
  "runner_up_why": "One sentence explaining why the runner-up is worth considering."
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

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Racket recommendation error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
