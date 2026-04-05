import React, { useState, useMemo } from 'react';
import { Search, Star, StarOff, X, TrendingUp } from 'lucide-react';
import { Stock, EXCHANGES } from '../data/mockData';
import { fmt, fmtPct, changeColor } from '../utils/market';

interface Props {
  stocks: Stock[];
  selectedExchanges: string[];
  onToggleExchange: (name: string) => void;
  watchlist: string[];
  onToggleWatch: (symbol: string) => void;
  onSelectStock: (stock: Stock) => void;
  activeView: 'all' | 'watchlist';
  onViewChange: (v: 'all' | 'watchlist') => void;
}

export const Sidebar: React.FC<Props> = ({
  stocks,
  selectedExchanges,
  onToggleExchange,
  watchlist,
  onToggleWatch,
  onSelectStock,
  activeView,
  onViewChange,
}) => {
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return stocks
      .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, stocks]);

  const watchlistStocks = useMemo(
    () => stocks.filter(s => watchlist.includes(s.symbol)),
    [stocks, watchlist]
  );

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-1 border-r border-navy-700/40 flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-navy-700/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search symbol or name…"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 150)}
            className="w-full bg-navy-800 border border-navy-700/50 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/20 transition-colors font-mono"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {/* Search dropdown */}
        {showSearch && searchResults.length > 0 && (
          <div className="absolute z-30 mt-1 w-56 bg-surface-2 border border-navy-700/60 rounded-lg shadow-xl overflow-hidden animate-slide-up">
            {searchResults.map(s => (
              <button
                key={s.symbol}
                onMouseDown={() => { onSelectStock(s); setQuery(''); }}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-navy-700/50 transition-colors text-left"
              >
                <span>
                  <span className="font-mono text-xs text-accent-cyan font-semibold">{s.symbol}</span>
                  <span className="text-xs text-slate-400 ml-2 truncate max-w-[100px]">{s.name}</span>
                </span>
                <span className={`font-mono text-xs ${changeColor(s.changePercent)}`}>{fmtPct(s.changePercent)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="flex p-2 gap-1 border-b border-navy-700/40">
        <button
          onClick={() => onViewChange('all')}
          className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
            activeView === 'all'
              ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700/40'
          }`}
        >
          All Markets
        </button>
        <button
          onClick={() => onViewChange('watchlist')}
          className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
            activeView === 'watchlist'
              ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700/40'
          }`}
        >
          <Star className="w-3 h-3" />
          Watchlist
          {watchlist.length > 0 && (
            <span className="bg-accent-amber/20 text-accent-amber rounded-full px-1.5 text-[10px]">{watchlist.length}</span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Exchange filters */}
        <div className="p-3 border-b border-navy-700/40">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Exchanges</p>
          <div className="flex flex-wrap gap-1">
            {EXCHANGES.map(ex => {
              const active = selectedExchanges.includes(ex.name);
              return (
                <button
                  key={ex.name}
                  onClick={() => onToggleExchange(ex.name)}
                  title={ex.label}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all ${
                    active
                      ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30'
                      : 'text-slate-500 border-navy-700/50 hover:text-slate-300 hover:border-slate-500/40'
                  }`}
                >
                  {ex.flag} {ex.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Watchlist stocks */}
        {activeView === 'watchlist' && (
          <div className="p-2">
            {watchlistStocks.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No stocks in watchlist</p>
                <p className="text-[10px] text-slate-600 mt-1">Click ★ on any card to add</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {watchlistStocks.map(s => (
                  <div key={s.symbol}
                    className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-navy-700/30 cursor-pointer transition-colors group"
                    onClick={() => onSelectStock(s)}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-accent-cyan truncate">{s.symbol}</p>
                      <p className="text-[10px] text-slate-500 truncate">{s.exchange}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-mono text-xs text-slate-200">{fmt(s.price, s.currency)}</p>
                      <p className={`font-mono text-[10px] ${changeColor(s.changePercent)}`}>{fmtPct(s.changePercent)}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onToggleWatch(s.symbol); }}
                      className="ml-1 text-accent-amber opacity-80 hover:opacity-100 flex-shrink-0"
                    >
                      <StarOff className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Top movers when all view */}
        {activeView === 'all' && (
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent-green" />
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Top Movers</p>
            </div>
            {[...stocks]
              .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
              .slice(0, 8)
              .map(s => (
                <div
                  key={s.symbol}
                  onClick={() => onSelectStock(s)}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-navy-700/30 cursor-pointer transition-colors"
                >
                  <span className="font-mono text-xs text-accent-cyan font-semibold">{s.symbol}</span>
                  <span className={`font-mono text-xs ${changeColor(s.changePercent)}`}>{fmtPct(s.changePercent)}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </aside>
  );
};
