import { useEffect, useRef, useCallback } from 'react';

export function usePolling(fetchFn, intervalMs = 60000, deps = []) {
  const intervalRef = useRef(null);
  const fetchRef = useRef(fetchFn);

  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  const refresh = useCallback(() => {
    fetchRef.current?.();
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchRef.current?.();

    // Set up polling
    intervalRef.current = setInterval(() => {
      fetchRef.current?.();
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return refresh;
}
