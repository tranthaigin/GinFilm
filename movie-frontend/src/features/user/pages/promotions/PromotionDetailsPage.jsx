import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import ROUTE_PATHS from '../../../../app/routes/paths';
import { getPromotionById } from '../../api/services/promotionService';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const statusConfig = {
  active: { label: 'Đang diễn ra', bg: 'bg-[#10b981]', border: 'border-[#10b981]/50' },
  upcoming: { label: 'Sắp diễn ra', bg: 'bg-[#3b82f6]', border: 'border-[#3b82f6]/50' },
  ended: { label: 'Đã kết thúc', bg: 'bg-[#6b7280]', border: 'border-[#6b7280]/50' },
};

export default function PromotionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promo, setPromo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPromo = async () => {
      try {
        setLoading(true);
        const data = await getPromotionById(id);
        if (data) {
          setPromo(data);
        } else {
          navigate(ROUTE_PATHS.offers);
        }
      } catch (error) {
        console.error('Lỗi khi tải chi tiết ưu đãi:', error);
        navigate(ROUTE_PATHS.offers);
      } finally {
        setLoading(false);
      }
    };
    fetchPromo();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white font-sans">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center py-24">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#e61a27] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-500 dark:text-[#9D9D9D]">Đang tải chi tiết ưu đãi...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!promo) return null;

  const status = statusConfig[promo.status] || statusConfig['active'];
  const dateRangeText = promo.startDate && promo.end ? `${formatDate(promo.startDate)} - ${formatDate(promo.end)}` : '';

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black text-[#111827] dark:text-white font-sans selection:bg-red-500/30">
      <Header />
      
      {/* Background visual glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-800/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#00f3ff]/3 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <main className="flex-1 py-12 px-4 md:px-8 max-w-[1440px] mx-auto w-full relative z-10">
        
        {/* Navigation Header Row */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-[#e61a27]">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-[#111827] dark:text-white">
            CHI TIẾT KHUYẾN MÃI
          </h2>
          <button 
            onClick={() => navigate(ROUTE_PATHS.offers)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[#111827] dark:text-[#aaa] hover:text-[#e50914] dark:hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 hover:shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all font-bold text-[14px] whitespace-nowrap shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Quay lại
          </button>
        </div>

        {/* Main Details Card */}
        <div className="bg-white dark:bg-[#111112]/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.06] rounded-[32px] overflow-hidden shadow-xl dark:shadow-[0_24px_64px_rgba(0,0,0,0.8)]">
          
          {/* Full-width Banner Container */}
          <div className="w-full relative h-[320px] md:h-[460px] lg:h-[500px] overflow-hidden bg-[#18181b] dark:bg-black group/banner border-b border-gray-200 dark:border-white/[0.04]">
            <img 
              src={promo.imageUrl} 
              alt={promo.title} 
              className="w-full h-full object-cover group-hover/banner:scale-105 transition-transform duration-1000 ease-out" 
            />
            {/* Subtle gradient overlay to blend with the background below */}
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#111112] via-transparent to-transparent opacity-30 pointer-events-none"></div>
          </div>
          
          {/* Detail Container */}
          <div className="p-8 md:p-12">
            {/* Status Tag inline */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`inline-flex items-center gap-2 ${status.bg} text-white px-4.5 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] md:text-xs shadow-md border ${status.border}`}>
                <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse"></span>
                {status.label}
              </span>
            </div>

            {/* Title with Outfit-like heavy weight styling */}
            <h1 className="text-2xl md:text-[38px] font-black uppercase tracking-wide mb-8 leading-[1.15] text-[#111827] dark:text-white break-words" title={promo.title}>
              {promo.title}
            </h1>
            
            {/* Styled Metadata pills */}
            <div className="flex flex-wrap gap-4 mb-10 pb-8 border-b border-gray-200 dark:border-white/[0.06]">
              {promo.discount > 0 && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-2xl text-[10px] md:text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 shadow-[0_0_15px_rgba(230,26,39,0.1)]">
                  <span className="material-symbols-outlined text-[#e61a27] text-[18px]">loyalty</span>
                  <span>Mức giảm:</span>
                  <span className="text-[#111827] dark:text-white font-bold text-sm md:text-base">{promo.discount}%</span>
                </div>
              )}

              {promo.minOrderValue > 0 && (
                <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 rounded-2xl text-[10px] md:text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  <span className="material-symbols-outlined text-blue-500 text-[18px]">shopping_cart_checkout</span>
                  <span>
                    {promo.scope === 'TICKET_ONLY' ? 'Tiền Vé tối thiểu:' :
                     promo.scope === 'COMBO_ONLY' ? 'Bắp nước tối thiểu:' : 'Đơn tối thiểu:'}
                  </span>
                  <span className="text-[#111827] dark:text-white font-bold text-sm md:text-base">{promo.minOrderValue.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              
              <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2.5 rounded-2xl text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-[#9D9D9D]">
                <span className="material-symbols-outlined text-[#e61a27] text-[18px]">calendar_month</span>
                <span>Thời gian:</span>
                <span className="text-[#111827] dark:text-white font-bold">{dateRangeText}</span>
              </div>
              
              <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2.5 rounded-2xl text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-[#9D9D9D]">
                <span className="material-symbols-outlined text-[#e61a27] text-[18px]">location_on</span>
                <span>Áp dụng:</span>
                <span className="text-[#111827] dark:text-white font-bold">Toàn quốc</span>
              </div>
            </div>

            {/* Description Details content layout */}
            <div className="max-w-none text-gray-700 dark:text-[#9D9D9D]">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#e61a27] mb-4.5 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#e61a27] rounded-sm"></span>
                NỘI DUNG CHI TIẾT
              </h3>
              
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed mb-10 text-gray-700 dark:text-[#9D9D9D] font-normal">
                {promo.description?.replace(/(?:\r?\n\s*){2,}/g, '\n\n')}
              </div>
            </div>

            {/* Bottom Call to Action for extra Premium vibe */}
            <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-white/[0.04]">
              <button
                onClick={() => navigate(ROUTE_PATHS.nowShowing || '/movies/now-showing')}
                className="px-8 py-4 bg-[#e61a27] hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 shadow-[0_8px_24px_rgba(230,26,39,0.35)] hover:shadow-[0_12px_32px_rgba(230,26,39,0.55)] hover:-translate-y-0.5 select-none"
              >
                ĐẶT VÉ NGAY BÂY GIỜ
              </button>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
