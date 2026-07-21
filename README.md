# Expo.search — Advanced RAG Patterns project

Ask questions about your course and get answers cited to the exact lesson
and timestamp they came from.

## New in this version

**Chat / UX**
- **Click-to-jump timestamps** — every source card is clickable and opens a floating lesson player seeked to that exact moment. Since no video/audio files ship in this repo (only subtitles), fill in `data/media-map.json` (`"module::lesson": "https://.../video.mp4"`, or a YouTube/Vimeo URL) to enable it — until then the player shows an honest "no source configured" state instead of pretending to play something.
- **Streaming source cards** — sources now appear right after retrieval, before the answer finishes generating (pulsing until the corrective loop settles on a final set).
- **Follow-up suggestions** — 2-3 related questions generated after each answer; click one to ask it immediately.
- **Conversation memory** — recent turns are fed into query rewriting, so "what about part 2?" resolves against what was actually discussed.
- **Copy / export** — per-message copy (existing) plus a header button to export the whole conversation as a Markdown study-notes file.

**Retrieval quality**
- **Feedback (👍/👎)** — stored per message in Postgres (`Message.feedback`) for future eval/reranking work.
- **Confidence badge** — the corrective-loop's 0-10 grounding score is now surfaced to the user ("High confidence" / "Moderate confidence" / "Check the source") instead of being used only internally.
- **Module filter** — scope a question to one course module via the header dropdown, which passes a Qdrant payload filter down through retrieval.

**Product/account**
- **Conversation search** — full-text search box in the sidebar (`GET /api/conversations?q=...`).
- **Shareable links** — turn a conversation into a public, read-only `/share/[token]` page.
- **Rate limiting** — a lightweight per-user limiter on `/api/chat` (see `lib/rate-limit.ts` for its production-scaling notes).
- **Admin dashboard** (`/admin`) — lesson/chunk stats, a chunk-quality previewer that runs the chunker without spending embedding tokens, and a button to re-run `npm run ingest` with a live log stream.

**Voice**
- Text-to-speech playback (existing) and mic input (existing) are unchanged in spirit; the mic now **auto-submits after a pause** in speech instead of requiring a manual stop click.

After pulling these changes, run:
```
npx prisma migrate dev   # applies the new feedback/confidence/sharing columns
```

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - Clerk publishable + secret keys from https://dashboard.clerk.com
   - `OPENAI_API_KEY` from https://platform.openai.com
3. Build the vector index (one-time, re-run whenever subtitles change):
   ```
   npm run ingest
   ```
   This reads every lesson under `data/subtitles/`, chunks the transcripts
   into ~40s windows, embeds them, and writes `data/vector-index.json`.
   Your course's actual SRT/VTT files are already included under
   `data/subtitles/`.
4. `npm run dev` — visit http://localhost:3000, sign up, and go to `/chat`.

## Architecture

**Ingestion** (`scripts/ingest.ts`)
`lib/subtitle-parser.ts` → `lib/chunker.ts` → `lib/llm.ts` (embeddings) →
`lib/vector-store.ts` (`data/vector-index.json`)

**Query pipeline** (`lib/rag-pipeline.ts`, called from `app/api/chat/route.ts`)
1. **Input guardrails** (`lib/guardrails.ts`) — blocks empty/oversized input
   and off-topic or unsafe questions before anything else runs.
2. **Query translation** (`lib/query-translation.ts`) — in parallel:
   step-back (broader question), decompose (sub-questions), HyDE
   (hypothetical answer embedded for search).
3. **Multi-query retrieval** (`lib/retrieval.ts`) — embeds every query
   variant, searches the vector index, merges the candidate pool.
4. **Rerank + dedupe** (`lib/retrieval.ts`) — keeps the best-scoring chunk
   per id, returns the top 5.
5. **Generation with citations** (`lib/generate.ts`) — answers strictly from
   the retrieved excerpts, citing `[n]` inline; sources carry module,
   lesson, and timestamp.
6. **Output guardrails** (`lib/guardrails.ts`) — checks the response before
   it's shown.
7. **Corrective loop** (`lib/rag-pipeline.ts`) — a scoring call rates the
   draft 0-10; below 6 it rewrites the query with extracted keywords and
   retries, up to 3 times, before streaming the final answer.

The `/api/chat` route streams all of this as server-sent events (status
updates, tokens, then sources), consumed live by `app/(app)/chat/page.tsx`.

## Notes

- Vector store is a local JSON file with brute-force cosine similarity —
  plenty fast for ~87 lessons, and needs no external infra. Swap
  `lib/vector-store.ts` for a hosted vector DB later if the corpus grows.
- Auth is Clerk; `middleware.ts` protects `/chat` and `/api/chat`.
