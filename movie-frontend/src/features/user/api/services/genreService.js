import { apiGet } from '../../../../shared/api/client';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

let pendingGenresRequest = null;

export function getAllGenres() {
  if (!pendingGenresRequest) {
    pendingGenresRequest = apiGet(ENDPOINTS.genres.list).finally(() => {
      pendingGenresRequest = null;
    });
  }

  return pendingGenresRequest;
}
