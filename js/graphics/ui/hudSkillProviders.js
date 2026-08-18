import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { state } from '../../core/state.js';

const checkHasTeammate = (f) => {
  if (typeof state !== 'undefined' && state.getFighterTeam && state.fighters) {
    const myIndex = state.fighters.indexOf(f);
    if (myIndex !== -1) {
      const myTeam = state.getFighterTeam(myIndex);
      if (myTeam !== null) {
        return state.fighters.some((other, idx) => idx !== myIndex && other && !other.isTurret && state.getFighterTeam(idx) === myTeam);
      }
    }
  }
  return false;
};

/**
 * Calculates skill bar HUD data for any given fighter.
 * @param {Object} f Fighter instance
 * @param {Function} getProjectiles Function reference to active projectiles getter
 * @returns {Array<{id: string, pct: number, ready: boolean, color: string, label: string}>}
 */
export function getSkillDataForFighter(f, getProjectiles) {
  if (!f) return [];

  if (f.characterId === 'gojo' || f.type === 'gojo') {
    const themeColor = '#00E5FF'; 
    const domainMax = CONFIG.gojo?.domainCooldown || 2000;
    const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
    let domainPct;
    if (f.isChannelingDomainExpansion) {
      domainPct = 100;
    } else if (f.domainActive) {
      const domainDuration = CONFIG.gojo?.domainDuration || 400;
      const remaining = f.domainTimer || 0;
      domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
    } else {
      domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
    }

    const activeProjectiles = typeof getProjectiles === 'function'
      ? getProjectiles()
      : (state.projectiles || (typeof state.getProjectiles === 'function' ? state.getProjectiles() : []));
    const purpleOrb = activeProjectiles.find(p => p && (p.isGojoPurple || p.isGojoPurpleOrb) && p.life > 0 && p.owner === state.fighters?.indexOf(f));
    const purpleMax = CONFIG.gojo?.purpleCooldown || 1500;
    const purpleTimer = f.purpleCooldown !== undefined ? f.purpleCooldown : purpleMax;
    let purplePct;
    if (f.isChannelingPurple) {
      const chargeMax = CONFIG.gojo?.purpleChargeMax || 120;
      const chargeTimer = f.purpleChargeTimer || 0;
      purplePct = Math.max(0, Math.min(100, (1 - chargeTimer / chargeMax) * 100));
    } else if (purpleOrb) {
      const orbMaxLife = CONFIG.gojo?.purpleLife || 250;
      purplePct = Math.max(0, Math.min(100, (purpleOrb.life / orbMaxLife) * 100));
    } else if ((f.purpleRecoveryTimer || 0) > 0) {
      purplePct = 0;
    } else {
      purplePct = Math.max(0, Math.min(100, (1 - (purpleTimer / purpleMax)) * 100));
    }

    const redMax = CONFIG.gojo?.redCooldown || 1000;
    const redTimer = f.redCooldown !== undefined ? f.redCooldown : redMax;
    const redPct = Math.max(0, Math.min(100, (1 - (redTimer / redMax)) * 100));

    const rctMax = CONFIG.gojo?.reverseCursedTechniqueCooldown || 700;
    const rctTimer = f.reverseCursedTechniqueCooldown !== undefined ? f.reverseCursedTechniqueCooldown : 0;
    let rctPct = 0;
    if (f.isChannelingRCT) {
      const rctChannelMax = 90;
      const remaining = f.rctHealTimer || 0;
      rctPct = Math.max(0, Math.min(100, (remaining / rctChannelMax) * 100));
    } else {
      rctPct = Math.max(0, Math.min(100, (1 - (rctTimer / rctMax)) * 100));
    }

    const label100 = CONFIG.gojo?.purpleSecondCastTextHeader100 || 'PURPLE 100%';
    const label200 = CONFIG.gojo?.purpleSecondCastTextHeader200 || 'PURPLE 200%';
    const purpleLabel = (f.purpleUseCount === 1) ? label200 : label100;
    return [
      { id: 'uv',     pct: domainPct, ready: domainPct >= 99, color: themeColor, label: 'UNLIMITED VOID' },
      { id: 'purple', pct: purplePct, ready: purplePct >= 99, color: themeColor, label: purpleLabel },
      { id: 'red',    pct: redPct,    ready: redPct >= 99,    color: themeColor, label: 'REVERSAL RED' },
      { id: 'rct',    pct: rctPct,    ready: rctPct >= 99 && !f.isChannelingRCT, color: themeColor, label: 'RCT' },
    ];
  }
  if (f.characterId === 'toji' || f.type === 'toji') {
    const themeColor = '#a855f7';
    const ambushTrigger = CONFIG.toji?.ambushTriggerFrames || 55;
    const ambushMax = (CONFIG.toji?.stealthCooldown || 500) - ambushTrigger;
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
      else if (ph === 'BACK_CHARGE') { const p = Math.max(0, 1 - ((f.ambushTimer || 0) / (CONFIG.toji?.ambushBackChargeDuration || 30))); ap = 0.10 + p * 0.20; }
      else if (ph === 'BACK_STAB' || ph === 'KATANA_DRAW') { ap = 0.35; }
      else if (ph === 'KATANA_CHASE' || ph === 'KATANA_CHARGE') { const p = Math.max(0, 1 - ((f.ambushTimer || 0) / (CONFIG.toji?.ambushKatanaChargeDuration || 30))); ap = 0.40 + p * 0.20; }
      else if (ph === 'KATANA_SLASH') { ap = 0.65; }
      else if (ph === 'PHANTOM_FLURRY') { ap = 0.65 + ((f.phantomStrikeCount || 0) / (CONFIG.toji?.ambushPhantomFlurryStrikes || 10)) * 0.25; }
      else if (ph === 'FINISHER_DASH' || ph === 'FINISHER_SLASH') { ap = 0.95; }
      ambushPct = Math.max(0, 100 - ap * 100);
    }
    const ultMax = f.ultimateCooldownMax || CONFIG.toji?.ultimateCooldown || 1500;
    const ultTimer = f.ultimateCooldown !== undefined ? f.ultimateCooldown : ultMax;
    let ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));

    if (f.ultimateActive) {
      if (f.ultimatePhase === 'CHANNELING') {
        const chgMax = f.ultimateChargeMax || 90;
        const remainingChg = Math.max(0, chgMax - (f.ultimateChargeTimer || 0));
        ultPct = Math.max(0, Math.min(100, (remainingChg / chgMax) * 100));
      } else {
        const totalMax = CONFIG.toji?.ultimateSwarmDuration || 500;
        const remainingSwarm = Math.max(0, f.ultimateTotalTimer !== undefined ? f.ultimateTotalTimer : totalMax);
        ultPct = Math.max(0, Math.min(100, (remainingSwarm / totalMax) * 100));
      }
    }
    return [
      { id: 'ambush', pct: ambushPct, ready: ambushPct >= 99, color: themeColor, label: 'STEALTH AMBUSH' },
      { id: 'ult',    pct: ultPct,    ready: ultPct >= 99,    color: themeColor, label: 'CURSE INVENTORY' },
    ];
  }
  if (f.characterId === 'sukuna' || f.type === 'sukuna') {
    const themeColor = f.color || '#ff4500';
    const domainMax = CONFIG.sukuna?.domainCooldown || 1950;
    const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
    let domainPct;
    if (f.isChannelingDomainExpansion) {
      domainPct = 100;
    } else if (f.domainActive) {
      const domainDuration = CONFIG.sukuna?.domainDuration || 500;
      const remaining = f.domainTimer || 0;
      domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
    } else {
      domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
    }

    const flameMax = CONFIG.sukuna?.divineFlameCooldown || 1500;
    const flameTimer = f.divineFlameCooldown !== undefined ? f.divineFlameCooldown : flameMax;
    let flamePct;
    if (f.isChannelingDivineFlame) {
      const chargeMax = f.divineFlameChargeMax || CONFIG.sukuna?.divineFlameChargeMax || 100;
      const chargeTimer = f.divineFlameChargeTimer || 0;
      flamePct = Math.max(0, Math.min(100, (chargeTimer / chargeMax) * 100));
    } else if ((f.divineFlameRecoveryTimer || 0) > 0) {
      flamePct = 0;
    } else {
      flamePct = Math.max(0, Math.min(100, (1 - (flameTimer / flameMax)) * 100));
    }

    const rctMax = CONFIG.sukuna?.reverseCursedTechniqueCooldown || 700;
    const rctTimer = f.reverseCursedTechniqueCooldown !== undefined ? f.reverseCursedTechniqueCooldown : 0;
    let rctPct;
    if ((f.rctVisualTimer || 0) > 0) {
      rctPct = 100;
    } else {
      rctPct = Math.max(0, Math.min(100, (1 - (rctTimer / rctMax)) * 100));
    }

    return [
      { id: 'ms',     pct: domainPct,  ready: domainPct >= 99,  color: themeColor, label: 'MALEVOLENT SHRINE' },
      { id: 'fuga',   pct: flamePct,   ready: flamePct >= 99,   color: themeColor, label: 'FUGA (FURNACE)' },
      { id: 'rct',    pct: rctPct,     ready: rctPct >= 99,     color: themeColor, label: 'RCT' }
    ];
  }
  if (f.characterId === 'mahoraga' || f.type === 'mahoraga') {
    const themeColor = '#FFD700';

    const totalStages = (f.adaptationStage?.melee || 0) + (f.adaptationStage?.ranged || 0) + (f.adaptationStage?.skill || 0);
    const currentLevel = Math.max(1, totalStages + 1);
    const lvlStr = `${currentLevel}`;

    const isLevel8 = totalStages >= 8;
    const windowThreshold = f.maxHp * (CONFIG.mahoraga?.fatalDamageThresholdPct || 0.15);

    let wheelPct = 0;
    if ((f.wheelClickTimer || 0) > 0 || (f.adaptationPauseTimer || 0) > 0) {
      wheelPct = 100;
    } else {
      const accum = f.totalAccumDamage || 0;
      wheelPct = Math.max(0, Math.min(100, (accum / windowThreshold) * 100));
    }

    const throwMax = CONFIG.mahoraga?.throwCooldown || 1000;
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

    const shoutMax = CONFIG.mahoraga?.shoutCooldown || 1000;
    const shoutTimer = f.shoutCooldown !== undefined ? f.shoutCooldown : shoutMax;
    let shoutPct = 0;
    if (f.isShouting) {
      shoutPct = 0;
    } else {
      shoutPct = Math.max(0, Math.min(100, (1 - (shoutTimer / shoutMax)) * 100));
    }

    const rctPerStage = CONFIG.mahoraga?.rctRegenPerStage || 0.03;
    const currentRegenRate = totalStages * rctPerStage;
    const currentRegenPerSec = Math.round(currentRegenRate * 60);

    const skillList = [
      { id: 'wheel', pct: wheelPct, ready: wheelPct >= 99, color: themeColor, label: `WHEEL OF ADAPTATION - LVL ${lvlStr}` },
      { id: 'throw', pct: throwPct, ready: throwPct >= 99, color: themeColor, label: throwLabelHtml },
      { id: 'shout', pct: shoutPct, ready: shoutPct >= 99, color: themeColor, label: 'DIVINE SHOUT' }
    ];

    if (totalStages > 0) {
      skillList.push({
        id: 'rct',
        pct: 100,
        ready: true,
        color: themeColor,
        label: `RCT REGEN: +${currentRegenPerSec}%`
      });
    }

    return skillList;
  }
  if (f.characterId === 'layla' || f.type === 'layla') {
    const themeColor = '#00E5FF'; 
    const bombMax = CONFIG.layla?.maleficBombCooldown || 200;
    const bombTimer = f.maleficBombCooldown !== undefined ? f.maleficBombCooldown : bombMax;
    const bombPct = Math.max(0, Math.min(100, (1 - (bombTimer / bombMax)) * 100));

    const dashMax = CONFIG.layla?.voidDashCooldown || 120;
    const dashTimer = f.voidDashCooldown !== undefined ? f.voidDashCooldown : dashMax;
    const dashPct = Math.max(0, Math.min(100, (1 - (dashTimer / dashMax)) * 100));

    const ultMax = CONFIG.layla?.ultimateCooldown || 600;
    const ultTimer = f.destructionBarrageCooldown !== undefined ? f.destructionBarrageCooldown : ultMax;
    
    let ultPct;
    if (f.isUltimateCharging || f.isUltimateFiring) {
      ultPct = 0;
    } else {
      ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));
    }

    return [
      { id: 'bomb', pct: bombPct, ready: bombPct >= 99, color: themeColor, label: 'MALEFIC BOMB' },
      { id: 'dash', pct: dashPct, ready: dashPct >= 99, color: themeColor, label: 'VOID PROJECTILE' },
      { id: 'ult',  pct: ultPct,  ready: ultPct >= 99,  color: '#00E5FF', label: 'DESTRUCTION RUSH' }
    ];
  }
  if (f.characterId === 'todo' || f.type === 'todo') {
    const themeColor = f.color || '#eab308';
    const isUltActive = Boolean(f.isTakadaUltActive);
    const cdMult = isUltActive ? (CONFIG.todo?.takadaClapCooldownMult ?? 0.5) : 1.0;
    const clapMax = Math.round((CONFIG.todo?.clapCooldown || 120) * cdMult);
    const clapTimer = f.boogieWoogieCooldown !== undefined ? f.boogieWoogieCooldown : clapMax;
    const clapPct = Math.max(0, Math.min(100, (1 - (clapTimer / clapMax)) * 100));

    const rockMax = CONFIG.todo?.rockCooldown || 180;
    const rockTimer = f.rockThrowCooldown !== undefined ? f.rockThrowCooldown : rockMax;
    const rockPct = Math.max(0, Math.min(100, (1 - (rockTimer / rockMax)) * 100));

    const hpThreshold = CONFIG.todo?.hpThresholdUltTrigger ?? 0.65;
    const hpRatio = (f.maxHp && f.maxHp > 0) ? (f.hp / f.maxHp) : 1.0;
    let ultPct = 0;
    let ultReady = false;

    const isGojoDomainActive = typeof state !== 'undefined' && state.fighters && state.fighters.some(g => 
      g && (g.characterId === 'gojo' || g.type === 'gojo' || g._def?.id === 'gojo') && g.domainActive && g.hp > 0
    );

    if (f.isTakadaUltActive) {
      const remaining = f.takadaUltTimer || 0;
      const dur = CONFIG.todo?.ultDuration ?? 3000;
      ultPct = Math.max(0, Math.min(100, (remaining / dur) * 100));
      ultReady = !isGojoDomainActive && remaining > 0;
    } else if (f.isTakadaChanneling) {
      const channelMax = CONFIG.todo?.channelDuration || 180;
      const channelTimer = f.takadaChannelTimer || 0;
      ultPct = Math.max(0, Math.min(100, (1 - (channelTimer / channelMax)) * 100));
      ultReady = !isGojoDomainActive;
    } else if (f.hasTriggeredTakadaHpUlt) {
      ultPct = 0;
      ultReady = false;
    } else if (isGojoDomainActive && (f.timeStopTimer > 0 || f.isFrozenByInfinity)) {
      ultPct = 0;
      ultReady = false;
    } else {
      const progressRatio = Math.max(0, Math.min(1.0, (1.0 - hpRatio) / (1.0 - hpThreshold)));
      ultPct = Math.round(progressRatio * 100);
      ultReady = hpRatio <= hpThreshold;
    }

    return [
      { id: 'clap', pct: clapPct, ready: clapPct >= 99, color: themeColor, label: 'BOOGIE WOOGIE' },
      { id: 'rock', pct: rockPct, ready: rockPct >= 99, color: themeColor, label: 'CURSED ROCK' },
      { id: 'takada', pct: ultPct, ready: ultReady, color: themeColor, label: 'TAKADA-CHAN IDOL' }
    ];
  }
  if (f.characterId === 'yuji' || f.type === 'yuji') {
    const themeColor = '#ff3366';
    
    const comboMax = f.soulSwapActive ? 180 : (CONFIG.yuji?.comboCooldown || CONFIG.yuji?.comboRushCooldown || 400);
    const comboTimer = f.comboRushCooldown !== undefined ? f.comboRushCooldown : 0;
    const comboPct = Math.max(0, Math.min(100, (1 - (comboTimer / comboMax)) * 100));

    const bfThreshold = f.soulSwapActive 
      ? (CONFIG.yuji?.soulSwapBlackFlashThreshold || 2)
      : (f.blackFlashThreshold || CONFIG.yuji?.blackFlashThreshold || 4);
    const bfThresholdPct = Math.max(0, Math.min(100, ((f.blackFlashCharge || 0) / bfThreshold) * 100));

    let ultPct = 0;
    let ultReady = false;

    if (f.soulSwapActive) {
      const ultDuration = CONFIG.yuji?.soulSwapDuration || 800;
      ultPct = Math.max(0, Math.min(100, ((f.soulSwapTimer || 0) / ultDuration) * 100));
    } else if (f.hasSoulSwapped) {
      ultPct = 0;
    } else {
      const ultThresholdHp = CONFIG.yuji?.soulSwapHpThreshold || 0.30;
      ultPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - ultThresholdHp)) * 100));
      ultReady = ultPct >= 99 && (f.hp / f.maxHp <= ultThresholdHp);
    }

    return [
      { id: 'combo',        pct: comboPct,       ready: comboPct >= 99,       color: themeColor, label: 'DIVERGENT FIST' },
      { id: 'ult',          pct: ultPct,         ready: ultReady,             color: themeColor, label: 'SOUL SWAP' },
      { id: 'bf_threshold', pct: bfThresholdPct, ready: bfThresholdPct >= 99, color: themeColor, label: 'BLACK FLASH CHARGE' }
    ];
  }
  if (f.characterId === 'mahito' || f.type === 'mahito') {
    const themeColor = f.color || '#C026D3';
    let formPct = 0;
    let formReady = false;
    let formLabel = 'DISTORTED KILLING';

    if (f.isTransformed) {
      const maxDuration = CONFIG.mahito?.transformation?.duration || 600;
      formPct = Math.max(0, Math.min(100, ((f.transformDuration || 0) / maxDuration) * 100));
      formReady = true;
      formLabel = 'ACTIVE FORM';
    } else {
      const maxCd = CONFIG.mahito?.transformation?.cooldown || 1200;
      const currentCd = f.transformCooldown !== undefined ? f.transformCooldown : 0;
      formPct = Math.max(0, Math.min(100, (1 - (currentCd / maxCd)) * 100));
      formReady = formPct >= 99;
    }

    const maxSkillCd = CONFIG.mahito?.sharedSkillCooldown || CONFIG.mahito?.fleshSurge?.cooldown || 300;
    const skillCd = Math.max(
      f.sharedSkillCooldown !== undefined ? f.sharedSkillCooldown : 0,
      f.fleshSurgeCooldown || 0,
      f.maceCannonCooldown || 0,
      f.twinScissorCooldown || 0
    );
    const skillPct = Math.max(0, Math.min(100, (1 - (skillCd / maxSkillCd)) * 100));
    const skillReady = skillPct >= 99;

    const maxMultiplicityCd = CONFIG.mahito?.soulMultiplicity?.cooldown || 1000;
    const multiplicityCd = f.soulMultiplicityCooldown !== undefined ? f.soulMultiplicityCooldown : 0;
    const multiplicityPct = Math.max(0, Math.min(100, (1 - (multiplicityCd / maxMultiplicityCd)) * 100));
    const multiplicityReady = multiplicityPct >= 99;

    // Domain Expansion — Self-Embodiment of Perfection
    const domainMax = CONFIG.mahito?.domainExpansion?.cooldown || 2000;
    const domainTimer = f.domainCooldown !== undefined ? f.domainCooldown : domainMax;
    let domainPct;
    let domainReady = false;
    let domainLabel = 'SELF-EMBODIMENT OF PERFECTION';

    if (f.isChannelingDomainExpansion) {
      domainPct = 100;
      domainReady = true;
      domainLabel = 'SELF-EMBODIMENT OF PERFECTION';
    } else if (f.domainActive) {
      const domainDuration = CONFIG.mahito?.domainExpansion?.duration || 600;
      const remaining = f.domainTimer || 0;
      domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
      domainReady = true;
      domainLabel = 'SELF-EMBODIMENT OF PERFECTION';
    } else {
      domainPct = Math.max(0, Math.min(100, (1 - (domainTimer / domainMax)) * 100));
      domainReady = domainPct >= 99;
    }

    let evasionPct = 0;
    let evasionReady = false;
    const evasionLabel = 'SOUL EVASION';
    const evasionThreshold = CONFIG.mahito?.evasion?.threshold || 0.75;

    if (f.isEvading) {
      const maxDuration = CONFIG.mahito?.evasion?.duration || 300;
      evasionPct = Math.max(0, Math.min(100, ((f.evasionTimer || 0) / maxDuration) * 100));
      evasionReady = false;
    } else if (!f.hasTriggeredEvasion) {
      const currentHpRatio = f.maxHp > 0 ? Math.max(0, f.hp / f.maxHp) : 0;
      const lostHpRatio = 1 - currentHpRatio;
      const requiredLostRatio = 1 - evasionThreshold; // e.g. 0.65
      evasionPct = Math.max(0, Math.min(100, (lostHpRatio / requiredLostRatio) * 100));
      evasionReady = currentHpRatio <= evasionThreshold;
    } else {
      evasionPct = 0;
      evasionReady = false;
    }

    const isTransEnabled = CONFIG.mahito?.transformation?.enabled ?? true;
    const skills = [
      { id: 'idle_transfiguration', pct: skillPct, ready: skillReady, color: themeColor, label: 'IDLE TRANSFIGURATION' },
      { id: 'soul_multiplicity',    pct: multiplicityPct, ready: multiplicityReady, color: themeColor, label: 'SOUL MULTIPLICITY' },
      { id: 'domain_expansion',     pct: domainPct, ready: domainReady, color: themeColor, label: domainLabel },
      { id: 'soul_evasion',         pct: evasionPct, ready: evasionReady, color: themeColor, label: evasionLabel }
    ];
    if (isTransEnabled) {
      skills.push({ id: 'isbodk', pct: formPct, ready: formReady, color: themeColor, label: formLabel });
    }
    return skills;
  }
  if (f.characterId === 'nanami' || f.type === 'nanami') {
    const themeColor = f.color || '#D4AF37';

    // Skill 1: Decisive Strike (Ratio Lunge)
    const baseLungeMax = f.lungeCooldownMax || CONFIG.nanami?.lungeCooldown || 200;
    const lungeTimer = f.lungeCooldown !== undefined ? f.lungeCooldown : 0;
    let lungePct = 0;
    let lungeReady = false;

    if (f.isLunging) {
      const lungeDuration = f.lungeMaxTimer || CONFIG.nanami?.lungeDuration || 16;
      const remainingLunge = f.lungeTimer !== undefined ? f.lungeTimer : 0;
      lungePct = Math.max(0, Math.min(100, (1 - (remainingLunge / lungeDuration)) * 100));
      lungeReady = true;
    } else if (f.ratioHitPauseTimer && f.ratioHitPauseTimer > 0) {
      lungePct = 100;
      lungeReady = true;
    } else {
      const refundMult = CONFIG.nanami?.lungeCooldownRefundMultiplier || 0.50;
      const isRefunded = (lungeTimer <= Math.round(baseLungeMax * refundMult) && lungeTimer > 0 && f.isOvertimeActive);
      const effectiveMax = isRefunded ? Math.round(baseLungeMax * refundMult) : baseLungeMax;

      lungePct = Math.max(0, Math.min(100, (1 - (lungeTimer / effectiveMax)) * 100));
      lungeReady = lungePct >= 99;
    }

    // Skill 2: Collapse (Falling Rubble)
    const collapseMax = f.collapseCooldownMax || CONFIG.nanami?.collapseCooldown || 600;
    const collapseTimer = f.collapseCooldown !== undefined ? f.collapseCooldown : 0;
    const collapsePct = Math.max(0, Math.min(100, (1 - (collapseTimer / collapseMax)) * 100));

    // Ultimate: 4-Fold Black Flash Blitz
    const ultMax = f.ultimateCooldownMax || CONFIG.nanami?.ultimateCooldown || 2000;
    const ultTimer = f.ultimateCooldown !== undefined ? f.ultimateCooldown : ultMax;
    const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));

    // Overtime Passive Gauge
    let overtimePct = 0;
    let overtimeReady = f.isOvertimeActive;
    let overtimeLabel = f.isOvertimeActive ? 'OVERTIME (120%)' : 'WORK SHIFT (85%)';

    if (f.isOvertimeActive) {
      overtimePct = 100;
      overtimeReady = true;
    } else {
      const elapsed = f.roundElapsedFrames || 0;
      const targetFrames = (CONFIG.nanami?.overtimeThresholdSeconds || 25) * 60;
      overtimePct = Math.max(0, Math.min(100, (elapsed / targetFrames) * 100));
      overtimeReady = overtimePct >= 99;
    }

    return [
      { id: 'lunge',    pct: lungePct,    ready: lungeReady,        color: themeColor, label: 'DECISIVE STRIKE' },
      { id: 'collapse', pct: collapsePct, ready: collapsePct >= 99, color: themeColor, label: 'COLLAPSE' },
      { id: 'blitz',    pct: ultPct,      ready: ultPct >= 99,      color: themeColor, label: '4-FOLD BLACK FLASH' },
      { id: 'overtime', pct: overtimePct, ready: overtimeReady,     color: themeColor, label: overtimeLabel }
    ];
  }
  if (f.characterId === 'saitama' || f.type === 'saitama') {
    const themeColor = '#F5C400';
    const skillMax = CONFIG.saitama?.skillPunishCooldown || 2000;
    const skillTimer = f.skillPunishCooldown !== undefined ? f.skillPunishCooldown : 0;
    const skillPct = Math.max(0, Math.min(100, (1 - (skillTimer / skillMax)) * 100));

    return [
      { id: 'counter', pct: skillPct, ready: skillPct >= 99, color: themeColor, label: 'Serious Punch' }
    ];
  }
  if (f.characterId === 'genos' || f.type === 'genos') {
    const themeColor = '#FF5500';

    const maxAmmo = f.maxHeatAmmo || CONFIG.genos?.maxHeatAmmo || 20;
    const currentAmmo = f.heatAmmo !== undefined ? f.heatAmmo : maxAmmo;
    let ammoPct = 0;
    let ammoReady = false;
    let ammoLabel = 'HEAT AMMO';
    if (f.ammoReloadTimer > 0) {
      const reloadMax = f.ammoReloadMax || CONFIG.genos?.ammoReloadFrames || 300;
      ammoPct = Math.max(0, Math.min(100, (1 - (f.ammoReloadTimer / reloadMax)) * 100));
      ammoReady = false;
      ammoLabel = 'RELOADING AMMO...';
    } else {
      ammoPct = Math.max(0, Math.min(100, (currentAmmo / maxAmmo) * 100));
      ammoReady = currentAmmo > 0;
    }

    const flurryMax = CONFIG.genos?.flurryCooldown || 480;
    const flurryTimer = f.flurryCooldown !== undefined ? f.flurryCooldown : 0;
    const flurryPct = Math.max(0, Math.min(100, (1 - (flurryTimer / flurryMax)) * 100));

    const ultMax = CONFIG.genos?.ultCooldown || 1680;
    const ultTimer = f.ultCooldown !== undefined ? f.ultCooldown : 0;
    const ultPct = Math.max(0, Math.min(100, (1 - (ultTimer / ultMax)) * 100));

    let sdPct = 0;
    let sdReady = false;
    let sdColor = '#FF3300';
    let sdLabel = 'CORE OVERLOAD';

    if (f.isSelfDestructing) {
      const sdMax = CONFIG.genos?.selfDestructCountdownFrames || 150;
      const remaining = f.selfDestructTimer || 0;
      sdPct = Math.max(0, Math.min(100, (remaining / sdMax) * 100));
      sdReady = true;
      sdColor = '#FF0000';
      sdLabel = 'OVERLOAD DETONATING...';
    } else if (f.usedSelfDestruct) {
      sdPct = 0;
      sdReady = false;
      sdColor = '#555555';
      sdLabel = 'OVERLOAD USED';
    } else {
      const threshold = 0.10;
      const currentHpRatio = f.hp / f.maxHp;
      if (currentHpRatio <= threshold) {
        sdPct = 100;
        sdReady = true;
        sdColor = '#FF3300';
        sdLabel = 'CORE OVERLOAD READY';
      } else {
        sdPct = Math.max(0, Math.min(100, ((1 - currentHpRatio) / (1 - threshold)) * 100));
        sdReady = false;
        sdColor = '#FF5500';
        sdLabel = 'CORE OVERLOAD';
      }
    }

    return [
      { id: 'ammo',         pct: ammoPct,   ready: ammoReady,       color: '#FF8800', label: ammoLabel },
      { id: 'flurry',       pct: flurryPct, ready: flurryPct >= 99, color: themeColor, label: 'MACHINE GUN BLOWS' },
      { id: 'ult',          pct: ultPct,    ready: ultPct >= 99,    color: themeColor, label: 'INCINERATION CANNON' },
      { id: 'selfdestruct', pct: sdPct,     ready: sdReady,        color: sdColor,   label: sdLabel }
    ];
  }
  if (f.characterId === 'cronos' || f.type === 'cronos') {
    const themeColor = f.color || '#00e5ff';
    const sphereMax = CONFIG.cronos?.sphereCooldown || 1200;
    const sphereTimer = f.sphereCooldown !== undefined ? f.sphereCooldown : sphereMax;
    const spherePct = Math.max(0, Math.min(100, (1 - (sphereTimer / sphereMax)) * 100));
    return [{ id: 'sphere', pct: spherePct, ready: spherePct >= 99, color: themeColor, label: 'TIME SPHERE' }];
  }
  if (f.characterId === 'musashi' || f.type === 'musashi') {
    const themeColor = f.color || '#3cb371';
    const flurryMax = CONFIG.musashi?.flurryCooldown || 900;
    const flurryTimer = f.flurryCooldown !== undefined ? f.flurryCooldown : flurryMax;
    const flurryPct = Math.max(0, Math.min(100, (1 - (flurryTimer / flurryMax)) * 100));
    return [{ id: 'flurry', pct: flurryPct, ready: flurryPct >= 99, color: themeColor, label: 'NITEN ICHIRYU FLURRY' }];
  }
  if (f.characterId === 'yuta' || f.type === 'yuta') {
    const themeColor = '#ff69b4';

    let rikaPct = 0;
    const rk = f.rika;
    const isInsideDomain = f.domainActive || f.isChannelingDomain;
    const alreadySummoned = rk && rk.hasSummonedAt50Hp;

    if (rk && rk.active && !rk.isDying) {
      const maxHp = rk.maxHp || CONFIG.yuta?.rikaMaxHp || 500;
      rikaPct = Math.max(0, Math.min(100, (rk.hp / maxHp) * 100));
      f._maxRikaPct = 0;
    } else if (f.rikaCallTimer > 0 || (rk && rk.chargeTimer > 0)) {
      rikaPct = 100;
      f._maxRikaPct = 100;
    } else if (alreadySummoned) {
      const baseline = f.rikaRechargeHpBaseline !== undefined ? f.rikaRechargeHpBaseline : f.hp;
      const reqDamage = (f.maxHp || 200) * (CONFIG.yuta?.rikaRechargeHpRatio ?? 0.20);
      const damageTaken = Math.max(0, baseline - f.hp);
      rikaPct = Math.max(0, Math.min(100, (damageTaken / reqDamage) * 100));
    } else {
      const threshold = CONFIG.yuta?.rikaSummonHpThreshold ?? 0.60;
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

    const domainHpThreshold = CONFIG.yuta?.domainHpThreshold ?? 0.60;
    let domainPct;
    if (f.isChannelingDomain) {
      domainPct = 100;
    } else if (f.domainActive) {
      const domainDuration = CONFIG.yuta?.domainDuration || 500;
      const remaining = f.domainTimer || 0;
      domainPct = Math.max(0, Math.min(100, (remaining / domainDuration) * 100));
    } else if (f.domainUseCount === 0) {
      domainPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - domainHpThreshold)) * 100));
    } else if (f.domainUseCount === 1) {
      const hpNeeded = (f.maxHp || 200) * (CONFIG.yuta?.domain2HpDamageRequired ?? 0.75);
      const hpLost = f.domain2DamageTaken || 0;
      domainPct = Math.max(0, Math.min(100, (hpLost / hpNeeded) * 100));
    } else {
      domainPct = 0;
    }

    let beamPct = 0;
    const beamCdTimer = f.pureLoveBeamCooldownTimer || 0;
    const beamCdMax = CONFIG.yuta?.pureLoveBeamCooldown || 1200;
    if (f.isChannelingPureLoveBeam || (f.rikaEmergingForBeamTimer || 0) > 0) {
      beamPct = 100; // Stay 100% full during Rika emergence & beam windup!
    } else if (f.isFiringPureLoveBeam) {
      f._maxBeamPct = 0;
      beamPct = 0; // Drain to 0 only while laser beam is actively blasting!
    } else if (f.hasUsedPureLoveBeam) {
      if (beamCdTimer > 0) {
        beamPct = Math.max(0, Math.min(100, (1 - (beamCdTimer / beamCdMax)) * 100));
      } else {
        beamPct = 100; // Reload completed — stays 100% ready until next cast!
      }
    } else if (beamCdTimer > 0) {
      beamPct = Math.max(0, Math.min(100, (1 - (beamCdTimer / beamCdMax)) * 100));
    } else {
      // First fill before first cast: monotonically fills up as Yuta takes damage down to 15% HP
      const beamThreshold = CONFIG.yuta?.pureLoveBeamHpThreshold ?? 0.60;
      const rawBeamPct = Math.max(0, Math.min(100, ((1 - (f.hp / f.maxHp)) / (1 - beamThreshold)) * 100));
      f._maxBeamPct = Math.max(f._maxBeamPct || 0, rawBeamPct);
      beamPct = f._maxBeamPct;
    }

    if (checkHasTeammate(f)) {
      return [
        { id: 'domain', pct: domainPct, ready: domainPct >= 99 && !f.domainActive,   color: themeColor, label: 'AUTHENTIC MUTUAL LOVE' },
        { id: 'beam',   pct: beamPct,   ready: beamPct >= 99 && (rk && rk.active) && beamCdTimer <= 0, color: themeColor, label: 'PURE LOVE BEAM' }
      ];
    }

    return [
      { id: 'rika',   pct: rikaPct,   ready: rikaPct >= 99 && (!rk || !rk.active), color: themeColor, label: 'RIKA SUMMON' },
      { id: 'domain', pct: domainPct, ready: domainPct >= 99 && !f.domainActive,   color: themeColor, label: 'AUTHENTIC MUTUAL LOVE' },
      { id: 'beam',   pct: beamPct,   ready: beamPct >= 99 && (rk && rk.active) && beamCdTimer <= 0, color: themeColor, label: 'PURE LOVE BEAM' }
    ];
  }
  if (f.characterId === 'gunslinger' || f.type === 'gunslinger') {
    const themeColor = f.color || '#eab308';
    let pct = 0;

    if (f.isReloading) {
      const reloadTime = CONFIG.gunslinger?.reloadTime || 90;
      pct = Math.max(0, Math.min(100, (f.reloadTimer / reloadTime) * 100));
    } else {
      pct = Math.max(0, Math.min(100, (1 - (f.magazineBullets || 0) / (f.maxMagazine || 24)) * 100));
    }

    return [
      { id: 'rapidfire', pct: pct, ready: pct >= 99 && !f.isReloading, color: themeColor, label: 'RAPID FIRE' }
    ];
  }

  if (f.characterId === 'laser' || f.type === 'laser') {
    const themeColor = f.color || '#ffaa00';
    const windupMax = CONFIG.laser?.windupDuration || 150;
    const beamMax = CONFIG.laser?.beamDuration || 100;
    const cooldownMax = f.shootCooldownMax || CONFIG.laser?.cooldown || 300;

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

  if (f.characterId === 'zeus' || f.type === 'zeus') {
    const themeColor = f.color || '#00BFFF';
    
    const aegisMax = CONFIG.zeus?.aegisCooldown || 300;
    const aegisTimer = f.aegisCooldown || 0;
    const aegisPct = Math.max(0, Math.min(100, (1 - (aegisTimer / aegisMax)) * 100));
    const aegisReady = aegisPct >= 99;

    const stormMax = CONFIG.zeus?.stormCooldown || 900;
    const stormTimer = f.stormCooldown !== undefined ? f.stormCooldown : stormMax;
    let stormPct = 0;
    let stormReady = false;

    if (f.isChargingStorm) {
      const teleMax = CONFIG.zeus?.stormTelegraphFrames || 120;
      stormPct = Math.max(0, Math.min(100, (1 - f.stormCooldown / teleMax) * 100));
      stormReady = false;
    } else if (f.stormActive) {
      const durationMax = CONFIG.zeus?.stormDuration || 130;
      stormPct = Math.max(0, Math.min(100, (f.stormTimer / durationMax) * 100));
      stormReady = false;
    } else {
      stormPct = Math.max(0, Math.min(100, (1 - (stormTimer / stormMax)) * 100));
      stormReady = stormPct >= 99;
    }

    return [
      { id: 'aegis', pct: aegisPct, ready: aegisReady, color: themeColor, label: 'AEGIS SHIELD' },
      { id: 'storm', pct: stormPct, ready: stormReady, color: themeColor, label: 'ULTIMATE STORM' }
    ];
  }

  if (f.characterId === 'doppleganger' || f.characterId === 'doppelganger' || f.type === 'doppleganger' || f.type === 'doppelganger') {
    return [];
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
  
  const color = f.color || '#a491d3';
  const def = f.fighterIndex !== undefined ? FIGHTER_DEFS[f.fighterIndex] : null;
  const label = (def && def.name) ? def.name.toUpperCase() : (f.type ? f.type.toUpperCase() : 'SKILL');

  return [
    { id: 'skill', pct: skillPct, ready: skillPct >= 99, color: color, label: label }
  ];
}
