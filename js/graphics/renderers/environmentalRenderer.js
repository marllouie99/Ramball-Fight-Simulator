import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { excludeGojoInfinityFromDim } from './arenaRenderer.js';

/**
 * Draws a dark dim screen overlay when Zeus is charging or casting his Storm ultimate.
 * The overlay opacity increases during charge, then stays at max while strikes are active.
 */
export function drawStormDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;
  
  // Find Zeus fighters that are charging or actively storming
  const zeusStorming = state.fighters?.filter(f => 
    f && f._def?.type === 'zeus' && (f.isChargingStorm || f.stormActive)
  );
  
  // Also check if there are active storm strikes happening
  const hasActiveStrikes = state.zeusStormStrikes && state.zeusStormStrikes.length > 0;
  
  // If no Zeus is storming and no strikes active, don't draw the overlay
  if ((!zeusStorming || zeusStorming.length === 0) && !hasActiveStrikes) return;
  
  // Get the first Zeus fighter for reference
  const zeus = zeusStorming ? zeusStorming[0] : null;
  
  // Calculate opacity
  let opacity;
  if (zeus && zeus.isChargingStorm) {
    // During charge: opacity increases with charge progress
    const chargeProgress = 1.0 - (zeus.stormCooldown / (CONFIG.zeus.stormTelegraphFrames || 120));
    const dimOpacity = CONFIG.zeus.stormDimOpacity || 0.7;
    opacity = chargeProgress * dimOpacity;
  } else {
    // During active storm: always at max opacity
    opacity = CONFIG.zeus.stormDimOpacity || 0.7;
  }
  
  // Don't draw if opacity is too low
  if (opacity < 0.01) return;
  
  ctx.save();
  // Reset the transform temporarily so the plain dark overlay is perfectly glued to the screen
  // and does not expose edges or jitter during shakes
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Exclude Gojo's Limitless Infinity Barrier from screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(0, 0, 0, ${opacity})`;
}

let currentFurnaceDimOpacity = 0;

/**
 * Draws a dark fiery dim screen overlay with flame lightning when Sukuna channels or fires Furnace (Fuga).
 */
