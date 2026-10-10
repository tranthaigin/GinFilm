import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`}`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status >= 400 && status < 500) {
      const data = error.response?.data;
      if (typeof data === 'string') {
        const lowerData = data.trim().toLowerCase();
        if (lowerData.startsWith('<!doctype html>') || lowerData.startsWith('<html')) {
          return Promise.reject(new Error('Hệ thống đang bảo trì hoặc gặp sự cố. Vui lòng thử lại sau.'));
        }
        if (data.length > 150 || lowerData.includes('exception') || lowerData.includes('trace')) {
          return Promise.reject(new Error('Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'));
        }
        return Promise.reject(new Error(data));
      }
    }
    if (!error.response) {
      return Promise.reject(new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.'));
    }
    return Promise.reject(new Error('Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'));
  }
);

export const comboApi = {
  getAll: async () => {
    try {
      const response = await api.get('/admin/combos');
      return response.data;
    } catch (error) {
      console.error('Lỗi API lấy danh sách combo:', error);
      throw error.response?.data || error;
    }
  },

  getRevenueChart: async (startDate, endDate) => {
    try {
      let url = '/admin/combos/revenue-chart';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Lỗi API lấy dữ liệu biểu đồ:', error);
      throw error.response?.data || error;
    }
  },

  create: async (data, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('price', data.price);
      formData.append('status', data.status);
      if (data.description) formData.append('description', data.description);
      if (data.discountPercent !== undefined) formData.append('discountPercent', data.discountPercent);
      if (data.discountStartDate) formData.append('discountStartDate', data.discountStartDate);
      if (data.discountEndDate) formData.append('discountEndDate', data.discountEndDate);
      if (imageFile) formData.append('image', imageFile);
      // Giữ imageUrl nếu có
      if (data.imageUrl) formData.append('imageUrl', data.imageUrl);

      const response = await api.post('/admin/combos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Lỗi API tạo combo:', error);
      throw error.response?.data || error;
    }
  },

  update: async (id, data, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('price', data.price);
      formData.append('status', data.status);
      formData.append('discountPercent', data.discountPercent || 0);
      if (data.discountStartDate) formData.append('discountStartDate', data.discountStartDate);
      if (data.discountEndDate) formData.append('discountEndDate', data.discountEndDate);
      if (data.description) formData.append('description', data.description);
      if (imageFile) formData.append('image', imageFile);
      if (data.imageUrl && !imageFile) formData.append('imageUrl', data.imageUrl);

      const response = await api.put(`/admin/combos/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Lỗi API cập nhật combo:', error);
      throw error.response?.data || error;
    }
  },

  toggleHide: async (id) => {
    try {
      const response = await api.patch(`/admin/combos/${id}/toggle-hide`);
      return response.data;
    } catch (error) {
      console.error('Lỗi API ẩn/hiện combo:', error);
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/admin/combos/${id}`);
      return response.data;
    } catch (error) {
      console.error('Lỗi API xóa combo:', error);
      throw error.response?.data || error;
    }
  }
};
