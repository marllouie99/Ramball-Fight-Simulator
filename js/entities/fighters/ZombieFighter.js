// ─────────────────────────────────────────────
// ZOMBIE FIGHTER CLASS (Plants vs. Zombies)
// Adheres strictly to:
// - Rule 1.1: Freeze & TimeStop early exits
// - Rule 1.2: Centralized movement & physics standard
// - Rule 20: Symmetrical hand placement (±0.82r, +0.38r)
// - Rule 21: Mandatory in-game overhead HP & status drawing (drawHealth, drawFreezeTimer)
// - Rule 23: Mandatory basic projectile suppression (shoot override)
// - Rule 25: Mandatory non-freezing active visual effect decay before freeze guard
// - Rule 27: Mandatory lifesteal healthbar-only feedback standard (zero arena floating text)
// - Rule 30: 5-Phase melee combat animation, impact lock, & physical force drive
// ─────────────────────────────────────────────

import { Fighter } from '../fighter.js';
import { zombieConfig } from '../../configs/characters/zombieConfig.js';
import { drawZombieSkin } from '../../graphics/fighters/zombieSkin.js';
import {
  drawZombieChompEffect,
  drawZombieGravestone,
  drawZombieMinion,
  drawZombieWaveProgressBar,
  drawZombieWaveAlertBanner,
  drawZombieVictoryBanner,
  drawZombiesAteYourBrains,
} from '../../graphics/weapons/zombieWeaponGraphics.js';
import { playSound } from '../../systems/soundSystem.js';
import { AUDIO_CONFIG } from '../../configs/audioConfig.js';
import { triggerGlobalScreenShake, state, spawnFloatingText } from '../../core/state.js';

function _playZombieSound(key, volume = 0.8) {
  const path = (AUDIO_CONFIG && AUDIO_CONFIG[key]) || key;
  if (typeof playSound === 'function') {
    try {
      playSound(path, volume);
    } catch (e) {
      // Audio fallback
    }
  }
}

export class ZombieFighter extends Fighter {
  constructor(def) {
    super(def);

    this.characterId = 'zombie';
    this.type = 'zombie';

    // Core stats from centralized config
    this.r = zombieConfig.r || 25;
    this.radius = this.r;
    this.maxHp = zombieConfig.maxHp || 420;
    this.hp = this.maxHp;
    this.speed = zombieConfig.moveSpeed || 4.8;
    this.moveSpeed = this.speed;
    this.damage = zombieConfig.damage || 26;
    this.cooldown = zombieConfig.cooldown || 32;
    this.color = zombieConfig.color || '#65A30D';
    this.themeColor = zombieConfig.themeColor || '#65A30D';

    // Animation & walking state
    this.walkFrame = 0;
    this.walkTick = 0;
    this.chompFrame = 0;
    this.isChomping = false;
    this.chompTimer = 0;
    this.chompPhase = 0; // 0: idle, 1: coil, 2: hold, 3: strike, 4: impact lock, 5: recovery

    // Armor Shield System (Conehead / Buckethead)
    this.armorType = 'none'; // 'none' | 'cone' | 'bucket'
    this.armorShieldHp = 0;
    this.maxArmorShieldHp = 0;
    this.armorCooldown = 120;

    // Minion & Gravestone System
    this.gravestones = [];
    this.minions = [];
    this.summonCooldown = 180;

    // ── PvZ Survival Wave System ──
    // Every 20 seconds (1200 frames) a new wave arrives with new varieties.
    // At 60 seconds (3600 frames), the FINAL WAVE triggers.
    // The only way Zombie loses is when the player survives the Final Wave!
    this.survivalTimer = 0;
    this.waveNumber = 1;
    this.finalWaveTriggerFrames = zombieConfig.finalWaveFrames || 3600;
    this.isFinalWaveActive = false;
    this.finalWaveCleared = false;
    this.finalWaveSurvivalTimer = zombieConfig.finalWaveSurvivalFrames || 900; // 15s survival window

    // Cinematic Banners & Overlays
    this.waveBanner = null; // { text, subtext, timer, maxTimer, isFinal }
    this.victoryTimer = 0;
    this.brainsEatenTimer = 0;

    // Transient Visual Effects (Rule 25)
    this.activeVisualEffects = [];
  }

