// ─── NO static imports from react-native-audio-api ───────────────────────────
// The module's TurboModule registration fires synchronously at evaluation time
// in Expo Go (where the native module is absent) and throws before any JS
// try/catch can run. The only safe pattern is a dynamic import() called
// lazily inside a method — it runs only on user interaction, never at
// module-load time.

import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { SoundSource } from '@/src/types';
import { fillNoise, NoiseType } from './noiseGenerators';

// ─── Audio availability ───────────────────────────────────────────────────────

/** True when real native audio is accessible (dev build / EAS build). */
export function isAudioAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  return Constants.appOwnership !== 'expo';
}

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

// ─── Constants ────────────────────────────────────────────────────────────────

const BUFFER_SECONDS = 10;
const DEFAULT_GAIN = 0.7;

// ─── AudioEngine singleton ────────────────────────────────────────────────────

class AudioEngine {
  private static _instance: AudioEngine | null = null;

  // All node references typed as `any` — the concrete types come from the
  // dynamically-loaded react-native-audio-api module.
  private ctx: any = null;
  private activeSource: any = null;   // AudioBufferSourceNode | null (single-source sounds)
  private activeGain: any = null;     // GainNode | null (master gain)
  private activeFilter: any = null;   // BiquadFilterNode | null (single-filter sounds)
  private notchFilter: any = null;    // BiquadFilterNode | null (therapy)
  private activeOscillators: any[] = [];    // OscillatorNode[] (binaural)
  private activePanners: any[] = [];        // StereoPannerNode[] (binaural)

  private _currentSound: SoundSource | null = null;
  private _volume: number = DEFAULT_GAIN;
  private _sessionStartTime: number | null = null;
  private _notchedFrequencyHz: number | null = null;
  private _isPaused = false;

  private constructor() {}

  static get instance(): AudioEngine {
    if (!AudioEngine._instance) {
      AudioEngine._instance = new AudioEngine();
    }
    return AudioEngine._instance;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  get currentSound(): SoundSource | null { return this._currentSound; }
  get isPlaying(): boolean { return this._currentSound !== null; }
  get sessionStartTime(): number | null { return this._sessionStartTime; }
  get volume(): number { return this._volume; }
  get notchedFrequencyHz(): number | null { return this._notchedFrequencyHz; }
  get isPaused(): boolean { return this._isPaused; }

  // play() returns void and fires the async work in the background so callers
  // do not need to be made async.
  play(soundId: SoundSource, volume: number = DEFAULT_GAIN): void {
    this._volume = volume;
    this._doPlay(soundId, volume);
  }

  private async _doPlay(soundId: SoundSource, volume: number): Promise<void> {
    const api = await loadApi();
    if (!api) {
      Alert.alert(
        'Audio unavailable',
        'Audio playback requires a development build. Expo Go does not support native audio.'
      );
      return;
    }

    this.clearNodes();

    // Create / reuse AudioContext
    if (!this.ctx) {
      this.ctx = new api.AudioContext();
    }

    // Android (and some react-native-audio-api builds) may start the context in
    // 'suspended' state. Buffer-based sounds silently queue audio that never
    // plays until resumed; oscillators can bypass this on some implementations.
    // Explicitly resume before building any nodes.
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }

    console.log('[AudioEngine] play:', soundId, '| ctx.state:', this.ctx.state);

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    // Route: gain → [notch filter?] → destination
    if (this._notchedFrequencyHz !== null) {
      const notch = this.ctx.createBiquadFilter();
      notch.type = 'notch';
      notch.frequency.value = this._notchedFrequencyHz;
      notch.Q.value = 1.0;
      gain.connect(notch);
      notch.connect(this.ctx.destination);
      this.notchFilter = notch;
    } else {
      gain.connect(this.ctx.destination);
      this.notchFilter = null;
    }
    this.activeGain = gain;

    try {
      if (soundId === 'binaural-alpha' || soundId === 'binaural-theta') {
        this.buildBinauralNodes(soundId, gain);
      } else if (soundId === 'white-noise' || soundId === 'pink-noise' || soundId === 'brown-noise' || soundId === 'rain' || soundId === 'ocean') {
        await this.buildNoiseFileNodes(soundId, gain);
      } else if (soundId === 'cafe') {
        await this.buildCafeFileNodes(gain);
      } else {
        this.buildBufferNodes(soundId, gain);
      }
    } catch (err) {
      console.error('[AudioEngine] buildNodes failed for', soundId, err);
      this.clearNodes();
      return;
    }

    this._currentSound = soundId;
    this._sessionStartTime = Date.now();
  }

  stop(): void {
    this.clearNodes();
    this._currentSound = null;
    this._sessionStartTime = null;
    this._isPaused = false;
  }

  async pause(): Promise<void> {
    if (!this.ctx || !this._currentSound || this._isPaused) return;
    await this.ctx.suspend();
    this._isPaused = true;
  }

  async resume(): Promise<void> {
    if (!this.ctx || !this._currentSound || !this._isPaused) return;
    await this.ctx.resume();
    this._isPaused = false;
  }

