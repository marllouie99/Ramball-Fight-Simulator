import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

// ─────────────────────────────────────────────
// GUNSLINGER WEAPON GRAPHICS (Authentic Pixel Art Western Revolvers)
// Features:
// 1. Authentic 2D Discrete Grid Rasterization Engine ($P = 1.25\text{px}$) (Rule 3.5)
// 2. 4-Tier Stepped Metal, Fluted 6-Chamber Cylinder & Polished Walnut Wood Grip
// 3. Brass Colt Star Medallion, Cocked Serrated Hammer & Match Trigger
// 4. Stepped 16-Bit Pixel Art Muzzle Starburst & Flying Powder Sparks (Rule 11 Zero shadowBlur)
// 5. Pixel Cartridge Bullet with Brass Casing & Silver Tip
// 6. Dual-Wield Front-POV Support, Recoil Tilt, and Reload Spin
// ─────────────────────────────────────────────

export const GUNSLINGER_BULLET_GRAPHICS = {
  casingColor: '#F59E0B',        // Brass casing
  casingHighlight: '#FDE047',    // Bright brass highlight
  casingShadow: '#92400E',       // Dark brass shadow
  tipColor: '#CBD5E1',           // Silver bullet tip
  tipHighlight: '#FFFFFF',       // Bright silver glint
  tipShadow: '#64748B',          // Silver shadow
  lengthRatio: 2.8,              // Length relative to width
  tipRatio: 0.35,                // Tip length relative to total length
};

/**
 * Draws an authentic discrete pixel art revolver bullet and speed streak
 */
export function drawGunSlingerBullet(ctx, x, y, angle, scale = 1, lifeRatio = 1) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);

  const P = 0.85 * scale;

  // Discrete pixel block painter
  const px = (gx, gy, color) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(P), Math.round(P));
  };

  const rect = (gx, gy, gw, gh, color) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
  };

  // ── 1. Discrete Pixel Speed Smoke Trail (Trailing Behind) ──
  const trailLen = Math.round(10 * lifeRatio);
  for (let i = 1; i <= trailLen; i++) {
    const alpha = Math.max(0, (1.0 - i / trailLen) * 0.7 * lifeRatio);
    ctx.globalAlpha = alpha;
    if (i % 2 === 0) {
      rect(-i * 2 - 4, -1, 2, 2, '#FDE047');
    } else {
      rect(-i * 2 - 4, 0, 2, 1, '#F97316');
    }
  }
  ctx.globalAlpha = 1.0;

  // ── 2. Brass Casing Body (gx: -6 to -1, gy: -2 to 1) ──
  // Dark ink outline shell
  rect(-7, -2, 7, 4, '#0F1218');

  // Brass Extractor Rim & Base
  rect(-6, -1, 1, 2, '#FDE047');
  rect(-6, 0, 1, 1, '#D97706');
  // Extractor groove
  rect(-5, -1, 1, 2, '#78350F');

  // Main Brass Body with Stepped Lighting
  rect(-4, -1, 4, 1, '#FEF08A'); // Top glint
  rect(-4, 0, 4, 1, '#F59E0B');  // Mid brass
  rect(-4, 1, 4, 1, '#B45309');  // Bottom shadow

  // ── 3. Silver Lead Pointed Bullet Tip (gx: 0 to 4) ──
  // Outline shell
  px(0, -2, '#0F1218');
  px(1, -2, '#0F1218');
  px(2, -1, '#0F1218');
  px(3, -1, '#0F1218');
  px(4, 0, '#0F1218');
  px(3, 1, '#0F1218');
  px(2, 1, '#0F1218');
  px(1, 2, '#0F1218');
  px(0, 2, '#0F1218');

  // Silver Shading Fill
  rect(0, -1, 2, 1, '#FFFFFF'); // Specular glint
  rect(0, 0, 3, 1, '#CBD5E1');  // Core silver
  rect(0, 1, 2, 1, '#64748B');  // Shadow underside
  px(3, 0, '#CBD5E1');

  ctx.restore();
}

/**
 * Draws an authentic 16-bit discrete pixel art muzzle flash starburst and powder sparks.
 * Strictly adheres to Rule 11 (Zero shadowBlur CPU filters).
 */
