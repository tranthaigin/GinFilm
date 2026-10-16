import { useState, useEffect, useRef } from 'react';
import { posApi } from '../../api/posApi';
import { useToastStore } from '../../../user/store/toastStore';
import { CreditCard, Banknote } from 'lucide-react';

export default function POSCheckout({ bookingData, onNext, onBack }) {
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [processing, setProcessing] = useState(false);
  const showToast = useToastStore(s => s.showToast);

  const subTotal = (bookingData.totalSeatPrice || 0) + (bookingData.comboPrice || 0);
  const finalTotal = subTotal;

  const pollRef = useRef(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; clearInterval(pollRef.current); };
  }, []);

  const handleProcessPaymentClick = async () => {
    // Open within the click event so popup blockers do not interrupt payment.
    const popup = paymentMethod === 'BANK_TRANSFER' ? window.open('about:blank', '_blank') : null;
    if (paymentMethod === 'BANK_TRANSFER' && !popup) {
      showToast('Vui lòng cho phép mở cửa sổ thanh toán rồi thử lại.', 'error');
      return;
    }
    if (popup) popup.opener = null;
    setProcessing(true);
    let waiting = false;
    const finish = (result) => {
      clearInterval(pollRef.current); pollRef.current = null;
      if (!active.current) return;
      setProcessing(false);
      onNext({ ticketCode: result.ticketCode, customerName: bookingData.customerName || 'Khách vãng lai',
        finalTotal: result.amount ?? finalTotal, paymentMethod: paymentMethod === 'BANK_TRANSFER' ? 'VNPAY' : 'CASH',
        paymentTime: new Date().toLocaleString('vi-VN') });
    };
    try {
      const result = await posApi.processPayment(bookingData.bookingId, {
        paymentMethod: paymentMethod === 'BANK_TRANSFER' ? 'VNPAY' : 'CASH', pointsUsed: 0, customerId: null,
      });
      if (!active.current) { popup?.close(); return; }
      if (!popup) { finish(result); return; }
      if (!result.paymentUrl) throw new Error('Không nhận được địa chỉ thanh toán VNPAY.');
      popup.location.href = result.paymentUrl;
      waiting = true;
      let checking = false;
      const deadline = Date.now() + 5 * 60 * 1000;
      const checkPayment = async () => {
        if (checking || !active.current) return;
        checking = true;
        try {
          const status = await posApi.getPaymentStatus(bookingData.bookingId);
          if (!active.current) return;
          if (status.paymentStatus === 'SUCCESS' && status.bookingStatus === 'COMPLETED') {
            popup.close(); finish(status); return;
          }
          if (status.paymentStatus === 'FAILED' || status.paymentStatus === 'REFUND_PENDING' || status.bookingStatus === 'CANCELLED') {
            clearInterval(pollRef.current); pollRef.current = null; popup.close(); setProcessing(false);
            showToast('Đơn chưa được thanh toán thành công hoặc đã hết hạn. Vui lòng kiểm tra lại giao dịch.', 'error'); return;
          }
          if (popup.closed || Date.now() >= deadline) {
            clearInterval(pollRef.current); pollRef.current = null; setProcessing(false);
            showToast('Chưa nhận được xác nhận thanh toán. Vui lòng kiểm tra lại giao dịch trước khi in vé.', 'error');
          }
        } catch {
          if (popup.closed || Date.now() >= deadline) {
            clearInterval(pollRef.current); pollRef.current = null;
            if (active.current) { setProcessing(false); showToast('Không thể kiểm tra thanh toán. Vui lòng thử lại.', 'error'); }
          }
        } finally { checking = false; }
      };
      pollRef.current = setInterval(checkPayment, 1000);
    } catch (error) {
      popup?.close();
      if (active.current) showToast(error.response?.data?.message || error.message || 'Lỗi thanh toán', 'error');
    } finally { if (!waiting && active.current) setProcessing(false); }
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
              <span className="font-bold">VNPAY</span>
            </div>
          </div>

          {paymentMethod === 'BANK_TRANSFER' && (
            <div className="mt-4 flex flex-col border-t border-white/10 pt-2">
              <label className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="subMethod"
                  checked readOnly
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

    </div>
  );
}
