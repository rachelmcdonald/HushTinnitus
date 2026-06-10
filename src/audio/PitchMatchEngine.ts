// ─── NO static imports from react-native-audio-api ───────────────────────────
// See AudioEngine.ts for the rationale.

import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

const MIN_HZ = 100;
const MAX_HZ = 15000;
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

// ─── Logarithmic frequency ↔ slider mapping ───────────────────────────────────

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

  private ctx: any = null;
  private osc: any = null;
  private gain: any = null;
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

    // Android (and some react-native-audio-api builds) may start the context in
    // 'suspended' state — oscillators can produce no audible output until resumed.
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }

    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, frequencyHz));

    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sine';
    this.osc.frequency.setValueAtTime(this._frequencyHz, this.ctx.currentTime);

    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(volume, this.ctx.currentTime);

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

  setFrequency(hz: number): void {
    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, hz));
    if (this.osc && this.ctx) {
      this.osc.frequency.setValueAtTime(this._frequencyHz, this.ctx.currentTime);
    }
  }
}

export const pitchMatchEngine = PitchMatchEngine.instance;
