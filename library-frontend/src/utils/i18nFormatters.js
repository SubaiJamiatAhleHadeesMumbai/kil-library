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
