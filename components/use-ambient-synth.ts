'use client'

import { useRef, useEffect, useState } from 'react'

export type SoundType = 'none' | 'space' | 'rain' | 'binaural' | 'cafe' | 'greenhouse'

class AmbientSynth {
    private ctx: AudioContext | null = null
    private filter: BiquadFilterNode | null = null
    private gain: GainNode | null = null
    private oscillators: OscillatorNode[] = []
    private envelopeGains: GainNode[] = []
    private timerId: any = null
    private rainTimerId: any = null
    private noiseNode: AudioBufferSourceNode | null = null
    public isPlaying: boolean = false

    start(type: SoundType, volume: number) {
        if (this.isPlaying) this.stop()
        if (type === 'none') return

        if (typeof window === 'undefined') return

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) return

        this.ctx = new AudioContextClass()
        this.gain = this.ctx.createGain()
        this.gain.gain.value = volume
        this.gain.connect(this.ctx.destination)

        this.filter = this.ctx.createBiquadFilter()
        this.filter.type = 'lowpass'
        this.filter.frequency.value = 400 // Warm and muffled
        this.filter.connect(this.gain)

        this.isPlaying = true

        if (type === 'space') {
            this.playPads([130.81, 164.81, 196.00, 246.94]) // Cmaj7
            let chordIdx = 0
            const chords = [
                [130.81, 164.81, 196.00, 246.94], // Cmaj7
                [110.00, 146.83, 174.61, 220.00], // Dm7/A
                [130.81, 174.61, 220.00, 261.63], // Fmaj
                [98.00, 146.83, 196.00, 246.94]   // G6
            ]
            this.timerId = setInterval(() => {
                chordIdx = (chordIdx + 1) % chords.length
                this.playPads(chords[chordIdx])
            }, 8000)
        } else if (type === 'rain') {
            const bufferSize = 5 * this.ctx.sampleRate
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
            const data = buffer.getChannelData(0)
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1
                b0 = 0.99886 * b0 + white * 0.0555179
                b1 = 0.99332 * b1 + white * 0.0750759
                b2 = 0.96900 * b2 + white * 0.1538520
                b3 = 0.86650 * b3 + white * 0.3104856
                b4 = 0.55000 * b4 + white * 0.5329522
                b5 = -0.7616 * b5 - white * 0.0168980
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
                data[i] *= 0.08
                b6 = white * 0.115926
            }

            this.noiseNode = this.ctx.createBufferSource()
            this.noiseNode.buffer = buffer
            this.noiseNode.loop = true

            const rainFilter = this.ctx.createBiquadFilter()
            rainFilter.type = 'lowpass'
            rainFilter.frequency.value = 800

            this.noiseNode.connect(rainFilter)
            rainFilter.connect(this.gain)
            this.noiseNode.start()

