/**
 * Haptic feedback utility for a 'Native Plus' feel.
 * Uses the Web Vibration API with safe fallbacks.
 */
export const haptics = {
    /**
     * Light tick - for subtle feedback like tab changes or scrolling to a new item.
     */
    light: () => {
        if (typeof window !== 'undefined' && localStorage.getItem('lifepivot_haptics') === 'false') return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    /**
     * Medium bump - for successful actions like completing a task or picking a date.
     */
    medium: () => {
        if (typeof window !== 'undefined' && localStorage.getItem('lifepivot_haptics') === 'false') return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }
    },

    /**
     * Error shake - for failed actions or invalid input.
     */
    error: () => {
        if (typeof window !== 'undefined' && localStorage.getItem('lifepivot_haptics') === 'false') return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([30, 50, 30]);
        }
    }
};
