// ─────────────────────────────────────────────
// MAHITO COMBAT MODULE
// Basic Attack: Idle Transfiguration (Melee Morph)
// Frontal Arc Standard (120°–160° multi-target)
// Soul Disfigurement Stacking & True Damage Burst
// Adheres strictly to:
// - Rule #1: Freeze / TimeStop Early Exits
// - Rule #5: Attacker vs Target Freeze (Never freeze attacker)
// - Rule #6: Unified Target Queries (Fighters & Illusions)
// - Rule #7 & #8: Frontal Arc Radius AOE (Multi-target cone)
// ─────────────────────────────────────────────

import { CONFIG } from '../../../core/config.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../../core/state.js';
import { applyDamageToTarget } from '../../fighter.js';
import { spawnBloodEffect, spawnFatalBloodSplash } from '../../../graphics/particles/bloodEffect.js';
import { spawnDeathShatter } from '../../../graphics/particles/deathShatterEffect.js';
import { spawnSparks, spawnImpactFlash, spawnMeleeClashShockwave, spawnMahitoClawScratchImpact, spawnMahitoSoulExplosion, spawnMahitoDomainSoulTendrilStrike } from '../../../graphics/particles/sparkEffect.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';

/**
 * Helper: Clamps a coordinate (x, y) to inside the active arena boundaries.
 */
function clampToArena(x, y, pad = 0) {
  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
  if (!arena) return { x, y };

  if (arena.shape === 'circle') {
    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const r = (arena.radius || (arena.width / 2)) - pad;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > r && dist > 0) {
      return {
        x: cx + (dx / dist) * r,
        y: cy + (dy / dist) * r
      };
    }
    return { x, y };
  } else {
    // Rectangle
    const minX = arena.x + pad;
    const maxX = arena.x + arena.width - pad;
    const minY = arena.y + pad;
    const maxY = arena.y + arena.height - pad;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }
}

/**
 * Helper: Clamps a target coordinate (x, y) to remain OUTSIDE Gojo's active Limitless Infinity barrier circle.
 */
function clampOutsideGojoInfinity(x, y, target, pad = 0) {
  if (!target) return { x, y };

  const isGojoInfinity = (target.characterId === 'gojo' || target.type === 'gojo') &&
    !target.isMeleeMode &&
    ((target.infinityCooldown || 0) <= 0 || target.infinityActive);

  if (!isGojoInfinity) return { x, y };

  const barrierR = (target.r || 25) + 35 + pad;
  const dx = x - target.x;
  const dy = y - target.y;
  const dist = Math.hypot(dx, dy);

  if (dist < barrierR) {
    const angle = dist > 0.1 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
    return {
      x: target.x + Math.cos(angle) * barrierR,
      y: target.y + Math.sin(angle) * barrierR
    };
  }

  return { x, y };
}

/**
 * Helper: Find all valid enemy targets (fighters & illusions) in Mahito's frontal arc.
 */
export function getMahitoFrontRadiusTargets(fighter, reachOffset = 75, coneAngle = (135 * Math.PI / 180)) {
  const targets = [];
  if (typeof state === 'undefined' || !state || !state.fighters) return targets;

  const myIndex = state.fighters.indexOf(fighter);
  const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : fighter.team;
  const facingAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);

  const candidates = [...state.fighters, ...(state.illusions || [])];
  for (let i = 0; i < candidates.length; i++) {
    const ent = candidates[i];
    if (!ent || ent === fighter || ent.hp <= 0 || ent.isDead) continue;

    // Check team alignment
    const idx = state.fighters.indexOf(ent);
    if (idx !== -1) {
      const enemyTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(idx) : ent.team;
      if (myTeam !== null && enemyTeam === myTeam) continue;
    } else if (ent.owner) {
      const ownerIdx = state.fighters.indexOf(ent.owner);
      const ownerTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : ent.owner.team;
      if (myTeam !== null && ownerTeam === myTeam) continue;
    } else if (ent.team !== undefined && myTeam !== null && ent.team === myTeam) {
      continue;
    }

    const dx = ent.x - fighter.x;
    const dy = ent.y - fighter.y;
    const dist = Math.hypot(dx, dy);

    if (fighter.domainActive || reachOffset >= 9999) {
      // Inside Domain Expansion (Sure-Hit Domain Effect): Hits valid enemies at ANY distance & angle!
      targets.push({ entity: ent, dist, angle: Math.atan2(dy, dx) });
      continue;
    }

    const maxHitDist = fighter.r + ent.r + reachOffset;

    if (dist <= maxHitDist) {
      const angleToTarget = Math.atan2(dy, dx);
      let diff = angleToTarget - facingAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) <= coneAngle / 2) {
        targets.push({ entity: ent, dist, angle: angleToTarget });
      }
    }
  }

  return targets;
}

/**
 * Executes Idle Transfiguration (Melee Morph) Basic Attack.
 * Alternates between Giant Blade and Spiked Mace morphs.
 */
export function executeIdleTransfigurationStrike(fighter, targetHint = null) {
  const cfg = CONFIG.mahito || {};
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  let animDur = cfg.punchSpeed || 50;
  let cd = cfg.basicPunchCooldown || 70;

  if (fighter.domainActive) {
    const rawMult = cfg.domainExpansion?.basicAttackCooldownMultiplier ?? 1.00;
    // Support both speed multiplier (e.g. 1.50 = 1.5x faster) and duration fraction (e.g. 0.50 = 2x faster)
    const cdMult = (rawMult > 1.0) ? (1.0 / rawMult) : rawMult;
    cd = Math.max(2, Math.round(cd * cdMult));
    animDur = Math.max(3, Math.round(animDur * cdMult));
  }

  fighter.punchMaxTime = animDur;
  fighter.punchAnimTimer = animDur;
  fighter.isRightPunch = !fighter.isRightPunch;
  fighter.morphAttackCount = (fighter.morphAttackCount || 0) + 1;
  fighter.morphType = 'claw';
  fighter.cooldownTimer = cd;

  let reach = cfg.punchRange || 75;
  if (fighter.domainActive) {
    const isAnyDist = cfg.domainExpansion?.anyDistanceBasicAttack ?? true;
    if (isAnyDist) {
      reach = 99999;
    } else {
      const domainReachMult = cfg.domainExpansion?.punchRangeMultiplier ?? 2.00;
      reach *= domainReachMult;
    }
  }
  const arcAngle = cfg.arcAngle || (135 * Math.PI / 180);
  const facingAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);

  let baseDamage = cfg.damage || 16;
  if (isTransformed) {
    const damageMult = cfg.transformation?.damageMultiplier ?? 1.60;
    baseDamage *= damageMult;
  }

  // Gather all valid enemy targets in 135° frontal cone (Rule #6, #7, #8)
  const validHits = getMahitoFrontRadiusTargets(fighter, reach, arcAngle);
  let hitAny = validHits.length > 0;

  for (let i = 0; i < validHits.length; i++) {
    const { entity: ent, angle: targetAngle } = validHits[i];



    // 1. Apply Base Damage
    applyDamageToTarget(ent, baseDamage, fighter, { isMelee: true, isBasicAttack: true });

    // 2. Physical Knockback Impulse
    const baseKb = cfg.knockbackForce || 8;
    const kbForce = isTransformed ? baseKb * (cfg.transformation?.knockbackMultiplier ?? 1.75) : baseKb;
    const kx = Math.cos(targetAngle) * kbForce;
    const ky = Math.sin(targetAngle) * kbForce;
    ent.vx = (ent.vx || 0) + kx;
    ent.vy = (ent.vy || 0) + ky;

    // 3. Apply Hit-Stun to Target ONLY (Rule #5)
    const baseStun = cfg.hitStunDuration || 8;
    const hitStunFrames = isTransformed ? Math.round(baseStun * (cfg.transformation?.hitStunMultiplier ?? 1.5)) : baseStun;
    if (typeof ent.applyHitStun === 'function') {
      ent.applyHitStun(hitStunFrames);
    }

    // 4. Blood & Claw Scratch Impact Visuals
    const impactX = ent.x;
    const impactY = ent.y;
    if (typeof spawnBloodEffect === 'function') {
      spawnBloodEffect(ent, Math.max(1, Math.round(baseDamage * 0.2)), targetAngle);
    }
    spawnMahitoClawScratchImpact(impactX, impactY, targetAngle, isTransformed);
    if (fighter.domainActive) {
      // Long-range Domain Sure-Hit Tendril Strike: stretches a transfigured soul arm from Mahito to target
      spawnMahitoDomainSoulTendrilStrike(fighter.x, fighter.y, ent.x, ent.y, isTransformed);
      spawnImpactFlash(ent.x, ent.y, 45, '#D946EF');
    }

    // 5. Soul Disfigurement Mechanic
    applySoulDisfigurementStack(ent, fighter);
  }

  // If inside domain and no enemy was caught in frontal cone, still reach towards targetHint
  if (fighter.domainActive && !hitAny && targetHint && targetHint.hp > 0 && !targetHint.isDead) {
    spawnMahitoDomainSoulTendrilStrike(fighter.x, fighter.y, targetHint.x, targetHint.y, isTransformed);
  }

  // Audio Dispatcher
  if (hitAny) {
    triggerGlobalScreenShake(isTransformed ? 6 : 3);
    if (fighter.morphType === 'mace') {
      audioSystem.playSFX(cfg.sounds?.maceSmash || 'Assets/Sound Effects/Attacks/groundsmash.mp3', 1.8);
    } else {
      audioSystem.playSFX(cfg.sounds?.bladeSwing || 'Assets/Sound Effects/Attacks/swordswing.mp3', 1.8);
    }
  } else {
    audioSystem.playSFX(cfg.sounds?.whiff || 'Assets/Sound Effects/Skills/woosh.mp3', 1.2);
  }
}

/**
 * Triggers violent Soul Rupture explosion right when Mahito's paralyze debuff is about to expire.
 */
export function triggerMahitoParalyzeExplosion(entity) {
  if (!entity) return;

  // Reset soul disfigurement stacks and timer upon rupture explosion
  entity._soulDisfigurementStacks = 0;
  entity._soulDisfigurementTimer = 0;
  entity.isParalyzedByMahito = false;
  entity.paralyzeTimer = 0;

  const cfg = CONFIG.mahito || {};
  const soulCfg = cfg.soulDisfigurement || {};
  const ruptureDmg = soulCfg.ruptureDamage || 24;

  // 1. Visceral Soul Explosion Visuals, Fatal Blood Splash, & Body Shatter
  spawnMahitoSoulExplosion(entity.x, entity.y, 120);
  if (typeof spawnBloodEffect === 'function') {
    spawnBloodEffect(entity, 24, Math.random() * Math.PI * 2);
  }
  if (typeof spawnFatalBloodSplash === 'function' && !entity.isTurret) {
    spawnFatalBloodSplash(entity);
  }
  if (typeof spawnDeathShatter === 'function' && !entity.isTurret) {
    spawnDeathShatter(entity);
  }
  spawnFloatingText(entity.x, entity.y - entity.r - 28, "SOUL RUPTURE!", "#D946EF");

  // 2. Damage application (Attributed to Mahito)
  let mahitoFighter = null;
  if (typeof state !== 'undefined' && state.fighters) {
    mahitoFighter = state.fighters.find(f => f && (f.characterId === 'mahito' || f.type === 'mahito'));
  }

  let finalRuptureDmg = ruptureDmg;
  if (mahitoFighter && mahitoFighter.domainActive) {
    const domainRuptureMult = cfg.domainExpansion?.ruptureDamageMultiplier ?? 1.50;
    finalRuptureDmg *= domainRuptureMult;
  }

  if (entity.hp > 0) {
    applyDamageToTarget(entity, finalRuptureDmg, mahitoFighter, {
      isTrueDamage: true,
      isSoulDamage: true,
      isSkill: true
    });
  }

  // 3. Outward velocity explosion kick
  const randomAngle = Math.random() * Math.PI * 2;
  const ruptureKb = soulCfg.ruptureKnockback || 14;
  const rupVx = Math.cos(randomAngle) * ruptureKb;
  const rupVy = Math.sin(randomAngle) * ruptureKb;
  if (typeof entity.applyKnockback === 'function') {
    entity.applyKnockback(rupVx, rupVy);
  } else {
    entity.knockbackVx = rupVx;
    entity.knockbackVy = rupVy;
    entity.vx = (entity.vx || 0) + rupVx;
    entity.vy = (entity.vy || 0) + rupVy;
  }

  if (typeof entity.applyHitStun === 'function') {
    entity.applyHitStun(10);
  }

  triggerGlobalScreenShake(soulCfg.ruptureScreenShake || 10);
  const expVol = cfg.soundVolumes?.bodyExplode !== undefined ? cfg.soundVolumes.bodyExplode : (cfg.sounds?.bodyExplodeVolume ?? 2.0);
  audioSystem.playSFX(cfg.sounds?.bodyExplode || 'Assets/Sound Effects/Skills/mahito-body-explode.mp3', expVol);

  // If entity is defeated after this explosion, now evaluate round/match end before showing champion screen
  if (entity.hp <= 0 && typeof entity.checkRoundOrMatchEnd === 'function') {
    entity.checkRoundOrMatchEnd(mahitoFighter);
  }
}

