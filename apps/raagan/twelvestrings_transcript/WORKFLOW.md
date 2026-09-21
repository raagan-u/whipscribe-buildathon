# TwelveStrings Transcript — proposed workflow

One audio file is the shared timebase. This is a plan, not an implemented
flow. **[local]** means code in this app; **[WhipScribe API]** means the
documented transcription API.

```
1. Record or choose a lesson file                             [local]
   - Person: chooses one recording and sees it ready to process.
   - App: uses that exact file for both pipelines.

2. Transcribe speech                                           [WhipScribe API]
   - App: uploads the file with POST /api/v1/transcribe, polls the job,
     and fetches result?format=json when done.
   - Person: sees progress, transcript, or a clear error/no-speech state.
   - A done job with speech_detected: false has no speech segments.

3. Estimate pitch                                              [local]
   - App: analyzes the same file for a single-note line and emits note,
     octave, time range, and confidence/uncertainty for usable regions.
   - Person: sees when no reliable note could be estimated.

4. Align and review                                            [local]
   - App: places transcript segments and note events on the file's timebase.
   - Person: selects a teacher comment, hears that moment, and sees nearby
     note estimates without manually scrubbing for both pieces of evidence.

5. Optional local lookup                                      [local]
   - Person: asks "what note was estimated near 2:10?" and gets a timestamped
     answer linked to the original audio, or "no reliable estimate."
   - This does not use or imply a WhipScribe music-Q&A endpoint.
```

## Boundaries

- WhipScribe supplies speech segments and timestamps, not music notes.
- The local app supplies note estimates and aligns them with speech.
- Mixed speech and guitar, chords, and background audio can defeat a
  monophonic detector. The first real recording will test this assumption.
