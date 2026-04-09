const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = process.env.OPENROUTER_EXPLAIN_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
  }

  const { acronym, definition, description } = req.body || {};
  if (!acronym || !definition) {
    return res.status(400).json({ error: 'Missing acronym or definition in request body.' });
  }

  const prompt = `You are a helpful telecommunications expert. Provide clear, concise explanations.\n\nExplain the following telecommunications acronym in a single, concise paragraph suitable for a glossary:\n\nAcronym: ${acronym}\nDefinition: ${definition}\n${description ? `Description: ${description}\n` : ''}\nExplanation:`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let data;
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{ role: 'user', content: prompt }],
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
    if (!text) return res.status(500).json({ error: 'Received empty response from AI.' });
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to get explanation from AI.' });
  }
}
