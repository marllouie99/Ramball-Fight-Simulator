// ─────────────────────────────────────────────
// DEATH SHATTER EFFECT
// Creates a shattering body effect when fighters die
// ─────────────────────────────────────────────
import { state, triggerGlobalScreenShake } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { getEyePhase1Image, getEyePhase2Image, getEyeShatterImage, EOC_SHATTER_SPRITES } from '../fighters/eyeOfCthulhuSkin.js';
import { spawnSparks, spawnImpactFlash } from './sparkEffect.js';

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