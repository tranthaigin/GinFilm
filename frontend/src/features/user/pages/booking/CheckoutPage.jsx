import { useCountdown } from '../../../../shared/hooks/useCountdown';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';

import { getConfigs } from '../../api/services/systemConfigService';
import { applyPromotion } from '../../api/services/promotionService';
import {
  createPaymentIntent,
  confirmStripePayment,
} from '../../api/services/paymentService';

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

function StripeCheckoutCard({ total, onComplete }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(
    'Sử dụng thẻ test: 4242 4242 4242 4242 (Ngày/CVC bất kỳ)'
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setMessage('Đang xử lý thanh toán...');

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (result.error) {
      setMessage(result.error.message || 'Thanh toán thất bại.');
      setSubmitting(false);
      onComplete({ ok: false, message: result.error.message });
    } else if (
      result.paymentIntent &&
      result.paymentIntent.status === 'succeeded'
    ) {
      setMessage('Thanh toán thành công!');
      onComplete({ ok: true, paymentIntentId: result.paymentIntent.id });
    } else {
      setSubmitting(false);
      onComplete({ ok: false, message: 'Trạng thái không xác định.' });
    }
  };

  return (
    <form className="flex flex-col h-full min-h-0" onSubmit={handleSubmit}>
      <div className="overflow-y-auto pr-1 pb-4 flex-1">
        <p className="text-sm text-[#aaa] italic text-center leading-relaxed mb-4">
          {message}
        </p>
        <div className="bg-white p-4 rounded-xl border border-gray-200 dark:border-white/10">
          <PaymentElement />
        </div>
      </div>
      <div className="pt-4 shrink-0 border-t border-gray-200 dark:border-white/10 mt-auto">
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="w-full bg-[#e61a27] hover:bg-[#cc1622] !text-white text-white font-black tracking-widest uppercase py-4 rounded-xl disabled:opacity-50 transition-all shadow-[0_4px_20px_rgba(230,26,39,0.4)]"
          style={{ color: '#ffffff' }}
        >
          <span className="!text-white" style={{ color: '#ffffff' }}>
            {submitting
              ? 'Đang xác nhận...'
              : `XÁC NHẬN ${total.toLocaleString('vi-VN')} VND`}
          </span>
        </button>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToastStore((state) => state.showToast);

  const locationState = location.state || {};
  const isVOD =
    locationState.isVOD ??
    (() => {
      return sessionStorage.getItem('booking_checkout_isVOD') === 'true';
    })();

  const show = isVOD
    ? null
    : locationState.show ||
      (() => {
        try {
          const saved = sessionStorage.getItem('booking_checkout_show');
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();

  const bookingId = isVOD
    ? null
    : locationState.bookingId ||
      sessionStorage.getItem('booking_checkout_bookingId');
  const expireAt = isVOD
    ? null
    : locationState.expireAt ||
      sessionStorage.getItem('booking_checkout_expireAt');
  isVOD
    ? null
    : locationState.ticketCode ||
      sessionStorage.getItem('booking_checkout_ticketCode');

  const movie =
    locationState.movie ||
    (() => {
      try {
        const saved = sessionStorage.getItem('booking_checkout_movie');
        return saved
          ? JSON.parse(saved)
          : { title: show?.movieTitle, posterUrl: show?.moviePosterUrl };
      } catch {
        return { title: show?.movieTitle, posterUrl: show?.moviePosterUrl };
      }
    })();

  const selectedSeats = isVOD
    ? []
    : locationState.selectedSeats ||
      (() => {
        try {
          const saved = sessionStorage.getItem(
            'booking_checkout_selectedSeats'
          );
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      })();

  const totalTicketsPrice =
    locationState.totalTickets ||
    locationState.totalPrice ||
    (() => {
      const saved = sessionStorage.getItem(
        'booking_checkout_totalTicketsPrice'
      );
      return saved ? parseInt(saved, 10) : 0;
    })();

  isVOD
    ? []
    : locationState.concessions ||
      (() => {
        try {
          const saved = sessionStorage.getItem('booking_checkout_concessions');
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      })();

  const passedConcessionsTotal =
    locationState.concessionsTotal ??
    (() => {
      const saved = sessionStorage.getItem(
        'booking_checkout_passedConcessionsTotal'
      );
      return saved ? parseInt(saved, 10) : 0;
    })();

  useEffect(() => {
    if (location.state) {
      if (location.state.isVOD !== undefined)
        sessionStorage.setItem(
          'booking_checkout_isVOD',
          String(location.state.isVOD)
        );

      if (location.state.isVOD) {
        sessionStorage.removeItem('booking_checkout_show');
        sessionStorage.removeItem('booking_checkout_bookingId');
        sessionStorage.removeItem('booking_checkout_expireAt');
        sessionStorage.removeItem('booking_checkout_ticketCode');
        sessionStorage.removeItem('booking_checkout_selectedSeats');
        sessionStorage.removeItem('booking_checkout_concessions');
        sessionStorage.removeItem('booking_checkout_passedConcessionsTotal');
      } else {
        if (location.state.show)
          sessionStorage.setItem(
            'booking_checkout_show',
            JSON.stringify(location.state.show)
          );
        if (location.state.bookingId)
          sessionStorage.setItem(
            'booking_checkout_bookingId',
            location.state.bookingId
          );
        if (location.state.expireAt)
          sessionStorage.setItem(
            'booking_checkout_expireAt',
            location.state.expireAt
          );
        if (location.state.ticketCode)
          sessionStorage.setItem(
            'booking_checkout_ticketCode',
            location.state.ticketCode
          );
        if (location.state.selectedSeats)
          sessionStorage.setItem(
            'booking_checkout_selectedSeats',
            JSON.stringify(location.state.selectedSeats)
          );
        if (location.state.concessions)
          sessionStorage.setItem(
            'booking_checkout_concessions',
            JSON.stringify(location.state.concessions)
          );
        if (location.state.concessionsTotal !== undefined)
          sessionStorage.setItem(
            'booking_checkout_passedConcessionsTotal',
            String(location.state.concessionsTotal)
          );
      }

      if (location.state.movie)
        sessionStorage.setItem(
          'booking_checkout_movie',
          JSON.stringify(location.state.movie)
        );

      const price = location.state.totalTickets || location.state.totalPrice;
      if (price !== undefined)
        sessionStorage.setItem(
          'booking_checkout_totalTicketsPrice',
          String(price)
        );
    }
  }, [location.state]);

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoScope, setPromoScope] = useState('');
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(
    () => sessionStorage.getItem('booking_checkout_pointsToUse') || ''
  );
  const [minCash, setMinCash] = useState(7000);
  const [minRlf, setMinRlf] = useState(10);
  const [openAccordions, setOpenAccordions] = useState({
    voucher: false,
    points: false,
  }); // Both closed by default
  const [confirmDialog, setConfirmDialog] = useState(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    sessionStorage.setItem('booking_checkout_pointsToUse', pointsToUse);
  }, [pointsToUse]);
  const rewardPoints = user?.rewardPoints || 0;

  const [paymentMethod, setPaymentMethod] = useState(
    stripeKey ? 'stripe' : 'vnpay'
  );
  useState('pending'); // 'pending' | 'success'
  useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const timeLeft = useCountdown(expireAt); // 5 minutes
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [backendError, setBackendError] = useState(false);

  isVOD ? 1 : selectedSeats.length;
  const ticketsTotal = totalTicketsPrice;
  const concessionsTotal = isVOD ? 0 : passedConcessionsTotal;

  const subtotal = ticketsTotal + concessionsTotal;

  const ticketDiscount =
    promoScope === 'TICKET_ONLY' || promoScope === 'ALL'
      ? Math.min(ticketsTotal, discount)
      : 0;
  const maxDiscountableTicket = Math.max(
    0,
    ticketsTotal - ticketDiscount - minCash
  );
  const maxPointsAllowedCalculated = Math.floor(maxDiscountableTicket / 1000);
  const maxPoints = Math.min(
    rewardPoints,
    maxPointsAllowedCalculated > 0 ? maxPointsAllowedCalculated : 0
  );

  const total = Math.max(0, subtotal - discount - pointsDiscount);
  const minTicketRequiredForPoints = minCash + minRlf * 1000;
  const isStripeDisabled = !stripeKey || total < 12000;

  const resetKey1 = JSON.stringify([isStripeDisabled, paymentMethod]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    if (isStripeDisabled && paymentMethod === 'stripe') {
      setPaymentMethod('vnpay');
    }
  }

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
      : 'Ghế: H5, H6';

  const displayDate = show?.showDate
    ? formatShowDate(show.showDate)
    : '11/06/2026';
  const displayTime =
    show?.startTime && show?.endTime
      ? `${show.startTime.substring(0, 5)} ~ ${show.endTime.substring(0, 5)}`
      : '20:40 ~ 22:59';

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchConfigs = () => {
      return getConfigs()
        .then((data) => {
          const minCashConfig = data.find((c) => c.key === 'MIN_CASH_VND');
          const minRlfConfig = data.find((c) => c.key === 'MIN_RLF_POINTS');
          if (minCashConfig) setMinCash(Number(minCashConfig.value));
          if (minRlfConfig) setMinRlf(Number(minRlfConfig.value));
        })
        .catch((err) => {
          console.error('Failed to fetch system configs', err);
        });
    };
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (isVOD) return;
    if (timeLeft <= 0) {
      showToast('Đã hết thời gian giữ ghế. Vui lòng đặt lại!', 'error');
      navigate(
        `/booking?showId=${show?.id || show?.showId || ''}&movieId=${show?.movieId || ''}`
      );
      return;
    }
  }, [
    timeLeft,
    navigate,
    showToast,
    isVOD,
    show?.id,
    show?.showId,
    show?.movieId,
  ]);

  const handleApplyPromo = async () => {
    const codeStr = promoCode || '';
    if (!codeStr) {
      showToast('Vui lòng nhập mã Voucher.', 'error');
      return;
    }
    if (/\s/.test(codeStr)) {
      showToast('Mã Voucher không được chứa khoảng trắng.', 'error');
      return;
    }
    const specialMatch = codeStr.match(/[^a-zA-Z0-9]/);
    if (specialMatch) {
      showToast(
        `Mã Voucher không được chứa ký tự đặc biệt '${specialMatch[0]}'.`,
        'error'
      );
      return;
    }

    try {
      const data = await applyPromotion(
        codeStr,
        ticketsTotal,
        concessionsTotal
      );
      if (
        pointsDiscount > 0 &&
        (data.scope === 'TICKET_ONLY' || data.scope === 'ALL')
      ) {
        setConfirmDialog({
          message:
            'Bạn đang dùng Điểm GinFilm. Nếu tiếp tục sử dụng Voucher này, điểm GinFilm sẽ bị gỡ vì cả hai không thể áp dụng chung. Bạn có chắc chắn muốn tiếp tục?',
          onConfirm: () => {
            setPointsToUse('');
            setPointsDiscount(0);
            setDiscount(data.discountAmount);
            setPromoScope(data.scope);
            showToast(
              `Áp dụng mã thành công! Bạn được giảm ${data.discountAmount.toLocaleString('vi-VN')} VND`,
              'success'
            );
            setConfirmDialog(null);
          },
          onCancel: () => setConfirmDialog(null),
        });
        return;
      }
      setDiscount(data.discountAmount);
      setPromoScope(data.scope);
      showToast(
        `Áp dụng mã thành công! Bạn được giảm ${data.discountAmount.toLocaleString('vi-VN')} VND`,
        'success'
      );
    } catch (error) {
      console.error(error);
      setDiscount(0);
      showToast(
        error.message || 'Lỗi kết nối khi áp dụng mã giảm giá',
        'error'
      );
    }
  };

  const applyPointsLogic = () => {
    const valStr = pointsToUse || '';
    if (!valStr || isNaN(Number(valStr))) {
      showToast('Vui lòng nhập số điểm hợp lệ.', 'error');
      return;
    }
    const points = parseInt(valStr, 10);
    if (points < 0) {
      showToast('Số điểm không được là số âm.', 'error');
      return;
    }
    if (points < minRlf) {
      showToast(`Bạn cần dùng tối thiểu ${minRlf} điểm.`, 'error');
      return;
    }
    if (points > rewardPoints) {
      showToast(
        `Bạn không đủ điểm GinFilm. (Số dư hiện tại: ${rewardPoints} điểm).`,
        'error'
      );
      return;
    }
    if (maxPoints < minRlf) {
      showToast(
        `Đơn hàng không đủ điều kiện dùng điểm GinFilm (Giá vé cần tối thiểu ${minTicketRequiredForPoints.toLocaleString('vi-VN')} VNĐ).`,
        'error'
      );
      return;
    }
    if (points > maxPoints) {
      showToast(
        `Chỉ có thể dùng tối đa ${maxPoints.toLocaleString('vi-VN')} điểm để giữ lại tối thiểu ${minCash.toLocaleString('vi-VN')} VND.`,
        'error'
      );
      return;
    }

    const discountValue = points * 1000;
    setPointsDiscount(discountValue);
    showToast(
      `Đã dùng ${points.toLocaleString('vi-VN')} điểm, giảm ${discountValue.toLocaleString('vi-VN')} VND.`
    );
  };

  const handleApplyPoints = () => {
    if (promoScope === 'TICKET_ONLY' || promoScope === 'ALL') {
      setConfirmDialog({
        message:
          'Bạn chắc chắn muốn tiếp tục dùng điểm GinFilm? Nếu tiếp tục Voucher đang áp dụng sẽ bị gỡ vì cả hai không thể dùng chung.',
        onConfirm: () => {
          setPromoCode('');
          setDiscount(0);
          setPromoScope('');
          applyPointsLogic();
          setConfirmDialog(null);
        },
        onCancel: () => setConfirmDialog(null),
      });
      return;
    }
    applyPointsLogic();
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState(0);
  const handlePayment = async () => {
    if (isProcessing) return;
    if (paymentMethod === 'vnpay') {
      await handleProcessVnPayPayment();
      return;
    }
    if (paymentMethod !== 'stripe' || !stripeKey) return;
    setIsProcessing(true);
    setBackendError(false);
    try {
      const sdk = stripePromise || loadStripe(stripeKey);
      const stripe = await sdk;
      if (!stripe) throw new Error('Không thể kết nối cổng thanh toán Stripe.');
      setStripePromise(sdk);
      const targetMovieId = show?.movieId || show?.id || movie?.id;
      const data = await createPaymentIntent({
        bookingId: isVOD ? null : bookingId,
        movieId: isVOD ? targetMovieId : null,
        promoCode: promoCode || null,
        pointsToUse: Math.max(0, pointsDiscount / 1000),
      });
      setClientSecret(data.clientSecret);
      setPaymentAmount(data.amount);
      setShowPaymentModal(true);
    } catch (err) {
      setStripePromise(null);
      showToast(err.message || 'Payment unavailable', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessVnPayPayment = async (paymentIntentId = null) => {
    setIsProcessing(true);
    try {
      const targetMovieId = show?.movieId || show?.id || movie?.id;

      if (typeof paymentIntentId === 'string') {
        await confirmStripePayment(paymentIntentId);
      } else if (isVOD && targetMovieId) {
        const { purchaseOnlineTicket } = await import(
          '../../api/services/bookingService'
        );
        const res = await purchaseOnlineTicket({
          movieId: targetMovieId,
          price: Math.max(0, subtotal - discount),
          paymentMethod: paymentMethod.toUpperCase(),
          promoCode: promoCode || null,
          pointsToUse: pointsDiscount / 1000 > 0 ? pointsDiscount / 1000 : 0,
        });
        if (res && res.paymentUrl) {
          window.location.href = res.paymentUrl;
          return;
        }
      } else if (bookingId) {
        const { createPayment } = await import(
          '../../api/services/bookingService'
        );
        const res = await createPayment(bookingId, {
          paymentMethod: paymentMethod.toUpperCase(),
          amount: total,
          promoCode: promoCode || null,
          pointsToUse: pointsDiscount / 1000 > 0 ? pointsDiscount / 1000 : 0,
        });

        if (res && res.paymentUrl) {
          window.location.href = res.paymentUrl;
          return;
        }
      }

      showToast('Thanh toán thành công!', 'success');
      navigate('/my-tickets', {
        replace: true,
        state: {
          showLatestTicket: true,
          purchasedType: isVOD ? 'web' : 'cinema',
          movieId: targetMovieId,
        },
      });
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Lỗi khi xác nhận thanh toán', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return {
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0'),
    };
  };

  const { m: minutes, s: seconds } = formatTime(timeLeft);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white font-sans">
      <Header />

      {confirmDialog && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500">
                warning
              </span>
              Xác nhận
            </h3>
            <p className="text-gray-300 text-[15px] leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 py-10 md:py-16 relative">
        <div className="border-b-2 border-[#e61a27] pb-4 mb-6 flex justify-between items-center relative">
          <h1 className="text-2xl text-[#111827] dark:text-white font-bold uppercase tracking-wide">
            Thanh Toán
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

        <div className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#333] rounded-xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2 flex-1 pr-4">
            <div className="text-[15px] font-bold text-[#111827] dark:text-white leading-relaxed">
              {isVOD
                ? 'MUA QUYỀN XEM PHIM TRỰC TUYẾN'
                : `${displayLocation} | ${displaySeats}`}
            </div>
            <div className="text-[14px] text-gray-600 dark:text-[#ccc]">
              {movie?.title ? movie.title : 'Phim chiếu rạp'} -{' '}
              {isVOD ? 'Phim trực tuyến' : `${displayDate} ${displayTime}`}
            </div>
          </div>

          {!isVOD && (
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
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="flex-1 w-full flex flex-col gap-6">
            <div className="bg-white rounded overflow-hidden shadow-sm">
              <div className="bg-gray-100 dark:bg-[#222] px-4 py-3 border-b border-gray-200 dark:border-[#333]">
                <h2 className="text-[15px] font-bold text-[#111827] dark:text-white uppercase tracking-wide">
                  Bước 1: Khuyến Mãi
                </h2>
              </div>

              <div className="flex flex-col text-[#333]">
                <div className="border-b border-gray-200 dark:border-[#333]">
                  <div
                    className="bg-gray-50 dark:bg-[#222] px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors flex justify-between items-center"
                    onClick={() =>
                      setOpenAccordions((prev) => ({
                        ...prev,
                        voucher: !prev.voucher,
                      }))
                    }
                  >
                    <span className="font-medium text-[14px] text-[#111827] dark:text-white">
                      GinFilm Voucher
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-gray-500 dark:text-[#aaa]">
                      {openAccordions.voucher ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                  {openAccordions.voucher && (
                    <div className="p-4 bg-white dark:bg-[#18181b] border-t border-gray-200 dark:border-[#333]">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nhập GinFilm Voucher..."
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="flex-1 bg-transparent border border-[#444] text-[#111827] dark:text-white rounded px-3 py-1.5 text-[14px] focus:outline-none focus:border-[#e61a27]"
                        />
                        <button
                          onClick={handleApplyPromo}
                          className="bg-[#e61a27] text-white px-4 py-1.5 rounded font-bold text-[13px] hover:bg-[#cc1622] transition-colors"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div
                    className="bg-gray-50 dark:bg-[#222] px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors flex justify-between items-center"
                    onClick={() =>
                      setOpenAccordions((prev) => ({
                        ...prev,
                        points: !prev.points,
                      }))
                    }
                  >
                    <span className="font-medium text-[14px] text-[#111827] dark:text-white">
                      Điểm GinFilm
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-gray-500 dark:text-[#aaa]">
                      {openAccordions.points ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                  {openAccordions.points && (
                    <div className="p-4 bg-white dark:bg-[#18181b] border-t border-gray-200 dark:border-[#333]">
                      {maxPoints < minRlf ? (
                        <p className="text-[13px] text-amber-600 dark:text-amber-400 mb-2 font-medium">
                          Đơn hàng chưa đủ điều kiện dùng điểm GinFilm (Giá vé
                          cần từ{' '}
                          {minTicketRequiredForPoints.toLocaleString('vi-VN')}{' '}
                          VNĐ trở lên).
                        </p>
                      ) : (
                        <p className="text-[13px] text-[#aaa] mb-2">
                          Bạn có thể dùng từ {minRlf} -{' '}
                          {maxPoints.toLocaleString('vi-VN')} điểm.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max={maxPoints}
                          disabled={maxPoints < minRlf}
                          value={pointsToUse}
                          onChange={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (isNaN(val)) {
                              setPointsToUse('');
                            } else {
                              if (val < 0) val = 0;
                              if (val > maxPoints) val = maxPoints;
                              setPointsToUse(val);
                            }
                          }}
                          placeholder={
                            maxPoints < minRlf
                              ? 'Không đủ điều kiện...'
                              : 'Nhập số điểm...'
                          }
                          className="flex-1 bg-transparent border border-[#444] text-[#111827] dark:text-white rounded px-3 py-1.5 text-[14px] focus:outline-none focus:border-[#e61a27] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={handleApplyPoints}
                          disabled={maxPoints < minRlf}
                          className="bg-[#e61a27] text-white px-4 py-1.5 rounded font-bold text-[13px] hover:bg-[#cc1622] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-[#333] bg-white dark:bg-[#18181b] rounded flex-1">
              <div className="bg-gray-100 dark:bg-[#2a2a2a] px-5 py-3 border-b border-gray-200 dark:border-[#333]">
                <h2 className="text-[15px] font-semibold text-[#111827] dark:text-[#eee] uppercase">
                  BƯỚC 2: HÌNH THỨC THANH TOÁN
                </h2>
              </div>
              <div className="flex flex-col">
                <label
                  className={`flex items-center gap-4 p-4 border-b border-gray-200 dark:border-[#333] transition-colors ${
                    isStripeDisabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-100/50 dark:bg-white/5'
                      : paymentMethod === 'stripe'
                        ? 'bg-gray-50 dark:bg-[#222] cursor-pointer'
                        : 'hover:bg-gray-50 dark:hover:bg-[#222] cursor-pointer'
                  }`}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <input
                      type="radio"
                      name="payment"
                      disabled={isStripeDisabled}
                      checked={paymentMethod === 'stripe'}
                      onChange={() =>
                        !isStripeDisabled && setPaymentMethod('stripe')
                      }
                      className="absolute opacity-0 w-full h-full cursor-pointer z-10 disabled:cursor-not-allowed"
                    />
                    <div
                      className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-all duration-300 ${
                        paymentMethod === 'stripe' && !isStripeDisabled
                          ? 'border-[#e61a27] bg-[#e61a27]'
                          : 'border-gray-400 dark:border-[#666] bg-white dark:bg-transparent'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full bg-white transition-transform duration-300 ${paymentMethod === 'stripe' && !isStripeDisabled ? 'scale-100' : 'scale-0'}`}
                      />
                    </div>
                  </div>
                  <div className="w-12 h-8 bg-white rounded border border-[#ddd] flex items-center justify-center text-[#635bff] font-bold text-[12px] italic tracking-tight">
                    Stripe
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-[14px] text-gray-700 dark:text-[#ddd]">
                      Thanh toán qua Stripe
                    </span>
                    {isStripeDisabled && (
                      <span className="text-xs text-amber-500 font-medium italic">
                        (Không khả dụng với đơn dưới 12.000 VNĐ)
                      </span>
                    )}
                  </div>
                </label>

                <label
                  className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${paymentMethod === 'vnpay' ? 'bg-gray-50 dark:bg-[#222]' : 'hover:bg-gray-50 dark:hover:bg-[#222]'}`}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'vnpay'}
                      onChange={() => setPaymentMethod('vnpay')}
                      className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <div
                      className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-all duration-300 ${paymentMethod === 'vnpay' ? 'border-[#e61a27] bg-[#e61a27]' : 'border-gray-400 dark:border-[#666] bg-white dark:bg-transparent'}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full bg-white transition-transform duration-300 ${paymentMethod === 'vnpay' ? 'scale-100' : 'scale-0'}`}
                      />
                    </div>
                  </div>
                  <div className="w-12 h-8 bg-white rounded border border-[#ddd] flex items-center justify-center font-bold text-[12px] tracking-tight">
                    <span className="text-[#005ba1]">VN</span>
                    <span className="text-[#e61a27]">PAY</span>
                  </div>
                  <span className="text-[14px] text-gray-700 dark:text-[#ddd]">
                    Thanh toán qua VNPAY
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[440px] flex flex-col shrink-0">
            <div className="border border-gray-200 dark:border-[#333] bg-white dark:bg-[#18181b] rounded flex-1 flex flex-col">
              <div className="bg-gray-100 dark:bg-[#2a2a2a] px-4 py-3 border-b border-gray-200 dark:border-[#333] text-center">
                <span className="text-[15px] font-semibold text-[#111827] dark:text-[#eee] uppercase">
                  Tổng cộng
                </span>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3 border-b border-gray-200 dark:border-[#333]">
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#aaa]">
                    {isVOD ? 'Phim trực tuyến' : 'Vé xem phim'}
                  </span>
                  <span className="font-semibold text-[#111827] dark:text-white">
                    {ticketsTotal.toLocaleString('vi-VN')} VND
                  </span>
                </div>
                {!isVOD && (
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-[#aaa]">Bắp nước</span>
                    <span className="font-semibold text-[#111827] dark:text-white">
                      {concessionsTotal.toLocaleString('vi-VN')} VND
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200 dark:border-[#333] flex justify-between items-center text-[15px] font-bold">
                  <span className="text-[#111827] dark:text-white">
                    Tạm tính
                  </span>
                  <span className="text-[#111827] dark:text-white">
                    {subtotal.toLocaleString('vi-VN')} VND
                  </span>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-[#2a2a2a] px-4 py-2 border-b border-gray-200 dark:border-[#333] text-center">
                <span className="text-[14px] font-semibold text-[#111827] dark:text-[#eee] uppercase">
                  Khuyến mãi
                </span>
              </div>
              <div className="px-5 py-3 flex flex-col gap-2 border-b border-gray-200 dark:border-[#333]">
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#aaa]">Voucher</span>
                  <span className="font-semibold text-[#00c853]">
                    {discount > 0
                      ? `-${discount.toLocaleString('vi-VN')} VND`
                      : '0 VND'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#aaa]">Điểm GinFilm</span>
                  <span className="font-semibold text-[#00c853]">
                    {pointsDiscount > 0
                      ? `-${pointsDiscount.toLocaleString('vi-VN')} VND`
                      : '0 VND'}
                  </span>
                </div>
              </div>

              <div className="bg-[#e61a27] px-4 py-3 text-center">
                <span className="text-[15px] font-bold text-white uppercase tracking-wide">
                  Tổng số tiền thanh toán
                </span>
              </div>
              <div className="px-5 py-5 text-center bg-white dark:bg-[#18181b] flex-1 flex items-center justify-center rounded-b">
                <span className="font-bold text-[28px] text-[#111827] dark:text-white">
                  {total.toLocaleString('vi-VN')} VND
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mt-6 justify-end">
          <div className="w-full lg:w-[440px] flex flex-col gap-4">
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full font-bold py-3.5 rounded flex items-center justify-center uppercase tracking-wide text-[15px] transition-colors bg-[#e61a27] hover:bg-[#cc1622] text-white disabled:opacity-50"
            >
              Thanh Toán
            </button>
          </div>
        </div>

        {/* Payment Modal for Stripe (Credit Card) */}
        {showPaymentModal && paymentMethod === 'stripe' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
            <div className="relative w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden rounded-[2rem] bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-[0_0_60px_rgba(230,26,39,0.15)] backdrop-blur-2xl">
              <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-red-500/10 rounded-full blur-[100px] pointer-events-none"></div>

              <div className="relative z-10 px-6 py-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center shrink-0">
                <h3 className="text-[15px] font-black tracking-[0.2em] uppercase text-[#111827] dark:text-white">
                  Thanh Toán Bằng Thẻ
                </h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-white/50">
                    close
                  </span>
                </button>
              </div>

              <div className="relative z-10 px-6 py-5 flex-1 flex flex-col min-h-0">
                {backendError ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <span className="material-symbols-outlined text-4xl text-[#e61a27] mb-4">
                      error
                    </span>
                    <p className="text-[#111827] dark:text-white text-center font-bold">
                      Chưa thể kết nối cổng thanh toán
                    </p>
                    <p className="text-[#aaa] mt-2 text-sm text-center leading-relaxed">
                      Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
                    </p>
                  </div>
                ) : clientSecret ? (
                  <Elements
                    key={clientSecret}
                    stripe={stripePromise}
                    options={{ clientSecret, appearance: { theme: 'stripe' } }}
                  >
                    <StripeCheckoutCard
                      total={paymentAmount}
                      onComplete={(res) => {
                        if (res.ok) {
                          setShowPaymentModal(false);
                          handleProcessVnPayPayment(res.paymentIntentId);
                        }
                      }}
                    />
                  </Elements>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <span className="material-symbols-outlined text-4xl text-[#e61a27] animate-spin">
                      sync
                    </span>
                    <p className="text-[#aaa] mt-4 text-sm">
                      Đang kết nối cổng thanh toán Stripe...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
