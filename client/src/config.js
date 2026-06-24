/**
 * Central API Configuration for Cross-Origin Deployment (e.g. GitHub Pages to Vercel)
 */

// If deployed on Vercel, set VITE_API_BASE_URL inside your GitHub Pages build env to point to your Vercel URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Custom fetch wrapper that automatically prepends the target base URL
 * and configures credentials for cross-origin HttpOnly cookies.
 */
export function customFetch(url, options = {}) {
  const targetUrl = url.startsWith("/") ? `${API_BASE_URL}${url}` : url;

  const mergedOptions = {
    ...options,
    credentials: "include" // REQUIRED to send HttpOnly cookies across different domains
  };

  return fetch(targetUrl, mergedOptions);
}
