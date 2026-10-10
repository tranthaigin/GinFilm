export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    googleLogin: '/auth/google-login',
    verifyAccount: '/auth/verify-account',
    resendVerification: '/auth/resend-verification',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    unlockAccount: '/auth/unlock-account',
    resendUnlockOtp: '/auth/resend-unlock-otp',
    uploadAvatar: '/auth/upload-avatar',
    updateProfile: '/auth/update-profile',
  },
  movies: {
    list: '/movies',
    search: '/movies/search',
    detail: (movieId) => `/movies/${movieId}`,
    showtimes: (movieId) => `/movies/${movieId}/showtimes`,
  },
  shows: {
    // GET /api/shows/{showtimeId}/seats — trả về show info + seat layout của phòng
    seats: (showId) => `/shows/${showId}/seats`,
    detail: (showId) => `/shows/${showId}/seats`,
  },
  bookings: {
    hold: '/bookings/hold',
    create: '/bookings',
    detail: (bookingId) => `/bookings/${bookingId}`,
    my: '/bookings/my',
  },
  payments: {
    methods: '/payments/methods',
    checkout: '/payments/checkout',
    mockCallback: '/payment/mock-callback',
    createIntent: '/payment/create-payment-intent',
  },
  provinces: {
    withTheaters: '/provinces',
    all: '/provinces/all',
    theaters: (provinceId) => `/provinces/${provinceId}/theaters`,
  },
  theaters: {
    list: '/theaters',
    active: '/theaters/active',
    detail: (theaterId) => `/theaters/${theaterId}`,
    showtimes: (theaterId) => `/theaters/${theaterId}/showtimes`,
  },
  pos: {
    // Staff POS: lấy lịch chiếu kể cả suất đang chiếu chưa quá 5 phút
    showtimes: '/staff/pos/showtimes',
  },
  ticketPrices: {
    publicList: '/public/ticket-prices',
    list: '/admin/ticket-prices',
    detail: (id) => `/admin/ticket-prices/${id}`,
    create: '/admin/ticket-prices',
    update: (id) => `/admin/ticket-prices/${id}`,
    status: (id) => `/admin/ticket-prices/${id}/status`,
    delete: (id) => `/admin/ticket-prices/${id}`,
    lookup: '/admin/ticket-prices/lookup',
  },
  promotions: {
    list: '/promotions',
    detail: (id) => `/promotions/${id}`,
    apply: '/promotions/apply',
  },
  genres: {
    list: '/genres',
  },
  systemConfigs: {
    list: '/system-configs',
    detail: (key) => `/system-configs/${key}`,
  },
  contact: {
    send: '/contact/send',
  },
};

export default ENDPOINTS;
