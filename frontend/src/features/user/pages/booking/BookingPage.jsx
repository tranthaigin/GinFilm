import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useShowSeats } from '../../hooks';
import { useToastStore } from '../../store/toastStore';
import SeatMatrix from '../../components/booking/SeatMatrix';
import { getSeatType, PRICES } from '../../components/booking/seatUtils';
import SeatLegend from '../../components/booking/SeatLegend';
import { holdSeats } from '../../api/services/bookingService';

// Hàm format ngày từ "yyyy-MM-dd" → "Thứ X, DD Tháng MM, YYYY"
function formatShowDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const days = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ];
    const dayName = days[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${dayName}, ${day} Tháng ${month}, ${year}`;
  } catch {
    return dateStr;
  }
}

// Removed old validateSeatSelection logic

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Lấy showId và movieId từ URL params (được truyền từ MovieInfoPage)
  const showId = searchParams.get('showId');
  searchParams.get('movieId');

  const { show, rows, seatMap, loading, error } = useShowSeats(showId);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    // Xóa toàn bộ cache cũ của quá trình booking để tránh lệch giá và dính ghế
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('booking_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));

    // Nếu user quay lại bằng nút Back, ta nên reset selectedIds để tránh cộng dồn
    const handlePopState = () => {
      setSelectedIds(new Set());
    };
    window.addEventListener('popstate', handlePopState);

    window.scrollTo(0, 0);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [showId]);

  // Lấy danh sách ghế đã bán xong từ API
  const occupiedIds = useMemo(() => {
    const set = new Set();
    if (!rows) return set;
    rows.forEach((row) => {
      row.seats.forEach((seat) => {
        if (seat.status === 'BOOKED' || seat.status === 'BROKEN') {
          set.add(`${seat.rowSymbol}${seat.seatNumber}`);
        }
      });
    });
    return set;
  }, [rows]);

  // Lấy danh sách ghế đang được người khác giữ (chưa thanh toán)
  const pendingIds = useMemo(() => {
    const set = new Set();
    if (!rows) return set;
    rows.forEach((row) => {
      row.seats.forEach((seat) => {
        if (seat.status === 'RESERVED') {
          set.add(`${seat.rowSymbol}${seat.seatNumber}`);
        }
      });
    });
    return set;
  }, [rows]);

  // Lọc bỏ những ghế đã bị đặt/bị hỏng khỏi danh sách đang chọn
  // (Đề phòng trường hợp load lại từ sessionStorage nhưng ghế đã bị người khác mua mất)
  if ((occupiedIds.size > 0 || pendingIds.size > 0) && selectedIds.size > 0) {
    let changed = false;
    const nextSelected = new Set(selectedIds);
    for (const id of nextSelected) {
      if (occupiedIds.has(id) || pendingIds.has(id)) {
        nextSelected.delete(id);
        changed = true;
      }
    }
    if (changed) {
      setSelectedIds(nextSelected);
    }
  }

  const toggleSeat = (seatId) => {
    const seatInfo = seatMap.get(seatId);
    if (!seatInfo) return;

    const isOccupied =
      occupiedIds.has(seatId) ||
      pendingIds.has(seatId) ||
      seatInfo.status === 'BROKEN';
    if (isOccupied) return;

    const nextSelected = new Set(selectedIds);
    const isCurrentlySelected = nextSelected.has(seatId);
    if (isCurrentlySelected) {
      nextSelected.delete(seatId);
    } else {
      const maxSeats = show?.maxSeatsPerUser || 0;
      if (maxSeats > 0 && nextSelected.size >= maxSeats) {
        showToast(
          `Bạn chỉ được chọn tối đa ${maxSeats} ghế trong rạp này.`,
          'warning'
        );
        return;
      }
      nextSelected.add(seatId);
    }

    setSelectedIds(nextSelected);
  };

  const validationError = useMemo(() => {
    if (!rows || selectedIds.size === 0) return null;

    // Kiểm tra không được chọn nhiều loại ghế khác nhau
    const selectedTypes = new Set();
    for (const seatId of selectedIds) {
      const seatInfo = seatMap.get(seatId);
      if (seatInfo) {
        selectedTypes.add(getSeatType(seatInfo.seatType));
      }
    }
    if (selectedTypes.size > 1) {
      return 'Vui lòng chọn tất cả ghế cùng loại.';
    }

    // Nếu người dùng đang chọn ghế đôi, cho phép chọn bất cứ đâu (bỏ qua quy tắc ghế trống)
    if (selectedTypes.has('couple')) {
      return null;
    }

    for (const { rowSymbol, seats } of rows) {
      const getColumnIndex = (seat) =>
        seat.columnIndex !== undefined && seat.columnIndex !== null
          ? seat.columnIndex
          : seat.seatNumber;
      const sortedSeats = [...seats].sort(
        (a, b) => getColumnIndex(a) - getColumnIndex(b)
      );
      if (sortedSeats.length === 0) continue;

      // Tách thành từng cụm ghế liên tục; khoảng trống vật lý giữa các cột
      // là lối đi nên hai ghế ở hai phía không được xem là liền nhau.
      const seatGroups = [];
      let currentGroup = [];
      sortedSeats.forEach((seat) => {
        const previousSeat = currentGroup[currentGroup.length - 1];
        if (previousSeat) {
          const previousWidth =
            previousSeat.seatType?.toUpperCase() === 'COUPLE' ? 2 : 1;
          const isSeparatedByAisle =
            getColumnIndex(seat) > getColumnIndex(previousSeat) + previousWidth;
          if (isSeparatedByAisle) {
            seatGroups.push(currentGroup);
            currentGroup = [];
          }
        }
        currentGroup.push(seat);
      });
      if (currentGroup.length > 0) seatGroups.push(currentGroup);

      const getSeatState = (seat, includeSelection) => {
        const seatId = `${seat.rowSymbol}${seat.seatNumber}`;
        if (
          occupiedIds.has(seatId) ||
          pendingIds.has(seatId) ||
          seat.status === 'BROKEN'
        )
          return 1;
        if (includeSelection && selectedIds.has(seatId)) return 1;
        return 0;
      };

      const analyzeSingleGaps = (states) => {
        let edgeSingles = 0;
        let interiorSingles = 0;
        let gapStart = -1;

        for (let i = 0; i <= states.length; i++) {
          if (i < states.length && states[i] === 0) {
            if (gapStart === -1) gapStart = i;
            continue;
          }
          if (gapStart !== -1) {
            const gapLength = i - gapStart;
            if (gapLength === 1) {
              if (gapStart === 0 || i === states.length) edgeSingles++;
              else interiorSingles++;
            }
            gapStart = -1;
          }
        }
        return { edgeSingles, interiorSingles };
      };

      for (const group of seatGroups) {
        const beforeStates = group.map((seat) => getSeatState(seat, false));
        const afterStates = group.map((seat) => getSeatState(seat, true));
        const before = analyzeSingleGaps(beforeStates);
        const after = analyzeSingleGaps(afterStates);

        const createsInteriorSingle =
          after.interiorSingles > before.interiorSingles;
        const createsEdgeSingle = after.edgeSingles > before.edgeSingles;
        const remainingEmptySeats = afterStates.filter(
          (state) => state === 0
        ).length;
        const leavesEdgeSingleWithOtherEmptySeats =
          createsEdgeSingle && remainingEmptySeats > 1;
        if (createsInteriorSingle || leavesEdgeSingleWithOtherEmptySeats) {
          return `Bạn không thể để trống các ghế đơn lẻ ở hai phía hoặc giữa cụm ghế (Hàng ${rowSymbol}). Vui lòng chọn lại.`;
        }
      }
    }

    return null;
  }, [rows, selectedIds, occupiedIds, pendingIds, seatMap]);

  const selectedSeats = useMemo(() => [...selectedIds].sort(), [selectedIds]);

  const calculateTotal = () => {
    let sum = 0;
    selectedSeats.forEach((seatId) => {
      const seat = seatMap.get(seatId);
      if (seat) {
        const type = getSeatType(seat.seatType);
        const dynamicPrices = show?.prices || PRICES;
        sum += dynamicPrices[type] ?? PRICES[type] ?? PRICES.normal;
      }
    });
    return sum;
  };
  const total = calculateTotal();

  const handleContinue = async () => {
    if (selectedSeats.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 ghế trước khi tiếp tục!', 'error');
      return;
    }

    try {
      const payload = {
        showtimeId: show.id || show.showId || parseInt(showId),
        seatIds: selectedSeats
          .map((seatId) => {
            const seatInfo = seatMap.get(seatId);
            return seatInfo?.id;
          })
          .filter(Boolean),
      };

      const booking = await holdSeats(payload);

      // Xóa session sau khi đã holdSeats thành công để tránh tích lũy ghế lần sau
      sessionStorage.removeItem(`booking_selectedSeats_${showId}`);

      navigate('/booking/combos', {
        state: {
          show,
          bookingId: booking.id,
          ticketCode: booking.ticketCode,
          expireAt: booking.expireAt,
          selectedSeats: selectedSeats.map((seatId) => {
            const type = getSeatType(seatMap.get(seatId)?.seatType);
            const dynamicPrices = show?.prices || PRICES;
            return {
              seatId,
              seat: seatMap.get(seatId),
              price: dynamicPrices[type] ?? PRICES[type] ?? PRICES.normal,
            };
          }),
          total: booking.totalAmount || total,
        },
      });
    } catch (err) {
      showToast(err.message || 'Lỗi khi giữ ghế. Vui lòng thử lại!', 'error');
    }
  };

  // Thông tin hiển thị từ show thực tế
  const displayTitle = show?.movieTitle ?? 'Đang tải...';
  const displayPoster = show?.moviePosterUrl ?? null;
  const displayDate = show?.showDate ? formatShowDate(show.showDate) : '';
  const displayTime =
    show?.startTime && show?.endTime
      ? `${show.startTime} ~ ${show.endTime}`
      : (show?.startTime ?? '');
  const displayLocation = show
    ? `${show.theaterName}${show.roomName ? ` — ${show.roomName}` : ''}`
    : '';

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white selection:bg-[#e61a27] selection:text-white font-sans">
      <Header />

      {/* Thông báo Cảnh báo Hệ thống - Hoàn toàn nằm NGOÀI khung sơ đồ ghế */}
      {validationError && (
        <div className="fixed top-28 right-6 z-[100] max-w-sm w-[calc(100%-3rem)] sm:w-[380px] overflow-hidden bg-[#161616]/95 backdrop-blur-xl border border-red-500/40 rounded-2xl p-4 text-white shadow-[0_10px_35px_rgba(230,26,39,0.35)] transition-all duration-300 animate-[toast-slide-in-right_300ms_ease-out]">
          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/20 border border-red-500/40 text-red-500 shadow-inner">
              <span className="material-symbols-outlined text-[20px] animate-pulse">
                warning
              </span>
            </div>
            <div className="min-w-0 flex-1 font-sans">
              <h4 className="text-[13px] font-bold uppercase tracking-wider text-red-400 mb-0.5">
                Cảnh Báo Hệ Thống
              </h4>
              <p className="text-[13.5px] text-white/90 font-medium leading-relaxed m-0">
                {validationError}
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-red-950">
            <div className="h-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse w-full" />
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 py-10 md:py-16 relative">
        {/* Title Header */}
        <div className="border-b-2 border-[#e61a27] pb-4 mb-6 flex justify-between items-center relative">
          <h1 className="text-2xl text-[#111827] dark:text-white font-bold uppercase tracking-wide">
            CHỌN GHẾ
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-bold text-[14px] whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Quay lại
            </button>
          </div>
        </div>

        {/* Info Header */}
        <div className="flex flex-col md:flex-row md:items-start gap-6 mb-12 pb-6">
          <div className="flex gap-8 md:gap-12 items-start w-full">
            {/* Poster phim thực tế */}
            <div
              className="relative group cursor-pointer rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_15px_rgba(255,255,255,0.08)] border border-gray-200 dark:border-white/30 transition-all duration-300 hover:border-gray-300 dark:hover:border-white/60 dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] w-[180px] h-[270px] md:w-[260px] md:h-[390px] shrink-0"
              onClick={() =>
                show?.movieId && navigate(`/movie-info?id=${show.movieId}`)
              }
              title="Xem thông tin phim"
            >
              {displayPoster ? (
                <img
                  src={displayPoster}
                  alt={displayTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white dark:bg-[#18181b]">
                  <span
                    className="material-symbols-outlined text-white/20"
                    style={{ fontSize: 64 }}
                  >
                    movie
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 py-4 flex flex-col justify-center">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase text-[#111827] dark:text-white mb-8 leading-tight line-clamp-2 max-h-[2.4em]">
                {loading ? (
                  <span className="inline-block h-12 w-80 bg-white/10 rounded animate-pulse" />
                ) : (
                  displayTitle
                )}
              </h2>

              <div className="flex flex-col gap-6 text-[16px] md:text-[20px] text-gray-500 dark:text-[#9D9D9D] font-medium">
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-8 w-64 bg-white/10 rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    {displayDate && (
                      <span className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-[28px] text-[#e61a27]">
                          calendar_month
                        </span>
                        {displayDate}
                      </span>
                    )}
                    {displayTime && (
                      <span className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-[28px] text-[#e61a27]">
                          schedule
                        </span>
                        {displayTime}
                      </span>
                    )}
                    {displayLocation && (
                      <span className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-[28px] text-[#e61a27]">
                          location_on
                        </span>
                        {displayLocation}
                      </span>
                    )}
                    {show?.format && (
                      <span className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-[28px] text-[#e61a27]">
                          movie_filter
                        </span>
                        {show.format}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span
              className="material-symbols-outlined text-white/10 mb-4"
              style={{ fontSize: 72 }}
            >
              event_busy
            </span>
            <p className="text-white/50 text-lg font-medium mb-2">
              Không tải được thông tin suất chiếu
            </p>
            <p className="text-gray-300 dark:text-white/30 text-sm mb-6">
              Vui lòng thử lại hoặc quay về trang trước
            </p>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all font-bold text-[14px] whitespace-nowrap mt-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              Quay lại
            </button>
          </div>
        )}

        {!error && (
          <div className="flex flex-col gap-8">
            {/* Seat Selection Area */}
            <div className="flex-1 min-h-0 bg-white dark:bg-black/40 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
              <SeatMatrix
                show={show}
                rows={rows}
                seatMap={seatMap}
                selectedIds={selectedIds}
                occupiedIds={occupiedIds}
                pendingIds={pendingIds}
                onToggle={toggleSeat}
              />

              <div className="mt-6 flex flex-col items-center gap-4">
                <SeatLegend prices={show?.prices} rows={rows} />
              </div>

              {/* Action Button Area */}
              <div className="mt-8 mb-8 px-4 w-full max-w-5xl mx-auto">
                <div className="w-full flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-[#18181b]/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg">
                  {/* Cột Ghế Đã Chọn (Tự do xuống dòng) */}
                  <div className="flex-1 text-gray-500 dark:text-[#9D9D9D] font-medium text-[15px] leading-loose">
                    Ghế đã chọn:{' '}
                    {selectedSeats.length > 0 ? (
                      <span className="text-[#111827] dark:text-white font-bold tracking-wide">
                        {selectedSeats.join(', ')}
                      </span>
                    ) : (
                      'Chưa chọn'
                    )}
                  </div>

                  {/* Cột Giá tiền & Nút bấm (Luôn ở bên phải hoặc dưới cùng) */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-white/10 pt-5 lg:pt-0 lg:pl-8">
                    {/* Giá tiền */}
                    <div className="flex flex-col items-start lg:items-end">
                      <span className="text-[12px] text-gray-500 dark:text-[#9D9D9D] font-semibold uppercase tracking-wider mb-1">
                        Tạm tính
                      </span>
                      <span className="text-[#e61a27] font-black text-[26px] drop-shadow-md leading-none">
                        {total > 0 ? `${total.toLocaleString('vi-VN')}đ` : '0đ'}
                      </span>
                    </div>

                    {/* Nút bấm */}
                    <button
                      onClick={handleContinue}
                      disabled={selectedSeats.length === 0 || validationError}
                      className={`h-[56px] px-8 font-black rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-[15px] shrink-0 ${
                        selectedSeats.length > 0 && !validationError
                          ? 'bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(127,29,29,0.95))] hover:shadow-[0_8px_20px_rgba(230,26,39,0.4)] text-white hover:scale-105 active:scale-95'
                          : 'bg-white/5 border border-gray-200 dark:border-white/10 text-[#666] cursor-not-allowed'
                      }`}
                    >
                      Tiếp Tục{' '}
                      <span className="material-symbols-outlined text-[22px]">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
