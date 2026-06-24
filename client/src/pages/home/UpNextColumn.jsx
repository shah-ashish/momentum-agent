import React from "react";
import { useHome } from "./homeContext";

export function UpNextColumn() {
  const { tasks } = useHome();

  // If there are no tasks, or only 1 task (which is currently active in Focus), show a placeholder message
  if (!tasks || tasks.length <= 1) {
    return (
      <section className="lg:col-span-5 flex flex-col text-left">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-zinc-900 m-0">Up Next</h2>
        </div>
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col justify-center items-center min-h-[300px] text-center">
          <span className="material-symbols-outlined text-4xl text-zinc-300 mb-3 select-none">
            done_all
          </span>
          <h4 className="font-extrabold text-zinc-800 m-0">All Caught Up!</h4>
          <p className="text-zinc-500 text-xs mt-2 max-w-[200px] leading-relaxed">
            No upcoming tasks scheduled for today.
          </p>
        </div>
      </section>
    );
  }

  // The rest of the tasks are "Up Next"
  const upcomingTasks = tasks.slice(1);

  const getMaterialIconName = (icon) => {
    switch (icon) {
      case "briefcase": return "work";
      case "book": return "menu_book";
      case "sunrise": return "sunny";
      case "target": return "ads_click";
      default: return "task";
    }
  };

  return (
    <section className="lg:col-span-5 flex flex-col text-left">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-zinc-900 m-0">Up Next</h2>
        <span className="text-xs font-semibold text-zinc-400 font-mono">
          {upcomingTasks.length} {upcomingTasks.length === 1 ? "task" : "tasks"} remaining
        </span>
      </div>

      {/* Up Next List */}
      <div className="space-y-4">
        {upcomingTasks.map((task) => (
          <div
            key={task._id || task.taskId}
            className="bg-white border border-zinc-200/60 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-zinc-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-500 border border-zinc-150/60 group-hover:bg-zinc-100 transition-colors">
                <span className="material-symbols-outlined text-xl leading-none">
                  {getMaterialIconName(task.icon)}
                </span>
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-zinc-800 m-0 leading-tight">
                  {task.label}
                </h4>
                <span className="text-xs font-bold text-zinc-400 font-mono mt-1 block">
                  {task.start} - {task.end}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-zinc-400 select-none leading-none group-hover:translate-x-0.5 transition-transform">
              chevron_right
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default UpNextColumn;
