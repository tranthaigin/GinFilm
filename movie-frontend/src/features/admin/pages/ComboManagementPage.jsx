import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Coffee, Search, Plus, Edit2, Eye, EyeOff, X, Package, Trash2 } from 'lucide-react';
import CreateComboPage from './CreateComboPage';
import { useComboManagement } from '../hooks/useComboManagement';
import { useToastStore } from '../hooks/useToastStore';
import Pagination from '../../../shared/components/Pagination';

const statusConfig = {
  IN_STOCK: { label: 'Còn hàng', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  OUT_OF_STOCK: { label: 'Hết hàng', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  in_stock: { label: 'Còn hàng', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  out_of_stock: { label: 'Hết hàng', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
};

export default function ComboManagementPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const { combos, loading, toggleComboHide, addCombo, editCombo, deleteCombo } = useComboManagement();
  const addToast = useToastStore((state) => state.addToast);
  const [viewState, setViewState] = useState({ mode: 'list', data: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDiscount, setFilterDiscount] = useState('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const filteredCombos = combos.filter(c => {
    const matchSearch = (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.type && c.type.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
    const matchDiscount = filterDiscount === 'ALL' ||
      (filterDiscount === 'DISCOUNT' && c.discountPercent > 0) ||
      (filterDiscount === 'NO_DISCOUNT' && (!c.discountPercent || c.discountPercent === 0));
    return matchSearch && matchStatus && matchDiscount;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterDiscount, itemsPerPage]);

  const totalPages = Math.ceil(filteredCombos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCombos = filteredCombos.slice(startIndex, startIndex + itemsPerPage);

  const handleToggleVisibility = async (id) => {
    const result = await toggleComboHide(id);
    if (!result.success) {
      addToast({ message: `Cập nhật thất bại: ${result.message}`, type: 'error' });
    }
  };

  const handleDeleteCombo = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn combo này?')) {
      const result = await deleteCombo(id);
      if (!result.success) {
        addToast({ message: `Xóa thất bại: ${result.message}`, type: 'error' });
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'create-combo') {
        setViewState({ mode: 'create', data: null });
      } else if (action === 'edit-combo') {
        const id = params.get('id');
        const combo = combos.find(c => c.id === id);
        setViewState({ mode: 'edit', data: combo || null });
      } else {
        setViewState({ mode: 'list', data: null });
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [combos]);

  const changeView = (mode, data = null) => {
    setViewState({ mode, data });
    const url = new URL(window.location.href);
    if (mode === 'create') {
      url.searchParams.set('action', 'create-combo');
      url.searchParams.delete('id');
    } else if (mode === 'edit') {
      url.searchParams.set('action', 'edit-combo');
      url.searchParams.set('id', data.id);
    } else {
      url.searchParams.delete('action');
      url.searchParams.delete('id');
    }
    window.history.pushState({}, '', url);
  };

  const handleSave = async (formData, imageFile) => {
    let result;
    if (viewState.mode === 'create') {
      result = await addCombo(formData, imageFile);
      if (result.success) addToast({ message: 'Thêm combo thành công!', type: 'success' });
    } else {
      result = await editCombo(viewState.data.id, formData, imageFile);
      if (result.success) addToast({ message: 'Cập nhật combo thành công!', type: 'success' });
    }
    if (result.success) {
      changeView('list');
    }
    return result;
  };

  if (viewState.mode === 'create' || viewState.mode === 'edit') {
    return (
      <CreateComboPage
        onBack={() => changeView('list')}
        initialData={viewState.data}
        onSave={handleSave}
      />
    );
  }

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

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
            <Coffee size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Quản lí Combo
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '2px 0 0 0' }}>
              {combos.length} combo trong hệ thống
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
            Thêm Combo mới
          </button>
        )}</>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => { setFilterStatus('ALL'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'ALL'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
            }`}
        >
          Tất cả trạng thái
        </button>
        <button
          onClick={() => { setFilterStatus('IN_STOCK'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'IN_STOCK'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
            }`}
        >
          Còn hàng
        </button>
        <button
          onClick={() => { setFilterStatus('OUT_OF_STOCK'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filterStatus === 'OUT_OF_STOCK'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
            }`}
        >
          Hết hàng
        </button>
      </div>


      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', background: '#141414',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
            padding: '12px 16px', flex: 1, minWidth: '200px'
          }}
        >
          <Search size={18} color="rgba(255,255,255,0.3)" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên combo..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              flex: 1, border: 'none', background: 'transparent', color: '#fff',
              fontSize: '13px', outline: 'none', fontFamily: '"Inter", sans-serif',
            }}
          />
        </div>

        <select
          value={filterDiscount}
          onChange={(e) => { setFilterDiscount(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{ padding: '12px 8px 12px 16px', minWidth: '160px' }}
        >
          <option value="ALL">Tất cả (Giảm giá)</option>
          <option value="DISCOUNT">Đang giảm giá</option>
          <option value="NO_DISCOUNT">Không giảm giá</option>
        </select>

        <select
          value={itemsPerPage}
          onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          className="px-3 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{ padding: '12px 8px 12px 16px', minWidth: '120px' }}
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
              {['Hình ảnh', 'Tên Combo', 'Giá gốc', 'Giảm giá', 'Giá bán', 'Trạng thái', 'Thao tác'].filter(h => !isStaff || h !== 'Thao tác').map((h) => (
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
                <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>Đang tải dữ liệu...</td>
              </tr>
            ) : filteredCombos.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Không có combo nào</td>
              </tr>
            ) : paginatedCombos.map((s) => {
              const status = statusConfig[s.status] || statusConfig['IN_STOCK'];
              return (
                <tr
                  key={s.id}
                  style={{ transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '6px', background: '#2a2a2a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      ) : null}
                      <div style={{ display: s.imageUrl ? 'none' : 'flex', color: 'rgba(255,255,255,0.2)' }}>
                        <Package size={20} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                    <div>{s.name}</div>
                    {s.description && (
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: 400 }}>
                        {s.description.length > 30 ? s.description.substring(0, 30) + '...' : s.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: s.discountPercent > 0 ? 'rgba(255,255,255,0.4)' : '#fff', textDecoration: s.discountPercent > 0 ? 'line-through' : 'none' }}>
                    {formatCurrency(s.price)}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px' }}>
                    {s.discountPercent > 0 ? (
                      <span style={{ color: '#dc2626', fontWeight: 600, background: 'rgba(220,38,38,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        -{s.discountPercent}%
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
                    {formatCurrency(s.finalPrice)}
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
                          onClick={() => changeView('edit', s)}
                          title="Sửa"
                          className="action-btn edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(s.id)}
                          title={s.isHidden ? "Hiện" : "Ẩn"}
                          className={`action-btn ${s.isHidden ? 'hide' : 'edit'}`}
                        >
                          {s.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
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

      {/* Pagination */}
      {filteredCombos.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalElements={filteredCombos.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  );
}
