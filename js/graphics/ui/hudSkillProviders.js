import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { state } from '../../core/state.js';

const checkHasTeammate = (f) => {
  if (typeof state !== 'undefined' && state.getFighterTeam && state.fighters) {
    const myIndex = state.fighters.indexOf(f);
    if (myIndex !== -1) {
      const myTeam = state.getFighterTeam(myIndex);
      if (myTeam !== null && myTeam !== undefined) {
        return state.fighters.some((other, idx) => idx !== myIndex && other && !other.isDead && (other.hp || 0) > 0 && !other.isTurret && !other.isIllusion && state.getFighterTeam(idx) === myTeam);
      }
    }
  }
  return false;
};

/**
 * Universal helper: checks whether a skill, ability, or mechanic toggle is enabled in config.
 * Handles boolean true/false, numeric 1/0, string 'true'/'false', variadic alias candidates, and undefined fallbacks.
 * If ANY provided candidate is explicitly false / 0 / 'false' / 'disabled', the skill is considered disabled.
 * @param {...*} args Candidate config values followed by optional boolean defaultValue
 * @returns {boolean}
 */
export function isSkillEnabled(...args) {
  let defaultValue = true;
  let candidates = args;
  if (args.length > 1 && typeof args[args.length - 1] === 'boolean') {
    defaultValue = args[args.length - 1];
    candidates = args.slice(0, -1);
  }

  // 1. If any candidate is explicitly false, 0, 'false', '0', 'off', 'disabled' -> skill is disabled!
  for (const c of candidates) {
    if (c === false || c === 0 || c === 'false' || c === '0' || c === 'off' || c === 'disabled') {
      return false;
    }
  }

  // 2. If any candidate is explicitly true, non-zero number, 'true', '1', 'on', 'enabled' -> skill is enabled!
  for (const c of candidates) {
    if (c === true || (typeof c === 'number' && c !== 0) || c === 'true' || c === '1' || c === 'on' || c === 'enabled') {
      return true;
    }
  }

  // 3. Fallback to defaultValue
  return Boolean(defaultValue);
}

/**
 * Calculates skill bar HUD data for any given fighter.
 * Only returns skills that are currently enabled in the character's config.
 * @param {Object} f Fighter instance
 * @param {Function} getProjectiles Function reference to active projectiles getter
 * @returns {Array<{id: string, pct: number, ready: boolean, color: string, label: string}>}
 */
