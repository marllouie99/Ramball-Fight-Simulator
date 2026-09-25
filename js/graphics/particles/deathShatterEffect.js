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
  if (fighter.characterId === 'eye_of_cthulhu' || fighter.type === 'eye_of_cthulhu' || fighter.isServantOfCthulhu) {
    return spawnEyeOfCthulhuTerrariaDeath(fighter, Boolean(fighter.isServantOfCthulhu));
  }

  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  
  // OPTIMIZED: Apply quality level to death effect limits
  const qualityMultiplier = state.qualityLevel || 1.0;
  const MAX_DEATH_EFFECTS = Math.floor((isMulti ? 20 : 50) * qualityMultiplier);
  
  // OPTIMIZED: Reduce shard count based on quality level
  const baseShardCount = isMulti ? 8 : 14;
  const isYuta = fighter.characterId === 'yuta' || fighter.type === 'yuta';
  const isRika = Boolean(fighter.isRika || fighter.type === 'rika' || fighter.characterId === 'rika');
  const shardCount = isRika ? Math.max(12, Math.floor(20 * qualityMultiplier)) : Math.max(4, Math.floor(baseShardCount * qualityMultiplier));
  const baseSpeed = isRika ? 5.5 : 4.5;    // Outward explosive velocity
  let primaryColor = fighter.color || '#ff4444';
  if (isRika) {
    primaryColor = '#FFFFFF';
  } else if (isYuta) {
    primaryColor = '#FFFFFF';
  } else if (primaryColor === '#ffffff' || primaryColor === '#fff' || primaryColor === '#FFFFFF') {
    primaryColor = fighter.secondaryColor || '#64748b';
  }
  const secondaryColor = isRika ? '#FF1493' : (isYuta ? '#1E293B' : (fighter.secondaryColor || '#881337'));
  
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
    const size = (fighter.r || 30) * (0.18 + Math.random() * 0.28);
    let shardColor;
    if (isRika) {
      const roll = i % 4;
      shardColor = (roll === 0) ? '#FFFFFF' : ((roll === 1) ? '#E4E0EC' : ((roll === 2) ? '#FF1493' : '#111114'));
    } else if (isYuta) {
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

/**
 * Spawns an authentic Terraria-style gore shatter death effect for Eye of Cthulhu.
 * Drops distinct anatomical gore chunks (optic nerve tendril bundle, curved sclera shells with veins,
 * pupil/iris in phase 1 or fanged jaws in phase 2, and visceral pixelated meat gibs).
 * @param {Object} fighter - The Eye of Cthulhu fighter or minion entity that died
 * @param {boolean} isMinion - True if this is a Servant of Cthulhu minion
 */
export function spawnEyeOfCthulhuTerrariaDeath(fighter, isMinion = false) {
  const qualityMultiplier = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const MAX_DEATH_EFFECTS = Math.floor((isMulti ? 40 : 100) * qualityMultiplier);

  const isPhase2 = Boolean(
    fighter.isPhase2 ||
    fighter._isPhase2 ||
    fighter.aiState === 'P2_CHASE' ||
    fighter.aiState === 'P2_CHAIN_DASH' ||
    fighter.aiState === 'P2_ROAR' ||
    fighter.hasTransformed
  );

  const baseR = fighter.r || (isMinion ? 10 : 32);
  const goreDefs = [
    // 1. Optic Nerve Tendril Cluster
    { type: 'eoc_nerve_tendril', size: baseR * 0.45, color: '#881337', angleOffset: Math.PI },
    // 2. Upper Sclera Shell (with red branching veins)
    { type: 'eoc_sclera_top', size: baseR * 0.50, color: '#F8FAFC', angleOffset: -Math.PI / 2 },
    // 3. Lower Sclera Shell (with crimson torn edges)
    { type: 'eoc_sclera_bottom', size: baseR * 0.46, color: '#E2E8F0', angleOffset: Math.PI / 2 },
  ];

  if (isPhase2) {
    // Phase 2: Upper and Lower razor fanged jaws
    goreDefs.push(
      { type: 'eoc_fanged_maw_top', size: baseR * 0.44, color: '#7F1D1D', angleOffset: -0.3 },
      { type: 'eoc_fanged_maw_bottom', size: baseR * 0.42, color: '#991B1B', angleOffset: 0.3 }
    );
  } else {
    // Phase 1: Iris & Pupil core chunk
    goreDefs.push(
      { type: 'eoc_iris_pupil', size: baseR * 0.42, color: '#06B6D4', angleOffset: 0 }
    );
  }

  // Add visceral organic gib chunks
  const gibCount = isMinion ? 3 : Math.max(4, Math.floor(7 * qualityMultiplier));
  const gibColors = ['#DC2626', '#991B1B', '#881337', '#06B6D4', '#F8FAFC', '#4C0519', '#7F1D1D'];
  for (let g = 0; g < gibCount; g++) {
    goreDefs.push({
      type: 'eoc_visceral_chunk',
      size: baseR * (0.18 + Math.random() * 0.16),
      color: gibColors[g % gibColors.length],
      angleOffset: (Math.PI * 2 * g) / gibCount
    });
  }

  const baseSpeed = isMinion ? 3.5 : 5.8;

  for (let i = 0; i < goreDefs.length; i++) {
    if (state.deathEffects.length >= MAX_DEATH_EFFECTS) {
      // Prioritize removing non-permanent temporary shards first so permanent boss gore stays
      const nonPermIndex = state.deathEffects.findIndex(e => !e.isEyeOfCthulhuGore && !e.isPermanentGore);
      if (nonPermIndex !== -1) {
        state.deathEffects.splice(nonPermIndex, 1);
      } else if (state.deathEffects.length > 80) {
        state.deathEffects.shift();
      }
    }

    const def = goreDefs[i];
    const angle = def.angleOffset !== undefined
      ? def.angleOffset + (Math.random() - 0.5) * 0.6
      : (Math.PI * 2 * i) / goreDefs.length + (Math.random() - 0.5) * 0.5;

    const speed = baseSpeed + Math.random() * (isMinion ? 2.5 : 4.5);

    state.deathEffects.push({
      x: fighter.x + (Math.random() - 0.5) * (baseR * 0.4),
      y: fighter.y + (Math.random() - 0.5) * (baseR * 0.4),
      vx: Math.cos(angle) * speed + (fighter.vx || 0) * 0.25,
      vy: Math.sin(angle) * speed - ((isMinion ? 1.5 : 2.5) + Math.random() * 3.0),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.45,
      size: def.size,
      color: def.color,
      goreType: def.type,
      isEyeOfCthulhuGore: true,
      isPermanentGore: true,
      life: 1.0,
      maxLife: 1.0,
      decay: 0, // Permanent: stays on the arena floor
      gravity: 0.15,
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
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : null;

  for (let i = state.deathEffects.length - 1; i >= 0; i--) {
    const effect = state.deathEffects[i];
    
    // Update position
    effect.x += effect.vx;
    effect.y += effect.vy;
    
    if (effect.isEyeOfCthulhuGore || effect.isPermanentGore) {
      // Eye of Cthulhu Terraria Gore: flies in arc, decelerates on ground, and STAYS permanently on the arena
      effect.vy += (effect.gravity || 0.15);
      effect.vx *= 0.94;
      effect.vy *= 0.94;
      effect.rotation += effect.rotationSpeed;
      effect.rotationSpeed *= 0.94;

      // Stop completely once settled on the ground
      if (Math.hypot(effect.vx, effect.vy) < 0.12) {
        effect.vx = 0;
        effect.vy = 0;
        effect.rotationSpeed = 0;
      }

      // Clamp inside arena boundaries so gore stays on the arena floor
      if (arena) {
        const ar = arena.radius || (arena.width / 2);
        const cx = arena.x + arena.width / 2;
        const cy = arena.y + arena.height / 2;
        const dist = Math.hypot(effect.x - cx, effect.y - cy);
        const maxR = ar - (effect.size || 10) - 6;
        if (dist > maxR && dist > 0) {
          effect.x = cx + ((effect.x - cx) / dist) * maxR;
          effect.y = cy + ((effect.y - cy) / dist) * maxR;
          effect.vx = -effect.vx * 0.35;
          effect.vy = -effect.vy * 0.35;
        }
      }

      // Trail blood sparks while actively airborne
      if (Math.hypot(effect.vx, effect.vy) > 1.2 && Math.random() < 0.15) {
        import('./sparkEffect.js').then(module => {
          module.spawnSparks(effect.x + (Math.random() - 0.5) * 4, effect.y + (Math.random() - 0.5) * 4, 1, 'bloodSpark', '#E11D48');
        });
      }

      // Permanent gore: DO NOT DECAY! Keep effect.life = 1.0
      effect.life = 1.0;
      continue;
    }

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
    effect.life -= (effect.decay || 0.015);
    
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
    ctx.globalAlpha = Math.min(1, Math.max(0, effect.life));

    if (effect.isEyeOfCthulhuGore) {
      drawTerrariaEyeGore(ctx, effect);
    } else if (effect.isHollowMaskShard) {
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

/**
 * Renders an authentic pixel art Terraria gore chunk for the Eye of Cthulhu death shatter.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} effect
 */
export function drawTerrariaEyeGore(ctx, effect) {
  const s = effect.size || 12;

  switch (effect.goreType) {
    case 'eoc_nerve_tendril': {
      // Optic nerve root muscle
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.4);
      ctx.lineTo(s * 0.2, -s * 0.5);
      ctx.lineTo(s * 0.5, 0);
      ctx.lineTo(s * 0.2, s * 0.5);
      ctx.lineTo(-s * 0.6, s * 0.4);
      ctx.lineTo(-s * 0.9, 0);
      ctx.closePath();
      ctx.fill();

      // Trailing jagged tendril tentacles
      ctx.fillStyle = '#4C0519';
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.3);
      ctx.lineTo(-s * 1.1, -s * 0.5);
      ctx.lineTo(-s * 0.7, -s * 0.1);
      ctx.lineTo(-s * 1.2, s * 0.1);
      ctx.lineTo(-s * 0.6, s * 0.2);
      ctx.lineTo(-s * 1.0, s * 0.4);
      ctx.lineTo(-s * 0.5, s * 0.3);
      ctx.closePath();
      ctx.fill();

      // Manga ink outline
      ctx.strokeStyle = '#111114';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      break;
    }

    case 'eoc_sclera_top': {
      // Upper ivory sclera dome
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(0, 0, s, -Math.PI, 0);
      ctx.lineTo(s * 0.8, s * 0.2);
      ctx.lineTo(s * 0.3, 0);
      ctx.lineTo(-s * 0.2, s * 0.25);
      ctx.lineTo(-s * 0.7, 0);
      ctx.closePath();
      ctx.fill();

      // Branching crimson veins
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.3);
      ctx.lineTo(-s * 0.3, -s * 0.5);
      ctx.lineTo(0, -s * 0.4);
      ctx.lineTo(s * 0.4, -s * 0.6);
      ctx.moveTo(-s * 0.1, -s * 0.4);
      ctx.lineTo(s * 0.2, -s * 0.2);
      ctx.stroke();

      // Torn bloody bottom edge
      ctx.fillStyle = '#991B1B';
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(-s * 0.6, s * 0.15);
      ctx.lineTo(-s * 0.2, s * 0.25);
      ctx.lineTo(s * 0.3, 0);
      ctx.lineTo(s * 0.8, s * 0.2);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.8, -s * 0.1);
      ctx.lineTo(-s * 0.8, -s * 0.1);
      ctx.closePath();
      ctx.fill();

      // Dark outline
      ctx.strokeStyle = '#111114';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      break;
    }

    case 'eoc_sclera_bottom': {
      // Lower sclera shell
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI);
      ctx.lineTo(-s * 0.7, -s * 0.15);
      ctx.lineTo(-s * 0.2, -s * 0.3);
      ctx.lineTo(s * 0.3, -s * 0.1);
      ctx.lineTo(s * 0.8, -s * 0.2);
      ctx.closePath();
      ctx.fill();

      // Red capillary veins
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.3);
      ctx.lineTo(-s * 0.2, s * 0.6);
      ctx.lineTo(s * 0.3, s * 0.4);
      ctx.stroke();

      // Crimson torn meat
      ctx.fillStyle = '#7F1D1D';
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(-s * 0.7, -s * 0.15);
      ctx.lineTo(-s * 0.2, -s * 0.3);
      ctx.lineTo(s * 0.3, -s * 0.1);
      ctx.lineTo(s * 0.8, -s * 0.2);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.6, s * 0.15);
      ctx.lineTo(-s * 0.6, s * 0.15);
      ctx.closePath();
      ctx.fill();

      // Dark outline
      ctx.strokeStyle = '#111114';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      break;
    }

    case 'eoc_iris_pupil': {
      // Sclera tissue ring
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();

      // Cyan Iris
      ctx.fillStyle = '#06B6D4';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2);
      ctx.fill();

      // Dark Pupil
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // White Specular shine
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-s * 0.22, -s * 0.22, s * 0.16, 0, Math.PI * 2);
      ctx.fill();

      // Red perimeter capillaries
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(s * 0.6, -s * 0.6); ctx.lineTo(s * 0.85, -s * 0.85);
      ctx.moveTo(-s * 0.7, s * 0.5); ctx.lineTo(-s * 0.9, s * 0.7);
      ctx.stroke();

      // Dark outline
      ctx.strokeStyle = '#111114';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'eoc_fanged_maw_top':
    case 'eoc_fanged_maw_bottom': {
      const isTop = effect.goreType === 'eoc_fanged_maw_top';
      // Mouth cavity flesh
      ctx.fillStyle = '#7F1D1D';
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.quadraticCurveTo(0, isTop ? -s * 0.75 : s * 0.75, s, 0);
      ctx.lineTo(s * 0.8, isTop ? s * 0.35 : -s * 0.35);
      ctx.lineTo(-s * 0.8, isTop ? s * 0.35 : -s * 0.35);
      ctx.closePath();
      ctx.fill();

      // 3 Sharp triangular ivory teeth
      ctx.fillStyle = '#FFFFFF';
      const teethX = [-s * 0.55, -s * 0.05, s * 0.45];
      for (const tx of teethX) {
        ctx.beginPath();
        ctx.moveTo(tx - s * 0.14, 0);
        ctx.lineTo(tx + s * 0.14, 0);
        ctx.lineTo(tx, isTop ? s * 0.55 : -s * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#111114';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // Gum/bone edge
      ctx.fillStyle = '#991B1B';
      ctx.fillRect(-s * 0.9, isTop ? -s * 0.25 : 0, s * 1.8, s * 0.25);

      // Dark outline
      ctx.strokeStyle = '#111114';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-s * 0.9, isTop ? -s * 0.25 : 0, s * 1.8, s * 0.25);
      break;
    }

    case 'eoc_visceral_chunk':
    default: {
      ctx.fillStyle = effect.color || '#DC2626';
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, -s * 0.4);
      ctx.lineTo(-s * 0.2, -s * 0.9);
      ctx.lineTo(s * 0.7, -s * 0.5);
      ctx.lineTo(s * 0.9, s * 0.3);
      ctx.lineTo(s * 0.3, s * 0.8);
      ctx.lineTo(-s * 0.6, s * 0.7);
      ctx.closePath();
      ctx.fill();

      // Dark meat core
      ctx.fillStyle = '#7F1D1D';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Dark ink outline
      ctx.strokeStyle = '#111114';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      break;
    }
  }
}