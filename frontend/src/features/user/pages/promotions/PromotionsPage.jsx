import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UserPagination from '../../components/UserPagination';
import ROUTE_PATHS from '../../../../app/routes/paths';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { getPromotions } from '../../api/services/promotionService';
import { getTicketPrices } from '../../api/services/ticketPriceService';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// ─── Helpers cho labels ────────────────────────────────────────────
const ROOM_TYPE_LABELS = {
  LO_RAP: { label: 'LORAP', icon: 'movie' },
  LO_BED: { label: 'LOBED', icon: 'bed' },
  LO_SCREEN_X: { label: 'LOSCREENX', icon: 'panorama_horizontal' },
};

const DAY_TYPE_LABELS = {
  WEEKDAY: 'Thứ 2 – Thứ 5',
  WEEKEND: 'Thứ 6 – Chủ Nhật',
  HOLIDAY: 'Ngày Lễ',
};

const AUDIENCE_TYPE_LABELS = {
  ADULT: 'Người lớn',
  STUDENT: 'HS/SV',
  CHILD: 'Trẻ em',
  SENIOR: 'Người cao tuổi',
};

const SEAT_TYPE_LABELS = {
  NORMAL: 'Thường',
  VIP: 'VIP',
  SWEETBOX: 'Ghế đôi',
  ONLINE: 'Online',
};

const AUDIENCE_COLORS = {
  ADULT: 'text-gray-900 dark:text-white',
  STUDENT: 'text-[#60a5fa]', // Light Blue
  CHILD: 'text-[#fbbf24]', // Yellow/Amber
  SENIOR: 'text-[#a855f7]', // Purple
};

const SEAT_COLORS = {
  NORMAL: 'text-[#22c55e]',
  VIP: 'text-[#ef4444]',
  SWEETBOX: 'text-[#ec4899]',
  ONLINE: 'text-gray-500 dark:text-[#9D9D9D]',
};

const SEAT_ORDER = { NORMAL: 1, VIP: 2, SWEETBOX: 3 };

const formatPrice = (price) =>
  price != null ? Number(price).toLocaleString('vi-VN') + 'đ' : '—';

/**
 * Nhóm mảng ticketPrices theo roomType.
 * Kết quả: { LO_RAP: [...], LO_BED: [...], LO_SCREEN_X: [...] }
 */
function groupByRoom(prices) {
  return prices.reduce((acc, item) => {
    const r = item.roomType;
    if (!acc[r]) acc[r] = [];
    acc[r].push(item);
    return acc;
  }, {});
}

// Mock ticket prices fallback generator removed

