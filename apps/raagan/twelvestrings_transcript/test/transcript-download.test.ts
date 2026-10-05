import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMergedTranscript, mergedTranscriptFilename } from '../ui/transcript-download.js';

test('writes speech and notes in timestamp order', () => {
  const transcript = buildMergedTranscript('Weekly lesson.wav', [
    { kind: 'speech', start: 3, end: 4.5, speaker: 'Teacher', text: '  Try that again.  ' },
    { kind: 'note', start: 1, end: 1.4, note: 'C4', frequencyHz: 261.63 },
  ]);

  assert.match(transcript, /Source: Weekly lesson\.wav/);
  assert.match(transcript, /Timeline: 1 speech · 1 note/);
  assert.ok(transcript.indexOf('Played note: C4') < transcript.indexOf('Teacher: Try that again.'));
  assert.match(transcript, /\[00:01\.0–00:01\.4\] Played note: C4 \(261\.6 Hz · estimated\)/);
  assert.match(transcript, /\[00:03\.0–00:04\.5\] Teacher: Try that again\./);
});

test('creates a safe, descriptive download filename', () => {
  assert.equal(mergedTranscriptFilename('My lesson (take 2).WAV'), 'My-lesson-take-2-merged-transcript.txt');
  assert.equal(mergedTranscriptFilename('.wav'), 'lesson-merged-transcript.txt');
});
