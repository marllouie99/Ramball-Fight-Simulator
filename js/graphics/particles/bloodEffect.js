// ─────────────────────────────────────────────
// BLOOD EFFECT (PIXIJS WEBGL ACCELERATED)
// Small particle effect when fighters take damage
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { fastCleanArray } from './visualTrailSystem.js';
import { CONFIG } from '../../core/config.js';
import { bomberExplosionSystem } from './bomberExplosionVisuals.js';
import { burnEffectSystem } from './burnEffectVisuals.js';
import { ParticleSystem } from '../../systems/particles/ParticleSystem.js';
import { spawnSparks } from './sparkEffect.js';
import { clearDriveBys } from '../../systems/cjDriveBySystem.js';

// Object pool for PixiJS Sprites to prevent GC thrashing
const bloodSpritePool = [];

// Helper to safely convert any color input (hex, RGBA, 32-bit int) into a valid 24-bit RGB numeric tint for PixiJS (0..0xFFFFFF)
function parseColorToHexNum(color) {
  if (typeof color === 'number') {
    return (color & 0xFFFFFF);
  }
  if (!color || typeof color !== 'string') return 0xe60000;

  let str = color.trim();
  if (str.startsWith('rgba') || str.startsWith('rgb')) {
    const parts = str.match(/[\d.]+/g);
    if (parts && parts.length >= 3) {
      const r = Math.max(0, Math.min(255, parseInt(parts[0]) || 0));
      const g = Math.max(0, Math.min(255, parseInt(parts[1]) || 0));
      const b = Math.max(0, Math.min(255, parseInt(parts[2]) || 0));
      return ((r << 16) + (g << 8) + b) & 0xFFFFFF;
    }
  }

  if (str.startsWith('#')) str = str.substring(1);
  else if (str.startsWith('0x')) str = str.substring(2);

  // If 8-character hex (#RRGGBBAA), drop the AA alpha suffix
  if (str.length === 8) {
    str = str.substring(0, 6);
  } else if (str.length === 3 || str.length === 4) {
    str = str[0] + str[0] + str[1] + str[1] + str[2] + str[2];
  }

  const parsed = parseInt(str, 16);
  if (!isNaN(parsed)) {
    return (parsed & 0xFFFFFF);
  }

  return 0xe60000;
}

function getBloodSprite() {
  if (bloodSpritePool.length > 0) {
    const s = bloodSpritePool.pop();
    s.visible = true;
    return s;
  }
  const s = new window.PIXI.Sprite(state.bloodSquareTexture);
  s.anchor.set(0.5); // Center origin
  state.pixiLayers.particles.addChild(s);
  return s;
}

function releaseBloodSprite(s) {
  if (!s) return;
  s.visible = false;
  bloodSpritePool.push(s);
}

export function isStandOffMode() {
  return Boolean(
    typeof state !== 'undefined' && state.mode && (
      state.mode === 'Stand Off' ||
      state.mode === '1v2 Stand Off' ||
      state.mode === GAME_MODES.STAND_OFF ||
      state.mode === GAME_MODES.STAND_OFF_1V2 ||
      (typeof state.mode === 'string' && state.mode.toLowerCase().includes('stand off'))
    )
  );
}

/**
 * Spawns a standard blood effect at the fighter's position upon taking damage.
 */
