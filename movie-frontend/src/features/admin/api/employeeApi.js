import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../../shared/api/client';
import { ADMIN_ENDPOINTS } from './index';

export const employeeApi = {
  fetchEmployees: async () => {
    return await apiGet(ADMIN_ENDPOINTS.employees.list);
  },

  createEmployee: async (data) => {
    return await apiPost(ADMIN_ENDPOINTS.employees.list, data);
  },

  updateEmployee: async (id, data) => {
    return await apiPut(ADMIN_ENDPOINTS.employees.update(id), data);
  },

  toggleEmployeeStatus: async (id) => {
    return await apiPatch(ADMIN_ENDPOINTS.employees.toggleLock(id));
  },

  deleteEmployee: async (id) => {
    return await apiDelete(ADMIN_ENDPOINTS.employees.delete(id));
  },

  fetchDeletedEmployees: async () => {
    return await apiGet(ADMIN_ENDPOINTS.employees.list + '/deleted');
  },

  restoreEmployee: async (id) => {
    return await apiPut(ADMIN_ENDPOINTS.employees.update(id) + '/restore');
  },

  sendEmailToStaff: async (data) => {
    return await apiPost(ADMIN_ENDPOINTS.employees.list + '/send-email', data);
  },
};
