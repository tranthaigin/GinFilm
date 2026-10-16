import { useCountdown } from '../../../../shared/hooks/useCountdown';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { comboApi } from '../../../admin/api/comboApi';
import { updateCombo } from '../../api/services/bookingService';
import { useToastStore } from '../../store/toastStore';

export default function CombosPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const show =
    location.state?.show ||
    (() => {
      try {
        const saved = sessionStorage.getItem('booking_combos_show');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();
  const bookingId =
    location.state?.bookingId ||
    sessionStorage.getItem('booking_combos_bookingId');
  const expireAt =
    location.state?.expireAt ||
    sessionStorage.getItem('booking_combos_expireAt');
  const timeLeft = useCountdown(expireAt);
  const selectedSeats =
    location.state?.selectedSeats ||
    (() => {
      try {
        const saved = sessionStorage.getItem('booking_combos_selectedSeats');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    })();
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    if (location.state?.show) {
      sessionStorage.setItem(
        'booking_combos_show',
        JSON.stringify(location.state.show)
      );
    }
    if (location.state?.bookingId) {
      sessionStorage.setItem(
        'booking_combos_bookingId',
        location.state.bookingId
      );
    }
    if (location.state?.expireAt) {
      sessionStorage.setItem(
        'booking_combos_expireAt',
        location.state.expireAt
      );
    }
    if (location.state?.selectedSeats) {
      sessionStorage.setItem(
        'booking_combos_selectedSeats',
        JSON.stringify(location.state.selectedSeats)
      );
    }
  }, [location.state]);

  const formatShowDate = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const displayLocation = show
    ? `${show.theaterName} | ${show.roomName}`
    : 'GINFILM | Cinema 6';

  const displaySeats =
    selectedSeats.length > 0
      ? `Ghế: ${selectedSeats.map((s) => s.seat?.rowSymbol + s.seat?.seatNumber).join(', ')}`
      : 'Số ghế (2/164)';

  const displayDate = show?.showDate
    ? formatShowDate(show.showDate)
    : '11/06/2026';
  const displayTime =
    show?.startTime && show?.endTime
      ? `${show.startTime.substring(0, 5)} ~ ${show.endTime.substring(0, 5)}`
      : '20:40 ~ 22:59';
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [bookingId]);

  useEffect(() => {
    if (timeLeft <= 0) {
      showToast('Đã hết thời gian giữ ghế. Vui lòng đặt lại!', 'error');
      navigate(
        `/booking?showId=${show?.id || show?.showId || ''}&movieId=${show?.movieId || ''}`
      );
      return;
    }
  }, [timeLeft, navigate, showToast, show?.id, show?.showId, show?.movieId]);

  const [concessions, setConcessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedBookingId, setLoadedBookingId] = useState(null);
  if (loadedBookingId !== bookingId) {
    setLoadedBookingId(bookingId);
    setLoading(true);
    setConcessions([]);
  }

  useEffect(() => {
    let active = true;
    const loadCombos = () => {
      return comboApi
        .getAll()
        .then((data) => {
          if (!active) return;
          const savedCombosRaw = sessionStorage.getItem(
            `booking_${bookingId}_combos`
          );
          let savedCombos = {};
          try {
            savedCombos = JSON.parse(savedCombosRaw || '{}') || {};
          } catch {
            /* Ignore an invalid local draft. */
          }
          const availableCombos = data
            .filter((c) => c.status === 'IN_STOCK')
            .map((c) => ({
              ...c,
              qty:
                Number.isInteger(savedCombos[c.id]) && savedCombos[c.id] > 0
                  ? savedCombos[c.id]
                  : 0,
            }));
          setConcessions(availableCombos);
        })
        .catch((err) => {
          console.error('Failed to load combos:', err);
          if (active)
            showToast('Không thể tải combo. Vui lòng thử lại.', 'error');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    loadCombos();
    return () => {
      active = false;
    };
  }, [bookingId, showToast]);

  const updateQty = (id, delta) => {
    setConcessions((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) {
          const newQty = Math.max(0, c.qty + delta);
          return { ...c, qty: newQty };
        }
        return c;
      });
      if (bookingId) {
        const toSave = {};
        updated.forEach((c) => {
          if (c.qty > 0) toSave[c.id] = c.qty;
        });
        sessionStorage.setItem(
          `booking_${bookingId}_combos`,
          JSON.stringify(toSave)
        );
      }
      return updated;
    });
  };

  const concessionsTotal = concessions.reduce((sum, item) => {
    const finalPrice =
      item.discountPercent > 0
        ? item.price * (1 - item.discountPercent / 100)
        : item.price;
    return sum + finalPrice * item.qty;
  }, 0);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return {
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0'),
    };
  };

  const { m: minutes, s: seconds } = formatTime(timeLeft);

  const handleContinue = async () => {
    const selectedCombos = concessions.filter((c) => c.qty > 0);

    try {
      if (selectedCombos.length > 0 && bookingId) {
        await updateCombo(bookingId, {
          combos: selectedCombos.map((c) => ({
            comboId: c.id,
            quantity: c.qty,
          })),
        });
      }

      navigate('/checkout', {
        state: {
          isVOD: false,
          show,
          bookingId,
          ticketCode: location.state?.ticketCode,
          expireAt,
          selectedSeats,
          totalTickets: location.state?.total || 0,
          concessions: selectedCombos,
          concessionsTotal,
        },
      });
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật combo', 'error');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white selection:bg-[#e61a27] selection:text-white font-sans">
      <Header />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 py-10 md:py-16 relative">
        {/* Title Header */}
        <div className="border-b-2 border-[#e61a27] pb-4 mb-6 flex justify-between items-center relative">
          <h1 className="text-2xl text-[#111827] dark:text-white font-bold uppercase tracking-wide">
            Đặt Vé Trực Tuyến
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

        {/* Info Box */}
        <div className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#333] rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="text-[14px] text-gray-600 dark:text-[#ddd] w-full flex-1 md:text-left pr-4">
            <p className="font-semibold text-[#111827] dark:text-white mb-1 leading-relaxed">
              {displayLocation} | {displaySeats}
            </p>
            <p>
              {displayDate} {displayTime}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/5 dark:bg-black/30 px-5 py-3 rounded-2xl border border-gray-200 dark:border-white/10 shrink-0 self-center">
            <div className="text-center">
              <p className="text-[13px] text-gray-500 dark:text-[#aaa] font-semibold leading-tight">
                Thời gian
                <br />
                giữ ghế
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#e61a27]/90 flex items-center justify-center font-bold text-white text-xl rounded-[12px] shadow-md border border-red-400/20">
                  {minutes}
                </div>
                <span className="text-[10px] text-gray-500 dark:text-[#aaa] mt-1.5 uppercase font-medium">
                  Phút
                </span>
              </div>
              <span className="font-bold text-xl text-gray-400 dark:text-[#555] mt-1.5">
                :
              </span>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-[#e61a27]/90 flex items-center justify-center font-bold text-white text-xl rounded-[12px] shadow-md border border-red-400/20">
                  {seconds}
                </div>
                <span className="text-[10px] text-gray-500 dark:text-[#aaa] mt-1.5 uppercase font-medium">
                  Giây
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 mt-12">
          {/* Bắp Nước Header */}
          <div className="flex items-center justify-center mb-12">
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#4a6b8c]/40 dark:via-[#8ba2b8]/40 to-[#4a6b8c]/70 dark:to-[#8ba2b8]/80 flex-1 max-w-[250px] shadow-sm dark:shadow-[0_0_10px_rgba(139,162,184,0.5)]"></div>
            <h2 className="text-[15px] md:text-[18px] font-black text-[#4a6b8c] dark:text-[#a6c1db] tracking-[0.3em] uppercase mx-8 drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(166,193,219,0.8)]">
              CHỌN COMBO BẮP NƯỚC
            </h2>
            <div className="h-[2px] bg-gradient-to-l from-transparent via-[#4a6b8c]/40 dark:via-[#8ba2b8]/40 to-[#4a6b8c]/70 dark:to-[#8ba2b8]/80 flex-1 max-w-[250px] shadow-sm dark:shadow-[0_0_10px_rgba(139,162,184,0.5)]"></div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-6">
            {loading ? (
              <div className="col-span-1 lg:col-span-2 text-center text-[#aaa] py-10">
                Đang tải danh sách combo...
              </div>
            ) : concessions.length === 0 ? (
              <div className="col-span-1 lg:col-span-2 text-center text-[#aaa] py-10">
                Hiện chưa có combo nào.
              </div>
            ) : (
              concessions.map((item) => {
                const finalPrice =
                  item.discountPercent > 0
                    ? item.price * (1 - item.discountPercent / 100)
                    : item.price;

                const isDiscounted = item.discountPercent > 0;
                const isVip = item.name.toLowerCase().includes('vip');
                const isTietKiem = item.name
                  .toLowerCase()
                  .includes('tiết kiệm');

                let placeholderColor = '#e5e7eb';
                if (
                  isVip ||
                  item.name.toLowerCase().includes('tình yêu') ||
                  item.name.toLowerCase().includes('2 người') ||
                  item.name.toLowerCase().includes('bạn bè')
                )
                  placeholderColor = '#eab308';
                if (isTietKiem) placeholderColor = '#22c55e';

                return (
                  <div
                    key={item.id}
                    className="flex rounded-[12px] border border-gray-200 dark:border-white/10 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-[#181818] transition-colors relative h-full min-h-[160px] hover:z-50"
                  >
                    {/* Left Side: Image / Placeholder */}
                    <div className="w-[140px] shrink-0 bg-gray-50 dark:bg-[#1c1c1c] flex items-center justify-center p-3 relative border-r border-gray-200 dark:border-white/10 h-full rounded-l-[12px]">
                      {item.imageUrl &&
                      item.imageUrl.trim() !== '' &&
                      !item.imageUrl.includes('placeholder') ? (
                        <div className="w-full aspect-square bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-md flex items-center justify-center p-1 shadow-inner overflow-hidden relative group">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Ribbon overlaid on image */}
                          {isDiscounted && (
                            <div
                              className="absolute top-[12px] -right-[28px] w-[100px] rotate-45 bg-[#e50914] text-white text-[9px] md:text-[10px] font-black tracking-wider text-center py-0.5 shadow-[0_3px_10px_rgba(0,0,0,0.6)] z-20 uppercase"
                              style={{
                                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                              }}
                            >
                              GIẢM {item.discountPercent}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full aspect-square bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-md flex flex-col items-center justify-center p-2 text-center shadow-inner relative overflow-hidden">
                          {item.name.split(' ').map((word, idx) => (
                            <div
                              key={idx}
                              className="font-bold text-[15px] leading-tight"
                              style={{ color: placeholderColor }}
                            >
                              {word}
                            </div>
                          ))}

                          {/* Ribbon overlaid on placeholder */}
                          {isDiscounted && (
                            <div
                              className="absolute top-[12px] -right-[28px] w-[100px] rotate-45 bg-[#e50914] text-white text-[9px] md:text-[10px] font-black tracking-wider text-center py-0.5 shadow-[0_3px_10px_rgba(0,0,0,0.6)] z-20 uppercase"
                              style={{
                                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                              }}
                            >
                              GIẢM {item.discountPercent}%
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Side: Details */}
                    <div className="p-4 flex flex-col flex-1 h-full relative">
                      <h3 className="font-bold text-[#111827] dark:text-white text-[15px] uppercase tracking-wide pr-16 mb-1 shrink-0 truncate">
                        {item.name}
                      </h3>

                      <div className="group/desc relative flex-1 min-h-0 mb-2">
                        <div className="text-[12px] text-[#888] line-clamp-3 leading-relaxed cursor-pointer">
                          {item.description
                            ?.trim()
                            .replace(/(?:\r?\n\s*){2,}/g, '\n\n')
                            .split('\n')
                            .map((line, idx) => {
                              const colonIndex = line.indexOf(':');
                              if (colonIndex !== -1) {
                                const label = line.slice(0, colonIndex + 1);
                                const content = line.slice(colonIndex + 1);
                                return (
                                  <span key={idx}>
                                    <span className="font-semibold text-[#bbb]">
                                      {label}
                                    </span>{' '}
                                    {content}
                                    <br />
                                  </span>
                                );
                              }
                              return (
                                <span key={idx}>
                                  {line}
                                  <br />
                                </span>
                              );
                            })}
                        </div>

                        {/* Custom Popover Tooltip */}
                        <div className="absolute top-[calc(100%+8px)] left-0 w-[320px] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] opacity-0 invisible group-hover/desc:opacity-100 group-hover/desc:visible transition-all duration-300 z-[100] -translate-y-2 group-hover/desc:translate-y-0">
                          <div
                            className="text-gray-700 dark:text-white/90 text-[13px] leading-relaxed max-h-[250px] overflow-y-auto pr-2"
                            style={{
                              scrollbarWidth: 'thin',
                              scrollbarColor: '#555 transparent',
                            }}
                          >
                            {item.description
                              ?.trim()
                              .replace(/(?:\r?\n\s*){2,}/g, '\n\n')
                              .split('\n')
                              .map((line, idx) => {
                                const colonIndex = line.indexOf(':');
                                if (colonIndex !== -1) {
                                  const label = line.slice(0, colonIndex + 1);
                                  const content = line.slice(colonIndex + 1);
                                  return (
                                    <span
                                      key={idx}
                                      className="block mb-1.5 last:mb-0"
                                    >
                                      <span className="font-semibold text-[#e50914]">
                                        {label}
                                      </span>{' '}
                                      {content}
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    key={idx}
                                    className="block mb-1.5 last:mb-0"
                                  >
                                    {line}
                                  </span>
                                );
                              })}
                          </div>
                          {/* Arrow */}
                          <div className="absolute -top-[5px] left-8 w-2.5 h-2.5 bg-white dark:bg-[#18181b] border-t border-l border-gray-200 dark:border-white/10 rotate-45"></div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-auto shrink-0 border-t border-gray-200 dark:border-white/10 pt-2">
                        {/* Price Block */}
                        <div>
                          {isDiscounted ? (
                            <>
                              <div className="text-[11px] text-[#666] mb-0.5">
                                Chỉ còn:
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#e61a27] text-[18px] leading-none">
                                  {finalPrice.toLocaleString('vi-VN')} đ
                                </span>
                                <span className="text-[12px] text-[#555] line-through decoration-[#e61a27]/50">
                                  {item.price.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[11px] text-[#666] mb-0.5">
                                Giá:
                              </div>
                              <div className="font-bold text-[#111827] dark:text-white text-[18px] leading-none">
                                {finalPrice.toLocaleString('vi-VN')} đ
                              </div>
                            </>
                          )}
                        </div>

                        {/* Quantity Pill Selector */}
                        <div className="flex items-center justify-between bg-transparent border border-gray-200 dark:border-[#333] rounded-full h-[38px] w-[100px] px-1">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-8 h-full flex items-center justify-center text-[#777] hover:text-[#111827] dark:text-white transition-colors text-[20px] font-light pb-0.5"
                          >
                            -
                          </button>
                          <span className="text-[#111827] dark:text-white font-bold text-[14px]">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-8 h-full flex items-center justify-center text-[#777] hover:text-[#111827] dark:text-white transition-colors text-[20px] font-light pb-0.5"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action Bottom */}
        <div className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#333] rounded-xl p-6 flex flex-col sm:flex-row justify-end items-center gap-5 mt-8">
          <div className="flex items-center gap-6">
            <div className="text-[15px]">
              <span className="text-[#aaa] mr-2 font-medium">Tổng tiền:</span>
              <span className="text-[#e61a27] font-black text-2xl">
                {concessionsTotal.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <button
              onClick={handleContinue}
              className="bg-gradient-to-r from-[#e61a27] to-[#cc1622] hover:from-[#ff2e43] hover:to-[#e61a27] text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 transition-all shadow-[0_8px_20px_rgba(230,26,39,0.3)] hover:-translate-y-0.5 uppercase tracking-wider text-[14px]"
            >
              Tiếp Tục
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
