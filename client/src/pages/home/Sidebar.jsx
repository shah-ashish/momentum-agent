import React from "react";

export function Sidebar({ activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, logout }) {
  const navItems = [
    { name: "Dashboard", icon: "grid_view" },
    { name: "Tasks", icon: "assignment" },
    { name: "Schedule", icon: "calendar_today" },
    { name: "Analytics", icon: "bar_chart" },
  ];

  return (
    <>
      {/* Sidebar Background overlay on Mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-zinc-950/20 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 bottom-0 left-0 w-64 bg-white border-r border-zinc-200/60 flex flex-col justify-between p-6 z-50 transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } h-screen flex-shrink-0`}
      >
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0252e3] flex items-center justify-center text-white shadow-md shadow-blue-500/10 animate-pulse-once">
              <span className="material-symbols-outlined text-2xl font-bold select-none leading-none">bolt</span>
            </div>
            <div className="text-left">
              <h2 className="text-lg font-extrabold text-[#091e42] m-0 leading-none">Momentum</h2>
              <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">Task Planner</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveTab(item.name);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border-none outline-none cursor-pointer ${
                    isActive
                      ? "bg-blue-50/50 text-[#0252e3] font-semibold"
                      : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50"
                  }`}
                >
                  <span className={`material-symbols-outlined text-lg ${isActive ? "text-[#0252e3]" : "text-zinc-400"}`}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#0252e3] rounded-l-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-1.5 border-t border-zinc-100 pt-4 text-left">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 border-none outline-none cursor-pointer">
            <span className="material-symbols-outlined text-lg text-zinc-400">help</span>
            <span>Help</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-650 hover:text-red-700 hover:bg-red-50 border-none outline-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-red-500">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
