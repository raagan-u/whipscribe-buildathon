import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readPcm16Wav } from "../src/wav.ts";

test("reads a PCM16 WAV into mono samples", async () => {
  const directory = await mkdtemp(join(tmpdir(), "twelvestrings-wav-"));
  const path = join(directory, "own-test.wav");
  try {
    const data = Buffer.alloc(44 + 8);
    data.write("RIFF", 0);
    data.writeUInt32LE(data.length - 8, 4);
    data.write("WAVEfmt ", 8);
    data.writeUInt32LE(16, 16);
    data.writeUInt16LE(1, 20);
    data.writeUInt16LE(2, 22);
    data.writeUInt32LE(44100, 24);
    data.writeUInt32LE(44100 * 4, 28);
    data.writeUInt16LE(4, 32);
    data.writeUInt16LE(16, 34);
    data.write("data", 36);
    data.writeUInt32LE(8, 40);
    data.writeInt16LE(16384, 44);
    data.writeInt16LE(16384, 46);
    data.writeInt16LE(-16384, 48);
    data.writeInt16LE(-16384, 50);
    await writeFile(path, data);
    const audio = await readPcm16Wav(path);
    assert.equal(audio.sampleRate, 44100);
    assert.deepEqual(Array.from(audio.samples), [0.5, -0.5]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
