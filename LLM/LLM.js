import dotenv from "dotenv";
dotenv.config();

/**
 * Sends messages to OpenRouter and returns the generated message object.
 * 
 * @param {Array} messages - The message history array to send.
 * @param {Object} [options] - Optional parameters.
 * @param {string} [options.apiKey] - OpenRouter API key (defaults to process.env.OPENROUTER_API_KEY).
 * @param {string} [options.model] - The LLM model to use (defaults to process.env.AI_MODEL or "openai/gpt-4o-mini").
 * @param {Array} [options.tools] - Optional tools array.
 * @param {number} [options.temperature] - Optional temperature.
 * @param {number} [options.max_tokens] - Optional max tokens.
 * @returns {Promise<Object>} The response message object from the model (contains content and/or tool_calls).
 */
export async function askLLM(messages, options = {}) {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  const model = options.model || process.env.AI_MODEL || "openai/gpt-4o-mini";
  const appUrl = process.env.APP_URL || "http://localhost:5173";

  if (!apiKey) {
    throw new Error("API Key is missing. Please set OPENROUTER_API_KEY in the environment or .env file.");
  }

  const body = {
    model,
    messages,
    tools: options.tools,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2000
  };

  const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": appUrl,
      "X-Title": "LLM Connector",
    },
    body: JSON.stringify(body),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    console.error("  ✖ OpenRouter error:", err);
    throw new Error(`OpenRouter error: ${err}`);
  }

  const data = await aiRes.json();
  const message = data.choices?.[0]?.message;
  
  if (!message) {
    throw new Error("Invalid response from OpenRouter");
  }

  return message;
}
