import { apiGet, apiPost, apiPut } from '../../../shared/api/client';

const BASE = '/staff/customers';

export const staffCustomerApi = {
  /**
   * Lấy danh sách tất cả khách hàng đang hoạt động.
   */
  fetchCustomers: async () => {
    return await apiGet(BASE);
  },

  /**
   * Lấy danh sách khách hàng đã bị khoá.
   */
  fetchLockedCustomers: async () => {
    return await apiGet(`${BASE}/locked`);
  },

  /**
   * Tạo tài khoản user mới thay mặt khách hàng.
   * @param {Object} data - { username, email, password, fullName, phoneNumber, dateOfBirth }
   */
  createCustomer: async (data) => {
    return await apiPost(BASE, data);
  },

  /**
   * Cập nhật thông tin khách hàng.
   * @param {string} id - UUID của user
   * @param {Object} data - { email, phoneNumber, status }
   */
  updateCustomer: async (id, data) => {
    return await apiPut(`${BASE}/${id}`, data);
  },

  /**
   * Khoá hoặc mở khoá tài khoản khách hàng.
   * @param {string} id - UUID của user
   */
  toggleLock: async (id) => {
    return await apiPut(`${BASE}/${id}/toggle-lock`);
  },
};
