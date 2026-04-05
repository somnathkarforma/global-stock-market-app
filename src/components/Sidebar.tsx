import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Star, StarOff, X, TrendingUp, Loader2, Globe } from 'lucide-react';
import { Stock, EXCHANGES, isExchangeOpen } from '../data/mockData';
import { fmt, fmtPct, changeColor } from '../utils/market';

const SEARCH_API = import.meta.env.DEV
  ? '/api/stock-search'
  : 'https://global-stock-market-app.vercel.app/api/stock-search';

const QUOTE_API = import.meta.env.DEV
  ? '/api/stock-quote'
  : 'https://global-stock-market-app.vercel.app/api/stock-quote';

interface LiveResult {
  symbol: string;
  name: string;
  exchange: string;
  exchDisp: string;
}

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
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [selectingSymbol, setSelectingSymbol] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local mock matches (instant)
  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return stocks
      .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query, stocks]);

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) { setLiveResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLiveLoading(true);
      try {
        const res = await fetch(`${SEARCH_API}?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json() as { quotes: LiveResult[] };
          const localSymbols = new Set(stocks.map(s => s.symbol));
          // Only show live results not already in mock data
          setLiveResults((data.quotes ?? []).filter(q => !localSymbols.has(q.symbol)));
        }
      } catch {
        // silently fail — local results still shown
      } finally {
        setLiveLoading(false);
      }
    }, 350);
  }, [query, stocks]);

  // Fetch full quote and call onSelectStock for a live (non-mock) result
  const selectLiveStock = async (result: LiveResult) => {
    setSelectingSymbol(result.symbol);
    try {
      const res = await fetch(`${QUOTE_API}?symbol=${encodeURIComponent(result.symbol)}`);
      if (res.ok) {
        const data = await res.json() as { quote: Stock };
        onSelectStock(data.quote);
      }
    } catch { /* ignore */ } finally {
      setSelectingSymbol(null);
      setQuery('');
    }
  };

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
        {showSearch && query.trim() && (
          <div className="absolute z-30 mt-1 w-56 bg-surface-2 border border-navy-700/60 rounded-lg shadow-xl overflow-hidden animate-slide-up">
            {/* Local mock matches */}
            {localResults.map(s => (
              <button
                key={s.symbol}
                onMouseDown={() => { onSelectStock(s); setQuery(''); }}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-navy-700/50 transition-colors text-left"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-xs text-accent-cyan font-semibold flex-shrink-0">{s.symbol}</span>
                  <span className="text-[10px] text-slate-400 truncate">{s.name}</span>
                </span>
                <span className={`font-mono text-xs flex-shrink-0 ml-1 ${changeColor(s.changePercent)}`}>{fmtPct(s.changePercent)}</span>
              </button>
            ))}

            {/* Divider between local and live results */}
            {liveResults.length > 0 && (
              <>
                {localResults.length > 0 && <div className="border-t border-navy-700/50 mx-2" />}
                <div className="px-3 pt-1.5 pb-0.5 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5 text-slate-500" />
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">Live from exchanges</span>
                </div>
                {liveResults.slice(0, 5).map(r => (
                  <button
                    key={r.symbol}
                    onMouseDown={() => selectLiveStock(r)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-navy-700/50 transition-colors text-left"
                    disabled={selectingSymbol === r.symbol}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs text-accent-cyan font-semibold flex-shrink-0">{r.symbol}</span>
                      <span className="text-[10px] text-slate-400 truncate">{r.name}</span>
                    </span>
                    <span className="text-[9px] text-slate-500 flex-shrink-0 ml-1 flex items-center gap-1">
                      {selectingSymbol === r.symbol
                        ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        : r.exchange}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Loading state */}
            {liveLoading && liveResults.length === 0 && localResults.length === 0 && (
              <div className="px-3 py-3 flex items-center gap-2 text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs">Searching exchanges…</span>
              </div>
            )}

            {/* No results */}
            {!liveLoading && liveResults.length === 0 && localResults.length === 0 && (
              <div className="px-3 py-3 text-center">
                <p className="text-xs text-slate-400">No results for "<span className="text-accent-cyan">{query}</span>"</p>
                <p className="text-[10px] text-slate-500 mt-1">Try asking <span className="text-accent-cyan font-semibold">StockSense AI →</span></p>
              </div>
            )}
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
              const open = isExchangeOpen(ex.name as any);
              return (
                <button
                  key={ex.name}
                  onClick={() => onToggleExchange(ex.name)}
                  title={`${ex.label} — ${open ? 'OPEN' : 'CLOSED'}`}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all ${
                    active
                      ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30'
                      : 'text-slate-500 border-navy-700/50 hover:text-slate-300 hover:border-slate-500/40'
                  }`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    open ? 'bg-accent-green animate-pulse' : 'bg-slate-600'
                  }`} />
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
