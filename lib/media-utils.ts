export type MediaKind = "youtube" | "vimeo" | "file";

export function detectMediaKind(url: string): MediaKind {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/vimeo\.com/.test(url)) return "vimeo";
  return "file";
}

function extractYouTubeId(url: string): string | null {
  const patterns = [/[?&]v=([^&]+)/, /youtu\.be\/([^?&]+)/, /embed\/([^?&]+)/];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

/**
 * Builds a URL (for an <iframe>) or returns the original file URL (for a
 * native <video>/<audio> element) seeked to `startTime` seconds.
 * Returns null if the URL can't be resolved into a playable embed.
 */
export function buildSeekUrl(url: string, startTime: number): { kind: MediaKind; src: string } | null {
  const kind = detectMediaKind(url);
  const t = Math.max(0, Math.floor(startTime));

  if (kind === "youtube") {
    const id = extractYouTubeId(url);
    if (!id) return null;
    return { kind, src: `https://www.youtube.com/embed/${id}?start=${t}&autoplay=1` };
  }

  if (kind === "vimeo") {
    const id = extractVimeoId(url);
    if (!id) return null;
    return { kind, src: `https://player.vimeo.com/video/${id}#t=${t}s` };
  }

  return { kind: "file", src: url };
}

export function isAudioFile(url: string): boolean {
  return /\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(url);
}
