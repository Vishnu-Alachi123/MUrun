// Thin wrapper around react-native-spotify-remote.
// Handles connect/disconnect and queue playback.
// The Spotify app owns audio after playUri — works with screen off.
//
// Package API: import { auth, remote, ApiScope } from 'react-native-spotify-remote'

import {auth, remote, ApiScope} from 'react-native-spotify-remote';
import {storage} from '../stores/storage';
import type {TrackWithBpm} from './SpotifyAPI';

// ⚠️  Replace YOUR_CLIENT_ID with your Spotify Developer Dashboard Client ID
const CLIENT_ID = 'YOUR_CLIENT_ID';

const SPOTIFY_CONFIG = {
  clientID: CLIENT_ID,
  redirectURL: 'murun://callback',
  scopes: [
    ApiScope.UserLibraryReadScope,
    ApiScope.PlaylistReadPrivateScope,
    ApiScope.StreamingScope,
    ApiScope.UserReadPlaybackStateScope,
    ApiScope.AppRemoteControlScope,
  ],
};

let connected = false;

export const SpotifyRemoteService = {
  async authorize(): Promise<string> {
    const session = await auth.authorize(SPOTIFY_CONFIG);
    storage.set('access_token', session.accessToken);
    return session.accessToken;
  },

  async connect(accessToken: string): Promise<void> {
    if (connected) return;
    await remote.connect(accessToken);
    connected = true;
  },

  async disconnect(): Promise<void> {
    await remote.disconnect();
    connected = false;
  },

  async playQueue(tracks: TrackWithBpm[]): Promise<void> {
    if (tracks.length === 0) return;

    // Play the first track, then queue the rest
    await remote.playUri(tracks[0].uri);

    // Queue remaining tracks (Spotify processes asynchronously)
    for (let i = 1; i < Math.min(tracks.length, 20); i++) {
      await remote.queueUri(tracks[i].uri);
    }
  },

  async skipNext(): Promise<void> {
    await remote.skipToNext();
  },

  async skipPrev(): Promise<void> {
    await remote.skipToPrevious();
  },

  async pause(): Promise<void> {
    await remote.pause();
  },

  async resume(): Promise<void> {
    await remote.resume();
  },

  onTrackChanged(cb: (trackUri: string) => void) {
    return remote.addListener('playerStateChanged', (state: {track?: {uri?: string}}) => {
      if (state?.track?.uri) cb(state.track.uri);
    });
  },
};
