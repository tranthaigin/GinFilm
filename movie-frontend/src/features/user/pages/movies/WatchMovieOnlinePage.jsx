import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import CustomVideoPlayer from '../../components/common/CustomVideoPlayer';

import { apiPost, apiGet } from '../../../../shared/api/client';
import { getMembershipTier } from '../../../../shared/constants/membership';
import { useMembershipStore } from '../../../../shared/store/membershipStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import env from '../../../../shared/config/env';
import YouTubePlayer from '../../components/common/YouTubePlayer';

import ReviewModal from '../../components/movies/ReviewModal';
import ReportReviewModal from '../../components/movies/ReportReviewModal';
import UserPagination from '../../components/UserPagination';
import { getRawMovieDetails } from '../../api/services/movieService';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/movies`;

function getYoutubeVideoId(url) {
  if (!url) return null;

  let videoId = null;
  if (url.includes('/embed/')) {
    const parts = url.split('/embed/');
    videoId = parts[1].split('?')[0].split('&')[0];
  } else {
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) {
      videoId = watchMatch[1];
    } else {
      const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
      if (shortMatch) videoId = shortMatch[1];
    }
  }

  return videoId;
}

function formatReactionCount(count) {
  if (!count) return '';
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + ' Tr';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + ' K';
  }
  return count.toLocaleString('vi-VN');
}

let missedReviewTimeout = null;

export default function WatchMovieOnlinePage() {
  const membershipTiers = useMembershipStore((state) => state.tiers);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const movieId = searchParams.get('movieId');

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState({});
  const showToast = useToastStore(state => state.showToast);

  const ticketCode = searchParams.get('ticket') || '';
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [ticketExpired, setTicketExpired] = useState(false);
  const [kickedOut, setKickedOut] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [watchPosition, setWatchPosition] = useState(0);
  const currentVideoPositionRef = useRef(0);

  const [expandedReviews, setExpandedReviews] = useState({});
  const toggleReviewExpand = (reviewId, content) => {
    setExpandedReviews(prev => {
      const currentLimit = prev[reviewId] || 200;
      if (currentLimit >= content.length) {
        return { ...prev, [reviewId]: 200 };
      }
      return { ...prev, [reviewId]: currentLimit + 500 };
    });
  };

  // 1. Ticket expiration countdown checker
  useEffect(() => {
    if (!ticketCode) return;

    const checkExpiry = () => {
      const ticketKey = `ticket-status-${ticketCode}`;
      const savedStatus = localStorage.getItem(ticketKey);
      if (!savedStatus) {
        setError('Phiên xem đã kết thúc hoặc không hợp lệ. Vui lòng xác thực lại mã PIN.');
        return;
      }

      const statusObj = JSON.parse(savedStatus);
      const limitMinutes = statusObj.timeLimitMinutes || 0;
      const consumedStr = localStorage.getItem(`ticket-consumed-${ticketCode}`) || statusObj.consumedTimeSeconds || 0;
      const consumedSecondsNum = parseInt(consumedStr, 10);

      let isExpired = false;

      // Check absolute expiry (48 hours)
      if (statusObj.expiresAt && Date.now() >= statusObj.expiresAt) {
        isExpired = true;
      }

      // Check quota
      const remainingSeconds = (limitMinutes * 60) - consumedSecondsNum;
      if (remainingSeconds <= 0) {
        isExpired = true;
      }

      if (isExpired) {
        setTicketExpired(true);
        setTimeLeftStr('00:00:00');
      } else {
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = Math.floor(remainingSeconds % 60);
        setTimeLeftStr(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 1000);
    
    // Increment mount count globally on module scope to track Strict Mode double-invocations
    window.__watch_page_mount_count = (window.__watch_page_mount_count || 0) + 1;

    return () => {
      clearInterval(interval);
      window.__watch_page_mount_count--;
      setTimeout(() => {
        if (window.__watch_page_mount_count === 0) {
          localStorage.removeItem(`ticket-status-${ticketCode}`);
        }
      }, 200);
    };
  }, [ticketCode]);

  const handleResumeChoice = (resume) => {
    if (resume) {
      setInitialTime(watchPosition);
      setHasStarted(true);
      setIsPlaying(true);
    } else {
      setInitialTime(0);
    }
    setShowResumePrompt(false);
  };

  // 2. Concurrent streaming force BAN checker
  useEffect(() => {
    if (!ticketCode) return;

    const checkConcurrency = async () => {
      const myDeviceId = localStorage.getItem('device_id');
      if (!myDeviceId) return;

      try {
        const response = await apiPost('/tickets/check-session', { ticketCode, deviceId: myDeviceId });
        if (!response.isValid) {
          setKickedOut(true);
        }
      } catch (err) {
        console.error('Lỗi kiểm tra session:', err);
        // Do not kick out user on network error
      }
    };

    const interval = setInterval(checkConcurrency, 3000);
    return () => clearInterval(interval);
  }, [ticketCode]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fade out global components like chat widget when playing
  useEffect(() => {
    if (hasStarted && !isScrolled) {
      document.body.classList.add('movie-playing-mode');
    } else {
      document.body.classList.remove('movie-playing-mode');
    }
    return () => document.body.classList.remove('movie-playing-mode');
  }, [hasStarted, isScrolled]);

  // Local 1-second tick for smooth countdown
  useEffect(() => {
    if (!isPlaying) return;
    const tickInterval = setInterval(() => {
      const currentStr = localStorage.getItem(`ticket-consumed-${ticketCode}`) || '0';
      const next = parseInt(currentStr, 10) + 1;
      localStorage.setItem(`ticket-consumed-${ticketCode}`, next.toString());
    }, 1000);
    return () => clearInterval(tickInterval);
  }, [isPlaying, ticketCode]);

  // Heartbeat loop for watch history and ticket time consumption (1s)
  useEffect(() => {
    if (!isPlaying || !movieId) return;

    const interval = setInterval(async () => {
      try {
        const payload = {
          ticketCode: ticketCode,
          movieId: movieId,
          currentPosition: Math.floor(currentVideoPositionRef.current),
          elapsedSeconds: 1
        };
        await apiPost('/watch/sync', payload);
      } catch (err) {
        console.error("Heartbeat error:", err);
        if (err.message && (err.message.includes('EXPIRED_QUOTA') || err.message.includes('EXPIRED_ABSOLUTE'))) {
          setTicketExpired(true);
          setIsPlaying(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, movieId, ticketCode]);

  // Send play/pause status to backend for real-time admin sync
  const handlePlayerPlay = () => setIsPlaying(true);
  const handlePlayerPause = () => setIsPlaying(false);

  useEffect(() => {
    if (!ticketCode || !movieId) return;

    // Broadcast status to backend (which forwards via WS)
    apiPost('/watch/status', {
      ticketCode: ticketCode,
      isPlaying: isPlaying,
      currentPosition: Math.floor(currentVideoPositionRef.current || 0)
    }).catch(e => console.error("Failed to sync status", e));
  }, [isPlaying, ticketCode, movieId]);

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  const { user: currentUser, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để tiếp tục xem phim', 'error');
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate, showToast]);

  const [maxWatchedPercent, setMaxWatchedPercent] = useState(() => {
    if (!movieId) return 0;
    const key = `watchedPercent_${movieId}_${ticketCode || 'free'}`;
    const saved = localStorage.getItem(key);
    return saved ? parseFloat(saved) : 0;
  });

  useEffect(() => {
    if (movieId && maxWatchedPercent > 0) {
      const key = `watchedPercent_${movieId}_${ticketCode || 'free'}`;
      localStorage.setItem(key, maxWatchedPercent.toString());
    }
  }, [maxWatchedPercent, movieId, ticketCode]);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showReviewWarning, setShowReviewWarning] = useState(false);


  const reviewStatusRef = useRef({ canReview, maxWatchedPercent, movieId, ticketCode, movieTitle: movie?.title });

  useEffect(() => {
    reviewStatusRef.current = { canReview, maxWatchedPercent, movieId, ticketCode, movieTitle: movie?.title };
  }, [canReview, maxWatchedPercent, movieId, ticketCode, movie?.title]);

  useEffect(() => {
    // Clear any pending reminder when entering the watch page
    localStorage.removeItem('pendingReviewTimestamp');
    localStorage.removeItem('pendingReviewMovieId');
    localStorage.removeItem('pendingReviewTicketCode');
    localStorage.removeItem('pendingReviewMovieTitle');

    const handleBeforeUnload = () => {
      const status = reviewStatusRef.current;
      if (status.canReview && status.maxWatchedPercent >= 80) {
        const hasReminded = localStorage.getItem(`hasRemindedReview_${status.movieId}_${status.ticketCode || ''}`);
        if (!hasReminded) {
          localStorage.setItem('pendingReviewTimestamp', Date.now().toString());
          localStorage.setItem('pendingReviewMovieId', status.movieId || '');
          localStorage.setItem('pendingReviewTicketCode', status.ticketCode || '');
          localStorage.setItem('pendingReviewMovieTitle', status.movieTitle || '');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cleanup runs when the component unmounts (user leaves the page via React Router)
      const status = reviewStatusRef.current;
      if (status.canReview && status.maxWatchedPercent >= 80) {
        const hasReminded = localStorage.getItem(`hasRemindedReview_${status.movieId}_${status.ticketCode || ''}`);
        if (!hasReminded) {
          localStorage.setItem('pendingReviewTimestamp', Date.now().toString());
          localStorage.setItem('pendingReviewMovieId', status.movieId || '');
          localStorage.setItem('pendingReviewTicketCode', status.ticketCode || '');
          localStorage.setItem('pendingReviewMovieTitle', status.movieTitle || '');
        }
      }
    };
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [reportModalReviewId, setReportModalReviewId] = useState(null);

  const handleReaction = async (reviewId, isLike) => {
    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để phản hồi đánh giá", "error");
      return;
    }
    try {
      const res = await apiPost('/reviews/react', { reviewId, isLike });
      setReviews(prev => prev.map(r => r.id === reviewId ? res : r));
    } catch (err) {
      showToast(err.message || 'Lỗi khi phản hồi đánh giá', "error");
    }
  };

  const handleReportReview = async (reviewId, reason, subReason, details) => {
    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để báo cáo đánh giá", "error");
      return false;
    }
    try {
      let finalReason = reason;
      if (['HARASSMENT', 'SPAM', 'IRRELEVANT'].includes(reason)) {
        finalReason = subReason;
      }
      const data = {
        reviewId: reviewId,
        reason: finalReason,
        details: details.trim()
      };
      await apiPost(`/reviews/report`, data);
      
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      return true;
    } catch (err) {
      showToast(err.message || 'Lỗi khi báo cáo', "error");
      return false;
    }
  };

  // Fetch movie data from API
  useEffect(() => {

    const fetchMovie = async () => {
      try {
        setLoading(true);
        setIsPlaying(false);
        const data = await getRawMovieDetails(movieId);
        setMovie(data);

        // Fetch watch history
        if (isAuthenticated) {
          try {
            const historyData = await apiGet(`/watch/history/${movieId}${ticketCode ? `?ticketCode=${ticketCode}` : ''}`);
            if (historyData) {
              if (historyData.position > 10) {
                setWatchPosition(historyData.position);
                setShowResumePrompt(true);
              } else {
                setInitialTime(0);
              }
              if (historyData.consumedTimeSeconds !== undefined) {
                localStorage.setItem(`ticket-consumed-${ticketCode}`, historyData.consumedTimeSeconds.toString());
              }
            }
          } catch (err) {
            console.error("Could not fetch history:", err);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải phim:', err);
        setError('Không thể tải thông tin phim. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [movieId, location.search, isAuthenticated, ticketCode]);

  // Fetch reviews từ backend
  useEffect(() => {
    if (!movieId) return;
    const fetchReviews = async () => {
      try {
        // Lấy dữ liệu phân trang, backend index từ 0
        const data = await apiGet(`/reviews/movie/${movieId}?page=${currentPage - 1}`);
        if (data && data.content) {
          setReviews(data.content);
          setTotalPages(data.totalPages);
        } else if (Array.isArray(data)) {
          setReviews(data);
          setTotalPages(Math.max(1, Math.ceil(data.length / 10)));
        }
      } catch (err) {
        console.error('Lỗi khi tải đánh giá:', err);
      }
    };
    fetchReviews();
  }, [movieId, currentPage]);

  // Kiểm tra user hiện tại có thể review tiếp không và lấy các review của user
  useEffect(() => {
    if (!movieId || !isAuthenticated) return;
    const fetchMyReviews = async () => {
      try {
        const data = await apiGet(`/reviews/my/${movieId}`);
        if (data) {
          setCanReview(data.canReview || false);
        } else {
          setCanReview(false);
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra lượt đánh giá:', err);
        setCanReview(false);
      }
    };
    fetchMyReviews();
  }, [movieId, isAuthenticated]);

  // Thiết lập kết nối WebSocket để cập nhật đánh giá realtime
  useEffect(() => {
    if (!movieId) return;

    // Vite server proxy sẽ forward /ws tới backend http://localhost:8080/ws
    const wsUrl = env.wsUrl || '/ws';
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      debug: () => {},
      onConnect: () => {
        client.subscribe(`/topic/reviews/${movieId}`, (message) => {
          if (message.body) {
            const updatedReview = JSON.parse(message.body);
            setReviews(prevReviews => {
              if (updatedReview.status === 'DELETED') {
                return prevReviews.filter(r => r.id !== updatedReview.id);
              }
              const exists = prevReviews.some(r => r.id === updatedReview.id);
              if (exists) {
                return prevReviews.map(r => {
                  if (r.id === updatedReview.id) {
                    return {
                      ...updatedReview,
                      likedByMe: r.likedByMe,
                      dislikedByMe: r.dislikedByMe,
                      reportedByMe: r.reportedByMe
                    };
                  }
                  return r;
                });
              }
              return [updatedReview, ...prevReviews];
            });
          }
        });
      },
      onStompError: (frame) => {
        console.error('WebSocket connection error:', frame);
      }
    });

    client.activate();

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [movieId]);

  const handleSubmitReview = async (rate, text) => {
    if (!isAuthenticated) {
      return { success: false, error: 'Vui lòng đăng nhập để viết đánh giá.' };
    }
    if (maxWatchedPercent < 80) {
      return { success: false, error: 'Bạn cần xem ít nhất 80% thời lượng phim để đánh giá.' };
    }

    try {
      const saved = await apiPost('/reviews', {
        movieId: parseInt(movieId),
        rating: rate,
        content: text,
        watchedPercent: Math.floor(maxWatchedPercent)
      });

      if (saved.status !== 'HIDDEN') {
        setReviews(prev => {
          if (prev.some(r => r.id === saved.id)) return prev;
          return [saved, ...prev];
        });
      } else {
        alert("Đánh giá của bạn chứa từ cấm và đã bị ẩn.");
      }

      setCanReview(false);
      setIsReviewModalOpen(false);
      return { success: true };
    } catch (err) {
      const msg = err?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.';
      return { success: false, error: msg };
    }
  };

  // Helper format username (bỏ @gmail.com)
  const getDisplayUsername = (usernameOrEmail) => {
    if (!usernameOrEmail) return 'user';
    return usernameOrEmail.split('@')[0];
  };

  // Helper lấy avatar URL từ user
  const getUserAvatarUrl = (username) => {
    const displayUsername = getDisplayUsername(username);
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(displayUsername)}&backgroundColor=transparent`;
  };

  // Lấy chữ cái đầu username cho fallback avatar
  const getAvatarInitial = (username) => {
    const displayUsername = getDisplayUsername(username);
    return displayUsername.charAt(0).toUpperCase();
  };

  // Remove scroll-based cinema mode as it causes layout jumping
  const isCinemaMode = false;

  // Removed Fullscreen Mode logic as it was unused
  const videoWrapperRef = useRef(null);

  // Derived data from movie
  const movieTitle = movie?.title || 'Đang tải...';
  const movieDescription = movie?.description || '';

  const descRef = useRef(null);
  const [showReadMore, setShowReadMore] = useState(false);

  useEffect(() => {
    if (descRef.current) {
      setShowReadMore(descRef.current.scrollHeight > descRef.current.clientHeight);
    }
  }, [movieDescription]);
  const realMovieDuration = movie?.duration || 120;
  const movieReleaseYear = movie?.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
  const movieGenres = movie?.genres || [];
  const moviePoster = movie?.posterUrl || null;
  const movieAgeRating = movie?.ageRating || '';

  // Video URL - use videoUrl from DB, fall back to trailerUrl
  const rawVideoUrl = movie?.videoUrl || movie?.trailerUrl || null;
  const isYouTubeVideo = rawVideoUrl ? (rawVideoUrl.includes('youtube.com') || rawVideoUrl.includes('youtu.be')) : false;

  const youtubeVideoId = getYoutubeVideoId(rawVideoUrl);

  // Trailer URL (always use trailerUrl)
  const rawTrailerUrl = movie?.trailerUrl || null;
  const trailerVideoId = getYoutubeVideoId(rawTrailerUrl);
  const trailerEmbedUrl = trailerVideoId ? `https://www.youtube.com/embed/${trailerVideoId}` : rawTrailerUrl;

  // Cập nhật % xem phim dựa trên tiến độ thực tế của video player thay vì setInterval
  const handleVideoProgress = useCallback((percent) => {
    setMaxWatchedPercent(prev => Math.max(prev, percent));
  }, []);

  // Concurrency kickout check
  if (kickedOut) {
    return (
      <div className="flex min-h-screen flex-col text-[#111827] dark:text-white font-sans bg-[#FAFAFA] dark:bg-black">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 text-center max-w-md px-4">
            <span className="material-symbols-outlined text-[64px] text-[#dc2626] animate-bounce">warning</span>
            <div>
              <h2 className="text-2xl font-bold text-[#111827] dark:text-white mb-2">Mất Kết Nối Phiên Xem!</h2>
              <p className="text-gray-500 dark:text-[#9D9D9D]">Vé này đang được xem trên một thiết bị khác. Phiên xem này của bạn đã bị ngắt kết nối để bảo vệ quyền lợi.</p>
            </div>
            <Link to="/home" className="bg-[#e61a27] hover:bg-red-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_4px_12px_rgba(230,26,39,0.3)]">
              Quay lại Trang Chủ
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Ticket expired check
  if (ticketExpired) {
    return (
      <div className="flex min-h-screen flex-col text-[#111827] dark:text-white font-sans bg-[#FAFAFA] dark:bg-black">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 text-center max-w-md px-4">
            <span className="material-symbols-outlined text-[64px] text-[#dc2626] animate-pulse">lock_clock</span>
            <div>
              <h2 className="text-2xl font-bold text-[#111827] dark:text-white mb-2">Vé Đã Hết Hạn Xem</h2>
              <p className="text-gray-500 dark:text-[#9D9D9D]">Thời gian xem của vé trực tuyến đã hết (tối đa 300 phút kể từ thời điểm kích hoạt vé).</p>
            </div>
            <Link to="/home" className="bg-[#e61a27] hover:bg-red-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_4px_12px_rgba(230,26,39,0.3)]">
              Quay lại Trang Chủ
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading / Error states
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col text-[#111827] dark:text-white font-sans bg-[#FAFAFA] dark:bg-black">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
            <p className="text-gray-500 dark:text-[#9D9D9D] text-sm">Đang tải thông tin phim...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="flex min-h-screen flex-col text-[#111827] dark:text-white font-sans bg-[#FAFAFA] dark:bg-black">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 text-center max-w-md px-4">
            <span className="material-symbols-outlined text-[64px] text-[#dc2626]">error</span>
            <div>
              <h2 className="text-2xl font-bold text-[#111827] dark:text-white mb-2">Lỗi</h2>
              <p className="text-gray-500 dark:text-[#9D9D9D]">{error || 'Không tìm thấy phim'}</p>
            </div>
            <Link to="/my-tickets" className="bg-[#e61a27] hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors">
              Quay lại Vé Của Tôi
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalVerifiedReviews = reviews.length;
  let avgRating = 0;
  let starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (totalVerifiedReviews > 0) {
    let sum = 0;
    reviews.forEach(r => {
      sum += r.rating;
      if (r.rating >= 1 && r.rating <= 5) {
        starCounts[Math.floor(r.rating)]++;
      }
    });
    avgRating = (sum / totalVerifiedReviews).toFixed(1);
  }

  const getStarColor = (star) => {
    switch (Math.floor(star)) {
      case 5: return 'rgb(16, 185, 129)';
      case 4: return 'rgb(132, 204, 22)';
      case 3: return 'rgb(245, 158, 11)';
      case 2: return 'rgb(249, 115, 22)';
      case 1: return 'rgb(239, 68, 68)';
      default: return '#aaaaaa';
    }
  };

  return (
    <div className={`flex min-h-screen flex-col text-[#111827] dark:text-[#f1f1f1] font-sans transition-colors duration-700 ${isCinemaMode ? 'bg-black' : 'bg-white dark:bg-[#18181b]'}`}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :fullscreen {
              transition: none !important;
              max-width: none !important;
              width: 100% !important;
              height: 100% !important;
              max-height: none !important;
              aspect-ratio: auto !important;
            }
            :-webkit-full-screen {
              transition: none !important;
              max-width: none !important;
              width: 100% !important;
              height: 100% !important;
              max-height: none !important;
              aspect-ratio: auto !important;
            }
            :-ms-fullscreen {
              transition: none !important;
              max-width: none !important;
              width: 100% !important;
              height: 100% !important;
              max-height: none !important;
              aspect-ratio: auto !important;
            }
            body.movie-playing-mode #user-chat-widget,
            body.movie-playing-mode .global-scroll-to-top {
                opacity: 0 !important;
                pointer-events: none !important;
                transition: opacity 0.5s ease-in-out !important;
            }
          `,
        }}
      />

      {/* BANNED OVERLAY */}
      {kickedOut && (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#18181b] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 mb-6 text-red-500 relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
            <span className="material-symbols-outlined text-[96px] relative z-10 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">block</span>
          </div>
          <h2 className="text-3xl font-bold text-[#111827] dark:text-white mb-4">Phiên Xem Bị Hủy</h2>
          <p className="text-gray-500 dark:text-[#9D9D9D] mb-8 max-w-md text-lg">
            Mã vé này hiện đang được sử dụng trên một thiết bị khác.
            Bạn đã bị ngắt kết nối khỏi phòng chiếu.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-[#e50914] hover:bg-[#b80710] text-white font-medium rounded-xl transition-all duration-300 shadow-lg shadow-red-500/30 flex items-center gap-2 group"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">home</span>
            Về Trang Chủ
          </button>
        </div>
      )}

      {/* RESUME PROMPT MODAL */}
      {showResumePrompt && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <span className="material-symbols-outlined text-[48px] text-yellow-500 mb-4">history</span>
            <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-2">Tiếp Tục Xem?</h3>
            <p className="text-gray-500 dark:text-[#9D9D9D] mb-6 text-sm">
              Bạn đã xem tới {Math.floor(watchPosition / 60)}p{watchPosition % 60}s. Nhấn để tiếp tục xem từ vị trí đã dừng.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleResumeChoice(true)}
                className="w-full py-2.5 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-medium transition-colors shadow-lg shadow-red-500/20"
              >
                Xem Tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header ẩn/hiện tùy theo cuộn chuột và hover */}
      <div className={`sticky top-0 z-50 transition-opacity duration-500 ${kickedOut || ticketExpired || showResumePrompt ? 'opacity-0 pointer-events-none' : (!hasStarted || isScrolled) ? 'opacity-100' : 'opacity-0 hover:opacity-100 focus-within:opacity-100'}`}>
        <Header />
      </div>

      <main className="flex-1 w-full flex flex-col items-center">
        {/* Full Width Video Section */}
        <div className="w-full max-w-[1440px] mx-auto transition-all duration-700 pt-3 px-0 md:px-12">
          <div ref={videoWrapperRef} className={`relative flex justify-center w-full ${!hasStarted ? 'max-w-[800px] mx-auto aspect-video' : 'w-full aspect-video'} bg-black overflow-hidden group transition-all duration-700 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-white/10`}>
            {/* Ticket Info Overlay for YouTube */}
            {ticketCode && isPlaying && isYouTubeVideo && (
              <div className="absolute top-0 left-0 right-0 p-4 lg:p-6 bg-gradient-to-b from-black/80 to-transparent flex items-start justify-end pointer-events-none transition-opacity duration-300 z-50 opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-[#111827] dark:text-white font-bold uppercase tracking-widest bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/100 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:bg-black/60 transition-colors">
                  <span className="material-symbols-outlined text-[14px] animate-spin" style={{ animationDuration: '3s' }}>history</span>
                  THỜI GIAN CÒN LẠI: <span className="text-[#111827] dark:text-white font-mono text-[13px]">{timeLeftStr || '05:00:00'}</span>
                </div>
              </div>
            )}

            {rawVideoUrl ? (
              !hasStarted ? (
                <div
                  className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center bg-cover bg-center bg-no-repeat bg-white dark:bg-black"
                  style={moviePoster ? { backgroundImage: `url(${moviePoster})` } : {}}
                  onClick={() => {
                    setHasStarted(true);
                    setIsPlaying(true);
                  }}
                >
                  <div className="absolute inset-0 bg-black/30 hover:bg-black/10 transition-colors duration-300"></div>
                  <div className="relative z-10 w-14 h-14 rounded-full bg-[#dc2626] text-white flex items-center justify-center hover:bg-red-500 transition-transform hover:scale-110 shadow-lg">
                    <span className="material-symbols-outlined text-[32px] ml-1">play_arrow</span>
                  </div>
                </div>
              ) : (
                !isYouTubeVideo ? (
                  <CustomVideoPlayer
                    src={rawVideoUrl}
                    autoPlay={true}
                    ticketCode={ticketCode}
                    timeLeftStr={timeLeftStr}
                    initialTime={initialTime}
                    onTimeUpdate={(time) => { currentVideoPositionRef.current = time; }}
                    onProgress={handleVideoProgress}
                    onOpenReviewModal={() => {
                      if (!canReview) {
                        showToast("Bạn đã sử dụng hết lượt đánh giá. Vui lòng mua thêm vé để đánh giá tiếp.", "error");
                        return;
                      }
                      setIsReviewModalOpen(true);
                    }}
                    canReview={maxWatchedPercent >= 80 && canReview}
                    maxWatchedPercent={maxWatchedPercent}
                    onPlay={handlePlayerPlay}
                    onPause={handlePlayerPause}
                  />
                ) : (
                  <div className="relative w-full h-full group/youtube">
                    <YouTubePlayer
                      videoId={youtubeVideoId}
                      autoPlay={true}
                      initialTime={initialTime}
                      onTimeUpdate={(time) => { currentVideoPositionRef.current = time; }}
                      onProgress={handleVideoProgress}
                      onPlay={handlePlayerPlay}
                      onPause={handlePlayerPause}
                    />
                    {/* YouTube Review Warning Toast */}
                    {showReviewWarning && (
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-all duration-300">
                        <div className="bg-[#1f1f1f]/95 text-[#111827] dark:text-white text-[13px] px-5 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-center shadow-2xl flex items-center gap-2 backdrop-blur-md whitespace-nowrap">
                          <span className="material-symbols-outlined text-yellow-500 text-[18px]">info</span>
                          Bạn đã xem được <b className="text-[#111827] dark:text-white">{Math.floor(maxWatchedPercent)}%</b> thời lượng phim, vui lòng xem tới <b className="text-yellow-500">80%</b> để đánh giá.
                        </div>
                      </div>
                    )}
                  </div>
                )
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-black">
                <span className="material-symbols-outlined text-[64px] text-gray-600 mb-4">videocam_off</span>
                <h2 className="text-xl font-bold text-[#111827] dark:text-white mb-2">Chưa có video</h2>
                <p className="text-gray-500 text-sm">Video cho phim này chưa được cập nhật.</p>
              </div>
            )}
          </div>
        </div>

        {/* Content Section below video */}
        <div className={`w-full max-w-[1440px] mx-auto pt-6 px-4 md:px-8 flex flex-col gap-6 lg:gap-8 transition-all duration-700 ${(!hasStarted || isScrolled) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>

          {/* Movie Details (Poster, Info, Description) */}
          <div className="w-full mb-4">
            <div className="flex flex-col gap-6 bg-white dark:bg-black border border-gray-200 dark:border-white/10 p-4 sm:p-6 rounded-2xl shadow-xl">

              {/* Top part: Poster & Info */}
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
                {/* Poster */}
                {moviePoster ? (
                  <div className="relative w-[120px] sm:w-[160px] aspect-[2/3] rounded-xl shadow-2xl overflow-hidden flex-shrink-0 border border-gray-200 dark:border-white/10 mx-auto sm:mx-0">
                    <img src={moviePoster} alt={movieTitle} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="relative w-[120px] sm:w-[160px] aspect-[2/3] rounded-xl shadow-2xl overflow-hidden flex-shrink-0 border border-gray-200 dark:border-white/10 flex items-center justify-center bg-white dark:bg-black mx-auto sm:mx-0">
                    <span className="material-symbols-outlined text-white/20 text-[48px]">movie</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex flex-col flex-1 min-w-0 justify-center">
                  {/* Rating and Review Button */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-yellow-500 justify-center sm:justify-start">
                      {totalVerifiedReviews > 0 && (
                        <span className="text-[#111827] dark:text-white text-[15px] font-black mr-1">{avgRating}</span>
                      )}
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => {
                          const fillPercent = Math.min(100, Math.max(0, (avgRating - (s - 1)) * 100));
                          return (
                            <div key={s} className="relative inline-flex items-center justify-center">
                              {/* Ngôi sao viền xám ở dưới */}
                              <span className="material-symbols-outlined text-[16px] text-gray-500">star</span>
                              {/* Ngôi sao tô vàng đè lên trên, cắt theo % */}
                              <div
                                className="absolute top-0 left-0 overflow-hidden h-full flex items-center"
                                style={{ width: `${fillPercent}%` }}
                              >
                                <span className="material-symbols-outlined text-[16px] filled">star</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {totalVerifiedReviews > 0 && (
                        <span className="text-[#888] text-[12px] ml-1 hidden md:inline">(Dựa trên {totalVerifiedReviews} đánh giá)</span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-[22px] sm:text-[28px] font-bold leading-tight break-words mb-3 text-[#111827] dark:text-white text-center sm:text-left">
                    {movieTitle}
                  </h1>

                  {/* Ticket Code */}
                  {ticketCode && (
                    <div className="mb-4 flex items-center justify-center sm:justify-start">
                      <div className="inline-flex items-center gap-3 px-4 py-2 border border-gray-200 dark:border-white/100 rounded-xl bg-white dark:bg-black">
                        <span className="material-symbols-outlined text-[#111827] dark:text-white">confirmation_number</span>
                        <span className="text-xs md:text-sm text-[#111827] dark:text-white font-bold uppercase tracking-wider">
                          VÉ ĐANG KÍCH HOẠT: <span className="text-[#111827] dark:text-white font-mono ml-1">{ticketCode}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Duration, Year, Age Rating */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-5 text-[14px] text-gray-600 dark:text-[#aaaaaa] mb-4">
                    {realMovieDuration > 0 && (
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">schedule</span> {realMovieDuration} phút</span>
                    )}
                    {movieReleaseYear && (
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">calendar_month</span> {movieReleaseYear}</span>
                    )}
                    {movieAgeRating && (
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">person</span> {movieAgeRating}</span>
                    )}
                  </div>

                  {/* Genres */}
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                    {movieGenres.length > 0 ? movieGenres.map(g => (
                      <span key={g.id} className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 px-3 py-1 rounded-md text-[#111827] dark:text-[#d0d0d0] text-[13px] font-medium">{g.name}</span>
                    )) : (
                      <span className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 px-3 py-1 rounded-md text-[#111827] dark:text-[#d0d0d0] text-[13px] font-medium">Chưa phân loại</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom part: Description */}
              {movieDescription && (
                <div className="pt-5 border-t border-gray-200 dark:border-white/10">
                  <h3 className="text-[16px] font-bold text-[#111827] dark:text-white mb-3">Nội dung phim</h3>
                  <div className="relative">
                    <p
                      ref={descRef}
                      className="whitespace-pre-line text-[14px] leading-relaxed text-gray-500 dark:text-[#9D9D9D]"
                      style={!isDescExpanded ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}}
                    >
                      {movieDescription.replace(/(?:\r?\n\s*){2,}/g, '\n\n')}
                    </p>
                  </div>
                  {showReadMore && (
                    <button
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="mt-3 text-gray-500 dark:text-white/50 hover:text-[#111827] dark:text-white text-[13px] font-bold transition-colors uppercase tracking-wide flex items-center gap-1"
                    >
                      {isDescExpanded ? 'Ẩn bớt' : 'Hiện thêm'}
                      <span className="material-symbols-outlined text-[16px]">{isDescExpanded ? 'expand_less' : 'expand_more'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Review Section (Obsidian Style) */}
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 shadow-xl mt-6">

              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[20px] font-bold text-[#111827] dark:text-white">Đánh Giá Từ Khán Giả</h2>
              </div>

              {/* Obsidian-Style Rating Summary Box */}
              <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-10 flex flex-col md:flex-row gap-8 mb-10 shadow-lg">
                {/* Left: Overall Rating */}
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <span className="text-[12px] font-bold text-gray-500 dark:text-[#9D9D9D] uppercase tracking-widest mb-3">Đánh Giá Tổng Quan</span>
                  <div className="flex items-end justify-center gap-1 mb-3">
                    <span className="text-[72px] font-bold text-[#111827] dark:text-white leading-none tracking-tighter">{avgRating}</span>
                    <span className="text-[24px] text-gray-500 font-bold mb-3">/5</span>
                  </div>
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(s => {
                      const fillPercent = Math.min(100, Math.max(0, (avgRating - (s - 1)) * 100));
                      return (
                        <div key={s} className="relative inline-flex items-center justify-center">
                          <span className="material-symbols-outlined text-[28px] text-gray-600">star</span>
                          <div
                            className="absolute top-0 left-0 overflow-hidden h-full flex items-center"
                            style={{ width: `${fillPercent}%` }}
                          >
                            <span className="material-symbols-outlined text-[28px] text-yellow-500 filled">star</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[13px] text-gray-500 dark:text-[#9D9D9D]">Dựa trên {totalVerifiedReviews} đánh giá đã xác minh</span>
                </div>

                {/* Right: Progress Bars */}
                <div className="flex-1 flex flex-col gap-3 justify-center border-l border-gray-200 dark:border-white/10 pl-0 md:pl-12 pt-8 md:pt-0 border-t md:border-t-0 mt-8 md:mt-0">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = starCounts[star] || 0;
                    const percent = totalVerifiedReviews > 0 ? (count / totalVerifiedReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-4">
                        <span className="text-[13px] font-bold text-gray-500 dark:text-[#9D9D9D] w-12 whitespace-nowrap">{star} Sao</span>
                        <div className="flex-1 h-2.5 bg-[#222] rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${percent}%`, backgroundColor: getStarColor(star) }}
                          ></div>
                        </div>
                        <span className="text-[13px] font-bold text-gray-500 dark:text-[#9D9D9D] w-10 text-right">{Math.round(percent)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review List */}
              <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-white/10 pb-4">
                <h3 className="text-[16px] font-bold text-[#111827] dark:text-white">Đánh giá gần đây</h3>
              </div>

              <div className="flex flex-col gap-5">
                {reviews.length === 0 && (
                  <p className="text-[14px] text-gray-500 italic py-4">Chưa có đánh giá nào. Hãy là người đầu tiên viết đánh giá!</p>
                )}
                {reviews.map((review) => {
                  const isMyReview = isAuthenticated && currentUser?.username === review.username;
                  const membershipTier = getMembershipTier(review.memberPoints, membershipTiers, review.membershipTier);
                  const timeAgo = review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'Vừa xong';

                  return (
                    <div key={review.id} className={`membership-review-card membership-review-card--vip-${membershipTier.level} relative bg-white dark:bg-[#18181B] border border-gray-200 dark:border-[#27272A] rounded-xl p-4 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-[#1E1E22] hover:-translate-y-1 hover:shadow-2xl hover:border-gray-300 dark:hover:border-[#3F3F46]`}>
                      <div className="flex flex-col gap-2">
                        {/* Header: Avatar, Name, Badge, Stars, Date */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="membership-review-avatar w-12 h-12 rounded-full bg-gray-200 dark:bg-[#333] flex items-center justify-center font-bold text-[#111827] dark:text-white shrink-0 overflow-hidden text-sm border-2 border-gray-300 dark:border-[#3f3f46] shadow-sm">
                              {review.avatar ? (
                                <img
                                  src={review.avatar}
                                  alt={review.fullName || review.username}
                                  className="w-full h-full object-cover rounded-full"
                                  onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = getAvatarInitial(review.fullName || review.username); }}
                                />
                              ) : (
                                <img
                                  src={getUserAvatarUrl(review.username)}
                                  alt={review.fullName || review.username}
                                  className="w-full h-full rounded-full"
                                  onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = getAvatarInitial(review.fullName || review.username); }}
                                />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center flex-wrap gap-2 mb-1">
                                <span className="membership-review-author font-bold text-[16px] text-[#111827] dark:text-white">
                                  {review.fullName || `@${getDisplayUsername(review.username)}`}
                                </span>
                                <span
                                  className="membership-review-badge flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border tracking-wide"
                                  style={{
                                    color: membershipTier.color,
                                    backgroundColor: `${membershipTier.color}1A`,
                                    borderColor: `${membershipTier.color}33`,
                                  }}
                                >
                                  {membershipTier.name}
                                </span>
                                {isMyReview && (
                                  <span className="bg-[#1877F2]/20 text-[#1877F2] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#1877F2]/20 uppercase tracking-wider">CỦA BẠN</span>
                                )}
                                {review.hasSpoiler && (
                                  <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/20 uppercase tracking-wider">SPOILER</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <span key={s} className={`material-symbols-outlined text-[16px] ${s <= review.rating ? 'text-yellow-500 filled' : 'text-gray-600'}`}>star</span>
                                  ))}
                                </div>
                                <span className="membership-review-date text-[12px] text-gray-500 dark:text-[#9D9D9D] font-medium ml-2">{timeAgo}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="membership-review-content text-[15px] text-gray-500 dark:text-[#9D9D9D] leading-relaxed whitespace-pre-line break-words font-light">
                          {review.hasSpoiler && !revealedSpoilers[review.id] ? (
                            <div
                              className="relative w-fit rounded-md cursor-pointer group mb-1.5 border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/40 hover:bg-gray-200 dark:hover:bg-black/60 transition-colors py-2 px-3"
                              onClick={() => setRevealedSpoilers(prev => ({ ...prev, [review.id]: true }))}
                            >
                              <span className="text-[13px] font-medium text-gray-700 dark:text-white/80 group-hover:invisible">
                                Bài đánh giá này có chứa nội dung tiết lộ cốt truyện, vui lòng cân nhắc trước khi xem.
                              </span>
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[13px] font-bold text-[#111827] dark:text-white">
                                  Ấn vào để xem
                                </span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {review.content && review.content.length > (expandedReviews[review.id] || 200)
                                ? review.content.slice(0, expandedReviews[review.id] || 200) + '...'
                                : review.content}

                              {review.content && review.content.length > 200 && (
                                <div className="flex items-center gap-4 mt-2">
                                  {(expandedReviews[review.id] || 200) < review.content.length && (
                                    <button
                                      onClick={() => toggleReviewExpand(review.id, review.content)}
                                      className="text-yellow-500 hover:underline text-[13px] font-bold transition-colors"
                                    >
                                      Đọc thêm
                                    </button>
                                  )}
                                  {(expandedReviews[review.id] || 200) > 200 && (
                                    <button
                                      onClick={() => setExpandedReviews(prev => ({ ...prev, [review.id]: 200 }))}
                                      className="text-yellow-500 hover:underline text-[13px] font-bold transition-colors"
                                    >
                                      Ẩn bớt
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Footer: Helpful? */}
                        <div className="membership-review-footer flex items-center justify-between border-t border-[#3f3f46] pt-3 mt-1">
                          <div className="flex items-center gap-6 text-[13px] text-gray-500 dark:text-[#9D9D9D] font-medium">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => handleReaction(review.id, true)}
                                data-active={review.likedByMe}
                                className={`membership-review-action membership-review-like flex items-center gap-1.5 transition-all active:scale-90 ${review.likedByMe ? 'text-[#ff4d00]' : 'text-gray-500 dark:text-[#9D9D9D] hover:text-[#ff4d00]'}`}
                              >
                                <span className={`material-symbols-outlined text-[16px] ${review.likedByMe ? 'filled' : ''}`}>thumb_up</span>
                                <span>{review.likeCount > 0 ? formatReactionCount(review.likeCount) : ''}</span>
                              </button>

                              <button
                                onClick={() => handleReaction(review.id, false)}
                                data-active={review.dislikedByMe}
                                className={`membership-review-action membership-review-dislike flex items-center gap-1.5 transition-all active:scale-90 ${review.dislikedByMe ? 'text-red-500' : 'text-gray-500 dark:text-[#9D9D9D] hover:text-red-500'}`}
                              >
                                <span className={`material-symbols-outlined text-[16px] ${review.dislikedByMe ? 'filled' : ''}`}>thumb_down</span>
                                <span>{review.dislikeCount > 0 ? formatReactionCount(review.dislikeCount) : ''}</span>
                              </button>
                            </div>
                          </div>

                          {!isMyReview && (
                            <button
                              onClick={() => {
                                if (!isAuthenticated) {
                                  showToast("Vui lòng đăng nhập để báo cáo đánh giá", "error");
                                  return;
                                }
                                setReportModalReviewId(review.id);
                              }}
                              data-active={review.reportedByMe}
                              className={`membership-review-report transition-all active:scale-90 ${review.reportedByMe ? 'text-red-500' : 'text-gray-500 dark:text-[#9D9D9D] hover:text-red-500'}`}
                              disabled={review.reportedByMe}
                              title={review.reportedByMe ? 'Đã báo cáo' : 'Báo cáo'}
                            >
                              <span className="material-symbols-outlined text-[18px]">report</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <UserPagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
            </div>
          </div>
        </div>
      </main>

      <div className={`transition-opacity duration-700 ${!(!hasStarted || isScrolled) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Footer />
      </div>



      {isTrailerOpen && trailerEmbedUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setIsTrailerOpen(false)}>
          <div className="relative w-full max-w-5xl aspect-video bg-white dark:bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsTrailerOpen(false)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm border border-gray-200 dark:border-white/10 shadow-lg">
              <span className="material-symbols-outlined">close</span>
            </button>
            <iframe
              className="w-full h-full"
              src={`${trailerEmbedUrl}?autoplay=1`}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen>
            </iframe>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleSubmitReview}
        isAuthenticated={isAuthenticated}
        canReview={canReview}
      />

      <ReportReviewModal
        isOpen={!!reportModalReviewId}
        reviewId={reportModalReviewId}
        onClose={() => setReportModalReviewId(null)}
        onSubmit={handleReportReview}
      />
    </div>
  );
}
