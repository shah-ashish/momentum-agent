const webCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL

/**
 * Performs a web search query on DuckDuckGo HTML interface
 * and parses structured result links, titles, and snippets.
 *
 * @param {string} query - The search query
 * @param {number} [maxResults=5] - Number of results to return
 * @returns {Promise<Array<{title: string, link: string, snippet: string}>>}
 */
export async function webSearch(query, maxResults = 5) {
  const cacheKey = `${query.toLowerCase().trim()}_${maxResults}`;
  const cached = webCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`\n🔍 Web Search Cache Hit for: "${query}"`);
    return cached.data;
  }

  console.log(`\n🔍 Web Search Pipeline Started`);
  console.log(`  Query: "${query}"`);
  console.log(`  Requested results: ${maxResults}`);

  try {
    const url = "https://html.duckduckgo.com/html/";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `q=${encodeURIComponent(query)}`
    });

    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const results = [];
    const blocks = html.split('<div class="result ');

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      
      const linkTagMatch = block.match(/<a\s+([^>]*class="[^"]*result__a[^"]*"[^>]*)>([\s\S]*?)<\/a>/i);
      if (!linkTagMatch) continue;

      const attributes = linkTagMatch[1];
      const rawTitle = linkTagMatch[2];

      const hrefMatch = attributes.match(/href="([^"]+)"/i);
      if (!hrefMatch) continue;

      let link = hrefMatch[1];
      
      if (link.includes("uddg=")) {
        try {
          const parts = link.split("uddg=");
          if (parts[1]) {
            const rawUrl = parts[1].split("&")[0];
            link = decodeURIComponent(rawUrl);
          }
        } catch (e) {
          // fallback
        }
      }

      const title = rawTitle
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const snippetTagMatch = block.match(/<a\s+([^>]*class="[^"]*result__snippet[^"]*"[^>]*)>([\s\S]*?)<\/a>/i);
      const snippet = snippetTagMatch
        ? snippetTagMatch[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
        : "";

      results.push({ title, link, snippet });
      if (results.length >= maxResults) break;
    }

    console.log(`  ✅ Web Search complete: ${results.length} results found`);
    webCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    console.error(`  ✖ Web Search failed:`, err.message);
    return [];
  }
}
