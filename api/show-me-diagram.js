const AWANLLM_API_KEY = process.env.AWANLLM_API_KEY;
const AWANLLM_MODEL_NAME = process.env.AWANLLM_MODEL_NAME || "Meta-Llama-3.1-8B-Instruct"; // Or your preferred model

if (!AWANLLM_API_KEY) {
  throw new Error("Missing AWANLLM_API_KEY environment variable.");
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

  try {
    const { diagramPrompt } = req.body;

    if (!diagramPrompt) {
      return res.status(400).json({ detail: "Missing 'diagramPrompt' in request body." });
    }

    const awanPayload = {
      model: AWANLLM_MODEL_NAME,
      messages: [
        {
          role: "system",
          content: "You are an expert in generating Mermaid.js markdown diagrams. Your response should ONLY be the Mermaid code block itself, starting with ```mermaid and ending with ```. Do not include any other explanatory text, greetings, or apologies."
        },
        {
          role: "user",
          content: diagramPrompt
        }
      ],
      max_tokens: 1500, // Adjust as needed
      stream: false // Easier to handle in serverless
    };

    const response = await fetch("https://api.awanllm.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AWANLLM_API_KEY}`
      },
      body: JSON.stringify(awanPayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("AwanLLM API Error:", errorData);
      return res.status(response.status).json({ detail: `Failed to get diagram from AwanLLM. Status: ${response.status}. ${errorData}` });
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
      console.error("Unexpected response structure from AwanLLM:", data);
      return res.status(500).json({ detail: "Received unexpected response structure from AwanLLM." });
    }

    return res.status(200).json({ mermaidCode });

  } catch (error) {
    console.error("Error in show-me-diagram handler:", error);
    return res.status(500).json({ detail: "Internal server error processing diagram request." });
  }
};
