import { Router } from "express";
import { authenticateToken } from "../user/middleware.js";
import { askLLM } from "../LLM/LLM.js";
import chalk from "chalk";
import { User } from "../user/model.js";
import { Task } from "../task/model.js";
import { getTasksByDate, getTodayTasks } from "../task/service.js";
import { runPlannerAgent } from "../planner/plannerAgent.js";
import { askAgent } from "../LLM/agent.js";

const router = Router();

// Escapes special HTML characters to prevent XSS / terminal injection
function sanitizeMessage(message) {
  if (typeof message !== "string") return "";
  return message
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Validates the text message structure and length
function validateChatMessage(message) {
  if (!message || typeof message !== "string") {
    return { valid: false, error: "Message is required and must be a string." };
  }
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Message cannot be empty." };
  }
  if (trimmed.length > 1000) {
    return { valid: false, error: "Message must be 1000 characters or less." };
  }
  return { valid: true };
}

// Pre-filters prompts to detect cross-user requests or attempts to manage other users
function isCrossUserRequest(message, currentUserEmail) {
  if (typeof message !== "string") return false;
  
  const lower = message.toLowerCase();
  
  // 1. Detect any emails in the message that are different from the logged-in user's email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailsFound = message.match(emailRegex) || [];
  for (const email of emailsFound) {
    if (email.toLowerCase() !== currentUserEmail.toLowerCase()) {
      return true;
    }
  }

  // 2. Reject key terms trying to bypass or query/manage another user's profile
  const dangerousPhrases = [
    "manage other user",
    "manage john",
    "delete john",
    "john's schedule",
    "bob's schedule",
    "alice's schedule",
    "someone else's tasks",
    "other user's tasks",
    "another user's tasks",
    "other person's tasks",
    "show user",
    "tasks for user"
  ];
  
  return dangerousPhrases.some(phrase => lower.includes(phrase));
}

// Classify chat message using LLM with context-awareness of today's schedule
async function classifyMessage(message, todayTasks) {
  const systemPrompt = `You are a query classifier. Your task is to analyze the user's input and determine if it represents a valid planner-related request.

Rules to classify as planner-related (is_planner_related: true):
1. It is a request to schedule a new task, plan, event, reminder, or calendar item (e.g. "schedule gym at 5 PM").
2. It is a request to view today's or a specific date's tasks (e.g. "what's my schedule?").
3. It is a request to cancel, update, delete, complete, or modify one of the user's current tasks for today.

Here are the user's current tasks for today:
${JSON.stringify(todayTasks, null, 2)}

If the user's input refers to canceling, deleting, modifying, or updating a task, but there are no matching tasks in the list above, classify it as NOT planner related (is_planner_related: false).
For any query that is general chat, coding help, job searches on boards, web searches, weather, or unrelated to scheduling/managing tasks, classify it as NOT planner related (is_planner_related: false).

You MUST respond strictly in the following JSON format:
{
  "is_planner_related": true or false,
  "reason": "a brief reason for this decision"
}
Do not wrap your response in markdown code blocks like \`\`\`json.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message }
  ];

  try {
    const response = await askLLM(messages, {
      temperature: 0.0,
      max_tokens: 150
    });

    let content = response.content || "";
    // Strip markdown wrappers if returned
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    const parsed = JSON.parse(content);
    return {
      isPlannerRelated: !!parsed.is_planner_related,
      reason: parsed.reason || ""
    };
  } catch (error) {
    console.error("Failed to classify chat message using LLM:", error.message);

    // Fallback: check if the text contains planning key terms
    const lower = message.toLowerCase();
    const plannerKeywords = [
      "plan", "schedule", "task", "todo", "calendar", "meeting", "reminder", 
      "appointment", "planner", "cancel", "delete", "remove", "change", "clear", "stop"
    ];
    const hasKeyword = plannerKeywords.some(kw => lower.includes(kw));
    return {
      isPlannerRelated: hasKeyword,
      reason: "Fallback keyword match due to LLM error"
    };
  }
}

/**
 * POST /service/chat
 * Secure chat receiver that classifies query intent.
 * Permits planning queries, and runs the personal Planner Agent to manage tasks via tools.
 */
router.post("/chat", authenticateToken, async (req, res) => {
  // Set headers for SSE streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendStatus = (status) => {
    res.write(`data: ${JSON.stringify({ type: "status", message: status })}\n\n`);
  };

  const sendError = (errorMsg) => {
    res.write(`data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`);
    res.end();
  };

  const { message, clientDate, clientTime } = req.body;

  // Validation
  const validation = validateChatMessage(message);
  if (!validation.valid) {
    return sendError(validation.error);
  }

  // Sanitization
  const sanitized = sanitizeMessage(message);

  // Security Filter: Block attempts to manage other users' tasks
  if (isCrossUserRequest(sanitized, req.user.email)) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      chalk.red(`❌ [SECURITY BLOCKED] [${timestamp}] [CHAT SERVICE] Cross-user attempt detected from [${req.user.email}]: `) +
      chalk.yellow(`"${sanitized}"`)
    );
    return sendError("Access denied. You are only authorized to view and manage your own planner schedule.");
  }

  // Validate or fallback clientDate
  let targetDate = clientDate;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!targetDate || !dateRegex.test(targetDate)) {
    targetDate = new Date().toISOString().split("T")[0];
  }

  try {
    sendStatus("Connecting to database...");
    // Retrieve the authenticated user from database
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return sendError("Authenticated user not found in database.");
    }

    sendStatus("Analyzing schedule context...");
    // Pre-load tasks for the client's local date for context-aware classification
    const todayTasks = await getTasksByDate(user._id, targetDate);

    sendStatus("Verifying planner intent...");
    // Intent classification with schedule context
    const classification = await classifyMessage(sanitized, todayTasks);
    const timestamp = new Date().toLocaleTimeString();

    if (!classification.isPlannerRelated) {
      // Rejection log to terminal in red
      console.log(
        chalk.red(`❌ [REJECTED] [${timestamp}] [CHAT SERVICE] Non-planning intent from [${req.user.email}]: `) +
        chalk.yellow(`"${sanitized}"`) +
        chalk.gray(` (Reason: ${classification.reason})`)
      );

      return sendError("Only planner-related queries (scheduling new tasks, or viewing/modifying existing ones) are accepted.");
    }

    // Success log to terminal in green
    console.log(
      chalk.green(`✅ [SUCCESS] [${timestamp}] [CHAT SERVICE] Planner intent verified from [${req.user.email}]: `) +
      chalk.cyan(`"${sanitized}"`)
    );

    sendStatus("Planner Agent is thinking...");
    // Call the Tool-Calling Planner Agent, passing the target date context, client time, and progress callback
    const agentResponse = await runPlannerAgent(sanitized, user, targetDate, clientTime, (status) => {
      sendStatus(status);
    });

    res.write(`data: ${JSON.stringify({ type: "done", message: agentResponse })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Failed to run planner agent:", error);
    sendError("Failed to process planning request.");
  }
});

