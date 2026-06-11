// ─── NO static imports from react-native-audio-api ───────────────────────────
// See AudioEngine.ts for the rationale.

import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

const MIN_HZ = 100;
const MID_HZ = 3000;
const MAX_HZ = 16000;
const DEFAULT_VOLUME = 0.5;

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

// ─── Pre-generated pitch tone files ────────────────────────────────────────────
// react-native-audio-api@0.12.2's oscillator has confirmed bugs above ~12kHz on
// Android (frequency.setValueAtTime() silently ignored). Rather than fight the
// oscillator/buffer-synthesis APIs, pitch matching plays pre-rendered 3-second
// looping sine tone MP3s (generated via ffmpeg, see assets/sounds/pitch/) using
// the same file-based player pattern as the nature sounds in AudioEngine.ts.
// The slider/display still report the exact two-segment log-scale frequency —
// only the audio played snaps to the nearest available file.

export const PITCH_FREQUENCIES: number[] = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
  1200, 1400, 1600, 1800, 2000,
  2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500,
  8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000, 12500,
  13000, 13500, 14000, 14500, 15000, 15500, 16000,
];

const PITCH_FILES: Record<number, any> = {
  100: require('@/assets/sounds/pitch/100.mp3'),
  200: require('@/assets/sounds/pitch/200.mp3'),
  300: require('@/assets/sounds/pitch/300.mp3'),
  400: require('@/assets/sounds/pitch/400.mp3'),
  500: require('@/assets/sounds/pitch/500.mp3'),
  600: require('@/assets/sounds/pitch/600.mp3'),
  700: require('@/assets/sounds/pitch/700.mp3'),
  800: require('@/assets/sounds/pitch/800.mp3'),
  900: require('@/assets/sounds/pitch/900.mp3'),
  1000: require('@/assets/sounds/pitch/1000.mp3'),
  1200: require('@/assets/sounds/pitch/1200.mp3'),
  1400: require('@/assets/sounds/pitch/1400.mp3'),
  1600: require('@/assets/sounds/pitch/1600.mp3'),
  1800: require('@/assets/sounds/pitch/1800.mp3'),
  2000: require('@/assets/sounds/pitch/2000.mp3'),
  2500: require('@/assets/sounds/pitch/2500.mp3'),
  3000: require('@/assets/sounds/pitch/3000.mp3'),
  3500: require('@/assets/sounds/pitch/3500.mp3'),
  4000: require('@/assets/sounds/pitch/4000.mp3'),
  4500: require('@/assets/sounds/pitch/4500.mp3'),
  5000: require('@/assets/sounds/pitch/5000.mp3'),
  5500: require('@/assets/sounds/pitch/5500.mp3'),
  6000: require('@/assets/sounds/pitch/6000.mp3'),
  6500: require('@/assets/sounds/pitch/6500.mp3'),
  7000: require('@/assets/sounds/pitch/7000.mp3'),
  7500: require('@/assets/sounds/pitch/7500.mp3'),
  8000: require('@/assets/sounds/pitch/8000.mp3'),
  8500: require('@/assets/sounds/pitch/8500.mp3'),
  9000: require('@/assets/sounds/pitch/9000.mp3'),
  9500: require('@/assets/sounds/pitch/9500.mp3'),
  10000: require('@/assets/sounds/pitch/10000.mp3'),
  10500: require('@/assets/sounds/pitch/10500.mp3'),
  11000: require('@/assets/sounds/pitch/11000.mp3'),
  11500: require('@/assets/sounds/pitch/11500.mp3'),
  12000: require('@/assets/sounds/pitch/12000.mp3'),
  12500: require('@/assets/sounds/pitch/12500.mp3'),
  13000: require('@/assets/sounds/pitch/13000.mp3'),
  13500: require('@/assets/sounds/pitch/13500.mp3'),
  14000: require('@/assets/sounds/pitch/14000.mp3'),
  14500: require('@/assets/sounds/pitch/14500.mp3'),
  15000: require('@/assets/sounds/pitch/15000.mp3'),
  15500: require('@/assets/sounds/pitch/15500.mp3'),
  16000: require('@/assets/sounds/pitch/16000.mp3'),
};

// Returns the closest frequency in PITCH_FREQUENCIES to `hz`.
export function findNearestFrequency(hz: number): number {
  let nearest = PITCH_FREQUENCIES[0];
  let minDiff = Math.abs(hz - nearest);
  for (const f of PITCH_FREQUENCIES) {
    const diff = Math.abs(hz - f);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = f;
    }
  }
  return nearest;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class PitchMatchEngine {
  private static _instance: PitchMatchEngine | null = null;

  private ctx: any = null;
  private gain: any = null;
  private source: any = null;
  private _isPlaying = false;
  private _frequencyHz = 1000;
  private _loadedFrequencyHz: number | null = null;
  private _loadToken = 0;

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
  // playback) and resumes it if suspended.
  async ensureContext(): Promise<void> {
    if (Platform.OS === 'web') return;
    const api = await loadApi();
    if (!api) return;

    if (!this.ctx) {
      this.ctx = new api.AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
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
      this.ctx = new api.AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }

    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, frequencyHz));

    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    this.gain.connect(this.ctx.destination);

    this._isPlaying = true;
    await this.loadAndPlay(findNearestFrequency(this._frequencyHz));
  }

  // Loads the pre-generated tone file for `nearestHz` and plays it as a
  // looping buffer through the shared GainNode, replacing any currently
  // playing source. A token guards against a stale (slow) load overwriting
  // a more recent one if the user moves the slider quickly.
  private async loadAndPlay(nearestHz: number): Promise<void> {
    if (!this.ctx || !this.gain) return;
    if (nearestHz === this._loadedFrequencyHz && this.source) return;

    const token = ++this._loadToken;

    const { Asset } = await import('expo-asset');
    const asset = Asset.fromModule(PITCH_FILES[nearestHz]);
    await asset.downloadAsync();
    const response = await fetch(asset.localUri!);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    // A newer load (or a stop()) happened while this one was in flight.
    if (token !== this._loadToken || !this.ctx || !this.gain) return;

    if (this.source) {
      try { this.source.stop(); this.source.disconnect(); } catch {}
      this.source = null;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(this.gain);
    source.start();

    this.source = source;
    this._loadedFrequencyHz = nearestHz;
  }

  stop(): void {
    this._loadToken++;
    if (this.source) {
      try { this.source.stop(); this.source.disconnect(); } catch {}
      this.source = null;
    }
    if (this.gain) {
      try { this.gain.disconnect(); } catch {}
      this.gain = null;
    }
    this._loadedFrequencyHz = null;
    this._isPlaying = false;
  }

  // Updates the target frequency and, if the nearest available tone file has
  // changed, swaps the looping buffer to the new one. Display-only frequency
  // changes that snap to the same file are a no-op.
  setFrequency(hz: number): void {
    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, hz));
    if (!this.ctx || !this._isPlaying) return;

    if (this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch {}
    }

    const nearest = findNearestFrequency(this._frequencyHz);
    if (nearest === this._loadedFrequencyHz) return;
    this.loadAndPlay(nearest);
  }
}

export const pitchMatchEngine = PitchMatchEngine.instance;
