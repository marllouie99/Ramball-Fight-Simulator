import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { worldToScreen } from '../../systems/cameraSystem.js';
import { isInsideRubbickStolenVoid } from '../../entities/fighters/rubbick/rubbickThemes.js';
import { isTodoTakadaOverlayActive } from './specialOverlayRenderer.js';

// ──────────────────────────────────────────
// GOJO INFINITY CUTOUT HELPER
// ──────────────────────────────────────────
export function excludeGojoInfinityFromDim(ctx) {
  if (!state.fighters) return;
  const isSaitamaCounterActive = state.fighters.some(f => 
    f && (f.characterId === 'saitama' || f.type === 'saitama') && 
    ((f._counterPunchTimer && f._counterPunchTimer > 0) || 
     (f._postCounterRecoveryTimer && f._postCounterRecoveryTimer > 0) || 
     (f._counterWindupTimer && f._counterWindupTimer > 0) ||
     f.isCountering)
  );
  for (const f of state.fighters) {
    if (!f || f.hp <= 0) continue;
    const isGojo = (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo' || f._def?.type === 'gojo');
    if (!isGojo) continue;
    const isBarrierSuppressed = Boolean(f.isTargetOfAmbush || f.caughtInSaitamaCounter || isSaitamaCounterActive || (f.infinityFadeOpacity !== undefined && f.infinityFadeOpacity <= 0.005) || isInsideRubbickStolenVoid(f) || f.isChainedByMakima);
    if (isBarrierSuppressed) continue;
    const isLimitlessActive = (!f.isMeleeMode || (f.infinityBlockTimer || 0) > 0);
    if (!isLimitlessActive) continue;
    
    const infinityR = CONFIG.gojo?.infinityRadius ?? (f.r + 30);
    const camZoom = (state.camera && state.camera.mode === 'dynamic') ? state.camera.zoom : 1.0;
    const cutoutRadius = (infinityR + 25) * camZoom;
    const screenPos = worldToScreen(f.x, f.y - (f.z || 0));
    const drawX = screenPos.x;
    const drawY = screenPos.y;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const holeGrad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, cutoutRadius);
    holeGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    holeGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.85)');
    holeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.arc(drawX, drawY, cutoutRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ──────────────────────────────────────────
// DOMAIN ARENA VIGNETTE CUTOUT HELPER
// Clears the arena interior during active Domain Expansions
// so domain artwork (swords, shrine, hands, void) remains 100% visible,
// leaving dark atmospheric color framing outside the arena with a subtle edge vignette.
// ──────────────────────────────────────────
export function applyDomainArenaVignetteCutout(ctx) {
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  if (!arena || !ctx) return;

  const zoom = (state.camera && state.camera.enabled && state.camera.mode === 'dynamic') ? (state.camera.zoom || 1.0) : 1.0;
  const worldArenaCenterX = (arena.x || 0) + (arena.width || 800) / 2;
  const worldArenaCenterY = (arena.y || 0) + (arena.height || 600) / 2;
  const screenCenter = worldToScreen(worldArenaCenterX, worldArenaCenterY);
  const arenaCenterX = screenCenter.x;
  const arenaCenterY = screenCenter.y;

  if (isNaN(arenaCenterX) || isNaN(arenaCenterY)) return;

  const arenaW = (arena.width || 800) * zoom;
  const arenaH = (arena.height || 600) * zoom;
  const arenaX = arenaCenterX - arenaW / 2;
  const arenaY = arenaCenterY - arenaH / 2;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  if (arena.shape === 'circle') {
    const ar = (arena.radius || ((arena.width || 800) / 2)) * zoom;
    const innerR = ar * 0.85;

    // 1. Clear solid center interior (100% transparent, completely unobstructed)
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.beginPath();
    ctx.arc(arenaCenterX, arenaCenterY, innerR, 0, Math.PI * 2);
    ctx.fill();

    // 2. Subtle soft edge vignette at circular arena wall boundary
    const ringGrad = ctx.createRadialGradient(
      arenaCenterX, arenaCenterY, innerR,
      arenaCenterX, arenaCenterY, ar
    );
    ringGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    ringGrad.addColorStop(0.60, 'rgba(0, 0, 0, 0.70)');
    ringGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.15)');

    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(arenaCenterX, arenaCenterY, ar, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rectangular Arena
    const vignetteSize = Math.max(16, Math.min(arenaW, arenaH) * 0.08); // Subtle ~25-35px border vignette
    const innerX = arenaX + vignetteSize;
    const innerY = arenaY + vignetteSize;
    const innerW = Math.max(0, arenaW - vignetteSize * 2);
    const innerH = Math.max(0, arenaH - vignetteSize * 2);

    if (innerW > 0 && innerH > 0) {
      // 1. Clear solid center interior (100% transparent, completely unobstructed)
      ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
      ctx.fillRect(innerX, innerY, innerW, innerH);

      // 2. Subtle soft edge vignettes along the 4 borders
      // Top border
      const topGrad = ctx.createLinearGradient(innerX, arenaY, innerX, innerY);
      topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
      topGrad.addColorStop(1, 'rgba(0, 0, 0, 1.0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(innerX, arenaY, innerW, vignetteSize);

      // Bottom border
      const botGrad = ctx.createLinearGradient(innerX, innerY + innerH, innerX, arenaY + arenaH);
      botGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      botGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(innerX, innerY + innerH, innerW, vignetteSize);

      // Left border
      const leftGrad = ctx.createLinearGradient(arenaX, innerY, innerX, innerY);
      leftGrad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
      leftGrad.addColorStop(1, 'rgba(0, 0, 0, 1.0)');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(arenaX, innerY, vignetteSize, innerH);

      // Right border
      const rightGrad = ctx.createLinearGradient(innerX + innerW, innerY, arenaX + arenaW, innerY);
      rightGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(innerX + innerW, innerY, vignetteSize, innerH);

      // 3. Four soft corner blends
      // Top-Left corner
      const tlGrad = ctx.createRadialGradient(innerX, innerY, 0, innerX, innerY, vignetteSize);
      tlGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      tlGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.fillStyle = tlGrad;
      ctx.fillRect(arenaX, arenaY, vignetteSize, vignetteSize);

      // Top-Right corner
      const trGrad = ctx.createRadialGradient(innerX + innerW, innerY, 0, innerX + innerW, innerY, vignetteSize);
      trGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      trGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.fillStyle = trGrad;
      ctx.fillRect(innerX + innerW, arenaY, vignetteSize, vignetteSize);

      // Bottom-Left corner
      const blGrad = ctx.createRadialGradient(innerX, innerY + innerH, 0, innerX, innerY + innerH, vignetteSize);
      blGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      blGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.fillStyle = blGrad;
      ctx.fillRect(arenaX, innerY + innerH, vignetteSize, vignetteSize);

      // Bottom-Right corner
      const brGrad = ctx.createRadialGradient(innerX + innerW, innerY + innerH, 0, innerX + innerW, innerY + innerH, vignetteSize);
      brGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      brGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.fillStyle = brGrad;
      ctx.fillRect(innerX + innerW, innerY + innerH, vignetteSize, vignetteSize);
    }
  }

  ctx.restore();
}

let currentPurpleDimOpacity = 0;

/**
 * Draws a purple dim screen overlay when Gojo's Hollow Purple is being channeled,
 * actively moving as a projectile, or in post-fire recovery.
 */
export function drawPurpleDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
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
  // Reset transform to identity screen space so full-screen dim rect doesn't shake outer edges
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const opacity = currentPurpleDimOpacity;
  const is200 = (purpleOrb && purpleOrb.is200Percent) || (gojoFighter && (gojoFighter.is200PercentChannel || gojoFighter.purpleUseCount === 1));
  const isGreen = Boolean(purpleOrb && (purpleOrb.colorTheme === 'green' || purpleOrb.isRubbick || purpleOrb.isTrickster || purpleOrb.color === '#00FF64'));

  // Dark rich cursed royal purple / void overlay
  ctx.fillStyle = isGreen ? `rgba(2, 24, 10, ${opacity * 0.88})` : `rgba(20, 2, 32, ${opacity * 0.88})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dynamic radial gradient centered on Gojo or Purple Orb
  const camZoom = (state.camera && state.camera.mode === 'dynamic') ? state.camera.zoom : 1.0;
  const screenPos = worldToScreen(cx, cy);
  const maxDim = Math.max(arena.width, arena.height) * 0.70 * camZoom;
  const roundCx = Math.round(screenPos.x / 10) * 10;
  const roundCy = Math.round(screenPos.y / 10) * 10;
  const key = `${roundCx}_${roundCy}_${maxDim}_${is200}_${isGreen ? 'green' : 'purple'}`;

  if (!state._cachedPurpleDimGrad || state._cachedPurpleDimKey !== key) {
    state._cachedPurpleDimKey = key;
    state._cachedPurpleDimGrad = ctx.createRadialGradient(
      roundCx, roundCy, 0,
      roundCx, roundCy, maxDim
    );
    const glowR = is200 ? 140 : 90;
    const rRatio = glowR / maxDim;

    if (isGreen) {
      state._cachedPurpleDimGrad.addColorStop(0, 'rgba(0, 255, 120, 1.0)');           // Vibrant neon green core
      state._cachedPurpleDimGrad.addColorStop(rRatio * 0.20, 'rgba(0, 210, 90, 0.95)'); // Saturated electric emerald
      state._cachedPurpleDimGrad.addColorStop(rRatio * 0.55, 'rgba(0, 150, 65, 0.75)');  // Deep arcane green ring
      state._cachedPurpleDimGrad.addColorStop(rRatio * 1.00, 'rgba(0, 90, 35, 0.48)');   // Dark green halo bloom
      state._cachedPurpleDimGrad.addColorStop(rRatio * 1.50, 'rgba(0, 40, 15, 0.28)');    // Deep night-green transition
      state._cachedPurpleDimGrad.addColorStop(Math.min(1.0, rRatio * 2.2), 'rgba(0, 25, 10, 0.60)'); // Deep arcane green space
      state._cachedPurpleDimGrad.addColorStop(1.0, 'rgba(0, 15, 6, 0.40)');               // Outer boundary
    } else {
      state._cachedPurpleDimGrad.addColorStop(0, 'rgba(220, 60, 255, 1.0)');           // Vibrant neon magenta-purple core
      state._cachedPurpleDimGrad.addColorStop(rRatio * 0.20, 'rgba(170, 20, 255, 0.95)'); // Saturated electric royal purple
      state._cachedPurpleDimGrad.addColorStop(rRatio * 0.55, 'rgba(130, 10, 230, 0.75)');  // Deep JJK cursed purple ring
      state._cachedPurpleDimGrad.addColorStop(rRatio * 1.00, 'rgba(85, 5, 160, 0.48)');   // Dark violet halo bloom
      state._cachedPurpleDimGrad.addColorStop(rRatio * 1.50, 'rgba(40, 2, 80, 0.28)');    // Deep night-purple transition
      state._cachedPurpleDimGrad.addColorStop(Math.min(1.0, rRatio * 2.2), 'rgba(25, 2, 50, 0.60)'); // Deep cursed purple space
      state._cachedPurpleDimGrad.addColorStop(1.0, 'rgba(15, 1, 28, 0.40)');               // Outer boundary
    }
  }

  ctx.globalAlpha = opacity;
  ctx.fillStyle = state._cachedPurpleDimGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Render vibrant Red & Blue radiant bloom halos during Hollow Purple mixing phase ──
  if (gojoFighter && gojoFighter.isChannelingPurple) {
    const chargeMax = gojoFighter.purpleChargeMax || 120;
    const progress = Math.min(1.0, (gojoFighter.purpleChargeTimer || 0) / Math.max(1, chargeMax));
    const is200 = !!(gojoFighter.is200PercentChannel || gojoFighter.purpleUseCount === 1);

    if (progress < 0.70) {
      const f = gojoFighter;
      const angle = f.gunAngle || f.angle || 0;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const moveP = progress / 0.70;
      const easeMove = Math.sin(moveP * Math.PI * 0.5);

      let headX, handSpreadY;
      if (is200) {
        headX = -f.r * 2.8;
        handSpreadY = f.r * 2.8;
      } else {
        headX = f.r + 10;
        handSpreadY = 22;
      }
      const spreadY = handSpreadY * (1 - easeMove);

      const redLocalX = headX;
      const redLocalY = spreadY;
      const redWorldX = f.x + (redLocalX * cosA - redLocalY * sinA);
      const redWorldY = (f.y - (f.z || 0)) + (redLocalX * sinA + redLocalY * cosA);
      const redScreen = worldToScreen(redWorldX, redWorldY);
      const redCanvasX = redScreen.x;
      const redCanvasY = redScreen.y;

      const blueLocalX = headX;
      const blueLocalY = -spreadY;
      const blueWorldX = f.x + (blueLocalX * cosA - blueLocalY * sinA);
      const blueWorldY = (f.y - (f.z || 0)) + (blueLocalX * sinA + blueLocalY * cosA);
      const blueScreen = worldToScreen(blueWorldX, blueWorldY);
      const blueCanvasX = blueScreen.x;
      const blueCanvasY = blueScreen.y;

      const fadeInP = Math.min(1.0, progress / 0.22);
      const easeFade = Math.sin(fadeInP * Math.PI * 0.5);
      const growP = Math.min(1.0, progress / 0.35);
      const easeGrow = Math.sin(growP * Math.PI * 0.5);
      const bloomScale = is200 ? (0.20 + 0.80 * easeGrow) : 1.0;
      const bloomRadius = (is200 ? 110 : 80) * bloomScale * camZoom;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = opacity * (1.0 - progress * 0.3) * easeFade;

      // 1. Red Bloom Halo
      const redGrad = ctx.createRadialGradient(redCanvasX, redCanvasY, 0, redCanvasX, redCanvasY, bloomRadius);
      redGrad.addColorStop(0, 'rgba(255, 60, 60, 1.0)');
      redGrad.addColorStop(0.25, 'rgba(255, 0, 0, 0.90)');
      redGrad.addColorStop(0.60, 'rgba(180, 0, 0, 0.60)');
      redGrad.addColorStop(1.0, 'rgba(80, 0, 0, 0)');
      ctx.fillStyle = redGrad;
      ctx.beginPath();
      ctx.arc(redCanvasX, redCanvasY, bloomRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Blue Bloom Halo
      const blueGrad = ctx.createRadialGradient(blueCanvasX, blueCanvasY, 0, blueCanvasX, blueCanvasY, bloomRadius);
      blueGrad.addColorStop(0, 'rgba(80, 220, 255, 1.0)');
      blueGrad.addColorStop(0.25, 'rgba(0, 120, 255, 0.90)');
      blueGrad.addColorStop(0.60, 'rgba(0, 50, 220, 0.60)');
      blueGrad.addColorStop(1.0, 'rgba(0, 20, 140, 0)');
      ctx.fillStyle = blueGrad;
      ctx.beginPath();
      ctx.arc(blueCanvasX, blueCanvasY, bloomRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // Exclude Rika from Gojo's Purple dim screen overlay
  if (state.fighters) {
    for (const f of state.fighters) {
      if (!f || !f.rika || !f.rika.active || !f.rikaAlpha || f.rikaAlpha <= 0) continue;
      const rk = f.rika;
      const rScale = rk.spawnScale ?? 1.0;
      const rkScreen = worldToScreen(rk.x, rk.y);
      const rkX = rkScreen.x;
      const rkY = rkScreen.y;
      const cutoutRadius = Math.max(90, ((rk.r || 35) * rScale * 3.0 + 60) * camZoom);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const holeGrad = ctx.createRadialGradient(rkX, rkY, 0, rkX, rkY, cutoutRadius);
      const alphaMult = Math.min(1.0, f.rikaAlpha || 1.0);
      holeGrad.addColorStop(0, `rgba(0, 0, 0, ${alphaMult})`);
      holeGrad.addColorStop(0.60, `rgba(0, 0, 0, ${alphaMult * 0.85})`);
      holeGrad.addColorStop(1.0, `rgba(0, 0, 0, 0)`);
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.arc(rkX, rkY, cutoutRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Exclude Gojo's Limitless Infinity Barrier from full-screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
  
  state.globalDimEdgeColor = isGreen ? `rgba(2, 24, 10, ${opacity * 0.95})` : `rgba(20, 2, 32, ${opacity * 0.95})`;
}

let currentGojoDomainDimOpacity = 0;

/**
 * Draws a dark cosmic blue dim screen overlay when Gojo's Domain Expansion (Unlimited Void) is active.
 */
export function drawGojoDomainDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const gojoFighter = state.fighters?.find(f =>
    f && f.hp > 0 && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo' || f._def?.type === 'gojo') && (f.domainActive || f.isChannelingDomainExpansion)
  );

  let targetOpacity = 0;
  if (gojoFighter) {
    if (gojoFighter.domainActive) {
      targetOpacity = 0.72;
    } else if (gojoFighter.isChannelingDomainExpansion) {
      const chargeMax = gojoFighter.domainChargeMax || 120;
      const progress = Math.min(1.0, (gojoFighter.domainChargeTimer || 0) / Math.max(1, chargeMax));
      targetOpacity = 0.25 + progress * 0.45;
    }
  }

  if (targetOpacity > currentGojoDomainDimOpacity) {
    currentGojoDomainDimOpacity += (targetOpacity - currentGojoDomainDimOpacity) * 0.08;
  } else {
    currentGojoDomainDimOpacity += (targetOpacity - currentGojoDomainDimOpacity) * 0.06;
  }

  if (currentGojoDomainDimOpacity < 0.01) {
    currentGojoDomainDimOpacity = 0;
    return;
  }

  const opacity = currentGojoDomainDimOpacity;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Base dark cosmic blue atmosphere overlay
  ctx.fillStyle = `rgba(4, 10, 36, ${opacity * 0.85})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Deep cosmic dark blue / limitless cyan radial gradient centered on Gojo
  const screenPos = gojoFighter ? worldToScreen(gojoFighter.x, gojoFighter.y - (gojoFighter.z || 0)) : { x: canvas.width / 2, y: canvas.height / 2 };
  const cx = screenPos.x;
  const cy = screenPos.y;
  const maxDim = Math.max(canvas.width, canvas.height) * 0.90;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0, `rgba(0, 160, 220, ${opacity * 0.55})`);        // Limitless cyan-blue core
  grad.addColorStop(0.18, `rgba(15, 80, 180, ${opacity * 0.45})`);     // Deep royal blue halo
  grad.addColorStop(0.40, `rgba(8, 35, 120, ${opacity * 0.30})`);      // Dark cosmic blue ring
  grad.addColorStop(0.70, `rgba(4, 14, 55, ${opacity * 0.15})`);       // Deep astral fade
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');                           // Outer boundary

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Clear arena interior with subtle edge vignette so Unlimited Void cosmic artwork is 100% visible
  if (gojoFighter && gojoFighter.domainActive) {
    applyDomainArenaVignetteCutout(ctx);
  }

  // Exclude Gojo Limitless Infinity Barrier from full-screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(4, 10, 36, ${opacity * 0.95})`;
}

let currentRubbickDomainDimOpacity = 0;

/**
 * Draws a dark arcane emerald green dim screen overlay when Rubbick's stolen Domain Expansion (Unlimited Void) is active or channeling.
 */
export function drawRubbickDomainDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const rubbickFighter = state.fighters?.find(f =>
    f && f.hp > 0 && (f.characterId === 'rubbick' || f.type === 'rubbick' || f._def?.id === 'rubbick') &&
    ((f.stolenDomainActive && (f.stolenDomainTimer || 0) > 0) || (f.stolenType === 'gojo_domain' && (f.stolenWindUpTimer > 0 || f.domainActive)))
  );

  let targetOpacity = 0;
  if (rubbickFighter) {
    if (rubbickFighter.stolenDomainActive || (rubbickFighter.domainActive && rubbickFighter.stolenType === 'gojo_domain')) {
      targetOpacity = 0.72;
    } else if (rubbickFighter.stolenType === 'gojo_domain' && rubbickFighter.stolenWindUpTimer > 0) {
      const windupMax = 60;
      const progress = Math.min(1.0, Math.max(0, 1 - (rubbickFighter.stolenWindUpTimer / windupMax)));
      targetOpacity = 0.25 + progress * 0.45;
    }
  }

  if (targetOpacity > currentRubbickDomainDimOpacity) {
    currentRubbickDomainDimOpacity += (targetOpacity - currentRubbickDomainDimOpacity) * 0.08;
  } else {
    currentRubbickDomainDimOpacity += (targetOpacity - currentRubbickDomainDimOpacity) * 0.06;
  }

  if (currentRubbickDomainDimOpacity < 0.01) {
    currentRubbickDomainDimOpacity = 0;
    return;
  }

  const opacity = currentRubbickDomainDimOpacity;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Base dark emerald green atmosphere overlay
  ctx.fillStyle = `rgba(3, 30, 12, ${opacity * 0.85})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Arcane emerald radial gradient centered on Rubick
  const screenPos = rubbickFighter ? worldToScreen(rubbickFighter.x, rubbickFighter.y - (rubbickFighter.z || 0)) : { x: canvas.width / 2, y: canvas.height / 2 };
  const cx = screenPos.x;
  const cy = screenPos.y;
  const maxDim = Math.max(canvas.width, canvas.height) * 0.90;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0, `rgba(0, 190, 90, ${opacity * 0.55})`);         // Arcane emerald core
  grad.addColorStop(0.18, `rgba(0, 140, 65, ${opacity * 0.45})`);      // Deep emerald halo
  grad.addColorStop(0.40, `rgba(0, 75, 35, ${opacity * 0.30})`);       // Arcane green ring
  grad.addColorStop(0.70, `rgba(2, 35, 15, ${opacity * 0.15})`);       // Deep jade fade
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');                           // Outer boundary

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Clear arena interior with subtle edge vignette so stolen domain artwork is 100% visible
  if (rubbickFighter && (rubbickFighter.stolenDomainActive || (rubbickFighter.domainActive && rubbickFighter.stolenType === 'gojo_domain'))) {
    applyDomainArenaVignetteCutout(ctx);
  }

  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(3, 30, 12, ${opacity * 0.95})`;
}

