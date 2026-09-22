import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { detectNoteEvents } from "./pitch.ts";
import { parsePcm16Wav } from "./wav.ts";
import { transcribeFile } from "./whipscribe.ts";

const MAX_WAV_BYTES = 128 * 1024 * 1024;
const UI_DIR = join(dirname(fileURLToPath(import.meta.url)), "../ui");
const ASSETS: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
  "/style.css": { file: "style.css", type: "text/css; charset=utf-8" },
};

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

async function readWav(request: IncomingMessage): Promise<Buffer> {
  if (request.headers["content-type"]?.split(";")[0] !== "audio/wav") {
    throw new Error("Choose an uncompressed PCM16 WAV file.");
  }
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_WAV_BYTES) throw new Error("WAV exceeds the 128 MiB local preview limit.");
    chunks.push(chunk);
  }
  if (length === 0) throw new Error("The WAV file is empty.");
  return Buffer.concat(chunks, length);
}

export function createViewerServer(apiKey: string | undefined = process.env.WHIPSCRIBE_API_KEY) {
  return createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Security-Policy", "default-src 'self'; media-src 'self' blob:; connect-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:");
    const url = new URL(request.url ?? "/", "http://localhost");
    try {
      if (request.method === "GET" && url.pathname === "/api/config") {
        sendJson(response, 200, { speechConfigured: Boolean(apiKey) });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/notes") {
        const bytes = await readWav(request);
        const { samples, sampleRate } = parsePcm16Wav(bytes);
        const duration = samples.length / sampleRate;
        const hasStart = url.searchParams.has("start");
        const hasEnd = url.searchParams.has("end");
        const start = hasStart ? Number(url.searchParams.get("start")) : 0;
        const end = hasEnd ? Number(url.searchParams.get("end")) : duration;
        if (hasStart !== hasEnd || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 ||
            end > duration || end <= start) {
          sendJson(response, 400, { error: `Choose both interval times within the ${duration.toFixed(2)}s recording, or omit the interval.` });
          return;
        }
        const notes = detectNoteEvents(samples, sampleRate, start, end);
        sendJson(response, 200, { notes, duration, sampleRate });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/transcript") {
        if (!apiKey) {
          sendJson(response, 503, { code: "SPEECH_NOT_CONFIGURED", error: "Speech transcription is unavailable; start the viewer with your API key in the shell." });
          return;
        }
        const bytes = await readWav(request);
        const transcript = await transcribeFile(bytes, basename(request.headers["x-audio-filename"]?.toString() || "lesson.wav"), apiKey);
        sendJson(response, 200, { jobId: transcript.jobId, segments: transcript.transcript.segments, speechDetected: transcript.transcript.speech_detected ?? transcript.transcript.segments.length > 0 });
        return;
      }
      if (request.method === "GET" && url.pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
      }
      const asset = request.method === "GET" ? ASSETS[url.pathname] : undefined;
      if (!asset) {
        sendJson(response, 404, { error: "Not found." });
        return;
      }
      response.writeHead(200, { "Content-Type": asset.type, "Cache-Control": "no-store" });
      response.end(await readFile(join(UI_DIR, asset.file)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      const status = url.pathname === "/api/transcript" ? 502 : 400;
      sendJson(response, status, { error: message });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT ?? 8765);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");
  createViewerServer().listen(port, "127.0.0.1", () => {
    console.log(`TwelveStrings viewer: http://127.0.0.1:${port}`);
    console.log(process.env.WHIPSCRIBE_API_KEY ? "Speech transcription configured." : "Speech transcription unavailable; notes will still work.");
  });
}
