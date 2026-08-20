// ─────────────────────────────────────────────
// John Wick ("The Baba Yaga") Fighter Skin & Body Model
// High-Fidelity PNG Body Model with Procedural Fallback
// Strictly adheres to:
// - Rule 19 (Upright Front POV, No Eyes/Mouth/Nose Standard)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state, isChampionScreenActive } from '../../core/state.js';

let _johnWickImage = null;
let _johnWickImageLoading = false;
let _cachedBodyGrad = null;
let _cachedBodyGradR = 0;

function _getBodyGrad(ctx, r) {
  if (!_cachedBodyGrad || _cachedBodyGradR !== r) {
    _cachedBodyGradR = r;
    _cachedBodyGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
    _cachedBodyGrad.addColorStop(0, 'rgba(255, 245, 235, 0.25)');
    _cachedBodyGrad.addColorStop(0.75, 'rgba(190, 120, 90, 0.15)');
    _cachedBodyGrad.addColorStop(1, 'rgba(45, 18, 12, 0.35)');
  }
  return _cachedBodyGrad;
}

/**
 * Preload and retrieve the John Wick PNG body model
 */
function _getJohnWickImage() {
  if (_johnWickImage && _johnWickImage.complete && _johnWickImage.naturalWidth > 0) {
    return _johnWickImage;
  }
  if (!_johnWickImageLoading && typeof Image !== 'undefined') {
    _johnWickImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _johnWickImage = img;
      _johnWickImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load John Wick body model image at Assets/model/john-wick-model.png', e);
      _johnWickImageLoading = false;
    };
    img.src = 'Assets/model/john-wick-model.png';
    _johnWickImage = img;
  }
  return _johnWickImage;
}

// Preload immediately if running in browser/electron
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getJohnWickImage();
}

/**
 * Draws a tactical gloved/bare fist with black suit sleeve cuff
 */
function _drawWickHand(ctx, x, y, radius, skinColor) {
  ctx.save();
  ctx.translate(x, y);

  // 1. Black Tactical Suit Sleeve Cuff
  ctx.fillStyle = '#141517';
  ctx.strokeStyle = '#0a0a0c';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-radius * 0.95, -radius * 0.75, radius * 1.9, radius * 0.55, 2);
  ctx.fill();
  ctx.stroke();

  // White shirt cuff peek
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(-radius * 0.85, -radius * 0.35, radius * 1.7, radius * 0.22, 1);
  ctx.fill();

  // 2. Fist / Hand (Natural Skin Tone)
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Knuckle crease line
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.45, 0);
  ctx.lineTo(radius * 0.45, 0);
  ctx.stroke();

  ctx.restore();
}

/**
 * Main Skin Renderer for John Wick ("The Baba Yaga")
 */
