import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '../../../../shared/api/client';
import ENDPOINTS from '../../../../shared/api/endpoints';
import { Search, Calendar, MapPin, Zap, Filter } from 'lucide-react';

/**
 * Kiểm tra xem giờ chiếu (dạng "HH:mm") có đang trong khoảng 0-5 phút kể từ lúc bắt đầu không.
 * Dùng để đánh dấu badge "LIVE" trên POS.
 */
function isShowtimeOngoing(timeStr) {
  if (!timeStr) return false;
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const showStart = new Date();
  showStart.setHours(h, m, 0, 0);
  const diffMs = now - showStart; // dương = đã qua, âm = chưa tới
  return diffMs >= 0 && diffMs <= 5 * 60 * 1000; // 0 đến 5 phút
}

export default function POSMovieList({ onNext }) {
  const [theaters, setTheaters] = useState([]);
  const [selectedTheaterId, setSelectedTheaterId] = useState(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tự refresh badge "LIVE" mỗi phút để cập nhật trạng thái đang chiếu
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const endpoint = ENDPOINTS.theaters.active || ENDPOINTS.theaters.list;
    apiGet(endpoint)
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setTheaters(list);
        if (list.length > 0) {
          setSelectedTheaterId(list[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const provinces = useMemo(() => {
    const map = new Map();
    theaters.forEach((t) => {
      if (t.provinceId && t.provinceName) {
        map.set(t.provinceId, t.provinceName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [theaters]);

  const filteredTheaters = useMemo(() => {
    let result = theaters;
    if (selectedProvinceId !== 'ALL') {
      result = result.filter(
        (t) => t.provinceId === Number(selectedProvinceId)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }
    return result;
  }, [theaters, selectedProvinceId, searchQuery]);

  // Cập nhật rạp được chọn nếu danh sách rạp lọc ra thay đổi và rạp hiện tại không nằm trong danh sách
  const resetKey1 = JSON.stringify([filteredTheaters, selectedTheaterId]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    if (filteredTheaters.length > 0) {
      const exists = filteredTheaters.find(
        (t) => String(t.id) === String(selectedTheaterId)
      );
      if (!exists) {
        setSelectedTheaterId(filteredTheaters[0].id);
      }
    } else {
      setSelectedTheaterId(null);
    }
  }

  const showtimesKey = JSON.stringify([selectedTheaterId, date]);
  const [previousShowtimesKey, setPreviousShowtimesKey] = useState(null);
  if (previousShowtimesKey !== showtimesKey) {
    setPreviousShowtimesKey(showtimesKey);
    setLoading(Boolean(selectedTheaterId && date));
    setMovies([]);
  }

  useEffect(() => {
    if (selectedTheaterId && date) {
      // Dùng endpoint POS riêng — hỗ trợ suất đang chiếu chưa quá 5 phút
      apiGet(ENDPOINTS.pos.showtimes, {
        params: { theaterId: selectedTheaterId, date },
      })
        .then((res) => {
          setMovies(Array.isArray(res) ? res : []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedTheaterId, date]);

  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-white/10">
        <div className="flex flex-wrap gap-4">
          {/* Tỉnh thành */}
          <div className="flex-1 min-w-[200px] relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={18} className="text-[#dc2626]" />
            </div>
            <select
              value={selectedProvinceId}
              onChange={(e) => setSelectedProvinceId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:border-[#dc2626] transition-colors appearance-none cursor-pointer"
            >
              <option
                value="ALL"
                className="bg-white dark:bg-black text-gray-900 dark:text-white py-2"
              >
                Tất cả khu vực
              </option>
              {provinces.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-white dark:bg-black text-gray-900 dark:text-white py-2"
                >
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tìm rạp */}
          <div className="flex-1 min-w-[200px] relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-[#dc2626]" />
            </div>
            <input
              type="text"
              placeholder="Tìm tên rạp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:border-[#dc2626] transition-colors"
            />
          </div>

          {/* Chọn rạp */}
          <div className="flex-1 min-w-[250px] relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin size={18} className="text-[#dc2626]" />
            </div>
            <select
              value={selectedTheaterId || ''}
              onChange={(e) => setSelectedTheaterId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:border-[#dc2626] transition-colors appearance-none cursor-pointer"
              disabled={filteredTheaters.length === 0}
            >
              {filteredTheaters.length === 0 ? (
                <option
                  value=""
                  className="bg-white dark:bg-black text-gray-900 dark:text-white py-2"
                >
                  Không có rạp phù hợp
                </option>
              ) : (
                filteredTheaters.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    className="bg-white dark:bg-black text-gray-900 dark:text-white py-2"
                  >
                    {t.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Ngày chiếu */}
          <div className="w-full md:w-auto relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar size={18} className="text-[#dc2626]" />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-gray-900 dark:text-white outline-none focus:border-[#dc2626] transition-colors cursor-pointer dark:[color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Thông báo hỗ trợ POS — chỉ hiện khi xem ngày hôm nay */}
      {isToday && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm">
          <Zap
            size={15}
            className="shrink-0 text-amber-600 dark:text-amber-400"
          />
          <span>
            Hiển thị cả suất{' '}
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              đang chiếu chưa quá 5 phút
            </span>{' '}
            để hỗ trợ đặt vé tại quầy.
          </span>
        </div>
      )}

      {/* Movie List */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-white/50 gap-3">
            <div className="w-8 h-8 border-3 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
            <p>Đang tải lịch chiếu...</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-white/40 text-center">
            <Search size={48} className="mb-4 opacity-20" />
            <p className="text-lg mb-2">
              Không có suất chiếu nào trong ngày này.
            </p>
            <p className="text-sm">Vui lòng chọn ngày khác hoặc rạp khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {movies.map((movie) => (
              <div
                key={`movie-${movie.movieId}`}
                className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-white/20 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-4">
                  {movie.image ? (
                    <img
                      src={movie.image}
                      alt={movie.title}
                      className="w-16 h-24 object-cover rounded-lg shadow-md flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-gray-400 dark:text-white/30 text-3xl">
                        movie
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2 line-clamp-2">
                      {movie.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      {movie.duration && (
                        <span className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/80 px-2 py-1 rounded border border-gray-200 dark:border-transparent">
                          ⏱ {movie.duration}
                        </span>
                      )}
                      {movie.ageRating && (
                        <span className="bg-[#dc2626] text-white px-2 py-1 rounded shadow-sm">
                          {movie.ageRating}
                        </span>
                      )}
                      {movie.genre && (
                        <span className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/80 px-2 py-1 rounded border border-gray-200 dark:border-transparent truncate max-w-full">
                          {movie.genre}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {(movie.formats || []).map((format, fIdx) => (
                    <div key={`format-${movie.movieId}-${format.name || fIdx}`}>
                      {format.name && (
                        <p className="text-xs font-bold text-[#dc2626] uppercase tracking-wider mb-2">
                          {format.name}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {(format.times || []).map((st, stIdx) => {
                          const ongoing = isToday && isShowtimeOngoing(st.time);
                          return (
                            <button
                              key={`st-${st.id || stIdx}`}
                              onClick={() =>
                                onNext({
                                  showtimeId: st.id,
                                  movieName: movie.title,
                                  time: st.time,
                                  roomName: format.name || '',
                                  actualRoom:
                                    st.roomName ||
                                    st.room ||
                                    `Phòng ${st.roomId || ''}`.trim() ||
                                    'Phòng chiếu',
                                })
                              }
                              title={
                                ongoing
                                  ? 'Suất đang chiếu — hỗ trợ đặt trong 5 phút đầu'
                                  : ''
                              }
                              className={`relative px-4 py-2 rounded-lg border font-semibold text-sm transition-all duration-200 ${
                                ongoing
                                  ? 'border-amber-400/60 bg-amber-400/15 text-amber-200 hover:bg-amber-400/30 hover:border-amber-400 hover:shadow-[0_0_14px_rgba(251,191,36,0.4)]'
                                  : 'border-[#dc2626]/40 bg-[#dc2626]/10 text-[#dc2626] hover:bg-[#dc2626] hover:text-white hover:border-[#dc2626] hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                              }`}
                            >
                              {st.time}
                              {ongoing && (
                                <span className="absolute -top-2 -right-2 flex items-center bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow">
                                  <span className="inline-block w-1.5 h-1.5 bg-black rounded-full animate-pulse mr-0.5" />
                                  LIVE
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
