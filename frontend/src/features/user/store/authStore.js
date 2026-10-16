import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiPost, apiGet } from '../../../shared/api/client';
import { ENDPOINTS } from '../../../shared/api/endpoints';

const STORAGE_KEY = 'ginfilm-auth';

/**
 * @typedef {import('../api/types.js').AuthTokenResponse} AuthTokenResponse
 */

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      /** @param {AuthTokenResponse | import('../api/types.js').UserDto} payload */
      setSession: (payload) => {

        // QUAN TRỌNG: kiểm tra accessToken có giá trị thực sự (truthy),
        // không chỉ kiểm tra key tồn tại — tránh trường hợp { accessToken: null }
        // khiến isAuthenticated = true ngay sau khi đăng ký (trước khi xác thực OTP).
        if (payload?.accessToken) {
          // Mock / future JWT flow: có JWT thật → mới coi là đã đăng nhập
          set({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken ?? null,
            user: payload.user ?? null,
            isAuthenticated: true,
          });
        } else if (payload?.user || payload?.id) {
          // Có dữ liệu user (từ login BE hoặc syncCurrentUser) nhưng không có accessToken
          // Vẫn coi là đã đăng nhập (sử dụng HttpOnly cookie)
          set({
            accessToken: null,
            refreshToken: null,
            user: payload?.user ?? payload,
            isAuthenticated: true,
          });
        } else {
          // Trường hợp register hoặc logout
          set({
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
          });
        }
      },

      clearSession: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },

      refreshSession: async () => {

        /** @type {AuthTokenResponse} */
        const data = await apiPost(ENDPOINTS.auth.refresh);

        // Keep the state for UI but rely on cookies for the actual token transport
        set((state) => ({
          accessToken: data.accessToken ?? state.accessToken,
          refreshToken: data.refreshToken ?? state.refreshToken,
        }));

        return data;
      },

      syncUser: async () => {
        try {
          // Because backend uses HttpOnly cookies for accessToken, this request will succeed
          // automatically even if accessToken is not in the store yet.
          const user = await apiGet(ENDPOINTS.auth.me);
          set({ user, isAuthenticated: true });
          return user;
        } catch (error) {
          // If the token is invalid or expired, clear the session
          set({
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Lưu accessToken và user vào localStorage để phiên đăng nhập tồn tại khi refresh
      // trang trên mobile (đặc biệt Safari iOS chặn third-party cookie).
      // Token vẫn được gửi qua Authorization header nên không bị ảnh hưởng bởi ITP.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
);
