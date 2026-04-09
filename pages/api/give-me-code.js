const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';

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

  const prompt = `Given the acronym "${acronym}" which means "${definition}"${description ? ` (${description})` : ''}, provide a simple, self-contained Python code example (under 30 lines if possible) that demonstrates a concept related to this term. Only output the Python code block, nothing else.`;

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
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`OpenRouter API request failed with status ${response.status}`);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Unexpected response format from AI API.');

      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    const codeContent = data.choices?.[0]?.message?.content?.trim() || 'Sorry, could not generate code example.';
    const cleanedCode = codeContent.replace(/^```python\n?/, '').replace(/\n?```$/, '');
    return res.status(200).json({ text: cleanedCode });
  } catch (error) {
    let clientMessage = 'Failed to get code example from AI.';
    if (error.name === 'AbortError') clientMessage = 'Request timed out. Please try again.';
    else if (error.message?.includes('401')) clientMessage = 'AI API Authentication failed. Check server key.';
    else if (error.message?.includes('429')) clientMessage = 'AI API rate limit reached. Please try again later.';
    return res.status(500).json({ error: clientMessage });
  }
}
