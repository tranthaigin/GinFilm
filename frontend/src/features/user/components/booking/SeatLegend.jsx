import { LOGO_URL as SoldSeatLogo } from '../../../../shared/constants/brand';
import { PRICES, getSeatType } from './seatUtils';
import { useMemo } from 'react';

export default function SeatLegend({ prices = null, rows = [] }) {
  const displayPrices = prices || PRICES;

  const availableTypes = useMemo(() => {
    if (!rows || rows.length === 0) return new Set(['normal', 'vip', 'couple', 'bed']);
    const types = new Set();
    rows.forEach(r => {
      r.seats?.forEach(s => {
        if (s.seatType) types.add(getSeatType(s.seatType));
      });
    });
    return types;
  }, [rows]);

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-5 p-4 border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#18181b] rounded-xl max-w-4xl w-full mx-auto text-[#111827] dark:text-[#9D9D9D] font-medium dark:font-normal text-[13px]">
      {availableTypes.has('normal') && (
        <div className="flex items-center gap-2">
          <div className="relative w-[32px] h-[22px] rounded-[5px] border border-solid border-[1.5px] border-green-500/50 bg-white dark:bg-black text-[#22c55e] overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-[#22c55e] opacity-30 border-t border-[#22c55e]" />
          </div>
          <span>Thường <span className="text-[#555]">({displayPrices.normal?.toLocaleString('vi-VN') ?? '75.000'}đ)</span></span>
        </div>
      )}

      {availableTypes.has('vip') && (
        <div className="flex items-center gap-2">
          <div className="relative w-[32px] h-[22px] rounded-[5px] border border-solid border-[1.5px] border-red-500/50 bg-white dark:bg-black overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-[#ef4444] opacity-30 border-t border-[#ef4444]" />
          </div>
          <span>VIP <span className="text-[#555]">({displayPrices.vip?.toLocaleString('vi-VN') ?? '90.000'}đ)</span></span>
        </div>
      )}

      {availableTypes.has('couple') && (
        <div className="flex items-center gap-2">
          <div className="relative h-[22px] w-[76px] rounded-t-[10px] rounded-b-[4px] border border-solid border-[1.5px] border-pink-500/60 bg-pink-50/50 dark:bg-black shadow-[inset_0_0_5px_rgba(236,72,153,0.12)] overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-[#ec4899] opacity-30 border-t border-[#ec4899]" />
          </div>
          <span>Đôi <span className="text-[#555]">({displayPrices.couple?.toLocaleString('vi-VN') ?? '120.000'}đ)</span></span>
        </div>
      )}

      {availableTypes.has('bed') && (
        <div className="flex items-center gap-2">
          <div className="relative w-[32px] h-[22px] rounded-[5px] border border-solid border-[1.5px] border-amber-500/55 bg-amber-50/50 dark:bg-black shadow-[inset_0_-4px_0_rgba(245,158,11,0.7)] overflow-hidden"></div>
          <span>Giường nằm <span className="text-[#555]">({displayPrices.bed ? displayPrices.bed.toLocaleString('vi-VN') : '150.000'}đ)</span></span>
        </div>
      )}

      {/* Đã đặt */}
      <div className="flex items-center gap-2">
        <div className="relative w-[32px] h-[22px] rounded-[5px] border border-solid border-[1.5px] border-gray-300 dark:border-[#333] bg-gray-200 dark:bg-[#2A2A2A] flex items-center justify-center overflow-hidden">
          <img src={SoldSeatLogo} alt="Sold" className="w-[90%] h-[90%] object-contain opacity-90" width="192" height="192" />
        </div>
        <span>Đã đặt</span>
      </div>
    </div>
  );
}
