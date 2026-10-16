import apiEnvironment from '../../../../shared/config/env';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect, useSyncExternalStore } from 'react';
import { getAgeRatingColor } from '../../../../shared/utils/movieHelpers';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { apiPost } from '../../../../shared/api/client';
import { getPromotions } from '../../api/services/promotionService';
import { getRawMovies } from '../../api/services/movieService';
import {
  getCloudinaryImageSrcSet,
  getCloudinaryImageUrl,
} from '../../../../shared/utils/cloudinaryImages';

const HERO_POSTER_WIDTHS = [220, 280, 340, 440, 560, 680];
const MOVIE_CARD_WIDTHS = [240, 320, 480, 640, 800];
const PROMOTION_WIDTHS = [320, 480, 640, 720];
const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

const getResponsiveCloudinaryImageProps = (
  src,
  { width, height, widths, sizes, aspectRatio, ...options }
) => {
  const srcSet = getCloudinaryImageSrcSet(src, widths, {
    ...options,
    aspectRatio,
  });

  return {
    src: getCloudinaryImageUrl(src, { ...options, width, height }),
    ...(srcSet ? { srcSet, sizes } : {}),
  };
};

const subscribeToDesktopMediaQuery = (onStoreChange) => {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', onStoreChange);
    return () => mediaQuery.removeEventListener('change', onStoreChange);
  }

  mediaQuery.addListener(onStoreChange);
  return () => mediaQuery.removeListener(onStoreChange);
};

const getDesktopMediaSnapshot = () =>
  typeof window !== 'undefined' &&
  window.matchMedia(DESKTOP_MEDIA_QUERY).matches;

const useDesktopMediaQuery = () =>
  useSyncExternalStore(
    subscribeToDesktopMediaQuery,
    getDesktopMediaSnapshot,
    () => false
  );

const formatPromoDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

function getYoutubeEmbedUrl(url, ticketCode) {
  if (!url) return null;

  let s3Key = null;
  if (url.startsWith('s3://')) {
    s3Key = url.slice(5).split('/').slice(1).join('/');
  } else if (url.includes('.amazonaws.com/')) {
    s3Key = url.split('.amazonaws.com/')[1];
  }

  if (s3Key) {
    const apiUrl = apiEnvironment.apiBaseUrl;
    const baseUrl = apiUrl.replace(/\/+$/, '');
    const base = `${baseUrl}/media/stream?key=${encodeURIComponent(s3Key)}`;
    return ticketCode ? `${base}&ticketCode=${ticketCode}` : base;
  }

  if (url.includes('/embed/')) return url;
  // Standard watch URL: https://www.youtube.com/watch?v=XXXX
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  // Short URL: https://youtu.be/XXXX
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  return url;
}

