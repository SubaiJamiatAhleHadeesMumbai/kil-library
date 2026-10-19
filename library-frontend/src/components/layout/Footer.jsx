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
    <footer data-site-footer className="relative bg-[#0F3D2E] text-slate-200 pt-16 pb-24 sm:pb-10 font-sans border-t border-[#C5A059]/20 overflow-hidden shadow-xl notranslate" translate="no">

      {/* Ambient Radial Lights */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#0A2A20] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 app-shell-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
        {/* Brand & Introduction */}
        <div className="col-span-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#0A2A20] rounded-2xl flex items-center justify-center border border-[#C5A059]/40 shadow-lg">
              <BuildingLibraryIcon className="w-6 h-6 text-[#C5A059]" />
            </div>
            <div>
              <span 
                className="text-lg font-bold text-white block leading-tight tracking-wide drop-shadow-sm"
                style={{ fontFamily: "'Noto Naskh Arabic', 'Plus Jakarta Sans', system-ui, sans-serif" }}
              >
                مرکز اہل حدیث کوکن
              </span>
              <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase block mt-0.5">
                Kokan Islamic Library
              </span>
            </div>
          </div>

          <p 
            className="text-slate-300 text-xs sm:text-sm leading-relaxed"
            style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
          >
            مستند اسلامی علوم، تفاسیر، کتبِ احادیث، فقہ اور فتاویٰ کا جدید ڈیجیٹل ذخیرہ، جو خالص کتاب و سنت کی اشاعت کے لیے وقف ہے۔
          </p>

          <div>
            <h4 className="text-[#C5A059] font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-[#C5A059]" />
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
                  className={`group relative w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-[#C5A059]/30 transition-all duration-300 text-[#C5A059] hover:scale-110 active:scale-95 ${item.color} shadow-sm`}
                >
                  <span className="relative z-10 transition-transform duration-300">{item.icon}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Islamic Portals */}
        <div>
          <h3 className="text-[#C5A059] font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[#C5A059]/20 pb-2">
            <BookOpenIcon className="w-4 h-4 text-[#C5A059]" />
            <span>اہم علمی شعبہ جات</span>
          </h3>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200">
            <li>
              <Link to="/books" className="hover:text-[#C5A059] hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-[#C5A059]">•</span>
                <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>کتب خانہ (Digital Library)</span>
              </Link>
            </li>
            <li>
              <Link to="/fatawa" className="hover:text-[#C5A059] hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-[#C5A059]">•</span>
                <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>دار الافتاء و شرعی رہنمائی</span>
              </Link>
            </li>
            <li>
              <Link to="/juma-list" className="hover:text-[#C5A059] hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-[#C5A059]">•</span>
                <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>خطباتِ جمعہ کا شیڈول</span>
              </Link>
            </li>
            <li>
              <Link to="/calendar" className="hover:text-[#C5A059] hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-[#C5A059]">•</span>
                <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>اسلامی تقویم و کلینڈر</span>
              </Link>
            </li>
            <li>
              <Link to="/clippings" className="hover:text-[#C5A059] hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-[#C5A059]">•</span>
                <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>اخباری کٹنگز و میڈیا</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources & Markaz */}
        <div>
          <h3 className="text-[#C5A059] font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[#C5A059]/20 pb-2">
            <ScaleIcon className="w-4 h-4 text-[#C5A059]" />
            <span>مرکز کے بارے میں</span>
          </h3>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-200">
            {showAbout && (
              <li>
                <Link to="/about" className="hover:text-[#C5A059] hover:translate-x-1 transition-all flex items-center gap-2">
                  <span className="text-[#C5A059]">•</span>
                  <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>تعارف و قیامِ مرکز</span>
                </Link>
              </li>
            )}
            <li>
              <Link to="/gallery" className="hover:text-[#C5A059] hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-[#C5A059]">•</span>
                <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>تصویری نگارخانہ (Gallery)</span>
              </Link>
            </li>
            <li>
              <Link to="/activities" className="hover:text-[#C5A059] hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-[#C5A059]">•</span>
                <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>تعلیمی و سماجی سرگرمیاں</span>
              </Link>
            </li>
            <li>
              <Link to="/moon" className="hover:text-[#C5A059] hover:translate-x-1 transition-all flex items-center gap-2">
                <span className="text-[#C5A059]">•</span>
                <span style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>رؤیتِ ہلال اعلانات</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Us */}
        <div>
          <h3 className="text-[#C5A059] font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[#C5A059]/20 pb-2">
            <MapPinIcon className="w-4 h-4 text-[#C5A059]" />
            <span>رابطہ و پتہ</span>
          </h3>
          <ul className="space-y-3.5 text-xs sm:text-sm text-slate-200">
            <li className="flex items-start gap-2.5">
              <MapPinIcon className="w-4 h-4 text-[#C5A059] mt-0.5 shrink-0" />
              <span className="text-slate-300 leading-relaxed" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }} dir="rtl">
                بیت السلام کمپلیکس، بھرنا ناکہ، کھیڈ، رتناگری، مہاراشٹر 415709
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <EnvelopeIcon className="w-4 h-4 text-[#C5A059] shrink-0" />
              <a 
                href="mailto:markazdawah.khed@gmail.com" 
                className="hover:text-[#C5A059] transition-colors break-all text-xs font-mono"
                dir="ltr"
                title="Send Email"
              >
                markazdawah.khed@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <PhoneIcon className="w-4 h-4 text-[#C5A059] shrink-0" />
              <a 
                href="tel:+919005900585" 
                className="hover:text-[#C5A059] transition-colors text-xs font-mono"
                dir="ltr"
                title="Call +91 90059 00585"
              >
                +91 90059 00585
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <PhoneIcon className="w-4 h-4 text-[#C5A059] shrink-0" />
              <a 
                href="tel:+919005900589" 
                className="hover:text-[#C5A059] transition-colors text-xs font-mono"
                dir="ltr"
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
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#C5A059]/50 to-transparent" />
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 app-shell-container flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-400">
        <p className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Kokan Islamic Library. All rights reserved.</span>
        </p>
        <p 
          className="text-[#C5A059]/90 font-medium"
          style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
        >
          خدمتِ دینِ حق اور اشاعتِ علومِ نبویہ کے لیے وقف
        </p>
      </div>
    </footer>
  );
};

export default Footer;