let currentSukunaDomainDimOpacity = 0;

/**
 * Draws a dark crimson/blood-red dim screen overlay when Sukuna's Domain Expansion (Malevolent Shrine) is active.
 */
export function drawSukunaDomainDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const sukunaFighter = state.fighters?.find(f =>
    f && f.hp > 0 && (f.characterId === 'sukuna' || f.type === 'sukuna' || f._def?.id === 'sukuna' || f._def?.type === 'sukuna') && (f.domainActive || f.isChannelingDomainExpansion)
  );

  let targetOpacity = 0;
  if (sukunaFighter) {
    if (sukunaFighter.domainActive) {
      targetOpacity = 0.75;
    } else if (sukunaFighter.isChannelingDomainExpansion) {
      const chargeMax = CONFIG.sukuna?.domainChargeMax || 120;
      const progress = Math.min(1.0, (sukunaFighter.domainChargeTimer || 0) / Math.max(1, chargeMax));
      targetOpacity = 0.25 + progress * 0.45;
    }
  }

  if (targetOpacity > currentSukunaDomainDimOpacity) {
    currentSukunaDomainDimOpacity += (targetOpacity - currentSukunaDomainDimOpacity) * 0.08;
  } else {
    currentSukunaDomainDimOpacity += (targetOpacity - currentSukunaDomainDimOpacity) * 0.06;
  }

  if (currentSukunaDomainDimOpacity < 0.01) {
    currentSukunaDomainDimOpacity = 0;
    return;
  }

  const opacity = currentSukunaDomainDimOpacity;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Base dark crimson atmosphere overlay
  ctx.fillStyle = `rgba(32, 4, 8, ${opacity * 0.85})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Deep crimson/blood-red radial gradient centered on Sukuna
  const screenPos = sukunaFighter ? worldToScreen(sukunaFighter.x, sukunaFighter.y - (sukunaFighter.z || 0)) : { x: canvas.width / 2, y: canvas.height / 2 };
  const cx = screenPos.x;
  const cy = screenPos.y;
  const maxDim = Math.max(canvas.width, canvas.height) * 0.90;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0, `rgba(180, 20, 25, ${opacity * 0.55})`);        // Deep malevolent crimson core
  grad.addColorStop(0.18, `rgba(120, 12, 18, ${opacity * 0.45})`);     // Blood red halo
  grad.addColorStop(0.40, `rgba(60, 6, 12, ${opacity * 0.30})`);       // Dark crimson ring
  grad.addColorStop(0.70, `rgba(35, 4, 8, ${opacity * 0.15})`);        // Deep maroon fade
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');                           // Outer boundary

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Clear arena interior with subtle edge vignette so Malevolent Shrine artwork is 100% visible
  if (sukunaFighter && sukunaFighter.domainActive) {
    applyDomainArenaVignetteCutout(ctx);
  }

  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(32, 4, 8, ${opacity * 0.95})`;
}

