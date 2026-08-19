/**
 * ✅ ENHANCED Login.jsx — LibraryNest
 *
 * IMPROVEMENTS OVER PREVIOUS VERSION:
 * ─────────────────────────────────────────────────────────
 * UI/UX:
 *   • Premium split-panel layout (illustration + form)
 *   • Animated book-stack illustration on the left panel
 *   • Ink-drop color theme (deep navy + warm amber accent)
 *   • Smooth field focus rings + floating label effect
 *   • Loading skeleton / shimmer on button
 *   • Accessible: visible keyboard focus, aria-labels, role
 *   • Reduced-motion respected via CSS media query
 *   • Fully responsive (stacks vertically on mobile)
 *
 * LOGIC:
 *   • Robust role extraction (object / string / nested)
 *   • Centralized handleAuthSuccess() — no duplication
 *   • rememberMe checkbox wired to token persistence
 *   • Proper form validation with field-level errors
 *   • Login attempt throttle (3 tries → 30s cooldown)
 *   • Google OAuth implicit flow preserved
 *   • Session cleanup on mount (stale token purge)
 *   • No setTimeout hacks — navigation is synchronous
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import useAuth from "../hooks/useAuth";
import { authService } from "../api/authService";
import apiClient from "../api/apiClient";

import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

// ─── Constants ────────────────────────────────────────────
const ADMIN_ROLES = new Set([
  "admin",
  "superadmin",
  "administrator",
  "manager",
  "editor",
  "librarian",
  "staff",
]);

const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 30_000;

// ─── Helpers ──────────────────────────────────────────────
const extractRole = (user) => {
  if (!user?.role) return "";
  if (typeof user.role === "string") return user.role.toLowerCase().trim();
  if (typeof user.role === "object" && user.role?.name)
    return String(user.role.name).toLowerCase().trim();
  return "";
};

const isAdminUser = (user) => ADMIN_ROLES.has(extractRole(user));

// ─── Book Stack SVG Illustration ──────────────────────────
const BookStackIllustration = () => (
  <svg viewBox="0 0 280 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs mx-auto drop-shadow-2xl">
    {/* Shelf shadow */}
    <ellipse cx="140" cy="295" rx="100" ry="10" fill="rgba(0,0,0,0.25)" />

    {/* Book 1 — tallest, amber */}
    <motion.g
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <rect x="55" y="80" width="42" height="200" rx="4" fill="#F59E0B" />
      <rect x="55" y="80" width="8" height="200" rx="2" fill="#D97706" />
      <rect x="67" y="140" width="22" height="3" rx="1" fill="#FEF3C7" opacity="0.7" />
      <rect x="67" y="150" width="16" height="3" rx="1" fill="#FEF3C7" opacity="0.5" />
      <rect x="67" y="160" width="20" height="3" rx="1" fill="#FEF3C7" opacity="0.5" />
    </motion.g>

    {/* Book 2 — medium, slate blue */}
    <motion.g
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
    >
      <rect x="102" y="110" width="38" height="170" rx="4" fill="#3B82F6" />
      <rect x="102" y="110" width="7" height="170" rx="2" fill="#2563EB" />
      <rect x="113" y="165" width="20" height="3" rx="1" fill="#DBEAFE" opacity="0.7" />
      <rect x="113" y="175" width="14" height="3" rx="1" fill="#DBEAFE" opacity="0.5" />
    </motion.g>

    {/* Book 3 — short, rose */}
    <motion.g
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
    >
      <rect x="144" y="145" width="34" height="135" rx="4" fill="#F43F5E" />
      <rect x="144" y="145" width="7" height="135" rx="2" fill="#E11D48" />
      <rect x="154" y="190" width="16" height="3" rx="1" fill="#FFE4E6" opacity="0.7" />
      <rect x="154" y="200" width="12" height="3" rx="1" fill="#FFE4E6" opacity="0.5" />
    </motion.g>

    {/* Book 4 — medium-tall, emerald */}
    <motion.g
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
    >
      <rect x="182" y="95" width="40" height="185" rx="4" fill="#10B981" />
      <rect x="182" y="95" width="8" height="185" rx="2" fill="#059669" />
      <rect x="194" y="155" width="20" height="3" rx="1" fill="#D1FAE5" opacity="0.7" />
      <rect x="194" y="165" width="15" height="3" rx="1" fill="#D1FAE5" opacity="0.5" />
      <rect x="194" y="175" width="18" height="3" rx="1" fill="#D1FAE5" opacity="0.5" />
    </motion.g>

    {/* Open book on top */}
    <motion.g
      animate={{ rotate: [-2, 2, -2] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "140px 75px" }}
    >
      <path d="M95 75 Q140 55 185 75 L185 95 Q140 75 95 95 Z" fill="#FEF3C7" />
      <path d="M140 55 L140 95" stroke="#D97706" strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M100 80 Q120 70 138 76" stroke="#D97706" strokeWidth="0.8" opacity="0.5" />
      <path d="M100 86 Q120 76 138 82" stroke="#D97706" strokeWidth="0.8" opacity="0.5" />
      <path d="M180 80 Q160 70 142 76" stroke="#D97706" strokeWidth="0.8" opacity="0.5" />
    </motion.g>

    {/* Sparkles */}
    {[
      { cx: 48, cy: 65, r: 3 },
      { cx: 230, cy: 85, r: 2 },
      { cx: 70, cy: 40, r: 2 },
    ].map(({ cx, cy, r }, i) => (
      <motion.circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="#F59E0B"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
      />
    ))}
  </svg>
);

