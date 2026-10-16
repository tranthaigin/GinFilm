import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useProvinces } from '../../hooks/useProvinces';

import { getShowtimesByTheaterAndDate } from '../../api/services/showService';
import { getAgeRatingColor } from '../../../../shared/utils/movieHelpers';

// --- VIEW COMPONENT: ALL CINEMAS (DARK/RED THEME) ---
function AllCinemasView() {
  const {
    provinces,
    loading: provincesLoading,
    activeProvinceId,
    theatersForActiveProvince,
    setActiveProvinceId,
  } = useProvinces(false, 'cinemas_activeProvinceId');

  const [selectedCinema, setSelectedCinema] = useState(() => {
    const saved = sessionStorage.getItem('cinemas_selectedCinema');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (selectedCinema) {
      sessionStorage.setItem(
        'cinemas_selectedCinema',
        JSON.stringify(selectedCinema)
      );
    } else {
      sessionStorage.removeItem('cinemas_selectedCinema');
    }
  }, [selectedCinema]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = sessionStorage.getItem('cinemas_selectedDate');
    return saved ? new Date(saved) : new Date();
  });

  useEffect(() => {
    if (selectedDate) {
      sessionStorage.setItem(
        'cinemas_selectedDate',
        selectedDate.toISOString()
      );
    }
  }, [selectedDate]);

  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem('cinemas_activeTab');
    return saved || 'schedule';
  });

  useEffect(() => {
    if (activeTab) {
      sessionStorage.setItem('cinemas_activeTab', activeTab);
    }
  }, [activeTab]);
  const [showtimes, setShowtimes] = useState([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [errorShowtimes, setErrorShowtimes] = useState(null);
  const navigate = useNavigate();
  const datesContainerRef = useRef(null);

  const dates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const resetKey1 = JSON.stringify([
    theatersForActiveProvince,
    provincesLoading,
    selectedCinema,
  ]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    // Nếu rạp đang chọn không nằm trong danh sách rạp của tỉnh hiện tại, thì bỏ chọn
    if (selectedCinema && !provincesLoading) {
      const isStillInList = theatersForActiveProvince.some(
        (t) => t.id === selectedCinema.id
      );
      if (!isStillInList) {
        setSelectedCinema(null);
      }
    }
  }

  // Fetch showtimes when cinema or date changes
  useEffect(() => {
    async function fetchShowtimes() {
      if (!selectedCinema || !selectedDate) {
        setShowtimes([]);
        return;
      }

      setLoadingShowtimes(true);
      setErrorShowtimes(null);

      try {
        const yyyy = selectedDate.getFullYear();
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const data = await getShowtimesByTheaterAndDate(
          selectedCinema.id,
          dateStr
        );
        setShowtimes(data);
      } catch (err) {
        console.error('Failed to fetch showtimes', err);
        setErrorShowtimes('Không thể tải lịch chiếu. Vui lòng thử lại sau.');
        setShowtimes([]);
      } finally {
        setLoadingShowtimes(false);
      }
    }

    fetchShowtimes();
  }, [selectedCinema, selectedDate]);

  const daysShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const monthsShort = [
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12',
  ];

  const handleScrollLeft = () => {
    if (datesContainerRef.current) {
      datesContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (datesContainerRef.current) {
      datesContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const getPrices = (cinemaId) => {
    if (!cinemaId)
      return {
        adult: 75000,
        student: 55000,
        sweetbox: 160000,
        weekendAdult: 95000,
        weekendStudent: 65000,
        weekendSweetbox: 200000,
      };
    const diff = (cinemaId % 4) * 10000;
    return {
      adult: 75000 + diff,
      student: 55000 + diff,
      sweetbox: 160000 + diff * 1.5,
      weekendAdult: 95000 + diff,
      weekendStudent: 65000 + diff,
      weekendSweetbox: 200000 + diff * 1.5,
    };
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN').format(price) + ' đ';

  const prices = getPrices(selectedCinema?.id);

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20 pt-8 relative overflow-hidden text-[#111827] dark:text-white font-sans">
      <div className="max-w-[1000px] mx-auto w-full px-4 relative z-10">
        {/* Box 1: Chọn Rạp (Dark/Red Selector) */}
        <div className="w-full bg-white dark:bg-[#18181b] border-[4px] border-gray-200 dark:border-[#222] rounded-sm p-6 shadow-[0_0_30px_rgba(229,9,20,0.1)] relative mb-12">
          <div className="absolute top-1 left-1 right-1 bottom-1 border border-gray-100 dark:border-white/10 pointer-events-none"></div>

          <h2 className="text-center text-4xl font-black uppercase tracking-[0.1em] mb-6 mt-2 drop-shadow-md dark:drop-shadow-[2px_2px_4px_rgba(0,0,0,0.8)]">
            <span className="text-[#111827] dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">
              GIN
            </span>
            <span className="text-[#e50914] drop-shadow-sm dark:drop-shadow-[0_0_20px_rgba(229,9,20,0.6)]">
              FILM
            </span>
            <span className="text-yellow-500 ml-3 drop-shadow-sm dark:drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]">
              CINEMAS
            </span>
          </h2>

          <hr className="border-gray-200 dark:border-[#333] mb-4" />

          {/* Regions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-3 gap-x-6 mb-4 px-2">
            {provincesLoading ? (
              <div className="col-span-full text-[#666] text-[13px] italic">
                Đang tải danh sách tỉnh thành...
              </div>
            ) : (
              provinces.map((province) => (
                <button
                  key={province.id}
                  onClick={() => setActiveProvinceId(province.id)}
                  className={`text-center py-2 px-3 text-[13px] font-medium transition-colors w-full rounded-sm border ${
                    activeProvinceId === province.id
                      ? 'bg-[#e50914] border-[#e50914] text-white shadow-[0_4px_10px_rgba(229,9,20,0.5)] transform -translate-y-0.5'
                      : 'bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#333] text-gray-800 dark:text-[#999] hover:border-[#e50914] hover:text-[#e50914] hover:bg-[#e50914]/10'
                  }`}
                >
                  {province.name}
                </button>
              ))
            )}
          </div>

          <hr className="border-gray-200 dark:border-[#333] mb-4" />

          {/* Cinemas in Region */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-2 min-h-[30px]">
            {theatersForActiveProvince.map((cinema) => (
              <button
                key={cinema.id}
                onClick={() => setSelectedCinema(cinema)}
                className={`text-left text-[13px] font-medium transition-colors w-full rounded-sm border ${
                  selectedCinema?.id === cinema.id
                    ? 'bg-[#e50914] border-[#e50914] text-white px-3 py-2 shadow-[0_0_10px_rgba(229,9,20,0.5)]'
                    : 'bg-white dark:bg-[#18181b] border-gray-200 dark:border-[#333] text-gray-800 dark:text-[#999] hover:border-[#e50914] hover:text-[#e50914] py-2 px-3 hover:bg-[#e50914]/10'
                }`}
              >
                {cinema.name}
              </button>
            ))}
            {!provincesLoading && theatersForActiveProvince.length === 0 && (
              <span className="text-[#666] text-[13px] italic col-span-full">
                Hệ thống rạp đang cập nhật tại khu vực này...
              </span>
            )}
          </div>
        </div>

        {/* Details Section */}
        {selectedCinema && (
          <div className="flex flex-col items-center">
            {/* THEATER Title Graphic */}
            <div className="flex items-center justify-center w-full mb-6">
              <div className="h-[2px] bg-[#444] flex-1 relative">
                <div className="absolute top-[4px] left-0 right-0 h-[1px] bg-[#444]"></div>
              </div>
              <div className="px-6 flex items-center justify-center tracking-[0.2em] text-4xl font-black text-[#111827] dark:text-white">
                <span
                  className="uppercase"
                  style={{
                    backgroundImage:
                      'radial-gradient(rgba(255,255,255,0.8) 20%, transparent 20%)',
                    backgroundSize: '4px 4px',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: '#e50914',
                  }}
                >
                  RẠP CHIẾU
                </span>
              </div>
              <div className="h-[2px] bg-[#444] flex-1 relative">
                <div className="absolute top-[4px] left-0 right-0 h-[1px] bg-[#444]"></div>
              </div>
            </div>

            <h3 className="text-[32px] font-normal text-[#111827] dark:text-white mb-6 tracking-wide drop-shadow-md">
              {selectedCinema.name}
            </h3>

            {/* Cinema Image & Map Layout */}
            <div className="flex flex-col md:flex-row w-full bg-gray-100 dark:bg-[#222] mb-8 overflow-hidden rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-white/10">
              {/* Cinema Image */}
              {selectedCinema.image && (
                <div className="w-full md:w-1/2 aspect-[16/9] md:aspect-auto relative min-h-[300px]">
                  <img
                    src={selectedCinema.image}
                    alt={selectedCinema.name}
                    className="w-full h-full object-cover filter brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>

                  {/* Overlay text on image if needed, or leave it clean */}
                  <div className="absolute bottom-4 left-4 right-4 text-[#111827] dark:text-white hidden md:block">
                    <span className="font-black text-2xl tracking-wide uppercase drop-shadow-lg">
                      {selectedCinema.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Map */}
              <div
                className={`relative ${selectedCinema.image ? 'w-full md:w-1/2' : 'w-full'} aspect-[21/9] md:aspect-[16/9] min-h-[300px]`}
              >
                <iframe
                  title={`Bản đồ rạp ${selectedCinema.name}`}
                  className="w-full h-full pointer-events-auto filter brightness-90 contrast-125"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedCinema.name + ', ' + selectedCinema.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                ></iframe>
              </div>
            </div>

            {/* Translucent Black Strip for Info */}
            <div className="w-full bg-white/90 dark:bg-black/80 backdrop-blur-md border border-gray-200 dark:border-white/10 p-5 md:px-8 flex flex-col md:flex-row justify-between md:items-center text-gray-500 dark:text-[#9D9D9D] gap-4 mb-8 rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col gap-2 text-[14px]">
                <div className="font-bold text-[#111827] dark:text-white text-lg">
                  {selectedCinema.address}
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#e50914] text-[18px]">
                    fax
                  </span>
                  <span className="font-bold text-gray-500 dark:text-[#9D9D9D]">
                    Fax:{' '}
                  </span>
                  +84 4 6 275 5240
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#e50914] text-[18px]">
                    call
                  </span>
                  <span className="font-bold text-gray-500 dark:text-[#9D9D9D]">
                    Hotline:{' '}
                  </span>
                  <span className="text-[#e50914] font-bold tracking-wider">
                    {selectedCinema.phone ||
                      selectedCinema.hotline ||
                      'Đang cập nhật'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/info?tab=contact')}
                  className="bg-[#e50914] text-white font-bold text-[13px] px-8 py-3 rounded-sm hover:bg-[#b80710] shadow-[0_0_15px_rgba(229,9,20,0.5)] uppercase tracking-wider transition-all"
                >
                  Liên hệ GinFilm
                </button>
              </div>
            </div>

            {/* Red Ribbon: Lịch chiếu | Giá vé */}
            <div className="relative flex justify-center mb-8">
              <div className="relative z-10 bg-[#e50914] text-white px-12 py-3 font-bold text-[15px] flex items-center gap-2 shadow-[0_10px_20px_rgba(229,9,20,0.3)]">
                <span className="material-symbols-outlined text-[20px]">
                  local_activity
                </span>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`uppercase transition-colors hover:text-white ${activeTab === 'schedule' ? 'text-white' : 'text-white/60'}`}
                >
                  Lịch chiếu
                </button>
                <span className="font-normal mx-2 text-white/50">|</span>
                <button
                  onClick={() => setActiveTab('price')}
                  className={`uppercase transition-colors hover:text-white ${activeTab === 'price' ? 'text-white' : 'text-white/60'}`}
                >
                  Giá vé
                </button>
              </div>
              {/* Ribbon Tails */}
              <div className="absolute top-0 -left-6 border-t-[24px] border-b-[24px] border-r-[24px] border-l-[24px] border-transparent border-r-[#e50914] border-t-[#e50914]"></div>
              <div className="absolute top-0 -right-6 border-t-[24px] border-b-[24px] border-l-[24px] border-r-[24px] border-transparent border-l-[#e50914] border-t-[#e50914]"></div>
            </div>

            {activeTab === 'schedule' ? (
              <>
                {/* Date Selector */}
                <div className="w-full relative px-8 mb-10 border-t border-b border-gray-200 dark:border-[#333] py-4 bg-white dark:bg-[#18181b]">
                  {/* Arrows */}
                  <button
                    onClick={handleScrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#e50914] text-white flex items-center justify-center rounded-full cursor-pointer hover:bg-[#b80710] transition-all font-bold z-10 text-2xl shadow-[0_0_10px_rgba(229,9,20,0.5)] border-none"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={handleScrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#e50914] text-white flex items-center justify-center rounded-full cursor-pointer hover:bg-[#b80710] transition-all font-bold z-10 text-2xl shadow-[0_0_10px_rgba(229,9,20,0.5)] border-none"
                  >
                    &gt;
                  </button>

                  <div
                    ref={datesContainerRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-6 mx-4"
                  >
                    {dates.map((date, idx) => {
                      const isSelected =
                        date.getDate() === selectedDate.getDate() &&
                        date.getMonth() === selectedDate.getMonth();
                      const monthNum = monthsShort[date.getMonth()];
                      const dayName = daysShort[date.getDay()];

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDate(date)}
                          className={`flex items-center justify-center gap-2 min-w-[95px] h-[55px] shrink-0 border transition-all rounded-sm ${
                            isSelected
                              ? 'bg-white dark:bg-[#18181b] border-[#e50914] border-b-4 text-[#111827] dark:text-white shadow-[0_0_15px_rgba(229,9,20,0.2)]'
                              : 'bg-gray-100 dark:bg-[#222] border-gray-200 dark:border-[#333] hover:border-[#555] text-gray-500 dark:text-[#9D9D9D]'
                          }`}
                        >
                          <div className="flex flex-col items-start leading-none text-left opacity-80">
                            <span className="text-[10px] font-bold mb-0.5 tracking-wider">
                              {monthNum}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-widest">
                              {dayName}
                            </span>
                          </div>
                          <span
                            className={`text-3xl font-light ${isSelected ? '' : 'text-gray-500'}`}
                          >
                            {date.getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Movie List */}
                <div className="w-full">
                  {loadingShowtimes ? (
                    <div className="text-center text-gray-500 dark:text-[#9D9D9D] py-10">
                      Đang tải lịch chiếu...
                    </div>
                  ) : errorShowtimes ? (
                    <div className="text-center text-[#e50914] py-10">
                      {errorShowtimes}
                    </div>
                  ) : showtimes.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-[#9D9D9D] py-10">
                      Hiện chưa có lịch chiếu nào vào ngày này. Vui lòng chọn
                      ngày khác.
                    </div>
                  ) : (
                    showtimes.map((movie) => (
                      <div
                        key={movie.movieId}
                        className="flex flex-col md:flex-row gap-6 mb-8 border-b border-gray-200 dark:border-[#333] pb-8 group relative"
                      >
                        <div className="w-[180px] shrink-0 relative overflow-hidden rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-white/10 self-start md:sticky md:top-24">
                          <img
                            src={movie.image}
                            alt={movie.title}
                            className="w-full h-[270px] object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>

                        <div className="flex-1">
                          <h4 className="text-2xl font-black text-[#111827] dark:text-white mb-2 hover:text-[#e50914] cursor-pointer transition-colors drop-shadow-md">
                            {movie.title}
                          </h4>

                          <div className="text-[13px] text-gray-500 dark:text-[#9D9D9D] mb-6 flex items-center gap-4 bg-white dark:bg-[#18181b] w-fit px-3 py-1.5 rounded-sm border border-gray-200 dark:border-[#333]">
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-[#e50914]">
                                schedule
                              </span>
                              {movie.duration}
                            </span>
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-[#e50914]">
                                movie
                              </span>
                              {movie.genre}
                            </span>
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <span
                              className={`font-bold text-white border border-gray-200 dark:border-white/20 px-1 rounded ${getAgeRatingColor(movie.ageRating || 'T16')}`}
                            >
                              {movie.ageRating || 'T16'}
                            </span>
                          </div>

                          {movie.formats.map((format, fIdx) => (
                            <div key={fIdx} className="mb-5">
                              <div className="font-black text-[13px] text-[#111827] dark:text-[#E5E5E5] mb-3 border-l-4 border-[#e50914] pl-3 uppercase tracking-widest bg-gradient-to-r from-red-50 dark:from-[#222] to-transparent py-1.5 w-max pr-16">
                                {format.name}
                              </div>
                              <div className="flex flex-wrap gap-3">
                                {format.times.map((timeObj, tIdx) => (
                                  <Link
                                    key={tIdx}
                                    to={`/booking?showId=${timeObj.id}&movieId=${movie.movieId}`}
                                    className="px-5 py-2.5 bg-white dark:bg-[#18181b] border border-[#444] text-gray-500 dark:text-[#9D9D9D] hover:bg-[#e50914] hover:text-white hover:border-[#e50914] hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] font-bold text-[15px] transition-all rounded-sm relative overflow-hidden group/btn"
                                  >
                                    <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500"></div>
                                    <span className="relative z-10">
                                      {timeObj.time}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : activeTab === 'price' ? (
              <div className="w-full max-w-[800px] mb-12">
                <h4 className="text-2xl font-black text-[#111827] dark:text-white mb-6 text-center tracking-widest border-b border-gray-200 dark:border-[#333] pb-4 uppercase">
                  Bảng Giá Vé Cơ Bản
                </h4>
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#333] rounded-md overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <table className="w-full text-left text-gray-500 dark:text-[#9D9D9D]">
                    <thead className="bg-[#e50914] text-white">
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[14px]">
                          Loại Vé
                        </th>
                        <th className="px-6 py-4 font-bold text-center uppercase tracking-wider text-[14px]">
                          Thứ 2 - Thứ 5
                        </th>
                        <th className="px-6 py-4 font-bold text-center uppercase tracking-wider text-[14px]">
                          Cuối tuần & Lễ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-gray-100 dark:hover:bg-[#222] transition-colors">
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333]">
                          <div className="font-bold text-[#e50914] mb-1 text-[16px]">
                            Người Lớn (2D)
                          </div>
                          <div className="text-[12px] text-gray-500">
                            Vé tiêu chuẩn
                          </div>
                        </td>
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333] text-center font-bold text-[#111827] dark:text-white text-[16px]">
                          {formatPrice(prices.adult)}
                        </td>
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333] text-center font-bold text-[#111827] dark:text-white text-[16px]">
                          {formatPrice(prices.weekendAdult)}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-100 dark:hover:bg-[#222] transition-colors">
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333]">
                          <div className="font-bold text-[#e50914] mb-1 text-[16px]">
                            HSSV / Trẻ em (2D)
                          </div>
                          <div className="text-[12px] text-gray-500">
                            Dưới 22 tuổi / Dưới 1m3
                          </div>
                        </td>
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333] text-center font-bold text-[#111827] dark:text-white text-[16px]">
                          {formatPrice(prices.student)}
                        </td>
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333] text-center font-bold text-[#111827] dark:text-white text-[16px]">
                          {formatPrice(prices.weekendStudent)}
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-100 dark:hover:bg-[#222] transition-colors">
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333]">
                          <div className="font-bold text-[#e50914] mb-1 text-[16px]">
                            Ghế đôi
                          </div>
                          <div className="text-[12px] text-gray-500">
                            Giá cho 2 người
                          </div>
                        </td>
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333] text-center font-bold text-[#111827] dark:text-white text-[16px]">
                          {formatPrice(prices.sweetbox)}
                        </td>
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333] text-center font-bold text-[#111827] dark:text-white text-[16px]">
                          {formatPrice(prices.weekendSweetbox)}
                        </td>
                      </tr>
                      <tr className="bg-[#2a1111] border-l-4 border-[#e50914]">
                        <td
                          colSpan="3"
                          className="px-6 py-3 border-b border-gray-200 dark:border-[#333] font-black text-[#ff4d4d] text-center uppercase tracking-widest text-[13px]"
                        >
                          Phụ thu định dạng đặc biệt
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-100 dark:hover:bg-[#222] transition-colors">
                        <td className="px-6 py-4 border-b border-gray-200 dark:border-[#333]">
                          <div className="font-bold text-[#111827] dark:text-white mb-1">
                            Định dạng 3D
                          </div>
                        </td>
                        <td
                          colSpan="2"
                          className="px-6 py-4 border-b border-gray-200 dark:border-[#333] text-center font-bold text-gray-500 dark:text-[#9D9D9D] text-[15px]"
                        >
                          + 30.000 đ / vé{' '}
                          <span className="text-[12px] font-normal text-gray-500 block">
                            (Đã bao gồm kính 3D)
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-100 dark:hover:bg-[#222] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#111827] dark:text-white mb-1">
                            Định dạng IMAX / 4DX
                          </div>
                        </td>
                        <td
                          colSpan="2"
                          className="px-6 py-4 text-center font-bold text-gray-500 dark:text-[#9D9D9D] text-[15px]"
                        >
                          + 50.000 đ / vé
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-4 text-[13px] text-gray-500 dark:text-[#9D9D9D] bg-white dark:bg-black leading-relaxed">
                    * <span className="font-bold text-[#e50914]">Lưu ý:</span>{' '}
                    Giá vé có thể thay đổi tùy theo suất chiếu đặc biệt hoặc các
                    dịp Lễ, Tết. Khách hàng vui lòng mang theo thẻ HSSV (nếu có)
                    để được hưởng ưu đãi tại quầy.
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// --- VIEW COMPONENT: FORMAT CINEMA (LORAP, LOBED, LOSCREENX) ---
function FormatCinemaView({ type }) {
  const contentMap = {
    lorap: {
      name: 'LORAP',
      subtitle: 'CÔNG NGHỆ CHIẾU PHIM TIÊU CHUẨN MỚI',
      desc: 'Phòng chiếu cao cấp với không gian rộng lớn, ghế nệm đỏ êm ái cùng hệ thống màn hình cực đại và âm thanh vòm sống động.',
      img1: 'https://res.cloudinary.com/rqoxqs8l/image/upload/v1785734117/lorap-1_ozzwxm.jpg',
      title1: 'Sức Chứa Lớn',
      desc1:
        'Không gian rộng rãi, là địa điểm lý tưởng cho các buổi công chiếu và sự kiện điện ảnh',
      img2: 'https://res.cloudinary.com/rqoxqs8l/image/upload/v1785734129/lorap-2_kloyxd.png',
      title2: 'Công Nghệ Hiện Đại',
      desc2:
        'Màn hình cực đại kết hợp cùng hệ thống âm thanh vòm sống động bao phủ mọi góc nhìn',
    },
    lobed: {
      name: 'LOBED',
      subtitle: 'TRẢI NGHIỆM ĐẲNG CẤP THƯỢNG GIA',
      desc: 'Tận hưởng sự thoải mái tối đa với phòng chiếu giường nằm cao cấp chuẩn 5 sao, mang lại không gian riêng tư và trải nghiệm điện ảnh khác biệt.',
      img1: 'https://res.cloudinary.com/rqoxqs8l/image/upload/v1785734118/lobed-1_olga37.png',
      title1: 'Ghế Da Cao Cấp',
      desc1:
        'Hệ thống ghế tựa bọc da sang trọng cùng không gian ánh sáng vàng ấm áp',
      img2: 'https://res.cloudinary.com/rqoxqs8l/image/upload/v1785734145/lobed-2_fpmbkv.png',
      title2: 'Giường Nằm Êm Ái',
      desc2:
        'Thiết kế giường nằm tinh tế mang lại sự thoải mái và riêng tư tuyệt đối',
    },
    loscreenx: {
      name: 'LOSCREENX',
      subtitle: 'ĐẮM CHÌM TRONG KHÔNG GIAN 270 ĐỘ',
      desc: 'Công nghệ chiếu phim đa diện độc đáo với 3 màn hình mở rộng 270 độ, bao trọn tầm nhìn, đưa bạn vào chính thế giới của bộ phim.',
      img1: 'https://res.cloudinary.com/rqoxqs8l/image/upload/v1785734123/loscreenx-1_ofqrrr.jpg',
      title1: 'Góc Nhìn 270 Độ',
      desc1:
        'Màn hình mở rộng sang hai bên tường giúp bạn hòa mình vào từng khung hình',
      img2: 'https://res.cloudinary.com/rqoxqs8l/image/upload/v1785734137/loscreenx-2_nzlstc.png',
      title2: 'Trải Nghiệm Siêu Thực',
      desc2:
        'Hiệu ứng đa chiều mang lại cảm giác chân thực vĩ đại như đang ở trong phim',
    },
  };

  const data = contentMap[type] || contentMap.lorap;

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20 text-[#111827] dark:text-white font-sans">
      <div className="max-w-[1200px] mx-auto px-4 pt-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black text-[#111827] dark:text-white uppercase mb-4 tracking-[0.15em]">
            TẬN HƯỞNG CẢ THẾ GIỚI ĐIỆN ẢNH TẠI GINFILM
          </h1>
          <h2 className="text-xl font-bold text-[#e50914] tracking-[0.3em] uppercase drop-shadow-md">
            #{data.name} #Trải nghiệm #Phong cách
          </h2>
        </div>

        {/* CÔNG NGHỆ Section */}
        <div className="mb-16">
          <div className="flex flex-col md:flex-row items-start md:items-end mb-10 gap-6">
            <h3 className="text-4xl font-black text-[#111827] dark:text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
              {data.name}
            </h3>
            <p className="text-gray-500 dark:text-[#9D9D9D] text-lg md:border-l-2 md:border-gray-200 dark:border-[#333] md:pl-6 max-w-2xl leading-relaxed">
              {data.desc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 relative rounded-xl overflow-hidden group cursor-pointer aspect-[16/9] lg:aspect-auto h-[300px] lg:h-[450px] shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-white/10">
              <img
                src={data.img1}
                alt={data.title1}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#000] via-[#000]/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-8 left-8 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                <h4 className="text-white font-black text-6xl mb-2 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                  {data.title1}
                </h4>
                <p className="text-gray-500 dark:text-[#9D9D9D] text-xl font-medium tracking-wide">
                  {data.desc1}
                </p>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden group cursor-pointer aspect-[16/9] lg:aspect-auto h-[300px] lg:h-[450px] shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-white/10">
              <img
                src={data.img2}
                alt={data.title2}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#000] via-[#000]/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-8 left-8 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                <h4 className="text-white font-black text-5xl mb-2 uppercase tracking-wider drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                  {data.title2}
                </h4>
                <p className="text-gray-500 dark:text-[#9D9D9D] text-xl font-medium tracking-wide">
                  {data.desc2}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function CinemasPage() {
  const { type } = useParams(); // 'all', '3d', 'special'

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [type]);

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white font-sans">
      <Header />
      <main className="flex-1 w-full relative z-10 bg-white dark:bg-black">
        {(!type || type === 'all') && <AllCinemasView />}
        {['lorap', 'lobed', 'loscreenx'].includes(type) && (
          <FormatCinemaView type={type} />
        )}
      </main>
      <Footer />
    </div>
  );
}
