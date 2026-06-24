import React from "react";
import { useHome } from "./homeContext";

export function ChatInput({ promptText, setPromptText, onSubmit }) {
  const { loading, statusMessage } = useHome();

  return (
    <footer className="flex-shrink-0 px-6 md:px-10 pb-8 pt-2 w-full max-w-5xl mx-auto bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent">
      <form onSubmit={onSubmit} className="w-full">
        <div className="bg-white border border-zinc-200 rounded-2xl p-2.5 flex items-center shadow-lg shadow-zinc-100/50 w-full transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 relative overflow-hidden min-h-[50px]">
          
          {loading ? (
            <div className="flex items-center gap-3 w-full py-2 px-4 bg-blue-50/50 rounded-xl transition-all">
              {/* Spinner */}
              <div className="w-5 h-5 border-2 border-[#0252e3] border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              {/* Pulsing Text */}
              <span className="text-zinc-600 text-sm font-semibold animate-pulse transition-all">
                {statusMessage}
              </span>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Set your Schedule here..."
                className="flex-1 bg-transparent border-none outline-none text-zinc-800 text-sm px-4 py-2 placeholder-zinc-400"
              />
              <button
                type="submit"
                disabled={!promptText.trim()}
                className="bg-[#0252e3] hover:bg-[#0141b2] disabled:bg-zinc-100 text-white disabled:text-zinc-400 rounded-xl p-3 flex items-center justify-center transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.95] border-none outline-none flex-shrink-0"
              >
                <span className="material-symbols-outlined text-sm font-semibold select-none leading-none">arrow_upward</span>
              </button>
            </>
          )}
          
        </div>
      </form>
    </footer>
  );
}

export default ChatInput;
