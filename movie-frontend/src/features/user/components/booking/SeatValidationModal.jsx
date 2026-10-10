import { useEffect } from 'react';

export default function SeatValidationModal({ isOpen, message, onClose }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop blur effect */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Content - Glassmorphism style */}
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-[24px] border border-white/20 bg-white/10 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 10px 40px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Decorative reflection/shattered lines for the "vỡ kính" feel */}
        <div className="pointer-events-none absolute -left-[50%] -top-[50%] h-[200%] w-[200%] bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_40%,rgba(255,255,255,0)_100%)] rotate-[30deg] translate-x-[-10%] translate-y-[-10%] mix-blend-overlay"></div>
        <div className="pointer-events-none absolute top-0 left-0 w-full h-full border-[1.5px] border-white/20 rounded-[24px] opacity-50 [mask-image:linear-gradient(to_bottom_right,black,transparent)]"></div>
        <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-br from-white/10 to-transparent"></div>

        {/* "Shattered" geometric accents */}
        <svg className="absolute top-0 right-0 w-32 h-32 text-white/5 pointer-events-none -translate-y-1/2 translate-x-1/3" viewBox="0 0 100 100">
          <polygon points="50,0 100,50 50,100 0,50" fill="currentColor" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-24 h-24 text-white/10 pointer-events-none translate-y-1/3 -translate-x-1/4" viewBox="0 0 100 100">
          <polygon points="0,0 100,0 0,100" fill="currentColor" />
        </svg>
        <svg className="absolute top-1/2 left-0 w-16 h-16 text-white/5 pointer-events-none -translate-y-1/2 -translate-x-1/2 rotate-45" viewBox="0 0 100 100">
          <polygon points="20,0 100,20 80,100 0,80" fill="currentColor" />
        </svg>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1),inset_0_0_10px_rgba(255,255,255,0.2)]">
            <span className="material-symbols-outlined text-3xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">info</span>
          </div>

          <h3 className="mb-2 text-[22px] font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70 drop-shadow-sm">Lỗi Chọn Ghế</h3>
          <p className="mb-8 text-[15px] text-[#e4e4e7] font-medium leading-relaxed drop-shadow-md">
            {message}
          </p>

          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#e61a27] to-[#ff4d5a] py-3 text-[15px] font-bold text-white shadow-[0_4px_15px_rgba(230,26,39,0.4)] transition-all duration-300 hover:shadow-[0_6px_20px_rgba(230,26,39,0.6)] active:scale-95 hover:brightness-110"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
