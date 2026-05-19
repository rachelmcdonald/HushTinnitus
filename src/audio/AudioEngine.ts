// Named imports from the main package — do not use deep import paths.
// react-native-audio-api ships a full web shim, so no Platform guards are needed.
import {
  AudioContext,
  AudioBufferSourceNode,
  GainNode,
  OscillatorNode,
  StereoPannerNode,
  BiquadFilterNode,
} from 'react-native-audio-api';
import { SoundSource } from '@/src/types';
import { fillNoise } from './noiseGenerators';

// ─── Constants ────────────────────────────────────────────────────────────────

const BUFFER_SECONDS = 10;
const DEFAULT_GAIN = 0.7;

// ─── Internal node graph representations ─────────────────────────────────────

// Buffer-based sound (noise + all soundscapes):
//   BufferSourceNode → [BiquadFilterNode?] → GainNode → destination
type BufferChain = {
  kind: 'buffer';
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode | null;
};

// Binaural beats: dual oscillators hard-panned L/R
//   LeftOsc → LeftPan → GainNode → destination
//   RightOsc → RightPan ─────────┘
type BinauralChain = {
  kind: 'binaural';
  leftOsc: OscillatorNode;
  rightOsc: OscillatorNode;
  leftPan: StereoPannerNode;
  rightPan: StereoPannerNode;
};

type Chain = BufferChain | BinauralChain;

// ─── AudioEngine singleton ────────────────────────────────────────────────────

class AudioEngine {
  private static _instance: AudioEngine | null = null;

  private ctx: AudioContext | null = null;
  private chain: Chain | null = null;
  private gain: GainNode | null = null;
  private notchFilter: BiquadFilterNode | null = null;
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

  get currentSound(): SoundSource | null {
    return this._currentSound;
  }

  get isPlaying(): boolean {
    return this._currentSound !== null;
  }

  get sessionStartTime(): number | null {
    return this._sessionStartTime;
  }

  get volume(): number {
    return this._volume;
  }

