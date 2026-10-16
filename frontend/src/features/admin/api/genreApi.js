import env from "../../../shared/config/env";
import { apiFetch as fetch } from "../../../shared/api/fetch";
const API_URL = `${env.apiBaseUrl}/admin/genres`;

export const genreApi = {
  getAll: async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Không thể tải danh sách thể loại');
      }
      return await response.json();
    } catch (error) {
      console.error('Lỗi khi lấy thể loại:', error);
      throw error;
    }
  }
};
