// ─────────────────────────────────────────────
// Nameless Deity Character Skin (Terraria: Wrath of the Gods)
// Simple Circle Body + Authentic Wings, Arm, Forearm & Hand Assets
// Based on NamelessDeityWingSet.cs, WingsStep.cs & ArmsStep.cs
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

// Skin 1 Assets
let _wingsImage = null;
let _cosmicLightCenterImage = null;
let _cachedBlueCosmicLightCenterCanvas = null;
let _wheelImage = null;
let _divineBodyImage = null;
let _antlersImage = null;
let _vinesImage = null;
let _cicadaImage = null;
let _censorImage = null;
let _sideFlowerImage = null;
let _cachedGraySideFlowerCanvas = null;
let _armImage = null;
let _forearmImage = null;
let _elbowJointImage = null;
let _handImage = null;

// Skin 2 (Golden Seraph) Assets
let _wheel3Image = null;
let _wings2Image = null;
let _sideFlower2Image = null;
let _hand2Image = null;
let _forearm2Image = null;
let _arm5Image = null;
let _divineBody2Image = null;
let _antlers2Image = null;
let _antlerVinesImage = null;
let _vines2Image = null;

const _WINGS_PATH = 'Assets/model/NamelessDeity/Wings.png';
const _COSMIC_LIGHT_CENTER_PATH = 'Assets/model/NamelessDeity/CosmicLightCircleCenter1.png';
const _WHEEL_PATH = 'Assets/model/NamelessDeity/Wheel.png';
const _DIVINE_BODY_PATH = 'Assets/model/NamelessDeity/DivineBody.png';
const _ANTLERS_PATH = 'Assets/model/NamelessDeity/Antlers1.png';
const _VINES_PATH = 'Assets/model/NamelessDeity/Vines.png';
const _CICADA_PATH = 'Assets/model/NamelessDeity/Cicada.png';
const _CENSOR_PATH = 'Assets/model/NamelessDeity/Censor.png';
const _SIDE_FLOWER_PATH = 'Assets/model/NamelessDeity/SideFlower2.png';
const _ARM_PATH = 'Assets/model/NamelessDeity/Arm.png';
const _FOREARM_PATH = 'Assets/model/NamelessDeity/Forearm.png';
const _ELBOW_JOINT_PATH = 'Assets/model/NamelessDeity/ElbowJoint.png';
const _HAND_PATH = 'Assets/model/NamelessDeity/Hand.png';

// Skin 2 Asset Paths
const _WHEEL3_PATH = 'Assets/model/NamelessDeity/wheel9.png';
const _WINGS2_PATH = 'Assets/model/NamelessDeity/Wings9.png';
const _SIDE_FLOWER2_PATH = 'Assets/model/NamelessDeity/sideflower9.png';
const _HAND2_PATH = 'Assets/model/NamelessDeity/hands9.png';
const _FOREARM2_PATH = 'Assets/model/NamelessDeity/forearm9.png';
const _ARM5_PATH = 'Assets/model/NamelessDeity/arm9.png';
const _DIVINE_BODY2_PATH = 'Assets/model/NamelessDeity/deitybody9.png';
const _ANTLERS2_PATH = 'Assets/model/NamelessDeity/antlers9.png';
const _ANTLER_VINES_PATH = 'Assets/model/NamelessDeity/Vines1.png';
const _VINES2_PATH = 'Assets/model/NamelessDeity/vines9.png';

function _getWingsImage() {
  if (_wingsImage && _wingsImage.complete && _wingsImage.naturalWidth > 0) return _wingsImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _WINGS_PATH;
    _wingsImage = img;
  }
  return _wingsImage;
}

function _getWings2Image() {
  if (_wings2Image && _wings2Image.complete && _wings2Image.naturalWidth > 0) return _wings2Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _WINGS2_PATH;
    _wings2Image = img;
  }
  return _wings2Image;
}

function _getCosmicLightCenterImage() {
  if (_cosmicLightCenterImage && _cosmicLightCenterImage.complete && _cosmicLightCenterImage.naturalWidth > 0) return _cosmicLightCenterImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _COSMIC_LIGHT_CENTER_PATH;
    _cosmicLightCenterImage = img;
  }
  return _cosmicLightCenterImage;
}

function _getBlueCosmicLightCenterCanvas() {
  const img = _getCosmicLightCenterImage();
  if (!_isImageReady(img)) return null;
  if (_cachedBlueCosmicLightCenterCanvas) return _cachedBlueCosmicLightCenterCanvas;
  if (typeof document === 'undefined') return img;

  try {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = img.naturalWidth || 1254;
    offCanvas.height = img.naturalHeight || 1254;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0);

    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum > 225) {
        // Pure blinding starlight diamond core (preserve brilliant white/ice core)
        const t = (lum - 225) / 30;
        data[i] = Math.min(255, Math.round(180 + 75 * t));
        data[i + 1] = Math.min(255, Math.round(230 + 25 * t));
        data[i + 2] = 255;
      } else if (lum > 110) {
        // Radiant Cyan / Azure celestial flare
        const t = (lum - 110) / 115;
        data[i] = Math.round(10 + 170 * t * 0.85);
        data[i + 1] = Math.round(120 + 110 * t);
        data[i + 2] = Math.min(255, Math.round(210 + 45 * t));
      } else {
        // Deep sapphire / cosmic blue outer rays
        const t = lum / 110;
        data[i] = Math.round(5 * t);
        data[i + 1] = Math.round(90 * t);
        data[i + 2] = Math.round(180 * t + 30);
      }
    }
    offCtx.putImageData(imgData, 0, 0);
    _cachedBlueCosmicLightCenterCanvas = offCanvas;
    return _cachedBlueCosmicLightCenterCanvas;
  } catch (e) {
    return img;
  }
}

function _getWheelImage() {
  if (_wheelImage && _wheelImage.complete && _wheelImage.naturalWidth > 0) return _wheelImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _WHEEL_PATH;
    _wheelImage = img;
  }
  return _wheelImage;
}

function _getWheel3Image() {
  if (_wheel3Image && _wheel3Image.complete && _wheel3Image.naturalWidth > 0) return _wheel3Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _WHEEL3_PATH;
    _wheel3Image = img;
  }
  return _wheel3Image;
}

function _getDivineBodyImage() {
  if (_divineBodyImage && _divineBodyImage.complete && _divineBodyImage.naturalWidth > 0) return _divineBodyImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _DIVINE_BODY_PATH;
    _divineBodyImage = img;
  }
  return _divineBodyImage;
}