export function applySoulDisfigurementStack(ent, fighter) {
  if (ent.characterId === 'mahoraga' || ent.type === 'mahoraga') {
    if (ent.adaptedSoulDisfigurement) {
      // Immune to any debuff - no stacks, no paralyze!
      return;
    }
    ent._soulDisfigurementHitCount = (ent._soulDisfigurementHitCount || 0) + 1;
    if (ent._soulDisfigurementHitCount >= 3) {
      if (typeof ent.adaptToSoulDisfigurement === 'function') {
        ent.adaptToSoulDisfigurement(fighter);
      }
    }
  }

  const cfg = CONFIG.mahito || {};
  const soulCfg = cfg.soulDisfigurement || {};
  const maxStacks = soulCfg.maxStacks || 5;
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  let curStacks;
  if (fighter && fighter.domainActive) {
    const hitsNeeded = Math.max(1, cfg.domainExpansion?.attacksToTriggerDisfigurement ?? 1);
    ent._domainDisfigurementHitCount = (ent._domainDisfigurementHitCount || 0) + 1;
    if (ent._domainDisfigurementHitCount >= hitsNeeded) {
      ent._domainDisfigurementHitCount = 0;
      curStacks = maxStacks;
    } else {
      curStacks = Math.floor((ent._domainDisfigurementHitCount / hitsNeeded) * maxStacks);
    }
  } else {
    curStacks = (ent._soulDisfigurementStacks || 0) + 1;
  }
  ent._soulDisfigurementTimer = soulCfg.duration || 300;

  if (curStacks < maxStacks) {
    ent._soulDisfigurementStacks = curStacks;
    spawnFloatingText(
      ent.x,
      ent.y - (ent.r || 25) - 22,
      `SOUL RESHAPED [${curStacks}/${maxStacks}]`,
      isTransformed ? '#D946EF' : '#C026D3'
    );
  } else {
    // MAX STACKS: VIOLENT SOUL RESHAPING (TRUE DAMAGE BURST)
    // Set to maxStacks so the stitch visual indicator properly fills up (5/5) with critical glowing effects
    ent._soulDisfigurementStacks = maxStacks;
    
    spawnFloatingText(
      ent.x,
      ent.y - (ent.r || 25) - 22,
      `SOUL RESHAPED [${maxStacks}/${maxStacks}]`,
      '#FF007F'
    );

    let burstDmg = soulCfg.burstDamage || 100;
    if (isTransformed) {
      burstDmg *= (cfg.transformation?.damageMultiplier ?? 1.60);
    }
    if (fighter && fighter.domainActive) {
      const domainDisfigurementMult = cfg.domainExpansion?.disfigurementDamageMultiplier ?? 1.50;
      burstDmg *= domainDisfigurementMult;
    }

    const hpRatio = ent.hp / ent.maxHp;
    let isExecute = false;
    const execThreshold = soulCfg.executeThreshold ?? 0.10;
    const execDmgPct = soulCfg.executeDamagePercent ?? 0.20;
    if (hpRatio <= execThreshold) {
      burstDmg = ent.maxHp * execDmgPct;
      isExecute = true;
    }

    // Apply Paralyze Debuff to Target first so death handlers and game loop know target is shivering towards soul explosion
    const paralyzeDur = soulCfg.paralyzeDuration || 45;
    if (!ent.adaptedSoulDisfigurement) {
      ent.isParalyzedByMahito = true;
      ent.paralyzeTimer = Math.max(ent.paralyzeTimer || 0, paralyzeDur);
      if (typeof ent.applyParalyze === 'function') {
        ent.applyParalyze(paralyzeDur);
      }
    }

    applyDamageToTarget(ent, burstDmg, fighter, {
      isTrueDamage: true,
      isSoulDamage: true,
      isSkill: true,
      isSoulDisfigurement: true
    });

    if (isExecute) {
      spawnFloatingText(ent.x, ent.y - (ent.r || 25) - 28, "👤 SOUL EXECUTION!", "#FF0055");
    } else {
      spawnFloatingText(ent.x, ent.y - (ent.r || 25) - 28, "SOUL DISFIGURED!", "#FF2A8D");
    }
    spawnImpactFlash(ent.x, ent.y, 35, '#FF2A8D');
    if (typeof spawnBloodEffect === 'function') {
      spawnBloodEffect(ent, 12, Math.atan2(ent.y - fighter.y, ent.x - fighter.x));
    }

    const angle = Math.atan2(ent.y - fighter.y, ent.x - fighter.x);
    const burstKb = soulCfg.burstKnockback || 20;
    const kbVx = Math.cos(angle) * burstKb;
    const kbVy = Math.sin(angle) * burstKb;
    if (typeof ent.applyKnockback === 'function') {
      ent.applyKnockback(kbVx, kbVy);
    } else {
      ent.knockbackVx = kbVx;
      ent.knockbackVy = kbVy;
      ent.vx = (ent.vx || 0) + kbVx;
      ent.vy = (ent.vy || 0) + kbVy;
    }

    if (typeof ent.applyHitStun === 'function' && !ent.adaptedSoulDisfigurement) {
      ent.applyHitStun(soulCfg.burstHitStun || 300);
    }

    // Calculate if this Soul Disfigurement & impending Rupture is a guaranteed / sure kill on the enemy
    let ruptureDmg = soulCfg.ruptureDamage || 24;
    if (fighter && fighter.domainActive) {
      const domainRuptureMult = cfg.domainExpansion?.ruptureDamageMultiplier ?? 1.50;
      ruptureDmg *= domainRuptureMult;
    }
    const isSureKill = Boolean(
      isExecute ||
      ent.isDead ||
      ent.hp <= 0 ||
      (ent.hp <= ruptureDmg)
    );

    // Play Mahito's farewell voiceline based on configured chance in CONFIG.mahito.soundChances.farewellVoiceline
    const voiceChance = (typeof cfg.soundChances?.farewellVoiceline === 'number')
      ? cfg.soundChances.farewellVoiceline
      : (typeof cfg.sounds?.farewellVoicelineChance === 'number' ? cfg.sounds.farewellVoicelineChance : 0.10);

    if (fighter && !ent.adaptedSoulDisfigurement && Math.random() < voiceChance) {
      const voiceSrc = cfg.sounds?.farewellVoiceline || 'Assets/Sound Effects/Skills/mahito-farewell-voiceline.mp3';
      const voiceVol = (typeof cfg.soundVolumes?.farewellVoiceline === 'number')
        ? cfg.soundVolumes.farewellVoiceline
        : (typeof cfg.sounds?.farewellVoicelineVolume === 'number' ? cfg.sounds.farewellVoicelineVolume : 3.2);
      audioSystem.playFighterVoiceline(
        fighter,
        voiceSrc,
        voiceVol,
        1.0,
        0,
        0,
        { priority: 'protected', isProtected: true, durationMs: 2500 }
      );
    }

    triggerGlobalScreenShake(soulCfg.burstScreenShake || 8);
    if (cfg.sounds?.soulDetonate) {
      const detVol = cfg.soundVolumes?.soulDetonate !== undefined ? cfg.soundVolumes.soulDetonate : (cfg.sounds?.soulDetonateVolume ?? 1.8);
      audioSystem.playSFX(cfg.sounds.soulDetonate, detVol);
    }
  }
}

/**
 * Executes Idle Transfiguration: Subterranean Flesh Surge (Underground Arm Eruption).
 * Initializes the 3-phase staggered animation sequence:
 * 1. Phase 1 (Frames 0–8): Momentum stop & slide to ground.
 * 2. Phase 2 (Frames 8–18): Ground plunge punch animation & plunge fissure.
 * 3. Phase 3 (Frames 18–42): Sequential tendril eruptions in frontal fan array.
 */
/**
 * Executes Idle Transfiguration: Subterranean Flesh Surge (Underground Arm Eruption).
 * Initializes the 3-phase staggered animation sequence with dynamic enemy chasing:
 * 1. Phase 1 (Frames 0–8): Momentum stop & slide to ground.
 * 2. Phase 2 (Frames 8–18): Ground plunge punch animation & plunge fissure.
 * 3. Phase 3 (Frames 18–90+): Sequential tendril eruptions dynamically chasing the enemy 1-by-1.
 */
export function executeSubterraneanFleshSurge(fighter, targetHint = null) {
  const cfg = CONFIG.mahito || {};
  const surgeCfg = cfg.fleshSurge || {};
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  const slideFrames = surgeCfg.slideFrames || 8;
  const plungeFrames = surgeCfg.plungeFrames || 10;
  const staggerDelay = surgeCfg.staggerDelay || 8; // Smooth delay between hump eruptions
  
  // Dynamic hump count based on form
  const tendrilCount = isTransformed ? (surgeCfg.tendrilCountTransformed || 5) : (surgeCfg.tendrilCountBase || 4); 
  const reachMin = surgeCfg.reachMin || 15;
  const reachMax = surgeCfg.reachMax || 420;

  // Single hump growth duration & timing
  const humpGrowthDuration = 14;
  const growthDuration = (tendrilCount - 1) * staggerDelay + humpGrowthDuration;
  const lingerDuration = surgeCfg.lingerDuration || 18;

  const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  fighter._fleshSurgePlungeAngle = baseAngle;
  const plungeEndFrame = slideFrames + plungeFrames;

  // Ground plunge impact point (~55px below body)
  const plungeDistance = (fighter.r || 25) + 30;
  const plungeX = fighter.x;
  const plungeY = fighter.y + plungeDistance;

  // Find initial enemy target to track
  let target = targetHint;
  if (!target && typeof fighter._findClosestEnemy === 'function') {
    target = fighter._findClosestEnemy();
  }

  // Distance Guard: Do NOT trigger subterranean surge if enemy is too close (< minDistance)
  const minSurgeDist = surgeCfg.minDistance || 240;
  if (target && !target.isDead && target.hp > 0) {
    const distToTarget = Math.hypot(target.x - fighter.x, target.y - fighter.y);
    if (distToTarget < minSurgeDist) {
      // Enemy is in close quarters! Stop from triggering and switch to close-quarters melee strike if in reach
      const reach = cfg.punchRange || 75;
      const maxReach = (fighter.r || 25) + (target.r || 25) + reach;
      if (distToTarget <= maxReach && (fighter.cooldownTimer || 0) <= 0) {
        executeIdleTransfigurationStrike(fighter, target);
      }
      return;
    }
  }

  // Initialize with the first dynamic chasing hump (Hump 0)
  const loops = [];
  const loop0 = {
    index: 0,
    startFrame: plungeEndFrame,
    growthDuration: humpGrowthDuration,
    maxHeight: 45,
    entryX: plungeX,
    entryY: plungeY,
    peakX: plungeX + Math.cos(baseAngle) * 40,
    peakY: plungeY + Math.sin(baseAngle) * 40,
    exitX: plungeX + Math.cos(baseAngle) * 80,
    exitY: plungeY + Math.sin(baseAngle) * 80,
    dirAngle: baseAngle,
    hitApplied: false,
    isLocked: false
  };

  updateSingleHumpTrajectory(loop0, 0, plungeX, plungeY, target, 1, baseAngle);
  loops.push(loop0);

  let totalStretchDist = Math.hypot(plungeX - fighter.x, plungeY - fighter.y) + Math.hypot(loop0.exitX - loop0.entryX, loop0.exitY - loop0.entryY) * 1.25;

  // Dynamic distance-based retraction: scales smoothly with how far the arm stretched across the arena
  const retractSpeed = surgeCfg.retractSpeed || 14.0; // ~14px per frame retraction rate
  const retractDuration = Math.max(12, Math.min(70, Math.round(totalStretchDist / retractSpeed) + 6));
  const animDuration = slideFrames + plungeFrames + growthDuration + lingerDuration + retractDuration + 4;

  const sharedCd = cfg.sharedSkillCooldown || surgeCfg.cooldown || 300;
  fighter.fleshSurgeAnimTimer = animDuration;
  fighter.sharedSkillCooldown = sharedCd;
  fighter.fleshSurgeCooldown = sharedCd;
  fighter.maceCannonCooldown = sharedCd;
  fighter.twinScissorCooldown = sharedCd;

  // Store active surge state on fighter
  fighter._fleshSurgeData = {
    startX: plungeX,
    startY: plungeY,
    baseAngle,
    target,
    loops,
    hasHitEnemy: false,
    totalStretchDistance: totalStretchDist,
    elapsedFrames: 0,
    maxTimer: animDuration,
    slideEndFrame: slideFrames,
    plungeEndFrame: plungeEndFrame,
    staggerDelay: staggerDelay,
    growthDuration,
    lingerDuration,
    retractDuration,
    hasPlunged: false,
    reachMax,
    tendrilCount
  };

  // Hide front hand circle during the stretch arm animation
  fighter.hideFrontHand = true;

  // Dampen momentum for initial slide
  fighter.vx *= 0.25;
  fighter.vy *= 0.25;

  // Voiceline for Skill 2 (occasional trigger)
  const skillVoiceChance = cfg.soundChances?.skillVoiceline !== undefined ? cfg.soundChances.skillVoiceline : (cfg.sounds?.skillVoicelineChance ?? 0.20);
  if (Math.random() < skillVoiceChance) {
    const skillVoiceVol = cfg.soundVolumes?.skillVoiceline !== undefined ? cfg.soundVolumes.skillVoiceline : (cfg.sounds?.skillVoicelineVolume ?? 2.2);
    audioSystem.playFighterVoiceline(fighter, cfg.sounds?.skillVoiceline || 'Assets/Sound Effects/Skills/mahito-skill2-voiceline.mp3', skillVoiceVol);
  }
}

/**
 * Helper to compute the dynamic trajectory and ground coordinates for a hump chasing the target.
 */
function updateSingleHumpTrajectory(loop, index, prevExitX, prevExitY, target, tendrilCount, fallbackAngle) {
  let targetX = prevExitX + Math.cos(fallbackAngle) * 80;
  let targetY = prevExitY + Math.sin(fallbackAngle) * 80;

  if (target && !target.isDead && target.hp > 0) {
    targetX = target.x;
    targetY = target.y;
  }

  const clamped = clampOutsideGojoInfinity(targetX, targetY, target, 12);
  targetX = clamped.x;
  targetY = clamped.y;

  const dx = targetX - prevExitX;
  const dy = targetY - prevExitY;
  const distToTarget = Math.hypot(dx, dy) || 1;
  const dirAngle = Math.atan2(dy, dx);

  // Step length: bounds aggressively toward target, or directly onto them if within strike range
  let stepDist = Math.max(60, Math.min(100, distToTarget * 0.65));
  if (distToTarget <= 90) {
    stepDist = distToTarget; // Lands right on target!
  }

  // Serpentine zigzag lateral offset
  const latOffset = (index % 2 === 0 ? 1 : -1) * (distToTarget <= 90 ? 0 : 18);
  const perpX = -Math.sin(dirAngle);
  const perpY =  Math.cos(dirAngle);

  loop.entryX = prevExitX;
  loop.entryY = prevExitY;
  loop.peakX = prevExitX + Math.cos(dirAngle) * (stepDist * 0.5) + perpX * latOffset;
  loop.peakY = prevExitY + Math.sin(dirAngle) * (stepDist * 0.5) + perpY * latOffset;
  loop.exitX = prevExitX + Math.cos(dirAngle) * stepDist;
  loop.exitY = prevExitY + Math.sin(dirAngle) * stepDist;
  loop.dirAngle = dirAngle;
  loop.stepDist = stepDist;
}

/**
 * Updates the 3-phase staggered Subterranean Flesh Surge sequence each frame.
 * Dynamically chases the enemy target 1-by-1 as each hump emerges.
 */
