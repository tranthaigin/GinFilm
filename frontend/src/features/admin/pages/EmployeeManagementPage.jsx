import { useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  UserCog,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  UserPlus,
} from 'lucide-react';
import { useEmployeeManagement } from '../hooks/useEmployeeManagement';
import Pagination from '../../../shared/components/Pagination';
import useThemeStore from '../../../shared/store/themeStore';

const statusConfig = {
  ACTIVE: {
    label: 'Đang làm việc',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
  },
  LOCKED: { label: 'Đã khoá', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  UNVERIFIED: {
    label: 'Chưa xác thực',
    color: '#6b7280',
    bg: 'rgba(107,114,128,0.1)',
  },
};

export default function EmployeeManagementPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  const {
    employees,
    deletedEmployees,
    isViewDeleted,
    setIsViewDeleted,
    isLoading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    restoreEmployee,
  } = useEmployeeManagement();
  const [searchTerm, setSearchTerm] = useState('');

  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    status: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Create modal state
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
  });
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createFieldErrors, setCreateFieldErrors] = useState({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] =
    useState(false);

  // Delete modal state
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Restore modal state
  const [restoringEmployee, setRestoringEmployee] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const resetKey1 = JSON.stringify([searchTerm, isViewDeleted]);
  const [previousResetKey1, setPreviousResetKey1] = useState(null);
  if (previousResetKey1 !== resetKey1) {
    setPreviousResetKey1(resetKey1);
    setCurrentPage(1);
  }

  const filteredEmployees = useMemo(() => {
    const listToFilter = isViewDeleted ? deletedEmployees : employees;
    if (!searchTerm.trim()) return listToFilter;
    const term = searchTerm.toLowerCase();
    return listToFilter.filter(
      (e) =>
        e.fullName?.toLowerCase().includes(term) ||
        e.email?.toLowerCase().includes(term) ||
        e.phoneNumber?.includes(term) ||
        e.username?.toLowerCase().includes(term)
    );
  }, [employees, deletedEmployees, isViewDeleted, searchTerm]);

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredEmployees, currentPage]);

  const handleEditClick = (employee) => {
    setEditingEmployee(employee);
    setEditForm({
      fullName: employee.fullName || '',
      email: employee.email || '',
      phoneNumber: employee.phoneNumber || '',
      dateOfBirth: employee.dateOfBirth
        ? new Date(employee.dateOfBirth).toISOString().split('T')[0]
        : '',
      status: employee.status || 'ACTIVE',
    });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setIsUpdating(true);
    const success = await updateEmployee(editingEmployee.id, editForm);
    setIsUpdating(false);
    if (success) {
      setEditingEmployee(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEmployee) return;
    setIsDeleting(true);
    const success = await deleteEmployee(deletingEmployee.id);
    setIsDeleting(false);
    if (success) {
      setDeletingEmployee(null);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoringEmployee) return;
    setIsRestoring(true);
    const success = await restoreEmployee(restoringEmployee.id);
    setIsRestoring(false);
    if (success) {
      setRestoringEmployee(null);
    }
  };

  const handleOpenCreate = () => {
    setCreateForm({
      fullName: '',
      username: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
    });
    setCreateError('');
    setCreateFieldErrors({});
    setIsCreating(true);
  };

  const validateCreateField = (name, value) => {
    const val = (value || '').trim();
    switch (name) {
      case 'fullName':
        if (!val) return 'Vui lòng nhập họ và tên.';
        if (val.length < 2 || val.length > 50)
          return 'Họ và tên phải từ 2–50 ký tự.';
        if (!/^[a-zA-Z\sÀ-ỹ]+$/.test(val))
          return 'Họ tên không được chứa số hay ký tự đặc biệt.';
        return '';
      case 'username':
        if (!val) return 'Vui lòng nhập tên đăng nhập.';
        if (val.length < 6 || val.length > 20)
          return 'Tên đăng nhập từ 6–20 ký tự.';
        if (!/^[a-zA-Z0-9_.]+$/.test(val))
          return 'Tên chỉ cho phép chữ, số, dấu _ và .';
        return '';
      case 'email':
        if (!val) return 'Vui lòng nhập email.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
          return 'Email không đúng định dạng.';
        return '';
      case 'phoneNumber':
        if (!val) return '';
        if (!/^(03|05|07|08|09)\d{8}$/.test(val))
          return 'SĐT không hợp lệ (10 số, đầu 03/05/07/08/09).';
        return '';
      case 'dateOfBirth': {
        if (!val) return '';
        const dob = new Date(val);
        if (isNaN(dob.getTime())) return 'Ngày sinh không hợp lệ.';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dob > today) return 'Ngày sinh không thể ở tương lai.';
        const age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        const dayDiff = today.getDate() - dob.getDate();
        const actualAge =
          monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        if (actualAge < 18) return 'Nhân viên phải đủ 18 tuổi trở lên.';
        return '';
      }
      case 'password': {
        const rawVal = value || '';
        if (!rawVal) return 'Vui lòng nhập mật khẩu.';
        if (rawVal.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
        if (
          !/[A-Z]/.test(rawVal) ||
          !/[a-z]/.test(rawVal) ||
          !/[0-9]/.test(rawVal) ||
          !/[^A-Za-z0-9]/.test(rawVal)
        )
          return 'Mật khẩu gồm chữ hoa, thường, số và ký tự đặc biệt.';
        return '';
      }
      case 'confirmPassword':
        if (!(value || '')) return 'Vui lòng nhập lại mật khẩu.';
        if (value !== createForm.password)
          return 'Mật khẩu xác nhận không khớp.';
        return '';
      default:
        return '';
    }
  };

  const handleCreateFieldChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (createFieldErrors[field]) {
      setCreateFieldErrors((prev) => ({
        ...prev,
        [field]: validateCreateField(field, value),
      }));
    }
  };

  const handleCreateFieldBlur = (field) => {
    const value = createForm[field];
    const err = validateCreateField(field, value);
    setCreateFieldErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    // Validate all fields
    const fields = [
      'fullName',
      'username',
      'email',
      'phoneNumber',
      'dateOfBirth',
      'password',
      'confirmPassword',
    ];
    const newErrors = {};
    fields.forEach((field) => {
      const err = validateCreateField(field, createForm[field]);
      if (err) newErrors[field] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setCreateFieldErrors(newErrors);
      return;
    }

    setIsCreatingLoading(true);
    const payload = {
      fullName: createForm.fullName,
      username: createForm.username,
      email: createForm.email,
      phoneNumber: createForm.phoneNumber || null,
      dateOfBirth: createForm.dateOfBirth || null,
      password: createForm.password,
    };
    const success = await createEmployee(payload);
    setIsCreatingLoading(false);
    if (success) {
      setIsCreating(false);
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
            <UserCog size={22} color="#fff" />
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
              Quản lí Nhân Viên
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                margin: '2px 0 0 0',
              }}
            >
              {isLoading
                ? 'Đang tải...'
                : `${isViewDeleted ? deletedEmployees.length : employees.length} nhân viên trong hệ thống`}
            </p>
          </div>
        </div>
        {!isViewDeleted && (
          <>
            {!isStaff && (
              <button
                onClick={handleOpenCreate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background:
                    'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow =
                    '0 6px 20px rgba(220,38,38,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 14px rgba(220,38,38,0.3)';
                }}
              >
                <UserPlus size={16} />
                Thêm nhân viên
              </button>
            )}
          </>
        )}
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
          placeholder="Tìm kiếm nhân viên theo tên, email, số điện thoại..."
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
                'Ngày sinh',
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
            ) : paginatedEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Không tìm thấy nhân viên nào.
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((e) => {
                const status =
                  statusConfig[e.status] || statusConfig.UNVERIFIED;
                return (
                  <tr
                    key={e.id}
                    style={{ transition: 'background 0.15s ease' }}
                    onMouseEnter={(ev) => {
                      ev.currentTarget.style.background =
                        'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(ev) => {
                      ev.currentTarget.style.background = 'transparent';
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
                      {e.fullName}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {e.username}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {e.email}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {e.phoneNumber || '-'}
                    </td>
                    <td
                      style={{
                        padding: '14px 20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {e.dateOfBirth
                        ? new Date(e.dateOfBirth).toLocaleDateString('vi-VN')
                        : '-'}
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
                            {isViewDeleted ? (
                              <button
                                onClick={() => setRestoringEmployee(e)}
                                title="Khôi phục"
                                className="action-btn restore"
                                style={{
                                  width: 'auto',
                                  padding: '0 12px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                Khôi phục
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditClick(e)}
                                  title="Sửa"
                                  className="action-btn edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setDeletingEmployee(e)}
                                  title="Xoá"
                                  className="action-btn delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
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
          totalElements={filteredEmployees.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      {/* Edit Modal */}
      {editingEmployee && (
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
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              boxShadow: isDarkMode
                ? '0 24px 60px rgba(0,0,0,0.5)'
                : '0 24px 60px rgba(0,0,0,0.15)',
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
              <h3
                style={{
                  margin: 0,
                  color: isDarkMode ? '#fff' : '#111827',
                  fontSize: '18px',
                }}
              >
                Chỉnh sửa nhân viên
              </h3>
              <button
                onClick={() => setEditingEmployee(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6b7280',
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
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151',
                    fontSize: '13px',
                    marginBottom: '6px',
                  }}
                >
                  Họ tên
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fullName: e.target.value })
                  }
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#d1d5db'}`,
                    borderRadius: '8px',
                    color: isDarkMode ? '#fff' : '#111827',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151',
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
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#d1d5db'}`,
                    borderRadius: '8px',
                    color: isDarkMode ? '#fff' : '#111827',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151',
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
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#d1d5db'}`,
                    borderRadius: '8px',
                    color: isDarkMode ? '#fff' : '#111827',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151',
                    fontSize: '13px',
                    marginBottom: '6px',
                  }}
                >
                  Ngày sinh
                </label>
                <input
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dateOfBirth: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#d1d5db'}`,
                    borderRadius: '8px',
                    color: isDarkMode ? '#fff' : '#111827',
                    outline: 'none',
                    colorScheme: isDarkMode ? 'dark' : 'light',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151',
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
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#d1d5db'}`,
                    borderRadius: '8px',
                    color: isDarkMode ? '#fff' : '#111827',
                    outline: 'none',
                  }}
                >
                  <option value="ACTIVE">Đang làm việc</option>
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
                  onClick={() => setEditingEmployee(null)}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db'}`,
                    color: isDarkMode ? '#fff' : '#374151',
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
      {deletingEmployee && (
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
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              textAlign: 'center',
              boxShadow: isDarkMode
                ? '0 24px 60px rgba(0,0,0,0.5)'
                : '0 24px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                background: isDarkMode ? 'rgba(220,38,38,0.1)' : '#fef2f2',
                color: '#dc2626',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Trash2 size={24} />
            </div>
            <h3
              style={{
                margin: '0 0 8px 0',
                color: isDarkMode ? '#fff' : '#111827',
                fontSize: '18px',
              }}
            >
              Xác nhận xoá nhân viên
            </h3>
            <p
              style={{
                color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6b7280',
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: 1.5,
              }}
            >
              Bạn có chắc chắn muốn xoá nhân viên{' '}
              <strong style={{ color: isDarkMode ? '#fff' : '#111827' }}>
                {deletingEmployee.fullName}
              </strong>
              ? Nhân viên này sẽ bị vô hiệu hoá và chuyển vào danh sách đã xoá.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeletingEmployee(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db'}`,
                  color: isDarkMode ? '#fff' : '#374151',
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
                {isDeleting ? 'Đang xoá...' : 'Xác nhận xoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoringEmployee && (
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
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              textAlign: 'center',
              boxShadow: isDarkMode
                ? '0 24px 60px rgba(0,0,0,0.5)'
                : '0 24px 60px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                background: isDarkMode ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
                color: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Check size={24} />
            </div>
            <h3
              style={{
                margin: '0 0 8px 0',
                color: isDarkMode ? '#fff' : '#111827',
                fontSize: '18px',
              }}
            >
              Xác nhận khôi phục
            </h3>
            <p
              style={{
                color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6b7280',
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: 1.5,
              }}
            >
              Bạn có chắc chắn muốn khôi phục nhân viên{' '}
              <strong style={{ color: isDarkMode ? '#fff' : '#111827' }}>
                {restoringEmployee.fullName}
              </strong>
              ? Tài khoản của họ sẽ được kích hoạt trở lại.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setRestoringEmployee(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.2)' : '#d1d5db'}`,
                  color: isDarkMode ? '#fff' : '#374151',
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
                {isRestoring ? 'Đang khôi phục...' : 'Xác nhận khôi phục'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {isCreating && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              padding: '28px 32px',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              border: `1px solid ${isDarkMode ? 'rgba(245,158,11,0.2)' : '#e5e7eb'}`,
              boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
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
                    width: '40px',
                    height: '40px',
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
                    Thêm nhân viên mới
                  </h3>
                  <p
                    style={{
                      margin: '2px 0 0 0',
                      color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#6b7280',
                      fontSize: '12px',
                    }}
                  >
                    Tài khoản sẽ được gửi qua email
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                  color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6b7280',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              noValidate
              onSubmit={handleCreateSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {/* Họ tên */}
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#4b5563',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  Họ và tên <span style={{ color: '#f59e0b' }}>*</span>
                </label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) =>
                    handleCreateFieldChange('fullName', e.target.value)
                  }
                  onBlur={() => handleCreateFieldBlur('fullName')}
                  placeholder="Nguyễn Văn A"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${createFieldErrors.fullName ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                    borderRadius: '9px',
                    color: isDarkMode ? '#fff' : '#111827',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: '"Inter", sans-serif',
                  }}
                />
                {createFieldErrors.fullName && (
                  <p
                    style={{
                      color: '#dc2626',
                      fontSize: '11px',
                      margin: '4px 0 0 2px',
                    }}
                  >
                    {createFieldErrors.fullName}
                  </p>
                )}
              </div>

              {/* Tên đăng nhập */}
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#4b5563',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  Tên đăng nhập <span style={{ color: '#f59e0b' }}>*</span>
                </label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) =>
                    handleCreateFieldChange('username', e.target.value)
                  }
                  onBlur={() => handleCreateFieldBlur('username')}
                  placeholder="nhanvien01"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${createFieldErrors.username ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                    borderRadius: '9px',
                    color: isDarkMode ? '#fff' : '#111827',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: '"Inter", sans-serif',
                  }}
                />
                {createFieldErrors.username && (
                  <p
                    style={{
                      color: '#dc2626',
                      fontSize: '11px',
                      margin: '4px 0 0 2px',
                    }}
                  >
                    {createFieldErrors.username}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#4b5563',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  Email <span style={{ color: '#f59e0b' }}>*</span>
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    handleCreateFieldChange('email', e.target.value)
                  }
                  onBlur={() => handleCreateFieldBlur('email')}
                  placeholder="nhanvien@email.com"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: isDarkMode ? '#242424' : '#f9fafb',
                    border: `1px solid ${createFieldErrors.email ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                    borderRadius: '9px',
                    color: isDarkMode ? '#fff' : '#111827',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: '"Inter", sans-serif',
                  }}
                />
                {createFieldErrors.email && (
                  <p
                    style={{
                      color: '#dc2626',
                      fontSize: '11px',
                      margin: '4px 0 0 2px',
                    }}
                  >
                    {createFieldErrors.email}
                  </p>
                )}
              </div>

              {/* Phone & DOB row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#4b5563',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '6px',
                    }}
                  >
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={createForm.phoneNumber}
                    onChange={(e) =>
                      handleCreateFieldChange('phoneNumber', e.target.value)
                    }
                    onBlur={() => handleCreateFieldBlur('phoneNumber')}
                    placeholder="0901234567"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: isDarkMode ? '#242424' : '#f9fafb',
                      border: `1px solid ${createFieldErrors.phoneNumber ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                      borderRadius: '9px',
                      color: isDarkMode ? '#fff' : '#111827',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: '"Inter", sans-serif',
                    }}
                  />
                  {createFieldErrors.phoneNumber && (
                    <p
                      style={{
                        color: '#dc2626',
                        fontSize: '11px',
                        margin: '4px 0 0 2px',
                      }}
                    >
                      {createFieldErrors.phoneNumber}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#4b5563',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '6px',
                    }}
                  >
                    Ngày sinh <span style={{ color: '#f59e0b' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={createForm.dateOfBirth}
                    onChange={(e) =>
                      handleCreateFieldChange('dateOfBirth', e.target.value)
                    }
                    onBlur={() => handleCreateFieldBlur('dateOfBirth')}
                    max={(() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() - 18);
                      return d.toISOString().split('T')[0];
                    })()}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: isDarkMode ? '#242424' : '#f9fafb',
                      border: `1px solid ${createFieldErrors.dateOfBirth ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                      borderRadius: '9px',
                      color: isDarkMode ? '#fff' : '#111827',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: '"Inter", sans-serif',
                      colorScheme: isDarkMode ? 'dark' : 'light',
                    }}
                  />
                  {createFieldErrors.dateOfBirth && (
                    <p
                      style={{
                        color: '#dc2626',
                        fontSize: '11px',
                        margin: '4px 0 0 2px',
                      }}
                    >
                      {createFieldErrors.dateOfBirth}
                    </p>
                  )}
                </div>
              </div>

              {/* Mật khẩu */}
              <div
                style={{
                  borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#e5e7eb'}`,
                  paddingTop: '14px',
                  marginTop: '2px',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#4b5563',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  Mật khẩu <span style={{ color: '#f59e0b' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) =>
                      handleCreateFieldChange('password', e.target.value)
                    }
                    onBlur={() => handleCreateFieldBlur('password')}
                    placeholder="Tối thiểu 8 ký tự, hoa, thường, số, ký tự đặc biệt"
                    style={{
                      width: '100%',
                      padding: '11px 44px 11px 14px',
                      background: isDarkMode ? '#242424' : '#f9fafb',
                      border: `1px solid ${createFieldErrors.password ? '#dc2626' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                      borderRadius: '9px',
                      color: isDarkMode ? '#fff' : '#111827',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: '"Inter", sans-serif',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword((p) => !p)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9ca3af',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '13px',
                    }}
                  >
                    {showCreatePassword ? '🙈' : '👁'}
                  </button>
                </div>
                {createFieldErrors.password && (
                  <p
                    style={{
                      color: '#dc2626',
                      fontSize: '11px',
                      margin: '4px 0 0 2px',
                    }}
                  >
                    {createFieldErrors.password}
                  </p>
                )}
                {/* Password strength indicator */}
                {createForm.password &&
                  (() => {
                    const checks = [
                      createForm.password.length >= 8,
                      /[A-Z]/.test(createForm.password),
                      /[a-z]/.test(createForm.password),
                      /[0-9]/.test(createForm.password),
                      /[^A-Za-z0-9]/.test(createForm.password),
                    ];
                    const passed = checks.filter(Boolean).length;
                    const colors = [
                      '#dc2626',
                      '#f59e0b',
                      '#f59e0b',
                      '#10b981',
                      '#10b981',
                    ];
                    const labels = [
                      'Rất yếu',
                      'Yếu',
                      'Trung bình',
                      'Mạnh',
                      'Rất mạnh',
                    ];
                    return (
                      <div style={{ marginTop: '8px' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '4px',
                            marginBottom: '4px',
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                height: '3px',
                                borderRadius: '2px',
                                background:
                                  i <= passed
                                    ? colors[passed - 1]
                                    : isDarkMode
                                      ? 'rgba(255,255,255,0.1)'
                                      : '#e5e7eb',
                                transition: 'background 0.3s',
                              }}
                            />
                          ))}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <p
                            style={{
                              color:
                                colors[passed - 1] ||
                                (isDarkMode
                                  ? 'rgba(255,255,255,0.3)'
                                  : '#9ca3af'),
                              fontSize: '11px',
                              margin: 0,
                            }}
                          >
                            {labels[passed - 1] || ''}
                          </p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {[
                              { label: '8+ ký tự', ok: checks[0] },
                              { label: 'Hoa', ok: checks[1] },
                              { label: 'Thường', ok: checks[2] },
                              { label: 'Số', ok: checks[3] },
                              { label: 'Đặc biệt', ok: checks[4] },
                            ].map((c) => (
                              <span
                                key={c.label}
                                style={{
                                  fontSize: '10px',
                                  color: c.ok
                                    ? '#10b981'
                                    : isDarkMode
                                      ? 'rgba(255,255,255,0.3)'
                                      : '#9ca3af',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <span>{c.ok ? '✓' : '○'}</span> {c.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
              </div>

              {/* Xác nhận mật khẩu */}
              <div>
                <label
                  style={{
                    display: 'block',
                    color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#4b5563',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  Xác nhận mật khẩu <span style={{ color: '#f59e0b' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCreateConfirmPassword ? 'text' : 'password'}
                    value={createForm.confirmPassword}
                    onChange={(e) =>
                      handleCreateFieldChange('confirmPassword', e.target.value)
                    }
                    onBlur={() => handleCreateFieldBlur('confirmPassword')}
                    placeholder="Nhập lại mật khẩu"
                    style={{
                      width: '100%',
                      padding: '11px 44px 11px 14px',
                      background: isDarkMode ? '#242424' : '#f9fafb',
                      border: `1px solid ${createFieldErrors.confirmPassword ? '#dc2626' : createForm.confirmPassword && createForm.confirmPassword === createForm.password ? '#10b981' : isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                      borderRadius: '9px',
                      color: isDarkMode ? '#fff' : '#111827',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: '"Inter", sans-serif',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateConfirmPassword((p) => !p)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9ca3af',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '13px',
                    }}
                  >
                    {showCreateConfirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {createFieldErrors.confirmPassword && (
                  <p
                    style={{
                      color: '#dc2626',
                      fontSize: '11px',
                      margin: '4px 0 0 2px',
                    }}
                  >
                    {createFieldErrors.confirmPassword}
                  </p>
                )}
                {createForm.confirmPassword &&
                  !createFieldErrors.confirmPassword &&
                  createForm.confirmPassword === createForm.password && (
                    <p
                      style={{
                        color: '#10b981',
                        fontSize: '11px',
                        margin: '4px 0 0 2px',
                      }}
                    >
                      ✓ Mật khẩu khớp
                    </p>
                  )}
              </div>

              {/* Error message */}
              {createError && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: isDarkMode ? 'rgba(220,38,38,0.1)' : '#fef2f2',
                    border: `1px solid ${isDarkMode ? 'rgba(220,38,38,0.3)' : '#fecaca'}`,
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '13px',
                  }}
                >
                  {createError}
                </div>
              )}

              {/* Info note */}
              <div
                style={{
                  padding: '10px 14px',
                  background: isDarkMode ? 'rgba(245,158,11,0.08)' : '#fffbeb',
                  border: `1px solid ${isDarkMode ? 'rgba(245,158,11,0.2)' : '#fde68a'}`,
                  borderRadius: '8px',
                  color: isDarkMode ? 'rgba(245,158,11,0.9)' : '#d97706',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span style={{ flexShrink: 0 }}>📧</span>
                <span>
                  Thông tin tài khoản (tên đăng nhập và mật khẩu) sẽ được gửi tự
                  động đến email của nhân viên sau khi tạo.
                </span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                    color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Huỷ
                </button>
                <>
                  {!isStaff && (
                    <button
                      type="submit"
                      disabled={isCreatingLoading}
                      style={{
                        flex: 2,
                        padding: '12px',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: isCreatingLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 700,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: isCreatingLoading
                          ? isDarkMode
                            ? 'rgba(220,38,38,0.4)'
                            : '#fca5a5'
                          : 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
                        color: '#fff',
                        boxShadow: isCreatingLoading
                          ? 'none'
                          : '0 4px 14px rgba(220,38,38,0.3)',
                      }}
                    >
                      <UserPlus size={16} />
                      {isCreatingLoading ? 'Đang tạo...' : 'Tạo nhân viên'}
                    </button>
                  )}
                </>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
