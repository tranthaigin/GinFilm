import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import { apiGet } from '../../../../shared/api/client';
import { ROUTE_PATHS } from '../../../../app/routes/paths';

/**
 * PinGuard – chặn tất cả các route ngoại trừ auth và home nếu user chưa set mã PIN.
 */
export default function PinGuard({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const [hasPin, setHasPin] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      apiGet('/users/pin/status')
        .then((res) => {
          setHasPin(res.hasPinSetup);
          // Gắn trạng thái vào store hoặc window để HomePage biết cần hiện popup
          window.dispatchEvent(new CustomEvent('pin-status-checked', { detail: { hasPinSetup: res.hasPinSetup } }));
        })
        .catch(() => setHasPin(true)); // Nếu lỗi API, không chặn user
    } else {
      setHasPin(true); // If not authenticated, let it pass (AuthGuard will catch if route requires auth)
    }
  }, [isAuthenticated]);


  if (hasPin === null) {
    return <div>Loading...</div>; // Đang kiểm tra
  }

  // Nếu user đã đăng nhập nhưng chưa cài PIN, CHỈ cho phép ở trang chủ
  if (isAuthenticated && !hasPin && location.pathname !== ROUTE_PATHS.home) {
    return <Navigate to={ROUTE_PATHS.home} replace />;
  }

  return children;
}
