import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { excludeGojoInfinityFromDim, applyDomainArenaVignetteCutout } from './arenaRenderer.js';
import { worldToScreen } from '../../systems/cameraSystem.js';

let currentZeusStormDimOpacity = 0;

/**
 * Draws a dark tempestuous dim screen overlay when Zeus is charging or casting his Storm ultimate.
 * Structured with exponential ease-in / ease-out, full-screen abyssal tempest linear gradient,
 * high-contrast electric cyan plasma core centered on Zeus, corner vignette, arena cutout,
 * and ambient distant cloud lightning pulses matching Mahito's and the top-tier domain overlays.
 */
export function drawStormDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  // Find Zeus fighters that are charging or actively storming, including Rubbick stolen storm or preview
  const zeusFighter = (state.fighters?.find(f => 
    f && f.hp > 0 && (
      ((f.characterId === 'zeus' || f.type === 'zeus' || f._def?.id === 'zeus' || f._def?.type === 'zeus') && (f.isChargingStorm || f.stormActive)) ||
      (f.characterId === 'rubbick' && f.stormActive)
    )
  )) || (state.previewFighter && (state.previewFighter.isChargingStorm || state.previewFighter.stormActive) ? state.previewFighter : null);

  const hasActiveStrikes = Boolean(state.zeusStormStrikes && state.zeusStormStrikes.length > 0);

  let targetOpacity = 0;
  if (zeusFighter) {
    const maxDimOpacity = CONFIG.zeus?.stormDimOpacity ?? 0.92;
    if (zeusFighter.stormActive) {
      targetOpacity = maxDimOpacity;
    } else if (zeusFighter.isChargingStorm) {
      const telegraphMax = CONFIG.zeus?.stormTelegraphFrames || 120;
      const chargeProgress = Math.min(1.0, Math.max(0, 1.0 - ((zeusFighter.stormCooldown || 0) / Math.max(1, telegraphMax))));
      targetOpacity = 0.25 + chargeProgress * (maxDimOpacity - 0.25);
    }
  } else if (hasActiveStrikes) {
    targetOpacity = CONFIG.zeus?.stormDimOpacity ?? 0.92;
  }

  // Smooth exponential interpolation (ease-in on charge / storm, gradual ease-out on completion)
  if (targetOpacity > currentZeusStormDimOpacity) {
    currentZeusStormDimOpacity += (targetOpacity - currentZeusStormDimOpacity) * 0.08;
  } else {
    currentZeusStormDimOpacity += (targetOpacity - currentZeusStormDimOpacity) * 0.06;
  }

  if (currentZeusStormDimOpacity < 0.01) {
    currentZeusStormDimOpacity = 0;
    return;
  }

  const opacity = currentZeusStormDimOpacity;
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  // Reset the transform temporarily so the dark overlay is perfectly glued to the screen
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Deep Abyssal Midnight Storm Linear Gradient Across Screen
  const linearGrad = ctx.createLinearGradient(0, 0, 0, h);
  linearGrad.addColorStop(0.0, `rgba(2, 6, 18, ${(opacity * 0.98).toFixed(3)})`);      // Pitch storm abyss top
  linearGrad.addColorStop(0.18, `rgba(5, 14, 38, ${(opacity * 0.95).toFixed(3)})`);    // Dark tempest navy
  linearGrad.addColorStop(0.50, `rgba(8, 22, 58, ${(opacity * 0.90).toFixed(3)})`);    // Divine Olympian storm ozone center
  linearGrad.addColorStop(0.82, `rgba(4, 12, 34, ${(opacity * 0.95).toFixed(3)})`);    // Dark tempest navy
  linearGrad.addColorStop(1.0, `rgba(2, 4, 14, ${(opacity * 0.98).toFixed(3)})`);      // Pitch storm abyss bottom
  ctx.fillStyle = linearGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. High-contrast electric cyan / lightning blue radial aura centered on Zeus
  const screenPos = zeusFighter ? worldToScreen(zeusFighter.x, zeusFighter.y - (zeusFighter.z || 0)) : { x: w / 2, y: h / 2 };
  const cx = screenPos.x;
  const cy = screenPos.y;
  const maxDim = Math.max(w, h) * 0.92;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0.00, `rgba(220, 250, 255, ${(opacity * 0.65).toFixed(3)})`);     // Luminous hyper-electric core
  grad.addColorStop(0.10, `rgba(0, 225, 255, ${(opacity * 0.48).toFixed(3)})`);       // Radiant lightning cyan halo
  grad.addColorStop(0.24, `rgba(30, 110, 245, ${(opacity * 0.35).toFixed(3)})`);      // Divine thunder sapphire
  grad.addColorStop(0.48, `rgba(12, 45, 140, ${(opacity * 0.22).toFixed(3)})`);       // Deep stormcloud blue
  grad.addColorStop(0.72, `rgba(4, 14, 50, ${(opacity * 0.12).toFixed(3)})`);         // Dark atmospheric transition
  grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');                                         // Outer edge blend

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 3. Dark Outer Edge Screen Corner Vignette (Deepens outer perimeter to pitch black)
  const cornerGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30, w / 2, h / 2, Math.max(w, h) * 0.85);
  cornerGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  cornerGrad.addColorStop(0.50, `rgba(2, 6, 20, ${(opacity * 0.45).toFixed(3)})`);
  cornerGrad.addColorStop(1.0, `rgba(0, 2, 8, ${(opacity * 0.95).toFixed(3)})`);
  ctx.fillStyle = cornerGrad;
  ctx.fillRect(0, 0, w, h);

  // 4. Subtle Distant Cloud Lightning Ambient Pulses during strikes or charging crackle
  if (hasActiveStrikes || (zeusFighter && zeusFighter.isChargingStorm && Math.random() < 0.22)) {
    const flashIntensity = hasActiveStrikes ? 0.16 : 0.07;
    ctx.fillStyle = `rgba(180, 240, 255, ${(opacity * flashIntensity).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }

  // 5. Exclude Gojo Limitless Infinity Barrier from screen dimming (Rule 1.7)
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(2, 4, 14, ${(opacity * 0.98).toFixed(3)})`;
}

