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

  // If Makima is currently shattered / reassembling from Citizen Contract
  if (fighter.shatteredPieces && fighter.shatteredPieces.length > 0) {
    _drawShatteredMakimaSkin(ctx, fighter, r, Date.now());
    return;
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Animation States & Handgun Recoil Engine
  const isShooting = !isPodiumPreview && ((fighter.slashSwingTimer && fighter.slashSwingTimer > 0) || (fighter.punchAnimTimer && fighter.punchAnimTimer > 0));
  let rawProgress = 0;
  let recoilKickX = 0;
  let recoilRiseY = 0;

  if (isShooting) {
    const maxT = fighter.slashSwingMaxTimer || fighter.punchMaxTime || 16;
    const curTimer = fighter.slashSwingTimer > 0 ? fighter.slashSwingTimer : fighter.punchAnimTimer;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxT)));

    // Smooth continuous recoil curve: rises smoothly in frames 0-4, cushions at apex, returns smoothly in frames 5-16
    let recoilCurve = 0;
    if (rawProgress < 0.25) {
      const t = rawProgress / 0.25;
      recoilCurve = Math.pow(Math.sin(t * Math.PI * 0.5), 1.6);
    } else {
      const t = (rawProgress - 0.25) / 0.75;
      recoilCurve = Math.pow(Math.cos(t * Math.PI * 0.5), 2.0);
    }

    recoilKickX = -7.5 * recoilCurve;
    recoilRiseY = -3.8 * recoilCurve;
  }

  // Hand Coordinates (Rest position at r * 0.95, kicks back sharply on fire)
  const frontX = r * 0.95 + recoilKickX;
  const frontY = r * 0.04 + recoilRiseY;
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

  // Recoil upward pitch angle & hammer dynamic snap during shot (Synchronized Smooth C1 Curve)
  let recoilPitch = 0;
  let hammerSnap = 0;
  if (isShooting) {
    let recoilCurve = 0;
    if (progress < 0.25) {
      const t = progress / 0.25;
      recoilCurve = Math.pow(Math.sin(t * Math.PI * 0.5), 1.6);
      hammerSnap = Math.sin(t * Math.PI) * 0.12;
    } else {
      const t = (progress - 0.25) / 0.75;
      recoilCurve = Math.pow(Math.cos(t * Math.PI * 0.5), 2.0);
      hammerSnap = 0;
    }
    recoilPitch = -0.28 * recoilCurve; // ~16° smooth muzzle climb
  }
  ctx.rotate(recoilPitch);

  // 1. Kinetic Muzzle Flash, Supersonic Shockwave & Gunsmoke (Rule 11 Zero shadowBlur)
  if (isShooting) {
    const muzzleTipX = 24.0;
    // A. High-intensity muzzle flash star (Smooth fade over initial frames)
    if (progress < 0.22) {
      const flashAlpha = Math.pow(1.0 - (progress / 0.22), 1.5);
      // Bright white-hot core
      ctx.fillStyle = `rgba(255, 255, 255, ${(flashAlpha * 0.98).toFixed(3)})`;
      ctx.fillRect(snap(muzzleTipX), snap(-2), P * 2, P * 2);

      // Amber / Orange kinetic cross flash
      ctx.fillStyle = `rgba(245, 158, 11, ${(flashAlpha * 0.92).toFixed(3)})`;
      ctx.fillRect(snap(muzzleTipX - 2), snap(-5), P, 10);
      ctx.fillRect(snap(muzzleTipX + 4), snap(-3), P, 6);
      ctx.fillRect(snap(muzzleTipX + 6), snap(-1), P, 2);
      ctx.fillRect(snap(muzzleTipX + 2), snap(-1), 4, P);

      // Ejecting micro sparks
      ctx.fillStyle = `rgba(251, 191, 36, ${(flashAlpha * 0.95).toFixed(3)})`;
      ctx.fillRect(snap(muzzleTipX + 6), snap(-6), P, P);
      ctx.fillRect(snap(muzzleTipX + 4), snap(4), P, P);
    }

    // B. Supersonic air-compression shockwave ring advancing smoothly ahead
    if (progress >= 0.05 && progress < 0.55) {
      const pShock = (progress - 0.05) / 0.50;
      const shockAlpha = Math.sin(pShock * Math.PI) * 0.80;
      const shockDist = muzzleTipX + pShock * 28.0;

      ctx.fillStyle = `rgba(245, 158, 11, ${(shockAlpha * 0.80).toFixed(3)})`;
      ctx.fillRect(snap(shockDist), snap(-7), P, 14);
      ctx.fillRect(snap(shockDist + 2), snap(-4), P, 8);
      ctx.fillRect(snap(shockDist + 4), snap(-1.5), P, 3);

      ctx.fillStyle = `rgba(255, 255, 255, ${shockAlpha.toFixed(3)})`;
      ctx.fillRect(snap(shockDist), snap(-2), P, 4);
    }

    // C. Subtle Gunsmoke wisps curling upward during recovery
    if (progress >= 0.30 && progress < 0.85) {
      const pSmoke = (progress - 0.30) / 0.55;
      const smokeAlpha = Math.sin(pSmoke * Math.PI) * 0.50;
      const smokeDist = muzzleTipX - pSmoke * 4.0;
      const smokeRise = -pSmoke * 10.0;

      ctx.fillStyle = `rgba(226, 232, 240, ${(smokeAlpha * 0.75).toFixed(3)})`;
      ctx.fillRect(snap(smokeDist), snap(smokeRise - 2), P, P);
      ctx.fillRect(snap(smokeDist + 2), snap(smokeRise - 5), P, P);
    }
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

  // 5. Cocked Thumb Hammer (Shortened proportional ~5.8px height with hammer strike dynamic)
  const thumbH = 5.8;
  const thumbW = 4.0;
  const thumbBaseX = snap(-thumbW * 0.5);
  const thumbBaseY = snap(-baseR);

  ctx.save();
  ctx.translate(thumbBaseX, thumbBaseY);
  if (hammerSnap !== 0) {
    ctx.rotate(hammerSnap);
  }

  // Thumb Outline Shell
  ctx.fillStyle = skinOutline;
  ctx.fillRect(-P, snap(-thumbH) - P, thumbW + P * 2, snap(thumbH) + P);

  // Thumb Core Base
  ctx.fillStyle = skinBase;
  ctx.fillRect(0, snap(-thumbH), thumbW, snap(thumbH));

  // Thumb Back Edge Highlight (Left strip)
  ctx.fillStyle = skinHighlight;
  ctx.fillRect(0, snap(-thumbH) + P, P, snap(thumbH) - P);

  // Thumb Inner Depth Shadow (Right strip)
  ctx.fillStyle = skinShadow;
  ctx.fillRect(thumbW - P, snap(-thumbH) + P, P, snap(thumbH) - P);

  // Thumb Base Joint Notch Crease
  ctx.fillStyle = skinDeepShadow;
  ctx.fillRect(0, snap(-thumbH * 0.45), thumbW, P);

  // Cocked Thumb Tip Nail Highlight
  ctx.fillStyle = skinHighlight;
  ctx.fillRect(0, snap(-thumbH), thumbW, P);

  ctx.restore();

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

// ── High-Performance Cached Off-Screen Body for Particle-Driven Reformation ──
let _cachedBodyCanvas = null;
let _cachedBodyRadius = 0;
let _maskCanvas = null;

function _getOrCreateBodyCanvas(r) {
  const size = Math.ceil(r * 2 + 70);
  if (!_cachedBodyCanvas || _cachedBodyRadius !== r) {
    if (typeof document !== 'undefined' && document.createElement) {
      _cachedBodyCanvas = document.createElement('canvas');
      _cachedBodyCanvas.width = size;
      _cachedBodyCanvas.height = size;
      _cachedBodyRadius = r;
      const bCtx = _cachedBodyCanvas.getContext('2d');
      if (bCtx) {
        bCtx.save();
        bCtx.translate(size * 0.5, size * 0.5);
        const handRadius = getHandSize(8.2);
        _drawFist(bCtx, -r * 0.24, -r * 0.45, handRadius * 0.85, '#FEE5D6', '#EDB8A2');
        _drawMakimaPixelBraid(bCtx, r);
        drawMakimaPixelBody(bCtx, r);
        drawMakimaPixelFingerGun(bCtx, r * 0.95, r * 0.04, 0, r, false);
        bCtx.restore();
      }
    }
  }
  return _cachedBodyCanvas;
}

function _getMaskCanvas(size) {
  if (!_maskCanvas || _maskCanvas.width !== size) {
    if (typeof document !== 'undefined' && document.createElement) {
      _maskCanvas = document.createElement('canvas');
      _maskCanvas.width = size;
      _maskCanvas.height = size;
    }
  }
  return _maskCanvas;
}

/**
 * Renders Makima's Blood Particle Shatter & Time-Reversed Reassembly.
 * When fatally wounded, Makima shatters into 60 visceral blood droplets that explode outward,
 * suspend at apex, and then time-reverse to stream back into her core with liquid trailing ribbons,
 * reforming her full pixel art body inside the converging blood.
 * Adheres strictly to Rule 11 (Zero shadowBlur) and Rule 19 (Upright orientation).
 */
function _drawShatteredMakimaSkin(ctx, fighter, r, now) {
  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Angle and upright front POV orientation (Rule 19)
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Calculate overall revival progress normP (0.0 to 1.0 across 75 frames)
  let normP = 0;
  if (fighter.hp <= 0 && !fighter.isRevivingFromContract && !fighter.isShatterReviving) {
    normP = 0;
  } else if (fighter._isWinnerReveal) {
    normP = 1.0;
  } else if (fighter.reviveStasisTimer !== undefined) {
    const maxT = fighter.reviveStasisMax || 75;
    const elapsed = maxT - Math.max(0, fighter.reviveStasisTimer);
    normP = Math.min(1.0, Math.max(0.0, elapsed / maxT));
  }

  const particles = fighter.bloodParticles || fighter.shatteredPieces || [];

  // ─────────────────────────────────────────────
  // 60 PARTICLES REBUILDING MAKIMA'S BODY PIECE-BY-PIECE
  // ─────────────────────────────────────────────
  let landedCount = 0;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const targetX = p.targetX !== undefined ? p.targetX : 0;
    const targetY = p.targetY !== undefined ? p.targetY : 0;
    const scatterX = p.scatterX !== undefined ? p.scatterX : Math.cos(p.angle || 0) * (p.maxDist || 60);
    const scatterY = p.scatterY !== undefined ? p.scatterY : Math.sin(p.angle || 0) * (p.maxDist || 60);

    let currX = 0;
    let currY = 0;
    let hasLanded = false;

    if (normP < 0.20) {
      // Phase 1: Explosive shatter outward from her body into the arena
      const burstP = normP / 0.20;
      const burstEase = 1.0 - Math.pow(1.0 - burstP, 3.0);
      currX = targetX * (1.0 - burstEase) + scatterX * burstEase;
      currY = targetY * (1.0 - burstEase) + scatterY * burstEase;
      hasLanded = false;
    } else if (normP < 0.28) {
      // Phase 2: Mid-air suspension at peak scatter positions
      const tremble = Math.sin(now * 0.06 + i * 1.4) * 1.5;
      currX = scatterX + Math.cos(i) * tremble;
      currY = scatterY + Math.sin(i) * tremble;
      hasLanded = false;
    } else {
      // Phase 3: Reverse trajectory directly back to target position on her body!
      const pStart = 0.28 + (p.delay || 0);
      const pEnd = 0.74 + (p.delay || 0) * 0.35;
      const rawP = Math.min(1.0, Math.max(0.0, (normP - pStart) / (pEnd - pStart)));
      const pullEase = Math.pow(rawP, 2.3);
      currX = scatterX * (1.0 - pullEase) + targetX * pullEase;
      currY = scatterY * (1.0 - pullEase) + targetY * pullEase;
      hasLanded = (rawP >= 0.96);
    }

    p.currX = currX;
    p.currY = currY;
    p.hasLanded = hasLanded;
    if (hasLanded) landedCount++;
  }

  // ─────────────────────────────────────────────
  // 3. HIGH-PERFORMANCE PARTICLE-DRIVEN REFORMATION (ZERO FPS DROP!)
  // The body is stamped and revealed ONLY where particles have landed!
  // Uses GPU-accelerated destination-in composite masking (Eliminates CPU ctx.clip bottleneck)
  // ─────────────────────────────────────────────
  if (landedCount > 0 && typeof document !== 'undefined') {
    const bodyCanvas = _getOrCreateBodyCanvas(r);
    if (bodyCanvas) {
      const size = bodyCanvas.width || Math.ceil(r * 2 + 70);
      const half = size * 0.5;

      if (landedCount >= particles.length) {
        // 100% of particles have landed! Blit directly (0.01ms)
        ctx.drawImage(bodyCanvas, -half, -half);
      } else {
        // Progressive particle-driven reveal using destination-in
        const maskCanvas = _getMaskCanvas(size);
        if (maskCanvas) {
          const mCtx = maskCanvas.getContext('2d');
          if (mCtx) {
            mCtx.clearRect(0, 0, size, size);

            // 1. Draw static pre-rendered body
            mCtx.drawImage(bodyCanvas, 0, 0);

            // 2. Mask with landed particles using destination-in (GPU-accelerated composite blend)
            mCtx.globalCompositeOperation = 'destination-in';
            mCtx.beginPath();
            const stampR = 9.5;
            for (let i = 0; i < particles.length; i++) {
              const p = particles[i];
              if (p.hasLanded) {
                const tx = (p.targetX !== undefined ? p.targetX : 0) + half;
                const ty = (p.targetY !== undefined ? p.targetY : 0) + half;
                mCtx.moveTo(tx + stampR, ty);
                mCtx.arc(tx, ty, stampR, 0, Math.PI * 2);
              }
            }
            mCtx.fill();
            mCtx.globalCompositeOperation = 'source-over';

            // 3. Blit to main canvas in one single drawImage call
            ctx.drawImage(maskCanvas, -half, -half);
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // 4. DRAW IN-FLIGHT PARTICLES (Disappear as they land on her body)
  // ─────────────────────────────────────────────
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.hasLanded) {
      // Clean droplet flying in air
      ctx.beginPath();
      ctx.arc(p.currX, p.currY, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // Specular glint highlight
      ctx.beginPath();
      ctx.arc(p.currX - p.size * 0.3, p.currY - p.size * 0.3, p.size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();
    } else if (normP < 0.78) {
      // Landing glint spark on newly assembled piece
      if (Math.random() < 0.18) {
        ctx.fillStyle = '#F59E0B';
        const tx = p.targetX !== undefined ? p.targetX : 0;
        const ty = p.targetY !== undefined ? p.targetY : 0;
        ctx.fillRect(tx + (Math.random() - 0.5) * 3, ty + (Math.random() - 0.5) * 3, 2, 2);
      }
    }
  }

  // ─────────────────────────────────────────────
  // 4. DIVINE HALO SHOCKWAVE ON FULL RESTORATION (normP >= 0.80)
  // ─────────────────────────────────────────────
  if (normP >= 0.80) {
    const flashPct = (normP - 0.80) / 0.20;
    const haloR = r * (0.85 + flashPct * 0.55);

    ctx.save();
    // Outer Solar Gold Halo
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245, 158, 11, ${(1.0 - flashPct * 0.4).toFixed(3)})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Inner Amber Halo
    ctx.beginPath();
    ctx.arc(0, 0, haloR * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(251, 191, 36, ${(1.0 - flashPct * 0.6).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 8 Radiant Crown Rays
    const rayCount = 8;
    for (let k = 0; k < rayCount; k++) {
      const rayAngle = (k / rayCount) * Math.PI * 2 + (now * 0.0025);
      const inX = Math.cos(rayAngle) * haloR;
      const inY = Math.sin(rayAngle) * haloR;
      const outX = Math.cos(rayAngle) * (haloR + 9.0 * flashPct);
      const outY = Math.sin(rayAngle) * (haloR + 9.0 * flashPct);
      ctx.beginPath();
      ctx.moveTo(inX, inY);
      ctx.lineTo(outX, outY);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1.0 - flashPct * 0.5).toFixed(3)})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // Converging white/gold immaculate flash wash
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.0 + (1.0 - flashPct) * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${(flashPct * 0.55).toFixed(3)})`;
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}
