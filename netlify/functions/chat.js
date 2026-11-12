const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async function(event) {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  // Reject anything other than POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  // Guard against missing or malformed body
  let parsed;
  try {
    parsed = event.body ? JSON.parse(event.body) : {};
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid JSON in request body." }),
    };
  }

  const { messages, systemPrompt, searchQuery } = parsed;
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeSystemPrompt = typeof systemPrompt === "string" ? systemPrompt : "";

  try {
    // 1. If it's a search request AND we have an OpenRouter key, try OpenRouter first
    if (searchQuery && process.env.OPENROUTER_API_KEY) {
      try {
        const searchResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://moonbyte-ai.netlify.app",
            "X-Title": "Moonbyte",
          },
          body: JSON.stringify({
            model: "openrouter/free",
            messages: [
              {
                role: "user",
                content: `Search for: ${searchQuery}. Give me a clear, concise answer in 2-3 sentences.`,
              },
            ],
          }),
        });

        const searchData = await searchResponse.json();
        if (searchResponse.ok && searchData.choices && searchData.choices[0]) {
          const searchResult = searchData.choices[0].message.content;
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ reply: `🔍 **Search Result:**\n\n${searchResult}` }),
          };
        }
        console.warn("OpenRouter returned non-standard reply, falling back to Groq:", searchData);
      } catch (searchErr) {
        console.warn("OpenRouter lookup failed, falling back to Groq:", searchErr);
      }
    }

    // 2. Main Groq model response
    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "Missing GROQ_API_KEY environment variable.",
          reply: "Configuration error: GROQ_API_KEY is not set on the server.",
        }),
      };
    }

    // Prepare messages array for Groq
    const groqMessages = [
      ...(safeSystemPrompt ? [{ role: "system", content: safeSystemPrompt }] : []),
      ...safeMessages,
    ];

    // If search fell back to Groq, ensure the query is included if messages was empty
    if (searchQuery && !groqMessages.some((m) => m.role === "user")) {
      groqMessages.push({ role: "user", content: `Search for information on: ${searchQuery}` });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: groqMessages,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.choices || !data.choices[0]) {
      console.error("Groq error response:", JSON.stringify(data));
      return {
        statusCode: response.status || 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: data.error?.message || "Groq service error",
          reply: "Sorry Irfan, I ran into an issue connecting to the AI server. Please try again! 🌙",
        }),
      };
    }

    const reply = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Function exception:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: err.message,
        reply: "Sorry Irfan, an unexpected server error occurred. Please try again! 🌙",
      }),
    };
  }
};
