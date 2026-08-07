// ─────────────────────────────────────────────
// ARENA & SCREEN OVERLAY RENDERER
// ─────────────────────────────────────────────
import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

// ──────────────────────────────────────────
// SKETCHY BORDER HELPERS
// ──────────────────────────────────────────
function drawSketchyLine(ctx, x1, y1, x2, y2, seed, color = 'rgba(20,20,25,0.85)', width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  let currentSeed = seed;
  const nextRand = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };

  // Base bow amount (set to 0 for straight sketch lines)
  const baseBowAmt = 0;

  const strokeCount = 4; // Extra strokes for a penciled look
  for (let s = 0; s < strokeCount; s++) {
    ctx.lineWidth = width * (0.5 + nextRand() * 0.4);
    ctx.beginPath();
    
    const length = Math.hypot(x2 - x1, y2 - y1);
    const segmentLength = 12;
    const segments = Math.max(2, Math.floor(length / segmentLength));
    
    // Each pencil stroke gets a slightly different curve/displacement (subtle wobbles instead of bowing)
    const strokeBowVar = (nextRand() - 0.5) * 2.5;
    const totalBow = baseBowAmt + strokeBowVar;
    
    ctx.moveTo(x1, y1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      let targetX = x1 + (x2 - x1) * t;
      let targetY = y1 + (y2 - y1) * t;
      
      const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      
      // Calculate smooth quadratic/sine bow that peaks in the middle (t = 0.5)
      const bowOffset = Math.sin(t * Math.PI) * totalBow;
      
      // Micro-wobbles for rough pencil texture
      let noise = 0;
      if (i < segments) {
        noise = (nextRand() - 0.5) * 2.2;
      }
      
      const totalOffset = bowOffset + noise;
      targetX += Math.cos(angle) * totalOffset;
      targetY += Math.sin(angle) * totalOffset;
      
      ctx.lineTo(targetX, targetY);
    }
    
    // Corner overshoot for hand-drawn feel
    const extendAngle = Math.atan2(y2 - y1, x2 - x1);
    const extension = (nextRand() * 6) + 1;
    ctx.lineTo(x2 + Math.cos(extendAngle) * extension, y2 + Math.sin(extendAngle) * extension);
    
    ctx.stroke();
  }
  ctx.restore();
}

function drawSketchyArenaBorders(ctx, arena, wallWidth) {
  const x = arena.x;
  const y = arena.y;
  const w = arena.width;
  const h = arena.height;

  // Draw outside walls with pencil effect
  drawSketchyLine(ctx, x, y, x + w, y, 100, 'rgba(15,15,18,0.85)', wallWidth);
  drawSketchyLine(ctx, x + w, y, x + w, y + h, 200, 'rgba(15,15,18,0.85)', wallWidth);
  drawSketchyLine(ctx, x + w, y + h, x, y + h, 300, 'rgba(15,15,18,0.85)', wallWidth);
  drawSketchyLine(ctx, x, y + h, x, y, 400, 'rgba(15,15,18,0.85)', wallWidth);
}

