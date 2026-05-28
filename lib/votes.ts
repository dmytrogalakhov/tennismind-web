import fs from "fs";
import path from "path";

const votesPath = path.join(process.cwd(), ".cache/card-votes.json");

export type VotesMap = Record<string, { up: number; down: number }>;

export function getVotes(): VotesMap {
  if (!fs.existsSync(votesPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(votesPath, "utf8")) as VotesMap;
  } catch {
    return {};
  }
}
