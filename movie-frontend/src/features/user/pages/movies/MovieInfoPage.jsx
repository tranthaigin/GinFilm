
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useProvinces } from '../../hooks/useProvinces';
import { getAgeRatingColor } from '../../../../shared/utils/movieHelpers';

/** Skeleton loading cho bộ lọc tỉnh/thành */
function ProvinceSkeleton() {
  return (
    <div className="flex flex-wrap gap-2.5 mb-8 pb-8 border-b border-gray-200 dark:border-white/10 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-white/10" style={{ width: `${60 + (i % 4) * 15}px` }} />
      ))}
    </div>
  );
}

import { getRawMovieDetails, getMovieShowtimes } from '../../api/services/movieService';
function getYoutubeEmbedUrl(url) {
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
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

export default function MovieInfoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const movieId = searchParams.get('id');
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const textRef = useRef(null);

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

  const dates = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
      const date = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      return { dayOfWeek, date, month, fullDate: `${d.getFullYear()}-${month}-${date}` };
    });
  }, []);

  const [activeDate, setActiveDate] = useState(dates[0].date);
  const [activeFormat, setActiveFormat] = useState('');

  const datesContainerRef = useRef(null);

  const scrollDates = (direction) => {
    if (datesContainerRef.current) {
      datesContainerRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
    }
  };

  // ── Tỉnh/Thành & Rạp từ API ──────────────────────────────────────────────
  const {
    provinces,
    loading: provincesLoading,
    error: provincesError,
    activeProvinceId,
    activeProvince,
    theatersForActiveProvince,
    setActiveProvinceId,
  } = useProvinces();

  const [cinemas, setCinemas] = useState([]);
  const [loadingCinemas, setLoadingCinemas] = useState(false);

  // Extract unique formats from actual showtimes to only show tabs for available formats
  const availableFormats = useMemo(() => {
    const formatSet = new Set();
    cinemas.forEach(cinema => {
      cinema.showtimes?.forEach(st => {
        if (st.format) formatSet.add(st.format);
      });
    });
    return Array.from(formatSet);
  }, [cinemas]);


  useEffect(() => {
    const fetchCinemas = async () => {
      const selectedDateObj = dates.find(d => d.date === activeDate);
      if (!selectedDateObj || !movieId || !activeProvinceId) return;

      try {
        setLoadingCinemas(true);
        const data = await getMovieShowtimes(movieId, activeProvinceId, selectedDateObj.fullDate);
        setCinemas(data || []);
      } catch (e) {
        console.error('Lỗi khi tải lịch chiếu:', e);
        setCinemas([]);
      } finally {
        setLoadingCinemas(false);
      }
    };
    fetchCinemas();
  }, [movieId, activeProvinceId, activeDate, dates]);

  useEffect(() => {
    if (availableFormats.length > 0 && !availableFormats.includes(activeFormat)) {
      setActiveFormat(availableFormats[0]);
    } else if (availableFormats.length === 0) {
      setActiveFormat('');
    }
  }, [availableFormats, activeFormat]);

  const displayCinemas = useMemo(() => {
    const selectedDateObj = dates.find(d => d.date === activeDate);
    const isToday = selectedDateObj && selectedDateObj.fullDate === dates[0].fullDate;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    if (!activeFormat) return []; // No formats available

    return cinemas
      .map((cinema) => {
        let filteredShows = cinema.showtimes.filter(s => s.format === activeFormat);

        if (isToday) {
          filteredShows = filteredShows.filter(show => {
            const [h, m] = show.time.split(':').map(Number);
            if (h > currentHours) return true;
            if (h === currentHours && m > currentMinutes) return true;
            return false;
          });
        }

        return { ...cinema, shows: filteredShows };
      })
      .filter((c) => c.shows.length > 0);
  }, [cinemas, activeDate, dates, activeFormat]);

  const genreStr = movie?.genres && movie.genres.length > 0
    ? movie.genres.map(g => g.name).join(' · ')
    : 'Đang cập nhật';

  const embedUrl = movie?.trailerUrl ? getYoutubeEmbedUrl(movie.trailerUrl) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white selection:bg-[#e61a27] selection:text-white font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .material-symbols-outlined {
              font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
            }
          `,
        }}
      />

      <Header />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 py-10 md:py-16">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <span className="material-symbols-outlined text-gray-300 dark:text-white/10 mb-4" style={{ fontSize: 72 }}>error</span>
            <p className="text-gray-500 dark:text-white/50 text-lg font-medium">{error}</p>
            <Link to="/" className="mt-4 bg-[#e61a27] text-white px-6 py-2 rounded-md font-bold hover:bg-red-700 transition-colors">
              Về trang chủ
            </Link>
          </div>
        ) : movie ? (
          <>
            {/* Title Header */}
            <div className="border-b-2 border-[#e61a27] pb-4 mb-6 flex justify-between items-center relative">
              <h1 className="text-2xl text-[#111827] dark:text-white font-bold uppercase tracking-wide">ĐẶT VÉ</h1>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-bold text-[14px] whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Quay lại
                </button>
              </div>
            </div>

            {/* Top Section: Poster + Details */}
            <div className="flex flex-col md:flex-row gap-10 md:gap-16">
              {/* Left column: Poster */}
              <div className="w-full md:w-[360px] flex-shrink-0">
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden border border-gray-200 dark:border-white/30 shadow-[0_30px_60px_rgba(0,0,0,0.6)] dark:shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white dark:bg-[#18181b]">
                      <span className="material-symbols-outlined text-white/20" style={{ fontSize: 64 }}>movie</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: Details */}
              <div className="w-full flex-1 flex flex-col justify-start pt-2 pb-2">
                <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight line-clamp-3" title={movie.title}>{movie.title}</h1>

                <div className="flex flex-wrap items-center gap-6 text-[15px] text-gray-600 dark:text-[#e0e0e0] mb-4">
                  {movie.releaseDate && (
                    <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[20px]">calendar_month</span> {new Date(movie.releaseDate).getFullYear()}</div>
                  )}
                  {movie.duration && (
                    <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[20px]">schedule</span> {movie.duration}m</div>
                  )}
                  {movie.ageRating && (
                    <div className="flex items-center gap-1.5"><span className={`font-bold text-white px-2 py-0.5 rounded text-[13px] ${getAgeRatingColor(movie.ageRating || 'T16')}`}>{movie.ageRating || 'T16'}</span></div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {movie.genres && movie.genres.length > 0 ? (
                    [...movie.genres].sort((a, b) => a.name.length - b.name.length).map(g => (
                      <span key={g.id} className="px-4 py-1.5 rounded-full bg-white dark:bg-black border border-white/15 text-[13px] font-medium text-[#111827] dark:text-white shadow-sm">{g.name}</span>
                    ))
                  ) : (
                    <span className="px-4 py-1.5 rounded-full bg-white dark:bg-black border border-white/15 text-[13px] font-medium text-[#111827] dark:text-white shadow-sm">Đang cập nhật</span>
                  )}
                </div>

                {movie.description && (
                  <div className="mb-6 max-w-2xl clear-none">
                    <h2 className="text-2xl font-black mb-2 uppercase tracking-wide">Nội dung phim</h2>
                    <div className="relative">
                      <div ref={textRef} className={`whitespace-pre-line text-[#111827] dark:text-[#9D9D9D] dark:text-[#9D9D9D] leading-[1.8] text-[15px] transition-all duration-300 ${!isDescExpanded ? 'line-clamp-4' : ''}`}>
                        {movie.description.replace(/(?:\r?\n\s*){2,}/g, '\n\n')}
                      </div>
                    </div>
                    {showReadMore && (
                      <button
                        onClick={toggleDescription}
                        className="mt-3 text-gray-500 dark:text-white/50 hover:text-[#111827] dark:text-white text-[13px] font-bold transition-colors uppercase tracking-wide flex items-center gap-1"
                      >
                        {isDescExpanded ? 'Ẩn bớt' : 'Hiện thêm'}
                        <span className="material-symbols-outlined text-[16px]">{isDescExpanded ? 'expand_less' : 'expand_more'}</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 mt-auto">
                  {embedUrl && (
                    <button onClick={() => setIsTrailerOpen(true)} className="flex items-center gap-2 bg-transparent border border-[#e61a27] text-[#e61a27] hover:bg-[#e61a27]/10 px-6 py-2.5 rounded-md font-bold transition-colors">
                      <span className="material-symbols-outlined text-[20px]">play_arrow</span> Xem Trailer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Showtimes card - Full Width */}
            <div className="bg-white dark:bg-black rounded-2xl p-7 md:p-10 border border-gray-200 dark:border-white/10 shadow-xl mt-12 md:mt-16">
              <h2 className="text-[28px] font-black mb-8 uppercase tracking-wide">Lịch Chiếu Phim</h2>

              {/* Dates */}
              <div className="relative mb-8 border-b border-gray-200 dark:border-white/10 pb-4 px-8 md:px-12 group">
                <button
                  onClick={() => scrollDates('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#e50914] text-white flex items-center justify-center rounded-full cursor-pointer hover:bg-[#b80710] transition-all font-bold z-20 text-2xl shadow-[0_0_10px_rgba(229,9,20,0.5)] border-none"
                >
                  &lt;
                </button>

                <div ref={datesContainerRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-1">
                  {dates.map((d) => (
                    <button
                      key={d.fullDate}
                      onClick={() => setActiveDate(d.date)}
                      className={`flex flex-col items-center justify-center min-w-[75px] py-3.5 px-2 rounded-sm border transition-all ${activeDate === d.date
                        ? 'bg-white dark:bg-[#18181b] border-[#e61a27] border-b-4 text-[#111827] dark:text-white shadow-[0_0_15px_rgba(229,9,20,0.2)]'
                        : 'bg-gray-50 dark:bg-[#222] border-gray-300 dark:border-[#333] hover:border-[#e61a27] hover:text-[#e61a27] text-gray-500 dark:text-[#9D9D9D]'
                        }`}
                    >
                      <span className="text-[11px] uppercase font-bold tracking-widest opacity-80">{d.month}</span>
                      <span className="text-[28px] font-black leading-none my-1.5">{d.date}</span>
                      <span className="text-[11px] uppercase font-bold tracking-widest opacity-80">{d.dayOfWeek}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => scrollDates('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#e50914] text-white flex items-center justify-center rounded-full cursor-pointer hover:bg-[#b80710] transition-all font-bold z-20 text-2xl shadow-[0_0_10px_rgba(229,9,20,0.5)] border-none"
                >
                  &gt;
                </button>
              </div>

              {/* ── Tỉnh/Thành phố (từ API) ── */}
              {provincesLoading ? (
                <ProvinceSkeleton />
              ) : provincesError ? (
                <div className="mb-8 pb-8 border-b border-gray-200 dark:border-white/10 flex items-center gap-3 text-red-400 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  Không thể tải danh sách tỉnh/thành.
                  <button className="underline hover:text-red-300" onClick={() => window.location.reload()}>Thử lại</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5 mb-8 pb-8 border-b border-gray-200 dark:border-white/10">
                  {provinces.map((province) => (
                    <button
                      key={province.id}
                      onClick={() => setActiveProvinceId(province.id)}
                      title={`${province.theaterCount} cụm rạp`}
                      className={`relative px-5 py-2.5 rounded-lg text-[14px] font-bold transition-all duration-200 border ${activeProvinceId === province.id
                        ? 'bg-[#e61a27] text-white border-[#e61a27] shadow-[0_0_12px_rgba(230,26,39,0.4)]'
                        : 'bg-white dark:bg-[#18181b] text-[#111827] dark:text-[#9D9D9D] border-gray-300 dark:border-white/10 hover:border-[#e61a27] hover:text-[#e61a27] hover:bg-gray-50 dark:hover:border-white/30 dark:hover:text-white dark:hover:bg-white/10'
                        }`}
                    >
                      {province.name}
                      {province.theaterCount > 0 && (
                        <span className={`ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${activeProvinceId === province.id ? 'bg-white/20 text-white' : 'bg-white/10 text-[#111827] dark:text-[#9D9D9D]'
                          }`}>
                          {province.theaterCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Format Tabs */}
              {availableFormats.length > 0 && (
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                  {availableFormats.map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setActiveFormat(fmt)}
                      className={`px-4 py-2 rounded font-bold whitespace-nowrap transition-colors border ${activeFormat === fmt
                        ? 'bg-[#e61a27] text-white border-[#e61a27]'
                        : 'bg-white dark:bg-white/10 text-[#111827] dark:text-white/70 border-gray-300 dark:border-transparent hover:border-[#e61a27] hover:text-[#e61a27] hover:bg-gray-50 dark:hover:border-white/30 dark:hover:bg-white/20'
                        }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Cụm rạp & Giờ chiếu ── */}
              <div className="space-y-10">
                {activeProvince && !provincesLoading && (
                  <div className="flex items-center gap-2 text-[13px] text-[#111827] dark:text-[#9D9D9D] -mt-4">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <span>{activeProvince.name}</span>
                    <span className="text-gray-600">·</span>
                    <span>{activeProvince.theaterCount} cụm rạp</span>
                  </div>
                )}

                {loadingCinemas ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
                  </div>
                ) : displayCinemas.length > 0 ? (
                  displayCinemas.map((cinema, cIdx) => (
                    <div key={cinema.id ?? cinema.name}>
                      <h3 className="text-[20px] font-bold text-[#111827] dark:text-white mb-1">{cinema.name}</h3>
                      {cinema.address && (
                        <p className="text-[13px] text-gray-600 mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">place</span>
                          {cinema.address}
                        </p>
                      )}
                      {cinema.phone && (
                        <p className="text-[12px] text-gray-700 mb-1">☎ {cinema.phone}</p>
                      )}
                      <p className="text-[14px] text-[#111827] dark:text-[#9D9D9D] dark:text-[#9D9D9D] mb-5 font-medium border-b border-gray-200 dark:border-white/10 pb-4">Rạp {activeFormat.split(' ')[0]}</p>
                      <div className="flex flex-wrap gap-3.5">
                        {cinema.shows.map((show, idx) => {
                          const isSoldOut = false;
                          return (
                            <Link
                              key={show.id ?? show.time + idx}
                              to={`/booking?showId=${show.id}&movieId=${movieId}`}
                              className={`px-5 py-2.5 rounded-sm border text-[15px] font-bold transition-all relative overflow-hidden group/btn ${isSoldOut
                                ? 'border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/20 pointer-events-none bg-gray-100 dark:bg-white/5'
                                : 'bg-white dark:bg-[#18181b] border-gray-300 dark:border-[#444] text-[#111827] dark:text-[#9D9D9D] hover:bg-[#e61a27] hover:text-white hover:border-[#e61a27] hover:shadow-[0_0_15px_rgba(229,9,20,0.5)]'
                                }`}
                            >
                              {!isSoldOut && <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />}
                              <span className="relative z-10">{show.time}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 border border-gray-200 dark:border-white/10 rounded-xl bg-white/5">
                    <span className="material-symbols-outlined text-4xl text-gray-500 mb-3 block">event_busy</span>
                    <p className="text-gray-500 dark:text-[#9D9D9D] text-lg">
                      {provincesLoading ? 'Đang tải...' : 'Không có suất chiếu nào vào ngày này tại khu vực bạn chọn.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>

      <Footer />

      {/* Trailer Modal */}
      {isTrailerOpen && embedUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setIsTrailerOpen(false)}>
          <div className="relative w-full max-w-5xl aspect-video bg-white dark:bg-black rounded-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsTrailerOpen(false)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm">
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