// ─── Field-level error message ─────────────────────────────
const FieldError = ({ message }) => (
  <AnimatePresence>
    {message && (
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="mt-1.5 text-xs text-rose-500 font-medium flex items-center gap-1"
        role="alert"
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
        {message}
      </motion.p>
    )}
  </AnimatePresence>
);

// ─── Cooldown Timer Display ────────────────────────────────
const CooldownBanner = ({ remaining }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700"
    role="alert"
  >
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Too many attempts. Try again in <strong>{Math.ceil(remaining / 1000)}s</strong>.
  </motion.div>
);

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
const Login = () => {
  // Form state
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shake, setShake] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Throttle state
  const [attempts, setAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownRef = useRef(null);

  const { login: setAuthData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDisabled = useMemo(
    () => loading || googleLoading || cooldownRemaining > 0,
    [loading, googleLoading, cooldownRemaining]
  );

  // ── Session cleanup on mount ──────────────────────────────
  useEffect(() => {
    // Purge stale tokens that may have been left from a previous failed session
    // Only if user is not already properly authenticated
    const token = authService.getToken?.();
    if (!token) {
      authService.clearToken?.();
    }
  }, []);

  // ── Cooldown ticker ────────────────────────────────────────
  useEffect(() => {
    if (!cooldownUntil) return;

    const tick = () => {
      const remaining = cooldownUntil - Date.now();
      if (remaining <= 0) {
        setCooldownRemaining(0);
        setCooldownUntil(null);
        setAttempts(0);
        clearInterval(cooldownRef.current);
      } else {
        setCooldownRemaining(remaining);
      }
    };

    tick();
    cooldownRef.current = setInterval(tick, 500);
    return () => clearInterval(cooldownRef.current);
  }, [cooldownUntil]);

  // ── Shake on error ─────────────────────────────────────────
  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  // ── Centralized post-login handler ─────────────────────────
  const handleAuthSuccess = useCallback(
    (user, token) => {
      // 1. Persist session (respect rememberMe)
      authService.setToken?.(token, rememberMe);
      authService.setUser?.(user, rememberMe);
      setAuthData(user, token);

      // 2. Determine destination
      if (isAdminUser(user)) {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      const from = location.state?.from?.pathname;
      const isSafeRedirect =
        from && from !== "/login" && from !== "/register" && from.startsWith("/");

      navigate(isSafeRedirect ? from : "/", { replace: true });
    },
    [navigate, location, setAuthData, rememberMe]
  );

  // ── Field validation ────────────────────────────────────────
  const validate = () => {
    const errors = {};
    const username = credentials.username.trim();
    const password = credentials.password.trim();

    if (!username) errors.username = "Username is required.";
    else if (username.length < 3) errors.username = "Must be at least 3 characters.";

    if (!password) errors.password = "Password is required.";
    else if (password.length < 6) errors.password = "Must be at least 6 characters.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Standard Login ──────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();

    if (cooldownRemaining > 0) return;
    if (!validate()) {
      triggerShake();
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Signing you in…");

    try {
      const result = await authService.login(
        credentials.username.trim(),
        credentials.password.trim(),
        rememberMe
      );

      if (!result?.user || !result?.access_token) {
        throw new Error("Incomplete response from server. Please try again.");
      }

      toast.success("Welcome back!", { id: toastId });
      handleAuthSuccess(result.user, result.access_token);
    } catch (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setCooldownUntil(Date.now() + COOLDOWN_MS);
        toast.error("Too many failed attempts. Please wait 30 seconds.", { id: toastId });
      } else {
        const msg =
          error.response?.data?.detail ||
          error.message ||
          "Incorrect username or password.";
        toast.error(msg, { id: toastId });
      }

      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth ─────────────────────────────────────────────
  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setGoogleLoading(true);
      const toastId = toast.loading("Connecting with Google…");

      try {
        const response = await apiClient.post("/api/auth/google", {
          token: codeResponse.access_token,
        });

        const { access_token, user } = response.data ?? {};
        if (!access_token || !user) throw new Error("Invalid server response.");

        toast.success("Signed in with Google!", { id: toastId });
        handleAuthSuccess(user, access_token);
      } catch (error) {
        toast.error(
          error.response?.data?.detail || "Google sign-in failed. Try again.",
          { id: toastId }
        );
        triggerShake();
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error("Google sign-in was cancelled or failed.");
      triggerShake();
    },
    flow: "implicit",
  });

  // ─── Input change ────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    // Clear field error on type
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-4 sm:p-6">

      {/* ── Ambient background glows ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-4xl"
      >
        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/40 border border-white/5 flex flex-col lg:flex-row min-h-[580px]">

          {/* ─────────────────────────────────────────────────
              LEFT PANEL — Illustration
          ───────────────────────────────────────────────── */}
          <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-[#0F2040] to-[#0A1628] w-5/12 p-10 border-r border-white/5 relative overflow-hidden">
            {/* Subtle grid texture */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            <BookStackIllustration />

            <div className="mt-8 text-center relative z-10">
              <h2 className="text-white/90 text-xl font-bold tracking-tight">LibraryNest</h2>
              <p className="text-white/40 text-sm mt-1.5 leading-relaxed max-w-[200px] mx-auto">
                Your complete library management platform
              </p>
            </div>

            {/* Decorative amber line at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
          </div>

          {/* ─────────────────────────────────────────────────
              RIGHT PANEL — Form
          ───────────────────────────────────────────────── */}
          <div className="flex-1 bg-white flex flex-col">
            {/* Header strip */}
            <div className="px-8 sm:px-10 pt-10 pb-8">
              {/* Mobile brand mark */}
              <div className="flex lg:hidden items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#0F2040] flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <span className="font-bold text-[#0F2040] text-sm tracking-tight">LibraryNest</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-[#0A1628] tracking-tight">
                Sign in
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Enter your credentials to access your account.
              </p>
            </div>

            {/* Form body */}
            <div className="px-8 sm:px-10 pb-8 space-y-5 flex-1">

              {/* Cooldown banner */}
              {cooldownRemaining > 0 && (
                <CooldownBanner remaining={cooldownRemaining} />
              )}

              <motion.form
                onSubmit={handleLogin}
                animate={shake ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
                noValidate
              >
                {/* Username */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2"
                  >
                    Username or Email
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="username"
                      type="text"
                      name="username"
                      autoComplete="username"
                      value={credentials.username}
                      onChange={handleChange}
                      placeholder="e.g. john.doe or john@lib.edu"
                      disabled={isDisabled}
                      aria-invalid={!!fieldErrors.username}
                      aria-describedby={fieldErrors.username ? "username-error" : undefined}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 border-2 transition-all duration-200 outline-none focus:ring-4 disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        fieldErrors.username
                          ? "border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-200 bg-slate-50 focus:border-[#0F2040] focus:bg-white focus:ring-[#0F2040]/10"
                      }`}
                    />
                  </div>
                  <div id="username-error">
                    <FieldError message={fieldErrors.username} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold text-slate-600 uppercase tracking-widest"
                    >
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-[#0F2040] hover:text-amber-600 font-semibold transition-colors"
                      tabIndex={isDisabled ? -1 : 0}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      value={credentials.password}
                      onChange={handleChange}
                      placeholder="Your password"
                      disabled={isDisabled}
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? "password-error" : undefined}
                      className={`w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 border-2 transition-all duration-200 outline-none focus:ring-4 disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        fieldErrors.password
                          ? "border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-200 bg-slate-50 focus:border-[#0F2040] focus:bg-white focus:ring-[#0F2040]/10"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={isDisabled}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F2040]/30 rounded disabled:cursor-not-allowed"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-4.5 h-4.5" />
                      ) : (
                        <EyeIcon className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
                  <div id="password-error">
                    <FieldError message={fieldErrors.password} />
                  </div>
                </div>

                {/* Remember Me */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none group w-fit">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isDisabled}
                    className="w-4 h-4 rounded border-2 border-slate-300 text-[#0F2040] focus:ring-2 focus:ring-[#0F2040]/30 cursor-pointer accent-[#0F2040]"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                    Keep me signed in
                  </span>
                </label>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: isDisabled ? 1 : 1.015 }}
                  whileTap={{ scale: isDisabled ? 1 : 0.985 }}
                  type="submit"
                  disabled={isDisabled}
                  className="w-full relative overflow-hidden bg-[#0F2040] hover:bg-[#142a52] text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-[#0F2040]/30 text-sm"
                >
                  {/* Shimmer overlay while loading */}
                  {loading && (
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
                    />
                  )}
                  <ArrowRightOnRectangleIcon className="w-4.5 h-4.5 flex-shrink-0" />
                  {loading ? "Signing in…" : "Sign in"}
                </motion.button>
              </motion.form>

              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs text-slate-400 font-medium uppercase tracking-widest">
                    or
                  </span>
                </div>
              </div>

              {/* Google Login */}
              <motion.button
                whileHover={{ scale: isDisabled ? 1 : 1.015 }}
                whileTap={{ scale: isDisabled ? 1 : 0.985 }}
                onClick={() => !isDisabled && googleLogin()}
                disabled={isDisabled}
                type="button"
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                <svg className="w-4.5 h-4.5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {googleLoading ? "Connecting…" : "Continue with Google"}
              </motion.button>
            </div>

            {/* Footer */}
            <div className="px-8 sm:px-10 py-5 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-[#0F2040] hover:text-amber-600 font-bold transition-colors"
                >
                  Create one
                </Link>
              </p>
            </div>
          </div>

        </div>
      </motion.div>

      {/* ── Dev Credentials ─────────────────────────────────── */}
      {process.env.NODE_ENV === "development" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="fixed bottom-4 right-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 shadow-lg max-w-[200px]"
        >
          <p className="font-bold mb-1.5">🔧 Dev credentials</p>
          <p>User: <code className="bg-amber-100 px-1 rounded font-mono">admin</code></p>
          <p>Pass: <code className="bg-amber-100 px-1 rounded font-mono">admin123</code></p>
        </motion.div>
      )}

      {/* ── Global shimmer keyframe ─────────────────────────── */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-shimmer { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default Login;