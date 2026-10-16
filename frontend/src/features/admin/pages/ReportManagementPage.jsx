import { useState } from "react";
import { AlertTriangle, Eye, Check, ArrowLeft, EyeOff } from "lucide-react";
import { useReportManagement } from '../hooks/useReportManagement';
import Pagination from '../../../shared/components/Pagination';

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

import BadWordManagementModal from '../components/BadWordManagementModal';

const isSpoilerReportItem = (r) => {
  if (!r) return false;
  return r.isSpoilerReport === true ||
         r.reportReason === 'SPOILER' ||
         (typeof r.reportReason === 'string' && r.reportReason.startsWith('[SPOILER_REPORT]'));
};

export default function ReportManagementPage() {
  const { reports, isLoading, processReport } = useReportManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, PROCESSED
  const [reportType, setReportType] = useState('VIOLATION'); // VIOLATION, SPOILER
  // Modal states
  const [viewingReport, setViewingReport] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [isBadWordModalOpen, setIsBadWordModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  let filteredReports = reports.filter(r => {
    const isSpoiler = isSpoilerReportItem(r);
    if (reportType === 'VIOLATION' && isSpoiler) return false;
    if (reportType === 'SPOILER' && !isSpoiler) return false;

    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return r.status === 'PENDING';
    if (filter === 'PROCESSED') return r.status !== 'PENDING';
    return true;
  });

  if (searchTerm) {
    filteredReports = filteredReports.filter(r =>
      r.movieTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reporterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reporterEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const currentReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



  const handleProcess = async (action) => {
    if (!viewingReport) return;
    setIsResolving(true);
    const success = await processReport(viewingReport.reportId, action, adminNote);
    setIsResolving(false);
    if (success) {
      setViewingReport(null);
      setAdminNote('');
    }
  };

  if (viewingReport) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', width: '100%', color: '#fff' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => { setViewingReport(null); setAdminNote(''); }}
              style={{
                background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color={isSpoilerReportItem(viewingReport) ? '#f59e0b' : '#dc2626'} />
                {isSpoilerReportItem(viewingReport) ? 'Chi tiết Báo cáo Spoil' : 'Chi tiết Báo cáo Vi phạm'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '2px 0 0 0' }}>
                Xem xét và xử lý báo cáo
              </p>
            </div>
          </div>
        </div>

        {/* Content (2 Columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Cột 1: Người báo cáo */}
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Người báo cáo
            </h3>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{viewingReport.reporterName}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{viewingReport.reporterEmail}</div>
            </div>

            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#f59e0b' }}>Lý do báo cáo:</h4>
            <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 'bold' }}>
                {REASON_MAP[viewingReport.reportReason] || viewingReport.reportReason || 'Không có lý do chi tiết.'}
              </div>
              {viewingReport.reportSubReason && (
                <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.7)', display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#f59e0b' }}>↳</span> {SUB_REASON_MAP[viewingReport.reportSubReason] || viewingReport.reportSubReason}
                </div>
              )}
              {viewingReport.reportDetails && (
                <div style={{ marginTop: '12px', fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '10px' }}>
                  "{viewingReport.reportDetails}"
                </div>
              )}
            </div>
          </div>

          {/* Cột 2: Người bị báo cáo */}
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Người bị báo cáo
            </h3>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{viewingReport.reportedUserName}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{viewingReport.reportedUserEmail}</div>
            </div>

            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#fff' }}>Nội dung đánh giá bị báo cáo:</h4>
            <div style={{ background: '#242424', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '16px' }}>★ {viewingReport.reviewRating}</span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, fontStyle: 'italic', color: 'rgba(255,255,255,0.8)' }}>
                "{viewingReport.reviewContent}"
              </p>
            </div>

            <h4 style={{ margin: '16px 0 12px 0', fontSize: '14px', color: '#fff' }}>Ghi chú nội bộ (Tùy chọn):</h4>
            {viewingReport.status === 'PENDING' ? (
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Nhập ghi chú hoặc lý do xử lý..."
                style={{ width: '100%', height: '80px', background: '#242424', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '12px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
              />
            ) : (
              <div style={{ width: '100%', minHeight: '80px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '12px', fontSize: '14px', fontStyle: viewingReport.adminNote ? 'normal' : 'italic' }}>
                {viewingReport.adminNote || 'Không có ghi chú nào được để lại.'}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px', padding: '24px', background: '#141414', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {viewingReport.status === 'PENDING' ? (
            <>
              <button
                onClick={() => handleProcess('REJECT')}
                disabled={isResolving}
                style={{ padding: '12px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', cursor: isResolving ? 'not-allowed' : 'pointer', fontWeight: 600 }}
              >
                Từ chối báo cáo
              </button>
              {isSpoilerReportItem(viewingReport) ? (
                <button
                  onClick={() => handleProcess('SPOILER')}
                  disabled={isResolving}
                  style={{ padding: '12px 24px', background: '#f59e0b', border: 'none', color: '#fff', borderRadius: '8px', cursor: isResolving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
                >
                  <EyeOff size={18} /> Đánh dấu Spoil & Ẩn
                </button>
              ) : (
                <button
                  onClick={() => handleProcess('APPROVE')}
                  disabled={isResolving}
                  style={{ padding: '12px 24px', background: '#dc2626', border: 'none', color: '#fff', borderRadius: '8px', cursor: isResolving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
                >
                  <Check size={18} /> Xác nhận vi phạm & Ẩn đánh giá
                </button>
              )}
            </>
          ) : (
            <div style={{
              color: viewingReport.status === 'APPROVED' ? '#ef4444' : '#10b981',
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
              background: viewingReport.status === 'APPROVED' ? (isSpoilerReportItem(viewingReport) ? 'rgba(245, 158, 11, 0.1)' : 'rgba(220,38,38,0.1)') : 'rgba(16, 185, 129, 0.1)',
              padding: '10px 20px', borderRadius: '8px', whiteSpace: 'nowrap', border: `1px solid ${viewingReport.status === 'APPROVED' ? (isSpoilerReportItem(viewingReport) ? 'rgba(245,158,11,0.2)' : 'rgba(220,38,38,0.2)') : 'rgba(16,185,129,0.2)'}`
            }}>
              {viewingReport.status === 'APPROVED' ? (
                isSpoilerReportItem(viewingReport)
                  ? <><EyeOff size={20} /> Đã xử lý: Đánh dấu Spoil & Ẩn</>
                  : <><span className="material-symbols-outlined" style={{ fontSize: '20px', fontFamily: 'Material Symbols Outlined' }}>gavel</span> Đã xử lý: Xác nhận vi phạm & Ẩn đánh giá</>
              ) : (
                <><Check size={20} /> Đã xử lý: Từ chối báo cáo (Không vi phạm)</>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="w-[44px] h-[44px] rounded-[12px] bg-[linear-gradient(135deg,#dc2626_0%,#ff4f72_100%)] flex items-center justify-center shrink-0"
          >
            <AlertTriangle size={22} color="#fff" />
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-black dark:text-white m-0">
              Quản lí Báo Cáo Đánh Giá
            </h2>
            <p className="text-[13px] text-gray-500 dark:text-white/40 mt-[2px] mb-0">
              {isLoading ? 'Đang tải...' : `${reports.length} báo cáo trong hệ thống`}
            </p>
          </div>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex gap-2 mb-2 pb-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => { setReportType('VIOLATION'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportType === 'VIOLATION'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#9D9D9D] hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Báo cáo Vi phạm
          </button>
          <button
            onClick={() => { setReportType('SPOILER'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportType === 'SPOILER'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_10px_rgba(220,38,38,0.3)]'
              : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#9D9D9D] hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Báo cáo Spoil
          </button>
        </div>
        <button
          onClick={() => setIsBadWordModalOpen(true)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm dark:shadow-none"
        >
          <span className="material-symbols-outlined text-[18px]">gavel</span> Quản lý Từ cấm
        </button>
      </div>



      <div className="flex gap-[12px] flex-wrap mb-[16px]">
        <div className="flex items-center gap-[12px] bg-white dark:bg-[#141414] rounded-[12px] border border-gray-300 dark:border-white/5 p-[12px_16px] flex-1 min-w-[200px]">
          <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-white/30">search</span>
          <input
            type="text"
            placeholder="Tìm người báo cáo, tên phim..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="flex-1 border-none bg-transparent text-gray-900 dark:text-white text-[13px] outline-none font-['Inter',sans-serif] placeholder:text-gray-400 dark:placeholder:text-white/30"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{ padding: '12px 16px', minWidth: '160px' }}
        >
          <option value="ALL">Tất cả</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="PROCESSED">Đã xử lý</option>
        </select>

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
          minHeight: '400px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Phim</th>
              <th style={thStyle}>Người báo cáo</th>
              <th style={thStyle}>Người bị báo cáo</th>
              <th style={thStyle}>Thời gian báo cáo</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  Không tìm thấy báo cáo nào.
                </td>
              </tr>
            ) : (
              currentReports.map((r) => (
                <tr
                  key={r.reportId}
                  style={{ transition: 'background 0.15s ease', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={r.moviePosterUrl || 'https://via.placeholder.com/40'} alt={r.movieTitle} style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '4px' }} />
                      <span style={{ fontWeight: 600 }}>{r.movieTitle}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{r.reporterName}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{r.reporterEmail}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{r.reportedUserName}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{r.reportedUserEmail}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>{new Date(r.createdAt).toLocaleString('vi-VN')}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 10px',
                      whiteSpace: 'nowrap',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: r.status === 'PENDING' ? '#f59e0b' : (r.status === 'APPROVED' ? '#dc2626' : '#10b981'),
                      background: r.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : (r.status === 'APPROVED' ? 'rgba(220,38,38,0.1)' : 'rgba(16,185,129,0.1)'),
                      border: `1px solid ${r.status === 'PENDING' ? 'rgba(245,158,11,0.2)' : (r.status === 'APPROVED' ? 'rgba(220,38,38,0.2)' : 'rgba(16,185,129,0.2)')}`
                    }}>
                      {r.status === 'PENDING' ? 'Chờ xử lý' : (r.status === 'APPROVED' ? 'Đã xác nhận' : 'Đã từ chối')}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setViewingReport(r)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        color: '#3b82f6',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Eye size={16} /> Xem
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Container */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          totalElements={filteredReports.length}
          itemsPerPage={itemsPerPage}
        />
      )}

      {isBadWordModalOpen && (
        <BadWordManagementModal onClose={() => setIsBadWordModalOpen(false)} />
      )}
    </div>
  );
}

const thStyle = {
  padding: '14px 20px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.3)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const tdStyle = {
  padding: '14px 20px',
  fontSize: '13px',
  color: '#fff',
};
