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
    defPerStage: m.defBuffPerClickPercent ?? 0.0,
    maxDefReduction: m.maxDefBuffPercent ?? 0.0,
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
  // While ascending from shadow emergence pool, angle is strictly 0 (facing towards the user/camera Front POV)
  minion.angle = 0;
  minion.gunAngle = 0;
  minion.isAscending = true;
  minion._targetFacing = facing;
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
  minion.spawnScale = 1.0;
  minion.dodgeIFrames = spawnFrames;
  minion.isAscending = true;
  minion.chainsShattered = false;
  minion.shatteredChains = [];

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
  fighter.isSummoningMahoraga = false;
  fighter.mahoragaSummonWindupTimer = 0;

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
    if (minion.shatteredChains) minion.shatteredChains.length = 0;
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
    fighter.isSummoningMahoraga = false;
    fighter.mahoragaSummonWindupTimer = 0;
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

function canInitiateMahoragaSummon(fighter) {
  const c = SUMMON_CFG();
  if (!fighter) return false;
  if (!fighter.isSkillEnabled(c.enableMahoragaSummon, true)) return false;
  if (fighter.isDemoFighter) return false;
  if ((fighter.mahoragaSummonCooldown || 0) > 0) return false;
  if (fighter.mahoragaSummonActive && fighter.mahoragaMinion) return false;
  if (fighter.isSummoningMahoraga) return false;
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
  return true;
}

export function updateMahoragaSummon(fighter, ownerIndex, arena) {
  if (!fighter) return;
  const c = SUMMON_CFG();
  const minion = fighter.mahoragaMinion;

  // 1. Minion is active in combat
  if (fighter.mahoragaSummonActive) {
    const stillAlive = Boolean(minion && Array.isArray(state?.illusions) && state.illusions.includes(minion) && minion.hp > 0);
    if (!stillAlive) {
      fighter.mahoragaMinion = null;
      fighter.mahoragaSummonActive = false;
      fighter.isSummoningMahoraga = false;
      fighter.mahoragaSummonWindupTimer = 0;
      return;
    }
    if (!isOwnerAlive(fighter)) {
      dispelMahoragaSummon(fighter, { silent: true });
      return;
    }

    updateMinionAI(fighter, minion, arena, c);
    return;
  }

  // 2. Active Summon Windup Phase (Hands forming Ten Shadows Mahoraga Mudra)
  if (fighter.isSummoningMahoraga) {
    if (!isOwnerAlive(fighter) || fighter.isTargetOfAmbush || (fighter.silenceTimer || 0) > 0 || fighter.isChannelingDomainExpansion || fighter.isChannelingDivineFlame) {
      fighter.isSummoningMahoraga = false;
      fighter.mahoragaSummonWindupTimer = 0;
      return;
    }

    // Arrest physical momentum during sacred chant
    fighter.vx *= 0.55;
    fighter.vy *= 0.55;

    // Lock facing directly towards player/camera Front POV during chant (Rule 19)
    fighter.gunAngle = 0;
    fighter.angle = 0;

    if (fighter.mahoragaSummonWindupTimer > 0) {
      fighter.mahoragaSummonWindupTimer--;

      const maxW = fighter.mahoragaSummonWindupMax || 28;
      const progress = 1.0 - (fighter.mahoragaSummonWindupTimer / maxW);

      // Spawn ritual dark shadow particles & golden cursed sparks rising around Sukuna
      if (fighter.mahoragaSummonWindupTimer % 4 === 0) {
        spawnSparks(
          fighter.x + (Math.random() - 0.5) * (fighter.r || 25) * 1.5,
          fighter.y + (Math.random() - 0.5) * (fighter.r || 25) * 1.5,
          2,
          'crimsonSniper'
        );
      }

      // Climax screen rumble as the shadows boil
      if (progress > 0.8) {
        triggerGlobalScreenShake(1.5, 2);
      }
    }

    // Windup completed: unleash the Divine General!
    if (fighter.mahoragaSummonWindupTimer <= 0) {
      fighter.isSummoningMahoraga = false;
      trySummonMahoraga(fighter, ownerIndex, arena);
    }
    return;
  }

  // 3. Initiate summon windup when ready
  if (canInitiateMahoragaSummon(fighter)) {
    const windupFrames = c.mahoragaSummonWindupFrames ?? 28;
    fighter.isSummoningMahoraga = true;
    fighter.mahoragaSummonWindupTimer = windupFrames;
    fighter.mahoragaSummonWindupMax = windupFrames;
    fighter.vx *= 0.3;
    fighter.vy *= 0.3;
    fighter.gunAngle = 0;
    fighter.angle = 0;

    spawnFloatingText(fighter.x, fighter.y - (fighter.r || 25) - 44, 'WITH THIS TREASURE...', '#FFD700');
    playSummonSound('mahoragaSummon', 'Assets/Sound Effects/Skills/enhance.mp3', 1.0);
  }
}

