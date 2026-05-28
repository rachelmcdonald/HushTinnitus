// Generates icon.png, adaptive-icon.png, favicon.png, and splash.png
// from the Hush Tinnitus SVG waveform mark defined in Section 4.1 of the spec.
// Run: node scripts/generate-assets.js

const sharp  = require('sharp');
const path   = require('path');

const ASSETS    = path.join(__dirname, '..', 'assets');
const DEEP_TIDE = '#0D4F5C';
const CALM_WAVE = '#5DCAA5';
const WHITE     = '#FFFFFF';
const WAVEFORM  = 'M8 19 Q11 12 14 19 Q17 26 19 19 Q21 14 23 19 Q25 24 27 19 Q29 15 30 19';

// ── icon.png  (1024×1024, full background) ────────────────────────────────────

function iconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 38 38">
    <rect width="38" height="38" fill="${DEEP_TIDE}"/>
    <path d="${WAVEFORM}"
      fill="none"
      stroke="${CALM_WAVE}"
      stroke-width="2.0"
      stroke-linecap="round"
    />
  </svg>`;
}

// ── adaptive-icon.png  (1024×1024, transparent — Android supplies bg colour) ─

function adaptiveSvg(size) {
  // Safe zone = 66.7 % of the image (centred).  Leave 16.65 % padding each side.
  const pad   = size * 0.1665;
  const inner = size - pad * 2;          // ≈ 682 for size=1024
  const scale = inner / 38;              // viewBox is 0 0 38 38
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <g transform="translate(${pad}, ${pad}) scale(${scale})">
      <path d="${WAVEFORM}"
        fill="none"
        stroke="${CALM_WAVE}"
        stroke-width="2.0"
        stroke-linecap="round"
      />
    </g>
  </svg>`;
}

// ── splash.png  (1284×2778 — matches iPhone 14 Pro Max @3×) ──────────────────

function splashSvg(w, h) {
  const cx     = w / 2;
  const wScale = 13;                          // 22 path-units × 13 = 286 px wide
  // Path midpoint is (19, 19).  Centre it at (cx, wy).
  const wy     = Math.round(h * 0.42);        // slightly above vertical centre
  const tx     = cx - 19 * wScale;
  const ty     = wy - 19 * wScale;
  // Bottom of path is y=26 → 7 units below midpoint
  const pathBottom = wy + 7 * wScale;
  const text1y     = pathBottom + 80;
  const text2y     = text1y + 68;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${DEEP_TIDE}"/>

    <g transform="translate(${tx}, ${ty}) scale(${wScale})">
      <path d="${WAVEFORM}"
        fill="none"
        stroke="${CALM_WAVE}"
        stroke-width="1.4"
        stroke-linecap="round"
      />
    </g>

    <text
      x="${cx}" y="${text1y}"
      text-anchor="middle"
      font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="62" font-weight="300"
      fill="${WHITE}"
      letter-spacing="8"
    >hush tinnitus</text>

    <text
      x="${cx}" y="${text2y}"
      text-anchor="middle"
      font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="26"
      fill="${CALM_WAVE}"
      letter-spacing="4"
    >sound therapy &amp; support</text>
  </svg>`;
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Generating Hush Tinnitus assets…\n');

  await sharp(Buffer.from(iconSvg(1024)))
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));
  console.log('✓  assets/icon.png           (1024×1024)');

  await sharp(Buffer.from(adaptiveSvg(1024)))
    .png()
    .toFile(path.join(ASSETS, 'adaptive-icon.png'));
  console.log('✓  assets/adaptive-icon.png  (1024×1024, transparent)');

  // Render at full size then resize down for sharpness
  await sharp(Buffer.from(iconSvg(192)))
    .resize(48, 48)
    .png()
    .toFile(path.join(ASSETS, 'favicon.png'));
  console.log('✓  assets/favicon.png        (48×48)');

  await sharp(Buffer.from(splashSvg(1284, 2778)))
    .png()
    .toFile(path.join(ASSETS, 'splash.png'));
  console.log('✓  assets/splash.png         (1284×2778)');

  console.log('\nAll assets generated.');
}

run().catch((err) => { console.error(err.message); process.exit(1); });
