// Pure, browser-safe helper. Does NOT touch the filesystem, so it's safe
// to import from client components ("use client" files).
//
// Server-only filesystem loading lives in `lib/media-map.server.ts` —
// import that instead from route handlers / server components.
export function mediaKey(module: string, lesson: string): string {
  return `${module}::${lesson}`;
}
