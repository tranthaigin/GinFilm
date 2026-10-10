import React from 'react';
import { CheckCircle, Printer, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../../../features/user/store/authStore';

const bgSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <g fill="#000000" opacity="0.08">
    <!-- Camera 1 -->
    <g transform="translate(20, 20) rotate(-15) scale(0.6)">
      <rect x="10" y="20" width="30" height="20" rx="3" />
      <polygon points="40,25 55,15 55,45 40,35" />
      <circle cx="18" cy="10" r="7" fill="none" stroke="#000000" stroke-width="4"/>
      <circle cx="32" cy="10" r="7" fill="none" stroke="#000000" stroke-width="4"/>
    </g>
    <!-- Camera 2 -->
    <g transform="translate(100, 90) rotate(10) scale(0.6)">
      <rect x="10" y="20" width="30" height="20" rx="3" />
      <polygon points="40,25 55,15 55,45 40,35" />
      <circle cx="18" cy="10" r="7" fill="none" stroke="#000000" stroke-width="4"/>
      <circle cx="32" cy="10" r="7" fill="none" stroke="#000000" stroke-width="4"/>
    </g>
    <!-- Star 1 -->
    <path transform="translate(110, 20) scale(0.25)" d="M25,1 l7,15 l16,2 l-12,11 l3,16 l-14,-8 l-14,8 l3,-16 l-12,-11 l16,-2 z" />
    <!-- Star 2 -->
    <path transform="translate(30, 110) scale(0.2)" d="M25,1 l7,15 l16,2 l-12,11 l3,16 l-14,-8 l-14,8 l3,-16 l-12,-11 l16,-2 z" />
    <!-- Star 3 -->
    <path transform="translate(80, 70) scale(0.15)" d="M25,1 l7,15 l16,2 l-12,11 l3,16 l-14,-8 l-14,8 l3,-16 l-12,-11 l16,-2 z" />
    <!-- TICKET Text -->
    <text x="50" y="80" font-family="Arial, sans-serif" font-size="22" font-weight="900" transform="rotate(-25, 50, 80)" letter-spacing="1">TICKET</text>
    <text x="130" y="150" font-family="Arial, sans-serif" font-size="16" font-weight="900" transform="rotate(-20, 130, 150)" letter-spacing="1">TICKET</text>
    <!-- RAPLOFILM Logo Text -->
    <text x="10" y="140" font-family="Arial, sans-serif" font-size="20" font-weight="900" transform="rotate(15, 10, 140)">RAPLO</text>
    <text x="90" y="40" font-family="Arial, sans-serif" font-size="18" font-weight="900" transform="rotate(20, 90, 40)">RAPLO</text>
  </g>
</svg>
`);

const ticketStyle = {
  backgroundColor: '#ffffff',
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,${bgSvg}")`,
  backgroundSize: '120px 120px',
  color: '#111',
  width: '80mm',
  minHeight: '130mm',
  padding: '6mm',
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  margin: '0 auto',
  position: 'relative',
  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  borderRadius: '2px',
};

const generateBarcode = (seedStr) => {
  if (!seedStr) seedStr = "RAPLO123456789";
  const bars = [];
  let currentX = 0;
  for (let i = 0; i < 40; i++) {
    const charCode = seedStr.charCodeAt(i % seedStr.length) + i;
    const width = (charCode % 4) + 1;
    const margin = (charCode % 3) + 1;
    bars.push(
      <div
        key={i}
        style={{
          width: `${width}px`,
          backgroundColor: '#111',
          marginLeft: `${margin}px`,
          height: '100%',
          flexShrink: 0
        }}
      />
    );
  }
  return bars;
};

