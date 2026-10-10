import { Phone, MapPin, ChevronRight, Building } from 'lucide-react';

export default function TheaterCard({ theater, isActive, onClick, onEdit }) {
  const { name, address, phone, isActive: active, provinceName } = theater;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '14px',
        borderRadius: '12px',
        border: `1px solid ${isActive ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.07)'}`,
        background: isActive
          ? 'linear-gradient(135deg, rgba(220,38,38,0.12) 0%, rgba(220,38,38,0.04) 100%)'
          : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        width: '100%',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
        }
      }}
    >
      {/* Active indicator strip */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            background: 'linear-gradient(180deg, #dc2626 0%, #ff4b72 100%)',
            borderRadius: '3px 0 0 3px',
          }}
        />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isActive ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building size={15} color={isActive ? '#dc2626' : 'rgba(255,255,255,0.5)'} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.9)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </p>
            {provinceName && (
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '1px 0 0 0' }}>
                {provinceName}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Status badge */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: '20px',
              background: active !== false ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: active !== false ? '#4ade80' : '#f87171',
              border: `1px solid ${active !== false ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}
          >
            {active !== false ? 'Hoạt động' : 'Tạm đóng'}
          </span>
          <ChevronRight
            size={14}
            color={isActive ? '#dc2626' : 'rgba(255,255,255,0.2)'}
            style={{ transform: isActive ? 'translateX(2px)' : 'none', transition: 'transform 0.2s' }}
          />
        </div>
      </div>

      {/* Detail rows */}
      {address && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <MapPin size={11} color="rgba(255,255,255,0.3)" style={{ marginTop: '2px', flexShrink: 0 }} />
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              margin: 0,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {address}
          </p>
        </div>
      )}

      {phone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Phone size={11} color="rgba(255,255,255,0.3)" />
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{phone}</p>
        </div>
      )}
    </button>
  );
}
