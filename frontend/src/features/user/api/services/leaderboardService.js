import { apiGet } from '../../../../shared/api/client';

export function getLeaderboard(period = 'week') {
  return apiGet('/public/leaderboard', { params: { period } });
}
