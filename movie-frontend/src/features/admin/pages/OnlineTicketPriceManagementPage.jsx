import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Tag, Search, Edit2, PlayCircle } from 'lucide-react';
import { movieApi } from '../api/movieApi';
import onlineTicketPriceApi from '../api/onlineTicketPriceApi';
import { useToastStore } from '../hooks/useToastStore';
import EditOnlinePriceModal from '../components/ticket/EditOnlinePriceModal';
import Pagination from '../../../shared/components/Pagination';

const formatPrice = (price) =>
  price ? `${new Intl.NumberFormat('vi-VN').format(price)}đ` : '—';

export default function OnlineTicketPriceManagementPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const [movies, setMovies] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMovie, setEditingMovie] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  
  const addToast = useToastStore((state) => state.addToast);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [moviesData, pricesData] = await Promise.all([
        movieApi.getAll(),
        onlineTicketPriceApi.getAllPrices()
      ]);
      
      const onlineMovies = moviesData.filter(m => m.isOnlineAvailable);
      setMovies(onlineMovies);
      setPrices(pricesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast({ message: 'Không thể tải dữ liệu. Vui lòng thử lại sau.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Merge movie and price data
  const tableData = movies.map(movie => {
    const priceData = prices.find(p => p.movieId === movie.id);
    return {
      ...movie,
      priceInfo: priceData || null
    };
  });

  const filteredData = tableData.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSavePrice = async (formData) => {
    try {
      await onlineTicketPriceApi.updatePrice(editingMovie.id, formData);
      addToast({ message: 'Cập nhật giá thành công!', type: 'success' });
      setEditingMovie(null);
      fetchData(); // Reload data
    } catch (error) {
      console.error('Failed to update price:', error);
      addToast({ message: 'Lỗi khi cập nhật giá.', type: 'error' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PlayCircle size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Quản lí Giá Phim Trực Tuyến
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '2px 0 0 0' }}>
              {movies.length} phim đang mở chiếu trực tuyến
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
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
            placeholder="Tìm kiếm theo tên phim..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent', color: '#fff',
              fontSize: '13px', outline: 'none', fontFamily: '"Inter", sans-serif',
            }}
          />
        </div>
        
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
          className="px-3 py-2 bg-[#141414] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#dc2626] transition-colors cursor-pointer"
          style={{ padding: '12px 16px', minWidth: '120px' }}
        >
          {[10, 20, 50].map(size => (
            <option key={size} value={size}>{size} / trang</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: '#141414', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto',
      }} className="custom-scrollbar">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr>
              {['Tên phim', 'Thời lượng vé', 'Giá gốc', 'Giảm giá', 'Giá bán', 'Khuyến mãi từ', 'Khuyến mãi đến', 'Trạng thái KM', 'Thao tác'].filter(h => !isStaff || h !== 'Thao tác').map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', fontSize: '11px',
                  fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                  letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  whiteSpace: 'nowrap'
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : paginatedData.map(item => {
              const pi = item.priceInfo;
              const hasPrice = !!pi;
              let promoStatus = { text: 'Không có KM', color: 'rgba(255,255,255,0.2)', bg: 'transparent' };
              if (hasPrice && pi.discountPercentage > 0) {
                if (pi.promoActive) {
                  promoStatus = { text: 'Đang chạy', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
                } else if (pi.promoStartDate && new Date() < new Date(pi.promoStartDate)) {
                  promoStatus = { text: 'Chưa tới', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
                } else {
                  promoStatus = { text: 'Hết hạn', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
                }
              }
              
              return (
                <tr
                  key={item.id}
                  style={{ transition: 'background 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#fff', maxWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {item.posterUrl ? (
                        <div style={{ position: 'relative', width: '50px', height: '70px', minWidth: '50px' }}>
                          <img 
                            src={item.posterUrl} 
                            alt={item.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div style={{ display: 'none', width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', alignItems: 'center', justifyContent: 'center' }}>
                            <PlayCircle size={20} color="rgba(255,255,255,0.2)" />
                          </div>
                        </div>
                      ) : (
                        <div style={{ minWidth: '50px', width: '50px', height: '70px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <PlayCircle size={20} color="rgba(255,255,255,0.2)" />
                        </div>
                      )}
                      <div style={{ whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.title}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                    {(() => {
                      const defVal = item.duration ? item.duration + 60 : 180;
                      const val = pi?.validityPeriodMinutes || defVal;
                      const isCustom = pi?.validityPeriodMinutes && pi.validityPeriodMinutes !== defVal;
                      return (
                        <span>
                          {val} Phút {isCustom ? <span style={{ fontSize: '11px', color: '#f59e0b', marginLeft: '4px' }}>(Tùy chỉnh)</span> : <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>(Gốc)</span>}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#fff', fontWeight: 500 }}>
                    {hasPrice && pi.basePrice ? (
                      <span style={{ textDecoration: pi.discountPercentage > 0 ? 'line-through' : 'none', color: pi.discountPercentage > 0 ? 'rgba(255,255,255,0.4)' : '#fff' }}>
                        {formatPrice(pi.basePrice)}
                      </span>
                    ) : <span style={{color: '#f59e0b', fontWeight: 500, fontSize: '13px'}}>Chưa thiết lập</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                    {hasPrice && pi.discountPercentage > 0 ? `${pi.discountPercentage}%` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#dc2626', fontWeight: 500 }}>
                    {hasPrice && pi.finalPrice ? formatPrice(pi.finalPrice) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {hasPrice && pi.promoStartDate ? pi.promoStartDate.replace('T', ' ').substring(0, 16) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {hasPrice && pi.promoEndDate ? pi.promoEndDate.replace('T', ' ').substring(0, 16) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {promoStatus.text !== 'Không có KM' ? (
                      <span style={{
                        fontSize: '11px', fontWeight: 600,
                        color: promoStatus.color, 
                        background: promoStatus.bg,
                        padding: '4px 10px', borderRadius: '20px',
                      }}>
                        {promoStatus.text}
                      </span>
                    ) : (
                      <span style={{color: promoStatus.color, fontSize: '12px'}}>{promoStatus.text}</span>
                    )}
                  </td>
                  <>{!isStaff && (
                <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => setEditingMovie(item)}
                      title="Thiết lập giá & khuyến mãi"
                      style={{ 
                        color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: 'none', 
                        cursor: 'pointer', padding: '6px 12px', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Edit2 size={14} />
                      Thiết lập
                    </button>
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
          totalElements={filteredData.length}
          itemsPerPage={pageSize}
        />
      )}

      {editingMovie && (
        <EditOnlinePriceModal 
          movie={editingMovie} 
          onClose={() => setEditingMovie(null)} 
          onSave={handleSavePrice} 
        />
      )}
    </div>
  );
}
