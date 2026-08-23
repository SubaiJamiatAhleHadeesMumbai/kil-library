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

// Check if string is predominantly Arabic text
const isArabicScript = (str) => {
  if (!str) return false;
  // Arabic specific diacritics / markers / phrases
  const arabicRegex = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]|(قال|رسول الله|صلى الله|رضي الله|الحمد لله|سبحان|عز وجل|تعالى|القرآن|سورة|آية)/;
  return arabicRegex.test(str);
};

export const formatRawTextToBlocks = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return [];

  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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
        blocks.push({ type: 'centered_header', content: cleanTitle });
      } else {
        blocks.push({ type: 'divider' });
      }
      continue;
    }

    // 2. Markdown / Symbol Heading (# Heading or ✺ Heading or ✦ Heading)
    if (/^#{1,4}\s+/.test(trimmed) || /^[✺✦❖۞■◆★]\s*/.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^#{1,4}\s+|^[✺✦❖۞■◆★]\s*/, '').trim();
      blocks.push({ type: 'centered_header', content: cleanTitle });
      continue;
    }

    // 3. Circled Number Point (❶ ❷ ❸...)
    const circleMatch = trimmed.match(/^([❶-❿➊-➓])\s*(.*)/);
    if (circleMatch) {
      const symbol = circleMatch[1];
      const num = CIRCLE_NUM_MAP[symbol] || symbol;
      blocks.push({ type: 'numbered_point', number: num, content: circleMatch[2].trim() });
      continue;
    }

    // 4. Standard Numbered Point (1. or 1) or (1))
    const stdNumMatch = trimmed.match(/^([(]?\d{1,3}[.)\-–]\s*)(.*)/);
    if (stdNumMatch && stdNumMatch[2]) {
      const rawNum = stdNumMatch[1].replace(/\D/g, '');
      blocks.push({ type: 'numbered_point', number: rawNum || '•', content: stdNumMatch[2].trim() });
      continue;
    }

    // 5. Bullet Point (•, -, *, ✓, ✔, ◈, >)
    if (/^[•\-*✓✔◈›»]\s*/.test(trimmed)) {
      const cleanBullet = trimmed.replace(/^[•\-*✓✔◈›»]\s*/, '').trim();
      blocks.push({ type: 'bullet', content: cleanBullet });
      continue;
    }

    // 6. Quotation
    if (/^[”"«]/.test(trimmed) && /[”"»]$/.test(trimmed)) {
      blocks.push({ type: 'quote', content: trimmed.replace(/^[”"«]\s*|\s*[”"»]$/g, '') });
      continue;
    }

    // 7. Regular Paragraph
    blocks.push({ type: 'paragraph', content: trimmed });
  }

  return blocks;
};

