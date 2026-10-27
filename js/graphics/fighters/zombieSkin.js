// ─────────────────────────────────────────────
// ZOMBIE FIGHTER SKIN & BODY MODEL (Plants vs. Zombies)
// Adheres strictly to:
// - Rule 19: Upright Front POV orientation (-Y top, +Y bottom, ctx.scale(1, -1) when facing left)
// - Rule 20: Canonical Default Model Hand Positioning & Weapon Wielding (Symmetrical ±0.82r, +0.38r)
// - Rule 21: drawBody(ctx) implementation and overhead HP hooks
// - Rule 22: Mandatory Hair & Head Asset Model Import (Assets/model/zombie/zombie-hair.png)
// - Rule 24: Universal Character Body Model & Scale Standard (Toji Reference Baseline)
// - Rule 2.2: Prohibition of shadowBlur CPU filters
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

// ─────────────────────────────────────────────
// ASSET LOADERS (Module-Level Eager Caches)
// ─────────────────────────────────────────────

let _zombieHairImage = null;
let _zombieHairLoading = false;
let _zombieWalkSheet = null;
let _zombieWalkLoading = false;
let _zombieAttackSheet = null;
let _zombieAttackLoading = false;
let _zombieConeImage = null;
let _zombieConeLoading = false;
let _zombieBucketImage = null;
let _zombieBucketLoading = false;
let _zombieGravestoneImage = null;
let _zombieGravestoneLoading = false;
let _zombieFlagImage = null;
let _zombieFlagLoading = false;
let _zombieScreenDoorImage = null;
let _zombieScreenDoorLoading = false;
let _zombieNewspaperImage = null;
let _zombieNewspaperLoading = false;
let _zombiePoleImage = null;
let _zombiePoleLoading = false;
let _zombieFootballHelmetImage = null;
let _zombieFootballHelmetLoading = false;
let _zombieTrophyImage = null;
let _zombieTrophyLoading = false;

function _loadImage(src, current, setLoading) {
  if (current && current.complete && current.naturalWidth > 0) return current;
  if (typeof Image === 'undefined') return null;
  setLoading(true);
  const img = new Image();
  img.onload = () => setLoading(false);
  img.onerror = () => setLoading(false);
  img.src = src;
  return img;
}

export function _getZombieHairImage() {
  if (_zombieHairImage && _zombieHairImage.complete && _zombieHairImage.naturalWidth > 0) return _zombieHairImage;
  if (!_zombieHairLoading && typeof Image !== 'undefined') {
    _zombieHairImage = _loadImage('Assets/model/zombie/zombie-hair.png?v=1', _zombieHairImage, (v) => { _zombieHairLoading = v; });
  }
  return _zombieHairImage;
}

export function _getZombieWalkSheet() {
  if (_zombieWalkSheet && _zombieWalkSheet.complete && _zombieWalkSheet.naturalWidth > 0) return _zombieWalkSheet;
  if (!_zombieWalkLoading && typeof Image !== 'undefined') {
    _zombieWalkSheet = _loadImage('Assets/model/zombie/zombie-walk-sprite-sheet.png?v=1', _zombieWalkSheet, (v) => { _zombieWalkLoading = v; });
  }
  return _zombieWalkSheet;
}

export function _getZombieAttackSheet() {
  if (_zombieAttackSheet && _zombieAttackSheet.complete && _zombieAttackSheet.naturalWidth > 0) return _zombieAttackSheet;
  if (!_zombieAttackLoading && typeof Image !== 'undefined') {
    _zombieAttackSheet = _loadImage('Assets/model/zombie/zombie-attack-sprite-sheet.png?v=1', _zombieAttackSheet, (v) => { _zombieAttackLoading = v; });
  }
  return _zombieAttackSheet;
}

export function _getZombieConeImage() {
  if (_zombieConeImage && _zombieConeImage.complete && _zombieConeImage.naturalWidth > 0) return _zombieConeImage;
  if (!_zombieConeLoading && typeof Image !== 'undefined') {
    _zombieConeImage = _loadImage('Assets/model/zombie/zombie-cone.png?v=1', _zombieConeImage, (v) => { _zombieConeLoading = v; });
  }
  return _zombieConeImage;
}

