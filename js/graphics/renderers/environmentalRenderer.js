import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { excludeGojoInfinityFromDim } from './arenaRenderer.js';
import { worldToScreen } from '../../systems/cameraSystem.js';

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
  const screenPos = worldToScreen(cx, cy);
  const drawCx = screenPos.x;
  const drawCy = screenPos.y;
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
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  const yutaSummoning = state.fighters?.find(f =>
    f && (f.characterId === 'yuta' || f.type === 'yuta' || f._def?.type === 'yuta' || f._def?.id === 'yuta') &&
    (f.rikaCallTimer > 0 || (f.rika && f.rika.active && f.rika.spawnTimer > 0) || f.isChannelingPureLoveBeam || f.isFiringPureLoveBeam)
  );

  let targetOpacity = 0;
  let cx = canvas.width / 2;
  let cy = canvas.height / 2;

  if (yutaSummoning) {
    cx = yutaSummoning.x;
    cy = yutaSummoning.y;
    if (yutaSummoning.isChannelingPureLoveBeam || yutaSummoning.isFiringPureLoveBeam) {
      targetOpacity = 0.88;
    } else if (yutaSummoning.rikaCallTimer > 0) {
      const maxCharge = CONFIG.yuta?.rikaSummonChargeDuration || 30;
      const progress = 1.0 - (yutaSummoning.rikaCallTimer / maxCharge);
      targetOpacity = 0.25 + progress * 0.55;
    } else if (yutaSummoning.rika && yutaSummoning.rika.spawnTimer > 0) {
      const ariseMax = CONFIG.yuta?.rikaAriseDuration || 45;
      const progress = yutaSummoning.rika.spawnTimer / ariseMax;
      targetOpacity = 0.75 * progress;
    }
  }

  currentRikaSummonDimOpacity += (targetOpacity - currentRikaSummonDimOpacity) * ((targetOpacity > currentRikaSummonDimOpacity) ? 0.25 : 0.08);
  if (currentRikaSummonDimOpacity < 0.01) {
    currentRikaSummonDimOpacity = 0;
    return;
  }

  const opacity = currentRikaSummonDimOpacity;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Dark cursed energy base overlay
  ctx.fillStyle = `rgba(10, 0, 18, ${opacity * 0.85})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. High-contrast cursed pink bloom centered on Yuta
  const maxR = Math.max(canvas.width, canvas.height) * 0.65;
  const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, maxR);
  grad.addColorStop(0, `rgba(255, 20, 147, ${opacity * 0.45})`);
  grad.addColorStop(0.25, `rgba(160, 10, 120, ${opacity * 0.30})`);
  grad.addColorStop(0.60, `rgba(30, 2, 35, ${opacity * 0.15})`);
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Pulsing Cursed Energy Ring around Yuta
  ctx.beginPath();
  const ringR = 85 + Math.sin(Date.now() * 0.01) * 15;
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 20, 147, ${opacity * 0.75})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  excludeGojoInfinityFromDim(ctx);
  ctx.restore();

  state.globalDimEdgeColor = `rgba(10, 0, 18, ${opacity * 0.95})`;
}

let _mahitoDomainImg = null;
let _mahitoDomainImgLoading = false;

/**
 * Preload and retrieve Mahito's domain expansion overlay image (Assets/Overlays/mahitos-de.png).
 */
export function getMahitoDomainImage() {
  if (_mahitoDomainImg && _mahitoDomainImg.complete && _mahitoDomainImg.naturalWidth > 0) {
    return _mahitoDomainImg;
  }
  if (!_mahitoDomainImgLoading && typeof Image !== 'undefined') {
    _mahitoDomainImgLoading = true;
    const img = new Image();
    img.onload = () => {
      _mahitoDomainImg = img;
      _mahitoDomainImgLoading = false;
    };
    img.onerror = (e) => {
      console.warn("Failed to load Mahito domain expansion image at Assets/Overlays/mahitos-de.png:", e);
      _mahitoDomainImgLoading = false;
    };
    img.src = 'Assets/Overlays/mahitos-de.png';
    _mahitoDomainImg = img;
  }
  return _mahitoDomainImg;
}

// Preload immediately if running in browser
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getMahitoDomainImage();
}

/**
 * Draws Mahito's Domain Expansion: Self-Embodiment of Perfection background.
 * Overlays the entire arena with Assets/Overlays/mahitos-de.png, clipped inside arena bounds.
 * @param {object} fighter - The Mahito fighter instance
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {boolean} isClashSecondary - Whether secondary in domain clash
 */
export function renderMahitoDomainBackground(fighter, ctx, isClashSecondary = false) {
  if (typeof state === 'undefined' || !state || !ctx) return;
  if (!fighter || (!fighter.domainActive && !fighter._mahitoDomainActive)) return;

  const arena = state.arena || CONFIG.arena;
  if (!arena) return;

  const ax = arena.x;
  const ay = arena.y;
  const aw = arena.width;
  const ah = arena.height;
  const ww = arena.wallWidth || 4;

  ctx.save();

  // 1. Clip strictly inside the arena bounds
  ctx.beginPath();
  if (arena.shape === 'circle') {
    const acx = arena.x + arena.width / 2;
    const acy = arena.y + arena.height / 2;
    const ar = (arena.radius !== undefined ? arena.radius : (arena.width / 2)) - ww;
    ctx.arc(acx, acy, Math.max(0, ar), 0, Math.PI * 2);
  } else {
    ctx.rect(ax + ww, ay + ww, aw - ww * 2, ah - ww * 2);
  }
  ctx.clip();

  if (isClashSecondary) {
    ctx.globalAlpha = 0.75;
  }

  // 2. Base Dark Purple/Black Background
  ctx.fillStyle = '#0a0310';
  ctx.fillRect(ax, ay, aw, ah);

  // 3. Draw Mahito Domain Overlay Image (Assets/Overlays/mahitos-de.png) occupying the arena
  const img = getMahitoDomainImage();
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling preserves crisp pixel art
    ctx.drawImage(img, ax, ay, aw, ah);
  }

  // 4. Subtle Cursed Vignette / Overlay on top of image
  ctx.fillStyle = 'rgba(15, 3, 20, 0.35)';
  ctx.fillRect(ax, ay, aw, ah);

  // 5. Exclude Gojo Limitless Infinity Barrier from dark overlay (Rule #9)
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
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

/**
 * Draws a full-screen Grove Street green domain overlay when CJ activates or is in BAGUVIX God Mode.
 * Fully accelerated via WebGL in hybridEnvironmentRenderer.js (Rule 10).
 */
export function drawCjBaguvixDimScreen() {
  // Handled by WebGL in hybridEnvironmentRenderer.js (Rule 10)
  if (state.pixiApp && state.pixiLayers?.environment) return;

  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  if (CONFIG.cj?.enableBaguvixDimScreen === false) return;

  const cjFighter = (state.fighters?.find(f =>
    f && (f.characterId === 'cj' || f.type === 'cj' || f._def?.id === 'cj' || f._def?.type === 'cj') &&
    (f.isBaguvixActive || f.isGodModeActive || (f.isTypingCheat && f.cheatCodeString === 'BAGUVIX'))
  )) || (state.previewFighter && (state.previewFighter.isBaguvixActive || state.previewFighter.isGodModeActive) ? state.previewFighter : null);

  if (!cjFighter) return;

  let opacity = 0;
  if (cjFighter.isTypingCheat && cjFighter.cheatCodeString === 'BAGUVIX') {
    const maxTyping = (cjFighter.cheatTypingMaxTimer || 60);
    const progress = Math.min(1.0, 1.0 - ((cjFighter.cheatTypingTimer || 0) / Math.max(1, maxTyping)));
    opacity = 0.25 + progress * 0.45;
  } else if (cjFighter.isBaguvixActive || cjFighter.isGodModeActive) {
    opacity = CONFIG.cj?.baguvixDimOpacity || 0.75;
  }

  if (opacity < 0.01) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(6, 44, 20, ${opacity * 0.90})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  excludeGojoInfinityFromDim(ctx);
  ctx.restore();

  state.globalDimEdgeColor = `rgba(6, 44, 20, ${opacity * 0.95})`;
}


