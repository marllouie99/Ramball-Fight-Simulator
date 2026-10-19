// ─────────────────────────────────────────────
// Demon Slayer Weapon Graphics & Visual Effects (Authentic Pixel Art Edition)
// Tanjiro (Nichirin Katana), Nezuko (Demon Claws),
// Zenitsu (Lightning Katana), Inosuke (Dual Serrated Blades)
// Adheres strictly to Rule 11 (Zero shadowBlur) & Stack Balance
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { getHandSize } from '../../core/config.js';

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

// ─── Zenitsu Weapon Asset Loader ───
let _zenitsuAssemblyImage = null;
let _zenitsuAssemblyImageLoading = false;

export function _getZenitsuAssemblyImage() {
  if (_zenitsuAssemblyImage && _zenitsuAssemblyImage.complete && _zenitsuAssemblyImage.naturalWidth > 0) {
    return _zenitsuAssemblyImage;
  }
  if (!_zenitsuAssemblyImageLoading && typeof Image !== 'undefined') {
    _zenitsuAssemblyImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _zenitsuAssemblyImage = img;
      _zenitsuAssemblyImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Zenitsu weapon at Assets/model/zenitsu/Zenitsu-weapon.png', e);
      _zenitsuAssemblyImageLoading = false;
    };
    img.src = encodeURI('Assets/model/zenitsu/Zenitsu-weapon.png?v=6');
    _zenitsuAssemblyImage = img;
  }
  return _zenitsuAssemblyImage;
}

// Backward-compatibility alias
export function _getZenitsuWeaponImage() {
  return _getZenitsuAssemblyImage();
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getZenitsuAssemblyImage();
}

/**
 * Draws Zenitsu's Lightning Nichirin Katana from:
 * "Assets/model/zenitsu/Zenitsu-weapon.png"
 * Anchored directly at the Tsuba guard (0, 0), with authentic pixel-art scaling,
 * two-handed tsuka grip (Rule 20), and Weapon Studio customization support.
 * Falls back to procedural pixel art if the image has not loaded yet.
 */
export function drawZenitsuLightningKatana(ctx, x, y, angle, r = 25, opts = {}) {
  const isPreview = Boolean(opts.isPreview);
  const now = opts.now || Date.now();

  // Weapon Studio customization support
  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.zenitsu)
    ? state.weaponCustomizations.zenitsu
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0, widthScale: 1.0, lengthScale: 1.0 };

  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customWidthScale = custom.widthScale !== undefined ? custom.widthScale : 1.0;
  const customLengthScale = custom.lengthScale !== undefined ? custom.lengthScale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;

  ctx.save();
  ctx.translate(x + customOffsetX, y + customOffsetY);
  ctx.rotate(angle + customAngle);
  ctx.scale(customScale * customLengthScale, customScale * customWidthScale);

  if (isPreview) {
    ctx.translate(22, 0); // Center the full katana in preview (-40 from WeaponIndexScreen + 22 = -18, exact midpoint of 94.5px katana)
  }

  // ─── Try Assembled Weapon Asset First ───
  const img = _getZenitsuAssemblyImage();
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor pixel art scaling

    const parts = custom.parts || {};

    // 1. Assembled Katana (Tsuba guard centered at (0, 0))
    // Asset: "Assets/model/zenitsu/Zenitsu-weapon.png" (600 x 334)
    // Tsuba center is at (218, 191). Tip at (579, 10). Pommel at (54, 273).
    // Native diagonal angle: atan2(10 - 191, 579 - 218) = -0.4643 rad (-26.60 deg).
    // Rotating by +0.4643 rad aligns blade along +X and handle along -X.
    // Blade diagonal length is 403.8px. Base scale 65.0 / 403.8 = 0.1610 maps to 65px reach.
    const tsubaX = 218;
    const tsubaY = 191;
    const ASSET_ANGLE = 0.4643;
    const baseScale = 65.0 / 403.8;

    ctx.save();
    ctx.rotate(ASSET_ANGLE);
    ctx.scale(baseScale, baseScale);
    ctx.drawImage(img, -tsubaX, -tsubaY);
    ctx.restore();

    // ─── 2. HANDS (Two-Hand Grip on Tsuka Handle) ───
    const shouldDrawHands = opts.drawHands || (isPreview && opts.showHands !== false);
    if (shouldDrawHands) {
      const handsCfg = parts.hands || {};
      const handsOffX = handsCfg.offsetX ?? 0;
      const handsOffY = handsCfg.offsetY ?? 0;
      const handsScale = handsCfg.scale ?? 1.0;
      const handsSpacing = handsCfg.spacing ?? 1.0;
      const skinColor = opts.skinColor || '#FEE8D6';

      // Tsuka handle extends from X = 0 (tsuba) to X = -29.5px (pommel)
      const midX = -15.5;
      const spread = 6.0 * handsSpacing;
      const backX = midX - spread + handsOffX;   // ~ -21.5px (near pommel)
      const frontX = midX + spread + handsOffX;  // ~ -9.5px (near tsuba)

      // Rear Hand (near pommel)
      if (!opts.hideBackHand) {
        const backR = (getHandSize ? getHandSize(4.4) : 4.4) * handsScale;
        drawPixelHand(ctx, backX, handsOffY, backR, skinColor, '#000000');
      }

      // Front Hand (lead grip near tsuba)
      if (!opts.hideFrontHand) {
        const frontR = (getHandSize ? getHandSize(4.8) : 4.8) * handsScale;
        drawPixelHand(ctx, frontX, handsOffY, frontR, skinColor, '#000000');
      }
    }

    ctx.restore(); // restore imageSmoothing
    ctx.restore(); // restore outer transform
    return;
  }

  // ─── Procedural Pixel Art Fallback ───
  ctx.imageSmoothingEnabled = false;

  const bladeLength = snap(48);
  const bladeWidth = snap(4);
  const hiltLength = snap(14);
  const startX = 0; // Tsuba guard anchored at (0, 0)

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

  // 5. White Tsuka (Hilt) with Gold Diamond Wrap (Extends backward from tsuba)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(startX - hiltLength, -2, hiltLength, 4);
  ctx.fillStyle = '#F59E0B';
  for (let i = 2; i < hiltLength - 2; i += 3) {
    ctx.fillRect(startX - hiltLength + i, -1, 2, 2);
  }
  // Gold Pommel
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(startX - hiltLength - 2, -3, 2, 6);

  // 6. Hands in Procedural Fallback
  const shouldDrawHandsFallback = opts.drawHands || (isPreview && opts.showHands !== false);
  if (shouldDrawHandsFallback) {
    const skinColor = opts.skinColor || '#FEE8D6';
    if (!opts.hideBackHand) {
      drawPixelHand(ctx, -hiltLength * 0.75, 0, getHandSize ? getHandSize(4.4) : 4.4, skinColor, '#000000');
    }
    if (!opts.hideFrontHand) {
      drawPixelHand(ctx, -hiltLength * 0.25, 0, getHandSize ? getHandSize(4.8) : 4.8, skinColor, '#000000');
    }
  }

  // 7. Electric Cyan Spark Pixel
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
