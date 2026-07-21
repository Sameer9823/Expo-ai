import { chatJSON, chatText } from "./llm";
import { DecomposeSchema } from "./schemas";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Conversation memory: rewrites a follow-up question ("what about part 2?")
 * into a standalone question using the recent chat history, so retrieval
 * and generation don't need the raw conversational context. No-ops (returns
 * the query unchanged) when there's no prior history.
 */
export async function contextualizeQuery(
  query: string,
  history: ChatTurn[]
): Promise<string> {
  if (history.length === 0) return query;

  const recent = history
    .slice(-6)
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
    .join("\n");

  const rewritten = await chatText(
    "Given the conversation history and a follow-up question, rewrite the " +
      "follow-up as a standalone question that makes sense without the history. " +
      "Keep it faithful to what the user is actually asking — don't add new " +
      "assumptions. If the question is already standalone, return it unchanged. " +
      "Reply with only the rewritten question, nothing else.",
    `Conversation history:\n${recent}\n\nFollow-up question: ${query}`,
    0
  );

  return rewritten.trim() || query;
}

/** Step-back: rewrite a narrow question into a broader one that retrieves more context. */
export async function stepBack(query: string): Promise<string> {
  return chatText(
    "You rewrite a specific question into a broader, more general question " +
      "about the same topic, so a search system can retrieve more relevant background. " +
      "Reply with only the rewritten question, nothing else.",
    query
  );
}

/** Decompose: split a compound question into independent sub-questions. */
export async function decompose(query: string): Promise<string[]> {
  const result = await chatJSON(
     "You break a user's question into 2-4 independent, self-contained sub-questions " +
       'that together cover what they asked. Reply as JSON: {"subQuestions": ["...", "..."]}. ' +
       "If the question is already simple and atomic, return it unchanged as the only item.",
     query,
     DecomposeSchema,
     { subQuestions: [query] }
   );
   return result.subQuestions?.length ? result.subQuestions : [query];
 }

/** HyDE: generate a hypothetical answer paragraph, embedded instead of the raw query. */
export async function hyde(query: string): Promise<string> {
  return chatText(
    "Write a short, plausible-sounding paragraph (3-4 sentences) that WOULD answer " +
      "the user's question, as if it came from a programming course transcript. " +
      "It doesn't need to be factually correct — it's used only to improve semantic search. " +
      "Reply with only the paragraph.",
    query
  );
}

export type TranslatedQueries = {
  original: string;
  stepBack: string;
  hydeDoc: string;
  subQuestions: string[];
};

/** Runs all translation strategies in parallel for a single user query. */
export async function translateQuery(query: string): Promise<TranslatedQueries> {
  const [stepBackQ, hydeDoc, subQuestions] = await Promise.all([
    stepBack(query),
    hyde(query),
    decompose(query),
  ]);

  return {
    original: query,
    stepBack: stepBackQ,
    hydeDoc,
    subQuestions,
  };
}