function _getDivineBody2Image() {
  if (_divineBody2Image && _divineBody2Image.complete && _divineBody2Image.naturalWidth > 0) return _divineBody2Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _DIVINE_BODY2_PATH;
    _divineBody2Image = img;
  }
  return _divineBody2Image;
}

function _getAntlersImage() {
  if (_antlersImage && _antlersImage.complete && _antlersImage.naturalWidth > 0) return _antlersImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _ANTLERS_PATH;
    _antlersImage = img;
  }
  return _antlersImage;
}

function _getAntlers2Image() {
  if (_antlers2Image && _antlers2Image.complete && _antlers2Image.naturalWidth > 0) return _antlers2Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _ANTLERS2_PATH;
    _antlers2Image = img;
  }
  return _antlers2Image;
}

function _getAntlerVinesImage() {
  if (_antlerVinesImage && _antlerVinesImage.complete && _antlerVinesImage.naturalWidth > 0) return _antlerVinesImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _ANTLER_VINES_PATH;
    _antlerVinesImage = img;
  }
  return _antlerVinesImage;
}

function _getVinesImage() {
  if (_vinesImage && _vinesImage.complete && _vinesImage.naturalWidth > 0) return _vinesImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _VINES_PATH;
    _vinesImage = img;
  }
  return _vinesImage;
}

function _getVines2Image() {
  if (_vines2Image && _vines2Image.complete && _vines2Image.naturalWidth > 0) return _vines2Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _VINES2_PATH;
    _vines2Image = img;
  }
  return _vines2Image;
}

function _getCicadaImage() {
  if (_cicadaImage && _cicadaImage.complete && _cicadaImage.naturalWidth > 0) return _cicadaImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _CICADA_PATH;
    _cicadaImage = img;
  }
  return _cicadaImage;
}

function _getCensorImage() {
  if (_censorImage && _censorImage.complete && _censorImage.naturalWidth > 0) return _censorImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _CENSOR_PATH;
    _censorImage = img;
  }
  return _censorImage;
}

function _getSideFlowerImage() {
  if (_sideFlowerImage && _sideFlowerImage.complete && _sideFlowerImage.naturalWidth > 0) return _sideFlowerImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _SIDE_FLOWER_PATH;
    _sideFlowerImage = img;
  }
  return _sideFlowerImage;
}

function _getSideFlower2Image() {
  if (_sideFlower2Image && _sideFlower2Image.complete && _sideFlower2Image.naturalWidth > 0) return _sideFlower2Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _SIDE_FLOWER2_PATH;
    _sideFlower2Image = img;
  }
  return _sideFlower2Image;
}

function _getGraySideFlowerCanvas() {
  const img = _getSideFlowerImage();
  if (!_isImageReady(img)) return null;
  if (_cachedGraySideFlowerCanvas) return _cachedGraySideFlowerCanvas;
  if (typeof document === 'undefined') return img;

  try {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = img.naturalWidth || 303;
    offCanvas.height = img.naturalHeight || 303;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(img, 0, 0);

    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    offCtx.putImageData(imgData, 0, 0);
    _cachedGraySideFlowerCanvas = offCanvas;
    return _cachedGraySideFlowerCanvas;
  } catch (e) {
    return img;
  }
}

function _getArmImage() {
  if (_armImage && _armImage.complete && _armImage.naturalWidth > 0) return _armImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _ARM_PATH;
    _armImage = img;
  }
  return _armImage;
}

function _getArm5Image() {
  if (_arm5Image && _arm5Image.complete && _arm5Image.naturalWidth > 0) return _arm5Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _ARM5_PATH;
    _arm5Image = img;
  }
  return _arm5Image;
}

function _getForearmImage() {
  if (_forearmImage && _forearmImage.complete && _forearmImage.naturalWidth > 0) return _forearmImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _FOREARM_PATH;
    _forearmImage = img;
  }
  return _forearmImage;
}

function _getForearm2Image() {
  if (_forearm2Image && _forearm2Image.complete && _forearm2Image.naturalWidth > 0) return _forearm2Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _FOREARM2_PATH;
    _forearm2Image = img;
  }
  return _forearm2Image;
}

function _getElbowJointImage() {
  if (_elbowJointImage && _elbowJointImage.complete && _elbowJointImage.naturalWidth > 0) return _elbowJointImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _ELBOW_JOINT_PATH;
    _elbowJointImage = img;
  }
  return _elbowJointImage;
}

function _getHandImage() {
  if (_handImage && _handImage.complete && _handImage.naturalWidth > 0) return _handImage;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _HAND_PATH;
    _handImage = img;
  }
  return _handImage;
}

function _getHand2Image() {
  if (_hand2Image && _hand2Image.complete && _hand2Image.naturalWidth > 0) return _hand2Image;
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.src = _HAND2_PATH;
    _hand2Image = img;
  }
  return _hand2Image;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getWingsImage();
  _getWings2Image();
  _getCosmicLightCenterImage();
  _getWheelImage();
  _getWheel3Image();
  _getDivineBodyImage();
  _getDivineBody2Image();
  _getAntlersImage();
  _getAntlers2Image();
  _getAntlerVinesImage();
  _getVinesImage();
  _getVines2Image();
  _getCicadaImage();
  _getCensorImage();
  _getSideFlowerImage();
  _getSideFlower2Image();
  _getArmImage();
  _getArm5Image();
  _getForearmImage();
  _getForearm2Image();
  _getElbowJointImage();
  _getHandImage();
  _getHand2Image();
}

function _isImageReady(img) {
  if (!img) return false;
  if (img.complete !== undefined) return Boolean(img.complete && img.naturalWidth > 0);
  return Boolean((img.width || img.naturalWidth) > 0);
}

function _drawAtPivot(ctx, image, x, y, scaleX, scaleY, pivotX = 0.5, pivotY = 0.5) {
  const imgW = image.naturalWidth || image.width || 300;
  const imgH = image.naturalHeight || image.height || 300;
  const width = imgW * scaleX;
  const height = imgH * scaleY;
  ctx.drawImage(image, x - width * pivotX, y - height * pivotY, width, height);
}

/**
 * Draws a limb segment with precise local pixel pivot and optional vertical flip.
 */
function _drawLimbSegment(ctx, image, posX, posY, scaleX, scaleY, rotation, pivotPixelX, pivotPixelY, flipY = false) {
  ctx.save();
  ctx.translate(posX, posY);
  ctx.rotate(rotation);
  if (flipY) {
    ctx.scale(1, -1);
  }
  const width = image.naturalWidth * scaleX;
  const height = image.naturalHeight * scaleY;
  ctx.drawImage(image, -pivotPixelX * scaleX, -pivotPixelY * scaleY, width, height);
  ctx.restore();
}

/**
 * Rotates a 2D point around an origin point by an angle
 */
