// ─────────────────────────────────────────────
// Kento Nanami Fighter Skin & Body Model
// Adhering to Rule 19 (Upright Front POV),
// Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state, isChampionScreenActive } from '../../core/state.js';
import { drawNanamiCleaver, drawNanamiCollapseShockwaves, drawNanamiBlackFlashActivationAura } from '../weapons/nanamiWeaponGraphics.js';
import { GojoRenderer } from './gojoRenderer.js';
import { isSuppressedByGetsuga } from '../../entities/fighter.js';

let _nanamiSkinImage = null;
let _nanamiSkinImageLoading = false;

export function _getNanamiSkinImage() {
  if (_nanamiSkinImage && _nanamiSkinImage.complete && _nanamiSkinImage.naturalWidth > 0) {
    return _nanamiSkinImage;
  }
  if (!_nanamiSkinImageLoading && typeof Image !== 'undefined') {
    _nanamiSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _nanamiSkinImage = img;
      _nanamiSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Nanami pixel skin image at Assets/model/Nanami-PIXEL-SKIN.png', e);
      _nanamiSkinImageLoading = false;
    };
    img.src = 'Assets/model/Nanami-PIXEL-SKIN.png?v=1';
    _nanamiSkinImage = img;
  }
  return _nanamiSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getNanamiSkinImage();
}

// Pre-computed normalized constants to eliminate per-frame GC allocations
const _TIE_SPLOTCHES = [
  { x: -0.04, y: 0.33, rx: 1.3, ry: 1.0 },
  { x:  0.05, y: 0.35, rx: 1.1, ry: 1.4 },
  { x:  0.00, y: 0.40, rx: 1.4, ry: 1.0 },
  { x: -0.04, y: 0.48, rx: 1.4, ry: 1.8 },
  { x:  0.04, y: 0.52, rx: 1.6, ry: 1.2 },
  { x: -0.06, y: 0.58, rx: 1.2, ry: 1.5 },
  { x:  0.01, y: 0.61, rx: 1.5, ry: 1.3 },
  { x:  0.06, y: 0.66, rx: 1.3, ry: 1.6 },
  { x: -0.04, y: 0.72, rx: 1.7, ry: 1.3 },
  { x:  0.03, y: 0.77, rx: 1.4, ry: 1.5 },
  { x: -0.07, y: 0.82, rx: 1.3, ry: 1.2 },
  { x:  0.00, y: 0.85, rx: 1.6, ry: 1.4 },
  { x:  0.06, y: 0.89, rx: 1.2, ry: 1.3 },
  { x: -0.03, y: 0.94, rx: 1.4, ry: 1.2 },
  { x:  0.00, y: 1.00, rx: 1.1, ry: 1.1 }
];

const _BANGS_COORDS = [
  { nx:  1.00, ny: -0.15 },
  { nx:  0.75, ny: -0.28 },
  { nx:  0.55, ny: -0.35 },
  { nx:  0.35, ny: -0.48 },
  { nx:  0.18, ny: -0.25 },
  { nx:  0.00, ny: -0.38 },
  { nx: -0.22, ny: -0.22 },
  { nx: -0.42, ny: -0.34 },
  { nx: -0.65, ny: -0.18 },
  { nx: -0.85, ny: -0.26 },
  { nx: -1.00, ny: -0.15 }
];

/**
 * Draws Nanami's signature Golden-Amber JJK Cursed Energy Aura.
 * In standard mode: subtle golden CE flame bloom and animated wisps.
 * In Overtime (120%): grounded golden clockwork watch dial field, steady 12-hour indices with 18:00 Overtime mark, smooth rotating second-hand ray, and crackling lightning arcs!
 * Zero floating objects, zero pulsing scaling (Rule 11 compliant).
 */
