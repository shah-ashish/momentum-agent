import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { askLLM } from "../LLM/LLM.js";
import {
  createTasks,
  getTasksByDate,
  getTodayTasks,
  updateTask,
  deleteTask
} from "../task/service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const systemPrompt = fs.readFileSync(path.join(__dirname, "agent_system_prompt.txt"), "utf-8");

/**
 * Personal Planner agent orchestrator.
 * Handles database operations for tasks using tool calling, enforcing security.
 * 
 * @param {string} prompt - User request query.
 * @param {Object} user - The authenticated user object (from request middleware).
 * @returns {Promise<string>} The agent's final text response.
 */
export async function runPlannerAgent(prompt, user, clientDate, clientTime, onStatus = () => {}) {
  if (!user || !user._id) {
    throw new Error("Unauthorized: Invalid user context.");
  }

  const currentDateStr = clientDate || new Date().toISOString().split("T")[0];
  const currentTimeStr = clientTime || new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  
  // Pre-load tasks for the correct timezone-adjusted date string
  let todayTasks = [];
  try {
    todayTasks = await getTasksByDate(user._id, currentDateStr);
  } catch (err) {
    console.error(`Failed to pre-load tasks for date ${currentDateStr} in agent context:`, err);
  }
  
  const messages = [
    { 
      role: "system", 
      content: `${systemPrompt}
\nNote: Current system date is "${currentDateStr}". Current system time is "${currentTimeStr}".
\nHere are the user's current tasks for today (${currentDateStr}):
${JSON.stringify(todayTasks, null, 2)}` 
    },
    { role: "user", content: prompt }
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "get_tasks_by_date",
        description: "Retrieve all tasks scheduled for a specific date (YYYY-MM-DD format). Defaults to today if date is not specified.",
        parameters: {
          type: "object",
          properties: {
            dateString: {
              type: "string",
              description: "The date to retrieve tasks for in YYYY-MM-DD format."
            }
          },
          required: ["dateString"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_tasks",
        description: "Add one or more tasks to the schedule. Generates list of tasks and maps them to a target date.",
        parameters: {
          type: "object",
          properties: {
            tasksArray: {
              type: "array",
              description: "Array of task objects to save.",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Short unique kebab-case identifier (e.g. 'morning-gym')." },
                  type: { type: "string", enum: ["interview", "jobsearch", "reminder"] },
                  icon: { type: "string", enum: ["book", "briefcase", "sunrise", "target"] },
                  label: { type: "string", description: "Short title (max 4 words)." },
                  sub: { type: "string", description: "Short subtitle/context (max 6 words)." },
                  start: { type: "string", description: "Start time in HH:MM format." },
                  end: { type: "string", description: "End time in HH:MM format." },
                  topics: { type: "array", items: { type: "string" }, description: "Topics to prepare (only for type='interview')." },
                  criteria: { type: "string", description: "Job search parameters (only for type='jobsearch')." },
                  note: { type: "string", description: "Actionable details note (only for type='reminder')." }
                },
                required: ["id", "type", "icon", "label", "sub", "start", "end"]
              }
            },
            dateString: {
              type: "string",
              description: "The date string to schedule the tasks for in YYYY-MM-DD format."
            }
          },
          required: ["tasksArray", "dateString"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_task_details",
        description: "Update task fields (e.g., mark it completed, modify label, start/end times).",
        parameters: {
          type: "object",
          properties: {
            mongoId: {
              type: "string",
              description: "The MongoDB document '_id' of the task."
            },
            updateData: {
              type: "object",
              description: "Object containing fields to update.",
              properties: {
                completed: { type: "boolean" },
                label: { type: "string" },
                sub: { type: "string" },
                start: { type: "string" },
                end: { type: "string" },
                topics: { type: "array", items: { type: "string" } },
                criteria: { type: "string" },
                note: { type: "string" }
              }
            }
          },
          required: ["mongoId", "updateData"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "delete_task_by_id",
        description: "Delete an existing task from the user's schedule by its MongoDB document ID.",
        parameters: {
          type: "object",
          properties: {
            mongoId: {
              type: "string",
              description: "The MongoDB document '_id' of the task to delete."
            }
          },
          required: ["mongoId"]
        }
      }
    }
  ];

  let iterations = 0;
  const maxIterations = 5;

  try {
    while (true) {
      const activeTools = (iterations >= maxIterations) ? undefined : tools;

      const response = await askLLM(messages, {
        temperature: 0.1,
        tools: activeTools
      });

      messages.push(response);

      if (response.tool_calls && response.tool_calls.length > 0) {
        if (iterations < maxIterations) {
          iterations++;

          for (const toolCall of response.tool_calls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            console.log(`  🛠 [PLANNER AGENT] Tool Execution: ${toolName} requested`);

            try {
              let result;
              if (toolName === "get_tasks_by_date") {
                onStatus("Retrieving calendar tasks...");
                console.log(`    -> Fetching tasks for date: ${args.dateString}`);
                result = await getTasksByDate(user._id, args.dateString);
              } else if (toolName === "create_tasks") {
                onStatus("Adding new tasks to database...");
                console.log(`    -> Creating ${args.tasksArray.length} tasks for date: ${args.dateString}`);
                result = await createTasks(user._id, args.tasksArray, args.dateString);
              } else if (toolName === "update_task_details") {
                onStatus("Updating task details in database...");
                console.log(`    -> Updating task ID: ${args.mongoId}`);
                result = await updateTask(user._id, args.mongoId, args.updateData);
              } else if (toolName === "delete_task_by_id") {
                onStatus("Deleting task from schedule...");
                console.log(`    -> Deleting task ID: ${args.mongoId}`);
                result = await deleteTask(user._id, args.mongoId);
              } else {
                throw new Error(`Unknown tool: ${toolName}`);
              }

              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify({ success: true, data: result })
              });
            } catch (toolErr) {
              console.error(`  ✖ Tool execution failed for ${toolName}:`, toolErr.message);
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: toolName,
                content: JSON.stringify({ success: false, error: toolErr.message })
              });
            }
          }
          continue;
        } else {
          messages.push({
            role: "user",
            content: "You have reached the maximum tool limit. Please wrap up and give the final message response now without any tools."
          });
          iterations = maxIterations + 1;
          continue;
        }
      }

      console.log(`  ✔ [PLANNER AGENT] Completed agent flow`);
      return response.content || "";
    }
  } catch (error) {
    console.error("  ✖ Error in Planner Agent orchestrator:", error);
    throw error;
  }
}
