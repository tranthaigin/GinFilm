import React, { useState, useRef, useEffect } from 'react';

function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function CustomVideoPlayer({ src, poster, autoPlay = false, ticketCode, timeLeftStr, onOpenReviewModal, canReview, maxWatchedPercent, onProgress, onTimeUpdate, initialTime = 0, onPlay, onPause }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isWaiting, setIsWaiting] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [levelIndicator, setLevelIndicator] = useState(null);
  const [showReviewWarning, setShowReviewWarning] = useState(false);

  let controlsTimeout = useRef(null);
  let levelTimeout = useRef(null);

  const triggerLevelIndicator = (type, value) => {
    setLevelIndicator({ type, value: Math.round(value * 100), id: Date.now() });
    if (levelTimeout.current) clearTimeout(levelTimeout.current);
    levelTimeout.current = setTimeout(() => {
      setLevelIndicator(null);
    }, 1500);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) onTimeUpdate(video.currentTime);
      if (video.duration && video.duration > 0 && onProgress) {
        const percent = Math.floor((video.currentTime / video.duration) * 100);
        onProgress(percent);
      }
    };
    const updateDuration = () => {
        setDuration(video.duration);
        if (initialTime > 0) {
            video.currentTime = initialTime;
        }
    };
    const handleEnded = () => { setIsPlaying(false); if(onPause) onPause(); };
    const handleWaiting = () => setIsWaiting(true);
    const handlePlaying = () => setIsWaiting(false);
    const handleCanPlay = () => setIsWaiting(false);
    
    const handleNativePlay = () => { setIsPlaying(true); if(onPlay) onPlay(); };
    const handleNativePause = () => { setIsPlaying(false); if(onPause) onPause(); };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handleNativePlay);
    video.addEventListener('pause', handleNativePause);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handleNativePlay);
      video.removeEventListener('pause', handleNativePause);
    };
  }, [src, initialTime]); // Removed onPlay/onPause to prevent constant re-attachment

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      // Đồng bộ hóa trạng thái volume trước khi autoplay để đảm bảo có tiếng
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
    }
  }, [autoPlay, src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      const activeType = document.activeElement?.type;
      const isTextInput = activeTag === 'INPUT' && !['range', 'checkbox', 'radio', 'button', 'submit'].includes(activeType);
      
      if (isTextInput || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          if (activeTag === 'BUTTON') return; // Let button handle native Space click
          e.preventDefault();
          if (video.paused) {
            video.play();
            setIsPlaying(true);
          } else {
            video.pause();
            setIsPlaying(false);
          }
          break;
        case 'k':
          e.preventDefault();
          if (video.paused) {
            video.play();
            setIsPlaying(true);
          } else {
            video.pause();
            setIsPlaying(false);
          }
          break;
        case 'm':
          if (video.volume === 0 || isMuted) {
            const newVol = volume > 0 ? volume : 1;
            video.volume = newVol;
            video.muted = false;
            setIsMuted(false);
          } else {
            video.volume = 0;
            video.muted = true;
            setIsMuted(true);
          }
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'escape':
          setIsTheaterMode(false);
          break;
        case 't':
          setIsTheaterMode(prev => !prev);
          break;
        case 'i':
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
          } else if (video.requestPictureInPicture) {
            video.requestPictureInPicture();
          }
          break;
        case 'arrowup':
          e.preventDefault();
          {
            const newVol = Math.min(1, video.volume + 0.05);
            video.volume = newVol;
            video.muted = newVol === 0;
            setVolume(newVol);
            setIsMuted(newVol === 0);
            triggerLevelIndicator('volume', newVol);
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          {
            const newVol = Math.max(0, video.volume - 0.05);
            video.volume = newVol;
            video.muted = newVol === 0;
            setVolume(newVol);
            setIsMuted(newVol === 0);
            triggerLevelIndicator('volume', newVol);
          }
          break;
        case 'n':
          setBrightness(prev => {
            const newB = Math.min(2, prev + 0.1);
            triggerLevelIndicator('brightness', newB / 2); // Show as percentage of max (or just newB)
            return newB;
          });
          break;
        case 'b':
          setBrightness(prev => {
            const newB = Math.max(0.1, prev - 0.1);
            triggerLevelIndicator('brightness', newB / 2);
            return newB;
          });
          break;
        case '>':
        case '.':
          e.preventDefault();
          if (e.shiftKey) {
            video.playbackRate = Math.min(2, video.playbackRate + 0.25);
          }
          break;
        case '<':
        case ',':
          e.preventDefault();
          if (e.shiftKey) {
            video.playbackRate = Math.max(0.25, video.playbackRate - 0.25);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted, duration]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        // Đồng bộ hóa trạng thái volume trước khi phát để đảm bảo có tiếng
        videoRef.current.muted = isMuted;
        videoRef.current.volume = isMuted ? 0 : volume;
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      const newVol = volume > 0 ? volume : 1;
      if (videoRef.current) {
        videoRef.current.volume = newVol;
        videoRef.current.muted = false;
      }
      setVolume(newVol);
      setIsMuted(false);
    } else {
      if (videoRef.current) {
        videoRef.current.volume = 0;
        videoRef.current.muted = true;
      }
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  const getMediaUrl = (url) => {
    if (!url || !url.startsWith('s3://')) return url;
    const key = url.slice(5).split('/').slice(1).join('/');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    const baseUrl = apiUrl.replace(/\/+$/, '');
    const base = `${baseUrl}/media/stream?key=${encodeURIComponent(key)}`;
    return ticketCode ? `${base}&ticketCode=${ticketCode}` : base;
  };

  return (
    <div
      ref={containerRef}
      className={`bg-black select-none flex items-center justify-center overflow-hidden ${isTheaterMode && !isFullscreen ? 'fixed top-16 left-0 w-screen h-[calc(100vh-64px)] z-[60]' : 'relative w-full h-full'} ${!showControls && isPlaying ? 'cursor-none' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`relative w-full h-full max-w-full max-h-full group flex flex-col justify-center`}>
        <video
          ref={videoRef}
          src={getMediaUrl(src)}
          poster={poster}
          disablePictureInPicture
          muted={autoPlay}
          style={{ filter: `brightness(${brightness})` }}
          className={`block object-contain transition-transform duration-500 w-full h-full max-w-full ${!isFullscreen ? 'max-h-full' : 'max-h-screen'} ${!showControls && isPlaying ? 'cursor-none' : 'cursor-pointer'}`}
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
        />

        {/* Review Warning Toast */}
        {showReviewWarning && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-all duration-300">
            <div className="bg-[#1f1f1f]/95 text-white text-[13px] px-5 py-3 rounded-xl border border-white/10 text-center shadow-2xl flex items-center gap-2 backdrop-blur-md whitespace-nowrap">
              <span className="material-symbols-outlined text-yellow-500 text-[18px]">info</span>
              Bạn đã xem được <b className="text-white">{Math.floor(maxWatchedPercent)}%</b> thời lượng phim, vui lòng xem tới <b className="text-yellow-500">80%</b> để đánh giá.
            </div>
          </div>
        )}

        {/* Ticket Info Overlay (Top) */}
        {ticketCode && (
          <div className={`absolute top-0 left-0 right-0 p-4 lg:p-6 bg-gradient-to-b from-black/80 to-transparent flex items-start justify-end pointer-events-none transition-opacity duration-300 z-50 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-white font-bold uppercase tracking-widest bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/100 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:bg-black/60 transition-colors">
              <span className="material-symbols-outlined text-[14px] animate-spin" style={{ animationDuration: '3s' }}>history</span>
              THỜI GIAN CÒN LẠI: <span className="text-white font-mono text-[13px]">{timeLeftStr || '05:00:00'}</span>
            </div>
          </div>
        )}

        {/* Play/Pause Overlay Button when paused */}
        {!isPlaying && !isWaiting && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center transition-opacity" onClick={togglePlay}>
            <div className="w-16 h-16 rounded-full bg-[#ff2a2a] text-white flex items-center justify-center hover:bg-red-500 transition-transform hover:scale-110 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[2px]">
                <polygon points="7 4 19 12 7 20 7 4"></polygon>
              </svg>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isWaiting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/20">
            <div className="w-16 h-16 border-[3px] border-white/20 border-t-orange-400 rounded-full animate-spin"></div>
          </div>
        )}

        {/* Level Indicator (Volume/Brightness) */}
        {levelIndicator && (
          <div key={levelIndicator.id} className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-black/70 rounded-full px-5 py-2 flex items-center gap-2 text-white animate-level-indicator backdrop-blur-sm border border-white/10 shadow-lg">
              <span className="material-symbols-outlined text-[22px]">
                {levelIndicator.type === 'volume'
                  ? (levelIndicator.value === 0 ? 'volume_off' : levelIndicator.value > 50 ? 'volume_up' : 'volume_down')
                  : 'light_mode'}
              </span>
              <span className="font-bold text-[15px]">{levelIndicator.value}%</span>
            </div>
          </div>
        )}

      </div>

      {/* Custom Controls Bar - Moved to outer container for full width */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'} z-40`}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress Bar (Read-only) */}
        <div className="relative w-full h-1.5 bg-white/20 flex items-center">
          <div
            className="absolute left-0 top-0 h-full bg-red-600 pointer-events-none transition-all duration-300 linear"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full shadow-lg translate-x-1/2"></div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white px-4 py-3">
          {/* Left Controls */}
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="hover:text-red-500 hover:border-red-500 border-2 border-white transition-colors flex items-center justify-center w-10 h-10 rounded-full outline-none focus:outline-none focus:ring-0">
              <span className="material-symbols-outlined text-[26px]">{isPlaying ? 'pause' : 'play_arrow'}</span>
            </button>
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="hover:text-red-500 transition-colors flex items-center outline-none focus:outline-none focus:ring-0">
                <span className="material-symbols-outlined text-[28px]">
                  {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                </span>
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 flex items-center">
                <div className="relative w-16 h-1 bg-white/30 rounded-full flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className="absolute left-0 top-0 h-full bg-[#dc2626] rounded-full pointer-events-none"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-600 rounded-full shadow-md scale-0 group-hover/volume:scale-100 transition-transform"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[14px] font-medium tracking-wide flex items-center gap-1 opacity-90 ml-2">
              <span>{formatTime(currentTime)}</span>
              <span className="opacity-50">/</span>
              <span className="opacity-70">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4">
            {onOpenReviewModal && (
              <div className="relative flex justify-center">
                <button 
                  onClick={() => {
                    if (maxWatchedPercent < 80) {
                      setShowReviewWarning(true);
                      setTimeout(() => setShowReviewWarning(false), 3000);
                    } else {
                      onOpenReviewModal();
                    }
                  }}
                  className={`bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold py-1.5 px-4 rounded-full transition-colors flex items-center gap-1 ${!canReview ? 'opacity-60 grayscale cursor-not-allowed hover:bg-blue-600' : ''}`}
                >
                  <span className="material-symbols-outlined text-[16px]">reviews</span>
                  Đánh Giá
                </button>
              </div>
            )}
            <button onClick={toggleFullscreen} className="hover:text-red-500 transition-colors flex items-center outline-none focus:outline-none focus:ring-0">
              <span className="material-symbols-outlined text-[28px]">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
