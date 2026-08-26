import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import {
  getUserRole,
  isStaffOrAdmin,
  isSuperAdmin,
  hasAnyRole,
} from "../../config/accessControl";

// ✅ Loading Spinner
const Spinner = () => (
  <div className="flex flex-col justify-center items-center h-screen bg-slate-50 gap-4">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-indigo-600"></div>
    <p className="text-slate-500 font-medium text-sm animate-pulse">
      Verifying Access...
    </p>
  </div>
);

// ✅ Helper: Get stored user safely (local + session)
const getStoredUser = () => {
  const userStr =
    localStorage.getItem("user_details") ||
    sessionStorage.getItem("user_details");

  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (e) {
    console.error("Invalid user_details in storage", e);
    return null;
  }
};

const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = "/access-denied" }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1) Loading state
  if (loading) {
    return <Spinner />;
  }

  // 2) Fallback user from storage (refresh safe)
  const currentUser = user || getStoredUser();

  // 3) Not logged in
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4) Super Admin always allowed
  if (isSuperAdmin(currentUser)) {
    return children;
  }

  // 5) If user is staff/admin or has assigned permissions
  if (isStaffOrAdmin(currentUser)) {
    // If specific allowedRoles are passed, check them or allow if staff
    if (allowedRoles.length > 0) {
      if (hasAnyRole(currentUser, allowedRoles) || isStaffOrAdmin(currentUser)) {
        return children;
      }
    } else {
      return children;
    }
  }

  // ❌ Plain Public user with 0 staff permissions blocked from admin routes
  return <Navigate to={redirectTo} state={{ from: location }} replace />;
};

export default ProtectedRoute;
