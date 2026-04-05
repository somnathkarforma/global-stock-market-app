# StockSense — Requirements

## Project Overview
StockSense is a Bloomberg-terminal-inspired stock market analytics Single Page Application (SPA). It is a pure frontend application — all stock data is simulated via a mock data module with realistic price animation. The Groq API key for AI chat is injected at build time via a GitHub Actions secret and baked into the production bundle as a Vite environment variable.

---

## Functional Requirements

### FR-01 — Live Ticker Bar
- Display a horizontally scrolling marquee of selected stock tickers across the top of the application
- Each ticker item shows in order: **symbol** (bold cyan mono) · **exchange badge** (cyan outline pill, e.g. `NSE`, `NASDAQ`) · **company short name** (first two words, light slate `#cbd5e1`, hidden on small screens) · **live price** (with currency symbol) · **directional arrow** (▲ green / ▼ red) + **% change**
- A vertical `│` divider separates each ticker entry for a Bloomberg-terminal aesthetic
- Price flashes green on uptick, red on downtick
- Subtle cyan top-border accent on the ticker strip

### FR-01b — Enterprise Header Banner
- Full-width banner at the very top of every page
- Displays **StockSense PRO** wordmark with tagline: *Global Markets Intelligence Terminal · Real-Time Analytics · AI-Powered Insights*
- Live market pulse strip (hidden on small screens): Gainers count, Losers count, Average % change across all stocks — all update in real time
- Gradient background (`navy-950 → navy-900 → navy-950`) with subtle cyan grid overlay and soft glow accents
- Navigation tabs (Stocks / Market Overview) and LIVE UTC clock integrated into the same banner row

### FR-01b — Enterprise Header Banner
- Full-width banner at the top of every page above the ticker bar
- Displays product name (**StockSense PRO**) with tagline: *Global Markets Intelligence Terminal · Real-Time Analytics · AI-Powered Insights*
- Live market pulse strip: Gainers count (green), Losers count (red), Average change % across all stocks
- Gradient background with subtle cyan grid overlay and glow accents
- Navigation (Stocks / Market Overview) and LIVE clock integrated into the same banner row

### FR-02 — Stock Cards Grid
- Display all stocks as cards in a responsive grid (1–4 columns depending on viewport)
- Each card shows: symbol, exchange badge, company name, live price, change %, inline sparkline
- Cards flash green/red on price updates
- Star icon to add/remove from watchlist

### FR-03 — Live Price Simulation
- All stock prices update every 5 seconds via a random walk algorithm (±0.1–0.8% per tick)
- Updates are non-blocking and do not cause full page re-renders

### FR-04 — Exchange Filtering
- Sidebar lists all 10 supported exchanges as toggle buttons
- Selecting one or more exchanges filters the stock grid to show only stocks from those exchanges
- Multiple exchanges can be active simultaneously

### FR-05 — Watchlist
- Users can star/unstar any stock
- Watchlist is persisted to `localStorage` under key `stocksense_watchlist_v2`
- A dedicated Watchlist view in the sidebar shows only starred stocks with live prices

### FR-06 — Stock Search
- Autocomplete search in the sidebar matches against stock symbol and company name
- Results show up to 8 matches
- Clicking a result opens the Stock Detail Modal

### FR-07 — Stock Detail Modal
- Opens on clicking any stock card or search result
- **Chart tab:** Area chart with 6 time-period selectors: 1D, 1W, 1M, 3M, 1Y, 5Y. Reference line at previous close. Chart colour is green for positive, red for negative day change
- **Fundamentals tab:** Grid of 12 metrics (P/E, Forward P/E, EPS, Dividend Yield, Beta, ROE, Revenue Growth, Profit Margin, Analyst Target, Market Cap, Avg Volume, Sector) plus an analyst upside progress bar
- **News tab:** 5 mock news items with source, relative timestamp, and sentiment badge (Bullish / Neutral / Bearish). Sentiment summary percentages shown at top

### FR-08 — Market Overview Page
- **Global Indices panel:** 10 market indices (SPX, NDX, FTSE, N225, HSI, DAX, CAC, SENSEX, SSEC, ASX200) with live-ish values
- **Sector Heatmap:** Colour-coded tiles for each sector showing average % change across all stocks in that sector. Intensity of colour scales with magnitude
- **Top Gainers / Top Losers:** Top 5 in each category, clickable to open modal
- **Exchange Status:** Live open/closed indicator for each of the 10 exchanges based on current UTC time and known trading hours

### FR-09 — AI Chat Panel
- Collapsible right-side panel powered by **Groq API** (`llama-3.3-70b-versatile`) via a **Vercel serverless proxy**
- API key (`GROQ_API_KEY`) is stored server-side on Vercel — never exposed to the browser
- Frontend calls `https://global-stock-market-app.vercel.app/api/chat`; Vercel proxy forwards to Groq
- Proxy retries automatically on HTTP 429 (rate limit) with exponential backoff — up to 3 attempts, respecting `retry-after` header
- System prompt includes top 60 stocks by market cap (compact pipe-delimited format) plus per-exchange Open/Closed status — ~3,800 tokens, well within the 12,000 TPM free-tier limit
- Auto stock mention detection: typing a symbol or company name shows a popup with live price and **market Open/Closed badge**
- Clicking the popup (or submitting a lone symbol) triggers a full deep-dive analysis
- Deep-dive analysis response includes: Live Price, **Market Status** (OPEN/CLOSED), Exchange/timezone, Market Cap, P/E, Dividend Yield, Analyst Target, Key Signals, Next Steps, Risk Disclaimer
- Suggested prompt chips shown on first load
- Typing indicator (animated dots) while awaiting response
- Supports markdown in responses (bold headers rendered in cyan, bullet lists, italic disclaimers)
- Works on both GitHub Pages (via Vercel proxy) and Vercel deployments

