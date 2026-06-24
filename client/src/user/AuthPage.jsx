import React, { useState } from "react";
import { useAuth } from "./userContext";

export function AuthPage() {
  const { loginOrSignup, error: authError } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Sanitize input fields
    const sanitizedEmail = email.trim();
    const sanitizedPassword = password;
    const sanitizedSecret = secret;
    const sanitizedName = isLogin ? "" : name.trim();

    if (!isLogin && !sanitizedName) {
      setError("Please enter your name.");
      return;
    }

    if (!isLogin && sanitizedName.length < 2) {
      setError("Name must be at least 2 characters long.");
      return;
    }

    if (!sanitizedEmail || !sanitizedPassword || !sanitizedSecret) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Validate password length
    if (sanitizedPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Validate master secret length
    if (sanitizedSecret.length < 4) {
      setError("Master Secret must be at least 4 characters long.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await loginOrSignup(sanitizedEmail, sanitizedPassword, sanitizedSecret, sanitizedName);
      if (res.success) {
        setMessage(res.message || "Authentication successful!");
      } else {
        setError(res.error || "Authentication failed.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (loginState) => {
    setIsLogin(loginState);
    setError("");
    setMessage("");
  };

  return (
    <div className="flex-1 flex items-center justify-center py-6 px-4 bg-transparent">
      {/* Form Container - Clean, borderless, shadowless, flat white card */}
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mb-3 select-none">
            <span className="material-symbols-outlined text-2xl">schedule</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 m-0">Scheduler</h2>
          <p className="mt-1 text-xs text-zinc-500 leading-normal">
            {isLogin ? "Sign in to access your dashboard" : "Create a new session to get started"}
          </p>
        </div>

        {/* Tab Toggle Control */}
        <div className="flex bg-zinc-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => handleTabChange(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none border-none outline-none ${isLogin ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => handleTabChange(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none border-none outline-none ${!isLogin ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            Register
          </button>
        </div>

        {/* Status / Error Alerts */}
        {(error || authError) && (
          <div className="mb-4 flex items-start gap-2.5 bg-red-50 text-red-700 p-3 rounded-xl text-xs">
            <span className="material-symbols-outlined text-red-500 text-base select-none">error</span>
            <span className="text-left leading-normal">{error || authError}</span>
          </div>
        )}

        {message && (
          <div className="mb-4 flex items-start gap-2.5 bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs">
            <span className="material-symbols-outlined text-emerald-500 text-base select-none">check_circle</span>
            <span className="text-left leading-normal">{message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Input (Register mode only) */}
          {!isLogin && (
            <div className="space-y-1 text-left animate-fadeIn">
              <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Your Name</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-base select-none font-light">person</span>
                <input
                  type="text"
                  required={!isLogin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-4 py-3 bg-zinc-100 hover:bg-zinc-100/80 rounded-xl text-zinc-900 placeholder-zinc-400 text-xs outline-none transition-all duration-150 border-0 focus:bg-zinc-100/70"
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1 text-left">
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-base select-none font-light">mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 py-3 bg-zinc-100 hover:bg-zinc-100/80 rounded-xl text-zinc-900 placeholder-zinc-400 text-xs outline-none transition-all duration-150 border-0 focus:bg-zinc-100/70"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1 text-left">
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-base select-none font-light">lock</span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-3 bg-zinc-100 hover:bg-zinc-100/80 rounded-xl text-zinc-900 placeholder-zinc-400 text-xs outline-none transition-all duration-150 border-0 focus:bg-zinc-100/70"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer flex items-center select-none"
              >
                <span className="material-symbols-outlined text-base">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Secret Input */}
          <div className="space-y-1 text-left">
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Master Secret</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-base select-none font-light">key</span>
              <input
                type={showSecret ? "text" : "password"}
                required
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Verification key"
                className="w-full pl-9 pr-10 py-3 bg-zinc-100 hover:bg-zinc-100/80 rounded-xl text-zinc-900 placeholder-zinc-400 text-xs outline-none transition-all duration-150 border-0 focus:bg-zinc-100/70"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer flex items-center select-none"
              >
                <span className="material-symbols-outlined text-base">
                  {showSecret ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Helper Note */}
          <div className="text-[10px] text-zinc-455 leading-normal text-center select-none pt-1">
            {isLogin 
              ? "Verifies existing credentials against the database." 
              : "Saves details as your new authentication credentials."}
          </div>

          {/* Submit Button - Flat Solid Blue, borderless, shadowless */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl text-xs cursor-pointer select-none transition-all duration-150 flex items-center justify-center gap-1.5 border-0 shadow-none outline-none"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? "Sign In" : "Register Session"}</span>
                <span className="material-symbols-outlined text-sm select-none">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
export default AuthPage;
