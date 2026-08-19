import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { jwtDecode } from "jwt-decode";
import { authService } from "../api/authService";
import {
  getUserPermissions,
  getUserRole,
  hasAnyRole,
  hasPermission,
  isAdminRole,
} from "../config/accessControl";

// 1. Context Create
export const AuthContext = createContext(null);

// ✅ Standard Keys
const ACCESS_TOKEN_KEY = "access_token";
const USER_KEY = "user_details";

export const AuthProvider = ({ children }) => {
  // --- Global Auth State ---
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Logout Action
   */
  const logout = useCallback(() => {
    try {
      authService.logout();
    } catch (e) {
      console.warn("authService.logout failed:", e);
    }

    setUser(null);
    setRole(null);
    setIsAuth(false);
  }, []);

  /**
   * Login Action (Normal + Google both)
   * Expected authData:
   * {
   *   access_token: "...",
   *   user: {...}
   * }
   */
  const login = useCallback((authDataOrUser, maybeToken) => {
    const normalizedPayload =
      authDataOrUser?.access_token || authDataOrUser?.user
        ? authDataOrUser
        : { access_token: maybeToken, user: authDataOrUser };

    const token = normalizedPayload?.access_token;
    const userData = normalizedPayload?.user || normalizedPayload;

    if (!token || !userData) {
      console.error("Invalid login data received", authDataOrUser, maybeToken);
      return;
    }

    // ✅ Save into correct keys (local + session safe)
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (e) {
      console.warn("Storage save failed:", e);
    }

    // ✅ Update state
    setUser(userData);
    setRole(getUserRole(userData));
    setIsAuth(true);
  }, []);

  /**
   * App Start: Restore Session
   */
  useEffect(() => {
    const initAuth = () => {
      try {
        const token = authService.getToken(); // checks local+session
        const storedUser = authService.getUser(); // checks local+session

        if (token && storedUser) {
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000;

          // Token expired?
          if (decoded?.exp && decoded.exp < currentTime) {
            console.warn("Token expired. Logging out.");
            logout();
          } else {
            setUser(storedUser);
            setRole(getUserRole(storedUser));
            setIsAuth(true);
          }
        }
      } catch (error) {
        console.error("Auth Init Failed:", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [logout]);

  const currentRole = getUserRole(user || { role });
  const currentPermissions = getUserPermissions(user);
  const adminFlag = isAdminRole(currentRole);

  const value = {
    user,
    role: currentRole,
    isAuth,
    loading, // ✅ ProtectedRoute me loading use hoga
    login,
    logout,

    // Helper flags
    isAdmin: adminFlag,
    hasPermission: (permCode) => hasPermission(user || { role: currentRole }, permCode),
    hasRole: (roles = []) => hasAnyRole(user || { role: currentRole }, roles),

    permissions: currentPermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook Export
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthProvider;
