import React, { useState, useEffect } from "react";
import {
  User,
  Book,
  Send,
  Phone,
  Building2,
  GraduationCap,
  MapPin,
  Users,
  Hash,
  Check,
  X,
  Plus,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

// Fallback if PURPOSES file missing
import { PURPOSES as PURPOSES_FROM_FILE } from "./types";

const COUNTRY_CODES = [
  { code: "+91", name: "IN" },
  { code: "+92", name: "PK" },
  { code: "+1", name: "US" },
  { code: "+44", name: "UK" },
  { code: "+971", name: "AE" },
  { code: "+966", name: "SA" },
  { code: "+880", name: "BD" },
  { code: "+90", name: "TR" },
];

const API_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const PURPOSES_FALLBACK = [
  "Academic Research",
  "Refutation / Critical Study",
  "Teaching / Lecture Preparation",
  "Thesis / Dissertation",
  "Personal Study (Supervised)",
];

const PURPOSES = Array.isArray(PURPOSES_FROM_FILE) && PURPOSES_FROM_FILE.length > 0
  ? PURPOSES_FROM_FILE
  : PURPOSES_FALLBACK;

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    ""
  );
};

const AccessForm = ({ book, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    fullName: "",
    whatsapp: "",
    countryCode: "+91",
    whatsappNumber: "",
    qualification: "",
    institution: "",
    isSalafi: false,
    purpose: ["Academic Research"],
    previousWork: "",
    oathAccepted: false,

    // Optional Fields
    age: "",
    location: "",
    teachers: "",
  });

  // Auto-fill user data from profile
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        let phoneNum = parsed.phone || parsed.whatsapp || parsed.mobile || "";
        let cCode = "+91";
        if (phoneNum) {
          const match = String(phoneNum).match(/^(\+\d{1,3})(.*)$/);
          if (match) {
            cCode = match[1];
            phoneNum = match[2].trim();
          }
        }
        setFormData((prev) => ({
          ...prev,
          fullName: parsed.full_name || parsed.name || parsed.username || prev.fullName,
          whatsappNumber: phoneNum ? String(phoneNum).replace(/\D/g, "") : prev.whatsappNumber,
          countryCode: cCode || prev.countryCode,
          institution: parsed.institution || parsed.university || prev.institution,
          qualification: parsed.qualification || prev.qualification,
          location: parsed.location || parsed.city || prev.location,
        }));
      } catch (e) {
        console.error("User parse error", e);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePurposeChange = (purpose) => {
    setFormData((prev) => ({
      ...prev,
      purpose: prev.purpose.includes(purpose)
        ? prev.purpose.filter((p) => p !== purpose)
        : [...prev.purpose, purpose],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!book?.id) {
      toast.error("Book ID missing. Please try again.");
      return;
    }

    if (!formData.oathAccepted) {
      toast.error("Please accept the declaration before submitting.");
      return;
    }

    if (formData.purpose.length === 0) {
      toast.error("Please select at least one purpose.");
      return;
    }

    if (!formData.fullName.trim()) {
      toast.error("Full Name is required.");
      return;
    }

    if (!formData.whatsappNumber.trim()) {
      toast.error("WhatsApp number is required.");
      return;
    }


    setLoading(true);
    const loadingToast = toast.loading("Submitting request...");

    try {
      const token = getToken();
      if (!token) {
        toast.error("Session expired. Please login again.", { id: loadingToast });
        setLoading(false);
        return;
      }

      // Payload
      const payload = {
        book_id: book.id,
        name: formData.fullName.trim(),
        whatsapp: `${formData.countryCode}${formData.whatsappNumber}`,

        qualification: formData.qualification.trim(),
        institution: formData.institution.trim(),
        is_salafi: formData.isSalafi,
        purpose: formData.purpose,
        previous_work: formData.previousWork.trim(),

        // Optional
        age: formData.age?.trim() || "N/A",
        location: formData.location?.trim() || "N/A",
        teachers: formData.teachers?.trim() || "N/A",
      };

      const response = await axios.post(
        `${API_URL}/api/restricted-requests/submit`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        toast.success("Request submitted successfully!", { id: loadingToast });
        onSuccess?.();
      } else {
        toast.error("Unexpected response from server.", { id: loadingToast });
      }
    } catch (error) {
      console.error("Submission Error:", error);

      let message = "Something went wrong. Please try again.";

      if (error.response) {
        const data = error.response.data;

        if (typeof data === "string") {
          message = data;
        } else if (typeof data?.detail === "string") {
          message = data.detail;
        } else if (Array.isArray(data?.detail)) {
          message = data.detail.join(", ");
        } else if (typeof data?.message === "string") {
          message = data.message;
        }

        if (error.response.status === 401) {
          message = "Session expired. Please login again.";
        }
      } else {
        message = "Network error. Please check your internet connection.";
      }

      toast.error(message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col w-full max-w-2xl mx-auto transition-all"
    >
      {/* Header - Sleek & Compact */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 px-5 py-3 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Book className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <h2 className="text-base font-extrabold leading-tight">
              Restricted Access Request
            </h2>
            <p className="text-emerald-200 text-xs truncate max-w-sm">
              Request access for: <span className="text-white font-bold">{book?.title || "Book"}</span>
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Body - Single Compact Viewport without Scrolling */}
      <div className="p-4 md:p-5 space-y-3.5 bg-white text-slate-700">
        
        {/* Row 1: Full Name & WhatsApp (Auto-filled from profile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              required
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              type="text"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-1.5">
              <select
                name="countryCode"
                value={formData.countryCode}
                onChange={handleInputChange}
                className="px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none font-semibold text-slate-700 shrink-0"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.name})
                  </option>
                ))}
              </select>
              <input
                required
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({ ...prev, whatsappNumber: onlyDigits }));
                }}
                type="text"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none font-mono transition-all"
                placeholder="98765 43210"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Qualification & Institution */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              Qualification <span className="text-rose-500">*</span>
            </label>
            <input
              required
              name="qualification"
              value={formData.qualification}
              onChange={handleInputChange}
              type="text"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
              placeholder="e.g. Graduate, Scholar, Student"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Institution / University <span className="text-rose-500">*</span>
            </label>
            <input
              required
              name="institution"
              value={formData.institution}
              onChange={handleInputChange}
              type="text"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none transition-all"
              placeholder="Enter institution name"
            />
          </div>
        </div>

        {/* Row 3: Optional Fields (Compact 3 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1">
              <Hash className="w-3 h-3 text-slate-400" />
              Age <span className="text-slate-400 text-[10px]">(Optional)</span>
            </label>
            <input
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              type="text"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all"
              placeholder="e.g. 24"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              Location <span className="text-slate-400 text-[10px]">(Optional)</span>
            </label>
            <input
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              type="text"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all"
              placeholder="City, Country"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-1">
              <Users className="w-3 h-3 text-slate-400" />
              Teacher / Ref <span className="text-slate-400 text-[10px]">(Optional)</span>
            </label>
            <input
              name="teachers"
              value={formData.teachers}
              onChange={handleInputChange}
              type="text"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all"
              placeholder="Teacher name"
            />
          </div>
        </div>

        {/* Row 4: Purpose of Request (Clickable Interactive Pill Chips) */}
        <div>
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1.5">
            <span>Purpose of Request <span className="text-rose-500">*</span></span>
            <span className="text-[11px] font-normal text-slate-400">Click to select/unselect</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PURPOSES.map((p) => {
              const isSelected = formData.purpose.includes(p);
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => handlePurposeChange(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 select-none ${
                    isSelected
                      ? "bg-emerald-800 text-white border-emerald-800 shadow-sm font-semibold"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 5: Compact Declaration Alert Box with Inline Checkbox */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-2.5">
          <input
            type="checkbox"
            id="oathAccepted"
            name="oathAccepted"
            required
            checked={formData.oathAccepted}
            onChange={handleInputChange}
            className="mt-0.5 w-4 h-4 accent-emerald-700 rounded cursor-pointer shrink-0"
          />
          <label htmlFor="oathAccepted" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
            <span className="font-bold text-emerald-950">Declaration: </span>
            I confirm that I am requesting access for academic/supervised study only. I will not share this material with unauthorized individuals.
          </label>
        </div>
      </div>

      {/* Footer - Compact Action Buttons */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={!formData.oathAccepted || loading}
          className="bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-900/20 active:scale-[0.98]"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Submit Request
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default AccessForm;
