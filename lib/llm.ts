import OpenAI from "openai";
import { z } from "zod";


let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local before running ingestion or queries."
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const CHAT_MODEL = "gpt-4o-mini";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const openai = getClient();
  const BATCH = 96;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    out.push(...res.data.map((d) => d.embedding));
  }
  return out;
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

export async function chatJSON<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
  fallback: T
): Promise<T> {
  const openai = getClient();
  try {
    const res = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export async function chatText(
  system: string,
  user: string,
  temperature = 0.3
): Promise<string> {
  const openai = getClient();
  const res = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

export async function chatStream(
  system: string,
  user: string,
  onToken: (token: string) => void
): Promise<string> {
  const openai = getClient();
  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.3,
    stream: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  let full = "";
  for await (const part of stream) {
    const token = part.choices[0]?.delta?.content ?? "";
    if (token) {
      full += token;
      onToken(token);
    }
  }
  return full;
}
