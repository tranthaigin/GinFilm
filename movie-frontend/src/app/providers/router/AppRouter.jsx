import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ROUTE_PATHS } from '../../routes/paths';
import AuthToast from '../../../features/user/components/auth/AuthToast';
import AuthGuard from '../../../features/user/components/auth/AuthGuard';
import PinGuard from '../../../features/user/components/auth/PinGuard';
import RootRedirect from '../../../features/user/components/auth/RootRedirect';
import GlobalScrollToTop from '../../../features/user/components/common/GlobalScrollToTop';
import GlobalNotificationWebsocket from '../../../features/user/components/common/GlobalNotificationWebsocket';
import { useAuthStore } from '../../../features/user/store/authStore';
import { useToastStore } from '../../../features/user/store/toastStore';
import HomePage from '../../../features/user/pages/home/HomePage';
import { apiPost } from '../../../shared/api/client';
import { useMembershipStore } from '../../../shared/store/membershipStore';
import useNotificationStore from '../../../shared/store/notificationStore';

const UserChatWidget = lazy(() => import('../../../features/user/components/UserChatWidget'));

const AuthPage = lazy(() => import('../../../features/user/pages/auth/AuthPage'));
const ForbiddenPage = lazy(() => import('../../../features/user/pages/auth/ForbiddenPage'));
const ForGotPasswordPage = lazy(() => import('../../../features/user/pages/auth/ForGotPasswordPage'));
const ForGotPinPage = lazy(() => import('../../../features/user/pages/auth/ForGotPinPage'));
const BookingPage = lazy(() => import('../../../features/user/pages/booking/BookingPage'));
const CheckoutPage = lazy(() => import('../../../features/user/pages/booking/CheckoutPage'));
const AboutPage = lazy(() => import('../../../features/user/pages/info/AboutPage'));
const CinemasPage = lazy(() => import('../../../features/user/pages/info/CinemasPage'));
const InformationPage = lazy(() => import('../../../features/user/pages/info/InformationPage'));
const ComingSoonPage = lazy(() => import('../../../features/user/pages/movies/ComingSoonPage'));
const EnterTicketCodePage = lazy(() => import('../../../features/user/pages/movies/EnterTicketCodePage'));
const GenrePage = lazy(() => import('../../../features/user/pages/movies/GenrePage'));
const MovieDetailsPage = lazy(() => import('../../../features/user/pages/movies/MovieDetailsPage'));
const MovieInfoPage = lazy(() => import('../../../features/user/pages/movies/MovieInfoPage'));
const NowShowingPage = lazy(() => import('../../../features/user/pages/movies/NowShowingPage'));
const OnlineComingSoonPage = lazy(() => import('../../../features/user/pages/movies/OnlineComingSoonPage'));
const OnlineMoviesPage = lazy(() => import('../../../features/user/pages/movies/OnlineMoviesPage'));
const OnlineNowShowingPage = lazy(() => import('../../../features/user/pages/movies/OnlineNowShowingPage'));
const ScanOfflineTicketPage = lazy(() => import('../../../features/user/pages/movies/ScanOfflineTicketPage'));
const ScanOnlineTicketPage = lazy(() => import('../../../features/user/pages/movies/ScanOnlineTicketPage'));
const WatchMovieOnlinePage = lazy(() => import('../../../features/user/pages/movies/WatchMovieOnlinePage'));
const CombosPage = lazy(() => import('../../../features/user/pages/promotions/CombosPage'));
const PromotionDetailsPage = lazy(() => import('../../../features/user/pages/promotions/PromotionDetailsPage'));
const PromotionsPage = lazy(() => import('../../../features/user/pages/promotions/PromotionsPage'));
const SearchPage = lazy(() => import('../../../features/user/pages/search/SearchPage'));
const HistoryPage = lazy(() => import('../../../features/user/pages/user/HistoryPage'));
const LeaderboardPage = lazy(() => import('../../../features/user/pages/user/LeaderboardPage'));
const MyTicketsPage = lazy(() => import('../../../features/user/pages/user/MyTicketsPage'));
const NotificationsPage = lazy(() => import('../../../features/user/pages/user/NotificationsPage'));
const ProfilePage = lazy(() => import('../../../features/user/pages/user/ProfilePage'));