export function drawGunSlingerMuzzleFlash(ctx, x, y, angle, scale = 1, intensity = 1) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);

  const P = 1.6 * scale;
  const alpha = Math.min(1.0, Math.max(0, intensity));
  ctx.globalAlpha = alpha;

  const px = (gx, gy, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(P), Math.round(P));
  };

  const rect = (gx, gy, gw, gh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
  };

  // ── 1. Outer Crimson / Red Fire Spikes ──
  rect(-2, -5, 4, 10, '#DC2626');
  rect(-5, -2, 10, 4, '#DC2626');
  rect(4, -3, 4, 6, '#DC2626');
  rect(7, -1, 3, 2, '#DC2626');
  px(-3, -3, '#DC2626');
  px(3, -3, '#DC2626');
  px(-3, 3, '#DC2626');
  px(3, 3, '#DC2626');

  // ── 2. Mid Fiery Orange Blast Petals ──
  rect(-1, -4, 2, 8, '#F97316');
  rect(-4, -1, 8, 2, '#F97316');
  rect(3, -2, 3, 4, '#F97316');
  rect(5, -1, 2, 2, '#F97316');
  px(-2, -2, '#FB923C');
  px(2, -2, '#FB923C');
  px(-2, 2, '#FB923C');
  px(2, 2, '#FB923C');

  // ── 3. Inner Neon Yellow Core ──
  rect(-1, -2, 4, 4, '#FDE047');
  rect(1, -1, 3, 2, '#FDE047');

  // ── 4. White-Hot Flash Center ──
  rect(0, -1, 2, 2, '#FFFFFF');
  px(1, 0, '#FFFFFF');

  // ── 5. Flying Powder Sparks (Pixel Clusters) ──
  px(8, -4, '#FEF08A');
  px(10, -2, '#F97316');
  px(9, 3, '#FEF08A');
  px(11, 1, '#FDE047');
  px(6, 5, '#EF4444');
  px(7, -6, '#F97316');

  ctx.restore();
}

export const GUNSLINGER_WEAPON_GRAPHICS = {
  revolver: {
    // Blued Steel / Gunmetal Palette
    outline: '#0D0F14',          // Dark manga ink pixel shell
    metalGlint: '#FFFFFF',       // Specular glint highlight
    metalHighlight: '#CBD5E1',   // Light steel bevel
    metalLight: '#94A3B8',       // Upper slide / cylinder highlight
    metalMid: '#475569',         // Mid gunmetal body
    metalDark: '#334155',        // Receiver shadow
    metalDeep: '#1E293B',        // Deep steel crease
    metalBlack: '#0F172A',       // Ejector rod / bore core
    
    // Cylinder Details
    cylinderFlute: '#0A0E17',    // Deep flute grooves
    cylinderNotch: '#1E293B',    // Index notch
    cylinderCrane: '#E2E8F0',    // Center axis pin

    // Rich Walnut / Amber Wood Grip
    gripOutline: '#120904',      // Deep dark wood outline
    gripGlint: '#D97706',        // Amber edge glint
    gripLight: '#B45309',        // Rich polished wood
    gripMid: '#78350F',          // Base walnut body
    gripShadow: '#451A03',       // Dark wood shadow
    
    // Golden Colt Medallion
    medallionGold: '#FBBF24',    // Bright gold medallion
    medallionGlint: '#FEF08A',   // Specular gold glint
    medallionShadow: '#B45309',  // Gold rim shadow

    // Match Trigger & Controls
    triggerSilver: '#E2E8F0',    // Silver trigger
    hammerSteel: '#64748B',      // Serrated hammer spur
  },
  positioning: {
    scale: 0.72,
    gunOffset: 2,
    leftGunOffset: 50,
  },
  recoil: {
    maxRecoil: 8,
    recoilDecay: 0.15,
    maxTilt: 0.6,
    tiltDecay: 0.05,
  },
};

/**
 * Draws Gunslinger's authentic pixel art Dual Western Revolvers
 */
