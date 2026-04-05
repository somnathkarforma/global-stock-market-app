import { useState, useMemo } from 'react';
import { BarChart2, Globe, RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { STOCKS, TICKER_BAR_SYMBOLS, Stock, EXCHANGES, isExchangeOpen } from './data/mockData';
import { useLivePrices } from './hooks/useLivePrices';
import { useWatchlist } from './hooks/useWatchlist';
import { TickerBar } from './components/TickerBar';
import { Sidebar } from './components/Sidebar';
import { StockGrid } from './components/StockGrid';
import { StockDetailModal } from './components/StockDetailModal';
import { MarketOverview } from './components/MarketOverview';
import { AIChat } from './components/AIChat';

type MainView = 'stocks' | 'overview';

export default function App() {
  const { prices, lastUpdated } = useLivePrices();
  const { watchlist, toggle: toggleWatch, has: isWatched } = useWatchlist();
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [activeView, setActiveView] = useState<'all' | 'watchlist'>('all');
  const [mainView, setMainView] = useState<MainView>('stocks');

  // Merge live prices into stocks
  const liveStocks = useMemo(() => {
    return STOCKS.map(s => prices.get(s.symbol) ?? s);
  }, [prices]);

  // Ticker bar stocks
  const tickerStocks = useMemo(() =>
    TICKER_BAR_SYMBOLS.map(sym => prices.get(sym) ?? STOCKS.find(s => s.symbol === sym)!).filter(Boolean),
    [prices]
  );

  const toggleExchange = (name: string) => {
    setSelectedExchanges(prev =>
      prev.includes(name) ? prev.filter(e => e !== name) : [...prev, name]
    );
  };

  // Filtered stock list
  const filteredStocks = useMemo(() => {
    let list = liveStocks;
    if (selectedExchanges.length > 0) {
      list = list.filter(s => selectedExchanges.includes(s.exchange));
    }
    if (activeView === 'watchlist') {
      list = list.filter(s => watchlist.includes(s.symbol));
    }
    return list;
  }, [liveStocks, selectedExchanges, activeView, watchlist]);

  // Selected stock with live price
  const selectedStockLive = useMemo(() => {
    if (!selectedStock) return null;
    return prices.get(selectedStock.symbol) ?? selectedStock;
  }, [selectedStock, prices]);

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
  };

  // Market summary stats for header banner
  const marketStats = useMemo(() => {
    const gainers = liveStocks.filter(s => s.changePercent > 0).length;
    const losers = liveStocks.filter(s => s.changePercent < 0).length;
    const avgChange = liveStocks.reduce((acc, s) => acc + s.changePercent, 0) / liveStocks.length;
    return { gainers, losers, avgChange };
  }, [liveStocks]);

  return (
    <div className="flex flex-col h-screen bg-navy-950 overflow-hidden">
      {/* Fixed top navbar */}
      <header className="flex-shrink-0 bg-navy-900 border-b border-navy-700/50 z-20">

        {/* ── Enterprise Hero Banner ───────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border-b border-navy-700/30">
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: 'linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          {/* Glow accents */}
          <div className="absolute left-1/4 top-0 w-64 h-8 bg-accent-cyan/5 blur-2xl rounded-full" />
          <div className="absolute right-1/4 top-0 w-48 h-8 bg-accent-green/5 blur-2xl rounded-full" />

          <div className="relative flex items-center justify-between px-4 py-3">
            {/* Left — branding */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center shadow-lg shadow-accent-cyan/5">
                <BarChart2 className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-white tracking-tight leading-none">Stock</span>
                  <span className="font-mono text-xl font-bold text-accent-cyan tracking-tight leading-none">Sense</span>
                  <span className="text-[9px] font-bold text-navy-900 bg-accent-cyan rounded px-1.5 py-0.5 uppercase tracking-wider leading-none">PRO</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 font-sans tracking-wide">
                  Global Markets Intelligence Terminal &nbsp;·&nbsp; Real-Time Analytics &nbsp;·&nbsp; AI-Powered Insights
                </p>
              </div>
            </div>

            {/* Center — live market pulse */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-navy-800/60 border border-navy-700/40 rounded-lg px-3 py-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-accent-green" />
                <span className="text-[10px] font-mono text-accent-green font-semibold">{marketStats.gainers} Gainers</span>
              </div>
              <div className="flex items-center gap-1.5 bg-navy-800/60 border border-navy-700/40 rounded-lg px-3 py-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-accent-red" />
                <span className="text-[10px] font-mono text-accent-red font-semibold">{marketStats.losers} Losers</span>
              </div>
              <div className="flex items-center gap-1.5 bg-navy-800/60 border border-navy-700/40 rounded-lg px-3 py-1.5">
                <Activity className="w-3.5 h-3.5 text-accent-amber" />
                <span className={`text-[10px] font-mono font-semibold ${marketStats.avgChange >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  Avg {marketStats.avgChange >= 0 ? '+' : ''}{marketStats.avgChange.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Right — nav + live clock */}
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1">
                <button
                  onClick={() => setMainView('stocks')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mainView === 'stocks'
                      ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Stocks
                </button>
                <button
                  onClick={() => setMainView('overview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mainView === 'overview'
                      ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Market Overview
                </button>
              </nav>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-navy-800/60 border border-navy-700/40 rounded-lg px-2.5 py-1">
                  <RefreshCw className="w-3 h-3 text-accent-green animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-[10px] font-mono font-semibold text-accent-green">LIVE</span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono hidden sm:block">
                  {new Date().toUTCString().slice(17, 25)} UTC
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ticker bar */}
        <TickerBar stocks={tickerStocks} lastUpdated={lastUpdated} />
      </header>

      {/* Main content row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <Sidebar
          stocks={liveStocks}
          selectedExchanges={selectedExchanges}
          onToggleExchange={toggleExchange}
          watchlist={watchlist}
          onToggleWatch={toggleWatch}
          onSelectStock={handleSelectStock}
          activeView={activeView}
          onViewChange={setActiveView}
        />

        {/* Center content */}
        <main className="flex-1 overflow-y-auto p-4 min-w-0">
          {mainView === 'stocks' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-sm font-semibold text-slate-200">
                    {activeView === 'watchlist' ? 'Watchlist' : 
                     selectedExchanges.length > 0 ? `${selectedExchanges.join(', ')} Stocks` : 'All Markets'}
                  </h1>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {filteredStocks.length} stocks · prices update every 5s
                  </p>
                </div>
                {/* Market open/closed badges for selected exchanges */}
                {selectedExchanges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {selectedExchanges.map(exName => {
                      const ex = EXCHANGES.find(e => e.name === exName);
                      const open = isExchangeOpen(exName as any);
                      return (
                        <div key={exName} className="flex items-center gap-1 px-2 py-1 rounded-lg border bg-navy-900/60 border-navy-700/40">
                          <span className="text-xs">{ex?.flag}</span>
                          <span className="font-mono text-[10px] text-slate-300 font-semibold">{exName}</span>
                          <span className={`flex items-center gap-0.5 text-[9px] font-bold ml-1 ${
                            open ? 'text-accent-green' : 'text-slate-500'
                          }`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                              open ? 'bg-accent-green animate-pulse' : 'bg-slate-600'
                            }`} />
                            {open ? 'OPEN' : 'CLOSED'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <StockGrid
                stocks={filteredStocks}
                lastUpdated={lastUpdated}
                watchlist={watchlist}
                onToggleWatch={toggleWatch}
                onSelectStock={handleSelectStock}
              />
            </>
          ) : (
            <>
              <div className="mb-4">
                <h1 className="text-sm font-semibold text-slate-200">Market Overview</h1>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Global indices, sector heatmap & exchange status</p>
              </div>
              <MarketOverview stocks={liveStocks} onSelectStock={handleSelectStock} />
            </>
          )}
        </main>

        {/* Right AI panel */}
        <AIChat stocks={liveStocks} />
      </div>

      {/* Stock detail modal */}
      {selectedStockLive && (
        <StockDetailModal
          stock={selectedStockLive}
          isWatched={isWatched(selectedStockLive.symbol)}
          onToggleWatch={toggleWatch}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}
