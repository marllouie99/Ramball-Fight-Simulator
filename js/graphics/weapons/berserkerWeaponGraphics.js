import { CONFIG } from '../../core/config.js';

// berserkerWeaponGraphics.js
//  - Use this file for Berserker-specific weapon graphics (dual axes).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Berserker weapon visuals, edit the palette or drawBerserkerDualAxes() below.

export const BERSERKER_WEAPON_GRAPHICS = {
  axe: {
    handleBase: '#4a3018',           // Brown wooden handle
    handleRage: '#5a2010',           // Rage mode handle (darkens slightly reddish)
    gripColor: '#1a1105',            // Dark leather grip wrap
    collarColor: '#222222',          // Dark iron metal collar
    bladeCoreA: '#b0b5b9',           // Main blade color (steel)
    bladeCoreARage: '#ff2a2a',       // Rage mode blade (glows red)
    bladeCoreB: '#d0d5d9',           // Blade highlight (light steel)
    bladeCoreBRage: '#ff6a6a',       // Rage mode highlight
    bladeSpine: '#404549',           // Blade shadow (dark iron)
    bladeSpineRage: '#6a1010',       // Rage mode shadow
    bladeEdge: '#f0f5f9',            // Blade edge (sharp bright steel)
    bladeEdgeRage: '#ffd0d0',        // Rage mode edge
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

      if (Math.abs(hist.gunAngle) > Math.PI / 2) {
        ctx.scale(1, -1);
      }

      ctx.globalAlpha = trailAlpha;

      // Draw trail axes statically since calculating swing state for trails is expensive
      ctx.save();
      ctx.translate(0, -sideOffset);
      ctx.scale(1, -1);
      drawSingleAxe(ctx, 0, scale, true, true, false, glowIntensity, true);
      ctx.restore();

      ctx.save();
      ctx.translate(0, sideOffset);
      drawSingleAxe(ctx, 0, scale, true, true, false, glowIntensity, true);
      ctx.restore();

      ctx.restore();
    }
  }

  ctx.translate(x, y);

  const defaultAxesRotation = axeSwingActive ? axeSwingAngle : gunAngle;
  let swingProgress = 1.0;

  const SWING_DURATION = Math.max(1, axeSwingDuration || CONFIG.berserker?.axeSwingDurationFrames || 24);

  let leftRot = 0, rightRot = 0;
  let leftFwd = 0, rightFwd = 0;

  if (axeSwingActive) {
    const t = Math.max(0, Math.min(1, (SWING_DURATION - axeSwingTimer) / SWING_DURATION));
    swingProgress = t;

    // Helper for alternating chop animation
    const getChopTransform = (lt) => {
      let rot = 0;
      let fwd = 0;
      if (lt < 0.25) { // wind up backward & outward
        rot = 1.2 * (lt / 0.25);
        fwd = -8 * (lt / 0.25);
      } else if (lt < 0.6) { // chop forward & inward
        const p = (lt - 0.25) / 0.35;
        const ease = 1 - Math.pow(1 - p, 4);
        rot = 1.2 - ease * 2.8;
        fwd = -8 + ease * 36;
      } else { // recover
        const p = (lt - 0.6) / 0.4;
        rot = -1.6 * (1 - p);
        fwd = 28 * (1 - p);
      }
      return { rot, fwd };
    };

    if (t < 0.5) {
      // Right axe swings (t: 0 to 0.5)
      const lt = t / 0.5;
      const { rot, fwd } = getChopTransform(lt);
      rightRot = rot;
      rightFwd = fwd;
    } else {
      // Left axe swings (t: 0.5 to 1.0)
      const lt = (t - 0.5) / 0.5;
      const { rot, fwd } = getChopTransform(lt);
      leftRot = rot;
      leftFwd = fwd;
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
  ctx.translate(holdX + leftFwd, holdY);
  ctx.rotate(holdRot + leftRot);
  // isRight=false so blade faces inward (towards center)
  drawSingleAxe(ctx, 0, scale, isGlowing, false, axeSwingActive, glowIntensity, false);
  ctx.restore();

  // Draw Right Axe
  ctx.save();
  ctx.translate(holdX + rightFwd, holdY);
  ctx.rotate(holdRot + rightRot);
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
    if (particleIntensity > 0.5) {
        const particleCount = isInRage ? 8 : 4;
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
    // OPTIMIZED: Removed shadowBlur (expensive operation)
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
    // OPTIMIZED: Removed shadowBlur (expensive operation)
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
    // OPTIMIZED: Removed shadowBlur (expensive operation)
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
