import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../../api/services/authService';
import { getRawMovies, searchMovies } from '../../api/services/movieService';
import { getAllGenres } from '../../api/services/genreService';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import BrandLogo from './BrandLogo';
import useNotificationStore from '../../../../shared/store/notificationStore';
import { renderBoldText } from '../../../../shared/utils/textUtils';
import {
  getMembershipClass,
  getMembershipTier,
} from '../../../../shared/constants/membership';
import { useMembershipStore } from '../../../../shared/store/membershipStore';

const MovieFilterPanel = lazy(() => import('./MovieFilterPanel'));

const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return false;

  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return savedTheme === 'dark' || (!savedTheme && prefersDark);
};

function getInitials(fullName) {
  if (!fullName) return 'U';
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U';
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

export default function Header({ isMoviePanelOpen }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = (e) => {
    if (e) e.stopPropagation();
    const newMode = !isDarkMode;
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    setIsDarkMode(newMode);
  };
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const navRef = useRef(null);
  const [searchWidth, setSearchWidth] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMoviesOpen, setMobileMoviesOpen] = useState(false);
  const [mobileCinemasOpen, setMobileCinemasOpen] = useState(false);
  const [mobileGenresOpen, setMobileGenresOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const wrapperRef = useRef(null);
  const controlled = typeof isMoviePanelOpen === 'boolean';
  const isOpen = controlled ? isMoviePanelOpen : internalOpen;
  const user = useAuthStore((state) => state.user);
  const membershipTiers = useMembershipStore((state) => state.tiers);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasActiveSession = Boolean(isAuthenticated || user || accessToken);

  useEffect(() => {
    const calculateWidth = () => {
      if (isSearchOpen && searchContainerRef.current) {
        if (window.innerWidth >= 1024 && navRef.current) {
          const navRect = navRef.current.getBoundingClientRect();
          const containerRect = searchContainerRef.current.parentElement.getBoundingClientRect();
          const desiredWidth = containerRect.right - navRect.left;
          setSearchWidth(desiredWidth);
        } else {
          setSearchWidth(null);
        }
      } else {
        // Reset width when closed so animation reverses smoothly
        setSearchWidth(null);
      }
    };

    // Slight delay to allow DOM to settle if login state just changed
    setTimeout(calculateWidth, 10);

    window.addEventListener('resize', calculateWidth);
    return () => window.removeEventListener('resize', calculateWidth);
  }, [isSearchOpen, hasActiveSession]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await searchMovies(query);

        let processedResults = [];
        data.forEach(movie => {
          if (movie.isCinemaAvailable) {
            processedResults.push({ ...movie, type: 'cinema' });
          }
          if (movie.isOnlineAvailable) {
            processedResults.push({ ...movie, type: 'online' });
          }
        });

        setSearchResults(processedResults);
      } catch (error) {
        console.error("Lỗi tìm kiếm", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const [popularMovies, setPopularMovies] = useState([]);

  useEffect(() => {
    if (isSearchOpen && popularMovies.length === 0) {
      // Dùng fetch trực tiếp để lấy data gốc đồng nhất với API search
      getRawMovies({ status: 'NOW_SHOWING' })
        .then(data => {
          // Gán thêm type cinema để Badge hoạt động đúng
          const processed = data.slice(0, 5).map(m => ({ ...m, type: 'cinema' }));
          setPopularMovies(processed);
        })
        .catch(console.error);
    }
  }, [isSearchOpen, popularMovies.length]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const glowRef1 = useRef(null);
  const glowRef2 = useRef(null);
  const isHoveringRef = useRef(false);
  const timeRef = useRef(0);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!showLogoutConfirm) return;

    const animate = () => {
      timeRef.current += 0.015;
      if (!isHoveringRef.current && glowRef1.current && glowRef2.current) {
        const offsetX1 = Math.sin(timeRef.current) * 80;
        const offsetY1 = Math.cos(timeRef.current) * 80;
        const offsetX2 = Math.cos(timeRef.current * 0.8) * 100;
        const offsetY2 = Math.sin(timeRef.current * 0.8) * 100;

        glowRef1.current.style.transform = `translate(${offsetX1}px, ${offsetY1}px)`;
        glowRef2.current.style.transform = `translate(${offsetX2}px, ${offsetY2}px)`;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [showLogoutConfirm]);

  const handleModalMouseMove = (e) => {
    if (!glowRef1.current || !glowRef2.current) return;
    isHoveringRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    glowRef1.current.style.transform = `translate(${(x - centerX) / 3}px, ${(y - centerY) / 3}px)`;
    glowRef2.current.style.transform = `translate(${-(x - centerX) / 4}px, ${-(y - centerY) / 4}px)`;
  };

  const handleModalMouseLeave = () => {
    isHoveringRef.current = false;
  };

  const allNotifications = useNotificationStore(state => state.notifications);
  const notifications = allNotifications;
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    if (notif.link && !notif.link.includes('autoReview=true') && notif.title !== "Nhắc nhở đánh giá phim") {
      setNotificationsOpen(false);
      navigate(notif.link);
    }
  };

  const userInitials = useMemo(() => {
    const nameStr = user?.fullName || user?.name ||
      (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null) ||
      user?.firstName || user?.username || user?.email;
    return getInitials(nameStr);
  }, [user]);
  const displayName =
    user?.fullName ||
    user?.name ||
    (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : null) ||
    user?.firstName ||
    user?.username ||
    user?.email ||
    'Tài khoản GinFilm';
  const membershipTier = useMemo(
    () => getMembershipTier(user?.memberPoints, membershipTiers, user?.membershipTier),
    [user?.memberPoints, user?.membershipTier, membershipTiers],
  );
  const membershipClass = getMembershipClass(membershipTier.level);

  const closePanel = () => {
    if (!controlled) {
      setInternalOpen(false);
    }
  };

  const handleLogoutClick = () => {
    setProfileOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    showToast('Đăng xuất thành công!', 'success');
    navigate('/home');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target) && !controlled) {
        setInternalOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (!controlled) {
          setInternalOpen(false);
        }
        setProfileOpen(false);
        setNotificationsOpen(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [controlled]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      // Close dropdowns on scroll
      if (Math.abs(currentY - lastScrollY.current) > 10) {
        setNotificationsOpen(false);
        setProfileOpen(false);
        setIsSearchOpen(false);
      }

      if (currentY > 80) {
        if (currentY > lastScrollY.current + 10) {
          setIsHeaderVisible(false);
        } else if (currentY < lastScrollY.current - 10) {
          setIsHeaderVisible(true);
        }
      } else {
        setIsHeaderVisible(true);
      }

      if (currentY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch genre list for dropdown
  const [genresList, setGenresList] = useState([]);
  useEffect(() => {
    getAllGenres()
      .then((data) => setGenresList(data))
      .catch((err) => console.error('Failed to load genres', err));
  }, []);

  return (
    <>
      <div
        ref={wrapperRef}
        className={`sticky top-0 z-50 transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
      >
        <header className={`w-full border-b border-gray-200 dark:border-white/10 transition-all duration-300 ${isScrolled ? 'bg-white/95 dark:bg-black/95 backdrop-blur-sm shadow-md dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]' : ((pathname === '/' || pathname === '/home') ? 'dark bg-transparent' : 'bg-transparent')}`}>
          <div className="mx-auto grid grid-cols-[1fr_auto_1fr] h-[64px] max-w-[1440px] items-center px-4 md:px-8 relative w-full gap-2 xl:gap-4">
            {/* Hamburger Menu Toggle (Mobile only) - LEFT */}
            <div className="flex lg:hidden items-center">
              <button
                className="flex items-center justify-center p-1 text-[#111827] dark:text-[#9D9D9D] hover:text-[#e61a27] dark:hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="material-symbols-outlined text-[28px]">
                  {mobileMenuOpen ? 'close' : 'menu'}
                </span>
              </button>
            </div>

            {/* LOGO - CENTER on mobile, LEFT on desktop */}
            <div className="flex justify-center lg:justify-start items-center gap-2 lg:gap-3 xl:gap-4 shrink-0 px-2">
              <BrandLogo to="/home" />
              <button
                onClick={() => navigate('/movies/now-showing')}
                title="Đặt vé ngay"
                className="relative z-50 group hidden lg:flex flex-none -translate-y-1 cursor-pointer"
              >
                <div className="relative w-[100px] h-[46px]">
                  {/* Vé sau (Nghiêng - Chữ FILM) - Màu Vàng */}
                  <div className="absolute -top-[2px] right-[2px] w-[86px] h-[28px] bg-[#eab308] -rotate-[14deg] origin-bottom-right rounded-[2px] flex items-center justify-center transition-transform duration-300 group-hover:-rotate-[20deg]"
                    style={{
                      WebkitMask: 'radial-gradient(circle at 0 50%, transparent 3px, black 3.5px) 0 0/51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 3px, black 3.5px) 100% 0/51% 100% no-repeat',
                      mask: 'radial-gradient(circle at 0 50%, transparent 3px, black 3.5px) 0 0/51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 3px, black 3.5px) 100% 0/51% 100% no-repeat'
                    }}
                  >
                    {/* Mã vạch giả */}
                    <div className="absolute left-[5px] top-1 bottom-1 w-[8px] border-x border-dashed border-[#131313]/30"></div>
                    <div className="absolute right-[5px] top-1 bottom-1 w-[8px] border-x border-dashed border-[#131313]/30"></div>
                    <span className="text-[#131313]/95 text-[10px] font-black tracking-[0.15em] uppercase ml-1">FILM</span>
                  </div>

                  {/* Vé trước (Thẳng - ĐẶT VÉ NGAY) */}
                  <div className="absolute bottom-0 left-0 w-full h-[30px] bg-[#e61a27] rounded-[2px] shadow-[0_4px_10px_rgba(230,26,39,0.5)] flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
                    style={{
                      WebkitMask: 'radial-gradient(circle at 0 50%, transparent 4px, black 4.5px) 0 0/51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 4px, black 4.5px) 100% 0/51% 100% no-repeat',
                      mask: 'radial-gradient(circle at 0 50%, transparent 4px, black 4.5px) 0 0/51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 4px, black 4.5px) 100% 0/51% 100% no-repeat'
                    }}
                  >
                    <span className="text-white font-black text-[10px] tracking-wide uppercase mt-[1px]">ĐẶT VÉ NGAY</span>
                  </div>
                </div>
              </button>
            </div>

            <nav ref={navRef} className={`hidden items-center justify-center lg:flex h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] w-full gap-2 xl:gap-3 ${isSearchOpen ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
              <div className="h-full flex items-center gap-2 lg:gap-2 xl:gap-3">
                {/* PHIM Dropdown */}
                <div className="group relative h-full flex items-center">
                  <button className={`relative flex items-center gap-0.5 text-[12px] xl:text-[13px] font-bold uppercase tracking-wider transition-colors dark:group-hover:text-white whitespace-nowrap ${(pathname.startsWith('/movies') && !pathname.startsWith('/movies/online')) ? 'text-[#e61a27] dark:text-white' : 'text-[#111827] dark:text-[#9D9D9D]'}`}>
                    PHIM
                    <span className="select-none material-symbols-outlined text-[15px] xl:text-[16px] transition-transform duration-300 group-hover:rotate-180 shrink-0 whitespace-nowrap">expand_more</span>
                  </button>
                  {/* Glowing Line Effect */}
                  <span className={`absolute -bottom-[1px] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#e61a27] to-transparent transition-opacity duration-300 group-hover:opacity-100 shadow-[0_0_12px_rgba(230,26,39,1)] pointer-events-none rounded-full ${(pathname.startsWith('/movies') && !pathname.startsWith('/movies/online')) ? 'opacity-100' : 'opacity-0'}`}></span>
                  <div
                    className="absolute left-0 top-full mt-[-8px] hidden w-max min-w-[160px] flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] shadow-lg dark:shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-hidden origin-top-left animate-in fade-in zoom-in-95 duration-200 group-hover:flex py-2 px-1"
                  >
                    <Link to="/movies/now-showing" className="block w-full text-left px-4 py-2.5 text-[15px] font-medium text-[#111827] dark:text-[#9D9D9D] transition-all hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#e50914] dark:hover:text-[#e50914] whitespace-nowrap rounded-lg">Phim Đang Chiếu</Link>
                    <Link to="/movies/coming-soon" className="block w-full text-left px-4 py-2.5 text-[15px] font-medium text-[#111827] dark:text-[#9D9D9D] transition-all hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#e50914] dark:hover:text-[#e50914] whitespace-nowrap rounded-lg">Phim Sắp Chiếu</Link>
                  </div>
                </div>

                {/* RẠP Dropdown */}
                <div className="group relative h-full flex items-center">
                  <button className={`relative flex items-center gap-0.5 text-[12px] xl:text-[13px] font-bold uppercase tracking-wider transition-colors dark:group-hover:text-white whitespace-nowrap ${pathname.startsWith('/cinemas') ? 'text-[#e61a27] dark:text-white' : 'text-[#111827] dark:text-[#9D9D9D]'}`}>
                    RẠP
                    <span className="select-none material-symbols-outlined text-[15px] xl:text-[16px] transition-transform duration-300 group-hover:rotate-180 shrink-0 whitespace-nowrap">expand_more</span>
                  </button>
                  {/* Glowing Line Effect */}
                  <span className={`absolute -bottom-[1px] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#e61a27] to-transparent transition-opacity duration-300 group-hover:opacity-100 shadow-[0_0_12px_rgba(230,26,39,1)] pointer-events-none rounded-full ${pathname.startsWith('/cinemas') ? 'opacity-100' : 'opacity-0'}`}></span>
                  <div
                    className="absolute left-0 top-full mt-[-8px] hidden w-max min-w-[160px] flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] shadow-lg dark:shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-hidden origin-top-left animate-in fade-in zoom-in-95 duration-200 group-hover:flex py-2 px-1"
                  >
                    <button onClick={() => { sessionStorage.removeItem('cinemas_selectedCinema'); sessionStorage.removeItem('cinemas_selectedDate'); localStorage.removeItem('cinemas_activeProvinceId'); navigate('/cinemas/all'); }} className="block w-full text-left px-4 py-2.5 text-[15px] font-medium text-[#111827] dark:text-[#9D9D9D] transition-all hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#e50914] dark:hover:text-[#e50914] whitespace-nowrap rounded-lg">Tất Cả Các Rạp</button>
                    <button onClick={() => { sessionStorage.removeItem('cinemas_selectedCinema'); sessionStorage.removeItem('cinemas_selectedDate'); localStorage.removeItem('cinemas_activeProvinceId'); navigate('/cinemas/lorap'); }} className="block w-full text-left px-4 py-2.5 text-[15px] font-medium text-[#111827] dark:text-[#9D9D9D] transition-all hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#e50914] dark:hover:text-[#e50914] whitespace-nowrap rounded-lg">LORAP</button>
                    <button onClick={() => { sessionStorage.removeItem('cinemas_selectedCinema'); sessionStorage.removeItem('cinemas_selectedDate'); localStorage.removeItem('cinemas_activeProvinceId'); navigate('/cinemas/lobed'); }} className="block w-full text-left px-4 py-2.5 text-[15px] font-medium text-[#111827] dark:text-[#9D9D9D] transition-all hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#e50914] dark:hover:text-[#e50914] whitespace-nowrap rounded-lg">LOBED</button>
                    <button onClick={() => { sessionStorage.removeItem('cinemas_selectedCinema'); sessionStorage.removeItem('cinemas_selectedDate'); localStorage.removeItem('cinemas_activeProvinceId'); navigate('/cinemas/loscreenx'); }} className="block w-full text-left px-4 py-2.5 text-[15px] font-medium text-[#111827] dark:text-[#9D9D9D] transition-all hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#e50914] dark:hover:text-[#e50914] whitespace-nowrap rounded-lg">LOSCREENX</button>
                  </div>
                </div>

                {/* THỂ LOẠI Dropdown */}
                <div className="group relative h-full flex items-center">
                  <button className={`relative flex items-center gap-0.5 text-[12px] xl:text-[13px] font-bold uppercase tracking-wider transition-colors dark:group-hover:text-white whitespace-nowrap ${pathname.startsWith('/genres') ? 'text-[#e61a27] dark:text-white' : 'text-[#111827] dark:text-[#9D9D9D]'}`}>
                    THỂ LOẠI
                    <span className="select-none material-symbols-outlined text-[15px] xl:text-[16px] transition-transform duration-300 group-hover:rotate-180 shrink-0 whitespace-nowrap">expand_more</span>
                  </button>
                  {/* Glowing Line Effect */}
                  <span className={`absolute -bottom-[1px] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#e61a27] to-transparent transition-opacity duration-300 group-hover:opacity-100 shadow-[0_0_12px_rgba(230,26,39,1)] pointer-events-none rounded-full ${pathname.startsWith('/genres') ? 'opacity-100' : 'opacity-0'}`}></span>
                  <div
                    className="absolute left-0 top-full mt-[-8px] hidden w-max flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] shadow-lg dark:shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-hidden origin-top-left animate-in fade-in zoom-in-95 duration-200 group-hover:flex py-3 px-1"
                  >
                    <div className="grid grid-cols-2">
                      {/* Genres dynamically rendered */}
                      {genresList.map((g) => (
                        <Link
                          key={g.id}
                          to={`/genres/${g.id}`}
                          className="px-4 py-2.5 text-[15px] font-medium text-[#111827] dark:text-[#9D9D9D] transition-all hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#e50914] dark:hover:text-[#e50914] rounded-lg"
                        >
                          {g.name}
                        </Link>
                      ))}

                    </div>
                  </div>
                </div>
                {/* PHIM TRỰC TUYẾN Dropdown */}
                <div className="group relative h-full flex items-center">
                  <Link to="/movies/online" className={`relative flex items-center gap-1 text-[12px] xl:text-[13px] font-bold uppercase tracking-wider transition-colors dark:group-hover:text-white whitespace-nowrap ${pathname === '/movies/online' ? 'text-[#e61a27] dark:text-white' : 'text-[#111827] dark:text-[#9D9D9D]'}`}>
                    PHIM TRỰC TUYẾN
                  </Link>
                  {/* Glowing Line Effect */}
                  <span className={`absolute -bottom-[1px] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#e61a27] to-transparent transition-opacity duration-300 group-hover:opacity-100 shadow-[0_0_12px_rgba(230,26,39,1)] pointer-events-none rounded-full ${pathname === '/movies/online' ? 'opacity-100' : 'opacity-0'}`}></span>
                </div>

                {/* GIÁ VÉ & ƯU ĐÃI */}
                <div className="group relative h-full flex items-center">
                  <Link to="/offers" className={`relative text-[12px] xl:text-[13px] font-bold uppercase tracking-wider transition-colors dark:group-hover:text-white whitespace-nowrap ${pathname.startsWith('/offers') ? 'text-[#e61a27] dark:text-white' : 'text-[#111827] dark:text-[#9D9D9D]'}`}>
                    GIÁ VÉ & ƯU ĐÃI
                  </Link>
                  {/* Glowing Line Effect */}
                  <span className={`absolute -bottom-[1px] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#e61a27] to-transparent transition-opacity duration-300 group-hover:opacity-100 shadow-[0_0_12px_rgba(230,26,39,1)] pointer-events-none rounded-full ${pathname.startsWith('/offers') ? 'opacity-100' : 'opacity-0'}`}></span>
                </div>

                {/* BẢNG XẾP HẠNG */}
                <div className="group relative hidden h-full items-center 2xl:flex">
                  <Link to="/leaderboard" className={`relative flex items-center gap-1 text-[12px] xl:text-[13px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${pathname === '/leaderboard' ? 'text-[#e61a27] dark:text-white' : 'text-[#111827] dark:text-[#9D9D9D] group-hover:text-[#e61a27] dark:group-hover:text-white'}`}>
                    <span className="material-symbols-outlined text-[16px] xl:text-[17px] text-[#e61a27]">trophy</span>
                    TOP KHÁCH HÀNG
                  </Link>
                  <span className={`absolute -bottom-[1px] left-0 h-[2px] w-full rounded-full bg-gradient-to-r from-transparent via-[#e61a27] to-transparent shadow-[0_0_12px_rgba(230,26,39,1)] transition-opacity duration-300 group-hover:opacity-100 ${pathname === '/leaderboard' ? 'opacity-100' : 'opacity-0'}`}></span>
                </div>
              </div>


            </nav>

            <div className={`flex items-center justify-end gap-1.5 lg:gap-2 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 min-w-0`}>

              {/* Search Box Wrapper */}
              <div className={`flex relative h-[36px] w-[36px] shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-50`}>
                {/* Animated Search Box */}
                <div
                  ref={searchContainerRef}
                  style={searchWidth && isSearchOpen ? { width: `${searchWidth}px` } : {}}
                  className={`absolute right-0 top-0 flex items-center h-[36px] rounded-[8px] border overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] origin-right z-50 ${isSearchOpen
                    ? 'w-[250px] sm:w-[350px] md:w-[450px] lg:w-[550px] xl:w-[710px] min-[1440px]:w-[790px] bg-white/95 dark:bg-[#18181b]/95 border-gray-200 dark:border-white/20 shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl'
                    : 'w-[36px] bg-transparent border-transparent hover:bg-gray-200 dark:hover:bg-white/5'
                    }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 flex w-[36px] items-center justify-center pointer-events-none transition-colors ${isSearchOpen ? 'opacity-100 text-gray-400' : 'opacity-0'}`}>
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Tìm kiếm phim, rạp..."
                    className={`absolute left-[36px] w-[calc(100%-72px)] h-full bg-transparent text-[13px] text-[#111827] dark:text-white placeholder-gray-500 dark:placeholder-[#8a8a8e] outline-none transition-opacity duration-300 ${isSearchOpen ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'
                      }`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSearchOpen) {
                        setIsSearchOpen(true);
                        setTimeout(() => searchInputRef.current?.focus(), 100);
                      } else {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    className={`absolute right-0 top-0 bottom-0 flex w-[36px] items-center justify-center transition-colors cursor-pointer ${isSearchOpen ? 'text-gray-400 hover:text-[#e61a27]' : 'text-[#111827] dark:text-[#9D9D9D] hover:text-[#e61a27] dark:hover:text-white'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{isSearchOpen ? 'close' : 'search'}</span>
                  </button>
                </div>

                {/* Search Dropdown */}
                {isSearchOpen && searchQuery.trim() && (
                  <div
                    style={searchWidth && isSearchOpen ? { width: `${searchWidth}px` } : {}}
                    className={`absolute top-[calc(100%+8px)] right-0 w-[250px] sm:w-[350px] md:w-[450px] lg:w-[550px] xl:w-[710px] min-[1440px]:w-[790px] bg-white/98 dark:bg-[#18181b]/98 border border-gray-200 dark:border-white/20 rounded-xl shadow-lg dark:shadow-[0_24px_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200`}
                  >
                    <div className="p-3 border-b border-gray-200 dark:border-white/10">
                      <span className="text-[#111827] dark:text-[#9D9D9D] font-medium text-[13px] uppercase tracking-wider">Kết quả tìm kiếm</span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {isSearching ? (
                        <div className="p-8 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-[#e61a27] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <>
                          {searchResults.slice(0, 5).map((item) => (
                            <div
                              key={`${item.id}-${item.type}`}
                              className="flex items-center gap-4 p-4 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-200 dark:border-white/10 last:border-0 cursor-pointer group"
                              onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                                navigate(`/movie-details?id=${item.id}`);
                              }}
                            >
                              <img src={item.posterUrl} alt={item.title} className="w-[50px] h-[75px] object-cover rounded shadow-md shrink-0" />

                              {/* Left Content */}
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[#111827] dark:text-white font-extrabold text-[16px] truncate dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-[#e61a27] dark:group-hover:text-[#e61a27] transition-colors">
                                    {item.title}
                                  </span>
                                  {(item.status === 'NOW_SHOWING' || item.status === 'showing') ? (
                                    <span className="text-[12px] font-medium text-[#10b981] whitespace-nowrap bg-[#10b981]/10 px-1.5 py-0.5 rounded">Đang chiếu</span>
                                  ) : (item.status === 'COMING_SOON' || item.status === 'coming_soon' || item.status === 'upcoming' || item.status === 'UPCOMING') ? (
                                    <span className="text-[12px] font-medium text-[#f59e0b] whitespace-nowrap bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">Sắp chiếu</span>
                                  ) : null}
                                </div>

                                <div className="mt-1.5 flex items-center gap-2">
                                  {item.type === 'online' ? (
                                    <span className="bg-[#e61a27]/15 text-[#e61a27] border border-[#e61a27]/30 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(230,26,39,0.1)]">Phim trực tuyến</span>
                                  ) : (
                                    <span className="bg-[#0ea5e9]/15 text-[#0ea5e9] border border-[#0ea5e9]/30 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(14,165,233,0.1)]">Phim chiếu rạp</span>
                                  )}
                                </div>

                                {item.genres && item.genres.length > 0 && (
                                  <div className="text-[12px] text-[#9D9D9D] mt-1 truncate">
                                    {item.genres.map(g => g.name || g).join(', ')}
                                  </div>
                                )}
                              </div>

                              {/* Right Content */}
                              <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                                {item.averageRating > 0 && (
                                  <div className="flex items-center gap-1 bg-[#ffb400]/10 px-2 py-1 rounded-md">
                                    <span className="text-[13px] text-[#ffb400] font-bold">{item.averageRating.toFixed(1)}</span>
                                    <span className="material-symbols-outlined text-[14px] text-[#ffb400]">star</span>
                                  </div>
                                )}

                                {item.type === 'online' && item.onlinePrice ? (
                                  <div className="flex flex-col items-end mt-auto">
                                    {item.onlinePrice.promoActive ? (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] text-gray-500 line-through">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.onlinePrice.basePrice)}
                                          </span>
                                          <span className="text-[10px] bg-[#e61a27]/20 text-[#e61a27] px-1.5 py-0.5 rounded font-bold">
                                            -{item.onlinePrice.discountPercentage}%
                                          </span>
                                        </div>
                                        <span className="text-[15px] font-bold text-[#e61a27]">
                                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.onlinePrice.finalPrice)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-[16px] font-extrabold text-[#e61a27] mt-1">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.onlinePrice.basePrice)}
                                      </span>
                                    )}
                                  </div>
                                ) : item.type === 'cinema' ? (
                                  item.hasShowtimes ? (
                                    <button
                                      className="mt-auto px-4 py-1.5 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9] text-[12px] font-bold border border-[#0ea5e9]/20 group-hover:bg-[#0ea5e9] group-hover:text-white transition-colors whitespace-nowrap"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsSearchOpen(false);
                                        setSearchQuery('');
                                        navigate(`/movie-info?id=${item.id}`);
                                      }}
                                    >
                                      ĐẶT VÉ
                                    </button>
                                  ) : (
                                    <button
                                      className="mt-auto px-4 py-1.5 rounded-full bg-white/10 text-white text-[12px] font-bold border border-white/20 group-hover:bg-white group-hover:text-black transition-colors whitespace-nowrap"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsSearchOpen(false);
                                        setSearchQuery('');
                                        navigate(`/movie-details?id=${item.id}`);
                                      }}
                                    >
                                      XEM CHI TIẾT
                                    </button>
                                  )
                                ) : null}
                              </div>
                            </div>
                          ))}
                          {searchResults.length > 5 && (
                            <div
                              className="p-3 text-center border-t border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                              onClick={() => {
                                setIsSearchOpen(false);
                                navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                              }}
                            >
                              <span className="text-[14px] font-bold text-[#e61a27]">Xem tất cả {searchResults.length} kết quả</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-8 text-center text-[#8a8a8e] text-[14px]">Không tìm thấy phim phù hợp</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme Toggle Icon */}
              <button
                className="relative flex items-center justify-center w-[36px] h-[36px] text-gray-700 dark:text-[#9D9D9D] transition-colors hover:text-[#e61a27] dark:hover:text-white shrink-0 group"
                type="button"
                onClick={toggleTheme}
                title={isDarkMode ? "Bật đèn (Sáng)" : "Tắt đèn (Tối)"}
              >
                <span className={`material-symbols-outlined text-[22px] shrink-0 whitespace-nowrap transition-colors duration-300 ${!isDarkMode ? 'filled text-yellow-500' : 'text-gray-400 group-hover:text-yellow-400'}`}>
                  lightbulb
                </span>
              </button>

              {/* Notifications Icon */}
              <div className="relative shrink-0">
                <button
                  className="relative flex items-center justify-center w-[36px] h-[36px] text-gray-700 dark:text-[#9D9D9D] transition-colors hover:text-[#e61a27] dark:hover:text-white shrink-0"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasActiveSession) {
                      navigate('/login');
                      return;
                    }
                    setNotificationsOpen(!notificationsOpen);
                    setProfileOpen(false);
                  }}
                  title="Thông báo"
                >
                  <span className="material-symbols-outlined text-[22px] shrink-0 whitespace-nowrap text-gray-800 dark:text-gray-200">notifications</span>
                  {unreadCount > 0 && (
                    <span
                      className="absolute -right-1.5 -top-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#ff3344] px-1 text-[10px] font-extrabold !text-white leading-none shadow-[0_0_10px_rgba(255,51,68,0.6)] border border-white dark:border-[#111]"
                      style={{ color: '#ffffff' }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-[-60px] sm:right-auto sm:left-1/2 sm:-translate-x-[60%] top-full mt-4 w-[320px] sm:w-[360px] rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] shadow-lg dark:shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-hidden origin-top animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/[0.06] px-5 py-4">
                      <span className="text-[18px] font-bold text-[#111827] dark:text-white shrink-0 whitespace-nowrap">Thông báo</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => { if (unreadCount > 0) markAllAsRead(); }}
                          disabled={unreadCount === 0}
                          className={`text-[12px] font-semibold transition-colors whitespace-nowrap ${unreadCount > 0 ? 'text-gray-500 dark:text-[#9D9D9D] hover:text-[#111827] dark:hover:text-white' : 'text-gray-400 dark:text-[#444] cursor-not-allowed'}`}
                        >
                          Đánh dấu đã đọc
                        </button>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-[#ff3344]/10 px-2 py-0.5 text-[11px] font-bold text-[#ff3344] shrink-0 whitespace-nowrap">{unreadCount} mới</span>
                        )}
                      </div>
                    </div>
                    {/* List */}
                    <div className="flex max-h-[400px] flex-col overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-[14px] text-gray-500 dark:text-[#9D9D9D]">Không có thông báo nào</div>
                      ) : (
                        notifications.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`flex cursor-pointer gap-3 border-b border-gray-100 dark:border-white/[0.04] px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] ${!item.isRead ? 'bg-gray-50 dark:bg-white/[0.02]' : ''}`}
                          >
                            <div className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                              {!item.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[#e61a27]"></span>}
                            </div>
                            <div className="flex flex-col gap-1 w-full">
                              <p className={`text-[14px] ${!item.isRead ? 'font-bold text-[#111827] dark:text-white' : 'font-medium text-gray-500 dark:text-[#9D9D9D]'}`}>
                                {item.title}
                              </p>
                              <p className={`text-[13px] ${!item.isRead ? 'text-gray-600 dark:text-[#9D9D9D]' : 'text-gray-400 dark:text-[#8a8a8e]'} line-clamp-2`}>
                                {renderBoldText(item.message)}
                              </p>
                              <span className="text-[11px] text-gray-400 dark:text-[#8a8a8e] mt-1">
                                {timeAgo(item.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {/* Footer (Xem tất cả) */}
                    <div className="border-t border-white/[0.06] p-3 text-center">
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/notifications');
                        }}
                        className="text-[14px] font-bold text-[#e61a27] hover:text-[#ff3344] transition-colors inline-block w-full cursor-pointer"
                      >
                        Xem tất cả thông báo
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {hasActiveSession && (
                <Link
                  className="hidden lg:flex items-center gap-1 text-[#111827] dark:text-[#9D9D9D] transition-colors hover:text-[#e61a27] dark:hover:text-white whitespace-nowrap shrink-0"
                  to="/my-tickets"
                >
                  <div className="flex items-center justify-center w-[36px] h-[36px]">
                    <span className="material-symbols-outlined text-[22px] shrink-0 whitespace-nowrap">confirmation_number</span>
                  </div>
                  <span className="hidden xl:inline text-xs font-bold uppercase tracking-wider pr-2">
                    Vé của tôi
                  </span>
                </Link>
              )}

              {hasActiveSession ? (
                <div className="relative shrink-0">
                  <button
                    aria-expanded={profileOpen}
                    aria-haspopup="true"
                    className={`membership-header-avatar ${membershipClass} relative flex items-center gap-3 rounded-full bg-transparent p-1 text-left transition-all hover:opacity-95`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setProfileOpen((prev) => !prev);
                    }}
                    type="button"
                  >
                    {user?.picture || user?.avatarUrl || user?.avatar ? (
                      <img
                        src={user.picture || user.avatarUrl || user.avatar}
                        alt={displayName}
                        className="h-10 w-10 lg:h-11 lg:w-11 rounded-full object-cover shadow-[0_8px_18px_rgba(255,46,99,0.28)]"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span
                      className="flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff2e63,#ff7a9d)] text-sm font-black text-white shadow-[0_8px_18px_rgba(255,46,99,0.28)]"
                      style={{ display: (user?.picture || user?.avatarUrl || user?.avatar) ? 'none' : 'flex' }}
                    >
                      {userInitials}
                    </span>
                    <span className="membership-header-tier-label absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[8px] font-black leading-none">
                      {membershipTier.name}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className={`membership-profile-menu ${membershipClass} absolute right-0 mt-4 w-[280px] rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] text-[#111827] dark:text-white shadow-lg dark:shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-hidden origin-top-right animate-in fade-in zoom-in-95 duration-200`}>
                      {/* Header Info */}
                      <div className="flex flex-col border-b border-gray-200 dark:border-white/[0.06] p-4 pb-3">
                        <span className="text-[10px] font-bold tracking-[0.15em] text-gray-500 dark:text-[#8a8a8e] uppercase">Tài khoản</span>
                        <span className="mt-0.5 truncate text-[16px] font-black tracking-tight text-[#111827] dark:text-white capitalize">{displayName}</span>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="membership-tier-chip inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wider">
                            {membershipTier.name}
                          </span>
                          <span className="min-w-0 flex-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 truncate">
                            {membershipTier.description}
                          </span>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="flex flex-col p-1">
                        <Link
                          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-600 dark:text-[#9D9D9D] transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#111827] dark:hover:text-white"
                          onClick={() => setProfileOpen(false)}
                          to="/profile"
                        >
                          <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-110 group-hover:text-[#111827] dark:group-hover:text-white">person</span>
                          Hồ sơ cá nhân
                        </Link>

                        <Link
                          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-600 dark:text-[#9D9D9D] transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#111827] dark:hover:text-white"
                          onClick={() => setProfileOpen(false)}
                          to="/my-tickets"
                        >
                          <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-110 group-hover:text-[#111827] dark:group-hover:text-white">confirmation_number</span>
                          Vé của tôi
                        </Link>

                        <Link
                          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-600 dark:text-[#9D9D9D] transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#111827] dark:hover:text-white"
                          onClick={() => setProfileOpen(false)}
                          to="/history"
                        >
                          <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-110 group-hover:text-[#111827] dark:group-hover:text-white">history</span>
                          Lịch sử giao dịch
                        </Link>
                        <Link
                          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-600 dark:text-[#9D9D9D] transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-[#111827] dark:hover:text-white"
                          onClick={() => setProfileOpen(false)}
                          to="/leaderboard"
                        >
                          <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-110 group-hover:text-[#e61a27]">trophy</span>
                          Bảng xếp hạng
                        </Link>
                      </div>

                      {/* Divider */}
                      <div className="mx-2 h-px bg-gray-200 dark:bg-white/[0.06]" />

                      {/* Footer */}
                      <div className="p-1">
                        <button
                          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-[#ff5757] transition-all duration-200 hover:bg-[#ff5757]/10"
                          onClick={handleLogoutClick}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:-translate-x-1">logout</span>
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  className="flex items-center justify-center whitespace-nowrap shrink-0 bg-red-600 hover:bg-red-500 text-white font-bold text-[14px] uppercase tracking-wide px-5 py-2 rounded-lg border border-white/30 hover:border-white/60 transition-all duration-300 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] hover:-translate-y-0.5"
                  to="/login"
                >
                  Đăng Nhập
                </Link>
              )}
            </div>
          </div>
        </header>

        {isOpen && (
          <Suspense fallback={null}>
            <MovieFilterPanel isOpen onClose={closePanel} />
          </Suspense>
        )}
      </div>

      {/* Mobile Menu Overlay - outside sticky wrapper to avoid stacking context issues */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-0 bottom-0 z-[200] bg-[#0d0d0d] overflow-y-auto">
          {/* Header bar bên trong menu - có nút X */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-20 bg-black/95 backdrop-blur-md border-b border-white/[0.06]">
            <span className="text-white font-black text-lg uppercase tracking-wider">MENU</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          <div className="flex flex-col px-5 py-6">
            {/* BIG BUTTON */}
            <Link
              to="/moviedetail"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-[#e61a27] hover:bg-[#ff3344] transition-colors rounded-xl py-4 mb-8 text-white font-bold uppercase tracking-wider shadow-[0_4px_12px_rgba(230,26,39,0.3)]"
            >
              <span className="material-symbols-outlined text-[20px]">star</span>
              MUA VÉ NHANH
            </Link>

            {/* SECTIONS */}
            <div className="flex flex-col">

              {/* PHIM */}
              <div className="flex flex-col border-b border-white/10">
                <button
                  className="flex items-center justify-between py-4 w-full text-left"
                  onClick={() => setMobileMoviesOpen(!mobileMoviesOpen)}
                >
                  <span className="text-[14px] font-bold text-white uppercase tracking-wider">PHIM</span>
                  <span className={`select-none material-symbols-outlined text-white transition-transform duration-300 ${mobileMoviesOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                <div className={`flex flex-col gap-4 overflow-hidden transition-all duration-300 ${mobileMoviesOpen ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <Link to="/movies/now-showing" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-medium text-[#9D9D9D] hover:text-white pl-4">Phim đang chiếu</Link>
                  <Link to="/movies/coming-soon" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-medium text-[#9D9D9D] hover:text-white pl-4">Phim sắp chiếu</Link>
                </div>
              </div>

              {/* RẠP */}
              <div className="flex flex-col border-b border-white/10">
                <button
                  className="flex items-center justify-between py-4 w-full text-left"
                  onClick={() => setMobileCinemasOpen(!mobileCinemasOpen)}
                >
                  <span className="text-[14px] font-bold text-white uppercase tracking-wider">RẠP</span>
                  <span className={`select-none material-symbols-outlined text-white transition-transform duration-300 ${mobileCinemasOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                <div className={`flex flex-col gap-4 overflow-hidden transition-all duration-300 ${mobileCinemasOpen ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <Link to="/cinemas/all" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-medium text-[#9D9D9D] hover:text-white pl-4">Tất cả rạp</Link>
                  <Link to="/cinemas/lorap" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-medium text-[#9D9D9D] hover:text-white pl-4">LORAP</Link>
                  <Link to="/cinemas/lobed" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-medium text-[#9D9D9D] hover:text-white pl-4">LOBED</Link>
                  <Link to="/cinemas/loscreenx" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-medium text-[#9D9D9D] hover:text-white pl-4">LOSCREENX</Link>
                </div>
              </div>

              {/* THỂ LOẠI */}
              <div className="flex flex-col border-b border-white/10">
                <button
                  className="flex items-center justify-between py-4 w-full text-left"
                  onClick={() => setMobileGenresOpen(!mobileGenresOpen)}
                >
                  <span className="text-[14px] font-bold text-white uppercase tracking-wider">THỂ LOẠI</span>
                  <span className={`select-none material-symbols-outlined text-white transition-transform duration-300 ${mobileGenresOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                <div className={`flex flex-col gap-4 overflow-hidden transition-all duration-300 ${mobileGenresOpen ? 'max-h-96 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {genresList.map(g => (
                    <Link
                      key={g.id}
                      to={`/genres/${g.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-[14px] font-medium text-[#9D9D9D] hover:text-white pl-4"
                    >
                      {g.name}
                    </Link>
                  ))}
                  <div className="ml-4 h-[1px] bg-white/10 my-1"></div>
                  <Link to="/genres/all" onClick={() => setMobileMenuOpen(false)} className="text-[14px] font-medium text-[#9D9D9D] hover:text-white pl-4">Tất cả thể loại</Link>
                </div>
              </div>

              {/* GIÁ VÉ & ƯU ĐÃI */}
              <Link to="/offers" onClick={() => setMobileMenuOpen(false)} className="py-4 text-[14px] font-bold text-white uppercase tracking-wider border-b border-white/10">
                GIÁ VÉ &amp; ƯU ĐÃI
              </Link>
              <Link to="/leaderboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 border-b border-white/10 py-4 text-[14px] font-bold uppercase tracking-wider text-white">
                <span className="material-symbols-outlined text-[19px] text-[#e61a27]">trophy</span>
                BẢNG XẾP HẠNG
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal - Blue Nebula Style */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity">
          {/* Modal Content */}
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-[24px] border border-white/10 bg-[#18181b] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300"
            onMouseMove={handleModalMouseMove}
            onMouseLeave={handleModalMouseLeave}
            onMouseEnter={() => { isHoveringRef.current = true; }}
          >
            {/* Interactive Blue Nebula Background Effect */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div
                ref={glowRef1}
                className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] bg-blue-600/40 rounded-full blur-[80px] mix-blend-screen transition-transform duration-300 ease-out"
              ></div>
              <div
                ref={glowRef2}
                className="absolute bottom-[-150px] right-[-150px] w-[450px] h-[450px] bg-[#0055ff]/30 rounded-full blur-[90px] mix-blend-screen transition-transform duration-300 ease-out"
              ></div>
            </div>

            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent z-20 opacity-80"></div>

            <div className="relative z-10 p-8 flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-900/40 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                <span className="material-symbols-outlined text-3xl text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">logout</span>
              </div>

              <h3 className="mb-2 text-[22px] font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70 drop-shadow-sm">Đăng xuất</h3>
              <p className="mb-8 text-[15px] text-[#c2c6d6] font-medium leading-relaxed drop-shadow-md">
                Bạn có chắc chắn muốn đăng xuất tài khoản?
              </p>

              <div className="flex w-full justify-center gap-5">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-[130px] py-3 rounded-xl text-[15px] font-bold text-white bg-[#2a2a2a]/80 border border-[#424754]/50 hover:bg-[#555] hover:scale-110 hover:-translate-y-1 hover:border-gray-400 hover:shadow-[0_10px_25px_rgba(255,255,255,0.15)] transition-all duration-300 tracking-wide"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmLogout}
                  className="w-[130px] py-3 rounded-xl text-[15px] font-bold text-white tracking-wide transition-all duration-300 bg-[#0066ff] hover:bg-[#1a75ff] hover:scale-110 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,102,255,0.9)] shadow-[0_0_15px_rgba(0,102,255,0.5)] border border-transparent hover:border-blue-400"
                >
                  Đồng ý
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
