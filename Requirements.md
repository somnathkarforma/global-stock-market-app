# StockSense — Requirements

## Project Overview
StockSense is a Bloomberg-terminal-inspired stock market analytics Single Page Application (SPA). Stock data for 150+ stocks is simulated locally with realistic price animation. Live search and real-time quotes for any stock on the 10 supported exchanges are fetched via Yahoo Finance through Vercel proxy functions. The Groq AI key is stored server-side on Vercel via an Edge function and is never exposed to the browser.

---

## Functional Requirements

### FR-01 — Live Ticker Bar
- Horizontally scrolling marquee across the top of the app
- Speed: **240s** per full cycle (readable, half the original speed)
- Each item: **symbol** (bold cyan mono) · **exchange badge** (cyan outline) · **company short name** · **live price** · **▲/▼ % change** · `│` divider
- Price flashes green on uptick, red on downtick

### FR-01b — Enterprise Header Banner
- Full-width banner with **StockSense PRO** wordmark and tagline: *Global Markets Intelligence Terminal · Real-Time Analytics · AI-Powered Insights*
- Live market pulse: Gainers count (green), Losers count (red), Average change % — real-time
- Navigation tabs (Stocks / Market Overview) and LIVE UTC clock

### FR-02 — Stock Cards Grid
- Responsive grid (1–4 columns) with each card showing: symbol, exchange badge, company name, live price, change %, sparkline
- Cards flash green/red on price update; star icon for watchlist

### FR-03 — Live Price Simulation
- All mock stocks update every 5 seconds via ±0.1–0.8% random walk
- Non-blocking, no layout shifts or dropped frames

### FR-04 — Exchange Filtering
- Sidebar toggle buttons for all 10 exchanges
- Each button shows **Open/Closed status**: green pulsing dot (OPEN) / grey dot (CLOSED)
- Multiple exchanges can be active simultaneously; stock grid filters accordingly
- Stock Grid header shows Open/Closed badge when an exchange filter is active

### FR-05 — Watchlist
- Star/unstar any stock; persisted to `localStorage` key `stocksense_watchlist_v2`
- Dedicated Watchlist view in sidebar with live prices and remove button

### FR-06 — Stock Search (Local + Live Yahoo Finance)
- **Instant local matches** appear as the user types, from the 150+ mock stock catalog
- **Live Yahoo Finance search** (350ms debounce) returns matching equities from all 10 supported exchanges for stocks not in the local catalog
- Exchange inference uses symbol suffixes (`.NS` → NSE, `.BO` → BSE, `.L` → LSE, `.HK` → HKEX, `.T` → TSE) and `exchDisp` display name fallbacks — any valid global equity is returned regardless of exchange code mapping gaps
- CORS headers set to `*` on both `api/stock-search` and `api/stock-quote` (public read-only endpoints)
- Live results shown under a "Live from exchanges" section header with a loading spinner while the debounced request is in flight
- **Inline error hint** shown in the dropdown when live exchange search fails ("Live exchange search is temporarily unavailable. Showing local matches only.")
- Selecting a live result opens the detail modal **immediately** with a basic profile (symbol, name, exchange, currency), then hydrates it with full quote data once the API responds
- If `api/stock-quote` returns non-OK (including Yahoo upstream 401), the chart endpoint (`/v8/finance/chart/{symbol}`) is used as a fallback to obtain price, previous close, and volume
- A secondary inline warning is shown below the dropdown if the quote fetch for a selected result fails ("Live quote unavailable for SYMBOL. Showing basic profile.")
- Symbol de-duplication normalises symbols by stripping exchange suffixes (e.g. `TATAPOWER.NS` → `TATAPOWER`) before comparing with the local catalog
- Empty state shows "No results — try asking StockSense AI" prompt

### FR-07 — Stock Detail Modal
- Opens on clicking any stock card, search result, or watchlist item
- **Chart tab:** Area chart (1D/1W/1M/3M/1Y/5Y), reference line at previous close, green/red colouring
- **Fundamentals tab:** 12 metrics + analyst upside progress bar
- **News tab:** Up to 5 mock news items with sentiment badges; live-fetched stocks show "No news — ask AI" placeholder

### FR-08 — Market Overview Page
- 10 global indices, sector heatmap (colour intensity scales with magnitude), top 5 gainers/losers, exchange status table

### FR-09 — AI Chat Panel
- Collapsible right-side panel labelled **Llama 3.1 8B · Groq**
- Powered by Groq API (`llama-3.1-8b-instant`) via a **Vercel Edge function** — no execution timeout on hobby plan
- `GROQ_API_KEY` stored server-side as a Vercel environment variable — never in the browser bundle
- **Minimal static system prompt** (~300 tokens) — no bulk stock data table
- **Per-query context injection**: only stocks mentioned in the user message have their live data prepended (up to 3 stocks, ~80 tokens each)
- Conversation history trimmed to last 6 messages to keep tokens low
- Total per-request cost: ~400–700 tokens (well within 12,000 TPM free limit)
- 15s client-side `AbortController` timeout with a descriptive error message
- **Stock autocomplete dropdown** above the textarea: as the user types, the last word triggers instant local matches and a debounced (350ms) live Yahoo Finance search; results are shown in a scrollable dropdown split into "Local" and "Live from exchanges" sections; selecting a result replaces that word in the message with the stock symbol and restores cursor position
- Auto stock mention detection popup with live price and Open/Closed badge as user types (existing single-match chip)
- Clicking popup or typing a bare symbol triggers a full deep-dive analysis request
- Suggested prompt chips shown on first load
- Markdown rendering: bold cyan headers, bullet lists, italic disclaimers
- For stocks not in the local catalog: AI uses general knowledge with ⚠️ disclaimer