export function _getZombieBucketImage() {
  if (_zombieBucketImage && _zombieBucketImage.complete && _zombieBucketImage.naturalWidth > 0) return _zombieBucketImage;
  if (!_zombieBucketLoading && typeof Image !== 'undefined') {
    _zombieBucketImage = _loadImage('Assets/model/zombie/zombie-bucket.png?v=1', _zombieBucketImage, (v) => { _zombieBucketLoading = v; });
  }
  return _zombieBucketImage;
}

export function _getZombieGravestoneImage() {
  if (_zombieGravestoneImage && _zombieGravestoneImage.complete && _zombieGravestoneImage.naturalWidth > 0) return _zombieGravestoneImage;
  if (!_zombieGravestoneLoading && typeof Image !== 'undefined') {
    _zombieGravestoneImage = _loadImage('Assets/model/zombie/zombie-gravestone.png?v=1', _zombieGravestoneImage, (v) => { _zombieGravestoneLoading = v; });
  }
  return _zombieGravestoneImage;
}

export function _getZombieFlagImage() {
  if (_zombieFlagImage && _zombieFlagImage.complete && _zombieFlagImage.naturalWidth > 0) return _zombieFlagImage;
  if (!_zombieFlagLoading && typeof Image !== 'undefined') {
    _zombieFlagImage = _loadImage('Assets/model/zombie/zombie-flag.png?v=1', _zombieFlagImage, (v) => { _zombieFlagLoading = v; });
  }
  return _zombieFlagImage;
}

export function _getZombieScreenDoorImage() {
  if (_zombieScreenDoorImage && _zombieScreenDoorImage.complete && _zombieScreenDoorImage.naturalWidth > 0) return _zombieScreenDoorImage;
  if (!_zombieScreenDoorLoading && typeof Image !== 'undefined') {
    _zombieScreenDoorImage = _loadImage('Assets/model/zombie/zombie-screendoor.png?v=1', _zombieScreenDoorImage, (v) => { _zombieScreenDoorLoading = v; });
  }
  return _zombieScreenDoorImage;
}

export function _getZombieNewspaperImage() {
  if (_zombieNewspaperImage && _zombieNewspaperImage.complete && _zombieNewspaperImage.naturalWidth > 0) return _zombieNewspaperImage;
  if (!_zombieNewspaperLoading && typeof Image !== 'undefined') {
    _zombieNewspaperImage = _loadImage('Assets/model/zombie/zombie-newspaper.png?v=1', _zombieNewspaperImage, (v) => { _zombieNewspaperLoading = v; });
  }
  return _zombieNewspaperImage;
}

export function _getZombiePoleImage() {
  if (_zombiePoleImage && _zombiePoleImage.complete && _zombiePoleImage.naturalWidth > 0) return _zombiePoleImage;
  if (!_zombiePoleLoading && typeof Image !== 'undefined') {
    _zombiePoleImage = _loadImage('Assets/model/zombie/zombie-pole.png?v=1', _zombiePoleImage, (v) => { _zombiePoleLoading = v; });
  }
  return _zombiePoleImage;
}

export function _getZombieFootballHelmetImage() {
  if (_zombieFootballHelmetImage && _zombieFootballHelmetImage.complete && _zombieFootballHelmetImage.naturalWidth > 0) return _zombieFootballHelmetImage;
  if (!_zombieFootballHelmetLoading && typeof Image !== 'undefined') {
    _zombieFootballHelmetImage = _loadImage('Assets/model/zombie/zombie-football-helmet.png?v=1', _zombieFootballHelmetImage, (v) => { _zombieFootballHelmetLoading = v; });
  }
  return _zombieFootballHelmetImage;
}

