import type { NoteEvent } from "./pitch.ts";
import type { Transcript } from "./whipscribe.ts";

export type SpeechEvent = {
  kind: "speech";
  start: number;
  end: number;
  text: string;
  speaker: string | null;
};

export type TimelineEvent = SpeechEvent | NoteEvent;

export function mergeTimeline(transcript: Transcript, notes: NoteEvent[]): TimelineEvent[] {
  const speech: SpeechEvent[] = transcript.segments.map(segment => ({
    kind: "speech",
    start: segment.start,
    end: segment.end,
    text: segment.text,
    speaker: segment.speaker ?? null,
  }));
  return [...speech, ...notes].sort((a, b) => a.start - b.start || a.end - b.end);
}
