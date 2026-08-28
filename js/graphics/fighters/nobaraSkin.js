// ─────────────────────────────────────────────
// Nobara Kugisaki Fighter Skin & Body Model
// Straw Doll Sorcerer — Jujutsu High
// Minimalist, stylized circle fighter aesthetic matching Gojo, Yuji & Nanami
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state, isChampionScreenActive } from '../../core/state.js';
import { drawNobaraHammer, drawNobaraFloatingNails } from '../weapons/nobaraWeaponGraphics.js';

// Pre-computed normalized hairline points for Nobara's sleek, smooth, non-spiky side-parted bob cut
// Sweeps in a clean, smooth, straight diagonal from right flank (+X) to left flank (-X)
const _NOBARA_HAIRLINE = [
  { nx:  1.00, ny:  0.22 }, // Right outer flank (meeting circle border & navy uniform)
  { nx:  0.72, ny:  0.22 }, // Right cheek lock base
  { nx:  0.42, ny: -0.48 }, // Forehead peak at the side part (highest point of exposed face)
  { nx:  0.15, ny: -0.32 }, // Smooth straight diagonal sweep across forehead
  { nx: -0.15, ny: -0.15 }, // Smooth straight diagonal sweep across forehead
  { nx: -0.45, ny:  0.02 }, // Smooth straight diagonal sweep to left temple
  { nx: -0.75, ny:  0.22 }, // Left cheek lock base
  { nx: -1.00, ny:  0.22 }  // Left outer flank (meeting circle border & navy uniform)
];

/**
 * Draws Nobara's Rose-Crimson JJK Cursed Energy Aura.
 * Rule 11 Compliant: Zero shadowBlur CPU Gaussian filtering.
 */
