import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProvincesWithTheaters } from '../api/services/provinceService';

/**
 * Hook quản lý danh sách Tỉnh/Thành phố và Cụm Rạp.
 * Tự động fetch khi mount, cung cấp logic lọc theo tỉnh được chọn.
 *
 * @param {boolean} [autoSelectFirst=true] - Có tự động chọn tỉnh đầu tiên hay không
 * @returns {{
 *   provinces: import('../api/types.js').ProvinceDto[],
 *   loading: boolean,
 *   error: Error | null,
 *   activeProvinceId: number | null,
 *   activeProvince: import('../api/types.js').ProvinceDto | null,
 *   theatersForActiveProvince: import('../api/types.js').TheaterDto[],
 *   setActiveProvinceId: (id: number | null) => void,
 *   refetch: () => void,
 * }}
 */
export function useProvinces(autoSelectFirst = true, persistKey = 'global_activeProvinceId') {
  /** @type {[import('../api/types.js').ProvinceDto[], Function]} */
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeProvinceId, setActiveProvinceId] = useState(() => {
    const saved = sessionStorage.getItem(persistKey);
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    if (activeProvinceId) {
      sessionStorage.setItem(persistKey, activeProvinceId);
    } else {
      sessionStorage.removeItem(persistKey);
    }
  }, [activeProvinceId, persistKey]);

  const fetchProvinces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProvincesWithTheaters();
      setProvinces(data ?? []);
      // Chọn tỉnh đầu tiên làm mặc định nếu chưa có lựa chọn
      if (autoSelectFirst && data && data.length > 0 && activeProvinceId === null) {
        setActiveProvinceId(data[0].id);
      }
    } catch (err) {
      setError(err);
      console.error('[useProvinces] Lỗi khi tải danh sách tỉnh/thành:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  /** Tỉnh đang được chọn */
  const activeProvince = useMemo(
    () => provinces.find((p) => p.id === activeProvinceId) ?? null,
    [provinces, activeProvinceId]
  );

  /** Danh sách rạp của tỉnh đang chọn */
  const theatersForActiveProvince = useMemo(
    () => activeProvince?.theaters ?? [],
    [activeProvince]
  );

  return {
    provinces,
    loading,
    error,
    activeProvinceId,
    activeProvince,
    theatersForActiveProvince,
    setActiveProvinceId,
    refetch: fetchProvinces,
  };
}
