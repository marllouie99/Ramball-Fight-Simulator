// ─────────────────────────────────────────────
// RYOMEN SUKUNA — TEN SHADOWS: MAHORAGA SUMMON MODULE
// Calls the Divine General Mahoraga into the arena as an allied Fighter minion
// that teams up with Sukuna until he is slain (no lifetime cap).
//
// Mahoraga is an authentic MahoragaFighter instance: complete 5-phase Sword of
// Extermination combos, heavy punch knockbacks, World Cleave, Divine Shout,
// Eight-Handled Wheel adaptation progression, RCT healing, 3D rotating wheel,
// overhead health text, and coordinated ally combat alongside Sukuna.
// ─────────────────────────────────────────────
import { CONFIG } from '../../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake, createFighterInstance } from '../../../core/state.js';
import { applyDamageToTarget } from '../../fighter.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';
import { spawnDroppedMahoragaWheel } from '../../../graphics/particles/mahoragaDroppedWheel.js';
import { audioSystem } from '../../../systems/audioSystem.js';

let _MahoragaClass = null;

export function registerMahoragaClass(cls) {
  if (cls) _MahoragaClass = cls;
}

function getMahoragaClass() {
  if (_MahoragaClass) return _MahoragaClass;
  if (typeof createFighterInstance === 'function') {
    try {
      const dummy = createFighterInstance({ type: 'mahoraga', hp: 100 }, 0);
      if (dummy && dummy.constructor) {
        _MahoragaClass = dummy.constructor;
        return _MahoragaClass;
      }
    } catch (e) { /* lazy init */ }
  }
  return _MahoragaClass;
}

// Proactive asynchronous warm-up to ensure MahoragaClass is loaded without top-level circular lock
if (typeof process !== 'undefined' || typeof window !== 'undefined') {
  import('../MahoragaFighter.js').then((mod) => {
    if (mod && mod.MahoragaFighter) _MahoragaClass = mod.MahoragaFighter;
  }).catch(() => {});
}

const SUMMON_CFG = () => (CONFIG && CONFIG.sukuna) ? CONFIG.sukuna : {};

function resolveAttributes() {
  const m = (CONFIG && CONFIG.mahoraga) ? CONFIG.mahoraga : {};
  const scale = SUMMON_CFG().mahoragaSummonStatScale ?? 1.0;
  const scaled = (v) => (typeof v === 'number' ? Math.round(v * scale) : v);
  const sizeMult = CONFIG.globalFighter?.sizeMultiplier ?? 1.0;
  const internalScale = CONFIG.internalScale ?? 1.0;
  const baseR = m.r ?? m.radius ?? 30;
  const fighterR = baseR * sizeMult * internalScale;
  return {
    scale,
    baseRadius: baseR,
    radius: fighterR,
    maxHp: scaled(m.hp ?? 250),
    speed: (m.moveSpeed ?? m.speed ?? 6.5) * scale,
    swordDamage: scaled(m.swordDamage ?? 15),
    swordCooldown: m.swordCooldown ?? 20,
    swordRange: m.swordRange ?? 110,
    cleaveEnabled: m.enableCleave !== false,
    cleaveRadius: m.cleaveRadius ?? 150,
    cleaveDamage: scaled(m.cleaveDamage ?? 40),
    cleaveCooldown: m.cleaveCooldown ?? 600,
    shoutEnabled: m.enableDivineShout !== false,
    shoutRange: m.shoutRange ?? 350,
    shoutConeAngle: m.shoutConeAngle ?? 1.35,
    shoutDamage: scaled(m.shoutDamage ?? 100),
    shoutCooldown: m.shoutCooldown ?? 1000,
    maxStages: m.maxAdaptationStages ?? 8,
    defPerStage: m.defBuffPerClickPercent ?? 0.05,
    maxDefReduction: m.maxDefBuffPercent ?? 0.50,
    rctHealPercent: m.rctHealPercent ?? 0.35,
    doubleDamageFrames: m.wheelDoubleDamageDurationFrames ?? 240,
    doubleDamageMultiplier: m.wheelDoubleDamageMultiplier ?? 2.0
  };
}

