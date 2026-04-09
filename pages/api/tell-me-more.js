import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!process.env.GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Google API key is not configured.' });
  }

  const { acronym, definition, description } = req.body || {};
  if (!acronym || !definition) {
    return res.status(400).json({ error: 'Missing acronym or definition in request body.' });
  }

  const prompt = `Explain the following telecommunications acronym in a single, concise paragraph suitable for a glossary:\n\nAcronym: ${acronym}\nDefinition: ${definition}\n${description ? `Description: ${description}\n` : ''}\nExplanation:`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let text;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      text = response.text();
    } finally {
      clearTimeout(timeout);
    }
    return res.status(200).json({ text });
  } catch (error) {
    let clientMessage = 'Failed to get explanation from AI.';
    if (error.message?.includes('API key not valid')) clientMessage = 'AI API Key is invalid or missing.';
    else if (error.name === 'AbortError') clientMessage = 'Request timed out. Please try again.';
    return res.status(500).json({ error: clientMessage });
  }
}
