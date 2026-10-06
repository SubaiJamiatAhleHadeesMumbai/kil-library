import React from "react";
import { Link } from "react-router-dom";
import {
  NewspaperIcon,
  AcademicCapIcon,
  HeartIcon,
  BookmarkIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const KokanHubBento = ({ config = {} }) => {
  const title = config?.title || "Explore Markaz Portals";
  const subtitle = config?.subtitle || "مرکز اہل حدیث کوکن — اہم ڈیجیٹل شعبہ جات";

  const cards = [
    {
      id: "clippings",
      title: "Press & Newspaper Clippings",
      titleUrdu: "اخباری کٹنگز و میڈیا کوریج",
      description: "Archived press releases, newspaper reports from Roznama Inquilab, Urdu Times, and official news.",
      link: "/clippings",
      badge: "Newspaper Archives",
      badgeUrdu: "اخباری آرکائیو",
      icon: NewspaperIcon,
      accent: "from-emerald-700 to-teal-900",
      bgGradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      borderColor: "border-emerald-200/80 hover:border-amber-400/70",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-2xs"
    },
    {
      id: "fatawa",
      title: "Darul Ifta & Fatawa Portal",
      titleUrdu: "دار الافتاء و شرعی رہنمائی",
      description: "Search verified Islamic rulings, ask Shar'i questions to qualified scholars, and browse research.",
      link: "/fatawa",
      badge: "Verified Q&A",
      badgeUrdu: "مصدقہ شرعی فتاویٰ",
      icon: AcademicCapIcon,
      accent: "from-amber-600 to-yellow-800",
      bgGradient: "from-amber-500/10 via-yellow-500/5 to-transparent",
      borderColor: "border-amber-200/80 hover:border-amber-400/90",
      badgeColor: "bg-amber-50 text-amber-900 border-amber-300/80 shadow-2xs"
    },
    {
      id: "welfare",
      title: "Education & Social Welfare",
      titleUrdu: "تعلیمی و سماجی فلاحی سرگرمیاں",
      description: "Community schools, free medical camps, disaster relief, and welfare programs across Kokan.",
      link: "/activities",
      badge: "Social Impact",
      badgeUrdu: "فلاحی و تعلیمی خدمات",
      icon: HeartIcon,
      accent: "from-rose-700 to-rose-950",
      bgGradient: "from-rose-500/10 via-pink-500/5 to-transparent",
      borderColor: "border-rose-200/80 hover:border-amber-400/70",
      badgeColor: "bg-rose-50 text-rose-900 border-rose-200/80 shadow-2xs"
    }
  ];

  return (
    <section className="py-6 px-4 max-w-7xl mx-auto font-sans">
      {/* Section Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-50 via-emerald-50 to-amber-50 text-amber-900 text-xs font-bold border border-amber-300/50 shadow-xs">
          <SparklesIcon className="w-3.5 h-3.5 text-amber-600" />
          <span>Kokan Digital Portals • اہم ڈیجیٹل شعبہ جات</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p 
            className="text-base sm:text-lg font-bold text-slate-600 leading-relaxed" 
            style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', 'Noto Nastaliq Urdu', serif" }}
            dir="rtl"
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* 3-Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.id}
              to={card.link}
              className={`group relative rounded-3xl border ${card.borderColor} bg-white p-6 sm:p-7 shadow-xs hover:shadow-[0_16px_36px_rgba(212,175,55,0.14)] transition-all duration-300 flex flex-col justify-between overflow-hidden hover:-translate-y-1.5`}
            >
              {/* Background ambient gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none`} />

              {/* Decorative top-right corner gold glow */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-400/10 rounded-full blur-xl group-hover:bg-amber-400/25 transition-all pointer-events-none" />

              <div className="relative z-10 space-y-4">
                {/* Icon & Badge Row */}
                <div className="flex items-center justify-between">
                  <div className={`w-13 h-13 rounded-2xl bg-gradient-to-tr ${card.accent} text-white flex items-center justify-center shadow-md group-hover:scale-108 transition-transform border border-white/20`}>
                    <Icon className="w-6 h-6 stroke-[2]" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                {/* Titles */}
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-900 transition-colors leading-snug">
                    {card.title}
                  </h3>
                  <p 
                    className="text-sm font-bold text-amber-900/80 leading-relaxed" 
                    style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', 'Noto Nastaliq Urdu', serif" }}
                    dir="rtl"
                  >
                    {card.titleUrdu}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {card.description}
                </p>
              </div>

              {/* Bottom CTA Arrow */}
              <div className="relative z-10 pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-amber-800 transition-colors">
                <span className="flex items-center gap-1.5 font-bold">
                  <span>Enter Portal</span>
                  <span className="text-[11px] text-slate-400 font-normal">| داخل ہوں</span>
                </span>
                <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-amber-100 group-hover:text-amber-900 flex items-center justify-center transition-all">
                  <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default KokanHubBento;