function playSummonSound(key, fallbackSrc, fallbackVol) {
  const c = SUMMON_CFG();
  const src = c?.sounds?.[key] || fallbackSrc;
  const vol = c?.soundVolumes?.[key] !== undefined ? c.soundVolumes[key] : fallbackVol;
  if (!src || vol <= 0) return;
  const delay = c?.soundDelays?.[key] || 0;
  try {
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(src, vol, 1.0, 0, delay);
    }
  } catch (e) { /* audio is non-critical */ }
}

function isOwnerAlive(fighter) {
  if (!fighter) return false;
  return !(fighter.hp <= 0 || fighter.isDead || fighter.dead || fighter._hasDied);
}

function getTeamOf(fighter) {
  if (!fighter) return null;
  if (typeof state !== 'undefined' && Array.isArray(state.fighters) && typeof state.getFighterTeam === 'function') {
    const idx = state.fighters.indexOf(fighter);
    if (idx !== -1) return state.getFighterTeam(idx);
  }
  return fighter.team !== undefined ? fighter.team : null;
}

function isHostileTarget(target, fighter, myTeam) {
  if (!target || target === fighter) return false;
  if (target.hp <= 0 || target.isDead || target.dead) return false;
  if (target.isLawnmower || target.isUntargetable || target.untargetable || target.cannotBeTargeted || target.isTargetable === false) return false;
  const targetOwner = target.isIllusion ? target.owner : target;
  if (!targetOwner || targetOwner === fighter) return false;
  if (target.isMahoragaSummon || target.owner === fighter) return false;
  if (typeof fighter.isTeammate === 'function' && fighter.isTeammate(target)) return false;
  if (myTeam !== null && myTeam !== undefined && typeof state !== 'undefined' && Array.isArray(state.fighters)) {
    const targetIdx = state.fighters.indexOf(targetOwner);
    if (targetIdx !== -1 && typeof state.getFighterTeam === 'function' && state.getFighterTeam(targetIdx) === myTeam) return false;
    if (targetOwner.team !== undefined && targetOwner.team === myTeam) return false;
  }
  return true;
}

function findNearestEnemy(fighter, fromX, fromY) {
  if (typeof state === 'undefined') return null;
  const myTeam = getTeamOf(fighter);
  const ox = fromX !== undefined ? fromX : fighter.x;
  const oy = fromY !== undefined ? fromY : fighter.y;

  let best = null;
  let bestDist = Infinity;
  const consider = (entity) => {
    if (!isHostileTarget(entity, fighter, myTeam)) return;
    const d = Math.hypot(entity.x - ox, entity.y - oy);
    if (d < bestDist) {
      bestDist = d;
      best = entity;
    }
  };

  if (Array.isArray(state.fighters)) state.fighters.forEach(consider);
  if (Array.isArray(state.illusions)) state.illusions.forEach(consider);
  return best;
}

function clampToArena(entity, arena) {
  const ar = arena || (typeof state !== 'undefined' ? state.arena : null) || CONFIG.arena;
  if (!ar) return;
  const radius = entity.r || 30;
  if (ar.shape === 'circle') {
    const cx = ar.x + ar.width / 2;
    const cy = ar.y + ar.height / 2;
    const maxR = Math.max(10, (ar.radius || (ar.width / 2)) - radius);
    const dx = entity.x - cx;
    const dy = entity.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR && dist > 0) {
      entity.x = cx + (dx / dist) * maxR;
      entity.y = cy + (dy / dist) * maxR;
      entity.vx = 0;
      entity.vy = 0;
    }
    return;
  }
  const minX = ar.x + radius;
  const maxX = ar.x + ar.width - radius;
  const minY = ar.y + radius;
  const maxY = ar.y + ar.height - radius;
  if (entity.x < minX) { entity.x = minX; entity.vx = 0; }
  else if (entity.x > maxX) { entity.x = maxX; entity.vx = 0; }
  if (entity.y < minY) { entity.y = minY; entity.vy = 0; }
  else if (entity.y > maxY) { entity.y = maxY; entity.vy = 0; }
}

