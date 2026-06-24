import React from "react";
import { useNavigate } from "react-router-dom";
import { useHome } from "./homeContext";

export function FocusColumn({ isCompleted, toggleComplete }) {
  const { tasks } = useHome();
  const navigate = useNavigate();

  // The first task is the "Now Focus" task
  const activeTask = tasks && tasks.length > 0 ? tasks[0] : null;

  // If there are no tasks, show a placeholder message
  if (!activeTask) {
    return (
      <section className="lg:col-span-7 flex flex-col text-left">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-zinc-900 m-0">Now Focus</h2>
        </div>
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm flex flex-col justify-center items-center min-h-[300px] text-center">
          <span className="material-symbols-outlined text-4xl text-zinc-300 mb-3 select-none">
            event_busy
          </span>
          <h3 className="text-xl font-extrabold text-zinc-800 m-0">
            No Active Tasks
          </h3>
          <p className="text-zinc-500 text-sm mt-2 max-w-sm leading-relaxed">
            Your schedule is empty for today. Use the planner chat below to schedule your tasks and generate a day plan!
          </p>
        </div>
      </section>
    );
  }

  // Build description depending on task type
  let description = activeTask.sub || "";
  if (activeTask.type === "interview" && activeTask.topics && activeTask.topics.length > 0) {
    description = `Prepare topics: ${activeTask.topics.join(", ")}`;
  } else if (activeTask.type === "jobsearch" && activeTask.criteria) {
    description = `Search and apply using criteria: "${activeTask.criteria}"`;
  } else if (activeTask.type === "reminder" && activeTask.note) {
    description = activeTask.note;
  }

  // Determine if this task type supports LLM Agent chat queries (enabled for all tasks to allow general assistant help)
  const showLlmIcon = true;

  return (
    <section className="lg:col-span-7 flex flex-col text-left">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-zinc-900 m-0">Now Focus</h2>
        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide animate-fade-in">
          High Priority
        </span>
      </div>

      {/* Focus Card Widget */}
      <div className="bg-white border-2 border-[#0252e3] rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[300px] transition-all">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100/50 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-400 font-mono tracking-tight">
                {activeTask.start} - {activeTask.end}
              </span>
              
              {/* Sleek LLM Icon on Top Right */}
              {showLlmIcon && (
                <button
                  onClick={() => navigate(`/task-chat/${activeTask._id}`)}
                  className="w-8 h-8 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm outline-none text-zinc-600 hover:border-[#0252e3] hover:text-[#0252e3]"
                  title="Ask Task Agent"
                >
                  <span className="material-symbols-outlined text-lg leading-none font-semibold">smart_toy</span>
                </button>
              )}
            </div>
          </div>

          <h3 className="text-3xl font-extrabold text-zinc-900 mt-6 leading-tight m-0 tracking-tight">
            {activeTask.label}
          </h3>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed font-medium">
            {description}
          </p>
        </div>

        {/* Action Button Row */}
        <button
          onClick={toggleComplete}
          className={`w-full mt-8 py-3.5 border-none outline-none font-semibold rounded-2xl transition-all cursor-pointer text-sm shadow-sm active:scale-[0.99] text-center ${
            isCompleted
              ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              : "bg-[#0252e3] hover:bg-[#0141b2] text-white"
          }`}
        >
          {isCompleted ? "Completed" : "Mark as Done"}
        </button>
      </div>
    </section>
  );
}

export default FocusColumn;
