import Anthropic from "@anthropic-ai/sdk";
import { getCachedTranslation, setCachedTranslation } from "@/lib/translation-cache";

const client = new Anthropic();

const LANGUAGE_NAMES: Record<string, string> = {
  de: "German",
  uk: "Ukrainian",
};

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .trim();
}

async function translateText(text: string, targetLanguage: string): Promise<string> {
  const cached = getCachedTranslation(targetLanguage, text);
  if (cached) return cached;

  const language = LANGUAGE_NAMES[targetLanguage];
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Translate the following tennis insight to ${language}. Translate ONLY the text provided. Do not add any new information or context. Keep all numbers, player names, tournament names, and tennis terms intact. Do not use any markdown formatting. Return ONLY the translated text, nothing else.\n\n${text}`,
      },
    ],
  });

  const result =
    message.content[0].type === "text"
      ? stripMarkdown(message.content[0].text)
      : text;

  setCachedTranslation(targetLanguage, text, result);
  return result;
}

export async function POST(request: Request) {
  const { title, body, targetLanguage } = (await request.json()) as {
    title: string;
    body: string;
    targetLanguage: "de" | "uk";
  };

  if (!body || !LANGUAGE_NAMES[targetLanguage]) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const [translatedTitle, translatedBody] = await Promise.all([
    title ? translateText(title, targetLanguage) : Promise.resolve(""),
    translateText(body, targetLanguage),
  ]);

  return Response.json({ translatedTitle, translatedBody });
}
