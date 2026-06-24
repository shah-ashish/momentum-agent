import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from "react";
import { useAuth } from "../../user/userContext";
import { sendChatMessageApi, fetchTasksApi } from "./homeApi";
import { homeReducer, initialState } from "./homeReducer";
import { scheduleMobileNotifications } from "../../utils/mobileNotifications.js";

const HomeContext = createContext();

export function HomeProvider({ children }) {
  const [state, dispatch] = useReducer(homeReducer, initialState);
  const { user } = useAuth();

  const getLocalYYYYMMDD = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchTasks = useCallback(async (dateString) => {
    if (!user || !user.email) return;
    dispatch({ type: "FETCH_TASKS_START" });
    try {
      const targetDate = dateString || getLocalYYYYMMDD();
      const response = await fetchTasksApi(targetDate);
      dispatch({ type: "FETCH_TASKS_SUCCESS", payload: response.tasks || [] });
      scheduleMobileNotifications(response.tasks || []);
    } catch (err) {
      dispatch({ type: "FETCH_TASKS_FAILURE", payload: err.message });
    }
  }, [user]);

  useEffect(() => {
    if (user && user.email) {
      fetchTasks(getLocalYYYYMMDD());
    }
  }, [user, fetchTasks]);

  const toggleComplete = () => {
    dispatch({ type: "TOGGLE_COMPLETE" });
  };

  const sendChat = async (text) => {
    // 1. Validate User on client-side before sending API request
    if (!user || !user.email) {
      throw new Error("Unauthorized: You must be logged in to send chat messages.");
    }

    // 2. Validate Message Structure
    if (!text || typeof text !== "string") {
      throw new Error("Message is required and must be a string.");
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new Error("Message cannot be empty.");
    }
    if (trimmed.length > 1000) {
      throw new Error("Message must be 1000 characters or less.");
    }

    // 3. Sanitize input to escape HTML characters
    const sanitizeHtml = (str) => {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
    };
    const sanitized = sanitizeHtml(trimmed);

    dispatch({ type: "SEND_CHAT_START" });
    try {
      const localDate = getLocalYYYYMMDD();
      const onStatus = (msg) => {
        dispatch({ type: "SET_STATUS_MESSAGE", payload: msg });
      };
      const response = await sendChatMessageApi(sanitized, localDate, onStatus);
      dispatch({
        type: "SEND_CHAT_SUCCESS",
        payload: { text: sanitized, timestamp: new Date() },
      });
      await fetchTasks(localDate);
      return response;
    } catch (err) {
      dispatch({ type: "SEND_CHAT_FAILURE", payload: err.message });
      throw err;
    }
  };

  // Keep track of current time locally to dynamically filter expired tasks in real-time
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 10000); // Trigger re-filter evaluation every 10 seconds
    return () => clearInterval(timer);
  }, []);

  const currentDate = getLocalYYYYMMDD();
  const currentTime = `${String(nowTime.getHours()).padStart(2, "0")}:${String(nowTime.getMinutes()).padStart(2, "0")}`;

  // Dynamically filter out tasks whose scheduled time period has already ended
  const activeTasks = (state.tasks || []).filter(task => {
    if (task.date < currentDate) return false;
    if (task.date === currentDate && task.end < currentTime) return false;
    return true;
  });

  return (
    <HomeContext.Provider
      value={{
        ...state,
        tasks: activeTasks, // Overrides raw tasks list with dynamic, time-filtered list
        toggleComplete,
        sendChat,
        fetchTasks,
      }}
    >
      {children}
    </HomeContext.Provider>
  );
}

export function useHome() {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error("useHome must be used within a HomeProvider");
  }
  return context;
}

export default HomeContext;
