import React from 'react';

/**
 * 3D WhatsApp Logo matching icons8-whatsapp-logo-94.png
 */
export const WhatsAppLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} shrink-0 drop-shadow-xs`}
    aria-hidden="true"
  >
    <defs>
      {/* Outer green gradient with 3D depth */}
      <radialGradient id="waGrad" cx="36%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="45%" stopColor="#22C55E" />
        <stop offset="85%" stopColor="#16A34A" />
        <stop offset="100%" stopColor="#15803D" />
      </radialGradient>
      {/* White outer rim bevel */}
      <linearGradient id="waRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.8" />
      </linearGradient>
      {/* Handset drop shadow */}
      <filter id="waShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#0F5132" floodOpacity="0.4" />
      </filter>
    </defs>

    {/* White bevel border with speech tail */}
    <path
      d="M48 6C25.9 6 8 23.9 8 46c0 7.8 2.2 15 6.1 21.2L8.5 86.8c-.4 1.3.8 2.5 2.1 2.1l19.8-5.5C36.4 87.6 42 89.5 48 89.5c22.1 0 40-17.9 40-40C88 23.9 70.1 6 48 6z"
      fill="url(#waRim)"
    />

    {/* Inner green speech bubble */}
    <path
      d="M48 10C27.6 10 11 26.6 11 47c0 7.3 2.1 14.1 5.7 19.8L12.2 81.3c-.3.9.6 1.8 1.5 1.5l14.7-4.4C34.1 82 40.8 84 48 84c20.4 0 37-16.6 37-37S68.4 10 48 10z"
      fill="url(#waGrad)"
    />

    {/* 3D Top-left gloss arc */}
    <path
      d="M24 22c12-9 28-9 40-3 3 1.5 4 4.5 2 7-1.5 2-4.5 2.5-7 1-9-4-21-4-30 2-2 1.5-5 1-6.5-1-1.5-2-1-5 1.5-6z"
      fill="#FFFFFF"
      fillOpacity="0.28"
    />

    {/* White 3D Handset receiver */}
    <path
      d="M34.8 28.5c-1.4-3.2-2.9-3.3-4.3-3.3-1.1 0-2.4 0-3.6 1.2-1.3 1.2-4.8 4.7-4.8 11.5s4.9 13.4 5.6 14.4c.7.9 9.5 15.2 23.6 20.7 11.7 4.6 14.1 3.7 16.6 3.4 2.5-.3 8.1-3.3 9.2-6.5 1.2-3.2 1.2-6 .8-6.5-.3-.6-1.4-.9-2.9-1.7-1.4-.7-8.5-4.2-9.8-4.7-1.3-.5-2.3-.7-3.2.7-.9 1.4-3.7 4.7-4.5 5.6-.8.9-1.7 1.1-3.1.4-1.4-.7-6.1-2.2-11.6-7.1-4.3-3.8-7.2-8.6-8-10-.9-1.4-.1-2.2.6-2.9.7-.7 1.4-1.7 2.2-2.5.7-.9 1-1.5 1.5-2.5.5-1 .3-1.9-.1-2.7-.5-.7-4.3-10.7-6-14.6z"
      fill="#FFFFFF"
      filter="url(#waShadow)"
    />
  </svg>
);

/**
 * 3D Telegram Logo matching icons8-telegram-logo-94.png
 */
export const TelegramLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} shrink-0 drop-shadow-xs`}
    aria-hidden="true"
  >
    <defs>
      {/* 3D Blue Sphere gradient */}
      <radialGradient id="tgGrad" cx="35%" cy="30%" r="68%">
        <stop offset="0%" stopColor="#4CC3FF" />
        <stop offset="40%" stopColor="#29B6F6" />
        <stop offset="80%" stopColor="#0288D1" />
        <stop offset="100%" stopColor="#01579B" />
      </radialGradient>
      {/* Plane drop shadow */}
      <filter id="tgShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2.5" stdDeviation="2" floodColor="#013A63" floodOpacity="0.45" />
      </filter>
    </defs>

    {/* Blue 3D Sphere */}
    <circle cx="48" cy="48" r="42" fill="url(#tgGrad)" />

    {/* Top gloss highlight */}
    <ellipse cx="44" cy="24" rx="26" ry="12" fill="#FFFFFF" fillOpacity="0.22" />

    {/* Paper Airplane */}
    <g filter="url(#tgShadow)">
      {/* Main body */}
      <path
        d="M23 46.5l48-20.5c2.2-.9 4.2 1.1 3.4 3.3L64 73.5c-.7 2.1-3.3 2.8-5 1.3L45.5 62l-8 7.5c-1.1 1-2.9.4-3.1-1.1L33 55.5l-9.5-6.5c-1.8-1.2-1.5-3.8.5-4.5z"
        fill="#FFFFFF"
      />
      {/* Fold shadow */}
      <path
        d="M45.5 62l-11.1-6.5 29.8-18.7-21.2 21.2c-.8.8-1.3 1.8-1.5 2.9l-1 5.6 5-4.5z"
        fill="#DCEBFA"
      />
      {/* Under-wing flap */}
      <path
        d="M34.4 55.5l1.6 9.5 5.5-5.2-7.1-4.3z"
        fill="#B0D5F5"
      />
    </g>
  </svg>
);

