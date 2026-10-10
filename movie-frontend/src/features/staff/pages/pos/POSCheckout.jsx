import React, { useState, useEffect } from 'react';
import { posApi } from '../../api/posApi';
import { useToastStore } from '../../../user/store/toastStore';
import { createPaymentIntent } from '../../../user/api/services/paymentService';
import { CreditCard, Banknote } from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51Tsz25R79c681ITLFoCZe62MVlgESea73Mtfli7rULJDGlEviM36RpWhpgwwC18lCTqD1yqySEJco7G7GjdSgl6200nVUoYmBM');

function StripeCheckoutCard({ total, onComplete }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('Sử dụng thẻ test: 4242 4242 4242 4242 (Ngày/CVC bất kỳ)');

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
    } else if (result.paymentIntent && (result.paymentIntent.status === 'succeeded' || result.paymentIntent.status === 'requires_capture' || result.paymentIntent.status === 'processing')) {
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
        <p className="text-sm text-[#aaa] italic text-center leading-relaxed mb-4">{message}</p>
        <div className="bg-white p-4 rounded-xl border border-white/10">
          <PaymentElement />
        </div>
      </div>
      <div className="pt-4 shrink-0 border-t border-white/10 mt-auto">
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="w-full bg-[#e61a27] hover:bg-[#cc1622] !text-white text-white font-black tracking-widest uppercase py-4 rounded-xl disabled:opacity-50 transition-all shadow-[0_4px_20px_rgba(230,26,39,0.4)]"
          style={{ color: '#ffffff' }}
        >
          <span className="!text-white" style={{ color: '#ffffff' }}>
            {submitting ? 'Đang xác nhận...' : `XÁC NHẬN ${total.toLocaleString('vi-VN')} VND`}
          </span>
        </button>
      </div>
    </form>
  );
}

