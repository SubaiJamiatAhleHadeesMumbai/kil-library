/**
 * AdminThemeCustomizer.jsx
 * Global UI/UX Control Panel
 * Allows Admins to manage site-wide theme, colors, typography, border-radius,
 * density, site branding, and enabled languages live without code deploys.
 */
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  SparklesIcon,
  SwatchIcon,
  AdjustmentsHorizontalIcon,
  LanguageIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { useTheme, DEFAULT_UI_SETTINGS } from "../../context/ThemeContext";
import settingsService from "../../api/settingsService";

const PRESET_PALETTES = [
  {
    name: "Classic Markaz Navy",
    primary: "#002147",
    primary_hover: "#003166",
    secondary: "#064e3b",
    accent: "#2D89C8",
  },
  {
    name: "Emerald Islamic Heritage",
    primary: "#064E3B",
    primary_hover: "#043629",
    secondary: "#002147",
    accent: "#10B981",
  },
  {
    name: "Royal Sapphire",
    primary: "#1E3A8A",
    primary_hover: "#172554",
    secondary: "#0F766E",
    accent: "#38BDF8",
  },
  {
    name: "Noble Sand & Gold",
    primary: "#1C1917",
    primary_hover: "#292524",
    secondary: "#78350F",
    accent: "#D97706",
  },
];

