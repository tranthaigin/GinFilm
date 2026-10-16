
import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../../../../app/routes/paths';
import { ShieldAlert } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-red-900/20 blur-[120px]"></div>
      </div>

      <div className="z-10 flex flex-col items-center text-center max-w-2xl">
        <div className="relative mb-8 text-red-600">
          <ShieldAlert size={120} strokeWidth={1.5} className="drop-shadow-[0_0_30px_rgba(220,38,38,0.4)]" />
        </div>

        <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-800 tracking-tighter mb-2">
          403
        </h1>

        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-zinc-100 uppercase tracking-wide">
          Truy cập bị từ chối
        </h2>

        <p className="text-zinc-400 text-lg md:text-xl mb-10 max-w-lg leading-relaxed font-light">
          Xin lỗi, bạn không có quyền truy cập vào khu vực này. Trang này yêu cầu đặc quyền hệ thống cao hơn tài khoản hiện tại của bạn.
        </p>

        <Link
          to={ROUTE_PATHS.home}
          className="group relative inline-flex items-center justify-center px-8 py-3.5 text-lg font-bold text-white transition-all duration-300 bg-red-600 rounded-full hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 focus:ring-offset-black"
        >
          Trở về trang chủ
          <svg className="w-5 h-5 ml-2 -mr-1 transition-transform duration-200 group-hover:translate-x-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        </Link>
      </div>
    </div>
  );
}
