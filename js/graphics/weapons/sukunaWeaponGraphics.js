import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { fastCleanArray } from '../particles/visualTrailSystem.js';

const _cachedDiscreteSlashCanvases = {
  sukunaSlash_normal: null,
  sukunaSlash_frozen: null,
  ghostBlade_normal: null,
  ghostBlade_frozen: null,
  cleave_normal: null,
  cleave_frozen: null
};

function _renderDiscreteSlashCanvas(type, isFrozen) {
  if (typeof document === 'undefined') return null;
  const key = `${type}_${isFrozen ? 'frozen' : 'normal'}`;
  if (_cachedDiscreteSlashCanvases[key]) return _cachedDiscreteSlashCanvases[key];

  const high = document.createElement('canvas');
  high.width = 64;
  high.height = 64;
  const highCtx = high.getContext('2d');
  highCtx.save();
  highCtx.translate(32, 32);

  const r = 24;
  if (type === 'sukunaSlash') {
    _renderVectorSukunaSlash(highCtx, r, 1.0, isFrozen);
  } else if (type === 'ghostBlade') {
    _renderVectorGhostBlade(highCtx, r, 1.0, isFrozen);
  } else if (type === 'cleave') {
    _renderVectorSukunaCleave(highCtx, r, 1.0, isFrozen);
  }
  highCtx.restore();

  const low = document.createElement('canvas');
  low.width = 32;
  low.height = 32;
  const lowCtx = low.getContext('2d', { willReadFrequently: true });
  lowCtx.imageSmoothingEnabled = false;
  lowCtx.drawImage(high, 0, 0, 32, 32);

  const imgData = lowCtx.getImageData(0, 0, 32, 32);
  const data = imgData.data;
  const w = 32, h = 32;
  const grid = new Array(h);
  for (let y = 0; y < h; y++) {
    grid[y] = new Uint8Array(w);
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 30) grid[y][x] = 1;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (!grid[y][x]) {
        data[idx + 3] = 0;
        continue;
      }

      const isBorder = (
        y === 0 || !grid[y - 1][x] ||
        y === h - 1 || !grid[y + 1][x] ||
        x === 0 || !grid[y][x - 1] ||
        x === w - 1 || !grid[y][x + 1]
      );

      if (isBorder) {
        data[idx] = 14;     // #0E
        data[idx + 1] = 15; // #0F
        data[idx + 2] = 20; // #14
        data[idx + 3] = 255;
      } else {
        data[idx + 3] = 255;
      }
    }
  }
  lowCtx.putImageData(imgData, 0, 0);

  _cachedDiscreteSlashCanvases[key] = low;
  return low;
}

function _renderVectorSukunaSlash(ctx, r, lifeRatio, isFrozen) {
  ctx.globalAlpha = Math.max(0.70, 0.95 * lifeRatio);
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.58, Math.PI * 0.58, false);
  ctx.arc(r * 0.45, 0, r * 0.85, Math.PI * 0.50, -Math.PI * 0.50, true);
  ctx.closePath();
  ctx.fillStyle = isFrozen ? 'rgba(0, 229, 255, 0.95)' : 'rgba(220, 10, 10, 0.95)';
  ctx.fill();

  ctx.strokeStyle = isFrozen ? `rgba(224, 255, 255, ${0.95 * lifeRatio})` : `rgba(255, 80, 80, ${0.95 * lifeRatio})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.98, -Math.PI * 0.54, Math.PI * 0.54, false);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(r * 0.45, 0, r * 0.82, Math.PI * 0.48, -Math.PI * 0.48, true);
  ctx.stroke();

  ctx.strokeStyle = isFrozen ? `rgba(255, 255, 255, ${0.98 * lifeRatio})` : `rgba(255, 255, 255, ${0.98 * lifeRatio})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, -Math.PI * 0.48, Math.PI * 0.48, false);
  ctx.stroke();
}

export function drawSukunaSlash(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const owner = state.fighters && state.fighters[p.owner];
  const scale = owner ? Math.max(0.85, owner.r / 20) : 1.0;
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));
  const isFrozen = Boolean(p.isFrozenByInfinity);

  const low = _renderDiscreteSlashCanvas('sukunaSlash', isFrozen);
  if (!low) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  // 1. Ghost Trail - discrete stepped pixel slices
  for (let i = 3; i >= 1; i--) {
    const trailAlpha = 0.22 * lifeRatio * (4 - i) / 3;
    const trailOffset = i * 8;
    ctx.save();
    ctx.globalAlpha = trailAlpha;
    ctx.drawImage(low, 0, 0, 32, 32, -32 - trailOffset, -32, 64, 64);
    ctx.restore();
  }

  // 2. Main Pixelated Sukuna Slash Blade
  ctx.save();
  ctx.globalAlpha = Math.max(0.70, 0.95 * lifeRatio);
  ctx.drawImage(low, 0, 0, 32, 32, -32, -32, 64, 64);
  ctx.restore();

  // 3. Discrete trailing pixel sparks
  const sparkCol = isFrozen ? '#00E5FF' : '#FF2400';
  ctx.fillStyle = sparkCol;
  const time = Date.now() * 0.01;
  const spark1X = -14 + Math.round(Math.sin(time + (p.x || 0) * 0.1) * 3) * 2;
  const spark1Y = -18 + Math.round(Math.cos(time * 1.5) * 2) * 2;
  const spark2X = -16 + Math.round(Math.cos(time + (p.y || 0) * 0.1) * 3) * 2;
  const spark2Y = 18 + Math.round(Math.sin(time * 1.3) * 2) * 2;
  ctx.fillRect(spark1X, spark1Y, 2, 2);
  ctx.fillRect(spark2X, spark2Y, 2, 2);

  ctx.restore();
}

let _ghostBladeBuffer = null;
let _ghostBladeLow = null;
let _ghostBladeHighCtx = null;
let _ghostBladeLowCtx = null;

function _getGhostBladeBuffers() {
  if (!_ghostBladeBuffer) {
    _ghostBladeBuffer = document.createElement('canvas');
    _ghostBladeBuffer.width = 64;
    _ghostBladeBuffer.height = 64;
    _ghostBladeHighCtx = _ghostBladeBuffer.getContext('2d');

    _ghostBladeLow = document.createElement('canvas');
    _ghostBladeLow.width = 32;
    _ghostBladeLow.height = 32;
    _ghostBladeLowCtx = _ghostBladeLow.getContext('2d', { willReadFrequently: true });
  }
  return { high: _ghostBladeBuffer, low: _ghostBladeLow, highCtx: _ghostBladeHighCtx, lowCtx: _ghostBladeLowCtx };
}

function _renderVectorGhostBlade(ctx, r, lifeRatio, isFrozen) {
  // Main ghost blade crescent shape
  ctx.globalAlpha = Math.max(0.70, 0.95 * lifeRatio);
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.6, Math.PI * 0.6, false);
  ctx.arc(r * 0.5, 0, r * 0.8, Math.PI * 0.55, -Math.PI * 0.55, true);
  ctx.closePath();
  ctx.fillStyle = isFrozen ? 'rgba(0, 229, 255, 0.95)' : 'rgba(255, 180, 180, 1)';
  ctx.fill();

  // Sharp outer crescent edge
  ctx.strokeStyle = isFrozen ? `rgba(224, 255, 255, ${0.95 * lifeRatio})` : `rgba(255, 200, 200, ${0.95 * lifeRatio})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.98, -Math.PI * 0.58, Math.PI * 0.58, false);
  ctx.stroke();

  // Sharp inner crescent edge
  ctx.beginPath();
  ctx.arc(r * 0.5, 0, r * 0.78, Math.PI * 0.53, -Math.PI * 0.53, true);
  ctx.stroke();

  // Thin bright center line
  ctx.strokeStyle = isFrozen ? `rgba(255, 255, 255, ${0.98 * lifeRatio})` : `rgba(255, 220, 220, ${0.98 * lifeRatio})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, -Math.PI * 0.5, Math.PI * 0.5, false);
  ctx.stroke();
}

