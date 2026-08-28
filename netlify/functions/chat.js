exports.handler = async function(event) {
  const { messages, systemPrompt } = JSON.parse(event.body);
  
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
  const reply = data.choices[0].message.content;

  return {
    statusCode: 200,
    body: JSON.stringify({ reply })
  };
};