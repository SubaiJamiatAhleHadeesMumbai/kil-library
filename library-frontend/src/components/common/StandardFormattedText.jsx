import React from 'react';

/**
 * StandardFormattedText — Universal Urdu/Arabic Standard Text Formatter
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

    // 1. Decorative Header or Divider
    if (/^[•═\-_=—*]{3,}/.test(trimmed) || /•[═=—\-]+•/.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^[•═\-_=—*\s]+|[•═\-_=—*\s]+$/g, '').trim();
      if (cleanTitle) {
        blocks.push({ type: 'header', content: cleanTitle });
      } else {
        blocks.push({ type: 'divider' });
      }
      continue;
    }

    // 2. Markdown / Symbol Heading
    if (/^#{1,4}\s+/.test(trimmed) || /^[✺✦❖۞■◆★]\s+/.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^#{1,4}\s+|^[✺✦❖۞■◆★]\s+/, '').trim();
      blocks.push({ type: 'header', content: cleanTitle });
      continue;
    }

    // 3. Circled Number Point
    const circleMatch = trimmed.match(/^([❶-❿➊-➓])\s*(.*)/);
    if (circleMatch) {
      const symbol = circleMatch[1];
      const num = CIRCLE_NUM_MAP[symbol] || symbol;
      blocks.push({ type: 'numbered_point', number: num, content: circleMatch[2].trim() });
      continue;
    }

    // 4. Standard Numbered Point
    const stdNumMatch = trimmed.match(/^([(]?\d{1,3}[.)\-–]\s*)(.*)/);
    if (stdNumMatch && stdNumMatch[2]) {
      const rawNum = stdNumMatch[1].replace(/\D/g, '');
      blocks.push({ type: 'numbered_point', number: rawNum || '•', content: stdNumMatch[2].trim() });
      continue;
    }

    // 5. Bullet Point
    if (/^[•\-*✓✔›»]\s+/.test(trimmed)) {
      const cleanBullet = trimmed.replace(/^[•\-*✓✔›»]\s+/, '').trim();
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
  textSize = 'text-base sm:text-[1.125rem]',
  highlightQuery = '',
  dense = false
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
        <mark key={i} className="bg-emerald-200 text-emerald-950 font-bold px-1 rounded-sm">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      dir="rtl"
      className={'space-y-4 text-right text-slate-800 ' + className}
      style={{
        fontFamily: "'Amiri', 'Noto Nastaliq Urdu', 'Scheherazade New', serif",
      }}
    >
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'header':
            return (
              <div key={index} className="my-5 pt-3 pb-2 border-b border-emerald-100 flex items-center gap-3">
                <div className="w-2 h-6 rounded-full bg-[#002147]" />
                <h3 className="text-lg sm:text-xl font-bold text-[#002147] tracking-normal leading-relaxed">
                  {highlightContent(block.content)}
                </h3>
              </div>
            );

          case 'divider':
            return (
              <div key={index} className="my-6 flex items-center justify-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-slate-400 text-xs tracking-widest">❖ ❖ ❖</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
            );

          case 'numbered_point':
            return (
              <div
                key={index}
                className="flex items-start gap-3.5 p-3.5 sm:p-4 my-2.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs hover:bg-emerald-50/40 hover:border-emerald-200 transition-all duration-200"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#002147] text-white flex items-center justify-center font-bold text-sm shadow-xs mt-0.5">
                  {block.number}
                </div>
                <div className={'flex-1 ' + textSize + ' leading-[2.4] text-slate-800 text-justify font-medium'}>
                  {highlightContent(block.content)}
                </div>
              </div>
            );

          case 'bullet':
            return (
              <div key={index} className="flex items-start gap-3 my-1.5 pr-2">
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-600 mt-3" />
                <div className={'flex-1 ' + textSize + ' leading-[2.4] text-slate-800 text-justify'}>
                  {highlightContent(block.content)}
                </div>
              </div>
            );

          case 'quote':
            return (
              <div
                key={index}
                className="my-4 p-4 sm:p-5 rounded-2xl bg-amber-50/70 border-r-4 border-amber-500 text-amber-950 shadow-2xs"
              >
                <p className={textSize + ' leading-[2.4] text-justify font-medium italic'}>
                  ”{highlightContent(block.content)}“
                </p>
              </div>
            );

          case 'paragraph':
          default:
            return (
              <p
                key={index}
                className={textSize + ' leading-[2.4] text-justify text-slate-800 font-normal ' + (dense ? 'mb-2' : 'mb-4')}
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
