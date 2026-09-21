import assert from "node:assert/strict";
import test from "node:test";
import { detectNoteEvents, detectPitch, FRAME_SIZE, hzToNote } from "../src/pitch.ts";

test("detects a synthetic monophonic guitar-range note", () => {
  const sampleRate = 44100;
  const frequency = 110; // A2
  const samples = new Float32Array(sampleRate);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = 0.4 * Math.sin(2 * Math.PI * frequency * index / sampleRate);
  }
  const pitch = detectPitch(samples.subarray(0, FRAME_SIZE), sampleRate);
  assert.ok(pitch !== null && Math.abs(pitch - frequency) < 3);
  assert.equal(hzToNote(pitch), "A2");
  const events = detectNoteEvents(samples, sampleRate, 0, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].note, "A2");
  assert.ok(events[0].start >= 0 && events[0].end <= 1);
});

test("does not invent notes in silence", () => {
  const events = detectNoteEvents(new Float32Array(44100), 44100, 0, 1);
  assert.deepEqual(events, []);
});

test("rejects a guitar window outside the audio", () => {
  assert.throws(() => detectNoteEvents(new Float32Array(44100), 44100, 1, 2));
});
