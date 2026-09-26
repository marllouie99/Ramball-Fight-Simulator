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

export function generateThemeBloodPalette(color) {
  const baseHex = parseColorToHexNum(color);
  const r = (baseHex >> 16) & 0xFF;
  const g = (baseHex >> 8) & 0xFF;
  const b = baseHex & 0xFF;

  const brightR = Math.min(255, Math.round(r * 1.35));
  const brightG = Math.min(255, Math.round(g * 1.35));
  const brightB = Math.min(255, Math.round(b * 1.35));

  const darkR = Math.round(r * 0.70);
  const darkG = Math.round(g * 0.70);
  const darkB = Math.round(b * 0.70);

  const deepR = Math.round(r * 0.45);
  const deepG = Math.round(g * 0.45);
  const deepB = Math.round(b * 0.45);

  return [
    baseHex,
    ((brightR << 16) | (brightG << 8) | brightB) & 0xFFFFFF,
    baseHex,
    ((darkR << 16) | (darkG << 8) | darkB) & 0xFFFFFF,
    ((deepR << 16) | (deepG << 8) | deepB) & 0xFFFFFF
  ];
}

export function warmUpBloodSpritePool(count = 40) {
  if (typeof window === 'undefined' || !window.PIXI || !state.bloodSquareTexture || !state.pixiLayers || !state.pixiLayers.particles) return;
  while (bloodSpritePool.length < count) {
    const s = new window.PIXI.Sprite(state.bloodSquareTexture);
    s.anchor.set(0.5);
    s.visible = false;
    state.pixiLayers.particles.addChild(s);
    bloodSpritePool.push(s);
  }
}

// Pre-warm pool on module load if PixiJS is already active
if (typeof window !== 'undefined') {
  setTimeout(() => warmUpBloodSpritePool(40), 10);
}

