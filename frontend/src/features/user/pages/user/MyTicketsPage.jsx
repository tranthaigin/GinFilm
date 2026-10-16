import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import DigitalTicket from '../../components/DigitalTicket';
import OnlineDigitalTicket from '../../components/OnlineDigitalTicket';

import {
  getMyTickets,
  getSharedTickets,
} from '../../api/services/bookingService';

const checkIsWebTicket = (ticket) => {
  if (!ticket) return false;
  const typeMatch = ticket.type && ticket.type.toLowerCase() === 'web';
  const idMatch =
    ticket.id && ticket.id.toString().toUpperCase().startsWith('WEB');
  const cinemaMatch =
    ticket.cinema && ticket.cinema.toLowerCase().includes('web');
  return typeMatch || idMatch || cinemaMatch;
};

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  useState(false);
  const [, setIsCodeVisible] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const filterType = searchParams.get('type') || 'all'; // 'all', 'cinema', 'web'
  const [activeTab, setActiveTab] = useState('purchased'); // 'purchased', 'shared'
  const [loading, setLoading] = useState(true);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const ITEMS_PER_PAGE = 5;

  const [tickets, setTickets] = useState([]);

  const loadKey1 = JSON.stringify([]);
  const [previousLoadKey1, setPreviousLoadKey1] = useState(null);
  if (previousLoadKey1 !== loadKey1) {
    setPreviousLoadKey1(loadKey1);
    setLoading(true);
  }

  const fetchTickets = useCallback(() => {
    return Promise.all([
      getMyTickets().catch(() => []),
      getSharedTickets().catch(() => []),
    ])
      .then(([myData, sharedData]) => {
        const allTickets = [
          ...(myData || []).map((t) => ({ ...t, isShared: false })),
          ...(sharedData || []).map((t) => ({ ...t, isShared: true })),
        ];
        setTickets(allTickets);
      })
      .catch((error) => {
        console.error('Lỗi khi tải lịch sử vé:', error);
        setTickets([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  // Ngăn chặn nút Back sau khi thanh toán thành công
  useEffect(() => {
    if (location.state?.preventBack) {
      // Đẩy thêm một state giả vào history
      window.history.pushState(null, '', window.location.href);

      const onPopState = () => {
        // Khi người dùng bấm Back, thay vì quay lại trang checkout, ta force về trang chủ
        navigate('/', { replace: true });
      };

      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }
  }, [location.state?.preventBack, navigate]);

  const fetchedForTicket = useRef(null);

  const ticketCodeParam = searchParams.get('ticketCode');
  const isPaymentSuccess =
    searchParams.get('vnp_ResponseCode') === '00' ||
    searchParams.get('success') === 'true' ||
    location.state?.newTicketId ||
    location.state?.showLatestTicket;
  const linkedTicket = useMemo(() => {
    if (ticketCodeParam)
      return tickets.find(
        (ticket) =>
          String(ticket.id) === ticketCodeParam ||
          ticket.bookingCode === ticketCodeParam ||
          String(ticket.id || '').startsWith(ticketCodeParam + '-')
      );
    if (!isPaymentSuccess) return null;
    let ticket;
    if (location.state?.movieId && location.state?.purchasedType) {
      const { movieId, purchasedType } = location.state;
      ticket = tickets.find(
        (item) =>
          String(item.movieId) === String(movieId) &&
          (purchasedType === 'web'
            ? checkIsWebTicket(item)
            : !checkIsWebTicket(item)) &&
          !item.isShared
      );
    }
    if (!ticket && location.state?.newTicketId)
      ticket = tickets.find(
        (item) => String(item.id) === String(location.state.newTicketId)
      );
    // Default to the first (latest) purchased ticket if payment was successful.
    return ticket || tickets.find((item) => !item.isShared) || tickets[0];
  }, [tickets, ticketCodeParam, isPaymentSuccess, location.state]);
  const modalRequestKey =
    ticketCodeParam || isPaymentSuccess
      ? JSON.stringify([
          ticketCodeParam,
          Boolean(isPaymentSuccess),
          location.state?.newTicketId,
          linkedTicket?.id,
        ])
      : null;
  const [previousModalRequestKey, setPreviousModalRequestKey] = useState(null);
  if (previousModalRequestKey !== modalRequestKey) {
    setPreviousModalRequestKey(modalRequestKey);
    if (linkedTicket) {
      setSelectedTicket(linkedTicket);
      setIsCodeVisible(false);
      setActiveTab(linkedTicket.isShared ? 'shared' : 'purchased');
      if (!ticketCodeParam && isPaymentSuccess) setShowSuccessMessage(true);
    }
  }

  useEffect(() => {
    if (
      ticketCodeParam &&
      !linkedTicket &&
      !loading &&
      fetchedForTicket.current !== ticketCodeParam
    ) {
      fetchedForTicket.current = ticketCodeParam;
      fetchTickets();
      return;
    }
    if (!linkedTicket) return;
    fetchedForTicket.current = null;
    const nextParams = new URLSearchParams(searchParams);
    if (ticketCodeParam) nextParams.delete('ticketCode');
    else if (isPaymentSuccess) {
      // CLEAR CACHE TO PREVENT ACCUMULATION IN NEXT BOOKING.
      const keysToRemove = [];
      for (let index = 0; index < sessionStorage.length; index++) {
        const key = sessionStorage.key(index);
        if (key?.startsWith('booking_')) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
      nextParams.delete('vnp_ResponseCode');
      nextParams.delete('vnp_TransactionStatus');
      nextParams.delete('success');
      // Clear URL params and state so it doesn't re-trigger on reload.
      navigate(
        { pathname: location.pathname, search: nextParams.toString() },
        { replace: true, state: { preventBack: true } }
      );
      return;
    }
    setSearchParams(nextParams, { replace: true });
  }, [
    ticketCodeParam,
    linkedTicket,
    loading,
    isPaymentSuccess,
    fetchTickets,
    searchParams,
    setSearchParams,
    navigate,
    location.pathname,
  ]);

  const filteredTickets = useMemo(() => {
    let result = tickets;

    // 1. Lọc theo tab
    if (activeTab === 'purchased') {
      result = result.filter((t) => !t.isShared);
    } else {
      result = result.filter((t) => t.isShared);
    }

    // 2. Lọc theo loại (cinema/web)
    if (filterType !== 'all') {
      result = result.filter((t) => {
        const isWeb = checkIsWebTicket(t);
        return filterType === 'web' ? isWeb : !isWeb;
      });
    }

    // 3. Lọc theo ngày
    if (filterDate) {
      result = result.filter((t) => {
        const [dd, mm, yyyy] = t.date.split('/');
        const ticketISO = `${yyyy}-${mm}-${dd}`;
        return ticketISO === filterDate;
      });
    }

    // 4. Sắp xếp giảm dần theo thời gian (mới nhất lên đầu)
    result.sort((a, b) => {
      try {
        const [dayA, monthA, yearA] = (a.date || '').split('/');
        const [dayB, monthB, yearB] = (b.date || '').split('/');

        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';

        const dateA = new Date(`${yearA}-${monthA}-${dayA}T${timeA}:00`);
        const dateB = new Date(`${yearB}-${monthB}-${dayB}T${timeB}:00`);

        return dateB.getTime() - dateA.getTime();
      } catch {
        return 0;
      }
    });

    return result;
  }, [tickets, filterDate, filterType, activeTab]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / ITEMS_PER_PAGE)
  );
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filter or tab changes
  const resetKey1 = JSON.stringify([filterDate, filterType, activeTab]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    setCurrentPage(1);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-black antialiased text-[#111827] dark:text-white font-sans">
      <Header />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1250px] px-4 pt-8 pb-16 md:px-8 xl:px-12">
          <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-white/10 pb-4">
            <h1 className="text-2xl md:text-[28px] font-black uppercase tracking-wide text-[#111827] dark:text-white leading-none">
              Vé Của Tôi
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/enter-ticket-code')}
                className="text-[14px] font-bold text-white hover:bg-[#c00] transition-all px-4 py-2.5 rounded-xl border border-[#e61a27] bg-[#e61a27] shadow-[0_4px_12px_rgba(230,26,39,0.3)] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  key
                </span>
                Kích Hoạt Mã Vé
              </button>
              <button
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('openSupportChat'))
                }
                className="text-[14px] font-bold text-[#e61a27] hover:bg-[#e61a27]/10 transition-all px-4 py-2.5 rounded-xl border border-[#e61a27] bg-transparent shadow-[0_4px_12px_rgba(230,26,39,0.1)] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  support_agent
                </span>
                Báo cáo sự cố
              </button>
              <button
                onClick={() => navigate('/home')}
                className="text-[14px] font-semibold text-gray-500 dark:text-[#9D9D9D] hover:text-[#111827] dark:hover:text-[#111827] dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b]/95 shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)] flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">
                  home
                </span>
                Trang chủ
              </button>
            </div>
          </div>

          <div className="rounded-[24px] bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none flex-1">
            <div className="flex items-center justify-between gap-3 px-7 py-5 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-8">
                <button
                  onClick={() => setActiveTab('purchased')}
                  className={`flex items-center gap-3 pb-[21px] -mb-[21px] border-b-2 transition-all ${activeTab === 'purchased' ? 'border-[#e61a27]' : 'border-transparent hover:border-gray-200 dark:border-white/20'}`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${activeTab === 'purchased' ? 'bg-[#e61a27]/15' : 'bg-white/5'}`}
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${activeTab === 'purchased' ? 'text-[#e61a27]' : 'text-gray-500 dark:text-[#9D9D9D]'}`}
                    >
                      confirmation_number
                    </span>
                  </span>
                  <h2
                    className={`text-[15px] font-black uppercase tracking-wider transition-colors ${activeTab === 'purchased' ? 'text-[#111827] dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-500 dark:text-[#9D9D9D]'}`}
                  >
                    Vé Đã Mua
                  </h2>
                </button>

                <button
                  onClick={() => setActiveTab('shared')}
                  className={`flex items-center gap-3 pb-[21px] -mb-[21px] border-b-2 transition-all ${activeTab === 'shared' ? 'border-[#e61a27]' : 'border-transparent hover:border-gray-200 dark:border-white/20'}`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${activeTab === 'shared' ? 'bg-[#e61a27]/15' : 'bg-white/5'}`}
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${activeTab === 'shared' ? 'text-[#e61a27]' : 'text-gray-500 dark:text-[#9D9D9D]'}`}
                    >
                      redeem
                    </span>
                  </span>
                  <h2
                    className={`text-[15px] font-black uppercase tracking-wider transition-colors ${activeTab === 'shared' ? 'text-[#111827] dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-500 dark:text-[#9D9D9D]'}`}
                  >
                    Vé Được Tặng
                  </h2>
                </button>
              </div>
              {/* Filters */}
              <div className="flex items-center gap-4">
                {/* Type Filter */}
                <div
                  className={`relative flex items-center gap-2 bg-gray-50 dark:bg-[#18181b] rounded-xl border w-full lg:w-auto px-4 py-2.5 transition-all group cursor-pointer select-none outline-none ${
                    filterType !== 'all' || isTypeDropdownOpen
                      ? 'border-[#e61a27] shadow-[0_0_10px_rgba(230,26,39,0.1)]'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-gray-200 dark:border-white/20'
                  }`}
                  tabIndex={0}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget))
                      setIsTypeDropdownOpen(false);
                  }}
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] transition-colors ${filterType !== 'all' ? 'text-[#e61a27]' : 'text-gray-500 dark:text-[#9D9D9D]'}`}
                  >
                    filter_alt
                  </span>
                  <div className="flex-1 flex items-center justify-between min-w-[110px]">
                    <span className="text-[14px] font-bold text-[#111827] dark:text-white">
                      {filterType === 'all'
                        ? 'Tất cả vé'
                        : filterType === 'cinema'
                          ? 'Vé chiếu rạp'
                          : 'Vé trực tuyến'}
                    </span>
                    <span
                      className={`material-symbols-outlined text-[20px] text-gray-500 dark:text-[#9D9D9D] transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-180' : ''}`}
                    >
                      expand_more
                    </span>
                  </div>

                  {isTypeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 py-1">
                      {[
                        { val: 'all', label: 'Tất cả vé' },
                        { val: 'cinema', label: 'Vé chiếu rạp' },
                        { val: 'web', label: 'Vé trực tuyến' },
                      ].map((opt) => (
                        <div
                          key={opt.val}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchParams((current) => {
                              const next = new URLSearchParams(current);
                              next.set('type', opt.val);
                              return next;
                            });
                            if (opt.val === 'all') {
                              searchParams.delete('type');
                            } else {
                              searchParams.set('type', opt.val);
                            }
                            setSearchParams(searchParams);
                            setIsTypeDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 text-[14px] font-bold cursor-pointer transition-colors ${
                            filterType === opt.val
                              ? 'bg-[#e61a27]/10 text-[#e61a27]'
                              : 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5'
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
                <div
                  className={`flex items-center gap-2 bg-gray-50 dark:bg-[#18181b] rounded-xl border w-full lg:w-auto px-4 py-2.5 transition-all group ${
                    filterDate
                      ? 'border-[#e61a27] shadow-[0_0_10px_rgba(230,26,39,0.1)]'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-gray-200 dark:border-white/20'
                  }`}
                >
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
                      Xóa lọc
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-7">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-white/20 border-t-red-500"></div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {paginatedTickets.length > 0 ? (
                    paginatedTickets.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedTicket(item);
                          setIsCodeVisible(false);
                        }}
                        className="cursor-pointer group flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-gray-200 dark:border-white/20 transition-all hover:bg-gray-100 dark:hover:bg-[#222]"
                      >
                        <div className="flex items-center gap-4">
                          {item.poster ? (
                            <img
                              src={item.poster}
                              alt={item.movie}
                              className="w-12 h-16 object-cover rounded shadow-sm border border-gray-200 dark:border-white/10 shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-12 h-16 rounded-xl flex items-center justify-center shrink-0 ${checkIsWebTicket(item) ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {checkIsWebTicket(item)
                                  ? 'play_circle'
                                  : 'movie'}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="text-[15px] font-bold text-[#111827] dark:text-white group-hover:text-[#dc2626] transition-colors flex items-center gap-2">
                              {item.movie}
                              {checkIsWebTicket(item) ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 whitespace-nowrap">
                                  Trực tuyến
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#e61a27]/20 text-[#e61a27] border border-[#e61a27]/30 whitespace-nowrap">
                                  Tại Rạp
                                </span>
                              )}
                            </h3>
                            <p className="text-[13px] text-gray-500 mt-1">
                              {item.date} • {item.time} | {item.cinema}
                            </p>
                            {item.isShared && item.ownerEmail && (
                              <p className="text-[12px] text-blue-400 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  redeem
                                </span>
                                Được tặng bởi: {item.ownerEmail}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-[15px] font-bold text-[#111827] dark:text-white">
                              {item.total.toLocaleString('vi-VN')}đ
                            </p>
                            <p className="text-[11px] text-gray-500 font-medium tracking-wide uppercase mt-1">
                              Mã: {item.id}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-gray-500 group-hover:text-[#111827] dark:group-hover:text-[#111827] dark:text-white transition-colors">
                            chevron_right
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <span
                        className="material-symbols-outlined text-white/10 mb-3"
                        style={{ fontSize: 48 }}
                      >
                        search_off
                      </span>
                      <p className="text-gray-500 text-[15px] font-medium">
                        Không tìm thấy giao dịch nào
                        {filterDate
                          ? ` vào ngày ${filterDate.split('-').reverse().join('/')}`
                          : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {filteredTickets.length > ITEMS_PER_PAGE &&
                (() => {
                  const getPageNumbers = () => {
                    if (totalPages <= 3)
                      return Array.from(
                        { length: totalPages },
                        (_, i) => i + 1
                      );
                    if (currentPage >= totalPages - 2)
                      return [totalPages - 2, totalPages - 1, totalPages];
                    return [currentPage, currentPage + 1, '...', totalPages];
                  };
                  const pages = getPageNumbers();
                  const btnBase =
                    'w-9 h-9 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center';
                  const btnActive =
                    'bg-[#e61a27] text-white shadow-[0_0_12px_rgba(230,26,39,0.3)]';
                  const btnInactive =
                    'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white hover:border-[#e61a27] hover:bg-[#e61a27]/10';
                  const btnDisabled =
                    'border border-gray-200 dark:border-white/10 text-gray-300 dark:text-gray-700 cursor-not-allowed';

                  return (
                    <div className="flex items-center justify-end gap-1.5 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                      {/* Prev Arrow */}
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          chevron_left
                        </span>
                      </button>

                      {/* Page Numbers */}
                      {pages.map((page, idx) =>
                        page === '...' ? (
                          <span
                            key={`dots-${idx}`}
                            className={`${btnBase} text-gray-500 cursor-default select-none`}
                          >
                            …
                          </span>
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

                      {/* Next Arrow */}
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          chevron_right
                        </span>
                      </button>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {selectedTicket &&
        (() => {
          const isWeb = checkIsWebTicket(selectedTicket);
          isWeb ? 'bg-[#1e3a8a]' : '';
          isWeb ? 'from-[#1e40af] to-[#1e3a8a]' : '';
          isWeb ? 'bg-[#1e3a8a]' : '';
          const ambientGlow = isWeb ? 'bg-[#3b82f6]/20' : 'bg-[#f59e0b]/40';
          isWeb
            ? 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.25)]'
            : '';

          const cinemaStr = selectedTicket.cinema || '';
          let branchName = cinemaStr;
          let roomName = 'PHÒNG 1';
          if (!isWeb) {
            if (cinemaStr.includes('-')) {
              const parts = cinemaStr.split('-');
              branchName = parts[0].trim();
              roomName = parts[1].trim();
            } else if (cinemaStr.includes('|')) {
              const parts = cinemaStr.split('|');
              branchName = parts[0].trim();
              roomName = parts[1].trim();
            }
            roomName = roomName.replace(/Cinema/i, 'PHÒNG').toUpperCase();
          }

          return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto bg-white/80 dark:bg-black/85 px-4 py-8 md:py-12 backdrop-blur-sm scrollbar-hide">
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setShowSuccessMessage(false);
                  setIsCodeVisible(false);
                }}
                className="fixed top-4 right-4 md:top-8 md:right-8 w-11 h-11 rounded-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 flex items-center justify-center text-gray-700 dark:text-white transition-colors z-[110] backdrop-blur-md"
              >
                <span className="material-symbols-outlined text-[24px]">
                  close
                </span>
              </button>

              {/* Ambient Glow */}
              <div
                className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-96 ${ambientGlow} blur-[120px] rounded-full pointer-events-none`}
              />

              {isWeb ? (
                <div className="relative z-10 w-full max-w-[420px] m-auto shrink-0 flex flex-col items-center">
                  <OnlineDigitalTicket
                    ticket={{
                      id: selectedTicket.id,
                      movie: selectedTicket.movie,
                      date: selectedTicket.date,
                      time: selectedTicket.time,
                      isActivated: selectedTicket.isActivated,
                    }}
                    showSuccessMessage={showSuccessMessage}
                    onPlay={() => {
                      const ticketCode = selectedTicket.id;
                      const isActivated = selectedTicket.isActivated;
                      setSelectedTicket(null);
                      setShowSuccessMessage(false);
                      setIsCodeVisible(false);
                      navigate(
                        `/enter-ticket-code?ticket=${ticketCode}&activated=${isActivated ? 'true' : 'false'}`
                      );
                    }}
                  />
                </div>
              ) : (
                <div className="relative z-10 w-full max-w-[420px] m-auto shrink-0 flex flex-col items-center">
                  <DigitalTicket
                    ticket={{
                      ...selectedTicket,
                      roomName: roomName,
                      branchName: branchName,
                    }}
                    showSuccessMessage={showSuccessMessage}
                  />
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
