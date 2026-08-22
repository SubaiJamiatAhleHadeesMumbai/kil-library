// src/utils/excelParser.js
import * as XLSX from 'xlsx';

/**
 * Normalized header dictionary mapping various English, Urdu, Arabic & Hindi header variations
 * to internal Book schema field names.
 */
const HEADER_SYNONYMS = {
  serial_number: [
    'نمبر شمار', 'نمبرشمار', 'شمار نمبر', 'اندراج نمبر', 'سیریل نمبر', 'اندراج', 'شمار', 'شمارہ',
    'serial no.', 'serial no', 'serial_no', 'serial_number', 'sr_no', 'sr no', 'sr.', 'sr', 'sno', 's_no', 'serial'
  ],
  book_number: [
    'کتاب نمبر', 'کتاب_نمبر', 'داخلہ نمبر', 'رجسٹر نمبر',
    'book no.', 'book no', 'book_no', 'book_number', 'acc_no', 'accession_no', 'acc no'
  ],
  title: [
    'اسمائے کتب', 'اسمائے_کتب', 'اسماء کتب', 'اسماء_کتب', 'عنوان', 'نام', 'نام کتاب', 'کتاب کا نام', 'کتاب', 'عنوان کتاب',
    'book title', 'title', 'book_title', 'book_name', 'book name', 'name', 'kitab'
  ],
  language: [
    'زبان', 'بھاشا',
    'language', 'lang', 'zaban'
  ],
  quantity: [
    'تعداد', 'تعداد کتب', 'تعداد جلدیں',
    'quantity', 'qty', 'copies', 'total_copies', 'count'
  ],
  parts_or_volumes: [
    'حصے', 'حصص', 'جلد', 'جلدیں', 'جلد نمبر', 'حصہ نمبر', 'جلد_حصہ', 'حصہ',
    'volume', 'vol', 'volumes', 'parts', 'parts_or_volumes', 'part', 'vols'
  ],
  page_count: [
    'صفحات', 'صفحہ', 'تعداد صفحات', 'صفحات کی تعداد', 'کل صفحات',
    'page', 'pages', 'page_count', 'total_pages', 'page count', 'num_pages', 'pp'
  ],
  subject_number: [
    'فن نمبر', 'فن_نمبر', 'موضوع نمبر', 'مضمون نمبر',
    'category no.', 'category no', 'category_no', 'category number', 'subject_no', 'subject_number', 'topic_no', 'class_no', 'call_no'
  ],
  author: [
    'مؤلف / مرتب', 'مؤلف', 'مرتب', 'مولف / مرتب', 'مولف', 'مصنف', 'مصنف کا نام', 'تالیف', 'مصنفین', 'لیکھک',
    'compilation', 'author', 'writer', 'author_name', 'author name', 'written_by', 'compiler'
  ],
  translator: [
    'مترجم / جمع', 'مترجم', 'جمع', 'ترجمہ', 'مترجم کا نام', 'ترجمہ نگار', 'انوداک',
    'translation', 'translator', 'translated_by', 'translator_name'
  ],
  publisher: [
    'ناشر / مطبع', 'ناشر', 'مطبع', 'شعبہ نشر و اشاعت', 'شعبہ نشرو اشاعت', 'ادارہ', 'مکتبہ', 'پبلشر', 'پرکاشک',
    'publisher', 'press', 'publication', 'published_by', 'publisher_name'
  ],
  price: [
    'قیمت تخمینا', 'قیمت', 'تخمینا', 'نرخ', 'ہدیہ', 'مالیت',
    'price', 'cost', 'amount', 'rate', 'mrp', 'estimated price'
  ],
  remarks: [
    'کیفیات', 'کیفیت', 'نوٹ', 'تفصیلات', 'اضافی معلومات', 'ریمارکس', 'تبصرہ',
    'remarks', 'notes', 'comments', 'extra', 'status'
  ],
  publication_year: [
    'سن اشاعت', 'سال اشاعت', 'اشاعت کا سال', 'تاریخ اشاعت', 'سال', 'سن', 'اشاعت',
    'year', 'publication_year', 'pub_year', 'published_year', 'publishing_year', 'date', 'published_date'
  ],
  edition: [
    'ایڈیشن', 'طبع', 'طبعہ', 'نسخہ', 'اشاعت نمبر',
    'edition', 'version', 'issue', 'ed'
  ],
  isbn: [
    'آئی ایس بی این', 'شابک',
    'isbn', 'isbn_no', 'isbn_number', 'isbn10', 'isbn13'
  ],
  date_of_purchase: [
    'تاریخ خریداری', 'خریداری کی تاریخ', 'تاریخ خرید',
    'date_of_purchase', 'purchase_date', 'bought_date'
  ],
  category: [
    'زمرہ', 'کیٹیگری', 'شعبہ', 'قسم',
    'category', 'cat', 'genre', 'department'
  ],
  subcategory: [
    'ذیلی زمرہ', 'سب کیٹیگری', 'شاخ',
    'subcategory', 'sub_category', 'sub_cat'
  ],
  description: [
    'تفصیل', 'تعارف', 'خلاصہ', 'وضاحت', 'کتاب کا تعارف',
    'description', 'desc', 'summary', 'about', 'details', 'synopsis'
  ]
};

