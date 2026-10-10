import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { getAllGenres } from '../../api/services/genreService';
import { useToastStore } from '../../store/toastStore';

const SOCIAL_LINKS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61591244014289',
    icon: (
      <svg fill="#1877F2" height="20" viewBox="0 0 24 24" width="20">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    icon: (
      <svg height="20" viewBox="0 0 24 24" width="20">
        <defs>
          <linearGradient id="footer-ig-grad-flat" x1="0%" x2="100%" y1="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#FCAF45' }} />
            <stop offset="50%" style={{ stopColor: '#FD1D1D' }} />
            <stop offset="100%" style={{ stopColor: '#833AB4' }} />
          </linearGradient>
        </defs>
        <path
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
          fill="url(#footer-ig-grad-flat)"
        />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com',
    icon: (
      <svg fill="#FF0000" height="20" viewBox="0 0 24 24" width="20">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com',
    icon: (
      <svg height="20" viewBox="0 0 24 24" width="20">
        <path
          d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-1.01V14.9c.03 2.34-.74 4.61-2.21 6.41-1.56 1.92-3.95 3.12-6.37 3.13-2.36.02-4.72-.91-6.34-2.63C.3 20.17-.38 17.25.21 14.5c.54-2.51 2.38-4.73 4.77-5.67 1.03-.4 2.14-.56 3.25-.48v4.01c-.97-.11-1.97.06-2.85.51-1.15.57-1.93 1.73-2.04 3.01-.13 1.48.63 2.93 1.86 3.75.81.54 1.79.78 2.76.73 1.2-.02 2.35-.54 3.13-1.45.61-.73.94-1.66.93-2.61V.02z"
          className="fill-black dark:fill-white"
        />
      </svg>
    ),
  },
];


const QUICK_LINKS = [
  { label: 'Về chúng tôi', to: '/about' },
  { label: 'Điều khoản dịch vụ', to: '/info?tab=terms' },
  { label: 'Chính sách bảo mật', to: '/info?tab=privacy' },
];

export default function Footer() {
  const [genresList, setGenresList] = useState([]);
  const [email, setEmail] = useState('');
  const showToast = useToastStore((state) => state.showToast);

  const handleSubscribe = () => {
    if (!email) {
      showToast('Vui lòng nhập email của bạn', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Email không hợp lệ', 'error');
      return;
    }
    showToast('Đăng ký nhận tin thành công!', 'success');
    setEmail('');
  };

  useEffect(() => {
    getAllGenres()
      .then((data) => setGenresList(data))
      .catch((err) => console.error('Failed to load footer genres', err));
  }, []);

  const displayGenres = genresList.slice(0, 8);

  return (
    <footer className="mt-auto w-full border-t border-[#E5E7EB] dark:border-white/10 bg-white/80 dark:bg-[#141414]/70 backdrop-blur-3xl text-[#111827] dark:text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-12 border-b border-[#E5E7EB] dark:border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 xl:gap-16">

          {/* CỘT 1: THƯƠNG HIỆU */}
          <div className="flex flex-col gap-6">
            <BrandLogo className="h-8 w-auto" variant="footer" />
            <p className="text-[14px] leading-relaxed text-[#6B7280] dark:text-[#9D9D9D] pr-4">
              Không chỉ là xem phim — RapLoFilm mang đến trải nghiệm điện ảnh hiện đại, đặt vé tiện lợi và nhiều ưu đãi hấp dẫn mỗi tuần.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((item) => (
                <a
                  key={item.label}
                  aria-label={item.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6] dark:bg-white/5 border border-[#E5E7EB] dark:border-white/10 transition-all hover:bg-[#E5E7EB] dark:hover:bg-white/10 hover:-translate-y-1"
                  href={item.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {/* CỘT 2: CHĂM SÓC KHÁCH HÀNG */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#111827] dark:text-white mb-6">
              Chăm sóc khách hàng
            </h4>
            <div className="flex flex-col gap-5 text-[14px] text-[#6B7280] dark:text-[#9D9D9D]">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] text-[#e61a27]">call</span>
                <div>
                  <p className="text-[#111827] dark:text-white font-medium">0386 087 113</p>
                  <p className="text-[12px] mt-0.5">Hotline hỗ trợ 24/7</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] text-[#e61a27]">mail</span>
                <div>
                  <a href="mailto:raplofilm.official@gmail.com" className="text-[#111827] dark:text-white font-medium hover:text-[#e61a27] transition-colors">raplofilm.official@gmail.com</a>
                  <p className="text-[12px] mt-0.5">Hỗ trợ qua Email</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px] text-[#e61a27]">location_on</span>
                <div>
                  <p className="text-[#111827] dark:text-white font-medium">123 Nguyễn Trãi, Q.1</p>
                  <p className="text-[12px] mt-0.5">TP. Hồ Chí Minh</p>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT 3: KHÁM PHÁ */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#111827] dark:text-white mb-6">
              Thể loại nổi bật
            </h4>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              {displayGenres.map((genre) => (
                <Link
                  key={genre.id}
                  className="text-[14px] text-[#6B7280] dark:text-[#9D9D9D] transition-colors hover:text-[#111827] dark:hover:text-white whitespace-nowrap"
                  to={`/genres/${genre.id}`}
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </div>

          {/* CỘT 4: NHẬN TIN TỨC */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#111827] dark:text-white mb-6">
              Cập nhật thông tin
            </h4>
            <p className="text-[14px] leading-relaxed text-[#6B7280] dark:text-[#9D9D9D] mb-6">
              Nhận lịch chiếu mới, khuyến mãi nổi bật và tin điện ảnh mới nhất từ RapLoFilm.
            </p>
            <div className="flex overflow-hidden rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-[#FFFFFF] dark:bg-[#1a1a1c] transition-colors focus-within:border-[#e61a27]/50">
              <input
                className="h-[46px] w-full bg-transparent px-4 text-[13px] text-[#111827] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-[#9D9D9D] outline-none"
                placeholder="Nhập email của bạn"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
              />
              <button
                onClick={handleSubscribe}
                className="bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(127,29,29,0.95))] px-6 text-[13px] font-bold uppercase tracking-wider text-white transition-all hover:brightness-110">
                Đăng ký
              </button>
            </div>
            <div className="mt-6 flex flex-wrap lg:flex-nowrap gap-2 text-[10px] text-[#71717a] xl:text-[11px] xl:gap-3">
              {QUICK_LINKS.map((link) => (
                <Link key={link.label} className="transition-colors hover:text-[#111827] dark:hover:text-white whitespace-nowrap" to={link.to}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* BẢN QUYỀN */}
        <div className="flex flex-col gap-4 pt-8 text-[13px] text-[#71717a] md:flex-row md:items-center md:justify-between">
          <div>© 2026 RapLoFilm Premium Cinemas. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <span>Trải nghiệm rạp chiếu</span>
            <span className="h-1 w-1 rounded-full bg-[#71717a]"></span>
            <span>Đặt vé nhanh chóng</span>
            <span className="h-1 w-1 rounded-full bg-[#71717a]"></span>
            <span>Không gian hiện đại</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
