const API_URL = `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`}/admin/genres`;

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
