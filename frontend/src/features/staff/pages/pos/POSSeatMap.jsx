import { useState, useMemo } from "react";
import { useShowSeats } from '../../../user/hooks/useShowSeats';
import SeatMatrix from '../../../user/components/booking/SeatMatrix';
import { PRICES, getSeatType } from '../../../user/components/booking/seatUtils';
import SeatLegend from '../../../user/components/booking/SeatLegend';
import { useToastStore } from '../../../user/store/toastStore';
import { posApi } from '../../api/posApi';

export default function POSSeatMap({ showtimeData, onNext, onBack }) {
  const { show, rows, seatMap, loading, error } = useShowSeats(showtimeData.showtimeId);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const showToast = useToastStore(s => s.showToast);
  const [holding, setHolding] = useState(false);

  // Ghế đã bán hoặc đang giữ
  const occupiedIds = useMemo(() => {
    const set = new Set();
    if (!rows) return set;
    rows.forEach(row => {
      row.seats.forEach(seat => {
        if (seat.status === 'RESERVED' || seat.status === 'BOOKED' || seat.status === 'BROKEN' || seat.status === 'SOLD') {
          set.add(`${seat.rowSymbol}${seat.seatNumber}`);
        }
      });
    });
    return set;
  }, [rows]);

  const toggleSeat = (seatId) => {
    const seatInfo = seatMap.get(seatId);
    if (!seatInfo) return;

    const isOccupied = occupiedIds.has(seatId) || seatInfo.status === 'BROKEN';
    if (isOccupied) return;

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        if (next.size >= 8) {
          showToast('Chỉ được chọn tối đa 8 ghế.', 'warning');
          return prev;
        }
        next.add(seatId);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    if (selectedIds.size === 0) {
      showToast('Vui lòng chọn ít nhất 1 ghế', 'warning');
      return;
    }

    // Tính tổng tiền vé
    let totalSeatPrice = 0;
    const selectedSeatDetails = [];
    selectedIds.forEach(id => {
      const seatInfo = seatMap.get(id);
      if (seatInfo) {
        const type = getSeatType(seatInfo.seatType);
        const dynamicPrices = show?.prices || PRICES;
        let price = dynamicPrices[type] ?? PRICES[type] ?? PRICES.normal;

        totalSeatPrice += price;
        selectedSeatDetails.push({
          id: seatInfo.id,
          name: id,
          price: price,
          type: seatInfo.seatType
        });
      }
    });

    const seatIdsForApi = selectedSeatDetails.map(s => s.id);

    try {
      setHolding(true);
      const res = await posApi.holdSeats({
        showtimeId: showtimeData.showtimeId,
        seatIds: seatIdsForApi
      });
      // apiPost tự unwrap .data, res là object trực tiếp từ backend
      const bookingId = res?.bookingId ?? res?.id ?? res;
      onNext({
        bookingId,
        selectedSeatDetails,
        totalSeatPrice,
        seatNames: selectedSeatDetails.map(s => s.name).join(', ')
      });
    } catch (err) {
      console.error(err);
      showToast('Không thể giữ ghế. Có thể ghế đã có người đặt.', 'error');
    } finally {
      setHolding(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full h-[calc(100vh-120px)] min-h-[650px]">
      {/* Sơ đồ ghế */}
      <div className="flex-1 flex flex-col bg-[#0b0a0a] rounded-2xl border border-transparent dark:border-white/10 shadow-inner overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/50">
            <div className="w-8 h-8 border-3 border-[#dc2626] border-t-transparent rounded-full animate-spin mr-3" />
            Đang tải sơ đồ ghế...
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-500">Lỗi tải sơ đồ ghế</div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-2 bg-[#18181b]/50 rounded-t-2xl">
              <SeatLegend rows={rows} prices={show?.prices} />
            </div>
            <div className="flex-1 relative bg-black rounded-b-2xl overflow-hidden">
              {/* IMPORTANT: Added show and seatMap props */}
              <SeatMatrix
                rows={rows}
                seatMap={seatMap}
                selectedIds={selectedIds}
                occupiedIds={occupiedIds}
                onToggle={toggleSeat}
                show={show}
                initialScale={1}
                forceInitialScale={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Thông Tin Panel */}
      <div className="w-full lg:w-[320px] bg-[#18181b] rounded-2xl border border-transparent dark:border-white/10 p-5 flex flex-col flex-shrink-0 h-full overflow-y-auto">
        <h3 className="text-lg font-bold text-white border-b border-transparent dark:border-white/10 pb-3 mb-4">Thông Tin Đặt Vé</h3>

        <div className="space-y-4 mb-4">
          <div>
            <p className="text-xs text-white/40 uppercase font-semibold mb-1">Phim / Giờ chiếu</p>
            <p className="font-medium text-white">{showtimeData.movieName}</p>
            <p className="text-[#dc2626] font-bold text-sm mt-0.5">{showtimeData.time}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase font-semibold mb-1">Rạp / Phòng chiếu</p>
            <p className="font-medium text-white">{show?.theaterName || '...'} - {showtimeData.roomName}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase font-semibold mb-1">Ghế đã chọn</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {selectedIds.size > 0 ? (
                Array.from(selectedIds).map(id => (
                  <span key={id} className="bg-[#dc2626]/20 text-[#dc2626] border border-[#dc2626]/30 px-2 py-0.5 rounded text-sm font-bold">
                    {id}
                  </span>
                ))
              ) : (
                <span className="text-white/30 text-sm">Chưa chọn ghế</span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-transparent dark:border-white/10 space-y-2 mt-4">
          <button
            onClick={handleContinue}
            disabled={holding || selectedIds.size === 0}
            className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
              (holding || selectedIds.size === 0)
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-[#dc2626] text-white hover:bg-[#c01d44] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]'
            }`}
          >
            {holding ? 'Đang xử lý...' : 'Tiếp Tục'}
          </button>

          <button
            onClick={onBack}
            disabled={holding}
            className="w-full py-3 rounded-xl font-bold bg-white/5 text-white hover:bg-white/10 transition-colors"
          >
            Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
}
