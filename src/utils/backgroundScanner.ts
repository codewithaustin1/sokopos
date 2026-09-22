/**
 * Persistent Background Barcode Scanner Listener
 * 
 * Intercepts high-speed keyboard wedge barcode bursts (from USB, Bluetooth, or 2.4GHz wireless scanners)
 * regardless of whether the user is focused on an <input>, <textarea>, or any modal component.
 * 
 * Key capabilities:
 * 1. Capture-phase window event listening ensures priority handling before DOM inputs.
 * 2. High-precision timing analysis distinguishes hardware scanner bursts (< 45ms inter-key latency)
 *    from human typing (100ms - 300ms).
 * 3. Zero-pollution input restoration: if an input element was focused when the scanner fired,
 *    the leaked barcode characters are seamlessly rolled back and React state is updated cleanly.
 * 4. Diagnostics & visual telemetry to provide cashier confidence in hardware connectivity.
 */

export interface ScannerBurstMetadata {
  barcode: string;
  interKeyAvgMs: number;
  maxInterKeyMs: number;
  burstDurationMs: number;
  characterCount: number;
  timestamp: number;
  targetElement: HTMLElement | null;
  targetTagName: string;
  inputWasRestored: boolean;
  preBurstInputValue?: string;
}

export interface ScannerListenerConfig {
  maxInterKeyLatencyMs?: number; // Maximum gap between consecutive keys in a burst (default 50ms)
  minBarcodeLength?: number; // Minimum length of valid barcode (default 3)
  maxTotalBurstDurationMs?: number; // Maximum overall time for full burst (default 1200ms)
  enableInputRestoration?: boolean; // Revert focused input to pre-burst text (default true)
  onScan?: (barcode: string, meta: ScannerBurstMetadata) => void;
}

// Global Diagnostics Storage
class ScannerDiagnosticsStore {
  public lastScan: ScannerBurstMetadata | null = null;
  public totalScansCaptured = 0;
  public isListenerActive = false;
  private listeners: Array<() => void> = [];

  public updateLastScan(scan: ScannerBurstMetadata) {
    this.lastScan = scan;
    this.totalScansCaptured++;
    this.notify();
  }

  public setListenerActive(active: boolean) {
    this.isListenerActive = active;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('[ScannerDiagnostics] Error in subscriber:', e);
      }
    });
  }
}

export const scannerDiagnostics = new ScannerDiagnosticsStore();

/**
 * Cleanly restores an input/textarea element to its pre-burst value,
 * invoking React's internal prototype setter and firing input/change events.
 */
export function restoreInputElementValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  restoredValue: string,
  selection?: { start: number | null; end: number | null }
): boolean {
  try {
    const isInput = element instanceof HTMLInputElement;
    const proto = isInput
      ? window.HTMLInputElement.prototype
      : window.HTMLTextAreaElement.prototype;

    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, restoredValue);
    } else {
      element.value = restoredValue;
    }

    // Dispatch synthetic input and change events so React bindings (e.g. useState) update immediately
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

    if (selection && selection.start !== null && selection.end !== null) {
      try {
        element.setSelectionRange(selection.start, selection.end);
      } catch {
        // Ignore cursor setting issues on non-text input types (e.g. number/email)
      }
    }
    return true;
  } catch (err) {
    console.warn('[BackgroundScanner] Error restoring input value:', err);
    return false;
  }
}

/**
 * Background Scanner Engine
 */
export class BackgroundScannerEngine {
  private config: Required<ScannerListenerConfig>;
  private charBuffer: string[] = [];
  private keyTimestamps: number[] = [];
  private burstStartTime = 0;
  private lastCharTime = 0;

  // Snapshot of active input before scanner burst starts
  private snapshotTarget: (HTMLInputElement | HTMLTextAreaElement) | null = null;
  private snapshotOriginalValue = '';
  private snapshotSelection: { start: number | null; end: number | null } = {
    start: null,
    end: null,
  };

  private boundKeyDown: (e: KeyboardEvent) => void;
  private isDestroyed = false;

