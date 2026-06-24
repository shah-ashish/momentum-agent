import { expandKeywords } from "./keywordExpander.js";
import { PLATFORMS } from "./fetchers.js";
import { isJobMatch, getMinExperienceRequired } from "./filter.js";
import { scoreAndRankJobs } from "./rank.js";
import { verifyUrl } from "./verifier.js";

const jobCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL

/**
 * Main job search function. Expands keywords, queries multiple APIs,
 * filters by relevance, verifies URLs, and returns clean results.
 *
 * @param {string} query - The user's natural language job search query.
 * @param {number} [maxResults=5] - Number of results to return.
 * @returns {Promise<Array<{title: string, company: string, url: string, applyUrl: string, tags: string[], date: string, location: string, source: string}>>}
 */
export async function searchJobs(query, maxResults = 5) {
  const cacheKey = `${query.toLowerCase().trim()}_${maxResults}`;
  const cached = jobCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`\n💼 Job Search Cache Hit for: "${query}"`);
    return cached.data;
  }

  console.log(`\n💼 Job Search Pipeline Started`);
  console.log(`  Query: "${query}"`);
  console.log(`  Requested results: ${maxResults}`);

  // Step 1: Expand keywords using LLM
  console.log("\n📝 Step 1: Expanding keywords...");
  const criteria = await expandKeywords(query);
  console.log(`  Titles: ${criteria.titles.join(", ")}`);
  console.log(`  Tags: ${criteria.tags.join(", ")}`);
  console.log(`  Levels: ${criteria.levels.join(", ") || "(any)"}`);
  console.log(`  Remote: ${criteria.remote}`);

  const targetCount = maxResults || criteria.maxResults || 5;

  // Step 2: Query job platforms in parallel based on intent
  const selectedPlatforms = criteria.remote
    ? PLATFORMS
    : PLATFORMS.filter(p => p.type === "hybrid");

  console.log(`\n📡 Step 2: Querying ${selectedPlatforms.length} job platforms (Intent: ${criteria.remote ? "Remote" : "Local"})...`);
  const resultsArray = await Promise.all(
    selectedPlatforms.map(platform => platform.fetch(criteria))
  );

  // Step 3: Merge and deduplicate
  console.log("\n🔀 Step 3: Merging and deduplicating...");
  const allRawJobs = resultsArray.flat();

  // Deduplicate by company+title combo
  const seen = new Set();
  const uniqueRawJobs = allRawJobs.filter(job => {
    const key = `${job.company.toLowerCase()}-${job.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  Total fetched: ${allRawJobs.length} → Unique: ${uniqueRawJobs.length}`);

  // Step 4: Programmatic Relevance Filter
  console.log("\n🔍 Step 4: Filtering for relevance...");
  const filteredJobs = [];
  for (const job of uniqueRawJobs) {
    const check = isJobMatch(job, criteria);
    if (check.pass) {
      filteredJobs.push(job);
      console.log(`  ✔ [PASS] [${job.source}] ${job.title} (${job.company})`);
    } else {
      // Only print developer/engineer failures to avoid console clutter with non-dev matches
      const titleLower = job.title.toLowerCase();
      const isDevOrEng = ["developer", "engineer", "programmer", "coder", "intern", "development"].some(w => titleLower.includes(w));
      if (isDevOrEng) {
        console.log(`  ❌ [FAIL] [${job.source}] ${job.title} (${job.company}) - Reason: ${check.reason}`);
      }
    }
  }
  console.log(`  Filtered down to: ${filteredJobs.length} relevant jobs`);

  // Step 5: Scoring relevance
  console.log("\n📊 Step 5: Scoring relevance...");
  const scoredJobs = scoreAndRankJobs(filteredJobs, criteria);

  // Take top N candidates (fetch more than needed for URL verification failures)
  const candidates = scoredJobs.slice(0, targetCount + 3);

  // Step 6: Verify URLs
  console.log(`\n🔗 Step 6: Verifying ${candidates.length} URLs...`);
  const verifiedJobs = [];

  const verificationResults = await Promise.all(
    candidates.map(async (job) => {
      const urlToVerify = job.applyUrl || job.url;
      const { isActive, bodyText } = await verifyUrl(urlToVerify);
      return { job, isActive, bodyText };
    })
  );

  for (const { job, isActive, bodyText } of verificationResults) {
    if (isActive) {
      // Deeper experience level check if we got the full webpage text and we are looking for a junior role
      if (bodyText && criteria.levels.length > 0) {
        const wantsJunior = criteria.levels.some(l => 
          ["intern", "junior", "entry", "fresher", "trainee", "graduate", "co-op", "associate"].some(jw => l.toLowerCase().includes(jw))
        );
        if (wantsJunior) {
          const minYears = getMinExperienceRequired(bodyText);
          if (minYears >= 3) {
            console.log(`  ❌ [FAIL] [${job.source}] ${job.title} (${job.company}) - Filtered out post-fetch (requires ${minYears} years of experience)`);
            continue;
          }
        }
      }

      // Remove internal scoring and detail fields before returning
      const { _score, description, sourceSeniority, ...cleanJob } = job;
      verifiedJobs.push(cleanJob);
    } else {
      console.log(`  ⚠️ Filtered out dead URL: ${job.url}`);
    }

    if (verifiedJobs.length >= targetCount) break;
  }

  console.log(`\n✅ Pipeline complete: ${verifiedJobs.length} verified jobs returned`);
  jobCache.set(cacheKey, { timestamp: Date.now(), data: verifiedJobs });
  return verifiedJobs;
}
