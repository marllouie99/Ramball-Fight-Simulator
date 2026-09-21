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
import { drawPixelHand } from '../renderers/fighterRenderer.js';

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

let _makimaHairImage = null;
let _makimaHairImageLoading = false;

export function _getMakimaHairImage() {
  if (_makimaHairImage && _makimaHairImage.complete && _makimaHairImage.naturalWidth > 0) {
    return _makimaHairImage;
  }
  if (!_makimaHairImageLoading && typeof Image !== 'undefined') {
    _makimaHairImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _makimaHairImage = img;
      _makimaHairImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Makima hair image at Assets/model/Makima-hair.png', e);
      _makimaHairImageLoading = false;
    };
    img.src = 'Assets/model/Makima-hair.png?v=1';
    _makimaHairImage = img;
  }
  return _makimaHairImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getMakimaHairImage();
}

/**
 * Draws Makima's authentic pixel-art hair from Assets/model/Makima-hair.png.
 * Features:
 * - Salmon-red parted bangs with center forehead peak
 * - Long face-framing cheek locks
 * - Flowing side braid trailing over her shoulder
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - Character body radius
 * @param {boolean} [facingLeft=false]
 */
export function _drawMakimaHair(ctx, r, facingLeft = false) {
  const hairImg = _getMakimaHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for crisp pixel art fidelity (Rule #19)

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.makima) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;

    // Makima-hair.png (522x478).
    // True visible hair bounding box:
    // X: [89, 410] (visible width 322, symmetrical horizontal center at 249.5)
    // Y: [43, 450] (visible height 408, crown top at 43, bang bottom at 234)
    const targetHairWidth = r * 2.30 * wMult;
    const targetHairHeight = r * 2.254 * hMult;
    const scaleX = targetHairWidth / 322;
    const scaleY = targetHairHeight / 322; // Decoupled from scaleX: width and height scale independently
    const drawW = 522 * scaleX;
    const drawH = 478 * scaleY;
    const drawX = -249.5 * scaleX + offX;
    const drawY = -r * 1.28 - 43 * scaleY + offY; // Rounded natural crown curve

    if (rot !== 0) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(rot);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }
}

