import PostHog from 'posthog-react-native'

let posthogClient: PostHog | null = null

try {
    const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY
    if (posthogKey) {
        posthogClient = new PostHog(posthogKey, {
            host: 'https://us.i.posthog.com' // standard US endpoint
        })
    } else {
        console.warn('PostHog initialization skipped: EXPO_PUBLIC_POSTHOG_KEY is missing.')
    }
} catch (err) {
    console.error('Failed to initialize PostHog client:', err)
}

/**
 * Capture an analytics event.
 * Catches errors gracefully if PostHog key is missing in local development.
 */
export function track(eventName: string, properties?: Record<string, any>) {
    try {
        if (posthogClient) {
            posthogClient.capture(eventName, properties)
        } else {
            console.log(`[Analytics Dev Log] Event: "${eventName}"`, properties || '')
        }
    } catch (err) {
        console.error(`Failed to track event "${eventName}":`, err)
    }
}
