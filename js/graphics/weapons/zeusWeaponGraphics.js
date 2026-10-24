import { state } from '../../core/state.js';
import { getHandSize, CONFIG } from '../../core/config.js';
import { zeusConfig } from '../../configs/characters/zeusConfig.js';
import { drawZeusHand } from '../fighters/zeusSkin.js';


export function drawThunderboltShape(ctx, scale = 1, pulse = 1) {
  ctx.save();
  ctx.scale(scale, scale);
  
  // ═══════════════════════════════════════════════
  // 1. THE BOLT SPINE (jagged core path)
  // ═══════════════════════════════════════════════
  const spine = [
    { x: -40, y: 0 },     // rear tip
    { x: -26, y: -6 },    // rear bend 1
    { x: -12, y: 4 },     // rear bend 2
    { x: 0,   y: 0 },     // grip center
    { x: 14,  y: -5 },    // front bend 1
    { x: 28,  y: 4 },     // front bend 2
    { x: 44,  y: -3 },    // front bend 3
    { x: 60,  y: 0 },     // front tip
  ];

  // ═══════════════════════════════════════════════
  // 2. DIAMOND / SPINDLE SILHOUETTE (Pixel Art Edition)
  // ═══════════════════════════════════════════════
  const totalLen = spine.length;
  const halfIdx = (totalLen - 1) / 2; // index of max thickness

  function getThickness(i) {
    if (i === 0 || i === totalLen - 1) return 0; // Sharp triangle tips
    const dist = Math.abs(i - halfIdx) / halfIdx; 
    const taper = 1 - Math.pow(dist, 0.7);
    return 1.5 + taper * 6.5;
  }

  const upperEdge = spine.map((p, i) => ({ x: Math.round(p.x), y: Math.round(p.y - getThickness(i)) }));
  const lowerEdge = spine.map((p, i) => ({ x: Math.round(p.x), y: Math.round(p.y + getThickness(i)) })).reverse();

  // ─── 1. Solid Dark Ink Outer Outline (#0E0F14) ───
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(upperEdge[0].x, upperEdge[0].y);
  for (let i = 1; i < upperEdge.length; i++) ctx.lineTo(upperEdge[i].x, upperEdge[i].y);
  for (let i = 0; i < lowerEdge.length; i++) ctx.lineTo(lowerEdge[i].x, lowerEdge[i].y);
  ctx.closePath();
  ctx.fillStyle = '#0E0F14';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#0E0F14';
  ctx.lineJoin = 'miter';
  ctx.stroke();
  ctx.restore();

  // ─── 2. Deep Blue Facet Shadow (Lower Facet) ───
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i < spine.length; i++) ctx.lineTo(spine[i].x, spine[i].y);
  for (let i = 0; i < lowerEdge.length; i++) ctx.lineTo(lowerEdge[i].x, lowerEdge[i].y);
  ctx.closePath();
  ctx.fillStyle = '#0284C7';
  ctx.fill();
  ctx.restore();

  // ─── 3. Electric Cyan Facet Highlight (Upper Facet) ───
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(upperEdge[0].x, upperEdge[0].y);
  for (let i = 1; i < upperEdge.length; i++) ctx.lineTo(upperEdge[i].x, upperEdge[i].y);
  for (let i = spine.length - 1; i >= 0; i--) ctx.lineTo(spine[i].x, spine[i].y);
  ctx.closePath();
  ctx.fillStyle = '#38BDF8';
  ctx.fill();
  ctx.restore();

  // ─── 4. White-Hot Chiseled Core Spine ───
  const innerScale = 0.45;
  const innerUpper = spine.map((p, i) => ({ x: Math.round(p.x), y: Math.round(p.y - getThickness(i) * innerScale) }));
  const innerLower = spine.map((p, i) => ({ x: Math.round(p.x), y: Math.round(p.y + getThickness(i) * innerScale) })).reverse();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(innerUpper[0].x, innerUpper[0].y);
  for (let i = 1; i < innerUpper.length; i++) ctx.lineTo(innerUpper[i].x, innerUpper[i].y);
  for (let i = 0; i < innerLower.length; i++) ctx.lineTo(innerLower[i].x, innerLower[i].y);
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // ─── 5. Golden Center Grip Wrap (Olympian Handle at x: -6 to +6) ───
  ctx.save();
  ctx.fillStyle = '#CA8A04';
  ctx.fillRect(-6, -4, 12, 8);
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(-5, -3, 10, 6);
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(-4, -2, 8, 2);
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-6.5, -4.5, 13, 9);
  ctx.restore();

  // ═══════════════════════════════════════════════
  // 6. ERRATIC ENERGY — Branching arcs & sparks (Retro Pixel Art)
  // ═══════════════════════════════════════════════
  const now = Date.now();
  
  ctx.save();
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  const branchCount = 4;
  for (let b = 0; b < branchCount; b++) {
    const seed = Math.floor(now / 80) * 137 + b * 53;
    const pseudoRand = (n) => {
      const x = Math.sin(seed + n * 9.1) * 43758.5453;
      return x - Math.floor(x);
    };

    const anchorIdx = 1 + Math.floor(pseudoRand(0) * (spine.length - 2));
    const anchor = spine[anchorIdx];

    const dirX = -1 + pseudoRand(1) * 0.6;
    const dirY = (pseudoRand(2) - 0.5) * 2;

    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);

    let bx = anchor.x;
    let by = anchor.y;
    const segments = 2 + Math.floor(pseudoRand(3) * 2);
    const branchLen = 8 + pseudoRand(4) * 14;

    for (let s = 0; s < segments; s++) {
      bx += Math.round((dirX * (branchLen / segments) + (pseudoRand(5 + s) - 0.5) * 8) / 2) * 2;
      by += Math.round((dirY * (branchLen / segments) + (pseudoRand(6 + s) - 0.5) * 8) / 2) * 2;
      ctx.lineTo(bx, by);
    }

    ctx.strokeStyle = pseudoRand(7) > 0.5 ? '#00FFFF' : '#38BDF8';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
  
  // Discrete 2x2 spark motes (Retro Pixel Art)
  ctx.save();
  const sparkCount = 6;
  for (let s = 0; s < sparkCount; s++) {
    const seed = Math.floor(now / 60) * 97 + s * 71;
    const pr = (n) => {
      const v = Math.sin(seed + n * 7.3) * 43758.5453;
      return v - Math.floor(v);
    };

    const si = Math.floor(pr(0) * spine.length);
    const sp = spine[Math.min(si, spine.length - 1)];
    const sx = Math.round((sp.x + (pr(1) - 0.5) * 20) / 2) * 2;
    const sy = Math.round((sp.y + (pr(2) - 0.5) * 20) / 2) * 2;

    ctx.fillStyle = pr(4) > 0.5 ? '#FFFFFF' : '#00FFFF';
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
  }
  ctx.restore();

  ctx.restore(); // Restore initial scale and translation
}