export function updateMahitoFleshSurge(fighter) {
  const data = fighter._fleshSurgeData;
  if (!data || fighter.fleshSurgeAnimTimer <= 0) return;

  data.elapsedFrames++;
  const cfg = CONFIG.mahito || {};
  const surgeCfg = cfg.fleshSurge || {};
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  const explosionR = surgeCfg.explosionRadius || 48;
  let baseDamage = surgeCfg.damage || 24;
  if (isTransformed) {
    const damageMult = cfg.transformation?.damageMultiplier ?? 1.60;
    baseDamage *= damageMult;
  }

  // Phase 1: Slide & Halt (Frames 0 to slideEndFrame)
  if (data.elapsedFrames <= data.slideEndFrame) {
    fighter.vx *= 0.3;
    fighter.vy *= 0.3;
  }

  // Phase 2: Ground Plunge Punch (Frames slideEndFrame to plungeEndFrame)
  if (data.elapsedFrames > data.slideEndFrame && data.elapsedFrames <= data.plungeEndFrame) {
    fighter.vx = 0;
    fighter.vy = 0;

    if (!data.hasPlunged && data.elapsedFrames >= data.slideEndFrame + 2) {
      data.hasPlunged = true;
      fighter.punchAnimTimer = 16; // Trigger ground plunge fist animation

      // Plunge ground impact SFX & particles
      audioSystem.playSFX(cfg.sounds?.maceSmash || 'Assets/Sound Effects/Attacks/groundsmash.mp3', 2.0);
      audioSystem.playSFX(cfg.sounds?.whiff || 'Assets/Sound Effects/Skills/woosh.mp3', 1.8);
      spawnMeleeClashShockwave(fighter.x, fighter.y, 40, '#D946EF');
      spawnSparks(fighter.x, fighter.y, '#D946EF', 15);
      triggerGlobalScreenShake(surgeCfg.screenShake || 6);
    }
  }

  // Phase 3: Sequential Staggered Tendril Eruptions with Dynamic Homing (Frames plungeEndFrame to maxTimer)
  if (data.elapsedFrames > data.plungeEndFrame) {
    fighter.vx = 0;
    fighter.vy = 0;

    // Target Re-acquisition (if target is dead or missing)
    if (!data.target || data.target.isDead || data.target.hp <= 0) {
      if (typeof fighter._findClosestEnemy === 'function') {
        data.target = fighter._findClosestEnemy();
      }
    }

    const candidates = [...(state.fighters || []), ...(state.illusions || [])];
    const myIndex = state.fighters.indexOf(fighter);
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : fighter.team;

    // 1. Dynamically update trajectory for upcoming un-erupted humps towards the target
    if (!data.hasHitEnemy) {
      let chainPrevX = data.startX;
      let chainPrevY = data.startY;

      for (let i = 0; i < data.loops.length; i++) {
        const lp = data.loops[i];

        if (!lp.isLocked) {
          if (data.elapsedFrames < lp.startFrame) {
            // Still subterranean & preparing to emerge: dynamically steer towards enemy
            updateSingleHumpTrajectory(lp, i, chainPrevX, chainPrevY, data.target, data.tendrilCount, data.baseAngle);
          } else {
            // Active: lock ground entry/exit coordinates permanently into the earth
            lp.isLocked = true;
          }
        }

        chainPrevX = lp.exitX;
        chainPrevY = lp.exitY;
      }
    }

    // 2. Evaluate Eruption Hit & Damage for each Hump as it emerges
    for (let i = 0; i < data.loops.length; i++) {
      const lp = data.loops[i];

      if (data.elapsedFrames >= lp.startFrame + 4 && !lp.hitApplied) {
        lp.hitApplied = true;

        // Visceral Eruption SFX & Cursed Energy Shockwaves at the Peak location
        spawnImpactFlash(lp.peakX, lp.peakY, 48, 'rgba(217, 70, 239, 0.90)');
        spawnMeleeClashShockwave(lp.peakX, lp.peakY, 42, '#D946EF');
        spawnMeleeClashShockwave(lp.peakX, lp.peakY, 20, '#FAF5FF');
        spawnSparks(lp.peakX, lp.peakY, '#D946EF', 16);
        spawnSparks(lp.peakX, lp.peakY, '#F5D0FE', 10);
        triggerGlobalScreenShake(surgeCfg.screenShake || 5);
        audioSystem.playSFX(cfg.sounds?.subterraneanHumpSound || 'Assets/Sound Effects/Attacks/heavypunch1.mp3', cfg.sounds?.subterraneanSurgeVolume ?? 1.8);

        // AOE Hit Evaluation around this hump's eruption center
        let hitAnyEnemy = false;

        for (let c = 0; c < candidates.length; c++) {
          const ent = candidates[c];
          if (!ent || ent === fighter || ent.hp <= 0 || ent.isDead) continue;

          // Check team alignment
          const idx = state.fighters.indexOf(ent);
          if (idx !== -1) {
            const enemyTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(idx) : ent.team;
            if (myTeam !== null && enemyTeam === myTeam) continue;
          } else if (ent.owner) {
            const ownerIdx = state.fighters.indexOf(ent.owner);
            const ownerTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : ent.owner.team;
            if (myTeam !== null && ownerTeam === myTeam) continue;
          } else if (ent.team !== undefined && myTeam !== null && ent.team === myTeam) {
            continue;
          }

          const isGojoInfinity = (ent.characterId === 'gojo' || ent.type === 'gojo') && 
            !ent.isMeleeMode && 
            ((ent.infinityCooldown || 0) <= 0 || ent.infinityActive);

          const dist = Math.hypot(ent.x - lp.peakX, ent.y - lp.peakY);
          if (dist <= explosionR + (ent.r || 25)) {
            if (isGojoInfinity) {
              if (!lp.isFrozenByInfinity) {
                lp.isFrozenByInfinity = true;
                data.isFrozenByInfinity = true;
                if (typeof ent.triggerInfinityBlock === 'function') {
                  ent.triggerInfinityBlock(lp.peakX, lp.peakY);
                }
                spawnImpactFlash(lp.peakX, lp.peakY, 45, 'rgba(0, 229, 255, 0.95)');
                spawnSparks(lp.peakX, lp.peakY, '#00F3FF', 14);
                audioSystem.playSFX('effect_infinity_collide', 1.0);
              }
              // Stop chasing and lock humps: freeze at barrier then retract after brief pause
              if (!data.hasHitEnemy) {
                data.hasHitEnemy = true;
                data.loops = data.loops.slice(0, i + 1);
                data.retractStartFrame = data.elapsedFrames + 28; // ~0.5s freeze pause at barrier
              }
              continue;
            }
            hitAnyEnemy = true;

            // Apply True/Soul Damage & Hit Effects
            applyDamageToTarget(ent, baseDamage, fighter, {
              isTrueDamage: false,
              isSoulDamage: true,
              isSkill: true
            });

            // Physical upward/outward knockback
            const hitAngle = Math.atan2(ent.y - lp.peakY, ent.x - lp.peakX);
            const kb = surgeCfg.knockbackForce || 8;
            ent.vx = (ent.vx || 0) + Math.cos(hitAngle) * kb;
            ent.vy = (ent.vy || 0) + Math.sin(hitAngle) * kb;

            if (typeof ent.applyHitStun === 'function') {
              ent.applyHitStun(surgeCfg.hitStun || 12);
            }

            // Apply Soul Disfigurement stack (+1 stack)
            applySoulDisfigurementStack(ent, fighter);
            spawnBloodEffect(ent, 8, hitAngle);
          }
        }

        // 3. TARGET HIT CONNECTED: Stop chasing further; this hump is the final impact tip!
        if (hitAnyEnemy && !data.hasHitEnemy) {
          data.hasHitEnemy = true;
          // Trim any un-erupted future loops so the arm ends cleanly at the target
          data.loops = data.loops.slice(0, i + 1);
          data.retractStartFrame = data.elapsedFrames + data.lingerDuration;
          break;
        }
      }
    }

    // 4. UNLIMITED CHASE: If we haven't hit the enemy yet, dynamically spawn the NEXT chasing hump!
    if (!data.hasHitEnemy) {
      const lastLoop = data.loops[data.loops.length - 1];

      // If the last queued loop is already active/erupting and hasn't hit, spawn the next hunting hump
      if (lastLoop && data.elapsedFrames >= lastLoop.startFrame && data.loops.length < (data.tendrilCount || 4)) {
        const nextIndex = data.loops.length;
        const nextStartFrame = lastLoop.startFrame + data.staggerDelay;
        const nextMaxHeight = Math.min(75, 42 + nextIndex * 6);

        const newLoop = {
          index: nextIndex,
          startFrame: nextStartFrame,
          growthDuration: 14,
          maxHeight: nextMaxHeight,
          entryX: lastLoop.exitX,
          entryY: lastLoop.exitY,
          peakX: lastLoop.exitX,
          peakY: lastLoop.exitY,
          exitX: lastLoop.exitX,
          exitY: lastLoop.exitY,
          dirAngle: lastLoop.dirAngle,
          hitApplied: false,
          isLocked: false
        };

        updateSingleHumpTrajectory(newLoop, nextIndex, lastLoop.exitX, lastLoop.exitY, data.target, nextIndex + 1, data.baseAngle);
        data.loops.push(newLoop);
      } else if (lastLoop && data.elapsedFrames >= lastLoop.startFrame + (lastLoop.growthDuration || 14)) {
        // We have reached the maximum tendril count and finished the final hump's growth: begin retraction!
        if (data.retractStartFrame === undefined) {
          data.retractStartFrame = data.elapsedFrames;
          data.hasHitEnemy = true;
        }
      }
    }

    // 5. Distance-Based Retraction Synchronization:
    // Compute total stretch distance along the active chain
    let currentTotalDist = Math.hypot(data.startX - fighter.x, data.startY - fighter.y);
    for (let i = 0; i < data.loops.length; i++) {
      const lp = data.loops[i];
      const len = Math.hypot(lp.exitX - lp.entryX, lp.exitY - lp.entryY) * 1.25;
      currentTotalDist += len;
    }
    data.totalStretchDistance = currentTotalDist;

    const retractSpeed = surgeCfg.retractSpeed || 14.0; // ~14px per frame retraction rate
    data.retractDuration = Math.max(12, Math.min(70, Math.round(currentTotalDist / retractSpeed) + 6));

    if (data.retractStartFrame === undefined) {
      // While still hunting, keep anim timer active so Mahito stays anchored in ground plunge stance
      fighter.fleshSurgeAnimTimer = 30;
    } else {
      // Hit connected: countdown to finish retraction
      data.maxTimer = data.retractStartFrame + data.retractDuration + 4;
      const totalRemainingFrames = data.maxTimer - data.elapsedFrames;
      if (totalRemainingFrames > 0) {
        fighter.fleshSurgeAnimTimer = totalRemainingFrames;
      }
    }
  }
}

/**
 * Decays active Soul Disfigurement timers on all fighters and illusions.
 * Also checks and triggers Soul Rupture explosion right when paralysis is about to expire.
 */
export function updateSoulDisfigurementDecay() {
  if (typeof state === 'undefined' || !state) return;
  const entities = [...(state.fighters || []), ...(state.illusions || [])];
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    if (!ent) continue;

    // Decay soul disfigurement timer
    if (ent._soulDisfigurementTimer > 0) {
      ent._soulDisfigurementTimer--;
      if (ent._soulDisfigurementTimer <= 0) {
        ent._soulDisfigurementStacks = 0;
      }
    }

    // Check paralyze explosion right when paralyze is about to expire (at 1 frame remaining)
    if (ent.isParalyzedByMahito && ent.paralyzeTimer === 1) {
      triggerMahitoParalyzeExplosion(ent);
    }
  }
}

/**
 * Passive Skill: Phantom Soul Slip (Phase-Through Claw Dash).
 * Mahito phases high-speed directly through the opponent, crossing through them and slicing with his claws.
 */
export function executeMahitoSoulPhaseSlip(fighter, target) {
  if (!fighter || !target || fighter.hp <= 0 || target.hp <= 0) return;
  if ((fighter.paralyzeTimer || 0) > 0 || fighter.isParalyzed || fighter.fleshSurgeAnimTimer > 0) return;

  const cfg = CONFIG.mahito || {};
  const dashCfg = cfg.soulPhaseSlip || {};
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  const dx = target.x - fighter.x;
  const dy = target.y - fighter.y;
  const dist = Math.hypot(dx, dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;
  const angle = Math.atan2(dy, dx);

  const dashDuration = dashCfg.dashDuration || 12;
  const totalPassDist = dist + target.r + fighter.r + (dashCfg.passThroughDistance || 100);
  const stepSpeed = totalPassDist / dashDuration;

  fighter.soulPhaseDashTimer = dashDuration;
  fighter.soulPhaseDashMax = dashDuration;
  fighter.soulPhaseDashCooldown = dashCfg.cooldown || 100;
  fighter.soulPhaseDashTarget = target;
  fighter.soulPhaseDashHit = false;
  fighter.soulPhaseDashVector = { x: dirX * stepSpeed, y: dirY * stepSpeed };
  fighter.gunAngle = angle;
  fighter.angle = angle;

  // Trigger claw attack animation during the pass
  fighter.punchAnimTimer = Math.max(16, dashDuration + 4);
  fighter.morphType = 'claw';
  fighter.isRightPunch = !fighter.isRightPunch;

  // Audio & Burst FX
  audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.85);
  spawnImpactFlash(fighter.x, fighter.y, 40, isTransformed ? '#D946EF' : '#C026D3');

  // Voiceline on Passive Dash (played occasionally, e.g. 5% chance)
  const dashVoiceChance = cfg.soundChances?.dashVoiceline !== undefined ? cfg.soundChances.dashVoiceline : (cfg.sounds?.dashVoicelineChance ?? 0.05);
  if (Math.random() < dashVoiceChance) {
    const dashVoiceVol = cfg.soundVolumes?.dashVoiceline !== undefined ? cfg.soundVolumes.dashVoiceline : (cfg.sounds?.dashVoicelineVolume ?? 2.0);
    audioSystem.playFighterVoiceline(fighter, cfg.sounds?.dashVoiceline || 'Assets/Sound Effects/Skills/mahito-dash-voiceline.mp3', dashVoiceVol);
  }
}

/**
 * Updates active Phantom Soul Slip motion, physics, hit check, and afterimage trailing.
 */
export function updateMahitoSoulPhaseSlip(fighter) {
  if (!fighter) return;

  // Age existing shadow afterimages
  if (fighter._dashAfterimages && fighter._dashAfterimages.length > 0) {
    for (let i = fighter._dashAfterimages.length - 1; i >= 0; i--) {
      fighter._dashAfterimages[i].alpha -= 0.08;
      if (fighter._dashAfterimages[i].alpha <= 0) {
        fighter._dashAfterimages.splice(i, 1);
      }
    }
  }

  if ((fighter.soulPhaseDashTimer || 0) <= 0) return;

  fighter.soulPhaseDashTimer--;
  const vec = fighter.soulPhaseDashVector;
  if (!vec) return;

  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);
  const cfg = CONFIG.mahito || {};
  const dashCfg = cfg.soulPhaseSlip || {};

  // Store afterimage
  if (!fighter._dashAfterimages) fighter._dashAfterimages = [];
  fighter._dashAfterimages.push({
    x: fighter.x,
    y: fighter.y,
    alpha: 0.85,
    angle: fighter.gunAngle || 0,
    isTransformed
  });

  // Step movement
  fighter.x += vec.x;
  fighter.y += vec.y;

  // Arena bound clamp
  if (typeof state !== 'undefined' && state.arena) {
    const arena = state.arena;
    fighter.x = Math.max(arena.x + fighter.r, Math.min(arena.x + arena.width - fighter.r, fighter.x));
    fighter.y = Math.max(arena.y + fighter.r, Math.min(arena.y + arena.height - fighter.r, fighter.y));
  }

  const target = fighter.soulPhaseDashTarget;
  if (target && !fighter.soulPhaseDashHit && target.hp > 0 && !target.isDead) {
    const dTarget = Math.hypot(target.x - fighter.x, target.y - fighter.y);
    const hitReach = fighter.r + target.r + 35;

    if (dTarget <= hitReach) {
      fighter.soulPhaseDashHit = true;

      // 1. Slash Damage
      let slashDmg = dashCfg.slashDamage || 22;
      if (isTransformed) {
        slashDmg *= (cfg.transformation?.damageMultiplier ?? 1.60);
      }
      applyDamageToTarget(target, slashDmg, fighter, { isMelee: true, isBasicAttack: true });

      // 2. Hit-Stun & Knockback
      const stunDur = dashCfg.hitStunDuration || 14;
      if (typeof target.applyHitStun === 'function') {
        target.applyHitStun(stunDur);
      }

      const kb = dashCfg.knockbackForce || 6;
      const passAngle = Math.atan2(vec.y, vec.x);
      target.vx = (target.vx || 0) + Math.cos(passAngle) * kb;
      target.vy = (target.vy || 0) + Math.sin(passAngle) * kb;

      // 3. Blood & 5-Blade Razor Claw Slash Laceration Impact Visuals
      if (typeof spawnBloodEffect === 'function') {
        spawnBloodEffect(target, Math.max(2, Math.round(slashDmg * 0.25)), passAngle);
      }
      spawnMahitoClawScratchImpact(target.x, target.y, passAngle, isTransformed);

      // 4. Soul Disfigurement Stacking
      applySoulDisfigurementStack(target, fighter);

      // Audio & Impact Shake
      audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.95);
      triggerGlobalScreenShake(4, 6);
    }
  }

  // Dash completed: Snap facing angle back to target from behind! (Rule #3 compliant)
  if (fighter.soulPhaseDashTimer <= 0) {
    if (target && target.hp > 0 && !target.isDead) {
      fighter.aim(target);
    }
  }
}

