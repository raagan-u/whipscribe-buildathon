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

TypeScript CLI, a local browser viewer, and synthetic-audio tests are in place. In a manual
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
`--transcript-json /path/to/result.json`. To produce a local notes timeline
while transcription is unavailable, use `--notes-only` instead. The output name `*.local.json` is
gitignored because it contains transcript content; the CLI refuses to
overwrite an existing file. Keep API keys in the environment, never in a
tracked file or command argument.

Progress messages go to stderr: audio loading, local pitch analysis, API
upload and job status (including the API's best-effort progress when present),
transcript fetch, and output save. The key, claim token, and transcript text
are not included in those progress messages. The CLI still prints the
timestamped result to stdout after saving the JSON.

## Local lesson viewer

The dependency-free page in `ui/` takes one PCM16 WAV file. A small local Node
server runs the existing YIN detector over the full WAV by default and, when
`WHIPSCRIBE_API_KEY` is set in the shell, submits the same WAV for speech
transcription. A guitar-only interval can be set when desired. Notes appear as
soon as local analysis finishes; speech is added to the same timeline when ready.
Once speech arrives, entire note events that overlap short speech segments are hidden.
Segments longer than ten seconds are too coarse for this masking and leave notes
visible. A manually selected guitar interval also takes priority over speech
timestamps, so a known guitar passage remains visible even if the transcript
marks it as speech.
If transcription is unavailable, the note timeline and audio playback still
work, though speech may be mislabelled as notes until a transcript is available.
This version assumes the student does not play while speaking and does not
support chords or other polyphonic playing.
Select any event to play from its timestamp. The page does not ask for
a transcript JSON file.

```sh
npm run ui
```

Open `http://127.0.0.1:8765`, select your WAV, and choose **Analyze lesson**.
The interval control is optional. The viewer listens on your computer only and
keeps the file in memory. It accepts WAVs up to 128 MiB. To enable speech,
set `WHIPSCRIBE_API_KEY` in your shell before starting `npm run ui`; do not
put it in the browser or a tracked file. The page states when it will send
audio to WhipScribe. If no key is configured, it runs YIN only. Pitch labels
are estimates to verify by listening.

## Not done yet

Recording UI, validation of pitch accuracy and timing, user test,
two-minute demo, and vision. The
CLI accepts PCM16 WAV only; its pitch output is an estimate, not verified
performance or chord recognition. It does not integrate into the separate
TwelveStrings project yet. The one-year vision will be written after a real
recording and user test, as the challenge suggests. The viewer keeps results
in browser memory only, so a refresh requires reselecting the WAV. The new
viewer speech path has been checked with mocked API responses, not a live
WhipScribe submission while its transcription backend is unavailable.
