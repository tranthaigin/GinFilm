import { useState, useEffect } from 'react';
import { genreApi } from '../api';
import { useToastStore } from './useToastStore';

export function useGenreManagement() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToast } = useToastStore();

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      setLoading(true);
      const data = await genreApi.getAll();
      setGenres(data);
    } catch (error) {
      console.error('Error fetching genres:', error);
      addToast({ type: 'error', message: error.message || 'Lỗi khi tải danh sách thể loại' });
    } finally {
      setLoading(false);
    }
  };

  return { genres, loading, fetchGenres };
}
