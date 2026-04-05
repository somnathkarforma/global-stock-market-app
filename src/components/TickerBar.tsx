import React, { useEffect, useRef, useState } from 'react';
import { Stock } from '../data/mockData';
import { fmt, fmtPct, changeColor } from '../utils/market';
import { PriceUpdate } from '../hooks/useLivePrices';

interface Props {
  stocks: Stock[];
  lastUpdated: Map<string, PriceUpdate>;
}

const TickerItem: React.FC<{ stock: Stock; update?: PriceUpdate }> = ({ stock, update }) => {
  const [flash, setFlash] = useState('');
  const prevDir = useRef('');

  useEffect(() => {
    if (!update || update.direction === 'flat') return;
    if (update.direction === prevDir.current) return;
    prevDir.current = update.direction;
    setFlash(update.direction === 'up' ? 'flash-green' : 'flash-red');
    const t = setTimeout(() => setFlash(''), 600);
    return () => clearTimeout(t);
  }, [update]);

  return (
    <div className={`flex items-center gap-2 px-4 py-1 rounded ${flash} transition-colors`}>
      <span className="font-mono text-xs font-semibold text-accent-cyan tracking-wide whitespace-nowrap">
        {stock.symbol}
      </span>
      <span className="font-mono text-xs text-slate-200 whitespace-nowrap">
        {fmt(stock.price, stock.currency)}
      </span>
      <span className={`font-mono text-xs whitespace-nowrap ${changeColor(stock.changePercent)}`}>
        {fmtPct(stock.changePercent)}
      </span>
    </div>
  );
};

export const TickerBar: React.FC<Props> = ({ stocks, lastUpdated }) => {
  const items = [...stocks, ...stocks]; // doubled for seamless loop

  return (
    <div className="w-full bg-navy-900 border-b border-navy-700/60 overflow-hidden select-none py-1.5">
      <div className="flex animate-marquee whitespace-nowrap" style={{ width: 'max-content' }}>
        {items.map((stock, i) => (
          <TickerItem
            key={`${stock.symbol}-${i}`}
            stock={stock}
            update={lastUpdated.get(stock.symbol)}
          />
        ))}
      </div>
    </div>
  );
};
