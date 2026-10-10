import { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Edit2,
  Lock,
  Unlock,
  UserPlus,
  X,
  Check,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { useStaffCustomerManagement } from '../hooks/useStaffCustomerManagement';
import Pagination from '../../../shared/components/Pagination';
import useThemeStore from '../../../shared/store/themeStore';

/* ─── status config ─── */
const statusConfig = {
  ACTIVE: { label: 'Hoạt động', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  LOCKED: { label: 'Đã khoá', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  UNVERIFIED: { label: 'Chưa xác thực', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

/* ─── shared input style ─── */
const getDynamicInputStyle = (isDarkMode, hasError) => ({
  width: '100%',
  padding: '10px 14px',
  background: isDarkMode ? '#242424' : '#f9fafb',
  border: `1px solid ${hasError ? '#dc2626' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb')}`,
  borderRadius: '8px',
  color: isDarkMode ? '#fff' : '#111827',
  fontSize: '13px',
  outline: 'none',
  fontFamily: '"Inter", sans-serif',
  boxSizing: 'border-box',
});

const getDynamicLabelStyle = (isDarkMode) => ({
  display: 'block',
  color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#4b5563',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '6px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
});

/* ─── empty state ─── */
function EmptyState({ isViewLocked }) {
  return (
    <tr>
      <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <Users size={24} color="rgba(255,255,255,0.2)" />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', margin: 0 }}>
          {isViewLocked ? 'Không có tài khoản nào đang bị khoá.' : 'Không tìm thấy khách hàng nào.'}
        </p>
      </td>
    </tr>
  );
}

/* ─── main component ─── */
export default function StaffUserManagementPage() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const {
    customers,
    lockedCustomers,
    isViewLocked,
    setIsViewLocked,
    isLoading,
    createCustomer,
    updateCustomer,
    toggleLock,
    refreshList,
  } = useStaffCustomerManagement();

  const [searchTerm, setSearchTerm] = useState('');

  /* edit modal */
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', phoneNumber: '', status: 'ACTIVE' });
  const [isUpdating, setIsUpdating] = useState(false);

  /* create modal */
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState({});

  /* success modal - hiện sau khi tạo tài khoản thành công */
  const [successInfo, setSuccessInfo] = useState(null); // { email, username }

  /* toggle-lock confirm */
  const [togglingCustomer, setTogglingCustomer] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  /* Auto-derive username preview from email */
  const usernamePreview = createForm.email.includes('@')
    ? createForm.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'user'
    : '';

  /* ─── filtered list ─── */
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, isViewLocked]);

  const filteredCustomers = useMemo(() => {
    const list = isViewLocked ? lockedCustomers : customers;
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (c) =>
        c.fullName?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phoneNumber?.includes(term) ||
        c.username?.toLowerCase().includes(term)
    );
  }, [customers, lockedCustomers, isViewLocked, searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  /* ─── handlers ─── */
  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setEditForm({
      email: customer.email || '',
      phoneNumber: customer.phoneNumber || '',
      status: customer.status || 'ACTIVE',
    });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setIsUpdating(true);
    const success = await updateCustomer(editingCustomer.id, editForm);
    setIsUpdating(false);
    if (success) setEditingCustomer(null);
  };

  const handleEmailBlur = () => {
    const val = createForm.email.trim();
    if (val && !val.includes('@')) {
      const filled = val + '@gmail.com';
      setCreateForm((prev) => ({ ...prev, email: filled }));
      setCreateErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const VN_PHONE_REGEX = /^(0|\+84)(3[2-9]|5[689]|7[0|6-9]|8[1-6|8|9]|9[0-4|6-9])[0-9]{7}$/;

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!createForm.fullName?.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên';
    }
    if (!createForm.email?.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      errors.email = 'Email không hợp lệ';
    }

    if (createForm.phoneNumber && !VN_PHONE_REGEX.test(createForm.phoneNumber)) {
      errors.phoneNumber = 'Số điện thoại không hợp lệ';
    }
    if (createForm.dateOfBirth) {
      const age = calculateAge(createForm.dateOfBirth);
      if (age < 18) {
        errors.dateOfBirth = 'Khách hàng phải từ đủ 18 tuổi';
      }
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }
    setCreateErrors({});

    setIsCreating(true);
    const newUser = await createCustomer({
      email: createForm.email,
      fullName: createForm.fullName,
      phoneNumber: createForm.phoneNumber || null,
      dateOfBirth: createForm.dateOfBirth || null,
    });
    setIsCreating(false);
    if (newUser !== false) {
      setIsCreateOpen(false);
      setCreateForm({ email: '', fullName: '', phoneNumber: '', dateOfBirth: '' });
      setCreateErrors({});
      // Hiện modal thông báo email đã gửi
      setSuccessInfo({ email: createForm.email, username: usernamePreview });
    }
  };

  const handleToggleLockConfirm = async () => {
    if (!togglingCustomer) return;
    setIsToggling(true);
    await toggleLock(togglingCustomer.id);
    setIsToggling(false);
    setTogglingCustomer(null);
  };

  const isLocked = (c) => c.status === 'LOCKED';

  /* ─── render ─── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '13px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
            }}
          >
            <Users size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Quản lí Tài Khoản Khách Hàng
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '3px 0 0 0' }}>
              {isLoading
                ? 'Đang tải...'
                : `${isViewLocked ? lockedCustomers.length : customers.length} tài khoản`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={refreshList}
            title="Làm mới danh sách"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 18px',
              height: '38px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <UserPlus size={16} />
            Tạo tài khoản
          </button>
        </div>
      </div>

      {/* ── Tab Filter ── */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setIsViewLocked(false)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${!isViewLocked
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
            }`}
        >
          Đang hoạt động ({customers.length})
        </button>
        <button
          onClick={() => setIsViewLocked(true)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isViewLocked
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
            }`}
        >
          Đã khoá ({lockedCustomers.length})
        </button>
      </div>

      {/* ── Search ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#141414',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '11px 16px',
        }}
      >
        <Search size={17} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm theo họ tên, email, số điện thoại, tên đăng nhập..."
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
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div
        style={{
          background: '#141414',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
          minHeight: '400px',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Họ tên', 'Tên đăng nhập', 'Email', 'Số điện thoại', 'Điểm', 'Trạng thái', 'Thao tác'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '13px 18px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                    <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                    <br />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <EmptyState isViewLocked={isViewLocked} />
              ) : (
                paginatedCustomers.map((c) => {
                  const status = statusConfig[c.status] || statusConfig.UNVERIFIED;
                  return (
                    <tr
                      key={c.id}
                      style={{ transition: 'background 0.15s', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Họ tên */}
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#fff',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {c.avatar
                              ? <img src={c.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : (c.fullName?.charAt(0) || '?').toUpperCase()}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{c.fullName || '—'}</span>
                        </div>
                      </td>

                      {/* Username */}
                      <td style={{ padding: '13px 18px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                        {c.username}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '13px 18px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                        {c.email}
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '13px 18px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                        {c.phoneNumber || '—'}
                      </td>

                      {/* Reward points */}
                      <td style={{ padding: '13px 18px', fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>
                        {c.rewardPoints ?? 0}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '13px 18px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: status.color,
                            background: status.bg,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {/* Edit */}
                          <button
                            onClick={() => handleEditClick(c)}
                            title="Chỉnh sửa thông tin"
                            style={{
                              width: '32px', height: '32px', borderRadius: '8px',
                              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                              color: '#3b82f6', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }}
                          >
                            <Edit2 size={14} />
                          </button>

                        </div>
                      </td>
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
            totalElements={filteredCustomers.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>

      {/* ════════════════════════════════════════════
           MODAL: Tạo tài khoản mới
      ════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}
        >
          <div
            style={{
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              padding: '28px',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <UserPlus size={18} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: isDarkMode ? '#fff' : '#111827', fontSize: '17px', fontWeight: 700 }}>Tạo tài khoản mới</h3>
                  <p style={{ margin: '2px 0 0 0', color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#6b7280', fontSize: '12px' }}>
                    Hệ thống tự sinh username &amp; mật khẩu, gửi về email khách hàng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9ca3af', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form noValidate onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Họ tên */}
              <div>
                <label style={getDynamicLabelStyle(isDarkMode)}>Họ và tên <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={createForm.fullName}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, fullName: e.target.value });
                    if (createErrors.fullName) setCreateErrors({ ...createErrors, fullName: '' });
                  }}
                  style={getDynamicInputStyle(isDarkMode, createErrors.fullName)}
                />
                {createErrors.fullName && <span style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block' }}>{createErrors.fullName}</span>}
              </div>

              {/* Email */}
              <div>
                <label style={getDynamicLabelStyle(isDarkMode)}>Email <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="email"
                  required
                  placeholder="example@email.com"
                  value={createForm.email}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, email: e.target.value });
                    if (createErrors.email) setCreateErrors({ ...createErrors, email: '' });
                  }}
                  onBlur={handleEmailBlur}
                  style={getDynamicInputStyle(isDarkMode, createErrors.email)}
                />
                {createErrors.email && <span style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block' }}>{createErrors.email}</span>}
              </div>

              {/* Username preview - readonly, derived from email */}
              {usernamePreview && (
                <div>
                  <label style={getDynamicLabelStyle(isDarkMode)}>Tên đăng nhập (tự động)</label>
                  <div
                    style={{
                      ...getDynamicInputStyle(isDarkMode, false),
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: isDarkMode ? 'rgba(59,130,246,0.06)' : '#eff6ff',
                      border: `1px solid ${isDarkMode ? 'rgba(59,130,246,0.2)' : '#bfdbfe'}`,
                      cursor: 'default',
                    }}
                  >
                    <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#6b7280', fontSize: '12px' }}>@</span>
                    <span style={{ color: isDarkMode ? '#60a5fa' : '#2563eb', fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.04em' }}>
                      {usernamePreview}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto', fontSize: '11px', color: isDarkMode ? 'rgba(255,255,255,0.3)' : '#4b5563',
                        background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', padding: '2px 8px', borderRadius: '6px',
                      }}
                    >
                      Tự động
                    </span>
                  </div>
                </div>
              )}

              {/* Mật khẩu - auto generated note */}
              <div
                style={{
                  background: isDarkMode ? 'rgba(99,102,241,0.08)' : '#e0e7ff',
                  border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.2)' : '#c7d2fe'}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: isDarkMode ? 'rgba(99,102,241,0.2)' : '#c7d2fe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#818cf8' : '#4338ca'} strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <p style={{ margin: '0 0 2px 0', color: isDarkMode ? '#818cf8' : '#4338ca', fontSize: '12px', fontWeight: 700 }}>Mật khẩu tự động</p>
                  <p style={{ margin: 0, color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#4b5563', fontSize: '12px', lineHeight: 1.6 }}>
                    Hệ thống sẽ sinh ngẫu nhiên <strong style={{ color: isDarkMode ? '#fff' : '#111827' }}>có ít nhất 8 ký tự</strong> (hoa + thường + số + ký tự đặc biệt)
                    và gửi mật khẩu về <strong style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>{createForm.email || 'email khách hàng'}</strong>.
                  </p>
                </div>
              </div>

              {/* Row: phone + dob */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={getDynamicLabelStyle(isDarkMode)}>Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0901234567"
                    value={createForm.phoneNumber}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, phoneNumber: e.target.value });
                      if (createErrors.phoneNumber) setCreateErrors({ ...createErrors, phoneNumber: '' });
                    }}
                    style={getDynamicInputStyle(isDarkMode, createErrors.phoneNumber)}
                  />
                  {createErrors.phoneNumber && <span style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block' }}>{createErrors.phoneNumber}</span>}
                </div>
                <div>
                  <label style={getDynamicLabelStyle(isDarkMode)}>Ngày sinh</label>
                  <input
                    type="date"
                    value={createForm.dateOfBirth}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, dateOfBirth: e.target.value });
                      if (createErrors.dateOfBirth) setCreateErrors({ ...createErrors, dateOfBirth: '' });
                    }}
                    style={{ ...getDynamicInputStyle(isDarkMode, createErrors.dateOfBirth), colorScheme: isDarkMode ? 'dark' : 'light' }}
                  />
                  {createErrors.dateOfBirth && <span style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block' }}>{createErrors.dateOfBirth}</span>}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    padding: '10px 20px', background: 'transparent',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151',
                    borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                  }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    padding: '10px 24px',
                    background: isCreating
                      ? (isDarkMode ? 'rgba(59,130,246,0.5)' : '#93c5fd')
                      : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    border: 'none', color: '#fff', borderRadius: '10px',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                  }}
                >
                  {isCreating ? (
                    <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang tạo...</>
                  ) : (
                    <><UserPlus size={14} /> Tạo tài khoản</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
           MODAL: Tạo thành công — email đã gửi
      ════════════════════════════════════════════ */}
      {successInfo && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '20px',
          }}
        >
          <div
            style={{
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              padding: '36px 32px',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '420px',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: isDarkMode ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)',
                border: `1px solid ${isDarkMode ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <Mail size={28} color="#10b981" />
            </div>

            <h3 style={{ margin: '0 0 8px 0', color: isDarkMode ? '#fff' : '#111827', fontSize: '20px', fontWeight: 700 }}>
              Tài khoản đã được tạo!
            </h3>
            <p style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6b7280', fontSize: '13px', margin: '0 0 20px 0', lineHeight: 1.6 }}>
              Hệ thống đã tự động sinh username và mật khẩu mạnh, gửi thông tin đăng nhập về:
            </p>

            {/* Email highlight */}
            <div
              style={{
                background: isDarkMode ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
                border: `1px solid ${isDarkMode ? 'rgba(16,185,129,0.2)' : '#a7f3d0'}`,
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '12px',
              }}
            >
              <p style={{ margin: '0 0 6px 0', color: isDarkMode ? '#10b981' : '#059669', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Email nhận thông tin
              </p>
              <p style={{ margin: 0, color: isDarkMode ? '#34d399' : '#047857', fontSize: '15px', fontWeight: 700, fontFamily: 'monospace' }}>
                {successInfo.email}
              </p>
            </div>

            {/* Username preview */}
            <div
              style={{
                background: isDarkMode ? 'rgba(59,130,246,0.1)' : '#eff6ff',
                border: `1px solid ${isDarkMode ? 'rgba(59,130,246,0.2)' : '#bfdbfe'}`,
                borderRadius: '12px',
                padding: '12px 18px',
                marginBottom: '24px',
              }}
            >
              <p style={{ margin: '0 0 4px 0', color: isDarkMode ? '#60a5fa' : '#2563eb', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Tên đăng nhập
              </p>
              <p style={{ margin: 0, color: isDarkMode ? '#93c5fd' : '#1d4ed8', fontSize: '15px', fontWeight: 700, fontFamily: 'monospace' }}>
                {successInfo.username}
              </p>
            </div>

            <p style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6b7280', fontSize: '12px', margin: '0 0 20px 0', lineHeight: 1.6 }}>
              ⚠️ Hãy nhắc nhở khách hàng kiểm tra email và đổi mật khẩu sau khi đăng nhập lần đầu.
            </p>

            <button
              onClick={() => setSuccessInfo(null)}
              style={{
                width: '100%',
                padding: '12px',
                background: isDarkMode ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: isDarkMode ? '1px solid rgba(16,185,129,0.3)' : 'none',
                color: isDarkMode ? '#34d399' : '#fff',
                borderRadius: '10px',
                cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                boxShadow: isDarkMode ? 'none' : '0 4px 14px rgba(16,185,129,0.3)',
              }}
            >
              Đã hiểu, đóng
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
           MODAL: Chỉnh sửa thông tin
      ════════════════════════════════════════════ */}
      {editingCustomer && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingCustomer(null); }}
        >
          <div
            style={{
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              padding: '28px', borderRadius: '20px', width: '100%', maxWidth: '420px',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h3 style={{ margin: 0, color: isDarkMode ? '#fff' : '#111827', fontSize: '17px', fontWeight: 700 }}>
                Chỉnh sửa thông tin
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                style={{ background: 'none', border: 'none', color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer preview */}
            <div
              style={{
                background: isDarkMode ? '#242424' : '#f3f4f6',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <div
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}
              >
                {editingCustomer.fullName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p style={{ margin: 0, color: isDarkMode ? '#fff' : '#111827', fontSize: '13px', fontWeight: 600 }}>{editingCustomer.fullName}</p>
                <p style={{ margin: 0, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6b7280', fontSize: '12px' }}>@{editingCustomer.username}</p>
              </div>
            </div>

            <form noValidate onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={getDynamicLabelStyle(isDarkMode)}>Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={getDynamicInputStyle(isDarkMode, false)}
                />
              </div>
              <div>
                <label style={getDynamicLabelStyle(isDarkMode)}>Số điện thoại</label>
                <input
                  type="text"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  style={getDynamicInputStyle(isDarkMode, false)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  style={{
                    padding: '10px 18px', background: 'transparent',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151',
                    borderRadius: '10px', cursor: 'pointer', fontSize: '13px',
                  }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{
                    padding: '10px 20px',
                    background: isUpdating ? 'rgba(59,130,246,0.5)' : '#3b82f6',
                    border: 'none', color: '#fff', borderRadius: '10px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <Check size={14} /> {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
           MODAL: Xác nhận khoá / mở khoá
      ════════════════════════════════════════════ */}
      {togglingCustomer && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setTogglingCustomer(null); }}
        >
          <div
            style={{
              background: isDarkMode ? 'linear-gradient(180deg, #1c1c1c 0%, #181818 100%)' : '#ffffff',
              padding: '28px', borderRadius: '20px', width: '100%', maxWidth: '380px',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              boxShadow: isDarkMode ? '0 24px 60px rgba(0,0,0,0.6)' : '0 24px 60px rgba(0,0,0,0.15)',
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: isLocked(togglingCustomer)
                  ? (isDarkMode ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.1)')
                  : (isDarkMode ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.1)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              {isLocked(togglingCustomer)
                ? <Unlock size={24} color={isDarkMode ? '#10b981' : '#059669'} />
                : <Lock size={24} color={isDarkMode ? '#dc2626' : '#b91c1c'} />}
            </div>

            <h3 style={{ margin: '0 0 8px 0', color: isDarkMode ? '#fff' : '#111827', fontSize: '18px', fontWeight: 700 }}>
              {isLocked(togglingCustomer) ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
            </h3>
            <p style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6b7280', fontSize: '13px', margin: '0 0 24px 0', lineHeight: 1.6 }}>
              {isLocked(togglingCustomer)
                ? <>Bạn có chắc muốn mở khoá tài khoản <strong style={{ color: isDarkMode ? '#fff' : '#111827' }}>{togglingCustomer.fullName}</strong>? Họ sẽ có thể đăng nhập trở lại.</>
                : <>Bạn có chắc muốn khoá tài khoản <strong style={{ color: isDarkMode ? '#fff' : '#111827' }}>{togglingCustomer.fullName}</strong>? Họ sẽ không thể đăng nhập.</>}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setTogglingCustomer(null)}
                style={{
                  flex: 1, padding: '12px',
                  background: 'transparent', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                  color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151', borderRadius: '10px',
                  cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                }}
              >
                Huỷ
              </button>
              <button
                onClick={handleToggleLockConfirm}
                disabled={isToggling}
                style={{
                  flex: 1, padding: '12px',
                  background: isLocked(togglingCustomer) ? '#10b981' : '#dc2626',
                  border: 'none', color: '#fff', borderRadius: '10px',
                  cursor: isToggling ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '13px',
                  opacity: isToggling ? 0.6 : 1,
                }}
              >
                {isToggling
                  ? 'Đang xử lý...'
                  : isLocked(togglingCustomer)
                    ? 'Xác nhận mở khoá'
                    : 'Xác nhận khoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
