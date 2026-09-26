// ─────────────────────────────────────────────
// DEATH SHATTER EFFECT
// Creates a shattering body effect when fighters die
// ─────────────────────────────────────────────
import { state, triggerGlobalScreenShake } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { getEyePhase1Image, getEyePhase2Image, getEyeShatterImage, EOC_SHATTER_SPRITES } from '../fighters/eyeOfCthulhuSkin.js';
import { drawEnderDragonDeathDisintegration } from '../fighters/enderDragonSkin.js';
import { spawnSparks, spawnImpactFlash } from './sparkEffect.js';

/**
 * Spawns a death shatter effect at the fighter's position.
 * @param {Object} fighter - The fighter that died
 */
export function spawnDeathShatter(fighter) {
  if (fighter.characterId === 'eye_of_cthulhu' || fighter.type === 'eye_of_cthulhu' || fighter.isServantOfCthulhu) {
    return spawnEyeOfCthulhuTerrariaDeath(fighter, Boolean(fighter.isServantOfCthulhu));
  }
  if (fighter.characterId === 'ender_dragon' || fighter.type === 'ender_dragon') {
    return spawnEnderDragonDisintegrationDeath(fighter);
  }

  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  
  // OPTIMIZED: Apply quality level to death effect limits
  const qualityMultiplier = state.qualityLevel || 1.0;
  const MAX_DEATH_EFFECTS = Math.floor((isMulti ? 20 : 50) * qualityMultiplier);
  
  // OPTIMIZED: Reduce shard count based on quality level
  const baseShardCount = isMulti ? 10 : 16;
  const isYuta = fighter.characterId === 'yuta' || fighter.type === 'yuta';
  const isRika = Boolean(fighter.isRika || fighter.type === 'rika' || fighter.characterId === 'rika');
  const shardCount = isRika ? Math.max(14, Math.floor(22 * qualityMultiplier)) : Math.max(6, Math.floor(baseShardCount * qualityMultiplier));
  const baseSpeed = isRika ? 8.5 : 7.0;    // Outward explosive velocity
  let primaryColor = fighter.color || '#ff4444';
  if (isRika) {
    primaryColor = '#FFFFFF';
  } else if (isYuta) {
    primaryColor = '#FFFFFF';
  } else if (primaryColor === '#ffffff' || primaryColor === '#fff' || primaryColor === '#FFFFFF') {
    primaryColor = fighter.secondaryColor || '#64748b';
  }
  const secondaryColor = isRika ? '#FF1493' : (isYuta ? '#1E293B' : (fighter.secondaryColor || '#881337'));

  // Radial explosive splash of sparks and flash on death
  try {
    spawnImpactFlash(fighter.x, fighter.y, (fighter.r || 30) * 1.3, 'crimsonSniper');
    spawnSparks(fighter.x, fighter.y, Math.floor(16 * qualityMultiplier), 'crimson', primaryColor);
    spawnSparks(fighter.x, fighter.y, Math.floor(10 * qualityMultiplier), 'bloodSpark', secondaryColor);
  } catch (e) {}

  for (let i = 0; i < shardCount; i++) {
    // If we reached the global limit, remove the oldest non-permanent death effect first
    if (state.deathEffects.length >= MAX_DEATH_EFFECTS) {
      const nonPermIndex = state.deathEffects.findIndex(e => !e.isEyeOfCthulhuGore && !e.isPermanentGore);
      if (nonPermIndex !== -1) {
        state.deathEffects.splice(nonPermIndex, 1);
      } else if (state.deathEffects.length > 80) {
        state.deathEffects.shift();
      }
    }
    
    // Random angle for each shard
    const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.5;
    const speed = baseSpeed + Math.random() * 5.5;
    
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
      vy: Math.sin(angle) * speed - (2.5 + Math.random() * 4.5), // Explosive vertical upward kick
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.55,
      size: size,
      color: shardColor,
      life: 1.0,           // 1.0 = full life, 0 = dead
      maxLife: 1.0,
      decay: 0.012 + Math.random() * 0.008, // Smooth fade-out
      gravity: 0.32,       // Downward gravity pull to drop all the way to the floor
      restitution: 0.32 + Math.random() * 0.12,
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
  const MAX_DEATH_EFFECTS = Math.floor((isMulti ? 50 : 120) * qualityMultiplier);

  const isPhase2 = Boolean(
    fighter.isPhase2 ||
    fighter._isPhase2 ||
    fighter.aiState === 'P2_CHASE' ||
    fighter.aiState === 'P2_CHAIN_DASH' ||
    fighter.aiState === 'P2_ROAR' ||
    fighter.hasTransformed
  );

  const baseR = fighter.r || (isMinion ? 10 : 32);

  // Explosive impact shockwave, screen shake, and radial blood burst splash
  try {
    triggerGlobalScreenShake(isMinion ? 4 : 10, isMinion ? 12 : 24);
    spawnImpactFlash(fighter.x, fighter.y, isMinion ? 35 : 90, 'crimsonSniper');
    spawnSparks(fighter.x, fighter.y, isMinion ? 16 : 45, 'bloodSpark', '#E11D48');
    spawnSparks(fighter.x, fighter.y, isMinion ? 10 : 30, 'bloodSpark', '#991B1B');
    spawnSparks(fighter.x, fighter.y, isMinion ? 8 : 22, 'bloodSpark', '#4C0519');
  } catch (e) {}

  const goreDefs = [];

  // 1. Optic Nerve Tendril Cluster
  const tendrilCount = isMinion ? 1 : EOC_SHATTER_SPRITES.tendrils.length;
  for (let t = 0; t < tendrilCount; t++) {
    goreDefs.push({
      type: 'eoc_nerve_tendril',
      spriteFrame: EOC_SHATTER_SPRITES.tendrils[t % EOC_SHATTER_SPRITES.tendrils.length],
      scale: (baseR * 0.60) / 65,
      size: baseR * 0.30,
      color: '#881337',
      angleOffset: Math.PI + (t - 1) * 0.4,
      speedMult: 1.1 + t * 0.1,
    });
  }

  // 2. Large Curved Sclera Shells
  const shellCount = isMinion ? 2 : Math.min(4, EOC_SHATTER_SPRITES.scleraShells.length);
  for (let s = 0; s < shellCount; s++) {
    goreDefs.push({
      type: 'eoc_sclera_shell',
      spriteFrame: EOC_SHATTER_SPRITES.scleraShells[s],
      scale: (baseR * 0.65) / 75,
      size: baseR * 0.32,
      color: '#F8FAFC',
      angleOffset: (Math.PI * 2 * s) / shellCount - Math.PI / 2,
      speedMult: 1.15 + s * 0.08,
    });
  }

  // 3. Phase 2: Razor Fanged Jaws
  if (isPhase2) {
    const mawCount = isMinion ? 2 : Math.min(4, EOC_SHATTER_SPRITES.fangedMaws.length);
    for (let m = 0; m < mawCount; m++) {
      goreDefs.push({
        type: 'eoc_fanged_maw',
        spriteFrame: EOC_SHATTER_SPRITES.fangedMaws[m],
        scale: (baseR * 0.60) / 55,
        size: baseR * 0.30,
        color: '#7F1D1D',
        angleOffset: (m % 2 === 0 ? -0.35 : 0.35) + (m * 0.2),
        speedMult: 1.25,
      });
    }
  }

  // 4. Waving Flesh Ribbons
  const ribbonCount = isMinion ? 2 : 4;
  for (let r = 0; r < ribbonCount; r++) {
    goreDefs.push({
      type: 'eoc_flesh_ribbon',
      spriteFrame: EOC_SHATTER_SPRITES.fleshRibbons[r % EOC_SHATTER_SPRITES.fleshRibbons.length],
      scale: (baseR * 0.55) / 65,
      size: baseR * 0.20,
      color: '#991B1B',
      angleOffset: (Math.PI * 2 * r) / ribbonCount,
      speedMult: 1.05 + r * 0.1,
    });
  }

  // 5. Visceral Meat & Capillary Debris Chunks
  const chunkCount = isMinion ? 4 : Math.max(8, Math.floor(14 * qualityMultiplier));
  const gibColors = ['#DC2626', '#991B1B', '#881337', '#06B6D4', '#F8FAFC', '#4C0519', '#7F1D1D'];
  for (let c = 0; c < chunkCount; c++) {
    goreDefs.push({
      type: 'eoc_visceral_chunk',
      spriteFrame: EOC_SHATTER_SPRITES.debrisChunks[c % EOC_SHATTER_SPRITES.debrisChunks.length],
      scale: (baseR * 0.50) / 20,
      size: baseR * (0.09 + Math.random() * 0.10),
      color: gibColors[c % gibColors.length],
      angleOffset: (Math.PI * 2 * c) / chunkCount + (Math.random() - 0.5) * 0.4,
      speedMult: 0.85 + Math.random() * 0.75,
    });
  }

  const baseSpeed = isMinion ? 6.5 : 11.5;

  for (let i = 0; i < goreDefs.length; i++) {
    if (state.deathEffects.length >= MAX_DEATH_EFFECTS) {
      // Prioritize removing non-permanent temporary shards first so permanent boss gore stays
      const nonPermIndex = state.deathEffects.findIndex(e => !e.isEyeOfCthulhuGore && !e.isPermanentGore);
      if (nonPermIndex !== -1) {
        state.deathEffects.splice(nonPermIndex, 1);
      } else if (state.deathEffects.length > 90) {
        state.deathEffects.shift();
      }
    }

    const def = goreDefs[i];
    const angle = def.angleOffset !== undefined
      ? def.angleOffset + (Math.random() - 0.5) * 0.6
      : (Math.PI * 2 * i) / goreDefs.length + (Math.random() - 0.5) * 0.5;

    const speed = (baseSpeed + Math.random() * (isMinion ? 4.0 : 8.5)) * (def.speedMult || 1.0);

    state.deathEffects.push({
      x: fighter.x + (Math.random() - 0.5) * (baseR * 0.4),
      y: fighter.y + (Math.random() - 0.5) * (baseR * 0.4),
      vx: Math.cos(angle) * speed + (fighter.vx || 0) * 0.35,
      vy: Math.sin(angle) * speed - (isMinion ? (2.5 + Math.random() * 3.5) : (5.5 + Math.random() * 8.0)), // Explosive vertical launch
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.70,
      size: def.size,
      scale: def.scale || 1.0,
      spriteFrame: def.spriteFrame || null,
      color: def.color,
      goreType: def.type,
      isEyeOfCthulhuGore: true,
      isPermanentGore: true,
      life: 1.0,
      maxLife: 1.0,
      decay: 0, // Permanent: stays on the arena floor
      gravity: isMinion ? 0.32 : 0.42, // Strong gravity to drop all the way down
      restitution: 0.35 + Math.random() * 0.15,
      isSettled: false,
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

export function spawnEnderDragonDisintegrationDeath(fighter) {
  triggerGlobalScreenShake(14, 40);
  if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
    audioSystem.playSFX('Assets/Sound Effects/Skills/purpledeploy.mp3', 0.9);
  }
  const baseR = fighter.r || 36;
  const aimAngle = (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const facingLeft = (fighter.vx < -0.4) || (Math.abs(aimAngle) > Math.PI / 2);
  state.deathEffects.push({
    x: fighter.x,
    y: fighter.y,
    vx: 0,
    vy: -0.40, // Slow majestic upward ascension
    r: baseR,
    rotation: aimAngle,
    facingLeft,
    life: 1.0,
    maxLife: 1.0,
    frameTimer: 0,
    totalFrames: 130, // Authentic Minecraft duration
    decay: 1.0 / 130,
    isEnderDragonDeath: true,
  });
}

/**
 * Spawns an authentic Minecraft Experience (XP) Orb fountain explosion upon Ender Dragon death.
 * Orbs burst outward in an arc, bounce on arena boundaries with realistic restitution,
 * pulse through iconic multi-color tiers (lime, emerald, gold, cyan), and linger.
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} count - Total XP orbs to spawn (default 40)
 */
export function spawnEnderDragonXPFountain(x, y, count = 40) {
  const qualityMultiplier = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
  const finalCount = Math.floor(Math.max(16, count * qualityMultiplier));

  for (let i = 0; i < finalCount; i++) {
    // Upward fountain burst with horizontal spread
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const speed = 6.0 + Math.random() * 8.5;
    const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 4.0;
    const vy = Math.sin(angle) * speed - (3.0 + Math.random() * 5.0);

    // Minecraft XP Orb tiers: 0: small, 1: medium, 2: large, 3: giant
    const xpTier = Math.random() < 0.15 ? 3 : (Math.random() < 0.35 ? 2 : (Math.random() < 0.65 ? 1 : 0));
    const pixelSize = 1.5 + xpTier * 0.5; // Discrete pixel unit: 1.5, 2.0, 2.5, 3.0px

    state.deathEffects.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx,
      vy,
      gravity: 0.34,
      restitution: 0.45 + Math.random() * 0.12,
      friction: 0.76,
      size: pixelSize * 5.0,
      pixelSize,
      xpTier,
      colorPhase: Math.random() * 20,
      rotOffset: Math.random() * 4,
      life: 1.0,
      maxLife: 1.0,
      decay: 0,
      settleHoldTimer: 180 + Math.floor(Math.random() * 120), // Lingers 3-5 seconds
      isSettled: false,
      isEnderDragonXPOrb: true,
      groundFrames: 0,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }
}

/**
 * Updates all death shatter effects.
 */
export function updateDeathEffects() {
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG.arena || { x: 40, y: 240, width: 450, height: 450 });
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaBottom = (arena ? arena.y + arena.height : 800) - wallW;
  const arenaTop = (arena ? arena.y : 0) + wallW;
  const arenaLeft = (arena ? arena.x : 0) + wallW;
  const arenaRight = (arena ? arena.x + arena.width : 1200) - wallW;

  for (let i = state.deathEffects.length - 1; i >= 0; i--) {
    const effect = state.deathEffects[i];

    // 0. Ender Dragon Disintegration Sequence
    if (effect.isEnderDragonDeath) {
      effect.x += effect.vx;
      effect.y += effect.vy;
      effect.frameTimer = (effect.frameTimer || 0) + 1;
      effect.life -= effect.decay;
      if (Math.random() < 0.40) {
        spawnSparks(effect.x + (Math.random() - 0.5) * effect.r * 2.2, effect.y + (Math.random() - 0.5) * effect.r * 2.2, '#D946EF', 2, 2.5);
      }
      if (effect.life <= 0) {
        triggerGlobalScreenShake(18, 45);
        spawnImpactFlash(effect.x, effect.y, effect.r * 4.2, '#F5D0FE');
        spawnSparks(effect.x, effect.y, 42, '#C026D3', 10.0);
        spawnSparks(effect.x, effect.y, 28, '#F5D0FE', 8.5);
        if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
          audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 1.0);
          audioSystem.playSFX('Assets/Sound Effects/Skills/thunderstrike.mp3', 0.85);
        }
        spawnEnderDragonXPFountain(effect.x, effect.y, 40);
        state.deathEffects.splice(i, 1);
      }
      continue;
    }

    // 0.5 Ender Dragon Experience (XP) Orbs
    if (effect.isEnderDragonXPOrb) {
      // Check for nearby alive player within magnetism radius
      const aliveFighters = (state.fighters || []).filter(f => f && f.hp > 0 && !f.isDead && !f.dead && !f.isTurret && !f.isDispenser);
      let targetFighter = effect.hoverTargetFighter || null;

      if (!targetFighter || targetFighter.hp <= 0 || targetFighter.isDead || targetFighter.dead) {
        let minDist = 190; // Magnetic attraction radius (190px)
        targetFighter = null;
        for (let fIdx = 0; fIdx < aliveFighters.length; fIdx++) {
          const f = aliveFighters[fIdx];
          const dist = Math.hypot(f.x - effect.x, f.y - effect.y);
          if (dist < minDist) {
            minDist = dist;
            targetFighter = f;
          }
        }
      }

      if (targetFighter) {
        effect.isSettled = false;
        const dx = targetFighter.x - effect.x;
        const dy = targetFighter.y - effect.y;
        const dist = Math.hypot(dx, dy);

        // Check if entered close hovering/swarming radius around the player
        const playerR = targetFighter.r || 30;
        const hoverTriggerDist = playerR * 0.95 + 12;

        if (effect.isHovering || dist <= hoverTriggerDist) {
          if (!effect.isHovering) {
            // Initiate hovering & swirling around the player
            effect.isHovering = true;
            effect.hoverTargetFighter = targetFighter;
            // Hover duration: 12 to 34 frames of buzzing/swarming around player body before consumption
            effect.hoverTimer = 12 + Math.floor(Math.random() * 22);
            effect.hoverOrbitRadius = playerR * 0.35 + Math.random() * (playerR * 0.75);
            effect.hoverOrbitAngle = Math.atan2(effect.y - targetFighter.y, effect.x - targetFighter.x);
            effect.hoverOrbitSpeed = (Math.random() < 0.5 ? 1 : -1) * (0.16 + Math.random() * 0.14);
            effect.hoverBobOffset = Math.random() * Math.PI * 2;
          }

          effect.hoverTimer--;
          effect.hoverOrbitAngle += effect.hoverOrbitSpeed;
          // Slowly spiral closer to player center as timer counts down
          effect.hoverOrbitRadius *= 0.96;

          const orbitX = targetFighter.x + Math.cos(effect.hoverOrbitAngle) * effect.hoverOrbitRadius;
          const orbitY = targetFighter.y + Math.sin(effect.hoverOrbitAngle) * (effect.hoverOrbitRadius * 0.85) + Math.sin((state.frameCount || 0) * 0.2 + effect.hoverBobOffset) * 2;

          effect.x += (orbitX - effect.x) * 0.40;
          effect.y += (orbitY - effect.y) * 0.40;

          // Tiny sparkling motes while swirling around player
          if (Math.random() < 0.25) {
            spawnSparks(effect.x + (Math.random() - 0.5) * 4, effect.y + (Math.random() - 0.5) * 4, 1, 'lime', '#84CC16');
          }

          // When hover timer reaches 0, the XP orb is completely consumed!
          if (effect.hoverTimer <= 0) {
            playMinecraftXPChime();

            // Minecraft XP pickup sparkle pop explosion
            const sparkleCount = 6 + Math.floor(Math.random() * 4);
            const sparkleColors = ['#BAF74E', '#76D813', '#FEF08A', '#8DF222', '#FFFFFF'];
            for (let s = 0; s < sparkleCount; s++) {
              const sAngle = (Math.PI * 2 * s) / sparkleCount + (Math.random() - 0.5) * 0.6;
              const sSpeed = 1.8 + Math.random() * 3.6;
              state.deathEffects.push({
                x: effect.x + (Math.random() - 0.5) * 6,
                y: effect.y + (Math.random() - 0.5) * 6,
                vx: Math.cos(sAngle) * sSpeed,
                vy: Math.sin(sAngle) * sSpeed - (1.2 + Math.random() * 1.5),
                pixelSize: Math.random() < 0.5 ? 2.0 : 2.5,
                color: sparkleColors[s % sparkleColors.length],
                life: 1.0,
                maxLife: 1.0,
                decay: 0.05 + Math.random() * 0.03, // Crisp ~15 frame pop
                isXPSparkle: true,
              });
            }
            state.deathEffects.splice(i, 1);
            continue;
          }
        } else {
          // Magnetism flight towards player before reaching hover distance
          effect.homingSpeed = Math.min(20.0, (effect.homingSpeed || 4.0) + 1.20);
          const targetVx = (dx / dist) * effect.homingSpeed;
          const targetVy = (dy / dist) * effect.homingSpeed;

          // Smooth parabolic blend towards player
          effect.vx = (effect.vx || 0) * 0.78 + targetVx * 0.22;
          effect.vy = (effect.vy || 0) * 0.78 + targetVy * 0.22;
          effect.x += effect.vx;
          effect.y += effect.vy;

          // Trailing luminous XP motes while in flight
          if (Math.random() < 0.28) {
            spawnSparks(effect.x + (Math.random() - 0.5) * 4, effect.y + (Math.random() - 0.5) * 4, 1, 'lime', '#84CC16');
          }
        }
      } else if (!effect.isSettled) {
        effect.x += effect.vx;
        effect.y += effect.vy;
        effect.vy += effect.gravity;
        effect.vx *= 0.988;
        effect.vy *= 0.992;

        const orbMargin = effect.size * 0.6;
        const leftBound = arenaLeft + orbMargin;
        const rightBound = arenaRight - orbMargin;
        const bottomBound = arenaBottom - orbMargin;

        // Wall horizontal bounce clamp
        if (effect.x <= leftBound) {
          effect.x = leftBound;
          effect.vx = Math.abs(effect.vx) * effect.restitution;
        } else if (effect.x >= rightBound) {
          effect.x = rightBound;
          effect.vx = -Math.abs(effect.vx) * effect.restitution;
        }

        // Ceiling bounce
        if (effect.y <= arenaTop + orbMargin) {
          effect.y = arenaTop + orbMargin;
          if (effect.vy < 0) effect.vy = -effect.vy * 0.35;
        }

        // Arena floor bounce & settling
        if (effect.y >= bottomBound) {
          effect.y = bottomBound;
          effect.groundFrames = (effect.groundFrames || 0) + 1;

          if (effect.vy > 0) {
            if (effect.vy > 1.2 && effect.groundFrames < 12) {
              effect.vy = -effect.vy * effect.restitution;
              effect.vx *= effect.friction;
              if (Math.random() < 0.3) {
                spawnSparks(effect.x, effect.y, 2, 'lime', '#84CC16');
              }
            } else {
              effect.vy = 0;
              effect.vx *= 0.70;
              if (Math.abs(effect.vx) < 0.08 || effect.groundFrames > 20) {
                effect.vx = 0;
                effect.isSettled = true;
                effect.settleY = bottomBound;
              }
            }
          }
        }
      } else {
        // Settled: gentle floating/bobbing oscillation until picked up or timeout
        if (effect.settleHoldTimer > 0) {
          effect.settleHoldTimer--;
        } else {
          effect.life -= 0.012; // Smooth fade out
          if (effect.life <= 0) {
            state.deathEffects.splice(i, 1);
            continue;
          }
        }
      }
      continue;
    }

    // 0.6 Minecraft XP Sparkle Pop Particles
    if (effect.isXPSparkle) {
      effect.x += effect.vx;
      effect.y += effect.vy;
      effect.vy -= 0.04; // Gentle upward drift
      effect.vx *= 0.90;
      effect.life -= (effect.decay || 0.05);
      if (effect.life <= 0) {
        state.deathEffects.splice(i, 1);
      }
      continue;
    }
    
    // 1. Eye of Cthulhu Terraria Gore: drops to arena floor, bounces, settles, and slowly disappears
    if (effect.isEyeOfCthulhuGore || effect.isPermanentGore) {
      if (!effect.isSettled) {
        effect.x += effect.vx;
        effect.y += effect.vy;

        // Downward gravity acceleration (bullet shell physics feel)
        effect.vy += (effect.gravity || 0.45);

        // Air drag
        effect.vx *= 0.985;
        effect.vy *= 0.99;
        effect.rotation += effect.rotationSpeed;

        const pieceMargin = (effect.size || 10) * 0.5;
        const leftBound = arenaLeft + pieceMargin;
        const rightBound = arenaRight - pieceMargin;
        const bottomBound = arenaBottom - pieceMargin;

        // Wall horizontal bounce clamp
        if (effect.x <= leftBound) {
          effect.x = leftBound;
          effect.vx = Math.abs(effect.vx) * 0.45;
          effect.rotationSpeed = -effect.rotationSpeed * 0.6;
        } else if (effect.x >= rightBound) {
          effect.x = rightBound;
          effect.vx = -Math.abs(effect.vx) * 0.45;
          effect.rotationSpeed = -effect.rotationSpeed * 0.6;
        }

        // Ceiling bounce
        if (effect.y <= arenaTop + pieceMargin) {
          effect.y = arenaTop + pieceMargin;
          if (effect.vy < 0) effect.vy = -effect.vy * 0.35;
        }

        // Landed / hit the arena bottom floor!
        if (effect.y >= bottomBound) {
          effect.y = bottomBound;
          effect.groundFrames = (effect.groundFrames || 0) + 1;

          if (effect.vy > 0) {
            if (effect.vy > 1.4 && effect.groundFrames < 15) {
              // Ground bounce!
              effect.vy = -effect.vy * (effect.restitution || 0.35);
              effect.vx *= 0.76; // Ground friction
              effect.rotationSpeed = (effect.vx >= 0 ? 1 : -1) * Math.min(0.25, Math.abs(effect.vx) * 0.08);

              // Secondary blood splash on floor impact
              spawnSparks(effect.x, effect.y, 4, 'bloodSpark', '#E11D48');
            } else {
              // Settle on the bottom floor
              effect.vy = 0;
              effect.vx *= 0.65;
              effect.rotationSpeed *= 0.65;

              if (Math.abs(effect.vx) < 0.05 || effect.groundFrames > 25) {
                effect.vx = 0;
                effect.rotationSpeed = 0;
                effect.isSettled = true;
                effect.settleHoldTimer = 90; // Rest fully visible on floor for 1.5s
                effect.decay = 0.004;        // Slowly fade out over ~250 frames (~4.1s)
              }
            }
          }
        }

        // Trail blood sparks while actively airborne and traveling fast
        if (Math.hypot(effect.vx, effect.vy) > 2.5 && Math.random() < 0.22) {
          spawnSparks(effect.x + (Math.random() - 0.5) * 6, effect.y + (Math.random() - 0.5) * 6, 1, 'bloodSpark', '#E11D48');
        }
      }

      // Once landed and settled, hold briefly and slowly fade out
      if (effect.isSettled) {
        if (effect.settleHoldTimer !== undefined && effect.settleHoldTimer > 0) {
          effect.settleHoldTimer--;
        } else {
          effect.life -= (effect.decay || 0.004);
          if (effect.life <= 0) {
            state.deathEffects.splice(i, 1);
          }
        }
      }
      continue;
    }

    // 2. Machine Corpse
    if (effect.isMachineCorpse) {
      effect.x += effect.vx;
      effect.y += effect.vy;
      if (Math.random() < 0.15) {
        spawnSparks(effect.x + (Math.random() - 0.5) * 10, effect.y + (Math.random() - 0.5) * 10, 1, 'gray');
      }
      effect.life -= (effect.decay || 0.005);
      if (effect.life <= 0) {
        state.deathEffects.splice(i, 1);
      }
      continue;
    }

    // 3. Standard Character Death Shards
    effect.x += effect.vx;
    effect.y += effect.vy;
    effect.vy += (effect.gravity || 0.38);
    effect.vx *= 0.985;
    effect.vy *= 0.99;
    effect.rotation += effect.rotationSpeed;

    const shardMargin = (effect.size || 8) * 0.5;
    const leftBound = arenaLeft + shardMargin;
    const rightBound = arenaRight - shardMargin;
    const bottomBound = arenaBottom - shardMargin;

    if (effect.x <= leftBound) {
      effect.x = leftBound;
      effect.vx = Math.abs(effect.vx) * 0.45;
      effect.rotationSpeed = -effect.rotationSpeed * 0.6;
    } else if (effect.x >= rightBound) {
      effect.x = rightBound;
      effect.vx = -Math.abs(effect.vx) * 0.45;
      effect.rotationSpeed = -effect.rotationSpeed * 0.6;
    }

    if (effect.y >= bottomBound) {
      effect.y = bottomBound;
      if (effect.vy > 0) {
        if (effect.vy > 1.4) {
          effect.vy = -effect.vy * (effect.restitution || 0.32);
          effect.vx *= 0.78;
        } else {
          effect.vy = 0;
          effect.vx *= 0.65;
        }
      }
    }

    // Fade out
    effect.life -= (effect.decay || 0.015);
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
      const nonPermIndex = state.deathEffects.findIndex(e => !e.isEyeOfCthulhuGore && !e.isPermanentGore);
      if (nonPermIndex !== -1) {
        state.deathEffects.splice(nonPermIndex, 1);
      } else if (state.deathEffects.length > 80) {
        state.deathEffects.shift();
      }
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

    if (effect.isEnderDragonDeath) {
      drawEnderDragonDeathDisintegration(ctx, effect);
    } else if (effect.isEnderDragonXPOrb) {
      drawMinecraftXPOrb(ctx, effect);
    } else if (effect.isXPSparkle) {
      const P = effect.pixelSize || 2.0;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = effect.color || '#BAF74E';
      ctx.fillRect(-Math.round(P / 2), -Math.round(P / 2), P, P);
      if (effect.life > 0.45) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-Math.round(P / 4), -Math.round(P / 4), Math.max(1, P / 2), Math.max(1, P / 2));
      }
    } else if (effect.isEyeOfCthulhuGore) {
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
 * Uses dedicated sprite cuts from getEyeShatterImage with zero square strokeRect box borders.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} effect
 */
export function drawTerrariaEyeGore(ctx, effect) {
  const sImg = typeof getEyeShatterImage === 'function' ? getEyeShatterImage() : null;
  const sReady = Boolean(sImg && sImg.complete && sImg.naturalWidth > 0);

  // If sprite frame is provided and shatter image is loaded, render the authentic transparent sprite!
  if (sReady && effect.spriteFrame) {
    const frame = effect.spriteFrame;
    const scale = effect.scale || ((effect.size * 2) / Math.max(frame.sw, frame.sh));
    const drawW = frame.sw * scale;
    const drawH = frame.sh * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sImg,
      frame.sx, frame.sy, frame.sw, frame.sh,
      -drawW * 0.5, -drawH * 0.5, drawW, drawH
    );
    return;
  }

  // Organic vector fallback with zero rectangular box outlines (no strokeRect)
  const s = effect.size || 12;
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

  ctx.fillStyle = '#7F1D1D';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#111114';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

// Authentic Minecraft Experience (XP) Orb Rounded Pixel Matrix (8x8 circular pixel cluster)
// B = Dark Outline Pixel, O = Outer Vibrant Color, I = Inner Bright Tier, W = Core White Highlight
const MC_XP_SPRITE_FRAMES = [
  // Frame 0: Standard Round Spherical Orb (8x8 round circle)
  [
    '  BBBB  ',
    ' BOOOOB ',
    'BOIIIIOB',
    'BOIWWIOB',
    'BOIWWIOB',
    'BOIIIIOB',
    ' BOOOOB ',
    '  BBBB  ',
  ],
  // Frame 1: Pulsating Diamond Round
  [
    '   BB   ',
    ' BOOOOB ',
    'BOIIIIOB',
    'BOIWWIOB',
    'BOIWWIOB',
    'BOIIIIOB',
    ' BOOOOB ',
    '   BB   ',
  ],
  // Frame 2: Core Glint Expansion (Internal breathing pulse)
  [
    '  BBBB  ',
    ' BOOOOB ',
    'BOIWWIOB',
    'BOWWWWOB',
    'BOWWWWOB',
    'BOIWWIOB',
    ' BOOOOB ',
    '  BBBB  ',
  ],
  // Frame 3: Secondary Core Pulse
  [
    '   BB   ',
    ' BOOOOB ',
    'BOIIIIOB',
    'BOIWWIOB',
    'BOIWWIOB',
    'BOIIIIOB',
    ' BOOOOB ',
    '   BB   ',
  ],
];

// 11-step pulsating color sequence matching vanilla Minecraft Experience Orb shader
const MC_XP_COLOR_SEQUENCE = [
  { base: '#76D813', inner: '#BAF74E', core: '#FFFFFF', border: '#143806' }, // Chartreuse
  { base: '#8DF222', inner: '#CEFB6E', core: '#FFFFFF', border: '#1B4A07' }, // Bright Lime
  { base: '#C4E818', inner: '#E6FA6E', core: '#FFFFFF', border: '#2B3E03' }, // Lemon Lime
  { base: '#EAC918', inner: '#FEF08A', core: '#FFFFFF', border: '#423403' }, // Gold
  { base: '#F59E0B', inner: '#FDE68A', core: '#FFFFFF', border: '#451A03' }, // Amber
  { base: '#10B981', inner: '#6EE7B7', core: '#FFFFFF', border: '#04361C' }, // Emerald
  { base: '#22C55E', inner: '#A7F3D0', core: '#FFFFFF', border: '#053A14' }, // Green
  { base: '#14B8A6', inner: '#99F6E4', core: '#FFFFFF', border: '#043834' }, // Seafoam
  { base: '#06B6D4', inner: '#A5F3FC', core: '#FFFFFF', border: '#063C4A' }, // Vivid Cyan
  { base: '#0EA5E9', inner: '#BAE6FD', core: '#FFFFFF', border: '#073B56' }, // Sky Blue
  { base: '#34D399', inner: '#D1FAE5', core: '#FFFFFF', border: '#063A24' }, // Mint Jade
];

/**
 * Renders an authentic Minecraft Experience (XP) Orb in genuine 2D discrete grid pixel art.
 * - Pure round spherical pixel cluster (no rectangular bounding box)
 * - Solid square pixel rasterization (ctx.fillRect) with imageSmoothingEnabled = false
 * - 4-frame breathing/glowing pixel pulse
 * - 11-step pulsating color cycle from lime to gold to cyan to emerald
 * - Stepped arcade hover bobbing when settled
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} effect
 */
export function drawMinecraftXPOrb(ctx, effect) {
  if (!ctx || !effect) return;

  const time = (typeof state !== 'undefined' && state.frameCount) ? state.frameCount : 0;
  
  // Rotating/breathing frame animation (4-frame cycle)
  const frameIdx = Math.floor((time * 0.14 + (effect.rotOffset || 0)) % MC_XP_SPRITE_FRAMES.length);
  const sprite = MC_XP_SPRITE_FRAMES[frameIdx] || MC_XP_SPRITE_FRAMES[0];

  // 11-step color palette cycling
  const colorIdx = Math.floor((time * 0.16 + (effect.colorPhase || 0)) % MC_XP_COLOR_SEQUENCE.length);
  const palette = MC_XP_COLOR_SEQUENCE[colorIdx] || MC_XP_COLOR_SEQUENCE[0];

  // Pixel unit size based on XP size tier
  const P = effect.pixelSize || (1.5 + (effect.xpTier || 0) * 0.5); // 1.5px to 3.0px solid square pixels

  // Stepped pixel bobbing when landed on arena floor
  const bobY = effect.isSettled ? Math.round(Math.sin(time * 0.08 + (effect.bobOffset || 0)) * (P * 1.5)) : 0;

  const rows = sprite.length;
  const cols = sprite[0].length;
  const totalW = cols * P;
  const totalH = rows * P;
  const startX = -Math.round(totalW / 2);
  const startY = -Math.round(totalH / 2) + bobY;

  ctx.save();
  ctx.imageSmoothingEnabled = false; // Authentic crisp pixel art (Rule 19 & 3.5)

  // Discrete rasterized square pixel matrix with zero rectangular bounding box
  for (let r = 0; r < rows; r++) {
    const rowStr = sprite[r];
    for (let c = 0; c < cols; c++) {
      const char = rowStr[c];
      if (char === ' ') continue;

      if (char === 'B') {
        ctx.fillStyle = palette.border;
      } else if (char === 'O') {
        ctx.fillStyle = palette.base;
      } else if (char === 'I') {
        ctx.fillStyle = palette.inner;
      } else if (char === 'W') {
        ctx.fillStyle = palette.core;
      }

      ctx.fillRect(startX + c * P, startY + r * P, P, P);
    }
  }

  ctx.restore();
}

let _xpAudioCtx = null;
let _lastXpPickupFrame = 0;
let _xpPickupStreak = 0;

/**
 * Synthesizes the authentic Minecraft Experience Orb pickup bell chime (random.orb).
 * Successive rapid pickups climb in pitch up the chromatic scale.
 */
export function playMinecraftXPChime() {
  const nowFrame = (typeof state !== 'undefined' && state.frameCount) ? state.frameCount : Date.now();
  if (nowFrame - _lastXpPickupFrame < 28) {
    _xpPickupStreak = Math.min(16, _xpPickupStreak + 1);
  } else {
    _xpPickupStreak = 0;
  }
  _lastXpPickupFrame = nowFrame;

  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!_xpAudioCtx) {
      _xpAudioCtx = new AudioContextClass();
    }
    if (_xpAudioCtx.state === 'suspended') {
      _xpAudioCtx.resume().catch(() => {});
    }

    const actx = _xpAudioCtx;
    const osc = actx.createOscillator();
    const gain = actx.createGain();

    // Minecraft XP chime pitch scale: starts at ~860Hz and steps up with each collected orb
    const semitone = Math.pow(2, _xpPickupStreak / 12);
    const baseFreq = 860 * semitone;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, actx.currentTime + 0.10);

    const sfxVol = (typeof state !== 'undefined' && state.sfxVolume !== undefined) ? state.sfxVolume : 0.75;
    gain.gain.setValueAtTime(0.20 * sfxVol, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(actx.destination);

    osc.start();
    osc.stop(actx.currentTime + 0.13);
  } catch (e) {}
}