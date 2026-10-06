// Unified hook that provides cadence BPM from either tap or accelerometer mode.
// Consumers just call `tap()` for tap mode; accelerometer mode auto-feeds.

import {useRef, useCallback, useEffect} from 'react';
import {useRunStore} from '../stores/runStore';
import {BpmTapper} from '../utils/BpmTapper';
import {CadenceDetector} from '../services/CadenceDetector';

export function useCadence() {
  const {cadenceMode, setCadenceBpm, cadenceBpm} = useRunStore();
  const tapper = useRef(new BpmTapper()).current;
  const detectorRef = useRef<CadenceDetector | null>(null);

  // Start/stop accelerometer detector when mode changes
  useEffect(() => {
    if (cadenceMode === 'accelerometer') {
      const detector = new CadenceDetector(bpm => {
        if (bpm > 60 && bpm < 240) {
          setCadenceBpm(bpm);
        }
      });
      detectorRef.current = detector;
      detector.start();
    } else {
      detectorRef.current?.stop();
      detectorRef.current = null;
    }

    return () => {
      detectorRef.current?.stop();
      detectorRef.current = null;
    };
  }, [cadenceMode, setCadenceBpm]);

  const tap = useCallback(() => {
    if (cadenceMode !== 'tap') return;
    const bpm = tapper.tap();
    if (bpm > 0) setCadenceBpm(bpm);
  }, [cadenceMode, tapper, setCadenceBpm]);

  const resetTapper = useCallback(() => {
    tapper.reset();
    setCadenceBpm(0);
  }, [tapper, setCadenceBpm]);

  return {tap, resetTapper, cadenceBpm};
}
