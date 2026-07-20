import { CONFIG } from '../../core/config.js';


const RubyTheme = {
  glowShadow: 'rgba(255, 0, 100, 1)',
  aura: 'rgba(10, 0, 5, 0.85)',
  core: 'rgba(255, 0, 100, 0.9)',
  glowSrc1: '#ff0055',
  glowSrc2: '#ff1493',
  darkSrc1: '#1a000d',
  darkSrc2: '#4a001a',
  heatSoft1: '255, 0, 85',
  heatSoft2: '200, 0, 60',
  plasma1: 'rgba(255, 20, 100, 0.8)',
  plasma2: 'rgba(200, 0, 80, 0.4)',
  guard1: '130, 0, 10',
  guard2: '40, 0, 5',
  bladeSnout: '#ef4444',
  candy1: '#990033',
  candy2: '#ff0055',
  candy3: '#ff1493',
  candy4: '#cc0052',
  candy5: '#80002a',
  panel: 'rgba(127, 29, 29, 0.6)'
};

export function drawRubyScythe(ctx, fighter, customTheme = null) {
  const theme = customTheme || RubyTheme;
  const baseAlpha = ctx.globalAlpha;
  // --- Pre-calculate weapon transforms for trails and particles ---
  let currentAngle = fighter.gunAngle;
  let stretchAmount = 0;
  let bladeRotation = 0;

  if (fighter.passiveSpinActive) {
    const progress = 1 - (fighter.passiveSpinTimer / fighter.passiveSpinDuration);
    currentAngle += progress * Math.PI * 4;
  }
  else if (fighter.activePullActive) {
    const phase = fighter.activePullPhase;
    currentAngle = fighter.activePullAngle;
    const maxStretch = (CONFIG.ruby.activePullRange || 200) - fighter.r;

    if (phase === 0) {
      // WIND_UP: Smoothly pull the scythe back in anticipation
      const t = 1 - (fighter.activePullPhaseTimer / fighter.pullPhaseWindUp);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      stretchAmount = -40 * ease; // pull the shaft backwards heavily
      bladeRotation = -Math.PI / 1.5 * ease; // wind up the blade to open it completely
      
      const rotSign = (Math.abs(fighter.activePullAngle) > Math.PI / 2) ? -1 : 1;
      currentAngle -= (Math.PI / 1.5 * ease) * rotSign; // rotate the weapon far back behind her (120 degrees)
    }
    else if (phase === 1) {
      // SWING_OUT: Snap forward
      const t = 1 - (fighter.activePullPhaseTimer / fighter.pullPhaseSwingOut);
      const easeOut = 1 - Math.pow(1 - t, 3);
      stretchAmount = -40 * (1 - easeOut) + maxStretch * easeOut; // transition from -40
      bladeRotation = -Math.PI / 1.5 * (1 - easeOut); // snap blade closed from 120 deg
      
      const rotSign = (Math.abs(fighter.activePullAngle) > Math.PI / 2) ? -1 : 1;
      
      // We also snap the angle forward from the wind-up position (-Math.PI/1.5)
      // The old +0.35 is kept for a slight overshoot effect
      currentAngle += (-Math.PI / 1.5 * rotSign) * (1 - easeOut) + (1 - easeOut) * 0.35 * rotSign;
    }
    else if (phase === 2) {
      // HOOK_GRAB
      stretchAmount = maxStretch;
    }
    else if (phase === 3) {
      // PULL_DRAG
      const t = 1 - (fighter.activePullPhaseTimer / fighter.pullPhasePullDrag);
      // Use ease-out to match the spring-like drag physics of the target
      const easeOut = 1 - Math.pow(1 - t, 3);
      stretchAmount = maxStretch * (1 - easeOut);
    }
    else if (phase === 4) {
      // DISENGAGE
      stretchAmount = 0;
    }
  }
  else if (fighter.scytheSwingActive) {
    const progress = 1 - (fighter.scytheSwingTimer / fighter.scytheSwingDuration);
    const swingArc = Math.PI / 1.5;
    currentAngle = fighter.scytheSwingAngle - (swingArc / 2) + (swingArc * progress);
  }

  let flipAngle = currentAngle;
  if (fighter.activePullActive) {
    flipAngle = fighter.activePullAngle;
  } else if (fighter.scytheSwingActive) {
    flipAngle = fighter.scytheSwingAngle;
  }
  const isFlipped = Math.abs(flipAngle) > Math.PI / 2 && !fighter.passiveSpinActive;
  
  const basePoleLength = 100;
  const poleLength = basePoleLength; // The pole stays a fixed length, no longer stretching like rubber
  const poleW = 2.2;
  const tipX = -90, tipY = -110;
  const bladeScale = 0.55;
  const gripOffset = -28;

  // --- Blade Trail / Afterimage Logic ---
  if (!fighter.bladeTrail) {
    fighter.bladeTrail = [];
  }

  // Decay old trail segments
  for (let i = fighter.bladeTrail.length - 1; i >= 0; i--) {
    fighter.bladeTrail[i].life -= 0.04; // 25 frames lifetime
    if (fighter.bladeTrail[i].life <= 0) {
      fighter.bladeTrail.splice(i, 1);
    }
  }

  // Calculate blade world coordinates
  const getScytheWorldPos = (localX, localY) => {
    let lx = localX * bladeScale;
    let ly = localY * bladeScale;
    
    lx += poleLength;
    lx += fighter.r + gripOffset;
    
    if (isFlipped) {
      ly = -ly;
    }
    
    const cos = Math.cos(currentAngle);
    const sin = Math.sin(currentAngle);
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    
    return {
      x: fighter.x + rx,
      y: fighter.y + ry
    };
  };

  // Make the ribbon a sharp slash from the tip, rather than spanning the entire blade
  const outerPos = getScytheWorldPos(tipX, tipY); 
  const innerX = tipX + (15 - tipX) * 0.2; // 20% down the spine towards the base
  const innerY = tipY + (-12 - tipY) * 0.2;
  const innerPos = getScytheWorldPos(innerX, innerY);

  let shouldAddTrail = true;
  if (fighter.bladeTrail.length > 0) {
    const last = fighter.bladeTrail[fighter.bladeTrail.length - 1];
    const dist = Math.hypot(outerPos.x - last.outer.x, outerPos.y - last.outer.y);
    if (dist < 1 && !fighter.scytheSwingActive && !fighter.passiveSpinActive) {
      shouldAddTrail = false; // Don't build up points when standing perfectly still
    }
  }

  if (shouldAddTrail) {
    fighter.bladeTrail.push({
      outer: outerPos,
      inner: innerPos,
      life: 1.0
    });
  }

  // Draw Blade Trail
  if (fighter.bladeTrail.length > 2) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    
    // Add canvas glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = theme.glowShadow;

    // Quantize time to 15fps (approx 66ms per frame) for that staccato, hand-drawn anime feel
    const msPerFrame = 1000 / 15;
    const time = Math.floor(Date.now() / msPerFrame) * msPerFrame * 0.008;
    
    // Map points to add fiery waving effect
    const wavedTrail = fighter.bladeTrail.map((p, i) => {
      const age = 1 - Math.max(0, p.life); // 0 at the head, 1 at the tail
      // Much lower amplitude and longer wavelength for a smooth flutter
      const waveX = Math.sin(time - i * 0.2) * age * 8;
      const waveY = Math.cos(time * 0.9 - i * 0.15) * age * 8;
      
      const innerWaveX = Math.sin(time - i * 0.2 + 1.5) * age * 5;
      const innerWaveY = Math.cos(time * 0.9 - i * 0.15 + 1.5) * age * 5;
      
      return {
        outer: { x: p.outer.x + waveX, y: p.outer.y + waveY },
        inner: { x: p.inner.x + innerWaveX, y: p.inner.y + innerWaveY },
        life: p.life
      };
    });
    
    // Draw the main wide trail
    ctx.beginPath();
    
    // 1. Forward along outer edge (smoothed)
    ctx.moveTo(wavedTrail[0].outer.x, wavedTrail[0].outer.y);
    for (let i = 1; i < wavedTrail.length - 1; i++) {
      const p = wavedTrail[i];
      const nextP = wavedTrail[i + 1];
      const xc = (p.outer.x + nextP.outer.x) / 2;
      const yc = (p.outer.y + nextP.outer.y) / 2;
      ctx.quadraticCurveTo(p.outer.x, p.outer.y, xc, yc);
    }
    const lastP = wavedTrail[wavedTrail.length - 1];
    ctx.lineTo(lastP.outer.x, lastP.outer.y);

    // 2. Backward along inner edge (smoothed and tapering)
    for (let i = wavedTrail.length - 1; i >= 1; i--) {
      const p = wavedTrail[i];
      const prevP = wavedTrail[i - 1];
      
      const taper1 = Math.max(0, p.life);
      const tx1 = p.outer.x + (p.inner.x - p.outer.x) * taper1;
      const ty1 = p.outer.y + (p.inner.y - p.outer.y) * taper1;
      
      const taper2 = Math.max(0, prevP.life);
      const tx2 = prevP.outer.x + (prevP.inner.x - prevP.outer.x) * taper2;
      const ty2 = prevP.outer.y + (prevP.inner.y - prevP.outer.y) * taper2;
      
      const xc = (tx1 + tx2) / 2;
      const yc = (ty1 + ty2) / 2;
      
      if (i === wavedTrail.length - 1) {
        ctx.lineTo(tx1, ty1);
      }
      ctx.quadraticCurveTo(tx1, ty1, xc, yc);
    }
    
    // Connect back to start of inner edge
    const firstP = wavedTrail[0];
    const firstTaper = Math.max(0, firstP.life);
    const firstTx = firstP.outer.x + (firstP.inner.x - firstP.outer.x) * firstTaper;
    const firstTy = firstP.outer.y + (firstP.inner.y - firstP.outer.y) * firstTaper;
    ctx.lineTo(firstTx, firstTy);
    ctx.closePath();
    
    // Inky Black Outer Aura (Anime style dark energy)
    ctx.fillStyle = theme.aura;
    ctx.fill();

    // ----------------------------------------------------
    // Draw the bright Vivid Pink Core
    ctx.beginPath();
    ctx.moveTo(wavedTrail[0].outer.x, wavedTrail[0].outer.y);
    for (let i = 1; i < wavedTrail.length - 1; i++) {
      const p = wavedTrail[i];
      const nextP = wavedTrail[i + 1];
      const xc = (p.outer.x + nextP.outer.x) / 2;
      const yc = (p.outer.y + nextP.outer.y) / 2;
      ctx.quadraticCurveTo(p.outer.x, p.outer.y, xc, yc);
    }
    ctx.lineTo(lastP.outer.x, lastP.outer.y);

    for (let i = wavedTrail.length - 1; i >= 1; i--) {
      const p = wavedTrail[i];
      const prevP = wavedTrail[i - 1];
      
      const taper1 = Math.max(0, p.life);
      // Core is much thinner, 0.6 outer and 0.4 inner
      const coreInnerX1 = p.outer.x * 0.6 + p.inner.x * 0.4;
      const coreInnerY1 = p.outer.y * 0.6 + p.inner.y * 0.4;
      const tx1 = p.outer.x + (coreInnerX1 - p.outer.x) * taper1;
      const ty1 = p.outer.y + (coreInnerY1 - p.outer.y) * taper1;
      
      const taper2 = Math.max(0, prevP.life);
      const coreInnerX2 = prevP.outer.x * 0.6 + prevP.inner.x * 0.4;
      const coreInnerY2 = prevP.outer.y * 0.6 + prevP.inner.y * 0.4;
      const tx2 = prevP.outer.x + (coreInnerX2 - prevP.outer.x) * taper2;
      const ty2 = prevP.outer.y + (coreInnerY2 - prevP.outer.y) * taper2;
      
      const xc = (tx1 + tx2) / 2;
      const yc = (ty1 + ty2) / 2;
      
      if (i === wavedTrail.length - 1) {
        ctx.lineTo(tx1, ty1);
      }
      ctx.quadraticCurveTo(tx1, ty1, xc, yc);
    }
    
    const firstCoreInnerX = firstP.outer.x * 0.6 + firstP.inner.x * 0.4;
    const firstCoreInnerY = firstP.outer.y * 0.6 + firstP.inner.y * 0.4;
    const firstCoreTx = firstP.outer.x + (firstCoreInnerX - firstP.outer.x) * firstTaper;
    const firstCoreTy = firstP.outer.y + (firstCoreInnerY - firstP.outer.y) * firstTaper;
    ctx.lineTo(firstCoreTx, firstCoreTy);
    ctx.closePath();

    ctx.fillStyle = theme.core;
    ctx.fill();

    // ----------------------------------------------------
    // Draw an ultra-thin pure white razor edge
    ctx.beginPath();
    ctx.moveTo(wavedTrail[0].outer.x, wavedTrail[0].outer.y);
    for (let i = 1; i < wavedTrail.length - 1; i++) {
      const p = wavedTrail[i];
      const nextP = wavedTrail[i + 1];
      const xc = (p.outer.x + nextP.outer.x) / 2;
      const yc = (p.outer.y + nextP.outer.y) / 2;
      ctx.quadraticCurveTo(p.outer.x, p.outer.y, xc, yc);
    }
    ctx.lineTo(lastP.outer.x, lastP.outer.y);

    for (let i = wavedTrail.length - 1; i >= 1; i--) {
      const p = wavedTrail[i];
      const prevP = wavedTrail[i - 1];
      
      const taper1 = Math.max(0, p.life);
      // Razor thin, 0.85 outer and 0.15 inner
      const coreInnerX1 = p.outer.x * 0.85 + p.inner.x * 0.15;
      const coreInnerY1 = p.outer.y * 0.85 + p.inner.y * 0.15;
      const tx1 = p.outer.x + (coreInnerX1 - p.outer.x) * taper1;
      const ty1 = p.outer.y + (coreInnerY1 - p.outer.y) * taper1;
      
      const taper2 = Math.max(0, prevP.life);
      const coreInnerX2 = prevP.outer.x * 0.85 + prevP.inner.x * 0.15;
      const coreInnerY2 = prevP.outer.y * 0.85 + prevP.inner.y * 0.15;
      const tx2 = prevP.outer.x + (coreInnerX2 - prevP.outer.x) * taper2;
      const ty2 = prevP.outer.y + (coreInnerY2 - prevP.outer.y) * taper2;
      
      const xc = (tx1 + tx2) / 2;
      const yc = (ty1 + ty2) / 2;
      
      if (i === wavedTrail.length - 1) {
        ctx.lineTo(tx1, ty1);
      }
      ctx.quadraticCurveTo(tx1, ty1, xc, yc);
    }
    
    const firstRazorInnerX = firstP.outer.x * 0.85 + firstP.inner.x * 0.15;
    const firstRazorInnerY = firstP.outer.y * 0.85 + firstP.inner.y * 0.15;
    const firstRazorTx = firstP.outer.x + (firstRazorInnerX - firstP.outer.x) * firstTaper;
    const firstRazorTy = firstP.outer.y + (firstRazorInnerY - firstP.outer.y) * firstTaper;
    ctx.lineTo(firstRazorTx, firstRazorTy);
    ctx.closePath();

    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    ctx.fill();
    
    ctx.restore();
  }

  // Update and draw existing particles in world coordinates
  if (!fighter.scytheParticles) {
    fighter.scytheParticles = [];
  }

  const darkParticles = [];
  const glowParticles = [];

  for (let i = fighter.scytheParticles.length - 1; i >= 0; i--) {
    const p = fighter.scytheParticles[i];
    p.life--;
    if (p.life <= 0) {
      fighter.scytheParticles.splice(i, 1);
      continue;
    }

    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.vy -= 0.08; // gently float upwards in world space

    if (p.isGlow) {
      glowParticles.push(p);
    } else {
      darkParticles.push(p);
    }
  }

  // Draw dark inky particles
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (const p of darkParticles) {
    const alpha = (p.life / p.maxLife) * p.startAlpha;
    const size = p.startSize * (p.life / p.maxLife);
    ctx.globalAlpha = baseAlpha * alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - size);
    ctx.lineTo(p.x + size, p.y);
    ctx.lineTo(p.x, p.y + size);
    ctx.lineTo(p.x - size, p.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Draw glow fire particles
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (const p of glowParticles) {
    const alpha = (p.life / p.maxLife) * p.startAlpha;
    const size = p.startSize * (p.life / p.maxLife);
    ctx.globalAlpha = baseAlpha * alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - size);
    ctx.lineTo(p.x + size, p.y);
    ctx.lineTo(p.x, p.y + size);
    ctx.lineTo(p.x - size, p.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  ctx.rotate(currentAngle);

  if (isFlipped) {
    ctx.scale(1, -1);
  }

  // Shift the weapon back so she is holding the pommel and middle of the shaft
  ctx.translate(fighter.r + gripOffset, 0);

  // Draw Hands (they stay with the fighter, even if the weapon is thrown)
  ctx.save();
  
  // Rear hand (near pommel)
  ctx.beginPath();
  ctx.arc(15, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = fighter.color || '#e0115f'; // Default ruby color
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  
  // Front hand (further up shaft)
  ctx.beginPath();
  ctx.arc(45, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();

  // Detach the weapon during the hook throw (this leaves space for the chain!)
  if (stretchAmount !== 0) {
    ctx.translate(stretchAmount, 0);
  }

  // 1. SHAFT
  ctx.save();
  const shaftGrad = ctx.createLinearGradient(0, -poleW, 0, poleW);
  shaftGrad.addColorStop(0, '#111');
  shaftGrad.addColorStop(0.3, '#333');
  shaftGrad.addColorStop(0.7, '#0a0a0a');
  shaftGrad.addColorStop(1, '#000');

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000';

  ctx.fillStyle = shaftGrad;
  ctx.fillRect(15, -poleW, poleLength - 30, poleW * 2);
  ctx.strokeRect(15, -poleW, poleLength - 30, poleW * 2);

  ctx.fillStyle = '#050505';
  ctx.fillRect(35, -poleW - 0.5, 30, poleW * 2 + 1);
  ctx.strokeRect(35, -poleW - 0.5, 30, poleW * 2 + 1);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(15, -poleW - 1, 6, poleW * 2 + 2);
  ctx.strokeRect(15, -poleW - 1, 6, poleW * 2 + 2);

  ctx.fillStyle = '#18181b';
  ctx.fillRect(17, -poleW - 1.5, 2, poleW * 2 + 3);
  ctx.strokeRect(17, -poleW - 1.5, 2, poleW * 2 + 3);
  ctx.restore();

  // 2. POMMEL
  ctx.save();
  ctx.translate(15, 0);

  const pommelScale = 0.65;
  ctx.scale(pommelScale, pommelScale);
  const pStroke = 1.5 / pommelScale;

  ctx.lineWidth = pStroke;
  ctx.strokeStyle = '#000';

  // Silver ring 1
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-4, -poleW, 2, poleW * 2);
  ctx.strokeRect(-4, -poleW, 2, poleW * 2);

  // Thick black section
  ctx.fillStyle = '#111827';
  ctx.fillRect(-15, -poleW - 0.5, 11, poleW * 2 + 1);
  ctx.strokeRect(-15, -poleW - 0.5, 11, poleW * 2 + 1);

  // Silver ring 2
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-17, -poleW, 2, poleW * 2);
  ctx.strokeRect(-17, -poleW, 2, poleW * 2);

  // Red cylinder (Rose/Pink Theme)
  const redGrad = ctx.createLinearGradient(0, -3, 0, 3);
  redGrad.addColorStop(0, theme.candy1); // Dark Rose
  redGrad.addColorStop(0.5, theme.glowSrc2); // Vivid Pink
  redGrad.addColorStop(1, theme.candy4); // Crimson Pink
  ctx.fillStyle = redGrad;
  ctx.fillRect(-30, -2.5, 13, 5);
  ctx.strokeRect(-30, -2.5, 13, 5);

  // End base black housing
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.moveTo(-30, -poleW - 1);
  ctx.lineTo(-36, -poleW - 2);
  ctx.lineTo(-38, -poleW);
  ctx.lineTo(-38, poleW);
  ctx.lineTo(-36, poleW + 2);
  ctx.lineTo(-30, poleW + 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Butt-plate
  ctx.fillStyle = '#3f3f46';
  ctx.beginPath();
  ctx.moveTo(-38, -poleW - 2);
  ctx.lineTo(-43, -poleW - 3);
  ctx.lineTo(-45, poleW + 12);
  ctx.lineTo(-40, poleW + 10);
  ctx.lineTo(-38, poleW + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Black housing clamp (rightmost, overlapping shaft)
  ctx.fillStyle = '#18181b';
  ctx.fillRect(-2, -poleW - 1.5, 7, poleW * 2 + 3);
  ctx.strokeRect(-2, -poleW - 1.5, 7, poleW * 2 + 3);

  // Clamp Screw
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath(); ctx.arc(1.5, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 0.5 / pommelScale; ctx.stroke();
  ctx.lineWidth = pStroke;

  // Red Cable
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4 / pommelScale;
  ctx.beginPath();
  ctx.moveTo(0, -poleW - 1.5);
  ctx.bezierCurveTo(-5, -poleW - 6, -20, -poleW - 6, -32, -poleW - 1);
  ctx.stroke();

  ctx.strokeStyle = theme.bladeSnout;
  ctx.lineWidth = 2 / pommelScale;
  ctx.stroke();

  // Outer Skeletal Frame
  ctx.fillStyle = '#27272a';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = pStroke;
  ctx.beginPath();
  ctx.moveTo(2, poleW + 1.5);
  ctx.lineTo(-6, 16);
  ctx.lineTo(-32, 16);
  ctx.lineTo(-45, poleW + 12);
  ctx.lineTo(-40, poleW + 10);
  ctx.lineTo(-30, 12);
  ctx.lineTo(-15, 12);
  ctx.lineTo(-12, 9);
  ctx.lineTo(-9, 12);
  ctx.lineTo(-3, 12);
  ctx.lineTo(-0.5, poleW + 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Frame Screws
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath(); ctx.arc(-2, poleW + 5, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-35, 13.5, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  ctx.restore();

  // 3. NECK
  ctx.save();
  ctx.translate(poleLength, 0);

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-40, 1.5);
  ctx.quadraticCurveTo(-20, 8, -5, 1);
  ctx.stroke();
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-35, -1);
  ctx.quadraticCurveTo(-15, -6, -2, -2);
  ctx.stroke();

  const spineGrad = ctx.createLinearGradient(-40, -5, 0, 5);
  spineGrad.addColorStop(0, '#94a3b8');
  spineGrad.addColorStop(0.5, '#e2e8f0');
  spineGrad.addColorStop(1, '#64748b');
  ctx.fillStyle = spineGrad;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  for (let i = -35; i <= -5; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, -poleW - 2);
    ctx.lineTo(i + 6, -poleW - 4);
    ctx.lineTo(i + 8, 0);
    ctx.lineTo(i + 5, poleW + 4);
    ctx.lineTo(i, poleW + 2);
    ctx.lineTo(i + 3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 4. HEADPIECE & BLADE
  ctx.rotate(bladeRotation);
  ctx.scale(bladeScale, bladeScale);
  const headStroke = 2.5; // Scaled to ~1.4

  // --- Ambient Particle Emitter ---
  // Spawns burning particles along the scythe spine curve in world coordinates
  const spawnCount = 2; // rate of particle emission per frame
  for (let i = 0; i < spawnCount; i++) {
    const t = Math.random();
    // Spine coordinates in local blade scale
    const localX = 15 + (tipX - 15) * t;
    const localY = -12 + (tipY + 12) * t * 0.6; // spine curve

    // Rotate & translate manual coordinate mapping
    let lx = localX * bladeScale;
    let ly = localY * bladeScale;
    lx += poleLength;
    lx += fighter.r + gripOffset;
    if (isFlipped) {
      ly = -ly;
    }
    const cos = Math.cos(currentAngle);
    const sin = Math.sin(currentAngle);
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;

    const worldX = fighter.x + rx;
    const worldY = fighter.y + ry;

    const isGlow = Math.random() > 0.45;
    const color = isGlow
      ? (Math.random() > 0.5 ? theme.glowSrc1 : theme.glowSrc2) // Deep Pink / Vivid Pink
      : (Math.random() > 0.5 ? theme.darkSrc1 : theme.darkSrc2); // Dark Magenta ink

    const vx = (Math.random() - 0.5) * 0.4;
    const vy = (Math.random() - 0.5) * 0.4 - 0.15;

    fighter.scytheParticles.push({
      x: worldX,
      y: worldY,
      vx: vx,
      vy: vy,
      startAlpha: isGlow ? 0.7 : 0.85,
      startSize: 1.0 + Math.random() * 2.0,
      color: color,
      isGlow: isGlow,
      life: 15 + Math.random() * 15,
      maxLife: 30
    });
  }

  // --- Dark Crimson Living Aura (Semi-Realistic Energy Flames) ---
  const time = Date.now() / 600;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Base origin for the aura (gnarled dark guard)
  const originX = 12;
  const originY = 0;

  // Reusable bezier interpolation for the pure spine
  const getSpinePoint = (t) => {
    let activeT = Math.min(Math.max(t, 0), 1);
    const cp1x = 45, cp1y = -20;
    const cp2x = 35, cp2y = -70;
    const u = 1 - activeT;
    const tt = activeT * activeT;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * activeT;
    let x = uuu * originX + 3 * uu * activeT * cp1x + 3 * u * tt * cp2x + ttt * tipX;
    let y = uuu * originY + 3 * uu * activeT * cp1y + 3 * u * tt * cp2y + ttt * tipY;
    return { x, y };
  };

  const drawPlasma = (t, offsetLen, dragAngle, size, colorCore, colorEdge, scaleX, scaleY) => {
    const basePt = getSpinePoint(t);
    const nextPt = getSpinePoint(t + 0.05);
    const dirX = nextPt.x - basePt.x;
    const dirY = nextPt.y - basePt.y;
    const len = Math.hypot(dirX, dirY) || 1;
    const normX = -dirY / len;
    const normY = dirX / len;

    const dragX = normX * Math.cos(dragAngle) - (dirX / len) * Math.sin(dragAngle);
    const dragY = normY * Math.cos(dragAngle) - (dirY / len) * Math.sin(dragAngle);

    // Liquid rippling offset that flows seamlessly along the blade
    const anim = Math.sin(time * 8 - t * 15);
    const actualOffset = offsetLen * (0.85 + 0.15 * anim);

    const px = basePt.x + dragX * actualOffset;
    const py = basePt.y + dragY * actualOffset;
    const angle = Math.atan2(dragY, dragX);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.scale(scaleX, scaleY);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    grad.addColorStop(0, colorCore);
    grad.addColorStop(0.5, colorEdge);
    // Automatically generate a transparent version of the edge color to prevent muddy black edges
    const edgeParts = colorEdge.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (edgeParts) {
      grad.addColorStop(1, `rgba(${edgeParts[1]}, ${edgeParts[2]}, ${edgeParts[3]}, 0)`);
    } else {
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // 1. Soft Dissipating Dark Volumetric Heat (Background)
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 40; i++) {
    const t = i / 39;

    // Animate size and position to make the dark heat billow and flow
    const wave = Math.sin(t * 15 - time * 6);
    // Less blur: tighter size
    const size = 2 + t * 5 + wave * 2;
    const offsetDist = 10 + wave * 10;

    // More transparency (lower alpha multiplier)
    const alpha = (0.15 - t * 0.08) * (0.6 + 0.4 * wave);

    // Use drawPlasma to stretch the smoke so it fades out as sharp directional mist rather than round bubbles
    drawPlasma(t, offsetDist, 1.0, size,
      `rgba(${theme.heatSoft1}, ${Math.max(0, alpha)})`, // Rose/Pink smoke
      `rgba(${theme.heatSoft2}, ${Math.max(0, alpha * 0.8)})`,
      2.5, 0.6
    );
  }

  // 2. Liquid Dark Plasma Flow (Background)
  // Bring back the sharp needles, but make the lengths flow smoothly
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    // Smooth wave for length instead of modulo jumps
    const wave = Math.sin(t * 15 - time * 6);
    const dragDist = 15 + wave * 10;

    // Deep rose needles (razor sharp size=3)
    drawPlasma(t, dragDist, 1.2, 3, theme.plasma1, theme.plasma2, 2.5, 0.4);
  }

  // 3. Dense Guard Origin
  const guardGlowAlpha = 0.8 + Math.sin(time * 6) * 0.2;
  const guardGlow = ctx.createRadialGradient(originX, originY, 0, originX, originY, 45);
  guardGlow.addColorStop(0, `rgba(${theme.guard1}, ${guardGlowAlpha})`);
  guardGlow.addColorStop(0.3, `rgba(${theme.guard2}, ${guardGlowAlpha * 0.7})`);
  guardGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = guardGlow;
  ctx.beginPath();
  ctx.arc(originX, originY, 45, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Snout (Back Spike)
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.moveTo(5, 5);
  ctx.lineTo(15, -2);
  ctx.lineTo(30, 2);
  ctx.lineTo(45, 12);
  ctx.lineTo(25, 18);
  ctx.lineTo(12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = headStroke;
  ctx.stroke();

  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.moveTo(12, 2);
  ctx.lineTo(25, 5);
  ctx.lineTo(35, 12);
  ctx.lineTo(20, 15);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = headStroke * 0.6;
  ctx.stroke();

  ctx.fillStyle = theme.bladeSnout;
  ctx.beginPath();
  ctx.moveTo(18, 8);
  ctx.lineTo(22, 10);
  ctx.lineTo(19, 12);
  ctx.closePath();
  ctx.fill();

  // Rose Pink Blade
  const candyRed = ctx.createLinearGradient(10, 0, tipX, tipY);
  candyRed.addColorStop(0, theme.candy1); // Dark Rose
  candyRed.addColorStop(0.3, theme.glowSrc1); // Deep Pink
  candyRed.addColorStop(0.6, theme.glowSrc2); // Vivid Pink
  candyRed.addColorStop(0.8, theme.candy4); // Crimson Pink
  candyRed.addColorStop(1, theme.candy5); // Very Dark Rose

  ctx.fillStyle = candyRed;
  ctx.beginPath();
  ctx.moveTo(10, -10);
  ctx.bezierCurveTo(45, -20, 35, -70, tipX, tipY); // Outer curve
  ctx.bezierCurveTo(-15, -70, 0, -20, -5, 0);      // Smooth inner crescent
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = headStroke;
  ctx.stroke();

  // Red blade panel lines
  ctx.strokeStyle = theme.panel;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(15, -25);
  ctx.lineTo(-10, -45);
  ctx.lineTo(-40, -55);
  ctx.stroke();

  // Black Mechanical Spine
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.moveTo(12, -8);
  // Outer edge of the spine (runs up the middle of the red blade)
  ctx.bezierCurveTo(30, -20, 20, -60, tipX + 15, tipY + 15);
  // Inner edge of the spine (matches the inner crescent of the blade exactly)
  ctx.bezierCurveTo(-15, -70, 0, -20, -5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = headStroke;
  ctx.stroke();

  // Silver Chrome Segmented Plates
  const chromeGrad = ctx.createLinearGradient(0, 0, tipX, tipY);
  chromeGrad.addColorStop(0, '#94a3b8');
  chromeGrad.addColorStop(0.5, '#f8fafc');
  chromeGrad.addColorStop(1, '#cbd5e1');

  ctx.fillStyle = chromeGrad;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = headStroke;

  // Plate 1
  ctx.beginPath();
  ctx.moveTo(15, -12);
  ctx.lineTo(35, -20);
  ctx.lineTo(30, -35);
  ctx.lineTo(15, -30);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Plate 2
  ctx.beginPath();
  ctx.moveTo(26, -40);
  ctx.lineTo(15, -65);
  ctx.lineTo(0, -60);
  ctx.lineTo(10, -40);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Plate 3
  ctx.beginPath();
  ctx.moveTo(-5, -65);
  ctx.lineTo(-35, -85);
  ctx.lineTo(-65, -95);
  ctx.lineTo(-30, -75);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Industrial Rivets
  ctx.fillStyle = '#0f172a';
  const drawRivet = (x, y) => {
    ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
  };
  drawRivet(22, -18);
  drawRivet(25, -30);
  drawRivet(12, -45);
  drawRivet(5, -60);
  drawRivet(-15, -70);
  drawRivet(-40, -85);

  // Blade Vent Gap
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(-10, -35);
  ctx.lineTo(-20, -30);
  ctx.lineTo(-5, -10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = headStroke * 0.6;
  ctx.stroke();

  ctx.strokeStyle = theme.glowSrc2; // Vivid Pink panel line
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-2, -16);
  ctx.lineTo(-10, -31);
  ctx.stroke();

  // Inner Cutting Edge Highlight (Glowing Pink)
  ctx.save();
  // Define the cutting edge path once
  const drawEdgePath = () => {
    ctx.beginPath();
    // Trace the outer convex edge (the spine) instead of the inner concave edge
    ctx.moveTo(10, -10);
    ctx.bezierCurveTo(45, -20, 35, -70, tipX, tipY);
  };
  
  // Use standard alpha blending so the intense energy glow shows on white backgrounds
  ctx.globalCompositeOperation = 'source-over';
  
  // Outer thick pink glow
  drawEdgePath();
  ctx.strokeStyle = theme.plasma2; // Vivid pink
  ctx.lineWidth = 14;
  ctx.stroke();
  
  // Inner hot pink glow
  drawEdgePath();
  ctx.strokeStyle = theme.plasma1; // Bright pink
  ctx.lineWidth = 6;
  ctx.stroke();
  
  // Solid white-hot core
  ctx.globalCompositeOperation = 'source-over';
  drawEdgePath();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.restore();

  // Bolted Housing (locks blade to neck)
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.moveTo(-10, -5);
  ctx.lineTo(10, -12);
  ctx.lineTo(18, 0);
  ctx.lineTo(12, 15);
  ctx.lineTo(-5, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = headStroke;
  ctx.stroke();

  ctx.fillStyle = '#3f3f46';
  ctx.beginPath();
  ctx.moveTo(-5, -3);
  ctx.lineTo(8, -8);
  ctx.lineTo(12, 0);
  ctx.lineTo(-2, 5);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = headStroke * 0.6;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  const drawScrew = (x, y) => {
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a';
  };
  drawScrew(-2, 2);
  drawScrew(8, -4);
  drawScrew(10, 8);

  // --- Foreground Aura ---
  // Overlays the blade to give a true wrapping effect
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // A few faint smoke wisps overlapping the blade
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const pt = getSpinePoint(t);

    const size = 3 + t * 8;
    const alpha = (0.3 - t * 0.1) * (0.8 + 0.2 * Math.sin(time * 4 + i));

    const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, size);
    grad.addColorStop(0, `rgba(${theme.guard1}, ${alpha})`);     // Dark magenta
    grad.addColorStop(0.5, `rgba(${theme.guard2}, ${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over'; // Changed from lighter to show up on white backgrounds

  // Bright sharp red liquid plasma flow
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    // Flowy wave for needle length
    const wave = Math.sin(t * 20 - time * 8);
    const dragDist = 10 + wave * 8 + t * 5;

    // Sharp (size 2)
    drawPlasma(t, dragDist, 1.3, 2, theme.core, `rgba(${theme.heatSoft1}, 0.5)`, 4.0, 0.2); // Vivid pink plasma
  }

  // Ultra-bright glowing liquid core
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    const wave = Math.sin(t * 25 - time * 10);
    const dragDist = 5 + wave * 4 + t * 5;

    // Razor sharp (size 1)
    drawPlasma(t, dragDist, 1.4, 1, 'rgba(255, 255, 255, 1.0)', theme.plasma1, 3.5, 0.15); // White-pink core
  }

  // Dense plasma directly hugging the blade spine to anchor the heat
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    // Core anchor, sharp size (1.5)
    drawPlasma(t, 0, 0, 1.5, theme.core, `rgba(${theme.heatSoft1}, 0.6)`, 2.0, 0.6); // Vivid pink anchor
  }

  ctx.restore(); // Restore foreground aura context
  ctx.restore(); // Restore main scythe translation context

  // 5. EFFECTS
  if (fighter.scytheSwingActive || fighter.passiveSpinActive) {
    ctx.save();

    let progress;
    let trailAngle;
    let overallAlpha = 1.0;

    if (fighter.passiveSpinActive) {
      progress = 1 - (fighter.passiveSpinTimer / fighter.passiveSpinDuration);
      trailAngle = Math.PI * 1.5;
      overallAlpha = Math.min(1.0, fighter.passiveSpinTimer / 10);
    } else {
      progress = 1 - (fighter.scytheSwingTimer / fighter.scytheSwingDuration);
      if (progress <= 0.6) {
        // Swing out: trail grows rapidly
        trailAngle = (Math.PI / 1.2) * Math.sin((progress / 0.6) * (Math.PI / 2));
      } else {
        // Follow through: trail lingers and smoothly fades out
        trailAngle = (Math.PI / 1.2);
        overallAlpha = 1 - ((progress - 0.6) / 0.4);
      }
    }

    if (trailAngle > 0.05 && overallAlpha > 0) {
      const steps = 30; // High steps for perfectly smooth sharp vectors

      const cx = -(fighter.r + gripOffset);
      const cy = 0;

      const Ix = poleLength + 10 * bladeScale;
      const Iy = -10 * bladeScale;
      const Tx = poleLength + tipX * bladeScale;
      const Ty = tipY * bladeScale;

      const cp1x = poleLength + 45 * bladeScale;
      const cp1y = -20 * bladeScale;
      const cp2x = poleLength + 35 * bladeScale;
      const cp2y = -70 * bladeScale;

      // Draws a dynamic, tapering ribbon that sweeps backwards
      const drawRibbon = (tailBase, outerTip, innerTip, color, alpha, taperPower = 1.4, lengthMod = 1.0, angleShift = 0, isGlow = false) => {
        ctx.beginPath();

        const startInnerX = Ix + (Tx - Ix) * innerTip;
        const startInnerY = Iy + (Ty - Iy) * innerTip;
        ctx.moveTo(startInnerX, startInnerY);

        const curTx = Ix + (Tx - Ix) * outerTip;
        const curTy = Iy + (Ty - Iy) * outerTip;
        const curCp1x = Ix + (cp1x - Ix) * outerTip;
        const curCp1y = Iy + (cp1y - Iy) * outerTip;
        const curCp2x = Ix + (cp2x - Ix) * outerTip;
        const curCp2y = Iy + (cp2y - Iy) * outerTip;

        ctx.bezierCurveTo(curCp1x, curCp1y, curCp2x, curCp2y, curTx, curTy);

        const tailX = Ix + (Tx - Ix) * tailBase;
        const tailY = Iy + (Ty - Iy) * tailBase;
        const baseTrailAngle = isFlipped ? trailAngle : -trailAngle;
        const actualAngleShift = isFlipped ? -angleShift : angleShift;

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const taper = Math.pow(t, taperPower);
          const px = curTx * (1 - taper) + tailX * taper;
          const py = curTy * (1 - taper) + tailY * taper;

          const angleOffset = actualAngleShift + baseTrailAngle * Math.pow(t, 0.85) * lengthMod;

          const dx = px - cx;
          const dy = py - cy;
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          ctx.lineTo(cx + dx * cos - dy * sin, cy + dx * sin + dy * cos);
        }

        for (let i = steps - 1; i >= 0; i--) {
          const t = i / steps;
          const taper = Math.pow(t, taperPower);

          const px = startInnerX * (1 - taper) + tailX * taper;
          const py = startInnerY * (1 - taper) + tailY * taper;

          const angleOffset = actualAngleShift + baseTrailAngle * Math.pow(t, 0.85) * lengthMod;

          const dx = px - cx;
          const dy = py - cy;
          const cos = Math.cos(angleOffset);
          const sin = Math.sin(angleOffset);
          ctx.lineTo(cx + dx * cos - dy * sin, cy + dx * sin + dy * cos);
        }

        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = baseAlpha * alpha;
        // Force source-over so the bright glows don't vanish against white backgrounds
        ctx.globalCompositeOperation = 'source-over';
        ctx.fill();
      };

      // 1. Background Inky Swirls (Dark, rich, source-over)
      drawRibbon(0.8, 1.25, 0.9, '#050000', 0.6 * overallAlpha, 1.5, 1.15, -0.15, false);
      drawRibbon(0.4, 0.8, 0.6, theme.darkSrc1, 0.7 * overallAlpha, 1.2, 0.9, 0.1, false);
      drawRibbon(0.6, 1.1, 0.8, theme.darkSrc2, 0.8 * overallAlpha, 1.4, 1.05, -0.05, false);

      // 2. Main Additive Glow Layers (vibrant, lighter)
      drawRibbon(0.5, 1.15, 0.7, theme.glowSrc2, 0.6 * overallAlpha, 1.3, 1.0, 0, true);   // Main wide pink glow
      drawRibbon(0.5, 1.05, 0.85, theme.glowSrc1, 0.8 * overallAlpha, 1.4, 0.95, 0, true);  // Vivid pink/crimson inner glow
      drawRibbon(0.5, 1.02, 0.95, '#ffffff', 1.0 * overallAlpha, 1.6, 0.85, 0, true);  // Blinding white-hot core

      // 3. Detached sweeping ribbons for kinetic energy
      drawRibbon(1.05, 1.35, 1.2, theme.glowSrc1, 0.5 * overallAlpha, 1.5, 1.1, -0.2, true); // Outer wisp
      drawRibbon(0.3, 0.6, 0.4, theme.glowSrc2, 0.6 * overallAlpha, 1.3, 0.8, 0.15, true);   // Inner wisp

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  if (fighter.activePullActive && fighter.activePullPhase === 2) {
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * 0.2;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = poleW * 2 + 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(poleLength, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
