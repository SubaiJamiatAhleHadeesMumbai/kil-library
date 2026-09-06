/**
 * ✅ ULTRA-PRO Register.jsx — Markaz Library Management System
 *
 * ENHANCEMENTS:
 * ─────────────────────────────────────────────────────────
 * LOGIC:
 *   ✅ Real-time multi-criteria password strength calculator
 *   ✅ Immediate field-level validation with inline alerts
 *   ✅ Exact password match verification tag
 *   ✅ Clean API error handling with custom toast notifications
 *   ✅ Seamless transition to /login on registration success
 *
 * UI/UX:
 *   ✅ Ambient lighting blobs + glassmorphism backdrop container
 *   ✅ Responsive 2-column input layout for Full Name and Username
 *   ✅ Full accessibility attributes (ARIA roles, invalid markers)
 *   ✅ Framer-motion shake feedback on validation errors
 */

import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  IdentificationIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { authService } from "../api/authService";

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
        className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-rose-600"
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rose-600 flex-shrink-0" />
        {message}
      </motion.p>
    )}
  </AnimatePresence>
);

const Register = () => {
  const navigate = useNavigate();

  // --- Form State ---
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});

  // --- UI & Interaction States ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // --- Password Strength Calculation ---
  const calculateStrength = (pass) => {
    let score = 0;
    if (!pass) return setPasswordStrength(0);
    if (pass.length >= 6) score += 1;
    if (pass.length >= 9) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    setPasswordStrength(score);
  };

  const strengthLabel = useMemo(() => {
    if (passwordStrength <= 1) return "Very Weak";
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Strong";
    return "Excellent";
  }, [passwordStrength]);

  const strengthColor = useMemo(() => {
    if (passwordStrength <= 2) return "bg-rose-500";
    if (passwordStrength <= 3) return "bg-amber-500";
    return "bg-emerald-500";
  }, [passwordStrength]);

  // --- Change Handler ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (name === "password") calculateStrength(value);
  };

  // --- Form Validation ---
  const validateForm = () => {
    const errors = {};
    const fn = formData.full_name.trim();
    const un = formData.username.trim();
    const em = formData.email.trim();
    const pw = formData.password;
    const cp = formData.confirmPassword;

    if (!fn) errors.full_name = "Full name is required.";
    if (!un) errors.username = "Username is required.";
    else if (un.length < 3) errors.username = "Username must be at least 3 characters.";

    if (!em) errors.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) errors.email = "Please enter a valid email address.";

    if (!pw) errors.password = "Password is required.";
    else if (passwordStrength < 2) errors.password = "Password is too weak.";

    if (!cp) errors.confirmPassword = "Please confirm your password.";
    else if (pw !== cp) errors.confirmPassword = "Passwords do not match.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Submit Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please resolve highlighted form errors.");
      triggerShake();
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creating your Markaz account...");

    try {
      await authService.register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        password: formData.password,
      });

      toast.success("Account created successfully! Redirecting...", { id: toastId });

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 900);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data) ? err?.response?.data?.[0]?.msg : null) ||
        "Registration failed. Please try again.";

      toast.error(msg, { id: toastId });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100/60 to-indigo-50/50 px-4 py-4 sm:px-6">
      {/* Background Decorative Gradient Orbs */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-xl shadow-slate-900/5 my-auto"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#002147] to-indigo-900 flex items-center justify-center shadow-md shadow-indigo-950/20 text-white">
              <UserPlusIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">MARKAZ AHLE HADEES KOKAN</h1>
              <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">New Account Registration</p>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs font-bold text-slate-500 hover:text-[#002147] px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ← Home
          </Link>
        </div>

        <div className="mb-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Create Account</h2>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            Fill in your details to get started with your research profile.
          </p>
        </div>

        <motion.div
          animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
            {/* Full Name & Username Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Full Name */}
              <div className="space-y-1">
                <label htmlFor="full_name" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none" aria-hidden="true">
                    <IdentificationIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Your full name"
                    autoComplete="name"
                    aria-invalid={!!fieldErrors.full_name}
                    aria-describedby={fieldErrors.full_name ? "fn-error" : undefined}
                    className={`w-full pl-8 pr-2.5 py-2 rounded-xl outline-none transition-all text-xs font-medium text-slate-800 placeholder:text-slate-400 disabled:opacity-60 border-2 ${
                      fieldErrors.full_name
                        ? "bg-rose-50/50 border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                        : "bg-slate-50/80 border-slate-200/80 focus:border-[#002147] focus:bg-white focus:ring-4 focus:ring-[#002147]/10"
                    }`}
                  />
                </div>
                <FieldError id="fn-error" message={fieldErrors.full_name} />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label htmlFor="username" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none" aria-hidden="true">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Choose username"
                    autoComplete="username"
                    aria-invalid={!!fieldErrors.username}
                    aria-describedby={fieldErrors.username ? "un-error" : undefined}
                    className={`w-full pl-8 pr-2.5 py-2 rounded-xl outline-none transition-all text-xs font-medium text-slate-800 placeholder:text-slate-400 disabled:opacity-60 border-2 ${
                      fieldErrors.username
                        ? "bg-rose-50/50 border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                        : "bg-slate-50/80 border-slate-200/80 focus:border-[#002147] focus:bg-white focus:ring-4 focus:ring-[#002147]/10"
                    }`}
                  />
                </div>
                <FieldError id="un-error" message={fieldErrors.username} />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none" aria-hidden="true">
                  <EnvelopeIcon className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "em-error" : undefined}
                  className={`w-full pl-8 pr-3 py-2 rounded-xl outline-none transition-all text-xs font-medium text-slate-800 placeholder:text-slate-400 disabled:opacity-60 border-2 ${
                    fieldErrors.email
                      ? "bg-rose-50/50 border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                      : "bg-slate-50/80 border-slate-200/80 focus:border-[#002147] focus:bg-white focus:ring-4 focus:ring-[#002147]/10"
                  }`}
                />
              </div>
              <FieldError id="em-error" message={fieldErrors.email} />
            </div>

            {/* Password & Confirm Password Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Password Field */}
              <div className="space-y-1">
                <label htmlFor="password" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none" aria-hidden="true">
                    <LockClosedIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Create password"
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "pw-error" : undefined}
                    className={`w-full pl-8 pr-9 py-2 rounded-xl outline-none transition-all text-xs font-medium text-slate-800 placeholder:text-slate-400 disabled:opacity-60 border-2 ${
                      fieldErrors.password
                        ? "bg-rose-50/50 border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                        : "bg-slate-50/80 border-slate-200/80 focus:border-[#002147] focus:bg-white focus:ring-4 focus:ring-[#002147]/10"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-[#002147] transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <FieldError id="pw-error" message={fieldErrors.password} />
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none" aria-hidden="true">
                    <LockClosedIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? "cp-error" : undefined}
                    className={`w-full pl-8 pr-9 py-2 rounded-xl outline-none transition-all text-xs font-medium text-slate-800 placeholder:text-slate-400 disabled:opacity-60 border-2 ${
                      fieldErrors.confirmPassword
                        ? "bg-rose-50/50 border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                        : "bg-slate-50/80 border-slate-200/80 focus:border-[#002147] focus:bg-white focus:ring-4 focus:ring-[#002147]/10"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-[#002147] transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <FieldError id="cp-error" message={fieldErrors.confirmPassword} />
              </div>
            </div>

            {/* Password Strength & Match Status Bar */}
            {formData.password && (
              <div className="pt-0.5 space-y-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strengthColor} transition-all duration-300 rounded-full`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                  <span>Strength: <strong className="text-slate-800">{strengthLabel}</strong></span>
                  {formData.confirmPassword && !fieldErrors.confirmPassword && (
                    formData.password === formData.confirmPassword ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" /> Match
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold flex items-center gap-1">
                        <XCircleIcon className="w-3 h-3" /> Mismatch
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#002147] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#002147]/20 hover:bg-[#002f66] hover:shadow-lg hover:shadow-[#002147]/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 focus:outline-none focus:ring-4 focus:ring-[#002147]/25 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlusIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Create Account</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Login Link */}
          <p className="mt-3.5 text-center text-xs text-slate-500 font-medium">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#002147] font-bold hover:text-indigo-600 transition-colors focus:outline-none focus:underline"
            >
              Sign In
            </Link>
          </p>

          <p className="mt-2 text-center text-[10px] text-slate-400">
            &copy; {new Date().getFullYear()}  MARKAZ AHLE HADEES KOKAN &bull; All Rights Reserved
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;