export function _getZombieTrophyImage() {
  if (_zombieTrophyImage && _zombieTrophyImage.complete && _zombieTrophyImage.naturalWidth > 0) return _zombieTrophyImage;
  if (!_zombieTrophyLoading && typeof Image !== 'undefined') {
    _zombieTrophyImage = _loadImage('Assets/model/zombie/zombie-trophy.png?v=1', _zombieTrophyImage, (v) => { _zombieTrophyLoading = v; });
  }
  return _zombieTrophyImage;
}

// Proactive eager initialization in browser environments
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getZombieHairImage();
  _getZombieWalkSheet();
  _getZombieAttackSheet();
  _getZombieConeImage();
  _getZombieBucketImage();
  _getZombieGravestoneImage();
  _getZombieFlagImage();
  _getZombieScreenDoorImage();
  _getZombieNewspaperImage();
  _getZombiePoleImage();
  _getZombieFootballHelmetImage();
  _getZombieTrophyImage();
}

/**
 * Draws Zombie's iconic three black wiry hair strands from Assets/model/zombie/zombie-hair.png (Rule 22).
 */
export function _drawZombieHair(ctx, r, facingLeft = false) {
  const hairImg = _getZombieHairImage();
  if (hairImg && hairImg.complete && hairImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.zombie) || {};
    const wMult = custom.widthScale ?? 1.0;
    const hMult = custom.heightScale ?? 1.0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? 0;
    const rot = custom.angleOffset ?? 0;
    const flipX = custom.flipX ? -1 : 1;
    const flipY = custom.flipY ? -1 : 1;

    // zombie-hair.png is 512x512 with crown apex at Y ~ 70 to 180, center at 256
    const targetHairWidth = r * 2.40 * wMult;
    const targetHairHeight = r * 1.80 * hMult;
    const scaleX = targetHairWidth / 256;
    const scaleY = targetHairHeight / 256;
    const drawW = 512 * scaleX;
    const drawH = 512 * scaleY;
    const drawX = -drawW / 2 + offX;
    const drawY = -r * 1.25 - 40 * scaleY + offY;

    if (rot !== 0 || flipX !== 1 || flipY !== 1) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      if (rot !== 0) ctx.rotate(rot);
      if (flipX !== 1 || flipY !== 1) ctx.scale(flipX, flipY);
      ctx.drawImage(hairImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(hairImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }
}

/**
 * Draws Zombie's hand/fist in clean pixel art style with rotten zombie skin tone (Rule 20).
 */
export function drawZombieFist(ctx, x, y, radius, skinColor = '#8B9B7E') {
  ctx.save();
  ctx.translate(x, y);
  drawPixelHand(ctx, 0, 0, radius, skinColor);
  ctx.restore();
}

let _cachedZombieBodyCanvas = null;
let _cachedZombieBodyR = 0;

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache - Rule 24 Toji standard).
 * Zone 1: Rotten grey-green zombie skin with forehead suture scar
 * Zone 2: Tattered brown business suit jacket with white collared shirt & red tie
 * Zone 3: Dark belt line
 * Zone 4: Ragged blue trousers/jeans with exposed knee bone
 */