export function drawNanamiCursedEnergyAura(ctx, fighter) {
  const r = fighter.r || 25;
  const isOvertime = Boolean(fighter.isOvertimeActive || ((fighter.hp / (fighter.maxHp || 420)) <= 0.40));
  
  if (fighter && fighter._isWinnerReveal) return;

  const auraAlpha = isOvertime ? 1.0 : (fighter.combatAuraOpacity || 0);
  if (auraAlpha <= 0.01) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();

  // 1. Draw JJK-Authentic Sakuga Cursed Energy Flame Aura (Electric Blue theme — matching Gojo, Yuji, and Todo)
  if (typeof GojoRenderer !== 'undefined' && typeof GojoRenderer._drawJJKCursedEnergyAura === 'function') {
    GojoRenderer._drawJJKCursedEnergyAura(ctx, fighter, 'blue', 0, 0, r);
  }

  // 2. Overtime 120% Grounded Clockwork Watch Dial Energy Field (Steady, Zero Pulsing)
  if (isOvertime) {
    ctx.globalAlpha = auraAlpha;
    const haloRadius = r * 1.55;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.70)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([10, 4, 3, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 12-Hour Watch Dial Radial Indices on the Ground (Steady)
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 - Math.PI / 2;
      const isOvertimeMark = (i === 6); // 18:00 (6 o'clock) Overtime Start Point
      const innerTick = isOvertimeMark ? haloRadius - 9 : haloRadius - 5;
      ctx.strokeStyle = isOvertimeMark ? '#EF4444' : 'rgba(255, 235, 120, 0.75)';
      ctx.lineWidth = isOvertimeMark ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * innerTick, Math.sin(a) * innerTick);
      ctx.lineTo(Math.cos(a) * (haloRadius + 1), Math.sin(a) * (haloRadius + 1));
      ctx.stroke();
    }

    // Live Sweeping Golden Clockwork Second Hand Ray (Smooth 360° Sweep)
    const sweepAngle = (now * 0.002) % (Math.PI * 2) - Math.PI / 2;
    const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, haloRadius);
    sweepGrad.addColorStop(0, 'rgba(255, 245, 160, 0.45)');
    sweepGrad.addColorStop(0.7, 'rgba(255, 215, 0, 0.28)');
    sweepGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0)');
    ctx.strokeStyle = sweepGrad;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweepAngle) * haloRadius, Math.sin(sweepAngle) * haloRadius);
    ctx.stroke();
    ctx.restore();

    // Inner Gold Boundary Ring (Steady)
    ctx.strokeStyle = 'rgba(255, 235, 120, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
    ctx.stroke();

    // Crackling Golden Cursed Energy Lightning Arcs (Steady)
    ctx.strokeStyle = 'rgba(255, 240, 150, 0.85)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const arcAng = (Math.PI / 2) * i + Math.sin(now * 0.008 + i) * 0.35;
      const startDist = r * 0.9;
      const endDist = r * 1.45;
      const midDist = (startDist + endDist) * 0.5;
      const perpOffset = (Math.sin(now * 0.02 + i * 3) - 0.5) * 10;

      const cosA = Math.cos(arcAng);
      const sinA = Math.sin(arcAng);
      const perpX = -sinA;
      const perpY = cosA;

      ctx.beginPath();
      ctx.moveTo(cosA * startDist, sinA * startDist);
      ctx.lineTo(cosA * midDist + perpX * perpOffset, sinA * midDist + perpY * perpOffset);
      ctx.lineTo(cosA * endDist, sinA * endDist);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Helper to draw a clenched fist with watch and skin tone (Pixel Art Edition)
 */
function _drawFist(ctx, x, y, radius, skinColor, fighter, isFrontHand = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const gridR = Math.max(P * 2, radius);
  const steps = Math.ceil(gridR / P);

  // 1. Wrist / Cuff base (Deep cerulean blue shirt cuff - Stepped Pixel Art)
  ctx.fillStyle = '#12243A';
  ctx.fillRect(-gridR * 0.9, -gridR * 0.85, gridR * 1.8, gridR * 0.65);
  ctx.fillStyle = '#2B5882';
  ctx.fillRect(-gridR * 0.8, -gridR * 0.75, gridR * 1.6, gridR * 0.45);

  // 2. Golden Wristwatch on the back hand (Stepped Pixel Art)
  if (!isFrontHand) {
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-gridR * 0.65, -gridR * 0.95, gridR * 1.3, gridR * 0.45);
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(-gridR * 0.55, -gridR * 0.85, gridR * 1.1, gridR * 0.25);
    // Watch Face Pixel
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(-P * 0.5, -gridR * 0.85, P, P);
  }

  // 3. Stepped Dark Outline Shell
  ctx.fillStyle = '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= gridR + P * 0.75) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 4. Stepped Inner Base Skin Tone
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

  // 5. Knuckle Depth Shading
  ctx.fillStyle = '#C49677';
  for (let gy = 0; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR && (gy * P > innerR * 0.35 || gx * P < -innerR * 0.45)) {
        ctx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // 6. Knuckle Specular Highlight Pixels
  ctx.fillStyle = '#FFF3E8';
  ctx.fillRect(P * 0.5, -innerR * 0.45, P, P);
  ctx.fillRect(P * 1.5, -innerR * 0.45, P, P);

  ctx.restore();
}

