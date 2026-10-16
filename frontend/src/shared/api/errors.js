/**
 * @typedef {Object} FieldError
 * @property {string} field
 * @property {string} message
 */

export class ApiError extends Error {
  constructor(message, { status, code, errors, raw } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? 0;
    this.code = code ?? 'UNKNOWN_ERROR';
    this.errors = errors ?? [];
    this.raw = raw;
  }

  static fromAxiosError(error) {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;

    if (body && typeof body === 'object') {
      return ApiError.fromResponse(body, status);
    }

    if (error.code === 'ECONNABORTED') {
      return new ApiError('Yêu cầu xử lý quá lâu. Vui lòng thử lại sau.', {
        status,
        code: 'TIMEOUT',
        raw: error,
      });
    }

    if (!error.response) {
      return new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.', {
        status: 0,
        code: 'NETWORK_ERROR',
        raw: error,
      });
    }

    return new ApiError('Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.', { status, code: 'HTTP_ERROR', raw: error });
  }

  static fromResponse(body, status = 400) {
    return new ApiError(typeof body.message === 'string' ? body.message : 'Yêu cầu không thành công, vui lòng thử lại.', {
      status,
      code: typeof body.code === 'string' ? body.code : 'API_ERROR',
      errors: Array.isArray(body.errors) ? body.errors : [],
      raw: body,
    });
  }

  getFieldError(field) {
    return this.errors.find((error) => error.field === field)?.message ?? null;
  }
}
