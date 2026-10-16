import { LOGO_URL } from '../../../../shared/constants/brand';

const FILTER_GROUPS = {
  status: ['Phim đang chiếu', 'Phim sắp chiếu', 'Vé bán trước'],
  genres: [
    { icon: 'swords', label: 'Hành động' },
    { icon: 'rocket_launch', label: 'Sci-Fi' },
    { icon: 'skull', label: 'Kinh dị' },
    { icon: 'theater_comedy', label: 'Hài kịch' },
    { icon: 'favorite', label: 'Tình cảm' },
    { icon: 'animation', label: 'Hoạt hình' },
  ],
  countries: ['Âu Mỹ', 'Hàn Quốc', 'Việt Nam', 'Nhật Bản', 'Trung Quốc', 'Thái Lan'],
};

export default function MovieFilterPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <section className="w-full border-b border-white/10 bg-[#201f1f]/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
      <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-8 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col md:flex-row gap-6 md:gap-10 md:justify-between">
          <div className="md:w-48">
            <h5 className="text-white font-bold text-sm mb-5 flex items-center gap-2 border-b border-white/10 pb-2 uppercase tracking-wider">
              TRẠNG THÁI
            </h5>
            <ul className="flex flex-col gap-4">
              {FILTER_GROUPS.status.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="w-full text-left text-[#6B6B6B] hover:text-[#ffb2ba] transition-colors text-sm flex items-center justify-between group/link"
                    onClick={onClose}
                  >
                    {item}
                    <span className="material-symbols-outlined text-[14px] opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all">
                      chevron_right
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1">
            <h5 className="text-white font-bold text-sm mb-5 flex items-center gap-2 border-b border-white/10 pb-2 uppercase tracking-wider">
              THỂ LOẠI
            </h5>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-4">
              {FILTER_GROUPS.genres.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className="text-[#6B6B6B] hover:text-white hover:pl-1 transition-all text-sm flex items-center gap-2"
                    onClick={onClose}
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#ffb2ba]/50">
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1">
            <h5 className="text-white font-bold text-sm mb-5 flex items-center gap-2 border-b border-white/10 pb-2 uppercase tracking-wider">
              QUỐC GIA
            </h5>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-4">
              {FILTER_GROUPS.countries.map((country) => (
                <li key={country}>
                  <button
                    type="button"
                    className="text-[#6B6B6B] hover:text-white hover:pl-1 transition-all text-sm"
                    onClick={onClose}
                  >
                    {country}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5 lg:pl-4 lg:border-l border-white/10 flex items-center">
          <div className="group relative w-full overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(255,46,99,0.22),_transparent_34%),linear-gradient(135deg,_rgba(34,34,34,0.98)_0%,_rgba(19,19,19,0.98)_55%,_rgba(10,10,10,0.98)_100%)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_10%,rgba(255,255,255,0.08)_35%,transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative z-10 flex items-start justify-between gap-3 mb-6">
              <div>
                <span className="inline-flex items-center rounded-full border border-[#ff2e63]/30 bg-[#ff2e63]/15 px-3 py-1 text-[10px] font-bold tracking-[0.28em] text-[#ff9ab2]">
                  FEATURED DEAL
                </span>
                <h4 className="mt-4 text-2xl font-bold text-white leading-tight">
                  Ưu đãi thành viên <span className="text-[#ff6b91]">mỗi tuần tại GinFilm</span>
                </h4>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#ff7d9f] shadow-[0_8px_24px_rgba(255,46,99,0.18)]">
                <span className="material-symbols-outlined text-[16px]">local_activity</span>
              </div>
            </div>

            <div className="relative z-10 mb-6 rounded-[20px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-sm">
              <div className="absolute inset-y-4 left-0 w-1 rounded-full bg-gradient-to-b from-[#ff2e63] via-[#ff7d9f] to-transparent" />
              <p className="pl-4 text-sm leading-6 text-[#c7c6c6]">
                Nhận combo bắp nước, giảm giá vé online và ưu tiên suất chiếu hot khi đăng nhập tài khoản thành viên.
              </p>
            </div>

            <div className="relative z-10 flex items-end justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-2 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
                  <img
                    alt="GinFilm Logo"
                    className="h-12 w-auto max-w-none object-contain transition-transform duration-500 group-hover:scale-105"
                    src={LOGO_URL}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b8b8b]">Member Pass</p>
                  <p className="mt-1 whitespace-nowrap text-sm font-semibold text-white">Kích hoạt quyền lợi ngay</p>
                </div>
              </div>

              <button
                type="button"
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#ff2e63] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(255,46,99,0.28)] transition-all duration-300 hover:bg-[#ff4d7d] hover:gap-3"
                onClick={onClose}
              >
                Xem ngay
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