export function spawnBloodEffect(fighter, amount = 10, damageAngle = null, customOpts = null) {
  if (amount <= 0 || !fighter) return;
  if (!state.bloodEffects) state.bloodEffects = [];
  const isStandOff = isStandOffMode();
  const isFFA = state && state.mode === GAME_MODES.FFA;
  const is1v2 = typeof state !== 'undefined' && state.mode && (state.mode === '1v2' || state.mode.includes('1v2'));
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';

  const bloodCfg = (CONFIG && CONFIG.blood) || {};
  const limitsCfg = bloodCfg.limits || {};
  const hitCfg = bloodCfg.hit || {};
  const physCfg = bloodCfg.physics || {};
  const bloodPalette = bloodCfg.palette || [0xE60000, 0xDC2626, 0x990000, 0x800000, 0xCC0000, 0xB91C1C];

  const qualityMultiplier = state.qualityLevel || 1.0;
  const maxLimit = isStandOff
    ? (limitsCfg.maxParticlesStandOff ?? 25)
    : is1v2
      ? (limitsCfg.maxParticles1v2 ?? 25)
      : isFFA
        ? (limitsCfg.maxParticlesFFA ?? 30)
        : isMulti
          ? (limitsCfg.maxParticlesMulti ?? 35)
          : (limitsCfg.maxParticles1v1 ?? 40);
  const MAX_BLOOD_PARTICLES = Math.floor(maxLimit * qualityMultiplier);

  // Scaled down: standard punch hits spawn 1-2 droplets, heavy hits spawn up to maxDroplets
  const divisor = hitCfg.damageDivisor ?? 12.0;
  const minDrops = hitCfg.minDroplets ?? 1;
  const maxDrops = hitCfg.maxDroplets ?? 3;
  const baseParticleCount = Math.max(minDrops, Math.min(maxDrops, Math.floor(amount / divisor) || minDrops));
  const particleCount = (customOpts && customOpts.count !== undefined)
    ? Math.max(1, Math.floor(customOpts.count * qualityMultiplier))
    : Math.max(1, Math.floor(baseParticleCount * qualityMultiplier));

  // Blood MUST be authentic crimson red / dark blood, never washed-out white
  const fx = typeof fighter.x === 'number' ? fighter.x : 0;
  const fy = typeof fighter.y === 'number' ? fighter.y : 0;
  const fr = typeof fighter.r === 'number' ? fighter.r : 25;

  const arena = (CONFIG && CONFIG.arena) || (state && state.arena);
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaLeft = (arena ? arena.x : 0) + wallW;
  const arenaRight = (arena ? arena.x + arena.width : 1200) - wallW;
  const arenaTop = (arena ? arena.y : 0) + wallW;
  const arenaBottom = (arena ? arena.y + arena.height : 800) - wallW;

  const clampFx = Math.max(arenaLeft + 4, Math.min(arenaRight - 4, fx));
  const clampFy = Math.max(arenaTop + 4, Math.min(arenaBottom - 4, fy));

  const baseDecay = isStandOff ? (physCfg.floorDecayRateStandOff ?? 0.014) : (physCfg.floorDecayRate1v1 ?? 0.010);
  const decayRate = baseDecay + Math.random() * (baseDecay * 0.5);

  const baseSpeed = hitCfg.baseSpeed ?? 4.0;
  const speedVar = hitCfg.speedVariance ?? 8.0;
  const spreadRad = (hitCfg.spreadAngle ?? 0.5) * Math.PI;
  const minSize = (customOpts && customOpts.minSize !== undefined) ? customOpts.minSize : (hitCfg.minSize ?? 2.0);
  const maxSize = (customOpts && customOpts.maxSize !== undefined) ? customOpts.maxSize : (hitCfg.maxSize ?? 3.4);
  const upImpulse = hitCfg.upwardImpulse ?? 0.5;
  const upImpulseVar = hitCfg.upwardImpulseVariance ?? 1.5;

  for (let i = 0; i < particleCount; i++) {
    let angle = Math.random() * Math.PI * 2;
    const speed = baseSpeed + Math.random() * speedVar;

    if (damageAngle !== null) {
      const spreadAngle = (Math.random() - 0.5) * spreadRad;
      angle = damageAngle + spreadAngle;
    }

    // Compact, crisp retro pixel square blood droplets
    const globalMultiplier = bloodCfg.globalSizeMultiplier ?? 1.0;
    const size = (minSize + Math.random() * (maxSize - minSize)) * globalMultiplier;
    const numericColor = bloodPalette[i % bloodPalette.length];

    const startX = Math.max(arenaLeft + size / 2, Math.min(arenaRight - size / 2, clampFx + (Math.random() - 0.5) * fr * 0.4));
    const startY = Math.max(arenaTop + size / 2, Math.min(arenaBottom - size / 2, clampFy + (Math.random() - 0.5) * fr * 0.4));

    // Fast O(1) overwrite of random existing particle if over limit
    if (state.bloodEffects.length >= MAX_BLOOD_PARTICLES) {
       const overwriteIdx = Math.floor(Math.random() * state.bloodEffects.length);
       const old = state.bloodEffects[overwriteIdx];
       if (old && old.sprite) releaseBloodSprite(old.sprite);
       
       const sprite = getBloodSprite();
       sprite.tint = numericColor;
       sprite.width = size;
       sprite.height = size;
       
       state.bloodEffects[overwriteIdx] = {
         x: startX,
         y: startY,
         vx: Math.cos(angle) * speed,
         vy: Math.sin(angle) * speed - (upImpulse + Math.random() * upImpulseVar), // Natural slight upward/radial burst arc
         size: size,
         life: 1.0,           
         decay: decayRate, 
         airResistance: physCfg.airResistance ?? 0.95,
         friction: physCfg.floorFriction ?? 0.85,
         onGround: false,
         sprite: sprite
       };
    } else {
       const sprite = getBloodSprite();
       sprite.tint = numericColor;
       sprite.width = size;
       sprite.height = size;

       state.bloodEffects.push({
         x: startX,
         y: startY,
         vx: Math.cos(angle) * speed,
         vy: Math.sin(angle) * speed - (upImpulse + Math.random() * upImpulseVar), // Natural slight upward/radial burst arc
         size: size,
         life: 1.0,           
         decay: decayRate, 
         airResistance: physCfg.airResistance ?? 0.95,
         friction: physCfg.floorFriction ?? 0.85,
         onGround: false,
         sprite: sprite
       });
    }
  }
}