let currentFurnaceDimOpacity = 0;

/**
 * Draws a dark fiery dim screen overlay with flame lightning when Sukuna channels or fires Furnace (Fuga).
 */
export function drawFurnaceDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  // Find Sukuna or Soul Swapped fighters channeling Furnace or in post-fire recovery
  const sukunaFuga = state.fighters?.find(f => 
    f && (f.characterId === 'sukuna' || f.type === 'sukuna' || f._def?.id === 'sukuna' || f._def?.type === 'sukuna' || f._def?.name === 'Sukuna' || f._def?.name === 'Ryomen Sukuna' || (f.characterId === 'yuji' && f.soulSwapActive)) && (f.isChannelingDivineFlame || (f.divineFlameRecoveryTimer && f.divineFlameRecoveryTimer > 0))
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
  grad.addColorStop(0, `rgba(255, 160, 20, ${opacity * 0.95})`);
  grad.addColorStop(0.08, `rgba(255, 80, 0, ${opacity * 0.88})`);
  grad.addColorStop(0.20, `rgba(180, 35, 0, ${opacity * 0.75})`);
  grad.addColorStop(0.45, `rgba(75, 12, 4, ${opacity * 0.88})`);
  grad.addColorStop(0.75, `rgba(38, 5, 2, ${opacity * 0.92})`);
  grad.addColorStop(1.0, `rgba(18, 2, 2, ${opacity * 0.95})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Exclude Gojo's Limitless Infinity Barrier from screen dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
  
  state.globalDimEdgeColor = `rgba(25, 4, 2, ${opacity * 0.98})`;
}

let currentRikaSummonDimOpacity = 0;

/**
 * Draws a dark purple/pink cursed energy dim screen overlay when Yuta calls or summons Rika.
 */
export function drawRikaSummonDimScreen() {
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
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
  ctx.fillStyle = `rgba(24, 2, 28, ${opacity * 0.85})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // This overlay renders in screen space, while fighters render in world space.
  // Convert Yuta's position (and the ring radius) through the active camera so
  // the bloom and ring remain locked to him during dynamic camera tracking.
  const screenPos = worldToScreen(cx, cy - (yutaSummoning?.z || 0));
  const camZoom = (state.camera?.enabled && state.camera.mode === 'dynamic')
    ? state.camera.zoom
    : 1;
  const screenX = screenPos.x;
  const screenY = screenPos.y;

  // 2. High-contrast cursed pink bloom centered on Yuta
  const maxR = Math.max(canvas.width, canvas.height) * 0.65 * camZoom;
  const grad = ctx.createRadialGradient(screenX, screenY, 30 * camZoom, screenX, screenY, maxR);
  grad.addColorStop(0, `rgba(255, 20, 147, ${opacity * 0.45})`);
  grad.addColorStop(0.25, `rgba(160, 10, 120, ${opacity * 0.30})`);
  grad.addColorStop(0.60, `rgba(30, 2, 35, ${opacity * 0.15})`);
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Pulsing Cursed Energy Ring around Yuta
  ctx.beginPath();
  const ringR = (85 + Math.sin(Date.now() * 0.01) * 15) * camZoom;
  ctx.arc(screenX, screenY, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 20, 147, ${opacity * 0.75})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  excludeGojoInfinityFromDim(ctx);
  ctx.restore();

  state.globalDimEdgeColor = `rgba(22, 2, 26, ${opacity * 0.95})`;
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

  // 2. Base Pitch Abyss / Black-Violet Background
  ctx.fillStyle = '#040008';
  ctx.fillRect(ax, ay, aw, ah);

  const cx = ax + aw / 2;
  const cy = ay + ah / 2;
  const maxR = Math.max(aw, ah) * 0.75;

  // 3. Draw Mahito Domain Overlay Image (Assets/Overlays/mahitos-de.png) occupying the arena
  const img = getMahitoDomainImage();
  if (img && (img.complete || img.width > 0) && img.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling preserves crisp pixel art
    ctx.drawImage(img, ax, ay, aw, ah);
  } else {
    // Procedural Cursed Violet Nebula fallback while asset initializes
    const nebulaGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
    nebulaGrad.addColorStop(0, 'rgba(217, 70, 239, 0.50)');
    nebulaGrad.addColorStop(0.25, 'rgba(147, 51, 234, 0.35)');
    nebulaGrad.addColorStop(0.55, 'rgba(88, 28, 135, 0.25)');
    nebulaGrad.addColorStop(0.85, 'rgba(26, 3, 40, 0.15)');
    nebulaGrad.addColorStop(1, 'rgba(4, 0, 8, 0.0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(ax, ay, aw, ah);
  }

  // 4. Dark Multi-Stop Cursed Radial Vignette (keeps center hands clear while darkening perimeter)
  const vignetteGrad = ctx.createRadialGradient(cx, cy, Math.min(aw, ah) * 0.15, cx, cy, maxR);
  vignetteGrad.addColorStop(0.00, 'rgba(20, 2, 28, 0.08)');
  vignetteGrad.addColorStop(0.35, 'rgba(14, 1, 22, 0.32)');
  vignetteGrad.addColorStop(0.65, 'rgba(8, 0, 14, 0.62)');
  vignetteGrad.addColorStop(0.85, 'rgba(4, 0, 8, 0.82)');
  vignetteGrad.addColorStop(1.00, 'rgba(2, 0, 4, 0.94)');
  ctx.fillStyle = vignetteGrad;
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
  if (typeof state !== 'undefined' && state.disableDimEffects) return;
  // Handled by WebGL in hybridEnvironmentRenderer.js (Rule 10)
  if (state.pixiApp && state.pixiLayers?.environment) return;

  const { ctx, canvas, arena } = state;
  if (!ctx || !canvas || !arena) return;

  if (CONFIG.cj?.enableBaguvixDimScreen === false) return;

  const cjFighter = (state.fighters?.find(f =>
    f && (f.characterId === 'cj' || f.type === 'cj' || f._def?.id === 'cj' || f._def?.type === 'cj') &&
    (f.isBaguvixActive || f.isGodModeActive)
  )) || (state.previewFighter && (state.previewFighter.isBaguvixActive || state.previewFighter.isGodModeActive) ? state.previewFighter : null);

  if (!cjFighter) return;

  let opacity = 0;
  if (cjFighter.isBaguvixActive || cjFighter.isGodModeActive) {
    opacity = CONFIG.cj?.baguvixDimOpacity || 0.985;
  }

  if (opacity < 0.01) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 1. Deep Abyssal Obsidian / Dark Grove Street Turf Linear Gradient across full screen
  const linearGrad = ctx.createLinearGradient(0, 0, 0, h);
  linearGrad.addColorStop(0.0, `rgba(0, 0, 0, ${(opacity * 0.99).toFixed(3)})`);      // Pitch obsidian black top
  linearGrad.addColorStop(0.20, `rgba(0, 4, 1, ${(opacity * 0.98).toFixed(3)})`);     // Deep dark matrix emerald shadow
  linearGrad.addColorStop(0.50, `rgba(1, 8, 3, ${(opacity * 0.96).toFixed(3)})`);     // Grove Street dark turf void center
  linearGrad.addColorStop(0.80, `rgba(0, 4, 1, ${(opacity * 0.98).toFixed(3)})`);     // Deep dark matrix emerald shadow
  linearGrad.addColorStop(1.0, `rgba(0, 0, 0, ${(opacity * 0.99).toFixed(3)})`);      // Pitch obsidian black bottom
  ctx.fillStyle = linearGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. High-contrast electric emerald / neon lime lightning aura radial gradient centered on CJ
  const screenPos = cjFighter ? worldToScreen(cjFighter.x, cjFighter.y - (cjFighter.z || 0)) : { x: w / 2, y: h / 2 };
  const cx = screenPos.x;
  const cy = screenPos.y;
  const maxDim = Math.max(w, h) * 0.92;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
  grad.addColorStop(0.00, `rgba(0, 255, 100, ${(opacity * 0.55).toFixed(3)})`);       // Intense electric neon emerald core
  grad.addColorStop(0.10, `rgba(34, 197, 94, ${(opacity * 0.38).toFixed(3)})`);       // Grove Street emerald energy halo
  grad.addColorStop(0.25, `rgba(22, 101, 52, ${(opacity * 0.22).toFixed(3)})`);       // Deep forest jade ring
  grad.addColorStop(0.48, `rgba(5, 46, 22, ${(opacity * 0.12).toFixed(3)})`);         // Dark emerald matrix void
  grad.addColorStop(0.72, `rgba(1, 15, 6, ${(opacity * 0.05).toFixed(3)})`);          // Deep turf shadow transition
  grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');                                         // Outer edge blend

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 3. Dark Outer Edge Screen Corner Vignette (Deepens outer perimeter to pure pitch black)
  const cornerGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.85);
  cornerGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  cornerGrad.addColorStop(0.50, `rgba(0, 2, 1, ${(opacity * 0.75).toFixed(3)})`);
  cornerGrad.addColorStop(1.0, `rgba(0, 0, 0, ${(opacity * 0.99).toFixed(3)})`);
  ctx.fillStyle = cornerGrad;
  ctx.fillRect(0, 0, w, h);

  // 4. Clear arena interior with subtle edge vignette so CJ BAGUVIX artwork is 100% visible
  if (cjFighter.isBaguvixActive || cjFighter.isGodModeActive) {
    applyDomainArenaVignetteCutout(ctx);
  }

  // 5. Exclude Gojo Limitless Infinity Barrier from dimming
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();

  state.globalDimEdgeColor = `rgba(0, 0, 0, ${(opacity * 0.99).toFixed(3)})`;
}

let _cjBaguvixOverlayImg = null;
let _cjBaguvixOverlayImgLoading = false;

/**
 * Preload and retrieve CJ's BAGUVIX God Mode overlay image (Assets/Overlays/CJ-baguvix-overlay.png).
 */
export function getCjBaguvixOverlayImage() {
  if (_cjBaguvixOverlayImg && _cjBaguvixOverlayImg.complete && _cjBaguvixOverlayImg.naturalWidth > 0) {
    return _cjBaguvixOverlayImg;
  }
  if (!_cjBaguvixOverlayImgLoading && typeof Image !== 'undefined') {
    _cjBaguvixOverlayImgLoading = true;
    const img = new Image();
    img.onload = () => {
      _cjBaguvixOverlayImg = img;
      _cjBaguvixOverlayImgLoading = false;
    };
    img.onerror = (e) => {
      console.warn("Failed to load CJ BAGUVIX overlay image at Assets/Overlays/CJ-baguvix-overlay.png:", e);
      _cjBaguvixOverlayImgLoading = false;
    };
    img.src = 'Assets/Overlays/CJ-baguvix-overlay.png';
    _cjBaguvixOverlayImg = img;
  }
  return _cjBaguvixOverlayImg;
}

// Preload immediately if running in browser
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getCjBaguvixOverlayImage();
}

