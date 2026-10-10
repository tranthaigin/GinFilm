import { MapPin, Building2, ChevronRight } from 'lucide-react';

const styles = {
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    textAlign: 'left',
    gap: '10px',
  },
  cardActive: {
    background: 'rgba(220,38,38,0.1)',
    border: '1px solid rgba(220,38,38,0.35)',
  },
  iconWrap: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
    lineHeight: 1.3,
  },
  count: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.45)',
    margin: '2px 0 0 0',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '20px',
    flexShrink: 0,
  },
};

export default function ProvinceCard({ province, isActive, onClick }) {
  const { name, theaterCount = 0, theaters = [] } = province;
  const count = theaterCount || theaters.length;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.card,
        ...(isActive ? styles.cardActive : {}),
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        }
      }}
    >
      <div
        style={{
          ...styles.iconWrap,
          background: isActive
            ? 'rgba(220,38,38,0.2)'
            : 'rgba(255,255,255,0.06)',
        }}
      >
        <MapPin
          size={16}
          color={isActive ? '#dc2626' : 'rgba(255,255,255,0.5)'}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...styles.name, color: isActive ? '#fff' : 'rgba(255,255,255,0.85)' }}>
          {name}
        </p>
        <p style={styles.count}>
          <Building2 size={10} style={{ marginRight: 3, display: 'inline', verticalAlign: 'middle' }} />
          {count} rạp chiếu
        </p>
      </div>

      <span
        style={{
          ...styles.badge,
          background: isActive ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)',
          color: isActive ? '#dc2626' : 'rgba(255,255,255,0.4)',
        }}
      >
        {count}
      </span>

      <ChevronRight
        size={14}
        color={isActive ? '#dc2626' : 'rgba(255,255,255,0.2)'}
        style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isActive ? 'translateX(2px)' : 'none' }}
      />
    </button>
  );
}
