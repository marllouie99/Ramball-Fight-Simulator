import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { drawCronosPreActivateBarrier, drawCronosSphereImpact, drawCronosSphereVisual } from '../../graphics/draw.js';
import { drawCronosCrescentBlade } from '../../graphics/weapons/cronosWeaponGraphics.js';
import { drawCronosSkin, drawCronosPixelBody } from '../../graphics/fighters/cronosSkin.js';
import { spatialGrid } from '../../systems/physics.js';

// Pre-seeded static array for Cronos manga action speed lines (Rule 16)
let _cronosSpeedLineSeeds = null;
function _getCronosSpeedLineSeeds() {
  if (!_cronosSpeedLineSeeds) {
    _cronosSpeedLineSeeds = [];
    const count = 22;
    for (let i = 0; i < count; i++) {
      _cronosSpeedLineSeeds.push({
        perpOffset: (Math.random() - 0.5) * 60, // Perpendicular spread ±30px
        lengthRatio: 0.5 + Math.random() * 0.5,
        speed: 1.2 + Math.random() * 0.8,
        phase: Math.random() * 100,
        thick: 1.2 + Math.random() * 1.0,
      });
    }
  }
  return _cronosSpeedLineSeeds;
}

function drawCronosSpeedLinesLocal(ctx, fighter) {
  const seeds = _getCronosSpeedLineSeeds();
  const aimAngle = fighter.meleeSwingActive ? fighter.meleeSwingAngle : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const now = Date.now();
  const backOffset = fighter.r * 1.1;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const perpX = -sinA;
  const perpY = cosA;

  ctx.save();
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const travel = (now * 0.05 * seed.speed + seed.phase) % 75;
    const norm = Math.abs(seed.perpOffset) / 30;
    const len = (45 + (1 - norm) * 45) * seed.lengthRatio;
    const halfLen = len * 0.5;

    const lineCenterX = fighter.x - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = fighter.y - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    // Theme palette: 4-slot pattern [Primary Cyan, Gold Accent, White Core, Dark Ink Line]
    let color;
    if (i % 4 === 0) color = '#00F3FF';
    else if (i % 4 === 1) color = '#FACC15';
    else if (i % 4 === 2) color = '#FFFFFF';
    else color = '#080F1E';

    ctx.fillStyle = color;
    ctx.beginPath();
    // 4-point filled double-tapered needle polygon
    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;
    const endX = lineCenterX + cosA * halfLen;
    const endY = lineCenterY + sinA * halfLen;
    const midX = lineCenterX + cosA * (halfLen * 0.15);
    const midY = lineCenterY + sinA * (halfLen * 0.15);
    const maxT = seed.thick * 0.5;

    ctx.moveTo(startX, startY);
    ctx.lineTo(midX + perpX * maxT, midY + perpY * maxT);
    ctx.lineTo(endX, endY);
    ctx.lineTo(midX - perpX * maxT, midY - perpY * maxT);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Cronos Fighter (Time Stop)
 * Close-combat fighter with time manipulation abilities.
 * 
 * Skill: Deploys a time stop sphere that freezes enemies and projectiles.
 * Cronos can move freely inside the sphere with increased speed.
 * Passive: Chance to stop enemy movement on hit and when attacked.
 * Can bounce inside his sphere with enhanced force.
 */
export class CronosFighter extends Fighter {
  constructor(def) {
    super(def);
    this.type = 'cronos';
    this.sphereActive = false;
    this.sphereTimer = 0;
    this.sphereCooldown = CONFIG.cronos.sphereCooldown;
    this.sphereImpactTimer = 0;
    this.sphereX = 0;
    this.sphereY = 0;
    this.meleeCooldown = 0;
    this.meleeSwingActive = false;
    this.meleeSwingTimer = 0;
    this.meleeSlashFadeTimer = 0;
    this.meleeSwingAngle = 0;
    this.meleeSwingDirection = -1; // -1 so first strike flips to 1 (top-to-bottom downward slash)
    this.doubleStrikeTimer = 0;
    this.attackSlashEffects = [];

    // Declarative Skill Registration
    this.skillManager.registerSkills([
      {
        id: 'time_sphere',
        name: 'Time Stop Sphere',
        type: 'mode',
        cooldownKey: 'sphereCooldown',
        cooldownMax: () => CONFIG.cronos.sphereCooldown,
        durationKey: 'sphereTimer',
        durationMax: () => CONFIG.cronos.sphereDuration,
        activeKey: 'sphereActive',
        onExpire: (fighter) => {
          if (typeof state !== 'undefined' && state.fighters) {
            for (const other of state.fighters) {
              if (other && other !== fighter && other.hp > 0 && other.timeStopTimer > 0) {
                if (other._frozenByCronosSphere) {
                  other.timeStopTimer = 0;
                  if (typeof other._resumeVx === 'number') other.vx = other._resumeVx;
                  if (typeof other._resumeVy === 'number') other.vy = other._resumeVy;
                  delete other._resumeVx;
                  delete other._resumeVy;
                  delete other._frozenByCronosSphere;
                }
                delete other._suppressFreezeTimer;
              }
            }
          }
          if (typeof projectileSystem !== 'undefined' && typeof projectileSystem.restoreFrozenProjectiles === 'function') {
            const ownerIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(fighter) : -1;
            projectileSystem.restoreFrozenProjectiles(ownerIndex);
          }
          fighter.sphereActive = false;
          fighter.speed = fighter.baseSpeed;
        }
      }
    ]);
  }

  reset() {
    super.reset();
    this.sphereActive = false;
    this.sphereTimer = 0;
    this.sphereCooldown = CONFIG.cronos.sphereCooldown;
    this.sphereImpactTimer = 0;
    this.sphereX = 0;
    this.sphereY = 0;
    this.meleeCooldown = 0;
    this.meleeSwingActive = false;
    this.meleeSwingTimer = 0;
    this.meleeSlashFadeTimer = 0;
    this.meleeSwingAngle = 0;
    this.meleeSwingDirection = -1; // 1 = right-to-left (top-to-bottom), -1 = left-to-right (bottom-to-top)
    this.doubleStrikeTimer = 0;   // Window to execute the second strike
    this.attackSlashEffects = [];
  }

  triggerDemoAttack() {
    this.meleeSwingActive = true;
    this.meleeSwingTimer = CONFIG.cronos?.meleeSwingDuration || 20;
    if (this._demoSwingDir === undefined) {
      this._demoSwingDir = 1;
    } else {
      this._demoSwingDir *= -1;
    }
    this.meleeSwingDirection = this._demoSwingDir;
    this.meleeSwingAngle = 0;
    try {
      const sound = getBasicAttackSound(this._def?.id, this._def?.type);
      if (sound) audioSystem.playSFX(sound.src, sound.volume);
    } catch (e) {}
  }

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  }

  _applyCronosSpeed() {
    let modeMult = 1.0;
    if (typeof state !== 'undefined' && state.mode) {
      if (state.mode === '1v1') modeMult = 1.2;
      else if (state.mode === '2v2') modeMult = 1.1;
    }
    
    let baseMoveSpeed = this.baseSpeed * modeMult;
    let targetSpeed = baseMoveSpeed;
    
    if (this.sphereActive) {
      const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
      const insideSphere = distToSphere <= CONFIG.cronos.sphereRadius;
      if (insideSphere) {
        targetSpeed = baseMoveSpeed * CONFIG.cronos.sphereSpeedMultiplier;
      }
    }
    
    this.speed = targetSpeed;

    // Apply slow and hit stun effects
    if (this.slowTimer > 0) {
      this.slowTimer--;
      targetSpeed *= this.slowMultiplier;
    }
    if (this.hitStunTimer > 0) {
      this.hitStunTimer--;
      targetSpeed *= this.hitStunMultiplier;
    }

    // Apply instant velocity scaling to make sphere dashes and slow recoveries snappy
    const currentMagnitude = Math.hypot(this.vx, this.vy);
    if (currentMagnitude > 0) {
      this.vx = (this.vx / currentMagnitude) * targetSpeed;
      this.vy = (this.vy / currentMagnitude) * targetSpeed;
    } else {
      // Kickstart movement if completely stopped
      const angle = this.angle || (Math.random() * Math.PI * 2);
      this.vx = Math.cos(angle) * targetSpeed;
      this.vy = Math.sin(angle) * targetSpeed;
    }
  }

  // Override takeDamage to implement counter-stop passive
  takeDamage(amount, attacker, opts = {}) {
    const isGuaranteedHit = Boolean(opts && (opts.isRatioCrit || opts.isNanamiPause || opts.undodgeable || opts.isSureKill || opts.isSaitamaCounter || opts.bypassShield || opts.bypassEvade || opts.isGuaranteedHit));
    const damageTaken = super.takeDamage(amount, attacker, opts);

    if (damageTaken !== false && attacker && attacker !== this && !opts.isSaitamaCounter && !opts.isCounter && !isGuaranteedHit) {
      // Counter-stop chance when attacked
      if (Math.random() < CONFIG.cronos.counterStopChance) {
        // Prevent spamming floating text and resetting state if already stopped
        if (!attacker.timeStopTimer || attacker.timeStopTimer <= 0) {
          // Apply time stop to the attacker
          attacker.applyTimeStop(CONFIG.cronos.counterStopDuration);
          attacker._suppressFreezeTimer = true;

          // Also hard-freeze attacker rotation + gun angle by zeroing movement and restoring on resume
          // (Fighter base timeStopTimer only skips movement/shooting logic; subclasses like Cronos may
          // still update rotation/aim elsewhere, leaving visual spin/locking active.)
          if (typeof attacker._resumeVx !== 'number') attacker._resumeVx = attacker.vx;
          if (typeof attacker._resumeVy !== 'number') attacker._resumeVy = attacker.vy;
          attacker.vx = 0;
          attacker.vy = 0;

          if (typeof attacker._resumeAngleVel !== 'number') attacker._resumeAngleVel = attacker.speed * (attacker._def?.spinRate ?? CONFIG.spin.rate);
          attacker._timeStoppedAngleVel = 0;

          // Keep gunAngle/angle from updating during time stop (visual freeze)
          attacker._timeStopFrozenAngle = attacker.angle;
          attacker._timeStopFrozenGunAngle = attacker.gunAngle;

          spawnFloatingText(attacker.x, attacker.y - attacker.r - 10, 'TIME STOP!', '#00F3FF');
        } else {
          // Just refresh the duration silently without spawning more text or overwriting original velocities
          attacker.applyTimeStop(CONFIG.cronos.counterStopDuration);
        }
      }
    }

    return damageTaken;
  }

  _spawnAttackSlashEffect() {
    const angle = this.meleeSwingActive ? this.meleeSwingAngle : (this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0));
    const count = 4;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.9;
      const dist = this.r + 25 + Math.random() * 45;
      const life = 5 + Math.floor(Math.random() * 4);
      this.attackSlashEffects.push({
        x: this.x + Math.cos(angle + spread) * dist,
        y: this.y + Math.sin(angle + spread) * dist,
        vx: Math.cos(angle + spread) * (2.5 + Math.random() * 3.5),
        vy: Math.sin(angle + spread) * (2.5 + Math.random() * 3.5),
        angle: angle + spread,
        life,
        maxLife: life,
        size: 2.5 + Math.random() * 2.5,
        color: (i % 2 === 0) ? '#00F3FF' : ((i % 3 === 0) ? '#FACC15' : '#FFFFFF'),
        alpha: 0.9,
      });
    }
  }

  _updateAttackSlashEffects() {
    for (let i = this.attackSlashEffects.length - 1; i >= 0; i--) {
      const effect = this.attackSlashEffects[i];
      effect.x += effect.vx || 0;
      effect.y += effect.vy || 0;
      effect.life--;
      if (effect.life <= 0) {
        this.attackSlashEffects[i] = this.attackSlashEffects[this.attackSlashEffects.length - 1];
        this.attackSlashEffects.pop();
      }
    }
  }

  _drawAttackSlashEffects(ctx) {
    if (!this.attackSlashEffects.length) return;
    ctx.save();
    for (const effect of this.attackSlashEffects) {
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = effect.alpha * (1 - progress);
      const sz = effect.size * (1 - progress * 0.4);

      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.angle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = effect.color;

      // Sharp Diamond Pixel Spark
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(sz * 0.65, 0);
      ctx.lineTo(0, sz);
      ctx.lineTo(-sz * 0.65, 0);
      ctx.closePath();
      ctx.fill();

      // Specular white center glint
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-sz * 0.25, -sz * 0.25, sz * 0.5, sz * 0.5);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Helper: Find all enemy targets (fighters, illusions) within Cronos's front-facing radius arc.
   * @param {number} maxRangeOffset - Max distance offset beyond Cronos's radius
   * @param {number} coneAngle - Frontal cone angle in radians (default Math.PI * 1.3 for 234 deg arc)
   * @returns {Array<Object>} Array of target entities in front radius
   */
  _getFrontRadiusTargets(maxRangeOffset = 110, coneAngle = Math.PI * 1.3) {
    const targets = [];
    if (typeof state === 'undefined' || !state || !state.fighters) return targets;

    const myIndex = state.fighters.indexOf(this);
    const myTeam = state.getFighterTeam ? state.getFighterTeam(myIndex) : null;
    const facingAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    const candidates = [...state.fighters, ...(state.illusions || [])];
    for (const f of candidates) {
      if (!f || f === this || f.hp <= 0 || f.isDead) continue;

      const idx = state.fighters.indexOf(f);
      if (idx !== -1) {
        const enemyTeam = state.getFighterTeam ? state.getFighterTeam(idx) : null;
        if (myTeam !== null && enemyTeam === myTeam) continue; // Skip teammates
      } else if (f.owner) {
        const ownerIdx = state.fighters.indexOf(f.owner);
        const ownerTeam = state.getFighterTeam ? state.getFighterTeam(ownerIdx) : null;
        if (myTeam !== null && ownerTeam === myTeam) continue;
      }

      const dx = f.x - this.x;
      const dy = f.y - this.y;
      const dist = Math.hypot(dx, dy);
      const maxHitDist = this.r + f.r + maxRangeOffset;

      // Close-range proximity safety: if enemy is within 70px offset, always include!
      const isVeryClose = dist <= (this.r + f.r + 70);

      if (dist <= maxHitDist) {
        const angleToEnemy = Math.atan2(dy, dx);
        let diff = angleToEnemy - facingAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (isVeryClose || Math.abs(diff) <= coneAngle / 2) {
          targets.push(f);
        }
      }
    }

    return targets;
  }

  // Try melee attack with crescent blade (hits all targets within front radius)
  _tryMeleeAttack(opponent, ownerIndex) {
    if (this.meleeCooldown > 0 || this.isCaughtInBeam()) return;

    const meleeReach = CONFIG.cronos.meleeRange || 110;
    const maxRange = this.r + (opponent ? opponent.r : 20) + meleeReach;

    // Gather all targets within front radius or close proximity
    const frontTargets = this._getFrontRadiusTargets(meleeReach, Math.PI * 1.3);
    if (opponent && opponent.hp > 0 && !opponent.isDead && !frontTargets.includes(opponent)) {
      const dx = opponent.x - this.x;
      const dy = opponent.y - this.y;
      if ((dx * dx + dy * dy) <= maxRange * maxRange) {
        frontTargets.push(opponent);
      }
    }

    if (frontTargets.length === 0) return;

    // --- Double Strike Logic ---
    const isFirstStrike = this.doubleStrikeTimer <= 0;

    // Alternate the visual swing direction for a back-and-forth feel.
    this.meleeSwingDirection *= -1;

    if (isFirstStrike) {
      this.doubleStrikeTimer = CONFIG.cronos.doubleStrikeWindow ?? 15;
    } else {
      this.doubleStrikeTimer = 0;
    }

    if (isFirstStrike && opponent) {
      this.meleeSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    } else if (isFirstStrike) {
      this.meleeSwingAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
    }

    this.meleeSwingActive = true;
    this.meleeSwingTimer = CONFIG.cronos.meleeSwingDuration;

    const sound = getBasicAttackSound(this._def?.id, this._def?.type);
    this._attackSoundTimer = sound.delay;
    this._attackSoundConfig = sound;

    // Check if Cronos is inside his own sphere for different damage and cooldown
    let meleeDamage = CONFIG.cronos.meleeDamage;
    let meleeCooldown = CONFIG.cronos.meleeCooldown;
    let hitText = 'SLASH!';
    if (this._isInsideOwnSphere()) {
      meleeDamage = CONFIG.cronos.sphereMeleeDamage;
      meleeCooldown = CONFIG.cronos.sphereMeleeCooldown;
      hitText = 'POWER SLASH!';
    }

    this.meleeCooldown = isFirstStrike ? Math.floor(meleeCooldown * 0.1) : meleeCooldown;

    this._spawnAttackSlashEffect();
    triggerGlobalScreenShake(this._isInsideOwnSphere() ? 8 : 4, 5);

    // Apply damage, knockback, floating text, and passive time stop to ALL targets in front radius!
    for (const target of frontTargets) {
      applyDamageToTarget(target, meleeDamage, this, { isMelee: true });

      // Physical hit knockback - do not push targets inside the time stop sphere
      if (!target.isTurret) {
        const isTargetInSphere = (this.sphereActive && (Math.hypot(target.x - this.sphereX, target.y - this.sphereY) <= CONFIG.cronos.sphereRadius)) || target._frozenByCronosSphere || (target.timeStopTimer > 0 && this.sphereActive);
        if (!isTargetInSphere) {
          const kbAngle = Math.atan2(target.y - this.y, target.x - this.x);
          target.vx += Math.cos(kbAngle) * 4;
          target.vy += Math.sin(kbAngle) * 4;
        } else {
          target.vx = 0;
          target.vy = 0;
        }
      }

      spawnFloatingText(target.x, target.y - target.r - 5, hitText, '#FF007F');

      // Passive stop chance on hit
      if (Math.random() < CONFIG.cronos.passiveStopChance) {
        if (target.applyTimeStop) {
          if (!target.timeStopTimer || target.timeStopTimer <= 0) {
            target.applyTimeStop(CONFIG.cronos.passiveStopDuration);
            target._suppressFreezeTimer = true;
            spawnFloatingText(target.x, target.y - target.r - 15, 'STOPPED!', '#00F3FF');
          } else {
            target.applyTimeStop(CONFIG.cronos.passiveStopDuration);
          }
        }
      }
    }
  }

  _isInsideOwnSphere() {
    if (!this.sphereActive) return false;
    const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
    return distToSphere <= CONFIG.cronos.sphereRadius;
  }

  handlePoison() {
    if (this.poisonTicks > 0) {
      this.poisonTimer++;

      const grenadierCfg = CONFIG.grenadier || {};
      const intervalFrames = (typeof grenadierCfg.poisonIntervalFrames === 'number')
        ? grenadierCfg.poisonIntervalFrames
        : 60;

      const damagePerTick = (typeof grenadierCfg.poisonDamagePerTick === 'number')
        ? grenadierCfg.poisonDamagePerTick
        : 2;

      if (this.poisonTimer >= intervalFrames) {
        if (!this._isInsideOwnSphere()) {
          this.takeDamage(damagePerTick, this.lastPoisonAttacker);
          spawnFloatingText(this.x, this.y - this.r - 5, 'POISON!', '#77ff77');
          this.poisonTicks--;
        }
        this.poisonTimer = 0;
      }
    }
  }

  handleBurn() {
    if (this.burnTimer > 0) {
      this.burnTimer--;
      this.burnDamageTimer++;
      if (this.burnDamageTimer >= CONFIG.orange.burnDamageInterval) {
        if (!this._isInsideOwnSphere()) {
          const damage = CONFIG.orange.burnDamagePerSecond;
          this.takeDamage(damage, this.lastBurnAttacker, { isBurn: true });
          spawnFloatingText(this.x, this.y - this.r - 5, 'BURN!', '#ff6600');
        }
        this.burnDamageTimer = 0;
      }
    }
  }

  update(opponent, ownerIndex, arena) {
    // OPTIMIZATION: Aggressive performance mode - skip expensive operations at low FPS
    const fps = (typeof state !== 'undefined' && state.fps) || 60;
    const qualityLevel = (typeof state !== 'undefined' && state.qualityLevel) || 1.0;
    const useAggressiveMode = false;

    this.handleStatusEffects();
    this._tickCooldowns();
    this._tickAttackSound();

    // Time stop - freeze ALL movement, spinning, and actions
    if (this._handleTimeStop()) {
      return;
    }

    // Handle sphere cooldown
    if (this.sphereCooldown > 0) {
      this.sphereCooldown--;
    }

    if (this.doubleStrikeTimer > 0) {
      this.doubleStrikeTimer--;
    }

    // Handle melee cooldown
    if (this.meleeCooldown > 0) {
      this.meleeCooldown--;
    }

    // OPTIMIZATION: Skip slash effects in aggressive mode
    if (!useAggressiveMode) {
      this._updateAttackSlashEffects();
    }

    // Handle melee swing animation
    if (this.meleeSwingActive) {
      this.meleeSwingTimer--;
      
      // Spawn honeycomb trail particles continuously during swing
      if (!useAggressiveMode) {
        const progress = 1 - (this.meleeSwingTimer / CONFIG.cronos.meleeSwingDuration);
        const swingTotal = Math.PI * 0.8;
        let currentAngle = 0;
        if (this.meleeSwingDirection === 1) {
           currentAngle = this.meleeSwingAngle - (swingTotal / 2) + progress * swingTotal;
        } else {
           currentAngle = this.meleeSwingAngle + (swingTotal / 2) - progress * swingTotal;
        }
        // Honeycomb trail spawning removed
      }

      if (this.meleeSwingTimer <= 0) {
        this.meleeSwingActive = false;
        this.meleeSlashFadeTimer = 15; // Delay before it disappears (fade out)
      }
    } else if (this.meleeSlashFadeTimer > 0) {
      this.meleeSlashFadeTimer--;
    }

    // Handle active time stop sphere
    if (this.sphereActive) {
      this.sphereTimer--;
      this._applyCronosSpeed();

      // OPTIMIZED: Freeze fighters that enter the sphere using spatial grid
      // Stealthed assassins (invincibilityTimer or flashStepTimer > 0) are ignored by the sphere
      if (state && state.fighters) {
        // Use spatial grid to get only nearby fighters instead of checking all
        const sphereRadius = CONFIG.cronos.sphereRadius;
        const nearbyFighters = spatialGrid.getNearby(this.sphereX, this.sphereY, sphereRadius);

        for (const fighter of nearbyFighters) {
          if (fighter && fighter !== this && fighter.hp > 0) {
            if (fighter.timeStopTimer > 0 && fighter._frozenByCronosSphere) continue; // Skip if already frozen
            // Skip stealthed assassins - they phase through the sphere
            if (fighter.invincibilityTimer > 0 || fighter.flashStepTimer > 0) continue;

            const dist = Math.hypot(fighter.x - this.sphereX, fighter.y - this.sphereY);
            if (dist <= sphereRadius) {
              // Calculate remaining frames so we don't reset visual timer when reapplying
              let remaining = fighter.timeStopTimer || 0;
              if (fighter._timeStopOriginalDuration && fighter._timeStopStartTime) {
                const elapsedMs = performance.now() - fighter._timeStopStartTime;
                const elapsedFrames = (elapsedMs / 1000) * 60;
                remaining = Math.max(0, fighter._timeStopOriginalDuration - elapsedFrames);
              }
              if (remaining <= 0) {
                fighter.applyTimeStop(CONFIG.cronos.sphereDuration);
                // Save and zero velocities so fighters are hard-stopped by sphere
                if (typeof fighter._resumeVx !== 'number') fighter._resumeVx = fighter.vx;
                if (typeof fighter._resumeVy !== 'number') fighter._resumeVy = fighter.vy;
                fighter.vx = 0;
                fighter.vy = 0;
                fighter._frozenByCronosSphere = true;
              }
              // Suppress per-fighter freeze timer display because the sphere shows duration
              fighter._suppressFreezeTimer = true;
            }
          }
        }
      }

      // OPTIMIZED: PRIORITY LOCK using spatial grid for nearby entities
      // Prefer nearest fighter INSIDE the sphere over the global nearest opponent.
      // This makes Cronos chase and melee fighters trapped in his time-stop sphere first.
      // Stealthed assassins are ignored - they phase through the sphere completely.
      // Teammates are frozen by the sphere but NOT targeted for attacks.
      let sphereTarget = null;
      let sphereTargetDistSq = Infinity;
      const sphereRadius = CONFIG.cronos.sphereRadius;
      const sphereRadiusSq = sphereRadius * sphereRadius;

      if (state && state.fighters) {
        const selfIndex = state.fighters.indexOf(this);
        const selfTeam = state.getFighterTeam(selfIndex);

        // OPTIMIZED: Use spatial grid to get only nearby entities
        const nearbyEntities = spatialGrid.getNearby(this.sphereX, this.sphereY, sphereRadius);

        for (const entity of nearbyEntities) {
          if (!entity || entity === this) continue;
          if (!entity.hp || entity.hp <= 0) continue;

          // Check if fighter
          const fi = state.fighters.indexOf(entity);
          if (fi !== -1) {
            if ((state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) && selfTeam !== null && state.getFighterTeam(fi) === selfTeam) continue;
            if (entity.invincibilityTimer > 0 || entity.flashStepTimer > 0) continue;
          }

          // Check if illusion
          if (entity.isIllusion && (state.mode === GAME_MODES.TWO_VS_TWO || state.mode === GAME_MODES.STAND_OFF_1V2) && selfTeam !== null) {
            const ownerIndex = state.fighters.indexOf(entity.owner);
            if (ownerIndex >= 0 && state.getFighterTeam(ownerIndex) === selfTeam) continue;
          }

          const dxS = entity.x - this.sphereX;
          const dyS = entity.y - this.sphereY;
          if (dxS * dxS + dyS * dyS <= sphereRadiusSq) {
            const dxM = entity.x - this.x;
            const dyM = entity.y - this.y;
            const distSq = dxM * dxM + dyM * dyM;
            if (distSq < sphereTargetDistSq) {
              sphereTargetDistSq = distSq;
              sphereTarget = entity;
            }
          }
        }
      }

      if (sphereTarget) {
        opponent = sphereTarget; // override: lock onto the fighter/illusion trapped inside the sphere
        this._targetInsideSphere = true;
      } else {
        this._targetInsideSphere = false;
      }

      projectileSystem.freezeProjectilesInSphere(this);

      // Check if sphere expired
      if (this.sphereTimer <= 0) {
        // Resume fighters that were frozen by this sphere
        if (state && state.fighters) {
          for (const fighter of state.fighters) {
            if (fighter && fighter !== this && fighter.hp > 0 && fighter.timeStopTimer > 0) {
              fighter.timeStopTimer = 0;
              // Restore velocities for fighters frozen by this sphere
              if (fighter._frozenByCronosSphere) {
                if (typeof fighter._resumeVx === 'number') fighter.vx = fighter._resumeVx;
                if (typeof fighter._resumeVy === 'number') fighter.vy = fighter._resumeVy;
                delete fighter._resumeVx;
                delete fighter._resumeVy;
                delete fighter._frozenByCronosSphere;
              }
              // Clear sphere-driven suppression so normal per-fighter timers can show again
              delete fighter._suppressFreezeTimer;
            }
          }
        }

        projectileSystem.restoreFrozenProjectiles(ownerIndex);
        this.sphereActive = false;
        this.speed = this.baseSpeed;
        spawnFloatingText(this.sphereX, this.sphereY - CONFIG.cronos.sphereRadius - 10, 'SPHERE ENDED', '#00F3FF');
      }
    } else {
      // Normal speed when sphere is not active
      this._applyCronosSpeed();

      // Try to deploy sphere when cooldown is ready and opponent is within activation distance (disabled in demo mode)
      if (!this.isDemoFighter && this.sphereCooldown === 0 && opponent) {
        const distToOpponent = Math.hypot(opponent.x - this.x, opponent.y - this.y);
        if (distToOpponent <= CONFIG.cronos.sphereActivationDistance) {
          this.deployTimeStopSphere();
        }
      }
    }

    // Decay sphere impact effect (outside if/else so it runs every frame)
    if (this.sphereImpactTimer > 0) {
      this.sphereImpactTimer--;
    }

    // Movement
    this.applyMovementPhysics();

    this.aim(opponent);

    // Ambient movement honeycomb trail emitted from the blade when moving
    const currentMagnitude = Math.hypot(this.vx, this.vy);
    if (!this.meleeSwingActive && currentMagnitude > 1.0 && !useAggressiveMode) {
      if (Math.random() < 0.15) { // Reduced spawn chance
        // Ambient honeycomb trail spawning removed
      }
    }

    // Custom bounce with sphere mechanics
    this.resolveWallBounce(arena, opponent);

    // Try melee attack if any target or opponent is in reach
    const frontTargetsForAttack = this._getFrontRadiusTargets(CONFIG.cronos.meleeRange || 110, Math.PI * 1.3);
    if (opponent || frontTargetsForAttack.length > 0) {
      this._tryMeleeAttack(opponent, ownerIndex);
    }
  }

  deployTimeStopSphere() {
    this.sphereActive = true;
    this.sphereTimer = CONFIG.cronos.sphereDuration;
    this.sphereCooldown = CONFIG.cronos.sphereCooldown;
    this.sphereImpactTimer = 25; // frames for impact burst effect
    this.meleeCooldown = 0; // Reset melee cooldown to remove the attack delay

    // Store the deployment location
    this.sphereX = this.x;
    this.sphereY = this.y;

    spawnFloatingText(this.x, this.y - this.r - 15, 'TIME STOP!', '#00F3FF');
    // Play cronosphere sound    
    const sphereSound = getSkillSound(this._def?.id, 'sphere');
    if (sphereSound) audioSystem.playSFX(sphereSound.src, sphereSound.volume);

    // Apply time stop to all other fighters and projectiles
    if (state && state.fighters) {
      for (const fighter of state.fighters) {
        if (fighter && fighter !== this && fighter.hp > 0) {
          const dx = fighter.x - this.sphereX;
          const dy = fighter.y - this.sphereY;
          if (dx * dx + dy * dy <= CONFIG.cronos.sphereRadius * CONFIG.cronos.sphereRadius) {
            // Calculate remaining frames so we don't reset visual timer when reapplying
            let remaining = fighter.timeStopTimer || 0;
            if (fighter._timeStopOriginalDuration && fighter._timeStopStartTime) {
              const elapsedMs = performance.now() - fighter._timeStopStartTime;
              const elapsedFrames = (elapsedMs / 1000) * 60;
              remaining = Math.max(0, fighter._timeStopOriginalDuration - elapsedFrames);
            }
            if (remaining <= 0) {
              fighter.applyTimeStop(CONFIG.cronos.sphereDuration);
              // Save and zero velocities so fighters are hard-stopped by sphere
              if (typeof fighter._resumeVx !== 'number') fighter._resumeVx = fighter.vx;
              if (typeof fighter._resumeVy !== 'number') fighter._resumeVy = fighter.vy;
              fighter.vx = 0;
              fighter.vy = 0;
              fighter._frozenByCronosSphere = true;
            }
            // Suppress per-fighter freeze timer display because the sphere shows duration
            fighter._suppressFreezeTimer = true;
          }
        }
      }
    }

    projectileSystem.freezeProjectilesInSphere(this);
  }

  resolveWallBounce(arena, opponent) {
    if (this.isCaughtInBeam() || this.isDraggedByGetsuga || this.isWallPinnedByMakima || this.isWallPinnedBySaitama || this.isWallPinnedByEscanor || this.isCurrentlyWallPinnedByEscanor) {
      return super.resolveWallBounce(arena, opponent);
    }
    let bounced = false;
    let bouncedX = false;
    let bouncedY = false;

    if (this.x - this.r < arena.x) {
      this.x = arena.x + this.r;
      bounced = true;
      bouncedX = true;
    } else if (this.x + this.r > arena.x + arena.width) {
      this.x = arena.x + arena.width - this.r;
      bounced = true;
      bouncedX = true;
    }

    if (this.y - this.r < arena.y) {
      this.y = arena.y + this.r;
      bounced = true;
      bouncedY = true;
    } else if (this.y + this.r > arena.y + arena.height) {
      this.y = arena.y + arena.height - this.r;
      bounced = true;
      bouncedY = true;
    }

    if (this.sphereActive) {
      const distToSphere = Math.hypot(this.x - this.sphereX, this.y - this.sphereY);
      if (distToSphere > CONFIG.cronos.sphereRadius) {
        const sphereDist = Math.max(distToSphere, 0.0001);
        const nx = (this.x - this.sphereX) / sphereDist;
        const ny = (this.y - this.sphereY) / sphereDist;
        this.x = this.sphereX + nx * CONFIG.cronos.sphereRadius;
        this.y = this.sphereY + ny * CONFIG.cronos.sphereRadius;

        const dot = this.vx * nx + this.vy * ny;
        if (dot > 0) {
          this.vx -= 2 * dot * nx;
          this.vy -= 2 * dot * ny;
        }

        // Normalize speed and apply multiplier
        const bounceMultiplier = CONFIG.cronos.sphereBounceForce;
        let targetSpeed = (Math.hypot(this.vx, this.vy) || this.speed) * bounceMultiplier;

        if (opponent) {
          const dx = opponent.x - this.x;
          const dy = opponent.y - this.y;
          const dist = Math.hypot(dx, dy) || 1;
          const homingVx = (dx / dist) * targetSpeed;
          const homingVy = (dy / dist) * targetSpeed;

          // Check if homing direction points OUTWARD (which would make him stick to the wall)
          const dotHoming = homingVx * nx + homingVy * ny;
          if (dotHoming > 0) {
            // Reflect the homing velocity inwards!
            this.vx = homingVx - 2 * dotHoming * nx;
            this.vy = homingVy - 2 * dotHoming * ny;
          } else {
            // Safe to just point directly at the opponent
            this.vx = homingVx;
            this.vy = homingVy;
          }
        } else {
          const speedMagnitude = Math.hypot(this.vx, this.vy);
          if (speedMagnitude > 0) {
            this.vx = (this.vx / speedMagnitude) * targetSpeed;
            this.vy = (this.vy / speedMagnitude) * targetSpeed;
          }
        }

        bounced = true;
      }
    }

    if (bounced) {
      const wallBounced = bouncedX || bouncedY;
      if (wallBounced) this.playWallBounceSound();
      // Enhanced bounce inside sphere — lock forward toward opponent
      if (this.sphereActive) {
        const bounceMultiplier = CONFIG.cronos.sphereBounceForce;
        if (bouncedX) {
          this.vx = -this.vx * bounceMultiplier;
        }
        if (bouncedY) {
          this.vy = -this.vy * bounceMultiplier;
        }

        // Homing bounce for arena walls (opponent is always inside arena, so this is safe)
        if (bouncedX || bouncedY) {
          if (opponent) {
            const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
            const dx = opponent.x - this.x;
            const dy = opponent.y - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.vx = (dx / dist) * currentSpeed;
            this.vy = (dy / dist) * currentSpeed;
          } else {
            const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
            const speedMagnitude = Math.hypot(this.vx, this.vy);
            if (speedMagnitude > 0) {
              this.vx = (this.vx / speedMagnitude) * currentSpeed;
              this.vy = (this.vy / speedMagnitude) * currentSpeed;
            }
          }
        }
      } else {
        // Normal bounce
        if (bouncedX) {
          this.vx = -this.vx;
        }
        if (bouncedY) {
          this.vy = -this.vy;
        }

        // Smart bounce toward opponent if available
        if (opponent) {
          const currentSpeed = Math.hypot(this.vx, this.vy) || this.speed;
          const dx = opponent.x - this.x;
          const dy = opponent.y - this.y;
          const dist = Math.hypot(dx, dy) || 1;
          this.vx = (dx / dist) * currentSpeed;
          this.vy = (dy / dist) * currentSpeed;
        }
      }
    }
  }

  drawBody(ctx) {
    // OPTIMIZATION: Quality-based LOD for body drawing
    const qualityLevel = state.qualityLevel || 1.0;
    const isMulti = state && state.mode && state.mode !== '1v1';
    const useLOD = (typeof state !== 'undefined' && state.mode === 'FFA') || false;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const baseRadius = this.r;
    const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
    bodyGradient.addColorStop(0, '#b8ffff');
    bodyGradient.addColorStop(0.35, '#00d5ff');
    bodyGradient.addColorStop(1, '#081434');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sheen = ctx.createRadialGradient(-baseRadius * 0.2, -baseRadius * 0.2, 0, 0, 0, baseRadius);
    sheen.addColorStop(0, 'rgba(255,255,255,0.24)');
    sheen.addColorStop(0.65, 'rgba(0,243,255,0.00)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // OPTIMIZATION: Skip expensive hexagon pattern at low quality - more aggressive
    if (!useLOD && state.fps > 45) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1;
      const hexSize = Math.max(4, baseRadius * 0.22);
      const xOffset = hexSize * 1.75;
      const yOffset = hexSize * 1.52;
      const maxDistSq = (baseRadius * 0.92) * (baseRadius * 0.92);
      // OPTIMIZATION: Batch all hexagons into a single path (was 25 separate beginPath/stroke calls)
      ctx.beginPath();
      for (let row = -2; row <= 2; row++) {
        const rowOdd = (row % 2) ? xOffset * 0.5 : 0;
        for (let col = -2; col <= 2; col++) {
          const x = col * xOffset + rowOdd;
          const y = row * yOffset;
          const distSq = x * x + y * y;
          if (distSq > maxDistSq) continue;
          // Use module-level cached cos/sin
          ctx.moveTo(x + _BODY_HEX_COS[0] * hexSize, y + _BODY_HEX_SIN[0] * hexSize);
          for (let i = 1; i < 6; i++) {
            ctx.lineTo(x + _BODY_HEX_COS[i] * hexSize, y + _BODY_HEX_SIN[i] * hexSize);
          }
          ctx.closePath();
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#00d7ff';
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgb(0, 150, 255)'; // Deep saturated cyan instead of dark stroke
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // OPTIMIZATION: Skip rotating lines at low quality - more aggressive
    if (!useLOD && state.fps > 50) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,0,127,0.35)';
      ctx.lineWidth = 1.25;
      for (let i = 0; i < 5; i++) {
        const ang = i * (Math.PI * 2 / 5) + this.angle * 0.5;
        const inner = baseRadius * 0.38;
        const outer = baseRadius * 0.82;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
        ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }

    this.drawStatusOverlays(ctx, baseRadius);

    ctx.restore();
  }

  drawOutline(ctx) {
    super.drawOutline(ctx);
    // Weapon visual will be added to weaponVisuals.js
    drawCronosCrescentBlade(ctx, this.x, this.y, this.gunAngle, this.r, this.meleeSwingActive, this.meleeSwingTimer, this.meleeSwingAngle, CONFIG.cronos.meleeSwingDuration, this.meleeSwingDirection, this.color);
  }

  /**
   * Draws Cronus's Sharp Anime Crescent Spatial Slash (Rule 15 & Rule 16 compliant)
   */
  _drawCronosSpatialSlashArc(ctx) {
    const editP = (typeof state !== 'undefined' && state.slashEditMode && state.slashEditParams) ? state.slashEditParams : null;
    if (!this.meleeSwingActive && this.meleeSlashFadeTimer <= 0 && !editP) return;

    let swingProgress = 1.0;
    let fade = this.meleeSlashFadeTimer / 15;

    if (this.meleeSwingActive || editP) {
      swingProgress = editP ? 0.5 : (1 - (this.meleeSwingTimer / (CONFIG.cronos?.meleeSwingDuration || 20)));
      fade = 1.0;
    }

    const isForward = this.meleeSwingDirection === 1;
    const arcRadius = (this.r + 88) * (editP ? editP.scale : 1.0);
    const innerRadius = (this.r + 32) * (editP ? editP.scale : 1.0);

    const fullStartA = -Math.PI * 0.42;
    const fullEndA = Math.PI * 0.42;
    const totalArc = fullEndA - fullStartA;

    // During active swing: tip advances from fullStartA to fullEndA
    // During recovery fade: tip stays at fullEndA, tail chases tip (eraser wipe)
    let tipA = fullStartA + totalArc * swingProgress;
    let tailA = fullStartA;

    if (!this.meleeSwingActive && this.meleeSlashFadeTimer > 0) {
      tipA = fullEndA;
      const tailP = 1 - Math.pow(this.meleeSlashFadeTimer / 15, 1.4);
      tailA = fullStartA + totalArc * tailP;
    }

    if (tailA >= tipA - 0.02) return;

    const currentArc = tipA - tailA;
    const glowAlpha = Math.pow(fade, 0.8) * 0.95;

    ctx.save();
    ctx.translate(this.x, this.y);
    if (editP) {
      ctx.translate(editP.offsetX, editP.offsetY);
    }
    ctx.rotate(this.meleeSwingAngle);

    // Mirror vertically for reverse swing
    if (!isForward) {
      ctx.scale(1, -1);
    }

    // Draw Double-Tapered Crescent Needle Polygon (Sinusoidal Tapering)
    const segments = 28;
    const outerPoints = [];
    const innerPoints = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = tailA + currentArc * t;
      const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.25 + 0.75 * t);
      const curOuterR = arcRadius;
      const curInnerR = arcRadius - (arcRadius - innerRadius) * taper;

      outerPoints.push({
        x: Math.cos(angle) * curOuterR,
        y: Math.sin(angle) * curOuterR,
      });
      innerPoints.push({
        x: Math.cos(angle) * curInnerR,
        y: Math.sin(angle) * curInnerR,
      });
    }

    // 1. Crescent Spatial Void & Radiant Cyan Gradient Fill
    ctx.beginPath();
    ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
    for (let i = 1; i <= segments; i++) {
      ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
    }
    for (let i = segments; i >= 0; i--) {
      ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
    }
    ctx.closePath();

    const tipX = Math.cos(tipA) * arcRadius;
    const tipY = Math.sin(tipA) * arcRadius;
    const tailX = Math.cos(tailA) * arcRadius;
    const tailY = Math.sin(tailA) * arcRadius;

    const slashGrad = ctx.createLinearGradient(tailX, tailY, tipX, tipY);
    slashGrad.addColorStop(0, 'rgba(15, 23, 42, 0.0)');
    slashGrad.addColorStop(0.3, `rgba(15, 23, 42, ${0.75 * glowAlpha})`);
    slashGrad.addColorStop(0.65, `rgba(0, 243, 255, ${0.85 * glowAlpha})`);
    slashGrad.addColorStop(1, `rgba(224, 242, 254, ${1.0 * glowAlpha})`);

    ctx.fillStyle = slashGrad;
    ctx.fill();

    // 2. Outer Radiant Cyan Cutting Edge
    ctx.beginPath();
    ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
    for (let i = 1; i <= segments; i++) {
      ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
    }
    ctx.strokeStyle = `rgba(0, 243, 255, ${glowAlpha})`;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // 3. Razor-Thin White-Hot Core Blade Edge
    ctx.beginPath();
    const startIdx = Math.floor(segments * 0.2);
    ctx.moveTo(outerPoints[startIdx].x, outerPoints[startIdx].y);
    for (let i = startIdx + 1; i <= segments; i++) {
      ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${glowAlpha * 0.95})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4. Inner Secondary Glow Ring
    ctx.beginPath();
    ctx.moveTo(innerPoints[0].x, innerPoints[0].y);
    for (let i = 1; i <= segments; i++) {
      ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
    }
    ctx.strokeStyle = `rgba(56, 189, 248, ${glowAlpha * 0.65})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 5. Orbiting Gold Chrono Flecks along the cutting edge
    const numFlecks = 4;
    ctx.fillStyle = '#FACC15';
    for (let i = 0; i < numFlecks; i++) {
      const ft = 0.4 + (i / numFlecks) * 0.55;
      const idx = Math.min(segments, Math.floor(ft * segments));
      const pt = outerPoints[idx];
      if (pt) {
        ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
      }
    }

    ctx.restore();
  }

  draw(ctx) {
    const now = performance.now();

    // 1. Action Speed Lines (Rendered underneath fighter body)
    if (this.meleeSwingActive || (this.sphereActive && Math.hypot(this.vx, this.vy) > 3.0)) {
      drawCronosSpeedLinesLocal(ctx, this);
    }

    // 2. Pre-activation barrier ONLY when ultimate/skill is about to be ready
    const inPreWindow = this.sphereCooldown > 0 && this.sphereCooldown <= CONFIG.cronos.spherePreActivateFrames;
    if (inPreWindow) {
      const progress = 1.0 - (this.sphereCooldown / Math.max(1, CONFIG.cronos.spherePreActivateFrames));
      try {
        const barrierRadius = Math.max(this.r * 1.5, 55);
        if (typeof drawCronosPreActivateBarrier === 'function') {
          drawCronosPreActivateBarrier({
            ctx,
            cx: this.x,
            cy: this.y,
            radius: barrierRadius,
            preProgress: progress,
            now,
          });
        }
      } catch (e) {
        console.error('Error drawing Cronos barrier:', e);
      }
    }

    // 3. Sphere impact burst when sphere is first unleashed
    if (this.sphereImpactTimer > 0) {
      try {
        const impactProgress = 1 - this.sphereImpactTimer / 25;
        if (typeof drawCronosSphereImpact === 'function') {
          drawCronosSphereImpact({
            ctx,
            cx: this.x,
            cy: this.y,
            radius: Math.max(this.r * 1.5, 55),
            impactProgress,
            now,
          });
        }
      } catch (e) {
        console.error('Error drawing Cronos impact:', e);
      }
    }

    // 4. Time stop sphere at deployment location
    if (this.sphereActive) {
      try {
        const deployProgress = 1.0;
        if (typeof drawCronosSphereVisual === 'function') {
          drawCronosSphereVisual({
            ctx,
            cx: this.sphereX,
            cy: this.sphereY,
            radius: CONFIG.cronos.sphereRadius,
            alpha: 0.9,
            deployProgress,
            now,
            theme: this.sphereTheme
          });
        }
      } catch (e) {
        console.error('Error drawing Cronos sphere visual:', e);
      }
    }

    // 5. Draw Anime Crescent Spatial Slash Arc
    this._drawCronosSpatialSlashArc(ctx);

    // 6. Draw particle sparks
    this._drawAttackSlashEffects(ctx);

    // 7. Base Fighter draw pipeline (drawGun -> drawBody -> drawOutline -> drawHealth)
    super.draw(ctx);
  }

  drawBody(ctx) {
    drawCronosSkin(ctx, this);
  }

  drawSkin(ctx) {
    drawCronosSkin(ctx, this);
  }

  drawOutline(ctx) {
    // Stepped pixel outline handled inside drawCronosPixelBody
  }

  drawGun(ctx) {
    if (this.isTargetOfAmbush || (typeof state !== 'undefined' && state.showSkinOnly)) return;
    drawCronosCrescentBlade(
      ctx,
      this.x,
      this.y,
      this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0),
      this.r,
      this.meleeSwingActive,
      this.meleeSwingTimer,
      this.meleeSwingAngle,
      CONFIG.cronos?.meleeSwingDuration || 20,
      this.meleeSwingDirection,
      this.color
    );
  }

  onFrozenSkillDurationTick(isInsideGojoDomain) {
    if (this.sphereActive && this.sphereTimer <= 0) {
      if (typeof state !== 'undefined' && state.fighters) {
        for (const fighter of state.fighters) {
          if (fighter && fighter !== this && fighter.hp > 0 && fighter.timeStopTimer > 0) {
            if (fighter._frozenByCronosSphere) {
              fighter.timeStopTimer = 0;
              if (typeof fighter._resumeVx === 'number') fighter.vx = fighter._resumeVx;
              if (typeof fighter._resumeVy === 'number') fighter.vy = fighter._resumeVy;
              delete fighter._resumeVx;
              delete fighter._resumeVy;
              delete fighter._frozenByCronosSphere;
            }
            delete fighter._suppressFreezeTimer;
          }
        }
      }

      if (typeof projectileSystem !== 'undefined' && typeof projectileSystem.restoreFrozenProjectiles === 'function') {
        const ownerIndex = (typeof state !== 'undefined' && state.fighters) ? state.fighters.indexOf(this) : -1;
        projectileSystem.restoreFrozenProjectiles(ownerIndex);
      }
      this.sphereActive = false;
      this.speed = this.baseSpeed;
    }
  }
}

