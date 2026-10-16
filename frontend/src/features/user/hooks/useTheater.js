import { useAsync } from './useAsync';
import { useCallback, useEffect, useState } from 'react';
import {
  getTheaterById,
  getActiveTheaters,
} from '../api/services/provinceService';

/**
 * Hook lấy thông tin chi tiết của một rạp theo ID.
 *
 * @param {number|string|null} theaterId - ID rạp cần lấy chi tiết
 * @returns {{
 *   theater: import('../api/types.js').TheaterDto | null,
 *   loading: boolean,
 *   error: Error | null,
 *   refetch: () => void,
 * }}
 */
export function useTheater(theaterId) {
  const fetcher = useCallback(
    () => (theaterId ? getTheaterById(theaterId) : Promise.resolve(null)),
    [theaterId]
  );
  const { data, loading, error, refetch } = useAsync(fetcher);
  return {
    theater: data ?? null,
    loading: Boolean(theaterId) && loading,
    error,
    refetch,
  };
}

/**
 * Hook lấy danh sách tất cả rạp đang hoạt động.
 *
 * @returns {{
 *   theaters: import('../api/types.js').TheaterDto[],
 *   loading: boolean,
 *   error: Error | null,
 *   refetch: () => void,
 * }}
 */
export function useActiveTheaters() {
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(() => {
    return getActiveTheaters()
      .then((data) => {
        setTheaters(data ?? []);
      })
      .catch((err) => {
        setError(err);
        console.error('[useActiveTheaters] Lỗi khi tải danh sách rạp:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const loadKey2 = JSON.stringify([]);
  const [previousLoadKey2, setPreviousLoadKey2] = useState(null);
  if (previousLoadKey2 !== loadKey2) {
    setPreviousLoadKey2(loadKey2);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    theaters,
    loading,
    error,
    refetch: (...args) => {
      setLoading(true);
      setError(null);
      return fetch(...args);
    },
  };
}
