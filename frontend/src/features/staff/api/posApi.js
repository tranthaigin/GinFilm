import { apiGet, apiPost, apiPut } from "../../../shared/api/client";

export const posApi = {
  holdSeats: (data) => {
    return apiPost(`/staff/pos/bookings/hold`, data);
  },

  updateCombo: (bookingId, data) => {
    return apiPut(`/staff/pos/bookings/${bookingId}/combo`, data);
  },

  getPaymentStatus: (bookingId) => apiGet(`/staff/pos/bookings/${bookingId}/payment-status`),
  processPayment: (bookingId, data) => {
    return apiPost(`/staff/pos/bookings/${bookingId}/payment`, data);
  }
};
