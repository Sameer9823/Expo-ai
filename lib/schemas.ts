import { z } from "zod";

// ---- API boundary: /api/chat request body ----
export const ChatRequestSchema = z.object({
  query: z.string().trim().min(1, "Query cannot be empty").max(2000),
  conversationId: z.string().min(1, "conversationId is required"),
  // Optional: scope retrieval to a single course module (e.g. "module 8").
  moduleFilter: z.string().trim().max(100).optional(),
});

// ---- Feedback (thumbs up/down) ----
export const FeedbackRequestSchema = z.object({
  messageId: z.string().min(1),
  feedback: z.union([z.literal(1), z.literal(-1), z.null()]),
});

// ---- Follow-up question suggestions ----
export const FollowupsSchema = z.object({
  followups: z.array(z.string()).max(3),
});

// ---- LLM structured outputs (chatJSON call sites) ----
export const GuardrailCheckSchema = z.object({
  allowed: z.boolean(),
  reason: z.string(),
});

export const ScoreAnswerSchema = z.object({
  score: z.number().min(0).max(10),
  keywords: z.array(z.string()),
});

export const DecomposeSchema = z.object({
  subQuestions: z.array(z.string()).min(1),
});

// ---- Conversation / message persistence ----
export const CreateConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export const SourceItemSchema = z.object({
  module: z.string(),
  lesson: z.string(),
  timestamp: z.string(),
  startTime: z.number().optional(), // seconds, used to seek the lesson player
  text: z.string().optional(), // transcript chunk, shown when the time badge is expanded
});

export const SaveMessageSchema = z.object({
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  sources: z.array(SourceItemSchema).optional(),
  followups: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  blocked: z.boolean().optional(),
});

// ---- Vector store (Qdrant) ----
export const EMBEDDING_DIM = 1536; // text-embedding-3-small

export const EmbeddingSchema = z
  .array(z.number())
  .length(EMBEDDING_DIM, `Embedding must have ${EMBEDDING_DIM} dimensions (text-embedding-3-small)`);

export const ChunkSchema = z.object({
  id: z.string(),
  text: z.string(),
  module: z.string(),
  lesson: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  timestamp: z.string(),
});

export const VectorRecordSchema = ChunkSchema.extend({
  embedding: EmbeddingSchema,
});