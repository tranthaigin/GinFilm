import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../user/store/authStore';

export default function AdminGuard({ children }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Function to safely check if user has admin role from various possible backend structures
  const checkIsAdmin = (userData) => {
    if (!userData) return false;

    // 1. Simple string check: { role: 'ADMIN' }
    if (typeof userData.role === 'string' && userData.role.toUpperCase().includes('ADMIN')) {
      return true;
    }

    // 2. Array check (String array or Object array): { roles: ['ADMIN'] } or { roles: [{name: 'ADMIN'}] }
    if (Array.isArray(userData.roles)) {
      return userData.roles.some((roleItem) => {
        if (typeof roleItem === 'string') {
          return roleItem.toUpperCase().includes('ADMIN');
        }
        // Object array from user_role join table e.g., { name: 'ROLE_ADMIN' } or { roleName: 'ADMIN' }
        if (typeof roleItem === 'object' && roleItem !== null) {
          const roleStr = String(Object.values(roleItem).join(' ')).toUpperCase();
          return roleStr.includes('ADMIN');
        }
        return false;
      });
    }

    // 3. Optional: check authorities array (Spring Security default)
    if (Array.isArray(userData.authorities)) {
      return userData.authorities.some(
        (auth) => typeof auth.authority === 'string' && auth.authority.toUpperCase().includes('ADMIN')
      );
    }

    return false;
  };

  const isAdmin = isAuthenticated && checkIsAdmin(user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Đợi GlobalAuthSync tải xong dữ liệu user trước khi check quyền
  if (isAuthenticated && !user) {
    return null; // hoặc <div>Loading...</div>
  }

  if (!isAdmin) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}

