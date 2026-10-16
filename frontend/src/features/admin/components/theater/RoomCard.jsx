import { Users, Tv2, Pencil } from 'lucide-react';

const ROOM_TYPE_COLORS = {
  IMAX: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  '4DX': { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  ScreenX: { bg: 'rgba(20,184,166,0.15)', color: '#2dd4bf', border: 'rgba(20,184,166,0.3)' },
  Dolby: { bg: 'rgba(168,85,247,0.15)', color: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  '3D': { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  '2D': { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.1)' },
};

function getRoomTypeStyle(roomType) {
  if (!roomType) return ROOM_TYPE_COLORS['2D'];
  const key = Object.keys(ROOM_TYPE_COLORS).find(
    (k) => roomType.toUpperCase().includes(k.toUpperCase())
  );
  return ROOM_TYPE_COLORS[key] || ROOM_TYPE_COLORS['2D'];
}

export default function RoomCard({ room, onEdit }) {
  const { name, roomType, capacity, isActive } = room;
  const typeStyle = getRoomTypeStyle(roomType);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: typeStyle.bg,
          border: `1px solid ${typeStyle.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Tv2 size={18} color={typeStyle.color} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#fff',
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </p>
          {/* Room type badge */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              background: typeStyle.bg,
              color: typeStyle.color,
              border: `1px solid ${typeStyle.border}`,
              letterSpacing: '0.05em',
            }}
          >
            {roomType || '2D'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <span
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}
          >
            <Users size={12} />
            {capacity} ghế
          </span>
          {/* Status */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: '20px',
              background: isActive !== false ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: isActive !== false ? '#4ade80' : '#f87171',
              border: `1px solid ${isActive !== false ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            {isActive !== false ? 'Hoạt động' : 'Bảo trì'}
          </span>
        </div>
      </div>

      {/* Edit button */}
      {onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(room); }}
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            color: 'rgba(255,255,255,0.4)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(220,38,38,0.15)';
            e.currentTarget.style.color = '#dc2626';
            e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
          title="Chỉnh sửa phòng"
        >
          <Pencil size={13} />
        </button>
      )}
    </div>
  );
}
