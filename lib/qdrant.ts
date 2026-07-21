import { QdrantClient } from "@qdrant/js-client-rest";

const globalForQdrant = globalThis as unknown as { qdrant?: QdrantClient };

export const qdrant =
  globalForQdrant.qdrant ??
  new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForQdrant.qdrant = qdrant;
}

export const COLLECTION_NAME = "course_chunks";
export const EMBEDDING_DIM = 1536; // text-embedding-3-small

/** Creates the collection if it doesn't already exist. Safe to call repeatedly. */
export async function ensureCollection(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_DIM,
        distance: "Cosine",
      },
    });
  }

  // Qdrant Cloud runs filtering in strict mode by default: searching with a
  // `filter` on a payload field that has no index throws 400 Bad Request.
  // The module-filter dropdown filters on this field, so it must be indexed.
  // createPayloadIndex is idempotent (no-op if the index already exists),
  // so it's safe to call this on every request, patching pre-existing
  // collections that were created before this index existed.
  await qdrant.createPayloadIndex(COLLECTION_NAME, {
    field_name: "module",
    field_schema: "keyword",
  });
}