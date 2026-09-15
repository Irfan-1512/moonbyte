exports.handler = async function(event) {
  try {
    const { messages, systemPrompt, searchQuery } = JSON.parse(event.body);

    // If it's a search request use OpenRouter
    if (searchQuery) {
      const searchResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://moonbyte-ai.netlify.app",
          "X-Title": "Moonbyte"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "user",
              content: `Search for: ${searchQuery}. Give me a clear, concise answer in 2-3 sentences.`
            }
          ]
        })
      });

      const searchData = await searchResponse.json();

      if (!searchResponse.ok || !searchData.choices || !searchData.choices[0]) {
        console.log("OpenRouter error:", JSON.stringify(searchData));
        return {
          statusCode: 200,
          body: JSON.stringify({ reply: `Search failed: ${searchData.error?.message || "unknown OpenRouter error"}` })
        };
      }

      const searchResult = searchData.choices[0].message.content;

      return {
        statusCode: 200,
        body: JSON.stringify({ reply: `🔍 **Search Result:**\n\n${searchResult}` })
      };
    }

    // Normal Groq response
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok || !data.choices || !data.choices[0]) {
      console.log("Groq error:", JSON.stringify(data));
      return {
        statusCode: 200,
        body: JSON.stringify({ reply: `Groq failed: ${data.error?.message || "unknown Groq error"}` })
      };
    }

    const reply = data.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    console.log("Function crashed:", err);
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: `Server error: ${err.message}` })
    };
  }
};