export function initMahoragaSummon(fighter) {
  if (!fighter) return;
  const c = SUMMON_CFG();
  fighter.mahoragaSummonActive = false;
  fighter.mahoragaSummonCooldown = c.mahoragaSummonInitialCooldown ?? c.mahoragaSummonCooldown ?? 420;
  fighter.mahoragaMinion = null;
}

export function resetMahoragaSummon(fighter) {
  dispelMahoragaSummon(fighter, { silent: true, instantCooldown: true });
  initMahoragaSummon(fighter);
}

function buildMinion(fighter, ownerIndex, target, arena) {
  const c = SUMMON_CFG();
  const attrs = resolveAttributes();
  const radius = attrs.radius;
  const ar = arena || (typeof state !== 'undefined' ? state.arena : null) || CONFIG.arena;

  // Rise out of Sukuna's own shadow, on the flank facing away from the prey
  const awayAngle = target ? Math.atan2(fighter.y - target.y, fighter.x - target.x) : (fighter.gunAngle || 0) + Math.PI;
  const spawnDist = (fighter.r || 25) + radius + 14;
  const sx = fighter.x + Math.cos(awayAngle) * spawnDist;
  const sy = fighter.y + Math.sin(awayAngle) * spawnDist;
  const facing = target ? Math.atan2(target.y - sy, target.x - sx) : (fighter.angle || 0);

  const mConfig = (CONFIG && CONFIG.mahoraga) ? CONFIG.mahoraga : {};
  const mahoragaDef = {
    ...mConfig,
    id: 'mahoraga_summon',
    characterId: 'mahoraga',
    type: 'mahoraga',
    name: 'Mahoraga',
    displayName: 'DIVINE GENERAL MAHORAGA',
    color: '#F5F5DC',
    themeColor: '#FFD700',
    skinColor: '#F5F5DC',
    radius: attrs.baseRadius,
    r: attrs.baseRadius,
    spinRate: 0,
    hp: attrs.maxHp,
    maxHp: attrs.maxHp,
    moveSpeed: attrs.speed,
    speed: attrs.speed,
    damage: attrs.swordDamage,
    cooldown: mConfig.swordCooldown ?? 20,
    swordDamage: attrs.swordDamage,
    cleaveDamage: attrs.cleaveDamage,
    shoutDamage: attrs.shoutDamage
  };

  const MahoragaClass = getMahoragaClass();
  if (!MahoragaClass) {
    console.error('MahoragaClass not registered or loaded yet');
    return null;
  }
  const minion = new MahoragaClass(mahoragaDef);
  minion.r = radius;
  minion.radius = radius;
  minion.x = sx;
  minion.y = sy;
  minion.angle = facing;
  minion.gunAngle = facing;
  minion.hp = attrs.maxHp;
  minion.maxHp = attrs.maxHp;
  minion.moveSpeed = attrs.speed;
  minion.baseSpeed = attrs.speed;
  minion.speed = attrs.speed;
  minion.spinRate = 0;
  if (minion._def && typeof minion._def === 'object') minion._def.spinRate = 0;
  minion.damage = attrs.swordDamage;
  minion.swordDamage = attrs.swordDamage;
  minion.swordRange = attrs.swordRange;
  minion.cleaveDamage = attrs.cleaveDamage;
  minion.shoutDamage = attrs.shoutDamage;
  minion._attrs = attrs;

  // Team & Ownership integration
  minion.owner = fighter;
  minion.ownerIndex = typeof ownerIndex === 'number' ? ownerIndex : (Array.isArray(state.fighters) ? state.fighters.indexOf(fighter) : 0);
  minion.team = fighter.team;
  minion.isMinion = true;
  minion.isIllusion = true;
  minion.isMahoragaSummon = true;
  minion.isTeammateWithSummoner = true;

  // Aliases and backward-compatible getters/setters
  minion.attackInterval = attrs.swordCooldown;
  Object.defineProperty(minion, 'attackCooldown', {
    get() { return this.swordCooldown || 0; },
    set(v) { this.swordCooldown = v; },
    configurable: true
  });
  Object.defineProperty(minion, 'adaptStage', {
    get() { return this.adaptationStage?.melee || 0; },
    set(v) {
      if (!this.adaptationStage) this.adaptationStage = { melee: 0, ranged: 0, skill: 0 };
      this.adaptationStage.melee = v;
      if (!this.goldAdaptationStage) this.goldAdaptationStage = { melee: 0, ranged: 0, skill: 0 };
      this.goldAdaptationStage.melee = v;
    },
    configurable: true
  });
  Object.defineProperty(minion, 'adaptCooldown', {
    get() { return this.fatalAdaptCooldown || 0; },
    set(v) { this.fatalAdaptCooldown = v; },
    configurable: true
  });
  Object.defineProperty(minion, 'cleaveTimer', {
    get() { return this.cleaveCooldown || 0; },
    set(v) { this.cleaveCooldown = v; },
    configurable: true
  });
  Object.defineProperty(minion, 'shoutTimer', {
    get() { return this.shoutCooldown || 0; },
    set(v) { this.shoutCooldown = v; },
    configurable: true
  });
  Object.defineProperty(minion, 'doubleDamageTimer', {
    get() { return this.wheelDoubleDamageTimer || 0; },
    set(v) { this.wheelDoubleDamageTimer = v; },
    configurable: true
  });

  // Dedicated teammate resolution: Sukuna, Sukuna's summons, and Sukuna's allies are teammates
  minion.isTeammate = function(other) {
    if (!other || other === this) return false;
    if (other === this.owner || other.owner === this.owner) return true;
    if (this.owner && typeof this.owner.isTeammate === 'function' && this.owner.isTeammate(other)) return true;
    if (other.owner && typeof other.owner.isTeammate === 'function' && other.owner.isTeammate(this)) return true;
    const BaseClass = getMahoragaClass();
    if (BaseClass && BaseClass.prototype && typeof BaseClass.prototype.isTeammate === 'function') {
      return BaseClass.prototype.isTeammate.call(this, other);
    }
    return false;
  };

  // Dedicated friendly fire protection
  const superTakeDamage = minion.takeDamage.bind(minion);
  minion.takeDamage = function(amount, attacker, opts = {}) {
    const isHeal = Boolean(opts?.isHeal || amount < 0);
    if (!isHeal && attacker) {
      if (attacker === this.owner || attacker.owner === this.owner) return false;
      if (this.isTeammate(attacker)) return false;
      if (typeof attacker.isTeammate === 'function' && attacker.isTeammate(this)) return false;
    }
    return superTakeDamage(amount, attacker, opts);
  };

  minion.preprocessIncomingDamage = function(amount) {
    const stage = this.adaptStage || 0;
    const reduction = Math.min(stage * attrs.defPerStage, attrs.maxDefReduction);
    const scaled = amount * (1 - reduction);
    return scaled > 0 && scaled < 1 ? 1 : scaled;
  };

  // Shadow emergence setup
  const spawnFrames = c.mahoragaSummonSpawnFrames ?? 45;
  minion.spawnTimer = spawnFrames;
  minion.spawnScale = 0.15;
  minion.dodgeIFrames = spawnFrames;

  clampToArena(minion, ar);
  return minion;
}

