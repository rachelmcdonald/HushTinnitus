/**
 * No-op stub for react-native-audio-api.
 *
 * Metro resolves every import of 'react-native-audio-api' (including dynamic
 * import() calls and any subpath) to this file, preventing the library's
 * TurboModule initialisation code from ever running in Expo Go.
 *
 * All classes and singletons match the shape of the real library so that
 * TypeScript-compiled call sites do not crash at runtime — they just produce
 * no sound.
 *
 * REMOVE THE METRO ALIAS WHEN BUILDING WITH EAS FOR PRODUCTION (see
 * metro.config.js). In a production/development build the real native module
 * is available and this file is never loaded.
 */

import { Alert } from 'react-native';

// ─── One-time dev-build notice ────────────────────────────────────────────────

let _alertShown = false;

function notifyDevBuildRequired(): void {
  if (_alertShown) return;
  _alertShown = true;
  // Defer so Alert never fires synchronously during React render.
  setTimeout(() => {
    Alert.alert(
      'Audio available in development build',
      'Audio playback is not available in Expo Go. Use a development build (EAS) to enable sound.'
    );
  }, 0);
}

// ─── AudioParam ───────────────────────────────────────────────────────────────

export class AudioParam {
  value = 0;
  defaultValue = 0;
  minValue = 0;
  maxValue = 3.4e38;
  setValueAtTime(_v: number, _t: number): this { return this; }
  linearRampToValueAtTime(_v: number, _t: number): this { return this; }
  exponentialRampToValueAtTime(_v: number, _t: number): this { return this; }
  setTargetAtTime(_t: number, _st: number, _tc: number): this { return this; }
  setValueCurveAtTime(_v: Float32Array, _st: number, _d: number): this { return this; }
  cancelScheduledValues(_ct: number): this { return this; }
  cancelAndHoldAtTime(_ct: number): this { return this; }
  checkCurveExclusion(): { status: 'success' } { return { status: 'success' }; }
}

// ─── AudioNode ────────────────────────────────────────────────────────────────

export class AudioNode {
  numberOfInputs = 0;
  numberOfOutputs = 1;
  channelCount = 2;
  channelCountMode = 'max';
  channelInterpretation = 'speakers';
  context: any = null;
  connect(_destination: any): void {}
  disconnect(_destination?: any): void {}
}

// ─── AudioScheduledSourceNode ────────────────────────────────────────────────

export class AudioScheduledSourceNode extends AudioNode {
  onEnded = '';
  start(_when?: number): void {}
  stop(_when?: number): void {}
}

// ─── AudioBufferBaseSourceNode ───────────────────────────────────────────────

export class AudioBufferBaseSourceNode extends AudioScheduledSourceNode {
  detune = new AudioParam();
  playbackRate = new AudioParam();
  onPositionChanged = '';
  onPositionChangedInterval = 0;
  getInputLatency(): number { return 0; }
  getOutputLatency(): number { return 0; }
}

// ─── AudioBuffer ─────────────────────────────────────────────────────────────

export class AudioBuffer {
  readonly length: number;
  readonly sampleRate: number;
  readonly duration: number;
  readonly numberOfChannels = 1;

  constructor(options?: any) {
    this.length = options?.length ?? 0;
    this.sampleRate = options?.sampleRate ?? 44100;
    this.duration = this.sampleRate > 0 ? this.length / this.sampleRate : 0;
  }

  getChannelData(_channel: number): Float32Array {
    // Return a zero-length array. fillNoise() iterates data.length which is
    // 0 here, so the loop body never executes — safe no-op.
    return new Float32Array(0);
  }

  copyFromChannel(): void {}
  copyToChannel(): void {}
}

// ─── AudioBufferSourceNode ───────────────────────────────────────────────────

export class AudioBufferSourceNode extends AudioBufferBaseSourceNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  loopSkip = false;
  onLoopEnded = '';
  setBuffer(_buf: AudioBuffer | null): void {}
}

// ─── AudioBufferQueueSourceNode ──────────────────────────────────────────────