/**
 * Third Skill: Idle Transfiguration — Mutated Mace Cannon (Stretch Arm Spiked Ball Shrapnel Explosion).
 * Launches direct stretching flesh arm straight at target. As it gets close, the fist swells into a spiked mace ball
 * and detonates into a violent spike shrapnel explosion!
 */
export function executeMahitoMaceCannon(fighter, targetHint = null) {
  if (!fighter || fighter.hp <= 0 || fighter.isDead) return;
  if ((fighter.paralyzeTimer || 0) > 0 || fighter.isParalyzed || fighter.fleshSurgeAnimTimer > 0 || (fighter.soulPhaseDashTimer || 0) > 0) return;

  const cfg = CONFIG.mahito || {};
  const cannonCfg = cfg.maceCannon || {};
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  let target = targetHint;
  if (!target && typeof fighter._findClosestEnemy === 'function') {
    target = fighter._findClosestEnemy();
  }
  if (!target || target.hp <= 0 || target.isDead) return;

  const minMaceDist = cannonCfg.minDistance || 240;
  const distToTarget = Math.hypot(target.x - fighter.x, target.y - fighter.y);
  if (!fighter.domainActive && distToTarget < minMaceDist) {
    // Enemy is in close quarters! Stop from triggering and switch to close-quarters melee strike if in reach
    const reach = cfg.punchRange || 75;
    const maxReach = (fighter.r || 25) + (target.r || 25) + reach;
    if (distToTarget <= maxReach && (fighter.cooldownTimer || 0) <= 0) {
      executeIdleTransfigurationStrike(fighter, target);
    }
    return;
  }

  const dx = target.x - fighter.x;
  const dy = target.y - fighter.y;
  const dist = distToTarget || 1;
  const angle = Math.atan2(dy, dx);

  const reachMax = cannonCfg.reachMax || 380;
  const targetDist = Math.min(dist, reachMax);

  // Clamp target coordinates inside Gojo's Infinity & the arena boundaries
  const maceR = isTransformed ? (cannonCfg.maceRadiusTransformed || 29) : (cannonCfg.maceRadiusBase || 22);
  const pad = maceR + 8; // Small extra pad for spikes
  const rawTargetX = fighter.x + Math.cos(angle) * targetDist;
  const rawTargetY = fighter.y + Math.sin(angle) * targetDist;
  const clampedInf = clampOutsideGojoInfinity(rawTargetX, rawTargetY, target, 15);
  const clampedTarget = clampToArena(clampedInf.x, clampedInf.y, pad);

  // Re-adjust target distance and angle to target clamped target coordinates
  const dxClamped = clampedTarget.x - fighter.x;
  const dyClamped = clampedTarget.y - fighter.y;
  const finalTargetDist = Math.hypot(dxClamped, dyClamped) || 1;
  const finalAngle = Math.atan2(dyClamped, dxClamped);

  fighter.gunAngle = finalAngle;
  fighter.angle = finalAngle;

  const sharedCd = cfg.sharedSkillCooldown || cannonCfg.cooldown || 300;
  fighter.sharedSkillCooldown = sharedCd;
  fighter.fleshSurgeCooldown = sharedCd;
  fighter.maceCannonCooldown = sharedCd;
  fighter.twinScissorCooldown = sharedCd;
  fighter.maceCannonAnimTimer = 180; // Ample buffer; updateMahitoMaceCannon clears timer on retract finish
  fighter.hideFrontHand = true;

  // Voiceline for Skill 3 (occasional trigger)
  const skillVoiceChance = cfg.soundChances?.skillVoiceline !== undefined ? cfg.soundChances.skillVoiceline : (cfg.sounds?.skillVoicelineChance ?? 0.20);
  if (Math.random() < skillVoiceChance) {
    const skillVoiceVol = cfg.soundVolumes?.skillVoiceline !== undefined ? cfg.soundVolumes.skillVoiceline : (cfg.sounds?.skillVoicelineVolume ?? 2.2);
    audioSystem.playFighterVoiceline(fighter, cfg.sounds?.skillVoiceline || 'Assets/Sound Effects/Skills/mahito-skill2-voiceline.mp3', skillVoiceVol);
  }

  // Generate organic, non-uniform spikes around the forward/side perimeter (excluding rear neck connection)
  const spikeCount = 8;
  const angleSpan = Math.PI * 1.45; // ~260° forward/side perimeter arc
  const startAng = -angleSpan / 2;
  const spkStep = angleSpan / (spikeCount - 1);
  const spikes = [];

  for (let i = 0; i < spikeCount; i++) {
    // Non-uniform organic angle with natural random jitter
    const angJitter = (Math.random() - 0.5) * (spkStep * 0.45);
    const spkAng = startAng + (i * spkStep) + angJitter;
    const lenMult = 0.75 + Math.random() * 0.55; // 0.75x to 1.30x varied length
    const widthMult = 0.80 + Math.random() * 0.40;
    const curveOffset = (Math.random() - 0.5) * 0.25; // Subtle organic curve tilt
    const popDelay = Math.random() * 0.04; // Micro stagger on eruption

    spikes.push({
      angle: spkAng,
      lenMult,
      widthMult,
      curveOffset,
      popDelay,
      isSurface: false
    });
  }

  // 3 Organic surface spikes on the front face of the ball for 3D depth
  const surfaceAngles = [-0.6, 0.2, 0.8];
  for (let s = 0; s < surfaceAngles.length; s++) {
    const sAng = surfaceAngles[s] + (Math.random() - 0.5) * 0.3;
    const sDist = 0.30 + Math.random() * 0.35;
    spikes.push({
      angle: sAng,
      surfaceDist: sDist,
      lenMult: 0.70 + Math.random() * 0.40,
      widthMult: 0.85 + Math.random() * 0.30,
      curveOffset: (Math.random() - 0.5) * 0.20,
      popDelay: 0.01 + Math.random() * 0.03,
      isSurface: true
    });
  }

  const r = fighter.r || 25;
  const facingAngle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const facingLeft = Math.abs(facingAngle) > Math.PI / 2;
  const localBackX = r * 0.70;
  const localBackY = facingLeft ? (r * 0.18) : (-r * 0.18);
  const cosA = Math.cos(facingAngle);
  const sinA = Math.sin(facingAngle);
  const backHandX = fighter.x + (localBackX * cosA - localBackY * sinA);
  const backHandY = fighter.y + (localBackX * sinA + localBackY * cosA);

  fighter.hideBackHand = true;
  fighter.hideFrontHand = false;

  const numArmNodes = 16;
  const armNodes = [];
  for (let i = 0; i < numArmNodes; i++) {
    armNodes.push({
      x: backHandX,
      y: backHandY,
      oldX: backHandX,
      oldY: backHandY
    });
  }

  fighter._maceCannonData = {
    startX: backHandX,
    startY: backHandY,
    currentTipX: backHandX,
    currentTipY: backHandY,
    target,
    dirX: Math.cos(finalAngle),
    dirY: Math.sin(finalAngle),
    angle: finalAngle,
    targetDist: finalTargetDist,
    currentDist: 0,
    maceProgress: 0.0, // Swells from 0 (fist) to 1.0 (giant spiked mace)
    phase: 'launch',   // 'launch' -> 'morph' -> 'explode' -> 'retract'
    elapsedFrames: 0,
    morphStartFrame: 0,
    morphDuration: cannonCfg.morphDuration || 45,
    hasDetonated: false,
    hasSpikesPopped: false,
    spikes,
    shrapnelSpikes: [],
    retractRatio: 0.0,
    retractDuration: 12,
    armNodes
  };

  // Launch audio & impact spark
  audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.9);
  spawnImpactFlash(backHandX, backHandY, 35, isTransformed ? '#D946EF' : '#C026D3');
}

/**
 * Updates active Mutated Mace Cannon arm extension, hover suspension, spiked ball transition, shrapnel explosion, and pullback.
 */
