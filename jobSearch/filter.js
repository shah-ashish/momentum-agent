/**
 * Parses minimum required years of experience from a job description.
 * @param {string} desc - The job description.
 * @returns {number} The maximum minimum years of experience found.
 */
export function getMinExperienceRequired(desc) {
  const regexes = [
    /\b(\d+)\s*\+\s*(?:years?|yrs?|yrs\b)/gi,
    /\b(?:minimum|min|at least|proven|require[sd]?)\b[^.!?\n]*?\b(\d+)\s*(?:years?|yrs?)\b/gi,
    /\b(\d+)\s*-\s*\d+\s*(?:years?|yrs?)/gi,
    /\b(\d+)\s*(?:years?|yrs?)\b\s*(?:of\s+)?\b(?:experience|work|industry|professional)\b/gi
  ];

  let maxMinYears = 0;
  
  for (const regex of regexes) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(desc)) !== null) {
      const years = parseInt(match[1], 10);
      if (!isNaN(years) && years > maxMinYears) {
        maxMinYears = years;
      }
    }
  }
  return maxMinYears;
}

/**
 * Programmatic matching logic that determines if a job matches search criteria.
 * Avoids checking the full description for levels (e.g. junior/intern) to prevent
 * false-positives like "mentoring junior engineers" or "not an entry level role".
 * 
 * @param {Object} job - The normalized job object.
 * @param {{titles: string[], levels: string[], tags: string[], remote: boolean}} criteria - Structured criteria.
 * @returns {boolean}
 */
export function isJobMatch(job, criteria) {
  const title = (job.title || "").toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const tags = (job.tags || []).map(t => t.toLowerCase());
  const seniorityText = (job.sourceSeniority || "").toLowerCase();

  const titleKeywords = criteria.titles.map(t => t.toLowerCase());
  const tagKeywords = criteria.tags.map(t => t.toLowerCase());
  const levelKeywords = criteria.levels.map(l => l.toLowerCase());

  // 1. Title Keyword Match
  const titleMatch = titleKeywords.some(kw => 
    title.includes(kw) || kw.split(" ").every(word => title.includes(word))
  );

  // 2. Tag Match
  const tagMatch = tagKeywords.some(kw => 
    tags.some(t => t.includes(kw) || kw.includes(t)) || title.includes(kw)
  );

  // 3. Description Match
  const descMatch = tagKeywords.some(kw => desc.includes(kw));

  // Core rule: must match title OR (tags AND description)
  if (!titleMatch && !(tagMatch && descMatch)) {
    return { pass: false, reason: "Title/Tag/Desc mismatch" };
  }

  // 3b. Title Word Match (ensure the title contains at least one relevant keyword term to prevent non-industry matches like Copywriter)
  const stopWords = new Set(["and", "for", "the", "with", "off", "non", "not"]);
  const titleWords = titleKeywords.flatMap(t => t.split(/[\s/\-,.()]+/)).filter(w => w.length >= 2 && !stopWords.has(w));
  const titleWordMatch = titleWords.some(w => title.includes(w));
  if (!titleWordMatch) {
    return { pass: false, reason: "Title word mismatch (no dev/engineering keywords)" };
  }

  // 4. Strict Seniority & Level Checking
  if (levelKeywords.length > 0) {
    const wantsJunior = levelKeywords.some(l => 
      ["intern", "junior", "entry", "fresher", "trainee", "graduate", "co-op", "associate"].some(jw => l.includes(jw))
    );
    const wantsSenior = levelKeywords.some(l => 
      ["senior", "sr", "lead", "staff", "principal", "architect", "manager", "director", "head"].some(sw => l.includes(sw))
    );

    const isSeniorTitle = ["senior", "sr.", "sr ", "lead", "staff", "principal", "architect", "vp", "director", "manager", "head"].some(sw => 
      title.includes(sw) || title.startsWith(sw + " ") || title.endsWith(" " + sw)
    );
    const isJuniorTitle = ["intern", "junior", "entry", "fresher", "trainee", "graduate", "co-op", "associate"].some(jw => 
      title.includes(jw)
    );

    const isSeniorExplicit = ["senior", "lead", "staff", "principal", "architect", "director", "manager"].some(sw => 
      seniorityText.includes(sw) || tags.some(t => t.includes(sw))
    );
    const isJuniorExplicit = ["intern", "junior", "entry", "fresher", "trainee", "graduate", "co-op", "associate"].some(jw => 
      seniorityText.includes(jw) || tags.some(t => t.includes(jw))
    );

    // If searching for junior/intern, explicitly REJECT senior roles
    if (wantsJunior && (isSeniorTitle || isSeniorExplicit)) {
      return { pass: false, reason: `Wants junior but is senior (title=${isSeniorTitle}, explicit=${isSeniorExplicit})` };
    }

    // If searching for senior, explicitly REJECT junior roles
    if (wantsSenior && (isJuniorTitle || isJuniorExplicit)) {
      return { pass: false, reason: `Wants senior but is junior (title=${isJuniorTitle}, explicit=${isJuniorExplicit})` };
    }

    // Reject jobs that require 3 or more years of experience when searching for junior/internships
    if (wantsJunior) {
      const minYears = getMinExperienceRequired(desc);
      if (minYears >= 3) {
        return { pass: false, reason: `Wants junior but description requires ${minYears} years of experience` };
      }
    }

    // Soft check: require some level-specific keyword match in title, tags, or explicit seniority if specified.
    // Also allow matching numeric experience keywords in the description (e.g., "0-2 years", "1+ years").
    const levelMatch = isJuniorTitle || isSeniorTitle || isJuniorExplicit || isSeniorExplicit ||
                       levelKeywords.some(l => title.includes(l) || seniorityText.includes(l) || tags.includes(l)) ||
                       levelKeywords.some(l => {
                         const isExperienceKeyword = /year|yr|\d+\+|\d+\s*-\s*\d+/i.test(l);
                         return isExperienceKeyword && desc.includes(l);
                       });
    
    // If there is no level keyword match, we only keep it if the title is an exact synonym match
    if (!levelMatch && !titleMatch) {
      return { pass: false, reason: `No level keyword match in junior/intern title and not exact title match` };
    }
  }

  // 5. Remote Location Filter
  if (criteria.remote) {
    const loc = (job.location || "").toLowerCase();
    const isRemoteBoard = ["remoteok", "remotive", "himalayas", "jobicy", "weworkremotely"].includes(job.source.toLowerCase());
    const isRemote = isRemoteBoard || 
                     title.includes("remote") || 
                     loc.includes("remote") || 
                     loc.includes("telecommute") || 
                     loc.includes("anywhere") || 
                     loc.includes("worldwide") || 
                     loc.includes("world-wide") || 
                     job.remote === true;
    if (!isRemote) {
      return { pass: false, reason: `Remote filter failed (location: ${job.location})` };
    }
  }

  return { pass: true };
}
