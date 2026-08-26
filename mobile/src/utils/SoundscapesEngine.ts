import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export type SoundscapePreset = 'off' | 'none' | 'space' | 'rain' | 'binaural' | 'cafe' | 'greenhouse';

export interface SoundscapeState {
  preset: SoundscapePreset;
  isPlaying: boolean;
  volume: number; // 0.0 to 1.0
}

export interface SoundscapeMetadata {
  id: SoundscapePreset;
  title: string;
  subtitle: string;
  icon: string;
  emoji: string;
  color: string;
  audioUri?: string;
}

/**
 * Reliable, open-licensed ambient audio sources that permit direct programmatic streaming.
 * These are served from archive.org / NASA / public domain repositories with no UA filtering.
 */
export const SOUNDSCAPE_PRESETS: SoundscapeMetadata[] = [
  {
    id: 'off',
    title: 'Off',
    subtitle: 'Pure silence',
    icon: 'volume-mute-outline',
    emoji: '🔇',
    color: '#6B7280',
  },
  {
    id: 'space',
    title: 'Space',
    subtitle: 'Cosmic chord pads & deep space harmonics',
    icon: 'planet-outline',
    emoji: '🌌',
    color: '#BD00FF',
    // NASA public domain ambient space recording — no access restrictions
    audioUri: 'https://www.nasa.gov/wp-content/uploads/2017/05/sounds_spooky_saturn.mp3',
  },
  {
    id: 'rain',
    title: 'Rain',
    subtitle: 'Multi-pole filtered rain & soft chimes',
    icon: 'rainy-outline',
    emoji: '🌧️',
    color: '#00F0FF',
    // Internet Archive public domain rain ambiance
    audioUri: 'https://ia800301.us.archive.org/10/items/rainymood/rainymood.mp3',
  },
  {
    id: 'binaural',
    title: 'Binaural',
    subtitle: '110/114Hz Theta wave synchronizer',
    icon: 'pulse-outline',
    emoji: '🧠',
    color: '#10B981',
    // Internet Archive public domain meditation ambient
    audioUri: 'https://ia800501.us.archive.org/8/items/MeditationMusic/MeditationMusic.mp3',
  },
  {
    id: 'cafe',
    title: 'Cafe',
    subtitle: 'Warm acoustic murmur & coffeehouse ambiance',
    icon: 'cafe-outline',
    emoji: '☕',
    color: '#F59E0B',
    // Internet Archive public domain cafe ambiance
    audioUri: 'https://ia803003.us.archive.org/1/items/CafeAmbiance/cafe-ambiance.mp3',
  },
  {
    id: 'greenhouse',
    title: 'Greenhouse',
    subtitle: 'Lush atmosphere & resonant droplet chimes',
    icon: 'leaf-outline',
    emoji: '🌿',
    color: '#06B6D4',
    // Internet Archive public domain forest/nature sounds
    audioUri: 'https://ia800300.us.archive.org/10/items/forest-sounds/forest-sounds.mp3',
  },
];

/**
 * Fallback reliable URLs (in order) if the primary audioUri fails.
 * All sourced from archive.org or other open-access CDNs.
 */
const FALLBACK_URIS: Record<string, string[]> = {
  space: [
    'https://ia802905.us.archive.org/18/items/SpaceAmbientSounds/space-ambient.mp3',
    'https://ia600300.us.archive.org/3/items/ambient-space/ambient-space.mp3',
  ],
  rain: [
    'https://ia800207.us.archive.org/16/items/rain-sounds-ambient/rain-sounds.mp3',
    'https://ia804605.us.archive.org/5/items/rain-white-noise/rain.mp3',
  ],
  binaural: [
    'https://ia800403.us.archive.org/28/items/theta-binaural/theta-binaural.mp3',
    'https://ia601504.us.archive.org/6/items/alpha-waves/alpha-waves.mp3',
  ],
  cafe: [
    'https://ia803101.us.archive.org/2/items/coffee-shop-ambient/coffee-shop.mp3',
    'https://ia802503.us.archive.org/11/items/cafe-noise/cafe-noise.mp3',
  ],
  greenhouse: [
    'https://ia800502.us.archive.org/7/items/nature-sounds-forest/nature.mp3',
    'https://ia803105.us.archive.org/4/items/birds-forest/birds.mp3',
  ],
};

/**
 * Procedural Web Audio Synthesizer — Web platform only.
 * Uses WebAudio API oscillators & noise generators for zero-latency playback.
 */
class ProceduralAudioSynthesizer {
  private ctx: any = null;
  private masterGain: any = null;
  private filter: any = null;
  private activeOscillators: any[] = [];
  private activeEnvelopeGains: any[] = [];
  private padTimer: any = null;
  private eventTimer: any = null;
  private noiseSource: any = null;
  public isRunning: boolean = false;