export function drawZeusWeapon(ctx, x, y, gunAngle, r, auraPhase, attackProgress = 1, fighterColor = '#102040', isChannelingStorm = false, chargeProgress = 0) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);

  const now = Date.now();
  const pulse = 0.85 + Math.sin(now * 0.008) * 0.15;

  if (isChannelingStorm) {
    // 1. Draw lightning bolt flying up to the sky
    const throwProgress = Math.min(1, chargeProgress * 3); // 0 to 1 quickly
    if (chargeProgress < 1.0) { 
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1.0 - Math.pow(throwProgress, 2));
        
        const flyY = -throwProgress * 500;
        
        // Draw glowing lightning trail
        if (throwProgress > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            
            // Dynamic snappy crackling electric worms
            const numWorms = 4;
            for (let i = 0; i < numWorms; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                
                let curY = 0;
                const segments = 5 + Math.floor(Math.random() * 4);
                const segLen = flyY / segments;
                
                for (let s = 1; s <= segments; s++) {
                    const t = s / segments;
                    let nextY = segLen * s;
                    // Violent jitter horizontally (thickest in the middle)
                    let nextX = (Math.random() - 0.5) * 70 * Math.sin(t * Math.PI);
                    if (s === segments) {
                        nextX = 0; // Connect to the bolt tip
                        nextY = flyY;
                    }
                    ctx.lineTo(nextX, nextY);
                    curY = nextY;
                }
                
                // Randomly color the worm cyan or white
                if (Math.random() > 0.3) {
                    ctx.strokeStyle = `rgba(0, 220, 255, ${0.4 + Math.random() * 0.4})`;
                    ctx.lineWidth = 4 + Math.random() * 8;
                } else {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + Math.random() * 0.4})`;
                    ctx.lineWidth = 2 + Math.random() * 3;
                }
                ctx.lineJoin = 'round';
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.translate(0, flyY); // Fly straight up screen
        ctx.rotate(-Math.PI/2); // Point straight up
        drawThunderboltShape(ctx, 1.0, pulse);
        ctx.restore();
    }
    
    ctx.restore();
    return; // Skip normal weapon drawing; hands are handled by drawZeusSkin
  }

  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }
  
  let weaponPullback = 0;
  let weaponAngle = 0;
  let weaponSideOffset = 0;
  
  const alignToSpearAngle = Math.PI / 4;

  if (attackProgress >= 0.5) {
    const p = (attackProgress - 0.5) / 0.5;
    const ease = p * p * p;
    weaponPullback = -18 * ease;
    weaponSideOffset = -22 * ease;
    weaponAngle = (alignToSpearAngle + 0.1) * ease;
  } else if (attackProgress < 0.3) {
    const p = 1 - (attackProgress / 0.3);
    weaponPullback = 20 * Math.pow(p, 3);
    weaponSideOffset = 0;
    weaponAngle = alignToSpearAngle * Math.pow(p, 3);
  }

  const holdDistX = r + 4 + weaponPullback;
  const holdDistY = weaponSideOffset;

  ctx.translate(holdDistX, holdDistY);
  ctx.rotate(-Math.PI / 4 + weaponAngle);

  drawThunderboltShape(ctx, 1.0, pulse);

  // ═══════════════════════════════════════════════
  // 4. OLYMPIAN HAND GRIPPING MASTER BOLT (Rule 20)
  // ═══════════════════════════════════════════════
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly);
  if (!shouldHideHands) {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : zeusConfig;
    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.zeus) || {};
    const handScale = custom.handScale ?? cfg?.handScale ?? 0.75;
    const isStorm = Boolean(isChannelingStorm || chargeProgress >= 1.0);
    const armAngle = Math.atan2(-holdDistY, -holdDistX) - (-Math.PI / 4 + weaponAngle);
    const handRadius = getHandSize(r * 0.30 * handScale);
    const skinTone = isStorm ? '#BAE6FD' : '#F3BF9F';
    drawZeusHand(ctx, 0, 0, handRadius, skinTone, isStorm, armAngle + Math.PI / 2);
  }

  // ═══════════════════════════════════════════════
  // 5. CAST LIGHT onto Zeus's hand/body
  // ═══════════════════════════════════════════════
  ctx.save();
  ctx.fillStyle = `rgba(0, 220, 255, ${0.20 * pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ═══════════════════════════════════════════════
// 6. 12-FRAME THUNDERSTRIKE IMPACT ANIMATION ENGINE
// ═══════════════════════════════════════════════

const ZEUS_THUNDERSTRIKE_FRAME_COUNT = 12;
const ZEUS_THUNDERSTRIKE_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/effects/Impact/explosion-${i + 1}.png`
);

let _zeusThunderstrikeFrames = [];
let _zeusThunderstrikeFramesLoading = false;

export function _getZeusThunderstrikeFrames() {
  if (
    _zeusThunderstrikeFrames.length === ZEUS_THUNDERSTRIKE_FRAME_COUNT &&
    _zeusThunderstrikeFrames.every(img => img && img.complete && ((img.naturalWidth || img.width || 0) > 0))
  ) {
    return _zeusThunderstrikeFrames;
  }
  if (!_zeusThunderstrikeFramesLoading && typeof Image !== 'undefined') {
    _zeusThunderstrikeFramesLoading = true;
    _zeusThunderstrikeFrames = [];
    ZEUS_THUNDERSTRIKE_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _zeusThunderstrikeFrames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load Zeus thunderstrike impact frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=1`;
      _zeusThunderstrikeFrames[idx] = img;
    });
  }
  return _zeusThunderstrikeFrames;
}

