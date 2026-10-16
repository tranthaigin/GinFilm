import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Tag, Search, Plus, Edit2, Eye, EyeOff } from 'lucide-react';
import CreateTicketPricePage from './CreateTicketPricePage';
import ticketPriceApi from '../api/ticketPriceApi';
import { useToastStore } from '../hooks/useToastStore';
import Pagination from '../../../shared/components/Pagination';

// Label hiển thị cho các enum
const AUDIENCE_LABELS = {
  ADULT: 'Người lớn',
  STUDENT: 'Học sinh/SV',
  CHILD: 'Trẻ em',
  SENIOR: 'Người cao tuổi',
};

const SEAT_LABELS = {
  NORMAL: 'Thường',
  VIP: 'VIP',
  SWEETBOX: 'Ghế đôi',
  BED: 'Giường nằm',
};

const ROOM_LABELS = {
  LO_RAP: 'Rạp tiêu chuẩn (LoRap)',
  LO_BED: 'Rạp giường nằm (LoBed)',
  LO_SCREEN_X: 'Rạp ScreenX (LoScreenX)',
};

const DAY_LABELS = {
  WEEKDAY: 'Ngày thường',
  WEEKEND: 'Cuối tuần',
  HOLIDAY: 'Ngày lễ',
};

const statusConfig = {
  ACTIVE: {
    label: 'Đang áp dụng',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  INACTIVE: {
    label: 'Không áp dụng',
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.1)',
  },
  HIDDEN: { label: 'Đã ẩn', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

const formatPrice = (price) =>
  price ? `${new Intl.NumberFormat('vi-VN').format(price)}đ` : '—';

export default function TicketPriceManagementPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const [ticketPrices, setTicketPrices] = useState([]);

  const [viewState, setViewState] = useState({ mode: 'list', data: null });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [filterAudience, setFilterAudience] = useState('ALL');
  const [filterSeat, setFilterSeat] = useState('ALL');
  const [filterRoom, setFilterRoom] = useState('ALL');
  const [filterDay, setFilterDay] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const addToast = useToastStore((state) => state.addToast);

  const filteredPrices = ticketPrices.filter((tp) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (AUDIENCE_LABELS[tp.audienceType] || '').toLowerCase().includes(term) ||
      (SEAT_LABELS[tp.seatType] || '').toLowerCase().includes(term) ||
      (DAY_LABELS[tp.dayType] || '').toLowerCase().includes(term) ||
      (ROOM_LABELS[tp.roomType] || '').toLowerCase().includes(term);

    const matchAudience =
      filterAudience === 'ALL' || tp.audienceType === filterAudience;
    const matchSeat = filterSeat === 'ALL' || tp.seatType === filterSeat;
    const matchRoom = filterRoom === 'ALL' || tp.roomType === filterRoom;
    const matchDay = filterDay === 'ALL' || tp.dayType === filterDay;
    const matchStatus = filterStatus === 'ALL' || tp.status === filterStatus;

    return (
      matchSearch &&
      matchAudience &&
      matchSeat &&
      matchRoom &&
      matchDay &&
      matchStatus
    );
  });

  const resetKey1 = JSON.stringify([
    searchTerm,
    filterAudience,
    filterSeat,
    filterRoom,
    filterDay,
    filterStatus,
    pageSize,
  ]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filteredPrices.length / pageSize));
  const paginatedPrices = filteredPrices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');

      setViewState((prev) => {
        if (action === 'create-ticket-price') {
          if (prev.mode === 'create') return prev;
          return { mode: 'create', data: null };
        } else if (action === 'edit-ticket-price') {
          const id = params.get('id');
          const price = ticketPrices.find((tp) => tp.id === parseInt(id));
          if (prev.mode === 'edit' && prev.data?.id === price?.id) return prev;
          return { mode: 'edit', data: price || null };
        } else {
          if (prev.mode === 'list') return prev;
          return { mode: 'list', data: null };
        }
      });
    };
    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [ticketPrices]);

  const fetchTicketPrices = useCallback(() => {
    return ticketPriceApi
      .getAllTicketPrices()
      .then((data) => {
        const offlinePrices = data.filter(
          (tp) => tp.roomType !== 'ONLINE' && tp.seatType !== 'ONLINE'
        );
        setTicketPrices(offlinePrices);
      })
      .catch((error) => {
        console.error('Failed to fetch ticket prices:', error);
        addToast({
          message: 'Không thể tải dữ liệu giá vé. Vui lòng thử lại sau.',
          type: 'error',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [addToast]);

  const loadKey1 = JSON.stringify([]);
  const [previousLoadKey1, setPreviousLoadKey1] = useState(null);
  if (previousLoadKey1 !== loadKey1) {
    setPreviousLoadKey1(loadKey1);
    setLoading(true);
  }

  useEffect(() => {
    fetchTicketPrices();
  }, [fetchTicketPrices]);

  const changeView = (mode, data = null) => {
    setViewState({ mode, data });
    const url = new URL(window.location.href);
    if (mode === 'create' || mode === 'create-online') {
      url.searchParams.set(
        'action',
        mode === 'create-online'
          ? 'create-ticket-price-online'
          : 'create-ticket-price'
      );
      url.searchParams.delete('id');
    } else if (mode === 'edit') {
      url.searchParams.set('action', 'edit-ticket-price');
      url.searchParams.set('id', data.id);
    } else {
      url.searchParams.delete('action');
      url.searchParams.delete('id');
    }
    window.history.pushState({}, '', url);
  };

  const handleSave = async (formData) => {
    try {
      if (viewState.mode === 'create' || viewState.mode === 'create-online') {
        await ticketPriceApi.createTicketPrice(formData);
        addToast({ message: 'Tạo giá vé thành công!', type: 'success' });
      } else {
        await ticketPriceApi.updateTicketPrice(viewState.data.id, formData);
        addToast({ message: 'Cập nhật giá vé thành công!', type: 'success' });
      }
      changeView('list');
      ((...args) => {
        setLoading(true);
        return fetchTicketPrices(...args);
      })();
    } catch (error) {
      console.error('Save failed:', error);
      addToast({
        message: 'Lưu dữ liệu thất bại. Vui lòng kiểm tra lại.',
        type: 'error',
      });
    }
  };

  const handleBatchSave = async (formDataList) => {
    try {
      await Promise.all(
        formDataList.map((data) => ticketPriceApi.createTicketPrice(data))
      );
      addToast({
        message: `Tạo thành công ${formDataList.length} giá vé!`,
        type: 'success',
      });
      changeView('list');
      ((...args) => {
        setLoading(true);
        return fetchTicketPrices(...args);
      })();
    } catch (error) {
      console.error('Batch save failed:', error);
      addToast({
        message: 'Lưu dữ liệu hàng loạt thất bại. Vui lòng kiểm tra lại.',
        type: 'error',
      });
    }
  };

  const handleToggleHidden = async (id) => {
    try {
      const priceToUpdate = ticketPrices.find((tp) => tp.id === id);
      const nextStatus =
        priceToUpdate.status === 'HIDDEN' ? 'ACTIVE' : 'HIDDEN';
      await ticketPriceApi.changeStatus(id, nextStatus);
      addToast({ message: 'Cập nhật trạng thái thành công!', type: 'success' });
      ((...args) => {
        setLoading(true);
        return fetchTicketPrices(...args);
      })();
    } catch (error) {
      console.error('Change status failed:', error);
      addToast({
        message: 'Lỗi khi cập nhật trạng thái giá vé',
        type: 'error',
      });
    }
  };

  if (
    viewState.mode === 'create' ||
    viewState.mode === 'create-online' ||
    viewState.mode === 'edit'
  ) {
    return (
      <CreateTicketPricePage
        onBack={() => changeView('list')}
        initialData={viewState.data}
        onSave={handleSave}
        onBatchSave={handleBatchSave}
        isOnlineMode={
          viewState.mode === 'create-online' ||
          (viewState.data && viewState.data.roomType === 'ONLINE')
        }
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
            <Tag size={22} color="#fff" />
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
              Quản lí Giá Vé
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                margin: '2px 0 0 0',
              }}
            >
              {ticketPrices.length} mức giá vé đang được cấu hình
            </p>
          </div>
        </div>
        {!isStaff && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              id="btn-add-ticket-price"
              onClick={() => changeView('create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", sans-serif',
                boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 16px rgba(220,38,38,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(220,38,38,0.3)';
              }}
            >
              <Plus size={16} />
              Giá Vé Rạp
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#141414',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '12px 16px',
            }}
          >
            <Search size={18} color="rgba(255,255,255,0.3)" />
            <input
              type="text"
              placeholder="Tìm kiếm theo đối tượng, loại ghế, phòng chiếu, ngày..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Dropdown for page size */}
          <div style={{ position: 'relative' }}>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                height: '100%',
                background: '#141414',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '0 36px 0 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                appearance: 'none',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / TRANG
                </option>
              ))}
            </select>
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            {
              label: 'Đối tượng',
              value: filterAudience,
              setter: setFilterAudience,
              options: AUDIENCE_LABELS,
            },
            {
              label: 'Loại ghế',
              value: filterSeat,
              setter: setFilterSeat,
              options: SEAT_LABELS,
            },
            {
              label: 'Phòng chiếu',
              value: filterRoom,
              setter: setFilterRoom,
              options: ROOM_LABELS,
            },
            {
              label: 'Ngày áp dụng',
              value: filterDay,
              setter: setFilterDay,
              options: DAY_LABELS,
            },
            {
              label: 'Trạng thái',
              value: filterStatus,
              setter: setFilterStatus,
              options: {
                ACTIVE: 'Đang áp dụng',
                INACTIVE: 'Không áp dụng',
                HIDDEN: 'Đã ẩn',
              },
            },
          ].map((filter, idx) => (
            <div
              key={idx}
              style={{ position: 'relative', flex: 1, minWidth: '130px' }}
            >
              <select
                value={filter.value}
                onChange={(e) => filter.setter(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  background: '#141414',
                  color:
                    filter.value === 'ALL' ? 'rgba(255,255,255,0.5)' : '#fff',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '0 32px 0 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  appearance: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">{filter.label}</option>
                {Object.entries(filter.options).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#141414',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                'Đối tượng',
                'Loại ghế',
                'Phòng chiếu',
                'Ngày áp dụng',
                'Giá vé',
                'Hiệu lực',
                'Trạng thái',
                'Thao tác',
              ]
                .filter((h) => !isStaff || h !== 'Thao tác')
                .map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '14px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#fff',
                  }}
                >
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : filteredPrices.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '13px',
                  }}
                >
                  Không tìm thấy giá vé phù hợp
                </td>
              </tr>
            ) : (
              paginatedPrices.map((tp) => {
                const stCfg = statusConfig[tp.status] || statusConfig['ACTIVE'];
                const isHidden = tp.status === 'HIDDEN';
                return (
                  <tr
                    key={tp.id}
                    style={{ transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#fff',
                      }}
                    >
                      {AUDIENCE_LABELS[tp.audienceType] || tp.audienceType}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.8)',
                      }}
                    >
                      {SEAT_LABELS[tp.seatType] || tp.seatType}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.8)',
                      }}
                    >
                      {ROOM_LABELS[tp.roomType] || tp.roomType}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.8)',
                      }}
                    >
                      {tp.roomType === 'ONLINE' || tp.seatType === 'ONLINE'
                        ? 'Tất cả các ngày'
                        : DAY_LABELS[tp.dayType] || tp.dayType}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '14px',
                        color: '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      {formatPrice(tp.price)}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {tp.effectiveFrom ? tp.effectiveFrom : '—'}
                      {tp.effectiveTo ? ` → ${tp.effectiveTo}` : ''}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: stCfg.color,
                          background: stCfg.bg,
                          padding: '4px 10px',
                          borderRadius: '20px',
                        }}
                      >
                        {stCfg.label}
                      </span>
                    </td>
                    <>
                      {!isStaff && (
                        <td style={{ padding: '14px 16px' }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'center',
                            }}
                          >
                            <button
                              onClick={() => changeView('edit', tp)}
                              title="Sửa"
                              className="action-btn edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleToggleHidden(tp.id)}
                              title={isHidden ? 'Hiện lại' : 'Ẩn đi'}
                              className={`action-btn ${isHidden ? 'lock' : 'hide'}`}
                            >
                              {isHidden ? (
                                <EyeOff size={15} />
                              ) : (
                                <Eye size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalElements={filteredPrices.length}
          itemsPerPage={pageSize}
        />
      )}
    </div>
  );
}
