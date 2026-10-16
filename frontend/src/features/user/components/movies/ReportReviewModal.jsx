import { useState } from 'react';

export default function ReportReviewModal({
  isOpen,
  reviewId,
  onClose,
  onSubmit
}) {
  const [reportReason, setReportReason] = useState('');
  const [reportSubReason, setReportSubReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !reviewId) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const success = await onSubmit(reviewId, reportReason, reportSubReason, reportDetails);
    setIsSubmitting(false);
    if (success) {
      setReportSuccess(true);
    }
  };

  const handleClose = () => {
    setReportSuccess(false);
    setReportReason('');
    setReportSubReason('');
    setReportDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl transition-all duration-300" onClick={e => e.stopPropagation()}>
        {reportSuccess ? (
          <div className="flex flex-col items-center text-center py-6 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[40px] text-green-500">check_circle</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Đã gửi báo cáo</h3>
            <p className="text-gray-600 dark:text-[#9D9D9D] text-sm mb-6 leading-relaxed">
              Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét cẩn thận và có biện pháp xử lý phù hợp. Đánh giá này đã được tạm ẩn khỏi màn hình của bạn.
            </p>
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-white bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">flag</span>
              Báo cáo đánh giá
            </h3>
            <p className="text-sm text-gray-600 dark:text-[#9D9D9D] mb-4">Vui lòng chọn lý do bạn báo cáo đánh giá này:</p>

            <div className="flex flex-col gap-2.5 mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {[
                { id: 'SPOILER', label: 'Chứa nội dung Spoil (Tiết lộ nội dung phim)' },
                {
                  id: 'HARASSMENT',
                  label: 'Ngôn từ thù ghét / Quấy rối',
                  subs: [
                    { id: 'RACISM_RELIGION', label: 'Phân biệt chủng tộc / tôn giáo' },
                    { id: 'SEXISM', label: 'Phân biệt giới tính' },
                    { id: 'PERSONAL_ATTACK', label: 'Công kích cá nhân / Lăng mạ' }
                  ]
                },
                {
                  id: 'SPAM',
                  label: 'Spam / Quảng cáo rác',
                  subs: [
                    { id: 'PROMOTING', label: 'Quảng cáo sản phẩm / dịch vụ' },
                    { id: 'REPETITIVE', label: 'Bình luận lặp đi lặp lại' },
                    { id: 'SUSPICIOUS_LINK', label: 'Đường link đáng ngờ' }
                  ]
                },
                {
                  id: 'IRRELEVANT',
                  label: 'Không liên quan đến phim',
                  subs: [
                    { id: 'POLITICAL_SOCIAL', label: 'Bàn luận vấn đề chính trị/xã hội' },
                    { id: 'MEANINGLESS', label: 'Nội dung vô nghĩa / Câu view' }
                  ]
                },
                { id: 'OTHER', label: 'Khác (Nhập chi tiết)' }
              ].map(reason => {
                const isSelected = reportReason === reason.id;
                return (
                  <div key={reason.id} className={`flex flex-col rounded-xl border transition-all duration-300 overflow-hidden ${isSelected ? 'border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-[#222]' : 'border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/10 bg-white hover:bg-gray-50 dark:bg-black dark:hover:bg-[#18181b]'}`}>
                    <div
                      className="flex items-center gap-3 p-3.5 cursor-pointer select-none"
                      onClick={() => {
                        setReportReason(reason.id);
                        if (!reason.subs) setReportSubReason('');
                      }}
                    >
                      <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center transition-colors ${isSelected ? 'border-red-500' : 'border-gray-500'}`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-in zoom-in duration-200"></div>}
                      </div>
                      <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-[#9D9D9D]'}`}>{reason.label}</span>
                    </div>

                    {/* Accordion content for sub-reasons */}
                    {isSelected && reason.subs && (
                      <div className="flex flex-col gap-1.5 px-4 pb-3.5 pt-1 animate-in slide-in-from-top-2 fade-in duration-300">
                        <div className="w-full h-[1px] bg-gray-200 dark:bg-white/5 mb-2"></div>
                        {reason.subs.map(sub => (
                          <label key={sub.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
                            <input type="radio" name="reportSubReason" value={sub.id} checked={reportSubReason === sub.id} onChange={() => setReportSubReason(sub.id)} className="accent-red-500 w-4 h-4 hidden" />
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${reportSubReason === sub.id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400'}`}>
                              {reportSubReason === sub.id && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                            </div>
                            <span className={`text-[13px] ${reportSubReason === sub.id ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 group-hover:text-gray-700 dark:text-[#9D9D9D] dark:group-hover:text-[#9D9D9D]'}`}>{sub.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Accordion content for OTHER */}
                    {isSelected && reason.id === 'OTHER' && (
                      <div className="px-3.5 pb-3.5 pt-1 animate-in slide-in-from-top-2 fade-in duration-300">
                        <textarea
                          className="w-full bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg p-3.5 text-gray-900 dark:text-white text-sm leading-relaxed focus:outline-none focus:border-gray-400 dark:focus:border-white/20 focus:bg-gray-50 dark:focus:bg-black/50 transition-colors resize-none break-all report-textarea-no-scrollbar"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                          rows={3}
                          spellCheck="false"
                          placeholder="Vui lòng cho biết thêm chi tiết..."
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                        ></textarea>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
              <button onClick={handleClose} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-white bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors">
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !reportReason ||
                  (reportReason === 'OTHER' && !reportDetails.trim()) ||
                  (['HARASSMENT', 'SPAM', 'IRRELEVANT'].includes(reportReason) && !reportSubReason)
                }
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#e50914] hover:bg-[#b80710] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-500/20"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
