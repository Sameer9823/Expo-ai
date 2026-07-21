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
  if (exists) return;

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: EMBEDDING_DIM,
      distance: "Cosine",
    },
  });
}