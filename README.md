# StockSense Terminal

A Bloomberg-terminal-inspired global stock market analytics SPA built with React, TypeScript, and Tailwind CSS. Features live price simulation across 10 global exchanges, interactive charts, sector heatmaps, and an AI-powered market assistant via Anthropic Claude.

**Live demo:** https://global-stock-market-app.vercel.app *(AI chat enabled)*
**GitHub Pages:** https://somnathkarforma.github.io/global-stock-market-app/

---

## Screenshots

> Open the Vercel URL above to see the full application.

**Key views:**
- 📊 Stock cards grid with live sparklines and price flash animations
- 📈 Stock detail modal — Recharts area chart with 6 time periods + fundamentals + news
- 🌍 Market overview — global indices, sector heatmap, gainers/losers, exchange status
- 🤖 AI chat panel — Anthropic Claude with live stock context

---

## Features

| Feature | Description |
|---------|-------------|
| **Live Prices** | All 37 stocks update every 5 seconds via a ±random walk simulation |
| **Ticker Bar** | Scrolling marquee of 28 tickers with green/red flash on price change |
| **Exchange Filter** | Toggle any of 10 exchanges (NYSE, NASDAQ, LSE, TSE, HKEX, SSE, Euronext, NSE, BSE, ASX) |
| **Watchlist** | Star stocks; persisted to `localStorage` |
| **Stock Search** | Autocomplete by symbol or company name |
| **Detail Modal** | Area chart (1D/1W/1M/3M/1Y/5Y), 12 fundamental metrics, news with sentiment |
| **Market Overview** | 10 global indices, sector heatmap, top 5 gainers/losers, real-time exchange status |
| **AI Chat** | Anthropic Claude (`claude-sonnet-4-20250514`) with market data context, suggested prompts, typing indicator |

---

## Tech Stack

```
Frontend    React 18 + TypeScript 5 (strict) + Vite 6
Styling     Tailwind CSS 3 — custom Bloomberg design tokens
Charts      Recharts 2 (AreaChart)
Icons       Lucide React
Fonts       JetBrains Mono (numbers) + DM Sans (UI) via Google Fonts
Backend     Vercel Serverless Functions (Node.js 20) — AI proxy only
AI          Anthropic Claude claude-sonnet-4-20250514
Deploy      Vercel (primary) + GitHub Pages (static)
```

---

## Project Structure

```
global-stock-market-app/
├── api/
│   └── chat.ts               # Vercel serverless proxy for Anthropic API
├── src/
│   ├── components/
│   │   ├── AIChat.tsx         # Collapsible AI chat panel
│   │   ├── MarketOverview.tsx # Indices, heatmap, gainers/losers, exchange status
│   │   ├── Sidebar.tsx        # Exchange filters, watchlist, search
│   │   ├── StockCard.tsx      # Card with live sparkline + flash
│   │   ├── StockDetailModal.tsx # Chart tabs + fundamentals + news modal
│   │   ├── StockGrid.tsx      # Responsive grid container
│   │   └── TickerBar.tsx      # Scrolling marquee ticker strip
│   ├── data/
│   │   └── mockData.ts        # 37 stocks, 10 exchanges, indices, OHLCV generator
│   ├── hooks/
│   │   ├── useLivePrices.ts   # 5s price simulation hook
│   │   └── useWatchlist.ts    # localStorage watchlist CRUD hook
│   ├── utils/
│   │   └── market.ts          # Price formatters, exchange open/closed logic
│   ├── App.tsx                # Root layout
│   ├── index.css              # Tailwind directives + global styles + animations
│   ├── main.tsx               # React DOM entry point
│   └── vite-env.d.ts          # Vite env type declarations
├── .env                       # Local env vars (VITE_BASE_PATH only — no secrets)
├── index.html                 # HTML shell with Google Fonts
├── package.json
├── tailwind.config.cjs        # Custom Bloomberg colour palette + animations
├── tsconfig.json
├── vercel.json                # Vercel routing config
└── vite.config.ts
```

---

## Getting Started

