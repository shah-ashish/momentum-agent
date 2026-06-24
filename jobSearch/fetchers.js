import { platforms } from "./platforms.js";

/**
 * Decodes standard HTML entities in strings.
 * @param {string} str
 * @returns {string}
 */
function decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;/g, "'");
}

/**
 * Generic RSS XML feed parser and job normalizer.
 * @param {string} sourceName
 * @param {string} url
 * @param {string} defaultLocation
 * @returns {Promise<Array>}
 */
async function fetchRSSJobs(sourceName, url, defaultLocation = "Remote") {
  try {
    console.log(`  📡 Querying ${sourceName} RSS feed...`);
    const res = await fetch(url, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!res.ok) {
      console.error(`  ✖ ${sourceName} RSS feed error:`, res.statusText);
      return [];
    }

    const xml = await res.text();
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || itemContent.match(/<title>([\s\S]*?)<\/title>/i);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
      const dateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const descMatch = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || itemContent.match(/<description>([\s\S]*?)<\/description>/i);

      let title = titleMatch ? titleMatch[1].trim() : "";
      const jobUrl = linkMatch ? linkMatch[1].trim() : "";
      const date = dateMatch ? dateMatch[1].trim() : "";
      const desc = descMatch ? descMatch[1].trim() : "";

      title = decodeEntities(title);

      const companyTagMatch = itemContent.match(/<(?:job:company|company)><!\[CDATA\[([\s\S]*?)\]\]><\/(?:job:company|company)>/i) ||
                             itemContent.match(/<(?:job:company|company)>([\s\S]*?)<\/(?:job:company|company)>/i);
      
      let company = companyTagMatch ? companyTagMatch[1].trim() : sourceName;
      let jobTitle = title;

      if (company === sourceName) {
        // Parse company from title if creator is not present/matching
        const creatorMatch = itemContent.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/i) ||
                             itemContent.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/i);
        if (creatorMatch) {
          let parsedCreator = creatorMatch[1].replace(/<[^>]*>/g, " ").trim();
          parsedCreator = decodeEntities(parsedCreator);
          if (parsedCreator && parsedCreator.length < 100) {
            company = parsedCreator;
          }
        }
      }

      if (company === sourceName || company === "") {
        if (title.includes(" at ")) {
          const parts = title.split(/\s+at\s+/i);
          jobTitle = parts[0].trim();
          company = parts.slice(1).join(" at ").trim();
        } else if (title.includes(" Is Hiring ")) {
          const parts = title.split(/\s+Is\s+Hiring\s+/i);
          company = parts[0].trim();
          jobTitle = "Software Developer/Engineer (" + parts.slice(1).join(" ").trim() + ")";
        } else if (title.includes(":")) {
          const parts = title.split(":");
          company = parts[0].trim();
          jobTitle = parts.slice(1).join(":").trim();
        }
      }

      items.push({
        title: jobTitle,
        company: company,
        url: jobUrl,
        applyUrl: jobUrl,
        tags: [],
        date: date,
        location: defaultLocation,
        source: sourceName,
        description: desc,
        sourceSeniority: ""
      });
    }

    console.log(`  ✅ ${sourceName} RSS: ${items.length} jobs found`);
    return items;
  } catch (err) {
    console.error(`  ✖ ${sourceName} RSS fetch failed:`, err.message);
    return [];
  }
}

/**
 * Resolves a nested key path in an object (e.g. "MatchedObjectDescriptor.PositionTitle")
 * @param {Object} obj
 * @param {string} path
 * @returns {*}
 */
