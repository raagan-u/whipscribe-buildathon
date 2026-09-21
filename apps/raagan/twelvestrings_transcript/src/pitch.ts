// Adapted from twelvestrings_web/src/audio/pitch.ts and note.ts.
// Offline frame processing reuses the existing guitar detector's FFT and
// fundamental selection; results remain estimates, not verified notes.

export const FRAME_SIZE = 4096;
const MIN_FREQ_HZ = 70;
const MAX_FREQ_HZ = 1320;
const SUBHARMONIC_THRESHOLD = 0.2;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len / 2;
    const angle = (-2 * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let currentWr = 1;
      let currentWi = 0;
      for (let k = 0; k < half; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + half] * currentWr - im[i + k + half] * currentWi;
        const vIm = re[i + k + half] * currentWi + im[i + k + half] * currentWr;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + half] = uRe - vRe;
        im[i + k + half] = uIm - vIm;
        const nextWr = currentWr * wr - currentWi * wi;
        currentWi = currentWr * wi + currentWi * wr;
        currentWr = nextWr;
      }
    }
  }
}

function parabolicInterpolate(magnitudes: Float64Array, peakBin: number): number {
  if (peakBin === 0 || peakBin + 1 >= magnitudes.length) return peakBin;
  const ln = (value: number) => Math.log(Math.max(value, Number.MIN_VALUE));
  const alpha = ln(magnitudes[peakBin - 1]);
  const beta = ln(magnitudes[peakBin]);
  const gamma = ln(magnitudes[peakBin + 1]);
  const denominator = alpha - 2 * beta + gamma;
  return denominator === 0 ? peakBin : peakBin + (0.5 * (alpha - gamma)) / denominator;
}

export function detectPitch(samples: Float32Array, sampleRate: number): number | null {
  const n = samples.length;
  if (n === 0 || (n & (n - 1)) !== 0) throw new Error("Pitch frame must have power-of-two length.");
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    re[i] = samples[i] * window;
  }
  fft(re, im);
  const magnitudes = new Float64Array(n / 2);
  for (let i = 0; i < magnitudes.length; i++) magnitudes[i] = Math.hypot(re[i], im[i]);
  let peakBin = -1;
  let peakMagnitude = 0;
  for (let i = 1; i < magnitudes.length; i++) {
    if (magnitudes[i] > peakMagnitude) {
      peakMagnitude = magnitudes[i];
      peakBin = i;
    }
  }
  if (peakBin === -1 || peakMagnitude <= 0) return null;
  const subBin = Math.round(peakBin / 2);
  if (subBin >= 1 && subBin * sampleRate / n >= MIN_FREQ_HZ &&
      magnitudes[subBin] >= SUBHARMONIC_THRESHOLD * peakMagnitude) {
    peakBin = subBin;
  }
  const frequency = parabolicInterpolate(magnitudes, peakBin) * sampleRate / n;
  return frequency >= MIN_FREQ_HZ && frequency <= MAX_FREQ_HZ ? frequency : null;
}

export function hzToNote(frequency: number): string {
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export type NoteEvent = {
  kind: "note";
  start: number;
  end: number;
  note: string;
  frequencyHz: number;
};

export function detectNoteEvents(
  samples: Float32Array, sampleRate: number, startSeconds: number, endSeconds: number,
): NoteEvent[] {
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) ||
      startSeconds < 0 || endSeconds <= startSeconds || endSeconds > samples.length / sampleRate) {
    throw new Error("Guitar window must be inside the recording and have positive length.");
  }
  const hop = FRAME_SIZE / 2;
  const startSample = Math.round(startSeconds * sampleRate);
  const endSample = Math.round(endSeconds * sampleRate);
  if (endSample - startSample < FRAME_SIZE) {
    throw new Error(`Guitar window must contain at least ${FRAME_SIZE} audio samples.`);
  }
  const frames: Array<{ start: number; end: number; note: string | null; frequencyHz: number | null }> = [];
  for (let offset = startSample; offset + FRAME_SIZE <= endSample; offset += hop) {
    const frame = samples.subarray(offset, offset + FRAME_SIZE);
    let energy = 0;
    for (const sample of frame) energy += sample * sample;
    const frequencyHz = Math.sqrt(energy / FRAME_SIZE) < 0.012
      ? null : detectPitch(frame, sampleRate);
    frames.push({
      start: offset / sampleRate,
      end: (offset + FRAME_SIZE) / sampleRate,
      note: frequencyHz === null ? null : hzToNote(frequencyHz),
      frequencyHz,
    });
  }

  const events: NoteEvent[] = [];
  let runStart = 0;
  for (let index = 1; index <= frames.length; index++) {
    if (index < frames.length && frames[index].note === frames[runStart].note) continue;
    const run = frames.slice(runStart, index);
    if (run[0].note !== null && run.length >= 3) {
      const frequencies = run.map(frame => frame.frequencyHz as number).sort((a, b) => a - b);
      events.push({
        kind: "note",
        start: Number(run[0].start.toFixed(3)),
        end: Number(run[run.length - 1].end.toFixed(3)),
        note: run[0].note,
        frequencyHz: Number(frequencies[Math.floor(frequencies.length / 2)].toFixed(2)),
      });
    }
    runStart = index;
  }
  return events;
}
