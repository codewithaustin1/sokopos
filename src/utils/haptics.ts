/**
 * Mobile Device Haptic Feedback Engine
 * Safely invokes navigator.vibrate with fallback for non-supporting browsers
 */

export const triggerHaptic = (pattern: number | number[] = 25) => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptic feedback not supported or permission denied in current context
    }
  }
};

/**
 * Standard tactile haptic presets for retail operations
 */
export const Haptics = {
  /** Light 25ms tick - for item additions, button taps, and quantity adjustments */
  light: () => triggerHaptic(25),

  /** Double tap 25ms - 40ms - 25ms - for successful barcode scans */
  scanSuccess: () => triggerHaptic([25, 40, 25]),

  /** Firm 45ms buzz - for line item voids and deletions */
  warning: () => triggerHaptic(45),

  /** Double error buzz 50ms - 50ms - 50ms */
  error: () => triggerHaptic([50, 50, 50]),
};