export function drawNobaraCursedEnergyAura(ctx, fighter) {
  const r = fighter.r || 25;
  const isEcstasy = Boolean(fighter.isEcstasyActive || ((fighter.hp / (fighter.maxHp || 400)) <= 0.50));
  const isBlitzing = Boolean(fighter.isBlitzing || (fighter.blackFlashAuraTimer && fighter.blackFlashAuraTimer > 0));

  if (fighter && fighter._isWinnerReveal) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const baseAlpha = isBlitzing ? 0.95 : (isEcstasy ? 0.70 : (fighter.combatAuraOpacity || 0.22));
  if (baseAlpha <= 0.01) return;

  ctx.save();

  const pulse = Math.sin(now * 0.007) * 2.5;
  const auraR = r * 1.38 + pulse;

  // Soft Rose-Crimson Radial Halo (Rule 11 Zero shadowBlur)
  const auraGrad = ctx.createRadialGradient(0, 0, r * 0.70, 0, 0, auraR);
  if (isBlitzing) {
    auraGrad.addColorStop(0, 'rgba(239, 68, 68, 0.50)');
    auraGrad.addColorStop(0.45, 'rgba(15, 15, 15, 0.40)');
    auraGrad.addColorStop(1, 'rgba(217, 78, 104, 0)');
  } else if (isEcstasy) {
    auraGrad.addColorStop(0, 'rgba(255, 107, 129, 0.38)');
    auraGrad.addColorStop(0.65, 'rgba(217, 78, 104, 0.22)');
    auraGrad.addColorStop(1, 'rgba(217, 78, 104, 0)');
  } else {
    auraGrad.addColorStop(0, 'rgba(217, 78, 104, 0.24)');
    auraGrad.addColorStop(0.70, 'rgba(217, 78, 104, 0.09)');
    auraGrad.addColorStop(1, 'rgba(217, 78, 104, 0)');
  }

  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Swirling Cursed Rose Petal / Ember Flares
  if (isEcstasy || isBlitzing) {
    const emberCount = isBlitzing ? 8 : 5;
    for (let i = 0; i < emberCount; i++) {
      const angle = (now * 0.0035) + (i * (Math.PI * 2 / emberCount));
      const dist = r * 1.18 + Math.sin(now * 0.006 + i * 2.2) * 5;
      const ex = Math.cos(angle) * dist;
      const ey = Math.sin(angle) * dist;

      ctx.fillStyle = (i % 2 === 0) ? 'rgba(255, 107, 129, 0.90)' : 'rgba(217, 78, 104, 0.80)';
      ctx.beginPath();
      ctx.arc(ex, ey, isBlitzing ? 2.6 : 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Nobara Kugisaki (Straw Doll Sorcerer)
 */
export function drawNobaraSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isEcstasy = Boolean(fighter.isEcstasyActive || ((fighter.hp / (fighter.maxHp || 400)) <= 0.50));
  const isBlitzing = Boolean(fighter.isBlitzing || (fighter.blackFlashAuraTimer && fighter.blackFlashAuraTimer > 0));
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Draw Cursed Energy Aura
  if (!isPodiumPreview) {
    drawNobaraCursedEnergyAura(ctx, fighter);
  }

  // 2. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Animation States & Progress
  const isSwinging = !isPodiumPreview && (fighter.slashSwingTimer > 0 || fighter.punchAnimTimer > 0);
  let rawProgress = 0;
  if (isSwinging) {
    const maxT = fighter.slashSwingMaxTimer || fighter.punchMaxTime || 18;
    const curTimer = fighter.slashSwingTimer > 0 ? fighter.slashSwingTimer : fighter.punchAnimTimer;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxT)));
  }

  // Smooth continuous thrust curve for hammer strike
  const easeSwing = isSwinging ? Math.pow(Math.sin(rawProgress * Math.PI), 1.2) : 0;
  const lungeExtension = easeSwing * (r * 0.90);

  // Hand Positions
  const frontX = r * 0.92 + lungeExtension;
  const frontY = Math.sin(rawProgress * Math.PI) * (r * 0.22);
  const backX = r * 0.30;
  const backY = -r * 0.42;

  const hideHandsAndWeapon = isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = hideHandsAndWeapon || fighter.hideFrontHand;
  const hideBackHand = hideHandsAndWeapon || fighter.hideBackHand;
  const handRadius = getHandSize(6.8);

  // Color Palette
  const skinBase = '#FEEFE6';       // Fair porcelain anime skin tone
  const skinShadow = '#E2AA90';     // Shadow contour
  const hairGinger = '#C25E28';     // Warm autumn ginger base
  const hairCrease = '#7A2808';     // Diagonal hair flow line
  const hairHighlight = '#E88B52';  // Silky strand highlight

  // ── LAYER 1: BACK HAND & FLOATING NAILS (Behind Body) ──
  if (!hideBackHand) {
    _drawFist(ctx, backX, backY, handRadius * 0.88, skinBase, skinShadow);
    drawNobaraFloatingNails(ctx, backX + 4, backY - 6, fighter.floatingNailCount || 3, isEcstasy);
  }

  // ── LAYER 2: BODY CIRCLE (Clipped cleanly to Radius r) ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // A. Base Skin Fill
  ctx.fillStyle = skinBase;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // B. JUJUTSU HIGH UNIFORM & TORSO (+Y Hemisphere: Y = r * 0.22 to r * 1.0)
  const uniformNavy = '#182030';      // Deep Jujutsu High Charcoal Navy
  const uniformHighlight = '#2B374E'; // Seam highlight
  const uniformShadow = '#0D121B';    // Deep fold shadow
  const whiteTrim = '#F8FAFC';        // Crisp white collar trim
  const beltLeather = '#5C3317';      // Rich leather belt
  const beltStitch = '#965A2C';       // Leather stitch
  const beltGold = '#F59E0B';         // Polished gold buckle
  const pouchDark = '#42220E';        // Nail pouch leather
  const goldCrest = '#F59E0B';        // Golden swirl buttons

  // 1. Navy Uniform Base (+Y)
  ctx.fillStyle = uniformNavy;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.22);
  ctx.lineTo(r, r * 0.22);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  // 2. High-Stand Mandarin Collar & White Inner Collar Trim
  // High Collar Base
  ctx.fillStyle = uniformNavy;
  ctx.beginPath();
  ctx.moveTo(-r * 0.38, r * 0.22);
  ctx.lineTo(-r * 0.34, r * 0.38);
  ctx.lineTo(r * 0.34, r * 0.38);
  ctx.lineTo(r * 0.38, r * 0.22);
  ctx.closePath();
  ctx.fill();

  // Crisp White Collar Lining Rim (peeking at the neck)
  ctx.fillStyle = whiteTrim;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, r * 0.21);
  ctx.lineTo(-r * 0.26, r * 0.26);
  ctx.lineTo(r * 0.26, r * 0.26);
  ctx.lineTo(r * 0.32, r * 0.21);
  ctx.closePath();
  ctx.fill();

  // Exposed Throat Skin V-Cut
  ctx.fillStyle = skinBase;
  ctx.beginPath();
  ctx.moveTo(-r * 0.16, r * 0.21);
  ctx.lineTo(r * 0.16, r * 0.21);
  ctx.lineTo(0, r * 0.30);
  ctx.closePath();
  ctx.fill();

  // Neck shadow
  ctx.fillStyle = 'rgba(180, 100, 70, 0.32)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.14, r * 0.21);
  ctx.lineTo(r * 0.14, r * 0.21);
  ctx.lineTo(0, r * 0.27);
  ctx.closePath();
  ctx.fill();

  // Front Collar Placket Seam
  ctx.strokeStyle = uniformShadow;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.28);
  ctx.lineTo(0, r * 0.68);
  ctx.stroke();

  // Jacket Side Tailored Curves
  ctx.strokeStyle = uniformHighlight;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.80, r * 0.24);
  ctx.quadraticCurveTo(-r * 0.55, r * 0.50, -r * 0.65, r * 0.70);
  ctx.moveTo(r * 0.80, r * 0.24);
  ctx.quadraticCurveTo(r * 0.55, r * 0.50, r * 0.65, r * 0.70);
  ctx.stroke();

  // 3. Golden Jujutsu High Spiral Crest Buttons (2 buttons on placket)
  for (const by of [r * 0.38, r * 0.52]) {
    ctx.fillStyle = goldCrest;
    ctx.beginPath();
    ctx.arc(0, by, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(0, by, 2.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, by, 1.1, -Math.PI * 0.5, Math.PI * 0.8);
    ctx.stroke();

    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.arc(-0.6, by - 0.6, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Brown Leather Utility Waist Belt (Y = r * 0.68 to r * 0.84)
  const beltY = r * 0.68;
  const beltH = r * 0.16;

  ctx.fillStyle = beltLeather;
  ctx.beginPath();
  ctx.roundRect(-r * 0.94, beltY, r * 1.88, beltH, 1.2);
  ctx.fill();

  // Belt Stitching Lines
  ctx.strokeStyle = beltStitch;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 1.5]);
  ctx.beginPath();
  ctx.moveTo(-r * 0.90, beltY + 1.4);
  ctx.lineTo(r * 0.90, beltY + 1.4);
  ctx.moveTo(-r * 0.90, beltY + beltH - 1.4);
  ctx.lineTo(r * 0.90, beltY + beltH - 1.4);
  ctx.stroke();
  ctx.setLineDash([]);

  // Belt Buckle (Polished Gold / Brass Rectangular Buckle)
  ctx.fillStyle = beltGold;
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(-4.2, beltY - 0.8, 8.4, beltH + 1.6, 1.2);
  ctx.fill();
  ctx.stroke();

  // Buckle Inner Slot
  ctx.fillStyle = beltLeather;
  ctx.beginPath();
  ctx.roundRect(-2.2, beltY + 1.0, 4.4, beltH - 2.0, 0.6);
  ctx.fill();

  // Buckle Shine
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.moveTo(-3.5, beltY - 0.4);
  ctx.lineTo(-1.0, beltY - 0.4);
  ctx.lineTo(-3.5, beltY + beltH * 0.5);
  ctx.closePath();
  ctx.fill();

  // 5. Left Hip Nail Pouch & Metallic Steel Nail Tips (-X side)
  ctx.fillStyle = pouchDark;
  ctx.strokeStyle = '#271206';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(-r * 0.84, beltY + 0.8, r * 0.28, r * 0.24, 1.5);
  ctx.fill();
  ctx.stroke();

  // Nail heads peeking out of pouch
  ctx.fillStyle = '#CBD5E1';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.6;
  for (const nx of [-r * 0.76, -r * 0.68, -r * 0.60]) {
    ctx.beginPath();
    ctx.roundRect(nx - 1.4, beltY - 1.8, 2.8, 1.8, 0.4);
    ctx.fill();
    ctx.stroke();
  }

  // 6. Right Hip Hammer Holster Ring (+X side)
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(r * 0.65, beltY + beltH * 0.8, 2.6, 0, Math.PI * 1.5);
  ctx.stroke();

  // 7. Dark Navy Pleated Skirt Folds
  ctx.strokeStyle = uniformShadow;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, beltY + beltH);
  ctx.lineTo(-r * 0.48, r);
  ctx.moveTo(-r * 0.14, beltY + beltH);
  ctx.lineTo(-r * 0.16, r);
  ctx.moveTo(r * 0.14, beltY + beltH);
  ctx.lineTo(r * 0.16, r);
  ctx.moveTo(r * 0.42, beltY + beltH);
  ctx.lineTo(r * 0.48, r);
  ctx.stroke();

  // ── C. NOBARA SLEEK SIDE-PARTED BOB CUT HAIR (Straight, Smooth, Non-Spiky) ──
  // Matching anime reference image with clean, straight diagonal sweeping bangs

  // 1. Solid Ginger Hair Base Mesh covering top dome down to the straight diagonal fringe
  ctx.fillStyle = hairGinger;
  ctx.beginPath();
  ctx.moveTo(-r, -r);
  ctx.lineTo(r, -r);
  ctx.lineTo(r * _NOBARA_HAIRLINE[0].nx, r * _NOBARA_HAIRLINE[0].ny);
  for (let i = 1; i < _NOBARA_HAIRLINE.length; i++) {
    ctx.lineTo(r * _NOBARA_HAIRLINE[i].nx, r * _NOBARA_HAIRLINE[i].ny);
  }
  ctx.closePath();
  ctx.fill();

  // 2. Internal Diagonal Hair Layer Crease Lines (matching anime reference layered sweep)
  ctx.strokeStyle = hairCrease;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Flow line 1: Upper diagonal layer
  ctx.moveTo(r * 0.36, -r * 0.74);
  ctx.quadraticCurveTo(-r * 0.05, -r * 0.45, -r * 0.42, -r * 0.10);
  // Flow line 2: Mid diagonal layer
  ctx.moveTo(r * 0.18, -r * 0.85);
  ctx.quadraticCurveTo(-r * 0.28, -r * 0.55, -r * 0.62, 0.06);
  // Flow line 3: Right temple lock layer
  ctx.moveTo(r * 0.48, -r * 0.65);
  ctx.quadraticCurveTo(r * 0.66, -r * 0.35, r * 0.70, 0.06);
  ctx.stroke();

  // 3. Silky Hair Highlight Strands running parallel across the diagonal sweep
  ctx.strokeStyle = hairHighlight;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(r * 0.28, -r * 0.80);
  ctx.quadraticCurveTo(-r * 0.12, -r * 0.50, -r * 0.32, -r * 0.18);
  ctx.moveTo(r * 0.08, -r * 0.88);
  ctx.quadraticCurveTo(-r * 0.38, -r * 0.60, -r * 0.68, -r * 0.05);
  ctx.stroke();

  // 4. Crisp Dark Hairline Edge Outline (Tracing the smooth, straight bottom fringe)
  ctx.strokeStyle = '#1A0E06';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(r * _NOBARA_HAIRLINE[0].nx, r * _NOBARA_HAIRLINE[0].ny);
  for (let i = 1; i < _NOBARA_HAIRLINE.length; i++) {
    ctx.lineTo(r * _NOBARA_HAIRLINE[i].nx, r * _NOBARA_HAIRLINE[i].ny);
  }
  ctx.stroke();

  // 5. Sleek Dark Bobby Pins (Hair Clips) on Right Temple near part
  ctx.strokeStyle = '#1E2430'; // Dark Slate Charcoal
  ctx.lineWidth = 2.0;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.40, -r * 0.54);
  ctx.lineTo(r * 0.60, -r * 0.44);
  ctx.moveTo(r * 0.36, -r * 0.47);
  ctx.lineTo(r * 0.56, -r * 0.37);
  ctx.stroke();

  ctx.restore(); // End Body Circle Clip

  // Status Overlays (stun, freeze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  // ── LAYER 3: FRONT HAND & WEAPON (On Top of Body) ──
  if (!hideFrontHand) {
    // Draw Nobara's Steel Carpenter Claw Hammer
    drawNobaraHammer(ctx, frontX, frontY, (isSwinging ? (rawProgress * 0.85 - 0.2) : 0), r, isSwinging, isBlitzing);

    // Front Grip Fist
    _drawFist(ctx, frontX, frontY, handRadius, skinBase, skinShadow);
  }

  ctx.restore();
}

/**
 * Draws a clean fighter fist in stepped pixel-art style.
 */
function _drawFist(ctx, x, y, radius, skinColor, shadowColor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const gridR = Math.max(P * 2, radius);
  const steps = Math.ceil(gridR / P);

  // 1. Dark Pixel Outline Shell
  ctx.fillStyle = '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= gridR + P * 0.75) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 2. Base Skin Core
  ctx.fillStyle = skinColor;
  const innerR = gridR - P * 0.4;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 3. Knuckle Depth Shading
  ctx.fillStyle = shadowColor || '#D09075';
  for (let gy = 0; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR && (gy * P > innerR * 0.35 || gx * P < -innerR * 0.45)) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 4. Specular Knuckle Highlight
  ctx.fillStyle = '#FFF5EB';
  ctx.fillRect(P * 0.5, -innerR * 0.45, P, P);
  ctx.fillRect(P * 1.5, -innerR * 0.45, P, P);

  ctx.restore();
}
