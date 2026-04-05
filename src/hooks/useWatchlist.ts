import { useState, useCallback, useEffect } from 'react';

const KEY = 'stocksense_watchlist_v2';

const load = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<string[]>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(watchlist)); } catch { /* ignore */ }
  }, [watchlist]);

  const add = useCallback((symbol: string) => {
    setWatchlist(prev => prev.includes(symbol) ? prev : [...prev, symbol]);
  }, []);

  const remove = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
  }, []);

  const toggle = useCallback((symbol: string) => {
    setWatchlist(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  }, []);

  const has = useCallback((symbol: string) => watchlist.includes(symbol), [watchlist]);

  return { watchlist, add, remove, toggle, has };
};
