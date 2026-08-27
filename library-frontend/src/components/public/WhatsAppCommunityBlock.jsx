import React from "react";
import { ChatBubbleLeftRightIcon, ArrowTopRightOnSquareIcon, SparklesIcon } from "@heroicons/react/24/outline";

const WhatsAppCommunityBlock = ({ config = {} }) => {
  const title = config?.title || "Join Official Markaz Community";
  const subtitle = config?.subtitle || "واٹس ایپ و سوشل میڈیا چینل پر جڑیں";
  const description = config?.description || "Receive daily Quranic Ayat, authentic Hadith, announcements, newly published books, and Fatawa directly on your phone.";

  return (
    <section className="py-10 px-4 max-w-7xl mx-auto font-sans">
      <div className="rounded-[2.5rem] bg-gradient-to-r from-emerald-900 via-teal-900 to-[#002147] p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden border border-emerald-500/20">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30 backdrop-blur-md">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Official Broadcast Channel</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm font-urdu font-semibold text-emerald-200" dir="rtl">
                {subtitle}
              </p>
            )}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-green-500 hover:bg-green-400 text-slate-950 font-black text-sm transition-all shadow-lg hover:shadow-green-500/30 hover:scale-102"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 stroke-[2.5]" />
              <span>Join WhatsApp Channel</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-70" />
            </a>

            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all backdrop-blur-md"
            >
              <span>Telegram Group</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppCommunityBlock;
