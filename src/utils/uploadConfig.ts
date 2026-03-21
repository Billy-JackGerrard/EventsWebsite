/**
 * Configuration for the R2 video upload Worker.
 *
 * SETUP REQUIRED:
 * 1. Deploy the Worker in workers/upload/ via `wrangler deploy`.
 * 2. Replace UPLOAD_WORKER_URL with your deployed Worker URL.
 * 3. Replace UPLOAD_SECRET with the secret you set via `wrangler secret put UPLOAD_SECRET`.
 *
 * These are hardcoded (like the Supabase URL/key) because Cloudflare Pages
 * does not reliably expose environment variables to the SPA at build time.
 */

export const UPLOAD_WORKER_URL = "https://bsl-upload.bg2018.workers.dev";
export const UPLOAD_SECRET = "783773e15d3427c31883dd15f7294ca98ff52cbef8f67af5df8418267044172f";

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_VIDEO_LABEL = "100 MB";
