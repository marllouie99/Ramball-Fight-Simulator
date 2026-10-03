// ─────────────────────────────────────────────
// Avatar of Emptiness Character Skin (Terraria: Wrath of the Gods)
// Default Procedural Circle Body + Attached FrontArmLeft & FrontArmRight Assets + Pixel Hands
// Adheres strictly to Rule 19, Rule 20, Rule 2.2, Rule 2.4, and Rule 3.5
// Multi-Part Asset Calibration Engine for Hair / Skin Studio
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

let _frontArmLeftImage = null;
let _frontArmRightImage = null;
let _frontForearmLeftImage = null;
let _frontForearmRightImage = null;

const _ARM_LEFT_PATH = 'Assets/model/Avatar/FrontArmLeft.png';
const _ARM_RIGHT_PATH = 'Assets/model/Avatar/FrontArmRight.png';
const _FOREARM_LEFT_PATH = 'Assets/model/Avatar/FrontForearmLeft.png';
const _FOREARM_RIGHT_PATH = 'Assets/model/Avatar/FrontForearmRight.png';

function _isImageReady(img) {
  if (!img) return false;
  if (img.complete !== undefined) return Boolean(img.complete && img.naturalWidth > 0);
  return Boolean((img.width || img.naturalWidth) > 0);
}

function _getFrontArmLeftImage() {
  if (_frontArmLeftImage && _frontArmLeftImage.complete && _frontArmLeftImage.naturalWidth > 0) return _frontArmLeftImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _ARM_LEFT_PATH;
    _frontArmLeftImage = img;
  }
  return _frontArmLeftImage;
}

function _getFrontArmRightImage() {
  if (_frontArmRightImage && _frontArmRightImage.complete && _frontArmRightImage.naturalWidth > 0) return _frontArmRightImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _ARM_RIGHT_PATH;
    _frontArmRightImage = img;
  }
  return _frontArmRightImage;
}

function _getFrontForearmLeftImage() {
  if (_frontForearmLeftImage && _frontForearmLeftImage.complete && _frontForearmLeftImage.naturalWidth > 0) return _frontForearmLeftImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _FOREARM_LEFT_PATH;
    _frontForearmLeftImage = img;
  }
  return _frontForearmLeftImage;
}

function _getFrontForearmRightImage() {
  if (_frontForearmRightImage && _frontForearmRightImage.complete && _frontForearmRightImage.naturalWidth > 0) return _frontForearmRightImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _FOREARM_RIGHT_PATH;
    _frontForearmRightImage = img;
  }
  return _frontForearmRightImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getFrontArmLeftImage();
  _getFrontArmRightImage();
  _getFrontForearmLeftImage();
  _getFrontForearmRightImage();
}

/**
 * Default Calibration Transforms for Avatar of Emptiness Parts
 */
export const AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS = {
  overall: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false, flipY: false },
  body: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false, flipY: false },
  arm_left: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false, flipY: false },
  arm_right: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false, flipY: false },
  forearm_left: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false, flipY: false },
  forearm_right: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false, flipY: false }
};

/**
 * Draws an image at specified coordinate with pivot alignment
 */
function _drawAtPivot(ctx, image, x, y, scaleX, scaleY, pivotX = 0.5, pivotY = 0.5) {
  const imgW = image.naturalWidth || image.width || 300;
  const imgH = image.naturalHeight || image.height || 300;
  const width = imgW * scaleX;
  const height = imgH * scaleY;
  ctx.drawImage(image, x - width * pivotX, y - height * pivotY, width, height);
}

/**
 * Main Skin Render Routine for Avatar of Emptiness
 */
