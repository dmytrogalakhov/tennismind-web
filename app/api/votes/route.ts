import fs from "fs";
import path from "path";

const votesPath = path.join(process.cwd(), ".cache/card-votes.json");

type Votes = Record<string, { up: number; down: number }>;

function readVotes(): Votes {
  if (!fs.existsSync(votesPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(votesPath, "utf8")) as Votes;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const { slug, vote } = (await request.json()) as { slug: string; vote: "up" | "down" };

  if (!slug || (vote !== "up" && vote !== "down")) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const votes = readVotes();
  if (!votes[slug]) votes[slug] = { up: 0, down: 0 };
  votes[slug][vote]++;

  fs.writeFileSync(votesPath, JSON.stringify(votes, null, 2));

  return Response.json(votes[slug]);
}