/**
 * GET /service/tasks
 * Secure route to retrieve tasks for the authenticated user by date (defaults to today).
 */
router.get("/tasks", authenticateToken, async (req, res) => {
  try {
    // Retrieve the authenticated user from database
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const dateQuery = req.query.date; // optional date parameter: YYYY-MM-DD
    let tasks;

    if (dateQuery) {
      // Validate date parameter format YYYY-MM-DD (e.g. 2026-06-24)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateQuery)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }
      
      // Strict regex matching makes dateQuery safe from injection and does not require further sanitization
      tasks = await getTasksByDate(user._id, dateQuery);
    } else {
      tasks = await getTodayTasks(user._id);
    }

    return res.status(200).json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error("Failed to retrieve tasks:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /service/tasks/:taskId
 * Retrieve a specific task by ID for the authenticated user.
 */
router.get("/tasks/:taskId", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const task = await Task.findOne({ _id: req.params.taskId, userId: user._id });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.status(200).json({ success: true, task });
  } catch (error) {
    console.error("Failed to retrieve task:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /service/agent-query
 * Execute the Job/Web search agent context-bound to a specific task using a custom user query and chat history.
 */
router.post("/agent-query", authenticateToken, async (req, res) => {
  const { taskId, query, history } = req.body;
  
  if (!taskId) {
    return res.status(400).json({ error: "taskId is required" });
  }
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required and must not be empty" });
  }

  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Retrieve task from database
    const task = await Task.findOne({ _id: taskId, userId: user._id });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Format conversation history
    let historyContext = "";
    if (Array.isArray(history) && history.length > 0) {
      historyContext = "\nHere is the ongoing chat history for this task session:\n" +
        history.map(msg => `${msg.sender === "user" ? "User" : "Agent"}: ${msg.text}`).join("\n") + "\n";
    }

    // Construct a contextual agent prompt combining task parameters, chat history, and the custom query
    const taskContext = `You are helping the user with their active task: "${task.label}".
Task Subtitle: "${task.sub}"
Task Type: "${task.type}"
${task.type === "interview" && task.topics ? `Topics: ${task.topics.join(", ")}` : ""}
${task.type === "jobsearch" && task.criteria ? `Criteria: ${task.criteria}` : ""}
${task.note ? `Note: ${task.note}` : ""}
${historyContext}
The user has a specific request related to this task: "${query.trim()}"

STRICT COMPLIANCE RULE:
You must ONLY answer this request if it is directly related to the active task details described above. If the request is unrelated to the task (for example, asking to find jobs when the active task is studying/prepping, or asking to practice interview questions when the task is job search), you MUST NOT execute any search tools. Instead, return a message politely refusing to answer, stating that queries must be related to the active task, and remind the user of the task's context.`;

    console.log(`🤖 [SERVICE AGENT-QUERY] Launching Search Agent for task: "${task.label}"`);
    console.log(`   User Query: "${query.trim()}"`);

    // Call LLM search agent
    const resultText = await askAgent(taskContext);

    return res.status(200).json({
      success: true,
      result: resultText
    });
  } catch (error) {
    console.error("Failed to run task agent query:", error);
    return res.status(500).json({ error: "Failed to generate task insights using search agent." });
  }
});

export default router;