function updateMinionAI(fighter, minion, arena, c) {
  if (!fighter || !minion || minion.hp <= 0 || minion.isDead) return;

  // RULE 25: Unconditionally decay active transient VFX so shockwaves never freeze!
  minion._updateSonicBooms?.();
  _updateShatteredChains(minion);

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
    if (minion.shatteredChains) minion.shatteredChains.length = 0;
    return;
  }

  const attrs = minion._attrs || resolveAttributes();
  minion._attrs = attrs;

  // Shadow emergence phase: rooted until manifested, angle strictly locked facing towards the user/camera (Front POV 0)
  if ((minion.spawnTimer || 0) > 0) {
    minion.spawnTimer--;
    minion.isAscending = true;
    minion.angle = 0;
    minion.gunAngle = 0;
    const spawnFrames = c.mahoragaSummonSpawnFrames || 45;
    const progress = 1 - (minion.spawnTimer / spawnFrames);
    minion.ascendProgress = progress;
    minion.spawnScale = 1.0;
    minion.vx = 0;
    minion.vy = 0;
    // Play taut chain rattle at beginning of emergence
    if (minion.spawnTimer === spawnFrames - 1) {
      playSummonSound('mahoragaChainRattle', 'Assets/Sound Effects/Skills/hookchain.mp3', 0.9);
    }

    if (minion.spawnTimer % 6 === 0) {
      spawnSparks(minion.x, minion.y, 3, 'crimsonSniper');
    }

    // High-tension strain sparks on the chains as ascension nears apex
    if (minion.spawnTimer <= 16 && minion.spawnTimer > 6 && minion.spawnTimer % 3 === 0) {
      spawnSparks(minion.x + (Math.random() - 0.5) * minion.r * 1.2, minion.y - (minion.r * 0.4) + (Math.random() - 0.5) * 15, 2, 'crimsonSniper');
    }

    if (minion.spawnTimer === Math.max(1, Math.floor(spawnFrames * 0.35))) {
      playSummonSound('mahoragaArise', 'Assets/Sound Effects/Skills/mahoraga-wheelclick.mp3', 1.4);
      spawnImpactFlash(minion.x, minion.y, 70, 'rgba(255, 215, 0, 0.6)');
      triggerGlobalScreenShake(c.mahoragaSummonShakeIntensity ?? 5, c.mahoragaSummonShakeDuration ?? 10);
      minion.wheelGlowTimer = 45;
    }

    // VIOLENT CHAIN SHATTER on apex emergence (spawnTimer === 6)
    if (minion.spawnTimer === 6 && !minion.chainsShattered) {
      minion.chainsShattered = true;
      playSummonSound('mahoragaChainBreak', 'Assets/Sound Effects/SkillEffects/shield-break.mp3', 1.35);
      playSummonSound('mahoragaChainRattle', 'Assets/Sound Effects/Skills/hookchain.mp3', 1.0);
      spawnImpactFlash(minion.x, minion.y - (minion.z || 0), 85, 'rgba(255, 215, 0, 0.85)');
      triggerGlobalScreenShake(Math.round((c.mahoragaSummonShakeIntensity ?? 5) * 1.4), 12);
      spawnSparks(minion.x, minion.y - (minion.z || 0), 16, 'crimsonSniper');
      _spawnShatteredChains(minion);
    }
    if (minion.spawnTimer <= 0) {
      minion.isAscending = false;
      minion.spawnScale = 1.0;
      minion.dodgeIFrames = 0;
      spawnFloatingText(minion.x, minion.y - minion.r - 40, 'DIVINE GENERAL', '#FFD700');
      // Upon completing emergence, snap aim to face target enemy
      const snapTarget = fighter.target || fighter.currentTarget || findNearestEnemy(fighter, minion.x, minion.y);
      if (snapTarget) {
        minion.aim(snapTarget);
      }
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

/**
 * Renders a segmented authentic pixel-art metal chain link between two points with tension jitter.
 */
function _drawChainSegment(ctx, x1, y1, x2, y2, tension = 0) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return;
  const angle = Math.atan2(dy, dx);
  const linkStep = 7.5;
  const linkCount = Math.max(2, Math.floor(dist / linkStep));

  for (let i = 0; i <= linkCount; i++) {
    const t = i / linkCount;
    let lx = x1 + dx * t;
    let ly = y1 + dy * t;
    if (tension > 0) {
      const j = Math.sin(Date.now() * 0.08 + i * 2.3) * 1.8 * tension;
      lx += -Math.sin(angle) * j;
      ly += Math.cos(angle) * j;
    }

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle);

    if (i % 2 === 0) {
      // Face-on hollow chain link
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-5, -3, 10, 6);
      ctx.fillStyle = '#4C566A';
      ctx.fillRect(-4, -2, 8, 4);
      ctx.fillStyle = '#D8DEE9';
      ctx.fillRect(-4, -2, 8, 1.5);
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-2, -0.75, 4, 1.5);
    } else {
      // Side-on perpendicular link
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-2.5, -4, 5, 8);
      ctx.fillStyle = '#2E3440';
      ctx.fillRect(-1.5, -3, 3, 6);
      ctx.fillStyle = '#8892B0';
      ctx.fillRect(-0.5, -2, 1, 4);
    }

    if (tension > 0.4 && (i + Math.floor(tension * 10)) % 3 === 0) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
      ctx.fillRect(-1, -1, 2, 2);
    }

    ctx.restore();
  }
}

