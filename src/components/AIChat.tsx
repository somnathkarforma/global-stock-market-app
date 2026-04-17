import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, ChevronDown, Sparkles, TrendingUp, Globe, Loader2, X } from 'lucide-react';
import { Stock, isExchangeOpen } from '../data/mockData';
import { fmt, fmtPct, fmtMktCap } from '../utils/market';

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

const normalizeSymbol = (s: string) => s.toUpperCase().split('.')[0];

/** Extract the last contiguous non-space word the user is actively typing */
const getActiveWord = (text: string, cursorPos: number): string => {
  const before = text.slice(0, cursorPos);
  const match = before.match(/(\S+)$/);
  return match ? match[1] : '';
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  stocks: Stock[];
  onClose?: () => void;
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

// Minimal static system prompt — no bulk stock data to keep tokens low
const SYSTEM_PROMPT = `You are StockSense AI, a Bloomberg-style market intelligence assistant covering NYSE, NASDAQ, LSE, TSE, SSE, HKEX, Euronext, NSE, BSE, and ASX.
Be concise. For stock analysis use this structure:
**[Name] ([SYMBOL]) — [Exchange]**
- **Price:** [price] ([change]% today) | **Market Cap:** [cap] | **P/E:** [pe]
- **Div Yield:** [dy]% | **Beta:** [beta] | **ROE:** [roe]%
- **Analyst Target:** [tgt] ([upside/downside]%)
**Signals:** [Trend: bullish/bearish/neutral] | [Valuation vs peers] | [Key risk]
**Outlook:** [2-3 sentence actionable view]
_Educational only. Consult a licensed advisor before investing._
If live data is provided in the user message, use it. Otherwise use your training knowledge and state "⚠️ No live data — general knowledge only."`;

// Build a compact snippet for a single stock to inject inline
const buildStockContext = (s: Stock): string => {
  const open = isExchangeOpen(s.exchange);
  const f = s.fundamentals;
  return `[LIVE DATA] ${s.symbol} (${s.name}) | ${s.exchange} ${open ? 'OPEN🟢' : 'CLOSED🔴'} | ${fmt(s.price, s.currency)} (${s.changePercent > 0 ? '+' : ''}${s.changePercent.toFixed(2)}%) | PE:${f.peRatio} EPS:${f.eps} DY:${f.dividendYield}% beta:${f.beta} ROE:${f.roe}% tgt:${fmt(f.analystTarget, s.currency)} mktcap:${fmtMktCap(f.marketCap, s.currency)} sector:${s.sector}`;
};

// Find stocks mentioned in a message text that exist in local catalog (up to 3)
const findMentionedStocks = (text: string, stocks: Stock[]): Stock[] => {
  const q = text.toLowerCase();
  return stocks.filter(s =>
    q.includes(s.symbol.toLowerCase()) || q.includes(s.name.toLowerCase().split(' ').slice(0, 2).join(' '))
  ).slice(0, 3);
};

// Extract symbol-like tokens from text that are NOT in local catalog, then fetch live quotes
const SYMBOL_RE = /\b([A-Z]{2,12}(?:\.(NS|BO|L|HK|T|AX|PA|AS))?)\b/g;
const fetchLiveQuotes = async (text: string, localStocks: Stock[]): Promise<Stock[]> => {
  const localSymbols = new Set(localStocks.map(s => normalizeSymbol(s.symbol)));
  const upperText = text.toUpperCase();
  const candidates = new Set<string>();
  let m: RegExpExecArray | null;
  SYMBOL_RE.lastIndex = 0;
  while ((m = SYMBOL_RE.exec(upperText)) !== null) {
    const sym = m[1];
    if (!localSymbols.has(normalizeSymbol(sym))) candidates.add(sym);
  }
  if (candidates.size === 0) return [];
  const results = await Promise.all(
    [...candidates].slice(0, 3).map(async sym => {
      try {
        const res = await fetch(`${QUOTE_API}?symbol=${encodeURIComponent(sym)}`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const data = await res.json() as { quote?: Stock };
        return data.quote ?? null;
      } catch { return null; }
    })
  );
  return results.filter((s): s is Stock => s !== null && s.price > 0);
};

export const AIChat: React.FC<Props> = ({ stocks, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant',
    content: "Hello! I'm **StockSense AI**, your Bloomberg-style market assistant.\n\nI have live data on **" + stocks.length + ' global stocks** across 10 exchanges. Ask me about market trends, compare stocks, or explore fundamentals.',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mentionedStock, setMentionedStock] = useState<Stock | null>(null);
  // Autocomplete state
  const [, setAcWord] = useState('');
  const [acLocalResults, setAcLocalResults] = useState<Stock[]>([]);
  const [acLiveResults, setAcLiveResults] = useState<LiveResult[]>([]);
  const [acLoading, setAcLoading] = useState(false);
  const [acOpen, setAcOpen] = useState(false);
  const acDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // ── Autocomplete word tracking ─────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    const cursor = e.target.selectionStart ?? val.length;
    const word = getActiveWord(val, cursor);
    setAcWord(word);
    if (word.length < 2) {
      setAcOpen(false);
      setAcLocalResults([]);
      setAcLiveResults([]);
      if (acDebounceRef.current) clearTimeout(acDebounceRef.current);
      return;
    }
    const q = word.toLowerCase();
    const local = stocks
      .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 5);
    setAcLocalResults(local);
    setAcOpen(true);

    if (acDebounceRef.current) clearTimeout(acDebounceRef.current);
    acDebounceRef.current = setTimeout(async () => {
      setAcLoading(true);
      try {
        const res = await fetch(`${SEARCH_API}?q=${encodeURIComponent(word)}`);
        if (res.ok) {
          const data = await res.json() as { quotes?: LiveResult[] };
          const localSymbols = new Set(stocks.map(s => normalizeSymbol(s.symbol)));
          setAcLiveResults((data.quotes ?? []).filter(r => !localSymbols.has(normalizeSymbol(r.symbol))));
        }
      } catch { /* ignore */ } finally {
        setAcLoading(false);
      }
    }, 350);
  };

  /** Replace the active word with the chosen symbol in the textarea */
  const selectAcResult = (symbol: string) => {
    const ta = textareaRef.current;
    const cursor = ta?.selectionStart ?? input.length;
    const before = input.slice(0, cursor);
    const after = input.slice(cursor);
    const replaced = before.replace(/(\S+)$/, symbol);
    const newVal = replaced + (after.startsWith(' ') ? after : ' ' + after);
    setInput(newVal);
    setAcOpen(false);
    setAcLocalResults([]);
    setAcLiveResults([]);
    setAcWord('');
    // Restore focus to textarea
    setTimeout(() => {
      if (ta) {
        ta.focus();
        const pos = replaced.length + 1;
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  };


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
    setAcOpen(false);
    setAcLocalResults([]);
    setAcLiveResults([]);
    setAcWord('');
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s — well within Vercel 10s but retried client-side if needed
    try {
      const history = [...messages, userMsg].filter(m => m.id !== 'welcome').slice(-6); // keep last 6 for context
      // Inject live stock data for any stocks mentioned in the final user message
      const mentioned = findMentionedStocks(finalText, stocks);
      // Also fetch live quotes for any non-local symbols mentioned (e.g. TATAELXSI.NS)
      const liveQuotes = await fetchLiveQuotes(finalText, stocks);
      const allMentioned = [...mentioned, ...liveQuotes];
      const enrichedMessages = history.map((m, idx) => {
        if (idx === history.length - 1 && m.role === 'user' && allMentioned.length > 0) {
          const context = allMentioned.map(buildStockContext).join('\n');
          return { role: m.role, content: `${context}\n\n${m.content}` };
        }
        return { role: m.role, content: m.content };
      });
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...enrichedMessages],
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
      const message = err instanceof Error
        ? (err.name === 'AbortError' ? 'Request timed out — the AI took too long. Please try again.' : err.message)
        : 'Unknown error';
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ **Error:** ${message}` }]);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, [messages, stocks, loading]);

  const analyzeStock = useCallback((stock: Stock) => {
    setInput('');
    setMentionedStock(null);
    setAcOpen(false);
    setAcLocalResults([]);
    setAcLiveResults([]);
    setAcWord('');
    sendMessage(`Give me a full detailed analysis of ${stock.symbol} (${stock.name})`);
  }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
    if (e.key === 'Escape') { setAcOpen(false); }
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
    <div className={`flex flex-col bg-surface-1 border-l border-navy-700/40 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-full lg:w-80'} flex-shrink-0 h-full`}>
      <div className="flex items-center justify-between px-3 py-3 border-b border-navy-700/40">
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200">StockSense AI</p>
              <p className="text-[9px] text-slate-500">Llama 3.1 8B · Groq</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0" title="Close AI chat">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setIsCollapsed(c => !c)} className="hidden lg:block ml-auto p-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0" title={isCollapsed ? 'Expand AI chat' : 'Collapse AI chat'}>
            {isCollapsed ? <Bot className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 rotate-90" />}
          </button>
        </div>
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

            {/* Autocomplete dropdown — rendered above for visual alignment */}
            <div className="relative">
              {acOpen && (acLocalResults.length > 0 || acLiveResults.length > 0 || acLoading) && (
                <div className="absolute bottom-full mb-1 left-0 right-0 z-30 bg-surface-2 border border-navy-700/60 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {/* Local results */}
                  {acLocalResults.length > 0 && (
                    <>
                      <div className="px-3 pt-1.5 pb-0.5 text-[9px] text-slate-500 uppercase tracking-wider">Local</div>
                      {acLocalResults.map(s => (
                        <button
                          key={s.symbol}
                          onMouseDown={e => { e.preventDefault(); selectAcResult(s.symbol); }}
                          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-navy-700/50 transition-colors text-left"
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-xs text-accent-cyan font-semibold flex-shrink-0">{s.symbol}</span>
                            <span className="text-[10px] text-slate-400 truncate">{s.name}</span>
                          </span>
                          <span className="text-[9px] text-slate-500 flex-shrink-0 ml-1">{s.exchange}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Live results from exchanges */}
                  {(acLiveResults.length > 0 || acLoading) && (
                    <>
                      <div className="border-t border-navy-700/50 mx-2 mt-0.5" />
                      <div className="px-3 pt-1.5 pb-0.5 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5 text-slate-500" />
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider">Live from exchanges</span>
                        {acLoading && <Loader2 className="w-2.5 h-2.5 text-slate-600 animate-spin ml-1" />}
                      </div>
                      {acLiveResults.slice(0, 5).map(r => (
                        <button
                          key={r.symbol}
                          onMouseDown={e => { e.preventDefault(); selectAcResult(r.symbol); }}
                          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-navy-700/50 transition-colors text-left"
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-xs text-accent-cyan font-semibold flex-shrink-0">{r.symbol}</span>
                            <span className="text-[10px] text-slate-400 truncate">{r.name}</span>
                          </span>
                          <span className="text-[9px] text-slate-500 flex-shrink-0 ml-1">{r.exchDisp}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(() => setAcOpen(false), 150)}
                  placeholder="Ask about markets… or type a stock symbol"
                  rows={2}
                  className="flex-1 bg-navy-800 border border-navy-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/15 resize-none transition-colors"
                />
                <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                  className={`p-2 rounded-lg border transition-colors self-end ${input.trim() && !loading ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/20' : 'border-navy-700/40 text-slate-600 cursor-not-allowed'}`}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-[9px] text-slate-600 mt-1 text-center">Shift+Enter for new line · Enter to send</p>
          </div>
        </>
      )}
    </div>
  );
};
