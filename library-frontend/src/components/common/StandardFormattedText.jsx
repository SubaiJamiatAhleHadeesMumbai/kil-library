import React, { useState } from 'react';

/**
 * 📜 StandardFormattedText — Universal Islamic Makhtota (Manuscript) Formatter
 * 
 * Rules:
 * - Urdu text -> strictly 'Noto Nastaliq Urdu', serif
 * - Arabic text / Quotes / Hadith / Quran -> strictly 'Amiri', serif
 * - Daayen-baayen barabar (text-justify: inter-word)
 * - Zero extra text added from assistant side; 100% true to source text
 */

const CIRCLE_NUM_MAP = {
  '❶': 1, '❷': 2, '❸': 3, '❹': 4, '❺': 5,
  '❻': 6, '❼': 7, '❽': 8, '❾': 9, '❿': 10,
  '➊': 1, '➋': 2, '➌': 3, '➍': 4, '➎': 5,
  '➏': 6, '➐': 7, '➑': 8, '➒': 9, '➓': 10,
  '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5,
  '۶': 6, '۷': 7, '۸': 8, '۹': 9, '۱۰': 10
};

// Fonts configuration
export const URDU_FONT_STACK = "'Mehr Nastaliq', 'Mehr', 'Gulzar', 'Jameel Noori Nastaleeq', 'JameelNoori', 'Noto Nastaliq Urdu', serif";
export const ARABIC_FONT_STACK = "'Amiri', 'Noto Sans Arabic', 'Almarai', serif";

// Check if string is predominantly Arabic text (Quran, Hadith, heavy Harkat/Airaab or pure Arabic words)
export const isArabicScript = (str) => {
  if (!str || typeof str !== 'string') return false;
  // Detect Arabic diacritics / Quranic signs: Fatha, Damma, Kasra, Shadda, Sukun, Tanween, etc.
  const diacritics = (str.match(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g) || []).length;
  // If text contains substantial diacritics relative to length, it is Quran/Hadith/Arabic
  if (diacritics >= 2) return true;

  // Detect common Islamic & Quranic Arabic phrases
  const arabicRegex = /(قال رسول الله|صلى الله عليه وسلم|رضي الله عن|الحمد لله|سبحان الله|تبارك وتعالى|عز وجل|القرآن الكريم|سورة|آية|بسم الله الرحمن الرحيم|حدثنا|أخبرنا|عن أبي|روى|في الحديث)/;
  if (arabicRegex.test(str)) return true;

  // Detect Arabic definite article followed by Arabic root characteristics
  if (/(^|\s)(الرحمن|الرحيم|العالمين|المستقيم|الصراط|المؤمنين|الكافرين|المسلمين|الجنة|النار|الصلاة|الزكاة)($|\s)/.test(str)) {
    return true;
  }

  return false;
};

// Normalizes Urdu and Arabic characters, fixing broken/misplaced Do-Chashmi Heh and Arabic letters
export const normalizeUrduText = (str) => {
  if (!str || typeof str !== 'string') return '';
  let s = str;
  // If the whole string is clearly Arabic (e.g. Quran ayat), preserve authentic Arabic characters
  if (isArabicScript(s)) {
    return s;
  }
  // Replace Arabic Kaf 'ك' (0643) with Urdu 'ک' (06A9)
  s = s.replace(/ك/g, 'ک');
  // Replace Arabic Yeh 'ي' (064A) / 'ى' (0649) with Urdu 'ی' (06CC)
  s = s.replace(/[يى]/g, 'ی');
  // Fix Arabic Heh 'ه' (0647) and Te Marbuta 'ة' (0629) with Urdu 'ہ' (06C1) / 'ۃ'
  s = s.replace(/ه/g, 'ہ').replace(/ة/g, 'ۃ');
  // Fix misplaced Do-Chashmi Heh 'ھ' with Choti Heh 'ہ' in common standalone Urdu words
  s = s.replace(/\bھ(وا|مارا|ماری|مارے|میں|م|ے|یں|وں|و|وتا|وتی|وتے|ونی|ونا|ونے|اتھ|وئی|وئے)/g, 'ہ$1');
  s = s.replace(/\bھ(?=[ا-ی])/g, 'ہ');
  // Fix Hamza on Ye 'لۓ' -> 'لیے'
  s = s.replace(/لۓ/g, 'لیے');
  return s;
};

