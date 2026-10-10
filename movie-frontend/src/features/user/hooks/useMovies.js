import { useAsync } from './useAsync';
import { getMovies } from '../api/services/movieService';

/**
 * @param {{ status?: import('../types.js').MovieStatus }} [params]
 */
export function useMovies(params = {}) {
  const { data, loading, error, refetch } = useAsync(
    () => getMovies(params),
    [params?.status],
  );

  return {
    movies: data ?? [],
    loading,
    error,
    refetch,
  };
}
