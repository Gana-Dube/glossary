// filepath: /Users/gana/Documents/glossary/api/tell-me-more.js
const { GoogleGenerativeAI } = require("@google/generative-ai-js");

// IMPORTANT: Access your API key from environment variables
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }); // Using latest model

// Export the handler function for Vercel
module.exports = async (req, res) => {
  // Allow requests from your Vercel domain (and localhost for testing)
  // Adjust 'YOUR_VERCEL_DEPLOYMENT_URL' or use '*' for less security during dev
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
    const { acronym, definition, description } = req.body;

    if (!acronym || !definition) {
      return res.status(400).json({ detail: "Missing acronym or definition in request body." });
    }

    // Construct a prompt for the AI
    const prompt = `Explain the following telecommunications acronym in a single, concise paragraph suitable for a glossary:\n\nAcronym: ${acronym}\nDefinition: ${definition}\n${description ? `Description: ${description}\n` : ''}\nExplanation:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Send the AI's response back to the frontend
    return res.status(200).json({ text });

  } catch (error) {
    // console.error("Error calling Google AI API:", error); // Removed log
    // Avoid sending detailed internal errors to the client
    let clientMessage = "Failed to get explanation from AI.";
    if (error.message.includes('API key not valid')) {
        clientMessage = "AI API Key is invalid or missing."
    }
    // Add more specific error checks if needed
    return res.status(500).json({ detail: clientMessage });
  }
};
