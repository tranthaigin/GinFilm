import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCallback, useEffect } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { apiGet } from '../../../../shared/api/client';
import { ROUTE_PATHS } from '../../../../app/routes/paths';

/**
 * PinGuard – chặn tất cả các route ngoại trừ auth và home nếu user chưa set mã PIN.
 */
export default function PinGuard({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useAuthStore((state) => state.user);
  const location = useLocation();
  const fetchPin = useCallback(
    () =>
      isAuthenticated
        ? apiGet('/users/pin/status')
        : Promise.resolve({ hasPinSetup: true }),
    [isAuthenticated]
  );
  const { data, loading, error } = useAsync(fetchPin);
  const hasPin = error ? true : data?.hasPinSetup;

  useEffect(() => {
    if (isAuthenticated && data) {
      // Gắn trạng thái vào store hoặc window để HomePage biết cần hiện popup
      window.dispatchEvent(
        new CustomEvent('pin-status-checked', {
          detail: { hasPinSetup: data.hasPinSetup },
        })
      );
    }
  }, [isAuthenticated, data]);

  if (isAuthenticated && loading) {
    return <div>Loading...</div>; // Đang kiểm tra
  }

  // Nếu user đã đăng nhập nhưng chưa cài PIN, CHỈ cho phép ở trang chủ
  if (isAuthenticated && !hasPin && location.pathname !== ROUTE_PATHS.home) {
    return <Navigate to={ROUTE_PATHS.home} replace />;
  }

  return children;
}
