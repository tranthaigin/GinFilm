import { TrendingUp, TrendingDown, DollarSign, Ticket, Film, Users } from 'lucide-react';

const iconMap = {
  totalRevenue: DollarSign,
  totalTickets: Ticket,
  totalMovies: Film,
  totalCustomers: Users,
};

const colorMap = {
  totalRevenue: { gradient: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)', shadow: 'rgba(220,38,38,0.3)' },
  totalTickets: { gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', shadow: 'rgba(59,130,246,0.3)' },
  totalMovies: { gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', shadow: 'rgba(139,92,246,0.3)' },
  totalCustomers: { gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', shadow: 'rgba(16,185,129,0.3)' },
};

function formatNumber(num) {
  return { 
    value: new Intl.NumberFormat('vi-VN').format(num), 
    unit: '' 
  };
}

export default function DashboardKPICards({ data }) {
  if (!data) return null;

  const cards = Object.entries(data).map(([key, card]) => {
    const Icon = iconMap[key];
    const colors = colorMap[key];
    const isPositive = card.change >= 0;
    const formatted = formatNumber(card.value);
    const isRevenue = key === 'totalRevenue';

    return (
      <div
        key={key}
        style={{
          background: '#141414',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          transition: 'all 0.3s ease',
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 12px 30px ${colors.shadow}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Subtle glow */}
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: colors.gradient,
            opacity: 0.06,
            filter: 'blur(20px)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: colors.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${colors.shadow}`,
            }}
          >
            <Icon size={22} color="#fff" />
          </div>

        </div>

        <div>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {card.label}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: 0 }}>
            <span
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                fontFamily: '"Outfit", "Inter", sans-serif',
                lineHeight: 1,
              }}
            >
              {formatted.value}
            </span>
            {(formatted.unit || isRevenue) && (
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: '"Outfit", "Inter", sans-serif',
                  marginLeft: '2px',
                }}
              >
                {formatted.unit}{isRevenue ? 'VND' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
      }}
    >
      {cards}
    </div>
  );
}
