import axios from "axios";
import { authService } from "./authService";

// ✅ Backend URL (local + server)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const FALLBACK_BASE_URL = import.meta.env.PROD ? "https://kil2-backend.onrender.com" : "http://127.0.0.1:8000";

// ✅ Standard Key (same everywhere)
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";  // ✅ NEW
const USER_KEY = "user_details";

const api = axios.create({
  baseURL: BASE_URL || FALLBACK_BASE_URL,
  withCredentials: true,  // ✅ NEW: Enable cookies (httpOnly) for Issue #3 Fix
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ NEW: Queue for failed requests during token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  })
  
  isRefreshing = false;
  failedQueue = [];
};

/**
 * ✅ REQUEST INTERCEPTOR
 * Har request ke sath token attach karega
 * localStorage OR sessionStorage dono support
 */
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(ACCESS_TOKEN_KEY) ||
      sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ✅ RESPONSE INTERCEPTOR
 * 401 pe auto-refresh attempt, then retry request
 * Refresh fail pe logout + redirect
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = error.config?.url || "";

    // ✅ SPECIAL CASE: Don't retry logout endpoint
    if (requestUrl.includes("/api/logout")) {
      // Logout always succeeds (even if token is invalid)
      return Promise.resolve({ 
        data: { message: "Logged out successfully" } 
      });
    }

    // ✅ Handle 401 - Token Expired (Issue #1 Fix)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // ✅ NEW: Queue request while refresh in progress
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject});
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ Try to refresh token
        const newToken = await authService.refreshAccessToken();
        
        if (newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return api(originalRequest);  // ✅ Retry original request
        } else {
          throw new Error("Refresh failed");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);

        // ✅ Refresh failed - logout and redirect
        const isLoginRequest =
          requestUrl.includes("/api/token") ||
          requestUrl.includes("/api/auth/google");

        if (!isLoginRequest) {
          console.warn("Session expired. Logging out...");
          authService.clearTokens();

          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }

        return Promise.reject(refreshError);
      }
    }

    // ✅ Handle other 401 errors (e.g., on login endpoint)
    if (error.response?.status === 401) {
      const isLoginRequest =
        requestUrl.includes("/api/token") ||
        requestUrl.includes("/api/auth/google");

      if (!isLoginRequest) {
        console.warn("Unauthorized. Clearing tokens...");
        authService.clearTokens();

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
