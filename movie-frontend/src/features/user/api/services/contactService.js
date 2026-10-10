import { apiPost } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

export async function sendContact(data) {
  return await apiPost(ENDPOINTS.contact.send, data);
}
