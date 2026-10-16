
import { apiGet, apiPost, apiPut } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';


/**
 * @param {import('../types.js').HoldSeatsRequest} payload
 * @returns {Promise<import('../types.js').HoldSeatsResponse>}
 */
export async function holdSeats(payload) {
  // Bỏ useMockApi để gọi thẳng Backend Spring Boot
  return apiPost(ENDPOINTS.bookings.hold, payload);
}

export async function updateCombo(bookingId, payload) {
  return apiPut(`/bookings/${bookingId}/combo`, payload);
}

export async function createPayment(bookingId, payload) {
  return apiPost(`/bookings/${bookingId}/payment`, payload);
}



/**
 * @param {import('../types.js').CreateBookingRequest} payload
 * @returns {Promise<import('../types.js').BookingSummaryDto>}
 */
export async function createBooking(payload) {
  return apiPost(ENDPOINTS.bookings.create, payload);
}

export async function getBookingById(bookingId) {
  return apiGet(ENDPOINTS.bookings.detail(bookingId));
}

export async function getMyBookings() {
  return apiGet(ENDPOINTS.bookings.my);
}

export async function getMyTickets() {
  return apiGet('/bookings/my-tickets');
}

export async function getSharedTickets() {
  return apiGet('/bookings/shared-tickets');
}

export async function purchaseOnlineTicket(payload) {
  return apiPost('/bookings/online', payload);
}

export async function clearAllTickets() {
  return import('../../../../shared/api/client').then(m => m.apiDelete('/bookings/clear-all'));
}
