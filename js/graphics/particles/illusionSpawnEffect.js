// ─────────────────────────────────────────────
// ILLUSION SPAWN EFFECT (Optimized)
// Creates a smooth, zero-GC, fast-rendering visual effect when illusions spawn
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';

// ─────────────────────────────────────────────
// INTERNAL OBJECT POOL (Zero GC design)
// ─────────────────────────────────────────────
const SPAWN_POOL_SIZE = 120;
const _spawnPool = [];

for (let i = 0; i < SPAWN_POOL_SIZE; i++) {
  _spawnPool.push({
    x: 0, y: 0, vx: 0, vy: 0,
    size: 0, color: null, life: 0, decay: 0, type: null
  });
}

function _getSpawnParticle() {
  return _spawnPool.length > 0 ? _spawnPool.pop() : {
    x: 0, y: 0, vx: 0, vy: 0,
    size: 0, color: null, life: 0, decay: 0, type: null
  };
}

function _returnSpawnParticle(p) {
  p.color = null;
  p.type = null;
  _spawnPool.push(p);
}

// ─────────────────────────────────────────────
// PRE-RENDERED SMOKE GRADIENT CANVAS
// ─────────────────────────────────────────────
let smokeCanvas = null;

function _initSmokeCanvas() {
  if (typeof document === 'undefined' || smokeCanvas) return;

  smokeCanvas = document.createElement('canvas');
  smokeCanvas.width = 128;
  smokeCanvas.height = 128;
  const sCtx = smokeCanvas.getContext('2d');
  
  // Create a soft purple radial gradient (matching #9b59b6)
  const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(155, 89, 182, 0.75)');
  grad.addColorStop(1, 'rgba(155, 89, 182, 0.0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
}

/**
 * Spawns an illusion spawn effect at the illusion's position.
 * @param {Object} illusion - The illusion that was spawned
 */
export function spawnIllusionSpawn(illusion) {
  const is1v2 = typeof state !== 'undefined' && state.mode && (state.mode === '1v2' || state.mode.includes('1v2'));
  const divisor = is1v2 ? 2.5 : 1.8; // Reduce particle count in complex team modes
  
  const scale = Math.max(0.2, (illusion.r || 25) / 25);
  const ringCount = Math.max(2, Math.ceil((12 * scale) / divisor));
  const smokeCount = Math.max(2, Math.ceil((15 * scale) / divisor));
  const sparkCount = Math.max(2, Math.ceil((8 * scale) / divisor));
  
  const smokeColor = '#9b59b6'; // Deep purple
  const sparkColor = '#f1c40f'; // Bright yellow/gold for contrast

  // 1. Central Implosion/Explosion Ring
  for (let i = 0; i < ringCount; i++) {
    const angle = (Math.PI * 2 * i) / ringCount;
    const speed = 3 + Math.random() * 2;
    const p = _getSpawnParticle();
    p.x = illusion.x;
    p.y = illusion.y;
    p.vx = Math.cos(angle) * speed * 0.5;
    p.vy = Math.sin(angle) * speed * 0.5;
    p.size = (illusion.r || 25) * (0.1 + Math.random() * 0.2);
    p.color = smokeColor;
    p.life = 1.0;
    p.decay = 0.02 + Math.random() * 0.015;
    p.type = 'ring';
    state.illusionSpawnEffects.push(p);
  }

  // 2. Smoky Burst
  for (let i = 0; i < smokeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2.5;
    const p = _getSpawnParticle();
    p.x = illusion.x;
    p.y = illusion.y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = (illusion.r || 25) * (0.4 + Math.random() * 0.5);
    p.color = smokeColor;
    p.life = 1.0;
    p.decay = 0.015 + Math.random() * 0.01;
    p.type = 'smoke';
    state.illusionSpawnEffects.push(p);
  }
  
  // 3. Sharp Sparks
  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 3;
    const p = _getSpawnParticle();
    p.x = illusion.x;
    p.y = illusion.y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = 2 + Math.random() * 2;
    p.color = sparkColor;
    p.life = 1.0;
    p.decay = 0.04 + Math.random() * 0.02;
    p.type = 'spark';
    state.illusionSpawnEffects.push(p);
  }
}

/**
 * Updates all illusion spawn effects.
 */
export function updateIllusionSpawnEffects() {
  for (let i = state.illusionSpawnEffects.length - 1; i >= 0; i--) {
    const p = state.illusionSpawnEffects[i];
    
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    switch (p.type) {
      case 'ring':
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.size *= 0.98;
        break;
      case 'smoke':
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.size *= 0.96;
        break;
      case 'spark':
        p.vx *= 0.98;
        p.vy *= 0.98;
        break;
    }
    
    if (p.life <= 0) {
      state.illusionSpawnEffects[i] = state.illusionSpawnEffects[state.illusionSpawnEffects.length - 1];
      state.illusionSpawnEffects.pop();
      _returnSpawnParticle(p);
    }
  }
}

/**
 * Draws all illusion spawn effects.
 */
export function drawIllusionSpawnEffects() {
  const { ctx } = state;
  if (!ctx || state.illusionSpawnEffects.length === 0) return;
  
  _initSmokeCanvas();
  ctx.save();
  
  for (let i = 0; i < state.illusionSpawnEffects.length; i++) {
    const p = state.illusionSpawnEffects[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);

    switch (p.type) {
      case 'ring':
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        break;

      case 'smoke':
        if (smokeCanvas) {
          ctx.drawImage(smokeCanvas, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
        break;
        
      case 'spark':
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 0.5, p.y - p.vy * 0.5);
        ctx.lineTo(p.x + p.vx * 0.5, p.y + p.vy * 0.5);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.stroke();
        break;
    }
    
    ctx.restore();
  }
  
  ctx.restore();
}