function _renderZombiePixelBodyToCanvas(destCtx, r) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor boundary test for clean 1-pixel outer manga ink outline
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        destCtx.fillStyle = '#0E0F14';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // ──────────────────────────────────────────
      // ZONE 1: Face & Scalp Dome (ry < r * 0.28)
      // ──────────────────────────────────────────
      if (ry < r * 0.28) {
        let col = '#8B9B7E'; // Rotten olive/grey-green zombie skin

        // Cheek contour
        if (Math.abs(rx) > r * 0.70) {
          col = '#708064';
        }
        // Forehead highlight
        else if (ry < -r * 0.20 && Math.abs(rx) < r * 0.45) {
          col = '#A3B899';
        }

        // Forehead suture scar stitch (rx in [-r * 0.35, -r * 0.05])
        if (rx >= -r * 0.35 && rx <= -r * 0.05 && Math.abs(ry - (-r * 0.35 + (rx + r * 0.35) * 0.4)) <= P * 0.8) {
          col = '#2E3827';
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Brown Business Suit Jacket & Red Tie (r * 0.28 <= ry < r * 0.68)
      // ──────────────────────────────────────────
      else if (ry < r * 0.68) {
        // Red tie down center ( |rx| <= r * 0.14 )
        if (Math.abs(rx) <= r * 0.12 && ry >= r * 0.32 && ry <= r * 0.64) {
          destCtx.fillStyle = '#DC2626'; // Red necktie
        }
        // White collared shirt V-neck
        else if (Math.abs(rx) <= r * 0.26 && ry < r * 0.44) {
          destCtx.fillStyle = '#F8FAFC'; // White shirt
        }
        // Suit lapels & shadows
        else if (Math.abs(rx) < r * 0.36 && ry > r * 0.42) {
          destCtx.fillStyle = '#4A342B'; // Deep jacket shadow
        } else {
          destCtx.fillStyle = '#5D4037'; // Tattered brown suit fabric
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: Belt Band (r * 0.68 <= ry < r * 0.78)
      // ──────────────────────────────────────────
      else if (ry < r * 0.78) {
        if (Math.abs(rx) <= r * 0.16) {
          destCtx.fillStyle = '#D97706'; // Dull brass belt buckle
        } else {
          destCtx.fillStyle = '#1E293B'; // Dark leather belt
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 4: Ragged Blue Trousers & Exposed Bone (ry >= r * 0.78)
      // ──────────────────────────────────────────
      else {
        // Exposed knee bone on left knee (rx in [-r * 0.40, -r * 0.15], ry >= r * 0.85)
        if (rx >= -r * 0.38 && rx <= -r * 0.16 && ry >= r * 0.84) {
          destCtx.fillStyle = '#E2E8F0'; // Exposed white leg bone
        } else if (Math.abs(rx) < P * 0.7) {
          destCtx.fillStyle = '#0F172A'; // Fly seam split
        } else {
          destCtx.fillStyle = '#1E3A8A'; // Blue ragged jeans fabric
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Main Zombie Skin Rendering Pipeline
 * Supports both:
 * 1. Animated Full PvZ Sprite Sheet (Walk cycles and Chomp/Bite attacks)
 * 2. Procedural Toji-standard body circle fallback & studio customizer
 * Overlays traffic cone or bucket headgear when armor is active.
 */
/**
 * Sprite Hat Renderers tailored for Circle Head Geometry
 */
export function _drawZombieConeHat(ctx, r) {
  const coneImg = _getZombieConeImage();
  if (coneImg && coneImg.complete && coneImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const coneW = r * 2.3;
    const coneH = r * 2.3;
    ctx.drawImage(coneImg, -coneW / 2 + 1, -r * 1.85, coneW, coneH);
    ctx.restore();
  } else {
    // Pixel cone fallback
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.85);
    ctx.lineTo(r * 0.9, -r * 0.65);
    ctx.lineTo(-r * 0.9, -r * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function _drawZombieBucketHat(ctx, r) {
  const bktImg = _getZombieBucketImage();
  if (bktImg && bktImg.complete && bktImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const bktW = r * 2.4;
    const bktH = r * 2.4;
    ctx.drawImage(bktImg, -bktW / 2 + 1, -r * 1.55, bktW, bktH);
    ctx.restore();
  } else {
    // Pixel bucket fallback
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-r * 0.95, -r * 1.50, r * 1.9, r * 1.1);
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 2;
    ctx.strokeRect(-r * 0.95, -r * 1.50, r * 1.9, r * 1.1);
  }
}

export function _drawZombieFootballHelmetHat(ctx, r) {
  const helmetImg = _getZombieFootballHelmetImage();
  if (helmetImg && helmetImg.complete && helmetImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const helmW = r * 2.4;
    const helmH = r * 2.4;
    ctx.drawImage(helmetImg, -helmW / 2, -r * 1.45, helmW, helmH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(0, -r * 0.45, r * 0.95, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * Main Zombie Skin Rendering Pipeline
 * Uses 100% Circle Mini-Battle Canonical Circle Body Model & Layered Sprite Hats:
 * - Layer 1: Circular pixel body (4-neighbor manga outline, rotting green skin, suit, tie, jeans, bone)
 * - Layer 2: 3 wiry black hair strands asset (zombie-hair.png)
 * - Layer 3: Symmetrical canonical hands (±0.82r, +0.38r)
 * - Layer 4: Tailored Sprite Hats (Conehead / Buckethead / Football Helmet)
 */
export function drawZombieSkin(ctx, fighter) {
  if (!ctx || !fighter) return;

  const r = fighter.r || fighter.radius || 25;
  const isWinnerReveal = Boolean(fighter._isWinnerReveal);
  const angle = isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(angle);

  const facingLeft = !isWinnerReveal && Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 1. Procedural Pixel Body Circle (Toji reference baseline standard - Rule 24)
  const P = 2.0;
  const intR = Math.round(r);
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;

  if (!_cachedZombieBodyCanvas || _cachedZombieBodyR !== intR) {
    _cachedZombieBodyR = intR;
    _cachedZombieBodyCanvas = document.createElement('canvas');
    _cachedZombieBodyCanvas.width = size;
    _cachedZombieBodyCanvas.height = size;
    const bCtx = _cachedZombieBodyCanvas.getContext('2d');
    _renderZombiePixelBodyToCanvas(bCtx, intR);
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_cachedZombieBodyCanvas, -size / 2, -size / 2);
  ctx.restore();

  // 2. Layer 2: Dedicated Zombie 3-Hair Strands Asset (Rule 22)
  _drawZombieHair(ctx, r, facingLeft);

  // 3. Layer 3: Canonical Symmetrical Default Model Hands (Rule 20)
  const handRadius = getHandSize ? getHandSize(r * 0.30) : (r * 0.30);
  const leftHandX = -r * 0.82;
  const rightHandX = +r * 0.82;
  const handsY = +r * 0.38;

  // Main hand (Right Hand) & Off hand (Left Hand)
  drawZombieFist(ctx, rightHandX, handsY, handRadius, '#8B9B7E');
  drawZombieFist(ctx, leftHandX, handsY, handRadius, '#8B9B7E');

  // 4. Layer 4: Tailored Sprite Hats
  if (fighter.armorType === 'bucket' || fighter.bucketArmorActive || fighter.variety === 'buckethead') {
    _drawZombieBucketHat(ctx, r);
  } else if (fighter.armorType === 'cone' || fighter.coneArmorActive || fighter.variety === 'conehead') {
    _drawZombieConeHat(ctx, r);
  } else if (fighter.variety === 'football') {
    _drawZombieFootballHelmetHat(ctx, r);
  }

  // Red Skull Flag Held in Hand during Ultimate or Flag March
  if (fighter.isFlagActive || fighter.isInUltimate) {
    const flagImg = _getZombieFlagImage();
    if (flagImg && flagImg.complete && flagImg.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const flagW = r * 2.8;
      const flagH = r * 2.8;
      ctx.drawImage(flagImg, rightHandX - 8, handsY - flagH + 12, flagW, flagH);
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Standard engine hook for body drawing.
 */
export function drawZombiePixelBody(ctx, r) {
  const P = 2.0;
  const intR = Math.round(r);
  const steps = Math.ceil((intR + P) / P);
  const size = (steps * 2 + 1) * P;

  if (!_cachedZombieBodyCanvas || _cachedZombieBodyR !== intR) {
    _cachedZombieBodyR = intR;
    _cachedZombieBodyCanvas = document.createElement('canvas');
    _cachedZombieBodyCanvas.width = size;
    _cachedZombieBodyCanvas.height = size;
    const bCtx = _cachedZombieBodyCanvas.getContext('2d');
    _renderZombiePixelBodyToCanvas(bCtx, intR);
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_cachedZombieBodyCanvas, -size / 2, -size / 2);
  ctx.restore();
}
