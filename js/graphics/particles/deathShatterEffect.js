// ─────────────────────────────────────────────
// DEATH SHATTER EFFECT
// Creates a shattering body effect when fighters die
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';

/**
 * Spawns a death shatter effect at the fighter's position.
 * @param {Object} fighter - The fighter that died
 */
export function spawnDeathShatter(fighter) {
  const isMulti = state && (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.FFA);
  
  // OPTIMIZED: Apply quality level to death effect limits
  const qualityMultiplier = state.qualityLevel || 1.0;
  const MAX_DEATH_EFFECTS = Math.floor((isMulti ? 20 : 50) * qualityMultiplier);
  
  // OPTIMIZED: Reduce shard count based on quality level
  const baseShardCount = isMulti ? 6 : 12;
  const shardCount = Math.max(3, Math.floor(baseShardCount * qualityMultiplier));
  const baseSpeed = 3;    // Base outward velocity
  const color = fighter.color || '#ff4444';
  
  for (let i = 0; i < shardCount; i++) {
    // If we reached the global limit, remove the oldest death effect using swap-and-pop
    if (state.deathEffects.length >= MAX_DEATH_EFFECTS) {
      // Swap-and-pop is O(1) instead of O(n) shift()
      state.deathEffects[0] = state.deathEffects[state.deathEffects.length - 1];
      state.deathEffects.pop();
    }
    
    // Random angle for each shard
    const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.5;
    const speed = baseSpeed + Math.random() * 2;
    
    // Random size for each shard
    const size = fighter.r * (0.15 + Math.random() * 0.25);
    
    state.deathEffects.push({
      x: fighter.x,
      y: fighter.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      size: size,
      color: color,
      life: 1.0,           // 1.0 = full life, 0 = dead
      maxLife: 1.0,
      decay: 0.02 + Math.random() * 0.01, // How fast it fades
      gravity: 0.05,       // Slight downward pull
    });
  }
}

/**
 * Updates all death shatter effects.
 */
export function updateDeathEffects() {
  for (let i = state.deathEffects.length - 1; i >= 0; i--) {
    const effect = state.deathEffects[i];
    
    // Update position
    effect.x += effect.vx;
    effect.y += effect.vy;
    
    // Apply gravity
    effect.vy += effect.gravity;
    
    // Slow down over time (air resistance)
    effect.vx *= 0.98;
    effect.vy *= 0.98;
    
    // Update rotation
    effect.rotation += effect.rotationSpeed;
    
    // Fade out
    effect.life -= effect.decay;
    
    // Remove dead effects
    if (effect.life <= 0) {
      state.deathEffects.splice(i, 1);
    }
  }
}

/**
 * Draws all death shatter effects.
 */
export function drawDeathEffects() {
  const { ctx } = state;
  for (const effect of state.deathEffects) {
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.rotate(effect.rotation);
    ctx.globalAlpha = effect.life;
    
    // Draw a triangular shard
    ctx.beginPath();
    ctx.moveTo(0, -effect.size);
    ctx.lineTo(effect.size * 0.6, effect.size * 0.5);
    ctx.lineTo(-effect.size * 0.6, effect.size * 0.5);
    ctx.closePath();
    
    // Fill with fighter's color
    ctx.fillStyle = effect.color;
    ctx.fill();
    
    // Add a darker edge for depth
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  }
}