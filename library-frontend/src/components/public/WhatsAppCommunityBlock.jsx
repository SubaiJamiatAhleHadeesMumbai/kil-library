import React from "react";
import { ChatBubbleLeftRightIcon, ArrowTopRightOnSquareIcon, SparklesIcon } from "@heroicons/react/24/outline";

const WhatsAppCommunityBlock = ({ config = {} }) => {
  const title = config?.title || "Join Official Markaz Community";
  const subtitle = config?.subtitle || "واٹس ایپ و سوشل میڈیا چینل پر جڑیں";
  const description = config?.description || "Receive daily Quranic Ayat, authentic Hadith, announcements, newly published books, and Fatawa directly on your phone.";

  return (
    <section className="py-6 px-4 max-w-7xl mx-auto font-sans">
      <div className="rounded-[2.5rem] bg-gradient-to-r from-[#031525] via-[#052827] to-[#021820] p-6 sm:p-10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative overflow-hidden border border-amber-500/30">
        {/* Background ambient royal glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2.5 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold border border-amber-500/30">
              <SparklesIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Community Hub • مرکزی رابطہ</span>
            </div>

            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              {title}
            </h2>
            {subtitle && (
              <p 
                className="text-base sm:text-lg font-bold text-amber-300/90 leading-relaxed" 
                style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', 'Noto Nastaliq Urdu', serif" }}
                dir="rtl"
              >
                {subtitle}
              </p>
            )}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              {description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm transition-all shadow-[0_8px_20px_rgba(16,185,129,0.35)] hover:scale-102 border border-emerald-400/40"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 stroke-[2.5]" />
              <span>Join WhatsApp Channel</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-80" />
            </a>

            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-amber-200 font-bold text-sm border border-amber-400/30 transition-all backdrop-blur-md shadow-xs hover:border-amber-400/60"
            >
              <span>Telegram Channel</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppCommunityBlock;
