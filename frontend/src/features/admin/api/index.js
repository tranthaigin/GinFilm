// Admin API endpoints - placeholder for future backend integration
export const ADMIN_ENDPOINTS = {
  dashboard: {
    stats: '/admin/dashboard',
  },
  customers: {
    list: '/admin/customers',
    detail: (id) => `/admin/customers/${id}`,
    update: (id) => `/admin/customers/${id}`,
    delete: (id) => `/admin/customers/${id}`,
  },
  movies: {
    list: '/admin/movies',
    detail: (id) => `/admin/movies/${id}`,
  },
  employees: {
    list: '/admin/staff',
    detail: (id) => `/admin/staff/${id}`,
    update: (id) => `/admin/staff/${id}`,
    toggleLock: (id) => `/admin/staff/${id}/toggle-lock`,
    delete: (id) => `/admin/staff/${id}`,
  },
  theaters: {
    provinces: '/provinces',
    provincesAll: '/provinces/all',
    byProvince: (provinceId) => `/provinces/${provinceId}/theaters`,
    list: '/theaters',
    rooms: (theaterId) => `/theaters/${theaterId}/rooms`,
    create: '/admin/theaters',
    update: (id) => `/admin/theaters/${id}`,
    toggleActive: (id) => `/admin/theaters/${id}/toggle-active`,
    createRoom: (theaterId) => `/admin/theaters/${theaterId}/rooms`,
    updateRoom: (id) => `/admin/rooms/${id}`,
    toggleRoomActive: (id) => `/admin/rooms/${id}/toggle-active`,
  },
  promotions: {
    list: '/admin/promotions',
    detail: (id) => `/admin/promotions/${id}`,
    toggleVisibility: (id) => `/admin/promotions/${id}/toggle-visibility`,
  },
};

export { employeeApi } from './employeeApi';
export { movieApi } from './movieApi';
export { genreApi } from './genreApi';
export { theaterApi } from './theaterApi';
export { showtimeApi } from './showtimeApi';
export { promotionApi } from './promotionApi';
export { dashboardApi } from './dashboardApi';

export default ADMIN_ENDPOINTS;
