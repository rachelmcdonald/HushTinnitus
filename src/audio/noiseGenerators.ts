// Programmatic noise synthesis — no audio files, fully offline.
// All generators fill a Float32Array with samples in the range [-1, 1].

export type NoiseType = 'white' | 'pink' | 'brown';

export function fillNoise(data: Float32Array, type: NoiseType): void {
  switch (type) {
    case 'white': fillWhiteNoise(data); break;
    case 'pink':  fillPinkNoise(data);  break;
    case 'brown': fillBrownNoise(data); break;
  }
}

// ─── White noise ─────────────────────────────────────────────────────────────
// Flat power spectral density — equal energy at all frequencies.

function fillWhiteNoise(data: Float32Array): void {
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
}

// ─── Pink noise ──────────────────────────────────────────────────────────────
// Power spectral density proportional to 1/f.
// Algorithm: Paul Kellett's simplified pink noise approximation.
// Produces the characteristic warm, natural sound often described as
// "more soothing" than white noise.

function fillPinkNoise(data: Float32Array): void {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    data[i] = pink * 0.11; // scale to avoid clipping
  }
}

// ─── Brown noise ─────────────────────────────────────────────────────────────
// Power spectral density proportional to 1/f².
// Models Brownian motion (random walk) — deep, rumbling sound.

function fillBrownNoise(data: Float32Array): void {
  let lastOut = 0.0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5; // scale to roughly [-1, 1]
  }
}
