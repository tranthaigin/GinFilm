import { useLocation } from 'react-router-dom';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import DashboardKPICards from '../components/DashboardKPICards';
import RevenueChart from '../components/RevenueChart';
import TicketDistributionChart from '../components/TicketDistributionChart';
import TopMoviesTable from '../components/TopMoviesTable';
import NowShowingCard from '../components/NowShowingCard';

import TotalUsersCard from '../components/TotalUsersCard';

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: '#141414',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '24px',
              height: '140px',
              animation: 'skeleton-pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
      {/* Chart Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div
          style={{
            background: '#141414',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            height: '360px',
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            background: '#141414',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            height: '360px',
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

export default function DashboardPage() {
  const isStaff = useLocation().pathname.startsWith('/staff');

  const { data, isLoading, error } = useAdminDashboard();

  if (isLoading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div style={{ padding: '24px', color: '#ff4f72', background: '#141414', borderRadius: '16px', border: '1px solid rgba(220,38,38,0.15)' }}>
        <h3>Đã xảy ra lỗi khi tải dữ liệu</h3>
        <p>{error?.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>


      {/* KPI Cards */}
      <DashboardKPICards data={data.kpiCards} />

      {/* Charts Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
        }}
      >
        <RevenueChart data={data.revenueData} />
        <TicketDistributionChart data={data.ticketDistribution} />
      </div>

      {/* Middle Row: Top Movies + Side Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '20px',
        }}
      >
        <TopMoviesTable data={data.topMovies} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <NowShowingCard count={data.nowShowingCount} />
          <TotalUsersCard data={data.totalUsers} />
        </div>
      </div>

    </div>
  );
}
