// src/features/admin/api/showtimeApi.js
import api from '../../../shared/api/client';


// Base URL configuration - assuming Vite proxy is set up or using full URL
export const showtimeApi = {
  // Get all showtimes
  getAll: async (theaterId, date) => {
    try {
      let url = '/admin/showtimes';
      const params = new URLSearchParams();
      if (theaterId) params.append('theaterId', theaterId);
      if (date) params.append('date', date);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('API /admin/showtimes failed', error);
      throw error;
    }
  },

  // Search showtimes with pagination and filters
  searchShowtimes: async (paramsObj) => {
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(paramsObj)) {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      }
      const response = await api.get(`/admin/showtimes/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('API /admin/showtimes/search failed', error);
      throw error;
    }
  },

  // Get showtimes by date range (for auto generator)
  getShowtimesByDateRange: async (startDate, endDate) => {
    try {
      const response = await api.get(`/admin/showtimes/date-range?startDate=${startDate}&endDate=${endDate}`);
      return response.data;
    } catch (error) {
      console.error('API /admin/showtimes/date-range failed', error);
      throw error;
    }
  },

  // Create a single showtime
  create: async (showtimeData) => {
    try {
      const response = await api.post('/admin/showtimes', showtimeData);
      return response.data;
    } catch (error) {
      console.error('API POST /admin/showtimes failed', error);
      throw error;
    }
  },

  // Batch create showtimes (for auto generator)
  createBatch: async (showtimesArray) => {
    try {
      const response = await api.post('/admin/showtimes/batch', showtimesArray);
      return response.data;
    } catch (error) {
      console.error('API POST /admin/showtimes/batch failed', error);
      throw error;
    }
  },

  // Toggle visibility of a showtime
  toggleVisibility: async (id) => {
    try {
      const response = await api.patch(`/admin/showtimes/${id}/toggle-visibility`);
      return response.data;
    } catch (error) {
      console.error(`API PATCH /admin/showtimes/${id}/toggle-visibility failed`, error);
      throw error;
    }
  },

  // Delete all showtimes
  deleteAll: async () => {
    try {
      await api.delete('/admin/showtimes/all');
      return true;
    } catch (error) {
      console.error('API DELETE /admin/showtimes/all failed', error);
      throw error;
    }
  },

  // Delete all drafts
  deleteDrafts: async () => {
    try {
      const response = await api.delete('/admin/showtimes/drafts');
      return response.data;
    } catch (error) {
      console.error('API DELETE /admin/showtimes/drafts failed', error);
      throw error;
    }
  },

  // Publish drafts
  publishDrafts: async () => {
    try {
      const response = await api.post('/admin/showtimes/publish-drafts');
      return response.data;
    } catch (error) {
      console.error('API POST /admin/showtimes/publish-drafts failed', error);
      throw error;
    }
  },

  // Update showtime format
  updateFormat: async (id, format) => {
    try {
      const response = await api.put(`/admin/showtimes/${id}/format`, { format });
      return response.data;
    } catch (error) {
      console.error(`API PUT /admin/showtimes/${id}/format failed`, error);
      throw error;
    }
  },

  // Update showtime (full edit)
  update: async (id, showtimeData) => {
    try {
      const response = await api.put(`/admin/showtimes/${id}`, showtimeData);
      return response.data;
    } catch (error) {
      console.error(`API PUT /admin/showtimes/${id} failed`, error);
      throw error;
    }
  }
};
