// ─── NO static imports from react-native-audio-api ───────────────────────────
// See AudioEngine.ts for the rationale.

import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

const MIN_HZ = 100;
const MID_HZ = 3000;
const MAX_HZ = 16000;
const DEFAULT_VOLUME = 0.5;
const AUDIO_SAMPLE_RATE = 48000;

// react-native-audio-api@0.12.2 silently ignores osc.frequency.setValueAtTime()
// above ~12kHz on Android (oscillator falls back to its 440Hz default). Above
// this threshold we synthesise a looping PCM sine buffer instead, which
// bypasses the oscillator entirely.
const BUFFER_TONE_THRESHOLD_HZ = 10500;

// Crossfade duration when re-synthesising the buffer tone at a new frequency
// (used to avoid the click caused by abruptly stopping/starting a buffer
// mid-waveform). The previous buffer source is stopped shortly after the
// crossfade completes.
const CROSSFADE_SEC = 0.02;
const CROSSFADE_STOP_MS = 25;

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
  private bufferSource: any = null;
  private bufferGain: any = null;
  private _isPlaying = false;
  private _frequencyHz = 1000;
  private _oscEnded = false;
  private _isBufferMode = false;

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

    // The context can stay 'suspended' on Android until explicitly resumed —
    // resume eagerly so it's already 'running' by the time start()/setFrequency()
    // touch the oscillator.
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
      console.log('[PitchMatchEngine] AudioContext resumed — state:', this.ctx.state);
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
      console.log('[PitchMatchEngine] AudioContext resumed — state:', this.ctx.state);
    }

    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, frequencyHz));

    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    this.gain.connect(this.ctx.destination);

    if (this._frequencyHz > BUFFER_TONE_THRESHOLD_HZ) {
      this.startBufferTone(this._frequencyHz);
    } else {
      this.osc = this.ctx.createOscillator();
      this.osc.type = 'sine';
      this._oscEnded = false;
      this.osc.onended = () => { this._oscEnded = true; };
      this.osc.connect(this.gain);

      // On react-native-audio-api/Android, frequency.value set before start()
      // is silently ignored (oscillator falls back to its 440Hz default) — the
      // frequency must be set after start().
      this.osc.start();
      this.osc.frequency.setValueAtTime(this._frequencyHz, this.ctx.currentTime);
      this._isBufferMode = false;
    }

    this._isPlaying = true;
  }

  // Generates a looping PCM sine buffer at `frequency` and plays it through
  // a per-source GainNode feeding into the shared GainNode. Used above
  // BUFFER_TONE_THRESHOLD_HZ to bypass the oscillator's broken high-frequency
  // setValueAtTime() on Android.
  //
  // When `crossfade` is true (used for in-place frequency changes while
  // already in buffer mode), the previous buffer source is faded out while
  // the new one fades in over CROSSFADE_SEC, avoiding the click caused by
  // abruptly stopping a buffer mid-waveform. On the initial transition into
  // buffer mode there is no previous buffer source to fade, so it starts at
  // full level immediately.
  private startBufferTone(frequency: number, crossfade = false): void {
    if (!this.ctx || !this.gain) return;

    if (this.osc) {
      try { this.osc.stop(); this.osc.disconnect(); } catch {}
      this.osc = null;
    }

    const sampleRate = this.ctx.sampleRate;
    // Round the buffer to a whole number of cycles so the loop point is
    // seamless (no click at the wrap-around).
    const cycles = Math.max(1, Math.round(frequency));
    const length = Math.round((cycles * sampleRate) / frequency);

    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      // Sample amplitude is halved to match the perceived loudness of the
      // oscillator path through the same shared GainNode.
      data[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const sourceGain = this.ctx.createGain();
    source.connect(sourceGain);
    sourceGain.connect(this.gain);

    const now = this.ctx.currentTime;
    const previousSource = this.bufferSource;
    const previousGain = this.bufferGain;

    if (crossfade && previousSource && previousGain) {
      sourceGain.gain.setValueAtTime(0, now);
      sourceGain.gain.linearRampToValueAtTime(1, now + CROSSFADE_SEC);

      previousGain.gain.cancelScheduledValues(now);
      previousGain.gain.setValueAtTime(previousGain.gain.value, now);
      previousGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_SEC);

      source.start();

      setTimeout(() => {
        try { previousSource.stop(); previousSource.disconnect(); } catch {}
        try { previousGain.disconnect(); } catch {}
      }, CROSSFADE_STOP_MS);
    } else {
      sourceGain.gain.setValueAtTime(1, now);
      this.stopBufferTone();
      source.start();
    }

    this.bufferSource = source;
    this.bufferGain = sourceGain;
    this._isBufferMode = true;
  }

  private stopBufferTone(): void {
    if (this.bufferSource) {
      try { this.bufferSource.stop(); this.bufferSource.disconnect(); } catch {}
      this.bufferSource = null;
    }
    if (this.bufferGain) {
      try { this.bufferGain.disconnect(); } catch {}
      this.bufferGain = null;
    }
  }

  // Recreates the oscillator at the current frequency, reusing the existing
  // GainNode so gain/connection to destination is untouched and there is no
  // audio gap. Used as a recovery path if the oscillator has died or throws
  // when its frequency is updated at high values.
  private recreateOscillator(): void {
    if (!this.ctx || !this.gain) return;

    this.stopBufferTone();
    if (this.osc) {
      try { this.osc.stop(); } catch {}
      try { this.osc.disconnect(); } catch {}
    }

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.onended = () => { this._oscEnded = true; };
    osc.connect(this.gain);

    // Frequency must be set after start() — see _doStart for why.
    osc.start();
    osc.frequency.setValueAtTime(this._frequencyHz, this.ctx.currentTime);

    this.osc = osc;
    this._oscEnded = false;
    this._isBufferMode = false;
  }

  stop(): void {
    if (this.osc) {
      try { this.osc.stop(); this.osc.disconnect(); } catch {}
      this.osc = null;
    }
    this.stopBufferTone();
    if (this.gain) {
      try { this.gain.disconnect(); } catch {}
      this.gain = null;
    }
    this._isPlaying = false;
    this._isBufferMode = false;
  }

  setFrequency(hz: number): void {
    this._frequencyHz = Math.max(MIN_HZ, Math.min(MAX_HZ, hz));
    if (!this.ctx) return;

    // Health check — resume a suspended context before touching the oscillator.
    if (this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch {}
    }

    const wantBuffer = this._frequencyHz > BUFFER_TONE_THRESHOLD_HZ;

    // Above the threshold, react-native-audio-api's oscillator can't be
    // retuned (setValueAtTime is silently ignored on Android), so every
    // change re-synthesises the PCM buffer at the new frequency.
    if (wantBuffer) {
      this.startBufferTone(this._frequencyHz, this._isBufferMode);
      return;
    }

    // Coming back down from buffer mode — recreate the oscillator at the
    // new frequency.
    if (this._isBufferMode || !this.osc || this._oscEnded) {
      this.recreateOscillator();
      return;
    }

    try {
      // linearRampToValueAtTime over 15ms — fast enough to feel instant but
      // smooth enough that the oscillator never jumps abruptly. Linear
      // interpolation avoids the precision loss exponentialRampToValueAtTime
      // can suffer at high frequencies on some implementations, which was
      // producing silent output above ~12kHz despite the oscillator
      // reporting the correct frequency value.
      const now = this.ctx.currentTime;
      this.osc.frequency.cancelScheduledValues(now);
      this.osc.frequency.setValueAtTime(this.osc.frequency.value, now);
      this.osc.frequency.linearRampToValueAtTime(this._frequencyHz, now + 0.015);
    } catch {
      this.recreateOscillator();
    }
  }
}

export const pitchMatchEngine = PitchMatchEngine.instance;
