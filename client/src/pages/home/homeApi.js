/**
 * Home module API request helpers.
 */

import { customFetch } from "../../config.js";

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

/**
 * Sends a chat text message to the backend terminal log endpoint.
 */
export async function sendChatMessageApi(message, clientDate, onStatusUpdate) {
  const now = new Date();
  const clientTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const response = await customFetch("/service/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, clientDate, clientTime }),
  });

  if (!response.ok) {
    let errMsg = `Server returned status ${response.status}`;
    try {
      const errorData = await response.json();
      errMsg = errorData.error || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let finished = false;
  let finalResult = null;

  while (!finished) {
    const { value, done } = await reader.read();
    if (done) {
      finished = true;
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    
    // Parse SSE lines
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.trim().startsWith("data: ")) {
        try {
          const payload = JSON.parse(line.trim().substring(6));
          if (payload.type === "status") {
            onStatusUpdate(payload.message);
          } else if (payload.type === "done") {
            finalResult = { success: true, message: payload.message };
          } else if (payload.type === "error") {
            throw new Error(payload.message);
          }
        } catch (err) {
          if (err.message && err.message.startsWith("Access denied") || err.message.startsWith("Only planner-related")) {
            throw err;
          }
          console.error("Failed to parse chunk:", err);
        }
      }
    }
  }

  return finalResult;
}

/**
 * Fetches tasks from the backend by date.
 */
export async function fetchTasksApi(dateString) {
  const url = dateString ? `/service/tasks?date=${dateString}` : "/service/tasks";
  const response = await customFetch(url, {
    method: "GET",
  });
  return handleResponse(response);
}

/**
 * Fetch a single task by its database ID.
 */
export async function fetchTaskByIdApi(taskId) {
  const response = await customFetch(`/service/tasks/${taskId}`, {
    method: "GET",
  });
  return handleResponse(response);
}

/**
 * Request the backend to query the search agent context-bound to a specific task, including history.
 */
export async function queryTaskAgentApi(taskId, query, history = []) {
  const response = await customFetch("/service/agent-query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ taskId, query, history }),
  });
  return handleResponse(response);
}
