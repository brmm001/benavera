import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const appDir = path.join(rootDir, 'src', 'app');

// 1. Helper to assemble a multi-resolution ICO file from PNG buffers
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type (1 = icon)
  header.writeUInt16LE(count, 4); // image count

  let offset = 6 + 16 * count;
  const entries = [];
  const datas = [];

  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    entries.push(entry);
    datas.push(buffer);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...datas]);
}

// 2. OpenGraph Image SVG Template
const ogImageSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="40%" stop-color="#151938" />
      <stop offset="75%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#241e5e" />
    </linearGradient>

    <radialGradient id="glowTopRight" cx="90%" cy="10%" r="50%">
      <stop offset="0%" stop-color="#4040ca" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#4040ca" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowBottomLeft" cx="10%" cy="90%" r="50%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="iconBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="45%" stop-color="#2f3181" />
      <stop offset="100%" stop-color="#4040ca" />
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#4db8ab" />
    </linearGradient>

    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
    </linearGradient>

    <filter id="shadowHeavy" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.5" />
    </filter>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="30" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#glowTopRight)" />
  <rect width="1200" height="630" fill="url(#glowBottomLeft)" />

  <!-- Subtle Grid Lines -->
  <g opacity="0.05" stroke="#ffffff" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105" />
    <line x1="0" y1="210" x2="1200" y2="210" />
    <line x1="0" y1="315" x2="1200" y2="315" />
    <line x1="0" y1="420" x2="1200" y2="420" />
    <line x1="0" y1="525" x2="1200" y2="525" />
    <line x1="150" y1="0" x2="150" y2="630" />
    <line x1="300" y1="0" x2="300" y2="630" />
    <line x1="450" y1="0" x2="450" y2="630" />
    <line x1="600" y1="0" x2="600" y2="630" />
    <line x1="750" y1="0" x2="750" y2="630" />
    <line x1="900" y1="0" x2="900" y2="630" />
    <line x1="1050" y1="0" x2="1050" y2="630" />
  </g>

  <!-- LEFT SECTION: Branding & Text -->
  <g transform="translate(80, 70)">
    <!-- Brand Icon -->
    <g filter="url(#shadowHeavy)">
      <rect width="72" height="72" rx="18" fill="url(#iconBg)" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5" />
      <g transform="translate(17.5, 15.5) scale(0.144)">
        <rect x="124" y="112" width="56" height="288" rx="28" fill="#ffffff" />
        <path d="M152 112 H266 C322 112 364 146 364 198 C364 246 324 278 266 278 H152 Z" fill="none" stroke="#ffffff" stroke-width="52" stroke-linejoin="round" stroke-linecap="round" />
        <path d="M152 256 H282 C344 256 388 294 388 350 C388 406 340 444 276 444 H152" fill="none" stroke="#ffffff" stroke-width="52" stroke-linejoin="round" stroke-linecap="round" />
        <circle cx="282" cy="276" r="24" fill="url(#sparkGrad)" />
      </g>
    </g>
    <!-- Brand Wordmark -->
    <text x="92" y="52" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="46" letter-spacing="-1.5">
      <tspan fill="#ffffff">bena</tspan><tspan fill="#60a5fa">vera</tspan>
    </text>
    <rect x="290" y="24" width="150" height="30" rx="15" fill="#38bdf8" fill-opacity="0.15" stroke="#38bdf8" stroke-opacity="0.4" stroke-width="1" />
    <text x="365" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="12" fill="#38bdf8" text-anchor="middle" letter-spacing="0.5">SAÚDE &amp; CRÉDITO</text>
  </g>

  <!-- Main Title -->
  <text x="80" y="210" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="44" fill="#ffffff" letter-spacing="-1">
    Pagamento Facilitado para
  </text>
  <text x="80" y="265" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="44" fill="#38bdf8" letter-spacing="-1">
    Tratamentos Particulares
  </text>

  <!-- Subtitle -->
  <text x="80" y="325" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="20" fill="#94a3b8">
    Viabilize implantes, cirurgias, oftalmologia e procedimentos
  </text>
  <text x="80" y="355" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="20" fill="#94a3b8">
    estéticos com parcelamento flexível e sem complicações.
  </text>

  <!-- Feature Pills -->
  <g transform="translate(80, 400)">
    <!-- Pill 1 -->
    <g transform="translate(0, 0)">
      <rect width="180" height="42" rx="10" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1" />
      <circle cx="22" cy="21" r="8" fill="#10b981" />
      <path d="M18 21 L21 24 L26 18" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <text x="38" y="26" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="14" fill="#e2e8f0">100% Gratuito</text>
    </g>

    <!-- Pill 2 -->
    <g transform="translate(195, 0)">
      <rect width="200" height="42" rx="10" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1" />
      <circle cx="22" cy="21" r="8" fill="#38bdf8" />
      <path d="M18 21 L21 24 L26 18" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <text x="38" y="26" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="14" fill="#e2e8f0">Até 24x Parcelado</text>
    </g>

    <!-- Pill 3 -->
    <g transform="translate(410, 0)">
      <rect width="200" height="42" rx="10" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1" />
      <circle cx="22" cy="21" r="8" fill="#a855f7" />
      <path d="M18 21 L21 24 L26 18" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <text x="38" y="26" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="14" fill="#e2e8f0">Aprovação Rápida</text>
    </g>
  </g>

  <!-- URL Footer -->
  <g transform="translate(80, 560)">
    <text font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="16" fill="#64748b">
      <tspan fill="#38bdf8">www.benavera.com.br</tspan> • Acesso à saúde de qualidade no Brasil
    </text>
  </g>

  <!-- RIGHT SECTION: Card Preview Graphic -->
  <g transform="translate(730, 95)" filter="url(#cardShadow)">
    <!-- Main Card Body -->
    <rect width="390" height="440" rx="24" fill="#181c3a" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.5" />
    <rect x="0" y="0" width="390" height="440" rx="24" fill="url(#cardBg)" />
    
    <!-- Top Card Bar -->
    <rect x="24" y="24" width="342" height="60" rx="14" fill="#242b54" />
    <circle cx="50" cy="54" r="14" fill="#38bdf8" fill-opacity="0.2" />
    <text x="50" y="59" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#38bdf8" text-anchor="middle">✓</text>
    <text x="74" y="47" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#ffffff">Simulação Disponível</text>
    <text x="74" y="65" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="12" fill="#94a3b8">Sem consulta prévia ao score</text>

    <!-- Amount display -->
    <text x="24" y="130" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="13" fill="#94a3b8" letter-spacing="0.5">VALOR ESTIMADO DO TRATAMENTO</text>
    <text x="24" y="170" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="32" fill="#ffffff">R$ 12.000,00</text>

    <!-- Divider -->
    <line x1="24" y1="195" x2="366" y2="195" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" />

    <!-- Suggested Installments -->
    <text x="24" y="225" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="13" fill="#94a3b8" letter-spacing="0.5">OPÇÃO SUGERIDA</text>
    
    <rect x="24" y="240" width="342" height="74" rx="14" fill="#2a3264" stroke="#38bdf8" stroke-opacity="0.5" stroke-width="1.5" />
    <text x="44" y="272" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#ffffff">24x de R$ 615,00</text>
    <text x="44" y="295" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="12" fill="#38bdf8">Parcelas que cabem no seu orçamento</text>
    
    <!-- CTA Button look -->
    <rect x="24" y="340" width="342" height="50" rx="12" fill="url(#iconBg)" stroke="#38bdf8" stroke-opacity="0.4" stroke-width="1" />
    <text x="195" y="371" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="15" fill="#ffffff" text-anchor="middle">Simular Tratamento Agora →</text>
    
    <text x="195" y="416" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="11" fill="#64748b" text-anchor="middle">Atendimento seguro • Dados protegidos</text>
  </g>
