import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../shared/api/client';
import { X, Edit2, Trash2, Plus, AlertCircle } from 'lucide-react';
import { useToastStore } from '../hooks/useToastStore';

const API_PATH = '/admin/bad-words'; // Since client has apiBaseUrl, wait, actually we need the full relative path from apiBaseUrl. Assuming apiBaseUrl is e.g. 'http://localhost:8080/api', then API_PATH is '/admin/bad-words'.

const REASON_MAP = {
  'SPOILER': 'Chứa nội dung Spoil (Tiết lộ nội dung phim)',
  'HARASSMENT': 'Ngôn từ thù ghét / Quấy rối',
  'SPAM': 'Spam / Quảng cáo rác',
  'IRRELEVANT': 'Không liên quan đến phim',
  'OTHER': 'Khác'
};

const SUB_REASON_MAP = {
  'RACISM_RELIGION': 'Phân biệt chủng tộc / tôn giáo',
  'SEXISM': 'Phân biệt giới tính',
  'PERSONAL_ATTACK': 'Công kích cá nhân / Lăng mạ',
  'PROMOTING': 'Quảng cáo sản phẩm / dịch vụ',
  'REPETITIVE': 'Bình luận lặp đi lặp lại',
  'SUSPICIOUS_LINK': 'Đường link đáng ngờ',
  'POLITICAL_SOCIAL': 'Bàn luận vấn đề chính trị/xã hội',
  'MEANINGLESS': 'Nội dung vô nghĩa / Câu view'
};

export default function BadWordManagementModal({ onClose }) {
  const [badWords, setBadWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const { addToast } = useToastStore();

  // Form states
  const [word, setWord] = useState('');
  const [reason, setReason] = useState('HARASSMENT');
  const [subReason, setSubReason] = useState('');

  const fetchBadWords = async () => {
    try {
      setIsLoading(true);
      const data = await apiGet(API_PATH);
      setBadWords(data || []);
    } catch (error) {
      addToast({ type: 'error', message: 'Lỗi khi tải danh sách từ cấm' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBadWords();
  }, []);

  const resetForm = () => {
    setWord('');
    setReason('HARASSMENT');
    setSubReason('');
    setEditingId(null);
  };

  const handleEdit = (bw) => {
    setWord(bw.word);
    setReason(bw.reason || 'HARASSMENT');
    setSubReason(bw.subReason || '');
    setEditingId(bw.id);
  };

  const handleDelete = async (id) => {
    try {
      await apiDelete(`${API_PATH}/${id}`);
      addToast({ type: 'success', message: 'Xóa từ khóa thành công' });
      setDeleteConfirmId(null);
      fetchBadWords();
    } catch (error) {
      addToast({ type: 'error', message: 'Xóa thất bại' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!word.trim()) {
      addToast({ type: 'error', message: 'Vui lòng nhập từ cấm' });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = { word: word.trim(), reason, subReason: subReason || null };

      if (editingId) {
        await apiPut(`${API_PATH}/${editingId}`, payload);
        addToast({ type: 'success', message: 'Cập nhật thành công' });
      } else {
        await apiPost(API_PATH, payload);
        addToast({ type: 'success', message: 'Thêm từ khóa thành công' });
      }
      
      resetForm();
      fetchBadWords();
    } catch (error) {
      addToast({ type: 'error', message: error.message || 'Có lỗi xảy ra' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset subReason if reason changes and subReason doesn't apply
  useEffect(() => {
    if (reason === 'SPOILER' || reason === 'SPAM' || reason === 'IRRELEVANT') {
      setSubReason('');
    }
  }, [reason]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-[20px]">gavel</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white m-0">Quản lý Từ khóa cấm</h2>
              <p className="text-xs text-white/50 m-0 mt-1">Hệ thống sẽ dựa vào danh sách này để tự động lọc và xử lý vi phạm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Form (Left Side) */}
          <div className="w-[350px] p-5 border-r border-white/10 flex flex-col gap-5 bg-[#171717] overflow-y-auto">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              {editingId ? 'Sửa Từ khóa' : 'Thêm Từ khóa mới'}
            </h3>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/70">Từ khóa</label>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="Nhập từ cấm (VD: dm, spoil)..."
                  className="bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/70">Phân loại (Lý do)</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
                >
                  {Object.entries(REASON_MAP).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {reason === 'HARASSMENT' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-white/70">Lý do phụ (Tùy chọn)</label>
                  <select
                    value={subReason}
                    onChange={(e) => setSubReason(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="">-- Không chọn --</option>
                    {Object.entries(SUB_REASON_MAP).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-white/10 dark:disabled:text-white/40 disabled:cursor-not-allowed"
                >
                  {editingId ? <Edit2 size={16} /> : <Plus size={16} />}
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>

            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <AlertCircle size={14} /> Lưu ý
              </div>
              Các từ khóa hệ thống sẽ kiểm tra tự động khi người dùng đăng đánh giá. Không phân biệt chữ hoa, chữ thường.
            </div>
          </div>

          {/* List (Right Side) */}
          <div className="flex-1 flex flex-col bg-[#141414]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-medium text-white/70">
                Danh sách từ cấm ({badWords.length})
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="text-center text-white/40 py-10 text-sm">Đang tải dữ liệu...</div>
              ) : badWords.length === 0 ? (
                <div className="text-center text-white/40 py-10 text-sm">Chưa có từ khóa nào được thiết lập.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {badWords.map((bw) => (
                    <div 
                      key={bw.id} 
                      className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2 relative group hover:border-white/20 transition-colors"
                    >
                      <div className="font-bold text-red-400 text-base break-all">
                        {bw.word}
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-white/60">
                        <span className="bg-black/30 px-2 py-1 rounded inline-block w-fit border border-white/5">
                          {REASON_MAP[bw.reason] || bw.reason || 'Khác'}
                        </span>
                        {bw.subReason && (
                          <span className="text-white/40 italic ml-1">
                            ↳ {SUB_REASON_MAP[bw.subReason] || bw.subReason}
                          </span>
                        )}
                      </div>
                      
                      {/* Actions overlay */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button 
                          onClick={() => handleEdit(bw)}
                          className="p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/40 transition-colors"
                          title="Sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(bw.id)}
                          className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle size={24} />
              <h3 className="text-lg font-bold text-white">Xác nhận xóa</h3>
            </div>
            <p className="text-sm text-white/70">
              Bạn có chắc chắn muốn xóa từ khóa này? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Xóa từ khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