export function trySummonMahoraga(fighter, ownerIndex, arena) {
  const c = SUMMON_CFG();
  if (!fighter) return false;
  if (!fighter.isSkillEnabled(c.enableMahoragaSummon, true)) return false;
  if (fighter.isDemoFighter) return false;
  if ((fighter.mahoragaSummonCooldown || 0) > 0) return false;
  if (fighter.mahoragaSummonActive && fighter.mahoragaMinion) return false;
  if (!isOwnerAlive(fighter)) return false;
  if (typeof state === 'undefined' || state.gameState !== 'playing') return false;
  if (fighter.isChannelingDomainExpansion || fighter.isChannelingDivineFlame) return false;
  if ((fighter.silenceTimer || 0) > 0) return false;
  if (fighter.isTargetOfAmbush) return false;
  if (fighter.timeStopTimer > 0) return false;

  const maxActive = c.mahoragaSummonMaxActive ?? 1;
  if (Array.isArray(state.illusions)) {
    const live = state.illusions.filter((m) => m && m.isMahoragaSummon && m.owner === fighter && m.hp > 0).length;
    if (live >= maxActive) return false;
  }

  const target = findNearestEnemy(fighter);
  if (!target) return false;

  const minion = buildMinion(fighter, ownerIndex, target, arena);
  if (!minion) return false;
  if (!Array.isArray(state.illusions)) state.illusions = [];
  state.illusions.push(minion);

  fighter.mahoragaMinion = minion;
  fighter.mahoragaSummonActive = true;

  spawnFloatingText(fighter.x, fighter.y - fighter.r - 44, 'TEN SHADOWS: MAHORAGA!', '#FFD700');
  spawnImpactFlash(minion.x, minion.y, 60, 'rgba(255, 215, 0, 0.55)');
  spawnSparks(minion.x, minion.y, 26, 'crimsonSniper');
  triggerGlobalScreenShake(c.mahoragaSummonShakeIntensity ?? 5, c.mahoragaSummonShakeDuration ?? 10);

  playSummonSound('mahoragaSummon', 'Assets/Sound Effects/Skills/domainexpansion.mp3', 1.6);
  return true;
}