/**
 * Open Email Envelope Logo matching icons8-email-open-48.png
 */
export const EmailOpenLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} shrink-0 drop-shadow-xs`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="mailBack" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0288D1" />
        <stop offset="100%" stopColor="#01579B" />
      </linearGradient>
      <linearGradient id="mailFront" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#29B6F6" />
        <stop offset="100%" stopColor="#0288D1" />
      </linearGradient>
      <linearGradient id="mailFlap" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4FC3F7" />
        <stop offset="100%" stopColor="#03A9F4" />
      </linearGradient>
      <filter id="paperShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#013A63" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Back pocket */}
    <rect x="6" y="16" width="36" height="26" rx="4" fill="url(#mailBack)" />

    {/* Open top flap pointed upward */}
    <path
      d="M6 18l18-12 18 12H6z"
      fill="url(#mailFlap)"
    />

    {/* Inner shadow inside envelope */}
    <polygon points="6,18 24,28 42,18" fill="#01416D" opacity="0.3" />

    {/* White Paper letter emerging from inside */}
    <g filter="url(#paperShadow)">
      <rect x="11" y="9" width="26" height="23" rx="2" fill="#FFFFFF" />
      {/* Letter lines */}
      <line x1="16" y1="15" x2="32" y2="15" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="20" x2="32" y2="20" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="25" x2="25" y2="25" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Front lower pocket folds */}
    <path
      d="M6 40c0 1.1.9 2 2 2h32c1.1 0 2-.9 2-2V22L25.4 34.5c-.8.6-2 .6-2.8 0L6 22v18z"
      fill="url(#mailFront)"
    />

    {/* Front triangular wing lines */}
    <path
      d="M6 42l15-13M42 42L27 29"
      stroke="#0277BD"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

/**
 * SMS Speech Bubble with 3 Dots Logo matching icons8-sms-48.png
 */
export const SmsBubbleLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} shrink-0 drop-shadow-xs`}
    aria-hidden="true"
  >
    <defs>
      {/* Blue gradient speech bubble */}
      <linearGradient id="smsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#40C4FF" />
        <stop offset="50%" stopColor="#00B0FF" />
        <stop offset="100%" stopColor="#0091EA" />
      </linearGradient>
      {/* Subtle bubble shadow */}
      <filter id="smsShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#01579B" floodOpacity="0.35" />
      </filter>
    </defs>

    {/* Rounded speech bubble with tail */}
    <path
      d="M8 8h32a5 5 0 0 1 5 5v20a5 5 0 0 1-5 5H18l-9 7.5c-.9.7-2.2.1-2.2-1.1V38H8a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z"
      fill="url(#smsGrad)"
      filter="url(#smsShadow)"
    />

    {/* Soft top highlight */}
    <rect x="8" y="10" width="32" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.25" />

    {/* Three white rounded dots */}
    <circle cx="16" cy="23" r="3.2" fill="#FFFFFF" />
    <circle cx="24" cy="23" r="3.2" fill="#FFFFFF" />
    <circle cx="32" cy="23" r="3.2" fill="#FFFFFF" />
  </svg>
);

