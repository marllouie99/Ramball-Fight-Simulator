import { CONFIG } from '../../../core/config.js';
import { modUpdateMeleeCombat } from './yujiCombat.js';
import { audioSystem } from '../../../systems/audioSystem.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../../../graphics/particles/sparkEffect.js';
import { pushTrailCap } from '../../../graphics/particles/visualTrailSystem.js';
import { projectileSystem } from '../../../systems/projectileSystem.js';

/**
 * Handles Yuji Itadori's Skill 1: Divergent Fist Combo Rush.
 * Dashes to target, then triggers a rapid 6-hit punch flurry (or Sukuna Slash-Teleport flurry during Soul Swap).
 */
export function modUpdateComboRush(target) {
  // Disable combo rush during Sukuna Soul Swap takeover (Soul Swap drives the 12 slash-teleport sequence exclusively)
  if (this.soulSwapActive || (this.rapidSlashHitsLeft || 0) > 0) return;

  // ── 1. TRIGGER CHECK ──
  if (!this.isComboDashing && (this.comboHitsLeft || 0) <= 0 && (this.comboRushCooldown || 0) <= 0 && target) {
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    const range = this.soulSwapActive ? 350 : (CONFIG.yuji?.comboDashRange || 200);
    
    if (dist <= range && dist > (this.r + target.r + 30)) {
      this.isComboDashing = true;
      this.comboTarget = target;
      this.comboRushCooldown = this.soulSwapActive ? 180 : (CONFIG.yuji?.comboCooldown || 400);
      
      // Play a quick dash whoosh sound
      audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.85);
    } else if (dist <= (this.r + target.r + 30)) {
      // Already in close range: immediately trigger combo flurry!
      this.comboTarget = target;
      this.comboHitsLeft = this.soulSwapActive ? 6 : (CONFIG.yuji?.comboHits || 6);
      this.comboIntervalTimer = 1;
      this.comboRushCooldown = this.soulSwapActive ? 180 : (CONFIG.yuji?.comboCooldown || 400);
    }
  }

  // ── 2. DASHING TO TARGET ──
  if (this.isComboDashing) {
    const t = this.comboTarget;
    if (!t || t.isDead || t.hp <= 0) {
      this.isComboDashing = false;
      this.comboTarget = null;
      return;
    }

    const isTargetGojoInfinity = (t.characterId === 'gojo' || t.type === 'gojo') && !t.isMeleeMode && !t.domainActive;
    const barrierRadius = isTargetGojoInfinity ? (CONFIG.gojo?.infinityRadius ?? (t.r + 30)) : (t.r + 35);
    const dist = Math.hypot(t.x - this.x, t.y - this.y);

    // Rebound immediately when contacting Gojo's Limitless Infinity barrier during dash!
    if (isTargetGojoInfinity && dist <= (this.r + barrierRadius)) {
      this.isComboDashing = false;
      this.comboHitsLeft = 0;
      this.comboTarget = null;
      if (typeof t.triggerInfinityBlock === 'function') {
        t.triggerInfinityBlock(this.x, this.y, this);
      }
      return;
    }

    this.aim(t);
    const angle = Math.atan2(t.y - this.y, t.x - this.x);
    const dashSpeed = this.soulSwapActive ? 22.0 : 15.5;
    this.vx = Math.cos(angle) * dashSpeed;
    this.vy = Math.sin(angle) * dashSpeed;

    if (dist <= (this.r + t.r + 35)) {
      // Arrived at target: start punch / slash combo
      this.isComboDashing = false;
      this.comboHitsLeft = this.soulSwapActive ? 6 : (CONFIG.yuji?.comboHits || 6);
      this.comboIntervalTimer = 1; // Immediately fire the first hit
      this.vx = 0;
      this.vy = 0;
    }
  }

  // ── 3. COMBO PUNCH / SUKUNA SLASH-TELEPORT FLURRY ──
  if ((this.comboHitsLeft || 0) > 0) {
    const t = this.comboTarget;
    if (!t || t.isDead || t.hp <= 0) {
      this.comboHitsLeft = 0;
      this.comboTarget = null;
      return;
    }

    const isTargetGojoInfinity = (t.characterId === 'gojo' || t.type === 'gojo') && !t.isMeleeMode && !t.domainActive;
    if (isTargetGojoInfinity) {
      // Cancel combo and rebound when striking Gojo's Limitless Infinity barrier
      this.comboHitsLeft = 0;
      this.comboTarget = null;
      if (typeof t.triggerInfinityBlock === 'function') {
        t.triggerInfinityBlock(this.x, this.y, this);
      }
      return;
    }

    // Check if enemy escaped out of reach (adding a small buffer for knockbacks)
    const dist = Math.hypot(t.x - this.x, t.y - this.y);
    if (dist > (this.r + t.r + 180)) {
      this.comboHitsLeft = 0;
      this.comboTarget = null;
      return;
    }

    // Freeze movement during flurry combo
    this.vx = 0;
    this.vy = 0;
    this.aim(t);

    this.comboIntervalTimer--;
    if (this.comboIntervalTimer <= 0) {
      if (this.soulSwapActive) {
        // === SUKUNA TAKEOVER: SLASH-TELEPORT-SLASH-TELEPORT SEQUENCE ===
        const ownerIndex = state.fighters ? state.fighters.indexOf(this) : 0;
        const baseDamage = CONFIG.yuji?.punchDamage || 18;
        const slashDamage = baseDamage * 1.5 * (CONFIG.yuji?.soulSwapDamageMultiplier || 1.5);
        const slashSpeed = CONFIG.sukuna?.slashSpeed || 40;
        const aimAngle = Math.atan2(t.y - this.y, t.x - this.x);

        this.gunAngle = aimAngle;
        this.aim(t);

        // 1. SLASH (Fire Dismantle projectile)
        if (projectileSystem) {
          projectileSystem.fireProjectile(
            this,
            ownerIndex,
            slashDamage,
            false,
            slashSpeed,
            false,
            'ghostBlade',
            this.x,
            this.y,
            aimAngle
          );
        }

        spawnFloatingText(this.x, this.y - 30, 'CLEAVE!', '#E0E8FF');
        triggerGlobalScreenShake(4, 6);
        spawnSparks(t.x, t.y, 12, 'crimsonSniper', '#8B0000');
        this.slashGlowTimer = 25;
        this.slashSwingTimer = 10;
        this.slashHand = this.slashHand === 1 ? 0 : 1;

        // Apply hit knockback & audio
        t.vx = (t.vx || 0) + Math.cos(aimAngle) * 3;
        t.vy = (t.vy || 0) + Math.sin(aimAngle) * 3;
        audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9);
        audioSystem.playSFX('Assets/Sound Effects/Skills/backstab.mp3', 0.75);
        spawnImpactFlash(this.x, this.y, 15, 'crimsonSniper');

        // 2. TELEPORT (Flash-step to surrounding angle around target)
        const oldX = this.x;
        const oldY = this.y;
        const teleportAngle = Math.random() * Math.PI * 2;
        const targetRadius = t.r || 20;
        const teleportDist = targetRadius + this.r + 20 + Math.random() * 45;

        this.x = t.x + Math.cos(teleportAngle) * teleportDist;
        this.y = t.y + Math.sin(teleportAngle) * teleportDist;

        if (state && state.arena) {
          this.x = Math.max(state.arena.x + 30, Math.min(state.arena.x + state.arena.width - 30, this.x));
          this.y = Math.max(state.arena.y + 30, Math.min(state.arena.y + state.arena.height - 30, this.y));
        }
        this.vx = 0;
        this.vy = 0;
        this.aim(t);

        // Spawn crimson afterimages for flash-step teleport
        if (!this.afterImages) this.afterImages = [];
        pushTrailCap(this.afterImages, {
          x: oldX,
          y: oldY,
          r: this.r,
          angle: aimAngle,
          color: '#8B0000',
          timer: 16,
          maxTimer: 16
        }, 12);

        spawnImpactFlash(oldX, oldY, 18, 'crimsonSniper');
        spawnImpactFlash(this.x, this.y, 22, 'crimsonSniper');
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.75);

        this.comboHitsLeft--;
        this.comboIntervalTimer = 6; // 6 frames rapid pacing for slash-teleport sequence!

        // Transition to 12-hit rapid finisher when combo slashes finish
        if (this.comboHitsLeft <= 0) {
          this.rapidSlashHitsLeft = 12;
          this.rapidSlashTimer = 0;
          this.flurryTarget = t;
        }
      } else {
        // Standard Yuji brawler punch combo
        modUpdateMeleeCombat.call(this, t, true);
        this.comboHitsLeft--;
        this.comboIntervalTimer = CONFIG.yuji?.comboInterval || 10;
      }
    }
  }
}

/**
 * Handles Yuji Itadori's Skill 2: Reverse Cursed Technique (RCT) [Passive].
 * RCT is a passive technique that automatically heals Yuji (+25% Max HP) whenever he transforms back from Sukuna.
 */
export function modUpdateReverseCursedTechnique() {
  // Legacy safety check: if active channeling is somehow requested, complete immediately
  if (this.isChannelingRCT) {
    this.isChannelingRCT = false;
    this.rctChannelTimer = 0;
  }
}
