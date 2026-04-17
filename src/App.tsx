import { useState, useMemo } from 'react';
import { BarChart2, Globe, RefreshCw, TrendingUp, TrendingDown, Activity, Menu, X, MessageSquare } from 'lucide-react';
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
  const [liveStockCache, setLiveStockCache] = useState<Map<string, Stock>>(new Map());
  const [activeView, setActiveView] = useState<'all' | 'watchlist'>('all');
  const [mainView, setMainView] = useState<MainView>('stocks');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

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

  // Selected stock with live price (falls back to liveStockCache for externally-fetched stocks)
  const selectedStockLive = useMemo(() => {
    if (!selectedStock) return null;
    return prices.get(selectedStock.symbol) ?? liveStockCache.get(selectedStock.symbol) ?? selectedStock;
  }, [selectedStock, prices, liveStockCache]);

  const handleSelectStock = (stock: Stock) => {
    // If it's a live-fetched stock not in mock data, cache it so selectedStockLive resolves
    if (stock.isLive) {
      setLiveStockCache(prev => new Map(prev).set(stock.symbol, stock));
    }
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

          <div className="relative flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-accent-cyan transition-colors"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Left — branding */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center shadow-lg shadow-accent-cyan/5 flex-shrink-0">
                <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-accent-cyan" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="font-mono text-base sm:text-xl font-bold text-white tracking-tight leading-none">Stock</span>
                  <span className="font-mono text-base sm:text-xl font-bold text-accent-cyan tracking-tight leading-none">Sense</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-navy-900 bg-accent-cyan rounded px-1 sm:px-1.5 py-0.5 uppercase tracking-wider leading-none">PRO</span>
                </div>
                <p className="hidden sm:block text-[10px] text-slate-500 mt-0.5 font-sans tracking-wide truncate">
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
            <div className="flex items-center gap-1 sm:gap-3">
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => setMainView('stocks')}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mainView === 'stocks'
                      ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Stocks</span>
                </button>
                <button
                  onClick={() => setMainView('overview')}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mainView === 'overview'
                      ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Market Overview</span>
                </button>
              </nav>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-navy-800/60 border border-navy-700/40 rounded-lg px-1.5 sm:px-2.5 py-1">
                  <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-accent-green animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-[9px] sm:text-[10px] font-mono font-semibold text-accent-green">LIVE</span>
                </div>
                <button
                  onClick={() => setAiChatOpen(!aiChatOpen)}
                  className="lg:hidden p-2 text-slate-400 hover:text-accent-cyan transition-colors"
                  aria-label="Toggle AI chat"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ticker bar */}
        <TickerBar stocks={tickerStocks} lastUpdated={lastUpdated} />
      </header>

      {/* Main content row */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left sidebar - mobile overlay */}
        <div className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />
        <div className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <Sidebar
            stocks={liveStocks}
            selectedExchanges={selectedExchanges}
            onToggleExchange={toggleExchange}
            watchlist={watchlist}
            onToggleWatch={toggleWatch}
            onSelectStock={(stock) => {
              handleSelectStock(stock);
              setSidebarOpen(false);
            }}
            activeView={activeView}
            onViewChange={setActiveView}
          />
        </div>

        {/* Center content */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 min-w-0 pb-20 md:pb-4">
          {mainView === 'stocks' ? (
            <>
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div>
                  <h1 className="text-xs sm:text-sm font-semibold text-slate-200">
                    {activeView === 'watchlist' ? 'Watchlist' : 
                     selectedExchanges.length > 0 ? `${selectedExchanges.join(', ')} Stocks` : 'All Markets'}
                  </h1>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 font-mono">
                    {filteredStocks.length} stocks · prices update every 5s
                  </p>
                </div>
                {/* Market open/closed badges for selected exchanges */}
                {selectedExchanges.length > 0 && (
                  <div className="hidden sm:flex flex-wrap gap-1.5 justify-end">
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
              <div className="mb-2 sm:mb-4">
                <h1 className="text-xs sm:text-sm font-semibold text-slate-200">Market Overview</h1>
                <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 font-mono">Global indices, sector heatmap & exchange status</p>
              </div>
              <MarketOverview stocks={liveStocks} onSelectStock={handleSelectStock} />
            </>
          )}
        </main>

        {/* Right AI panel - mobile overlay */}
        <div className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity ${aiChatOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setAiChatOpen(false)} />
        <div className={`fixed inset-y-0 right-0 z-50 lg:relative lg:z-0 transform transition-transform ${aiChatOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
          <AIChat stocks={liveStocks} onClose={() => setAiChatOpen(false)} />
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-navy-700/50 z-30 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          <button
            onClick={() => {
              setMainView('stocks');
              setSidebarOpen(false);
            }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              mainView === 'stocks'
                ? 'text-accent-cyan bg-accent-cyan/10'
                : 'text-slate-400'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[9px] font-medium">Stocks</span>
          </button>
          <button
            onClick={() => {
              setMainView('overview');
              setSidebarOpen(false);
            }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              mainView === 'overview'
                ? 'text-accent-cyan bg-accent-cyan/10'
                : 'text-slate-400'
            }`}
          >
            <Globe className="w-5 h-5" />
            <span className="text-[9px] font-medium">Markets</span>
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              sidebarOpen
                ? 'text-accent-cyan bg-accent-cyan/10'
                : 'text-slate-400'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-medium">Filter</span>
          </button>
          <button
            onClick={() => setAiChatOpen(!aiChatOpen)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              aiChatOpen
                ? 'text-accent-cyan bg-accent-cyan/10'
                : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-medium">AI Chat</span>
          </button>
        </div>
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
