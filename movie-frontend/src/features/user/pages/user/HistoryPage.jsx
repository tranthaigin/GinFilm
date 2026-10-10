import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { getMyTickets, getSharedTickets } from '../../api/services/bookingService';
import { useToastStore } from '../../store/toastStore';

export default function HistoryPage() {
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL', 'CINEMA', 'ONLINE'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'SUCCESS', 'FAILED', 'REFUNDED', 'USED'
  const [filterDate, setFilterDate] = useState('');
  
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Accordion State
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const [myData, sharedData] = await Promise.all([
        getMyTickets().catch(() => []),
        getSharedTickets().catch(() => [])
      ]);

      let allTickets = [
        ...(myData || []).map(t => ({ ...t, isShared: false })),
        ...(sharedData || []).map(t => ({ ...t, isShared: true }))
      ];

      // Reverse to get newest first (assuming backend returns oldest first)
      allTickets.reverse();

      // Sort by purchase date descending if available
      allTickets.sort((a, b) => {
        try {
          const [dayA, monthA, yearA] = (a.date || '').split('/');
          const [dayB, monthB, yearB] = (b.date || '').split('/');
          
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          
          const dateA = new Date(`${yearA}-${monthA}-${dayA}T${timeA}:00`);
          const dateB = new Date(`${yearB}-${monthB}-${dayB}T${timeB}:00`);
          
          return dateB.getTime() - dateA.getTime();
        } catch (e) {
          return 0;
        }
      });

      // Map backend data to UI fields
      allTickets = allTickets.map(t => {
        let derivedStatus = t.status || 'SUCCESS';
        
        // Auto-mark as USED if the showtime has passed (only for cinema tickets)
        if (derivedStatus === 'SUCCESS' && t.type !== 'web' && t.date && t.time) {
          try {
            const tDate = new Date(`${t.date.split('/').reverse().join('-')}T${t.time}`);
            if (tDate.getTime() < new Date().getTime()) {
              derivedStatus = 'USED';
            }
          } catch (e) { }
        }

        const total = t.total || 0;
        const discountAmount = t.discountAmount || 0;
        const subtotal = total + discountAmount;

        return {
          ...t,
          transactionId: t.transactionId || `TXN-${t.id || '0000'}`,
          paymentMethod: t.paymentMethod || 'Stripe',
          status: derivedStatus,
          subtotal: subtotal,
          discountAmount: discountAmount,
          validityPeriodMinutes: t.validityPeriodMinutes || null
        };
      });

      setTickets(allTickets);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return tickets.filter(t => {
      // Type filter
      if (typeFilter === 'CINEMA' && t.type === 'web') return false;
      if (typeFilter === 'ONLINE' && t.type !== 'web') return false;

      // Status filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      // Date filter
      if (filterDate) {
        const [dd, mm, yyyy] = t.date.split('/');
        const ticketISO = `${yyyy}-${mm}-${dd}`;
        if (ticketISO !== filterDate) return false;
      }

      return true;
    });
  }, [tickets, typeFilter, statusFilter, filterDate]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [typeFilter, statusFilter, filterDate]);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleDownloadInvoice = (e) => {
    e.stopPropagation();
    showToast('Đang tải hóa đơn PDF...', 'success');
  };

  const handleResendEmail = (e) => {
    e.stopPropagation();
    showToast('Đã gửi lại thông tin vé qua Email của bạn', 'success');
  };

  // Helper cho giao diện
  const getStatusConfig = (status) => {
    switch (status) {
      case 'SUCCESS': return { label: 'Thành Công', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' };
      case 'FAILED': return { label: 'Thất Bại', bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' };
      case 'REFUNDED': return { label: 'Đã Hoàn Tiền', bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' };
      case 'USED': return { label: 'Đã Sử Dụng', bg: 'bg-gray-500/20', text: 'text-gray-500 dark:text-[#9D9D9D]', border: 'border-gray-500/30' };
      default: return { label: status, bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20' };
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black antialiased text-[#111827] dark:text-white font-sans">
      <Header />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1250px] px-4 pt-8 pb-16 md:px-8 xl:px-12">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-gray-200 dark:border-white/10 pb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-[32px] font-black uppercase tracking-wide text-[#111827] dark:text-white leading-none">
                Lịch Sử Giao Dịch
              </h1>
              <p className="text-gray-500 dark:text-[#9D9D9D] text-[14px] mt-2 font-medium">Quản lý và tra cứu toàn bộ giao dịch mua vé của bạn</p>
            </div>
          </div>

          <div className="rounded-[24px] bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none p-5 md:p-8">

            {/* Filters */}
            <div className="flex flex-col lg:flex-row flex-wrap items-center gap-4 mb-8">
              {/* Type Filter */}
              <div 
                className={`relative flex items-center gap-2 bg-gray-50 dark:bg-[#18181b] rounded-xl border w-full lg:w-auto px-4 py-2.5 transition-all group cursor-pointer select-none outline-none ${
                  typeFilter !== 'ALL' || isTypeDropdownOpen ? 'border-[#e61a27] shadow-[0_0_10px_rgba(230,26,39,0.1)]' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-gray-200 dark:border-white/20'
                }`}
                tabIndex={0}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsTypeDropdownOpen(false) }}
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              >
                <span className={`material-symbols-outlined text-[20px] transition-colors ${typeFilter !== 'ALL' ? 'text-[#e61a27]' : 'text-gray-500 dark:text-[#9D9D9D]'}`}>filter_alt</span>
                <div className="flex-1 flex items-center justify-between min-w-[110px]">
                  <span className="text-[14px] font-bold text-[#111827] dark:text-white">
                    {typeFilter === 'ALL' ? 'Tất cả vé' : typeFilter === 'CINEMA' ? 'Vé chiếu rạp' : 'Vé trực tuyến'}
                  </span>
                  <span className={`material-symbols-outlined text-[20px] text-gray-500 dark:text-[#9D9D9D] transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
                
                {isTypeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 py-1">
                    {[
                      { val: 'ALL', label: 'Tất cả vé' },
                      { val: 'CINEMA', label: 'Vé chiếu rạp' },
                      { val: 'ONLINE', label: 'Vé trực tuyến' }
                    ].map(opt => (
                      <div 
                        key={opt.val}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTypeFilter(opt.val);
                          setIsTypeDropdownOpen(false);
                        }}
                        className={`px-4 py-2.5 text-[14px] font-bold cursor-pointer transition-colors ${
                          typeFilter === opt.val ? 'bg-[#e61a27]/10 text-[#e61a27]' : 'text-[#111827] dark:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-8 bg-white/10 hidden lg:block"></div>

              {/* Date Filter */}
              <div className={`flex items-center gap-2 bg-gray-50 dark:bg-[#18181b] rounded-xl border w-full lg:w-auto px-4 py-2.5 transition-all group ${
                filterDate ? 'border-[#e61a27] shadow-[0_0_10px_rgba(230,26,39,0.1)]' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-gray-200 dark:border-white/20'
              }`}>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent text-[14px] text-gray-500 dark:text-[#9D9D9D] font-medium focus:outline-none [color-scheme:light] dark:[color-scheme:dark] w-full min-w-[130px]"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="text-[12px] text-gray-500 hover:text-[#111827] dark:hover:text-[#111827] dark:text-white transition-colors px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-white/5 whitespace-nowrap"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <div className="w-px h-8 bg-white/10 hidden lg:block"></div>

              {/* Status Filter */}
              <div 
                className={`relative flex items-center gap-2 bg-gray-50 dark:bg-[#18181b] rounded-xl border w-full lg:w-auto px-4 py-2.5 transition-all group cursor-pointer select-none outline-none lg:ml-auto ${
                  statusFilter !== 'ALL' || isStatusDropdownOpen ? 'border-[#e61a27] shadow-[0_0_10px_rgba(230,26,39,0.1)]' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-gray-200 dark:border-white/20'
                }`}
                tabIndex={0}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsStatusDropdownOpen(false) }}
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              >
                <span className={`material-symbols-outlined text-[20px] transition-colors ${statusFilter !== 'ALL' ? 'text-[#e61a27]' : 'text-gray-500 dark:text-[#9D9D9D]'}`}>check_circle</span>
                <div className="flex-1 flex items-center justify-between min-w-[120px]">
                  <span className="text-[14px] font-bold text-[#111827] dark:text-white">
                    {statusFilter === 'ALL' ? 'Mọi trạng thái' : getStatusConfig(statusFilter).label}
                  </span>
                  <span className={`material-symbols-outlined text-[20px] text-gray-500 dark:text-[#9D9D9D] transition-transform duration-300 ${isStatusDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </div>

                {isStatusDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 py-1">
                    {[
                      { val: 'ALL', label: 'Mọi trạng thái' },
                      { val: 'SUCCESS', label: 'Thành Công' },
                      { val: 'USED', label: 'Đã Sử Dụng' },
                      { val: 'FAILED', label: 'Thất Bại' }
                    ].map(opt => (
                      <div 
                        key={opt.val}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusFilter(opt.val);
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`px-4 py-2.5 text-[14px] font-bold cursor-pointer transition-colors ${
                          statusFilter === opt.val ? 'bg-[#e61a27]/10 text-[#e61a27]' : 'text-[#111827] dark:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 dark:border-white/20 border-t-[#e61a27]"></div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {paginatedData.length > 0 ? (
                  paginatedData.map((item) => {
                    const isExpanded = expandedId === item.transactionId;
                    const stConfig = getStatusConfig(item.status);

                    return (
                      <div
                        key={item.transactionId}
                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-[#e61a27]/50 bg-gray-100 dark:bg-[#161616] shadow-[0_0_20px_rgba(230,26,39,0.05)]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#18181b] hover:border-gray-300 dark:hover:border-gray-200 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-[#1f1f1f]'}`}
                      >
                        {/* Summary Header (Always Visible) */}
                        <div
                          className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer gap-4 select-none"
                          onClick={() => toggleExpand(item.transactionId)}
                        >
                          <div className="flex items-center gap-4 w-full md:w-[35%]">
                            {item.poster ? (
                              <img src={item.poster} alt={item.movie} className="w-12 h-16 object-cover rounded shadow-sm border border-gray-200 dark:border-white/10 shrink-0" />
                            ) : (
                              <div className="w-12 h-16 rounded bg-gray-200 dark:bg-white/5 flex items-center justify-center border border-gray-300 dark:border-white/10 shrink-0">
                                <span className="material-symbols-outlined text-[20px] text-gray-600">{item.type === 'web' ? 'play_circle' : 'movie'}</span>
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-[14px] font-black text-[#111827] dark:text-white">{item.transactionId}</span>
                              <span className="text-[12px] text-gray-500 font-medium mt-0.5">{item.date} • {item.time}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-[25%]">
                            <span className="material-symbols-outlined text-[18px] text-gray-500 dark:text-[#9D9D9D] shrink-0">
                              {item.paymentMethod.includes('MoMo') ? 'account_balance_wallet' : 'credit_card'}
                            </span>
                            <span className="text-[14px] font-bold text-gray-500 dark:text-[#9D9D9D] truncate max-w-[200px]" title={item.movie}>
                              {item.movie}
                            </span>
                          </div>

                          <div className="flex items-center w-full md:w-[20%] md:justify-center">
                            <span className={`shrink-0 inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md border ${stConfig.bg} ${stConfig.text} ${stConfig.border}`}>
                              {stConfig.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-[20%]">
                            <div className="flex flex-col items-end">
                              <span className="text-[15px] font-black text-[#ffb400]">
                                {item.total ? item.total.toLocaleString('vi-VN') + 'đ' : '0đ'}
                              </span>
                            </div>
                            <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all bg-gray-200 dark:bg-white/5 ${isExpanded ? 'rotate-180 bg-[#e61a27]/20 text-[#e61a27]' : 'text-gray-500 dark:text-[#9D9D9D]'}`}>
                              <span className="material-symbols-outlined text-[20px]">expand_more</span>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Details (Accordion Content) */}
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                        >
                          <div className="overflow-hidden">
                            <div className="p-5 border-t border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/20 flex flex-col lg:flex-row gap-8">

                              {/* Left: Movie & Ticket Info */}
                              <div className="flex-1">
                                <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-bold mb-4">Chi tiết dịch vụ</h3>
                                <div className="flex gap-4">


                                  <div className="flex flex-col justify-center">
                                    <span className="text-[16px] font-bold text-[#111827] dark:text-white mb-1">{item.movie}</span>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${item.type === 'web' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                        {item.type === 'web' ? 'PHIM TRỰC TUYẾN' : 'VÉ XEM RẠP'}
                                      </span>
                                    </div>
                                    {item.type === 'web' ? (
                                      <div className="text-[13px] text-gray-500 dark:text-[#9D9D9D] space-y-1.5 mt-2">
                                        <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-gray-500">high_quality</span> <span className="text-gray-500">Chất lượng:</span> <span className="font-bold text-[#111827] dark:text-white">Full HD / 4K</span></p>
                                        <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-gray-500">devices</span> <span className="text-gray-500">Thiết bị:</span> Web, Mobile, Smart TV</p>
                                        <p className="flex items-center gap-2">
                                          <span className="material-symbols-outlined text-[16px] text-gray-500">all_inclusive</span>
                                          <span className="text-gray-500">Thời hạn xem:</span>
                                          <span className="font-medium text-[#111827] dark:text-white">
                                            {item.validityPeriodMinutes ? (
                                              item.validityPeriodMinutes >= 1440
                                                ? `${Math.round(item.validityPeriodMinutes / 1440)} ngày`
                                                : `${Math.round(item.validityPeriodMinutes / 60)} giờ`
                                            ) : 'Vĩnh viễn'}
                                          </span>
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="text-[13px] text-gray-500 dark:text-[#9D9D9D] space-y-1 mt-1">
                                        <p><span className="text-gray-500">Rạp:</span> {item.cinema}</p>
                                        <p><span className="text-gray-500">Ghế:</span> <span className="font-bold text-[#111827] dark:text-white">{item.seats?.join(', ') || 'N/A'}</span></p>
                                        {item.combo && <p><span className="text-gray-500">Bắp Nước:</span> <span className="text-yellow-500 font-medium">{item.combo}</span></p>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="w-px bg-white/5 hidden lg:block"></div>

                              {/* Right: Payment Breakdown & Tools */}
                              <div className="w-full lg:w-[320px] flex flex-col">
                                <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-bold mb-4">Chi tiết thanh toán</h3>

                                <div className="space-y-2 text-[13px] mb-4">
                                  <div className="flex justify-between items-center text-gray-500 dark:text-[#9D9D9D]">
                                    <span>Phương thức</span>
                                    <span className="font-semibold text-[#111827] dark:text-white">{item.paymentMethod}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-gray-500 dark:text-[#9D9D9D]">
                                    <span>Tạm tính</span>
                                    <span>{item.subtotal.toLocaleString('vi-VN')}đ</span>
                                  </div>
                                  <div className="flex justify-between items-center text-gray-500 dark:text-[#9D9D9D]">
                                    <span>Khuyến mãi</span>
                                    <span className="text-[#e61a27]">- {item.discountAmount.toLocaleString('vi-VN')}đ</span>
                                  </div>
                                  <div className="w-full h-px bg-white/10 my-2"></div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-[#111827] dark:text-white text-[14px]">Thành tiền</span>
                                    <span className="font-black text-[#ffb400] text-[18px]">{item.total.toLocaleString('vi-VN')}đ</span>
                                  </div>
                                </div>

                                {item.type === 'web' && item.status === 'SUCCESS' && (
                                  <div className="mt-auto flex pt-4">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/enter-ticket-code?ticket=${item.id}&activated=${item.isActivated ? 'true' : 'false'}`);
                                      }}
                                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[14px] font-bold transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                    >
                                      <span className="material-symbols-outlined text-[20px]">play_circle</span>
                                      Xem Phim Ngay
                                    </button>
                                  </div>
                                )}

                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center bg-gray-50 dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-white/10">
                    <span className="material-symbols-outlined text-gray-300 dark:text-white/5 mb-4" style={{ fontSize: 64 }}>search_off</span>
                    <p className="text-gray-500 dark:text-[#9D9D9D] text-[16px] font-bold mb-2">Không tìm thấy giao dịch nào</p>
                    <p className="text-gray-500 text-[14px]">Thử thay đổi bộ lọc hoặc xem lại lịch sử sau nhé.</p>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {!loading && filteredData.length > ITEMS_PER_PAGE && (() => {
              const getPageNumbers = () => {
                if (totalPages <= 3) return Array.from({ length: totalPages }, (_, i) => i + 1);
                if (currentPage >= totalPages - 2) return [totalPages - 2, totalPages - 1, totalPages];
                return [currentPage, currentPage + 1, '...', totalPages];
              };
              const pages = getPageNumbers();
              const btnBase = 'w-9 h-9 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center';
              const btnActive = 'bg-[#e61a27] text-white shadow-[0_0_12px_rgba(230,26,39,0.3)]';
              const btnInactive = 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:border-[#e61a27] hover:bg-[#e61a27]/10';
              const btnDisabled = 'border border-gray-200 dark:border-white/10 text-gray-300 dark:text-gray-700 cursor-not-allowed';

              return (
                <div className="flex items-center justify-center md:justify-end gap-1.5 mt-10 pt-6 border-t border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {pages.map((page, idx) =>
                    page === '...' ? (
                      <span key={`dots-${idx}`} className={`${btnBase} text-gray-500 cursor-default select-none`}>…</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`${btnBase} ${page === currentPage ? btnActive : btnInactive}`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
