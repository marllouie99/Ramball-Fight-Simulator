import { CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';

/**
 * Universal Skill Descriptor
 * Represents a single ability, mode, transformation, domain, or buff on a fighter.
 */
export class Skill {
  /**
   * @param {Object} def Skill definition object
   * @param {SkillManager} manager Owning SkillManager instance
   */
  constructor(def = {}, manager = null) {
    this.manager = manager;
    this.id = def.id;
    this.name = def.name || def.id;
    this.type = def.type || 'active'; // 'active' | 'transformation' | 'mode' | 'buff' | 'ultimate' | 'domain' | 'passive'

    // Property keys on the fighter instance
    this.cooldownKey = def.cooldownKey || null;
    this.cooldownMax = def.cooldownMax || 0;
    this.cooldownMaxKey = def.cooldownMaxKey || null;

    this.durationKey = def.durationKey || null;
    this.durationMax = def.durationMax || 0;
    this.durationMaxKey = def.durationMaxKey || null;

    this.activeKey = def.activeKey || null;
    this.channelingKey = def.channelingKey || def.chargeKey || null;
    this.channelTimerKey = def.channelTimerKey || def.chargeTimerKey || null;
    this.channelMaxKey = def.channelMaxKey || def.chargeMaxKey || null;

    // Stasis & debuff policies
    // Active skill durations continue ticking down during Gojo domain / time-stop (per user requirement)
    this.canTickInFreeze = def.canTickInFreeze !== undefined ? def.canTickInFreeze : true;
    // Skill cooldowns are frozen during time-stop stasis unless explicitly exempt (e.g. allowsFrozenCooldownTick: true)
    this.canTickCooldownInFreeze = Boolean(def.canTickCooldownInFreeze || def.allowsFrozenCooldownTick);
    this.isImmuneToSilence = Boolean(def.isImmuneToSilence);
    this.bypassParalyze = Boolean(def.bypassParalyze);
    this.cooldownDecayMultiplier = def.cooldownDecayMultiplier || null;

    // Lifecycle callbacks
    this.onActivate = def.onActivate || null;
    this.onTick = def.onTick || null;
    this.onExpire = def.onExpire || null;
    this.onFrozenTick = def.onFrozenTick || null;
    this.canCast = def.canCast || null;
    this.getHudData = def.getHudData || null;

    this.customData = def.customData || {};
  }

  get fighter() {
    return this.manager ? this.manager.fighter : null;
  }

  getCooldown() {
    if (!this.fighter || !this.cooldownKey) return 0;
    return this.fighter[this.cooldownKey] || 0;
  }

  setCooldown(val) {
    if (!this.fighter || !this.cooldownKey) return;
    this.fighter[this.cooldownKey] = Math.max(0, val);
  }

  getMaxCooldown() {
    if (!this.fighter) return typeof this.cooldownMax === 'number' ? this.cooldownMax : 0;
    if (this.cooldownMaxKey && this.fighter[this.cooldownMaxKey] !== undefined) {
      return this.fighter[this.cooldownMaxKey];
    }
    if (typeof this.cooldownMax === 'function') {
      return this.cooldownMax(this.fighter, this);
    }
    return this.cooldownMax || 0;
  }

  getDuration() {
    if (!this.fighter || !this.durationKey) return 0;
    return this.fighter[this.durationKey] || 0;
  }

  setDuration(val) {
    if (!this.fighter || !this.durationKey) return;
    this.fighter[this.durationKey] = Math.max(0, val);
  }

  getMaxDuration() {
    if (!this.fighter) return typeof this.durationMax === 'number' ? this.durationMax : 0;
    if (this.durationMaxKey && this.fighter[this.durationMaxKey] !== undefined) {
      return this.fighter[this.durationMaxKey];
    }
    if (typeof this.durationMax === 'function') {
      return this.durationMax(this.fighter, this);
    }
    return this.durationMax || 0;
  }

  isActive() {
    if (!this.fighter) return false;
    if (this.activeKey) {
      return Boolean(this.fighter[this.activeKey]);
    }
    if (this.durationKey) {
      return (this.fighter[this.durationKey] || 0) > 0;
    }
    return false;
  }

  setActive(val) {
    if (!this.fighter) return;
    if (this.activeKey) {
      this.fighter[this.activeKey] = Boolean(val);
    }
  }

  isChanneling() {
    if (!this.fighter) return false;
    if (this.channelingKey && this.fighter[this.channelingKey]) return true;
    if (this.channelTimerKey && (this.fighter[this.channelTimerKey] || 0) > 0) return true;
    return false;
  }

  isReady() {
    if (this.getCooldown() > 0) return false;
    if (this.canCast && !this.canCast(this.fighter, this)) return false;
    return true;
  }
}

/**
 * Universal Centralized Skill Manager
 * Single source of truth for all fighter skills, cooldowns, active transformations, durations, and HUD metrics.
 */
export class SkillManager {
  // Known legacy duration keys to ensure full backward compatibility across all legacy fighters
  static _KNOWN_LEGACY_DURATION_KEYS = [
    'bankaiTimer', 'hollowMaskTimer', 'bankaiRibbonTimer',
    'takadaUltTimer', 'takadaDanceTimer',
    'soulSwapTimer',
    'jetpackTimer', 'baguvixTimer',
    'stormTimer',
    'rageTimer',
    'hybridModeTimer',
    'sphereTimer',
    'ultimateFireTimer',
    'chainTimer',
    'ransotengaiTimer', 'vollstandigTimer',
    'resurreccionTimer',
    'stolenTimer',
    'beamTimer',
    'overtimeWatchTimer', 'overtimeGuaranteedCritTimer', 'overtimeSpeechTimer',
    'pureLoveBeamActiveTimer', 'rctHealTimer', 'rctRevivalTimer',
    'domainTimer', 'transformDuration', 'evasionTimer', 'submergeTimer', 'eruptTimer',
    'flameAuraTimer'
  ];

  /**
   * @param {import('../fighter.js').Fighter} fighter Owning fighter instance
   */
  constructor(fighter) {
    this.fighter = fighter;
    this.skills = new Map(); // Map<string, Skill>
    this.cooldownKeyMap = new Map(); // Map<string, Skill>
    this.durationKeyMap = new Map(); // Map<string, Skill>
    this.activeKeyMap = new Map(); // Map<string, Skill>

    this._lastCooldownTickFrame = -1;
    this._lastDurationTickFrame = -1;
  }

  /**
   * Declaratively registers a skill with the manager.
   * @param {Object} skillDef Skill definition descriptor
   * @returns {Skill}
   */
  registerSkill(skillDef) {
    if (!skillDef || !skillDef.id) return null;
    const skill = new Skill(skillDef, this);
    this.skills.set(skill.id, skill);

    if (skill.cooldownKey) {
      this.cooldownKeyMap.set(skill.cooldownKey, skill);
      if (this.fighter[skill.cooldownKey] === undefined) {
        this.fighter[skill.cooldownKey] = 0;
      }
    }
    if (skill.durationKey) {
      this.durationKeyMap.set(skill.durationKey, skill);
      if (this.fighter[skill.durationKey] === undefined) {
        this.fighter[skill.durationKey] = 0;
      }
    }
    if (skill.activeKey) {
      this.activeKeyMap.set(skill.activeKey, skill);
      if (this.fighter[skill.activeKey] === undefined) {
        this.fighter[skill.activeKey] = false;
      }
    }

    return skill;
  }

  /**
   * Batch registers multiple skills.
   * @param {Array<Object>} skillDefs
   */
  registerSkills(skillDefs) {
    if (!Array.isArray(skillDefs)) return;
    for (const def of skillDefs) {
      this.registerSkill(def);
    }
  }

  getSkill(id) {
    return this.skills.get(id) || null;
  }

  hasSkill(id) {
    return this.skills.has(id);
  }

  hasSkills() {
    return this.skills.size > 0;
  }

  getAllSkills() {
    return Array.from(this.skills.values());
  }

  /**
   * Universal cooldown ticking engine.
   * Centralizes Black Flash zone haste, silence debuffs, paralyze guards, and freeze stasis rules.
   */
  tickCooldowns(isFrozen = false, isInsideGojoDomain = false) {
    const currentFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : (this.fighter && typeof this.fighter._getFrameId === 'function' ? this.fighter._getFrameId() : null);
    if (currentFrame !== null && this._lastCooldownTickFrame === currentFrame) return;
    if (currentFrame !== null) this._lastCooldownTickFrame = currentFrame;

    // Dodge cooldowns and passive reflexes must ALWAYS tick down even while time-stopped
    if (this.fighter.dodgeCooldown > 0) this.fighter.dodgeCooldown--;

    const isParalyzed = Boolean(typeof this.fighter.isParalyzedDebuffActive === 'function' && this.fighter.isParalyzedDebuffActive());
    const isSilenced = Boolean(this.fighter.silenceTimer && this.fighter.silenceTimer > 0);
    const isEvading = Boolean(this.fighter.isEvading || this.fighter.isPreSplitting || (this.fighter.owner && (this.fighter.owner.isEvading || this.fighter.owner.isPreSplitting)));

    if (isEvading) return; // All skill cooldowns freeze during Evasion state

    // Calculate global decay multiplier (e.g. 1.20x in Black Flash zone)
    const globalDecay = (this.fighter.blackFlashTimer > 0)
      ? (CONFIG.blackFlash?.zone?.cooldownDecayMultiplier ?? 1.20)
      : 1.0;

    // 1. Tick all explicitly registered skills
    for (const skill of this.skills.values()) {
      if (isFrozen && !skill.canTickCooldownInFreeze) continue;
      if (isParalyzed && !skill.bypassParalyze) continue;
      if (isSilenced && !skill.isImmuneToSilence) continue;

      if (skill.cooldownKey) {
        const curCd = skill.getCooldown();
        if (curCd > 0) {
          const decay = skill.cooldownDecayMultiplier !== null ? skill.cooldownDecayMultiplier : globalDecay;
          skill.setCooldown(Math.max(0, curCd - decay));
        }
      }
    }

    // 2. Dynamic discovery for legacy unregistered cooldown keys on fighter instance (100% backward compatibility)
    if (!isParalyzed && !isSilenced) {
      for (const key in this.fighter) {
        if (this.cooldownKeyMap.has(key)) continue; // Already processed above
        if (key.endsWith('Cooldown') || key.endsWith('CooldownTimer') || key.endsWith('CD') || key === 'shootCooldown' || key === 'attackCooldown' || key === 'meleeCooldown') {
          if (key === 'timeStopTimer' || key === 'basicAttackHitPauseTimer' || key === 'hitStunTimer' || key === 'electricStunTimer' || key === 'dubstepStunTimer' || key === 'crimsonElectrifiedTimer' || key === 'purpleHitTimer') continue;
          if (typeof this.fighter[key] === 'number' && this.fighter[key] > 0) {
            this.fighter[key] = Math.max(0, this.fighter[key] - globalDecay);
          }
        }
      }
    }
  }

  /**
   * Universal active duration and transformation decay engine.
   * Decrements active skill timers each frame (both normal and inside domain freeze),
   * automatically triggers onExpire callbacks, and resets active flags.
   */
  tickDurations(isFrozen = false, isInsideGojoDomain = false) {
    const currentFrame = (typeof state !== 'undefined' && state.frameCount !== undefined) ? state.frameCount : (this.fighter && typeof this.fighter._getFrameId === 'function' ? this.fighter._getFrameId() : null);
    if (currentFrame !== null && this._lastDurationTickFrame === currentFrame) return;
    if (currentFrame !== null) this._lastDurationTickFrame = currentFrame;

    // 1. Process explicitly registered skills
    for (const skill of this.skills.values()) {
      if (isFrozen && !skill.canTickInFreeze) continue;
      // Do not drain active duration if skill is in channeling / transition windup phase
      if (skill.channelTimerKey && (this.fighter[skill.channelTimerKey] || 0) > 0) continue;
      if (skill.channelingKey && typeof this.fighter[skill.channelingKey] === 'number' && this.fighter[skill.channelingKey] > 0) continue;

      if (skill.durationKey) {
        let curDur = skill.getDuration();
        if (curDur > 0) {
          curDur--;
          skill.setDuration(curDur);

          if (isFrozen && typeof skill.onFrozenTick === 'function') {
            skill.onFrozenTick(this.fighter, skill, isInsideGojoDomain);
          }

          if (curDur <= 0) {
            if (typeof skill.onExpire === 'function') {
              skill.onExpire(this.fighter, skill);
            }
            skill.setActive(false);
          }
        }
      }
    }

    // 2. Legacy unregistered duration keys decay (100% backward compatibility)
    for (const key of SkillManager._KNOWN_LEGACY_DURATION_KEYS) {
      if (this.durationKeyMap.has(key)) continue; // Already processed above
      if (typeof this.fighter[key] === 'number' && this.fighter[key] > 0) {
        this.fighter[key]--;
      }
    }

    // 3. Delegate to fighter's legacy onFrozenSkillDurationTick hook if defined
    if (isFrozen && typeof this.fighter.onFrozenSkillDurationTick === 'function') {
      this.fighter.onFrozenSkillDurationTick(isInsideGojoDomain);
    }
  }

  /**
   * Main per-frame update loop for skills.
   */
  update(isFrozen = false, isInsideGojoDomain = false) {
    this.tickDurations(isFrozen, isInsideGojoDomain);
    this.tickCooldowns(isFrozen, isInsideGojoDomain);

    // If not frozen, execute active/channeling skill onTick callbacks
    if (!isFrozen) {
      for (const skill of this.skills.values()) {
        if ((skill.isActive() || skill.isChanneling()) && typeof skill.onTick === 'function') {
          skill.onTick(this.fighter, skill);
        }
      }
    }
  }

  /**
   * Universally halts and cancels all active skill channeling, charge timers, and windups.
   */
  interruptAll(forceCancelAll = false) {
    for (const skill of this.skills.values()) {
      if (skill.channelingKey && this.fighter[skill.channelingKey]) {
        this.fighter[skill.channelingKey] = false;
      }
      if (skill.channelTimerKey && (this.fighter[skill.channelTimerKey] || 0) > 0) {
        this.fighter[skill.channelTimerKey] = 0;
      }
    }
  }

  /**
   * Universally resets all skill cooldowns and active states to baseline values.
   */
  reset() {
    this._lastCooldownTickFrame = -1;
    this._lastDurationTickFrame = -1;

    for (const skill of this.skills.values()) {
      if (skill.durationKey) skill.setDuration(0);
      if (skill.activeKey) skill.setActive(false);
      if (skill.channelingKey) this.fighter[skill.channelingKey] = false;
      if (skill.channelTimerKey) this.fighter[skill.channelTimerKey] = 0;
      if (skill.cooldownKey) {
        const maxCd = skill.getMaxCooldown();
        skill.setCooldown(maxCd);
      }
    }
  }

  /**
   * Standardized HUD skill data generator.
   * @param {string} themeColor Primary character color theme
   * @param {Function} getProjectiles Projectile list getter
   * @returns {Array<{id: string, pct: number, ready: boolean, color: string, label: string}>}
   */
  getHudSkillData(themeColor = '#00E5FF', getProjectiles = null) {
    const hudItems = [];
    for (const skill of this.skills.values()) {
      if (skill.type === 'passive' && !skill.customData.showOnHud) continue;

      if (typeof skill.getHudData === 'function') {
        const customHud = skill.getHudData(this.fighter, skill, themeColor, getProjectiles);
        if (customHud) {
          if (Array.isArray(customHud)) hudItems.push(...customHud);
          else hudItems.push(customHud);
          continue;
        }
      }

      const maxCd = skill.getMaxCooldown();
      const curCd = skill.getCooldown();
      let pct = 100;

      if (skill.isActive() && skill.durationKey) {
        const maxDur = skill.getMaxDuration();
        const curDur = skill.getDuration();
        pct = maxDur > 0 ? Math.max(0, Math.min(100, (curDur / maxDur) * 100)) : 100;
      } else if (maxCd > 0) {
        pct = Math.max(0, Math.min(100, (1 - (curCd / maxCd)) * 100));
      }

      const ready = skill.isReady() || skill.isActive();
      hudItems.push({
        id: skill.id,
        pct: pct,
        ready: ready,
        color: themeColor,
        label: skill.name.toUpperCase(),
        active: skill.isActive()
      });
    }

    return hudItems;
  }
}
