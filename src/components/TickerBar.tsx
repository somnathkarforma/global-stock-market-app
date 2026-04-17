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

  const isUp = stock.changePercent >= 0;

  return (
    <div className={`flex items-center gap-2.5 px-3 sm:px-4 py-1 rounded ${flash} transition-colors`}>
      {/* Symbol + Exchange badge */}
      <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
        <span className="font-mono text-[10px] sm:text-xs font-bold text-accent-cyan tracking-wide">
          {stock.symbol}
        </span>
        <span className="text-[7px] sm:text-[8px] font-bold text-accent-cyan/80 bg-accent-cyan/10 border border-accent-cyan/20 rounded px-1 py-0.5 uppercase tracking-wider leading-none">
          {stock.exchange}
        </span>
      </div>
      {/* Company name — short */}
      <span className="text-[9px] sm:text-[10px] text-slate-300 whitespace-nowrap hidden sm:inline">
        {stock.name.split(' ').slice(0, 2).join(' ')}
      </span>
      {/* Price */}
      <span className="font-mono text-[10px] sm:text-xs text-slate-200 whitespace-nowrap">
        {fmt(stock.price, stock.currency)}
      </span>
      {/* Change % with arrow */}
      <span className={`font-mono text-[10px] sm:text-xs whitespace-nowrap font-medium ${changeColor(stock.changePercent)}`}>
        {isUp ? '▲' : '▼'} {fmtPct(stock.changePercent)}
      </span>
      {/* Divider */}
      <span className="text-navy-700 text-xs select-none">│</span>
    </div>
  );
};

export const TickerBar: React.FC<Props> = ({ stocks, lastUpdated }) => {
  const items = [...stocks, ...stocks]; // doubled for seamless loop

  return (
    <div className="w-full bg-navy-950/80 border-t border-accent-cyan/10 border-b border-navy-700/60 overflow-hidden select-none py-1">
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
