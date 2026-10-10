import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiGet } from '../../../shared/api/client';
import { useToastStore } from '../../user/store/toastStore';
import useThemeStore from '../../../shared/store/themeStore';
import {
  TrendingUp,
  MonitorPlay,
  Ticket,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Legend
} from 'recharts';

export function formatVND(value) {
  if (value == null) return '0';
  return value.toLocaleString('vi-VN');
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const revenue = payload.find(p => p.dataKey === 'revenue');
    const tickets = payload.find(p => p.dataKey === 'ticketsSold');

    return (
      <div
        style={{
          background: 'rgba(20, 20, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          minWidth: '240px'
        }}
      >
        <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
          Ngày {label}
        </div>

        {revenue && (
          <div style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', marginBottom: '4px' }}>Doanh thu trong ngày</div>
            <div style={{
              fontSize: '24px',
              fontWeight: 800,
              background: 'linear-gradient(90deg, #dc2626, #FF4B72)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {revenue.value.toLocaleString('vi-VN')} đ
            </div>
          </div>
        )}

        {tickets && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', fontWeight: 500 }}>Vé bán ra</span>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>
              {tickets.value.toLocaleString('vi-VN')} vé
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function OnlineRevenuePage() {
  const isStaff = useLocation().pathname.startsWith('/staff');
  const showToast = useToastStore((s) => s.showToast);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    chartData: [],
    byMovieData: []
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/admin/online-tickets/revenue-stats');
      setStats(data || { totalRevenue: 0, chartData: [], byMovieData: [] });
    } catch (err) {
      showToast(err.message || 'Lỗi khi tải dữ liệu doanh thu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalTickets = stats.byMovieData.reduce((acc, curr) => acc + curr.ticketsSold, 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(220,38,38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MonitorPlay size={24} color="#dc2626" />
            </div>
            Doanh thu Trực Tuyến
          </h1>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.5)', fontSize: '15px' }}>
            Thống kê doanh thu vé xem phim trực tuyến (Online Tickets)
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`} style={{ fontSize: '20px' }}>
            refresh
          </span>
          Cập nhật
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
          <div className="animate-spin mb-4">
            <span className="material-symbols-outlined text-4xl text-red-500">sync</span>
          </div>
          Đang tải dữ liệu doanh thu...
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div style={{
              background: isDarkMode ? 'linear-gradient(135deg, rgba(220,38,38,0.1) 0%, rgba(20,20,20,1) 100%)' : 'linear-gradient(135deg, rgba(220,38,38,0.05) 0%, #ffffff 100%)',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: '20px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.05, transform: 'scale(2)' }}>
                <TrendingUp size={100} color="#dc2626" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: 'rgba(220,38,38,0.15)', borderRadius: '12px' }}>
                  <TrendingUp size={20} color="#dc2626" />
                </div>
                <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: '15px', fontWeight: 600 }}>Tổng doanh thu Online</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: isDarkMode ? '#fff' : '#111827', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {stats.totalRevenue.toLocaleString('vi-VN')}
                <span style={{ fontSize: '18px', color: '#dc2626' }}>VNĐ</span>
              </div>
            </div>

            <div style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <Ticket size={20} color="#4ade80" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', fontWeight: 600 }}>Tổng vé đã bán</span>
              </div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff' }}>
                {totalTickets.toLocaleString('vi-VN')} <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>vé</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Chart */}
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="#dc2626" />
                Biểu đồ doanh thu theo ngày
              </h3>
              <div style={{ height: '360px', width: '100%' }}>
                {stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                        tickMargin={12}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                        tickFormatter={formatVND}
                        width={80}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                        width={40}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />

                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        name="Doanh thu"
                        stroke="#dc2626"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />

                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                    Chưa có dữ liệu doanh thu
                  </div>
                )}
              </div>
            </div>

            {/* Top Movies */}
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MonitorPlay size={20} color="#dc2626" />
                Doanh thu theo phim
              </h3>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                {stats.byMovieData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {stats.byMovieData.map((item, index) => (
                      <div key={index} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px', lineHeight: 1.4 }}>
                            {item.movieTitle}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '2px' }}>Doanh thu</span>
                            <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '15px' }}>
                              {item.revenue.toLocaleString('vi-VN')} đ
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '2px' }}>Đã bán</span>
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>
                              {item.ticketsSold} vé
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                    Chưa có dữ liệu
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
