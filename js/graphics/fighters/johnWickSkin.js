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

// Pre-seeded static particle array for aura motes (Zero GC allocation per frame)
const _WICK_AURA_MOTES = Array.from({ length: 14 }, (_, i) => ({
  speed: 0.6 + (i % 5) * 0.25,
  phase: (i * 0.45) % (Math.PI * 2),
  radiusMul: 1.05 + ((i * 17) % 70) * 0.01,
  size: 1.4 + ((i * 13) % 20) * 0.1,
  isGold: i % 4 === 0
}));

/**
 * Draws John Wick's Emanating Black-Gray Assassin Aura during Ultimate Mode (Excommunicado / M4 Rifle)
 * Rule 11 & Rule 16 Compliant: Zero shadowBlur, purely geometric & gradient based.
 */
export function drawJohnWickExcommunicadoAura(ctx, r, isForeground = false) {
  const now = Date.now();
  const time = now * 0.0032;

  ctx.save();

  if (!isForeground) {
    // ── 1. DEEP GROUND SHADOW / VOID VORTEX (Rule 11: Radial Gradient) ──
    const groundGrad = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, r * 2.35);
    groundGrad.addColorStop(0,    'rgba(5, 5, 8, 0.82)');
    groundGrad.addColorStop(0.30, 'rgba(23, 28, 38, 0.58)');
    groundGrad.addColorStop(0.65, 'rgba(51, 65, 85, 0.28)');
    groundGrad.addColorStop(1,    'rgba(0, 0, 0, 0)');
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.35, 0, Math.PI * 2);
    ctx.fill();

    // ── 2. CONCENTRIC EXPANDING DARK CORONA SHOCKWAVES ──
    for (let w = 0; w < 2; w++) {
      const waveProgress = ((time * 0.55 + w * 0.50) % 1.0);
      const waveR = r * (1.05 + waveProgress * 0.85);
      const waveAlpha = (1.0 - waveProgress) * 0.45;
      ctx.strokeStyle = `rgba(30, 41, 59, ${waveAlpha.toFixed(3)})`;
      ctx.lineWidth = 2.4 * (1.0 - waveProgress * 0.55);
      ctx.beginPath();
      ctx.arc(0, 0, waveR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── 3. EMANATING DARK FLAME & SMOKE TENDRILS (18 Organic Petals) ──
    const tendrilCount = 18;
    for (let i = 0; i < tendrilCount; i++) {
      const baseA = (i / tendrilCount) * Math.PI * 2;
      const wobble = Math.sin(time * 2.8 + i * 1.4) * 0.14;
      const angle = baseA + wobble;
      const len = r * (1.28 + Math.sin(time * 3.4 + i * 2.2) * 0.34);
      const halfWidth = 0.18;

      const tipX = Math.cos(angle) * len;
      const tipY = Math.sin(angle) * len;
      const leftX = Math.cos(baseA - halfWidth) * (r * 0.95);
      const leftY = Math.sin(baseA - halfWidth) * (r * 0.95);
      const rightX = Math.cos(baseA + halfWidth) * (r * 0.95);
      const rightY = Math.sin(baseA + halfWidth) * (r * 0.95);
      const midCtrlX = Math.cos(angle + 0.10) * (len * 0.62);
      const midCtrlY = Math.sin(angle + 0.10) * (len * 0.62);

      let color = 'rgba(10, 12, 16, 0.84)'; // Deep ink black
      if (i % 3 === 1) color = 'rgba(51, 65, 85, 0.68)'; // Steel charcoal gray
      else if (i % 3 === 2) color = 'rgba(30, 41, 59, 0.55)'; // Cold slate smoke

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(leftX, leftY);
      ctx.quadraticCurveTo(midCtrlX, midCtrlY, tipX, tipY);
      ctx.quadraticCurveTo(midCtrlX * 0.85, midCtrlY * 0.85, rightX, rightY);
      ctx.closePath();
      ctx.fill();
    }

    // ── 4. ORBITING ASH & SHADOW MOTES ──
    for (let m = 0; m < _WICK_AURA_MOTES.length; m++) {
      const mote = _WICK_AURA_MOTES[m];
      const motA = (time * mote.speed + mote.phase) % (Math.PI * 2);
      const motDist = r * (mote.radiusMul + Math.sin(time * 2.2 + mote.phase) * 0.22);
      const mx = Math.cos(motA) * motDist;
      const my = Math.sin(motA) * motDist;

      if (mote.isGold) {
        ctx.fillStyle = 'rgba(217, 119, 6, 0.70)'; // Faint Continental Gold speck
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.65)'; // Slate silver ash mote
      }

      ctx.beginPath();
      ctx.arc(mx, my, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // ── FOREGROUND RIM & VOLUMETRIC SMOKE WHISPERS ──
    // Subtle pulsating charcoal-silver rim around John Wick's circumference
    const rimPulse = 0.55 + Math.sin(time * 4.0) * 0.25;
    ctx.strokeStyle = `rgba(148, 163, 184, ${rimPulse.toFixed(3)})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, r + 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Frontal smoke wisps crossing over body
    for (let f = 0; f < 4; f++) {
      const fAngle = (time * 1.8 + f * 1.57) % (Math.PI * 2);
      const fDist = r * (0.45 + Math.sin(time * 2.5 + f) * 0.35);
      const fx = Math.cos(fAngle) * fDist;
      const fy = Math.sin(fAngle) * fDist;
      const fw = r * 0.32;

      ctx.fillStyle = (f % 2 === 0) ? 'rgba(15, 23, 42, 0.28)' : 'rgba(71, 85, 105, 0.22)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, fw, fw * 0.55, fAngle, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isPunching = !isPodiumPreview && Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const isPencilStabbing = !isPodiumPreview && Boolean(fighter.pencilAttackTimer && fighter.pencilAttackTimer > 0);

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

  const hideHandsAndWeapon = isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || isRolling;
  if (hideHandsAndWeapon || fighter.hideFrontHand) hideFrontHand = true;
  if (hideHandsAndWeapon || fighter.hideBackHand) hideBackHand = true;
  const handRadius = getHandSize(7.2);
  const skinColor = '#F4CBB2';

  // ── ULTIMATE MODE EMANATING BLACK-GRAY ASSASSIN AURA (Background Layer) ──
  const isUltimate = Boolean(
    fighter.isUltimateMode ||
    fighter.isExcommunicado ||
    fighter.currentEquippedWeapon === 'rifle' ||
    (fighter.cqcComboPhase === 'PENCIL_STAB')
  );

  if (isUltimate) {
    drawJohnWickExcommunicadoAura(ctx, r, false);
  }

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

  // ── ULTIMATE MODE EMANATING BLACK-GRAY ASSASSIN AURA (Foreground Whispers & Rim Glow) ──
  if (isUltimate) {
    drawJohnWickExcommunicadoAura(ctx, r, true);
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

