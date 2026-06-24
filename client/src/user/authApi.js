/**
 * API functions for User Authentication endpoints with robust response handling.
 */

import { customFetch } from "../config.js";

async function handleResponse(response) {
  if (!response.ok) {
    let errMsg = `Server returned status ${response.status}`;
    try {
      const errorData = await response.json();
      errMsg = errorData.error || errMsg;
    } catch (_) {
      try {
        const text = await response.text();
        if (text) {
          errMsg = text.length > 100 ? `${text.substring(0, 100)}...` : text;
        }
      } catch (__) {}
    }
    throw new Error(errMsg);
  }

  try {
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error("Invalid server response format");
  }
}

export async function verifySessionApi() {
  const response = await customFetch("/user/verify");
  return handleResponse(response);
}

export async function loginOrSignupApi(email, password, secret, name) {
  const response = await customFetch("/user/login-signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, secret, name }),
  });
  return handleResponse(response);
}

export async function logoutApi() {
  const response = await customFetch("/user/logout", { method: "POST" });
  return handleResponse(response);
}
