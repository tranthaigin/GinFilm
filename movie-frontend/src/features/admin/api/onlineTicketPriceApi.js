import { apiGet, apiPut } from '../../../shared/api/client';

const onlineTicketPriceApi = {
  getAllPrices: async () => {
    return await apiGet('/admin/online-prices');
  },
  
  getPriceByMovieId: async (movieId) => {
    return await apiGet(`/admin/online-prices/movie/${movieId}`);
  },

  updatePrice: async (movieId, data) => {
    return await apiPut(`/admin/online-prices/movie/${movieId}`, data);
  },
};

export default onlineTicketPriceApi;
