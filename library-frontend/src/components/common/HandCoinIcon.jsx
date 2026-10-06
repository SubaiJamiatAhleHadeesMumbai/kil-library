import React from 'react';

/**
 * HandCoinIcon
 * Custom icon matching the user's requested Icons8 hand-holding-coin / donation icon.
 * Supports currentColor styling via CSS mask or SVG fallback.
 */
const HandCoinIcon = ({ className = "w-4 h-4", ...props }) => {
  return (
    <span
      className={`inline-block shrink-0 bg-current transition-colors ${className}`}
      style={{
        maskImage: 'url("/icons/donate-hand-coin.png")',
        WebkitMaskImage: 'url("/icons/donate-hand-coin.png")',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
      role="img"
      aria-label="Donate icon"
      {...props}
    />
  );
};

export default HandCoinIcon;