</svg>
`;

// 3. Logo PNG SVG Template (Clean high-res brand logo for Schema.org and headers)
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" width="800" height="200">
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
    <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#1e1b4b" flood-opacity="0.25" />
    </filter>
  </defs>
  
  <!-- Icon Mark -->
  <g transform="translate(20, 20) scale(0.3125)" filter="url(#logoShadow)">
    <rect width="512" height="512" rx="118" fill="url(#logoBg)" />
    <rect x="6" y="6" width="500" height="500" rx="112" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="8" />
    <rect x="124" y="112" width="56" height="288" rx="28" fill="#ffffff" />
    <path d="M152 112 H266 C322 112 364 146 364 198 C364 246 324 278 266 278 H152 Z" fill="none" stroke="#ffffff" stroke-width="52" stroke-linejoin="round" stroke-linecap="round" />
    <path d="M152 256 H282 C344 256 388 294 388 350 C388 406 340 444 276 444 H152" fill="none" stroke="#ffffff" stroke-width="52" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx="282" cy="276" r="24" fill="url(#sparkGrad)" />
  </g>

  <!-- Wordmark -->
  <text x="210" y="130" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="900" font-size="96" letter-spacing="-3">
    <tspan fill="#1e1b4b">bena</tspan><tspan fill="#4040ca">vera</tspan>
  </text>
</svg>
`;

