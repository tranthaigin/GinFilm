import { apiGet } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

/**
 * @param {number|string} showId
 * @returns {Promise<import('../types.js').SeatMapResponse>}
 */
export async function getShowSeats(showId) {
  return apiGet(ENDPOINTS.shows.seats(showId));
}

/**
 * @param {{ movieId?: number, date?: string, theaterId?: number }} [params]
 * @returns {Promise<import('../types.js').ShowDto[]>}
 */
export async function getShows(params = {}) {
  return apiGet(ENDPOINTS.shows.list, { params });
}

/** @param {number|string} showId @returns {Promise<import('../types.js').ShowDto>} */
export async function getShowById(showId) {
  return apiGet(ENDPOINTS.shows.detail(showId));
}

/**
 * Lấy lịch chiếu theo rạp và ngày
 * @param {number|string} theaterId
 * @param {string} date YYYY-MM-DD
 * @returns {Promise<any[]>}
 */
export async function getShowtimesByTheaterAndDate(theaterId, date) {
  return apiGet(ENDPOINTS.theaters.showtimes(theaterId), { params: { date } });
}
