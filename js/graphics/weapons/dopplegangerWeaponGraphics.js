import { CONFIG } from '../../core/config.js';

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

export function drawDopplegangerPurpleSword(ctx, x, y, gunAngle, r, swordSwingActive = false, swordSwingTimer = 0, swordSwingAngle = 0, swordSwingDuration = CONFIG.doppleganger?.swordSwingDuration ?? 20, timeOpt) {
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

    drawDopplegangerSwingEffect(ctx, r, swingProgress, defaultSwordRotation);
  }

  // To make the hand grip look correct, we want to rotate around the body center first (defaultSwordRotation),
  // then translate out to the edge of the body, then apply the sword's own local rotation (swingRot).
  ctx.rotate(defaultSwordRotation);
  
  // Adding a slight Y offset shifts the sword into the right hand position, rather than dead center
  const handOffsetY = r * 0.4;
  
  // KINETIC DISTORTION: The Phantom Trace (Lagging Silhouette)
  if (swordSwingActive && swingProgress > 0.1 && swingProgress < 0.8) {
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

function drawDopplegangerSwingEffect(ctx, r, progress, facingAngle) {
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
}

function drawSingleSword(ctx, xOffset, scale, isSwinging, isPhantom = false) {
  ctx.save();
  // Translate to the character's hand/edge, then we draw the sword spanning left (handle) and right (blade)
  ctx.translate(xOffset, 0);

  const sword = DOPPLEGANGER_WEAPON_GRAPHICS.sword;
  const time = Date.now();
  
  // Sword geometry constants
  const bladeLength = 48 * scale;
  const handleLength = 14 * scale;
  const crossguardWidth = 14 * scale; // Total vertical span of crossguard
  const bladeBaseWidth = 5 * scale; // Half-width (extends up and down from center)
  const tipLength = 12 * scale;
  
  // Base coordinates for the longitudinal axis
  const baseY = 0; // Sword is horizontally aligned on Y=0
  const midX = bladeLength - tipLength;
  const bladeTop = baseY - bladeBaseWidth;
  const bladeBottom = baseY + bladeBaseWidth;

  if (isPhantom) {
    // KINETIC DISTORTION: Phantom Trace
    // Draw a pure black, slightly blurred "after-image" silhouette
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.5; // Slight transparency for the lag effect
    ctx.fillStyle = '#000000';
    
    // Draw the overall sword silhouette for the phantom
    ctx.beginPath();
    // Handle & Crossguard
    ctx.rect(-handleLength, baseY - 2.5 * scale, handleLength, 5 * scale);
    ctx.moveTo(2 * scale, baseY - crossguardWidth/2);
    ctx.lineTo(-2 * scale, baseY - crossguardWidth/2 + 2 * scale);
    ctx.lineTo(-2 * scale, baseY + crossguardWidth/2 - 2 * scale);
    ctx.lineTo(2 * scale, baseY + crossguardWidth/2);
    ctx.lineTo(4 * scale, baseY);
    // Blade
    ctx.moveTo(2 * scale, bladeTop);
    ctx.lineTo(midX, bladeTop + 1.5 * scale);
    ctx.lineTo(bladeLength, baseY);
    ctx.lineTo(midX, bladeBottom - 1.5 * scale);
    ctx.lineTo(2 * scale, bladeBottom);
    ctx.fill();
    ctx.restore();
    return; // Exit early since we just need the shadow
  }

  // === OUTER ETHEREAL AURA (Solidified Smoke Effect) ===
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  
  const waveTime = time / 600;
  // Reduced iterations from 5 to 3 for performance
  for (let i = 2; i >= 0; i--) {
    const auraScale = 1 + i * 0.2;
    const auraAlpha = 0.15 - i * 0.04;
    
    ctx.globalAlpha = auraAlpha;
    ctx.fillStyle = sword.etherealGlow;
    
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    
    // Top smoky edge
    ctx.quadraticCurveTo(
      15 * scale * auraScale + Math.sin(waveTime + i) * 6 * scale, 
      -10 * scale * auraScale, 
      bladeLength * auraScale, 
      baseY
    );
    // Bottom smoky edge
    ctx.quadraticCurveTo(
      15 * scale * auraScale + Math.cos(waveTime + i * 1.5) * 6 * scale, 
      10 * scale * auraScale, 
      0, 
      baseY
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // === HANDLE & POMMEL ===
  // Grip background
  ctx.fillStyle = sword.handleShadow;
  ctx.fillRect(-handleLength, baseY - 2.5 * scale, handleLength, 5 * scale);
  
  // Grip body
  const handleGrad = ctx.createLinearGradient(-handleLength, baseY - 2.5 * scale, -handleLength, baseY + 2.5 * scale);
  handleGrad.addColorStop(0, sword.handleShadow);
  handleGrad.addColorStop(0.3, sword.handleBase);
  handleGrad.addColorStop(0.7, sword.handleHighlight);
  handleGrad.addColorStop(1, sword.handleBase);
  ctx.fillStyle = handleGrad;
  ctx.fillRect(-handleLength, baseY - 2.5 * scale, handleLength, 5 * scale);

  // Grip wraps
  for (let i = 1; i < 6; i++) {
    const xx = -handleLength + i * 2.2 * scale;
    ctx.strokeStyle = i % 2 === 0 ? sword.gripColor : sword.gripWrapAccent;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(xx - 1 * scale, baseY - 2.5 * scale);
    ctx.lineTo(xx + 1 * scale, baseY + 2.5 * scale);
    ctx.stroke();
  }

  // Pommel
  ctx.fillStyle = sword.pommelColor;
  ctx.beginPath();
  ctx.ellipse(-handleLength - 2 * scale, baseY, 3 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Pommel Gem
  const gemPulse = 0.5 + 0.5 * Math.sin(time / 200);
  ctx.fillStyle = sword.pommelGem;
  ctx.beginPath();
  ctx.ellipse(-handleLength - 2 * scale, baseY, 1.5 * scale, 2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Pulsing gem core
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = sword.bladeEdgeBright;
  ctx.globalAlpha = gemPulse * 0.8;
  ctx.beginPath();
  ctx.ellipse(-handleLength - 2 * scale, baseY, 0.7 * scale, 1.0 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';

  // Crossguard
  const collarGrad = ctx.createLinearGradient(0, baseY - crossguardWidth/2, 0, baseY + crossguardWidth/2);
  collarGrad.addColorStop(0, sword.collarHighlight);
  collarGrad.addColorStop(0.5, sword.collarColor);
  collarGrad.addColorStop(1, sword.handleShadow);
  ctx.fillStyle = collarGrad;
  ctx.strokeStyle = sword.handleShadow;
  ctx.lineWidth = 1 * scale;
  
  ctx.beginPath();
  ctx.moveTo(2 * scale, baseY - crossguardWidth/2);
  ctx.lineTo(-2 * scale, baseY - crossguardWidth/2 + 2 * scale);
  ctx.lineTo(-2 * scale, baseY + crossguardWidth/2 - 2 * scale);
  ctx.lineTo(2 * scale, baseY + crossguardWidth/2);
  ctx.lineTo(4 * scale, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // === DARK AURA EFFECTS (Surrounding the blade) ===
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Shattered Light: Subtle, wavy dark mirage effect framing the sword
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; // Semi-transparent distortion ring
  ctx.lineWidth = 10 * scale; // Increased to extend outward more
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  
  // Wavy distortion offset based on time
  const wave = Math.sin(time / 250) * 1.5 * scale;
  
  ctx.moveTo(2 * scale, bladeTop + wave);
  ctx.lineTo(midX, bladeTop + 1.5 * scale + wave);
  ctx.lineTo(bladeLength, baseY);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale - wave);
  ctx.lineTo(2 * scale, bladeBottom - wave);
  ctx.stroke();
  
  // The Shimmering Corona: Razor-sharp pitch-black smoke outline surrounding the blade
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4 * scale; // Increased to make the outline distinct
  ctx.stroke();
  
  ctx.restore();

  // === MAIN BLADE (Crystalline Ethereal Quality) ===
  ctx.save();

  // Deep, Translucent Violet Center Layer (Base)
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = sword.bladeCore;
  ctx.beginPath();
  ctx.moveTo(2 * scale, bladeTop);
  ctx.lineTo(midX, bladeTop + 1.5 * scale); // Tapers slightly towards tip
  ctx.lineTo(bladeLength, baseY);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale);
  ctx.lineTo(2 * scale, bladeBottom);
  ctx.closePath();
  ctx.fill();

  // Upper back facet (Amethyst)
  ctx.fillStyle = sword.crystalFacet1;
  ctx.beginPath();
  ctx.moveTo(2 * scale, bladeTop);
  ctx.lineTo(midX, bladeTop + 1.5 * scale);
  ctx.lineTo(midX, baseY);
  ctx.lineTo(2 * scale, baseY);
  ctx.closePath();
  ctx.fill();

  // Lower back facet
  ctx.fillStyle = sword.crystalFacet2;
  ctx.beginPath();
  ctx.moveTo(2 * scale, baseY);
  ctx.lineTo(midX, baseY);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale);
  ctx.lineTo(2 * scale, bladeBottom);
  ctx.closePath();
  ctx.fill();

  // Upper front facet (Tip)
  ctx.fillStyle = sword.crystalFacet3;
  ctx.beginPath();
  ctx.moveTo(midX, bladeTop + 1.5 * scale);
  ctx.lineTo(bladeLength, baseY);
  ctx.lineTo(midX, baseY);
  ctx.closePath();
  ctx.fill();

  // Lower front facet (Tip)
  ctx.fillStyle = sword.crystalFacet4;
  ctx.beginPath();
  ctx.moveTo(midX, baseY);
  ctx.lineTo(bladeLength, baseY);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale);
  ctx.closePath();
  ctx.fill();

  // Ethereal Translucent Overlay
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = sword.bladeCenter;
  ctx.beginPath();
  ctx.moveTo(4 * scale, baseY);
  ctx.lineTo(midX, bladeTop + 2.5 * scale);
  ctx.lineTo(bladeLength - 2 * scale, baseY);
  ctx.lineTo(midX, bladeBottom - 2.5 * scale);
  ctx.closePath();
  ctx.fill();
  // === GLOWING EDGES (Bright, Energetic Purple Hue) ===
  ctx.globalCompositeOperation = 'lighter';
  
  // Outer bright contour (Simulating glow with thick stroke instead of shadow)
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = sword.bladeEdgeGlow;
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(2 * scale, bladeTop);
  ctx.lineTo(midX, bladeTop + 1.5 * scale);
  ctx.lineTo(bladeLength, baseY);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale);
  ctx.lineTo(2 * scale, bladeBottom);
  ctx.stroke();

  // Sharp core contour
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = sword.bladeEdgeBright;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Crystal facet edge highlights
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = sword.crystalFacetEdge;
  ctx.lineWidth = 0.8 * scale;
  ctx.beginPath();
  ctx.moveTo(midX, bladeTop + 1.5 * scale);
  ctx.lineTo(midX, bladeBottom - 1.5 * scale);
  ctx.stroke();

  // === ENERGY PULSE EFFECT ===
  const pulsePhase = (time / 250) % 1;
  const pulseX = 2 * scale + (midX - 2 * scale) * pulsePhase;
  const pulseAlpha = 0.4 + 0.6 * Math.sin(pulsePhase * Math.PI);
  
  // Outer pulse glow layer
  ctx.globalAlpha = pulseAlpha * 0.5;
  ctx.fillStyle = sword.energyCore;
  ctx.beginPath();
  ctx.ellipse(pulseX, baseY, 8 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner pulse core layer
  ctx.globalAlpha = pulseAlpha;
  ctx.fillStyle = sword.energyPulse;
  ctx.beginPath();
  ctx.ellipse(pulseX, baseY, 6 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // === VOLATILE LIGHTNING ARCS ===
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) {
    const arcTime = (time + i * 600) / 150;
    const seed = Math.floor(arcTime); // Quantized time for sudden jumps
    const progress = arcTime % 1;
    
    if (progress < 0.25) { // Arcs only visible briefly
      // Pseudo-random generation based on seed
      const startX = 5 * scale + (Math.sin(seed * 1.2) * 0.5 + 0.5) * (bladeLength - 15 * scale);
      const startY = baseY + Math.sin(seed * 2.3) * 2 * scale;
      
      const dirY = Math.sign(Math.sin(seed * 3.4)) || 1;
      
      ctx.globalAlpha = (0.25 - progress) * 3; // Fast fade out
      ctx.strokeStyle = sword.bladeEdgeBright;
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      // Jagged zig-zag lines
      ctx.lineTo(startX + (Math.sin(seed * 4.5) * 4) * scale, startY + dirY * 5 * scale);
      ctx.lineTo(startX + (Math.sin(seed * 5.6) * 6) * scale, startY + dirY * 11 * scale);
      ctx.stroke();
      
      // Secondary fork
      ctx.beginPath();
      ctx.moveTo(startX + (Math.sin(seed * 4.5) * 4) * scale, startY + dirY * 5 * scale);
      ctx.lineTo(startX + (Math.cos(seed * 6.7) * 7) * scale, startY + dirY * 9 * scale);
      ctx.stroke();
    }
  }

  ctx.restore();

  // === ATMOSPHERIC TRAIL: Particulate Cosmic Dust ===
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; // Draw on top for dark obsidian contrast
  const particleTime = time / 800;
  
  // Reduced particle count from 8 to 4 for performance
  for (let i = 0; i < 4; i++) {
    const pX = 2 * scale + ((time / 30 + i * 30) % (bladeLength - 2 * scale));
    const pY = baseY + Math.sin(particleTime * 4 + i) * 6 * scale;
    const pSize = (1.0 + Math.sin(particleTime * 5 + i) * 1.0) * scale;
    
    const pAlpha = 0.8 * Math.sin((pX / bladeLength) * Math.PI);
    
    ctx.globalAlpha = pAlpha;
    // Dark violet/obsidian dust
    ctx.fillStyle = i % 2 === 0 ? '#1a052a' : '#000000';
    
    ctx.beginPath();
    ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

/**
 * Draws the fluid, ethereal shadow smoke around the Doppleganger's body.
 * Avoids basic shapes by generating organic, jagged, and flowing vector paths.
 */
export function drawDopplegangerBodyEffect(ctx, x, y, r, angle, layer = 'under', timeOpt) {
  const time = timeOpt || Date.now();
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * 0.2); 
  
  // Helper to draw an organic, non-circular plasma/smoke blob using vector points
  const drawOrganicBlob = (cx, cy, baseSize, numPoints, timeOffset, stretchY = 1.0) => {
    ctx.beginPath();
    for (let j = 0; j < numPoints; j++) {
      const a = (j / numPoints) * Math.PI * 2;
      // Perturb radius with intersecting sine waves for an organic/jagged feel
      const noise = Math.sin(time / 200 + j * 1.5 + timeOffset) * 0.25 + 
                    Math.cos(time / 150 - j * 2.5 + timeOffset) * 0.15;
      const rad = baseSize * (1 + noise);
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad * stretchY;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    // Close path with a jagged edge rather than perfect smooth curves
    ctx.closePath();
  };

  if (layer === 'under') {
    // Outer layer: Neon-magenta / Electric-cyan haze (fluid wisps)
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const waveX = Math.sin(time / 400 + i * 2) * (r * 1.2);
      const waveY = Math.cos(time / 500 + i) * (r * 0.5) + r * 1.2; // pooling downward
      const size = r * (0.8 + Math.sin(time / 300 + i) * 0.3);
      
      const grad = ctx.createRadialGradient(waveX, waveY, 0, waveX, waveY, size * 1.5);
      grad.addColorStop(0, 'rgba(148, 0, 211, 0)');
      grad.addColorStop(0.5, 'rgba(255, 0, 255, 0.3)');
      grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
      
      ctx.fillStyle = grad;
      // 8 points for a hazy, chaotic blob
      drawOrganicBlob(waveX, waveY, size, 8, i * 15, 1.3);
      ctx.fill();
    }
    
    // Dense Core layer: Pitch-black / void purple (jagged star-like core)
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 2; i++) {
      const coreX = Math.sin(time / 200 + i * 3) * (r * 0.3);
      const coreY = Math.cos(time / 250 + i * 3) * (r * 0.3) + r * 0.2;
      const cSize = r * 0.8;
      
      const coreGrad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, cSize * 1.2);
      coreGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      coreGrad.addColorStop(0.5, 'rgba(20, 0, 40, 0.8)');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = coreGrad;
      // 12 points for a more defined, jagged inner core
      drawOrganicBlob(coreX, coreY, cSize, 12, i * 10 + 100, 1.1);
      ctx.fill();
    }
  } else if (layer === 'over') {
    // Middle layer: Swirling violet plasma tendrils instead of circles
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 4; i++) {
      const swirlAngle = (time / 300) + (i * Math.PI * 2 / 4);
      const dist = r * 0.7 + Math.sin(time / 400 + i) * (r * 0.3);
      const sX = Math.cos(swirlAngle) * dist;
      const sY = Math.sin(swirlAngle) * dist + r * 0.5;
      const sSize = r * (0.5 + Math.cos(time / 200 + i) * 0.2);
      
      ctx.fillStyle = `rgba(80, 0, 150, ${0.4 + 0.2 * Math.sin(time / 300 + i)})`;
      
      // 6 points stretched vertically to look like tendrils pulling away
      drawOrganicBlob(sX, sY, sSize, 6, i * 25, 1.5);
      ctx.fill();
    }
  }

  ctx.restore();
}