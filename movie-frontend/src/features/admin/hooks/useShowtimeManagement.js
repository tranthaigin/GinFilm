import { useState, useEffect } from 'react';
import { showtimeApi } from '../api';
import { useToastStore } from './useToastStore';

export function useShowtimeManagement() {
  const [showtimes, setShowtimes] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToastStore();

  const fetchShowtimes = async (filters = {}) => {
    try {
      setLoading(true);
      const data = await showtimeApi.searchShowtimes(filters);
      setShowtimes(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || 0);
    } catch (error) {
      console.error('Error fetching showtimes:', error);
      addToast({ type: 'error', message: error.message || 'Lỗi khi tải danh sách suất chiếu' });
    } finally {
      setLoading(false);
    }
  };

  const addShowtime = async (payload) => {
    try {
      if (Array.isArray(payload)) {
        await showtimeApi.createBatch(payload);
      } else {
        await showtimeApi.create(payload);
      }
      await fetchShowtimes();
      addToast({ type: 'success', message: 'Thêm suất chiếu thành công!' });
      return { success: true };
    } catch (error) {
      console.error('Error adding showtime:', error);
      addToast({ type: 'error', message: error.message || 'Lỗi khi thêm suất chiếu' });
      return { success: false, message: error.message };
    }
  };

  const toggleShowtimeVisibility = async (id) => {
    try {
      const result = await showtimeApi.toggleVisibility(id);
      setShowtimes(prev =>
        prev.map(s => s.id === id ? { ...s, isHidden: result.isHidden } : s)
      );
      addToast({ type: 'success', message: result.message || 'Cập nhật trạng thái thành công!' });
      return { success: true };
    } catch (error) {
      console.error('Error toggling showtime visibility:', error);
      addToast({ type: 'error', message: error.message || 'Lỗi khi cập nhật trạng thái' });
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteAllShowtimes = async () => {
    try {
      setLoading(true);
      await showtimeApi.deleteAll();
      addToast({ message: 'Xóa toàn bộ suất chiếu thành công', type: 'success' });
      fetchShowtimes();
      return true;
    } catch (err) {
      addToast({ message: err.response?.data?.message || 'Có lỗi khi xóa toàn bộ suất chiếu', type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateFormat = async (id, format) => {
    try {
      await showtimeApi.updateFormat(id, format);
      addToast({ type: 'success', message: 'Cập nhật định dạng thành công!' });
      // Update local state directly to avoid refetching
      setShowtimes(prev => prev.map(s => s.id === id ? { ...s, format } : s));
      return true;
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Có lỗi khi cập nhật định dạng' });
      return false;
    }
  };

  const updateShowtime = async (id, data) => {
    try {
      const updated = await showtimeApi.update(id, data);
      addToast({ type: 'success', message: 'Cập nhật suất chiếu thành công!' });
      // Update local state with returned data
      setShowtimes(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
      return { success: true };
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Có lỗi khi cập nhật suất chiếu' });
      return { success: false, message: err.message };
    }
  };
  return {
    showtimes,
    totalPages,
    totalElements,
    loading,
    fetchShowtimes,
    addShowtime,
    toggleShowtimeVisibility,
    deleteAllShowtimes,
    updateFormat,
    updateShowtime
  }
};



