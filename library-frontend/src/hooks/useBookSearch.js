// src/hooks/useBookSearch.js
import { useEffect, useMemo, useState } from "react";

/** ✅ Strong Unicode Normalizer (Urdu / Arabic / English / Hindi safe) */
export const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    value = value.name || value.title || value.category_name || "";
  }
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/[ة]/g, "ه")
    .replace(/[يى]/g, "ی")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove arabic diacritics / tashkeel
    .replace(/\s+/g, " ");
};

/** ✅ Safe text extractor (string/object both) */
export const getText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.name || value.title || value.category_name || "";
  }
  return String(value);
};

/** ✅ Language extractor */
const getLanguageName = (book) => {
  return normalizeText(getText(book?.language));
};

export const useBookSearch = (initialBooks = []) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  /** ✅ Debounce: UI smooth */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 250);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredBooks = useMemo(() => {
    const books = Array.isArray(initialBooks) ? initialBooks : [];

    const term = normalizeText(debouncedTerm);
    const langFilter = normalizeText(selectedLanguage);
    const catFilter = selectedCategory ? String(selectedCategory).trim() : "all";
    const subcatFilter = selectedSubcategory ? String(selectedSubcategory).trim() : "all";

    return books.filter((book) => {
      /** ✅ 1) Language filter */
      if (langFilter !== "all") {
        const bookLang = getLanguageName(book);
        const matchesLanguage =
          bookLang === langFilter ||
          (langFilter === "urdu" && (!bookLang || bookLang === "urdu" || bookLang === "اردو")) ||
          (langFilter === "arabic" && (bookLang === "arabic" || bookLang === "عربی" || bookLang === "العربية")) ||
          (langFilter === "english" && (bookLang === "english" || bookLang === "en" || bookLang === "انگریزی"));
        if (!matchesLanguage) return false;
      }

      /** ✅ 2) Category filter */
      if (catFilter !== "all" && catFilter !== "") {
        if (catFilter === "our_publications") {
          // Handled externally or via publisher check
          const rawPub = getText(book?.publisher);
          const pubNorm = normalizeText(rawPub);
          const pubLatin = String(rawPub).toLowerCase().replace(/[^a-z0-9]/g, "");
          const isMarkazPub = [
            "مركز الدعوة", "مركز الدعوة الاسلامية والخيرية", "مرکز الدعوة", "مرکز الدعوۃ",
            "markazdawah", "markazuddawah", "markazdawahislamic"
          ].some(kw => pubNorm.includes(normalizeText(kw)) || pubLatin.includes(kw));
          
          if (!isMarkazPub && !book?.is_our_publication && !book?.is_markaz_publication) {
            return false;
          }
        } else {
          // Check Category by ID or Name
          const bookCatId = book?.category_id || (typeof book?.category === 'object' ? book.category?.id : null);
          const bookCatName = normalizeText(getText(book?.category));
          const subcats = Array.isArray(book?.subcategories) ? book.subcategories : [];
          
          const isNumericCatFilter = /^\d+$/.test(catFilter);
          let matchesCat = false;

          if (isNumericCatFilter) {
            const numId = Number(catFilter);
            matchesCat = 
              bookCatId === numId || 
              subcats.some(sc => Number(sc.category_id) === numId || Number(sc.category?.id) === numId);
          } else {
            const normCatFilter = normalizeText(catFilter);
            matchesCat = 
              bookCatName === normCatFilter ||
              bookCatName.includes(normCatFilter) ||
              normCatFilter.includes(bookCatName) ||
              subcats.some(sc => {
                const scCatName = normalizeText(getText(sc.category));
                const scName = normalizeText(getText(sc));
                return scCatName.includes(normCatFilter) || scName.includes(normCatFilter);
              });
          }

          if (!matchesCat) return false;
        }
      }

      /** ✅ 3) Subcategory filter */
      if (subcatFilter !== "all" && subcatFilter !== "") {
        const subcats = Array.isArray(book?.subcategories) ? book.subcategories : [];
        const isNumericSubFilter = /^\d+$/.test(subcatFilter);
        let matchesSub = false;

        if (isNumericSubFilter) {
          const numSubId = Number(subcatFilter);
          matchesSub = subcats.some(sc => Number(sc.id) === numSubId);
        } else {
          const normSubFilter = normalizeText(subcatFilter);
          matchesSub = subcats.some(sc => {
            const scName = normalizeText(getText(sc));
            return scName === normSubFilter || scName.includes(normSubFilter);
          });
        }

        if (!matchesSub) return false;
      }

      /** ✅ 4) Search Term (Title + Author + Publisher + ISBN + Description) */
      if (term) {
        const title = normalizeText(book?.title);
        const author = normalizeText(getText(book?.author));
        const publisher = normalizeText(getText(book?.publisher));
        const isbn = normalizeText(book?.isbn);
        const description = normalizeText(book?.description);

        const matchesSearch =
          title.includes(term) ||
          author.includes(term) ||
          publisher.includes(term) ||
          isbn.includes(term) ||
          description.includes(term);

        if (!matchesSearch) return false;
      }

      return true;
    });

    return deduplicateBooks(filtered);
  }, [initialBooks, debouncedTerm, selectedLanguage, selectedCategory, selectedSubcategory]);

  return {
    searchTerm,
    setSearchTerm,
    selectedLanguage,
    setSelectedLanguage,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    filteredBooks,
  };
};

/** ✅ Normalizes Urdu, Arabic & English book titles */
export const normalizeUrduTitle = (title) => {
  if (!title) return "";
  let t = String(title).toLowerCase().trim();
  t = t.replace(/ي/g, 'ی').replace(/ى/g, 'ی').replace(/ك/g, 'ک').replace(/ه/g, 'ہ').replace(/ة/g, 'ہ');
  t = t.replace(/[أإآ]/g, 'ا');
  t = t.replace(/[؟\?،,۔\.\-_:؛;!/\\\|\(\)\[\]\{\}"'`~\*\^]/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
};

/** ✅ Deduplicates books for public users by keeping the richest version with cover/digital assets */
export const deduplicateBooks = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = new Map();
  for (const book of list) {
    const titleKey = normalizeUrduTitle(book?.title) || `book_${book?.id}`;
    const authorKey = normalizeUrduTitle(book?.author || book?.author_name);
    const key = authorKey ? `${titleKey}___${authorKey}` : titleKey;

    let score = 0;
    if (book?.pdf_url || book?.pdf_file || book?.txt_file_url || book?.txt_file || book?.is_digital) score += 100;
    if (book?.cover_image_url || book?.cover_image) score += 50;
    if (book?.description) score += 10;
    if (book?.page_count) score += 5;
    score += (Number(book?.id) || 0) * 0.0001;

    if (!seen.has(key) || score > seen.get(key).score) {
      seen.set(key, { score, book });
    }
  }
  const result = Array.from(seen.values()).map(item => item.book);
  return result.sort((a, b) => (Number(b?.id) || 0) - (Number(a?.id) || 0));
};