export function drawGhostBlade(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const owner = state.fighters && state.fighters[p.owner];
  const scale = owner ? Math.max(0.85, owner.r / 20) : 1.0;
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));
  const isFrozen = Boolean(p.isFrozenByInfinity);

  const low = _renderDiscreteSlashCanvas('ghostBlade', isFrozen);
  if (!low) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  // 1. Ghost Trail - discrete stepped pixel slices
  for (let i = 3; i >= 1; i--) {
    const trailAlpha = 0.22 * lifeRatio * (4 - i) / 3;
    const trailOffset = i * 8;
    ctx.save();
    ctx.globalAlpha = trailAlpha;
    ctx.drawImage(low, 0, 0, 32, 32, -32 - trailOffset, -32, 64, 64);
    ctx.restore();
  }

  // 2. Main Pixelated Ghost Blade (Saitama Style)
  ctx.save();
  ctx.globalAlpha = Math.max(0.70, 0.95 * lifeRatio);
  ctx.drawImage(low, 0, 0, 32, 32, -32, -32, 64, 64);
  ctx.restore();

  // 3. Discrete trailing pixel sparks
  const sparkCol = isFrozen ? '#00E5FF' : '#FF6666';
  ctx.fillStyle = sparkCol;
  const time = Date.now() * 0.01;
  const spark1X = -14 + Math.round(Math.sin(time + (p.x || 0) * 0.1) * 3) * 2;
  const spark1Y = -18 + Math.round(Math.cos(time * 1.5) * 2) * 2;
  const spark2X = -16 + Math.round(Math.cos(time + (p.y || 0) * 0.1) * 3) * 2;
  const spark2Y = 18 + Math.round(Math.sin(time * 1.3) * 2) * 2;
  ctx.fillRect(spark1X, spark1Y, 2, 2);
  ctx.fillRect(spark2X, spark2Y, 2, 2);

  ctx.restore();
}

let _cleaveBuffer = null;
let _cleaveLow = null;
let _cleaveHighCtx = null;
let _cleaveLowCtx = null;

function _getCleaveBuffers() {
  if (!_cleaveBuffer) {
    _cleaveBuffer = document.createElement('canvas');
    _cleaveBuffer.width = 64;
    _cleaveBuffer.height = 64;
    _cleaveHighCtx = _cleaveBuffer.getContext('2d');

    _cleaveLow = document.createElement('canvas');
    _cleaveLow.width = 32;
    _cleaveLow.height = 32;
    _cleaveLowCtx = _cleaveLow.getContext('2d', { willReadFrequently: true });
  }
  return { high: _cleaveBuffer, low: _cleaveLow, highCtx: _cleaveHighCtx, lowCtx: _cleaveLowCtx };
}

