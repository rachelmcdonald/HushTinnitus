// Named imports from the main package entry — do not use deep import paths.
// react-native-audio-api ships a web shim so no Platform guards are needed here.
import { AudioContext, AudioBufferSourceNode, GainNode } from 'react-native-audio-api';
import { fillNoise, NoiseType } from './noiseGenerators';

// Buffer length in seconds — long enough to avoid audible loop seams.
const BUFFER_SECONDS = 10;

// Default output gain — comfortable listening level.
const DEFAULT_GAIN = 0.7;

class AudioEngine {
  private static _instance: AudioEngine | null = null;

  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private _currentNoise: NoiseType | null = null;

  private constructor() {}

  static get instance(): AudioEngine {
    if (!AudioEngine._instance) {
      AudioEngine._instance = new AudioEngine();
    }
    return AudioEngine._instance;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  get currentNoise(): NoiseType | null {
    return this._currentNoise;
  }

  get isPlaying(): boolean {
    return this._currentNoise !== null;
  }

  play(noiseType: NoiseType, volume: number = DEFAULT_GAIN): void {
    // Stop whatever is currently playing before starting a new sound.
    this.stop();

    const ctx = this.getContext();

    // Build a pre-computed noise buffer and loop it.
    const bufferLength = Math.floor(ctx.sampleRate * BUFFER_SECONDS);
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    fillNoise(buffer.getChannelData(0), noiseType);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    this.source = src;
    this.gainNode = gain;
    this._currentNoise = noiseType;
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch {
        // Source may already be stopped or context closed.
      }
      this.source = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }
    this._currentNoise = null;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx!;
  }
}

// Single shared instance — persists across tab navigation.
export const audioEngine = AudioEngine.instance;
export type { NoiseType };
