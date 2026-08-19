import React, { useEffect, useState } from "react";
import {
  BuildingLibraryIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/solid";
import { motion, useScroll, useTransform } from "framer-motion";

const STAR_COLORS = [
  "rgba(255,255,255,.9)",
  "rgba(173,216,230,.9)",
  "rgba(244,162,97,.9)",
  "rgba(180,130,255,.9)",
];

const LibraryHero = () => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [night, setNight] = useState(true);
  const [shoot, setShoot] = useState(false);

  /* ================= Mouse Parallax ================= */
  useEffect(() => {
    const move = (e) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 12,
        y: (e.clientY / window.innerHeight - 0.5) * 12,
      });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  /* ================= Shooting Star ================= */
  useEffect(() => {
    if (!night) return;
    const t = setInterval(() => {
      setShoot(true);
      setTimeout(() => setShoot(false), 1200);
    }, Math.random() * 6000 + 5000);
    return () => clearInterval(t);
  }, [night]);

  /* ================= Scroll Zoom ================= */
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 300], [1, 0.93]);

  return (
    <motion.div
      style={{ scale }}
      className="relative w-full overflow-hidden bg-[#000814]"
    >
      {/* ================= BACKGROUND ================= */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${mouse.x}px, ${mouse.y}px)`,
          transition: "transform .2s ease-out",
        }}
      >
        {/* Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg,#000814,#001D3D,#003566)",
            backgroundSize: "300% 300%",
            animation: "gradientMove 30s ease infinite",
            opacity: night ? 1 : 0.6,
          }}
        />

        {/* ===== AI SCANNING LINES ===== */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-full h-[2px] bg-cyan-400/30 animate-scanY" />
          <div className="absolute h-full w-[2px] bg-blue-400/20 animate-scanX" />
        </div>

        {/* ===== BINARY CODE RAIN ===== */}
        {night &&
          [...Array(10)].map((_, i) => (
            <span
              key={i}
              className="absolute hidden text-[10px] font-mono text-green-400/14 animate-binary sm:block"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            >
              0101 101
            </span>
          ))}

        {/* ===== NETWORK NODES ===== */}
        {night &&
          [...Array(6)].map((_, i) => (
            <span
              key={i}
              className="absolute hidden h-2 w-2 rounded-full bg-cyan-300/25 blur-[1px] animate-node sm:block"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}

        {/* ===== STARS ===== */}
        {night &&
          [...Array(28)].map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full animate-star"
              style={{
                width: `${Math.random() * 1.8 + 0.8}px`,
                height: `${Math.random() * 1.8 + 0.8}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: STAR_COLORS[i % STAR_COLORS.length],
                boxShadow: `0 0 6px ${
                  STAR_COLORS[i % STAR_COLORS.length]
                }`,
                animationDuration: `${Math.random() * 24 + 18}s`,
              }}
            />
          ))}

        {/* ===== SOFT FLOATING ORBS ===== */}
        {[...Array(2)].map((_, i) => (
          <span
            key={`orb-${i}`}
            className="absolute rounded-full bg-cyan-300/10 blur-3xl animate-orb"
            style={{
              width: `${140 + i * 34}px`,
              height: `${140 + i * 34}px`,
              left: `${12 + i * 46}%`,
              top: `${10 + i * 14}%`,
              animationDelay: `${i * 1.2}s`,
            }}
          />
        ))}

        {/* ===== SHOOTING STAR ===== */}
        {night && shoot && (
          <span
            className="absolute w-40 h-[2px]"
            style={{
              top: "20%",
              left: "65%",
              background:
                "linear-gradient(90deg,white,transparent)",
              animation: "shoot 1.2s ease-out",
            }}
          />
        )}

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle,transparent 60%,rgba(0,0,0,.7))",
          }}
        />
      </div>

      {/* ================= DAY / NIGHT TOGGLE ================= */}
      {/* <button
        onClick={() => setNight(!night)}
        className="absolute top-5 right-5 z-20 bg-white/10 backdrop-blur-md
        p-2 rounded-full border border-white/20"
      >
        {night ? (
          <SunIcon className="w-5 h-5 text-yellow-300" />
        ) : (
          <MoonIcon className="w-5 h-5 text-indigo-300" />
        )}
      </button> */}

      {/* ================= CONTENT ================= */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:py-12 md:py-20">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/6 p-4 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-6 md:p-8">
          <div className="flex flex-col items-center justify-between gap-5 text-center md:gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80 backdrop-blur-sm">
              <BuildingLibraryIcon className="h-3.5 w-3.5 text-[#F4A261]" />
              Markaz Library
            </div>

            <div className="relative w-full">
              {night && (
                <div
                  className="absolute left-1/2 top-1 -translate-x-1/2 h-32 w-32 rounded-full blur-3xl opacity-30 animate-pulse sm:h-44 sm:w-44 md:-top-8 md:h-60 md:w-60"
                  style={{
                    background:
                      "radial-gradient(circle,#f5d9a6,transparent 70%)",
                  }}
                />
              )}

              <motion.h2
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative mx-auto max-w-2xl text-sm leading-relaxed text-[#F4A261] font-serif sm:text-base md:text-lg"
              >
                يَا أَيُّهَا الَّذِينَ آمَنُوا أَطِيعُوا اللَّهَ وَأَطِيعُوا الرَّسُولَ
              </motion.h2>

              <div className="mx-auto mt-2 h-[2px] w-20 bg-cyan-400/90 animate-cursor sm:w-28" />

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.9 }}
                className="mx-auto mt-3 max-w-3xl text-[clamp(1.65rem,1rem+5vw,3.4rem)] font-serif font-semibold leading-[1.05] text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
              >
                Kokan Islamic Library
              </motion.h1>

              <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-slate-300/90 sm:text-sm md:text-base">
                Explore curated Islamic knowledge with a calm, modern reading experience.
              </p>

              <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:gap-3">
                <a href="#search" className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-cyan-400 sm:px-6">
                  Browse Books
                </a>
                <a href="#book-grid" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-slate-100 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 sm:px-6">
                  View Catalog
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes scanY {
          from { top: -10%; }
          to { top: 110%; }
        }
        .animate-scanY { animation: scanY 8s linear infinite; }

        @keyframes scanX {
          from { left: -10%; }
          to { left: 110%; }
        }
        .animate-scanX { animation: scanX 12s linear infinite; }

        @keyframes star {
          from { transform: translateY(0); opacity: .4; }
          to { transform: translateY(-120vh); opacity: 0; }
        }
        .animate-star { animation: star linear infinite; }

        @keyframes shoot {
          from { transform: translate(0,0); opacity: 1; }
          to { transform: translate(-600px,300px); opacity: 0; }
        }

        @keyframes binary {
          from { top: -10%; opacity: .1; }
          to { top: 110%; opacity: .4; }
        }
        .animate-binary { animation: binary 10s linear infinite; }

        @keyframes node {
          0%,100% { opacity: .3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.6); }
        }
        .animate-node { animation: node 4s ease-in-out infinite; }

        @keyframes orb {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: .35; }
          50% { transform: translateY(-18px) translateX(10px) scale(1.05); opacity: .6; }
        }
        .animate-orb { animation: orb 10s ease-in-out infinite; }

        @keyframes cursor {
          0%,100% { opacity: .3; }
          50% { opacity: 1; }
        }
        .animate-cursor { animation: cursor 1.5s infinite; }
      `}</style>
    </motion.div>
  );
};

export default LibraryHero;
