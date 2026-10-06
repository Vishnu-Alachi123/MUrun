import {create} from 'zustand';
import {storage} from './storage';
import type {TrackWithBpm} from '../services/SpotifyAPI';

export type CadenceMode = 'tap' | 'accelerometer';
export type AppScreen = 'login' | 'tap' | 'running';

interface RunState {
  // Auth
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;

  // Cadence
  cadenceBpm: number;
  setCadenceBpm: (bpm: number) => void;
  cadenceMode: CadenceMode;
  setCadenceMode: (mode: CadenceMode) => void;

  // Song library (cached liked songs + any loaded playlists)
  library: TrackWithBpm[];
  setLibrary: (songs: TrackWithBpm[]) => void;
  addToLibrary: (songs: TrackWithBpm[]) => void;

  // Queue — songs matching current cadence
  queue: TrackWithBpm[];
  setQueue: (songs: TrackWithBpm[]) => void;

  // Now playing
  currentTrack: TrackWithBpm | null;
  setCurrentTrack: (track: TrackWithBpm | null) => void;

  // UI
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;
}

export const useRunStore = create<RunState>((set, get) => ({
  accessToken: storage.getString('access_token') ?? null,
  setAccessToken: token => {
    if (token) storage.set('access_token', token);
    else storage.delete('access_token');
    set({accessToken: token});
  },

  cadenceBpm: 0,
  setCadenceBpm: bpm => set({cadenceBpm: bpm}),

  cadenceMode: 'tap',
  setCadenceMode: mode => set({cadenceMode: mode}),

  library: [],
  setLibrary: songs => set({library: songs}),
  addToLibrary: songs => {
    const existing = get().library;
    const existingIds = new Set(existing.map(s => s.id));
    const merged = [...existing, ...songs.filter(s => !existingIds.has(s.id))];
    set({library: merged});
  },

  queue: [],
  setQueue: songs => set({queue: songs}),

  currentTrack: null,
  setCurrentTrack: track => set({currentTrack: track}),

  isRunning: false,
  setIsRunning: v => set({isRunning: v}),

  isSyncing: false,
  setIsSyncing: v => set({isSyncing: v}),
}));
