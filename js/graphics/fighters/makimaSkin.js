// ─────────────────────────────────────────────
// Makima (The Control Devil) Fighter Skin & Body Model (Authentic Pixel Art Edition)
// Chainsaw Man / Public Safety Special Division 4
// Minimalist, stylized circle fighter aesthetic matching Gojo, Nanami & Yuji
// Adheres strictly to:
// - Rule 19 (Upright Front POV Camera Orientation, Zero Eyes/Mouth/Nose)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

/**
 * Optional aura hook for Makima (surrounding rings and circles removed for clean aesthetic).
 */
export function drawMakimaControlAura(ctx, fighter) {
  // Surrounding halo rings and orbiting particles removed per user design request
}

/**
 * Main Skin Renderer for Makima (The Control Devil)
 * Adheres strictly to Rule 19, 20, 11 (Authentic Pixel Art Style)
 */
export function drawMakimaSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Animation States & Recoil Tracking
  const isShooting = !isPodiumPreview && (fighter.slashSwingTimer > 0 || fighter.punchAnimTimer > 0 || fighter.isShooting);
  let rawProgress = 0;
  if (isShooting) {
    const maxT = fighter.slashSwingMaxTimer || fighter.punchMaxTime || 16;
    const curTimer = fighter.slashSwingTimer > 0 ? fighter.slashSwingTimer : (fighter.punchAnimTimer > 0 ? fighter.punchAnimTimer : (fighter.shootTimer || 0));
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxT)));
  }

  // Finger Gun dynamic forward aim & recoil kickback
  const recoilCurve = isShooting ? Math.sin(rawProgress * Math.PI) : 0;
  const lungeExtension = isShooting ? (Math.sin(rawProgress * Math.PI * 0.5) * (r * 0.38) - Math.pow(recoilCurve, 2) * (r * 0.22)) : 0;

  // Hand Coordinates (Enlarged and stylishly anchored)
  const frontX = r * 0.95 + lungeExtension;
  const frontY = r * 0.04 - (recoilCurve * 4.0);
  const backX = -r * 0.24;
  const backY = -r * 0.45;

  const hideHandsAndWeapon = isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = hideHandsAndWeapon || fighter.hideFrontHand;
  const hideBackHand = hideHandsAndWeapon || fighter.hideBackHand;
  const handRadius = getHandSize(8.2);

  const skinBase = '#FEE5D6';
  const skinShadow = '#EDB8A2';

  // ── LAYER 1: BACK HAND & PIXEL SIDE BRAID (Behind Body Circle) ──
  if (!hideBackHand) {
    _drawFist(ctx, backX, backY, handRadius * 0.85, skinBase, skinShadow);
  }

  _drawMakimaPixelBraid(ctx, r);

  // ── LAYER 2: PROCEDURAL PIXEL ART BODY CIRCLE ──
  drawMakimaPixelBody(ctx, r);

  // Status Overlays (freeze, stun, time-stop)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  // ── LAYER 3: FRONT HAND & PIXEL FINGER-GUN ("BANG!") (On Top of Body) ──
  if (!hideFrontHand) {
    drawMakimaPixelFingerGun(ctx, frontX, frontY, rawProgress, r, isShooting);
  }

  ctx.restore();
}

/**
 * Draws Makima's entire body circle model in authentic Pixel Art Style.
 * Uses discrete stepped pixel grid rasterization matching Nanami, Saitama, and Yuji.
 * Features:
 * - Salmon-red parted bangs with center forehead peak & cheek locks
 * - Fair porcelain anime face skin (Rule 19 compliant faceless circle)
 * - Public Safety white collared dress shirt with fabric shading & pearl buttons
 * - Sharp pointed shirt collar wings & throat V-cut
 * - Slim solid matte black silk necktie (no clip)
 * - High-waisted dark charcoal trousers with waistband highlight & fly seam
 */
