// Recolours the RESONEAR wordmark to #5DCAA5 and regenerates assets/splash.png
// with the brand attribution at the bottom.
// Run: node scripts/update-splash.js

const sharp = require('sharp');
const path  = require('path');

const ASSETS    = path.join(__dirname, '..', 'assets');
const DEEP_TIDE = '#0D4F5C';
const CALM_WAVE = '#5DCAA5';
const WHITE     = '#FFFFFF';
const WAVEFORM  = 'M8 19 Q11 12 14 19 Q17 26 19 19 Q21 14 23 19 Q25 24 27 19 Q29 15 30 19';

const W = 1242;   // splash width  (covers all screen sizes)
const H = 2688;   // splash height

// ── Step 1: recolour RESONEAR wordmark ───────────────────────────────────────
// Replace every non-transparent pixel's RGB with #5DCAA5; keep alpha unchanged.
// This preserves anti-aliased edges perfectly.

async function recolourLogo() {
  const src = path.join(ASSETS, 'resonear-source.png');
  const out = path.join(ASSETS, 'images', 'resonear-logo.png');

  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const TR = 0x5D, TG = 0xCA, TB = 0xA5;
  for (let i = 0; i < info.width * info.height * 4; i += 4) {
    // Always replace RGB — alpha-channel anti-aliasing handles edge softness
    data[i]     = TR;
    data[i + 1] = TG;
    data[i + 2] = TB;
    // data[i + 3] = alpha — untouched
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(out);

  console.log(`✓  assets/images/resonear-logo.png  (${info.width}×${info.height}, transparent, #5DCAA5)`);

  // Verify a sample interior pixel is teal and its alpha > 0
  const check = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  let verified = false;
  for (let i = 0; i < check.info.width * check.info.height * 4; i += 4) {
    if (check.data[i + 3] > 200) {   // opaque enough pixel
      const r = check.data[i], g = check.data[i+1], b = check.data[i+2];
      if (r === TR && g === TG && b === TB) { verified = true; break; }
    }
  }
  console.log(`   Colour verification: ${verified ? '✓ pixels are #5DCAA5' : '✗ FAILED — check source image'}`);

  return { srcW: info.width, srcH: info.height, path: out };
}

// ── Step 2: regenerate splash.png ────────────────────────────────────────────

async function generateSplash(logo) {
  const cx = W / 2;

  // — Waveform: scaled ×13, centred at (cx, wy) in the upper 38 % of the image
  const wScale = 13;
  const wy     = Math.round(H * 0.355);         // ≈ 955 — sits in upper ⅔
  const wtx    = cx - 19 * wScale;              // translate so path midpoint (19,19) → (cx, wy)
  const wty    = wy - 19 * wScale;
  const pathBottomY = wy + 7 * wScale;          // path y=26 is 7 units below midpoint

  // — App name and tagline
  const appNameY  = pathBottomY + 82;           // baseline of "hush tinnitus"
  const taglineY  = appNameY   + 62;            // baseline of tagline

  // — RESONEAR logo display size
  const logoW = 120;
  const logoH = Math.round(logoW * logo.srcH / logo.srcW);   // ≈ 21 px

  // — "by [RESONEAR]" strip, 48 px from bottom edge
  const stripBottom = H - 48;                   // bottom of strip = 2640
  const logoTop     = stripBottom - logoH;       // top of logo    = 2619
  const logoCenterY = logoTop + logoH / 2;       // ≈ 2629.5

  // Horizontal: centre the whole "by ‹logo›" unit
  // Estimate "by" text width at 14 px Helvetica Neue ≈ 18 px; gap = 8 px
  const byW         = 18;
  const gap         = 8;
  const unitW       = byW + gap + logoW;         // ≈ 146 px
  const unitLeft    = (W - unitW) / 2;           // ≈ 548
  const byAnchorX   = unitLeft + byW;            // right-edge anchor for "by" text ≈ 566
  const logoLeft    = unitLeft + byW + gap;      // ≈ 574

  // "by" text baseline: vertically centred against logo
  // SVG baseline ≈ centre + fontSize × 0.35
  const byBaselineY = logoCenterY + 14 * 0.35;  // ≈ 2634

  // — Build base SVG (background + waveform + app text + "by")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${DEEP_TIDE}"/>

    <!-- Waveform mark -->
    <g transform="translate(${wtx.toFixed(1)}, ${wty.toFixed(1)}) scale(${wScale})">
      <path d="${WAVEFORM}"
        fill="none" stroke="${CALM_WAVE}"
        stroke-width="1.4" stroke-linecap="round"/>
    </g>

    <!-- App name -->
    <text x="${cx}" y="${appNameY.toFixed(1)}"
      text-anchor="middle"
      font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="62" font-weight="300"
      fill="${WHITE}" letter-spacing="8">hush tinnitus</text>

    <!-- Tagline -->
    <text x="${cx}" y="${taglineY.toFixed(1)}"
      text-anchor="middle"
      font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="26" fill="${CALM_WAVE}" letter-spacing="4">sound therapy &amp; support</text>

    <!-- "by" attribution text (RESONEAR logo composited separately) -->
    <text x="${byAnchorX.toFixed(1)}" y="${byBaselineY.toFixed(1)}"
      text-anchor="end"
      font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="14" font-weight="300"
      fill="${CALM_WAVE}" letter-spacing="1">by</text>
  </svg>`;

  const basePng = await sharp(Buffer.from(svg)).png().toBuffer();

  // Scale RESONEAR logo to target display size
  const scaledLogo = await sharp(logo.path)
    .resize(logoW, logoH, { fit: 'fill' })
    .png()
    .toBuffer();

  // Composite logo onto base
  await sharp(basePng)
    .composite([{
      input: scaledLogo,
      left:  Math.round(logoLeft),
      top:   Math.round(logoTop),
    }])
    .png()
    .toFile(path.join(ASSETS, 'splash.png'));

  console.log(`✓  assets/splash.png  (${W}×${H})`);
  console.log(`   Waveform centre:   (${cx}, ${wy})`);
  console.log(`   App name baseline: y=${appNameY.toFixed(0)}`);
  console.log(`   RESONEAR logo:     ${logoW}×${logoH}px at (${Math.round(logoLeft)}, ${Math.round(logoTop)})`);
  console.log(`   "by" anchor:       x=${byAnchorX.toFixed(0)}, baseline y=${byBaselineY.toFixed(0)}`);
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Updating splash assets…\n');
  const logo = await recolourLogo();
  await generateSplash(logo);
  console.log('\nDone.');
}

run().catch(err => { console.error(err.message); process.exit(1); });
