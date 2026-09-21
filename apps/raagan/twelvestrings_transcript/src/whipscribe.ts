const API_ROOT = "https://whipscribe.com/api/v1";

export type SpeechSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string | null;
};

export type Transcript = {
  text?: string;
  speech_detected?: boolean;
  segments: SpeechSegment[];
};

type JobStatus = { status: string; error?: string | null; locked?: boolean; speech_detected?: boolean };
type SubmitResult = { job_id: string; claim_token?: string };

async function jsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json() as { error?: string; code?: string };
      detail = body.error ?? body.code ?? detail;
    } catch { /* The HTTP status is still useful. */ }
    throw new Error(`WhipScribe HTTP ${response.status}: ${detail}`);
  }
  return await response.json() as T;
}

export function validateTranscript(value: unknown): Transcript {
  if (!value || typeof value !== "object") throw new Error("Transcript result is not an object.");
  const result = value as Record<string, unknown>;
  if (!Array.isArray(result.segments)) throw new Error("Transcript result has no segments array.");
  const segments = result.segments.map((segment, index) => {
    if (!segment || typeof segment !== "object") throw new Error(`Invalid speech segment ${index}.`);
    const item = segment as Record<string, unknown>;
    if (typeof item.start !== "number" || !Number.isFinite(item.start) || item.start < 0 ||
        typeof item.end !== "number" || !Number.isFinite(item.end) || item.end < item.start ||
        typeof item.text !== "string") {
      throw new Error(`Invalid speech segment ${index}.`);
    }
    return {
      start: item.start,
      end: item.end,
      text: item.text,
      speaker: typeof item.speaker === "string" ? item.speaker : null,
    };
  });
  return {
    text: typeof result.text === "string" ? result.text : undefined,
    speech_detected: typeof result.speech_detected === "boolean" ? result.speech_detected : undefined,
    segments,
  };
}

export async function transcribeFile(
  bytes: Buffer,
  filename: string,
  apiKey: string,
  timeoutSeconds = 600,
  transport: typeof fetch = fetch,
  sleep: (milliseconds: number) => Promise<void> = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
): Promise<{ jobId: string; transcript: Transcript }> {
  if (!apiKey) throw new Error("WHIPSCRIBE_API_KEY is required for API mode.");
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) throw new Error("Invalid timeout.");
  const deadline = Date.now() + timeoutSeconds * 1000;
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "audio/wav" }), filename);
  form.append("source", "api");
  const submitted = await jsonResponse<SubmitResult>(await transport(API_ROOT + "/transcribe", {
    method: "POST", headers: { "X-API-Key": apiKey }, body: form,
    signal: AbortSignal.timeout(timeoutSeconds * 1000),
  }));
  if (!submitted.job_id || typeof submitted.job_id !== "string") {
    throw new Error("WhipScribe submit response has no job_id.");
  }
  const jobId = submitted.job_id;
  const headers: Record<string, string> = { "X-API-Key": apiKey };
  if (submitted.claim_token) headers["X-Claim-Token"] = submitted.claim_token;

  let status: JobStatus;
  while (true) {
    if (Date.now() >= deadline) throw new Error(`Job ${jobId} is still running; timed out locally.`);
    status = await jsonResponse<JobStatus>(await transport(API_ROOT + "/jobs/" + jobId, {
      headers, signal: AbortSignal.timeout(Math.min(30_000, Math.max(1, deadline - Date.now()))),
    }));
    if (status.status === "done") break;
    if (status.status === "failed") throw new Error(`WhipScribe job failed: ${status.error ?? "unknown reason"}`);
    if (status.status !== "queued" && status.status !== "processing") {
      throw new Error(`Unexpected WhipScribe job status: ${status.status}`);
    }
    await sleep(Math.min(3000, Math.max(0, deadline - Date.now())));
  }
  if (status.locked) throw new Error("Transcript is locked; check your WhipScribe credits.");
  const result = validateTranscript(await jsonResponse<unknown>(await transport(
    API_ROOT + "/jobs/" + jobId + "/result?format=json",
    { headers, signal: AbortSignal.timeout(30_000) },
  )));
  if (result.speech_detected === undefined && typeof status.speech_detected === "boolean") {
    result.speech_detected = status.speech_detected;
  }
  return { jobId, transcript: result };
}
