import { apiGet, apiPost, apiPut, apiDelete } from '../../../shared/api/client';

export const movieFormatApi = {
  getAll: (includeDeleted = false) => {
    return apiGet(`/admin/movie-formats?includeDeleted=${includeDeleted}`);
  },

  create: (data) => {
    return apiPost('/admin/movie-formats', data);
  },

  update: (id, data) => {
    return apiPut(`/admin/movie-formats/${id}`, data);
  },

  softDelete: (id) => {
    return apiDelete(`/admin/movie-formats/${id}`);
  },

  restore: (id) => {
    return apiPost(`/admin/movie-formats/${id}/restore`);
  }
};
