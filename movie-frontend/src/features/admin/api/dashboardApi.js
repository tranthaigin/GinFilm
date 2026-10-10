import { apiGet } from '../../../shared/api/client';
import { ADMIN_ENDPOINTS } from './index';

export const dashboardApi = {
  getDashboardData: async () => {
    return await apiGet(ADMIN_ENDPOINTS.dashboard.stats);
  }
};
