# StockSense Terminal

A Bloomberg-terminal-inspired global stock market analytics SPA built with React, TypeScript, and Tailwind CSS. Features live price simulation across 10 global exchanges, interactive charts, sector heatmaps, and an AI-powered market assistant powered by **Groq + Llama 3.1 8B Instant**.

**Live demo (Vercel):** https://global-stock-market-app.vercel.app
**GitHub Pages:** https://somnathkarforma.github.io/global-stock-market-app/

---

## Features

| Feature | Description |
|---------|-------------|
| **Enterprise Header** | Professional branding banner with live Gainers / Losers / Avg-Change pulse, gradient grid overlay, PRO badge |
| **Live Prices** | 150+ stocks update every 5 seconds via ±random walk simulation with price flash animations |
| **Ticker Bar** | Scrolling marquee (240s, half-speed) — symbol · exchange badge · company name · price · ▲/▼ % change |
| **Live Stock Search** | Instant local matches + debounced Yahoo Finance live search covering all 10 exchanges — any listed equity worldwide. Inline error hint when live search fails. Optimistic immediate modal open on selection with chart-API fallback when primary quote API is unavailable |
| **AI Chat Autocomplete** | As you type in the AI chat box, a dropdown above the textarea shows instant local stock matches and live Yahoo Finance results. Selecting a suggestion inserts the symbol into your message at cursor position |
| **Exchange Filter** | Toggle any of 10 exchanges with live Open/Closed status indicators (green pulsing dot / grey) |
| **Watchlist** | Star stocks; persisted to `localStorage` |
| **Detail Modal** | Area chart (1D/1W/1M/3M/1Y/5Y), 12 fundamental metrics, news with sentiment |
| **Market Overview** | 10 global indices, sector heatmap, top 5 gainers/losers, real-time exchange status |
| **AI Chat** | Groq Llama 3.1 8B Instant via Vercel **Edge** function — no timeout, fast 1–2s responses. Live stock context injected per query for both local and non-local (Yahoo Finance-fetched) symbols, so AI prices always match the search panel |

---

## Tech Stack

```
Frontend    React 18 + TypeScript 5 (strict) + Vite 6
Styling     Tailwind CSS 3 — custom Bloomberg design tokens
Charts      Recharts 2 (AreaChart)
Icons       Lucide React
Fonts       JetBrains Mono (numbers) + DM Sans (UI) via Google Fonts
AI proxy    Vercel Edge Function (no timeout on hobby plan)
AI model    Groq API · llama-3.1-8b-instant
Live data   Yahoo Finance (via Vercel proxy) for search + quotes
Deploy      Vercel (production) + GitHub Pages (static)
```

---

## Project Structure

```
global-stock-market-app/
├── api/
│   ├── chat.ts               # Vercel Edge function — Groq AI proxy (no 10s limit)
│   ├── stock-search.ts       # Vercel function — Yahoo Finance symbol search
│   └── stock-quote.ts        # Vercel function — Yahoo Finance live quote fetcher
├── src/
│   ├── components/
│   │   ├── AIChat.tsx         # Collapsible AI chat panel
│   │   ├── MarketOverview.tsx # Indices, heatmap, gainers/losers, exchange status
│   │   ├── Sidebar.tsx        # Live search (local + Yahoo Finance), exchange filters, watchlist
│   │   ├── StockCard.tsx      # Card with live sparkline + flash
│   │   ├── StockDetailModal.tsx # Chart tabs + fundamentals + news modal
│   │   ├── StockGrid.tsx      # Responsive grid container
│   │   └── TickerBar.tsx      # Scrolling marquee ticker strip
│   ├── data/
│   │   └── mockData.ts        # 150+ stocks, 10 exchanges, indices, OHLCV generator
│   ├── hooks/
│   │   ├── useLivePrices.ts   # 5s price simulation hook
│   │   └── useWatchlist.ts    # localStorage watchlist CRUD hook
│   ├── utils/
│   │   └── market.ts          # Price formatters, exchange open/closed logic
│   ├── App.tsx                # Root layout + live stock cache for Yahoo-fetched stocks
│   ├── index.css              # Tailwind directives + global styles + animations
│   └── main.tsx               # React DOM entry point
├── .env                       # Local env vars (VITE_BASE_PATH only — no secrets)
├── vercel.json                # Vercel routing + function duration config
└── vite.config.ts             # Dev proxy for /api routes → Vercel
```

