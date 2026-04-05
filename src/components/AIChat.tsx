import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, ChevronDown, Sparkles, TrendingUp } from 'lucide-react';
import { Stock, EXCHANGES, isExchangeOpen } from '../data/mockData';
import { fmt, fmtPct, fmtMktCap } from '../utils/market';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  stocks: Stock[];
}

const PROXY_URL = 'https://global-stock-market-app.vercel.app/api/chat';

const SUGGESTIONS = [
  'Which stocks have the highest dividend yield?',
  'Compare AAPL and MSFT fundamentals',
  'What are the top gainers today?',
  'Explain P/E ratio in simple terms',
  'Show me AI/tech stocks with best momentum',
  'What is the market sentiment today?',
];

const buildSystemPrompt = (stocks: Stock[]): string => {
  // Per-exchange open/closed status (compact)
  const exchangeStatus = EXCHANGES.map(ex => {
    const open = isExchangeOpen(ex.name as Parameters<typeof isExchangeOpen>[0]);
    return `${ex.name}:${open ? 'OPEN' : 'CLOSED'}`;
  }).join(' | ');

  // Limit to top 60 stocks by market cap to stay well within TPM limits
  const topStocks = [...stocks]
    .sort((a, b) => b.fundamentals.marketCap - a.fundamentals.marketCap)
    .slice(0, 60);

  // Compact per-stock line
  const stockLines = topStocks.map(s => {
    const open = isExchangeOpen(s.exchange);
    const f = s.fundamentals;
    return `${s.symbol}|${s.exchange}${open ? '' : '[C]'}|${fmt(s.price, s.currency)}|${s.changePercent > 0 ? '+' : ''}${s.changePercent.toFixed(2)}%|PE:${f.peRatio}|EPS:${f.eps}|DY:${f.dividendYield}%|beta:${f.beta}|ROE:${f.roe}%|tgt:${fmt(f.analystTarget, s.currency)}|mktcap:${fmtMktCap(f.marketCap, s.currency)}|${s.sector}`;
  }).join('\n');

  return `You are StockSense AI, a Bloomberg-style market intelligence assistant.
Exchange status: ${exchangeStatus}
Top ${topStocks.length} stocks by market cap. Format: SYMBOL|EXCHANGE[C=closed]|PRICE|CHANGE|PE|EPS|DivYield|Beta|ROE|AnalystTarget|MarketCap|Sector
${stockLines}

For stock analysis respond with this structure:
**[Name] ([SYMBOL]) Analysis**
- **Live Price:** [price] ([change] today)
- **Market Status:** [OPEN 🟢 / CLOSED 🔴] — [exchange] session
- **Market Cap:** [mktcap] | **P/E:** [PE] | **Div Yield:** [DY]%
- **Analyst Target:** [tgt] ([upside/downside]%)

**Key Signals**
- **Trend:** [bullish/bearish/neutral]
- **Valuation:** [vs sector peers]
- **ROE:** [ROE]% — [comment]

**Next Steps** *(educational only)*
- **Entry Zone / Target / Reasoning:** [concise]

_Risk disclaimer: Educational only. Consult a licensed advisor before investing._

For other questions be concise and cite exact numbers from the data above.

If asked about a stock NOT in the catalog above, use your broader financial knowledge to answer. Clearly state: "⚠️ No live data — using general knowledge." Then provide what you know about the company, sector, typical fundamentals, and analyst sentiment. Never refuse to answer about a stock just because it is not in the catalog.`;
};

