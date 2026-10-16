import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../user/store/authStore';

export default function StaffGuard({ children }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Function to safely check if user has staff or admin role
  const checkIsStaffOrAdmin = (userData) => {
    if (!userData) return false;

    // 1. Simple string check
    if (typeof userData.role === 'string') {
      const roleStr = userData.role.toUpperCase();
      if (roleStr.includes('STAFF') || roleStr.includes('ADMIN')) return true;
    }

    // 2. Array check
    if (Array.isArray(userData.roles)) {
      return userData.roles.some((roleItem) => {
        if (typeof roleItem === 'string') {
          const roleStr = roleItem.toUpperCase();
          return roleStr.includes('STAFF') || roleStr.includes('ADMIN');
        }
        if (typeof roleItem === 'object' && roleItem !== null) {
          const roleStr = String(Object.values(roleItem).join(' ')).toUpperCase();
          return roleStr.includes('STAFF') || roleStr.includes('ADMIN');
        }
        return false;
      });
    }

    // 3. authorities array (Spring Security)
    if (Array.isArray(userData.authorities)) {
      return userData.authorities.some(
        (auth) => {
          if (typeof auth.authority === 'string') {
            const roleStr = auth.authority.toUpperCase();
            return roleStr.includes('STAFF') || roleStr.includes('ADMIN');
          }
          return false;
        }
      );
    }

    return false;
  };

  const isAllowed = isAuthenticated && checkIsStaffOrAdmin(user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Đợi GlobalAuthSync tải xong dữ liệu user trước khi check quyền
  if (isAuthenticated && !user) {
    return null;
  }

  if (!isAllowed) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
