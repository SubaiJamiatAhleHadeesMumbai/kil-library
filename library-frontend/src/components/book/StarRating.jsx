/**
 * StarRating — Reusable interactive & read-only star rating component
 * Props:
 *   value: number (0-5)
 *   onChange: (val) => void   — if provided, it becomes interactive
 *   size: "sm" | "md" | "lg"
 *   showLabel: bool
 */
import React, { useState } from "react";

const StarRating = ({ value = 0, onChange, size = "md", showLabel = false }) => {
  const [hovered, setHovered] = useState(0);
  const isInteractive = typeof onChange === "function";

  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const display = hovered || value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!isInteractive}
          onClick={() => isInteractive && onChange(star)}
          onMouseEnter={() => isInteractive && setHovered(star)}
          onMouseLeave={() => isInteractive && setHovered(0)}
          className={`transition-colors ${isInteractive ? "cursor-pointer" : "cursor-default"}`}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          <svg
            className={`${sizes[size]} transition-colors`}
            fill={display >= star ? "#F59E0B" : "none"}
            stroke={display >= star ? "#F59E0B" : "#9CA3AF"}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      ))}
      {showLabel && value > 0 && (
        <span className="text-sm text-amber-600 font-medium ml-1">{value.toFixed(1)}</span>
      )}
    </div>
  );
};

export default StarRating;