export const AIChat: React.FC<Props> = ({ stocks }) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant',
    content: "Hello! I'm **StockSense AI**, your Bloomberg-style market assistant.\n\nI have live data on **" + stocks.length + ' global stocks** across 10 exchanges. Ask me about market trends, compare stocks, or explore fundamentals.',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mentionedStock, setMentionedStock] = useState<Stock | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect stock symbol or name mention as user types
  useEffect(() => {
    if (!input.trim()) { setMentionedStock(null); return; }
    const q = input.toLowerCase();
    const found = stocks.find(s =>
      q.includes(s.symbol.toLowerCase()) ||
      q.includes(s.name.toLowerCase().split(' ').slice(0, 2).join(' '))
    );
    setMentionedStock(found ?? null);
  }, [input, stocks]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    // If user types just a symbol/short name alone, promote to deep-dive analysis
    const trimmed = text.trim();
    const isSymbolOnly = /^[A-Z0-9.]+$/i.test(trimmed) && trimmed.length <= 10;
    const matchedBySymbol = isSymbolOnly && stocks.find(s => s.symbol.toLowerCase() === trimmed.toLowerCase());
    const finalText = matchedBySymbol
      ? `Give me a full detailed analysis of ${matchedBySymbol.symbol} (${matchedBySymbol.name})`
      : trimmed;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: finalText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setMentionedStock(null);
    setLoading(true);
    try {
      const history = [...messages, userMsg].filter(m => m.id !== 'welcome');
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: buildSystemPrompt(stocks) }, ...history.map(m => ({ role: m.role, content: m.content }))],
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: { message?: string } | string };
        const msg = typeof err.error === 'object' ? err.error?.message : err.error;
        throw new Error(msg || `API error ${response.status}`);
      }
      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const assistantText = data.choices?.[0]?.message?.content || 'No response.';
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: assistantText }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ **Error:** ${message}` }]);
    } finally {
      setLoading(false);
    }
  }, [messages, stocks, loading]);

  const analyzeStock = useCallback((stock: Stock) => {
    setInput('');
    setMentionedStock(null);
    sendMessage(`Give me a full detailed analysis of ${stock.symbol} (${stock.name})`);
  }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const renderContent = (text: string) => text.split('\n').map((line, i) => {
    // Section headers: **Title** on its own line
    if (/^\*\*[^*]+\*\*$/.test(line.trim()) && !line.trim().startsWith('- ')) {
      return <p key={i} className="font-bold text-accent-cyan text-xs mt-2 mb-1">{line.trim().slice(2, -2)}</p>;
    }
    // Italic disclaimer lines
    if (line.trim().startsWith('_') && line.trim().endsWith('_')) {
      return <p key={i} className="text-[10px] text-slate-500 italic mt-2 leading-relaxed">{line.trim().slice(1, -1)}</p>;
    }
    if (line.startsWith('- ') || line.startsWith('\u2022 ')) {
      const formatted = line.replace(/^[-\u2022]\s/, '').replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-100">$1</strong>');
      return <li key={i} className="text-slate-300 ml-3 mb-0.5 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
    }
    if (!line.trim()) return <br key={i} />;
    const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-100">$1</strong>');
    return <p key={i} className="text-slate-300 text-xs mb-0.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
  });

  return (
    <div className={`flex flex-col bg-surface-1 border-l border-navy-700/40 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'} flex-shrink-0`}>
      <div className="flex items-center justify-between px-3 py-3 border-b border-navy-700/40">
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200">StockSense AI</p>
              <p className="text-[9px] text-slate-500">Llama 3.3 70B · Groq</p>
            </div>
          </div>
        )}
        <button onClick={() => setIsCollapsed(c => !c)} className="ml-auto p-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0" title={isCollapsed ? 'Expand AI chat' : 'Collapse AI chat'}>
          {isCollapsed ? <Bot className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 rotate-90" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-accent-cyan/10 border border-accent-cyan/20 text-slate-200 rounded-br-sm' : 'bg-navy-900/60 border border-navy-700/30 text-slate-300 rounded-bl-sm'}`}>
                  {msg.role === 'assistant' ? <div className="space-y-0.5">{renderContent(msg.content)}</div> : <p>{msg.content}</p>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-navy-900/60 border border-navy-700/30 rounded-xl rounded-bl-sm px-3 py-3">
                  <div className="flex gap-1 items-center"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Suggested</p>
              <div className="flex flex-col gap-1">
                {SUGGESTIONS.slice(0, 4).map(s => (
                  <button key={s} onClick={() => sendMessage(s)} className="text-left text-[10px] text-slate-400 hover:text-accent-cyan bg-navy-900/40 hover:bg-navy-700/40 border border-navy-700/30 rounded-lg px-2 py-1.5 transition-colors leading-snug">{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 border-t border-navy-700/40">
            {mentionedStock && (
              <div
                className="mb-2 px-3 py-2 rounded-lg bg-navy-900/80 border border-accent-cyan/20 cursor-pointer hover:border-accent-cyan/50 hover:bg-navy-800/80 transition-colors group"
                onClick={() => analyzeStock(mentionedStock)}
                title={`Click to analyze ${mentionedStock.symbol}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-accent-cyan">{mentionedStock.symbol}</span>
                      <span className="text-[9px] text-slate-600">· {mentionedStock.exchange}</span>
                      {(() => {
                        const open = isExchangeOpen(mentionedStock.exchange);
                        return (
                          <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded ${
                            open
                              ? 'text-accent-green bg-accent-green/10 border border-accent-green/20'
                              : 'text-slate-400 bg-slate-700/40 border border-slate-600/30'
                          }`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                              open ? 'bg-accent-green animate-pulse' : 'bg-slate-500'
                            }`} />
                            {open ? 'OPEN' : 'CLOSED'}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{mentionedStock.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-xs font-mono font-semibold ${mentionedStock.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {fmt(mentionedStock.price, mentionedStock.currency)}
                      </p>
                      <p className={`text-[9px] font-mono ${mentionedStock.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {mentionedStock.changePercent >= 0 ? '+' : ''}{fmtPct(mentionedStock.changePercent)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 text-[9px] text-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                      <TrendingUp className="w-3 h-3" />
                      <span>Analyze</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about markets…" rows={2}
                className="flex-1 bg-navy-800 border border-navy-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/15 resize-none transition-colors"
              />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                className={`p-2 rounded-lg border transition-colors self-end ${input.trim() && !loading ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/20' : 'border-navy-700/40 text-slate-600 cursor-not-allowed'}`}>
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] text-slate-600 mt-1 text-center">Shift+Enter for new line · Enter to send</p>
          </div>
        </>
      )}
    </div>
  );
};