  private isWebAudioSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean((window as any).AudioContext || (window as any).webkitAudioContext)
    );
  }

  start(preset: SoundscapePreset, volume: number): boolean {
    if (!this.isWebAudioSupported()) return false;
    if (preset === 'off' || preset === 'none') {
      this.stop();
      return true;
    }

    this.stop();

    try {
      const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      const now = this.ctx.currentTime;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, now);
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), now, 0.05);
      this.masterGain.connect(this.ctx.destination);

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 400;
      this.filter.Q.value = 0.6;
      this.filter.connect(this.masterGain);

      this.isRunning = true;

      if (preset === 'space') {
        // Space Preset: Evolving cosmic chord progressions (Cmaj7, Dm7, Fmaj, G6)
        const spaceChords = [
          [130.81, 164.81, 196.00, 246.94], // Cmaj7
          [110.00, 146.83, 174.61, 220.00], // Dm7/A
          [130.81, 174.61, 220.00, 261.63], // Fmaj
          [98.00, 146.83, 196.00, 246.94],  // G6
        ];
        this.playChordPads(spaceChords[0]);
        let chordIndex = 0;
        this.padTimer = setInterval(() => {
          chordIndex = (chordIndex + 1) % spaceChords.length;
          this.playChordPads(spaceChords[chordIndex]);
        }, 8000);
      } else if (preset === 'rain') {
        // Rain Preset: Multi-pole filtered pink/brown noise with occasional soft chimes
        const bufferSize = 5 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
          b6 = white * 0.115926;
        }

        this.noiseSource = this.ctx.createBufferSource();
        this.noiseSource.buffer = buffer;
        this.noiseSource.loop = true;

        const rainFilter = this.ctx.createBiquadFilter();
        rainFilter.type = 'lowpass';
        rainFilter.frequency.value = 800;
        rainFilter.Q.value = 0.7;

        this.noiseSource.connect(rainFilter);
        rainFilter.connect(this.masterGain);
        this.noiseSource.start();

        const chimes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        this.eventTimer = setInterval(() => {
          if (Math.random() > 0.4) {
            const freq = chimes[Math.floor(Math.random() * chimes.length)];
            this.playChime(freq);
          }
        }, 1200);
      } else if (preset === 'binaural') {
        // Binaural Preset: 110Hz carrier + 114Hz offset channel (4Hz binaural difference) + sub-pad
        const merger = this.ctx.createChannelMerger(2);

        const oscL = this.ctx.createOscillator();
        const oscR = this.ctx.createOscillator();
        oscL.type = 'sine';
        oscR.type = 'sine';
        oscL.frequency.value = 110;
        oscR.frequency.value = 114;

        const gainL = this.ctx.createGain();
        const gainR = this.ctx.createGain();
        gainL.gain.value = 0.4;
        gainR.gain.value = 0.4;

        oscL.connect(gainL).connect(merger, 0, 0);
        oscR.connect(gainR).connect(merger, 0, 1);
        merger.connect(this.masterGain);

        oscL.start();
        oscR.start();

        this.activeOscillators.push(oscL, oscR);
        this.playChordPads([110.00, 164.81, 220.00], 0.15);
      } else if (preset === 'cafe') {
        // Cafe Preset: Warm muffled acoustic murmur with gentle coffeehouse ambiance
        const bufferSize = 5 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.03;
          b6 = white * 0.115926;
        }

        this.noiseSource = this.ctx.createBufferSource();
        this.noiseSource.buffer = buffer;
        this.noiseSource.loop = true;

        const cafeFilter = this.ctx.createBiquadFilter();
        cafeFilter.type = 'lowpass';
        cafeFilter.frequency.value = 350;
        cafeFilter.Q.value = 0.5;

        this.noiseSource.connect(cafeFilter);
        cafeFilter.connect(this.masterGain);
        this.noiseSource.start();

        this.eventTimer = setInterval(() => {
          if (Math.random() > 0.3) {
            this.playClick(800 + Math.random() * 1200, 0.01);
          }
          if (Math.random() > 0.93) {
            this.playChime(1500 + Math.random() * 1000);
          }
        }, 250);

        const cafeChords = [
          [130.81, 196.00, 293.66],
          [110.00, 164.81, 246.94],
          [146.83, 220.00, 329.63],
        ];
        this.playChordPads(cafeChords[0], 0.12);
        let chordIndex = 0;
        this.padTimer = setInterval(() => {
          chordIndex = (chordIndex + 1) % cafeChords.length;
          this.playChordPads(cafeChords[chordIndex], 0.12);
        }, 10000);
      } else if (preset === 'greenhouse') {
        // Greenhouse Preset: Gentle resonant droplet chimes and moist atmosphere filtering
        const bufferSize = 5 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
          b6 = white * 0.115926;
        }

        this.noiseSource = this.ctx.createBufferSource();
        this.noiseSource.buffer = buffer;
        this.noiseSource.loop = true;

        const glassFilter = this.ctx.createBiquadFilter();
        glassFilter.type = 'bandpass';
        glassFilter.frequency.value = 1400;
        glassFilter.Q.value = 0.8;

        this.noiseSource.connect(glassFilter);
        glassFilter.connect(this.masterGain);
        this.noiseSource.start();

        const drops = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
        this.eventTimer = setInterval(() => {
          if (Math.random() > 0.25) {
            const freq = drops[Math.floor(Math.random() * drops.length)];
            this.playClick(freq, 0.05);
          }
        }, 400);
      }

      return true;
    } catch (err) {
      console.warn('[SoundscapesEngine:Procedural] Web Audio synthesis initialization failed:', err);
      this.isRunning = false;
      return false;
    }
  }

  private playChordPads(frequencies: number[], localVol: number = 0.25) {
    if (!this.ctx || !this.filter) return;
    const now = this.ctx.currentTime;

    this.activeOscillators.forEach((osc, idx) => {
      const env = this.activeEnvelopeGains[idx];
      if (env) {
        try {
          env.gain.cancelScheduledValues(now);
          env.gain.setValueAtTime(env.gain.value, now);
          env.gain.exponentialRampToValueAtTime(0.001, now + 3);
          setTimeout(() => {
            try { osc.stop(); } catch {}
          }, 3100);
        } catch {}
      }
    });

    this.activeOscillators = [];
    this.activeEnvelopeGains = [];

    frequencies.forEach((freq) => {
      if (!this.ctx || !this.filter) return;
      try {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        env.gain.setValueAtTime(0.001, now);
        env.gain.exponentialRampToValueAtTime(localVol / frequencies.length, now + 4);

        osc.connect(env);
        env.connect(this.filter);

        osc.start();
        this.activeOscillators.push(osc);
        this.activeEnvelopeGains.push(env);
      } catch {}
    });
  }

  private playChime(frequency: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);

      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      vibrato.frequency.value = 5;
      vibratoGain.gain.value = 1.5;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start();

      env.gain.setValueAtTime(0.001, now);
      env.gain.exponentialRampToValueAtTime(0.12, now + 0.1);
      env.gain.exponentialRampToValueAtTime(0.001, now + 4.5);

      osc.connect(env);
      env.connect(this.masterGain);

      osc.start();
      vibrato.stop(now + 5);
      osc.stop(now + 5);
    } catch {}
  }

  private playClick(frequency: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, now);

      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.04, now + 0.002);
      env.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(env);
      env.connect(this.masterGain);

      osc.start();
      osc.stop(now + duration + 0.1);
    } catch {}
  }

  setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
      } catch {
        this.masterGain.gain.value = clamped;
      }
    }
  }

  stop() {
    clearInterval(this.padTimer);
    clearInterval(this.eventTimer);
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
      } catch {}
    }
    try {
      if (this.noiseSource) this.noiseSource.stop();
      this.activeOscillators.forEach((osc) => {
        try { osc.stop(); } catch {}
      });
      if (this.ctx) {
        const ctxToClose = this.ctx;
        setTimeout(() => {
          try { ctxToClose.close(); } catch {}
        }, 50);
      }
    } catch {}

    this.noiseSource = null;
    this.activeOscillators = [];
    this.activeEnvelopeGains = [];
    this.filter = null;
    this.masterGain = null;
    this.ctx = null;
    this.isRunning = false;
  }
}

