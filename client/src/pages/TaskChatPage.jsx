import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../user/userContext";
import { fetchTaskByIdApi, queryTaskAgentApi } from "./home/homeApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 1. Code Block Terminal Container with Copy Capability
function CodeBlockContainer({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-950 rounded-2xl overflow-hidden font-mono text-zinc-300 text-xs shadow-md border border-zinc-900 my-4 w-full">
      {/* Code Header Bar */}
      <div className="bg-zinc-900 px-4 py-2.5 flex items-center justify-between border-b border-zinc-850 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-2">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-[10px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg border-none cursor-pointer outline-none transition-all flex items-center gap-1 font-semibold"
        >
          <span className="material-symbols-outlined text-[12px] leading-none">
            {copied ? "check" : "content_copy"}
          </span>
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {/* Code Content */}
      <pre className="p-4 overflow-x-auto whitespace-pre leading-relaxed text-left text-[#f8f8f2]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// 2. Custom Hybrid Parser: Separates job card listings from general markdown blocks
function parseContentToHybridBlocks(text) {
  if (!text) return [];

  const lines = text.split("\n");
  const blocks = [];
  let currentMarkdownLines = [];
  let currentJobs = [];

  const flushMarkdown = () => {
    if (currentMarkdownLines.length > 0) {
      blocks.push({
        type: "markdown",
        text: currentMarkdownLines.join("\n")
      });
      currentMarkdownLines = [];
    }
  };

  const flushJobs = () => {
    if (currentJobs.length > 0) {
      blocks.push({
        type: "job-grid",
        jobs: [...currentJobs]
      });
      currentJobs = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if it is a job listing item (e.g. starting with "1. ")
    const jobMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (jobMatch) {
      const lineIndex = jobMatch[1];
      const remainder = jobMatch[2];

      // Try split by space-surrounded dashes (standard hyphen, en-dash, em-dash)
      const parts = remainder.split(/\s+[-–—]\s+/);
      let title = "";
      let company = "";
      let location = "";
      let applyUrl = "";
      let source = "";

      if (parts.length >= 2) {
        const nonUrlParts = [];
        for (const part of parts) {
          const trimmedPart = part.trim();
          const urlMatch = trimmedPart.match(/https?:\/\/[^\s)\]]+/);
          if (urlMatch) {
            applyUrl = urlMatch[0];
          } else if (/^source:\s*/i.test(trimmedPart)) {
            source = trimmedPart.replace(/^source:\s*/i, "").trim();
          } else {
            nonUrlParts.push(trimmedPart);
          }
        }

        if (nonUrlParts.length === 1) {
          title = nonUrlParts[0];
        } else if (nonUrlParts.length === 2) {
          title = nonUrlParts[0];
          company = nonUrlParts[1];
        } else if (nonUrlParts.length >= 3) {
          title = nonUrlParts[0];
          company = nonUrlParts[1];
          location = nonUrlParts[2];
        }
      }

      // Fallback to look-ahead if URL is not parsed in split parts
      if (!applyUrl) {
        title = remainder;
        const atIndex = title.toLowerCase().lastIndexOf(" at ");
        const dashIndex = title.lastIndexOf(" - ");
        if (atIndex !== -1) {
          company = title.substring(atIndex + 4).trim();
          title = title.substring(0, atIndex).trim();
        } else if (dashIndex !== -1) {
          company = title.substring(dashIndex + 3).trim();
          title = title.substring(0, dashIndex).trim();
        }

        let lookAheadIndex = i + 1;
        while (lookAheadIndex < lines.length && lookAheadIndex < i + 6) {
          const nextLine = lines[lookAheadIndex].trim();
          if (/^\d+\./.test(nextLine) || nextLine.startsWith("```")) {
            break;
          }

          const lowerNext = nextLine.toLowerCase();
          if (lowerNext.includes("apply url:") || lowerNext.includes("url:") || lowerNext.includes("link:") || nextLine.includes("http")) {
            const urlMatch = nextLine.match(/https?:\/\/[^\s)\]]+/);
            if (urlMatch) applyUrl = urlMatch[0];
          }
          if (lowerNext.includes("location:")) {
            location = nextLine.replace(/.*location:\s*/i, "").trim();
          }
          if (lowerNext.includes("company:")) {
            company = nextLine.replace(/.*company:\s*/i, "").trim();
          }
          if (lowerNext.includes("source:")) {
            source = nextLine.replace(/.*source:\s*/i, "").trim();
          }

          lookAheadIndex++;
        }

        if (applyUrl || location || company) {
          i = lookAheadIndex - 1;
        }
      }

      if (applyUrl || location || company) {
        flushMarkdown();
        currentJobs.push({
          title,
          company,
          location,
          applyUrl,
          source,
          index: lineIndex
        });
        continue;
      }
    }

    // Flush current job grid if we transition back to generic markdown lines
    flushJobs();
    currentMarkdownLines.push(line);
  }

  flushMarkdown();
  flushJobs();

  return blocks;
}

