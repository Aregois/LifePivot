/**
 * Browser-native Text-to-Speech (TTS) utility using the Web Speech API.
 * Safe for Next.js SSR and PWA usage. Uses session tracking to avoid race conditions.
 */

let currentSessionId = 0;

export function stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        currentSessionId++; // Invalidate any active speech callback closures
        window.speechSynthesis.cancel()
    }
}

export function isSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        return window.speechSynthesis.speaking
    }
    return false
}

export function speakText(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        onError?.(new Error('Web Speech API is not supported in this environment.'))
        return
    }

    // Increment session ID to invalidate callbacks from any previously running speech
    const sessionId = ++currentSessionId;

    // Stop any currently running speech synthesis
    window.speechSynthesis.cancel()

    // Clean up text (strip out markdown symbols, backticks, emojis to make narration cleaner)
    const cleanedText = text
        .replace(/[*_`~#\-]/g, ' ') // remove markdown syntax characters
        .replace(/\s+/g, ' ')       // collapse multiple spaces
        .trim()

    if (!cleanedText) return

    const utterance = new SpeechSynthesisUtterance(cleanedText)

    // Select a Feynman-like voice (English, Male, or natural if possible)
    const selectVoice = () => {
        const voices = window.speechSynthesis.getVoices()
        
        // Find best match for warm, professorial male tone
        return voices.find(v => 
            v.lang.startsWith('en') && 
            (
                v.name.includes('Male') || 
                v.name.includes('Siri') || 
                v.name.includes('Google') || 
                v.name.includes('Natural') || 
                v.name.includes('David')
            )
        ) || voices.find(v => v.lang.startsWith('en')) // Fallback to any English voice
    }

    const voice = selectVoice()
    if (voice) {
        utterance.voice = voice
    }

    // Set professorial tone settings (deeper pitch, slightly slower cadence)
    utterance.pitch = 0.95 
    utterance.rate = 0.92  

    // Wire up standard events with session matching guards
    utterance.onstart = () => {
        if (sessionId === currentSessionId) {
            onStart?.()
        }
    }

    utterance.onend = () => {
        if (sessionId === currentSessionId) {
            onEnd?.()
        }
    }
    
    utterance.onerror = (e) => {
        if (sessionId === currentSessionId) {
            if (e.error !== 'interrupted') {
                onError?.(e)
            } else {
                onEnd?.()
            }
        }
    }

    window.speechSynthesis.speak(utterance)
}