export function drawGunSlingerDualRevolver(
  x,
  y,
  rightGunAngle,
  leftGunAngle,
  r,
  isFiring = false,
  flashFrame = 0,
  rightRecoilOffset = 0,
  rightRecoilTilt = 0,
  leftRecoilOffset = 0,
  leftRecoilTilt = 0,
  gunSpinAngle = 0,
  fighterColor = '#888',
  leftIsFiring = false,
  leftFlashFrame = 0
) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  const ctx = state.ctx;
  if (!ctx) return;

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations?.gunslinger) || {};
  const customScale = custom.scale ?? 1.0;
  const customOffX = custom.offsetX ?? 0;
  const customOffY = custom.offsetY ?? 0;
  const customRot = custom.angleOffset ?? 0;

  const baseScale = GUNSLINGER_WEAPON_GRAPHICS.positioning.scale * customScale;
  const C = GUNSLINGER_WEAPON_GRAPHICS.revolver;

  /**
   * Discrete 2D Pixel Art Single Action Western Revolver
   */
  function drawPixelRevolver(gunIsFiring, gunFlashFrame) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Fixed discrete grid block unit
    const P = 1.25 * baseScale;

    const px = (gx, gy, fill) => {
      if (!fill) return;
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(P), Math.round(P));
    };

    const rect = (gx, gy, gw, gh, fill) => {
      if (!fill) return;
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
    };

    // ═══════════════════════════════════════════════════════════════════
    // 1. POLISHED WALNUT WOOD GRIP (Planted curve, gx: -18 to 0, gy: 5 to 25)
    // ═══════════════════════════════════════════════════════════════════
    // Grip Solid Dark Outline Shell
    rect(-12, 5, 8, 2, C.gripOutline);
    rect(-15, 7, 5, 4, C.gripOutline);
    rect(-18, 11, 4, 7, C.gripOutline);
    rect(-19, 18, 4, 6, C.gripOutline);
    rect(-18, 24, 10, 3, C.gripOutline); // Grip bottom butt
    rect(-8, 22, 5, 4, C.gripOutline);
    rect(-5, 16, 4, 7, C.gripOutline);
    rect(-2, 9, 3, 8, C.gripOutline);

    // Grip Rich Wood Fill & 4-Tier Shading
    rect(-10, 6, 6, 2, C.gripMid);
    rect(-13, 8, 10, 3, C.gripMid);
    rect(-16, 11, 13, 7, C.gripMid);
    rect(-17, 18, 13, 6, C.gripMid);
    rect(-15, 24, 6, 2, C.gripShadow);

    // Wood Grain & Edge Highlights
    rect(-11, 6, 4, 1, C.gripGlint);
    rect(-14, 8, 2, 4, C.gripLight);
    rect(-16, 12, 2, 6, C.gripLight);
    rect(-17, 18, 2, 5, C.gripLight);
    rect(-16, 23, 3, 1, C.gripLight);

    // Deep Rear & Bottom Wood Shadow
    rect(-17, 14, 2, 5, C.gripShadow);
    rect(-18, 19, 2, 4, C.gripShadow);
    rect(-14, 23, 6, 2, C.gripShadow);

    // Brass Colt Star Medallion (gx: -9 to -6, gy: 12 to 15)
    rect(-9, 12, 4, 4, C.medallionShadow);
    rect(-8, 12, 2, 4, C.medallionGold);
    rect(-9, 13, 4, 2, C.medallionGold);
    px(-8, 13, C.medallionGlint); // Center specular sparkle

    // ═══════════════════════════════════════════════════════════════════
    // 2. RECEIVER FRAME, TOP STRAP & SIGHT GROOVE
    // ═══════════════════════════════════════════════════════════════════
    // Dark Frame Outline
    rect(-9, -4, 24, 2, C.outline); // Top strap line
    rect(-10, -3, 3, 9, C.outline); // Recoil shield back
    rect(14, -4, 2, 13, C.outline); // Forward cylinder frame

    // Frame Metal Body
    rect(-8, -3, 8, 8, C.metalMid);
    rect(-8, -3, 23, 2, C.metalLight); // Top strap
    rect(-7, -4, 21, 1, C.metalGlint); // Upper bevel sheen
    rect(-9, -2, 3, 7, C.metalDark);  // Recoil shield curve
    rect(13, -3, 2, 11, C.metalDark); // Forward frame bridge

    // ═══════════════════════════════════════════════════════════════════
    // 3. FLUTED 6-CHAMBER CYLINDER (gx: 0 to 13, gy: -2 to 8)
    // ═══════════════════════════════════════════════════════════════════
    // Cylinder Dark Border
    rect(0, -2, 14, 11, C.outline);

    // Cylinder Metallic Core
    rect(1, -1, 12, 9, C.metalMid);

    // Upper Chamber & Glint
    rect(1, -1, 12, 1, C.metalLight);
    rect(2, -1, 10, 1, C.metalGlint);

    // Cylinder Flute 1 (Top Dark Groove)
    rect(2, 0, 10, 1, C.cylinderFlute);

    // Mid Chamber Face & Specular Ridge
    rect(1, 1, 12, 3, C.metalLight);
    rect(2, 2, 10, 1, C.metalGlint);

    // Cylinder Flute 2 (Center Dark Groove)
    rect(2, 4, 10, 1, C.cylinderFlute);

    // Lower Chamber & Shadow
    rect(1, 5, 12, 2, C.metalDark);
    rect(2, 7, 10, 1, C.cylinderFlute); // Flute 3

    // Cylinder Notches & Center Axis Pin
    rect(0, 2, 2, 2, C.cylinderCrane);
    rect(12, 2, 2, 2, C.cylinderCrane);
    px(0, 0, C.cylinderNotch);
    px(0, 5, C.cylinderNotch);

    // ═══════════════════════════════════════════════════════════════════
    // 4. LONG RIFLED STEEL BARREL & EJECTOR TUBE (gx: 14 to 45)
    // ═══════════════════════════════════════════════════════════════════
    // Barrel Dark Outline Shell
    rect(14, -3, 31, 6, C.outline);

    // Top Bevel Glint Line
    rect(15, -3, 30, 1, C.metalGlint);

    // Barrel Steel Body
    rect(15, -2, 30, 2, C.metalHighlight);
    rect(15, 0, 30, 2, C.metalMid);
    rect(15, 2, 30, 1, C.metalDark);

    // Barrel Underside Shadow
    rect(15, 2, 30, 1, C.metalDeep);

    // Front Blade Sight (gx: 41 to 44, gy: -5 to -3)
    rect(41, -5, 3, 3, C.outline);
    rect(41, -4, 2, 2, C.metalHighlight);
    px(42, -5, C.metalGlint); // Sight post glint

    // Muzzle Crown & Rifled Bore (gx: 44 to 45)
    rect(44, -2, 1, 4, C.metalHighlight);
    rect(45, -1, 1, 2, C.metalBlack);

    // Ejector Rod Housing & Knurled Head (Underneath Barrel, gx: 14 to 34, gy: 3 to 5)
    rect(14, 3, 20, 2, C.outline);
    rect(15, 3, 16, 1, C.metalDark);
    rect(15, 4, 16, 1, C.metalBlack);
    // Ejector rod knurled thumb head
    rect(31, 2, 3, 3, C.metalHighlight);
    px(32, 2, C.metalGlint);

    // ═══════════════════════════════════════════════════════════════════
    // 5. TRIGGER GUARD & MATCH TRIGGER (gx: 0 to 13, gy: 8 to 16)
    // ═══════════════════════════════════════════════════════════════════
    // Trigger Guard Steel Loop
    rect(1, 8, 2, 7, C.outline);
    rect(3, 14, 8, 2, C.outline);
    rect(10, 8, 2, 7, C.outline);

    rect(2, 9, 1, 5, C.metalMid);
    rect(4, 14, 6, 1, C.metalLight);
    rect(9, 9, 1, 5, C.metalMid);

    // Curved Silver Trigger (gx: 5 to 7, gy: 9 to 13)
    rect(5, 9, 2, 2, C.triggerSilver);
    rect(6, 11, 2, 2, C.triggerSilver);
    px(6, 9, C.metalGlint);

    // ═══════════════════════════════════════════════════════════════════
    // 6. SERRATED HAMMER & SPUR (gx: -12 to -7, gy: -8 to -3)
    // ═══════════════════════════════════════════════════════════════════
    rect(-12, -8, 5, 6, C.outline);
    rect(-11, -7, 3, 2, C.hammerSteel);
    rect(-10, -5, 3, 3, C.metalDark);
    px(-11, -7, C.metalGlint); // Hammer cocked spur notch

    // ═══════════════════════════════════════════════════════════════════
    // 7. MUZZLE FLASH & SPARK STARBURST
    // ═══════════════════════════════════════════════════════════════════
    if (gunIsFiring || gunFlashFrame > 0) {
      const intensity = gunFlashFrame > 0 ? Math.min(1.0, Math.max(0.35, gunFlashFrame / 6.0)) : 1.0;
      ctx.save();
      drawGunSlingerMuzzleFlash(ctx, 45 * P, -0.5 * P, 0, baseScale, intensity);
      ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. AUTHENTIC RETRO PIXEL ART HAND (Rule 20 / Rule 3.6)
    // ═══════════════════════════════════════════════════════════════════
    const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly);
    if (!shouldHideHands) {
      const handR = getHandSize(6.2 * baseScale);
      drawPixelHand(ctx, -6 * P, 14 * P, handR, fighterColor || '#FFE0BD', '#0D0F14');
    }

    ctx.restore();
  }

  // ── Upright Front-POV Orientation & Positioning (Matching Anime Fighters) ──
  ctx.save();
  ctx.translate(x + customOffX, y + customOffY);

  // Primary aim angle determines fighter facing & rotation
  const primaryAngle = (rightGunAngle !== undefined && !Number.isNaN(rightGunAngle)) ? rightGunAngle : (leftGunAngle || 0);
  const facingLeft = Math.abs(primaryAngle) > Math.PI / 2;

  ctx.rotate(primaryAngle + customRot);
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Dual-Wield Stance Coordinates in Front-POV:
  // Rear Revolver (Left Gun): Held on the left/back side of body (-0.45r)
  const supportX = -r * 0.45;
  const supportY = 0;

  // Front Revolver (Right Gun): Held on the right/front side of body (+0.90r)
  const leadX = r * 0.90;
  const leadY = 0;

  // ── 1. Draw Lower / Support Revolver (Left Gun) Behind Lead Gun ──
  let leftDiff = (leftGunAngle !== undefined && !Number.isNaN(leftGunAngle) ? leftGunAngle : primaryAngle) - primaryAngle;
  let normLeftDiff = Math.atan2(Math.sin(leftDiff), Math.cos(leftDiff));
  if (facingLeft) normLeftDiff = -normLeftDiff;

  ctx.save();
  ctx.translate(supportX, supportY);
  ctx.rotate(normLeftDiff);
  ctx.translate(-leftRecoilOffset, 0);
  ctx.rotate(-leftRecoilTilt); // Barrel kicks upward on recoil

  // Gun spin animation during reload (pivots around trigger guard / index finger)
  if (gunSpinAngle !== 0) {
    ctx.translate(-8 * baseScale, 12 * baseScale);
    ctx.rotate(-gunSpinAngle);
    ctx.translate(8 * baseScale, -12 * baseScale);
  }

  drawPixelRevolver(leftIsFiring !== undefined ? leftIsFiring : isFiring, leftFlashFrame || flashFrame);
  ctx.restore();

  // ── 2. Draw Upper / Lead Revolver (Right Gun) In Front ──
  let rightDiff = (rightGunAngle !== undefined && !Number.isNaN(rightGunAngle) ? rightGunAngle : primaryAngle) - primaryAngle;
  let normRightDiff = Math.atan2(Math.sin(rightDiff), Math.cos(rightDiff));
  if (facingLeft) normRightDiff = -normRightDiff;

  ctx.save();
  ctx.translate(leadX, leadY);
  ctx.rotate(normRightDiff);
  ctx.translate(-rightRecoilOffset, 0);
  ctx.rotate(-rightRecoilTilt); // Barrel kicks upward on recoil

  // Gun spin animation during reload (pivots around trigger guard / index finger)
  if (gunSpinAngle !== 0) {
    ctx.translate(-8 * baseScale, 12 * baseScale);
    ctx.rotate(gunSpinAngle);
    ctx.translate(8 * baseScale, -12 * baseScale);
  }

  drawPixelRevolver(isFiring, flashFrame);
  ctx.restore();

  ctx.restore();
}

