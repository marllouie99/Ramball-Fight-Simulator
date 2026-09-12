// ─────────────────────────────────────────────
// Demon Slayer Weapon Graphics & Visual Effects (Authentic Pixel Art Edition)
// Tanjiro (Nichirin Katana), Nezuko (Demon Claws),
// Zenitsu (Lightning Katana), Inosuke (Dual Serrated Blades)
// Adheres strictly to Rule 11 (Zero shadowBlur) & Stack Balance
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

const P = 2.0; // 2.0px authentic retro pixel grid
const snap = (v) => Math.round(v / P) * P;

/**
 * Draws Tanjiro's Pitch-Black Nichirin Katana (Pixel Art)
 */
export function drawTanjiroNichirinKatana(ctx, x, y, angle, r = 25, opts = {}) {
  const isPreview = Boolean(opts.isPreview);
  const now = opts.now || Date.now();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;

  const bladeLength = snap(48);
  const bladeWidth = snap(4);
  const hiltLength = snap(14);
  const startX = snap(r * 0.75);

  // 1. Pixelated Scabbard (Preview / Stance)
  if (isPreview) {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(startX - 2, -bladeWidth / 2 - 1, bladeLength + 4, bladeWidth + 2);
    ctx.fillStyle = '#059669'; // Emerald haori matching bands
    ctx.fillRect(startX + 8, -bladeWidth / 2 - 1, 4, bladeWidth + 2);
    ctx.fillRect(startX + 22, -bladeWidth / 2 - 1, 4, bladeWidth + 2);
  }

  // 2. Obsidian Black Nichirin Blade
  ctx.fillStyle = '#111115';
  ctx.fillRect(startX + 4, -bladeWidth / 2, bladeLength - 8, bladeWidth);
  // Chisel Kissaki Tip
  ctx.fillRect(startX + bladeLength - 4, -bladeWidth / 2 + 1, 4, bladeWidth - 2);

  // 3. Silver Habaki (Blade Collar)
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(startX, -bladeWidth / 2, 4, bladeWidth);

  // 4. Crimson Cutting Edge Hamon Line
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(startX + 4, -bladeWidth / 2, bladeLength - 4, 1.4);

  // 5. Pixel Water Droplet / Sun Spark
  const pulse = Math.sin(now * 0.006) > 0;
  ctx.fillStyle = pulse ? '#06B6D4' : '#EF4444';
  ctx.fillRect(startX + bladeLength, -1, 3, 3);

  // 6. Circular Wheel-Spoke Flame Tsuba (Handguard)
  ctx.fillStyle = '#18181B';
  ctx.fillRect(startX - 2, -6, 4, 12);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(startX - 1, -5, 2, 10);
  ctx.fillRect(startX - 5, -2, 10, 4);

  // 7. Tsuka (Katana Hilt) & Tsuka-Ito Wrapping
  ctx.fillStyle = '#18181B';
  ctx.fillRect(startX - hiltLength, -2, hiltLength, 4);
  // Red diamond wrap pixels
  ctx.fillStyle = '#DC2626';
  for (let i = 2; i < hiltLength - 2; i += 3) {
    ctx.fillRect(startX - hiltLength + i, -1, 2, 2);
  }
  // Kashira (Pommel Cap)
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(startX - hiltLength - 2, -3, 2, 6);

  ctx.restore();
}

/**
 * Draws Nezuko's Demonic Claws & Exploding Blood Embers (Pixel Art)
 */
export function drawNezukoDemonClaws(ctx, x, y, angle, r = 25, opts = {}) {
  const isPreview = Boolean(opts.isPreview);
  const now = opts.now || Date.now();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;

  const startX = snap(r * 0.85);

  // 1. Pixelated Bakketsu Exploding Blood Aura
  const pulse = Math.sin(now * 0.008) > 0;
  ctx.fillStyle = pulse ? 'rgba(236, 72, 153, 0.4)' : 'rgba(225, 29, 72, 0.4)';
  ctx.fillRect(startX - 2, -8, 16, 16);
  ctx.fillRect(startX + 2, -6, 12, 12);

  // 2. Demon Claw Hand (Flesh + 4 Elongated Pixel Claws)
  ctx.fillStyle = '#FFF1E8'; // Porcelain skin
  ctx.fillRect(startX, -5, 6, 10);

  // 4 Razor Sharp Demonic Nails (Deep Crimson / Magenta)
  const clawYs = [-4, -1, 2, 5];
  const clawLens = [8, 12, 12, 8];

  for (let i = 0; i < 4; i++) {
    const cy = clawYs[i];
    const clen = clawLens[i];
    ctx.fillStyle = (i === 1 || i === 2) ? '#E11D48' : '#BE185D';
    ctx.fillRect(startX + 6, cy, clen, 2);
    // Tip glint
    ctx.fillStyle = '#FFF1F2';
    ctx.fillRect(startX + 6 + clen - 2, cy, 2, 1);
  }

  // 3. Pink Blood Pyrokinesis Embers
  if (isPreview) {
    const sparkOffsets = [
      { x: 12, y: -9 },
      { x: 18, y: 3 },
      { x: 14, y: 10 }
    ];
    sparkOffsets.forEach(so => {
      ctx.fillStyle = '#F472B6';
      ctx.fillRect(startX + so.x, so.y, 2, 2);
    });
  }

  ctx.restore();
}

