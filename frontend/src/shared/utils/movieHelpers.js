export const getAgeRatingColor = (rating) => {
  switch (rating) {
    case 'P': return 'bg-green-600 shadow-[0_2px_8px_rgba(22,163,74,0.5)]';
    case 'K': return 'bg-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.5)]';
    case 'T13': return 'bg-yellow-500 shadow-[0_2px_8px_rgba(234,179,8,0.5)]';
    case 'T16': return 'bg-orange-500 shadow-[0_2px_8px_rgba(249,115,22,0.5)]';
    case 'T18': return 'bg-red-600 shadow-[0_2px_8px_rgba(220,38,38,0.5)]';
    default: return 'bg-[#e61a27] shadow-[0_2px_8px_rgba(230,26,39,0.5)]';
  }
};
