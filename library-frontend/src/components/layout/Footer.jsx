import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BuildingLibraryIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BookOpenIcon,
  SparklesIcon,
  ScaleIcon,
  CalendarDaysIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import {
  FaYoutube,
  FaFacebookF,
  FaXTwitter,
  FaInstagram,
} from "react-icons/fa6";
import settingsService from "../../api/settingsService";

const Footer = () => {
  const [homepageSettings, setHomepageSettings] = useState(null);

  useEffect(() => {
    let mounted = true;
    settingsService.getHomepageSettings().then((data) => {
      if (mounted) setHomepageSettings(data || {});
    }).catch(() => {
      if (mounted) setHomepageSettings({});
    });
    return () => {
      mounted = false;
    };
  }, []);

  const sectionVisibility = homepageSettings?.sections || {};
  const showAbout = sectionVisibility.about?.enabled !== false;

  const socialLinks = useMemo(() => ([
    {
      name: "YouTube",
      url: "https://youtube.com/@markaz-ahle-hadees-kokan?si=0P3jFBhjzKzsLCaf",
      icon: <FaYoutube className="w-4 h-4" />,
      color: "hover:bg-red-600 hover:border-red-400 hover:text-white",
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/share/p/1KApR5ZNkf/",
      icon: <FaFacebookF className="w-4 h-4" />,
      color: "hover:bg-blue-600 hover:border-blue-400 hover:text-white",
    },
    {
      name: "X (Twitter)",
      url: "https://x.com/AhleHadeesKokan",
      icon: <FaXTwitter className="w-4 h-4" />,
      color: "hover:bg-black hover:border-amber-400/50 hover:text-amber-200",
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/markazahlehadeeskokan?igsh=NnVobmRhMHdibDJv",
      icon: <FaInstagram className="w-4 h-4" />,
      color: "hover:bg-pink-600 hover:border-pink-400 hover:text-white",
    },
  ]), []);

  return (
    <footer data-site-footer className="relative bg-gradient-to-b from-[#031525] via-[#052827] to-[#010911] text-white pt-16 pb-8 font-sans border-t-2 border-amber-500/25 overflow-hidden shadow-2xl">
      {/* Subtle Islamic Arabesque Geometric Watermark Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4af37' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0l40 40-40 40L0 40zm40-28.284L11.716 40 40 68.284 68.284 40 40 11.716zm0 14.142L25.858 40 40 54.142 54.142 40 40 25.858z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Ambient Radial Lights */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 app-shell-container grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12">
        {/* Brand & Introduction */}
        <div className="col-span-1 md:col-span-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center border border-amber-400/40 shadow-lg shadow-amber-950/20">
              <BuildingLibraryIcon className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <span 
                className="text-lg font-bold text-white block leading-tight tracking-wide drop-shadow-sm"
                style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', 'Noto Nastaliq Urdu', serif" }}
              >
                مرکز اہل حدیث کوکن
              </span>
              <span className="text-[10px] text-amber-300 font-bold tracking-widest uppercase block mt-0.5">
                Kokan Islamic Library
              </span>
            </div>
          </div>

          <p 
            className="text-slate-300/90 text-xs sm:text-sm leading-relaxed"
            style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', 'Noto Nastaliq Urdu', serif", lineHeight: "1.9" }}
          >
            مستند اسلامی علوم، تفاسیر، کتبِ احادیث، فقہ اور فتاویٰ کا جدید ڈیجیٹل ذخیرہ، جو خالص کتاب و سنت کی اشاعت کے لیے وقف ہے۔
          </p>

          <div>
            <h4 className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>ہم سے جڑیں • Follow Us</span>
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {socialLinks.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.name}
                  className={`group relative w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-amber-400/25 transition-all duration-300 text-amber-200/90 hover:scale-110 active:scale-95 ${item.color} shadow-sm hover:shadow-amber-500/20`}
                >
                  <span className="relative z-10 transition-transform duration-300">{item.icon}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Islamic Portals */}
        <div>
          <h3 className="text-amber-300 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-amber-500/20 pb-2">
            <BookOpenIcon className="w-4 h-4 text-amber-400" />
            <span>اہم علمی شعبہ جات</span>
          </h3>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
            <li>
              <Link to="/library" className="hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-amber-400/60">•</span>
                <span style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', serif" }}>کتب خانہ (Digital Library)</span>
              </Link>
            </li>
            <li>
              <Link to="/fatawa" className="hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-amber-400/60">•</span>
                <span style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', serif" }}>دار الافتاء و شرعی رہنمائی</span>
              </Link>
            </li>
            <li>
              <Link to="/juma-list" className="hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-amber-400/60">•</span>
                <span style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', serif" }}>خطباتِ جمعہ کا شیڈول</span>
              </Link>
            </li>
            <li>
              <Link to="/calendar" className="hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-amber-400/60">•</span>
                <span style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', serif" }}>اسلامی تقویم و کلینڈر</span>
              </Link>
            </li>
            <li>
              <Link to="/clippings" className="hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-amber-400/60">•</span>
                <span style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', serif" }}>اخباری کٹنگز و میڈیا</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources & Markaz */}
        <div>
          <h3 className="text-amber-300 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-amber-500/20 pb-2">
            <ScaleIcon className="w-4 h-4 text-amber-400" />
            <span>مرکز کے بارے میں</span>
          </h3>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
            {showAbout && (
              <li>
                <Link to="/about" className="hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-2">
                  <span className="text-amber-400/60">•</span>
                  <span style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', serif" }}>تعارف و قیامِ مرکز</span>
                </Link>
              </li>
            )}
            <li>
              <Link to="/gallery" className="hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-amber-400/60">•</span>
                <span style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', serif" }}>تصویری نگارخانہ (Gallery)</span>
              </Link>
            </li>
            <li>
              <Link to="/activities" className="hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-amber-400/60">•</span>
                <span style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', serif" }}>تعلیمی و سماجی سرگرمیاں</span>
              </Link>
            </li>
            <li>
              <Link to="/moon" className="hover:text-amber-300 hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-amber-400/60">•</span>
                <span style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', serif" }}>رؤیتِ ہلال اعلانات</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Us */}
        <div>
          <h3 className="text-amber-300 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-amber-500/20 pb-2">
            <MapPinIcon className="w-4 h-4 text-amber-400" />
            <span>رابطہ و پتہ • Contact Us</span>
          </h3>
          <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <MapPinIcon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-slate-300/90 leading-relaxed">
                بیت السلام کمپلیکس، بھرنا ناکہ کھیڈ روڈ، مہاڑ ناکہ، کھیڈ، رتناگری، مہاراشٹر 415709
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <EnvelopeIcon className="w-4 h-4 text-amber-400 shrink-0" />
              <a 
                href="mailto:markazdawah.khed@gmail.com" 
                className="hover:text-amber-300 transition-colors break-all text-xs"
                title="Send Email"
              >
                markazdawah.khed@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <PhoneIcon className="w-4 h-4 text-amber-400 shrink-0" />
              <a 
                href="tel:+919005900585" 
                className="hover:text-amber-300 transition-colors text-xs font-mono"
                title="Call +91 90059 00585"
              >
                +91 90059 00585
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <PhoneIcon className="w-4 h-4 text-amber-400 shrink-0" />
              <a 
                href="tel:+919005900589" 
                className="hover:text-amber-300 transition-colors text-xs font-mono"
                title="Call +91 90059 00589"
              >
                +91 90059 00589
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Decorative Golden Divider */}
      <div className="app-shell-container mt-12 mb-6">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 app-shell-container flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-400">
        <p className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Kokan Islamic Library. All rights reserved.</span>
        </p>
        <p 
          className="text-amber-300/80 font-medium"
          style={{ fontFamily: "'Mehr Nastaliq Web', 'Mehr', 'Noto Nastaliq Urdu', serif" }}
        >
          خدمتِ دینِ حق اور اشاعتِ علومِ نبویہ کے لیے وقف
        </p>
      </div>
    </footer>
  );
};

export default Footer;