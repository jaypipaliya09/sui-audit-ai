import React from 'react';

/**
 * SuiAudit AI brand mark — a faceted "aegis" crest:
 *   • outer shield (security)            • inner hairline facet (depth / craft)
 *   • bold audit check (verification)    • AI spark glint (intelligence)
 *
 * Uses `currentColor`, so colour is driven by the parent's text colour.
 * Designed to read cleanly from 16px (favicon) to large hero sizes.
 */
export function LogoMark({
  className = '',
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      {/* outer faceted shield */}
      <path
        d="M20 3.6 L31.6 8 C32.1 8.2 32.4 8.6 32.4 9.2 V19.4 C32.4 27 27.1 32.6 20.5 35.8 C20.2 35.95 19.8 35.95 19.5 35.8 C12.9 32.6 7.6 27 7.6 19.4 V9.2 C7.6 8.6 7.9 8.2 8.4 8 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* inner facet line */}
      <path
        d="M20 7.7 L28.7 11 V18.8 C28.7 24.5 24.9 28.8 20 31.1 C15.1 28.8 11.3 24.5 11.3 18.8 V11 Z"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth={strokeWidth * 0.7}
        strokeLinejoin="round"
      />
      {/* audit check */}
      <path
        d="M15.1 19.9 l3.4 3.4 l6.6 -7.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* AI spark glint */}
      <path
        d="M28 7 L28.85 9.15 L31 10 L28.85 10.85 L28 13 L27.15 10.85 L25 10 L27.15 9.15 Z"
        fill="currentColor"
      />
    </svg>
  );
}
