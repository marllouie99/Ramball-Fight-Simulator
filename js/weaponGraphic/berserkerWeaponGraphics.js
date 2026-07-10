import { CONFIG } from '../config.js';

// berserkerWeaponGraphics.js
//  - Use this file for Berserker-specific weapon graphics (dual axes).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Berserker weapon visuals, edit the palette or drawBerserkerDualAxes() below.

export const BERSERKER_WEAPON_GRAPHICS = {
  axe: {
    handleBase: '#3a0000',           // Dark wooden handle
    handleRage: '#4a0000',           // Rage mode handle
    gripColor: '#230000',            // Grip wrap color
    collarColor: '#1a1a1a',          // Metal collar
    bladeCoreA: '#7a0909',           // Main blade color
    bladeCoreARage: '#ff2a2a',       // Rage mode blade
    bladeCoreB: '#a01a1a',           // Blade highlight
    bladeCoreBRage: '#ff6a6a',       // Rage mode highlight
    bladeSpine: '#320808',           // Blade shadow
    bladeSpineRage: '#4a0000',       // Rage mode shadow
    bladeEdge: '#d0a8a8',            // Blade edge
    bladeEdgeRage: '#ffd0d0',        // Rage mode edge
    rageGlow: 'rgba(255, 0, 0, 0.35)', // Rage aura
  },
  positioning: {
    scale: 1.05,
    sideOffset: 2,                   // Distance from fighter body edge
  },
  swingEffect: {
    primaryColor: '#8b0000',         // Normal swing arc
    primaryRage: '#ff3333',          // Rage swing arc
    secondaryColor: '#ffb0b0',       // Outer swing arc
    secondaryRage: '#ffd0d0',         // Rage outer arc
  },
};

export function drawBerserkerDualAxes(ctx, x, y, gunAngle, r, isInRage, axeSwingActive = false, axeSwingTimer = 0, axeSwingAngle = 0, axeSwingDuration = CONFIG.berserker?.axeSwingDurationFrames ?? 24, axeSlashFadeTimer = 0, rageFadeTimer = 0, axeHistory = []) {
  ctx.save();
  
  const scale = BERSERKER_WEAPON_GRAPHICS.positioning.scale;
  const sideOffset = r + BERSERKER_WEAPON_GRAPHICS.positioning.sideOffset;
  const fadeOutRatio = rageFadeTimer > 0 ? (rageFadeTimer / 45) : 0;
  const isGlowing = isInRage || rageFadeTimer > 0;
  const glowIntensity = isInRage ? 1.0 : fadeOutRatio;

  // Draw motion trail behind the character before translating to current position
  if (isGlowing && axeHistory && axeHistory.length > 0) {
    // Limit to max 4 points for performance
    const trailSlice = axeHistory.slice(-4);
    for (let i = 0; i < trailSlice.length; i++) {
      const hist = trailSlice[i];
      const age = (i + 1) / trailSlice.length; // 0 to 1
      const trailAlpha = 0.4 * glowIntensity * age;
      
      ctx.save();
      ctx.translate(hist.x, hist.y);
      ctx.rotate(hist.gunAngle);
      ctx.globalAlpha = trailAlpha;
      
      // Draw only the aura part of the axe for the trail
      drawSingleAxe(ctx, -sideOffset, scale, true, false, false, glowIntensity, true);
      drawSingleAxe(ctx, sideOffset, scale, true, true, false, glowIntensity, true);
      ctx.restore();
    }
  }

  ctx.translate(x, y);

  // Apply a "swing" rotation so the axes arc feels alive.
  // During swing, we blend from the default perpendicular pose to the swing angle.
  const defaultAxesRotation = axeSwingActive ? axeSwingAngle : gunAngle;
  let swingRot = 0;
  let swingProgress = 1.0;
  
  const SWING_DURATION = Math.max(1, axeSwingDuration || CONFIG.berserker?.axeSwingDurationFrames || 24);

  if (axeSwingActive) {
    // progress: 0 -> 1 as timer counts up toward the start of the swing
    // we invert because axeSwingTimer counts down.
    const t = Math.max(0, Math.min(1, (SWING_DURATION - axeSwingTimer) / SWING_DURATION));
    swingProgress = t;

    // Wind up backward first, then snap forward with an overshoot and settle.
    if (t < 0.22) {
      swingRot = -0.75 * (t / 0.22);
    } else if (t < 0.72) {
      const p = (t - 0.22) / 0.5;
      const ease = 1 - Math.pow(1 - p, 3);
      swingRot = -0.75 + ease * 2.65;
    } else {
      const p = (t - 0.72) / 0.28;
      swingRot = 1.9 * (1 - p) + 0.15 * p;
    }
  }

  if (axeSwingActive || axeSlashFadeTimer > 0) {
    const fade = axeSwingActive ? 1.0 : (axeSlashFadeTimer / 15);
    const facingAngle = axeSwingActive ? defaultAxesRotation : axeSwingAngle;
    drawBerserkerSwingEffect(ctx, r, swingProgress, fade, isInRage, facingAngle);
  }

  ctx.rotate(defaultAxesRotation + swingRot);

  drawSingleAxe(ctx, -sideOffset, scale, isGlowing, false, axeSwingActive, glowIntensity, false);
  drawSingleAxe(ctx, sideOffset, scale, isGlowing, true, axeSwingActive, glowIntensity, false);

  ctx.restore();
}

