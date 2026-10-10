import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Inbox, ChevronDown, Filter } from 'lucide-react';
import { formatVND, TheaterSelect } from './ComboRevenuePage';
import { useComboManagement } from '../hooks/useComboManagement';

// Component Skeleton Reusable (giống bên trang tổng quan)
const Skeleton = ({ width, height, borderRadius = '8px' }) => (
  <div style={{
    width, height, borderRadius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s infinite',
  }} />
);

const CustomSimpleSelect = ({ value, options, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
      >
        {Icon && <Icon size={14} color="rgba(255,255,255,0.5)" />}
        <span style={{ color: '#fff', fontSize: '14px', whiteSpace: 'nowrap' }}>{selectedOption.label}</span>
        <ChevronDown size={14} color="rgba(255,255,255,0.5)" style={{ marginLeft: '4px' }} />
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', width: 'max-content', minWidth: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                color: opt.value === value ? '#dc2626' : '#fff',
                fontSize: '14px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220,38,38,0.1)';
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = opt.value === value ? '#dc2626' : '#fff';
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
        />
      )}
    </div>
  );
};

export default function ComboRevenueDetailsPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [theater, setTheater] = useState('all');
  const [topLimit, setTopLimit] = useState('all');

  const { combos, loading: isLoading } = useComboManagement();
  const [hasData, setHasData] = useState(true);

  // Tổng lượt bán cho phần trăm
  const totalSold = useMemo(() => combos.reduce((acc, curr) => acc + (curr.sold || 0), 0), [combos]);

  useEffect(() => {
    if (theater === 'empty_theater' || (combos.length > 0 && totalSold === 0)) {
      setHasData(false);
    } else {
      setHasData(true);
    }
  }, [theater, combos, totalSold]);

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    if (endDate && newStart > endDate) setEndDate(newStart);
  };

  const handleEndDateChange = (e) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    if (startDate && newEnd < startDate) setStartDate(newEnd);
  };

  const renderFilters = () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', zIndex: 10 }}>
      <TheaterSelect
        value={theater}
        onChange={setTheater}
      />

      <CustomSimpleSelect
        value={topLimit}
        onChange={setTopLimit}
        icon={Filter}
        options={[
          { value: 'all', label: 'Tất cả Combo' },
          { value: 3, label: 'Top 3 Combo' },
          { value: 5, label: 'Top 5 Combo' },
          { value: 10, label: 'Top 10 Combo' }
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Từ:</span>
        <input
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={handleStartDateChange}
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none', colorScheme: 'dark' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Đến:</span>
        <input
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={handleEndDateChange}
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none', colorScheme: 'dark' }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate(isStaff ? '/staff/combo/revenue' : '/admin/combo/revenue')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '12px',
            background: '#141414', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 4px 0' }}>
            Chi tiết bán hàng Combo
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '14px' }}>
            Xem chi tiết tỉ lệ bán ra và doanh thu của tất cả các combo
          </p>
        </div>
      </div>

      <div style={{
        background: '#141414', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)',
        padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '400px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {renderFilters()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', marginBottom: '16px' }}>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Biểu đồ sản lượng tiêu thụ
          </span>
          <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tỷ lệ % đóng góp doanh thu
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton width="120px" height="20px" />
                  <Skeleton width="80px" height="20px" />
                </div>
                <Skeleton width="100%" height="6px" borderRadius="3px" />
              </div>
            ))}
          </div>
        ) : !hasData ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'rgba(255,255,255,0.3)', marginTop: '40px' }}>
            <Inbox size={64} strokeWidth={1} />
            <span style={{ fontSize: '15px' }}>Không có dữ liệu bán hàng cho rạp này trong khoảng thời gian đã chọn.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[...combos].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, topLimit === 'all' ? undefined : topLimit).map((combo, index) => {
              const percent = totalSold > 0 ? (((combo.sold || 0) / totalSold) * 100).toFixed(1) : "0.0";

              let barColor = '#F97316';
              let percentColor = '#94A3B8';
              let textColor = '#F8FAFC';

              if (index === 0) {
                barColor = '#3B82F6'; percentColor = '#3B82F6'; textColor = '#3B82F6';
              } else if (index === 1) {
                barColor = '#10B981'; percentColor = '#10B981'; textColor = '#10B981';
              } else if (index === 2) {
                barColor = '#8B5CF6'; percentColor = '#8B5CF6'; textColor = '#8B5CF6';
              }

              return (
                <div key={combo.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ color: '#F8FAFC', fontSize: '14px', fontWeight: 600 }}>
                      <span style={{ color: '#64748B', marginRight: '6px', fontSize: '13px', fontWeight: 500 }}>{index + 1}.</span>
                      {combo.name}
                    </span>
                    <div style={{ fontSize: '14px' }}>
                      <span style={{ color: textColor, fontWeight: index < 3 ? 600 : 500 }}>{(combo.sold || 0).toLocaleString('vi-VN')} phần</span>
                      <span style={{ color: percentColor, marginLeft: '6px', fontWeight: index < 3 ? 600 : 400 }}>({percent}%)</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#1E293B', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.5s ease-in-out' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
