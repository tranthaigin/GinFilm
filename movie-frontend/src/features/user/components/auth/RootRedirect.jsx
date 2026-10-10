import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROUTE_PATHS } from '../../../../app/routes/paths';

/**
 * RootRedirect – xử lý redirect thông minh khi truy cập route "/" hoặc sau khi
 * mở lại trình duyệt mà session vẫn còn trong localStorage.
 *
 * Logic:
 *  - Chưa đăng nhập                → /home (trang công khai)
 *  - Đã đăng nhập, role ADMIN      → /admin
 *  - Đã đăng nhập, role STAFF      → /staff
 *  - Đã đăng nhập, role USER/other → /home
 */
export default function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  const hasSession = isAuthenticated && (user || accessToken);

  if (!hasSession) {
    return <Navigate to={ROUTE_PATHS.home} replace />;
  }

  // Kiểm tra role từ nhiều cấu trúc BE có thể trả về
  const getRoleString = (userData) => {
    if (!userData) return '';

    // { role: 'ADMIN' }
    if (typeof userData.role === 'string') return userData.role.toUpperCase();

    // { roles: ['ROLE_ADMIN'] } hoặc { roles: [{name: 'ADMIN'}] }
    if (Array.isArray(userData.roles)) {
      return userData.roles
        .map((r) => (typeof r === 'string' ? r : Object.values(r).join(' ')))
        .join(' ')
        .toUpperCase();
    }

    // Spring Security: { authorities: [{ authority: 'ROLE_ADMIN' }] }
    if (Array.isArray(userData.authorities)) {
      return userData.authorities
        .map((a) => (typeof a.authority === 'string' ? a.authority : ''))
        .join(' ')
        .toUpperCase();
    }

    return '';
  };

  const roleStr = getRoleString(user);

  if (roleStr.includes('ADMIN')) {
    return <Navigate to={ROUTE_PATHS.admin} replace />;
  }

  if (roleStr.includes('STAFF')) {
    return <Navigate to={ROUTE_PATHS.staff} replace />;
  }

  // USER hoặc bất kỳ role nào khác → home
  return <Navigate to={ROUTE_PATHS.home} replace />;
}
