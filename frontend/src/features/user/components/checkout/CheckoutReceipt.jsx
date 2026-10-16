import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CHECKOUT_POSTER_URL } from '../../../../shared/constants/brand';
const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + ' đ';
import * as paymentService from '../../api/services/paymentService';
import { useBookingStore } from '../../store/bookingStore';

export default function CheckoutReceipt({ contact, paymentMethod, cardDetails, onError }) {
  const navigate = useNavigate();
  const booking = useBookingStore((s) => s.booking);
  const clearBooking = useBookingStore((s) => s.clear);
  const [promoCode, setPromoCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lineItems = booking?.lineItems ?? [];
  const total = booking?.total ?? 0;
  const show = booking?.show;

  const handlePay = async () => {
    if (!booking || submitting) return;

    setSubmitting(true);
    onError?.(null);

    try {
      await paymentService.checkout({
        bookingId: booking.id,
        contact,
        paymentMethod,
        card: paymentMethod === 'creditCard' ? cardDetails : undefined,
        promoCode: promoCode || undefined,
      });

      clearBooking();
      navigate('/', { replace: true });
    } catch (err) {
      onError?.(err?.message ?? 'Thanh toán thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) {
    return (
      <section className="rounded-[28px] border border-white/6 bg-[#18181b] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.32)] md:p-8 xl:sticky xl:top-28">
        <div className="rounded-[24px] border border-dashed border-white/10 bg-[#101010] px-6 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF2E63]/12 text-[#FF7A9D]">
            <span className="material-symbols-outlined text-[28px]">confirmation_number</span>
          </div>
          <h3 className="mt-4 text-xl font-bold text-white">Chưa có đơn đặt vé</h3>
          <p className="mt-2 text-sm leading-6 text-[#9A9A9A]">
            Vui lòng quay lại trang chọn ghế để thêm vé vào giỏ trước khi thanh toán.
          </p>
          <Link
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FF2E63] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ff4f7d]"
            to="/"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Quay lại chọn ghế
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/6 bg-[#18181b] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.32)] md:p-8 xl:sticky xl:top-28">
      <div className="border-b border-white/6 pb-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#777777]">Tóm tắt đơn hàng</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Vé của bạn đã sẵn sàng</h2>
      </div>

      <div className="mt-6 flex gap-4 rounded-[24px] border border-white/6 bg-[#101010] p-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-[18px] border border-white/6 bg-[#181818]">
          <img
            alt={show?.movieTitle ?? 'Movie'}
            className="h-full w-full object-cover"
            src={CHECKOUT_POSTER_URL}
          />
        </div>
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-max rounded-full border border-[#FF2E63]/25 bg-[#FF2E63]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF9AB1]">
            {show?.format ?? 'IMAX 2D'}
          </span>
          <h3 className="mt-3 text-xl font-bold leading-tight text-white">{show?.movieTitle ?? '—'}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-[#A3A3A3]">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            {show?.startTime ? new Date(show.startTime).toLocaleString('vi-VN') : '—'}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-[#A3A3A3]">
            <span className="material-symbols-outlined text-[16px]">chair</span>
            Ghế: {booking.seatIds.join(', ')}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-white/6 bg-[#101010] px-4 py-4">
        <div className="space-y-3">
          {lineItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[#B8B8B8]">{item.label}</span>
              <span className="font-semibold text-white">{formatPrice(item.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-white/6 bg-[#101010] p-4">
        <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]" htmlFor="promoCode">
          Mã khuyến mãi
        </label>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-[#666666] focus:border-[#FF2E63]/60 focus:bg-[#181818]"
            id="promoCode"
            placeholder="Nhập mã giảm giá"
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />
          <button
            className="rounded-2xl border border-[#FF2E63]/35 bg-[#FF2E63]/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#FF9AB1] transition-colors hover:bg-[#FF2E63]/18"
            type="button"
          >
            Áp dụng
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 border-b border-white/6 pb-8 pt-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#777777]">Tổng thanh toán</p>
          <p className="mt-2 text-sm text-[#9F9F9F]">Đã bao gồm toàn bộ phí dịch vụ và ghế đã chọn.</p>
        </div>
        <span className="text-3xl font-black leading-none text-[#FF7A9D]">{formatPrice(total)}</span>
      </div>

      <button
        type="button"
        disabled={submitting}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF2E63] px-5 py-4 text-base font-bold text-white transition-all hover:bg-[#ff4f7d] ${
          submitting ? 'cursor-not-allowed opacity-50' : 'shadow-[0_18px_32px_rgba(255,46,99,0.24)]'
        }`}
        onClick={handlePay}
      >
        <span className="material-symbols-outlined">lock</span>
        {submitting ? 'Đang xử lý thanh toán...' : 'Xác nhận & thanh toán'}
      </button>

      <p className="mt-4 text-center text-xs leading-6 text-[#8B8B8B]">
        Bằng việc xác nhận, bạn đồng ý với{' '}
        <a className="text-[#FF9AB1] transition-colors hover:text-[#FFD6DF]" href="#">
          Điều khoản dịch vụ
        </a>{' '}
        và{' '}
        <a className="text-[#FF9AB1] transition-colors hover:text-[#FFD6DF]" href="#">
          Chính sách hoàn vé
        </a>
        .
      </p>
    </section>
  );
}
