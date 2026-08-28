// ─────────────────────────────────────────────
// URYU ISHIDA FIGHTER SKIN & BODY MODEL
// The Last Quincy & Sternritter "A" (Bleach)
// Adhering to Rule 19 (Upright Front POV),
// Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawUryuBow, drawSeeleSchneider } from '../weapons/uryuWeaponGraphics.js';

let _uryuBodyImage = null;
let _uryuBodyImageLoading = false;

export function _getUryuBodyImage() {
  if (_uryuBodyImage && _uryuBodyImage.complete && _uryuBodyImage.naturalWidth > 0) {
    return _uryuBodyImage;
  }
  if (!_uryuBodyImageLoading && typeof Image !== 'undefined') {
    _uryuBodyImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _uryuBodyImage = img;
      _uryuBodyImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Ishida body model image at Assets/model/Uryu-ishida.png', e);
      _uryuBodyImageLoading = false;
    };
    img.src = 'Assets/model/Uryu-ishida.png?v=2';
    _uryuBodyImage = img;
  }
  return _uryuBodyImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getUryuBodyImage();
}

/**
 * Draws Uryu's hand matching his fair anime skin tone.
 * Fully compliant with Rule 20 (Hand Visibility & Skin Only).
 */
export function drawUryuHand(ctx, x, y, radius, isDrawing = false) {
  ctx.save();
  ctx.translate(x, y);

  // 1. Quincy White Sleeve Cuff (Extending toward the body)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  if (isDrawing) {
    // Sleeve cuff angled toward the body/elbow during draw pull
    ctx.roundRect(-radius * 1.5, -radius * 0.85, radius * 1.4, radius * 1.7, 3);
  } else {
    ctx.roundRect(-radius * 1.1, -radius * 0.75, radius * 1.0, radius * 1.5, 2);
  }
  ctx.fill();
  ctx.stroke();

  // Subtle royal blue Quincy seam line on cuff
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(isDrawing ? -radius * 1.4 : -radius * 1.0, 0);
  ctx.lineTo(isDrawing ? -radius * 0.3 : -radius * 0.2, 0);
  ctx.stroke();

  // 2. Fair Anime Skin Tone Fist in Pixel Art (Matching face #FFE8D6)
  drawPixelHand(ctx, 0, 0, radius, '#FFE8D6');

  // 4. Glowing Reishi spirit spark at string pinch point
  if (isDrawing) {
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(radius * 0.2, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(radius * 0.2, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws Uryu's Reishi Spirit Particle Aura and ground Quincy Cross ring.
 * Zero shadowBlur filters (Rule 11 compliant).
 */
export function drawUryuReishiAura(ctx, fighter) {
  const r = fighter.r || 25;
  const isPreview = fighter._isWinnerReveal || fighter.isDemoFighter || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'champion'));
  if (isPreview) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const isVollstandig = Boolean(fighter.vollstandigActive);

  ctx.save();
  // Canvas is already translated to (fighter.x, fighter.y) in drawUryuSkin

  // 1. Rising Spirit Particle Sparks (Combat only - Zero shadowBlur - Rule 11)
  ctx.fillStyle = '#00E5FF';
  for (let i = 0; i < 4; i++) {
    const phase = (now * 0.002 + i * 1.57) % 1.0;
    const sparkX = Math.sin(now * 0.003 + i * 2) * (r * 0.9);
    const sparkY = (r * 0.6) - phase * (r * 1.6);
    const sparkAlpha = Math.sin(phase * Math.PI) * (isVollstandig ? 0.9 : 0.4);

    ctx.globalAlpha = sparkAlpha;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const phase = (now * 0.002 + i * 1.57) % 1.0;
    const sparkX = Math.sin(now * 0.003 + i * 2) * (r * 0.9);
    const sparkY = (r * 0.6) - phase * (r * 1.6);
    const sparkAlpha = Math.sin(phase * Math.PI) * (isVollstandig ? 0.9 : 0.6);

    ctx.globalAlpha = sparkAlpha;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Piercing Light Radiant Reishi Aura & Orbiting Diamonds (Passive 1)
  if (fighter.isPiercingLightActive) {
    const pulse = Math.sin(now * 0.008) * 0.5 + 0.5;
    
    // Outer pulsating cyan Reishi shield ring
    ctx.strokeStyle = `rgba(0, 229, 255, ${0.40 + pulse * 0.35})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.32 + pulse * 3.0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25 + pulse * 2.0, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Orbiting Quincy Diamond Motes
    const orbAngle = now * 0.005;
    for (let d = 0; d < 4; d++) {
      const a = orbAngle + (d * Math.PI / 2);
      const dx = Math.cos(a) * (r * 1.55);
      const dy = Math.sin(a) * (r * 1.55);

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(dx, dy - 4);
      ctx.lineTo(dx + 3, dy);
      ctx.lineTo(dx, dy + 4);
      ctx.lineTo(dx - 3, dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // 3. Ransōtengai (Heavenly Wild Puppet Suit) Overhead Marionette Strings (Passive 2)
  if (fighter.ransotengaiActive) {
    const stringTopX = Math.sin(now * 0.003) * (r * 0.35);
    const stringTopY = -r * 4.8;

    // Anchor joints on Uryu's body
    const joints = [
      { x: 0, y: -r * 0.85 },          // Head crown
      { x: -r * 0.65, y: -r * 0.05 },  // Left shoulder
      { x: r * 0.65, y: -r * 0.05 },   // Right shoulder
      { x: -r * 0.25, y: r * 0.30 },   // Left torso
      { x: r * 0.25, y: r * 0.30 },    // Right torso
    ];

    for (let j = 0; j < joints.length; j++) {
      const jt = joints[j];
      const pulsePhase = ((now * 0.005) + j * 0.20) % 1.0;
      const pulseX = stringTopX + (jt.x - stringTopX) * pulsePhase;
      const pulseY = stringTopY + (jt.y - stringTopY) * pulsePhase;

      const stringGrad = ctx.createLinearGradient(stringTopX, stringTopY, jt.x, jt.y);
      stringGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
      stringGrad.addColorStop(0.25, 'rgba(0, 229, 255, 0.45)');
      stringGrad.addColorStop(1.0, 'rgba(0, 229, 255, 0.85)');

      // Outer glowing Reishi beam
      ctx.strokeStyle = stringGrad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(stringTopX, stringTopY);
      ctx.lineTo(jt.x, jt.y);
      ctx.stroke();

      // Inner white spirit filament
      const coreGrad = ctx.createLinearGradient(stringTopX, stringTopY, jt.x, jt.y);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      coreGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.65)');
      coreGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.95)');

      ctx.strokeStyle = coreGrad;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(stringTopX, stringTopY);
      ctx.lineTo(jt.x, jt.y);
      ctx.stroke();

      // Flowing Reishi spark mote traveling down string
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Diamond attachment node at joint
      ctx.fillStyle = '#00E5FF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(jt.x, jt.y - 2.8);
      ctx.lineTo(jt.x + 2.2, jt.y);
      ctx.lineTo(jt.x, jt.y + 2.8);
      ctx.lineTo(jt.x - 2.2, jt.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // 4. Vollständig Single Radiant Reishi Wing (Left Side)
  if (isVollstandig) {
    ctx.save();
    ctx.globalAlpha = 0.90;
    const wingLength = r * 3.2;
    const wingAngle = -0.7 + Math.sin(now * 0.003) * 0.08;

    ctx.rotate(wingAngle);

    // Glowing cyan feather blades
    const wingGrad = ctx.createLinearGradient(0, 0, -wingLength, -wingLength * 0.4);
    wingGrad.addColorStop(0, '#FFFFFF');
    wingGrad.addColorStop(0.3, '#00E5FF');
    wingGrad.addColorStop(1.0, 'rgba(0, 229, 255, 0)');

    ctx.fillStyle = wingGrad;
    for (let f = 0; f < 5; f++) {
      const fOff = f * 8;
      const fLen = wingLength * (1.0 - f * 0.15);
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -fOff);
      ctx.quadraticCurveTo(-fLen * 0.5, -fLen * 0.6 - fOff, -fLen, -fLen * 0.3 - fOff);
      ctx.lineTo(-fLen * 0.7, -fLen * 0.15 - fOff);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws Uryu's dash afterimages at recorded absolute world coordinates.
 */
export function drawUryuAfterImages(ctx, fighter) {
  if (!fighter || !fighter.afterImages || fighter.afterImages.length === 0) return;
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

    // 1. Radiant Cyan Silhouette
    ctx.beginPath();
    ctx.arc(0, 0, ai.r || r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. White Quincy Tunic Ghost (+Y)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, (ai.r || r) * 0.95, 0, Math.PI);
    ctx.fill();

    // 3. Dark Hair Ghost (-Y)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.60)';
    ctx.beginPath();
    ctx.arc(0, 0, (ai.r || r) * 0.98, Math.PI, Math.PI * 2);
    ctx.fill();

    // 4. Ghost Bow
    drawUryuBow(ctx, (ai.r || r) * 0.95, 0, ai.r || r, 0);

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Main Skin Renderer for Uryu Ishida (The Last Quincy)
 * Fully compliant with Rule 19 (Upright Front POV), Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur).
 */
export function drawUryuSkin(ctx, fighter) {
  fighter.suppressSketchyOutline = true;
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  // 0. Render Hirenkyaku afterimages in absolute world space
  drawUryuAfterImages(ctx, fighter);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Underfoot Reishi & Ground Quincy Aura
  drawUryuReishiAura(ctx, fighter);

  // 2. Upright Front POV & Local Angle Transforms (Rule 19)
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 3. Bow Drawing & Shooting Animation Progress (Buttery Smooth Kinematics)
  const isMeleeChop = Boolean(fighter.slashSwingTimer && fighter.slashSwingTimer > 0);

  // Smooth lerped draw progress from fighter
  const drawProgress = (fighter.smoothDrawProgress !== undefined)
    ? fighter.smoothDrawProgress
    : (isPodiumPreview ? 0.70 : 0);

  const isDrawing = drawProgress > 0.04;
  const clampedDraw = Math.min(1.0, Math.max(0.0, drawProgress));

  // Hand Position Coordinates (Rule 19 / 20)
  // Front Hand holding bow center grip with firm forward push
  const frontX = r * 1.05 + Math.pow(clampedDraw, 0.7) * 4.0;
  const frontY = 0;

  // Smooth String Nock & Recoil Physics
  const recoilTimer = fighter.stringRecoilTimer || 0;
  const recoilMax = fighter.stringRecoilMax || 6;
  const recoilP = (recoilTimer > 0) ? (1.0 - recoilTimer / recoilMax) : 1.0;
  const recoilOffset = (recoilTimer > 0)
    ? Math.sin(recoilP * Math.PI * 3) * Math.exp(-recoilP * 3.2) * (r * 0.45)
    : 0;

  const isVollstandig = Boolean(fighter.vollstandigActive);
  const bowScale = isVollstandig ? 1.25 : 1.0;
  const imgScale = (r / 25) * 0.140 * bowScale;
  const restStringX = -141 * imgScale;
  const maxDrawBackX = - (r * 2.60 * bowScale);
  const drawBackX = restStringX + (maxDrawBackX - restStringX) * Math.pow(clampedDraw, 0.85) + recoilOffset;

  // Back hand grips the arrow nock (frontX + drawBackX) during draw, rests naturally at idle
  const restBackX = r * 0.40;
  const restBackY = -r * 0.10;
  const targetBackX = (clampedDraw <= 0.02 && recoilTimer <= 0)
    ? restBackX
    : (frontX + drawBackX);
  const targetBackY = (clampedDraw <= 0.02 && recoilTimer <= 0)
    ? restBackY
    : 0;

  // Smooth exponential interpolation for back hand (snappy tracking during active draw)
  if (fighter._smoothBackX === undefined || isPodiumPreview) {
    fighter._smoothBackX = targetBackX;
    fighter._smoothBackY = targetBackY;
  } else {
    const lerpSpeed = isDrawing ? 0.80 : 0.45;
    fighter._smoothBackX += (targetBackX - fighter._smoothBackX) * lerpSpeed;
    fighter._smoothBackY += (targetBackY - fighter._smoothBackY) * lerpSpeed;
  }

  const backX = fighter._smoothBackX;
  const backY = fighter._smoothBackY;

  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = shouldHideHands || fighter.hideFrontHand;
  const hideBackHand = shouldHideHands || fighter.hideBackHand;
  const handRadius = getHandSize(7.0);
  const skinColor = '#FFE8D6'; // Warm, clear fair anime skin tone

  // ── LAYER 1: BACK HAND (Only at idle rest when not drawing) ──
  if (!hideBackHand && !isDrawing && recoilTimer <= 0) {
    drawUryuHand(ctx, backX, backY, handRadius * 0.92, false);
  }

  // ── LAYER 2: BODY CIRCLE (Clipped to Radius r) ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  const bodyImg = _getUryuBodyImage();
  if (bodyImg && bodyImg.complete && bodyImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Crisp nearest-neighbor pixel art scaling
    const modelScale = 1.032;
    const drawR = r * modelScale;
    ctx.drawImage(bodyImg, -drawR, -drawR, drawR * 2, drawR * 2);
    ctx.restore();
  } else {
    // A. BASE LAYER: WARM FAIR ANIME FACE & BODY SKIN
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle 3D spherical skin depth shading (Zero shadowBlur - Rule 11)
    const bodyGrad = ctx.createRadialGradient(-r * 0.20, -r * 0.15, r * 0.15, 0, 0, r * 1.05);
    bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.30)');
    bodyGrad.addColorStop(0.70, 'rgba(240, 205, 185, 0.15)');
    bodyGrad.addColorStop(1.0, 'rgba(160, 100, 80, 0.32)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

  // B. WANDENREICH STERNRITTER UNIFORM (+Y Bottom Hemisphere — Rule 19)
  // Perfectly matching the updated user diagram:
  // - Top horizontal seam at y = 0.22*r
  // - Short vertical blue zipper (0, 0.22*r -> 0, 0.38*r)
  // - Left collar slant and diagonal crossover flap across chest
  // - Dual gold insignia tabs (top collar tab & lower chest badge)
  // - 4 double-breasted black buttons (2x2 grid)
  const coatWhite = '#FFFFFF';
  const seamStroke = '#000000';
  const zipBlue = '#1D4ED8';       // Royal Quincy Blue
  const goldYellow = '#FACC15';    // Bright Yellow Badge
  const goldBorder = '#CA8A04';
  const buttonBlack = '#0F172A';

  const topY = r * 0.22;           // Horizontal coat boundary

  // 1. Pure White Coat Base Fill (+Y)
  ctx.fillStyle = coatWhite;
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, topY);
  ctx.lineTo(r * 1.05, topY);
  ctx.lineTo(r * 1.05, r * 1.05);
  ctx.lineTo(-r * 1.05, r * 1.05);
  ctx.closePath();
  ctx.fill();

  // ── CEL-SHADING FABRIC SHADOWS (Rule 11 Compliant - Zero shadowBlur) ──
  const shadowCool = '#E2E8F0';        // Cool anime fabric shadow
  const shadowSubtle = '#F1F5F9';      // Soft ambient tone
  const shadowDeep = 'rgba(203, 213, 225, 0.55)'; // Deep fold shade

  // A. Inner Collar V-Neck Recessed Shade
  const zipBottomY = topY + r * 0.16;
  ctx.fillStyle = shadowCool;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, topY);
  ctx.lineTo(r * 0.35, topY);
  ctx.lineTo(r * 0.01, zipBottomY);
  ctx.closePath();
  ctx.fill();

  // B. Top Neck / Chin Horizontal Cast Shadow Strip
  ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.beginPath();
  ctx.rect(-r * 1.05, topY, r * 2.1, r * 0.04);
  ctx.fill();

  // C. Left Flap Underlayer Cel-Shade (Under the lapel & badge panel)
  ctx.fillStyle = shadowSubtle;
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, topY + r * 0.08);
  ctx.lineTo(-r * 0.22, topY + r * 0.32);
  ctx.lineTo(-r * 0.48, r * 0.74);
  ctx.lineTo(-r * 1.05, r * 0.74);
  ctx.lineTo(-r * 1.05, topY + r * 0.08);
  ctx.closePath();
  ctx.fill();

  // D. Diagonal Lapel Flap Underhang Drop Shadow (Cast by the overlapping front coat)
  ctx.fillStyle = shadowDeep;
  ctx.beginPath();
  ctx.moveTo(r * 0.82, topY + r * 0.14);
  ctx.lineTo(-r * 0.45, r * 0.65);
  ctx.lineTo(-r * 0.45, r * 0.69);
  ctx.lineTo(r * 0.78, topY + r * 0.18);
  ctx.closePath();
  ctx.fill();

  // E. Lower Hem Curvature Shading (Body roundness depth)
  ctx.fillStyle = 'rgba(226, 232, 240, 0.40)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.90, r * 0.90);
  ctx.quadraticCurveTo(0, r * 0.82, r * 0.90, r * 0.90);
  ctx.lineTo(r * 1.05, r * 1.05);
  ctx.lineTo(-r * 1.05, r * 1.05);
  ctx.closePath();
  ctx.fill();

  // 2. Vertical Blue Zipper on Inner Collar
  ctx.fillStyle = zipBlue;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.02, topY);
  ctx.lineTo(r * 0.04, topY);
  ctx.lineTo(r * 0.04, zipBottomY);
  ctx.lineTo(-r * 0.02, zipBottomY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Crisp Black Manga Uniform Seams (1.3px line width — aligned seamlessly)
  ctx.strokeStyle = seamStroke;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // A. Top Horizontal Straight Line
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, topY);
  ctx.lineTo(r * 1.05, topY);
  ctx.stroke();

  // B. Symmetrical Inner Collar V-Lines (Meeting precisely at zipper bottom)
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, topY);
  ctx.lineTo(r * 0.01, zipBottomY);
  ctx.lineTo(r * 0.35, topY);
  ctx.stroke();

  // C. Main Diagonal Crossover Lapel Line
  const leftJunctionX = -r * 0.45;
  const leftJunctionY = r * 0.65;
  const rightNotchX = r * 0.82;
  const rightNotchY = topY + r * 0.14;

  ctx.beginPath();
  ctx.moveTo(rightNotchX, rightNotchY);
  ctx.lineTo(leftJunctionX, leftJunctionY);
  ctx.stroke();

  // Diagonal seam from zipper bottom down-left to left junction (matching red line 1)
  ctx.beginPath();
  ctx.moveTo(r * 0.01, zipBottomY);
  ctx.lineTo(leftJunctionX, leftJunctionY);
  ctx.stroke();

  // D. Left Lapel Notched Contour (Symmetrical outer notch)
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, topY + r * 0.08);
  ctx.lineTo(-r * 0.82, topY + r * 0.08);
  ctx.lineTo(-r * 0.82, topY + r * 0.14);
  ctx.lineTo(-r * 0.22, topY + r * 0.32);
  ctx.stroke();

  // E. Left Lower Flap Step & Vertical Seam (Clean vertical seam line down to bottom)
  ctx.beginPath();
  ctx.moveTo(leftJunctionX, leftJunctionY);
  ctx.lineTo(-r * 0.48, r * 0.74);
  ctx.lineTo(-r * 0.48, r * 0.95);
  ctx.stroke();

  // F. Right Lapel Notched Contour (Symmetrically matching left lapel notch)
  ctx.beginPath();
  ctx.moveTo(r * 0.95, topY + r * 0.08);
  ctx.lineTo(r * 0.82, topY + r * 0.08);
  ctx.lineTo(rightNotchX, rightNotchY);
  ctx.stroke();

  // G. Subtle Fabric Tension Folds (Anime cel-shading accents)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.40)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  // Right waist fold
  ctx.moveTo(r * 0.72, r * 0.74);
  ctx.quadraticCurveTo(r * 0.58, r * 0.76, r * 0.48, r * 0.72);
  // Center micro-fold
  ctx.moveTo(-r * 0.05, r * 0.76);
  ctx.lineTo(r * 0.12, r * 0.80);
  ctx.stroke();

  // 4. Wandenreich Insignia Badges (Scaled down to fine miniature proportions)
  const badgeGold = '#C8A251';     // Authentic Muted Military Gold
  const badgeBorder = '#000000';

  // A. Collar Diamond Patches (Left & Right Lapels)
  const drawCollarDiamond = (dx, dy, rot) => {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(rot);
    ctx.fillStyle = badgeGold;
    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -1.7);
    ctx.lineTo(1.8, 0);
    ctx.lineTo(0, 1.7);
    ctx.lineTo(-1.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // Left Collar Diamond
  drawCollarDiamond(-r * 0.76, topY + r * 0.05, 0.20);

  // Right Collar Diamond
  drawCollarDiamond(r * 0.76, topY + r * 0.05, -0.20);

  // B. Lower-Left Breast Winged Star Emblem (Shifted more to the left)
  ctx.save();
  ctx.translate(-r * 0.55, r * 0.56);
  ctx.fillStyle = '#D4AF37';       // Radiant Military Gold
  ctx.strokeStyle = badgeBorder;
  ctx.lineWidth = 0.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Unified Gold Background Silhouette (Upper Dome Arch + Side Wings + Star Base)
  ctx.beginPath();
  ctx.arc(0, -0.5, 2.2, Math.PI, 0);
  ctx.quadraticCurveTo(2.4, -0.6, 3.8, 0.2);
  ctx.quadraticCurveTo(2.4, 1.2, 1.2, 0.7);
  ctx.lineTo(0.7, 2.3);
  ctx.lineTo(0, 1.5);
  ctx.lineTo(-0.7, 2.3);
  ctx.lineTo(-1.2, 0.7);
  ctx.quadraticCurveTo(-2.4, 1.2, -3.8, 0.2);
  ctx.quadraticCurveTo(-2.4, -0.6, 0, -0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Crisp Central 5-Pointed Star Accent
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 4) / 5 - Math.PI / 2;
    const sx = Math.cos(a) * 1.9;
    const sy = Math.sin(a) * 1.9 + 0.2;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 5. Four Double-Breasted Buttons (Strictly aligned symmetrical 2x2 grid)
  const drawButton = (bx, by) => {
    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = '#334155'; // Dark slate military button
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Subtle specular upper-left glint
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(-0.4, -0.4, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const btnColX = r * 0.30;
  const btnTopY = r * 0.65;
  const btnBotY = r * 0.86;

  // Left Column (Top & Bottom with increased vertical gap)
  drawButton(-btnColX, btnTopY);
  drawButton(-btnColX, btnBotY);

  // Right Column (Top & Bottom with increased vertical gap)
  drawButton(btnColX, btnTopY);
  drawButton(btnColX, btnBotY);

  // C. SIGNATURE SIDE-SWEPT JET-NAVY ANIME HAIR (-Y Top Hemisphere)
  // Perfectly matching both user redlines:
  // - Left sideburn from (-0.46*r, -0.16*r) to (-0.72*r, +0.22*r)
  // - Right sideburn from (+0.44*r, -0.28*r) to (+0.76*r, +0.22*r)
  const hairDark = '#090D16';      // Deep Midnight Jet-Black
  const hairMid = '#151C2C';       // Mid navy hair shading
  const hairHighlight = '#475569'; // Subtle Slate Anime Hair Sheen
  const hairGlint = '#38BDF8';     // Fine Cool Quincy Blue Specular Glint

  const apexX = r * 0.28;
  const apexY = -r * 0.38;
  const lockX = -r * 0.46;
  const lockY = -r * 0.16;
  const leftEarX = -r * 0.72;
  const leftEarY = r * 0.22; // Meets top collar seam at y = +0.22*r

  const rightLockX = r * 0.44;
  const rightLockY = -r * 0.28;
  const rightEarX = r * 0.76;
  const rightEarY = r * 0.22; // Meets top collar seam at y = +0.22*r

  // 1. Hair Base Top Crown Mesh (Pure solid midnight jet-black manga hair)
  ctx.fillStyle = hairDark;
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, rightEarY);
  ctx.lineTo(rightEarX, rightEarY);
  // Steep diagonal sweep up along the right redline to right lock
  ctx.lineTo(rightLockX, rightLockY);
  // Forehead slope up to apex
  ctx.lineTo(apexX, apexY);
  // Sweep curve from apex down to the left bangs pivot
  ctx.quadraticCurveTo(-r * 0.15, -r * 0.26, lockX, lockY);
  // Steep diagonal sweep following left redline to collar seam
  ctx.lineTo(leftEarX, leftEarY);
  ctx.lineTo(-r * 1.05, leftEarY);
  ctx.lineTo(-r * 1.05, -r * 1.05);
  ctx.closePath();
  ctx.fill();

  // 2. Crisp Manga Hairline Ink Outline along both redline curves
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(leftEarX, leftEarY);
  ctx.lineTo(lockX, lockY);
  ctx.quadraticCurveTo(-r * 0.15, -r * 0.26, apexX, apexY);
  ctx.lineTo(rightLockX, rightLockY);
  ctx.lineTo(rightEarX, rightEarY);
  ctx.stroke();

  // D. EYEWEAR: PURE FRAMELESS RIMLESS CRYSTAL SPECTACLES & GLINT (Y ~ 0 — Rule 19)
  // 100% Faithful to the official frameless reference photo:
  // - Pure frameless cut-glass rectangular lenses with subtle corner bevels
  // - Clean central bridge bracket & outer glass-mounting hinge brackets
  // - Sleek matte black temple arms
  const glassesScale = (typeof CONFIG !== 'undefined' && CONFIG.uryu?.glassesScale) ? CONFIG.uryu.glassesScale : 1.0;
  const glassW = (r * 0.44) * glassesScale;   // ~11px width
  const glassH = (r * 0.20) * glassesScale;   // ~5px height
  const bridgeW = (r * 0.10) * glassesScale;  // ~2.5px gap between lenses
  const glassY = -r * 0.065;                  // Eye-level placement
  const cornerR = 1.4;                        // Beveled cut-glass corners

  const ryTop = glassY;
  const ryBot = glassY + glassH;
  const rx0 = bridgeW * 0.5;                  // Right lens inner edge
  const rx1 = rx0 + glassW;                   // Right lens outer edge

  const lx0 = -bridgeW * 0.5;                 // Left lens inner edge
  const lx1 = lx0 - glassW;                   // Left lens outer edge

  // Frameless glass rectangles
  const buildRightLens = () => {
    ctx.beginPath();
    ctx.roundRect(rx0, ryTop, glassW, glassH, cornerR);
  };

  const buildLeftLens = () => {
    ctx.beginPath();
    ctx.roundRect(lx1, ryTop, glassW, glassH, cornerR);
  };

  // 1. Crystal Clear Glass Lens Fill
  ctx.fillStyle = 'rgba(235, 248, 255, 0.16)';
  buildLeftLens();
  ctx.fill();
  buildRightLens();
  ctx.fill();

  // 2. Diagonal Specular Glass Reflection Sheen
  const drawGlassGleam = (buildFn, x0, w, isRight) => {
    ctx.save();
    buildFn();
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.beginPath();
    if (isRight) {
      ctx.moveTo(x0 + w * 0.15, ryBot);
      ctx.lineTo(x0 + w * 0.40, ryBot);
      ctx.lineTo(x0 + w * 0.80, ryTop);
      ctx.lineTo(x0 + w * 0.55, ryTop);
    } else {
      ctx.moveTo(x0 - w * 0.15, ryBot);
      ctx.lineTo(x0 - w * 0.40, ryBot);
      ctx.lineTo(x0 - w * 0.80, ryTop);
      ctx.lineTo(x0 - w * 0.55, ryTop);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  drawGlassGleam(buildLeftLens, lx0, glassW, false);
  drawGlassGleam(buildRightLens, rx0, glassW, true);

  // 3. Polished Frameless Cut-Glass Edge Outline (Subtle dark contour + white bevel light)
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.lineWidth = 1.0;
  buildLeftLens();
  ctx.stroke();
  buildRightLens();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 0.6;
  buildLeftLens();
  ctx.stroke();
  buildRightLens();
  ctx.stroke();

  // 4. Central Nose Bridge Bracket & Clamps
  const bridgeMidY = ryTop + glassH * 0.50;
  const bridgeH = glassH * 0.32;

  // Bracket bar
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(-bridgeW * 0.5 - 0.6, bridgeMidY - bridgeH * 0.5, bridgeW + 1.2, bridgeH, 0.6);
  ctx.fill();

  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(-bridgeW * 0.5 - 0.2, bridgeMidY - bridgeH * 0.5 + 0.3, bridgeW + 0.4, bridgeH - 0.6, 0.4);
  ctx.fill();

  // Dual metallic mounting screw pins on inner glass edges
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(lx0 - 0.4, bridgeMidY, 0.7, 0, Math.PI * 2);
  ctx.arc(rx0 + 0.4, bridgeMidY, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // 5. Outer Glass Hinge Mounting Clamps
  const hingeMidY = ryTop + glassH * 0.45;
  const hingeH = glassH * 0.45;

  const drawHingeClamp = (px, isLeft) => {
    const xOff = isLeft ? -1.4 : -0.4;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(px + xOff, hingeMidY - hingeH * 0.5, 1.8, hingeH, 0.5);
    ctx.fill();

    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.roundRect(px + xOff + 0.3, hingeMidY - hingeH * 0.5 + 0.3, 1.2, hingeH - 0.6, 0.3);
    ctx.fill();

    // Screw pin
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(isLeft ? px + 0.5 : px - 0.5, hingeMidY, 0.6, 0, Math.PI * 2);
    ctx.fill();
  };

  drawHingeClamp(lx1, true);
  drawHingeClamp(rx1, false);

  // 6. Sleek Matte Black Temple Arms (As seen in the photo)
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lx1 - 1.2, hingeMidY);
  ctx.lineTo(lx1 - r * 0.16, hingeMidY + glassH * 0.22);
  ctx.moveTo(rx1 + 1.2, hingeMidY);
  ctx.lineTo(rx1 + r * 0.16, hingeMidY + glassH * 0.22);
  ctx.stroke();

  // Top edge temple highlight
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(lx1 - 1.2, hingeMidY - 0.4);
  ctx.lineTo(lx1 - r * 0.14, hingeMidY + glassH * 0.22 - 0.4);
  ctx.moveTo(rx1 + 1.2, hingeMidY - 0.4);
  ctx.lineTo(rx1 + r * 0.14, hingeMidY + glassH * 0.22 - 0.4);
  ctx.stroke();

  // 7. Dynamic Anime Glasses Glint (Signature right-lens gleam + 4-point star twinkle)
  const glintPulse = Math.sin(now * 0.0045) * 0.5 + 0.5;
  const isFullDraw = drawProgress > 0.80;
  const glintAlpha = isFullDraw ? 1.0 : (isDrawing ? (0.70 + drawProgress * 0.30) : (0.40 + glintPulse * 0.55));

  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${glintAlpha.toFixed(2)})`;
  ctx.lineWidth = isFullDraw ? 2.2 : 1.8;
  ctx.beginPath();
  ctx.moveTo(rx0 + 2, ryBot - 1);
  ctx.lineTo(rx1 - 2, ryTop + 1);
  ctx.stroke();

  // 4-point star glint twinkle at upper corner
  const starCenterX = rx1 - glassW * 0.30;
  const starCenterY = ryTop + glassH * 0.35;
  const starSize = isFullDraw ? 3.8 : (2.2 + glintPulse * 1.0);

  ctx.fillStyle = `rgba(255, 255, 255, ${glintAlpha.toFixed(2)})`;
  ctx.beginPath();
  ctx.moveTo(starCenterX, starCenterY - starSize);
  ctx.lineTo(starCenterX + starSize * 0.35, starCenterY - starSize * 0.35);
  ctx.lineTo(starCenterX + starSize, starCenterY);
  ctx.lineTo(starCenterX + starSize * 0.35, starCenterY + starSize * 0.35);
  ctx.lineTo(starCenterX, starCenterY + starSize);
  ctx.lineTo(starCenterX - starSize * 0.35, starCenterY + starSize * 0.35);
  ctx.lineTo(starCenterX - starSize, starCenterY);
  ctx.lineTo(starCenterX - starSize * 0.35, starCenterY - starSize * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  } // end of procedural fallback else

  ctx.restore(); // End of clipped body circle

  // ── LAYER 3: HANDS & WEAPON (On top of body circle) ──
  if (isMeleeChop) {
    if (!hideFrontHand) {
      const chopMax = fighter.slashSwingMaxTimer || 18;
      const chopTimer = fighter.slashSwingTimer || 0;
      const chopP = Math.min(1.0, Math.max(0.0, 1.0 - (chopTimer / chopMax)));
      drawSeeleSchneider(ctx, frontX, frontY, r, chopP);
      drawUryuHand(ctx, frontX, frontY, handRadius, false);
    }
  } else {
    // 1. Ginrei Kojaku Spirit Bow & Front Hand Grip
    if (!hideFrontHand) {
      drawUryuBow(ctx, frontX, frontY, r, drawProgress, {
        isAiming: isDrawing,
        isVollstandig: Boolean(fighter.vollstandigActive),
        recoilTimer: fighter.stringRecoilTimer || 0,
        recoilMax: fighter.stringRecoilMax || 6
      });
      drawUryuHand(ctx, frontX, frontY, handRadius, false);
    }

    // 2. Drawing Hand (Gripping arrow nock & bowstring on top of torso during draw / recoil)
    if (!hideBackHand && (isDrawing || recoilTimer > 0)) {
      drawUryuHand(ctx, backX, backY, handRadius * 0.96, true);
    }
  }

  ctx.restore();
}

/**
 * Renders Uryu's ghost skin for preview/selection.
 */
export function drawUryuGhostSkin(ctx, fighter) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  drawUryuSkin(ctx, fighter);
  ctx.restore();
}
