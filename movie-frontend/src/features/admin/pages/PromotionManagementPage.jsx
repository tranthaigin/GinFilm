import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Gift, Search, Plus, Edit2, Eye, EyeOff, X, Image as ImageIcon } from 'lucide-react';
import CreatePromotionPage from './CreatePromotionPage';
import { usePromotionManagement } from '../hooks/usePromotionManagement';
import Pagination from '../../../shared/components/Pagination';
import { useToastStore } from '../hooks/useToastStore';

const statusConfig = {
  active: { label: 'Đang diễn ra', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  upcoming: { label: 'Sắp diễn ra', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  ended: { label: 'Đã kết thúc', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

export default function PromotionManagementPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const { promotions, loading, addPromotion, editPromotion, togglePromotionVisibility } = usePromotionManagement();
  const [viewState, setViewState] = useState({ mode: 'list', data: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('active');
  const addToast = useToastStore((state) => state.addToast);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const filteredPromotions = promotions.filter(p => {
    const matchSearch = (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) || 
                        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchSearch) return false;

    const isExpiredOrHidden = p.status === 'ended' || p.isHidden;
    return filterMode === 'active' ? !isExpiredOrHidden : isExpiredOrHidden;
  });

  const handleToggleVisibility = async (id) => {
    const result = await togglePromotionVisibility(id);
    if (!result.success) {
      addToast({ message: `Cập nhật trạng thái thất bại: ${result.message}`, type: 'error' });
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const currentPromotions = filteredPromotions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    if (currentPage + 2 < totalPages) {
      pages.push(currentPage, currentPage + 1, '...', totalPages);
    } else if (currentPage + 2 === totalPages) {
      pages.push(currentPage, currentPage + 1, totalPages);
    } else if (currentPage + 1 === totalPages) {
      pages.push(currentPage, totalPages);
    } else {
      pages.push(totalPages);
    }

    return (
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-2 py-1 rounded text-[#9D9D9D] hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="font-bold text-lg">{'<'}</span>
        </button>
        
        {pages.map((p, idx) => (
          <button
            key={idx}
            onClick={() => p !== '...' && setCurrentPage(p)}
            disabled={p === '...'}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              p === currentPage 
                ? 'bg-[#dc2626] text-white' 
                : p === '...' 
                  ? 'text-gray-500 cursor-default' 
                  : 'text-[#9D9D9D] hover:bg-white/10 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}

        <button 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-2 py-1 rounded text-[#9D9D9D] hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="font-bold text-lg">{'>'}</span>
        </button>
      </div>
    );
  };


  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'create-promotion') {
        setViewState({ mode: 'create', data: null });
      } else if (action === 'edit-promotion') {
        const id = params.get('id');
        const promotion = promotions.find(p => p.id === parseInt(id));
        setViewState({ mode: 'edit', data: promotion || null });
      } else {
        setViewState({ mode: 'list', data: null });
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [promotions]);

  const changeView = (mode, data = null) => {
    setViewState({ mode, data });
    const url = new URL(window.location.href);
    if (mode === 'create') {
      url.searchParams.set('action', 'create-promotion');
      url.searchParams.delete('id');
    } else if (mode === 'edit') {
      url.searchParams.set('action', 'edit-promotion');
      url.searchParams.set('id', data.id);
    } else {
      url.searchParams.delete('action');
      url.searchParams.delete('id');
    }
    window.history.pushState({}, '', url);
  };

  const handleSave = async (formData) => {
    let result;
    if (viewState.mode === 'create') {
      result = await addPromotion(formData);
    } else {
      result = await editPromotion(viewState.data.id, formData);
    }
    if (result.success) {
      changeView('list');
    }
    return result;
  };

  if (viewState.mode === 'create' || viewState.mode === 'edit') {
    return (
      <CreatePromotionPage 
        onBack={() => changeView('list')} 
        initialData={viewState.data} 
        onSave={handleSave} 
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <Gift size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Quản lí Ưu Đãi
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '2px 0 0 0' }}>
              {promotions.length} chương trình khuyến mãi
            </p>
          </div>
        </div>
        <>{!isStaff && (
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
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(220,38,38,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,38,38,0.3)';
          }}
        >
          <Plus size={16} />
          Thêm ưu đãi
        </button>
      )}</>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setFilterMode('active')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filterMode === 'active' 
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]' 
              : 'bg-black/5 text-gray-600 hover:bg-black/10 hover:text-black dark:bg-white/5 dark:text-[#9D9D9D] dark:hover:bg-white/10 dark:hover:text-white'
          }`}
        >
          Đang áp dụng
        </button>
        <button
          onClick={() => setFilterMode('expired')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filterMode === 'expired' 
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]' 
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Hết hạn / Đã ẩn
        </button>
      </div>

      {/* Search and Items per page */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
            minWidth: '200px'
          }}
        >
          <Search size={18} color="rgba(255,255,255,0.3)" />
          <input
            type="text"
            placeholder="Tìm kiếm ưu đãi, mã giảm giá..."
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
        
        <select
          value={itemsPerPage}
          onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          className="px-3 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{ padding: '12px 16px', minWidth: '120px' }}
        >
          {[5, 6, 7, 10, 15, 20, 30].map(size => (
            <option key={size} value={size}>{size} / trang</option>
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Hình ảnh', 'Tên ưu đãi', 'Mã Code', 'Mức giảm', 'Trạng thái', 'Thao tác'].filter(h => !isStaff || h !== 'Thao tác').map((h) => (
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
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>Đang tải dữ liệu...</td>
              </tr>
            ) : currentPromotions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Không tìm thấy ưu đãi nào</td>
              </tr>
            ) : currentPromotions.map((p) => {
              const status = statusConfig[p.status] || statusConfig['active'];
              return (
                <tr
                  key={p.id}
                  style={{ transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ width: '80px', height: '45px', borderRadius: '6px', background: '#2a2a2a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      ) : null}
                      <div style={{ display: p.imageUrl ? 'none' : 'flex', color: 'rgba(255,255,255,0.2)' }}>
                        <ImageIcon size={20} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: '#fff' }}>{p.title}</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                    {p.code ? (
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        {p.code}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                    {p.discount !== null && p.discount !== undefined ? `${p.discount}%` : '0%'}
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
                  <>{!isStaff && (
                <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => changeView('edit', p)}
                        title="Sửa"
                        className="action-btn edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(p.id)}
                        title={p.isHidden ? "Hiện" : "Ẩn"}
                        className={`action-btn ${p.isHidden ? 'hide' : 'edit'}`}
                      >
                        {p.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </td>
              )}</>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalElements={filteredPromotions.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}
