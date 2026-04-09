const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = process.env.OPENROUTER_DIAGRAM_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';
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

  const { diagramPrompt } = req.body || {};

  if (!diagramPrompt) {
    return res.status(400).json({ error: "Missing 'diagramPrompt' in request body." });
  }

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
            { role: 'user', content: `You are an expert in generating Mermaid.js markdown diagrams. Your response should ONLY be the Mermaid code block itself, starting with \`\`\`mermaid and ending with \`\`\`. Do not include any other explanatory text, greetings, or apologies. Follow all syntax rules for Mermaid diagrams precisely.\n\n${diagramPrompt}` },
          ],
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to get diagram from OpenRouter. Status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Unexpected response format from AI API.');
      }

      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    if (!data.choices?.length || !data.choices[0].message?.content) {
      return res.status(500).json({ error: 'Received unexpected response structure from OpenRouter.' });
    }

    let mermaidCode = data.choices[0].message.content.trim();
    if (mermaidCode.includes('```mermaid')) {
      const startIndex = mermaidCode.indexOf('```mermaid');
      const endIndex = mermaidCode.lastIndexOf('```') + 3;
      if (startIndex !== -1 && endIndex > startIndex) {
        mermaidCode = mermaidCode.substring(startIndex, endIndex);
      }
    } else {
      mermaidCode = '```mermaid\n' + mermaidCode + '\n```';
    }

    return res.status(200).json({ mermaidCode });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error processing diagram request.' });
  }
};
