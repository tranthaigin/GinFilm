import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getAgeRatingColor } from '../../../../shared/utils/movieHelpers';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useMovieReviews } from '../../hooks/useMovieReviews';
import MovieReviewSection from '../../components/movies/MovieReviewSection';
import { getRawMovieDetails } from '../../api/services/movieService';

// Map ageRating code to full description
const AGE_RATING_MAP = {
  'P': { label: 'P', desc: 'PHIM ĐƯỢC PHỔ BIẾN ĐẾN MỌI ĐỐI TƯỢNG' },
  'T13': { label: 'T13', desc: 'PHIM ĐƯỢC PHỔ BIẾN ĐẾN NGƯỜI XEM TỪ ĐỦ 13 TUỔI TRỞ LÊN (13+)' },
  'T16': { label: 'T16', desc: 'PHIM ĐƯỢC PHỔ BIẾN ĐẾN NGƯỜI XEM TỪ ĐỦ 16 TUỔI TRỞ LÊN (16+)' },
  'T18': { label: 'T18', desc: 'PHIM ĐƯỢC PHỔ BIẾN ĐẾN NGƯỜI XEM TỪ ĐỦ 18 TUỔI TRỞ LÊN (18+)' },
  'C': { label: 'C', desc: 'PHIM KHÔNG ĐƯỢC PHÉP PHỔ BIẾN' },
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
  return url;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Đang cập nhật';
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export default function MovieDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const movieId = searchParams.get('id');
  const highlightReviewId = searchParams.get('highlightReview');
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const textRef = useRef(null);

  const {
    reviews,
    currentPage,
    setCurrentPage,
    totalPages,
    revealedSpoilers,
    setRevealedSpoilers,
    expandedReviews,
    toggleReviewExpand,
    handleReaction,
    handleReportReview,
    totalVerifiedReviews,
    avgRating,
    starCounts,
    currentUser,
    isAuthenticated
  } = useMovieReviews(movieId);

  useEffect(() => {
    if (textRef.current) {
      setShowReadMore(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [movie?.description]);

  const toggleDescription = () => {
    if (isDescExpanded) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsDescExpanded(!isDescExpanded);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (movieId) {
      fetchMovie(movieId);
    } else {
      setError('Không tìm thấy ID phim');
      setLoading(false);
    }
  }, [movieId]);

  const fetchMovie = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRawMovieDetails(id);
      setMovie(data);
    } catch (err) {
      console.error('Lỗi khi tải phim:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ageInfo = movie?.ageRating ? (AGE_RATING_MAP[movie.ageRating] || { label: movie.ageRating, desc: '' }) : null;
  const genreStr = movie?.genres && movie.genres.length > 0
    ? movie.genres.map(g => g.name).join(', ')
    : 'Đang cập nhật';
  const embedUrl = movie?.trailerUrl ? getYoutubeEmbedUrl(movie.trailerUrl) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white font-sans">
      <Header />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <span className="material-symbols-outlined text-white/10 mb-4" style={{ fontSize: 72 }}>error</span>
            <p className="text-white/50 text-lg font-medium mb-2">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 bg-[#e61a27] text-white px-6 py-2 rounded-md font-bold hover:bg-red-700 transition-colors"
            >
              Về trang chủ
            </button>
          </div>
        ) : movie ? (
          <>
            {/* Title Header */}
            <div className="border-b-2 border-[#e61a27] pb-4 mb-6 flex justify-between items-center relative">
              <h1 className="text-2xl text-[#111827] dark:text-white font-bold uppercase tracking-wide">Nội Dung Phim</h1>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-bold text-[14px] whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Quay lại
                </button>
              </div>
            </div>

            {/* Top Section: Poster + Details */}
            <div className="flex flex-col md:flex-row gap-8 mb-8">
              {/* Poster */}
              <div
                className="w-[220px] shrink-0 rounded-lg border border-gray-200 dark:border-white/30 bg-white dark:bg-[#18181b] p-1 shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_15px_rgba(255,255,255,0.08)] cursor-pointer group transition-all duration-300 hover:border-gray-300 dark:hover:border-white/60 dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                onClick={() => { if (embedUrl) setIsTrailerOpen(true); }}
                title={embedUrl ? 'Xem Trailer' : ''}
              >
                <div className="relative w-full h-full overflow-hidden rounded-md">
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] flex items-center justify-center bg-white dark:bg-[#18181b]">
                      <span className="material-symbols-outlined text-white/20" style={{ fontSize: 64 }}>movie</span>
                    </div>
                  )}
                  {embedUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                      <div className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-200/30 bg-red-500/20 text-white backdrop-blur-md transition-transform hover:scale-110">
                        <span className="material-symbols-outlined" style={{ fontSize: 40, fontVariationSettings: '"FILL" 1' }}>
                          play_arrow
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col flex-1 text-[16px]">
                <div className="border-b border-gray-200 dark:border-white/20 pb-4 mb-5">
                  <h2 className="text-[32px] md:text-[36px] font-black uppercase text-[#111827] dark:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] line-clamp-2 break-words leading-[1.2]">
                    {movie.title}
                  </h2>
                </div>

                <div className="flex flex-col gap-2.5 mb-8">
                  <div><strong className="font-bold text-[#111827] dark:text-white">Thể loại: </strong>{genreStr}</div>
                  <div><strong className="font-bold text-[#111827] dark:text-white">Khởi chiếu: </strong>{formatDate(movie.releaseDate)}</div>
                  <div><strong className="font-bold text-[#111827] dark:text-white">Thời lượng: </strong>{movie.duration ? `${movie.duration} phút` : 'Đang cập nhật'}</div>
                  {ageInfo && (
                    <div>
                      <strong className="font-bold text-[#111827] dark:text-white">Phân loại: </strong>
                      {ageInfo.label}{ageInfo.desc ? ` - ${ageInfo.desc}` : ''}
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  {ageInfo && (
                    <span className={`text-white font-bold px-2 py-0.5 rounded text-[15px] ${getAgeRatingColor(movie.ageRating)}`}>{ageInfo.label}</span>
                  )}
                  {movie.formats && movie.formats.map((fmt) => (
                    <span key={fmt.id} className="border border-gray-300 dark:border-white/40 text-gray-500 dark:text-[#9D9D9D] font-bold px-2 py-0.5 rounded text-[15px] bg-transparent tracking-tighter">
                      {fmt.name}
                    </span>
                  ))}
                </div>

                {/* Buttons */}
                <div className="mt-auto flex flex-wrap items-center gap-4">

                  {(movie.isCinemaAvailable || ['COMING_SOON', 'coming_soon', 'upcoming', 'UPCOMING'].includes(movie.status)) && (
                    <button
                      onClick={() => navigate(`/movies/${movie.id}`)}
                      className="bg-[#e61a27] border border-[#e61a27] text-white px-6 py-2 rounded-md font-bold hover:bg-red-700 hover:border-red-700 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">local_activity</span>
                      MUA VÉ TẠI RẠP
                    </button>
                  )}

                  {movie.isOnlineAvailable === true && !['COMING_SOON', 'coming_soon', 'upcoming', 'UPCOMING'].includes(movie.status) && (
                    <button
                      onClick={() => navigate('/checkout', {
                        state: {
                          movie: movie,
                          isVOD: true,
                          totalPrice: movie?.onlinePrice?.finalPrice || 50000
                        }
                      })}
                      className="bg-[#007bff] border border-[#007bff] text-white px-6 py-2 rounded-md font-bold hover:bg-[#0056b3] hover:border-[#0056b3] transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">live_tv</span>
                      MUA TRỰC TUYẾN
                    </button>
                  )}

                  {embedUrl && (
                    <button
                      onClick={() => setIsTrailerOpen(true)}
                      className="bg-transparent border border-[#e61a27] text-[#e61a27] px-6 py-2 rounded-md font-bold hover:bg-[#e61a27] hover:text-white transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">play_circle</span>
                      XEM TRAILER
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Synopsis / Description */}
            {movie.description && (
              <div className="mt-8 clear-none">
                <div className="relative">
                  <div ref={textRef} className={`whitespace-pre-line text-[14px] leading-relaxed text-gray-500 dark:text-[#9D9D9D] text-justify transition-all duration-300 ${!isDescExpanded ? 'line-clamp-4' : ''}`}>
                    {movie.description.replace(/(?:\r?\n\s*){2,}/g, '\n\n')}
                  </div>
                </div>
                {showReadMore && (
                  <button
                    onClick={toggleDescription}
                    className="mt-3 text-white/50 hover:text-[#111827] dark:text-white text-[13px] font-bold transition-colors uppercase tracking-wide flex items-center gap-1"
                  >
                    {isDescExpanded ? 'Ẩn bớt' : 'Hiện thêm'}
                    <span className="material-symbols-outlined text-[16px]">{isDescExpanded ? 'expand_less' : 'expand_more'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Review Section - Only for online movies, and not for upcoming movies */}
            {movie.isOnlineAvailable && !['COMING_SOON', 'coming_soon', 'upcoming', 'UPCOMING'].includes(movie.status) && (
              <MovieReviewSection
                reviews={reviews}
                avgRating={avgRating}
                totalVerifiedReviews={totalVerifiedReviews}
                starCounts={starCounts}
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                expandedReviews={expandedReviews}
                toggleReviewExpand={toggleReviewExpand}
                revealedSpoilers={revealedSpoilers}
                setRevealedSpoilers={setRevealedSpoilers}
                handleReaction={handleReaction}
                handleReportReview={handleReportReview}
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
                highlightReviewId={highlightReviewId}
              />
            )}
          </>
        ) : null}
      </main>

      <Footer />

      {/* Trailer Modal */}
      {isTrailerOpen && embedUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-12 backdrop-blur-sm" onClick={() => setIsTrailerOpen(false)}>
          <div className="relative w-full max-w-5xl aspect-video bg-white dark:bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsTrailerOpen(false)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-[#e61a27] text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm">
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
