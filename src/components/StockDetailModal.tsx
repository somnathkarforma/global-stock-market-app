import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { X, Star, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { Stock, getHistoryForPeriod, OHLCVPoint } from '../data/mockData';
import { fmt, fmtPct, fmtMktCap, fmtVolume, changeColor, relativeTime } from '../utils/market';

type Period = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

interface Props {
  stock: Stock;
  isWatched: boolean;
  onToggleWatch: (symbol: string) => void;
  onClose: () => void;
}

const PERIODS: Period[] = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ value: number }>; label?: string; currency: Stock['currency'] }> = ({
  active, payload, label, currency,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-1 border border-navy-700/60 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-slate-500 mb-1">{label}</p>
      <p className="font-mono text-sm text-accent-cyan font-bold">{fmt(payload[0].value, currency)}</p>
    </div>
  );
};

export const StockDetailModal: React.FC<Props> = ({ stock, isWatched, onToggleWatch, onClose }) => {
  const [period, setPeriod] = useState<Period>('1M');
  const [activeTab, setActiveTab] = useState<'chart' | 'fundamentals' | 'news'>('chart');

  const chartData = useMemo(() => {
    const points = getHistoryForPeriod(stock.symbol, stock.price, period);
    return points.map((p: OHLCVPoint) => ({ date: p.date, price: p.close }));
  }, [stock.symbol, stock.price, period]);

  const isPositive = stock.changePercent >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const f = stock.fundamentals;

  const sentimentCounts = stock.news.reduce(
    (acc, n) => { acc[n.sentiment]++; return acc; },
    { positive: 0, neutral: 0, negative: 0 }
  );
  const totalNews = stock.news.length || 1;

  return (
    <div className="modal-overlay animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-1 border border-navy-700/40 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-navy-700/40">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="font-mono text-xl font-bold text-accent-cyan tracking-wide">{stock.symbol}</h2>
                <span className="text-xs font-mono bg-navy-700/60 border border-navy-600/30 text-slate-400 px-2 py-0.5 rounded">
                  {stock.exchange}
                </span>
                <span className="text-xs font-mono bg-navy-700/60 border border-navy-600/30 text-slate-500 px-2 py-0.5 rounded">
                  {stock.currency}
                </span>
              </div>
              <p className="text-sm text-slate-400">{stock.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleWatch(stock.symbol)}
              className={`p-2 rounded-lg border transition-colors ${
                isWatched
                  ? 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber'
                  : 'border-navy-700/40 text-slate-500 hover:text-accent-amber hover:border-accent-amber/30'
              }`}
            >
              <Star className="w-4 h-4" fill={isWatched ? 'currentColor' : 'none'} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg border border-navy-700/40 text-slate-500 hover:text-slate-200 hover:border-slate-500/40 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Price summary */}
        <div className="flex items-center gap-6 px-5 py-3 bg-navy-900/40 border-b border-navy-700/40">
          <div>
            <p className="font-mono text-2xl font-bold text-white leading-none">{fmt(stock.price, stock.currency)}</p>
            <div className={`flex items-center gap-1.5 mt-1 ${changeColor(stock.changePercent)}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="font-mono text-sm font-semibold">{fmtPct(stock.changePercent)}</span>
              <span className="font-mono text-xs opacity-70">
                ({stock.change >= 0 ? '+' : ''}{fmt(Math.abs(stock.change), stock.currency)}) today
              </span>
            </div>
          </div>
          <div className="flex gap-4 ml-auto text-right">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">52W High</p>
              <p className="font-mono text-xs text-slate-300">{fmt(f.high52w, stock.currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">52W Low</p>
              <p className="font-mono text-xs text-slate-300">{fmt(f.low52w, stock.currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Mkt Cap</p>
              <p className="font-mono text-xs text-slate-300">{fmtMktCap(f.marketCap, stock.currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Volume</p>
              <p className="font-mono text-xs text-slate-300">{fmtVolume(stock.volume)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-navy-700/40">
          {(['chart', 'fundamentals', 'news'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-semibold capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-accent-cyan border-accent-cyan'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* CHART TAB */}
          {activeTab === 'chart' && (
            <div>
              <div className="flex gap-1 mb-4">
                {PERIODS.map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                      period === p
                        ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-navy-700/40 border border-transparent'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPositive ? '#00ff87' : '#ff3b5c'} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={isPositive ? '#00ff87' : '#ff3b5c'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#0f2040" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                    axisLine={{ stroke: '#0f2040' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fill: '#475569', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tickFormatter={v => fmt(v, stock.currency)}
                  />
                  <Tooltip content={<CustomTooltip currency={stock.currency} />} />
                  <ReferenceLine y={stock.previousClose} stroke="#475569" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={isPositive ? '#00ff87' : '#ff3b5c'}
                    strokeWidth={1.5}
                    fill="url(#areaGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: isPositive ? '#00ff87' : '#ff3b5c', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* FUNDAMENTALS TAB */}
          {activeTab === 'fundamentals' && (
            <div>
              <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">{stock.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ['P/E Ratio', f.peRatio.toFixed(1)],
                  ['Forward P/E', f.forwardPE.toFixed(1)],
                  ['EPS', fmt(f.eps, stock.currency)],
                  ['Dividend Yield', `${f.dividendYield.toFixed(2)}%`],
                  ['Beta', f.beta.toFixed(2)],
                  ['ROE', `${f.roe.toFixed(1)}%`],
                  ['Revenue Growth', `${f.revenueGrowth >= 0 ? '+' : ''}${f.revenueGrowth.toFixed(1)}%`],
                  ['Profit Margin', `${f.profitMargin.toFixed(1)}%`],
                  ['Analyst Target', fmt(f.analystTarget, stock.currency)],
                  ['Market Cap', fmtMktCap(f.marketCap, stock.currency)],
                  ['Avg Volume', fmtVolume(stock.avgVolume)],
                  ['Sector', stock.sector],
                ].map(([label, value]) => (
                  <div key={label} className="bg-navy-900/40 rounded-lg px-3 py-2.5 border border-navy-700/30">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="font-mono text-sm text-slate-200 font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              {/* Analyst upside */}
              <div className="mt-4 p-3 bg-navy-900/60 rounded-lg border border-navy-700/30">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Analyst Upside from Current</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-navy-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        f.analystTarget >= stock.price ? 'bg-accent-green' : 'bg-accent-red'
                      }`}
                      style={{ width: `${Math.min(100, Math.abs((f.analystTarget - stock.price) / stock.price * 100) * 3)}%` }}
                    />
                  </div>
                  <p className={`font-mono text-sm font-bold ${f.analystTarget >= stock.price ? 'text-accent-green' : 'text-accent-red'}`}>
                    {f.analystTarget >= stock.price ? '+' : ''}
                    {(((f.analystTarget - stock.price) / stock.price) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* NEWS TAB */}
          {activeTab === 'news' && (
            <div>
              {/* Sentiment summary */}
              <div className="flex gap-2 mb-4">
                {[
                  { key: 'positive', color: 'accent-green', label: 'Bullish' },
                  { key: 'neutral',  color: 'slate-400',    label: 'Neutral' },
                  { key: 'negative', color: 'accent-red',   label: 'Bearish' },
                ].map(({ key, color, label }) => {
                  const count = sentimentCounts[key as keyof typeof sentimentCounts];
                  const pct = Math.round(count / totalNews * 100);
                  return (
                    <div key={key} className="flex-1 bg-navy-900/50 rounded-lg px-3 py-2 border border-navy-700/30 text-center">
                      <p className={`font-mono text-lg font-bold text-${color}`}>{pct}%</p>
                      <p className="text-[10px] text-slate-500">{label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-3">
                {stock.news.map(item => (
                  <div key={item.id} className="p-3 bg-navy-900/40 rounded-lg border border-navy-700/30 hover:border-navy-600/50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs text-slate-200 leading-relaxed">{item.headline}</p>
                      <ExternalLink className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-500">{item.source}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-[10px] text-slate-600">{relativeTime(item.timestamp)}</span>
                      <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        item.sentiment === 'positive' ? 'bg-accent-green/10 text-accent-green' :
                        item.sentiment === 'negative' ? 'bg-accent-red/10 text-accent-red' :
                        'bg-slate-700/30 text-slate-400'
                      }`}>
                        {item.sentiment}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
