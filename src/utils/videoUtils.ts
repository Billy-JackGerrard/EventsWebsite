export type VideoDisplayInfo =
  | { type: 'youtube'; embedUrl: string }
  | { type: 'vimeo';   embedUrl: string }
  | { type: 'file';    src: string };

/**
 * Parses a video URL and returns display info.
 * Embed URLs are constructed from extracted IDs only — the raw user URL is
 * never passed as an iframe src (guards against XSS/open-redirect).
 */
export function getVideoDisplayInfo(url: string): VideoDisplayInfo | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    // YouTube: youtube.com/watch?v=ID or youtu.be/ID or youtube.com/shorts/ID
    if (host === "youtube.com" || host === "youtu.be") {
      let id: string | null = null;
      if (host === "youtu.be") {
        id = parsed.pathname.slice(1).split("/")[0];
      } else if (parsed.pathname.startsWith("/shorts/")) {
        id = parsed.pathname.split("/")[2];
      } else {
        id = parsed.searchParams.get("v");
      }
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}` };
      }
    }

    // Vimeo: vimeo.com/ID
    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").find(s => /^\d+$/.test(s));
      if (id) {
        return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` };
      }
    }

    // Anything else (e.g. R2-hosted file) — treat as raw video
    return { type: 'file', src: url };
  } catch {
    return null;
  }
}
