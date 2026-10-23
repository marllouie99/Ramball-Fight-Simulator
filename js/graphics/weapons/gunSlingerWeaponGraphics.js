import { state } from '../../core/state.js';
import { getHandSize } from '../../core/config.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawAlucardHand } from '../fighters/gunSlingerSkin.js';

// ─────────────────────────────────────────────
// ALUCARD WEAPON GRAPHICS (The .454 Casull & 13mm Jackal)
// Uses authentic pixel art weapon assets:
// - Right Gun (.454 Casull): Assets/model/alucard/Hellsing_.454_Casull_Pixel_Pistol.png
// - Left Gun (13mm Jackal): Assets/model/alucard/Alucard-pistol-gun.png
// With complete procedural 2D discrete grid fallbacks (Rule 3.5),
// white combat gloves with red Hellsing sigil (Rule 20),
// and zero shadowBlur CPU filters (Rule 11).
// ─────────────────────────────────────────────

let _casullWeaponImage = null;
let _casullWeaponImageLoading = false;

export function _getCasullWeaponImage() {
  if (_casullWeaponImage && _casullWeaponImage.complete && _casullWeaponImage.naturalWidth > 0) {
    return _casullWeaponImage;
  }
  if (!_casullWeaponImageLoading && typeof Image !== 'undefined') {
    _casullWeaponImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _casullWeaponImage = img;
      _casullWeaponImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Casull weapon image at Assets/model/alucard/Hellsing_.454_Casull_Pixel_Pistol.png', e);
      _casullWeaponImageLoading = false;
    };
    img.src = 'Assets/model/alucard/Hellsing_.454_Casull_Pixel_Pistol.png?v=1';
    _casullWeaponImage = img;
  }
  return _casullWeaponImage;
}

let _jackalWeaponImage = null;
let _jackalWeaponImageLoading = false;

export function _getJackalWeaponImage() {
  if (_jackalWeaponImage && _jackalWeaponImage.complete && _jackalWeaponImage.naturalWidth > 0) {
    return _jackalWeaponImage;
  }
  if (!_jackalWeaponImageLoading && typeof Image !== 'undefined') {
    _jackalWeaponImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _jackalWeaponImage = img;
      _jackalWeaponImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Jackal weapon image at Assets/model/alucard/Hellsing_13mm_Jackal_Pixel_Pistol.png', e);
      _jackalWeaponImageLoading = false;
    };
    img.src = 'Assets/model/alucard/Hellsing_13mm_Jackal_Pixel_Pistol.png?v=1';
    _jackalWeaponImage = img;
  }
  return _jackalWeaponImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getCasullWeaponImage();
  _getJackalWeaponImage();
}

export const GUNSLINGER_BULLET_GRAPHICS = {
  casullCasing: '#CBD5E1',
  casullHighlight: '#FFFFFF',
  casullShadow: '#64748B',
  jackalCasing: '#1E293B',
  jackalHighlight: '#DC2626',
  jackalShadow: '#0F172A',
  lengthRatio: 3.2,
};

/**
 * Draws the .454 Casull Sacred Silver bullet and speed streak
 */
export function drawAlucardCasullBullet(ctx, x, y, angle, scale = 1, lifeRatio = 1) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);

  const P = 0.95 * scale;

  const rect = (gx, gy, gw, gh, color) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
  };

  // Holy Silver Speed Streak
  const trailLen = Math.round(12 * lifeRatio);
  for (let i = 1; i <= trailLen; i++) {
    const alpha = Math.max(0, (1.0 - i / trailLen) * 0.75 * lifeRatio);
    ctx.globalAlpha = alpha;
    if (i % 2 === 0) {
      rect(-i * 2 - 4, -1, 2, 2, '#FFFFFF');
    } else {
      rect(-i * 2 - 4, 0, 2, 1, '#CBD5E1');
    }
  }

  ctx.globalAlpha = 1.0;
  // Consecrated Silver Heavy Cartridge
  rect(-4, -2, 6, 4, '#0E0F14');
  rect(-3, -1, 5, 2, '#E2E8F0');
  rect(-3, -1, 5, 1, '#FFFFFF');
  rect(-3, 1, 5, 1, '#94A3B8');

  // Sacred Bullet Head
  rect(2, -2, 3, 4, '#FFFFFF');
  rect(3, -1, 2, 2, '#F8FAFC');
  rect(5, 0, 1, 1, '#FFFFFF');

  ctx.restore();
}

/**
 * Draws the 13mm Jackal Armor-Piercing Explosive Mercury bullet and trail
 */
