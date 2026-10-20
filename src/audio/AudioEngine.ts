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

// ─── Audio focus ──────────────────────────────────────────────────────────────
// Requested on the first play rather than at launch, so opening the app never
// interrupts other audio. Android only: observeAudioInterruptions('gain')
// requests AUDIOFOCUS_GAIN. iOS needs no call — the 'playback' session category
// interrupts other audio when the context is resumed.
// Requested on every play (not just the first) so Hush reclaims focus if
// another app (e.g. Spotify) took it in the meantime.

function requestAudioFocus(api: any): void {
  if (Platform.OS !== 'android') return;
  try {
    api.AudioManager.observeAudioInterruptions('gain');
    console.log('[AudioEngine] audio focus requested');
  } catch (err) {
    console.error('[AudioEngine] requestAudioFocus FAILED:', err);
  }
}

// ─── Asset caches ─────────────────────────────────────────────────────────────
// Populated lazily, one sound at a time — by play() or by preloadSound() when
// the user scrolls to a card. Nothing is loaded on Sound tab mount: decoding
// all ~19 MB of MP3s at once starved the decode of the sound actually tapped.
// _assetUriCache: skips downloadAsync on subsequent plays.
// _decodedBufferCache: skips fetch + decodeAudioData — play is instant on hit.
// _bufferLoads: in-flight loads, so play() joins a running preload instead of
// starting a second, competing decode of the same file.
const _assetUriCache = new Map<string, string>();
const _decodedBufferCache = new Map<string, any>(); // value: AudioBuffer
const _bufferLoads = new Map<string, Promise<any>>(); // value: Promise<AudioBuffer>

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
  private _warmupPromise: Promise<void> | null = null;
  // Incremented by every play() and stop(). A _doPlay whose generation is no
  // longer current (the user tapped another sound or stopped while its file was
  // still loading) must not start its source — nothing would ever stop it.
  private _playGeneration = 0;

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

  // Loads the native module and creates the AudioContext without playing
  // anything, so the first tap doesn't pay that cost. Called on Sound tab mount.
  // Deliberately does NOT resume(): starting the context activates the iOS
  // audio session (category 'playback', no mixWithOthers), which would stop
  // Spotify etc. just by opening the tab. _doPlay() resumes on the user's tap.
  // Idempotent — concurrent and repeat calls share one promise. Never rejects.
  warmup(): Promise<void> {
    if (!this._warmupPromise) {
      this._warmupPromise = this._doWarmup();
    }
    return this._warmupPromise;
  }

  private async _doWarmup(): Promise<void> {
    if (Platform.OS === 'web') return;
    const api = await loadApi();
    if (!api) return;
    try {
      if (!this.ctx) {
        this.ctx = new api.AudioContext();
      }
      console.log('[AudioEngine] warmup complete | ctx.state:', this.ctx.state);
    } catch (err) {
      console.error('[AudioEngine] warmup FAILED:', err);
    }
  }

  // play() starts the async work immediately; callers that don't care can ignore
  // the result. It resolves true once the sound's source has actually started
  // (i.e. audio is audible), false if playback failed or was superseded by a
  // later play()/stop() — used by the UI to show a loading state until then.
  play(soundId: SoundSource, volume: number = DEFAULT_GAIN): Promise<boolean> {
    this._volume = volume;
    return this._doPlay(soundId, volume, ++this._playGeneration);
  }

  private async _doPlay(soundId: SoundSource, volume: number, generation: number): Promise<boolean> {
    const api = await loadApi();
    if (!api) {
      Alert.alert(
        'Audio unavailable',
        'Audio playback requires a development build. Expo Go does not support native audio.'
      );
      return false;
    }

    this.clearNodes();

    // Create / reuse AudioContext (a no-op if the Sound tab already warmed up).
    await this.warmup();
    if (!this.ctx) {
      this.ctx = new api.AudioContext();
    }

    // warmup() leaves the context suspended (it's also suspended after pause()).
    // Resuming here, on the user's tap, is what activates the audio session /
    // starts output. Buffer-based sounds silently queue audio that never plays
    // until resumed, so resume before building any nodes.
    requestAudioFocus(api);
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }

    if (generation !== this._playGeneration) return false; // superseded during warmup/resume

    console.log('[AudioEngine] play:', soundId, '| ctx.state:', this.ctx.state);

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    // Route: gain → [notch filter?] → destination
    if (this._notchedFrequencyHz !== null) {
      const notch = this.ctx.createBiquadFilter();
      notch.type = 'notch';
      notch.frequency.value = this._notchedFrequencyHz;
      notch.Q.value = 1.4; // One-octave wide notch per Okamoto et al. 2010
      notch.gain.value = -40; // Deep attenuation so the notch is perceptible
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
      } else if (AudioEngine.isFileBased(soundId)) {
        await this.buildFileNodes(soundId, gain, generation);
      } else {
        this.buildBufferNodes(soundId, gain);
      }
    } catch (err) {
      console.error('[AudioEngine] buildNodes failed for', soundId, err);
      // Only tear down if this play is still current — otherwise clearNodes()
      // would stop the sound the user has since switched to.
      if (generation === this._playGeneration) this.clearNodes();
      return false;
    }

    if (generation !== this._playGeneration) return false; // superseded while loading

    this._currentSound = soundId;
    this._sessionStartTime = Date.now();
    return true;
  }

  stop(): void {
    this._playGeneration++;
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
    // Re-request focus: if we were paused because another app took it, resuming
    // without it would play underneath that app.
    const api = await loadApi();
    if (api) requestAudioFocus(api);
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

  // Downloads and decodes ONE file-based sound in the background so a later
  // tap on it is instant. Called when the user scrolls to that sound's card.
  // No-op for synthesised/binaural sounds and for sounds already loaded/loading.
  preloadSound(soundId: SoundSource): void {
    if (Platform.OS === 'web' || !AudioEngine.isFileBased(soundId)) return;
    this.warmup()
      .then(() => { if (this.ctx) return this.loadFileBuffer(soundId); })
      .catch((err) => console.error('[AudioEngine] preloadSound failed for', soundId, err));
  }

  static isFileBased(soundId: SoundSource): boolean {
    return soundId in AudioEngine.NOISE_MODULES;
  }

  // Returns the decoded AudioBuffer for a file-based sound, loading it at most
  // once: cached buffer → in-flight load → new download + decode.
  private loadFileBuffer(soundId: SoundSource): Promise<any> {
    const cached = _decodedBufferCache.get(soundId);
    if (cached) return Promise.resolve(cached);

    let load = _bufferLoads.get(soundId);
    if (!load) {
      load = (async () => {
        const t0 = Date.now();
        let localUri = _assetUriCache.get(soundId);
        if (!localUri) {
          const { Asset } = await import('expo-asset');
          const asset = Asset.fromModule(AudioEngine.NOISE_MODULES[soundId]);
          await asset.downloadAsync();
          localUri = asset.localUri!;
          _assetUriCache.set(soundId, localUri);
        }
        const response = await fetch(localUri);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        _decodedBufferCache.set(soundId, audioBuffer);
        console.log('[AudioEngine] loaded', soundId, 'in', Date.now() - t0, 'ms');
        return audioBuffer;
      })().finally(() => { _bufferLoads.delete(soundId); });
      _bufferLoads.set(soundId, load);
    }
    return load;
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

    console.log(
      `[AudioEngine] binaural: ${soundId} | left: ${leftHz} Hz | right: ${rightHz} Hz | beat: ${rightHz - leftHz} Hz`
    );

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
  // Pre-generated MP3s (ffmpeg anoisesrc — mathematically accurate spectral
  // profile) replace synthesised noise, which was perceptually indistinct on
  // device. cafe-ambience.mp3 is CC0 (The Designer's Choice collection via
  // archive.org). All play as looping buffers. All were trimmed to 30 s loops
  // (from 60 s noise / ~2–3 min nature + cafe) so a first play decodes fast.

  private static readonly NOISE_MODULES: Record<string, any> = {
    'white-noise': require('@/assets/sounds/white-noise.mp3'),
    'pink-noise':  require('@/assets/sounds/pink-noise.mp3'),
    'brown-noise': require('@/assets/sounds/brown-noise.mp3'),
    'rain':        require('@/assets/sounds/rain.mp3'),
    'ocean':       require('@/assets/sounds/ocean-waves.mp3'),
    'stream':      require('@/assets/sounds/stream.mp3'),
    'forest':      require('@/assets/sounds/forest.mp3'),
    'fire':        require('@/assets/sounds/fire.mp3'),
    'cafe':        require('@/assets/sounds/cafe-ambience.mp3'),
  };

  // All file-based sounds are 32 s: [loop 29–30 s][30 s loop][loop 0–1 s], built
  // with a 2 s equal-power crossfade so the loop has no seam. Looping the
  // [1 s, 31 s] window (rather than the whole buffer) skips the MP3 encoder
  // delay/padding — the app's MP3 decoder doesn't strip it, and it would
  // otherwise be an audible ~25–50 ms dropout every loop. Because the file's
  // content repeats with a 30 s period, the window stays seamless even though
  // that encoder delay shifts it slightly.
  private static readonly LOOP_REGIONS: Partial<Record<SoundSource, [number, number]>> = {
    'white-noise': [1, 31],
    'pink-noise':  [1, 31],
    'brown-noise': [1, 31],
    'rain':   [1, 31],
    'ocean':  [1, 31],
    'stream': [1, 31],
    'forest': [1, 31],
    'fire':   [1, 31],
    'cafe':   [1, 31],
  };

  private async buildFileNodes(soundId: SoundSource, gain: any, generation: number): Promise<void> {
    const audioBuffer = await this.loadFileBuffer(soundId);
    if (generation !== this._playGeneration) return; // superseded while loading
    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(gain);
    const region = AudioEngine.LOOP_REGIONS[soundId];
    if (region) {
      source.loopStart = region[0];
      source.loopEnd = region[1];
      source.start(0, region[0]);
    } else {
      source.start();
    }
    this.activeSource = source;
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  private clearNodes(): void {
    if (this.activeSource) {
      try { this.activeSource.stop(0); } catch {}
      try { this.activeSource.disconnect(); } catch {}
      this.activeSource = null;
    }

    for (const osc of this.activeOscillators) {
      try { osc.stop(0); } catch {}
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
  return 'white';
}

function buildFilter(ctx: any, soundId: SoundSource): any {
  return null;
}

function binauralFrequencies(soundId: SoundSource): { leftHz: number; rightHz: number } {
  switch (soundId) {
    // Alpha (8–12 Hz range): 10 Hz beat, carrier centred ~205 Hz
    case 'binaural-alpha': return { leftHz: 200, rightHz: 210 };
    // Theta (4–8 Hz range): 6 Hz beat, carrier centred ~197 Hz
    // Left channel uses 194 Hz (not 200 Hz) so the two sounds have distinct
    // pitches and are perceptible even without headphones.
    case 'binaural-theta': return { leftHz: 194, rightHz: 200 };
    default:               return { leftHz: 200, rightHz: 210 };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const audioEngine = AudioEngine.instance;
