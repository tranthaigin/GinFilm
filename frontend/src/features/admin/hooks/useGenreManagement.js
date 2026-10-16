import { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { genreApi } from '../api';
import { useToastStore } from './useToastStore';

export function useGenreManagement() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToast } = useToastStore();

  const fetchGenres = useCallback(() => {
    return genreApi
      .getAll()
      .then((data) => {
        setGenres(data);
      })
      .catch((error) => {
        console.error('Error fetching genres:', error);
        addToast({
          type: 'error',
          message: error.message || 'Lỗi khi tải danh sách thể loại',
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
    fetchGenres();
  }, [fetchGenres]);

  return {
    genres,
    loading,
    fetchGenres: (...args) => {
      setLoading(true);
      return fetchGenres(...args);
    },
  };
}