export function drawAlucardJackalBullet(ctx, x, y, angle, scale = 1, lifeRatio = 1) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(angle);

  const P = 1.05 * scale;

  const rect = (gx, gy, gw, gh, color) => {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
  };

  // Dark Crimson Smoke Trail
  const trailLen = Math.round(14 * lifeRatio);
  for (let i = 1; i <= trailLen; i++) {
    const alpha = Math.max(0, (1.0 - i / trailLen) * 0.8 * lifeRatio);
    ctx.globalAlpha = alpha;
    if (i % 2 === 0) {
      rect(-i * 2 - 5, -1, 2, 2, '#DC2626');
    } else {
      rect(-i * 2 - 5, 0, 2, 1, '#7F1D1D');
    }
  }

  ctx.globalAlpha = 1.0;
  // 13mm Heavy Matte Black Slug
  rect(-5, -2, 8, 4, '#0E0F14');
  rect(-4, -1, 7, 2, '#1E293B');
  rect(-4, -1, 7, 1, '#475569');
  rect(-4, 1, 7, 1, '#0F172A');

  // Mercury Explosive Crimson Tip
  rect(3, -2, 3, 4, '#DC2626');
  rect(4, -1, 2, 2, '#EF4444');
  rect(5, 0, 2, 1, '#F87171');

  ctx.restore();
}

export function drawGunSlingerBullet(ctx, x, y, angle, scale = 1, lifeRatio = 1) {
  drawAlucardCasullBullet(ctx, x, y, angle, scale, lifeRatio);
}

/**
 * Muzzle flash visual on the tip of the guns suppressed per user request.
 */
export function drawCasullMuzzleFlash(ctx, x, y, angle, scale = 1, intensity = 1) {
  // Clean muzzle tip: starburst visual removed per user request
}

export function drawJackalMuzzleFlash(ctx, x, y, angle, scale = 1, intensity = 1) {
  // Clean muzzle tip: starburst visual removed per user request
}

export const drawGunSlingerMuzzleFlash = drawCasullMuzzleFlash;

export const GUNSLINGER_WEAPON_GRAPHICS = {
  positioning: {
    scale: 1.05,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  },
  recoil: {
    maxRecoil: 7.0,
    maxTilt: 0.22,
    recoilDecay: 0.28,
    tiltDecay: 0.22,
  },
  colors: {
    casullSlide: '#E2E8F0',
    casullHighlight: '#FFFFFF',
    casullShadow: '#64748B',
    jackalSlide: '#1E293B',
    jackalHighlight: '#475569',
    jackalShadow: '#0F172A',
    outline: '#0E0F14',
  }
};

/**
 * Draws the .454 Casull (Right Gun — Sacred Silver Long Slide Semi-Auto).
 * Prioritizes loading Assets/model/alucard/Hellsing_.454_Casull_Pixel_Pistol.png
 * with procedural discrete pixel art fallback.
 */
function renderCasullPistol(ctx, isFiring, flashFrame, scale = 1) {
  const casullImg = _getCasullWeaponImage();
  if (casullImg && casullImg.complete && casullImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Calibrated scale to give Casull iconic massive anime magnum presence (~65px total length)
    const s = 0.092 * scale;

    // Raw PNG has muzzle on left (X: 41) and grip on right (X: 554, Y: 272).
    // Flip horizontally so the barrel extends forward along +X:
    ctx.scale(-1, 1);
    ctx.drawImage(casullImg, -554 * s, -272 * s, 703 * s, 355 * s);

    ctx.restore();
    return;
  }

  // ── Procedural Fallback (when PNG is loading or in headless tests) ──
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 1.35 * scale;

  const px = (gx, gy, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(P), Math.round(P));
  };
  const rect = (gx, gy, gw, gh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
  };

  // 1. Walnut Combat Grip
  rect(-11, 2, 9, 16, '#0E0F14');
  rect(-10, 3, 7, 14, '#3E2212');
  rect(-9, 4, 5, 12, '#5A3319');
  rect(-7, 7, 2, 6, '#D97706');

  // 2. Trigger Guard & Match Trigger
  rect(-4, 4, 2, 7, '#0E0F14');
  rect(-2, 10, 7, 2, '#0E0F14');
  rect(4, 4, 2, 7, '#0E0F14');
  rect(-1, 5, 2, 4, '#CBD5E1');

  // 3. Sacred Silver Frame & Slide
  rect(-12, -6, 51, 10, '#0E0F14');
  rect(-11, -5, 49, 8, '#CBD5E1');
  rect(-10, -5, 48, 2, '#FFFFFF');
  rect(-10, 1, 48, 2, '#94A3B8');

  for (let sGrip = -8; sGrip <= -2; sGrip += 2) {
    rect(sGrip, -4, 1, 5, '#64748B');
  }

  rect(4, -4, 8, 3, '#475569');
  rect(5, -3, 6, 2, '#0F172A');
  rect(14, -2, 18, 1, '#F8FAFC');

  rect(33, -7, 3, 3, '#0E0F14');
  rect(34, -7, 1, 2, '#FFFFFF');
  rect(37, -3, 2, 4, '#FFFFFF');

  ctx.restore();
}