const AdminGuard = lazy(() => import('../../../features/admin/components/AdminGuard'));
const AdminLayout = lazy(() => import('../../../features/admin/layouts/AdminLayout'));
const AdminChatPage = lazy(() => import('../../../features/admin/pages/AdminChatPage'));
const AutoGenerateShowtimesPage = lazy(() => import('../../../features/admin/pages/AutoGenerateShowtimesPage'));
const ComboManagementPage = lazy(() => import('../../../features/admin/pages/ComboManagementPage'));
const ComboRevenueDetailsPage = lazy(() => import('../../../features/admin/pages/ComboRevenueDetailsPage'));
const ComboRevenuePage = lazy(() => import('../../../features/admin/pages/ComboRevenuePage'));
const CustomerManagementPage = lazy(() => import('../../../features/admin/pages/CustomerManagementPage'));
const DashboardPage = lazy(() => import('../../../features/admin/pages/DashboardPage'));
const EmployeeManagementPage = lazy(() => import('../../../features/admin/pages/EmployeeManagementPage'));
const FormatManagementPage = lazy(() => import('../../../features/admin/pages/FormatManagementPage'));
const MembershipTierConfigPage = lazy(() => import('../../../features/admin/pages/MembershipTierConfigPage'));
const MovieManagementPage = lazy(() => import('../../../features/admin/pages/MovieManagementPage'));
const OnlineRevenuePage = lazy(() => import('../../../features/admin/pages/OnlineRevenuePage'));
const OnlineTicketManagementPage = lazy(() => import('../../../features/admin/pages/OnlineTicketManagementPage'));
const OnlineTicketPriceManagementPage = lazy(() => import('../../../features/admin/pages/OnlineTicketPriceManagementPage'));
const PromotionManagementPage = lazy(() => import('../../../features/admin/pages/PromotionManagementPage'));
const ReportManagementPage = lazy(() => import('../../../features/admin/pages/ReportManagementPage'));
const RoomEditorPage = lazy(() => import('../../../features/admin/pages/RoomEditorPage'));
const ShowtimeManagementPage = lazy(() => import('../../../features/admin/pages/ShowtimeManagementPage'));
const SystemActivityLogPage = lazy(() => import('../../../features/admin/pages/SystemActivityLogPage'));
const SystemConfigPage = lazy(() => import('../../../features/admin/pages/SystemConfigPage'));
const TheaterManagementPage = lazy(() => import('../../../features/admin/pages/TheaterManagementPage'));
const TicketPriceManagementPage = lazy(() => import('../../../features/admin/pages/TicketPriceManagementPage'));

const StaffGuard = lazy(() => import('../../../features/staff/components/StaffGuard'));
const StaffLayout = lazy(() => import('../../../features/staff/layouts/StaffLayout'));
const StaffPOSPage = lazy(() => import('../../../features/staff/pages/pos/StaffPOSPage'));
const StaffUserManagementPage = lazy(() => import('../../../features/staff/pages/StaffUserManagementPage'));
const TicketScannerPage = lazy(() => import('../../../features/staff/pages/TicketScannerPage'));

function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#050a14] px-4 text-sm text-slate-300"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      Đang tải trang...
    </div>
  );
}

