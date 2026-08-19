import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthProvider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
const googleAuthEnabled = Boolean(GOOGLE_CLIENT_ID);

// ✅ SUPPRESS DEVELOPMENT-ONLY WARNINGS
if (import.meta.env.MODE === "development") {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  // Suppress React Router future flag warnings
  console.warn = (...args) => {
    if (
      args[0]?.includes?.(
        "React Router will begin wrapping state updates in `React.startTransition`"
      ) ||
      args[0]?.includes?.("Relative route resolution within Splat routes")
    ) {
      return; // Silently ignore these warnings
    }
    originalWarn(...args);
  };
  
  // Optional: Suppress other noise
  console.error = (...args) => {
    if (args[0]?.includes?.("React Router")) {
      return; // Silently ignore React Router errors in dev
    }
    originalError(...args);
  };
}

const clearStaleRuntime = async () => {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn("Service worker cleanup failed:", error);
    }
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  } catch (error) {
    console.warn("Cache cleanup failed:", error);
  }
};

clearStaleRuntime().finally(() => {
  const app = (
    <React.StrictMode>
      {/* ✅ ADDED: React Router v7 Future Flags for smooth transition */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );

  ReactDOM.createRoot(document.getElementById("root")).render(
    googleAuthEnabled ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{app}</GoogleOAuthProvider> : app
  );
});
