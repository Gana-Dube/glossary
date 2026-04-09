const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = process.env.OPENROUTER_DIAGRAM_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!process.env.OPENROUTER_API_KEY) {
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
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
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

      if (!response.ok) throw new Error(`Failed to get diagram from OpenRouter. Status: ${response.status}`);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Unexpected response format from AI API.');

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
    let clientMessage = 'Internal server error processing diagram request.';
    if (error.name === 'AbortError') clientMessage = 'Request timed out. Please try again.';
    return res.status(500).json({ error: clientMessage });
  }
}