/**
 * Spawns a visceral blood splash explosion when a fighter is killed / splashed to death.
 * Erupts with high-velocity blood droplets and outward splatter arcs across the arena floor.
 */
export function spawnFatalBloodSplash(fighterOrX, optsOrY = {}, maybeR = null) {
  if (fighterOrX === null || fighterOrX === undefined) return;
  if (!state.bloodEffects) state.bloodEffects = [];
  const isStandOff = isStandOffMode();
  const isFFA = state && state.mode === GAME_MODES.FFA;
  const is1v2 = typeof state !== 'undefined' && state.mode && (state.mode === '1v2' || state.mode.includes('1v2'));
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';

  const bloodCfg = (CONFIG && CONFIG.blood) || {};
  const fatalCfg = bloodCfg.fatal || {};
  const physCfg = bloodCfg.physics || {};
  const bloodColors = bloodCfg.palette || [0xE60000, 0xDC2626, 0xCC0000, 0x990000, 0x800000, 0xB91C1C];

  let fx = 0;
  let fy = 0;
  let fr = 25;
  let opts = {};

  if (typeof fighterOrX === 'number') {
    fx = fighterOrX;
    fy = typeof optsOrY === 'number' ? optsOrY : 0;
    fr = typeof maybeR === 'number' ? maybeR : 25;
  } else if (fighterOrX && typeof fighterOrX === 'object') {
    fx = typeof fighterOrX.x === 'number' ? fighterOrX.x : 0;
    fy = typeof fighterOrX.y === 'number' ? fighterOrX.y : 0;
    fr = typeof fighterOrX.r === 'number' ? fighterOrX.r : 25;
    opts = optsOrY || {};
  } else {
    return;
  }

  const qualityMultiplier = state.qualityLevel || 1.0;
  const splashCount = (opts && opts.count !== undefined)
    ? Math.max(1, Math.floor(opts.count * qualityMultiplier))
    : Math.max(1, Math.floor((isStandOff
      ? (fatalCfg.countStandOff ?? 14)
      : is1v2
        ? (fatalCfg.count1v2 ?? 16)
        : isFFA
          ? (fatalCfg.countFFA ?? 16)
          : isMulti
            ? (fatalCfg.countMulti ?? 18)
            : (fatalCfg.count1v1 ?? 22)) * qualityMultiplier));

  const maxLimit = isStandOff
    ? (fatalCfg.maxActiveLimitStandOff ?? 45)
    : is1v2
      ? (fatalCfg.maxActiveLimit1v2 ?? 45)
      : isFFA
        ? (fatalCfg.maxActiveLimitFFA ?? 50)
        : isMulti
          ? (fatalCfg.maxActiveLimitMulti ?? 55)
          : (fatalCfg.maxActiveLimit1v1 ?? 65);
  const MAX_BLOOD_PARTICLES = Math.floor(maxLimit * qualityMultiplier);

  const baseDecay = isStandOff ? (physCfg.floorDecayRateStandOff ?? 0.014) : (physCfg.floorDecayRate1v1 ?? 0.010);
  const decayRate = baseDecay + Math.random() * (baseDecay * 0.5);

  const arena = (CONFIG && CONFIG.arena) || (state && state.arena);
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaLeft = (arena ? arena.x : 0) + wallW;
  const arenaRight = (arena ? arena.x + arena.width : 1200) - wallW;
  const arenaTop = (arena ? arena.y : 0) + wallW;
  const arenaBottom = (arena ? arena.y + arena.height : 800) - wallW;

  const clampFx = Math.max(arenaLeft + 6, Math.min(arenaRight - 6, fx));
  const clampFy = Math.max(arenaTop + 6, Math.min(arenaBottom - 6, fy));

  const baseSpeed = fatalCfg.baseSpeed ?? 6.0;
  const speedVar = fatalCfg.speedVariance ?? 12.0;
  const minSize = fatalCfg.minSize ?? 3.0;
  const maxSize = fatalCfg.maxSize ?? 5.0;

  for (let i = 0; i < splashCount; i++) {
    const angle = (Math.PI * 2 * i) / splashCount + (Math.random() - 0.5) * 0.45;
    const speed = baseSpeed + Math.random() * speedVar;
    const globalMultiplier = bloodCfg.globalSizeMultiplier ?? 1.0;
    const size = (minSize + Math.random() * (maxSize - minSize)) * globalMultiplier;

    const color = bloodColors[i % bloodColors.length];

    const startX = Math.max(arenaLeft + size / 2, Math.min(arenaRight - size / 2, clampFx + (Math.random() - 0.5) * fr * 0.7));
    const startY = Math.max(arenaTop + size / 2, Math.min(arenaBottom - size / 2, clampFy + (Math.random() - 0.5) * fr * 0.7));

    if (state.bloodEffects.length >= MAX_BLOOD_PARTICLES) {
      const overwriteIdx = Math.floor(Math.random() * state.bloodEffects.length);
      const old = state.bloodEffects[overwriteIdx];
      if (old && old.sprite) releaseBloodSprite(old.sprite);

      const sprite = getBloodSprite();
      sprite.tint = color;
      sprite.width = size;
      sprite.height = size;

      state.bloodEffects[overwriteIdx] = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.85 - (2 + Math.random() * 4), // Visceral radial burst arc
        size: size,
        life: 1.0,
        decay: decayRate,
        airResistance: physCfg.airResistance ?? 0.95,
        friction: physCfg.floorFriction ?? 0.85,
        onGround: false,
        sprite: sprite
      };
    } else {
      const sprite = getBloodSprite();
      sprite.tint = color;
      sprite.width = size;
      sprite.height = size;

      state.bloodEffects.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.85 - (2 + Math.random() * 4), // Visceral radial burst arc
        size: size,
        life: 1.0,
        decay: decayRate,
        airResistance: physCfg.airResistance ?? 0.95,
        friction: physCfg.floorFriction ?? 0.85,
        onGround: false,
        sprite: sprite
      });
    }
  }

  // Also trigger physical meaty flesh burst sound
  if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
    audioSystem.playSFX('attack_fleshhit', 1.4);
  }
}