/**
 * Renders Nanami's dash afterimages at their recorded absolute world coordinates.
 */
export function drawNanamiAfterImages(ctx, fighter) {
  const isSuppressed = typeof fighter?.areAttackEffectsSuppressed === 'function' ? fighter.areAttackEffectsSuppressed() : isSuppressedByGetsuga(fighter);
  if (!fighter || !fighter.afterImages || fighter.afterImages.length === 0 || isSuppressed) return;
  const r = fighter.r || 25;

  ctx.save();
  for (let i = 0; i < fighter.afterImages.length; i++) {
    const ai = fighter.afterImages[i];
    if (!ai || ai.timer <= 0) continue;
    const progress = ai.timer / (ai.maxTimer || 14);
    const alpha = progress * 0.45;
    const angle = ai.gunAngle !== undefined ? ai.gunAngle : (ai.angle || 0);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ai.x, ai.y);
    ctx.rotate(angle);

    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) ctx.scale(1, -1);

    // 1. Golden Cursed Energy Ghost Silhouette
    ctx.beginPath();
    ctx.arc(0, 0, ai.r || r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 175, 55, 0.40)';
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 2. Suit jacket silhouette (+Y Bottom Hemisphere)
    ctx.fillStyle = 'rgba(226, 212, 183, 0.50)';
    ctx.beginPath();
    ctx.arc(0, 0, (ai.r || r) * 0.95, 0, Math.PI);
    ctx.fill();

    // 3. Blonde 7:3 hair silhouette (-Y Top Hemisphere)
    ctx.fillStyle = 'rgba(245, 224, 123, 0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, (ai.r || r) * 0.98, Math.PI, Math.PI * 2);
    ctx.fill();

    // 4. Ghost Cleaver Blade
    drawNanamiCleaver(ctx, 0, 0, 0, ai.r || r, false);

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Main Skin Renderer for Kento Nanami (7:3 Ratio Sorcerer)
 */
