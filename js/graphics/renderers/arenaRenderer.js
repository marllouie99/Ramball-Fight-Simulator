// ─────────────────────────────────────────────
// ARENA & SCREEN OVERLAY RENDERER
// ─────────────────────────────────────────────
import { state, getProjectiles } from '../../core/state.js';

export function drawArena() {
  const { ctx, canvas, arena } = state;
  const hasActiveDomain = state.fighters && state.fighters.some(f => f && f.domainActive && typeof f.drawDomainBackground === 'function');

  if (!hasActiveDomain) {
    // Fill the entire canvas background with black for the top and bottom letterboxing
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fill the middle area (arena + HUD) with white
    ctx.fillStyle = '#ffffff';
    const whiteAreaStartY = arena.y - 20;
    const whiteAreaEndY = 770; // Brought bottom dark cover higher up towards the top
    ctx.fillRect(0, whiteAreaStartY, canvas.width, whiteAreaEndY - whiteAreaStartY);

    // Arena background (in case it needs to be different later, but right now it's a slightly off-white)
    ctx.fillStyle = 'rgb(250, 250, 250)';
    ctx.fillRect(arena.x, arena.y, arena.width, arena.height);
  }

  // Draw the arena boundary stroke (thinner, sleek wall border)
  ctx.strokeStyle = '#000000ff';
  ctx.lineWidth = (typeof state !== 'undefined' && state.config && state.config.arena && state.config.arena.wallWidth) 
    ? state.config.arena.wallWidth 
    : 4;
  ctx.strokeRect(arena.x, arena.y, arena.width, arena.height);
}

let currentPurpleDimOpacity = 0;

/**
 * Draws a purple dim screen overlay when Gojo's Hollow Purple is being channeled,
 * actively moving as a projectile, or in post-fire recovery.
 */
export function drawPurpleDimScreen() {
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

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
  ctx.fillRect(-200, -200, canvas.width + 400, canvas.height + 400);

  // Dynamic radial gradient centered on Gojo or Purple Orb
  const maxDim = Math.max(canvas.width, canvas.height) * 0.95;
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
  ctx.fillRect(-200, -200, canvas.width + 400, canvas.height + 400);
  ctx.restore();
}

let currentTojiUltimateOpacity = 0;
let flyHeads = [];

export function drawTojiUltimateOverlay() {
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

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