  /**
   * Overrides base Fighter.shoot() to suppress default generic bullet projectiles (Rule 23).
   */
  shoot(ownerIndex) {
    // Intentionally empty: Character uses dedicated 5-phase Chomp melee combos
  }

  /**
   * Main Zombie Update Loop
   */
  update(opponent, ownerIndex, arena) {
    // 0. Update transient visual effects before freeze guard (Rule 25)
    this._updateVisualEffects();
    this._updateMinions(opponent, arena);
    this._updateGravestones();

    if (this.waveBanner && this.waveBanner.timer > 0) {
      this.waveBanner.timer--;
    }
    if (this.victoryTimer > 0) this.victoryTimer--;
    if (this.brainsEatenTimer > 0) this.brainsEatenTimer--;

    // 1. Mandatory Rule 1 Freeze & TimeStop Guard (Rule 1.1)
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    // 2. Animate Shambling Walk Cycle
    this.walkTick++;
    if (this.walkTick % 8 === 0) {
      this.walkFrame = (this.walkFrame + 1) % 6;
    }

    // 3. Advance PvZ Survival Match Waves (Every 20 Seconds = 1200 frames)
    this._updateSurvivalTimeline(opponent, arena);

    // 4. Update Skills & Cooldowns
    if (this.armorCooldown > 0) this.armorCooldown--;
    if (this.summonCooldown > 0) this.summonCooldown--;

    // 5. AI Skill Activation Checks
    this._handleSkills(opponent, arena);

    // 6. 5-Phase Melee Chomp Attack Lifecycle (Rule 30)
    this._handleChompMelee(opponent);

    // 7. Aim direction toward opponent unless locked in impact
    if (opponent && this.chompPhase !== 4) {
      this.aim(opponent);
    }

    // 8. Centralized Movement & Physics (Rule 1.2)
    const speedMult = this.isFinalWaveActive ? 1.25 : 1.0;
    this.applyMovementPhysics(speedMult);
    this.resolveWallBounce(arena, opponent);

    // 9. Monitor Opponent Defeat -> Trigger "THE ZOMBIES ATE YOUR BRAINS!"
    if (opponent && opponent.hp <= 0 && this.brainsEatenTimer === 0) {
      this.brainsEatenTimer = 180;
      _playZombieSound('zombie_chomp', 1.0);
    }
  }