export const formatRawTextToBlocks = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return [];

  let text = normalizeUrduText(rawText);
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\\+(\n|$)/g, '$1');
  text = text.replace(/([^\n])\s*([❶-❿➊-➓])/g, '$1\n$2');

  const rawLines = text.split('\n');
  const blocks = [];

  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (!trimmed) continue;

    // 1. Decorative Header or Divider (e.g. •══════• or •─════﷽════─• or ---)
    if (/^[•═\-_=—*─]{3,}/.test(trimmed) || /•[═=—\-─]+.*[═=—\-─]+•/.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^[•═\-_=—*─\s]+|[•═\-_=—*─\s]+$/g, '').trim();
      if (cleanTitle) {
        blocks.push({ type: 'centered_header', content: cleanTitle, isArabic: isArabicScript(cleanTitle) });
      } else {
        blocks.push({ type: 'divider' });
      }
      continue;
    }

    // 2. Markdown / Symbol Heading (# Heading or ✺ Heading or ✦ Heading)
    if (/^#{1,4}\s+/.test(trimmed) || /^[✺✦❖۞■◆★]\s*/.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^#{1,4}\s+|^[✺✦❖۞■◆★]\s*/, '').trim();
      blocks.push({ type: 'centered_header', content: cleanTitle, isArabic: isArabicScript(cleanTitle) });
      continue;
    }

    // 3. Circled Number Point (❶ ❷ ❸...)
    const circleMatch = trimmed.match(/^([❶-❿➊-➓])\s*(.*)/);
    if (circleMatch) {
      const symbol = circleMatch[1];
      const num = CIRCLE_NUM_MAP[symbol] || symbol;
      const content = circleMatch[2].trim();
      blocks.push({ type: 'numbered_point', number: num, content, isArabic: isArabicScript(content) });
      continue;
    }

    // 4. Standard Numbered Point (1. or 1) or (1))
    const stdNumMatch = trimmed.match(/^([(]?\d{1,3}[.)\-–]\s*)(.*)/);
    if (stdNumMatch && stdNumMatch[2]) {
      const rawNum = stdNumMatch[1].replace(/\D/g, '');
      const content = stdNumMatch[2].trim();
      blocks.push({ type: 'numbered_point', number: rawNum || '•', content, isArabic: isArabicScript(content) });
      continue;
    }

    // 5. Bullet Point (•, -, *, ✓, ✔, ◈, >)
    if (/^[•\-*✓✔◈›»]\s*/.test(trimmed)) {
      const cleanBullet = trimmed.replace(/^[•\-*✓✔◈›»]\s*/, '').trim();
      blocks.push({ type: 'bullet', content: cleanBullet, isArabic: isArabicScript(cleanBullet) });
      continue;
    }

    // 6. Quotation (Often Arabic Hadith / Ayat e.g. «...» or "...")
    if (/^[”"«]/.test(trimmed) && /[”"»]$/.test(trimmed)) {
      const content = trimmed.replace(/^[”"«]\s*|\s*[”"»]$/g, '');
      blocks.push({ type: 'quote', content, isArabic: isArabicScript(content) });
      continue;
    }

    // 7. Regular Paragraph
    blocks.push({ type: 'paragraph', content: trimmed, isArabic: isArabicScript(trimmed) });
  }

  return blocks;
};

