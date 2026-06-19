const lastfm_username = process.env.LASTFM_USERNAME;
const lastfm_api_key = process.env.LASTFM_API_KEY;
const spotify_profile_url = process.env.PUBLIC_SPOTIFY_PROFILE_URL || "https://open.spotify.com/user/31n42jyzijwe5ckk4aqeidrdoroi?si=5c58209b33d34131";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Cache settings: Cache for 5 seconds to reduce rate limits
  res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=5');

  if (!lastfm_username || !lastfm_api_key) {
    return res.status(200).json({
      isPlaying: false,
      error: 'Last.fm credentials are not configured in environment variables.'
    });
  }

  try {
    const lastfmRes = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${lastfm_username}&api_key=${lastfm_api_key}&format=json&limit=1`
    );

    if (!lastfmRes.ok) {
      return res.status(200).json({ isPlaying: false, error: `Last.fm API returned status ${lastfmRes.status}` });
    }

    const lastfmData = await lastfmRes.json();
    const track = lastfmData.recenttracks?.track?.[0];

    if (!track) {
      return res.status(200).json({ isPlaying: false, note: 'No tracks found for this Last.fm user.' });
    }

    const isPlaying = track['@attr']?.nowplaying === 'true';
    const title = track.name;
    const artist = track.artist?.['#text'] || '';
    const album = track.album?.['#text'] || '';
    const albumImageUrl = (track.image && track.image.length > 0)
      ? track.image[track.image.length - 1]?.['#text'] || ''
      : '';
    const songUrl = track.url || `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`;

    let durationMs = undefined;
    let previewUrl = null;

    // Search iTunes Search API for 30s preview and track info
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&limit=1&media=music`
      );
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        if (itunesData.results && itunesData.results.length > 0) {
          const match = itunesData.results[0];
          previewUrl = match.previewUrl || null;
          if (match.trackTimeMillis) {
            durationMs = match.trackTimeMillis;
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch preview from iTunes:', e);
    }

    return res.status(200).json({
      isPlaying,
      title,
      artist,
      album,
      albumImageUrl,
      songUrl,
      durationMs,
      previewUrl,
      source: 'lastfm',
      profileUrl: spotify_profile_url
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || error.toString() });
  }
}