### Prerequisites
- Node.js **20.x** (required — higher versions may work locally but Vercel uses 20)
- npm 9+

### 1 — Clone and install

```bash
git clone https://github.com/somnathkarforma/global-stock-market-app.git
cd global-stock-market-app
npm install
```

### 2 — Configure environment

Create a `.env` file in the project root:

```env
# GitHub Pages base path — required for local preview of GH Pages build
VITE_BASE_PATH=/global-stock-market-app/
```

> **AI chat requires Vercel deployment** — the API key lives server-side. See the [AI Chat Setup](#ai-chat-setup) section below.

### 3 — Run locally

```bash
npm run dev
```

Open http://localhost:5173/global-stock-market-app/

The app is fully functional locally — all stock data, charts, filters, and watchlist work without any API key. The AI chat panel will show an error until deployed to Vercel.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server at localhost:5173 |
| `npm run build` | TypeScript check + production bundle → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run deploy:gh` | Build and push to `gh-pages` branch (GitHub Pages) |

---

## AI Chat Setup

The AI chat uses Anthropic Claude via a **Vercel serverless proxy** (`api/chat.ts`). The API key is stored server-side — it is never included in the frontend bundle.

### Deploy to Vercel (required for AI chat)

**1. Install Vercel CLI**
```bash
npm install -g vercel
```

**2. Login and link project**
```bash
vercel login
vercel link
```

**3. Add your Anthropic API key**

Get your key from https://console.anthropic.com/settings/keys, then:

```bash
echo "sk-ant-api03-YOUR_KEY_HERE" | vercel env add ANTHROPIC_API_KEY production
```

**4. Deploy**
```bash
vercel --prod
```

The AI chat panel will now work at your Vercel URL.

> ⚠️ **Never** set `VITE_ANTHROPIC_API_KEY` in your `.env` — that would embed the key in the JavaScript bundle and expose it publicly.

---

## Deployment

### Vercel (recommended — AI chat enabled)

```bash
vercel --prod
```

- Production URL: https://global-stock-market-app.vercel.app
- `api/chat.ts` is automatically deployed as a serverless function
- Set `ANTHROPIC_API_KEY` as a production env variable in Vercel dashboard or via CLI

### GitHub Pages (static — no AI chat)

```bash
npm run deploy:gh
```

- Deploys the built `dist/` to the `gh-pages` branch
- Live at: https://somnathkarforma.github.io/global-stock-market-app/
- AI chat shows a "proxy not available" message on this host

---

## Design System

Custom Tailwind tokens defined in `tailwind.config.cjs`:

```
navy-950   #03060f   — page background
navy-900   #060d1f   — navbar / sidebar
navy-800   #0a1628   — inputs
surface-1  #0d1b2e   — cards
surface-2  #111e30   — modals / panels

accent.green  #00ff87  — gains, open status, positive sentiment
accent.red    #ff3b5c  — losses, negative sentiment
accent.cyan   #00d4ff  — primary interactive / highlights
accent.amber  #ffb800  — watchlist stars
```

---

## Data & Exchanges

| Exchange | Country | Currency | Stocks |
|----------|---------|----------|--------|
| NYSE | USA | USD | BRK.B, JPM, XOM, JNJ, V, UNH, GS |
| NASDAQ | USA | USD | AAPL, MSFT, NVDA, GOOGL, META, AMZN, TSLA, AVGO |
| LSE | UK | GBP | HSBA, AZN, SHEL, BP, ULVR |
| TSE | Japan | JPY | 7203 (Toyota), 6758 (Sony), 9984 (SoftBank) |
| HKEX | Hong Kong | HKD | 0700 (Tencent), 9988 (Alibaba), 1299 (AIA) |
| Euronext | EU | EUR | AIR (Airbus), MC (LVMH), SAN (Sanofi) |
| NSE | India | INR | RELIANCE, TCS |
| BSE | India | INR | HDFCBANK, INFY |
| SSE | China | CNY | 600519 (Kweichow Moutai), 601398 (ICBC) |
| ASX | Australia | AUD | BHP, CBA, CSL |

---

## License

MIT — free to use, modify and distribute.
