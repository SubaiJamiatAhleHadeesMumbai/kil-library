import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import restrictedBookService from "../api/restrictedBookService";
import { useLanguage } from "../context/LanguageContext";
import { HistorySkeleton } from "../components/common/loaders/SkeletonPageLoader";
import {
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

// --- TRILINGUAL DICTIONARY (Zero mix-up: pure English, pure Urdu, pure Arabic) ---
const I18N = {
  en: {
    title: "My Request History",
    subtitle: "Track the review status of your restricted book access requests.",
    refresh: "Refresh",
    searchPlaceholder: "Search by book title, ID, or reason...",
    all: "All",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    requests: "Requests",
    emptyTitle: "No Requests Found",
    emptySubtitle:
      "You have not submitted any access requests yet, or no records match your filter.",
    browseLibrary: "Browse Library",
    requestDate: "Request Date",
    bookId: "Book ID",
    reason: "Reason",
    rejectionReason: "Rejection Reason",
    readNow: "Read Now",
    waitingApproval: "Awaiting admin approval...",
    accessDenied: "Access denied",
    expired: "Expired",
    reapply: "Re-apply",
    daysLeft: "days left",
    lifetimeAccess: "Lifetime Access",
    validUntil: "Valid until",
    accessExpired: "Access Expired",
  },
  ur: {
    title: "میری درخواستوں کا ریکارڈ",
    subtitle: "مخصوص کتب کے مطالعہ کی درخواستوں کی کیفیت یہاں ملاحظہ فرمائیں۔",
    refresh: "تازہ کریں",
    searchPlaceholder: "کتاب کے نام، وجہ یا کتاب نمبر سے تلاش کریں...",
    all: "تمام",
    pending: "زیرِ التواء",
    approved: "منظور شدہ",
    rejected: "مسترد",
    requests: "درخواستیں",
    emptyTitle: "کوئی درخواست نہیں ملی",
    emptySubtitle:
      "آپ نے ابھی تک کوئی درخواست جمع نہیں کروائی یا منتخب کردہ فلٹر کے مطابق کوئی ریکارڈ موجود نہیں۔",
    browseLibrary: "کتب خانہ دیکھیں",
    requestDate: "تاریخِ درخواست",
    bookId: "کتاب نمبر",
    reason: "وجہ",
    rejectionReason: "مسترد کرنے کی وجہ",
    readNow: "مطالعہ کریں",
    waitingApproval: "انتظامیہ کی منظوری کا انتظار ہے...",
    accessDenied: "درخواست نامنظور",
    expired: "میعاد ختم",
    reapply: "دوبارہ درخواست دیں",
    daysLeft: "دن باقی",
    lifetimeAccess: "مستقل رسائی",
    validUntil: "تک دستیاب",
    accessExpired: "رسائی کی میعاد ختم ہوگئی",
  },
  ar: {
    title: "سجل طلبات الوصول",
    subtitle: "تابع حالة طلباتك للوصول إلى الكتب المقيدة هنا.",
    refresh: "تحديث",
    searchPlaceholder: "البحث باسم الكتاب، السبب، أو الرقم...",
    all: "الكل",
    pending: "قيد الانتظار",
    approved: "مقبول",
    rejected: "مرفوض",
    requests: "طلبات",
    emptyTitle: "لم يتم العثور على طلبات",
    emptySubtitle: "لم تقم بتقديم أي طلب بعد، أو لا توجد نتائج مطابقة لمعايير البحث.",
    browseLibrary: "تصفح المكتبة",
    requestDate: "تاريخ الطلب",
    bookId: "رقم الكتاب",
    reason: "السبب",
    rejectionReason: "سبب الرفض",
    readNow: "اقرأ الآن",
    waitingApproval: "في انتظار موافقة الإدارة...",
    accessDenied: "تم رفض الطلب",
    expired: "منتهي الصلاحية",
    reapply: "إعادة طلب الإذن",
    daysLeft: "أيام متبقية",
    lifetimeAccess: "وصول دائم",
    validUntil: "صالح حتى",
    accessExpired: "انتهت فترة الصلاحية",
  },
};

const History = () => {
  const { currentLang = "en", isRTL = false, fontClass = "font-sans" } = useLanguage();
  const langKey = ["en", "ur", "ar"].includes(currentLang) ? currentLang : "en";
  const t = I18N[langKey];

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // UX states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | approved | pending | rejected
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await restrictedBookService.getMyRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("History fetch error:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await restrictedBookService.getMyRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("History refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const safeDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    const locale = langKey === "ur" ? "ur-PK" : langKey === "ar" ? "ar-SA" : "en-IN";
    return d.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getCoverUrl = (cover) => {
    if (!cover) return null;
    if (typeof cover === "string" && (cover.startsWith("http://") || cover.startsWith("https://"))) {
      return cover;
    }
    const cleanPath = String(cover).startsWith("/") ? cover : `/${cover}`;
    return `${API_BASE_URL}${cleanPath}`;
  };

  // Status Counts for Pills
  const counts = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => (r?.status || "pending").toLowerCase() === "pending").length;
    const approved = requests.filter((r) => (r?.status || "").toLowerCase() === "approved").length;
    const rejected = requests.filter((r) => (r?.status || "").toLowerCase() === "rejected").length;
    return { total, pending, approved, rejected };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests
      .filter((req) => {
        // Status filter
        const status = (req?.status || "pending").toLowerCase();
        if (statusFilter !== "all" && status !== statusFilter) return false;

        // Search filter
        if (!term) return true;

        const title = String(req?.book_title || "").toLowerCase();
        const reason = String(req?.reason || "").toLowerCase();
        const rejection = String(req?.rejection_reason || "").toLowerCase();
        const bookId = String(req?.book_id || "");

        return (
          title.includes(term) ||
          reason.includes(term) ||
          rejection.includes(term) ||
          bookId.includes(term)
        );
      })
      .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
  }, [requests, search, statusFilter]);

  // Loading skeleton matching the actual UI layout
  if (loading) {
    return <HistorySkeleton />;
  }

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`min-h-[75vh] bg-slate-50/60 pb-16 ${fontClass}`}
    >
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 leading-relaxed">
                {t.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 transition shadow-2xs disabled:opacity-60 shrink-0 self-start sm:self-auto"
            title={t.refresh}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>{t.refresh}</span>
          </button>
        </div>

        {/* --- CONTROLS: SEARCH & STATUS PILLS --- */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          
          {/* Search Input */}
          <div className="relative">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${
                isRTL ? "right-3.5" : "left-3.5"
              }`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs sm:text-sm font-medium text-slate-800 transition ${
                isRTL ? "pr-10 pl-9" : "pl-10 pr-9"
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 ${
                  isRTL ? "left-2.5" : "right-2.5"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: "all", label: t.all, count: counts.total },
              { key: "pending", label: `⏳ ${t.pending}`, count: counts.pending },
              { key: "approved", label: `✅ ${t.approved}`, count: counts.approved },
              { key: "rejected", label: `❌ ${t.rejected}`, count: counts.rejected },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- CONTENT LIST OR EMPTY STATE --- */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <BookOpen className="w-8 h-8 stroke-[1.8]" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                {t.emptyTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                {t.emptySubtitle}
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/books"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition active:scale-95"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t.browseLibrary}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredRequests.map((req) => {
              const status = (req?.status || "pending").toLowerCase();
              const coverUrl = getCoverUrl(req?.book_cover);
              const title = req?.book_title || "Untitled Book";
              const createdAt = safeDate(req?.created_at);

              return (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Cover & Details */}
                  <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-14 h-20 sm:w-16 sm:h-22 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80 shadow-2xs flex items-center justify-center">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <BookOpen className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <h3
                        className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1 hover:text-emerald-700 transition"
                        title={title}
                      >
                        {title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-500 font-medium">
                        <span>
                          {t.requestDate}: <strong className="text-slate-700 font-bold">{createdAt}</strong>
                        </span>
                        {req?.book_id && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-slate-600">
                              {t.bookId}: #{req.book_id}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Request reason */}
                      {req?.reason && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 italic bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 inline-block max-w-full">
                          <span className="font-semibold text-slate-600">{t.reason}:</span> {req.reason}
                        </p>
                      )}

                      {/* Rejection reason callout */}
                      {status === "rejected" && req?.rejection_reason && (
                        <div className="text-xs text-rose-700 bg-rose-50/90 p-2.5 rounded-xl flex items-start gap-2 border border-rose-200/80 mt-1">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                          <div className="leading-snug">
                            <span className="font-bold">{t.rejectionReason}: </span>
                            <span>{req.rejection_reason}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Badge & CTA */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    {/* Status Badge */}
                    {status === "approved" ? (
                      req.is_expired ? (
                        <div className="flex flex-col items-center sm:items-end gap-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                            <span>{t.expired}</span>
                          </span>
                          {req.expires_at && (
                            <span className="text-[10px] font-semibold text-slate-500">
                              {t.validUntil}: {safeDate(req.expires_at)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center sm:items-end gap-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t.approved}</span>
                          </span>
                          {req.expires_at ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              ⏳ {req.days_remaining !== null && req.days_remaining !== undefined ? `${req.days_remaining} ${t.daysLeft}` : `${t.validUntil} ${safeDate(req.expires_at)}`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              ♾️ {t.lifetimeAccess}
                            </span>
                          )}
                        </div>
                      )
                    ) : status === "rejected" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>{t.rejected}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{t.pending}</span>
                      </span>
                    )}

                    {/* Action button */}
                    {status === "approved" ? (
                      req.is_expired ? (
                        <Link
                          to={`/books/${req.book_id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-black bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl transition shadow-xs active:scale-95 whitespace-nowrap"
                        >
                          <span>{t.reapply}</span>
                          <ArrowIcon className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          to={`/read/${req.book_id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-black bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl transition shadow-xs active:scale-95 whitespace-nowrap"
                        >
                          <span>{t.readNow}</span>
                          <ArrowIcon className="w-3.5 h-3.5" />
                        </Link>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {status === "pending" ? t.waitingApproval : t.accessDenied}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;

