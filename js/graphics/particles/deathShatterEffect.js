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
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  
  // OPTIMIZED: Apply quality level to death effect limits
  const qualityMultiplier = state.qualityLevel || 1.0;
  const MAX_DEATH_EFFECTS = Math.floor((isMulti ? 20 : 50) * qualityMultiplier);
  
  // OPTIMIZED: Reduce shard count based on quality level
  const baseShardCount = isMulti ? 8 : 14;
  const shardCount = Math.max(4, Math.floor(baseShardCount * qualityMultiplier));
  const baseSpeed = 4.5;    // Outward explosive velocity
  const isYuta = fighter.characterId === 'yuta' || fighter.type === 'yuta';
  let primaryColor = fighter.color || '#ff4444';
  if (isYuta) {
    primaryColor = '#FFFFFF';
  } else if (primaryColor === '#ffffff' || primaryColor === '#fff' || primaryColor === '#FFFFFF') {
    primaryColor = fighter.secondaryColor || '#64748b';
  }
  const secondaryColor = isYuta ? '#1E293B' : (fighter.secondaryColor || '#881337');
  
  for (let i = 0; i < shardCount; i++) {
    // If we reached the global limit, remove the oldest death effect using swap-and-pop
    if (state.deathEffects.length >= MAX_DEATH_EFFECTS) {
      state.deathEffects[0] = state.deathEffects[state.deathEffects.length - 1];
      state.deathEffects.pop();
    }
    
    // Random angle for each shard
    const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.5;
    const speed = baseSpeed + Math.random() * 4.0;
    
    // Random size for each shard
    const size = fighter.r * (0.18 + Math.random() * 0.28);
    let shardColor;
    if (isYuta) {
      const roll = i % 3;
      shardColor = (roll === 0) ? '#FFFFFF' : ((roll === 1) ? '#1E293B' : '#FF1493');
    } else {
      shardColor = i % 2 === 0 ? primaryColor : secondaryColor;
    }
    
    state.deathEffects.push({
      x: fighter.x,
      y: fighter.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (1.0 + Math.random() * 2.0), // Explosive vertical kick
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.45,
      size: size,
      color: shardColor,
      life: 1.0,           // 1.0 = full life, 0 = dead
      maxLife: 1.0,
      decay: 0.015 + Math.random() * 0.008, // Smooth fade-out
      gravity: 0.12,       // Downward gravity pull to floor
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

export function spawnHollowMaskShatter(fighter) {
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const qualityMultiplier = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const shardCount = Math.max(8, Math.floor((isMulti ? 10 : 16) * qualityMultiplier));
  const baseSpeed = 5.2;

  // Play crisp porcelain glass breaking sound effect
  if (typeof audioSystem !== 'undefined') {
    audioSystem.playSFX('Assets/Sound Effects/Skills/thin-ice-breaker.mp3', 0.85);
  }

  for (let i = 0; i < shardCount; i++) {
    if (state.deathEffects && state.deathEffects.length >= 60) {
      state.deathEffects.shift();
    }

    const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.6;
    const speed = baseSpeed + Math.random() * 4.5;
    const size = (fighter.r || 25) * (0.16 + Math.random() * 0.22);
    const hasStripe = i % 3 === 0;

    state.deathEffects.push({
      x: fighter.x + (Math.random() - 0.5) * (fighter.r * 0.8),
      y: fighter.y - fighter.r * 0.2 + (Math.random() - 0.5) * (fighter.r * 0.8),
      vx: Math.cos(angle) * speed + (fighter.vx || 0) * 0.3,
      vy: Math.sin(angle) * speed - (1.5 + Math.random() * 3.0),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.55,
      size: size,
      color: '#FFFFFF',
      hasRedStripe: hasStripe,
      isHollowMaskShard: true,
      life: 1.0,
      maxLife: 1.0,
      decay: 0.016 + Math.random() * 0.008,
      gravity: 0.16
    });
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
    if (effect.isHollowMaskShard) {
      const s = effect.size;
      // Draw sharp polygonal porcelain mask fragment
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.1);
      ctx.lineTo(s * 0.85, -s * 0.2);
      ctx.lineTo(s * 0.65, s * 0.85);
      ctx.lineTo(-s * 0.75, s * 0.6);
      ctx.closePath();

      // White porcelain mask fill
      ctx.fillStyle = effect.color || '#FFFFFF';
      ctx.fill();

      // Red visceral Hollow marking stripe on select shards
      if (effect.hasRedStripe) {
        ctx.fillStyle = '#DC143C';
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.9);
        ctx.lineTo(s * 0.4, -s * 0.1);
        ctx.lineTo(s * 0.1, s * 0.5);
        ctx.lineTo(-s * 0.4, -s * 0.3);
        ctx.closePath();
        ctx.fill();
      }

      // Crisp dark manga ink border outline
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Glowing crimson cursed trail aura motes
      if (effect.life > 0.3 && Math.random() < 0.25) {
        ctx.fillStyle = 'rgba(220, 20, 20, 0.6)';
        ctx.beginPath();
        ctx.arc(-s * 0.3, s * 0.3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (effect.isMachineCorpse) {
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