export default function POSCheckout({ bookingData, onNext, onBack }) {
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [subMethod, setSubMethod] = useState('STRIPE');
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [backendError, setBackendError] = useState(false);
  const showToast = useToastStore(s => s.showToast);

  const subTotal = (bookingData.totalSeatPrice || 0) + (bookingData.comboPrice || 0);
  const finalTotal = subTotal;

  useEffect(() => {
    let mounted = true;
    if (paymentMethod === 'BANK_TRANSFER' && subMethod === 'STRIPE' && !clientSecret) {
      const fetchClientSecret = async () => {
        try {
          setBackendError(false);
          const data = await createPaymentIntent(finalTotal, 'vnd', bookingData.bookingId || '');
          if (mounted) setClientSecret(data.clientSecret);
        } catch (err) {
          console.error(err);
          if (mounted) setBackendError(true);
        }
      };
      fetchClientSecret();
    }
    return () => { mounted = false; };
  }, [paymentMethod, subMethod, finalTotal, bookingData.bookingId, clientSecret]);

  const handleProcessPaymentClick = () => {
    if (paymentMethod === 'BANK_TRANSFER' && subMethod === 'STRIPE') {
      setShowPaymentModal(true);
    } else {
      executeBackendPayment();
    }
  };

  const executeBackendPayment = async () => {
    try {
      setProcessing(true);
      const payload = {
        paymentMethod: paymentMethod === 'BANK_TRANSFER' ? subMethod : paymentMethod,
        pointsUsed: 0,
        customerId: null
      };

      const res = await posApi.processPayment(bookingData.bookingId, payload);

      if (res && res.paymentUrl) {
        // Mở tab mới thay vì popup
        const popup = window.open(res.paymentUrl, "_blank");

        const timer = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(timer);
            setProcessing(false);
          } else {
            try {
              const url = popup.location.href;
              if (url && url.includes('vnp_ResponseCode')) {
                clearInterval(timer);
                popup.close();

                if (url.includes('vnp_ResponseCode=00')) {
                  onNext({
                    ticketCode: res.ticketCode || 'UNKNOWN',
                    customerName: 'Khách vãng lai',
                    finalTotal,
                    paymentMethod,
                    paymentTime: new Date().toLocaleString('vi-VN')
                  });
                } else {
                  showToast('Thanh toán VNPAY thất bại hoặc bị hủy.', 'error');
                }
              }
            } catch (e) {
              // CORS error while on VNPAY domain, ignore
            }
          }
        }, 500);
        return;
      }

      onNext({
        ticketCode: res.ticketCode || res.data?.ticketCode || 'UNKNOWN',
        customerName: 'Khách vãng lai',
        finalTotal,
        paymentMethod,
        paymentTime: new Date().toLocaleString('vi-VN')
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi thanh toán', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex-1 flex flex-col gap-6">
        {/* Payment Method */}
        <div className="bg-[#18181b] rounded-2xl border border-white/10 p-6 shadow-sm flex-1">
          <h3 className="text-lg font-bold text-white mb-4">Phương Thức Thanh Toán</h3>
          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => setPaymentMethod('CASH')}
              className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-all ${paymentMethod === 'CASH'
                ? 'border-[#dc2626] bg-[#dc2626]/10 text-[#dc2626]'
                : 'border-white/10 bg-[#0b0a0a] text-white/60 hover:border-white/20 hover:text-white'
                }`}
            >
              <Banknote size={32} />
              <span className="font-bold">Tiền Mặt</span>
            </div>

            <div
              onClick={() => setPaymentMethod('BANK_TRANSFER')}
              className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-all ${paymentMethod === 'BANK_TRANSFER'
                ? 'border-[#dc2626] bg-[#dc2626]/10 text-[#dc2626]'
                : 'border-white/10 bg-[#0b0a0a] text-white/60 hover:border-white/20 hover:text-white'
                }`}
            >
              <CreditCard size={32} />
              <span className="font-bold">Chuyển Khoản (QR)</span>
            </div>
          </div>

          {paymentMethod === 'BANK_TRANSFER' && (
            <div className="mt-4 flex flex-col border-t border-white/10 pt-2">
              <label className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/10">
                <input
                  type="radio"
                  name="subMethod"
                  checked={subMethod === 'STRIPE'}
                  onChange={() => setSubMethod('STRIPE')}
                  className="w-5 h-5 accent-[#dc2626]"
                />
                <div className="bg-white rounded px-2 py-1 flex items-center justify-center w-16 h-8">
                  <span className="text-[#635BFF] font-bold italic text-sm tracking-tighter">Stripe</span>
                </div>
                <span className="text-white">Thanh toán qua Stripe</span>
              </label>

              <label className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="subMethod"
                  checked={subMethod === 'VNPAY'}
                  onChange={() => setSubMethod('VNPAY')}
                  className="w-5 h-5 accent-[#dc2626]"
                />
                <div className="bg-white rounded px-2 py-1 flex items-center justify-center w-16 h-8">
                  <span className="font-bold text-[12px] tracking-tight">
                    <span className="text-[#005ba1]">VN</span><span className="text-[#e61a27]">PAY</span>
                  </span>
                </div>
                <span className="text-white">Thanh toán qua VNPAY</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Bill Summary */}
      <div className="w-full lg:w-[380px] bg-[#18181b] rounded-2xl border border-white/10 p-6 flex flex-col flex-shrink-0 relative overflow-hidden">
        {/* Decorative receipt edge */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHBvbHlnb24gcG9pbnRzPSIwLDAgMTAsMCA1LDEwIiBmaWxsPSIjMTIxMjEyIiAvPjwvc3ZnPg==')] bg-repeat-x opacity-50" />

        <h3 className="text-xl font-black text-white text-center mt-2 mb-6 uppercase tracking-widest border-b border-white/10 pb-4">
          Hóa Đơn
        </h3>

        <div className="flex-1 space-y-4 text-sm">
          <div className="flex justify-between items-start">
            <div className="text-white/60">
              <p className="font-bold text-white mb-1">{bookingData.movieName}</p>
              <p>{bookingData.roomName} • {bookingData.time}</p>
              <p className="mt-1">Ghế: <span className="font-bold text-white">{bookingData.seatNames}</span></p>
            </div>
            <span className="font-bold text-white">{(bookingData.totalSeatPrice || 0).toLocaleString('vi-VN')}đ</span>
          </div>

          {bookingData.comboItems?.length > 0 && (
            <div className="flex justify-between items-start pt-4 border-t border-white/10 border-dashed">
              <div className="text-white/60">
                <p>Bắp nước ({bookingData.comboItems.length} món)</p>
              </div>
              <span className="font-bold text-white">{(bookingData.comboPrice || 0).toLocaleString('vi-VN')}đ</span>
            </div>
          )}

          <div className="pt-4 border-t border-white/10 border-dashed flex justify-between">
            <span className="text-white/80">Tạm tính:</span>
            <span className="font-bold text-white">{subTotal.toLocaleString('vi-VN')}đ</span>
          </div>


        </div>

        <div className="pt-4 border-t-2 border-white/20 mt-6 mb-8 flex justify-between items-end">
          <span className="text-white/80 uppercase text-xs font-bold tracking-wider">Thành tiền</span>
          <span className="text-3xl font-black text-[#dc2626]">{finalTotal.toLocaleString('vi-VN')}đ</span>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleProcessPaymentClick}
            disabled={processing}
            className="w-full py-4 rounded-xl font-black uppercase tracking-wider bg-[#dc2626] text-white hover:bg-[#c01d44] transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50"
          >
            {processing ? 'Đang Xử Lý...' : 'Xác Nhận Thanh Toán'}
          </button>

          <button
            onClick={onBack}
            disabled={processing}
            className="w-full py-3 rounded-xl font-bold bg-white/5 text-white hover:bg-white/10 transition-colors"
          >
            Quay Lại Chọn Combo
          </button>
        </div>
      </div>

      {/* Payment Modal for Stripe (Credit Card) */}
      {showPaymentModal && paymentMethod === 'BANK_TRANSFER' && subMethod === 'STRIPE' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="relative w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden rounded-[2rem] bg-black border border-white/10 shadow-[0_0_60px_rgba(230,26,39,0.15)] backdrop-blur-2xl">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-red-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 px-6 py-4 border-b border-white/10 flex justify-between items-center shrink-0">
              <h3 className="text-[15px] font-black tracking-[0.2em] uppercase text-white">Thanh Toán Bằng Thẻ</h3>
              <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-white/50">close</span>
              </button>
            </div>

            <div className="relative z-10 px-6 py-5 flex-1 flex flex-col min-h-0">
              {backendError ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <span className="material-symbols-outlined text-4xl text-[#e61a27] mb-4">error</span>
                  <p className="text-white text-center font-bold">Lỗi từ Backend Java</p>
                  <p className="text-[#aaa] mt-2 text-sm text-center leading-relaxed">
                    Backend trả về lỗi (có thể do sai Secret Key trong application.properties).<br />
                    Mở tab Console (F12) hoặc terminal Java để xem chi tiết lỗi.
                  </p>
                </div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <StripeCheckoutCard total={finalTotal} onComplete={(res) => {
                    if (res.ok) {
                      setShowPaymentModal(false);
                      executeBackendPayment();
                    }
                  }} />
                </Elements>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <span className="material-symbols-outlined text-4xl text-[#e61a27] animate-spin">sync</span>
                  <p className="text-[#aaa] mt-4 text-sm">Đang kết nối cổng thanh toán Stripe...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
