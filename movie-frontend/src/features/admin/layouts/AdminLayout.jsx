import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import ToastContainer from '../components/ToastContainer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import useThemeStore from '../../../shared/store/themeStore';
import { useLightModeStyle } from '../../../shared/hooks/useLightModeStyle';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  useLightModeStyle(isDarkMode);

  return (
    <div
      className={!isDarkMode ? 'admin-light-mode' : 'dark'}
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: isDarkMode ? '#0a0a0a' : '#f1f3f6',
        fontFamily: '"Inter", sans-serif',
        transition: 'background 0.3s ease',
      }}
    >
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <AdminHeader />
        <main
          style={{
            flex: 1,
            padding: '28px 32px',
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
