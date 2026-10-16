import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @template T
 * @param {() => Promise<T>} fetcher
 * Pass a useCallback fetcher so request identity changes only with its inputs.
 */
export function useAsync(fetcher) {
  const [state, setState] = useState({
    fetcher,
    data: null,
    loading: true,
    error: null,
  });
  const requestVersion = useRef(0);
  if (state.fetcher !== fetcher) {
    setState({ fetcher, data: null, loading: true, error: null });
  }

  const execute = useCallback(async () => {
    const version = ++requestVersion.current;
    setState((current) =>
      current.fetcher === fetcher
        ? { ...current, loading: true, error: null }
        : current
    );
    try {
      const result = await fetcher();
      if (requestVersion.current === version)
        setState((current) =>
          current.fetcher === fetcher
            ? { fetcher, data: result, loading: false, error: null }
            : current
        );
      return result;
    } catch (err) {
      if (requestVersion.current === version)
        setState((current) =>
          current.fetcher === fetcher
            ? { ...current, loading: false, error: err }
            : current
        );
      throw err;
    }
  }, [fetcher]);

  useEffect(() => {
    const version = ++requestVersion.current;
    let active = true;
    Promise.resolve()
      .then(fetcher)
      .then((data) => {
        if (active && requestVersion.current === version)
          setState((current) =>
            current.fetcher === fetcher
              ? { fetcher, data, loading: false, error: null }
              : current
          );
      })
      .catch((error) => {
        if (active && requestVersion.current === version)
          setState((current) =>
            current.fetcher === fetcher
              ? { fetcher, data: null, loading: false, error }
              : current
          );
      });
    return () => {
      active = false;
      requestVersion.current += 1;
    };
  }, [fetcher]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: execute,
  };
}
