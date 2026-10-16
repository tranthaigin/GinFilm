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

export async function createPaymentIntent(order) {
  return apiPost(ENDPOINTS.payments.createIntent, order);
}

export async function confirmStripePayment(paymentIntentId) {
  const result = await apiPost('/payment/confirm-stripe', { paymentIntentId });
  if (!result.confirmed) throw new Error('Đơn hàng đã hết hạn. Khoản thanh toán đang chờ hoàn tiền; vui lòng liên hệ hỗ trợ.');
  return result;
}
