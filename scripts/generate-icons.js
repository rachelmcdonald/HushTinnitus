// Generates app icon assets from the "hush." design specification.
// Run: node scripts/generate-icons.js

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ASSETS    = path.join(__dirname, '..', 'assets');
const DEEP_TIDE = '#0D4F5C';
const CALM_WAVE = '#5DCAA5';
const CREAM     = '#F5F1EB';

// ── Roboto Regular — embedded as base64 @font-face for reliable SVG rendering ─

function loadRoboto() {
  const candidates = [
    ['@fontsource/roboto/files/roboto-latin-400-normal.woff2', 'woff2'],
    ['@fontsource/roboto/files/roboto-latin-400-normal.woff',  'woff'],
    ['@fontsource/roboto/files/roboto-all-400-normal.woff2',   'woff2'],
  ];
  for (const [mod, fmt] of candidates) {
    try {
      const p = require.resolve(mod);
      if (fs.existsSync(p)) return { b64: fs.readFileSync(p).toString('base64'), fmt };
    } catch {}
  }
  for (const [p, fmt] of [
    ['/usr/share/fonts/truetype/roboto/Roboto-Regular.ttf', 'truetype'],
    ['/System/Library/Fonts/Supplemental/Roboto.ttf',       'truetype'],
  ]) {
    if (fs.existsSync(p)) return { b64: fs.readFileSync(p).toString('base64'), fmt };
  }
  return null;
}

const roboto      = loadRoboto();
const FONT_FAMILY = roboto ? 'Roboto' : 'Helvetica Neue, Helvetica, Arial, sans-serif';

function fontDefs() {
  if (!roboto) return '';
  return `<defs><style>@font-face{font-family:'Roboto';font-weight:400;font-style:normal;src:url('data:font/${roboto.fmt};base64,${roboto.b64}')format('${roboto.fmt}');}</style></defs>`;
}

// ── Design constants (in 1024×1024 coordinate space) ─────────────────────────

// All Y positions normalised to 1024px; multiply by `s` to scale to target size.
const NORM = {
  textBaseline: 310,   // "hush." baseline
  dropSmallY:   476,   // r=22, opacity 50%  (furthest from ripple)
  dropMidY:     590,   // r=32, opacity 75%
  dropLargeY:   704,   // r=42, opacity 100% (bottom of drop = inner ellipse top)
  rippleCY:     790,   // centre of concentric ripple ellipses
  cornerR:      180,   // rounded-rect radius
  fontSize:     280,
  letterSpacing: -3.5,
};

// ── Icon content (wordmark + drops + ripple), shared by icon.png and the ────
// ── Android adaptive-icon foreground ─────────────────────────────────────────

// `scale` shrinks the whole group around the canvas centre — used to fit the
// design inside the Android adaptive-icon "safe zone" (see adaptiveIconSvg).
function iconContent(size, scale = 1) {
  const s  = size / 1024;
  const cx = size / 2;
  const cy = size / 2;

  const n = v => +(v * s).toFixed(2);

  const group = `
  <!-- Wordmark: "hush" in teal, "." in cream -->
  <text x="${cx}" y="${n(NORM.textBaseline)}"
    font-family="${FONT_FAMILY}" font-size="${n(NORM.fontSize)}" font-weight="400"
    text-anchor="middle" letter-spacing="${n(NORM.letterSpacing)}"
  ><tspan fill="${CALM_WAVE}">hush</tspan><tspan fill="${CREAM}">.</tspan></text>

  <!-- Drops: small/far (top) → large/near (bottom) -->
  <circle cx="${cx}" cy="${n(NORM.dropSmallY)}" r="${n(22)}" fill="${CALM_WAVE}" opacity="0.50"/>
  <circle cx="${cx}" cy="${n(NORM.dropMidY)}"   r="${n(32)}" fill="${CALM_WAVE}" opacity="0.75"/>
  <circle cx="${cx}" cy="${n(NORM.dropLargeY)}" r="${n(42)}" fill="${CALM_WAVE}" opacity="1.0"/>

  <!-- Ripple ellipses: outer → middle → inner -->
  <ellipse cx="${cx}" cy="${n(NORM.rippleCY)}" rx="${n(400)}" ry="${n(120)}" fill="none" stroke="${CALM_WAVE}" stroke-width="${n(7)}"  opacity="0.28"/>
  <ellipse cx="${cx}" cy="${n(NORM.rippleCY)}" rx="${n(280)}" ry="${n(84)}"  fill="none" stroke="${CALM_WAVE}" stroke-width="${n(8)}"  opacity="0.55"/>
  <ellipse cx="${cx}" cy="${n(NORM.rippleCY)}" rx="${n(148)}" ry="${n(44)}"  fill="none" stroke="${CALM_WAVE}" stroke-width="${n(10)}" opacity="0.90"/>`;

  if (scale === 1) return group;
  return `<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">${group}</g>`;
}

// ── Icon SVG (scalable, full-bleed — used for icon.png / iOS) ────────────────

function iconSvg(size) {
  const r = NORM.cornerR * (size / 1024);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  ${fontDefs()}
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${DEEP_TIDE}"/>
  ${iconContent(size)}
</svg>`;
}

// ── Adaptive icon SVG (transparent background, content scaled to fit the ───
// ── Android safe zone) ────────────────────────────────────────────────────────
//
// Android's nominal adaptive-icon safe zone is the central ~66% of the
// canvas (a 72dp zone inside a 108dp viewport), but real-world circular
// masks (Samsung, Pixel, and others) crop more aggressively than that in
// practice. 580px (56.6%) gives extra breathing room so the top of the
// "hush." wordmark and the outermost ripple ellipse both stay clear of the
// mask. `scale` is computed at generation time (see `run()`) from the
// *actual* rendered bounding box, so this always fits regardless of future
// design tweaks. The background stays transparent — app.json's
// adaptiveIcon.backgroundColor (#0D4F5C) is composited underneath by the OS.
const SAFE_ZONE = 580;

function adaptiveIconSvg(size, scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  ${fontDefs()}
  ${iconContent(size, scale)}
</svg>`;
}

