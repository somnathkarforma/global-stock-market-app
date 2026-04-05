import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, ChevronDown, Sparkles } from 'lucide-react';
import { Stock } from '../data/mockData';
import { fmt, fmtPct, fmtMktCap } from '../utils/market';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  stocks: Stock[];
}

const SUGGESTIONS = [
  'Which stocks have the highest dividend yield?',
  'Compare AAPL and MSFT fundamentals',
  'What are the top gainers today?',
  'Explain P/E ratio in simple terms',
  'Show me AI/tech stocks with best momentum',
  'What is the market sentiment today?',
];

const buildSystemPrompt = (stocks: Stock[]): string => {
  const topStocks = stocks.slice(0, 15).map(s =>
    `${s.symbol} (${s.name}, ${s.exchange}): price=${fmt(s.price, s.currency)}, change=${fmtPct(s.changePercent)}, PE=${s.fundamentals.peRatio}, marketCap=${fmtMktCap(s.fundamentals.marketCap, s.currency)}, sector=${s.sector}`
  ).join('\n');

  return `You are StockSense AI, a Bloomberg-style market intelligence assistant. You analyze stocks, market trends, and financial data. Be concise, data-driven, and professional—like a Wall Street analyst.

Current market data snapshot (first ${stocks.slice(0,15).length} stocks):
${topStocks}

Total stocks in database: ${stocks.length} across NYSE, NASDAQ, LSE, TSE, HKEX, SSE, Euronext, NSE, BSE, ASX.

Guidelines:
- Cite specific numbers when available
- Format prices with currency symbols
- Use bullet points for lists
- Keep responses focused and under 200 words unless asked for detail
- Never give actual financial advice; always note this is for educational purposes`;
};

export const AIChat: React.FC<Props> = ({ stocks }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m **StockSense AI**, your Bloomberg-style market assistant.\n\nI have live data on **' + stocks.length + ' global stocks** across 10 exchanges. Ask me about market trends, compare stocks, or explore fundamentals.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].filter(m => m.id !== 'welcome');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildSystemPrompt(stocks),
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `API error ${response.status}`);
      }

      const data = await response.json() as { content: Array<{ type: string; text: string }> };
      const assistantText = data.content?.find((b) => b.type === 'text')?.text || 'No response.';
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: assistantText }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ **Error:** ${message}\n\nThe AI proxy is only available on the **Vercel** deployment, not GitHub Pages.`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, stocks, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Simple markdown renderer
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-slate-100 mb-1">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const content = line.replace(/^[-•]\s/, '');
        const formatted = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        return <li key={i} className="text-slate-300 ml-3 mb-0.5 text-xs" dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
      if (!line.trim()) return <br key={i} />;
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-100">$1</strong>');
      return <p key={i} className="text-slate-300 text-xs mb-0.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className={`flex flex-col bg-surface-1 border-l border-navy-700/40 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'} flex-shrink-0`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-navy-700/40">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">StockSense AI</p>
              <p className="text-[9px] text-slate-500">Claude Sonnet</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(c => !c)}
          className="ml-auto p-1 text-slate-500 hover:text-slate-300 transition-colors"
          title={isCollapsed ? 'Expand AI chat' : 'Collapse AI chat'}
        >
          {isCollapsed ? <Bot className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 rotate-90" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent-cyan/10 border border-accent-cyan/20 text-slate-200 rounded-br-sm'
                      : 'bg-navy-900/60 border border-navy-700/30 text-slate-300 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="space-y-0.5">{renderContent(msg.content)}</div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-navy-900/60 border border-navy-700/30 rounded-xl rounded-bl-sm px-3 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Suggested</p>
              <div className="flex flex-col gap-1">
                {SUGGESTIONS.slice(0, 4).map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-[10px] text-slate-400 hover:text-accent-cyan bg-navy-900/40 hover:bg-navy-700/40 border border-navy-700/30 rounded-lg px-2 py-1.5 transition-colors leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-navy-700/40">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about markets…"
                rows={2}
                className="flex-1 bg-navy-800 border border-navy-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-cyan/40 focus:ring-1 focus:ring-accent-cyan/15 resize-none transition-colors"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className={`p-2 rounded-lg border transition-colors self-end ${
                  input.trim() && !loading
                    ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/20'
                    : 'border-navy-700/40 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] text-slate-600 mt-1 text-center">
              Shift+Enter for new line · Enter to send
            </p>
          </div>
        </>
      )}
    </div>
  );
};