let currentYutaDomainDimOpacity = 0;

/**
 * Draws a dark cursed pink/magenta-rose dim screen overlay matching Yuta's Authentic Mutual Love Domain Expansion.
 */
export function drawYutaDomainDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const yutaFighter = state.fighters?.find(f =>
    f && f.hp > 0 && (f.characterId === 'yuta' || f.type === 'yuta' || f._def?.id === 'yuta' || f._def?.type === 'yuta') && (f.domainActive || f.isChannelingDomain)
  );

  let targetOpacity = 0;
  if (yutaFighter) {
    if (yutaFighter.domainActive) {
      targetOpacity = 0.75;
    } else if (yutaFighter.isChannelingDomain) {
      const chargeMax = yutaFighter.domainChargeMax || 50;
      const progress = Math.min(1.0, (yutaFighter.domainChargeTimer || 0) / Math.max(1, chargeMax));
      targetOpacity = 0.25 + progress * 0.45;
    }
  }

  if (targetOpacity > currentYutaDomainDimOpacity) {
    currentYutaDomainDimOpacity += (targetOpacity - currentYutaDomainDimOpacity) * 0.08;
  } else {
    currentYutaDomainDimOpacity += (targetOpacity - currentYutaDomainDimOpacity) * 0.06;
  }

  if (currentYutaDomainDimOpacity < 0.01) {
    currentYutaDomainDimOpacity = 0;
    return;
  }

  const opacity = currentYutaDomainDimOpacity;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Base dark cursed pink/wine atmosphere overlay matching domain theme
  ctx.fillStyle = `rgba(32, 5, 24, ${opacity * 0.88})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Deep cursed pink & magenta-rose radial aura centered on Yuta
  const screenPos = yutaFighter ? worldToScreen(yutaFighter.x, yutaFighter.y - (yutaFighter.z || 0)) : { x: canvas.width / 2, y: canvas.height / 2 };
  const cx = screenPos.x;
  const cy = screenPos.y;
  const maxDim = Math.max(canvas.width, canvas.height) * 0.90;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0, `rgba(255, 30, 150, ${opacity * 0.60})`);       // Vibrant cursed authentic love pink core
  grad.addColorStop(0.18, `rgba(215, 20, 130, ${opacity * 0.50})`);    // Deep cursed magenta-pink halo
  grad.addColorStop(0.40, `rgba(135, 12, 85, ${opacity * 0.35})`);     // Dark royal rose void
  grad.addColorStop(0.70, `rgba(55, 6, 38, ${opacity * 0.18})`);       // Deep wine-plum transition
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');                           // Outer boundary

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Clear arena interior with subtle edge vignette so domain artwork is 100% visible
  if (yutaFighter && yutaFighter.domainActive) {
    applyDomainArenaVignetteCutout(ctx);
  }

  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(32, 5, 24, ${opacity * 0.95})`;
}

let currentMahitoDomainDimOpacity = 0;

/**
 * Draws a dark cursed purple dim screen overlay when Mahito's Domain Expansion (Self-Embodiment of Perfection) is active or channeling.
 */
export function drawMahitoDomainDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas } = state;
  if (!ctx || !canvas) return;

  const mahitoFighter = state.fighters?.find(f =>
    f && f.hp > 0 && (f.characterId === 'mahito' || f.type === 'mahito' || f._def?.id === 'mahito' || f._def?.type === 'mahito') && (f.domainActive || f._mahitoDomainActive || f.isChannelingDomainExpansion)
  );

  let targetOpacity = 0;
  if (mahitoFighter) {
    if (mahitoFighter.domainActive || mahitoFighter._mahitoDomainActive) {
      targetOpacity = 0.72;
    } else if (mahitoFighter.isChannelingDomainExpansion) {
      const chargeMax = mahitoFighter.domainChargeMax || 120;
      const progress = Math.min(1.0, (mahitoFighter.domainChargeTimer || 0) / Math.max(1, chargeMax));
      targetOpacity = 0.25 + progress * 0.45;
    }
  }

  if (targetOpacity > currentMahitoDomainDimOpacity) {
    currentMahitoDomainDimOpacity += (targetOpacity - currentMahitoDomainDimOpacity) * 0.08;
  } else {
    currentMahitoDomainDimOpacity += (targetOpacity - currentMahitoDomainDimOpacity) * 0.06;
  }

  if (currentMahitoDomainDimOpacity < 0.01) {
    currentMahitoDomainDimOpacity = 0;
    return;
  }

  const opacity = currentMahitoDomainDimOpacity;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Base dark cursed violet atmosphere overlay
  ctx.fillStyle = `rgba(24, 3, 32, ${opacity * 0.85})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Cursed soul violet radial gradient centered on Mahito
  const screenPos = mahitoFighter ? worldToScreen(mahitoFighter.x, mahitoFighter.y - (mahitoFighter.z || 0)) : { x: canvas.width / 2, y: canvas.height / 2 };
  const cx = screenPos.x;
  const cy = screenPos.y;
  const maxDim = Math.max(canvas.width, canvas.height) * 0.90;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0, `rgba(175, 45, 210, ${opacity * 0.55})`);       // Radiant soul violet core
  grad.addColorStop(0.18, `rgba(125, 30, 170, ${opacity * 0.45})`);    // Deep cursed purple halo
  grad.addColorStop(0.40, `rgba(65, 10, 95, ${opacity * 0.30})`);      // Dark violet ring
  grad.addColorStop(0.70, `rgba(28, 4, 40, ${opacity * 0.15})`);       // Deep soul fade
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');                           // Outer boundary

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Clear arena interior with subtle edge vignette so woven hands artwork is 100% visible
  if (mahitoFighter && (mahitoFighter.domainActive || mahitoFighter._mahitoDomainActive)) {
    applyDomainArenaVignetteCutout(ctx);
  }

  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(24, 3, 32, ${opacity * 0.95})`;
}

let currentTojiUltimateOpacity = 0;
let currentSaitamaSeriousPunchOpacity = 0;
let currentHollowMaskOpacity = 0;
let flyHeads = [];
let seriousPunchImg = null;
let seriousPunchImgLoading = false;
let hollowMaskOverlayImg = null;
let hollowMaskOverlayImgLoading = false;

function loadSeriousPunchImage() {
  if (seriousPunchImg || seriousPunchImgLoading) return;
  seriousPunchImgLoading = true;
  seriousPunchImg = new Image();
  seriousPunchImg.onload = () => {
    seriousPunchImgLoading = false;
  };
  seriousPunchImg.onerror = (e) => {
    console.error("Failed to load serious punch image:", e);
    seriousPunchImgLoading = false;
    seriousPunchImg = null;
  };
  seriousPunchImg.src = 'Assets/Overlays/serious-punch.png';
}

function loadHollowMaskOverlayImage() {
  if (hollowMaskOverlayImg || hollowMaskOverlayImgLoading) return;
  hollowMaskOverlayImgLoading = true;
  hollowMaskOverlayImg = new Image();
  hollowMaskOverlayImg.onload = () => {
    hollowMaskOverlayImgLoading = false;
  };
  hollowMaskOverlayImg.onerror = (e) => {
    console.error("Failed to load Hollow Mask overlay image:", e);
    hollowMaskOverlayImgLoading = false;
    hollowMaskOverlayImg = null;
  };
  hollowMaskOverlayImg.src = 'Assets/references/Hollow Mask.png';
}