/**
 * Spawns a visceral, directional crimson blood burst when Nanami unpauses from a 7:3 Ratio Severance.
 */
export function spawnNanamiRatioBloodBurst(target, count = 16, angle = null) {
  if (!target) return;
  if (!state.bloodEffects) state.bloodEffects = [];

  const bloodColors = [0xE50018, 0xDC2626, 0x990000, 0x78000A, 0xFF1E27, 0xB91C1C];
  const tx = typeof target.x === 'number' ? target.x : 0;
  const ty = typeof target.y === 'number' ? target.y : 0;
  const tr = typeof target.r === 'number' ? target.r : 25;
  const dirAngle = (angle !== null && angle !== undefined) ? angle : Math.random() * Math.PI * 2;

  const arena = (CONFIG && CONFIG.arena) || (state && state.arena);
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaLeft = (arena ? arena.x : 0) + wallW;
  const arenaRight = (arena ? arena.x + arena.width : 1200) - wallW;
  const arenaTop = (arena ? arena.y : 0) + wallW;
  const arenaBottom = (arena ? arena.y + arena.height : 800) - wallW;

  const clampTx = Math.max(arenaLeft + 6, Math.min(arenaRight - 6, tx));
  const clampTy = Math.max(arenaTop + 6, Math.min(arenaBottom - 6, ty));

  // 1. Spawn directional high-velocity PixiJS blood droplets
  const particleCount = Math.max(8, count);
  for (let i = 0; i < particleCount; i++) {
    const spread = (Math.random() - 0.5) * (Math.PI * 0.65);
    const particleAngle = dirAngle + spread;
    const speed = 5.0 + Math.random() * 8.5;
    const globalMultiplier = (CONFIG && CONFIG.blood && CONFIG.blood.globalSizeMultiplier) ?? 1.0;
    const size = (3.2 + Math.random() * 3.5) * globalMultiplier;
    const color = bloodColors[i % bloodColors.length];

    const startX = Math.max(arenaLeft + size / 2, Math.min(arenaRight - size / 2, clampTx + (Math.random() - 0.5) * tr * 0.6));
    const startY = Math.max(arenaTop + size / 2, Math.min(arenaBottom - size / 2, clampTy + (Math.random() - 0.5) * tr * 0.6));

    const sprite = getBloodSprite();
    if (sprite) {
      sprite.tint = color;
      sprite.width = size;
      sprite.height = size;
    }

    state.bloodEffects.push({
      x: startX,
      y: startY,
      vx: Math.cos(particleAngle) * speed,
      vy: Math.sin(particleAngle) * speed - (1.2 + Math.random() * 2.5),
      size: size,
      life: 1.0,
      decay: 0.008 + Math.random() * 0.006,
      airResistance: 0.94,
      friction: 0.85,
      onGround: false,
      sprite: sprite
    });
  }

  // 2. Also spawn 2D Canvas visceral crimson impact sparks for guaranteed immediate visual bursting!
  if (typeof spawnSparks === 'function') {
    spawnSparks(clampTx, clampTy, 14, 'crimson', '#DC2626');
    spawnSparks(clampTx, clampTy, 8, 'crimson', '#78000A');
  }
}

