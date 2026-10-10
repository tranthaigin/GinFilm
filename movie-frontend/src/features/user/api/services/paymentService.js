import { apiGet, apiPost } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

/** @returns {Promise<import('../types.js').PaymentMethodDto[]>} */
export async function getPaymentMethods() {
  return apiGet(ENDPOINTS.payments.methods);
}

/**
 * @param {import('../types.js').CheckoutRequest} payload
 * @returns {Promise<import('../types.js').CheckoutResponse>}
 */
export async function checkout(payload) {
  return apiPost(ENDPOINTS.payments.checkout, payload);
}

export async function createPaymentIntent(amount, currency, bookingId) {
  return apiPost(ENDPOINTS.payments.createIntent, {
    amount,
    currency,
    bookingId
  });
}
