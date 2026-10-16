import { useLocation } from "react-router-dom";
import { useAuthStore } from '../../store/authStore';

export default function AuthGuard({ children }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  Boolean(isAuthenticated || user || accessToken);
  useLocation();

  return children;
}
