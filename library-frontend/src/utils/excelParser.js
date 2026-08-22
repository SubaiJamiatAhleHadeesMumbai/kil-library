// src/utils/excelParser.js
import * as XLSX from 'xlsx';

/**
 * Normalized header dictionary mapping various English, Urdu, Arabic & Hindi header variations
 * to internal Book schema field names.
 */
const HEADER_SYNONYMS = {
  title: [
    'title', 'book_title', 'book_name', 'name', 'book title', 'book name', 'kitab',
    'عنوان', 'نام', 'نام کتاب', 'کتاب کا نام', 'کتاب', 'عنوان کتاب', 'نام_کتاب', 'کتاب_نام', 'کتاب کا عنوان'
  ],
  author: [
    'author', 'writer', 'author_name', 'author name', 'written_by', 'writer_name',
    'مصنف', 'مولف', 'مؤلف', 'مصنف کا نام', 'تالیف', 'مصنفین', 'لیکھک', 'مصنف_نام'
  ],
  translator: [
    'translator', 'translated_by', 'translation', 'translator_name',
    'مترجم', 'ترجمہ', 'مترجم کا نام', 'ترجمہ نگار', 'انوداک', 'مترجم_نام'
  ],
  publisher: [
    'publisher', 'publication', 'published_by', 'publisher_name', 'press',
    'ناشر', 'شعبہ نشر و اشاعت', 'شعبہ نشرو اشاعت', 'شعبہ نشر واشاعت', 'ادارہ', 'مکتبہ', 'پبلشر', 'پرکاشک', 'ناشر_نام'
  ],
  page_count: [
    'pages', 'page_count', 'total_pages', 'page count', 'num_pages', 'page', 'pp',
    'صفحات', 'تعداد صفحات', 'صفحات کی تعداد', 'کل صفحات', 'صفحہ', 'صفحات_تعداد'
  ],
  publication_year: [
    'year', 'publication_year', 'pub_year', 'published_year', 'publishing_year', 'date', 'published_date',
    'سن اشاعت', 'سال اشاعت', 'اشاعت کا سال', 'تاریخ اشاعت', 'سال', 'سن', 'اشاعت'
  ],
  edition: [
    'edition', 'version', 'issue', 'ed',
    'ایڈیشن', 'طبع', 'طبعہ', 'نسخہ', 'اشاعت نمبر'
  ],
  isbn: [
    'isbn', 'isbn_no', 'isbn_number', 'isbn10', 'isbn13',
    'آئی ایس بی این', 'شابک', 'آئی_ایس_بی_این'
  ],
  serial_number: [
    'serial', 'serial_no', 'serial_number', 'sr_no', 'sr', 'sr no', 'sno', 's_no', 'serial no',
    'اندراج نمبر', 'شمار نمبر', 'سیریل نمبر', 'اندراج', 'شمار', 'شمارہ', 'اندراج_نمبر'
  ],
  book_number: [
    'book_no', 'book_number', 'acc_no', 'accession_no', 'book no', 'acc no',
    'کتاب نمبر', 'داخلہ نمبر', 'رجسٹر نمبر', 'کتاب_نمبر'
  ],
  parts_or_volumes: [
    'parts', 'volume', 'volumes', 'vol', 'parts_or_volumes', 'part', 'vols',
    'جلد', 'حصہ', 'جلدیں', 'حصص', 'جلد نمبر', 'حصہ نمبر', 'جلد_حصہ'
  ],
  subject_number: [
    'subject_no', 'subject_number', 'topic_no', 'class_no', 'call_no',
    'موضوع نمبر', 'مضمون نمبر', 'فن نمبر', 'موضوع_نمبر'
  ],
  price: [
    'price', 'cost', 'amount', 'rate', 'mrp',
    'قیمت', 'نرخ', 'ہدیہ', 'مالیت'
  ],
  date_of_purchase: [
    'date_of_purchase', 'purchase_date', 'bought_date',
    'تاریخ خریداری', 'خریداری کی تاریخ', 'تاریخ خرید'
  ],
  language: [
    'language', 'lang', 'zaban',
    'زبان', 'بھاشا'
  ],
  category: [
    'category', 'cat', 'genre', 'department',
    'زمرہ', 'کیٹیگری', 'شعبہ', 'قسم'
  ],
  subcategory: [
    'subcategory', 'sub_category', 'sub_cat',
    'ذیلی زمرہ', 'سب کیٹیگری', 'شاخ'
  ],
  description: [
    'description', 'desc', 'summary', 'about', 'details', 'synopsis',
    'تفصیل', 'تعارف', 'خلاصہ', 'تبصرہ', 'وضاحت', 'کتاب کا تعارف'
  ],
  remarks: [
    'remarks', 'notes', 'comments', 'extra',
    'نوٹ', 'تفصیلات', 'کیفیت', 'اضافی معلومات', 'ریمارکس'
  ],
  is_digital: [
    'is_digital', 'digital', 'ebook', 'e-book',
    'ڈیجیٹل', 'برقی'
  ],
  is_restricted: [
    'is_restricted', 'restricted', 'private',
    'مخصوص', 'محدود'
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
    // If it's 4 digits, it's a year
    if (val >= 1000 && val <= 2100) return String(val);
    // If it's an Excel date integer
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y) return String(parsed.y);
    } catch {
      // fallback
    }
  }
  const str = String(val).trim();
  // Extract 4-digit year if present (e.g. "2015", "1437H / 2015", "15-10-2015")
  const match = str.match(/\b(19\d\d|20\d\d)\b/);
  if (match) return match[1];
  return str;
}

