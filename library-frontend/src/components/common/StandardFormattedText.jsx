import React from 'react';

/**
 * 📜 StandardFormattedText — Universal Islamic Makhtota (Manuscript) Formatter
 *
 * Implements Turath.io standard:
 * - Makhtota parchment paper background (#FAF6EE / #FCF9F2) with subtle antique border (#E8DEC9)
 * - Perfect justified lining (daayen-baayen barabar) with text-justify: inter-word
 * - Deep antique ink typography (#2C2416) using 'Amiri', 'Noto Nastaliq Urdu', serif
 * - Centered Islamic section headings (✺ Unwaan, •══════•) with gold/navy accents
 * - Styled Makhtota numbered cards (❶ ❷ ❸ or 1. 2. 3.) with circular badges
 * - Soft callout quote boxes for Quran/Hadith/Quotes
 * - Clean subtle dividers (❖ ❖ ❖)
 */

const CIRCLE_NUM_MAP = {
  '❶': 1, '❷': 2, '❸': 3, '❹': 4, '❺': 5,
  '❻': 6, '❼': 7, '❽': 8, '❾': 9, '❿': 10,
  '➊': 1, '➋': 2, '➌': 3, '➍': 4, '➎': 5,
  '➏': 6, '➐': 7, '➑': 8, '➒': 9, '➓': 10,
  '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5,
  '۶': 6, '۷': 7, '۸': 8, '۹': 9, '۱۰': 10
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
    if (/^#{1,4}\s+/.test(trimmed) || /^[✺✦❖۞■◆★]s*/.test(trimmed)) {
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
    if (/^[•\-*✓✔◈›»]s*/.test(trimmed)) {
      const cleanBullet = trimmed.replace(/^[•\-*✓✔◈›»]s*/, '').trim();
      blocks.push({ type: 'bullet', content: cleanBullet });
      continue;
    }

    // 6. Quotation (Starts and ends with quotes or Hadith header)
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
  textSize = 'text-[1.125rem] sm:text-[1.25rem]',
  highlightQuery = '',
  dense = false,
  makhtotaPaper = true // Default to true for authentic light yellow manuscript look
}) => {
  if (!text) return null;

  const blocks = formatRawTextToBlocks(text);

  const highlightContent = (content) => {
    if (!highlightQuery || !highlightQuery.trim()) return content;
    const query = highlightQuery.trim();
    const safeRegex = new RegExp('(' + query.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&') + ')', 'gi');
    const parts = content.split(safeRegex);

    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-300 text-amber-950 font-bold px-1.5 py-0.5 rounded-sm shadow-xs">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const paperStyles = makhtotaPaper
    ? 'bg-[#FAF6EE] border border-[#E8DEC9] rounded-2xl p-6 sm:p-10 shadow-[inset_0_0_30px_rgba(180,140,75,0.03)]'
    : '';

  return (
    <div
      dir="rtl"
      className={'space-y-4 text-right ' + paperStyles + ' ' + className}
      style={{
        fontFamily: "'Amiri', 'Noto Nastaliq Urdu', 'Scheherazade New', serif",
        color: '#2C2416',
        textAlign: 'justify',
        textJustify: 'inter-word'
      }}
    >
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'centered_header':
            return (
              <div key={index} className="my-6 pt-3 pb-3 border-y border-[#E2D4BE] text-center bg-[#F4EEDB]/60 rounded-xl px-4">
                <div className="text-xs text-[#8B6E32] font-sans font-bold uppercase tracking-widest mb-1">
                  ✦ فصل / عنوان ✦
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#002147] tracking-normal leading-relaxed">
                  {highlightContent(block.content)}
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
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#002147] text-white flex items-center justify-center font-bold text-sm shadow-xs mt-0.5 ring-2 ring-[#C9A96E]/40">
                  {block.number}
                </div>
                <div
                  className={'flex-1 ' + textSize + ' leading-[2.5] text-[#2C2416] font-medium'}
                  style={{ textAlign: 'justify', textJustify: 'inter-word' }}
                >
                  {highlightContent(block.content)}
                </div>
              </div>
            );

          case 'bullet':
            return (
              <div key={index} className="flex items-start gap-3.5 my-2 pr-2">
                <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-[#8B6E32] mt-3.5 ring-2 ring-[#FAF6EE]" />
                <div
                  className={'flex-1 ' + textSize + ' leading-[2.5] text-[#2C2416]'}
                  style={{ textAlign: 'justify', textJustify: 'inter-word' }}
                >
                  {highlightContent(block.content)}
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
                  className={textSize + ' leading-[2.5] font-semibold italic text-[#1C160C]'}
                  style={{ textAlign: 'justify', textJustify: 'inter-word' }}
                >
                  ”{highlightContent(block.content)}“
                </p>
              </div>
            );

          case 'paragraph':
          default:
            return (
              <p
                key={index}
                className={textSize + ' leading-[2.5] text-[#2C2416] font-normal ' + (dense ? 'mb-2' : 'mb-4')}
                style={{ textAlign: 'justify', textJustify: 'inter-word' }}
              >
                {highlightContent(block.content)}
              </p>
            );
        }
      })}
    </div>
  );
};

export default StandardFormattedText;
