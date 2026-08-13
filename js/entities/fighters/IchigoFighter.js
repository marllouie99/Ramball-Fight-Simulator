import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { drawIchigoSkin, updateZangetsuRibbonPhysics } from '../../graphics/fighters/ichigoSkin.js';
import { fastCleanArray, pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';
import { spawnMeleeClashShockwave, spawnImpactFlash } from '../../graphics/particles/sparkEffect.js';

export class IchigoFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'ichigo';
    this.type = 'ichigo';
    this.color = '#FF5500'; // Orange theme color for text / highlights
    this.skin = def.skin || (typeof state !== 'undefined' ? (state.selectedIchigoSkin || 'shikai') : 'shikai');

    // Skill & combat states
    this.swordCooldown = 0;
    this.getsugaCooldown = 0;
    this.shunpoCooldown = 0;
    this.ultimateCooldown = CONFIG.ichigo?.ultimateCooldown || 1500;

    this.hollowMaskActive = false;
    this.hollowMaskTimer = 0;
    this.hollowMaskUsed = false;

    this.vastoLordeActive = false;
    this.vastoLordeTimer = 0;
    this.ceroTimer = 0;
    this.ceroTarget = null;

    // Visuals
    this.afterImages = [];
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = 0;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
    this.shunpoStartX = 0;
    this.shunpoStartY = 0;
    this.shunpoTargetX = 0;
    this.shunpoTargetY = 0;
  }

  reset() {
    super.reset();
    this.swordCooldown = 0;
    this.getsugaCooldown = 0;
    this.shunpoCooldown = 0;
    this.ultimateCooldown = CONFIG.ichigo?.ultimateCooldown || 1500;
    this.hollowMaskActive = false;
    this.hollowMaskTimer = 0;
    this.hollowMaskUsed = false;
    this.vastoLordeActive = false;
    this.vastoLordeTimer = 0;
    this.ceroTimer = 0;
    this.ceroTarget = null;
    this.afterImages = [];
    this.slashSwingTimer = 0;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
  }

  interruptAttacks() {
    this.slashSwingTimer = 0;
    this.isShunpoDashing = false;
    this.shunpoDashTimer = 0;
  }

  _getClosestEnemy() {
    let closest = null;
    let minDist = Infinity;
    const myIndex = state.fighters.indexOf(this);
    const myTeam = state.getFighterTeam(myIndex);
    
    // Check fighters
    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0) {
          const isEnemy = myTeam === null || state.getFighterTeam(idx) !== myTeam;
          if (isEnemy) {
            const dist = Math.hypot(f.x - this.x, f.y - this.y);
            if (dist < minDist) {
              minDist = dist;
              closest = f;
            }
          }
        }
      });
    }
    // Check illusions (Rule #6: Unified queries include illusions)
    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0) {
          const ownerIdx = ill.ownerIndex !== undefined ? ill.ownerIndex : state.fighters.indexOf(ill.owner);
          const isEnemy = myTeam === null || state.getFighterTeam(ownerIdx) !== myTeam;
          if (isEnemy) {
            const dist = Math.hypot(ill.x - this.x, ill.y - this.y);
            if (dist < minDist) {
              minDist = dist;
              closest = ill;
            }
          }
        }
      });
    }
    return closest;
  }

  triggerDemoAttack() {
    // Showcases Getsuga Tensho or Shunpo Strike in preview screen
    const target = this._getClosestEnemy();
    if (target) {
      this.aim(target);
      this.getsugaCooldown = 0;
      this.fireGetsuga(target);
    }
  }

  fireGetsuga(target) {
    const isMask = this.hollowMaskActive || this.vastoLordeActive;
    const damage = isMask ? (CONFIG.ichigo?.hollowGetsugaDamage || 50) : (CONFIG.ichigo?.getsugaDamage || 30);
    const speed = isMask ? (CONFIG.ichigo?.hollowGetsugaSpeed || 22) : (CONFIG.ichigo?.getsugaSpeed || 16);
    const ownerIndex = state.fighters.indexOf(this);
    const isShikai = this.skin === 'shikai';

    if (projectileSystem) {
      // Firegetsuga crescent projectile
      projectileSystem.fireProjectile(
        this,
        ownerIndex,
        damage,
        false,
        speed,
        false,
        (isMask && !isShikai) ? 'blackGetsuga' : 'getsuga',
        this.x,
        this.y,
        this.gunAngle
      );
    }

    this.getsugaCooldown = CONFIG.ichigo?.getsugaCooldown || 360;
    this.slashSwingTimer = 26;
    this.slashSwingMaxTimer = 26;

    spawnFloatingText(this.x, this.y - this.r - 28, (isMask && !isShikai) ? 'BLACK GETSUGA!' : 'GETSUGA TENSHO!', (isMask && !isShikai) ? '#FF1E00' : '#00D5FF');
    audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9);
    audioSystem.playSFX('Assets/Sound Effects/SkillEffects/flare.mp3', 0.7);
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(2, 8);
    }
  }

  performShunpoStrike(target) {
    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    // Flash step to target's back (offset opposite to their facing angle or just past them)
    const dashRange = CONFIG.ichigo?.shunpoRange || 220;
    
    this.shunpoStartX = this.x;
    this.shunpoStartY = this.y;
    
    // Position slightly behind the target along the aiming vector
    this.shunpoTargetX = target.x + Math.cos(angle) * (target.r + 30);
    this.shunpoTargetY = target.y + Math.sin(angle) * (target.r + 30);
    
    this.isShunpoDashing = true;
    this.shunpoDashTimer = 5; // 5-frame instant dash/teleport
    this.shunpoCooldown = CONFIG.ichigo?.shunpoCooldown || 240;

    spawnFloatingText(this.x, this.y - this.r - 20, 'SHUNPO!', '#FFFFFF');
    audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.8);
  }

  triggerDemoAttack() {
    this.slashSwingTimer = 22;
    this.slashSwingMaxTimer = 22;
    audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);
  }

  performMeleeCleave(target) {
    const isMask = this.hollowMaskActive || this.vastoLordeActive;
    const damageMult = isMask ? (CONFIG.ichigo?.hollowDamageMultiplier || 1.5) : 1.0;
    const baseDamage = CONFIG.ichigo?.swordDamage || 16;
    const finalDamage = baseDamage * damageMult;

    this.swordCooldown = CONFIG.ichigo?.swordCooldown || 30;
    this.slashSwingTimer = 22;
    this.slashSwingMaxTimer = 22;

    audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.8);

    // Rule #7: Frontal Arc Radius AOE for Melee Weapon Users
    const arc = (140 * Math.PI) / 180; // 140 degrees arc
    const reach = CONFIG.ichigo?.swordRange || 70;
    const myIndex = state.fighters.indexOf(this);
    const myTeam = state.getFighterTeam(myIndex);

    // Check all valid targets (fighters & illusions)
    const candidates = [];
    if (state.fighters) {
      state.fighters.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0 && !f.isRespawning) {
          if (myTeam === null || state.getFighterTeam(idx) !== myTeam) {
            candidates.push(f);
          }
        }
      });
    }
    if (state.illusions) {
      state.illusions.forEach((ill) => {
        if (ill && ill.hp > 0) {
          const ownerIdx = ill.ownerIndex !== undefined ? ill.ownerIndex : state.fighters.indexOf(ill.owner);
          if (myTeam === null || state.getFighterTeam(ownerIdx) !== myTeam) {
            candidates.push(ill);
          }
        }
      });
    }

    candidates.forEach((enemy) => {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= reach + enemy.r) {
        // Calculate angle relative to aim direction
        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - this.gunAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        if (Math.abs(angleDiff) <= arc / 2) {
          // Rule #5: ALWAYS apply hit-pause/time-stop exclusively to the target, NEVER to the attacker
          if (typeof enemy.applyTimeStop === 'function') {
            enemy.applyTimeStop(8);
          }

          // Deal damage and knockback
          applyDamageToTarget(enemy, finalDamage, this, { isMelee: true });
          
          const kbForce = CONFIG.ichigo?.knockback || 6;
          enemy.applyKnockback(Math.cos(angleToEnemy) * kbForce, Math.sin(angleToEnemy) * kbForce);
          
          spawnImpactFlash(enemy.x, enemy.y, isMask ? 'sukuna' : 'gojo');
          spawnMeleeClashShockwave(enemy.x, enemy.y, 35, isMask ? 'sukuna' : 'gojo');
        }
      }
    });
  }

  performCeroFinisher(target) {
    if (!target || target.hp <= 0) return;
    
    // Rule #5: Freeze target during point-blank execution
    if (typeof target.applyTimeStop === 'function') {
      target.applyTimeStop(CONFIG.ichigo?.ceroFreezeDuration || 75);
    }
    
    this.ceroTimer = 45; // 45 frames of cero charge/beam duration
    this.ceroTarget = target;
    audioSystem.playSFX('Assets/Sound Effects/Skills/redcharging.mp3', 1.0);
    spawnFloatingText(this.x, this.y - this.r - 28, "CERO!", "#FF0000");
  }

  update(opponent, ownerIndex, arena) {
    if (this.isDead || this.isRespawning || this.hp <= 0) {
      this.afterImages = [];
      return;
    }

    // Update afterimages (fades even if frozen)
    if (this.afterImages && this.afterImages.length > 0) {
      fastCleanArray(this.afterImages, (img) => {
        img.timer--;
        return img.timer > 0;
      });
    }

    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Rule #1: At the top of EVERY fighter update() method, freeze/time-stop guard checks
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush || this.isParalyzed) {
      this.interruptAttacks();
      return;
    }

    super.update(opponent, ownerIndex, arena);

    // Update Zangetsu trailing cloth ribbon physics
    updateZangetsuRibbonPhysics(this);

    // Tick down skill cooldowns
    if (this.swordCooldown > 0) this.swordCooldown--;
    if (this.getsugaCooldown > 0) this.getsugaCooldown--;
    if (this.shunpoCooldown > 0) this.shunpoCooldown--;
    if (this.ultimateCooldown > 0) this.ultimateCooldown--;
    if (this.slashSwingTimer > 0) this.slashSwingTimer--;

    const isMask = this.hollowMaskActive || this.vastoLordeActive;

    // Hollow Mask Passive Activation
    if (!this.hollowMaskUsed && !this.vastoLordeActive && this.hp / this.maxHp <= (CONFIG.ichigo?.hollowMaskThreshold || 0.30)) {
      this.hollowMaskUsed = true;
      this.hollowMaskActive = true;
      this.hollowMaskTimer = CONFIG.ichigo?.hollowMaskDuration || 600;
      spawnFloatingText(this.x, this.y - this.r - 28, "HOLLOW MASK!", "#FF1E00");
      audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9);
      if (typeof triggerGlobalScreenShake === 'function') {
        triggerGlobalScreenShake(3, 15);
      }
    }

    // Hollow Mask expiration
    if (this.hollowMaskActive) {
      this.hollowMaskTimer--;
      if (this.hollowMaskTimer <= 0) {
        this.hollowMaskActive = false;
        spawnFloatingText(this.x, this.y - this.r - 28, "MASK SHATTERED", "#FFFFFF");
        audioSystem.playSFX('Assets/Sound Effects/Attacks/fleshhit.mp3', 0.7);
      }
    }

    // Vasto Lorde (Ultimate) Active Loop
    if (this.vastoLordeActive) {
      this.vastoLordeTimer--;
      
      // Health regeneration
      const regen = CONFIG.ichigo?.vastoLordeHpRegen || 1.2;
      this.hp = Math.min(this.maxHp, this.hp + regen);

      // Trail effects
      if (Math.random() < 0.35) {
        pushTrailCap(this.afterImages, {
          x: this.x,
          y: this.y,
          r: this.r,
          angle: this.angle,
          color: 'rgba(139, 0, 0, 0.45)',
          timer: 15,
          maxTimer: 15
        }, 12);
      }

      // Check ultimate end to trigger Cero finisher
      if (this.vastoLordeTimer <= 0) {
        this.vastoLordeActive = false;
        const target = this._getClosestEnemy();
        if (target) {
          this.performCeroFinisher(target);
        }
      }
    }

    // Cero Finisher sequence
    if (this.ceroTimer > 0) {
      this.ceroTimer--;
      this.vx = 0;
      this.vy = 0;
      
      const target = this.ceroTarget;
      if (target && target.hp > 0) {
        this.aim(target);
      }

      // Fire Cero beam at frame 15 of charge
      if (this.ceroTimer === 30) {
        if (projectileSystem && target) {
          const ceroDmg = CONFIG.ichigo?.ceroDamage || 85;
          const ceroWidth = CONFIG.ichigo?.ceroWidth || 80;
          
          projectileSystem.fireProjectile(
            this,
            ownerIndex,
            ceroDmg,
            false,
            24,
            false,
            'ceroBeam',
            this.x,
            this.y,
            this.gunAngle
          );
          
          audioSystem.playSFX('Assets/Sound Effects/Skills/genos-ultimateblast.mp3', 1.0);
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(8, 25);
          }
        }
      }
      return; // Skip other actions during Cero sequence
    }

    // Shunpo Dashing Physics
    if (this.isShunpoDashing) {
      this.shunpoDashTimer--;
      
      // Interpolate position
      const p = 1 - (this.shunpoDashTimer / 5);
      const prevX = this.x;
      const prevY = this.y;
      this.x = this.shunpoStartX + (this.shunpoTargetX - this.shunpoStartX) * p;
      this.y = this.shunpoStartY + (this.shunpoTargetY - this.shunpoStartY) * p;
      this.vx = 0;
      this.vy = 0;

      // Spawn manga action speed lines (Rule #16) behind him
      pushTrailCap(this.afterImages, {
        x: this.x,
        y: this.y,
        r: this.r,
        angle: this.angle,
        color: isMask ? 'rgba(255, 30, 0, 0.5)' : 'rgba(0, 213, 255, 0.4)',
        timer: 16,
        maxTimer: 16
      }, 10);

      // Deal damage to enemies crossed during dash
      const myTeam = state.getFighterTeam(ownerIndex);
      const dashDamage = CONFIG.ichigo?.shunpoSlashDamage || 25;

      const candidates = [];
      if (state.fighters) candidates.push(...state.fighters);
      if (state.illusions) candidates.push(...state.illusions);

      candidates.forEach((f, idx) => {
        if (f && f !== this && f.hp > 0 && !f.isRespawning) {
          const fIdx = state.fighters.indexOf(f);
          const isEnemy = fIdx === -1 ? true : (myTeam === null || state.getFighterTeam(fIdx) !== myTeam);
          if (isEnemy) {
            // Check distance to line segment
            const dist = this._distToSegment(f.x, f.y, prevX, prevY, this.x, this.y);
            if (dist <= f.r + 15) {
              applyDamageToTarget(f, dashDamage, this, { isSkill: true });
              f.applyHitStun(CONFIG.ichigo?.shunpoStunDuration || 20);
              spawnImpactFlash(f.x, f.y, 'gojo');
            }
          }
        }
      });

      if (this.shunpoDashTimer <= 0) {
        this.isShunpoDashing = false;
      }
      return;
    }

    // AI Logic (autonomous decision making)
    if (!this.playerControlled) {
      const target = this._getClosestEnemy();
      if (target) {
        this.aim(target);
        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        // Rule #3: Whenever a fighter teleports or changes position, ALWAYS update aim(target) immediately afterward
        // (Handled below after Shunpo or when moving)

        // 1. Trigger Ultimate: Vasto Lorde Awakening
        if (this.ultimateCooldown <= 0 && this.hp / this.maxHp <= 0.50 && !this.vastoLordeActive) {
          this.vastoLordeActive = true;
          this.vastoLordeTimer = CONFIG.ichigo?.ultimateDuration || 480;
          this.ultimateCooldown = CONFIG.ichigo?.ultimateCooldown || 1500;
          spawnFloatingText(this.x, this.y - this.r - 28, "VASTO LORDE!", "#8B0000");
          audioSystem.playSFX('Assets/Sound Effects/Skills/domainexpansion.mp3', 1.0);
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(5, 30);
          }
        }

        // 2. Trigger Shunpo (Skill 2)
        if (this.shunpoCooldown <= 0 && dist > 180 && dist < 350) {
          this.performShunpoStrike(target);
          this.aim(target); // Rule #3: aim immediately after teleport
          return;
        }

        // 3. Trigger Getsuga Tensho (Skill 1)
        if (this.getsugaCooldown <= 0 && dist > 120 && dist < 400 && Math.random() < 0.6) {
          this.fireGetsuga(target);
          return;
        }

        // 4. Melee attacks (Tensa Zangetsu cleave)
        const reach = CONFIG.ichigo?.swordRange || 70;
        if (dist <= reach + target.r && this.swordCooldown <= 0) {
          this.performMeleeCleave(target);
        }
      }
    }
  }

  // Helper to calculate distance from point to segment
  _distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  drawBody(ctx) {
    // Handled in drawYujiSkin style inline or via ichigoSkin.js
    drawIchigoSkin(ctx, this);
    this.drawStatusOverlays(ctx, this.r);
  }

  drawGun(ctx) {
    // Override to prevent drawing the default gun barrel and hands
  }

  draw(ctx) {
    // Render afterimages
    if (this.afterImages && this.afterImages.length > 0) {
      ctx.save();
      for (const ai of this.afterImages) {
        ctx.save();
        ctx.globalAlpha = ai.timer / ai.maxTimer * 0.4;
        ctx.translate(ai.x, ai.y);
        ctx.rotate(ai.angle);
        ctx.fillStyle = ai.color;
        ctx.beginPath();
        ctx.arc(0, 0, ai.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    super.draw(ctx);
  }
}