  constructor(config: ScannerListenerConfig = {}) {
    this.config = {
      maxInterKeyLatencyMs: config.maxInterKeyLatencyMs ?? 55,
      minBarcodeLength: config.minBarcodeLength ?? 3,
      maxTotalBurstDurationMs: config.maxTotalBurstDurationMs ?? 1500,
      enableInputRestoration: config.enableInputRestoration ?? true,
      onScan: config.onScan ?? (() => {}),
    };

    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  public start(): () => void {
    if (typeof window === 'undefined') return () => {};
    // Use capture phase so we intercept before any form or input on the page
    window.addEventListener('keydown', this.boundKeyDown, { capture: true });
    scannerDiagnostics.setListenerActive(true);

    return () => {
      this.destroy();
    };
  }

  public destroy() {
    if (this.isDestroyed || typeof window === 'undefined') return;
    this.isDestroyed = true;
    window.removeEventListener('keydown', this.boundKeyDown, { capture: true });
    scannerDiagnostics.setListenerActive(false);
  }

  public updateOnScan(callback: (barcode: string, meta: ScannerBurstMetadata) => void) {
    this.config.onScan = callback;
  }

  private resetBuffer() {
    this.charBuffer = [];
    this.keyTimestamps = [];
    this.burstStartTime = 0;
    this.lastCharTime = 0;
    this.snapshotTarget = null;
    this.snapshotOriginalValue = '';
    this.snapshotSelection = { start: null, end: null };
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore control keys, modifier shortcuts (Ctrl+C, Alt+Tab, etc.)
    if (e.ctrlKey || e.altKey || e.metaKey) {
      if (this.charBuffer.length > 0) {
        this.resetBuffer();
      }
      return;
    }

    const now = performance.now();
    const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13;
    const isTab = e.key === 'Tab' || e.keyCode === 9;
    const isTerminator = isEnter || isTab;

    const target = e.target as HTMLElement | null;
    const isInputTarget =
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

    // Handle terminating key (Enter or Tab)
    if (isTerminator) {
      if (this.charBuffer.length >= this.config.minBarcodeLength) {
        const burstDuration = now - this.burstStartTime;
        const charCount = this.charBuffer.length;
        const interKeyGaps = [];

        for (let i = 1; i < this.keyTimestamps.length; i++) {
          interKeyGaps.push(this.keyTimestamps[i] - this.keyTimestamps[i - 1]);
        }

        const avgLatency =
          interKeyGaps.length > 0
            ? interKeyGaps.reduce((a, b) => a + b, 0) / interKeyGaps.length
            : 0;

        const maxLatency = interKeyGaps.length > 0 ? Math.max(...interKeyGaps) : 0;
        const timeSinceLastChar = now - this.lastCharTime;

        // Validation for hardware scanner burst:
        // 1. Average gap between characters is <= maxInterKeyLatencyMs (usually 5-35ms)
        // 2. Terminator arrived shortly after last character (<= 250ms)
        // 3. Overall burst duration is reasonable for a scanner
        const isScannerBurst =
          avgLatency <= this.config.maxInterKeyLatencyMs &&
          timeSinceLastChar < 250 &&
          burstDuration <= this.config.maxTotalBurstDurationMs;

        if (isScannerBurst) {
          // Stop propagation and prevent default action (e.g. form submission, dialog closing)
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const barcode = this.charBuffer.join('').trim();
          let restored = false;

          // Input element cleanup
          if (this.config.enableInputRestoration && this.snapshotTarget) {
            // Restore original text before the burst typed into it
            restored = restoreInputElementValue(
              this.snapshotTarget,
              this.snapshotOriginalValue,
              this.snapshotSelection
            );
          } else if (this.config.enableInputRestoration && isInputTarget) {
            // Fallback: If snapshot target wasn't captured, strip barcode suffix if present
            const currentVal = target.value;
            if (currentVal.endsWith(barcode)) {
              const cleanedVal = currentVal.slice(0, -barcode.length);
              restored = restoreInputElementValue(target, cleanedVal);
            }
          }

          const metadata: ScannerBurstMetadata = {
            barcode,
            interKeyAvgMs: Math.round(avgLatency * 10) / 10,
            maxInterKeyMs: Math.round(maxLatency * 10) / 10,
            burstDurationMs: Math.round(burstDuration),
            characterCount: charCount,
            timestamp: Date.now(),
            targetElement: target,
            targetTagName: target ? target.tagName : 'WINDOW',
            inputWasRestored: restored,
            preBurstInputValue: this.snapshotOriginalValue,
          };

          // Update diagnostics
          scannerDiagnostics.updateLastScan(metadata);

          // Trigger custom window event for telemetry or debugging
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('barcode-burst-scanned', {
                detail: metadata,
              })
            );
          }

          // Execute registered scan handler
          this.config.onScan(barcode, metadata);

          this.resetBuffer();
          return;
        }
      }

      // Not a scanner burst, reset buffer and let normal Enter proceed
      this.resetBuffer();
      return;
    }

    // Process printable character keys (length === 1)
    if (e.key.length === 1) {
      const timeSinceLastChar = now - this.lastCharTime;

      // If gap exceeds scanner burst threshold, start fresh buffer
      if (this.charBuffer.length === 0 || timeSinceLastChar > this.config.maxInterKeyLatencyMs) {
        this.charBuffer = [e.key];
        this.keyTimestamps = [now];
        this.burstStartTime = now;
        this.lastCharTime = now;

        // Snapshot focused input element state at the very start of potential burst
        if (isInputTarget) {
          this.snapshotTarget = target;
          this.snapshotOriginalValue = target.value;
          this.snapshotSelection = {
            start: target.selectionStart,
            end: target.selectionEnd,
          };
        } else {
          this.snapshotTarget = null;
          this.snapshotOriginalValue = '';
          this.snapshotSelection = { start: null, end: null };
        }
      } else {
        // Fast consecutive character in burst
        this.charBuffer.push(e.key);
        this.keyTimestamps.push(now);
        this.lastCharTime = now;
      }
    }
  }
}

/**
 * Simulates an incoming hardware scanner burst (useful for testing & demo without physical scanner)
 */
export async function simulateHardwareBarcodeBurst(
  barcode: string,
  interKeyDelayMs = 12
): Promise<void> {
  const chars = barcode.split('');
  for (const ch of chars) {
    const event = new KeyboardEvent('keydown', {
      key: ch,
      code: `Key${ch.toUpperCase()}`,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    await new Promise((r) => setTimeout(r, interKeyDelayMs));
  }

  // Terminating Enter
  await new Promise((r) => setTimeout(r, interKeyDelayMs));
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(enterEvent);
}
