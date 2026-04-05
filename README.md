# StockSense Terminal

A Bloomberg-terminal-inspired global stock market analytics SPA built with React, TypeScript, and Tailwind CSS. Features live price simulation across 10 global exchanges, interactive charts, sector heatmaps, and an AI-powered market assistant powered by **Groq + Llama 3.3 70B**.

**Live demo (Vercel):** https://global-stock-market-app.vercel.app
**GitHub Pages:** https://somnathkarforma.github.io/global-stock-market-app/

> AI chat works on **both** deployments — enter your free Groq API key in the panel on first use.

---

## Screenshots

> Open the Vercel URL above to see the full application.

**Key views:**
- 🏦 Enterprise header — live market pulse (gainers/losers/avg change), PRO brand banner with gradient grid
- 📊 Stock cards grid with live sparklines and price flash animations
- 📈 Stock detail modal — Recharts area chart with 6 time periods + fundamentals + news
- 🌍 Market overview — global indices, sector heatmap, gainers/losers, exchange status
- 🤖 AI chat panel — Anthropic Claude with live stock context

---

## Features

| Feature | Description |
|---------|-------------|
| **Enterprise Header** | Professional branding banner with live Gainers / Losers / Avg-Change pulse, gradient grid overlay, PRO badge, tagline |
| **Live Prices** | All 37 stocks update every 5 seconds via a ±random walk simulation |
| **Ticker Bar** | Scrolling marquee — symbol (bold cyan) · exchange badge (cyan outline) · company name (light slate) · price · directional arrow (▲/▼) · % change |
| **Exchange Filter** | Toggle any of 10 exchanges (NYSE, NASDAQ, LSE, TSE, HKEX, SSE, Euronext, NSE, BSE, ASX) |
| **Watchlist** | Star stocks; persisted to `localStorage` |
| **Stock Search** | Autocomplete by symbol or company name |
| **Detail Modal** | Area chart (1D/1W/1M/3M/1Y/5Y), 12 fundamental metrics, news with sentiment |
| **Market Overview** | 10 global indices, sector heatmap, top 5 gainers/losers, real-time exchange status |
| **AI Chat** | Groq Llama 3.3 70B with live stock context, suggested prompts, typing indicator — works on GitHub Pages & Vercel |

---

## Tech Stack

```
Frontend    React 18 + TypeScript 5 (strict) + Vite 6
Styling     Tailwind CSS 3 — custom Bloomberg design tokens
Charts      Recharts 2 (AreaChart)
Icons       Lucide React
Fonts       JetBrains Mono (numbers) + DM Sans (UI) via Google Fonts
Backend     Vercel Serverless Functions (Node.js 20) — optional legacy proxy
AI          Groq API · llama-3.3-70b-versatile · called directly from browser
Deploy      Vercel + GitHub Pages (AI chat works on both)
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

> AI chat works on **both** GitHub Pages and Vercel — enter your free Groq API key directly in the chat panel.

### 3 — Run locally

```bash
npm run dev
```

Open http://localhost:5173/global-stock-market-app/

The app is fully functional locally — all stock data, charts, filters, and watchlist work without any API key. Enter your Groq API key in the AI chat panel to enable AI responses.

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

The AI chat uses **Groq API** with `llama-3.3-70b-versatile`. The API key is injected at **build time** via the `GROQ_API_KEY` repository secret — it is embedded as `VITE_GROQ_API_KEY` in the production bundle during the GitHub Actions build.

### Add the secret to your repository

1. Go to your repository **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `GROQ_API_KEY`, Value: your key from https://console.groq.com/keys
4. Click **Add secret**

The GitHub Actions workflow (`.github/workflows/deploy.yml`) picks it up automatically on every push to `main`.

### Local development

Create a `.env.local` file (git-ignored) in the project root:

```
VITE_GROQ_API_KEY=gsk_your_key_here
```

Then run `npm run dev` — the AI chat will work locally without any extra steps.

> ⚠️ Never commit `.env.local` or add `VITE_GROQ_API_KEY` to `.env` — it would be committed to git and exposed publicly.

---

## Deployment

### Vercel (AI chat enabled)

```bash
vercel --prod
```

- Production URL: https://global-stock-market-app.vercel.app
- Add `GROQ_API_KEY` as a production environment variable in the Vercel dashboard
- Vercel bakes it into the build as `VITE_GROQ_API_KEY` automatically

### GitHub Pages (AI chat enabled via GitHub Actions)

```bash
git push origin main
```

- The workflow in `.github/workflows/deploy.yml` builds and deploys automatically
- Reads `GROQ_API_KEY` from repository secrets and injects it at build time
- Live at: https://somnathkarforma.github.io/global-stock-market-app/

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
