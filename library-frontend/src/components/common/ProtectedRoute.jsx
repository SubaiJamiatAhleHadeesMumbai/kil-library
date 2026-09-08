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

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireStaff = false,
  redirectTo = "/access-denied",
}) => {
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

  // 4) If no specific roles and not requiring staff, any logged-in user is allowed (e.g. /profile)
  if (!requireStaff && allowedRoles.length === 0) {
    return children;
  }

  // 5) Super Admin always allowed
  if (isSuperAdmin(currentUser)) {
    return children;
  }

  // 6) Hard Gate: If route requires staff/admin, non-staff/public users are strictly rejected
  if (requireStaff && !isStaffOrAdmin(currentUser)) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 7) Check specific allowed roles
  if (allowedRoles.length > 0) {
    if (hasAnyRole(currentUser, allowedRoles)) {
      return children;
    }
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
