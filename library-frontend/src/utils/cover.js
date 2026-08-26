// src/utils/cover.js

// 1. Fallback Image (Pure SVG Data URI - 100% offline & zero network errors)
export const FALLBACK_COVER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'><rect width='300' height='450' fill='%231e293b'/><circle cx='150' cy='200' r='36' fill='%23334155'/><path d='M135 190h30v20h-30z' fill='%2394a3b8'/><text x='150' y='270' font-family='sans-serif' font-size='16' font-weight='bold' fill='%23cbd5e1' text-anchor='middle'>Markaz Library</text><text x='150' y='295' font-family='sans-serif' font-size='12' fill='%2364748b' text-anchor='middle'>No Cover</text></svg>";

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