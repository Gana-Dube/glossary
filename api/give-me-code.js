// Using node-fetch as Vercel might run older Node versions without global fetch
const fetch = require('node-fetch'); // Make sure to install: npm install node-fetch

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Using the specified free model
const MODEL_NAME = "mistralai/mistral-small-24b-instruct-2501:free";

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY environment variable.");
  // Avoid throwing error here to allow deployment, but log it.
}

module.exports = async (req, res) => {
  // Basic CORS setup - adjust allowed origins as needed for production
  const allowedOrigin = process.env.NODE_ENV === 'development'
      ? '*' // Allow all for local dev simplicity
      : 'https://glossary-one.vercel.app'; // Your production domain
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow Content-Type

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ detail: `Method ${req.method} Not Allowed` });
  }

  if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ detail: "Server configuration error: Missing API Key." });
  }

  try {
    const { acronym, definition, description } = req.body;

    if (!acronym || !definition) {
      return res.status(400).json({ detail: "Missing acronym or definition in request body." });
    }

    // Construct the prompt for OpenRouter
    const prompt = `Given the acronym "${acronym}" which means "${definition}"${description ? ` (${description})` : ''}, provide a simple, self-contained Python code example (under 30 lines if possible) that demonstrates a concept related to this term. For example, if the term is about networking, show a basic socket example; if it's about data structures, show a simple dictionary usage. Focus on illustrating the core idea. Only output the Python code block, nothing else.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // Optional: Add site URL/App name for tracking
        // "HTTP-Referer": your_site_url,
        // "X-Title": your_app_name,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text(); // Get raw text for debugging
      console.error("OpenRouter API Error:", response.status, errorData);
      throw new Error(`OpenRouter API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Extract the code from the response
    const codeContent = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
        ? data.choices[0].message.content.trim()
        : "Sorry, could not generate code example.";

    // Basic cleanup: remove potential markdown backticks if the model included them
    const cleanedCode = codeContent.replace(/^```python\n?/, '').replace(/\n?```$/, '');

    return res.status(200).json({ code: cleanedCode });

  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    let clientMessage = "Failed to get code example from AI.";
    if (error.message.includes('401')) { // Check for potential auth errors
        clientMessage = "AI API Authentication failed. Check server key.";
    } else if (error.message.includes('429')) { // Rate limiting
        clientMessage = "AI API rate limit reached. Please try again later.";
    }
    // Add more specific error checks if needed
    return res.status(500).json({ detail: clientMessage });
  }
};