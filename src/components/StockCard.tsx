import React, { useState, useEffect, useRef } from 'react';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';
import { Stock } from '../data/mockData';
import { fmt, fmtPct, changeColor, fmtVolume } from '../utils/market';
import { PriceUpdate } from '../hooks/useLivePrices';

interface Props {
  stock: Stock;
  update?: PriceUpdate;
  isWatched: boolean;
  onToggleWatch: (symbol: string) => void;
  onClick: (stock: Stock) => void;
}

// Inline sparkline from last 20 price ticks stored in component
const Sparkline: React.FC<{ data: number[]; positive: boolean }> = ({ data, positive }) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 32;
  const pad = 2;
  const pts = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');
  const color = positive ? '#00ff87' : '#ff3b5c';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={`sg-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export const StockCard: React.FC<Props> = ({ stock, update, isWatched, onToggleWatch, onClick }) => {
  const [flash, setFlash] = useState('');
  const [priceHistory, setPriceHistory] = useState<number[]>([stock.price]);
  const prevPrice = useRef(stock.price);

  useEffect(() => {
    if (!update || update.direction === 'flat') return;
    if (update.price === prevPrice.current) return;
    const dir = update.price > prevPrice.current ? 'up' : 'down';
    prevPrice.current = update.price;
    setFlash(dir === 'up' ? 'flash-green' : 'flash-red');
    setPriceHistory(h => [...h.slice(-19), update.price]);
    const t = setTimeout(() => setFlash(''), 620);
    return () => clearTimeout(t);
  }, [update]);

  const isPositive = stock.changePercent >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={`relative bg-surface-2 border border-navy-700/40 rounded-xl p-4 cursor-pointer
        hover:border-accent-cyan/30 hover:shadow-lg hover:shadow-accent-cyan/5
        transition-all duration-200 group animate-slide-up ${flash}`}
      onClick={() => onClick(stock)}
    >
      {/* Watchlist star */}
      <button
        className={`absolute top-3 right-3 transition-colors z-10 ${
          isWatched ? 'text-accent-amber' : 'text-slate-600 hover:text-accent-amber'
        }`}
        onClick={e => { e.stopPropagation(); onToggleWatch(stock.symbol); }}
      >
        <Star className="w-3.5 h-3.5" fill={isWatched ? 'currentColor' : 'none'} />
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pr-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-sm font-bold text-accent-cyan tracking-wider">{stock.symbol}</span>
            <span className="text-[9px] font-semibold text-slate-600 bg-navy-700/50 border border-navy-600/30 rounded px-1.5 py-0.5 tracking-wide">
              {stock.exchange}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{stock.name}</p>
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="font-mono text-lg font-bold text-slate-100 leading-none">
            {fmt(stock.price, stock.currency)}
          </p>
          <div className={`flex items-center gap-1 mt-1 ${changeColor(stock.changePercent)}`}>
            <Icon className="w-3 h-3" />
            <span className="font-mono text-xs font-semibold">{fmtPct(stock.changePercent)}</span>
            <span className="font-mono text-xs opacity-70">
              ({stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)})
            </span>
          </div>
        </div>
        {/* Sparkline */}
        <div className="opacity-80 group-hover:opacity-100 transition-opacity">
          <Sparkline data={priceHistory} positive={isPositive} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-navy-700/30">
        <div>
          <p className="text-[9px] text-slate-600 uppercase tracking-wide">Volume</p>
          <p className="font-mono text-[10px] text-slate-400">{fmtVolume(stock.volume)}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-600 uppercase tracking-wide">Sector</p>
          <p className="text-[10px] text-slate-400 truncate max-w-[80px]">{stock.sector}</p>
        </div>
      </div>
    </div>
  );
};
