import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../user/store/authStore';
import useNotificationStore from '../../../shared/store/notificationStore';
import useThemeStore from '../../../shared/store/themeStore';


const pageTitles = {
  '/admin': 'DOANH THU VÉ TẠI RẠP',
  '/admin/revenue/online': 'DOANH THU TRỰC TUYẾN',
  '/admin/combo/revenue': 'DOANH THU COMBO',
  '/admin/reports': 'QUẢN LÍ BÁO CÁO',
  '/admin/customers': 'QUẢN LÍ NGƯỜI DÙNG',
  '/admin/movies': 'QUẢN LÍ PHIM',
  '/admin/employees': 'QUẢN LÍ NHÂN VIÊN',
  '/admin/theaters': 'QUẢN LÍ RẠP',
  '/admin/combo': 'QUẢN LÍ COMBO',
  '/admin/promotions': 'QUẢN LÍ ƯU ĐÃI',
  '/admin/ticket-prices': 'QUẢN LÍ GIÁ VÉ',
  '/admin/showtimes': 'QUẢN LÍ SUẤT CHIẾU',
  '/admin/online-tickets': 'QUẢN LÍ VÉ TRỰC TUYẾN',
  '/admin/online-ticket-prices': 'QUẢN LÍ GIÁ PHIM TRỰC TUYẾN',
  '/admin/movie-formats': 'QUẢN LÍ ĐỊNH DẠNG CHIẾU',
  '/admin/chat': 'CHAT CSKH',
  '/admin/system-activity': 'NHẬT KÝ HỆ THỐNG',
  '/admin/system-configs': 'CẤU HÌNH HỆ THỐNG',
  '/admin/membership-tiers': 'HẠNG THÀNH VIÊN',
};

