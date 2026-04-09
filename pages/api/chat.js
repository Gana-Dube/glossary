const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = process.env.OPENROUTER_MODEL || 'mistralai/mistral-small-24b-instruct-2501:free';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
  }

  const { message, acronymsContext } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Missing message in request body.' });
  }

  // Compact context — send only acronym + definition to avoid huge payloads
  const contextSummary = Array.isArray(acronymsContext)
    ? acronymsContext.map(a => `${a.acronym}: ${a.definition}`).join('\n')
    : '';

  const systemPrompt = `You are a helpful assistant for a glossary application. Answer questions about acronyms, their meanings, usage, and related concepts based on the provided data. Be concise and informative.

Acronyms database:
${contextSummary}

If the user asks about an acronym not in the database, say so clearly.`;

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
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter error ${response.status}: ${errText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Unexpected response format from AI API.');
      }

      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.';
    return res.status(200).json({ reply });
  } catch (err) {
    let clientMessage = 'Failed to get response from AI.';
    if (err.name === 'AbortError') {
      clientMessage = 'Request timed out. Please try again.';
    }
    return res.status(500).json({ error: clientMessage });
  }
}
