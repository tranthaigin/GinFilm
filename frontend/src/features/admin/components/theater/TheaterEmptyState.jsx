import { Building2, Tv2, MousePointerClick } from 'lucide-react';

/**
 * Empty state component for Theater Management panels.
 * variant: 'select-province' | 'select-theater' | 'no-rooms' | 'no-theaters' | 'no-provinces'
 */
export default function TheaterEmptyState({ variant = 'select-province' }) {
  const configs = {
    'select-province': {
      Icon: MousePointerClick,
      title: 'Chọn cụm rạp',
      desc: 'Chọn một tỉnh/thành phố ở bên trái để xem danh sách rạp chiếu.',
      color: 'rgba(220,38,38,0.6)',
    },
    'select-theater': {
      Icon: Building2,
      title: 'Chọn rạp chiếu',
      desc: 'Chọn một rạp chiếu để xem và quản lý danh sách phòng chiếu.',
      color: 'rgba(99,102,241,0.7)',
    },
    'no-rooms': {
      Icon: Tv2,
      title: 'Chưa có phòng chiếu',
      desc: 'Rạp này chưa có phòng chiếu nào. Nhấn "+ Thêm phòng" để tạo mới.',
      color: 'rgba(34,197,94,0.6)',
    },
    'no-theaters': {
      Icon: Building2,
      title: 'Chưa có rạp chiếu',
      desc: 'Cụm rạp này chưa có rạp nào. Nhấn "+ Thêm rạp" để tạo mới.',
      color: 'rgba(245,158,11,0.6)',
    },
    'no-provinces': {
      Icon: Building2,
      title: 'Chưa có dữ liệu',
      desc: 'Không tải được dữ liệu cụm rạp. Vui lòng thử lại.',
      color: 'rgba(239,68,68,0.6)',
    },
  };

  const { Icon, title, desc, color } = configs[variant] || configs['select-province'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        gap: '12px',
        height: '100%',
        minHeight: '200px',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: `${color.replace('0.6', '0.1')}`,
          border: `1px solid ${color.replace('0.6', '0.2')}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4px',
        }}
      >
        <Icon size={24} color={color} />
      </div>
      <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
        {title}
      </p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0, maxWidth: '200px', lineHeight: 1.5 }}>
        {desc}
      </p>
    </div>
  );
}