export class AudioBufferQueueSourceNode extends AudioBufferBaseSourceNode {
  onBufferEnded = '';
  dequeueBuffer(_id: number): void {}
  clearBuffers(): void {}
  enqueueBuffer(_buf: AudioBuffer): string { return ''; }
  pause(): void {}
}

// ─── AudioDestinationNode ────────────────────────────────────────────────────

export class AudioDestinationNode extends AudioNode {}

// ─── GainNode ────────────────────────────────────────────────────────────────

export class GainNode extends AudioNode {
  gain = new AudioParam();
}

// ─── BiquadFilterNode ────────────────────────────────────────────────────────

export class BiquadFilterNode extends AudioNode {
  type = 'lowpass';
  frequency = new AudioParam();
  detune = new AudioParam();
  Q = new AudioParam();
  gain = new AudioParam();
  getFrequencyResponse(
    _freq: Float32Array,
    _mag: Float32Array,
    _phase: Float32Array
  ): void {}
}

// ─── StereoPannerNode ────────────────────────────────────────────────────────

export class StereoPannerNode extends AudioNode {
  pan = new AudioParam();
}

// ─── OscillatorNode ──────────────────────────────────────────────────────────

export class OscillatorNode extends AudioScheduledSourceNode {
  type = 'sine';
  frequency = new AudioParam();
  detune = new AudioParam();
  setPeriodicWave(_wave: any): void {}
}

// ─── ConstantSourceNode ──────────────────────────────────────────────────────

export class ConstantSourceNode extends AudioScheduledSourceNode {
  offset = new AudioParam();
}

// ─── DelayNode ───────────────────────────────────────────────────────────────

export class DelayNode extends AudioNode {
  delayTime = new AudioParam();
  maxDelayTime = 1;
}

// ─── AnalyserNode ────────────────────────────────────────────────────────────

export class AnalyserNode extends AudioNode {
  fftSize = 2048;
  frequencyBinCount = 1024;
  minDecibels = -100;
  maxDecibels = -30;
  smoothingTimeConstant = 0.8;
  getFloatFrequencyData(_arr: Float32Array): void {}
  getByteFrequencyData(_arr: Uint8Array): void {}
  getFloatTimeDomainData(_arr: Float32Array): void {}
  getByteTimeDomainData(_arr: Uint8Array): void {}
}

// ─── ConvolverNode ───────────────────────────────────────────────────────────

export class ConvolverNode extends AudioNode {
  buffer: AudioBuffer | null = null;
  normalize = false;
  setBuffer(_buf: AudioBuffer | null): void {}
}

// ─── WaveShaperNode ──────────────────────────────────────────────────────────

export class WaveShaperNode extends AudioNode {
  curve: Float32Array | null = null;
  oversample = 'none';
  setCurve(_curve: Float32Array | null): void {}
}

// ─── IIRFilterNode (internal, not directly exported but included for completeness) ──

export class IIRFilterNode extends AudioNode {
  getFrequencyResponse(
    _freq: Float32Array,
    _mag: Float32Array,
    _phase: Float32Array
  ): void {}
}

// ─── PeriodicWave ────────────────────────────────────────────────────────────

export class PeriodicWave {}

// ─── Worklet nodes ────────────────────────────────────────────────────────────

export class WorkletNode extends AudioNode {}
export class WorkletSourceNode extends AudioScheduledSourceNode {}
export class WorkletProcessingNode extends AudioNode {}
export class RecorderAdapterNode extends AudioNode {}
export class StreamerNode extends AudioNode {}

// ─── AudioRecorder ───────────────────────────────────────────────────────────

export class AudioRecorder {
  start(): { status: 'success' } { return { status: 'success' }; }
  stop(): { status: 'success'; paths: string[]; size: number; duration: number } {
    return { status: 'success', paths: [], size: 0, duration: 0 };
  }
  isRecording(): boolean { return false; }
  isPaused(): boolean { return false; }
  enableFileOutput(): { status: 'success' } { return { status: 'success' }; }
  disableFileOutput(): void {}
  pause(): void {}
  resume(): void {}
  connect(_node: any): void {}
  disconnect(): void {}
  setOnAudioReady(): { status: 'success' } { return { status: 'success' }; }
  clearOnAudioReady(): void {}
  setOnError(): void {}
  clearOnError(): void {}
  getCurrentDuration(): number { return 0; }
  getFilePath(): string | null { return null; }
}

