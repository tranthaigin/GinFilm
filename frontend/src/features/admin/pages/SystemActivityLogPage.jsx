import { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { apiGet } from '../../../shared/api/client';
import { useToastStore } from '../../user/store/toastStore';
import { Shield } from 'lucide-react';
import Pagination from '../../../shared/components/Pagination';

export default function SystemActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.showToast);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchLogs = useCallback(
    (pageIndex, role) => {
      const url = `/admin/security-activities?page=${pageIndex}&size=${itemsPerPage}${role ? `&role=${role}` : ''}`;
      return apiGet(url)
        .then((data) => {
          if (data && data.content) {
            setLogs(data.content);
            setTotalPages(data.totalPages);
          }
        })
        .catch((err) => {
          showToast(err.message || 'Lỗi khi tải nhật ký hệ thống', 'error');
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [itemsPerPage, showToast]
  );

  const loadKey1 = JSON.stringify([currentPage, roleFilter, itemsPerPage]);
  const [previousLoadKey1, setPreviousLoadKey1] = useState(null);
  if (previousLoadKey1 !== loadKey1) {
    setPreviousLoadKey1(loadKey1);
    setLoading(true);
  }

  useEffect(() => {
    fetchLogs(currentPage - 1, roleFilter);
  }, [currentPage, roleFilter, itemsPerPage, fetchLogs]);

  const getActionName = (actionType) => {
    switch (actionType) {
      case 'LOGIN':
        return 'Đăng nhập';
      case 'LOGOUT':
        return 'Đăng xuất';
      case 'ACCOUNT_CREATED':
        return 'Tạo tài khoản';
      case 'PASSWORD_CHANGED':
        return 'Đổi mật khẩu';
      case 'PIN_SETUP':
        return 'Thiết lập mã PIN';
      case 'PIN_CHANGED':
        return 'Đổi/Reset mã PIN';
      case 'FORGOT_PASSWORD_RESET':
        return 'Khôi phục mật khẩu';
      default:
        return actionType;
    }
  };

  const filteredLogs = logs.filter((log) => {
    let matchTime = true;
    const logDate = new Date(log.createdAt);

    if (filterStartDate) {
      const startDate = new Date(filterStartDate);
      startDate.setHours(0, 0, 0, 0);
      if (logDate < startDate) matchTime = false;
    }
    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (logDate > endDate) matchTime = false;
    }

    if (filterStartTime || filterEndTime) {
      const logTimeMinutes = logDate.getHours() * 60 + logDate.getMinutes();
      if (filterStartTime) {
        const [h, m] = filterStartTime.split(':').map(Number);
        if (logTimeMinutes < h * 60 + m) matchTime = false;
      }
      if (filterEndTime) {
        const [h, m] = filterEndTime.split(':').map(Number);
        if (logTimeMinutes > h * 60 + m) matchTime = false;
      }
    }

    if (!matchTime) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.user?.email?.toLowerCase().includes(term) ||
      log.user?.fullName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
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
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white m-0">
              Nhật ký Hệ Thống
            </h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => {
            setRoleFilter('');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            !roleFilter
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => {
            setRoleFilter('USER');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            roleFilter === 'USER'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          User
        </button>
        <button
          onClick={() => {
            setRoleFilter('STAFF');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            roleFilter === 'STAFF'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Staff
        </button>
        <button
          onClick={() => {
            setRoleFilter('ADMIN');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            roleFilter === 'ADMIN'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-white/5 text-[#9D9D9D] hover:bg-white/10 hover:text-white'
          }`}
        >
          Admin
        </button>
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
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo email hoặc tên..."
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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#141414',
            padding: '6px 12px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            minWidth: '140px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Từ ngày:</span>
          <input
            type="date"
            value={filterStartDate}
            max={filterEndDate}
            onChange={(e) => {
              if (filterEndDate && e.target.value > filterEndDate) {
                showToast('Từ ngày không được lớn hơn Đến ngày.', 'error');
              } else {
                setFilterStartDate(e.target.value);
                setCurrentPage(1);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              padding: '4px',
              outline: 'none',
              fontSize: '13px',
            }}
          />
          <div
            style={{
              width: '1px',
              height: '16px',
              background: 'rgba(255,255,255,0.2)',
            }}
          ></div>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Đến:</span>
          <input
            type="date"
            value={filterEndDate}
            min={filterStartDate}
            onChange={(e) => {
              if (filterStartDate && e.target.value < filterStartDate) {
                showToast('Đến ngày không được nhỏ hơn Từ ngày.', 'error');
              } else {
                setFilterEndDate(e.target.value);
                setCurrentPage(1);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              padding: '4px',
              outline: 'none',
              fontSize: '13px',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#141414',
            padding: '6px 12px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Từ giờ:</span>
          <input
            type="time"
            value={filterStartTime}
            max={filterEndTime}
            onChange={(e) => {
              if (filterEndTime && e.target.value > filterEndTime) {
                showToast('Từ giờ không được lớn hơn Đến giờ.', 'error');
              } else {
                setFilterStartTime(e.target.value);
                setCurrentPage(1);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              padding: '4px',
              outline: 'none',
              fontSize: '13px',
            }}
          />
          <div
            style={{
              width: '1px',
              height: '16px',
              background: 'rgba(255,255,255,0.2)',
            }}
          ></div>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Đến:</span>
          <input
            type="time"
            value={filterEndTime}
            min={filterStartTime}
            onChange={(e) => {
              if (filterStartTime && e.target.value < filterStartTime) {
                showToast('Đến giờ không được nhỏ hơn Từ giờ.', 'error');
              } else {
                setFilterEndTime(e.target.value);
                setCurrentPage(1);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              padding: '4px',
              outline: 'none',
              fontSize: '13px',
            }}
          />
        </div>

        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="px-3 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{ padding: '12px 16px', minWidth: '120px' }}
        >
          {[5, 6, 7, 10, 15, 20, 30].map((size) => (
            <option key={size} value={size}>
              {size} / trang
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#dc2626] border-t-transparent rounded-full animate-spin"></div>
            <Shield
              className="absolute text-[#dc2626] animate-pulse"
              size={28}
            />
          </div>
          <div className="text-[#9D9D9D] text-sm font-medium tracking-wider animate-pulse uppercase">
            Đang tải dữ liệu...
          </div>
        </div>
      ) : (
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
                <tr className="border-b border-white/10">
                  <th className="py-4 px-4 font-medium">Thời gian</th>
                  <th className="py-4 px-4 font-medium">Người dùng</th>
                  <th className="py-4 px-4 font-medium">Hành động</th>
                  <th className="py-4 px-4 font-medium">Thiết bị</th>
                  <th className="py-4 px-4 font-medium">Mã thiết bị</th>
                  <th className="py-4 px-4 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-4 text-white text-sm">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white text-sm font-medium">
                          {log.user?.fullName || log.user?.username}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {log.user?.email}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            log.actionType === 'LOGIN'
                              ? 'bg-blue-500/20 text-blue-400'
                              : log.actionType === 'LOGOUT'
                                ? 'bg-gray-500/20 text-gray-400'
                                : log.actionType === 'ACCOUNT_CREATED'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {getActionName(log.actionType)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-300 text-sm">
                        {log.deviceInfo}
                      </td>
                      <td
                        className="py-4 px-4 text-gray-400 text-xs font-mono max-w-[150px] truncate"
                        title={log.deviceId}
                      >
                        {log.deviceId}
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-sm">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-500">
                      Không tìm thấy lịch sử nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />
      )}
    </div>
  );
}
