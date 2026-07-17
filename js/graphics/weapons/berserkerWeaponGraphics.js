import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';

// berserkerWeaponGraphics.js
//  - Use this file for Berserker-specific weapon graphics (dual axes).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Berserker weapon visuals, edit the palette or drawBerserkerDualAxes() below.

export const BERSERKER_WEAPON_GRAPHICS = {
  axe: {
    handleBase: '#2b2d31',           // Dark grey metal handle (sci-fi)
    handleRage: '#3a1e1e',           // Rage mode handle
    gripColor: '#0a0b0c',            // Black synthetic grip wrap
    collarColor: '#181a1f',          // Dark armor alloy collar
    bladeCoreA: '#353a40',           // Main blade color (dark sci-fi alloy)
    bladeCoreARage: '#4a2020',       // Rage mode blade
    bladeCoreB: '#4c535c',           // Blade highlight (lighter alloy)
    bladeCoreBRage: '#6a2b2b',       // Rage mode highlight
    bladeSpine: '#000000',           // Black edges
    bladeSpineRage: '#000000',       // Black edges in rage
    bladeEdge: '#000000',            // Black neon edge
    bladeEdgeRage: '#ff3333',        // Neon red edge in rage
    rageGlow: 'rgba(255, 0, 0, 0.35)', // Rage aura
  },
  positioning: {
    scale: 1.05,
    sideOffset: 2,                   // Distance from fighter body edge
  },
  swingEffect: {
    primaryColor: '#cccccc',         // Normal swing arc (steel swoosh)
    primaryRage: '#ff3333',          // Rage swing arc
    secondaryColor: '#ffffff',       // Outer swing arc (bright steel)
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

  ctx.translate(x, y);

  const defaultAxesRotation = axeSwingActive ? axeSwingAngle : gunAngle;
  let swingProgress = 1.0;

  const SWING_DURATION = Math.max(1, axeSwingDuration || CONFIG.berserker?.axeSwingDurationFrames || 24);

  let leftArmRot = 0, leftWristRot = 0, leftFwd = 0, leftSide = 0;
  let rightArmRot = 0, rightWristRot = 0, rightFwd = 0, rightSide = 0;

  if (axeSwingActive) {
    const t = Math.max(0, Math.min(1, (SWING_DURATION - axeSwingTimer) / SWING_DURATION));
    swingProgress = t;

    // Helper for alternating chop animation with smooth easing and 2D path
    const getChopTransform = (lt) => {
      let armRot = 0;
      let wristRot = 0;
      let fwd = 0;
      let side = 0;

      if (lt <= 0 || lt >= 1) return { armRot, wristRot, fwd, side };

      // Using smoothstep (p * p * (3 - 2 * p)) ensures there are no instant velocity jumps between frames
      if (lt < 0.25) { // Wind up (expanded to ~5 frames)
        const p = lt / 0.25;
        const ease = p * p * (3 - 2 * p);
        armRot = 0.5 * ease;       
        wristRot = 0.5 * ease;     
        fwd = -5 * ease;           
        side = 8 * ease;          
      } else if (lt < 0.65) { // The Slash (expanded to ~7.5 frames)
        const p = (lt - 0.25) / 0.40;
        const ease = p * p * (3 - 2 * p); 
        armRot = 0.5 - ease * 2.0;   // 114 degree sweep
        wristRot = 0.5 - ease * 2.0; 
        fwd = -5 + ease * 25;        
        side = 8 - ease * 12;       
      } else { // Recovery (expanded to ~6.5 frames, twice as long as before!)
        const p = (lt - 0.65) / 0.35;
        const ease = p * p * (3 - 2 * p); 
        armRot = -1.5 * (1 - ease); 
        wristRot = -1.5 * (1 - ease);
        fwd = 20 * (1 - ease); 
        side = -4 * (1 - ease);
      }

      return { armRot, wristRot, fwd, side };
    };

    // Right axe swings from t=0.0 to t=0.8 (Gets 19 frames instead of 12!)
    if (t < 0.8) {
      const lt = t / 0.8;
      const { armRot, wristRot, fwd, side } = getChopTransform(lt);
      rightArmRot = armRot;
      rightWristRot = wristRot;
      rightFwd = fwd;
      rightSide = side;
    }

    // Left axe swings from t=0.2 to t=1.0 (Gets 19 frames instead of 12!)
    if (t > 0.2) {
      const lt = (t - 0.2) / 0.8;
      const { armRot, wristRot, fwd, side } = getChopTransform(lt);
      leftArmRot = armRot;
      leftWristRot = wristRot;
      leftFwd = fwd;
      leftSide = side;
    }
  }

  if (axeSwingActive || axeSlashFadeTimer > 0) {
    const fade = axeSwingActive ? 1.0 : (axeSlashFadeTimer / 15);
    const facingAngle = axeSwingActive ? defaultAxesRotation : axeSwingAngle;
    drawBerserkerSwingEffect(ctx, r, swingProgress, fade, isInRage, facingAngle);
  }

  ctx.rotate(defaultAxesRotation);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // Base holding position
  // Move axes further out from the body so they don't cover the character
  const holdX = r * 0.8;
  const holdY = sideOffset * 1.4;
  const holdRot = Math.PI / 2; // Handle points backward, head points forward

  // Draw Left Axe (mirrored vertically)
  ctx.save();
  ctx.scale(1, -1); // Mirror Y so it's symmetrical to the right axe
  ctx.rotate(leftArmRot); // Swing around body
  ctx.translate(holdX + leftFwd, holdY + leftSide); // 2D sweep path
  ctx.rotate(holdRot + leftWristRot); // Local wrist rotation
  // isRight=false so blade faces inward (towards center)
  drawSingleAxe(ctx, 0, scale, isGlowing, false, axeSwingActive, glowIntensity, false);
  ctx.restore();

  // Draw Right Axe
  ctx.save();
  ctx.rotate(rightArmRot); // Swing around body
  ctx.translate(holdX + rightFwd, holdY + rightSide); // 2D sweep path
  ctx.rotate(holdRot + rightWristRot); // Local wrist rotation
  drawSingleAxe(ctx, 0, scale, isGlowing, false, axeSwingActive, glowIntensity, false);
  ctx.restore();

  ctx.restore();
}


function hexToTransparentRgba(hex, alpha = 0) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Enhanced Berserker Swing Effect.
 * This function creates a more dynamic and impactful 'X' slash effect with particles,
 * a shockwave, and more aggressive visuals, especially in rage mode.
 */
function drawBerserkerSwingEffect(ctx, r, progress, fade, isInRage, facingAngle) {
    if (fade <= 0) return;

    const glowAlpha = Math.pow(fade, 0.75);
    const se = BERSERKER_WEAPON_GRAPHICS.swingEffect;

    ctx.save();
    ctx.rotate(facingAngle);

    // The composite operation determines how colors blend. 'screen' or 'lighter' are good for glows.
    ctx.globalCompositeOperation = isInRage ? 'lighter' : 'screen';

    // Defines the two slashes. The right axe swings first, then the left.
    const rightSlashProgress = Math.min(1, Math.max(0, progress * 2.0));
    const leftSlashProgress = Math.min(1, Math.max(0, (progress - 0.45) * 2.0));

    const baseColor = isInRage ? se.primaryRage : se.primaryColor;
    const coreColor = isInRage ? '#ffffff' : '#ffdddd';
    const particleColors = isInRage ? ['#ff0000', '#ff8800', '#ffffff'] : ['#ffffff', '#cccccc'];

    // Draw both slashes
    if (rightSlashProgress > 0) {
        drawImpactfulSlash(ctx, r, rightSlashProgress, glowAlpha, false, isInRage, baseColor, coreColor, particleColors);
    }
    if (leftSlashProgress > 0) {
        drawImpactfulSlash(ctx, r, leftSlashProgress, glowAlpha, true, isInRage, baseColor, coreColor, particleColors);
    }

    ctx.restore();
}

/**
 * Helper: draws a single, more visually aggressive slash.
 */
function drawImpactfulSlash(ctx, r, slashProgress, totalAlpha, isLeft, isInRage, baseColor, coreColor, particleColors) {
    if (slashProgress <= 0 || slashProgress >= 1) return;

    const fps = state.fps || 60;
    const qualityLevel = state.qualityLevel || 1.0;
    const isMulti = state.mode === GAME_MODES.FFA || state.mode === GAME_MODES.TWO_VS_TWO;
    const useLOD = isMulti && (qualityLevel < 1.0 || fps < 55);
    const useUltraLOD = isMulti && (qualityLevel <= 0.5 || fps < 40);

    ctx.save();

    // --- Animation Properties ---
    // The animation is broken into phases: wind-up (invisible), slash, and fade-out.
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
    const scale = easeOutQuart(Math.sin(slashProgress * Math.PI)); // Grows and shrinks smoothly
    const alpha = (1 - Math.pow(slashProgress, 2)) * totalAlpha; // Fades out over time

    // --- Positioning ---
    // The slash is pushed forward from the character's center.
    const distance = r + 15 + Math.pow(slashProgress, 0.7) * 35;
    ctx.translate(distance, 0);

    // The tilt creates the 'X' shape when two slashes are drawn.
    const tilt = isLeft ? Math.PI / 4 : -Math.PI / 4;
    ctx.rotate(tilt);

    const length = 50 + 20 * scale;
    const thickness = (18 + 10 * (isInRage ? 1.5 : 1)) * scale;

    // --- Main Slash Shape (Thick, curved blade arc) ---
    ctx.beginPath();
    ctx.moveTo(0, -length / 2);
    ctx.quadraticCurveTo(thickness, 0, 0, length / 2);
    ctx.quadraticCurveTo(thickness * 0.7, 0, 0, -length / 2);
    ctx.closePath();

    // --- Main Fill (Gradient for depth) ---
    const grad = ctx.createLinearGradient(0, -length / 2, 0, length / 2);
    grad.addColorStop(0, hexToTransparentRgba(baseColor, 0));
    grad.addColorStop(0.5, baseColor);
    grad.addColorStop(1, hexToTransparentRgba(baseColor, 0));

    ctx.fillStyle = grad;
    ctx.globalAlpha = alpha;
    ctx.fill();

    // --- Inner Core (Bright, hot center of the slash) ---
    if (slashProgress < 0.8) {
        ctx.beginPath();
        ctx.moveTo(0, -length * 0.4);
        ctx.quadraticCurveTo(thickness * 0.4, 0, 0, length * 0.4);
        ctx.quadraticCurveTo(thickness * 0.2, 0, 0, -length * 0.4);
        ctx.fillStyle = coreColor;
        ctx.globalAlpha = alpha * (1 - slashProgress); // Fades faster
        ctx.fill();
    }

    // --- Leading Edge (Sharp line) ---
    ctx.beginPath();
    ctx.moveTo(0, -length / 2);
    ctx.quadraticCurveTo(thickness, 0, 0, length / 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 * scale;
    ctx.globalAlpha = alpha * 0.8;
    ctx.stroke();

    // --- Particle Burst ---
    // Particles are generated most intensely around the middle of the animation.
    const particleIntensity = Math.sin(slashProgress * Math.PI);
    if (!useUltraLOD && particleIntensity > 0.5) {
        const particleCount = useLOD ? (isInRage ? 4 : 2) : (isInRage ? 8 : 4);
        for (let i = 0; i < particleCount; i++) {
            const pAlpha = alpha * (0.5 + Math.random() * 0.5);
            const pSize = 1 + Math.random() * 2.5 * (isInRage ? 1.5 : 1);
            
            // Particles fly outwards from the slash center
            const angle = (Math.random() - 0.5) * Math.PI * 1.5;
            const speed = (20 + Math.random() * 30) * particleIntensity;
            const px = thickness / 2 + Math.cos(angle) * speed;
            const py = Math.sin(angle) * speed;

            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fillStyle = particleColors[Math.floor(Math.random() * particleColors.length)];
            ctx.globalAlpha = pAlpha;
            ctx.fill();
        }
    }
    
    ctx.restore();
}

/**
 * Helper: draws one axe at the given xOffset (relative to rotated origin).
 * Completely redesigned to feature an aggressive, jagged, forged bearded axe, heavy back spikes, and glowing runes.
 */
function drawSingleAxe(ctx, xOffset, scale, isInRage, isRight, axeSwingActive, glowIntensity = 1.0, isTrail = false) {
  const fps = state.fps || 60;
  const qualityLevel = state.qualityLevel || 1.0;
  const isMulti = state.mode === GAME_MODES.FFA || state.mode === GAME_MODES.TWO_VS_TWO;
  const useLOD = isMulti && (qualityLevel < 1.0 || fps < 55);
  const useUltraLOD = isMulti && (qualityLevel <= 0.5 || fps < 40);

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
  ctx.fillStyle = handleBase;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.rect(-2.5 * scale, -12 * scale, 5 * scale, 52 * scale);
  ctx.fill();
  ctx.stroke();

  // Leather wrap (rugged, horizontal/angled strips on lower grip)
  ctx.strokeStyle = axe.gripColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.lineCap = 'butt';
  for (let i = 0; i < 13; i++) {
    const yy = 2 * scale + i * 3 * scale;
    ctx.beginPath();
    ctx.moveTo(-2.5 * scale, yy);
    ctx.lineTo(2.5 * scale, yy + 1.5 * scale);
    ctx.stroke();
  }

  // Pommel (Crushing mace head / heavy spike)
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-4 * scale, 40 * scale);
  ctx.lineTo(4 * scale, 40 * scale);
  ctx.lineTo(5 * scale, 44 * scale);
  ctx.lineTo(0, 50 * scale);
  ctx.lineTo(-5 * scale, 44 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --- COLLAR (Forged Armor Housing) ---
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 * scale;
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
  ctx.fillStyle = isInRage ? '#fff' : bladeEdge;
  if (!isTrail && !useUltraLOD) {
    ctx.shadowColor = isInRage ? '#ff3333' : '#000000';
    ctx.shadowBlur = 6 * scale;
  }
  ctx.beginPath();
  ctx.moveTo(0, -14 * scale);
  ctx.lineTo(1.5 * scale, -10 * scale);
  ctx.lineTo(0, -2 * scale);
  ctx.lineTo(-1.5 * scale, -10 * scale);
  ctx.closePath();
  ctx.fill();
  if (!isTrail && !useUltraLOD) {
    ctx.shadowBlur = 0; // reset
  }

  // --- BLADE ---
  // Rage glow behind the blade (Flickering fiery energy aura)
  if (isInRage) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const t = Date.now() / 70; // Fast flicker

    // Draw fewer layers for trails to optimize FPS
    const numLayers = isTrail ? 1 : (useUltraLOD ? 1 : (useLOD ? 2 : 3));

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
      if (!isTrail && !useUltraLOD) {
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

  const pulse = (0.7 + 0.3 * Math.sin(Date.now() / 150)) * glowIntensity;

  // Spine outline (normal dark stroke)
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = '#000000';
  ctx.stroke();
  ctx.restore();

  // Inner Groove (Dark indent)
  ctx.beginPath();
  ctx.moveTo(bladeDir * 6 * scale, -12 * scale);
  ctx.lineTo(bladeDir * 14 * scale, -12 * scale);
  ctx.lineTo(bladeDir * 12 * scale, -7 * scale);
  ctx.lineTo(bladeDir * 15 * scale, -4 * scale);
  ctx.lineTo(bladeDir * 14 * scale, 4 * scale);
  ctx.lineTo(bladeDir * 11 * scale, 6 * scale);
  ctx.lineTo(bladeDir * 6 * scale, 0 * scale);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = '#111111';
  ctx.fillStyle = '#222222';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Bright edge rim (Glowing neon on the axe's blade chopping edge)
  ctx.beginPath();
  ctx.moveTo(bladeDir * 15 * scale, -18 * scale);
  ctx.lineTo(bladeDir * 20 * scale, -10 * scale);
  ctx.lineTo(bladeDir * 16 * scale, -7 * scale);
  ctx.lineTo(bladeDir * 21 * scale, -4 * scale);
  ctx.lineTo(bladeDir * 19 * scale, 10 * scale);
  ctx.lineTo(bladeDir * 16 * scale, 14 * scale);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
    
    // Outer glow
    ctx.lineWidth = 6.0 * scale;
    ctx.globalAlpha = 0.5 * pulse;
    ctx.strokeStyle = isInRage ? '#ff0000' : '#000000';
    if (!isTrail && !useUltraLOD) { 
        ctx.shadowColor = isInRage ? '#ff0000' : '#000000'; 
        ctx.shadowBlur = 15 * scale; 
    }
    ctx.stroke();
    
    // Mid glow
    ctx.lineWidth = 3.0 * scale;
    ctx.globalAlpha = 1.0 * pulse;
    ctx.strokeStyle = isInRage ? '#ff3333' : '#111111';
    ctx.stroke();
    
    // Inner core
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 1.0 * scale;
    ctx.strokeStyle = isInRage ? '#ffcccc' : '#333333';
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
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

  // Stroke for back spike
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = '#000000';
  ctx.stroke();
  ctx.restore();

  // Spike Edge highlight (metallic)
  ctx.beginPath();
  ctx.moveTo(-bladeDir * 14 * scale, -10 * scale);
  ctx.lineTo(-bladeDir * 10 * scale, -7 * scale);
  ctx.lineTo(-bladeDir * 18 * scale, 0 * scale);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = bladeCoreB;
  ctx.stroke();
  ctx.restore();
  
  // Draw Hand (Grip)
  ctx.beginPath();
  ctx.arc(0, 15 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#cc0000'; // Dark red matching Berserker
  ctx.fill();
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  ctx.restore();
}