/**
 * Draws the sacred paper talisman seal hanging from Mahoraga's central binding lock.
 */
function _drawTalismanSeal(ctx, x, y, swayAngle = 0, tension = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swayAngle);

  const tw = 8;
  const th = 16;

  // Outer paper edge
  ctx.fillStyle = '#2A2015';
  ctx.fillRect(-tw / 2, 0, tw, th);

  // Aged paper
  ctx.fillStyle = '#F5E6C8';
  ctx.fillRect(-tw / 2 + 1, 1, tw - 2, th - 2);

  // Cinnabar talisman runes
  ctx.fillStyle = tension > 0.5 ? '#FF2222' : '#8B0000';
  ctx.fillRect(-1, 3, 2, 3);
  ctx.fillRect(-2, 7, 4, 1.5);
  ctx.fillRect(-1, 9, 2, 4);
  ctx.fillRect(-1.5, 13, 3, 1);

  if (tension > 0.3) {
    ctx.fillStyle = `rgba(255, 50, 50, ${(0.35 * tension).toFixed(2)})`;
    ctx.fillRect(-tw / 2 - 1, -1, tw + 2, th + 2);
  }

  ctx.restore();
}

/**
 * Draws the bound restraint chains, central medallion, and talisman across Mahoraga's body.
 */
function _drawBoundChains(ctx, minion, r, tension, progress) {
  const drawY = minion.y - (minion.z || 0);
  const sway = Math.sin(progress * Math.PI * 8) * 0.12;

  // 1. Diagonal Cross-Harness Chains over chest/shoulders
  _drawChainSegment(ctx, minion.x - r * 0.70, drawY - r * 0.35, minion.x + r * 0.65, drawY + r * 0.55, tension);
  _drawChainSegment(ctx, minion.x + r * 0.70, drawY - r * 0.35, minion.x - r * 0.65, drawY + r * 0.55, tension);

  // 2. Horizontal Waist / Arm Restraint Band
  _drawChainSegment(ctx, minion.x - r * 0.75, drawY + r * 0.40, minion.x + r * 0.75, drawY + r * 0.40, tension);

  // 3. Central Cursed Iron Medallion / Lock Ring (at center sternum)
  const lockX = minion.x;
  const lockY = drawY + r * 0.10;
  ctx.save();
  ctx.translate(lockX, lockY);
  if (tension > 0) {
    ctx.translate((Math.random() - 0.5) * 1.5 * tension, (Math.random() - 0.5) * 1.5 * tension);
  }

  ctx.fillStyle = '#0E0F14';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2E3440';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.20, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#FFD700';
  ctx.fillRect(-1, -r * 0.12, 2, r * 0.24);
  ctx.fillRect(-r * 0.12, -1, r * 0.24, 2);
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Sacred Paper Talisman hanging from center lock
  _drawTalismanSeal(ctx, lockX, lockY + r * 0.12, sway, tension);
}

/**
 * Spawns 18 flying shattered metal chain link fragments & talisman shreds.
 */
