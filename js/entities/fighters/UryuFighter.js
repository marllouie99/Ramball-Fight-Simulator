// ─────────────────────────────────────────────
// Uryu Ishida Fighter Entity (The Last Quincy)
// Bleach: Thousand-Year Blood War
// Adhering to Rule 1 (Freeze Guards), Rule 3 (Aim Alignment),
// Rule 5 & 6 (Combat Freezes & Illusion Queries),
// Rule 7 (Frontal Arc Melee), and Rule 18 (HUD Consistency).
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { drawUryuSkin } from '../../graphics/fighters/uryuSkin.js';
import { drawUryuSeeleSlashArc } from '../../graphics/weapons/uryuWeaponGraphics.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { spawnImpactFlash, spawnSparks, spawnMeleeClashShockwave } from '../../graphics/particles/sparkEffect.js';

export class UryuFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'uryu';
    this.type = 'uryu';
    this.color = '#00E5FF'; // Quincy Cyan
    this.suppressSketchyOutline = true; // Use clean solid dark outline from skin renderer

    const cfg = (typeof CONFIG !== 'undefined' && CONFIG.uryu) ? CONFIG.uryu : {};

    // Basic Attack & Animation States
    this.shootCooldown = 15;
    this.shootCooldownMax = cfg.shootCooldown || 34;
    this.burstRemaining = 0;
    this.isShooting = false;
    this.isDrawingBow = false;
    this.drawPhase = 'IDLE'; // 'IDLE' | 'DRAWING' | 'RECOIL'
    this.arrowDrawTimer = 0;
    this.arrowDrawDuration = 11;
    this.arrowDrawProgress = 0;
    this.smoothDrawProgress = 0;
    this.recoilHoldTimer = 0;
    this.stringRecoilTimer = 0;
    this.stringRecoilMax = 6;

    // Melee Intercept: Seele Schneider & Weapon Switch Buffer
    this.slashSwingTimer = 0;
    this.slashSwingMaxTimer = cfg.seeleSwingDuration || 18;
    this.seeleImpactFrame = cfg.seeleImpactFrame || 8;
    this.slashSwingImpactTimer = 0;
    this._chopHitDelivered = true;
    this.seeleCooldown = 0;
    this.seeleCooldownMax = cfg.seeleCooldown || 32;
    this.seeleEquipProgress = 0; // 0.0 = 100% Bow mode, 1.0 = 100% Seele Schneider mode
    this.weaponSwitchTimer = 0;
    this.weaponSwitchDuration = cfg.weaponSwitchDuration || 8;
    this.weaponSwitchMeleeBuffer = cfg.weaponSwitchMeleeBuffer || 4;
    this.weaponSwitchLerpIn = cfg.weaponSwitchLerpIn || 0.28;
    this.weaponSwitchLerpOut = cfg.weaponSwitchLerpOut || 0.16;
    this.currentWeaponMode = 'BOW'; // 'BOW' | 'SEELE'

    // Skill 1: Hirenkyaku (Glide Step) & Licht Regen
    this.hirenkyakuCooldown = 0;
    this.hirenkyakuCooldownMax = cfg.hirenkyakuCooldown || 360;
    this.isHirenkyakuDashing = false;
    this.hirenkyakuTimer = 0;
    this.hirenkyakuMaxTimer = cfg.hirenkyakuDashFrames || 5;
    this.hirenkyakuDashDistance = cfg.hirenkyakuDashDistance || 240;
    this.afterImages = [];
    this.afterImageDuration = cfg.afterImageDuration || 16;
    this.isPlantedPause = false;
    this.plantedPauseTimer = 0;
    this.plantedPauseFrames = cfg.plantedPauseFrames || 6;
    this.isSkywardWindup = false;
    this.skywardWindupTimer = 0;
    this.skywardWindupFrames = cfg.skywardWindupFrames || 24;
    this.skywardBeaconArrowSpeed = cfg.skywardBeaconArrowSpeed || 22;
    this.skywardBeaconArrowScale = cfg.skywardBeaconArrowScale || 0.32;
    this.skywardBeaconArrowLife = cfg.skywardBeaconArrowLife || 60;
    this.skywardAscentMaxFrames = cfg.skywardAscentMaxFrames || 45;
    this.isSkywardAscending = false;
    this.skywardAscentTimer = 0;
    this._activeSkywardBeacon = null;
    this._skywardBeaconFired = false;
    this.isLichtRegenActive = false;
    this.lichtRegenTimer = 0;
    this.lichtRegenDuration = cfg.lichtRegenDuration || 36;
    this.lichtRegenArrows = cfg.lichtRegenArrows || 18;
    this.lichtRegenArrowsLeft = 0;
    this.lichtRegenFireTimer = 0;
    this.lichtRegenFireInterval = cfg.lichtRegenFireInterval || 3;
    this.lichtRegenDamage = cfg.lichtRegenDamage || 6;
    this.lichtRegenArrowSpeed = cfg.lichtRegenArrowSpeed || 28;
    this.lichtRegenArrowScale = cfg.lichtRegenArrowScale || 0.08;
    this.lichtRegenRainSpreadX = cfg.lichtRegenRainSpreadX || 150;
    this.lichtRegenRainHeight = cfg.lichtRegenRainHeight || 360;
    this.lichtRegenRecoveryCooldown = cfg.lichtRegenRecoveryCooldown || 20;
    this.telegraphBeamHeight = cfg.telegraphBeamHeight || 320;
    this.telegraphRadiusMult = cfg.telegraphRadiusMult || 1.6;
    this.hirenkyakuAiTriggerRange = cfg.hirenkyakuAiTriggerRange || 150;
    this.hirenkyakuAiMidRange = cfg.hirenkyakuAiMidRange || 450;
    this.hirenkyakuAiMidRangeChance = cfg.hirenkyakuAiMidRangeChance || 0.006;

    // Skill 2: Gintō Sprenger (Pentagram Trap)
    this.sprengerCooldown = 0;
    this.sprengerCooldownMax = cfg.sprengerCooldown || 480;
    this.isDeployingSprenger = false;
    this.sprengerTimer = 0;

    // Passive 1: Reishi Sklaverei Gauge
    this.reishiGauge = 0;
    this.reishiMaxGauge = cfg.reishiMaxGauge || 100;
    this.isPiercingLightActive = false;
    this.piercingLightTimer = 0;
    this.piercingLightMax = cfg.piercingLightDuration || 360;

    // Passive 2: Ransōtengai (Heavenly Wild Puppet Suit)
    this.ransotengaiActive = false;
    this.ransotengaiTimer = 0;
    this.ransotengaiMaxTimer = cfg.ransotengaiDuration || 360;
    this.ransotengaiCooldown = 0;
    this.ransotengaiCooldownMax = cfg.ransotengaiCooldown || 1200;

    // Ultimate: Vollständig & Schrift "A" The Antithesis
    this.ultimateCooldown = cfg.ultimateCooldown || 1200;
    this.vollstandigActive = false;
    this.vollstandigTimer = 0;
    this.antithesisUsed = false;

    this.combatAuraOpacity = 0.35;
    this.hideFrontHand = false;
    this.hideBackHand = false;
  }

  _playSound(key, defaultSfx, defaultVol = 0.85) {
    if (!this._soundPlayTimestamps) this._soundPlayTimestamps = {};
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const lastPlayed = this._soundPlayTimestamps[key] || 0;
    if (now - lastPlayed < 180) return;
    this._soundPlayTimestamps[key] = now;

    const sfx = CONFIG.uryu?.sounds?.[key] || defaultSfx;
    const vol = CONFIG.uryu?.soundVolumes?.[key] ?? defaultVol;
    if (sfx && typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX(sfx, vol);
    }
  }

  reset() {
    super.reset();
    this.shootCooldown = 15;
    this.burstRemaining = 0;
    this.isShooting = false;
    this.isDrawingBow = false;
    this.drawPhase = 'IDLE';
    this.arrowDrawTimer = 0;
    this.arrowDrawDuration = 11;
    this.arrowDrawProgress = 0;
    this.smoothDrawProgress = 0;
    this.recoilHoldTimer = 0;
    this.stringRecoilTimer = 0;
    this.slashSwingTimer = 0;
    this.seeleCooldown = 0;
    this.hirenkyakuCooldown = 0;
    this.isHirenkyakuDashing = false;
    this.hirenkyakuTimer = 0;
    this.afterImages = [];
    this.isPlantedPause = false;
    this.plantedPauseTimer = 0;
    this.isSkywardWindup = false;
    this.skywardWindupTimer = 0;
    this.isSkywardAscending = false;
    this.skywardAscentTimer = 0;
    this._activeSkywardBeacon = null;
    this._skywardBeaconFired = false;
    this.isLichtRegenActive = false;
    this.lichtRegenTimer = 0;
    this.lichtRegenArrowsLeft = 0;
    this.lichtRegenFireTimer = 0;
    this.sprengerCooldown = 0;
    this.reishiGauge = 0;
    this.isPiercingLightActive = false;
    this.piercingLightTimer = 0;
    this.ransotengaiActive = false;
    this.ransotengaiTimer = 0;
    this.ransotengaiCooldown = 0;
    this.vollstandigActive = false;
    this.antithesisUsed = false;
  }

  interruptAttacks(forceCancelAll = false) {
    super.interruptAttacks(forceCancelAll);
    this.isShooting = false;
    this.isDrawingBow = false;
    this.burstRemaining = 0;
    this.drawPhase = 'IDLE';
    this.arrowDrawTimer = 0;
    this.arrowDrawProgress = 0;
    this.smoothDrawProgress = 0;
    this.isDeployingSprenger = false;
    if (this.afterImages) this.afterImages.length = 0;
    
    // Skill 1 cancel guards
    this.isHirenkyakuDashing = false;
    this.invulnerable = false;
    this.isPlantedPause = false;
    this.plantedPauseTimer = 0;
    this.isSkywardWindup = false;
    this.skywardWindupTimer = 0;
    this.isSkywardAscending = false;
    this.skywardAscentTimer = 0;
    this._activeSkywardBeacon = null;
    this._skywardStartAngle = undefined;
    this._skywardBeaconFired = false;
    this.isLichtRegenActive = false;
    this.lichtRegenArrowsLeft = 0;
    this.lichtRegenTimer = 0;

    const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
    if (forceCancelAll || (!isMatchEnded && (this.hp <= 0 || this.isFrozen || this.isTargetOfAmbush))) {
      this.slashSwingTimer = 0;
    }
  }

  /**
   * Demo attack trigger for character selection / weapon preview.
   */
  triggerDemoAttack() {
    this._initiateBowVolley(null, 0);
  }

  canAim() {
    if (!super.canAim()) return false;
    if (this.isHirenkyakuDashing || this.isPlantedPause || this.isSkywardWindup || this.isSkywardAscending || this.isLichtRegenActive) {
      return false;
    }
    return true;
  }

  _findNearestEnemy() {
    if (typeof state === 'undefined') return null;
    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    let nearest = null;
    let minDist = Infinity;

    for (let i = 0; i < allTargets.length; i++) {
      const t = allTargets[i];
      if (!t || t === this || t.hp <= 0 || t.isDead || t.invulnerable) continue;
      // Exclude teammates
      if (typeof state.getFighterTeam === 'function') {
        const myTeam = state.getFighterTeam(state.fighters.indexOf(this));
        const theirTeam = state.getFighterTeam(state.fighters.indexOf(t));
        if (myTeam !== null && myTeam === theirTeam) continue;
      }
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearest = t;
      }
    }
    return nearest;
  }

  update(opponent, ownerIndex, arena) {
    // 1. Mandatory Rule 1 Freeze & Ambush Guard
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return;
    }

    if (this.hp <= 0) return;

    // ── PHASE 1: HIRENKYAKU DASH UPDATE ──
    if (this.isHirenkyakuDashing) {
      this.hirenkyakuTimer--;
      
      // Spawn afterimage
      if (this.afterImages) {
        this.afterImages.push({
          x: this.x,
          y: this.y,
          timer: 16,
          maxTimer: 16,
          gunAngle: this.gunAngle || this.angle,
          r: this.r
        });
      }
      
      // Spawn Reishi particles under feet
      if (Math.random() < 0.40 && typeof spawnSparks === 'function') {
        spawnSparks(this.x, this.y, '#00E5FF', 1);
      }

      // Apply Hirenkyaku dash velocity (override steering)
      this.x += this.vx;
      this.y += this.vy;

      // Handle Arena wall boundaries
      if (arena) {
        this.x = Math.max(arena.x + this.r, Math.min(arena.x + arena.width - this.r, this.x));
        this.y = Math.max(arena.y + this.r, Math.min(arena.y + arena.height - this.r, this.y));
      }

      if (this.hirenkyakuTimer <= 0) {
        this.isHirenkyakuDashing = false;
        this.invulnerable = false;
        this.vx = 0;
        this.vy = 0;
        
        // Step 2: Stop movement completely and plant feet firmly
        this.isPlantedPause = true;
        this.plantedPauseTimer = this.plantedPauseFrames;
        spawnFloatingText(this.x, this.y - 35, 'HIRENKYAKU!', '#00E5FF');
      }
      
      // Update existing afterimages
      if (this.afterImages && this.afterImages.length > 0) {
        for (let i = this.afterImages.length - 1; i >= 0; i--) {
          const ai = this.afterImages[i];
          ai.timer--;
          if (ai.timer <= 0) this.afterImages.splice(i, 1);
        }
      }
      super.update(opponent, ownerIndex, arena);
      return;
    }

    // ── STEP 2: MOVEMENT STOP & FEET PLANT PAUSE ──
    if (this.isPlantedPause) {
      // Dead stop all physics velocities
      this.vx = 0;
      this.vy = 0;
      this.plantedPauseTimer--;

      // Face the enemy in neutral stance
      const target = this._findNearestEnemy() || opponent;
      if (target) this.aim(target);
      this.smoothDrawProgress = 0;

      if (this.plantedPauseTimer <= 0) {
        this.isPlantedPause = false;
        // Snapshot current horizontal aim angle for smooth lerp into skyward
        this._skywardStartAngle = this.gunAngle || this.angle || 0;
        // Step 3: Transition to Skyward Arrow Release Animation
        this.isSkywardWindup = true;
        this.skywardWindupTimer = this.skywardWindupFrames;
        this._skywardBeaconFired = false;
      }

      // Update existing afterimages
      if (this.afterImages && this.afterImages.length > 0) {
        for (let i = this.afterImages.length - 1; i >= 0; i--) {
          const ai = this.afterImages[i];
          ai.timer--;
          if (ai.timer <= 0) this.afterImages.splice(i, 1);
        }
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // ── STEP 3: SHOOT TO SKY ANIMATION (Slow draw + shivering strain) ──
    if (this.isSkywardWindup) {
      this.vx = 0;
      this.vy = 0;
      this.skywardWindupTimer--;

      // Compute progress through the windup (0.0 → 1.0)
      const windupFrames = this.skywardWindupFrames || 24;
      const windupProgress = Math.min(1.0, (windupFrames - this.skywardWindupTimer) / windupFrames);

      // Target skyward angle based on enemy position
      const target = this._findNearestEnemy() || opponent;
      const isTargetLeft = Boolean(target && target.x < this.x);
      const skywardTarget = isTargetLeft ? -Math.PI * 0.55 : -Math.PI * 0.45;

      // Smoothly lerp gunAngle from horizontal aim → skyward using ease-out cubic
      const startAngle = (this._skywardStartAngle !== undefined) ? this._skywardStartAngle : this.gunAngle;
      const easedLift = 1.0 - Math.pow(1.0 - windupProgress, 2.5);

      // Lerp between start angle and skyward target
      this.gunAngle = startAngle + (skywardTarget - startAngle) * easedLift;
      this.angle = this.gunAngle;

      // Slowly stretch bow string back to 100% tension with eased draw curve
      const baseDraw = Math.pow(windupProgress, 0.45); // Slower ease-in: gradual initial pull, accelerating
      this.smoothDrawProgress = baseDraw;

      // ── Shivering / Trembling Effect (intensifies as draw increases) ──
      const shiverIntensity = Math.pow(baseDraw, 1.8) * 1.8; // Intensity grows with draw tension
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      const shiverX = Math.sin(now * 0.35) * shiverIntensity + Math.cos(now * 0.53) * shiverIntensity * 0.5;
      const shiverY = Math.cos(now * 0.42) * shiverIntensity * 0.7 + Math.sin(now * 0.61) * shiverIntensity * 0.3;
      this.x += shiverX;
      this.y += shiverY;

      // Micro-angle tremble on the bow (tiny wobble while straining)
      const angleShiver = Math.sin(now * 0.48) * 0.015 * baseDraw;
      this.gunAngle += angleShiver;
      this.angle = this.gunAngle;

      // When full draw tension is reached: Release the glowing beacon arrow into the sky!
      if (this.skywardWindupTimer <= 0) {
        this.isSkywardWindup = false;
        this.isSkywardAscending = true;
        this.skywardAscentTimer = this.skywardAscentMaxFrames || 45;
        this.gunAngle = skywardTarget;
        this.angle = this.gunAngle;
        this.smoothDrawProgress = 0.85;

        // Shoot initial glowing beacon arrow INTO THE SKY!
        this._activeSkywardBeacon = this._fireSkywardBeaconArrow(target, ownerIndex);
      }

      // Update existing afterimages
      if (this.afterImages && this.afterImages.length > 0) {
        for (let i = this.afterImages.length - 1; i >= 0; i--) {
          const ai = this.afterImages[i];
          ai.timer--;
          if (ai.timer <= 0) this.afterImages.splice(i, 1);
        }
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // ── STEP 3.5: SKYWARD ASCENT PHASE (Waiting for beacon arrow to exit screen) ──
    if (this.isSkywardAscending) {
      this.vx = 0;
      this.vy = 0;
      this.skywardAscentTimer--;

      // Maintain skyward aiming stance while the beacon arrow streaks upward
      const target = this._findNearestEnemy() || opponent;
      const isTargetLeft = Boolean(target && target.x < this.x);
      const skywardTarget = isTargetLeft ? -Math.PI * 0.55 : -Math.PI * 0.45;
      this.gunAngle = skywardTarget;
      this.angle = this.gunAngle;

      // Smooth string recoil settling
      this.smoothDrawProgress = Math.max(0.40, this.smoothDrawProgress * 0.95);

      // Check if the beacon arrow has exited the top of the screen / arena into the clouds
      const arenaBounds = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG.arena || { x: 0, y: 0, width: 800, height: 600 });
      const topBoundary = arenaBounds.y - 30;
      const beacon = this._activeSkywardBeacon;
      const isBeaconGone = (!beacon) || (beacon.y <= topBoundary) || (beacon.life <= 0) || (state.projectiles && !state.projectiles.includes(beacon));

      // Once the arrow has visibly left the screen into the clouds: START LICHT REGEN RAIN!
      if (isBeaconGone || this.skywardAscentTimer <= 0) {
        this.isSkywardAscending = false;
        this._activeSkywardBeacon = null;
        this._skywardStartAngle = undefined;

        // Step 4: Torrent Rain of Light begins pouring from above!
        this.isLichtRegenActive = true;
        this.lichtRegenTimer = this.lichtRegenDuration;
        this.lichtRegenArrowsLeft = this.lichtRegenArrows;
        this.lichtRegenFireTimer = 0;
        spawnFloatingText(this.x, this.y - 35, 'LICHT REGEN!', '#00E5FF');
        this._playSound('lichtRegen', 'Assets/Sound Effects/Attacks/laserpew.mp3', 0.80);
      }

      // Update existing afterimages
      if (this.afterImages && this.afterImages.length > 0) {
        for (let i = this.afterImages.length - 1; i >= 0; i--) {
          const ai = this.afterImages[i];
          ai.timer--;
          if (ai.timer <= 0) this.afterImages.splice(i, 1);
        }
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // ── PHASE 4: LICHT REGEN CHANNELING UPDATE ──
    if (this.isLichtRegenActive) {
      this.vx = 0;
      this.vy = 0;
      this.lichtRegenTimer--;
      
      // Hold skyward archery pose while rain pours from above
      const target = this._findNearestEnemy() || opponent;
      const isTargetLeft = Boolean(target && target.x < this.x);
      this.gunAngle = isTargetLeft ? -Math.PI * 0.55 : -Math.PI * 0.45;
      this.angle = this.gunAngle;

      // Keep string vibrating and bow drawn
      this.smoothDrawProgress = 0.65;
      this.stringRecoilTimer = 2;

      this.lichtRegenFireTimer++;
      if (this.lichtRegenFireTimer >= this.lichtRegenFireInterval && this.lichtRegenArrowsLeft > 0) {
        this.lichtRegenFireTimer = 0;
        this.lichtRegenArrowsLeft--;
        this._fireLichtRegenArrow(target, ownerIndex);
      }

      if (this.lichtRegenTimer <= 0 || this.lichtRegenArrowsLeft <= 0) {
        this.isLichtRegenActive = false;
        this.smoothDrawProgress = 0;
        this.stringRecoilTimer = 0;
        this.shootCooldown = this.lichtRegenRecoveryCooldown;
      }

      // Update existing afterimages
      if (this.afterImages && this.afterImages.length > 0) {
        for (let i = this.afterImages.length - 1; i >= 0; i--) {
          const ai = this.afterImages[i];
          ai.timer--;
          if (ai.timer <= 0) this.afterImages.splice(i, 1);
        }
      }

      super.update(opponent, ownerIndex, arena);
      return;
    }

    // Decay custom animation and attack timers
    if (this.stringRecoilTimer > 0) this.stringRecoilTimer--;
    if (this.slashSwingTimer > 0) {
      this.slashSwingTimer--;
      if (this.slashSwingTimer === 0) {
        // Seele Schneider chop finished — set transition buffer for bow materialization
        this.weaponSwitchTimer = this.weaponSwitchDuration;
        this.currentWeaponMode = 'BOW';
      }
    }
    if (this.slashSwingImpactTimer > 0) {
      this.slashSwingImpactTimer--;
      if (this.slashSwingImpactTimer === 0 && !this._chopHitDelivered) {
        this._deliverSeeleSchneiderImpact();
      }
    }
    if (this.weaponSwitchTimer > 0) this.weaponSwitchTimer--;
    if (this.seeleCooldown > 0) this.seeleCooldown--;
    if (this.hirenkyakuCooldown > 0) this.hirenkyakuCooldown--;
    if (this.sprengerCooldown > 0) this.sprengerCooldown--;

    // Check if auto-switch is enabled and an enemy is within melee range
    const autoMelee = CONFIG.uryu?.autoSwitchToMelee ?? true;
    let isEnemyInMeleeRange = false;
    if (autoMelee) {
      const nearest = this._findNearestEnemy() || opponent;
      if (nearest && !nearest.isDead && nearest.hp > 0) {
        const d = Math.hypot(nearest.x - this.x, nearest.y - this.y);
        if (d <= (CONFIG.uryu?.seeleRange || 75)) {
          isEnemyInMeleeRange = true;
          // Set weapon mode immediately so graphics layers sync
          if (this.currentWeaponMode !== 'SEELE') {
            this.currentWeaponMode = 'SEELE';
            if (this.weaponSwitchTimer <= 0) {
              this.weaponSwitchTimer = this.weaponSwitchMeleeBuffer;
            }
          }
        } else {
          // If the enemy moves out of melee range and Uryu isn't actively swinging, restore bow mode
          if (this.currentWeaponMode === 'SEELE' && this.slashSwingTimer <= 0) {
            this.currentWeaponMode = 'BOW';
            if (this.weaponSwitchTimer <= 0) {
              this.weaponSwitchTimer = this.weaponSwitchDuration;
            }
          }
        }
      }
    }

    // ── SMOOTH WEAPON SWITCH TRANSITION LERP (Ginrei Bogen <-> Seele Schneider) ──
    const isMeleeActive = (this.slashSwingTimer > 0) || 
                          (this.seeleCooldown >= this.seeleCooldownMax - 6) ||
                          isEnemyInMeleeRange;
    const targetSeeleP = isMeleeActive ? 1.0 : 0.0;
    if (this.seeleEquipProgress !== targetSeeleP) {
      const switchSpeed = targetSeeleP > this.seeleEquipProgress ? this.weaponSwitchLerpIn : this.weaponSwitchLerpOut;
      this.seeleEquipProgress += (targetSeeleP - this.seeleEquipProgress) * switchSpeed;
      if (Math.abs(targetSeeleP - this.seeleEquipProgress) < 0.005) {
        this.seeleEquipProgress = targetSeeleP;
      }
    }

    // ── ACTIVE BOW SHOOTING & ARROW PULL-BACK CYCLE ──
    if (this.isShooting && this.burstRemaining > 0) {
      const target = this._findNearestEnemy() || opponent;
      if (target) this.aim(target);

      if (this.drawPhase === 'DRAWING') {
        this.isDrawingBow = true;
        this.arrowDrawTimer++;
        const t = Math.min(1.0, this.arrowDrawTimer / this.arrowDrawDuration);
        // Smooth cinematic pull-back easing (accelerating tension curve)
        this.arrowDrawProgress = Math.sin(t * Math.PI * 0.5);

        // Subtle Reishi gathering spark during draw
        if (Math.random() < 0.25 && typeof spawnSparks === 'function') {
          const angle = this.gunAngle || 0;
          const sx = this.x + Math.cos(angle) * (this.r + 10) + (Math.random() - 0.5) * 12;
          const sy = this.y + Math.sin(angle) * (this.r + 10) + (Math.random() - 0.5) * 12;
          spawnSparks(sx, sy, '#00E5FF', 1);
        }

        if (this.arrowDrawTimer >= this.arrowDrawDuration) {
          // Maximum tension reached: RELEASE ARROW!
          this._fireHeiligPfeilArrow(target || opponent, ownerIndex);
          this.burstRemaining--;
          this.drawPhase = 'RECOIL';
          this.recoilHoldTimer = 5;
          this.arrowDrawProgress = 0;
          this.stringRecoilTimer = this.stringRecoilMax;
        }
      } else if (this.drawPhase === 'RECOIL') {
        this.recoilHoldTimer--;
        this.arrowDrawProgress = 0;
        if (this.recoilHoldTimer <= 0) {
          if (this.burstRemaining > 0) {
            // Rapid-fire subsequent arrow draw in volley
            this.drawPhase = 'DRAWING';
            this.arrowDrawTimer = 0;
            const drawSpeedMult = this.isPiercingLightActive ? 0.70 : 1.0;
            this.arrowDrawDuration = Math.max(6, Math.round(10 * drawSpeedMult));
            this.arrowDrawProgress = 0;
            this._playSound('bowDraw', 'Assets/Sound Effects/Skills/redcharging.mp3', 0.50);
          } else {
            // Volley finished
            this.drawPhase = 'IDLE';
            this.isShooting = false;
            this.isDrawingBow = false;
            this.shootCooldown = this.shootCooldownMax;
          }
        }
      }
    } else {
      this.arrowDrawProgress = 0;
      this.drawPhase = 'IDLE';
      this.isShooting = false;
      this.isDrawingBow = false;
    }

    // Direct, responsive Draw Progress tracking during draw phase
    if (this.isShooting && this.drawPhase === 'DRAWING') {
      this.smoothDrawProgress = this.arrowDrawProgress;
    } else {
      this.smoothDrawProgress += (0 - this.smoothDrawProgress) * 0.40;
    }

    // ── PASSIVE 2: RANSŌTENGAI (HEAVENLY WILD PUPPET SUIT) ──
    if (this.ransotengaiCooldown > 0) this.ransotengaiCooldown--;

    const hpRatio = (this.maxHp > 0) ? (this.hp / this.maxHp) : 1.0;
    const isHeavyCC = (this.hitStunTimer > 15 || this.electricStunTimer > 15 || (this.paralyzeTimer && this.paralyzeTimer > 15));
    const shouldTriggerPuppet = !this.ransotengaiActive && this.ransotengaiCooldown <= 0 && (hpRatio <= (CONFIG.uryu?.ransotengaiHpThreshold || 0.30) || isHeavyCC);

    if (shouldTriggerPuppet) {
      this.ransotengaiActive = true;
      this.ransotengaiTimer = this.ransotengaiMaxTimer;
      this.ransotengaiCooldown = this.ransotengaiCooldownMax;
      // Instantly purge crowd control
      this.hitStunTimer = 0;
      this.electricStunTimer = 0;
      if (this.paralyzeTimer) this.paralyzeTimer = 0;
      spawnFloatingText(this.x, this.y - 35, 'RANSŌTENGAI!', '#00E5FF');
      spawnImpactFlash(this.x, this.y, '#00E5FF');
      if (typeof spawnSparks === 'function') {
        spawnSparks(this.x, this.y, 10, 'cyan', '#00E5FF');
        spawnSparks(this.x, this.y, 6, 'silverStreak', '#FFFFFF');
      }
      this._playSound('hirenkyaku', 'Assets/Sound Effects/Skills/dash1.mp3', 1.0);
    }

    if (this.ransotengaiActive) {
      this.ransotengaiTimer--;
      if (this.ransotengaiTimer <= 0) {
        this.ransotengaiActive = false;
        this.speedMultiplier = 1.0;
      } else {
        // Ongoing puppet stasis: immunity to flinch & stuns
        this.hitStunTimer = 0;
        this.electricStunTimer = 0;
        if (this.paralyzeTimer) this.paralyzeTimer = 0;
        // Controlled +30% movement speed boost (safe, non-exponential)
        this.speedMultiplier = 1.30;
      }
    }

    // ── PASSIVE 1: REISHI ABSORPTION & SKLAVEREI GAUGE ──
    if (this.isPiercingLightActive) {
      this.piercingLightTimer--;
      if (this.piercingLightTimer <= 0) {
        this.isPiercingLightActive = false;
        this.reishiGauge = 0;
      }
      // Accelerated bow cooldowns during Piercing Light (-40% draw delay)
      if (this.shootCooldown > 0) {
        this.shootCooldown = Math.max(0, this.shootCooldown - 1);
      }
    } else {
      // 1. Natural ambient battlefield Reishi siphon
      this.reishiGauge = Math.min(100, this.reishiGauge + 0.10);

      // 2. Siphon Reishi from nearby enemy projectiles within 190px
      if (state && state.projectiles && state.projectiles.length > 0) {
        const resolvedOwner = (typeof ownerIndex === 'number' && ownerIndex >= 0) ? ownerIndex : (state.fighters ? state.fighters.indexOf(this) : -1);
        for (let i = 0; i < state.projectiles.length; i++) {
          const p = state.projectiles[i];
          if (!p || p.owner === resolvedOwner) continue;
          if (typeof state.getFighterTeam === 'function' && resolvedOwner >= 0) {
            const myTeam = state.getFighterTeam(resolvedOwner);
            const theirTeam = state.getFighterTeam(p.owner);
            if (myTeam !== null && myTeam === theirTeam) continue;
          }
          const dist = Math.hypot(p.x - this.x, p.y - this.y);
          if (dist <= 190) {
            const gain = CONFIG.uryu?.siphonProjectileGain || 0.85;
            this.reishiGauge = Math.min(100, this.reishiGauge + gain);
            if (Math.random() < 0.10 && typeof spawnSparks === 'function') {
              spawnSparks(p.x, p.y, 2, 'cyan', '#00E5FF');
            }
          }
        }
      }

      // 3. Siphon Reishi from active enemy domains (Malevolent Shrine, Unlimited Void, etc.)
      if (state && state.fighters) {
        for (let i = 0; i < state.fighters.length; i++) {
          const f = state.fighters[i];
          if (!f || f === this || f.hp <= 0) continue;
          if (f.domainActive || f.isDomainActive || f.domainRadius > 0) {
            const gain = CONFIG.uryu?.siphonDomainGain || 0.65;
            this.reishiGauge = Math.min(100, this.reishiGauge + gain);
          }
        }
      }

      // 4. Threshold trigger: 100% Reishi Gauge -> Piercing Light
      if (this.reishiGauge >= 100) {
        this.reishiGauge = 100;
        this.isPiercingLightActive = true;
        this.piercingLightTimer = this.piercingLightMax;
        spawnFloatingText(this.x, this.y - 32, 'PIERCING LIGHT!', '#00E5FF');
        spawnImpactFlash(this.x, this.y, '#00E5FF');
        if (typeof spawnSparks === 'function') {
          spawnSparks(this.x, this.y, 14, 'cyan', '#00E5FF');
          spawnSparks(this.x, this.y, 8, 'silverStreak', '#FFFFFF');
        }
        this._playSound('hirenkyaku', 'Assets/Sound Effects/Skills/dash1.mp3', 0.85);
      }
    }

    // ── AI TRIGGER: SKILL 1 (HIRENKYAKU & LICHT REGEN) ──
    if (this.hirenkyakuCooldown <= 0 && !this.isLichtRegenActive && !this.isHirenkyakuDashing && !this.isDeployingSprenger && !this.vollstandigActive) {
      const nearestEnemy = this._findNearestEnemy() || opponent;
      if (nearestEnemy && !nearestEnemy.isDead && nearestEnemy.hp > 0) {
        const dist = Math.hypot(nearestEnemy.x - this.x, nearestEnemy.y - this.y);
        // Trigger defensively if too close, or offensively at random intervals at mid range
        if (dist < 150 || (dist < 450 && Math.random() < 0.006)) {
          this._triggerHirenkyakuLichtRegen(nearestEnemy, ownerIndex);
        }
      }
    }

    // Update Afterimages for Hirenkyaku
    if (this.afterImages && this.afterImages.length > 0) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        const ai = this.afterImages[i];
        ai.timer--;
        if (ai.timer <= 0) this.afterImages.splice(i, 1);
      }
    }

    super.update(opponent, ownerIndex, arena);
  }

  /**
   * Overrides base Fighter.shoot() method to trigger Uryu's basic attacks.
   */
  shoot(ownerIndex) {
    if (this.hp <= 0) return;
    const isParalyzed = (this.paralyzeTimer && this.paralyzeTimer > 0) || this.isParalyzed;
    if (isParalyzed || this.isCaughtInBeam() || this.isTargetOfAmbush) return;
    if (this.isHirenkyakuDashing || this.isPlantedPause || this.isSkywardWindup || this.isLichtRegenActive) return;
    if (this.weaponSwitchTimer > 0) return; // Wait for smooth weapon switch buffer to complete

    const target = this._findNearestEnemy();
    if (!target) return;

    this.aim(target);
    const dist = Math.hypot(target.x - this.x, target.y - this.y);

    // Close-quarters melee intercept vs ranged bow attack:
    if (dist <= (CONFIG.uryu?.seeleRange || 75) && this.seeleCooldown <= 0) {
      if (this.currentWeaponMode !== 'SEELE') {
        this.currentWeaponMode = 'SEELE';
        this.weaponSwitchTimer = this.weaponSwitchMeleeBuffer;
      }
      this._executeSeeleSchneider(target);
    } else if (this.burstRemaining <= 0 && !this.isShooting) {
      if (this.currentWeaponMode !== 'BOW') {
        this.currentWeaponMode = 'BOW';
        this.weaponSwitchTimer = this.weaponSwitchDuration;
        return;
      }
      this._initiateBowVolley(target, ownerIndex);
    }
  }

  _executeSeeleSchneider(target) {
    this.slashSwingTimer = this.slashSwingMaxTimer;
    this.slashSwingImpactTimer = this.seeleImpactFrame;
    this._chopHitDelivered = false;
    this.seeleCooldown = this.seeleCooldownMax;
    if (this.seeleEquipProgress < 0.25) this.seeleEquipProgress = 0.25;
    this._playSound('seeleSlice', 'Assets/Sound Effects/Attacks/energysword.mp3', 0.85);
  }

  _deliverSeeleSchneiderImpact() {
    this._chopHitDelivered = true;

    // Frontal Arc Cone Multi-Target Melee (Rule 7)
    const reach = CONFIG.uryu?.seeleRange || 75;
    const arc = ((CONFIG.uryu?.seeleArc || 130) * Math.PI) / 180;
    const aimAngle = this.gunAngle || 0;

    const allTargets = [...(state.fighters || []), ...(state.illusions || [])];
    for (let i = 0; i < allTargets.length; i++) {
      const t = allTargets[i];
      if (!t || t === this || t.hp <= 0 || t.isDead || t.invulnerable) continue;
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d <= reach + (t.r || 25)) {
        const angleToTarget = Math.atan2(t.y - this.y, t.x - this.x);
        let diff = angleToTarget - aimAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) <= arc / 2) {
          const dmg = CONFIG.uryu?.seeleDamage || 16;
          applyDamageToTarget(t, dmg, this);
          spawnImpactFlash(t.x, t.y, '#00E5FF');
          spawnSparks(t.x, t.y, '#FFFFFF', 6);
          if (typeof spawnMeleeClashShockwave === 'function') {
            spawnMeleeClashShockwave(t.x, t.y, 45, '#00E5FF');
          }

          // Siphon Reishi on Seele Schneider parry hit
          if (!this.isPiercingLightActive) {
            const meleeGain = CONFIG.uryu?.siphonMeleeGain || 8.0;
            this.reishiGauge = Math.min(100, this.reishiGauge + meleeGain);
          }

          // Push target away to restore archery spacing (safe capped knockback)
          const pushForce = CONFIG.uryu?.seeleKnockback || 4.5;
          if (typeof t.applyKnockback === 'function') {
            t.applyKnockback(Math.cos(angleToTarget) * pushForce, Math.sin(angleToTarget) * pushForce);
          } else {
            t.vx = (t.vx || 0) + Math.cos(angleToTarget) * pushForce;
            t.vy = (t.vy || 0) + Math.sin(angleToTarget) * pushForce;
          }
        }
      }
    }
  }

  _triggerHirenkyakuLichtRegen(target, ownerIndex) {
    this.isHirenkyakuDashing = true;
    this.hirenkyakuTimer = this.hirenkyakuMaxTimer;
    this.invulnerable = true;

    // Switch to Bow mode instantly for the upcoming Licht Regen barrage!
    this.currentWeaponMode = 'BOW';
    this.seeleEquipProgress = 0.0;
    this.weaponSwitchTimer = 0;
    
    // Purge standard shooting states
    this.isShooting = false;
    this.isDrawingBow = false;
    this.burstRemaining = 0;
    this.drawPhase = 'IDLE';

    // Face the target
    this.aim(target);
    const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
    const dashAngle = angleToTarget + Math.PI; // Dash directly away

    // Speed per frame: distance / frames
    const dist = this.hirenkyakuDashDistance;
    const dashSpeed = dist / this.hirenkyakuMaxTimer;
    this.vx = Math.cos(dashAngle) * dashSpeed;
    this.vy = Math.sin(dashAngle) * dashSpeed;

    this.hirenkyakuCooldown = this.hirenkyakuCooldownMax;
    
    spawnFloatingText(this.x, this.y - 35, 'HIRENKYAKU!', '#00E5FF');
    this._playSound('hirenkyaku', 'Assets/Sound Effects/Skills/dash1.mp3', 0.85);

    // Initial afterimage
    if (this.afterImages) {
      this.afterImages.push({
        x: this.x,
        y: this.y,
        timer: this.afterImageDuration,
        maxTimer: this.afterImageDuration,
        gunAngle: this.gunAngle || this.angle,
        r: this.r
      });
    }
  }

  _fireSkywardBeaconArrow(target, ownerIndex) {
    // Fire the beacon arrow along the current skyward aim angle
    const angle = this.gunAngle || -Math.PI / 2;
    const spawnDist = this.r * 1.05 + 3.0;
    const startX = this.x + Math.cos(angle) * spawnDist;
    const startY = this.y + Math.sin(angle) * spawnDist;

    this._playSound('bowShoot', 'Assets/Sound Effects/Attacks/shurikenthrow.mp3', 0.95);
    this.stringRecoilTimer = 10;
    // Dramatic screen shake and muzzle flash on release
    if (typeof triggerGlobalScreenShake === 'function') triggerGlobalScreenShake(8, 12);
    if (typeof spawnImpactFlash === 'function') spawnImpactFlash(startX, startY, 60, '#00E5FF');
    if (typeof spawnSparks === 'function') spawnSparks(startX, startY, '#FFFFFF', 14);
    if (typeof spawnSparks === 'function') spawnSparks(startX, startY, '#00E5FF', 10);

    if (typeof projectileSystem !== 'undefined' && typeof projectileSystem.fireProjectile === 'function') {
      const resolvedOwner = (typeof ownerIndex === 'number' && ownerIndex >= 0)
        ? ownerIndex
        : (typeof this._curOwnerIndex === 'number' ? this._curOwnerIndex : (state.fighters ? state.fighters.indexOf(this) : 0));
      
      const p = projectileSystem.fireProjectile(
        this,
        resolvedOwner,
        0, // Beacon arrow is visual skyward release — 0 damage (rain does the damage)
        false,
        this.skywardBeaconArrowSpeed,
        false,
        'heiligPfeil',
        startX,
        startY,
        angle
      );
      if (p) {
        p.isHeiligPfeil = true;
        p.isSkywardBeacon = true; // Flag for enhanced rendering in projectileRenderer & soaring into sky
        p.isVisual = true; // Visual-only skyward beacon: bypasses fighter collision, shields & limits
        p.damage = 0;
        p.color = '#00FFFF';
        p.scale = this.skywardBeaconArrowScale;
        p.isPiercing = true;
        p.life = this.skywardBeaconArrowLife;
        p.maxLife = this.skywardBeaconArrowLife;
        p.trailAlpha = 1.0;
        return p;
      }
    }
    return null;
  }

  _fireLichtRegenArrow(target, ownerIndex) {
    if (!target) return;

    const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : (CONFIG.arena || { x: 0, y: 0, width: 800, height: 600 });

    // 1. Spawn high in the sky above the target (with a horizontal rain zone of ~140px spread)
    const rainSpreadX = (Math.random() - 0.5) * this.lichtRegenRainSpreadX;
    const startX = Math.max(arena.x + 20, Math.min(arena.x + arena.width - 20, target.x + rainSpreadX));
    const startY = Math.max(arena.y + 10, target.y - this.lichtRegenRainHeight);

    // 2. Trajectory points steeply downward toward the target / ground
    const targetPointX = target.x + (Math.random() - 0.5) * 40;
    const targetPointY = target.y;
    const angle = Math.atan2(targetPointY - startY, targetPointX - startX);

    // Licht Regen micro-arrow speed and damage
    const arrowSpeed = this.lichtRegenArrowSpeed;
    const arrowDmg = this.lichtRegenDamage;
    const resolvedOwner = (typeof ownerIndex === 'number' && ownerIndex >= 0)
      ? ownerIndex
      : (typeof this._curOwnerIndex === 'number' ? this._curOwnerIndex : (state.fighters ? state.fighters.indexOf(this) : 0));

    this._playSound('bowShoot', 'Assets/Sound Effects/Attacks/shurikenthrow.mp3', 0.5);

    if (typeof projectileSystem !== 'undefined' && typeof projectileSystem.fireProjectile === 'function') {
      const p = projectileSystem.fireProjectile(
        this,
        resolvedOwner,
        arrowDmg,
        false,
        arrowSpeed,
        false,
        'heiligPfeil',
        startX,
        startY,
        angle
      );
      if (p) {
        p.isHeiligPfeil = true;
        p.color = '#00E5FF';
        p.scale = this.lichtRegenArrowScale;
        p.isPiercing = false;
        p.isLichtRegenRain = true;
      }
    }

    // Skyward Reishi spark flash at bow tip on Uryu
    const bowTipAngle = this.gunAngle || this.angle || -Math.PI / 2;
    const bowTipX = this.x + Math.cos(bowTipAngle) * (this.r * 1.05 + 3.0);
    const bowTipY = this.y + Math.sin(bowTipAngle) * (this.r * 1.05 + 3.0);
    if (typeof spawnSparks === 'function') {
      spawnSparks(bowTipX, bowTipY, '#00E5FF', 2);
    }
  }

  _initiateBowVolley(target, ownerIndex) {
    this.isShooting = true;
    this.isDrawingBow = true;
    this.burstRemaining = CONFIG.uryu?.burstCount || 3;
    this.drawPhase = 'DRAWING';
    this.arrowDrawTimer = 0;
    // First arrow has a deliberate, crisp 16-frame draw; Piercing Light accelerates by 30%
    const drawSpeedMult = this.isPiercingLightActive ? 0.70 : 1.0;
    this.arrowDrawDuration = Math.max(8, Math.round(16 * drawSpeedMult));
    this.arrowDrawProgress = 0;
    this._curOwnerIndex = ownerIndex;
    if (target) this.aim(target);
    this._playSound('bowDraw', 'Assets/Sound Effects/Skills/redcharging.mp3', 0.65);
  }

  _fireHeiligPfeilArrow(target, ownerIndex) {
    const angle = this.gunAngle || 0;
    // Spawn projectile exactly in the center of the bow riser grip
    const spawnDist = this.r * 1.05 + 3.0;
    const startX = this.x + Math.cos(angle) * spawnDist;
    const startY = this.y + Math.sin(angle) * spawnDist;

    const speedMult = this.isPiercingLightActive ? (CONFIG.uryu?.piercingArrowSpeedMult || 1.35) : 1.0;
    const dmgMult = this.isPiercingLightActive ? (CONFIG.uryu?.piercingDamageMult || 1.25) : 1.0;
    const arrowSpeed = (CONFIG.uryu?.arrowSpeed || 24) * speedMult;
    const arrowDmg = (CONFIG.uryu?.arrowDamage || 18) * dmgMult;
    const resolvedOwner = (typeof ownerIndex === 'number' && ownerIndex >= 0)
      ? ownerIndex
      : (typeof this._curOwnerIndex === 'number' ? this._curOwnerIndex : (state.fighters ? state.fighters.indexOf(this) : 0));

    this._playSound('bowShoot', 'Assets/Sound Effects/Attacks/shurikenthrow.mp3', 0.8);
    this.stringRecoilTimer = this.stringRecoilMax;

    if (typeof projectileSystem !== 'undefined' && typeof projectileSystem.fireProjectile === 'function') {
      const p = projectileSystem.fireProjectile(
        this,
        resolvedOwner,
        arrowDmg,
        false,
        arrowSpeed,
        false,
        'heiligPfeil',
        startX,
        startY,
        angle
      );
      if (p) {
        p.isHeiligPfeil = true;
        p.color = '#00E5FF';
        p.isPiercing = Boolean(this.isPiercingLightActive);
        p.maxPierces = this.isPiercingLightActive ? (CONFIG.uryu?.piercingMaxPierces || 4) : 1;
        p.ignoreArmor = this.isPiercingLightActive ? (CONFIG.uryu?.piercingIgnoreArmor || 0.30) : 0;
      }
    }

    // Spark burst at arrow tip
    spawnSparks(startX, startY, '#00E5FF', 3);
  }

  triggerDemoAttack() {
    this.slashSwingTimer = this.slashSwingMaxTimer || 18;
    this.slashSwingImpactTimer = this.seeleImpactFrame || 8;
    this._chopHitDelivered = false;
    if (this.seeleEquipProgress < 0.25) this.seeleEquipProgress = 0.25;
    this._playSound('seeleSlice', 'Assets/Sound Effects/Attacks/energysword.mp3', 0.85);
  }

  _drawLichtRegenTargetTelegraph(ctx) {
    if (!this.isSkywardWindup && !this.isSkywardAscending && !this.isLichtRegenActive) return;

    const target = this._findNearestEnemy();
    if (!target || target.hp <= 0 || target.isDead) return;

    const isDarkMode = Boolean(
      typeof state !== 'undefined' &&
      (state.arenaTheme === 'dark' ||
        state.darkMode ||
        (typeof document !== 'undefined' &&
          document.body &&
          document.body.classList &&
          document.body.classList.contains('arena-dark-mode')))
    );

    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const rot = (now * 0.003) % (Math.PI * 2);

    ctx.save();
    ctx.translate(target.x, target.y);

    if (isDarkMode) {
      // ── DARK MODE: AUTHENTIC PIXEL-ART QUINCY REIATSU GRID (Matching Getsuga Tensho) ──
      const P = 3; // Discrete pixel step
      const snap = (v) => Math.round(v / P) * P;
      const qRot = Math.round(rot * 12) / 12; // Quantized stepped rotation
      const beamHeight = snap(this.telegraphBeamHeight || 320);
      const baseR = snap((target.r || 25) * (this.telegraphRadiusMult || 1.6));

      // 1. Pixel-Art Sky-to-Ground Cascading Guidance Columns
      const colWidth = snap(36);
      for (let gy = -beamHeight; gy <= 10; gy += P * 2) {
        const progress = Math.max(0, (gy + beamHeight) / (beamHeight + 10));
        const alpha = Math.min(0.65, progress * 0.70);
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha.toFixed(2)})`;
        const jitter = ((Math.abs(Math.sin(gy * 0.08 + now * 0.01)) * 6) / P | 0) * P;
        const curW = colWidth + (gy > -50 ? 10 : 0);
        ctx.fillRect(-curW / 2 + jitter, gy, curW, P);
      }

      // 2. Pixel-Art Ground Quincy Cross Reticle Under Target's Feet
      const starR = baseR * 1.25;
      const cosR = Math.cos(-qRot * 1.5);
      const sinR = Math.sin(-qRot * 1.5);

      const isInsidePixelReticle = (rx, ry) => {
        const dist = Math.hypot(rx, ry);
        // Outer ring test
        if (Math.abs(dist - baseR) <= P * 1.2) return 'ring';
        // Inner dashed ring test
        if (Math.abs(dist - baseR * 0.75) <= P * 0.8) {
          const a = Math.atan2(ry, rx) + qRot;
          if ((Math.sin(a * 6) > 0)) return 'dashed';
        }
        // 4-Point Quincy Star test (rotated)
        const unRotX = rx * cosR + ry * sinR;
        const unRotY = -rx * sinR + ry * cosR;
        const absX = Math.abs(unRotX);
        const absY = Math.abs(unRotY);
        // Star diamond equation: |x|/a + |y|/b <= 1
        if (absX + absY * 2.8 <= starR || absY + absX * 2.8 <= starR) {
          if (absX <= P * 1.5 && absY <= P * 1.5) return 'core';
          return 'star';
        }
        return false;
      };

      const maxExt = Math.ceil((starR + P * 2) / P) * P;
      for (let gy = -maxExt; gy <= maxExt; gy += P) {
        for (let gx = -maxExt; gx <= maxExt; gx += P) {
          const test = isInsidePixelReticle(gx, gy);
          if (!test) continue;

          const pxX = snap(gx);
          const pyY = snap(gy);

          if (test === 'core') {
            ctx.fillStyle = '#FFFFFF';
          } else if (test === 'star') {
            ctx.fillStyle = '#00E5FF';
          } else if (test === 'dashed') {
            ctx.fillStyle = '#E0F7FA';
          } else if (test === 'ring') {
            ctx.fillStyle = '#0099FF';
          }
          ctx.fillRect(pxX, pyY, P, P);
        }
      }

      // 3. Pixel-Art Overhead Downward Chevrons
      const chevronY = snap(-(target.r || 25) - 22 + Math.sin(now * 0.02) * 5);
      // Cyan outer chevron
      for (let i = -4; i <= 4; i++) {
        const cx = i * P;
        const cy = chevronY - Math.abs(i) * P;
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(cx, cy, P, P);
      }
      // White inner chevron
      for (let i = -3; i <= 3; i++) {
        const cx = i * P;
        const cy = chevronY - 6 - Math.abs(i) * P;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx, cy, P, P);
      }

    } else {
      // ── STANDARD VECTOR MODE RENDERING ──
      // 1. Sky-to-Ground Reishi Guidance Light Columns
      const beamHeight = this.telegraphBeamHeight || 320;
      const beamGrad = ctx.createLinearGradient(0, -beamHeight, 0, 0);
      beamGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
      beamGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.18)');
      beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0.55)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-35, -beamHeight);
      ctx.lineTo(35, -beamHeight);
      ctx.lineTo(45, 10);
      ctx.lineTo(-45, 10);
      ctx.closePath();
      ctx.fill();

      // 2. Ground Quincy Cross Reticle Under Target's Feet
      const baseR = (target.r || 25) * (this.telegraphRadiusMult || 1.6);

      // Outer Glowing Reishi Ring
      ctx.beginPath();
      ctx.arc(0, 0, baseR, 0, Math.PI * 2);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Inner Dashed Glyph Ring (Rotating Clockwise)
      ctx.save();
      ctx.rotate(rot);
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 0.75, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 4-Point Quincy Reishi Star (Rotating Counter-Clockwise)
      ctx.save();
      ctx.rotate(-rot * 1.5);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const x1 = Math.cos(a) * (baseR * 1.25);
        const y1 = Math.sin(a) * (baseR * 1.25);
        const xMid = Math.cos(a + Math.PI / 4) * (baseR * 0.35);
        const yMid = Math.sin(a + Math.PI / 4) * (baseR * 0.35);
        if (i === 0) ctx.moveTo(x1, y1);
        else ctx.lineTo(x1, y1);
        ctx.lineTo(xMid, yMid);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // 3. Overhead Downward Chevron Indicator (Hovering Above Head)
      const chevronY = -(target.r || 25) - 22 + Math.sin(now * 0.02) * 5;
      ctx.beginPath();
      ctx.moveTo(-12, chevronY - 12);
      ctx.lineTo(0, chevronY);
      ctx.lineTo(12, chevronY - 12);
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 3.0;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-8, chevronY - 18);
      ctx.lineTo(0, chevronY - 8);
      ctx.lineTo(8, chevronY - 18);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders the Licht Regen targeting telegraph on the GROUND layer
   * (called by renderSystem BEFORE drawFighters so it renders underneath all fighters).
   */
  drawGroundTelegraph(ctx) {
    this._drawLichtRegenTargetTelegraph(ctx);
  }

  drawBody(ctx) {
    if (this.slashSwingTimer > 0) {
      drawUryuSeeleSlashArc(ctx, this);
    }
    drawUryuSkin(ctx, this);
  }

  drawSkin(ctx) {
    if (this.slashSwingTimer > 0) {
      drawUryuSeeleSlashArc(ctx, this);
    }
    drawUryuSkin(ctx, this);
  }

  draw(ctx, opponent) {
    if (this.slashSwingTimer > 0) {
      drawUryuSeeleSlashArc(ctx, this);
    }
    drawUryuSkin(ctx, this);
  }
}
