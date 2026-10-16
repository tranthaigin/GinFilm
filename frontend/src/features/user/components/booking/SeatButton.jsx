import { LOGO_URL } from '../../../../shared/constants/brand';

export default function SeatButton({ seat, selected, onToggle }) {
  const isOccupied = seat.status === 'occupied';

  if (isOccupied) {
    return (
      <div
        aria-label={`Ghế ${seat.id} đã đặt`}
        className="relative flex h-10 w-10 md:h-11 md:w-11 flex-col items-center justify-center rounded-t-[12px] rounded-b-[6px] bg-black border border-white/10 opacity-70 shadow-inner"
        title={`${seat.id} — Đã đặt`}
      >
        <img alt="" className="h-5 w-5 object-contain opacity-30 grayscale" src={LOGO_URL} />
        <div className="absolute bottom-1.5 h-1 w-[80%] rounded-[4px] bg-white/5"></div>
      </div>
    );
  }

  // Phân loại ghế
  const isVip = seat.type === 'vip';

  let baseClass;
  let cushionClass;
  let backrestClass;
  let textClass;

  if (selected) {
    baseClass = 'bg-[#FF2E63]/10 border-[#FF2E63] scale-[1.05] shadow-[0_0_20px_rgba(255,46,99,0.35)]';
    cushionClass = 'bg-[#FF2E63] shadow-[0_0_10px_rgba(255,46,99,0.5)]';
    backrestClass = 'bg-[#FF2E63]/40 blur-[1px]';
    textClass = 'text-white drop-shadow-[0_2px_4px_rgba(255,46,99,0.8)]';
  } else if (isVip) {
    baseClass = 'bg-[linear-gradient(180deg,#2A2010_0%,#1A1305_100%)] border-[#F5D38A]/30 hover:border-[#F5D38A]/60 hover:shadow-[0_0_15px_rgba(245,211,138,0.2)] hover:-translate-y-0.5';
    cushionClass = 'bg-[#F5D38A]/30';
    backrestClass = 'bg-[#F5D38A]/20 blur-[1px]';
    textClass = 'text-[#F5D38A] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]';
  } else {
    baseClass = 'bg-[#18181b] border-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:-translate-y-0.5';
    cushionClass = 'bg-white/15';
    backrestClass = 'bg-white/10 blur-[1px]';
    textClass = 'text-[#D8D8D8] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]';
  }

  return (
    <button
      aria-label={`Ghế ${seat.id}`}
      aria-pressed={selected}
      className={`group relative flex h-10 w-10 md:h-11 md:w-11 flex-col items-center justify-between rounded-t-[12px] rounded-b-[6px] border p-1.5 transition-all duration-300 ${baseClass}`}
      onClick={() => onToggle(seat.id)}
      type="button"
    >
      {/* Vị trí tựa lưng (Backrest glow) */}
      <div className={`h-1.5 w-[65%] rounded-full transition-colors ${backrestClass}`}></div>

      {/* Chữ số ghế */}
      <span className={`absolute inset-0 flex items-center justify-center text-[10px] md:text-[11px] font-bold tracking-[0.08em] ${textClass}`}>
        {seat.id}
      </span>

      {/* Phần nệm ngồi (Cushion) */}
      <div className={`h-1.5 w-[90%] rounded-[4px] transition-colors ${cushionClass}`}></div>
    </button>
  );
}