export function drawMakimaPixelBody(ctx, r) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Discrete Hairline Grid Mapping (1:1 Exact Match with Reference Pixel Art Image 1)
  // Index = gx + 13 (gx ranges from -13 to +13)
  // gx = -13..-9: Left cheek lock | -8..-5: Left notch | -4..2: Center lock & creases | 3..5: Right notch | 6..8: Right lock | 9..13: Right cheek lock
  const HAIRLINE_GY = [
     4,  4,  4,  4,  4,  -1, -3, -5, -3, -1, -1, -1,  0,  0,  0,  0, -3, -3, -2,  0,  0,  1,  4,  4,  4,  4,  4
  ];

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // 1. Pixelated Black Border Shell
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const colIdx = Math.max(0, Math.min(26, gx + 13));
      const hairLimitGy = HAIRLINE_GY[colIdx];
      const isHair = (gy < hairLimitGy);

      // Vertical Manga Crease Line columns (matching Image 1 at gx = -7, -3, 2, 6)
      const isCreaseLine = (
        (gx === -7 && gy >= -7 && gy <= -3) ||
        (gx === -3 && gy >= -7 && gy <= -1) ||
        (gx === 2  && gy >= -9 && gy <= 0) ||
        (gx === 6  && gy >= -7 && gy <= 0)
      );

      // ──────────────────────────────────────────
      // 2. SALMON-RED HAIR (gy < hairLimitGy)
      // ──────────────────────────────────────────
      if (isHair) {
        let col = '#D84845'; // Warm Crimson-Salmon Base (Exact Image 1 match)

        if (isCreaseLine) {
          col = '#7A1E16'; // Dark Vertical Manga Crease Accents
        } else if (gy < -9) {
          col = '#F0847C'; // Top Dome Hair Highlight
        } else if (gy === -8 && Math.abs(gx) <= 6) {
          col = '#F8928A'; // Crown Specular Highlight
        } else if (gy === hairLimitGy - 1) {
          col = '#781D16'; // Bang Bottom Shadow Edge Pixels
        } else if (Math.abs(gx) >= 9) {
          col = '#B33E3B'; // Outer Cheek Lock Depth Shading
        }

        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // 3. FAIR PORCELAIN FACE SKIN (hairLimitGy <= gy < r * 0.24 / P)
      // ──────────────────────────────────────────
      else if (ry < r * 0.24) {
        let col = '#FEE5D6'; // Fair Ivory / Porcelain Base Skin (Exact Image 1 match)

        if (hairLimitGy < 0 && (gy === hairLimitGy || (gy === hairLimitGy + 1 && Math.abs(gx) >= 5))) {
          col = '#EDB8A2'; // Soft Warm Peach Notch Edge Shadow
        } else if (gy === hairLimitGy && gx >= -3 && gx <= 2) {
          col = '#ECB7A1'; // Subtle Center Bang Drop Shadow
        } else if (gy >= 2) {
          col = '#FDEFE6'; // Radiant Lower Face / Jawline Porcelain Skin
        }

        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // 4. PUBLIC SAFETY ATTIRE (ry >= r * 0.24)
      // ──────────────────────────────────────────
      else {
        // A. Exposed Throat Skin & V-Cut
        const isThroat = (ry <= r * 0.32 && Math.abs(rx) <= (1 - (ry - r * 0.24) / (r * 0.08)) * (r * 0.14));

        // B. Shirt Pointed Collar Wings
        const isCollarLeft = (rx >= -r * 0.32 && rx <= -r * 0.06 && ry >= r * 0.24 && ry <= r * 0.38 && (rx - (-r * 0.32)) * 0.85 > (ry - r * 0.24));
        const isCollarRight = (rx >= r * 0.06 && rx <= r * 0.32 && ry >= r * 0.24 && ry <= r * 0.38 && (r * 0.32 - rx) * 0.85 > (ry - r * 0.24));

        // C. Slim Solid Matte Black Necktie (NO Gold Clip)
        const isTieKnot = (ry >= r * 0.28 && ry <= r * 0.36 && Math.abs(rx) <= r * 0.09);
        const tieBladeHalfW = (r * 0.07 + (ry - r * 0.36) * 0.04);
        const isTieBlade = (ry >= r * 0.36 && ry <= r * 0.74 && Math.abs(rx) <= tieBladeHalfW);

        // D. High-Waisted Dark Charcoal Trousers
        const isTrousers = (ry >= r * 0.70);

        if (isTieKnot || isTieBlade) {
          // Matte Black Necktie Pixels
          if (rx < -tieBladeHalfW * 0.4 && ry > r * 0.36) {
            ctx.fillStyle = '#2C303E'; // Left-edge silk gleam
          } else if (Math.abs(rx) >= tieBladeHalfW - P * 0.8 || ry >= r * 0.72) {
            ctx.fillStyle = '#0E0F14'; // Dark edge outline
          } else {
            ctx.fillStyle = '#181A22'; // Solid matte black body
          }
          ctx.fillRect(px, py, P, P);
        } else if (isCollarLeft || isCollarRight) {
          // Crisp White Pointed Collar
          if (ry < r * 0.28) {
            ctx.fillStyle = '#FFFFFF';
          } else if (ry > r * 0.34 || Math.abs(rx) > r * 0.26) {
            ctx.fillStyle = '#D4D8CB'; // Collar edge shadow
          } else {
            ctx.fillStyle = '#FAFBF6';
          }
          ctx.fillRect(px, py, P, P);
        } else if (isThroat) {
          // Throat Skin
          ctx.fillStyle = (ry > r * 0.28) ? '#ECB7A1' : '#FEE5D6';
          ctx.fillRect(px, py, P, P);
        } else if (isTrousers) {
          // High-Waisted Dark Trousers Pixels
          if (ry <= r * 0.73) {
            ctx.fillStyle = '#2E3642'; // Waistband top highlight
          } else if (Math.abs(rx) <= P * 0.7 && ry >= r * 0.74) {
            ctx.fillStyle = '#0D0F13'; // Center fly seam
          } else if (Math.abs(Math.abs(rx) - r * 0.45) <= P * 0.7 && ry >= r * 0.76) {
            ctx.fillStyle = '#101317'; // Side pleats
          } else {
            ctx.fillStyle = '#1B2026'; // Charcoal trousers base
          }
          ctx.fillRect(px, py, P, P);
        } else {
          // White Button-Up Dress Shirt (ry = r * 0.24 to r * 0.70)
          // Center Button Placket
          const isPlacket = (Math.abs(rx) <= r * 0.08);
          // Pearl Button Pixels
          const isButton = (isPlacket && (Math.abs(ry - r * 0.42) < P || Math.abs(ry - r * 0.54) < P || Math.abs(ry - r * 0.66) < P));

          if (isButton) {
            ctx.fillStyle = '#E8ECE0';
          } else if (isPlacket) {
            ctx.fillStyle = '#FAFBF6';
          } else if (Math.abs(rx) > r * 0.52 || (ry > r * 0.64 && Math.abs(rx) > r * 0.30)) {
            ctx.fillStyle = '#D4D8CB'; // Sleeve & ribcage cloth shading
          } else if (Math.abs(rx) > r * 0.70) {
            ctx.fillStyle = '#B9BEAE'; // Outer sleeve deep crease
          } else {
            ctx.fillStyle = '#F3F4ED'; // Ivory white shirt core
          }
          ctx.fillRect(px, py, P, P);
        }
      }
    }
  }

  ctx.restore();
}

