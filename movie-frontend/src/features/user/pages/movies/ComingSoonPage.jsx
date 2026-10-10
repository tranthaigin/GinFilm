import React, { useEffect, useState } from 'react';
import { getAgeRatingColor } from '../../../../shared/utils/movieHelpers';
import { Link, useNavigate } from 'react-router-dom';

import UserPagination from '../../components/UserPagination';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

import { getRawMovies } from '../../api/services/movieService';
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
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

export default function ComingSoonPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [trailerUrl, setTrailerUrl] = useState(null);
  const embedUrl = trailerUrl ? getYoutubeEmbedUrl(trailerUrl) : null;

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const data = await getRawMovies();
      setMovies(data.filter(m => (m.status === 'upcoming' || m.status === 'COMING_SOON') && m.isCinemaAvailable !== false));
    } catch (error) {
      console.error('Lỗi khi tải phim:', error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(movies.length / itemsPerPage);
  const currentMovies = movies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black selection:bg-red-500/30 text-[#111827] dark:text-white font-sans">
      <Header />

      <main className="flex-1">
        {/* Header Section */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-8 pt-12">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-8">
            <div className="flex items-center gap-5">
              <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl border border-[#dc2626]/20 bg-[#dc2626]/5 text-[#dc2626]">
                <span className="material-symbols-outlined text-[32px]">calendar_month</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[28px] md:text-[32px] font-black uppercase tracking-wide text-[#111827] dark:text-white drop-shadow-sm">
                  PHIM SẮP CHIẾU
                </h1>
                <p className="text-[12px] font-bold tracking-[0.2em] text-[#8a8a8e] uppercase">
                  Trang {currentPage} / {totalPages || 1} &mdash; Tìm thấy {movies.length} phim
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-bold text-[14px] whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Quay lại
            </button>
          </div>
        </section>

        {/* Movies Grid */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-8 pt-8 pb-16">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
            </div>
          ) : movies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-white/10 mb-4" style={{ fontSize: 72 }}>movie</span>
              <p className="text-white/40 text-lg font-medium">Hiện chưa có phim sắp chiếu</p>
              <p className="text-white/20 text-sm mt-2">Vui lòng quay lại sau</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {currentMovies.map((movie) => (
                  <div key={movie.id} className="group cursor-pointer">
                    <div 
                      className="relative mb-4 aspect-[2/3] overflow-hidden rounded-lg border border-gray-200 dark:border-white/30 bg-white dark:bg-[#18181b] shadow-[0_16px_40px_rgba(0,0,0,0.45)] dark:shadow-[0_0_15px_rgba(255,255,255,0.08)] transition-transform duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_18px_48px_rgba(127,29,29,0.35)] dark:group-hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer"
                      onClick={() => movie.trailerUrl ? setTrailerUrl(movie.trailerUrl) : navigate(`/movie-details?id=${movie.id}`)}
                    >
                      {movie.ageRating && (
                        <div className={`absolute top-3 right-3 z-10 rounded-sm border border-white/15 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md ${getAgeRatingColor(movie.ageRating)}`}>
                          {movie.ageRating}
                        </div>
                      )}
                      {movie.posterUrl ? (
                        <img alt={movie.title} className="h-full w-full object-cover" src={movie.posterUrl} />
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

                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#120606] via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="flex w-full flex-col gap-2">
                          <Link onClick={(e) => e.stopPropagation()} to={`/movie-details?id=${movie.id}`} className="flex w-full items-center justify-center rounded-lg bg-[#dc2626] py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:brightness-110">
                            Xem chi tiết
                          </Link>
                          {movie.isCinemaAvailable !== false ? (
                            <Link onClick={(e) => e.stopPropagation()} to={`/movie-info?id=${movie.id}`} className="flex w-full items-center justify-center rounded-lg border border-[#dc2626] py-2 text-xs font-bold uppercase tracking-wider text-[#fca5a5] transition-all hover:bg-[#dc2626] hover:text-white active:bg-red-700">
                              Đặt vé
                            </Link>
                          ) : (
                            <Link onClick={(e) => e.stopPropagation()} to={`/movie-details?id=${movie.id}`} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#dc2626] bg-black/60 backdrop-blur-md py-2 text-xs font-bold uppercase tracking-wider text-[#fca5a5] transition-all hover:bg-red-600 hover:text-white">
                              <span className="material-symbols-outlined text-[16px]">shopping_cart_checkout</span>
                              Mua Trực Tuyến
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col min-h-[48px] mt-3">
                      <h3 
                        title={movie.title}
                        className="text-[11px] font-bold uppercase leading-snug text-[#111827] dark:text-white transition-colors group-hover:text-[#dc2626] truncate"
                      >
                        {movie.title}
                      </h3>
                      <p 
                        title={[movie.duration ? `${movie.duration} phút` : '', movie.genres?.map(g => g.name).join(', ')].filter(Boolean).join(' • ')}
                        className="mt-1.5 text-[12px] font-medium text-[#8a8a8e] truncate"
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
                  </div>
                ))}
              </div>

              <UserPagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
            </>
          )}
        </section>
      </main>

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

      <Footer />
    </div>
  );
}