/**
 * Draws the Jackal (Left Gun — 13mm Matte Black Anti-Freak Combat Pistol).
 * Prioritizes loading Assets/model/alucard/Hellsing_13mm_Jackal_Pixel_Pistol.png
 * with procedural discrete pixel art fallback.
 */
function renderJackalPistol(ctx, isFiring, flashFrame, scale = 1) {
  const jackalImg = _getJackalWeaponImage();
  if (jackalImg && jackalImg.complete && jackalImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Both Casull and Jackal share identical twin dimensions (703 x 355, grip 554,272, muzzle 41,129)
    const isCasullTwin = jackalImg.naturalWidth > 600;
    const s = (isCasullTwin ? 0.092 : 0.098) * scale;
    const gripX = isCasullTwin ? 554 : 470;
    const gripY = isCasullTwin ? 272 : 210;
    const muzTipX = isCasullTwin ? 41 : 26;
    const muzTipY = isCasullTwin ? 129 : 49;
    const imgW = jackalImg.naturalWidth;
    const imgH = jackalImg.naturalHeight;

    ctx.scale(-1, 1);
    ctx.drawImage(jackalImg, -gripX * s, -gripY * s, imgW * s, imgH * s);

    ctx.restore();
    return;
  }

  // ── Procedural Fallback ──
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 1.40 * scale;

  const rect = (gx, gy, gw, gh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
  };

  rect(-12, 2, 10, 17, '#0E0F14');
  rect(-11, 3, 8, 15, '#090D16');
  rect(-10, 4, 6, 13, '#1E293B');

  rect(-4, 4, 2, 7, '#0E0F14');
  rect(-2, 10, 8, 2, '#0E0F14');
  rect(5, 4, 2, 7, '#0E0F14');
  rect(-1, 5, 2, 4, '#64748B');

  rect(-13, -7, 56, 11, '#0E0F14');
  rect(-12, -6, 54, 9, '#1E293B');
  rect(-11, -6, 53, 2, '#475569');
  rect(-11, 1, 53, 2, '#0F172A');

  for (let sGrip = -9; sGrip <= -3; sGrip += 2) {
    rect(sGrip, -5, 1, 6, '#0F172A');
  }

  rect(10, -3, 22, 1, '#CA8A04');
  rect(12, -2, 18, 1, '#EAB308');

  rect(36, -7, 4, 3, '#0E0F14');
  rect(37, -6, 2, 2, '#475569');
  rect(40, -4, 2, 5, '#0E0F14');

  ctx.restore();
}

/**
 * Draws Alucard's crossed crimson trench coat sleeves across his chest during victory X pose.
 * Renders the crossed arms matching the iconic Hellsing release stance (right arm crossed in front of left arm).
 */
