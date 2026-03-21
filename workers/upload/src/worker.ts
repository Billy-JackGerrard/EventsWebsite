import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Env {
  UPLOAD_SECRET: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
}

const BUCKET_NAME = "bslcalendar";
const R2_ENDPOINT = "https://e0f14fe0b999dc0450a1ef06982eeae2.r2.cloudflarestorage.com";
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const PRESIGN_TTL_SECONDS = 300; // 5 minutes
const R2_PUBLIC_BASE_URL = "https://media.bslcalendar.com";

const ALLOWED_ORIGINS = [
  "https://bslcalendar.com",
  "https://www.bslcalendar.com",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/presign") {
      // Authenticate
      const auth = request.headers.get("Authorization") ?? "";
      if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
        return json({ error: "Unauthorized" }, 401, origin);
      }

      // Parse body
      let body: { filename?: unknown; contentType?: unknown; sizeBytes?: unknown };
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400, origin);
      }

      const { filename, contentType, sizeBytes } = body;

      if (typeof filename !== "string" || !filename.trim()) {
        return json({ error: "filename is required" }, 400, origin);
      }
      if (typeof contentType !== "string" || !contentType.startsWith("video/")) {
        return json({ error: "Only video/* content types are allowed" }, 400, origin);
      }
      if (typeof sizeBytes !== "number" || sizeBytes > MAX_BYTES) {
        return json({ error: `File must be under ${MAX_BYTES / 1024 / 1024} MB` }, 413, origin);
      }

      // Build a unique, safe object key
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      const key = `events/${crypto.randomUUID()}-${safeFilename}`;

      // Generate presigned PUT URL via R2's S3-compatible API
      const s3 = new S3Client({
        region: "auto",
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        ContentLength: sizeBytes,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_TTL_SECONDS });
      const publicUrl = `${R2_PUBLIC_BASE_URL}/${key}`;

      return json({ uploadUrl, publicUrl }, 200, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
