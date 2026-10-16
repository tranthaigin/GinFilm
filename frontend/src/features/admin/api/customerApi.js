import { apiGet, apiPut, apiDelete, apiPost } from '../../../shared/api/client';
import { ADMIN_ENDPOINTS } from './index';

export const customerApi = {
  createCustomer: async (data) => {
    return await apiPost(ADMIN_ENDPOINTS.customers.list, data);
  },

  fetchCustomers: async () => {
    return await apiGet(ADMIN_ENDPOINTS.customers.list);
  },

  updateCustomer: async (id, data) => {
    return await apiPut(ADMIN_ENDPOINTS.customers.update(id), data);
  },

  deleteCustomer: async (id) => {
    return await apiDelete(ADMIN_ENDPOINTS.customers.delete(id));
  },

  fetchDeletedCustomers: async () => {
    return await apiGet(ADMIN_ENDPOINTS.customers.list + '/deleted');
  },

  restoreCustomer: async (id) => {
    return await apiPut(ADMIN_ENDPOINTS.customers.update(id) + '/restore');
  },
};