function _rotatePoint(px, py, ox, oy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - ox;
  const dy = py - oy;
  return {
    x: ox + dx * cos - dy * sin,
    y: oy + dx * sin + dy * cos
  };
}

/**
 * 2-Bone Inverse Kinematics solver (law of cosines)
 */
function _calculateElbow(startX, startY, targetX, targetY, upperLength, lowerLength, flip) {
  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.hypot(dx, dy);
  const clampedDistance = Math.max(Math.abs(upperLength - lowerLength) + 0.1, Math.min(distance, (upperLength + lowerLength) * 0.999));
  const along = (upperLength ** 2 - lowerLength ** 2 + clampedDistance ** 2) / (2 * clampedDistance);
  const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  const unitX = dx / distance;
  const unitY = dy / distance;
  const sign = flip ? -1 : 1;

  return {
    x: startX + unitX * along - unitY * height * sign,
    y: startY + unitY * along + unitX * height * sign
  };
}

/**
 * Authentic Piecewise Wing Flap Rotation Curve from NamelessDeityWingSet.cs
 */
function _evaluateWingFlapRotation(t) {
  const normT = ((t % 1) + 1) % 1;
  if (normT < 0.25) {
    const u = normT / 0.25;
    const eased = 1 - Math.pow(1 - u, 3);
    return 0.67 * eased;
  } else if (normT < 0.44) {
    const u = (normT - 0.25) / 0.19;
    const eased = u * u;
    return 0.67 + (-1.98 - 0.67) * eased;
  } else {
    const u = (normT - 0.44) / 0.56;
    const eased = Math.pow(u, 1.5);
    return -1.98 * (1 - eased);
  }
}

/**
 * Authentic Piecewise Wing Squish Deformation Curve from NamelessDeityWingSet.cs
 */
function _evaluateWingSquish(t) {
  const normT = ((t % 1) + 1) % 1;
  if (normT < 0.25) {
    const u = normT / 0.25;
    const eased = 1 - Math.pow(1 - u, 3);
    return 0.15 * eased;
  } else if (normT < 0.44) {
    const u = (normT - 0.25) / 0.19;
    const eased = Math.pow(u, 5);
    return 0.15 + 0.55 * eased;
  } else {
    const u = (normT - 0.44) / 0.56;
    const eased = u < 0.5
      ? 0.5 * Math.pow(u * 2, 1.3)
      : 1 - 0.5 * Math.pow((1 - u) * 2, 1.3);
    return 0.70 * (1 - eased);
  }
}

export const NAMELESS_DEITY_DEFAULT_CONFIGS = {
  overall: { widthScale: 0.76, heightScale: 1.03, offsetX: 1, offsetY: -4, angleOffset: 0, flipX: false },
  body: { widthScale: 1.0, heightScale: 0.86, offsetX: 0, offsetY: 1, angleOffset: 0, flipX: false },
  antlers: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, gap: 0, angleOffset: 0, flipX: false },
  antler_vines: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false },
  cicada: { widthScale: 1.0, heightScale: 0.7, offsetX: 0, offsetY: -6, angleOffset: 0, flipX: false },
  censor: { widthScale: 1.02, heightScale: 0.72, offsetX: 0, offsetY: -4, angleOffset: 0, flipX: false },
  vines: { widthScale: 1.3, heightScale: 0.86, offsetX: -11, offsetY: 0, angleOffset: 0, flipX: false },
  flowers: { widthScale: 1.5, heightScale: 1.04, offsetX: 6, offsetY: 19, angleOffset: 0, flipX: false },
  wings: { widthScale: 1.2, heightScale: 1.32, offsetX: -22, offsetY: -19, angleOffset: 0, flipX: false },
  halo: { widthScale: 2.16, heightScale: 1.52, offsetX: 0, offsetY: 13, angleOffset: 0, flipX: false },
  wheel: { widthScale: 0.84, heightScale: 0.56, offsetX: 0, offsetY: -34, angleOffset: 0, flipX: false },
  arm: { widthScale: 1.0, heightScale: 1.0, offsetX: 13, offsetY: 6, angleOffset: 0, flipX: false },
  forearm: { widthScale: 0.82, heightScale: 1.86, offsetX: 0, offsetY: -15, angleOffset: 1.1868238913561435, flipX: false },
  hand: { widthScale: 0.94, heightScale: 1.0, offsetX: 7, offsetY: -11, angleOffset: 0.05235987755982989, flipX: false }
};

export const NAMELESS_DEITY_SKIN2_DEFAULT_CONFIGS = {
  overall: { widthScale: 0.76, heightScale: 1.03, offsetX: 1, offsetY: -4, angleOffset: 0, flipX: false },
  body: { widthScale: 1.02, heightScale: 0.8, offsetX: 0, offsetY: 1, angleOffset: 0, flipX: false },
  antlers: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, gap: 0, angleOffset: 0, flipX: false },
  antler_vines: { widthScale: 1.0, heightScale: 1.0, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false },
  cicada: { widthScale: 0.7, heightScale: 0.7, offsetX: 0, offsetY: -6, angleOffset: 0, flipX: false },
  censor: { widthScale: 1.02, heightScale: 0.72, offsetX: 0, offsetY: -4, angleOffset: 0, flipX: false },
  vines: { widthScale: 0.9, heightScale: 0.88, offsetX: -16, offsetY: 0, angleOffset: 0, flipX: false },
  flowers: { widthScale: 1.66, heightScale: 1.04, offsetX: 6, offsetY: 19, angleOffset: 0, flipX: false },
  wings: { widthScale: 1.48, heightScale: 1.62, offsetX: -17, offsetY: -8, angleOffset: 0, flipX: false },
  halo: { widthScale: 2.56, heightScale: 1.72, offsetX: 0, offsetY: 0, angleOffset: 0, flipX: false },
  wheel: { widthScale: 0.84, heightScale: 0.53, offsetX: 0, offsetY: -28, angleOffset: 0, flipX: false },
  arm: { widthScale: 1.02, heightScale: 1.24, offsetX: 10, offsetY: 14, angleOffset: -0.29670597283903605, flipX: false },
  forearm: { widthScale: 0.82, heightScale: 0.66, offsetX: 9, offsetY: -7, angleOffset: 1.1868238913561435, flipX: false },
  hand: { widthScale: 0.64, heightScale: 0.9, offsetX: 4, offsetY: -12, angleOffset: 0.05235987755982989, flipX: false }
};

