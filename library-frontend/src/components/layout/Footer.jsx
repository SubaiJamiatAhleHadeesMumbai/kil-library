import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BuildingLibraryIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
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
  const showFatawa = sectionVisibility.fatawa?.enabled !== false;

  const socialLinks = useMemo(() => ([
    {
      name: "YouTube",
      url: "https://youtube.com/@markaz-ahle-hadees-kokan?si=0P3jFBhjzKzsLCaf",
      icon: <FaYoutube className="w-5 h-5" />,
      color: "hover:bg-red-600 hover:border-red-400",
    },
    {
      name: "Facebook Post",
      url: "https://www.facebook.com/share/p/1KApR5ZNkf/",
      icon: <FaFacebookF className="w-5 h-5" />,
      color: "hover:bg-blue-700 hover:border-blue-500",
    },
    {
      name: "X (Twitter)",
      url: "https://x.com/AhleHadeesKokan",
      icon: <FaXTwitter className="w-5 h-5" />,
      color: "hover:bg-black hover:border-gray-500",
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/markazahlehadeeskokan?igsh=NnVobmRhMHdibDJv",
      icon: <FaInstagram className="w-5 h-5" />,
      color: "hover:bg-pink-600 hover:border-pink-400",
    },
  ]), []);

  return (
    <footer className="bg-[#001D3D] text-white pt-16 pb-8 font-sans border-t border-[#F4A261]/20">
      <div className="app-shell-container grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-[#F4A261]/50">
              <BuildingLibraryIcon className="w-6 h-6 text-[#F4A261]" />
            </div>
            <span className="text-xl font-serif font-bold text-white tracking-wide">AHLE HADEES KOKAN</span>
          </div>

          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            The largest free center of Urdu, Arabic, and English Islamic books.
            Dedicated to preserving and sharing knowledge with the world.
          </p>

          <div>
            <h4 className="text-[#F4A261] font-bold text-sm uppercase tracking-widest mb-4">Follow Us</h4>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.name}
                  className={`group relative w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 ${item.color} shadow-md hover:shadow-xl`}
                >
                  <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-all duration-300 bg-white/20" />
                  <span className="relative z-10 text-white transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6">{item.icon}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[#F4A261] font-bold text-sm uppercase tracking-widest mb-6">Quick Links</h3>
          <ul className="space-y-3 text-sm text-gray-300">
            <li><Link to="/" className="hover:text-white hover:translate-x-1 transition-all block">Home</Link></li>
            <li><Link to="/books" className="hover:text-white hover:translate-x-1 transition-all block">Book Library</Link></li>
            <li><Link to="/authors" className="hover:text-white hover:translate-x-1 transition-all block">Authors</Link></li>
            <li><Link to="/publishers" className="hover:text-white hover:translate-x-1 transition-all block">Publishers</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-[#F4A261] font-bold text-sm uppercase tracking-widest mb-6">Resources</h3>
          <ul className="space-y-3 text-sm text-gray-300">
            <li><a href="#" className="hover:text-white transition-colors">Excel File Download</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Our Other Projects</a></li>
            {showAbout ? <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li> : null}
            {showFatawa ? <li><Link to="/fatawa" className="hover:text-white transition-colors">Fatawa Q&A</Link></li> : null}
          </ul>
        </div>

        <div>
          <h3 className="text-[#F4A261] font-bold text-sm uppercase tracking-widest mb-6">Contact Us</h3>
          <ul className="space-y-4 text-sm text-gray-300">
            <li className="flex items-start gap-3">
              <MapPinIcon className="w-5 h-5 text-[#F4A261] mt-0.5 shrink-0" />
              <span>Bait-us-Salam Complex<br />Bharana Naka Khed Road,<br />Mahad Naka, Khed,<br />Maharashtra 415709</span>
            </li>
            <li className="flex items-center gap-3">
              <EnvelopeIcon className="w-5 h-5 text-[#F4A261] shrink-0" />
              <a 
                href="mailto:markazdawah.khed@gmail.com" 
                className="hover:text-[#F4A261] transition-colors break-all"
                title="Send Email"
              >
                markazdawah.khed@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-3">
              <PhoneIcon className="w-5 h-5 text-[#F4A261] shrink-0" />
              <a 
                href="tel:+919005900585" 
                className="hover:text-[#F4A261] transition-colors"
                title="Call +91 90059 00585"
              >
                +91 90059 00585
              </a>
            </li>
            <li className="flex items-center gap-3">
              <PhoneIcon className="w-5 h-5 text-[#F4A261] shrink-0" />
              <a 
                href="tel:+919005900589" 
                className="hover:text-[#F4A261] transition-colors"
                title="Call +91 90059 00589"
              >
                +91 90059 00589
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="app-shell-container mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} Kokan Islamic Library. All rights reserved.</p>
        <p>Designed for Knowledge</p>
      </div>
    </footer>
  );
};

export default Footer;