export function drawArena() {
  const { ctx, canvas, arena, pixiLayers, pixiApp } = state;
  const hasActiveDomain = state.fighters && state.fighters.some(f => f && f.domainActive && typeof f.drawDomainBackground === 'function');

  // We draw the solid backgrounds using PixiJS so they sit behind the 2D canvas sprite
  if (!state.arenaGraphics) {
    state.arenaGraphics = new window.PIXI.Graphics();
    pixiLayers.arena.addChild(state.arenaGraphics);
  }
  
  const g = state.arenaGraphics;
  g.clear();

  // Helper to parse hex string into PIXI color and alpha
  const parseColor = (c) => {
    if (typeof c === 'number') return { color: c, alpha: 1 };
    if (!c) return { color: 0x000000, alpha: 1 };
    let hex = c.replace('#', '');
    if (hex.length === 8) return { color: parseInt(hex.substring(0, 6), 16), alpha: parseInt(hex.substring(6, 8), 16) / 255 };
    if (hex.length === 6) return { color: parseInt(hex, 16), alpha: 1 };
    if (hex.length === 3) return { color: parseInt(hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2], 16), alpha: 1 };
    return { color: 0x000000, alpha: 1 };
  };

  const canvasBg = parseColor(CONFIG.canvasBgColor || '#000000');
  const outerBg = parseColor(CONFIG.arenaOuterBgColor || '#f5f5f5');
  const innerBg = parseColor(CONFIG.arenaInnerBgColor || '#ffffff');

  // Fill the entire canvas (global background)
  g.beginFill(canvasBg.color, canvasBg.alpha);
  g.drawRect(0, 0, pixiApp.screen.width, pixiApp.screen.height);
  g.endFill();

  // Draw the container area outside the arena (under HUD and sides)
  // Set to fill the entire height of the canvas so there are no black bars at the top or bottom
  const whiteTop = 0;
  const whiteBottom = pixiApp.screen.height;
  if (!hasActiveDomain) {
    g.beginFill(outerBg.color, outerBg.alpha);
    g.drawRect(0, whiteTop, pixiApp.screen.width, whiteBottom - whiteTop);
    g.endFill();
  } else {
    // Fill the arena background with solid black when a domain is active
    // so any edge gaps during screen shakes blend seamlessly with the domain's dark borders
    g.beginFill(canvasBg.color, canvasBg.alpha);
    g.drawRect(0, whiteTop, pixiApp.screen.width, whiteBottom - whiteTop);
    g.endFill();
  }

  if (!hasActiveDomain) {
    if (!state.floorGraphics) {
      state.floorGraphics = new window.PIXI.Graphics();
      pixiLayers.environment.addChildAt(state.floorGraphics, 0);
    }
    const fg = state.floorGraphics;
    fg.clear();
    // Arena floor background (inside the arena boundaries)
    fg.beginFill(innerBg.color, innerBg.alpha);
    fg.drawRect(arena.x, arena.y, arena.width, arena.height);
    fg.endFill();
  } else {
    if (state.floorGraphics) {
      state.floorGraphics.clear();
    }
  }

  // Draw the arena boundary stroke
  const wallWidth = (typeof state !== 'undefined' && state.config && state.config.arena && state.config.arena.wallWidth) 
    ? state.config.arena.wallWidth 
    : 4;
  
  // Draw sketchy pencil-style borders on the 2D Canvas context
  if (!state._arenaBorderCanvas || state._arenaBorderCanvas.arenaWidth !== arena.width || state._arenaBorderCanvas.arenaHeight !== arena.height || state._arenaBorderCanvas.wallWidth !== wallWidth) {
    const padding = 60; // Extra padding for overshoots
    const offCanvas = document.createElement('canvas');
    offCanvas.width = arena.width + padding * 2;
    offCanvas.height = arena.height + padding * 2;
    const oc = offCanvas.getContext('2d');
    
    drawSketchyArenaBorders(oc, { x: padding, y: padding, width: arena.width, height: arena.height }, wallWidth);
    
    offCanvas.arenaWidth = arena.width;
    offCanvas.arenaHeight = arena.height;
    offCanvas.wallWidth = wallWidth;
    state._arenaBorderCanvas = offCanvas;
  }
  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.drawImage(state._arenaBorderCanvas, arena.x - 60, arena.y - 60);
  ctx.restore();

  // Draw "CRONOSPHERE" transparent watermark on the 2D Canvas (since text is easier in Canvas2D)
  const centerX = arena.x + arena.width / 2;
  const centerY = arena.y + arena.height / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(30, 120, 255, 0.15)';
  ctx.font = '900 34px "Impact", "Trebuchet MS", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = '6px';
  }
  ctx.fillText('CRONOSPHERE', centerX, centerY);
  ctx.restore();

  // ── Cached Title Header (text only) ──────────────────────────────
  // Render the entire title text once into an offscreen canvas, then blit it every frame.
  if (!state._titleHeaderCanvas) {
    // Prevent Flash of Unstyled Text (FOUT) and visual jumping by waiting for custom fonts
    if (document.fonts) {
      const harutoReady = document.fonts.check('900 42px "Haruto"');
      const glastReady = document.fonts.check('18px "Glast Blitch"');
      if (!harutoReady || !glastReady) {
        document.fonts.load('900 42px "Haruto"');
        document.fonts.load('18px "Glast Blitch"');
        return; // Skip rendering header completely until fonts are fully loaded
      }
    }

    const headerW = CONFIG.canvasWidth || 540;
    const headerH = 170;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = headerW;
    offCanvas.height = headerH;
    const oc = offCanvas.getContext('2d');

    // ── Title Text (rendered once) ────────────────────────────────────────
    const textCX = headerW / 2;
    oc.fillStyle = '#000000';
    oc.font = '900 42px "Haruto", Arial';
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    oc.strokeStyle = '#ffffff';
    oc.lineWidth = 4.5;
    oc.strokeText('Fight of Characters', textCX, 100);
    oc.fillText('Fight of Characters', textCX, 100);

    oc.font = '18px "Glast Blitch", Arial';
    oc.lineWidth = 3.5;
    oc.strokeText('Ball Fight Simulator', textCX, 135);
    oc.fillText('Ball Fight Simulator', textCX, 135);

    state._titleHeaderCanvas = offCanvas;
  }

  // Blit the fully cached title header (text only) in one drawImage call
  // Position it relative to the arena and scale it using CONFIG.internalScale
  const scale = CONFIG.internalScale || 1.0;
  const drawW = state._titleHeaderCanvas.width * scale;
  const drawH = state._titleHeaderCanvas.height * scale;
  
  ctx.save();
  ctx.drawImage(state._titleHeaderCanvas, centerX - drawW / 2, arena.y - drawH - 10, drawW, drawH);
  
  // Overlay dimming if any ultimate domains/dims or skill channelings are active (smooth fade-in)
  let domainChannelProgress = 0;
  if (state.fighters) {
    state.fighters.forEach(f => {
      if (!f || f.hp <= 0) return;
      if (f.domainActive || f.ultimateActive) {
        domainChannelProgress = Math.max(domainChannelProgress, 0.88);
      } else if (f.isChannelingDomainExpansion || f.isChannelingDomain || f.isChannelingPurple || f.isChannelingDivineFlame || f.ultimatePhase === 'CHANNELING') {
        const maxCharge = f.domainChargeMax || f.purpleChargeMax || f.divineFlameChargeMax || f.ultimateChargeMax || 120;
        const currentCharge = f.domainChargeTimer || f.purpleChargeTimer || f.divineFlameChargeTimer || f.ultimateChargeTimer || 0;
        const prog = Math.min(1.0, Math.max(0.0, currentCharge / Math.max(1, maxCharge)));
        domainChannelProgress = Math.max(domainChannelProgress, prog * 0.85);
      }
    });
  }

  const purpleDim = typeof currentPurpleDimOpacity !== 'undefined' ? currentPurpleDimOpacity : 0;
  const furnaceDim = typeof currentFurnaceDimOpacity !== 'undefined' ? currentFurnaceDimOpacity : 0;
  
  let activeDimOpacity = state.currentHUDDimOpacity || 0;
  activeDimOpacity = Math.max(activeDimOpacity, domainChannelProgress);
  if (purpleDim > 0) activeDimOpacity = Math.max(activeDimOpacity, purpleDim * 0.88);
  if (furnaceDim > 0) activeDimOpacity = Math.max(activeDimOpacity, furnaceDim * 0.88);

  if (activeDimOpacity > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0, 0, 0, ${activeDimOpacity * 0.95})`;
    ctx.fillRect(centerX - drawW / 2, arena.y - drawH - 10, drawW, drawH);
  }
  ctx.restore();
}

export function excludeGojoInfinityFromDim(ctx) {
  if (!state.fighters) return;
  for (const f of state.fighters) {
    if (!f || f.hp <= 0) continue;
    const isGojo = (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo' || f._def?.type === 'gojo');
    if (!isGojo) continue;
    const isLimitlessActive = (!f.isMeleeMode && (f.infinityCooldown <= 0 || f.infinityActive || (f.infinityBlockTimer || 0) > 0));
    if (!isLimitlessActive) continue;
    
    const infinityR = CONFIG.gojo?.infinityRadius ?? (f.r + 30);
    const cutoutRadius = infinityR + 25;
    const drawY = f.y - (f.z || 0);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const holeGrad = ctx.createRadialGradient(f.x, drawY, 0, f.x, drawY, cutoutRadius);
    holeGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    holeGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.85)');
    holeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.arc(f.x, drawY, cutoutRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let currentPurpleDimOpacity = 0;

/**
 * Draws a purple dim screen overlay when Gojo's Hollow Purple is being channeled,
 * actively moving as a projectile, or in post-fire recovery.
 */
export function drawPurpleDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const activeProjectiles = typeof getProjectiles === 'function' ? getProjectiles() : [];
  const purpleOrb = activeProjectiles.find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb) && p.life > 0);

  const gojoFighter = state.fighters?.find(f =>
    f && (f.isChannelingPurple || (f.purpleRecoveryTimer && f.purpleRecoveryTimer > 0))
  );

  let targetOpacity = 0;
  let cx = canvas.width / 2;
  let cy = canvas.height / 2;

  if (gojoFighter && gojoFighter.isChannelingPurple) {
    cx = gojoFighter.x;
    cy = gojoFighter.y - (gojoFighter.z || 0);
    const chargeMax = gojoFighter.purpleChargeMax || 120;
    const progress = Math.min(1.0, (gojoFighter.purpleChargeTimer || 0) / Math.max(1, chargeMax));
    targetOpacity = 0.25 + progress * 0.55; // Smooth charge up from 0.25 to 0.80
  } else if (purpleOrb) {
    cx = purpleOrb.x;
    cy = purpleOrb.y;
    const maxLife = purpleOrb.maxLife || 300;
    const currentLife = purpleOrb.life || 0;
    const lifeRatio = Math.max(0, Math.min(1, currentLife / maxLife));
    targetOpacity = 0.50 + Math.sin(lifeRatio * Math.PI) * 0.20; // High intensity during orb flight
  } else if (gojoFighter && gojoFighter.purpleRecoveryTimer > 0) {
    cx = gojoFighter.x;
    cy = gojoFighter.y - (gojoFighter.z || 0);
    const recProgress = gojoFighter.purpleRecoveryTimer / 30;
    targetOpacity = 0.45 * recProgress;
  }

  // Smoothly interpolate dim opacity for seamless fade-in and gradual fade-out
  if (targetOpacity > currentPurpleDimOpacity) {
    currentPurpleDimOpacity += (targetOpacity - currentPurpleDimOpacity) * 0.15; // Smooth charge fade-in
  } else {
    currentPurpleDimOpacity += (targetOpacity - currentPurpleDimOpacity) * 0.18; // Smooth clear fade-out
  }

  if (currentPurpleDimOpacity < 0.01) {
    currentPurpleDimOpacity = 0;
    return;
  }

  ctx.save();

  const opacity = currentPurpleDimOpacity;

  // Dark base purple overlay
  ctx.fillStyle = `rgba(18, 2, 32, ${opacity * 0.7})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dynamic radial gradient centered on Gojo or Purple Orb
  const maxDim = Math.max(arena.width, arena.height) * 0.70;
  const roundCx = Math.round(cx / 10) * 10;
  const roundCy = Math.round(cy / 10) * 10;
  const key = `${roundCx}_${roundCy}_${maxDim}`;

  if (!state._cachedPurpleDimGrad || state._cachedPurpleDimKey !== key) {
    state._cachedPurpleDimKey = key;
    state._cachedPurpleDimGrad = ctx.createRadialGradient(
      roundCx, roundCy, 0,
      roundCx, roundCy, maxDim
    );
    state._cachedPurpleDimGrad.addColorStop(0, `rgba(195, 80, 255, ${opacity * 0.95})`);
    state._cachedPurpleDimGrad.addColorStop(0.06, `rgba(147, 51, 234, ${opacity * 0.85})`);
    state._cachedPurpleDimGrad.addColorStop(0.15, `rgba(88, 28, 135, ${opacity * 0.70})`);
    state._cachedPurpleDimGrad.addColorStop(0.35, `rgba(20, 2, 35, ${opacity * 0.92})`);
    state._cachedPurpleDimGrad.addColorStop(0.65, `rgba(5, 1, 10, ${opacity * 0.97})`);
    state._cachedPurpleDimGrad.addColorStop(1.0, `rgba(0, 0, 0, ${opacity * 0.99})`);
  }

  ctx.globalAlpha = opacity;
  ctx.fillStyle = state._cachedPurpleDimGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Exclude Rika from Gojo's Purple dim screen overlay so she stays fully bright & un-tinted
  if (state.fighters) {
    for (const f of state.fighters) {
      if (!f || !f.rika || !f.rika.active || !f.rikaAlpha || f.rikaAlpha <= 0) continue;
      const rk = f.rika;
      const rScale = rk.spawnScale ?? 1.0;
      const cutoutRadius = Math.max(90, (rk.r || 35) * rScale * 3.0 + 60);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const holeGrad = ctx.createRadialGradient(rk.x, rk.y, 0, rk.x, rk.y, cutoutRadius);
      const alphaMult = Math.min(1.0, f.rikaAlpha || 1.0);
      holeGrad.addColorStop(0, `rgba(0, 0, 0, ${alphaMult})`);
      holeGrad.addColorStop(0.60, `rgba(0, 0, 0, ${alphaMult * 0.85})`);
      holeGrad.addColorStop(1.0, `rgba(0, 0, 0, 0)`);
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.arc(rk.x, rk.y, cutoutRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Exclude Gojo's Limitless Infinity Barrier from full-screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(0, 0, 0, ${opacity * 0.98})`;
}

let currentTojiUltimateOpacity = 0;
let flyHeads = [];

export function drawTojiUltimateOverlay() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const toji = state.fighters?.find(f => f && f.ultimateActive && (f.ultimatePhase === 'VANISHED' || f.ultimatePhase === 'STRIKING' || f.ultimatePhase === 'CRATER_FADEIN' || f.ultimatePhase === 'CRATER'));

  let targetOpacity = 0;
  if (toji) {
    targetOpacity = 0.85; // Very dark
    
    // Spawn fly heads if we have less than 40
    if (Math.random() < 0.4 && flyHeads.length < 40) {
      flyHeads.push({
        x: canvas.width + Math.random() * 100,
        y: Math.random() * canvas.height,
        vx: -15 - Math.random() * 20,
        vy: (Math.random() - 0.5) * 5,
        size: 5 + Math.random() * 10 // Reduced from 15 + Math.random() * 30 to be much smaller
      });
    }
  }

  // Smooth fade
  if (targetOpacity > currentTojiUltimateOpacity) {
    currentTojiUltimateOpacity += (targetOpacity - currentTojiUltimateOpacity) * 0.15;
  } else {
    currentTojiUltimateOpacity += (targetOpacity - currentTojiUltimateOpacity) * 0.18;
  }

  if (currentTojiUltimateOpacity < 0.01) {
    currentTojiUltimateOpacity = 0;
    flyHeads = []; // Clear array when not in use
    return;
  }

  ctx.save();
  // Reset the transform temporarily so the pitch-black overlay and swarm are perfectly glued to the camera
  // and do not jitter or expose the edges of the screen during violent screen shakes.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = currentTojiUltimateOpacity;
  
  // Pitch black overlay
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw and update fly heads
  ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
  for (let i = flyHeads.length - 1; i >= 0; i--) {
    const head = flyHeads[i];
    
    ctx.beginPath();
    ctx.arc(head.x, head.y, head.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Tiny red eyes
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(head.x - head.size * 0.3, head.y - head.size * 0.1, 2, 0, Math.PI * 2);
    ctx.arc(head.x + head.size * 0.1, head.y - head.size * 0.1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
    
    head.x += head.vx;
    head.y += head.vy;
    
    if (head.x < -100) {
      flyHeads.splice(i, 1);
    }
  }

  // Exclude Gojo's Limitless Infinity Barrier from full-screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(5, 5, 5, ${currentTojiUltimateOpacity})`;
}

/**
 * Draws a dark golden cinematic dim screen overlay when Mahoraga adapts and rotates his 3D Dharma Wheel.
 */
export function drawMahoragaAdaptationDimScreen() {
  if (CONFIG.mahoraga?.enableGoldenScreenDim === false) return;

  const { ctx, canvas, arena } = state;
  const mahoraga = state.fighters?.find(f => f && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga')) && (f.wheelClickTimer > 0 || f.adaptationPauseTimer > 0));
  if (!mahoraga) return;

  const timer = (mahoraga.adaptationPauseTimer && mahoraga.adaptationPauseTimer > 0) ? mahoraga.adaptationPauseTimer : mahoraga.wheelClickTimer;
  const clickMax = mahoraga.adaptationPauseMax || mahoraga.wheelClickMax || CONFIG.mahoraga?.wheelClickDuration || 25;
  const rawProgress = (clickMax - timer) / clickMax; // Elapsed progress: 0.0 -> 0.5 (peak) -> 1.0
  const progress = Math.min(1.0, Math.max(0.0, rawProgress));
  const maxOpacity = CONFIG.mahoraga?.goldenDimOpacity ?? 0.85;
  const opacity = Math.sin(progress * Math.PI) * maxOpacity; // Bell-curve: 0 at start -> 1 at middle -> 0 at end!

  if (opacity <= 0.01) return;

  ctx.save();

  // Dark Golden Vignette Radial Gradient centered at Mahoraga's wheel
  const wheelY = mahoraga.y - mahoraga.r - 28;
  const maxRadius = Math.max(arena.width, arena.height) * 0.70;
  const grad = ctx.createRadialGradient(
    mahoraga.x, wheelY, 15,
    mahoraga.x, wheelY, maxRadius
  );
  // Dark cinematic vignette overlay (properly darkens the entire arena including Gojo and afterimages!)
  grad.addColorStop(0, `rgba(40, 30, 8, ${opacity * 0.65})`);
  grad.addColorStop(0.25, `rgba(18, 12, 3, ${opacity * 0.88})`);
  grad.addColorStop(0.60, `rgba(8, 4, 1, ${opacity * 0.96})`);
  grad.addColorStop(1.0, `rgba(0, 0, 0, ${opacity * 0.98})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Exclude Gojo's Limitless Infinity Barrier from full-screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(0, 0, 0, ${opacity * 0.98})`;
}

export function drawFuelPickups() {
  const { ctx, fuelPickups, fighters } = state;

  // Only draw fuel pickups if an Orange fighter is currently alive in the arena.
  const hasOrange = fighters.some(f => f && f.hp > 0 && f._def.type === 'orange');
  if (!hasOrange) return;

  fuelPickups.forEach(pickup => {
    if (!pickup.active) return;

    ctx.save();

    // Pulsing effect
    const pulse = 0.85 + Math.sin(pickup.pulsePhase) * 0.15;
    const r = pickup.radius * pulse; // base radius for scaling

    // â”€â”€ Outer glow â”€â”€
    const glowGrad = ctx.createRadialGradient(pickup.x, pickup.y, r * 0.6, pickup.x, pickup.y, r * 2.2);
    glowGrad.addColorStop(0, 'rgba(255, 180, 30, 0.5)');
    glowGrad.addColorStop(0.5, 'rgba(255, 120, 0, 0.25)');
    glowGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // â”€â”€ Battery dimensions â”€â”€
    const bw = r * 1.6;   // battery body width (half)
    const bh = r * 1.1;   // battery body height (half)
    const br = r * 0.35;  // corner radius
    const nx = pickup.x;  // center x
    const ny = pickup.y;  // center y

    // â”€â”€ Battery body (rounded rectangle) â”€â”€
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    roundedRect(ctx, nx - bw, ny - bh, bw * 2, bh * 2, br);
    ctx.fill();

    // ── Body metallic gradient overlay ──
    const bodyGrad = ctx.createLinearGradient(nx - bw, ny - bh, nx + bw, ny + bh);
    bodyGrad.addColorStop(0, '#6e6e6e');
    bodyGrad.addColorStop(0.3, '#8a8a8a');
    bodyGrad.addColorStop(0.5, '#b0b0b0');
    bodyGrad.addColorStop(0.7, '#8a8a8a');
    bodyGrad.addColorStop(1, '#5a5a5a');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    roundedRect(ctx, nx - bw + 1.5, ny - bh + 1.5, bw * 2 - 3, bh * 2 - 3, br - 1);
    ctx.fill();

    // ── Positive terminal nub (top) ──
    const nubW = r * 0.35;
    const nubH = r * 0.45;
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    roundedRect(ctx, nx - nubW, ny - bh - nubH, nubW * 2, nubH, r * 0.15);
    ctx.fill();
    // nub highlight
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    roundedRect(ctx, nx - nubW + 1, ny - bh - nubH + 1, nubW * 2 - 2, nubH * 0.55, r * 0.1);
    ctx.fill();

    // ── Fuel level indicator (colored bar inside battery) ──
    const fuelRatio = 0.75; // pickups are always "full" looking
    const barPad = r * 0.25;
    const barX = nx - bw + barPad;
    const barY = ny - bh + barPad;
    const barW = (bw * 2 - barPad * 2) * fuelRatio;
    const barH = bh * 2 - barPad * 2;

    // Bar background (dark empty portion)
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    roundedRect(ctx, barX, barY, bw * 2 - barPad * 2, barH, r * 0.12);
    ctx.fill();

    // Bar fill (green-to-orange gradient = energy)
    const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    barGrad.addColorStop(0, '#4caf50');
    barGrad.addColorStop(0.5, '#ff9800');
    barGrad.addColorStop(1, '#ff5722');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    roundedRect(ctx, barX, barY, barW, barH, r * 0.12);
    ctx.fill();

    // ── Small "F" label on the bar ──
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(r * 0.55)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', nx, ny);

    // ── Battery outline ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundedRect(ctx, nx - bw, ny - bh, bw * 2, bh * 2, br);
    ctx.stroke();

    ctx.restore();
  });
}

// Helper: draw a rounded rectangle path
function roundedRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ──────────────────────────────────────────
// DRAW — FLOATING TEXT LABELS
// ──────────────────────────────────────────