/**
 * Renders Makima's long side braid trailing over her left flank (-X side) in Stepped Pixel Art Style.
 */
function _drawMakimaPixelBraid(ctx, r) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const braidStartX = -r * 0.82;
  const braidStartY = 0;

  const segments = [
    { x: braidStartX,        y: braidStartY + r * 0.10, rx: 5.5, ry: 4.8 },
    { x: braidStartX - 2.5,  y: braidStartY + r * 0.32, rx: 5.0, ry: 4.5 },
    { x: braidStartX - 1.5,  y: braidStartY + r * 0.54, rx: 4.5, ry: 4.2 },
    { x: braidStartX - 0.5,  y: braidStartY + r * 0.74, rx: 3.8, ry: 3.8 }
  ];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const stepsX = Math.ceil((seg.rx + P) / P);
    const stepsY = Math.ceil((seg.ry + P) / P);

    for (let gy = -stepsY; gy <= stepsY; gy++) {
      for (let gx = -stepsX; gx <= stepsX; gx++) {
        const dx = (gx * P) / seg.rx;
        const dy = (gy * P) / seg.ry;
        const dist = Math.hypot(dx, dy);
        if (dist > 1.0) continue;

        const px = snap(seg.x + gx * P);
        const py = snap(seg.y + gy * P);

        // Pixel Outline
        if (dist > 0.82) {
          ctx.fillStyle = '#0E0F14';
        } else if (dy < -0.3) {
          ctx.fillStyle = '#F8928A'; // Braid highlight
        } else if (Math.abs(dx) < 0.2) {
          ctx.fillStyle = '#7A1C18'; // Weave crease
        } else {
          ctx.fillStyle = '#D84F48'; // Salmon base
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  // Black Hairband / Tie Pixels at braid tip
  const tipX = braidStartX - 0.5;
  const tipY = braidStartY + r * 0.88;
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(tipX - 2.5), snap(tipY - 1.5), 5.0, 3.0);

  // Loose Tuft Hair Pixels
  ctx.fillStyle = '#D84F48';
  ctx.fillRect(snap(tipX - 1.5), snap(tipY + 1.5), 3.0, 2.0);
  ctx.fillRect(snap(tipX - 0.5), snap(tipY + 3.5), P, P);

  ctx.restore();
}

/**
 * Renders Makima's signature Finger-Gun ("Bang!") Hand Stance in Enhanced Stepped Pixel Art Style.
 * Pointing index finger along +X (gun barrel) with cocked thumb (hammer), curled fingers, and suit shirt cuff.
 */
export function drawMakimaPixelFingerGun(ctx, x, y, progress, r, isShooting) {
  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const skinBase = '#FEE5D6';
  const skinShadow = '#EDB8A2';
  const skinDeepShadow = '#D49B85';
  const skinOutline = '#0E0F14';
  const skinHighlight = '#FFFFFF';

  // Recoil upward pitch angle during shot
  const recoilPitch = isShooting ? -Math.sin(progress * Math.PI) * 0.40 : 0;
  ctx.rotate(recoilPitch);

  // 1. Kinetic Muzzle Shockwave Pixels on Firing (Rule 11 Zero shadowBlur)
  if (isShooting && progress < 0.65) {
    const shockAlpha = (1.0 - (progress / 0.65));
    const muzzleTipX = 24.0;
    const shockDist = muzzleTipX + progress * 26;

    ctx.fillStyle = `rgba(245, 158, 11, ${(shockAlpha * 0.90).toFixed(3)})`;
    ctx.fillRect(snap(shockDist), snap(-5), P, 10);
    ctx.fillRect(snap(shockDist + 2), snap(-3), P, 6);
    ctx.fillRect(snap(shockDist + 4), snap(-1), P, 2);

    ctx.fillStyle = `rgba(255, 255, 255, ${(shockAlpha * 0.95).toFixed(3)})`;
    ctx.fillRect(snap(shockDist + 2), snap(-1.5), P, 3);
  }

  // 2. Public Safety Crisp White Shirt Sleeve & Cuff (Wrist Base at -X)
  const cuffW = 6.0;
  const cuffH = 12.0;
  const cuffStartX = -12.0;
  const cuffStartY = -cuffH * 0.5 + 1.0;

  // Cuff Outline
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(cuffStartX - 1.0), snap(cuffStartY - 1.0), cuffW + 2.0, cuffH + 2.0);

  // Cuff Body (Crisp Public Safety Shirt White)
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(cuffStartX), snap(cuffStartY), cuffW, cuffH);

  // Cuff Crease & Shadow
  ctx.fillStyle = '#D4D8CB';
  ctx.fillRect(snap(cuffStartX), snap(cuffStartY + cuffH - 3.0), cuffW, 3.0);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(cuffStartX), snap(cuffStartY), cuffW, 2.0);

  // 3. Fist Base & Palm (Curled Middle, Ring, Pinky Fingers)
  const baseR = 7.8;
  const steps = Math.ceil((baseR + P) / P);

  // Base Fist Outline Shell
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist > baseR + P * 0.75) continue;

      const px = snap(gx * P);
      const py = snap(gy * P);

      if (dist > baseR - P * 0.8) {
        ctx.fillStyle = skinOutline;
      } else if (dist > baseR - P * 1.6 && (gy * P > baseR * 0.1 || gx * P < -baseR * 0.3)) {
        ctx.fillStyle = skinShadow;
      } else {
        ctx.fillStyle = skinBase;
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // Curled Knuckle Grooves on the Front Face of the Fist (Middle, Ring, Pinky)
  ctx.fillStyle = skinDeepShadow;
  ctx.fillRect(snap(baseR * 0.4), snap(0.5), P, P);
  ctx.fillRect(snap(baseR * 0.4), snap(3.5), P, P);
  ctx.fillRect(snap(baseR * 0.4), snap(6.5), P, P);

  // Knuckle Highlights
  ctx.fillStyle = skinHighlight;
  ctx.fillRect(snap(baseR * 0.4), snap(-1.5), P, P);
  ctx.fillRect(snap(baseR * 0.4), snap(1.5), P, P);
  ctx.fillRect(snap(baseR * 0.4), snap(4.5), P, P);

  // 4. Extended Index Finger (Pointing Gun Barrel along +X)
  const fingerLen = 16.0;
  const fingerW = 4.8;
  const halfW = fingerW * 0.5;

  // Finger Outline Shell
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(baseR - 1.0), snap(-halfW - 1.0), fingerLen + 2.0, fingerW + 2.0);

  // Finger Core Base
  ctx.fillStyle = skinBase;
  ctx.fillRect(snap(baseR), snap(-halfW), fingerLen, fingerW);

  // Top Edge Specular Gleam
  ctx.fillStyle = skinHighlight;
  ctx.fillRect(snap(baseR + 1.0), snap(-halfW), fingerLen - 2.0, P);

  // Lower Finger Depth Shadow
  ctx.fillStyle = skinShadow;
  ctx.fillRect(snap(baseR), snap(halfW - P), fingerLen, P);

  // First Knuckle Joint Crease (Proximal)
  ctx.fillStyle = skinDeepShadow;
  ctx.fillRect(snap(baseR + fingerLen * 0.42), snap(-halfW), P, fingerW);

  // Second Knuckle Joint Crease (Distal)
  ctx.fillStyle = skinDeepShadow;
  ctx.fillRect(snap(baseR + fingerLen * 0.74), snap(-halfW), P, fingerW);

  // Fingertip Rounded Nail Gleam
  ctx.fillStyle = skinHighlight;
  ctx.fillRect(snap(baseR + fingerLen - P), snap(-halfW), P, P);

  // 5. Cocked Thumb Hammer (Pointing upright -Y)
  const thumbH = 9.0;
  const thumbW = 4.2;

  // Thumb Outline Shell
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(-thumbW * 0.5 - 1.0), snap(-baseR - thumbH - 1.0), thumbW + 2.0, thumbH + 2.0);

  // Thumb Core Base
  ctx.fillStyle = skinBase;
  ctx.fillRect(snap(-thumbW * 0.5), snap(-baseR - thumbH), thumbW, thumbH);

  // Thumb Back Edge Highlight (Left strip)
  ctx.fillStyle = skinHighlight;
  ctx.fillRect(snap(-thumbW * 0.5), snap(-baseR - thumbH + 1.0), P, thumbH - 2.0);

  // Thumb Inner Depth Shadow (Right strip)
  ctx.fillStyle = skinShadow;
  ctx.fillRect(snap(thumbW * 0.5 - P), snap(-baseR - thumbH + 2.0), P, thumbH - 2.0);

  // Thumb Base Joint Notch Crease
  ctx.fillStyle = skinDeepShadow;
  ctx.fillRect(snap(-thumbW * 0.5), snap(-baseR - thumbH * 0.45), thumbW, P);

  // Cocked Thumb Tip Nail Highlight
  ctx.fillStyle = skinHighlight;
  ctx.fillRect(snap(-thumbW * 0.5 + 0.5), snap(-baseR - thumbH), thumbW - 1.0, P);

  ctx.restore();
}

/**
 * Draws a clean fighter fist in stepped pixel-art style for back hand with sleeve cuff.
 */
function _drawFist(ctx, x, y, radius, skinColor, shadowColor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const gridR = Math.max(P * 2, radius);
  const steps = Math.ceil((gridR + P) / P);

  // 1. Shirt Cuff at Wrist Base (-X side)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(Math.round((-gridR - 4) / P) * P, Math.round((-gridR * 0.6) / P) * P, 5, Math.round((gridR * 1.2) / P) * P);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(Math.round((-gridR - 3) / P) * P, Math.round((-gridR * 0.5) / P) * P, 3, Math.round((gridR * 1.0) / P) * P);

  // 2. Dark Outline Shell
  ctx.fillStyle = '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= gridR + P * 0.75) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 3. Base Skin Core
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

  // 4. Knuckle Depth Shading
  ctx.fillStyle = shadowColor || '#EDB8A2';
  for (let gy = 0; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR && (gy * P > innerR * 0.30 || gx * P < -innerR * 0.40)) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 5. Specular Knuckle Highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(P * 0.5, -innerR * 0.45, P, P);
  ctx.fillRect(P * 1.5, -innerR * 0.20, P, P);

  ctx.restore();
}
