import { useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Edit2,
  Lock,
  Unlock,
  X,
  Check,
  UserPlus,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { useCustomerManagement } from '../hooks/useCustomerManagement';
import Pagination from '../../../shared/components/Pagination';
import useThemeStore from '../../../shared/store/themeStore';

const statusConfig = {
  ACTIVE: { label: 'Hoạt động', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  LOCKED: { label: 'Đã khoá', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  UNVERIFIED: {
    label: 'Chưa xác thực',
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.1)',
  },
};

export default function CustomerManagementPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  const {
    customers,
    deletedCustomers,
    isViewDeleted,
    setIsViewDeleted,
    isLoading,
    updateCustomer,
    deleteCustomer,
    restoreCustomer,
    createCustomer,
    refreshCustomers,
  } = useCustomerManagement();
  const [searchTerm, setSearchTerm] = useState('');

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    email: '',
    phoneNumber: '',
    status: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete modal state
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Restore modal state
  const [restoringCustomer, setRestoringCustomer] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    dateOfBirth: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState({});
  const [successInfo, setSuccessInfo] = useState(null);

  const usernamePreview = createForm.email.includes('@')
    ? createForm.email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase() || 'user'
    : '';

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const resetKey1 = JSON.stringify([searchTerm, isViewDeleted]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    setCurrentPage(1);
  }

  const filteredCustomers = useMemo(() => {
    const listToFilter = isViewDeleted ? deletedCustomers : customers;
    if (!searchTerm.trim()) return listToFilter;
    const term = searchTerm.toLowerCase();
    return listToFilter.filter(
      (c) =>
        c.fullName?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phoneNumber?.includes(term) ||
        c.username?.toLowerCase().includes(term)
    );
  }, [customers, deletedCustomers, isViewDeleted, searchTerm]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredCustomers, currentPage]);

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
    if (success) {
      setEditingCustomer(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    const success = await deleteCustomer(deletingCustomer.id);
    setIsDeleting(false);
    if (success) {
      setDeletingCustomer(null);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoringCustomer) return;
    setIsRestoring(true);
    const success = await restoreCustomer(restoringCustomer.id);
    setIsRestoring(false);
    if (success) {
      setRestoringCustomer(null);
    }
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
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const VN_PHONE_REGEX =
    /^(0|\+84)(3[2-9]|5[689]|7[0|6-9]|8[1-6|8|9]|9[0-4|6-9])[0-9]{7}$/;

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

    if (
      createForm.phoneNumber &&
      !VN_PHONE_REGEX.test(createForm.phoneNumber)
    ) {
      errors.phoneNumber = 'Số điện thoại không hợp lệ';
    }
    if (createForm.dateOfBirth) {
      if (calculateAge(createForm.dateOfBirth) < 18) {
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
      setCreateForm({
        email: '',
        fullName: '',
        phoneNumber: '',
        dateOfBirth: '',
      });
      setCreateErrors({});
      setSuccessInfo({ email: createForm.email, username: usernamePreview });
    }
  };

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
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '13px',
              background: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
            }}
          >
            <Users size={22} color="#fff" />
          </div>
          <div>
            <h2
              style={{
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Quản lí Tài Khoản Khách Hàng
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: '13px',
                margin: '3px 0 0 0',
              }}
            >
              {isLoading
                ? 'Đang tải...'
                : `${isViewDeleted ? deletedCustomers.length : customers.length} tài khoản`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={refreshCustomers}
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
              background: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            }}
          >
            <UserPlus size={16} />
            Tạo tài khoản
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setIsViewDeleted(false)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            !isViewDeleted
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Đang hoạt động
        </button>
        <button
          onClick={() => setIsViewDeleted(true)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            isViewDeleted
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Đã xoá / Khoá
        </button>
      </div>

      {/* Search & Filter */}
      <div
        style={{
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
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm khách hàng theo tên, email, số điện thoại..."
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

      {/* Table */}
      <div
        style={{
          background: '#141414',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          minHeight: '400px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                'Họ tên',
                'Tên đăng nhập',
                'Email',
                'Số điện thoại',
                'Điểm thưởng',
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
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Không tìm thấy khách hàng nào.
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((c) => {
                const status =
                  statusConfig[c.status] || statusConfig.UNVERIFIED;
                return (
                  <tr
                    key={c.id}
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
                        padding: '14px 20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#fff',
                      }}
                    >
                      {c.fullName}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {c.username}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {c.email}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {c.phoneNumber || '-'}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#f59e0b',
                      }}
                    >
                      {c.rewardPoints}
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
                          <div
                            style={{
                              display: 'flex',
                              gap: '10px',
                              alignItems: 'center',
                            }}
                          >
                            {!isViewDeleted && (
                              <button
                                onClick={() => handleEditClick(c)}
                                title="Sửa thông tin"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: 'rgba(59,130,246,0.1)',
                                  border: '1px solid rgba(59,130,246,0.25)',
                                  color: '#3b82f6',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    'rgba(59,130,246,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    'rgba(59,130,246,0.1)';
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                isViewDeleted
                                  ? setRestoringCustomer(c)
                                  : setDeletingCustomer(c)
                              }
                              title={
                                isViewDeleted
                                  ? 'Khôi phục / Mở khoá'
                                  : 'Khoá tài khoản'
                              }
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: isViewDeleted
                                  ? 'rgba(16,185,129,0.1)'
                                  : 'rgba(220,38,38,0.1)',
                                border: `1px solid ${isViewDeleted ? 'rgba(16,185,129,0.25)' : 'rgba(220,38,38,0.25)'}`,
                                color: isViewDeleted ? '#10b981' : '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.75';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              {isViewDeleted ? (
                                <Unlock size={14} />
                              ) : (
                                <Lock size={14} />
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
          totalElements={filteredCustomers.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      {/* Edit Modal */}
      {editingCustomer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              padding: '24px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
                Chỉnh sửa thông tin
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              noValidate
              onSubmit={handleUpdateSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                    marginBottom: '6px',
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#242424',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                    marginBottom: '6px',
                  }}
                >
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={editForm.phoneNumber}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phoneNumber: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#242424',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                    marginBottom: '6px',
                  }}
                >
                  Trạng thái
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#242424',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="LOCKED">Đã khoá</option>
                  <option value="UNVERIFIED">Chưa xác thực</option>
                </select>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{
                    padding: '10px 16px',
                    background: '#3b82f6',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Check size={16} />{' '}
                  {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              padding: '24px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(220,38,38,0.1)',
                color: '#dc2626',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Lock size={24} />
            </div>
            <h3
              style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px' }}
            >
              Xác nhận khoá tài khoản
            </h3>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: 1.5,
              }}
            >
              Bạn có chắc chắn muốn khoá tài khoản của{' '}
              <strong>{deletingCustomer.fullName}</strong>? Họ sẽ không thể đăng
              nhập.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeletingCustomer(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Huỷ
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#dc2626',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {isDeleting ? 'Đang xử lý...' : 'Xác nhận khoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoringCustomer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              padding: '24px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                background: 'rgba(16,185,129,0.1)',
                color: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Unlock size={24} />
            </div>
            <h3
              style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px' }}
            >
              Xác nhận mở khoá
            </h3>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: 1.5,
              }}
            >
              Bạn có chắc chắn muốn mở khoá tài khoản{' '}
              <strong>{restoringCustomer.fullName}</strong>? Tài khoản của họ sẽ
              được kích hoạt trở lại.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setRestoringCustomer(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Huỷ
              </button>
              <button
                onClick={handleRestoreConfirm}
                disabled={isRestoring}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#10b981',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: isRestoring ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {isRestoring ? 'Đang xử lý...' : 'Xác nhận mở khoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: isDarkMode
                ? 'linear-gradient(180deg, #1c1c1c 0%, #181818 100%)'
                : '#ffffff',
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background:
                      'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserPlus size={18} color="#fff" />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: isDarkMode ? '#fff' : '#111827',
                      fontSize: '17px',
                      fontWeight: 700,
                    }}
                  >
                    Tạo tài khoản mới
                  </h3>
                  <p
                    style={{
                      margin: '2px 0 0 0',
                      color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#6b7280',
                      fontSize: '12px',
                    }}
                  >
                    Hệ thống tự sinh username &amp; mật khẩu, gửi về email khách
                    hàng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form
              noValidate
              onSubmit={handleCreateSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#4b5563',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                  }}
                >
                  Họ và tên <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={createForm.fullName}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, fullName: e.target.value });
                    if (createErrors.fullName)
                      setCreateErrors({ ...createErrors, fullName: '' });
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${createErrors.fullName ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: isDarkMode ? '#fff' : '#111827',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                {createErrors.fullName && (
                  <span
                    style={{
                      color: '#dc2626',
                      fontSize: '11px',
                      marginTop: '4px',
                      display: 'block',
                    }}
                  >
                    {createErrors.fullName}
                  </span>
                )}
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#4b5563',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                  }}
                >
                  Email <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="example@email.com"
                  value={createForm.email}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, email: e.target.value });
                    if (createErrors.email)
                      setCreateErrors({ ...createErrors, email: '' });
                  }}
                  onBlur={handleEmailBlur}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${createErrors.email ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: isDarkMode ? '#fff' : '#111827',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                {createErrors.email && (
                  <span
                    style={{
                      color: '#dc2626',
                      fontSize: '11px',
                      marginTop: '4px',
                      display: 'block',
                    }}
                  >
                    {createErrors.email}
                  </span>
                )}
              </div>
              {usernamePreview && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#4b5563',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Tên đăng nhập (tự động)
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: isDarkMode
                        ? 'rgba(59,130,246,0.06)'
                        : '#eff6ff',
                      border: `1px solid ${isDarkMode ? 'rgba(59,130,246,0.2)' : '#bfdbfe'}`,
                      padding: '10px 14px',
                      borderRadius: '8px',
                    }}
                  >
                    <span
                      style={{
                        color: isDarkMode
                          ? 'rgba(255,255,255,0.35)'
                          : '#6b7280',
                        fontSize: '12px',
                      }}
                    >
                      @
                    </span>
                    <span
                      style={{
                        color: isDarkMode ? '#60a5fa' : '#2563eb',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    >
                      {usernamePreview}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        color: isDarkMode ? 'rgba(255,255,255,0.3)' : '#4b5563',
                        background: isDarkMode
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.06)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      Tự động
                    </span>
                  </div>
                </div>
              )}
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
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: isDarkMode ? 'rgba(99,102,241,0.2)' : '#c7d2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDarkMode ? '#818cf8' : '#4338ca'}
                    strokeWidth="2.5"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <p
                    style={{
                      margin: '0 0 2px 0',
                      color: isDarkMode ? '#818cf8' : '#4338ca',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    Mật khẩu tự động
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#4b5563',
                      fontSize: '12px',
                      lineHeight: 1.6,
                    }}
                  >
                    Hệ thống sẽ sinh ngẫu nhiên và gửi về{' '}
                    <strong
                      style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                    >
                      {createForm.email || 'email'}
                    </strong>
                    .
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#4b5563',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="0901234567"
                    value={createForm.phoneNumber}
                    onChange={(e) => {
                      setCreateForm({
                        ...createForm,
                        phoneNumber: e.target.value,
                      });
                      if (createErrors.phoneNumber)
                        setCreateErrors({ ...createErrors, phoneNumber: '' });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: isDarkMode ? '#242424' : '#f9fafb',
                      border: `1px solid ${createErrors.phoneNumber ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      color: isDarkMode ? '#fff' : '#111827',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  {createErrors.phoneNumber && (
                    <span
                      style={{
                        color: '#dc2626',
                        fontSize: '11px',
                        marginTop: '4px',
                        display: 'block',
                      }}
                    >
                      {createErrors.phoneNumber}
                    </span>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#4b5563',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={createForm.dateOfBirth}
                    onChange={(e) => {
                      setCreateForm({
                        ...createForm,
                        dateOfBirth: e.target.value,
                      });
                      if (createErrors.dateOfBirth)
                        setCreateErrors({ ...createErrors, dateOfBirth: '' });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: isDarkMode ? '#242424' : '#f9fafb',
                      border: `1px solid ${createErrors.dateOfBirth ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      color: isDarkMode ? '#fff' : '#111827',
                      fontSize: '13px',
                      outline: 'none',
                      colorScheme: isDarkMode ? 'dark' : 'light',
                    }}
                  />
                  {createErrors.dateOfBirth && (
                    <span
                      style={{
                        color: '#dc2626',
                        fontSize: '11px',
                        marginTop: '4px',
                        display: 'block',
                      }}
                    >
                      {createErrors.dateOfBirth}
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
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
                      ? isDarkMode
                        ? 'rgba(59,130,246,0.5)'
                        : '#93c5fd'
                      : 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '10px',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                  }}
                >
                  {isCreating ? (
                    <>
                      <RefreshCw
                        size={14}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />{' '}
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Tạo tài khoản
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successInfo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: isDarkMode
                ? 'linear-gradient(180deg, #1c1c1c 0%, #181818 100%)'
                : '#ffffff',
              padding: '36px 32px',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '420px',
              border: `1px solid ${isDarkMode ? 'rgba(16,185,129,0.25)' : '#e5e7eb'}`,
              boxShadow: isDarkMode
                ? '0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(16,185,129,0.08)'
                : '0 24px 60px rgba(0,0,0,0.15)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isDarkMode
                  ? 'rgba(16,185,129,0.12)'
                  : 'rgba(16,185,129,0.1)',
                border: `1px solid ${isDarkMode ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <Mail size={28} color={isDarkMode ? '#10b981' : '#059669'} />
            </div>
            <h3
              style={{
                margin: '0 0 8px 0',
                color: isDarkMode ? '#fff' : '#111827',
                fontSize: '20px',
                fontWeight: 700,
              }}
            >
              Tài khoản đã được tạo!
            </h3>
            <p
              style={{
                color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#6b7280',
                fontSize: '13px',
                margin: '0 0 20px 0',
                lineHeight: 1.6,
              }}
            >
              Hệ thống đã tự động sinh username và mật khẩu mạnh, gửi thông tin
              đăng nhập về:
            </p>
            <div
              style={{
                background: isDarkMode ? 'rgba(16,185,129,0.08)' : '#ecfdf5',
                border: `1px solid ${isDarkMode ? 'rgba(16,185,129,0.2)' : '#a7f3d0'}`,
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '12px',
              }}
            >
              <p
                style={{
                  margin: '0 0 6px 0',
                  color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#059669',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Email nhận thông tin
              </p>
              <p
                style={{
                  margin: 0,
                  color: isDarkMode ? '#10b981' : '#047857',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                {successInfo.email}
              </p>
            </div>
            <div
              style={{
                background: isDarkMode ? 'rgba(59,130,246,0.08)' : '#eff6ff',
                border: `1px solid ${isDarkMode ? 'rgba(59,130,246,0.15)' : '#bfdbfe'}`,
                borderRadius: '12px',
                padding: '12px 18px',
                marginBottom: '24px',
              }}
            >
              <p
                style={{
                  margin: '0 0 4px 0',
                  color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#2563eb',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Tên đăng nhập
              </p>
              <p
                style={{
                  margin: 0,
                  color: isDarkMode ? '#60a5fa' : '#1d4ed8',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                {successInfo.username}
              </p>
            </div>
            <button
              onClick={() => setSuccessInfo(null)}
              style={{
                width: '100%',
                padding: '12px',
                background: isDarkMode
                  ? 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)'
                  : '#ef4444',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
              }}
            >
              Đã hiểu, đóng
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
