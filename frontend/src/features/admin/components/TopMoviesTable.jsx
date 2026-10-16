import { Trophy } from 'lucide-react';

function formatVND(value) {
  return value.toLocaleString('vi-VN') + 'đ';
}

const rankColors = {
  0: { bg: 'linear-gradient(135deg, #dc2626 0%, #ff4f72 100%)', text: '#fff' },
  1: { bg: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', text: '#fff' },
  2: { bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', text: '#fff' },
};

export default function TopMoviesTable({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div
      style={{
        background: '#141414',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '24px',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Trophy size={18} color="#dc2626" />
        <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: 0 }}>
          Top phim doanh thu cao nhất
        </h3>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Phim', 'Doanh thu', 'Số vé'].map((header) => (
                <th
                  key={header}
                  style={{
                    padding: '12px 16px',
                    textAlign: header === '#' ? 'center' : 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((movie, index) => {
              const rankStyle = rankColors[index] || {
                bg: 'rgba(255,255,255,0.06)',
                text: 'rgba(255,255,255,0.5)',
              };

              return (
                <tr
                  key={movie.id}
                  style={{
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: rankStyle.bg,
                        color: rankStyle.text,
                        fontSize: '12px',
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {movie.poster ? (
                        <div style={{ position: 'relative', width: '36px', height: '50px', minWidth: '36px', flexShrink: 0 }}>
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '6px',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div style={{ display: 'none', width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>🎥</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ width: '36px', height: '50px', minWidth: '36px', flexShrink: 0, background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>🎥</span>
                        </div>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                        {movie.title}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                      {formatVND(movie.revenue)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                      {movie.tickets.toLocaleString('vi-VN')}
                    </span>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
