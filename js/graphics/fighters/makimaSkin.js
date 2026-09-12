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

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

let _makimaSkinImage = null;
let _makimaSkinImageLoading = false;

export function _getMakimaSkinImage() {
  if (_makimaSkinImage && _makimaSkinImage.complete && _makimaSkinImage.naturalWidth > 0) {
    return _makimaSkinImage;
  }
  if (!_makimaSkinImageLoading && typeof Image !== 'undefined') {
    _makimaSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _makimaSkinImage = img;
      _makimaSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Makima pixel skin image at Assets/model/Makima-model-skin.png', e);
      _makimaSkinImageLoading = false;
    };
    img.src = 'Assets/model/Makima-model-skin.png?v=1';
    _makimaSkinImage = img;
  }
  return _makimaSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getMakimaSkinImage();
}

/**
 * Main Skin Renderer for Makima (The Control Devil)
 * Prioritizes the authentic pixel art model from Assets/model/Makima-model-skin.png,
 * with procedural canvas fallback.
 * Adheres strictly to Rule 19, 20, 11 (Authentic Pixel Art Style)
 */
export function drawMakimaSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = Date.now();

  // If Makima is currently shattered / reassembling from Citizen Contract
  if (fighter.shatteredPieces && fighter.shatteredPieces.length > 0) {
    _drawShatteredMakimaSkin(ctx, fighter, r, now);
    return;
  }

  const isSuppressed = !isPodiumPreview && Boolean(
    fighter.isTargetOfAmbush || 
    (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())
  );

  // 0. Channeling State for Skill 2 (1000-Year Life-Span Spear)
  const isSummoning = !isPodiumPreview && !isSuppressed && Boolean(fighter.isSummoningSpear);
  let chargePct = 0;
  let floatBob = 0;

  if (isSummoning) {
    const maxT = fighter.spearMaxTimer || 50;
    const curT = fighter.spearTimer !== undefined ? fighter.spearTimer : 0;
    chargePct = Math.max(0, Math.min(1.0, 1.0 - (curT / maxT)));
    // Authoritative celestial levitation breathing bob
    floatBob = Math.sin(now * 0.008) * 3.5 * chargePct;
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // ── LAYER 0: GROUND SUMMONING SEAL (Floor POV Under Makima) ──
  if (isSummoning) {
    _drawMakimaSummoningGroundSeal(ctx, r, chargePct, now);
  }

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Apply vertical levitation float during Skill 2 channel
  if (isSummoning) {
    ctx.translate(0, -floatBob);
    _drawMakimaSummoningAura(ctx, r, chargePct, now);
  }

  // 3. Animation States & Handgun Recoil / Chain Throw Engine
  const hasMissedChains = Boolean(!isSuppressed && fighter.activeMissedChains && fighter.activeMissedChains.length > 0);
  const isPreparingChain = !isPodiumPreview && !isSummoning && !isSuppressed && Boolean(fighter.isPreparingChain || (fighter.chainWindupTimer && fighter.chainWindupTimer > 0));
  const isThrowingChain = !isPodiumPreview && !isSummoning && !isSuppressed && Boolean(fighter.isThrowingChain || (fighter.chainThrowAnimTimer && fighter.chainThrowAnimTimer > 0) || hasMissedChains);
  const isTetheringChain = !isPodiumPreview && !isSummoning && !isPreparingChain && !isThrowingChain && !isSuppressed && Boolean(fighter.isChainingActive);
  const isShooting = !isPodiumPreview && !isSummoning && !isPreparingChain && !isThrowingChain && !isTetheringChain && !isSuppressed && ((fighter.slashSwingTimer && fighter.slashSwingTimer > 0) || (fighter.punchAnimTimer && fighter.punchAnimTimer > 0));

  let throwProgress = 0;
  if (isThrowingChain) {
    const maxThrow = fighter.chainThrowAnimMax || 22;
    const curTimer = fighter.chainThrowAnimTimer || 0;
    throwProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxThrow)));

    // Dynamic forward body lean during initial chain throw thrust
    if (throwProgress < 0.45) {
      const leanT = Math.sin((throwProgress / 0.45) * Math.PI);
      ctx.translate(leanT * 3.5, 0);
    }
  }

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
  // ── LAYER 1 & 2: MAIN BODY (Makima-model-skin.png or procedural fallback) ──
  const makimaImg = _getMakimaSkinImage();
  if (makimaImg && makimaImg.complete && makimaImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Scale factor to map 500x500 sprite content (328px diameter core body) flush with fighter radius r
    const drawW = r * (1000 / 328);
    const drawH = drawW;
    const shiftX = r * (503 / 328);
    const shiftY = r * (465 / 328);
    ctx.drawImage(makimaImg, -shiftX, -shiftY, drawW, drawH);
    ctx.restore();
  } else {
    // LAYER 1: PIXEL SIDE BRAID (Behind Body Circle)
    _drawMakimaPixelBraid(ctx, r);

    // LAYER 2: PROCEDURAL PIXEL ART BODY CIRCLE
    drawMakimaPixelBody(ctx, r);
  }

  // Status Overlays (freeze, stun, time-stop)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  // ── LAYER 3: HANDS IN FRONT (On Top of Body) ──
  // A. Left Hand (Chain Cast / Grip Hand on the Left Side in Front)
  // Hidden by default; displayed only when she prepares/throws/tethers chains on an enemy (or summons)
  if (!hideBackHand) {
    if (isSummoning) {
      _drawMakimaChannelingBackHand(ctx, r, chargePct, now, skinBase, skinShadow);
    } else if (isPreparingChain || isThrowingChain || isTetheringChain) {
      _drawMakimaLeftHand(ctx, r, throwProgress, isTetheringChain, isPreparingChain, isThrowingChain, now, skinBase, skinShadow, fighter);
    }
  }

  // B. Right Hand (Gunhand on the Right Side in Front)
  if (!hideFrontHand) {
    if (isSummoning) {
      _drawMakimaRaisedCommandHand(ctx, r, chargePct, now, skinBase, skinShadow);
    } else {
      // Front hand always maintains her iconic finger-gun sign ("Bang!")
      drawMakimaPixelFingerGun(ctx, frontX, frontY, rawProgress, r, isShooting);
    }
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

/**
 * Draws Makima's Ground Summoning Seal / Rune Circle underneath her feet during Skill 2 Channel.
 * Stepped Pixel Art Style:
 * 1. Outer Stepped Pixel Seal Ring (r: ~44px) with 8 cardinal/diagonal Stepped Diamonds
 * 2. Counter-rotating inner rune circle with 12 stepped tick glyphs
 * 3. Inner Solar Gold & Velvet Crimson floor disc
 * 4. Ascending Stepped Pixel Light Motes streaming upward past her body
 */
function _drawMakimaSummoningGroundSeal(ctx, r, chargePct, now) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const sealR = snap(r * 1.75);
  const pulse = Math.sin(now * 0.009) * 0.15 + 0.85;

  // 1. Inner Ground Core Glow Disc
  const coreR = snap(sealR * 0.45);
  ctx.fillStyle = `rgba(163, 29, 36, ${(chargePct * 0.22 * pulse).toFixed(3)})`;
  ctx.fillRect(-coreR, -snap(coreR * 0.5), coreR * 2, snap(coreR));
  ctx.fillStyle = `rgba(245, 158, 11, ${(chargePct * 0.25 * pulse).toFixed(3)})`;
  ctx.fillRect(-snap(coreR * 0.6), -snap(coreR * 0.3), snap(coreR * 1.2), snap(coreR * 0.6));

  // 2. Outer Stepped Pixel Seal Ring
  ctx.save();
  ctx.rotate(now * 0.0015);

  // Stepped Octagon / Ring
  const ringSteps = 16;
  for (let i = 0; i < ringSteps; i++) {
    const a1 = (i * Math.PI * 2) / ringSteps;
    const a2 = ((i + 1) * Math.PI * 2) / ringSteps;
    const x1 = snap(Math.cos(a1) * sealR);
    const y1 = snap(Math.sin(a1) * sealR * 0.55); // Perspective compression for floor seal
    const x2 = snap(Math.cos(a2) * sealR);
    const y2 = snap(Math.sin(a2) * sealR * 0.55);

    // Stepped line segments
    const segSteps = 4;
    for (let s = 0; s < segSteps; s++) {
      const u = s / segSteps;
      const px = snap(x1 + (x2 - x1) * u);
      const py = snap(y1 + (y2 - y1) * u);
      ctx.fillStyle = `rgba(245, 158, 11, ${(chargePct * 0.80 * pulse).toFixed(3)})`;
      ctx.fillRect(px, py, P, P);
    }
  }

  // 8 Cardinal & Diagonal Stepped Pixel Diamonds along seal
  for (let d = 0; d < 8; d++) {
    const dAngle = (d * Math.PI) / 4;
    const dx = snap(Math.cos(dAngle) * sealR);
    const dy = snap(Math.sin(dAngle) * sealR * 0.55);

    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(dx - P * 1.5, dy - P * 1.5, P * 3, P * 3);
    ctx.fillStyle = (d % 2 === 0) ? '#FFFFFF' : '#FEF08A';
    ctx.fillRect(dx - P, dy - P, P * 2, P * 2);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(dx, dy, P, P);
  }
  ctx.restore();

  // 3. Middle Counter-Rotating Rune Ring
  const midR = snap(sealR * 0.72);
  ctx.save();
  ctx.rotate(-now * 0.0025);

  for (let t = 0; t < 12; t++) {
    const tAngle = (t * Math.PI * 2) / 12;
    const tx = snap(Math.cos(tAngle) * midR);
    const ty = snap(Math.sin(tAngle) * midR * 0.55);

    ctx.fillStyle = `rgba(254, 240, 138, ${(chargePct * 0.85 * pulse).toFixed(3)})`;
    ctx.fillRect(tx, ty, P, P);
    if (t % 3 === 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(chargePct * 0.95).toFixed(3)})`;
      ctx.fillRect(tx - P * 0.5, ty - P * 0.5, P * 2, P * 2);
    }
  }
  ctx.restore();

  // 4. Ascending Stepped Pixel Light Motes streaming upward past her body
  const moteCount = 8;
  for (let m = 0; m < moteCount; m++) {
    const mPhase = ((now * 0.003 + m * 0.125) % 1.0);
    const mAngle = (m * Math.PI * 2) / moteCount + (m * 0.4);
    const mDist = snap((r * 0.5) + ((m * 19) % 35) * 0.01 * (r * 0.8));
    const mx = snap(Math.cos(mAngle) * mDist);
    const my = snap(Math.sin(mAngle) * (mDist * 0.55) - mPhase * (r * 2.4));
    const mAlpha = Math.sin(mPhase * Math.PI) * chargePct * 0.90;

    const col = (m % 2 === 0) ? `rgba(254, 240, 138, ${mAlpha.toFixed(3)})` : `rgba(255, 255, 255, ${mAlpha.toFixed(3)})`;
    ctx.fillStyle = col;
    ctx.fillRect(mx, my, P, P);
    if (m % 3 === 0) {
      ctx.fillStyle = `rgba(245, 158, 11, ${(mAlpha * 0.6).toFixed(3)})`;
      ctx.fillRect(mx - P, my, P, P);
      ctx.fillRect(mx + P, my, P, P);
    }
  }

  ctx.restore();
}

/**
 * Draws the subtle Stepped Pixel Divine Radiance Aura around Makima's body during Skill 2 channel.
 */
function _drawMakimaSummoningAura(ctx, r, chargePct, now) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const pulse = Math.sin(now * 0.01) * 0.2 + 0.8;
  const auraR = snap(r + P * 2);

  // Stepped Pixel Cardinal & Intercardinal Aura Blocks
  const auraPoints = 16;
  for (let i = 0; i < auraPoints; i++) {
    const aAngle = (i * Math.PI * 2) / auraPoints + (now * 0.002);
    const ax = snap(Math.cos(aAngle) * (auraR + Math.sin(now * 0.012 + i) * 3));
    const ay = snap(Math.sin(aAngle) * (auraR + Math.sin(now * 0.012 + i) * 3));
    const aAlpha = (0.35 + Math.sin(now * 0.015 + i * 0.8) * 0.25) * chargePct * pulse;

    ctx.fillStyle = (i % 2 === 0)
      ? `rgba(245, 158, 11, ${aAlpha.toFixed(3)})`
      : `rgba(163, 29, 36, ${(aAlpha * 0.8).toFixed(3)})`;
    ctx.fillRect(ax, ay, P * 1.5, P * 1.5);
  }

  ctx.restore();
}

/**
 * Draws Makima's Back Hand resting calmly on her waist / hip in commanding authority.
 */
function _drawMakimaChannelingBackHand(ctx, r, chargePct, now, skinBase, skinShadow) {
  ctx.save();
  ctx.translate(snap(-r * 0.36), snap(r * 0.38));
  ctx.imageSmoothingEnabled = false;

  // 1. Crisp White Shirt Sleeve Cuff at -X side
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(-8), snap(-4), 5, 8);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(-7), snap(-3), 3, 6);
  ctx.fillStyle = '#D4D8CB';
  ctx.fillRect(snap(-7), snap(1), 3, 2);

  // 2. Hand Resting on Hip (Curled fingers against waistband)
  const handW = 7.0;
  const handH = 6.5;

  // Dark Outline
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(-3), snap(-3.5), handW + 2, handH + 2);

  // Base Skin
  ctx.fillStyle = skinBase;
  ctx.fillRect(snap(-2), snap(-2.5), handW, handH);

  // Knuckle Depth Shadow
  ctx.fillStyle = skinShadow;
  ctx.fillRect(snap(-2), snap(0.5), handW, 3);

  // Knuckle Highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(-2), snap(-2.5), handW - 2, 2);

  ctx.restore();
}

/**
 * Draws Makima's Raised Front Hand Gesturing Skyward towards the Angel Halo.
 * Features:
 * - Public Safety crisp white sleeve extending from body to wrist
 * - Stepped pixel open palm with 4 extended fingers pointing toward -Y (halo)
 * - Thumb extended outward along +X
 * - Orbiting Stepped Golden Sacred Wrist Rings
 * - Ascending fingertip sparks and light motes
 */
function _drawMakimaRaisedCommandHand(ctx, r, chargePct, now, skinBase, skinShadow) {
  ctx.save();
  // Hand positioned raised towards overhead halo (-Y)
  const handX = snap(r * 0.22);
  const handY = snap(-r * 0.96);
  ctx.translate(handX, handY);
  ctx.imageSmoothingEnabled = false;

  const skinOutline = '#0E0F14';
  const skinHighlight = '#FFFFFF';
  const skinDeepShadow = '#D49B85';

  // ── 1. PUBLIC SAFETY SLEEVE (Extending upward from body circle) ──
  const sleeveStartX = -snap(r * 0.12);
  const sleeveStartY = snap(r * 0.55);
  const sleeveW = 7.0;

  // Sleeve Outline
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(sleeveStartX - 1), 0, sleeveW + 2, snap(sleeveStartY + 1));

  // Sleeve Fabric White
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(sleeveStartX), 0, sleeveW, snap(sleeveStartY));

  // Sleeve Fabric Shading & Crease
  ctx.fillStyle = '#D4D8CB';
  ctx.fillRect(snap(sleeveStartX + sleeveW - 2.5), 0, 2.5, snap(sleeveStartY));
  ctx.fillStyle = '#B9BEAE';
  ctx.fillRect(snap(sleeveStartX + sleeveW - 1), snap(sleeveStartY * 0.4), 1, snap(sleeveStartY * 0.6));

  // Crisp White Shirt Cuff Band at Wrist (Y = 0)
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(sleeveStartX - 1.5), snap(-3.5), sleeveW + 3, 5);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(sleeveStartX - 0.5), snap(-2.5), sleeveW + 1, 3);
  // Pearl Button
  ctx.fillStyle = '#E8ECE0';
  ctx.fillRect(snap(sleeveStartX + 1.5), snap(-1.5), P, P);

  // ── 2. ORBITING STEPPED GOLDEN SACRED WRIST RINGS ──
  const rotRing = now * 0.012;
  ctx.save();
  ctx.translate(snap(sleeveStartX + sleeveW * 0.5), snap(-2));
  ctx.rotate(rotRing);

  // Inner Ring (r: 9px)
  _pxRingLocal(ctx, 0, 0, 9, 2, `rgba(254, 240, 138, ${(chargePct * 0.95).toFixed(3)})`);
  // Outer Ring (r: 14px)
  _pxRingLocal(ctx, 0, 0, 14, 2, `rgba(245, 158, 11, ${(chargePct * 0.85).toFixed(3)})`);

  // 4 Cardinal Pixel Diamonds on Orbiting Wrist Ring
  for (let d = 0; d < 4; d++) {
    const da = (d * Math.PI) / 2;
    const dx = snap(Math.cos(da) * 14);
    const dy = snap(Math.sin(da) * 14);
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(dx - P, dy - P, P * 2, P * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(dx - P * 0.5, dy - P * 0.5, P, P);
  }
  ctx.restore();

  // ── 3. PALM BASE & EXTENDED SKYWARD FINGERS (-Y) ──
  ctx.save();
  ctx.translate(snap(sleeveStartX + sleeveW * 0.5), snap(-4));

  // Palm Base Block (Width 9px, Height 6px)
  const palmW = 9.0;
  const palmH = 6.0;
  const palmHalfW = palmW * 0.5;

  // Palm Outline
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(-palmHalfW - 1), snap(-palmH - 1), palmW + 2, palmH + 2);

  // Palm Core
  ctx.fillStyle = skinBase;
  ctx.fillRect(snap(-palmHalfW), snap(-palmH), palmW, palmH);

  // Palm Shading & Creases
  ctx.fillStyle = skinShadow;
  ctx.fillRect(snap(-palmHalfW), snap(-2), palmW, 2);
  ctx.fillStyle = skinDeepShadow;
  ctx.fillRect(snap(-1), snap(-palmH + 2), 2, 2);

  // ── 4 Extended Skyward Fingers (-Y) ──
  // Fingers: Pinky, Ring, Middle, Index (Left to Right along X)
  const fingers = [
    { x: snap(-palmHalfW + 0.5), len: 8.5, w: 2.0 },  // Pinky
    { x: snap(-palmHalfW + 2.8), len: 11.0, w: 2.2 }, // Ring
    { x: snap(-palmHalfW + 5.2), len: 13.0, w: 2.4 }, // Middle (Apex)
    { x: snap(-palmHalfW + 7.6), len: 10.5, w: 2.2 }  // Index
  ];

  for (let f = 0; f < fingers.length; f++) {
    const fg = fingers[f];
    const tipY = snap(-palmH - fg.len);

    // Finger Outline
    ctx.fillStyle = skinOutline;
    ctx.fillRect(snap(fg.x - 0.5), snap(tipY - 1), fg.w + 1, fg.len + 2);

    // Finger Skin
    ctx.fillStyle = skinBase;
    ctx.fillRect(snap(fg.x), snap(tipY), fg.w, fg.len);

    // Fingertip Highlight
    ctx.fillStyle = skinHighlight;
    ctx.fillRect(snap(fg.x), snap(tipY), fg.w, P);

    // Knuckle Crease
    ctx.fillStyle = skinDeepShadow;
    ctx.fillRect(snap(fg.x), snap(tipY + fg.len * 0.45), fg.w, 1.0);
  }

  // ── Extended Thumb along +X ──
  const thumbLen = 7.0;
  const thumbW = 2.4;
  const thumbX = snap(palmHalfW);
  const thumbY = snap(-palmH + 1.5);

  // Thumb Outline
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(thumbX), snap(thumbY - 1), thumbLen + 1, thumbW + 2);
  // Thumb Skin
  ctx.fillStyle = skinBase;
  ctx.fillRect(snap(thumbX + 0.5), snap(thumbY), thumbLen, thumbW);
  // Thumb Highlight & Nail
  ctx.fillStyle = skinHighlight;
  ctx.fillRect(snap(thumbX + thumbLen - P), snap(thumbY), P, thumbW);

  // ── 4. FINGERTIP LIGHT MOTES & SPARK CONVERGENCE ──
  const sparkCount = 4;
  for (let s = 0; s < sparkCount; s++) {
    const sPhase = ((now * 0.005 + s * 0.25) % 1.0);
    const sY = snap(-palmH - 14 - sPhase * 18);
    const sX = snap((s - 1.5) * 4.5 + Math.sin(now * 0.01 + s) * 2.5);
    const sAlpha = Math.sin(sPhase * Math.PI) * chargePct * 0.95;

    ctx.fillStyle = (s % 2 === 0)
      ? `rgba(255, 255, 255, ${sAlpha.toFixed(3)})`
      : `rgba(254, 240, 138, ${sAlpha.toFixed(3)})`;
    ctx.fillRect(sX, sY, P, P);

    if (sPhase < 0.5) {
      ctx.fillStyle = `rgba(245, 158, 11, ${(sAlpha * 0.7).toFixed(3)})`;
      ctx.fillRect(sX - 1, sY - 1, P * 1.5, P * 1.5);
    }
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Local Stepped Pixel Ring Helper.
 */
function _pxRingLocal(ctx, x, y, radius, thickness = 2, color = '#FFFFFF', isDotted = false) {
  const steps = Math.max(12, Math.round(radius * 1.8));

  ctx.fillStyle = color;
  for (let i = 0; i < steps; i++) {
    if (isDotted && i % 2 !== 0) continue;
    const a = (i * Math.PI * 2) / steps;
    const pxX = snap(x + Math.cos(a) * radius);
    const pxY = snap(y + Math.sin(a) * radius);
    ctx.fillRect(pxX, pxY, thickness, thickness);
  }
}

/**
 * Draws Makima's Left Hand on the left side of her body in front (Layer 3).
 * Symmetrically positioned at (-r * 0.95, r * 0.04).
 * Holds and casts the Chains of Domination during chain abilities, or rests firmly as a fist.
 */
function _drawMakimaLeftHand(ctx, r, throwProgress, isTethering, isPreparing, isThrowing, now, skinBase, skinShadow, fighter) {
  ctx.save();
  let pullBackX = 0;
  let pullBackY = 0;

  if (isPreparing) {
    const windupMax = fighter?.chainWindupMax || 14;
    const curTimer = fighter?.chainWindupTimer || 0;
    const p = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / windupMax)));
    pullBackX = -3.5 * Math.sin(p * Math.PI * 0.5);
    pullBackY = -1.0 * Math.sin(p * Math.PI * 0.5);
  } else if (isThrowing) {
    if (throwProgress < 0.45) {
      const t = Math.sin((throwProgress / 0.45) * Math.PI);
      pullBackX = 5.0 * t;
      pullBackY = -0.5 * t;
    } else {
      pullBackX = -1.5;
      pullBackY = 0;
    }
  } else if (isTethering) {
    pullBackX = -2.0 + Math.sin(now * 0.015) * 0.5;
    pullBackY = 0;
  }

  const handX = snap(-r * 0.95 + pullBackX);
  const handY = snap(r * 0.04 + pullBackY);
  ctx.translate(handX, handY);
  ctx.imageSmoothingEnabled = false;

  const skinOutline = '#0E0F14';
  const skinHighlight = '#FFFFFF';
  const skinDeepShadow = '#D49B85';

  // 1. Crisp White Shirt Sleeve Cuff at -X side
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(-9), snap(-5), 6, 10);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(-8), snap(-4), 4, 8);
  ctx.fillStyle = '#D4D8CB';
  ctx.fillRect(snap(-8), snap(1), 4, 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(-8), snap(-4), 4, 2);

  // 2. Aperture Ring during Windup
  if (isPreparing) {
    const windupMax = fighter?.chainWindupMax || 14;
    const curTimer = fighter?.chainWindupTimer || 0;
    const prepP = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / windupMax)));
    const ringRot = now * 0.02;
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(ringRot);
    _pxRingLocal(ctx, 0, 0, Math.max(3, 8 * prepP), 1.5, `rgba(245, 158, 11, ${(prepP * 0.85).toFixed(3)})`);
    _pxRingLocal(ctx, 0, 0, Math.max(2, 5 * prepP), 1.0, `rgba(163, 29, 36, ${(prepP * 0.70).toFixed(3)})`);
    ctx.restore();
  }

  // 3. Clenched Fist Base Shell
  const fistR = 7.5;
  const steps = Math.ceil((fistR + P) / P);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist > fistR + P * 0.75) continue;
      const px = snap(gx * P);
      const py = snap(gy * P);

      if (dist > fistR - P * 0.8) {
        ctx.fillStyle = skinOutline;
      } else if (dist > fistR - P * 1.6 && (gy * P > fistR * 0.1 || gx * P < -fistR * 0.3)) {
        ctx.fillStyle = skinShadow;
      } else {
        ctx.fillStyle = skinBase;
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // Knuckle Grooves & Highlights on Fist Face
  ctx.fillStyle = skinDeepShadow;
  ctx.fillRect(snap(fistR * 0.35), snap(-3.5), P, P);
  ctx.fillRect(snap(fistR * 0.35), snap(-0.5), P, P);
  ctx.fillRect(snap(fistR * 0.35), snap(2.5), P, P);

  ctx.fillStyle = skinHighlight;
  ctx.fillRect(snap(fistR * 0.35), snap(-4.5), P, P);
  ctx.fillRect(snap(fistR * 0.35), snap(-1.5), P, P);
  ctx.fillRect(snap(fistR * 0.35), snap(1.5), P, P);

  // Clenched Thumb
  const thumbW = 7.0;
  const thumbH = 4.5;
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(-thumbW * 0.4 - 1), snap(-fistR * 0.85 - 1), thumbW + 2, thumbH + 2);
  ctx.fillStyle = skinBase;
  ctx.fillRect(snap(-thumbW * 0.4), snap(-fistR * 0.85), thumbW, thumbH);
  ctx.fillStyle = skinHighlight;
  ctx.fillRect(snap(-thumbW * 0.4), snap(-fistR * 0.85), thumbW, 1.2);

  // 4. Golden Chain Link Gripped in Fist & Extending along +X
  if (isThrowing || isTethering || isPreparing) {
    // Clutched link collar inside fist
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(snap(-2), snap(-2.5), 8, 5);
    ctx.fillStyle = '#781D16';
    ctx.fillRect(snap(-1), snap(-1.5), 6, 3);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(snap(0), snap(-1.0), 4, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(snap(1), snap(-1.0), 2, 1);

    // Emerging Golden Link protruding forward along +X
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(snap(fistR * 0.7), snap(-2.5), 8, 5);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(snap(fistR * 0.7 + 1), snap(-1.5), 6, 3);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(snap(fistR * 0.7 + 1), snap(-1.5), 6, 1.2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(snap(fistR * 0.7 + 2), snap(-1.5), 3, 0.8);
    ctx.fillStyle = '#180506'; // Hollow eyelet
    ctx.fillRect(snap(fistR * 0.7 + 2), snap(-0.4), 3, 1.0);

    // Crackling Cursed Micro Embers
    for (let e = 0; e < 3; e++) {
      const ePhase = ((now * 0.004 + e * 0.33) % 1.0);
      const ex = snap(fistR * 0.6 + Math.cos(e * 2.1 + now * 0.005) * 6);
      const ey = snap(Math.sin(e * 2.1 + now * 0.005) * 6 - ePhase * 4);
      const eAlpha = (1.0 - ePhase) * 0.90;
      ctx.fillStyle = `rgba(254, 240, 138, ${eAlpha.toFixed(3)})`;
      ctx.fillRect(ex, ey, P, P);
    }
  }

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
        _drawMakimaPixelBraid(bCtx, r);
        drawMakimaPixelBody(bCtx, r);
        _drawMakimaLeftHand(bCtx, r, 0, false, false, false, 0, '#FEE5D6', '#EDB8A2', null);
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
