import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { Stock, MARKET_INDICES, EXCHANGES, isExchangeOpen } from '../data/mockData';
import { fmt, fmtPct, changeColor } from '../utils/market';

interface Props {
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
}

const ExchangeStatus: React.FC = () => (
  <div className="bg-surface-2 rounded-xl border border-navy-700/40 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Activity className="w-4 h-4 text-accent-cyan" />
      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Exchange Status</h3>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {EXCHANGES.map(ex => {
        const open = isExchangeOpen(ex.name);
        return (
          <div key={ex.name} className="flex items-center justify-between px-2 py-1.5 bg-navy-900/50 rounded-lg border border-navy-700/30">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{ex.flag}</span>
              <span className="font-mono text-[10px] text-slate-300 font-medium">{ex.name}</span>
            </div>
            <div className={`flex items-center gap-1 text-[9px] font-semibold ${open ? 'text-accent-green' : 'text-slate-500'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${open ? 'bg-accent-green animate-pulse' : 'bg-slate-600'}`} />
              {open ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const MarketOverview: React.FC<Props> = ({ stocks, onSelectStock }) => {
  const sorted = useMemo(() => [...stocks].sort((a, b) => b.changePercent - a.changePercent), [stocks]);
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  return (
    <div className="space-y-4">
      {/* Market indices */}
      <div className="bg-surface-2 rounded-xl border border-navy-700/40 p-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Global Indices</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {MARKET_INDICES.map(idx => {
            return (
              <div key={idx.id} className="bg-navy-900/60 rounded-lg px-3 py-2 border border-navy-700/30">
                <p className="text-[9px] text-slate-500 font-semibold tracking-wide">{idx.id}</p>
                <p className="text-[11px] text-slate-400 mb-1 truncate">{idx.name}</p>
                <p className="font-mono text-sm font-bold text-slate-100">{idx.value.toLocaleString()}</p>
                <p className={`font-mono text-[10px] font-semibold ${changeColor(idx.changePercent)}`}>
                  {fmtPct(idx.changePercent)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector heatmap */}
      <div className="bg-surface-2 rounded-xl border border-navy-700/40 p-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Sector Heatmap</h3>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(
            stocks.reduce((acc, s) => {
              if (!acc[s.sector]) acc[s.sector] = { sum: 0, count: 0 };
              acc[s.sector].sum += s.changePercent;
              acc[s.sector].count++;
              return acc;
            }, {} as Record<string, { sum: number; count: number }>)
          ).map(([sector, { sum, count }]) => {
            const avg = sum / count;
            const intensity = Math.min(Math.abs(avg) / 2, 1);
            const bg = avg > 0
              ? `rgba(0, 255, 135, ${0.08 + intensity * 0.25})`
              : `rgba(255, 59, 92, ${0.08 + intensity * 0.25})`;
            return (
              <div
                key={sector}
                className="rounded-lg px-3 py-2 border cursor-default transition-transform hover:scale-105"
                style={{
                  background: bg,
                  borderColor: avg > 0 ? 'rgba(0,255,135,0.2)' : 'rgba(255,59,92,0.2)',
                  minWidth: `${80 + count * 12}px`,
                }}
              >
                <p className="text-[9px] text-slate-400 font uppercase tracking-wider leading-none mb-0.5">{sector}</p>
                <p className={`font-mono text-sm font-bold ${changeColor(avg)}`}>{fmtPct(avg)}</p>
                <p className="text-[9px] text-slate-600">{count} stocks</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gainers / Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Top Gainers', data: gainers, positive: true },
          { label: 'Top Losers', data: losers, positive: false },
        ].map(({ label, data, positive }) => (
          <div key={label} className="bg-surface-2 rounded-xl border border-navy-700/40 p-4">
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
              {label}
            </h3>
            <div className="space-y-1">
              {data.map(s => (
                <button
                  key={s.symbol}
                  onClick={() => onSelectStock(s)}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-navy-700/30 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-bold text-accent-cyan mr-2">{s.symbol}</span>
                    <span className="text-[10px] text-slate-500 truncate">{s.exchange}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-mono text-xs text-slate-300">{fmt(s.price, s.currency)}</p>
                    <p className={`font-mono text-xs font-bold ${changeColor(s.changePercent)}`}>{fmtPct(s.changePercent)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Exchange status */}
      <ExchangeStatus />
    </div>
  );
};
