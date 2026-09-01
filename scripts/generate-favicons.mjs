import fs from 'fs';
import path from 'path';

// Clean, iconic, high-impact modern Benavera Favicon SVG
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="45%" stop-color="#2f3181" />
      <stop offset="100%" stop-color="#4040ca" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#4db8ab" />
    </linearGradient>
    <linearGradient id="whiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e0e7ff" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Background container with smooth rounded corners -->
  <rect width="512" height="512" rx="118" fill="url(#bg)" />
  <rect x="6" y="6" width="500" height="500" rx="112" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="8" />

  <!-- Stylized Modern 'b' / 'B' Healthcare & Finance Monogram -->
  <g filter="url(#shadow)">
    <!-- Left vertical bar with rounded tips -->
    <rect x="124" y="112" width="56" height="288" rx="28" fill="url(#whiteGrad)" />

    <!-- Top loop of B -->
    <path d="M152 112 H266 C322 112 364 146 364 198 C364 246 324 278 266 278 H152 Z" 
          fill="none" 
          stroke="url(#whiteGrad)" 
          stroke-width="52" 
          stroke-linejoin="round"
          stroke-linecap="round" />

    <!-- Bottom loop of B with forward health/growth accent -->
    <path d="M152 256 H282 C344 256 388 294 388 350 C388 406 340 444 276 444 H152" 
          fill="none" 
          stroke="url(#whiteGrad)" 
          stroke-width="52" 
          stroke-linejoin="round"
          stroke-linecap="round" />
          
    <!-- Cyan/Teal Vitality & Trust Spark Dot -->
    <circle cx="282" cy="276" r="24" fill="url(#accent)" />
  </g>
</svg>`;

// Also a standalone logo SVG for header / OpenGraph / Schema
const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="100%" height="100%">
  <defs>
    <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#2f3181" />
      <stop offset="100%" stop-color="#4040ca" />
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#4db8ab" />
    </linearGradient>
  </defs>
  
  <!-- Icon Mark -->
  <g transform="translate(10, 10) scale(0.2734)">
    <rect width="512" height="512" rx="118" fill="url(#logoBg)" />
    <rect x="6" y="6" width="500" height="500" rx="112" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="8" />
    <rect x="124" y="112" width="56" height="288" rx="28" fill="#ffffff" />
    <path d="M152 112 H266 C322 112 364 146 364 198 C364 246 324 278 266 278 H152 Z" fill="none" stroke="#ffffff" stroke-width="52" stroke-linejoin="round" stroke-linecap="round" />
    <path d="M152 256 H282 C344 256 388 294 388 350 C388 406 340 444 276 444 H152" fill="none" stroke="#ffffff" stroke-width="52" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx="282" cy="276" r="24" fill="url(#sparkGrad)" />
  </g>

  <!-- Wordmark -->
  <text x="175" y="104" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="800" font-size="78" letter-spacing="-2.5">
    <tspan fill="#2f3181">bena</tspan><tspan fill="#4040ca">vera</tspan>
  </text>
</svg>`;

console.log('Writing SVG assets...');

const appDir = path.resolve('./src/app');
const publicDir = path.resolve('./public');

// Write SVGs
fs.writeFileSync(path.join(appDir, 'icon.svg'), svgIcon, 'utf8');
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon, 'utf8');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon, 'utf8');
fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgLogo, 'utf8');

console.log('Saved SVG icon files to src/app/icon.svg and public/icon.svg');
