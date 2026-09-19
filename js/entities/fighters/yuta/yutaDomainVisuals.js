// ─────────────────────────────────────────────
// YUTA OKKOTSU DOMAIN EXPANSION (AUTHENTIC MUTUAL LOVE / SHINPPU SOAI)
// Pixel Art Domain Overlay Image Renderer (Assets/Overlays/Yuta-domain-overlay.png)
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state } from '../../../core/state.js';

let _yutaDomainImg = null;
let _yutaDomainImgLoading = false;

/**
 * Preload and retrieve Yuta's pixel art domain expansion overlay image
 */
export function getYutaDomainImage() {
  if (_yutaDomainImg && _yutaDomainImg.complete && _yutaDomainImg.naturalWidth > 0) {
    return _yutaDomainImg;
  }
  if (!_yutaDomainImgLoading && typeof Image !== 'undefined') {
    _yutaDomainImgLoading = true;
    const img = new Image();
    img.onload = () => {
      _yutaDomainImg = img;
      _yutaDomainImgLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Yuta domain overlay image at Assets/Overlays/Yuta-domain-overlay.png', e);
      _yutaDomainImgLoading = false;
    };
    img.src = 'Assets/Overlays/Yuta-domain-overlay.png';
    _yutaDomainImg = img;
  }
  return _yutaDomainImg;
}

// Preload immediately if running in browser
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getYutaDomainImage();
}

/**
 * Main Visual Renderer for Yuta Okkotsu's Domain Expansion (Authentic Mutual Love).
 * Renders the pixel art domain overlay occupying the whole arena, clipped inside the arena bounds.
 * @param {object} fighter - The Yuta fighter instance
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {boolean} isClashSecondary - Whether this domain is secondary in a domain clash
 */
