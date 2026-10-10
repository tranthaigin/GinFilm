import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

function formatVND(value) {
  return value.toLocaleString('vi-VN');
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '14px 18px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '0 0 8px 0', fontWeight: 600 }}>
          Ngày {label}
        </p>
        <p style={{ color: '#dc2626', fontSize: '16px', fontWeight: 700, margin: 0 }}>
          {formatVND(payload[0].value)}đ
        </p>
        {payload[1] && (
          <p style={{ color: '#60a5fa', fontSize: '13px', fontWeight: 500, margin: '4px 0 0 0' }}>
            {payload[1].value.toLocaleString('vi-VN')} vé
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div
      style={{
        background: '#141414',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: 0 }}>
            Doanh thu theo ngày
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '4px 0 0 0' }}>
            14 ngày gần nhất
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '3px', borderRadius: '2px', background: '#dc2626' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Doanh thu</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '3px', borderRadius: '2px', background: '#60a5fa' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Số vé</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }}
          />
          <YAxis
            yAxisId="revenue"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            tickFormatter={(v) => formatVND(v)}
          />
          <YAxis
            yAxisId="tickets"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke="#dc2626"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{ r: 5, fill: '#dc2626', stroke: '#fff', strokeWidth: 2 }}
          />
          <Area
            yAxisId="tickets"
            type="monotone"
            dataKey="tickets"
            stroke="#60a5fa"
            strokeWidth={1.5}
            fill="url(#ticketGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }}
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