export function updateMahitoMaceCannon(fighter) {
  const data = fighter._maceCannonData;
  if (!data || fighter.maceCannonAnimTimer <= 0) return;

  data.elapsedFrames++;
  const cfg = CONFIG.mahito || {};
  const cannonCfg = cfg.maceCannon || {};
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  const target = data.target;

  // ── Dynamic Back Hand Socket Coordinates in World Space ──
  const r = fighter.r || 25;
  const facingAngle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const facingLeft = Math.abs(facingAngle) > Math.PI / 2;
  const localBackX = r * 0.70;
  const localBackY = facingLeft ? (r * 0.18) : (-r * 0.18);
  const cosA = Math.cos(facingAngle);
  const sinA = Math.sin(facingAngle);
  const backHandX = fighter.x + (localBackX * cosA - localBackY * sinA);
  const backHandY = fighter.y + (localBackX * sinA + localBackY * cosA);

  // ── Natural Loose Thread / Rope Verlet Physics Simulation ──
  const curTipX = data.currentTipX;
  const curTipY = data.currentTipY;
  const numNodes = 16;

  if (!data.armNodes || data.armNodes.length !== numNodes) {
    data.armNodes = [];
    for (let i = 0; i < numNodes; i++) {
      const p = i / (numNodes - 1);
      const px = backHandX + (curTipX - backHandX) * p;
      const py = backHandY + (curTipY - backHandY) * p;
      data.armNodes.push({
        x: px,
        y: py,
        oldX: px,
        oldY: py
      });
    }
  }

  const nodes = data.armNodes;

  // 1. Verlet Integration with air damping: nodes retain their world positions and trail naturally behind movement
  for (let i = 1; i < numNodes - 1; i++) {
    const node = nodes[i];
    const vx = (node.x - node.oldX) * 0.72; // Air friction / thread damping
    const vy = (node.y - node.oldY) * 0.72;
    node.oldX = node.x;
    node.oldY = node.y;
    node.x += vx;
    node.y += vy;
  }

  // 2. Pin shoulder/back-hand endpoint (Node 0) to Mahito's back hand and ball endpoint (Node N-1) to suspended tip
  nodes[0].x = backHandX;
  nodes[0].y = backHandY;
  nodes[0].oldX = backHandX - (fighter.vx || 0) * 0.5;
  nodes[0].oldY = backHandY - (fighter.vy || 0) * 0.5;

  nodes[numNodes - 1].x = curTipX;
  nodes[numNodes - 1].y = curTipY;
  nodes[numNodes - 1].oldX = curTipX;
  nodes[numNodes - 1].oldY = curTipY;

  // 3. Relax distance constraints between thread segments (Loose trailing thread kinematics)
  const totalLinearDist = Math.hypot(curTipX - backHandX, curTipY - backHandY) || 1;
  const targetSegDist = totalLinearDist / (numNodes - 1);

  const iterations = 5;
  for (let iter = 0; iter < iterations; iter++) {
    // Re-pin ends every iteration
    nodes[0].x = backHandX;
    nodes[0].y = backHandY;
    nodes[numNodes - 1].x = curTipX;
    nodes[numNodes - 1].y = curTipY;

    for (let i = 0; i < numNodes - 1; i++) {
      const pA = nodes[i];
      const pB = nodes[i + 1];
      const dx = pB.x - pA.x;
      const dy = pB.y - pA.y;
      const dist = Math.hypot(dx, dy) || 0.001;

      // Allow gentle slack / stretch elasticity
      const diff = (dist - targetSegDist) / dist;

      if (i === 0) {
        pB.x -= dx * diff * 0.85;
        pB.y -= dy * diff * 0.85;
      } else if (i + 1 === numNodes - 1) {
        pA.x += dx * diff * 0.85;
        pA.y += dy * diff * 0.85;
      } else {
        pA.x += dx * diff * 0.45;
        pA.y += dy * diff * 0.45;
        pB.x -= dx * diff * 0.45;
        pB.y -= dy * diff * 0.45;
      }
    }
  }

  // 4. Quantize / Snapshot Stepped Nodes for 24-30 FPS Anime Sakuga Frame Cadence (Stepped on 2s)
  if (!data.steppedNodes || data.elapsedFrames % 2 === 0) {
    data.steppedNodes = nodes.map(n => ({ x: n.x, y: n.y }));
  }

  // 1. Update active flying shrapnel spikes
  if (data.shrapnelSpikes.length > 0) {
    for (let i = data.shrapnelSpikes.length - 1; i >= 0; i--) {
      const spk = data.shrapnelSpikes[i];
      if (!spk.isFrozenByInfinity) {
        spk.x += spk.vx;
        spk.y += spk.vy;
      }
      spk.life--;

      // Check if spike is outside the arena boundaries
      const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : CONFIG.arena;
      if (arena) {
        if (arena.shape === 'circle') {
          const cx = arena.x + arena.width / 2;
          const cy = arena.y + arena.height / 2;
          const ar = arena.radius || (arena.width / 2);
          if (Math.hypot(spk.x - cx, spk.y - cy) > ar) {
            spk.life = 0;
          }
        } else {
          if (spk.x < arena.x || spk.x > arena.x + arena.width || spk.y < arena.y || spk.y > arena.y + arena.height) {
            spk.life = 0;
          }
        }
      }

      // Hit detection against all valid enemies & illusions (Rule #6 compliant)
      if (!spk.hasHit && (typeof state !== 'undefined' && state.fighters)) {
        const candidates = [...state.fighters, ...(state.illusions || [])];
        const myIdx = state.fighters.indexOf(fighter);
        const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIdx) : fighter.team;

        for (let j = 0; j < candidates.length; j++) {
          const ent = candidates[j];
          if (!ent || ent === fighter || ent.isDead || ent.hp <= 0) continue;

          // Team check
          const entIdx = state.fighters.indexOf(ent);
          if (entIdx !== -1) {
            const enemyTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(entIdx) : ent.team;
            if (myTeam !== null && enemyTeam === myTeam) continue;
          } else if (ent.owner) {
            const ownerIdx = state.fighters.indexOf(ent.owner);
            const ownerTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : ent.owner.team;
            if (myTeam !== null && ownerTeam === myTeam) continue;
          }

          const isGojoInfinity = (ent.characterId === 'gojo' || ent.type === 'gojo') && 
            !ent.isMeleeMode && 
            ((ent.infinityCooldown || 0) <= 0 || ent.infinityActive);

          const dToSpike = Math.hypot(ent.x - spk.x, ent.y - spk.y);
          if (isGojoInfinity && dToSpike <= ent.r + 38) {
            spk.isFrozenByInfinity = true;
            spk.vx = 0;
            spk.vy = 0;
            continue;
          }

          if (dToSpike <= ent.r + 18) {
            spk.hasHit = true;
            spk.life = 0; // Consume spike

            let shrapnelDmg = cannonCfg.shrapnelDamage || 12;
            if (isTransformed) shrapnelDmg *= (cfg.transformation?.damageMultiplier ?? 1.60);
            applyDamageToTarget(ent, shrapnelDmg, fighter, { isSkill: true });

            if (typeof ent.applyHitStun === 'function') {
              ent.applyHitStun(cannonCfg.shrapnelHitStun || 14);
            }
            ent.vx = (ent.vx || 0) + Math.cos(spk.angle) * 6;
            ent.vy = (ent.vy || 0) + Math.sin(spk.angle) * 6;

            if (typeof spawnBloodEffect === 'function') {
              spawnBloodEffect(ent, 3, spk.angle);
            }
            spawnImpactFlash(spk.x, spk.y, 25, isTransformed ? '#F5D0FE' : '#D946EF');

            // Attach impaled bone spike visual to enemy body (Randomized across/inside body)
            ent._embeddedMahitoSpikes = ent._embeddedMahitoSpikes || [];
            if (ent._embeddedMahitoSpikes.length < 8) {
              const bodyR = ent.r || 25;
              const randAng = Math.random() * Math.PI * 2;
              const randDist = Math.sqrt(Math.random()) * (bodyR * 0.88);
              const piercingAng = spk.angle + (Math.random() - 0.5) * 0.75;
              ent._embeddedMahitoSpikes.push({
                relX: Math.cos(randAng) * randDist,
                relY: Math.sin(randAng) * randDist,
                angle: piercingAng,
                length: (isTransformed ? 25 : 19) * (0.80 + Math.random() * 0.40),
                width: isTransformed ? 6.0 : 4.8,
                penetrationDepth: 0.25 + Math.random() * 0.50,
                isTransformed: Boolean(spk.isTransformed),
                duration: 180, // 3 full seconds
                maxDuration: 180
              });
            }
            break;
          }
        }
      }

      if (spk.life <= 0) {
        data.shrapnelSpikes.splice(i, 1);
      }
    }
  }

  // Check for Gojo Infinity barrier contact during stretch / morph
  if (typeof state !== 'undefined' && state.fighters && (data.phase === 'launch' || data.phase === 'morph')) {
    const candidates = [...state.fighters, ...(state.illusions || [])];
    const myIdx = state.fighters.indexOf(fighter);
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIdx) : fighter.team;

    for (let j = 0; j < candidates.length; j++) {
      const ent = candidates[j];
      if (!ent || ent === fighter || ent.isDead || ent.hp <= 0) continue;

      const entIdx = state.fighters.indexOf(ent);
      if (entIdx !== -1) {
        const enemyTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(entIdx) : ent.team;
        if (myTeam !== null && enemyTeam === myTeam) continue;
      } else if (ent.owner) {
        const ownerIdx = state.fighters.indexOf(ent.owner);
        const ownerTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : ent.owner.team;
        if (myTeam !== null && ownerTeam === myTeam) continue;
      }

      const isGojoInfinity = (ent.characterId === 'gojo' || ent.type === 'gojo') && 
        !ent.isMeleeMode && 
        ((ent.infinityCooldown || 0) <= 0 || ent.infinityActive);

      if (isGojoInfinity) {
        const distToTip = Math.hypot(ent.x - data.currentTipX, ent.y - data.currentTipY);
        if (distToTip <= (ent.r || 25) + 42) {
          if (!data.isFrozenByInfinity) {
            data.isFrozenByInfinity = true;
            data.phase = 'infinityFrozen';
            data.freezeStartFrame = data.elapsedFrames;
            data.freezeDuration = 32; // ~0.5s freeze duration at barrier
            data.lockTipX = data.currentTipX;
            data.lockTipY = data.currentTipY;
            if (typeof ent.triggerInfinityBlock === 'function') {
              ent.triggerInfinityBlock(data.currentTipX, data.currentTipY);
            }
            spawnImpactFlash(data.currentTipX, data.currentTipY, 50, 'rgba(0, 229, 255, 0.95)');
            spawnSparks(data.currentTipX, data.currentTipY, '#00F3FF', 16);
            audioSystem.playSFX('effect_infinity_collide', 1.0);
          }
          break;
        }
      }
    }
  }

  // 2. Launch Phase (Fires straight toward aimed coordinates)
  if (data.phase === 'launch') {
    const stretchSpeed = cannonCfg.stretchSpeed || 24.0;
    data.currentDist += stretchSpeed;

    const rawTipX = fighter.x + data.dirX * data.currentDist;
    const rawTipY = fighter.y + data.dirY * data.currentDist;
    const maceR = isTransformed ? (cannonCfg.maceRadiusTransformed || 29) : (cannonCfg.maceRadiusBase || 22);
    const pad = maceR + 8;
    const clampedTip = clampToArena(rawTipX, rawTipY, pad);
    data.currentTipX = clampedTip.x;
    data.currentTipY = clampedTip.y;

    // Check if tip reached aimed destination or maximum reach
    if (data.currentDist >= data.targetDist) {
      // Arrived at destination! Stay suspended in the air at this fixed point and begin transforming
      data.phase = 'morph';
      data.morphStartFrame = data.elapsedFrames;
      data.morphDuration = cannonCfg.morphDuration || 45;
      data.maceProgress = 0.0;
      data.lockTipX = data.currentTipX;
      data.lockTipY = data.currentTipY;

      audioSystem.playSFX('Assets/Sound Effects/Skills/mahito-stretch-arm.mp3', 1.4);
    }
  }

  // 2B. Infinity Frozen Phase (Stretched arm frozen suspended at Gojo's Infinity barrier)
  else if (data.phase === 'infinityFrozen') {
    data.currentTipX = data.lockTipX;
    data.currentTipY = data.lockTipY;

    if (data.elapsedFrames % 6 === 0) {
      spawnSparks(data.currentTipX, data.currentTipY, '#00F3FF', 3);
    }

    const freezeDur = data.freezeDuration || 32;
    if (data.elapsedFrames - data.freezeStartFrame >= freezeDur) {
      data.retractStartX = data.currentTipX;
      data.retractStartY = data.currentTipY;
      data.explodeFrame = data.elapsedFrames;
      data.retractDuration = 14;
      data.phase = 'retract';
    }
  }

  // 3. Hover Suspension & Spiked Ball Morph Phase (Suspended at fixed point in mid-air, allowing enemies to evade)
  else if (data.phase === 'morph') {
    const morphDur = data.morphDuration || 45;
    const morphProg = Math.min(1.0, (data.elapsedFrames - data.morphStartFrame) / morphDur);
    data.maceProgress = morphProg;

    // Lock position strictly to fixed coordinates in the air (no sticking / tracking enemies)
    data.currentTipX = data.lockTipX;
    data.currentTipY = data.lockTipY;

    // Crackling Cursed Energy sparks around the growing flesh head
    if (data.elapsedFrames % 6 === 0) {
      spawnSparks(data.currentTipX, data.currentTipY, isTransformed ? '#D946EF' : '#C026D3', 3);
    }

    // Instant Spike Pop-Out Cue at 68% growth
    if (morphProg >= 0.68 && !data.hasSpikesPopped) {
      data.hasSpikesPopped = true;
      audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 1.8);
      spawnImpactFlash(data.currentTipX, data.currentTipY, 45, isTransformed ? '#D946EF' : '#C026D3');
      spawnSparks(data.currentTipX, data.currentTipY, isTransformed ? '#F5D0FE' : '#D946EF', 12);
    }

    // When transformation into the giant spiked mace ball is fully complete, trigger violent explosion!
    if (morphProg >= 1.0) {
      data.phase = 'explode';
    }
  }

  // 4. Explosion Phase (Violent Spiked Ball Shrapnel Detonation)
  if (data.phase === 'explode') {
    data.hasDetonated = true;
    data.maceProgress = 1.0;
    data.explodeFrame = data.elapsedFrames;

    const impactX = data.currentTipX;
    const impactY = data.currentTipY;
    const blastRadius = cannonCfg.explosionRadius || 85;

    // Check all valid enemy fighters & illusions inside the explosion radius (Rule #6 compliant)
    if (typeof state !== 'undefined' && state.fighters) {
      const candidates = [...state.fighters, ...(state.illusions || [])];
      const myIdx = state.fighters.indexOf(fighter);
      const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIdx) : fighter.team;

      for (let j = 0; j < candidates.length; j++) {
        const ent = candidates[j];
        if (!ent || ent === fighter || ent.isDead || ent.hp <= 0) continue;

        const entIdx = state.fighters.indexOf(ent);
        if (entIdx !== -1) {
          const enemyTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(entIdx) : ent.team;
          if (myTeam !== null && enemyTeam === myTeam) continue;
        } else if (ent.owner) {
          const ownerIdx = state.fighters.indexOf(ent.owner);
          const ownerTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : ent.owner.team;
          if (myTeam !== null && ownerTeam === myTeam) continue;
        }

        const isGojoInfinity = (ent.characterId === 'gojo' || ent.type === 'gojo') && 
          !ent.isMeleeMode && 
          ((ent.infinityCooldown || 0) <= 0 || ent.infinityActive);

        const distToExplosion = Math.hypot(ent.x - impactX, ent.y - impactY);
        if (distToExplosion <= ent.r + blastRadius) {
          if (isGojoInfinity) continue;
          // Primary Target Damage & Heavy Impact
          let impactDmg = cannonCfg.impactDamage || 30;
          if (isTransformed) impactDmg *= (cfg.transformation?.damageMultiplier ?? 1.60);
          applyDamageToTarget(ent, impactDmg, fighter, { isMelee: true, isSkill: true });

          const hitAngle = Math.atan2(ent.y - impactY, ent.x - impactX) || data.angle;
          const kb = (cannonCfg.knockbackForce || 13) * (isTransformed ? 1.4 : 1.0);
          ent.vx = (ent.vx || 0) + Math.cos(hitAngle) * kb;
          ent.vy = (ent.vy || 0) + Math.sin(hitAngle) * kb;

          if (typeof ent.applyHitStun === 'function') {
            ent.applyHitStun(18);
          }

          if (typeof spawnBloodEffect === 'function') {
            spawnBloodEffect(ent, Math.max(3, Math.round(impactDmg * 0.25)), hitAngle);
          }

          // Attach 4 randomized embedded bone spikes across and inside enemy body
          ent._embeddedMahitoSpikes = ent._embeddedMahitoSpikes || [];
          const numToAttach = 4;
          for (let p = 0; p < numToAttach; p++) {
            if (ent._embeddedMahitoSpikes.length >= 8) break;
            const bodyR = ent.r || 25;
            // Fully randomized distribution in 2D body disk (inside core and outer contours)
            const randAng = Math.random() * Math.PI * 2;
            const randDist = Math.sqrt(Math.random()) * (bodyR * 0.90);
            const randPiercingAng = Math.random() * Math.PI * 2; // Organic randomized piercing angle
            const randLen = (isTransformed ? 26 : 20) * (0.75 + Math.random() * 0.55);
            const randW = (isTransformed ? 6.2 : 4.8) * (0.80 + Math.random() * 0.40);
            const penetrationDepth = 0.20 + Math.random() * 0.55;

            ent._embeddedMahitoSpikes.push({
              relX: Math.cos(randAng) * randDist,
              relY: Math.sin(randAng) * randDist,
              angle: randPiercingAng,
              length: randLen,
              width: randW,
              penetrationDepth,
              isTransformed: Boolean(isTransformed),
              duration: 180, // 3 full seconds
              maxDuration: 180
            });
          }

          // Stacks Soul Disfigurement
          applySoulDisfigurementStack(ent, fighter);
        }
      }
    }

    // Explosion Visuals & Shockwaves
    spawnImpactFlash(impactX, impactY, 75, isTransformed ? '#D946EF' : '#C026D3');
    spawnMeleeClashShockwave(impactX, impactY, 60, isTransformed ? '#F5D0FE' : '#D946EF');
    spawnMeleeClashShockwave(impactX, impactY, 35, '#FFFFFF');
    spawnSparks(impactX, impactY, isTransformed ? '#D946EF' : '#C026D3', 20);
    triggerGlobalScreenShake(cannonCfg.screenShake || 8, 8);

    // Audio
    audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 1.6);
    audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 1.6);

    // Spawn Razor Bone Spikes Flying in all organic directions (Natural Shrapnel Spread)
    const shrapnelSpeed = cannonCfg.shrapnelSpeed || 14.0;
    const spikeDefs = data.spikes || [];
    for (let s = 0; s < spikeDefs.length; s++) {
      const spkDef = spikeDefs[s];
      const spikeAng = (data.angle || 0) + spkDef.angle + (spkDef.curveOffset || 0);
      const spkSpeed = shrapnelSpeed * (0.85 + Math.random() * 0.35) * (spkDef.lenMult || 1.0);
      data.shrapnelSpikes.push({
        x: impactX,
        y: impactY,
        vx: Math.cos(spikeAng) * spkSpeed,
        vy: Math.sin(spikeAng) * spkSpeed,
        angle: spikeAng,
        length: (isTransformed ? 24 : 18) * (spkDef.lenMult || 1.0),
        width: (isTransformed ? 6.0 : 4.5) * (spkDef.widthMult || 1.0),
        life: 20,
        maxLife: 20,
        hasHit: false,
        isTransformed
      });
    }

    data.retractStartX = impactX;
    data.retractStartY = impactY;
    data.phase = 'retract';
  }

  // 5. Retract Phase (Smooth pullback along straight line into chest)
  if (data.phase === 'retract') {
    const elapsedSinceExplosion = data.elapsedFrames - data.explodeFrame;
    const rDur = data.retractDuration || 12;
    data.retractRatio = Math.min(1.0, elapsedSinceExplosion / rDur);

    const pullP = data.retractRatio * data.retractRatio * (3 - 2 * data.retractRatio);
    const fromX = data.retractStartX !== undefined ? data.retractStartX : (fighter.x + data.dirX * data.currentDist);
    const fromY = data.retractStartY !== undefined ? data.retractStartY : (fighter.y + data.dirY * data.currentDist);

    const rawTipX = fromX * (1.0 - pullP) + fighter.x * pullP;
    const rawTipY = fromY * (1.0 - pullP) + fighter.y * pullP;
    const maceR = isTransformed ? (cannonCfg.maceRadiusTransformed || 29) : (cannonCfg.maceRadiusBase || 22);
    const pad = maceR + 8;
    const clampedTip = clampToArena(rawTipX, rawTipY, pad * (1.0 - pullP));
    data.currentTipX = clampedTip.x;
    data.currentTipY = clampedTip.y;

    if (data.retractRatio >= 1.0 && data.shrapnelSpikes.length === 0) {
      fighter.maceCannonAnimTimer = 0;
      fighter.hideBackHand = false;
      fighter.hideFrontHand = false;
      fighter._maceCannonData = null;
    }
  }
}