function getInitials(fullName) {
  if (!fullName) return 'A';
  const parts = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'A';
}

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return `${Math.max(0, seconds)} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

export default function AdminHeader() {
  const location = useLocation();
  const isStaff = location.pathname.startsWith('/staff');
  const user = useAuthStore((state) => state.user);
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const notifRef = useRef(null);

  const { isDarkMode, toggleTheme } = useThemeStore();

  const pageTitle = pageTitles[location.pathname] || (isStaff ? 'Staff' : 'Admin');

  const displayName = useMemo(() => {
    return (
      user?.fullName ||
      user?.name ||
      (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null) ||
      user?.firstName ||
      user?.username ||
      'Admin'
    );
  }, [user]);

  const userInitials = useMemo(() => getInitials(displayName), [displayName]);

  const navigate = useNavigate();
  const allNotifications = useNotificationStore(state => state.notifications);
  const notifications = allNotifications;
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead);

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      setNotifOpen(false);
      if (notif.link === '/profile') {
        navigate('/admin/system-activity');
      } else {
        navigate(notif.link);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme tokens
  const t = isDarkMode
    ? {
        headerBg: '#0c0c0c',
        headerBorder: 'rgba(255,255,255,0.06)',
        titleColor: '#ffffff',
        iconColor: 'rgba(255,255,255,0.7)',
        iconColorHover: '#ffffff',
        iconBgHover: 'rgba(255,255,255,0.06)',
        separatorBg: 'rgba(255,255,255,0.08)',
        nameColor: '#fff',
        dropdownBg: '#1a1a1a',
        dropdownBorder: 'rgba(255,255,255,0.08)',
        dropdownShadow: '0 24px 50px rgba(0,0,0,0.6)',
        dropdownHeaderBorder: 'rgba(255,255,255,0.06)',
        dropdownTitleColor: '#fff',
        markReadColor: 'rgba(255,255,255,0.6)',
        markReadColorHover: '#fff',
        notifItemBorder: 'rgba(255,255,255,0.04)',
        notifUnreadBg: 'rgba(255,255,255,0.02)',
        notifHoverBg: 'rgba(255,255,255,0.04)',
        notifTitleColor: '#fff',
        notifTitleReadColor: 'rgba(255,255,255,0.6)',
        notifMsgColor: 'rgba(255,255,255,0.8)',
        notifMsgReadColor: 'rgba(255,255,255,0.5)',
        notifTimeColor: 'rgba(255,255,255,0.3)',
        emptyTextColor: 'rgba(255,255,255,0.6)',
        toggleBg: 'rgba(255,255,255,0.06)',
        toggleBorder: 'rgba(255,255,255,0.12)',
        toggleKnobBg: '#dc2626',
        toggleColor: '#fff',
      }
    : {
        headerBg: '#ffffff',
        headerBorder: 'rgba(0,0,0,0.08)',
        titleColor: '#111111',
        iconColor: '#374151',
        iconColorHover: '#111827',
        iconBgHover: 'rgba(0,0,0,0.06)',
        separatorBg: 'rgba(0,0,0,0.1)',
        nameColor: '#111',
        dropdownBg: '#ffffff',
        dropdownBorder: 'rgba(0,0,0,0.1)',
        dropdownShadow: '0 24px 50px rgba(0,0,0,0.15)',
        dropdownHeaderBorder: 'rgba(0,0,0,0.06)',
        dropdownTitleColor: '#111',
        markReadColor: 'rgba(0,0,0,0.5)',
        markReadColorHover: '#111',
        notifItemBorder: '#f3f4f6',
        notifUnreadBg: '#f9fafb',
        notifHoverBg: '#f9fafb',
        notifTitleColor: '#111827',
        notifTitleReadColor: '#6b7280',
        notifMsgColor: '#4b5563',
        notifMsgReadColor: '#9ca3af',
        notifTimeColor: '#9ca3af',
        emptyTextColor: '#6b7280',
        toggleBg: 'rgba(0,0,0,0.06)',
        toggleBorder: 'rgba(0,0,0,0.12)',
        toggleKnobBg: '#dc2626',
        toggleColor: '#333',
      };

  return (
    <header
      style={{
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        background: t.headerBg,
        borderBottom: `1px solid ${t.headerBorder}`,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Left - Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: t.titleColor,
            margin: 0,
            fontFamily: '"Inter", sans-serif',
            transition: 'color 0.3s ease',
          }}
        >
          {pageTitle}
        </h1>
      </div>

      {/* Right - Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Light/Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: `1px solid ${t.toggleBorder}`,
            background: t.toggleBg,
            color: isDarkMode ? 'rgba(255,200,50,0.9)' : 'rgba(0,0,0,0.5)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDarkMode ? 'rgba(255,200,50,0.12)' : 'rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = t.toggleBg;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: 'none',
              background: notifOpen ? t.iconBgHover : 'transparent',
              color: notifOpen ? t.iconColorHover : t.iconColor,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = t.iconBgHover;
              e.currentTarget.style.color = t.iconColorHover;
            }}
            onMouseLeave={(e) => {
              if (!notifOpen) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = t.iconColor;
              }
            }}
            title="Thông báo"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                className="!text-white"
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  borderRadius: '9px',
                  background: '#ff3344',
                  boxShadow: '0 0 8px rgba(255,51,68,0.5)',
                  fontSize: '10px',
                  fontWeight: '800',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1.5px solid ${isDarkMode ? '#0c0c0c' : '#ffffff'}`,
                  lineHeight: '1',
                  boxSizing: 'border-box'
                }}
              >
                <span className="!text-white" style={{ color: '#ffffff' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '8px',
                width: '340px',
                background: t.dropdownBg,
                border: `1px solid ${t.dropdownBorder}`,
                borderRadius: '16px',
                boxShadow: t.dropdownShadow,
                overflow: 'hidden',
                zIndex: 100,
                transition: 'background 0.3s ease',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: `1px solid ${t.dropdownHeaderBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700, color: t.dropdownTitleColor }}>
                  Thông báo
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead()}
                      style={{ fontSize: '11px', fontWeight: 600, color: t.markReadColor, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = t.markReadColorHover}
                      onMouseLeave={(e) => e.currentTarget.style.color = t.markReadColor}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#dc2626',
                        background: 'rgba(220,38,38,0.1)',
                        padding: '3px 8px',
                        borderRadius: '20px',
                      }}
                    >
                      {unreadCount} mới
                    </span>
                  )}
                </div>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: '13px', color: t.emptyTextColor }}>
                    Không có thông báo nào
                  </div>
                ) : (
                  notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: `1px solid ${t.notifItemBorder}`,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      background: !n.isRead ? t.notifUnreadBg : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = t.notifHoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = !n.isRead ? t.notifUnreadBg : 'transparent';
                    }}
                  >
                    {!n.isRead && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#dc2626',
                          marginTop: '6px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, width: '100%' }}>
                      <p
                        style={{
                          fontSize: '13px',
                          color: !n.isRead ? t.notifTitleColor : t.notifTitleReadColor,
                          margin: 0,
                          lineHeight: 1.5,
                          fontWeight: !n.isRead ? 600 : 400,
                        }}
                      >
                        {n.title}
                      </p>
                      <p style={{ fontSize: '12px', color: !n.isRead ? t.notifMsgColor : t.notifMsgReadColor, margin: '4px 0 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '11px', color: t.notifTimeColor, marginTop: '6px', display: 'block' }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div
          style={{
            width: '1px',
            height: '28px',
            background: t.separatorBg,
            margin: '0 8px',
            transition: 'background 0.3s ease',
          }}
        />

        {/* Admin Profile */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 8px 4px 4px',
              borderRadius: '12px',
              background: 'transparent',
              cursor: 'default',
            }}
          >
            {/* Avatar */}
            {user?.picture || user?.avatarUrl || user?.avatar ? (
              !avatarError ? (
                <img
                  src={user.picture || user.avatarUrl || user.avatar}
                  alt={displayName}
                  onError={() => setAvatarError(true)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    border: '2px solid rgba(220,38,38,0.3)',
                  }}
                />
              ) : (
                <span
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #dc2626, #ff4f72)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 800,
                    fontFamily: '"Inter", sans-serif',
                    border: '2px solid rgba(220,38,38,0.3)',
                  }}
                >
                  {userInitials}
                </span>
              )
            ) : (
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #dc2626, #ff4f72)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 800,
                  fontFamily: '"Inter", sans-serif',
                  border: '2px solid rgba(220,38,38,0.3)',
                }}
              >
                {userInitials}
              </span>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: t.nameColor, whiteSpace: 'nowrap', transition: 'color 0.3s ease' }}>
                {displayName}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#dc2626',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {isStaff ? 'Staff' : 'Admin'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
