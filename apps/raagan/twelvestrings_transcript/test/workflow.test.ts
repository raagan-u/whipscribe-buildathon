import assert from "node:assert/strict";
import test from "node:test";
import { mergeTimeline } from "../src/timeline.ts";
import { transcribeFile, validateTranscript } from "../src/whipscribe.ts";

test("uploads one WAV, polls, and fetches timestamped JSON", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [
    Response.json({ job_id: "own-job", status: "queued", claim_token: "claim" }, { status: 202 }),
    Response.json({ status: "processing" }),
    Response.json({ status: "done", speech_detected: true }),
    Response.json({ text: "Try C.", segments: [{ start: 1, end: 2, text: "Try C.", speaker: "SPEAKER_00" }] }),
  ];
  const transport = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return responses.shift() as Response;
  }) as typeof fetch;
  const result = await transcribeFile(
    Buffer.from("test"), "own.wav", "test-key", 10, transport, async () => {},
  );
  assert.equal(result.jobId, "own-job");
  assert.equal(result.transcript.segments[0].start, 1);
  assert.equal(result.transcript.speech_detected, true);
  assert.equal(calls.length, 4);
  assert.equal(calls[0].url, "https://whipscribe.com/api/v1/transcribe");
  assert.equal(calls[0].init?.method, "POST");
  assert.equal((calls[0].init?.body as FormData).get("source"), "api");
  assert.equal((calls[1].init?.headers as Record<string, string>)["X-Claim-Token"], "claim");
  assert.equal(calls[3].url, "https://whipscribe.com/api/v1/jobs/own-job/result?format=json");
});

test("accepts documented no-speech results without inventing segments", () => {
  const transcript = validateTranscript({ speech_detected: false, text: "", segments: [] });
  assert.equal(transcript.speech_detected, false);
  assert.deepEqual(mergeTimeline(transcript, []), []);
});

test("merges speech and notes in file-relative order", () => {
  const transcript = validateTranscript({ segments: [{ start: 2, end: 3, text: "Try it again." }] });
  const merged = mergeTimeline(transcript, [{ kind: "note", start: 1, end: 1.5, note: "C4", frequencyHz: 261.63 }]);
  assert.deepEqual(merged.map(event => event.kind), ["note", "speech"]);
  assert.equal(merged[1].start, 2);
});

test("rejects malformed transcript timestamps", () => {
  assert.throws(() => validateTranscript({ segments: [{ start: "2", end: 3, text: "hello" }] }));
});