function getBloodSprite() {
  if (typeof window === 'undefined' || !window.PIXI || !state.bloodSquareTexture || !state.pixiLayers || !state.pixiLayers.particles) {
    return null;
  }
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

function addOrOverwriteBloodParticle(particleData, maxParticles = 300) {
  if (state.bloodEffects.length >= maxParticles) {
    // Smart priority: Overwrite an existing particle that is ALREADY on the ground
    let bestIdx = -1;
    let lowestLife = Infinity;

    for (let i = 0; i < state.bloodEffects.length; i++) {
      const p = state.bloodEffects[i];
      if (p && p.onGround) {
        if (p.life < lowestLife) {
          lowestLife = p.life;
          bestIdx = i;
        }
      }
    }

    // Never overwrite or reset an in-flight falling particle
    if (bestIdx === -1) {
      return;
    }

    const old = state.bloodEffects[bestIdx];
    if (old && old.sprite) releaseBloodSprite(old.sprite);

    const sprite = getBloodSprite();
    if (sprite) {
      sprite.tint = particleData.numericColor;
      sprite.width = particleData.size;
      sprite.height = particleData.size;
      sprite.alpha = 1.0;
      sprite.x = particleData.x;
      sprite.y = particleData.y;
    }
    particleData.sprite = sprite;

    state.bloodEffects[bestIdx] = particleData;
  } else {
    const sprite = getBloodSprite();
    if (sprite) {
      sprite.tint = particleData.numericColor;
      sprite.width = particleData.size;
      sprite.height = particleData.size;
      sprite.alpha = 1.0;
      sprite.x = particleData.x;
      sprite.y = particleData.y;
    }
    particleData.sprite = sprite;

    state.bloodEffects.push(particleData);
  }
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
 * High-velocity directional blood droplets erupt along the strike/damage vector,
 * flying away from the attacker in a natural, impactful ballistic cone.
 */
export function spawnBloodEffect(arg0, arg1 = 10, arg2 = null, arg3 = null, arg4 = null) {
  let entity = null;
  let dmgAmount = 10;
  let angle = null;
  let opts = null;

  // Pattern 1: Coordinate call spawnBloodEffect(x, y, ...)
  if (typeof arg0 === 'number' && typeof arg1 === 'number') {
    entity = { x: arg0, y: arg1, r: 25 };
    if (typeof arg2 === 'number') {
      dmgAmount = arg2;
      if (typeof arg3 === 'string') {
        opts = { color: arg3 };
        if (typeof arg4 === 'number') angle = arg4;
        else if (typeof arg4 === 'object' && arg4 !== null) opts = Object.assign({ color: arg3 }, arg4);
      } else if (typeof arg3 === 'object' && arg3 !== null) {
        opts = arg3;
        if (typeof arg4 === 'number') angle = arg4;
      } else if (typeof arg3 === 'number') {
        angle = arg3;
        if (typeof arg4 === 'object' && arg4 !== null) opts = arg4;
        else if (typeof arg4 === 'string') opts = { color: arg4 };
      }
    } else if (typeof arg2 === 'string') {
      opts = { color: arg2 };
      if (typeof arg3 === 'number') {
        if (typeof arg4 === 'number') {
          dmgAmount = arg3;
          angle = arg4;
        } else {
          dmgAmount = arg3;
        }
      }
    } else if (typeof arg2 === 'object' && arg2 !== null) {
      opts = arg2;
      if (typeof arg3 === 'number') {
        if (typeof arg4 === 'number') {
          dmgAmount = arg3;
          angle = arg4;
        } else {
          dmgAmount = arg3;
        }
      }
    }
  } else if (arg0 && typeof arg0 === 'object') {
    // Pattern 2: Entity call spawnBloodEffect(entity, amount, damageAngle, customOpts)
    entity = arg0;
    dmgAmount = typeof arg1 === 'number' ? arg1 : 10;
    if (typeof arg2 === 'number') {
      angle = arg2;
      if (typeof arg3 === 'object' && arg3 !== null) opts = arg3;
      else if (typeof arg3 === 'string') opts = { color: arg3 };
    } else if (typeof arg2 === 'object' && arg2 !== null) {
      opts = arg2;
      if (typeof arg3 === 'number') angle = arg3;
    } else if (typeof arg2 === 'string') {
      opts = { color: arg2 };
      if (typeof arg3 === 'number') angle = arg3;
    } else {
      if (typeof arg3 === 'object' && arg3 !== null) opts = arg3;
      else if (typeof arg3 === 'string') opts = { color: arg3 };
    }
  }

  if (!entity || dmgAmount <= 0) return;
  if (!state.bloodEffects) state.bloodEffects = [];

  // Infer impact angle if still not provided
  if (angle === null || angle === undefined || isNaN(angle)) {
    if (opts) {
      if (typeof opts.damageAngle === 'number') angle = opts.damageAngle;
      else if (typeof opts.angle === 'number') angle = opts.angle;
      else if (typeof opts.hitAngle === 'number') angle = opts.hitAngle;
      else if (typeof opts.attackAngle === 'number') angle = opts.attackAngle;
      else if (opts.projectile) {
        if (typeof opts.projectile.vy === 'number' && typeof opts.projectile.vx === 'number' && (opts.projectile.vx !== 0 || opts.projectile.vy !== 0)) {
          angle = Math.atan2(opts.projectile.vy, opts.projectile.vx);
        } else if (typeof opts.projectile.angle === 'number') {
          angle = opts.projectile.angle;
        }
      } else if (opts.attacker && typeof opts.attacker.x === 'number' && typeof opts.attacker.y === 'number') {
        angle = Math.atan2(entity.y - opts.attacker.y, entity.x - opts.attacker.x);
      }
    }
  }
  if (angle === null || angle === undefined || isNaN(angle)) {
    if (entity) {
      if (typeof entity.lastHitAngle === 'number') {
        angle = entity.lastHitAngle;
      } else if (typeof entity.knockbackVx === 'number' && typeof entity.knockbackVy === 'number' && Math.hypot(entity.knockbackVx, entity.knockbackVy) > 0.05) {
        angle = Math.atan2(entity.knockbackVy, entity.knockbackVx);
      } else if (entity.lastAttacker && typeof entity.lastAttacker.x === 'number' && typeof entity.lastAttacker.y === 'number') {
        angle = Math.atan2(entity.y - entity.lastAttacker.y, entity.x - entity.lastAttacker.x);
      } else if (entity.attacker && typeof entity.attacker.x === 'number' && typeof entity.attacker.y === 'number') {
        angle = Math.atan2(entity.y - entity.attacker.y, entity.x - entity.attacker.x);
      }
    }
  }

  const isStandOff = isStandOffMode();
  const isFFA = state && state.mode === GAME_MODES.FFA;
  const is1v2 = typeof state !== 'undefined' && state.mode && (state.mode === '1v2' || state.mode.includes('1v2'));
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';

  const bloodCfg = (CONFIG && CONFIG.blood) || {};
  const hitCfg = bloodCfg.hit || {};
  const physCfg = bloodCfg.physics || {};

  const isTactical = (typeof state !== 'undefined' && (state.gameCategory === 'tactical' || String(state.mode).toLowerCase().includes('tactical')));
  const tacticalEnabled = (CONFIG && CONFIG.tactical && CONFIG.tactical.enableThemeColoredBlood !== false);
  const targetColor = (opts && opts.color) || (entity && (entity.color || entity.themeColor || (entity._def && entity._def.color)));

  let bloodPalette;
  if (opts && Array.isArray(opts.palette)) {
    bloodPalette = opts.palette.map(parseColorToHexNum);
  } else if (opts && opts.color) {
    bloodPalette = generateThemeBloodPalette(opts.color);
  } else if (isTactical && tacticalEnabled && targetColor) {
    bloodPalette = generateThemeBloodPalette(targetColor);
  } else {
    bloodPalette = bloodCfg.palette || [0xE60000, 0xDC2626, 0x990000, 0x800000, 0xCC0000, 0xB91C1C];
  }

  const qualityMultiplier = state.qualityLevel || 1.0;
  const MAX_BLOOD_PARTICLES = Math.floor(300 * qualityMultiplier);

  // Scaled down: standard hits spawn 2-4 droplets
  const divisor = hitCfg.damageDivisor ?? 10.0;
  const minDrops = hitCfg.minDroplets ?? 2;
  const maxDrops = hitCfg.maxDroplets ?? 4;
  const baseParticleCount = Math.max(minDrops, Math.min(maxDrops, Math.floor(dmgAmount / divisor) || minDrops));
  const particleCount = (opts && opts.count !== undefined)
    ? Math.max(1, Math.floor(opts.count * qualityMultiplier))
    : Math.max(1, Math.floor(baseParticleCount * qualityMultiplier));

  // Blood MUST be authentic crimson red / dark blood, never washed-out white
  const fx = typeof entity.x === 'number' ? entity.x : 0;
  const fy = typeof entity.y === 'number' ? entity.y : 0;
  const fr = typeof entity.r === 'number' ? entity.r : 25;

  const arena = (state && state.arena) || (CONFIG && CONFIG.arena) || { x: 0, y: 0, width: 1200, height: 800 };
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaLeft = arena.x + wallW;
  const arenaRight = arena.x + arena.width - wallW;
  const arenaTop = arena.y + wallW;
  const arenaBottom = arena.y + arena.height - wallW;

  const clampFx = Math.max(arenaLeft + 4, Math.min(arenaRight - 4, fx));
  const clampFy = Math.max(arenaTop + 4, Math.min(arenaBottom - 4, fy));

  const baseDecay = isStandOff ? (physCfg.floorDecayRateStandOff ?? 0.008) : (physCfg.floorDecayRate1v1 ?? 0.006);
  const decayRate = baseDecay + Math.random() * (baseDecay * 0.5);

  const baseSpeed = hitCfg.baseSpeed ?? 7.0;
  const speedVar = hitCfg.speedVariance ?? 8.0;
  const spreadRad = (hitCfg.spreadAngle ?? 0.22) * Math.PI;
  const minSize = (opts && opts.minSize !== undefined) ? opts.minSize : (hitCfg.minSize ?? 4.6);
  const maxSize = (opts && opts.maxSize !== undefined) ? opts.maxSize : (hitCfg.maxSize ?? 5.6);
  const upImpulse = hitCfg.upwardImpulse ?? 0.15;
  const upImpulseVar = hitCfg.upwardImpulseVariance ?? 0.35;

  const hasDirection = (angle !== null && angle !== undefined && !isNaN(angle));
  const baseAngle = hasDirection ? angle : 0;
  const cosA = Math.cos(baseAngle);
  const sinA = Math.sin(baseAngle);
  const perpX = -sinA;
  const perpY = cosA;

  for (let i = 0; i < particleCount; i++) {
    let pAngle;
    let speed;
    let startX;
    let startY;

    const globalMultiplier = bloodCfg.globalSizeMultiplier ?? 1.0;
    const size = (minSize + Math.random() * (maxSize - minSize)) * globalMultiplier;
    const numericColor = bloodPalette[i % bloodPalette.length];

    if (hasDirection) {
      const isPrimaryForward = (i % 5 !== 4); // 80% primary forward jet, 20% lateral/mist droplets
      if (isPrimaryForward) {
        // High-velocity forward jet within tight cone — blood ERUPTS along the hit direction
        pAngle = baseAngle + (Math.random() - 0.5) * spreadRad;
        speed = baseSpeed + Math.random() * speedVar;
        const exitOffset = fr * (0.3 + Math.random() * 0.4);
        const lateralJitter = (Math.random() - 0.5) * fr * 0.3;
        startX = clampFx + cosA * exitOffset + perpX * lateralJitter;
        startY = clampFy + sinA * exitOffset + perpY * lateralJitter;
      } else {
        // Secondary wider-angle splatter mist
        pAngle = baseAngle + (Math.random() - 0.5) * (Math.PI * 0.55);
        speed = baseSpeed * 0.55 + Math.random() * (speedVar * 0.4);
        startX = clampFx + cosA * (fr * 0.15) + (Math.random() - 0.5) * fr * 0.4;
        startY = clampFy + sinA * (fr * 0.15) + (Math.random() - 0.5) * fr * 0.4;
      }
    } else {
      // Full 360-degree radial fallback (no direction info)
      pAngle = Math.random() * Math.PI * 2;
      speed = baseSpeed + Math.random() * speedVar;
      startX = clampFx + (Math.random() - 0.5) * fr * 0.5;
      startY = clampFy + (Math.random() - 0.5) * fr * 0.5;
    }

    startX = Math.max(arenaLeft + size / 2, Math.min(arenaRight - size / 2, startX));
    startY = Math.max(arenaTop + size / 2, Math.min(arenaBottom - size / 2, startY));

    // Pure directional velocity — blood flies in the hit direction, gravity handles the arc
    const vx = Math.cos(pAngle) * speed;
    const vy = Math.sin(pAngle) * speed - (upImpulse + Math.random() * upImpulseVar);

    addOrOverwriteBloodParticle({
      x: startX,
      y: startY,
      vx: vx,
      vy: vy,
      size: size,
      numericColor: numericColor,
      life: 1.0,
      decay: decayRate,
      airResistance: physCfg.airResistance ?? 0.982,
      friction: physCfg.floorFriction ?? 0.85,
      onGround: false
    }, MAX_BLOOD_PARTICLES);
  }
}

/**
 * Spawns a visceral blood splash explosion when a fighter is killed / splashed to death.
 * Erupts with high-velocity blood droplets, directional arterial exit jets along the kill vector,
 * and outward splatter arcs across the arena floor.
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

  let fx = 0;
  let fy = 0;
  let fr = 25;
  let opts = {};
  let targetFighter = null;

  if (typeof fighterOrX === 'number') {
    fx = fighterOrX;
    fy = typeof optsOrY === 'number' ? optsOrY : 0;
    fr = typeof maybeR === 'number' ? maybeR : 25;
  } else if (fighterOrX && typeof fighterOrX === 'object') {
    targetFighter = fighterOrX;
    fx = typeof fighterOrX.x === 'number' ? fighterOrX.x : 0;
    fy = typeof fighterOrX.y === 'number' ? fighterOrX.y : 0;
    fr = typeof fighterOrX.r === 'number' ? fighterOrX.r : 25;
    opts = (typeof optsOrY === 'object' && optsOrY !== null) ? optsOrY : {};
  } else {
    return;
  }

  // Infer fatal impact angle if present
  let fatalAngle = null;
  if (opts) {
    if (typeof opts.damageAngle === 'number') fatalAngle = opts.damageAngle;
    else if (typeof opts.angle === 'number') fatalAngle = opts.angle;
    else if (typeof opts.hitAngle === 'number') fatalAngle = opts.hitAngle;
    else if (opts.attacker && typeof opts.attacker.x === 'number' && typeof opts.attacker.y === 'number') {
      fatalAngle = Math.atan2(fy - opts.attacker.y, fx - opts.attacker.x);
    }
  }
  if (fatalAngle === null && targetFighter) {
    if (typeof targetFighter.lastHitAngle === 'number') fatalAngle = targetFighter.lastHitAngle;
    else if (typeof targetFighter.knockbackVx === 'number' && typeof targetFighter.knockbackVy === 'number' && Math.hypot(targetFighter.knockbackVx, targetFighter.knockbackVy) > 0.05) {
      fatalAngle = Math.atan2(targetFighter.knockbackVy, targetFighter.knockbackVx);
    } else if (targetFighter.lastAttacker && typeof targetFighter.lastAttacker.x === 'number' && typeof targetFighter.lastAttacker.y === 'number') {
      fatalAngle = Math.atan2(fy - targetFighter.lastAttacker.y, fx - targetFighter.lastAttacker.x);
    }
  }

  const isTactical = (typeof state !== 'undefined' && (state.gameCategory === 'tactical' || String(state.mode).toLowerCase().includes('tactical')));
  const tacticalEnabled = (CONFIG && CONFIG.tactical && CONFIG.tactical.enableThemeColoredBlood !== false);
  const targetColor = (opts && opts.color) || (targetFighter && (targetFighter.color || targetFighter.themeColor || (targetFighter._def && targetFighter._def.color)));

  let bloodColors;
  if (opts && Array.isArray(opts.palette)) {
    bloodColors = opts.palette.map(parseColorToHexNum);
  } else if (opts && opts.color) {
    bloodColors = generateThemeBloodPalette(opts.color);
  } else if (isTactical && tacticalEnabled && targetColor) {
    bloodColors = generateThemeBloodPalette(targetColor);
  } else {
    bloodColors = bloodCfg.palette || [0xE60000, 0xDC2626, 0xCC0000, 0x990000, 0x800000, 0xB91C1C];
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

  const arena = (state && state.arena) || (CONFIG && CONFIG.arena) || { x: 0, y: 0, width: 1200, height: 800 };
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaLeft = arena.x + wallW;
  const arenaRight = arena.x + arena.width - wallW;
  const arenaTop = arena.y + wallW;
  const arenaBottom = arena.y + arena.height - wallW;

  const clampFx = Math.max(arenaLeft + 6, Math.min(arenaRight - 6, fx));
  const clampFy = Math.max(arenaTop + 6, Math.min(arenaBottom - 6, fy));

  const baseSpeed = fatalCfg.baseSpeed ?? 6.0;
  const speedVar = fatalCfg.speedVariance ?? 12.0;
  const minSize = fatalCfg.minSize ?? 3.0;
  const maxSize = fatalCfg.maxSize ?? 5.0;

  for (let i = 0; i < splashCount; i++) {
    let angle;
    let speed;
    if (fatalAngle !== null && !isNaN(fatalAngle) && (i % 2 === 0)) {
      // 50% arterial exit jet along fatal impact angle
      angle = fatalAngle + (Math.random() - 0.5) * (Math.PI * 0.45);
      speed = baseSpeed * 1.1 + Math.random() * (speedVar * 1.2);
    } else {
      // 50% 360-degree visceral explosive radial blast
      angle = (Math.PI * 2 * i) / splashCount + (Math.random() - 0.5) * 0.45;
      speed = baseSpeed + Math.random() * speedVar;
    }

    const globalMultiplier = bloodCfg.globalSizeMultiplier ?? 1.0;
    const size = (minSize + Math.random() * (maxSize - minSize)) * globalMultiplier;
    const color = bloodColors[i % bloodColors.length];

    const startX = Math.max(arenaLeft + size / 2, Math.min(arenaRight - size / 2, clampFx + (Math.random() - 0.5) * fr * 0.7));
    const startY = Math.max(arenaTop + size / 2, Math.min(arenaBottom - size / 2, clampFy + (Math.random() - 0.5) * fr * 0.7));

    addOrOverwriteBloodParticle({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.85 - (1.5 + Math.random() * 3.0),
      size: size,
      numericColor: color,
      life: 1.0,
      decay: decayRate,
      airResistance: physCfg.airResistance ?? 0.95,
      friction: physCfg.floorFriction ?? 0.85,
      onGround: false
    }, 300);
  }

  // Also trigger physical meaty flesh burst sound
  if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
    audioSystem.playSFX('attack_fleshhit', 1.4);
  }
}

/**
 * Spawns natural angular-physics blood shatter particles when Makima shatters.
 * High-velocity 360-degree radial blast with directional bias along the impact angle,
 * natural ballistic parabolic arcs, air drag, and wall/floor collision physics.
 */
export function spawnMakimaBloodShatter(fighterOrX, optsOrY = {}, maybeAngle = null) {
  if (fighterOrX === null || fighterOrX === undefined) return;
  if (!state.bloodEffects) state.bloodEffects = [];

  let fx = 0;
  let fy = 0;
  let fr = 25;
  let impactAngle = null;

  if (typeof fighterOrX === 'number') {
    fx = fighterOrX;
    fy = typeof optsOrY === 'number' ? optsOrY : 0;
    impactAngle = typeof maybeAngle === 'number' ? maybeAngle : null;
  } else if (fighterOrX && typeof fighterOrX === 'object') {
    fx = typeof fighterOrX.x === 'number' ? fighterOrX.x : 0;
    fy = typeof fighterOrX.y === 'number' ? fighterOrX.y : 0;
    fr = typeof fighterOrX.r === 'number' ? fighterOrX.r : 25;
    impactAngle = (typeof optsOrY === 'object' && optsOrY && optsOrY.angle !== undefined)
      ? optsOrY.angle
      : (typeof maybeAngle === 'number' ? maybeAngle : null);
  } else {
    return;
  }

  const arena = (state && state.arena) || (CONFIG && CONFIG.arena) || { x: 0, y: 0, width: 1200, height: 800 };
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaLeft = arena.x + wallW;
  const arenaRight = arena.x + arena.width - wallW;
  const arenaTop = arena.y + wallW;
  const arenaBottom = arena.y + arena.height - wallW;

  const clampFx = Math.max(arenaLeft + 6, Math.min(arenaRight - 6, fx));
  const clampFy = Math.max(arenaTop + 6, Math.min(arenaBottom - 6, fy));

  const qualityMultiplier = state.qualityLevel || 1.0;
  const particleCount = Math.max(18, Math.floor(34 * qualityMultiplier));

  // Authentic Makima palette: deep coagulated dark red, velvet crimson, bright arterial, and solar gold
  const bloodColors = [0x880808, 0xA31D24, 0xDC2626, 0x450A0A, 0x990000, 0xF59E0B];

  for (let i = 0; i < particleCount; i++) {
    // Natural angular distribution: Full 360-degree explosive burst with directional bias if impact angle is present
    let angle;
    if (impactAngle !== null && impactAngle !== undefined) {
      if (i % 3 === 0) {
        // Forward impact spray cone
        angle = impactAngle + (Math.random() - 0.5) * (Math.PI * 0.65);
      } else {
        // Full radial shatter blast
        angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.45;
      }
    } else {
      // Complete uniform 360-degree angular distribution
      angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.45;
    }

    // Dynamic speed range: fast explosive kinetic burst (5.5px to 14.5px per frame)
    const speed = 5.5 + Math.random() * 9.0;
    const size = 2.2 + Math.random() * 3.2; // Crisp pixel droplet size
    const color = bloodColors[i % bloodColors.length];

    // Natural upward ballistic kick based on angle
    const upKick = (Math.sin(angle) < 0 ? 1.2 : 0.4) * (1.5 + Math.random() * 3.0);

    const startX = Math.max(arenaLeft + size / 2, Math.min(arenaRight - size / 2, clampFx + (Math.random() - 0.5) * fr * 0.6));
    const startY = Math.max(arenaTop + size / 2, Math.min(arenaBottom - size / 2, clampFy + (Math.random() - 0.5) * fr * 0.6));

    addOrOverwriteBloodParticle({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - upKick,
      size: size,
      numericColor: color,
      life: 1.0,
      decay: 0.007 + Math.random() * 0.005, // Lingers naturally on floor for ~2.5 to 3.5 seconds
      airResistance: 0.965,
      friction: 0.84,
      onGround: false
    }, 300);
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

  const arena = (state && state.arena) || (CONFIG && CONFIG.arena) || { x: 0, y: 0, width: 1200, height: 800 };
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaLeft = arena.x + wallW;
  const arenaRight = arena.x + arena.width - wallW;
  const arenaTop = arena.y + wallW;
  const arenaBottom = arena.y + arena.height - wallW;

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

    addOrOverwriteBloodParticle({
      x: startX,
      y: startY,
      vx: Math.cos(particleAngle) * speed,
      vy: Math.sin(particleAngle) * speed - (1.2 + Math.random() * 2.5),
      size: size,
      numericColor: color,
      life: 1.0,
      decay: 0.008 + Math.random() * 0.006,
      airResistance: 0.96,
      friction: 0.85,
      onGround: false
    }, 300);
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
  const arena = (state && state.arena) || (CONFIG && CONFIG.arena) || { x: 0, y: 0, width: 1200, height: 800 };
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaTop = arena.y + wallW;
  const arenaBottom = arena.y + arena.height - wallW;
  const arenaLeft = arena.x + wallW;
  const arenaRight = arena.x + arena.width - wallW;

  const bloodCfg = (CONFIG && CONFIG.blood) || {};
  const physCfg = bloodCfg.physics || {};
  const gravity = physCfg.gravity ?? 0.18;
  const airRes = physCfg.airResistance ?? 0.982;

  fastCleanArray(state.bloodEffects, (effect) => {
    if (!effect.onGround) {
      // 1. Natural fluid gravity arc in the air — preserve horizontal momentum
      const drag = effect.airResistance ?? airRes;
      effect.vx *= drag;
      effect.vy *= drag;
      // Gravity pulls downward, creating a natural parabolic blood arc
      effect.vy = Math.min(22, effect.vy + gravity);
      effect.x += effect.vx;
      effect.y += effect.vy;

      // Left / right arena wall bounces
      if (effect.x <= arenaLeft + effect.size / 2) {
        effect.x = arenaLeft + effect.size / 2;
        effect.vx = Math.abs(effect.vx) * 0.35;
      } else if (effect.x >= arenaRight - effect.size / 2) {
        effect.x = arenaRight - effect.size / 2;
        effect.vx = -Math.abs(effect.vx) * 0.35;
      }

      // Top ceiling arena wall bounce (STRICTLY PREVENTS PARTICLES ESCAPING TOP OF ARENA)
      if (effect.y <= arenaTop + effect.size / 2) {
        effect.y = arenaTop + effect.size / 2;
        effect.vy = Math.abs(effect.vy) * 0.35; // Deflect downward into the arena
      }

      // Check collision with the bottom border of the arena
      if (effect.y >= arenaBottom - effect.size / 2) {
        effect.y = arenaBottom - effect.size / 2;
        effect.onGround = true;
        effect.vy = 0;
        effect.vx *= 0.5;
      }

      // Droplet remains 100% visible while falling to the floor
      if (effect.sprite) {
        effect.sprite.x = effect.x;
        effect.sprite.y = effect.y;
        effect.sprite.width = effect.size;
        effect.sprite.height = effect.size;
        effect.sprite.alpha = 1.0;
        effect.sprite.rotation = 0; // Keep crisp pixel square alignment
      }
      return true;
    } else {
      // 2. Resting on the bottom border of the arena (splatter puddle stain)
      effect.vx *= (effect.friction ?? (physCfg.floorFriction ?? 0.85));
      effect.x += effect.vx;
      effect.x = Math.max(arenaLeft + effect.size / 2, Math.min(arenaRight - effect.size / 2, effect.x));
      effect.y = arenaBottom - effect.size / 3;

      // Decays ONLY after it has dropped to the bottom floor
      // STOP decaying once the round winner is declared — blood stays as battle scars
      const roundOver = Boolean(
        state.roundWinner ||
        state.matchWinner ||
        state.matchEndTimer > 0 ||
        state.roundEndTimer > 0 ||
        state.gameState === 'roundEnd' ||
        state.gameState === 'matchEnd' ||
        state.isRoundDraw ||
        state.isDraw
      );
      if (!roundOver) {
        effect.life -= effect.decay;
      }

      if (effect.life > 0) {
        // Flatten into a floor blood puddle stain
        if (effect.sprite) {
          effect.sprite.x = effect.x;
          effect.sprite.y = effect.y;
          effect.sprite.width = effect.size * 1.5;
          effect.sprite.height = effect.size * 0.65;
          effect.sprite.alpha = effect.life;
          effect.sprite.rotation = 0;
        }
        return true;
      } else {
        if (effect.sprite) releaseBloodSprite(effect.sprite);
        return false;
      }
    }
  });
}

/**
 * Renders blood effects in Canvas 2D fallback mode when PixiJS is unavailable or in test environments.
 */
export function drawBloodEffects(ctx) {
  const drawCtx = ctx || (typeof state !== 'undefined' ? state.ctx : null);
  if (!drawCtx || !state.bloodEffects || state.bloodEffects.length === 0) return;
  // If PixiJS is actively rendering these sprites, skip 2D canvas drawing to prevent double-draw
  if (state.pixiLayers && state.pixiLayers.particles && state.bloodSquareTexture) return;

  for (let i = 0; i < state.bloodEffects.length; i++) {
    const e = state.bloodEffects[i];
    if (!e || e.life <= 0) continue;
    const r = (e.numericColor >> 16) & 0xFF;
    const g = (e.numericColor >> 8) & 0xFF;
    const b = e.numericColor & 0xFF;
    const alpha = e.onGround ? Math.max(0, Math.min(1, e.life)) : 1.0;
    drawCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
    if (e.onGround) {
      drawCtx.fillRect(e.x - e.size * 0.75, e.y - e.size * 0.325, e.size * 1.5, e.size * 0.65);
    } else {
      drawCtx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    }
  }
}

/**
 * Immediately clears transient battle visual effects when the champion-screen black overlay fades in.
 * Note: Blood effects and permanent gore are PRESERVED as battle scars during the winner state.
 */
export function clearAllBattleEffects() {
  // Blood effects are intentionally PRESERVED during the winner state as permanent battle scars!
  // (They are only cleaned up when a new round or match begins in reinitFighters)

  // 1. Clear 2D-canvas & PixiJS-drawn spark effect arrays
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
  if (state.deathEffects) {
    // Retain permanent Eye of Cthulhu gore pieces, Ender Dragon death animation, and XP fountain orbs during win reveals!
    state.deathEffects = state.deathEffects.filter(e => e && (e.isEyeOfCthulhuGore || e.isPermanentGore || e.isEnderDragonDeath || e.isEnderDragonXPOrb));
  }
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
      if (typeof f.clearAllAfterimages === 'function') f.clearAllAfterimages();
      else if (f.afterImages) f.afterImages.length = 0;
      if (typeof f.clearAllAttackEffects === 'function') f.clearAllAttackEffects();
      else {
        if (f.hitFlameWisps) f.hitFlameWisps.length = 0;
        if (f.swordTrail) f.swordTrail.length = 0;
        if (f.punchEffects) f.punchEffects.length = 0;
        if (f.slashHitVisuals) f.slashHitVisuals.length = 0;
        if (f.flurrySlashVisuals) f.flurrySlashVisuals.length = 0;
      }
    }
  }
}