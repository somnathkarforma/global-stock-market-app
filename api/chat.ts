// Edge runtime — no 10s timeout on Vercel hobby plan
export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = new Set([
  'https://somnathkarforma.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]);

function corsHeaders(origin: string): HeadersInit {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') ?? '';
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), { status: 500, headers });
  }

  let messages: Array<{ role: string; content: string }>;
  try {
    const body = await req.json() as { messages?: unknown };
    if (!Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers });
    }
    messages = body.messages as Array<{ role: string; content: string }>;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 400,
        messages,
      }),
    });

    const data = await groqRes.json();

    return new Response(JSON.stringify(data), {
      status: groqRes.status,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
}
