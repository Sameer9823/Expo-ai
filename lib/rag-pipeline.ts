import { inputGuardrails, outputGuardrails } from "./guardrails";
import { translateQuery, contextualizeQuery, ChatTurn } from "./query-translation";
import { retrieveMulti, rerankAndDedupe, retrieveSingle } from "./retrieval";
import { generateAnswerStreaming, generateGreetingAnswer, isGreeting, scoreAnswer, generateFollowups, Source } from "./generate";

const FINAL_TOP_K = 5;
const SCORE_THRESHOLD = 6;
const MAX_RETRIES = 3;

export type PipelineEvent =
  | { type: "status"; step: string }
  | { type: "token"; value: string }
  | { type: "sources"; sources: Source[]; final: boolean }
  | { type: "confidence"; score: number }
  | { type: "followups"; questions: string[] }
  | { type: "blocked"; reason: string }
  | { type: "done" };

export type PipelineOptions = {
  /** Recent chat turns, oldest first, used to resolve follow-up questions. */
  history?: ChatTurn[];
  /** Scope retrieval to a single course module (e.g. "module 8"). */
  moduleFilter?: string;
};

function toSourceEvent(chunks: { module: string; lesson: string; timestamp: string; startTime: number }[]) {
  return chunks.map((c) => ({
    module: c.module,
    lesson: c.lesson,
    timestamp: c.timestamp,
    startTime: c.startTime,
  }));
}

/**
 * Runs the full advanced RAG pipeline for one query, emitting progress
 * events as it goes so the UI can show what stage it's in.
 */
export async function runRagPipeline(
  query: string,
  emit: (event: PipelineEvent) => void,
  options: PipelineOptions = {}
): Promise<void> {
  const { history = [], moduleFilter } = options;
   if (isGreeting(query)) {
    emit({ type: "status", step: "Saying hello" });
    const { answer, sources } = await generateGreetingAnswer((token) =>
      emit({ type: "token", value: token })
    );
    emit({ type: "sources", sources, final: true });
    emit({ type: "confidence", score: 10 });
    emit({
      type: "followups",
      questions: [
        "What is Expo and how is it different from React Native CLI?",
        "How do I set up my first Expo project?",
        "What topics does this course cover?",
      ],
    });
    emit({ type: "done" });
    return;
  }

  emit({ type: "status", step: "Checking your question" });
  const inputCheck = await inputGuardrails(query);
  if (!inputCheck.allowed) {
    emit({ type: "blocked", reason: inputCheck.reason ?? "Question was blocked." });
    return;
  }

  // Conversation memory: resolve "what about part 2?" into a standalone
  // question using the recent turns before it ever reaches retrieval.
  emit({ type: "status", step: "Reading conversation context" });
  const standaloneQuery = await contextualizeQuery(query, history);

  emit({ type: "status", step: "Rewriting query for better search" });
  const translated = await translateQuery(standaloneQuery);

  emit({ type: "status", step: "Searching course transcripts" });
  const candidates = await retrieveMulti(translated, moduleFilter);
  let topChunks = rerankAndDedupe(candidates, FINAL_TOP_K);

  // Streaming source cards: show what was retrieved right away, before the
  // answer starts generating. These are marked non-final because the
  // corrective loop below may still re-retrieve with a rewritten query.
  emit({ type: "sources", sources: toSourceEvent(topChunks), final: false });

  let currentQuery = standaloneQuery;
  let attempt = 0;
  let finalAnswer = "";
  let finalSources: Source[] = [];
  let finalScore = 0;

  while (attempt <= MAX_RETRIES) {
    emit({
      type: "status",
      step: attempt === 0 ? "Generating answer" : `Retrying (${attempt}/${MAX_RETRIES})`,
    });

    const isLastAttempt = attempt === MAX_RETRIES;

    const { answer, sources } = await generateAnswerStreaming(
      currentQuery,
      topChunks,
      (token) => {
        // Only stream tokens live on the final attempt so the user doesn't
        // see a low-quality draft that's about to be discarded and retried.
        if (isLastAttempt) emit({ type: "token", value: token });
      }
    );

    const outputCheck = await outputGuardrails(answer);
    if (!outputCheck.allowed) {
      emit({ type: "blocked", reason: outputCheck.reason ?? "Response was blocked." });
      return;
    }

    const { score, keywords } = await scoreAnswer(currentQuery, answer);

    if (isLastAttempt) {
      finalAnswer = answer;
      finalSources = sources;
      finalScore = score;
      break;
    }

    if (score >= SCORE_THRESHOLD) {
      // Good enough — stream it now since we withheld tokens above.
      for (const char of answer) emit({ type: "token", value: char });
      finalAnswer = answer;
      finalSources = sources;
      finalScore = score;
      break;
    }

    // Corrective step: rewrite the query with extracted keywords and
    // retrieve again before the next attempt.
    currentQuery = keywords.length ? `${standaloneQuery} ${keywords.join(" ")}` : standaloneQuery;
    topChunks = await retrieveSingle(currentQuery, FINAL_TOP_K, moduleFilter);
    emit({ type: "sources", sources: toSourceEvent(topChunks), final: false });
    attempt++;
  }

  emit({ type: "sources", sources: finalSources, final: true });
  emit({ type: "confidence", score: Math.round(finalScore) });

  emit({ type: "status", step: "Preparing follow-up questions" });
  const followups = await generateFollowups(query, finalAnswer, finalSources);
  if (followups.length) emit({ type: "followups", questions: followups });

  emit({ type: "done" });
}