/**
 * Parse an Excel or CSV file buffer/arrayBuffer into standardized book objects
 * @param {ArrayBuffer|File} fileOrBuffer
 * @returns {Promise<{ books: Array, totalRows: number, headers: Array, matchedFields: Array }>}
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

  rawHeaders.forEach((h, idx) => {
    if (!h) return;
    const matched = matchColumnHeader(h);
    if (matched) {
      headerFieldMap[idx] = matched;
      if (!matchedFields.includes(matched)) {
        matchedFields.push(matched);
      }
    }
  });

  const parsedBooks = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
      continue; // skip blank rows
    }

    const rawData = {};
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
      price: '',
      date_of_purchase: '',
      description: '',
      remarks: '',
      language_name: '',
      category_name: '',
      subcategory_name: '',
      is_digital: true,
      is_restricted: false,
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
        } else if (fieldKey === 'page_count' || fieldKey === 'price') {
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
      }
    });

    // Only add row if it has at least a title or author
    if (bookObj.title || bookObj.author || Object.keys(rawData).length > 0) {
      parsedBooks.push(bookObj);
    }
  }

  return {
    books: parsedBooks,
    totalRows: parsedBooks.length,
    headers: rawHeaders,
    matchedFields
  };
}

/**
 * Generate a sample template workbook with Urdu & English column headers and sample data
 */
export function generateSampleExcel() {
  const sampleData = [
    {
      "عنوان (Title)": "شرح عقیدہ واسطیہ",
      "مصنف (Author)": "فضیلۃ الشیخ ڈاکٹر سعید بن علی بن وہف القحطانی رحمہ اللہ",
      "مترجم (Translator)": "ابو عبد اللہ عنایت اللہ سنابلی مدنی",
      "ناشر (Publisher)": "شعبہ نشر واشاعت صوبائی جمعیت اہل حدیث ممبئی",
      "زبان (Language)": "Urdu",
      "صفحات (Pages)": 104,
      "سال اشاعت (Year)": 2015,
      "ایڈیشن (Edition)": "اول",
      "جلد / حصہ (Volume)": "1",
      "اندراج نمبر (Serial No)": "009",
      "کتاب نمبر (Book No)": "BK-009",
      "قیمت (Price)": 120,
      "تفصیل (Description)": "العقیدہ الواسطیہ کی ایک عام فہم اور جامع شرح۔",
      "نوٹ (Remarks)": "شعبہ نشر و اشاعت ممبئی"
    },
    {
      "عنوان (Title)": "صحیح البخاری (مختصر)",
      "مصنف (Author)": "امام محمد بن اسماعیل بخاری رحمہ اللہ",
      "مترجم (Translator)": "مولانا داؤد راز رحمہ اللہ",
      "ناشر (Publisher)": "مکتبہ قدوسیہ",
      "زبان (Language)": "Urdu",
      "صفحات (Pages)": 850,
      "سال اشاعت (Year)": 2020,
      "ایڈیشن (Edition)": "سوم",
      "جلد / حصہ (Volume)": "1-3",
      "اندراج نمبر (Serial No)": "010",
      "کتاب نمبر (Book No)": "BK-010",
      "قیمت (Price)": 500,
      "تفصیل (Description)": "جامع صحیح احادیث کا عظیم الشان ذخیرہ۔",
      "نوٹ (Remarks)": "مکمل سیٹ"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Title
    { wch: 35 }, // Author
    { wch: 25 }, // Translator
    { wch: 35 }, // Publisher
    { wch: 12 }, // Language
    { wch: 10 }, // Pages
    { wch: 12 }, // Year
    { wch: 10 }, // Edition
    { wch: 12 }, // Volume
    { wch: 15 }, // Serial No
    { wch: 15 }, // Book No
    { wch: 10 }, // Price
    { wch: 40 }, // Description
    { wch: 25 }  // Remarks
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Books Template");

  // Write and trigger browser download
  XLSX.writeFile(wb, "KIL_Library_Books_Import_Template.xlsx");
}
