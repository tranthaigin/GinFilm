import { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { movieApi } from '../api';
import { useToastStore } from './useToastStore';

export function useMovieManagement() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToast } = useToastStore();

  const fetchMovies = useCallback(() => {
    return movieApi
      .getAll()
      .then((data) => {
        const transformedData = data.map((m) => ({
          ...m,
          genre:
            m.genres && m.genres.length > 0
              ? m.genres.map((g) => g.name).join(' - ')
              : 'Chưa có thể loại',
          durationStr: m.duration ? `${m.duration} phút` : '',
          revenue: '0', // Not supported by backend yet
          rating: 0, // Not supported by backend yet
          genreIds: m.genres ? m.genres.map((g) => g.id) : [],
          formatIds: m.formats ? m.formats.map((f) => f.id) : [],
        }));
        setMovies(transformedData);
      })
      .catch((error) => {
        console.error('Error fetching movies:', error);
        addToast({
          type: 'error',
          message: error.message || 'Lỗi khi tải danh sách phim',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [addToast]);

  const loadKey301 = JSON.stringify([addToast]);
  const [previousLoadKey301, setPreviousLoadKey301] = useState(null);
  if (previousLoadKey301 !== loadKey301) {
    setPreviousLoadKey301(loadKey301);
    setLoading(true);
  }

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const addMovie = async (formData) => {
    try {
      await movieApi.create(formData);
      await ((...args) => {
        setLoading(true);
        return fetchMovies(...args);
      })();
      addToast({ type: 'success', message: 'Thêm phim mới thành công!' });
      return { success: true };
    } catch (error) {
      console.error('Error adding movie:', error);
      addToast({
        type: 'error',
        message: error.message || 'Lỗi khi thêm phim',
      });
      return { success: false, message: error.message };
    }
  };

  const editMovie = async (id, formData) => {
    try {
      await movieApi.update(id, formData);
      await ((...args) => {
        setLoading(true);
        return fetchMovies(...args);
      })();
      addToast({ type: 'success', message: 'Cập nhật phim thành công!' });
      return { success: true };
    } catch (error) {
      console.error('Error updating movie:', error);
      addToast({
        type: 'error',
        message: error.message || 'Lỗi khi cập nhật phim',
      });
      return { success: false, message: error.message };
    }
  };

  const toggleMovieVisibility = async (id) => {
    try {
      const result = await movieApi.toggleVisibility(id);
      setMovies((prevMovies) =>
        prevMovies.map((m) =>
          m.id === id ? { ...m, isHidden: result.isHidden } : m
        )
      );
      addToast({
        type: 'success',
        message: result.message || 'Cập nhật trạng thái thành công!',
      });
      return { success: true };
    } catch (error) {
      console.error('Error toggling movie visibility:', error);
      addToast({
        type: 'error',
        message: error.message || 'Lỗi khi cập nhật trạng thái',
      });
      return { success: false, message: error.message };
    }
  };

  return {
    movies,
    loading,
    fetchMovies: (...args) => {
      setLoading(true);
      return fetchMovies(...args);
    },
    addMovie,
    editMovie,
    toggleMovieVisibility,
  };
}