### FR-10 — Navigation
- Top navbar with two main views: Stocks and Market Overview
- Live spinning indicator and UTC clock

---

## Non-Functional Requirements

### NFR-01 — Performance
- Initial page load under 3 seconds on standard broadband
- Price tick updates non-blocking; no dropped frames

### NFR-02 — Security
- `GROQ_API_KEY` stored as Vercel environment variable — never committed to git
- `api/stock-search` and `api/stock-quote` are public read-only GET endpoints; they use `Access-Control-Allow-Origin: *` (no session data or mutation)
- No third-party analytics or tracking scripts

### NFR-03 — Responsiveness
- 1–4 column stock grid from mobile to desktop (≥1280px)
- Sidebar and AI panel collapse gracefully on smaller viewports

### NFR-04 — Accessibility
- Hover/focus states on all interactive elements
- Colour not the sole indicator of meaning (labels accompany all colour-coded values)

### NFR-05 — Browser Support
- Chrome 120+, Firefox 120+, Edge 120+, Safari 17+

---

## Technical Requirements

### TR-01 — Frontend Stack
| Requirement | Choice |
|-------------|--------|
| UI framework | React 18 (hooks only, no class components) |
| Language | TypeScript 5 (strict mode) |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 3 with custom Bloomberg design tokens |
| Charts | Recharts 2 (AreaChart with custom tooltip) |
| Icons | Lucide React |
| State | React built-in hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`) |
| Persistence | `localStorage` (watchlist only) |

### TR-02 — AI Integration
| Requirement | Choice |
|-------------|--------|
| Provider | Groq API |
| Model | `llama-3.1-8b-instant` (1–2s response time) |
| Key storage | Vercel environment variable `GROQ_API_KEY` (server-side only) |
| Proxy type | **Vercel Edge function** (`export const config = { runtime: 'edge' }`) |
| Call path | Browser → `vercel.app/api/chat` → Groq |
| System prompt | ~300 tokens (static, no stock table) |
| Per-request tokens | ~400–700 (system + up to 3 stock snippets + last 6 history messages) |
| TPM headroom | ~11,000+ of 12,000 free limit |
| Client timeout | 15s AbortController |
| CORS origins | `somnathkarforma.github.io`, `localhost:5173`, `localhost:4173` |

### TR-03 — Live Data APIs
| Endpoint | Purpose | Runtime |
|----------|---------|---------|
| `api/chat.ts` | Groq AI proxy | **Edge** (no timeout) |
| `api/stock-search.ts` | Yahoo Finance symbol search; exchange inference via code map + display name + symbol suffix fallbacks | Serverless (15s max) |
| `api/stock-quote.ts` | Yahoo Finance full quote with `/v8/finance/chart` fallback when quote endpoint returns 401 | Serverless (15s max) |

Yahoo Finance exchange code → app exchange mapping handled in each proxy. Only EQUITY and ETF types returned. All supported global symbols (including NSE/BSE suffix variants like `.NS`, `.BO`) are returned without hard-filtering by exchange set.

### TR-04 — Typography
- **JetBrains Mono** — all prices, tickers, percentages (Google Fonts)
- **DM Sans** — all UI labels and prose (Google Fonts)

### TR-05 — Stock Data
- **150+ global stocks** across NYSE, NASDAQ, LSE, TSE, HKEX, SSE, Euronext, NSE, BSE, ASX
- NYSE: BRK.B, JPM, XOM, JNJ, V, UNH, GS, SLF, MFC, BAC, WMT, MA, CVX, PG, KO, DIS, IBM, PFE, RTX, CAT (+more)
- Historical OHLCV generated deterministically via seeded pseudo-random walk per symbol
- Live quotes for any unlisted stock fetched on-demand from Yahoo Finance
- `Stock.news` is optional (`NewsItem[] | undefined`) — live-fetched stocks show an AI prompt placeholder in the News tab
- `Stock.isLive` flag marks Yahoo Finance-fetched stocks; App caches them in `liveStockCache` Map

### TR-06 — Deployment Targets
| Target | URL | AI Chat | Deploy trigger |
|--------|-----|---------|----------------|
| Vercel | https://global-stock-market-app.vercel.app | ✅ Enabled | `npx vercel --prod` |
| GitHub Pages | https://somnathkarforma.github.io/global-stock-market-app/ | ✅ Via Vercel proxy | Push to `main` → GitHub Actions |

### TR-07 — Dev Proxy
`vite.config.ts` proxies `/api/stock-search` and `/api/stock-quote` to `global-stock-market-app.vercel.app` during local development so live search works without a local Vercel runtime.