/**
 * Clean and normalize a string key for fuzzy comparison
 */
function normalizeKey(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.:/\\()]+/g, ' ')
    .trim();
}

/**
 * Find matched field name for a given column header
 */
function matchColumnHeader(header) {
  const norm = normalizeKey(header);
  if (!norm) return null;

  for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    for (const syn of synonyms) {
      const normSyn = normalizeKey(syn);
      if (norm === normSyn || norm.includes(normSyn) || normSyn.includes(norm)) {
        return field;
      }
    }
  }
  return null;
}

/**
 * Convert Excel date or text date into clean year string or standard date
 */
function cleanYear(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    if (val >= 1000 && val <= 2100) return String(val);
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y) return String(parsed.y);
    } catch {
      // fallback
    }
  }
  const str = String(val).trim();
  const match = str.match(/\b(19\d\d|20\d\d)\b/);
  if (match) return match[1];
  return str;
}

/**
 * Parse an Excel or CSV file buffer/arrayBuffer into standardized book objects
 * @param {ArrayBuffer|File} fileOrBuffer
 * @returns {Promise<{ books: Array, totalRows: number, headers: Array, matchedFields: Array, unmatchedHeaders: Array }>}
 */
export async function parseExcelFile(fileOrBuffer) {
  let arrayBuffer;
  if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No sheet found in the uploaded Excel file.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length < 2) {
    throw new Error("Excel file appears to be empty or has no data rows below headers.");
  }

  // Row 0 is the headers
  const rawHeaders = rawRows[0].map(h => String(h || '').trim());
  const headerFieldMap = {};
  const matchedFields = [];
  const unmatchedHeaders = [];

  rawHeaders.forEach((h, idx) => {
    if (!h) return;
    const matched = matchColumnHeader(h);
    if (matched) {
      headerFieldMap[idx] = matched;
      if (!matchedFields.includes(matched)) {
        matchedFields.push(matched);
      }
    } else {
      unmatchedHeaders.push(h);
    }
  });

  const parsedBooks = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
      continue; // skip blank rows
    }

    const rawData = {};
    const extraData = {}; // For unmatched or extra admin-only columns

    const bookObj = {
      _rowIndex: r,
      title: '',
      author: '',
      publisher: '',
      translator: '',
      page_count: '',
      publication_year: '',
      edition: '',
      isbn: '',
      serial_number: '',
      book_number: '',
      parts_or_volumes: '',
      subject_number: '',
      quantity: 1,
      price: '',
      date_of_purchase: '',
      description: '',
      remarks: '',
      language_name: '',
      category_name: '',
      subcategory_name: '',
      is_digital: true,
      is_restricted: false,
      extra_data: null,
      raw_data: null,
      raw_row: rawData
    };

    row.forEach((cellVal, colIdx) => {
      const rawHeaderName = rawHeaders[colIdx] || `Column_${colIdx + 1}`;
      const cleanVal = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
      rawData[rawHeaderName] = cleanVal;

      const fieldKey = headerFieldMap[colIdx];
      if (fieldKey) {
        if (fieldKey === 'publication_year') {
          bookObj[fieldKey] = cleanYear(cellVal);
        } else if (fieldKey === 'page_count' || fieldKey === 'price' || fieldKey === 'quantity') {
          const num = parseInt(String(cleanVal).replace(/[^0-9.]/g, ''), 10);
          bookObj[fieldKey] = isNaN(num) ? cleanVal : num;
        } else if (fieldKey === 'language') {
          bookObj.language_name = cleanVal;
        } else if (fieldKey === 'category') {
          bookObj.category_name = cleanVal;
        } else if (fieldKey === 'subcategory') {
          bookObj.subcategory_name = cleanVal;
        } else if (fieldKey === 'is_digital' || fieldKey === 'is_restricted') {
          const v = cleanVal.toLowerCase();
          bookObj[fieldKey] = v === 'yes' || v === 'true' || v === '1' || v === 'ہاں' || v === 'صحیح';
        } else {
          bookObj[fieldKey] = cleanVal;
        }
      } else if (cleanVal) {
        // Collect extra/unmatched columns for admin record
        extraData[rawHeaderName] = cleanVal;
      }
    });

    if (Object.keys(extraData).length > 0) {
      bookObj.extra_data = JSON.stringify(extraData);
    }
    bookObj.raw_data = JSON.stringify(rawData);

    // Only add row if it has at least a title, author, or some data
    if (bookObj.title || bookObj.author || Object.keys(rawData).length > 0) {
      parsedBooks.push(bookObj);
    }
  }

  return {
    books: parsedBooks,
    totalRows: parsedBooks.length,
    headers: rawHeaders,
    matchedFields,
    unmatchedHeaders
  };
}