            const chimes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
            this.rainTimerId = setInterval(() => {
                if (Math.random() > 0.4) {
                    const freq = chimes[Math.floor(Math.random() * chimes.length)]
                    this.playChime(freq)
                }
            }, 1200)
        } else if (type === 'binaural') {
            const merger = this.ctx.createChannelMerger(2)
            
            const oscL = this.ctx.createOscillator()
            const oscR = this.ctx.createOscillator()
            oscL.type = 'sine'
            oscR.type = 'sine'
            oscL.frequency.value = 110
            oscR.frequency.value = 114

            const gainL = this.ctx.createGain()
            const gainR = this.ctx.createGain()
            gainL.gain.value = 0.4
            gainR.gain.value = 0.4

            oscL.connect(gainL).connect(merger, 0, 0)
            oscR.connect(gainR).connect(merger, 0, 1)
            merger.connect(this.gain)

            oscL.start()
            oscR.start()

            this.oscillators.push(oscL, oscR)
            this.playPads([110.00, 164.81, 220.00], 0.15)
        } else if (type === 'cafe') {
            const bufferSize = 5 * this.ctx.sampleRate
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
            const data = buffer.getChannelData(0)
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1
                b0 = 0.99886 * b0 + white * 0.0555179
                b1 = 0.99332 * b1 + white * 0.0750759
                b2 = 0.96900 * b2 + white * 0.1538520
                b3 = 0.86650 * b3 + white * 0.3104856
                b4 = 0.55000 * b4 + white * 0.5329522
                b5 = -0.7616 * b5 - white * 0.0168980
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
                data[i] *= 0.03
                b6 = white * 0.115926
            }

            this.noiseNode = this.ctx.createBufferSource()
            this.noiseNode.buffer = buffer
            this.noiseNode.loop = true

            const cafeFilter = this.ctx.createBiquadFilter()
            cafeFilter.type = 'lowpass'
            cafeFilter.frequency.value = 350

            this.noiseNode.connect(cafeFilter)
            cafeFilter.connect(this.gain)
            this.noiseNode.start()

            this.rainTimerId = setInterval(() => {
                if (Math.random() > 0.3) {
                    this.playClick(800 + Math.random() * 1200, 0.01)
                }
                if (Math.random() > 0.93) {
                    this.playChime(1500 + Math.random() * 1000)
                }
            }, 250)

            this.playPads([130.81, 196.00, 293.66], 0.12)
            let chordIdx = 0
            const chords = [
                [130.81, 196.00, 293.66],
                [110.00, 164.81, 246.94],
                [146.83, 220.00, 329.63]
            ]
            this.timerId = setInterval(() => {
                chordIdx = (chordIdx + 1) % chords.length
                this.playPads(chords[chordIdx], 0.12)
            }, 10000)
        } else if (type === 'greenhouse') {
            const bufferSize = 5 * this.ctx.sampleRate
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
            const data = buffer.getChannelData(0)
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1
                b0 = 0.99886 * b0 + white * 0.0555179
                b1 = 0.99332 * b1 + white * 0.0750759
                b2 = 0.96900 * b2 + white * 0.1538520
                b3 = 0.86650 * b3 + white * 0.3104856
                b4 = 0.55000 * b4 + white * 0.5329522
                b5 = -0.7616 * b5 - white * 0.0168980
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
                data[i] *= 0.08
                b6 = white * 0.115926
            }

            this.noiseNode = this.ctx.createBufferSource()
            this.noiseNode.buffer = buffer
            this.noiseNode.loop = true

            const glassFilter = this.ctx.createBiquadFilter()
            glassFilter.type = 'bandpass'
            glassFilter.frequency.value = 1400
            glassFilter.Q.value = 0.8

            this.noiseNode.connect(glassFilter)
            glassFilter.connect(this.gain)
            this.noiseNode.start()

            const drops = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]
            this.rainTimerId = setInterval(() => {
                if (Math.random() > 0.25) {
                    const freq = drops[Math.floor(Math.random() * drops.length)]
                    this.playClick(freq, 0.05)
                }
            }, 400)
        }
    }

    private playPads(frequencies: number[], localVol = 0.25) {
        if (!this.ctx || !this.filter) return

        const now = this.ctx.currentTime

        this.oscillators.forEach((osc, idx) => {
            const env = this.envelopeGains[idx]
            if (env) {
                env.gain.cancelScheduledValues(now)
                env.gain.setValueAtTime(env.gain.value, now)
                env.gain.exponentialRampToValueAtTime(0.001, now + 3)
                setTimeout(() => {
                    try { osc.stop() } catch(e) {}
                }, 3100)
            }
        })

        this.oscillators = []
        this.envelopeGains = []

        frequencies.forEach(freq => {
            if (!this.ctx || !this.filter) return
            const osc = this.ctx.createOscillator()
            const env = this.ctx.createGain()

            osc.type = 'triangle'
            osc.frequency.setValueAtTime(freq, now)

            env.gain.setValueAtTime(0.001, now)
            env.gain.exponentialRampToValueAtTime(localVol / frequencies.length, now + 4)

            osc.connect(env)
            env.connect(this.filter)

            osc.start()
            this.oscillators.push(osc)
            this.envelopeGains.push(env)
        })
    }

    private playChime(frequency: number) {
        if (!this.ctx || !this.gain) return
        const now = this.ctx.currentTime

        const osc = this.ctx.createOscillator()
        const env = this.ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(frequency, now)

        const vibrato = this.ctx.createOscillator()
        const vibratoGain = this.ctx.createGain()
        vibrato.frequency.value = 5
        vibratoGain.gain.value = 1.5
        vibrato.connect(vibratoGain)
        vibratoGain.connect(osc.frequency)
        vibrato.start()

        env.gain.setValueAtTime(0.001, now)
        env.gain.exponentialRampToValueAtTime(0.12, now + 0.1)
        env.gain.exponentialRampToValueAtTime(0.001, now + 4.5)

        osc.connect(env)
        env.connect(this.gain)

        osc.start()
        vibrato.stop(now + 5)
        osc.stop(now + 5)
    }

    private playClick(frequency: number, duration: number) {
        if (!this.ctx || !this.gain) return
        const now = this.ctx.currentTime

        const osc = this.ctx.createOscillator()
        const env = this.ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(frequency, now)

        env.gain.setValueAtTime(0.001, now)
        env.gain.linearRampToValueAtTime(0.04, now + 0.002)
        env.gain.exponentialRampToValueAtTime(0.001, now + duration)

        osc.connect(env)
        env.connect(this.gain)

        osc.start()
        osc.stop(now + duration + 0.1)
    }

    setVolume(volume: number) {
        if (this.gain) {
            this.gain.gain.value = volume
        }
    }

    stop() {
        clearInterval(this.timerId)
        clearInterval(this.rainTimerId)
        try {
            if (this.noiseNode) this.noiseNode.stop()
            this.oscillators.forEach(osc => {
                try { osc.stop() } catch(e) {}
            })
            if (this.ctx) this.ctx.close()
        } catch (e) {
            // safely caught
        }
        this.noiseNode = null
        this.oscillators = []
        this.envelopeGains = []
        this.filter = null
        this.gain = null
        this.ctx = null
        this.isPlaying = false
    }
}

export function useAmbientSynth() {
    const synthRef = useRef<AmbientSynth | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)

    useEffect(() => {
        synthRef.current = new AmbientSynth()
        return () => {
            if (synthRef.current) {
                synthRef.current.stop()
            }
        }
    }, [])

    const startSound = (type: SoundType, volume: number) => {
        if (synthRef.current) {
            synthRef.current.start(type, volume)
            setIsPlaying(synthRef.current.isPlaying)
        }
    }

    const stopSound = () => {
        if (synthRef.current) {
            synthRef.current.stop()
            setIsPlaying(false)
        }
    }

    const setVolume = (volume: number) => {
        if (synthRef.current) {
            synthRef.current.setVolume(volume)
        }
    }

    return {
        startSound,
        stopSound,
        setVolume,
        isPlaying
    }
}
