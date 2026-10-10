import axios from 'axios';
import env from '../config/env';
import { ApiError } from './errors';
import { ENDPOINTS } from './endpoints';
import { useAuthStore } from '../../features/user/store/authStore';

const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },
});

axiosClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('device_id', deviceId);
  }
  config.headers['X-Device-Id'] = deviceId;

  return config;
});

let refreshPromise = null;

axiosClient.interceptors.response.use(
  (response) => {
    const body = response.data;

    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        throw ApiError.fromResponse(body, response.status);
      }

      return { ...response, data: body.data ?? null, meta: { message: body.message } };
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status >= 400 && status < 500) {
      const responseData = error.response?.data;
      if (typeof responseData === 'string' && responseData) {
        const lowerData = responseData.trim().toLowerCase();
        if (lowerData.startsWith('<!doctype html>') || lowerData.startsWith('<html')) {
          throw new Error('Hệ thống đang bảo trì hoặc gặp sự cố. Vui lòng thử lại sau.');
        }
        if (responseData.length > 150 || lowerData.includes('exception') || lowerData.includes('trace')) {
          throw new Error('Hệ thống đang gặp sự cố. Vui lòng thử lại sau.');
        }
        throw new Error(responseData);
      }
    }

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes(ENDPOINTS.auth.login) &&
      !originalRequest.url?.includes(ENDPOINTS.auth.refresh)
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = useAuthStore.getState().refreshSession();
        }

        await refreshPromise;
        refreshPromise = null;

        return axiosClient(originalRequest);
      } catch {
        refreshPromise = null;
        useAuthStore.getState().clearSession();
      }
    }

    throw ApiError.fromAxiosError(error);
  },
);

export async function apiGet(url, config) {
  const { data } = await axiosClient.get(url, config);
  return data;
}

export async function apiPost(url, body, config) {
  const { data } = await axiosClient.post(url, body, config);
  return data;
}

export async function apiPut(url, body, config) {
  const { data } = await axiosClient.put(url, body, config);
  return data;
}

export async function apiDelete(url, config) {
  const { data } = await axiosClient.delete(url, config);
  return data;
}

export async function apiPatch(url, body, config) {
  const { data } = await axiosClient.patch(url, body, config);
  return data;
}

export default axiosClient;
