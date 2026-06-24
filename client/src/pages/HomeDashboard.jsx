import React, { useState, useEffect } from "react";
import { useAuth } from "../user/userContext";
import { HomeProvider, useHome } from "./home/homeContext";
import Header from "./home/Header";
import FocusColumn from "./home/FocusColumn";
import UpNextColumn from "./home/UpNextColumn";
import ChatInput from "./home/ChatInput";

function DashboardContent() {
  const { user, logout } = useAuth();
  const { isCompleted, toggleComplete, sendChat } = useHome();
  const [promptText, setPromptText] = useState("");
  const [time, setTime] = useState(new Date());

  // Update clock in real-time
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePlannerSubmit = async (e) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    try {
      // Sends message with validation & sanitization (which runs user validation, structures, and HTML escapes)
      await sendChat(promptText);
      setPromptText("");
    } catch (err) {
      console.error(`Failed to send instruction: ${err.message}`);
    }
  };

  // Date and Time formatting helpers
  const dayOfWeek = time.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formattedTime = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc] text-zinc-800 font-sans select-none">
      
      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header - Welcome greeting and clock details */}
        <Header
          user={user}
          dayOfWeek={dayOfWeek}
          formattedDate={formattedDate}
          formattedTime={formattedTime}
        />

        {/* Scrollable Middle Content Container */}
        <main className="flex-1 overflow-y-auto min-h-0 w-full px-6 md:px-10 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-5xl mx-auto items-start">
            
            {/* Column 1: Now Focus */}
            <FocusColumn
              isCompleted={isCompleted}
              toggleComplete={toggleComplete}
            />

            {/* Column 2: Up Next */}
            <UpNextColumn />

          </div>
        </main>

        {/* Sticky Bottom Area - Chat Prompt Box */}
        <ChatInput
          promptText={promptText}
          setPromptText={setPromptText}
          onSubmit={handlePlannerSubmit}
        />

      </div>
    </div>
  );
}

export function HomeDashboard() {
  return (
    <HomeProvider>
      <DashboardContent />
    </HomeProvider>
  );
}

export default HomeDashboard;
