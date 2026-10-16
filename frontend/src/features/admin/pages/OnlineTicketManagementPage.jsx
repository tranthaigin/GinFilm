import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPut } from '../../../shared/api/client';
import { useToastStore } from '../../user/store/toastStore';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import env from '../../../shared/config/env';
import { MonitorPlay, Search } from 'lucide-react';
import Pagination from '../../../shared/components/Pagination';

export default function OnlineTicketManagementPage() {
  useLocation().pathname.startsWith('/staff');

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.showToast);

  // Filters
  const [filter, setFilter] = useState('ALL'); // ALL, NOT_ACTIVATED, ACTIVATED, EXPIRED

  // Detail Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    color: '#dc2626',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activationHistory, setActivationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Timer state to force re-render for countdowns
  const [now, setNow] = useState(() => Date.now());

  // Search & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovieTitle, setSelectedMovieTitle] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const uniqueMovies = useMemo(() => {
    const movieMap = new Map();
    tickets.forEach((t) => {
      if (t.movie && t.movie.title) {
        movieMap.set(t.movie.title, t.movie);
      }
    });
    return Array.from(movieMap.values());
  }, [tickets]);

  const fetchTickets = useCallback(
    (silent = false) => {
      return apiGet('/admin/online-tickets')
        .then((data) => {
          setTickets(data || []);
        })
        .catch((err) => {
          if (!silent)
            showToast(err.message || 'Lỗi khi tải danh sách vé', 'error');
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [showToast]
  );

  const loadKey1 = JSON.stringify([]);
  const [previousLoadKey1, setPreviousLoadKey1] = useState(null);
  if (previousLoadKey1 !== loadKey1) {
    setPreviousLoadKey1(loadKey1);
    setLoading(true);
  }

  useEffect(() => {
    fetchTickets();

    // Đồng hồ cập nhật "Thời gian còn lại" mỗi giây
    const clockTimer = setInterval(() => {
      setNow(Date.now());

      // Local live ticking for playing tickets
      setTickets((prev) =>
        prev.map((t) => {
          if (t.isPlaying) {
            return {
              ...t,
              consumedTimeSeconds: (t.consumedTimeSeconds || 0) + 1,
              watchPosition: (t.watchPosition || 0) + 1,
            };
          }
          return t;
        })
      );
    }, 1000);

    // Polling ngầm mỗi 10 giây để sync lại toàn bộ dữ liệu (tránh lệch số liệu quá lâu)
    const pollTimer = setInterval(() => fetchTickets(true), 10000);

    // WebSocket kết nối nhận trạng thái Play/Pause real-time
    const wsUrl = env.wsUrl || '/ws';
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      debug: () => {},
      onConnect: () => {
        client.subscribe('/topic/admin/tickets', (message) => {
          if (message.body) {
            const statusEvent = JSON.parse(message.body);
            setTickets((prev) =>
              prev.map((t) => {
                if (t.id === statusEvent.ticketId) {
                  return {
                    ...t,
                    isPlaying: statusEvent.isPlaying,
                    consumedTimeSeconds: statusEvent.consumedTimeSeconds,
                    watchPosition:
                      statusEvent.watchPosition !== undefined
                        ? statusEvent.watchPosition
                        : t.watchPosition,
                  };
                }
                return t;
              })
            );
          }
        });
      },
      onStompError: (frame) => {
        console.error('WebSocket connection error:', frame);
      },
    });

    client.activate();

    return () => {
      clearInterval(clockTimer);
      clearInterval(pollTimer);
      if (client) client.deactivate();
    };
  }, [fetchTickets]);

  const handleToggleBan = (ticket) => {
    const isBanned = !ticket.isBanned;
    setConfirmModal({
      open: true,
      title: isBanned ? 'Xác nhận khóa vé' : 'Xác nhận mở khóa vé',
      message: isBanned
        ? `Bạn có chắc muốn KHÓA vé ${ticket.ticketCode} không?`
        : `Bạn có chắc muốn MỞ KHÓA vé ${ticket.ticketCode} không?`,
      color: isBanned ? '#dc2626' : '#10b981',
      onConfirm: async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
          await apiPut(`/admin/online-tickets/${ticket.id}/ban`, { isBanned });
          showToast(
            isBanned ? 'Khóa vé thành công' : 'Mở khóa vé thành công',
            'success'
          );
          ((...args) => {
            setLoading(true);
            return fetchTickets(...args);
          })();
          if (selectedTicket && selectedTicket.id === ticket.id)
            setSelectedTicket(null);
        } catch (err) {
          showToast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
        } finally {
          setIsProcessing(false);
          setConfirmModal((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleResetTicket = (ticket) => {
    setConfirmModal({
      open: true,
      title: 'Xác nhận Reset vé',
      message: `Bạn có chắc chắn muốn RESET vé ${ticket.ticketCode} về trạng thái chưa kích hoạt? Người đang xem sẽ bị đá văng và vé có thể kích hoạt lại từ đầu.`,
      color: '#f59e0b',
      onConfirm: async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
          await apiPut(`/admin/online-tickets/${ticket.id}/reset`);
          showToast('Reset vé thành công', 'success');
          ((...args) => {
            setLoading(true);
            return fetchTickets(...args);
          })();
          if (selectedTicket && selectedTicket.id === ticket.id)
            setSelectedTicket(null);
        } catch (err) {
          showToast(err.message || 'Lỗi khi reset vé', 'error');
        } finally {
          setIsProcessing(false);
          setConfirmModal((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const fetchActivationHistory = async () => {
    try {
      setLoadingHistory(true);
      setShowHistoryModal(true);
      const data = await apiGet('/admin/online-tickets/activation-history');
      setActivationHistory(data || []);
    } catch (err) {
      showToast(err.message || 'Lỗi khi tải lịch sử', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Helper to calculate countdown
  const getCountdown = (expiresAtString) => {
    if (!expiresAtString) return null;
    const exp = new Date(expiresAtString).getTime();
    const diff = exp - now;
    if (diff <= 0) return '00:00:00 (Hết hạn)';

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Check if ticket is expired
  const isExpired = (ticket) => {
    if (!ticket.expiresAt) return false;
    return new Date(ticket.expiresAt).getTime() <= now;
  };

  // Filtered tickets
  let filteredTickets = tickets.filter((t) => {
    if (filter === 'ALL') return true;
    if (filter === 'NOT_ACTIVATED') return !t.activatedAt;
    if (filter === 'ACTIVATED') return t.activatedAt && !isExpired(t);
    if (filter === 'EXPIRED') return t.activatedAt && isExpired(t);
    return true;
  });

  if (searchTerm) {
    filteredTickets = filteredTickets.filter((t) =>
      t.ticketCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (selectedMovieTitle) {
    filteredTickets = filteredTickets.filter(
      (t) => t.movie?.title === selectedMovieTitle
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const currentTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 text-white">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MonitorPlay size={22} color="#fff" />
          </div>
          <div>
            <h2
              style={{
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Quản lí Vé Trực Tuyến
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                margin: '2px 0 0 0',
              }}
            >
              Kiểm soát vé online, thời lượng và thông tin chia sẻ tài khoản
              xem.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchActivationHistory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)')
            }
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px' }}
            >
              history
            </span>
            Lịch sử kích hoạt
          </button>

          <button
            onClick={(...args) => {
              setLoading(true);
              return fetchTickets(...args);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')
            }
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px' }}
            >
              refresh
            </span>
            Làm mới
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex gap-2 mb-2">
        {[
          { id: 'ALL', label: 'Tất cả' },
          { id: 'NOT_ACTIVATED', label: 'Chưa kích hoạt' },
          { id: 'ACTIVATED', label: 'Đang hoạt động' },
          { id: 'EXPIRED', label: 'Đã hết hạn' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setFilter(tab.id);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === tab.id
                ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
                : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#141414',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '12px 16px',
            flex: 1,
            minWidth: '200px',
          }}
        >
          <Search size={18} color="rgba(255,255,255,0.3)" />
          <input
            type="text"
            placeholder="Tìm mã vé..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              fontFamily: '"Inter", sans-serif',
            }}
          />
        </div>

        <select
          value={selectedMovieTitle}
          onChange={(e) => {
            setSelectedMovieTitle(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-[#141414] border border-white/10 text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{
            padding: '12px 8px 12px 16px',
            minWidth: '120px',
            borderRadius: '12px',
          }}
        >
          <option value="">Tất cả phim</option>
          {uniqueMovies.map((m, idx) => (
            <option key={idx} value={m.title}>
              {m.title}
            </option>
          ))}
        </select>

        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="bg-[#141414] border border-white/10 text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{
            padding: '12px 8px 12px 16px',
            minWidth: '120px',
            borderRadius: '12px',
          }}
        >
          {[5, 6, 7, 10, 15, 20, 30].map((size) => (
            <option key={size} value={size}>
              {size} / trang
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          background: '#141414',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#9D9D9D]">
            <thead className="bg-[#18181b] text-xs uppercase text-[#9D9D9D]">
              <tr>
                <th className="px-6 py-4">Mã Vé</th>
                <th className="px-6 py-4">Phim</th>
                <th className="px-6 py-4">Khách Hàng (Người mua)</th>
                <th className="px-6 py-4">Thời Gian Vé Tồn Tại</th>
                <th className="px-6 py-4">Tiến Trình (Đã xem)</th>
                <th className="px-6 py-4">Thời Gian Còn Lại</th>
                <th className="px-6 py-4">Trạng Thái</th>
                <th className="px-6 py-4 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    <div className="flex justify-center mb-2">
                      <span className="material-symbols-outlined animate-spin text-[#dc2626]">
                        sync
                      </span>
                    </div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : currentTickets.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Không có vé nào phù hợp.
                  </td>
                </tr>
              ) : (
                currentTickets.map((ticket) => {
                  const expired = isExpired(ticket);
                  return (
                    <tr
                      key={ticket.id}
                      className="border-b border-white/10 hover:bg-white/5"
                    >
                      <td className="px-6 py-4 font-bold text-white tracking-widest whitespace-nowrap">
                        {ticket.ticketCode}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {ticket.movie?.posterUrl ? (
                            <>
                              <img
                                src={ticket.movie.posterUrl}
                                alt="Poster"
                                className="w-10 h-14 object-cover rounded shadow"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-10 h-14 bg-white/10 rounded items-center justify-center hidden">
                                <span className="material-symbols-outlined text-gray-500 text-[20px]">
                                  movie
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="w-10 h-14 bg-white/10 rounded flex items-center justify-center">
                              <span className="material-symbols-outlined text-gray-500 text-[20px]">
                                movie
                              </span>
                            </div>
                          )}
                          <span
                            className="font-semibold text-white max-w-[150px] truncate"
                            title={ticket.movie?.title}
                          >
                            {ticket.movie?.title || 'Phim đã xóa'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">
                            {ticket.user?.fullName || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {ticket.user?.email || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium font-mono">
                          {(() => {
                            if (!ticket.activatedAt) return '00:00:00';
                            const remaining =
                              ticket.timeLimitMinutes * 60 -
                              (ticket.consumedTimeSeconds || 0);
                            const h = Math.floor(Math.max(0, remaining) / 3600);
                            const m = Math.floor(
                              (Math.max(0, remaining) % 3600) / 60
                            );
                            const s = Math.floor(Math.max(0, remaining) % 60);
                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">
                          {ticket.watchPosition
                            ? `${Math.floor(ticket.watchPosition / 60)}p${ticket.watchPosition % 60}s`
                            : '0p0s'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {!ticket.activatedAt ? (
                          <span className="text-gray-500 italic whitespace-nowrap">
                            Chưa kích hoạt
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span
                              className={`font-mono font-bold whitespace-nowrap ${expired ? 'text-[#dc2626]' : 'text-emerald-400'}`}
                            >
                              {getCountdown(ticket.expiresAt)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ticket.isBanned ? (
                          <span className="rounded-full bg-[#dc2626]/20 px-2.5 py-1 text-xs font-semibold text-[#dc2626] border border-[#dc2626]/20 whitespace-nowrap">
                            Đã Khóa
                          </span>
                        ) : !ticket.activatedAt ? (
                          <span className="rounded-full bg-gray-500/20 px-2.5 py-1 text-xs font-semibold text-[#9D9D9D] border border-gray-500/20 whitespace-nowrap">
                            Chưa Dùng
                          </span>
                        ) : expired ? (
                          <span className="rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-semibold text-yellow-400 border border-yellow-500/20 whitespace-nowrap">
                            Hết Hạn
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                            Đang Xem
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all font-semibold text-sm inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            visibility
                          </span>
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Container */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalElements={filteredTickets.length}
          itemsPerPage={itemsPerPage}
        />
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#111111] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#18181b]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#dc2626]">
                  confirmation_number
                </span>
                Chi Tiết Vé #{selectedTicket.ticketCode}
              </h2>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-[#9D9D9D] hover:text-white transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Thông tin vé */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">
                    Thông tin giao dịch
                  </h3>
                  <div>
                    <p className="text-xs text-gray-500">Người mua (Chủ vé):</p>
                    <div className="flex flex-col mt-1">
                      <span className="text-white font-medium">
                        {selectedTicket.user?.fullName}
                      </span>
                      <span className="text-[#9D9D9D] text-sm break-all">
                        {selectedTicket.user?.email}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phim:</p>
                    <p className="text-white font-medium">
                      {selectedTicket.movie?.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      Giá vé / Thời lượng tối đa:
                    </p>
                    <p className="text-white font-medium">
                      {selectedTicket.price?.toLocaleString()} VND /{' '}
                      {selectedTicket.timeLimitMinutes} Phút
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ngày mua:</p>
                    <p className="text-white font-medium">
                      {new Date(selectedTicket.purchaseTime).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Thông tin phiên xem */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">
                    Trạng thái phiên xem
                  </h3>
                  <div>
                    <p className="text-xs text-gray-500">
                      Trạng thái Kích Hoạt:
                    </p>
                    <p className="text-white font-medium">
                      {selectedTicket.activatedAt
                        ? `Đã kích hoạt lúc ${new Date(selectedTicket.activatedAt).toLocaleString()}`
                        : 'Chưa kích hoạt'}
                    </p>
                  </div>

                  {selectedTicket.activatedAt && (
                    <>
                      <div>
                        <p className="text-xs text-gray-500">
                          Người đang xem (Share/Guest):
                        </p>
                        {selectedTicket.currentViewer ? (
                          <div className="flex items-start gap-3 mt-1 w-full">
                            <span className="material-symbols-outlined text-emerald-500 text-[24px] shrink-0 mt-0.5">
                              account_circle
                            </span>
                            <div className="flex flex-col">
                              <span className="text-emerald-400 font-bold">
                                {selectedTicket.currentViewer.fullName}
                              </span>
                              <span className="text-[#9D9D9D] text-sm break-all">
                                {selectedTicket.currentViewer.email}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">
                            Không có phiên đang hoạt động hoặc đã thoát
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">IP Address:</p>
                        <p className="text-[#9D9D9D] font-mono text-xs break-all bg-white/5 p-2 rounded mt-1">
                          {selectedTicket.ipAddress || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          Thời gian còn lại:
                        </p>
                        <p
                          className={`font-mono font-bold text-lg ${isExpired(selectedTicket) ? 'text-[#dc2626]' : 'text-emerald-400'}`}
                        >
                          {getCountdown(selectedTicket.expiresAt)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-white/10 bg-[#18181b] flex justify-end gap-3 flex-wrap">
              {(selectedTicket.activatedAt || isExpired(selectedTicket)) && (
                <button
                  onClick={() => handleResetTicket(selectedTicket)}
                  className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all font-bold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    restart_alt
                  </span>
                  Reset Vé
                </button>
              )}

              <button
                onClick={() => handleToggleBan(selectedTicket)}
                className={`px-4 py-2 rounded-lg transition-all font-bold flex items-center gap-2 ${
                  selectedTicket.isBanned
                    ? 'bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:bg-emerald-600'
                    : 'bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)] hover:bg-[#c01f45]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {selectedTicket.isBanned ? 'lock_open' : 'block'}
                </span>
                {selectedTicket.isBanned ? 'Mở Khóa Vé' : 'Khóa Khẩn Cấp'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Modal */}
      {confirmModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '28px 32px',
              maxWidth: '440px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `${confirmModal.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: confirmModal.color, fontSize: '22px' }}
                >
                  warning
                </span>
              </div>
              <h3
                style={{
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {confirmModal.title}
              </h3>
            </div>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                lineHeight: 1.6,
                margin: '0 0 24px 0',
              }}
            >
              {confirmModal.message}
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={() =>
                  !isProcessing &&
                  setConfirmModal((prev) => ({ ...prev, open: false }))
                }
                disabled={isProcessing}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={!isProcessing ? confirmModal.onConfirm : undefined}
                disabled={isProcessing}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: confirmModal.color,
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isProcessing ? 'wait' : 'pointer',
                  opacity: isProcessing ? 0.7 : 1,
                  boxShadow: isProcessing
                    ? 'none'
                    : `0 4px 14px ${confirmModal.color}40`,
                  transition: 'all 0.2s',
                }}
              >
                {isProcessing ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activation History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#18181b] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#18181b]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">
                  history
                </span>
                Lịch Sử Kích Hoạt Vé
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-[#9D9D9D] hover:text-white transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-sm text-[#9D9D9D]">
                <thead className="bg-[#27272a] text-xs uppercase text-[#9D9D9D]">
                  <tr>
                    <th className="px-6 py-4">Mã Vé</th>
                    <th className="px-6 py-4">Username (Người kích hoạt)</th>
                    <th className="px-6 py-4">Tên Phim</th>
                    <th className="px-6 py-4">Thời Gian Kích Hoạt</th>
                    <th className="px-6 py-4">Tên Thiết Bị</th>
                    <th className="px-6 py-4">Địa Chỉ IP</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        <div className="flex justify-center mb-2">
                          <span className="material-symbols-outlined animate-spin text-blue-400">
                            sync
                          </span>
                        </div>
                        Đang tải lịch sử...
                      </td>
                    </tr>
                  ) : activationHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        Chưa có lịch sử kích hoạt nào.
                      </td>
                    </tr>
                  ) : (
                    activationHistory.map((h, idx) => (
                      <tr
                        key={h.id || idx}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="px-6 py-4 font-bold text-white tracking-widest whitespace-nowrap">
                          {h.ticketCode}
                        </td>
                        <td className="px-6 py-4 text-emerald-400 font-medium">
                          {h.username}
                        </td>
                        <td
                          className="px-6 py-4 text-white font-semibold max-w-[200px] truncate"
                          title={h.movieName}
                        >
                          {h.movieName}
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-mono">
                          {h.activatedAt
                            ? new Date(h.activatedAt).toLocaleString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {h.deviceInfo || 'Máy tính Windows (Edge)'}
                        </td>
                        <td className="px-6 py-4 font-mono text-[#9D9D9D]">
                          {h.ipAddress || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