  get notchedFrequencyHz(): number | null {
    return this._notchedFrequencyHz;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  // Suspend the AudioContext — pauses all audio without losing the loop
  // position. Resumes from exactly where it left off.
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

  // Enable notched therapy. If audio is playing, restarts it through the filter.
  enableNotchedTherapy(frequencyHz: number): void {
    this._notchedFrequencyHz = frequencyHz;
    if (this._currentSound) this.play(this._currentSound, this._volume);
  }

  // Disable notched therapy. If audio is playing, restarts it without the filter.
  disableNotchedTherapy(): void {
    this._notchedFrequencyHz = null;
    if (this._currentSound) this.play(this._currentSound, this._volume);
  }

  play(soundId: SoundSource, volume: number = DEFAULT_GAIN): void {
    this.stop();

    const ctx = this.getContext();
    this._volume = volume;

    // Shared output gain node
    const gain = ctx.createGain();
    gain.gain.value = volume;
    this.gain = gain;

    // Route: gain → [notch filter?] → destination
    // Notched therapy: BiquadFilterNode 'notch', Q=1.0 (~1-octave bandwidth).
    // Protocol: Okamoto et al. (2010), PNAS 107(3), 1207-1210.
    if (this._notchedFrequencyHz !== null) {
      const notch = ctx.createBiquadFilter();
      notch.type = 'notch';
      notch.frequency.value = this._notchedFrequencyHz;
      notch.Q.value = 1.0;
      gain.connect(notch);
      notch.connect(ctx.destination);
      this.notchFilter = notch;
    } else {
      gain.connect(ctx.destination);
      this.notchFilter = null;
    }

    if (soundId === 'binaural-alpha' || soundId === 'binaural-theta') {
      this.chain = this.buildBinauralChain(ctx, soundId, gain);
    } else {
      this.chain = this.buildBufferChain(ctx, soundId, gain);
    }

    this._currentSound = soundId;
    this._sessionStartTime = Date.now();
  }

  stop(): void {
    this.clearChain();
    this._currentSound = null;
    this._sessionStartTime = null;
    this._isPaused = false;
  }

  // Schedule a linear gain fade to 0 over `durationSeconds`.
  // Call stop() separately after the fade completes.
  startFadeOut(durationSeconds: number): void {
    if (!this.gain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const currentGain = this.gain.gain.value;
    this.gain.gain.setValueAtTime(currentGain, now);
    this.gain.gain.linearRampToValueAtTime(0, now + durationSeconds);
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    if (this.gain && this.ctx) {
      this.gain.gain.setValueAtTime(this._volume, this.ctx.currentTime);
    } else if (this.gain) {
      this.gain.gain.value = this._volume;
    }
  }

  // ─── Chain builders ───────────────────────────────────────────────────────

  private buildBufferChain(
    ctx: AudioContext,
    soundId: SoundSource,
    gain: GainNode
  ): BufferChain {
    const noiseBase = noiseBaseFor(soundId);
    const bufferLength = Math.floor(ctx.sampleRate * BUFFER_SECONDS);
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    fillNoise(buffer.getChannelData(0), noiseBase);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = buildFilter(ctx, soundId);

    if (filter) {
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }

    source.start();
    return { kind: 'buffer', source, filter };
  }

  private buildBinauralChain(
    ctx: AudioContext,
    soundId: SoundSource,
    gain: GainNode
  ): BinauralChain {
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

    return { kind: 'binaural', leftOsc, rightOsc, leftPan, rightPan };
  }

  private clearChain(): void {
    if (this.chain) {
      if (this.chain.kind === 'buffer') {
        try { this.chain.source.stop(); } catch {}
        try { this.chain.source.disconnect(); } catch {}
        if (this.chain.filter) {
          try { this.chain.filter.disconnect(); } catch {}
        }
      } else {
        try { this.chain.leftOsc.stop(); } catch {}
        try { this.chain.leftOsc.disconnect(); } catch {}
        try { this.chain.rightOsc.stop(); } catch {}
        try { this.chain.rightOsc.disconnect(); } catch {}
        try { this.chain.leftPan.disconnect(); } catch {}
        try { this.chain.rightPan.disconnect(); } catch {}
      }
      this.chain = null;
    }
    if (this.notchFilter) {
      try { this.notchFilter.disconnect(); } catch {}
      this.notchFilter = null;
    }
    if (this.gain) {
      try { this.gain.disconnect(); } catch {}
      this.gain = null;
    }
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx!;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type NoiseBase = 'white' | 'pink' | 'brown';

function noiseBaseFor(soundId: SoundSource): NoiseBase {
  switch (soundId) {
    case 'white-noise': return 'white';
    case 'pink-noise':  return 'pink';
    case 'brown-noise': return 'brown';
    // Soundscapes — choose the closest noise texture as the base.
    // PLACEHOLDER: swap these with createFileSource() calls when real
    // royalty-free audio files (rain.mp3, ocean.mp3, etc.) are added to
    // assets/sounds/ before release. See Section 7.1 of the spec.
    case 'rain':   return 'white';  // white noise is a good rain base
    case 'ocean':  return 'brown';  // brown noise approximates deep wave rumble
    case 'stream': return 'white';  // white noise + bandpass ≈ babbling stream
    case 'forest': return 'pink';   // pink noise ≈ soft ambient outdoor
    case 'fire':   return 'brown';  // brown noise + lowpass ≈ crackling fire
    case 'cafe':   return 'pink';   // pink noise + peaking ≈ ambient murmur
    default:       return 'white';
  }
}

// Returns a configured BiquadFilterNode for soundscapes, null for plain noise.
// PLACEHOLDER: these filters are synthesized approximations only. Replace the
// entire buildBufferChain for soundscapes with createFileSource() + real files
// before release.
function buildFilter(
  ctx: AudioContext,
  soundId: SoundSource
): BiquadFilterNode | null {
  const f = ctx.createBiquadFilter();

  switch (soundId) {
    case 'rain':
      // Heavy rain: white noise through a ~3 kHz lowpass
      f.type = 'lowpass';
      f.frequency.value = 3000;
      f.Q.value = 0.5;
      return f;

    case 'ocean':
      // Ocean waves: brown noise through a deep ~600 Hz lowpass
      f.type = 'lowpass';
      f.frequency.value = 600;
      f.Q.value = 0.7;
      return f;

    case 'stream':
      // Babbling stream: white noise bandpassed around 1.8 kHz
      f.type = 'bandpass';
      f.frequency.value = 1800;
      f.Q.value = 1.5;
      return f;

    case 'forest':
      // Ambient forest: pink noise soft-lowpassed at 1.5 kHz
      f.type = 'lowpass';
      f.frequency.value = 1500;
      f.Q.value = 0.5;
      return f;

    case 'fire':
      // Crackling fire: brown noise through a ~500 Hz lowpass
      f.type = 'lowpass';
      f.frequency.value = 500;
      f.Q.value = 0.3;
      return f;

    case 'cafe':
      // Cafe ambience: pink noise with a peaking cut in the mids
      f.type = 'peaking';
      f.frequency.value = 600;
      f.Q.value = 1.0;
      f.gain.value = -8;
      return f;

    default:
      // No filter for plain noise types
      return null;
  }
}

function binauralFrequencies(soundId: SoundSource): {
  leftHz: number;
  rightHz: number;
} {
  // Carrier tone: 200 Hz (low enough to be comfortable, high enough to be
  // perceived clearly with headphones).
  // Beat frequency = rightHz - leftHz, perceived binaurally.
  switch (soundId) {
    case 'binaural-alpha':
      // Alpha range: 8–12 Hz (spec Section 7.1). Using 10 Hz beat.
      return { leftHz: 200, rightHz: 210 };
    case 'binaural-theta':
      // Theta range: 4–8 Hz (spec Section 7.1). Using 6 Hz beat.
      return { leftHz: 200, rightHz: 206 };
    default:
      return { leftHz: 200, rightHz: 210 };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const audioEngine = AudioEngine.instance;
