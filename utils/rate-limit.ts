/**
 * Lightweight Server-Side Rate Limiter & AI Quota Guard
 * Protects Gemini 2.5 Flash endpoints from burst abuse and runaway billing.
 */

interface RateBucket {
    count: number
    resetAt: number
}

const memoryBuckets = new Map<string, RateBucket>()

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    retryAfterSeconds: number
}

/**
 * Checks and increments a rate-limit bucket for a given key (e.g. `${userId}:ai_chat`).
 * @param key Unique identifier for user + action bucket
 * @param maxRequests Maximum allowed requests within windowMs
 * @param windowMs Time window in milliseconds (default: 60 seconds)
 */
export function checkRateLimit(
    key: string,
    maxRequests: number = 15,
    windowMs: number = 60_000
): RateLimitResult {
    const now = Date.now()

    // Periodic cleanup to avoid unbounded Map growth
    if (memoryBuckets.size > 5000) {
        for (const [k, v] of memoryBuckets.entries()) {
            if (now > v.resetAt) memoryBuckets.delete(k)
        }
    }

    const existing = memoryBuckets.get(key)
    if (!existing || now > existing.resetAt) {
        memoryBuckets.set(key, { count: 1, resetAt: now + windowMs })
        return {
            allowed: true,
            remaining: Math.max(0, maxRequests - 1),
            retryAfterSeconds: 0,
        }
    }

    if (existing.count >= maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        }
    }

    existing.count += 1
    return {
        allowed: true,
        remaining: Math.max(0, maxRequests - existing.count),
        retryAfterSeconds: 0,
    }
}