function DeferredUserChatWidget() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const notifications = useNotificationStore((state) => state.notifications);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [showSupportOptionsOnLoad, setShowSupportOptionsOnLoad] = useState(false);

  const roleText = user
    ? [
        typeof user.role === 'string' ? user.role : '',
        ...(Array.isArray(user.roles)
          ? user.roles.map((role) => (typeof role === 'string' ? role : role?.name || role?.authority || ''))
          : []),
        ...(Array.isArray(user.authorities)
          ? user.authorities.map((authority) => authority?.authority || '')
          : []),
      ]
        .join(' ')
        .toUpperCase()
    : '';
  const isStaffOrAdmin = roleText.includes('ADMIN') || roleText.includes('STAFF');
  const unreadChatCount = notifications.filter(
    (notification) => notification.type === 'CHAT' && !notification.isRead,
  ).length;

  useEffect(() => {
    const handleOpenSupport = () => {
      setShowSupportOptionsOnLoad(true);
      setShouldLoad(true);
    };

    window.addEventListener('openSupportChat', handleOpenSupport);
    return () => window.removeEventListener('openSupportChat', handleOpenSupport);
  }, []);

  if (isStaffOrAdmin) return null;

  if (shouldLoad) {
    return (
      <Suspense
        fallback={
          <div
            aria-label="Đang tải hỗ trợ khách hàng"
            className="fixed bottom-7 right-7 z-[1000] flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gradient-to-br from-[#dc2626] to-[#8b0032] text-white shadow-[0_8px_32px_rgba(220,38,38,0.5),0_2px_8px_rgba(0,0,0,0.3)]"
            role="status"
          >
            <span className="material-symbols-outlined animate-pulse text-[22px]">support_agent</span>
          </div>
        }
      >
        <UserChatWidget initialOpen initialSupportOptions={showSupportOptionsOnLoad} />
      </Suspense>
    );
  }

  const isWatchOnlinePage = location.pathname.includes('/watch-online');

  return (
    <button
      aria-label="Mở hỗ trợ khách hàng"
      className={`fixed bottom-7 right-7 z-[1000] flex h-[58px] w-[58px] items-center justify-center rounded-full border-0 bg-gradient-to-br from-[#dc2626] to-[#8b0032] text-white shadow-[0_8px_32px_rgba(220,38,38,0.5),0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,opacity] duration-300 hover:scale-110 hover:opacity-100 ${
        isWatchOnlinePage ? 'opacity-40' : 'opacity-100'
      }`}
      onClick={() => setShouldLoad(true)}
      title="Hỗ trợ khách hàng"
      type="button"
    >
      <span className="material-symbols-outlined text-[22px]">support_agent</span>
      {unreadChatCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#dc2626] shadow">
          {unreadChatCount > 99 ? '99+' : unreadChatCount}
        </span>
      )}
    </button>
  );
}

/**
 * Chỉ cho phép vào nếu chưa đăng nhập.
 * Nếu đã có session hợp lệ (isAuthenticated = true và user tồn tại) → redirect về /home.
 * Ngăn trường hợp user đã login lại vào trang đăng ký/đăng nhập.
 */
function GuestOnlyRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (isAuthenticated && user) {
    return <Navigate to={ROUTE_PATHS.home} replace />;
  }
  return children;
}

function GlobalReviewReminder() {
  const location = useLocation();

  useEffect(() => {
    const pendingTimestamp = localStorage.getItem('pendingReviewTimestamp');

    if (pendingTimestamp) {
       if (location.pathname !== ROUTE_PATHS.watchOnline) {
          const timePassed = Date.now() - parseInt(pendingTimestamp, 10);
          const timeToWait = 600000 - timePassed;

          const triggerReminder = () => {
             useToastStore.getState().showToast('Bạn vừa xem phim xong, đừng quên quay lại trang xem phim để lại đánh giá nhé!', 'warning');
             
             // Create bell notification
             const movieId = localStorage.getItem('pendingReviewMovieId');
             const ticketCode = localStorage.getItem('pendingReviewTicketCode');
             const movieTitle = localStorage.getItem('pendingReviewMovieTitle');
             
             if (movieId) {
               apiPost('/notifications/remind-review', {
                 movieId,
                 ticketCode: ticketCode || '',
                 movieTitle: movieTitle || ''
               }).catch(console.error);

               localStorage.setItem(`hasRemindedReview_${movieId}_${ticketCode || ''}`, 'true');
             }

             localStorage.removeItem('pendingReviewTimestamp');
             localStorage.removeItem('pendingReviewMovieId');
             localStorage.removeItem('pendingReviewTicketCode');
             localStorage.removeItem('pendingReviewMovieTitle');
          };
          
          if (timeToWait <= 0) {
             triggerReminder();
          } else {
             const timeoutId = setTimeout(triggerReminder, timeToWait);
             return () => clearTimeout(timeoutId);
          }
       }
    }
  }, [location.pathname]);

  return null;
}

function GlobalAuthSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const syncUser = useAuthStore((s) => s.syncUser);

  useEffect(() => {
    // If the user is flagged as authenticated but we don't have the user object in memory,
    // fetch it from the server.
    if (isAuthenticated && !user) {
      syncUser().catch(console.error);
    }
  }, [isAuthenticated, user, syncUser]);

  return null;
}

function GlobalMembershipConfig() {
  const loadMembershipTiers = useMembershipStore((state) => state.loadMembershipTiers);

  useEffect(() => {
    loadMembershipTiers();
  }, [loadMembershipTiers]);

  return null;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <GlobalScrollToTop />
      <GlobalAuthSync />
      <GlobalMembershipConfig />
      <GlobalReviewReminder />
      <GlobalNotificationWebsocket />
      <AuthToast />
      <DeferredUserChatWidget />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
        {/* Root: redirect theo role khi mở lại trình duyệt */}
        <Route path={ROUTE_PATHS.root} element={<RootRedirect />} />

        {/* User Routes */}
        <Route path={ROUTE_PATHS.home} element={<HomePage />} />
        <Route path={ROUTE_PATHS.movieDetails} element={<PinGuard><MovieDetailsPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.movieInfo} element={<PinGuard><MovieInfoPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.profile} element={<PinGuard><AuthGuard><ProfilePage /></AuthGuard></PinGuard>} />
        <Route path={ROUTE_PATHS.myTickets} element={<PinGuard><AuthGuard><MyTicketsPage /></AuthGuard></PinGuard>} />
        <Route path={ROUTE_PATHS.history} element={<PinGuard><AuthGuard><HistoryPage /></AuthGuard></PinGuard>} />
        <Route path={ROUTE_PATHS.notifications} element={<PinGuard><AuthGuard><NotificationsPage /></AuthGuard></PinGuard>} />
        <Route path={ROUTE_PATHS.leaderboard} element={<LeaderboardPage />} />
        <Route path={ROUTE_PATHS.login} element={<AuthPage />} />
        <Route path={ROUTE_PATHS.register} element={<AuthPage />} />
        <Route path={ROUTE_PATHS.forgotPassword} element={<ForGotPasswordPage />} />
        <Route path={ROUTE_PATHS.forgotPin} element={<ForGotPinPage />} />
        <Route path={ROUTE_PATHS.forbidden} element={<ForbiddenPage />} />
        <Route path={ROUTE_PATHS.booking} element={<PinGuard><AuthGuard><BookingPage /></AuthGuard></PinGuard>} />
        <Route path={ROUTE_PATHS.combos} element={<PinGuard><AuthGuard><CombosPage /></AuthGuard></PinGuard>} />
        <Route path={ROUTE_PATHS.checkout} element={<PinGuard><AuthGuard><CheckoutPage /></AuthGuard></PinGuard>} />

        {/* Admin Routes */}
        <Route
          path={ROUTE_PATHS.admin}
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomerManagementPage />} />
          <Route path="movies" element={<MovieManagementPage />} />
          <Route path="movie-formats" element={<FormatManagementPage />} />
          <Route path="employees" element={<EmployeeManagementPage />} />
          <Route path="theaters" element={<TheaterManagementPage />} />
          <Route path="combo" element={<ComboManagementPage />} />
          <Route path="combo/revenue" element={<ComboRevenuePage />} />
          <Route path="combo/revenue/combos" element={<ComboRevenueDetailsPage />} />
          <Route path="revenue/online" element={<OnlineRevenuePage />} />
          <Route path="promotions" element={<PromotionManagementPage />} />
          <Route path="ticket-prices" element={<TicketPriceManagementPage />} />
          <Route path="online-ticket-prices" element={<OnlineTicketPriceManagementPage />} />
          <Route path="online-tickets" element={<OnlineTicketManagementPage />} />
          <Route path="system-activity" element={<SystemActivityLogPage />} />
          <Route path="system-configs" element={<SystemConfigPage />} />
          <Route path="membership-tiers" element={<MembershipTierConfigPage />} />
          <Route path="showtimes" element={<ShowtimeManagementPage />} />
          <Route path="showtimes/auto" element={<AutoGenerateShowtimesPage />} />
          <Route path="theaters/:theaterId/rooms/new" element={<RoomEditorPage />} />
          <Route path="theaters/:theaterId/rooms/:roomId/edit" element={<RoomEditorPage />} />
          <Route path="chat" element={<AdminChatPage />} />
          <Route path="reports" element={<ReportManagementPage />} />
        </Route>

        {/* Staff Routes */}
        <Route
          path={ROUTE_PATHS.staff}
          element={
            <StaffGuard>
              <StaffLayout />
            </StaffGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="pos" element={<StaffPOSPage />} />
          <Route path="customers" element={<StaffUserManagementPage />} />
          <Route path="movies" element={<MovieManagementPage />} />
          <Route path="movie-formats" element={<FormatManagementPage />} />
          <Route path="employees" element={<EmployeeManagementPage />} />
          <Route path="theaters" element={<TheaterManagementPage />} />
          <Route path="combo" element={<ComboManagementPage />} />
          <Route path="combo/revenue" element={<ComboRevenuePage />} />
          <Route path="combo/revenue/combos" element={<ComboRevenueDetailsPage />} />
          <Route path="revenue/online" element={<OnlineRevenuePage />} />
          <Route path="promotions" element={<PromotionManagementPage />} />
          <Route path="ticket-prices" element={<TicketPriceManagementPage />} />
          <Route path="online-ticket-prices" element={<OnlineTicketPriceManagementPage />} />
          <Route path="online-tickets" element={<OnlineTicketManagementPage />} />
          <Route path="system-activity" element={<SystemActivityLogPage />} />
          <Route path="showtimes" element={<ShowtimeManagementPage />} />
          <Route path="showtimes/auto" element={<AutoGenerateShowtimesPage />} />
          <Route path="theaters/:theaterId/rooms/new" element={<RoomEditorPage />} />
          <Route path="theaters/:theaterId/rooms/:roomId/edit" element={<RoomEditorPage />} />
          <Route path="scan-qr" element={<TicketScannerPage />} />
        </Route>
        <Route path={ROUTE_PATHS.watchOnline} element={<PinGuard><WatchMovieOnlinePage /></PinGuard>} />
        <Route path={ROUTE_PATHS.enterTicketCode} element={<PinGuard><EnterTicketCodePage /></PinGuard>} />
        <Route path="/scan/online/:code" element={<ScanOnlineTicketPage />} />
        <Route path="/scan/offline/:code" element={<ScanOfflineTicketPage />} />
        <Route path={ROUTE_PATHS.offers} element={<PinGuard><PromotionsPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.offerDetails} element={<PinGuard><PromotionDetailsPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.nowShowing} element={<PinGuard><NowShowingPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.comingSoon} element={<PinGuard><ComingSoonPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.onlineMovies} element={<PinGuard><OnlineMoviesPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.onlineNowShowing} element={<PinGuard><OnlineNowShowingPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.onlineComingSoon} element={<PinGuard><OnlineComingSoonPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.about} element={<PinGuard><AboutPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.information} element={<PinGuard><InformationPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.cinemas} element={<PinGuard><CinemasPage /></PinGuard>} />
        <Route path={ROUTE_PATHS.genre} element={<PinGuard><GenrePage /></PinGuard>} />
        <Route path={ROUTE_PATHS.search} element={<PinGuard><SearchPage /></PinGuard>} />
        <Route path="*" element={<Navigate replace to={ROUTE_PATHS.home} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
