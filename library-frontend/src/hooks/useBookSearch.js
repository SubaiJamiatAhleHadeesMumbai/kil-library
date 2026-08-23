// src/hooks/useBookSearch.js
import { useEffect, useMemo, useState } from "react";

/** ✅ Strong Normalizer (Urdu/Arabic + spaces safe) */
const normalize = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " "); // multiple spaces -> single space
};

const slugify = (value) => {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
};

/** ✅ Safe text extractor (string/object both) */
const getText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    // common patterns: {name}, {title}
    return value.name || value.title || "";
  }
  return "";
};

/** ✅ Language extractor (string/object both) */
const getLanguageName = (book) => {
  // backend may send: book.language = "urdu"
  // or: book.language = { name: "Urdu" }
  return normalize(getText(book?.language));
};

/** ✅ Category extractor (supports subcategories + category) */
const getCategoryNames = (book) => {
  const list = [];

  // 1) subcategories array
  if (Array.isArray(book?.subcategories) && book.subcategories.length > 0) {
    book.subcategories.forEach((sub) => {
      const n = normalize(getText(sub));
      if (n) list.push(n);
      if (sub.category) {
        const cn = normalize(getText(sub.category));
        if (cn) list.push(cn);
      }
    });
  }

  // 2) category direct (string/object)
  const cat = normalize(getText(book?.category));
  if (cat) list.push(cat);

  // 3) common alternate property names
  const altCat = normalize(getText(book?.category_name || book?.categoryTitle || book?.category_title));
  if (altCat) list.push(altCat);

  // If no category found, mark as "general"
  if (list.length === 0) {
    list.push("general");
  }

  return list;
};

export const useBookSearch = (initialBooks = []) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  /** ✅ Debounce: UI smooth */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filteredBooks = useMemo(() => {
    const books = Array.isArray(initialBooks) ? initialBooks : [];

    const term = normalize(debouncedTerm);
    const langFilter = normalize(selectedLanguage);
    const catFilter = normalize(selectedCategory);

    return books.filter((book) => {
      /** ✅ 1) Language filter */
      const bookLang = getLanguageName(book);
      const matchesLanguage =
        langFilter === "all" || bookLang === langFilter || (langFilter === "urdu" && (!bookLang || bookLang === "urdu"));

      /** ✅ 2) Category filter */
      const bookCats = getCategoryNames(book);
      const normalizedBookCats = bookCats.map(slugify).filter(Boolean);
      const normalizedCatFilter = slugify(catFilter);
      const matchesCategory =
        catFilter === "all" ||
        normalizedCatFilter === "all" ||
        (normalizedCatFilter === "general" && (normalizedBookCats.length === 0 || normalizedBookCats.includes("general"))) ||
        normalizedBookCats.some(
          (cat) => cat === normalizedCatFilter || cat.includes(normalizedCatFilter) || normalizedCatFilter.includes(cat)
        );

      /** ✅ 3) Search (title + author + publisher + isbn + description) */
      if (!term) {
        return matchesLanguage && matchesCategory;
      }

      const title = normalize(book?.title);
      const author = normalize(getText(book?.author));
      const publisher = normalize(book?.publisher);
      const isbn = normalize(book?.isbn);
      const description = normalize(book?.description);

      const matchesSearch =
        title.includes(term) ||
        author.includes(term) ||
        publisher.includes(term) || // ✅ FIX: publisher search
        isbn.includes(term) ||
        description.includes(term);

      return matchesLanguage && matchesCategory && matchesSearch;
    });

    return deduplicateBooks(filtered);
  }, [initialBooks, debouncedTerm, selectedLanguage, selectedCategory]);

  return {
    searchTerm,
    setSearchTerm,
    selectedLanguage,
    setSelectedLanguage,
    selectedCategory,
    setSelectedCategory,
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
  return Array.from(seen.values()).map(item => item.book);
};
