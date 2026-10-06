import React, {useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Animated,
  Easing,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {useCadence} from '../hooks/useCadence';
import {useRunStore} from '../stores/runStore';
import {SpotifyRemoteService} from '../services/SpotifyRemoteService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tap'>;
};

export function TapScreen({navigation}: Props) {
  const {tap, resetTapper, cadenceBpm} = useCadence();
  const {cadenceMode, setCadenceMode, isSyncing, accessToken} = useRunStore();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Reconnect remote if returning to this screen
  useEffect(() => {
    if (accessToken) {
      SpotifyRemoteService.connect(accessToken).catch(console.warn);
    }
  }, [accessToken]);

  // Pulse animation on tap
  const triggerPulse = () => {
    pulseAnim.setValue(0.92);
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handleTap = () => {
    tap();
    triggerPulse();
  };

  const handleStart = () => {
    if (cadenceBpm < 60) return;
    navigation.navigate('Running');
  };

  const isAccelerometer = cadenceMode === 'accelerometer';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Your Pace</Text>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <Text style={[styles.modeLabel, !isAccelerometer && styles.modeActive]}>
          TAP
        </Text>
        <Switch
          value={isAccelerometer}
          onValueChange={v => {
            setCadenceMode(v ? 'accelerometer' : 'tap');
            resetTapper();
          }}
          trackColor={{false: '#333', true: '#1DB954'}}
          thumbColor="#fff"
        />
        <Text style={[styles.modeLabel, isAccelerometer && styles.modeActive]}>
          AUTO
        </Text>
      </View>

      {/* BPM display */}
      <View style={styles.bpmContainer}>
        <Text style={styles.bpmValue}>
          {cadenceBpm > 0 ? cadenceBpm : '--'}
        </Text>
        <Text style={styles.bpmUnit}>BPM</Text>
      </View>

      {/* Tap button — hidden in accelerometer mode */}
      {!isAccelerometer && (
        <Animated.View style={{transform: [{scale: pulseAnim}]}}>
          <TouchableOpacity
            style={styles.tapButton}
            onPress={handleTap}
            activeOpacity={0.8}>
            <Text style={styles.tapLabel}>TAP</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Accelerometer hint */}
      {isAccelerometer && (
        <View style={styles.autoHint}>
          <Text style={styles.autoHintText}>
            {cadenceBpm > 0
              ? 'Cadence detected — start running!'
              : 'Start running to detect cadence…'}
          </Text>
        </View>
      )}

      {/* Start button */}
      <TouchableOpacity
        style={[styles.startButton, cadenceBpm < 60 && styles.startButtonDisabled]}
        onPress={handleStart}
        disabled={cadenceBpm < 60}>
        <Text style={styles.startText}>
          {isSyncing ? 'Syncing library…' : 'Start Run'}
        </Text>
      </TouchableOpacity>

      {!isAccelerometer && cadenceBpm > 0 && (
        <TouchableOpacity onPress={resetTapper} style={styles.resetButton}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 32,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 48,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.5,
  },
  modeActive: {
    color: '#1DB954',
  },
  bpmContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  bpmValue: {
    fontSize: 100,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 108,
  },
  bpmUnit: {
    fontSize: 18,
    color: '#555',
    letterSpacing: 4,
    fontWeight: '600',
  },
  tapButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    shadowColor: '#1DB954',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  tapLabel: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 6,
  },
  autoHint: {
    marginBottom: 48,
    paddingHorizontal: 24,
  },
  autoHintText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 15,
  },
  startButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 50,
    minWidth: 200,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#222',
  },
  startText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  resetButton: {
    marginTop: 16,
  },
  resetText: {
    color: '#555',
    fontSize: 14,
  },
});
