// ─────────────────────────────────────────────────────────────────────────────
// mockData.ts  —  StockSense realistic market data module
// 60+ global stocks across 10 exchanges, OHLCV history generators,
// market index data, exchange trading hours.
// ─────────────────────────────────────────────────────────────────────────────

export type Exchange = 'NYSE' | 'NASDAQ' | 'LSE' | 'TSE' | 'SSE' | 'HKEX' | 'Euronext' | 'NSE' | 'BSE' | 'ASX';
export type Currency = 'USD' | 'GBP' | 'JPY' | 'HKD' | 'EUR' | 'INR' | 'CNY' | 'AUD';
export type Sector = 'Technology' | 'Finance' | 'Healthcare' | 'Energy' | 'Consumer' | 'Industrial' | 'Materials' | 'Utilities' | 'Real Estate' | 'Telecom';

export interface OHLCVPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface StockFundamentals {
  peRatio: number;
  eps: number;
  marketCap: number;       // in billions
  high52w: number;
  low52w: number;
  dividendYield: number;   // percent
  beta: number;
  roe: number;             // percent
  analystTarget: number;
  forwardPE: number;
  revenueGrowth: number;   // percent YoY
  profitMargin: number;    // percent
}

export interface Stock {
  symbol: string;
  name: string;
  exchange: Exchange;
  currency: Currency;
  sector: Sector;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  fundamentals: StockFundamentals;
  description: string;
  news: NewsItem[];
}

// ─── Seeded pseudo-random (deterministic per symbol) ────────────────────────
const seededRng = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return () => {
    hash = ((hash << 5) - hash + 1) | 0;
    return Math.abs(hash) / 2147483647;
  };
};

// ─── Historical OHLCV generator ─────────────────────────────────────────────
export const generateHistory = (
  symbol: string,
  basePrice: number,
  points: number,
  intervalDays: number
): OHLCVPoint[] => {
  const rng = seededRng(symbol + points);
  const data: OHLCVPoint[] = [];
  let price = basePrice * (0.75 + rng() * 0.5); // start at 75–125% of base
  const now = Date.now();

  for (let i = points; i >= 0; i--) {
    const drift = (rng() - 0.475) * 0.022;
    const vol = 0.008 + rng() * 0.025;
    price = Math.max(price * (1 + drift), 0.5);

    const open = price * (1 + (rng() - 0.5) * vol * 0.6);
    const close = price * (1 + (rng() - 0.5) * vol * 0.6);
    const high = Math.max(open, close) * (1 + rng() * vol * 0.4);
    const low = Math.min(open, close) * (1 - rng() * vol * 0.4);
    const volume = Math.round((500_000 + rng() * 50_000_000));

    data.push({
      date: new Date(now - i * intervalDays * 86_400_000).toISOString().slice(0, 10),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });
  }
  // Last point matches current price
  if (data.length) {
    const last = data[data.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.high, basePrice);
    last.low = Math.min(last.low, basePrice);
  }
  return data;
};

export const getHistoryForPeriod = (symbol: string, basePrice: number, period: '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'): OHLCVPoint[] => {
  const cfg: Record<string, [number, number]> = {
    '1D': [390, 1 / 390],
    '1W': [35, 0.2],
    '1M': [30, 1],
    '3M': [90, 1],
    '1Y': [252, 1],
    '5Y': [260, 7],
  };
  const [pts, days] = cfg[period];
  return generateHistory(symbol, basePrice, pts, days);
};

// ─── Exchange metadata ───────────────────────────────────────────────────────
export interface ExchangeInfo {
  name: Exchange;
  label: string;
  currency: Currency;
  timezone: string;
  openUTC: number;   // hour in UTC
  closeUTC: number;
  flag: string;
}

export const EXCHANGES: ExchangeInfo[] = [
  { name: 'NYSE',     label: 'New York Stock Exchange',  currency: 'USD', timezone: 'EST',      openUTC: 14, closeUTC: 21, flag: '🇺🇸' },
  { name: 'NASDAQ',   label: 'NASDAQ',                   currency: 'USD', timezone: 'EST',      openUTC: 14, closeUTC: 21, flag: '🇺🇸' },
  { name: 'LSE',      label: 'London Stock Exchange',    currency: 'GBP', timezone: 'GMT',      openUTC: 8,  closeUTC: 16, flag: '🇬🇧' },
  { name: 'TSE',      label: 'Tokyo Stock Exchange',     currency: 'JPY', timezone: 'JST',      openUTC: 0,  closeUTC: 6,  flag: '🇯🇵' },
  { name: 'SSE',      label: 'Shanghai Stock Exchange',  currency: 'CNY', timezone: 'CST',      openUTC: 1,  closeUTC: 7,  flag: '🇨🇳' },
  { name: 'HKEX',     label: 'Hong Kong Exchange',       currency: 'HKD', timezone: 'HKT',      openUTC: 1,  closeUTC: 8,  flag: '🇭🇰' },
  { name: 'Euronext', label: 'Euronext Paris',           currency: 'EUR', timezone: 'CET',      openUTC: 7,  closeUTC: 15, flag: '🇪🇺' },
  { name: 'NSE',      label: 'National Stock Exchange',  currency: 'INR', timezone: 'IST',      openUTC: 3,  closeUTC: 10, flag: '🇮🇳' },
  { name: 'BSE',      label: 'Bombay Stock Exchange',    currency: 'INR', timezone: 'IST',      openUTC: 3,  closeUTC: 10, flag: '🇮🇳' },
  { name: 'ASX',      label: 'Australian Securities Exchange', currency: 'AUD', timezone: 'AEST', openUTC: 23, closeUTC: 5, flag: '🇦🇺' },
];

export const isExchangeOpen = (exchange: Exchange): boolean => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcDecimal = utcHour + utcMinute / 60;
  const utcDay = now.getUTCDay(); // 0=Sun, 6=Sat
  if (utcDay === 0 || utcDay === 6) return false;
  const ex = EXCHANGES.find(e => e.name === exchange);
  if (!ex) return false;
  if (ex.openUTC < ex.closeUTC) return utcDecimal >= ex.openUTC && utcDecimal < ex.closeUTC;
  // overnight (ASX crosses midnight)
  return utcDecimal >= ex.openUTC || utcDecimal < ex.closeUTC;
};

// ─── Currency formatting ──────────────────────────────────────────────────────
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$', GBP: '£', JPY: '¥', HKD: 'HK$', EUR: '€', INR: '₹', CNY: '¥', AUD: 'A$',
};

