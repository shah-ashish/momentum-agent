/**
 * Scores and ranks job postings based on keyword alignment.
 * 
 * @param {Array} jobs - The filtered, unique list of jobs.
 * @param {Object} criteria - Expanded keywords and search criteria.
 * @returns {Array} Scored and sorted jobs.
 */
export function scoreAndRankJobs(jobs, criteria) {
  const scoredJobs = jobs.map(job => {
    let score = 0;
    const titleLower = job.title.toLowerCase();
    const tagsLower = (job.tags || []).map(t => t.toLowerCase());

    // Title contains an exact keyword match → high score
    for (const kw of criteria.titles) {
      if (titleLower.includes(kw.toLowerCase())) {
        score += 10;
        break;
      }
    }

    // Title contains individual words from keywords → medium score
    for (const kw of criteria.tags) {
      if (titleLower.includes(kw.toLowerCase())) score += 3;
    }

    // Tags match → medium score
    for (const kw of criteria.tags) {
      if (tagsLower.some(t => t.includes(kw.toLowerCase()))) score += 2;
    }

    // Level match in title → bonus
    for (const level of criteria.levels) {
      if (titleLower.includes(level.toLowerCase())) {
        score += 5;
        break;
      }
    }

    return { ...job, _score: score };
  });

  // Sort by score descending
  return scoredJobs.sort((a, b) => b._score - a._score);
}