/**
 * Main Skin Renderer for Makima (The Control Devil)
 * Uses procedural drawn pixel body + authentic pixel hair asset from Assets/model/Makima-hair.png.
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

  const isCrucifixion = !isPodiumPreview && !isSuppressed && Boolean(fighter.isExecutingCrucifixion || fighter.isExecutingRitual);
  let crucifixionElapsed = 0;
  if (isCrucifixion) {
    const maxT = fighter.crucifixionMaxTimer || 140;
    const curT = fighter.crucifixionTimer !== undefined ? fighter.crucifixionTimer : (fighter.ritualTimer || 0);
    crucifixionElapsed = Math.max(0, maxT - curT);
  }

  // ── LAYER 0: GROUND SUMMONING SEAL (Floor POV Under Makima) ──
  if (isSummoning) {
    _drawMakimaSummoningGroundSeal(ctx, r, chargePct, now);
  } else if (isCrucifixion && crucifixionElapsed < 24) {
    const prePct = Math.min(1.0, crucifixionElapsed / 20.0);
    _drawMakimaSummoningGroundSeal(ctx, r, prePct, now);
  }

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  // When executing Crucifixion, her angle is strictly facing towards the user (Front POV upright: angle = 0, facingLeft = false)
  const angle = (isPodiumPreview || isCrucifixion) ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = !isCrucifixion && Math.abs(angle) > Math.PI / 2;
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
  const isPreparingBang = !isPodiumPreview && !isSummoning && !isPreparingChain && !isThrowingChain && !isSuppressed && Boolean(fighter.isPreparingBang || (fighter.bangWindupTimer && fighter.bangWindupTimer > 0));
  const isShooting = !isPodiumPreview && !isSummoning && !isPreparingChain && !isThrowingChain && !isTetheringChain && !isSuppressed && !isPreparingBang && ((fighter.slashSwingTimer && fighter.slashSwingTimer > 0) || (fighter.punchAnimTimer && fighter.punchAnimTimer > 0));

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

  let windupProgress = 0;
  let windupExtendX = 0;
  if (isPreparingBang) {
    const maxWindup = fighter.bangWindupMax || 8;
    const curWindup = fighter.bangWindupTimer || 0;
    windupProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curWindup / maxWindup)));
    // Hand points and extends smoothly forward during windup
    windupExtendX = Math.sin(windupProgress * Math.PI * 0.5) * 2.2;
    // Slight resolute posture forward lean during aiming
    ctx.translate(Math.sin(windupProgress * Math.PI * 0.5) * 0.8, 0);
  }

  let rawProgress = 0;
  let recoilKickX = 0;
  let recoilRiseY = 0;

  if (isShooting) {
    const maxT = fighter.slashSwingMaxTimer || fighter.punchMaxTime || 16;
    const curTimer = fighter.slashSwingTimer > 0 ? fighter.slashSwingTimer : fighter.punchAnimTimer;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxT)));

    // Smooth continuous recoil curve: smooth elastic rise, cushioned apex, and seamless damped recovery
    let recoilCurve = 0;
    if (rawProgress < 0.20) {
      const t = rawProgress / 0.20;
      recoilCurve = Math.sin(t * Math.PI * 0.5);
    } else {
      const pRec = (rawProgress - 0.20) / 0.80;
      recoilCurve = Math.cos(pRec * Math.PI * 0.5) * Math.pow(1.0 - pRec, 0.75);
    }

    recoilKickX = -4.5 * recoilCurve;
    recoilRiseY = -1.8 * recoilCurve;
  }

  // Hand Coordinates (Rest position at r * 0.95, extends during windup, kicks back sharply on fire)
  const frontX = r * 0.95 + windupExtendX + recoilKickX;
  const frontY = r * 0.28 + recoilRiseY; // Lowered to align naturally with lowered chest / shoulder level
  const backX = -r * 0.24;
  const backY = -r * 0.45;

  const hideHandsAndWeapon = isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = hideHandsAndWeapon || fighter.hideFrontHand;
  const hideBackHand = hideHandsAndWeapon || fighter.hideBackHand;
  const handRadius = getHandSize(8.2);

  const skinBase = '#FEE5D6';
  const skinShadow = '#EDB8A2';

  // ── LAYER 1 & 2: MAIN BODY (Procedural Drawn Pixel Body + Authentic Hair Asset) ──
  // LAYER 1: PROCEDURAL PIXEL ART BODY CIRCLE
  drawMakimaPixelBody(ctx, r);

  // LAYER 2: AUTHENTIC PIXEL-ART HAIR ASSET (Assets/model/Makima-hair.png)
  _drawMakimaHair(ctx, r, facingLeft);

  // Status Overlays (freeze, stun, time-stop)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  // ── LAYER 3: HANDS IN FRONT (On Top of Body) ──
  if (isCrucifixion && !hideHandsAndWeapon) {
    _drawMakimaCrucifixionHands(ctx, r, crucifixionElapsed, now, skinBase, skinShadow, fighter);
  } else {
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
        drawMakimaPixelFingerGun(ctx, frontX, frontY, rawProgress, r, isShooting, isPreparingBang, windupProgress);
      }
    }
  }

  ctx.restore();
}

// Offscreen canvas cache for Makima's procedural pixel body model (avoids 1,200 fillRect calls per frame)
let _cachedMakimaCanvas = null;
let _cachedMakimaR = 0;

function _renderMakimaPixelBodyToCanvas(destCtx, r) {
  destCtx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

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
        destCtx.fillStyle = '#0E0F14';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // 2. FAIR PORCELAIN FACE SKIN (ry < r * 0.32)
      // ──────────────────────────────────────────
      else if (ry < r * 0.32) {
        let col = '#FEE5D6'; // Fair Ivory / Porcelain Base Skin

        if (Math.abs(gx) >= 8 || gy < -8) {
          col = '#EDB8A2'; // Soft Warm Peach Cheek & Perimeter Shadow
        } else if (gy >= 2) {
          col = '#FDEFE6'; // Radiant Lower Face / Jawline Porcelain Skin
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // 4. PUBLIC SAFETY ATTIRE (ry >= r * 0.32)
      // ──────────────────────────────────────────
      else {
        // A. Exposed Throat Skin & V-Cut
        const isThroat = (ry <= r * 0.40 && Math.abs(rx) <= (1 - (ry - r * 0.32) / (r * 0.08)) * (r * 0.14));

        // B. Shirt Pointed Collar Wings
        const isCollarLeft = (rx >= -r * 0.32 && rx <= -r * 0.06 && ry >= r * 0.32 && ry <= r * 0.46 && (rx - (-r * 0.32)) * 0.85 > (ry - r * 0.32));
        const isCollarRight = (rx >= r * 0.06 && rx <= r * 0.32 && ry >= r * 0.32 && ry <= r * 0.46 && (r * 0.32 - rx) * 0.85 > (ry - r * 0.32));

        // C. Slim Solid Matte Black Necktie (NO Gold Clip)
        const isTieKnot = (ry >= r * 0.36 && ry <= r * 0.44 && Math.abs(rx) <= r * 0.09);
        const tieBladeHalfW = (r * 0.07 + (ry - r * 0.44) * 0.04);
        const isTieBlade = (ry >= r * 0.44 && ry <= r * 0.74 && Math.abs(rx) <= tieBladeHalfW);

        // D. High-Waisted Dark Charcoal Trousers
        const isTrousers = (ry >= r * 0.72);

        if (isTieKnot || isTieBlade) {
          // Matte Black Necktie Pixels
          if (rx < -tieBladeHalfW * 0.4 && ry > r * 0.44) {
            destCtx.fillStyle = '#2C303E'; // Left-edge silk gleam
          } else if (Math.abs(rx) >= tieBladeHalfW - P * 0.8 || ry >= r * 0.72) {
            destCtx.fillStyle = '#0E0F14'; // Dark edge outline
          } else {
            destCtx.fillStyle = '#181A22'; // Solid matte black body
          }
          destCtx.fillRect(px, py, P, P);
        } else if (isCollarLeft || isCollarRight) {
          // Crisp White Pointed Collar
          if (ry < r * 0.36) {
            destCtx.fillStyle = '#FFFFFF';
          } else if (ry > r * 0.42 || Math.abs(rx) > r * 0.26) {
            destCtx.fillStyle = '#D4D8CB'; // Collar edge shadow
          } else {
            destCtx.fillStyle = '#FAFBF6';
          }
          destCtx.fillRect(px, py, P, P);
        } else if (isThroat) {
          // Throat Skin
          destCtx.fillStyle = (ry > r * 0.36) ? '#ECB7A1' : '#FEE5D6';
          destCtx.fillRect(px, py, P, P);
        } else if (isTrousers) {
          // High-Waisted Dark Trousers Pixels
          if (ry <= r * 0.75) {
            destCtx.fillStyle = '#2E3642'; // Waistband top highlight
          } else if (Math.abs(rx) <= P * 0.7 && ry >= r * 0.76) {
            destCtx.fillStyle = '#0D0F13'; // Center fly seam
          } else if (Math.abs(Math.abs(rx) - r * 0.45) <= P * 0.7 && ry >= r * 0.78) {
            destCtx.fillStyle = '#101317'; // Side pleats
          } else {
            destCtx.fillStyle = '#1B2026'; // Charcoal trousers base
          }
          destCtx.fillRect(px, py, P, P);
        } else {
          // White Button-Up Dress Shirt (ry = r * 0.32 to r * 0.72)
          // Center Button Placket
          const isPlacket = (Math.abs(rx) <= r * 0.08);
          // Pearl Button Pixels
          const isButton = (isPlacket && (Math.abs(ry - r * 0.48) < P || Math.abs(ry - r * 0.58) < P || Math.abs(ry - r * 0.68) < P));

          if (isButton) {
            destCtx.fillStyle = '#E8ECE0';
          } else if (isPlacket) {
            destCtx.fillStyle = '#FAFBF6';
          } else if (Math.abs(rx) > r * 0.52 || (ry > r * 0.64 && Math.abs(rx) > r * 0.30)) {
            destCtx.fillStyle = '#D4D8CB'; // Sleeve & ribcage cloth shading
          } else if (Math.abs(rx) > r * 0.70) {
            destCtx.fillStyle = '#B9BEAE'; // Outer sleeve deep crease
          } else {
            destCtx.fillStyle = '#F3F4ED'; // Ivory white shirt core
          }
          destCtx.fillRect(px, py, P, P);
        }
      }
    }
  }

  destCtx.restore();
}

/**
 * Authentic 1:1 Procedural Pixel Art Body for Makima (High Performance Offscreen Cached)
 */
