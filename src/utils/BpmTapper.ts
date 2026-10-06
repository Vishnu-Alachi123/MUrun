// Calculates BPM from user taps.
// Keeps a rolling window of the last N tap intervals for a smooth average.

const MAX_TAPS = 8;
const TAP_TIMEOUT_MS = 3000; // reset if user stops tapping
const MIN_TAP_INTERVAL_MS = 200; // debounce accidental double-taps

export class BpmTapper {
  private tapTimes: number[] = [];
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  tap(): number {
    const now = Date.now();

    // Debounce
    if (this.tapTimes.length > 0) {
      const last = this.tapTimes[this.tapTimes.length - 1];
      if (now - last < MIN_TAP_INTERVAL_MS) {
        return this.getBpm();
      }
    }

    // Reset timeout
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }
    this.timeoutHandle = setTimeout(() => {
      // Lock BPM after timeout — don't clear, just stop updating
    }, TAP_TIMEOUT_MS);

    this.tapTimes.push(now);
    if (this.tapTimes.length > MAX_TAPS) {
      this.tapTimes.shift();
    }

    return this.getBpm();
  }

  getBpm(): number {
    if (this.tapTimes.length < 2) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < this.tapTimes.length; i++) {
      intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(60000 / avg);
  }

  reset() {
    this.tapTimes = [];
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }
}
