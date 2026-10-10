import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'raplofilm-booking';

/**
 * @typedef {import('../api/types.js').SeatDto} SeatDto
 * @typedef {import('../api/types.js').ShowDto} ShowDto
 * @typedef {import('../api/types.js').BookingSummaryDto} BookingSummaryDto
 */

export const useBookingStore = create(
  persist(
    (set) => ({
      showId: 1,
      show: null,
      selectedSeats: [],
      holdToken: null,
      booking: null,

      /** @param {{ showId?: number, show?: ShowDto, selectedSeats: SeatDto[], holdToken?: string }} payload */
      setSelection: (payload) => {
        set({
          showId: payload.showId ?? 1,
          show: payload.show ?? null,
          selectedSeats: payload.selectedSeats,
          holdToken: payload.holdToken ?? null,
        });
      },

      /** @param {BookingSummaryDto} booking */
      setBooking: (booking) => set({ booking }),

      clear: () => {
        set({
          showId: 1,
          show: null,
          selectedSeats: [],
          holdToken: null,
          booking: null,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        showId: state.showId,
        show: state.show,
        selectedSeats: state.selectedSeats,
        holdToken: state.holdToken,
        booking: state.booking,
      }),
    },
  ),
);
