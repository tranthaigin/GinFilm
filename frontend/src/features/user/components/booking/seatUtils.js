export const getSeatType = (seatType) => {
  if (!seatType) return 'normal';
  const t = seatType.toUpperCase();
  if (t === 'NORMAL') return 'normal';
  if (t === 'VIP') return 'vip';
  if (t === 'COUPLE') return 'couple';
  if (t === 'BED') return 'bed';
  return 'normal';
};

export const PRICES = {
  normal: 75000,
  vip: 90000,
  couple: 120000,
  bed: 150000,
};
