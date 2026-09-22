import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";

test("CLI joins synthetic notes with a mock transcript without an API call", async () => {
  const directory = await mkdtemp(join(tmpdir(), "twelvestrings-cli-"));
  try {
    const sampleRate = 44100;
    const samples = sampleRate * 2;
    const wav = Buffer.alloc(44 + samples * 2);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(samples * 2, 40);
    for (let index = 0; index < samples; index++) {
      const value = index < sampleRate
        ? Math.round(12000 * Math.sin(2 * Math.PI * 110 * index / sampleRate)) : 0;
      wav.writeInt16LE(value, 44 + index * 2);
    }
    const audioPath = join(directory, "synthetic.wav");
    const transcriptPath = join(directory, "mock.json");
    const outputPath = join(directory, "session.local.json");
    await writeFile(audioPath, wav);
    await writeFile(transcriptPath, JSON.stringify({
      text: "Try that again.",
      segments: [{ start: 1.1, end: 1.8, text: "Try that again." }],
    }));
    const root = dirname(dirname(fileURLToPath(import.meta.url)));
    const command = spawnSync(process.execPath, [
      join(root, "src/cli.ts"), audioPath,
      "--guitar-start", "0", "--guitar-end", "1",
      "--transcript-json", transcriptPath, "--output", outputPath,
    ], { encoding: "utf8" });
    assert.equal(command.status, 0, command.stderr);
    assert.match(command.stderr, /Reading synthetic\.wav/);
    assert.match(command.stderr, /Local pitch analysis finished: 1 note events/);
    assert.match(command.stderr, /Loading existing transcript JSON; no API upload/);
    assert.match(command.stderr, /Saved 2 timeline events/);
    const output = JSON.parse(await readFile(outputPath, "utf8"));
    assert.deepEqual(output.timeline.map((event: { kind: string }) => event.kind), ["note", "speech"]);
    assert.equal(output.timeline[0].note, "A2");
    assert.equal(output.jobId, null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
