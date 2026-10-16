import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

let sdkReady;
function loadYouTubeSdk() {
  if (window.YT?.Player) return Promise.resolve();
  if (!sdkReady) {
    sdkReady = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try {
          previousReady?.();
        } finally {
          resolve();
        }
      };
      let script = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
      script.addEventListener(
        'error',
        () => {
          sdkReady = undefined;
          reject(new Error('YouTube API unavailable'));
        },
        { once: true }
      );
    });
  }
  return sdkReady;
}

export default function YouTubePlayer({
  videoId,
  onProgress,
  onTimeUpdate,
  autoPlay,
  initialTime = 0,
  onPlay,
  onPause,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const [, setIsReady] = useState(false);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const publishProgress = useEffectEvent(() => {
    const player = playerRef.current;
    if (!player?.getCurrentTime) return;
    const current = player.getCurrentTime();
    onTimeUpdate?.(current);
    const duration = player.getDuration();
    if (duration > 0) onProgress?.(Math.floor((current / duration) * 100));
  });

  const startTracking = useEffectEvent(() => {
    stopTracking();
    intervalRef.current = setInterval(() => {
      publishProgress();
    }, 1000); // Check every second
  });
  const readInitialOptions = useEffectEvent(() => ({ autoPlay, initialTime }));
  const notifyPlay = useEffectEvent(() => onPlay?.());
  const notifyPause = useEffectEvent(() => onPause?.());

  useEffect(() => {
    let disposed = false;
    // We attach it to a specific object so we don't accidentally redefine window.onYouTubeIframeAPIReady if multiple mounts
    const initPlayer = () => {
      if (disposed || playerRef.current) return;
      const options = readInitialOptions();
      const host = document.createElement('div');
      containerRef.current.replaceChildren(host);
      playerRef.current = new window.YT.Player(host, {
        videoId: videoId,
        playerVars: {
          autoplay: options.autoPlay ? 1 : 0,
          controls: 0, // Disable visual controls, but allow clicks
          disablekb: 0, // Enable keyboard controls (Space, K, etc.)
          modestbranding: 1,
          rel: 0,
          start: options.initialTime > 0 ? Math.floor(options.initialTime) : 0,
        },
        events: {
          onReady: (event) => {
            setIsReady(true);
            if (readInitialOptions().autoPlay) {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startTracking();
              notifyPlay();
            } else {
              stopTracking();
              if (
                event.data === window.YT.PlayerState.PAUSED ||
                event.data === window.YT.PlayerState.ENDED
              ) {
                notifyPause();
              }
            }
          },
        },
      });
    };

    loadYouTubeSdk()
      .then(initPlayer)
      .catch(() => {
        /* Keep the page usable when YouTube is blocked. */
      });

    return () => {
      disposed = true;
      stopTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, stopTracking]);

  return <div ref={containerRef} className="w-full h-full" />;
}