// 5. Render parsed structures as premium React dashboard elements using ReactMarkdown
function renderDynamicContent(text) {
  const blocks = parseContentToHybridBlocks(text);
  
  return blocks.map((block, idx) => {
    if (block.type === "job-grid") {
      return (
        <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full my-3">
          {block.jobs.map((job, jIdx) => (
            <div
              key={jIdx}
              className="bg-[#f8fafc] border border-zinc-205 rounded-2xl p-4 hover:border-blue-500 hover:shadow-md transition-all duration-200 text-left flex flex-col justify-between gap-3 animate-fade-in relative shadow-sm w-full min-h-[140px]"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 select-none shadow-sm">
                  <span className="material-symbols-outlined text-xl">work</span>
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 font-mono">
                      Job #{job.index}
                    </span>
                    {job.source && (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase">
                        {job.source}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-extrabold text-zinc-900 leading-snug tracking-tight truncate m-0" title={job.title}>
                    {job.title}
                  </h4>
                  <p className="text-xs font-semibold text-zinc-500 m-0 truncate" title={job.company}>
                    {job.company || "Unknown Company"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-auto pt-2 flex-wrap">
                {job.location ? (
                  <div className="flex items-center gap-0.5 bg-zinc-100/80 text-zinc-650 px-2 py-0.5 rounded-md text-[10px] font-semibold max-w-[130px] truncate" title={job.location}>
                    <span className="material-symbols-outlined text-[12px] leading-none text-zinc-500 select-none">location_on</span>
                    <span>{job.location}</span>
                  </div>
                ) : (
                  <div></div>
                )}

                {job.applyUrl && (
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#0252e3] hover:bg-[#0141b2] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 no-underline leading-none ml-auto"
                  >
                    <span>Apply Now</span>
                    <span className="material-symbols-outlined text-[12px] leading-none font-bold">arrow_forward</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (block.type === "markdown") {
      return (
        <ReactMarkdown
          key={idx}
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node: _, ...props }) => <h1 className="text-xl font-extrabold text-zinc-955 mt-4 mb-2 tracking-tight" {...props} />,
            h2: ({ node: _, ...props }) => <h2 className="text-lg font-extrabold text-zinc-955 mt-3 mb-2 tracking-tight" {...props} />,
            h3: ({ node: _, ...props }) => <h3 className="text-base font-bold text-zinc-900 mt-2 mb-1" {...props} />,
            h4: ({ node: _, ...props }) => <h4 className="text-sm font-bold text-zinc-800 mt-1.5 mb-1" {...props} />,
            p: ({ node: _, ...props }) => <p className="text-zinc-700 text-xs leading-relaxed my-1.5 font-medium whitespace-pre-wrap" {...props} />,
            ul: ({ node: _, ...props }) => <ul className="list-none pl-1 space-y-1.5 my-2" {...props} />,
            ol: ({ node: _, ...props }) => <ol className="list-decimal pl-5 space-y-1.5 my-2 text-zinc-700 text-xs font-medium" {...props} />,
            li: ({ node: _, ...props }) => (
              <li className="flex items-start gap-2 text-zinc-700 text-xs leading-relaxed font-medium">
                <span className="material-symbols-outlined text-[10px] leading-none text-blue-500 mt-1 select-none font-bold">arrow_right_alt</span>
                <span className="flex-1">{props.children}</span>
              </li>
            ),
            a: ({ node: _, ...props }) => (
              <a
                className="text-[#0252e3] hover:text-[#0141b2] font-semibold underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
            pre: ({ node: _, ...props }) => <>{props.children}</>,
            code: ({ node: _, inline, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              return !inline ? (
                <CodeBlockContainer
                  code={String(children).replace(/\n$/, "")}
                  language={match ? match[1] : "code"}
                />
              ) : (
                <code className="bg-zinc-100 text-zinc-850 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold border border-zinc-200" {...props}>
                  {children}
                </code>
              );
            },
            table: ({ node: _, ...props }) => (
              <div className="overflow-x-auto w-full my-4 border border-zinc-200 rounded-xl shadow-sm bg-white">
                <table className="min-w-full divide-y divide-zinc-200 text-xs text-left" {...props} />
              </div>
            ),
            th: ({ node: _, ...props }) => <th className="px-4 py-3 font-extrabold text-zinc-900 bg-zinc-50 border-b border-zinc-200" {...props} />,
            td: ({ node: _, ...props }) => <td className="px-4 py-3 text-zinc-650 border-b border-zinc-150 font-medium" {...props} />,
            blockquote: ({ node: _, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1.5 my-3 bg-blue-50/20 text-zinc-650 rounded-r-xl italic" {...props} />
          }}
        >
          {block.text}
        </ReactMarkdown>
      );
    }
    
    return null;
  });
}

// Main Component
export function TaskChatPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Task state
  const [task, setTask] = useState(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState("");

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [sendError, setSendError] = useState("");


  // Ref to automatically scroll to bottom of chat
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    async function loadTask() {
      try {
        setTaskLoading(true);
        setTaskError("");
        const res = await fetchTaskByIdApi(taskId);
        if (res.success && res.task) {
          setTask(res.task);
        } else {
          setTaskError("Task not found.");
        }
      } catch (err) {
        setTaskError(err.message || "Failed to load task details.");
      } finally {
        setTaskLoading(false);
      }
    }

    loadTask();

    const savedChat = sessionStorage.getItem(`task_chat_${taskId}`);
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (_) {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [taskId]);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(`task_chat_${taskId}`, JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages, taskId]);

  const handleSend = async (e) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query || loadingResponse) return;

    const userMsg = { sender: "user", text: query, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setLoadingResponse(true);
    setSendError("");

    try {
      const res = await queryTaskAgentApi(taskId, query, updatedMessages);
      
      const agentMsg = {
        sender: "agent",
        text: res.result || "No response received from agent.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setSendError(err.message || "Failed to get response from the search agent.");
      const errorMsg = {
        sender: "system-error",
        text: `Error: ${err.message || "Failed to get response."}`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingResponse(false);
    }
  };

  if (taskLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-zinc-500 font-semibold text-sm">Loading task details...</span>
        </div>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc] px-4">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-red-500 text-5xl mb-4 select-none">warning</span>
          <h3 className="text-xl font-extrabold text-zinc-955 m-0">Failed to Load Task</h3>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">{taskError || "The requested task could not be loaded."}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs cursor-pointer border-none outline-none transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc] text-zinc-800 font-sans select-none">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="flex-shrink-0 px-6 md:px-10 pt-6 pb-4 border-b border-zinc-200/50 bg-white shadow-sm flex items-center justify-between w-full">
          <div className="flex items-center gap-4 text-left">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-full border border-zinc-200/60 hover:bg-zinc-50 text-zinc-650 hover:text-zinc-900 transition-colors bg-white outline-none cursor-pointer flex items-center justify-center shadow-sm"
              title="Back to Dashboard"
            >
              <span className="material-symbols-outlined text-lg leading-none font-bold">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-blue-600 select-none">
                  {task.icon === "briefcase" ? "work" : task.icon === "book" ? "book" : task.icon === "sunrise" ? "light_mode" : "track_changes"}
                </span>
                <h1 className="text-xl font-extrabold text-zinc-955 tracking-tight leading-tight m-0">
                  {task.label}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5 leading-normal">
                {task.sub || "Task Chat session"} • {task.start} - {task.end}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase select-none">
              {task.type}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto min-h-0 w-full px-6 md:px-10 py-6 bg-zinc-50/50">
          <div className="max-w-4xl mx-auto flex flex-col gap-5 h-full">
            
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center opacity-70">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 select-none shadow-sm">
                  <span className="material-symbols-outlined text-2xl">forum</span>
                </div>
                <h4 className="text-base font-extrabold text-zinc-800 m-0">Task Assistant Session</h4>
                <p className="text-zinc-500 text-xs mt-2 max-w-sm leading-relaxed">
                  Ask the assistant anything related to this task. The query assistant will perform job searches or general web lookups context-bound to your task criteria.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5 pb-6">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    } animate-fade-in`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1.5 select-none">
                      {msg.sender === "user" ? (
                        <>
                          <span>You</span>
                        </>
                      ) : msg.sender === "agent" ? (
                        <>
                          <span className="material-symbols-outlined text-xs leading-none text-[#0252e3]">smart_toy</span>
                          <span>Agent</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs leading-none text-red-500">error</span>
                          <span className="text-red-500">System</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm text-left ${
                        msg.sender === "user"
                          ? "bg-[#0252e3] text-white rounded-tr-none font-medium animate-slide-up"
                          : msg.sender === "agent"
                          ? "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none font-medium animate-slide-up"
                          : "bg-red-50 border border-red-100 text-red-700 rounded-tl-none font-semibold"
                      }`}
                    >
                      {msg.sender === "agent" ? (
                        <div className="flex flex-col gap-2.5 w-full">
                          {renderDynamicContent(msg.text)}
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loadingResponse && (
              <div className="flex flex-col items-start animate-pulse">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1.5 select-none">
                  <span className="material-symbols-outlined text-xs leading-none text-[#0252e3]">smart_toy</span>
                  <span>Agent is thinking...</span>
                </div>
                <div className="flex items-center gap-3 bg-white border border-zinc-200/80 rounded-2xl rounded-tl-none p-4 text-xs font-semibold text-zinc-500 max-w-[80%] shadow-sm">
                  <div className="w-4 h-4 border-2 border-[#0252e3] border-t-transparent rounded-full animate-spin"></div>
                  <span>Running job & web search engines...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="flex-shrink-0 px-6 md:px-10 pb-8 pt-2 w-full bg-white border-t border-zinc-200/50">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto w-full">
            
            {sendError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl text-left flex items-center gap-2">
                <span className="material-symbols-outlined text-sm select-none">error</span>
                <span>Error: {sendError}</span>
              </div>
            )}

            <div className="bg-white border border-zinc-250 rounded-2xl p-2 flex items-center shadow-md w-full transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 relative overflow-hidden min-h-[50px]">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  task.type === "jobsearch"
                    ? "Ask to search jobs, internships, check requirements..."
                    : "Ask for interview practice questions, ML definitions..."
                }
                className="flex-1 bg-transparent border-none outline-none text-zinc-800 text-sm px-4 py-2 placeholder-zinc-400"
                disabled={loadingResponse}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loadingResponse}
                className="bg-[#0252e3] hover:bg-[#0141b2] disabled:bg-zinc-100 text-white disabled:text-zinc-400 rounded-xl p-3 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-[0.95] border-none outline-none flex-shrink-0"
              >
                <span className="material-symbols-outlined text-sm font-semibold select-none leading-none">arrow_upward</span>
              </button>
            </div>
          </form>
        </footer>
      </div>
    </div>
  );
}

export default TaskChatPage;
