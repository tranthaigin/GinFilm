import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useComboManagement } from '../hooks/useComboManagement';
import { comboApi } from '../api/comboApi';
import {
  Coffee,
  TrendingUp,
  Package,
  Award,
  Inbox,
  MapPin,
  ChevronDown,
  Layers,
  Sparkles,
  BarChart2
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Legend
} from 'recharts';

export function formatVND(value) {
  if (value == null) return '0';
  return value.toLocaleString('vi-VN');
}

export function formatCompactVND(val) {
  if (val == null || val === 0) return '0';
  if (val >= 1_000_000_000) {
    const formatted = (val / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted} tỷ`;
  }
  if (val >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted} tr`;
  }
  if (val >= 1_000) {
    return `${Math.round(val / 1_000)}k`;
  }
  return val.toLocaleString('vi-VN');
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const revenue = payload.find(p => p.dataKey === 'revenue');
    const combos = payload.filter(p => p.dataKey !== 'revenue').sort((a, b) => (b.value || 0) - (a.value || 0));

    return (
      <div
        style={{
          background: 'rgba(20, 20, 20, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
          minWidth: '240px'
        }}
      >
        <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
          Ngày {label}
        </div>

        {revenue && (
          <div style={{ paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '2px' }}>Tổng doanh thu</div>
            <div style={{
              fontSize: '22px',
              fontWeight: 800,
              background: 'linear-gradient(90deg, #dc2626, #FF4B72)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {revenue.value.toLocaleString('vi-VN')} VNĐ
            </div>
          </div>
        )}

        {combos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }} className="custom-scrollbar pr-1">
            {combos.map((entry, index) => {
              if (!entry.value) return null;
              return (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, boxShadow: `0 0 6px ${entry.color}` }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: 500 }}>{entry.name}</span>
                  </div>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                    {entry.value.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const CINEMA_DATA = [
  {
    regionId: 'all',
    regionName: 'Tất Cả',
    theaters: [{ id: 'all', name: 'Tất cả rạp trên toàn quốc' }]
  },
  {
    regionId: 'binhdinh',
    regionName: 'Bình Định',
    theaters: [
      { id: 'cgv-qn', name: 'CGV Vincom Quy Nhơn' },
      { id: 'lotte-qn', name: 'Lotte Cinema Quy Nhơn' },
      { id: 'starlight-qn', name: 'Starlight Quy Nhơn' }
    ]
  },
  {
    regionId: 'hcm',
    regionName: 'Hồ Chí Minh',
    theaters: [
      { id: 'cgv-svh', name: 'CGV Sư Vạn Hạnh' },
      { id: 'bhd-32', name: 'BHD Star 3/2' },
      { id: 'galaxy-nguyendu', name: 'Galaxy Nguyễn Du' }
    ]
  },
  {
    regionId: 'hn',
    regionName: 'Hà Nội',
    theaters: [
      { id: 'cgv-vincom-bvt', name: 'CGV Vincom Bà Triệu' },
      { id: 'bhd-phamngocthach', name: 'BHD Phạm Ngọc Thạch' }
    ]
  }
];

export const TheaterSelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState('all');

  let selectedTheaterName = 'Tất cả chi nhánh';
  for (const r of CINEMA_DATA) {
    const t = r.theaters.find(th => th.id === value);
    if (t) {
      selectedTheaterName = t.name;
      break;
    }
  }

  const handleOpen = () => {
    if (!isOpen) {
      for (const r of CINEMA_DATA) {
        if (r.theaters.find(th => th.id === value)) {
          setActiveRegion(r.regionId);
          break;
        }
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={handleOpen}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
      >
        <MapPin size={14} color="rgba(255,255,255,0.5)" />
        <span style={{ color: '#fff', fontSize: '14px', whiteSpace: 'nowrap' }}>{selectedTheaterName}</span>
        <ChevronDown size={14} color="rgba(255,255,255,0.5)" style={{ marginLeft: '4px' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '8px',
          width: '600px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px', padding: '20px', zIndex: 50, boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
        }}>
          {/* Vùng chọn thành phố */}
          <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '20px', overflowX: 'auto' }}>
            {CINEMA_DATA.map(region => (
              <div
                key={region.regionId}
                onClick={() => setActiveRegion(region.regionId)}
                style={{
                  color: activeRegion === region.regionId ? '#dc2626' : 'rgba(255,255,255,0.6)',
                  fontWeight: activeRegion === region.regionId ? 600 : 400,
                  fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'color 0.2s',
                  position: 'relative'
                }}
              >
                {region.regionName}
                {activeRegion === region.regionId && (
                  <div style={{ position: 'absolute', bottom: '-17px', left: 0, right: 0, height: '2px', background: '#dc2626' }} />
                )}
              </div>
            ))}
          </div>

          {/* Vùng chọn rạp */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {CINEMA_DATA.find(r => r.regionId === activeRegion)?.theaters.map(theater => {
              const isSelected = theater.id === value;
              return (
                <div
                  key={theater.id}
                  onClick={() => {
                    onChange(theater.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: isSelected ? '#dc2626' : 'transparent',
                    color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                    borderRadius: '8px',
                    fontSize: '13px', cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: isSelected ? '1px solid #dc2626' : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {theater.name}
                </div>
              );
            })}
          </div>
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

const Skeleton = ({ width, height, borderRadius = '8px' }) => (
  <div style={{
    width, height, borderRadius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s infinite',
  }} />
);

const COLOR_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#E11D48', '#84CC16', '#F97316'];

export default function ComboRevenuePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.includes('/staff') ? '/staff' : '/admin';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [theater, setTheater] = useState('all');

  const [isLoading, setIsLoading] = useState(false);
  const [hiddenLines, setHiddenLines] = useState({});
  const [hasData, setHasData] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [chartViewMode, setChartViewMode] = useState('top5'); // 'total' | 'top5' | 'all'

  const { combos } = useComboManagement();

  // Lấy ra 5 combo bán chạy nhất
  const sortedCombos = useMemo(() => {
    return [...combos].sort((a, b) => (b.sold || 0) - (a.sold || 0));
  }, [combos]);

  const topCombos = useMemo(() => sortedCombos.slice(0, 5), [sortedCombos]);

  // Các combo hiển thị trên biểu đồ dựa vào mode chọn
  const activeCombosToDisplay = useMemo(() => {
    if (chartViewMode === 'total') return [];
    if (chartViewMode === 'top5') return topCombos;
    return combos;
  }, [chartViewMode, topCombos, combos]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      select option {
        background: #1a1a1a;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      try {
        if (theater === 'empty_theater') {
          setHasData(false);
          setChartData([]);
        } else {
          setHasData(true);
          const data = await comboApi.getRevenueChart(
            startDate ? `${startDate}T00:00:00` : null,
            endDate ? `${endDate}T23:59:59` : null
          );
          setChartData(data);
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu chart", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, theater]);

  const handleLegendClick = (e) => {
    setHiddenLines(prev => ({
      ...prev,
      [e.dataKey]: !prev[e.dataKey]
    }));
  };

  const renderCustomLegend = (props) => {
    const { payload } = props;
    if (!payload || payload.length === 0) return null;

    return (
      <div className="mt-4 pt-3 border-t border-white/5">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxHeight: '90px', overflowY: 'auto' }} className="custom-scrollbar px-2">
          {payload.map((entry, index) => {
            const isHidden = hiddenLines[entry.value];
            return (
              <div
                key={`item-${index}`}
                onClick={() => handleLegendClick({ dataKey: entry.value })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '16px',
                  background: isHidden ? 'transparent' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isHidden ? 'rgba(255,255,255,0.1)' : entry.color}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                  opacity: isHidden ? 0.4 : 1
                }}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: isHidden ? '#666' : entry.color,
                  boxShadow: isHidden ? 'none' : `0 0 6px ${entry.color}`
                }} />
                <span style={{ color: isHidden ? '#888' : '#eee', fontSize: '12px', fontWeight: 500 }}>{entry.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    if (endDate && newStart > endDate) {
      setEndDate(newStart);
    }
  };

  const handleEndDateChange = (e) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    if (startDate && newEnd < startDate) {
      setStartDate(newEnd);
    }
  };

  const renderFilters = () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', zIndex: 10, flexWrap: 'wrap' }}>
      <TheaterSelect
        value={theater}
        onChange={setTheater}
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

  const totalRevenue = combos.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const totalSold = combos.reduce((sum, c) => sum + (c.sold || 0), 0);
  const bestCombo = sortedCombos.length > 0 && sortedCombos[0].sold > 0 ? sortedCombos[0].name : 'Chưa có';

  const kpis = [
    { title: 'Tổng doanh thu', value: formatVND(totalRevenue), suffix: 'VND', icon: TrendingUp, color: '#dc2626', bgColor: 'rgba(220,38,38,0.1)' },
    { title: 'Tổng lượt bán', value: totalSold.toLocaleString('vi-VN'), suffix: '', icon: Package, color: '#3B82F6', bgColor: 'rgba(59,130,246,0.1)' },
    { title: 'Combo phổ biến nhất', value: bestCombo, suffix: '', icon: Award, color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', position: 'relative' }}>
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="w-[44px] h-[44px] rounded-[12px] bg-[linear-gradient(135deg,#dc2626_0%,#ff4f72_100%)] flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30">
            <BarChart2 size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0 }}>
              Doanh thu Combo
            </h1>
          </div>
        </div>
        {renderFilters()}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} style={{ background: '#141414', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '100px', height: '100px', background: kpi.bgColor, borderRadius: '50%', filter: 'blur(30px)', opacity: 0.6 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500 }}>{kpi.title}</span>
                  {isLoading ? (
                    <Skeleton width="120px" height="32px" />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ color: '#fff', fontSize: '26px', fontWeight: 700 }}>{hasData ? kpi.value : '0'}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', fontWeight: 600 }}>{hasData ? kpi.suffix : ''}</span>
                    </div>
                  )}
                </div>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: kpi.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }} className="grid-cols-1 lg:grid-cols-[2fr_1fr]">

        {/* Chart */}
        <div style={{ background: '#141414', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: 0 }}>
                Biểu đồ doanh thu & lượt bán
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '4px 0 0 0' }}>
                Phân tích xu hướng doanh thu combo theo mốc thời gian
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-gray-100/80 dark:bg-[#111111]/80 backdrop-blur-md p-1.5 rounded-[14px] border border-gray-200/80 dark:border-white/5 text-xs font-medium shadow-inner">
              <button
                onClick={() => setChartViewMode('total')}
                className={`px-3.5 py-2 rounded-[10px] transition-all duration-300 flex items-center gap-2 ${chartViewMode === 'total'
                    ? 'bg-white dark:bg-white/10 text-[#dc2626] dark:text-white shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
                    : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5'
                  }`}
              >
                <TrendingUp size={14} className={chartViewMode === 'total' ? 'text-[#dc2626] dark:text-red-400' : ''} />
                Tổng Doanh Thu
              </button>
              <button
                onClick={() => setChartViewMode('top5')}
                className={`px-3.5 py-2 rounded-[10px] transition-all duration-300 flex items-center gap-2 ${chartViewMode === 'top5'
                    ? 'bg-white dark:bg-white/10 text-[#dc2626] dark:text-white shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
                    : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5'
                  }`}
              >
                <Sparkles size={14} className={chartViewMode === 'top5' ? 'text-[#dc2626] dark:text-red-400' : ''} />
                Top 5 Combo
              </button>
              <button
                onClick={() => setChartViewMode('all')}
                className={`px-3.5 py-2 rounded-[10px] transition-all duration-300 flex items-center gap-2 ${chartViewMode === 'all'
                    ? 'bg-white dark:bg-white/10 text-[#dc2626] dark:text-white shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
                    : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5'
                  }`}
              >
                <Layers size={14} className={chartViewMode === 'all' ? 'text-[#dc2626] dark:text-red-400' : ''} />
                Tất Cả ({combos.length})
              </button>
            </div>
          </div>

          <div style={{ height: 340, position: 'relative', flex: 1 }}>
            {isLoading ? (
              <Skeleton width="100%" height="100%" />
            ) : !hasData ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'rgba(255,255,255,0.3)' }}>
                <Inbox size={48} strokeWidth={1} />
                <span style={{ fontSize: '14px' }}>Không có dữ liệu trong thời gian này</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dc2626" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis
                    yAxisId="revenue"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500 }}
                    tickFormatter={formatCompactVND}
                    width={65}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  {activeCombosToDisplay.length > 0 && <Legend content={renderCustomLegend} />}

                  <Area
                    hide={hiddenLines.revenue}
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#dc2626"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={3}
                    activeDot={{ r: 6, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }}
                    name="Tổng Doanh thu"
                  />

                  {activeCombosToDisplay.map((c, i) => (
                    <Line
                      key={c.id || c.name}
                      hide={hiddenLines[c.name]}
                      yAxisId="revenue"
                      type="monotone"
                      dataKey={c.name}
                      stroke={COLOR_PALETTE[i % COLOR_PALETTE.length]}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1.5 }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                      name={c.name}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Selling Table */}
        <div style={{ background: '#141414', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Sản phẩm bán chạy
            </h3>
            <button
              onClick={() => navigate(`${basePath}/combo/revenue/combos`)}
              style={{
                background: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.2)',
                fontSize: '12px',
                color: '#dc2626',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220,38,38,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(220,38,38,0.1)';
              }}
            >
              Xem tất cả
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} width="100%" height="66px" borderRadius="12px" />)
            ) : !hasData ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'rgba(255,255,255,0.3)' }}>
                <Inbox size={32} strokeWidth={1} />
                <span style={{ fontSize: '13px' }}>Trống</span>
              </div>
            ) : (
              topCombos.map((combo, idx) => (
                <div key={combo.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx === 0 ? '#F59E0B' : '#fff', fontWeight: 700, fontSize: '13px' }}>
                    #{idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{combo.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 500 }}>{combo.sold.toLocaleString('vi-VN')} lượt bán</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{combo.revenue.toLocaleString('vi-VN')} đ</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