  /**
   * PvZ Survival Wave Timeline Engine:
   * Wave 1 (0:00 - 0:20): Regular & Coneheads
   * Wave 2 (0:20 - 0:40): "A HUGE WAVE IS APPROACHING!" + Screen Door & Buckethead
   * Wave 3 (0:40 - 1:00): "A HUGE WAVE IS APPROACHING!" + Newspaper & Pole Vaulter & Football
   * Final Wave (1:00+): "FINAL WAVE!" + Flag Zombie & All Varieties Swarm
   */
  _updateSurvivalTimeline(opponent, arena) {
    this.survivalTimer++;

    // ── Wave 2 Trigger at 20 Seconds (1200 frames) ──
    if (this.survivalTimer === 1200 && this.waveNumber < 2) {
      this.waveNumber = 2;
      this.waveBanner = {
        text: 'A HUGE WAVE OF ZOMBIES IS APPROACHING!',
        subtext: 'WAVE 2: SCREEN DOOR & BUCKETHEADS',
        timer: 120,
        maxTimer: 120,
        isFinal: false,
      };
      _playZombieSound('zombie_hugewave', 0.95);
      triggerGlobalScreenShake(4.0, 10);

      // Spawn Wave 2 Gravestones
      if (arena) {
        this._spawnGravestone(arena, 'screendoor');
        this._spawnGravestone(arena, 'buckethead');
      }

      // Upgrade boss armor
      this.armorType = 'bucket';
      this.armorShieldHp = 170;
      this.maxArmorShieldHp = 170;
    }

    // ── Wave 3 Trigger at 40 Seconds (2400 frames) ──
    if (this.survivalTimer === 2400 && this.waveNumber < 3) {
      this.waveNumber = 3;
      this.waveBanner = {
        text: 'A HUGE WAVE OF ZOMBIES IS APPROACHING!',
        subtext: 'WAVE 3: NEWSPAPER, POLE VAULTERS & FOOTBALL',
        timer: 120,
        maxTimer: 120,
        isFinal: false,
      };
      _playZombieSound('zombie_hugewave', 0.95);
      triggerGlobalScreenShake(4.5, 12);

      // Spawn Wave 3 Gravestones
      if (arena) {
        this._spawnGravestone(arena, 'newspaper');
        this._spawnGravestone(arena, 'polevaulter');
        this._spawnGravestone(arena, 'football');
      }
    }

    // ── Final Wave Trigger at 60 Seconds / 1 Minute (3600 frames) ──
    if (this.survivalTimer >= this.finalWaveTriggerFrames && !this.isFinalWaveActive) {
      this.isFinalWaveActive = true;
      this.waveNumber = 4;
      this.waveBanner = {
        text: 'THE FINAL WAVE IS APPROACHING!',
        subtext: 'SURVIVE THE ONSLAUGHT TO WIN!',
        timer: 180,
        maxTimer: 180,
        isFinal: true,
      };
      _playZombieSound('zombie_hugewave', 1.0);
      _playZombieSound('zombie_brains', 1.0);
      triggerGlobalScreenShake(6.0, 18);

      // Spawn Flag Zombie leader and massive horde
      if (arena) {
        this._spawnGravestone(arena, 'flag');
        this._spawnGravestone(arena, 'buckethead');
        this._spawnGravestone(arena, 'screendoor');
        this._spawnGravestone(arena, 'newspaper');
        this._spawnGravestone(arena, 'polevaulter');
      }
    }

    // ── Final Wave Survival Countdown (After 1 Minute) ──
    if (this.isFinalWaveActive && !this.finalWaveCleared) {
      this.finalWaveSurvivalTimer--;

      // Check if player has survived the final onslaught or eliminated all minions
      if (this.finalWaveSurvivalTimer <= 0) {
        this._triggerPlayerSurvivalVictory(opponent);
      }
    }
  }

