import React from "react";
import { ChatBubbleLeftRightIcon, ArrowTopRightOnSquareIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "../../context/LanguageContext";

const WhatsAppCommunityBlock = ({ config = {} }) => {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';

  const title = config?.title || (isUrdu ? "مرکز کی آفیشل کمیونٹی میں شامل ہوں" : "Join Official Markaz Community");
  const subtitle = config?.subtitle || "واٹس ایپ و سوشل میڈیا چینل پر جڑیں";
  const description = config?.description || (isUrdu
    ? "روزانہ قرآنی آیات، صحیح احادیث، اعلانات، نئی شائع شدہ کتابیں اور فتاویٰ براہ راست اپنے موبائل پر حاصل کریں۔"
    : "Receive daily Quranic Ayat, authentic Hadith, announcements, newly published books, and Fatawa directly on your phone.");

  return (
    <section className="py-6 px-4 max-w-7xl mx-auto">
      <div className="rounded-[2rem] bg-white p-6 sm:p-10 text-slate-900 shadow-xs relative overflow-hidden border border-slate-200/90">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2.5 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <SparklesIcon className="w-3.5 h-3.5 text-emerald-700" />
              <span className={isUrdu ? "font-urdu text-sm" : ""}>
                {isUrdu ? "مرکزی دعوتی رابطہ گاہ" : "Official Community Hub • مرکزی رابطہ"}
              </span>
            </div>

            <h2 className={`text-xl sm:text-3xl font-bold tracking-tight text-slate-900 ${isUrdu ? "font-urdu leading-loose" : ""}`}>
              {title}
            </h2>
            {!isUrdu && subtitle && (
              <p 
                className="text-base sm:text-lg font-bold text-slate-700 leading-relaxed font-urdu" 
                dir="rtl"
              >
                {subtitle}
              </p>
            )}
            <p className={`text-xs sm:text-sm text-slate-600 font-medium ${isUrdu ? "font-urdu text-sm sm:text-base leading-loose" : "leading-relaxed"}`}>
              {description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm transition-all shadow-xs hover:shadow-md cursor-pointer"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 stroke-[2.5]" />
              <span className={isUrdu ? "font-urdu text-sm font-bold" : ""}>
                {isUrdu ? "واٹس ایپ چینل جوائن کریں" : "Join WhatsApp Channel"}
              </span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-80" />
            </a>

            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-200 transition-all shadow-xs cursor-pointer"
            >
              <span className={isUrdu ? "font-urdu text-sm font-bold" : ""}>
                {isUrdu ? "ٹیلیگرام چینل" : "Telegram Channel"}
              </span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppCommunityBlock;
