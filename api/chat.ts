import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://somnathkarforma.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGroq(apiKey: string, body: string, attempt = 0): Promise<Response> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body,
  });
  // One quick retry on 429, no sleep (must finish within Vercel 10s hobby limit)
  if (response.status === 429 && attempt < 1) {
    return callGroq(apiKey, body, attempt + 1);
  }
  return response;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured on server' });
  }

  try {
    const { messages } = req.body as {
      messages: Array<{ role: string; content: string }>;
    };

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const response = await callGroq(
      apiKey,
      JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 400,
        messages,
      }),
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