export function drawTojiUltimateOverlay() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
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
        size: 5 + Math.random() * 10
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

  // ── SPOTLIGHT HIGHLIGHTS: Illuminates Toji and the Target through the dark ultimate overlay ──
  if (toji) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // 1. Toji Cinematic Spotlight / Ethereal Backlight
    const tojiZoom = (state.camera && state.camera.enabled && state.camera.mode === 'dynamic') ? (state.camera.zoom || 1.0) : 1.0;
    const tojiScreen = worldToScreen(toji.x, toji.y - (toji.z || 0));
    const tojiScreenX = tojiScreen.x;
    const tojiScreenY = tojiScreen.y;
    const tojiSpotR = (toji.r || 25) * 5.0 * tojiZoom; // ~125px radius bloom
    const tojiGrad = ctx.createRadialGradient(tojiScreenX, tojiScreenY, 10 * tojiZoom, tojiScreenX, tojiScreenY, tojiSpotR);
    tojiGrad.addColorStop(0,    'rgba(215, 140, 255, 0.85)'); // Electric Violet Core
    tojiGrad.addColorStop(0.30, 'rgba(160, 48, 255, 0.55)');
    tojiGrad.addColorStop(0.65, 'rgba(100, 20, 180, 0.25)');
    tojiGrad.addColorStop(1.0,  'rgba(0, 0, 0, 0)');
    ctx.fillStyle = tojiGrad;
    ctx.beginPath();
    ctx.arc(tojiScreenX, tojiScreenY, tojiSpotR, 0, Math.PI * 2);
    ctx.fill();

    // 2. Target Cinematic Threat Spotlight (The Enemy)
    const target = toji.ultimateTarget;
    if (target && target.hp > 0) {
      const targetScreen = worldToScreen(target.x, target.y - (target.z || 0));
      const targetScreenX = targetScreen.x;
      const targetScreenY = targetScreen.y;
      const targetSpotR = (target.r || 25) * 5.0 * tojiZoom; // ~125px radius bloom
      const targetGrad = ctx.createRadialGradient(targetScreenX, targetScreenY, 10 * tojiZoom, targetScreenX, targetScreenY, targetSpotR);
      targetGrad.addColorStop(0,    'rgba(255, 90, 130, 0.85)'); // Radiant Crimson Core
      targetGrad.addColorStop(0.30, 'rgba(255, 30, 86, 0.55)');
      targetGrad.addColorStop(0.65, 'rgba(180, 15, 50, 0.25)');
      targetGrad.addColorStop(1.0,  'rgba(0, 0, 0, 0)');
      ctx.fillStyle = targetGrad;
      ctx.beginPath();
      ctx.arc(targetScreenX, targetScreenY, targetSpotR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  if (CONFIG.mahoraga?.enableGoldenScreenDim === false) return;

  const { ctx, canvas, arena } = state;
  const mahoraga = state.fighters?.find(f => f && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga')) && (f.wheelClickTimer > 0 || f.adaptationPauseTimer > 0));
  if (!mahoraga) return;

  const timer = (mahoraga.adaptationPauseTimer && mahoraga.adaptationPauseTimer > 0) ? mahoraga.adaptationPauseTimer : mahoraga.wheelClickTimer;
  const clickMax = mahoraga.adaptationPauseMax || mahoraga.wheelClickMax || CONFIG.mahoraga?.wheelClickDuration || 25;
  const rawProgress = (clickMax - timer) / clickMax;
  const progress = Math.min(1.0, Math.max(0.0, rawProgress));
  const maxOpacity = CONFIG.mahoraga?.goldenDimOpacity ?? 0.85;
  const opacity = Math.sin(progress * Math.PI) * maxOpacity;

  if (opacity <= 0.01) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const screenMaho = worldToScreen(mahoraga.x, mahoraga.y - mahoraga.r - 28);
  const drawX = screenMaho.x;
  const wheelY = screenMaho.y;
  const maxRadius = Math.max(arena.width, arena.height) * 0.70;
  const grad = ctx.createRadialGradient(
    drawX, wheelY, 15,
    drawX, wheelY, maxRadius
  );
  grad.addColorStop(0, `rgba(255, 215, 0, ${opacity * 0.55})`);
  grad.addColorStop(0.20, `rgba(218, 165, 32, ${opacity * 0.48})`);
  grad.addColorStop(0.50, `rgba(130, 85, 12, ${opacity * 0.72})`);
  grad.addColorStop(0.80, `rgba(45, 28, 5, ${opacity * 0.88})`);
  grad.addColorStop(1.0, `rgba(18, 10, 2, ${opacity * 0.95})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(18, 10, 2, ${opacity * 0.95})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nanami Classic Graphic Paint Splatter
// ─────────────────────────────────────────────────────────────────────────────
const _SPLATTER_CORE_CIRCLES = [
  { x: 0, y: 0, r: 22 }, { x: -8, y: -12, r: 16 }, { x: 12, y: -6, r: 18 },
  { x: 5, y: 15, r: 15 }, { x: -14, y: 8, r: 14 }, { x: -18, y: -5, r: 12 },
  { x: 18, y: 12, r: 14 }, { x: 20, y: -18, r: 12 }, { x: -10, y: 22, r: 10 },
  { x: 15, y: 20, r: 9 }, { x: 0, y: -22, r: 13 }, { x: -22, y: 12, r: 9 }
];

const _SPLATTER_STREAKS = [
  { x1: 15, y1: -15, x2: 22, y2: -8, tipX: 95, tipY: -55 },
  { x1: -15, y1: -10, x2: -8, y2: -18, tipX: -75, tipY: -65 },
  { x1: -20, y1: 0, x2: -15, y2: 15, tipX: -55, tipY: 10 },
  { x1: -15, y1: 15, x2: -5, y2: 20, tipX: -30, tipY: 45 },
  { x1: 5, y1: 20, x2: 15, y2: 15, tipX: 10, tipY: 60, bulbR: 6 },
  { x1: 15, y1: 10, x2: 22, y2: 5, tipX: 60, tipY: 25 },
  { x1: -5, y1: -20, x2: 5, y2: -20, tipX: -2, tipY: -45 },
  { x1: 20, y1: -5, x2: 20, y2: 5, tipX: 45, tipY: -10 },
  { x1: -20, y1: -15, x2: -15, y2: -10, tipX: -45, tipY: -25 }
];

const _SPLATTER_DOTS = [
  { x: -55, y: -15, r: 3.5 },
  { x: 85, y: 10, r: 4 },
  { x: -45, y: 65, r: 5 },
  { x: -65, y: 68, r: 2.5 },
  { x: -85, y: 35, r: 2 },
  { x: 35, y: 55, r: 2.5 },
  { x: -20, y: -75, r: 3 },
  { x: 65, y: -45, r: 2 },
  { x: 45, y: -70, r: 2.5 }
];

function _drawPaintSplatter(ctx, cx, cy, scale = 1.0, color = '#E50018', bgDark = '#78000A') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  function _pixCircle(cx, cy, rad, fillColor) {
    const gridR = Math.ceil(rad / P);
    for (let gy = -gridR; gy <= gridR; gy++) {
      for (let gx = -gridR; gx <= gridR; gx++) {
        const dist = Math.sqrt(gx * gx + gy * gy) * P;
        if (dist > rad + P * 0.25) continue;
        const px = snap(cx + gx * P);
        const py = snap(cy + gy * P);
        ctx.fillStyle = fillColor;
        ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
      }
    }
  }

  function _pixStreak(x1, y1, tipX, tipY, x2, y2, fillColor) {
    const minX = Math.min(x1, tipX, x2);
    const maxX = Math.max(x1, tipX, x2);
    const minY = Math.min(y1, tipY, y2);
    const maxY = Math.max(y1, tipY, y2);

    const startX = snap(minX - P);
    const endX = snap(maxX + P);
    const startY = snap(minY - P);
    const endY = snap(maxY + P);

    function _inTri(px, py) {
      const d1 = (px - tipX) * (y1 - tipY) - (x1 - tipX) * (py - tipY);
      const d2 = (px - x2) * (tipY - y2) - (tipX - x2) * (py - y2);
      const d3 = (px - x1) * (y2 - y1) - (x2 - x1) * (py - y1);
      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      return !(hasNeg && hasPos);
    }

    ctx.fillStyle = fillColor;
    for (let py = startY; py <= endY; py += P) {
      for (let px = startX; px <= endX; px += P) {
        if (_inTri(px, py)) {
          ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
        }
      }
    }
  }

  function drawPixelInkSplat(fillColor, scaleMult = 1.0) {
    ctx.save();
    if (scaleMult !== 1.0) {
      ctx.scale(scaleMult, scaleMult);
    }

    for (let i = 0; i < _SPLATTER_CORE_CIRCLES.length; i++) {
      const d = _SPLATTER_CORE_CIRCLES[i];
      _pixCircle(d.x, d.y, d.r, fillColor);
    }

    for (let i = 0; i < _SPLATTER_STREAKS.length; i++) {
      const s = _SPLATTER_STREAKS[i];
      _pixStreak(s.x1, s.y1, s.tipX, s.tipY, s.x2, s.y2, fillColor);
      if (s.bulbR) {
        _pixCircle(s.tipX, s.tipY, s.bulbR, fillColor);
      }
    }

    for (let i = 0; i < _SPLATTER_DOTS.length; i++) {
      const d = _SPLATTER_DOTS[i];
      _pixCircle(d.x, d.y, d.r, fillColor);
    }

    ctx.restore();
  }

  drawPixelInkSplat(bgDark, 1.14);
  drawPixelInkSplat(color, 1.0);

  ctx.fillStyle = 'rgba(255, 175, 185, 0.92)';
  ctx.fillRect(snap(-6), snap(-12), P * 2, P);
  ctx.fillRect(snap(6), snap(-8), P * 2, P);
  ctx.fillRect(snap(-14), snap(4), P, P * 2);
  ctx.fillRect(snap(10), snap(8), P * 2, P);
  ctx.fillRect(snap(-2), snap(16), P * 2, P);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(-4), snap(-10), P, P);
  ctx.fillRect(snap(8), snap(-6), P, P);

  ctx.restore();
}

/**
 * Draws a high-contrast 7:3 Ratio ruler and graphic paint splatter overlay when Nanami lands a 7:3 Ratio Crit.
 */
export function drawNanamiRatioCritDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  if (CONFIG.nanami?.enableRatioDimScreen === false) return;

  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const nanami = state.fighters?.find(f => f && (f.characterId === 'nanami' || f.type === 'nanami' || f._def?.id === 'nanami') && (f.ratioHitPauseTimer || 0) > 0);
  if (!nanami) return;

  const timer = nanami.ratioHitPauseTimer || 0;
  const maxTimer = nanami.ratioHitPauseMax || CONFIG.nanami?.ratioCritHitPauseFrames || 35;
  const rawProgress = Math.min(1.0, Math.max(0.0, (maxTimer - timer) / maxTimer));
  const maxOpacity = CONFIG.nanami?.ratioDimOpacity ?? 0.94;
  const opacity = Math.sin(rawProgress * Math.PI) * maxOpacity;

  if (opacity <= 0.01) return;

  // 1. Full Screen Cinematic Black Background
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(3, 3, 6, ${opacity * 0.96})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 2. Tilted 7:3 Measurement Ruler & Graphic Paint Splatter Overlay
  if (CONFIG.nanami?.enableRatioRulerOverlay !== false) {
    const target = nanami.ratioHitPauseTarget || nanami._chopTarget;
    const impactX = target ? target.x : (nanami.x + Math.cos(nanami.gunAngle || 0) * (nanami.r + 30));
    const impactY = target ? target.y : (nanami.y + Math.sin(nanami.gunAngle || 0) * (nanami.r + 30));

    const baseAngle = nanami.gunAngle || 0;
    const targetAngle = baseAngle - 0.20;

    const spinP = Math.min(1.0, rawProgress / 0.30);
    const easeSpin = 1.0 - Math.pow(1.0 - spinP, 3.0);
    const currentAngle = targetAngle + (1.0 - easeSpin) * (Math.PI * 2);
    const rulerScale = 0.10 + 0.90 * easeSpin;

    const screenImpact = worldToScreen(impactX, impactY);
    ctx.save();
    ctx.translate(screenImpact.x, screenImpact.y);
    ctx.rotate(currentAngle);
    ctx.scale(rulerScale, rulerScale);

    const rulerLength = 360;
    const halfL = rulerLength * 0.5;
    const step = rulerLength / 10;
    const alpha = Math.sin(rawProgress * Math.PI);

    const P = 2.0;
    const snap = (v) => Math.round(v / P) * P;

    function _rulerPixLine(x0, y0, x1, y1, color, thickness) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(2, Math.ceil(len / P));
      const halfT = Math.max(P * 0.5, (thickness || P) * 0.5);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = snap(x0 + dx * t);
        const py = snap(y0 + dy * t);
        ctx.fillStyle = color;
        ctx.fillRect(px - halfT, py - halfT, halfT * 2, halfT * 2);
      }
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1.0, alpha * 1.1);

    _rulerPixLine(-halfL - 2, 0, halfL + 2, 0, '#000000', 8.0);
    _rulerPixLine(-halfL, 0, halfL, 0, '#FFFFFF', 4.0);
    _rulerPixLine(-halfL + 4, 0, halfL - 4, 0, '#FEF9C3', 2.0);

    for (let k = 0; k <= 10; k++) {
      const tx = snap(-halfL + k * step);
      if (k === 0 || k === 10) {
        _rulerPixLine(tx, -20, tx, 20, '#000000', 9.0);
        _rulerPixLine(tx, -18, tx, 18, '#FFFFFF', 5.0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(tx - P * 2, snap(-18) - P * 0.5, P * 4, P);
        ctx.fillRect(tx - P * 2, snap(18) - P * 0.5, P * 4, P);
      } else if (k === 7) {
        _rulerPixLine(tx, -20, tx, 20, '#4A0005', 9.0);
        _rulerPixLine(tx, -18, tx, 18, '#FF1E27', 6.0);
        _rulerPixLine(tx, -15, tx, 15, '#FFFFFF', 2.0);

        ctx.fillStyle = '#FF1E27';
        ctx.fillRect(tx - P * 3, snap(-P), P, P * 2);
        ctx.fillRect(tx + P * 2, snap(-P), P, P * 2);
        ctx.fillRect(snap(tx - P), -P * 3, P * 2, P);
        ctx.fillRect(snap(tx - P), P * 2, P * 2, P);
      } else {
        const tickH = (k === 5) ? 14 : 10;
        _rulerPixLine(tx, -tickH - 2, tx, tickH + 2, '#000000', 6.0);
        _rulerPixLine(tx, -tickH, tx, tickH, '#FFFFFF', 3.2);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(tx - P * 0.5, snap(-tickH) - P * 0.5, P, P);
        ctx.fillRect(tx - P * 0.5, snap(tickH) - P * 0.5, P, P);
      }
    }
    ctx.restore();

    const ruptureX = -halfL + 7 * step;
    if (rawProgress >= 0.30) {
      const snapP = Math.min(1.0, (rawProgress - 0.30) / 0.70);
      const dropT = Math.min(1.0, snapP / 0.08);
      const dropY = -25 * (1.0 - dropT);
      const impactScale = 1.0 + 0.06 * (1.0 - dropT);

      ctx.save();
      ctx.globalAlpha = Math.min(1.0, alpha * 1.35);
      _drawPaintSplatter(ctx, ruptureX, dropY, impactScale * 1.15, '#E50018', '#78000A');
      ctx.restore();
    }

    ctx.restore();
  }

  state.globalDimEdgeColor = `rgba(0, 0, 0, ${opacity * 0.98})`;
}

let currentMahoLevel8DimOpacity = 0;

export function drawMahoragaLevel8DimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const isPlaying = state.gameState === 'playing';
  const mahoraga = state.fighters?.find(f => {
    if (!f || f.hp <= 0) return false;
    const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
    return totalStages >= 8 || f.isMaxAdapted || f.isInfinityBlitz || (f.goldStages >= 8);
  });

  const shouldDim = isPlaying && !!mahoraga;
  const targetOpacity = shouldDim ? 1.0 : 0.0;

  currentMahoLevel8DimOpacity += (targetOpacity - currentMahoLevel8DimOpacity) * 0.035;

  if (currentMahoLevel8DimOpacity <= 0.005) {
    currentMahoLevel8DimOpacity = 0;
    return;
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const activeMaho = mahoraga || state.fighters?.find(f => f && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga')));
  let sumX = 0, sumY = 0, targetCount = 0;
  let maxTargetDist = 80;

  if (activeMaho) {
    sumX += activeMaho.x;
    sumY += activeMaho.y;
    targetCount++;
  }
  if (state.fighters) {
    for (let i = 0; i < state.fighters.length; i++) {
      const f = state.fighters[i];
      if (f && f !== activeMaho && f.hp > 0) {
        sumX += f.x;
        sumY += f.y;
        targetCount++;
        if (f.rika && f.rika.active && !f.rika.isDying) {
          sumX += f.rika.x;
          sumY += f.rika.y;
          targetCount++;
        }
      }
    }
  }
  if (state.illusions) {
    for (let i = 0; i < state.illusions.length; i++) {
      const ill = state.illusions[i];
      if (ill && ill.hp > 0) {
        sumX += ill.x;
        sumY += ill.y;
        targetCount++;
      }
    }
  }

  let cx = canvas.width / 2;
  let cy = canvas.height / 2;
  if (targetCount > 0) {
    cx = sumX / targetCount;
    cy = sumY / targetCount;

    if (activeMaho) {
      const d = Math.hypot(activeMaho.x - cx, activeMaho.y - cy);
      if (d > maxTargetDist) maxTargetDist = d;
    }
    if (state.fighters) {
      for (let i = 0; i < state.fighters.length; i++) {
        const f = state.fighters[i];
        if (f && f !== activeMaho && f.hp > 0) {
          const d = Math.hypot(f.x - cx, f.y - cy);
          if (d > maxTargetDist) maxTargetDist = d;
        }
      }
    }
  }

  const screenMahoC = worldToScreen(cx, cy);
  const drawX = screenMahoC.x;
  const drawY = screenMahoC.y;
  const spotlightInnerR = Math.max(140, Math.min(480, maxTargetDist + 80));
  const maxRadius = Math.max(arena.width, arena.height) * 1.15;

  const grad = ctx.createRadialGradient(
    drawX, drawY, spotlightInnerR * 0.4,
    drawX, drawY, maxRadius
  );
  
  const time = Date.now() * 0.0015;
  const pulse = Math.sin(time) * 0.04;
  const baseDimOpacity = 0.88 * currentMahoLevel8DimOpacity;
  const opacity = baseDimOpacity + pulse * currentMahoLevel8DimOpacity;
  
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
  grad.addColorStop(Math.min(0.65, (spotlightInnerR / maxRadius)), `rgba(14, 8, 2, ${opacity * 0.35})`);
  grad.addColorStop(0.8, `rgba(6, 3, 1, ${opacity * 0.88})`);
  grad.addColorStop(1.0, `rgba(0, 0, 0, ${opacity * 0.99})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (activeMaho) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    const pulseScale = 1.0 + Math.sin(Date.now() * 0.003) * 0.08;

    const screenWheel = worldToScreen(activeMaho.x, activeMaho.y - activeMaho.r - 28);
    const wheelX = screenWheel.x;
    const wheelY = screenWheel.y;
    const wheelR = 85 * pulseScale;
    const wheelGlow = ctx.createRadialGradient(wheelX, wheelY, 5, wheelX, wheelY, wheelR);
    wheelGlow.addColorStop(0, `rgba(255, 215, 0, ${0.35 * currentMahoLevel8DimOpacity})`);
    wheelGlow.addColorStop(0.3, `rgba(255, 179, 0, ${0.15 * currentMahoLevel8DimOpacity})`);
    wheelGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = wheelGlow;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.fill();

    const swordAngle = activeMaho.gunAngle !== undefined ? activeMaho.gunAngle : 0;
    const swordDist = activeMaho.r + 30;
    const screenSword = worldToScreen(activeMaho.x + Math.cos(swordAngle) * swordDist, activeMaho.y + Math.sin(swordAngle) * swordDist);
    const swordX = screenSword.x;
    const swordY = screenSword.y;
    const swordR = 110 * pulseScale;

    const swordGlow = ctx.createRadialGradient(swordX, swordY, 10, swordX, swordY, swordR);
    swordGlow.addColorStop(0, `rgba(255, 235, 59, ${0.30 * currentMahoLevel8DimOpacity})`);
    swordGlow.addColorStop(0.4, `rgba(255, 152, 0, ${0.12 * currentMahoLevel8DimOpacity})`);
    swordGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = swordGlow;
    ctx.beginPath();
    ctx.arc(swordX, swordY, swordR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

export function drawSaitamaSeriousPunchDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const saitama = state.fighters?.find(f => f && (f.type === 'saitama' || f.characterId === 'saitama' || f._def?.id === 'saitama') && f._counterPunchTimer > 0);

  if (!seriousPunchImg && !seriousPunchImgLoading) {
    loadSeriousPunchImage();
  }

  if (!saitama) {
    currentSaitamaSeriousPunchOpacity = 0;
    if (typeof state !== 'undefined') state._saitamaSeriousPunchOpacity = 0;
    return;
  }

  const targetOpacity = 0.98;
  const totalTime = (CONFIG.saitama?.counterPunchPoseFrames ?? 90) + (CONFIG.saitama?.counterTeleportIdleFrames ?? 30);
  const progress = Math.min(1.0, Math.max(0.0, 1.0 - (saitama._counterPunchTimer / totalTime)));

  if (targetOpacity > currentSaitamaSeriousPunchOpacity) {
    currentSaitamaSeriousPunchOpacity += (targetOpacity - currentSaitamaSeriousPunchOpacity) * 0.25;
  } else {
    currentSaitamaSeriousPunchOpacity = targetOpacity;
  }
  if (typeof state !== 'undefined') state._saitamaSeriousPunchOpacity = currentSaitamaSeriousPunchOpacity;

  if (currentSaitamaSeriousPunchOpacity < 0.01) {
    currentSaitamaSeriousPunchOpacity = 0;
    if (typeof state !== 'undefined') state._saitamaSeriousPunchOpacity = 0;
    return;
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = currentSaitamaSeriousPunchOpacity;

  const worldCx = arena.x + arena.width / 2;
  const worldCy = arena.y + arena.height / 2;
  const screenCenter = worldToScreen(worldCx, worldCy);
  const cx = screenCenter.x;
  const cy = screenCenter.y;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.99)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glowGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(canvas.width, canvas.height) * 0.45);
  glowGrad.addColorStop(0, 'rgba(255, 10, 10, 0.35)');
  glowGrad.addColorStop(0.5, 'rgba(120, 0, 0, 0.12)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(canvas.width, canvas.height) * 0.45, 0, Math.PI * 2);
  ctx.fill();

  const now = Date.now();
  ctx.fillStyle = 'rgba(255, 30, 30, 0.22)';
  const numLines = 24;
  for (let i = 0; i < numLines; i++) {
    const angle = (i / numLines) * Math.PI * 2;
    for (let j = 0; j < 2; j++) {
      const shift = j * 160;
      const travel = ((now * 0.45 + i * 55 + shift) % 320);
      const startDist = 120 + travel;
      const endDist = startDist + 90 + Math.sin(i * 11) * 35;
      
      const wStart = 0.007;
      const wEnd = 0.002;
      
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle - wStart) * startDist, cy + Math.sin(angle - wStart) * startDist);
      ctx.lineTo(cx + Math.cos(angle - wEnd) * endDist, cy + Math.sin(angle - wEnd) * endDist);
      ctx.lineTo(cx + Math.cos(angle + wEnd) * endDist, cy + Math.sin(angle + wEnd) * endDist);
      ctx.lineTo(cx + Math.cos(angle + wStart) * startDist, cy + Math.sin(angle + wStart) * startDist);
      ctx.closePath();
      ctx.fill();
    }
  }

  const poseFrames = CONFIG.saitama?.counterPunchPoseFrames ?? 90;
  if (saitama._counterPunchTimer <= poseFrames) {
    const punchProgress = (poseFrames - saitama._counterPunchTimer) / poseFrames;
    const scale = 0.90 + Math.pow(punchProgress, 1.5) * 0.40;
    const shakeIntensity = 8 * punchProgress;
    const fistX = cx + (Math.random() - 0.5) * shakeIntensity;
    const fistY = cy + (Math.random() - 0.5) * shakeIntensity;
    
    ctx.save();
    ctx.translate(fistX, fistY);
    ctx.scale(scale, scale);
    
    const fistFade = Math.min(1.0, punchProgress * 4.0);
    ctx.globalAlpha = Math.min(0.45, currentSaitamaSeriousPunchOpacity * 0.45) * fistFade;
    
    if (seriousPunchImg && seriousPunchImg.complete && seriousPunchImg.naturalWidth > 0) {
      const targetWidth = canvas.width * 0.70;
      const imgScale = targetWidth / seriousPunchImg.naturalWidth;
      
      ctx.save();
      ctx.scale(imgScale, imgScale);
      ctx.drawImage(seriousPunchImg, -seriousPunchImg.naturalWidth / 2, -seriousPunchImg.naturalHeight / 2);
      ctx.restore();
    } else {
      _drawSeriousRedFist(ctx, punchProgress);
    }
    
    ctx.restore();
  }

  ctx.restore();
}

function _pathHandShape(ctx) {
  ctx.beginPath();
  ctx.moveTo(-110, 190);
  ctx.bezierCurveTo(-160, 110, -170, 20, -145, -45);
  ctx.bezierCurveTo(-135, -85, -100, -95, -80, -85);
  ctx.bezierCurveTo(-60, -100, -30, -100, -10, -90);
  ctx.bezierCurveTo(10, -105, 45, -105, 65, -85);
  ctx.bezierCurveTo(85, -75, 115, -65, 125, -25);
  ctx.bezierCurveTo(135, 15, 125, 110, 95, 190);
  ctx.closePath();
}

function _drawSeriousRedFist(ctx, progress) {
  ctx.save();
  ctx.rotate(-0.12);

  const now = Date.now();

  ctx.save();
  const numFlares = 80;
  for (let i = 0; i < numFlares; i++) {
    const angle = (i / numFlares) * Math.PI * 2 + (now / 200);
    const rBase = 120 + Math.sin(angle * 7 + now / 80) * 15;
    const length = 35 + Math.sin(angle * 13 + now / 40) * 45;
    
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 30, 30, 0.6)';
    ctx.lineWidth = i % 2 === 0 ? 1.5 : 3.5;
    
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * rBase, Math.sin(angle) * rBase);
    ctx.lineTo(Math.cos(angle) * (rBase + length), Math.sin(angle) * (rBase + length));
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.scale(1.25, 1.25);
  _pathHandShape(ctx);
  ctx.fillStyle = 'rgba(255, 0, 0, 0.10)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.scale(1.15, 1.15);
  _pathHandShape(ctx);
  ctx.fillStyle = 'rgba(255, 20, 20, 0.20)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.scale(1.06, 1.06);
  _pathHandShape(ctx);
  ctx.fillStyle = 'rgba(255, 50, 50, 0.35)';
  ctx.fill();
  ctx.restore();

  const fistGrad = ctx.createRadialGradient(-5, -15, 10, -5, -15, 150);
  fistGrad.addColorStop(0, '#ffffff');
  fistGrad.addColorStop(0.2, '#ffaaaa');
  fistGrad.addColorStop(0.45, '#ff232d');
  fistGrad.addColorStop(0.8, '#8a0002');
  fistGrad.addColorStop(1.0, '#260001');
  ctx.fillStyle = fistGrad;
  _pathHandShape(ctx);
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 11;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  _pathHandShape(ctx);
  ctx.stroke();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 9;
  
  ctx.beginPath();
  ctx.moveTo(-80, -85);
  ctx.bezierCurveTo(-85, -20, -75, 40, -65, 75);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-10, -90);
  ctx.bezierCurveTo(-15, -25, -5, 35, 5, 80);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(65, -85);
  ctx.bezierCurveTo(55, -20, 50, 40, 55, 70);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 3.5;
  
  ctx.beginPath();
  ctx.moveTo(-75, -75);
  ctx.bezierCurveTo(-80, -20, -70, 40, -60, 65);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-5, -80);
  ctx.bezierCurveTo(-10, -25, 0, 35, 10, 70);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(70, -75);
  ctx.bezierCurveTo(60, -20, 55, 40, 60, 60);
  ctx.stroke();

  ctx.save();
  ctx.translate(-25, 75);
  ctx.rotate(Math.PI * 0.05);

  ctx.beginPath();
  ctx.moveTo(-80, 0);
  ctx.bezierCurveTo(-50, 35, 20, 35, 60, 10);
  ctx.bezierCurveTo(90, -5, 100, -25, 95, -45);
  ctx.bezierCurveTo(70, -20, 20, -10, -30, -10);
  ctx.bezierCurveTo(-60, -10, -75, -10, -80, 0);
  ctx.closePath();

  const thumbGrad = ctx.createLinearGradient(-80, 0, 80, 0);
  thumbGrad.addColorStop(0, '#2b0000');
  thumbGrad.addColorStop(0.4, '#8a0002');
  thumbGrad.addColorStop(0.8, '#ff232d');
  thumbGrad.addColorStop(1.0, '#ffffff');
  ctx.fillStyle = thumbGrad;
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 9;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-60, 5);
  ctx.bezierCurveTo(-20, 15, 30, 15, 65, 0);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = '#000000';
  
  ctx.beginPath();
  ctx.moveTo(-70, 110);
  ctx.lineTo(-50, 185);
  ctx.lineTo(-75, 185);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 95);
  ctx.lineTo(5, 188);
  ctx.lineTo(-10, 188);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(50, 115);
  ctx.lineTo(55, 185);
  ctx.lineTo(40, 185);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

