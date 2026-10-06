// Thin wrapper around react-native-spotify-remote.
// Handles connect/disconnect and queue playback.
// The Spotify app owns audio after playUri — works with screen off.

import SpotifyRemote, {
  SpotifySession,
} from 'react-native-spotify-remote';
import {storage} from '../stores/storage';
import type {TrackWithBpm} from './SpotifyAPI';

// Fill these in from your Spotify Developer Dashboard
export const SPOTIFY_CONFIG = {
  clientID: storage.getString('spotify_client_id') ?? 'YOUR_CLIENT_ID',
  redirectURL: 'murun://callback',
  tokenRefreshURL: '', // optional: backend token refresh endpoint
  tokenSwapURL: '',    // optional: backend token swap endpoint
  scopes: [
    'user-library-read',
    'playlist-read-private',
    'streaming',
    'user-read-playback-state',
    'app-remote-control',
  ],
};

let connected = false;

export const SpotifyRemoteService = {
  async authorize(): Promise<string> {
    const session: SpotifySession = await SpotifyRemote.authorize(
      SPOTIFY_CONFIG as Parameters<typeof SpotifyRemote.authorize>[0],
    );
    storage.set('access_token', session.accessToken);
    return session.accessToken;
  },

  async connect(accessToken: string): Promise<void> {
    if (connected) return;
    await SpotifyRemote.connect(accessToken);
    connected = true;
  },

  async disconnect(): Promise<void> {
    await SpotifyRemote.disconnect();
    connected = false;
  },

  async playQueue(tracks: TrackWithBpm[]): Promise<void> {
    if (tracks.length === 0) return;

    // Play the first track, then queue the rest
    await SpotifyRemote.playUri(tracks[0].uri);

    // Queue remaining tracks (Spotify processes asynchronously)
    for (let i = 1; i < Math.min(tracks.length, 20); i++) {
      await SpotifyRemote.queueUri(tracks[i].uri);
    }
  },

  async skipNext(): Promise<void> {
    await SpotifyRemote.skipToNext();
  },

  async skipPrev(): Promise<void> {
    await SpotifyRemote.skipToPrevious();
  },

  async pause(): Promise<void> {
    await SpotifyRemote.pause();
  },

  async resume(): Promise<void> {
    await SpotifyRemote.resume();
  },

  onTrackChanged(cb: (trackUri: string) => void) {
    return SpotifyRemote.addListener('playerStateChanged', state => {
      if (state?.track?.uri) cb(state.track.uri);
    });
  },
};