export function renderYutaDomainBackground(fighter, ctx, isClashSecondary = false) {
  if (!fighter || !fighter.domainActive) return;

  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  if (!arena) return;

  const isLocal = Boolean(ctx.canvas && Math.abs(ctx.canvas.width - arena.width) < 2);
  const ax = isLocal ? 0 : arena.x;
  const ay = isLocal ? 0 : arena.y;
  const aw = arena.width;
  const ah = arena.height;
  const ww = arena.wallWidth || 4;

  ctx.save();

  // 1. Strictly clip Yuta's Domain Expansion environment visuals inside the arena bounds
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

  const isTojiActive = Boolean(typeof state !== 'undefined' && state.fighters && state.fighters.some(f => f && (f.characterId === 'toji' || f.type === 'toji') && f.ultimateActive));
  const domainOverlayAlpha = (typeof CONFIG !== 'undefined' && CONFIG.yuta?.domainOverlayAlpha !== undefined) ? CONFIG.yuta.domainOverlayAlpha : 0.75;

  if (isClashSecondary) {
    ctx.globalAlpha = 0.75;
  }

  // 2. Base Pitch Obsidian / Crimson Void Background (Semi-transparent when simultaneous ultimates are active)
  if (isTojiActive || isClashSecondary) {
    ctx.fillStyle = 'rgba(8, 8, 8, 0.40)';
  } else {
    ctx.fillStyle = 'rgba(8, 8, 8, 0.75)';
  }
  ctx.fillRect(ax, ay, aw, ah);

  const cx = ax + aw / 2;
  const cy = ay + ah / 2;
  const maxR = Math.max(aw, ah) * 0.75;

  // 3. Draw Yuta Domain Overlay Image occupying the arena (with semi-transparency)
  const img = getYutaDomainImage();
  if (img && (img.complete || img.width > 0) && img.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling preserves crisp pixel art
    const effectiveAlpha = isTojiActive ? Math.min(domainOverlayAlpha, 0.65) : domainOverlayAlpha;
    ctx.globalAlpha = (isClashSecondary ? 0.75 : 1.0) * effectiveAlpha;
    ctx.drawImage(img, ax, ay, aw, ah);
    ctx.restore();
  } else {
    // Procedural Cursed Crimson-Ruby Nebula fallback while asset initializes
    const nebulaGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
    nebulaGrad.addColorStop(0, 'rgba(193, 0, 70, 0.50)');
    nebulaGrad.addColorStop(0.25, 'rgba(151, 3, 54, 0.35)');
    nebulaGrad.addColorStop(0.55, 'rgba(107, 8, 53, 0.25)');
    nebulaGrad.addColorStop(0.85, 'rgba(53, 7, 25, 0.15)');
    nebulaGrad.addColorStop(1, 'rgba(8, 8, 8, 0.0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(ax, ay, aw, ah);
  }

  // 4. Subtle Atmospheric Edge Vignette to frame the domain inside the arena perimeter
  const vignetteGrad = ctx.createRadialGradient(cx, cy, Math.min(aw, ah) * 0.20, cx, cy, maxR);
  vignetteGrad.addColorStop(0.00, 'rgba(0, 0, 0, 0.0)');
  vignetteGrad.addColorStop(0.60, isTojiActive ? 'rgba(24, 4, 18, 0.08)' : 'rgba(24, 4, 18, 0.15)');
  vignetteGrad.addColorStop(1.00, isTojiActive ? 'rgba(8, 8, 8, 0.35)' : 'rgba(8, 8, 8, 0.55)');
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(ax, ay, aw, ah);

  // 5. Domain Clash Energy Effect when clashing with Sukuna
  const isMultiDomain = (state.fighters && state.fighters.filter(f => f && f.domainActive).length > 1);
  if (fighter.domainActive && isMultiDomain) {
    const time = Date.now();
    const alphaMult = fighter.domainActive ? 1.0 : Math.min(1.0, fighter.rikaAlpha || 1.0);
    const domainRadius = CONFIG.yuta?.domainRadius || 350;
    _renderYutaDomainClashEnergy(fighter, ctx, cx, cy, domainRadius, time, alphaMult);
  }

  ctx.restore();
}

/**
 * Renders the dramatic domain clash rift overlay when both Yuta and Sukuna domains are active.
 * Called from main.js after both domain backgrounds are drawn.
 * Features: crackling dual-colored cursed energy lightning arcs bridging the two domains,
 * a glowing rift seam, and floating clash particles (dark rose petals vs crimson embers).
 */
export function renderYutaSukunaDomainClashRift(ctx, yutaFighter, sukunaFighter) {
  if (!yutaFighter || !sukunaFighter || !yutaFighter.domainActive || !sukunaFighter.domainActive) return;

  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;

  ctx.save();

  // Strictly clip domain clash rift to arena boundaries
  if (arena) {
    ctx.beginPath();
    if (arena.shape === 'circle') {
      const cx = arena.x + arena.width / 2;
      const cy = arena.y + arena.height / 2;
      const ar = arena.radius || (arena.width / 2);
      ctx.arc(cx, cy, ar, 0, Math.PI * 2);
    } else {
      ctx.rect(arena.x, arena.y, arena.width, arena.height);
    }
    ctx.clip();
  }

  const isLowQuality = Boolean(typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5) || (state.fps && state.fps < 45)));

  const time = Date.now();
  const arenaW = arena ? arena.width : 800;
  const arenaH = arena ? arena.height : 600;

  const yDomX = yutaFighter.domainX !== undefined ? yutaFighter.domainX : yutaFighter.x;
  const yDomY = yutaFighter.domainY !== undefined ? yutaFighter.domainY : yutaFighter.y;
  const sDomX = sukunaFighter.domainX !== undefined ? sukunaFighter.domainX : sukunaFighter.x;
  const sDomY = sukunaFighter.domainY !== undefined ? sukunaFighter.domainY : sukunaFighter.y;

  // Rift seam runs perpendicular to the line between domain centers
  const midX = (yDomX + sDomX) / 2;
  const midY = (yDomY + sDomY) / 2;
  const domAngle = Math.atan2(sDomY - yDomY, sDomX - yDomX);
  const riftAngle = domAngle + Math.PI / 2;

  // 1. DOMAIN CLASH RIFT SEAM
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const riftLen = Math.max(arenaW, arenaH) * 0.7;

  ctx.save();
  ctx.translate(midX, midY);
  ctx.rotate(riftAngle);

  if (isLowQuality) {
    ctx.fillStyle = `rgba(255, 20, 147, ${0.15 + Math.sin(time / 200) * 0.05})`;
    ctx.fillRect(-riftLen / 2, -10, riftLen, 20);
  } else {
    const riftGlow = ctx.createLinearGradient(
      midX + Math.cos(riftAngle) * (-riftLen / 2),
      midY + Math.sin(riftAngle) * (-riftLen / 2),
      midX + Math.cos(riftAngle) * (riftLen / 2),
      midY + Math.sin(riftAngle) * (riftLen / 2)
    );
    riftGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    riftGlow.addColorStop(0.3, `rgba(255, 20, 147, ${0.12 + Math.sin(time / 200) * 0.04})`);
    riftGlow.addColorStop(0.5, `rgba(255, 255, 255, ${0.18 + Math.sin(time / 150) * 0.06})`);
    riftGlow.addColorStop(0.7, `rgba(220, 20, 60, ${0.12 + Math.sin(time / 200 + 1) * 0.04})`);
    riftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = riftGlow;
    ctx.fillRect(-riftLen / 2, -30, riftLen, 60);
  }
  ctx.restore();

  ctx.restore();

  // 2. FLOATING CLASH PARTICLES
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const particleCount = isLowQuality ? 4 : 8;
  for (let p = 0; p < particleCount; p++) {
    const seed = p * 7.3 + 1.1;
    const isYutaSide = (p % 2 === 0);

    const orbitT = (p / particleCount - 0.5);
    const orbitDist = 15 + Math.sin(time * 0.002 + seed) * 35;
    const baseX = midX + Math.cos(riftAngle) * orbitT * riftLen * 0.7;
    const baseY = midY + Math.sin(riftAngle) * orbitT * riftLen * 0.7;
    const px = baseX + Math.cos(domAngle + Math.sin(time * 0.003 + seed) * 0.5) * orbitDist * (isYutaSide ? -1 : 1);
    const py = baseY + Math.sin(domAngle + Math.cos(time * 0.003 + seed) * 0.5) * orbitDist * (isYutaSide ? -1 : 1);
    const pAlpha = 0.5 + Math.sin(time * 0.004 + seed * 2) * 0.3;
    const pSize = 2 + Math.sin(time * 0.003 + seed) * 1.5;

    ctx.fillStyle = isYutaSide ? `rgba(255, 105, 180, ${pAlpha})` : `rgba(255, 40, 40, ${pAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. RIKA CURSED ENERGY DOMAIN SURGE AURA
  if (yutaFighter.rika && yutaFighter.rika.active && (yutaFighter.rikaAlpha || 0) > 0.2) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rk = yutaFighter.rika;
    const surgeRadius = (rk.r || 30) * 3.5 + Math.sin(time / 200) * 15;
    const surgeAlpha = 0.18 + Math.sin(time / 180) * 0.08;

    const isGamePlay = Boolean(typeof state !== 'undefined' && ['playing', 'fight', 'countdown', 'paused', 'roundEnd'].includes(state.gameState));
    if (isGamePlay || isLowQuality) {
      ctx.fillStyle = `rgba(255, 20, 147, ${surgeAlpha * 1.2})`;
    } else {
      const surgeGrad = ctx.createRadialGradient(rk.x, rk.y, 0, rk.x, rk.y, surgeRadius);
      surgeGrad.addColorStop(0, `rgba(255, 20, 147, ${surgeAlpha * 1.5})`);
      surgeGrad.addColorStop(0.3, `rgba(138, 43, 226, ${surgeAlpha})`);
      surgeGrad.addColorStop(0.6, `rgba(75, 0, 130, ${surgeAlpha * 0.5})`);
      surgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = surgeGrad;
    }
    ctx.beginPath();
    ctx.arc(rk.x, rk.y, surgeRadius, 0, Math.PI * 2);
    ctx.fill();

    if (!isLowQuality) {
      ctx.strokeStyle = `rgba(255, 20, 147, ${surgeAlpha * 2})`;
      ctx.lineWidth = 1.5;
      for (let t = 0; t < 4; t++) {
        const tAngle = (t / 4) * Math.PI * 2 + time * 0.002;
        const tLen = surgeRadius * (0.6 + Math.sin(time * 0.005 + t * 2) * 0.3);
        ctx.beginPath();
        ctx.moveTo(rk.x, rk.y);
        const cpx = rk.x + Math.cos(tAngle + 0.3) * tLen * 0.5;
        const cpy = rk.y + Math.sin(tAngle + 0.3) * tLen * 0.5;
        ctx.quadraticCurveTo(cpx, cpy, rk.x + Math.cos(tAngle) * tLen, rk.y + Math.sin(tAngle) * tLen);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Internal: Render enhanced energy crackle on Yuta's domain side during domain clash
 */
function _renderYutaDomainClashEnergy(fighter, ctx, domX, domY, domainRadius, time, alphaMult) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const borderPulse = 0.35 + Math.sin(time / 250) * 0.15;
  ctx.strokeStyle = `rgba(255, 20, 147, ${borderPulse * alphaMult})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(domX, domY, domainRadius + 80, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(138, 43, 226, ${borderPulse * 0.6 * alphaMult})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(domX, domY, domainRadius + 60, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