function _drawAlucardCrossedSleeves(ctx, r, xProg, leftHandPos, rightHandPos) {
  if (xProg <= 0.05) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1.0, xProg * 1.4);

  const sleeveW = Math.max(5, Math.round(r * 0.28));
  const origLeftX = -r * 0.76;
  const origLeftY = r * 0.40;
  const origRightX = r * 0.76;
  const origRightY = r * 0.40;

  // 1. Under-Arm (Left shoulder crossing across to right hand)
  ctx.save();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = sleeveW + 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(origLeftX, origLeftY);
  ctx.lineTo(rightHandPos.x, rightHandPos.y);
  ctx.stroke();

  ctx.strokeStyle = '#7F1D1D';
  ctx.lineWidth = sleeveW;
  ctx.beginPath();
  ctx.moveTo(origLeftX, origLeftY);
  ctx.lineTo(rightHandPos.x, rightHandPos.y);
  ctx.stroke();

  ctx.strokeStyle = '#991B1B';
  ctx.lineWidth = Math.max(2, sleeveW * 0.45);
  ctx.beginPath();
  ctx.moveTo(origLeftX + 1, origLeftY - 1);
  ctx.lineTo(rightHandPos.x, rightHandPos.y - 1);
  ctx.stroke();
  ctx.restore();

  // 2. Over-Arm (Right shoulder crossing in front to left hand)
  ctx.save();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = sleeveW + 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(origRightX, origRightY);
  ctx.lineTo(leftHandPos.x, leftHandPos.y);
  ctx.stroke();

  ctx.strokeStyle = '#991B1B';
  ctx.lineWidth = sleeveW;
  ctx.beginPath();
  ctx.moveTo(origRightX, origRightY);
  ctx.lineTo(leftHandPos.x, leftHandPos.y);
  ctx.stroke();

  ctx.strokeStyle = '#B91C1C';
  ctx.lineWidth = Math.max(2, sleeveW * 0.45);
  ctx.beginPath();
  ctx.moveTo(origRightX - 1, origRightY - 1);
  ctx.lineTo(leftHandPos.x, leftHandPos.y - 1);
  ctx.stroke();

  // Fold crease at crossing intersection
  const crossX = (origRightX + leftHandPos.x + origLeftX + rightHandPos.x) / 4;
  const crossY = (origRightY + leftHandPos.y + origLeftY + rightHandPos.y) / 4;
  ctx.fillStyle = '#450A0A';
  ctx.fillRect(Math.round(crossX - 2), Math.round(crossY - 1), 4, 2);
  ctx.restore();

  ctx.restore();
}

/**
 * Draws Alucard's Dual Firearms:
 * - Lead Gun (Right Hand): The .454 Casull Auto (using Hellsing_.454_Casull_Pixel_Pistol.png)
 * - Support Gun (Left Hand): The 13mm Jackal (using Hellsing_13mm_Jackal_Pixel_Pistol.png)
 * Held strictly by the canonical default hands at Rule 20 symmetrical positions!
 * In victory X pose, forearms cross in an X across the chest with guns flanking head pointing up-outward.
 */