export function drawJohnWickSkin(ctx, fighter) {
  const r = fighter.r || 25;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 360° Tactical Roll Spin (Forward = Clockwise, Backward = Counter-Clockwise)
  const isRolling = Boolean(fighter.isRolling && fighter.rollTimer > 0);
  if (isRolling) {
    const rollMax = fighter.rollMaxTimer || 20;
    const rollProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.rollTimer / rollMax)));
    const spinSign = fighter.isRollingBack ? -1 : 1;
    const spinAngle = spinSign * (Math.PI * 2 * rollProgress);
    ctx.rotate(spinAngle);
  }

  // 2. Animation & Punch/Gun-Fu Extension Progress
  const isMatchEnded = (typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd')) || Boolean(fighter._isWinnerReveal);
  const isPunching = !isMatchEnded && Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const isPencilStabbing = !isMatchEnded && Boolean(fighter.pencilAttackTimer && fighter.pencilAttackTimer > 0);

  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchMaxTime || 14;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  } else if (isPencilStabbing) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.john_wick) ? CONFIG.john_wick : {};
    const maxT = fighter.pencilMaxTime || cfg.cqcPencilStabDuration || 36;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.pencilAttackTimer / maxT)));
  }

  const easePunch = isPunching ? Math.sin(rawProgress * Math.PI) : 0;
  const lungeExtension = easePunch * (r * 1.15);

  // Hand Position Coordinates (CAR stance / CQC grapple / Pencil Assassination)
  let frontX = r * 0.88, frontY = -r * 0.08;
  let backX = r * 0.72, backY = r * 0.12;
  let hideFrontHand = false;
  let hideBackHand = false;

  if (isPencilStabbing) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.john_wick) ? CONFIG.john_wick : {};
    const windupF = cfg.cqcPencilWindupFrames ?? 14;
    const thrustF = cfg.cqcPencilThrustFrames ?? 8;
    const pullbackF = cfg.cqcPencilPullbackFrames ?? 14;
    const totalF = fighter.pencilMaxTime || cfg.cqcPencilStabDuration || (windupF + thrustF + pullbackF);

    const windupRatio = Math.min(0.85, Math.max(0.1, windupF / totalF));
    const thrustRatio = Math.min(0.95, Math.max(windupRatio + 0.05, (windupF + thrustF) / totalF));

    if (rawProgress < windupRatio) {
      // 1. Chamber / Pullback Phase: Smoothly retract arm & hand back to chest
      const chamberT = rawProgress / windupRatio;
      const easeChamber = (1 - Math.cos(chamberT * Math.PI)) * 0.5; // Smooth ease-in-out
      frontX = r * (0.88 - 0.45 * easeChamber); // Retracts to r * 0.43
      frontY = -r * (0.08 + 0.06 * easeChamber);
      backX = r * (0.45 + 0.05 * easeChamber);
      backY = r * 0.16;
    } else if (rawProgress < thrustRatio) {
      // 2. Explosive Forward Stab Phase: Plunges front hand straight forward deep into target
      const thrustT = (rawProgress - windupRatio) / (thrustRatio - windupRatio);
      const easeThrust = 1 - Math.pow(1 - thrustT, 3); // Snappy ease-out cubic
      frontX = r * (0.43 + 1.42 * easeThrust); // Lunges forward to r * 1.85!
      frontY = -r * (0.14 - 0.08 * easeThrust);
      backX = r * 0.40;
      backY = r * 0.16;
    } else {
      // 3. Snappy Pullback Phase: Retracts hand cleanly back to guard position
      const pullT = (rawProgress - thrustRatio) / (1.0 - thrustRatio);
      const easePull = (1 - Math.cos(pullT * Math.PI)) * 0.5; // Smooth ease-in-out
      frontX = r * (1.85 - 0.97 * easePull); // Retracts back to r * 0.88
      frontY = -r * (0.06 + 0.02 * easePull);
      backX = r * 0.45;
      backY = r * 0.16;
    }
  } else if (isPunching) {
    if (fighter.punchAnimHand === 1) {
      // Punch 2: Cross hook with back hand
      frontX = r * 0.70 - lungeExtension * 0.2;
      frontY = -r * 0.08;
      backX = r * 0.90 + lungeExtension * 1.4;
      backY = r * 0.12 - Math.sin(rawProgress * Math.PI) * (r * 0.15);
    } else {
      // Punch 1: Lead punch with front hand
      frontX = r * 0.90 + lungeExtension * 1.4;
      frontY = Math.sin(rawProgress * Math.PI) * (r * 0.15);
      backX = r * 0.65 - lungeExtension * 0.2;
      backY = r * 0.15;
    }
  } else if (fighter.currentEquippedWeapon === 'shotgun') {
    // Two-handed Tactical Shotgun: hide generic hand circles during aiming/firing
    const isShotgunReloading = Boolean(fighter.isReloading && fighter.reloadTimer > 0);
    if (!isShotgunReloading) {
      hideFrontHand = true;
      hideBackHand = true;
    } else {
      hideBackHand = true;
      const relMax = fighter.reloadMaxTime || 96;
      const relP = 1.0 - (fighter.reloadTimer / relMax);
      if (relP > 0.88) {
        hideFrontHand = true; // Shell loading finished
      } else {
        // Hand brings shells up into undercarriage port 1-by-1
        const cycleP = (relP * 6) % 1.0;
        const feedOffset = -Math.sin(cycleP * Math.PI) * (r * 0.24);
        frontX = r * 0.96 + feedOffset;
        frontY = r * 0.10 - Math.sin(cycleP * Math.PI) * (r * 0.08);
      }
    }
  } else if (fighter.currentEquippedWeapon === 'rifle') {
    // Two-handed M4 Rifle: hide generic hand circles during aiming/firing so no skin overlay glitches on rifle
    const isRifleReloading = Boolean(fighter.isReloading && fighter.reloadTimer > 0);
    if (!isRifleReloading) {
      hideFrontHand = true;
      hideBackHand = true;
    } else {
      hideBackHand = true;
      const relMax = fighter.reloadMaxTime || 85;
      const relP = 1.0 - (fighter.reloadTimer / relMax);
      if (relP < 0.28) {
        // Phase 1: Hand pulls empty magazine down out of magwell
        const p1 = relP / 0.28;
        frontX = r * 0.95 - p1 * (r * 0.12);
        frontY = r * 0.22 + p1 * (r * 0.50);
      } else if (relP < 0.55) {
        // Phase 2: Magazine dropped! Hand reaches to vest pouch for fresh mag
        const p2 = (relP - 0.28) / 0.27;
        frontX = r * 0.55;
        frontY = r * 0.72 - Math.sin(p2 * Math.PI) * (r * 0.12);
      } else if (relP < 0.85) {
        // Phase 3: Hand guides fresh magazine UP into the magwell
        const p3 = (relP - 0.55) / 0.30;
        frontX = r * 0.82 + p3 * (r * 0.13);
        frontY = r * 0.72 - p3 * (r * 0.50);
      } else {
        // Phase 4: Magazine locked, hide hand
        hideFrontHand = true;
      }
    }
  } else {
    // Default Pistol CAR Stance with Recoil
    const recoilKick = (fighter.recoilOffset || 0) * 0.60;
    frontX = r * 0.88 - recoilKick;
    frontY = -r * 0.08;
    backX = r * 0.72 - recoilKick;
    backY = r * 0.12;
  }

  const isChampScreen = (typeof isChampionScreenActive === 'function' && isChampionScreenActive()) || Boolean(fighter._isWinnerReveal);
  const hideHandsAndWeapon = isChampScreen || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || isRolling;
  if (hideHandsAndWeapon || fighter.hideFrontHand) hideFrontHand = true;
  if (hideHandsAndWeapon || fighter.hideBackHand) hideBackHand = true;
  const handRadius = getHandSize(7.2);
  const skinColor = '#F4CBB2';

  // ── LAYER 1: BACK HAND (Behind Body Layer) ──
  if (!hideBackHand) {
    _drawWickHand(ctx, backX, backY, handRadius * 0.92, skinColor);
  }

  // ── EVADE BUFF / ROLL INTANGIBILITY AFTERIMAGE GHOSTS ──
  const isEvading = Boolean(fighter.isRolling || (fighter.evadeBuffTimer && fighter.evadeBuffTimer > 0));
  if (isEvading) {
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
    ctx.beginPath();
    ctx.arc(-10, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-20, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Slightly translucent intangibility body
    ctx.globalAlpha = 0.78;
  }

  // ── LAYER 2: MAIN BODY CIRCLE (PNG Model with Procedural Fallback) ──
  const wickImg = _getJohnWickImage();
  if (wickImg && wickImg.complete && wickImg.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    // Scale up slightly (1.075x) to compensate for transparent margins in the PNG
    const scaleFactor = 1.075;
    const drawR = r * scaleFactor;
    ctx.drawImage(wickImg, -drawR, -drawR, drawR * 2, drawR * 2);
    ctx.restore();
  } else {
    // Procedural Fallback
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

  // ── A. Base Skin Fill ──
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // ── B. 3D Body Shading (Rule 11: Zero shadowBlur - Cached Gradient) ──
  ctx.fillStyle = _getBodyGrad(ctx, r);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // ── C. TORSO & BESPOKE BLACK CONTINENTAL SUIT (+Y Bottom Hemisphere) ──
  const suitBlack   = '#141518';       // Deep Tactical Black
  const suitLapel   = '#222428';       // Satin Lapel Charcoal Tone
  const suitSeam    = '#0A0B0D';       // Dark Seam Lines
  const shirtWhite  = '#F8FAFC';      // Crisp White Dress Shirt
  const shirtShade  = '#CBD5E1';      // Shirt Fold Shadow
  const tieCharcoal = '#1B1D20';     // Dark Charcoal Tie Base
  const tieBorder   = '#0A0B0D';     // Tie Edge Outline

  // 1. Black Suit Jacket Base (+Y)
  ctx.fillStyle = suitBlack;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.26);
  ctx.lineTo(r, r * 0.26);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  // 2. White Dress Shirt V-Neck Chest Opening
  ctx.fillStyle = shirtWhite;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, r * 0.26);
  ctx.lineTo(r * 0.32, r * 0.26);
  ctx.lineTo(0, r * 0.78);
  ctx.closePath();
  ctx.fill();

  // Shirt fold shadows
  ctx.strokeStyle = shirtShade;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.09, r * 0.42);
  ctx.lineTo(-r * 0.05, r * 0.60);
  ctx.moveTo(r * 0.09, r * 0.42);
  ctx.lineTo(r * 0.05, r * 0.60);
  ctx.stroke();

  // 3. Exposed Throat Skin (Above Shirt Collar)
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.moveTo(-r * 0.22, r * 0.20);
  ctx.lineTo(r * 0.22, r * 0.20);
  ctx.lineTo(r * 0.14, r * 0.32);
  ctx.lineTo(-r * 0.14, r * 0.32);
  ctx.closePath();
  ctx.fill();

  // Throat shadow
  ctx.fillStyle = 'rgba(160, 80, 50, 0.28)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.14, r * 0.22);
  ctx.lineTo(r * 0.14, r * 0.22);
  ctx.lineTo(0, r * 0.30);
  ctx.closePath();
  ctx.fill();

  // 4. Charcoal Silk Necktie
  ctx.fillStyle = tieCharcoal;
  ctx.strokeStyle = tieBorder;
  ctx.lineWidth = 1.2;

  // Tie Knot
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, r * 0.30);
  ctx.lineTo(r * 0.08, r * 0.30);
  ctx.lineTo(r * 0.06, r * 0.44);
  ctx.lineTo(-r * 0.06, r * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hanging Tie Blade
  ctx.beginPath();
  ctx.moveTo(-r * 0.06, r * 0.44);
  ctx.lineTo(r * 0.06, r * 0.44);
  ctx.lineTo(r * 0.09, r * 0.88);
  ctx.lineTo(0, r * 1.02);
  ctx.lineTo(-r * 0.09, r * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. White Shirt Collar Wings
  ctx.fillStyle = shirtWhite;
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.2;

  // Left Collar Wing
  ctx.beginPath();
  ctx.moveTo(-r * 0.30, r * 0.24);
  ctx.lineTo(-r * 0.08, r * 0.40);
  ctx.lineTo(-r * 0.14, r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Collar Wing
  ctx.beginPath();
  ctx.moveTo(r * 0.30, r * 0.24);
  ctx.lineTo(r * 0.08, r * 0.40);
  ctx.lineTo(r * 0.14, r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 6. Suit Jacket Lapels (Sharp Tailored Satin Lapels)
  ctx.fillStyle = suitLapel;
  ctx.strokeStyle = suitSeam;
  ctx.lineWidth = 1.3;

  // Left Lapel
  ctx.beginPath();
  ctx.moveTo(-r * 0.72, r * 0.26);
  ctx.lineTo(-r * 0.12, r * 0.74);
  ctx.lineTo(-r * 0.24, r * 0.84);
  ctx.lineTo(-r * 0.80, r * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right Lapel
  ctx.beginPath();
  ctx.moveTo(r * 0.72, r * 0.26);
  ctx.lineTo(r * 0.12, r * 0.74);
  ctx.lineTo(r * 0.24, r * 0.84);
  ctx.lineTo(r * 0.78, r * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center button seam & button
  ctx.strokeStyle = suitSeam;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.74);
  ctx.lineTo(0, r * 1.0);
  ctx.stroke();

  ctx.fillStyle = '#0F1012';
  ctx.beginPath();
  ctx.arc(0, r * 0.84, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // ── D. FACIAL DETAILS: MUSTACHE, SOUL PATCH, AND CHIN BEARD (Scaled & Proportionate) ──
  const hairDark = '#141210';       // Deep Black Base Hair Fill
  const hairInk  = '#0A0908';       // Bold Black Outline Stroke
  const beardAccent = '#2D2723';    // Hair Texture Line Highlight

  // 1. CHIN & JAW BEARD (Fits cleanly on face, ending at chin line y = r * 0.27, never overlaying suit!)
  ctx.fillStyle = hairDark;
  ctx.strokeStyle = hairInk;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // Start at left cheek / sideburn junction
  ctx.moveTo(-r * 0.50, -r * 0.04);
  // Outer jaw curve down to left chin
  ctx.quadraticCurveTo(-r * 0.42, r * 0.14, -r * 0.26, r * 0.25);
  // Chin bottom curve (smooth rounded chin strap ending at y = r * 0.27)
  ctx.quadraticCurveTo(0, r * 0.27, r * 0.26, r * 0.25);
  // Outer jaw curve up to right cheek
  ctx.quadraticCurveTo(r * 0.42, r * 0.14, r * 0.50, -r * 0.04);

  // Inner boundary (top edge dipping under mouth and soul patch)
  ctx.quadraticCurveTo(r * 0.28, r * 0.08, r * 0.18, r * 0.11);
  ctx.quadraticCurveTo(r * 0.08, r * 0.18, 0, r * 0.18); // Under soul patch
  ctx.quadraticCurveTo(-r * 0.08, r * 0.18, -r * 0.18, r * 0.11);
  ctx.quadraticCurveTo(-r * 0.28, r * 0.08, -r * 0.50, -r * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Interior Chin Beard Flow / Texture Lines
  ctx.strokeStyle = beardAccent;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  // Left chin beard contour
  ctx.moveTo(-r * 0.32, r * 0.10);
  ctx.quadraticCurveTo(-r * 0.26, r * 0.20, -r * 0.12, r * 0.24);
  // Right chin beard contour
  ctx.moveTo(r * 0.32, r * 0.10);
  ctx.quadraticCurveTo(r * 0.26, r * 0.20, r * 0.12, r * 0.24);
  // Center chin contour
  ctx.moveTo(-r * 0.10, r * 0.24);
  ctx.quadraticCurveTo(0, r * 0.26, r * 0.10, r * 0.24);
  ctx.stroke();

  // 2. SOUL PATCH (Curved Patch right under lower lip)
  ctx.fillStyle = hairDark;
  ctx.strokeStyle = hairInk;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.05, r * 0.10);
  ctx.quadraticCurveTo(0, r * 0.08, r * 0.05, r * 0.10);
  ctx.quadraticCurveTo(r * 0.04, r * 0.16, 0, r * 0.17);
  ctx.quadraticCurveTo(-r * 0.04, r * 0.16, -r * 0.05, r * 0.10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. ICONIC CURVED MUSTACHE
  ctx.fillStyle = hairDark;
  ctx.strokeStyle = hairInk;
  ctx.lineWidth = 1.3;

  ctx.beginPath();
  // Upper lip center-top origin
  ctx.moveTo(0, -r * 0.02);
  // Right wing top edge
  ctx.quadraticCurveTo(r * 0.12, -r * 0.05, r * 0.22, r * 0.04);
  ctx.quadraticCurveTo(r * 0.25, r * 0.08, r * 0.21, r * 0.11);
  // Right wing bottom edge
  ctx.quadraticCurveTo(r * 0.13, r * 0.05, r * 0.05, r * 0.05);
  // Center bottom gap
  ctx.lineTo(0, r * 0.03);
  // Left wing bottom edge
  ctx.lineTo(-r * 0.05, r * 0.05);
  ctx.quadraticCurveTo(-r * 0.13, r * 0.05, -r * 0.21, r * 0.11);
  ctx.quadraticCurveTo(-r * 0.25, r * 0.08, -r * 0.22, r * 0.04);
  // Left wing top edge
  ctx.quadraticCurveTo(-r * 0.12, -r * 0.05, 0, -r * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Mustache Texture Accent Lines
  ctx.strokeStyle = beardAccent;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.06, r * 0.01);
  ctx.quadraticCurveTo(-r * 0.14, 0, -r * 0.20, r * 0.08);
  ctx.moveTo(r * 0.06, r * 0.01);
  ctx.quadraticCurveTo(r * 0.14, 0, r * 0.20, r * 0.08);
  ctx.stroke();

  // 4. Subtle Battle Scratch (Diagonal cut on cheek)
  ctx.strokeStyle = 'rgba(195, 45, 35, 0.75)';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.28, -r * 0.12);
  ctx.lineTo(r * 0.38, 0.02);
  ctx.stroke();

  // ── E. JOHN WICK CENTER-PARTED HAIR (Matching Reference Image 1) ──
  // Reference: Thick black hair with center V-parting, double-arched forehead windows,
  // and sleek dark gray highlight arcs along the crown.

  const hairHighlight = '#443A34';  // Volumetric Crown Sheen
  const hairHighlight2 = '#5C4E46'; // Secondary Sheen Accent

  // Helper to trace the smooth double-arched M-parting hairline
  const traceHairline = (pathCtx) => {
    // 1. Start at left suit collar junction (hair cascades down the left flank)
    pathCtx.moveTo(-r, r * 0.18);

    // 2. Left side lock: sweeps up inner cheek line
    pathCtx.quadraticCurveTo(-r * 0.78, -r * 0.05, -r * 0.68, -r * 0.20);

    // 3. Left forehead window arch (sweeping up over left brow, then down to center part)
    pathCtx.quadraticCurveTo(-r * 0.42, -r * 0.58, -r * 0.05, -r * 0.44);

    // 4. Center V-part valley
    pathCtx.lineTo(0, -r * 0.42);
    pathCtx.lineTo(r * 0.05, -r * 0.44);

    // 5. Right forehead window arch (sweeping up over right brow, then down to temple)
    pathCtx.quadraticCurveTo(r * 0.42, -r * 0.58, r * 0.68, -r * 0.20);

    // 6. Right side lock: sweeps down inner cheek line to right suit collar junction
    pathCtx.quadraticCurveTo(r * 0.78, -r * 0.05, r, r * 0.18);
  };

  // ── 1. FILL SOLID VOLUMETRIC HAIR MESH ──
  ctx.fillStyle = hairDark;
  ctx.beginPath();
  traceHairline(ctx);
  // Close through top dome
  ctx.lineTo(r, -r);
  ctx.lineTo(-r, -r);
  ctx.closePath();
  ctx.fill();

  // ── 2. STROKE ONLY THE EXPOSED HAIRLINE (Crisp, Clean & Symmetrical as in Image 1) ──
  ctx.strokeStyle = hairInk;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  traceHairline(ctx);
  ctx.stroke();

  // ── 3. INTERNAL HAIR FLOW CONTOURS (STRICTLY INSIDE HAIR MASS) ──
  ctx.strokeStyle = beardAccent;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';

  // Left sweep from center part over left brow
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.48);
  ctx.quadraticCurveTo(-r * 0.32, -r * 0.58, -r * 0.76, -r * 0.26);
  ctx.stroke();

  // Right sweep from center part over right brow
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.48);
  ctx.quadraticCurveTo(r * 0.32, -r * 0.58, r * 0.76, -r * 0.26);
  ctx.stroke();

  // Left crown outer flow
  ctx.beginPath();
  ctx.moveTo(-r * 0.20, -r * 0.75);
  ctx.bezierCurveTo(-r * 0.60, -r * 0.65, -r * 0.85, -r * 0.35, -r * 0.92, r * 0.04);
  ctx.stroke();

  // Right crown outer flow
  ctx.beginPath();
  ctx.moveTo(r * 0.20, -r * 0.75);
  ctx.bezierCurveTo(r * 0.60, -r * 0.65, r * 0.85, -r * 0.35, r * 0.92, r * 0.04);
  ctx.stroke();

  // ── 4. CROWN HIGHLIGHT SHEENS ALONG ARCH CRESTS (Matching Image 1) ──
  ctx.strokeStyle = hairHighlight;
  ctx.lineWidth = 1.6;

  // Left crest highlight
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, -r * 0.78);
  ctx.bezierCurveTo(-r * 0.38, -r * 0.72, -r * 0.60, -r * 0.52, -r * 0.72, -r * 0.30);
  ctx.stroke();

  // Right crest highlight
  ctx.beginPath();
  ctx.moveTo(r * 0.15, -r * 0.78);
  ctx.bezierCurveTo(r * 0.38, -r * 0.72, r * 0.60, -r * 0.52, r * 0.72, -r * 0.30);
  ctx.stroke();

  // Secondary brighter crown sheen
  ctx.strokeStyle = hairHighlight2;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.20, -r * 0.70);
  ctx.quadraticCurveTo(-r * 0.45, -r * 0.64, -r * 0.60, -r * 0.44);
  ctx.moveTo(r * 0.20, -r * 0.70);
  ctx.quadraticCurveTo(r * 0.45, -r * 0.64, r * 0.60, -r * 0.44);
  ctx.stroke();

  ctx.restore(); // Undo circle clipping
  }

  // ── PASSIVE 1: BALLISTIC TAILORED SUIT (Kevlar Weave Shimmer Overlay) ──
  if (fighter.suitShimmerTimer > 0) {
    const shimmerP = fighter.suitShimmerTimer / 14;
    const shimmerAlpha = Math.sin(shimmerP * Math.PI) * 0.70;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
    ctx.clip();

    // High-tech Kevlar carbon-fiber weave grid
    ctx.strokeStyle = `rgba(148, 163, 184, ${0.45 * shimmerAlpha})`;
    ctx.lineWidth = 1.0;
    const gridStep = 4.5;
    for (let gx = -r; gx <= r; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, -r);
      ctx.lineTo(gx, r);
      ctx.stroke();
    }
    for (let gy = -r; gy <= r; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(-r, gy);
      ctx.lineTo(r, gy);
      ctx.stroke();
    }

    // Outer Kevlar deflection shield rim
    ctx.strokeStyle = `rgba(203, 213, 225, ${0.90 * shimmerAlpha})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // ── LAYER 4: FRONT HAND (Front Layer — On Top of Body) ──
  if (!hideFrontHand) {
    _drawWickHand(ctx, frontX, frontY, handRadius, skinColor);
  }

  // Status Overlays (Stun, Slow, Bleed, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