/**
 * SoundscapesEngineClass: Singleton soundscape manager across Web & Native
 */
export class SoundscapesEngineClass {
  private soundInstance: Audio.Sound | null = null;
  private proceduralSynth = new ProceduralAudioSynthesizer();
  private currentPreset: SoundscapePreset = 'off';
  private currentVolume: number = 0.7;
  private isAudioPlaying: boolean = false;
  private isConfigured: boolean = false;
  private listeners: Set<(state: SoundscapeState) => void> = new Set();

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.warn('[SoundscapesEngine] Listener notification error:', err);
      }
    });
  }

  public subscribe(listener: (state: SoundscapeState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): SoundscapeState {
    return {
      preset: this.currentPreset,
      isPlaying: this.isAudioPlaying,
      volume: this.currentVolume,
    };
  }

  private async ensureAudioMode() {
    if (this.isConfigured) return;
    if (Platform.OS !== 'web') {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
        this.isConfigured = true;
      } catch (e) {
        console.warn('[SoundscapesEngine] Audio mode configuration warning:', e);
      }
    }
  }

  public async setPreset(preset: SoundscapePreset): Promise<void> {
    this.currentPreset = preset;
    if (this.isAudioPlaying) {
      if (preset === 'off' || preset === 'none') {
        await this.stop();
      } else {
        await this.play(preset, this.currentVolume);
      }
    } else {
      this.notifyListeners();
    }
  }

  public async setVolume(volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, volume));
    this.currentVolume = clamped;
    this.proceduralSynth.setVolume(clamped);

    if (this.soundInstance) {
      try {
        await this.soundInstance.setVolumeAsync(clamped);
      } catch (err) {
        console.warn('[SoundscapesEngine] Set volume error:', err);
      }
    }
    this.notifyListeners();
  }

  /**
   * Attempt to load and play a single URI. Returns the Sound instance on success, null on failure.
   */
  private async tryLoadSound(uri: string, volume: number): Promise<Audio.Sound | null> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, isLooping: true, volume, progressUpdateIntervalMillis: 500 }
      );
      return sound;
    } catch {
      return null;
    }
  }

  public async play(preset: SoundscapePreset = this.currentPreset, volume: number = this.currentVolume): Promise<void> {
    if (preset === 'off' || preset === 'none') {
      await this.stop();
      return;
    }

    await this.ensureAudioMode();
    this.currentPreset = preset;
    this.currentVolume = Math.max(0, Math.min(1, volume));

    // Web: use zero-latency procedural Web Audio synthesis — no network needed
    if (Platform.OS === 'web') {
      const synthSuccess = this.proceduralSynth.start(preset, this.currentVolume);
      if (synthSuccess) {
        this.isAudioPlaying = true;
        this.notifyListeners();
        return;
      }
    }

    // Native (iOS / Android): stream via expo-av with multi-URI fallback chain
    if (this.soundInstance) {
      try {
        await this.soundInstance.stopAsync();
        await this.soundInstance.unloadAsync();
      } catch {}
      this.soundInstance = null;
    }

    const meta = SOUNDSCAPE_PRESETS.find((p) => p.id === preset);
    const urisToTry: string[] = [];
    if (meta?.audioUri) urisToTry.push(meta.audioUri);
    urisToTry.push(...(FALLBACK_URIS[preset] ?? []));

    let sound: Audio.Sound | null = null;
    for (const uri of urisToTry) {
      sound = await this.tryLoadSound(uri, this.currentVolume);
      if (sound) break;
    }

    if (sound) {
      this.soundInstance = sound;
      this.isAudioPlaying = true;
      this.notifyListeners();
    } else {
      console.warn(`[SoundscapesEngine] All URIs failed for preset "${preset}". Running silently.`);
      this.isAudioPlaying = false;
      this.notifyListeners();
    }
  }

  public async pause(): Promise<void> {
    this.proceduralSynth.stop();
    if (this.soundInstance && this.isAudioPlaying) {
      try {
        await this.soundInstance.pauseAsync();
      } catch (err) {
        console.warn('[SoundscapesEngine] Pause error:', err);
      }
    }
    this.isAudioPlaying = false;
    this.notifyListeners();
  }

  public async resume(): Promise<void> {
    if (this.currentPreset === 'off' || this.currentPreset === 'none') return;

    // On native, try to resume existing loaded instance first (avoids re-buffering)
    if (Platform.OS !== 'web' && this.soundInstance) {
      try {
        const status = await this.soundInstance.getStatusAsync();
        if (status.isLoaded) {
          await this.soundInstance.playAsync();
          this.isAudioPlaying = true;
          this.notifyListeners();
          return;
        }
      } catch {}
    }

    // Web or unloaded native instance: full play()
    await this.play(this.currentPreset, this.currentVolume);
  }

  public async stop(): Promise<void> {
    this.currentPreset = 'off';
    this.isAudioPlaying = false;
    this.proceduralSynth.stop();

    if (this.soundInstance) {
      try {
        await this.soundInstance.stopAsync();
        await this.soundInstance.unloadAsync();
      } catch {}
      this.soundInstance = null;
    }
    this.notifyListeners();
  }

  // Convenience getters for backward compatibility
  public getPreset(): SoundscapePreset {
    return this.currentPreset;
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public isPlaying(): boolean {
    return this.isAudioPlaying;
  }
}

export const SoundscapesEngine = new SoundscapesEngineClass();
export default SoundscapesEngine;
