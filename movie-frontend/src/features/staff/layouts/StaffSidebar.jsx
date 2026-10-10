import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Film,
  UserCog,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MonitorPlay,
  Coffee,
  Gift,
  Tag,
  ChevronDown,
  Calendar,
  ShieldCheck,
  MessageCircle,
  AlertTriangle,
  Building,
  Briefcase,
  Globe,
  Layers,
  Ticket,
  QrCode,
} from 'lucide-react';
import { LOGO_URL } from '../../../shared/constants/brand';
import { useAuthStore } from '../../user/store/authStore';
import { logout } from '../../user/api/services/authService';
import useThemeStore from '../../../shared/store/themeStore';

const navItems = [
  {
    label: 'BÁN VÉ TẠI QUẦY (POS)',
    path: '/staff/pos',
    icon: Ticket,
  },
  {
    label: 'SOÁT VÉ QR',
    path: '/staff/scan-qr',
    icon: QrCode,
  },
  {
    label: 'DOANH THU & BÁO CÁO',
    path: '/staff/revenue-menu',
    icon: LayoutDashboard,
    subItems: [
      { label: 'DOANH THU VÉ TẠI RẠP', path: '/staff', icon: Ticket, end: true },
      { label: 'DOANH THU TRỰC TUYẾN', path: '/staff/revenue/online', icon: Globe },
      { label: 'DOANH THU COMBO', path: '/staff/combo/revenue', icon: Coffee },
    ],
  },
  {
    label: 'QUẢN LÍ PHIM & RẠP',
    path: '/staff/movies-theaters',
    icon: Film,
    subItems: [
      { label: 'DANH SÁCH PHIM', path: '/staff/movies', icon: Film },
      { label: 'SUẤT CHIẾU', path: '/staff/showtimes', icon: Calendar },
    ],
  },
  {
    label: 'QUẢN LÍ KINH DOANH',
    path: '/staff/business',
    icon: Briefcase,
    subItems: [
      { label: 'GIÁ VÉ RẠP', path: '/staff/ticket-prices', icon: Tag },
      { label: 'GIÁ PHIM TRỰC TUYẾN', path: '/staff/online-ticket-prices', icon: Globe },
      { label: 'QUẢN LÍ VÉ TRỰC TUYẾN', path: '/staff/online-tickets', icon: MonitorPlay },
      { label: 'QUẢN LÍ COMBO', path: '/staff/combo', icon: Coffee },
      { label: 'QUẢN LÍ ƯU ĐÃI', path: '/staff/promotions', icon: Gift },
    ],
  },
  {
    label: 'QUẢN LÍ KHÁCH HÀNG',
    path: '/staff/customers',
    icon: Users,
  },
];