export function dispelMahoragaSummon(fighter, opts = {}) {
  const minion = fighter?.mahoragaMinion
    || (Array.isArray(state?.illusions) ? state.illusions.find((m) => m && m.isMahoragaSummon && m.owner === fighter) : null);
  const c = SUMMON_CFG();

  if (minion) {
    minion.isShouting = false;
    minion.shoutPhase = null;
    minion.shoutWindupTimer = 0;
    minion.shoutRecoveryTimer = 0;
    if (minion.activeSonicBooms) minion.activeSonicBooms.length = 0;
    if (typeof minion.onDeath === 'function') {
      minion.onDeath();
    } else if (!opts.silent && typeof spawnDroppedMahoragaWheel === 'function') {
      spawnDroppedMahoragaWheel(minion);
    }
    if (!opts.silent) {

      const burstRadius = c.mahoragaSummonShatterRadius ?? 130;
      const burstDamage = c.mahoragaSummonShatterDamage ?? 18;
      const myTeam = getTeamOf(fighter);
      if (Array.isArray(state.fighters) && burstDamage > 0 && fighter) {
        state.fighters.forEach((enemy) => {
          if (!isHostileTarget(enemy, fighter, myTeam)) return;
          const dx = enemy.x - minion.x;
          const dy = enemy.y - minion.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist > burstRadius + (enemy.r || 0)) return;
          enemy.takeDamage?.(burstDamage, fighter, { isMinion: true, isMahoragaSummon: true });
          enemy.applyHitStun?.(8);
          const push = 6;
          enemy.vx += (dx / dist) * push;
          enemy.vy += (dy / dist) * push;
        });
      }

      spawnImpactFlash(minion.x, minion.y, 55, 'dark');
      spawnImpactFlash(minion.x, minion.y, 40, '#FFD700');
      for (let i = 0; i < 22; i++) spawnSparks(minion.x, minion.y, 1, 'crimsonSniper');
      triggerGlobalScreenShake(4, 8);
      spawnFloatingText(minion.x, minion.y - minion.r - 30, opts.reason === 'slain' ? 'DIVINE GENERAL SLAIN!' : 'MAHORAGA RETURNS TO SHADOW', '#FFD700');
      playSummonSound('mahoragaDispel', 'Assets/Sound Effects/Skills/enhance.mp3', 0.6);
    }

    if (Array.isArray(state?.illusions)) {
      const idx = state.illusions.indexOf(minion);
      if (idx !== -1) {
        state.illusions[idx] = state.illusions[state.illusions.length - 1];
        state.illusions.pop();
      }
    }
  }

  if (fighter) {
    fighter.mahoragaMinion = null;
    fighter.mahoragaSummonActive = false;
    fighter.mahoragaSummonCooldown = opts.instantCooldown
      ? 0
      : (c.mahoragaSummonCooldown ?? 1500);
  }
}