export const formatPrice = (price: number, currency: Currency, compact = false): string => {
  const sym = CURRENCY_SYMBOLS[currency];
  if (compact && price >= 1000) return `${sym}${(price / 1000).toFixed(1)}k`;
  const decimals = currency === 'JPY' || currency === 'INR' ? (price > 1000 ? 2 : 2) : 2;
  return `${sym}${price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

export const formatMarketCap = (bn: number, currency: Currency): string => {
  const sym = CURRENCY_SYMBOLS[currency];
  if (bn >= 1000) return `${sym}${(bn / 1000).toFixed(2)}T`;
  if (bn >= 1) return `${sym}${bn.toFixed(1)}B`;
  return `${sym}${(bn * 1000).toFixed(0)}M`;
};

// ─── Market indices ───────────────────────────────────────────────────────────
export interface MarketIndex {
  id: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  exchange: Exchange;
  currency: Currency;
}

export const MARKET_INDICES: MarketIndex[] = [
  { id: 'SPX',  name: 'S&P 500',            value: 5482.87, change: 12.34,   changePercent: 0.23,  exchange: 'NYSE',     currency: 'USD' },
  { id: 'NDX',  name: 'NASDAQ 100',          value: 19342.55, change: 87.12,  changePercent: 0.45,  exchange: 'NASDAQ',   currency: 'USD' },
  { id: 'FTSE', name: 'FTSE 100',            value: 8124.43,  change: -23.51, changePercent: -0.29, exchange: 'LSE',      currency: 'GBP' },
  { id: 'N225', name: 'Nikkei 225',          value: 38142.20, change: 215.70, changePercent: 0.57,  exchange: 'TSE',      currency: 'JPY' },
  { id: 'HSI',  name: 'Hang Seng',           value: 18562.11, change: -87.33, changePercent: -0.47, exchange: 'HKEX',     currency: 'HKD' },
  { id: 'DAX',  name: 'DAX',                 value: 18274.97, change: 54.82,  changePercent: 0.30,  exchange: 'Euronext', currency: 'EUR' },
  { id: 'CAC',  name: 'CAC 40',              value: 8052.14,  change: -11.27, changePercent: -0.14, exchange: 'Euronext', currency: 'EUR' },
  { id: 'SENS', name: 'Sensex',              value: 74572.38, change: 312.45, changePercent: 0.42,  exchange: 'BSE',      currency: 'INR' },
  { id: 'SSEC', name: 'Shanghai Composite',  value: 3124.77,  change: -8.63,  changePercent: -0.28, exchange: 'SSE',      currency: 'CNY' },
  { id: 'ASX',  name: 'ASX 200',             value: 7842.30,  change: 22.15,  changePercent: 0.28,  exchange: 'ASX',      currency: 'AUD' },
];

// ─── Static news generator ────────────────────────────────────────────────────
const NEWS_POOL = [
  ['Reports record quarterly revenue beating analyst estimates by 8%', 'positive'],
  ['Board approves $10B share buyback program', 'positive'],
  ['Expands into Asian markets with new strategic partnerships', 'positive'],
  ['CEO announces accelerated AI integration roadmap for 2025', 'positive'],
  ['Upgraded to Buy by Goldman Sachs with raised price target', 'positive'],
  ['Q3 EPS misses expectations; company cites macro headwinds', 'negative'],
  ['Faces regulatory scrutiny over antitrust concerns', 'negative'],
  ['Supply chain disruptions weigh on near-term outlook', 'negative'],
  ['Announces workforce reduction of 5% amid restructuring', 'negative'],
  ['Downgraded to Hold on valuation concerns', 'negative'],
  ['Maintains full-year guidance; market reacts cautiously', 'neutral'],
  ['New product launch scheduled for Q4 2025', 'neutral'],
  ['CFO stepping down; transition plan in place', 'neutral'],
  ['Files for patent on next-gen semiconductor architecture', 'positive'],
  ['Dividend increased by 12% for the second consecutive year', 'positive'],
] as const;

const SOURCES = ['Bloomberg', 'Reuters', 'CNBC', 'WSJ', 'FT', 'MarketWatch', 'Barrons', 'Seeking Alpha'];

const genNews = (symbol: string): NewsItem[] => {
  const rng = seededRng(symbol + 'news');
  const now = Date.now();
  return Array.from({ length: 5 }, (_, i) => {
    const idx = Math.floor(rng() * NEWS_POOL.length);
    const [headline, sentiment] = NEWS_POOL[idx];
    return {
      id: `${symbol}-news-${i}`,
      headline: `${symbol} — ${headline}`,
      source: SOURCES[Math.floor(rng() * SOURCES.length)],
      timestamp: new Date(now - Math.floor(rng() * 48 * 3600_000)).toISOString(),
      sentiment: sentiment as 'positive' | 'neutral' | 'negative',
    };
  });
};

// ─── Stock catalog ─────────────────────────────────────────────────────────────
type RawStock = Omit<Stock, 'change' | 'changePercent' | 'news'>;

const raw: RawStock[] = [
  // ── NASDAQ ────────────────────────────────────────────────────────────────
  {
    symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology',
    price: 213.49, previousClose: 211.20, volume: 52_400_000, avgVolume: 58_100_000,
    fundamentals: { peRatio: 32.4, eps: 6.59, marketCap: 3280, high52w: 237.23, low52w: 164.08, dividendYield: 0.52, beta: 1.21, roe: 156.1, analystTarget: 235.0, forwardPE: 29.1, revenueGrowth: 4.9, profitMargin: 26.4 },
    description: 'Apple designs and manufactures consumer electronics, software, and online services.',
  },
  {
    symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology',
    price: 415.32, previousClose: 411.90, volume: 21_800_000, avgVolume: 24_300_000,
    fundamentals: { peRatio: 35.1, eps: 11.83, marketCap: 3090, high52w: 468.35, low52w: 385.57, dividendYield: 0.71, beta: 0.92, roe: 38.5, analystTarget: 475.0, forwardPE: 30.2, revenueGrowth: 17.6, profitMargin: 35.4 },
    description: 'Microsoft is a global technology leader in cloud, software, gaming, and AI.',
  },
  {
    symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology',
    price: 127.44, previousClose: 124.92, volume: 312_000_000, avgVolume: 290_000_000,
    fundamentals: { peRatio: 54.2, eps: 2.35, marketCap: 3120, high52w: 153.13, low52w: 47.32, dividendYield: 0.03, beta: 1.76, roe: 91.4, analystTarget: 150.0, forwardPE: 38.6, revenueGrowth: 122.4, profitMargin: 55.0 },
    description: 'NVIDIA designs GPUs and system-on-chip units, dominating AI compute infrastructure.',
  },
  {
    symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology',
    price: 178.85, previousClose: 176.40, volume: 22_600_000, avgVolume: 24_800_000,
    fundamentals: { peRatio: 23.8, eps: 7.51, marketCap: 2190, high52w: 207.05, low52w: 156.39, dividendYield: 0.0, beta: 1.05, roe: 29.4, analystTarget: 210.0, forwardPE: 20.5, revenueGrowth: 14.2, profitMargin: 28.7 },
    description: 'Alphabet is the parent company of Google, operating search, cloud, and AI businesses.',
  },
  {
    symbol: 'META', name: 'Meta Platforms', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology',
    price: 524.96, previousClose: 520.10, volume: 14_200_000, avgVolume: 16_900_000,
    fundamentals: { peRatio: 27.1, eps: 19.37, marketCap: 1340, high52w: 598.20, low52w: 414.50, dividendYield: 0.38, beta: 1.33, roe: 34.7, analystTarget: 600.0, forwardPE: 22.4, revenueGrowth: 27.3, profitMargin: 38.5 },
    description: 'Meta builds social technology platforms including Facebook, Instagram, and WhatsApp.',
  },
  {
    symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', currency: 'USD', sector: 'Consumer',
    price: 199.12, previousClose: 197.80, volume: 33_100_000, avgVolume: 38_500_000,
    fundamentals: { peRatio: 43.2, eps: 4.61, marketCap: 2080, high52w: 242.52, low52w: 151.61, dividendYield: 0.0, beta: 1.14, roe: 21.8, analystTarget: 240.0, forwardPE: 34.5, revenueGrowth: 13.0, profitMargin: 7.4 },
    description: 'Amazon dominates e-commerce, cloud infrastructure (AWS), and digital streaming.',
  },
  {
    symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', currency: 'USD', sector: 'Consumer',
    price: 248.23, previousClose: 252.10, volume: 102_300_000, avgVolume: 114_000_000,
    fundamentals: { peRatio: 62.1, eps: 4.00, marketCap: 792, high52w: 414.50, low52w: 138.80, dividendYield: 0.0, beta: 2.14, roe: 16.2, analystTarget: 285.0, forwardPE: 55.0, revenueGrowth: 2.3, profitMargin: 9.5 },
    description: 'Tesla designs, manufactures, and sells electric vehicles, energy storage, and solar.',
  },
  {
    symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', currency: 'USD', sector: 'Technology',
    price: 185.47, previousClose: 183.20, volume: 12_400_000, avgVolume: 14_100_000,
    fundamentals: { peRatio: 29.3, eps: 6.33, marketCap: 874, high52w: 251.88, low52w: 119.76, dividendYield: 1.32, beta: 1.08, roe: 24.1, analystTarget: 220.0, forwardPE: 24.5, revenueGrowth: 44.0, profitMargin: 22.0 },
    description: 'Broadcom designs semiconductors and infrastructure software for data centers.',
  },
  // ── NYSE ─────────────────────────────────────────────────────────────────
  {
    symbol: 'BRK.B', name: 'Berkshire Hathaway B', exchange: 'NYSE', currency: 'USD', sector: 'Finance',
    price: 423.87, previousClose: 421.10, volume: 4_500_000, avgVolume: 5_200_000,
    fundamentals: { peRatio: 8.4, eps: 50.46, marketCap: 620, high52w: 459.98, low52w: 356.71, dividendYield: 0.0, beta: 0.88, roe: 11.2, analystTarget: 455.0, forwardPE: 8.0, revenueGrowth: 7.1, profitMargin: 18.4 },
    description: 'Berkshire Hathaway is Warren Buffett\'s conglomerate holding company spanning insurance, rail, and energy.',
  },
  {
    symbol: 'JPM', name: 'JPMorgan Chase', exchange: 'NYSE', currency: 'USD', sector: 'Finance',
    price: 218.55, previousClose: 215.80, volume: 11_200_000, avgVolume: 13_400_000,
    fundamentals: { peRatio: 12.9, eps: 16.95, marketCap: 632, high52w: 260.27, low52w: 183.22, dividendYield: 2.13, beta: 1.12, roe: 17.0, analystTarget: 250.0, forwardPE: 11.5, revenueGrowth: 12.5, profitMargin: 34.2 },
    description: 'JPMorgan is the largest US bank by assets, offering investment banking and consumer services.',
  },
  {
    symbol: 'XOM', name: 'ExxonMobil Corp.', exchange: 'NYSE', currency: 'USD', sector: 'Energy',
    price: 108.14, previousClose: 107.40, volume: 17_800_000, avgVolume: 19_300_000,
    fundamentals: { peRatio: 14.2, eps: 7.61, marketCap: 460, high52w: 126.34, low52w: 98.47, dividendYield: 3.33, beta: 0.96, roe: 14.9, analystTarget: 120.0, forwardPE: 13.0, revenueGrowth: -4.2, profitMargin: 9.8 },
    description: 'ExxonMobil explores, produces, and refines oil, natural gas, and petrochemicals globally.',
  },
  {
    symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', currency: 'USD', sector: 'Healthcare',
    price: 159.22, previousClose: 157.90, volume: 7_100_000, avgVolume: 8_900_000,
    fundamentals: { peRatio: 22.1, eps: 7.20, marketCap: 382, high52w: 173.26, low52w: 143.13, dividendYield: 3.14, beta: 0.62, roe: 22.4, analystTarget: 175.0, forwardPE: 19.2, revenueGrowth: 6.3, profitMargin: 21.5 },
    description: 'J&J develops pharmaceuticals, medical devices, and consumer health products.',
  },
  {
    symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', currency: 'USD', sector: 'Finance',
    price: 278.44, previousClose: 276.10, volume: 6_800_000, avgVolume: 7_600_000,
    fundamentals: { peRatio: 31.4, eps: 8.87, marketCap: 561, high52w: 310.08, low52w: 252.37, dividendYield: 0.77, beta: 0.94, roe: 44.8, analystTarget: 315.0, forwardPE: 26.4, revenueGrowth: 10.0, profitMargin: 54.0 },
    description: 'Visa operates the world\'s largest retail electronic payments network.',
  },
  {
    symbol: 'UNH', name: 'UnitedHealth Group', exchange: 'NYSE', currency: 'USD', sector: 'Healthcare',
    price: 537.48, previousClose: 533.20, volume: 3_900_000, avgVolume: 4_200_000,
    fundamentals: { peRatio: 18.4, eps: 29.21, marketCap: 508, high52w: 606.28, low52w: 470.90, dividendYield: 1.46, beta: 0.72, roe: 25.6, analystTarget: 580.0, forwardPE: 16.9, revenueGrowth: 8.2, profitMargin: 5.4 },
    description: 'UnitedHealth is America\'s largest health insurer, operating UnitedHealthcare and Optum.',
  },
  {
    symbol: 'GS', name: 'Goldman Sachs', exchange: 'NYSE', currency: 'USD', sector: 'Finance',
    price: 487.33, previousClose: 482.10, volume: 2_100_000, avgVolume: 2_800_000,
    fundamentals: { peRatio: 15.2, eps: 32.06, marketCap: 165, high52w: 570.08, low52w: 399.46, dividendYield: 2.11, beta: 1.35, roe: 12.8, analystTarget: 545.0, forwardPE: 12.5, revenueGrowth: 16.2, profitMargin: 22.0 },
    description: 'Goldman Sachs provides investment banking, securities, and asset management services globally.',
  },
  // ── LSE ───────────────────────────────────────────────────────────────────
  {
    symbol: 'HSBA', name: 'HSBC Holdings', exchange: 'LSE', currency: 'GBP', sector: 'Finance',
    price: 712.40, previousClose: 707.80, volume: 28_400_000, avgVolume: 32_100_000,
    fundamentals: { peRatio: 7.8, eps: 91.3, marketCap: 134, high52w: 782.90, low52w: 598.80, dividendYield: 6.82, beta: 0.74, roe: 14.1, analystTarget: 780.0, forwardPE: 7.2, revenueGrowth: 8.4, profitMargin: 38.2 },
    description: 'HSBC is one of the world\'s largest banking and financial services organisations.',
  },
  {
    symbol: 'AZN', name: 'AstraZeneca PLC', exchange: 'LSE', currency: 'GBP', sector: 'Healthcare',
    price: 12480.0, previousClose: 12330.0, volume: 4_100_000, avgVolume: 4_800_000,
    fundamentals: { peRatio: 38.2, eps: 326.7, marketCap: 198, high52w: 13460.0, low52w: 10140.0, dividendYield: 1.91, beta: 0.58, roe: 22.7, analystTarget: 14200.0, forwardPE: 32.1, revenueGrowth: 18.3, profitMargin: 16.4 },
    description: 'AstraZeneca is a global biopharmaceutical company focused on oncology and rare diseases.',
  },
  {
    symbol: 'SHEL', name: 'Shell PLC', exchange: 'LSE', currency: 'GBP', sector: 'Energy',
    price: 2782.50, previousClose: 2758.50, volume: 12_200_000, avgVolume: 14_600_000,
    fundamentals: { peRatio: 12.4, eps: 224.4, marketCap: 188, high52w: 3002.0, low52w: 2340.0, dividendYield: 3.97, beta: 0.82, roe: 11.9, analystTarget: 3100.0, forwardPE: 10.8, revenueGrowth: -6.4, profitMargin: 6.1 },
    description: 'Shell is a global energy company involved in oil, gas, LNG, and renewables.',
  },
  {
    symbol: 'BP', name: 'BP PLC', exchange: 'LSE', currency: 'GBP', sector: 'Energy',
    price: 408.25, previousClose: 403.10, volume: 37_800_000, avgVolume: 42_300_000,
    fundamentals: { peRatio: 11.2, eps: 36.4, marketCap: 84, high52w: 493.60, low52w: 352.50, dividendYield: 5.23, beta: 0.86, roe: 9.3, analystTarget: 470.0, forwardPE: 9.0, revenueGrowth: -8.1, profitMargin: 3.8 },
    description: 'BP is an international energy company transitioning to low-carbon energy.',
  },
  {
    symbol: 'ULVR', name: 'Unilever PLC', exchange: 'LSE', currency: 'GBP', sector: 'Consumer',
    price: 4572.0, previousClose: 4510.0, volume: 5_600_000, avgVolume: 6_400_000,
    fundamentals: { peRatio: 17.6, eps: 259.8, marketCap: 117, high52w: 4792.0, low52w: 3818.0, dividendYield: 3.52, beta: 0.63, roe: 38.4, analystTarget: 4900.0, forwardPE: 16.2, revenueGrowth: 0.9, profitMargin: 12.8 },
    description: 'Unilever is a global consumer goods company with iconic brands in food, beauty, and home care.',
  },
  // ── TSE ───────────────────────────────────────────────────────────────────
  {
    symbol: '7203', name: 'Toyota Motor Corp.', exchange: 'TSE', currency: 'JPY', sector: 'Consumer',
    price: 2814.0, previousClose: 2780.0, volume: 18_400_000, avgVolume: 21_200_000,
    fundamentals: { peRatio: 9.8, eps: 287.1, marketCap: 40200, high52w: 3489.0, low52w: 2480.0, dividendYield: 3.01, beta: 0.78, roe: 13.2, analystTarget: 3200.0, forwardPE: 9.1, revenueGrowth: 6.4, profitMargin: 6.4 },
    description: 'Toyota is the world\'s largest automobile manufacturer by sales and production volume.',
  },
  {
    symbol: '6758', name: 'Sony Group Corp.', exchange: 'TSE', currency: 'JPY', sector: 'Technology',
    price: 12540.0, previousClose: 12430.0, volume: 4_100_000, avgVolume: 4_800_000,
    fundamentals: { peRatio: 18.2, eps: 689.0, marketCap: 14800, high52w: 14420.0, low52w: 10280.0, dividendYield: 0.62, beta: 0.91, roe: 12.7, analystTarget: 14000.0, forwardPE: 16.8, revenueGrowth: 8.1, profitMargin: 9.2 },
    description: 'Sony is a diversified global conglomerate in entertainment, gaming, electronics, and finance.',
  },
  {
    symbol: '9984', name: 'SoftBank Group', exchange: 'TSE', currency: 'JPY', sector: 'Technology',
    price: 10420.0, previousClose: 10180.0, volume: 6_800_000, avgVolume: 7_900_000,
    fundamentals: { peRatio: 45.2, eps: 230.5, marketCap: 14100, high52w: 12200.0, low52w: 7240.0, dividendYield: 0.60, beta: 1.42, roe: 5.1, analystTarget: 12000.0, forwardPE: 38.0, revenueGrowth: 14.1, profitMargin: 7.3 },
    description: 'SoftBank is a global technology conglomerate and major investor in AI and tech startups.',
  },
  {
    symbol: '6501', name: 'Hitachi Ltd.', exchange: 'TSE', currency: 'JPY', sector: 'Industrial',
    price: 15480.0, previousClose: 15280.0, volume: 3_200_000, avgVolume: 3_800_000,
    fundamentals: { peRatio: 24.8, eps: 624.0, marketCap: 8240, high52w: 17480.0, low52w: 10280.0, dividendYield: 0.82, beta: 1.08, roe: 14.8, analystTarget: 17000.0, forwardPE: 20.4, revenueGrowth: 12.4, profitMargin: 8.4 },
    description: 'Hitachi is a global social innovation business leader in digital, green, and innovation solutions.',
  },
  {
    symbol: '7974', name: 'Nintendo Co. Ltd.', exchange: 'TSE', currency: 'JPY', sector: 'Technology',
    price: 8420.0, previousClose: 8324.0, volume: 2_800_000, avgVolume: 3_200_000,
    fundamentals: { peRatio: 18.4, eps: 457.6, marketCap: 10940, high52w: 11450.0, low52w: 6480.0, dividendYield: 2.14, beta: 0.64, roe: 18.4, analystTarget: 9800.0, forwardPE: 16.8, revenueGrowth: -1.4, profitMargin: 32.8 },
    description: 'Nintendo is the iconic Japanese game company behind Switch, Mario, Zelda, and Pokemon franchises.',
  },
  {
    symbol: '8306', name: 'Mitsubishi UFJ Financial', exchange: 'TSE', currency: 'JPY', sector: 'Finance',
    price: 1482.0, previousClose: 1464.0, volume: 42_000_000, avgVolume: 48_000_000,
    fundamentals: { peRatio: 9.8, eps: 151.2, marketCap: 19800, high52w: 1756.0, low52w: 960.0, dividendYield: 2.68, beta: 1.04, roe: 8.4, analystTarget: 1800.0, forwardPE: 8.8, revenueGrowth: 14.4, profitMargin: 22.4 },
    description: 'Mitsubishi UFJ Financial Group is Japan\'s and the world\'s second-largest bank by assets.',
  },
  {
    symbol: '6367', name: 'Daikin Industries', exchange: 'TSE', currency: 'JPY', sector: 'Industrial',
    price: 18240.0, previousClose: 18020.0, volume: 1_200_000, avgVolume: 1_450_000,
    fundamentals: { peRatio: 32.4, eps: 563.0, marketCap: 5340, high52w: 22400.0, low52w: 14800.0, dividendYield: 1.14, beta: 1.02, roe: 12.4, analystTarget: 21000.0, forwardPE: 26.4, revenueGrowth: 8.4, profitMargin: 9.8 },
    description: 'Daikin Industries is the world\'s largest air conditioning manufacturer with global R&D leadership.',
  },
  {
    symbol: '4519', name: 'Chugai Pharmaceutical', exchange: 'TSE', currency: 'JPY', sector: 'Healthcare',
    price: 6240.0, previousClose: 6184.0, volume: 2_400_000, avgVolume: 2_800_000,
    fundamentals: { peRatio: 38.4, eps: 162.5, marketCap: 9984, high52w: 7620.0, low52w: 4840.0, dividendYield: 1.28, beta: 0.68, roe: 22.4, analystTarget: 7200.0, forwardPE: 30.4, revenueGrowth: 9.8, profitMargin: 24.4 },
    description: 'Chugai Pharmaceutical is Japan\'s leading biotech company, a majority-owned Roche subsidiary.',
  },
  // ── HKEX ─────────────────────────────────────────────────────────────────
  {
    symbol: '0700', name: 'Tencent Holdings', exchange: 'HKEX', currency: 'HKD', sector: 'Technology',
    price: 412.60, previousClose: 407.20, volume: 32_100_000, avgVolume: 38_400_000,
    fundamentals: { peRatio: 19.4, eps: 21.2, marketCap: 3840, high52w: 473.40, low52w: 282.80, dividendYield: 1.08, beta: 0.98, roe: 20.3, analystTarget: 480.0, forwardPE: 16.5, revenueGrowth: 9.8, profitMargin: 27.4 },
    description: 'Tencent is a technology conglomerate offering social media, gaming, fintech, and cloud services.',
  },
  {
    symbol: '9988', name: 'Alibaba Group', exchange: 'HKEX', currency: 'HKD', sector: 'Consumer',
    price: 84.55, previousClose: 82.30, volume: 48_200_000, avgVolume: 55_100_000,
    fundamentals: { peRatio: 14.2, eps: 5.95, marketCap: 1620, high52w: 100.60, low52w: 62.80, dividendYield: 0.0, beta: 1.18, roe: 9.4, analystTarget: 105.0, forwardPE: 11.2, revenueGrowth: 5.4, profitMargin: 17.2 },
    description: 'Alibaba operates China\'s largest e-commerce ecosystem alongside cloud and digital media.',
  },
  {
    symbol: '1299', name: 'AIA Group', exchange: 'HKEX', currency: 'HKD', sector: 'Finance',
    price: 52.35, previousClose: 51.80, volume: 22_400_000, avgVolume: 26_800_000,
    fundamentals: { peRatio: 16.2, eps: 3.23, marketCap: 624, high52w: 62.20, low52w: 45.70, dividendYield: 2.94, beta: 0.82, roe: 11.8, analystTarget: 65.0, forwardPE: 14.5, revenueGrowth: 7.2, profitMargin: 22.1 },
    description: 'AIA is the largest independent publicly listed pan-Asian life insurance group.',
  },
  {
    symbol: '3690', name: 'Meituan', exchange: 'HKEX', currency: 'HKD', sector: 'Consumer',
    price: 148.20, previousClose: 146.40, volume: 24_200_000, avgVolume: 28_400_000,
    fundamentals: { peRatio: 22.4, eps: 6.61, marketCap: 918, high52w: 184.80, low52w: 92.60, dividendYield: 0.0, beta: 1.28, roe: 18.4, analystTarget: 178.0, forwardPE: 18.2, revenueGrowth: 24.4, profitMargin: 9.8 },
    description: 'Meituan is China\'s dominant food delivery and local services super-platform.',
  },
  {
    symbol: '2318', name: 'Ping An Insurance HK', exchange: 'HKEX', currency: 'HKD', sector: 'Finance',
    price: 38.95, previousClose: 38.45, volume: 36_000_000, avgVolume: 42_000_000,
    fundamentals: { peRatio: 7.8, eps: 4.99, marketCap: 706, high52w: 46.20, low52w: 28.90, dividendYield: 6.84, beta: 0.92, roe: 12.8, analystTarget: 48.0, forwardPE: 7.2, revenueGrowth: 3.8, profitMargin: 18.4 },
    description: 'Ping An Insurance (H share) is China\'s largest insurer listed in Hong Kong.',
  },
  {
    symbol: '1211', name: 'BYD Company Ltd.', exchange: 'HKEX', currency: 'HKD', sector: 'Consumer',
    price: 284.40, previousClose: 280.60, volume: 14_800_000, avgVolume: 17_200_000,
    fundamentals: { peRatio: 22.8, eps: 12.47, marketCap: 822, high52w: 342.80, low52w: 192.40, dividendYield: 0.84, beta: 1.24, roe: 18.4, analystTarget: 340.0, forwardPE: 18.4, revenueGrowth: 34.4, profitMargin: 6.8 },
    description: 'BYD is China\'s largest EV maker and the world\'s top-selling electric vehicle brand.',
  },
  {
    symbol: '0005', name: 'HSBC Holdings (HK)', exchange: 'HKEX', currency: 'HKD', sector: 'Finance',
    price: 82.40, previousClose: 81.60, volume: 28_400_000, avgVolume: 32_800_000,
    fundamentals: { peRatio: 9.8, eps: 8.41, marketCap: 1560, high52w: 94.20, low52w: 60.80, dividendYield: 6.82, beta: 0.84, roe: 11.8, analystTarget: 96.0, forwardPE: 8.8, revenueGrowth: 8.4, profitMargin: 38.4 },
    description: 'HSBC Holdings is one of the world\'s largest banking and financial services organisations.',
  },
  // ── Euronext ─────────────────────────────────────────────────────────────
  {
    symbol: 'AIR', name: 'Airbus SE', exchange: 'Euronext', currency: 'EUR', sector: 'Industrial',
    price: 163.42, previousClose: 161.98, volume: 3_200_000, avgVolume: 3_800_000,
    fundamentals: { peRatio: 31.2, eps: 5.24, marketCap: 128, high52w: 188.32, low52w: 124.76, dividendYield: 1.71, beta: 1.12, roe: 43.2, analystTarget: 185.0, forwardPE: 25.4, revenueGrowth: 11.4, profitMargin: 5.2 },
    description: 'Airbus is the world\'s leading aircraft manufacturer for commercial and defence aviation.',
  },
  {
    symbol: 'MC', name: 'LVMH Moët Hennessy', exchange: 'Euronext', currency: 'EUR', sector: 'Consumer',
    price: 652.40, previousClose: 645.80, volume: 1_800_000, avgVolume: 2_100_000,
    fundamentals: { peRatio: 22.4, eps: 29.13, marketCap: 327, high52w: 812.00, low52w: 573.20, dividendYield: 2.01, beta: 0.96, roe: 22.8, analystTarget: 780.0, forwardPE: 19.1, revenueGrowth: -2.1, profitMargin: 18.6 },
    description: 'LVMH is the world\'s leading luxury goods group across fashion, wines, perfumes, and watches.',
  },
  {
    symbol: 'SAN', name: 'Airbus SE.', exchange: 'Euronext', currency: 'EUR', sector: 'Healthcare',
    price: 89.24, previousClose: 88.62, volume: 4_200_000, avgVolume: 5_100_000,
    fundamentals: { peRatio: 14.8, eps: 6.03, marketCap: 113, high52w: 102.40, low52w: 78.80, dividendYield: 4.15, beta: 0.68, roe: 14.3, analystTarget: 105.0, forwardPE: 13.2, revenueGrowth: 4.3, profitMargin: 14.8 },
    description: 'Sanofi is a global biopharmaceutical leader in vaccines, rare diseases and immunology.',
  },
  // ── NSE ───────────────────────────────────────────────────────────────────
  {
    symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', currency: 'INR', sector: 'Energy',
    price: 2984.75, previousClose: 2961.30, volume: 18_900_000, avgVolume: 21_400_000,
    fundamentals: { peRatio: 26.4, eps: 113.1, marketCap: 20200, high52w: 3217.90, low52w: 2220.30, dividendYield: 0.30, beta: 0.88, roe: 10.2, analystTarget: 3400.0, forwardPE: 22.0, revenueGrowth: 7.4, profitMargin: 8.2 },
    description: 'Reliance Industries is India\'s largest private sector conglomerate across energy, retail, and telecom.',
  },
  {
    symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', currency: 'INR', sector: 'Technology',
    price: 3812.50, previousClose: 3786.40, volume: 4_800_000, avgVolume: 5_600_000,
    fundamentals: { peRatio: 28.6, eps: 133.4, marketCap: 13900, high52w: 4592.25, low52w: 3321.80, dividendYield: 1.78, beta: 0.72, roe: 48.2, analystTarget: 4200.0, forwardPE: 25.0, revenueGrowth: 4.1, profitMargin: 19.8 },
    description: 'TCS is one of the world\'s largest IT services companies operating in 55+ countries.',
  },
  {
    symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Finance',
    price: 1714.60, previousClose: 1698.90, volume: 14_200_000, avgVolume: 16_800_000,
    fundamentals: { peRatio: 18.4, eps: 93.2, marketCap: 13000, high52w: 1880.00, low52w: 1363.55, dividendYield: 1.22, beta: 0.81, roe: 16.8, analystTarget: 1950.0, forwardPE: 15.8, revenueGrowth: 14.2, profitMargin: 24.4 },
    description: 'HDFC Bank is India\'s largest private sector lender serving 91 million customers.',
  },
  {
    symbol: 'INFY', name: 'Infosys Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Technology',
    price: 1524.35, previousClose: 1509.80, volume: 9_800_000, avgVolume: 11_200_000,
    fundamentals: { peRatio: 22.4, eps: 68.0, marketCap: 6340, high52w: 1951.40, low52w: 1358.35, dividendYield: 2.58, beta: 0.76, roe: 31.4, analystTarget: 1750.0, forwardPE: 19.6, revenueGrowth: 3.8, profitMargin: 18.7 },
    description: 'Infosys is a global leader in next-generation digital services and consulting.',
  },
  {
    symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Finance',
    price: 1248.70, previousClose: 1231.45, volume: 19_400_000, avgVolume: 22_100_000,
    fundamentals: { peRatio: 17.2, eps: 72.6, marketCap: 8780, high52w: 1388.25, low52w: 970.20, dividendYield: 0.80, beta: 0.90, roe: 18.4, analystTarget: 1450.0, forwardPE: 14.8, revenueGrowth: 18.3, profitMargin: 26.1 },
    description: 'ICICI Bank is India\'s second-largest private bank with a strong retail and corporate banking franchise.',
  },
  {
    symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', currency: 'INR', sector: 'Finance',
    price: 1892.30, previousClose: 1874.60, volume: 8_200_000, avgVolume: 9_600_000,
    fundamentals: { peRatio: 20.4, eps: 92.8, marketCap: 3770, high52w: 2108.40, low52w: 1543.85, dividendYield: 0.10, beta: 0.78, roe: 14.2, analystTarget: 2200.0, forwardPE: 17.6, revenueGrowth: 12.8, profitMargin: 28.4 },
    description: 'Kotak Mahindra Bank is one of India\'s fastest-growing banks known for conservative lending and digital innovation.',
  },
  {
    symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', currency: 'INR', sector: 'Finance',
    price: 812.45, previousClose: 805.10, volume: 42_000_000, avgVolume: 48_500_000,
    fundamentals: { peRatio: 10.8, eps: 75.2, marketCap: 7242, high52w: 912.00, low52w: 601.35, dividendYield: 1.72, beta: 1.12, roe: 21.4, analystTarget: 970.0, forwardPE: 9.2, revenueGrowth: 13.6, profitMargin: 19.8 },
    description: 'State Bank of India is the country\'s largest public sector bank with over 22,000 branches nationwide.',
  },
  {
    symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Telecom',
    price: 1684.55, previousClose: 1658.20, volume: 11_300_000, avgVolume: 13_800_000,
    fundamentals: { peRatio: 62.8, eps: 26.8, marketCap: 10080, high52w: 1778.75, low52w: 1143.65, dividendYield: 0.48, beta: 0.84, roe: 28.6, analystTarget: 1950.0, forwardPE: 35.0, revenueGrowth: 22.4, profitMargin: 11.2 },
    description: 'Bharti Airtel is India\'s leading telecom operator with 500M+ subscribers across 18 countries.',
  },
  {
    symbol: 'HCLTECH', name: 'HCL Technologies', exchange: 'NSE', currency: 'INR', sector: 'Technology',
    price: 1542.80, previousClose: 1528.40, volume: 7_100_000, avgVolume: 8_400_000,
    fundamentals: { peRatio: 24.6, eps: 62.7, marketCap: 4190, high52w: 1928.50, low52w: 1235.90, dividendYield: 3.24, beta: 0.80, roe: 24.8, analystTarget: 1780.0, forwardPE: 21.4, revenueGrowth: 6.2, profitMargin: 15.8 },
    description: 'HCL Technologies is a global IT services company specialising in engineering R&D and cloud transformation.',
  },
  {
    symbol: 'WIPRO', name: 'Wipro Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Technology',
    price: 487.65, previousClose: 482.30, volume: 13_200_000, avgVolume: 15_400_000,
    fundamentals: { peRatio: 18.4, eps: 26.5, marketCap: 2692, high52w: 577.75, low52w: 378.90, dividendYield: 0.21, beta: 0.74, roe: 14.2, analystTarget: 560.0, forwardPE: 16.8, revenueGrowth: 0.6, profitMargin: 13.4 },
    description: 'Wipro is a leading global IT and consulting services company headquartered in Bengaluru.',
  },
  {
    symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Finance',
    price: 7124.50, previousClose: 7038.80, volume: 3_400_000, avgVolume: 4_100_000,
    fundamentals: { peRatio: 32.4, eps: 220.0, marketCap: 4394, high52w: 8192.35, low52w: 6187.50, dividendYield: 0.28, beta: 1.18, roe: 22.8, analystTarget: 8500.0, forwardPE: 26.2, revenueGrowth: 32.4, profitMargin: 22.6 },
    description: 'Bajaj Finance is India\'s largest non-banking financial company, serving 80 million customers.',
  },
  {
    symbol: 'HINDUNILVR', name: 'Hindustan Unilever', exchange: 'NSE', currency: 'INR', sector: 'Consumer',
    price: 2384.60, previousClose: 2369.40, volume: 4_200_000, avgVolume: 5_000_000,
    fundamentals: { peRatio: 54.2, eps: 44.0, marketCap: 5598, high52w: 2778.00, low52w: 2124.35, dividendYield: 1.92, beta: 0.52, roe: 19.4, analystTarget: 2700.0, forwardPE: 46.8, revenueGrowth: 5.4, profitMargin: 16.4 },
    description: 'Hindustan Unilever is India\'s largest FMCG company with a portfolio of 50+ iconic household brands.',
  },
  {
    symbol: 'MARUTI', name: 'Maruti Suzuki India', exchange: 'NSE', currency: 'INR', sector: 'Consumer',
    price: 12184.40, previousClose: 12042.60, volume: 1_600_000, avgVolume: 1_900_000,
    fundamentals: { peRatio: 26.8, eps: 454.6, marketCap: 3674, high52w: 13680.00, low52w: 9758.25, dividendYield: 1.10, beta: 0.86, roe: 18.6, analystTarget: 14200.0, forwardPE: 22.4, revenueGrowth: 12.4, profitMargin: 8.8 },
    description: 'Maruti Suzuki is India\'s largest passenger vehicle manufacturer with a ~42% market share.',
  },
  {
    symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Materials',
    price: 2284.15, previousClose: 2268.40, volume: 3_800_000, avgVolume: 4_400_000,
    fundamentals: { peRatio: 48.4, eps: 47.2, marketCap: 2188, high52w: 3394.80, low52w: 2064.50, dividendYield: 1.48, beta: 0.62, roe: 26.4, analystTarget: 2700.0, forwardPE: 38.2, revenueGrowth: -3.2, profitMargin: 11.4 },
    description: 'Asian Paints is India\'s largest paint company and Asia\'s third-largest, operating in 15 countries.',
  },
  {
    symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', exchange: 'NSE', currency: 'INR', sector: 'Healthcare',
    price: 1724.35, previousClose: 1708.60, volume: 7_600_000, avgVolume: 8_800_000,
    fundamentals: { peRatio: 34.2, eps: 50.4, marketCap: 4140, high52w: 1960.15, low52w: 1364.90, dividendYield: 0.70, beta: 0.64, roe: 15.4, analystTarget: 1980.0, forwardPE: 28.6, revenueGrowth: 8.8, profitMargin: 16.4 },
    description: 'Sun Pharma is India\'s largest pharmaceutical company and the world\'s 4th largest specialty generic firm.',
  },
  {
    symbol: 'DRREDDY', name: 'Dr. Reddy\'s Laboratories', exchange: 'NSE', currency: 'INR', sector: 'Healthcare',
    price: 1284.70, previousClose: 1272.40, volume: 3_200_000, avgVolume: 3_800_000,
    fundamentals: { peRatio: 18.8, eps: 68.4, marketCap: 2143, high52w: 1592.00, low52w: 1050.45, dividendYield: 0.54, beta: 0.56, roe: 20.2, analystTarget: 1480.0, forwardPE: 16.4, revenueGrowth: 14.6, profitMargin: 18.4 },
    description: 'Dr. Reddy\'s is a leading Indian pharma with a strong US generics and biosimilars pipeline.',
  },
  {
    symbol: 'AXISBANK', name: 'Axis Bank Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Finance',
    price: 1124.80, previousClose: 1112.50, volume: 16_400_000, avgVolume: 18_600_000,
    fundamentals: { peRatio: 12.4, eps: 90.7, marketCap: 3460, high52w: 1339.65, low52w: 995.35, dividendYield: 0.09, beta: 1.04, roe: 18.8, analystTarget: 1280.0, forwardPE: 10.8, revenueGrowth: 15.4, profitMargin: 22.4 },
    description: 'Axis Bank is India\'s third-largest private sector bank with 5,000+ branches and strong digital banking.',
  },
  {
    symbol: 'ITC', name: 'ITC Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Consumer',
    price: 484.25, previousClose: 479.80, volume: 28_400_000, avgVolume: 32_100_000,
    fundamentals: { peRatio: 26.4, eps: 18.3, marketCap: 6072, high52w: 528.45, low52w: 390.50, dividendYield: 3.22, beta: 0.46, roe: 28.4, analystTarget: 580.0, forwardPE: 22.8, revenueGrowth: 10.2, profitMargin: 28.8 },
    description: 'ITC is a diversified Indian conglomerate with leadership in cigarettes, FMCG, hotels, and agribusiness.',
  },
  {
    symbol: 'LTIM', name: 'LTIMindtree Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Technology',
    price: 5284.50, previousClose: 5228.40, volume: 1_800_000, avgVolume: 2_200_000,
    fundamentals: { peRatio: 34.8, eps: 151.8, marketCap: 1564, high52w: 7194.50, low52w: 4408.35, dividendYield: 0.95, beta: 0.82, roe: 26.4, analystTarget: 6200.0, forwardPE: 28.4, revenueGrowth: 7.4, profitMargin: 14.8 },
    description: 'LTIMindtree is a global IT services company formed from the merger of L&T Infotech and Mindtree.',
  },
  {
    symbol: 'TECHM', name: 'Tech Mahindra Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Technology',
    price: 1584.20, previousClose: 1568.40, volume: 4_400_000, avgVolume: 5_200_000,
    fundamentals: { peRatio: 42.4, eps: 37.4, marketCap: 1544, high52w: 1762.50, low52w: 1094.35, dividendYield: 1.90, beta: 0.88, roe: 12.4, analystTarget: 1780.0, forwardPE: 26.8, revenueGrowth: 1.8, profitMargin: 7.8 },
    description: 'Tech Mahindra is a leading IT and BPO services company with deep expertise in telecom and 5G.',
  },
  {
    symbol: 'NTPC', name: 'NTPC Ltd.', exchange: 'NSE', currency: 'INR', sector: 'Utilities',
    price: 382.40, previousClose: 378.90, volume: 24_800_000, avgVolume: 28_200_000,
    fundamentals: { peRatio: 16.8, eps: 22.8, marketCap: 3713, high52w: 448.45, low52w: 295.35, dividendYield: 2.56, beta: 0.62, roe: 13.8, analystTarget: 450.0, forwardPE: 14.4, revenueGrowth: 9.4, profitMargin: 13.4 },
    description: 'NTPC is India\'s largest power utility, accounting for nearly 25% of total installed capacity.',
  },
  {
    symbol: 'ONGC', name: 'Oil & Natural Gas Corp', exchange: 'NSE', currency: 'INR', sector: 'Energy',
    price: 268.45, previousClose: 264.80, volume: 34_200_000, avgVolume: 38_400_000,
    fundamentals: { peRatio: 7.8, eps: 34.4, marketCap: 3374, high52w: 345.00, low52w: 204.65, dividendYield: 4.48, beta: 0.82, roe: 14.2, analystTarget: 320.0, forwardPE: 7.2, revenueGrowth: 4.8, profitMargin: 12.8 },
    description: 'ONGC is India\'s largest oil and gas exploration & production company with domestic and global operations.',
  },
  {
    symbol: 'POWERGRID', name: 'Power Grid Corp.', exchange: 'NSE', currency: 'INR', sector: 'Utilities',
    price: 324.60, previousClose: 321.40, volume: 22_400_000, avgVolume: 25_800_000,
    fundamentals: { peRatio: 18.4, eps: 17.6, marketCap: 3020, high52w: 366.25, low52w: 228.80, dividendYield: 3.82, beta: 0.44, roe: 18.8, analystTarget: 375.0, forwardPE: 16.4, revenueGrowth: 6.8, profitMargin: 34.2 },
    description: 'Power Grid Corporation is India\'s central transmission utility managing 170,000 km of transmission lines.',
  },
  // ── BSE ───────────────────────────────────────────────────────────────────
  {
    symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd.', exchange: 'BSE', currency: 'INR', sector: 'Consumer',
    price: 9284.50, previousClose: 9184.20, volume: 1_200_000, avgVolume: 1_450_000,
    fundamentals: { peRatio: 32.4, eps: 286.8, marketCap: 2605, high52w: 12774.00, low52w: 7407.50, dividendYield: 0.86, beta: 0.78, roe: 28.4, analystTarget: 11000.0, forwardPE: 26.4, revenueGrowth: 14.8, profitMargin: 18.2 },
    description: 'Bajaj Auto is the world\'s third-largest two-and-three-wheeler manufacturer and India\'s leading exporter.',
  },
  {
    symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', exchange: 'BSE', currency: 'INR', sector: 'Consumer',
    price: 784.30, previousClose: 772.40, volume: 24_600_000, avgVolume: 28_200_000,
    fundamentals: { peRatio: 8.4, eps: 93.4, marketCap: 2881, high52w: 1148.90, low52w: 715.50, dividendYield: 0.00, beta: 1.24, roe: 24.4, analystTarget: 1050.0, forwardPE: 7.8, revenueGrowth: 10.4, profitMargin: 8.2 },
    description: 'Tata Motors is a global automotive giant owning Jaguar Land Rover and a leading EV portfolio in India.',
  },
  {
    symbol: 'TITAN', name: 'Titan Company Ltd.', exchange: 'BSE', currency: 'INR', sector: 'Consumer',
    price: 3284.40, previousClose: 3248.80, volume: 3_800_000, avgVolume: 4_400_000,
    fundamentals: { peRatio: 92.4, eps: 35.5, marketCap: 2920, high52w: 3886.90, low52w: 2534.50, dividendYield: 0.30, beta: 0.82, roe: 34.2, analystTarget: 3800.0, forwardPE: 72.4, revenueGrowth: 18.2, profitMargin: 7.4 },
    description: 'Titan is India\'s dominant lifestyle company with leadership in jewellery (Tanishq), watches, and eyewear.',
  },
  {
    symbol: 'ULTRACEMCO', name: 'UltraTech Cement', exchange: 'BSE', currency: 'INR', sector: 'Materials',
    price: 11284.60, previousClose: 11148.40, volume: 1_400_000, avgVolume: 1_700_000,
    fundamentals: { peRatio: 38.4, eps: 293.9, marketCap: 3260, high52w: 12684.00, low52w: 9172.30, dividendYield: 0.35, beta: 0.88, roe: 14.4, analystTarget: 13000.0, forwardPE: 30.8, revenueGrowth: 8.4, profitMargin: 9.8 },
    description: 'UltraTech Cement is India\'s largest cement manufacturer with 130+ MN tonnes of annual capacity.',
  },
  {
    symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ', exchange: 'BSE', currency: 'INR', sector: 'Industrial',
    price: 1284.80, previousClose: 1268.40, volume: 8_400_000, avgVolume: 9_800_000,
    fundamentals: { peRatio: 28.4, eps: 45.2, marketCap: 2770, high52w: 1621.40, low52w: 1018.60, dividendYield: 0.31, beta: 1.14, roe: 16.8, analystTarget: 1550.0, forwardPE: 22.4, revenueGrowth: 24.8, profitMargin: 38.4 },
    description: 'Adani Ports is India\'s largest multi-port operator, handling ~24% of India\'s total cargo traffic.',
  },
  {
    symbol: 'NESTLEIND', name: 'Nestle India Ltd.', exchange: 'BSE', currency: 'INR', sector: 'Consumer',
    price: 2284.40, previousClose: 2268.80, volume: 2_400_000, avgVolume: 2_800_000,
    fundamentals: { peRatio: 72.4, eps: 31.5, marketCap: 2203, high52w: 2778.00, low52w: 2064.50, dividendYield: 1.74, beta: 0.34, roe: 112.4, analystTarget: 2600.0, forwardPE: 58.4, revenueGrowth: 8.4, profitMargin: 19.4 },
    description: 'Nestle India is the local subsidiary of Nestle SA, known for Maggi, KitKat, Nescafe, and Munch.',
  },
  {
    symbol: 'WIPROBSE', name: 'Wipro Ltd. (BSE)', exchange: 'BSE', currency: 'INR', sector: 'Technology',
    price: 487.40, previousClose: 482.10, volume: 6_400_000, avgVolume: 7_800_000,
    fundamentals: { peRatio: 18.4, eps: 26.5, marketCap: 2692, high52w: 577.75, low52w: 378.90, dividendYield: 0.21, beta: 0.74, roe: 14.2, analystTarget: 560.0, forwardPE: 16.8, revenueGrowth: 0.6, profitMargin: 13.4 },
    description: 'Wipro is a leading global IT and consulting services company headquartered in Bengaluru.',
  },
  // ── SSE ───────────────────────────────────────────────────────────────────
  {
    symbol: '600519', name: 'Kweichow Moutai', exchange: 'SSE', currency: 'CNY', sector: 'Consumer',
    price: 1482.0, previousClose: 1475.0, volume: 1_200_000, avgVolume: 1_400_000,
    fundamentals: { peRatio: 24.8, eps: 59.8, marketCap: 18600, high52w: 1862.0, low52w: 1290.0, dividendYield: 2.58, beta: 0.68, roe: 32.4, analystTarget: 1750.0, forwardPE: 22.0, revenueGrowth: 9.8, profitMargin: 48.2 },
    description: 'Kweichow Moutai produces premium Chinese baijiu (liquor), China\'s most valuable consumer brand.',
  },
  {
    symbol: '601398', name: 'ICBC', exchange: 'SSE', currency: 'CNY', sector: 'Finance',
    price: 6.12, previousClose: 6.08, volume: 145_000_000, avgVolume: 162_000_000,
    fundamentals: { peRatio: 4.8, eps: 1.28, marketCap: 21400, high52w: 6.84, low52w: 5.14, dividendYield: 7.11, beta: 0.52, roe: 11.1, analystTarget: 7.20, forwardPE: 4.5, revenueGrowth: 2.3, profitMargin: 40.2 },
    description: 'ICBC is the world\'s largest bank by total assets, headquartered in Beijing.',
  },
  {
    symbol: '601318', name: 'Ping An Insurance', exchange: 'SSE', currency: 'CNY', sector: 'Finance',
    price: 42.84, previousClose: 42.24, volume: 48_000_000, avgVolume: 54_000_000,
    fundamentals: { peRatio: 8.4, eps: 5.10, marketCap: 7824, high52w: 52.0, low52w: 34.40, dividendYield: 5.62, beta: 0.84, roe: 12.4, analystTarget: 52.0, forwardPE: 7.8, revenueGrowth: 3.8, profitMargin: 18.4 },
    description: 'Ping An Insurance is China\'s largest insurer by market cap with banking and fintech subsidiaries.',
  },
  {
    symbol: '600036', name: 'China Merchants Bank', exchange: 'SSE', currency: 'CNY', sector: 'Finance',
    price: 36.48, previousClose: 36.02, volume: 64_000_000, avgVolume: 72_000_000,
    fundamentals: { peRatio: 5.8, eps: 6.29, marketCap: 9180, high52w: 42.22, low52w: 28.64, dividendYield: 5.14, beta: 0.72, roe: 16.2, analystTarget: 44.0, forwardPE: 5.4, revenueGrowth: 5.8, profitMargin: 38.4 },
    description: 'China Merchants Bank is China\'s leading retail bank known for credit cards and high net-worth clients.',
  },
  {
    symbol: '600900', name: 'China Yangtze Power', exchange: 'SSE', currency: 'CNY', sector: 'Utilities',
    price: 24.62, previousClose: 24.34, volume: 32_000_000, avgVolume: 36_000_000,
    fundamentals: { peRatio: 18.4, eps: 1.34, marketCap: 5408, high52w: 28.48, low52w: 19.82, dividendYield: 3.62, beta: 0.38, roe: 14.4, analystTarget: 28.0, forwardPE: 16.8, revenueGrowth: 6.2, profitMargin: 46.4 },
    description: 'China Yangtze Power operates the Three Gorges Dam, the world\'s largest hydroelectric power station.',
  },
  {
    symbol: '600028', name: 'Sinopec Corp.', exchange: 'SSE', currency: 'CNY', sector: 'Energy',
    price: 5.82, previousClose: 5.74, volume: 124_000_000, avgVolume: 138_000_000,
    fundamentals: { peRatio: 9.4, eps: 0.62, marketCap: 7124, high52w: 7.08, low52w: 4.82, dividendYield: 6.84, beta: 0.68, roe: 8.4, analystTarget: 7.0, forwardPE: 8.8, revenueGrowth: 2.4, profitMargin: 3.4 },
    description: 'Sinopec is China\'s second-largest oil company with the world\'s largest petroleum refining capacity.',
  },
  // ── ASX ───────────────────────────────────────────────────────────────────
  {
    symbol: 'BHP', name: 'BHP Group Ltd.', exchange: 'ASX', currency: 'AUD', sector: 'Materials',
    price: 43.82, previousClose: 43.24, volume: 18_400_000, avgVolume: 21_200_000,
    fundamentals: { peRatio: 13.4, eps: 3.27, marketCap: 220, high52w: 48.72, low52w: 36.80, dividendYield: 5.82, beta: 0.84, roe: 21.4, analystTarget: 50.0, forwardPE: 12.0, revenueGrowth: -4.8, profitMargin: 23.4 },
    description: 'BHP is the world\'s largest mining company with diversified operations in iron ore, copper, and coal.',
  },
  {
    symbol: 'CBA', name: 'Commonwealth Bank', exchange: 'ASX', currency: 'AUD', sector: 'Finance',
    price: 142.32, previousClose: 140.84, volume: 5_800_000, avgVolume: 6_700_000,
    fundamentals: { peRatio: 24.2, eps: 5.88, marketCap: 241, high52w: 158.42, low52w: 98.12, dividendYield: 2.91, beta: 0.78, roe: 14.1, analystTarget: 105.0, forwardPE: 22.4, revenueGrowth: 6.2, profitMargin: 44.2 },
    description: 'CBA is Australia\'s largest bank by market capitalisation, serving 16 million customers.',
  },
  {
    symbol: 'CSL', name: 'CSL Ltd.', exchange: 'ASX', currency: 'AUD', sector: 'Healthcare',
    price: 292.14, previousClose: 288.40, volume: 2_100_000, avgVolume: 2_600_000,
    fundamentals: { peRatio: 43.8, eps: 6.67, marketCap: 142, high52w: 342.00, low52w: 239.80, dividendYield: 1.18, beta: 0.72, roe: 24.6, analystTarget: 320.0, forwardPE: 36.2, revenueGrowth: 10.4, profitMargin: 14.8 },
    description: 'CSL is a global biotech leader in plasma-derived therapies and vaccines.',
  },
  {
    symbol: 'NAB', name: 'National Australia Bank', exchange: 'ASX', currency: 'AUD', sector: 'Finance',
    price: 38.62, previousClose: 38.14, volume: 12_400_000, avgVolume: 14_200_000,
    fundamentals: { peRatio: 14.8, eps: 2.61, marketCap: 72, high52w: 42.84, low52w: 29.62, dividendYield: 4.38, beta: 0.94, roe: 11.8, analystTarget: 43.0, forwardPE: 13.4, revenueGrowth: 8.2, profitMargin: 32.4 },
    description: 'NAB is one of Australia\'s four major banks providing personal, business, and corporate banking.',
  },
  {
    symbol: 'WBC', name: 'Westpac Banking Corp.', exchange: 'ASX', currency: 'AUD', sector: 'Finance',
    price: 32.84, previousClose: 32.42, volume: 14_200_000, avgVolume: 16_400_000,
    fundamentals: { peRatio: 14.2, eps: 2.31, marketCap: 62, high52w: 36.84, low52w: 24.80, dividendYield: 4.58, beta: 0.98, roe: 9.8, analystTarget: 36.0, forwardPE: 13.2, revenueGrowth: 5.4, profitMargin: 28.4 },
    description: 'Westpac is Australia\'s oldest bank and one of its four majors with 13 million customers.',
  },
  {
    symbol: 'WES', name: 'Wesfarmers Ltd.', exchange: 'ASX', currency: 'AUD', sector: 'Consumer',
    price: 74.84, previousClose: 73.96, volume: 4_800_000, avgVolume: 5_600_000,
    fundamentals: { peRatio: 28.4, eps: 2.63, marketCap: 85, high52w: 80.82, low52w: 52.42, dividendYield: 3.22, beta: 0.72, roe: 38.4, analystTarget: 82.0, forwardPE: 24.8, revenueGrowth: 7.4, profitMargin: 6.8 },
    description: 'Wesfarmers is a diversified Australian conglomerate owning Bunnings, Kmart, Officeworks, and Priceline.',
  },
  {
    symbol: 'ANZ', name: 'ANZ Banking Group', exchange: 'ASX', currency: 'AUD', sector: 'Finance',
    price: 29.84, previousClose: 29.42, volume: 16_400_000, avgVolume: 18_800_000,
    fundamentals: { peRatio: 12.4, eps: 2.41, marketCap: 84, high52w: 33.84, low52w: 22.84, dividendYield: 5.14, beta: 0.96, roe: 10.4, analystTarget: 32.0, forwardPE: 11.8, revenueGrowth: 4.8, profitMargin: 30.4 },
    description: 'ANZ is one of Australia\'s four major banks with strong Asia-Pacific presence across 30 markets.',
  },
  {
    symbol: 'RIO', name: 'Rio Tinto Ltd.', exchange: 'ASX', currency: 'AUD', sector: 'Materials',
    price: 114.84, previousClose: 113.28, volume: 6_200_000, avgVolume: 7_400_000,
    fundamentals: { peRatio: 9.4, eps: 12.22, marketCap: 170, high52w: 134.48, low52w: 96.42, dividendYield: 7.84, beta: 0.92, roe: 24.8, analystTarget: 130.0, forwardPE: 8.8, revenueGrowth: -3.4, profitMargin: 28.4 },
    description: 'Rio Tinto is the world\'s second-largest mining company with major iron ore, aluminium, and copper operations.',
  },
  {
    symbol: 'MQG', name: 'Macquarie Group', exchange: 'ASX', currency: 'AUD', sector: 'Finance',
    price: 212.84, previousClose: 209.82, volume: 2_400_000, avgVolume: 2_800_000,
    fundamentals: { peRatio: 18.4, eps: 11.56, marketCap: 72, high52w: 242.74, low52w: 148.42, dividendYield: 3.14, beta: 1.18, roe: 14.4, analystTarget: 240.0, forwardPE: 16.4, revenueGrowth: 4.8, profitMargin: 26.8 },
    description: 'Macquarie Group is a global financial services firm known as an infrastructure investment specialist.',
  },
];

// Build the final catalog with computed change fields
export const STOCKS: Stock[] = raw.map(s => ({
  ...s,
  change: +(s.price - s.previousClose).toFixed(2),
  changePercent: +((s.price - s.previousClose) / s.previousClose * 100).toFixed(2),
  news: genNews(s.symbol),
}));

export const STOCKS_BY_SYMBOL = new Map<string, Stock>(STOCKS.map(s => [s.symbol, s]));

// ─── Ticker bar: 40 tickers across exchanges ──────────────────────────────────
export const TICKER_BAR_SYMBOLS = [
  // US
  'AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','BRK.B','JPM','V',
  // UK
  'HSBA','AZN','SHEL',
  // HK / China
  '0700','9988','1211','3690',
  // Japan
  '7203','6758','9984','7974',
  // Euronext
  'AIR','MC',
  // NSE (India)
  'RELIANCE','TCS','HDFCBANK','ICICIBANK','BHARTIARTL','INFY','SBIN','ITC',
  // BSE
  'BAJAJ-AUTO','TATAMOTORS',
  // ASX
  'BHP','CBA','CSL','RIO',
  // SSE
  '600519','601398',
];