export default function StaffSidebar({ collapsed, onToggleCollapse }) {
  const location = useLocation();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [expandedNav, setExpandedNav] = useState('');
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  // Tự động mở menu group nếu có chứa subItem đang active
  useEffect(() => {
    const activeGroup = navItems.find(item => 
      item.subItems && item.subItems.some(sub => 
        sub.end 
          ? location.pathname === sub.path 
          : (location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'))
      )
    );
    if (activeGroup) {
      setExpandedNav(activeGroup.path);
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    // Lưu timestamp để AdminChatPage ẩn các cuộc trò chuyện cũ khi login lại
    localStorage.setItem('adminLogoutAt', new Date().toISOString());
    await logout();
    window.location.href = '/home';
  };

  // Theme tokens for sidebar
  const t = isDarkMode
    ? {
      sidebarBg: '#0c0c0c',
      sidebarBorder: 'rgba(255,255,255,0.06)',
      logoTextColor: '#ffffff',
      logoSubColor: 'rgba(255,255,255,0.4)',
      navItemColor: 'rgba(255,255,255,0.95)',
      navItemColorActive: '#dc2626',
      navItemBgActive: 'rgba(220,38,38,0.15)',
      navItemBgHover: 'rgba(255,255,255,0.08)',
      navItemColorHover: '#ffffff',
      navGroupBgActive: 'rgba(255,255,255,0.04)',
      subItemColor: 'rgba(255,255,255,0.5)',
      subItemColorActive: '#ffffff',
      subItemColorHover: 'rgba(255,255,255,0.8)',
      subItemBgActive: 'rgba(255,255,255,0.08)',
      subItemBgHover: 'rgba(255,255,255,0.04)',
      bottomBorder: 'rgba(255,255,255,0.06)',
      collapseToggleBorder: 'rgba(255,255,255,0.08)',
      collapseToggleBg: 'rgba(255,255,255,0.02)',
      collapseToggleColor: 'rgba(255,255,255,0.4)',
      collapseToggleBgHover: 'rgba(255,255,255,0.06)',
      collapseToggleColorHover: 'rgba(255,255,255,0.8)',
    }
    : {
      sidebarBg: '#ffffff',
      sidebarBorder: 'rgba(0,0,0,0.08)',
      logoTextColor: '#111111',
      logoSubColor: 'rgba(0,0,0,0.35)',
      navItemColor: 'rgba(0,0,0,0.9)',
      navItemColorActive: '#dc2626',
      navItemBgActive: 'rgba(220,38,38,0.15)',
      navItemBgHover: 'rgba(0,0,0,0.06)',
      navItemColorHover: '#000000',
      navGroupBgActive: 'rgba(220,38,38,0.05)',
      subItemColor: 'rgba(0,0,0,0.45)',
      subItemColorActive: '#dc2626',
      subItemColorHover: 'rgba(0,0,0,0.8)',
      subItemBgActive: 'rgba(220,38,38,0.12)',
      subItemBgHover: 'rgba(0,0,0,0.04)',
      bottomBorder: 'rgba(0,0,0,0.08)',
      collapseToggleBorder: 'rgba(0,0,0,0.1)',
      collapseToggleBg: 'rgba(0,0,0,0.03)',
      collapseToggleColor: 'rgba(0,0,0,0.4)',
      collapseToggleBgHover: 'rgba(0,0,0,0.08)',
      collapseToggleColorHover: 'rgba(0,0,0,0.8)',
    };

  return (
    <aside
      className={`admin-sidebar ${collapsed ? 'admin-sidebar--collapsed' : ''}`}
      style={{
        width: collapsed ? '72px' : '300px',
        minWidth: collapsed ? '72px' : '300px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: t.sidebarBg,
        borderRight: `1px solid ${t.sidebarBorder}`,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1), background 0.3s ease, border-color 0.3s ease',
        overflow: 'hidden',
        zIndex: 40,
      }}
    >
      {/* Logo Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: collapsed ? '20px 16px' : '20px 24px',
          height: '72px',
          borderBottom: `1px solid ${t.sidebarBorder}`,
          flexShrink: 0,
          transition: 'border-color 0.3s ease',
        }}
      >
        <img
          src={LOGO_URL}
          alt="RapLo Staff"
          style={{
            height: '36px',
            width: '36px',
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', whiteSpace: 'nowrap' }}>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: t.logoTextColor,
                fontFamily: '"Inter", sans-serif',
                transition: 'color 0.3s ease',
              }}
            >
              RAP
            </span>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: '#dc2626',
                fontFamily: '"Inter", sans-serif',
              }}
            >
              LOFILM
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.15em',
                color: t.logoSubColor,
                marginLeft: '6px',
                textTransform: 'uppercase',
                fontFamily: '"Inter", sans-serif',
                transition: 'color 0.3s ease',
              }}
            >
              STAFF
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: collapsed ? '16px 8px' : '16px 12px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          let isGroupActive = false;
          if (item.subItems) {
            isGroupActive = item.subItems.some(sub => 
              sub.end 
                ? location.pathname === sub.path 
                : (location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'))
            );
          }
          
          const isActive = item.end
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          const isExpanded = expandedNav === item.path;

          if (item.subItems) {
            return (
              <div key={item.path} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setExpandedNav(expandedNav === item.path ? '' : item.path)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: collapsed ? '12px 0' : '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    borderLeft: isExpanded ? '4px solid #dc2626' : '4px solid transparent',
                    background: 'transparent',
                    color: isExpanded ? t.navItemColorActive : t.navItemColor,
                    fontSize: '14px',
                    fontWeight: isExpanded ? 700 : 600,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: collapsed ? 'center' : 'flex-start', flex: 1, overflow: 'hidden' }}>
                    <Icon size={20} style={{ flexShrink: 0, color: isExpanded ? '#dc2626' : 'inherit' }} />
                    {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      size={14}
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        color: 'inherit',
                        flexShrink: 0,
                        marginLeft: '8px',
                      }}
                    />
                  )}
                </button>

                {isExpanded && !collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', marginTop: '2px' }}>
                    {item.subItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path;
                      const SubIcon = subItem.icon;
                      return (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 12px 10px 24px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: isSubActive ? 600 : 500,
                            color: isSubActive ? t.subItemColorActive : t.subItemColor,
                            background: isSubActive ? t.subItemBgActive : 'transparent',
                            borderLeft: '3px solid transparent',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.background = t.subItemBgHover;
                              e.currentTarget.style.color = t.subItemColorHover;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = t.subItemColor;
                            }
                          }}
                        >
                          {SubIcon && <SubIcon size={16} style={{ flexShrink: 0, color: isSubActive ? t.subItemColorActive : 'inherit' }} />}
                          {subItem.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '12px 0' : '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 600,
                textTransform: 'uppercase',
                color: isActive ? t.navItemColorActive : t.navItemColor,
                background: isActive ? t.navItemBgActive : 'transparent',
                borderLeft: isActive ? '4px solid #dc2626' : '4px solid transparent',
                marginBottom: '8px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                position: 'relative',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = t.navItemBgHover;
                  e.currentTarget.style.color = t.navItemColorHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = t.navItemColor;
                }
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon
                  size={20}
                  style={{
                    color: isActive ? '#dc2626' : 'inherit',
                  }}
                />
              </div>
              {!collapsed && (
                <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', letterSpacing: '0.05em' }}>
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: collapsed ? '16px 8px' : '16px 12px',
          borderTop: `1px solid ${t.bottomBorder}`,
          flexShrink: 0,
          transition: 'border-color 0.3s ease',
        }}
      >

        {/* Sign Out */}
        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? 'Đăng xuất' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: collapsed ? '12px 16px' : '12px 16px',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: '#dc2626',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            justifyContent: collapsed ? 'center' : 'flex-start',
            fontFamily: '"Inter", sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(220,38,38,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={20} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Đăng xuất</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: '8px',
            border: `1px solid ${t.collapseToggleBorder}`,
            background: t.collapseToggleBg,
            color: t.collapseToggleColor,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginTop: '4px',
            fontFamily: '"Inter", sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = t.collapseToggleBgHover;
            e.currentTarget.style.color = t.collapseToggleColorHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = t.collapseToggleBg;
            e.currentTarget.style.color = t.collapseToggleColor;
          }}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