function _spawnShatteredChains(minion) {
  if (!minion) return;
  if (!Array.isArray(minion.shatteredChains)) minion.shatteredChains = [];
  const r = minion.r || 30;
  const drawY = minion.y - (minion.z || 0);

  const shardCount = 18;
  for (let i = 0; i < shardCount; i++) {
    const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    const speed = 4.5 + Math.random() * 6.0;
    const type = (i % 5 === 0) ? 'talisman' : ((i % 2 === 0) ? 'hollow' : 'solid');
    minion.shatteredChains.push({
      x: minion.x + (Math.random() - 0.5) * r * 0.8,
      y: drawY + (Math.random() - 0.5) * r * 0.8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (2.5 + Math.random() * 3.0),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.45,
      type,
      w: type === 'talisman' ? 8 : (type === 'hollow' ? 10 : 6),
      h: type === 'talisman' ? 14 : (type === 'hollow' ? 6 : 9),
      life: 30 + Math.floor(Math.random() * 16),
      maxLife: 46
    });
  }
}

/**
 * Updates physics lifecycles of flying shattered chain shards (Rule 25 decay).
 */
function _updateShatteredChains(minion) {
  if (!minion || !minion.shatteredChains || minion.shatteredChains.length === 0) return;
  for (let i = minion.shatteredChains.length - 1; i >= 0; i--) {
    const p = minion.shatteredChains[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.35; // gravity
    p.vx *= 0.96; // air drag
    p.rot += p.rotSpeed;
    p.life--;
    if (p.life <= 0) {
      minion.shatteredChains.splice(i, 1);
    }
  }
}

/**
 * Renders flying shattered chain shards & shredded talisman papers in world space.
 */
function _drawShatteredChains(ctx, minion) {
  if (!minion || !minion.shatteredChains || minion.shatteredChains.length === 0) return;
  ctx.save();
  for (let i = 0; i < minion.shatteredChains.length; i++) {
    const p = minion.shatteredChains[i];
    const alpha = Math.max(0, Math.min(1.0, p.life / p.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    if (p.type === 'talisman') {
      ctx.fillStyle = '#2A2015';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = '#F5E6C8';
      ctx.fillRect(-p.w / 2 + 1, -p.h / 2 + 1, p.w - 2, p.h - 2);
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(-1, -p.h / 4, 2, p.h / 2);
    } else if (p.type === 'hollow') {
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = '#4C566A';
      ctx.fillRect(-p.w / 2 + 1, -p.h / 2 + 1, p.w - 2, p.h - 2);
      ctx.fillStyle = '#D8DEE9';
      ctx.fillRect(-p.w / 2 + 1, -p.h / 2 + 1, p.w - 2, 1.5);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(p.w / 2 - 2, -1, 2, 2);
    } else {
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = '#2E3440';
      ctx.fillRect(-p.w / 2 + 1, -p.h / 2 + 1, p.w - 2, p.h - 2);
      ctx.fillStyle = '#8892B0';
      ctx.fillRect(-0.5, -p.h / 2 + 2, 1, p.h - 4);
    }

    ctx.restore();
  }
  ctx.restore();
}

export function drawMahoragaSummon(ctx, minion) {
  if (!ctx || !minion) return;
  const isAscending = Boolean(minion.isAscending || (minion.spawnTimer && minion.spawnTimer > 0));
  if (isAscending) {
    minion.angle = 0;
    minion.gunAngle = 0;
  }
  const drawY = minion.y - (minion.z || 0);
  const r = minion.r || 30;
  const groundY = drawY + r * 0.82;

  const spawnFrames = SUMMON_CFG().mahoragaSummonSpawnFrames || 45;
  const progress = isAscending ? Math.min(1.0, Math.max(0.0, 1.0 - ((minion.spawnTimer || 0) / spawnFrames))) : 1.0;
  const chainsShattered = Boolean(minion.chainsShattered);
  const tension = (!chainsShattered && isAscending && progress >= 0.50) ? Math.min(1.0, (progress - 0.50) / 0.35) : 0;

  // 1. Fluid Liquid Shadow Pool on the floor beneath Mahoraga
  const poolPulse = isAscending ? Math.sin(progress * Math.PI * 6) * 2.0 : 0;
  const poolRadiusX = (r * 1.55 + poolPulse);
  const poolRadiusY = (r * 0.44 + poolPulse * 0.25);

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const shadowGrad = ctx.createRadialGradient(minion.x, groundY, r * 0.15, minion.x, groundY, poolRadiusX);
  shadowGrad.addColorStop(0, 'rgba(5, 2, 10, 0.95)');
  shadowGrad.addColorStop(0.55, 'rgba(12, 5, 20, 0.80)');
  shadowGrad.addColorStop(0.85, 'rgba(25, 10, 30, 0.45)');
  shadowGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(minion.x, groundY, poolRadiusX, poolRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Liquid Shadow Emergence Ripples on the ground plane
  if (isAscending) {
    ctx.save();
    const rippleAlpha = Math.max(0, 0.85 - progress * 0.65);
    ctx.strokeStyle = `rgba(255, 215, 0, ${rippleAlpha.toFixed(2)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const rippleR = poolRadiusX * (0.6 + progress * 0.8);
    ctx.ellipse(minion.x, groundY, rippleR, rippleR * 0.30, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary concentric ripple
    const ripple2Progress = (progress + 0.35) % 1.0;
    const ripple2R = poolRadiusX * (0.4 + ripple2Progress * 0.9);
    ctx.strokeStyle = `rgba(255, 180, 0, ${(rippleAlpha * 0.6).toFixed(2)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(minion.x, groundY, ripple2R, ripple2R * 0.30, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Golden cursed energy aura framing the rising Divine General
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const auraProgress = isAscending ? (0.4 + progress * 0.6) : 0.8;
  const halo = ctx.createRadialGradient(minion.x, drawY, r * 0.3, minion.x, drawY, r * 1.9);
  halo.addColorStop(0, `rgba(255, 215, 0, ${(0.18 * auraProgress).toFixed(2)})`);
  halo.addColorStop(0.55, `rgba(180, 20, 20, ${(0.14 * auraProgress).toFixed(2)})`);
  halo.addColorStop(1.0, 'rgba(120, 0, 10, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(minion.x, drawY, r * 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Ground Emergence & Ascension:
  const target = minion._target || minion.target || (typeof minion._findClosestEnemy === 'function' ? minion._findClosestEnemy() : null);

  const riseDist = r * 2.35;
  const easeRise = isAscending ? (0.5 - 0.5 * Math.cos(progress * Math.PI)) : 1.0;
  const riseOffset = (1.0 - easeRise) * riseDist;

  // Back Anchor Chains (connecting from Mahoraga's flanks down into the shadow pit)
  if (isAscending && !chainsShattered && riseOffset < riseDist * 0.90) {
    const curBodyY = drawY + riseOffset;
    if (curBodyY + r * 0.25 < groundY) {
      _drawChainSegment(ctx, minion.x - r * 0.55, curBodyY + r * 0.25, minion.x - r * 1.05, groundY, tension);
      _drawChainSegment(ctx, minion.x + r * 0.55, curBodyY + r * 0.25, minion.x + r * 1.05, groundY, tension);
    }
  }

  if (isAscending && riseOffset > 0.5) {
    ctx.save();
    // Clip region: everything strictly above the ground shadow pool plane (groundY)
    ctx.beginPath();
    ctx.rect(minion.x - r * 4.0, groundY - r * 9.0, r * 8.0, r * 9.0);
    ctx.clip();

    // Translate downward by riseOffset so as riseOffset decreases, Mahoraga emerges upward out of the floor
    ctx.translate(0, riseOffset);
    minion.draw(ctx, target);

    // Draw bound chains wrapped directly over Mahoraga's body while not shattered
    if (!chainsShattered) {
      _drawBoundChains(ctx, minion, r, tension, progress);
    }
    ctx.restore();

    // 5. Front Lip of the Liquid Shadow Pool (overlaps the ground-level emergence plane)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(10, 4, 16, 0.88)';
    ctx.beginPath();
    ctx.ellipse(minion.x, groundY, poolRadiusX * 0.85, poolRadiusY * 0.45, 0, 0, Math.PI); // Front bottom half of ellipse
    ctx.fill();

    // Golden liquid meniscus rim
    ctx.strokeStyle = `rgba(255, 215, 0, ${(0.65 - progress * 0.35).toFixed(2)})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(minion.x, groundY, poolRadiusX * 0.85, poolRadiusY * 0.45, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // Front Anchor Chain (connecting from center chest medallion down to front pool rim)
    if (!chainsShattered) {
      const curLockY = drawY + riseOffset + r * 0.10;
      if (curLockY < groundY - 2) {
        _drawChainSegment(ctx, minion.x, curLockY, minion.x, groundY + 4, tension);
      }
    }
  } else {
    minion.draw(ctx, target);
    if (isAscending && !chainsShattered) {
      _drawBoundChains(ctx, minion, r, tension, progress);
    }
  }

  // 6. Flying Shattered Metal Chain Links & Talisman Paper Particles (Rule 25 decay)
  _drawShatteredChains(ctx, minion);
}
