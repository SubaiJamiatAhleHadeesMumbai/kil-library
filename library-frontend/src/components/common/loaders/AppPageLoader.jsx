import React, { useState, useEffect } from "react";
import IslamicSplashLoader from "./IslamicSplashLoader";
import SkeletonPageLoader from "./SkeletonPageLoader";

const SESSION_SPLASH_SEEN_KEY = "kil_splash_seen";

const AppPageLoader = ({
  config = {},
  isPreview = false,
  previewStyle = null,
  onComplete = null
}) => {
  const activeStyle = previewStyle || config?.loader_style || "hybrid"; // 'islamic_splash' | 'skeleton_shimmer' | 'hybrid'
  const theme = config?.splash_theme || "navy"; // 'navy' | 'black' | 'ivory'
  const occasion = config?.occasion_theme || "default"; // 'default' | 'ramadan' | 'eid' | 'conference'
  const showQuote = config?.show_quotes !== false;
  const customQuotes = config?.custom_quotes || null;
  const duration = config?.splash_duration || 1800;

  const [hasSeenSplash, setHasSeenSplash] = useState(() => {
    if (isPreview) return false;
    try {
      return sessionStorage.getItem(SESSION_SPLASH_SEEN_KEY) === "true";
    } catch {
      return false;
    }
  });

  const handleSplashDone = () => {
    if (!isPreview) {
      try {
        sessionStorage.setItem(SESSION_SPLASH_SEEN_KEY, "true");
      } catch {}
      setHasSeenSplash(true);
    }
    if (onComplete) onComplete();
  };

  // 1. Force Skeleton Shimmer
  if (activeStyle === "skeleton_shimmer") {
    return <SkeletonPageLoader />;
  }

  // 2. Hybrid Mode: First time Splash, then Skeleton
  if (activeStyle === "hybrid") {
    if (!hasSeenSplash || isPreview) {
      return (
        <IslamicSplashLoader
          theme={theme}
          occasion={occasion}
          showQuote={showQuote}
          customQuotes={customQuotes}
          duration={duration}
          onComplete={handleSplashDone}
          isPreview={isPreview}
        />
      );
    }
    return <SkeletonPageLoader />;
  }

  // 3. Islamic Splash (Always)
  return (
    <IslamicSplashLoader
      theme={theme}
      occasion={occasion}
      showQuote={showQuote}
      customQuotes={customQuotes}
      duration={duration}
      onComplete={handleSplashDone}
      isPreview={isPreview}
    />
  );
};

export default AppPageLoader;
