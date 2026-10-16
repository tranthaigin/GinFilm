import { Users, TrendingUp } from 'lucide-react';

export default function TotalUsersCard({ data }) {
  if (!data) return null;

  // Mini sparkline data (mock growth trend)
  const sparklinePoints = [30, 35, 42, 38, 50, 55, 48, 62, 58, 70, 75, 82];
  const max = Math.max(...sparklinePoints);
  const min = Math.min(...sparklinePoints);
  const range = max - min;
  const height = 50;
  const width = 140;
  const stepX = width / (sparklinePoints.length - 1);

  const pathD = sparklinePoints
    .map((point, i) => {
      const x = i * stepX;
      const y = height - ((point - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div
      style={{
        background: '#141414',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '180px',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          bottom: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
          filter: 'blur(15px)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
          }}
        >
          <Users size={22} color="#fff" />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(16,185,129,0.1)',
            color: '#10b981',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          <TrendingUp size={14} />
          <span>+{data.change}%</span>
        </div>
      </div>

      <div>
        <p
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.4)',
            margin: '0 0 6px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Tổng người dùng
        </p>
        <p
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.02em',
            fontFamily: '"Inter", sans-serif',
          }}
        >
          {data.value.toLocaleString('vi-VN')}
        </p>
      </div>

      {/* Mini Sparkline */}
      <div style={{ marginTop: 'auto', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '50px' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#sparklineGradient)" />
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
