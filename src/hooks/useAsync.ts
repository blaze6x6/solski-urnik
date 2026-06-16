import { useState, useEffect, useCallback } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAsync<T>(asyncFn: () => Promise<T>, deps: any[] = []): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    asyncFn()
      .then(result => {
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Napaka pri nalaganju');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [...deps, refreshKey]);

  return { data, loading, error, refresh };
}

export function useMultipleAsync<T extends Record<string, () => Promise<any>>>(
  asyncFns: T,
  deps: any[] = []
): {
  data: { [K in keyof T]: Awaited<ReturnType<T[K]>> | null };
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const keys = Object.keys(asyncFns);
    Promise.all(keys.map(key => asyncFns[key]()))
      .then(results => {
        if (mounted) {
          const newData: Record<string, any> = {};
          keys.forEach((key, i) => {
            newData[key] = results[i];
          });
          setData(newData);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Napaka pri nalaganju');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [...deps, refreshKey]);

  return { data: data as any, loading, error, refresh };
}