/**
 * Executes Fourth Skill: Idle Transfiguration — Dual Scythe Pincer Guillotine (Twin Stretched Blade Ambush).
 * - Stretches both arms wide on left and right sides of the enemy.
 * - Morphs giant 4-blade needle claw scythes at both tips.
 * - Inward scissor clamp cross-slash across the target.
 */
export function executeMahitoTwinScissor(fighter, target = null) {
  const cfg = CONFIG.mahito || {};
  const scissorCfg = cfg.twinScissor || {};
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  let tgt = target;
  if (!tgt && typeof fighter._findClosestEnemy === 'function') {
    tgt = fighter._findClosestEnemy();
  }

  const minScissorDist = scissorCfg.minDistance || 240;
  if (!fighter.domainActive && tgt && tgt.hp > 0 && !tgt.isDead) {
    const distToTarget = Math.hypot(tgt.x - fighter.x, tgt.y - fighter.y);
    if (distToTarget < minScissorDist) {
      // Enemy is in close quarters! Stop from triggering and switch to close-quarters melee strike if in reach
      const reach = cfg.punchRange || 75;
      const maxReach = (fighter.r || 25) + (tgt.r || 25) + reach;
      if (distToTarget <= maxReach && (fighter.cooldownTimer || 0) <= 0) {
        executeIdleTransfigurationStrike(fighter, tgt);
      }
      return;
    }
  }

  const sharedCd = cfg.sharedSkillCooldown || scissorCfg.cooldown || 300;
  fighter.sharedSkillCooldown = sharedCd;
  fighter.fleshSurgeCooldown = sharedCd;
  fighter.maceCannonCooldown = sharedCd;
  fighter.twinScissorCooldown = sharedCd;
  fighter.twinScissorAnimTimer = 180; // Safety anim duration
  fighter.hideFrontHand = true;
  fighter.hideBackHand = true;

  // Voiceline for Skill 4 (occasional trigger)
  const skillVoiceChance = cfg.soundChances?.skillVoiceline !== undefined ? cfg.soundChances.skillVoiceline : (cfg.sounds?.skillVoicelineChance ?? 0.20);
  if (Math.random() < skillVoiceChance) {
    const skillVoiceVol = cfg.soundVolumes?.skillVoiceline !== undefined ? cfg.soundVolumes.skillVoiceline : (cfg.sounds?.skillVoicelineVolume ?? 2.2);
    audioSystem.playFighterVoiceline(fighter, cfg.sounds?.skillVoiceline || 'Assets/Sound Effects/Skills/mahito-skill2-voiceline.mp3', skillVoiceVol);
  }

  // Aim towards enemy or facing angle
  let angle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  let targetX = fighter.x + Math.cos(angle) * (scissorCfg.reachMax || 360);
  let targetY = fighter.y + Math.sin(angle) * (scissorCfg.reachMax || 360);

  if (tgt && tgt.hp > 0 && !tgt.isDead) {
    const dx = tgt.x - fighter.x;
    const dy = tgt.y - fighter.y;
    angle = Math.atan2(dy, dx);
    const distToTarget = Math.hypot(dx, dy);
    const maxReach = scissorCfg.reachMax || 360;
    const clampedDist = Math.min(maxReach, Math.max(scissorCfg.minDistance || 240, distToTarget));
    
    const rawTX = fighter.x + Math.cos(angle) * clampedDist;
    const rawTY = fighter.y + Math.sin(angle) * clampedDist;
    const clampedInf = clampOutsideGojoInfinity(rawTX, rawTY, tgt, 20);

    targetX = clampedInf.x;
    targetY = clampedInf.y;
  }

  const flankW = scissorCfg.flankWidth || 95;
  const perpX = -Math.sin(angle);
  const perpY =  Math.cos(angle);

  // Left and Right Flanking Target Coordinates (Wide caliper positions around enemy)
  const leftFlankX = targetX + perpX * flankW;
  const leftFlankY = targetY + perpY * flankW;
  const rightFlankX = targetX - perpX * flankW;
  const rightFlankY = targetY - perpY * flankW;

  // Compute shoulder / hand origins
  const r = fighter.r || 25;
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  const leftOriginX = fighter.x + (r * 0.70 * Math.cos(angle) - (facingLeft ? r * 0.18 : -r * 0.18) * Math.sin(angle));
  const leftOriginY = fighter.y + (r * 0.70 * Math.sin(angle) + (facingLeft ? r * 0.18 : -r * 0.18) * Math.cos(angle));
  const rightOriginX = fighter.x + (r * 0.45 * Math.cos(angle) - (facingLeft ? -r * 0.18 : r * 0.18) * Math.sin(angle));
  const rightOriginY = fighter.y + (r * 0.45 * Math.sin(angle) + (facingLeft ? -r * 0.18 : r * 0.18) * Math.cos(angle));

  // Initialize trailing rope nodes for both arms
  const numNodes = 14;
  const leftNodes = [];
  const rightNodes = [];
  for (let i = 0; i < numNodes; i++) {
    leftNodes.push({ x: leftOriginX, y: leftOriginY, oldX: leftOriginX, oldY: leftOriginY });
    rightNodes.push({ x: rightOriginX, y: rightOriginY, oldX: rightOriginX, oldY: rightOriginY });
  }

  fighter._twinScissorData = {
    target,
    angle,
    perpX,
    perpY,
    targetX,
    targetY,
    leftFlankX,
    leftFlankY,
    rightFlankX,
    rightFlankY,
    leftOriginX,
    leftOriginY,
    rightOriginX,
    rightOriginY,
    leftTipX: leftOriginX,
    leftTipY: leftOriginY,
    rightTipX: rightOriginX,
    rightTipY: rightOriginY,
    leftNodes,
    rightNodes,
    steppedLeftNodes: null,
    steppedRightNodes: null,
    phase: 'launch', // 'launch' -> 'morph' -> 'clamp' -> 'retract'
    elapsedFrames: 0,
    launchProgress: 0.0,
    morphStartFrame: 0,
    morphDuration: scissorCfg.morphDuration || 24,
    morphProgress: 0.0,
    clampStartFrame: 0,
    clampProgress: 0.0,
    hasClamped: false,
    hasDealtDamage: false,
    retractRatio: 0.0,
    retractDuration: 14
  };

  audioSystem.playSFX('Assets/Sound Effects/Attacks/syctheattack.mp3', cfg.sounds?.twinScissorVolume ?? 1.8);
  spawnImpactFlash(fighter.x, fighter.y, 40, isTransformed ? '#D946EF' : '#C026D3');
}

/**
 * Updates active Dual Scythe Pincer Guillotine phases, physics, clamp collision, and retraction.
 */