export const NAMELESS_DEITY_SKINS = {
  skin1: {
    id: 'skin1',
    name: 'Cosmic Seraph',
    label: '🌌 COSMIC SERAPH',
    desc: 'Wrath of the Gods supreme cosmic entity with clockwork wheel, celestial wings, and reality-warping armaments.'
  },
  skin2: {
    id: 'skin2',
    name: 'Golden Seraph',
    label: '👑 GOLDEN SERAPH',
    desc: 'Ascended Radiant Golden Seraph form with Wheel III, radiant gilded wings, lotus flowers, and divine golden hand armaments.'
  }
};

/**
 * Draws one complete arm + forearm + hand limb chain using inverse kinematics.
 * Connects Arm.png -> Forearm.png -> Hand.png with per-part tuning and exact cut-edge alignment.
 */
function _drawNamelessLimb(ctx, arm, forearm, elbowJoint, hand, startX, startY, targetX, targetY, limbScale, side, hideHands = false, customParts = {}) {
  const isLeft = side < 0;
  const customArm = customParts.arm || {};
  const customForearm = customParts.forearm || {};
  const customHand = customParts.hand || {};
  const rScale = customParts.rScale || 1.0;
  const isSkin2 = Boolean(customParts.isSkin2);

  const limbDefs = isSkin2 ? NAMELESS_DEITY_SKIN2_DEFAULT_CONFIGS : NAMELESS_DEITY_DEFAULT_CONFIGS;
  const armDef = limbDefs.arm;
  const forearmDef = limbDefs.forearm;
  const handDef = limbDefs.hand;

  const armScaleW = customArm.widthScale ?? armDef.widthScale;
  const armScaleH = customArm.heightScale ?? armDef.heightScale;
  const armOffX = ((customArm.offsetX ?? armDef.offsetX) * (isLeft ? -1 : 1)) * rScale;
  const armOffY = (customArm.offsetY ?? armDef.offsetY) * rScale;
  const armRotOff = (customArm.angleOffset ?? armDef.angleOffset) * (isLeft ? -1 : 1);

  const forearmScaleW = customForearm.widthScale ?? forearmDef.widthScale;
  const forearmScaleH = customForearm.heightScale ?? forearmDef.heightScale;
  const forearmOffX = ((customForearm.offsetX ?? forearmDef.offsetX) * (isLeft ? -1 : 1)) * rScale;
  const forearmOffY = (customForearm.offsetY ?? forearmDef.offsetY) * rScale;
  const forearmRotOff = (customForearm.angleOffset ?? forearmDef.angleOffset) * (isLeft ? -1 : 1);

  const handScaleW = customHand.widthScale ?? handDef.widthScale;
  const handScaleH = customHand.heightScale ?? handDef.heightScale;
  const handOffX = ((customHand.offsetX ?? handDef.offsetX) * (isLeft ? -1 : 1)) * rScale;
  const handOffY = (customHand.offsetY ?? handDef.offsetY) * rScale;
  const handRotOff = (customHand.angleOffset ?? handDef.angleOffset) * (isLeft ? -1 : 1);

  const armNatW = arm.naturalWidth || 950;
  const armNatH = arm.naturalHeight || 654;
  const forearmNatW = forearm.naturalWidth || 967;
  const forearmNatH = forearm.naturalHeight || 724;
  const handNatW = (hand && hand.naturalWidth) || 679;
  const handNatH = (hand && hand.naturalHeight) || 610;

  const armLength = (armNatW * 0.718) * limbScale * armScaleW;
  const forearmLength = (forearmNatW * 0.599) * limbScale * forearmScaleW;

  const startPtX = startX + armOffX;
  const startPtY = startY + armOffY;

  // 1. Initial 2-Bone IK elbow point
  const flipIK = isLeft;
  let elbowPos = _calculateElbow(startPtX, startPtY, targetX, targetY, armLength, forearmLength, flipIK);

  // 2. Sprite offset correction angles
  let elbowRotateAngle = Math.atan2(armNatH, armNatW);
  let forearmSpriteOffsetAngle = 0.192;

  if (isLeft) {
    elbowRotateAngle = -elbowRotateAngle;
    forearmSpriteOffsetAngle = -forearmSpriteOffsetAngle;
  }

  // 3. Angular compensation for downward tilt of Arm.png
  elbowPos = _rotatePoint(elbowPos.x, elbowPos.y, startPtX, startPtY, elbowRotateAngle);

  // 4. Compute bone rotations
  const armRotation = Math.atan2(elbowPos.y - startPtY, elbowPos.x - startPtX);
  const angleFromElbowToHand = Math.atan2(targetY - elbowPos.y, targetX - elbowPos.x);
  const forearmRotation = angleFromElbowToHand + forearmSpriteOffsetAngle;

  // 5. Standard & Adaptive pivot origins based on asset dimensions
  const armOriginX = isSkin2 ? (armNatW * 0.25) : 236;
  const armOriginY = isSkin2 ? (armNatH * 0.29) : 192;
  const forearmOriginX = isSkin2 ? (forearmNatW * 0.14) : 134;
  const forearmOriginY = isSkin2 ? (forearmNatH * 0.29) : 208;
  const elbowJointOriginX = 74;
  const elbowJointOriginY = 54;
  const handOriginX = isSkin2 ? (handNatW * 0.25) : 169;
  const handOriginY = isSkin2 ? (handNatH * 0.50) : 309.5;

  // 6. Draw Upper Arm (Arm.png / arm9.png)
  _drawLimbSegment(ctx, arm, startPtX, startPtY, limbScale * armScaleW, limbScale * armScaleH, armRotation - elbowRotateAngle + armRotOff, armOriginX, armOriginY, isLeft);

  // 7. Draw Forearm (Forearm.png / forearm9.png) connected at Elbow
  const elbowDrawX = elbowPos.x + forearmOffX;
  const elbowDrawY = elbowPos.y + forearmOffY;
  _drawLimbSegment(ctx, forearm, elbowDrawX, elbowDrawY, limbScale * forearmScaleW, limbScale * forearmScaleH, forearmRotation + forearmRotOff, forearmOriginX, forearmOriginY, isLeft);

  // 8. Draw Elbow Joint (ElbowJoint.png) connector if available
  if (_isImageReady(elbowJoint)) {
    _drawLimbSegment(ctx, elbowJoint, elbowDrawX, elbowDrawY, limbScale * forearmScaleW, limbScale * forearmScaleH, 0, elbowJointOriginX, elbowJointOriginY, isLeft);
  }

  // 9. Compute exact wrist cut center of Forearm in canvas space
  const localWristX = (forearmNatW * 0.588) * limbScale * forearmScaleW;
  const localWristY = (isLeft ? -1 : 1) * (forearmNatH * 0.152) * limbScale * forearmScaleH;
  const cosF = Math.cos(forearmRotation + forearmRotOff);
  const sinF = Math.sin(forearmRotation + forearmRotOff);
  const wristX = elbowDrawX + localWristX * cosF - localWristY * sinF;
  const wristY = elbowDrawY + localWristX * sinF + localWristY * cosF;

  // 10. Draw Hand (Hand.png / hands9.png) attached directly to the Forearm at the Wrist with cut-edge alignment
  const handCutAlignment = isLeft ? 0.1515 : -0.1515;
  const handRotation = forearmRotation + forearmRotOff + handCutAlignment + handRotOff;

  if (!hideHands && _isImageReady(hand)) {
    _drawLimbSegment(ctx, hand, wristX + handOffX, wristY + handOffY, limbScale * handScaleW, limbScale * handScaleH, handRotation, handOriginX, handOriginY, isLeft);
  }

  return { x: wristX + handOffX, y: wristY + handOffY };
}

