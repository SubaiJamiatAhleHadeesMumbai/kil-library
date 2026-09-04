// src/pages/RestrictedBookPermissions.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { bookService } from "../api/bookService";
import { userService } from "../api/userService";
import restrictedBookService from "../api/restrictedBookService";
import toast from "react-hot-toast";

import {
  ShieldCheckIcon,
  UserIcon,
  UserGroupIcon,
  TrashIcon,
  PlusIcon,
  LockClosedIcon,
  BookOpenIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

// Helper for error extraction
const extractError = (err, fallback = "Operation failed") => {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.detail ||
    err?.message ||
    fallback
  );
};

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const RestrictedBookPermissions = () => {
  const navigate = useNavigate();

  // --- State ---
  const [data, setData] = useState({ books: [], users: [], roles: [] });
  const [permissions, setPermissions] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // UI Loading States
  const [loading, setLoading] = useState({
    init: true,
    perms: false,
    action: false,
  });

  // Grant Form State
  const [form, setForm] = useState({
    type: "user", // "user" | "role"
    userId: "",
    roleId: "",
    duration: "permanent", // "permanent" | "7d" | "30d" | "90d" | "custom"
    customDate: "",
    canRead: true,
    canSearch: true,
    canDownload: false,
    notes: "",
  });

  // --- Derived Data ---
  const restrictedBooks = useMemo(() => {
    return (data.books || []).filter((b) => b?.is_restricted);
  }, [data.books]);

  const filteredRestrictedBooks = useMemo(() => {
    if (!bookSearch.trim()) return restrictedBooks;
    const q = bookSearch.toLowerCase();
    return restrictedBooks.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.id?.toString().includes(q)
    );
  }, [restrictedBooks, bookSearch]);

  const selectedBook = useMemo(() => {
    const id = toInt(selectedBookId);
    return restrictedBooks.find((b) => b.id === id) || null;
  }, [restrictedBooks, selectedBookId]);

  // Filtered users for dropdown search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return data.users;
    const q = userSearch.toLowerCase();
    return data.users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
    );
  }, [data.users, userSearch]);

  // --- Data Fetching ---
  const fetchInitialData = useCallback(async () => {
    setLoading((prev) => ({ ...prev, init: true }));

    try {
      const [books, users, roles] = await Promise.all([
        bookService.getAllBooks(false),
        userService.getAllUsers(),
        userService.getAllRoles(),
      ]);

      const safeBooks = Array.isArray(books) ? books : [];
      setData({
        books: safeBooks,
        users: Array.isArray(users) ? users : [],
        roles: Array.isArray(roles) ? roles : [],
      });

      // Auto-select first restricted book if available
      const rBooks = safeBooks.filter((b) => b?.is_restricted);
      if (rBooks.length > 0 && !selectedBookId) {
        setSelectedBookId(rBooks[0].id.toString());
      }
    } catch (err) {
      toast.error(extractError(err, "Failed to load library resources."));
    } finally {
      setLoading((prev) => ({ ...prev, init: false }));
    }
  }, [selectedBookId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- Load Permissions when selected book changes ---
  const loadPermissions = useCallback(async (bookId) => {
    if (!bookId) {
      setPermissions([]);
      return;
    }

    setLoading((prev) => ({ ...prev, perms: true }));

    try {
      const res = await restrictedBookService.getPermissionsForBook(bookId);
      setPermissions(Array.isArray(res) ? res : []);
    } catch (err) {
      setPermissions([]);
      console.warn("Could not load permissions for book:", err);
    } finally {
      setLoading((prev) => ({ ...prev, perms: false }));
    }
  }, []);

  useEffect(() => {
    const bookId = toInt(selectedBookId);
    if (bookId) {
      loadPermissions(bookId);
    } else {
      setPermissions([]);
    }
  }, [selectedBookId, loadPermissions]);

  // --- Grant Access Action ---
  const handleAssign = async (e) => {
    e.preventDefault();

    const bookId = toInt(selectedBookId);
    if (!bookId) {
      toast.error("Please select a restricted book first.");
      return;
    }

    const userId = form.type === "user" ? toInt(form.userId) : null;
    const roleId = form.type === "role" ? toInt(form.roleId) : null;

    if (form.type === "user" && !userId) {
      toast.error("Please choose a user to grant access.");
      return;
    }

    if (form.type === "role" && !roleId) {
      toast.error("Please choose a role to grant access.");
      return;
    }

    setLoading((prev) => ({ ...prev, action: true }));
    const toastId = toast.loading("Granting access permission...");

    try {
      const payload = {
        book_id: bookId,
        user_id: userId,
        role_id: roleId,
        can_read: form.canRead,
        can_search: form.canSearch,
        can_download: form.canDownload,
        notes: form.notes || null,
      };

      await restrictedBookService.assignPermission(payload);

      toast.success("Access permission granted successfully!", { id: toastId });
      await loadPermissions(bookId);

      // Reset selection
      setForm((prev) => ({
        ...prev,
        userId: "",
        roleId: "",
        notes: "",
      }));
      setUserSearch("");
    } catch (err) {
      toast.error(
        extractError(err, "Permission assignment failed. It may already exist."),
        { id: toastId }
      );
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  // --- Revoke Access Action ---
  const handleRevoke = async (permissionId, name) => {
    if (!permissionId) return;

    if (!window.confirm(`Are you sure you want to revoke access for ${name}?`)) {
      return;
    }

    setLoading((prev) => ({ ...prev, action: true }));
    const toastId = toast.loading(`Revoking access for ${name}...`);

    try {
      await restrictedBookService.revokePermission(permissionId);
      toast.success(`Access revoked for ${name}.`, { id: toastId });
      setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    } catch (err) {
      toast.error(extractError(err, "Failed to revoke access."), { id: toastId });
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* 1. TOP HEADER & METRICS STRIP */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              <ShieldCheckIcon className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Restricted Access Control
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black">
                  RBAC Secure
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage granular permissions, time-bound access, and view consumption logs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/digital-access"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition shadow-2xs"
            >
              <EyeIcon className="w-4 h-4 text-slate-500" />
              View Digital Audit Logs
            </Link>
          </div>
        </div>

        {/* 4 Quick Stat Metric Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <LockClosedIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                Restricted Books
              </span>
              <p className="text-2xl font-black text-indigo-950">
                {restrictedBooks.length}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                Active Book Grants
              </span>
              <p className="text-2xl font-black text-emerald-950">
                {permissions.length}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <UserGroupIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                Total System Roles
              </span>
              <p className="text-2xl font-black text-purple-950">
                {data.roles.length}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <SparklesIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                Active Members
              </span>
              <p className="text-2xl font-black text-amber-950">
                {data.users.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RESTRICTED BOOK SELECTOR WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Restricted Books List / Selector (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col h-[680px]">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <LockClosedIcon className="w-4 h-4 text-indigo-600" />
                Select Restricted Book
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {filteredRestrictedBooks.length} Books
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search restricted books..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* Scrollable Books List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {loading.init ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold animate-pulse">
                Loading restricted library...
              </div>
            ) : filteredRestrictedBooks.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <LockClosedIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">
                  {bookSearch ? "No matching books found." : "No restricted books configured."}
                </p>
              </div>
            ) : (
              filteredRestrictedBooks.map((b) => {
                const isSelected = selectedBookId === b.id.toString();
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBookId(b.id.toString())}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/80 border-indigo-300 shadow-xs ring-1 ring-indigo-400"
                        : "bg-white hover:bg-slate-50 border-slate-100"
                    }`}
                  >
                    <div className="w-11 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-2xs flex items-center justify-center">
                      {b.cover_image_url ? (
                        <img
                          src={b.cover_image_url}
                          alt={b.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpenIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {b.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {b.author || "Unknown Author"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          ID: {b.id}
                        </span>
                        {b.category?.name && (
                          <span className="text-[9.5px] font-semibold text-slate-400 truncate">
                            • {b.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Grants & Permission Creator (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedBook ? (
            <>
              {/* Selected Book Header Card */}
              <div className="bg-gradient-to-r from-slate-900 via-[#002147] to-indigo-950 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-18 rounded-xl bg-white/10 p-1 border border-white/20 shrink-0 overflow-hidden flex items-center justify-center shadow-md">
                    {selectedBook.cover_image_url ? (
                      <img
                        src={selectedBook.cover_image_url}
                        alt={selectedBook.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <BookOpenIcon className="w-7 h-7 text-white/60" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Active Restricted Resource
                    </span>
                    <h2 className="text-lg sm:text-xl font-black truncate mt-0.5">
                      {selectedBook.title}
                    </h2>
                    <p className="text-xs text-slate-300 truncate">
                      Author: <span className="font-bold text-white">{selectedBook.author || "Unknown"}</span> • Pages: {selectedBook.page_count || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Link
                    to={`/read/${selectedBook.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/20 shadow-2xs"
                  >
                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                    Open Reader
                  </Link>
                </div>
              </div>

              {/* Grid: Grant Access Form + Active Permissions Table */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* 1. GRANT ACCESS FORM (5 cols) */}
                <div className="xl:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs h-fit">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <PlusIcon className="w-4 h-4 text-indigo-600" />
                    Grant New Access
                  </h3>

                  <form onSubmit={handleAssign} className="space-y-4">
                    {/* User / Role Mode Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, type: "user", userId: "", roleId: "" }))}
                        className={`flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          form.type === "user"
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <UserIcon className="w-3.5 h-3.5" /> Specific User
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, type: "role", userId: "", roleId: "" }))}
                        className={`flex-1 py-2 text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          form.type === "role"
                            ? "bg-white text-purple-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <UserGroupIcon className="w-3.5 h-3.5" /> Entire Role
                      </button>
                    </div>

                    {/* Target Dropdown */}
                    {form.type === "user" ? (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                          Select User (or Search)
                        </label>
                        <input
                          type="text"
                          placeholder="Search username or email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 mb-2 focus:bg-white outline-none"
                        />
                        <select
                          value={form.userId}
                          onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                          disabled={loading.action}
                        >
                          <option value="">-- Choose User --</option>
                          {filteredUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username} ({u.email || u.full_name || "Member"})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                          Select Role
                        </label>
                        <select
                          value={form.roleId}
                          onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                          disabled={loading.action}
                        >
                          <option value="">-- Choose Role --</option>
                          {data.roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Permission Scope Checkboxes */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Permission Capabilities
                      </span>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.canRead}
                          onChange={(e) => setForm((p) => ({ ...p, canRead: e.target.checked }))}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>📖 Read Online (Smart Reader)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.canSearch}
                          onChange={(e) => setForm((p) => ({ ...p, canSearch: e.target.checked }))}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>🔍 Full-Text Search Allowed</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.canDownload}
                          onChange={(e) => setForm((p) => ({ ...p, canDownload: e.target.checked }))}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>📥 Download PDF Offline</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading.action}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ShieldCheckIcon className="w-4 h-4" />
                      Grant Permission
                    </button>
                  </form>
                </div>

                {/* 2. ACTIVE PERMISSIONS TABLE (7 cols) */}
                <div className="xl:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      Granted Permissions ({permissions.length})
                    </h3>
                  </div>

                  {loading.perms ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-bold animate-pulse">
                      Loading active permissions...
                    </div>
                  ) : permissions.length === 0 ? (
                    <div className="py-16 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 my-auto">
                      <LockClosedIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">
                        No permissions granted for this book yet.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Use the form on the left to assign access to scholars or roles.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 overflow-y-auto max-h-[480px] pr-1">
                      {permissions.map((perm) => {
                        const isUser = !!perm.user_id;
                        const targetUser = isUser ? data.users.find((u) => u.id === perm.user_id) : null;
                        const targetRole = !isUser ? data.roles.find((r) => r.id === perm.role_id) : null;
                        const name = isUser
                          ? targetUser?.username || `User #${perm.user_id}`
                          : targetRole?.name || `Role #${perm.role_id}`;

                        return (
                          <div
                            key={perm.id}
                            className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/70 flex items-center justify-between gap-3 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                                  isUser
                                    ? "bg-indigo-100 text-indigo-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}
                              >
                                {isUser ? <UserIcon className="w-4 h-4" /> : <UserGroupIcon className="w-4 h-4" />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-extrabold text-slate-900 truncate">
                                    {name}
                                  </p>
                                  <span
                                    className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                                      isUser
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : "bg-purple-50 text-purple-700 border border-purple-200"
                                    }`}
                                  >
                                    {isUser ? "User" : "Role"}
                                  </span>
                                </div>
                                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                                  {isUser && targetUser?.email ? targetUser.email : "Permanent Policy Access"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isUser && (
                                <Link
                                  to={`/admin/digital-access?userId=${perm.user_id}`}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                  title="Inspect User Audit Logs"
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </Link>
                              )}
                              <button
                                onClick={() => handleRevoke(perm.id, name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Revoke Permission"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
              <LockClosedIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">
                Please select a restricted book from the list
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose a book to inspect its active permission policies and assign access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestrictedBookPermissions;
