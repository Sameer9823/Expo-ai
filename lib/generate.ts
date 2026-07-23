import { chatJSON, chatStream } from "./llm";
import { ScoreAnswerSchema, FollowupsSchema } from "./schemas";
import { ScoredChunk } from "./vector-store";

export type Source = {
  module: string;
  lesson: string;
  timestamp: string;
  startTime?: number;
  text?: string; // transcript chunk this source was drawn from
};

function buildContext(chunks: ScoredChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.module} · ${c.lesson} · ${c.timestamp})\n${c.text}`
    )
    .join("\n\n");
}

/** Grabs the first few sentences of a chunk's transcript, used as a preview excerpt. */
function excerptFrom(text: string, maxSentences = 3): string {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text];
  return sentences.slice(0, maxSentences).join("").trim();
}

/**
 * Fallback used when the corrective loop runs out of retries and the best
 * answer still isn't grounded in the course. HyDE (and the other query
 * variants) still retrieve the *closest* chunks even when nothing actually
 * covers the question, so instead of a bare "I don't know" we show that
 * closest excerpt and steer the student toward what the course does cover.
 */
export function buildOutOfCourseAnswer(nearest: ScoredChunk | undefined): string {
  if (!nearest) {
    return (
      "That doesn't look like something this course covers, and I couldn't find " +
      "anything closely related in the transcripts either. Try asking about React " +
      "Native basics, Expo setup, navigation, or deployment instead."
    );
  }
  const excerpt = excerptFrom(nearest.text);
  return (
    `That doesn't look like it's covered in this course. The closest related material I found is from ` +
    `**${nearest.lesson}** (${nearest.module} · ${nearest.timestamp}):\n\n` +
    `> ${excerpt}\n\n` +
    `That's not quite what you asked though — want to ask about **${nearest.lesson}** instead, or something else from the course?`
  );
}

function toSources(chunks: ScoredChunk[]): Source[] {
  return chunks.map((c) => ({
    module: c.module,
    lesson: c.lesson,
    timestamp: c.timestamp,
    startTime: c.startTime,
    text: c.text,
  }));
}

const GREETING_PATTERN =
  /^(hi|hey|hello|yo|sup|hola|good\s?morning|good\s?afternoon|good\s?evening)[\s!.,]*$/i;

const GREETING_ANSWER =
  "Welcome to the Expo course assistant! Ask me anything about the course — " +
  "React Native basics, Expo setup, navigation, APIs, deployment, or any other " +
  "topic covered in the lessons — and I'll answer using the actual course transcripts.";

/** True only for short greeting-only messages ("hi", "hello", "yo") with nothing else in them. */
export function isGreeting(query: string): boolean {
  return GREETING_PATTERN.test(query.trim());
}

/** Canned welcome reply for greetings, streamed the same way a real answer would be so the UI behaves identically. */
export async function generateGreetingAnswer(
  onToken: (token: string) => void
): Promise<{ answer: string; sources: Source[] }> {
  for (const char of GREETING_ANSWER) onToken(char);
  return { answer: GREETING_ANSWER, sources: [] };
}

const SYSTEM_PROMPT =
  "You answer questions about a mobile development course using ONLY the " +
  "transcript excerpts provided below. Each excerpt is numbered and tagged " +
  "with its module, lesson, and timestamp. When you use information from an " +
  "excerpt, cite it inline like [1] or [2]. If the excerpts don't contain the " +
  "answer, say so plainly instead of guessing — never invent lesson names or " +
  "timestamps that aren't in the provided excerpts.";

/** Streams the final answer token-by-token, calling onToken as it generates. */
/** Extracts which excerpt numbers (e.g. [1], [2]) were actually cited in the answer. */
function citedIndices(answer: string): Set<number> {
  const matches = answer.matchAll(/\[(\d+)\]/g);
  return new Set([...matches].map((m) => parseInt(m[1], 10)));
}

/** Streams the final answer token-by-token, calling onToken as it generates. */
export async function generateAnswerStreaming(
  query: string,
  chunks: ScoredChunk[],
  onToken: (token: string) => void
): Promise<{ answer: string; sources: Source[] }> {
  const context = buildContext(chunks);
  const userPrompt = `Course excerpts:\n\n${context}\n\nQuestion: ${query}`;
  const answer = await chatStream(SYSTEM_PROMPT, userPrompt, onToken);

  // Only surface source cards for excerpts the model actually cited. If the
  // model said "the excerpts don't contain the answer," it won't have cited
  // anything, so no timestamps should show up alongside that response.
  const cited = citedIndices(answer);
  const usedChunks = cited.size
    ? chunks.filter((_, i) => cited.has(i + 1))
    : [];

  return { answer, sources: toSources(usedChunks) };
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