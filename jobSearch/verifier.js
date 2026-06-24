/**
 * Verifies a URL is live, returns HTTP status, and fetches page bodyText if available.
 * @param {string} url
 * @returns {Promise<{isActive: boolean, bodyText: string}>}
 */
export async function verifyUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "GET",
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: controller.signal,
      redirect: "follow"
    });

    clearTimeout(timeoutId);
    
    // If it's explicitly 404 or 410, it's definitely dead.
    if (res.status === 404 || res.status === 410) {
      return { isActive: false, bodyText: "" };
    }
    
    let bodyText = "";
    if (res.ok) {
      try {
        bodyText = await res.text();
      } catch {}
    }

    return { isActive: true, bodyText };
  } catch (err) {
    // If it's a network error, DNS resolution issue, timeout, etc., we assume the URL itself is valid
    // and let the user open it in their browser (which has real-user context).
    try {
      new URL(url);
      return { isActive: true, bodyText: "" };
    } catch {
      return { isActive: false, bodyText: "" };
    }
  }
}