const StandardFormattedText = ({
  text,
  className = '',
  highlightQuery = '',
  dense = false,
  makhtotaPaper = true,
  showZoomControls = false,
  fontFamily = URDU_FONT_STACK
}) => {
  const [zoomLevel, setZoomLevel] = useState(0); // -1: small, 0: normal, 1: large, 2: xl

  if (!text) return null;

  const blocks = formatRawTextToBlocks(text);

  const fontSizes = {
    '-1': 'text-[1.15rem] sm:text-[1.25rem] leading-[2.6]',
    '0':  'text-[1.3rem] sm:text-[1.45rem] md:text-[1.55rem] leading-[2.8] sm:leading-[3.0]',
    '1':  'text-[1.45rem] sm:text-[1.65rem] md:text-[1.75rem] leading-[3.0] sm:leading-[3.2]',
    '2':  'text-[1.65rem] sm:text-[1.85rem] md:text-[2.0rem] leading-[3.2] sm:leading-[3.4]',
  };
  const currentSizeClass = fontSizes[zoomLevel] || fontSizes['0'];

  // Helper to render text with Arabic span detection inside Urdu sentences
  const renderSmartInlineText = (content, parentIsArabic = false) => {
    if (!content) return null;

    // If whole block is already marked Arabic, render directly with Arabic font
    if (parentIsArabic) {
      return <span style={{ fontFamily: ARABIC_FONT_STACK }}>{content}</span>;
    }

    // Check for inline Arabic quotes or Arabic bracketed phrases: e.g. « ... » or ( ... ) containing Arabic
    const inlineArabicPattern = /(«[^»]+»|\([^\)]*[\u064B-\u065F\u0670\u06D6-\u06ED][^\)]*\))/g;
    const parts = content.split(inlineArabicPattern);

    return (
      <>
        {parts.map((segment, idx) => {
          if (isArabicScript(segment)) {
            return (
              <span
                key={idx}
                className="text-[#002147] font-normal px-1 mx-0.5 inline-block"
                style={{ fontFamily: ARABIC_FONT_STACK, fontSize: '1.05em' }}
              >
                {segment}
              </span>
            );
          }
          return <span key={idx}>{segment}</span>;
        })}
      </>
    );
  };

  const highlightContent = (content, isArabic = false) => {
    if (!content) return null;

    if (!highlightQuery || !highlightQuery.trim()) {
      return renderSmartInlineText(content, isArabic);
    }

    const query = highlightQuery.trim();
    const safeRegex = new RegExp('(' + query.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&') + ')', 'gi');
    const parts = content.split(safeRegex);

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-300 text-amber-950 font-bold px-1.5 py-0.5 rounded-sm shadow-xs">
              {renderSmartInlineText(part, isArabic)}
            </mark>
          ) : (
            <React.Fragment key={i}>{renderSmartInlineText(part, isArabic)}</React.Fragment>
          )
        )}
      </>
    );
  };

  const paperStyles = makhtotaPaper
    ? 'bg-[#FAF6EE] border-2 border-[#E2D4BE] rounded-3xl p-6 sm:p-10 shadow-[inset_0_0_40px_rgba(180,140,75,0.04),0_8px_24px_rgba(0,0,0,0.03)] ring-1 ring-[#D8C6A5]'
    : '';

  return (
    <div
      dir="rtl"
      className={'space-y-6 text-right max-w-4xl mx-auto ' + paperStyles + ' ' + className}
      style={{
        fontFamily: uniformNastaleeqFont,
        color: '#1A1612',
        textAlign: 'right',
        lineHeight: '2.9',
        letterSpacing: '0.01em',
        wordSpacing: '0.04em',
      }}
    >
      {/* Optional Zoom Controls Header */}
      {showZoomControls && (
        <div className="flex items-center justify-between border-b border-[#E2D4BE] pb-3 mb-4 no-print">
          <span className="text-xs font-bold text-[#8B6E32] flex items-center gap-1.5 font-sans">
            <span>✦</span> خط کی جسامت (Text Size):
          </span>
          <div className="flex items-center gap-1 bg-[#F4EEDB] rounded-lg p-1 border border-[#E0D1B8]">
            <button
              onClick={() => setZoomLevel(prev => Math.max(-1, prev - 1))}
              className="px-2.5 py-0.5 text-xs font-bold text-[#1A1612] hover:bg-white rounded transition"
              title="چھوٹا خط"
            >
              A-
            </button>
            <button
              onClick={() => setZoomLevel(0)}
              className="px-2.5 py-0.5 text-xs font-bold text-[#1A1612] hover:bg-white rounded transition"
              title="نارمل خط"
            >
              A
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 1))}
              className="px-2.5 py-0.5 text-xs font-bold text-[#1A1612] hover:bg-white rounded transition"
              title="بڑا خط"
            >
              A+
            </button>
          </div>
        </div>
      )}

      {blocks.map((block, index) => {
        const blockFont = block.isArabic ? ARABIC_FONT_STACK : uniformNastaleeqFont;
        const blockLineHeight = block.isArabic ? '2.4' : '2.9';

        switch (block.type) {
          case 'centered_header':
            return (
              <div key={index} className="my-8 pt-4 pb-4 border-y-2 border-[#E2D4BE] text-center bg-[#F4EEDB]/80 rounded-2xl px-6">
                <h3
                  className="text-2xl sm:text-3xl font-black text-[#002147] tracking-normal leading-[2.6]"
                  style={{ fontFamily: blockFont }}
                >
                  {highlightContent(block.content, block.isArabic)}
                </h3>
              </div>
            );

          case 'divider':
            return (
              <div key={index} className="my-8 flex items-center justify-center gap-4">
                <div className="h-[1.5px] bg-[#E2D4BE] flex-1" />
                <span className="text-[#8B6E32] text-base tracking-widest">❖ ❖ ❖</span>
                <div className="h-[1.5px] bg-[#E2D4BE] flex-1" />
              </div>
            );

          case 'numbered_point':
            return (
              <div
                key={index}
                className="flex items-start gap-4 p-5 sm:p-6 my-4 rounded-2xl bg-[#F4EEDB]/90 border border-[#E0D1B8] shadow-xs hover:bg-[#EFE7D4] transition-all duration-200"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#002147] text-white flex items-center justify-center font-bold text-base shadow-xs mt-1.5 ring-2 ring-[#C9A96E]/40 font-sans">
                  {block.number}
                </div>
                <div
                  className={'flex-1 ' + currentSizeClass + ' text-[#1A1612] font-medium'}
                  style={{
                    fontFamily: blockFont,
                    textAlign: 'right',
                    lineHeight: blockLineHeight,
                  }}
                >
                  {highlightContent(block.content, block.isArabic)}
                </div>
              </div>
            );

          case 'bullet':
            return (
              <div key={index} className="flex items-start gap-4 my-3 pr-2">
                <span className="flex-shrink-0 w-3 h-3 rounded-full bg-[#8B6E32] mt-4 ring-2 ring-[#FAF6EE]" />
                <div
                  className={'flex-1 ' + currentSizeClass + ' text-[#1A1612]'}
                  style={{
                    fontFamily: blockFont,
                    textAlign: 'right',
                    lineHeight: blockLineHeight,
                  }}
                >
                  {highlightContent(block.content, block.isArabic)}
                </div>
              </div>
            );

          case 'quote':
            return (
              <div
                key={index}
                className="my-6 p-6 sm:p-8 rounded-2xl bg-[#F3ECE0] border-r-4 border-[#C9A96E] text-[#1A1612] shadow-xs"
              >
                <p
                  className={currentSizeClass + ' font-semibold text-[#1A1612]'}
                  style={{
                    fontFamily: blockFont,
                    textAlign: 'right',
                    lineHeight: blockLineHeight,
                  }}
                >
                  ”{highlightContent(block.content, block.isArabic)}“
                </p>
              </div>
            );

          case 'paragraph':
          default:
            return (
              <p
                key={index}
                className={currentSizeClass + ' text-[#1A1612] font-normal ' + (dense ? 'mb-3' : 'mb-6')}
                style={{
                  fontFamily: blockFont,
                  textAlign: 'right',
                  lineHeight: blockLineHeight,
                  letterSpacing: '0.01em',
                }}
              >
                {highlightContent(block.content, block.isArabic)}
              </p>
            );
        }
      })}
    </div>
  );
};

export default StandardFormattedText;