/**
 * Updates all blood effects with natural gravity arcs and bottom arena border landing.
 */
export function updateBloodEffects() {
  if (!state.bloodEffects) return;
  const arena = (CONFIG && CONFIG.arena) || (state && state.arena);
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaTop = (arena ? arena.y : 0) + wallW;
  const arenaBottom = (arena ? arena.y + arena.height : 800) - wallW;
  const arenaLeft = (arena ? arena.x : 0) + wallW;
  const arenaRight = (arena ? arena.x + arena.width : 1200) - wallW;
  const gravity = (CONFIG && CONFIG.blood && CONFIG.blood.physics && CONFIG.blood.physics.gravity) ?? 0.38;

  fastCleanArray(state.bloodEffects, (effect) => {
    if (!effect.onGround) {
      // 1. Natural fluid gravity arc in the air
      effect.vx *= effect.airResistance;
      effect.vy *= effect.airResistance;
      effect.vy += gravity; // Smooth, weighted fluid gravity falling down towards bottom floor
      effect.x += effect.vx;
      effect.y += effect.vy;

      // Left / right arena wall bounces
      if (effect.x <= arenaLeft + effect.size / 2) {
        effect.x = arenaLeft + effect.size / 2;
        effect.vx = Math.abs(effect.vx) * 0.3;
      } else if (effect.x >= arenaRight - effect.size / 2) {
        effect.x = arenaRight - effect.size / 2;
        effect.vx = -Math.abs(effect.vx) * 0.3;
      }

      // Top ceiling arena wall bounce (STRICTLY PREVENTS PARTICLES ESCAPING TOP OF ARENA)
      if (effect.y <= arenaTop + effect.size / 2) {
        effect.y = arenaTop + effect.size / 2;
        effect.vy = Math.abs(effect.vy) * 0.3; // Deflect downward into the arena
      }

      // Check collision with the bottom border of the arena
      if (effect.y >= arenaBottom - effect.size / 2) {
        effect.y = arenaBottom - effect.size / 2;
        effect.onGround = true;
        effect.vy = 0;
      }

      // Droplet remains 100% visible while falling to the floor
      effect.sprite.x = effect.x;
      effect.sprite.y = effect.y;
      effect.sprite.width = effect.size;
      effect.sprite.height = effect.size;
      effect.sprite.alpha = effect.life;
      effect.sprite.rotation = 0; // Keep crisp pixel square alignment
      return true;
    } else {
      // 2. Resting on the bottom border of the arena (splatter puddle stain)
      effect.vx *= effect.friction;
      effect.x += effect.vx;
      effect.x = Math.max(arenaLeft + effect.size / 2, Math.min(arenaRight - effect.size / 2, effect.x));
      effect.y = arenaBottom - effect.size / 3;

      // Decays ONLY after it has dropped to the bottom floor
      effect.life -= effect.decay;

      if (effect.life > 0) {
        // Flatten into a floor blood puddle stain
        effect.sprite.x = effect.x;
        effect.sprite.y = effect.y;
        effect.sprite.width = effect.size * 1.45;
        effect.sprite.height = effect.size * 0.65;
        effect.sprite.alpha = effect.life;
        effect.sprite.rotation = 0;
        return true;
      } else {
        releaseBloodSprite(effect.sprite);
        return false;
      }
    }
  });
}

