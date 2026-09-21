import { readFile } from "node:fs/promises";

export type AudioSamples = { samples: Float32Array; sampleRate: number };

export async function readPcm16Wav(path: string): Promise<AudioSamples> {
  const bytes = await readFile(path);
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Expected a RIFF/WAVE file.");
  }
  let channels = 0;
  let sampleRate = 0;
  let format = 0;
  let bitsPerSample = 0;
  let data: Buffer | null = null;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) throw new Error("Truncated WAV chunk.");
    if (id === "fmt ") {
      if (size < 16) throw new Error("Invalid WAV format chunk.");
      format = bytes.readUInt16LE(start);
      channels = bytes.readUInt16LE(start + 2);
      sampleRate = bytes.readUInt32LE(start + 4);
      bitsPerSample = bytes.readUInt16LE(start + 14);
    }
    if (id === "data") data = bytes.subarray(start, start + size);
    offset = start + size + (size % 2);
  }
  if (format !== 1 || bitsPerSample !== 16 || !Number.isInteger(channels) || channels < 1 ||
      sampleRate < 8000 || !data || data.length % (2 * channels) !== 0) {
    throw new Error("Use an uncompressed 16-bit PCM WAV with a valid sample rate and channels.");
  }
  const samples = new Float32Array(data.length / (2 * channels));
  for (let index = 0; index < samples.length; index++) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel++) {
      sum += data.readInt16LE((index * channels + channel) * 2) / 32768;
    }
    samples[index] = sum / channels;
  }
  return { samples, sampleRate };
}