export function updateMahitoTwinScissor(fighter) {
  const data = fighter._twinScissorData;
  if (!data || fighter.twinScissorAnimTimer <= 0) return;

  data.elapsedFrames++;
  const cfg = CONFIG.mahito || {};
  const scissorCfg = cfg.twinScissor || {};
  const isTransformed = Boolean(fighter.isTransformed || fighter.isDistortedKilling);

  const angle = data.angle;
  const r = fighter.r || 25;
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  const leftOriginX = fighter.x + (r * 0.70 * Math.cos(angle) - (facingLeft ? r * 0.18 : -r * 0.18) * Math.sin(angle));
  const leftOriginY = fighter.y + (r * 0.70 * Math.sin(angle) + (facingLeft ? r * 0.18 : -r * 0.18) * Math.cos(angle));
  const rightOriginX = fighter.x + (r * 0.45 * Math.cos(angle) - (facingLeft ? -r * 0.18 : r * 0.18) * Math.sin(angle));
  const rightOriginY = fighter.y + (r * 0.45 * Math.sin(angle) + (facingLeft ? -r * 0.18 : r * 0.18) * Math.cos(angle));

  data.leftOriginX = leftOriginX;
  data.leftOriginY = leftOriginY;
  data.rightOriginX = rightOriginX;
  data.rightOriginY = rightOriginY;

  // Dynamically update target position during tracking phases so moving enemies don't slip out
  if (data.target && data.target.hp > 0 && !data.target.isDead && (data.phase === 'launch' || data.phase === 'morph')) {
    const curDx = data.target.x - fighter.x;
    const curDy = data.target.y - fighter.y;
    const curAngle = Math.atan2(curDy, curDx);
    const curDist = Math.hypot(curDx, curDy);
    const maxReach = scissorCfg.reachMax || 360;
    const clampedDist = Math.min(maxReach, Math.max(scissorCfg.minDistance || 240, curDist));
    
    const rawTX = fighter.x + Math.cos(curAngle) * clampedDist;
    const rawTY = fighter.y + Math.sin(curAngle) * clampedDist;
    const clampedInf = clampOutsideGojoInfinity(rawTX, rawTY, data.target, 20);

    data.targetX = clampedInf.x;
    data.targetY = clampedInf.y;

    const adjDx = data.targetX - fighter.x;
    const adjDy = data.targetY - fighter.y;
    const adjAngle = Math.atan2(adjDy, adjDx);
    data.angle = adjAngle;
    data.perpX = -Math.sin(adjAngle);
    data.perpY =  Math.cos(adjAngle);

    const flankW = scissorCfg.flankWidth || 95;
    data.leftFlankX = data.targetX + data.perpX * flankW;
    data.leftFlankY = data.targetY + data.perpY * flankW;
    data.rightFlankX = data.targetX - data.perpX * flankW;
    data.rightFlankY = data.targetY - data.perpY * flankW;
  }

  // Check for Gojo Infinity barrier contact during Twin Scissor stretch / clamp
  if (typeof state !== 'undefined' && state.fighters && (data.phase === 'launch' || data.phase === 'reachPause' || data.phase === 'popOut' || data.phase === 'clamp')) {
    const candidates = [...state.fighters, ...(state.illusions || [])];
    const myIdx = state.fighters.indexOf(fighter);
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIdx) : fighter.team;

    for (let j = 0; j < candidates.length; j++) {
      const ent = candidates[j];
      if (!ent || ent === fighter || ent.isDead || ent.hp <= 0) continue;

      const entIdx = state.fighters.indexOf(ent);
      if (entIdx !== -1) {
        const enemyTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(entIdx) : ent.team;
        if (myTeam !== null && enemyTeam === myTeam) continue;
      } else if (ent.owner) {
        const ownerIdx = state.fighters.indexOf(ent.owner);
        const ownerTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : ent.owner.team;
        if (myTeam !== null && ownerTeam === myTeam) continue;
      }

      const isGojoInfinity = (ent.characterId === 'gojo' || ent.type === 'gojo') && 
        !ent.isMeleeMode && 
        ((ent.infinityCooldown || 0) <= 0 || ent.infinityActive);

      if (isGojoInfinity) {
        const barrierR = (ent.r || 25) + 38;
        const dLeft = Math.hypot(ent.x - data.leftTipX, ent.y - data.leftTipY);
        const dRight = Math.hypot(ent.x - data.rightTipX, ent.y - data.rightTipY);
        const dTarget = Math.hypot(ent.x - data.targetX, ent.y - data.targetY);

        if (dLeft <= barrierR || dRight <= barrierR || dTarget <= barrierR) {
          if (!data.isFrozenByInfinity) {
            data.isFrozenByInfinity = true;
            data.phase = 'infinityFrozen';
            data.freezeStartFrame = data.elapsedFrames;
            data.freezeDuration = 32;
            if (typeof ent.triggerInfinityBlock === 'function') {
              ent.triggerInfinityBlock(data.targetX, data.targetY);
            }
            spawnImpactFlash(data.leftTipX, data.leftTipY, 45, 'rgba(0, 229, 255, 0.95)');
            spawnImpactFlash(data.rightTipX, data.rightTipY, 45, 'rgba(0, 229, 255, 0.95)');
            spawnSparks(data.leftTipX, data.leftTipY, '#00F3FF', 14);
            spawnSparks(data.rightTipX, data.rightTipY, '#00F3FF', 14);
            audioSystem.playSFX('effect_infinity_collide', 1.0);
          }
          break;
        }
      }
    }
  }

  // 1. Launch Phase (Both arms stretch outward along flanking pincer arcs)
  if (data.phase === 'launch') {
    const stretchSpeed = scissorCfg.stretchSpeed || 25.0;
    const distToLeftFlank = Math.hypot(data.leftFlankX - leftOriginX, data.leftFlankY - leftOriginY) || 1;
    const totalFramesNeeded = Math.max(6, Math.round(distToLeftFlank / stretchSpeed));
    data.launchProgress = Math.min(1.0, data.elapsedFrames / totalFramesNeeded);

    const lProgEased = Math.sin(data.launchProgress * (Math.PI * 0.5));
    // Bowing control point for wide flanking curve
    const bowAmt = (scissorCfg.flankWidth || 95) * 0.6;
    const midX = (leftOriginX + data.leftFlankX) * 0.5 + data.perpX * bowAmt;
    const midY = (leftOriginY + data.leftFlankY) * 0.5 + data.perpY * bowAmt;
    const invT = 1.0 - lProgEased;

    data.leftTipX = invT * invT * leftOriginX + 2 * invT * lProgEased * midX + lProgEased * lProgEased * data.leftFlankX;
    data.leftTipY = invT * invT * leftOriginY + 2 * invT * lProgEased * midY + lProgEased * lProgEased * data.leftFlankY;

    const rMidX = (rightOriginX + data.rightFlankX) * 0.5 - data.perpX * bowAmt;
    const rMidY = (rightOriginY + data.rightFlankY) * 0.5 - data.perpY * bowAmt;
    data.rightTipX = invT * invT * rightOriginX + 2 * invT * lProgEased * rMidX + lProgEased * lProgEased * data.rightFlankX;
    data.rightTipY = invT * invT * rightOriginY + 2 * invT * lProgEased * rMidY + lProgEased * lProgEased * data.rightFlankY;

    if (data.launchProgress >= 1.0) {
      data.phase = 'reachPause';
      data.pauseStartFrame = data.elapsedFrames;
      data.pauseDuration = 8; // Brief tense pause/freeze on reach
      data.morphProgress = 0.0;
      data.leftTipX = data.leftFlankX;
      data.leftTipY = data.leftFlankY;
      data.rightTipX = data.rightFlankX;
      data.rightTipY = data.rightFlankY;
    }
  }

  // 2A. Reach Pause Phase (Hands freeze at enemy flanks with NO blades yet for a tense pause)
  else if (data.phase === 'reachPause') {
    data.morphProgress = 0.0;
    data.leftTipX = data.leftFlankX;
    data.leftTipY = data.leftFlankY;
    data.rightTipX = data.rightFlankX;
    data.rightTipY = data.rightFlankY;

    const pauseDur = data.pauseDuration || 8;
    if (data.elapsedFrames - data.pauseStartFrame >= pauseDur) {
      data.phase = 'popOut';
      data.popStartFrame = data.elapsedFrames;
      data.popDuration = 10; // Snappy, smooth pop-out duration
      audioSystem.playSFX('Assets/Sound Effects/Skills/mahito-stretch-arm.mp3', 1.2);
      audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 1.8);
      spawnImpactFlash(data.leftTipX, data.leftTipY, 45, isTransformed ? '#D946EF' : '#FFFFFF');
      spawnImpactFlash(data.rightTipX, data.rightTipY, 45, isTransformed ? '#D946EF' : '#FFFFFF');
      spawnSparks(data.leftTipX, data.leftTipY, '#D946EF', 10);
      spawnSparks(data.rightTipX, data.rightTipY, '#D946EF', 10);
    }
  }

  // 2B. Pop-Out Phase (Blades erupt and shoot out from the hands like spikes)
  else if (data.phase === 'popOut') {
    const popDur = data.popDuration || 8; // Snappy 8-frame spike thrust
    const pProg = Math.min(1.0, (data.elapsedFrames - data.popStartFrame) / popDur);
    // Spike eruption power curve (fast explosive burst decelerating cleanly to full size)
    const spikeEased = pProg >= 1.0 ? 1.0 : (1 - Math.pow(1 - pProg, 3.5));
    data.morphProgress = Math.max(0.0, Math.min(1.0, spikeEased));
    data.leftTipX = data.leftFlankX;
    data.leftTipY = data.leftFlankY;
    data.rightTipX = data.rightFlankX;
    data.rightTipY = data.rightFlankY;

    if (data.elapsedFrames % 2 === 0) {
      spawnSparks(data.leftTipX, data.leftTipY, isTransformed ? '#D946EF' : '#C026D3', 4);
      spawnSparks(data.rightTipX, data.rightTipY, isTransformed ? '#D946EF' : '#C026D3', 4);
    }

    if (pProg >= 1.0) {
      data.morphProgress = 1.0;
      data.phase = 'clamp';
      data.clampStartFrame = data.elapsedFrames;
      audioSystem.playSFX('Assets/Sound Effects/Skills/hookchain.mp3', cfg.sounds?.twinScissorVolume ?? 1.8);
    }
  }
  // 2C. Infinity Frozen Phase (Both scissor arms/blades frozen suspended at Gojo's barrier)
  else if (data.phase === 'infinityFrozen') {
    if (data.elapsedFrames % 6 === 0) {
      spawnSparks(data.leftTipX, data.leftTipY, '#00F3FF', 3);
      spawnSparks(data.rightTipX, data.rightTipY, '#00F3FF', 3);
    }

    const freezeDur = data.freezeDuration || 32;
    if (data.elapsedFrames - data.freezeStartFrame >= freezeDur) {
      data.retractLeftStartX = data.leftTipX;
      data.retractLeftStartY = data.leftTipY;
      data.retractRightStartX = data.rightTipX;
      data.retractRightStartY = data.rightTipY;
      data.retractStartFrame = data.elapsedFrames;
      data.retractDuration = 14;
      data.morphProgress = 0.0;
      data.phase = 'retract';
    }
  }
  // 3. Clamp Phase (High-Speed Inward Scissor Guillotine Strike - Single Chop)
  else if (data.phase === 'clamp') {
    const clampDur = 14;
    const cProg = Math.min(1.0, (data.elapsedFrames - data.clampStartFrame) / clampDur);
    data.clampProgress = cProg;

    // Powerful snap acceleration curve
    const clampEased = 1.0 - Math.pow(1.0 - cProg, 3.2);

    // Tips travel inward past center crossing over each other deeply to form a distinct X-shape
    const crossOver = (scissorCfg.flankWidth || 95) * 0.65;
    const targetLeftX = data.targetX - data.perpX * crossOver;
    const targetLeftY = data.targetY - data.perpY * crossOver;
    const targetRightX = data.targetX + data.perpX * crossOver;
    const targetRightY = data.targetY + data.perpY * crossOver;

    const rawLeftX = data.leftFlankX + (targetLeftX - data.leftFlankX) * clampEased;
    const rawLeftY = data.leftFlankY + (targetLeftY - data.leftFlankY) * clampEased;
    const rawRightX = data.rightFlankX + (targetRightX - data.rightFlankX) * clampEased;
    const rawRightY = data.rightFlankY + (targetRightY - data.rightFlankY) * clampEased;

    // Add a forward arcing bulge to simulate a deep chop-down sweep
    const arcBulge = Math.sin(cProg * Math.PI) * 45;
    data.leftTipX = rawLeftX + Math.cos(angle) * arcBulge;
    data.leftTipY = rawLeftY + Math.sin(angle) * arcBulge;
    data.rightTipX = rawRightX + Math.cos(angle) * arcBulge;
    data.rightTipY = rawRightY + Math.sin(angle) * arcBulge;

    // Collision check at the scissor intersection apex (Rule #6 compliant)
    if (!data.hasDealtDamage && cProg >= 0.50) {
      data.hasDealtDamage = true;
      const strikeCenterX = data.targetX;
      const strikeCenterY = data.targetY;
      const strikeRadius = 75;

      if (typeof state !== 'undefined' && state.fighters) {
        const candidates = [...state.fighters, ...(state.illusions || [])];
        const myIdx = state.fighters.indexOf(fighter);
        const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIdx) : fighter.team;

        for (let j = 0; j < candidates.length; j++) {
          const ent = candidates[j];
          if (!ent || ent === fighter || ent.isDead || ent.hp <= 0) continue;

          const entIdx = state.fighters.indexOf(ent);
          if (entIdx !== -1) {
            const enemyTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(entIdx) : ent.team;
            if (myTeam !== null && enemyTeam === myTeam) continue;
          } else if (ent.owner) {
            const ownerIdx = state.fighters.indexOf(ent.owner);
            const ownerTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : ent.owner.team;
            if (myTeam !== null && ownerTeam === myTeam) continue;
          }

          const isGojoInfinity = (ent.characterId === 'gojo' || ent.type === 'gojo') && 
            !ent.isMeleeMode && 
            ((ent.infinityCooldown || 0) <= 0 || ent.infinityActive);

          const distToCut = Math.hypot(ent.x - strikeCenterX, ent.y - strikeCenterY);
          if (distToCut <= ent.r + strikeRadius) {
            if (isGojoInfinity) continue;
            let dmg = scissorCfg.damage || 34;
            if (isTransformed) dmg *= (cfg.transformation?.damageMultiplier ?? 1.60);
            applyDamageToTarget(ent, dmg, fighter, { isMelee: true, isSkill: true });

            // Inward Hook Pull: Pull the target towards Mahito (caster) instead of knocking them away
            const angleToCaster = Math.atan2(fighter.y - ent.y, fighter.x - ent.x);
            const hookForce = scissorCfg.knockbackForce || 10;
            if (typeof ent.applyKnockback === 'function') {
              ent.applyKnockback(Math.cos(angleToCaster) * hookForce, Math.sin(angleToCaster) * hookForce);
            } else {
              ent.vx = (ent.vx || 0) + Math.cos(angleToCaster) * hookForce;
              ent.vy = (ent.vy || 0) + Math.sin(angleToCaster) * hookForce;
            }

            // Apply Stun to Target
            const stunDur = scissorCfg.stunDuration || scissorCfg.hitStun || 45;
            if (typeof ent.applyHitStun === 'function') {
              ent.applyHitStun(stunDur);
            } else {
              ent.hitStunTimer = Math.max(ent.hitStunTimer || 0, stunDur);
            }
            if (typeof ent.interruptAttacks === 'function') {
              ent.interruptAttacks();
            }

            spawnFloatingText(ent.x, ent.y - ent.r - 18, "STUNNED!", "#C026D3");

            if (typeof spawnBloodEffect === 'function') {
              spawnBloodEffect(ent, 8, data.angle);
            }

            // Stacks Soul Disfigurement
            applySoulDisfigurementStack(ent, fighter);
          }
        }
      }

      // Visuals & Screen Shake
      spawnImpactFlash(strikeCenterX, strikeCenterY, 70, isTransformed ? '#D946EF' : '#C026D3');
      spawnMeleeClashShockwave(strikeCenterX, strikeCenterY, 55, '#F5D0FE');
      spawnMeleeClashShockwave(strikeCenterX, strikeCenterY, 35, '#FFFFFF');
      spawnSparks(strikeCenterX, strikeCenterY, '#D946EF', 20);
      triggerGlobalScreenShake(scissorCfg.screenShake || 8, 8);
      audioSystem.playSFX('Assets/Sound Effects/Attacks/syctheattack.mp3', cfg.sounds?.twinScissorVolume ?? 1.8);
    }

    if (cProg >= 1.0) {
      data.phase = 'flipHold';
      data.holdStartFrame = data.elapsedFrames;
      data.holdDuration = 14;
      data.releaseLeftStartX = data.leftTipX;
      data.releaseLeftStartY = data.leftTipY;
      data.releaseRightStartX = data.rightTipX;
      data.releaseRightStartY = data.rightTipY;
      audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 1.4);
    }
  }

  // 4. Stop Frame / Blade Flip Hold Phase (Arms pause in crossed X position while scythes flip outward)
  else if (data.phase === 'flipHold') {
    const holdDur = data.holdDuration || 14;
    const holdProg = Math.min(1.0, (data.elapsedFrames - data.holdStartFrame) / holdDur);
    data.flipProgress = holdProg;

    // Hold arms strictly locked in crossed X position
    data.leftTipX = data.releaseLeftStartX;
    data.leftTipY = data.releaseLeftStartY;
    data.rightTipX = data.releaseRightStartX;
    data.rightTipY = data.releaseRightStartY;

    if (holdProg >= 1.0) {
      data.phase = 'release';
      data.releaseStartFrame = data.elapsedFrames;
    }
  }

  // 5. Cross-Out / Release Phase (Uncrosses extra wide to flanking sides before pulling back)
  else if (data.phase === 'release') {
    const releaseDur = 14;
    const relProg = Math.min(1.0, (data.elapsedFrames - data.releaseStartFrame) / releaseDur);
    data.releaseProgress = relProg;

    // Shrink the blades as they uncross
    data.morphProgress = 1.0 - relProg;

    const relEased = Math.sin(relProg * (Math.PI * 0.5));

    // Wide uncrossing destination (1.45x width for expansive outward flare)
    const wideMult = 1.45;
    const wideLeftX = data.targetX + data.perpX * (scissorCfg.flankWidth * wideMult);
    const wideLeftY = data.targetY + data.perpY * (scissorCfg.flankWidth * wideMult);
    const wideRightX = data.targetX - data.perpX * (scissorCfg.flankWidth * wideMult);
    const wideRightY = data.targetY - data.perpY * (scissorCfg.flankWidth * wideMult);

    // Uncross: Left arm sweeps back from crossed right side -> back to extra-wide left flank
    // Right arm sweeps back from crossed left side -> back to extra-wide right flank
    data.leftTipX = data.releaseLeftStartX + (wideLeftX - data.releaseLeftStartX) * relEased;
    data.leftTipY = data.releaseLeftStartY + (wideLeftY - data.releaseLeftStartY) * relEased;
    data.rightTipX = data.releaseRightStartX + (wideRightX - data.releaseRightStartX) * relEased;
    data.rightTipY = data.releaseRightStartY + (wideRightY - data.releaseRightStartY) * relEased;

    if (relProg >= 1.0) {
      data.phase = 'retract';
      data.retractStartFrame = data.elapsedFrames;
      data.retractLeftStartX = data.leftTipX;
      data.retractLeftStartY = data.leftTipY;
      data.releaseLeftStartX = undefined;
      data.retractRightStartX = data.rightTipX;
      data.retractRightStartY = data.rightTipY;
      data.releaseRightStartX = undefined;
    }
  }

  // 5. Retract Phase (Smooth high-speed pullback into shoulder sockets)
  else if (data.phase === 'retract') {
    const elapsedSinceRetract = data.elapsedFrames - data.retractStartFrame;
    const rDur = data.retractDuration || 14;
    data.retractRatio = Math.min(1.0, elapsedSinceRetract / rDur);

    // Keep the blades fully shrunk during hand retraction
    data.morphProgress = 0.0;

    const pullP = data.retractRatio * data.retractRatio * (3 - 2 * data.retractRatio);
    data.leftTipX = data.retractLeftStartX * (1.0 - pullP) + leftOriginX * pullP;
    data.leftTipY = data.retractLeftStartY * (1.0 - pullP) + leftOriginY * pullP;
    data.rightTipX = data.retractRightStartX * (1.0 - pullP) + rightOriginX * pullP;
    data.rightTipY = data.retractRightStartY * (1.0 - pullP) + rightOriginY * pullP;

    if (data.retractRatio >= 1.0) {
      fighter.twinScissorAnimTimer = 0;
      fighter.hideFrontHand = false;
      fighter.hideBackHand = false;
      fighter._twinScissorData = null;
    }
  }

  // Update physical trailing thread nodes for both arms
  const numNodes = 14;
  const leftNodes = data.leftNodes;
  const rightNodes = data.rightNodes;

  if (leftNodes && rightNodes) {
    const guideStrength = (data.phase === 'release' || data.phase === 'retract') ? 0.38 : 0.08;

    for (let i = 1; i < numNodes - 1; i++) {
      const lNode = leftNodes[i];
      const rNode = rightNodes[i];

      // Calculate straight-line reference segment coordinates
      const t = i / (numNodes - 1);
      const targetLX = leftOriginX + (data.leftTipX - leftOriginX) * t;
      const targetLY = leftOriginY + (data.leftTipY - leftOriginY) * t;
      const targetRX = rightOriginX + (data.rightTipX - rightOriginX) * t;
      const targetRY = rightOriginY + (data.rightTipY - rightOriginY) * t;

      // Verlet inertia update
      const lvx = (lNode.x - lNode.oldX) * 0.72;
      const lvy = (lNode.y - lNode.oldY) * 0.72;
      lNode.oldX = lNode.x;
      lNode.oldY = lNode.y;
      lNode.x += lvx + (targetLX - lNode.x) * guideStrength;
      lNode.y += lvy + (targetLY - lNode.y) * guideStrength;

      const rvx = (rNode.x - rNode.oldX) * 0.72;
      const rvy = (rNode.y - rNode.oldY) * 0.72;
      rNode.oldX = rNode.x;
      rNode.oldY = rNode.y;
      rNode.x += rvx + (targetRX - rNode.x) * guideStrength;
      rNode.y += rvy + (targetRY - rNode.y) * guideStrength;
    }

    leftNodes[0].x = leftOriginX;
    leftNodes[0].y = leftOriginY;
    leftNodes[numNodes - 1].x = data.leftTipX;
    leftNodes[numNodes - 1].y = data.leftTipY;

    rightNodes[0].x = rightOriginX;
    rightNodes[0].y = rightOriginY;
    rightNodes[numNodes - 1].x = data.rightTipX;
    rightNodes[numNodes - 1].y = data.rightTipY;

    const leftDist = Math.hypot(data.leftTipX - leftOriginX, data.leftTipY - leftOriginY) || 1;
    const rightDist = Math.hypot(data.rightTipX - rightOriginX, data.rightTipY - rightOriginY) || 1;
    const lSeg = leftDist / (numNodes - 1);
    const rSeg = rightDist / (numNodes - 1);

    for (let iter = 0; iter < 4; iter++) {
      leftNodes[0].x = leftOriginX;
      leftNodes[0].y = leftOriginY;
      leftNodes[numNodes - 1].x = data.leftTipX;
      leftNodes[numNodes - 1].y = data.leftTipY;

      rightNodes[0].x = rightOriginX;
      rightNodes[0].y = rightOriginY;
      rightNodes[numNodes - 1].x = data.rightTipX;
      rightNodes[numNodes - 1].y = data.rightTipY;

      for (let i = 0; i < numNodes - 1; i++) {
        const lA = leftNodes[i];
        const lB = leftNodes[i + 1];
        const ldx = lB.x - lA.x;
        const ldy = lB.y - lA.y;
        const ld = Math.hypot(ldx, ldy) || 0.001;
        const ldiff = (ld - lSeg) / ld;

        if (i === 0) {
          lB.x -= ldx * ldiff * 0.85;
          lB.y -= ldy * ldiff * 0.85;
        } else if (i + 1 === numNodes - 1) {
          lA.x += ldx * ldiff * 0.85;
          lA.y += ldy * ldiff * 0.85;
        } else {
          lA.x += ldx * ldiff * 0.45;
          lA.y += ldy * ldiff * 0.45;
          lB.x -= ldx * ldiff * 0.45;
          lB.y -= ldy * ldiff * 0.45;
        }

        const rA = rightNodes[i];
        const rB = rightNodes[i + 1];
        const rdx = rB.x - rA.x;
        const rdy = rB.y - rA.y;
        const rd = Math.hypot(rdx, rdy) || 0.001;
        const rdiff = (rd - rSeg) / rd;

        if (i === 0) {
          rB.x -= rdx * rdiff * 0.85;
          rB.y -= rdy * rdiff * 0.85;
        } else if (i + 1 === numNodes - 1) {
          rA.x += rdx * rdiff * 0.85;
          rA.y += rdy * rdiff * 0.85;
        } else {
          rA.x += rdx * rdiff * 0.45;
          rA.y += rdy * rdiff * 0.45;
          rB.x -= rdx * rdiff * 0.45;
          rB.y -= rdy * rdiff * 0.45;
        }
      }
    }

    // 30 FPS Sakuga Stepped Nodes snapshot
    if (!data.steppedLeftNodes || data.elapsedFrames % 2 === 0) {
      data.steppedLeftNodes = leftNodes.map(n => ({ x: n.x, y: n.y }));
      data.steppedRightNodes = rightNodes.map(n => ({ x: n.x, y: n.y }));
    }
  }
}

