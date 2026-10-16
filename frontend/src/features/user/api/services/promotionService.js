import { apiGet, apiPost } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

export async function getPromotions() {
  try {
    return await apiGet(ENDPOINTS.promotions.list);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    throw error;
  }
}

export async function getPromotionById(id) {
  try {
    return await apiGet(ENDPOINTS.promotions.detail(id));
  } catch (error) {
    console.error(`Error fetching promotion with id ${id}:`, error);
    throw error;
  }
}

export async function applyPromotion(code, ticketTotal, comboTotal) {
  return await apiPost(ENDPOINTS.promotions.apply, {
    code, ticketTotal, comboTotal
  });
}