function getValue(obj, path) {
  if (!path) return undefined;
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Generic JSON API fetcher that maps fields dynamically using config schemas.
 * @param {Object} platformConfig
 * @param {Object} criteria
 * @returns {Promise<Array>}
 */
async function fetchJSONAPIJobs(platformConfig, criteria) {
  const { name, url, queryParam, mapping } = platformConfig;
  try {
    const searchVal = criteria.tags[0] || criteria.titles[0] || "";
    let finalUrl = url;
    if (queryParam) {
      finalUrl = url.includes("?") 
        ? `${url}&${queryParam}=${encodeURIComponent(searchVal)}`
        : `${url}?${queryParam}=${encodeURIComponent(searchVal)}`;
    }
    console.log(`  📡 Querying ${name} API...`);
    const res = await fetch(finalUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    if (!res.ok) {
      console.error(`  ✖ ${name} API error:`, res.statusText);
      return [];
    }
    const data = await res.json();
    let jobs = data;
    
    if (mapping.resultsPath) {
      jobs = getValue(data, mapping.resultsPath) || [];
    }
    if (name === "RemoteOK" && Array.isArray(jobs)) {
      jobs = jobs.slice(1); // RemoteOK first item is metadata
    }

    if (!Array.isArray(jobs)) return [];

    return jobs.map(job => {
      const title = getValue(job, mapping.title) || "";
      const company = getValue(job, mapping.company) || "";
      const urlVal = getValue(job, mapping.url) || "";
      const applyUrlVal = mapping.applyUrl ? (getValue(job, mapping.applyUrl) || urlVal) : urlVal;
      const tagsVal = mapping.tags ? (getValue(job, mapping.tags) || []) : [];
      const dateVal = mapping.date ? (getValue(job, mapping.date) || "") : "";
      const locVal = mapping.location ? (getValue(job, mapping.location) || "Remote") : "Remote";
      const descVal = mapping.description ? (getValue(job, mapping.description) || title) : title;
      const seniorityVal = mapping.sourceSeniority ? (getValue(job, mapping.sourceSeniority) || "") : "";

      return {
        title,
        company,
        url: urlVal,
        applyUrl: applyUrlVal,
        tags: Array.isArray(tagsVal) ? tagsVal : [],
        date: typeof dateVal === "number" ? new Date(dateVal * 1000).toISOString() : String(dateVal),
        location: Array.isArray(locVal) ? locVal.join(", ") : String(locVal),
        source: name,
        description: descVal,
        sourceSeniority: Array.isArray(seniorityVal) ? seniorityVal.join(" ") : String(seniorityVal)
      };
    });
  } catch (err) {
    console.error(`  ✖ ${name} fetch failed:`, err.message);
    return [];
  }
}

/**
 * Generic Authorized API fetcher for platforms requiring API keys/headers.
 * @param {Object} platformConfig
 * @param {Object} criteria
 * @returns {Promise<Array>}
 */
async function fetchAuthorizedAPIJobs(platformConfig, criteria) {
  const { name, apiKey, url, mapping, headers = {} } = platformConfig;
  if (!apiKey) {
    console.log(`  📡 ${name}: 0 jobs found (requires API key)`);
    return [];
  }
  try {
    const searchVal = criteria.tags[0] || criteria.titles[0] || "";
    const finalUrl = url
      .replace("{apiKey}", apiKey)
      .replace("{search}", encodeURIComponent(searchVal));

    console.log(`  📡 Querying ${name} API...`);
    
    const fetchHeaders = { ...headers };
    for (const [k, v] of Object.entries(fetchHeaders)) {
      fetchHeaders[k] = v.replace("{apiKey}", apiKey);
    }

    const res = await fetch(finalUrl, { headers: fetchHeaders });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    
    let jobs = data;
    if (mapping.resultsPath) {
      jobs = getValue(data, mapping.resultsPath) || [];
    }

    if (!Array.isArray(jobs)) return [];

    return jobs.map(job => {
      const title = getValue(job, mapping.title) || "";
      const company = getValue(job, mapping.company) || "";
      const urlVal = getValue(job, mapping.url) || "";
      const applyUrlVal = mapping.applyUrl ? (getValue(job, mapping.applyUrl) || urlVal) : urlVal;
      const tagsVal = mapping.tags ? (getValue(job, mapping.tags) || []) : [];
      const dateVal = mapping.date ? (getValue(job, mapping.date) || "") : "";
      const locVal = mapping.location ? (getValue(job, mapping.location) || "Remote") : "Remote";
      const descVal = mapping.description ? (getValue(job, mapping.description) || title) : title;
      const seniorityVal = mapping.sourceSeniority ? (getValue(job, mapping.sourceSeniority) || "") : "";

      return {
        title,
        company,
        url: urlVal,
        applyUrl: applyUrlVal,
        tags: Array.isArray(tagsVal) ? tagsVal : [],
        date: typeof dateVal === "number" ? new Date(dateVal * 1000).toISOString() : String(dateVal),
        location: Array.isArray(locVal) ? locVal.join(", ") : String(locVal),
        source: name,
        description: descVal,
        sourceSeniority: Array.isArray(seniorityVal) ? seniorityVal.join(" ") : String(seniorityVal)
      };
    });
  } catch (err) {
    console.error(`  ✖ ${name} API fetch failed:`, err.message);
    return [];
  }
}

// Dynamically construct PLATFORMS based on platforms.js config
export const PLATFORMS = [];
for (const [type, list] of Object.entries(platforms)) {
  for (const item of list) {
    let runner;
    if (item.engine === "rss") {
      runner = (crit) => fetchRSSJobs(item.name, item.url, item.defaultLocation);
    } else if (item.engine === "json-api") {
      runner = (crit) => fetchJSONAPIJobs(item, crit);
    } else if (item.engine === "authorized-api") {
      runner = (crit) => fetchAuthorizedAPIJobs(item, crit);
    } else {
      runner = () => {
        console.log(`  📡 ${item.name}: 0 jobs found (unsupported without Puppeteer)`);
        return [];
      };
    }
    PLATFORMS.push({
      name: item.name,
      type: type,
      fetch: runner
    });
  }
}