### FR-10 — Navigation
- Top navbar with app logo and two main views: **Stocks** and **Market Overview**
- Live indicator badge with spinning icon and current UTC time

---

## Non-Functional Requirements

### NFR-01 — Performance
- Initial page load under 3 seconds on a standard broadband connection
- Price tick updates must not cause layout shifts or dropped frames

### NFR-02 — Security
- The Groq API key is stored as a GitHub Actions secret (`GROQ_API_KEY`) and injected at build time as `VITE_GROQ_API_KEY`
- The key is never committed to git; `.env.local` is git-ignored
- No third-party analytics or tracking scripts

### NFR-03 — Responsiveness
- Layout adapts from 1-column (mobile) to 4-column (desktop ≥1280px) for the stock grid
- Sidebar collapses gracefully on smaller viewports

### NFR-04 — Accessibility
- Interactive elements have hover/focus states
- Colour is not the sole indicator of meaning (labels accompany all colour-coded values)

### NFR-05 — Browser Support
- Modern evergreen browsers: Chrome 120+, Firefox 120+, Edge 120+, Safari 17+
- No IE11 support required

---

## Technical Requirements

### TR-01 — Frontend Stack
| Requirement | Choice |
|-------------|--------|
| UI framework | React 18 (hooks only, no class components) |
| Language | TypeScript 5 (strict mode) |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 3 with custom Bloomberg-inspired design tokens |
| Charts | Recharts 2 (AreaChart with custom tooltip) |
| Icons | Lucide React |
| State | React built-in hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`) |
| Persistence | `localStorage` (watchlist only) |

### TR-02 — AI Integration
| Requirement | Choice |
|-------------|--------|
| Provider | Groq API |
| Model | `llama-3.3-70b-versatile` |
| Key storage | Server-side on Vercel (`GROQ_API_KEY` env var) — never in browser bundle |
| Call origin | Browser → Vercel proxy (`/api/chat`) → Groq |
| Rate limit handling | Auto retry up to 3× with exponential backoff on HTTP 429 |
| System prompt size | ~3,800 tokens (top 60 stocks by market cap, compact format) |
| Free TPM limit | 12,000 — prompt leaves ~8,200 tokens headroom per minute |
| CORS | Proxy allows `somnathkarforma.github.io`, `localhost:5173`, `localhost:4173` |
| Key source | https://console.groq.com/keys (free tier available) |

### TR-03 — Typography
- **JetBrains Mono** — all prices, tickers, percentages (loaded via Google Fonts)
- **DM Sans** — all UI labels and prose (loaded via Google Fonts)

### TR-04 — Data
- **130+ global stocks** across NYSE, NASDAQ, LSE, TSE, HKEX, SSE, Euronext, NSE, BSE, ASX
  - NSE: 22 stocks (Reliance, TCS, HDFC Bank, ICICI Bank, Airtel, HCL, Wipro, Bajaj Finance, HUL, Maruti, Sun Pharma, Dr. Reddy’s, Axis Bank, ITC, LTIMindtree, Tech Mahindra, NTPC, ONGC, Power Grid …)
  - BSE: 9 stocks, TSE: 8 stocks, HKEX: 7 stocks, SSE: 6 stocks, ASX: 8 stocks, NYSE: 8, NASDAQ: 9, LSE: 6, Euronext: 5
- Historical OHLCV data is generated deterministically via a seeded pseudo-random walk per symbol
- 10 market indices with static representative values
- 5 mock news items per stock generated deterministically from a shared headline pool

### TR-05 — Deployment Targets
| Target | URL | AI Chat | Deploy trigger |
|--------|-----|---------|----------------|
| Vercel | https://global-stock-market-app.vercel.app | ✅ Enabled | `vercel --prod` or Vercel GitHub integration |
| GitHub Pages | https://somnathkarforma.github.io/global-stock-market-app/ | ✅ Enabled | Push to `main` triggers `.github/workflows/deploy.yml` |

- **Exchange Open/Closed status** is shown:
  - In the Sidebar exchange filter buttons (green pulsing dot = OPEN, grey = CLOSED)
  - In the Stock Grid header when an exchange filter is selected
  - In the AI Chat mention popup alongside the stock symbol
  - In every AI deep-dive analysis response under “Market Status”

### TR-06 — Node.js Version
- Node.js **20.x** required (specified in `package.json` `engines` field for Vercel compatibility)

---

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `VITE_GROQ_API_KEY` | Build-time (Vite) | Groq API key — sourced from GitHub Actions secret `GROQ_API_KEY` or Vercel env var `GROQ_API_KEY`. Never commit to git. |
| `VITE_BASE_PATH` | Build-time (Vite) | Base URL path for GitHub Pages routing (e.g. `/global-stock-market-app/`) |

> For local development, create `.env.local` (git-ignored) and set `VITE_GROQ_API_KEY=gsk_...`.

---

## Out of Scope
- Real-time market data feeds (Yahoo Finance, Bloomberg, etc.)
- User authentication or accounts
- Portfolio tracking or trade execution
- Mobile native apps
- Server-side rendering (SSR)
