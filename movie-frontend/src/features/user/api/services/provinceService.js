import {apiGet} from '../../../../shared/api/client';
import {ENDPOINTS} from '../../../../shared/api/endpoints';
/**
 * Lấy danh sách tỉnh/thành có rạp, mỗi tỉnh kèm theaters[].
 * GET /api/provinces
 * @returns {Promise<import('../types.js').ProvinceDto[]>}
 */
export async function getProvincesWithTheaters() {
    return apiGet(ENDPOINTS.provinces.withTheaters);
}

/**
 * Lấy danh sách rạp theo provinceId.
 * GET /api/provinces/:id/theaters
 * @param {number|string} provinceId
 * @returns {Promise<import('../types.js').TheaterDto[]>}
 */
export async function getTheatersByProvince(provinceId) {
    return apiGet(ENDPOINTS.provinces.theaters(provinceId));
}

/**
 * Lấy toàn bộ rạp không lọc tỉnh.
 * GET /api/theaters
 * @returns {Promise<import('../types.js').TheaterDto[]>}
 */
export async function getAllTheaters() {
    return apiGet(ENDPOINTS.theaters.list);
}

/**
 * Lấy danh sách tất cả rạp đang hoạt động (isActive = true).
 * GET /api/theaters/active
 * @returns {Promise<import('../types.js').TheaterDto[]>}
 */
export async function getActiveTheaters() {
    return apiGet(ENDPOINTS.theaters.active);
}

/**
 * Lấy thông tin chi tiết của một rạp theo ID.
 * GET /api/theaters/:id
 * @param {number|string} theaterId
 * @returns {Promise<import('../types.js').TheaterDto>}
 */
export async function getTheaterById(theaterId) {
    return apiGet(ENDPOINTS.theaters.detail(theaterId));
}