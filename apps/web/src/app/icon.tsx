import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #34d399 0%, #6ee7b7 45%, #d4bd8a 100%)',
          borderRadius: '8px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
          {/* outer faceted shield */}
          <path
            d="M20 3.6 L31.6 8 C32.1 8.2 32.4 8.6 32.4 9.2 V19.4 C32.4 27 27.1 32.6 20.5 35.8 C20.2 35.95 19.8 35.95 19.5 35.8 C12.9 32.6 7.6 27 7.6 19.4 V9.2 C7.6 8.6 7.9 8.2 8.4 8 Z"
            fill="#04140d"
            fillOpacity="0.12"
            stroke="#04140d"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* audit check */}
          <path
            d="M15.1 19.9 l3.4 3.4 l6.6 -7.5"
            stroke="#04140d"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* AI spark glint */}
          <path
            d="M28 7 L28.85 9.15 L31 10 L28.85 10.85 L28 13 L27.15 10.85 L25 10 L27.15 9.15 Z"
            fill="#04140d"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
