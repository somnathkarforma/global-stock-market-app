# StockSense — Requirements

## Project Overview
StockSense is a Bloomberg-terminal-inspired stock market analytics Single Page Application (SPA). It is a pure frontend application — all stock data is simulated via a mock data module with realistic price animation. The Groq API key for AI chat is injected at build time via a GitHub Actions secret and baked into the production bundle as a Vite environment variable.

---

## Functional Requirements

### FR-01 — Live Ticker Bar
- Display a horizontally scrolling marquee of selected stock tickers across the top of the application
- Each ticker shows: symbol, current price, percentage change
- Price flashes green on uptick, red on downtick

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
- Collapsible right-side panel powered by **Groq API** (`llama-3.3-70b-versatile`)
- API key is injected at build time via `VITE_GROQ_API_KEY` (sourced from GitHub Actions secret `GROQ_API_KEY`)
- If the key is absent (e.g. local dev without `.env.local`), the panel shows a configuration error message
- Chat history maintained for the session
- System prompt includes a snapshot of current stock data (top 15 stocks by price)
- Suggested prompt chips shown on first load
- Typing indicator (animated dots) while awaiting response
- Supports basic markdown in responses (bold, bullet lists)
- Calls Groq API directly from the browser (`https://api.groq.com/openai/v1/chat/completions`) — Groq supports browser-side CORS
- Works on both GitHub Pages and Vercel deployments

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
| Key injection | Build-time via `VITE_GROQ_API_KEY` (GitHub Actions secret `GROQ_API_KEY`) |
| Call origin | Browser-side fetch (Groq supports CORS) |
| Key source | https://console.groq.com/keys (free tier available) |

### TR-03 — Typography
- **JetBrains Mono** — all prices, tickers, percentages (loaded via Google Fonts)
- **DM Sans** — all UI labels and prose (loaded via Google Fonts)

### TR-04 — Data
- 37 global stocks across NYSE, NASDAQ, LSE, TSE, HKEX, SSE, Euronext, NSE, BSE, ASX
- Historical OHLCV data is generated deterministically via a seeded pseudo-random walk per symbol
- 10 market indices with static representative values
- 5 mock news items per stock generated deterministically from a shared headline pool

### TR-05 — Deployment Targets
| Target | URL | AI Chat | Deploy trigger |
|--------|-----|---------|----------------|
| Vercel | https://global-stock-market-app.vercel.app | ✅ Enabled | `vercel --prod` or Vercel GitHub integration |
| GitHub Pages | https://somnathkarforma.github.io/global-stock-market-app/ | ✅ Enabled | Push to `main` triggers `.github/workflows/deploy.yml` |

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
