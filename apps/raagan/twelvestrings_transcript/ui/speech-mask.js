// Long transcript segments are too coarse to locate speech precisely.
export const MAX_SPEECH_MASK_SECONDS = 10;

export function visibleNotes(notes, speech, guitarRangeSelected = false) {
  const timedSpeech = speech.filter(segment => segment.text.trim());
  const coarseSegments = timedSpeech.filter(segment => segment.end - segment.start > MAX_SPEECH_MASK_SECONDS);
  const maskSegments = guitarRangeSelected ? [] : timedSpeech.filter(segment =>
    segment.end - segment.start <= MAX_SPEECH_MASK_SECONDS);
  const shownNotes = notes.filter(note => !maskSegments.some(segment =>
    note.start < segment.end && note.end > segment.start));
  return { shownNotes, hiddenCount: notes.length - shownNotes.length, coarseCount: coarseSegments.length };
}
