import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';

import {SpotifyRemoteService} from '../services/SpotifyRemoteService';
import {useRunStore} from '../stores/runStore';
import {loadCachedSongs, syncLikedSongs} from '../services/SpotifyAPI';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export function LoginScreen({navigation}: Props) {
  const [loading, setLoading] = useState(false);
  const {setAccessToken, setLibrary, setIsSyncing} = useRunStore();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const token = await SpotifyRemoteService.authorize();
      setAccessToken(token);

      // Connect remote immediately so it's ready
      await SpotifyRemoteService.connect(token);

      // Load cached songs immediately, sync in background
      const cached = loadCachedSongs();
      if (cached.length > 0) setLibrary(cached);

      setIsSyncing(true);
      syncLikedSongs(token)
        .then(songs => setLibrary(songs))
        .catch(console.warn)
        .finally(() => setIsSyncing(false));

      navigation.replace('Tap');
    } catch (e) {
      Alert.alert('Login Failed', 'Could not connect to Spotify. Make sure the Spotify app is installed.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>MUrun</Text>
      <Text style={styles.tagline}>Music that matches your pace</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Connect Spotify</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        Requires Spotify Premium + Spotify app installed
      </Text>
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
  appName: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#888',
    marginBottom: 60,
  },
  button: {
    backgroundColor: '#1DB954',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 50,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  note: {
    color: '#444',
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
  },
});
