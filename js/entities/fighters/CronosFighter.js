import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { state, spawnFloatingText } from '../../core/state.js';
import { playSound } from '../../systems/soundSystem.js';
import { getBasicAttackSound } from '../../soundEffects/basicAttackSounds.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { drawCronosPreActivateBarrier, drawCronosSphereImpact } from '../../graphics/draw.js';
import { drawCronosCrescentBlade } from '../../graphics/weapons/cronosWeaponGraphics.js';
import { spatialGrid } from '../../systems/physics.js';

// ── Module-level cached hex vertex cos/sin (avoids recomputing every frame) ──
const _HEX_ANG = Math.PI / 3;
const _BODY_HEX_COS = [];
const _BODY_HEX_SIN = [];
for (let i = 0; i < 6; i++) {
  const a = Math.PI / 6 + i * _HEX_ANG;
  _BODY_HEX_COS.push(Math.cos(a));
  _BODY_HEX_SIN.push(Math.sin(a));
}
// Slash honeycomb cos/sin (same angles, cached once)
const _SLASH_COS = _BODY_HEX_COS;
const _SLASH_SIN = _BODY_HEX_SIN;

// Global cached pattern for Cronos honeycomb trail
let _cronosHoneycombPattern = null;
function getCronosHoneycombPattern(ctx) {
  if (_cronosHoneycombPattern) return _cronosHoneycombPattern;
  
  const s = 18; // Hex size - made larger
  const w = Math.round(s * Math.sqrt(3));
  const h = Math.round(s * 3);
  
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const pctx = canvas.getContext('2d');
  
  // Use solid white with high alpha so it contrasts against the bright cyan background
  pctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; 
  pctx.lineWidth = 2.0;
  
  function drawHex(x, y) {
    pctx.beginPath();
    for (let i = 0; i < 6; i++) {
      // Draw slightly smaller to leave a gap
      const px = x + _SLASH_COS[i] * (s * 0.9);
      const py = y + _SLASH_SIN[i] * (s * 0.9);
      if (i === 0) pctx.moveTo(px, py);
      else pctx.lineTo(px, py);
    }
    pctx.closePath();
    pctx.stroke();
  }

  // Draw tiling centers for pointy-topped hexagons
  drawHex(0, 0);
  drawHex(w, 0);
  drawHex(0, h);
  drawHex(w, h);
  drawHex(w/2, h/2);
  
  _cronosHoneycombPattern = ctx.createPattern(canvas, 'repeat');
  return _cronosHoneycombPattern;
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
    this.meleeSwingDirection = 1;
    this.doubleStrikeTimer = 0;
    this.attackSlashEffects = [];
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
    this.meleeSwingDirection = 1; // 1 = right-to-left, -1 = left-to-right
    this.doubleStrikeTimer = 0;   // Window to execute the second strike
    this.attackSlashEffects = [];
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

  aim(opponent) {
    if (opponent) {
      this.gunAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    }
  }

  // Override takeDamage to implement counter-stop passive
  takeDamage(amount, attacker, opts = {}) {
    const damageTaken = super.takeDamage(amount, attacker, opts);

    if (damageTaken !== false && attacker && attacker !== this) {
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
    // OPTIMIZATION: More aggressive quality throttle for slash effects
    const fps = state.fps || 60;
    const qualityLevel = state.qualityLevel || 1.0;
    if (qualityLevel < 0.5 || fps < 45) return; // Completely disable at low quality/fps
    if (qualityLevel < 0.7 && fps < 55 && Math.random() > 0.5) return; // Throttle more aggressively at medium quality

    const slashCount = 1; // Cap at 1 slash effect per swing to reduce draw calls
    for (let i = 0; i < slashCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.r * (0.6 + Math.random() * 0.35);
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      const slashAngle = angle + (Math.random() - 0.5) * 0.85;
      // OPTIMIZATION: Further reduce particle lifetime
      const life = 3 + Math.floor(Math.random() * 2);
      this.attackSlashEffects.push({
        x: this.x + offsetX,
        y: this.y + offsetY,
        angle: slashAngle,
        life,
        maxLife: life,
        size: 10 + Math.random() * 14,
        alpha: 0.7 + Math.random() * 0.25,
      });
    }
  }

  _updateAttackSlashEffects() {
    // OPTIMIZATION: Use swap-and-pop instead of splice for O(1) removal
    for (let i = this.attackSlashEffects.length - 1; i >= 0; i--) {
      const effect = this.attackSlashEffects[i];
      effect.life--;
      if (effect.life <= 0) {
        this.attackSlashEffects[i] = this.attackSlashEffects[this.attackSlashEffects.length - 1];
        this.attackSlashEffects.pop();
      }
    }
  }

  _drawAttackSlashEffects(ctx) {
    if (!this.attackSlashEffects.length) return;

    const fps = state.fps || 60;
    const qualityLevel = state.qualityLevel || 1.0;
    const useLOD = false;
    const useUltraLOD = false;

    for (const effect of this.attackSlashEffects) {
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = effect.alpha * (1 - progress);

      // Honeycomb effect completely removed.
      
      const scale = 0.5 + progress * 0.9;

      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.angle + Math.sin(progress * Math.PI) * 0.18);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      // Removed 'screen' blending to prevent white blur on white background

      // Main slash core - sharp angular blade slash with BOTH tips pointed
      const slashGradient = ctx.createLinearGradient(-effect.size * 0.6, 0, effect.size * 0.6, 0);
      slashGradient.addColorStop(0, `rgba(0, 180, 220, ${0.3 * alpha})`);
      slashGradient.addColorStop(0.15, `rgba(0, 200, 240, ${0.7 * alpha})`);
      slashGradient.addColorStop(0.5, `rgba(0, 240, 255, ${1.0 * alpha})`);
      slashGradient.addColorStop(0.85, `rgba(0, 200, 240, ${0.7 * alpha})`);
      slashGradient.addColorStop(1, `rgba(0, 180, 220, ${0.3 * alpha})`);

      ctx.strokeStyle = slashGradient;
      ctx.lineWidth = 2 + progress * 4;
      // Removed shadowBlur to prevent blur

      ctx.beginPath();
      // Sharp slash with BOTH tips pointed (diamond blade shape)
      ctx.moveTo(-effect.size * 0.55, -effect.size * 0.3);
      ctx.lineTo(-effect.size * 0.15, -effect.size * 0.06);
      ctx.lineTo(effect.size * 0.15, effect.size * 0.06);
      ctx.lineTo(effect.size * 0.55, effect.size * 0.3);
      ctx.stroke();

      // OPTIMIZATION: Skip detailed edge highlights on Ultra LOD
      if (!useUltraLOD) {
        // Sharp BOTTOM edge highlight - dark cyan
        ctx.strokeStyle = `rgba(0, 200, 240, ${0.95 * alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-effect.size * 0.45, -effect.size * 0.22);
        ctx.lineTo(-effect.size * 0.1, -effect.size * 0.03);
        ctx.lineTo(effect.size * 0.1, effect.size * 0.03);
        ctx.lineTo(effect.size * 0.45, effect.size * 0.22);
        ctx.stroke();

        // Sharp TOP edge highlight - dark cyan
        ctx.strokeStyle = `rgba(0, 180, 220, ${0.85 * alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-effect.size * 0.5, -effect.size * 0.28);
        ctx.lineTo(-effect.size * 0.12, -effect.size * 0.05);
        ctx.lineTo(effect.size * 0.12, effect.size * 0.05);
        ctx.lineTo(effect.size * 0.5, effect.size * 0.28);
        ctx.stroke();

        // Sharp LEFT tip accent (starting point) - dark cyan
        ctx.strokeStyle = `rgba(0, 220, 255, ${0.9 * alpha})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(-effect.size * 0.55, -effect.size * 0.3);
        ctx.lineTo(-effect.size * 0.35, -effect.size * 0.18);
        ctx.stroke();

        // Sharp RIGHT tip accent (ending point) - dark cyan
        ctx.strokeStyle = `rgba(0, 220, 255, ${0.95 * alpha})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(effect.size * 0.45, effect.size * 0.22);
        ctx.lineTo(effect.size * 0.55, effect.size * 0.3);
        ctx.stroke();
      }

      if (!useLOD) {
        // Clear shadow effects before drawing complex shapes and particles to prevent severe FPS drops
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }

      // Sharp diamond/blade glow fill - BOTH tips sharp
      // Removed 'lighter' blending
      ctx.fillStyle = `rgba(0, 200, 240, ${0.6 * alpha})`;
      ctx.beginPath();
      // Left sharp tip
      ctx.moveTo(-effect.size * 0.55, -effect.size * 0.3);
      ctx.lineTo(-effect.size * 0.2, -effect.size * 0.08);
      ctx.lineTo(effect.size * 0.2, effect.size * 0.08);
      // Right sharp tip
      ctx.lineTo(effect.size * 0.55, effect.size * 0.3);
      ctx.lineTo(effect.size * 0.2, effect.size * 0.08);
      ctx.lineTo(-effect.size * 0.2, -effect.size * 0.08);
      ctx.closePath();
      ctx.fill();

      // Sharp edge particles - small angular debris flying from both tips
      // Removed 'screen' blending to prevent blur
      
      // Skip complex particle math if on low-quality/low-FPS - more aggressive
      if (!useLOD && state.fps > 50) {
        ctx.fillStyle = `rgba(0, 190, 230, ${0.85 * alpha})`; // Vibrant cyan instead of white
        // OPTIMIZATION: Reduce particle count from 4 to 2 per tip
        const leftParticleAngles = [-0.3, 0.1];
        leftParticleAngles.forEach((pAngle, idx) => {
          const pDist = effect.size * (0.25 + idx * 0.12);
          const px = -effect.size * 0.5 + Math.cos(pAngle) * pDist;
          const py = -effect.size * 0.25 + Math.sin(pAngle) * pDist;
          const pSize = (1.2 + idx * 0.4) * (1 - progress * 0.5);
          ctx.beginPath();
          // Diamond shape for sharp particles
          ctx.moveTo(px, py - pSize);
          ctx.lineTo(px + pSize * 0.5, py);
          ctx.lineTo(px, py + pSize);
          ctx.lineTo(px - pSize * 0.5, py);
          ctx.closePath();
          ctx.fill();
        });
        // Particles from RIGHT tip
        const rightParticleAngles = [2.8, 3.1];
        rightParticleAngles.forEach((pAngle, idx) => {
          const pDist = effect.size * (0.25 + idx * 0.12);
          const px = effect.size * 0.5 + Math.cos(pAngle) * pDist;
          const py = effect.size * 0.25 + Math.sin(pAngle) * pDist;
          const pSize = (1.2 + idx * 0.4) * (1 - progress * 0.5);
          ctx.beginPath();
          // Diamond shape for sharp particles
          ctx.moveTo(px, py - pSize);
          ctx.lineTo(px + pSize * 0.5, py);
          ctx.lineTo(px, py + pSize);
          ctx.lineTo(px - pSize * 0.5, py);
          ctx.closePath();
          ctx.fill();
        });
      }

      ctx.restore();
    }
  }

  // Try melee attack with crescent blade
  _tryMeleeAttack(opponent, ownerIndex) {
    if (!opponent || this.meleeCooldown > 0) return;

    const dx = opponent.x - this.x;
    const dy = opponent.y - this.y;
    const maxRange = this.r + opponent.r + CONFIG.cronos.meleeRange;
    if ((dx * dx + dy * dy) > maxRange * maxRange) return;

    // --- Double Strike Logic ---
    // Determine if this is the first or second strike in a potential combo.
    const isFirstStrike = this.doubleStrikeTimer <= 0;

    // Alternate the visual swing direction for a back-and-forth feel.
    this.meleeSwingDirection *= -1;

    if (isFirstStrike) {
      // This is the first hit, so open the window for the second strike.
      this.doubleStrikeTimer = CONFIG.cronos.doubleStrikeWindow ?? 15;
    } else {
      // This is the second hit, so close the window.
      this.doubleStrikeTimer = 0;
    }

    // For the first strike, lock the swing angle toward the opponent.
    // For the rapid second strike, reuse the initial angle so it swings back along the same visual line
    // even if Cronos has zipped past the opponent's position.
    if (isFirstStrike) {
      this.meleeSwingAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
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

    // If this was the first strike, use a short cooldown to allow the second strike.
    // Otherwise, use the normal cooldown to end the combo.
    this.meleeCooldown = isFirstStrike ? Math.floor(meleeCooldown * 0.1) : meleeCooldown;

    this._spawnAttackSlashEffect();

    applyDamageToTarget(opponent, meleeDamage, this, { isMelee: true });
    
    // Physical hit knockback (less per hit since he hits twice rapidly)
    const kbAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    opponent.vx += Math.cos(kbAngle) * 4;
    opponent.vy += Math.sin(kbAngle) * 4;

    spawnFloatingText(opponent.x, opponent.y - opponent.r - 5, hitText, '#FF007F');

    // Passive stop chance on hit
    if (Math.random() < CONFIG.cronos.passiveStopChance) {
      if (opponent.applyTimeStop) {
        if (!opponent.timeStopTimer || opponent.timeStopTimer <= 0) {
          opponent.applyTimeStop(CONFIG.cronos.passiveStopDuration);
          opponent._suppressFreezeTimer = true;
          spawnFloatingText(opponent.x, opponent.y - opponent.r - 15, 'STOPPED!', '#00F3FF');
        } else {
          // Just refresh silently
          opponent.applyTimeStop(CONFIG.cronos.passiveStopDuration);
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

    this.handlePoison();
    this.handleBurn();
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
            if (state.mode === GAME_MODES.TWO_VS_TWO && selfTeam !== null && state.getFighterTeam(fi) === selfTeam) continue;
            if (entity.invincibilityTimer > 0 || entity.flashStepTimer > 0) continue;
          }

          // Check if illusion
          if (entity.isIllusion && state.mode === GAME_MODES.TWO_VS_TWO && selfTeam !== null) {
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

      // Try to deploy sphere when cooldown is ready and opponent is within activation distance
      if (this.sphereCooldown === 0 && opponent) {
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
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.speed * (this._def.spinRate ?? CONFIG.spin.rate);

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

    // Try melee attack
    if (opponent) {
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
    if (sphereSound) playSound(sphereSound.src, sphereSound.volume);

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
    const useLOD = false;

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
    // Weapon visual will be added to weaponVisuals.js
    drawCronosCrescentBlade(ctx, this.x, this.y, this.gunAngle, this.r, this.meleeSwingActive, this.meleeSwingTimer, this.meleeSwingAngle, CONFIG.cronos.meleeSwingDuration, this.meleeSwingDirection);
  }

  // Override drawGun to prevent the base class weapon from being drawn
  // Cronos uses the crescent blade visual instead
  drawGun(ctx) {
    // Empty - Cronos doesn't use a normal weapon
  }

  draw(ctx) {
    // Draw pre-activation barrier — stays visible from pre-activate window
    // all the way until the sphere is actually unleashed.
    const inPreWindow = this.sphereCooldown > 0 && this.sphereCooldown <= CONFIG.cronos.spherePreActivateFrames;
    const sphereReady = !this.sphereActive && this.sphereCooldown === 0;
    if (inPreWindow || sphereReady) {
      const now = Date.now();
      const progress = sphereReady
        ? 1  // full intensity when fully charged
        : 1 - this.sphereCooldown / Math.max(1, CONFIG.cronos.spherePreActivateFrames);
      const barrierRadius = Math.max(this.r * 1.5, 55);
      drawCronosPreActivateBarrier({
        ctx,
        cx: this.x,
        cy: this.y,
        radius: barrierRadius,
        preProgress: progress,
        now,
      });
    }

    // Draw sphere impact burst when sphere is first unleashed
    if (this.sphereImpactTimer > 0) {
      const now = Date.now();
      const impactProgress = 1 - this.sphereImpactTimer / 25;
      drawCronosSphereImpact({
        ctx,
        cx: this.x,
        cy: this.y,
        radius: Math.max(this.r * 1.5, 55),
        impactProgress,
        now,
      });
    }

    // Draw time stop sphere at deployment location
    // The main sphere visual is now rendered globally via drawAllCronosSpheres()
    // so it sits at the correct z-index over illusions and fighters.
    if (this.sphereActive) {
      // This is now handled by drawAllCronosSpheres
    }

    // Draw melee swing arc
    if (this.meleeSwingActive || this.meleeSlashFadeTimer > 0) {
      let swingProgress = 1.0;
      let fade = this.meleeSlashFadeTimer / 15;

      const qualityLevel = state.qualityLevel || 1.0;
      const isMulti = state && state.mode && state.mode !== '1v1';
      const useLOD = false;

      if (this.meleeSwingActive) {
        swingProgress = 1 - (this.meleeSwingTimer / CONFIG.cronos.meleeSwingDuration);
        fade = 1.0;
      }

      // Determine swing direction for correct visual arc rendering
      const isForward = this.meleeSwingDirection === 1;

      const arcRadius = this.r + 80;
      const innerRadius = this.r + 30;

      const fullStartA = -Math.PI * 0.4; // Matches start of sword swing
      const fullEndA = Math.PI * 0.4;    // Matches end of sword swing

      const currentEndA = isForward 
         ? fullStartA + (fullEndA - fullStartA) * swingProgress
         : fullEndA - (fullEndA - fullStartA) * swingProgress;

      const fullEndX = Math.cos(fullEndA) * arcRadius;
      const fullStartX = Math.cos(fullStartA) * arcRadius;
      const fullStartY = Math.sin(fullStartA) * arcRadius;
      const fullEndY = Math.sin(fullEndA) * arcRadius;
      const cx = 2 * (innerRadius - 0.25 * (fullStartX + fullEndX));

      const glowAlpha = Math.pow(fade, 0.8) * 0.95;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.meleeSwingAngle);

      // Clip region so the slash "grows" trailing the sword
      ctx.beginPath();
      ctx.moveTo(0, 0);
      if (isForward) {
        ctx.arc(0, 0, arcRadius + 20, fullStartA, currentEndA, false);
      } else {
        ctx.arc(0, 0, arcRadius + 20, fullEndA, currentEndA, true); // counter-clockwise for reverse
      }
      ctx.closePath();
      ctx.clip();

      // No shadow blur - keeps the slash crisp on white background

      // Draw full shape (revealed by clip)
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, fullStartA, fullEndA);
      ctx.quadraticCurveTo(cx, 0, fullStartX, fullStartY);
      ctx.closePath();

      // Dynamic gradient that anchors bright tip to current sword position
      const currentY = Math.sin(currentEndA) * arcRadius;
      const gradStartY = isForward ? fullStartY : fullEndY;
      const gradEndY = isForward
        ? Math.max(fullStartY + 0.1, currentY)
        : Math.min(fullEndY - 0.1, currentY);

      const slashGrad = ctx.createLinearGradient(0, gradStartY, 0, gradEndY);
      slashGrad.addColorStop(0, 'rgba(0, 180, 220, 0.0)');
      slashGrad.addColorStop(0.3, 'rgba(0, 200, 235, 0.7)');
      slashGrad.addColorStop(0.7, 'rgba(0, 220, 245, 0.9)');
      slashGrad.addColorStop(1, 'rgba(0, 240, 255, 1.0)');

      ctx.fillStyle = slashGrad;
      ctx.globalAlpha = glowAlpha;
      ctx.fill();

      // Outer edge
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius, fullStartA, fullEndA);
      ctx.strokeStyle = 'rgba(0, 220, 240, 1.0)';
      ctx.lineWidth = 3;
      ctx.globalAlpha = glowAlpha * 0.85;
      ctx.stroke();

      // Inner trail
      ctx.beginPath();
      ctx.arc(0, 0, arcRadius - 14, fullStartA * 0.8, fullEndA * 0.9);
      ctx.strokeStyle = 'rgba(0, 200, 230, 0.9)';
      ctx.lineWidth = 2;
      ctx.globalAlpha = glowAlpha * 0.6;
      ctx.stroke();

      // Honeycomb Texture Overlay - completely bypass under performance load or low quality levels
      // OPTIMIZATION: More aggressive FPS check - only draw at high FPS
      if (!useLOD && state.fps > 55) {
        ctx.beginPath();
        ctx.arc(0, 0, arcRadius, fullStartA, fullEndA);
        ctx.quadraticCurveTo(cx, 0, fullStartX, fullStartY);
        ctx.closePath();
        ctx.clip();

        // Removed 'screen' blending for white background
        ctx.shadowBlur = 0;

        // OPTIMIZATION: Use module-level cached cos/sin (was rebuilding 12 values per frame)
        const cosA = _SLASH_COS;
        const sinA = _SLASH_SIN;

        const cellSize = 8;
        const cellOffsetX = cellSize * 1.75;
        const cellOffsetY = cellSize * 1.52;

        const minX = -arcRadius;
        const maxX = arcRadius;
        const minY = -arcRadius;
        const maxY = arcRadius;

        const colStart = Math.floor(minX / cellOffsetX) - 1;
        const colEnd = Math.ceil(maxX / cellOffsetX) + 1;
        const rowStart = Math.floor(minY / cellOffsetY) - 1;
        const rowEnd = Math.ceil(maxY / cellOffsetY) + 1;

        ctx.beginPath();
        for (let row = rowStart; row <= rowEnd; row++) {
          for (let col = colStart; col <= colEnd; col++) {
            const x = col * cellOffsetX + (row % 2 ? cellOffsetX * 0.5 : 0);
            const y = row * cellOffsetY;
            if (x < minX || x > maxX || y < minY || y > maxY) continue;

            for (let i = 0; i < 6; i++) {
              const px = x + cosA[i] * cellSize;
              const py = y + sinA[i] * cellSize;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
          }
        }

        // Use the exact same dynamic gradient as the slash body so the texture smoothly fades towards the tail
        ctx.strokeStyle = slashGrad;
        ctx.lineWidth = 1.5;
        // glowAlpha already scales the overall transparency
        ctx.globalAlpha = glowAlpha * 1.2;
        ctx.stroke();
      }

      ctx.restore();
    }

    super.draw(ctx);
  }
}
