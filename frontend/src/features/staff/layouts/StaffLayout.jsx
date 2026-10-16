import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import StaffSidebar from './StaffSidebar';
import AdminHeader from '../../admin/layouts/AdminHeader';
import ToastContainer from '../../admin/components/ToastContainer';
import StaffChatWidget from '../components/StaffChatWidget';
import useThemeStore from '../../../shared/store/themeStore';
import { useLightModeStyle } from '../../../shared/hooks/useLightModeStyle';

export default function StaffLayout() {
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
      <StaffSidebar
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
          <Outlet />
        </main>
      </div>

      <ToastContainer />
      <StaffChatWidget />
    </div>
  );
}
