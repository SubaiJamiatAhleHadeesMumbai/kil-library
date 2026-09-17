// src/utils/i18nFormatters.js

/**
 * Formats a given date using Intl.DateTimeFormat based on active locale.
 * @param {Date|string|number} date 
 * @param {string} locale - 'en' | 'ur' | 'ar'
 * @param {Object} options - Intl.DateTimeFormatOptions
 * @returns {string} Formatted localized date string
 */
export const formatLocalizedDate = (date, locale = 'en', options = {}) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    };

    const targetLocale = locale === 'ur' ? 'ur-PK' : locale === 'ar' ? 'ar-SA' : 'en-US';
    return new Intl.DateTimeFormat(targetLocale, defaultOptions).format(d);
  } catch (err) {
    console.warn('formatLocalizedDate error:', err);
    return String(date);
  }
};

/**
 * Formats a given number using Intl.NumberFormat based on active locale.
 * @param {number} num 
 * @param {string} locale - 'en' | 'ur' | 'ar'
 * @param {Object} options - Intl.NumberFormatOptions
 * @returns {string} Formatted localized number string
 */
export const formatLocalizedNumber = (num, locale = 'en', options = {}) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0';
  try {
    const targetLocale = locale === 'ur' ? 'ur-PK' : locale === 'ar' ? 'ar-SA' : 'en-US';
    return new Intl.NumberFormat(targetLocale, options).format(Number(num));
  } catch (err) {
    console.warn('formatLocalizedNumber error:', err);
    return String(num);
  }
};

/**
 * Strips HTML tags, entities, and AI artifacts from rich text strings.
 * @param {string} htmlOrText
 * @param {number} maxLength
 * @returns {string} Clean plain text excerpt
 */
export const cleanExcerpt = (htmlOrText, maxLength = 160) => {
  if (!htmlOrText) return '';
  let text = String(htmlOrText)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/ChatGPT said:?/gi, '')
    .replace(/ChatGPT:?/gi, '')
    .replace(/AI Generated:?/gi, '');
  text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
  if (maxLength && text.length > maxLength) {
    return text.slice(0, maxLength).trim() + '...';
  }
  return text;
};

/**
 * Extracts pure single-language category name from mixed strings like "Ibadat (عبادات)".
 * @param {string|object} cat
 * @param {string} lang - 'en' | 'ur' | 'ar'
 * @returns {string} Pure localized category name
 */
export const formatCategoryName = (cat, lang = 'ur') => {
  if (!cat) return '';
  const name = typeof cat === 'object' ? (cat.name || '') : String(cat);
  const match = name.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    const part1 = match[1].trim();
    const part2 = match[2].trim();
    const isPart1RTL = /[\u0600-\u06FF]/.test(part1);
    const isPart2RTL = /[\u0600-\u06FF]/.test(part2);
    if (lang === 'ur' || lang === 'ar') {
      return isPart2RTL ? part2 : (isPart1RTL ? part1 : part2);
    } else {
      return !isPart1RTL ? part1 : (!isPart2RTL ? part2 : part1);
    }
  }
  return name;
};