function HomePage() {
  const navigate = useNavigate();
  const isDesktop = useDesktopMediaQuery();

  const [promotions, setPromotions] = useState([]);

  const [trailerUrl, setTrailerUrl] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const nowShowingRef = useRef(null);
  const inTheaterRef = useRef(null);
  const promoRef = useRef(null);
  const isPromoHovered = useRef(false);
  const isPromoVisible = useRef(false);

  // --- PIN CODE AUTHENTICATION FOR HOME PAGE ---
  const showToast = useToastStore((s) => s.showToast);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const pinInputsRef = useRef([]);

  const [pinLockTimeLeft, setPinLockTimeLeft] = useState(0);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [confirmPinDigits, setConfirmPinDigits] = useState([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const confirmPinInputsRef = useRef([]);

  useEffect(() => {
    const fetchPromos = () => {
      return getPromotions()
        .then((data) => {
          const activePromos = data.filter(
            (p) => !p.isHidden && p.status === 'active'
          );
          if (activePromos.length === 0) return;
          setPromotions(activePromos);
        })
        .catch((err) => {
          console.error('Error fetching promotions:', err);
        });
    };
    fetchPromos();
  }, []);

  useEffect(() => {
    if (pinLockTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setPinLockTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [pinLockTimeLeft]);

  const location = useLocation();

  const pinSetupKey = JSON.stringify([
    isAuthenticated,
    location.state?.requirePinSetup,
  ]);
  const [previousPinSetupKey, setPreviousPinSetupKey] = useState(null);
  if (previousPinSetupKey !== pinSetupKey) {
    setPreviousPinSetupKey(pinSetupKey);
    // Chỉ hiện modal setup PIN nếu được điều hướng từ trang đăng nhập/đăng ký
    // với state { requirePinSetup: true } — tức là tài khoản mới chưa có PIN.
    // Không tự động bắt user khi họ chỉ vào trang chủ bình thường.
    if (location.state?.requirePinSetup && isAuthenticated) {
      setShowPinModal(true);
      setIsSetupMode(true);
      // Xóa state để không hiện lại khi refresh trang
    } else {
      setShowPinModal(false);
    }
  }
  useEffect(() => {
    if (location.state?.requirePinSetup && isAuthenticated)
      window.history.replaceState({}, '');
  }, [isAuthenticated, location.state]);

  useEffect(() => {
    const promoElement = promoRef.current;
    if (!promoElement) return undefined;

    if (!('IntersectionObserver' in window)) {
      isPromoVisible.current = true;
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isPromoVisible.current = entry.isIntersecting;
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(promoElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        promoRef.current &&
        isPromoVisible.current &&
        !isPromoHovered.current
      ) {
        const { scrollLeft, scrollWidth, clientWidth } = promoRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          promoRef.current.scrollTo({ left: 0, behavior: 'auto' });
          setTimeout(() => {
            if (promoRef.current) {
              promoRef.current.scrollBy({
                left: clientWidth,
                behavior: 'smooth',
              });
            }
          }, 50);
        } else {
          promoRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePinChange = (e, index) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newPin = [...pinDigits];
    newPin[index] = value.slice(-1);
    setPinDigits(newPin);
    setPinError('');

    if (value && index < 5) {
      pinInputsRef.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        pinInputsRef.current[index - 1]?.focus();
      } else {
        const newPin = [...pinDigits];
        newPin[index] = '';
        setPinDigits(newPin);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinInputsRef.current[index + 1]?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const newPin = pasted.split('');
      setPinDigits(newPin);
      setPinError('');
      pinInputsRef.current[5]?.focus();
    }
  };

  const handlePinSubmit = async (e) => {
    if (e) e.preventDefault();

    const enteredPin = pinDigits.join('');
    if (enteredPin.length < 6) {
      setPinError('Vui lòng nhập đủ 6 số');
      return;
    }

    if (isSetupMode) {
      const confirmedPin = confirmPinDigits.join('');
      if (confirmedPin.length < 6) {
        setPinError('Vui lòng xác nhận mã PIN mới (6 chữ số)');
        return;
      }
      if (enteredPin !== confirmedPin) {
        setPinError('Mã PIN xác nhận không khớp! Vui lòng nhập lại.');
        setConfirmPinDigits(['', '', '', '', '', '']);
        setTimeout(() => confirmPinInputsRef.current[0]?.focus(), 10);
        return;
      }
      // Call Backend to setup PIN
      try {
        await apiPost('/users/pin/setup', {
          newPin: enteredPin,
          confirmPin: confirmedPin,
        });
        setShowPinModal(false);
        setIsSetupMode(false);
        setPinError('');
        showToast(
          'Thiết lập mã PIN thành công! Bạn có thể xem phim ngay.',
          'success'
        );
      } catch (err) {
        setPinError(err.message || 'Có lỗi xảy ra khi thiết lập mã PIN.');
        setPinDigits(['', '', '', '', '', '']);
        setConfirmPinDigits(['', '', '', '', '', '']);
        setTimeout(() => pinInputsRef.current[0]?.focus(), 10);
      }
    }
  };

  function fetchMovies() {
    return getRawMovies()
      .then((data) => {
        setMovies(data);
      })
      .catch((error) => {
        console.error('Lỗi khi tải phim:', error);
        setMovies([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const loadKey1 = JSON.stringify([]);
  const [previousLoadKey1, setPreviousLoadKey1] = useState(null);
  if (previousLoadKey1 !== loadKey1) {
    setPreviousLoadKey1(loadKey1);
    setLoading(true);
  }

  useEffect(() => {
    fetchMovies();
  }, []);

  const nowShowingMovies = movies.filter(
    (m) =>
      (m.status === 'showing' || m.status === 'NOW_SHOWING') &&
      m.isCinemaAvailable !== false
  );
  const upcomingMovies = movies.filter(
    (m) =>
      (m.status === 'upcoming' || m.status === 'COMING_SOON') &&
      m.isCinemaAvailable !== false
  );

  const demoMovie = {
    id: 'demo',
    title: 'SWORD ART ONLINE PROGRESSIVE SCHERZO OF DEEP NIGHT',
    posterUrl:
      'https://upload.wikimedia.org/wikipedia/vi/thumb/9/93/Sword_Art_Online_Progressive_Aria_of_a_Starless_Night.jpg/220px-Sword_Art_Online_Progressive_Aria_of_a_Starless_Night.jpg',
    ageRating: 'P',
    duration: 101,
    releaseDate: '2023-06-15',
    description:
      'Lấy bối cảnh hai tháng sau khi thế giới ảo tử thần bắt đầu, phim xoay quanh hành trình của Kirito và Asuna khám phá tầng 4 của pháo đài Aincrad cùng môi trường bí ẩn và các con trùm khó nhằn.',
    genres: [{ name: 'Hoạt hình' }, { name: 'Hành động' }],
    trailerUrl: 'https://www.youtube.com/watch?v=1',
  };
  const heroMovies =
    nowShowingMovies.length > 0
      ? nowShowingMovies.slice(0, 5)
      : movies.length > 0
        ? movies.slice(0, 5)
        : [demoMovie];

  useEffect(() => {
    if (heroMovies.length <= 1) return;

    let interval;
    const rotateHero = () => {
      setHeroIndex((prev) => (prev + 1) % heroMovies.length);
    };
    const initialDelay = setTimeout(() => {
      rotateHero();
      interval = setInterval(rotateHero, 6000);
    }, 10000);

    return () => {
      clearTimeout(initialDelay);
      if (interval) clearInterval(interval);
    };
  }, [heroMovies.length]);

  const scrollNowShowing = (direction) => {
    const container = nowShowingRef.current;

    if (!container) return;

    const firstCard = container.querySelector('[data-now-showing-card]');
    if (!firstCard) return;

    const gap = 24;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const scrollAmount = (cardWidth + gap) * 4 * direction;

    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const scrollInTheater = (direction) => {
    const container = inTheaterRef.current;

    if (!container) return;

    const firstCard = container.querySelector('[data-in-theater-card]');
    if (!firstCard) return;

    const gap = 24;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const scrollAmount = (cardWidth + gap) * 4 * direction;

    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const renderMovieCard = (movie, dataAttr) => (
    <div
      key={movie.id}
      className="group cursor-pointer transition-transform duration-300 hover:scale-105 z-0 hover:z-10 relative"
      onClick={() =>
        movie.trailerUrl
          ? setTrailerUrl(movie.trailerUrl)
          : navigate(`/movie-details?id=${movie.id}`)
      }
      {...{ [dataAttr]: true }}
    >
      <div
        className={`relative mb-3 aspect-[2/3] overflow-hidden rounded-lg bg-[#FFFFFF] dark:bg-[#18181b] shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.08)] transition-[border-color,box-shadow] duration-300 group-hover:border-[#dc2626] group-hover:shadow-md dark:group-hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] border border-[#E5E7EB] dark:border-white/30`}
      >
        {movie.ageRating && (
          <div
            className={`absolute top-3 right-3 z-10 rounded-sm px-2 py-1 text-[10px] font-bold text-white ${getAgeRatingColor(movie.ageRating)}`}
          >
            {movie.ageRating}
          </div>
        )}
        {movie.posterUrl ? (
          <img
            {...getResponsiveCloudinaryImageProps(movie.posterUrl, {
              width: 480,
              height: 720,
              widths: MOVIE_CARD_WIDTHS,
              sizes:
                '(max-width: 767px) calc((100vw - 56px) / 2), (max-width: 1599px) calc((100vw - 120px) / 4), 370px',
              aspectRatio: 2 / 3,
              crop: 'fill',
            })}
            alt={movie.title}
            className="h-full w-full object-cover"
            width="480"
            height="720"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[#F3F4F6] dark:bg-[#18181b]">
            <span
              className="material-symbols-outlined text-white/20"
              style={{ fontSize: 48 }}
            >
              movie
            </span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
          {movie.trailerUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTrailerUrl(movie.trailerUrl);
              }}
              className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-200/30 bg-red-500/20 text-white backdrop-blur-md transition-transform hover:scale-110"
              type="button"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 40, fontVariationSettings: '"FILL" 1' }}
              >
                play_arrow
              </span>
            </button>
          )}
        </div>
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#120606] via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
          <div className="flex w-full flex-col gap-2 pointer-events-auto">
            <Link
              onClick={(e) => e.stopPropagation()}
              to={`/movie-details?id=${movie.id}`}
              className="flex w-full items-center justify-center rounded-lg bg-[#dc2626] py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:brightness-110"
            >
              Xem chi tiết
            </Link>
            {movie.status !== 'upcoming' &&
              movie.status !== 'COMING_SOON' &&
              ((movie.isOnlineAvailable ||
                movie.onlineAvailable ||
                movie.onlinePrice) &&
              movie.isCinemaAvailable === false ? (
                <Link
                  onClick={(e) => e.stopPropagation()}
                  to={`/movie-details?id=${movie.id}`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#dc2626] bg-black/60 backdrop-blur-md py-2.5 text-xs font-bold uppercase tracking-wider text-[#fca5a5] transition-all hover:bg-red-600 hover:text-white"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    shopping_cart_checkout
                  </span>
                  Mua Trực Tuyến
                </Link>
              ) : (
                <Link
                  onClick={(e) => e.stopPropagation()}
                  to={`/movie-info?id=${movie.id}`}
                  className="flex w-full items-center justify-center rounded-lg border border-[#dc2626] py-2.5 text-xs font-bold uppercase tracking-wider text-[#fca5a5] transition-all hover:bg-[#dc2626] hover:text-white active:bg-red-700"
                >
                  Đặt vé
                </Link>
              ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col min-h-[48px]">
        <h3
          title={movie.title}
          className="mb-1 text-[16px] font-bold leading-snug text-[#111827] dark:text-white transition-colors group-hover:text-red-500 dark:group-hover:text-red-300 truncate"
        >
          {movie.title}
        </h3>
        <p
          title={[
            movie.duration ? `${movie.duration} phút` : '',
            movie.genres?.map((g) => g.name).join(', '),
          ]
            .filter(Boolean)
            .join(' • ')}
          className="text-[13px] leading-[20px] text-[#6B7280] dark:text-[#b89d9d] truncate"
        >
          {movie.duration && <span>{movie.duration} phút</span>}
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span className="opacity-50 text-[10px] mx-1.5 align-middle">
                •
              </span>
              <span>{movie.genres.map((g) => g.name).join(', ')}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );

  const renderEmptyState = (message) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span
        className="material-symbols-outlined text-[#111827]/10 dark:text-white/10 mb-4"
        style={{ fontSize: 72 }}
      >
        movie
      </span>
      <p className="text-[#111827]/40 dark:text-white/40 text-lg font-medium">
        {message}
      </p>
      <p className="text-[#111827]/20 dark:text-white/20 text-sm mt-2">
        Vui lòng quay lại sau
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-transparent font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .material-symbols-outlined {
              font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            }
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            .btn-primary {
              background-color: #dc2626;
              color: #F1F1F1;
              font-weight: 700;
              text-transform: uppercase;
              border-radius: 6px;
              padding: 12px 24px;
              transition: background-color 0.2s;
            }
            .btn-primary:hover {
              background-color: #b91c1c;
            }
            .shine-sweep {
              background: linear-gradient(
                105deg,
                transparent 40%,
                rgba(255, 255, 255, 0.15) 45%,
                rgba(255, 255, 255, 0.35) 50%,
                rgba(255, 255, 255, 0.15) 55%,
                transparent 60%
              );
              background-size: 200% 100%;
              animation: shineMove 1.2s ease-in-out;
            }
            .group\\/banner:hover .shine-sweep,
            .group\\/banner:active .shine-sweep {
              opacity: 1;
            }
            .shine-reflective {
              background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.08) 0%,
                rgba(255, 255, 255, 0.04) 30%,
                rgba(255, 255, 255, 0.12) 50%,
                rgba(255, 255, 255, 0.04) 70%,
                rgba(255, 255, 255, 0.08) 100%
              );
              animation: shimmer 3s ease-in-out infinite;
              pointer-events: none;
            }
            @keyframes shimmer {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
            @keyframes shineMove {
              0% { background-position: -100% 0; }
              100% { background-position: 200% 0; }
            }
          `,
        }}
      />

      <Header />

      <main className="flex-grow -mt-20">
        <section className="relative flex min-h-[100svh] md:min-h-screen w-full flex-col justify-center overflow-hidden bg-[#F5F5F7] dark:bg-black">
          {isDesktop ? (
            <img
              src="https://res.cloudinary.com/df3fzqvrd/image/upload/v1785438444/file_00000000dbe88207ba83cff92ba95b90_bhuf9s.png"
              alt="Cinema Hero Wallpaper"
              className="absolute inset-0 w-full h-full object-cover"
              width="1920"
              height="1080"
              loading="eager"
              fetchPriority="high"
            />
          ) : (
            <img
              src="/cinema-hero-mobile.webp"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              width="1000"
              height="667"
              loading="eager"
              fetchPriority="high"
            />
          )}

          {/* Background overlays for text readability */}
          <div className="absolute inset-0 bg-black/10 pointer-events-none z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 dark:from-black/70 via-black/30 dark:via-black/30 to-transparent pointer-events-none z-10" />

          {/* Top gradient for header readability */}
          <div className="absolute inset-x-0 top-0 h-[150px] md:h-[30vh] bg-gradient-to-b from-black/50 dark:from-black/60 via-black/10 dark:via-black/20 to-transparent pointer-events-none z-10" />

          {/* Bottom gradient for seamless transition */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F5F5F7]/20 to-[#F5F5F7] dark:via-[#121212]/20 dark:to-black z-10 pointer-events-none" />

          <div className="relative z-10 px-4 md:px-6 lg:px-8 pb-16 md:pb-24 pt-44 md:pt-36 lg:pt-40 max-w-[1600px] mx-auto w-full">
            {(() => {
              const bestMovie =
                heroMovies[heroIndex % heroMovies.length] || heroMovies[0];

              return (
                <div
                  aria-busy={loading && movies.length === 0}
                  className={`relative flex flex-col md:flex-row-reverse items-center justify-center gap-10 md:gap-12 lg:gap-16 w-full opacity-100 transition-opacity duration-1000 min-h-[440px] h-[580px] ${
                    loading && movies.length === 0
                      ? 'animate-pulse pointer-events-none'
                      : ''
                  }`}
                >
                  {/* Right: Poster Slider (Coverflow) */}
                  <div className="relative z-20 w-full md:w-1/2 lg:w-[45%] h-[380px] md:h-[500px] lg:h-[560px] perspective-[1200px] flex flex-col items-center justify-center overflow-visible mb-auto md:mb-0">
                    {heroMovies.map((movie, index) => {
                      let offset = index - (heroIndex % heroMovies.length);
                      if (offset < -Math.floor(heroMovies.length / 2))
                        offset += heroMovies.length;
                      if (offset > Math.floor(heroMovies.length / 2))
                        offset -= heroMovies.length;

                      const isActive = offset === 0;
                      if (Math.abs(offset) > 1 && heroMovies.length > 3)
                        return null;

                      let transform = 'translateX(0) scale(1) translateZ(0)';
                      let zIndex = 10;
                      let opacity = 1;

                      if (offset < 0) {
                        transform =
                          'translateX(-50%) scale(0.85) translateZ(-80px) rotateY(15deg)';
                        zIndex = 5;
                        opacity = 0.6;
                      } else if (offset > 0) {
                        transform =
                          'translateX(50%) scale(0.85) translateZ(-80px) rotateY(-15deg)';
                        zIndex = 5;
                        opacity = 0.6;
                      }

                      return (
                        <div
                          key={movie.id}
                          className="absolute w-[220px] md:w-[280px] lg:w-[340px] aspect-[2/3] rounded-[20px] transition-[transform,opacity] duration-700 ease-out cursor-pointer group/poster"
                          style={{
                            transform,
                            zIndex,
                            opacity,
                            willChange: 'transform, opacity',
                          }}
                          onClick={() => {
                            if (!isActive) {
                              setHeroIndex(index);
                            } else {
                              if (movie.trailerUrl) {
                                setTrailerUrl(movie.trailerUrl);
                              }
                            }
                          }}
                        >
                          {/* DYNAMIC POSTER GLOW EFFECT */}
                          {isActive && (
                            <div className="absolute inset-[-18%] -z-10 rounded-full bg-[radial-gradient(circle,rgba(220,38,38,0.55)_0%,rgba(220,38,38,0.2)_45%,transparent_72%)] opacity-70 transition-[opacity,transform] duration-500 pointer-events-none group-hover/poster:opacity-100 group-hover/poster:scale-110" />
                          )}

                          <div
                            className={`block relative z-10 w-full h-full rounded-[20px] overflow-hidden border ${isActive ? 'border-white/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] hover:scale-105 hover:border-white/60' : 'border-gray-200 dark:border-white/10'} transition-[transform,border-color,box-shadow] duration-300 bg-black`}
                          >
                            {loading && movies.length === 0 ? (
                              <div
                                aria-hidden="true"
                                className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.32),rgba(12,12,12,0.96)_68%)]"
                              />
                            ) : (
                              <img
                                {...getResponsiveCloudinaryImageProps(
                                  movie.posterUrl,
                                  {
                                    width: 340,
                                    height: 510,
                                    widths: HERO_POSTER_WIDTHS,
                                    sizes:
                                      '(max-width: 767px) 220px, (max-width: 1023px) 280px, 340px',
                                    aspectRatio: 2 / 3,
                                    crop: 'fill',
                                  }
                                )}
                                alt={movie.title}
                                className="block w-full h-full object-cover"
                                width="340"
                                height="510"
                                loading={isActive ? 'eager' : 'lazy'}
                                decoding="async"
                                fetchPriority={isActive ? 'auto' : 'low'}
                              />
                            )}
                            {!isActive && (
                              <div className="absolute inset-0 bg-black/45 pointer-events-none" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#120606] via-transparent to-transparent opacity-80 z-20 pointer-events-none" />
                            {isActive && (
                              <div
                                className="absolute inset-0 z-30 pointer-events-none"
                                style={{
                                  background:
                                    'linear-gradient(to bottom, transparent 60%, #120606 100%)',
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Left: Info */}
                  <div className="h-[375px] flex-none md:h-auto md:flex-1 text-center md:text-left z-20 pb-4 md:pb-0 w-full max-w-2xl">
                    {/* Title */}
                    <div className="flex h-[48px] md:h-[64px] items-center justify-center md:justify-start mb-4 overflow-hidden">
                      <h1
                        style={{
                          fontFamily: '"Inter", sans-serif',
                          textShadow: '0 4px 12px rgba(0,0,0,0.8)',
                        }}
                        className="font-sans font-black uppercase text-white leading-normal pb-2 pr-4 tracking-tighter truncate text-2xl sm:text-3xl md:text-4xl lg:text-5xl max-w-full"
                      >
                        {bestMovie.title}
                      </h1>
                    </div>

                    {/* Badges */}
                    <div className="flex h-[64px] sm:h-[36px] flex-wrap content-start items-center justify-center md:justify-start gap-2.5 mb-4 overflow-hidden">
                      {bestMovie.ageRating && (
                        <span
                          className={`text-white font-black px-2.5 py-0.5 rounded text-[13px] ${getAgeRatingColor(bestMovie.ageRating)}`}
                        >
                          {bestMovie.ageRating}
                        </span>
                      )}
                      {bestMovie.genres &&
                        bestMovie.genres.map((g) => (
                          <span
                            key={g.name}
                            className="bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-2.5 py-0.5 rounded-full text-[12px]"
                          >
                            {g.name}
                          </span>
                        ))}
                      {bestMovie.averageRating > 0 && (
                        <span className="text-yellow-500 font-bold text-[13px] flex items-center gap-1 ml-1">
                          <span
                            className="material-symbols-outlined text-[16px] text-yellow-500"
                            style={{ fontVariationSettings: '"FILL" 1' }}
                          >
                            star
                          </span>{' '}
                          {bestMovie.averageRating.toFixed(1)}/5
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex min-h-[24px] flex-wrap items-center justify-center md:justify-start gap-5 text-white text-[14px] font-medium mb-6">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-red-500">
                          schedule
                        </span>
                        {bestMovie.duration
                          ? `${bestMovie.duration} phút`
                          : 'Đang cập nhật'}
                      </span>
                      {bestMovie.releaseDate && (
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px] text-red-500">
                            calendar_month
                          </span>
                          {bestMovie.releaseDate}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <div className="h-[84px] lg:h-[112px] mb-8 w-full mx-auto md:mx-0 overflow-hidden">
                      <p className="whitespace-pre-line text-[#E5E7EB] text-xs md:text-sm leading-relaxed line-clamp-4 lg:line-clamp-5 drop-shadow-md">
                        {bestMovie.description
                          ? bestMovie.description.replace(
                              /(?:\r?\n\s*){2,}/g,
                              '\n\n'
                            )
                          : 'Đang cập nhật nội dung...'}
                      </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <Link
                        to={`/movie-info?id=${bestMovie.id === 'demo' ? 1 : bestMovie.id}`}
                        className="bg-[#e61a27] text-white px-8 py-3.5 rounded-2xl font-semibold text-[15px] uppercase tracking-wider hover:-translate-y-1 hover:bg-[#c91420] hover:shadow-[0_10px_20px_rgba(230,26,39,0.3)] transition-[transform,background-color,box-shadow] duration-300"
                      >
                        ĐẶT VÉ
                      </Link>

                      <button
                        onClick={() =>
                          bestMovie.trailerUrl
                            ? setTrailerUrl(bestMovie.trailerUrl)
                            : null
                        }
                        className="bg-[#0f172a] dark:bg-white text-white dark:text-[#111827] hover:bg-[#1e293b] dark:hover:bg-gray-200 px-6 py-3 rounded-2xl font-semibold text-[15px] uppercase tracking-wider transition-colors duration-300 flex items-center gap-2 group shadow-md"
                      >
                        <span
                          className="material-symbols-outlined text-[22px] transition-transform group-hover:scale-110"
                          style={{ fontVariationSettings: '"FILL" 0' }}
                        >
                          play_arrow
                        </span>
                        XEM TRAILER
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* PHIM ĐANG CHIẾU */}
        <section
          id="phim-dang-chieu"
          className="home-content-section relative z-20 mx-auto mt-8 md:mt-12 lg:mt-16 mb-24 max-w-[1600px] px-4 md:px-6 lg:px-8 scroll-mt-24"
        >
          <div className="md:px-2">
            <div className="mb-8 flex items-end justify-between border-b border-[#E5E7EB] dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-[#dc2626] rounded-full"></div>
                <div>
                  <h2 className="text-[18px] sm:text-[24px] md:text-3xl font-black uppercase text-[#111827] dark:text-white leading-normal tracking-tight">
                    PHIM ĐANG CHIẾU
                  </h2>
                </div>
              </div>
              <Link
                to="/movies/now-showing"
                className="group flex items-center gap-1.5 md:gap-2 rounded-full border border-[#E5E7EB] dark:border-white/10 bg-[#F3F4F6] dark:bg-white/5 px-3 py-2 md:px-4 text-[10px] sm:text-[11px] md:text-xs font-bold text-[#111827] dark:text-white transition-all hover:border-[#dc2626]/50 hover:bg-[#dc2626]/10 whitespace-nowrap shrink-0"
              >
                <span className="uppercase tracking-wider">Xem Tất Cả</span>
                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
              </div>
            ) : nowShowingMovies.length === 0 ? (
              renderEmptyState('Hiện chưa có phim đang chiếu')
            ) : (
              <div className="relative group/row">
                <button
                  className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-red-400/20 bg-[#2a1212]/90 text-white opacity-0 transition-all hover:bg-[#dc2626] group-hover/row:opacity-100"
                  onClick={() => scrollNowShowing(-1)}
                  type="button"
                >
                  <span className="material-symbols-outlined">
                    chevron_left
                  </span>
                </button>

                <button
                  className="absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-red-400/20 bg-[#2a1212]/90 text-white opacity-0 transition-all hover:bg-[#dc2626] group-hover/row:opacity-100"
                  onClick={() => scrollNowShowing(1)}
                  type="button"
                >
                  <span className="material-symbols-outlined">
                    chevron_right
                  </span>
                </button>

                <div
                  ref={nowShowingRef}
                  className="grid grid-flow-col auto-cols-[calc((100%-24px)/2)] gap-6 overflow-x-auto scrollbar-hide py-6 px-4 -mx-4 md:px-6 md:-mx-6 md:auto-cols-[calc((100%-72px)/4)]"
                >
                  {nowShowingMovies.map((movie) =>
                    renderMovieCard(movie, 'data-now-showing-card')
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* PHIM SẮP CHIẾU */}
        <section
          id="phim-tai-rap"
          className="home-content-section mx-auto mb-24 max-w-[1600px] px-4 md:px-6 lg:px-8 scroll-mt-24"
        >
          <div className="md:px-2">
            <div className="mb-8 flex items-end justify-between border-b border-[#E5E7EB] dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-[#dc2626] rounded-full"></div>
                <div>
                  <h2 className="text-[18px] sm:text-[24px] md:text-3xl font-black uppercase text-[#111827] dark:text-white leading-normal tracking-tight">
                    PHIM SẮP CHIẾU
                  </h2>
                </div>
              </div>
              <Link
                to="/movies/coming-soon"
                className="group flex items-center gap-1.5 md:gap-2 rounded-full border border-[#E5E7EB] dark:border-white/10 bg-[#F3F4F6] dark:bg-white/5 px-3 py-2 md:px-4 text-[10px] sm:text-[11px] md:text-xs font-bold text-[#111827] dark:text-white transition-all hover:border-[#dc2626]/50 hover:bg-[#dc2626]/10 whitespace-nowrap shrink-0"
              >
                <span className="uppercase tracking-wider">Xem Tất Cả</span>
                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
              </div>
            ) : upcomingMovies.length === 0 ? (
              renderEmptyState('Hiện chưa có phim sắp chiếu')
            ) : (
              <div className="relative group/row2">
                <button
                  className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-red-400/20 bg-[#2a1212]/90 text-white opacity-0 transition-all hover:bg-[#dc2626] group-hover/row2:opacity-100"
                  onClick={() => scrollInTheater(-1)}
                  type="button"
                >
                  <span className="material-symbols-outlined">
                    chevron_left
                  </span>
                </button>

                <button
                  className="absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-red-400/20 bg-[#2a1212]/90 text-white opacity-0 transition-all hover:bg-[#dc2626] group-hover/row2:opacity-100"
                  onClick={() => scrollInTheater(1)}
                  type="button"
                >
                  <span className="material-symbols-outlined">
                    chevron_right
                  </span>
                </button>

                <div
                  ref={inTheaterRef}
                  className="grid grid-flow-col auto-cols-[calc((100%-24px)/2)] gap-6 overflow-x-auto scrollbar-hide py-6 px-4 -mx-4 md:px-6 md:-mx-6 md:auto-cols-[calc((100%-72px)/4)]"
                >
                  {upcomingMovies.map((movie) =>
                    renderMovieCard(movie, 'data-in-theater-card')
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* TIN MỚI & ƯU ĐÃI */}
        <section className="home-content-section relative z-20 mx-auto mt-8 md:mt-12 lg:mt-16 mb-24 max-w-[1600px] px-4 md:px-6 lg:px-8 overflow-hidden">
          <div className="md:px-2">
            <div className="mb-8 flex items-end justify-between border-b border-[#E5E7EB] dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-[#dc2626] rounded-full"></div>
                <div>
                  <h2 className="text-[18px] sm:text-[24px] md:text-3xl font-black uppercase text-[#111827] dark:text-white leading-normal tracking-tight">
                    TIN MỚI & ƯU ĐÃI
                  </h2>
                </div>
              </div>
            </div>

            <div
              className="relative w-full"
              onMouseEnter={() => (isPromoHovered.current = true)}
              onMouseLeave={() => (isPromoHovered.current = false)}
            >
              <div
                ref={promoRef}
                className="grid grid-flow-col auto-cols-[100%] sm:auto-cols-[calc((100%-24px)/2)] md:auto-cols-[calc((100%-48px)/3)] lg:auto-cols-[calc((100%-72px)/4)] gap-6 overflow-x-auto scrollbar-hide py-4 md:py-6 snap-x snap-mandatory"
              >
                {promotions.map((promo, index) => (
                  <div
                    key={`promo-${promo.id}-${index}`}
                    className="group cursor-pointer snap-start flex flex-col rounded-xl border border-[#E5E7EB] dark:border-white/10 transition-colors duration-300 hover:border-[#dc2626] overflow-hidden"
                    onClick={() => navigate(`/offers/${promo.id}`)}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#F3F4F6] dark:bg-[#18181b]">
                      <img
                        {...getResponsiveCloudinaryImageProps(promo.imageUrl, {
                          width: 640,
                          height: 400,
                          widths: PROMOTION_WIDTHS,
                          sizes:
                            '(max-width: 639px) calc(100vw - 32px), (max-width: 767px) calc((100vw - 56px) / 2), (max-width: 1023px) calc((100vw - 96px) / 3), (max-width: 1599px) calc((100vw - 120px) / 4), 370px',
                          aspectRatio: 16 / 10,
                          crop: 'fill',
                          quality: 'auto:eco',
                        })}
                        alt={promo.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        width="640"
                        height="400"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                      />

                      {/* Dark overlay on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none z-0"></div>

                      {promo.discount > 0 && (
                        <div
                          className="absolute top-[20px] -right-[35px] w-[130px] rotate-45 bg-[#e50914] text-white text-[11px] md:text-[12px] font-black tracking-wider text-center py-1 shadow-[0_3px_10px_rgba(0,0,0,0.6)] z-20 uppercase"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          GIẢM {promo.discount}%
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-[#FFFFFF] dark:bg-[#18181b] flex flex-col gap-2 flex-grow">
                      <h3 className="text-[14px] md:text-[15px] font-bold text-[#111827] dark:text-white leading-snug transition-colors duration-300 group-hover:text-[#dc2626] truncate">
                        {promo.title}
                      </h3>

                      <div className="flex items-center gap-2 text-[#6B7280] dark:text-[#9CA3AF] text-[12px] md:text-[13px]">
                        <span className="material-symbols-outlined text-[#dc2626] text-[16px]">
                          calendar_month
                        </span>
                        <span>
                          {formatPromoDate(promo.startDate)} -{' '}
                          {formatPromoDate(promo.end)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* QUY TRÌNH MUA VÉ */}
        <section className="home-content-section relative mx-auto mb-24 max-w-[1600px] px-4 md:px-6 lg:px-8 pt-4">
          <div className="text-center mb-16">
            <h3 className="text-[#dc2626] font-bold text-[13px] md:text-[15px] uppercase tracking-[0.2em] mb-3">
              QUY TRÌNH ĐƠN GIẢN
            </h3>
            <h2 className="text-[#111827] dark:text-white font-black text-3xl md:text-5xl uppercase tracking-tight drop-shadow-md">
              MUA VÉ CHỈ VỚI 3 BƯỚC NHANH CHÓNG
            </h2>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute top-[72px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#dc2626]/50 to-transparent hidden md:block"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {/* Step 1 */}
              <div className="group relative rounded-[32px] bg-[#FFFFFF] dark:bg-[#18181b] border border-[#E5E7EB] dark:border-white/10 p-8 text-center shadow-sm dark:shadow-none transition-all duration-300 hover:-translate-y-2 hover:border-[#dc2626]/30 hover:shadow-md dark:hover:shadow-[0_20px_40px_rgba(220,38,38,0.15)]">
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-[#F3F4F6] dark:bg-[#18181b] transition-colors duration-300 group-hover:border-[#dc2626]/50 group-hover:bg-[#dc2626]/10">
                  <span className="material-symbols-outlined text-[32px] text-[#6B7280] dark:text-[#9D9D9D] transition-colors duration-300 group-hover:text-[#dc2626]">
                    local_activity
                  </span>
                </div>
                <h4 className="mb-4 text-[18px] font-black text-[#111827] dark:text-white uppercase tracking-wider">
                  1. Chọn Phim & Suất Chiếu
                </h4>
                <p className="text-[14px] font-medium leading-relaxed text-[#6B7280] dark:text-[#9D9D9D]">
                  Tìm kiếm bộ phim yêu thích của bạn và chọn suất chiếu phù hợp
                  nhất tại cụm rạp GinFilm.
                </p>
              </div>

              {/* Step 2 */}
              <div className="group relative rounded-[32px] bg-[#FFFFFF] dark:bg-[#18181b] border border-[#dc2626]/15 p-8 text-center shadow-[0_4px_20px_rgba(220,38,38,0.05)] dark:shadow-[0_0_20px_rgba(220,38,38,0.05)] transition-all duration-300 hover:-translate-y-2 hover:border-[#dc2626]/40 hover:shadow-md dark:hover:shadow-[0_20px_40px_rgba(220,38,38,0.15)] md:scale-105 z-10">
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#dc2626]/20 bg-red-50 dark:bg-[#dc2626]/5 transition-colors duration-300 group-hover:bg-red-100 dark:group-hover:bg-[#dc2626]/15 group-hover:border-[#dc2626]/40">
                  <span className="material-symbols-outlined text-[32px] text-[#dc2626]/90 transition-colors duration-300 group-hover:text-[#dc2626]">
                    chair
                  </span>
                </div>
                <h4 className="mb-4 text-[18px] font-black text-[#111827] dark:text-white uppercase tracking-wider">
                  2. Chọn Ghế & Thức Ăn
                </h4>
                <p className="text-[14px] font-medium leading-relaxed text-[#6B7280] dark:text-[#9D9D9D]">
                  Lựa chọn vị trí ngồi đẹp nhất trong rạp cùng danh mục bắp
                  nước, combo ưu đãi đi kèm.
                </p>
              </div>

              {/* Step 3 */}
              <div className="group relative rounded-[32px] bg-[#FFFFFF] dark:bg-[#18181b] border border-[#E5E7EB] dark:border-white/10 p-8 text-center shadow-sm dark:shadow-none transition-all duration-300 hover:-translate-y-2 hover:border-[#dc2626]/30 hover:shadow-md dark:hover:shadow-[0_20px_40px_rgba(220,38,38,0.15)]">
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#E5E7EB] dark:border-white/10 bg-[#F3F4F6] dark:bg-[#18181b] transition-colors duration-300 group-hover:border-[#dc2626]/50 group-hover:bg-[#dc2626]/10">
                  <span className="material-symbols-outlined text-[32px] text-[#6B7280] dark:text-[#9D9D9D] transition-colors duration-300 group-hover:text-[#dc2626]">
                    credit_card
                  </span>
                </div>
                <h4 className="mb-4 text-[18px] font-black text-[#111827] dark:text-white uppercase tracking-wider">
                  3. Thanh Toán An Toàn
                </h4>
                <p className="text-[14px] font-medium leading-relaxed text-[#6B7280] dark:text-[#9D9D9D]">
                  Thực hiện thanh toán trực tuyến bảo mật cao và nhận vé điện tử
                  tức thì qua Email/SMS.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Trailer Modal */}
      {trailerUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setTrailerUrl(null)}
        >
          <div
            className="relative w-full max-w-5xl aspect-video bg-white dark:bg-black rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTrailerUrl(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <iframe
              className="w-full h-full"
              src={`${getYoutubeEmbedUrl(trailerUrl)}?autoplay=1`}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#dc2626] to-transparent"></div>

            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-[#e61a27]/10 border border-[#e61a27]/30 flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-[32px] text-[#e61a27]">
                {isSetupMode ? 'lock_open' : 'dialpad'}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-[#111827] dark:text-white uppercase tracking-wider mb-1">
              {isSetupMode ? 'Thiết Lập Mã PIN' : 'Xác Thực Mã PIN'}
            </h2>
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-6">
              {isSetupMode
                ? 'Thiết lập mã PIN bảo mật cho tài khoản của bạn'
                : 'Nhập mã PIN để tiếp tục'}
            </p>

            <form onSubmit={handlePinSubmit} className="flex flex-col gap-5">
              {/* First PIN row */}
              <div>
                {isSetupMode && (
                  <label className="block text-[11px] text-gray-500 uppercase tracking-widest mb-3 text-center">
                    Mã PIN mới
                  </label>
                )}
                {!isSetupMode && (
                  <label className="block text-[11px] text-gray-500 uppercase tracking-widest mb-3 text-center">
                    Mã PIN 6 ký tự
                  </label>
                )}
                <div
                  className="flex gap-2 justify-center"
                  onPaste={handlePinPaste}
                >
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (pinInputsRef.current[idx] = el)}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      disabled={pinLockTimeLeft > 0}
                      value={digit}
                      onChange={(e) => handlePinChange(e, idx)}
                      onKeyDown={(e) => handlePinKeyDown(e, idx)}
                      className={`w-11 h-14 sm:w-12 sm:h-16 bg-[#0d0d0d] rounded-lg text-center text-2xl font-bold outline-none transition-all duration-200 border uppercase
                        ${digit ? 'border-[#e61a27] text-[#e61a27] shadow-[0_0_8px_rgba(230,26,39,0.2)] bg-[#e61a27]/5' : 'border-gray-200 dark:border-white/10 text-white hover:border-gray-200 dark:border-white/20 focus:border-[#e61a27] focus:bg-[#e61a27]/5'}
                        ${pinLockTimeLeft > 0 ? 'opacity-30 cursor-not-allowed border-red-500/20' : ''}`}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              {/* Confirm PIN row (setup mode only) */}
              {isSetupMode && (
                <div>
                  <label className="block text-[11px] text-gray-500 uppercase tracking-widest mb-3 text-center">
                    Xác nhận mã PIN
                  </label>
                  <div className="flex gap-2 justify-center">
                    {confirmPinDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (confirmPinInputsRef.current[idx] = el)}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!/^\d*$/.test(val)) return;
                          const newConfirm = [...confirmPinDigits];
                          newConfirm[idx] = val.slice(-1);
                          setConfirmPinDigits(newConfirm);
                          setPinError('');
                          if (val && idx < 5)
                            confirmPinInputsRef.current[idx + 1]?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace') {
                            if (!confirmPinDigits[idx] && idx > 0) {
                              confirmPinInputsRef.current[idx - 1]?.focus();
                            } else {
                              const newConfirm = [...confirmPinDigits];
                              newConfirm[idx] = '';
                              setConfirmPinDigits(newConfirm);
                            }
                          } else if (e.key === 'ArrowLeft' && idx > 0) {
                            confirmPinInputsRef.current[idx - 1]?.focus();
                          } else if (e.key === 'ArrowRight' && idx < 5) {
                            confirmPinInputsRef.current[idx + 1]?.focus();
                          }
                        }}
                        className={`w-11 h-14 sm:w-12 sm:h-16 bg-[#0d0d0d] rounded-lg text-center text-2xl font-bold outline-none transition-all duration-200 border uppercase
                          ${digit ? 'border-[#e61a27] text-[#e61a27] shadow-[0_0_8px_rgba(230,26,39,0.2)] bg-[#e61a27]/5' : 'border-gray-200 dark:border-white/10 text-white hover:border-gray-200 dark:border-white/20 focus:border-[#e61a27] focus:bg-[#e61a27]/5'}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Lock timer */}
              {pinLockTimeLeft > 0 && (
                <div className="flex items-center justify-center gap-2 text-[#e61a27] bg-[#e61a27]/10 border border-[#e61a27]/20 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px] animate-pulse">
                    lock_clock
                  </span>
                  Khóa tạm thời: {Math.floor(pinLockTimeLeft / 60)}m{' '}
                  {pinLockTimeLeft % 60}s
                </div>
              )}

              {/* Error */}
              {pinError && (
                <p className="text-[#e61a27] text-xs font-medium text-center animate-pulse">
                  {pinError}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={pinLockTimeLeft > 0}
                className="w-full bg-[#e61a27] hover:bg-[#c00] text-white font-bold uppercase tracking-[0.15em] py-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(230,26,39,0.5)] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSetupMode ? 'Thiết lập PIN' : 'Xác nhận'}
                <span className="material-symbols-outlined text-[18px]">
                  {isSetupMode ? 'lock_open' : 'lock'}
                </span>
              </button>

              {/* Logout Button for forced setup mode */}
              {isSetupMode && (
                <button
                  type="button"
                  onClick={() => {
                    useAuthStore.getState().clearSession();
                    window.location.reload();
                  }}
                  className="w-full mt-2 text-gray-500 hover:text-[#111827] dark:text-white font-medium text-xs uppercase tracking-wider transition-colors duration-200"
                >
                  Đăng xuất tài khoản
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
