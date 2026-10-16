import { useCallback } from 'react';
import { useAsync } from './useAsync';
import { getMovies } from '../api/services/movieService';

/**
 * @param {{ status?: import('../types.js').MovieStatus }} [params]
 */
export function useMovies(params = {}) {
  const status = params?.status;
  const fetcher = useCallback(() => getMovies({ status }), [status]);
  const { data, loading, error, refetch } = useAsync(fetcher);

  return {
    movies: data ?? [],
    loading,
    error,
    refetch,
  };
}
