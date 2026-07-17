import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';

// dopplegangerWeaponGraphics.js
// Doppelganger's Crystalline Ethereal Sword
// Design: Dark amethyst blade with crystalline facets, glowing purple edges, translucent violet center

export const DOPPLEGANGER_WEAPON_GRAPHICS = {
  sword: {
    // Handle - dark amethyst / solidified smoke
    handleBase: '#10002b',
    handleHighlight: '#240046',
    handleShadow: '#0a0015',
    gripColor: '#120820',
    gripWrapAccent: '#3c096c',
    collarColor: '#240046',
    collarHighlight: '#5a189a',
    pommelColor: '#240046',
    pommelGem: '#7b2cbf',
    pommelGemHighlight: '#e0b1cb',

    // Blade - crystalline, ethereal quality
    bladeCore: '#10002b',
    bladeMid: '#240046',
    bladeOuter: '#3c096c',
    bladeEdge: '#7b2cbf',
    bladeEdgeBright: '#e0b1cb',
    bladeEdgeGlow: '#9d4edd',
    bladeCenter: 'rgba(60, 9, 108, 0.7)',
    bladeCenterHighlight: 'rgba(123, 44, 191, 0.5)',

    // Crystal facets - refined gradient
    crystalFacet1: '#240046',
    crystalFacet2: '#3c096c',
    crystalFacet3: '#5a189a',
    crystalFacet4: '#7b2cbf',
    crystalFacetEdge: '#9d4edd',

    // Energy effects
    energyCore: '#e0b1cb',
    energyMid: '#9d4edd',
    energyOuter: '#5a189a',
    energyPulse: 'rgba(224, 177, 203, 0.6)',
    energyTrail: 'rgba(157, 78, 221, 0.4)',

    // Ambient effects
    etherealGlow: 'rgba(123, 44, 191, 0.3)',
    smokeBase: '#10002b',
    smokeHighlight: '#5a189a',
  },
  positioning: {
    scale: 1.0,
    sideOffset: 3,
  },
  swingEffect: {
    primaryColor: '#9d4edd',
    secondaryColor: '#c77dff',
    tertiaryColor: '#e0b1cb',
    glowColor: 'rgba(157, 78, 221, 0.7)',
    trailColor: 'rgba(123, 44, 191, 0.4)',
  },
};