  /**
   * Called when player successfully survives the Final Wave!
   */
  _triggerPlayerSurvivalVictory(opponent) {
    if (this.finalWaveCleared) return;
    this.finalWaveCleared = true;
    this.victoryTimer = 180;

    // Disintegrate all remaining minions into dirt
    this.minions.length = 0;
    this.gravestones.length = 0;

    _playZombieSound('zombie_groan', 0.70);
    triggerGlobalScreenShake(5.0, 12);

    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, this.y - 45, 'YOU SURVIVED THE HORDE!', '#FBBF24', 28);
    }

    // Defeat the zombie boss cleanly
    this.hp = 0;
    super.onDeath();
  }

  /**
   * Handles Skill AI Decisions
   */
  _handleSkills(opponent, arena) {
    if (!opponent || !arena) return;

    // Skill 1: Equip Armor (Conehead / Buckethead)
    if (this.armorCooldown <= 0 && this.armorShieldHp <= 0) {
      if (this.waveNumber >= 2 || this.hp <= this.maxHp * 0.50) {
        this.armorType = 'bucket';
        this.armorShieldHp = zombieConfig.bucketArmorShield || 170;
        this.maxArmorShieldHp = this.armorShieldHp;
        _playZombieSound('zombie_metal_clank', 0.80);
      } else {
        this.armorType = 'cone';
        this.armorShieldHp = zombieConfig.coneArmorShield || 90;
        this.maxArmorShieldHp = this.armorShieldHp;
        _playZombieSound('zombie_brains', 0.75);
      }
      this.armorCooldown = zombieConfig.armorCooldownFrames || 450;
    }

    // Skill 2: Grave Awakening (Raise Zombie Minion)
    const maxActive = this.isFinalWaveActive ? 8 : (zombieConfig.maxMinions || 4);
    if (this.summonCooldown <= 0 && this.minions.length < maxActive) {
      // Pick variety based on current wave progression
      let variety = 'regular';
      if (this.waveNumber >= 3) {
        const pool = ['regular', 'conehead', 'screendoor', 'newspaper', 'polevaulter', 'football'];
        variety = pool[Math.floor(Math.random() * pool.length)];
      } else if (this.waveNumber >= 2) {
        const pool = ['regular', 'conehead', 'screendoor', 'buckethead'];
        variety = pool[Math.floor(Math.random() * pool.length)];
      } else {
        variety = Math.random() < 0.4 ? 'conehead' : 'regular';
      }

      this._spawnGravestone(arena, variety);
      this.summonCooldown = zombieConfig.summonCooldownFrames || 360;
    }
  }

  /**
   * 5-Phase Melee Chomp & Gnaw Attack Lifecycle (Rule 30)
   */
  _handleChompMelee(opponent) {
    if (!opponent) return;

    const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
    const reach = zombieConfig.chompReach || 68;

    // Trigger basic attack if close enough and cooldown ready
    if (!this.isChomping && this.cooldownTimer <= 0 && dist <= reach) {
      this.isChomping = true;
      this.chompPhase = 1; // Phase 1: Coil / Lift
      this.chompTimer = 0;
      this.cooldownTimer = zombieConfig.cooldown || 32;
      _playZombieSound('zombie_groan', 0.65);
    }

    if (!this.isChomping) return;

    this.chompTimer++;

    const liftF = zombieConfig.hitLiftFrames || 8;
    const holdF = zombieConfig.hitHoldFrames || 3;
    const strikeF = zombieConfig.hitStrikeFrames || 7;
    const lockF = zombieConfig.hitImpactLockFrames || 7;
    const recF = zombieConfig.hitRecoveryFrames || 12;

    const t1 = liftF;
    const t2 = t1 + holdF;
    const t3 = t2 + strikeF;
    const t4 = t3 + lockF;
    const t5 = t4 + recF;

    // Phase 1: Coil (Frame 0 to t1)
    if (this.chompTimer <= t1) {
      this.chompPhase = 1;
      this.chompFrame = 0;
    }
    // Phase 2: Poised Hold (t1 to t2)
    else if (this.chompTimer <= t2) {
      this.chompPhase = 2;
      this.chompFrame = 1; // Jaw unhinges open!
    }
    // Phase 3: Hypersonic Whip Strike / Snap (t2 to t3)
    else if (this.chompTimer <= t3) {
      this.chompPhase = 3;
      this.chompFrame = 2; // CHOMP snap!

      // Deliver damage at strike impact point
      if (this.chompTimer === t2 + Math.floor(strikeF * 0.50)) {
        this._deliverChompDamage(opponent);
      }
    }
    // Phase 4: Impact Lock / Latch (t3 to t4)
    else if (this.chompTimer <= t4) {
      this.chompPhase = 4;
      this.chompFrame = 3; // Teeth clamped in flesh

      // Physical velocity clamp (Rule 30)
      this.vx = 0;
      this.vy = 0;
    }
    // Phase 5: Recovery Settle (t4 to t5)
    else if (this.chompTimer <= t5) {
      this.chompPhase = 5;
      const recP = (this.chompTimer - t4) / recF;
      this.chompFrame = recP < 0.5 ? 4 : 5; // Chewing / swallow recoil
    }
    // Attack finished
    else {
      this.isChomping = false;
      this.chompPhase = 0;
      this.chompFrame = 0;
      this.chompTimer = 0;
    }
  }

  /**
   * Delivers Chomp Bite Damage, Lifesteal & Screen Shake
   */
  _deliverChompDamage(opponent) {
    if (!opponent) return;

    const angle = this.gunAngle || this.angle || 0;
    const reach = zombieConfig.chompReach || 68;
    const hitX = this.x + Math.cos(angle) * (this.r + 14);
    const hitY = this.y + Math.sin(angle) * (this.r + 14);

    // Spawn Chomp Visual Effect
    this.activeVisualEffects.push({
      type: 'chomp',
      x: hitX,
      y: hitY,
      angle: angle,
      size: 44,
      lifetime: 18,
      maxLifetime: 18,
    });

    _playZombieSound('zombie_chomp', 0.90);
    triggerGlobalScreenShake(3.0, 6);

    const dist = Math.hypot(opponent.x - hitX, opponent.y - hitY);
    if (dist <= reach + opponent.r) {
      const dmg = zombieConfig.damage || 26;
      opponent.takeDamage(dmg, this);

      // Hit-pause target exclusively (Rule 1.5)
      if (typeof opponent.applyTimeStop === 'function') {
        opponent.applyTimeStop(6);
      }

      // Mandatory Rule 27: Healthbar-only lifesteal (NO floating arena text!)
      const healAmount = zombieConfig.biteLifesteal || 12;
      this.hp = Math.min(this.maxHp, this.hp + healAmount);
      this._lastHealAmount = (this._lastHealAmount || 0) + healAmount;
      this._healthBarHealTimer = 16;
    }
  }

  /**
   * Spawns a Gravestone that erupts a Zombie minion of a designated variety
   */
  _spawnGravestone(arena, variety = 'regular') {
    const angle = (this.gunAngle || 0) + (Math.random() - 0.5) * 1.2;
    const gx = Math.max(arena.x + 40, Math.min(arena.x + arena.width - 40, this.x + Math.cos(angle) * (60 + Math.random() * 80)));
    const gy = Math.max(arena.y + 40, Math.min(arena.y + arena.height - 40, this.y + Math.sin(angle) * (60 + Math.random() * 80)));

    this.gravestones.push({
      x: gx,
      y: gy,
      riseTimer: 0,
      maxRise: 30,
      variety: variety,
      spawnedMinion: false,
    });

    _playZombieSound('crazydave_planting', 0.70);
  }

  /**
   * Updates Gravestone Lifecycle
   */
  _updateGravestones() {
    for (let i = this.gravestones.length - 1; i >= 0; i--) {
      const g = this.gravestones[i];
      g.riseTimer++;

      if (g.riseTimer >= g.maxRise && !g.spawnedMinion) {
        g.spawnedMinion = true;
        this._spawnMinionFromGrave(g.x, g.y, g.variety || 'regular');
      }

      // Settle into floor after minion emerges
      if (g.riseTimer > 240) {
        this.gravestones.splice(i, 1);
      }
    }
  }

  /**
   * Spawns a Zombie Minion with unique variety stats and behaviors
   */
  _spawnMinionFromGrave(x, y, variety = 'regular') {
    const cfg = (zombieConfig.varieties && zombieConfig.varieties[variety]) || zombieConfig.varieties.regular;

    const minion = {
      x: x,
      y: y,
      r: variety === 'football' ? 20 : (variety === 'screendoor' ? 19 : 17),
      variety: variety,
      hp: cfg.hp || 120,
      maxHp: cfg.hp || 120,
      speed: cfg.speed || (variety === 'newspaper' ? cfg.calmSpeed : 3.8),
      damage: cfg.damage || 14,
      walkFrame: 0,
      walkTick: 0,
      attackCooldown: 0,
      gunAngle: 0,
      lifetime: zombieConfig.minionDurationFrames || 1800,

      // Variety mechanics
      shieldHp: cfg.shieldHp || 0,        // Screen door shield
      paperHp: cfg.paperHp || 0,          // Newspaper
      isRaging: false,                    // Newspaper rage
      hasVaulted: false,                  // Pole vaulter
      isVaulting: false,
      vaultTimer: 0,
      vaultAltitude: 0,
    };

    this.minions.push(minion);
    _playZombieSound('zombie_groan', 0.60);
  }

  /**
   * Updates Active Zombie Minions (Screen Door, Newspaper, Pole Vaulter, Football, Flag)
   */
  _updateMinions(opponent, arena) {
    // Check if Flag Zombie is alive to grant aura buff
    const hasFlagZombie = this.minions.some(m => m.variety === 'flag');
    const auraSpeedBuff = hasFlagZombie ? 1.25 : 1.0;

    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      m.lifetime--;

      if (m.lifetime <= 0 || m.hp <= 0) {
        this.minions.splice(i, 1);
        continue;
      }

      m.walkTick++;
      if (m.walkTick % (m.isRaging ? 4 : 8) === 0) {
        m.walkFrame = (m.walkFrame + 1) % 6;
      }

      if (m.attackCooldown > 0) m.attackCooldown--;

      if (opponent) {
        const dx = opponent.x - m.x;
        const dy = opponent.y - m.y;
        const dist = Math.hypot(dx, dy);
        m.gunAngle = Math.atan2(dy, dx);

        // ── Pole Vaulting Mechanic ──
        if (m.variety === 'polevaulter' && !m.hasVaulted) {
          if (!m.isVaulting && dist <= 85) {
            m.isVaulting = true;
            m.vaultTimer = 0;
            _playZombieSound('zombie_vault', 0.85);
          }

          if (m.isVaulting) {
            m.vaultTimer++;
            const p = m.vaultTimer / 28;
            m.vaultAltitude = Math.sin(p * Math.PI) * 44;

            // Leap over target in direction of angle
            m.x += Math.cos(m.gunAngle) * 6.5;
            m.y += Math.sin(m.gunAngle) * 6.5;

            if (p >= 1.0) {
              m.isVaulting = false;
              m.hasVaulted = true;
              m.vaultAltitude = 0;
              m.speed = 3.6; // Drops pole and walks normally
            }
            continue; // Bypass standard movement while vaulting
          }
        }

        // Standard Minion Movement & Combat
        const effectiveSpeed = m.speed * auraSpeedBuff;
        if (dist > (m.r + opponent.r + 6)) {
          m.x += (dx / dist) * effectiveSpeed;
          m.y += (dy / dist) * effectiveSpeed;
        } else if (m.attackCooldown <= 0) {
          // Deliver minion bite
          opponent.takeDamage(m.damage, this);
          m.attackCooldown = m.isRaging ? 25 : 45;

          // Football Zombie Knockback Shoulder Tackle
          if (m.variety === 'football') {
            opponent.vx += (dx / dist) * 10;
            opponent.vy += (dy / dist) * 10;
            triggerGlobalScreenShake(2.5, 5);
          }

          _playZombieSound('zombie_chomp', 0.65);
        }
      }

      // Arena wall clamping
      if (arena) {
        m.x = Math.max(arena.x + m.r, Math.min(arena.x + arena.width - m.r, m.x));
        m.y = Math.max(arena.y + m.r, Math.min(arena.y + arena.height - m.r, m.y));
      }
    }
  }

  /**
   * Unique PvZ Undead Survival Mortality Standard:
   * "THE ONLY WAY THE ZOMBIE WILL LOSE THE MATCH IS WHEN THE PLAYER SURVIVES THE WAVE"
   * Before 1 Minute: Zombie resurrects from gravestones!
   * After 1 Minute: Zombie can be defeated to win!
   */
  takeDamage(amount, attacker, opts = {}) {
    // 1. Armor Shield Absorption (Conehead & Buckethead)
    if (this.armorShieldHp > 0) {
      const reduction = zombieConfig.armorDamageReduction || 0.30;
      const reducedAmount = amount * (1.0 - reduction);

      if (this.armorShieldHp >= reducedAmount) {
        this.armorShieldHp -= reducedAmount;
        if (this.armorType === 'bucket') {
          _playZombieSound('zombie_metal_clank', 0.75);
        } else {
          _playZombieSound('crazydave_pea_splat', 0.70);
        }
        return 0; // Shield absorbed all damage
      } else {
        const overflow = reducedAmount - this.armorShieldHp;
        this.armorShieldHp = 0;
        this.armorType = 'none';
        _playZombieSound('shield-break', 0.85);
        amount = overflow;
      }
    }

    // 2. Undead Rebirth Standard before 1 Minute:
    // If HP would drop to 0 before 1 minute (3600 frames), Zombie cannot die!
    if (this.hp - amount <= 0 && this.survivalTimer < this.finalWaveTriggerFrames) {
      this.hp = this.maxHp;
      this.armorType = this.waveNumber >= 2 ? 'bucket' : 'cone';
      this.armorShieldHp = this.armorType === 'bucket' ? 170 : 90;
      this.maxArmorShieldHp = this.armorShieldHp;

      // Spawn dramatic tombstone eruption at current location
      const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : { x: 45, y: 240, width: 450, height: 450 };
      this._spawnGravestone(arena, 'conehead');

      _playZombieSound('crazydave_planting', 0.85);
      _playZombieSound('zombie_brains', 0.90);
      triggerGlobalScreenShake(4.5, 10);

      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(this.x, this.y - 36, 'THE HORDE NEVER STOPS! SURVIVE UNTIL 1:00!', '#EF4444', 20);
      }
      return 0;
    }

    // 3. During Final Wave (or normal damage):
    const applied = super.takeDamage(amount, attacker, opts);

    // If killed after 1 Minute during Final Wave -> Player wins!
    if (this.hp <= 0 && this.survivalTimer >= this.finalWaveTriggerFrames) {
      this._triggerPlayerSurvivalVictory(attacker);
    }

    return applied;
  }

  /**
   * Decay Transient Visual Effects (Rule 25)
   */
  _updateVisualEffects() {
    for (let i = this.activeVisualEffects.length - 1; i >= 0; i--) {
      const fx = this.activeVisualEffects[i];
      fx.lifetime--;
      if (fx.lifetime <= 0) {
        this.activeVisualEffects.splice(i, 1);
      }
    }
  }

  /**
   * Interruption & CC Cleanup (Rule 25)
   */
  interruptAttacks(forceCancelAll = true) {
    this.isChomping = false;
    this.chompPhase = 0;
    this.chompTimer = 0;
    if (forceCancelAll && this.activeVisualEffects) {
      this.activeVisualEffects.length = 0;
    }
  }

  /**
   * Standard engine body hook (Rule 21)
   */
  drawBody(ctx) {
    drawZombieSkin(ctx, this);
  }

  /**
   * Main Zombie Rendering Pipeline (Rule 21)
   */
  draw(ctx, opponent) {
    if (!ctx) return;

    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : { x: 45, y: 240, width: 450, height: 450 };

    // 1. Draw Gravestones
    for (const g of this.gravestones) {
      drawZombieGravestone(ctx, g);
    }

    // 2. Draw Zombie Minions (All varieties)
    for (const m of this.minions) {
      drawZombieMinion(ctx, m);
    }

    // 3. Draw Zombie Main Body & Skin
    drawZombieSkin(ctx, this);

    // 4. Draw Active Chomp Effects
    for (const fx of this.activeVisualEffects) {
      if (fx.type === 'chomp') {
        drawZombieChompEffect(ctx, fx);
      }
    }

    // 5. Draw PvZ Survival Wave Progress Bar at Top
    drawZombieWaveProgressBar(ctx, this, arena);

    // 6. Draw Wave Alert Banners ("A HUGE WAVE OF ZOMBIES IS APPROACHING!" / "FINAL WAVE!")
    if (this.waveBanner && this.waveBanner.timer > 0) {
      drawZombieWaveAlertBanner(ctx, this.waveBanner, arena);
    }

    // 7. Draw Victory Banner if player survived the Final Wave
    if (this.victoryTimer > 0) {
      drawZombieVictoryBanner(ctx, this.victoryTimer, 180, arena);
    }

    // 8. Draw "THE ZOMBIES ATE YOUR BRAINS!" if opponent is defeated
    if (this.brainsEatenTimer > 0) {
      drawZombiesAteYourBrains(ctx, this.brainsEatenTimer, 180, arena);
    }

    // 9. Draw Armor Shield Bar below fighter if active
    if (this.armorShieldHp > 0 && this.maxArmorShieldHp > 0) {
      const shieldPct = Math.max(0, this.armorShieldHp / this.maxArmorShieldHp);
      const barW = this.r * 2.2;
      const barH = 5;
      const barX = this.x - barW / 2;
      const barY = this.y + this.r + 14;

      ctx.save();
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = this.armorType === 'bucket' ? '#94A3B8' : '#EA580C';
      ctx.fillRect(barX, barY, barW * shieldPct, barH);
      ctx.restore();
    }

    // 10. MANDATORY Rule 21: Overlay In-Game Floating HP & Status
    this.drawHealth(ctx);
    this.drawFreezeTimer(ctx);
  }
}
