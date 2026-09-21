# TwelveStrings Transcript (Track 4)

One practice recording goes through two independent pipelines: WhipScribe
transcribes speech, while local code estimates the notes of a monophonic
instrument line. The CLI aligns both timestamped results against the same
audio file into a combined local JSON timeline.

The merged timeline and any musical questions are handled locally. We do not
assume WhipScribe stores pitch data or answers questions about it.

## The problem

A guitar student records a weekly lesson, then scrubs through it to find a
teacher's correction and the notes they played around it. Speech and guitar
are already in the recording; the missing step is a shared, timestamped view
of both. The cost is replaying and searching manually, and sometimes losing
the correction altogether. How much time this costs needs validation with a
student or teacher; no user interview has happened yet. The initial scope is
one monophonic phrase with speech before or after it, not over it.

See [PROBLEM.md](PROBLEM.md) for the longer problem statement and
[WORKFLOW.md](WORKFLOW.md) for the planned user flow.

## Status

Initial TypeScript CLI and synthetic-audio tests are in place. In a manual
smoke test with my own `speech_and_strum.wav`, the CLI returned 3 speech
segments and 12 estimated note events from one recording. The local recording
and transcript output are not committed. Pitch accuracy is not validated:
brief high/low outliers and repeated note switches appeared in that run.
No independent user test yet.

## Install and run

Requires Node.js 22.18+ and your own uncompressed 16-bit PCM WAV recording.
The CLI has no package dependencies. Keep speech and monophonic guitar in
separate intervals, then select a guitar-only interval in seconds.

```sh
cd apps/raagan/twelvestrings_transcript
npm test
export WHIPSCRIBE_API_KEY='your-key-in-your-shell-only'
node src/cli.ts /path/to/your-recording.wav \
  --guitar-start 25 --guitar-end 35 --output session.local.json
```

The CLI uploads the WAV through `POST /api/v1/transcribe`, polls the job, and
fetches `result?format=json`. It runs pitch detection over the chosen window
of the **same file** and writes sorted `speech` and `note` events. To inspect
an existing JSON result from your own recording without another upload, add
`--transcript-json /path/to/result.json`. The output name `*.local.json` is
gitignored because it contains transcript content; the CLI refuses to
overwrite an existing file. Keep API keys in the environment, never in a
tracked file or command argument.

## Not done yet

Recording UI, validation of pitch accuracy and timing, playback/review UI,
user test, two-minute demo, and vision. The
CLI accepts PCM16 WAV only; its pitch output is an estimate, not verified
performance or chord recognition. It does not integrate into the separate
TwelveStrings project yet. The one-year vision will be written after a real
recording and user test, as the challenge suggests.
