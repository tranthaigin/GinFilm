// Layouts
export { default as AdminLayout } from './layouts/AdminLayout';
export { default as AdminSidebar } from './layouts/AdminSidebar';
export { default as AdminHeader } from './layouts/AdminHeader';

// Pages
export { default as DashboardPage } from './pages/DashboardPage';
export { default as CustomerManagementPage } from './pages/CustomerManagementPage';
export { default as MovieManagementPage } from './pages/MovieManagementPage';
export { default as FormatManagementPage } from './pages/FormatManagementPage';
export { default as EmployeeManagementPage } from './pages/EmployeeManagementPage';
export { default as TheaterManagementPage } from './pages/TheaterManagementPage';
export { default as CreateMoviePage } from './pages/CreateMoviePage';
export { default as RoomEditorPage } from './pages/RoomEditorPage';

export { default as ComboManagementPage } from './pages/ComboManagementPage';
export { default as ComboRevenuePage } from './pages/ComboRevenuePage';
export { default as ComboRevenueDetailsPage } from './pages/ComboRevenueDetailsPage';
export { default as PromotionManagementPage } from './pages/PromotionManagementPage';
export { default as TicketPriceManagementPage } from './pages/TicketPriceManagementPage';
export { default as OnlineTicketPriceManagementPage } from './pages/OnlineTicketPriceManagementPage';
export { default as ShowtimeManagementPage } from './pages/ShowtimeManagementPage';
export { default as CreateShowtimePage } from './pages/CreateShowtimePage';
export { default as AutoGenerateShowtimesPage } from './pages/AutoGenerateShowtimesPage';
export { default as OnlineTicketManagementPage } from './pages/OnlineTicketManagementPage';
export { default as SystemActivityLogPage } from './pages/SystemActivityLogPage';
export { default as SystemConfigPage } from './pages/SystemConfigPage';
export { default as MembershipTierConfigPage } from './pages/MembershipTierConfigPage';
export { default as OnlineRevenuePage } from './pages/OnlineRevenuePage';
export { default as AdminChatPage } from './pages/AdminChatPage';
export { default as ReportManagementPage } from './pages/ReportManagementPage';

// Components
export { default as AdminGuard } from './components/AdminGuard';
export { default as DashboardKPICards } from './components/DashboardKPICards';
export { default as RevenueChart } from './components/RevenueChart';
export { default as TicketDistributionChart } from './components/TicketDistributionChart';
export { default as TopMoviesTable } from './components/TopMoviesTable';
export { default as NowShowingCard } from './components/NowShowingCard';

export { default as TotalUsersCard } from './components/TotalUsersCard';
// Theater components
export { default as ProvinceCard } from './components/theater/ProvinceCard';
export { default as TheaterCard } from './components/theater/TheaterCard';
export { default as RoomCard } from './components/theater/RoomCard';
export { default as TheaterEmptyState } from './components/theater/TheaterEmptyState';
export { default as TheaterFormModal } from './components/theater/TheaterFormModal';

// Hooks
export { useAdminDashboard } from './hooks/useAdminDashboard';
export { useTheaterManagement } from './hooks/useTheaterManagement';

// API
export { ADMIN_ENDPOINTS } from './api';
