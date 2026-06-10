// ─── NO static imports from react-native-audio-api ───────────────────────────
// See AudioEngine.ts for the rationale.

import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

const MIN_HZ = 100;
const MID_HZ = 3000;
const MAX_HZ = 16000;
const DEFAULT_VOLUME = 0.5;
const AUDIO_SAMPLE_RATE = 48000;

// ─── Lazy module cache ────────────────────────────────────────────────────────

let _api: any = null;
let _apiLoaded = false;

async function loadApi(): Promise<any> {
  if (_apiLoaded) return _api;
  _apiLoaded = true;
  try {
    _api = await import('react-native-audio-api');
  } catch {
    _api = null;
  }
  return _api;
}

// ─── Two-segment logarithmic frequency ↔ slider mapping ───────────────────────
// Slider 0.0–0.5 maps log-scale across 100Hz–3,000Hz; slider 0.5–1.0 maps
// log-scale across 3,000Hz–16,000Hz. This gives the 3kHz–16kHz range — where
// most tinnitus pitches fall — half of the slider's travel instead of a
// fraction of a single 100Hz–16,000Hz log scale.

// Number of discrete slider steps across the full 0.0–1.0 position range.
// At the top of the high-frequency segment one step is ~27Hz, keeping
// per-step jumps small enough that the oscillator never has to leap far.
export const SLIDER_RESOLUTION = 2000;

export function sliderToHz(sliderValue: number): number {
  const pos = sliderValue / SLIDER_RESOLUTION;
  const hz =
    pos <= 0.5
      ? MIN_HZ * Math.pow(MID_HZ / MIN_HZ, pos * 2)
      : MID_HZ * Math.pow(MAX_HZ / MID_HZ, (pos - 0.5) * 2);
  return Math.round(hz * 10) / 10;
}

export function hzToSlider(hz: number): number {
  const clamped = Math.max(MIN_HZ, Math.min(MAX_HZ, hz));
  const pos =
    clamped <= MID_HZ
      ? 0.5 * (Math.log(clamped / MIN_HZ) / Math.log(MID_HZ / MIN_HZ))
      : 0.5 + 0.5 * (Math.log(clamped / MID_HZ) / Math.log(MAX_HZ / MID_HZ));
  return Math.round(pos * SLIDER_RESOLUTION);
}

export function formatHz(hz: number): string {
  if (hz >= 10000) return `${(hz / 1000).toFixed(1)} kHz`;
  if (hz >= 1000)  return `${(hz / 1000).toFixed(2).replace(/\.?0+$/, '')} kHz`;
  return `${hz} Hz`;
}

// Always shows one decimal place with thousands separators, e.g. "4,250.0 Hz".
// Used by the pitch matching frequency display for precise readout as the
// slider moves.
export function formatHzPrecise(hz: number): string {
  return `${hz.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Hz`;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class PitchMatchEngine {
  private static _instance: PitchMatchEngine | null = null;

  private ctx: any = null;
  private osc: any = null;
  private gain: any = null;
  private _isPlaying = false;
  private _frequencyHz = 1000;
  private _oscEnded = false;

  private constructor() {}

  static get instance(): PitchMatchEngine {
    if (!PitchMatchEngine._instance) {
      PitchMatchEngine._instance = new PitchMatchEngine();
    }
    return PitchMatchEngine._instance;
  }

  get isPlaying(): boolean { return this._isPlaying; }
  get frequencyHz(): number { return this._frequencyHz; }

  // Creates the AudioContext if it doesn't exist yet (without starting
  // playback) and logs the actual sample rate the device granted us. A
  // sampleRate of 22,050Hz or lower means the Nyquist limit sits at or below
  // 11,025Hz, which would explain a hard cutoff around 11kHz.
  async ensureContext(): Promise<void> {
    if (Platform.OS === 'web') return;
    const api = await loadApi();
    if (!api) return;

    if (!this.ctx) {
      this.ctx = new api.AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
      console.log(
        '[PitchMatchEngine] AudioContext created — requested sampleRate:', AUDIO_SAMPLE_RATE,
        '| actual sampleRate:', this.ctx.sampleRate,
        '| state:', this.ctx.state,
      );
    } else {
      console.log('[PitchMatchEngine] AudioContext sampleRate:', this.ctx.sampleRate, '| state:', this.ctx.state);
    }
  }

  // start() returns void immediately; audio setup runs asynchronously.
  start(frequencyHz: number = this._frequencyHz, volume = DEFAULT_VOLUME): void {
    if (Platform.OS === 'web') return;
    this.stop();
    this._doStart(frequencyHz, volume);
  }

  private async _doStart(frequencyHz: number, volume: number): Promise<void> {
    const api = await loadApi();
    if (!api) {
      if (Constants.appOwnership === 'expo') {
        Alert.alert(
          'Audio unavailable',
          'Pitch matching requires a development build.'
        );
      }
      return;
    }

    if (!this.ctx) {
      // Explicit sample rate ensures a Nyquist limit of 24,000Hz — without this
      // some devices default to a lower rate (e.g. 22,050Hz), which silently
      // cuts frequencies above ~11,025Hz.
      this.ctx = new api.AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    }

    // Android (and some react-native-audio-api builds) may start the context in
    // 'suspended' state — oscillators can produce no audible output until resumed.
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }

    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, frequencyHz));

    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sine';
    this.osc.frequency.setValueAtTime(this._frequencyHz, this.ctx.currentTime);
    this._oscEnded = false;
    this.osc.onended = () => { this._oscEnded = true; };

    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(volume, this.ctx.currentTime);

    this.osc.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.osc.start();

    this._isPlaying = true;
  }

  // Recreates the oscillator at the current frequency, reusing the existing
  // GainNode so gain/connection to destination is untouched and there is no
  // audio gap. Used as a recovery path if the oscillator has died or throws
  // when its frequency is updated at high values.
  private recreateOscillator(): void {
    if (!this.ctx || !this.gain) return;

    if (this.osc) {
      try { this.osc.stop(); } catch {}
      try { this.osc.disconnect(); } catch {}
    }

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this._frequencyHz, this.ctx.currentTime);
    osc.onended = () => { this._oscEnded = true; };
    osc.connect(this.gain);
    osc.start();

    this.osc = osc;
    this._oscEnded = false;
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

  setFrequency(hz: number): void {
    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, hz));
    if (!this.ctx) return;

    // Health check — resume a suspended context before touching the oscillator.
    if (this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch {}
    }

    // If the oscillator has silently stopped (or was never created), recreate
    // it at the current frequency through the existing GainNode.
    if (!this.osc || this._oscEnded) {
      this.recreateOscillator();
      return;
    }

    try {
      // exponentialRampToValueAtTime ramps to the new frequency over 20ms —
      // fast enough to feel instant but smooth enough that the oscillator
      // never jumps abruptly, even on large slider steps at high
      // frequencies. _frequencyHz is always clamped to [MIN_HZ, MAX_HZ]
      // above, so it is never 0 or negative (which this call would reject).
      this.osc.frequency.exponentialRampToValueAtTime(this._frequencyHz, this.ctx.currentTime + 0.02);
    } catch {
      this.recreateOscillator();
    }
  }
}

export const pitchMatchEngine = PitchMatchEngine.instance;
