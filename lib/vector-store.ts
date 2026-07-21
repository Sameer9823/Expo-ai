import { v5 as uuidv5 } from "uuid";
import { qdrant, ensureCollection, COLLECTION_NAME } from "./qdrant";
import { VectorRecordSchema } from "./schemas";

export type Chunk = {
  id: string;
  text: string;
  module: string;
  lesson: string;
  startTime: number;
  endTime: number;
  timestamp: string;
};

export type VectorRecord = Chunk & { embedding: number[] };
export type ScoredChunk = Chunk & { score: number };

// Fixed namespace so the same chunk id always maps to the same Qdrant point
// id across ingest runs, making re-ingestion an idempotent upsert rather
// than a pile of duplicate points.
const CHUNK_ID_NAMESPACE = "b6f9e1c2-6f8a-4c1e-9c3b-7a2d5f1e9a10";

function chunkIdToPointId(chunkId: string): string {
  return uuidv5(chunkId, CHUNK_ID_NAMESPACE);
}

/** Deletes and recreates the collection. Called at the start of a fresh ingest run. */
export async function clearIndex(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);
  if (exists) {
    await qdrant.deleteCollection(COLLECTION_NAME);
  }
  await ensureCollection();
}

const UPSERT_BATCH = 200;

/**
 * Upserts chunk records with their embeddings into Qdrant. Each record is
 * validated against VectorRecordSchema before writing, so a malformed
 * embedding (wrong length, non-numeric) fails loudly at ingest time instead
 * of silently corrupting the index.
 */
export async function insertChunks(records: VectorRecord[]): Promise<void> {
  await ensureCollection();

  for (let i = 0; i < records.length; i += UPSERT_BATCH) {
    const batch = records.slice(i, i + UPSERT_BATCH);

    const validated = batch.map((r) => {
      const parsed = VectorRecordSchema.safeParse(r);
      if (!parsed.success) {
        throw new Error(`Invalid chunk record "${r.id}": ${parsed.error.message}`);
      }
      return parsed.data;
    });

    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: validated.map((r) => ({
        id: chunkIdToPointId(r.id),
        vector: r.embedding,
        payload: {
          chunkId: r.id,
          text: r.text,
          module: r.module,
          lesson: r.lesson,
          startTime: r.startTime,
          endTime: r.endTime,
          timestamp: r.timestamp,
        },
      })),
    });
  }
}

/**
 * Finds the topK most similar chunks to queryEmbedding using Qdrant's
 * cosine-similarity search over the HNSW index it builds automatically.
 */
export async function searchIndex(
  queryEmbedding: number[],
  topK: number,
  moduleFilter?: string
): Promise<ScoredChunk[]> {
  const results = await qdrant.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    limit: topK,
    with_payload: true,
    filter: moduleFilter
      ? { must: [{ key: "module", match: { value: moduleFilter } }] }
      : undefined,
  });

  return results.map((r) => {
    const payload = r.payload as Chunk & { chunkId: string };
    return {
      id: payload.chunkId,
      text: payload.text,
      module: payload.module,
      lesson: payload.lesson,
      startTime: payload.startTime,
      endTime: payload.endTime,
      timestamp: payload.timestamp,
      score: r.score, // Qdrant cosine search score is already a similarity (higher = better), no conversion needed
    };
  });
}