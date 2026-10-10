import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useToastStore } from '../../store/toastStore';
import { getAgeRatingColor } from '../../../../shared/utils/movieHelpers';

import { getRawMovies } from '../../api/services/movieService';
const formatPrice = (price) =>
  price != null ? `${new Intl.NumberFormat('vi-VN').format(price)}đ` : '—';

function getYoutubeEmbedUrl(url, ticketCode) {
  if (!url) return null;

  let s3Key = null;
  if (url.startsWith('s3://')) {
    s3Key = url.slice(5).split('/').slice(1).join('/');
  } else if (url.includes('.amazonaws.com/')) {
    s3Key = url.split('.amazonaws.com/')[1];
  }

  if (s3Key) {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    const baseUrl = apiUrl.replace(/\/+$/, '');
    const base = `${baseUrl}/media/stream?key=${encodeURIComponent(s3Key)}`;
    return ticketCode ? `${base}&ticketCode=${ticketCode}` : base;
  }

  if (url.includes('/embed/')) return url;
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) return `https://www.youtube.com/embed/${match[2]}`;
  return url;
}

export default function OnlineMoviesPage() {
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const data = await getRawMovies();
      // Filter only movies available for online viewing
      setMovies(data.filter(m => m.isOnlineAvailable || m.onlineAvailable));
    } catch (error) {
      console.error('Lỗi khi tải phim:', error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const nowShowing = movies.filter(m => m.status === 'NOW_SHOWING' || m.status === 'showing' || !m.status);
  const comingSoon = movies.filter(m => m.status === 'COMING_SOON' || m.status === 'coming_soon' || m.status === 'upcoming' || m.status === 'UPCOMING');

  const handleBuyClick = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const confirmPurchase = () => {
    setIsModalOpen(false);
    navigate('/checkout', {
      state: {
        movie: selectedMovie,
        isVOD: true,
        totalPrice: selectedMovie?.onlinePrice?.finalPrice || 0
      }
    });
  };

  const embedUrl = trailerUrl ? getYoutubeEmbedUrl(trailerUrl) : null;

  const renderMovieCard = (movie) => (
    <div key={movie.id} className="group cursor-pointer relative">
      {/* Floating Badges (Outside overflow-hidden) */}
      {movie.ageRating && (
        <div className={`absolute top-2 left-2 z-30 rounded-sm border border-white/15 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md ${getAgeRatingColor(movie.ageRating)}`}>
          {movie.ageRating}
        </div>
      )}



      <div
        className="relative mb-3 aspect-[2/3] w-full overflow-hidden rounded-lg border border-gray-200 dark:border-white/30 bg-white dark:bg-[#18181b] shadow-[0_16px_40px_rgba(0,0,0,0.45)] dark:shadow-[0_0_15px_rgba(255,255,255,0.08)] transition-transform duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_18px_48px_rgba(127,29,29,0.35)] dark:group-hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer"
        onClick={() => movie.trailerUrl ? setTrailerUrl(movie.trailerUrl) : navigate(`/movie-details?id=${movie.id}`)}
      >

        {movie.onlinePrice?.promoActive && movie.onlinePrice?.discountPercentage > 0 && (
          <div
            className="absolute top-[20px] -right-[35px] w-[130px] rotate-45 bg-[#e50914] text-white text-[11px] md:text-[12px] font-black tracking-wider text-center py-1 shadow-[0_3px_10px_rgba(0,0,0,0.6)] z-20 uppercase"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          >
            GIẢM {movie.onlinePrice.discountPercentage}%
          </div>
        )}

        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-white dark:bg-[#18181b]">
            <span className="material-symbols-outlined text-white/20" style={{ fontSize: 48 }}>movie</span>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
          {movie.trailerUrl && (
            <button
              onClick={(e) => { e.stopPropagation(); setTrailerUrl(movie.trailerUrl); }}
              className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-200/30 bg-red-500/20 text-white backdrop-blur-md transition-transform hover:scale-110"
              type="button"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 40, fontVariationSettings: '"FILL" 1' }}>
                play_arrow
              </span>
            </button>
          )}
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#120606] via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex w-full flex-col gap-2">
            <Link onClick={(e) => e.stopPropagation()} to={`/movie-details?id=${movie.id}`} className="flex w-full items-center justify-center rounded-lg bg-[#dc2626] py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:brightness-110">
              Xem chi tiết
            </Link>
            {movie.onlinePrice && movie.status !== 'upcoming' && movie.status !== 'COMING_SOON' && movie.status !== 'coming_soon' && movie.status !== 'UPCOMING' && (
              <button onClick={(e) => { e.stopPropagation(); handleBuyClick(movie); }} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#dc2626] py-2.5 text-xs font-bold uppercase tracking-wider text-[#fca5a5] transition-all hover:bg-red-500/10">
                <span className="material-symbols-outlined text-[16px]">shopping_cart_checkout</span>
                Mua Trực Tuyến
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col min-h-[44px] mt-3">
        <h3
          title={movie.title}
          className="text-[11px] font-bold uppercase leading-snug text-[#111827] dark:text-white transition-colors group-hover:text-[#dc2626] truncate"
        >
          {movie.title}
        </h3>
        <p
          title={[movie.duration ? `${movie.duration} phút` : '', movie.genres?.map(g => g.name).join(', ')].filter(Boolean).join(' • ')}
          className="mt-1 text-[11px] font-medium text-[#8a8a8e] truncate"
        >
          {movie.duration && <span>{movie.duration} phút</span>}
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span className="mx-1.5 align-middle">•</span>
              <span>{movie.genres.map(g => g.name).join(', ')}</span>
            </>
          )}
        </p>
      </div>
      <div className="flex items-end justify-between mt-2">
        <span className="text-[14px] uppercase text-gray-500 font-bold leading-none">Bản Quyền</span>
        <div className="flex flex-col items-end leading-none gap-1">
          {movie.onlinePrice?.promoActive && movie.onlinePrice?.discountPercentage > 0 && (
            <span className="text-[11px] text-gray-500 line-through">
              {formatPrice(movie.onlinePrice.basePrice)}
            </span>
          )}
          <span className="text-[15px] font-black text-[#ff3333]">
            {movie.onlinePrice ? formatPrice(movie.onlinePrice.finalPrice) : <span className="text-gray-500 text-[12px] font-medium">Chưa mở bán</span>}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black selection:bg-red-500/30 text-[#111827] dark:text-white font-sans">
      <Header />

      <main className="flex-1">
        <section className="relative h-[250px] md:h-[350px] w-full flex flex-col items-center justify-center overflow-hidden bg-[#FAFAFA] dark:bg-black">
          <style>{`
            @keyframes scrollBanner {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-banner-scroll {
              animation: scrollBanner 40s linear infinite;
              display: flex;
              width: max-content;
            }
          `}</style>

          {/* Scrolling Banner Background */}
          {movies.length > 0 && (
            <div className="absolute inset-0 z-0 opacity-70 dark:opacity-80 overflow-hidden flex flex-col justify-center pointer-events-none filter blur-[1px] scale-105">
              <div className="animate-banner-scroll gap-4 px-2 items-center">
                {Array.from({ length: 30 }).map((_, i) => movies[i % movies.length]).map((m, i) => (
                  <div key={i} className="h-[280px] md:h-[400px] aspect-[2/3] shrink-0 rounded-lg overflow-hidden shadow-lg opacity-100">
                    <img src={m.posterUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overlay Gradients to blend banner */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#FAFAFA]/80 via-white/10 to-[#FAFAFA] dark:from-black/85 dark:via-black/10 dark:to-black"></div>
          <div className="absolute inset-0 z-10 bg-white/10 dark:bg-black/20"></div>

          <div className="relative z-20 text-center px-4 flex flex-col items-center justify-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tight mb-4 flex items-center justify-center gap-3 md:gap-5">
              <span className="text-[#111827] dark:text-white drop-shadow-[0_4px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">PHIM</span>
              <span className="text-[#dc2626] drop-shadow-[0_4px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_0_30px_rgba(220,38,38,0.8)]">TRỰC</span>
              <span className="text-yellow-500 drop-shadow-[0_4px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]">TUYẾN</span>
            </h1>
            <div className="mt-2">
              <p className="text-sm md:text-lg text-[#111827] dark:text-white font-bold tracking-wide drop-shadow-sm">
                <span className="text-[#111827] dark:text-white">Phim Đỉnh </span>
                <span className="text-[#dc2626]">Tại Nhà</span>
                <span className="text-[#111827] dark:text-white"> - Không Cần </span>
                <span className="text-[#dc2626]">Đi Xa</span>
              </p>
            </div>
          </div>
        </section>

        {/* Movies Grid */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-8 py-12">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
            </div>
          ) : movies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-white/10 mb-4" style={{ fontSize: 72 }}>movie</span>
              <p className="text-white/40 text-lg font-medium">Hiện chưa có phim trực tuyến</p>
              <p className="text-white/20 text-sm mt-2">Vui lòng quay lại sau</p>
            </div>
          ) : (
            <div className="flex flex-col gap-12 w-full">
              <div className="w-full">
                <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-6 text-left border-l-4 border-emerald-500 pl-3 uppercase">Phim Đang Chiếu</h3>
                {nowShowing.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 md:gap-8">
                    {nowShowing.map(renderMovieCard)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center border border-gray-200 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-white/5">
                    <span className="material-symbols-outlined text-gray-400 dark:text-white/20 mb-3" style={{ fontSize: 48 }}>movie</span>
                    <p className="text-gray-500 dark:text-white/40 text-[15px] font-medium">Hiện chưa có phim đang chiếu trực tuyến</p>
                  </div>
                )}
              </div>

              <div className="w-full mt-4">
                <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-6 text-left border-l-4 border-orange-500 pl-3 uppercase">Phim Sắp Chiếu</h3>
                {comingSoon.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 md:gap-8">
                    {comingSoon.map(renderMovieCard)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center border border-gray-200 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-white/5">
                    <span className="material-symbols-outlined text-gray-400 dark:text-white/20 mb-3" style={{ fontSize: 48 }}>movie_filter</span>
                    <p className="text-gray-500 dark:text-white/40 text-[15px] font-medium">Hiện chưa có phim sắp chiếu trực tuyến</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* Purchase Modal */}
      {isModalOpen && selectedMovie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white dark:bg-[#18181b] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-white/10 relative">
            <button
              onClick={() => !isProcessing && setIsModalOpen(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-[#111827] dark:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="text-[20px] font-black uppercase text-[#111827] dark:text-white tracking-wide text-center mb-6">Xác Nhận Mua</h2>

            <div className="flex gap-4 mb-6 bg-gray-50 dark:bg-black/30 p-4 rounded-2xl border border-gray-200 dark:border-white/10">
              {selectedMovie.posterUrl ? (
                <img src={selectedMovie.posterUrl} alt="" className="w-16 h-24 object-cover rounded-lg shadow-md" />
              ) : (
                <div className="w-16 h-24 flex items-center justify-center bg-white dark:bg-[#18181b] rounded-lg">
                  <span className="material-symbols-outlined text-white/20">movie</span>
                </div>
              )}
              <div className="flex flex-col justify-center">
                <h3 className="text-[15px] font-bold text-[#111827] dark:text-white line-clamp-2 leading-snug">{selectedMovie.title}</h3>
                <div className="mt-2 text-[#ff5757] font-black text-[16px]">
                  {formatPrice(selectedMovie.onlinePrice?.finalPrice)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-[#9D9D9D]">Thanh toán qua</span>
                <span className="text-[#111827] dark:text-white font-bold">Điểm RLF / Số dư</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-white/10 pt-4">
                <span className="text-gray-500 dark:text-[#9D9D9D] uppercase tracking-widest text-[11px] font-bold">Tổng thanh toán</span>
                <span className="text-2xl font-black text-[#e61a27]">
                  {formatPrice(selectedMovie.onlinePrice?.finalPrice)}
                </span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isProcessing}
                className="flex-1 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[14px] font-bold text-[#111827] dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmPurchase}
                disabled={isProcessing}
                className="flex-1 py-3.5 rounded-2xl bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(127,29,29,0.95))] border border-red-500/30 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(127,29,29,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isProcessing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Đang xử lý...
                  </>
                ) : (
                  'Thanh Toán'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trailer Modal */}
      {trailerUrl && embedUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setTrailerUrl(null)}>
          <div className="relative w-full max-w-5xl aspect-video bg-white dark:bg-black rounded-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setTrailerUrl(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm">
              <span className="material-symbols-outlined">close</span>
            </button>
            <iframe
              className="w-full h-full"
              src={`${embedUrl}?autoplay=1`}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen>
            </iframe>
          </div>
        </div>
      )}
    </div>
  );
}
