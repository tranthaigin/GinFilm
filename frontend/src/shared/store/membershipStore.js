import { create } from 'zustand';
import { apiGet } from '../api/client';
import {
  MEMBERSHIP_TIERS,
  createMembershipTiersFromConfigs,
} from '../constants/membership';

let activeRequest = null;

export const useMembershipStore = create((set, get) => ({
  tiers: MEMBERSHIP_TIERS,
  isLoading: false,
  isLoaded: false,
  error: null,

  loadMembershipTiers: async ({ force = false } = {}) => {
    if (!force && get().isLoaded) {
      return get().tiers;
    }
    if (activeRequest) {
      return activeRequest;
    }

    set({ isLoading: true, error: null });
    activeRequest = apiGet('/system-configs')
      .then((configs) => {
        const tiers = createMembershipTiersFromConfigs(configs);
        set({
          tiers,
          isLoading: false,
          isLoaded: true,
          error: null,
        });
        return tiers;
      })
      .catch((error) => {
        const fallbackTiers = get().isLoaded ? get().tiers : MEMBERSHIP_TIERS;
        set({
          tiers: fallbackTiers,
          isLoading: false,
          isLoaded: true,
          error: error?.message || 'Không thể tải cấu hình hạng thành viên.',
        });
        return fallbackTiers;
      })
      .finally(() => {
        activeRequest = null;
      });

    return activeRequest;
  },
}));