export function handleMahoragaSummonDeath(minion) {
  if (!minion) return;
  const owner = minion.owner || null;
  dispelMahoragaSummon(owner, { reason: 'slain' });
  if (Array.isArray(state?.illusions)) {
    const idx = state.illusions.indexOf(minion);
    if (idx !== -1) {
      state.illusions[idx] = state.illusions[state.illusions.length - 1];
      state.illusions.pop();
    }
  }
  if (owner && owner.mahoragaMinion === minion) {
    owner.mahoragaMinion = null;
    owner.mahoragaSummonActive = false;
  }
}

export function updateMahoragaSummon(fighter, ownerIndex, arena) {
  if (!fighter) return;
  const c = SUMMON_CFG();
  const minion = fighter.mahoragaMinion;

  if (fighter.mahoragaSummonActive) {
    const stillAlive = Boolean(minion && Array.isArray(state?.illusions) && state.illusions.includes(minion) && minion.hp > 0);
    if (!stillAlive) {
      fighter.mahoragaMinion = null;
      fighter.mahoragaSummonActive = false;
      return;
    }
    if (!isOwnerAlive(fighter)) {
      dispelMahoragaSummon(fighter, { silent: true });
      return;
    }

    updateMinionAI(fighter, minion, arena, c);
    return;
  }

  trySummonMahoraga(fighter, ownerIndex, arena);
}

function updateMinionAI(fighter, minion, arena, c) {
  if (!fighter || !minion || minion.hp <= 0 || minion.isDead) return;

  // RULE 25: Unconditionally decay active transient VFX so shockwaves never freeze!
  minion._updateSonicBooms?.();

  // If match or round ended (e.g. Sukuna won), immediately halt combat and lock facing upright (Rule 19)
  const isMatchEnded = typeof state !== 'undefined' && (
    state.gameState === 'roundEnd' || 
    state.gameState === 'matchEnd'
  );
  if (isMatchEnded) {
    minion.interruptAttacks?.(true);
    minion.isShouting = false;
    minion.shoutPhase = null;
    minion.shoutWindupTimer = 0;
    minion.shoutRecoveryTimer = 0;
    minion.isCleaving = false;
    minion.isThrowing = false;
    minion.vx = 0;
    minion.vy = 0;
    minion.angle = 0;
    minion.gunAngle = 0;
    if (minion.activeSonicBooms) minion.activeSonicBooms.length = 0;
    return;
  }

  const attrs = minion._attrs || resolveAttributes();
  minion._attrs = attrs;

  // Shadow emergence phase: rooted until manifested
  if ((minion.spawnTimer || 0) > 0) {
    minion.spawnTimer--;
    const spawnFrames = c.mahoragaSummonSpawnFrames || 45;
    const progress = 1 - (minion.spawnTimer / spawnFrames);
    minion.spawnScale = Math.min(1.0, 0.15 + progress * 0.85);
    minion.vx = 0;
    minion.vy = 0;
    if (minion.spawnTimer % 6 === 0) {
      spawnSparks(minion.x, minion.y, 3, 'crimsonSniper');
    }
    if (minion.spawnTimer === Math.max(1, Math.floor(spawnFrames * 0.35))) {
      playSummonSound('mahoragaArise', 'Assets/Sound Effects/Skills/mahoraga-wheelclick.mp3', 1.4);
      spawnImpactFlash(minion.x, minion.y, 70, 'rgba(255, 215, 0, 0.6)');
      triggerGlobalScreenShake(c.mahoragaSummonShakeIntensity ?? 5, c.mahoragaSummonShakeDuration ?? 10);
      minion.wheelGlowTimer = 45;
    }
    if (minion.spawnTimer <= 0) {
      minion.spawnScale = 1.0;
      minion.dodgeIFrames = 0;
      spawnFloatingText(minion.x, minion.y - minion.r - 40, 'DIVINE GENERAL', '#FFD700');
    }
    clampToArena(minion, arena);
    return;
  }

  // Active combat: Team up with Sukuna
  const sukunaTarget = fighter.target || fighter.currentTarget;
  const preferred = (sukunaTarget && !minion.isTeammate(sukunaTarget) && sukunaTarget.hp > 0 && !sukunaTarget.isDead)
    ? sukunaTarget
    : null;

  const target = (typeof minion._findClosestEnemy === 'function' ? minion._findClosestEnemy(preferred) : null)
    || findNearestEnemy(fighter, minion.x, minion.y);

  if (!target || target.hp <= 0 || target.isDead) {
    minion._target = null;
    minion.isShouting = false;
    minion.shoutPhase = null;
    minion.shoutWindupTimer = 0;
    minion.shoutRecoveryTimer = 0;
    minion.isCleaving = false;
    minion.isThrowing = false;
    // Escort / flank near Sukuna
    const dx = fighter.x - minion.x;
    const dy = fighter.y - minion.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > (fighter.r || 25) + minion.r + 24) {
      minion.vx += (dx / dist) * (minion.speed || 6.5) * 0.15;
      minion.vy += (dy / dist) * (minion.speed || 6.5) * 0.15;
      const moveAngle = Math.atan2(minion.vy, minion.vx);
      minion.angle = moveAngle;
      minion.gunAngle = moveAngle;
    } else {
      minion.vx *= 0.85;
      minion.vy *= 0.85;
      minion.angle = fighter.gunAngle || fighter.angle || 0;
      minion.gunAngle = fighter.gunAngle || fighter.angle || 0;
    }
    minion.applyMovementPhysics(0.5);
    clampToArena(minion, arena);
    return;
  }

  minion._target = target;
  const distToTarget = Math.hypot(target.x - minion.x, (target.y - (target.z || 0)) - minion.y);
  minion.aim(target);

  // Skill priority checks when off cooldown
  if (attrs.shoutEnabled && minion.shoutCooldown <= 0 && distToTarget <= (attrs.shoutRange || 350)) {
    minion.shoutCooldown = attrs.shoutCooldown;
    minion._executeShout(target, minion.ownerIndex);
  } else if (attrs.cleaveEnabled && minion.cleaveCooldown <= 0 && distToTarget <= (attrs.cleaveRadius || 150) + (target.r || 0)) {
    minion.cleaveCooldown = attrs.cleaveCooldown;
    minion._executeCleave(target);
  }

  // Run full MahoragaFighter combat update
  minion.update(target, minion.ownerIndex, arena);
  clampToArena(minion, arena);
}

