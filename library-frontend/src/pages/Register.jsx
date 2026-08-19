// src/pages/Register.jsx
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
} from "@heroicons/react/24/outline";

import { authService } from "../api/authService";

const Register = () => {
  const navigate = useNavigate();

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    confirmPassword: "",
  });

  // --- UI STATE ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // --- Password Strength ---
  const calculateStrength = (pass) => {
    let score = 0;
    if (!pass) return setPasswordStrength(0);
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    setPasswordStrength(score);
  };

  const strengthLabel = useMemo(() => {
    if (passwordStrength <= 1) return "Very Weak";
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Good";
    if (passwordStrength <= 4) return "Strong";
    return "Very Strong";
  }, [passwordStrength]);

  const strengthColor = useMemo(() => {
    if (passwordStrength <= 2) return "bg-red-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    return "bg-emerald-500";
  }, [passwordStrength]);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "password") calculateStrength(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const full_name = formData.full_name?.trim();
    const username = formData.username?.trim();
    const email = formData.email?.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!full_name || !username || !email || !password || !confirmPassword) {
      toast.error("Please fill all fields.");
      triggerShake();
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      triggerShake();
      return;
    }

    if (passwordStrength < 2) {
      toast.error("Password is too weak.");
      triggerShake();
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creating your account...");

    try {
      await authService.register({
        username,
        email,
        full_name,
        password,
      });

      toast.success("Account created successfully!", { id: toastId });

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 900);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data) ? err?.response?.data?.[0]?.msg : null) ||
        "Registration failed.";

      toast.error(msg, { id: toastId });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-cyan-50 px-3 py-6 sm:px-6 sm:py-10 lg:px-8">

      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto relative">

        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-70" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-sky-50 to-cyan-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none opacity-70" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative z-10 w-full max-w-[34rem] rounded-3xl border border-slate-200 bg-white/90 backdrop-blur-sm p-4 sm:p-6 lg:p-8 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-[#002147] flex items-center justify-center shadow-lg shadow-blue-900/25">
              <UserPlusIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Markaz Library</p>
              <p className="text-[11px] text-slate-500 font-medium">Account Registration</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Create Account</h2>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">Fill details and start using your library profile</p>
          </div>

          <motion.div
            animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Full Name + Username row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none">
                      <IdentificationIcon className="w-4.5 h-4.5" />
                    </div>
                    <input
                      name="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-[#002147] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,33,71,0.07)] transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none">
                      <UserIcon className="w-4.5 h-4.5" />
                    </div>
                    <input
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-[#002147] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,33,71,0.07)] transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
                      placeholder="Choose username"
                      autoComplete="username"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none">
                    <EnvelopeIcon className="w-5 h-5" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-[#002147] focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,33,71,0.07)] transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none">
                    <LockClosedIcon className="w-5 h-5" />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-[#002147] focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,33,71,0.07)] transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#002147] transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>

                {/* Strength bar */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthColor} transition-all duration-400 rounded-full`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex justify-between">
                      <span>Password strength</span>
                      <span className="font-bold">{strengthLabel}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-[#002147] transition-colors pointer-events-none">
                    <LockClosedIcon className="w-5 h-5" />
                  </div>
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-[#002147] focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,33,71,0.07)] transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#002147] transition-colors"
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>

                {formData.confirmPassword && (
                  <p className={`text-[11px] mt-1 font-semibold ${formData.password === formData.confirmPassword ? "text-emerald-600" : "text-red-500"}`}>
                    {formData.password === formData.confirmPassword ? "✅ Passwords match" : "❌ Passwords do not match"}
                  </p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-[#002147] text-white font-bold text-sm shadow-lg shadow-[#002147]/20 hover:bg-[#003166] hover:shadow-[#002147]/35 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2.5 mt-2"
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-2"
                    >
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Creating Account...
                    </motion.span>
                  ) : (
                    <motion.span
                      key="normal"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-2"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      Create Account
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>

            {/* Login link */}
            <p className="mt-7 text-center text-sm text-slate-500 font-medium">
              Already have an account?{" "}
              <Link to="/login" className="text-[#002147] font-bold hover:underline transition-colors">
                Sign In
              </Link>
            </p>
          </motion.div>

          <p className="mt-8 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Markaz Library System
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
