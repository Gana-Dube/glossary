const CORE_API_URL = 'https://api.core.ac.uk/v3/search/works';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { query } = req.body || {};
  if (!query) {
    return res.status(400).json({ error: 'Missing query in request body.' });
  }

  if (!process.env.CORE_API_KEY) {
    return res.status(500).json({ error: 'Research API key is not configured.' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let data;
    try {
      const response = await fetch(CORE_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CORE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          limit: 5,
          offset: 0,
          fields: ['title', 'abstract', 'authors', 'downloadUrl', 'doi'],
          facets: ['year', 'language'],
          filters: { language: ['en'] },
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Unexpected response format from research API.');

      data = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    return res.status(200).json(data);
  } catch (error) {
    let clientMessage = 'Failed to get research data.';
    if (error.name === 'AbortError') clientMessage = 'Request timed out. Please try again.';
    else if (error.message?.includes('API error:')) clientMessage = error.message;
    else if (error.message?.toLowerCase().includes('api key')) clientMessage = 'Research API Key is invalid or missing.';
    return res.status(500).json({ error: clientMessage });
  }
}
