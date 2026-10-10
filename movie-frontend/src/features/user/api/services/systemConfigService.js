import { apiGet, apiPut } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

export async function getConfigs() {
  return await apiGet(ENDPOINTS.systemConfigs.list);
}

export async function updateConfig(key, data) {
  return await apiPut(ENDPOINTS.systemConfigs.detail(key), data);
}
