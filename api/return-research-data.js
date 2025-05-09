// filepath: /Users/gana/Documents/glossary/api/return-research-data.js
const axios = require('axios');
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
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ detail: "Missing query in request body." });
        }
        // Get API key from environment variables
        const API_KEY = process.env.CORE_API_KEY;
        if (!API_KEY) {
            throw new Error("Missing CORE_API_KEY environment variable.");
        }
        // API endpoint for search
        const url = "https://api.core.ac.uk/v3/search/works";
        // Headers including API key
        const headers = {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
        };
        // Query payload
        const payload = {
            "q": query,
            "limit": 5,
            "offset": 0,
            "fields": [
                "title",
                "abstract",
                "authors",
                "downloadUrl",
                "doi"
            ],
            "facets": ["year", "language"],
            "filters": {
                "language": ["en"]
            }
        };
        // Make the POST request
        const response = await axios.post(url, payload, { headers });
        // Return the results
        return res.status(200).json(response.data);
    } catch (error) {
        // Avoid sending detailed internal errors to the client
        let clientMessage = "Failed to get research data.";
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            clientMessage = `API error: ${error.response.status}`;
        } else if (error.request) {
            // The request was made but no response was received
            clientMessage = "No response from research API";
        } else if (error.message.includes('API key')) {
            clientMessage = "Research API Key is invalid or missing.";
        }
        return res.status(500).json({ detail: clientMessage });
    }
};