import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Film, Search, Plus, Edit2, Eye, EyeOff } from 'lucide-react';
import CreateMoviePage from './CreateMoviePage';
import { useMovieManagement } from '../hooks/useMovieManagement';
import Pagination from '../../../shared/components/Pagination';
import { useToastStore } from '../hooks/useToastStore';

const statusConfig = {
  showing: {
    label: 'Đang chiếu',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  upcoming: {
    label: 'Sắp chiếu',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
  },
  ended: {
    label: 'Đã kết thúc',
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.1)',
  },
  NOW_SHOWING: {
    label: 'Đang chiếu',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  COMING_SOON: {
    label: 'Sắp chiếu',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
  },
  ENDED: {
    label: 'Đã kết thúc',
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.1)',
  },
};

export default function MovieManagementPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const { movies, loading, toggleMovieVisibility, addMovie, editMovie } =
    useMovieManagement();
  const [viewState, setViewState] = useState({ mode: 'list', movie: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, CINEMA, ONLINE
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [, setPageInputVal] = useState('1');
  const addToast = useToastStore((state) => state.addToast);

  const resetKey1 = JSON.stringify([currentPage]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    setPageInputVal(currentPage.toString());
  }

  const filteredMovies = movies.filter((m) => {
    const matchSearch =
      (m.title && m.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.genre && m.genre.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchStatus = true;
    if (filterStatus !== 'ALL') {
      const s = m.status ? m.status.toUpperCase() : '';
      if (
        filterStatus === 'NOW_SHOWING' &&
        (s === 'NOW_SHOWING' || s === 'SHOWING')
      )
        matchStatus = true;
      else if (
        filterStatus === 'COMING_SOON' &&
        (s === 'COMING_SOON' || s === 'UPCOMING')
      )
        matchStatus = true;
      else if (filterStatus === 'ENDED' && s === 'ENDED') matchStatus = true;
      else matchStatus = false;
    }

    let matchType = true;
    if (filterType === 'CINEMA') {
      matchType = m.isCinemaAvailable !== false;
    } else if (filterType === 'ONLINE') {
      matchType = m.isOnlineAvailable === true;
    } else if (filterType === 'CINEMA_ONLY') {
      matchType = m.isCinemaAvailable !== false;
    }

    return matchSearch && matchStatus && matchType;
  });

  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage) || 1;
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetKey2 = JSON.stringify([
    searchTerm,
    filterStatus,
    filterType,
    itemsPerPage,
    movies.length,
  ]);
  const [previousResetKey2, setPreviousResetKey2] = useState(null);
  if (previousResetKey2 !== resetKey2) {
    setPreviousResetKey2(resetKey2);
    setCurrentPage(1);
  }

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'create-movie') {
        setViewState({ mode: 'create', movie: null });
      } else if (action === 'edit-movie') {
        const id = params.get('id');
        const movie = movies.find((m) => m.id === parseInt(id));
        setViewState({ mode: 'edit', movie: movie || null });
      } else {
        setViewState({ mode: 'list', movie: null });
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [movies]);

  const changeView = (mode, movie = null) => {
    setViewState({ mode, movie });
    const url = new URL(window.location.href);
    if (mode === 'create') {
      url.searchParams.set('action', 'create-movie');
      url.searchParams.delete('id');
    } else if (mode === 'edit') {
      url.searchParams.set('action', 'edit-movie');
      url.searchParams.set('id', movie.id);
    } else {
      url.searchParams.delete('action');
      url.searchParams.delete('id');
    }
    window.history.pushState({}, '', url);
  };

  const handleToggleVisibility = async (id) => {
    const result = await toggleMovieVisibility(id);
    if (!result.success) {
      addToast({
        message: `Cập nhật thất bại: ${result.message}`,
        type: 'error',
      });
    }
  };

  if (viewState.mode === 'create' || viewState.mode === 'edit') {
    return (
      <CreateMoviePage
        onBack={() => changeView('list')}
        initialData={viewState.movie}
        onSave={async (formData) => {
          let result;
          if (viewState.mode === 'edit') {
            result = await editMovie(viewState.movie.id, formData);
          } else {
            result = await addMovie(formData);
          }
          if (result.success) {
            changeView('list');
          }
          return result;
        }}
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
            <Film size={22} color="#fff" />
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
              Quản lí Phim
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                margin: '2px 0 0 0',
              }}
            >
              {movies.length} phim trong hệ thống
            </p>
          </div>
        </div>
        <>
          {!isStaff && (
            <button
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
              Thêm phim mới
            </button>
          )}
        </>
      </div>

      {/* Tabs for Filter Status */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => {
            setFilterStatus('ALL');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filterStatus === 'ALL'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Tất cả trạng thái
        </button>
        <button
          onClick={() => {
            setFilterStatus('NOW_SHOWING');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filterStatus === 'NOW_SHOWING'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Đang chiếu
        </button>
        <button
          onClick={() => {
            setFilterStatus('COMING_SOON');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filterStatus === 'COMING_SOON'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Sắp chiếu
        </button>
        <button
          onClick={() => {
            setFilterStatus('ENDED');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filterStatus === 'ENDED'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Đã kết thúc
        </button>
      </div>

      {/* Controls: Search, Filter, Limit */}
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
            placeholder="Tìm kiếm phim theo tên, thể loại..."
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
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{ padding: '12px 16px', minWidth: '160px' }}
        >
          <option value="ALL">Tất cả phim</option>
          <option value="CINEMA">Phim chiếu rạp</option>
          <option value="ONLINE">Phim trực tuyến</option>
        </select>

        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="px-3 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{ padding: '12px 16px', minWidth: '120px' }}
        >
          {[5, 10, 15, 20].map((size) => (
            <option key={size} value={size}>
              {size} / trang
            </option>
          ))}
        </select>
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
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <colgroup>
            <col style={{ width: '64px' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '130px' }} />
            {!isStaff && <col style={{ width: '90px' }} />}
          </colgroup>
          <thead>
            <tr>
              {[
                'Poster',
                'Tên phim',
                'Thể loại',
                'Thời lượng',
                'Trạng thái',
                'Thao tác',
              ]
                .filter((h) => !isStaff || h !== 'Thao tác')
                .map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '14px 20px',
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
            ) : (
              paginatedMovies.map((m) => {
                const status =
                  statusConfig[m.status] || statusConfig['showing'];
                return (
                  <tr
                    key={m.id}
                    style={{ transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '60px',
                          borderRadius: '6px',
                          background: '#2a2a2a',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {m.posterUrl ? (
                          <img
                            src={m.posterUrl}
                            alt={m.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          style={{
                            display: m.posterUrl ? 'none' : 'flex',
                            color: 'rgba(255,255,255,0.2)',
                          }}
                        >
                          <Film size={16} />
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#fff',
                      }}
                    >
                      {m.title}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        title={m.genre}
                        style={{
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                      >
                        {m.genre}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {m.duration}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: status.color,
                          background: status.bg,
                          padding: '4px 10px',
                          borderRadius: '20px',
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <>
                      {!isStaff && (
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                              onClick={() => changeView('edit', m)}
                              title="Sửa"
                              className="action-btn edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleVisibility(m.id)}
                              title={m.isHidden ? 'Hiện phim' : 'Ẩn phim'}
                              className={`action-btn ${m.isHidden ? 'hide' : 'edit'}`}
                            >
                              {m.isHidden ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalElements={filteredMovies.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}
