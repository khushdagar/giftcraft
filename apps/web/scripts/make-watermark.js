/**
 * Bakes the faded GIVOO watermark used on every proposal-deck page.
 *
 *     npm run make-watermark            # default fade
 *     npm run make-watermark -- 0.05    # fainter (5% of the original ink)
 *
 * The deck draws public/givoo_logo_watermark.png at full PDF opacity, because
 * image alpha renders inconsistently across PDF viewers — so the fade has to
 * live in the pixels. Run this whenever public/givoo_logo.png changes.
 */
const path = require('path');
const sharp = require('sharp');

const PUBLIC = path.join(__dirname, '..', 'public');
const SRC = path.join(PUBLIC, 'givoo_logo.png');
const OUT = path.join(PUBLIC, 'givoo_logo_watermark.png');

/** Fraction of the original opacity to keep. Lower = fainter watermark. */
const ink = Number(process.argv[2]) || 0.08;

(async () => {
  const { width, height } = await sharp(SRC).metadata();

  // Fade the ALPHA channel, never the colours. Flattening onto white would give
  // the watermark an opaque rectangle that shows as a pale box on the page —
  // keeping it transparent lets only the logo shape show through.
  const pixels = await sharp(SRC).ensureAlpha().raw().toBuffer();

  for (let i = 3; i < pixels.length; i += 4) {
    pixels[i] = Math.round(pixels[i] * ink);
  }

  await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(OUT);

  console.log(
    `Wrote ${OUT} — ${width}×${height}, ${(ink * 100).toFixed(0)}% opacity, background transparent.`
  );
})().catch((err) => {
  console.error('Watermark generation failed:', err.message);
  process.exit(1);
});