export function drawMakimaPixelBody(ctx, r) {
  if (!_cachedMakimaCanvas || _cachedMakimaR !== r) {
    _cachedMakimaR = r;
    const P = 2.0;
    const steps = Math.ceil((r + P) / P);
    const size = (steps + 2) * P * 2;
    _cachedMakimaCanvas = document.createElement('canvas');
    _cachedMakimaCanvas.width = size;
    _cachedMakimaCanvas.height = size;
    const offCtx = _cachedMakimaCanvas.getContext('2d');
    _renderMakimaPixelBodyToCanvas(offCtx, r);
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_cachedMakimaCanvas, -_cachedMakimaCanvas.width / 2, -_cachedMakimaCanvas.height / 2);
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
export function drawMakimaPixelFingerGun(ctx, x, y, progress, r, isShooting, isPreparingBang = false, windupProgress = 0) {
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

  // Recoil upward pitch angle & hammer dynamic snap during windup & shot (Smooth Damped Spring Curve)
  let recoilPitch = 0;
  let hammerSnap = 0;
  if (isPreparingBang) {
    // Smoothly cock the thumb hammer backward during aiming windup
    hammerSnap = -Math.sin(windupProgress * Math.PI * 0.5) * 0.22;
  } else if (isShooting) {
    let recoilCurve = 0;
    if (progress < 0.20) {
      const t = progress / 0.20;
      recoilCurve = Math.sin(t * Math.PI * 0.5);
      hammerSnap = Math.sin(t * Math.PI * 0.5) * 0.10;
    } else {
      const pRec = (progress - 0.20) / 0.80;
      recoilCurve = Math.cos(pRec * Math.PI * 0.5) * Math.pow(1.0 - pRec, 0.75);
      hammerSnap = Math.cos(pRec * Math.PI * 0.5) * Math.pow(1.0 - pRec, 0.75) * 0.10;
    }
    recoilPitch = -0.14 * recoilCurve; // ~8° smooth cinematic muzzle climb
  }
  ctx.rotate(recoilPitch);

  // Pre-firing cursed energy glint & charge spark at index fingertip during windup
  if (isPreparingBang && windupProgress > 0.15) {
    const muzzleTipX = 24.0;
    const glintAlpha = Math.min(1.0, (windupProgress - 0.15) / 0.85);
    ctx.fillStyle = `rgba(245, 158, 11, ${(glintAlpha * 0.90).toFixed(3)})`;
    ctx.fillRect(snap(muzzleTipX), snap(-1.0), P, P);
    if (windupProgress > 0.5) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(glintAlpha * 0.95).toFixed(3)})`;
      ctx.fillRect(snap(muzzleTipX + P), snap(-1.0), P, P);
      ctx.fillStyle = `rgba(251, 191, 36, ${(glintAlpha * 0.80).toFixed(3)})`;
      ctx.fillRect(snap(muzzleTipX), snap(-1.0 - P), P, P);
      ctx.fillRect(snap(muzzleTipX), snap(-1.0 + P), P, P);
    }
  }

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
 * Draws Makima's Back Hand resting calmly on her left side in commanding authority.
 * Uses standard round pixel hand on the left side of her body (-r * 0.85).
 */
function _drawMakimaChannelingBackHand(ctx, r, chargePct, now, skinBase, skinShadow) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const handX = snap(-r * 0.85);
  const handY = snap(r * 0.24);
  const handRadius = getHandSize(7.2);
  const skinOutline = '#0E0F14';

  // Crisp White Shirt Sleeve Cuff behind hand at outer left side
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(handX - 5), snap(handY - 4), 6, 8);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(handX - 4), snap(handY - 3), 4, 6);
  ctx.fillStyle = '#D4D8CB';
  ctx.fillRect(snap(handX - 4), snap(handY + 1), 4, 2);

  // Standard Round Pixel Hand
  drawPixelHand(ctx, handX, handY, handRadius, skinBase, skinOutline);
  ctx.restore();
}

/**
 * Draws Makima's Raised Front Hand Gesturing Skyward towards the Angel Halo.
 * Uses standard round pixel hand on the right side of her body (+r * 0.85).
 * Features:
 * - Crisp white shirt cuff
 * - Standard round pixel hand via drawPixelHand
 * - Orbiting Stepped Golden Sacred Wrist Rings
 * - Ascending fingertip sparks and light motes
 */
function _drawMakimaRaisedCommandHand(ctx, r, chargePct, now, skinBase, skinShadow) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const skinOutline = '#0E0F14';
  const handX = snap(r * 0.85);
  const handY = snap(-r * 0.35);
  const handRadius = getHandSize(7.2);

  // Crisp White Shirt Sleeve Cuff behind hand
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(handX - 2), snap(handY + 3), 6, 6);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(handX - 1), snap(handY + 4), 4, 4);

  // Standard Round Pixel Hand
  drawPixelHand(ctx, handX, handY, handRadius, skinBase, skinOutline);

  // Orbiting Golden Sacred Wrist Rings around the raised round hand
  const rotRing = now * 0.012;
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(rotRing);

  // Inner Ring (r: 8px)
  _pxRingLocal(ctx, 0, 0, 8, 2, `rgba(254, 240, 138, ${(chargePct * 0.95).toFixed(3)})`);
  // Outer Ring (r: 12px)
  _pxRingLocal(ctx, 0, 0, 12, 1.5, `rgba(245, 158, 11, ${(chargePct * 0.85).toFixed(3)})`);

  // 4 Cardinal Pixel Diamonds on Orbiting Ring
  for (let d = 0; d < 4; d++) {
    const da = (d * Math.PI) / 2;
    const dx = snap(Math.cos(da) * 12);
    const dy = snap(Math.sin(da) * 12);
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(dx - P, dy - P, P * 2, P * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(dx - P * 0.5, dy - P * 0.5, P, P);
  }
  ctx.restore();

  // Ascending sparks and light motes
  for (let s = 0; s < 4; s++) {
    const sPhase = ((now * 0.005 + s * 0.25) % 1.0);
    const sY = snap(handY - 6 - sPhase * 16);
    const sX = snap(handX + (s - 1.5) * 3.5 + Math.sin(now * 0.01 + s) * 2.0);
    const sAlpha = Math.sin(sPhase * Math.PI) * chargePct * 0.95;

    ctx.fillStyle = (s % 2 === 0)
      ? `rgba(255, 255, 255, ${sAlpha.toFixed(3)})`
      : `rgba(254, 240, 138, ${sAlpha.toFixed(3)})`;
    ctx.fillRect(sX, sY, P, P);
  }

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
 * Local Stepped Pixel Diamond Helper.
 */
function _pxDiamond(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(snap(x), snap(y - size));
  ctx.lineTo(snap(x + size), snap(y));
  ctx.lineTo(snap(x), snap(y + size));
  ctx.lineTo(snap(x - size), snap(y));
  ctx.closePath();
  ctx.fill();
}

/**
 * Master hand animator for Makima's Crucifixion Ultimate.
 * Adheres strictly to:
 * - Round shape pixel hands rendered via drawPixelHand (Rule 20)
 * - Placement on the SIDES of her body (-X left side, +X right side), NEVER clustered in the middle
 * - Upright Front POV orientation (Rule 19) and zero shadowBlur (Rule 11)
 *
 * Phases:
 * 1. elapsed < 24: Pre-Chain Channeling at both sides of her body -> release burst
 * 2. 24 <= elapsed < 46: Anchoring Chain Leash on left side & Smooth Right Hand Elevation along right side
 * 3. 46 <= elapsed < 85: Angel's Armory Celestial Summon (46..65) & Downward Plunge Command (65..85)
 * 4. 85 <= elapsed <= 140: Resolute execution stance & recovery
 */
function _drawMakimaCrucifixionHands(ctx, r, elapsed, now, skinBase, skinShadow, fighter) {
  const handRadius = getHandSize(7.2);
  const skinOutline = '#0E0F14';

  if (elapsed < 24) {
    _drawMakimaCrucifixionPreChainHands(ctx, r, elapsed, now, skinBase, skinShadow, handRadius, skinOutline);
  } else if (elapsed < 46) {
    _drawMakimaCrucifixionLeashAndSkywardHands(ctx, r, elapsed, now, skinBase, skinShadow, handRadius, skinOutline);
  } else if (elapsed < 85) {
    _drawMakimaCrucifixionAngelArmoryHands(ctx, r, elapsed, now, skinBase, skinShadow, handRadius, skinOutline, fighter);
  } else {
    _drawMakimaCrucifixionRecoveryHands(ctx, r, elapsed, now, skinBase, skinShadow, handRadius, skinOutline);
  }
}

/**
 * 1. Pre-Chain Channeling Animation (elapsed < 24):
 * Makima channels the Chains of Domination with round hands positioned symmetrically
 * on the SIDES of her body (-r * 0.85 on left side and +r * 0.85 on right side).
 * Weaves crimson & solar gold rings/filaments around both round hands.
 * At elapsed = 20..24, both round hands burst slightly outward ("UNLEASH!").
 */
function _drawMakimaCrucifixionPreChainHands(ctx, r, elapsed, now, skinBase, skinShadow, handRadius, skinOutline) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const channelPct = Math.min(1.0, elapsed / 20.0);
  const baseY = snap(r * 0.24);
  const bobY = Math.sin(now * 0.012) * 1.5;

  if (elapsed <= 20) {
    // ── Phase 1A: Round Hands at Sides Weaving Domination Power ──
    const leftX = snap(-r * 0.85);
    const rightX = snap(r * 0.85);
    const handY = snap(baseY + bobY);

    // Crisp White Shirt Cuffs behind hands on outer edges
    // Left Cuff
    ctx.fillStyle = skinOutline;
    ctx.fillRect(snap(leftX - 5), snap(handY - 4), 6, 8);
    ctx.fillStyle = '#FAFBF6';
    ctx.fillRect(snap(leftX - 4), snap(handY - 3), 4, 6);
    ctx.fillStyle = '#D4D8CB';
    ctx.fillRect(snap(leftX - 4), snap(handY + 1), 4, 2);

    // Right Cuff
    ctx.fillStyle = skinOutline;
    ctx.fillRect(snap(rightX - 1), snap(handY - 4), 6, 8);
    ctx.fillStyle = '#FAFBF6';
    ctx.fillRect(snap(rightX), snap(handY - 3), 4, 6);
    ctx.fillStyle = '#D4D8CB';
    ctx.fillRect(snap(rightX), snap(handY + 1), 4, 2);

    // Standard Round Pixel Hands on left and right sides
    drawPixelHand(ctx, leftX, handY, handRadius, skinBase, skinOutline);
    drawPixelHand(ctx, rightX, handY, handRadius, skinBase, skinOutline);

    // Golden & Crimson Domination Energy Rings weaving around each round hand at her sides
    const ringR = snap(6 + ((now * 0.025 + elapsed * 0.8) % 14));
    const ringAlpha = (1.0 - (ringR / 14)) * channelPct * 0.85;
    _pxRingLocal(ctx, leftX, handY, ringR, 1.5, `rgba(245, 158, 11, ${ringAlpha.toFixed(3)})`);
    _pxRingLocal(ctx, rightX, handY, ringR, 1.5, `rgba(245, 158, 11, ${ringAlpha.toFixed(3)})`);

    const innerRingR = snap(4 + ((now * 0.035 + elapsed * 0.6) % 10));
    const innerRingAlpha = (1.0 - (innerRingR / 10)) * channelPct * 0.70;
    _pxRingLocal(ctx, leftX, handY, innerRingR, 1.2, `rgba(163, 29, 36, ${innerRingAlpha.toFixed(3)})`);
    _pxRingLocal(ctx, rightX, handY, innerRingR, 1.2, `rgba(163, 29, 36, ${innerRingAlpha.toFixed(3)})`);

    // Rotating Domination Rune Diamonds at each hand
    const diaSize = 3.5 + Math.sin(now * 0.015) * 1.0;
    _pxDiamond(ctx, leftX, handY, diaSize, '#FEF08A');
    _pxDiamond(ctx, leftX, handY, diaSize * 0.5, '#A31D24');
    _pxDiamond(ctx, rightX, handY, diaSize, '#FEF08A');
    _pxDiamond(ctx, rightX, handY, diaSize * 0.5, '#A31D24');

    // Ascending Stepped Light Motes on both sides
    for (let m = 0; m < 3; m++) {
      const mPhase = ((now * 0.006 + m * 0.33) % 1.0);
      const mAlpha = Math.sin(mPhase * Math.PI) * channelPct * 0.80;
      const col = (m % 2 === 0) ? `rgba(254, 240, 138, ${mAlpha.toFixed(3)})` : `rgba(255, 255, 255, ${mAlpha.toFixed(3)})`;
      ctx.fillStyle = col;
      ctx.fillRect(snap(leftX + Math.sin(m * 2.1 + now * 0.008) * 4), snap(handY - mPhase * 14), P, P);
      ctx.fillRect(snap(rightX + Math.cos(m * 2.1 + now * 0.008) * 4), snap(handY - mPhase * 14), P, P);
    }
  } else {
    // ── Phase 1B: Release Burst ("UNLEASH!") at elapsed = 20..24 ──
    const burstP = (elapsed - 20) / 4.0;
    const burstSpread = snap(burstP * 4.0);
    const leftX = snap(-r * 0.85 - burstSpread);
    const rightX = snap(r * 0.85 + burstSpread);
    const handY = snap(baseY);

    // Cuffs
    ctx.fillStyle = skinOutline;
    ctx.fillRect(snap(leftX - 5), snap(handY - 4), 6, 8);
    ctx.fillRect(snap(rightX - 1), snap(handY - 4), 6, 8);
    ctx.fillStyle = '#FAFBF6';
    ctx.fillRect(snap(leftX - 4), snap(handY - 3), 4, 6);
    ctx.fillRect(snap(rightX), snap(handY - 3), 4, 6);

    // Round Hands pushed outward on the sides of her body
    drawPixelHand(ctx, leftX, handY, handRadius, skinBase, skinOutline);
    drawPixelHand(ctx, rightX, handY, handRadius, skinBase, skinOutline);

    // Expanding Release Burst Shockwave Rings from each hand at the sides
    const burstR = snap(8 + burstP * 18);
    const burstAlpha = (1.0 - burstP * 0.5).toFixed(3);
    _pxRingLocal(ctx, leftX, handY, burstR, 2.0, `rgba(245, 158, 11, ${burstAlpha})`);
    _pxRingLocal(ctx, rightX, handY, burstR, 2.0, `rgba(245, 158, 11, ${burstAlpha})`);
    _pxRingLocal(ctx, leftX, handY, snap(burstR * 0.6), 1.5, `rgba(255, 255, 255, ${burstAlpha})`);
    _pxRingLocal(ctx, rightX, handY, snap(burstR * 0.6), 1.5, `rgba(255, 255, 255, ${burstAlpha})`);
  }

  ctx.restore();
}

/**
 * Left Hand firmly gripping the chain leash on the LEFT SIDE of her body (-r * 0.85).
 * Anchors the golden tether to the crucified victim with standard round shape hand.
 */
function _drawMakimaLeashGripHand(ctx, r, now, skinBase, skinShadow, handRadius, skinOutline) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const handX = snap(-r * 0.85);
  const handY = snap(r * 0.24);

  // Crisp White Shirt Sleeve Cuff behind hand at outer left side
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(handX - 5), snap(handY - 4), 6, 8);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(handX - 4), snap(handY - 3), 4, 6);
  ctx.fillStyle = '#D4D8CB';
  ctx.fillRect(snap(handX - 4), snap(handY + 1), 4, 2);

  // Standard Round Shape Hand
  drawPixelHand(ctx, handX, handY, handRadius, skinBase, skinOutline);

  // Clutched Golden Chain Link inside hand
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(handX - 2), snap(handY - 1), 6, 4);
  ctx.fillStyle = '#781D16';
  ctx.fillRect(snap(handX - 1), snap(handY), 4, 2);
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(snap(handX), snap(handY), 2, 2);

  // Taut Chain Leash extending downward from hand toward floor/enemy
  const chainEndY = snap(handY + 22);
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(handX + 1), snap(handY + 3), 4, chainEndY - (handY + 3));
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(snap(handX + 2), snap(handY + 3), 2, chainEndY - (handY + 3));
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(snap(handX + 2.5), snap(handY + 3), 1, chainEndY - (handY + 3));

  ctx.restore();
}

/**
 * 2. Intermediate Tethering Phase (elapsed = 24..46):
 * Left Round Hand holds chain leash on left side (-r * 0.85).
 * Right Round Hand transitions smoothly skyward on right side (+r * 0.85).
 */
function _drawMakimaCrucifixionLeashAndSkywardHands(ctx, r, elapsed, now, skinBase, skinShadow, handRadius, skinOutline) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Left Hand: Gripping Chain Leash on Left Side (-r * 0.85, r * 0.24)
  _drawMakimaLeashGripHand(ctx, r, now, skinBase, skinShadow, handRadius, skinOutline);

  // 2. Right Hand: Transitioning smoothly skyward along Right Side (+r * 0.85)
  const raiseP = Math.min(1.0, (elapsed - 24) / 22.0);
  const rightX = snap(r * 0.85);
  const startY = snap(r * 0.24);
  const endY = snap(-r * 0.35);
  const curHandY = snap(startY + (endY - startY) * raiseP);

  // Crisp White Shirt Cuff behind right hand
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(rightX - 1), snap(curHandY + 2), 6, 6);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(rightX), snap(curHandY + 3), 4, 4);

  // Standard Round Shape Hand
  drawPixelHand(ctx, rightX, curHandY, handRadius, skinBase, skinOutline);

  // Subtle golden wrist glow in transition
  _pxRingLocal(ctx, rightX, curHandY, 7, 1.2, `rgba(245, 158, 11, ${(0.6 * raiseP).toFixed(3)})`);

  ctx.restore();
}

/**
 * 3. Angel's Armory Plunge Animation (elapsed = 46..85):
 * - elapsed 46..65: Right Round Hand raised skyward on right side (+r * 0.85) directing high-altitude descent with orbiting golden rings
 * - elapsed 65..85: Right Round Hand SNAPS DOWNWARD along right side into commanding execution drop ("DROP!") with divine tracer beam
 */
function _drawMakimaCrucifixionAngelArmoryHands(ctx, r, elapsed, now, skinBase, skinShadow, handRadius, skinOutline, fighter) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Left Hand: Firmly gripping chain leash on Left Side throughout entire Armory sequence
  _drawMakimaLeashGripHand(ctx, r, now, skinBase, skinShadow, handRadius, skinOutline);

  // 2. Right Hand Animation on Right Side:
  if (elapsed < 65) {
    // Skyward Raised Command Hand with Orbiting Sacred Rings along Right Side (+r * 0.85)
    const chargePct = Math.min(1.0, (elapsed - 46) / 18.0);
    const rightX = snap(r * 0.85);
    const rightY = snap(-r * 0.35);

    // Crisp White Shirt Cuff
    ctx.fillStyle = skinOutline;
    ctx.fillRect(snap(rightX - 2), snap(rightY + 3), 6, 6);
    ctx.fillStyle = '#FAFBF6';
    ctx.fillRect(snap(rightX - 1), snap(rightY + 4), 4, 4);

    // Standard Round Shape Hand
    drawPixelHand(ctx, rightX, rightY, handRadius, skinBase, skinOutline);

    // Orbiting Stepped Golden Sacred Wrist Rings around the raised round hand
    const rotRing = now * 0.012;
    ctx.save();
    ctx.translate(rightX, rightY);
    ctx.rotate(rotRing);

    _pxRingLocal(ctx, 0, 0, 8, 2, `rgba(254, 240, 138, ${(chargePct * 0.95).toFixed(3)})`);
    _pxRingLocal(ctx, 0, 0, 12, 1.5, `rgba(245, 158, 11, ${(chargePct * 0.85).toFixed(3)})`);

    for (let d = 0; d < 4; d++) {
      const da = (d * Math.PI) / 2;
      const dx = snap(Math.cos(da) * 12);
      const dy = snap(Math.sin(da) * 12);
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(dx - P, dy - P, P * 2, P * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(dx - P * 0.5, dy - P * 0.5, P, P);
    }
    ctx.restore();

    // Ascending fingertip sparks and light motes
    for (let s = 0; s < 4; s++) {
      const sPhase = ((now * 0.005 + s * 0.25) % 1.0);
      const sY = snap(rightY - 6 - sPhase * 16);
      const sX = snap(rightX + (s - 1.5) * 3.5 + Math.sin(now * 0.01 + s) * 2.0);
      const sAlpha = Math.sin(sPhase * Math.PI) * chargePct * 0.95;

      ctx.fillStyle = (s % 2 === 0)
        ? `rgba(255, 255, 255, ${sAlpha.toFixed(3)})`
        : `rgba(254, 240, 138, ${sAlpha.toFixed(3)})`;
      ctx.fillRect(sX, sY, P, P);
    }
  } else {
    // Execution Drop Gesture: Right round hand snaps downward on right side ("DROP!")
    const dropPct = Math.min(1.0, (elapsed - 65) / 15.0);
    _drawMakimaDownwardDropCommandHand(ctx, r, dropPct, now, skinBase, skinShadow, elapsed, handRadius, skinOutline);
  }

  ctx.restore();
}

/**
 * Right Round Hand pointing forcefully downward in commanding execution drop gesture ("DROP!") on RIGHT SIDE.
 * Emits a brilliant needle ray of celestial light and compression shockwave diamonds.
 */
function _drawMakimaDownwardDropCommandHand(ctx, r, dropPct, now, skinBase, skinShadow, elapsed, handRadius, skinOutline) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const easeDrop = 1.0 - Math.pow(1.0 - dropPct, 3.0);
  const handX = snap(r * 0.85);
  const startY = snap(-r * 0.35);
  const endY = snap(r * 0.36);
  const handY = snap(startY + (endY - startY) * easeDrop);

  // Crisp White Shirt Cuff Band directly above the round hand
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(handX - 3), snap(handY - 7), 6, 6);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(handX - 2), snap(handY - 6), 4, 4);

  // Standard Round Shape Hand on the right side of her body
  drawPixelHand(ctx, handX, handY, handRadius, skinBase, skinOutline);

  // ── DIVINE COMMAND TRACER BEAM & COMPRESSION DIAMONDS ──
  const beamIntensity = Math.min(1.0, easeDrop * 1.2);
  const beamLen = snap(60 + easeDrop * 40);
  const beamStartY = snap(handY + handRadius);

  ctx.save();
  // Outer Amber Halo
  ctx.fillStyle = `rgba(245, 158, 11, ${(0.45 * beamIntensity).toFixed(3)})`;
  ctx.fillRect(snap(handX - 3), beamStartY, 7, beamLen);

  // Solar Gold Core
  ctx.fillStyle = `rgba(254, 240, 138, ${(0.85 * beamIntensity).toFixed(3)})`;
  ctx.fillRect(snap(handX - 1.5), beamStartY, 4, beamLen);

  // Pure White Kinetic Spine
  ctx.fillStyle = `rgba(255, 255, 255, ${(0.98 * beamIntensity).toFixed(3)})`;
  ctx.fillRect(snap(handX - 0.5), beamStartY, 2, beamLen - 4);

  // Stepped Compression Diamonds traveling down the beam
  _pxDiamond(ctx, handX + 0.5, beamStartY + 8, 3.5, '#FFFFFF');
  _pxDiamond(ctx, handX + 0.5, beamStartY + 22, 4.5, '#FEF08A');
  _pxDiamond(ctx, handX + 0.5, beamStartY + 42, 5.5, '#F59E0B');

  // Pulsing Divine Command Ring at Wrist/Hand
  _pxRingLocal(ctx, handX, handY, snap(8 + Math.sin(now * 0.02) * 1.5), 1.5, `rgba(245, 158, 11, ${(0.8 * beamIntensity).toFixed(3)})`);
  _pxRingLocal(ctx, handX, handY, 5, 1.2, `rgba(254, 240, 138, ${(0.9 * beamIntensity).toFixed(3)})`);
  ctx.restore();

  ctx.restore();
}

/**
 * 4. Post-Impact Recovery Phase (elapsed = 85..140):
 * Right round hand smoothly returns to her right side while left round hand rests on her left side.
 */
function _drawMakimaCrucifixionRecoveryHands(ctx, r, elapsed, now, skinBase, skinShadow, handRadius, skinOutline) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const recoverP = Math.min(1.0, (elapsed - 85) / 35.0);

  // Left Hand: Resting calmly on left side (-r * 0.85, r * 0.24)
  const leftX = snap(-r * 0.85);
  const leftY = snap(r * 0.24);
  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(leftX - 5), snap(leftY - 4), 6, 8);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(leftX - 4), snap(leftY - 3), 4, 6);
  drawPixelHand(ctx, leftX, leftY, handRadius, skinBase, skinOutline);

  // Right Hand: Lowering smoothly from drop stance (r * 0.36) back to rest level (r * 0.24) on right side (r * 0.85)
  const rightX = snap(r * 0.85);
  const startY = snap(r * 0.36);
  const endY = snap(r * 0.24);
  const curY = snap(startY + (endY - startY) * recoverP);

  ctx.fillStyle = skinOutline;
  ctx.fillRect(snap(rightX - 1), snap(curY - 4), 6, 8);
  ctx.fillStyle = '#FAFBF6';
  ctx.fillRect(snap(rightX), snap(curY - 3), 4, 6);
  drawPixelHand(ctx, rightX, curY, handRadius, skinBase, skinOutline);

  ctx.restore();
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
        drawMakimaPixelBody(bCtx, r);
        _drawMakimaHair(bCtx, r);
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