let _bankaiInwardSeeds = null;
function _initBankaiInwardSeeds() {
  _bankaiInwardSeeds = [];
  const count = 36;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 1.7) * 0.12);
    const startDist = 380 + (i % 7) * 45;
    const len = 70 + (i % 5) * 30;
    const maxThick = 1.6 + (i % 3) * 0.8;
    const speed = 1.8 + (i % 4) * 0.5;
    const phase = (i * 17) % 100;
    let color;
    if (i % 4 === 0) color = '#DC143C';
    else if (i % 4 === 1) color = '#00E5FF';
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)';
    else color = 'rgba(15, 8, 20, 0.95)';

    _bankaiInwardSeeds.push({ angle, startDist, len, maxThick, speed, phase, color });
  }
}

let _bankaiBurstSeeds = null;
function _initBankaiBurstSeeds() {
  _bankaiBurstSeeds = [];
  const count = 48;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 2.3) * 0.08);
    const len = 90 + (i % 6) * 40;
    const maxThick = 1.8 + (i % 4) * 0.9;
    const speed = 2.4 + (i % 3) * 0.8;
    const phase = (i * 23) % 100;
    let color;
    if (i % 4 === 0) color = '#DC143C';
    else if (i % 4 === 1) color = '#FF3214';
    else if (i % 4 === 2) color = '#FFFFFF';
    else color = 'rgba(10, 4, 15, 0.95)';

    _bankaiBurstSeeds.push({ angle, len, maxThick, speed, phase, color });
  }
}

