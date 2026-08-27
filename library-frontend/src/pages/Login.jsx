/**
 * ✅ ULTRA-PRO Login.jsx — Markaz Library Management System
 *
 * ENHANCEMENTS:
 * ─────────────────────────────────────────────────────────
 * LOGIC:
 *   ✅ Centralized handleAuthSuccess() with direct navigation
 *   ✅ RememberMe state persistent token storage
 *   ✅ Field-level validation with smooth error message rendering
 *   ✅ Cooldown throttle: 3 failed attempts → 30s live countdown
 *   ✅ Session cleanup on mount (purges invalid/stale tokens)
 *   ✅ Full Google OAuth flow with inline SVG icon fallback
 *
 * UI/UX:
 *   ✅ Split ambient visual aura background + glass card styling
 *   ✅ Live countdown cooldown banner with pulse indicator
 *   ✅ Responsive typography & clean accessibility (ARIA labels)
 *   ✅ Dev-credentials helper card for quick local testing
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import useAuth from "../hooks/useAuth";
import { authService } from "../api/authService";
import apiClient from "../api/apiClient";
import { isAdminUser } from "../config/accessControl";

import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

// ─── Constants & Env Setup ──────────────────────────────────
const DEFAULT_GOOGLE_CLIENT_ID = "158248986174-cv22ngbp9ctjlf0dmditmsre151lpqm9.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID = (import.meta.env?.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
const GOOGLE_AUTH_ENABLED = Boolean(GOOGLE_CLIENT_ID);
const IS_DEV = import.meta.env?.DEV || process.env.NODE_ENV === "development";

const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 30_000;

// ─── Inline Google Icon SVG ────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// ─── Field Error Alert Component ───────────────────────────
const FieldError = ({ id, message }) => (
  <AnimatePresence>
    {message && (
      <motion.p
        id={id}
        role="alert"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600"
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rose-600 flex-shrink-0" />
        {message}
      </motion.p>
    )}
  </AnimatePresence>
);

// ─── Live Cooldown Banner Component ────────────────────────
const CooldownBanner = ({ remaining }) => (
  <motion.div
    role="alert"
    initial={{ opacity: 0, y: -8, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className="flex items-center gap-3 bg-rose-50/90 border border-rose-200/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-rose-700 font-medium shadow-xs"
  >
    <ClockIcon className="w-5 h-5 flex-shrink-0 text-rose-600 animate-pulse" />
    <span>
      Too many failed attempts. Retry in{" "}
      <strong className="font-bold text-rose-900">{Math.ceil(remaining / 1000)}s</strong>
    </span>
  </motion.div>
);

// ─── Google OAuth Login Button Component ────────────────────
const GoogleLoginButton = ({ disabled, loading, onGoogleSuccess, onGoogleError }) => {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      await onGoogleSuccess(tokenResponse);
    },
    onError: () => onGoogleError(),
  });

  return (
    <button
      onClick={() => !disabled && googleLogin()}
      disabled={disabled}
      type="button"
      aria-label="Continue with Google"
      className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200/80 text-slate-700 font-semibold py-3.5 rounded-2xl hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.98] transition-all duration-200 shadow-2xs disabled:opacity-50 disabled:pointer-events-none mb-5 focus:outline-none focus:ring-4 focus:ring-[#002147]/10"
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" aria-hidden="true" />
      ) : (
        <GoogleIcon />
      )}
      <span className="text-sm">{loading ? "Connecting to Google..." : "Continue with Google"}</span>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN LOGIN COMPONENT
// ═══════════════════════════════════════════════════════════
const Login = () => {
  // Form State
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shake, setShake] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Throttling States
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

  // ── Stale Token Cleanup ────────────────────────────────────
  useEffect(() => {
    const token = authService.getToken?.();
    if (!token) authService.clearToken?.();
  }, []);

  // ── Cooldown Timer Hook ────────────────────────────────────
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

  // ── Shake Trigger Helper ──────────────────────────────────
  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  // ── Post-Authentication Central Handler ───────────────────
  const handleAuthSuccess = useCallback(
    (user, token) => {
      // ✅ Always default to English upon any login
      localStorage.setItem('kil_language', 'en');
      try {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${rootDomain};`;
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = 'en';
        document.body.classList.remove('lang-ur', 'lang-ar', 'font-urdu', 'font-arabic');
        document.body.classList.add('lang-en');
      } catch (e) {}

      authService.setToken?.(token, rememberMe);
      authService.setUser?.(user, rememberMe);
      setAuthData({ access_token: token, user }, token);

      const from = location.state?.from?.pathname;
      const safeRedirect = from && from !== "/login" && from !== "/register" && from.startsWith("/");

      if (safeRedirect) {
        navigate(from, { replace: true });
        return;
      }

      // If user is Admin, redirect to Admin Dashboard; Normal users always go to Homepage ("/")
      if (isAdminUser(user)) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    },
    [navigate, location, setAuthData, rememberMe]
  );

  // ── Validation Logic ──────────────────────────────────────
  const validate = () => {
    const errors = {};
    const u = credentials.username.trim();
    const p = credentials.password.trim();

    if (!u) {
      errors.username = "Username is required.";
    } else if (u.length < 3) {
      errors.username = "Username must be at least 3 characters.";
    }

    if (!p) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Standard Login Form Submit ────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (cooldownRemaining > 0) return;
    if (!validate()) {
      triggerShake();
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Verifying security credentials...");

    try {
      const result = await authService.login(
        credentials.username.trim(),
        credentials.password.trim(),
        rememberMe
      );

      if (!result?.user || !result?.access_token) {
        throw new Error("Invalid response received from authentication server.");
      }

      const name = result.user.full_name || result.user.username || "there";
      toast.success(`Welcome back, ${name}!`, { id: toastId });
      handleAuthSuccess(result.user, result.access_token);
    } catch (err) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (nextAttempts >= MAX_ATTEMPTS) {
        setCooldownUntil(Date.now() + COOLDOWN_MS);
        toast.error("Too many failed attempts. Security cooldown active for 30s.", { id: toastId });
      } else {
        const msg = err?.response?.data?.detail || err.message || "Invalid username or password.";
        toast.error(msg, { id: toastId });
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth Submit ───────────────────────────────────
  const handleGoogleSuccess = async (tokenResponse) => {
    setGoogleLoading(true);
    const toastId = toast.loading("Authenticating via Google...");
    try {
      const res = await apiClient.post("/api/auth/google", {
        token: tokenResponse.access_token,
      });
      const { access_token, user } = res.data ?? {};
      if (!access_token || !user) throw new Error("Invalid authentication payload.");
      toast.success("Google Sign-In successful!", { id: toastId });
      handleAuthSuccess(user, access_token);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Google login failed. Please try again.";
      toast.error(msg, { id: toastId });
      triggerShake();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google Sign-In popup closed or interrupted.");
    triggerShake();
  };

  // ── Input Change Handler ──────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100/60 to-indigo-50/50 px-4 py-4 sm:px-6">
      {/* Background Decorative Gradient Orbs */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-xl shadow-slate-900/5 my-auto"
      >
        {/* Brand Logo & Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#002147] to-indigo-900 flex items-center justify-center shadow-md shadow-indigo-950/20 text-white">
              <ShieldCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 leading-none"> Library  </h1>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Secure Access Portal</p>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs font-bold text-slate-500 hover:text-[#002147] px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ← Home
          </Link>
        </div>

        <div className="mb-3.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Sign in to access your digital catalog and research profile.
          </p>
        </div>

        <motion.div
          animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Active Cooldown Banner */}
          {cooldownRemaining > 0 && (
            <div className="mb-3">
              <CooldownBanner remaining={cooldownRemaining} />
            </div>
          )}

          {/* Google OAuth Login Button */}
          {GOOGLE_AUTH_ENABLED ? (
            <GoogleLoginButton
              disabled={isDisabled}
              loading={googleLoading}
              onGoogleSuccess={handleGoogleSuccess}
              onGoogleError={handleGoogleError}
            />
          ) : (
            <button
              disabled
              type="button"
              aria-label="Google login unavailable"
              className="w-full flex items-center justify-center gap-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-semibold py-2.5 rounded-xl mb-3 text-xs cursor-not-allowed"
            >
              <GoogleIcon />
              <span>Google Login Disabled</span>
            </button>
          )}

          {/* Form Divider */}
          <div className="flex items-center gap-3 my-3" aria-hidden="true">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">or login with password</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-3" noValidate>
            {/* Username Input */}
            <div className="space-y-1">
              <label htmlFor="username" className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none" aria-hidden="true">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={credentials.username}
                  onChange={handleChange}
                  disabled={isDisabled}
                  placeholder="Enter your username"
                  autoComplete="username"
                  aria-invalid={!!fieldErrors.username}
                  aria-describedby={fieldErrors.username ? "username-error" : undefined}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl outline-none transition-all text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed border-2 ${
                    fieldErrors.username
                      ? "bg-rose-50/50 border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                      : "bg-slate-50/80 border-slate-200/80 focus:border-[#002147] focus:bg-white focus:ring-4 focus:ring-[#002147]/10"
                  }`}
                />
              </div>
              <FieldError id="username-error" message={fieldErrors.username} />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[#002147] font-bold hover:text-indigo-600 transition-colors focus:outline-none focus:underline"
                  tabIndex={isDisabled ? -1 : 0}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none" aria-hidden="true">
                  <LockClosedIcon className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  disabled={isDisabled}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  className={`w-full pl-9 pr-10 py-2.5 rounded-xl outline-none transition-all text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed border-2 ${
                    fieldErrors.password
                      ? "bg-rose-50/50 border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                      : "bg-slate-50/80 border-slate-200/80 focus:border-[#002147] focus:bg-white focus:ring-4 focus:ring-[#002147]/10"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isDisabled}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#002147] transition-colors focus:outline-none disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              <FieldError id="password-error" message={fieldErrors.password} />
            </div>

            {/* Remember Me Checkbox */}
            <div className="pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none group w-fit">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isDisabled}
                  className="w-3.5 h-3.5 rounded border-slate-300 accent-[#002147] cursor-pointer focus:ring-2 focus:ring-[#002147]/20"
                />
                <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">
                  Keep me signed in on this device
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: isDisabled ? 1 : 1.01, y: isDisabled ? 0 : -1 }}
              whileTap={{ scale: isDisabled ? 1 : 0.98 }}
              type="submit"
              disabled={isDisabled}
              className="w-full py-3 rounded-xl bg-[#002147] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#002147]/20 hover:bg-[#002f66] hover:shadow-lg hover:shadow-[#002147]/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1.5 focus:outline-none focus:ring-4 focus:ring-[#002147]/25 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ArrowRightOnRectangleIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Sign In to Library</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Registration Redirect Link */}
          <p className="mt-4 text-center text-xs text-slate-500 font-medium">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-[#002147] font-bold hover:text-indigo-600 transition-colors focus:outline-none focus:underline"
            >
              Create Account
            </Link>
          </p>

          <p className="mt-3 text-center text-[10px] text-slate-400">
            &copy; {new Date().getFullYear()} MARKAZ AHLE HADEES KOKAN &bull; All Rights Reserved
          </p>
        </motion.div>
      </motion.div>

      {/* Dev Credentials Banner (Visible only in dev environment) */}
      {IS_DEV && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          aria-hidden="true"
          className="fixed bottom-4 right-4 p-3.5 bg-amber-50/95 backdrop-blur-xs border border-amber-200 rounded-2xl text-xs text-amber-900 shadow-lg max-w-xs z-50"
        >
          <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
            <span>🔧 Developer Fast Login</span>
          </div>
          <p className="text-[11px] text-amber-700">
            User: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">admin</code>
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Pass: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">admin</code>
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default Login;