// Renders the unscaled content on a transparent canvas and measures its
// trimmed bounding box, so the safe-zone scale factor is exact rather than
// hand-estimated.
async function measureContentExtent(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  ${fontDefs()}
  ${iconContent(size)}
</svg>`;
  const { info } = await sharp(Buffer.from(svg))
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });
  return Math.max(info.width, info.height);
}

// ── Favicon SVG (48×48, no text) ─────────────────────────────────────────────

function faviconSvg() {
  const W = 48, cx = 24;
  // Manually tuned for 48px — proportional scaling makes drops/strokes invisible
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
  <rect width="48" height="48" fill="${DEEP_TIDE}"/>
  <!-- Largest drop only -->
  <circle cx="${cx}" cy="27" r="4.5" fill="${CALM_WAVE}"/>
  <!-- Ripple ellipses -->
  <ellipse cx="${cx}" cy="37" rx="21"  ry="6"   fill="none" stroke="${CALM_WAVE}" stroke-width="1.5" opacity="0.28"/>
  <ellipse cx="${cx}" cy="37" rx="14"  ry="4.5" fill="none" stroke="${CALM_WAVE}" stroke-width="2"   opacity="0.55"/>
  <ellipse cx="${cx}" cy="37" rx="7.5" ry="2.5" fill="none" stroke="${CALM_WAVE}" stroke-width="2.5" opacity="0.90"/>
</svg>`;
}

// ── Splash (2048×2048) ────────────────────────────────────────────────────────

async function makeSplash() {
  const SW = 2048, SH = 2048;
  const cx = SW / 2;

  // Icon at 1400×1400, shifted above canvas centre to leave room for attribution
  const iconSize = 1400;
  const iconLeft = Math.round((SW - iconSize) / 2);
  const iconTop  = Math.round((SH - iconSize) / 2) - 80;
  const iconPng  = await sharp(Buffer.from(iconSvg(iconSize))).png().toBuffer();

  // RESONEAR attribution: "by" text + logo, centred, 80px from bottom
  const logoW      = 240;
  const logoH      = Math.round(logoW * 120 / 694);   // source is 694×120 → ≈ 41px
  const byFontSize = 28;
  const byW_est    = 36;   // estimated rendered width of "by" at 28px
  const gapPx      = 16;
  const unitW      = byW_est + gapPx + logoW;
  const unitLeft   = (SW - unitW) / 2;
  const byAnchorX  = Math.round(unitLeft + byW_est);   // right-edge anchor for "by"
  const logoLeft   = Math.round(unitLeft + byW_est + gapPx);
  const stripBot   = SH - 80;
  const logoTop    = Math.round(stripBot - logoH);
  const logoCentY  = logoTop + logoH / 2;
  const byBaseline = +(logoCentY + byFontSize * 0.35).toFixed(1);

  // Base: background + "by" text
  const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">
  ${fontDefs()}
  <rect width="${SW}" height="${SH}" fill="${DEEP_TIDE}"/>
  <text x="${byAnchorX}" y="${byBaseline}"
    text-anchor="end"
    font-family="${FONT_FAMILY}" font-size="${byFontSize}" font-weight="300"
    fill="${CALM_WAVE}" letter-spacing="1">by</text>
</svg>`;

  const composites = [
    { input: iconPng, left: iconLeft, top: iconTop },
  ];

  const logoPath = path.join(ASSETS, 'images', 'resonear-logo.png');
  if (fs.existsSync(logoPath)) {
    const scaledLogo = await sharp(logoPath)
      .resize(logoW, logoH, { fit: 'fill' })
      .png()
      .toBuffer();
    composites.push({ input: scaledLogo, left: logoLeft, top: logoTop });
  } else {
    console.log('  ⚠  assets/images/resonear-logo.png not found — attribution logo skipped');
  }

  await sharp(Buffer.from(baseSvg))
    .composite(composites)
    .png()
    .toFile(path.join(ASSETS, 'splash.png'));
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Roboto font:', roboto ? `loaded (${roboto.fmt})` : 'not found — using system sans-serif');
  console.log('Generating icon assets…\n');

  await sharp(Buffer.from(iconSvg(1024))).png().toFile(path.join(ASSETS, 'icon.png'));
  console.log('✓  assets/icon.png');

  const contentExtent = await measureContentExtent(1024);
  const safeZoneScale = SAFE_ZONE / contentExtent;
  console.log(`   adaptive-icon content extent: ${contentExtent}px → scale ${safeZoneScale.toFixed(3)} to fit ${SAFE_ZONE}px safe zone`);

  await sharp(Buffer.from(adaptiveIconSvg(1024, safeZoneScale))).png().toFile(path.join(ASSETS, 'adaptive-icon.png'));
  console.log('✓  assets/adaptive-icon.png');

  await sharp(Buffer.from(faviconSvg())).png().toFile(path.join(ASSETS, 'favicon.png'));
  console.log('✓  assets/favicon.png');

  await makeSplash();
  console.log('✓  assets/splash.png');

  console.log('\nFile sizes:');
  for (const f of ['icon.png', 'adaptive-icon.png', 'favicon.png', 'splash.png']) {
    const { size } = fs.statSync(path.join(ASSETS, f));
    console.log(`   ${f.padEnd(24)} ${(size / 1024).toFixed(1)} KB`);
  }
  console.log('\nDone.');
}

run().catch(err => { console.error(err.message); process.exit(1); });