export function drawBankaiImpactDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const ichigo = state.fighters?.find(f => 
    f && f.hp > 0 && !f.isRespawning && (f.characterId === 'ichigo' || f.type === 'ichigo') && (
      f.isChannelingBankai || 
      (f.bankaiBurstTimer && f.bankaiBurstTimer > 0) ||
      (f.hollowMaskFormationTimer && f.hollowMaskFormationTimer > 0) ||
      (f.hollowBurstTimer && f.hollowBurstTimer > 0)
    )
  );

  const isBankaiChannelingOrBursting = Boolean(
    ichigo && (
      ichigo.isChannelingBankai ||
      (ichigo.bankaiChargeTimer && ichigo.bankaiChargeTimer > 0) ||
      (ichigo.bankaiBurstTimer && ichigo.bankaiBurstTimer > 0)
    )
  );

  if (isBankaiChannelingOrBursting) {
    currentHollowMaskOpacity = 0;
  }

  const isHollowChanneling = !isBankaiChannelingOrBursting && Boolean(
    ichigo && ((ichigo.hollowMaskFormationTimer && ichigo.hollowMaskFormationTimer > 0) || ichigo._hollowVoicelineWait)
  );

  if (isHollowChanneling) {
    if (!hollowMaskOverlayImg && !hollowMaskOverlayImgLoading) {
      loadHollowMaskOverlayImage();
    }
    const maxH = ichigo.hollowMaskFormationMax || CONFIG.ichigo?.hollowMaskFormationFrames || 325;
    const formProg = Math.min(1.0, Math.max(0.0, 1.0 - (ichigo.hollowMaskFormationTimer / maxH)));
    const targetAlpha = Math.min(0.20, formProg * 0.35);
    currentHollowMaskOpacity += (targetAlpha - currentHollowMaskOpacity) * 0.08;
  } else {
    currentHollowMaskOpacity = Math.max(0, currentHollowMaskOpacity - 0.045);
  }

  if (!ichigo && currentHollowMaskOpacity <= 0.01) return;

  const isFrozen = Boolean(
    ichigo && (
      ichigo.isFrozenByInfinity ||
      (ichigo.timeStopTimer && ichigo.timeStopTimer > 0) ||
      (ichigo.statusEffects && ichigo.statusEffects.timeStopTimer > 0) ||
      (ichigo.electricStunTimer && ichigo.electricStunTimer > 0) ||
      (ichigo.paralyzeTimer && ichigo.paralyzeTimer > 0) ||
      (ichigo.hitStunTimer && ichigo.hitStunTimer > 0) ||
      ichigo.isParalyzed ||
      ichigo.isGrabbedByMahoraga ||
      ichigo.isParalyzedByMahoraga ||
      ichigo.isWallSlammed ||
      ichigo.wallSlamPinnedX !== undefined ||
      ichigo.isTargetOfAmbush
    )
  );
  if (isFrozen) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const worldCxB = ichigo ? ichigo.x : (arena.x || 0) + (arena.width || 800) / 2;
  const worldCyB = ichigo ? ichigo.y : (arena.y || 0) + (arena.height || 600) / 2;
  const screenB = worldToScreen(worldCxB, worldCyB);
  const cx = screenB.x;
  const cy = screenB.y;
  const r = ichigo ? (ichigo.r || 25) : 25;

  let isChanneling = Boolean(ichigo && ichigo.isChannelingBankai && ichigo.bankaiChargeTimer > 0);
  let isBursting = Boolean(ichigo && ichigo.bankaiBurstTimer && ichigo.bankaiBurstTimer > 0);
  let isHollow = !isChanneling && !isBursting && Boolean(
    (ichigo && ichigo.hollowMaskFormationTimer && ichigo.hollowMaskFormationTimer > 0) ||
    (ichigo && ichigo.hollowBurstTimer && ichigo.hollowBurstTimer > 0) ||
    currentHollowMaskOpacity > 0.01
  );

  let opacity = 0;
  let bankaiProg = 0;
  let burstProg = 0;

  if (isChanneling) {
    const maxB = ichigo.bankaiChargeMax || CONFIG.ichigo?.bankaiChargeFrames || 66;
    const curB = ichigo.bankaiChargeTimer || 0;
    bankaiProg = Math.min(1.0, Math.max(0.0, 1.0 - (curB / maxB)));

    if (bankaiProg < 0.70) {
      opacity = Math.min(0.88, bankaiProg * 1.30);
    } else {
      const compP = (bankaiProg - 0.70) / 0.30;
      opacity = 0.88 + compP * 0.08 + Math.sin(now * 0.04) * 0.03;
    }
  } else if (isBursting) {
    const burstMax = ichigo.bankaiBurstMax || CONFIG.ichigo?.bankaiBurstFrames || 36;
    burstProg = 1.0 - (ichigo.bankaiBurstTimer / burstMax);
    opacity = Math.pow(1.0 - burstProg, 1.3) * 0.92;
  } else if (isHollow) {
    if (ichigo && ichigo.hollowMaskFormationTimer !== undefined && ichigo.hollowMaskFormationTimer > 0) {
      const maxH = ichigo.hollowMaskFormationMax || CONFIG.ichigo?.hollowMaskFormationFrames || 325;
      const formProg = Math.min(1.0, Math.max(0.0, 1.0 - (ichigo.hollowMaskFormationTimer / maxH)));
      opacity = Math.min(0.90, formProg * 1.25);
    } else if (ichigo && ichigo.hollowBurstTimer !== undefined && ichigo.hollowBurstTimer > 0) {
      const maxB = ichigo.hollowBurstMax || CONFIG.ichigo?.hollowBurstFrames || 36;
      burstProg = Math.min(1.0, Math.max(0.0, 1.0 - ((ichigo.hollowBurstTimer || 0) / maxB)));
      opacity = Math.pow(1.0 - burstProg, 1.3) * 0.90;
    } else {
      opacity = currentHollowMaskOpacity;
    }
  }

  if (opacity <= 0.01 && currentHollowMaskOpacity <= 0.01) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (isBursting && burstProg < 0.10) {
    const flashAlpha = Math.pow(1.0 - (burstProg / 0.10), 1.5) * 0.95;
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const maxR = Math.max(canvas.width, canvas.height) * 0.95;
  const grad = ctx.createRadialGradient(cx, cy, r * 1.2, cx, cy, maxR);
  if (isHollow) {
    grad.addColorStop(0.0, 'rgba(15, 0, 3, 0.0)');
    grad.addColorStop(0.25, `rgba(20, 2, 5, ${(opacity * 0.45).toFixed(3)})`);
    grad.addColorStop(0.65, `rgba(8, 1, 3, ${(opacity * 0.75).toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(1, 0, 2, ${(opacity * 0.92).toFixed(3)})`);
  } else {
    grad.addColorStop(0.0, `rgba(40, 6, 15, ${(opacity * 0.35).toFixed(3)})`);
    grad.addColorStop(0.25, `rgba(16, 3, 8, ${(opacity * 0.75).toFixed(3)})`);
    grad.addColorStop(0.65, `rgba(4, 1, 6, ${(opacity * 0.94).toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(1, 0, 2, ${(opacity * 0.98).toFixed(3)})`);
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isChanneling || isHollow) {
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringP = ((now * 0.0022 + i * (1.0 / ringCount)) % 1.0);
      const ringR = r * 1.5 + ringP * 280;
      const ringAlpha = (1.0 - ringP) * Math.sin(ringP * Math.PI) * opacity * 0.70;
      if (ringAlpha > 0.01) {
        const ringColor = isHollow
          ? ((i % 2 === 0)
            ? `rgba(255, 255, 255, ${ringAlpha.toFixed(3)})`
            : `rgba(10, 10, 15, ${ringAlpha.toFixed(3)})`)
          : ((i % 2 === 0)
            ? `rgba(220, 20, 20, ${ringAlpha.toFixed(3)})`
            : `rgba(255, 45, 20, ${ringAlpha.toFixed(3)})`);

        const pxStep = 3;
        const ringSteps = Math.max(18, Math.ceil((ringR * Math.PI * 2) / pxStep));
        ctx.fillStyle = ringColor;
        ctx.imageSmoothingEnabled = false;

        for (let step = 0; step < ringSteps; step++) {
          const ang = (step / ringSteps) * Math.PI * 2;
          const px = Math.round((cx + Math.cos(ang) * ringR) / pxStep) * pxStep;
          const py = Math.round((cy + Math.sin(ang) * ringR) / pxStep) * pxStep;
          ctx.fillRect(px, py, pxStep, pxStep);
        }
      }
    }
  }

  if (!isBankaiChannelingOrBursting && currentHollowMaskOpacity > 0.01 && hollowMaskOverlayImg && hollowMaskOverlayImg.complete && hollowMaskOverlayImg.naturalWidth > 0) {
    ctx.save();

    const zoom = (state.camera && state.camera.enabled && state.camera.mode === 'dynamic') ? (state.camera.zoom || 1.0) : 1.0;
    const worldArenaCenterX = (arena.x || 0) + (arena.width || 800) / 2;
    const worldArenaCenterY = (arena.y || 0) + (arena.height || 600) / 2;
    const screenCenter = worldToScreen(worldArenaCenterX, worldArenaCenterY);
    const arenaCenterX = screenCenter.x;
    const arenaCenterY = screenCenter.y;

    const arenaW = (arena.width || 800) * zoom;
    const arenaH = (arena.height || 600) * zoom;
    const arenaX = arenaCenterX - arenaW / 2;
    const arenaY = arenaCenterY - arenaH / 2;

    ctx.beginPath();
    if (arena.shape === 'circle') {
      const ar = (arena.radius || ((arena.width || 800) / 2)) * zoom;
      ctx.arc(arenaCenterX, arenaCenterY, ar, 0, Math.PI * 2);
    } else {
      ctx.rect(arenaX, arenaY, arenaW, arenaH);
    }
    ctx.clip();

    const maskAlpha = Math.min(0.20, currentHollowMaskOpacity);

    const aspect = (hollowMaskOverlayImg.naturalHeight / hollowMaskOverlayImg.naturalWidth) || 1.0;
    const baseSize = Math.max(arenaW, arenaH / aspect) * 1.40;
    const pulse = Math.sin(now * 0.003) * 0.02;
    const maskW = baseSize * (1.0 + pulse);
    const maskH = maskW * aspect;

    const destX = arenaCenterX - maskW / 2;
    const destY = arenaCenterY - maskH / 2;
    const destW = maskW;
    const destH = maskH;

    const isForming = Boolean(ichigo && ((ichigo.hollowMaskFormationTimer && ichigo.hollowMaskFormationTimer > 0) || ichigo._hollowVoicelineWait));
    const maxH = (ichigo && ichigo.hollowMaskFormationMax) || CONFIG.ichigo?.hollowMaskFormationFrames || 325;
    const currentFormProg = (ichigo && ichigo.hollowMaskFormationTimer > 0) 
      ? Math.min(1.0, Math.max(0.0, 1.0 - (ichigo.hollowMaskFormationTimer / maxH))) 
      : 1.0;

    if (isForming && currentFormProg < 0.98) {
      _drawHollowMaskOverlayShards(ctx, destX, destY, destW, destH, currentFormProg, hollowMaskOverlayImg, maskAlpha, arenaW, arenaH);
    } else {
      ctx.save();
      ctx.globalAlpha = maskAlpha;
      ctx.drawImage(
        hollowMaskOverlayImg,
        destX,
        destY,
        destW,
        destH
      );
      ctx.restore();
    }

    const whiteDimAlpha = Math.min(0.65, (currentFormProg || 1.0) * 0.65);
    if (whiteDimAlpha > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(whiteDimAlpha * 0.32).toFixed(3)})`;
      ctx.fillRect(arenaX, arenaY, arenaW, arenaH);

      const auraRadius = Math.max(arenaW, arenaH) * 0.80;
      const whiteGrad = ctx.createRadialGradient(
        arenaCenterX, arenaCenterY, auraRadius * 0.10,
        arenaCenterX, arenaCenterY, auraRadius
      );
      whiteGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(whiteDimAlpha * 0.70).toFixed(3)})`);
      whiteGrad.addColorStop(0.40, `rgba(245, 250, 255, ${(whiteDimAlpha * 0.48).toFixed(3)})`);
      whiteGrad.addColorStop(0.75, `rgba(225, 238, 255, ${(whiteDimAlpha * 0.28).toFixed(3)})`);
      whiteGrad.addColorStop(1.0, `rgba(200, 220, 255, ${(whiteDimAlpha * 0.10).toFixed(3)})`);
      ctx.fillStyle = whiteGrad;
      ctx.fillRect(arenaX, arenaY, arenaW, arenaH);
    }

    ctx.restore();
  }

  ctx.restore();
}