export default function POSReceiptPrinter({ bookingData, onReset }) {
  const user = useAuthStore(state => state.user);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full pt-8 pb-12">
      <div className="w-16 h-16 bg-[#22c55e]/20 rounded-full flex items-center justify-center mb-4 no-print">
        <CheckCircle size={40} className="text-[#22c55e]" />
      </div>

      <h2 className="text-3xl font-black text-white mb-2 no-print">Thanh Toán Thành Công!</h2>
      <p className="text-white/60 mb-8 text-center no-print">Giao dịch đã được ghi nhận. Vui lòng in vé và giao cho khách hàng.</p>

      {/* CGV-style Physical Ticket */}
      <div className="w-full flex justify-center mb-8 relative print:static">
        <div className="receipt-print-area overflow-hidden z-10" style={ticketStyle}>

          <div className="text-center mb-4">
            <h3 className="font-bold text-[18px] tracking-widest leading-tight uppercase">The Vao<br />Phong Chieu Phim</h3>
          </div>

          <div className="text-[11px] leading-[1.4] mb-3 font-medium">
            <div className="font-bold text-[13px] mb-1">Raplofilm Center</div>
            <div>123 Đường chiếu phim, Quận Raplo, TP. Cinema</div>
            <div className="mt-1 uppercase">{bookingData.paymentTime || new Date().toLocaleString('vi-VN')}</div>
            <div className="flex gap-4 mt-1">
              <span>POS: BOX01</span>
              <span>Staff: {user?.fullName?.substring(0, 10).toUpperCase() || 'APP'}</span>
            </div>
          </div>

          <div className="border-t-[1.5px] border-dashed border-[#111] opacity-70 my-3"></div>

          <div className="my-4">
            <div className="font-bold text-[18px] uppercase leading-tight mb-1">
              {bookingData.movieName} <span className="font-normal text-[14px]">[C16]</span>
            </div>
            <div className="text-[13px] mb-1 font-medium uppercase">
              {bookingData.time} • {bookingData.actualRoom || 'Phòng chiếu'}
            </div>
            <div className="font-bold text-[18px] mt-1">
              {bookingData.roomName} <span className="ml-4">{bookingData.seatNames}</span>
            </div>
          </div>

          <div className="border-t-[1.5px] border-dashed border-[#111] opacity-70 my-3"></div>

          <div className="text-[12px] my-4 leading-[1.6] font-medium">
            <div className="font-bold text-[14px] mb-1 uppercase">Adult Standard</div>
            <div className="flex justify-between">
              <span>-Ticket Price</span>
              <span>{bookingData.finalTotal?.toLocaleString('vi-VN')} (bao gom 5% VAT)</span>
            </div>
            <div className="flex justify-between">
              <span>-Service Charge</span>
              <span>0 (bao gom 10% VAT)</span>
            </div>
            <div className="flex justify-between items-end mt-4">
              <span className="font-bold text-[16px] uppercase tracking-wider">VND</span>
              <span className="font-bold text-[22px] tracking-tight">{bookingData.finalTotal?.toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div className="flex h-12 w-full justify-center opacity-90 overflow-hidden px-2">
              {generateBarcode(bookingData.ticketCode)}
            </div>
            <div className="text-[11px] mt-2 tracking-widest font-bold font-mono">
              Sales No. {bookingData.ticketCode || '1234-5678-9012'}
            </div>
          </div>

        </div>
        {/* Shadow layer for screen display only */}
        <div className="absolute inset-0 bg-white/5 blur-xl -z-0 rounded-2xl no-print"></div>
      </div>

      <div className="flex gap-4 w-full max-w-sm no-print">
        <button
          onClick={handlePrint}
          className="flex-1 py-4 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
        >
          <Printer size={20} />
          In Vé Lên Giấy
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-4 bg-[#dc2626] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#c01d44] transition-colors"
        >
          <RotateCcw size={20} />
          Tạo Đơn Mới
        </button>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            margin: 0;
            padding: 0;
            background: none;
          }
          body * {
            visibility: hidden;
          }
          #root {
            display: block !important;
          }
          .receipt-print-area, .receipt-print-area * {
            visibility: visible;
          }
          .receipt-print-area {
            position: fixed !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
            margin: 0 !important;
            padding: 2mm !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 80mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
