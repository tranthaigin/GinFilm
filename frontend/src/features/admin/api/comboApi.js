import api from '../../../shared/api/client';

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
