import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import useNotificationStore from '../../../../shared/store/notificationStore';
import { useToastStore } from '../../store/toastStore';
import UserPagination from '../../components/UserPagination';
import { renderBoldText } from '../../../../shared/utils/textUtils';

const CATEGORIES = [
  { id: 'ALL', label: 'Tất cả', icon: 'apps' },
  { id: 'SYSTEM', label: 'Hệ thống', icon: 'settings' },
  { id: 'REPORT_RESULT', label: 'Báo cáo', icon: 'report' },
  { id: 'PROMOTION', label: 'Khuyến mãi', icon: 'local_offer' },
  { id: 'TRANSACTION', label: 'Giao dịch', icon: 'receipt_long' }
];

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return `${Math.max(0, seconds)} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

function getLocalDateString(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNotificationCategory(notif) {
  if (!notif) return 'SYSTEM';
  if (notif.type === 'TRANSACTION') return 'TRANSACTION';
  if (notif.type === 'PROMOTION') return 'PROMOTION';
  if (notif.type === 'REPORT_RESULT') return 'REPORT_RESULT';

  const titleLower = (notif.title || '').toLowerCase();
  const messageLower = (notif.message || '').toLowerCase();
  const linkLower = (notif.link || '').toLowerCase();

  // Tự động phân loại chính xác các thông báo giao dịch (mua vé, thanh toán, đơn hàng, hủy vé) vào tab Giao dịch
  if (
    titleLower.includes('thanh toán') ||
    titleLower.includes('mua vé') ||
    titleLower.includes('đơn hàng') ||
    titleLower.includes('giao dịch') ||
    titleLower.includes('hủy vé') ||
    titleLower.includes('vé của bạn') ||
    messageLower.includes('thanh toán thành công') ||
    linkLower.includes('/my-tickets') ||
    linkLower.includes('ticketcode=')
  ) {
    return 'TRANSACTION';
  }

  return 'SYSTEM';
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [selectedDate, setSelectedDate] = useState('');
  const [isItemsDropdownOpen, setIsItemsDropdownOpen] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore();

  const dateLimits = useMemo(() => {
    const maxDate = getLocalDateString(new Date());
    if (!notifications || notifications.length === 0) {
      return { min: maxDate, max: maxDate };
    }
    const dates = notifications.map(n => new Date(n.createdAt).getTime());
    const minDate = getLocalDateString(new Date(Math.min(...dates)));
    return { min: minDate, max: maxDate };
  }, [notifications]);

  useEffect(() => {
    fetchNotifications();
    window.scrollTo(0, 0);
  }, []);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    if (activeTab !== 'ALL') {
      filtered = filtered.filter(n => getNotificationCategory(n) === activeTab);
    }
    if (selectedDate) {
      filtered = filtered.filter(n => getLocalDateString(n.createdAt) === selectedDate);
    }
    return filtered;
  }, [notifications, activeTab, selectedDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedDate]);

  // Pagination logic
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const currentNotifications = filteredNotifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    if (notif.link && !notif.link.includes('autoReview=true') && notif.title !== "Nhắc nhở đánh giá phim") {
      navigate(notif.link);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-black text-slate-800 dark:text-slate-200 font-sans relative">

      <Header />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-12 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              THÔNG BÁO <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-600">CỦA TÔI</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Cập nhật những thông tin mới nhất dành riêng cho bạn</p>
          </div>
          <button
            onClick={() => { if (unreadCount > 0) markAllAsRead(); }}
            disabled={unreadCount === 0}
            className={`group relative overflow-hidden px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${unreadCount > 0
                ? 'bg-white dark:bg-white/5 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 hover:border-red-500/50 dark:hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                : 'bg-transparent text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-white/5 cursor-not-allowed'
              }`}
          >
            {unreadCount > 0 && (
              <span className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            )}
            <span className="relative flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">done_all</span>
              Đánh dấu tất cả đã đọc
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-8">
          {/* Top Tabs (was Sidebar) */}
          <aside className="w-full shrink-0 relative z-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/5 p-2 shadow-lg shadow-slate-200/20 dark:shadow-black/40">
              <div className="flex flex-row gap-2 min-w-max overflow-x-auto scrollbar-hide">
                {CATEGORIES.map(cat => {
                  const isActive = activeTab === cat.id;
                  const unreadCatCount = notifications.filter(n => !n.isRead && (cat.id === 'ALL' || getNotificationCategory(n) === cat.id)).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={`relative flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 group ${isActive
                          ? 'text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-500/10'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      <div className="relative flex items-center gap-2 z-10">
                        <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {cat.icon}
                        </span>
                        <span className="font-semibold whitespace-nowrap">{cat.label}</span>
                      </div>
                      {unreadCatCount > 0 && (
                        <span className={`relative z-10 px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${isActive
                            ? 'bg-red-200 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                            : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                          }`}>
                          {unreadCatCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Filters & Pagination Size */}
              <div className="flex items-center gap-3 shrink-0 px-2">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    min={dateLimits.min}
                    max={dateLimits.max}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:border-red-500 transition-colors cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate('')}
                      className="flex items-center justify-center w-[38px] h-[38px] rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Xóa bộ lọc ngày"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>
                <div 
                  className={`relative flex items-center gap-2 bg-white dark:bg-[#18181b] rounded-lg border px-3 py-2 transition-all group cursor-pointer select-none outline-none ${
                    isItemsDropdownOpen ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                  tabIndex={0}
                  onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsItemsDropdownOpen(false) }}
                  onClick={() => setIsItemsDropdownOpen(!isItemsDropdownOpen)}
                >
                  <div className="flex-1 flex items-center justify-between min-w-[80px]">
                    <span className="text-sm font-semibold text-slate-700 dark:text-white">
                      {itemsPerPage} / trang
                    </span>
                    <span className={`material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400 transition-transform duration-300 ${isItemsDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </div>
                  
                  {isItemsDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 py-1 min-w-[120px]">
                      {[5, 6, 7, 10, 15, 20, 30].map(size => (
                        <div 
                          key={size}
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemsPerPage(size);
                            setCurrentPage(1);
                            setIsItemsDropdownOpen(false);
                          }}
                          className={`px-4 py-2 text-sm font-semibold cursor-pointer transition-colors ${
                            itemsPerPage === size ? 'bg-red-500/10 text-red-500' : 'text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {size} / trang
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 w-full min-w-0">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[500px] text-center px-4 bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-3xl border border-white/20 dark:border-white/5">
                <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 bg-slate-200 dark:bg-white/5 rounded-full animate-ping opacity-20"></div>
                  <span className="material-symbols-outlined text-[64px] text-slate-300 dark:text-white/20 relative z-10">notifications_off</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Chưa có thông báo nào</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md text-lg">
                  Bạn hiện không có thông báo nào trong danh mục này. Các cập nhật mới nhất sẽ được hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {currentNotifications.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                  >
                    <div className={`group relative flex items-start gap-4 lg:gap-6 p-5 lg:p-6 rounded-3xl transition-all duration-300 cursor-pointer border ${!item.isRead
                        ? 'bg-white dark:bg-[#1a1a1f] border-slate-200 dark:border-white/10 shadow-lg shadow-slate-200/20 dark:shadow-black/40 hover:shadow-xl hover:shadow-slate-200/30 dark:hover:shadow-black/60 hover:-translate-y-1'
                        : 'bg-white/60 dark:bg-black/60 backdrop-blur-sm border-white/20 dark:border-white/5 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-[#1a1a1f] hover:-translate-y-1'
                      }`}
                    >

                      {/* Icon */}
                      <div className={`relative mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${!item.isRead
                          ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-white/10 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        }`}>
                        <span className="material-symbols-outlined text-[28px]">
                          {getNotificationCategory(item) === 'SYSTEM' ? 'settings' :
                            getNotificationCategory(item) === 'REPORT_RESULT' ? 'report' :
                              getNotificationCategory(item) === 'PROMOTION' ? 'local_offer' :
                                getNotificationCategory(item) === 'TRANSACTION' ? 'receipt_long' : 'notifications'}
                        </span>
                        {!item.isRead && (
                          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white dark:border-[#1a1a1f] shadow-sm z-10"></span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-col gap-2 flex-1 min-w-0 py-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                          <h3 className={`text-[17px] leading-tight truncate ${!item.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'
                            }`}>
                            {item.title}
                          </h3>
                        </div>
                        <p className={`text-[15px] leading-relaxed ${!item.isRead ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                          {renderBoldText(item.message)}
                        </p>
                        
                        <div className="mt-2 flex items-end justify-between gap-4">
                          {item.link ? (
                            <div className="inline-flex items-center gap-2 text-[14px] font-bold text-red-500 group/link w-fit">
                              Xem chi tiết
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-50 dark:bg-red-500/10 group-hover/link:bg-red-500 group-hover/link:text-white transition-colors duration-300">
                                <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover/link:translate-x-0.5">arrow_forward</span>
                              </div>
                            </div>
                          ) : (
                            <div></div>
                          )}
                          <div className="flex items-center gap-1.5 shrink-0 mt-auto">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                              {timeAgo(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <UserPagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} className="mt-8" />
          </div>
        </div>
      </main>

      <Footer />

      {/* Required styles for animations if they don't exist in tailwind config */}
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