/**
 * Executes Mahito's Fifth Skill: Soul Multiplicity (Transfigured Humans) or Alt Cast: Body Repel.
 * If the target is close (distance <= minDistanceAlt), Mahito summons 3 swarming Transfigured Humans.
 * If the target is far (distance > minDistanceAlt), Mahito fires the high-knockback Body Repel projectile.
 */
export function executeMahitoSoulMultiplicity(fighter, targetHint = null) {
  const cfg = CONFIG.mahito || {};
  const skillCfg = cfg.soulMultiplicity || {};

  // Find target
  const target = targetHint || (typeof fighter._findClosestEnemy === 'function' ? fighter._findClosestEnemy() : null);

  // Set cooldown immediately
  fighter.soulMultiplicityCooldown = skillCfg.cooldown || 1000;

  let dx = 0;
  let dy = 0;
  let distance = 0; // Default to close distance so we summon if target is null

  if (target) {
    dx = target.x - fighter.x;
    dy = target.y - fighter.y;
    distance = Math.hypot(dx, dy);
  }

  const minDistanceAlt = skillCfg.minDistanceAlt || 250;

  if (!target || distance <= minDistanceAlt) {
    // Summon swarming Transfigured Humans!
    spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, "SOUL MULTIPLICITY!", "#C026D3");
    triggerGlobalScreenShake(6, 12);
    const minionVoiceVol = cfg.soundVolumes?.minionsThrowVoiceline !== undefined ? cfg.soundVolumes.minionsThrowVoiceline : (cfg.sounds?.minionsThrowVoicelineVolume ?? 2.0);
    audioSystem.playFighterVoiceline(fighter, cfg.sounds?.minionsThrowVoiceline || 'Assets/Sound Effects/Skills/mahito-minionsthrow-voiceline.mp3', minionVoiceVol);

    const ownerIndex = (typeof fighter.fighterIndex === 'number')
      ? fighter.fighterIndex
      : (state.fighters ? state.fighters.indexOf(fighter) : 0);

    const summonCount = skillCfg.summonCount || 1;
    const minionHp = skillCfg.minionHp || 50;
    const minionDamage = skillCfg.minionDamage || 10;
    const minionSpeed = skillCfg.minionSpeed || 1.8;
    const minionSize = skillCfg.minionSize || 30;

    const summonSounds = cfg.sounds?.minionSummons || [
      cfg.sounds?.minionSummon || 'Assets/Sound Effects/Skills/mahito-minion-summon.mp3',
      cfg.sounds?.minionSummonAlt || 'Assets/Sound Effects/Skills/mahito-minion-summon1.mp3',
      cfg.sounds?.minionSummonAlt2 || 'Assets/Sound Effects/Skills/mahito-minion-summo2.mp3'
    ];
    const chosenSound = summonSounds[Math.floor(Math.random() * summonSounds.length)];

    for (let s = 0; s < summonCount; s++) {
      const angle = (fighter.gunAngle || 0) + (Math.random() * 0.8 - 0.4);
      const distOffset = fighter.r + minionSize + 5 + Math.random() * 15;
      
      const child = {
        x: fighter.x + Math.cos(angle) * distOffset,
        y: fighter.y + Math.sin(angle) * distOffset,
        vx: Math.cos(angle) * minionSpeed,
        vy: Math.sin(angle) * minionSpeed,
        r: minionSize,
        hp: minionHp,
        maxHp: minionHp,
        damage: minionDamage,
        owner: fighter,
        ownerIndex: ownerIndex,
        isIllusion: true,
        isDoppelganger: true, // Acts as doppelganger illusion
        isTransfiguredHuman: true, // Custom visual skin renderer
        isSplitChild: true,  // Do not split on death
        minionSound: chosenSound,
        minionNoiseTimer: 45 + Math.floor(Math.random() * 30),
        angle: angle,
        gunAngle: angle,
        moveSpeed: minionSpeed,
        hitFlashTimer: 0,
        timeStopTimer: 0,
        hitStunTimer: 0,
        swordCooldown: 30,
        swordSwingActive: false,
        swordSwingTimer: 0,
        swordSwingAngle: 0,
        applyTimeStop(dur) { this.timeStopTimer = Math.max(this.timeStopTimer || 0, dur); },
        applyHitStun(dur)  { this.hitStunTimer  = Math.max(this.hitStunTimer  || 0, dur); },
        applyKnockback(vx, vy) { this.knockbackVx = vx; this.knockbackVy = vy; },
        takeDamage(amount, attacker, opts = {}) {
          return applyDamageToTarget(this, amount, attacker, opts);
        },
      };

      state.illusions.push(child);
    }

    audioSystem.playSFX(chosenSound, cfg.sounds?.minionSummonVolume ?? 1.8);
  } else {
    // Alt Cast: Body Repel projectile!
    spawnFloatingText(fighter.x, fighter.y - fighter.r - 28, "BODY REPEL!", "#C026D3");
    triggerGlobalScreenShake(8, 15);
    spawnImpactFlash(fighter.x, fighter.y, 60, '#C026D3');
    audioSystem.playFighterVoiceline(fighter, cfg.sounds?.minionsThrowVoiceline || 'Assets/Sound Effects/Skills/mahito-minionsthrow-voiceline.mp3', cfg.sounds?.minionsThrowVoicelineVolume ?? 2.0);

    const bodyRepelDamage = skillCfg.bodyRepelDamage || 50;
    const bodyRepelSpeed = skillCfg.bodyRepelSpeed || 10.0;
    const bodyRepelRadius = skillCfg.bodyRepelRadius || 50;
    const bodyRepelLife = skillCfg.bodyRepelLife || 90;
    const bodyRepelKnockback = skillCfg.bodyRepelKnockback || 20;

    const ownerIndex = (typeof fighter.fighterIndex === 'number')
      ? fighter.fighterIndex
      : (state.fighters ? state.fighters.indexOf(fighter) : 0);

    const angle = Math.atan2(dy, dx);
    const proj = projectileSystem.fireProjectile(
      fighter,
      ownerIndex,
      bodyRepelDamage,
      false, // isFollowUp
      bodyRepelSpeed,
      false, // willBecomeBlackHole
      'mahito_body_repel',
      fighter.x,
      fighter.y,
      angle
    );

    if (proj) {
      proj.isMahitoBodyRepel = true;
      proj.ownerFighter = fighter;
      proj.owner = ownerIndex;
      proj.r = bodyRepelRadius;
      proj.life = bodyRepelLife;
      proj.maxLife = bodyRepelLife;
      proj.knockbackForce = bodyRepelKnockback;
    }

    audioSystem.playSFX(cfg.sounds?.whiff || 'Assets/Sound Effects/Skills/woosh.mp3', 1.5);
  }
}

// ============================================================================
// 12. ULTIMATE: DOMAIN EXPANSION — Self-Embodiment of Perfection
// ============================================================================

export function executeMahitoDomainExpansion(fighter, targetHint = null) {
  const cfg = CONFIG.mahito || {};
  
  // Set domain charge max and start channeling
  fighter.domainChargeMax = cfg.domainExpansion?.chargeMax || 120;
  fighter.domainChargeTimer = fighter.domainChargeMax;
  fighter.isChannelingDomainExpansion = true;

  // Cancel and interrupt all active morph animations, punches, skills, and clear leftover afterimages
  fighter.punchAnimTimer = 0;
  fighter.fleshSurgeAnimTimer = 0;
  fighter._fleshSurgePlungeAngle = null;
  fighter.maceCannonAnimTimer = 0;
  fighter._maceCannonData = null;
  fighter.twinScissorAnimTimer = 0;
  fighter._twinScissorData = null;
  fighter.soulPhaseDashTimer = 0;
  fighter.soulPhaseDashVector = null;
  if (fighter._dashAfterimages) fighter._dashAfterimages.length = 0;
  if (fighter.afterImages) fighter.afterImages.length = 0;
  fighter.hideFrontHand = false;
  fighter.hideBackHand = false;
  
  // Apply full cooldown immediately
  fighter.domainCooldown = cfg.domainExpansion?.cooldown || 2000;
  
  const domChanVol = cfg.soundVolumes?.domainChannelSound !== undefined ? cfg.soundVolumes.domainChannelSound : (cfg.sounds?.domainChannelVolume || 3.5);
  audioSystem.playFighterVoiceline(fighter, cfg.sounds?.domainChannelSound || 'Assets/Sound Effects/Skills/mahito-domainchanneling-voiceline.mp3', domChanVol, 1.0, 0, 0, { priority: 'domain', isProtected: true, durationMs: 2500 });
  spawnFloatingText(fighter.x, fighter.y - fighter.r - 20, "DOMAIN EXPANSION...", "#D946EF");
}

export function updateMahitoDomainExpansion(fighter) {
  const cfg = CONFIG.mahito || {};
  const domainDuration = cfg.domainExpansion?.duration || 600;

  // Channeling Phase
  if (fighter.domainChargeTimer > 0) {
    fighter.domainChargeTimer--;
    if (fighter._dashAfterimages && fighter._dashAfterimages.length > 0) {
      fighter._dashAfterimages.length = 0;
    }
    if (fighter.afterImages && fighter.afterImages.length > 0) {
      fighter.afterImages.length = 0;
    }

    // Domain Expansion Hyper Armor: only Toji can interrupt (or death)
    if (fighter.hp <= 0 || fighter.isDead) {
      fighter.domainChargeTimer = 0;
      fighter.isChannelingDomainExpansion = false;
      return;
    }

    // Continuous Arena Screen Shake while Channeling (Rumbling build-up)
    const chargeProgress = 1.0 - (fighter.domainChargeTimer / (fighter.domainChargeMax || 120));
    const shakeIntensity = 3.0 + chargeProgress * 5.0; // Shakes arena from 3.0 up to 8.0 intensity
    triggerGlobalScreenShake(shakeIntensity, 6);

    // Channeling Visuals
    if (fighter.domainChargeTimer % 6 === 0) {
      spawnImpactFlash(fighter.x, fighter.y, 100, 'rgba(217, 70, 239, 0.4)');
      spawnSparks(fighter.x, fighter.y, '#D946EF', 8);
    }

    // Deployment moment
    if (fighter.domainChargeTimer <= 0) {
      fighter.isChannelingDomainExpansion = false;
      fighter.domainActive = true;
      fighter.domainTimer = domainDuration;
      
      const domDeployVol = cfg.soundVolumes?.domainDeploySound !== undefined ? cfg.soundVolumes.domainDeploySound : (cfg.sounds?.domainDeployVolume || 3.5);
      audioSystem.playFighterVoiceline(fighter, cfg.sounds?.domainDeploySound || 'Assets/Sound Effects/Skills/mahito-domaindeploy-voiceline.mp3', domDeployVol, 1.0, 0, 0, { priority: 'domain', isProtected: true, durationMs: 4500 });
      if (cfg.sounds?.domainDeployAltSound) {
        const domAltVol = cfg.soundVolumes?.domainDeployAltSound !== undefined ? cfg.soundVolumes.domainDeployAltSound : (cfg.sounds?.domainDeployAltVolume ?? 1.2);
        audioSystem.playSFX(cfg.sounds.domainDeployAltSound, domAltVol);
      }
      spawnFloatingText(fighter.x, fighter.y - fighter.r - 40, "SELF-EMBODIMENT OF PERFECTION!", "#FF007F");
      triggerGlobalScreenShake(14, 20);

      // Instantly Paralyze (TimeStop) all enemies within radius (Rule #1, #5, #6)
      // Mahito's domain covers the whole screen (9999 radius)
      if (typeof state !== 'undefined' && state.fighters) {
        const candidates = [...state.fighters, ...(state.illusions || [])];
        const myIndex = state.fighters.indexOf(fighter);
        const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : fighter.team;

        for (let i = 0; i < candidates.length; i++) {
          const ent = candidates[i];
          if (!ent || ent === fighter || ent.isDead || ent.hp <= 0) continue;

          // Check team alignment
          let isEnemy = false;
          const idx = state.fighters.indexOf(ent);
          if (idx !== -1) {
            const enemyTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(idx) : ent.team;
            if (myTeam === null || enemyTeam !== myTeam) isEnemy = true;
          } else if (ent.owner) {
            const ownerIdx = state.fighters.indexOf(ent.owner);
            const ownerTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(ownerIdx) : ent.owner.team;
            if (myTeam === null || ownerTeam !== myTeam) isEnemy = true;
          } else if (ent.team !== undefined) {
            if (myTeam === null || ent.team !== myTeam) isEnemy = true;
          }

          if (isEnemy) {
            // Apply domain specific slow flag (slows them down instead of complete freeze/timeStop)
            ent.isFrozenByMahitoDomain = true;
          }
        }
      }
    }
    return;
  }

  // Active Phase
  if (fighter.domainActive) {
    fighter.domainTimer--;
    if (fighter.domainTimer <= 0) {
      fighter.domainActive = false;
      // When domain expires naturally, unfreeze targets
      if (typeof state !== 'undefined' && state.fighters) {
        const candidates = [...state.fighters, ...(state.illusions || [])];
        for (let i = 0; i < candidates.length; i++) {
          const ent = candidates[i];
          if (ent && ent.isFrozenByMahitoDomain) {
            ent.isFrozenByMahitoDomain = false;
          }
        }
      }
    }
  }
}
