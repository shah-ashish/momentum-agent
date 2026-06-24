import React from "react";

export function Header({ user, dayOfWeek, formattedDate, formattedTime }) {
  return (
    <header className="flex-shrink-0 px-6 md:px-10 pt-8 pb-4 flex items-center justify-between w-full max-w-5xl mx-auto">
      <div className="text-left">
        <h1 className="text-3xl font-extrabold text-[#0252e3] tracking-tight m-0 leading-tight">
          Hey, {user?.name || "Mohan"}
        </h1>
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold mt-1">
          <span className="material-symbols-outlined text-xs select-none leading-none text-zinc-400">calendar_today</span>
          <span>{dayOfWeek} • {formattedDate}, {formattedTime}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
