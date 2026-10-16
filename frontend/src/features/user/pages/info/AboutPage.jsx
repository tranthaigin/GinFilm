import { useEffect } from 'react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

const PROJECT_MAINTAINERS = [
  {
    name: 'Trần Quốc Thái',
    role: 'Người duy trì dự án',
    image: 'https://res.cloudinary.com/sgfguxxl/image/upload/v1782888778/1782887955106_6596229508564929008_g2670441183851459189_7d1b87ce46077365113ac1c6804a86bf_uuawxq.jpg',
    profileUrl: 'https://github.com/tranthaigin',
  }
];

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white font-sans" >
      <Header />

      <main className="flex-1 py-20 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
        {/* Experience Section */}
        <section className="mb-24 text-center">
          <div className="mb-8 flex flex-col items-center justify-center">
            <h2 className="text-sm md:text-base font-bold uppercase tracking-widest text-[#111827] dark:text-white mb-2">
              TRẢI NGHIỆM <span className="text-[#e61a27]">GINFILM</span>
            </h2>
            <div className="h-1 w-12 bg-[#e61a27]"></div>
          </div>

          <p className="max-w-3xl mx-auto text-[13px] md:text-[15px] leading-relaxed text-gray-500 dark:text-[#9D9D9D] mb-16">
            Đắm mình vào sự xuất sắc vô song của điện ảnh. Chúng tôi kết hợp công nghệ tiên tiến
            với sự thoải mái cao cấp để mang đến trải nghiệm xem mô hình kép tối thượng,
            thu hẹp khoảng cách giữa rạp chiếu phim truyền thống và nền tảng trực tuyến.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] p-8 text-center transition-all hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20">
              <div className="mb-6 flex justify-center">
                <span className="material-symbols-outlined text-4xl text-[#e61a27]">4k</span>
              </div>
              <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#111827] dark:text-white">CÔNG NGHỆ ĐIỆN ẢNH</h3>
              <p className="text-[13px] leading-relaxed text-gray-500 dark:text-[#9D9D9D]">
                Hệ thống trình chiếu hiện đại và âm thanh vòm sống động mang mọi khung hình chân thực, kịch tính nhất vào cuộc sống.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] p-8 text-center transition-all hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20">
              <div className="mb-6 flex justify-center">
                <span className="material-symbols-outlined text-4xl text-[#e61a27]">weekend</span>
              </div>
              <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#111827] dark:text-white">GHẾ NGỒI CAO CẤP</h3>
              <p className="text-[13px] leading-relaxed text-gray-500 dark:text-[#9D9D9D]">
                Trải nghiệm những câu chuyện đô thị trong sự thoải mái tuyệt đối với ghế ngồi êm ái, tiện dụng được thiết kế cho thời gian xem kéo dài.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] p-8 text-center transition-all hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20">
              <div className="mb-6 flex justify-center">
                <span className="material-symbols-outlined text-4xl text-[#e61a27]">devices</span>
              </div>
              <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[#111827] dark:text-white">MÔ HÌNH KÉP</h3>
              <p className="text-[13px] leading-relaxed text-gray-500 dark:text-[#9D9D9D]">
                Chọn bối cảnh hoàn hảo cho bạn: bầu không khí vô song của các rạp chiếu phim cao cấp hay sự tiện lợi của nền tảng trực tuyến ưu việt của chúng tôi.
              </p>
            </div>
          </div>
        </section>

        {/* Project Maintainer Section */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase leading-tight text-[#111827] dark:text-white mb-6">
              NGƯỜI DUY TRÌ <span className="text-[#e61a27]">DỰ ÁN</span>
            </h2>
            <p className="max-w-2xl text-[13px] md:text-[15px] leading-relaxed text-gray-500 dark:text-[#9D9D9D]">
              Trần Quốc Thái duy trì và tiếp tục phát triển dự án trong repository cá nhân GinFilm,
              với mục tiêu cải thiện trải nghiệm đặt vé và quản lý hệ thống.
            </p>
          </div>

          <div className="grid max-w-xs grid-cols-1 gap-6">
            {PROJECT_MAINTAINERS.map((member) => (
              <a key={member.name} href={member.profileUrl} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e61a27]">
                <div className="relative mb-4 aspect-[4/5] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] shadow-lg">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80"></div>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[#111827] dark:text-white mb-1">{member.name}</h3>
                <p className="text-sm text-gray-500 transition-colors group-hover:text-[#e61a27] dark:text-[#9D9D9D]">{member.role}</p>
              </a>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
