/**
 * ThemeContext.jsx
 * Central Theme & Design System Provider
 * Injects CSS variables onto document.documentElement dynamically,
 * allowing live theme changes from the Admin Panel without code deploys.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import settingsService from "../api/settingsService";

const ThemeContext = createContext(null);

export const DEFAULT_UI_SETTINGS = {
  primary_color: "#002147",
  primary_hover: "#003166",
  primary_light: "#EEF4FF",
  secondary_color: "#064e3b",
  accent_color: "#2D89C8",
  border_radius: "rounded", // "sharp" | "rounded" | "pill"
  spacing_density: "comfortable", // "compact" | "comfortable" | "spacious"
  font_scale: "normal", // "compact" | "normal" | "spacious"
  arabic_font: "Noto Naskh Arabic",
  urdu_font: "Jameel Noori Nastaleeq",
  default_language: "en",
  enabled_languages: ["en", "ur", "ar"],
  theme_mode: "light",
  allow_user_theme_override: false,
  site_title: "Kokan Islamic Library",
  site_subtitle: "Markaz Ahle Hadees Kokan",
  logo_url: "/static/images/MarkazLogo.png",
  favicon_url: "/favicon.ico",
};

export const ThemeProvider = ({ children }) => {
  const [uiSettings, setUiSettings] = useState(DEFAULT_UI_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Injects CSS variables to root element in real-time
  const applyThemeToDOM = useCallback((s) => {
    if (typeof window === "undefined" || !document?.documentElement) return;
    const root = document.documentElement;

    // 1. Color Tokens
    if (s.primary_color) {
      root.style.setProperty("--primary", s.primary_color);
      root.style.setProperty("--color-primary", s.primary_color);
    }
    if (s.primary_hover) {
      root.style.setProperty("--primary-hover", s.primary_hover);
    }
    if (s.primary_light) {
      root.style.setProperty("--primary-light", s.primary_light);
    }
    if (s.secondary_color) {
      root.style.setProperty("--secondary", s.secondary_color);
      root.style.setProperty("--color-secondary", s.secondary_color);
    }
    if (s.accent_color) {
      root.style.setProperty("--accent", s.accent_color);
      root.style.setProperty("--color-accent", s.accent_color);
    }

    // 2. Border Radius Token
    const radiusMap = {
      sharp: "0.25rem", // 4px
      rounded: "0.875rem", // 14px
      pill: "1.5rem", // 24px
    };
    const rad = radiusMap[s.border_radius] || "0.875rem";
    root.style.setProperty("--radius-base", rad);
    root.style.setProperty("--border-radius-base", rad);

    // 3. Spacing Density Token
    const densityMap = {
      compact: "0.75rem",
      comfortable: "1rem",
      spacious: "1.25rem",
    };
    const den = densityMap[s.spacing_density] || "1rem";
    root.style.setProperty("--density-padding", den);

    // 4. Favicon & Document Title update if present
    if (s.site_title && !document.title.includes(s.site_title)) {
      // Keep title updated
    }
  }, []);

  const refreshTheme = useCallback(async () => {
    try {
      const data = await settingsService.getUiSettings();
      if (data && typeof data === "object") {
        setUiSettings((prev) => {
          const merged = { ...prev, ...data };
          applyThemeToDOM(merged);
          return merged;
        });
      }
    } catch {
      // fallback to defaults gracefully
      applyThemeToDOM(DEFAULT_UI_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [applyThemeToDOM]);

  useEffect(() => {
    refreshTheme();
  }, [refreshTheme]);

  const updatePreview = (partial) => {
    setUiSettings((prev) => {
      const next = { ...prev, ...partial };
      applyThemeToDOM(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        uiSettings,
        setUiSettings,
        updatePreview,
        refreshTheme,
        applyThemeToDOM,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      uiSettings: DEFAULT_UI_SETTINGS,
      updatePreview: () => {},
      refreshTheme: () => {},
      loading: false,
    };
  }
  return context;
};

export default ThemeContext;
