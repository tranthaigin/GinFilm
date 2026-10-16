import env from '../../../../shared/config/env';
import { apiGet } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

/**
 * Lấy chi tiết một rạp chiếu theo ID.
 * GET /api/theaters/:id
 * @param {number|string} theaterId
 * @returns {Promise<import('../types.js').TheaterDto>}
 */
export async function getTheaterById(theaterId) {
    if (env.useMockApi) {
        // Fallback mock: tìm trong danh sách mock nếu cần
        const { getProvincesWithTheaters } = await import('./provinceService');
        const provinces = await getProvincesWithTheaters();
        const allTheaters = provinces.flatMap((p) => p.theaters);
        const found = allTheaters.find((t) => t.id === Number(theaterId));
        if (!found) throw new Error(`Không tìm thấy rạp với id: ${theaterId}`);
        return found;
    }
    return apiGet(ENDPOINTS.theaters.detail(theaterId));
}