const _HOLLOW_MASK_OVERLAY_SHARDS = [
  {
    name: 'horn_left_spike',
    poly: [[0.00, 0.00], [0.20, 0.00], [0.26, 0.10], [0.14, 0.16], [0.02, 0.14]],
    startDir: { x: -1.35, y: -0.95 },
    rot: -0.58,
    delay: 0.30,
    seed: 0.8
  },
  {
    name: 'forehead_left_plate',
    poly: [[0.20, 0.00], [0.38, 0.00], [0.42, 0.13], [0.24, 0.20], [0.14, 0.16], [0.26, 0.10]],
    startDir: { x: -0.85, y: -1.20 },
    rot: 0.42,
    delay: 0.12,
    seed: 0.4
  },
  {
    name: 'crown_apex',
    poly: [[0.38, 0.00], [0.62, 0.00], [0.57, 0.12], [0.50, 0.08], [0.42, 0.13]],
    startDir: { x: 0.0, y: -1.45 },
    rot: -0.32,
    delay: 0.03,
    seed: 0.2
  },
  {
    name: 'forehead_right_plate',
    poly: [[0.62, 0.00], [0.80, 0.00], [0.74, 0.10], [0.86, 0.16], [0.76, 0.20], [0.57, 0.12]],
    startDir: { x: 0.85, y: -1.20 },
    rot: -0.42,
    delay: 0.15,
    seed: 0.5
  },
  {
    name: 'horn_right_spike',
    poly: [[0.80, 0.00], [1.00, 0.00], [0.98, 0.14], [0.86, 0.16], [0.74, 0.10]],
    startDir: { x: 1.35, y: -0.95 },
    rot: 0.58,
    delay: 0.33,
    seed: 0.9
  },
  {
    name: 'forehead_center_splinter',
    poly: [[0.42, 0.13], [0.57, 0.12], [0.50, 0.26], [0.44, 0.23]],
    startDir: { x: 0.15, y: -0.90 },
    rot: 0.22,
    delay: 0.09,
    seed: 0.3
  },
  {
    name: 'temple_left_wing',
    poly: [[0.02, 0.14], [0.14, 0.16], [0.24, 0.20], [0.17, 0.33], [0.03, 0.30]],
    startDir: { x: -1.40, y: -0.45 },
    rot: 0.48,
    delay: 0.21,
    seed: 0.6
  },
  {
    name: 'brow_left_arch',
    poly: [[0.17, 0.33], [0.24, 0.20], [0.44, 0.23], [0.47, 0.32], [0.31, 0.36], [0.15, 0.38]],
    startDir: { x: -1.10, y: -0.20 },
    rot: -0.36,
    delay: 0.18,
    seed: 0.5
  },
  {
    name: 'glabella_center',
    poly: [[0.44, 0.23], [0.50, 0.26], [0.56, 0.23], [0.52, 0.40], [0.47, 0.32]],
    startDir: { x: 0.0, y: -0.60 },
    rot: -0.18,
    delay: 0.00,
    seed: 0.1
  },
  {
    name: 'brow_right_arch',
    poly: [[0.50, 0.26], [0.76, 0.20], [0.83, 0.33], [0.69, 0.38], [0.52, 0.40], [0.56, 0.23]],
    startDir: { x: 1.10, y: -0.20 },
    rot: 0.36,
    delay: 0.24,
    seed: 0.7
  },
  {
    name: 'temple_right_wing',
    poly: [[0.86, 0.16], [0.98, 0.14], [0.97, 0.30], [0.83, 0.33], [0.76, 0.20]],
    startDir: { x: 1.40, y: -0.45 },
    rot: -0.48,
    delay: 0.27,
    seed: 0.7
  },
  {
    name: 'cheek_outer_left',
    poly: [[0.03, 0.30], [0.17, 0.33], [0.15, 0.38], [0.27, 0.50], [0.05, 0.53]],
    startDir: { x: -1.35, y: 0.25 },
    rot: -0.44,
    delay: 0.42,
    seed: 0.8
  },
  {
    name: 'cheek_inner_left',
    poly: [[0.15, 0.38], [0.31, 0.36], [0.45, 0.40], [0.41, 0.54], [0.27, 0.50]],
    startDir: { x: -0.90, y: 0.35 },
    rot: 0.28,
    delay: 0.36,
    seed: 0.6
  },
  {
    name: 'nasal_ridge',
    poly: [[0.47, 0.32], [0.52, 0.40], [0.53, 0.56], [0.45, 0.56], [0.41, 0.54], [0.45, 0.40]],
    startDir: { x: 0.0, y: 0.10 },
    rot: 0.12,
    delay: 0.06,
    seed: 0.2
  },
  {
    name: 'cheek_inner_right',
    poly: [[0.52, 0.40], [0.69, 0.38], [0.75, 0.44], [0.71, 0.54], [0.53, 0.56]],
    startDir: { x: 0.90, y: 0.35 },
    rot: -0.28,
    delay: 0.39,
    seed: 0.7
  },
  {
    name: 'cheek_outer_right',
    poly: [[0.83, 0.33], [0.97, 0.30], [0.95, 0.53], [0.71, 0.54], [0.75, 0.44]],
    startDir: { x: 1.35, y: 0.25 },
    rot: 0.44,
    delay: 0.45,
    seed: 0.9
  },
  {
    name: 'upper_teeth_left',
    poly: [[0.05, 0.53], [0.27, 0.50], [0.41, 0.54], [0.45, 0.56], [0.49, 0.62], [0.47, 0.70], [0.13, 0.68]],
    startDir: { x: -0.75, y: 0.75 },
    rot: 0.34,
    delay: 0.48,
    seed: 0.7
  },
  {
    name: 'upper_teeth_right',
    poly: [[0.53, 0.56], [0.71, 0.54], [0.95, 0.53], [0.87, 0.68], [0.51, 0.70], [0.49, 0.62]],
    startDir: { x: 0.75, y: 0.75 },
    rot: -0.34,
    delay: 0.51,
    seed: 0.8
  },
  {
    name: 'jaw_left_mandible',
    poly: [[0.13, 0.68], [0.47, 0.70], [0.44, 0.82], [0.21, 0.83], [0.11, 0.76]],
    startDir: { x: -0.95, y: 1.10 },
    rot: -0.38,
    delay: 0.57,
    seed: 0.9
  },
  {
    name: 'jaw_right_mandible',
    poly: [[0.51, 0.70], [0.87, 0.68], [0.89, 0.76], [0.79, 0.83], [0.54, 0.82]],
    startDir: { x: 0.95, y: 1.10 },
    rot: 0.38,
    delay: 0.60,
    seed: 0.9
  },
  {
    name: 'mandible_center_teeth',
    poly: [[0.47, 0.70], [0.51, 0.70], [0.54, 0.82], [0.50, 0.86], [0.44, 0.82]],
    startDir: { x: 0.0, y: 0.90 },
    rot: 0.16,
    delay: 0.54,
    seed: 0.6
  },
  {
    name: 'chin_tip_arrowhead',
    poly: [[0.11, 0.76], [0.21, 0.83], [0.44, 0.82], [0.50, 0.86], [0.54, 0.82], [0.79, 0.83], [0.89, 0.76], [0.50, 1.00]],
    startDir: { x: 0.0, y: 1.45 },
    rot: -0.24,
    delay: 0.63,
    seed: 1.0
  }
];