export function drawDopplegangerPurpleSword(ctx, x, y, gunAngle, r, swordSwingActive = false, swordSwingTimer = 0, swordSwingAngle = 0, swordSwingDuration = CONFIG.doppleganger?.swordSwingDuration ?? 20, timeOpt, fighterColor = '#7b2cbf') {
  if (!CONFIG.doppleganger) return;

  const sword = DOPPLEGANGER_WEAPON_GRAPHICS.sword;
  const time = timeOpt || Date.now();

  ctx.save();
  ctx.translate(x, y);

  const scale = DOPPLEGANGER_WEAPON_GRAPHICS.positioning.scale;
  // Push the sword out slightly so the handle rests nicely in a "hand" area
  const sideOffset = r + DOPPLEGANGER_WEAPON_GRAPHICS.positioning.sideOffset;

  const defaultSwordRotation = swordSwingActive ? swordSwingAngle : gunAngle;

  // Resting angle: Held across the body in a ready stance
  const restingAngle = -Math.PI / 2.5;
  let swingRot = restingAngle;
  let swingProgress = 0;

  if (swordSwingActive) {
    const SWING_DURATION = Math.max(1, swordSwingDuration || CONFIG.doppleganger?.swordSwingDuration || 20);
    const t = Math.max(0, Math.min(1, (SWING_DURATION - swordSwingTimer) / SWING_DURATION));
    swingProgress = t;

    // Wind up backward from resting angle, then snap forward, then recover
    if (t < 0.2) {
      // Wind up (pull back slightly before strike)
      swingRot = restingAngle - 0.4 * (t / 0.2);
    } else if (t < 0.65) {
      // Main strike (swing from wind-up to full extension)
      const p = (t - 0.2) / 0.45;
      const ease = 1 - Math.pow(1 - p, 3);
      // Full extension angle is around +1.2 radians
      swingRot = (restingAngle - 0.4) + ease * 2.8;
    } else {
      // Recover back to resting stance
      const p = (t - 0.65) / 0.35;
      const endStrikeAngle = (restingAngle - 0.4) + 2.8;
      // Smooth recovery
      swingRot = endStrikeAngle * (1 - p) + restingAngle * p;
    }

    drawDopplegangerSwingEffect(ctx, r, swingProgress, defaultSwordRotation, fighterColor);
  }

  // To make the hand grip look correct, we want to rotate around the body center first (defaultSwordRotation),
  // then translate out to the edge of the body, then apply the sword's own local rotation (swingRot).
  ctx.rotate(defaultSwordRotation);

  // Adding a slight Y offset shifts the sword into the right hand position, rather than dead center
  const handOffsetY = r * 0.4;

  // KINETIC DISTORTION: The Phantom Trace (Lagging Silhouette)
  // OPTIMIZATION: Skip phantom trace at low FPS
  const fps = state.fps || 60;
  if (swordSwingActive && swingProgress > 0.1 && swingProgress < 0.8 && fps > 40) {
    ctx.save();
    ctx.translate(sideOffset - 5, handOffsetY);
    // Calculate a slight lag in rotation based on swing direction
    const lagAmount = 0.25 * Math.sin(swingProgress * Math.PI);
    ctx.rotate(swingRot - lagAmount);

    // Draw only the phantom silhouette
    drawSingleSword(ctx, 0, scale, swordSwingActive, true);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(sideOffset - 5, handOffsetY);
  ctx.rotate(swingRot);

  drawSingleSword(ctx, 0, scale, swordSwingActive, false);
  ctx.restore();

  ctx.restore();
}

function drawDopplegangerSwingEffect(ctx, r, progress, facingAngle, fighterColor) {
  const fade = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
  if (fade <= 0) return;

  const se = DOPPLEGANGER_WEAPON_GRAPHICS.swingEffect;

  ctx.save();
  ctx.rotate(facingAngle);
  ctx.globalCompositeOperation = 'lighter';

  // Outer ethereal trail - wide and soft
  ctx.globalAlpha = fade * 0.4;
  ctx.strokeStyle = se.trailColor;
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r + 38, -Math.PI / 2.2, Math.PI / 2.2);
  ctx.stroke();

  // Middle glow layer
  ctx.globalAlpha = fade * 0.6;
  ctx.strokeStyle = se.secondaryColor;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, r + 32, -Math.PI / 2.8, Math.PI / 2.8);
  ctx.stroke();

  // Primary swing arc
  ctx.globalAlpha = fade * 0.8;
  ctx.strokeStyle = se.primaryColor;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, r + 26, -Math.PI / 3.2, Math.PI / 3.2);
  ctx.stroke();

  // Bright inner arc
  ctx.globalAlpha = fade * 1.0;
  ctx.strokeStyle = se.tertiaryColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r + 22, -Math.PI / 3.5, Math.PI / 3.5);
  ctx.stroke();

  // Energy particles along the arc
  const particleCount = 5; // Reduced for performance
  for (let i = 0; i < particleCount; i++) {
    const angle = -Math.PI / 3.5 + (Math.PI * 2 / 3.5) * (i / (particleCount - 1));
    const px = Math.cos(angle) * (r + 26);
    const py = Math.sin(angle) * (r + 26);
    const particleFade = fade * (0.5 + 0.5 * Math.sin(i * 1.5 + progress * 15));
    const particleSize = 3 + fade * 4;

    ctx.globalAlpha = particleFade;
    ctx.fillStyle = se.tertiaryColor;
    ctx.beginPath();
    ctx.arc(px, py, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // ── Hand ──
  ctx.save();
  ctx.rotate(facingAngle);
  
  // Position hand at the sword handle
  const sideOffsetHand = r + DOPPLEGANGER_WEAPON_GRAPHICS.positioning.sideOffset;
  ctx.translate(sideOffsetHand, 0);
  
  ctx.fillStyle = fighterColor || '#7b2cbf';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  
  ctx.restore();
}

function drawSingleSword(ctx, xOffset, scale, isSwinging, isPhantom = false) {
  const sword = DOPPLEGANGER_WEAPON_GRAPHICS.sword;
  const time = Date.now();

  const qualityLevel = state.qualityLevel || 1.0;
  const useLOD = false;
  const useUltraLOD = false;

  if (isPhantom) {
    if (useUltraLOD) { return; } // OPTIMIZED: Disable phantom trace on ULTRA low FPS

    ctx.save();
    ctx.translate(xOffset, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000000';

    // Simplified silhouette for phantom
    const bladeLength = 48 * scale;
    const handleLength = 14 * scale;
    ctx.beginPath();
    ctx.rect(-handleLength, -2.5 * scale, handleLength + bladeLength, 5 * scale);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(xOffset, 0);

  const bladeLength = 48 * scale;
  const handleLength = 14 * scale;
  const crossguardWidth = 14 * scale;
  const bladeBaseWidth = 5 * scale;
  const tipLength = 12 * scale;
  const baseY = 0;
  const midX = bladeLength - tipLength;
  const bladeTop = baseY - bladeBaseWidth;
  const bladeBottom = baseY + bladeBaseWidth;

  // Re-enabled Outer Aura, disabled only on Ultra LOD
  // OPTIMIZATION: Further reduce iterations for performance
  if (!useUltraLOD) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const waveTime = time / 600;
    const iterations = useLOD ? 0 : 1; // Even fewer iterations on LOD
    for (let i = iterations; i >= 0; i--) {
      const auraScale = 1 + i * 0.2;
      const auraAlpha = 0.12 - i * 0.04;
      ctx.globalAlpha = auraAlpha;
      ctx.fillStyle = sword.etherealGlow;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.quadraticCurveTo(15 * scale * auraScale + Math.sin(waveTime + i) * 6 * scale, -10 * scale * auraScale, bladeLength * auraScale, baseY);
      ctx.quadraticCurveTo(15 * scale * auraScale + Math.cos(waveTime + i * 1.5) * 6 * scale, 10 * scale * auraScale, 0, baseY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Handle & Pommel (Simplified for brevity, original logic is fine)
  ctx.fillStyle = sword.handleShadow;
  ctx.fillRect(-handleLength, baseY - 2.5 * scale, handleLength, 5 * scale);
  const handleGrad = ctx.createLinearGradient(-handleLength, baseY - 2.5 * scale, -handleLength, baseY + 2.5 * scale);
  handleGrad.addColorStop(0, sword.handleShadow);
  handleGrad.addColorStop(0.3, sword.handleBase);
  handleGrad.addColorStop(0.7, sword.handleHighlight);
  handleGrad.addColorStop(1, sword.handleBase);
  ctx.fillStyle = handleGrad;
  ctx.fillRect(-handleLength, baseY - 2.5 * scale, handleLength, 5 * scale);

  // Crossguard
  const collarGrad = ctx.createLinearGradient(0, baseY - crossguardWidth / 2, 0, baseY + crossguardWidth / 2);
  collarGrad.addColorStop(0, sword.collarHighlight);
  collarGrad.addColorStop(0.5, sword.collarColor);
  collarGrad.addColorStop(1, sword.handleShadow);
  ctx.fillStyle = collarGrad;
  ctx.beginPath();
  ctx.moveTo(2 * scale, baseY - crossguardWidth / 2);
  ctx.lineTo(-2 * scale, baseY - crossguardWidth / 2 + 2 * scale);
  ctx.lineTo(-2 * scale, baseY + crossguardWidth / 2 - 2 * scale);
  ctx.lineTo(2 * scale, baseY + crossguardWidth / 2);
  ctx.lineTo(4 * scale, baseY);
  ctx.closePath();
  ctx.fill();

  // Re-enabled Dark Aura, disabled only on Ultra LOD
  // OPTIMIZATION: Skip dark aura on LOD as well
  if (!useLOD && !useUltraLOD) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = useLOD ? 6 * scale : 10 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const wave = Math.sin(time / 250) * 1.5 * scale;
    ctx.moveTo(2 * scale, bladeTop + wave);
    ctx.lineTo(midX, bladeTop + 1.5 * scale + wave);
    ctx.lineTo(bladeLength, baseY);
    ctx.lineTo(midX, bladeBottom - 1.5 * scale - wave);
    ctx.lineTo(2 * scale, bladeBottom - wave);
    ctx.stroke();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = useLOD ? 2 * scale : 4 * scale;
    ctx.stroke();
    ctx.restore();
  }

  // Main Blade
  ctx.save();
  ctx.fillStyle = sword.bladeCore;
  ctx.beginPath();
  ctx.moveTo(2 * scale, bladeTop);
  ctx.lineTo(midX, bladeTop + 1.5 * scale);
  ctx.lineTo(bladeLength, baseY);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale);
  ctx.lineTo(2 * scale, bladeBottom);
  ctx.closePath();
  ctx.fill();

  // Facets are now always drawn for better visual consistency
  ctx.fillStyle = sword.crystalFacet1;
  ctx.beginPath();
  ctx.moveTo(2 * scale, bladeTop);
  ctx.lineTo(midX, bladeTop + 1.5 * scale);
  ctx.lineTo(midX, baseY);
  ctx.lineTo(2 * scale, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = sword.crystalFacet2;
  ctx.beginPath();
  ctx.moveTo(2 * scale, baseY);
  ctx.lineTo(midX, baseY);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale);
  ctx.lineTo(2 * scale, bladeBottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = sword.crystalFacet3;
  ctx.beginPath();
  ctx.moveTo(midX, bladeTop + 1.5 * scale);
  ctx.lineTo(bladeLength, baseY);
  ctx.lineTo(midX, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = sword.crystalFacet4;
  ctx.beginPath();
  ctx.moveTo(midX, baseY);
  ctx.lineTo(bladeLength, baseY);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale);
  ctx.closePath();
  ctx.fill();

  // Glowing Edges
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = sword.bladeEdgeBright;
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(2 * scale, bladeTop);
  ctx.lineTo(midX, bladeTop + 1.5 * scale);
  ctx.lineTo(bladeLength, baseY);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale);
  ctx.lineTo(2 * scale, bladeBottom);
  ctx.stroke();

  // Lightning arcs disabled on LOD
  if (!useLOD) {
    for (let i = 0; i < 2; i++) {
      const arcTime = (time + i * 600) / 150;
      const seed = Math.floor(arcTime);
      const progress = arcTime % 1;
      if (progress < 0.25) {
        const startX = 5 * scale + (Math.sin(seed * 1.2) * 0.5 + 0.5) * (bladeLength - 15 * scale);
        const startY = baseY + Math.sin(seed * 2.3) * 2 * scale;
        const dirY = Math.sign(Math.sin(seed * 3.4)) || 1;
        ctx.globalAlpha = (0.25 - progress) * 3;
        ctx.strokeStyle = sword.bladeEdgeBright;
        ctx.lineWidth = 1.2 * scale;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + (Math.sin(seed * 4.5) * 4) * scale, startY + dirY * 5 * scale);
        ctx.lineTo(startX + (Math.sin(seed * 5.6) * 6) * scale, startY + dirY * 11 * scale);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  // Particles disabled on LOD
  // OPTIMIZATION: Completely disable particles for performance
  if (!useLOD && state.fps > 50) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const particleTime = time / 800;
    const particleCount = 2;
    for (let i = 0; i < particleCount; i++) {
      const pX = 2 * scale + ((time / 30 + i * 30) % (bladeLength - 2 * scale));
      const pY = baseY + Math.sin(particleTime * 4 + i) * 6 * scale;
      const pSize = (1.0 + Math.sin(particleTime * 5 + i) * 1.0) * scale;
      const pAlpha = 0.8 * Math.sin((pX / bladeLength) * Math.PI);
      ctx.globalAlpha = pAlpha;
      ctx.fillStyle = i % 2 === 0 ? '#1a052a' : '#000000';
      ctx.beginPath();
      ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

// Off-screen canvases for static smoke/glow caching to eliminate GC allocation pressure
let _smokeCacheCanvas = null;
let _glowCacheCanvas = null;
let _wispCacheCanvas = null;

function _initDoppelgangerCaches(r) {
  const size = Math.ceil(r * 4);

  if (!_smokeCacheCanvas) {
    _smokeCacheCanvas = document.createElement('canvas');
    _smokeCacheCanvas.width = size;
    _smokeCacheCanvas.height = size;
    const sCtx = _smokeCacheCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5);
    grad.addColorStop(0, 'rgba(60, 9, 108, 0.45)');
    grad.addColorStop(0.7, 'rgba(26, 0, 43, 0.2)');
    grad.addColorStop(1, 'rgba(16, 0, 43, 0)');
    sCtx.fillStyle = grad;
    sCtx.beginPath();
    sCtx.arc(size / 2, size / 2, size * 0.5, 0, Math.PI * 2);
    sCtx.fill();
  }

  if (!_glowCacheCanvas) {
    _glowCacheCanvas = document.createElement('canvas');
    _glowCacheCanvas.width = size;
    _glowCacheCanvas.height = size;
    const gCtx = _glowCacheCanvas.getContext('2d');
    const grad = gCtx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.45);
    grad.addColorStop(0, 'rgba(157, 78, 221, 0.2)');
    grad.addColorStop(0.7, 'rgba(76, 201, 240, 0.05)');
    grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
    gCtx.fillStyle = grad;
    gCtx.beginPath();
    gCtx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
    gCtx.fill();
  }

  if (!_wispCacheCanvas) {
    _wispCacheCanvas = document.createElement('canvas');
    _wispCacheCanvas.width = size;
    _wispCacheCanvas.height = size;
    const wCtx = _wispCacheCanvas.getContext('2d');
    const grad = wCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(173, 216, 230, 1.0)'); // Light blueish core
    grad.addColorStop(0.5, 'rgba(157, 78, 221, 0.7)'); // Violet mid
    grad.addColorStop(1, 'rgba(157, 78, 221, 0)'); // Fade out
    wCtx.fillStyle = grad;
    wCtx.beginPath();
    wCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    wCtx.fill();
  }
}

/**
 * Draws the fluid, ethereal shadow smoke around the Doppleganger's body.
 * This enhanced version uses procedural noise to create turbulent, organic smoke movement.
 */
export function drawDopplegangerBodyEffect(ctx, x, y, r, angle, layer = 'under', timeOpt) {
  const time = timeOpt || Date.now();

  // OPTIMIZATION: Only skip if FPS is severely broken (<15)
  const fps = state.fps || 60;
  if (fps < 15 && state.gameState === 'playing') return;

  _initDoppelgangerCaches(r);

  ctx.save();
  ctx.translate(x, y);

  const qualityLevel = state.qualityLevel || 1.0;
  const useLOD = false;
  const useUltraLOD = false;

  const turbulence = (t, freq, amp) => Math.sin(t * freq) * amp;

  if (layer === 'under') {
    ctx.globalCompositeOperation = 'lighter';
    // Draw a single simplified glow even on UltraLOD so the visual identity is preserved
    const scaleSize = 1.0 + 0.1 * Math.sin(time / 500);
    const cacheSize = _glowCacheCanvas.width;
    ctx.globalAlpha = useUltraLOD ? 0.6 : 1.0;
    ctx.drawImage(_glowCacheCanvas, -cacheSize * scaleSize / 2, -cacheSize * scaleSize / 2, cacheSize * scaleSize, cacheSize * scaleSize);
    ctx.restore();
    return;
  }

  if (layer === 'over') {
    ctx.globalCompositeOperation = 'source-over';
    
    // 1. Base Shadow Smoke Layer (deep purple)
    const particleCount = useUltraLOD ? 2 : (useLOD ? 3 : 5);
    for (let i = 0; i < particleCount; i++) {
      const idx = i + 1;
      const swirlAngle = (time / (1000 + idx * 150)) + (idx * Math.PI * 2 / particleCount);
      const dist = r * (0.4 + 0.3 * Math.sin(time / (900 + idx * 50)));

      // Apply turbulence
      const noisyX = Math.cos(swirlAngle) * dist + turbulence(time / 1000, 0.5 + idx * 0.1, r * 0.2);
      const noisyY = Math.sin(swirlAngle) * dist + turbulence(time / 1000, 0.6 + idx * 0.1, r * 0.2);
      const smokeRadius = r * (0.6 + 0.3 * Math.cos(time / (700 + idx * 60)));

      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time / (800 + idx * 70));
      ctx.drawImage(_smokeCacheCanvas, noisyX - smokeRadius, noisyY - smokeRadius, smokeRadius * 2, smokeRadius * 2);
    }

    // 2. Highlight Wisps Layer (brighter violet/cyan)
    ctx.globalCompositeOperation = 'lighter';
    const wispCount = useUltraLOD ? 1 : (useLOD ? 2 : 3);
    for (let i = 0; i < wispCount; i++) {
      const idx = i + 1;
      const swirlAngle = -(time / (800 + idx * 200)) + (idx * Math.PI * 2 / wispCount);
      const dist = r * (0.6 + 0.2 * Math.cos(time / (600 + idx * 100)));

      const noisyX = Math.cos(swirlAngle) * dist + turbulence(time / 1200, 0.4 + idx * 0.2, r * 0.3);
      const noisyY = Math.sin(swirlAngle) * dist + turbulence(time / 1200, 0.5 + idx * 0.2, r * 0.3);

      const wispRadius = r * (0.4 + 0.2 * Math.sin(time / (500 + idx * 80)));
      const alpha = 0.15 + 0.1 * Math.cos(time / (400 + idx * 90));

      ctx.globalAlpha = alpha; 
      ctx.drawImage(_wispCacheCanvas, noisyX - wispRadius, noisyY - wispRadius, wispRadius * 2, wispRadius * 2);
    }

    // 3. Energy Motes (small, bright particles)
    const moteCount = useUltraLOD ? 1 : (useLOD ? 2 : 4);
    for (let i = 0; i < moteCount; i++) {
      const idx = i + 1;
      const angle = (time / 2000 + idx * 2.1) % (Math.PI * 2);
      const dist = r * (0.2 + (idx / moteCount) * 0.8) + Math.sin(time / (600 + idx * 50)) * r * 0.2;

      const moteX = Math.cos(angle) * dist;
      const moteY = Math.sin(angle) * dist;
      const moteSize = r * (0.05 + 0.05 * Math.sin(time / 300 + idx));
      const alpha = 0.5 + 0.4 * Math.cos(time / 400 + idx * 1.5);

      ctx.fillStyle = `rgba(224, 177, 203, ${alpha})`; 
      ctx.beginPath();
      ctx.arc(moteX, moteY, moteSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}