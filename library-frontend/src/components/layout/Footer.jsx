import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BuildingLibraryIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BookOpenIcon,
  SparklesIcon,
  ScaleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/solid";
import {
  FaYoutube,
  FaFacebookF,
  FaXTwitter,
  FaInstagram,
} from "react-icons/fa6";

const Footer = () => {
  const socialLinks = useMemo(() => ([
    {
      name: "YouTube",
      handle: "@markaz-ahle-hadees-kokan",
      url: "https://youtube.com/@markaz-ahle-hadees-kokan?si=0P3jFBhjzKzsLCaf",
      icon: <FaYoutube className="w-4 h-4" />,
      color: "bg-red-600 hover:bg-red-700 text-white",
      badge: "سبسکرائب کریں",
    },
    {
      name: "Facebook",
      handle: "Markaz Ahle Hadees Kokan",
      url: "https://www.facebook.com/share/p/1KApR5ZNkf/",
      icon: <FaFacebookF className="w-4 h-4" />,
      color: "bg-blue-600 hover:bg-blue-700 text-white",
      badge: "فالو کریں",
    },
    {
      name: "Instagram",
      handle: "@markazahlehadeeskokan",
      url: "https://www.instagram.com/markazahlehadeeskokan?igsh=NnVobmRhMHdibDJv",
      icon: <FaInstagram className="w-4 h-4" />,
      color: "bg-pink-600 hover:bg-pink-700 text-white",
      badge: "فالو کریں",
    },
    {
      name: "X (Twitter)",
      handle: "@AhleHadeesKokan",
      url: "https://x.com/AhleHadeesKokan",
      icon: <FaXTwitter className="w-4 h-4" />,
      color: "bg-slate-900 hover:bg-black text-white",
      badge: "فالو کریں",
    },
  ]), []);

  const latestBooks = [
    { id: 35869, title: "حدیث رسول کی عظمت امام شافعی کی نظر میں", author: "عبدالواحد انور یوسفی" },
    { id: 35868, title: "دعوت فکر", author: "عبدالواحد انور یوسفی" },
    { id: 35867, title: "ماہ رمضان کے مختصر احکام ومسائل", author: "عبدالواحد انور یوسفی" },
    { id: 35865, title: "عید الاضحی کے احکام اور فضائل", author: "رضاء اللہ عبدالکریم مدنی" },
    { id: "mag", title: "مجلہ الجامعہ (شمارہ 48)", author: "خصوصی اشاعت" },
  ];

  const quickCategories = [
    { title: "سرورق (Home)", link: "/" },
    { title: "تعارفِ مرکز (About Us)", link: "/about" },
    { title: "کتب خانہ (Digital Library)", link: "/books" },
    { title: "مجلہ الجامعہ (Magazine)", link: "/books?q=مجل" },
    { title: "پریس ریلیز و اخباری کٹنگز", link: "/clippings" },
    { title: "دار الافتاء و شرعی رہنمائی", link: "/fatawa" },
    { title: "خطباتِ جمعہ کا شیڈول", link: "/juma-list" },
    { title: "رؤیتِ ہلال اعلانات", link: "/moon" },
  ];

  return (
    <footer data-site-footer className="relative bg-[#072118] text-slate-200 pt-12 pb-24 sm:pb-10 font-sans border-t border-[#C5A059]/30 overflow-hidden shadow-2xl" dir="rtl">
      
      {/* Ambient Radial Aura Lights */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#0F3D2E]/80 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 app-shell-container space-y-8">
        
        {/* ================= IMAGE 5: 4 LUXURY FLOATING WHITE CARDS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* CARD 1: میڈیا اپڈیٹ (Social Media & Updates) */}
          <div className="rounded-2xl border border-[#E6E2DD] bg-white text-slate-800 p-5 shadow-lg flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header Pill */}
              <div className="bg-[#0F3D2E] text-white px-3.5 py-2 rounded-xl flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                  <span>📢</span>
                  <span>میڈیا اپڈیٹ (Media & Social)</span>
                </span>
                <span className="text-[10px] text-[#C5A059] font-bold">لائیو</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                مرکز اہل حدیث کوکن کے آفیشل سوشل میڈیا چینلز سے جڑیں اور تازہ ترین ویڈیوز، بیانات اور اعلانات حاصل کریں۔
              </p>

              {/* Social Channels List */}
              <div className="space-y-2 pt-1">
                {socialLinks.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shadow-xs ${item.color}`}>
                        {item.icon}
                      </div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-[#0F3D2E] transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                      <span>{item.badge}</span>
                      <ArrowTopRightOnSquareIcon className="w-3 h-3 text-slate-400" />
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 font-medium">
                آفیشل میڈیا سیل • مرکز اہل حدیث کوکن
              </span>
            </div>
          </div>

          {/* CARD 2: برائے رابطہ (Contact & Location with Embedded Map) */}
          <div className="rounded-2xl border border-[#E6E2DD] bg-white text-slate-800 p-5 shadow-lg flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header Pill */}
              <div className="bg-[#0F3D2E] text-white px-3.5 py-2 rounded-xl flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                  <span>📍</span>
                  <span>برائے رابطہ (Contact & Location)</span>
                </span>
              </div>

              {/* Contact Details */}
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <MapPinIcon className="w-4 h-4 text-[#0F3D2E] mt-0.5 shrink-0" />
                  <span className="leading-relaxed" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                    بیت السلام کمپلیکس، بھرنا ناکہ، کھیڈ، رتناگری، مہاراشٹر 415709
                  </span>
                </li>

                <li className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-[#0F3D2E] shrink-0" />
                  <a href="tel:+919005900585" className="hover:text-[#0F3D2E] font-mono font-bold" dir="ltr">
                    +91 90059 00585
                  </a>
                </li>

                <li className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-[#0F3D2E] shrink-0" />
                  <a href="tel:+919005900589" className="hover:text-[#0F3D2E] font-mono font-bold" dir="ltr">
                    +91 90059 00589
                  </a>
                </li>

                <li className="flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4 text-[#0F3D2E] shrink-0" />
                  <a href="mailto:markazdawah.khed@gmail.com" className="hover:text-[#0F3D2E] font-mono text-[11px] truncate" dir="ltr">
                    markazdawah.khed@gmail.com
                  </a>
                </li>
              </ul>

              {/* Embedded Google Map Preview */}
              <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                <iframe
                  title="Markaz Google Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3809.5293297721867!2d73.3854153!3d17.7196656!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be992c68c130d21%3A0xe968d904baec40f8!2sBaitus%20Salam%20Complex%2C%20Khed!5e0!3m2!1sen!2sin!4v1716100000000!5m2!1sen!2sin"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100">
              <a
                href="https://maps.google.com/?q=Baitus+Salam+Complex+Khed+Ratnagiri"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-1.5 rounded-xl bg-[#0F3D2E] hover:bg-[#165B44] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <MapPinIcon className="w-3.5 h-3.5" />
                <span>گوگل میپ پر لوکیشن کھولیں</span>
              </a>
            </div>
          </div>

          {/* CARD 3: تازہ ترین (Latest Publications) */}
          <div className="rounded-2xl border border-[#E6E2DD] bg-white text-slate-800 p-5 shadow-lg flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header Pill */}
              <div className="bg-[#0F3D2E] text-white px-3.5 py-2 rounded-xl flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                  <span>📚</span>
                  <span>تازہ ترین (Latest Books)</span>
                </span>
                <span className="text-[10px] text-[#C5A059] font-bold">نئی کتب</span>
              </div>

              {/* Latest Publications List */}
              <ul className="space-y-2.5">
                {latestBooks.map((item, idx) => (
                  <li key={idx}>
                    <Link
                      to={item.id === "mag" ? "/books?q=مجل" : `/read/${item.id}`}
                      className="group flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition"
                    >
                      <span className="text-[#0F3D2E] font-bold text-xs mt-0.5">✦</span>
                      <div className="min-w-0 flex-1">
                        <h5 
                          className="text-xs font-bold text-slate-800 group-hover:text-[#0F3D2E] transition-colors line-clamp-1 leading-snug"
                          style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                        >
                          {item.title}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-medium truncate">
                          {item.author}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100">
              <Link
                to="/books"
                className="w-full py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>تمام کتب خانہ دیکھیں</span>
                <span>←</span>
              </Link>
            </div>
          </div>

          {/* CARD 4: اقسام (Quick Categories & Navigation) */}
          <div className="rounded-2xl border border-[#E6E2DD] bg-white text-slate-800 p-5 shadow-lg flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header Pill */}
              <div className="bg-[#0F3D2E] text-white px-3.5 py-2 rounded-xl flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}>
                  <span>📑</span>
                  <span>اقسام (Quick Portals)</span>
                </span>
                <span className="text-[10px] text-[#C5A059] font-bold">روابط</span>
              </div>

              {/* Categories Links Grid */}
              <ul className="space-y-2">
                {quickCategories.map((item, idx) => (
                  <li key={idx}>
                    <Link
                      to={item.link}
                      className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-emerald-50/60 transition text-xs font-semibold text-slate-700 hover:text-[#0F3D2E]"
                      style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-[#C5A059] text-[10px]">•</span>
                        <span>{item.title}</span>
                      </span>
                      <ChevronLeftIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F3D2E] group-hover:-translate-x-0.5 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 font-medium">
                مستند اسلامی پورٹل • 100% مفت
              </span>
            </div>
          </div>

        </div>

        {/* Decorative Golden Divider */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent" />

        {/* Bottom Copyright & Mission Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-300">
          <p className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Kokan Islamic Library (مرکز اہل حدیث کوکن). All rights reserved.</span>
          </p>
          <p 
            className="text-[#C5A059] font-semibold text-xs sm:text-sm"
            style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
          >
            خدمتِ دینِ حق اور اشاعتِ علومِ نبویہ کے لیے وقف
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;