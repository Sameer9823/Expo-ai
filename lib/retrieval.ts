import { embedText, embedTexts } from "./llm";
import { searchIndex, ScoredChunk } from "./vector-store";
import { TranslatedQueries } from "./query-translation";

const PER_QUERY_TOP_K = 8;

/**
 * Retrieves candidates for every query variant (original, step-back, HyDE
 * doc, each sub-question) in parallel and returns the combined pool.
 */
export async function retrieveMulti(
  translated: TranslatedQueries,
  moduleFilter?: string
): Promise<ScoredChunk[]> {
  const queryTexts = [
    translated.original,
    translated.stepBack,
    translated.hydeDoc,
    ...translated.subQuestions,
  ].filter(Boolean);

  const embeddings = await embedTexts(queryTexts);
  const resultSets = embeddings.map((emb) => searchIndex(emb, PER_QUERY_TOP_K, moduleFilter));

  return (await Promise.all(resultSets)).flat();
}

/**
 * Dedupes candidates from multiple query variants (keeping the best score
 * per chunk) and returns the top K, ranked.
 */
export function rerankAndDedupe(
  candidates: ScoredChunk[],
  finalK: number
): ScoredChunk[] {
  const bestById = new Map<string, ScoredChunk>();
  for (const c of candidates) {
    const existing = bestById.get(c.id);
    if (!existing || c.score > existing.score) {
      bestById.set(c.id, c);
    }
  }
  return Array.from(bestById.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, finalK);
}

/** Single-query retrieval, used by the corrective retry loop. */
export async function retrieveSingle(
  query: string,
  topK: number,
  moduleFilter?: string
): Promise<ScoredChunk[]> {
  const embedding = await embedText(query);
  return searchIndex(embedding, topK, moduleFilter);
}
