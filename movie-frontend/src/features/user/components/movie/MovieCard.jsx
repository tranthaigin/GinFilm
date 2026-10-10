import React from 'react';
import { useNavigate } from 'react-router-dom';

const MovieCard = ({ movie, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(movie);
    } else {
      navigate(`/movie-details?id=${movie.id}`);
    }
  };

  const getBadgeStyle = () => {
    // Priority check based on status/type
    if (movie.type === 'online') {
      return { bg: 'bg-gradient-to-r from-cyan-500 to-blue-500', text: 'Mua Trực Tuyến' };
    }

    // Check if it's featured
    if (movie.isFeatured || movie.type === 'noi_bat') {
      return { bg: 'bg-red-600', text: 'Nổi Bật' };
    }

    if (movie.status === 'NOW_SHOWING' || movie.status === 'showing') {
      return { bg: 'bg-emerald-500', text: 'Đang Chiếu' };
    }

    if (movie.status === 'COMING_SOON' || movie.status === 'coming_soon' || movie.status === 'upcoming' || movie.status === 'UPCOMING') {
      return { bg: 'bg-orange-500', text: 'Sắp Chiếu' };
    }

    // Default badge
    return { bg: 'bg-gray-600', text: 'Phim' };
  };

  const badge = getBadgeStyle();
  const genresStr = movie.genres ? (Array.isArray(movie.genres) ? movie.genres.map(g => typeof g === 'object' ? (g.name || g.genreName || '') : g).filter(Boolean).join(', ') : movie.genres) : 'Chưa cập nhật thể loại';

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col gap-2 cursor-pointer transition-all duration-300"
    >
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_0_15px_rgba(255,255,255,0.08)] border border-gray-200 dark:border-white/30 group-hover:border-gray-300 dark:group-hover:border-white/60 transition-all duration-300">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Gradient Overlay for aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded shadow-lg ${badge.bg}`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-white drop-shadow-md">
            {badge.text}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col mt-1 px-1">
        <h3 className="text-[#111827] dark:text-white font-bold text-[13px] leading-[1.35] line-clamp-1 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" title={movie.title}>
          {movie.title}
        </h3>
        <p className="text-gray-500 dark:text-[#9D9D9D] font-medium text-[11px] mt-1 line-clamp-1">
          {genresStr}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
