import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { detectNoteEvents } from "./pitch.ts";
import { mergeTimeline } from "./timeline.ts";
import { parsePcm16Wav } from "./wav.ts";
import { transcribeFile, validateTranscript, type Transcript } from "./whipscribe.ts";

type Options = {
  audio: string;
  guitarStart: number;
  guitarEnd: number;
  transcriptJson?: string;
  output: string;
  timeout: number;
};

const USAGE = `Usage: node src/cli.ts <your-recording.wav> --guitar-start <seconds> --guitar-end <seconds>
       [--transcript-json <existing-result.json>] [--output <session.local.json>]
       [--timeout <seconds>]

Only submit recordings you own and have consent to process.
Set WHIPSCRIBE_API_KEY in the environment for API mode; never pass it as an argument.`;

function parseArgs(args: string[]): Options {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }
  const audio = args.shift();
  if (!audio || audio.startsWith("--")) throw new Error(USAGE);
  const values: Record<string, string> = {};
  const allowed = new Set(["--guitar-start", "--guitar-end", "--transcript-json", "--output", "--timeout"]);
  while (args.length) {
    const name = args.shift() as string;
    const value = args.shift();
    if (!allowed.has(name) || !value || value.startsWith("--") || name in values) {
      throw new Error(`Invalid argument ${name}.\n${USAGE}`);
    }
    values[name] = value;
  }
  const guitarStart = Number(values["--guitar-start"]);
  const guitarEnd = Number(values["--guitar-end"]);
  const timeout = values["--timeout"] === undefined ? 600 : Number(values["--timeout"]);
  if (!Number.isFinite(guitarStart) || !Number.isFinite(guitarEnd) ||
      !Number.isFinite(timeout) || timeout <= 0 ||
      values["--guitar-start"] === undefined || values["--guitar-end"] === undefined) {
    throw new Error(USAGE);
  }
  return {
    audio, guitarStart, guitarEnd,
    transcriptJson: values["--transcript-json"],
    output: values["--output"] ?? "session.local.json",
    timeout,
  };
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const audioBytes = await readFile(options.audio);
  const { samples, sampleRate } = parsePcm16Wav(audioBytes);
  const notes = detectNoteEvents(samples, sampleRate, options.guitarStart, options.guitarEnd);
  let transcript: Transcript;
  let jobId: string | null = null;
  if (options.transcriptJson) {
    transcript = validateTranscript(JSON.parse(await readFile(options.transcriptJson, "utf8")));
  } else {
    const apiKey = process.env.WHIPSCRIBE_API_KEY;
    if (!apiKey) throw new Error("Set WHIPSCRIBE_API_KEY or use --transcript-json.");
    ({ jobId, transcript } = await transcribeFile(audioBytes, basename(options.audio), apiKey, options.timeout));
  }
  const timeline = mergeTimeline(transcript, notes);
  const output = {
    audio: resolve(options.audio),
    jobId,
    speechDetected: transcript.speech_detected ?? transcript.segments.length > 0,
    guitarWindow: { start: options.guitarStart, end: options.guitarEnd },
    warning: "Pitch results are estimates; listen to verify. Chords and overlapping speech are unsupported.",
    timeline,
  };
  await writeFile(options.output, JSON.stringify(output, null, 2) + "\n", { flag: "wx" });
  console.log(`Wrote ${options.output}: ${transcript.segments.length} speech segments, ${notes.length} note events.`);
  for (const item of timeline) {
    const timestamp = item.start.toFixed(2).padStart(7);
    console.log(item.kind === "speech"
      ? `${timestamp}s  speech  ${item.text}`
      : `${timestamp}s  note    ${item.note} (estimated)`);
  }
}

run().catch(error => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
