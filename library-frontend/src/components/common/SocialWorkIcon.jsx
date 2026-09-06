import React from 'react';

const SocialWorkIcon = ({ className = "w-5 h-5", imgClass = "" }) => {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <img
        src="/icons/social-work.png"
        alt="Social Work"
        className={`w-full h-full object-contain ${imgClass}`}
        onError={(e) => {
          // Fallback SVG if image not loaded
          e.target.style.display = 'none';
        }}
      />
    </span>
  );
};

export default SocialWorkIcon;
