// Builds and maintains the song queue whenever cadenceBpm changes.
// Merges liked songs from cache with fresh recommendations.

import {useEffect, useRef} from 'react';
import {useRunStore} from '../stores/runStore';
import {
  matchSongsToBpm,
  fetchRecommendationsByBpm,
  loadCachedSongs,
  syncLikedSongs,
  isCacheStale,
  type TrackWithBpm,
} from '../services/SpotifyAPI';
import {SpotifyRemoteService} from '../services/SpotifyRemoteService';

const DEBOUNCE_MS = 1500; // wait for BPM to stabilize before re-queuing

export function useSpotifyQueue() {
  const {accessToken, cadenceBpm, library, setLibrary, setQueue, setIsSyncing} =
    useRunStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueuedBpm = useRef(0);

  // Initial library sync
  useEffect(() => {
    if (!accessToken) return;

    const cached = loadCachedSongs();
    if (cached.length > 0) setLibrary(cached);

    if (isCacheStale()) {
      setIsSyncing(true);
      syncLikedSongs(accessToken)
        .then(songs => setLibrary(songs))
        .catch(console.warn)
        .finally(() => setIsSyncing(false));
    }
  }, [accessToken, setLibrary, setIsSyncing]);

  // Re-queue whenever cadence changes meaningfully (>3 BPM shift)
  useEffect(() => {
    if (!accessToken || cadenceBpm < 60) return;
    if (Math.abs(cadenceBpm - lastQueuedBpm.current) < 3) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      lastQueuedBpm.current = cadenceBpm;

      // Liked songs that match
      const matched = matchSongsToBpm(library, cadenceBpm);

      // Fresh recommendations from Spotify
      let recs: TrackWithBpm[] = [];
      try {
        const seedIds = matched.slice(0, 2).map(s => s.id);
        recs = await fetchRecommendationsByBpm(accessToken, cadenceBpm, seedIds);
      } catch (e) {
        console.warn('Recommendations fetch failed:', e);
      }

      // Merge: liked songs first (personalised), then new discoveries
      const seen = new Set<string>();
      const merged: TrackWithBpm[] = [];
      for (const t of [...matched, ...recs]) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          merged.push(t);
        }
      }

      setQueue(merged);
      if (merged.length > 0) {
        await SpotifyRemoteService.playQueue(merged);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cadenceBpm, accessToken, library, setQueue]);
}
