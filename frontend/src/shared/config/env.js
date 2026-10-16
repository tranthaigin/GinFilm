// Hỗ trợ cả VITE_API_BASE_URL (chuẩn mới) và VITE_API_URL (legacy trong một số file cũ)
export function buildApiConfig(input = {}) {
  let apiBaseUrl =
    input.VITE_API_BASE_URL ||
    input.VITE_API_URL ||
    '/api';
  apiBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');

  // Đảm bảo URL có giao thức (https://) nếu không phải là relative URL local (/api)
  if (apiBaseUrl !== '/api' && !apiBaseUrl.startsWith('http://') && !apiBaseUrl.startsWith('https://')) {
    apiBaseUrl = 'https://' + apiBaseUrl;
  }

  // Đảm bảo URL kết thúc bằng /api
  if (apiBaseUrl !== '/api' && !apiBaseUrl.endsWith('/api')) {
    apiBaseUrl = apiBaseUrl.replace(/\/$/, '') + '/api';
  }
  // Tạo WebSocket URL từ backend URL
  // Production: https://xxx.railway.app/api → https://xxx.railway.app/ws
  // Development: /api → http://localhost:8080/ws (handled by Vite proxy)
  const deriveWsUrl = (baseUrl) => {
    if (baseUrl.startsWith('http')) {
      // SockJS yêu cầu endpoint là HTTP/HTTPS, không phải WS/WSS
      const url = new URL(baseUrl);
      url.pathname = url.pathname.replace(/\/api$/, '/ws');
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    }
    return '/ws'; // Default local proxy path
  };

  const env = {
    apiBaseUrl,
    wsUrl: deriveWsUrl(apiBaseUrl),
    apiTimeout: Number(input.VITE_API_TIMEOUT) || 15_000,
    isDev: input.DEV,
  };

  return env;
}

export default buildApiConfig(import.meta.env || {});