/**
 * Main draw call for Nameless Deity fighter skin.
 * Supports Skin 1 (Cosmic Seraph) and Skin 2 (Golden Seraph Deity) with per-asset customization.
 */
export function drawNamelessDeitySkin(ctx, fighter) {
  const r = fighter.r || 28;
  const rScale = r / 25;
  const gameTimer = (typeof fighter?.wingAnimationTimer === 'number')
    ? fighter.wingAnimationTimer
    : ((typeof state !== 'undefined' && state.gameTime) ? state.gameTime : Date.now() * 0.05);
  const hoverBob = Math.sin(gameTimer * 0.06) * (r * 0.06);

  // Determine active skin variant (Skin 1 Cosmic vs Skin 2 Golden Seraph)
  const skinVariant = fighter?.skinVariant || (typeof state !== 'undefined' ? (state.selectedNamelessDeitySkin || 'skin1') : 'skin1');
  const isSkin2 = (skinVariant === 'skin2' || skinVariant === 'golden');

  // Read per-part and overall studio customization parameters
  const customOverall = (typeof state !== 'undefined' && (state.skinCustomizations?.nameless_deity || state.skinCustomizations?.namelessDeity)) || {};
  const customBody = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_body) || {};
  const customAntlers = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_antlers) || {};
  const customAntlerVines = (typeof state !== 'undefined' && (state.skinCustomizations?.nameless_deity_antler_vines || state.skinCustomizations?.nameless_deity_antlerVines)) || {};
  const customCicada = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_cicada) || {};
  const customCensor = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_censor) || {};
  const customVines = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_vines) || {};
  const customFlowers = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_flowers) || {};
  const customWings = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_wings) || {};
  const customArm = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_arm) || {};
  const customForearm = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_forearm) || {};
  const customHand = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_hand) || {};
  const customHalo = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_halo) || {};
  const customWheel = (typeof state !== 'undefined' && state.skinCustomizations?.nameless_deity_wheel) || {};

  const customParts = {
    arm: customArm,
    forearm: customForearm,
    hand: customHand,
    rScale,
    isSkin2
  };

  const activeDefs = isSkin2 ? NAMELESS_DEITY_SKIN2_DEFAULT_CONFIGS : NAMELESS_DEITY_DEFAULT_CONFIGS;
  const overallDef = activeDefs.overall;
  const bodyDef = activeDefs.body;
  const antlersDef = activeDefs.antlers;
  const antlerVinesDef = activeDefs.antler_vines;
  const cicadaDef = activeDefs.cicada;
  const censorDef = activeDefs.censor;
  const vinesDef = activeDefs.vines;
  const flowersDef = activeDefs.flowers;
  const wingsDef = activeDefs.wings;
  const haloDef = activeDefs.halo;
  const wheelDef = activeDefs.wheel;

  const widthScale = customOverall.widthScale ?? overallDef.widthScale;
  const heightScale = customOverall.heightScale ?? overallDef.heightScale;
  const customOffsetX = customOverall.offsetX ?? overallDef.offsetX;
  const customOffsetY = customOverall.offsetY ?? overallDef.offsetY;
  const customAngleOffset = (customOverall.angleOffset ?? overallDef.angleOffset);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Fixed Upright Orientation: Deity body, wings, halo & arms remain level and upright without tilting when aiming
  if (customAngleOffset !== 0) {
    ctx.rotate(customAngleOffset);
  }
  ctx.translate(customOffsetX * rScale, customOffsetY * rScale);

  // 2. LAYER 0 (VERY BACK HALO): Cosmic Light Circle Starburst Halo + Celestial Glow Bloom
  const cosmicLight = isSkin2 ? _getBlueCosmicLightCenterCanvas() : _getCosmicLightCenterImage();
  if (_isImageReady(cosmicLight)) {
    ctx.imageSmoothingEnabled = true;
    const haloScaleW = widthScale * (customHalo.widthScale ?? haloDef.widthScale);
    const haloScaleH = heightScale * (customHalo.heightScale ?? haloDef.heightScale);
    const haloOffX = (customHalo.offsetX ?? haloDef.offsetX);
    const haloOffY = (customHalo.offsetY ?? haloDef.offsetY);
    const haloAngle = (customHalo.angleOffset ?? haloDef.angleOffset);

    const haloNatH = cosmicLight.naturalHeight || cosmicLight.height || 1254;
    const haloBaseScale = (r * 3.8) / haloNatH;
    const hScaleX = haloBaseScale * haloScaleW;
    const hScaleY = haloBaseScale * haloScaleH;

    ctx.save();
    ctx.translate(haloOffX * rScale, hoverBob + haloOffY * rScale);
    ctx.rotate(haloAngle);

    // Subtle celestial bloom aura (Rule 11 compliant: radial gradient, no shadowBlur)
    const bloomPulse = 0.92 + 0.08 * Math.sin(gameTimer * 0.08);
    const glowRadius = r * 1.85 * Math.max(haloScaleW, haloScaleH) * bloomPulse;
    const bloomGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    if (isSkin2) {
      // Celestial radiant cyan & sapphire blue seraph flare aura
      bloomGrad.addColorStop(0, `rgba(255, 255, 255, ${0.48 * bloomPulse})`);
      bloomGrad.addColorStop(0.25, `rgba(180, 235, 255, ${0.32 * bloomPulse})`);
      bloomGrad.addColorStop(0.55, `rgba(0, 200, 255, ${0.18 * bloomPulse})`);
      bloomGrad.addColorStop(0.80, `rgba(0, 110, 255, ${0.08 * bloomPulse})`);
      bloomGrad.addColorStop(1.0, 'rgba(0, 50, 200, 0)');
    } else {
      // Celestial cosmic starlight aura
      bloomGrad.addColorStop(0, `rgba(255, 255, 255, ${0.35 * bloomPulse})`);
      bloomGrad.addColorStop(0.35, `rgba(255, 245, 215, ${0.18 * bloomPulse})`);
      bloomGrad.addColorStop(0.70, `rgba(180, 215, 255, ${0.08 * bloomPulse})`);
      bloomGrad.addColorStop(1.0, 'rgba(140, 180, 255, 0)');
    }
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = bloomGrad;
    ctx.fill();

    const flarePivotX = 0.5396;
    const flarePivotY = 0.5362;
    _drawAtPivot(ctx, cosmicLight, 0, 0, hScaleX, hScaleY, flarePivotX, flarePivotY);
    ctx.restore();
  }

  // 2.5 LAYER 0.5 (BACK WHEEL): Celestial Clockwork Wheel (Wheel.png or wheel9.png)
  const wheel = isSkin2 ? _getWheel3Image() : _getWheelImage();
  if (_isImageReady(wheel)) {
    ctx.imageSmoothingEnabled = true;
    const wheelScaleW = widthScale * (customWheel.widthScale ?? wheelDef.widthScale);
    const wheelScaleH = heightScale * (customWheel.heightScale ?? wheelDef.heightScale);
    const wheelOffX = (customWheel.offsetX ?? wheelDef.offsetX);
    const wheelOffY = (customWheel.offsetY ?? wheelDef.offsetY);
    const wheelAngle = (customWheel.angleOffset ?? wheelDef.angleOffset);

    const wheelBaseScale = (r * 2.2) / wheel.naturalHeight;
    const wScaleX = wheelBaseScale * wheelScaleW;
    const wScaleY = wheelBaseScale * wheelScaleH;

    ctx.save();
    ctx.translate(wheelOffX * rScale, hoverBob + wheelOffY * rScale);
    ctx.rotate(wheelAngle);
    _drawAtPivot(ctx, wheel, 0, 0, wScaleX, wScaleY, 0.5, 0.5);
    ctx.restore();
  }

  // 2.8 LAYER 0.8 (SIDE FLOWERS): Dual Symmetrical Grayscale / Golden Celestial Lotus Flowers (SideFlower2.png or sideflower9.png)
  const flower = isSkin2 ? _getSideFlower2Image() : _getGraySideFlowerCanvas();
  if (_isImageReady(flower)) {
    ctx.imageSmoothingEnabled = true;
    const flowerScaleW = widthScale * (customFlowers.widthScale ?? flowersDef.widthScale);
    const flowerScaleH = heightScale * (customFlowers.heightScale ?? flowersDef.heightScale);
    const flowerOffX = (customFlowers.offsetX ?? flowersDef.offsetX);
    const flowerOffY = (customFlowers.offsetY ?? flowersDef.offsetY);
    const flowerAngle = (customFlowers.angleOffset ?? flowersDef.angleOffset);

    const flowerNatH = flower.naturalHeight || flower.height || 1199;
    const flowerBaseScale = (r * 1.50) / flowerNatH;
    const flScaleX = flowerBaseScale * flowerScaleW;
    const flScaleY = flowerBaseScale * flowerScaleH;

    const flowerSpacingX = (r * 0.95 * widthScale) + (flowerOffX * rScale);
    const flowerAnchorY = hoverBob - (r * 0.35 * heightScale) + (flowerOffY * rScale);
    const flowerSway = Math.sin(gameTimer * 0.05 + 1.2) * 0.05;

    // Left Side Flower
    ctx.save();
    ctx.translate(-flowerSpacingX, flowerAnchorY);
    ctx.rotate(-flowerAngle + flowerSway);
    _drawAtPivot(ctx, flower, 0, 0, flScaleX, flScaleY, 0.5, 0.5);
    ctx.restore();

    // Right Side Flower (Mirrored)
    ctx.save();
    ctx.translate(flowerSpacingX, flowerAnchorY);
    ctx.scale(-1, 1);
    ctx.rotate(-flowerAngle - flowerSway);
    _drawAtPivot(ctx, flower, 0, 0, flScaleX, flScaleY, 0.5, 0.5);
    ctx.restore();
  }

  // 3. LAYER 1 (BACK): Authentic Wrath of the Gods Wings Animation (Wings.png or Wings9.png)
  const wings = isSkin2 ? _getWings2Image() : _getWingsImage();
  if (_isImageReady(wings)) {
    ctx.imageSmoothingEnabled = true;

    const flapCycleDuration = 48;
    const completion = (gameTimer / flapCycleDuration) % 1.0;

    const wingRotation = _evaluateWingFlapRotation(completion);
    const wingSquish = _evaluateWingSquish(completion);

    const wingScaleW = widthScale * (customWings.widthScale ?? wingsDef.widthScale);
    const wingScaleH = heightScale * (customWings.heightScale ?? wingsDef.heightScale);
    const wingOffX = (customWings.offsetX ?? wingsDef.offsetX);
    const wingOffY = (customWings.offsetY ?? wingsDef.offsetY);
    const wingAngle = (customWings.angleOffset ?? wingsDef.angleOffset);

    const wingsNatH = wings.naturalHeight || wings.height || 852;
    const baseScale = (r * 2.8) / wingsNatH;
    const scaleX = baseScale * 1.35 * wingScaleW;
    const scaleY = baseScale * 1.10 * (1.0 - wingSquish) * wingScaleH;

    const wingAnchorX = (r * 0.65 * wingScaleW) + (wingOffX * rScale);
    const wingAnchorY = hoverBob + (r * 0.20 * wingScaleH) + (wingOffY * rScale);

    // Left Wing
    ctx.save();
    ctx.translate(-wingAnchorX, wingAnchorY);
    ctx.rotate(wingRotation + wingAngle);
    _drawAtPivot(ctx, wings, 0, 0, scaleX, scaleY, 1.0, 0.84);
    ctx.restore();

    // Right Wing (Mirrored)
    ctx.save();
    ctx.translate(wingAnchorX, wingAnchorY);
    ctx.scale(-1, 1);
    ctx.rotate(wingRotation + wingAngle);
    _drawAtPivot(ctx, wings, 0, 0, scaleX, scaleY, 1.0, 0.84);
    ctx.restore();
  }

  // 3.5 LAYER 1.5 (VINES / LOWER BANNERS): Authentic Dual Symmetrical Newspaper Vines (Vines.png / vines9.png for skin2)
  const vines = isSkin2 ? _getVines2Image() : _getVinesImage();
  if (_isImageReady(vines)) {
    ctx.imageSmoothingEnabled = true;
    const vinesScaleW = widthScale * (customVines.widthScale ?? vinesDef.widthScale);
    const vinesScaleH = heightScale * (customVines.heightScale ?? vinesDef.heightScale);
    const vinesOffX = (customVines.offsetX ?? vinesDef.offsetX);
    const vinesOffY = (customVines.offsetY ?? vinesDef.offsetY);
    const vinesAngle = (customVines.angleOffset ?? vinesDef.angleOffset);

    const vinesBaseScale = (r * 2.85) / vines.naturalHeight;
    const vScaleX = vinesBaseScale * vinesScaleW;
    const vScaleY = vinesBaseScale * vinesScaleH;

    const vineSpacingX = (r * 0.28 * widthScale) + (vinesOffX * rScale);
    const vineAnchorY = hoverBob + (r * 0.42 * heightScale) + (vinesOffY * rScale);
    const vineSway = Math.sin(gameTimer * 0.04) * 0.08;
    const outwardAngle = 0.12;

    // Left Vine Banner
    ctx.save();
    ctx.translate(-vineSpacingX, vineAnchorY);
    ctx.rotate(-outwardAngle + vinesAngle + vineSway);
    _drawAtPivot(ctx, vines, 0, 0, vScaleX, vScaleY, 0.5, 0.0);
    ctx.restore();

    // Right Vine Banner (Mirrored)
    ctx.save();
    ctx.translate(vineSpacingX, vineAnchorY);
    ctx.scale(-1, 1);
    ctx.rotate(-outwardAngle - vinesAngle - vineSway);
    _drawAtPivot(ctx, vines, 0, 0, vScaleX, vScaleY, 0.5, 0.0);
    ctx.restore();
  }

  // 4. LAYER 2 (MID): Authentic Divine Body (DivineBody.png / deitybody9.png for skin2) with fallback to simple circle
  const divineBody = isSkin2 ? _getDivineBody2Image() : _getDivineBodyImage();
  if (_isImageReady(divineBody)) {
    ctx.imageSmoothingEnabled = true;
    const bodyScaleW = widthScale * (customBody.widthScale ?? bodyDef.widthScale);
    const bodyScaleH = heightScale * (customBody.heightScale ?? bodyDef.heightScale);
    const bodyOffX = (customBody.offsetX ?? bodyDef.offsetX);
    const bodyOffY = (customBody.offsetY ?? bodyDef.offsetY);
    const bodyAngle = (customBody.angleOffset ?? bodyDef.angleOffset);

    const bodyBaseScale = (r * 2.35) / divineBody.naturalHeight;
    const bScaleX = bodyBaseScale * bodyScaleW;
    const bScaleY = bodyBaseScale * bodyScaleH;

    ctx.save();
    ctx.translate(bodyOffX * rScale, hoverBob + bodyOffY * rScale);
    ctx.rotate(bodyAngle);
    _drawAtPivot(ctx, divineBody, 0, 0, bScaleX, bScaleY, isSkin2 ? 0.5056 : 0.5, isSkin2 ? 0.4358 : 0.5);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(0, hoverBob, r, 0, Math.PI * 2);
    ctx.fillStyle = fighter.color || (isSkin2 ? '#FFD700' : '#00F0FF');
    ctx.fill();
  }

  // 4.1 LAYER 2.1 (ANTLERS / SACRED HEAD CROWN): Authentic Sacred Deity Antlers (Antlers1.png / antlers9.png)
  const antlers = isSkin2 ? _getAntlers2Image() : _getAntlersImage();
  if (_isImageReady(antlers)) {
    ctx.imageSmoothingEnabled = true;
    const antlersScaleW = widthScale * (customAntlers.widthScale ?? antlersDef.widthScale);
    const antlersScaleH = heightScale * (customAntlers.heightScale ?? antlersDef.heightScale);
    const antlersOffX = (customAntlers.offsetX ?? antlersDef.offsetX);
    const antlersOffY = (customAntlers.offsetY ?? antlersDef.offsetY);
    const antlersAngle = (customAntlers.angleOffset ?? antlersDef.angleOffset);
    const antlersGap = (customAntlers.gap ?? antlersDef.gap ?? 0) * rScale;

    const antlersNatW = antlers.naturalWidth || 1536;
    const antlersNatH = antlers.naturalHeight || 1024;
    const halfNatW = antlersNatW / 2;
    const antlersBaseScale = (r * 3.4) / antlersNatW;
    const aScaleX = antlersBaseScale * antlersScaleW;
    const aScaleY = antlersBaseScale * antlersScaleH;
    const halfDrawW = halfNatW * aScaleX;
    const drawH = antlersNatH * aScaleY;

    const anchorX = antlersOffX * rScale;
    const anchorY = hoverBob - (r * 0.40 * heightScale) + (antlersOffY * rScale);

    if (antlersGap === 0) {
      ctx.save();
      ctx.translate(anchorX, anchorY);
      ctx.rotate(antlersAngle);
      _drawAtPivot(ctx, antlers, 0, 0, aScaleX, aScaleY, 0.5, 0.95);
      ctx.restore();
    } else {
      // Symmetrical Dual Antler Split: Left Antler and Right Antler separated by gap
      // Left Antler (sx: 0, sy: 0, sw: halfNatW, sh: antlersNatH)
      ctx.save();
      ctx.translate(anchorX - antlersGap, anchorY);
      ctx.rotate(antlersAngle);
      ctx.drawImage(antlers, 0, 0, halfNatW, antlersNatH, -halfDrawW, -drawH * 0.95, halfDrawW, drawH);
      ctx.restore();

      // Right Antler (sx: halfNatW, sy: 0, sw: halfNatW, sh: antlersNatH)
      ctx.save();
      ctx.translate(anchorX + antlersGap, anchorY);
      ctx.rotate(antlersAngle);
      ctx.drawImage(antlers, halfNatW, 0, halfNatW, antlersNatH, 0, -drawH * 0.95, halfDrawW, drawH);
      ctx.restore();
    }
  }

  // 4.15 LAYER 2.15 (ANTLER HANGING VINES): Authentic Vines attached to Antler Branches (Vines1.png) - Skin 2 only
  if (isSkin2) {
    const antlerVines = _getAntlerVinesImage();
    if (_isImageReady(antlerVines)) {
      ctx.imageSmoothingEnabled = true;
      const avScaleW = widthScale * (customAntlerVines.widthScale ?? antlerVinesDef.widthScale);
      const avScaleH = heightScale * (customAntlerVines.heightScale ?? antlerVinesDef.heightScale);
      const avOffX = (customAntlerVines.offsetX ?? antlerVinesDef.offsetX);
      const avOffY = (customAntlerVines.offsetY ?? antlerVinesDef.offsetY);
      const avAngle = (customAntlerVines.angleOffset ?? antlerVinesDef.angleOffset);

      const antlersScaleW = widthScale * (customAntlers.widthScale ?? antlersDef.widthScale);
      const antlersScaleH = heightScale * (customAntlers.heightScale ?? antlersDef.heightScale);
      const antlersOffX = (customAntlers.offsetX ?? antlersDef.offsetX);
      const antlersOffY = (customAntlers.offsetY ?? antlersDef.offsetY);
      const antlersAngle = (customAntlers.angleOffset ?? antlersDef.angleOffset);
      const antlersGap = (customAntlers.gap ?? antlersDef.gap ?? 0) * rScale;

      const avNatH = antlerVines.naturalHeight || antlerVines.height || 710;
      const avBaseScale = (r * 1.85) / avNatH;
      const avScaleX = avBaseScale * avScaleW;
      const avScaleY = avBaseScale * avScaleH;

      const anchorX = antlersOffX * rScale;
      const anchorY = hoverBob - (r * 0.40 * heightScale) + (antlersOffY * rScale);
      const vineSpacingX = (r * 0.90 * antlersScaleW) + antlersGap + (avOffX * rScale);
      const vineAnchorY = anchorY - (r * 0.45 * antlersScaleH) + (avOffY * rScale);
      const avSway = Math.sin(gameTimer * 0.045 + 0.8) * 0.06;

      // Left Antler Vine
      ctx.save();
      ctx.translate(anchorX - vineSpacingX, vineAnchorY);
      ctx.rotate(antlersAngle + avAngle + avSway);
      _drawAtPivot(ctx, antlerVines, 0, 0, avScaleX, avScaleY, 0.5, 0.0);
      ctx.restore();

      // Right Antler Vine (Mirrored)
      ctx.save();
      ctx.translate(anchorX + vineSpacingX, vineAnchorY);
      ctx.scale(-1, 1);
      ctx.rotate(antlersAngle - avAngle - avSway);
      _drawAtPivot(ctx, antlerVines, 0, 0, avScaleX, avScaleY, 0.5, 0.0);
      ctx.restore();
    }
  }

  // 4.2 LAYER 2.2 (CICADA / CHEST BROOCH / CROWN): Authentic Cicada Brooch (Cicada.png) - Skin 1 only
  if (!isSkin2) {
    const cicada = _getCicadaImage();
    if (_isImageReady(cicada)) {
      ctx.imageSmoothingEnabled = true;
      const cicadaScaleW = widthScale * (customCicada.widthScale ?? cicadaDef.widthScale);
      const cicadaScaleH = heightScale * (customCicada.heightScale ?? cicadaDef.heightScale);
      const cicadaOffX = (customCicada.offsetX ?? cicadaDef.offsetX);
      const cicadaOffY = (customCicada.offsetY ?? cicadaDef.offsetY);
      const cicadaAngle = (customCicada.angleOffset ?? cicadaDef.angleOffset);

      const cicadaBaseScale = (r * 1.65) / cicada.naturalHeight;
      const ciScaleX = cicadaBaseScale * cicadaScaleW;
      const ciScaleY = cicadaBaseScale * cicadaScaleH;

      ctx.save();
      ctx.translate(cicadaOffX * rScale, hoverBob - (r * 0.45 * heightScale) + (cicadaOffY * rScale));
      ctx.rotate(cicadaAngle);
      _drawAtPivot(ctx, cicada, 0, 0, ciScaleX, ciScaleY, 0.5, 0.5);
      ctx.restore();
    }
  }

  // 4.5 LAYER 2.5 (CENSOR / TAPED SKETCH NOTE): Authentic Taped Sketch Note (Censor.png) - Skin 1 only
  if (!isSkin2) {
    const censor = _getCensorImage();
    if (_isImageReady(censor)) {
      ctx.imageSmoothingEnabled = true;
      const censorScaleW = widthScale * (customCensor.widthScale ?? censorDef.widthScale);
      const censorScaleH = heightScale * (customCensor.heightScale ?? censorDef.heightScale);
      const censorOffX = (customCensor.offsetX ?? censorDef.offsetX);
      const censorOffY = (customCensor.offsetY ?? censorDef.offsetY);
      const censorAngle = (customCensor.angleOffset ?? censorDef.angleOffset);

      const censorBaseScale = (r * 1.85) / censor.naturalHeight;
      const cScaleX = censorBaseScale * censorScaleW;
      const cScaleY = censorBaseScale * censorScaleH;

      ctx.save();
      ctx.translate(censorOffX * rScale, hoverBob - (r * 0.10 * heightScale) + (censorOffY * rScale));
      ctx.rotate(censorAngle);
      _drawAtPivot(ctx, censor, 0, 0, cScaleX, cScaleY, 0.5, 0.5);
      ctx.restore();
    }
  }

  // 4. LAYER 3 (FRONT - LIMBS): Authentic Arm + Forearm + Hand IK Chain (Arm.png/arm9.png + Forearm.png/forearm9.png + Hand.png/hands9.png)
  const arm = isSkin2 ? _getArm5Image() : _getArmImage();
  const forearm = isSkin2 ? _getForearm2Image() : _getForearmImage();
  const elbowJoint = _getElbowJointImage();
  const hand = isSkin2 ? _getHand2Image() : _getHandImage();
  const shouldHideHands = Boolean(typeof state !== 'undefined' && state.showSkinOnly);

  // Natural outstretched hover anchors based on DefaultUniversalHandMotion in WOTG
  const handBob = Math.sin(gameTimer * 0.05) * (r * 0.08);
  const defaultHandX = r * 2.10 * widthScale;
  const defaultHandY = hoverBob + r * 0.12 * heightScale + handBob;

  let leftWristPos = { x: -defaultHandX, y: defaultHandY };
  let rightWristPos = { x: defaultHandX, y: defaultHandY };

  if (_isImageReady(arm) && _isImageReady(forearm)) {
    ctx.imageSmoothingEnabled = true;
    const limbScale = (r * 2.30 * widthScale) / (arm.naturalWidth || 950);

    const shoulderX = r * 0.48 * widthScale;
    const shoulderY = hoverBob + r * 0.16 * heightScale;

    // Left Arm + Forearm + Hand Chain (side = -1)
    leftWristPos = _drawNamelessLimb(ctx, arm, forearm, elbowJoint, hand, -shoulderX, shoulderY, -defaultHandX, defaultHandY, limbScale, -1, shouldHideHands, customParts);

    // Right Arm + Forearm + Hand Chain (side = 1)
    rightWristPos = _drawNamelessLimb(ctx, arm, forearm, elbowJoint, hand, shoulderX, shoulderY, defaultHandX, defaultHandY, limbScale, 1, shouldHideHands, customParts);
  }

  ctx.restore();
}





