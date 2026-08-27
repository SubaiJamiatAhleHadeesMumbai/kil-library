// src/utils/cover.js

// 1. Fallback Image (Pure SVG Data URI - Beautiful Coming Soon Book Cover)
export const FALLBACK_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b1120"/>
          <stop offset="50%" stop-color="#002147"/>
          <stop offset="100%" stop-color="#064e3b"/>
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
      </defs>
      <rect width="360" height="520" fill="url(#bg)"/>
      <rect x="16" y="16" width="328" height="488" rx="8" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 4"/>
      <rect x="22" y="22" width="316" height="476" rx="6" fill="none" stroke="#10b981" stroke-opacity="0.3" stroke-width="1"/>
      <circle cx="180" cy="180" r="54" fill="#0f172a" stroke="#10b981" stroke-width="2" stroke-opacity="0.4"/>
      <path d="M160 162h40c2.2 0 4 1.8 4 4v32c0 2.2-1.8 4-4 4h-40c-2.2 0-4-1.8-4-4v-32c0-2.2 1.8-4 4-4zm4 8v24h32v-24h-32z" fill="#34d399"/>
      <path d="M168 178h16v4h-16zm0 8h24v4h-24z" fill="#6ee7b7"/>
      <text x="180" y="275" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="3" text-anchor="middle">MARKAZ ISLAMIC LIBRARY</text>
      <text x="180" y="320" font-family="'Traditional Arabic', 'Amiri', serif" font-size="28" font-weight="bold" fill="url(#gold)" text-anchor="middle">قَرِيبـاً</text>
      <text x="180" y="355" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#ffffff" letter-spacing="2" text-anchor="middle">COMING SOON</text>
      <rect x="120" y="375" width="120" height="22" rx="11" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-opacity="0.4"/>
      <text x="180" y="390" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399" letter-spacing="1" text-anchor="middle">COVER IN PROCESS</text>
    </svg>
  `);

// 2. Base URL (Safe check)
const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:8000")).replace(/\/$/, ""); // End ka slash hata diya taaki double slash na bane

/**
 * [INTERNAL HELPER]
 * Ye function path ko clean karta hai aur full URL banata hai.
 * Ise hum Image aur PDF dono ke liye use karenge.
 */
const buildUrl = (path) => {
  if (!path) return null;

  // Agar already full URL hai
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // Windows Path Fix (\ -> /)
  let cleanPath = path.replace(/\\/g, "/");

  // Leading Slash Fix (/uploads -> uploads)
  if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);

  // Remove unnecessary 'static/' prefix if present
  if (cleanPath.startsWith("static/uploads/")) {
    cleanPath = cleanPath.substring(7);
  }

  // Final URL Construction
  return API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`;
};

/**
 * [FOR IMAGES]
 * Ye function Book Cover ka URL deta hai.
 * Agar URL nahi milta to ye "Placeholder Image" return karta hai.
 */
export const getCoverUrl = (coverPath) => {
  const url = buildUrl(coverPath);
  return url || FALLBACK_COVER;
};

/**
 * [FOR BOOK OBJECT]
 * Book object se cover nikalne ke liye smart function.
 */
export const getBookCover = (book) => {
  if (!book) return FALLBACK_COVER;
  return getCoverUrl(book.cover_image_url || book.cover_image);
};

/**
 * [FOR PDFS] - ðŸ”¥ NEW ADDITION
 * Ye function PDF ka URL deta hai.
 * Agar PDF nahi hai to ye 'null' return karega (Image nahi).
 * Isse aap 'Read Now' button ko hide/disable kar sakte hain.
 */
export const getPdfUrl = (pdfPath) => {
  return buildUrl(pdfPath);
};