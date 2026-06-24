import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./user/userContext";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import AuthPage from "./user/AuthPage";
import HomeDashboard from "./pages/HomeDashboard";
import TaskChatPage from "./pages/TaskChatPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Protected Dashboard Route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomeDashboard />
            </ProtectedRoute>
          }
        />

        {/* Task-Specific Chat Page */}
        <Route
          path="/task-chat/:taskId"
          element={
            <ProtectedRoute>
              <TaskChatPage />
            </ProtectedRoute>
          }
        />

        {/* Public Login/Signup Route */}
        <Route
          path="/login-signup"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />

        {/* Fallback Route: redirects any unknown route to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
