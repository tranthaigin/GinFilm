import { apiGet, apiPost } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';
import { useAuthStore } from '../../store/authStore';

async function syncCurrentUserIfPossible() {
  try {
    const currentUser = await apiGet(ENDPOINTS.auth.me);
    // Giữ lại accessToken / refreshToken hiện có, chỉ cập nhật thông tin user
    const { accessToken, refreshToken } = useAuthStore.getState();
    useAuthStore.getState().setSession({ accessToken, refreshToken, user: currentUser });
  } catch {
    // giữ lại session hiện tại nếu endpoint /me chưa sẵn sàng
  }
}

/**
 * @param {import('../types.js').RegisterRequest} payload
 */
export async function register(payload) {
  // BE không nhận confirmPassword — bỏ trước khi gửi
  const bePayload = { ...payload };
  delete bePayload.confirmPassword;
  const data = await apiPost(ENDPOINTS.auth.register, bePayload);
  // Sau khi đăng ký thành công, KHÔNG lưu session vào store.
  // User phải xác thực OTP trước, sau đó mới đăng nhập bình thường.
  // Tránh trường hợp isAuthenticated = true sớm → GuestOnlyRoute redirect về /home
  // trước khi modal OTP kịp hiển thị.
  return data;
}

/**
 * @param {import('../types.js').LoginRequest} payload
 */
export async function login(payload) {
  const data = await apiPost(ENDPOINTS.auth.login, payload);
  useAuthStore.getState().setSession(data);
  await syncCurrentUserIfPossible();
  return data;
}

export async function logout() {
  try {
    // Server will read refreshToken from HttpOnly cookie to revoke it
    await apiPost(ENDPOINTS.auth.logout);
  } catch {
    // ignore logout errors — clear local session anyway
  }
  useAuthStore.getState().clearSession();
}

/**
 * Xác thực tài khoản bằng mã OTP gửi qua email sau khi đăng ký
 * @param {string} email - Email của người dùng
 * @param {string} otp   - Mã OTP 6 số nhận qua email
 */
export async function verifyAccount(email, otp) {
  const data = await apiPost(ENDPOINTS.auth.verifyAccount, { email, otp });
  return data;
}

/**
 * Yêu cầu Backend gửi lại mã OTP xác thực tài khoản
 * @param {string} email - Email của người dùng cần gửi lại OTP
 */
export async function resendVerification(email) {
  const data = await apiPost(ENDPOINTS.auth.resendVerification, { email });
  return data;
}

/**
 * Xác nhận OTP để mở khóa tài khoản
 * @param {string} email
 * @param {string} otp
 */
export async function unlockAccount(email, otp) {
  const data = await apiPost(ENDPOINTS.auth.unlockAccount, { email, otp });
  return data;
}

/**
 * Gửi lại OTP mở khóa tài khoản
 * @param {string} email
 */
export async function resendUnlockOtp(email) {
  const data = await apiPost(ENDPOINTS.auth.resendUnlockOtp, { email });
  return data;
}

/** @returns {Promise<import('../types.js').UserDto>} */
export async function getCurrentUser() {
  return apiGet(ENDPOINTS.auth.me);
}

/**
 * Đăng nhập bằng Google ID Token (nhận từ Google Identity Services)
 * BE trả về JWT string plain text
 * @param {string} idToken - Google credential token
/**
 * Decode Google ID token payload (no signature verification - frontend only)
 * @param {string} idToken
 */