function _renderVectorSukunaCleave(ctx, r, lifeRatio, isFrozen) {
  ctx.globalAlpha = Math.max(0.75, 0.98 * lifeRatio);
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.55, Math.PI * 0.55, false);
  ctx.arc(r * 0.45, 0, r * 0.85, Math.PI * 0.50, -Math.PI * 0.50, true);
  ctx.closePath();
  ctx.fillStyle = isFrozen ? 'rgba(0, 229, 255, 0.98)' : 'rgba(255, 255, 255, 0.98)';
  ctx.fill();

  ctx.strokeStyle = isFrozen ? `rgba(224, 255, 255, ${0.98 * lifeRatio})` : `rgba(230, 240, 255, ${1.0 * lifeRatio})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, -Math.PI * 0.48, Math.PI * 0.48, false);
  ctx.stroke();
}

export function drawSukunaCleave(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const owner = state.fighters && state.fighters[p.owner];
  const scale = owner ? Math.max(1.1, owner.r / 16) : 1.3;
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));
  const isFrozen = Boolean(p.isFrozenByInfinity);

  const low = _renderDiscreteSlashCanvas('cleave', isFrozen);
  if (!low) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  // 1. Ghost Trail
  for (let i = 3; i >= 1; i--) {
    const trailAlpha = 0.25 * lifeRatio * (4 - i) / 3;
    const trailOffset = i * 8;
    ctx.save();
    ctx.globalAlpha = trailAlpha;
    ctx.drawImage(low, 0, 0, 32, 32, -32 - trailOffset, -32, 64, 64);
    ctx.restore();
  }

  // 2. Main Pixelated Cleave Blade
  ctx.save();
  ctx.globalAlpha = Math.max(0.75, 0.98 * lifeRatio);
  ctx.drawImage(low, 0, 0, 32, 32, -32, -32, 64, 64);
  ctx.restore();

  // 3. Trailing pixel sparks
  const sparkCol = isFrozen ? '#00E5FF' : '#FFFFFF';
  ctx.fillStyle = sparkCol;
  const time = Date.now() * 0.01;
  const spark1X = -14 + Math.round(Math.sin(time + (p.x || 0) * 0.1) * 3) * 2;
  const spark1Y = -18 + Math.round(Math.cos(time * 1.5) * 2) * 2;
  const spark2X = -16 + Math.round(Math.cos(time + (p.y || 0) * 0.1) * 3) * 2;
  const spark2Y = 18 + Math.round(Math.sin(time * 1.3) * 2) * 2;
  ctx.fillRect(spark1X, spark1Y, 2, 2);
  ctx.fillRect(spark2X, spark2Y, 2, 2);

  ctx.restore();
}

/**
 * Renders the radiant ambient arena floor / ground illumination wash beneath Fuga (Furnace / Divine Flame).
 * Casts a soft, radiant pool of warm golden and fiery scarlet lighting onto the arena floor.
 * Matches the multi-tiered floor lighting architecture used in Zenitsu and Escanor.
 * Rule 11 (Zero shadowBlur) & Rule 2.4 (Canvas stack balance) compliant.
 */
export function drawFugaFloorLighting(ctx, cx, cy, radius, alpha = 1.0, isFlying = false, isExplosion = false, explosionProgress = 0, isFrozenByInfinity = false) {
  if (!ctx || radius <= 0 || alpha <= 0.02) return;
  const isDark = _isDarkMode();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  let floorR;
  let intensity;

  if (isExplosion) {
    const expP = Math.max(0, Math.min(1.0, explosionProgress));
    // Detonation flash expands rapidly outward during peak burst (frames 1-4), then dims
    floorR = Math.min(380, radius * (1.1 + expP * 2.4));
    intensity = (isDark ? 0.70 : 0.50) * Math.max(0, 1.0 - Math.pow(expP, 1.35)) * alpha;
  } else if (isFlying) {
    floorR = Math.min(220, radius * (isDark ? 1.35 : 1.15));
    intensity = (isDark ? 0.38 : 0.26) * alpha;
  } else {
    // Charging / channeling continuous thermal pulse
    const pulse = Math.sin(Date.now() * 0.007) * 0.08;
    floorR = Math.min(260, radius * (1.0 + pulse));
    intensity = (isDark ? 0.42 : 0.28) * alpha;
  }

  if (floorR > 2 && intensity > 0.01) {
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, floorR);
    if (isFrozenByInfinity) {
      glow.addColorStop(0.00, `rgba(240, 255, 255, ${Math.min(1.0, intensity * 1.0)})`);
      glow.addColorStop(0.25, `rgba(180, 245, 255, ${intensity * 0.80})`);
      glow.addColorStop(0.55, `rgba(0, 210, 255, ${intensity * 0.42})`);
      glow.addColorStop(0.82, `rgba(0, 100, 240, ${intensity * 0.16})`);
      glow.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    } else {
      glow.addColorStop(0.00, `rgba(255, 252, 220, ${Math.min(1.0, intensity * 1.0)})`);
      glow.addColorStop(0.24, `rgba(255, 210, 80, ${intensity * 0.80})`);
      glow.addColorStop(0.55, `rgba(255, 110, 15, ${intensity * 0.45})`);
      glow.addColorStop(0.82, `rgba(215, 30, 5, ${intensity * 0.18})`);
      glow.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    }

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, floorR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders directional thermal bloom & specular rim lighting on entities near Fuga (Divine Flame).
 * Casts a warm golden specular rim highlight on fighters and illusions facing the flame arrow / explosion.
 * Rule 11 (Zero shadowBlur) & Rule 2.4 (Canvas stack balance) compliant.
 */
export function drawFugaProximityEntityLighting(ctx, lightX, lightY, lightRadius, alpha = 1.0, isFrozenByInfinity = false) {
  if (!ctx || lightRadius <= 0 || alpha <= 0.05) return;
  const entities = [];
  if (typeof state !== 'undefined') {
    if (Array.isArray(state.fighters)) entities.push(...state.fighters);
    if (Array.isArray(state.illusions)) entities.push(...state.illusions);
  }
  if (entities.length === 0) return;

  const lightRadiusSq = lightRadius * lightRadius;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent || ent.hp <= 0 || (ent.dead && !ent._isWinnerReveal)) continue;
    const dx = lightX - ent.x;
    const dy = lightY - (ent.y - (ent.z || 0));
    const distSq = dx * dx + dy * dy;
    if (distSq > lightRadiusSq || distSq <= 4) continue;

    const dist = Math.sqrt(distSq);
    const norm = 1.0 - (dist / lightRadius);
    const rimIntensity = Math.pow(norm, 1.25) * 0.45 * alpha;
    if (rimIntensity <= 0.02) continue;

    const entR = ent.r || 25;
    const angleToLight = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(ent.x, ent.y - (ent.z || 0));

    // Directional Solar Rim Arc
    ctx.strokeStyle = isFrozenByInfinity
      ? `rgba(0, 229, 255, ${rimIntensity * 0.85})`
      : `rgba(255, 150, 20, ${rimIntensity * 0.85})`;
    ctx.lineWidth = Math.max(1.5, entR * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, entR * 1.05, angleToLight - Math.PI * 0.35, angleToLight + Math.PI * 0.35);
    ctx.stroke();

    // Secondary White-Hot Glint on leading edge
    ctx.strokeStyle = `rgba(255, 255, 250, ${rimIntensity * 0.70})`;
    ctx.lineWidth = Math.max(1.0, entR * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, entR * 1.05, angleToLight - Math.PI * 0.15, angleToLight + Math.PI * 0.15);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders ground-layer lighting wash beneath all active Fuga sources (charging fighters, flying arrows).
 * Called on the ground layer before fighters are drawn.
 */
export function drawFugaGroundIllumination(ctx) {
  if (!ctx || typeof state === 'undefined') return;

  // 1. Sukuna / Yuji fighters actively channeling Divine Flame or in recovery
  if (state.fighters) {
    for (let i = 0; i < state.fighters.length; i++) {
      const f = state.fighters[i];
      if (!f || f.hp <= 0 || (f.dead && !f._isWinnerReveal)) continue;
      const isCharging = Boolean(f.isChannelingDivineFlame && f.divineFlameChargeTimer > 0);
      const isRecovery = Boolean(f.divineFlameRecoveryTimer && f.divineFlameRecoveryTimer > 0);
      if (!isCharging && !isRecovery) continue;

      let progress = 0;
      let alpha = 1.0;
      if (isCharging) {
        progress = Math.min(1.0, f.divineFlameChargeTimer / Math.max(1, f.divineFlameChargeMax || 90));
        alpha = 0.35 + 0.65 * progress;
      } else {
        const maxRec = (CONFIG.sukuna && CONFIG.sukuna.divineFlameRecoveryTime) ? CONFIG.sukuna.divineFlameRecoveryTime : 60;
        progress = Math.min(1.0, f.divineFlameRecoveryTimer / maxRec);
        alpha = 0.55 * progress;
      }

      if (alpha <= 0.02) continue;

      const angle = f.gunAngle !== undefined ? f.gunAngle : (f.angle || 0);
      const r = f.r || 25;
      const lightDist = r * 1.2 + 35 * progress;
      const lightX = f.x + Math.cos(angle) * lightDist;
      const lightY = f.y - (f.z || 0) + Math.sin(angle) * lightDist;
      const radius = 95 + 95 * progress;

      drawFugaFloorLighting(ctx, lightX, lightY, radius, alpha, false, false, 0, false);
      drawFugaProximityEntityLighting(ctx, lightX, lightY, radius * 1.5, alpha * 0.9, false);
    }
  }

  // 2. Flying Fuga projectiles on the ground layer
  const projectiles = (typeof getProjectiles === 'function' ? getProjectiles() : state.projectiles);
  if (projectiles) {
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (!p || p.life <= 0) continue;
      const isFuga = Boolean(p.isSukunaFurnace || p.visual === 'sukunaFurnaceArrow' || p.behaviorType === 'sukuna_furnace');
      if (!isFuga) continue;

      drawFugaFloorLighting(ctx, p.x, p.y, 130, 1.0, true, false, 0, p.isFrozenByInfinity);
      drawFugaProximityEntityLighting(ctx, p.x, p.y, 190, 0.85, p.isFrozenByInfinity);
    }
  }
}

export function drawSukunaFurnaceArrow(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const step30Frame = Math.floor(Date.now() / (1000 / 30));
  const time = step30Frame * (1000 / 30) * 0.012;
  const speed = Math.hypot(vx, vy);

  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.2)));

  if (!p._fugaFlameTimer) p._fugaFlameTimer = 0;
  p._fugaFlameTimer++;

  if (!p.flameParticles) p.flameParticles = [];
  if (!p.emberParticles) p.emberParticles = [];

  // ─── SPAWN TRANSLUCENT CHARCOAL-CRIMSON SMOKE WAKE PUFFS (firearrowvfx.mp4 rear wake)
  const smokeRate = isLowQuality ? 1 : 2;
  for (let i = 0; i < smokeRate; i++) {
    p.flameParticles.push({
      x: -55 - Math.random() * 55,
      y: (Math.random() - 0.5) * 14,
      vx: -(2.4 + Math.random() * 3.8 + speed * 0.10),
      vy: (Math.random() - 0.5) * 1.4 - 0.25,
      size: 7 + Math.random() * 8,
      maxSize: 20 + Math.random() * 16,
      life: 1.0,
      maxLife: 1.0,
      decay: isLowQuality ? 0.04 : (0.022 + Math.random() * 0.014),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.10 + Math.random() * 0.14,
      turbSeed: Math.random() * 100,
      layer: i % 2 // 0=charcoal-violet smoke, 1=crimson-ember mist
    });
  }

  // ─── SPAWN PINPOINT GLOWING EMBERS (firearrowvfx.mp4 fine sparks drifting in wake)
  const emberSpawnCount = isLowQuality ? 1 : 2;
  for (let e = 0; e < emberSpawnCount; e++) {
    if (Math.random() < (isLowQuality ? 0.45 : 0.90)) {
      p.emberParticles.push({
        x: -18 - Math.random() * 65,
        y: (Math.random() - 0.5) * 24,
        vx: -(2.8 + Math.random() * 5.5 + speed * 0.12),
        vy: (Math.random() - 0.5) * 2.2 - 0.15,
        size: 1.1 + Math.random() * 1.5,
        life: 1.0,
        maxLife: 1.0,
        decay: isLowQuality ? 0.032 : (0.016 + Math.random() * 0.014),
        trail: []
      });
    }
  }

  const maxFlames = isLowQuality ? 8 : 22;
  const maxEmbers = isLowQuality ? 6 : 24;
  while (p.flameParticles.length > maxFlames) p.flameParticles.shift();
  while (p.emberParticles.length > maxEmbers) p.emberParticles.shift();

  // Dynamic directional proximity entity lighting for flying fire arrow
  drawFugaProximityEntityLighting(ctx, p.x, p.y, 185, 0.85, p.isFrozenByInfinity);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // 1. Render Rear Translucent Smoke Plume Wake (normal blend behind arrow)
  fastCleanArray(p.flameParticles, (fp) => {
    fp.life -= fp.decay;
    if (fp.life <= 0) return false;

    fp.wobblePhase += fp.wobbleSpeed;
    fp.x += fp.vx;
    fp.y += fp.vy + Math.sin(fp.wobblePhase) * 0.25;

    const prog = fp.life / fp.maxLife;
    const ageRatio = 1 - prog;
    const curSize = fp.size + (fp.maxSize - fp.size) * ageRatio;
    const alpha = Math.sin(prog * Math.PI) * 0.26;
    const stretchX = curSize * 1.85;
    const stretchY = curSize * 0.68;

    if (p.isFrozenByInfinity) {
      ctx.fillStyle = `rgba(0, 160, 230, ${alpha})`;
    } else if (fp.layer === 0) {
      ctx.fillStyle = `rgba(76, 58, 64, ${alpha})`;
    } else {
      ctx.fillStyle = `rgba(175, 42, 24, ${alpha * 0.9})`;
    }

    ctx.beginPath();
    ctx.ellipse(fp.x, fp.y, stretchX, stretchY, 0, 0, Math.PI * 2);
    ctx.fill();
    return true;
  });

  ctx.restore();

  // 2. Render Main firearrowvfx.mp4 Flame Arrow Construct (12-Frame RGBA + Interior Spine & Parabolic Cone)
  drawDivineFlameArrowConstruct(ctx, {
    x: p.x,
    y: p.y,
    angle,
    scale: 1.0,
    progress: 1.0,
    isFlying: true,
    time,
    isFrozenByInfinity: p.isFrozenByInfinity
  });

  // 3. Render Pinpoint Glowing Ember Sparks on top of smoke & tail
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = 'lighter';

  fastCleanArray(p.emberParticles, (ep) => {
    ep.life -= ep.decay;
    if (ep.life <= 0) return false;

    ep.x += ep.vx;
    ep.y += ep.vy;
    ep.vy += (Math.random() - 0.5) * 0.18;
    const prog = ep.life / ep.maxLife;
    const rOuter = ep.size * (1.8 + 0.6 * prog);
    const rCore = ep.size * (0.65 + 0.35 * prog);

    // Warm red-orange outer ember halo
    ctx.fillStyle = p.isFrozenByInfinity
      ? `rgba(0, 210, 255, ${prog * 0.55})`
      : `rgba(255, 72, 16, ${prog * 0.58})`;
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, rOuter, 0, Math.PI * 2);
    ctx.fill();

    // Pinpoint incandescent yellow-white ember core
    ctx.fillStyle = p.isFrozenByInfinity
      ? `rgba(235, 255, 255, ${prog})`
      : `rgba(255, 242, 160, ${prog})`;
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, rCore, 0, Math.PI * 2);
    ctx.fill();
    return true;
  });

  ctx.restore();
}

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

let _fugaArcadeCanvas = null;
let _fugaArcadeCtx = null;

// ───────────────────────────────────────────────────────────────────────────
// 12-FRAME PIXEL-ART FUGA TRAVEL & EXPLOSION SPRITE LOADERS
// ───────────────────────────────────────────────────────────────────────────
const _sukunaFugaTravelFrames = [];
let _sukunaFugaTravelFramesLoaded = false;

export function _getSukunaFugaTravelFrames() {
  if (!_sukunaFugaTravelFramesLoaded && typeof window !== 'undefined' && typeof Image !== 'undefined') {
    _sukunaFugaTravelFramesLoaded = true;
    for (let i = 1; i <= 12; i++) {
      const img = new Image();
      img.src = `Assets/model/sukuna/Fuga_idle_travel/Fuga_idle_travel-${i}.png`;
      _sukunaFugaTravelFrames.push(img);
    }
  }
  return _sukunaFugaTravelFrames;
}

const _sukunaFugaExplosionFrames = [];
let _sukunaFugaExplosionFramesLoaded = false;
const _fugaExplosionFrameNumbers = [6, 7, 8, 9, 10, 11, 12];

export function _getSukunaFugaExplosionFrames() {
  if (!_sukunaFugaExplosionFramesLoaded && typeof window !== 'undefined' && typeof Image !== 'undefined') {
    _sukunaFugaExplosionFramesLoaded = true;
    for (const num of _fugaExplosionFrameNumbers) {
      const img = new Image();
      img.src = `Assets/model/sukuna/Fuga_explosion/Fuga_explosion-${num}.png`;
      _sukunaFugaExplosionFrames.push(img);
    }
  }
  return _sukunaFugaExplosionFrames;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getSukunaFugaTravelFrames();
  _getSukunaFugaExplosionFrames();
}

function _getFugaArcadeBuffer() {
  if (!_fugaArcadeCanvas) {
    _fugaArcadeCanvas = document.createElement('canvas');
    _fugaArcadeCanvas.width = 200;
    _fugaArcadeCanvas.height = 120;
    _fugaArcadeCtx = _fugaArcadeCanvas.getContext('2d');
    _fugaArcadeCtx.imageSmoothingEnabled = false;
  }
  return { canvas: _fugaArcadeCanvas, ctx: _fugaArcadeCtx };
}

export function drawDivineFlameArrowConstruct(ctx, {
  x, y, angle = 0, scale = 1.0, progress = 1.0, isFlying = false, time = Date.now() * 0.012, isFrozenByInfinity = false
}) {
  if (progress <= 0) return;

  const frames = _getSukunaFugaTravelFrames();
  const frameIdx = Math.floor(Date.now() / 45) % 12;
  const frameImg = frames[frameIdx];

  if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (Math.abs(angle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    ctx.scale(scale, scale);

    const pScale = isFlying ? 1.0 : (0.50 + 0.50 * Math.min(1.0, progress));
    const drawW = (isFlying ? 290 : 260) * pScale;
    const drawH = drawW * (192 / 640);
    // In 640x192 tilt-corrected firearrowvfx.mp4 frames:
    // Nose tip is at x = 96.25%, bright cone core at x = 83.6%, shaft nock at x = 57.0%, vertical axis at y = 50.0%
    const drawX = isFlying ? (-drawW * 0.82) : (-drawW * 0.70);
    const drawY = -drawH * 0.50;
    const tipX = drawX + drawW * 0.962;

    // ── 1. LAYER 1: RADIANT VOLUMETRIC HEAT BLOOM & SOLAR CORONA (Rule 11 & Rule 31 compliant) ──
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // A. Concentric nose heat bloom
    const glowCx = drawX + drawW * 0.84;
    const glowR = (isFlying ? 58 : 48) * pScale;
    const auraGrad = ctx.createRadialGradient(glowCx, 0, 2, glowCx, 0, glowR);
    if (isFrozenByInfinity) {
      auraGrad.addColorStop(0.00, `rgba(235, 255, 255, ${0.72 * progress})`);
      auraGrad.addColorStop(0.35, `rgba(0, 230, 255, ${0.45 * progress})`);
      auraGrad.addColorStop(0.70, `rgba(0, 120, 255, ${0.18 * progress})`);
      auraGrad.addColorStop(1.00, 'rgba(0, 100, 255, 0)');
    } else {
      auraGrad.addColorStop(0.00, `rgba(255, 252, 215, ${0.75 * progress})`);
      auraGrad.addColorStop(0.32, `rgba(255, 175, 30, ${0.52 * progress})`);
      auraGrad.addColorStop(0.70, `rgba(255, 70, 10, ${0.22 * progress})`);
      auraGrad.addColorStop(1.00, 'rgba(200, 20, 0, 0)');
    }
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.ellipse(glowCx, 0, glowR * 1.35, glowR * 0.90, 0, 0, Math.PI * 2);
    ctx.fill();

    // B. Atmospheric flame body heat wash along arrow shaft
    const bodyAuraCx = drawX + drawW * 0.52;
    const bodyAuraRx = drawW * 0.44;
    const bodyAuraRy = drawH * 0.68;
    const bodyGrad = ctx.createRadialGradient(bodyAuraCx, 0, 4, bodyAuraCx, 0, bodyAuraRx);
    if (isFrozenByInfinity) {
      bodyGrad.addColorStop(0.00, `rgba(0, 210, 255, ${0.28 * progress})`);
      bodyGrad.addColorStop(0.60, `rgba(0, 100, 255, ${0.10 * progress})`);
      bodyGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    } else {
      bodyGrad.addColorStop(0.00, `rgba(255, 140, 20, ${0.32 * progress})`);
      bodyGrad.addColorStop(0.60, `rgba(220, 35, 5, ${0.12 * progress})`);
      bodyGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(bodyAuraCx, 0, bodyAuraRx, bodyAuraRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 2. LAYER 2: 12-FRAME PIXEL-ART FIRE ARROW SPRITE ──
    ctx.save();
    ctx.globalAlpha = Math.min(1.0, 0.42 + 0.58 * progress);
    ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);
    ctx.restore();

    // ── 3. LAYER 3: CRISP STRUCTURAL CORE OVERLAY ──
    _renderFireArrowVfxCoreOverlay(ctx, {
      drawX,
      drawW,
      drawH,
      pScale,
      progress: Math.min(1.0, progress),
      isFlying,
      time,
      isFrozenByInfinity
    });

    // ── 4. LAYER 4: OVER-SPRITE RADIANT ARROWHEAD BLOOM & ANAMORPHIC GLARE ──
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // A. Blinding incandescent tip point flash
    const tipCoreR = (isFlying ? 15 : 12) * pScale;
    const tipBloom = ctx.createRadialGradient(tipX, 0, 0, tipX, 0, tipCoreR * 2.4);
    if (isFrozenByInfinity) {
      tipBloom.addColorStop(0.00, `rgba(255, 255, 255, ${0.98 * progress})`);
      tipBloom.addColorStop(0.35, `rgba(180, 245, 255, ${0.75 * progress})`);
      tipBloom.addColorStop(0.70, `rgba(0, 210, 255, ${0.32 * progress})`);
      tipBloom.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    } else {
      tipBloom.addColorStop(0.00, `rgba(255, 255, 255, ${0.98 * progress})`);
      tipBloom.addColorStop(0.35, `rgba(255, 240, 160, ${0.82 * progress})`);
      tipBloom.addColorStop(0.70, `rgba(255, 130, 20, ${0.38 * progress})`);
      tipBloom.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = tipBloom;
    ctx.beginPath();
    ctx.arc(tipX, 0, tipCoreR * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // B. Cinematic Anamorphic Horizontal Lens Flare Streak (along the flight vector)
    const streakLen = (isFlying ? 46 : 34) * pScale;
    const streakThick = (isFlying ? 6.0 : 4.5) * pScale;
    const streakGrad = ctx.createRadialGradient(tipX, 0, 0, tipX, 0, streakLen);
    if (isFrozenByInfinity) {
      streakGrad.addColorStop(0.00, `rgba(255, 255, 255, ${0.95 * progress})`);
      streakGrad.addColorStop(0.30, `rgba(160, 240, 255, ${0.65 * progress})`);
      streakGrad.addColorStop(0.75, `rgba(0, 190, 255, ${0.18 * progress})`);
      streakGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    } else {
      streakGrad.addColorStop(0.00, `rgba(255, 255, 255, ${0.95 * progress})`);
      streakGrad.addColorStop(0.30, `rgba(255, 225, 120, ${0.70 * progress})`);
      streakGrad.addColorStop(0.75, `rgba(255, 110, 15, ${0.22 * progress})`);
      streakGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = streakGrad;
    ctx.beginPath();
    ctx.ellipse(tipX, 0, streakLen, streakThick, 0, 0, Math.PI * 2);
    ctx.fill();

    // C. Forward Radiant Illumination Cone (projecting forward into space ahead of the arrow)
    const coneReach = (isFlying ? 72 : 48) * pScale;
    const coneSpread = (isFlying ? 26 : 18) * pScale;
    const fwdGrad = ctx.createLinearGradient(tipX, 0, tipX + coneReach, 0);
    if (isFrozenByInfinity) {
      fwdGrad.addColorStop(0.00, `rgba(210, 250, 255, ${0.65 * progress})`);
      fwdGrad.addColorStop(0.40, `rgba(0, 220, 255, ${0.30 * progress})`);
      fwdGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    } else {
      fwdGrad.addColorStop(0.00, `rgba(255, 245, 180, ${0.70 * progress})`);
      fwdGrad.addColorStop(0.40, `rgba(255, 145, 25, ${0.35 * progress})`);
      fwdGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = fwdGrad;
    ctx.beginPath();
    ctx.moveTo(tipX, -streakThick * 0.5);
    ctx.lineTo(tipX + coneReach, -coneSpread);
    ctx.lineTo(tipX + coneReach, coneSpread);
    ctx.lineTo(tipX, streakThick * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.restore();
    return;
  }

  const isDark = _isDarkMode();

  if (isDark) {
    const { canvas: lowCanvas, ctx: lowCtx } = _getFugaArcadeBuffer();

    lowCtx.clearRect(0, 0, 200, 120);
    lowCtx.imageSmoothingEnabled = false;
    lowCtx.save();
    lowCtx.translate(100, 60);

    // Render directly into the low-res arcade canvas at native coordinates
    _renderVectorDivineFlameArrow(lowCtx, {
      scale: 1.0, progress, isFlying, time, isFrozenByInfinity
    });
    lowCtx.restore();

    // Blit with nearest-neighbor upscaling (chunky 16-bit retro arcade pixel flames at locked 60 FPS)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lowCanvas, -100, -60);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    _renderVectorDivineFlameArrow(ctx, {
      scale: 1.0, progress, isFlying, time, isFrozenByInfinity
    });
    ctx.restore();
  }
}

/**
 * Renders the razor-sharp interior physical arrow spine, helical flame ribbon, parabolic nose tip,
 * and pinpoint ember sparks from firearrowvfx.mp4.
 */
function _renderFireArrowVfxCoreOverlay(ctx, {
  drawX, drawW, drawH, pScale = 1.0, progress = 1.0, isFlying = false, time = 0, isFrozenByInfinity = false
}) {
  const tipX = drawX + drawW * 0.962;
  const coneBaseX = drawX + drawW * 0.76;
  const shaftStartX = drawX + drawW * 0.575;
  const coneHalfH = drawH * 0.145;

  // (A) Parabolic Supersonic Bullet-Cone Inner Glow & Helical Flame Wrap
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const coneGrad = ctx.createLinearGradient(coneBaseX, 0, tipX, 0);
  if (isFrozenByInfinity) {
    coneGrad.addColorStop(0, `rgba(0, 180, 255, ${0.15 * progress})`);
    coneGrad.addColorStop(0.6, `rgba(160, 245, 255, ${0.42 * progress})`);
    coneGrad.addColorStop(1, `rgba(255, 255, 255, ${0.85 * progress})`);
  } else {
    coneGrad.addColorStop(0, `rgba(255, 95, 10, ${0.14 * progress})`);
    coneGrad.addColorStop(0.6, `rgba(255, 215, 75, ${0.40 * progress})`);
    coneGrad.addColorStop(1, `rgba(255, 252, 220, ${0.85 * progress})`);
  }
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(tipX, 0);
  ctx.quadraticCurveTo(tipX - (tipX - coneBaseX) * 0.28, -coneHalfH, coneBaseX, -coneHalfH * 0.85);
  ctx.lineTo(coneBaseX, coneHalfH * 0.85);
  ctx.quadraticCurveTo(tipX - (tipX - coneBaseX) * 0.28, coneHalfH, tipX, 0);
  ctx.closePath();
  ctx.fill();

  // Spiraling golden-white helical flame ribbon wrapping around the interior arrow shaft
  ctx.strokeStyle = isFrozenByInfinity
    ? `rgba(200, 250, 255, ${0.65 * progress})`
    : `rgba(255, 238, 150, ${0.65 * progress})`;
  ctx.lineWidth = Math.max(1.0, 1.35 * pScale);
  ctx.beginPath();
  const ribbonSteps = 16;
  for (let s = 0; s <= ribbonSteps; s++) {
    const t = s / ribbonSteps;
    const rx = shaftStartX + t * (tipX - 6 * pScale - shaftStartX);
    const amp = (1 - t * 0.65) * 3.8 * pScale;
    const ry = Math.sin(t * Math.PI * 3.5 - time * 9.0) * amp;
    if (s === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.stroke();

  // Pinpoint glowing embers during stationary bow-channeling (matches flying ember wake)
  if (!isFlying) {
    const numSparks = 9;
    for (let i = 0; i < numSparks; i++) {
      const phase = ((time * 1.35 + i * 0.37) % 1.0);
      const sx = shaftStartX + 12 * pScale - phase * (drawW * 0.44);
      const sy = Math.sin(i * 2.7 + phase * 5.0) * (drawH * (0.08 + phase * 0.24));
      const sparkAlpha = Math.sin(phase * Math.PI) * progress;
      const rCore = (0.9 + (i % 3) * 0.45) * pScale;

      ctx.fillStyle = isFrozenByInfinity
        ? `rgba(0, 210, 255, ${sparkAlpha * 0.55})`
        : `rgba(255, 70, 15, ${sparkAlpha * 0.55})`;
      ctx.beginPath();
      ctx.arc(sx, sy, rCore * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isFrozenByInfinity
        ? `rgba(235, 255, 255, ${sparkAlpha})`
        : `rgba(255, 242, 160, ${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, rCore, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // (B) Dark Interior Arrow Shaft & Sleek Narrow Barbed Spine (Signature firearrowvfx.mp4 dark centerline)
  ctx.save();
  const shaftEndTipX = tipX - 1.5 * pScale;
  const barbBaseX = tipX - 24 * pScale;
  const barbWingX = barbBaseX - 5 * pScale;
  const barbHalfW = 3.2 * pScale;

  // Warm rim highlight along the dark shaft
  ctx.strokeStyle = isFrozenByInfinity
    ? `rgba(180, 245, 255, ${0.75 * progress})`
    : `rgba(255, 210, 110, ${0.75 * progress})`;
  ctx.lineWidth = Math.max(1.4, 2.2 * pScale);
  ctx.beginPath();
  ctx.moveTo(shaftStartX, 0);
  ctx.lineTo(shaftEndTipX, 0);
  ctx.stroke();

  // Razor-sharp dark crimson-obsidian physical arrow shaft & narrow arrowhead inside the fire cone
  ctx.strokeStyle = isFrozenByInfinity
    ? `rgba(8, 38, 68, ${0.88 * progress})`
    : `rgba(52, 8, 3, ${0.88 * progress})`;
  ctx.lineWidth = Math.max(0.9, 1.25 * pScale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(shaftStartX, 0);
  ctx.lineTo(shaftEndTipX, 0);
  ctx.stroke();

  // Sleek narrow interior arrowhead barbs
  ctx.fillStyle = isFrozenByInfinity
    ? `rgba(8, 38, 68, ${0.86 * progress})`
    : `rgba(56, 9, 4, ${0.86 * progress})`;
  ctx.beginPath();
  ctx.moveTo(shaftEndTipX, 0);
  ctx.lineTo(barbWingX, -barbHalfW);
  ctx.lineTo(barbBaseX, 0);
  ctx.lineTo(barbWingX, barbHalfW);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Renders the pixel-art Fuga explosion animation using frames 6 through 12.
 * Returns true if the sprite frame was rendered, or false if images are still loading (allowing procedural fallback).
 */
export function drawSukunaFugaExplosionSprite(ctx, exp, explosionProgress) {
  const frames = _getSukunaFugaExplosionFrames();
  if (!frames || frames.length === 0) return false;

  const clampedP = Math.max(0, Math.min(0.999, explosionProgress));
  const frameIdx = Math.min(frames.length - 1, Math.floor(clampedP * frames.length));
  const frameImg = frames[frameIdx];

  if (!frameImg || !frameImg.complete || frameImg.naturalWidth <= 0) {
    return false;
  }

  const R = exp.maxRadius || 220;
  const angle = exp.angle || 0;
  // Scale smoothly from initial detonation to full thermobaric blast envelope
  const scaleGrow = 0.85 + 0.32 * Math.pow(clampedP, 0.45);
  const drawW = R * 2.35 * scaleGrow;
  const drawH = drawW * (280 / 580);
  const alpha = clampedP > 0.85 ? Math.max(0, (1.0 - clampedP) / 0.15) : 1.0;

  ctx.save();
  ctx.rotate(angle);
  if (Math.abs(angle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  ctx.drawImage(frameImg, -drawW * 0.50, -drawH * 0.50, drawW, drawH);

  // Radiant Additive Thermobaric Explosion Bloom (Rule 11 & Rule 31 compliant)
  if (clampedP < 0.80) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bloomFade = Math.pow(1.0 - clampedP / 0.80, 1.35) * alpha;
    const bloomR = drawW * 0.48;
    const expBloom = ctx.createRadialGradient(0, 0, 0, 0, 0, bloomR);
    if (clampedP < 0.28) {
      // Peak incandescent detonation flash
      const flashA = (1.0 - clampedP / 0.28) * bloomFade;
      expBloom.addColorStop(0.00, `rgba(255, 255, 250, ${flashA * 0.95})`);
      expBloom.addColorStop(0.20, `rgba(255, 235, 160, ${flashA * 0.80})`);
      expBloom.addColorStop(0.50, `rgba(255, 120, 20, ${bloomFade * 0.50})`);
      expBloom.addColorStop(0.80, `rgba(220, 40, 5, ${bloomFade * 0.20})`);
      expBloom.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    } else {
      expBloom.addColorStop(0.00, `rgba(255, 210, 80, ${bloomFade * 0.65})`);
      expBloom.addColorStop(0.40, `rgba(255, 100, 15, ${bloomFade * 0.40})`);
      expBloom.addColorStop(0.75, `rgba(200, 30, 0, ${bloomFade * 0.15})`);
      expBloom.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = expBloom;
    ctx.beginPath();
    ctx.arc(0, 0, bloomR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
  return true;
}

function _renderVectorDivineFlameArrow(ctx, {
  scale = 1.0, progress = 1.0, isFlying = false, time = Date.now() * 0.012, isFrozenByInfinity = false
}) {
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5) || (state.fps && state.fps < 54)));

  const notchX = -32 * progress;
  const tipX = 28 * progress;
  const totalLen = tipX - notchX;
  const headLen = 22 * progress;
  const headX = tipX - headLen;

  // 1. OUTMOST SPATIAL DISTORTION AURA
  const auraR = (42 + progress * 28);
  const auraGrad = ctx.createRadialGradient(tipX * 0.2, 0, 4, tipX * 0.1, 0, auraR * 2.0);
  if (isFrozenByInfinity) {
    auraGrad.addColorStop(0, `rgba(224, 255, 255, ${0.65 * progress})`);
    auraGrad.addColorStop(0.25, `rgba(0, 229, 255, ${0.45 * progress})`);
    auraGrad.addColorStop(0.55, `rgba(0, 100, 255, ${0.25 * progress})`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    auraGrad.addColorStop(0, `rgba(255, 240, 160, ${0.5 * progress})`);
    auraGrad.addColorStop(0.25, `rgba(255, 140, 0, ${0.35 * progress})`);
    auraGrad.addColorStop(0.55, `rgba(200, 40, 0, ${0.18 * progress})`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.ellipse(tipX * 0.2, 0, auraR * 2.2, auraR * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Switch to ADDITIVE LIGHTING for hyper-realistic fire
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // ═════════════════════════════════════════════════════════
  // 2. ROARING FLAME TONGUES — long, turbulent, curling backward
  // Uses traveling wave + multi-frequency turbulence for fluid motion
  // ═════════════════════════════════════════════════════════
  const numTendrils = isLowQuality ? 4 : 8;
  for (let i = 0; i < numTendrils; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const ratio = i / (numTendrils - 1);
    const originX = tipX - ratio * totalLen;

    // Traveling wave with multi-frequency turbulence for fluid, smoke-like curling
    const flowPhase = time * 6.5 - ratio * 14.0 + i * 0.6;
    const turb1 = Math.sin(flowPhase) * 12;
    const turb2 = Math.sin(flowPhase * 1.7 + i * 1.1) * 6;
    const turb3 = Math.cos(flowPhase * 0.6 + i * 2.3) * 4;

    // Flames get dramatically longer toward the rear (velocity-stretched)
    const lenMultiplier = isFlying ? (1.0 + ratio * 1.8) : (1.0 + ratio * 0.8);
    const flameLen = (28 + turb1 + turb2 + ratio * 30) * progress * lenMultiplier;
    const spread = (8 + Math.cos(flowPhase * 0.85) * 6 + ratio * 14 + turb3) * progress;
    const wave = Math.sin(flowPhase * 1.4) * 7 * progress;

    // More control points for fluid S-curve motion
    ctx.beginPath();
    ctx.moveTo(originX, side * 2);
    ctx.bezierCurveTo(
      originX - flameLen * 0.25, side * (spread * 1.3 + wave),
      originX - flameLen * 0.55, side * (spread * 1.6 - wave * 0.8),
      originX - flameLen * 0.75, side * (spread * 1.1 + wave * 0.4)
    );
    ctx.bezierCurveTo(
      originX - flameLen * 0.9, side * (spread * 0.7),
      originX - flameLen, side * (spread * 0.3 + turb3 * 0.3),
      originX - flameLen, side * (spread * 0.15)
    );
    // Return path (thin inner edge)
    ctx.bezierCurveTo(
      originX - flameLen * 0.85, side * (spread * 0.2),
      originX - flameLen * 0.4, side * (spread * 0.15),
      originX, side * 2
    );
    ctx.closePath();

    if (isLowQuality) {
      // Fast path: reuse single flat fills instead of generating CPU linear gradients per tendril per frame
      ctx.fillStyle = isFrozenByInfinity 
        ? `rgba(0, ${150 + ratio * 105}, 255, ${progress * 0.7})` 
        : `rgba(255, ${100 + ratio * 155}, 0, ${progress * 0.7})`;
    } else {
      // Color cascade from white-hot to cyan/blue (if frozen) or crimson (if normal)
      const tGrad = ctx.createLinearGradient(originX, 0, originX - flameLen, side * spread * 0.5);
      if (isFrozenByInfinity) {
        if (ratio < 0.3) {
          tGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * progress})`);
          tGrad.addColorStop(0.3, `rgba(224, 255, 255, ${0.8 * progress})`);
          tGrad.addColorStop(0.6, `rgba(0, 229, 255, ${0.6 * progress})`);
          tGrad.addColorStop(1, 'rgba(0, 120, 255, 0)');
        } else if (ratio < 0.6) {
          tGrad.addColorStop(0, `rgba(0, 229, 255, ${0.85 * progress})`);
          tGrad.addColorStop(0.35, `rgba(0, 160, 255, ${0.65 * progress})`);
          tGrad.addColorStop(0.7, `rgba(0, 80, 220, ${0.4 * progress})`);
          tGrad.addColorStop(1, 'rgba(0, 30, 150, 0)');
        } else {
          tGrad.addColorStop(0, `rgba(0, 180, 255, ${0.75 * progress})`);
          tGrad.addColorStop(0.3, `rgba(0, 100, 240, ${0.55 * progress})`);
          tGrad.addColorStop(0.65, `rgba(0, 40, 180, ${0.3 * progress})`);
          tGrad.addColorStop(1, 'rgba(0, 15, 100, 0)');
        }
      } else {
        if (ratio < 0.3) {
          tGrad.addColorStop(0, `rgba(255, 255, 245, ${0.9 * progress})`);
          tGrad.addColorStop(0.3, `rgba(255, 245, 160, ${0.75 * progress})`);
          tGrad.addColorStop(0.6, `rgba(255, 180, 40, ${0.5 * progress})`);
          tGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
        } else if (ratio < 0.6) {
          tGrad.addColorStop(0, `rgba(255, 220, 80, ${0.85 * progress})`);
          tGrad.addColorStop(0.35, `rgba(255, 150, 10, ${0.7 * progress})`);
          tGrad.addColorStop(0.7, `rgba(230, 60, 0, ${0.4 * progress})`);
          tGrad.addColorStop(1, 'rgba(150, 15, 0, 0)');
        } else {
          tGrad.addColorStop(0, `rgba(255, 160, 30, ${0.75 * progress})`);
          tGrad.addColorStop(0.3, `rgba(220, 70, 0, ${0.55 * progress})`);
          tGrad.addColorStop(0.65, `rgba(160, 20, 0, ${0.3 * progress})`);
          tGrad.addColorStop(1, 'rgba(80, 5, 0, 0)');
        }
      }
      ctx.fillStyle = tGrad;
    }
    ctx.fill();
  }

  // ═════════════════════════════════════════════════════════
  // 3. TWIN FIERY TAIL FLETCHING (Rear Plumes at notchX)
  // Wild streaming plumes that convey unstoppable momentum
  // ═════════════════════════════════════════════════════════
  for (let side of [-1, 1]) {
    const tailPhase = time * 7.5 + side * 1.5;
    const plumeScale = isFlying ? 0.7 : 1.0;
    const fletchLen = (40 + Math.sin(tailPhase) * 10) * progress * plumeScale;
    const fletchSpread = (isFlying ? 7 : (20 + Math.cos(tailPhase * 0.8) * 7)) * progress;

    ctx.beginPath();
    ctx.moveTo(notchX + 8 * progress, 0);
    ctx.bezierCurveTo(
      notchX - fletchLen * 0.3, side * fletchSpread * 0.4,
      notchX - fletchLen * 0.7, side * fletchSpread * 1.4,
      notchX - fletchLen, side * fletchSpread * 1.1
    );
    ctx.bezierCurveTo(
      notchX - fletchLen * 0.8, side * fletchSpread * 0.6,
      notchX - fletchLen * 0.35, side * 3,
      notchX + 8 * progress, 0
    );
    ctx.closePath();

    const flGrad = ctx.createLinearGradient(notchX, 0, notchX - fletchLen, side * fletchSpread);
    flGrad.addColorStop(0, `rgba(255, 250, 200, ${0.95 * progress})`);
    flGrad.addColorStop(0.25, `rgba(255, 180, 30, ${0.85 * progress})`);
    flGrad.addColorStop(0.55, `rgba(240, 80, 0, ${0.55 * progress})`);
    flGrad.addColorStop(0.8, `rgba(180, 20, 0, ${0.3 * progress})`);
    flGrad.addColorStop(1, 'rgba(80, 0, 0, 0)');
    ctx.fillStyle = flGrad;
    ctx.fill();
  }

  // ═════════════════════════════════════════════════════════
  // 4. MOLTEN LAVA SHAFT & INCANDESCENT CORE
  // ═════════════════════════════════════════════════════════
  const shaftGrad = ctx.createLinearGradient(notchX, 0, headX + 4, 0);
  shaftGrad.addColorStop(0, `rgba(255, 90, 0, ${0.75 * progress})`);
  shaftGrad.addColorStop(0.3, `rgba(255, 180, 30, ${0.9 * progress})`);
  shaftGrad.addColorStop(0.7, `rgba(255, 245, 160, ${0.95 * progress})`);
  shaftGrad.addColorStop(1, `rgba(255, 255, 240, 1.0)`);

  ctx.beginPath();
  ctx.moveTo(notchX, -2.5 * progress);
  ctx.lineTo(headX + 4, -4 * progress);
  ctx.lineTo(headX + 4, 4 * progress);
  ctx.lineTo(notchX, 2.5 * progress);
  ctx.closePath();
  ctx.fillStyle = shaftGrad;
  ctx.fill();

  // White incandescent inner core spine line
  ctx.beginPath();
  ctx.moveTo(notchX + 4 * progress, 0);
  ctx.lineTo(headX + 6, 0);
  ctx.strokeStyle = `rgba(255, 255, 255, ${progress})`;
  ctx.lineWidth = 2.5 * progress;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Intricate Magma / Lava Crack Patterns along shaft (skipped in low quality mode)
  if (!isLowQuality) {
    ctx.strokeStyle = `rgba(255, 235, 130, ${0.95 * progress})`;
    ctx.lineWidth = 1.3 * progress;
    const numCracks = 6;
    for (let c = 0; c < numCracks; c++) {
      const cx = notchX + (c + 0.5) * ((headX - notchX) / numCracks);
      const side = c % 2 === 0 ? 1 : -1;
      const cWobble = Math.sin(time * 3 + c * 2) * 2;

      ctx.beginPath();
      ctx.moveTo(cx - 6, side * 0.5);
      ctx.quadraticCurveTo(cx, side * (4.5 + cWobble), cx + 7, side * 1.2);
      ctx.stroke();
    }
  }

  // ═════════════════════════════════════════════════════════
  // 5. VOLCANIC OBSIDIAN MAGMA ARROWHEAD
  // ═════════════════════════════════════════════════════════
  const tipApexX = tipX + 6 * progress;
  const barbX = headX - 6 * progress;
  const barbY = 17 * progress;

  // (A) Dark Volcanic Crystalline Base Plate
  ctx.beginPath();
  ctx.moveTo(tipApexX, 0);
  ctx.quadraticCurveTo(tipApexX - 10 * progress, -barbY * 0.5, barbX, -barbY);
  ctx.quadraticCurveTo(headX + 4 * progress, -barbY * 0.4, headX + 2 * progress, 0);
  ctx.quadraticCurveTo(headX + 4 * progress, barbY * 0.4, barbX, barbY);
  ctx.quadraticCurveTo(tipApexX - 10 * progress, barbY * 0.5, tipApexX, 0);
  ctx.closePath();

  const obsidianGrad = ctx.createLinearGradient(barbX, 0, tipApexX, 0);
  obsidianGrad.addColorStop(0, `rgba(140, 10, 0, ${0.95 * progress})`);
  obsidianGrad.addColorStop(0.4, `rgba(220, 60, 0, ${0.95 * progress})`);
  obsidianGrad.addColorStop(0.8, `rgba(255, 180, 30, ${0.98 * progress})`);
  obsidianGrad.addColorStop(1, `rgba(255, 255, 220, 1.0)`);
  ctx.fillStyle = obsidianGrad;
  ctx.fill();

  // Dark volcanic rock contour lines
  ctx.strokeStyle = `rgba(80, 0, 0, ${0.85 * progress})`;
  ctx.lineWidth = 1.5 * progress;
  ctx.stroke();

  // (B) Lava Veins inside Arrowhead Plate
  ctx.strokeStyle = `rgba(255, 240, 160, ${0.95 * progress})`;
  ctx.lineWidth = 1.6 * progress;
  
  // Center vein
  ctx.beginPath();
  ctx.moveTo(headX + 2 * progress, 0);
  ctx.lineTo(tipApexX - 2 * progress, 0);
  ctx.stroke();

  // Branching veins to top & bottom barb wings
  for (let side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(headX + 6 * progress, 0);
    ctx.quadraticCurveTo(headX + 10 * progress, side * (barbY * 0.4), barbX + 4 * progress, side * (barbY * 0.85));
    ctx.stroke();
  }

  // (C) Dripping Molten Lava Droplets from Barb Wing Tips
  for (let side of [-1, 1]) {
    const dripLen = (6 + Math.sin(time * 4 + side * 2) * 3) * progress;
    const dripX = barbX - dripLen * 0.8;
    const dripY = side * (barbY + dripLen * 0.5);

    ctx.beginPath();
    ctx.moveTo(barbX, side * barbY);
    ctx.quadraticCurveTo(dripX, side * (barbY + 2), dripX - 2 * progress, dripY);
    ctx.arc(dripX - 2 * progress, dripY, 2.2 * progress, 0, Math.PI * 2);
    ctx.closePath();

    if (isLowQuality) {
      ctx.fillStyle = `rgba(255, 180, 0, ${0.9 * progress})`;
      ctx.fill();
    } else {
      const dripGrad = ctx.createRadialGradient(dripX, dripY, 0, dripX, dripY, 4 * progress);
      dripGrad.addColorStop(0, `rgba(255, 255, 220, ${progress})`);
      dripGrad.addColorStop(0.5, `rgba(255, 140, 0, ${0.9 * progress})`);
      dripGrad.addColorStop(1, 'rgba(180, 20, 0, 0)');
      ctx.fillStyle = dripGrad;
      ctx.fill();
    }
  }

  // (D) Blinding White Nose Tip Flare
  if (isLowQuality) {
    ctx.fillStyle = `rgba(255, 250, 200, ${0.85 * progress})`;
    ctx.beginPath();
    ctx.arc(tipApexX, 0, 14 * progress, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const tipGlow = ctx.createRadialGradient(tipApexX, 0, 0, tipApexX, 0, 16 * progress);
    tipGlow.addColorStop(0, `rgba(255, 255, 255, ${progress})`);
    tipGlow.addColorStop(0.3, `rgba(255, 250, 200, ${0.9 * progress})`);
    tipGlow.addColorStop(0.6, `rgba(255, 200, 80, ${0.5 * progress})`);
    tipGlow.addColorStop(1, 'rgba(255, 90, 0, 0)');
    ctx.fillStyle = tipGlow;
    ctx.beginPath();
    ctx.arc(tipApexX, 0, 16 * progress, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // Restore globalCompositeOperation ('lighter')
}
