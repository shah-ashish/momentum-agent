import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const systemPrompt = fs.readFileSync(path.join(__dirname, "system_prompt.txt"), "utf-8");

const keywordsCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL

/**
 * Uses the LLM to extract structured search criteria and keyword synonyms
 * from a raw user prompt. This is a single, fast API call — not a multi-step agent loop.
 *
 * @param {string} rawPrompt - The user's natural language job search query.
 * @returns {Promise<{titles: string[], levels: string[], tags: string[], remote: boolean, maxResults: number}>}
 */
export async function expandKeywords(rawPrompt) {
  const cacheKey = rawPrompt.toLowerCase().trim();
  const cached = keywordsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`  🔑 Keywords Expander Cache Hit for: "${rawPrompt}"`);
    return cached.data;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.AI_MODEL || "openai/gpt-4o-mini";
  const appUrl = process.env.APP_URL || "http://localhost:5173";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing in your .env file.");
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": appUrl,
        "X-Title": "Keyword Expander",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawPrompt }
        ],
      }),
    });

    if (!res.ok) {
      console.error("  ✖ Keyword expansion API error:", await res.text());
      return getDefaultCriteria(rawPrompt);
    }

    const data = await res.json();
    let text = data.choices?.[0]?.message?.content ?? "";
    
    // Strip markdown code fences if present
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    const parsed = JSON.parse(text);
    console.log(`  🔑 Keywords expanded: ${parsed.titles?.length || 0} titles, ${parsed.tags?.length || 0} tags`);
    const expanded = {
      titles: parsed.titles || [],
      levels: parsed.levels || [],
      tags: parsed.tags || [],
      remote: parsed.remote ?? true,
      maxResults: parsed.maxResults || 5
    };
    keywordsCache.set(cacheKey, { timestamp: Date.now(), data: expanded });
    return expanded;
  } catch (err) {
    console.error("  ✖ Keyword expansion failed, using fallback:", err.message);
    return getDefaultCriteria(rawPrompt);
  }
}

/**
 * Fallback keyword extraction using simple string parsing (no LLM needed).
 */
function getDefaultCriteria(rawPrompt) {
  const lower = rawPrompt.toLowerCase();
  return {
    titles: [rawPrompt],
    levels: lower.includes("intern") ? ["intern", "internship", "junior", "entry level", "fresher"] : [],
    tags: lower.split(/\s+/).filter(w => w.length > 2),
    remote: /remote|wfh|work.from.home/i.test(lower),
    maxResults: 5
  };
}