function decodeGoogleToken(idToken) {
  try {
    const base64Payload = idToken.split('.')[1];
    // Thêm padding nếu thiếu
    const padded = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const binaryStr = atob(padded);
    // Chuyển binary string → UTF-8 đúng cách (hỗ trợ tiếng Việt & Unicode)
    const utf8 = decodeURIComponent(
      binaryStr.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(utf8);
  } catch {
    return null;
  }
}

export async function googleLogin(idToken) {
  // Decode Google token để lấy thông tin người dùng từ Google ngay lập tức
  const googlePayload = decodeGoogleToken(idToken);
  const googleUserInfo = googlePayload ? {
    fullName: googlePayload.name || '',
    email: googlePayload.email || '',
    picture: googlePayload.picture || '',
    username: googlePayload.email?.split('@')[0] || '',
    phone: '',
    dateOfBirth: '',
  } : null;

  // Lưu thông tin Google vào store trước (để hiển thị ngay)
  if (googleUserInfo) {
    useAuthStore.getState().setSession({ user: googleUserInfo, isGoogleTemp: true });
  }

  // BE trả về JSON { accessToken, refreshToken, user }
  const data = await apiPost(ENDPOINTS.auth.googleLogin, { idToken });
  useAuthStore.getState().setSession(data);
  await syncCurrentUserIfPossible();

  return data;
}

/**
 * Yêu cầu backend gửi OTP khôi phục mật khẩu đến email
 * @param {string} email - Email tài khoản cần khôi phục
 */
export async function forgotPassword(email) {
  const data = await apiPost(ENDPOINTS.auth.forgotPassword, { email });
  return data;
}

/**
 * Đặt lại mật khẩu bằng OTP đã được gửi qua email
 * @param {string} email       - Email tài khoản
 * @param {string} otp         - Mã OTP 6 số nhận qua email
 * @param {string} newPassword - Mật khẩu mới
 */
export async function resetPassword(email, otp, newPassword) {
  const data = await apiPost(ENDPOINTS.auth.resetPassword, { email, otp, newPassword });
  return data;
}

export async function refreshUserProfile() {
  try {
    const currentUser = await apiGet(ENDPOINTS.auth.me);
    const session = useAuthStore.getState();
    useAuthStore.getState().setSession({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: currentUser,
    });
    return currentUser;
  } catch (err) {
    console.error('Failed to refresh user profile:', err);
  }
}

/**
 * Upload ảnh đại diện (avatar) cho user đang đăng nhập
 * @param {File} file - File ảnh được chọn từ input[type=file]
 * @returns {Promise<string>} URL của avatar mới
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('file', file);

  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw new Error('Vui lòng đăng nhập để thực hiện chức năng này.');
  }

  const { default: axiosClient } = await import('../../../../shared/api/client');
  const response = await axiosClient.post(ENDPOINTS.auth.uploadAvatar, formData, {
    headers: {
      // Xóa Content-Type để axios tự set multipart/form-data + boundary chính xác từ FormData
      'Content-Type': undefined,
    },
    withCredentials: true,
  });

  // Interceptor trong client.js đã unwrap response body:
  // Nếu BE trả về plain { avatarUrl } (không có wrapper success), response.data = { avatarUrl }
  // Nếu BE trả về { success: true, data: { avatarUrl } }, interceptor unwrap thành response.data = { avatarUrl }
  const avatarUrl = response.data?.avatarUrl ?? response.avatarUrl;
  if (!avatarUrl) throw new Error('Server không trả về URL avatar');

  // Cập nhật thông tin user trong store
  await refreshUserProfile();

  return avatarUrl;
}

/**
 * Cập nhật thông tin cá nhân của user đang đăng nhập
 * @param {{ fullName: string, phoneNumber?: string, dateOfBirth?: string }} profileData
 * @returns {Promise<import('../types.js').UserDto>} User đã được cập nhật
 */
export async function updateProfile(profileData) {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw new Error('Vui lòng đăng nhập để thực hiện chức năng này.');
  }

  const { default: axiosClient } = await import('../../../../shared/api/client');
  const response = await axiosClient.put(ENDPOINTS.auth.updateProfile, profileData, {
    withCredentials: true
  });

  // Cập nhật store với thông tin mới từ server
  const updatedUser = response.data ?? response;
  const session = useAuthStore.getState();
  useAuthStore.getState().setSession({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: { ...session.user, ...updatedUser },
  });

  return updatedUser;
}