export default function PromotionsPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'promotions';
  const [promotionsList, setPromotionsList] = useState([]);
  const [promotionsError, setPromotionsError] = useState('');
  const [, setLoading] = useState(true);
  const [ticketPrices, setTicketPrices] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState(null);
  const itemsPerPage = 4;

  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  const fallbackBanners = [
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1200&auto=format&fit=crop',
  ];

  const promoImages = promotionsList.map((p) => p.imageUrl).filter(Boolean);
  const bannerImages = promoImages.length > 0 ? promoImages : fallbackBanners;

  useEffect(() => {
    if (activeTab !== 'pricing' || bannerImages.length === 0) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % bannerImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab, bannerImages.length]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPromotions = () => {
      setLoading(true);
      setPromotionsError('');
      return getPromotions()
        .then((data) => {
          const sortedData = Array.isArray(data)
            ? [...data].sort((a, b) => b.id - a.id)
            : data;
          setPromotionsList(sortedData);
        })
        .catch((error) => {
          console.error('Lỗi khi tải danh sách ưu đãi:', error);
          setPromotionsError(
            'Không thể tải danh sách ưu đãi. Vui lòng kiểm tra kết nối mạng.'
          );
        })
        .finally(() => {
          setLoading(false);
        });
    };
    fetchPromotions();
  }, []);

  useEffect(() => {
    if (activeTab !== 'pricing') return;
    const fetchPrices = () => {
      setPricesLoading(true);
      setPricesError(null);
      return getTicketPrices()
        .then((data) => {
          const active = Array.isArray(data)
            ? data.filter((p) => p.status === 'ACTIVE')
            : [];
          setTicketPrices(active);
        })
        .catch((err) => {
          console.error('Lỗi khi tải giá vé:', err);
          setPricesError('Không thể tải bảng giá vé.');
          setTicketPrices([]);
        })
        .finally(() => {
          setPricesLoading(false);
        });
    };
    fetchPrices();
  }, [activeTab]);

  const totalPages = Math.ceil(promotionsList.length / itemsPerPage);

  const currentPromotions = promotionsList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black selection:bg-red-500/30 text-[#111827] dark:text-white font-sans">
      <Header />

      <main className="flex-1">
        {/* Banner Section */}
        <section className="relative h-[250px] md:h-[350px] w-full flex flex-col items-center justify-center overflow-hidden bg-[#FAFAFA] dark:bg-black">
          <style>{`
            @keyframes scrollBanner {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-banner-scroll {
              animation: scrollBanner 40s linear infinite;
              display: flex;
              width: max-content;
            }
          `}</style>

          {/* Scrolling Banner Background */}
          {bannerImages.length > 0 && (
            <div className="absolute inset-0 z-0 opacity-70 dark:opacity-80 overflow-hidden flex flex-col justify-center pointer-events-none filter blur-[1px] scale-105">
              <div className="animate-banner-scroll gap-4 px-2 items-center">
                {Array.from({ length: 30 })
                  .map((_, i) => bannerImages[i % bannerImages.length])
                  .map((imgUrl, i) => (
                    <div
                      key={i}
                      className="h-[280px] md:h-[400px] aspect-[2/3] shrink-0 rounded-lg overflow-hidden shadow-lg opacity-100"
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Overlay Gradients to blend banner */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#FAFAFA]/80 via-white/10 to-[#FAFAFA] dark:from-black/85 dark:via-black/10 dark:to-black"></div>
          <div className="absolute inset-0 z-10 bg-white/10 dark:bg-black/20"></div>

          <div className="relative z-20 text-center px-4 flex flex-col items-center justify-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tight mb-4 flex items-center justify-center gap-3 md:gap-5">
              <span className="text-[#ffb700] drop-shadow-[0_4px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_0_30px_rgba(255,183,0,0.8)]">
                TIN MỚI
              </span>
              <span className="text-[#111827] dark:text-white drop-shadow-[0_4px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">
                &
              </span>
              <span className="text-[#ff0055] drop-shadow-[0_4px_8px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_0_30px_rgba(255,0,85,0.8)]">
                ƯU ĐÃI
              </span>
            </h1>
            <div className="mt-2">
              <p className="text-sm md:text-lg text-[#111827] dark:text-white font-bold tracking-wide drop-shadow-sm">
                Cập nhật những chương trình khuyến mãi và giá vé hấp dẫn nhất từ{' '}
                <span className="text-[#111827] dark:text-white">Gin</span>
                <span className="text-[#dc2626]">Film</span>
              </p>
            </div>
          </div>
        </section>

        {/* Toggle Ribbon */}
        <div className="flex justify-center mt-8 relative z-30 mb-8">
          <div className="relative flex justify-center">
            <div className="relative z-10 bg-[#e50914] text-white px-12 py-3 font-bold text-[15px] flex items-center gap-2 shadow-[0_10px_20px_rgba(229,9,20,0.3)]">
              <span className="material-symbols-outlined text-[20px]">
                local_activity
              </span>
              <button
                onClick={() => {
                  setSearchParams({ tab: 'promotions' });
                }}
                className={`uppercase transition-colors hover:text-white ${activeTab === 'promotions' ? 'text-white' : 'text-white/60'}`}
              >
                Ưu đãi
              </button>
              <span className="font-normal mx-2 text-white/50">|</span>
              <button
                onClick={() => {
                  setSearchParams({ tab: 'pricing' });
                }}
                className={`uppercase transition-colors hover:text-white ${activeTab === 'pricing' ? 'text-white' : 'text-white/60'}`}
              >
                Giá vé
              </button>
            </div>
            {/* Ribbon Tails */}
            <div className="absolute top-0 -left-6 border-t-[24px] border-b-[24px] border-r-[24px] border-l-[24px] border-transparent border-r-[#e50914] border-t-[#e50914]"></div>
            <div className="absolute top-0 -right-6 border-t-[24px] border-b-[24px] border-l-[24px] border-r-[24px] border-transparent border-l-[#e50914] border-t-[#e50914]"></div>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-4 md:px-8 py-8">
          {activeTab === 'promotions' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {promotionsError ? (
                <div className="text-center py-20 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-[64px] text-red-500/50 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                    wifi_off
                  </span>
                  <p className="text-[16px] md:text-[18px] text-gray-500 dark:text-[#9D9D9D] font-medium tracking-wide">
                    {promotionsError}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {currentPromotions.map((promo) => (
                      <div
                        key={promo.id}
                        className="group relative flex flex-col bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(230,26,39,0.15)] hover:border-[#e61a27]/30 cursor-pointer"
                        onClick={() =>
                          navigate(ROUTE_PATHS.offers + '/' + promo.id)
                        }
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden bg-[#18181b] relative flex items-center justify-center p-2">
                          {/* Ambient background */}
                          <img
                            src={promo.imageUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex items-center justify-center">
                            <span className="bg-[#e61a27] text-white px-6 py-2.5 rounded-full font-bold uppercase tracking-wide text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-[0_4px_15px_rgba(230,26,39,0.4)]">
                              Xem Chi Tiết
                            </span>
                          </div>

                          {promo.discount > 0 && (
                            <div
                              className="absolute top-[20px] -right-[35px] w-[130px] rotate-45 bg-[#e50914] text-white text-[11px] md:text-[12px] font-black tracking-wider text-center py-1 shadow-[0_3px_10px_rgba(0,0,0,0.6)] z-30 uppercase"
                              style={{
                                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                              }}
                            >
                              GIẢM {promo.discount}%
                            </div>
                          )}

                          <img
                            src={promo.imageUrl}
                            alt={promo.title}
                            className="relative z-10 w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-md"
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?q=80&w=2000&auto=format&fit=crop';
                            }}
                          />
                        </div>

                        <div className="p-5 flex flex-col flex-1 border-t border-gray-200 dark:border-white/10">
                          <h3 className="text-[16px] font-bold text-[#111827] dark:text-white mb-4 line-clamp-2 leading-snug group-hover:text-[#e61a27] transition-colors">
                            {promo.title}
                          </h3>

                          <div className="mt-auto flex items-center gap-2 text-[13px] font-medium text-gray-500 dark:text-[#9D9D9D]">
                            <span className="material-symbols-outlined text-[16px] text-[#e61a27]">
                              calendar_month
                            </span>
                            {promo.startDate && promo.end
                              ? `${formatDate(promo.startDate)} - ${formatDate(promo.end)}`
                              : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <UserPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Pricing Info Section */}
              <div className="mt-4 bg-white dark:bg-black rounded-3xl border border-gray-200 dark:border-white/10 p-8 md:p-12">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wide mb-4">
                    Bảng Giá Vé
                  </h2>
                  <div className="h-1 w-24 bg-[#e61a27] mx-auto rounded-full"></div>
                </div>

                {/* Loading state */}
                {pricesLoading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-[#e61a27]/30 border-t-[#e61a27] rounded-full animate-spin" />
                    <p className="text-gray-500 dark:text-[#9D9D9D] text-sm">
                      Đang tải bảng giá...
                    </p>
                  </div>
                )}

                {/* Error state */}
                {!pricesLoading && pricesError && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <span className="material-symbols-outlined text-[#e61a27] text-[48px]">
                      error_outline
                    </span>
                    <p className="text-gray-500 dark:text-[#9D9D9D] text-base">
                      {pricesError}
                    </p>
                    <button
                      onClick={() => {
                        setSearchParams({ tab: 'pricing' });
                      }}
                      className="mt-2 px-6 py-2 bg-[#e61a27] text-white rounded-full font-bold text-sm hover:bg-[#c71520] transition-colors"
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                {/* No data */}
                {!pricesLoading &&
                  !pricesError &&
                  ticketPrices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <span className="material-symbols-outlined text-gray-600 text-[48px]">
                        local_activity
                      </span>
                      <p className="text-gray-500 dark:text-[#9D9D9D] text-base">
                        Chưa có dữ liệu giá vé.
                      </p>
                    </div>
                  )}

                {/* Prices grid */}
                {!pricesLoading &&
                  !pricesError &&
                  ticketPrices.length > 0 &&
                  (() => {
                    const grouped = groupByRoom(ticketPrices);
                    const roomOrder = ['LO_RAP', 'LO_BED', 'LO_SCREEN_X'];
                    const availableRooms = roomOrder.filter((r) => grouped[r]);

                    const cardTitle = 'Phim Trực Tuyến';
                    const cardDesc =
                      'Thưởng thức hàng trăm tựa phim hấp dẫn ngay tại nhà với các mức giá ưu đãi được cập nhật liên tục.';

                    return (
                      <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
                        {availableRooms.map((roomType) => {
                          const { label, icon } = ROOM_TYPE_LABELS[
                            roomType
                          ] || { label: roomType, icon: 'movie' };
                          const rows = grouped[roomType];

                          // Nhóm theo audienceType -> seatType → dayType
                          const byAudienceAndSeat = rows.reduce((acc, item) => {
                            const aud = item.audienceType;
                            const seat = item.seatType || 'NORMAL';
                            if (!acc[aud]) acc[aud] = {};
                            if (!acc[aud][seat]) acc[aud][seat] = {};
                            acc[aud][seat][item.dayType] = item.price;
                            return acc;
                          }, {});

                          const audienceTypes = Object.keys(byAudienceAndSeat);
                          const dayTypes = [
                            ...new Set(rows.map((r) => r.dayType)),
                          ];

                          return (
                            <div
                              key={roomType}
                              className="bg-white dark:bg-[#18181b] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-white/10 relative overflow-hidden group hover:border-[#e61a27]/30 transition-colors shadow-xl hover:shadow-[0_10px_30px_rgba(230,26,39,0.1)]"
                            >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-[#e61a27]/10 rounded-bl-full -z-10 group-hover:bg-[#e61a27]/20 transition-colors" />
                              <h3 className="text-2xl font-black text-[#111827] dark:text-white mb-6 flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#e61a27] text-[28px]">
                                  {icon}
                                </span>
                                {label}
                              </h3>

                              {/* Header row */}
                              {audienceTypes.length > 0 &&
                              dayTypes.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-200 dark:border-white/10">
                                        <th className="text-left text-gray-500 dark:text-[#9D9D9D] pb-4 pr-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                          Đối tượng
                                        </th>
                                        <th className="text-left text-gray-500 dark:text-[#9D9D9D] pb-4 pr-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                          Loại ghế
                                        </th>
                                        {dayTypes.map((dt) => (
                                          <th
                                            key={dt}
                                            className="text-right text-gray-500 dark:text-[#9D9D9D] pb-4 pl-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                                          >
                                            {DAY_TYPE_LABELS[dt] || dt}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {audienceTypes.flatMap((aud) => {
                                        const seats = Object.keys(
                                          byAudienceAndSeat[aud]
                                        ).sort((a, b) => {
                                          const orderA = SEAT_ORDER[a] || 99;
                                          const orderB = SEAT_ORDER[b] || 99;
                                          return orderA - orderB;
                                        });
                                        return seats.map((seat, seatIdx) => (
                                          <tr key={`${aud}-${seat}`}>
                                            {seatIdx === 0 ? (
                                              <td
                                                className={`py-3 pr-4 font-semibold whitespace-nowrap ${AUDIENCE_COLORS[aud] || 'text-gray-500 dark:text-[#9D9D9D]'}`}
                                                rowSpan={seats.length}
                                              >
                                                {AUDIENCE_TYPE_LABELS[aud] ||
                                                  aud}
                                              </td>
                                            ) : null}
                                            <td
                                              className={`py-3 pr-4 whitespace-nowrap font-bold ${SEAT_COLORS[seat] || 'text-gray-500 dark:text-[#9D9D9D]'}`}
                                            >
                                              {SEAT_TYPE_LABELS[seat] || seat}
                                            </td>
                                            {dayTypes.map((dt) => {
                                              const p =
                                                byAudienceAndSeat[aud][seat]?.[
                                                  dt
                                                ];
                                              return (
                                                <td
                                                  key={dt}
                                                  className="py-3 pl-2 text-right"
                                                >
                                                  <span
                                                    className={`font-bold text-base ${AUDIENCE_COLORS[aud] || 'text-gray-900 dark:text-white'}`}
                                                  >
                                                    {p != null
                                                      ? formatPrice(p)
                                                      : '—'}
                                                  </span>
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        ));
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">
                                  Không có dữ liệu.
                                </p>
                              )}
                            </div>
                          );
                        })}

                        {/* 4th Box: Online Movies with Image Banner Slideshow */}
                        <div className="bg-white dark:bg-[#18181b] rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-white/10 relative overflow-hidden group hover:border-[#e61a27]/30 transition-all duration-500 shadow-xl hover:shadow-[0_10px_30px_rgba(230,26,39,0.2)] flex flex-col justify-center items-center text-center">
                          {/* Slideshow background */}
                          {bannerImages.map((img, idx) => (
                            <div
                              key={img}
                              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === activeBannerIdx ? 'opacity-80 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}
                            >
                              <img
                                src={img}
                                alt="Movie Banner"
                                className="w-full h-full object-cover filter brightness-[0.85] transition-transform duration-[4000ms] ease-out"
                                style={{
                                  transform:
                                    idx === activeBannerIdx
                                      ? 'scale(1.05)'
                                      : 'scale(1)',
                                }}
                              />
                            </div>
                          ))}

                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20 z-10 pointer-events-none" />

                          {/* Floating Dots Indicators */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                            {bannerImages.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveBannerIdx(idx);
                                }}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === activeBannerIdx ? 'bg-[#e61a27] w-4' : 'bg-white/40 hover:bg-white/70'}`}
                              />
                            ))}
                          </div>

                          {/* Content */}
                          <div className="relative z-20 flex flex-col items-center justify-center h-full px-4 pb-10 text-center">
                            <span className="material-symbols-outlined text-[#e61a27] text-[48px] mb-4">
                              play_circle
                            </span>
                            <h3 className="text-2xl font-black text-white mb-2 line-clamp-1">
                              {cardTitle}
                            </h3>
                            <p className="text-white/80 text-sm mb-6 max-w-sm leading-relaxed line-clamp-3">
                              {cardDesc}
                            </p>
                            <button
                              onClick={() => navigate(ROUTE_PATHS.onlineMovies)}
                              className="bg-transparent border-2 border-[#e61a27] text-[#e61a27] hover:bg-[#e61a27] hover:text-white px-8 py-2.5 rounded-full font-bold transition-all duration-300 uppercase tracking-wider text-sm whitespace-nowrap"
                            >
                              Xem Tại Đây
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
