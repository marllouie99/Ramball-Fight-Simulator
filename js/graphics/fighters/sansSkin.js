// ─────────────────────────────────────────────
// Sans the Skeleton Fighter Skin & Body Model
// Adhering to Rule 19 (Upright Front POV),
// Rule 20 (Symmetrical Lower-Flank Hands),
// Rule 11 (Zero shadowBlur), and Rule 3.5 (Discrete Offscreen Cache)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { isSuppressedByGetsuga } from '../../entities/fighter.js';

// ── Cache for offscreen discrete rasterization ──
let _cachedSansCanvas = null;
let _cachedSansR = 0;
let _cachedSansEyeMode = false;
let _cachedSansSweat = 0;

/**
 * Renders Sans's discrete pixel art body into an axis-aligned offscreen canvas.
 * Fixed discrete grid unit P = 2.0px with 4-neighbor manga ink outline.
 */
function _renderSansPixelBodyToCanvas(destCtx, r, eyeActive = false, sweatLevel = 0) {
  destCtx.imageSmoothingEnabled = false;
  const P = 2.0;
  const steps = Math.ceil((r + P) / P);
  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // 4-neighbor attached boundary test for solid dark manga ink outline (#0E0F14)
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

      // ──────────────────────────────────────────────────
      // 1. SKELETON SKULL & FACE (ry < +r * 0.15)
      // ──────────────────────────────────────────────────
      if (ry < r * 0.15) {
        // Eye socket geometry (Left socket: rx ~ -r * 0.28, Right socket: rx ~ +r * 0.28, ry ~ -r * 0.12)
        const eyeY = -r * 0.12;
        const leftEyeX = -r * 0.28;
        const rightEyeX = r * 0.28;
        const eyeRadius = r * 0.17;

        const distLeftEye = Math.hypot(rx - leftEyeX, ry - eyeY);
        const distRightEye = Math.hypot(rx - rightEyeX, ry - eyeY);

        const isLeftSocket = distLeftEye <= eyeRadius;
        const isRightSocket = distRightEye <= eyeRadius;

        // Nasal cavity: small inverted triangle cavity at center (rx ~ 0, ry ~ -r * 0.02)
        const isNasalCavity = (ry >= -r * 0.04 && ry <= r * 0.01 && Math.abs(rx) <= (0.01 - (ry - (-r * 0.04))) * 0.6 * r + P);

        // Smile / Teeth line: stepped white teeth with dark separators (ry: +r * 0.05 to +r * 0.14)
        const isSmileZone = (ry >= r * 0.04 && ry <= r * 0.13 && Math.abs(rx) <= r * 0.44);

        if (isLeftSocket) {
          if (eyeActive) {
            // Bad Time Flashing Eye (Left Socket glowing core)
            if (distLeftEye <= eyeRadius * 0.55) {
              destCtx.fillStyle = '#FFFFFF';
            } else if (distLeftEye <= eyeRadius * 0.85) {
              destCtx.fillStyle = '#00F5FF';
            } else {
              destCtx.fillStyle = '#FFE600';
            }
          } else {
            // Default: Black socket with small white pupil dot
            const isPupil = Math.hypot(rx - leftEyeX, ry - eyeY) <= P * 0.75;
            destCtx.fillStyle = isPupil ? '#FFFFFF' : '#0E0F14';
          }
          destCtx.fillRect(px, py, P, P);
        } else if (isRightSocket) {
          // Right socket: classic black cavity with small white pupil dot
          const isPupil = Math.hypot(rx - rightEyeX, ry - eyeY) <= P * 0.75;
          destCtx.fillStyle = isPupil ? '#FFFFFF' : '#0E0F14';
          destCtx.fillRect(px, py, P, P);
        } else if (isNasalCavity) {
          destCtx.fillStyle = '#0E0F14';
          destCtx.fillRect(px, py, P, P);
        } else if (isSmileZone) {
          // Teeth grill: stepped tooth slots with dark separator vertical lines
          const toothIndex = Math.floor((rx + r * 0.44) / (P * 2.0));
          const isToothDivider = (toothIndex % 2 === 1) && (ry >= r * 0.06 && ry <= r * 0.11);
          const isSmileOutline = (ry >= r * 0.12 || Math.abs(rx) >= r * 0.40);

          if (isToothDivider || isSmileOutline) {
            destCtx.fillStyle = '#0E0F14';
          } else {
            destCtx.fillStyle = '#FFFFFF';
          }
          destCtx.fillRect(px, py, P, P);
        } else {
          // Solid Bone Tone with Stepped Volumetric Shading
          let boneColor = '#FFFFFF';
          if (ry < -r * 0.75) {
            boneColor = '#FFFFFF'; // Crown glint
          } else if (ry < -r * 0.45) {
            boneColor = '#F8FAFC'; // Forehead dome
          } else if (Math.abs(rx) > r * 0.70) {
            boneColor = '#E2E8F0'; // Cheekbone / temple shadow
          } else if (ry > r * 0.08) {
            boneColor = '#CBD5E1'; // Lower jaw shadow
          }
          destCtx.fillStyle = boneColor;
          destCtx.fillRect(px, py, P, P);
        }
      }
      // ──────────────────────────────────────────────────
      // 2. FLUFFY HOOD COLLAR (ry >= +r * 0.15 && ry < +r * 0.32)
      // ──────────────────────────────────────────────────
      else if (ry < r * 0.32) {
        // Large fluffy collar framing the neck
        const isOuterFleece = Math.abs(rx) > r * 0.35 || ry < r * 0.20;
        let fleeceColor = '#E2E8F0';
        if (ry < r * 0.20 && Math.abs(rx) < r * 0.30) {
          fleeceColor = '#F1F5F9'; // Top fleece highlight
        } else if (isOuterFleece) {
          fleeceColor = '#CBD5E1'; // Mid fleece fluff
        } else {
          fleeceColor = '#94A3B8'; // Deep neck shadow
        }
        destCtx.fillStyle = fleeceColor;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────────────
      // 3. BLUE HOODIE & WHITE UNDERSHIRT (ry >= +r * 0.32 && ry < +r * 0.70)
      // ──────────────────────────────────────────────────
      else if (ry < r * 0.70) {
        // Center V-opening displaying white undershirt (Math.abs(rx) <= r * 0.24)
        const shirtHalfW = r * 0.22 - (ry - r * 0.32) * 0.05;
        const isWhiteShirt = Math.abs(rx) <= Math.max(P * 1.5, shirtHalfW);

        if (isWhiteShirt) {
          let shirtCol = '#FFFFFF';
          if (ry > r * 0.55) {
            shirtCol = '#E2E8F0'; // Lower torso fold shadow
          }
          destCtx.fillStyle = shirtCol;
        } else {
          // Royal Blue Hoodie Jacket
          let hoodieCol = '#2563EB'; // Royal Blue Base
          if (Math.abs(rx) > r * 0.72 || ry > r * 0.62) {
            hoodieCol = '#1D4ED8'; // Lateral rib / lower hem shadow
          } else if (Math.abs(rx) < shirtHalfW + P * 1.5) {
            hoodieCol = '#1E3A8A'; // Zipper seam / dark inner lapel
          } else if (ry < r * 0.42) {
            hoodieCol = '#60A5FA'; // Shoulder highlight rim
          }
          destCtx.fillStyle = hoodieCol;
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────────────
      // 4. CHARCOAL GYM SHORTS WITH WHITE STRIPES (ry >= +r * 0.70 && ry < +r * 0.90)
      // ──────────────────────────────────────────────────
      else if (ry < r * 0.90) {
        // Iconic vertical white side stripes (rx ~ ±r * 0.48)
        const isLeftStripe = (rx >= -r * 0.56 && rx <= -r * 0.44);
        const isRightStripe = (rx >= r * 0.44 && rx <= r * 0.56);

        if (isLeftStripe || isRightStripe) {
          destCtx.fillStyle = '#FFFFFF';
        } else {
          // Dark charcoal / black athletic gym shorts
          let shortsCol = '#18181B';
          if (Math.abs(rx) < r * 0.08) {
            shortsCol = '#09090B'; // Inseam center divider
          } else if (ry > r * 0.82) {
            shortsCol = '#0F0F12'; // Lower hem shadow
          }
          destCtx.fillStyle = shortsCol;
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────────────
      // 5. PASTEL PINK SLIPPERS & SOCKS (ry >= +r * 0.90)
      // ──────────────────────────────────────────────────
      else {
        // Center sock gap vs Left/Right slipper pads
        const isCenterGap = Math.abs(rx) < r * 0.12;
        if (isCenterGap) {
          destCtx.fillStyle = '#0E0F14';
        } else {
          // Soft fluffy pink slippers
          let slipperCol = '#F472B6'; // Pastel pink base
          if (ry > r * 0.96) {
            slipperCol = '#BE185D'; // Bottom sole shadow
          } else if (ry < r * 0.93) {
            slipperCol = '#FBCFE8'; // Fluffy slipper rim highlight
          }
          destCtx.fillStyle = slipperCol;
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  // Draw sweat drops if tired/low HP
  if (sweatLevel > 0) {
    destCtx.fillStyle = '#67E8F9';
    const sweatDrops = [
      { x: -r * 0.52, y: -r * 0.38, w: P * 1.5, h: P * 2.5 },
      { x: r * 0.50, y: -r * 0.32, w: P * 1.5, h: P * 2.0 },
      { x: -r * 0.45, y: -r * 0.15, w: P * 1.2, h: P * 1.8 }
    ];
    for (let i = 0; i < Math.min(sweatLevel, sweatDrops.length); i++) {
      const drop = sweatDrops[i];
      destCtx.fillRect(drop.x, drop.y, drop.w, drop.h);
      destCtx.fillStyle = '#FFFFFF';
      destCtx.fillRect(drop.x, drop.y, P * 0.8, P * 0.8);
      destCtx.fillStyle = '#67E8F9';
    }
  }

  destCtx.restore();
}

/**
 * Blits Sans's pixel art body using the high-performance offscreen cache.
 */
export function drawSansPixelBody(ctx, r, options = {}) {
  if (typeof document === 'undefined') return;

  const eyeActive = Boolean(options.eyeActive);
  const sweatLevel = options.sweatLevel || 0;

  if (!_cachedSansCanvas || _cachedSansR !== r || _cachedSansEyeMode !== eyeActive || _cachedSansSweat !== sweatLevel) {
    _cachedSansR = r;
    _cachedSansEyeMode = eyeActive;
    _cachedSansSweat = sweatLevel;

    const P = 2.0;
    const steps = Math.ceil((r + P) / P);
    const size = (steps * 2 + 1) * P;

    if (!_cachedSansCanvas) {
      _cachedSansCanvas = document.createElement('canvas');
    }
    _cachedSansCanvas.width = size;
    _cachedSansCanvas.height = size;

    const offCtx = _cachedSansCanvas.getContext('2d');
    _renderSansPixelBodyToCanvas(offCtx, r, eyeActive, sweatLevel);
  }

  if (_cachedSansCanvas) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_cachedSansCanvas, -_cachedSansCanvas.width / 2, -_cachedSansCanvas.height / 2);
    ctx.restore();
  }
}

/**
 * Draws Sans's animated Bad Time glowing flame eye wisps.
 * (Rule 11 compliant: uses concentric stepped arcs and needle polygons, NO shadowBlur).
 */
/**
 * Draws Sans's animated Bad Time glowing flame eye wisps with dynamic multi-strand tendrils.
 * (Rule 11 compliant: uses concentric stepped arcs and needle polygons, NO shadowBlur).
 */
export function drawSansFlameEye(ctx, r, now = Date.now()) {
  ctx.save();
  const eyeX = -r * 0.28;
  const eyeY = -r * 0.12;
  const flameTimer = (now * 0.012) % (Math.PI * 2);

  // 1. Concentric Radial Eye Glow (Rule 11 compliant)
  const glowR = r * 0.55 + Math.sin(flameTimer * 2.5) * 2.5;
  const glowGrad = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, glowR);
  glowGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  glowGrad.addColorStop(0.25, 'rgba(0, 245, 255, 0.85)');
  glowGrad.addColorStop(0.65, 'rgba(255, 230, 0, 0.45)');
  glowGrad.addColorStop(1.0, 'rgba(0, 245, 255, 0)');

  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, glowR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rising Dynamic Flame Tendrils (Flashing rapidly between Cyan, Yellow, and Electric Blue)
  const strobePhase = Math.sin(now * 0.025);
  const flameColor = (strobePhase > 0.15) ? '#FFE600' : (strobePhase < -0.4 ? '#2563EB' : '#00F5FF');
  const coreColor = '#FFFFFF';

  ctx.fillStyle = flameColor;
  const strandCount = 5;
  for (let i = 0; i < strandCount; i++) {
    const freqOffset = i * 1.4;
    const flameH = r * (0.65 + i * 0.22) + Math.sin(flameTimer * 1.6 + freqOffset) * (r * 0.20);
    const flameW = r * (0.13 - i * 0.018);
    const sway = Math.sin(flameTimer * 1.8 + i * 1.1) * (r * 0.22);

    ctx.beginPath();
    ctx.moveTo(eyeX - flameW, eyeY);
    ctx.quadraticCurveTo(eyeX + sway * 0.45, eyeY - flameH * 0.55, eyeX + sway, eyeY - flameH);
    ctx.quadraticCurveTo(eyeX + sway * 0.45 + flameW, eyeY - flameH * 0.55, eyeX + flameW, eyeY);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Drifting Micro-Ember Sparks rising above the eye
  ctx.fillStyle = '#FFFFFF';
  for (let k = 0; k < 3; k++) {
    const emberProg = ((now * 0.003 + k * 0.33) % 1.0);
    const emberX = eyeX + Math.sin(flameTimer + k * 2.0) * (r * 0.25);
    const emberY = eyeY - emberProg * (r * 1.3);
    const emberSize = Math.max(1.0, (1.0 - emberProg) * 2.5);
    ctx.fillRect(emberX - emberSize * 0.5, emberY - emberSize * 0.5, emberSize, emberSize);
  }

  // 4. Bright White Inner Core Glint
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Sans's Bad Time Combat Aura (Radial concentric energy field, Rule 11 compliant).
 */
export function drawSansBadTimeAura(ctx, r, auraAlpha = 1.0, now = Date.now()) {
  if (auraAlpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = auraAlpha;

  const pulse = Math.sin(now * 0.008) * 2.5;
  const outerR = r * 1.55 + pulse;

  const grad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, outerR);
  grad.addColorStop(0.0, 'rgba(0, 245, 255, 0.25)');
  grad.addColorStop(0.5, 'rgba(37, 99, 235, 0.15)');
  grad.addColorStop(0.85, 'rgba(255, 230, 0, 0.08)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fill();

  // Outer Neon Blue Rim Orbit
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25 + Math.sin(now * 0.01) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

/**
 * Renders Sans's teleport/dodge afterimages at recorded world coordinates.
 */
export function drawSansAfterImages(ctx, fighter) {
  const isSuppressed = typeof fighter?.areAttackEffectsSuppressed === 'function'
    ? fighter.areAttackEffectsSuppressed()
    : isSuppressedByGetsuga(fighter);

  if (!fighter || !fighter.afterImages || fighter.afterImages.length === 0 || isSuppressed) return;
  const r = fighter.r || 25;

  ctx.save();
  for (let i = 0; i < fighter.afterImages.length; i++) {
    const ai = fighter.afterImages[i];
    if (!ai || ai.timer <= 0) continue;
    const progress = ai.timer / (ai.maxTimer || 14);
    const maxAlpha = (ai.alpha !== undefined) ? ai.alpha : 0.40;
    const alpha = progress * maxAlpha;
    const angle = ai.gunAngle !== undefined ? ai.gunAngle : (ai.angle || 0);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ai.x, ai.y);
    ctx.rotate(angle);

    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) ctx.scale(1, -1);

    // Cyan Ghost Silhouette
    ctx.beginPath();
    ctx.arc(0, 0, ai.r || r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 245, 255, 0.35)';
    ctx.fill();
    ctx.strokeStyle = '#00F5FF';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    drawSansPixelBody(ctx, ai.r || r, { eyeActive: false, sweatLevel: 0 });

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draws the Undertale bone materialized in Sans's hand during basic attack windup.
 * (Rule 11 compliant: crisp pixel outlines, NO shadowBlur).
 */
function _drawHandHeldBone(ctx, hx, hy, handRadius, windupProgress, now) {
  ctx.save();
  ctx.translate(hx, hy);
  const tilt = -Math.PI * 0.25 + windupProgress * 0.2;
  ctx.rotate(tilt);

  const scale = 0.5 + windupProgress * 0.5;
  ctx.scale(scale, scale);

  const boneLen = 22;
  const boneW = 5;
  const lobeR = 4.0;

  // 1. Dark ink boundary outline
  ctx.fillStyle = '#0E0F14';
  ctx.beginPath();
  ctx.rect(-boneW / 2 - 1.5, -boneLen / 2 - 1.5, boneW + 3, boneLen + 3);
  ctx.arc(-boneW / 2, -boneLen / 2, lobeR + 1.2, 0, Math.PI * 2);
  ctx.arc(boneW / 2, -boneLen / 2, lobeR + 1.2, 0, Math.PI * 2);
  ctx.arc(-boneW / 2, boneLen / 2, lobeR + 1.2, 0, Math.PI * 2);
  ctx.arc(boneW / 2, boneLen / 2, lobeR + 1.2, 0, Math.PI * 2);
  ctx.fill();

  // 2. Bone White Fill
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.rect(-boneW / 2, -boneLen / 2, boneW, boneLen);
  ctx.arc(-boneW / 2, -boneLen / 2, lobeR, 0, Math.PI * 2);
  ctx.arc(boneW / 2, -boneLen / 2, lobeR, 0, Math.PI * 2);
  ctx.arc(-boneW / 2, boneLen / 2, lobeR, 0, Math.PI * 2);
  ctx.arc(boneW / 2, boneLen / 2, lobeR, 0, Math.PI * 2);
  ctx.fill();

  // 3. Cyan Magic Glint Core
  ctx.fillStyle = '#00F5FF';
  ctx.fillRect(-1.5, -1.5, 3, 3);

  ctx.restore();
}

/**
 * Draws the dynamic throw release shockwave ring and manga speed arc.
 * (Rule 11 & Rule 15 compliant).
 */
function _drawThrowReleaseVFX(ctx, hx, hy, handRadius, releaseProgress, now) {
  ctx.save();
  ctx.translate(hx, hy);

  const alpha = Math.max(0, 1.0 - releaseProgress);
  const ringR = handRadius * (1.0 + releaseProgress * 2.8);

  // 1. Concentric Cyan Ring Pulse
  ctx.strokeStyle = `rgba(0, 245, 255, ${alpha * 0.85})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.stroke();

  // 2. White Core Ring
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(0, 0, ringR * 0.6, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Manga Slash Swish Arc (Rule 15 double-tapered crescent)
  const arcR = handRadius * 2.2;
  const startA = -Math.PI * 0.6;
  const endA = Math.PI * 0.2;
  const span = endA - startA;

  ctx.fillStyle = `rgba(0, 245, 255, ${alpha * 0.75})`;
  ctx.beginPath();
  const numPts = 12;
  for (let p = 0; p <= numPts; p++) {
    const t = p / numPts;
    const a = startA + t * span;
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * 3.5;
    const rad = arcR + taper;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (p === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let p = numPts; p >= 0; p--) {
    const t = p / numPts;
    const a = startA + t * span;
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * 1.5;
    const rad = arcR - taper;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // 4. Spark Specks
  ctx.fillStyle = '#FFFFFF';
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI * 0.4 + k * 0.45;
    const d = ringR * (0.8 + k * 0.15);
    ctx.fillRect(Math.cos(a) * d - 1, Math.sin(a) * d - 1, 2, 2);
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Sans the Skeleton.
 * Adhering strictly to Rule 19, Rule 20, Rule 11, and Rule 3.5.
 */
export function drawSansSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  // 0. Render teleport / dodge afterimages in absolute world space
  drawSansAfterImages(ctx, fighter);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Bad Time Aura Evaluation
  const isBadTime = Boolean(fighter.isBadTimeActive || fighter.isCastingSkill || (fighter.karmaActive && fighter.karmaTimer > 0) || fighter.gravitySlamTimer > 0);
  const auraAlpha = Math.min(1.0, Math.max(0.0, fighter.combatAuraOpacity || (isBadTime ? 0.85 : 0)));
  if (!fighter._isWinnerReveal && auraAlpha > 0.01) {
    drawSansBadTimeAura(ctx, r, auraAlpha, now);
  }

  // 2. Standard Upright Orientation & Local Angle Transforms (Rule 19)
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1); // Upright orientation preservation
  }

  // 3. Sweat Level calculation (low HP or consecutive dodges)
  const hpRatio = (fighter.hp || 1) / (fighter.maxHp || 100);
  let sweatLevel = 0;
  if (hpRatio <= 0.30 || (fighter.dodgeFatigueTimer && fighter.dodgeFatigueTimer > 0)) {
    sweatLevel = 3;
  } else if (hpRatio <= 0.60) {
    sweatLevel = 2;
  } else if (isBadTime) {
    sweatLevel = 1;
  }

  // 4. Bad Time Eye Active Check
  const isEyeActive = isBadTime || Boolean(fighter.gasterBlasterFiring || fighter.blueSoulActive || fighter.eyeFlashing || fighter.gravitySlamTimer > 0);

  // ── LAYER 1: BODY CIRCLE MODEL (Rule 3.5 Offscreen Cache) ──
  drawSansPixelBody(ctx, r, {
    eyeActive: isEyeActive,
    sweatLevel: sweatLevel
  });

  // ── LAYER 2: BAD TIME FLASHING FLAME EYE ──
  if (isEyeActive && !isPodiumPreview) {
    drawSansFlameEye(ctx, r, now);
  }

  // ── LAYER 3: CANONICAL HANDS & TELEKINESIS GESTURES (Rule 20) ──
  const hideHands = isPodiumPreview || (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!hideHands) {
    const handRadius = getHandSize(r * 0.30, fighter);
    const boneColor = '#F8FAFC';
    const outlineColor = '#0E0F14';

    // Canonical Symmetrical Lower-Flank Coordinates (Rule 20)
    let leftHandX = -r * 0.82;
    let leftHandY = r * 0.38;
    let rightHandX = r * 0.82;
    let rightHandY = r * 0.38;

    // Telekinesis Gesture (Blue Soul Gravity Slam Hand Snap Upward Animation)
    const isGravitySlam = Boolean(fighter.gravitySlamTimer && fighter.gravitySlamTimer > 0);
    const isBasicAttack = !isGravitySlam && Boolean(fighter.basicAttackAnimTimer && fighter.basicAttackAnimTimer > 0);
    const isOtherTelekinesis = Boolean(fighter.gravitySlamActive || fighter.isCastingSkill || (fighter.boneWaveTimer && fighter.boneWaveTimer > 0));

    if (isGravitySlam) {
      const slamDuration = fighter.gravitySlamDuration || 80;
      const slamProg = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.gravitySlamTimer / slamDuration)));

      if (slamProg < 0.25) {
        // Stage 1: Explosive Hand Snap Upward (0.0 to 0.25 prog)
        const snapT = slamProg / 0.25;
        const easeSnap = 1.0 - Math.pow(1.0 - snapT, 4.0);

        rightHandX = r * 0.82 - easeSnap * (r * 0.40);
        rightHandY = r * 0.38 - easeSnap * (r * 1.25); // Snaps high above head

        // Shockwave Ring pulse emitted on upward snap
        if (snapT > 0.3) {
          const ringProg = (snapT - 0.3) / 0.7;
          const ringR = handRadius * (1.2 + ringProg * 3.5);
          ctx.save();
          ctx.strokeStyle = `rgba(0, 245, 255, ${1.0 - ringProg})`;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(rightHandX, rightHandY, ringR, 0, Math.PI * 2);
          ctx.stroke();

          // Spark arcs radiating outward
          ctx.fillStyle = '#FFFFFF';
          for (let sp = 0; sp < 4; sp++) {
            const a = (sp * Math.PI * 0.5) + snapT * 2;
            const dist = ringR * 0.85;
            ctx.fillRect(rightHandX + Math.cos(a) * dist - 1, rightHandY + Math.sin(a) * dist - 1, 2, 2);
          }
          ctx.restore();
        }
      } else if (slamProg < 0.75) {
        // Stage 2: Directional Fling / Slam Command (0.25 to 0.75 prog)
        const dirX = fighter.gravitySlamDirX || 0;
        const dirY = fighter.gravitySlamDirY !== undefined ? fighter.gravitySlamDirY : 1.0;

        rightHandX = r * 0.45 + dirX * (r * 0.42);
        rightHandY = -r * 0.55 + dirY * (r * 0.35);

        // Constant cyan telekinesis aura surrounding hand
        ctx.save();
        const handAuraR = handRadius * (2.0 + Math.sin(now * 0.03) * 0.3);
        const handAuraGrad = ctx.createRadialGradient(rightHandX, rightHandY, 0, rightHandX, rightHandY, handAuraR);
        handAuraGrad.addColorStop(0.0, '#FFFFFF');
        handAuraGrad.addColorStop(0.4, 'rgba(0, 245, 255, 0.90)');
        handAuraGrad.addColorStop(1.0, 'rgba(0, 245, 255, 0)');
        ctx.fillStyle = handAuraGrad;
        ctx.beginPath();
        ctx.arc(rightHandX, rightHandY, handAuraR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Stage 3: Impact Clench & Recoil (0.75 to 1.00 prog)
        const tremble = Math.sin(now * 0.08) * 1.2;
        rightHandX = r * 0.68 + tremble;
        rightHandY = -r * 0.25 + tremble;
      }
    } else if (isBasicAttack) {
      const maxAnim = fighter.basicAttackAnimMaxTimer || 16;
      const animProg = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.basicAttackAnimTimer / maxAnim)));

      // Subtle organic sway on left hand
      leftHandX = -r * 0.82 - Math.sin(animProg * Math.PI) * (r * 0.12);
      leftHandY = r * 0.38 + Math.sin(animProg * Math.PI) * (r * 0.08);

      if (animProg < 0.30) {
        // Phase 1: Windup & Conjure Bone in Hand (0.0 to 0.30)
        const t = animProg / 0.30;
        const easeWindup = Math.sin(t * Math.PI * 0.5);
        rightHandX = r * 0.82 - easeWindup * (r * 0.20);
        rightHandY = r * 0.38 - easeWindup * (r * 0.15);

        // Draw bone forming in hand
        _drawHandHeldBone(ctx, rightHandX, rightHandY, handRadius, t, now);
      } else if (animProg < 0.70) {
        // Phase 2: Forward Snap & Throw (0.30 to 0.70)
        const t = (animProg - 0.30) / 0.40;
        const easeSnap = 1.0 - Math.pow(1.0 - t, 3.0);
        rightHandX = r * (0.62 + easeSnap * 0.64); // reaches forward up to +r * 1.26
        rightHandY = r * (0.23 - easeSnap * 0.35); // lifts up to -r * 0.12

        // Throw Release Shockwave & Manga Speed Arc
        _drawThrowReleaseVFX(ctx, rightHandX, rightHandY, handRadius, t, now);
      } else {
        // Phase 3: Smooth Recoil & Return (0.70 to 1.00)
        const t = (animProg - 0.70) / 0.30;
        const easeReturn = Math.sin(t * Math.PI * 0.5);
        rightHandX = r * 1.26 - easeReturn * (r * 0.44);
        rightHandY = -r * 0.12 + easeReturn * (r * 0.50);
      }
    } else if (isOtherTelekinesis) {
      // General Bone Wave / Skill Cast Telekinesis Hand Pulse
      const teleProgress = fighter.skillChannelProgress || 0.5;
      const easeSnap = Math.sin(teleProgress * Math.PI);

      rightHandX = r * 0.65 + easeSnap * (r * 0.25);
      rightHandY = -r * 0.25 - easeSnap * (r * 0.20);

      // Telekinesis Cyan Hand Aura Pulse (Rule 11 compliant)
      ctx.save();
      const auraPulse = Math.sin(now * 0.02) * 2;
      const handAuraGrad = ctx.createRadialGradient(rightHandX, rightHandY, 0, rightHandX, rightHandY, handRadius * 2.2 + auraPulse);
      handAuraGrad.addColorStop(0.0, 'rgba(0, 245, 255, 0.85)');
      handAuraGrad.addColorStop(0.5, 'rgba(0, 245, 255, 0.40)');
      handAuraGrad.addColorStop(1.0, 'rgba(0, 245, 255, 0)');
      ctx.fillStyle = handAuraGrad;
      ctx.beginPath();
      ctx.arc(rightHandX, rightHandY, handRadius * 2.2 + auraPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Left and Right Symmetrical Hands overlapping the front lower perimeter
    drawPixelHand(ctx, leftHandX, leftHandY, handRadius, boneColor, outlineColor);
    drawPixelHand(ctx, rightHandX, rightHandY, handRadius, boneColor, outlineColor);
  }

  // Status overlays (stun, freeze, burn)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
