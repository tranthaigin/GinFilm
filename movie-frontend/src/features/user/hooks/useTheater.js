import { useCallback, useEffect, useState } from 'react';
import { getTheaterById, getActiveTheaters } from '../api/services/provinceService';

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
  const [theater, setTheater] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (!theaterId) {
      setTheater(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getTheaterById(theaterId);
      setTheater(data ?? null);
    } catch (err) {
      setError(err);
      console.error('[useTheater] Lỗi khi tải chi tiết rạp:', err);
    } finally {
      setLoading(false);
    }
  }, [theaterId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { theater, loading, error, refetch: fetch };
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
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveTheaters();
      setTheaters(data ?? []);
    } catch (err) {
      setError(err);
      console.error('[useActiveTheaters] Lỗi khi tải danh sách rạp:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { theaters, loading, error, refetch: fetch };
}