export function drawMahoragaSummon(ctx, minion) {
  if (!ctx || !minion) return;
  const spawnScale = minion.spawnScale !== undefined ? minion.spawnScale : 1.0;
  const drawY = minion.y - (minion.z || 0);

  // 1. Shadow pool beneath the Divine General
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(20, 0, 6, 0.55)';
  ctx.beginPath();
  ctx.ellipse(minion.x, drawY + (minion.r || 30) * 0.85, (minion.r || 30) * 1.05 * spawnScale, (minion.r || 30) * 0.35 * spawnScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Emergence ripples while rising from shadow
  if ((minion.spawnTimer || 0) > 0) {
    const spawnFrames = SUMMON_CFG().mahoragaSummonSpawnFrames || 45;
    const progress = 1 - (minion.spawnTimer / spawnFrames);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 215, 0, ${Math.max(0, 0.85 - progress * 0.7)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(minion.x, drawY + (minion.r || 30) * 0.8, (minion.r || 30) * (1.1 + progress * 1.3), (minion.r || 30) * 0.4 * (1.1 + progress * 1.3), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Golden cursed energy aura framing the summon
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(minion.x, drawY, (minion.r || 30) * 0.3, minion.x, drawY, (minion.r || 30) * 1.9 * spawnScale);
  halo.addColorStop(0, 'rgba(255, 215, 0, 0.16)');
  halo.addColorStop(0.55, 'rgba(180, 20, 20, 0.14)');
  halo.addColorStop(1, 'rgba(120, 0, 10, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(minion.x, drawY, (minion.r || 30) * 1.9 * spawnScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Render the full MahoragaFighter
  const target = minion._target || minion.target || (typeof minion._findClosestEnemy === 'function' ? minion._findClosestEnemy() : null);

  if (spawnScale < 0.999) {
    ctx.save();
    ctx.translate(minion.x, drawY);
    ctx.scale(spawnScale, spawnScale);
    ctx.translate(-minion.x, -drawY);
    minion.draw(ctx, target);
    ctx.restore();
  } else {
    minion.draw(ctx, target);
  }
}