export function getSkillDataForFighter(f, getProjectiles) {
  if (!f) return [];

  // ─────────────────────────────────────────────
  // GOJO SATORU (Limitless & Six Eyes)
  // ─────────────────────────────────────────────
  if (f.characterId === 'gojo' || f.type === 'gojo') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.gojo) ? CONFIG.gojo : {};
    const themeColor = '#00E5FF'; 
    const skills = [];

    // 1. Unlimited Void (uv)
    if (isSkillEnabled(cfg.enableDomain, true)) {
      const domainMax = cfg.domainCooldown || 2000;
      const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
      let domainPct;
      if (f.isChannelingDomainExpansion) {
        domainPct = 100;
      } else if (f.domainActive) {
        const domainDuration = cfg.domainDuration || 400;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      } else {
        domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
      }
      skills.push({ id: 'uv', pct: domainPct, ready: domainPct >= 99, color: themeColor, label: 'UNLIMITED VOID' });
    }

    // 2. Hollow Purple (purple)
    if (isSkillEnabled(cfg.enablePurple, cfg.enableHollowPurple, true)) {
      const activeProjectiles = typeof getProjectiles === 'function'
        ? getProjectiles()
        : (state.projectiles || (typeof state.getProjectiles === 'function' ? state.getProjectiles() : []));
      const purpleOrb = activeProjectiles.find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb) && p.life > 0 && p.owner === state.fighters?.indexOf(f));
      const purpleMax = cfg.purpleCooldown || 1500;
      const purpleTimer = f.purpleCooldown !== undefined ? f.purpleCooldown : purpleMax;
      let purplePct;
      if (f.isChannelingPurple) {
        const chargeMax = cfg.purpleChargeMax || 120;
        const chargeTimer = f.purpleChargeTimer || 0;
        purplePct = Math.max(0, Math.min(100, (1 - chargeTimer / chargeMax) * 100));
      } else if (purpleOrb) {
        const orbMaxLife = cfg.purpleLife ?? 480;
        purplePct = Math.max(0, Math.min(100, (purpleOrb.life / orbMaxLife) * 100));
      } else if ((f.purpleRecoveryTimer || 0) > 0) {
        purplePct = 0;
      } else {
        purplePct = Math.max(0, Math.min(100, (1 - (purpleTimer / purpleMax)) * 100));
      }
      const label100 = cfg.purpleSecondCastTextHeader100 || 'PURPLE';
      const label200 = cfg.purpleSecondCastTextHeader200 || 'PURPLE';
      const purpleLabel = (f.purpleUseCount === 1) ? label200 : label100;
      skills.push({ id: 'purple', pct: purplePct, ready: purplePct >= 99, color: themeColor, label: purpleLabel });
    }

    // 3. Reversal Red (red)
    if (isSkillEnabled(cfg.enableRed, cfg.enableReversalRed, true)) {
      const redMax = cfg.redCooldown || 1000;
      const redTimer = f.redCooldown !== undefined ? f.redCooldown : redMax;
      const redPct = Math.max(0, Math.min(100, (1 - (redTimer / redMax)) * 100));
      skills.push({ id: 'red', pct: redPct, ready: redPct >= 99, color: themeColor, label: 'REVERSAL RED' });
    }

    // 4. Reverse Cursed Technique (rct)
    if (isSkillEnabled(cfg.enableRCTHeal, cfg.enableRCT, cfg.enableReverseCursedTechnique, true)) {
      const rctMax = cfg.reverseCursedTechniqueCooldown || 700;
      const rctTimer = f.reverseCursedTechniqueCooldown !== undefined ? f.reverseCursedTechniqueCooldown : 0;
      const rctPct = Math.max(0, Math.min(100, (1 - (rctTimer / rctMax)) * 100));
      skills.push({ id: 'rct', pct: rctPct, ready: rctPct >= 99 && !f.isChannelingRCT && (f.reverseCursedTechniqueCooldown || 0) <= 0, color: themeColor, label: 'RCT' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // TOJI FUSHIGURO (Sorcerer Killer)
  // ─────────────────────────────────────────────
  if (f.characterId === 'toji' || f.type === 'toji') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.toji) ? CONFIG.toji : {};
    const themeColor = '#a855f7';
    const skills = [];

    // 1. Stealth Ambush
    if (isSkillEnabled(cfg.enableAmbush, true)) {
      const ambushTrigger = cfg.ambushTriggerFrames || 55;
      const ambushMax = (cfg.stealthCooldown || 500) - ambushTrigger;
      const rawAmbushTimer = f.stealthCooldown !== undefined ? f.stealthCooldown : 0;
      let ambushPct = 0;
      if (f.stealthTimer > 0) { ambushPct = 0; }
      else {
        const cooldownRemaining = Math.max(0, rawAmbushTimer - ambushTrigger);
        ambushPct = Math.max(0, Math.min(100, (1 - (cooldownRemaining / ambushMax)) * 100));
      }
      if (f.isAmbushing) {
        let ap = 0;
        const ph = f.ambushPhase;
        if (ph === 'FRONT_PAUSE' || ph === 'FRONT_LAUNCH') { ap = 0.05; }
        else if (ph === 'BACK_CHARGE') { const p = Math.max(0, 1 - ((f.ambushTimer || 0) / (cfg.ambushBackChargeDuration || 30))); ap = 0.10 + p * 0.20; }
        else if (ph === 'BACK_STAB' || ph === 'KATANA_DRAW') { ap = 0.35; }
        else if (ph === 'KATANA_CHASE' || ph === 'KATANA_CHARGE') { const p = Math.max(0, 1 - ((f.ambushTimer || 0) / (cfg.ambushKatanaChargeDuration || 30))); ap = 0.40 + p * 0.20; }
        else if (ph === 'KATANA_SLASH') { ap = 0.65; }
        else if (ph === 'PHANTOM_FLURRY') { ap = 0.65 + ((f.phantomStrikeCount || 0) / (cfg.ambushPhantomFlurryStrikes || 10)) * 0.25; }
        else if (ph === 'FINISHER_DASH' || ph === 'FINISHER_SLASH') { ap = 0.95; }
        ambushPct = Math.max(0, 100 - ap * 100);
      }
      skills.push({ id: 'ambush', pct: ambushPct, ready: ambushPct >= 99, color: themeColor, label: 'STEALTH AMBUSH' });
    }

    // 2. Curse Inventory (Ultimate)
    if (isSkillEnabled(cfg.enableUltimate, true)) {
      const ultMax = f.ultimateCooldownMax || cfg.ultimateCooldown || 1500;
      const ultTimer = f.ultimateCooldown !== undefined ? f.ultimateCooldown : ultMax;
      let ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));

      if (f.ultimateActive) {
        if (f.ultimatePhase === 'CHANNELING') {
          const chgMax = f.ultimateChargeMax || 90;
          const remainingChg = Math.max(0, chgMax - (f.ultimateChargeTimer || 0));
          ultPct = Math.max(0, Math.min(100, (remainingChg / chgMax) * 100));
        } else {
          const totalMax = cfg.ultimateSwarmDuration || 500;
          const remainingSwarm = Math.max(0, f.ultimateTotalTimer !== undefined ? f.ultimateTotalTimer : totalMax);
          ultPct = Math.max(0, Math.min(100, (remainingSwarm / totalMax) * 100));
        }
      }
      skills.push({ id: 'ult', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: 'CURSE INVENTORY' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // SUKUNA (King of Curses)
  // ─────────────────────────────────────────────
  if (f.characterId === 'sukuna' || f.type === 'sukuna') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.sukuna) ? CONFIG.sukuna : {};
    const themeColor = f.color || '#ff4500';
    const skills = [];

    // 1. Malevolent Shrine (ms)
    if (isSkillEnabled(cfg.enableDomain, true)) {
      const domainMax = cfg.domainCooldown || 1000;
      const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
      let domainPct;
      if (f.isChannelingDomainExpansion) {
        domainPct = 100;
      } else if (f.domainActive) {
        const domainDuration = cfg.domainDuration || 500;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      } else {
        domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
      }
      skills.push({ id: 'ms', pct: domainPct, ready: domainPct >= 99, color: themeColor, label: 'MALEVOLENT SHRINE' });
    }

    // 2. Fuga / Furnace (fuga)
    if (isSkillEnabled(cfg.enableFurnace, cfg.enableFuga, cfg.enableDivineFlame, true)) {
      const flameMax = cfg.divineFlameCooldown || 1500;
      const flameTimer = f.divineFlameCooldown !== undefined ? f.divineFlameCooldown : flameMax;
      let flamePct;
      if (f.isChannelingDivineFlame) {
        const chargeMax = f.divineFlameChargeMax || cfg.divineFlameChargeMax || 100;
        const chargeTimer = f.divineFlameChargeTimer || 0;
        flamePct = Math.max(0, Math.min(100, (chargeTimer / chargeMax) * 100));
      } else if ((f.divineFlameRecoveryTimer || 0) > 0) {
        flamePct = 0;
      } else {
        flamePct = Math.max(0, Math.min(100, (1 - (flameTimer / flameMax)) * 100));
      }
      skills.push({ id: 'fuga', pct: flamePct, ready: flamePct >= 99, color: themeColor, label: 'FUGA (FURNACE)' });
    }

    // 3. Reverse Cursed Technique (rct)
    if (isSkillEnabled(cfg.enableRCT, cfg.enableReverseCursedTechnique, true)) {
      const sukunaRctMax = cfg.reverseCursedTechniqueCooldown || 700;
      const sukunaRctTimer = f.reverseCursedTechniqueCooldown !== undefined ? f.reverseCursedTechniqueCooldown : 0;
      const rctPct = Math.max(0, Math.min(100, (1 - (sukunaRctTimer / sukunaRctMax)) * 100));
      skills.push({ id: 'rct', pct: rctPct, ready: rctPct >= 99 && (f.reverseCursedTechniqueCooldown || 0) <= 0 && (f.rctVisualTimer || 0) <= 0, color: themeColor, label: 'RCT' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // EIGHT-HANDLED MAHORAGA (Divine General)
  // ─────────────────────────────────────────────
  if (f.characterId === 'mahoraga' || f.type === 'mahoraga') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.mahoraga) ? CONFIG.mahoraga : {};
    const themeColor = '#FFD700';
    const skills = [];

    // 1. Wheel of Adaptation
    if (isSkillEnabled(cfg.enableAdaptation, cfg.enableWheel, cfg.enableFatalAdaptation, true)) {
      const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
      const currentLevel = Math.max(1, totalStages + 1);
      const lvlStr = `${currentLevel}`;

      const windowThreshold = f.maxHp * (cfg.fatalDamageThresholdPct || 0.15);
      const isCoolingDown = (f.fatalAdaptCooldown || 0) > 0;
      const cdMax = f.fatalAdaptCooldownMax || cfg.fatalAdaptCooldownFrames || 180;

      let wheelPct = 0;
      let wheelLabel = `WOA - LVL ${lvlStr}`;
      let wheelReady = false;

      if ((f.wheelClickTimer || 0) > 0 || (f.adaptationPauseTimer || 0) > 0 || f.pendingDomainAdaptation) {
        wheelPct = 100;
        wheelReady = true;
        wheelLabel = 'ADAPTING...';
      } else if (isCoolingDown) {
        wheelPct = Math.max(0, Math.min(100, (1 - (f.fatalAdaptCooldown / cdMax)) * 100));
        wheelReady = false;
        const secondsLeft = (f.fatalAdaptCooldown / 60).toFixed(1);
        wheelLabel = `WOA COOLDOWN (${secondsLeft}s)`;
      } else {
        const accum = f.totalAccumDamage || 0;
        wheelPct = Math.max(0, Math.min(100, (accum / windowThreshold) * 100));
        wheelReady = wheelPct >= 99;
        wheelLabel = `WOA - LVL ${lvlStr}`;
      }
      skills.push({ id: 'wheel', pct: wheelPct, ready: wheelReady, color: themeColor, label: wheelLabel });
    }

    // 2. Debris Throw / Wall Slam
    if (isSkillEnabled(cfg.enableThrowBarrage, cfg.enableWallSlam, cfg.enableThrow, true)) {
      const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
      const isLevel8 = totalStages >= 8;
      const throwMax = cfg.throwCooldown || 1000;
      const throwTimer = f.throwCooldown !== undefined ? f.throwCooldown : throwMax;
      let throwPct = 0;
      if (f.isThrowing) {
        throwPct = 0;
      } else {
        throwPct = Math.max(0, Math.min(100, (1 - (throwTimer / throwMax)) * 100));
      }

      const rawThrowLabel = isLevel8 ? 'WALL SLAM THROW' : 'THROW';
      if (!f._throwLabelAnimation) {
        f._throwLabelAnimation = { prev: rawThrowLabel, active: false, timer: 0 };
      }
      if (f._throwLabelAnimation.prev !== rawThrowLabel) {
        f._throwLabelAnimation.prev = rawThrowLabel;
        f._throwLabelAnimation.active = true;
        f._throwLabelAnimation.timer = 20;
      }

      let throwLabelHtml = rawThrowLabel;
      if (f._throwLabelAnimation.active && f._throwLabelAnimation.timer > 0) {
        f._throwLabelAnimation.timer--;
        const opacity = Math.abs(f._throwLabelAnimation.timer - 10) / 10;
        const displayLabel = f._throwLabelAnimation.timer > 10 ? (isLevel8 ? 'THROW' : 'WALL SLAM THROW') : rawThrowLabel;
        throwLabelHtml = `<span style="display: inline-block; opacity: ${opacity.toFixed(2)}; transition: opacity 0.1s ease-in-out;">${displayLabel}</span>`;
        if (f._throwLabelAnimation.timer <= 0) {
          f._throwLabelAnimation.active = false;
        }
      }
      skills.push({ id: 'throw', pct: throwPct, ready: throwPct >= 99, color: themeColor, label: throwLabelHtml });
    }

    // 3. Divine Shout
    if (isSkillEnabled(cfg.enableDivineShout, cfg.enableShout, true)) {
      const shoutMax = cfg.shoutCooldown || 1000;
      const shoutTimer = f.shoutCooldown !== undefined ? f.shoutCooldown : shoutMax;
      let shoutPct = 0;
      if (f.isShouting) {
        shoutPct = 0;
      } else {
        shoutPct = Math.max(0, Math.min(100, (1 - (shoutTimer / shoutMax)) * 100));
      }
      skills.push({ id: 'shout', pct: shoutPct, ready: shoutPct >= 99, color: themeColor, label: 'DIVINE SHOUT' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // SAITAMA (One Punch Man)
  // ─────────────────────────────────────────────
  if (f.characterId === 'saitama' || f.type === 'saitama') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.saitama) ? CONFIG.saitama : {};
    const themeColor = cfg.hudSkillBarColor || cfg.themeColor || cfg.color || f.color || '#F5C400';
    const isFlurryEnabled = cfg.disableConsecutivePunches !== true && cfg.disableFlurry !== true && isSkillEnabled(cfg.enableConsecutivePunches, cfg.enableFlurry, cfg.consecutivePunchesEnabled, cfg.flurryEnabled, true);
    const isPunchEnabled = cfg.disableNormalPunch !== true && isSkillEnabled(cfg.enableNormalPunch, cfg.enablePunch, cfg.normalPunchEnabled, cfg.punchEnabled, true);
    const isPunishEnabled = cfg.disableSkillPunish !== true && isSkillEnabled(cfg.enableSeriousPunch, cfg.enableSkillPunish, cfg.skillPunishEnabled, cfg.enablePunish, true);

    const list = [];
    if (isPunchEnabled) {
      const punchMax = cfg.punchCooldown || 500;
      const punchTimer = f.punchCooldownTimer !== undefined ? f.punchCooldownTimer : 0;
      const punchPct = Math.max(0, Math.min(100, (1 - (punchTimer / punchMax)) * 100));
      const punchReady = punchPct >= 99;
      list.push({ id: 'punch', pct: punchPct, ready: punchReady, color: themeColor, label: 'NORMAL PUNCH' });
    }
    if (isPunishEnabled) {
      const punishMax = cfg.skillPunishCooldown || 2000;
      const punishTimer = f.skillPunishCooldown !== undefined ? f.skillPunishCooldown : punishMax;
      const isExecuting = Boolean((f._counterPunchTimer && f._counterPunchTimer > 0) || (f._postCounterRecoveryTimer && f._postCounterRecoveryTimer > 0) || f.isCountering);
      const punishPct = isExecuting ? 100 : Math.max(0, Math.min(100, (1 - (punishTimer / punishMax)) * 100));
      list.push({ id: 'punish', pct: punishPct, ready: punishPct >= 99, color: themeColor, label: 'SERIOUS PUNCH' });
    }
    if (isFlurryEnabled) {
      const flurryMax = cfg.flurryCooldown || 540;
      const flurryTimer = f.flurryCooldown !== undefined ? f.flurryCooldown : flurryMax;
      const flurryPct = f.isFlurrying ? 100 : Math.max(0, Math.min(100, (1 - (flurryTimer / flurryMax)) * 100));
      list.push({ id: 'flurry', pct: flurryPct, ready: flurryPct >= 99, color: themeColor, label: 'CONSECUTIVE PUNCHES' });
    }
    return list;
  }

  // ─────────────────────────────────────────────
  // LAYLA (Energy Gunner)
  // ─────────────────────────────────────────────
  if (f.characterId === 'layla' || f.type === 'layla') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.layla) ? CONFIG.layla : {};
    const themeColor = '#00E5FF'; 
    const skills = [];

    if (isSkillEnabled(cfg.enableMaleficBomb, true)) {
      const bombMax = cfg.maleficBombCooldown || 200;
      const bombTimer = f.maleficBombCooldown !== undefined ? f.maleficBombCooldown : bombMax;
      const bombPct = Math.max(0, Math.min(100, (1 - (bombTimer / bombMax)) * 100));
      skills.push({ id: 'bomb', pct: bombPct, ready: bombPct >= 99, color: themeColor, label: 'MALEFIC BOMB' });
    }

    if (isSkillEnabled(cfg.enableVoidProjectile, cfg.enableVoidDash, true)) {
      const dashMax = cfg.voidDashCooldown || 120;
      const dashTimer = f.voidDashCooldown !== undefined ? f.voidDashCooldown : dashMax;
      const dashPct = Math.max(0, Math.min(100, (1 - (dashTimer / dashMax)) * 100));
      skills.push({ id: 'dash', pct: dashPct, ready: dashPct >= 99, color: themeColor, label: 'VOID PROJECTILE' });
    }

    if (isSkillEnabled(cfg.enableDestructionRush, cfg.enableDestructionBarrage, cfg.enableUltimate, true)) {
      const ultMax = cfg.ultimateCooldown || 600;
      const ultTimer = f.destructionBarrageCooldown !== undefined ? f.destructionBarrageCooldown : ultMax;
      let ultPct;
      if (f.isUltimateCharging || f.isUltimateFiring) {
        ultPct = 0;
      } else {
        ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      }
      skills.push({ id: 'ult', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: 'DESTRUCTION RUSH' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // AOI TODO (Boogie Woogie)
  // ─────────────────────────────────────────────
  if (f.characterId === 'todo' || f.type === 'todo') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.todo) ? CONFIG.todo : {};
    const themeColor = f.color || '#eab308';
    const skills = [];

    if (isSkillEnabled(cfg.enableBoogieWoogie, true)) {
      const isUltActive = Boolean(f.isTakadaUltActive);
      const cdMult = isUltActive ? (cfg.takadaClapCooldownMult ?? 0.5) : 1.0;
      const clapMax = Math.round((cfg.clapCooldown || 120) * cdMult);
      const clapTimer = f.boogieWoogieCooldown !== undefined ? f.boogieWoogieCooldown : clapMax;
      const clapPct = Math.max(0, Math.min(100, (1 - (clapTimer / clapMax)) * 100));
      skills.push({ id: 'clap', pct: clapPct, ready: clapPct >= 99, color: themeColor, label: 'BOOGIE WOOGIE' });
    }

    if (isSkillEnabled(cfg.enableCursedRock, true)) {
      const hasTeammate = checkHasTeammate(f);
      const rockMax = cfg.rockCooldown || 180;
      const rockTimer = f.rockThrowCooldown !== undefined ? f.rockThrowCooldown : rockMax;
      const rockPct = hasTeammate ? 0 : Math.max(0, Math.min(100, (1 - (rockTimer / rockMax)) * 100));
      const rockReady = !hasTeammate && rockPct >= 99;
      const rockLabel = hasTeammate ? 'CURSED ROCK (SOLO)' : 'CURSED ROCK';
      skills.push({ id: 'rock', pct: rockPct, ready: rockReady, color: themeColor, label: rockLabel });
    }

    if (isSkillEnabled(cfg.enableTakadaUltimate, cfg.enableTakadaUlt, true)) {
      const hpThreshold = cfg.hpThresholdUltTrigger ?? 0.70;
      const hpRatio = (f.maxHp && f.maxHp > 0) ? (f.hp / f.maxHp) : 1.0;
      let ultPct = 0;
      let ultReady = false;

      if (f.isTakadaUltActive) {
        f._maxTakadaUltPct = 0;
        const remaining = f.takadaUltTimer || 0;
        const dur = cfg.ultDuration ?? 5000;
        ultPct = Math.max(0, Math.min(100, (remaining / dur) * 100));
        ultReady = remaining > 0;
      } else if (f.isTakadaChanneling) {
        ultPct = 100;
        ultReady = true;
      } else if (f.hasUsedTakadaUlt || f.hasTriggeredTakadaHpUlt) {
        ultPct = 0;
        ultReady = false;
      } else {
        const rawPct = Math.max(0, Math.min(100, ((1.0 - hpRatio) / (1.0 - hpThreshold)) * 100));
        f._maxTakadaUltPct = Math.max(f._maxTakadaUltPct || 0, rawPct);
        ultPct = Math.round(f._maxTakadaUltPct);
        ultReady = ultPct >= 99 || hpRatio <= hpThreshold;
      }
      skills.push({ id: 'takada', pct: ultPct, ready: ultReady, color: themeColor, label: 'IDOL MOTIVATION' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // YUJI ITADORI (Vessel & Divergent Fist)
  // ─────────────────────────────────────────────
  if (f.characterId === 'yuji' || f.type === 'yuji') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.yuji) ? CONFIG.yuji : {};
    const themeColor = f.color || cfg.themeColor || '#D95C7E';
    const skills = [];

    if (isSkillEnabled(cfg.enableDivergentDash, true)) {
      const dashMax = cfg.divergentDashCooldown || 240;
      const dashPct = Math.max(0, Math.min(100, (1 - (f.divergentDashCooldown || 0) / dashMax) * 100));
      const dashReady = (f.divergentDashCooldown || 0) <= 0;
      skills.push({ id: 'dash', pct: dashPct, ready: dashReady, color: themeColor, label: 'DIVERGENT DASH' });
    }

    if (isSkillEnabled(cfg.enableBlackFlash, true)) {
      const bfThreshold = f.soulSwapActive 
        ? (cfg.soulSwapBlackFlashThreshold || 2)
        : (f.blackFlashThreshold || cfg.blackFlashThreshold || 4);
      const bfThresholdPct = Math.max(0, Math.min(100, ((f.blackFlashCharge || 0) / bfThreshold) * 100));
      skills.push({ id: 'bf_threshold', pct: bfThresholdPct, ready: bfThresholdPct >= 99, color: themeColor, label: 'BLACK FLASH CHARGE' });
    }

    if (isSkillEnabled(cfg.enableSoulSwap, true)) {
      let ultPct = 0;
      let ultReady = false;

      if (f.soulSwapActive) {
        const ultDuration = cfg.soulSwapDuration || 800;
        ultPct = Math.max(0, Math.min(100, ((f.soulSwapTimer || 0) / ultDuration) * 100));
      } else if (f.hasSoulSwapped) {
        ultPct = 0;
      } else {
        const ultThresholdHp = cfg.soulSwapHpThreshold || 0.30;
        ultPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - ultThresholdHp)) * 100));
        ultReady = ultPct >= 99 && (f.hp / f.maxHp <= ultThresholdHp);
      }
      skills.push({ id: 'ult', pct: ultPct, ready: ultReady, color: themeColor, label: 'SOUL SWAP' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // MAHITO (Idle Transfiguration)
  // ─────────────────────────────────────────────
  if (f.characterId === 'mahito' || f.type === 'mahito') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.mahito) ? CONFIG.mahito : {};
    const themeColor = f.color || '#C026D3';
    const skills = [];

    if (isSkillEnabled(cfg.enableIdleTransfiguration, cfg.fleshSurge?.enableFleshSurge, true)) {
      const maxSkillCd = cfg.sharedSkillCooldown || cfg.fleshSurge?.cooldown || 300;
      const skillCd = Math.max(
        f.sharedSkillCooldown !== undefined ? f.sharedSkillCooldown : 0,
        f.fleshSurgeCooldown || 0,
        f.maceCannonCooldown || 0,
        f.twinScissorCooldown || 0
      );
      const skillPct = Math.max(0, Math.min(100, (1 - (skillCd / maxSkillCd)) * 100));
      const skillReady = skillPct >= 99;
      skills.push({ id: 'idle_transfiguration', pct: skillPct, ready: skillReady, color: themeColor, label: 'IDLE TRANSFIGURATION' });
    }

    if (isSkillEnabled(cfg.enableSoulMultiplicity, true)) {
      const maxMultiplicityCd = cfg.soulMultiplicity?.cooldown || 1000;
      const multiplicityCd = f.soulMultiplicityCooldown !== undefined ? f.soulMultiplicityCooldown : 0;
      const multiplicityPct = Math.max(0, Math.min(100, (1 - (multiplicityCd / maxMultiplicityCd)) * 100));
      const multiplicityReady = multiplicityPct >= 99;
      skills.push({ id: 'soul_multiplicity', pct: multiplicityPct, ready: multiplicityReady, color: themeColor, label: 'SOUL MULTIPLICITY' });
    }

    if (isSkillEnabled(cfg.enableDomainExpansion, cfg.enableDomain, true)) {
      const domainMax = cfg.domainExpansion?.cooldown || 2000;
      const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
      let domainPct;
      let domainReady = false;
      let domainLabel = 'SELF-EMBODIMENT OF PERFECTION';

      if (f.isChannelingDomainExpansion) {
        domainPct = 100;
        domainReady = true;
        domainLabel = 'SELF-EMBODIMENT OF PERFECTION';
      } else if (f.domainActive) {
        const domainDuration = cfg.domainExpansion?.duration || 600;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
        domainReady = true;
        domainLabel = 'SELF-EMBODIMENT OF PERFECTION';
      } else {
        domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
        domainReady = domainPct >= 99;
      }
      skills.push({ id: 'domain_expansion', pct: domainPct, ready: domainReady, color: themeColor, label: domainLabel });
    }

    if (isSkillEnabled(cfg.enableEvasion, cfg.enableSoulEvasion, true)) {
      let evasionPct = 0;
      let evasionReady = false;
      const evasionLabel = 'SOUL EVASION';
      const evasionThreshold = cfg.evasion?.threshold || 0.75;

      if (f.isEvading) {
        const maxDuration = cfg.evasion?.duration || 300;
        evasionPct = Math.max(0, Math.min(100, ((f.evasionTimer || 0) / maxDuration) * 100));
        evasionReady = false;
      } else if (!f.hasTriggeredEvasion) {
        const currentHpRatio = f.maxHp > 0 ? Math.max(0, f.hp / f.maxHp) : 0;
        const lostHpRatio = 1 - currentHpRatio;
        const requiredLostRatio = 1 - evasionThreshold;
        evasionPct = Math.max(0, Math.min(100, (lostHpRatio / requiredLostRatio) * 100));
        evasionReady = currentHpRatio <= evasionThreshold;
      } else {
        evasionPct = 0;
        evasionReady = false;
      }
      skills.push({ id: 'soul_evasion', pct: evasionPct, ready: evasionReady, color: themeColor, label: evasionLabel });
    }

    if (isSkillEnabled(cfg.transformation?.enabled, cfg.enableTransformation, false)) {
      let formPct = 0;
      let formReady = false;
      let formLabel = 'DISTORTED KILLING';

      if (f.isTransformed) {
        const maxDuration = cfg.transformation?.duration || 600;
        formPct = Math.max(0, Math.min(100, ((f.transformDuration || 0) / maxDuration) * 100));
        formReady = true;
        formLabel = 'ACTIVE FORM';
      } else {
        const maxCd = cfg.transformation?.cooldown || 1200;
        const currentCd = f.transformCooldown !== undefined ? f.transformCooldown : 0;
        formPct = Math.max(0, Math.min(100, (1 - (currentCd / maxCd)) * 100));
        formReady = formPct >= 99;
      }
      skills.push({ id: 'isbodk', pct: formPct, ready: formReady, color: themeColor, label: formLabel });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // KENTO NANAMI (7:3 Ratio Sorcerer)
  // ─────────────────────────────────────────────
  if (f.characterId === 'nanami' || f.type === 'nanami') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nanami) ? CONFIG.nanami : {};
    const themeColor = f.color || '#D4AF37';
    const skills = [];

    // Skill 1: Decisive Strike (Ratio Lunge)
    if (isSkillEnabled(cfg.enableLunge, true)) {
      const baseLungeMax = f.lungeCooldownMax || cfg.lungeCooldown || 200;
      const lungeTimer = f.lungeCooldown !== undefined ? f.lungeCooldown : 0;
      let lungePct = 0;
      let lungeReady = false;

      if (f.isLunging) {
        const lungeDuration = f.lungeMaxTimer || cfg.lungeDuration || 16;
        const remainingLunge = f.lungeTimer !== undefined ? f.lungeTimer : 0;
        lungePct = Math.max(0, Math.min(100, (1 - (remainingLunge / lungeDuration)) * 100));
        lungeReady = true;
      } else if (f.ratioHitPauseTimer && f.ratioHitPauseTimer > 0) {
        lungePct = 100;
        lungeReady = true;
      } else {
        const refundMult = cfg.lungeCooldownRefundMultiplier || 0.50;
        const isRefunded = (lungeTimer <= Math.round(baseLungeMax * refundMult) && lungeTimer > 0 && f.isOvertimeActive);
        const effectiveMax = isRefunded ? Math.round(baseLungeMax * refundMult) : baseLungeMax;

        lungePct = Math.max(0, Math.min(100, (1 - (lungeTimer / effectiveMax)) * 100));
        lungeReady = lungePct >= 99;
      }
      skills.push({ id: 'lunge', pct: lungePct, ready: lungeReady, color: themeColor, label: 'DECISIVE STRIKE' });
    }

    // Skill 2: Collapse (Falling Rubble)
    if (isSkillEnabled(cfg.enableCollapse, false)) {
      const collapseMax = f.collapseCooldownMax || cfg.collapseCooldown || 600;
      const collapseTimer = f.collapseCooldown !== undefined ? f.collapseCooldown : 0;
      const collapsePct = Math.max(0, Math.min(100, (1 - (collapseTimer / collapseMax)) * 100));
      skills.push({ id: 'collapse', pct: collapsePct, ready: collapsePct >= 99, color: themeColor, label: 'COLLAPSE' });
    }

    // Ultimate: 4-Fold Black Flash Blitz
    if (isSkillEnabled(cfg.enableBlackFlash, cfg.enableUltimate, false)) {
      const ultMax = f.ultimateCooldownMax || cfg.ultimateCooldown || 2000;
      const ultTimer = f.ultimateCooldown !== undefined ? f.ultimateCooldown : ultMax;
      const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      skills.push({ id: 'blitz', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: '4-FOLD BLACK FLASH' });
    }

    // Overtime Passive Gauge
    if (isSkillEnabled(cfg.enableOvertime, true)) {
      let overtimePct = 0;
      let overtimeReady = f.isOvertimeActive;
      let overtimeLabel = f.isOvertimeActive ? 'OVERTIME (120%)' : 'WORK SHIFT (85%)';

      if (f.isOvertimeActive) {
        overtimePct = 100;
        overtimeReady = true;
      } else {
        const elapsed = f.roundElapsedFrames || 0;
        const targetFrames = (cfg.overtimeThresholdSeconds || 25) * 60;
        overtimePct = Math.max(0, Math.min(100, (elapsed / targetFrames) * 100));
        overtimeReady = overtimePct >= 99;
      }
      skills.push({ id: 'overtime', pct: overtimePct, ready: overtimeReady, color: themeColor, label: overtimeLabel });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // NOBARA KUGISAKI (Straw Doll Technique)
  // ─────────────────────────────────────────────
  if (f.characterId === 'nobara' || f.type === 'nobara') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nobara) ? CONFIG.nobara : {};
    const themeColor = f.color || '#D94E68';
    const skills = [];

    // Skill 1: Hairpin (Kanzashi)
    if (isSkillEnabled(cfg.enableHairpin, true)) {
      const hairpinMax = f.hairpinCooldownMax || cfg.hairpinCooldown || 330;
      const hairpinTimer = f.hairpinCooldown !== undefined ? f.hairpinCooldown : 0;
      const hairpinPct = Math.max(0, Math.min(100, (1 - (hairpinTimer / hairpinMax)) * 100));
      skills.push({ id: 'hairpin', pct: hairpinPct, ready: hairpinPct >= 99, color: themeColor, label: 'KANZASHI (HAIRPIN)' });
    }

    // Skill 2: Straw Doll Technique: Resonance (Tomonari)
    if (isSkillEnabled(cfg.enableResonance, true)) {
      const resonanceMax = f.resonanceCooldownMax || cfg.resonanceCooldown || 600;
      const resonanceTimer = f.resonanceCooldown !== undefined ? f.resonanceCooldown : 0;
      let resonancePct = Math.max(0, Math.min(100, (1 - (resonanceTimer / resonanceMax)) * 100));
      if (f.isResonating) resonancePct = 100;
      skills.push({ id: 'resonance', pct: resonancePct, ready: resonancePct >= 99, color: themeColor, label: 'RESONANCE' });
    }

    // Ultimate: Black Flash: Supreme Resonance
    if (isSkillEnabled(cfg.enableUltimate, cfg.enableBlackFlash, true)) {
      const ultMax = f.ultimateCooldownMax || cfg.ultimateCooldown || 1920;
      const ultTimer = f.ultimateCooldown !== undefined ? f.ultimateCooldown : ultMax;
      let ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      if (f.isBlitzing) ultPct = 100;
      skills.push({ id: 'blitz', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: 'BLACK FLASH' });
    }

    // Passive Gauge: Unflinching Ecstasy
    if (isSkillEnabled(cfg.enableEcstasy, true)) {
      const isEcstasy = Boolean(f.isEcstasyActive || ((f.hp / (f.maxHp || 400)) <= 0.50));
      const ecstasyPct = isEcstasy ? 100 : Math.max(0, Math.min(100, (1 - (f.hp / (f.maxHp || 400))) * 200));
      const ecstasyLabel = isEcstasy ? 'ECSTASY (ACTIVE)' : 'BATTLE FOCUS';
      skills.push({ id: 'ecstasy', pct: ecstasyPct, ready: isEcstasy, color: themeColor, label: ecstasyLabel });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // MAKIMA (Control Devil)
  // ─────────────────────────────────────────────
  if (f.characterId === 'makima' || f.type === 'makima') {
    const mcfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    const themeColor = mcfg.hudSkillBarColor || mcfg.themeColor || f.color || '#A31D24';
    const skills = [];

    // 1. Primary: "Bang!"
    const enableBang = isSkillEnabled(mcfg.enableBang, mcfg.bangEnabled, true);
    if (enableBang) {
      const bangMax = f.bangCooldownMax || mcfg.bangCooldown || 200;
      const bangTimer = f.bangCooldown !== undefined ? f.bangCooldown : 0;
      const bangPct = Math.max(0, Math.min(100, (1 - (bangTimer / bangMax)) * 100));
      const bangReady = bangPct >= 99;
      skills.push({
        id: 'bang',
        pct: bangPct,
        ready: bangReady,
        color: themeColor,
        label: 'BANG!'
      });
    }

    // 2. Skill 1: Chains of Domination (Shihai no Kusari)
    const enableSkill1 = isSkillEnabled(mcfg.enableSkill1, mcfg.enableChains, mcfg.enableChainsOfDomination, true);
    if (enableSkill1) {
      if (f.isPreparingChain) {
        const windupMax = f.chainWindupMax || mcfg.chainsWindupFrames || 14;
        const curTimer = f.chainWindupTimer !== undefined ? f.chainWindupTimer : 0;
        const windupPct = Math.max(0, Math.min(100, (curTimer / windupMax) * 100));
        skills.push({
          id: 'chains',
          pct: windupPct,
          ready: false,
          color: themeColor,
          label: 'CHAINS OF DOMINATION'
        });
      } else if (f.isThrowingChain && !f.isChainingActive) {
        const throwMax = f.chainThrowAnimMax || 22;
        const curTimer = f.chainThrowAnimTimer !== undefined ? f.chainThrowAnimTimer : 0;
        const throwPct = Math.max(0, Math.min(100, (curTimer / throwMax) * 100));
        skills.push({
          id: 'chains',
          pct: throwPct,
          ready: false,
          color: themeColor,
          label: 'CHAINS OF DOMINATION'
        });
      } else if (f.isChainingActive) {
        const chainMax = f.chainMaxTimer || mcfg.chainsDuration || mcfg.chainsDurationFrames || mcfg.chainsStasisFrames || 240;
        const chainCur = f.chainTimer !== undefined ? f.chainTimer : 0;
        const chainPct = Math.max(0, Math.min(100, (chainCur / chainMax) * 100));
        skills.push({
          id: 'chains',
          pct: chainPct,
          ready: false,
          color: themeColor,
          label: 'CHAINS OF DOMINATION'
        });
      } else {
        const chainsMax = f.chainsCooldownMax || mcfg.chainsCooldown || 500;
        const chainsTimer = f.chainsCooldown !== undefined ? f.chainsCooldown : 0;
        const chainsPct = Math.max(0, Math.min(100, (1 - (chainsTimer / chainsMax)) * 100));
        const chainsReady = chainsPct >= 99;
        skills.push({
          id: 'chains',
          pct: chainsPct,
          ready: chainsReady,
          color: themeColor,
          label: 'CHAINS OF DOMINATION'
        });
      }
    }

    // 3. Passive: Prime Minister Contract (Citizen Lives)
    const enablePassive = isSkillEnabled(mcfg.enableCitizenContract, mcfg.enablePassive, true);
    if (enablePassive) {
      const livesMax = f.citizenLivesMax || mcfg.maxCitizenLives || 3;
      const livesCur = f.citizenLives !== undefined ? f.citizenLives : livesMax;
      const livesText = livesCur === 1 ? '1 LIFE' : `${livesCur} LIVES`;
      const contractLabel = livesCur > 0 ? `CONTRACT - ${livesText}` : 'CONTRACT - 0 LIVES';

      if (f.isRevivingFromContract || f.isShatterReviving) {
        const reviveMax = f.reviveStasisMax || mcfg.citizenReviveDurationFrames || 75;
        const reviveElapsed = Math.max(0, reviveMax - (f.reviveStasisTimer || 0));
        const revivePct = Math.max(0, Math.min(100, (reviveElapsed / reviveMax) * 100));
        skills.push({
          id: 'contract',
          pct: revivePct,
          ready: false,
          color: themeColor,
          label: contractLabel
        });
      } else {
        const livesPct = Math.max(0, Math.min(100, (livesCur / livesMax) * 100));
        skills.push({
          id: 'contract',
          pct: livesPct,
          ready: livesCur > 0,
          color: themeColor,
          label: contractLabel
        });
      }
    }

    // 4. Skill 2: Angel's Armory (1000-Year Holy Spear)
    const enableSkill2 = isSkillEnabled(mcfg.enableSkill2, mcfg.enableAngel, mcfg.enableAngelArmory, mcfg.enableThousandYearSpear, false);
    if (enableSkill2) {
      if (f.isSummoningSpear) {
        const spearMax = f.spearMaxTimer || mcfg.thousandYearSpearChannelFrames || 100;
        const spearCur = f.spearTimer !== undefined ? f.spearTimer : 0;
        const spearPct = Math.max(0, Math.min(100, (spearCur / spearMax) * 100));
        skills.push({
          id: 'angel',
          pct: spearPct,
          ready: false,
          color: themeColor,
          label: "ANGEL'S ARMORY"
        });
      } else {
        const angelMax = f.angelCooldownMax || mcfg.angelCooldown || 1500;
        const angelTimer = f.angelCooldown !== undefined ? f.angelCooldown : 0;
        const angelPct = Math.max(0, Math.min(100, (1 - (angelTimer / angelMax)) * 100));
        const angelReady = angelPct >= 99;
        skills.push({
          id: 'angel',
          pct: angelPct,
          ready: angelReady,
          color: themeColor,
          label: "ANGEL'S ARMORY"
        });
      }
    }

    // 5. Ultimate: Crucifixion (Drop of Dominion) / Kyoto Shrine Ritual
    const enableUlt = isSkillEnabled(mcfg.enableUltimate, mcfg.enableCrucifixion, mcfg.enableShrine, mcfg.enableShrineRitual, true);
    if (enableUlt) {
      if (f.isCrucifixionSliding || f.isExecutingCrucifixion || f.isExecutingRitual) {
        const ultMax = f.crucifixionMaxTimer || f.ritualMaxTimer || mcfg.crucifixionDurationFrames || mcfg.shrineChannelFrames || 140;
        const ultCur = (f.crucifixionTimer !== undefined && f.isExecutingCrucifixion) ? f.crucifixionTimer : (f.ritualTimer !== undefined ? f.ritualTimer : 0);
        const ultPct = f.isCrucifixionSliding ? 0 : Math.max(0, Math.min(100, (1 - (ultCur / ultMax)) * 100));
        skills.push({
          id: 'crucifixion',
          pct: ultPct,
          ready: false,
          color: themeColor,
          label: 'CRUCIFIXION'
        });
      } else {
        const ultMax = f.crucifixionCooldownMax || f.shrineCooldownMax || mcfg.crucifixionCooldown || mcfg.shrineCooldown || 1920;
        const ultTimer = (f.crucifixionCooldown !== undefined) ? f.crucifixionCooldown : (f.shrineCooldown !== undefined ? f.shrineCooldown : ultMax);
        const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
        const ultReady = ultPct >= 99;
        skills.push({
          id: 'crucifixion',
          pct: ultPct,
          ready: ultReady,
          color: themeColor,
          label: 'CRUCIFIXION'
        });
      }
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // MEGUMI FUSHIGURO (Ten Shadows Technique)
  // ─────────────────────────────────────────────
  if (f.characterId === 'megumi' || f.type === 'megumi') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.megumi) ? CONFIG.megumi : {};
    const themeColor = f.color || '#1C2D4A';
    const skills = [];

    // Skill 1: Divine Dog: Totality
    if (isSkillEnabled(cfg.enableTotality, true)) {
      const totalityMax = f.totalityCooldownMax || cfg.totalityCooldown || 420;
      const totalityTimer = f.totalityCooldown !== undefined ? f.totalityCooldown : 0;
      const totalityPct = Math.max(0, Math.min(100, (1 - (totalityTimer / totalityMax)) * 100));
      skills.push({ id: 'totality', pct: totalityPct, ready: totalityPct >= 99, color: themeColor, label: 'DIVINE DOG: TOTALITY' });
    }

    // Skill 2: Nue (Thunder Bird)
    if (isSkillEnabled(cfg.enableNue, true)) {
      const nueMax = f.nueCooldownMax || cfg.nueCooldown || 360;
      const nueTimer = f.nueCooldown !== undefined ? f.nueCooldown : 0;
      const nuePct = Math.max(0, Math.min(100, (1 - (nueTimer / nueMax)) * 100));
      skills.push({ id: 'nue', pct: nuePct, ready: nuePct >= 99, color: themeColor, label: 'NUE: THUNDER BIRD' });
    }

    // Skill 3: Shadow Sink (Evasion)
    if (isSkillEnabled(cfg.enableShadowSink, true)) {
      const sinkMax = f.shadowSinkCooldownMax || cfg.shadowSinkCooldown || 300;
      const sinkTimer = f.shadowSinkCooldown !== undefined ? f.shadowSinkCooldown : 0;
      const sinkPct = Math.max(0, Math.min(100, (1 - (sinkTimer / sinkMax)) * 100));
      skills.push({ id: 'shadow', pct: sinkPct, ready: sinkPct >= 99, color: themeColor, label: 'SHADOW SINK' });
    }

    // Domain Expansion / Desperation Mahoraga Ritual
    if (isSkillEnabled(cfg.enableDomainExpansion, cfg.enableDomain, cfg.enableMahoragaRitual, true)) {
      const isDesperation = (f.hp / (f.maxHp || 380)) <= (cfg.mahoragaThresholdHpPercent || 0.20);
      const domainLabel = isDesperation ? 'SUMMON MAHORAGA' : 'CHIMERA SHADOW GARDEN';
      const domainPct = f.domainActive ? 100 : (isDesperation ? 100 : Math.max(0, Math.min(100, (1 - (f.hp / (f.maxHp || 380))) * 100)));
      skills.push({ id: 'domain', pct: domainPct, ready: domainPct >= 99, color: themeColor, label: domainLabel });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // GENOS (Demon Cyborg)
  // ─────────────────────────────────────────────
  if (f.characterId === 'genos' || f.type === 'genos') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.genos) ? CONFIG.genos : {};
    const themeColor = cfg.themeColor || cfg.color || f.color || '#FF5500';
    const isSelfDestructing = Boolean(f.isSelfDestructing || (f.selfDestructTimer && f.selfDestructTimer > 0));
    const skills = [];

    // Heat Ammo
    if (isSkillEnabled(cfg.enableBlast, cfg.enableHeatAmmo, true)) {
      const maxAmmo = f.maxHeatAmmo || cfg.maxHeatAmmo || 20;
      const currentAmmo = f.heatAmmo !== undefined ? f.heatAmmo : maxAmmo;
      let ammoPct = 0;
      let ammoReady = false;
      let ammoLabel = 'HEAT AMMO';
      if (f.ammoReloadTimer > 0) {
        const reloadMax = f.ammoReloadMax || cfg.ammoReloadFrames || 300;
        ammoPct = Math.max(0, Math.min(100, (1 - (f.ammoReloadTimer / reloadMax)) * 100));
        ammoReady = false;
        ammoLabel = 'RELOADING AMMO...';
      } else {
        ammoPct = Math.max(0, Math.min(100, (currentAmmo / maxAmmo) * 100));
        ammoReady = currentAmmo > 0;
      }
      skills.push({ id: 'ammo', pct: ammoPct, ready: ammoReady, color: themeColor, label: ammoLabel });
    }

    // Machine Gun Blows (Flurry)
    if (isSkillEnabled(cfg.enableFlurry, cfg.enableMachineGunBlows, true)) {
      const flurryMax = cfg.flurryCooldown || 480;
      const flurryTimer = f.flurryCooldown !== undefined ? f.flurryCooldown : 0;
      const flurryPct = Math.max(0, Math.min(100, (1 - (flurryTimer / flurryMax)) * 100));
      skills.push({ id: 'flurry', pct: flurryPct, ready: flurryPct >= 99, color: themeColor, label: 'MACHINE GUN BLOWS' });
    }

    // Incineration Cannon (Ultimate)
    if (isSkillEnabled(cfg.enableUltimate, cfg.enableIncinerationCannon, true)) {
      const ultMax = cfg.ultCooldown || 1680;
      const ultTimer = f.ultCooldown !== undefined ? f.ultCooldown : 0;
      const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      skills.push({ id: 'ult', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: 'INCINERATION CANNON' });
    }

    // Self-Destruct (Core Overdrive)
    if (isSkillEnabled(cfg.enableSelfDestruct, true)) {
      let sdPct = 0;
      let sdReady = false;
      let sdLabel = 'SELF DESTRUCT';

      if (f.isSelfDestructing) {
        const sdMax = cfg.selfDestructCountdownFrames || 150;
        const remaining = f.selfDestructTimer || 0;
        sdPct = Math.max(0, Math.min(100, (remaining / sdMax) * 100));
        sdReady = true;
        sdLabel = 'OVERLOAD DETONATING...';
      } else if (f.usedSelfDestruct) {
        sdPct = 0;
        sdReady = false;
        sdLabel = 'OVERLOAD USED';
      } else {
        const threshold = cfg.selfDestructHpThreshold ?? cfg.selfDestructThreshold ?? 0.10;
        const currentHpRatio = f.hp / f.maxHp;
        if (currentHpRatio <= threshold) {
          sdPct = 100;
          sdReady = true;
          sdLabel = 'SELF DESTRUCT READY';
        } else {
          sdPct = Math.max(0, Math.min(100, ((1 - currentHpRatio) / (1 - threshold)) * 100));
          sdReady = false;
          sdLabel = 'SELF DESTRUCT';
        }
      }
      skills.push({ id: 'selfdestruct', pct: sdPct, ready: sdReady, color: themeColor, label: sdLabel });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // CRONOS (Time Manipulation)
  // ─────────────────────────────────────────────
  if (f.characterId === 'cronos' || f.type === 'cronos') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.cronos) ? CONFIG.cronos : {};
    if (!isSkillEnabled(cfg.enableTimeSphere, cfg.enableSphere, true)) return [];
    const themeColor = f.color || '#00e5ff';
    const sphereMax = cfg.sphereCooldown || 1200;
    const sphereTimer = f.sphereCooldown !== undefined ? f.sphereCooldown : sphereMax;
    const spherePct = Math.max(0, Math.min(100, (1 - (sphereTimer / sphereMax)) * 100));
    return [{ id: 'sphere', pct: spherePct, ready: spherePct >= 99, color: themeColor, label: 'TIME SPHERE' }];
  }

  // ─────────────────────────────────────────────
  // MUSASHI (Blade Master)
  // ─────────────────────────────────────────────
  if (f.characterId === 'musashi' || f.type === 'musashi') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.musashi) ? CONFIG.musashi : {};
    if (!isSkillEnabled(cfg.enableNitenIchiryu, cfg.enableFlurry, true)) return [];
    const themeColor = f.color || '#3cb371';
    const flurryMax = cfg.flurryCooldown || 900;
    const flurryTimer = f.flurryCooldown !== undefined ? f.flurryCooldown : flurryMax;
    const flurryPct = Math.max(0, Math.min(100, (1 - (flurryTimer / flurryMax)) * 100));
    return [{ id: 'flurry', pct: flurryPct, ready: flurryPct >= 99, color: themeColor, label: 'NITEN ICHIRYU FLURRY' }];
  }

  // ─────────────────────────────────────────────
  // YUTA OKKOTSU (Special Grade Sorcerer)
  // ─────────────────────────────────────────────
  if (f.characterId === 'yuta' || f.type === 'yuta') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.yuta) ? CONFIG.yuta : {};
    const themeColor = '#ff69b4';
    const skills = [];
    const rk = f.rika;
    const hasTeammate = checkHasTeammate(f);

    // 1. Rika Summon
    if (!hasTeammate && isSkillEnabled(cfg.enableRika, true)) {
      let rikaPct = 0;
      const alreadySummoned = rk && rk.hasSummonedAt50Hp;

      if (rk && rk.active && !rk.isDying) {
        const maxHp = rk.maxHp || cfg.rikaMaxHp || 500;
        rikaPct = Math.max(0, Math.min(100, (rk.hp / maxHp) * 100));
        f._maxRikaPct = 0;
      } else if (f.rikaCallTimer > 0 || (rk && rk.chargeTimer > 0)) {
        rikaPct = 100;
        f._maxRikaPct = 100;
      } else if (alreadySummoned) {
        const baseline = f.rikaRechargeHpBaseline !== undefined ? f.rikaRechargeHpBaseline : f.hp;
        const reqDamage = (f.maxHp || 200) * (cfg.rikaRechargeHpRatio ?? 0.20);
        const damageTaken = Math.max(0, baseline - f.hp);
        rikaPct = Math.max(0, Math.min(100, (damageTaken / reqDamage) * 100));
      } else {
        const threshold = cfg.rikaSummonHpThreshold ?? 0.60;
        const rawPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - threshold)) * 100));
        f._maxRikaPct = Math.max(f._maxRikaPct || 0, rawPct);
        rikaPct = f._maxRikaPct;
      }

      const isBeamActive = f.isChannelingPureLoveBeam || f.isFiringPureLoveBeam || (f.rikaEmergingForBeamTimer || 0) > 0;
      if (typeof f._smoothRikaPct !== 'number' || Math.abs(f._smoothRikaPct - rikaPct) > 30 || f.rikaCallTimer > 0 || isBeamActive) {
        f._smoothRikaPct = rikaPct;
      } else {
        f._smoothRikaPct += (rikaPct - f._smoothRikaPct) * 0.15;
      }
      rikaPct = Math.max(0, Math.min(100, f._smoothRikaPct));
      skills.push({ id: 'rika', pct: rikaPct, ready: rikaPct >= 99 && (!rk || !rk.active), color: themeColor, label: 'RIKA SUMMON' });
    }

    // 2. Domain Expansion: Authentic Mutual Love
    if (isSkillEnabled(cfg.enableDomain, true)) {
      const domainHpThreshold = cfg.domainHpThreshold ?? 0.60;
      let domainPct;
      if (f.isChannelingDomain) {
        domainPct = 100;
      } else if (f.domainActive) {
        const domainDuration = cfg.domainDuration || 500;
        const remaining = f.domainTimer || 0;
        domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      } else if (f.domainUseCount === 0) {
        domainPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - domainHpThreshold)) * 100));
      } else if (f.domainUseCount === 1) {
        const hpNeeded = (f.maxHp || 200) * (cfg.domain2HpDamageRequired ?? 0.75);
        const hpLost = f.domain2DamageTaken || 0;
        domainPct = Math.max(0, Math.min(100, (hpLost / hpNeeded) * 100));
      } else {
        domainPct = 0;
      }
      skills.push({ id: 'domain', pct: domainPct, ready: domainPct >= 99 && !f.domainActive, color: themeColor, label: 'AUTHENTIC MUTUAL LOVE' });
    }

    // 3. Pure Love Beam (Ultimate)
    if (isSkillEnabled(cfg.enablePureLoveBeam, true)) {
      let beamPct = 0;
      const beamCdTimer = f.pureLoveBeamCooldownTimer || 0;
      const beamCdMax = cfg.pureLoveBeamCooldown || 1200;
      if (f.isChannelingPureLoveBeam || (f.rikaEmergingForBeamTimer || 0) > 0) {
        beamPct = 100;
      } else if (f.isFiringPureLoveBeam) {
        f._maxBeamPct = 0;
        beamPct = 0;
      } else if (f.hasUsedPureLoveBeam) {
        if (beamCdTimer > 0) {
          beamPct = Math.max(0, Math.min(100, (1 - (beamCdTimer / beamCdMax)) * 100));
        } else {
          beamPct = 100;
        }
      } else if (beamCdTimer > 0) {
        beamPct = Math.max(0, Math.min(100, (1 - (beamCdTimer / beamCdMax)) * 100));
      } else {
        const beamThreshold = cfg.pureLoveBeamHpThreshold ?? 0.60;
        const rawBeamPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - beamThreshold)) * 100));
        f._maxBeamPct = Math.max(f._maxBeamPct || 0, rawBeamPct);
        beamPct = f._maxBeamPct;
      }
      skills.push({ id: 'beam', pct: beamPct, ready: beamPct >= 99 && (rk && rk.active) && beamCdTimer <= 0, color: themeColor, label: 'PURE LOVE BEAM' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // GUNSLINGER
  // ─────────────────────────────────────────────
  if (f.characterId === 'gunslinger' || f.type === 'gunslinger') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.gunslinger) ? CONFIG.gunslinger : {};
    if (!isSkillEnabled(cfg.enableRapidFire, true)) return [];
    const themeColor = f.color || '#eab308';
    let pct = 0;

    if (f.isReloading) {
      const reloadTime = cfg.reloadTime || 90;
      pct = Math.max(0, Math.min(100, (f.reloadTimer / reloadTime) * 100));
    } else {
      pct = Math.max(0, Math.min(100, (1 - (f.magazineBullets || 0) / (f.maxMagazine || 24)) * 100));
    }

    return [
      { id: 'rapidfire', pct: pct, ready: pct >= 99 && !f.isReloading, color: themeColor, label: 'RAPID FIRE' }
    ];
  }

  // ─────────────────────────────────────────────
  // LASER
  // ─────────────────────────────────────────────
  if (f.characterId === 'laser' || f.type === 'laser') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.laser) ? CONFIG.laser : {};
    if (!isSkillEnabled(cfg.enableLaserBeam, true)) return [];
    const themeColor = f.color || '#ffaa00';
    const windupMax = cfg.windupDuration || 150;
    const beamMax = cfg.beamDuration || 100;
    const cooldownMax = f.shootCooldownMax || cfg.cooldown || 300;

    let pct = 0;
    let ready = false;

    if (f.beamTimer > 0) {
      pct = Math.max(0, Math.min(100, (f.beamTimer / beamMax) * 100));
      ready = false;
    } else if (f.beamCharge > 0) {
      pct = Math.max(0, Math.min(100, (f.beamCharge / windupMax) * 100));
      ready = f.beamCharge >= windupMax;
    } else if (f.shootCooldown > 0) {
      pct = Math.max(0, Math.min(100, (1 - f.shootCooldown / cooldownMax) * 100));
      ready = false;
    } else {
      pct = 100;
      ready = true;
    }

    return [
      { id: 'laser_beam', pct: pct, ready: ready, color: themeColor, label: 'LASER BEAM' }
    ];
  }

  // ─────────────────────────────────────────────
  // ZEUS (Lord of Olympus)
  // ─────────────────────────────────────────────
  if (f.characterId === 'zeus' || f.type === 'zeus') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zeus) ? CONFIG.zeus : {};
    const themeColor = f.color || '#00BFFF';
    const skills = [];
    
    // Skill 1: Aegis Shield
    if (isSkillEnabled(cfg.enableAegisShield, true)) {
      const aegisMax = cfg.aegisCooldown || 300;
      const aegisTimer = f.aegisCooldown || 0;
      const aegisPct = Math.max(0, Math.min(100, (1 - (aegisTimer / aegisMax)) * 100));
      const aegisReady = aegisPct >= 99;
      skills.push({ id: 'aegis', pct: aegisPct, ready: aegisReady, color: themeColor, label: 'AEGIS SHIELD' });
    }

    // Ultimate: Thunder Storm
    if (isSkillEnabled(cfg.enableThunderStorm, true)) {
      const stormMax = cfg.stormCooldown || 1500;
      const stormTimer = f.stormCooldown !== undefined ? f.stormCooldown : stormMax;
      let stormPct = 0;
      let stormReady = false;

      if (f.isChargingStorm) {
        const teleMax = cfg.stormTelegraphFrames || 120;
        stormPct = Math.max(0, Math.min(100, (1 - f.stormCooldown / teleMax) * 100));
        stormReady = false;
      } else if (f.stormActive) {
        const durationMax = cfg.stormDuration || 300;
        stormPct = Math.max(0, Math.min(100, (f.stormTimer / durationMax) * 100));
        stormReady = false;
      } else {
        stormPct = Math.max(0, Math.min(100, (1 - (stormTimer / stormMax)) * 100));
        stormReady = stormPct >= 99;
      }
      skills.push({ id: 'storm', pct: stormPct, ready: stormReady, color: themeColor, label: 'ULTIMATE STORM' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // ICHIGO KUROSAKI (Substitute Soul Reaper)
  // ─────────────────────────────────────────────
  if (f.characterId === 'ichigo' || f.type === 'ichigo') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.ichigo) ? CONFIG.ichigo : {};
    const themeColor = f.color || '#FF5500';
    const curHp = f.hp !== undefined ? f.hp : (f.maxHp || 100);
    const maxHp = f.maxHp || 100;
    const hpRatio = Math.max(0, Math.min(1, curHp / maxHp));
    const skills = [];

    // Passive: Hollow Mask Awakening
    if (isSkillEnabled(cfg.enableHollowMask, true)) {
      const hollowMaxDuration = cfg.hollowMaskDuration ?? 800;
      let hollowPct = 0;
      let hollowReady = false;
      let hollowLabel = 'HOLLOW MASK';
      const isBankaiActive = Boolean(f.bankaiActive);

      if (f.hollowMaskActive) {
        const remainingTime = f.hollowMaskTimer !== undefined ? f.hollowMaskTimer : hollowMaxDuration;
        hollowPct = Math.max(0, Math.min(100, (remainingTime / hollowMaxDuration) * 100));
        hollowReady = true;
        hollowLabel = (f.hollowMaskFormationTimer > 0 || f.hollowBurstTimer > 0) ? 'AWAKENING HOLLOW...' : 'HOLLOW AWAKENED';
        f._maxHollowPct = 0;
      } else if (!isBankaiActive) {
        hollowPct = 0;
        hollowReady = false;
        hollowLabel = 'HOLLOW MASK';
        f._maxHollowPct = 0;
      } else {
        const bankaiDuration = f.bankaiDurationMax || cfg.bankaiDuration || 1000;
        const bankaiRemaining = f.bankaiTimer !== undefined ? f.bankaiTimer : bankaiDuration;
        const timeProg = Math.max(0, Math.min(1.0, 1.0 - (bankaiRemaining / bankaiDuration)));
        hollowPct = Math.max(0, Math.min(100, timeProg * 100));
        hollowReady = (bankaiRemaining <= 0 || hollowPct >= 99);
        hollowLabel = 'HOLLOW MASK';
      }
      skills.push({ id: 'hollow', pct: hollowPct, ready: hollowReady, color: themeColor, label: hollowLabel });
    }

    // Ultimate: Bankai Awakening (Tensa Zangetsu)
    if (isSkillEnabled(cfg.enableBankai, true)) {
      let ultPct = 0;
      let ultReady = false;

      if (f.isChannelingBankai) {
        ultPct = 100;
        ultReady = true;
      } else if (f.bankaiActive) {
        const bankaiDuration = cfg.bankaiDuration || 1000;
        const remaining = f.bankaiTimer !== undefined ? f.bankaiTimer : bankaiDuration;
        ultPct = Math.max(0, Math.min(100, (remaining / bankaiDuration) * 100));
        ultReady = true;
        f._maxBankaiPct = 0;
      } else if (f.bankaiUsed) {
        const cdMax = f.bankaiCooldownMax || cfg.bankaiCooldown || cfg.ultimateCooldown || 600;
        const cdTimer = f.ultimateCooldown !== undefined ? f.ultimateCooldown : 0;
        const cdPct = Math.max(0, Math.min(100, (1 - (cdTimer / cdMax)) * 100));

        const baseline = f.bankaiRechargeHpBaseline !== undefined ? f.bankaiRechargeHpBaseline : f.hp;
        const reqDamage = (f.maxHp || 240) * (cfg.bankaiRechargeHpRatio ?? 0.20);
        const damageTaken = Math.max(0, baseline - f.hp);
        const dmgPct = Math.max(0, Math.min(100, (damageTaken / reqDamage) * 100));

        const ultThreshold = cfg.ultimateThreshold ?? 0.80;
        ultPct = Math.max(cdPct, dmgPct);
        if (cdTimer <= 0 && (hpRatio <= ultThreshold || damageTaken >= reqDamage)) {
          ultPct = 100;
        }
        ultReady = (ultPct >= 99 && cdTimer <= 0) || (damageTaken >= reqDamage);
      } else {
        const ultThreshold = cfg.ultimateThreshold ?? 0.80;
        const rawPct = Math.max(0, Math.min(100, ((1.0 - hpRatio) / Math.max(0.01, (1.0 - ultThreshold))) * 100));
        f._maxBankaiPct = Math.max(f._maxBankaiPct || 0, rawPct);
        ultPct = f._maxBankaiPct;
        ultReady = hpRatio <= ultThreshold || ultPct >= 99;
      }
      skills.push({ id: 'bankai', pct: ultPct, ready: ultReady, color: themeColor, label: 'BANKAI' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // JOHN WICK (Baba Yaga)
  // ─────────────────────────────────────────────
  if (f.characterId === 'john_wick' || f.type === 'john_wick' || f.characterId === 'johnwick' || f.type === 'johnwick') {
    const cfg = (typeof CONFIG !== 'undefined' && (CONFIG.john_wick || CONFIG.johnWick)) ? (CONFIG.john_wick || CONFIG.johnWick) : {};
    const themeColor = cfg.themeColor || '#64748B'; // Tactical Gunmetal Slate
    const skills = [];

    // 1. Weapon Ammo / Reload Progress
    const isMagEnabled = isSkillEnabled(cfg.enableMagazine ?? (cfg.enablePistol || cfg.enableShotgun || cfg.enableRifle), true);
    if (isMagEnabled) {
      const maxMag = f.maxMagazine || cfg.magazineSize || 12;
      const bullets = f.magazineBullets !== undefined ? f.magazineBullets : maxMag;
      let magPct = 0;
      let magReady = false;
      let weaponName = 'PISTOL';
      if (f.currentEquippedWeapon === 'shotgun') {
        weaponName = 'SHOTGUN';
      } else if (f.currentEquippedWeapon === 'rifle') {
        weaponName = 'M4 RIFLE';
      }

      if (f.weaponSwitchTimer && f.weaponSwitchTimer > 0) {
        const swMax = f.weaponSwitchMaxTime || cfg.weaponSwitchDuration || 36;
        const swProgress = Math.max(0, Math.min(1.0, 1 - (f.weaponSwitchTimer / swMax)));
        magPct = swProgress * 100;
        magReady = false;
      } else if (f.isReloading) {
        let reloadMax = cfg.reloadTime || 75;
        if (f.currentEquippedWeapon === 'shotgun') {
          reloadMax = cfg.shotgunReloadTime || 96;
          magPct = Math.max(0, Math.min(100, (bullets / maxMag) * 100));
          magReady = false;
        } else {
          if (f.currentEquippedWeapon === 'rifle') {
            reloadMax = cfg.rifleReloadTime || 85;
          }
          const reloadProgress = Math.max(0, Math.min(1.0, 1 - (f.reloadTimer / reloadMax)));
          magPct = reloadProgress * 100;
          magReady = false;
        }
      } else {
        magPct = Math.max(0, Math.min(100, (bullets / maxMag) * 100));
        magReady = bullets > 0;
      }
      skills.push({ id: 'magazine', pct: magPct, ready: magReady, color: themeColor, label: weaponName });
    }

    // 2. Ultimate: Excommunicado
    if (isSkillEnabled(cfg.enableExcommunicado, cfg.enableUltimate, true)) {
      const maxMag = f.maxMagazine || cfg.magazineSize || 12;
      const bullets = f.magazineBullets !== undefined ? f.magazineBullets : maxMag;
      const currentWeapon = f.currentEquippedWeapon || 'pistol';
      const rollbacks = f.rollbackCount || 0;
      let ultPct = 0;
      let ultReady = false;
      let ultLabel = 'EXCOMMUNICADO';

      if (currentWeapon === 'pistol') {
        const magSpent = Math.max(0, Math.min(1.0, 1 - (bullets / maxMag)));
        const cycleProgress = (Math.min(2, rollbacks) + magSpent) / 3;
        ultPct = Math.max(0, Math.min(50, cycleProgress * 50));
        ultReady = false;
      } else if (currentWeapon === 'shotgun') {
        const magSpent = Math.max(0, Math.min(1.0, 1 - (bullets / maxMag)));
        const cycleProgress = (Math.min(2, rollbacks) + magSpent) / 3;
        ultPct = Math.max(50, Math.min(100, 50 + cycleProgress * 50));
        ultReady = ultPct >= 99;
      } else if (currentWeapon === 'rifle') {
        const currentMagRatio = Math.max(0, Math.min(1.0, bullets / maxMag));
        const completedRollbacks = Math.min(2, Math.max(0, rollbacks));
        const remainingMagazines = 2 - completedRollbacks;
        const totalRemainingRatio = (remainingMagazines + currentMagRatio) / 3;
        ultPct = Math.max(0, Math.min(100, totalRemainingRatio * 100));
        ultReady = true;
      }
      ultPct = Math.max(0, Math.min(100, ultPct));
      skills.push({ id: 'ultimate', pct: ultPct, ready: ultReady, color: themeColor, label: ultLabel });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // ENGINEER (TF2)
  // ─────────────────────────────────────────────
  if (f.characterId === 'engineer' || f.type === 'Engineer' || f.type === 'engineer' || f._def?.type === 'Engineer') {
    const cfg = (typeof CONFIG !== 'undefined' && (CONFIG.engineer || CONFIG.Engineer)) ? (CONFIG.engineer || CONFIG.Engineer) : {};
    const themeColor = f.color || '#ffcc00';
    const skills = [];

    // Sentry Turret
    if (isSkillEnabled(cfg.enableTurret, cfg.enableSentry, true)) {
      const skillMax = cfg.skillCooldown || 500;
      const hasLiveTurret = Boolean(
        f.turretEntity && f.turretEntity.hp > 0 && (!state.fighters || state.fighters.includes(f.turretEntity))
      );
      let sentryPct = 0;
      let sentryReady = false;

      if (f.isBuildingTurret) {
        const buildTime = cfg.turretBuildTime || 90;
        sentryPct = Math.max(0, Math.min(100, (1 - (f.buildTimer / buildTime)) * 100));
        sentryReady = false;
      } else if (hasLiveTurret) {
        const maxHp = f.turretEntity.maxHp || 200;
        sentryPct = Math.max(0, Math.min(100, (f.turretEntity.hp / maxHp) * 100));
        sentryReady = true;
      } else {
        const current = f.skillCooldown !== undefined ? f.skillCooldown : 0;
        sentryPct = Math.max(0, Math.min(100, (1 - (current / skillMax)) * 100));
        sentryReady = sentryPct >= 99;
      }

      let sentryLvl = 1;
      if (f.turretEntity && f.turretEntity.level) {
        sentryLvl = f.turretEntity.level;
      } else {
        sentryLvl = Math.max(1, Math.min(3, f.sentryBuildLevel || 1));
      }
      const sentryLabel = `SENTRY LVL ${sentryLvl}`;
      skills.push({ id: 'turret', pct: sentryPct, ready: sentryReady, color: themeColor, label: sentryLabel });
    }

    // Dispenser
    if (isSkillEnabled(cfg.enableDispenser, true)) {
      const hasLiveDispenser = Boolean(
        f.dispenserEntity && f.dispenserEntity.hp > 0 && (!state.fighters || state.fighters.includes(f.dispenserEntity))
      );
      let dispenserPct = 0;
      let dispenserReady = false;
      const dispenserMax = cfg.dispenserCooldown || 300;

      if (f.isBuildingDispenser) {
        const buildTime = cfg.dispenserBuildTime || 110;
        dispenserPct = Math.max(0, Math.min(100, (1 - (f.dispenserBuildTimer / buildTime)) * 100));
        dispenserReady = false;
      } else if (hasLiveDispenser) {
        const maxHp = f.dispenserEntity.maxHp || 160;
        dispenserPct = Math.max(0, Math.min(100, (f.dispenserEntity.hp / maxHp) * 100));
        dispenserReady = true;
      } else {
        const current = f.dispenserCooldown !== undefined ? f.dispenserCooldown : 0;
        dispenserPct = Math.max(0, Math.min(100, (1 - (current / dispenserMax)) * 100));
        dispenserReady = dispenserPct >= 99;
      }
      skills.push({ id: 'dispenser', pct: dispenserPct, ready: dispenserReady, color: themeColor, label: 'DISPENSER' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // CJ (Carl Johnson — GTA San Andreas)
  // ─────────────────────────────────────────────
  if (f.characterId === 'cj' || f.type === 'cj') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.cj) ? CONFIG.cj : {};
    const skillColor = cfg.skillBarColor || '#8BB5E8'; // GTA San Andreas Authentic Sky Blue Skill/Armor Bar
    const skills = [];

    // 0. RESPECT+ (Passive Progression Gauge)
    if (isSkillEnabled(cfg.enableRespectSystem, cfg.enableRespect, true)) {
      const respect = f.respect || 0;
      const maxRespect = f.maxRespect || cfg.maxRespect || 100;
      const respectPct = Math.max(0, Math.min(100, (respect / maxRespect) * 100));
      const respectReady = f.isGroveStreetOg || respect >= 50;
      const respectLabel = (f.isGroveStreetOg || respect >= 100 || f.hasTriggeredTier2) ? 'RESPECTED' : 'RESPECT+';
      skills.push({ id: 'respect', pct: respectPct, ready: respectReady, color: skillColor, label: respectLabel });
    }

    // 1. HESOYAM (Skill 1 - Pure Lost HP Progress Gauge & Instant Drain on Activation)
    if (isSkillEnabled(cfg.enableHesoyam, true)) {
      let hesoPct = 0;
      let hesoReady = false;
      const hesoLabel = 'HESOYAM';
      const hesoThreshold = cfg.hesoyamHpThreshold ?? 0.50;
      const hpRatio = (f.maxHp && f.maxHp > 0) ? (f.hp / f.maxHp) : 1.0;

      if (f.hasUsedHesoyam || (f.isTypingCheat && f.cheatCodeString === 'HESOYAM')) {
        hesoPct = 0;
        hesoReady = false;
      } else {
        const progressRatio = Math.max(0, Math.min(1.0, (1.0 - hpRatio) / (1.0 - hesoThreshold)));
        hesoPct = Math.round(progressRatio * 100);
        hesoReady = hpRatio <= hesoThreshold;
      }
      skills.push({ id: 'hesoyam', pct: hesoPct, ready: hesoReady, color: skillColor, label: hesoLabel });
    }

    // 2. ROCKETMAN Jetpack (Skill 2 - Cooldown Based)
    if (isSkillEnabled(cfg.enableJetpack, true)) {
      let jpPct = 0;
      let jpReady = false;
      const jpLabel = f.isJetpackActive ? 'ROCKETMAN (ACTIVATED)' : 'ROCKETMAN';
      if (f.isJetpackActive) {
        const jpDur = f.jetpackMaxTimer || cfg.jetpackDuration || 270;
        jpPct = Math.max(0, Math.min(100, (f.jetpackTimer / jpDur) * 100));
        jpReady = true;
      } else {
        const jpMax = f.jetpackCooldownMax || cfg.jetpackCooldown || 570;
        const jpCurrent = (f.jetpackCooldown !== undefined) ? f.jetpackCooldown : 0;
        jpPct = Math.max(0, Math.min(100, (1 - (jpCurrent / jpMax)) * 100));
        jpReady = jpPct >= 99;
      }
      skills.push({ id: 'jetpack', pct: jpPct, ready: jpReady, color: skillColor, label: jpLabel });
    }

    // 3. GROVE STREET DRIVE-BY (Skill 3 - Draining during Active Stay Duration)
    if (isSkillEnabled(cfg.enableDriveBy, true)) {
      let dbPct = 0;
      let dbReady = false;
      const dbLabel = f.isDriveByActive ? 'GROVE ST. (ACTIVE)' : 'GROVE ST.';
      if (f.isDriveByActive) {
        const stayDur = f.driveByMaxTimer || cfg.driveByStayDuration || 240;
        const currentTimer = (f.driveByTimer !== undefined) ? f.driveByTimer : stayDur;
        dbPct = Math.max(0, Math.min(100, (currentTimer / stayDur) * 100));
        dbReady = true;
      } else {
        const dbMax = f.driveByCooldownMax || cfg.driveByCooldown || 600;
        const dbCurrent = (f.driveByCooldown !== undefined) ? f.driveByCooldown : 0;
        dbPct = Math.max(0, Math.min(100, (1 - (dbCurrent / dbMax)) * 100));
        dbReady = dbPct >= 99;
      }
      skills.push({ id: 'driveby', pct: dbPct, ready: dbReady, color: skillColor, label: dbLabel });
    }

    // 4. BAGUVIX (Ultimate - Cooldown Based)
    if (isSkillEnabled(cfg.enableBaguvix, true)) {
      let ultPct = 0;
      let ultReady = false;
      const ultLabel = f.isBaguvixActive ? 'BAGUVIX - GODMODE (ACTIVATED)' : 'BAGUVIX - GODMODE';
      if (f.isBaguvixActive) {
        const bagDur = f.baguvixMaxTimer || cfg.baguvixDuration || 300;
        ultPct = Math.max(0, Math.min(100, (f.baguvixTimer / bagDur) * 100));
        ultReady = true;
      } else {
        const bagMax = f.baguvixCooldownMax || cfg.baguvixCooldown || 720;
        const bagCurrent = (f.baguvixCooldown !== undefined) ? f.baguvixCooldown : 0;
        ultPct = Math.max(0, Math.min(100, (1 - (bagCurrent / bagMax)) * 100));
        ultReady = ultPct >= 99;
      }
      skills.push({ id: 'baguvix', pct: ultPct, ready: ultReady, color: skillColor, label: ultLabel });
    }

    return skills;
  }

  // ── Tactical Force Operatives: Magazine Ammo / Reload Bar ──
  const fType = (f.characterId || f.type || (f._def && f._def.type) || '').toLowerCase();
  if (['rifle', 'm4a1', 'shotgun', 'spas12', 'spas_12', 'pistol', 'desert_eagle', 'deserteagle', 'sniper', 'awp', 'barrett', 'barrett50cal', 'tactical_commando', 'tactical_guerilla', 'tactical_breacher', 'tactical_gunslinger', 'tactical_infiltrator', 'tactical_marksman', 'tactical_barrett', 'tactical_sniper', 'tactical_heavy'].includes(fType)) {
    const tacCfg = (typeof CONFIG !== 'undefined' && (CONFIG.tactical || CONFIG.tacticalMain)) ? (CONFIG.tactical || CONFIG.tacticalMain) : {};
    if (!isSkillEnabled(tacCfg.enableMagazine, true)) return [];
    const maxMag = f.maxMagazine || 30;
    const curAmmo = f.magazineBullets !== undefined ? f.magazineBullets : maxMag;
    let ammoPct = 0;
    let label = '';
    const themeColor = f.color || '#3b82f6';

    if (f.isReloading) {
      const reloadProg = f.reloadDuration ? Math.max(0, Math.min(1, 1 - ((f.reloadTimer || 0) / f.reloadDuration))) : 0;
      ammoPct = Math.round(reloadProg * 100);
      label = `RELOADING (${ammoPct}%)`;
    } else {
      ammoPct = Math.round((curAmmo / maxMag) * 100);
      label = `MAGAZINE: ${curAmmo}/${maxMag}`;
    }

    return [
      { id: 'magazine', pct: ammoPct, ready: !f.isReloading && curAmmo > 0, color: themeColor, label: label }
    ];
  }

  // ── Uryu Ishida: The Last Quincy HUD Skill Bars ──
  if (f.characterId === 'uryu' || f.type === 'uryu' || f.characterId === 'ishida' || f.type === 'ishida') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.uryu) ? CONFIG.uryu : {};
    const themeColor = f.color || '#00E5FF';
    const skills = [];

    // Passive 1: Sklaverei Reishi Gauge
    if (isSkillEnabled(cfg.enableReishiAbsorption, true)) {
      let reishiPct = f.reishiGauge !== undefined ? f.reishiGauge : 0;
      let reishiLabel = 'SKLAVEREI GAUGE';
      let reishiReady = reishiPct >= 99;
      if (f.isPiercingLightActive) {
        const plMax = f.piercingLightMax || 360;
        reishiPct = Math.max(0, Math.min(100, ((f.piercingLightTimer || 0) / plMax) * 100));
        reishiLabel = 'PIERCING LIGHT';
        reishiReady = true;
      }
      skills.push({ id: 'sklaverei', pct: reishiPct, ready: reishiReady, color: themeColor, label: reishiLabel });
    }

    // Skill 1: Hirenkyaku
    if (isSkillEnabled(cfg.enableHirenkyaku, true)) {
      const hMax = cfg.hirenkyakuCooldown || 360;
      const hTimer = f.hirenkyakuCooldown !== undefined ? f.hirenkyakuCooldown : 0;
      const hPct = Math.max(0, Math.min(100, (1 - hTimer / hMax) * 100));
      skills.push({ id: 'hirenkyaku', pct: hPct, ready: hPct >= 99, color: themeColor, label: 'HIRENKYAKU' });
    }

    // Skill 2: Sprenger
    if (isSkillEnabled(cfg.enableSprenger, true)) {
      const sMax = cfg.sprengerCooldown || 480;
      const sTimer = f.sprengerCooldown !== undefined ? f.sprengerCooldown : 0;
      const sPct = Math.max(0, Math.min(100, (1 - sTimer / sMax) * 100));
      skills.push({ id: 'sprenger', pct: sPct, ready: sPct >= 99, color: themeColor, label: 'SPRENGER' });
    }

    // Ultimate: The Antithesis
    if (isSkillEnabled(cfg.enableAntithesis, true)) {
      const uMax = cfg.ultimateCooldown || 1200;
      const uTimer = f.ultimateCooldown !== undefined ? f.ultimateCooldown : 0;
      let uPct = Math.max(0, Math.min(100, (1 - uTimer / uMax) * 100));
      let uLabel = 'THE ANTITHESIS';
      if (f.vollstandigActive) {
        uPct = 100;
        uLabel = 'VOLLSTÄNDIG ACTIVE';
      }
      skills.push({ id: 'antithesis', pct: uPct, ready: uPct >= 99, color: themeColor, label: uLabel });
    }

    if (f.ransotengaiActive && isSkillEnabled(cfg.enableRansotengai, true)) {
      const pMax = f.ransotengaiMaxTimer || 360;
      const puppetPct = Math.max(0, Math.min(100, ((f.ransotengaiTimer || 0) / pMax) * 100));
      skills.push({ id: 'ransotengai', pct: puppetPct, ready: true, color: themeColor, label: 'RANSŌTENGAI (ACTIVE)' });
    }

    return skills;
  }

  // ── Ulquiorra Cifer: Cuatro Espada HUD Skill Bars ──
  if (f.characterId === 'ulquiorra' || f.type === 'ulquiorra') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.ulquiorra) ? CONFIG.ulquiorra : {};
    const themeColor = f.color || '#00FF88';
    const skills = [];

    // Skill 1: Sonído
    if (isSkillEnabled(cfg.enableSonido, true)) {
      const sMax = cfg.sonidoCooldown || 300;
      const sTimer = f.sonidoCooldown !== undefined ? f.sonidoCooldown : 0;
      const sPct = Math.max(0, Math.min(100, (1 - sTimer / sMax) * 100));
      skills.push({ id: 'sonido', pct: sPct, ready: sPct >= 99, color: themeColor, label: 'SONÍDO' });
    }

    // Skill 2: Cero / Cero Oscuras
    if (isSkillEnabled(cfg.enableCero, true)) {
      const cMax = cfg.ceroCooldown || 420;
      const cTimer = f.ceroCooldown !== undefined ? f.ceroCooldown : 0;
      const cPct = Math.max(0, Math.min(100, (1 - cTimer / cMax) * 100));
      const isOscuras = Boolean(f.stage1Active || f.segundaEtapaActive);
      const ceroLabel = isOscuras ? 'CERO OSCURAS' : 'CERO';
      skills.push({ id: 'cero', pct: cPct, ready: cPct >= 99, color: themeColor, label: ceroLabel });
    }

    // Transformation Status / Ultimate
    if (isSkillEnabled(cfg.enableResurreccion, true)) {
      let ultPct = 100;
      let ultLabel = 'BASE (MURCIÉLAGO)';
      if (f.segundaEtapaActive) {
        ultPct = 100;
        ultLabel = 'SEGUNDA ETAPA (ACTIVE)';
      } else if (f.stage1Active) {
        ultPct = 100;
        ultLabel = 'MURCIÉLAGO (ACTIVE)';
      } else {
        const maxHp = f.maxHp || 240;
        const hpPct = (f.hp / maxHp);
        ultPct = Math.max(0, Math.min(100, ((0.60 - Math.max(0, hpPct - 0.40)) / 0.60) * 100));
        ultLabel = 'RESURRECCIÓN GAUGE';
      }
      skills.push({ id: 'resurreccion', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: ultLabel });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // RUBBICK / TRICKSTER (Grand Magus)
  // ─────────────────────────────────────────────
  if (f.characterId === 'rubbick' || f.type === 'rubbick' || f.characterId === 'trickster' || f.type === 'trickster') {
    const themeColor = f.color || '#00FF64';
    const rcfg = (typeof CONFIG !== 'undefined' && (CONFIG.rubbick || CONFIG.trickster)) ? (CONFIG.rubbick || CONFIG.trickster) : {};
    const skills = [];

    // Helper for stolen ability display names
    const getStolenSkillName = (type) => {
      switch (type) {
        case 'gojo': return 'HOLLOW PURPLE';
        case 'gojo_red': return 'REVERSAL RED';
        case 'gojo_domain': return 'UNLIMITED VOID';
        case 'sukuna': return 'DIVINE FLAME';
        case 'yuta': return 'PURE LOVE BEAM';
        case 'cronos': return 'TIME SPHERE';
        case 'ruby': return 'SCYTHE PULL';
        case 'zeus': return 'ARCANE STORM';
        case 'laser': return 'SOLAR BEAM';
        case 'musashi': return 'PHANTOM FLURRY';
        case 'berserker': return 'ARCANE RAGE';
        case 'bomber': return 'BOUNCING BOMB';
        case 'grenadier': return 'POISON GRENADE';
        case 'normal': return 'EXECUTE SHOT';
        case 'darkslategray': return 'SHURIKEN';
        case 'orange': return 'FLAMETHROWER';
        case 'gunslinger': return 'RAPID BULLETS';
        default: return `STOLEN: ${String(type).toUpperCase()}`;
      }
    };

    // 1. Ultimate: Spell Steal / Stolen Ability
    if (isSkillEnabled(rcfg.enableSpellSteal, true)) {
      let stealPct = 0;
      let stealLabel = 'SPELL STEAL';
      let stealReady = false;

      if (f.stolenType) {
        const baseName = getStolenSkillName(f.stolenType);
        const activeProjectiles = typeof getProjectiles === 'function'
          ? getProjectiles()
          : (state.projectiles || (typeof state.getProjectiles === 'function' ? state.getProjectiles() : []));
        const purpleOrb = f.activePurpleProjectile || activeProjectiles?.find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb) && p.life > 0 && (p.ownerFighter === f || p.owner === state.fighters?.indexOf(f)));

        if (f.stolenWindUpTimer > 0) {
          const windupMax = (f.stolenType === 'gojo' ? 45 : (f.stolenType === 'gojo_red' ? 35 : (f.stolenType === 'gojo_domain' ? 60 : (f.stolenType === 'normal' ? (CONFIG.sharpshooter?.executeWindupFrames || 30) : 30))));
          stealPct = Math.max(0, Math.min(100, (1 - (f.stolenWindUpTimer / windupMax)) * 100));
          stealReady = false;
          stealLabel = `${baseName} (CHARGING)`;
        } else if (f.stolenDomainActive && f.stolenDomainTimer > 0) {
          const domMax = f.stolenDomainMaxTimer || 210;
          stealPct = Math.max(0, Math.min(100, (f.stolenDomainTimer / domMax) * 100));
          stealReady = false;
          stealLabel = `${baseName} (ACTIVE)`;
        } else if (f.beamTimer > 0) {
          const beamMax = CONFIG.laser?.beamDuration || 100;
          stealPct = Math.max(0, Math.min(100, (f.beamTimer / beamMax) * 100));
          stealReady = false;
          stealLabel = `${baseName} (FIRING)`;
        } else if (f.stormActive && f.stormTimer > 0) {
          const stormMax = (CONFIG.zeus?.stormDuration || 300) * (rcfg?.stormDurationMultiplier || 1);
          stealPct = Math.max(0, Math.min(100, (f.stormTimer / stormMax) * 100));
          stealReady = false;
          stealLabel = `${baseName} (ACTIVE)`;
        } else if (f.sphereActive && f.sphereTimer > 0) {
          const sphereMax = CONFIG.cronos?.sphereDuration || 300;
          stealPct = Math.max(0, Math.min(100, (f.sphereTimer / sphereMax) * 100));
          stealReady = false;
          stealLabel = baseName;
        } else if (f.isInRage && f.rageTimer > 0) {
          const rageMax = CONFIG.berserker?.rageDuration || 300;
          stealPct = Math.max(0, Math.min(100, (f.rageTimer / rageMax) * 100));
          stealReady = false;
          stealLabel = baseName;
        } else if (f.flurryHitsLeft > 0) {
          stealPct = Math.max(0, Math.min(100, (f.flurryHitsLeft / 5) * 100));
          stealReady = false;
          stealLabel = baseName;
        } else if (f.activePullActive) {
          stealPct = 100;
          stealReady = false;
          stealLabel = baseName;
        } else if (purpleOrb) {
          const orbMaxLife = CONFIG.gojo?.purpleLife ?? 480;
          stealPct = Math.max(0, Math.min(100, (purpleOrb.life / orbMaxLife) * 100));
          stealReady = false;
          stealLabel = baseName;
        } else if (f.stolenSkillCooldown > 0) {
          const cdMax = rcfg?.attackCooldown || 100;
          stealPct = Math.max(0, Math.min(100, (1 - (f.stolenSkillCooldown / cdMax)) * 100));
          stealReady = stealPct >= 99;
          stealLabel = baseName;
        } else {
          const durMax = rcfg?.spellStealDuration || 1000;
          const remaining = f.stolenTimer !== undefined ? f.stolenTimer : durMax;
          stealPct = Math.max(0, Math.min(100, (remaining / durMax) * 100));
          stealReady = true;
          stealLabel = baseName;
        }
      } else {
        const stealMax = rcfg?.spellStealCooldown || 700;
        const stealTimer = f.spellStealCooldown !== undefined ? f.spellStealCooldown : stealMax;
        stealPct = Math.max(0, Math.min(100, (1 - (stealTimer / stealMax)) * 100));
        const isSkillActive = (typeof f.hasActiveSkillInArena === 'function') ? f.hasActiveSkillInArena() : false;
        stealReady = stealPct >= 99 && !isSkillActive;
        stealLabel = 'SPELL STEAL';
      }
      skills.push({ id: 'spellsteal', pct: stealPct, ready: stealReady, color: themeColor, label: stealLabel });
    }

    // 2. Skill 1: Telekinesis
    if (isSkillEnabled(rcfg.enableTelekinesis, true)) {
      const tkMax = rcfg?.telekinesisCooldown || 400;
      const tkTotalDuration = rcfg?.telekinesisDuration || 90;
      let tkPct = 0;
      let tkLabel = 'TELEKINESIS';
      let tkReady = false;

      if (f.tkTimer > 0) {
        tkPct = Math.max(0, Math.min(100, (f.tkTimer / tkTotalDuration) * 100));
        tkReady = false;
        tkLabel = 'TELEKINESIS';
      } else {
        const tkTimer = f.telekinesisCooldown !== undefined ? f.telekinesisCooldown : 0;
        tkPct = Math.max(0, Math.min(100, (1 - (tkTimer / tkMax)) * 100));
        const isSkillActive = (typeof f.hasActiveSkillInArena === 'function') ? f.hasActiveSkillInArena() : false;
        tkReady = tkPct >= 99 && !isSkillActive;
        tkLabel = 'TELEKINESIS';
      }
      skills.push({ id: 'telekinesis', pct: tkPct, ready: tkReady, color: themeColor, label: tkLabel });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // REZE (Bomb Devil Hybrid)
  // ─────────────────────────────────────────────
  if (f.characterId === 'reze' || f.type === 'reze') {
    const themeColor = f.color || '#430363ff';
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.reze) ? CONFIG.reze : {};
    const isNukeEnabled = isSkillEnabled(cfg.enableMegatonNuke, cfg.enableUltimate, cfg.enableNuke, true);

    const isHybrid = Boolean((f.isHybridModeActive || (f.isExecutingNuke && !f.isPullingPin)) && !f.isPullingPin);

    // 1. Ultimate: Megaton Tsar Nuke
    const nukeMax = f.nukeCooldownMax || cfg.nukeCooldown || 1500;
    const nukeTimer = f.nukeCooldown !== undefined ? f.nukeCooldown : nukeMax;
    let nukePct = 0;
    let nukeLabel = 'MEGATON NUKE';
    if (f.isExecutingNuke) {
      nukePct = 100;
      nukeLabel = 'NUKE (DIVING)';
    } else {
      nukePct = Math.max(0, Math.min(100, (1 - (nukeTimer / nukeMax)) * 100));
    }

    if (!isHybrid) {
      if (!isNukeEnabled) return [];
      let label = nukeLabel;
      let pct = nukePct;
      if (f.isPullingPin) {
        label = 'PULLING PIN...';
        pct = 100;
      }
      return [
        { id: 'nuke', pct: pct, ready: pct >= 99, color: themeColor, label: label, fullWidth: true }
      ];
    }

    const skills = [];
    if (isNukeEnabled) {
      skills.push({ id: 'nuke', pct: nukePct, ready: nukePct >= 99, color: themeColor, label: nukeLabel });
    }
    if (isSkillEnabled(cfg.enableSparkFlechette, true)) {
      const sparkMax = f.sparkCooldownMax || cfg.sparkCooldown || 180;
      const sparkTimer = f.sparkCooldown !== undefined ? f.sparkCooldown : 0;
      const sparkPct = Math.max(0, Math.min(100, (1 - (sparkTimer / sparkMax)) * 100));
      skills.push({ id: 'spark', pct: sparkPct, ready: sparkPct >= 99, color: themeColor, label: 'SPARK FLECHETTE' });
    }
    if (isSkillEnabled(cfg.enableDecoyBomb, true)) {
      const decoyMax = f.decoyCooldownMax || cfg.decoyCooldown || 420;
      const decoyTimer = f.decoyCooldown !== undefined ? f.decoyCooldown : 0;
      const decoyPct = Math.max(0, Math.min(100, (1 - (decoyTimer / decoyMax)) * 100));
      skills.push({ id: 'decoy', pct: decoyPct, ready: decoyPct >= 99, color: themeColor, label: 'DECOY BOMB' });
    }
    if (isSkillEnabled(cfg.enableRocketLunge, true)) {
      const rocketMax = f.rocketCooldownMax || cfg.rocketCooldown || 300;
      const rocketTimer = f.rocketCooldown !== undefined ? f.rocketCooldown : 0;
      const rocketPct = f.isRocketLunging ? 100 : Math.max(0, Math.min(100, (1 - (rocketTimer / rocketMax)) * 100));
      skills.push({ id: 'rocket', pct: rocketPct, ready: rocketPct >= 99, color: themeColor, label: 'ROCKET LUNGE' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // TANJIRO KAMADO (Water & Sun Breathing)
  // ─────────────────────────────────────────────
  if (f.characterId === 'tanjiro' || f.type === 'tanjiro') {
    const themeColor = f.color || '#10B981';
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.tanjiro) ? CONFIG.tanjiro : {};
    const skills = [];

    if (isSkillEnabled(cfg.enableDragonSunDance, cfg.enableUltimate, true)) {
      const ultMax = f.dragonDanceCooldownMax || cfg.ultimateCooldown || 1440;
      const ultTimer = f.dragonDanceCooldown !== undefined ? f.dragonDanceCooldown : 0;
      const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      skills.push({ id: 'dragon_dance', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: 'DRAGON SUN DANCE' });
    }

    if (isSkillEnabled(cfg.enableConstantFlux, true)) {
      const fluxMax = f.fluxCooldownMax || cfg.fluxCooldown || 270;
      const fluxTimer = f.fluxCooldown !== undefined ? f.fluxCooldown : 0;
      const fluxPct = Math.max(0, Math.min(100, (1 - (fluxTimer / fluxMax)) * 100));
      skills.push({ id: 'constant_flux', pct: fluxPct, ready: fluxPct >= 99, color: themeColor, label: 'CONSTANT FLUX' });
    }

    if (isSkillEnabled(cfg.enableClearBlueSky, true)) {
      const sunMax = f.sunCooldownMax || cfg.sunCooldown || 360;
      const sunTimer = f.sunCooldown !== undefined ? f.sunCooldown : 0;
      const sunPct = Math.max(0, Math.min(100, (1 - (sunTimer / sunMax)) * 100));
      skills.push({ id: 'clear_blue_sky', pct: sunPct, ready: sunPct >= 99, color: themeColor, label: 'CLEAR BLUE SKY' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // NEZUKO KAMADO (Awakened Demon & Bakketsu)
  // ─────────────────────────────────────────────
  if (f.characterId === 'nezuko' || f.type === 'nezuko') {
    const themeColor = f.color || '#EC4899';
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.nezuko) ? CONFIG.nezuko : {};
    const skills = [];

    if (isSkillEnabled(cfg.enableFullAwakening, cfg.enableDemonAwakening, cfg.enableUltimate, true)) {
      const ultMax = f.awakeningCooldownMax || cfg.ultimateCooldown || 1500;
      const ultTimer = f.awakeningCooldown !== undefined ? f.awakeningCooldown : 0;
      const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      skills.push({ id: 'demon_awakening', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: 'DEMON AWAKENING' });
    }

    if (isSkillEnabled(cfg.enableExplodingBlood, cfg.enableBakketsu, true)) {
      const bakketsuMax = f.bakketsuCooldownMax || cfg.bakketsuCooldown || 330;
      const bakketsuTimer = f.bakketsuCooldown !== undefined ? f.bakketsuCooldown : 0;
      const bakketsuPct = Math.max(0, Math.min(100, (1 - (bakketsuTimer / bakketsuMax)) * 100));
      skills.push({ id: 'bakketsu', pct: bakketsuPct, ready: bakketsuPct >= 99, color: themeColor, label: 'EXPLODING BLOOD' });
    }

    if (isSkillEnabled(cfg.enableFlyingDropkick, cfg.enableDropkick, true)) {
      const dropkickMax = f.dropkickCooldownMax || cfg.dropkickCooldown || 240;
      const dropkickTimer = f.dropkickCooldown !== undefined ? f.dropkickCooldown : 0;
      const dropkickPct = Math.max(0, Math.min(100, (1 - (dropkickTimer / dropkickMax)) * 100));
      skills.push({ id: 'dropkick', pct: dropkickPct, ready: dropkickPct >= 99, color: themeColor, label: 'FLYING DROPKICK' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // ZENITSU AGATSUMA (Thunder Breathing)
  // ─────────────────────────────────────────────
  if (f.characterId === 'zenitsu' || f.type === 'zenitsu') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.zenitsu) ? CONFIG.zenitsu : {};
    const themeColor = f.color || '#F59E0B';
    const skills = [];

    if (isSkillEnabled(cfg.enableFlamingThunderGod, false)) {
      const ultMax = f.flamingGodCooldownMax || cfg.ultimateCooldown || 1440;
      const ultTimer = f.flamingGodCooldown !== undefined ? f.flamingGodCooldown : 0;
      const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      skills.push({ id: 'flaming_thunder_god', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: 'FLAMING THUNDER GOD' });
    }

    if (isSkillEnabled(cfg.enableThunderclap, true)) {
      const thunderMax = f.thunderclapCooldownMax || cfg.thunderclapCooldown || 228;
      const thunderTimer = f.thunderclapCooldown !== undefined ? f.thunderclapCooldown : 0;
      const thunderPct = Math.max(0, Math.min(100, (1 - (thunderTimer / thunderMax)) * 100));
      skills.push({ id: 'thunderclap', pct: thunderPct, ready: thunderPct >= 99, color: themeColor, label: 'THUNDERCLAP & FLASH' });
    }

    if (isSkillEnabled(cfg.enableRokuren, false)) {
      const rokurenMax = f.rokurenCooldownMax || cfg.rokurenCooldown || 420;
      const rokurenTimer = f.rokurenCooldown !== undefined ? f.rokurenCooldown : 0;
      const rokurenPct = Math.max(0, Math.min(100, (1 - (rokurenTimer / rokurenMax)) * 100));
      skills.push({ id: 'rokuren', pct: rokurenPct, ready: rokurenPct >= 99, color: themeColor, label: 'SIXFOLD (ROKUREN)' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // INOSUKE HASHIBIRA (Beast Breathing)
  // ─────────────────────────────────────────────
  if (f.characterId === 'inosuke' || f.type === 'inosuke') {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.inosuke) ? CONFIG.inosuke : {};
    const themeColor = f.color || '#3B82F6';
    const skills = [];

    if (isSkillEnabled(cfg.enableKingOfMountain, cfg.enableUltimate, true)) {
      const ultMax = f.kingOfMountainCooldownMax || cfg.ultimateCooldown || 1440;
      const ultTimer = f.kingOfMountainCooldown !== undefined ? f.kingOfMountainCooldown : 0;
      const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
      skills.push({ id: 'king_of_mountain', pct: ultPct, ready: ultPct >= 99, color: themeColor, label: 'KING OF MOUNTAINS' });
    }

    if (isSkillEnabled(cfg.enableCrazyCutting, true)) {
      const crazyMax = f.crazyCuttingCooldownMax || cfg.crazyCuttingCooldown || 252;
      const crazyTimer = f.crazyCuttingCooldown !== undefined ? f.crazyCuttingCooldown : 0;
      const crazyPct = Math.max(0, Math.min(100, (1 - (crazyTimer / crazyMax)) * 100));
      skills.push({ id: 'crazy_cutting', pct: crazyPct, ready: crazyPct >= 99, color: themeColor, label: 'CRAZY CUTTING' });
    }

    if (isSkillEnabled(cfg.enableExplosiveRush, true)) {
      const rushMax = f.explosiveRushCooldownMax || cfg.explosiveRushCooldown || 330;
      const rushTimer = f.explosiveRushCooldown !== undefined ? f.explosiveRushCooldown : 0;
      const rushPct = Math.max(0, Math.min(100, (1 - (rushTimer / rushMax)) * 100));
      skills.push({ id: 'explosive_rush', pct: rushPct, ready: rushPct >= 99, color: themeColor, label: 'EXPLOSIVE RUSH' });
    }

    return skills;
  }

  // ─────────────────────────────────────────────
  // ESCANOR (Lion's Sin of Pride — Sunshine)
  // ─────────────────────────────────────────────
  if (f.characterId === 'escanor' || f.type === 'escanor') {
    const themeColor = f.color || '#F59E0B';
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.escanor) ? CONFIG.escanor : {};
    const skills = [];

    // 1. Ultimate: "THE ONE" — Divine Sword Escanor (Toggle: enableTheOne)
    if (isSkillEnabled(cfg.enableTheOne, true)) {
      const theOneMax = f.theOneCooldownMax || cfg.theOneCooldown || 1560;
      const theOneTimer = f.theOneCooldown !== undefined ? f.theOneCooldown : 0;
      const theOnePct = f.isTheOneActive
        ? Math.max(0, Math.min(100, (f.theOneTimer / (f.theOneMaxTimer || 480)) * 100))
        : Math.max(0, Math.min(100, (1 - (theOneTimer / theOneMax)) * 100));
      skills.push({ id: 'the_one', pct: theOnePct, ready: theOnePct >= 99 || f.isTheOneActive, color: themeColor, label: f.isTheOneActive ? 'THE ONE (ACTIVE)' : '"THE ONE"' });
    }

    // 2. Skill 1: Cruel Sun (Toggle: enableCruelSun)
    if (isSkillEnabled(cfg.enableCruelSun, true)) {
      const cruelMax = f.cruelSunCooldownMax || cfg.cruelSunCooldown || 510;
      const cruelTimer = f.cruelSunCooldown !== undefined ? f.cruelSunCooldown : 0;
      let cruelPct;
      let cruelLabel = 'CRUEL SUN';
      if (f.isChannelingCruelSun) {
        const windupMax = f.cruelSunMaxChargeTimer || cfg.cruelSunCastWindupFrames || 45;
        const curTimer = f.cruelSunChargeTimer || 0;
        cruelPct = Math.max(0, Math.min(100, (1 - (curTimer / windupMax)) * 100));
        cruelLabel = 'CRUEL SUN (CHARGING)';
      } else if (f.activeCruelSuns && f.activeCruelSuns.length > 0) {
        cruelPct = 0;
        cruelLabel = 'CRUEL SUN (ACTIVE)';
      } else {
        cruelPct = Math.max(0, Math.min(100, (1 - (cruelTimer / cruelMax)) * 100));
      }
      skills.push({ id: 'cruel_sun', pct: cruelPct, ready: cruelPct >= 99 && !f.isCruelSunActive(), color: themeColor, label: cruelLabel });
    }

    // 3. Skill 2: Pride Flare (Toggle: enablePrideFlare)
    if (isSkillEnabled(cfg.enablePrideFlare, true)) {
      const prideMax = f.prideFlareCooldownMax || cfg.prideFlareCooldown || 660;
      const prideTimer = f.prideFlareCooldown !== undefined ? f.prideFlareCooldown : 0;
      const pridePct = Math.max(0, Math.min(100, (1 - (prideTimer / prideMax)) * 100));
      skills.push({ id: 'pride_flare', pct: pridePct, ready: pridePct >= 99, color: themeColor, label: 'PRIDE FLARE' });
    }

    return skills;
  }

  if (f.characterId === 'doppleganger' || f.characterId === 'doppelganger' || f.type === 'doppleganger' || f.type === 'doppelganger') {
    return [];
  }

  const def = f.fighterIndex !== undefined ? FIGHTER_DEFS[f.fighterIndex] : null;
  const color = f.color || (def && def.color) || '#a491d3';

  if (f.skillManager && typeof f.skillManager.hasSkills === 'function' && f.skillManager.hasSkills()) {
    const dynamicData = f.skillManager.getHudSkillData(color, getProjectiles);
    if (dynamicData && dynamicData.length > 0) {
      return dynamicData;
    }
  }

  let current = 0;
  let max = 1;
  if (f.skillCooldown !== undefined) {
    current = f.skillCooldown;
    max = (CONFIG[f.type] && CONFIG[f.type].skillCooldown) || 100;
  } else if (f.cooldownTimer !== undefined) {
    current = f.cooldownTimer;
    max = f.cooldown || f.shootCooldownMax || 100;
  }
  const skillPct = Math.max(0, Math.min(100, (1 - (current / max)) * 100));
  
  const label = (def && def.name) ? def.name.toUpperCase() : (f.type ? f.type.toUpperCase() : 'SKILL');

  return [
    { id: 'skill', pct: skillPct, ready: skillPct >= 99, color: color, label: label }
  ];
}
