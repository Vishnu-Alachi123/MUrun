// Spotify Web API wrapper.
// Handles liked songs, audio features (BPM), playlists, and recommendations.

import axios from 'axios';
import {storage} from '../stores/storage';

const BASE = 'https://api.spotify.com/v1';
const CACHE_KEY_SONGS = 'cached_songs_with_bpm';
const CACHE_KEY_EXPIRY = 'cached_songs_expiry';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface TrackWithBpm {
  id: string;
  uri: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  bpm: number;
  durationMs: number;
}

function authHeader(token: string) {
  return {Authorization: `Bearer ${token}`};
}

// ─── Liked songs + audio features ────────────────────────────────────────────

async function fetchAllLikedTrackIds(token: string): Promise<{id: string; uri: string; name: string; artist: string; album: string; albumArt: string; durationMs: number}[]> {
  const tracks: {id: string; uri: string; name: string; artist: string; album: string; albumArt: string; durationMs: number}[] = [];
  let url = `${BASE}/me/tracks?limit=50`;

  while (url) {
    const res = await axios.get(url, {headers: authHeader(token)});
    for (const item of res.data.items) {
      const t = item.track;
      if (!t || t.is_local) continue;
      tracks.push({
        id: t.id,
        uri: t.uri,
        name: t.name,
        artist: t.artists.map((a: {name: string}) => a.name).join(', '),
        album: t.album.name,
        albumArt: t.album.images?.[0]?.url ?? '',
        durationMs: t.duration_ms,
      });
    }
    url = res.data.next;
  }
  return tracks;
}

async function fetchAudioFeaturesBatch(
  token: string,
  ids: string[],
): Promise<Record<string, number>> {
  const bpmMap: Record<string, number> = {};
  // Spotify allows max 100 per request
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100).join(',');
    const res = await axios.get(`${BASE}/audio-features?ids=${chunk}`, {
      headers: authHeader(token),
    });
    for (const feature of res.data.audio_features) {
      if (feature) {
        bpmMap[feature.id] = Math.round(feature.tempo);
      }
    }
  }
  return bpmMap;
}

export async function syncLikedSongs(token: string): Promise<TrackWithBpm[]> {
  const tracks = await fetchAllLikedTrackIds(token);
  const ids = tracks.map(t => t.id);
  const bpmMap = await fetchAudioFeaturesBatch(token, ids);

  const withBpm: TrackWithBpm[] = tracks
    .map(t => ({...t, bpm: bpmMap[t.id] ?? 0}))
    .filter(t => t.bpm > 0);

  storage.set(CACHE_KEY_SONGS, JSON.stringify(withBpm));
  storage.set(CACHE_KEY_EXPIRY, String(Date.now() + CACHE_TTL_MS));
  return withBpm;
}

export function loadCachedSongs(): TrackWithBpm[] {
  try {
    const raw = storage.getString(CACHE_KEY_SONGS);
    if (!raw) return [];
    return JSON.parse(raw) as TrackWithBpm[];
  } catch {
    return [];
  }
}

export function isCacheStale(): boolean {
  const expiry = storage.getString(CACHE_KEY_EXPIRY);
  if (!expiry) return true;
  return Date.now() > parseInt(expiry, 10);
}

// ─── Playlists ────────────────────────────────────────────────────────────────

export async function fetchPlaylistTracks(
  token: string,
  playlistId: string,
): Promise<TrackWithBpm[]> {
  const tracks: {id: string; uri: string; name: string; artist: string; album: string; albumArt: string; durationMs: number}[] = [];
  let url = `${BASE}/playlists/${playlistId}/tracks?limit=100`;

  while (url) {
    const res = await axios.get(url, {headers: authHeader(token)});
    for (const item of res.data.items) {
      const t = item.track;
      if (!t || t.is_local) continue;
      tracks.push({
        id: t.id,
        uri: t.uri,
        name: t.name,
        artist: t.artists.map((a: {name: string}) => a.name).join(', '),
        album: t.album.name,
        albumArt: t.album.images?.[0]?.url ?? '',
        durationMs: t.duration_ms,
      });
    }
    url = res.data.next;
  }

  const ids = tracks.map(t => t.id);
  const bpmMap = await fetchAudioFeaturesBatch(token, ids);
  return tracks
    .map(t => ({...t, bpm: bpmMap[t.id] ?? 0}))
    .filter(t => t.bpm > 0);
}

export async function fetchUserPlaylists(token: string) {
  const res = await axios.get(`${BASE}/me/playlists?limit=50`, {
    headers: authHeader(token),
  });
  return res.data.items as {id: string; name: string; images: {url: string}[]}[];
}

// ─── BPM-targeted recommendations ────────────────────────────────────────────

const SEED_GENRES = ['pop', 'hip-hop', 'electronic', 'work-out'];

export async function fetchRecommendationsByBpm(
  token: string,
  targetBpm: number,
  seedTrackIds: string[] = [],
): Promise<TrackWithBpm[]> {
  const bpmRange = 6;
  const seeds = seedTrackIds.slice(0, 2).join(',');
  const genreSeeds = SEED_GENRES.slice(0, 5 - seedTrackIds.length).join(',');

  const params = new URLSearchParams({
    limit: '20',
    target_tempo: String(targetBpm),
    min_tempo: String(targetBpm - bpmRange),
    max_tempo: String(targetBpm + bpmRange),
    min_energy: '0.5',
    ...(seeds && {seed_tracks: seeds}),
    ...(genreSeeds && {seed_genres: genreSeeds}),
  });

  const res = await axios.get(`${BASE}/recommendations?${params}`, {
    headers: authHeader(token),
  });

  const tracks = res.data.tracks as {
    id: string;
    uri: string;
    name: string;
    artists: {name: string}[];
    album: {name: string; images: {url: string}[]};
    duration_ms: number;
  }[];

  const ids = tracks.map(t => t.id);
  const bpmMap = await fetchAudioFeaturesBatch(token, ids);

  return tracks
    .map(t => ({
      id: t.id,
      uri: t.uri,
      name: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      album: t.album.name,
      albumArt: t.album.images?.[0]?.url ?? '',
      durationMs: t.duration_ms,
      bpm: bpmMap[t.id] ?? 0,
    }))
    .filter(t => t.bpm > 0);
}

// ─── BPM matching ─────────────────────────────────────────────────────────────

export function matchSongsToBpm(
  songs: TrackWithBpm[],
  targetBpm: number,
  toleranceBpm = 6,
): TrackWithBpm[] {
  return songs
    .filter(s => Math.abs(s.bpm - targetBpm) <= toleranceBpm)
    .sort((a, b) => Math.abs(a.bpm - targetBpm) - Math.abs(b.bpm - targetBpm));
}
