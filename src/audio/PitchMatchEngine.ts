// Dedicated oscillator for the pitch-matching screen.
// Kept separate from AudioEngine so it does not interfere with sound playback.

// Type-only imports — erased at compile time, no runtime module loading.
import type { AudioContext, OscillatorNode, GainNode } from 'react-native-audio-api';

type PitchApiCtor = { AudioContext: new () => AudioContext };
let _pitchApi: PitchApiCtor | null = null;
let _pitchApiChecked = false;

function loadPitchApi(): PitchApiCtor | null {
  if (_pitchApiChecked) return _pitchApi;
  _pitchApiChecked = true;
  try {
    _pitchApi = require('react-native-audio-api') as PitchApiCtor;
  } catch {
    _pitchApi = null;
  }
  return _pitchApi;
}

const MIN_HZ = 100;
const MAX_HZ = 15000;
const DEFAULT_VOLUME = 0.5;

// ─── Logarithmic frequency ↔ slider mapping ───────────────────────────────────
//
// Human pitch perception is logarithmic, so a linear slider would place far
// too much resolution in the high end and almost none in the low end.
// We map a 0–1000 integer slider onto [100, 15000] Hz logarithmically.
//
//   hz  = 100 × (150 ^ (sliderValue / 1000))
//   pos = round( log(hz / 100) / log(150) × 1000 )

export function sliderToHz(sliderValue: number): number {
  const hz = MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, sliderValue / 1000);
  return Math.round(hz);
}

export function hzToSlider(hz: number): number {
  const clamped = Math.max(MIN_HZ, Math.min(MAX_HZ, hz));
  return Math.round((Math.log(clamped / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ)) * 1000);
}

export function formatHz(hz: number): string {
  if (hz >= 10000) return `${(hz / 1000).toFixed(1)} kHz`;
  if (hz >= 1000)  return `${(hz / 1000).toFixed(2).replace(/\.?0+$/, '')} kHz`;
  return `${hz} Hz`;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class PitchMatchEngine {
  private static _instance: PitchMatchEngine | null = null;

  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private _isPlaying = false;
  private _frequencyHz = 1000;

  private constructor() {}

  static get instance(): PitchMatchEngine {
    if (!PitchMatchEngine._instance) {
      PitchMatchEngine._instance = new PitchMatchEngine();
    }
    return PitchMatchEngine._instance;
  }

  get isPlaying(): boolean { return this._isPlaying; }
  get frequencyHz(): number { return this._frequencyHz; }

  start(frequencyHz: number = this._frequencyHz, volume = DEFAULT_VOLUME): void {
    const api = loadPitchApi();
    if (!api) return; // no-op in Expo Go
    this.stop();

    if (!this.ctx) {
      this.ctx = new api.AudioContext();
    }

    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, frequencyHz));

    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sine';
    this.osc.frequency.value = this._frequencyHz;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = volume;

    this.osc.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.osc.start();

    this._isPlaying = true;
  }

  stop(): void {
    if (this.osc) {
      try { this.osc.stop(); this.osc.disconnect(); } catch {}
      this.osc = null;
    }
    if (this.gain) {
      try { this.gain.disconnect(); } catch {}
      this.gain = null;
    }
    this._isPlaying = false;
  }

  // Update frequency in real-time while the oscillator is running.
  setFrequency(hz: number): void {
    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, hz));
    if (this.osc) {
      this.osc.frequency.value = this._frequencyHz;
    }
  }
}

export const pitchMatchEngine = PitchMatchEngine.instance;
