import { useAsync } from '../../hooks/useAsync';
import { useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MovieCard from '../../components/movie/MovieCard';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { searchMovies, getRawMovies } from '../../api/services/movieService';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();

  const popularFetcher = useCallback(
    () => getRawMovies({ status: 'NOW_SHOWING' }),
    []
  );
  const popular = useAsync(popularFetcher);
  const popularMovies = useMemo(
    () =>
      (popular.data || [])
        .slice(0, 10)
        .map((movie) => ({ ...movie, type: 'cinema' })),
    [popular.data]
  );
  const searchFetcher = useCallback(
    () => (query.trim() ? searchMovies(query) : Promise.resolve([])),
    [query]
  );
  const search = useAsync(searchFetcher);
  const results = useMemo(
    () =>
      (search.data || []).flatMap((movie) => [
        ...(movie.isCinemaAvailable ? [{ ...movie, type: 'cinema' }] : []),
        ...(movie.isOnlineAvailable ? [{ ...movie, type: 'online' }] : []),
      ]),
    [search.data]
  );
  const isSearching = Boolean(query.trim()) && search.loading;
  const searched = !query.trim() || !search.loading;

  const fallbackBanners = [
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1200&auto=format&fit=crop',
  ];

  const bannerImages =
    popularMovies.length > 0
      ? popularMovies.map((m) => m.posterUrl || m.imageUrl).filter(Boolean)
      : fallbackBanners;

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] dark:bg-black">
      <Header />
      {search.error && (
        <p role="alert" className="p-4 text-red-500">
          {search.error.message}
        </p>
      )}

      <div className="flex-1 pb-20">
        {/* Modern Hero Banner */}
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
          {bannerImages.length > 0 && (
            <div className="absolute inset-0 z-0 opacity-70 dark:opacity-80 overflow-hidden flex flex-col justify-center pointer-events-none filter blur-[1px] scale-105">
              <div className="animate-banner-scroll gap-4 px-2 items-center">
                {Array.from({ length: 30 })
                  .map((_, i) => bannerImages[i % bannerImages.length])
                  .map((imgUrl, i) => (
                    <div
                      key={i}
                      className="h-[280px] md:h-[400px] aspect-[2/3] shrink-0 rounded-lg overflow-hidden shadow-lg opacity-100"
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Overlay Gradients to blend banner */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#FAFAFA]/80 via-white/10 to-[#FAFAFA] dark:from-black/85 dark:via-black/10 dark:to-black"></div>
          <div className="absolute inset-0 z-10 bg-white/10 dark:bg-black/20"></div>

          {/* Banner Content */}
          <div className="relative z-20 text-center px-4 flex flex-col items-center justify-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tight mb-4 flex items-center justify-center flex-wrap gap-x-3 md:gap-5">
              <span className="text-[#ffb400] drop-shadow-[0_4px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_0_30px_rgba(255,180,0,0.8)]">
                TÌM KIẾM
              </span>
              <span className="text-[#111827] dark:text-white drop-shadow-[0_4px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">
                &
              </span>
              <span className="text-[#ff0055] drop-shadow-[0_4px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_0_30px_rgba(255,0,85,0.8)]">
                KHÁM PHÁ
              </span>
            </h1>
            <div className="mt-2">
              <p className="text-sm md:text-lg text-[#111827] dark:text-white font-bold tracking-wide drop-shadow-sm">
                Tìm kiếm những bộ phim và suất chiếu hấp dẫn nhất tại{' '}
                <span className="text-[#dc2626]">GinFilm</span>
              </p>
            </div>
            {query.trim() && (
              <div className="mt-6 px-6 py-2 bg-white/90 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-full shadow-lg backdrop-blur-md">
                <p className="text-sm md:text-base font-medium text-[#111827] dark:text-[#9D9D9D]">
                  Kết quả tìm kiếm cho{' '}
                  <span className="text-[#dc2626] font-bold">"{query}"</span>
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-4 md:px-8 mt-8">
          {isSearching ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#e61a27] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            searched &&
            (results.length > 0 ? (
              (() => {
                const nowShowing = results.filter(
                  (m) =>
                    m.type === 'cinema' &&
                    (m.status === 'NOW_SHOWING' || m.status === 'showing')
                );
                const comingSoon = results.filter(
                  (m) =>
                    m.type === 'cinema' &&
                    (m.status === 'COMING_SOON' ||
                      m.status === 'coming_soon' ||
                      m.status === 'upcoming' ||
                      m.status === 'UPCOMING')
                );
                const online = results.filter((m) => m.type === 'online');

                return (
                  <div className="flex flex-col gap-12">
                    {nowShowing.length > 0 && (
                      <div className="w-full">
                        <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-6 text-left border-l-4 border-emerald-500 pl-3 uppercase">
                          Phim Đang Chiếu
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                          {nowShowing.map((item, index) => (
                            <MovieCard
                              key={`${item.id}-nowshowing-${index}`}
                              movie={item}
                              onClick={() =>
                                navigate(`/movie-details?id=${item.id}`)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {comingSoon.length > 0 && (
                      <div className="w-full">
                        <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-6 text-left border-l-4 border-orange-500 pl-3 uppercase">
                          Phim Sắp Chiếu
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                          {comingSoon.map((item, index) => (
                            <MovieCard
                              key={`${item.id}-comingsoon-${index}`}
                              movie={item}
                              onClick={() =>
                                navigate(`/movie-details?id=${item.id}`)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {online.length > 0 && (
                      <div className="w-full">
                        <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-6 text-left border-l-4 border-blue-500 pl-3 uppercase">
                          Phim Trực Tuyến
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                          {online.map((item, index) => (
                            <MovieCard
                              key={`${item.id}-online-${index}`}
                              movie={item}
                              onClick={() =>
                                navigate(`/movie-details?id=${item.id}`)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <span className="material-symbols-outlined text-[64px] text-gray-500 mb-6">
                  search_off
                </span>
                <h2 className="text-2xl font-bold text-[#111827] dark:text-white mb-2">
                  Không tìm thấy nội dung phù hợp
                </h2>
                <p className="text-gray-500 dark:text-[#9D9D9D] text-[15px] mb-12">
                  Vui lòng thử lại với từ khóa khác hoặc tham khảo các phim bên
                  dưới
                </p>

                {popularMovies.length > 0 && (
                  <div className="w-full mt-4">
                    <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-6 text-left border-l-4 border-[#e61a27] pl-3">
                      Phim Nổi Bật
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                      {popularMovies.map((movie) => (
                        <MovieCard
                          key={`popular-${movie.id}`}
                          movie={movie}
                          onClick={() =>
                            navigate(`/movie-details?id=${movie.id}`)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
