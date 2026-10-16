import { apiGet } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

/**
 * Lấy toàn bộ danh sách giá vé từ backend.
 * @returns {Promise<Array>} Mảng TicketPriceResponse
 */
export async function getTicketPrices() {
  try {
    return await apiGet(ENDPOINTS.ticketPrices.publicList);
  } catch (error) {
    console.error('Error fetching ticket prices:', error);
    throw error;
  }
}