/**
 * Deprecated: PixiJS automatically renders the sprites in the background scene graph.
 */
export function drawBloodEffects() {
  // Empty - kept so `renderSystem.js` doesn't crash before being updated
}

/**
 * Immediately clears ALL lingering battle visual effects so they vanish cleanly
 * when the champion-screen black overlay starts fading in (matchEndTimer === 60).
 * Properly releases PixiJS blood sprites back to the pool and clears every effect array.
 */
export function clearAllBattleEffects() {
  // 1. Release PixiJS blood sprites back to pool before clearing the array
  if (state.bloodEffects && state.bloodEffects.length > 0) {
    for (let i = 0; i < state.bloodEffects.length; i++) {
      const e = state.bloodEffects[i];
      if (e && e.sprite) releaseBloodSprite(e.sprite);
    }
    state.bloodEffects.length = 0;
  }

  // 2. Clear 2D-canvas & PixiJS-drawn effect arrays
  if (state.sparkEffects && state.sparkEffects.length > 0) {
    // Safely return all spark particles & their PixiJS Sprites to object pools
    for (let i = 0; i < state.sparkEffects.length; i++) {
      const e = state.sparkEffects[i];
      if (e) {
        ParticleSystem.returnParticle(e);
      }
    }
    state.sparkEffects.length = 0;
  }
  if (state.deathEffects) state.deathEffects.length = 0;
  if (state.doppelgangerDeathEffects) state.doppelgangerDeathEffects.length = 0;
  if (state.illusionDeathEffects) state.illusionDeathEffects.length = 0;
  if (state.illusionSpawnEffects) state.illusionSpawnEffects.length = 0;
  if (state.berserkerRageEffects) state.berserkerRageEffects.length = 0;
  if (state.floatingTexts) state.floatingTexts.length = 0;
  if (state.thermobaricExplosions) state.thermobaricExplosions.length = 0;

  // Clear WebGL particles
  bomberExplosionSystem.clear();
  burnEffectSystem.clear();

  // If CJ won the round/match, keep his Greenwood sedan roaming for victory celebrations!
  const isCjWinner = Boolean(
    state.fighters && state.fighters.some(f => {
      const isCj = f && (f.characterId === 'cj' || f.type === 'cj');
      return isCj && f.hp > 0 && !f.dead;
    })
  );

  if (!isCjWinner) {
    clearDriveBys();
  }

  // 3. Clear per-fighter attached visual effects (hitFlameWisps, afterImages, punchEffects, trails)
  if (state.fighters) {
    for (const f of state.fighters) {
      if (!f) continue;
      if (f.hitFlameWisps) f.hitFlameWisps.length = 0;
      if (f.afterImages) f.afterImages.length = 0;
      if (f.stealthAfterimages) f.stealthAfterimages.length = 0;
      if (f.adaptationAfterimages) f.adaptationAfterimages.length = 0;
      if (f.swordTrail) f.swordTrail.length = 0;
      if (f.punchEffects) f.punchEffects.length = 0;
      if (f.slashHitVisuals) f.slashHitVisuals.length = 0;
      if (f.flurrySlashVisuals) f.flurrySlashVisuals.length = 0;
    }
  }
}