const StandardFormattedText = ({
  text,
  className = '',
  highlightQuery = '',
  dense = false,
  makhtotaPaper = true,
  showZoomControls = false
}) => {
  const [zoomLevel, setZoomLevel] = useState(0); // -1: small, 0: normal, 1: large, 2: xl

  if (!text) return null;

  const blocks = formatRawTextToBlocks(text);

  const fontSizes = {
    '-1': 'text-[1rem] sm:text-[1.1rem] leading-[2.2]',
    '0':  'text-[1.125rem] sm:text-[1.25rem] leading-[2.4]',
    '1':  'text-[1.25rem] sm:text-[1.38rem] leading-[2.6]',
    '2':  'text-[1.38rem] sm:text-[1.5rem] leading-[2.8]',
  };
  const currentSizeClass = fontSizes[zoomLevel] || fontSizes['0'];

  const highlightContent = (content, isArabic = false) => {
    if (!content) return null;
    const fontStyle = isArabic
      ? { fontFamily: "'Amiri', 'Traditional Arabic', serif" }
      : { fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif" };

    if (!highlightQuery || !highlightQuery.trim()) {
      return <span style={fontStyle}>{content}</span>;
    }

    const query = highlightQuery.trim();
    const safeRegex = new RegExp('(' + query.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&') + ')', 'gi');
    const parts = content.split(safeRegex);

    return (
      <span style={fontStyle}>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-300 text-amber-950 font-bold px-1.5 py-0.5 rounded-sm shadow-xs">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const paperStyles = makhtotaPaper
    ? 'bg-[#FAF6EE] border-2 border-[#E2D4BE] rounded-3xl p-6 sm:p-10 shadow-[inset_0_0_40px_rgba(180,140,75,0.04),0_8px_24px_rgba(0,0,0,0.03)] ring-1 ring-[#D8C6A5]'
    : '';

  return (
    <div
      dir="rtl"
      className={'space-y-4 text-right ' + paperStyles + ' ' + className}
      style={{
        fontFamily: "'Noto Nastaliq Urdu', 'JameelNoori', serif",
        color: '#2C2416',
        textAlign: 'justify',
        textJustify: 'inter-word'
      }}
    >
      {/* Optional Zoom Controls Header */}
      {showZoomControls && (
        <div className="flex items-center justify-between border-b border-[#E2D4BE] pb-3 mb-4 no-print">
          <span className="text-xs font-bold text-[#8B6E32] flex items-center gap-1.5">
            <span>✦</span> خط کی جسامت (Text Size):
          </span>
          <div className="flex items-center gap-1 bg-[#F4EEDB] rounded-lg p-1 border border-[#E0D1B8]">
            <button
              onClick={() => setZoomLevel(prev => Math.max(-1, prev - 1))}
              className="px-2 py-0.5 text-xs font-bold text-[#2C2416] hover:bg-white rounded transition"
              title="چھوٹا خط"
            >
              A-
            </button>
            <button
              onClick={() => setZoomLevel(0)}
              className="px-2 py-0.5 text-xs font-bold text-[#2C2416] hover:bg-white rounded transition"
              title="نارمل خط"
            >
              A
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 1))}
              className="px-2 py-0.5 text-xs font-bold text-[#2C2416] hover:bg-white rounded transition"
              title="بڑا خط"
            >
              A+
            </button>
          </div>
        </div>
      )}

      {blocks.map((block, index) => {
        const isAr = isArabicScript(block.content);

        switch (block.type) {
          case 'centered_header':
            return (
              <div key={index} className="my-6 pt-3 pb-3 border-y border-[#E2D4BE] text-center bg-[#F4EEDB]/60 rounded-2xl px-4">
                <div className="text-xs text-[#8B6E32] font-sans font-bold uppercase tracking-widest mb-1">
                  ✦ فصل / عنوان ✦
                </div>
                <h3
                  className="text-xl sm:text-2xl font-black text-[#002147] tracking-normal leading-relaxed"
                  style={{ fontFamily: isAr ? "'Amiri', serif" : "'Noto Nastaliq Urdu', serif" }}
                >
                  {highlightContent(block.content, isAr)}
                </h3>
              </div>
            );

          case 'divider':
            return (
              <div key={index} className="my-6 flex items-center justify-center gap-3">
                <div className="h-px bg-[#E2D4BE] flex-1" />
                <span className="text-[#8B6E32] text-sm tracking-widest">❖ ❖ ❖</span>
                <div className="h-px bg-[#E2D4BE] flex-1" />
              </div>
            );

          case 'numbered_point':
            return (
              <div
                key={index}
                className="flex items-start gap-4 p-4 sm:p-5 my-3 rounded-2xl bg-[#F4EEDB]/80 border border-[#E0D1B8] shadow-2xs hover:bg-[#EFE7D4] transition-all duration-200"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#002147] text-white flex items-center justify-center font-bold text-sm shadow-xs mt-0.5 ring-2 ring-[#C9A96E]/40 font-sans">
                  {block.number}
                </div>
                <div
                  className={'flex-1 ' + currentSizeClass + ' text-[#2C2416] font-medium'}
                  style={{
                    fontFamily: isAr ? "'Amiri', serif" : "'Noto Nastaliq Urdu', serif",
                    textAlign: 'justify',
                    textJustify: 'inter-word'
                  }}
                >
                  {highlightContent(block.content, isAr)}
                </div>
              </div>
            );

          case 'bullet':
            return (
              <div key={index} className="flex items-start gap-3.5 my-2 pr-2">
                <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-[#8B6E32] mt-3.5 ring-2 ring-[#FAF6EE]" />
                <div
                  className={'flex-1 ' + currentSizeClass + ' text-[#2C2416]'}
                  style={{
                    fontFamily: isAr ? "'Amiri', serif" : "'Noto Nastaliq Urdu', serif",
                    textAlign: 'justify',
                    textJustify: 'inter-word'
                  }}
                >
                  {highlightContent(block.content, isAr)}
                </div>
              </div>
            );

          case 'quote':
            return (
              <div
                key={index}
                className="my-5 p-5 sm:p-6 rounded-2xl bg-[#F3ECE0] border-r-4 border-[#C9A96E] text-[#2C2416] shadow-2xs"
              >
                <p
                  className={currentSizeClass + ' font-semibold text-[#1C160C]'}
                  style={{
                    fontFamily: "'Amiri', serif",
                    textAlign: 'justify',
                    textJustify: 'inter-word'
                  }}
                >
                  ”{highlightContent(block.content, true)}“
                </p>
              </div>
            );

          case 'paragraph':
          default:
            return (
              <p
                key={index}
                className={currentSizeClass + ' text-[#2C2416] font-normal ' + (dense ? 'mb-2' : 'mb-4')}
                style={{
                  fontFamily: isAr ? "'Amiri', serif" : "'Noto Nastaliq Urdu', serif",
                  textAlign: 'justify',
                  textJustify: 'inter-word'
                }}
              >
                {highlightContent(block.content, isAr)}
              </p>
            );
        }
      })}
    </div>
  );
};

export default StandardFormattedText;