/**
 * Generate a sample template workbook matching the user's exact specification
 */
export function generateSampleExcel() {
  const sampleData = [
    {
      "نمبر شمار (Serial No.)": "001",
      "کتاب نمبر (Book No.)": "BK-001",
      "اسمائے کتب (Book Title)": "شرح عقیدہ واسطیہ",
      "زبان (Language)": "اردو",
      "تعداد (Quantity)": 2,
      "حصے (Volume)": "1",
      "صفحات (Page)": 104,
      "فن نمبر (Category No.)": "FN-101",
      "مؤلف / مرتب (Compilation)": "فضیلۃ الشیخ ڈاکٹر سعید بن علی بن وہف القحطانی رحمہ اللہ",
      "مترجم / جمع (Translation)": "ابو عبد اللہ عنایت اللہ سنابلی مدنی",
      "ناشر / مطبع (Publisher)": "شعبہ نشر واشاعت صوبائی جمعیت اہل حدیث ممبئی",
      "قیمت تخمینا (Price)": 120,
      "کیفیات (Remarks)": "شعبہ نشر و اشاعت ممبئی"
    },
    {
      "نمبر شمار (Serial No.)": "002",
      "کتاب نمبر (Book No.)": "BK-002",
      "اسمائے کتب (Book Title)": "صحیح البخاری (مختصر)",
      "زبان (Language)": "اردو",
      "تعداد (Quantity)": 1,
      "حصے (Volume)": "1-3",
      "صفحات (Page)": 850,
      "فن نمبر (Category No.)": "FN-205",
      "مؤلف / مرتب (Compilation)": "امام محمد بن اسماعیل بخاری رحمہ اللہ",
      "مترجم / جمع (Translation)": "مولانا داؤد راز رحمہ اللہ",
      "ناشر / مطبع (Publisher)": "مکتبہ قدوسیہ",
      "قیمت تخمینا (Price)": 500,
      "کیفیات (Remarks)": "مکمل سیٹ"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  ws['!cols'] = [
    { wch: 15 }, // Serial No
    { wch: 15 }, // Book No
    { wch: 30 }, // Book Title
    { wch: 12 }, // Language
    { wch: 10 }, // Quantity
    { wch: 12 }, // Volume
    { wch: 10 }, // Pages
    { wch: 15 }, // Category No
    { wch: 35 }, // Compilation
    { wch: 25 }, // Translation
    { wch: 35 }, // Publisher
    { wch: 12 }, // Price
    { wch: 30 }  // Remarks
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Books Template");

  XLSX.writeFile(wb, "KIL_Library_Books_Template.xlsx");
}
