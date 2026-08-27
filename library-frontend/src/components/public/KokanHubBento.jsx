import React from "react";
import { Link } from "react-router-dom";
import {
  BookOpenIcon,
  NewspaperIcon,
  AcademicCapIcon,
  HeartIcon,
  ArrowRightIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";

const KokanHubBento = ({ config = {} }) => {
  const title = config?.title || "Explore Markaz Portals";
  const subtitle = config?.subtitle || "مرکز اہل حدیث کوکن — اہم ڈیجیٹل شعبہ جات";

  const cards = [
    {
      id: "library",
      title: "Digital Islamic Library",
      titleUrdu: "ڈیجیٹل اسلامی کتب خانہ",
      description: "Access 10,000+ classical & contemporary Islamic books, manuscripts, authors & publishers.",
      link: "/library",
      badge: "10,000+ Books",
      icon: BookOpenIcon,
      accent: "from-blue-600 to-indigo-800",
      bgGradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
      borderColor: "border-blue-200/80 hover:border-blue-500",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200"
    },
    {
      id: "clippings",
      title: "Press & Newspaper Clippings",
      titleUrdu: "اخباری کٹنگز و میڈیا کوریج",
      description: "Archived press releases, newspaper reports from Roznama Inquilab, Urdu Times, and official news.",
      link: "/clippings",
      badge: "Newspaper Archives",
      icon: NewspaperIcon,
      accent: "from-emerald-600 to-teal-800",
      bgGradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      borderColor: "border-emerald-200/80 hover:border-emerald-500",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200"
    },
    {
      id: "fatawa",
      title: "Darul Ifta & Fatawa Portal",
      titleUrdu: "دار الافتاء و شرعی رہنمائی",
      description: "Search verified Islamic rulings, ask Shar'i questions to qualified scholars, and browse research.",
      link: "/fatawa",
      badge: "Verified Q&A",
      icon: AcademicCapIcon,
      accent: "from-amber-600 to-yellow-800",
      bgGradient: "from-amber-500/10 via-yellow-500/5 to-transparent",
      borderColor: "border-amber-200/80 hover:border-amber-500",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200"
    },
    {
      id: "welfare",
      title: "Education & Social Welfare",
      titleUrdu: "تعلیمی و سماجی فلاحی سرگرمیاں",
      description: "Community schools, free medical camps, disaster relief, and welfare programs across Kokan.",
      link: "/activities",
      badge: "Social Impact",
      icon: HeartIcon,
      accent: "from-rose-600 to-pink-800",
      bgGradient: "from-rose-500/10 via-pink-500/5 to-transparent",
      borderColor: "border-rose-200/80 hover:border-rose-500",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200"
    }
  ];

  return (
    <section className="py-8 px-4 max-w-7xl mx-auto font-sans">
      {/* Section Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs">
          <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>Kokan Hub Portals</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm font-urdu font-semibold text-slate-500" dir="rtl">
            {subtitle}
          </p>
        )}
      </div>

      {/* 4-Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.id}
              to={card.link}
              className={`group relative rounded-3xl border ${card.borderColor} bg-white p-6 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden hover:-translate-y-1`}
            >
              {/* Background ambient gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none`} />

              <div className="relative z-10 space-y-4">
                {/* Icon & Badge Row */}
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.accent} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 stroke-[2]" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                {/* Titles */}
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-xs font-urdu font-bold text-slate-500 leading-tight" dir="rtl">
                    {card.titleUrdu}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Bottom CTA Arrow */}
              <div className="relative z-10 pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-emerald-700">
                <span>Enter Portal</span>
                <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default KokanHubBento;
