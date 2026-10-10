const BASE_URL = `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`}`;

const handleResponse = async (response) => {
  if (!response.ok) {
    let message = 'Đã xảy ra lỗi từ hệ thống.';
    try {
      const errData = await response.json();
      if (errData && errData.message) {
        message = errData.message;
      } else if (typeof errData === 'string' && errData.length <= 150) {
        message = errData;
      }
    } catch (e) {
      // Fallback if not JSON
    }
    throw new Error(message);
  }
  return response.json();
};

export const theaterApi = {
  /**
   * GET /api/provinces — Tất cả tỉnh/thành kèm danh sách rạp
   */
  getProvincesWithTheaters: async () => {
    try {
      const response = await fetch(`${BASE_URL}/provinces`);
      return handleResponse(response);
    } catch (error) {
      console.error('Lỗi API lấy danh sách tỉnh/thành:', error);
      throw error;
    }
  },

  /**
   * GET /api/provinces/all — Tất cả tỉnh/thành (light, không kèm theaters)
   */
  getAllProvinces: async () => {
    try {
      const response = await fetch(`${BASE_URL}/provinces/all`);
      return handleResponse(response);
    } catch (error) {
      console.error('Lỗi API lấy danh sách tỉnh/thành:', error);
      throw error;
    }
  },

  /**
   * GET /api/provinces/{provinceId}/theaters — Rạp theo tỉnh
   */
  getTheatersByProvince: async (provinceId) => {
    try {
      const response = await fetch(`${BASE_URL}/provinces/${provinceId}/theaters`);
      return handleResponse(response);
    } catch (error) {
      console.error(`Lỗi API lấy rạp theo tỉnh ${provinceId}:`, error);
      throw error;
    }
  },

  /**
   * GET /api/theaters — Tất cả rạp
   */
  getAllTheaters: async () => {
    try {
      const response = await fetch(`${BASE_URL}/theaters`);
      return handleResponse(response);
    } catch (error) {
      console.error('Lỗi API lấy danh sách rạp:', error);
      throw error;
    }
  },

  /**
   * GET /api/theaters/{theaterId}/rooms — Phòng chiếu của rạp
   */
  getRoomsByTheater: async (theaterId) => {
    try {
      const response = await fetch(`${BASE_URL}/theaters/${theaterId}/rooms`);
      return handleResponse(response);
    } catch (error) {
      console.error(`Lỗi API lấy phòng chiếu của rạp ${theaterId}:`, error);
      throw error;
    }
  },

  /**
   * GET /api/admin/rooms/{id} — Lấy chi tiết phòng và sơ đồ ghế
   */
  getRoomDetails: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/admin/rooms/${id}`);
      return handleResponse(response);
    } catch (error) {
      console.error(`Lỗi API lấy chi tiết phòng ${id}:`, error);
      throw error;
    }
  },

  /**
   * POST /api/admin/theaters — Thêm rạp mới
   * NOTE: Placeholder — cần backend triển khai endpoint này.
   */
  createTheater: async (data) => {
    try {
      const response = await fetch(`${BASE_URL}/admin/theaters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Lỗi API tạo rạp:', error);
      throw error;
    }
  },

  /**
   * PUT /api/admin/theaters/{id} — Cập nhật rạp
   */
  updateTheater: async (id, data) => {
    try {
      const response = await fetch(`${BASE_URL}/admin/theaters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Lỗi API cập nhật rạp:', error);
      throw error;
    }
  },

  /**
   * PATCH /api/admin/theaters/{id}/toggle-active — Bật/tắt trạng thái rạp
   */
  toggleTheaterStatus: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/admin/theaters/${id}/toggle-active`, {
        method: 'PATCH',
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Lỗi API toggle trạng thái rạp:', error);
      throw error;
    }
  },

  /**
   * POST /api/admin/theaters/{theaterId}/rooms — Thêm phòng chiếu vào rạp
   */
  createRoom: async (theaterId, data) => {
    try {
      const response = await fetch(`${BASE_URL}/admin/theaters/${theaterId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Lỗi API tạo phòng chiếu:', error);
      throw error;
    }
  },

  /**
   * PUT /api/admin/rooms/{id} — Cập nhật phòng chiếu
   */
  updateRoom: async (id, data) => {
    try {
      const response = await fetch(`${BASE_URL}/admin/rooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Lỗi API cập nhật phòng chiếu:', error);
      throw error;
    }
  },

  /**
   * PATCH /api/admin/rooms/{id}/toggle-active — Bật/tắt trạng thái phòng
   */
  toggleRoomStatus: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/admin/rooms/${id}/toggle-active`, {
        method: 'PATCH',
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Lỗi API toggle trạng thái phòng:', error);
      throw error;
    }
  },
};