---

## Getting Started

### Prerequisites
- Node.js **20.x**
- npm 9+

### 1 — Clone and install

```bash
git clone https://github.com/somnathkarforma/global-stock-market-app.git
cd global-stock-market-app
npm install
```

### 2 — Run locally

```bash
npm run dev
```

Open http://localhost:5173/

All stock data, charts, filters, and watchlist work without any API key. The dev server proxies `/api/stock-search` and `/api/stock-quote` to the live Vercel deployment automatically.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server at localhost:5173 |
| `npm run build` | TypeScript check + production bundle → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run deploy:gh` | Build and push to `gh-pages` branch (GitHub Pages) |

---

## AI Chat

The AI chat uses **Groq API** with `llama-3.1-8b-instant` via a **Vercel Edge function**.

### Why Edge?
Vercel hobby plan serverless functions are hard-capped at **10 seconds**. The Edge runtime has no such cap, allowing the AI to respond reliably without timeouts.

### How it works
- **Minimal static system prompt** (~300 tokens) — no bulk stock table sent on every message
- **Per-query stock injection** — only stocks mentioned in the user's message get live data injected inline (up to 3 stocks)
- **Conversation history** trimmed to the last 6 messages
- Total per-request token cost: ~400–700 tokens — well within Groq's 12,000 TPM free limit

### Setup
1. Get a free key at https://console.groq.com/keys
2. In Vercel: **Settings → Environment Variables** → add `GROQ_API_KEY`
3. Redeploy: `npx vercel --prod`

### Live Stock Search
Search finds any stock on all 10 exchanges:
- **Local results** appear instantly from the 150+ mock stock catalog
- **Live results** stream in from Yahoo Finance after 350ms for any stock not in the local catalog
- Exchange codes, display names, and symbol suffixes (`.NS`, `.BO`, `.L`, `.HK`, `.T`) are all used for exchange inference so no valid symbol is silently discarded
- Clicking a live result opens the detail modal **immediately** with a basic profile; full quote data hydrates it once the API responds
- If Yahoo's quote endpoint is unavailable (e.g. upstream 401 for NSE/BSE symbols), the chart API is used as a fallback
- Inline error hints are shown in the dropdown for both search failures and quote-fetch failures

### AI Chat Autocomplete
The AI chat input now has a stock autocomplete dropdown:
- Type any part of a symbol or company name (e.g. `TATA`, `Apple`, `NFLX`)
- A dropdown appears **above** the textarea with instant local matches and live Yahoo Finance results
- Select any suggestion to insert the symbol at your cursor — the rest of your message is preserved
- Works for any globally listed equity, not just the built-in mock catalog

### AI Live Data Sync
The AI chat always uses the same real-time price data as the search panel:
- When you mention a stock from the local catalog (e.g. `AAPL`, `TCS`), its live simulated price is injected into the prompt
- When you mention a non-local symbol (e.g. `TATAELXSI.NS`, `TATAPOWER.NS`), the app fetches a live quote via `api/stock-quote` and injects that data before the message is sent to the AI
- This ensures the AI response reflects the exact same exchange rate, price, and change % shown in the left-panel search results

---

## Deployment

### Vercel (primary — AI enabled)
```bash
npx vercel --prod
```
Set `GROQ_API_KEY` in Vercel environment variables.

### GitHub Pages (static frontend)
Push to `main` — GitHub Actions (`.github/workflows/deploy.yml`) auto-builds and deploys. AI chat routes to the Vercel proxy.
