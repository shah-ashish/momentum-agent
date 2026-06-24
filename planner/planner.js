import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { askLLM } from "../LLM/LLM.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const systemPrompt = fs.readFileSync(path.join(__dirname, "system_prompt.txt"), "utf-8");

/**
 * Parses raw text input into a structured array of actionable tasks.
 * 
 * @param {string} rawText - Natural language input detailing tasks and times.
 * @returns {Promise<Array<Object>>} Extracted and structured task objects.
 */
export async function parseTasksFromText(rawText) {
  console.log(`\n📅 Starting Task Extraction`);
  console.log(`  Raw Text: "${rawText}"`);

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: rawText }
  ];

  try {
    const response = await askLLM(messages, {
      temperature: 0.1, // highly deterministic output
      max_tokens: 1500
    });

    let content = response.content || "";

    // Strip markdown formatting if the model returned it
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    const tasks = JSON.parse(content);
    console.log(`  ✅ Successfully parsed ${tasks.length} tasks from text`);
    return tasks;
  } catch (error) {
    console.error("  ✖ Failed to parse tasks from text:", error.message);
    return [];
  }
}