  startFadeOut(durationSeconds: number): void {
    if (!this.activeGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const cur = this.activeGain.gain.value;
    this.activeGain.gain.setValueAtTime(cur, now);
    this.activeGain.gain.linearRampToValueAtTime(0, now + durationSeconds);
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    if (this.activeGain && this.ctx) {
      this.activeGain.gain.setValueAtTime(this._volume, this.ctx.currentTime);
    } else if (this.activeGain) {
      this.activeGain.gain.value = this._volume;
    }
  }

  enableNotchedTherapy(frequencyHz: number): void {
    this._notchedFrequencyHz = frequencyHz;
    if (this._currentSound) this.play(this._currentSound, this._volume);
  }

  disableNotchedTherapy(): void {
    this._notchedFrequencyHz = null;
    if (this._currentSound) this.play(this._currentSound, this._volume);
  }

  // ─── Node builders ────────────────────────────────────────────────────────

  private buildBufferNodes(soundId: SoundSource, gain: any): void {
    const ctx = this.ctx;
    const bufLen = Math.floor(ctx.sampleRate * BUFFER_SECONDS);
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    fillNoise(buffer.getChannelData(0), noiseBaseFor(soundId));

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = buildFilter(ctx, soundId);
    if (filter) {
      source.connect(filter);
      filter.connect(gain);
      this.activeFilter = filter;
    } else {
      source.connect(gain);
      this.activeFilter = null;
    }

    source.start();
    this.activeSource = source;
  }

  private buildBinauralNodes(soundId: SoundSource, gain: any): void {
    const ctx = this.ctx;
    const { leftHz, rightHz } = binauralFrequencies(soundId);

    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.value = leftHz;

    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.value = rightHz;

    const leftPan = ctx.createStereoPanner();
    leftPan.pan.value = -1;

    const rightPan = ctx.createStereoPanner();
    rightPan.pan.value = 1;

    leftOsc.connect(leftPan);
    leftPan.connect(gain);
    rightOsc.connect(rightPan);
    rightPan.connect(gain);

    leftOsc.start();
    rightOsc.start();

    this.activeOscillators = [leftOsc, rightOsc];
    this.activePanners = [leftPan, rightPan];
  }

  // ─── Noise files (file-based) ────────────────────────────────────────────
  // Loads a pre-generated MP3 (ffmpeg anoisesrc — mathematically accurate spectral
  // profile) and plays it as a looping buffer. Replaces synthesised versions
  // which were perceptually indistinct on device.

  private static readonly NOISE_MODULES: Record<string, any> = {
    'white-noise': require('@/assets/sounds/white-noise.mp3'),
    'pink-noise':  require('@/assets/sounds/pink-noise.mp3'),
    'brown-noise': require('@/assets/sounds/brown-noise.mp3'),
    'rain':        require('@/assets/sounds/rain.mp3'),
    'ocean':       require('@/assets/sounds/ocean-waves.mp3'),
  };

  private async buildNoiseFileNodes(soundId: SoundSource, gain: any): Promise<void> {
    const { Asset } = await import('expo-asset');
    const asset = Asset.fromModule(AudioEngine.NOISE_MODULES[soundId]);
    await asset.downloadAsync();
    const response = await fetch(asset.localUri!);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(gain);
    source.start();
    this.activeSource = source;
  }

  // ─── Cafe ambience (file-based) ──────────────────────────────────────────
  // Loads assets/sounds/cafe-ambience.mp3 (CC0 — The Designer's Choice collection
  // via archive.org), decodes via Web Audio API, and plays as a looping buffer.

  private async buildCafeFileNodes(gain: any): Promise<void> {
    const { Asset } = await import('expo-asset');
    const asset = Asset.fromModule(require('@/assets/sounds/cafe-ambience.mp3'));
    await asset.downloadAsync();
    const response = await fetch(asset.localUri!);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(gain);
    source.start();
    this.activeSource = source;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  private clearNodes(): void {
    if (this.activeSource) {
      try { this.activeSource.stop(); } catch {}
      try { this.activeSource.disconnect(); } catch {}
      this.activeSource = null;
    }

    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch {}
      try { osc.disconnect(); } catch {}
    }
    this.activeOscillators = [];

    for (const pan of this.activePanners) {
      try { pan.disconnect(); } catch {}
    }
    this.activePanners = [];

    if (this.activeFilter) {
      try { this.activeFilter.disconnect(); } catch {}
      this.activeFilter = null;
    }

    if (this.notchFilter) {
      try { this.notchFilter.disconnect(); } catch {}
      this.notchFilter = null;
    }
    if (this.activeGain) {
      try { this.activeGain.disconnect(); } catch {}
      this.activeGain = null;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function noiseBaseFor(soundId: SoundSource): NoiseType {
  switch (soundId) {
    case 'stream': return 'white';
    case 'fire':  return 'brown';
    case 'forest':              return 'pink';
    default: return 'white';
  }
}

function buildFilter(ctx: any, soundId: SoundSource): any {
  const f = ctx.createBiquadFilter();
  switch (soundId) {
    case 'stream': f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.5; return f;
    case 'forest': f.type = 'lowpass';  f.frequency.value = 1500; f.Q.value = 0.5; return f;
    case 'fire':   f.type = 'lowpass';  f.frequency.value = 500;  f.Q.value = 0.3; return f;
    default:       return null;
  }
}

function binauralFrequencies(soundId: SoundSource): { leftHz: number; rightHz: number } {
  switch (soundId) {
    case 'binaural-alpha': return { leftHz: 200, rightHz: 210 };
    case 'binaural-theta': return { leftHz: 200, rightHz: 206 };
    default:               return { leftHz: 200, rightHz: 210 };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const audioEngine = AudioEngine.instance;
