import assert from "node:assert/strict";
import test from "node:test";
import { visibleNotes } from "../ui/speech-mask.js";

const notes = [
  { start: 5, end: 5.5, note: "A2" },
  { start: 30, end: 32, note: "G3" },
];

test("broad speech timestamps cannot erase a later guitar passage", () => {
  const result = visibleNotes(notes, [{ start: 0, end: 50, text: "Lesson commentary" }]);
  assert.deepEqual(result.shownNotes, notes);
  assert.equal(result.coarseCount, 1);
  assert.equal(result.hiddenCount, 0);
});

test("short speech timestamps still hide overlapping note estimates", () => {
  const result = visibleNotes(notes, [{ start: 4, end: 6, text: "Try again" }]);
  assert.deepEqual(result.shownNotes, [notes[1]]);
  assert.equal(result.hiddenCount, 1);
});

test("a chosen guitar interval takes priority over speech timestamps", () => {
  const result = visibleNotes(notes, [{ start: 29, end: 33, text: "Bad timestamp" }], true);
  assert.deepEqual(result.shownNotes, notes);
  assert.equal(result.hiddenCount, 0);
});
