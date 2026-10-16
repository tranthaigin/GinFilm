
const GENRE_BADGE = {
  'SCI-FI': 'bg-accent-soft/10 text-accent-soft border border-accent-soft/20 backdrop-blur-sm',
  ACTION: 'bg-surface/80 text-text-strong border border-surface-alt backdrop-blur-sm',
  HORROR: 'bg-surface/80 text-text-strong border border-surface-alt backdrop-blur-sm',
  FANTASY: 'bg-surface/80 text-text-strong border border-surface-alt backdrop-blur-sm',
};

const DEFAULT_BADGE = 'bg-surface/80 text-text-strong border border-surface-alt backdrop-blur-sm';

/** @param {import('../types.js').MovieDto} movie */
export function toMovieCard(movie) {
  return {
    id: movie.id,
    title: movie.title,
    rating: movie.rating,
    genre: movie.genre,
    genreBadgeClass: GENRE_BADGE[movie.genre] ?? DEFAULT_BADGE,
    poster: movie.posterUrl,
    trending: movie.trending,
    highlighted: movie.highlighted,
  };
}

