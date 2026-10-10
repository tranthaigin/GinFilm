import { apiGet } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';
import { toMovieCard } from '../mappers/movieMapper';

/**
 * @param {{ status?: import('../types.js').MovieStatus }} [params]
 * @returns {Promise<ReturnType<typeof toMovieCard>[]>}
 */
export async function getMovies(params = {}) {
  /** @type {import('../types.js').MovieDto[]} */
  const data = await apiGet(ENDPOINTS.movies.list, { params });

  return data.map(toMovieCard);
}

/** @param {number|string} movieId @returns {Promise<ReturnType<typeof toMovieCard>>} */
export async function getMovieById(movieId) {
  const data = await apiGet(ENDPOINTS.movies.detail(movieId));

  return toMovieCard(data);
}

export async function getRawMovies(params = {}) {
  return await apiGet(ENDPOINTS.movies.list, { params });
}

export async function getRawMovieDetails(movieId) {
  return await apiGet(ENDPOINTS.movies.detail(movieId));
}

export async function searchMovies(query) {
  return await apiGet(ENDPOINTS.movies.search, { params: { q: query } });
}

export async function getMovieShowtimes(movieId, provinceId, date) {
  return await apiGet(ENDPOINTS.movies.showtimes(movieId), {
    params: { provinceId, date }
  });
}
