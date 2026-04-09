const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = process.env.OPENROUTER_EXPLAIN_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://glossary-one.vercel.app';

module.exports = async (req, res) => {
  const allowedOrigin = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : ALLOWED_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
  }

  const { acronym, definition, description } = req.body || {};

  if (!acronym || !definition) {
    return res.status(400).json({ error: 'Missing acronym or definition in request body.' });
  }

  const prompt = `Explain the following telecommunications acronym in a single, concise paragraph suitable for a glossary:\n\nAcronym: ${acronym}\nDefinition: ${definition}\n${description ? `Description: ${description}\n` : ''}\nExplanation:`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let data;
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': allowedOrigin,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'user', content: `You are a helpful telecommunications expert. Provide clear, concise explanations.\n\n${prompt}` },
          ],
          max_tokens: 400,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenRouter error: ${response.status}`);
      }

      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return res.status(500).json({ error: 'Received empty response from AI.' });
    }
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to get explanation from AI.' });
  }
};
