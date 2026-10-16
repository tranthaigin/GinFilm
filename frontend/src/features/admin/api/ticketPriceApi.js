import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../../shared/api/client';
import { ENDPOINTS } from '../../../shared/api/endpoints';

const ticketPriceApi = {
  getAllTicketPrices: async () => {
    return await apiGet(ENDPOINTS.ticketPrices.list);
  },

  getTicketPriceById: async (id) => {
    return await apiGet(ENDPOINTS.ticketPrices.detail(id));
  },

  createTicketPrice: async (data) => {
    return await apiPost(ENDPOINTS.ticketPrices.create, data);
  },

  updateTicketPrice: async (id, data) => {
    return await apiPut(ENDPOINTS.ticketPrices.update(id), data);
  },

  changeStatus: async (id, status) => {
    return await apiPatch(ENDPOINTS.ticketPrices.status(id), { status });
  },

  deleteTicketPrice: async (id) => {
    return await apiDelete(ENDPOINTS.ticketPrices.delete(id));
  },

  lookupPrice: async (params) => {
    return await apiGet(ENDPOINTS.ticketPrices.lookup, { params });
  },
};

export default ticketPriceApi;
