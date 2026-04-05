import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://somnathkarforma.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Yahoo Finance exchange code → our Exchange names
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

const SUPPORTED_EXCHANGES = new Set(Object.values(YF_EXCHANGE_MAP));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query as { q?: string };
  if (!q || !q.trim()) return res.status(400).json({ error: 'Missing query' });

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0&listsCount=0&enableFuzzyQuery=true&enableEnhancedTrivialQuery=true`;
    const yfRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockSenseBot/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!yfRes.ok) {
      return res.status(502).json({ error: 'Upstream search failed', status: yfRes.status });
    }

    const data = await yfRes.json() as {
      quotes?: Array<{
        symbol: string;
        shortname?: string;
        longname?: string;
        exchange?: string;
        exchDisp?: string;
        typeDisp?: string;
        quoteType?: string;
      }>;
    };

    const quotes = (data.quotes ?? [])
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map(q => {
        const exchCode = q.exchange ?? '';
        const mappedExchange = YF_EXCHANGE_MAP[exchCode] ?? null;
        return {
          symbol: q.symbol,
          name: q.longname ?? q.shortname ?? q.symbol,
          exchange: mappedExchange,
          exchDisp: q.exchDisp ?? exchCode,
        };
      })
      .filter(q => q.exchange && SUPPORTED_EXCHANGES.has(q.exchange))
      .slice(0, 10);

    return res.status(200).json({ quotes });
  } catch (err) {
    return res.status(500).json({ error: 'Search failed', detail: String(err) });
  }
}
