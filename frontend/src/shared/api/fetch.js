import client from './client';

// Response-compatible adapter for the existing admin forms; auth and refresh use the shared client.
export async function apiFetch(url, options = {}) {
  let response;
  try {
  response = await client.request({
    url,
    method: options.method || 'GET',
    data: options.body,
    headers: options.body instanceof FormData
      ? { ...options.headers, 'Content-Type': undefined }
      : options.headers,
    signal: options.signal,
  });
  } catch (error) {
    if (!error.status) throw error;
    response = { status: error.status, data: error.message };
  }
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => response.data,
    text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
  };
}