/**
 * Draws CJ's BAGUVIX God Mode Arena Overlay background.
 * Overlays the entire arena with Assets/Overlays/CJ-baguvix-overlay.png, clipped inside arena bounds.
 * @param {object} fighter - The CJ fighter instance
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {boolean} isClashSecondary - Whether secondary in domain clash
 * @param {object} [options={}] - Options (e.g. { isLocal: true })
 */
export function renderCjBaguvixBackground(fighter, ctx, isClashSecondary = false, options = {}) {
  if (typeof state === 'undefined' || !state || !ctx) return;
  if (!fighter || (!fighter.isBaguvixActive && !fighter.isGodModeActive)) return;

  const arena = state.arena || CONFIG.arena;
  if (!arena) return;

  const isLocal = Boolean(options.isLocal || (ctx.canvas && Math.abs(ctx.canvas.width - arena.width) < 2));
  const ax = isLocal ? 0 : arena.x;
  const ay = isLocal ? 0 : arena.y;
  const aw = arena.width;
  const ah = arena.height;
  const ww = arena.wallWidth || 4;

  ctx.save();

  // 1. Clip strictly inside the arena bounds
  ctx.beginPath();
  if (arena.shape === 'circle') {
    const acx = ax + aw / 2;
    const acy = ay + ah / 2;
    const ar = (arena.radius !== undefined ? arena.radius : (aw / 2)) - ww;
    ctx.arc(acx, acy, Math.max(0, ar), 0, Math.PI * 2);
  } else {
    ctx.rect(ax + ww, ay + ww, aw - ww * 2, ah - ww * 2);
  }
  ctx.clip();

  if (isClashSecondary) {
    ctx.globalAlpha = 0.75;
  }

  // 2. Base Pitch Abyss / Pure Black Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(ax, ay, aw, ah);

  const cx = ax + aw / 2;
  const cy = ay + ah / 2;
  const maxR = Math.max(aw, ah) * 0.75;

  // 3. Draw CJ BAGUVIX Arena Overlay Image (Assets/Overlays/CJ-baguvix-overlay.png) occupying the arena
  const img = getCjBaguvixOverlayImage();
  if (img && (img.complete || img.width > 0) && img.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling preserves crisp pixel art
    const innerX = ax + ww;
    const innerY = ay + ww;
    const innerW = aw - ww * 2;
    const innerH = ah - ww * 2;
    const custom = (typeof state !== 'undefined' && state.skinCustomizations?.cj_baguvix_overlay) || {};
    const zoom = custom.zoom ?? ((typeof CONFIG !== 'undefined' && CONFIG.cj?.baguvixOverlayZoom !== undefined) ? CONFIG.cj.baguvixOverlayZoom : 1.0);
    const cfgOffY = (typeof CONFIG !== 'undefined' && CONFIG.cj?.baguvixOverlayOffsetY !== undefined) ? (CONFIG.cj.baguvixOverlayOffsetY * innerH) : 0;
    const offX = custom.offsetX ?? 0;
    const offY = custom.offsetY ?? cfgOffY;
    const drawW = innerW * zoom;
    const drawH = innerH * zoom;
    const drawX = innerX + (innerW - drawW) / 2 + offX;
    const drawY = innerY + (innerH - drawH) / 2 + offY;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    // Procedural glowing Grove Street emerald nebula fallback while asset initializes
    const nebulaGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
    nebulaGrad.addColorStop(0, 'rgba(0, 255, 100, 0.65)');
    nebulaGrad.addColorStop(0.20, 'rgba(34, 197, 94, 0.45)');
    nebulaGrad.addColorStop(0.50, 'rgba(20, 83, 45, 0.28)');
    nebulaGrad.addColorStop(0.80, 'rgba(4, 30, 12, 0.15)');
    nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(ax, ay, aw, ah);
  }

  // 4. Dark Atmospheric Overlay & Perimeter Vignette (Heightens combat contrast)
  const darkness = (typeof CONFIG !== 'undefined' && CONFIG.cj?.baguvixOverlayDarkness !== undefined) ? CONFIG.cj.baguvixOverlayDarkness : 0.38;
  ctx.fillStyle = `rgba(0, 0, 0, ${darkness.toFixed(3)})`;
  ctx.fillRect(ax, ay, aw, ah);

  const vignetteGrad = ctx.createRadialGradient(cx, cy, Math.min(aw, ah) * 0.20, cx, cy, maxR);
  vignetteGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0.0)');
  vignetteGrad.addColorStop(0.40, 'rgba(0, 0, 0, 0.0)');
  vignetteGrad.addColorStop(0.65, 'rgba(0, 5, 2, 0.45)');
  vignetteGrad.addColorStop(0.85, 'rgba(0, 2, 1, 0.80)');
  vignetteGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(ax, ay, aw, ah);

  // 5. Exclude Gojo Limitless Infinity Barrier from dark overlay (Rule #9)
  excludeGojoInfinityFromDim(ctx);

  ctx.restore();
}

