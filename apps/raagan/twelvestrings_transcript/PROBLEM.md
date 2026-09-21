# TwelveStrings Transcript — Track 4 problem statement

## The person

A guitar student who records a weekly one-to-one lesson and practices the
single-note passages their teacher asks them to repeat.

## Their day

They record the lesson, then scrub through it to find what the teacher said
and which note they played when the teacher stopped them. The useful speech
and playing live in the same audio file, but reviewing their relationship is
manual.

## The cost

- Spoken feedback gets buried in a long recording, so the student has to
  replay and scrub to find the correction.
- Even after finding the comment, they must replay the surrounding audio to
  work out which note prompted it.

The time spent and whether this is a real pain still need validation with a
student or teacher; no user interview has been done yet.

## What TwelveStrings Transcript does

One recording of the session, processed in two ways:

1. The file goes to WhipScribe for timestamped speech transcription.
2. The same file goes through a local monophonic pitch detector, producing
   timestamped note estimates where the instrument is clear enough.

TwelveStrings Transcript aligns both timelines locally. The student can find
a spoken correction, jump to that moment, and inspect the nearby estimated
notes while listening to the original audio. Pitch estimates under speech,
chords, or noisy mixes may be unreliable and should be shown as uncertain,
not as facts.

## Why this is also a pitch to the WhipScribe team

WhipScribe already runs a speech-detection pre-flight before transcription.
Music-only audio can complete with `speech_detected: false` and an empty
transcript. The prototype keeps its pitch analysis local, including for that
case. If useful to musicians, a future WhipScribe music-analysis branch could
return a separate pitch timeline alongside, not inside, the speech transcript.
That is a product proposal, not a current API capability.

## Scope for this prototype

One file and one monophonic line; no chord recognition, score comparison,
tempo/rushing detection, or claims about whether a note was "wrong." Both
pipelines use offsets into the same file; alignment still needs a real test.