function hexToTransparentRgba(hex) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0)`;
}

function drawBerserkerSwingEffect(ctx, r, progress, fade, isInRage, facingAngle) {
  if (fade <= 0) return;

  const glowAlpha = Math.pow(fade, 0.8) * 0.95;
  const se = BERSERKER_WEAPON_GRAPHICS.swingEffect;
  const color1 = isInRage ? se.primaryRage : se.primaryColor;
  const color2 = isInRage ? se.secondaryRage : se.secondaryColor;

  ctx.save();
  ctx.rotate(facingAngle);
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';

  const arcRadius1 = r + 26;
  const arcRadius2 = r + 34;

  const fullStartA1 = -Math.PI / 2.8;
  const fullEndA1 = Math.PI / 2.8;
  const fullStartA2 = -Math.PI / 3.5;
  const fullEndA2 = Math.PI / 3.5;
  
  const currentEndA1 = fullStartA1 + (fullEndA1 - fullStartA1) * progress;
  const currentEndA2 = fullStartA2 + (fullEndA2 - fullStartA2) * progress;

  // Inner Arc
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, arcRadius1 + 10, fullStartA1 - 0.1, currentEndA1);
  ctx.closePath();
  ctx.clip();
  
  const fullStartY1 = Math.sin(fullStartA1) * arcRadius1;
  const currentY1 = Math.sin(currentEndA1) * arcRadius1;
  const gradEndY1 = Math.max(fullStartY1 + 0.1, currentY1); 
  
  const grad1 = ctx.createLinearGradient(0, fullStartY1, 0, gradEndY1);
  grad1.addColorStop(0, hexToTransparentRgba(color1));
  grad1.addColorStop(0.5, hexToTransparentRgba(color1).replace(', 0)', ', 0.3)'));
  grad1.addColorStop(1, color1);
  
  ctx.globalAlpha = glowAlpha * 0.85;
  ctx.strokeStyle = grad1;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, arcRadius1, fullStartA1, fullEndA1);
  ctx.stroke();
  ctx.restore();

  // Outer Arc
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, arcRadius2 + 10, fullStartA2 - 0.1, currentEndA2);
  ctx.closePath();
  ctx.clip();
  
  const fullStartY2 = Math.sin(fullStartA2) * arcRadius2;
  const currentY2 = Math.sin(currentEndA2) * arcRadius2;
  const gradEndY2 = Math.max(fullStartY2 + 0.1, currentY2); 
  
  const grad2 = ctx.createLinearGradient(0, fullStartY2, 0, gradEndY2);
  grad2.addColorStop(0, hexToTransparentRgba(color2));
  grad2.addColorStop(0.5, hexToTransparentRgba(color2).replace(', 0)', ', 0.3)'));
  grad2.addColorStop(1, color2);
  
  ctx.globalAlpha = glowAlpha * 0.6;
  ctx.strokeStyle = grad2;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, arcRadius2, fullStartA2, fullEndA2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Helper: draws one axe at the given xOffset (relative to rotated origin).
 * Completely redesigned to feature an aggressive, jagged, forged bearded axe, heavy back spikes, and glowing runes.
 */
function drawSingleAxe(ctx, xOffset, scale, isInRage, isRight, axeSwingActive, glowIntensity = 1.0, isTrail = false) {
  ctx.save();
  ctx.translate(xOffset, 0);

  const axe = BERSERKER_WEAPON_GRAPHICS.axe;
  const bladeDir = isRight ? 1 : -1;

  // Colors
  const handleBase = isInRage ? axe.handleRage : axe.handleBase;
  const bladeCoreA = isInRage ? axe.bladeCoreARage : axe.bladeCoreA;
  const bladeCoreB = isInRage ? axe.bladeCoreBRage : axe.bladeCoreB;
  const bladeSpine = isInRage ? axe.bladeSpineRage : axe.bladeSpine;
  const bladeEdge = isInRage ? axe.bladeEdgeRage : axe.bladeEdge;

  // --- HANDLE ---
  // Core shaft (dark wood or metal)
  ctx.fillStyle = handleBase;
  ctx.fillRect(-2.5 * scale, -12 * scale, 5 * scale, 36 * scale);
  
  // Leather wrap (rugged, horizontal/angled strips on lower grip)
  ctx.strokeStyle = axe.gripColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.lineCap = 'butt';
  for (let i = 0; i < 7; i++) {
    const yy = 6 * scale + i * 3 * scale;
    ctx.beginPath();
    ctx.moveTo(-2.5 * scale, yy);
    ctx.lineTo(2.5 * scale, yy + 1.5 * scale);
    ctx.stroke();
  }

  // Pommel (Crushing mace head / heavy spike)
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(-4 * scale, 24 * scale);
  ctx.lineTo(4 * scale, 24 * scale);
  ctx.lineTo(5 * scale, 28 * scale);
  ctx.lineTo(0, 34 * scale);
  ctx.lineTo(-5 * scale, 28 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --- COLLAR (Forged Armor Housing) ---
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  // Bulky rectangular clamp with angled corners
  ctx.moveTo(-4 * scale, -18 * scale);
  ctx.lineTo(4 * scale, -18 * scale);
  ctx.lineTo(5 * scale, -14 * scale);
  ctx.lineTo(5 * scale, 2 * scale);
  ctx.lineTo(4 * scale, 6 * scale);
  ctx.lineTo(-4 * scale, 6 * scale);
  ctx.lineTo(-5 * scale, 2 * scale);
  ctx.lineTo(-5 * scale, -14 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing vertical rune in the collar
  ctx.fillStyle = isInRage ? '#fff' : bladeCoreA;
  if (!isTrail) {
    ctx.shadowColor = isInRage ? '#ff0000' : bladeCoreB;
    ctx.shadowBlur = isInRage ? 15 : 5;
  }
  ctx.beginPath();
  ctx.moveTo(0, -14 * scale);
  ctx.lineTo(1.5 * scale, -10 * scale);
  ctx.lineTo(0, -2 * scale);
  ctx.lineTo(-1.5 * scale, -10 * scale);
  ctx.closePath();
  ctx.fill();
  if (!isTrail) {
    ctx.shadowBlur = 0; // reset
  }

  // --- BLADE ---
  // Rage glow behind the blade (Flickering fiery energy aura)
  if (isInRage) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const t = Date.now() / 70; // Fast flicker
    
    // Draw fewer layers for trails to optimize FPS
    const numLayers = isTrail ? 1 : 3;
    
    for (let i = 0; i < numLayers; i++) {
      ctx.beginPath();
      ctx.moveTo(bladeDir * 2 * scale, -16 * scale);
      
      // Jitter function makes the aura spike out randomly
      const jx = (val) => val + (Math.sin(t * (i + 1) + val) * 2 - 1) * (3 + i) * scale;
      const jy = (val) => val + (Math.cos(t * (i + 2) + val) * 2 - 1) * (3 + i) * scale;

      ctx.lineTo(jx(bladeDir * 18 * scale), jy(-22 * scale)); 
      ctx.lineTo(jx(bladeDir * 25 * scale), jy(-10 * scale));
      ctx.lineTo(jx(bladeDir * 22 * scale), jy(14 * scale));
      
      // Wrap around the back hook
      ctx.lineTo(jx(-bladeDir * 20 * scale), jy(5 * scale));
      ctx.lineTo(jx(-bladeDir * 16 * scale), jy(-18 * scale));
      ctx.closePath();

      ctx.fillStyle = i === 0 ? `rgba(255, 0, 0, ${0.4 * glowIntensity})` : 
                      i === 1 ? `rgba(220, 0, 0, ${0.25 * glowIntensity})` : 
                                `rgba(180, 0, 0, ${0.15 * glowIntensity})`;
      
      // shadowBlur is very expensive, disable it for trails
      if (!isTrail) {
        ctx.shadowColor = '#ff2000';
        ctx.shadowBlur = (10 + i * 10) * glowIntensity;
      }
      ctx.fill();
    }
    ctx.restore();
  }

  if (isTrail) {
    ctx.restore();
    return; // Do not draw the physical axe body if this is just a motion trail layer
  }

  // Main Blade (Brutal Bearded Axe)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bladeDir * 2 * scale, -16 * scale); // Top attachment
  ctx.lineTo(bladeDir * 15 * scale, -18 * scale); // Top outer spike
  ctx.lineTo(bladeDir * 20 * scale, -10 * scale); // Mid outer 1 (chopping face)
  ctx.lineTo(bladeDir * 16 * scale, -7 * scale); // Jagged notch inner
  ctx.lineTo(bladeDir * 21 * scale, -4 * scale); // Jagged notch outer
  ctx.lineTo(bladeDir * 19 * scale, 10 * scale); // Beard outer point
  ctx.lineTo(bladeDir * 16 * scale, 14 * scale); // Bottom beard corner
  ctx.lineTo(bladeDir * 2 * scale, 4 * scale); // Bottom attachment
  ctx.quadraticCurveTo(bladeDir * 10 * scale, -6 * scale, bladeDir * 2 * scale, -16 * scale); // Inner cutout
  ctx.closePath();

  // Metallic gradient across the blade body
  const bodyGrad = ctx.createLinearGradient(0, -18 * scale, bladeDir * 21 * scale, 14 * scale);
  bodyGrad.addColorStop(0, bladeSpine);
  bodyGrad.addColorStop(0.5, bladeCoreA);
  bodyGrad.addColorStop(1, bladeCoreB);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Spine outline
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = bladeSpine;
  ctx.stroke();

  // Inner groove/blood channel
  ctx.beginPath();
  ctx.moveTo(bladeDir * 6 * scale, -12 * scale);
  ctx.lineTo(bladeDir * 14 * scale, -12 * scale);
  ctx.lineTo(bladeDir * 12 * scale, -7 * scale);
  ctx.lineTo(bladeDir * 15 * scale, -4 * scale);
  ctx.lineTo(bladeDir * 14 * scale, 4 * scale);
  ctx.lineTo(bladeDir * 11 * scale, 6 * scale);
  ctx.lineTo(bladeDir * 6 * scale, 0 * scale);
  ctx.lineWidth = 1.2 * scale;
  
  if (isInRage) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = (0.6 + 0.4 * Math.sin(Date.now() / 100)) * glowIntensity;
    ctx.strokeStyle = `rgba(255, 50, 50, ${pulse})`;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 10 * glowIntensity;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = 'rgba(30, 0, 0, 0.6)';
    ctx.stroke();
  }

  // Bright edge rim (Sharpened chopping edge)
  ctx.beginPath();
  ctx.moveTo(bladeDir * 15 * scale, -18 * scale);
  ctx.lineTo(bladeDir * 20 * scale, -10 * scale);
  ctx.lineTo(bladeDir * 16 * scale, -7 * scale);
  ctx.lineTo(bladeDir * 21 * scale, -4 * scale);
  ctx.lineTo(bladeDir * 19 * scale, 10 * scale);
  ctx.lineTo(bladeDir * 16 * scale, 14 * scale);
  
  ctx.lineWidth = 1.8 * scale;
  ctx.strokeStyle = bladeEdge;
  if (isInRage) {
    ctx.shadowColor = '#ff5555';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#ffffff';
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // --- BACK SPIKE (Forged Hook) ---
  ctx.beginPath();
  ctx.moveTo(-bladeDir * 2 * scale, -12 * scale); // Top attachment
  ctx.lineTo(-bladeDir * 14 * scale, -10 * scale); // Top outer
  ctx.lineTo(-bladeDir * 10 * scale, -7 * scale); // Notch inner
  ctx.lineTo(-bladeDir * 18 * scale, 0 * scale); // Bottom outer hook
  ctx.lineTo(-bladeDir * 2 * scale, -4 * scale); // Bottom attachment
  ctx.quadraticCurveTo(-bladeDir * 6 * scale, -8 * scale, -bladeDir * 2 * scale, -12 * scale); // Inner curve
  ctx.closePath();
  
  const spikeGrad = ctx.createLinearGradient(0, -12 * scale, -bladeDir * 18 * scale, 0);
  spikeGrad.addColorStop(0, bladeCoreA);
  spikeGrad.addColorStop(1, bladeSpine);
  ctx.fillStyle = spikeGrad;
  ctx.fill();
  
  ctx.lineWidth = 1 * scale;
  ctx.strokeStyle = bladeSpine;
  ctx.stroke();
  
  // Spike Edge highlight
  ctx.beginPath();
  ctx.moveTo(-bladeDir * 14 * scale, -10 * scale);
  ctx.lineTo(-bladeDir * 10 * scale, -7 * scale);
  ctx.lineTo(-bladeDir * 18 * scale, 0 * scale);
  ctx.lineWidth = 1.2 * scale;
  ctx.strokeStyle = bladeEdge;
  ctx.stroke();

  ctx.restore();
}