/**
 * 3D Instagram Logo matching icons8-instagram-logo-94.png
 */
export const InstagramLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} shrink-0 drop-shadow-xs`}
    aria-hidden="true"
  >
    <defs>
      {/* Instagram 3D base linear gradient */}
      <linearGradient id="igLinear" x1="12%" y1="8%" x2="88%" y2="92%">
        <stop offset="0%" stopColor="#4F5BD5" />
        <stop offset="25%" stopColor="#962FBF" />
        <stop offset="55%" stopColor="#D62976" />
        <stop offset="80%" stopColor="#FA7E1E" />
        <stop offset="100%" stopColor="#FEDA75" />
      </linearGradient>

      {/* Radial warmth from bottom-left for yellow-amber glow */}
      <radialGradient id="igRadialWarm" cx="22%" cy="92%" r="80%">
        <stop offset="0%" stopColor="#FFDC80" stopOpacity="0.95" />
        <stop offset="30%" stopColor="#FCAF45" stopOpacity="0.85" />
        <stop offset="65%" stopColor="#F77737" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#F77737" stopOpacity="0" />
      </radialGradient>

      {/* Radial blue-indigo glow from top-right */}
      <radialGradient id="igRadialCool" cx="80%" cy="15%" r="65%">
        <stop offset="0%" stopColor="#405DE6" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#5851DB" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#833AB4" stopOpacity="0" />
      </radialGradient>

      {/* White camera drop shadow for 3D raised depth */}
      <filter id="igCamShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2.5" stdDeviation="2" floodColor="#701A75" floodOpacity="0.45" />
      </filter>

      {/* Outer 3D squircle rim bevel */}
      <linearGradient id="igRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
      </linearGradient>
    </defs>

    {/* Squircle Background Base */}
    <rect x="6" y="6" width="84" height="84" rx="24" fill="url(#igLinear)" />
    {/* Warm radial light */}
    <rect x="6" y="6" width="84" height="84" rx="24" fill="url(#igRadialWarm)" />
    {/* Cool radial light */}
    <rect x="6" y="6" width="84" height="84" rx="24" fill="url(#igRadialCool)" />

    {/* Subtle 3D Rim / Gloss Highlight */}
    <rect
      x="7"
      y="7"
      width="82"
      height="82"
      rx="23"
      stroke="url(#igRim)"
      strokeWidth="2"
      fill="none"
    />

    {/* Top gloss curve */}
    <path
      d="M26 12h44c10 0 16 5 18 13-14 3-42 4-68 15-2-12 6-28 6-28z"
      fill="#FFFFFF"
      fillOpacity="0.16"
    />

    {/* Camera Glyph with 3D Depth */}
    <g filter="url(#igCamShadow)">
      {/* Outer camera rounded box */}
      <rect
        x="24"
        y="24"
        width="48"
        height="48"
        rx="13.5"
        stroke="#FFFFFF"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center Camera Lens Circle */}
      <circle
        cx="48"
        cy="48"
        r="11.5"
        stroke="#FFFFFF"
        strokeWidth="5.5"
      />

      {/* Flash Dot */}
      <circle
        cx="60.5"
        cy="35.5"
        r="3.2"
        fill="#FFFFFF"
      />
    </g>
  </svg>
);

