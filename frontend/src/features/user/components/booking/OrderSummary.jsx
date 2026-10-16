import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BLADE_RUNNER_POSTER } from '../../../../shared/constants/brand';
const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + ' đ';
import * as bookingService from '../../api/services/bookingService';
import { useBookingStore } from '../../store/bookingStore';

export default function OrderSummary({ showId, show, selectedSeats, prices, selectedDay, selectedShowtimes = [] }) {
  const navigate = useNavigate();
  const setSelection = useBookingStore((s) => s.setSelection);
  const setBooking = useBookingStore((s) => s.setBooking);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const standardCount = selectedSeats.filter((s) => s.type === 'standard').length;
  const vipCount = selectedSeats.filter((s) => s.type === 'vip').length;
  const standardTotal = standardCount * (prices?.standard ?? 12);
  const vipTotal = vipCount * (prices?.vip ?? 18);
  const total = standardTotal + vipTotal;
  const hasSelection = selectedSeats.length > 0;
  const hasShowtimes = selectedShowtimes.length > 0;
  const showTime = show?.startTime
    ? new Date(show.startTime).toLocaleString('vi-VN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Đang cập nhật';

  const selectedShowtimeSummary = hasShowtimes
    ? `${selectedDay?.weekday ?? ''} ${selectedDay?.dateLabel ?? ''} • ${selectedShowtimes
        .map((time) => `${time.label} (${time.format})`)
        .join(' • ')}`
    : showTime;

  const handleProceed = async () => {
    if (!hasSelection || !hasShowtimes || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const seatIds = selectedSeats.map((s) => s.id);
      const hold = await bookingService.holdSeats({ showId, seatIds });
      const booking = await bookingService.createBooking({
        showId,
        seatIds,
        holdToken: hold.holdToken,
      });

      setSelection({
        showId,
        show: {
          ...show,
          selectedDay,
          selectedShowtimes,
        },
        selectedSeats,
        holdToken: hold.holdToken,
      });
      setBooking(booking);
      navigate('/checkout', {
        state: {
          isVOD: false,
          show: {
            ...show,
            selectedDay,
            selectedShowtimes,
          },
          bookingId: booking?.id || hold?.id,
          expireAt: booking?.expireAt || hold?.expireAt,
          ticketCode: booking?.ticketCode || hold?.ticketCode,
          selectedSeats,
          totalTickets: total
        }
      });
    } catch (err) {
      setError(err?.message ?? 'Không thể tạo booking. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="w-full xl:w-[360px] shrink-0">
      <div className="rounded-[28px] border border-white/6 bg-[#18181b] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.32)] xl:sticky xl:top-28">
        <div className="flex items-center justify-between border-b border-white/6 pb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#7B7B7B]">Đơn hàng</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Tóm tắt booking</h2>
          </div>
          <div className="rounded-full border border-[#FF2E63]/30 bg-[#FF2E63]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF9AB1]">
            {selectedSeats.length} ghế
          </div>
        </div>

        <div className="mt-6 flex gap-4 rounded-2xl border border-white/6 bg-[#101010] p-4">
          <div className="relative h-28 w-20 overflow-hidden rounded-xl bg-[#1B1B1B]">
            <img
              alt={show?.movieTitle ?? 'Movie'}
              className="absolute inset-0 h-full w-full object-cover"
              src={BLADE_RUNNER_POSTER}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-bold text-white">{show?.movieTitle ?? 'Tên phim đang cập nhật'}</h3>
            <p className="mt-2 text-sm text-[#B1B1B1]">{show?.format ?? '2D Phụ đề'}</p>
            <div className="mt-3 space-y-2 text-sm text-[#8F8F8F]">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#FF7A9D]">calendar_today</span>
                <span>{selectedShowtimeSummary}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#FF7A9D]">location_on</span>
                <span>{show?.theaterName ?? 'GinFilm Premium Cinema'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/6 bg-[#101010] p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7B7B7B]">Khung giờ đã chọn</p>
          {hasShowtimes ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedShowtimes.map((time) => (
                <span
                  key={time.id}
                  className="rounded-full border border-[#FF2E63]/25 bg-[#FF2E63]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD5DF]"
                >
                  {time.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#8C8C8C]">Hãy chọn ít nhất một khung giờ trước khi tiếp tục.</p>
          )}
        </div>

        <div className="mt-6 space-y-4 border-b border-white/6 pb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#BEBEBE]">Ghế thường ({standardCount})</span>
            <span className="font-semibold text-white">{formatPrice(standardTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#BEBEBE]">Ghế VIP ({vipCount})</span>
            <span className="font-semibold text-white">{formatPrice(vipTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#7E7E7E]">Phí dịch vụ</span>
            <span className="text-[#7E7E7E]">Tính ở bước thanh toán</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#7B7B7B]">Ghế đã chọn</p>
          {selectedSeats.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSeats.map((seat) => (
                <span
                  key={seat.id}
                  className="rounded-full border border-[#FF2E63]/25 bg-[#FF2E63]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD5DF]"
                >
                  {seat.id}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#8C8C8C]">Hãy chọn ghế để xem giá tiền và tiếp tục thanh toán.</p>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-white/6 bg-[#101010] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A9A9A9]">Tổng cộng</span>
            <span className="text-2xl font-black text-white">{formatPrice(total)}</span>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-[#ff9eb4]">{error}</p>}

        <button
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold uppercase tracking-[0.2em] transition-all ${
            hasSelection && hasShowtimes && !submitting
              ? 'bg-[#FF2E63] text-white hover:bg-[#ff4d7c] hover:shadow-[0_16px_36px_rgba(255,46,99,0.28)]'
              : 'cursor-not-allowed bg-[#2A2A2A] text-[#8A8A8A]'
          }`}
          disabled={!hasSelection || !hasShowtimes || submitting}
          onClick={handleProceed}
          type="button"
        >
          {submitting ? 'Đang xử lý...' : 'Tiếp tục thanh toán'}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </aside>
  );
}
