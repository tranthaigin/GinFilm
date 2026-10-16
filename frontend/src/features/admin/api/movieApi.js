import env from "../../../shared/config/env";
import { apiFetch as fetch } from "../../../shared/api/fetch";
const API_URL = `${env.apiBaseUrl}/admin/movies`;

export const movieApi = {
  getAll: async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Không thể tải danh sách phim');
      return await response.json();
    } catch (error) {
      console.error('Lỗi API lấy danh sách phim:', error);
      throw error;
    }
  },

  create: async (formData) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errStr = await response.text();
        let cleanError = errStr;
        if (errStr.includes('not-null constraint')) {
          cleanError = 'Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại form.';
        } else if (errStr.includes('could not execute statement')) {
          cleanError = 'Dữ liệu không hợp lệ.';
        } else if (errStr.length > 150) {
          cleanError = 'Đã xảy ra lỗi từ hệ thống (Dữ liệu không hợp lệ).';
        }
        throw new Error(cleanError);
      }
      return await response.json();
    } catch (error) {
      console.error('Lỗi API tạo phim:', error);
      throw error;
    }
  },

  update: async (id, formData) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        body: formData,
      });
      if (!response.ok) {
        const errStr = await response.text();
        let cleanError = errStr;
        if (errStr.includes('not-null constraint')) {
          cleanError = 'Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại form.';
        } else if (errStr.includes('could not execute statement')) {
          cleanError = 'Dữ liệu không hợp lệ.';
        } else if (errStr.length > 150) {
          cleanError = 'Đã xảy ra lỗi từ hệ thống (Dữ liệu không hợp lệ).';
        }
        throw new Error(cleanError);
      }
      return await response.json();
    } catch (error) {
      console.error('Lỗi API cập nhật phim:', error);
      throw error;
    }
  },

  toggleVisibility: async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}/toggle-visibility`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        const errStr = await response.text();
        let cleanError = errStr;
        if (errStr.length > 150) {
          cleanError = 'Đã xảy ra lỗi từ hệ thống.';
        }
        throw new Error(cleanError);
      }
      return await response.json();
    } catch (error) {
      console.error('Lỗi API cập nhật trạng thái hiển thị phim:', error);
      throw error;
    }
  }
};