// ─── BaseAudioContext ─────────────────────────────────────────────────────────

export class BaseAudioContext {
  readonly sampleRate = 44100;
  readonly currentTime = 0;
  readonly destination: AudioDestinationNode = new AudioDestinationNode();
  readonly state = 'running' as const;
  readonly decoder: any = {
    decodeWithMemoryBlock: async () => new AudioBuffer(),
    decodeWithFilePath: async () => new AudioBuffer(),
    decodeWithPCMInBase64: async () => new AudioBuffer(),
  };
  readonly stretcher: any = {
    changePlaybackSpeed: async (buf: AudioBuffer) => buf,
  };

  createBuffer(
    _numberOfChannels: number,
    length: number,
    sampleRate: number
  ): AudioBuffer {
    return new AudioBuffer({ length, sampleRate });
  }
  createBufferSource(_options?: any): AudioBufferSourceNode {
    return new AudioBufferSourceNode();
  }
  createGain(_options?: any): GainNode { return new GainNode(); }
  createBiquadFilter(_options?: any): BiquadFilterNode { return new BiquadFilterNode(); }
  createStereoPanner(_options?: any): StereoPannerNode { return new StereoPannerNode(); }
  createOscillator(_options?: any): OscillatorNode { return new OscillatorNode(); }
  createDelay(_maxDelay?: number): DelayNode { return new DelayNode(); }
  createAnalyser(_options?: any): AnalyserNode { return new AnalyserNode(); }
  createConvolver(_options?: any): ConvolverNode { return new ConvolverNode(); }
  createWaveShaper(_options?: any): WaveShaperNode { return new WaveShaperNode(); }
  createConstantSource(_options?: any): ConstantSourceNode { return new ConstantSourceNode(); }
  createBufferQueueSource(_options?: any): AudioBufferQueueSourceNode {
    return new AudioBufferQueueSourceNode();
  }
  createIIRFilter(_feedforward: number[], _feedback: number[]): IIRFilterNode {
    return new IIRFilterNode();
  }
  createPeriodicWave(
    _real: Float32Array,
    _imag: Float32Array,
    _disableNormalization?: boolean
  ): PeriodicWave {
    return new PeriodicWave();
  }
  createStreamer(_streamPath: string): StreamerNode | null { return null; }
  createFileSource(_options?: any): null { return null; }
  createRecorderAdapter(): RecorderAdapterNode { return new RecorderAdapterNode(); }
  createWorkletNode(_cb: any, _bufLen: number, _inputChannelCount: number): WorkletNode {
    return new WorkletNode();
  }
  createWorkletProcessingNode(_cb: any): WorkletProcessingNode {
    return new WorkletProcessingNode();
  }
  createWorkletSourceNode(_cb: any): WorkletSourceNode {
    return new WorkletSourceNode();
  }
  decodeAudioData(_input: any): Promise<AudioBuffer> {
    return Promise.resolve(new AudioBuffer());
  }
  decodePCMInBase64(
    _b64: string,
    _inputSampleRate: number,
    _inputChannelCount: number
  ): Promise<AudioBuffer> {
    return Promise.resolve(new AudioBuffer());
  }
}

// ─── AudioContext ─────────────────────────────────────────────────────────────

export class AudioContext extends BaseAudioContext {
  constructor(_options?: any) {
    super();
    notifyDevBuildRequired();
  }
  async close(): Promise<void> {}
  async resume(): Promise<boolean> { return false; }
  async suspend(): Promise<boolean> { return false; }
}

// ─── OfflineAudioContext ──────────────────────────────────────────────────────

export class OfflineAudioContext extends BaseAudioContext {
  constructor(_options?: any) { super(); }
  async resume(): Promise<void> {}
  async suspend(_suspendTime?: number): Promise<void> {}
  async startRendering(): Promise<AudioBuffer> { return new AudioBuffer(); }
}

// ─── AudioManager singleton ───────────────────────────────────────────────────

const _noopSub = { remove: () => {} };

