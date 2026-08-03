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

  // Base bow amount (always negative so it bows outwards, away from the arena center)
  // A value of -14 to -22 pixels creates a very noticeable, aesthetic curve
  const baseBowAmt = -14 - (nextRand() * 8);

  const strokeCount = 4; // Extra strokes for a penciled look
  for (let s = 0; s < strokeCount; s++) {
    ctx.lineWidth = width * (0.5 + nextRand() * 0.4);
    ctx.beginPath();
    
    const length = Math.hypot(x2 - x1, y2 - y1);
    const segmentLength = 12;
    const segments = Math.max(2, Math.floor(length / segmentLength));
    
    // Each pencil stroke gets a slightly different curve/displacement
    const strokeBowVar = (nextRand() - 0.5) * 6;
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

  // Fill the entire canvas with black so it blends with the window background
  g.beginFill(0x000000);
  g.drawRect(0, 0, pixiApp.screen.width, pixiApp.screen.height);
  g.endFill();

  // Draw the white gameplay area that tightly hugs the arena and the HUD
  const whiteTop = arena.y - 20;
  const whiteBottom = 820;
  g.beginFill(0xf5f5f5);
  g.drawRect(0, whiteTop, pixiApp.screen.width, whiteBottom - whiteTop);
  g.endFill();

  if (!hasActiveDomain) {
    // Arena floor background
    g.beginFill(0xffffff);
    g.drawRect(arena.x, arena.y, arena.width, arena.height);
    g.endFill();
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
  ctx.drawImage(state._arenaBorderCanvas, arena.x - 60, arena.y - 60);

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

  // ── Cached Title Header (splatters + text) ──────────────────────────────
  // Render the entire title visual (ink splatters + stroked text) once into an
  // offscreen canvas, then blit it every frame. Custom font strokeText is very
  // expensive to run 60 fps — caching eliminates the cost entirely.
  if (!state._titleHeaderCanvas) {
    const headerW = 540;
    const headerH = 170;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = headerW;
    offCanvas.height = headerH;
    const oc = offCanvas.getContext('2d');

    // ── Ink Splatters ─────────────────────────────────────────────────────
    // Seeded pseudo-random for deterministic splatters
    let _seed = 42;
    const sRand = () => { _seed = (_seed * 16807 + 0) % 2147483647; return (_seed & 0x7fffffff) / 0x7fffffff; };

    // 1. Bold diagonal brush stroke behind title (dark red, subtle)
    oc.save();
    oc.globalAlpha = 0.25;
    oc.fillStyle = '#8b0000';
    oc.translate(headerW / 2, 95);
    oc.rotate(-0.04);
    for (let i = 0; i < 12; i++) {
      const bx = (i - 6) * 28 + (sRand() - 0.5) * 10;
      const by = (sRand() - 0.5) * 8;
      const bw = 32 + sRand() * 14;
      const bh = 14 + sRand() * 10;
      oc.beginPath();
      oc.ellipse(bx, by, bw, bh, (sRand() - 0.5) * 0.3, 0, Math.PI * 2);
      oc.fill();
    }
    oc.restore();

    // 2. Crimson ink splatters
    const splatColors = ['#cc0000', '#ff1a1a', '#990000', '#ff4444', '#dd0033'];
    for (let s = 0; s < 18; s++) {
      const sx = 60 + sRand() * (headerW - 120);
      const sy = 50 + sRand() * 100;
      const sr = 2 + sRand() * 6;
      oc.save();
      oc.globalAlpha = 0.3 + sRand() * 0.35;
      oc.fillStyle = splatColors[Math.floor(sRand() * splatColors.length)];
      oc.beginPath();
      oc.arc(sx, sy, sr, 0, Math.PI * 2);
      oc.fill();
      const dripCount = Math.floor(sRand() * 4) + 1;
      for (let d = 0; d < dripCount; d++) {
        const da = sRand() * Math.PI * 2;
        const dd = sr + 2 + sRand() * 8;
        const dr = 0.8 + sRand() * 2.2;
        oc.beginPath();
        oc.arc(sx + Math.cos(da) * dd, sy + Math.sin(da) * dd, dr, 0, Math.PI * 2);
        oc.fill();
      }
      if (sRand() > 0.55) {
        const dripLen = 6 + sRand() * 18;
        oc.beginPath();
        oc.moveTo(sx, sy + sr);
        oc.lineTo(sx + (sRand() - 0.5) * 3, sy + sr + dripLen);
        oc.lineWidth = 1 + sRand() * 1.5;
        oc.strokeStyle = oc.fillStyle;
        oc.globalAlpha *= 0.7;
        oc.stroke();
      }
      oc.restore();
    }

    // 3. Small cyan/blue accent splatters
    for (let s = 0; s < 6; s++) {
      const sx = 80 + sRand() * (headerW - 160);
      const sy = 60 + sRand() * 80;
      const sr = 1.5 + sRand() * 3.5;
      oc.save();
      oc.globalAlpha = 0.2 + sRand() * 0.25;
      oc.fillStyle = sRand() > 0.5 ? '#00ccff' : '#0088ff';
      oc.beginPath();
      oc.arc(sx, sy, sr, 0, Math.PI * 2);
      oc.fill();
      const da = sRand() * Math.PI * 2;
      oc.beginPath();
      oc.arc(sx + Math.cos(da) * (sr + 4), sy + Math.sin(da) * (sr + 4), sRand() * 1.5 + 0.5, 0, Math.PI * 2);
      oc.fill();
      oc.restore();
    }

    // ── Title Text (rendered once) ────────────────────────────────────────
    const textCX = headerW / 2;
    oc.fillStyle = '#ffffff';
    oc.font = '900 42px "Haruto", Arial';
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    oc.strokeStyle = '#000000';
    oc.lineWidth = 4;
    oc.strokeText('Fight of Characters', textCX, 100);
    oc.fillText('Fight of Characters', textCX, 100);

    oc.font = '18px "Glast Blitch", Arial';
    oc.lineWidth = 3;
    oc.strokeText('Ball Fight Simulator', textCX, 135);
    oc.fillText('Ball Fight Simulator', textCX, 135);

    state._titleHeaderCanvas = offCanvas;

    // Guard against font loading delay: invalidate cache once fonts are fully loaded
    if (document.fonts && !state._titleFontListenerAdded) {
      state._titleFontListenerAdded = true;
      document.fonts.ready.then(() => {
        state._titleHeaderCanvas = null;
      });
    }
  }

  // Blit the fully cached title header (splatters + text) in one drawImage call
  ctx.drawImage(state._titleHeaderCanvas, centerX - state._titleHeaderCanvas.width / 2, 0);
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
      roundCx, roundCy, 40,
      roundCx, roundCy, maxDim
    );
    state._cachedPurpleDimGrad.addColorStop(0, `rgba(147, 51, 234, 0.25)`);  // Bright electric purple center
    state._cachedPurpleDimGrad.addColorStop(0.35, `rgba(88, 28, 135, 0.60)`); // Deep purple aura
    state._cachedPurpleDimGrad.addColorStop(0.70, `rgba(30, 0, 50, 0.85)`);   // Dark void
    state._cachedPurpleDimGrad.addColorStop(1.0, `rgba(10, 0, 20, 0.95)`);   // Outer dark edge
  }

  ctx.globalAlpha = opacity;
  ctx.fillStyle = state._cachedPurpleDimGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
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

  ctx.restore();
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
  ctx.restore();
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
