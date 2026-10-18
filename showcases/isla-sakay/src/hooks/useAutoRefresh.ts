import { useEffect, useRef, type DependencyList } from 'react';

type AutoRefreshOptions = {
  intervalMs?: number;
};

export const useAutoRefresh = (
  callback: () => void | Promise<void>,
  deps: DependencyList,
  _options?: AutoRefreshOptions,
) => {
  const callbackRef = useRef(callback);
  const inFlightRef = useRef(false);

  callbackRef.current = callback;

  useEffect(() => {
    let disposed = false;

    const runRefresh = async () => {
      if (disposed || document.hidden || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await callbackRef.current();
      } finally {
        inFlightRef.current = false;
      }
    };

    void runRefresh();

    return () => {
      disposed = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