export const AudioManager = {
  getDevicePreferredSampleRate: (): number => 44100,
  setAudioSessionActivity: async (_enabled: boolean): Promise<boolean> => false,
  setAudioSessionOptions: (_options: any): void => {},
  disableSessionManagement: (): void => {},
  observeAudioInterruptions: (_param: any): void => {},
  activelyReclaimSession: (_enabled: boolean): void => {},
  observeVolumeChanges: (_enabled: boolean): void => {},
  addSystemEventListener: (_name: any, _callback: any) => _noopSub,
  requestRecordingPermissions: async (): Promise<string> => 'Undetermined',
  checkRecordingPermissions: async (): Promise<string> => 'Undetermined',
  requestNotificationPermissions: async (): Promise<string> => 'Undetermined',
  checkNotificationPermissions: async (): Promise<string> => 'Undetermined',
  getDevicesInfo: async (): Promise<any> => ({
    availableInputs: [],
    availableOutputs: [],
    currentInputs: [],
    currentOutputs: [],
  }),
  setInputDevice: async (_deviceId: string): Promise<boolean> => false,
} as const;

// ─── PlaybackNotificationManager singleton ────────────────────────────────────

export const PlaybackNotificationManager = {
  show: async (_info: any): Promise<void> => {},
  hide: async (): Promise<void> => {},
  enableControl: async (_control: any, _enabled: boolean): Promise<void> => {},
  isActive: async (): Promise<boolean> => false,
  addEventListener: (_eventName: any, _callback: any) => _noopSub,
} as const;

// ─── RecordingNotificationManager singleton ───────────────────────────────────

export const RecordingNotificationManager = {
  show: async (_info: any): Promise<void> => {},
  hide: async (): Promise<void> => {},
  isActive: async (): Promise<boolean> => false,
  addEventListener: (_eventName: any, _callback: any) => _noopSub,
} as const;

// ─── Utility functions ────────────────────────────────────────────────────────

export async function decodeAudioData(_input: any): Promise<AudioBuffer> {
  return new AudioBuffer();
}
export async function decodePCMInBase64(
  _b64: string,
  _inputSampleRate: number,
  _inputChannelCount: number
): Promise<AudioBuffer> {
  return new AudioBuffer();
}
export async function concatAudioFiles(
  _inputPaths: string[],
  _outputPath: string
): Promise<string> {
  return '';
}
export async function changePlaybackSpeed(
  buffer: AudioBuffer,
  _speed: number
): Promise<AudioBuffer> {
  return buffer;
}

// ─── Error classes ────────────────────────────────────────────────────────────

export class AudioApiError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'AudioApiError';
  }
}
export class IndexSizeError extends AudioApiError {
  constructor(message?: string) { super(message); this.name = 'IndexSizeError'; }
}
export class InvalidAccessError extends AudioApiError {
  constructor(message?: string) { super(message); this.name = 'InvalidAccessError'; }
}
export class InvalidStateError extends AudioApiError {
  constructor(message?: string) { super(message); this.name = 'InvalidStateError'; }
}
// Note: named RangeError to avoid shadowing the built-in global
export class RangeError extends AudioApiError {
  constructor(message?: string) { super(message); this.name = 'RangeError'; }
}
export class NotSupportedError extends AudioApiError {
  constructor(message?: string) { super(message); this.name = 'NotSupportedError'; }
}

// ─── FilePreset and enums ─────────────────────────────────────────────────────

export const FilePreset = {} as const;

export enum FileDirectory { Document = 0, Cache = 1 }
export enum FileFormat { Wav = 0, Caf = 1, M4A = 2, Flac = 3 }
export enum IOSAudioQuality { Min = 0, Low = 1, Medium = 2, High = 3, Max = 4 }
export enum BitDepth { Bit16 = 0, Bit24 = 1, Bit32 = 2 }
export enum FlacCompressionLevel {
  L0=0,L1=1,L2=2,L3=3,L4=4,L5=5,L6=6,L7=7,L8=8
}
export enum AutomationEventType {
  LINEAR_RAMP=0,EXPONENTIAL_RAMP=1,SET_VALUE=2,SET_TARGET=3,SET_VALUE_CURVE=4
}
