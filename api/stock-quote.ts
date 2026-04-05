import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://somnathkarforma.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

const YF_EXCHANGE_MAP: Record<string, string> = {
  NYQ: 'NYSE', NYE: 'NYSE', NYB: 'NYSE',
  NMS: 'NASDAQ', NGM: 'NASDAQ', NCM: 'NASDAQ', NNM: 'NASDAQ',
  LSE: 'LSE',
  TYO: 'TSE',
  SHH: 'SSE', SHZ: 'SSE',
  HKG: 'HKEX',
  PAR: 'Euronext', AMS: 'Euronext', BRU: 'Euronext', EPA: 'Euronext', EBR: 'Euronext', EAM: 'Euronext',
  NSI: 'NSE', NSE: 'NSE',
  BOM: 'BSE', BSE: 'BSE',
  ASX: 'ASX',
};

const SECTOR_MAP: Record<string, string> = {
  'Technology': 'Technology',
  'Financial Services': 'Finance',
  'Healthcare': 'Healthcare',
  'Energy': 'Energy',
  'Consumer Cyclical': 'Consumer',
  'Consumer Defensive': 'Consumer',
  'Industrials': 'Industrial',
  'Basic Materials': 'Materials',
  'Utilities': 'Utilities',
  'Real Estate': 'Real Estate',
  'Communication Services': 'Telecom',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.query as { symbol?: string };
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

  try {
    const fields = [
      'regularMarketPrice', 'regularMarketPreviousClose', 'regularMarketChange',
      'regularMarketChangePercent', 'regularMarketVolume', 'averageDailyVolume3Month',
      'trailingPE', 'epsTrailingTwelveMonths', 'marketCap', 'fiftyTwoWeekHigh',
      'fiftyTwoWeekLow', 'dividendYield', 'beta', 'forwardPE',
      'shortName', 'longName', 'exchange', 'currency', 'sector',
      'trailingAnnualDividendYield', 'returnOnEquity', 'profitMargins',
      'revenueGrowth', 'targetMeanPrice', 'bookValue',
    ].join(',');

    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=${fields}`;
    const yfRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockSenseBot/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!yfRes.ok) {
      return res.status(502).json({ error: 'Upstream quote failed', status: yfRes.status });
    }

    const data = await yfRes.json() as {
      quoteResponse?: {
        result?: Array<Record<string, number | string | null>>;
        error?: unknown;
      };
    };

    const result = data.quoteResponse?.result?.[0];
    if (!result) return res.status(404).json({ error: 'Symbol not found' });

    const exchCode = String(result.exchange ?? '');
    const mappedExchange = YF_EXCHANGE_MAP[exchCode] ?? 'NYSE';
    const rawSector = String(result.sector ?? '');
    const mappedSector = SECTOR_MAP[rawSector] ?? 'Technology';

    const price = Number(result.regularMarketPrice ?? 0);
    const previousClose = Number(result.regularMarketPreviousClose ?? price);
    const marketCapRaw = Number(result.marketCap ?? 0);
    const marketCapB = +(marketCapRaw / 1e9).toFixed(2);
    const dividendYield = (Number(result.dividendYield ?? result.trailingAnnualDividendYield ?? 0) * 100);

    const quote = {
      symbol: String(result.symbol ?? symbol).toUpperCase(),
      name: String(result.longName ?? result.shortName ?? symbol),
      exchange: mappedExchange,
      currency: String(result.currency ?? 'USD'),
      sector: mappedSector,
      price,
      previousClose,
      change: Number(result.regularMarketChange ?? (price - previousClose).toFixed(2)),
      changePercent: Number(result.regularMarketChangePercent ?? 0),
      volume: Number(result.regularMarketVolume ?? 0),
      avgVolume: Number(result.averageDailyVolume3Month ?? 0),
      fundamentals: {
        peRatio: Number(result.trailingPE ?? 0),
        forwardPE: Number(result.forwardPE ?? 0),
        eps: Number(result.epsTrailingTwelveMonths ?? 0),
        marketCap: marketCapB,
        high52w: Number(result.fiftyTwoWeekHigh ?? price * 1.2),
        low52w: Number(result.fiftyTwoWeekLow ?? price * 0.8),
        dividendYield: +dividendYield.toFixed(2),
        beta: Number(result.beta ?? 1),
        roe: +(Number(result.returnOnEquity ?? 0) * 100).toFixed(1),
        profitMargin: +(Number(result.profitMargins ?? 0) * 100).toFixed(1),
        revenueGrowth: +(Number(result.revenueGrowth ?? 0) * 100).toFixed(1),
        analystTarget: Number(result.targetMeanPrice ?? price),
      },
      description: `${String(result.longName ?? symbol)} — live quote from Yahoo Finance.`,
      isLive: true,
    };

    return res.status(200).json({ quote });
  } catch (err) {
    return res.status(500).json({ error: 'Quote failed', detail: String(err) });
  }
}