async function main() {
  console.log('Generating Google Search & SEO icons and assets...');
  const iconSvgPath = path.join(publicDir, 'icon.svg');
  const iconSvgBuffer = fs.readFileSync(iconSvgPath);

  // 1. Generate Google Favicon standard sizes (multiples of 48px: 48, 96, 144, 192, 512, + 180, 32, 16)
  const sizes = [
    { size: 16, name: 'icon-16x16.png' },
    { size: 32, name: 'icon-32x32.png' },
    { size: 48, name: 'icon-48x48.png' },      // Google Favicon Base (48x48)
    { size: 96, name: 'icon-96x96.png' },      // Google Favicon 2x (96x96)
    { size: 144, name: 'icon-144x144.png' },  // Google Favicon 3x (144x144)
    { size: 180, name: 'apple-touch-icon.png' }, // iOS Apple Touch Icon
    { size: 180, name: 'apple-touch-icon-precomposed.png' },
    { size: 192, name: 'icon-192x192.png' },  // Google Favicon 4x / PWA
    { size: 512, name: 'icon-512x512.png' },  // PWA & High Res
  ];

  const icoBuffers = [];

  for (const { size, name } of sizes) {
    const pngBuffer = await sharp(iconSvgBuffer)
      .resize(size, size)
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    fs.writeFileSync(path.join(publicDir, name), pngBuffer);
    console.log(`✓ Generated public/${name} (${size}x${size})`);

    if (size === 16 || size === 32 || size === 48) {
      icoBuffers.push({ buffer: pngBuffer, size });
    }
  }

  // 2. Multi-resolution ICO file for Google Search and legacy browsers
  const icoData = createIco(icoBuffers);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoData);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoData);
  console.log('✓ Generated public/favicon.ico and src/app/favicon.ico (16, 32, 48px)');

  // 3. OpenGraph / Google Discover / Social Preview Image (1200x630)
  const ogPngBuffer = await sharp(Buffer.from(ogImageSvg))
    .resize(1200, 630)
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogPngBuffer);
  console.log('✓ Generated public/og-image.png (1200x630)');

  // 4. Logo PNG for Schema.org and Google Search Knowledge Panel
  const logoPngBuffer = await sharp(Buffer.from(logoSvg))
    .resize(800, 200)
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'logo.png'), logoPngBuffer);
  console.log('✓ Generated public/logo.png (800x200)');

  console.log('\nAll SEO & Google Search favicon assets generated successfully!');
}

main().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
