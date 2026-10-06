import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Modal,
  Easing,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {useRunStore} from '../stores/runStore';
import {useCadence} from '../hooks/useCadence';
import {useSpotifyQueue} from '../hooks/useSpotifyQueue';
import {SpotifyRemoteService} from '../services/SpotifyRemoteService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Running'>;
};

export function RunningScreen({navigation}: Props) {
  const {currentTrack, queue, cadenceBpm, cadenceMode} = useRunStore();
  const {tap} = useCadence();
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // This hook wires cadenceBpm changes → new queue → SpotifyRemote playback
  useSpotifyQueue();

  // Listen to Spotify track changes to update now-playing UI
  useEffect(() => {
    const listener = SpotifyRemoteService.onTrackChanged(uri => {
      const track = queue.find(t => t.uri === uri);
      if (track) useRunStore.getState().setCurrentTrack(track);
    });
    return () => listener?.remove?.();
  }, [queue]);

  const triggerPulse = () => {
    pulseAnim.setValue(0.9);
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handleUpdateTap = () => {
    tap();
    triggerPulse();
  };

  const handlePauseResume = async () => {
    if (isPaused) {
      await SpotifyRemoteService.resume();
    } else {
      await SpotifyRemoteService.pause();
    }
    setIsPaused(p => !p);
  };

  const handleEndRun = async () => {
    await SpotifyRemoteService.pause();
    navigation.replace('Tap');
  };

  return (
    <View style={styles.container}>
      {/* Album art */}
      {currentTrack?.albumArt ? (
        <Image source={{uri: currentTrack.albumArt}} style={styles.albumArt} />
      ) : (
        <View style={[styles.albumArt, styles.albumArtPlaceholder]} />
      )}

      {/* Track info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackName} numberOfLines={1}>
          {currentTrack?.name ?? 'Loading…'}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {currentTrack?.artist ?? ''}
        </Text>
        {currentTrack?.bpm ? (
          <View style={styles.bpmBadge}>
            <Text style={styles.bpmBadgeText}>{currentTrack.bpm} BPM</Text>
          </View>
        ) : null}
      </View>

      {/* Playback controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => SpotifyRemoteService.skipPrev()} style={styles.controlBtn}>
          <Text style={styles.controlIcon}>⏮</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePauseResume} style={styles.controlBtn}>
          <Text style={styles.controlIcon}>{isPaused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => SpotifyRemoteService.skipNext()} style={styles.controlBtn}>
          <Text style={styles.controlIcon}>⏭</Text>
        </TouchableOpacity>
      </View>

      {/* Cadence display */}
      <View style={styles.cadenceRow}>
        <Text style={styles.cadenceLabel}>CADENCE</Text>
        <Text style={styles.cadenceValue}>{cadenceBpm} BPM</Text>
      </View>

      {/* Update cadence controls */}
      {cadenceMode === 'tap' ? (
        <TouchableOpacity
          style={styles.updateCadenceButton}
          onPress={() => setUpdateModalVisible(true)}>
          <Text style={styles.updateCadenceText}>Update Cadence</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.autoLabel}>Auto-detecting cadence</Text>
      )}

      {/* End run */}
      <TouchableOpacity style={styles.endRunButton} onPress={handleEndRun}>
        <Text style={styles.endRunText}>End Run</Text>
      </TouchableOpacity>

      {/* Update cadence modal (tap mode) */}
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUpdateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Cadence</Text>
            <Text style={styles.modalBpm}>
              {cadenceBpm > 0 ? cadenceBpm : '--'} BPM
            </Text>

            <Animated.View style={{transform: [{scale: pulseAnim}]}}>
              <TouchableOpacity
                style={styles.tapButtonModal}
                onPress={handleUpdateTap}
                activeOpacity={0.8}>
                <Text style={styles.tapLabelModal}>TAP</Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setUpdateModalVisible(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  albumArt: {
    width: 240,
    height: 240,
    borderRadius: 16,
    marginBottom: 32,
  },
  albumArtPlaceholder: {
    backgroundColor: '#1a1a1a',
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  trackName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  artistName: {
    fontSize: 15,
    color: '#888',
    marginBottom: 10,
  },
  bpmBadge: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bpmBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    marginBottom: 32,
  },
  controlBtn: {
    padding: 8,
  },
  controlIcon: {
    fontSize: 32,
    color: '#fff',
  },
  cadenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    backgroundColor: '#151515',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cadenceLabel: {
    color: '#555',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cadenceValue: {
    color: '#1DB954',
    fontSize: 18,
    fontWeight: '800',
  },
  updateCadenceButton: {
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginBottom: 16,
  },
  updateCadenceText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  autoLabel: {
    color: '#1DB954',
    fontSize: 13,
    marginBottom: 16,
  },
  endRunButton: {
    marginTop: 8,
  },
  endRunText: {
    color: '#444',
    fontSize: 14,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 40,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  modalBpm: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 32,
  },
  tapButtonModal: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#1DB954',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  tapLabelModal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 5,
  },
  doneButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 50,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