export function drawNanamiSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isOvertime = fighter.isOvertimeActive || ((fighter.hp / (fighter.maxHp || 420)) <= 0.40);
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  // 0. Render dash afterimages & collapse ground shockwaves in absolute world space
  drawNanamiAfterImages(ctx, fighter);
  drawNanamiCollapseShockwaves(ctx, fighter);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Draw JJK Cursed Energy Aura when in close combat or Overtime
  // Delegates all alpha/gating logic to drawNanamiCursedEnergyAura itself.
  if (!fighter._isWinnerReveal) {
    drawNanamiCursedEnergyAura(ctx, fighter);
  }

  // 2. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Melee Chop, Punch & Collapse Animation Progress (Continuous Smooth Curve)
  const isCollapsing = Boolean(fighter.isCollapsing || (fighter.collapseTimer && fighter.collapseTimer > 0));
  const isPunching = !isPodiumPreview && (fighter.punchAnimTimer > 0 || fighter.slashSwingTimer > 0 || isCollapsing);
  let rawProgress = 0;
  if (isCollapsing) {
    const maxT = fighter.collapseMaxTimer || 14;
    const curTimer = fighter.collapseTimer || 0;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxT)));
  } else if (isPunching) {
    const maxT = fighter.slashSwingMaxTimer || fighter.punchMaxTime || 18;
    const curTimer = fighter.slashSwingTimer > 0 ? fighter.slashSwingTimer : fighter.punchAnimTimer;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxT)));
  }

  // Smooth continuous bell-curve thrust
  const easeChop = isPunching ? Math.pow(Math.sin(rawProgress * Math.PI), 1.25) : 0;
  const lungeExtension = easeChop * (r * 0.95);

  // Hand Position Coordinates (Rule 19 / 20)
  let frontX = r * 0.95, frontY = 0;
  let backX = r * 0.70, backY = 0;
  let hideBackHand = true;

  const isBlitzing = Boolean(fighter.isBlitzing);
  const blitzIndex = isBlitzing ? (fighter.blitzStrikeIndex || 0) : 0;
  const isFinalBlitz = isBlitzing && (blitzIndex === ((fighter.blitzMaxStrikes || 4) - 1));

  if (isCollapsing) {
    hideBackHand = false; // Show 2-handed grip for structural ground slam!
    if (rawProgress < 0.45) {
      // Windup: Rear back high overhead with both hands
      const windupP = rawProgress / 0.45;
      const easeWindup = Math.sin(windupP * (Math.PI / 2));
      frontX = r * 0.50 - easeWindup * (r * 0.30);
      frontY = -r * 0.45 * easeWindup;
      backX = frontX - 13;
      backY = frontY + 3;
    } else {
      // Ground Slam: Drive cleaver down into the floor with 2 hands
      const slamP = (rawProgress - 0.45) / 0.55;
      const easeSlam = Math.pow(slamP, 1.8);
      frontX = r * 0.50 + easeSlam * (r * 0.85);
      frontY = -r * 0.45 + easeSlam * (r * 0.80);
      backX = frontX - 13;
      backY = frontY + 3;
    }
  } else if (isBlitzing) {
    if (isFinalBlitz) {
      hideBackHand = false; // 2-handed grip for execution finisher!
    }
    const t = Math.min(1.0, rawProgress / 0.45);
    const snapP = t * t * (3 - 2 * t);
    const extendBonus = isFinalBlitz ? 1.25 : 1.0;
    frontX = r * 0.95 + snapP * (r * 0.70 * extendBonus);
    frontY = -r * 0.20 + snapP * (r * 0.38);
    if (!hideBackHand) {
      backX = frontX - 13;
      backY = frontY + 3;
    }
  } else if (isPunching) {
    frontX = r * 0.95 + lungeExtension;
    frontY = Math.sin(rawProgress * Math.PI) * (r * 0.20);
  } else {
    // Idle stance: Front hand at the right edge of his body circle
    frontX = r * 0.95;
    frontY = 0;
  }

  const hideHandsAndWeapon = isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = hideHandsAndWeapon || fighter.hideFrontHand;
  const handRadius = getHandSize(7.5);
  const skinColor = '#F3CBB0';

  // ── LAYER 1: BACK HAND (Visible for 2-handed Collapse ground slam) ──
  if (!hideHandsAndWeapon && !hideBackHand && !hideFrontHand) {
    _drawFist(ctx, backX, backY, handRadius * 0.95, skinColor, fighter, false);
  }

  // ── LAYER 2: BODY CIRCLE (Authentic Procedural Pixel Art) ──
  drawNanamiPixelBody(ctx, r, isOvertime);

  // Status overlays (stun, freeze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }
  if (!hideHandsAndWeapon && !hideFrontHand) {
    // 1. Draw Nanami's Wrapped Blunt Cleaver
    const swingActive = isPunching;
    const swingTimer = fighter.slashSwingTimer > 0 ? fighter.slashSwingTimer : fighter.punchAnimTimer;
    drawNanamiCleaver(ctx, frontX, frontY, 0, r, swingActive, swingTimer, rawProgress, {
      isRatioCharged: (fighter.ratioCritCharge || 0) > 0,
      isOvertime: isOvertime,
      isCollapseSlam: isCollapsing,
      isBlitzing: isBlitzing,
      blitzStrikeIndex: blitzIndex
    });

    // 2. Draw Front Hand with watch and natural skin tone gripping the handle
    _drawFist(ctx, frontX, frontY, handRadius, skinColor, fighter, false);
  }

  ctx.restore(); // End main transform
}

/**
 * Draws Kento Nanami's entire body circle model in authentic Pixel Art Style.
 * Uses discrete stepped pixel grid rasterization matching Saitama, Ichigo, and Yuji.
 * Minimalist circle brawler aesthetic, upright front POV, faceless (Rule #19 compliant).
 */
