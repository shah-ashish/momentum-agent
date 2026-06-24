import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { askLLM } from "./LLM.js";
import { searchJobs } from "../jobSearch/jobSearch.js";
import { webSearch } from "../webSearch/webSearch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const systemPrompt = fs.readFileSync(path.join(__dirname, "system_prompt.txt"), "utf-8");

/**
 * Job and Web search agent orchestrator. Manages message history, tool execution,
 * and calls the core LLM client to resolve queries.
 * 
 * @param {string} prompt - User query
 * @param {Object} [options] - API/Model configuration options
 * @returns {Promise<string>} The agent's final text response
 */
export async function askAgent(prompt, options = {}) {
  const messages = [
    {
      role: "system",
      content: systemPrompt
    },
    { role: "user", content: prompt }
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "search_jobs",
        description: "Search for job listings across multiple real job boards. Returns verified, real job postings with working apply URLs. Use this when the user is looking for jobs, internships, or career opportunities.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The job search query in natural language (e.g. 'React developer internship remote no experience')"
            },
            max_results: {
              type: "integer",
              description: "Number of job results to return (default 5, max 10)"
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for general information, documentation, news, facts, or technical guides using DuckDuckGo. Use this for general queries.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The web search query (e.g. 'nodejs fetch API documentation')"
            },
            max_results: {
              type: "integer",
              description: "Number of search results to return (default 5)"
            }
          },
          required: ["query"]
        }
      }
    }
  ];

  let iterations = 0;
  const maxIterations = 5;

  try {
    while (true) {
      const activeTools = (iterations >= maxIterations) ? undefined : tools;

      const message = await askLLM(messages, {
        ...options,
        tools: activeTools
      });

      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        if (iterations < maxIterations) {
          iterations++;
          
          const toolResults = await Promise.all(
            message.tool_calls.map(async (toolCall) => {
              if (toolCall.function.name === "search_jobs") {
                const args = JSON.parse(toolCall.function.arguments);
                const requestedResults = args.max_results || 5;
                console.log(`  💼 Searching jobs for: "${args.query}" (max: ${requestedResults})`);
                
                try {
                  const jobs = await searchJobs(args.query, requestedResults);
                  return {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: "search_jobs",
                    content: JSON.stringify(jobs)
                  };
                } catch (jobErr) {
                  console.error("  ✖ Job search failed:", jobErr);
                  return {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: "search_jobs",
                    content: JSON.stringify({ error: jobErr.message })
                  };
                }
              } else if (toolCall.function.name === "web_search") {
                const args = JSON.parse(toolCall.function.arguments);
                const requestedResults = args.max_results || 5;
                console.log(`  🔍 Web searching for: "${args.query}" (max: ${requestedResults})`);
                
                try {
                  const searchResults = await webSearch(args.query, requestedResults);
                  return {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: "web_search",
                    content: JSON.stringify(searchResults)
                  };
                } catch (searchErr) {
                  console.error("  ✖ Web search failed:", searchErr);
                  return {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: "web_search",
                    content: JSON.stringify({ error: searchErr.message })
                  };
                }
              }
              return null;
            })
          );

          for (const res of toolResults) {
            if (res) {
              messages.push(res);
            }
          }
          continue;
        } else if (iterations === maxIterations) {
          console.log("  ⚠️ Safeguard: Model requested tools at limit. Forcing final answer.");
          messages.push({
            role: "user",
            content: "You have reached the maximum tool limit. Please provide the final response now using only the information already gathered above. Do not call any tools."
          });
          iterations = maxIterations + 1;
          continue;
        }
      }

      console.log(`  ✔ [LLM] ${message.content?.length || 0} chars received`);
      return message.content || "";
    }
  } catch (error) {
    console.error("  ✖ Error in agent orchestrator:", error);
    throw error;
  }
}
