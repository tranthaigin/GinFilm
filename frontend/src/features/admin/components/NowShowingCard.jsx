import { Film, Play } from 'lucide-react';

export default function NowShowingCard({ count }) {
  return (
    <div
      style={{
        background: '#141414',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
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
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(220,38,38,0.15) 0%, rgba(220,38,38,0.05) 100%)',
          border: '1px solid rgba(220,38,38,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Film size={26} color="#dc2626" />
        <div
          style={{
            position: 'absolute',
            bottom: '-3px',
            right: '-3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #141414',
          }}
        >
          <Play size={8} color="#fff" fill="#fff" />
        </div>
      </div>

      {/* Count */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <p
          style={{
            fontSize: '40px',
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            fontFamily: '"Inter", sans-serif',
          }}
        >
          {count}
        </p>
        <p
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.4)',
            margin: '8px 0 0 0',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Phim đang chiếu
        </p>
      </div>

      {/* Live indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '20px',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.2)',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10b981',
            animation: 'pulse-dot 2s infinite',
          }}
        />
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Đang chiếu
        </span>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