/**
 * Draws Zenitsu's Lightning Nichirin Katana (Pixel Art)
 */
export function drawZenitsuLightningKatana(ctx, x, y, angle, r = 25, opts = {}) {
  const isPreview = Boolean(opts.isPreview);
  const now = opts.now || Date.now();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;

  const bladeLength = snap(48);
  const bladeWidth = snap(4);
  const hiltLength = snap(14);
  const startX = snap(r * 0.75);

  // 1. Pixelated Black & Gold Scabbard (Preview / Stance)
  if (isPreview) {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(startX - 2, -bladeWidth / 2 - 1, bladeLength + 4, bladeWidth + 2);
    ctx.fillStyle = '#F59E0B'; // Gold triangle scabbard bands
    ctx.fillRect(startX + 6, -bladeWidth / 2 - 1, 3, bladeWidth + 2);
    ctx.fillRect(startX + 16, -bladeWidth / 2 - 1, 3, bladeWidth + 2);
    ctx.fillRect(startX + 28, -bladeWidth / 2 - 1, 3, bladeWidth + 2);
  }

  // 2. Silver/Gold Nichirin Blade Core
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(startX + 4, -bladeWidth / 2, bladeLength - 8, bladeWidth);
  // Kissaki Tip
  ctx.fillRect(startX + bladeLength - 4, -bladeWidth / 2 + 1, 4, bladeWidth - 2);

  // 3. Stepped Lightning Bolt Hamon (Yellow/Gold Zigzag Pattern)
  ctx.fillStyle = '#F59E0B';
  for (let bx = startX + 4; bx < startX + bladeLength - 6; bx += 6) {
    ctx.fillRect(bx, -bladeWidth / 2, 3, 2);
    ctx.fillRect(bx + 3, bladeWidth / 2 - 2, 3, 2);
  }

  // 4. Gold Habaki & Round Tsuba
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(startX, -bladeWidth / 2, 4, bladeWidth);

  // 4-leaf gold tsuba
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(startX - 2, -5, 4, 10);
  ctx.fillRect(startX - 5, -2, 10, 4);

  // 5. White Tsuka (Hilt) with Gold Diamond Wrap
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(startX - hiltLength, -2, hiltLength, 4);
  ctx.fillStyle = '#F59E0B';
  for (let i = 2; i < hiltLength - 2; i += 3) {
    ctx.fillRect(startX - hiltLength + i, -1, 2, 2);
  }
  // Gold Pommel
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(startX - hiltLength - 2, -3, 2, 6);

  // 6. Electric Cyan Spark Pixel
  const isSpark = (Math.floor(now * 0.02) % 2 === 0);
  if (isSpark) {
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(startX + bladeLength, -3, 3, 3);
    ctx.fillRect(startX + bladeLength + 2, 1, 2, 2);
  }

  ctx.restore();
}

/**
 * Draws Inosuke's Dual Serrated/Chipped Nichirin Katanas (Pixel Art)
 */
export function drawInosukeDualSerratedKatanas(ctx, x, y, angle, r = 25, opts = {}) {
  const isPreview = Boolean(opts.isPreview);
  const now = opts.now || Date.now();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;

  const drawSinglePixelSerratedBlade = (offsetY, rotOffset) => {
    ctx.save();
    ctx.translate(0, offsetY);
    ctx.rotate(rotOffset);

    const bladeLength = snap(46);
    const bladeWidth = snap(4);
    const hiltLength = snap(13);
    const startX = snap(r * 0.72);

    // 1. Chipped / Serrated Grey Steel Blade (Stepped Notches)
    ctx.fillStyle = '#64748B'; // Indigo slate steel
    ctx.fillRect(startX, -bladeWidth / 2, bladeLength, bladeWidth);

    // Jagged upper spine notches (stepped cutouts)
    ctx.fillStyle = '#94A3B8'; // Chipped highlight edge
    for (let bx = startX + 6; bx < startX + bladeLength - 8; bx += 8) {
      ctx.clearRect(bx, -bladeWidth / 2, 3, 2);
      ctx.fillRect(bx + 3, -bladeWidth / 2, 2, 1);
    }

    // Jagged lower edge notches
    for (let bx = startX + 10; bx < startX + bladeLength - 6; bx += 8) {
      ctx.clearRect(bx, bladeWidth / 2 - 2, 3, 2);
      ctx.fillRect(bx + 3, bladeWidth / 2 - 1, 2, 1);
    }

    // Rough Chipped Tip
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(startX + bladeLength - 2, -1, 3, 2);

    // 2. White Cloth Bandage Wrapped Handle (No Tsuba)
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(startX - hiltLength, -2, hiltLength, 4);
    // Bandage wrap diagonal stitches
    ctx.fillStyle = '#CBD5E1';
    for (let i = 2; i < hiltLength; i += 3) {
      ctx.fillRect(startX - hiltLength + i, -2, 1, 4);
    }

    ctx.restore();
  };

  // Draw Blade 1 (Upper Forward Blade)
  drawSinglePixelSerratedBlade(-5, -0.10);

  // Draw Blade 2 (Lower Cross Blade)
  drawSinglePixelSerratedBlade(5, 0.15);

  ctx.restore();
}
