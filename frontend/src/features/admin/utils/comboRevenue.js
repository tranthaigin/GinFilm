export function formatVND(value) {
  if (value == null) return '0';
  return value.toLocaleString('vi-VN');
}

export function formatCompactVND(val) {
  if (val == null || val === 0) return '0';
  if (val >= 1_000_000_000) {
    const formatted = (val / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted} tỷ`;
  }
  if (val >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted} tr`;
  }
  if (val >= 1_000) {
    return `${Math.round(val / 1_000)}k`;
  }
  return val.toLocaleString('vi-VN');
}

export const CINEMA_DATA = [
  {
    regionId: 'all',
    regionName: 'Tất Cả',
    theaters: [{ id: 'all', name: 'Tất cả rạp trên toàn quốc' }]
  },
  {
    regionId: 'binhdinh',
    regionName: 'Bình Định',
    theaters: [
      { id: 'cgv-qn', name: 'CGV Vincom Quy Nhơn' },
      { id: 'lotte-qn', name: 'Lotte Cinema Quy Nhơn' },
      { id: 'starlight-qn', name: 'Starlight Quy Nhơn' }
    ]
  },
  {
    regionId: 'hcm',
    regionName: 'Hồ Chí Minh',
    theaters: [
      { id: 'cgv-svh', name: 'CGV Sư Vạn Hạnh' },
      { id: 'bhd-32', name: 'BHD Star 3/2' },
      { id: 'galaxy-nguyendu', name: 'Galaxy Nguyễn Du' }
    ]
  },
  {
    regionId: 'hn',
    regionName: 'Hà Nội',
    theaters: [
      { id: 'cgv-vincom-bvt', name: 'CGV Vincom Bà Triệu' },
      { id: 'bhd-phamngocthach', name: 'BHD Phạm Ngọc Thạch' }
    ]
  }
];