// Proactive eager initialization in browser environment
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getZeusThunderstrikeFrames();
}

/**
 * Draws the 12-frame Zeus thunderstrike impact animation sprite from Assets/effects/Impact/.
 * Centered at ground impact epicenter (128, 128).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} scale Drawing scale
 * @param {number} p Progress 0.0 to 1.0 (elapsed / maxTimer)
 * @param {number} alpha Base opacity
 * @param {boolean} isGreen True if Rubbick stolen lightning
 * @returns {boolean} True if frame was successfully rendered
 */
export function _drawZeusAnimatedThunderstrikeSprite(ctx, scale = 1.15, p = 0, alpha = 1.0, isGreen = false) {
  const frames = _getZeusThunderstrikeFrames();
  const frameIndex = Math.min(11, Math.max(0, Math.floor(p * 12)));
  const frameImg = frames[frameIndex];

  if (!frameImg || !frameImg.complete || ((frameImg.naturalWidth || frameImg.width || 0) <= 0)) {
    return false;
  }

  const prevSmoothing = ctx.imageSmoothingEnabled;
  const prevAlpha = ctx.globalAlpha;
  ctx.imageSmoothingEnabled = false;

  // Natural fade-out on late dissipating frames (frames 1-9 solid, 10-12 dissolve)
  const fadeAlpha = p > 0.82 ? Math.max(0, (1.0 - p) / 0.18) : 1.0;
  ctx.globalAlpha = Math.max(0, Math.min(1.0, prevAlpha * alpha * fadeAlpha));

  // Frame is 256x256px with radial explosion epicenter at (128, 128)
  const drawW = 256 * scale;
  const drawH = 256 * scale;
  const anchorX = 128 * scale;
  const anchorY = 128 * scale;

  if (isGreen) {
    ctx.save();
    ctx.filter = 'hue-rotate(280deg)';
    ctx.drawImage(frameImg, -anchorX, -anchorY, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(frameImg, -anchorX, -anchorY, drawW, drawH);
  }

  // Restore context state cleanly (Rule 2.4 Stack Integrity)
  ctx.imageSmoothingEnabled = prevSmoothing;
  ctx.globalAlpha = prevAlpha;
  return true;
}

/**
 * Draws a Zeus Thunderstrike effect.
 * Features:
 * - 12-Frame authentic thunderstrike impact animation from Assets/effects/Impact/
 * - Descending high-voltage sky lightning bolt during strike detonation
 * - Anchored at target impact coordinates
 * - Ground luminance bloom
 * - Procedural fallback if frames are not yet ready
 * - 100% Canvas 2D transform stack balance
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} strike Strike object { x, y, life, maxLife, color, scale, alpha }
 */
export function drawZeusThunderstrike(ctx, strike) {
  if (!strike || strike.life <= 0) return;

  const maxLife = strike.maxLife || 18;
  const lifeRatio = Math.max(0, Math.min(1.0, strike.life / maxLife));
  const p = Math.max(0, Math.min(1.0, 1.0 - lifeRatio));
  const isGreen = strike.color === 'green';
  const isCrit = Boolean(strike.isCrit);
  const scale = (strike.scale || 1.15) * (isCrit ? 1.20 : 1.0);
  const alpha = strike.alpha !== undefined ? strike.alpha : 1.0;

  ctx.save();
  ctx.translate(strike.x, strike.y);

  // 1. Render 12-Frame Animated Thunderstrike Impact Sprite
  const spriteRendered = _drawZeusAnimatedThunderstrikeSprite(ctx, scale, p, alpha, isGreen);

  // 2. Descending high-voltage sky bolt connecting cloud to impact epicenter during initial strike
  if (p < 0.35) {
    const boltP = p / 0.35;
    const boltAlpha = Math.pow(1.0 - boltP, 1.3) * alpha;
    _drawSkyLightningBolt(ctx, boltAlpha, isGreen, scale);
  }

  // 3. Ground Luminance Shine Bloom Effect (lighter composite for intense radiance)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bloomRadius = (isGreen ? 130 : 150) * scale * (0.8 + 0.4 * (1.0 - p)) * (isCrit ? 1.35 : 1.0);
  const shineGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, bloomRadius);

  if (isGreen) {
    shineGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.8 + Math.random() * 0.2) * lifeRatio})`);
    shineGlow.addColorStop(0.25, `rgba(50, 255, 120, ${(0.5 + Math.random() * 0.2) * lifeRatio})`);
    shineGlow.addColorStop(1, 'rgba(0, 180, 50, 0)');
  } else {
    shineGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.85 + Math.random() * 0.15) * lifeRatio})`);
    shineGlow.addColorStop(0.22, `rgba(0, 200, 255, ${(0.55 + Math.random() * 0.2) * lifeRatio})`);
    shineGlow.addColorStop(0.65, `rgba(0, 100, 255, ${(0.25 + Math.random() * 0.15) * lifeRatio})`);
    shineGlow.addColorStop(1, 'rgba(0, 40, 200, 0)');
  }

  ctx.fillStyle = shineGlow;
  ctx.beginPath();
  ctx.arc(0, 0, bloomRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Ground Impact Animation (Pre-impact glint, concussive core flash, Lichtenberg fractures, manga needles & scorch)
  _drawThunderstrikeImpactAnimation(ctx, scale, p, alpha, isGreen, isCrit);

  // 5. Fallback procedural lightning bolt if sprite frames have not loaded yet (e.g. headless tests)
  if (!spriteRendered && p >= 0.35) {
    _drawFallbackProceduralBolt(ctx, lifeRatio, isGreen, scale);
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════
// 7. THUNDERSTRIKE GROUND IMPACT ANIMATION ENGINE
// ═══════════════════════════════════════════════

/**
 * Pre-calibrated Lichtenberg electric ground fracture paths radiating from epicenter
 */
const ZEUS_IMPACT_FRACTURES = [
  [{ x: 0, y: 0 }, { x: 12, y: 4 }, { x: 26, y: -3 }, { x: 42, y: 3 }, { x: 58, y: -2 }],
  [{ x: 0, y: 0 }, { x: -10, y: 6 }, { x: -24, y: 2 }, { x: -38, y: 11 }, { x: -52, y: 8 }],
  [{ x: 0, y: 0 }, { x: 6, y: -8 }, { x: 16, y: -18 }, { x: 24, y: -30 }, { x: 36, y: -42 }],
  [{ x: 0, y: 0 }, { x: -7, y: -8 }, { x: -18, y: -16 }, { x: -28, y: -24 }, { x: -40, y: -35 }],
  [{ x: 0, y: 0 }, { x: 11, y: 9 }, { x: 20, y: 20 }, { x: 32, y: 27 }, { x: 44, y: 36 }],
  [{ x: 0, y: 0 }, { x: -9, y: 9 }, { x: -19, y: 16 }, { x: -30, y: 25 }, { x: -42, y: 32 }],
  [{ x: 0, y: 0 }, { x: -2, y: 12 }, { x: 3, y: 24 }, { x: -2, y: 36 }, { x: 2, y: 46 }]
];

/**
 * 8 Radial angles for Manga Action Speed Needles (Rule 16)
 */
const ZEUS_NEEDLE_ANGLES = [
  0.0,
  Math.PI * 0.25,
  Math.PI * 0.50,
  Math.PI * 0.75,
  Math.PI,
  Math.PI * 1.25,
  Math.PI * 1.50,
  Math.PI * 1.75
];

/**
 * Renders the comprehensive multi-layered Zeus thunderstrike ground impact animation.
 * Features:
 * - Pre-strike gathering ion spark (p < 0.20)
 * - Concussive ground core detonation flash (p >= 0.20)
 * - Lichtenberg electric ground fracture fissures
 * - Rule 16 Manga Action speed line needles
 * - Isometric ground scorch footprint & detached embers
 * - Dynamic golden/cyan divine radiance on Critical Strikes
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} scale Overall scaling factor
 * @param {number} p Overall strike progress 0.0 to 1.0
 * @param {number} alpha Base opacity
 * @param {boolean} isGreen True if Rubbick stolen lightning
 * @param {boolean} isCrit True if Critical Strike
 */
export function _drawThunderstrikeImpactAnimation(ctx, scale, p, alpha, isGreen, isCrit = false) {
  // Phase 1: Pre-impact gathering ion spark while bolt descends through sky (p < 0.20)
  if (p < 0.20) {
    _drawThunderstrikePreImpactGlint(ctx, scale, p, alpha, isGreen, isCrit);
    return;
  }

  // Phase 2: Ground detonation lifecycle (p >= 0.20)
  const impP = Math.min(1.0, Math.max(0.0, (p - 0.20) / 0.80));

  // 1. Isometric ground scorch footprint & discrete embers
  _drawImpactGroundScorch(ctx, scale, impP, alpha, isGreen);

  // 2. Lichtenberg electric ground fracture fissures
  _drawImpactGroundFractures(ctx, scale, impP, alpha, isGreen, isCrit);

  // 3. Shockwave rings removed per user request

  // 4. Rule 16 Supersonic Manga Action Speed Needles
  _drawImpactMangaNeedles(ctx, scale, impP, alpha, isGreen, isCrit);

  // 5. Concussive Ground Core Flash
  if (impP < 0.35) {
    _drawImpactCoreFlash(ctx, scale, impP, alpha, isGreen, isCrit);
  }
}

/**
 * Pre-impact gathering ion spark at ground zero before the bolt strikes down.
 */
function _drawThunderstrikePreImpactGlint(ctx, scale, p, alpha, isGreen, isCrit = false) {
  const chargeP = p / 0.20; // 0.0 -> 1.0
  const glintR = (2.5 + chargeP * (isCrit ? 7.0 : 5.5)) * scale;
  const glintAlpha = chargeP * alpha;

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, glintR, 0, Math.PI * 2);
  ctx.fillStyle = isGreen
    ? `rgba(180, 255, 200, ${glintAlpha})`
    : `rgba(220, 245, 255, ${glintAlpha})`;
  ctx.fill();

  // Diamond glint cross
  ctx.strokeStyle = isGreen
    ? `rgba(50, 255, 120, ${glintAlpha * 0.8})`
    : `rgba(0, 220, 255, ${glintAlpha * 0.8})`;
  ctx.lineWidth = (isCrit ? 1.8 : 1.5) * scale;
  const crossLen = glintR * (isCrit ? 2.0 : 1.8);
  ctx.beginPath();
  ctx.moveTo(-crossLen, 0); ctx.lineTo(crossLen, 0);
  ctx.moveTo(0, -crossLen * 0.7); ctx.lineTo(0, crossLen * 0.7);
  ctx.stroke();
  ctx.restore();
}

/**
 * Concussive Ground Core Flash at ground zero upon impact (soft radial bloom without stroke ring).
 */
function _drawImpactCoreFlash(ctx, scale, impP, alpha, isGreen, isCrit = false) {
  const flashP = impP / 0.35; // 0.0 -> 1.0
  const flashR = (12 + (isCrit ? 34 : 28) * Math.pow(flashP, 0.6)) * scale;
  const flashAlpha = Math.pow(1.0 - flashP, 1.2) * alpha;

  ctx.save();
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
  if (isGreen) {
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * flashAlpha})`);
    grad.addColorStop(0.35, `rgba(200, 255, 220, ${0.75 * flashAlpha})`);
    grad.addColorStop(1, 'rgba(50, 255, 120, 0)');
  } else {
    grad.addColorStop(0, `rgba(255, 255, 255, ${(isCrit ? 1.0 : 0.98) * flashAlpha})`);
    grad.addColorStop(0.35, `rgba(200, 245, 255, ${(isCrit ? 0.90 : 0.80) * flashAlpha})`);
    grad.addColorStop(0.70, `rgba(0, 200, 255, ${(isCrit ? 0.45 : 0.25) * flashAlpha})`);
    grad.addColorStop(1, 'rgba(0, 100, 255, 0)');
  }
  ctx.beginPath();
  ctx.arc(0, 0, flashR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

/**
 * Shockwave rings intentionally removed on Zeus Thunderstrike per user request.
 * Preserved as a clean no-op function to ensure interface stability and zero canvas stack mutations.
 */
function _drawImpactConcentricShockwaves(ctx, scale, impP, alpha, isGreen) {
  // Intentionally empty: concentric shockwave rings removed on Zeus thunderstrike
}

/**
 * Lichtenberg electric ground fracture fissures radiating across arena floor.
 */
function _drawImpactGroundFractures(ctx, scale, impP, alpha, isGreen) {
  // Fractures shoot outward during first 22% of impact, then slowly cool and fade
  const crackProg = Math.min(1.0, impP / 0.22);
  const fade = impP < 0.35 ? 1.0 : Math.max(0.0, (1.0 - impP) / 0.65);
  const fracAlpha = fade * alpha;
  if (fracAlpha <= 0.01) return;

  // High-frequency micro-tremor electrical jitter
  const jitterX = Math.sin(impP * 45) * 1.2 * scale;
  const jitterY = Math.cos(impP * 50) * 0.9 * scale;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < ZEUS_IMPACT_FRACTURES.length; i++) {
    const arm = ZEUS_IMPACT_FRACTURES[i];
    const totalSegments = arm.length;
    const drawnSegments = Math.max(1, Math.floor(totalSegments * crackProg));

    // Outer neon electric stroke
    ctx.beginPath();
    ctx.moveTo(arm[0].x * scale, arm[0].y * scale);
    for (let s = 1; s < drawnSegments; s++) {
      const pt = arm[s];
      ctx.lineTo(pt.x * scale + jitterX, pt.y * scale + jitterY);
    }
    ctx.strokeStyle = isGreen ? `rgba(50, 255, 120, ${0.80 * fracAlpha})` : `rgba(0, 200, 255, ${0.80 * fracAlpha})`;
    ctx.lineWidth = 2.8 * scale;
    ctx.stroke();

    // Inner white-hot crack core
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * fracAlpha})`;
    ctx.lineWidth = 1.1 * scale;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Rule 16 Supersonic Manga Action Speed Needles erupting along ground plane.
 */
function _drawImpactMangaNeedles(ctx, scale, impP, alpha, isGreen, isCrit = false) {
  // Needle burst window: impP in [0.00, 0.45]
  if (impP > 0.45) return;
  const np = impP / 0.45; // 0.0 -> 1.0
  const needleAlpha = Math.pow(1.0 - np, 1.2) * alpha;
  if (needleAlpha <= 0.01) return;

  const maxLen = (isCrit ? 68 : 58) * scale;
  const leadDist = maxLen * Math.pow(np, 0.65);
  const trailDist = maxLen * Math.pow(np, 1.35);
  const curLen = Math.max(0, leadDist - trailDist);
  if (curLen <= 1.0) return;

  const maxThick = (isCrit ? 2.6 : 2.2) * scale * (1.0 - np * 0.5);

  ctx.save();
  for (let i = 0; i < ZEUS_NEEDLE_ANGLES.length; i++) {
    const angle = ZEUS_NEEDLE_ANGLES[i] + (i % 2 === 0 ? 0.05 : -0.05);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpY = cosA;

    const startX = cosA * trailDist;
    const startY = sinA * trailDist;
    const endX = cosA * leadDist;
    const endY = sinA * leadDist;
    const midX = cosA * ((leadDist + trailDist) * 0.5);
    const midY = sinA * ((leadDist + trailDist) * 0.5);

    // 4-Point Filled Needle Polygon (Rule 16)
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(midX + perpX * (maxThick * 0.5), midY + perpY * (maxThick * 0.5));
    ctx.lineTo(endX, endY);
    ctx.lineTo(midX - perpX * (maxThick * 0.5), midY - perpY * (maxThick * 0.5));
    ctx.closePath();

    if (i % 2 === 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * needleAlpha})`;
    } else if (isGreen) {
      ctx.fillStyle = `rgba(50, 255, 120, ${0.90 * needleAlpha})`;
    } else {
      ctx.fillStyle = `rgba(0, 220, 255, ${0.90 * needleAlpha})`;
    }
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Isometric ground scorch footprint & discrete detached embers.
 */
function _drawImpactGroundScorch(ctx, scale, impP, alpha, isGreen) {
  const scorchAlpha = Math.max(0.0, (1.0 - impP) * 0.70 * alpha);
  if (scorchAlpha <= 0.01) return;

  ctx.save();

  // Dark burned organic ground polygon
  const rx = 34 * scale;
  const ry = 22 * scale;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = isGreen
    ? `rgba(10, 30, 15, ${0.65 * scorchAlpha})`
    : `rgba(4, 14, 34, ${0.65 * scorchAlpha})`;
  ctx.fill();

  // Central electric ionization wash
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = isGreen
    ? `rgba(50, 255, 120, ${0.22 * scorchAlpha})`
    : `rgba(0, 200, 255, ${0.22 * scorchAlpha})`;
  ctx.fill();

  // Discrete detached embers around perimeter (Rule 26 compliant: discrete points, NO lines)
  const emberCount = 8;
  for (let e = 0; e < emberCount; e++) {
    const eAngle = (e * Math.PI * 2) / emberCount + 0.3;
    const eDist = (rx * 0.85 + e * 2.2) * (1.0 + impP * 0.35);
    const ex = Math.cos(eAngle) * eDist;
    const ey = Math.sin(eAngle) * eDist * 0.65;
    const emberSize = (1.5 + (e % 2) * 1.0) * scale * (1.0 - impP * 0.5);

    ctx.beginPath();
    ctx.arc(ex, ey, Math.max(0.8, emberSize), 0, Math.PI * 2);
    ctx.fillStyle = isGreen
      ? `rgba(180, 255, 200, ${scorchAlpha * 0.85})`
      : `rgba(200, 245, 255, ${scorchAlpha * 0.85})`;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Descending high-voltage sky lightning bolt connecting heaven to ground zero during initial strike.
 */
function _drawSkyLightningBolt(ctx, alpha, isGreen, scale = 1.0) {
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  let curX = 0;
  let curY = -360 * scale; // Start high up in the sky
  ctx.moveTo(curX, curY);

  const steps = 8;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const targetX = 0;
    const targetY = 0;
    const jitter = (Math.sin(s * 99 + alpha * 10) - 0.5) * 36 * (1 - t * 0.7);
    const nextX = curX + (targetX - curX) * (1 / steps) + jitter;
    const nextY = curY + (targetY - curY) * (1 / steps);
    ctx.lineTo(s === steps ? 0 : nextX, s === steps ? 0 : nextY);
    curX = nextX;
    curY = nextY;
  }

  // Outer neon glow stroke
  ctx.strokeStyle = isGreen ? `rgba(50, 255, 120, ${0.85 * alpha})` : `rgba(0, 220, 255, ${0.85 * alpha})`;
  ctx.lineWidth = 10 * scale;
  ctx.stroke();

  // Mid intense electric core
  ctx.strokeStyle = isGreen ? `rgba(180, 255, 200, ${0.95 * alpha})` : `rgba(186, 230, 253, ${0.95 * alpha})`;
  ctx.lineWidth = 5 * scale;
  ctx.stroke();

  // Pure white-hot core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  ctx.restore();
}

/**
 * Fallback procedural lightning bolt when sprite frames are unavailable.
 */
function _drawFallbackProceduralBolt(ctx, lifeRatio, isGreen, scale = 1.0) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, lifeRatio);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  let curX = 0;
  let curY = -350 * scale; // Start high up
  ctx.moveTo(curX, curY);

  const steps = 8;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const targetX = 0;
    const targetY = 0;
    let nextX = curX + (targetX - curX) * (1 / steps) + (Math.sin(s * 99 + lifeRatio * 10) - 0.5) * 40 * (1 - t);
    let nextY = curY + (targetY - curY) * (1 / steps);
    if (s === steps) {
      nextX = targetX;
      nextY = targetY;
    }
    ctx.lineTo(nextX, nextY);
    curX = nextX;
    curY = nextY;
  }

  // Outer glow
  ctx.strokeStyle = isGreen ? `rgba(0, 255, 0, ${0.8 * lifeRatio})` : `rgba(0, 220, 255, ${0.8 * lifeRatio})`;
  ctx.lineWidth = 14 + lifeRatio * 6;
  ctx.stroke();

  // White core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3 + lifeRatio * 3;
  ctx.stroke();

  ctx.restore();
}
