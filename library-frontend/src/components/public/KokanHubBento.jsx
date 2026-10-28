import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { bookService } from "../../api/bookService";
import galleryService from "../../api/galleryService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://127.0.0.1:8000");

const resolveImageUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const path = String(value);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

const resolveSafeText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const candidate =
      value.ur || value.ar || value.en || value.name || value.title || value.text;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    for (const key of Object.keys(value)) {
      if (typeof value[key] === "string" && value[key].trim()) {
        return value[key].trim();
      }
    }
    return fallback;
  }
  return fallback;
};

const SVG_NO_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420">
      <rect width="300" height="420" fill="#0F3D2E"/>
      <rect x="12" y="12" width="276" height="396" rx="8" fill="none" stroke="#C5A059" stroke-width="2"/>
      <circle cx="150" cy="160" r="45" fill="#0A2A20" stroke="#C5A059" stroke-width="1.5"/>
      <text x="150" y="168" font-family="'Amiri', serif" font-size="28" font-weight="bold" fill="#C5A059" text-anchor="middle">کتاب</text>
      <text x="150" y="260" font-family="'Noto Naskh Arabic', sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">مرکز اہل حدیث کوکن</text>
      <text x="150" y="285" font-family="sans-serif" font-size="10" font-weight="600" fill="#94A3B8" letter-spacing="1" text-anchor="middle">ISLAMIC LIBRARY</text>
    </svg>
  `);

const defaultBooks = [
  {
    id: 35869,
    title: "حدیث رسول کی عظمت امام شافعی کی نظر میں",
    author: "عبدالواحد انور یوسفی",
    cover_image_url:
      "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/e6326ed649fdb912_Screenshot__123.png",
  },
  {
    id: 35868,
    title: "دعوت فکر",
    author: "عبدالواحد انور یوسفی",
    cover_image_url:
      "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/5b6b1b71acc47afd_Screenshot__122.png",
  },
  {
    id: 35867,
    title: "ماہ رمضان کے مختصر احکام ومسائل",
    author: "عبدالواحد انور یوسفی",
    cover_image_url:
      "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/352ef32967c50b16_Screenshot__121.png",
  },
  {
    id: 35865,
    title: "عید الاضحی کے احکام اور فضائل",
    author: "رضاء اللہ عبدالکریم مدنی",
    cover_image_url:
      "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/covers/e79b1c5c69e5ffff_Screenshot__118.png",
  },
];

const defaultMoon = {
  id: "moon-1",
  title: "چاند کی تاریخ کا اعلان - 2026-09-20",
  image:
    "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/gallery/moon/3939f8ee3e6ea131_محرم_الحرام_1448.jpg",
};

const defaultJumah = {
  id: "jumah-1",
  title: "خطبہ جمعہ شیڈول - یکم جمعہ (4؍ ستمبر 2026)",
  image:
    "https://pub-65d224b0d4124762b53348a845b82a92.r2.dev/booknest/gallery/jumah/66f22eab85b166bb_13_january_2023.jpg",
};

const KokanHubBento = () => {
  const navigate = useNavigate();

  const [books, setBooks] = useState([]);
  const [moonItem, setMoonItem] = useState(null);
  const [jumahItem, setJumahItem] = useState(null);
  const [recentReads, setRecentReads] = useState([]);
  const [recentOffset, setRecentOffset] = useState(0);

  // Sync user's recently viewed/read books from localStorage
  useEffect(() => {
    const syncRecentReads = () => {
      try {
        const raw = localStorage.getItem("bookNest_recent_reads");
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          setRecentReads(parsed);
        }
      } catch {
        setRecentReads([]);
      }
    };

    syncRecentReads();
    window.addEventListener("kil_reading_updated", syncRecentReads);
    window.addEventListener("storage", syncRecentReads);
    return () => {
      window.removeEventListener("kil_reading_updated", syncRecentReads);
      window.removeEventListener("storage", syncRecentReads);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Fetch latest approved books
    bookService
      .getAllBooks({ limit: 12, approved_only: true, sort_order: "desc" })
      .then((data) => {
        const items = Array.isArray(data)
          ? data
          : data?.books || data?.items || [];
        const approved = items.filter((b) => b.is_approved !== false);
        if (mounted && approved.length > 0) {
          setBooks(approved);
        }
      })
      .catch(() => {});

    // 2. Fetch latest Moon & Jumah updates
    galleryService
      .getIslamicUpdates()
      .then((res) => {
        if (!mounted || !res) return;
        if (res.moon && res.moon.image_url) {
          setMoonItem({
            id: res.moon.id,
            title: resolveSafeText(
              res.moon.title,
              "چاند کی تاریخ کا اعلان"
            ),
            image: resolveImageUrl(res.moon.image_url),
          });
        }
        if (res.jumah && res.jumah.image_url) {
          setJumahItem({
            id: res.jumah.id,
            title: resolveSafeText(
              res.jumah.title,
              "خطبہ جمعہ شیڈول"
            ),
            image: resolveImageUrl(res.jumah.image_url),
          });
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const currentBookList = books.length > 0 ? books : defaultBooks;
  const activeMoon = moonItem || defaultMoon;
  const activeJumah = jumahItem || defaultJumah;

  // Build the user's viewed books list (from localStorage recentReads, enriched with library books, or fallback to library books)
  const viewedBooksList = useMemo(() => {
    const byId = new Map(currentBookList.map((b) => [String(b.id), b]));
    const fromHistory = [];

    if (Array.isArray(recentReads) && recentReads.length > 0) {
      for (const entry of recentReads) {
        const bId = entry?.book_id || entry?.bookId || entry?.id;
        if (!bId) continue;
        const matched = byId.get(String(bId));
        fromHistory.push({
          id: bId,
          title: resolveSafeText(
            entry.title || matched?.title,
            "مستند علمی کتاب"
          ),
          author: resolveSafeText(
            entry.author || matched?.author,
            "مرکز اہل حدیث کوکن"
          ),
          cover:
            entry.cover_image_url ||
            entry.cover ||
            matched?.cover_image_url ||
            matched?.cover_image ||
            "",
          page: Number(entry.last_page_read || entry.page || 1),
        });
      }
    }

    if (fromHistory.length >= 2) {
      return fromHistory;
    }

    // Supplement with library books so the scrolling card always has items to scroll
    const existingIds = new Set(fromHistory.map((item) => String(item.id)));
    const fallbackItems = currentBookList
      .filter((b) => !existingIds.has(String(b.id)))
      .slice(0, 6)
      .map((b) => ({
        id: b.id,
        title: resolveSafeText(b.title, "کتاب"),
        author: resolveSafeText(b.author, "عبدالواحد انور یوسفی"),
        cover: b.cover_image_url || b.cover_image || "",
        page: 1,
      }));

    return [...fromHistory, ...fallbackItems];
  }, [recentReads, currentBookList]);

  // Smooth auto-scroll for the user's viewed books
  useEffect(() => {
    if (viewedBooksList.length <= 2) return;
    const timer = setInterval(() => {
      setRecentOffset((prev) => (prev + 1) % viewedBooksList.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [viewedBooksList.length]);

  const visibleViewedBooks = useMemo(() => {
    if (viewedBooksList.length === 0) return [];
    const count = Math.min(2, viewedBooksList.length);
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(viewedBooksList[(recentOffset + i) % viewedBooksList.length]);
    }
    return items;
  }, [viewedBooksList, recentOffset]);

  const cardClass =
    "rounded-[20px] border-[1.5px] border-[#C8DDD2] bg-white shadow-[0_10px_25px_-5px_rgba(15,61,46,0.07),0_4px_10px_-2px_rgba(15,61,46,0.04)] overflow-hidden";
  const headerClass =
    "bg-gradient-to-r from-[#E6F2EC] to-[#F3F8F5] border-b-2 border-[#C5A059] text-[#0F3D2E]";
  const btnHoverGreen =
    "bg-white text-[#0F3D2E] border-[1.5px] border-[#0F3D2E]/25 hover:bg-[#165B43] hover:text-white hover:border-[#165B43] active:bg-[#165B43] active:text-white transition-all duration-200 cursor-pointer";

  return (
    <section className="w-full space-y-6" dir="rtl">
      {/* ================= 1. 3-COLUMN MARKAZ PORTAL ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* RIGHT 3 COLS: 1. حدیثِ مبارکہ | 2. رویت ہلال */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-5">
          {/* Card 1: حدیثِ مبارکہ */}
          <div className={`${cardClass} flex-1 flex flex-col justify-between`}>
            <div
              className={`${headerClass} px-4 py-2.5 flex items-center justify-between`}
            >
              <span
                className="text-sm font-extrabold text-[#0F3D2E]"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                ✨ حدیثِ مبارکہ
              </span>
              <span className="text-[10px] font-bold text-[#165B43] font-mono">
                صحیح البخاری: 5027
              </span>
            </div>
            <div className="p-4 flex flex-col items-center justify-between flex-1 text-center space-y-3">
              <div className="w-full rounded-xl bg-[#F3F8F5] border border-[#C8DDD2] p-3.5 space-y-2 flex-1 flex flex-col justify-center">
                <div
                  className="text-lg font-bold text-[#0F3D2E] leading-relaxed"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»
                </div>
                <div
                  className="text-xs font-bold text-slate-700 leading-relaxed"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  ”تم میں سے سب سے بہتر وہ شخص ہے جو قرآن سیکھے اور سکھائے۔“
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/books")}
                className={`${btnHoverGreen} w-full py-1.5 rounded-xl text-xs font-bold shadow-2xs`}
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                کتبِ احادیث کا مطالعہ کریں
              </button>
            </div>
          </div>

          {/* Card 2: رویت ہلال */}
          <div className={`${cardClass} flex-1 flex flex-col justify-between`}>
            <div
              className={`${headerClass} px-4 py-2.5 flex items-center justify-between`}
            >
              <span
                className="text-sm font-extrabold text-[#0F3D2E]"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                🌙 رویت ہلال
              </span>
              <span className="text-[10px] font-bold text-[#165B43]">
                ہجری تقویم
              </span>
            </div>
            <div className="p-4 flex flex-col items-center text-center space-y-2.5 flex-1 justify-between">
              <div
                onClick={() => navigate("/moon")}
                className="w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer"
              >
                <img
                  src={activeMoon.image}
                  alt={activeMoon.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultMoon.image;
                  }}
                />
              </div>
              <h4
                className="text-xs font-extrabold text-[#0F3D2E] line-clamp-1"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                {activeMoon.title}
              </h4>
              <button
                type="button"
                onClick={() => navigate("/moon")}
                className={`${btnHoverGreen} w-full py-1.5 rounded-xl text-xs font-bold shadow-2xs`}
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                سرکلر دیکھیں
              </button>
            </div>
          </div>
        </div>

        {/* CENTER 6 COLS: مرکز الدعوۃ الاسلامیۃ والخیریہ (سونس، کھیڈ - رتناگری) */}
        <div className="lg:col-span-6 flex flex-col">
          <div className={`${cardClass} h-full flex flex-col justify-between`}>
            <div
              className={`${headerClass} px-4 sm:px-5 py-3 flex items-center justify-between gap-2`}
            >
              <span
                className="text-sm sm:text-base font-extrabold text-[#0F3D2E]"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                🏛️ مرکز الدعوۃ الاسلامیۃ والخیریہ (سونس، کھیڈ - رتناگری)
              </span>
              <span className="text-xs bg-white text-[#0F3D2E] border border-[#165B43]/30 px-3 py-0.5 rounded-full font-extrabold shrink-0">
                تعارفِ مرکز
              </span>
            </div>

            <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between bg-gradient-to-b from-white to-[#F3F8F5]/50">
              <div className="space-y-3">
                <div className="text-center border-b border-[#C8DDD2] pb-3">
                  <p className="text-xs font-bold text-[#165B43]">
                    •─════﷽════─•
                  </p>
                  <p
                    className="text-xs text-slate-600 font-bold mt-1"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    شعبے • سرگرمیاں • کارکردگی • مستقبل کے عزائم
                  </p>
                </div>

                <div
                  className="space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify"
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  <h4 className="font-extrabold text-[#0F3D2E] text-sm">
                    ✺ کوکن کا محل وقوع اور پس منظر
                  </h4>
                  <p>
                    ہندوستان کے صوبہ مہاراشٹر کے جنوب مغرب میں ساحل سمندر پر
                    آباد پہاڑیوں کے دامن میں پھیلی ہوئی آبادی خطۂ کوکن کے نام سے
                    مشہور ہے۔ کوکن وہ تاریخی اور سعادت مند جگہ ہے جہاں سب سے
                    پہلے سرکاری طور سے عہدِ فاروقی میں مسلمانوں کا پہلا لشکر آیا
                    تھا، یعنی ۱۵ ہجری ہی میں اسلام کی خالص تعلیمات سے یہ خطہ بہرہ
                    ور ہو چکا تھا۔
                  </p>
                  <p>
                    ممبئی گوا شاہراہ پر کھیڈ (ضلع رتناگیری) سے صرف ۲۴ کلومیٹر کے
                    فاصلے پر ”سونس“ نامی گاؤں میں اسلام کی خالص تعلیمات کو فروغ
                    دینے کے لئے ”مرکز الدعوۃ الاسلامیۃ والخیرہ“ کوشاں ہے۔ کھیڈ
                    شہر میں ”بیت السلام کمپلیکس“ سے مرکز کی دعوتی، اصلاحی اور
                    تبلیغی سرگرمیاں پورے کوکن میں انجام دی جا رہی ہیں۔
                  </p>
                  <h4 className="font-extrabold text-[#0F3D2E] text-sm pt-1">
                    ✺ قیامِ مرکز کے محرکات
                  </h4>
                  <p>
                    اگست ۱۹۹۱ء میں ”ادارہ دعوتِ دین“ قائم کیا گیا، اور ۲۰۰۰ء میں
                    اسے مرکز الدعوۃ الاسلامیۃ والخیرہ کے نام سے رجسٹرڈ کرایا
                    گیا۔ آج کوکن میں دعوت و تبلیغ اور نشر واشاعت کے میدان میں یہ
                    ایک مشہور و متعارف نام ہے، فَلِلّٰهِ الْحَمْدُ۔
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#C8DDD2] flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/about")}
                  className={`${btnHoverGreen} px-5 py-2 rounded-xl text-xs font-extrabold shadow-2xs`}
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  مکمل تعارف اور شعبہ جات پڑھیں ←
                </button>
                <span className="text-xs text-slate-500 font-bold">
                  بیت السلام کمپلیکس، کھیڈ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* LEFT 3 COLS: 1. حالیہ مطالعہ (دیکھی گئی کتب - اسکرول) | 2. خطباتِ جمعہ */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-5">
          {/* Card 3: حالیہ مطالعہ (User's Viewed Books from Library in Scroll) */}
          <div className={`${cardClass} flex-1 flex flex-col justify-between`}>
            <div
              className={`${headerClass} px-4 py-2.5 flex items-center justify-between`}
            >
              <span
                className="text-sm font-extrabold text-[#0F3D2E]"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                📚 حالیہ مطالعہ (دیکھی گئی کتب)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setRecentOffset(
                      (prev) =>
                        (prev - 1 + viewedBooksList.length) %
                        Math.max(1, viewedBooksList.length)
                    )
                  }
                  className="text-[10px] bg-white text-[#165B43] border border-[#C5A059] px-1.5 py-0.5 rounded-full font-bold hover:bg-[#165B43] hover:text-white transition cursor-pointer"
                  title="اوپر اسکرول کریں"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRecentOffset(
                      (prev) =>
                        (prev + 1) % Math.max(1, viewedBooksList.length)
                    )
                  }
                  className="text-[10px] bg-white text-[#165B43] border border-[#C5A059] px-1.5 py-0.5 rounded-full font-bold hover:bg-[#165B43] hover:text-white transition cursor-pointer"
                  title="نیچے اسکرول کریں"
                >
                  ▼
                </button>
              </div>
            </div>

            <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
              <div className="space-y-2 max-h-[165px] overflow-y-auto pr-0.5">
                {visibleViewedBooks.map((item, idx) => {
                  const coverSrc = item.cover
                    ? resolveImageUrl(item.cover)
                    : SVG_NO_COVER;
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      onClick={() =>
                        navigate(
                          `/read/${item.id}${
                            item.page > 1 ? `?page=${item.page}` : ""
                          }`
                        )
                      }
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F3F8F5] hover:bg-[#E6F2EC] border border-[#C8DDD2] cursor-pointer transition"
                    >
                      <img
                        src={coverSrc}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded border border-[#C5A059] shrink-0 bg-white"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = SVG_NO_COVER;
                        }}
                      />
                      <div className="min-w-0 flex-1 text-right">
                        <h5
                          className="text-[11px] font-extrabold text-[#0F3D2E] truncate"
                          style={{
                            fontFamily: "'Noto Naskh Arabic', sans-serif",
                          }}
                        >
                          {item.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 truncate">
                          {item.author}
                        </p>
                        <span className="inline-block mt-0.5 text-[9.5px] font-bold text-[#165B43] bg-white px-2 py-0.2 rounded-full border border-[#C8DDD2]">
                          پڑھائی جاری رکھیں (صفحہ {item.page || 1})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  const first = visibleViewedBooks[0];
                  if (first?.id) {
                    navigate(
                      `/read/${first.id}${
                        first.page > 1 ? `?page=${first.page}` : ""
                      }`
                    );
                  } else {
                    navigate("/books");
                  }
                }}
                className={`${btnHoverGreen} w-full py-1.5 rounded-xl text-xs font-bold shadow-2xs`}
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                مطالعہ جاری رکھیں
              </button>
            </div>
          </div>

          {/* Card 4: خطباتِ جمعہ */}
          <div className={`${cardClass} flex-1 flex flex-col justify-between`}>
            <div
              className={`${headerClass} px-4 py-2.5 flex items-center justify-between`}
            >
              <span
                className="text-sm font-extrabold text-[#0F3D2E]"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                🕌 خطباتِ جمعہ
              </span>
              <span className="text-[10px] font-bold text-[#165B43]">
                ہفتہ وار
              </span>
            </div>
            <div className="p-4 flex flex-col items-center text-center space-y-2.5 flex-1 justify-between">
              <div
                onClick={() => navigate("/juma-list")}
                className="w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer"
              >
                <img
                  src={activeJumah.image}
                  alt={activeJumah.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultJumah.image;
                  }}
                />
              </div>
              <h4
                className="text-xs font-extrabold text-[#0F3D2E] line-clamp-1"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                {activeJumah.title}
              </h4>
              <button
                type="button"
                onClick={() => navigate("/juma-list")}
                className={`${btnHoverGreen} w-full py-1.5 rounded-xl text-xs font-bold shadow-2xs`}
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                مکمل شیڈول
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. جدید کتب — 4-CARD FORMAT RIGHT ABOVE AKHBARI CLIPPINGS ================= */}
      <div className={cardClass}>
        <div
          className={`${headerClass} px-4 sm:px-5 py-3 flex items-center justify-between`}
        >
          <span
            className="text-sm sm:text-base font-extrabold text-[#0F3D2E]"
            style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
          >
            📖 جدید کتب
          </span>
          <button
            type="button"
            onClick={() => navigate("/books")}
            className={`${btnHoverGreen} px-3.5 py-1 rounded-full text-xs font-bold`}
            style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
          >
            تمام کتب دیکھیں ←
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentBookList.slice(0, 4).map((book, idx) => {
            const coverUrl =
              book.cover_image_url || book.cover_image
                ? resolveImageUrl(book.cover_image_url || book.cover_image)
                : SVG_NO_COVER;
            const title = resolveSafeText(book.title, "مستند علمی کتاب");
            const author = resolveSafeText(book.author, "مرکز اہل حدیث کوکن");

            return (
              <div
                key={book.id || idx}
                onClick={() => navigate(`/read/${book.id}`)}
                className="rounded-xl overflow-hidden border border-[#C8DDD2] bg-[#FAF8F5] hover:bg-white p-3.5 flex flex-col items-center text-center justify-between space-y-2.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <img
                  src={coverUrl}
                  alt={title}
                  className="w-28 h-40 object-cover rounded-lg shadow-md border border-[#C5A059] bg-white"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = SVG_NO_COVER;
                  }}
                />
                <div className="w-full">
                  <h5
                    className="text-xs font-extrabold text-[#0F3D2E] line-clamp-1"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                    title={title}
                  >
                    {title}
                  </h5>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                    {author}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/read/${book.id}`);
                  }}
                  className={`${btnHoverGreen} w-full py-1.5 rounded-xl text-xs font-bold`}
                  style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                >
                  مطالعہ کریں
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default KokanHubBento;
