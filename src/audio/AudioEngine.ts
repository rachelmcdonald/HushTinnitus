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

  // Cafe ambience — multi-layer nodes
  private activeSources: any[] = [];       // extra AudioBufferSourceNodes
  private activeLFOs: any[] = [];          // LFO OscillatorNodes (crowd modulation)
  private activeLayerGains: any[] = [];    // per-layer GainNodes, DelayNodes
  private activeFilters: any[] = [];       // per-layer BiquadFilterNodes
  private cafeTimers: ReturnType<typeof setTimeout>[] = [];

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

  // ─── Cafe ambience (layered synthesis) ───────────────────────────────────

  private buildCafeNodes(dest: any): void {
    const ctx = this.ctx;

    const makeLoopingNoise = (type: NoiseType, bufSeconds = 3): any => {
      const bufLen = Math.floor(ctx.sampleRate * bufSeconds);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      fillNoise(buf.getChannelData(0), type);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      return src;
    };

    // ── 1. Brown noise base — low-volume room ambience ──────────────────────
    const baseNoise = makeLoopingNoise('brown');
    const baseGain = ctx.createGain();
    baseGain.gain.value = 0.15;
    baseNoise.connect(baseGain);
    baseGain.connect(dest);
    baseNoise.start();
    this.activeSources.push(baseNoise);
    this.activeLayerGains.push(baseGain);

    // ── 2. Crowd chatter — 6 bandpass-filtered voices with LFO modulation ──
    const VOICES = [
      { freq: 400,  lfoRate: 0.31, gain: 0.11 },
      { freq: 600,  lfoRate: 0.47, gain: 0.10 },
      { freq: 900,  lfoRate: 0.73, gain: 0.12 },
      { freq: 1200, lfoRate: 0.89, gain: 0.09 },
      { freq: 1800, lfoRate: 0.61, gain: 0.08 },
      { freq: 2400, lfoRate: 1.13, gain: 0.10 },
    ];

    for (const cfg of VOICES) {
      const noise = makeLoopingNoise('pink');

      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.value = cfg.freq;
      bpf.Q.value = 2.5;

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = cfg.gain;

      // LFO: slow sine wave modulates voice amplitude to simulate conversation rhythm
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = cfg.lfoRate;

      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = cfg.gain * 0.5; // ±50% modulation depth

      lfo.connect(lfoAmp);
      try {
        lfoAmp.connect(voiceGain.gain); // AudioParam modulation (Web Audio API spec)
      } catch {
        // Some builds do not support AudioParam connections — voices still play at static gain
      }

      noise.connect(bpf);
      bpf.connect(voiceGain);
      voiceGain.connect(dest);

      noise.start();
      lfo.start();

      this.activeSources.push(noise);
      this.activeLFOs.push(lfo);
      this.activeFilters.push(bpf);
      this.activeLayerGains.push(voiceGain);
      this.activeLayerGains.push(lfoAmp);
    }

    // ── 3. Coffee machine / steam — periodic white noise burst ──────────────
    const steamNoise = makeLoopingNoise('white');
    const steamHPF = ctx.createBiquadFilter();
    steamHPF.type = 'highpass';
    steamHPF.frequency.value = 2000;
    const steamGain = ctx.createGain();
    steamGain.gain.value = 0;
    steamNoise.connect(steamHPF);
    steamHPF.connect(steamGain);
    steamGain.connect(dest);
    steamNoise.start();
    this.activeSources.push(steamNoise);
    this.activeFilters.push(steamHPF);
    this.activeLayerGains.push(steamGain);

    const fireSteam = () => {
      try {
        const now = ctx.currentTime;
        const g = steamGain.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(0, now);
        g.linearRampToValueAtTime(0.3, now + 0.1);            // attack  0.1s
        g.setValueAtTime(0.3, now + 0.1 + 0.8);               // sustain 0.8s
        g.linearRampToValueAtTime(0, now + 0.1 + 0.8 + 0.3);  // release 0.3s
      } catch {}
      const id = setTimeout(fireSteam, 15000 + Math.random() * 30000);
      this.cafeTimers.push(id);
    };
    this.cafeTimers.push(setTimeout(fireSteam, 5000 + Math.random() * 15000));

    // ── 4. Cutlery / crockery clicks — short high-frequency transients ───────
    const cutleryNoise = makeLoopingNoise('white');
    const cutleryHPF = ctx.createBiquadFilter();
    cutleryHPF.type = 'highpass';
    cutleryHPF.frequency.value = 4000;
    const cutleryGain = ctx.createGain();
    cutleryGain.gain.value = 0;
    cutleryNoise.connect(cutleryHPF);
    cutleryHPF.connect(cutleryGain);
    cutleryGain.connect(dest);
    cutleryNoise.start();
    this.activeSources.push(cutleryNoise);
    this.activeFilters.push(cutleryHPF);
    this.activeLayerGains.push(cutleryGain);

    const fireCutlery = () => {
      try {
        const now = ctx.currentTime;
        const g = cutleryGain.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(0, now);
        g.linearRampToValueAtTime(0.4, now + 0.01);            // attack 0.01s
        g.linearRampToValueAtTime(0, now + 0.01 + 0.15);       // decay  0.15s
      } catch {}
      const id = setTimeout(fireCutlery, 8000 + Math.random() * 12000);
      this.cafeTimers.push(id);
    };
    this.cafeTimers.push(setTimeout(fireCutlery, 2000 + Math.random() * 6000));

    // ── 5. Short delay — simulates room reflections ──────────────────────────
    // Tap off the master gain. Feedback of 0.5 with 50ms delay → tail ~0.3s.
    try {
      const delay = ctx.createDelay(0.5);
      delay.delayTime.value = 0.05;

      const delayFB = ctx.createGain();
      delayFB.gain.value = 0.5;

      const delayWet = ctx.createGain();
      delayWet.gain.value = 0.12;

      dest.connect(delay);
      delay.connect(delayFB);
      delayFB.connect(delay);          // feedback loop (requires DelayNode in cycle per spec)
      delay.connect(delayWet);
      delayWet.connect(ctx.destination);

      this.activeLayerGains.push(delay);
      this.activeLayerGains.push(delayFB);
      this.activeLayerGains.push(delayWet);
    } catch {
      // createDelay not available in this API build — no reverb
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  private clearNodes(): void {
    // Cancel scheduled timers before disconnecting nodes to prevent stale callbacks
    for (const id of this.cafeTimers) clearTimeout(id);
    this.cafeTimers = [];

    if (this.activeSource) {
      try { this.activeSource.stop(); } catch {}
      try { this.activeSource.disconnect(); } catch {}
      this.activeSource = null;
    }
    for (const src of this.activeSources) {
      try { src.stop(); } catch {}
      try { src.disconnect(); } catch {}
    }
    this.activeSources = [];

    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch {}
      try { osc.disconnect(); } catch {}
    }
    this.activeOscillators = [];

    for (const lfo of this.activeLFOs) {
      try { lfo.stop(); } catch {}
      try { lfo.disconnect(); } catch {}
    }
    this.activeLFOs = [];

    for (const pan of this.activePanners) {
      try { pan.disconnect(); } catch {}
    }
    this.activePanners = [];

    if (this.activeFilter) {
      try { this.activeFilter.disconnect(); } catch {}
      this.activeFilter = null;
    }
    for (const f of this.activeFilters) {
      try { f.disconnect(); } catch {}
    }
    this.activeFilters = [];

    for (const g of this.activeLayerGains) {
      try { g.disconnect(); } catch {}
    }
    this.activeLayerGains = [];

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
    case 'white-noise': return 'white';
    case 'pink-noise':  return 'pink';
    case 'brown-noise': return 'brown';
    case 'rain': case 'stream': return 'white';
    case 'ocean': case 'fire':  return 'brown';
    case 'forest': case 'cafe': return 'pink';
    default: return 'white';
  }
}

function buildFilter(ctx: any, soundId: SoundSource): any {
  const f = ctx.createBiquadFilter();
  switch (soundId) {
    case 'rain':   f.type = 'lowpass';  f.frequency.value = 3000; f.Q.value = 0.5; return f;
    case 'ocean':  f.type = 'lowpass';  f.frequency.value = 600;  f.Q.value = 0.7; return f;
    case 'stream': f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.5; return f;
    case 'forest': f.type = 'lowpass';  f.frequency.value = 1500; f.Q.value = 0.5; return f;
    case 'fire':   f.type = 'lowpass';  f.frequency.value = 500;  f.Q.value = 0.3; return f;
    case 'cafe':   f.type = 'peaking';  f.frequency.value = 600;  f.Q.value = 1.0; f.gain.value = -8; return f;
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