export function drawFurnaceDimScreen() {
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  // Find Sukuna fighters channeling Furnace or in post-fire recovery
  const sukunaFuga = state.fighters?.find(f => 
    f && (f.characterId === 'sukuna' || f.type === 'sukuna' || f._def?.id === 'sukuna' || f._def?.type === 'sukuna' || f._def?.name === 'Sukuna' || f._def?.name === 'Ryomen Sukuna') && (f.isChannelingDivineFlame || (f.divineFlameRecoveryTimer && f.divineFlameRecoveryTimer > 0))
  );
  
  // Also check if Furnace fire arrow is actively flying
  const furnaceArrow = getProjectiles().find(p => (p.isSukunaFurnace || p.visual === 'sukunaFurnaceArrow') && p.life > 0);

  let targetOpacity = 0;
  let cx = canvas.width / 2;
  let cy = canvas.height / 2;

  if (sukunaFuga) {
    cx = sukunaFuga.x;
    cy = sukunaFuga.y;
    if (sukunaFuga.isChannelingDivineFlame) {
      const progress = Math.min(1.0, sukunaFuga.divineFlameChargeTimer / Math.max(1, sukunaFuga.divineFlameChargeMax));
      targetOpacity = 0.25 + progress * 0.55;
    } else if (sukunaFuga.divineFlameRecoveryTimer > 0) {
      const maxRecovery = CONFIG.sukuna.divineFlameRecoveryTime || 60;
      const recProgress = sukunaFuga.divineFlameRecoveryTimer / maxRecovery;
      targetOpacity = 0.55 * recProgress;
    }
  } else if (furnaceArrow) {
    targetOpacity = 0.55;
    cx = furnaceArrow.x;
    cy = furnaceArrow.y;
  }

  // Smoothly interpolate dim opacity for seamless fade-in and gradual fade-out
  if (targetOpacity > currentFurnaceDimOpacity) {
    currentFurnaceDimOpacity += (targetOpacity - currentFurnaceDimOpacity) * 0.15; // Smooth charge fade-in
  } else {
    currentFurnaceDimOpacity += (targetOpacity - currentFurnaceDimOpacity) * 0.06; // Smooth gradual fade-out
  }

  if (currentFurnaceDimOpacity < 0.01) {
    currentFurnaceDimOpacity = 0;
    return;
  }

  const shakeX = state.shakeX || 0;
  const shakeY = state.shakeY || 0;

  ctx.save();
  // Reset the transform temporarily to prevent edge gaps during screen shakes
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Dark fiery vignette gradient centered on Sukuna/Arrow
  const opacity = currentFurnaceDimOpacity;
  const drawCx = cx + shakeX;
  const drawCy = cy + shakeY;
  const grad = ctx.createRadialGradient(drawCx, drawCy, 0, drawCx, drawCy, Math.max(canvas.width, canvas.height) * 0.95);
  grad.addColorStop(0, `rgba(255, 140, 0, ${opacity * 0.95})`);
  grad.addColorStop(0.06, `rgba(255, 70, 0, ${opacity * 0.85})`);
  grad.addColorStop(0.15, `rgba(160, 25, 0, ${opacity * 0.70})`);
  grad.addColorStop(0.35, `rgba(25, 4, 2, ${opacity * 0.92})`);
  grad.addColorStop(0.65, `rgba(5, 1, 1, ${opacity * 0.97})`);
  grad.addColorStop(1, `rgba(0, 0, 0, ${opacity * 0.99})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Exclude Gojo's Limitless Infinity Barrier from screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(0, 0, 0, ${opacity * 0.98})`;
}

let currentRikaSummonDimOpacity = 0;

/**
 * Draws a dark purple/pink cursed energy dim screen overlay when Yuta calls or summons Rika.
 */
export function drawRikaSummonDimScreen() {
  // Handled by WebGL
}

let currentMahitoDomainOpacity = 0;
let mahitoDomainImg = null;
let mahitoDomainImgLoading = false;

function loadMahitoDomainImage() {
  if (mahitoDomainImg || mahitoDomainImgLoading) return;
  mahitoDomainImgLoading = true;
  mahitoDomainImg = new Image();
  mahitoDomainImg.onload = () => {
    mahitoDomainImgLoading = false;
  };
  mahitoDomainImg.onerror = (e) => {
    console.error("Failed to load Mahito domain expansion image:", e);
    mahitoDomainImgLoading = false;
    mahitoDomainImg = null;
  };
  mahitoDomainImg.src = 'Assets/Overlays/mahitos-de.png';
}

/**
 * Draws Mahito's Domain Expansion: Self-Embodiment of Perfection background.
 * Overlays the entire screen with mahitos-de.png at reduced opacity over a dark purple dim effect.
 */
export function renderMahitoDomainBackground(fighter, ctx, targetCanvas = null) {
  if (typeof state === 'undefined' || !state || !ctx) return;
  const canvas = targetCanvas || state.canvas;
  if (!canvas) return;

  if (!mahitoDomainImg && !mahitoDomainImgLoading) {
    loadMahitoDomainImage();
  }

  const isActive = Boolean(fighter && fighter.domainActive);

  if (isActive) {
    currentMahitoDomainOpacity = 1.0; // Snap in immediately when active after channeling
  } else {
    currentMahitoDomainOpacity = Math.max(0, currentMahitoDomainOpacity - 0.05); // Fade out smoothly
    if (currentMahitoDomainOpacity <= 0) return;
  }

  const op = currentMahitoDomainOpacity;

  ctx.save();

  // 1. Dark Purple Dim Effect
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxR = Math.max(canvas.width, canvas.height) * 0.75;

  const dimGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, maxR);
  dimGrad.addColorStop(0.0, `rgba(0, 0, 0, ${op * 0.95})`);       // Pure black center
  dimGrad.addColorStop(0.6, `rgba(36, 8, 54, ${op * 0.90})`);     // Dark transitional purple
  dimGrad.addColorStop(1.0, `rgba(88, 28, 135, ${op * 0.85})`);   // Rich purple edge vignette

  ctx.fillStyle = dimGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. PNG Overlay (Clipped strictly inside Arena Inner Bounds)
  if (mahitoDomainImg && mahitoDomainImg.complete && mahitoDomainImg.naturalWidth > 0) {
    ctx.save();
    
    // Set clipping path strictly to the arena inner bounds
    const arena = state.arena || CONFIG.arena;
    if (arena) {
      ctx.beginPath();
      if (arena.shape === 'circle') {
        const acx = arena.x + arena.width / 2;
        const acy = arena.y + arena.height / 2;
        const ar = (arena.radius !== undefined ? arena.radius : (arena.width / 2)) - (arena.wallWidth || 0);
        ctx.arc(acx, acy, Math.max(0, ar), 0, Math.PI * 2);
      } else {
        const ww = arena.wallWidth || 0;
        ctx.rect(arena.x + ww / 2, arena.y + ww / 2, arena.width - ww, arena.height - ww);
      }
      ctx.clip();

      // Decrease opacity so fighters, spells, and arena remain clearly visible
      ctx.globalAlpha = op * 0.50;

      // Draw the image to fit the arena inner dimensions exactly
      const ww = arena.wallWidth || 0;
      ctx.drawImage(mahitoDomainImg, arena.x + ww / 2, arena.y + ww / 2, arena.width - ww, arena.height - ww);
    }
    ctx.restore();
  }

  // 3. Exclude Gojo Limitless Infinity Barrier from dark overlay (Rule #9)
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(18, 5, 26, ${op * 0.95})`;
}

export function drawMahitoDomainOverlay(fighter) {
  // Legacy fallback if WebGL is disabled
  if (!state.pixiApp || !state.pixiLayers?.environment) {
    renderMahitoDomainBackground(fighter, state.ctx);
  }
}

export function drawCjSanAndreasAtmosphere() {
  // GTA San Andreas atmosphere filter removed per user request
}

