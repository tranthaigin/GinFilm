import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
        }}
      >
        <p style={{ color: payload[0].payload.color, fontSize: '13px', fontWeight: 600, margin: 0 }}>
          {payload[0].name}: {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export default function TicketDistributionChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div
      style={{
        background: '#141414',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>
        Phân bổ vé theo thể loại
      </h3>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '0 0 16px 0' }}>
        Tỷ lệ phần trăm
      </p>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: '16px',
          maxHeight: '220px',
          overflowY: 'auto',
          paddingRight: '8px',
        }}
      >
        {data.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderLeft: `4px solid ${item.color}`,
              transition: 'background 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: item.color,
                  flexShrink: 0,
                  boxShadow: `0 0 10px ${item.color}`,
                }}
              />
              <span style={{ fontSize: '14px', color: '#ffffff', fontWeight: 500 }}>{item.name}</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
