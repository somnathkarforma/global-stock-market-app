import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  // Public read-only endpoint used by web clients from multiple origins.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.query as { symbol?: string };
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

  try {
    const normalizedSymbol = symbol.toUpperCase();

    const buildQuote = (result: Record<string, number | string | null>, sectorOverride?: string) => {
      const exchCode = String(result.exchange ?? '');
      const mappedExchange = YF_EXCHANGE_MAP[exchCode] ?? 'NYSE';
      const rawSector = String(result.sector ?? sectorOverride ?? '');
      const mappedSector = SECTOR_MAP[rawSector] ?? 'Technology';

      const price = Number(result.regularMarketPrice ?? 0);
      const previousClose = Number(result.regularMarketPreviousClose ?? result.previousClose ?? price);
      const marketCapRaw = Number(result.marketCap ?? 0);
      const marketCapB = +(marketCapRaw / 1e9).toFixed(2);
      const dividendYield = (Number(result.dividendYield ?? result.trailingAnnualDividendYield ?? 0) * 100);
      const derivedChange = +(price - previousClose).toFixed(2);
      const derivedChangePct = previousClose > 0 ? +((derivedChange / previousClose) * 100).toFixed(2) : 0;

      return {
        symbol: String(result.symbol ?? normalizedSymbol).toUpperCase(),
        name: String(result.longName ?? result.shortName ?? normalizedSymbol),
        exchange: mappedExchange,
        currency: String(result.currency ?? 'USD'),
        sector: mappedSector,
        price,
        previousClose,
        change: Number(result.regularMarketChange ?? derivedChange),
        changePercent: Number(result.regularMarketChangePercent ?? derivedChangePct),
        volume: Number(result.regularMarketVolume ?? result.volume ?? 0),
        avgVolume: Number(result.averageDailyVolume3Month ?? result.avgVolume ?? result.regularMarketVolume ?? 0),
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
        description: `${String(result.longName ?? normalizedSymbol)} — live quote from Yahoo Finance.`,
        isLive: true,
      };
    };

    const fields = [
      'regularMarketPrice', 'regularMarketPreviousClose', 'regularMarketChange',
      'regularMarketChangePercent', 'regularMarketVolume', 'averageDailyVolume3Month',
      'trailingPE', 'epsTrailingTwelveMonths', 'marketCap', 'fiftyTwoWeekHigh',
      'fiftyTwoWeekLow', 'dividendYield', 'beta', 'forwardPE',
      'shortName', 'longName', 'exchange', 'currency', 'sector',
      'trailingAnnualDividendYield', 'returnOnEquity', 'profitMargins',
      'revenueGrowth', 'targetMeanPrice', 'bookValue',
    ].join(',');

    const quoteUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(normalizedSymbol)}&fields=${fields}`;
    const yfRes = await fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockSenseBot/1.0)',
        'Accept': 'application/json',
      },
    });

    const data = yfRes.ok ? await yfRes.json() as {
      quoteResponse?: {
        result?: Array<Record<string, number | string | null>>;
        error?: unknown;
      };
    } : null;

    const result = data?.quoteResponse?.result?.[0];
    if (result) {
      return res.status(200).json({ quote: buildQuote(result) });
    }

    // Fallback for regions/symbols where quote endpoint returns 401/empty.
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}?range=1d&interval=1m`;
    const chartRes = await fetch(chartUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockSenseBot/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!chartRes.ok) {
      return res.status(502).json({ error: 'Upstream quote failed', status: chartRes.status });
    }

    const chartData = await chartRes.json() as {
      chart?: {
        result?: Array<{
          meta?: Record<string, number | string | null>;
          indicators?: { quote?: Array<{ volume?: Array<number | null> }> };
        }>;
      };
    };

    const chartResult = chartData.chart?.result?.[0];
    const meta = chartResult?.meta;
    if (!meta) return res.status(404).json({ error: 'Symbol not found' });

    const volumes = chartResult?.indicators?.quote?.[0]?.volume ?? [];
    const latestVolume = [...volumes].reverse().find(v => typeof v === 'number' && Number.isFinite(v)) ?? 0;

    const fallbackResult: Record<string, number | string | null> = {
      symbol: String(meta.symbol ?? normalizedSymbol),
      longName: String(meta.longName ?? meta.shortName ?? normalizedSymbol),
      shortName: String(meta.shortName ?? normalizedSymbol),
      exchange: String(meta.exchangeName ?? ''),
      currency: String(meta.currency ?? 'USD'),
      regularMarketPrice: Number(meta.regularMarketPrice ?? 0),
      regularMarketPreviousClose: Number(meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice ?? 0),
      regularMarketVolume: Number(latestVolume),
    };

    return res.status(200).json({ quote: buildQuote(fallbackResult) });
  } catch (err) {
    return res.status(500).json({ error: 'Quote failed', detail: String(err) });
  }
}
