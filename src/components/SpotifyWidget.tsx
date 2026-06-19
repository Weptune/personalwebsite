import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music, ExternalLink } from 'lucide-react';

interface SpotifyData {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
  progressMs?: number;
  durationMs?: number;
  previewUrl?: string | null;
  source?: 'spotify' | 'lastfm';
  profileUrl?: string;
}

const SPOTIFY_PROFILE_URL = import.meta.env.PUBLIC_SPOTIFY_PROFILE_URL || "https://open.spotify.com/user/31g2sn2kpe7d4b455b55555555";

export default function SpotifyWidget() {
  const [data, setData] = useState<SpotifyData | null>(null);
  const [localProgress, setLocalProgress] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<number | null>(null);
  const lastFetchedRef = useRef<number>(Date.now());

  // Fetch track data from our serverless endpoint
  const fetchSpotifyData = async () => {
    try {
      const res = await fetch('/api/spotify.json');
      if (res.ok) {
        const json: SpotifyData = await res.json();
        setData(json);
        lastFetchedRef.current = Date.now();
        if (json.progressMs !== undefined) {
          setLocalProgress(json.progressMs);
        }
      }
    } catch (err) {
      console.error('Error fetching Spotify data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpotifyData();

    // Poll Spotify player state every 10 seconds
    syncIntervalRef.current = window.setInterval(fetchSpotifyData, 10000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Update progress bar in real-time locally (simulate Spotify playback speed)
  useEffect(() => {
    if (data?.isPlaying && data?.progressMs !== undefined && data?.durationMs !== undefined) {
      // Clear any existing progress interval
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      progressIntervalRef.current = window.setInterval(() => {
        const delta = Date.now() - lastFetchedRef.current;
        const currentProgress = Math.min(data.durationMs!, data.progressMs! + delta);
        setLocalProgress(currentProgress);
      }, 250);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [data]);

  // Handle HTML5 Audio cleanup on unmount only (lazy loaded on demand now)
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePreview = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering parent redirect to profile

    if (!data?.previewUrl) return;

    // Reset audio instance if track changed
    if (audioRef.current && audioRef.current.src !== data.previewUrl) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPreviewPlaying(false);
    }

    if (!audioRef.current) {
      const audio = new Audio(data.previewUrl);
      audio.volume = 0.35;
      audio.addEventListener('ended', () => {
        setIsPreviewPlaying(false);
      });
      audioRef.current = audio;
    }

    if (isPreviewPlaying) {
      audioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error("Playback failed:", err));
      setIsPreviewPlaying(true);
    }
  };

  const handleWidgetClick = () => {
    const targetUrl = data?.profileUrl || SPOTIFY_PROFILE_URL;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Helper to format milliseconds to minutes:seconds
  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="gothic-panel p-4 flex items-center space-x-4 animate-pulse">
        <div className="w-12 h-12 bg-muted/30 rounded-md"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted/30 rounded w-3/4"></div>
          <div className="h-3 bg-muted/30 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const { 
    isPlaying = false, 
    title = "Silence is golden", 
    artist = "Offline / Not listening", 
    album = "", 
    albumImageUrl = "", 
    songUrl = "", 
    durationMs,
    source = 'lastfm'
  } = data || {};
  const progressPercent = durationMs ? (localProgress / durationMs) * 100 : 0;

  return (
    <div 
      onClick={handleWidgetClick}
      className="gothic-panel cursor-pointer group flex flex-col p-4 w-full relative transition-all duration-300 hover:scale-[1.01] hover:border-primary/40 shadow-lg hover:shadow-primary/5 select-none"
    >
      {/* Listening State Badge */}
      <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {isPlaying ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="font-bold text-primary">
                Listening now (via Last.fm)
              </span>
            </>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-slate-500"></span>
              <span>{source === 'lastfm' ? 'Recently Played (Last.fm)' : 'Recently Played / Offline'}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60 group-hover:text-primary transition-colors">
          <span>View Profile</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </div>
      </div>

      {/* Main Track Detail Area */}
      {title ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 min-w-0">
            {/* Album Art with pulse/spin effect */}
            {albumImageUrl ? (
              <div className="relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden shadow-md">
                <img 
                  src={albumImageUrl} 
                  alt={album || 'Album Art'} 
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                    isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''
                  }`}
                />
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
              </div>
            ) : (
              <div className="w-14 h-14 bg-muted flex items-center justify-center rounded-md text-muted-foreground">
                <Music className="w-6 h-6" />
              </div>
            )}

            {/* Title / Artist info */}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold truncate text-foreground leading-tight group-hover:text-primary transition-colors">
                {title}
              </h4>
              <p className="text-xs text-muted-foreground truncate mt-1">
                by {artist}
              </p>
              {album && (
                <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                  on {album}
                </p>
              )}
            </div>
          </div>

          {/* Player controls / Waveform animation */}
          <div className="flex items-center space-x-4 ml-auto md:ml-0 flex-shrink-0">
            {/* Sound waves graphic */}
            {isPlaying && (
              <div className="flex items-end justify-center space-x-[2.5px] h-5 w-6 pb-[2px]">
                <div className="w-[3px] rounded-full spotify-bar-1 bg-primary"></div>
                <div className="w-[3px] rounded-full spotify-bar-2 bg-primary"></div>
                <div className="w-[3px] rounded-full spotify-bar-3 bg-primary"></div>
                <div className="w-[3px] rounded-full spotify-bar-4 bg-primary"></div>
              </div>
            )}

            {/* Play Preview button */}
            {data?.previewUrl ? (
              <button 
                onClick={togglePreview}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:scale-105 transition-all select-none active:scale-95 focus:outline-none"
                title={isPreviewPlaying ? "Pause Preview" : "Play 30s Preview"}
              >
                {isPreviewPlaying ? (
                  <Pause className="w-4 h-4 fill-primary" />
                ) : (
                  <Play className="w-4 h-4 fill-primary translate-x-[1px]" />
                )}
              </button>
            ) : (
              <button 
                disabled
                className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500/40 cursor-not-allowed select-none focus:outline-none"
                title="Preview unavailable for this track"
              >
                <Play className="w-4 h-4 translate-x-[1px]" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-muted-foreground">
          No song currently playing.
        </div>
      )}

      {/* Progress Bar (like Discord status) */}
      {isPlaying && durationMs !== undefined && data?.progressMs !== undefined && (
        <div className="mt-4 space-y-1.5">
          <div className="w-full h-1 bg-muted/40 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80">
            <span>{formatTime(localProgress)}</span>
            <span>{formatTime(durationMs)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
