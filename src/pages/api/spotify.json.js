import fs from 'fs';
import path from 'path';

function getEnvVariable(key) {
  // 1. Try process.env
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // 2. Try import.meta.env safely
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {}

  // 3. Read directly from .env file to support live edits without server restart
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const parts = line.split('=');
        if (parts[0] && parts[0].trim() === key) {
          return parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        }
      }
    }
  } catch (e) {
    console.error('Failed to read .env file directly:', e);
  }
  return undefined;
}

export async function GET() {
  const lastfm_username = getEnvVariable('LASTFM_USERNAME');
  const lastfm_api_key = getEnvVariable('LASTFM_API_KEY');
  const spotify_profile_url = getEnvVariable('PUBLIC_SPOTIFY_PROFILE_URL') || "https://open.spotify.com/user/31n42jyzijwe5ckk4aqeidrdoroi?si=5c58209b33d34131";

  if (!lastfm_username || !lastfm_api_key) {
    return new Response(
      JSON.stringify({
        isPlaying: false,
        error: 'Last.fm credentials are not configured. Please add LASTFM_USERNAME and LASTFM_API_KEY to your .env file.'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  try {
    const lastfmRes = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${lastfm_username}&api_key=${lastfm_api_key}&format=json&limit=1`
    );

    if (!lastfmRes.ok) {
      return new Response(
        JSON.stringify({ isPlaying: false, error: `Last.fm API returned status ${lastfmRes.status}` }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    const lastfmData = await lastfmRes.json();
    const track = lastfmData.recenttracks?.track?.[0];

    if (!track) {
      return new Response(
        JSON.stringify({ isPlaying: false, note: 'No tracks found for this Last.fm user.' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
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

    return new Response(
      JSON.stringify({
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
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=5'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ isPlaying: false, error: error.message || error.toString() }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
