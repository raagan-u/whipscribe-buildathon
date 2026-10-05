function formatTimestamp(seconds) {
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = (seconds % 60).toFixed(1).padStart(4, '0');
  return hours
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${remainder}`
    : `${String(minutes).padStart(2, '0')}:${remainder}`;
}

export function mergedTranscriptFilename(sourceName) {
  const stem = sourceName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '');
  return `${stem || 'lesson'}-merged-transcript.txt`;
}

export function buildMergedTranscript(sourceName, events) {
  const timeline = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const speechCount = timeline.filter(event => event.kind === 'speech').length;
  const noteCount = timeline.filter(event => event.kind === 'note').length;
  const lines = [
    'TwelveStrings · Merged lesson transcript',
    `Source: ${sourceName}`,
    `Timeline: ${speechCount} speech · ${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`,
    '',
  ];

  for (const event of timeline) {
    const range = `${formatTimestamp(event.start)}–${formatTimestamp(event.end)}`;
    if (event.kind === 'speech') {
      lines.push(`[${range}] ${event.speaker || 'Speech'}: ${event.text.trim()}`);
    } else {
      lines.push(`[${range}] Played note: ${event.note} (${event.frequencyHz.toFixed(1)} Hz · estimated)`);
    }
  }

  return `${lines.join('\n')}\n`;
}
