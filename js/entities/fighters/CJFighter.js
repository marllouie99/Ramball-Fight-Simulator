// ─────────────────────────────────────────────
// Carl "CJ" Johnson — The Grove Street Cheatmaster
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { drawCjSkin } from '../../graphics/fighters/cjSkin.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { projectileSystem } from '../../systems/projectileSystem.js';

export class CJFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'cj';
    this.type = 'cj';

    const cfg = CONFIG.cj || {};

    // ── Combat & Punch Variables (Brass Knuckles CQC) ──
    this.punchAnimTimer = 0;
    this.punchMaxTime = cfg.meleePunchCooldown || 18;
    this.punchAnimHand = 0; // 0 = lead jab (front hand), 1 = cross hook (back hand)
    this.meleeCooldown = 0;
    this.meleeCooldownMax = cfg.meleePunchCooldown || 18;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // ── Dual Micro-Uzi Weapons (Jetpack Mode) ──
    this.uziSide = 0; // 0 = right/front gun, 1 = left/back gun
    this.uziFireCooldown = 0;
    this.uziRecoilFront = 0;
    this.uziRecoilBack = 0;
    this.uziFlashTimerFront = 0;
    this.uziFlashTimerBack = 0;

    // ── Passive: RESPECT+ & Cheat Code Dialer ──
    this.respect = 0;
    this.maxRespect = cfg.maxRespect || 100;
    this.hasTriggeredTier1 = false;  // 50% Respect threshold
    this.hasTriggeredTier2 = false;  // 100% Respect threshold ("Grove Street OG")
    this.isGroveStreetOg = false;
    this.respectAuraTimer = 0;

    // ── Cheat Code Walking & Spelled-Out Typing System ──
    this.isTypingCheat = false;
    this.cheatCodeString = '';
    this.cheatTypedChars = 0;
    this.cheatTypingTimer = 0;
    this.cheatTypingMaxTimer = 0;
    this.cheatPostDelayTimer = 0;
    this.cheatActionCallback = null;

    // ── Skill 1: HESOYAM (Once Per Round) ──
    this.hasUsedHesoyam = false;
    this.hesoyamCooldownMax = cfg.hesoyamCooldown || 420;
    this.hesoyamCooldown = this.hesoyamCooldownMax; // Starts on cooldown initially
    this.hesoyamShield = 0;
    this.hesoyamMaxShield = cfg.hesoyamShieldAmount || 75;

    // ── Skill 2: ROCKETMAN Jetpack & Dual Micro-Uzis ──
    this.isJetpackActive = false;
    this.jetpackTimer = 0;
    this.jetpackMaxTimer = cfg.jetpackDuration || 270;
    this.jetpackCooldown = 0;
    this.jetpackCooldownMax = cfg.jetpackCooldown || 570;
    this.jetpackDiveCooldown = 0;
    this.evadeBuffTimer = 0;
    this.evadeChance = 0;

    // ── Skill 3: GROVESTREET4LIFE Drive-By ──
    this.driveByCooldown = 0;
    this.driveByCooldownMax = cfg.driveByCooldown || 600;

    // ── Ultimate: BAGUVIX God Mode & Minigun ──
    this.isBaguvixActive = false;
    this.isGodModeActive = false;
    this.baguvixTimer = 0;
    this.baguvixMaxTimer = cfg.baguvixDuration || 300;
  }

  /**
   * Passive: RESPECT+ Accumulation & Tier Progression (Permanent Buffs)
   */
  gainRespect(amount) {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};
    const prev = this.respect;
    this.respect = Math.min(this.maxRespect, this.respect + amount);

    // Tier 1: 50% Respect Threshold ("STREET HUSTLER" - Permanent)
    if (this.respect >= 50 && prev < 50 && !this.hasTriggeredTier1) {
      this.hasTriggeredTier1 = true;
      this.speedMultiplier = 1 + (cfg.respectSpeedBoost || 0.15);
      spawnFloatingText(this.x, this.y - this.r - 18, 'RESPECT+', '#22C55E');
      this.respectAuraTimer = 60;
      audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 0.85);
    }

    // Tier 2: 100% Respect Threshold ("GROVE STREET OG" - Permanent)
    if (this.respect >= 100 && prev < 100 && !this.hasTriggeredTier2) {
      this.hasTriggeredTier2 = true;
      this.isGroveStreetOg = true;
      this.speedMultiplier = 1 + (cfg.respectSpeedBoost || 0.15) + 0.05;

      // Cooldown refund (1.5s / 90 frames off active skills)
      this.hesoyamCooldown = Math.max(0, this.hesoyamCooldown - 90);
      this.jetpackCooldown = Math.max(0, this.jetpackCooldown - 90);
      this.driveByCooldown = Math.max(0, this.driveByCooldown - 90);

      // Attack speed boost (25% faster punch recovery)
      const atkSpdReduction = cfg.respectAttackSpeedBoost || 0.25;
      this.meleeCooldownMax = Math.max(10, Math.round((cfg.meleePunchCooldown || 18) * (1 - atkSpdReduction)));

      // Trigger authentic GTA San Andreas top-left indicator box for Respect gain
      state.cheatNotification = {
        text: 'Respect +',
        timer: 140,
        maxTimer: 140
      };

      this.respectAuraTimer = 180;
      audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 1.0);
    }
  }

  /**
   * Helper to trigger a GTA San Andreas Cheat Notification & FX
   */
  triggerCheat(codeName, subtitle = '') {
    // Set authentic GTA San Andreas top-left arena notification box
    state.cheatNotification = {
      text: 'Cheat activated',
      timer: 140,
      maxTimer: 140
    };
    if (subtitle) {
      spawnFloatingText(this.x, this.y - this.r - 20, subtitle, '#22C55E');
    }
    audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 0.95);
  }

  /**
   * Damage mitigation & shield absorption
   */
  takeDamage(amount, attacker) {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};

    // 1. BAGUVIX: 100% God Mode Invulnerability
    if (this.isBaguvixActive || this.isGodModeActive) {
      spawnFloatingText(this.x, this.y - this.r - 12, 'BAGUVIX!', '#F59E0B');
      audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.7);
      return;
    }

    // 2. HESOYAM: Kevlar Armor Shield absorbs incoming damage first (Permanent until broken by damage)
    if (this.hesoyamShield > 0) {
      if (this.hesoyamShield >= amount) {
        this.hesoyamShield -= amount;
        spawnFloatingText(this.x, this.y - this.r - 10, `-${Math.round(amount)}`, '#38BDF8');
        audioSystem.playSFX('Assets/Sound Effects/Skills/shieldblock.mp3', 0.65);
        this.gainRespect(cfg.respectGainOnHit || 4);
        return;
      } else {
        const remaining = amount - this.hesoyamShield;
        spawnFloatingText(this.x, this.y - this.r - 10, 'ARMOR BREAK!', '#38BDF8');
        this.hesoyamShield = 0;
        amount = remaining;
      }
    }

    // 3. Grove Street OG: 10% Flat Damage Resistance
    if (this.isGroveStreetOg) {
      amount *= (1 - (cfg.respectDefenseBoost || 0.10));
    }

    // Build Respect when absorbing combat damage
    this.gainRespect(cfg.respectGainOnHit || 4);

    super.takeDamage(amount, attacker);
  }

  /**
   * Main Fighter Update Loop
   * Rule 1 Compliant (Early exit on freeze/time-stop)
   */
  update(opponent, ownerIndex, arena) {
    if (this.dead) return;

    // Rule 1: TimeStop & Ambush early exit guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    const cfg = CONFIG.cj || {};

    // Update combat, respect & uzi weapon timers
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.meleeCooldown > 0) this.meleeCooldown--;
    if (this.respectAuraTimer > 0) this.respectAuraTimer--;
    if (this.hesoyamCooldown > 0) this.hesoyamCooldown--;
    if (!this.isJetpackActive && this.jetpackCooldown > 0) this.jetpackCooldown--;
    if (this.driveByCooldown > 0) this.driveByCooldown--;

    // Micro-Uzi recoil and muzzle flash decay
    if (this.uziRecoilFront > 0) this.uziRecoilFront = Math.max(0, this.uziRecoilFront - 0.7);
    if (this.uziRecoilBack > 0) this.uziRecoilBack = Math.max(0, this.uziRecoilBack - 0.7);
    if (this.uziFlashTimerFront > 0) this.uziFlashTimerFront--;
    if (this.uziFlashTimerBack > 0) this.uziFlashTimerBack--;
    if (this.uziFireCooldown > 0) this.uziFireCooldown--;

    // ── Skill 2: ROCKETMAN Jetpack Flight Physics & Thruster Dynamics ──
    if (this.isJetpackActive) {
      this.jetpackTimer--;

      // Elevation hover oscillation (noticeable floating gap above ground shadow)
      const time = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.006;
      this.z = 28 + Math.sin(time) * 5;

      // Dynamic flight speed boost
      const baseRespectBoost = this.respect >= 50 ? (cfg.respectSpeedBoost || 0.15) : 0;
      this.speedMultiplier = (1 + baseRespectBoost) * (cfg.jetpackSpeedMultiplier || 1.30);

      // Thruster ground burn AOE trail behind CJ
      if (this.jetpackTimer % 5 === 0) {
        this._emitJetpackThrusterBurn(arena);
      }

      // Dual Micro-Uzi Rapid Airborne Strafe Fire (Alternate Left/Right barrels)
      if (opponent && !opponent.dead && opponent.hp > 0) {
        if (typeof this.aim === 'function') {
          this.aim(opponent);
        }
        const d = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (this.uziFireCooldown <= 0 && d <= (cfg.jetpackUziRange || 340)) {
          this._fireJetpackUzi(opponent);
        }
      }

      // Supersonic Knuckle Dive Bomb Thruster Strike AI (if in close-medium range)
      if (this.jetpackDiveCooldown > 0) {
        this.jetpackDiveCooldown--;
      } else if (opponent && !opponent.dead && opponent.hp > 0 && this.meleeCooldown <= 0) {
        const d = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (d > 85 && d < 250) {
          this._executeJetpackDive(opponent);
        }
      }

      // Maintain Airborne Evade Buff during Jetpack Flight
      this.evadeBuffTimer = this.jetpackTimer;
      this.evadeChance = cfg.jetpackEvadeChance ?? 0.50;

      // Flight time expired: Land back down
      if (this.jetpackTimer <= 0) {
        this.isJetpackActive = false;
        this.z = 0;
        this.evadeBuffTimer = 0;
        this.evadeChance = 0;
        this.speedMultiplier = 1 + (this.respect >= 50 ? (cfg.respectSpeedBoost || 0.15) : 0);
        this.jetpackCooldown = this.jetpackCooldownMax;
      }
    } else {
      this.z = 0;
      if (this.evadeChance > 0 && !this.isJetpackActive) {
        this.evadeChance = 0;
        this.evadeBuffTimer = 0;
      }
    }

    // Update God Mode status
    if (this.isBaguvixActive) {
      this.baguvixTimer--;
      if (this.baguvixTimer <= 0) {
        this.isBaguvixActive = false;
        this.isGodModeActive = false;
      }
    }

    // ── Update Cheat Typing Phase (Stationary / Standing in Place) ──
    if (this.isTypingCheat) {
      const framesPerChar = cfg.cheatTypingFramesPerChar || 14;

      // Stationary: Stop all movement while typing
      this.vx = 0;
      this.vy = 0;
      this.punchAnimTimer = 0;

      if (this.cheatPostDelayTimer > 0) {
        // Post-activation brief pose delay before resuming action
        this.cheatPostDelayTimer--;

        if (this.cheatPostDelayTimer <= 0) {
          this.isTypingCheat = false;
        }
      } else {
        this.cheatTypingTimer++;
        const targetChars = Math.min(this.cheatCodeString.length, Math.floor(this.cheatTypingTimer / framesPerChar));
        if (targetChars > this.cheatTypedChars) {
          this.cheatTypedChars = targetChars;
          // Keystroke click SFX
          audioSystem.playSFX('Assets/Sound Effects/Skills/mahoraga-wheelclick.mp3', 0.24);
        }

        // Keep aiming at opponent while standing in place
        const target = opponent || null;
        if (target && typeof this.aim === 'function') {
          this.aim(target);
        }

        // Typing finished & full-word confirmation delay held: Trigger cheat effect!
        if (this.cheatTypingTimer >= this.cheatTypingMaxTimer) {
          if (typeof this.cheatActionCallback === 'function') {
            const cb = this.cheatActionCallback;
            this.cheatActionCallback = null;
            cb();
          }
          this.cheatPostDelayTimer = cfg.cheatActivationPostDelay || 18;
        }
      }
    }

    // ── Skill 1: HESOYAM Activation Condition (Strictly Once Per Round Based on Lost HP) ──
    if (!this.hasUsedHesoyam && this.hesoyamCooldown <= 0 && !this.dead && !this.isTypingCheat) {
      const maxHp = this.maxHp || 440;
      const lostHp = maxHp - this.hp;
      const hpRatio = this.hp / maxHp;
      const hpThreshold = cfg.hesoyamHpThreshold ?? 0.70;
      const minLostRatio = cfg.hesoyamMinLostPercent ?? 0.25;

      // Only activates once per round when CJ has lost significant HP
      if (lostHp >= maxHp * minLostRatio || hpRatio <= hpThreshold) {
        this.activateHesoyam();
      }
    }

    // ── Skill 2: ROCKETMAN Jetpack Activation Condition ──
    if (!this.isJetpackActive && this.jetpackCooldown <= 0 && !this.dead && !this.isTypingCheat) {
      if (opponent && !opponent.dead && opponent.hp > 0) {
        const d = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (d > 70) {
          this.activateRocketman();
        }
      }
    }

    // Call base physics & AI update
    super.update(opponent, ownerIndex, arena);
    if (this.isTypingCheat) {
      this.vx = 0;
      this.vy = 0;
    }
    this._updateMeleeCombat(opponent, arena);
  }

  /**
   * Enters cheat code typing state.
   * CJ stands firmly in place while dynamically spelling out the cheat string above his model.
   */
  startCheatTyping(codeString, onComplete) {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};
    const framesPerChar = cfg.cheatTypingFramesPerChar || 14;
    const holdDelay = cfg.cheatTypingHoldDelay || 24; // Confirmation pause with full word displayed
    this.isTypingCheat = true;
    this.cheatCodeString = codeString.toUpperCase();
    this.cheatTypedChars = 0;
    this.cheatTypingTimer = 0;
    this.cheatTypingMaxTimer = (this.cheatCodeString.length * framesPerChar) + holdDelay;
    this.cheatPostDelayTimer = 0;
    this.cheatActionCallback = onComplete;
    this.punchAnimTimer = 0;
  }

  /**
   * Skill 1: HESOYAM ($250k Cash, Instant Heal, Armor Shield & Shockwave - Once Per Round)
   */
  activateHesoyam() {
    if (this.dead || this.isTypingCheat || this.hasUsedHesoyam) return;
    this.hasUsedHesoyam = true;

    this.startCheatTyping('HESOYAM', () => {
      this._executeHesoyam();
    });
  }

  _executeHesoyam() {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};

    // Drain skill bar completely upon activation to start cooldown recharge
    this.hesoyamCooldown = this.hesoyamCooldownMax;

    // 1. Instant HP Heal (% of Max HP, Permanent)
    const healPercent = cfg.hesoyamHealPercent ?? 0.50;
    const maxHp = this.maxHp || 440;
    const healAmt = maxHp * healPercent;
    const prevHp = this.hp;
    this.hp = Math.min(maxHp, this.hp + healAmt);
    const actualHealed = this.hp - prevHp;

    // Trigger pop-out vibrant green heal glow pulse, DOM heal bubble popup, & micro-pulse on HUD health bar
    if (actualHealed > 0) {
      this._lastHealAmount = actualHealed; // Triggers DOM .hud-heal-bubble popup on the health bar!
      this._healthBarHealTimer = 30; // Triggers pop-out green heal glow pulse on HUD health bar
      this._healthBarShakeTimer = 8;
    }

    // 2. Equip / Refresh Bulletproof Kevlar Shield (Permanent until broken by damage)
    this.hesoyamShield = cfg.hesoyamShieldAmount || 75;

    // 3. Trigger Cheat Display & Floating Texts
    this.triggerCheat('HESOYAM', '+$250,000 | HEALTH & ARMOR');
    if (actualHealed > 0) {
      spawnFloatingText(this.x + (Math.random() - 0.5) * 16, this.y - this.r - 28, `+${Math.round(actualHealed)}`, '#00FF66');
    }
    spawnFloatingText(this.x, this.y - this.r - 42, '+$250,000', '#22C55E');

    // 4. Rule 6 Unified Query: $250k AOE Cash Blast Shockwave
    const radius = cfg.hesoyamShockwaveRadius || cfg.hesoyamRadius || 160;
    const dmg = cfg.hesoyamShockwaveDamage || cfg.hesoyamDamage || 35;
    const kb = cfg.hesoyamKnockback || 22;

    const allCandidates = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];
    const myIndex = state.fighters ? state.fighters.indexOf(this) : 0;
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;

    for (const ent of allCandidates) {
      if (!ent || ent === this || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

      if (typeof state.getFighterTeam === 'function') {
        if (ent.owner) {
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
          if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
        } else {
          const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
          if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
        }
      }

      const dx = ent.x - this.x;
      const dy = ent.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= radius + (ent.r || 20)) {
        // Deal AOE blast damage
        if (typeof ent.takeDamage === 'function') {
          ent.takeDamage(dmg, this, { isSkill: true });
        }

        // Apply radial knockback push away from CJ (hesoyamKnockback)
        const angle = Math.atan2(dy, dx);
        ent.vx = (ent.vx || 0) + Math.cos(angle) * kb;
        ent.vy = (ent.vy || 0) + Math.sin(angle) * kb;

        // Visual impacts
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(ent.x, ent.y, 35, '#22C55E');
        }
        if (typeof spawnSparks === 'function') {
          spawnSparks(ent.x, ent.y, '#4ADE80', 10);
        }
      }
    }

    // CJ Centered Visuals & Screen Shake
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(this.x, this.y, 65, '#22C55E');
    }
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(6, 6);
    }
    audioSystem.playSFX('Assets/Sound Effects/Skills/enhance.mp3', 1.0);

    // Build Respect on successful skill activation
    this.gainRespect(cfg.hesoyamRespectGain || 15);
  }

  /**
   * Skill 2: ROCKETMAN / YECGAA (DARPA Area 69 Jetpack Flight & Sonic Thrust Dive)
   */
  activateRocketman() {
    if (this.dead || this.isTypingCheat || this.isJetpackActive) return;

    this.startCheatTyping('ROCKETMAN', () => {
      this._executeRocketman();
    });
  }

  _executeRocketman() {
    if (this.dead) return;
    const cfg = CONFIG.cj || {};
    this.isJetpackActive = true;
    this.jetpackTimer = this.jetpackMaxTimer;
    this.jetpackCooldown = this.jetpackCooldownMax;
    this.jetpackDiveCooldown = 25;

    // Trigger authentic GTA San Andreas cheat notification
    this.triggerCheat('ROCKETMAN', 'JETPACK FLIGHT ACTIVE');

    // Rocket ignition and thrust SFX
    audioSystem.playSFX('Assets/Sound Effects/Skills/fugaignite.mp3', 0.85);
    audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.90);

    // Visual ignition burst & sparks
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(this.x, this.y, 45, '#F97316');
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(this.x, this.y, '#38BDF8', 12);
    }

    this.gainRespect(cfg.jetpackRespectGain || 10);
  }

  _executeJetpackDive(opponent) {
    if (this.dead || !opponent || opponent.dead) return;
    const cfg = CONFIG.cj || {};
    const angle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    if (typeof this.aim === 'function') {
      this.aim(opponent);
    }

    // Supersonic kinematic dash boost
    const diveSpeed = cfg.jetpackDiveDashSpeed || 16.0;
    this.vx = Math.cos(angle) * diveSpeed;
    this.vy = Math.sin(angle) * diveSpeed;
    this.jetpackDiveCooldown = 55; // ~0.9s cooldown between dive punches

    // Trigger punch animation and audio
    this.punchAnimHand = (this.punchAnimHand === 0) ? 1 : 0;
    this.punchAnimTimer = this.punchMaxTime;
    this.meleeCooldown = this.meleeCooldownMax;

    audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.95);
    audioSystem.playSFX('Assets/Sound Effects/Attacks/heavypunch3.mp3', 1.0);
  }

  _emitJetpackThrusterBurn(arena) {
    const cfg = CONFIG.cj || {};
    const burnDmg = cfg.jetpackThrusterBurnDamage || 6;
    const angle = (this.gunAngle || this.angle || 0);
    const backX = this.x - Math.cos(angle) * (this.r * 1.15);
    const backY = this.y - Math.sin(angle) * (this.r * 1.15);

    const allCandidates = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];

    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(state.fighters.indexOf(this)) : null;

    for (const ent of allCandidates) {
      if (!ent || ent === this || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

      if (typeof state.getFighterTeam === 'function') {
        if (ent.owner) {
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
          if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
        } else {
          const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
          if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
        }
      }

      const d = Math.hypot(ent.x - backX, ent.y - backY);
      if (d <= (this.r + 28)) {
        if (typeof ent.takeDamage === 'function') {
          ent.takeDamage(burnDmg, this, { isMelee: false });
        } else {
          ent.hp -= burnDmg;
        }
        spawnFloatingText(ent.x, ent.y - ent.r - 10, `${burnDmg}`, '#EA580C');
        if (typeof spawnSparks === 'function') {
          spawnSparks(ent.x, ent.y, '#F97316', 3);
        }
      }
    }
  }

  /**
   * Fires high-velocity alternating Dual Micro-Uzi bursts during Jetpack flight
   */
  _fireJetpackUzi(opponent) {
    if (this.dead || (typeof state !== 'undefined' && state.gameState !== 'playing')) return;
    const cfg = CONFIG.cj || {};
    const isFront = (this.uziSide === 0);
    this.uziSide = (this.uziSide === 0) ? 1 : 0; // Alternate between front and back guns
    this.uziFireCooldown = cfg.jetpackUziFireInterval || 5;

    const angle = this.gunAngle || this.angle || 0;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const perpX = -sinA;
    const perpY = cosA;

    const sideDist = isFront ? (this.r * 0.38) : (-this.r * 0.42);
    const forwardDist = this.r * 0.95 + 24;
    const spawnX = this.x + cosA * forwardDist + perpX * sideDist;
    const spawnY = (this.y - (this.z || 0)) + sinA * forwardDist + perpY * sideDist;

    const spread = (Math.random() - 0.5) * (cfg.jetpackUziSpread || 0.07);
    const bulletAngle = angle + spread;
    const speed = cfg.jetpackUziBulletSpeed || 23.0;
    const dmg = cfg.jetpackUziBulletDamage || 8;

    const myIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : 0;
    if (typeof projectileSystem !== 'undefined' && projectileSystem) {
      projectileSystem.fireProjectile(this, myIndex, dmg, false, speed, false, 'cjUziBullet', spawnX, spawnY, bulletAngle);
    }

    if (isFront) {
      this.uziFlashTimerFront = 3;
      this.uziRecoilFront = 4.5;
    } else {
      this.uziFlashTimerBack = 3;
      this.uziRecoilBack = 4.5;
    }

    audioSystem.playSFX('Assets/Sound Effects/Attacks/revolvershot.mp3', 0.60);
    if (typeof spawnSparks === 'function') {
      spawnSparks(spawnX, spawnY, '#F59E0B', 3);
    }
  }

  /**
   * CQC Brass Knuckles Punch Combat (Rule 6 Unified Queries & Rule 8 Frontal Arc Multi-Target)
   */
  _updateMeleeCombat(opponent, arena) {
    if (this.dead || this.isTypingCheat) return;

    // ── 1. Rule 6 Unified Target Query: Find Closest Living Enemy Target ──
    let activeTarget = opponent;
    const myIndex = state.fighters ? state.fighters.indexOf(this) : 0;
    const myTeam = (typeof state.getFighterTeam === 'function') ? state.getFighterTeam(myIndex) : null;
    let minDist = (activeTarget && !activeTarget.dead && activeTarget.hp > 0)
      ? Math.hypot(activeTarget.x - this.x, activeTarget.y - this.y)
      : Infinity;

    const allCandidates = [
      ...(state.fighters || []),
      ...(state.illusions || [])
    ];

    for (const ent of allCandidates) {
      if (!ent || ent === this || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

      if (typeof state.getFighterTeam === 'function') {
        if (ent.owner) {
          const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
          if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
        } else {
          const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
          if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
        }
      }

      const d = Math.hypot(ent.x - this.x, ent.y - this.y);
      if (d < minDist) {
        minDist = d;
        activeTarget = ent;
      }
    }

    if (!activeTarget || activeTarget.dead || activeTarget.hp <= 0) return;

    // ── 2. Reach & Aim Alignment (Rule 3) ──
    const cfg = CONFIG.cj || {};
    const reach = (cfg.meleePunchReach || 80) + (this.isJetpackActive ? 30 : 0);
    const distToTarget = Math.hypot(activeTarget.x - this.x, activeTarget.y - this.y);

    // Keep aim oriented toward the target
    if (typeof this.aim === 'function') {
      this.aim(activeTarget);
    }

    // Verify distance before executing punch strike
    if (distToTarget <= reach + (activeTarget.r || 20) && this.meleeCooldown <= 0) {
      // ── 3. Combo Step & Hand Alternation (Lead Jab vs Heavy Cross) ──
      this.punchAnimHand = (this.punchAnimHand === 0) ? 1 : 0;
      this.punchAnimTimer = this.punchMaxTime;
      this.meleeCooldown = this.meleeCooldownMax;

      const isHeavyCross = (this.punchAnimHand === 1);
      const aimAngle = this.gunAngle || Math.atan2(activeTarget.y - this.y, activeTarget.x - this.x);

      // Kinetic Forward Step / Momentum Lunge
      const lungeStep = isHeavyCross ? 3.8 : 2.5;
      this.vx = (this.vx || 0) + Math.cos(aimAngle) * lungeStep;
      this.vy = (this.vy || 0) + Math.sin(aimAngle) * lungeStep;

      // ── 4. Rule 8 Frontal Arc Multi-Target AOE Detection ──
      const arc = cfg.meleePunchArc || ((120 * Math.PI) / 180);
      const hitEntities = [];

      for (const ent of allCandidates) {
        if (!ent || ent === this || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === this) continue;

        if (typeof state.getFighterTeam === 'function') {
          if (ent.owner) {
            const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
            if (myTeam !== null && ownerTeam !== null && myTeam === ownerTeam) continue;
          } else {
            const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
            if (myTeam !== null && entTeam !== null && myTeam === entTeam) continue;
          }
        }

        const edx = ent.x - this.x;
        const edy = ent.y - this.y;
        const edist = Math.hypot(edx, edy);

        if (edist <= reach + (ent.r || 20)) {
          const entAngle = Math.atan2(edy, edx);
          let angleDiff = Math.abs(entAngle - aimAngle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          if (angleDiff <= arc / 2) {
            hitEntities.push(ent);
          }
        }
      }

      if (hitEntities.length === 0 && activeTarget && !activeTarget.dead) {
        hitEntities.push(activeTarget);
      }

      // ── 5. Apply Damage, Knockback, VFX & Respect to All Targets in Arc ──
      const basePunch = cfg.meleePunchDamage || 24;
      let baseDmg = isHeavyCross ? Math.round(basePunch * 1.25) : basePunch;
      if (this.isGroveStreetOg) {
        baseDmg = Math.round(baseDmg * (1 + (cfg.respectDamageBoost || 0.15)));
      }

      const baseKnock = cfg.meleeKnockback || 18.0;
      let baseKb = isHeavyCross ? Math.round(baseKnock * 1.22) : Math.round(baseKnock * 0.89);
      if (this.respect >= 50) {
        baseKb = Math.round(baseKb * (1 + (cfg.respectSpeedBoost || 0.15)));
      }

      for (const target of hitEntities) {
        if (typeof target.takeDamage === 'function') {
          target.takeDamage(baseDmg, this, { isMelee: true });
        }

        // Kinetic Pushback
        const kbAngle = Math.atan2(target.y - this.y, target.x - this.x);
        target.vx = (target.vx || 0) + Math.cos(kbAngle) * baseKb;
        target.vy = (target.vy || 0) + Math.sin(kbAngle) * baseKb;

        // Visual Spark FX & Impact Flash
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(target.x, target.y, isHeavyCross ? 34 : 26, '#F59E0B');
        }
        if (typeof spawnSparks === 'function') {
          spawnSparks(target.x, target.y, '#FEF08A', isHeavyCross ? 8 : 5);
        }

        // Build Respect upon landing punches
        const respectGain = isHeavyCross ? (cfg.respectGainPerPunch || 12) : ((cfg.respectGainPerPunch || 10));
        this.gainRespect(respectGain);
      }

      // Micro Screen Shake
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(isHeavyCross ? 6 : 3, isHeavyCross ? 6 : 4);
      }

      // Punch Audio SFX
      const punchSounds = [
        'Assets/Sound Effects/Attacks/heavypunch1.mp3',
        'Assets/Sound Effects/Attacks/heavypunch2.mp3',
        'Assets/Sound Effects/Attacks/heavypunch3.mp3'
      ];
      const soundFile = punchSounds[Math.floor(Math.random() * punchSounds.length)];
      audioSystem.playSFX(soundFile, isHeavyCross ? 1.0 : 0.85);
    }
  }

  /**
   * Demo attack trigger for Weapon Studio & Weapon Preview Screen
   */
  triggerDemoAttack() {
    this.punchAnimTimer = this.punchMaxTime;
    this.punchAnimHand = (this.punchAnimHand === 0) ? 1 : 0;
    this.meleeCooldown = this.meleeCooldownMax;
    audioSystem.playSFX('Assets/Sound Effects/Attacks/heavypunch1.mp3', 0.85);
  }

  interruptAttacks() {
    this.punchAnimTimer = 0;
  }

  /**
   * Basic Attack Shoot Override
   * Pure melee brawler: disables default gun projectiles during basic attacks.
   */
  shoot(ownerIndex) {
    return false;
  }

  /**
   * Damage Handler with Airborne Jetpack Evade Buff
   */
  takeDamage(amount, attacker, opts = {}) {
    const isGuaranteedHit = Boolean(opts && (opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassEvade || opts.isGuaranteedHit));
    const isHeal = opts.isHeal || amount < 0;

    // ── JETPACK AIRBORNE EVASION MECHANIC ──
    if (this.isJetpackActive && !isHeal && amount > 0 && !isGuaranteedHit) {
      const cfg = CONFIG.cj || {};
      const isTickOrBeam = Boolean(
        opts && (
          opts.isPureLoveBeam ||
          opts.isGenosBeam ||
          opts.isLaser ||
          opts.isLaserBeam ||
          opts.isBeam ||
          opts.isContinuous ||
          opts.isTickDamage ||
          opts.isTick ||
          opts.isBleed ||
          opts.fromBleed ||
          opts.isBurn ||
          opts.fromBurn ||
          opts.isPoison ||
          opts.isPurpleDPS ||
          opts.isDivineFlame ||
          opts.isDomain ||
          opts.isDomainSlash ||
          opts.fromDomain ||
          opts.fromBlackHole
        )
      ) || (typeof this.isCaughtInBeam === 'function' && this.isCaughtInBeam());

      const isEvadableAttack = !isTickOrBeam && (opts.isProjectile || opts.isMelee || opts.isBasicAttack || (!opts.isSkill && !opts.isUltimate && !opts.isDomain));

      if (isEvadableAttack) {
        const evadeChance = cfg.jetpackEvadeChance ?? 0.50;
        if (Math.random() < evadeChance) {
          const now = Date.now();
          if (!this._lastEvadeTextTime || now - this._lastEvadeTextTime > 150) {
            this._lastEvadeTextTime = now;
            spawnFloatingText(this.x, (this.y - (this.z || 0)) - this.r - 16, 'EVADE!', '#38BDF8');
            spawnSparks(this.x, this.y, '#38BDF8', 8);
            audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);

            // Reactive thruster micro-juke to evade attack
            const jukeAngle = Math.random() * Math.PI * 2;
            this.vx += Math.cos(jukeAngle) * 5.5;
            this.vy += Math.sin(jukeAngle) * 5.5;
          }
          return false; // Evaded!
        }
      }
    }

    return super.takeDamage(amount, attacker, opts);
  }

  /**
   * Draw Health Number Overlay (Anchored to elevated body when flying)
   */
  drawHealth(ctx) {
    if (typeof state !== 'undefined' && state.gameState === 'countdown') return;
    if (this.hp <= 0 || this._isWinnerReveal || this.hideHpText) return;

    const z = this.z || 0;
    ctx.save();
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hpText = Math.floor(this.hp).toString();
    const drawY = this.y - z;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(hpText, this.x, drawY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hpText, this.x, drawY);
    ctx.restore();
  }

  /**
   * Draw CJ skin & Body HP Overlay
   */
  drawBody(ctx) {
    drawCjSkin(ctx, this);
    this.drawHealth(ctx);
  }

  draw(ctx, opponent) {
    drawCjSkin(ctx, this);
    this.drawHealth(ctx);
  }
}
