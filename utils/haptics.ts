/**
 * 4-Tier Tactile & Haptic Engine for Web ("Native Plus" Feel).
 * Combines Web Vibration API with ultra-low-latency synthesized micro-acoustic transients
 * via Web Audio API to deliver crisp tactile feedback across mobile (iOS Safari, Android) and desktop browsers.
 */

class TactileFeedbackEngine {
    private audioCtx: AudioContext | null = null

    private getAudioContext(): AudioContext | null {
        if (typeof window === 'undefined') return null
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass()
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {})
        }
        return this.audioCtx
    }

    private isEnabled(): boolean {
        if (typeof window === 'undefined') return false
        return localStorage.getItem('lifepivot_haptics') !== 'false'
    }

    private playMicroSound(freq: number, duration: number, gainVal: number, type: OscillatorType = 'sine', endFreqRatio: number = 0.5) {
        if (!this.isEnabled()) return
        const ctx = this.getAudioContext()
        if (!ctx) return
        try {
            const now = ctx.currentTime
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            osc.type = type
            osc.frequency.setValueAtTime(freq, now)
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * endFreqRatio), now + duration)

            gain.gain.setValueAtTime(gainVal, now)
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.start(now)
            osc.stop(now + duration)
        } catch {
            // Non-critical audio feedback fallback
        }
    }

    private vibrate(pattern: number | number[]) {
        if (!this.isEnabled()) return
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(pattern)
            } catch {
                // Ignore unsupported vibration errors
            }
        }
    }

    // ── Tier 1: Subtle Navigation & Discrete Touch ─────────────────────────
    tier1 = {
        selection: () => this.selection(),
        tick: () => this.tick(),
        light: () => this.light(),
    }

    // ── Tier 2: Meaningful Actions & State Changes ─────────────────────────
    tier2 = {
        medium: () => this.medium(),
        toggle: () => this.toggle(),
        action: () => this.action(),
    }

    // ── Tier 3: Milestones, Level-Ups & Rewards ────────────────────────────
    tier3 = {
        success: () => this.success(),
        heavy: () => this.heavy(),
        celebrate: () => this.celebrate(),
    }

    // ── Tier 4: Critical Warnings, Locks & Errors ──────────────────────────
    tier4 = {
        warning: () => this.warning(),
        error: () => this.error(),
        lock: () => this.lock(),
    }

    // ── Direct Methods / Backward Compatibility Aliases ───────────────────

    /**
     * Tier 1: Selection (Tab switches, date pills, discrete touch)
     */
    selection() {
        this.vibrate(8)
        this.playMicroSound(900, 0.012, 0.025, 'triangle', 0.6)
    }

    /**
     * Tier 1: Subtle Tick (Swipe threshold, counter increment, slider)
     */
    tick() {
        this.vibrate(10)
        this.playMicroSound(1000, 0.012, 0.025, 'triangle', 0.5)
    }

    /**
     * Tier 1: Light (Subtask checkbox, quick touch)
     */
    light() {
        this.vibrate(10)
        this.playMicroSound(800, 0.015, 0.03, 'triangle', 0.5)
    }

    /**
     * Tier 2: Medium / Action (Modal open/close, navigation, card trigger)
     */
    medium() {
        this.vibrate(22)
        this.playMicroSound(440, 0.035, 0.05, 'triangle', 0.5)
    }

    /**
     * Tier 2: Toggle (Switch on/off, filter select)
     */
    toggle() {
        this.medium()
    }

    /**
     * Tier 2: Action (Primary button tap, timer start/stop)
     */
    action() {
        this.vibrate(25)
        this.playMicroSound(480, 0.03, 0.05, 'sine', 0.5)
    }

    /**
     * Tier 3: Heavy (Impact, heavy state transition)
     */
    heavy() {
        this.vibrate(35)
        this.playMicroSound(220, 0.05, 0.07, 'sine', 0.4)
    }

    /**
     * Tier 3: Success (Task completed, item purchased, milestone achieved)
     */
    success() {
        this.vibrate([15, 30, 25])
        if (!this.isEnabled()) return
        const ctx = this.getAudioContext()
        if (!ctx) return
        try {
            const now = ctx.currentTime
            const chords = [523.25, 659.25, 783.99] // C5, E5, G5
            chords.forEach((freq, idx) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = 'sine'
                osc.frequency.setValueAtTime(freq, now + idx * 0.04)
                gain.gain.setValueAtTime(0.04, now + idx * 0.04)
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.28)
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start(now + idx * 0.04)
                osc.stop(now + idx * 0.04 + 0.28)
            })
        } catch {
            // safely handled
        }
    }

    /**
     * Tier 3: Celebrate (Rewarded ad claim, all daily quests complete, major level up)
     */
    celebrate() {
        this.vibrate([15, 30, 25, 40])
        if (!this.isEnabled()) return
        const ctx = this.getAudioContext()
        if (!ctx) return
        try {
            const now = ctx.currentTime
            const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = 'sine'
                osc.frequency.setValueAtTime(freq, now + idx * 0.045)
                gain.gain.setValueAtTime(0.05, now + idx * 0.045)
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.35)
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start(now + idx * 0.045)
                osc.stop(now + idx * 0.045 + 0.35)
            })
            // Subtle resonant sub-pulse
            const subOsc = ctx.createOscillator()
            const subGain = ctx.createGain()
            subOsc.type = 'triangle'
            subOsc.frequency.setValueAtTime(80, now)
            subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.25)
            subGain.gain.setValueAtTime(0.06, now)
            subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
            subOsc.connect(subGain)
            subGain.connect(ctx.destination)
            subOsc.start(now)
            subOsc.stop(now + 0.25)
        } catch {
            // safely handled
        }
    }

    /**
     * Tier 4: Warning (Cooldown active, discard confirmation, soft alert)
     */
    warning() {
        this.vibrate([25, 30, 25])
        this.playMicroSound(320, 0.08, 0.06, 'triangle', 0.75)
    }

    /**
     * Tier 4: Error (Validation failure, insufficient tokens, network failure)
     */
    error() {
        this.vibrate([30, 50, 30])
        this.playMicroSound(160, 0.12, 0.08, 'sawtooth', 0.6)
    }

    /**
     * Tier 4: Lock (Gated feature, locked day with unfinished predecessors)
     */
    lock() {
        this.vibrate([10, 20, 10])
        if (!this.isEnabled()) return
        const ctx = this.getAudioContext()
        if (!ctx) return
        try {
            const now = ctx.currentTime
            ;[0, 0.04].forEach((delay) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = 'triangle'
                osc.frequency.setValueAtTime(800, now + delay)
                osc.frequency.exponentialRampToValueAtTime(300, now + delay + 0.015)
                gain.gain.setValueAtTime(0.04, now + delay)
                gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.015)
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start(now + delay)
                osc.stop(now + delay + 0.015)
            })
        } catch {}
    }
}

export const haptics = new TactileFeedbackEngine()
export default haptics
