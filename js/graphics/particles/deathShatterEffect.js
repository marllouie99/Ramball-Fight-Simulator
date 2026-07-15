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

export function spawnMachineCorpse(x, y, angle) {
  // Spawn a large "dead turret" piece that stays on the floor where it was destroyed
  state.deathEffects.push({
    x: x,
    y: y,
    vx: 0,
    vy: 0,
    size: 15,
    rotation: angle,
    rotSpeed: (Math.random() - 0.5) * 0.1,
    color: '#333',
    life: 1.0,
    decay: 0.005, // Fades out completely in ~3.3 seconds (200 frames)
    friction: 0.90, // Strong friction to stop it quickly
    gravity: 0, // No gravity in a top-down game!
    isMachineCorpse: true
  });
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
    
    if (!effect.isMachineCorpse) {
      // Apply gravity and physics for standard shards
      effect.vy += effect.gravity;
      effect.vx *= 0.98;
      effect.vy *= 0.98;
      effect.rotation += effect.rotationSpeed;
    } else {
      // Machine corpse occasionally emits smoke sparks
      if (Math.random() < 0.15) {
        import('./sparkEffect.js').then(module => {
           module.spawnSparks(effect.x + (Math.random()-0.5)*10, effect.y + (Math.random()-0.5)*10, 1, 'gray');
        });
      }
    }
    
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
    ctx.globalAlpha = Math.min(1, effect.life);
    if (effect.isMachineCorpse) {
      const s = effect.size / 15; // default size is 15
      ctx.scale(s, s);
      
      // Base scorch mark on the ground
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      const legColor = '#2A2A2A';
      const legStroke = '#111';
      
      // Broken tripod leg 1 (bent)
      ctx.save();
      ctx.fillStyle = legColor; ctx.strokeStyle = legStroke; ctx.lineWidth = 1.5;
      ctx.rotate(-Math.PI / 2 + 0.3);
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(6, 20); ctx.lineTo(-6, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();

      // Broken tripod leg 2 (detached and laying flat)
      ctx.save();
      ctx.fillStyle = legColor; ctx.strokeStyle = legStroke; ctx.lineWidth = 1.5;
      ctx.translate(12, 10);
      ctx.rotate(Math.PI / 2 + 0.5);
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(4, 15); ctx.lineTo(-4, 15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();

      // Broken tripod leg 3 (intact but scorched)
      ctx.save();
      ctx.fillStyle = legColor; ctx.strokeStyle = legStroke; ctx.lineWidth = 1.5;
      ctx.rotate(5 * Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(4, 22); ctx.lineTo(-4, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();

      // Destroyed central hub/body
      ctx.fillStyle = '#333';
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // A detached ammo drum/magazine lying on the ground
      ctx.save();
      ctx.translate(16, 6);
      ctx.rotate(1.2);
      ctx.fillStyle = '#222';
      ctx.fillRect(-6, -8, 12, 16);
      ctx.strokeRect(-6, -8, 12, 16);
      ctx.restore();

      // Fallen dome/sensor head (tilted to the side)
      ctx.save();
      ctx.translate(-6, 4);
      ctx.rotate(-2.2);
      
      // Dome base
      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.arc(0, 0, 11, Math.PI, 2 * Math.PI);
      ctx.lineTo(11, 4);
      ctx.quadraticCurveTo(0, 7, -11, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Broken glass / cracked sensor screen
      ctx.fillStyle = '#111';
      ctx.fillRect(-5, -7, 10, 5);
      ctx.strokeStyle = '#555';
      ctx.beginPath();
      ctx.moveTo(-5, -7); ctx.lineTo(-2, -4);
      ctx.moveTo(5, -7); ctx.lineTo(2, -3);
      ctx.stroke();

      // Blinking red malfunction light (spasmodic)
      if (Math.random() < 0.25) {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(-2, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(-2, -5, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    } else {
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
    }
    
    ctx.restore();
  }
}