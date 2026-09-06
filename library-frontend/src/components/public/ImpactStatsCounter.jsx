import React from "react";
import {
  BookOpenIcon,
  NewspaperIcon,
  AcademicCapIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

const ImpactStatsCounter = ({ config = {} }) => {
  const stats = [
    {
      label: "Islamic Books & Rare Treatises",
      labelUrdu: "کتب و نادر علمی ذخائر",
      value: "10,000+",
      icon: BookOpenIcon,
      accent: "text-blue-600 bg-blue-50 border-blue-200"
    },
    {
      label: "Newspaper & Press Archives",
      labelUrdu: "اخباری کٹنگز و مضامین",
      value: "250+",
      icon: NewspaperIcon,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200"
    },
    {
      label: "Answered Shar'i Fatawa",
      labelUrdu: "مفتیانِ کرام کے شرعی فتاویٰ",
      value: "1,200+",
      icon: AcademicCapIcon,
      accent: "text-amber-600 bg-amber-50 border-amber-200"
    },
    {
      label: "Monthly Active Readers",
      labelUrdu: "ماہانہ قارئین و طلبہ",
      value: "50,000+",
      icon: UserGroupIcon,
      accent: "text-purple-600 bg-purple-50 border-purple-200"
    }
  ];

  return (
    <section className="py-8 px-4 max-w-7xl mx-auto font-sans">
      <div className="rounded-3xl bg-[#001D3D] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-900/50">
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className={`space-y-2 text-center ${idx !== 0 ? "pt-4 sm:pt-0 sm:pl-6" : ""}`}>
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-400 mx-auto flex items-center justify-center border border-white/10 shadow-inner">
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight">
                  {item.value}
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-200">
                  {item.label}
                </p>
                <p className="text-xs font-urdu text-slate-400" dir="rtl">
                  {item.labelUrdu}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ImpactStatsCounter;