export function drawAvatarOfEmptinessSkin(ctx, fighter) {
  if (!fighter || fighter.dead) return;

  const r = fighter.r || fighter.radius || 29;
  const rScale = r / 25;
  const gameTimer = (typeof state !== 'undefined' && state.gameTimer) ? state.gameTimer : 0;
  const themeColor = fighter.themeColor || '#9D4EDD';
  const cyanColor = '#00F5D4';
  const darkCoreColor = '#06070B';

  // Read per-part studio customization parameters
  const customOverall = (typeof state !== 'undefined' && (state.skinCustomizations?.avatar_of_emptiness || state.skinCustomizations?.avatarofemptiness)) || {};
  const customBody = (typeof state !== 'undefined' && (state.skinCustomizations?.avatar_of_emptiness_body || state.skinCustomizations?.avatarofemptiness_body)) || {};
  const customArmLeft = (typeof state !== 'undefined' && (state.skinCustomizations?.avatar_of_emptiness_arm_left || state.skinCustomizations?.avatarofemptiness_arm_left)) || {};
  const customArmRight = (typeof state !== 'undefined' && (state.skinCustomizations?.avatar_of_emptiness_arm_right || state.skinCustomizations?.avatarofemptiness_arm_right)) || {};
  const customForearmLeft = (typeof state !== 'undefined' && (state.skinCustomizations?.avatar_of_emptiness_forearm_left || state.skinCustomizations?.avatarofemptiness_forearm_left)) || {};
  const customForearmRight = (typeof state !== 'undefined' && (state.skinCustomizations?.avatar_of_emptiness_forearm_right || state.skinCustomizations?.avatarofemptiness_forearm_right)) || {};

  const overallDef = AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS.overall;
  const bodyDef = AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS.body;
  const armLeftDef = AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS.arm_left;
  const armRightDef = AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS.arm_right;
  const forearmLeftDef = AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS.forearm_left;
  const forearmRightDef = AVATAR_OF_EMPTINESS_DEFAULT_CONFIGS.forearm_right;

  const widthScale = customOverall.widthScale ?? overallDef.widthScale;
  const heightScale = customOverall.heightScale ?? overallDef.heightScale;
  const customOffsetX = (customOverall.offsetX ?? overallDef.offsetX) * rScale;
  const customOffsetY = (customOverall.offsetY ?? overallDef.offsetY) * rScale;
  const customAngleOffset = (customOverall.angleOffset ?? overallDef.angleOffset);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Local Coordinate Orientation (Rule 19 Upright Front POV)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  if (customAngleOffset !== 0) {
    ctx.rotate(customAngleOffset);
  }
  ctx.translate(customOffsetX, customOffsetY);

  if (customOverall.flipX) ctx.scale(-1, 1);
  if (customOverall.flipY) ctx.scale(1, -1);

  const hoverBob = Math.sin(gameTimer * 0.045) * (r * 0.08);
  const showBody = (typeof state === 'undefined') || (state.studioSkinShowBody !== false) || !fighter._isStudioDummy;

  // ─────────────────────────────────────────────
  // LAYER 0 & 1: Concentric Void Aura & Body Circle
  // ─────────────────────────────────────────────
  if (showBody) {
    const bodyScaleW = widthScale * (customBody.widthScale ?? bodyDef.widthScale);
    const bodyScaleH = heightScale * (customBody.heightScale ?? bodyDef.heightScale);
    const bodyOffX = (customBody.offsetX ?? bodyDef.offsetX) * rScale;
    const bodyOffY = (customBody.offsetY ?? bodyDef.offsetY) * rScale;
    const bodyAngle = (customBody.angleOffset ?? bodyDef.angleOffset);
    const bodyFlipX = (customBody.flipX ?? bodyDef.flipX) ? -1 : 1;
    const bodyFlipY = (customBody.flipY ?? bodyDef.flipY) ? -1 : 1;

    ctx.save();
    ctx.translate(bodyOffX, hoverBob + bodyOffY);
    if (bodyAngle !== 0) ctx.rotate(bodyAngle);
    ctx.scale(bodyScaleW * bodyFlipX, bodyScaleH * bodyFlipY);

    // 1.0 Concentric Void Aura (Rule 2.2 compliant - NO shadowBlur)
    const auraGrad = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.55);
    auraGrad.addColorStop(0, 'rgba(157, 78, 221, 0.32)');
    auraGrad.addColorStop(0.55, 'rgba(0, 245, 212, 0.16)');
    auraGrad.addColorStop(0.85, 'rgba(255, 0, 85, 0.08)');
    auraGrad.addColorStop(1, 'rgba(6, 7, 11, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
    ctx.fill();

    // 1.1 Outer Boundary Stroke & Body Fill
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(0, -r * 0.25, 0, 0, 0, r);
    bodyGrad.addColorStop(0, '#1A0B2E');
    bodyGrad.addColorStop(0.5, '#0E071A');
    bodyGrad.addColorStop(1, darkCoreColor);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.strokeStyle = cyanColor;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // 1.2 Inner Event Horizon Rim
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(157, 78, 221, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 1.3 Faceless Cryonic Rift Slit (Rule 3.2 - strictly no eyes, mouth, or nose)
    const slitHeight = r * 0.42;
    const slitGrad = ctx.createLinearGradient(0, -slitHeight * 0.5, 0, slitHeight * 0.5);
    slitGrad.addColorStop(0, '#00F5D4');
    slitGrad.addColorStop(0.5, '#FFFFFF');
    slitGrad.addColorStop(1, '#00F5D4');
    ctx.fillStyle = slitGrad;
    ctx.fillRect(-1.5, -slitHeight * 0.5, 3.0, slitHeight);

    ctx.restore();
  }

  // ─────────────────────────────────────────────
  // LAYER 2: Attached Arms (FrontArmLeft.png & FrontArmRight.png) & Forearms
  // ─────────────────────────────────────────────
  const shoulderLX = -r * 0.58 * widthScale;
  const shoulderRX = r * 0.58 * widthScale;
  const shoulderY = hoverBob - (r * 0.02 * heightScale);

  const armLeft = _getFrontArmLeftImage();
  const armRight = _getFrontArmRightImage();
  const forearmLeft = _getFrontForearmLeftImage();
  const forearmRight = _getFrontForearmRightImage();

  // 2.1 Draw Left Arm (FrontArmLeft.png)
  if (_isImageReady(armLeft)) {
    const armLScaleW = widthScale * (customArmLeft.widthScale ?? armLeftDef.widthScale);
    const armLScaleH = heightScale * (customArmLeft.heightScale ?? armLeftDef.heightScale);
    const armLOffX = (customArmLeft.offsetX ?? armLeftDef.offsetX) * rScale;
    const armLOffY = (customArmLeft.offsetY ?? armLeftDef.offsetY) * rScale;
    const armLAngle = (customArmLeft.angleOffset ?? armLeftDef.angleOffset);
    const armLFlipX = (customArmLeft.flipX ?? armLeftDef.flipX) ? -1 : 1;
    const armLFlipY = (customArmLeft.flipY ?? armLeftDef.flipY) ? -1 : 1;

    ctx.imageSmoothingEnabled = true;
    const armLBaseScale = (r * 1.55) / (armLeft.naturalHeight || 732);
    ctx.save();
    ctx.translate(shoulderLX + armLOffX, shoulderY + armLOffY);
    ctx.rotate(-0.18 + Math.sin(gameTimer * 0.04) * 0.04 + armLAngle);
    _drawAtPivot(ctx, armLeft, 0, 0, armLBaseScale * armLScaleW * armLFlipX, armLBaseScale * armLScaleH * armLFlipY, 0.5, 0.22);
    ctx.restore();
  }

  // 2.2 Draw Right Arm (FrontArmRight.png)
  if (_isImageReady(armRight)) {
    const armRScaleW = widthScale * (customArmRight.widthScale ?? armRightDef.widthScale);
    const armRScaleH = heightScale * (customArmRight.heightScale ?? armRightDef.heightScale);
    const armROffX = (customArmRight.offsetX ?? armRightDef.offsetX) * rScale;
    const armROffY = (customArmRight.offsetY ?? armRightDef.offsetY) * rScale;
    const armRAngle = (customArmRight.angleOffset ?? armRightDef.angleOffset);
    const armRFlipX = (customArmRight.flipX ?? armRightDef.flipX) ? -1 : 1;
    const armRFlipY = (customArmRight.flipY ?? armRightDef.flipY) ? -1 : 1;

    ctx.imageSmoothingEnabled = true;
    const armRBaseScale = (r * 1.55) / (armRight.naturalHeight || 673);
    ctx.save();
    ctx.translate(shoulderRX + armROffX, shoulderY + armROffY);
    ctx.rotate(0.18 - Math.sin(gameTimer * 0.04) * 0.04 + armRAngle);
    _drawAtPivot(ctx, armRight, 0, 0, armRBaseScale * armRScaleW * armRFlipX, armRBaseScale * armRScaleH * armRFlipY, 0.5, 0.22);
    ctx.restore();
  }

  // 2.3 Draw Optional Attached Forearms if active/configured
  if (_isImageReady(forearmLeft) && ((customForearmLeft.widthScale !== undefined && customForearmLeft.widthScale > 0) || (state?.studioSkinAvatarPart === 'forearm_left'))) {
    const foreLScaleW = widthScale * (customForearmLeft.widthScale ?? forearmLeftDef.widthScale);
    const foreLScaleH = heightScale * (customForearmLeft.heightScale ?? forearmLeftDef.heightScale);
    const foreLOffX = (customForearmLeft.offsetX ?? forearmLeftDef.offsetX) * rScale;
    const foreLOffY = (customForearmLeft.offsetY ?? forearmLeftDef.offsetY) * rScale;
    const foreLAngle = (customForearmLeft.angleOffset ?? forearmLeftDef.angleOffset);
    const foreLFlipX = (customForearmLeft.flipX ?? forearmLeftDef.flipX) ? -1 : 1;
    const foreLFlipY = (customForearmLeft.flipY ?? forearmLeftDef.flipY) ? -1 : 1;
    const foreLBaseScale = (r * 1.45) / (forearmLeft.naturalHeight || 732);

    ctx.save();
    ctx.translate(shoulderLX - (r * 0.20 * widthScale) + foreLOffX, shoulderY + (r * 0.38 * heightScale) + foreLOffY);
    ctx.rotate(-0.25 + Math.sin(gameTimer * 0.04) * 0.04 + foreLAngle);
    _drawAtPivot(ctx, forearmLeft, 0, 0, foreLBaseScale * foreLScaleW * foreLFlipX, foreLBaseScale * foreLScaleH * foreLFlipY, 0.5, 0.22);
    ctx.restore();
  }

  if (_isImageReady(forearmRight) && ((customForearmRight.widthScale !== undefined && customForearmRight.widthScale > 0) || (state?.studioSkinAvatarPart === 'forearm_right'))) {
    const foreRScaleW = widthScale * (customForearmRight.widthScale ?? forearmRightDef.widthScale);
    const foreRScaleH = heightScale * (customForearmRight.heightScale ?? forearmRightDef.heightScale);
    const foreROffX = (customForearmRight.offsetX ?? forearmRightDef.offsetX) * rScale;
    const foreROffY = (customForearmRight.offsetY ?? forearmRightDef.offsetY) * rScale;
    const foreRAngle = (customForearmRight.angleOffset ?? forearmRightDef.angleOffset);
    const foreRFlipX = (customForearmRight.flipX ?? forearmRightDef.flipX) ? -1 : 1;
    const foreRFlipY = (customForearmRight.flipY ?? forearmRightDef.flipY) ? -1 : 1;
    const foreRBaseScale = (r * 1.45) / (forearmRight.naturalHeight || 673);

    ctx.save();
    ctx.translate(shoulderRX + (r * 0.20 * widthScale) + foreROffX, shoulderY + (r * 0.38 * heightScale) + foreROffY);
    ctx.rotate(0.25 - Math.sin(gameTimer * 0.04) * 0.04 + foreRAngle);
    _drawAtPivot(ctx, forearmRight, 0, 0, foreRBaseScale * foreRScaleW * foreRFlipX, foreRBaseScale * foreRScaleH * foreRFlipY, 0.5, 0.22);
    ctx.restore();
  }

  ctx.restore();
}
