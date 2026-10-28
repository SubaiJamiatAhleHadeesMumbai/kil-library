import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/solid";
import {
  FaYoutube,
  FaFacebookF,
  FaInstagram,
} from "react-icons/fa6";

const Footer = () => {
  const socialLinks = useMemo(
    () => [
      {
        name: "YouTube",
        url: "https://youtube.com/@markaz-ahle-hadees-kokan?si=0P3jFBhjzKzsLCaf",
        icon: <FaYoutube className="w-3.5 h-3.5 text-red-600 group-hover:text-white transition-colors" />,
        badge: "سبسکرائب کریں ↗",
      },
      {
        name: "Facebook",
        url: "https://www.facebook.com/share/p/1KApR5ZNkf/",
        icon: <FaFacebookF className="w-3.5 h-3.5 text-blue-600 group-hover:text-white transition-colors" />,
        badge: "فالو کریں ↗",
      },
      {
        name: "Instagram",
        url: "https://www.instagram.com/markazahlehadeeskokan?igsh=NnVobmRhMHdibDJv",
        icon: <FaInstagram className="w-3.5 h-3.5 text-pink-600 group-hover:text-white transition-colors" />,
        badge: "فالو کریں ↗",
      },
    ],
    []
  );

  const quickCategories = [
    { title: "سرورق (صفحہ اول)", link: "/" },
    { title: "تعارفِ مرکز", link: "/about" },
    { title: "کتب خانہ (7,800+ کتب)", link: "/books" },
    { title: "پریس ریلیز و اخباری کٹنگز", link: "/clippings" },
    { title: "خطباتِ جمعہ و رؤیتِ ہلال", link: "/juma-list" },
    { title: "دار الافتاء", link: "/fatawa" },
  ];

  const cardClass =
    "rounded-[20px] border-[1.5px] border-[#C8DDD2] bg-white shadow-[0_10px_25px_-5px_rgba(15,61,46,0.07),0_4px_10px_-2px_rgba(15,61,46,0.04)] overflow-hidden p-4 flex flex-col justify-between space-y-2.5";
  const headerClass =
    "bg-gradient-to-r from-[#E6F2EC] to-[#F3F8F5] border-b-2 border-[#C5A059] text-[#0F3D2E] -mx-4 -mt-4 px-4 py-2.5 font-extrabold text-sm flex justify-between items-center";
  const btnHoverGreen =
    "bg-white text-[#0F3D2E] border-[1.5px] border-[#0F3D2E]/25 hover:bg-[#165B43] hover:text-white hover:border-[#165B43] active:bg-[#165B43] active:text-white transition-all duration-200 cursor-pointer";

  return (
    <footer
      data-site-footer
      className="bg-[#F3F8F5] border-t-2 border-[#C5A059] pt-8 pb-24 sm:pb-6 text-[#0F3D2E] shadow-inner"
      dir="rtl"
    >
      <div className="app-shell-container space-y-5">
        {/* ================= 4 LIGHT PEARL CARDS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* CARD 1: میڈیا اپڈیٹ */}
          <div className={cardClass}>
            <div className="space-y-2.5">
              <div
                className={headerClass}
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>📢 میڈیا اپڈیٹ</span>
                <span className="text-[10px] text-[#165B43] font-bold">
                  آفیشل
                </span>
              </div>

              <p
                className="text-xs text-slate-600 pt-1 leading-relaxed"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                مرکز اہل حدیث کوکن کے آفیشل سوشل میڈیا چینلز سے جڑیں۔
              </p>

              <div className="space-y-1.5 text-xs font-bold">
                {socialLinks.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btnHoverGreen} p-2 rounded-xl flex items-center justify-between group`}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.name}</span>
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                    >
                      {item.badge}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* CARD 2: برائے رابطہ */}
          <div className={cardClass}>
            <div className="space-y-2.5">
              <div
                className={headerClass}
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>📍 برائے رابطہ</span>
                <span className="text-[10px] text-[#165B43] font-bold">
                  کھیڈ
                </span>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 pt-1">
                <li className="flex items-start gap-1.5">
                  <MapPinIcon className="w-4 h-4 text-[#0F3D2E] mt-0.5 shrink-0" />
                  <span
                    className="leading-relaxed"
                    style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
                  >
                    بیت السلام کمپلیکس، بھرنا ناکہ، کھیڈ، رتناگری، مہاراشٹر
                    415709
                  </span>
                </li>
                <li className="flex items-center gap-1.5">
                  <PhoneIcon className="w-3.5 h-3.5 text-[#0F3D2E] shrink-0" />
                  <a
                    href="tel:+919005900585"
                    className="font-mono font-bold text-[#0F3D2E] hover:underline"
                    dir="ltr"
                  >
                    +91 90059 00585 / +91 90059 00589
                  </a>
                </li>
                <li className="flex items-center gap-1.5">
                  <EnvelopeIcon className="w-3.5 h-3.5 text-[#0F3D2E] shrink-0" />
                  <a
                    href="mailto:markazdawah.khed@gmail.com"
                    className="font-mono text-slate-600 hover:text-[#0F3D2E] truncate"
                    dir="ltr"
                  >
                    markazdawah.khed@gmail.com
                  </a>
                </li>
              </ul>
            </div>

            <a
              href="https://maps.google.com/?q=Baitus+Salam+Complex+Khed+Ratnagiri"
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnHoverGreen} w-full py-1.5 rounded-xl text-xs font-bold text-center block`}
              style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
            >
              گوگل میپ پر لوکیشن کھولیں
            </a>
          </div>

          {/* CARD 3: دار الافتاء و شرعی رہنمائی */}
          <div className={cardClass}>
            <div className="space-y-2.5">
              <div
                className={headerClass}
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>⚖️ دار الافتاء و شرعی رہنمائی</span>
                <span className="text-[10px] text-[#165B43] font-bold">
                  فتاویٰ
                </span>
              </div>

              <p
                className="text-base font-bold text-[#0F3D2E] text-center pt-1"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ
              </p>

              <p
                className="text-xs text-slate-600 leading-relaxed"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                روزمرہ کے عبادات، معاملات اور فقہی سوالات پر مستند مفتیانِ کرام
                سے شرعی رہنمائی حاصل کریں۔
              </p>
            </div>

            <Link
              to="/fatawa"
              className={`${btnHoverGreen} w-full py-1.5 rounded-xl text-xs font-bold text-center block`}
              style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
            >
              اپنا سوال ارسال کریں ←
            </Link>
          </div>

          {/* CARD 4: اقسام (فوری روابط) */}
          <div className={cardClass}>
            <div className="space-y-2">
              <div
                className={headerClass}
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                <span>📑 اقسام (فوری روابط)</span>
                <span className="text-[10px] text-[#165B43] font-bold">
                  پورٹل
                </span>
              </div>

              <ul
                className="space-y-1.5 text-xs font-bold text-slate-700 pt-1"
                style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
              >
                {quickCategories.map((item, idx) => (
                  <li key={idx}>
                    <Link
                      to={item.link}
                      className="p-1 rounded-lg hover:bg-[#F3F8F5] hover:text-[#0F3D2E] flex items-center justify-between transition"
                    >
                      <span>• {item.title}</span>
                      <ChevronLeftIcon className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar inside #F3F8F5 Footer */}
        <div
          className="pt-4 border-t border-emerald-900/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-extrabold text-[#0F3D2E]"
          style={{ fontFamily: "'Noto Naskh Arabic', sans-serif" }}
        >
          <span>© {new Date().getFullYear()} کوکن اسلامک لائبریری (مرکز اہل حدیث کوکن)</span>
          <span className="text-[#165B43]">
            خدمتِ دینِ حق اور اشاعتِ علومِ نبویہ کے لیے وقف
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