export function drawNanamiPixelBody(ctx, r, isOvertime = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // 7:3 Signature Side-Part Hairline calculation
  function getHairlineY(rx) {
    const nx = rx / r; // -1 to +1
    if (nx > 0.35) {
      return -r * 0.42 + (nx - 0.35) * r * 0.45;
    } else {
      const sweep = Math.sin((nx + 0.65) * 1.8) * 0.28;
      const wave = Math.abs(Math.sin((nx - 0.35) * Math.PI * 2.2)) * 0.12;
      return -r * 0.42 + (sweep + wave) * r;
    }
  }

  // Predefined tie splotch coordinates
  const tieSpots = [
    { x: 0.0, y: 0.34, r: 0.035 },
    { x: -0.04, y: 0.48, r: 0.04 },
    { x: 0.03, y: 0.58, r: 0.045 },
    { x: -0.05, y: 0.68, r: 0.04 },
    { x: 0.04, y: 0.78, r: 0.045 },
    { x: -0.03, y: 0.88, r: 0.04 }
  ];

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // Pixelated Black Stroke Border
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const hairlineY = getHairlineY(rx);

      // Goggles Geometry (Center Y = -r * 0.04, Left X = -r * 0.30, Right X = +r * 0.30)
      const goggleY = -r * 0.04;
      const goggleLeftX = -r * 0.30;
      const goggleRightX = r * 0.30;
      const distLeft = Math.hypot(rx - goggleLeftX, ry - goggleY);
      const distRight = Math.hypot(rx - goggleRightX, ry - goggleY);
      const outerR = r * 0.26;
      const innerR = r * 0.18;

      const isLeftLens = distLeft <= innerR;
      const isRightLens = distRight <= innerR;
      const isLeftRim = distLeft <= outerR && distLeft > innerR;
      const isRightRim = distRight <= outerR && distRight > innerR;
      const isGoggleBridge = (ry >= goggleY - P * 1.5 && ry <= goggleY + P * 1.5 && Math.abs(rx) <= r * 0.16);
      const isSideShieldLeft = (Math.abs(ry - goggleY) <= outerR * 0.80 && rx <= -r * 0.30 && rx >= -r * 0.68);
      const isSideShieldRight = (Math.abs(ry - goggleY) <= outerR * 0.80 && rx >= r * 0.30 && rx <= r * 0.68);

      // ──────────────────────────────────────────
      // 1. GOGGLES OVERLAY (Top Priority Feature)
      // ──────────────────────────────────────────
      if (isLeftLens || isRightLens) {
        // Optical Chartreuse / Moss-Green Glass Lens
        const cx = isLeftLens ? goggleLeftX : goggleRightX;
        const dx = (rx - cx) / innerR;
        const dy = (ry - goggleY) / innerR;

        if (dx > 0.1 && dy < -0.1) {
          ctx.fillStyle = isOvertime ? '#FFFFFF' : '#E8FFB8';
        } else if (dx < -0.3 && dy > 0.3) {
          ctx.fillStyle = isOvertime ? '#A6F542' : '#95CC4E';
        } else {
          ctx.fillStyle = isOvertime ? '#82D61E' : '#6A9930';
        }
        ctx.fillRect(px, py, P, P);
      } else if (isLeftRim || isRightRim || isGoggleBridge || isSideShieldLeft || isSideShieldRight) {
        // Metallic Steel Frames / Temple Shields
        if (isGoggleBridge) {
          ctx.fillStyle = (ry < goggleY) ? '#D0DCE2' : '#6A7D88';
        } else if (Math.abs(rx) > r * 0.50 && Math.abs(ry - goggleY) <= P * 1.2) {
          ctx.fillStyle = '#1A2328';
        } else if (ry < goggleY - outerR * 0.5) {
          ctx.fillStyle = '#E2EBEF';
        } else if (ry > goggleY + outerR * 0.5) {
          ctx.fillStyle = '#4A5B64';
        } else {
          ctx.fillStyle = '#8B9CA6';
        }
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // 2. 7:3 BLONDE SIDE-PART HAIR (ry < hairlineY)
      // ──────────────────────────────────────────
      else if (ry < hairlineY) {
        let col = '#E5B25D';
        if (ry < -r * 0.70) {
          col = '#FDE68A';
        } else if (Math.abs(rx - r * 0.35) < P * 1.5 && ry < -r * 0.40) {
          col = '#FFF3B8';
        } else if (ry > hairlineY - P * 2.2) {
          col = '#B47B2A';
        } else if (Math.abs(rx) > r * 0.75) {
          col = '#C99342';
        }
        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // 3. WARM FAIR FACE SKIN (hairlineY <= ry < r * 0.18)
      // ──────────────────────────────────────────
      else if (ry < r * 0.18) {
        let col = '#F3CBB0';
        if (ry < hairlineY + P * 2.0) {
          col = '#DEAE90';
        } else if (Math.abs(rx) > r * 0.72 || ry > r * 0.10) {
          col = '#E2B294';
        }
        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // 4. SHIRT, SUSPENDERS & NECKTIE (ry >= r * 0.18)
      // ──────────────────────────────────────────
      else {
        // A. Neck Skin & Collar V-Opening
        const isNeckV = (ry <= r * 0.38 && Math.abs(rx) <= (1 - (ry - r * 0.18) / (r * 0.20)) * (r * 0.18));

        // B. Loosened Olive Necktie
        const isTieKnot = (ry >= r * 0.26 && ry <= r * 0.42 && Math.abs(rx) <= r * 0.10);
        const tieBladeHalfW = (r * 0.08 + (ry - r * 0.42) * 0.12);
        const isTieBlade = (ry >= r * 0.42 && ry <= r * 0.98 && Math.abs(rx) <= tieBladeHalfW);

        // C. Reddish-Brown Leather Suspenders (Left & Right)
        const isSuspenderLeft = (rx >= -r * 0.65 && rx <= -r * 0.46 && ry >= r * 0.18);
        const isSuspenderRight = (rx >= r * 0.46 && rx <= r * 0.65 && ry >= r * 0.18);

        // D. Shirt Collar Flaps & Buttons
        const isCollarLeft = (rx >= -r * 0.32 && rx <= -r * 0.12 && ry >= r * 0.18 && ry <= r * 0.36 && (rx - (-r * 0.32)) * 0.9 > (ry - r * 0.18));
        const isCollarRight = (rx >= r * 0.12 && rx <= r * 0.32 && ry >= r * 0.18 && ry <= r * 0.36 && (r * 0.32 - rx) * 0.9 > (ry - r * 0.18));

        let isSpot = false;
        if (isTieKnot || isTieBlade) {
          for (let s of tieSpots) {
            if (Math.hypot(rx - r * s.x, ry - r * s.y) <= r * s.r) {
              isSpot = true;
              break;
            }
          }
        }

        if (isSpot) {
          ctx.fillStyle = '#141618';
        } else if (isTieKnot || isTieBlade) {
          if (ry < r * 0.30) {
            ctx.fillStyle = '#BDB564';
          } else if (Math.abs(rx) > tieBladeHalfW - P * 1.2) {
            ctx.fillStyle = '#78702E';
          } else {
            ctx.fillStyle = '#9A924D';
          }
        } else if (isCollarLeft || isCollarRight) {
          if (Math.hypot(Math.abs(rx) - r * 0.22, ry - r * 0.26) <= P * 1.0) {
            ctx.fillStyle = '#E8EEF5';
          } else {
            ctx.fillStyle = '#244B74';
          }
        } else if (isNeckV) {
          ctx.fillStyle = (ry > r * 0.28) ? '#D49D7E' : '#E8BCA0';
        } else if (isSuspenderLeft || isSuspenderRight) {
          const suspX = isSuspenderLeft ? (rx - (-r * 0.55)) : (rx - (r * 0.55));
          if (Math.abs(suspX) < P * 0.8) {
            ctx.fillStyle = '#8F4830';
          } else if (Math.abs(suspX) > r * 0.08) {
            ctx.fillStyle = '#4A2114';
          } else {
            ctx.fillStyle = '#733722';
          }
        } else {
          // Deep Blue Cerulean Dress Shirt
          let col = '#2B5882';
          if (Math.abs(rx) > r * 0.72 || ry > r * 0.85) {
            col = '#1A3957';
          } else if (ry < r * 0.45 && Math.abs(rx) < r * 0.45) {
            col = '#346594';
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}