function _drawHollowMaskOverlayShards(ctx, destX, destY, destW, destH, currentFormProg, maskImg, currentOpacity, arenaW, arenaH) {
  const maskAssemblyProg = Math.min(1.0, Math.max(0.0, currentFormProg / 0.86));
  const shardFlightDuration = 0.22;

  // 1. Attached Shards
  for (let i = 0; i < _HOLLOW_MASK_OVERLAY_SHARDS.length; i++) {
    const shard = _HOLLOW_MASK_OVERLAY_SHARDS[i];
    if (maskAssemblyProg < shard.delay) continue;

    const rawProg = (maskAssemblyProg - shard.delay) / shardFlightDuration;
    if (rawProg < 1.0) continue;

    ctx.save();
    ctx.globalAlpha = currentOpacity;
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(maskImg, destX, destY, destW, destH);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = currentOpacity;
    ctx.strokeStyle = 'rgba(20, 2, 8, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    if (rawProg < 1.40) {
      const flashAlpha = Math.max(0, 1.0 - (rawProg - 1.0) / 0.40);
      ctx.save();
      ctx.globalAlpha = flashAlpha * currentOpacity * 1.5;
      ctx.strokeStyle = 'rgba(255, 60, 90, 0.95)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      shard.poly.forEach((pt, idx) => {
        const px = destX + pt[0] * destW;
        const py = destY + pt[1] * destH;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. In-Flight Shards
  for (let i = 0; i < _HOLLOW_MASK_OVERLAY_SHARDS.length; i++) {
    const shard = _HOLLOW_MASK_OVERLAY_SHARDS[i];
    if (maskAssemblyProg < shard.delay) continue;

    const rawProg = (maskAssemblyProg - shard.delay) / shardFlightDuration;
    if (rawProg >= 1.0) continue;

    let cx = 0, cy = 0;
    for (const pt of shard.poly) {
      cx += destX + pt[0] * destW;
      cy += destY + pt[1] * destH;
    }
    cx /= shard.poly.length;
    cy /= shard.poly.length;

    const shardProg = Math.max(0, Math.min(1.0, rawProg));
    const remain = Math.pow(1.0 - shardProg, 2.6);

    const flightDist = Math.max(arenaW, arenaH) * (0.36 + (shard.seed || 0.5) * 0.30) * remain;
    const curOffX = shard.startDir.x * flightDist;
    const curOffY = shard.startDir.y * flightDist;
    const curRot = shard.rot * remain;
    const curScale = 0.55 + 0.45 * (1.0 - remain);
    const curAlpha = Math.min(1.0, 0.35 + shardProg * 0.65);

    ctx.save();
    ctx.globalAlpha = Math.min(currentOpacity, currentOpacity * curAlpha);
    ctx.translate(cx + curOffX, cy + curOffY);
    ctx.rotate(curRot);
    ctx.scale(curScale, curScale);
    ctx.translate(-cx, -cy);

    ctx.save();
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(maskImg, destX, destY, destW, destH);
    ctx.restore();

    ctx.strokeStyle = 'rgba(235, 25, 60, 0.92)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}