export function drawAlucardDualGuns(
  x, y,
  rightGunAngle, leftGunAngle,
  r = 25,
  isFiring = false,
  flashFrame = 0,
  leftIsFiring = false,
  leftFlashFrame = 0,
  rightRecoilOffset = 0,
  rightRecoilTilt = 0,
  leftRecoilOffset = 0,
  leftRecoilTilt = 0,
  gunSpinAngle = 0,
  hideHands = false,
  isVictoryXPose = false,
  victoryXProgress = 0
) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  const ctx = (typeof state !== 'undefined' && state.ctx) ? state.ctx : null;
  if (!ctx) return;

  const custom = (typeof state !== 'undefined' && (state.skinCustomizations?.gunslinger || state.skinCustomizations?.alucard)) || {};
  const customScale = custom.scale ?? 1.0;
  const customOffX = custom.offsetX ?? 0;
  const customOffY = custom.offsetY ?? 0;
  const customRot = custom.rotation ?? 0;

  const baseScale = (GUNSLINGER_WEAPON_GRAPHICS?.positioning?.scale || 1.05) * customScale;
  const handRadius = getHandSize(r * 0.30); // Rule 20 canonical default hand size

  ctx.save();
  ctx.translate(x + customOffX, y + customOffY);

  const primaryAngle = (rightGunAngle !== undefined && !Number.isNaN(rightGunAngle)) ? rightGunAngle : (leftGunAngle || 0);
  const facingLeft = Math.abs(primaryAngle) > Math.PI / 2;

  // In victory X pose, body is upright facing camera
  const isXPoseActive = isVictoryXPose || victoryXProgress > 0;
  const xProg = Math.max(0, Math.min(1, isVictoryXPose ? Math.max(1, victoryXProgress || 1) : victoryXProgress));

  if (!isXPoseActive) {
    ctx.rotate(primaryAngle + customRot);
    if (facingLeft) {
      ctx.scale(1, -1);
    }
  } else {
    ctx.rotate(customRot);
  }

  // Canonical Symmetrical Lower-Flank Placement (Rule 20 Standard):
  // Rear Gun (Left Hand): The 13mm Jackal held at lower-left flank
  const supportX = -r * 0.82;
  const supportY = r * 0.38;

  // Front Gun (Right Hand): The .454 Casull held at lower-right flank
  const leadX = r * 0.82;
  const leadY = r * 0.38;

  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || hideHands;

  // Victory X Pose Anchors: Hands crossed at chest/collar level
  const targetLeftHandX = -r * 0.38;
  const targetLeftHandY = r * 0.10;
  const targetRightHandX = r * 0.38;
  const targetRightHandY = r * 0.10;

  const currentLeftX = isXPoseActive ? (supportX * (1 - xProg) + targetLeftHandX * xProg) : supportX;
  const currentLeftY = isXPoseActive ? (supportY * (1 - xProg) + targetLeftHandY * xProg) : supportY;
  const currentRightX = isXPoseActive ? (leadX * (1 - xProg) + targetRightHandX * xProg) : leadX;
  const currentRightY = isXPoseActive ? (leadY * (1 - xProg) + targetRightHandY * xProg) : leadY;

  // Draw crossed crimson coat sleeves underneath firearms during victory pose
  if (isXPoseActive) {
    _drawAlucardCrossedSleeves(
      ctx, r, xProg,
      { x: currentLeftX, y: currentLeftY },
      { x: currentRightX, y: currentRightY }
    );
  }

  // ── 1. Draw Support Gun (Left: The 13mm Jackal — Matte Black) ──
  // In gameplay: aims along leftGunAngle
  // In victory X pose: points diagonally UP and OUTWARD to the left (-33.2° / -0.58 rad)
  let leftDiff = (leftGunAngle !== undefined && !Number.isNaN(leftGunAngle) ? leftGunAngle : primaryAngle) - primaryAngle;
  let normLeftDiff = Math.atan2(Math.sin(leftDiff), Math.cos(leftDiff));
  if (facingLeft && !isXPoseActive) normLeftDiff = -normLeftDiff;

  ctx.save();
  ctx.translate(currentLeftX, currentLeftY);

  if (isXPoseActive) {
    // Flip horizontally so barrel points up-left, with slide on top and grip hanging into hand
    ctx.scale(-1, 1);
    const targetLeftXAngle = -0.58; // -33.2 degrees up-left
    const finalLeftAngle = targetLeftXAngle * xProg + (normLeftDiff * (1 - xProg));
    ctx.rotate(finalLeftAngle);
  } else {
    ctx.rotate(normLeftDiff);
  }

  ctx.translate(-leftRecoilOffset, 0);
  ctx.rotate(-leftRecoilTilt);

  ctx.save();
  if (gunSpinAngle !== 0) {
    ctx.translate(-8 * baseScale, 12 * baseScale);
    ctx.rotate(-gunSpinAngle);
    ctx.translate(8 * baseScale, -12 * baseScale);
  }

  renderJackalPistol(ctx, leftIsFiring !== undefined ? leftIsFiring : isFiring, leftFlashFrame || flashFrame, baseScale);
  ctx.restore();

  // Canonical Default Left Hand (White combat glove with red Hellsing seal) drawn directly over grip
  if (!shouldHideHands) {
    drawAlucardHand(ctx, 0, 0, handRadius);
  }

  ctx.restore();

  // ── 2. Draw Lead Gun (Right: The .454 Casull — Sacred Silver) ──
  // In gameplay: aims along rightGunAngle
  // In victory X pose: points diagonally UP and OUTWARD to the right (-33.2° / -0.58 rad)
  // Symmetrically frames Alucard's head matching the iconic Hellsing victory stance
  let rightDiff = (rightGunAngle !== undefined && !Number.isNaN(rightGunAngle) ? rightGunAngle : primaryAngle) - primaryAngle;
  let normRightDiff = Math.atan2(Math.sin(rightDiff), Math.cos(rightDiff));
  if (facingLeft && !isXPoseActive) normRightDiff = -normRightDiff;

  ctx.save();
  ctx.translate(currentRightX, currentRightY);

  if (isXPoseActive) {
    const targetRightXAngle = -0.58; // -33.2 degrees up-right
    const finalRightAngle = targetRightXAngle * xProg + (normRightDiff * (1 - xProg));
    ctx.rotate(finalRightAngle);
  } else {
    ctx.rotate(normRightDiff);
  }

  ctx.translate(-rightRecoilOffset, 0);
  ctx.rotate(-rightRecoilTilt);

  ctx.save();
  if (gunSpinAngle !== 0) {
    ctx.translate(-8 * baseScale, 12 * baseScale);
    ctx.rotate(gunSpinAngle);
    ctx.translate(8 * baseScale, -12 * baseScale);
  }

  renderCasullPistol(ctx, isFiring, flashFrame, baseScale);
  ctx.restore();

  // Canonical Default Right Hand (White combat glove with red Hellsing seal) drawn directly over grip
  if (!shouldHideHands) {
    drawAlucardHand(ctx, 0, 0, handRadius);
  }

  ctx.restore();

  ctx.restore();
}

export const drawGunSlingerDualRevolver = drawAlucardDualGuns;
