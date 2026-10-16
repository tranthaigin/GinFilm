import { useAsync } from '../../hooks/useAsync';
import apiEnvironment from '../../../../shared/config/env';
import { useCallback, useEffect, useState } from 'react';
import { getAgeRatingColor } from '../../../../shared/utils/movieHelpers';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { getAllGenres } from '../../api/services/genreService';
import { getRawMovies } from '../../api/services/movieService';
import { apiGet } from '../../../../shared/api/client';

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
    const apiUrl = apiEnvironment.apiBaseUrl;
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
  if (match && match[2].length === 11)
    return `https://www.youtube.com/embed/${match[2]}`;
  return url;
}

export default function GenrePage() {
  const { genreId } = useParams();
  const navigate = useNavigate();

  const fetcher = useCallback(() => {
    const movieRequest = /^\d+$/.test(genreId)
      ? apiGet(`/movies/genre/${genreId}`)
      : getRawMovies().then((items) =>
          items.filter((movie) =>
            movie.genres?.some(
              (genre) =>
                String(genre.id) === String(genreId) ||
                genre.name?.toLowerCase() === String(genreId).toLowerCase()
            )
          )
        );
    return Promise.all([getAllGenres().catch(() => []), movieRequest]).then(
      ([genres, movies]) => ({
        movies: movies || [],
        name:
          genres.find((genre) => String(genre.id) === String(genreId))?.name ||
          'Tất Cả Thể Loại',
      })
    );
  }, [genreId]);
  const resource = useAsync(fetcher);
  const movies = resource.data?.movies || [];
  const genreName = resource.data?.name || 'Thể Loại';
  const loading = resource.loading;

  // Modal & Trailer states
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [genreId]);

  const handleBuyOnlineClick = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const confirmPurchase = () => {
    setIsModalOpen(false);
    navigate('/checkout', {
      state: {
        movie: selectedMovie,
        isVOD: true,
        totalPrice: selectedMovie?.onlinePrice?.finalPrice || 0,
      },
    });
  };

  const embedUrl = trailerUrl ? getYoutubeEmbedUrl(trailerUrl) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black selection:bg-red-500/30 text-[#111827] dark:text-white font-sans">
      <Header />

      <main className="flex-1 overflow-hidden">
        <div
          key={genreId}
          className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
        >
          {/* Header Section */}
          <section className="max-w-[1440px] mx-auto px-4 md:px-8 pt-12">
            <div className="flex items-center gap-5 border-b border-gray-200 dark:border-white/10 pb-8">
              <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl border border-[#dc2626]/20 bg-[#dc2626]/5 text-[#dc2626]">
                <span className="material-symbols-outlined text-[32px]">
                  movie
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[28px] md:text-[32px] font-black uppercase tracking-wide text-[#111827] dark:text-white drop-shadow-sm">
                  PHIM THEO THỂ LOẠI: {genreName}
                </h1>
                <p className="text-[12px] font-bold tracking-[0.2em] text-[#8a8a8e] uppercase">
                  Trang 1 / 1 &mdash; Tìm thấy {movies.length} phim
                </p>
              </div>
            </div>
          </section>

          {/* Movies Grid */}
          <section className="max-w-[1440px] mx-auto px-4 md:px-8 py-16">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
              </div>
            ) : movies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span
                  className="material-symbols-outlined text-white/10 mb-4"
                  style={{ fontSize: 72 }}
                >
                  movie
                </span>
                <p className="text-white/40 text-lg font-medium">
                  Hiện chưa có phim thuộc thể loại này
                </p>
                <p className="text-white/20 text-sm mt-2">
                  Vui lòng quay lại sau
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {movies.map((movie) => {
                  const isOnline = Boolean(
                    movie.isOnlineAvailable ||
                      movie.onlineAvailable ||
                      movie.onlinePrice
                  );
                  const isCinema = movie.isCinemaAvailable !== false;

                  return (
                    <div
                      key={movie.id}
                      className="group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div
                          className="relative mb-3 aspect-[2/3] overflow-hidden rounded-lg border border-gray-200 dark:border-white/30 bg-white dark:bg-[#18181b] shadow-[0_16px_40px_rgba(0,0,0,0.45)] dark:shadow-[0_0_15px_rgba(255,255,255,0.08)] transition-transform duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_18px_48px_rgba(127,29,29,0.35)] dark:group-hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer"
                          onClick={() =>
                            movie.trailerUrl
                              ? setTrailerUrl(movie.trailerUrl)
                              : navigate(`/movie-details?id=${movie.id}`)
                          }
                        >
                          {movie.ageRating && (
                            <div
                              className={`absolute top-3 right-3 z-10 rounded-sm border border-white/15 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md ${getAgeRatingColor(movie.ageRating)}`}
                            >
                              {movie.ageRating}
                            </div>
                          )}

                          {isOnline &&
                            movie.onlinePrice?.promoActive &&
                            movie.onlinePrice?.discountPercentage > 0 && (
                              <div
                                className="absolute top-[20px] -right-[35px] w-[130px] rotate-45 bg-[#e50914] text-white text-[10px] font-black tracking-wider text-center py-1 shadow-[0_3px_10px_rgba(0,0,0,0.6)] z-20 uppercase"
                                style={{
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                }}
                              >
                                GIẢM {movie.onlinePrice.discountPercentage}%
                              </div>
                            )}

                          {movie.posterUrl ? (
                            <img
                              alt={movie.title}
                              className="h-full w-full object-cover"
                              src={movie.posterUrl}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-white dark:bg-[#18181b]">
                              <span
                                className="material-symbols-outlined text-white/20"
                                style={{ fontSize: 48 }}
                              >
                                movie
                              </span>
                            </div>
                          )}

                          {/* Hover Action Overlay */}
                          <div className="absolute inset-0 flex flex-col justify-between p-3 bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            {/* Center Play Button */}
                            <div className="flex-1 flex items-center justify-center">
                              {movie.trailerUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTrailerUrl(movie.trailerUrl);
                                  }}
                                  className="flex h-16 w-16 items-center justify-center rounded-full border border-red-200/30 bg-red-500/20 text-white backdrop-blur-md transition-transform duration-300 hover:scale-110"
                                  type="button"
                                >
                                  <span
                                    className="material-symbols-outlined ml-0.5 text-white"
                                    style={{
                                      fontSize: 40,
                                      fontVariationSettings: '"FILL" 1',
                                    }}
                                  >
                                    play_arrow
                                  </span>
                                </button>
                              )}
                            </div>

                            {/* Bottom Action Buttons */}
                            <div className="flex w-full flex-col gap-2 z-10">
                              <Link
                                to={`/movie-details?id=${movie.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex w-full items-center justify-center rounded-lg bg-[#dc2626] py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:brightness-110 shadow-md"
                              >
                                Xem chi tiết
                              </Link>

                              {/* Online Purchase Button */}
                              {isOnline && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBuyOnlineClick(movie);
                                  }}
                                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#dc2626] bg-black/60 backdrop-blur-md py-2 text-xs font-bold uppercase tracking-wider text-[#fca5a5] transition-all hover:bg-red-600 hover:text-white"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    shopping_cart_checkout
                                  </span>
                                  Mua Trực Tuyến
                                </button>
                              )}

                              {/* Cinema Booking Button */}
                              {isCinema && (
                                <Link
                                  to={`/movie-info?id=${movie.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex w-full items-center justify-center rounded-lg border border-[#dc2626] py-2 text-xs font-bold uppercase tracking-wider text-[#fca5a5] transition-all hover:bg-[#dc2626] hover:text-white active:bg-red-700"
                                >
                                  Đặt vé
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>

                        <h3
                          title={movie.title}
                          className="mt-3 text-[12px] font-bold uppercase leading-snug text-[#111827] dark:text-white transition-colors group-hover:text-[#dc2626] truncate"
                        >
                          {movie.title}
                        </h3>

                        <p className="text-[11px] font-medium text-[#8a8a8e] truncate mt-0.5">
                          {movie.duration && <span>{movie.duration} phút</span>}
                          {movie.genres && movie.genres.length > 0 && (
                            <>
                              <span className="mx-1.5 align-middle">•</span>
                              <span>
                                {movie.genres.map((g) => g.name).join(', ')}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Footer Badge/Price Display */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
                        {isOnline ? (
                          <>
                            <span className="text-[11px] uppercase text-gray-500 dark:text-gray-400 font-bold leading-none">
                              Bản Quyền
                            </span>
                            <span className="text-[13px] font-black text-[#ff3333] leading-none">
                              {movie.onlinePrice
                                ? formatPrice(movie.onlinePrice.finalPrice)
                                : 'Trực Tuyến'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] uppercase text-emerald-600 dark:text-emerald-400 font-bold leading-none flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>{' '}
                              Chiếu Rạp
                            </span>
                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                              Vé Rạp
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />

      {/* Online Purchase Modal */}
      {isModalOpen && selectedMovie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white dark:bg-[#18181b] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-white/10 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => !isProcessing && setIsModalOpen(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-[#111827] dark:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="text-[20px] font-black uppercase text-[#111827] dark:text-white tracking-wide text-center mb-6">
              Xác Nhận Mua Phim Trực Tuyến
            </h2>

            <div className="flex gap-4 mb-6 bg-gray-50 dark:bg-black/30 p-4 rounded-2xl border border-gray-200 dark:border-white/10">
              {selectedMovie.posterUrl ? (
                <img
                  src={selectedMovie.posterUrl}
                  alt=""
                  className="w-16 h-24 object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-16 h-24 flex items-center justify-center bg-white dark:bg-[#18181b] rounded-lg">
                  <span className="material-symbols-outlined text-white/20">
                    movie
                  </span>
                </div>
              )}
              <div className="flex flex-col justify-center">
                <h3 className="text-[15px] font-bold text-[#111827] dark:text-white line-clamp-2 leading-snug">
                  {selectedMovie.title}
                </h3>
                <div className="mt-2 text-[#ff5757] font-black text-[16px]">
                  {formatPrice(selectedMovie.onlinePrice?.finalPrice)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-[#9D9D9D]">
                  Loại xem
                </span>
                <span className="text-[#111827] dark:text-white font-bold">
                  Xem Phim Trực Tuyến (VOD)
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-white/10 pt-4">
                <span className="text-gray-500 dark:text-[#9D9D9D] uppercase tracking-widest text-[11px] font-bold">
                  Tổng thanh toán
                </span>
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
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      progress_activity
                    </span>
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
              src={`${embedUrl}?autoplay=1`}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
}
