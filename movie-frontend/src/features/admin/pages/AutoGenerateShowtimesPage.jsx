import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Film, Play, Save, MonitorPlay, ArrowLeft } from 'lucide-react';
import { generateShowtimes } from '../utils/autoScheduleAlgorithm';
import { movieApi } from '../api/movieApi';
import { theaterApi } from '../api/theaterApi';
import { showtimeApi } from '../api/showtimeApi';
import { movieFormatApi } from '../api/movieFormatApi';
import { useProvinces } from '../../user/hooks/useProvinces';
import { useToastStore } from '../hooks/useToastStore';
import Pagination from '../../../shared/components/Pagination';
import CustomDatePicker from '../components/showtime/CustomDatePicker';

export default function AutoGenerateShowtimesPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgressData, setSaveProgressData] = useState({ saved: 0, total: 0 });
  const [previewPage, setPreviewPage] = useState(1);

  // Data lists
  const [movies, setMovies] = useState([]);
  const [allTheaters, setAllTheaters] = useState([]); // to find theater details easily
  const [formats, setFormats] = useState([]);

  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('23:00');
  const [movieStatusFilter, setMovieStatusFilter] = useState('ALL');

  // Selected Theater IDs (array instead of single string)
  const [selectedTheaterIds, setSelectedTheaterIds] = useState([]);
  const [selectedMovieIds, setSelectedMovieIds] = useState([]);
  const [movieHotness, setMovieHotness] = useState({}); // { movieId: score (1-10) }
  const [excludedDates, setExcludedDates] = useState([]); // Array of date strings 'YYYY-MM-DD'

  // Generated Results
  const [generatedShowtimes, setGeneratedShowtimes] = useState([]); // This will now just track total generated for display
  const [previewData, setPreviewData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  
  // Smart Calendar States
  const [existingShowtimes, setExistingShowtimes] = useState([]);
  const [dateStatusMap, setDateStatusMap] = useState({});

  // Use existing hook for provinces
  const {
    provinces,
    loading: provincesLoading,
    activeProvinceId,
    theatersForActiveProvince,
    setActiveProvinceId,
  } = useProvinces(false);

  useEffect(() => {
    fetchInitialData();
    // Clean up drafts when entering page
    showtimeApi.deleteDrafts().catch(console.error);
  }, []);

  // Sync allTheaters with provinces data from hook
  useEffect(() => {
    if (provinces && provinces.length > 0) {
      const theaters = provinces.reduce((acc, prov) => [...acc, ...(prov.theaters || [])], []);
      setAllTheaters(theaters);
    }
  }, [provinces]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [moviesData, formatsData, showtimesData] = await Promise.all([
        movieApi.getAll(),
        movieFormatApi.getAll(),
        showtimeApi.getAll()
      ]);
      setMovies(moviesData.filter(m => !m.isHidden && m.isCinemaAvailable !== false));
      setFormats(formatsData.filter(f => !f.isDeleted));
      
      const todayStr = new Date().toISOString().split('T')[0];
      setExistingShowtimes(showtimesData.filter(st => st.showDate >= todayStr));
    } catch (error) {
      addToast({ message: 'Không thể tải dữ liệu ban đầu.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTheaterSelect = (theaterId) => {
    setSelectedTheaterIds(prev => {
      if (prev.includes(theaterId)) {
        return prev.filter(id => id !== theaterId);
      } else {
        return [...prev, theaterId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedTheaterIds.length === allTheaters.length) {
      setSelectedTheaterIds([]); // Deselect all
    } else {
      setSelectedTheaterIds(allTheaters.map(t => t.id)); // Select all
    }
  };

  const toggleSelectAllInProvince = () => {
    const provinceTheaterIds = theatersForActiveProvince.map(t => t.id);
    const allSelected = provinceTheaterIds.every(id => selectedTheaterIds.includes(id));

    if (allSelected) {
      // Deselect all in province
      setSelectedTheaterIds(prev => prev.filter(id => !provinceTheaterIds.includes(id)));
    } else {
      // Select all in province (add those not currently selected)
      setSelectedTheaterIds(prev => {
        const newSet = new Set([...prev, ...provinceTheaterIds]);
        return Array.from(newSet);
      });
    }
  };

  const toggleMovieSelect = (movieId) => {
    setSelectedMovieIds(prev => {
      if (prev.includes(movieId)) {
        const newArr = prev.filter(id => id !== movieId);
        const newHotness = { ...movieHotness };
        delete newHotness[movieId];
        setMovieHotness(newHotness);
        return newArr;
      } else {
        setMovieHotness({ ...movieHotness, [movieId]: 5 }); // Default hotness is 5
        return [...prev, movieId];
      }
    });
  };

  const toggleSelectAllMovies = () => {
    const visibleMovies = movies.filter(m => {
      if (movieStatusFilter === 'ALL') return true;
      const s = m.status ? m.status.toUpperCase() : '';
      if (movieStatusFilter === 'NOW_SHOWING') return s === 'NOW_SHOWING' || s === 'SHOWING';
      if (movieStatusFilter === 'COMING_SOON') return s === 'COMING_SOON' || s === 'UPCOMING';
      return true;
    });

    const visibleIds = visibleMovies.map(m => m.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedMovieIds.includes(id));

    if (allVisibleSelected) {
      setSelectedMovieIds(prev => prev.filter(id => !visibleIds.includes(id)));
      const newHotness = { ...movieHotness };
      visibleIds.forEach(id => delete newHotness[id]);
      setMovieHotness(newHotness);
    } else {
      setSelectedMovieIds(prev => {
        const newSet = new Set([...prev, ...visibleIds]);
        return Array.from(newSet);
      });
      const newHotness = { ...movieHotness };
      visibleIds.forEach(id => {
        if (!newHotness[id]) newHotness[id] = 5;
      });
      setMovieHotness(newHotness);
    }
  };

  const getDatesInRange = () => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return [];

    const dates = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const datesInRange = React.useMemo(() => getDatesInRange(), [startDate, endDate]);

  const disabledMovieIds = React.useMemo(() => {
    if (datesInRange.length === 0 || selectedTheaterIds.length === 0 || existingShowtimes.length === 0) return [];
    
    const activeDates = datesInRange.filter(d => !excludedDates.includes(d));
    if (activeDates.length === 0) return [];

    return movies.filter(m => {
       return activeDates.every(date => {
          return selectedTheaterIds.every(tId => {
             return existingShowtimes.some(st => st.movieId === m.id && st.theaterId === tId && st.showDate === date);
          });
       });
    }).map(m => m.id);
  }, [datesInRange, excludedDates, selectedTheaterIds, existingShowtimes, movies]);

  useEffect(() => {
    if (selectedTheaterIds.length === 0 || existingShowtimes.length === 0 || movies.length === 0) {
      setDateStatusMap({});
      return;
    }

    const newMap = {};
    const allDates = [...new Set(existingShowtimes.map(st => st.showDate))];
    
    allDates.forEach(dateStr => {
      const showtimesOnDate = existingShowtimes.filter(st => st.showDate === dateStr && selectedTheaterIds.includes(st.theaterId));
      if (showtimesOnDate.length === 0) return;

      let fullyScheduledMoviesCount = 0;
      
      movies.forEach(movie => {
        const isScheduledInAll = selectedTheaterIds.every(tId => 
          showtimesOnDate.some(st => st.movieId === movie.id && st.theaterId === tId)
        );
        if (isScheduledInAll) {
          fullyScheduledMoviesCount++;
        }
      });

      if (fullyScheduledMoviesCount === movies.length) {
        newMap[dateStr] = 'full';
      } else if (showtimesOnDate.length > 0) {
        newMap[dateStr] = 'partial';
      }
    });
    
    setDateStatusMap(newMap);
  }, [selectedTheaterIds, existingShowtimes, movies]);

  const loadPreviewPage = async (pageIndex) => {
    try {
      const data = await showtimeApi.searchShowtimes({ statusTab: 'draft', page: pageIndex - 1, size: 100 });
      setPreviewData(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (error) {
      console.error("Lỗi khi tải trang preview", error);
    }
  };

  useEffect(() => {
    if (step === 2) {
      loadPreviewPage(previewPage);
    }
  }, [previewPage, step]);

  const handleRunAlgorithm = async () => {
    if (selectedTheaterIds.length === 0 || !startDate || !endDate || selectedMovieIds.length === 0) {
      addToast({ message: 'Vui lòng chọn ít nhất 1 rạp, ngày bắt đầu, ngày kết thúc và ít nhất 1 phim.', type: 'error' });
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      addToast({ message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.', type: 'error' });
      return;
    }
    if (openingTime >= closingTime) {
      addToast({ message: 'Giờ mở cửa phải nhỏ hơn giờ suất cuối.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setIsSaving(true);
      setSaveProgressData({ saved: 0, total: 100 }); // Show indeterminate initially

      await showtimeApi.deleteDrafts();

      let allSelectedRooms = [];

      // Fetch rooms for all selected theaters
      for (const tId of selectedTheaterIds) {
        const roomsData = await theaterApi.getRoomsByTheater(tId);
        const t = allTheaters.find(th => th.id === tId);
        const activeRooms = roomsData.filter(r => r.isActive).map(r => ({ ...r, theaterId: tId, theaterName: t?.name }));
        allSelectedRooms.push(...activeRooms);
      }

      if (allSelectedRooms.length === 0) {
        addToast({ message: 'Các rạp đã chọn chưa có phòng chiếu hoạt động.', type: 'error' });
        setIsSaving(false);
        return;
      }

      const selectedMoviesFull = movies.filter(m => selectedMovieIds.includes(m.id));

      const config = {
        openingTime: openingTime,
        closingTime: closingTime,
        movieHotness: movieHotness,
        formats: formats
      };

      const results = [];
      let currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const dateString = currentDate.toISOString().split('T')[0];
        if (!excludedDates.includes(dateString)) {
          for (const tId of selectedTheaterIds) {
             const theaterRooms = allSelectedRooms.filter(r => r.theaterId === tId);
             
             const moviesForTheater = selectedMoviesFull.filter(m => {
                return !existingShowtimes.some(st => st.movieId === m.id && st.theaterId === tId && st.showDate === dateString);
             });
             
             if (moviesForTheater.length > 0 && theaterRooms.length > 0) {
                const dayResults = generateShowtimes(moviesForTheater, theaterRooms, dateString, config);
                results.push(...dayResults);
             }
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Yield to event loop to prevent browser freeze when generating > 10k items
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      setGeneratedShowtimes(results);
      
      // Now push to backend as drafts
      const payload = results.map(st => ({
        theaterId: st.theaterId,
        movieId: st.movieId,
        roomId: st.roomId,
        showDate: st.showDate,
        startTime: st.startTime,
        endTime: st.endTime,
        format: st.format,
        isDraft: true
      }));

      const CHUNK_SIZE = 5000;
      let savedCount = 0;
      setSaveProgressData({ saved: 0, total: payload.length });

      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        await showtimeApi.createBatch(chunk);
        savedCount += chunk.length;
        setSaveProgressData({ saved: savedCount, total: payload.length });
        // Delay 50ms to allow UI to render and network to breathe
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setPreviewPage(1);
      setStep(2);
    } catch (error) {
      console.error(error);
      addToast({ message: 'Đã xảy ra lỗi khi chạy thuật toán.', type: 'error' });
    } finally {
      setLoading(false);
      setIsSaving(false);
    }
  };

  const handleSaveBatch = async () => {
    try {
      setIsSaving(true);
      setSaveProgressData({ saved: 0, total: totalElements });
      
      await showtimeApi.publishDrafts();
      setSaveProgressData({ saved: totalElements, total: totalElements });

      setIsSaving(false);
      navigate('/admin/showtimes', {
        state: { refresh: true, successMessage: `Đã lưu ${totalElements} suất chiếu thành công!` }
      });
    } catch (error) {
      addToast({ message: 'Có lỗi xảy ra khi lưu lịch chiếu vào DB.', type: 'error' });
      setIsSaving(false);
    } finally {
      setLoading(false);
    }
  };

  const provinceTheaterIds = theatersForActiveProvince.map(t => t.id);
  const isAllInProvinceSelected = provinceTheaterIds.length > 0 && provinceTheaterIds.every(id => selectedTheaterIds.includes(id));
  const isAllSelected = allTheaters.length > 0 && selectedTheaterIds.length === allTheaters.length;

  const filteredMoviesToDisplay = movies.filter(m => {
    if (movieStatusFilter === 'ALL') return true;
    const s = m.status ? m.status.toUpperCase() : '';
    if (movieStatusFilter === 'NOW_SHOWING') return s === 'NOW_SHOWING' || s === 'SHOWING';
    if (movieStatusFilter === 'COMING_SOON') return s === 'COMING_SOON' || s === 'UPCOMING';
    return true;
  });

  const isAllMoviesSelected = filteredMoviesToDisplay.length > 0 && filteredMoviesToDisplay.every(m => selectedMovieIds.includes(m.id));

  const handleBack = () => {
    if (step === 2) {
      showtimeApi.deleteDrafts().catch(console.error);
      setStep(1);
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', color: '#F1F1F1' }}>
      <div style={{ width: '100%' }}>
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#222] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#333] transition-colors text-gray-900 dark:text-white relative z-50 shadow-sm border border-gray-100 dark:border-transparent"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-white flex items-center gap-3">
              <Play size={28} color="#dc2626" fill="#dc2626" />
              Tự Động Xếp Lịch Chiếu
            </h1>
          </div>
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-8">

            {/* Vùng chọn rạp */}
            <div className="bg-[#18181b] border border-[#333] rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white uppercase flex items-center gap-2 border-l-4 border-[#dc2626] pl-3">
                  1. Chọn Rạp Chiếu ({selectedTheaterIds.length}/{allTheaters.length})
                </h2>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all relative z-50 ${isAllSelected ? 'bg-red-600 dark:bg-[#dc2626] text-white' : 'bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-[#9D9D9D] hover:bg-gray-300 dark:hover:bg-[#444]'
                    }`}
                >
                  <span>{isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả Rạp'}</span>
                </button>
              </div>

              {/* Provinces Tabs */}
              <div className="flex flex-wrap gap-3 mb-6">
                {provincesLoading ? (
                  <div className="text-gray-500 text-sm">Đang tải tỉnh/thành phố...</div>
                ) : (
                  provinces.map(province => {
                    const theatersInProv = allTheaters.filter(t => t.provinceId === province.id);
                    const selectedCount = theatersInProv.filter(t => selectedTheaterIds.includes(t.id)).length;

                    return (
                      <button
                        key={province.id}
                        onClick={() => setActiveProvinceId(province.id)}
                        className={`px-4 py-2 rounded-[20px] text-[13px] font-semibold transition-all flex items-center gap-2 ${
                          activeProvinceId === province.id
                            ? 'bg-red-50 dark:bg-[#dc2626]/10 text-red-600 dark:text-[#dc2626] border border-red-600 dark:border-[#dc2626]'
                            : 'bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-[#a1a1aa] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#333]'
                        }`}
                      >
                        {province.name}
                        {selectedCount > 0 && (
                          <span className="ml-2 bg-[#dc2626] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {selectedCount}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              {/* Theaters Grid in Active Province */}
              <div className="bg-[#2a2a2a] p-5 rounded-lg border border-[#333]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[#9D9D9D] font-medium">Danh Sách Rạp khu vực đang chọn:</h3>
                  {theatersForActiveProvince.length > 0 && (
                    <button
                      onClick={toggleSelectAllInProvince}
                      className="text-[#dc2626] text-[13px] hover:underline font-medium"
                    >
                      <span>{isAllInProvinceSelected ? 'Bỏ chọn khu vực này' : 'Chọn tất cả khu vực này'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {theatersForActiveProvince.length === 0 && !provincesLoading ? (
                    <div className="col-span-full text-gray-500 text-sm italic py-4">Chưa có rạp nào ở khu vực này.</div>
                  ) : (
                    theatersForActiveProvince.map(cinema => (
                      <label
                        key={cinema.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedTheaterIds.includes(cinema.id)
                            ? 'bg-[#dc2626]/10 border-[#dc2626]/50'
                            : 'bg-[#18181b] border-[#333] hover:border-[#555]'
                          }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={selectedTheaterIds.includes(cinema.id)}
                            onChange={() => toggleTheaterSelect(cinema.id)}
                            className="w-4 h-4 accent-[#dc2626] cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <div className={`font-bold text-[14px] ${selectedTheaterIds.includes(cinema.id) ? 'text-white' : 'text-[#9D9D9D]'}`}>
                            {cinema.name}
                          </div>
                          <div className="text-[11px] text-gray-500 line-clamp-1 mt-1">{cinema.address}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cột trái: Thời gian */}
              <div className="col-span-1 bg-[#18181b] border border-[#333] rounded-xl p-6 shadow-xl h-fit">
                <h2 className="text-xl font-bold text-white uppercase flex items-center gap-2 border-l-4 border-[#dc2626] pl-3 mb-6">
                  2. Khung Thời Gian
                </h2>
                <div className="flex flex-col gap-5">
                  <div className="mb-2">
                    <label className="block text-[#9D9D9D] text-sm mb-2 font-medium">Khoảng ngày</label>
                    <CustomDatePicker 
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(start, end) => {
                        setStartDate(start);
                        setEndDate(end);
                        if (start && end) {
                          const s = new Date(start);
                          const e = new Date(end);
                          const dates = [];
                          let current = new Date(s);
                          while (current <= e) {
                            dates.push(current.toISOString().split('T')[0]);
                            current.setDate(current.getDate() + 1);
                          }
                          const fullDates = dates.filter(d => dateStatusMap[d] === 'full');
                          setExcludedDates(prev => [...new Set([...prev, ...fullDates])]);
                        } else {
                          setExcludedDates([]);
                        }
                      }}
                      disabled={selectedTheaterIds.length === 0}
                      dateStatusMap={dateStatusMap}
                    />
                    {selectedTheaterIds.length === 0 && (
                       <p className="text-[#dc2626] text-xs mt-2 italic">* Vui lòng chọn rạp chiếu trước khi chọn ngày</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2 border-t border-[#333] pt-5">
                    <div>
                      <label className="block text-[#9D9D9D] text-[13px] mb-2 font-medium">Giờ mở cửa</label>
                      <input
                        type="time"
                        value={openingTime}
                        max={closingTime}
                        onChange={e => setOpeningTime(e.target.value)}
                        className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#dc2626] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[#9D9D9D] text-[13px] mb-2 font-medium">Giờ suất cuối</label>
                      <input
                        type="time"
                        value={closingTime}
                        min={openingTime}
                        onChange={e => setClosingTime(e.target.value)}
                        className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#dc2626] transition-colors"
                      />
                    </div>
                  </div>


                  {startDate && endDate && new Date(startDate) <= new Date(endDate) && (
                    <div className="mt-2">
                      <label className="block text-[#9D9D9D] text-[13px] mb-2 font-medium">Bỏ chọn các ngày nghỉ (tùy chọn)</label>
                      <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                        {getDatesInRange().map(date => {
                          const isExcluded = excludedDates.includes(date);
                          const isFull = dateStatusMap[date] === 'full';
                          return (
                            <button
                              key={date}
                              disabled={isFull}
                              onClick={() => {
                                setExcludedDates(prev =>
                                  isExcluded ? prev.filter(d => d !== date) : [...prev, date]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-md text-[13px] font-bold transition-all border ${
                                isFull 
                                  ? 'bg-transparent border-[#444] text-gray-600 line-through cursor-not-allowed opacity-50'
                                  : isExcluded
                                    ? 'bg-transparent border-[#444] text-gray-600 line-through'
                                    : 'bg-[#dc2626]/20 border-[#dc2626]/50 text-[#dc2626]'
                                }`}
                              title={isFull ? 'Ngày này đã kín lịch chiếu' : ''}
                            >
                              {new Date(date).toLocaleDateString('vi-VN')}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cột phải: Chọn Phim & Hotness */}
              <div className={`col-span-1 lg:col-span-2 bg-[#18181b] border border-[#333] rounded-xl p-6 shadow-xl relative ${(!startDate || !endDate) ? 'opacity-70' : ''}`}>
                {(!startDate || !endDate) && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl">
                    <p className="text-red-600 dark:text-red-500 font-bold px-6 py-3 bg-white dark:bg-[#1a1a1a] border border-red-200 dark:border-red-500/30 rounded-xl shadow-2xl">
                      * Vui lòng chọn Khung Thời Gian trước khi chọn Phim
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white uppercase flex items-center gap-2 border-l-4 border-[#dc2626] pl-3">
                      3. Chọn Phim & Độ Hot
                    </h2>
                    <button
                      type="button"
                      onClick={toggleSelectAllMovies}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all relative z-50 ${isAllMoviesSelected ? 'bg-red-600 dark:bg-[#dc2626] text-white' : 'bg-gray-200 dark:bg-[#333] text-gray-700 dark:text-[#9D9D9D] hover:bg-gray-300 dark:hover:bg-[#444]'
                        }`}
                    >
                      <span>{isAllMoviesSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả Phim'}</span>
                    </button>
                  </div>

                  <div className="flex gap-2 bg-[#2a2a2a] p-1.5 rounded-lg w-fit">
                    <button
                      onClick={() => setMovieStatusFilter('ALL')}
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${movieStatusFilter === 'ALL' ? 'bg-[#dc2626] text-white' : 'text-[#9D9D9D] hover:text-white'
                        }`}
                    >
                      Tất cả phim
                    </button>
                    <button
                      onClick={() => setMovieStatusFilter('NOW_SHOWING')}
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${movieStatusFilter === 'NOW_SHOWING' ? 'bg-[#dc2626] text-white' : 'text-[#9D9D9D] hover:text-white'
                        }`}
                    >
                      Đang chiếu
                    </button>
                    <button
                      onClick={() => setMovieStatusFilter('COMING_SOON')}
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${movieStatusFilter === 'COMING_SOON' ? 'bg-[#dc2626] text-white' : 'text-[#9D9D9D] hover:text-white'
                        }`}
                    >
                      Sắp chiếu
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                  {loading && filteredMoviesToDisplay.length === 0 && <p className="text-[#9D9D9D]">Đang tải...</p>}
                  {!loading && filteredMoviesToDisplay.length === 0 && <p className="text-[#9D9D9D] col-span-full text-sm italic">Không có phim nào phù hợp.</p>}
                  {filteredMoviesToDisplay.map(m => {
                    const isDisabled = disabledMovieIds.includes(m.id);
                    return (
                    <div key={m.id} className={`flex flex-col gap-3 p-4 rounded-lg border transition-all ${
                        isDisabled ? 'bg-[#18181b] border-[#333] opacity-40 grayscale cursor-not-allowed' :
                        selectedMovieIds.includes(m.id) ? 'bg-[#dc2626]/10 border-[#dc2626]/50' : 'bg-[#2a2a2a] border-[#333] hover:border-[#444]'
                      }`}>
                      <label className={`flex items-center gap-3 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} title={isDisabled ? 'Phim này đã được xếp lịch kín cho tất cả các rạp và ngày đang chọn' : ''}>
                        <input
                          type="checkbox"
                          checked={selectedMovieIds.includes(m.id)}
                          onChange={() => !isDisabled && toggleMovieSelect(m.id)}
                          disabled={isDisabled}
                          className={`w-4 h-4 accent-[#dc2626] ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} shrink-0`}
                        />
                        <span className={`font-semibold text-[14px] line-clamp-1 flex-1 ${isDisabled ? 'text-gray-500' : 'text-white'}`}>{m.title}</span>
                      </label>

                      {selectedMovieIds.includes(m.id) && (
                        <div className="flex items-center gap-3 ml-7 bg-[#18181b] p-2 rounded-md border border-[#333]">
                          <span className="text-xs text-[#9D9D9D] whitespace-nowrap">Độ hot:</span>
                          <input
                            type="range" min="1" max="10"
                            value={movieHotness[m.id]}
                            onChange={(e) => setMovieHotness({ ...movieHotness, [m.id]: parseInt(e.target.value) })}
                            className="flex-1 accent-[#dc2626] cursor-pointer"
                          />
                          <span className="text-[#dc2626] font-black w-6 text-center">{movieHotness[m.id]}</span>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            </div>

            {/* Run Button */}
            <div className="flex justify-end pt-4 pb-16">
              <>{!isStaff && (
        <button
                onClick={handleRunAlgorithm}
                disabled={loading}
                className="bg-gradient-to-r from-[#dc2626] to-[#ff4f72] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] text-always-white font-bold py-4 px-10 rounded-xl text-lg flex items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>Đang xử lý...</>
                ) : (
                  <><MonitorPlay size={24} /> Tạo</>
                )}
              </button>
      )}</>
            </div>

          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-xl flex items-center gap-3 font-bold">
              <MonitorPlay size={24} />
              Thành công! Đã sinh ra {totalElements} suất chiếu (từ {startDate} đến {endDate})
            </div>

            {/* Preview Table */}
            <div className="bg-[#18181b] rounded-xl border border-[#333] overflow-hidden shadow-xl">
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-[#222] sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-[#9D9D9D] uppercase tracking-wider border-b border-[#333]">Rạp / Phòng</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#9D9D9D] uppercase tracking-wider border-b border-[#333]">Ngày chiếu</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#9D9D9D] uppercase tracking-wider border-b border-[#333]">Khung giờ</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#9D9D9D] uppercase tracking-wider border-b border-[#333]">Tên phim</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#9D9D9D] uppercase tracking-wider border-b border-[#333]">Độ ưu tiên</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2a]">
                    {previewData.map((st, i) => (
                      <tr key={i} className="hover:bg-[#222] transition-colors">
                        <td className="px-6 py-4 text-sm text-[#9D9D9D]">
                          <div className="font-bold">{st.roomName.split(' - ')[0]}</div>
                          <div className="text-gray-500 text-xs">{st.roomName.split(' - ')[1] || st.roomName}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#9D9D9D]">{st.showDate}</td>
                        <td className="px-6 py-4 text-sm font-bold text-[#dc2626]">
                          {st.startTime} <span className="text-gray-600 font-normal mx-1">-</span> {st.endTime}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white">{st.movieTitle}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{st.score || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalElements > 100 && (
                <Pagination
                  currentPage={previewPage}
                  totalPages={Math.ceil(totalElements / 100)}
                  onPageChange={(p) => setPreviewPage(p)}
                  totalElements={totalElements}
                  itemsPerPage={100}
                />
              )}
            </div>

            <div className="flex justify-end items-center pt-6 border-t border-[#333]">
              <button
                onClick={handleSaveBatch}
                disabled={loading || isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={20} /> Lưu
              </button>
            </div>
          </div>
        )}

        <SaveProgressModal 
          isOpen={isSaving} 
          saved={saveProgressData.saved} 
          total={saveProgressData.total} 
        />

      </div>
    </div>
  );
}

const SaveProgressModal = ({ isOpen, saved, total }) => {
  const numberRef = React.useRef(null);
  
  React.useEffect(() => {
    if (!isOpen || total === 0) return;
    
    const duration = 250; // ms
    const startValue = parseInt(numberRef.current?.dataset.currentValue || '0', 10);
    const endValue = saved;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = progress * (2 - progress);
      const currentVal = Math.floor(startValue + (endValue - startValue) * easeOut);
      
      if (numberRef.current) {
        numberRef.current.innerText = currentVal;
        numberRef.current.dataset.currentValue = currentVal;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (numberRef.current) {
          numberRef.current.innerText = endValue;
          numberRef.current.dataset.currentValue = endValue;
        }
      }
    };
    
    requestAnimationFrame(animate);
  }, [saved, total, isOpen]);

  if (!isOpen) return null;

  const percentage = total > 0 ? (saved / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 font-sans">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>

      <div 
        className="rounded-xl w-full max-w-lg p-10 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] pointer-events-none -z-10"
          style={{
            background: 'radial-gradient(circle at center, rgba(87, 27, 193, 0.15) 0%, rgba(59, 130, 246, 0.1) 40%, transparent 70%)'
          }}
        ></div>

        <div className="w-16 h-16 rounded-full bg-[#571bc1]/20 flex items-center justify-center mb-6 border border-[#571bc1]/30 shadow-[0_0_20px_rgba(87,27,193,0.2)]">
          <Save size={32} color="#adc6ff" />
        </div>
        
        <h2 className="text-[32px] font-semibold leading-[40px] tracking-tight text-[#e5e2e1] mb-3">Đang lưu dữ liệu...</h2>
        <p className="text-[16px] leading-[24px] text-[#c2c6d6] mb-10 max-w-sm">
          Vui lòng không đóng cửa sổ này trong khi hệ thống đang xử lý.
        </p>

        <div className="w-full">
          <div 
            className="mb-3 relative overflow-hidden rounded-[4px]"
            style={{ background: 'rgba(255, 255, 255, 0.1)', height: '8px' }}
          >
            <div 
              className="h-full rounded-[4px] relative"
              style={{
                background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                width: `${percentage}%`,
                transition: 'width 0.3s ease-out'
              }}
            >
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  animation: 'flow 2s infinite linear'
                }}
              ></div>
            </div>
          </div>
          
          <div className="flex justify-between items-center w-full text-[12px] leading-[16px] tracking-[0.05em] font-medium">
            <span className="text-[#adc6ff] font-bold tracking-wider">
              <span ref={numberRef} data-current-value="0">0</span> / {total}
            </span>
            <span className="text-[#c2c6d6]">{percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
