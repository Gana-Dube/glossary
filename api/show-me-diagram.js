// Using built-in fetch API (available in Node.js 18+)
// Vercel uses Node.js 18+ by default

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Using the specified model
const MODEL_NAME = "qwen/qwen-72b:free";

if (!OPENROUTER_API_KEY) {
  // Avoid throwing error here to allow deployment, but log it.
  console.error("Missing OPENROUTER_API_KEY environment variable.");
}

// Export the handler function for Vercel
module.exports = async (req, res) => {
  // Allow requests from your Vercel domain (and localhost for testing)
  const allowedOrigin = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000' // Or whatever port you use locally
      : 'https://glossary-one.vercel.app'; // Correct production domain with https
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    const { diagramPrompt } = req.body;

    if (!diagramPrompt) {
      return res.status(400).json({ detail: "Missing 'diagramPrompt' in request body." });
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": allowedOrigin,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: "system",
            content: "You are an expert in generating Mermaid.js markdown diagrams. Your response should ONLY be the Mermaid code block itself, starting with ```mermaid and ending with ```. Do not include any other explanatory text, greetings, or apologies. Follow all syntax rules for Mermaid diagrams precisely."
          },
          {
            role: "user",
            content: diagramPrompt
          }
        ],
        max_tokens: 1500 // Adjust as needed
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenRouter API Error:", errorData);
      return res.status(response.status).json({ 
        detail: `Failed to get diagram from OpenRouter. Status: ${response.status}. ${errorData}` 
      });
    }

    const data = await response.json();
    
    let mermaidCode = "";
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      mermaidCode = data.choices[0].message.content.trim();
      
      // Ensure it's a valid mermaid block, sometimes LLMs add extra quotes or text
      if (mermaidCode.startsWith("```mermaid") && mermaidCode.endsWith("```")) {
        // It's good
      } else if (mermaidCode.includes("```mermaid")) {
        // Try to extract it
        const startIndex = mermaidCode.indexOf("```mermaid");
        const endIndex = mermaidCode.lastIndexOf("```") + 3;
        if (startIndex !== -1 && endIndex > startIndex) {
          mermaidCode = mermaidCode.substring(startIndex, endIndex);
        } else {
          // Could not reliably extract, pass through but might fail on client
        }
      } else {
         // If it's not a block, assume the LLM just gave the raw mermaid content
         // and wrap it ourselves. This is a fallback.
         mermaidCode = "```mermaid\n" + mermaidCode + "\n```";
      }
    } else {
      console.error("Unexpected response structure from OpenRouter:", data);
      return res.status(500).json({ detail: "Received unexpected response structure from OpenRouter." });
    }

    return res.status(200).json({ mermaidCode });

  } catch (error) {
    console.error("Error in show-me-diagram handler:", error);
    return res.status(500).json({ detail: "Internal server error processing diagram request." });
  }
};