const AdminThemeCustomizer = () => {
  const { uiSettings, setUiSettings, updatePreview, applyThemeToDOM } = useTheme();
  const [form, setForm] = useState(uiSettings);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("colors"); // "colors" | "layout" | "typography" | "languages" | "branding"

  useEffect(() => {
    setForm(uiSettings);
  }, [uiSettings]);

  const handleFieldChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    updatePreview({ [field]: value });
  };

  const handlePresetSelect = (palette) => {
    const updated = {
      ...form,
      primary_color: palette.primary,
      primary_hover: palette.primary_hover,
      secondary_color: palette.secondary,
      accent_color: palette.accent,
    };
    setForm(updated);
    updatePreview(updated);
    toast.success(`Applied "${palette.name}" palette preview!`);
  };

  const handleLanguageToggle = (langCode) => {
    const current = form.enabled_languages || ["en", "ur", "ar"];
    let next;
    if (current.includes(langCode)) {
      if (current.length === 1) {
        toast.error("At least one language must remain enabled.");
        return;
      }
      next = current.filter((c) => c !== langCode);
    } else {
      next = [...current, langCode];
    }
    handleFieldChange("enabled_languages", next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateUiSettings(form);
      setUiSettings(form);
      applyThemeToDOM(form);
      toast.success("Global UI/UX Design Tokens published successfully!");
    } catch {
      toast.error("Failed to save UI settings. Please check permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm("Reset all UI/UX settings to default Markaz theme?")) return;
    setForm(DEFAULT_UI_SETTINGS);
    updatePreview(DEFAULT_UI_SETTINGS);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs">
              <SparklesIcon className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Global UI/UX Control Panel
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Control brand tokens, theme colors, border radius, typography, and multilingual toggles live without code changes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-2xs flex items-center gap-1.5"
          >
            <ArrowPathIcon className="w-4 h-4 text-slate-400" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: form.primary_color }}
          >
            {saving ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckBadgeIcon className="w-4 h-4" />
                Publish Live Theme
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto gap-1">
            {[
              { id: "colors", label: "Color Tokens", icon: SwatchIcon },
              { id: "layout", label: "Shape & Density", icon: AdjustmentsHorizontalIcon },
              { id: "typography", label: "Typography", icon: LanguageIcon },
              { id: "languages", label: "Multilingual", icon: GlobeAltIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: COLORS */}
          {activeTab === "colors" && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Preset Palettes</h3>
                <p className="text-xs text-slate-500 mb-3">Quickly switch between carefully balanced color schemes</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_PALETTES.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => handlePresetSelect(p)}
                      className="p-3 text-start rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-xs transition group bg-slate-50"
                    >
                      <div className="flex gap-1 mb-2">
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: p.primary }} />
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: p.secondary }} />
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: p.accent }} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 block truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Primary Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => handleFieldChange("primary_color", e.target.value)}
                      className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={form.primary_color}
                      onChange={(e) => handleFieldChange("primary_color", e.target.value)}
                      className="text-xs font-mono font-bold text-slate-800 bg-transparent flex-1 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Primary Hover Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Primary Hover Color
                  </label>
                  <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <input
                      type="color"
                      value={form.primary_hover}
                      onChange={(e) => handleFieldChange("primary_hover", e.target.value)}
                      className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={form.primary_hover}
                      onChange={(e) => handleFieldChange("primary_hover", e.target.value)}
                      className="text-xs font-mono font-bold text-slate-800 bg-transparent flex-1 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) => handleFieldChange("secondary_color", e.target.value)}
                      className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={form.secondary_color}
                      onChange={(e) => handleFieldChange("secondary_color", e.target.value)}
                      className="text-xs font-mono font-bold text-slate-800 bg-transparent flex-1 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) => handleFieldChange("accent_color", e.target.value)}
                      className="w-9 h-9 rounded-xl border-0 cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={form.accent_color}
                      onChange={(e) => handleFieldChange("accent_color", e.target.value)}
                      className="text-xs font-mono font-bold text-slate-800 bg-transparent flex-1 focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LAYOUT & DENSITY */}
          {activeTab === "layout" && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
                  Border Radius Style
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "sharp", label: "Sharp", desc: "4px — Crisp, academic" },
                    { id: "rounded", label: "Modern Rounded", desc: "14px — Standard balanced" },
                    { id: "pill", label: "Soft Pill", desc: "24px — Ultra-friendly" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleFieldChange("border_radius", r.id)}
                      className={`p-3.5 rounded-2xl border text-start transition cursor-pointer ${
                        form.border_radius === r.id
                          ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-800 block">{r.label}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
                  Spacing Density Scale
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "compact", label: "Compact", desc: "Tight information density" },
                    { id: "comfortable", label: "Comfortable", desc: "Standard balanced spacing" },
                    { id: "spacious", label: "Spacious", desc: "Generous breathing room" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleFieldChange("spacing_density", d.id)}
                      className={`p-3.5 rounded-2xl border text-start transition cursor-pointer ${
                        form.spacing_density === d.id
                          ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-800 block">{d.label}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TYPOGRAPHY */}
          {activeTab === "typography" && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Urdu Calligraphy Font Family
                </label>
                <select
                  value={form.urdu_font}
                  onChange={(e) => handleFieldChange("urdu_font", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Jameel Noori Nastaleeq">Jameel Noori Nastaleeq (Recommended)</option>
                  <option value="Noto Nastaliq Urdu">Noto Nastaliq Urdu (Google)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1 font-urdu text-end text-lg leading-loose">
                  یہ اردو فونٹ کا نمونہ ہے — نستعلیق خط
                </p>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Arabic Script Font Family
                </label>
                <select
                  value={form.arabic_font}
                  onChange={(e) => handleFieldChange("arabic_font", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Noto Naskh Arabic">Noto Naskh Arabic (Clean Standard)</option>
                  <option value="Amiri">Amiri (Classical Calligraphy)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1 font-arabic text-end text-base">
                  هذا نموذج للخط العربي الكلاسيكي
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: MULTILINGUAL */}
          {activeTab === "languages" && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Default Site Language
                </label>
                <select
                  value={form.default_language}
                  onChange={(e) => handleFieldChange("default_language", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="en">English (LTR)</option>
                  <option value="ur">Urdu - اردو (RTL)</option>
                  <option value="ar">Arabic - العربية (RTL)</option>
                </select>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-3">
                  Enabled Languages in Switcher
                </label>
                <div className="space-y-2.5">
                  {[
                    { code: "en", name: "English", dir: "LTR" },
                    { code: "ur", name: "Urdu (اردو)", dir: "RTL" },
                    { code: "ar", name: "Arabic (العربية)", dir: "RTL" },
                  ].map((lang) => {
                    const isChecked = form.enabled_languages?.includes(lang.code);
                    return (
                      <label
                        key={lang.code}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleLanguageToggle(lang.code)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-sm font-bold text-slate-800">{lang.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">{lang.dir}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Live Design Token Preview
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Real-Time
              </span>
            </div>

            {/* Preview Component 1: Brand Navigation Button */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500">Primary & Hover Buttons</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-5 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                  style={{
                    backgroundColor: form.primary_color,
                    borderRadius:
                      form.border_radius === "sharp"
                        ? "4px"
                        : form.border_radius === "pill"
                        ? "9999px"
                        : "14px",
                  }}
                >
                  Explore Catalog
                </button>
                <button
                  type="button"
                  className="px-4 py-2.5 text-xs font-bold border transition cursor-pointer"
                  style={{
                    color: form.primary_color,
                    borderColor: form.primary_color,
                    backgroundColor: form.primary_light || "#EEF4FF",
                    borderRadius:
                      form.border_radius === "sharp"
                        ? "4px"
                        : form.border_radius === "pill"
                        ? "9999px"
                        : "14px",
                  }}
                >
                  Secondary Action
                </button>
              </div>
            </div>

            {/* Preview Component 2: Book Card Mockup */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500">Card Surface & Accent Color</span>
              <div
                className="p-4 bg-slate-50 border border-slate-200 transition-all flex gap-3 items-center"
                style={{
                  borderRadius:
                    form.border_radius === "sharp"
                      ? "6px"
                      : form.border_radius === "pill"
                      ? "20px"
                      : "16px",
                }}
              >
                <div
                  className="w-14 h-20 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: form.secondary_color }}
                >
                  <BookOpenIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mb-1"
                    style={{
                      backgroundColor: `${form.accent_color}20`,
                      color: form.accent_color,
                    }}
                  >
                    Featured Title
                  </span>
                  <h4
                    className="text-sm font-bold truncate"
                    style={{ color: form.primary_color }}
                  >
                    Sahih al-Bukhari Research
                  </h4>
                  <p className="text-xs text-slate-500 truncate">Imam Muhammad al-Bukhari</p>
                </div>
              </div>
            </div>

            {/* Preview Component 3: Multilingual Typography */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500">Live Typography Render</span>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="text-xs text-slate-700 font-sans">
                  <strong>English:</strong> Welcome to Kokan Islamic Digital Library.
                </p>
                <p
                  className="text-sm text-slate-800 text-end"
                  style={{
                    fontFamily: form.urdu_font,
                    lineHeight: 2.1,
                  }}
                >
                  کوکن اسلامک لائبریری میں خوش آمدید — مکمل تحقیق
                </p>
                <p
                  className="text-sm text-slate-800 text-end"
                  style={{
                    fontFamily: form.arabic_font,
                    lineHeight: 1.85,
                  }}
                >
                  مرحبا بكم في المكتبة الإسلامية الرقمية
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminThemeCustomizer;
