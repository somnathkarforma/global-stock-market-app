import { useState, useEffect, useCallback, useRef } from 'react';
import { Stock, STOCKS, isExchangeOpen } from '../data/mockData';

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
}

const TICK_INTERVAL = 5000; // ms

const tickPrice = (stock: Stock): PriceUpdate => {
  // ±0.1 – 0.8% random walk — only called when exchange is OPEN
  const pct = (Math.random() - 0.49) * 0.016;
  const newPrice = Math.max(stock.price * (1 + pct), 0.01);
  const price = +newPrice.toFixed(stock.currency === 'JPY' ? 1 : 2);
  const change = +(price - stock.previousClose).toFixed(2);
  const changePercent = +((price - stock.previousClose) / stock.previousClose * 100).toFixed(2);
  const direction = price > stock.price ? 'up' : price < stock.price ? 'down' : 'flat';
  return { symbol: stock.symbol, price, change, changePercent, direction };
};

export const useLivePrices = () => {
  const [prices, setPrices] = useState<Map<string, Stock>>(() => {
    const m = new Map<string, Stock>();
    STOCKS.forEach(s => m.set(s.symbol, { ...s }));
    return m;
  });
  const [lastUpdated, setLastUpdated] = useState<Map<string, PriceUpdate>>(new Map());
  const activeRef = useRef(true);

  const tick = useCallback(() => {
    if (!activeRef.current) return;
    const updates = new Map<string, PriceUpdate>();
    setPrices(prev => {
      const next = new Map(prev);
      prev.forEach((stock) => {
        // Only simulate price movement when the exchange is open
        if (!isExchangeOpen(stock.exchange)) return;
        const update = tickPrice(stock);
        next.set(stock.symbol, {
          ...stock,
          price: update.price,
          change: update.change,
          changePercent: update.changePercent,
        });
        updates.set(stock.symbol, update);
      });
      return next;
    });
    setLastUpdated(updates);
  }, []);

  useEffect(() => {
    activeRef.current = true;
    const id = setInterval(tick, TICK_INTERVAL);
    return () => {
      activeRef.current = false;
      clearInterval(id);
    };
  }, [tick]);

  return { prices, lastUpdated };
};
