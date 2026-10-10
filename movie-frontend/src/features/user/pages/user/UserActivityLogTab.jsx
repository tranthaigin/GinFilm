import React, { useState, useEffect } from 'react';
import { apiGet } from '../../../../shared/api/client';
import { useToastStore } from '../../../user/store/toastStore';

export default function UserActivityLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToastStore((s) => s.showToast);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isItemsDropdownOpen, setIsItemsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchLogs(currentPage - 1);
  }, [currentPage, itemsPerPage]);

  const fetchLogs = async (pageIndex) => {
    try {
      setLoading(true);
      const data = await apiGet(`/users/security-activities?page=${pageIndex}&size=${itemsPerPage}`);
      if (data && data.content) {
        setLogs(data.content);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi tải lịch sử hoạt động', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getActionName = (actionType) => {
    switch (actionType) {
      case 'LOGIN': return 'Đăng nhập';
      case 'LOGOUT': return 'Đăng xuất';
      case 'ACCOUNT_CREATED': return 'Tạo tài khoản';
      case 'PASSWORD_CHANGED': return 'Đổi mật khẩu';
      case 'PIN_SETUP': return 'Thiết lập mã PIN';
      case 'PIN_CHANGED': return 'Đổi/Reset mã PIN';
      case 'FORGOT_PASSWORD_RESET': return 'Khôi phục mật khẩu';
      default: return actionType;
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'LOGIN': return 'login';
      case 'LOGOUT': return 'logout';
      case 'ACCOUNT_CREATED': return 'person_add';
      case 'PASSWORD_CHANGED': return 'key';
      case 'PIN_SETUP':
      case 'PIN_CHANGED': return 'pin';
      default: return 'history';
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'LOGIN': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'LOGOUT': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      case 'ACCOUNT_CREATED': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'PASSWORD_CHANGED': 
      case 'PIN_SETUP':
      case 'PIN_CHANGED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-[#e61a27] bg-[#e61a27]/10 border-[#e61a27]/20';
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-[#e61a27] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Lịch sử hoạt động bảo mật</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Theo dõi các phiên đăng nhập và thay đổi bảo mật của bạn</p>
        </div>
        <div 
          className={`relative flex items-center gap-2 bg-white dark:bg-[#18181b] rounded-lg border w-full sm:w-auto px-4 py-2 transition-all group cursor-pointer select-none outline-none ${
            isItemsDropdownOpen ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
          }`}
          tabIndex={0}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsItemsDropdownOpen(false) }}
          onClick={() => setIsItemsDropdownOpen(!isItemsDropdownOpen)}
        >
          <div className="flex-1 flex items-center justify-between min-w-[90px]">
            <span className="text-sm font-semibold text-gray-700 dark:text-white">
              {itemsPerPage} / trang
            </span>
            <span className={`material-symbols-outlined text-[20px] text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isItemsDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </div>
          
          {isItemsDropdownOpen && (
            <div className="absolute top-full right-0 sm:auto mt-2 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 py-1 min-w-[120px]">
              {[5, 6, 7, 10, 15, 20, 30].map(size => (
                <div 
                  key={size}
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemsPerPage(size);
                    setCurrentPage(1);
                    setIsItemsDropdownOpen(false);
                  }}
                  className={`px-4 py-2 text-sm font-semibold cursor-pointer transition-colors ${
                    itemsPerPage === size ? 'bg-red-500/10 text-red-500' : 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  {size} / trang
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/5 rounded-2xl p-6">
        <div className="max-h-[290px] overflow-y-auto custom-scrollbar pr-4 -mr-2">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">history</span>
            <p>Không có hoạt động nào được ghi nhận.</p>
          </div>
        ) : (
          <div className="relative border-l border-gray-200 dark:border-white/10 ml-8 space-y-6 pb-4 pt-2">
            {logs.map((log, index) => (
              <div key={log.id || index} className="relative pl-8">
                {/* Timeline Node */}
                <div className={`absolute -left-5 top-1 flex items-center justify-center w-10 h-10 rounded-full border shadow-sm ${getActionColor(log.actionType)}`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {getActionIcon(log.actionType)}
                  </span>
                </div>
                
                {/* Content */}
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {getActionName(log.actionType)}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="material-symbols-outlined text-[16px] text-gray-400 dark:text-gray-500">devices</span>
                      <span className="font-medium">Thiết bị:</span> {log.deviceInfo || 'Không xác định'}
                    </div>
                    {log.ipAddress && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="material-symbols-outlined text-[16px] text-gray-400 dark:text-gray-500">public</span>
                        <span className="font-medium">IP:</span> {log.ipAddress}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>


    </div>
  );
}
