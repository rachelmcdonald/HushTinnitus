// Roboto loaded from @fontsource/roboto — consistent rendering on all machines
// To regenerate icons: node scripts/generate-icons.js

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ASSETS    = path.join(__dirname, '..', 'assets');
const DEEP_TIDE = '#0D4F5C';
const CALM_WAVE = '#5DCAA5';
const CREAM     = '#F5F1EB';

// ── Roboto Regular — loaded explicitly from @fontsource/roboto (a devDependency
// ── of this project) and embedded as a base64 @font-face, so rendering is
// ── identical on every machine and CI runner — never dependent on whatever
// ── fonts happen to be installed on the system.

function loadRoboto() {
  const fontPath = require.resolve('@fontsource/roboto/files/roboto-latin-400-normal.woff2');
  return { b64: fs.readFileSync(fontPath).toString('base64'), fmt: 'woff2' };
}

const roboto      = loadRoboto();
const FONT_FAMILY = 'Roboto';

function fontDefs() {
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

// ── Android notification icon (96×96, white silhouette, transparent bg) ─────
//
// Android requires status-bar/notification icons to be a plain white shape
// on a transparent background — it renders only the alpha channel, tinted
// with whatever colour is configured (see app.json's expo-notifications
// plugin "color" field). A full-colour icon (e.g. the app icon) would just
// render as a solid tinted block, not the intended drop/ripple mark.
// 96×96 matches the xxxhdpi bucket; the config plugin generates the other
// mdpi/hdpi/xhdpi/xxhdpi sizes from this source automatically.
function notificationIconSvg() {
  const cx = 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <!-- Largest drop only -->
  <circle cx="${cx}" cy="54" r="9" fill="#ffffff"/>
  <!-- Ripple ellipses -->
  <ellipse cx="${cx}" cy="74" rx="42" ry="12" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.28"/>
  <ellipse cx="${cx}" cy="74" rx="28" ry="9"  fill="none" stroke="#ffffff" stroke-width="4" opacity="0.55"/>
  <ellipse cx="${cx}" cy="74" rx="15" ry="5"  fill="none" stroke="#ffffff" stroke-width="5" opacity="0.90"/>
</svg>`;
}

// ── Feature graphic (1024×500, Google Play Store listing) ───────────────────
//
// Standalone from iconContent() deliberately — this composition needs its
// own text sizes/positions (72px "hush.", 28px "tinnitus", tagline,
// attribution) that have nothing to do with the app icon's proportions, and
// keeping it separate means it can never accidentally change icon.png /
// adaptive-icon.png / splash.png, which are already shipped/building.
//
// Just the drop/ripple mark (no wordmark) — same geometry as iconContent(),
// scaled by `size` the same way. Natural proportions are wider than tall
// (the outer ripple ellipse is much wider than the drops are tall), so
// "approximately 180x180px" is treated as a max-dimension target rather
// than a forced square — stretching the mark to a literal 180x180 box would
// distort the brand mark.
function logoMarkContent(size) {
  const s  = size / 1024;
  const cx = size / 2;
  const cy = size / 2;
  const n = v => +(v * s).toFixed(2);

  return `
  <circle cx="${cx}" cy="${n(NORM.dropSmallY)}" r="${n(22)}" fill="${CALM_WAVE}" opacity="0.50"/>
  <circle cx="${cx}" cy="${n(NORM.dropMidY)}"   r="${n(32)}" fill="${CALM_WAVE}" opacity="0.75"/>
  <circle cx="${cx}" cy="${n(NORM.dropLargeY)}" r="${n(42)}" fill="${CALM_WAVE}" opacity="1.0"/>
  <ellipse cx="${cx}" cy="${n(NORM.rippleCY)}" rx="${n(400)}" ry="${n(120)}" fill="none" stroke="${CALM_WAVE}" stroke-width="${n(7)}"  opacity="0.28"/>
  <ellipse cx="${cx}" cy="${n(NORM.rippleCY)}" rx="${n(280)}" ry="${n(84)}"  fill="none" stroke="${CALM_WAVE}" stroke-width="${n(8)}"  opacity="0.55"/>
  <ellipse cx="${cx}" cy="${n(NORM.rippleCY)}" rx="${n(148)}" ry="${n(44)}"  fill="none" stroke="${CALM_WAVE}" stroke-width="${n(10)}" opacity="0.90"/>`;
}

const FEATURE_W = 1024;
const FEATURE_H = 500;
const MIDNIGHT  = '#0D2B33';

function featureGraphicSvg() {
  // Logo mark: scaled so the outer ripple ellipse's diameter (rx*2 at full
  // 1024 scale = 800) reads as ~180px wide in this canvas.
  const markSize = 230; // -> outer ellipse ~180px wide, drops+ripple ~102px tall
  const markCx = FEATURE_W * 0.20;  // centred in the left ~40% panel
  const markCy = FEATURE_H / 2;
  const markOffsetX = markCx - markSize / 2;
  const markOffsetY = markCy - markSize / 2;

  const textX = FEATURE_W * 0.44; // just right of the 40% mark panel

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FEATURE_W}" height="${FEATURE_H}">
  ${fontDefs()}
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${DEEP_TIDE}"/>
      <stop offset="1" stop-color="${MIDNIGHT}"/>
    </linearGradient>
  </defs>
  <rect width="${FEATURE_W}" height="${FEATURE_H}" fill="url(#bg)"/>

  <g transform="translate(${markOffsetX} ${markOffsetY})">
    ${logoMarkContent(markSize)}
  </g>

  <text x="${textX}" y="225" font-family="${FONT_FAMILY}" font-size="72" font-weight="400"
  ><tspan fill="${CALM_WAVE}">hush</tspan><tspan fill="${CREAM}">.</tspan></text>

  <text x="${textX}" y="266" font-family="${FONT_FAMILY}" font-size="28" font-weight="400"
    fill="${CALM_WAVE}" letter-spacing="6">tinnitus</text>

  <text x="${textX}" y="304" font-family="${FONT_FAMILY}" font-size="20" font-weight="400"
    fill="${CALM_WAVE}" opacity="0.6">Sound therapy &amp; tinnitus support</text>

  <text x="${FEATURE_W - 24}" y="${FEATURE_H - 24}" text-anchor="end"
    font-family="${FONT_FAMILY}" font-size="14" font-weight="400"
    fill="${CALM_WAVE}" opacity="0.4">by RESONEAR</text>
</svg>`;
}

async function makeFeatureGraphic() {
  const storeDir = path.join(ASSETS, 'store');
  fs.mkdirSync(storeDir, { recursive: true });
  await sharp(Buffer.from(featureGraphicSvg()))
    // Play Store's feature graphic spec wants no alpha channel — flatten
    // against the rightmost gradient colour as a safe background in case of
    // any edge anti-aliasing (the design is full-bleed, so this shouldn't
    // actually show anywhere).
    .flatten({ background: MIDNIGHT })
    .png()
    .toFile(path.join(storeDir, 'feature-graphic.png'));
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
  console.log(`Roboto font: loaded from @fontsource/roboto (${roboto.fmt})`);
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

  await sharp(Buffer.from(notificationIconSvg())).png().toFile(path.join(ASSETS, 'notification-icon.png'));
  console.log('✓  assets/notification-icon.png');

  await makeSplash();
  console.log('✓  assets/splash.png');

  await makeFeatureGraphic();
  console.log('✓  assets/store/feature-graphic.png');

  console.log('\nFile sizes:');
  for (const f of ['icon.png', 'adaptive-icon.png', 'favicon.png', 'notification-icon.png', 'splash.png', 'store/feature-graphic.png']) {
    const { size } = fs.statSync(path.join(ASSETS, f));
    console.log(`   ${f.padEnd(24)} ${(size / 1024).toFixed(1)} KB`);
  }
  console.log('\nDone.');
}

run().catch(err => { console.error(err.message); process.exit(1); });
