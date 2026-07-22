# Expo.search — Advanced RAG Course Q&A Assistant

Ask questions about a React Native / Expo video course and get answers
cited to the exact lesson and timestamp they came from.

Expo.search ingests course subtitle files, embeds them into a vector
store, and answers user questions through a multi-stage retrieval-augmented
generation (RAG) pipeline — with query rewriting, multi-query retrieval,
reranking, grounded citation generation, and a self-correcting quality
loop — all streamed live to a chat UI.

**Live demo:** [expo-ai-ten.vercel.app](https://expo-ai-ten.vercel.app)

---

## Table of contents

- [Features](#features)
- [Landing page](#landing-page)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Data](#data)
- [Notes & limitations](#notes--limitations)

---

## Features

**Chat / UX**

- **Click-to-jump timestamps** — every source card is clickable and opens a
  floating lesson player seeked to that exact moment. No video/audio files
  ship in this repo (only subtitles) — fill in `data/media-map.json`
  (`"module::lesson": "https://.../video.mp4"`, or a YouTube/Vimeo URL) to
  enable playback; until then the player shows an honest "no source
  configured" state.
- **Streaming source cards** — sources appear right after retrieval, before
  the answer finishes generating (pulsing until the corrective loop settles
  on a final set).
- **Follow-up suggestions** — 2–3 related questions generated after each
  answer; click one to ask it immediately.
- **Conversation memory** — recent turns are fed into query rewriting, so
  "what about part 2?" resolves against what was actually discussed.
- **Copy / export** — per-message copy, plus a header button to export the
  whole conversation as a Markdown study-notes file.
- **Voice** — text-to-speech playback and mic input, with auto-submit after
  a pause in speech.

**Retrieval quality**

- **Feedback (👍/👎)** — stored per message in Postgres (`Message.feedback`)
  for future eval/reranking work.
- **Confidence badge** — the corrective loop's 0–10 grounding score is
  surfaced to the user ("High confidence" / "Moderate confidence" / "Check
  the source") instead of being used only internally.
- **Module filter** — scope a question to one course module via the header
  dropdown, which passes a Qdrant payload filter down through retrieval.

**Product / account**

- **Conversation search** — full-text search box in the sidebar
  (`GET /api/conversations?q=...`).
- **Shareable links** — turn a conversation into a public, read-only
  `/share/[token]` page.
- **Rate limiting** — a lightweight per-user limiter on `/api/chat` (see
  `lib/rate-limit.ts` for production-scaling notes — it's currently
  in-memory and single-instance).
- **Admin dashboard** (`/admin`) — lesson/chunk stats, a chunk-quality
  previewer that runs the chunker without spending embedding tokens, and a
  button to re-run `npm run ingest` with a live log stream.
- **Auth** — Clerk-gated sign-in/sign-up; `middleware.ts` protects `/chat`
  and `/api/chat`.

## Landing page

`components/landing/` holds the marketing site (`Nav`, `Hero`, `Features`,
`HowItWorks`, `ProductOverview`, `CTA`) — a dark, terminal-inspired design
that mirrors the product itself rather than a generic SaaS template:

- **Live pipeline demo in the hero** — a self-looping terminal panel types
  out real example questions and animates the actual RAG stage names
  (query rewrite → retrieval → generation) through pending → running →
  done, then reveals the answer and its cited source, before moving to the
  next example.
- **Animated chat demo** (`ProductOverview`) — a second, more detailed
  walkthrough simulating a full chat turn: typed question, "thinking"
  state, streamed answer with inline code, and source cards appearing in
  sequence.
- **Motion and gradient accents** — scroll-triggered reveals, hover glows,
  and gradient treatments (`accent` → `termAmber` → `cite`) built with
  Framer Motion and Tailwind, layered over an ambient dot-grid background.
- Fully responsive, with all animation driven by component state rather
  than video/GIF assets.

## Tech stack

| Layer              | Technology                                                 |
| ------------------ | ----------------------------------------------------------- |
| Framework          | Next.js 15 (App Router), React 18, TypeScript              |
| Styling            | Tailwind CSS, `class-variance-authority`, `tailwind-merge`  |
| Auth               | Clerk                                                       |
| Database           | Postgres (Neon serverless) via Prisma ORM                   |
| Vector store       | Qdrant                                                      |
| LLM / embeddings   | OpenAI API                                                  |
| Validation         | Zod                                                          |
| Motion / icons     | Framer Motion, Lucide React                                 |
| Markdown rendering | `react-markdown` + `remark-gfm`                              |

## Project structure

```
app/
  (app)/chat/          Chat UI (the main product surface)
  (app)/admin/          Admin dashboard (stats, chunk preview, re-ingest)
  api/
    chat/                Streaming RAG endpoint (SSE)
    conversations/       CRUD + search + share-link toggling
    messages/[id]/feedback/  Thumbs up/down capture
    modules/             Lists available course modules for the filter dropdown
    media-map/           Serves data/media-map.json to the client
    share/[token]/       Public read-only conversation view
    admin/               Stats, chunk-quality preview, re-ingest trigger
  share/[token]/         Public share page
  sign-in/, sign-up/      Clerk auth pages

components/
  chat/                 ChatInput, MessageBubble, SourceCard, LessonPlayer,
                          ConversationSidebar
  landing/              Marketing page sections (Hero, Features, HowItWorks, CTA, Nav)
  ui/                   Shared primitives (button, select)

lib/
  subtitle-parser.ts     Parses .srt/.vtt files
  chunker.ts              Splits transcripts into ~40s windows
  llm.ts                  OpenAI client wrapper (chat + embeddings)
  vector-store.ts         Qdrant read/write layer
  qdrant.ts                Qdrant client + collection setup
  query-translation.ts    Step-back, decompose, HyDE, conversational rewriting
  retrieval.ts             Multi-query retrieval, rerank + dedupe
  generate.ts               Cited answer generation, scoring, follow-up questions
  guardrails.ts             Input/output guardrail checks
  rag-pipeline.ts           Orchestrates the full pipeline, emits SSE events
  schemas.ts                 Zod schemas
  rate-limit.ts               Per-user request limiter
  admin.ts                     Admin-only auth check (ADMIN_USER_IDS)
  media-map.ts / media-map.server.ts   Lesson → video URL lookup
  db.ts                         Prisma client singleton

scripts/
  ingest.ts               One-time/one-shot ingestion script (CLI entry point)

prisma/
  schema.prisma            Conversation + Message models
  migrations/                 Migration history

data/
  subtitles/               Source .srt/.vtt files, organized by module/lesson
  media-map.json            Lesson → video/audio URL mapping (fill in manually)
```

## Getting started

### Prerequisites

- Node.js 18+
- A [Clerk](https://dashboard.clerk.com) application (publishable + secret key)
- An [OpenAI API key](https://platform.openai.com)
- A Postgres database (e.g. [Neon](https://neon.tech))
- A [Qdrant](https://qdrant.tech) instance (Qdrant Cloud free tier works)

### Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values described in
   [Environment variables](#environment-variables) below.
3. Apply database migrations:

   ```
   npx prisma migrate dev
   ```

4. Build the vector index (one-time, re-run whenever subtitles change):

   ```
   npm run ingest
   ```

   This reads every lesson under `data/subtitles/`, chunks the transcripts
   into ~40s windows, embeds them, and upserts them into your Qdrant
   collection. The repo already includes real course subtitles under
   `data/subtitles/` (17 modules of an Expo/React Native course), so you can
   ingest and query immediately without supplying your own transcripts.

5. Start the dev server:

   ```
   npm run dev
   ```

   Visit `http://localhost:3000`, sign up, and go to `/chat`.

### Optional: enable video playback

`data/media-map.json` is empty by default. To enable click-to-jump
timestamps, add entries mapping `"module::lesson"` to a hosted video/audio
URL (direct file, YouTube, or Vimeo). Without this, source cards still show
citations, but the lesson player displays a "no source configured" state
instead of playing anything.

### Optional: production-grade rate limiting

`/api/chat` is rate-limited per user (12 requests/minute by default) to
protect OpenAI spend. Locally this works out of the box via an in-memory
limiter — no setup needed. Before deploying to a serverless platform with
multiple instances, set up a shared limiter so the cap is enforced
globally instead of per-instance:

1. Create a free Redis database at [console.upstash.com](https://console.upstash.com).
2. Copy the REST URL and REST token from the database's "REST API" tab.
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in
   `.env.local` (or your hosting provider's environment settings).

`lib/rate-limit.ts` detects these automatically — no code changes needed.
To change the limit itself, edit `MAX_REQUESTS_PER_WINDOW` / `WINDOW` at
the top of that file.

### Optional: admin access

By default, any signed-in user can trigger re-ingestion from `/admin`. Set
`ADMIN_USER_IDS` (comma-separated Clerk user IDs) in `.env.local` before
deploying with real users to restrict this.

## Environment variables

| Variable                              | Description                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`    | Clerk publishable key                                                                                                                                 |
| `CLERK_SECRET_KEY`                     | Clerk secret key                                                                                                                                       |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`        | Defaults to `/sign-in`                                                                                                                                 |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`        | Defaults to `/sign-up`                                                                                                                                 |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`  | Defaults to `/chat`                                                                                                                                    |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`  | Defaults to `/chat`                                                                                                                                    |
| `OPENAI_API_KEY`                       | Used for embeddings and chat generation                                                                                                                |
| `DATABASE_URL`                         | Postgres connection string (Neon serverless recommended)                                                                                               |
| `QDRANT_URL`                           | Qdrant cluster URL                                                                                                                                      |
| `QDRANT_API_KEY`                       | Qdrant API key (optional for local/self-hosted Qdrant)                                                                                                 |
| `ADMIN_USER_IDS`                       | Comma-separated Clerk user IDs allowed to trigger re-ingestion from `/admin`. Leave unset to allow any signed-in user (fine for solo/dev use).         |
| `UPSTASH_REDIS_REST_URL`               | Optional. Upstash Redis REST URL, used for global `/api/chat` rate limiting. Falls back to an in-memory limiter if unset (fine for local dev only).    |
| `UPSTASH_REDIS_REST_TOKEN`             | Optional. Upstash Redis REST token, paired with the URL above.                                                                                         |

See `.env.example` for a ready-to-copy template.

## Scripts

| Command                    | Description                                                        |
| --------------------------- | -------------------------------------------------------------------- |
| `npm run dev`               | Start the Next.js dev server                                        |
| `npm run build`             | Production build                                                    |
| `npm run start`             | Start the production server                                         |
| `npm run lint`              | Run Next.js/ESLint checks                                           |
| `npm run ingest`            | Parse, chunk, embed, and upsert all course subtitles into Qdrant    |
| `npx prisma migrate dev`    | Apply/create database migrations                                    |

## Architecture

**Ingestion** (`scripts/ingest.ts`)

```
lib/subtitle-parser.ts → lib/chunker.ts → lib/llm.ts (embeddings) → lib/vector-store.ts (Qdrant)
```

**Query pipeline** (`lib/rag-pipeline.ts`, invoked from `app/api/chat/route.ts`)

1. **Input guardrails** (`lib/guardrails.ts`) — blocks empty/oversized input
   and off-topic or unsafe questions before anything else runs.
2. **Conversation contextualization** — recent chat turns are used to
   rewrite follow-up questions (e.g. "what about part 2?") into standalone
   queries.
3. **Query translation** (`lib/query-translation.ts`) — in parallel:
   step-back (broader question), decompose (sub-questions), HyDE
   (hypothetical answer embedded for search).
4. **Multi-query retrieval** (`lib/retrieval.ts`) — embeds every query
   variant, searches the Qdrant index, merges the candidate pool.
5. **Rerank + dedupe** (`lib/retrieval.ts`) — keeps the best-scoring chunk
   per id, returns the top 5.
6. **Generation with citations** (`lib/generate.ts`) — answers strictly from
   the retrieved excerpts, citing `[n]` inline; sources carry module,
   lesson, and timestamp.
7. **Output guardrails** (`lib/guardrails.ts`) — checks the response before
   it's shown (e.g. no leaked system-prompt text).
8. **Corrective loop** (`lib/rag-pipeline.ts`) — a scoring call rates the
   draft 0–10; below the threshold (6), it rewrites the query with
   extracted keywords and retries, up to 3 times, before streaming the
   final answer.
9. **Follow-up generation** — 2–3 related questions are generated from the
   final answer and sources.

`/api/chat` streams all of this as server-sent events (status updates,
tokens, sources, confidence, follow-ups), consumed live by
`app/(app)/chat/page.tsx`.

## Data

`data/subtitles/` contains real `.srt`/`.vtt` transcripts for a 17-module
Expo/React Native course (environment setup, components & styling,
navigation, Expo Router, API routes, local storage, sensors, camera/audio,
networking & haptics, EAS builds, maps, notifications, authentication,
publishing, and several mini-projects). `data/media-map.json` is the
(currently empty) lookup table that connects each lesson to a playable
video/audio URL for the in-app lesson player.

## Notes & limitations

- The vector store is backed by **Qdrant** (`lib/qdrant.ts`,
  `lib/vector-store.ts`) with cosine-similarity search over its built-in
  HNSW index — not a local JSON file. Point IDs are derived deterministically
  from chunk IDs (UUIDv5), so re-running `npm run ingest` is a safe,
  idempotent upsert rather than creating duplicates.
- `lib/rate-limit.ts` uses [Upstash Redis](https://upstash.com) for a true
  global, per-user sliding-window limit (12 requests/minute by default)
  shared across every serverless instance, when `UPSTASH_REDIS_REST_URL`
  and `UPSTASH_REDIS_REST_TOKEN` are set. If they're unset, it falls back
  to an in-memory limiter — fine for local dev, but per-process, so it
  won't coordinate limits across multiple instances in production.
- There is currently no automated test suite or CI configuration.
- Output guardrails currently check for leaked internal instructions but do
  not independently verify that generated answers are grounded in the
  retrieved sources.