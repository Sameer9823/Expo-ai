import { chatJSON, chatStream } from "./llm";
import { ScoreAnswerSchema, FollowupsSchema } from "./schemas";
import { ScoredChunk } from "./vector-store";

export type Source = {
  module: string;
  lesson: string;
  timestamp: string;
  startTime?: number;
};

function buildContext(chunks: ScoredChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.module} · ${c.lesson} · ${c.timestamp})\n${c.text}`
    )
    .join("\n\n");
}

function toSources(chunks: ScoredChunk[]): Source[] {
  return chunks.map((c) => ({
    module: c.module,
    lesson: c.lesson,
    timestamp: c.timestamp,
    startTime: c.startTime,
  }));
}

const SYSTEM_PROMPT =
  "You answer questions about a mobile development course using ONLY the " +
  "transcript excerpts provided below. Each excerpt is numbered and tagged " +
  "with its module, lesson, and timestamp. When you use information from an " +
  "excerpt, cite it inline like [1] or [2]. If the excerpts don't contain the " +
  "answer, say so plainly instead of guessing — never invent lesson names or " +
  "timestamps that aren't in the provided excerpts.";

/** Streams the final answer token-by-token, calling onToken as it generates. */
export async function generateAnswerStreaming(
  query: string,
  chunks: ScoredChunk[],
  onToken: (token: string) => void
): Promise<{ answer: string; sources: Source[] }> {
  const context = buildContext(chunks);
  const userPrompt = `Course excerpts:\n\n${context}\n\nQuestion: ${query}`;
  const answer = await chatStream(SYSTEM_PROMPT, userPrompt, onToken);
  return { answer, sources: toSources(chunks) };
}

/** Non-streaming variant, used internally by the corrective loop to score drafts. */
export async function generateAnswer(
  query: string,
  chunks: ScoredChunk[]
): Promise<{ answer: string; sources: Source[] }> {
  let full = "";
  await generateAnswerStreaming(query, chunks, (t) => (full += t));
  return { answer: full, sources: toSources(chunks) };
}

/**
 * Corrective RAG: a small model scores how well-grounded and relevant the
 * draft answer is. Below the threshold, the query is rewritten with
 * extracted keywords and retried, up to maxRetries times.
 */
export async function scoreAnswer(
  query: string,
  answer: string
): Promise<{ score: number; keywords: string[] }> {
  const result = await chatJSON(
     "Score how well this answer addresses the question, from 0 (irrelevant " +
       "or says it doesn't know) to 10 (directly and specifically answers it). " +
       "Also extract 2-4 keywords that could improve a follow-up search if the " +
       'answer was weak. Reply as JSON: {"score": number, "keywords": ["..."]}',
     `Question: ${query}\n\nAnswer: ${answer}`,
      ScoreAnswerSchema,
     { score: 5, keywords: [] }
   );
  return result;
}

/**
 * Generates 2-3 related follow-up questions a learner might ask next, based
 * on the question just answered and which sources were used. Cheap, small
 * call — purely for engagement, so a fallback of no follow-ups is fine.
 */
export async function generateFollowups(
  query: string,
  answer: string,
  sources: Source[]
): Promise<string[]> {
  const lessons = [...new Set(sources.map((s) => s.lesson))].join(", ");
  const result = await chatJSON(
    "Suggest 2-3 short, natural follow-up questions a student might ask next " +
      "about this mobile development course, based on the question they just " +
      "asked and the lessons it touched. Keep each under 12 words. Don't repeat " +
      'the original question. Reply as JSON: {"followups": ["...", "..."]}',
    `Question: ${query}\n\nAnswer: ${answer}\n\nLessons referenced: ${lessons || "none"}`,
    FollowupsSchema,
    { followups: [] }
  );
  return result.followups.slice(0, 3);
}
