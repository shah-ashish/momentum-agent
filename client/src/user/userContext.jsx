import React, { createContext, useContext, useReducer, useEffect } from "react";
import { initialState, authReducer } from "./authReducer";
import { verifySessionApi, loginOrSignupApi, logoutApi } from "./authApi";
import { customFetch } from "../config.js";

// Helper to convert base64 URL VAPID key to Uint8Array required by PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Create Context
const AuthContext = createContext(null);

// Provider Component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verify active session on mount
  useEffect(() => {
    async function verifySession() {
      dispatch({ type: "AUTH_START" });
      try {
        const data = await verifySessionApi();
        if (data.verified) {
          dispatch({ type: "AUTH_SUCCESS", payload: data.user });
        } else {
          dispatch({ type: "AUTH_FAIL", payload: null });
        }
      } catch (err) {
        // If session checking fails, the user is unauthenticated
        dispatch({ type: "AUTH_FAIL", payload: null });
      }
    }
    verifySession();
  }, []);

  // Register background service worker and request Web Push subscription on authentication
  useEffect(() => {
    if (!state.isAuthenticated) return;

    async function registerAndSubscribe() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.log("Push notifications or Service Worker is not supported in this browser.");
        return;
      }

      try {
        // 1. Register background Service Worker
        const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}notification-worker.js`);
        console.log("Service Worker registered successfully.");

        // 2. Request browser notifications permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("Desktop notifications permission denied.");
          return;
        }

        // 3. Fetch VAPID public key from backend
        const keyRes = await customFetch("/service/notifications/vapid-public-key");
        if (!keyRes.ok) throw new Error("Failed to fetch public VAPID key");
        const { publicKey } = await keyRes.json();

        // 4. Retrieve or create a Web Push subscription
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        }

        // 5. Send subscription payload to database
        await customFetch("/service/notifications/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ subscription })
        });
        console.log("Successfully registered Web Push notifications.");
      } catch (err) {
        console.error("Failed to register for Web Push notifications:", err);
      }
    }

    registerAndSubscribe();
  }, [state.isAuthenticated]);

  // Unified login/signup API call
  async function loginOrSignup(email, password, secret, name) {
    dispatch({ type: "AUTH_START" });
    try {
      const data = await loginOrSignupApi(email, password, secret, name);
      dispatch({ type: "AUTH_SUCCESS", payload: data.user });
      return { success: true, message: data.message };
    } catch (err) {
      const errMsg = err.message || "Authentication failed";
      dispatch({ type: "AUTH_FAIL", payload: errMsg });
      return { success: false, error: errMsg };
    }
  }

  // Logout API call
  async function logout() {
    try {
      await logoutApi();
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, loginOrSignup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
