import React, { useEffect, useRef, useState } from 'react';

export default function YouTubePlayer({ videoId, onProgress, onTimeUpdate, autoPlay, initialTime = 0, onPlay, onPause }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // We attach it to a specific object so we don't accidentally redefine window.onYouTubeIframeAPIReady if multiple mounts
    const initPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0, // Disable visual controls, but allow clicks
          disablekb: 0, // Enable keyboard controls (Space, K, etc.)
          modestbranding: 1,
          rel: 0,
          start: initialTime > 0 ? Math.floor(initialTime) : 0
        },
        events: {
          onReady: (event) => {
            setIsReady(true);
            if (autoPlay) {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startTracking();
              if (onPlay) onPlay();
            } else {
              stopTracking();
              if (onPause && (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED)) {
                  onPause();
              }
            }
          }
        }
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      // Store original if exists
      const originalReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (originalReady) originalReady();
        initPlayer();
      };
    } else if (window.YT && window.YT.Player) {
      initPlayer();
    }

    return () => {
      stopTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  const startTracking = () => {
    stopTracking();
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const current = playerRef.current.getCurrentTime();
        if (onTimeUpdate) {
            onTimeUpdate(current);
        }
        const duration = playerRef.current.getDuration();
        if (duration > 0 && onProgress) {
          const percent = Math.floor((current / duration) * 100);
          onProgress(percent);
        }
      }
    }, 1000); // Check every second
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return <div ref={containerRef} className="w-full h-full" />;
}
