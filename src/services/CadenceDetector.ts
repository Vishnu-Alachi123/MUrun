// Detects running cadence (steps per minute) from accelerometer data.
//
// Algorithm:
//   1. Compute magnitude of 3-axis acceleration vector.
//   2. Maintain a short rolling average to establish a dynamic threshold.
//   3. Detect upward zero-crossings of (magnitude - threshold) as footstrikes.
//   4. Enforce a minimum inter-peak interval to reject noise.
//   5. Report BPM = 60,000 / mean(last N inter-peak intervals).
//
// Running cadence is typically 150–200 steps/min, so we expect peaks ~300–400ms apart.

import {accelerometer, SensorTypes, setUpdateIntervalForType} from 'react-native-sensors';
import type {Subscription} from 'rxjs';

const SAMPLE_RATE_HZ = 50;
const MOVING_AVG_WINDOW = 12; // ~240ms at 50Hz
const THRESHOLD_MULTIPLIER = 1.15;
const MIN_PEAK_INTERVAL_MS = 220; // guard against 270+ BPM (no human runs that fast)
const MAX_PEAK_INTERVAL_MS = 1200; // below 50 BPM — stale if exceeded
const PEAK_HISTORY = 10;

type CadenceCallback = (bpm: number) => void;

export class CadenceDetector {
  private subscription: Subscription | null = null;
  private magnitudes: number[] = [];
  private peakTimes: number[] = [];
  private lastMagnitude = 0;
  private lastPeakTime = 0;
  private onCadence: CadenceCallback;

  constructor(onCadence: CadenceCallback) {
    this.onCadence = onCadence;
  }

  start() {
    setUpdateIntervalForType(SensorTypes.accelerometer, 1000 / SAMPLE_RATE_HZ);

    this.subscription = accelerometer.subscribe(({x, y, z}) => {
      this.processSample(x, y, z);
    });
  }

  stop() {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.magnitudes = [];
    this.peakTimes = [];
    this.lastPeakTime = 0;
  }

  private processSample(x: number, y: number, z: number) {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    this.magnitudes.push(magnitude);
    if (this.magnitudes.length > MOVING_AVG_WINDOW * 2) {
      this.magnitudes.shift();
    }

    const windowSlice = this.magnitudes.slice(-MOVING_AVG_WINDOW);
    const avg =
      windowSlice.reduce((a, b) => a + b, 0) / windowSlice.length;
    const threshold = avg * THRESHOLD_MULTIPLIER;

    const now = Date.now();
    const prev = this.lastMagnitude;
    this.lastMagnitude = magnitude;

    // Rising edge cross above threshold = footstrike peak
    const enoughGap = now - this.lastPeakTime > MIN_PEAK_INTERVAL_MS;
    if (prev < threshold && magnitude >= threshold && enoughGap) {
      this.lastPeakTime = now;
      this.peakTimes.push(now);
      if (this.peakTimes.length > PEAK_HISTORY) {
        this.peakTimes.shift();
      }
      this.onCadence(this.computeBpm());
    }
  }

  private computeBpm(): number {
    if (this.peakTimes.length < 2) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < this.peakTimes.length; i++) {
      const interval = this.peakTimes[i] - this.peakTimes[i - 1];
      if (interval < MAX_PEAK_INTERVAL_MS) {
        intervals.push(interval);
      }
    }
    if (intervals.length === 0) return 0;

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(60000 / avg);
  }
}
