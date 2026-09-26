// ─────────────────────────────────────────────
// End Crystal Minion Entity — Minecraft End Crystal Boss Minion
// 6-Frame Animated Glass Cage & Rotating Magenta Rune Cube
// Flagged with isMinion = true, isImmovable = true, cannotBeKnockbacked = true
// ─────────────────────────────────────────────

import { Fighter, applyDamageToTarget } from './fighter.js';
import { state, triggerGlobalScreenShake, spawnFloatingText } from '../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../graphics/particles/sparkEffect.js';
import { audioSystem } from '../systems/audioSystem.js';

let _crystalSheetImg = null;
let _crystalSheetLoaded = false;

export function getEndCrystalSpriteSheet() {
  if (!_crystalSheetImg && typeof Image !== 'undefined') {
    _crystalSheetImg = new Image();
    _crystalSheetImg.onload = () => { _crystalSheetLoaded = true; };
    _crystalSheetImg.src = encodeURI('Assets/model/Sprites/End-crystal-animation-sprite-sheet.png?v=1');
  }
  return _crystalSheetImg;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getEndCrystalSpriteSheet();
}

export class EndCrystalEntity extends Fighter {
  constructor(x, y, id = 'crystal_node', name = 'End Crystal') {
    const maxHp = 60;
    const radius = 24;

    const def = {
      id: 888,
      name: name,
      color: '#C026D3',
      startX: x,
      startY: y,
      startVx: 0,
      startVy: 0,
      radius: radius,
      type: 'EndCrystal',
      isMinion: true,
      hp: maxHp,
      damage: 0,
      cooldown: 999,
      moveSpeed: 0,
    };
    super(def);

    this.crystalId = id;
    this._fixedX = x;
    this._fixedY = y;
    this.x = x;
    this.y = y;

    // Comprehensive Immobility & Debuff Immunity Flags
    this.isMinion = true;
    this.isEndCrystal = true;
    this.isDeployable = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.immuneToKnockback = true;
    this.immuneToPush = true;
    this.immuneToPull = true;
    this.immuneToSuction = true;
    this.immuneToDrag = true;
    this.immuneToCC = true;
    this.immuneToBurn = true;
    this.immuneToParalyze = true;
    this.immuneToSlow = true;
    this.immuneToHitStun = true;
    this.immuneToTimeStop = true;
    this.immuneToDebuffs = true;
    this.immuneToSoulDisfigurement = true;
    this.immuneToTelekinesis = true;
    this.immuneToDomainStasis = true;
    this.cannotBeChained = true;
    this.cannotBeGrabbed = true;
    this.cannotBeSwapped = true;

    this.hideHpText = true;
    this.hideHands = true;
    this.hideGun = true;
    this.hideFrontHand = true;
    this.hideBackHand = true;

    this.maxHp = maxHp;
    this.hp = maxHp;
    this.r = radius;
    this.hitFlashTimer = 0;
    this.animTimer = Math.floor(Math.random() * 24);
    this.bobPhase = Math.random() * Math.PI * 2;
    this._visualBobY = 0;

    // Tether healing mechanics
    this.isTetheredToDragon = false;
    this.tetherDragonTarget = null;
    this.tetherTickTimer = 0;

    // Bedrock Base
    this.pedestalRadius = radius * 1.35;
  }

  reset() {
    super.reset();
    this.isMinion = true;
    this.isEndCrystal = true;
    this.isDeployable = true;
    this.isImmovable = true;
    this.cannotBeKnockbacked = true;
    this.immuneToKnockback = true;
    this.immuneToPush = true;
    this.immuneToPull = true;
    this.immuneToSuction = true;
    this.cannotBeSwapped = true;
    this.hideHpText = true;
    this.hp = this.maxHp;
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.burnTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    this.hitFlashTimer = 0;
    this.isTetheredToDragon = false;
    this._visualBobY = 0;
  }

  // ── Complete Movement & Physics Neutralization ──
  applyKnockback() { return; }
  applyPush() { return; }
  applyPull() { return; }
  applySuction() { return; }
  applyDrag() { return; }
  applyMovementPhysics() {
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
  }
  resolveWallBounce() { return; }

  // ── Complete Debuff & Status Effect Neutralization ──
  applyBurn() { this.burnTimer = 0; return; }
  applyParalyze() { this.paralyzeTimer = 0; return; }
  applyHitStun() { this.hitStunTimer = 0; return; }
  applyTimeStop() { this.timeStopTimer = 0; return; }
  applySlow() { this.slowTimer = 0; return; }
  applyPoison() { return; }
  applyBleed() { return; }
  applySoulDisfigurement() { return; }
  applyTelekinesis() { return; }
  applyChain() { return; }
  applyRatioCrit() { return; }
  applyDomainStasis() { return; }
  applyGetsugaDrag() { return; }
  _handleTimeStop() { return false; }
  isEffectivelyAlive() { return false; }

  // ── Zero UI / HUD / Overhead Renderers ──
  drawHealth() { /* End Crystals do not have overhead/HUD health bars */ }
  drawGun() { /* End Crystals do not wield firearms */ }
  drawFreezeTimer() { /* End Crystals are immune to freeze */ }
  drawStatusOverlays() { /* End Crystals are immune to debuffs */ }

  update(opponent, ownerIndex, arena) {
    if (this.hp <= 0) {
      this.detonate();
      return;
    }

    // Lock position strictly to fixed anchor coordinates
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.burnTimer = 0;
    this.paralyzeTimer = 0;
    this.slowTimer = 0;
    this.hitStunTimer = 0;
    this.timeStopTimer = 0;
    this.animTimer++;

    // Retro Arcade 2.0px discrete stepped bobbing [-6px, -4px, -2px, 0px, +2px, +4px, +6px]
    const rawBob = Math.sin(this.animTimer * 0.08 + (this.bobPhase || 0)) * 6.0;
    this._visualBobY = Math.round(rawBob / 2.0) * 2.0;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer--;
    }

    // ── Check Tether with Ender Dragon Boss ──
    const dragon = (state.fighters || []).find(f => f && (f.characterId === 'ender_dragon' || f.type === 'ender_dragon') && f.hp > 0);
    if (dragon) {
      const dist = Math.hypot(dragon.x - this.x, dragon.y - this.y);
      const tetherReach = 340;

      if (dist <= tetherReach) {
        this.isTetheredToDragon = true;
        this.tetherDragonTarget = dragon;
        this.tetherTickTimer++;

        // Heal dragon every 45 frames (+6 HP)
        if (this.tetherTickTimer >= 45) {
          this.tetherTickTimer = 0;
          if (dragon.hp < dragon.maxHp) {
            dragon.hp = Math.min(dragon.maxHp, dragon.hp + 6);
            if (typeof spawnFloatingText === 'function') {
              spawnFloatingText(dragon.x, dragon.y - 30, '+6', '#4ADE80');
            }
          }
        }
      } else {
        this.isTetheredToDragon = false;
        this.tetherDragonTarget = null;
      }
    } else {
      this.isTetheredToDragon = false;
      this.tetherDragonTarget = null;
    }
  }

  takeDamage(amount, source, options) {
    if (this.hp <= 0) return 0;
    // Friendly Fire Protection: The Ender Dragon cannot damage its own healing crystals
    if (source && (source.characterId === 'ender_dragon' || source.type === 'ender_dragon' || source.isBoss)) {
      return 0;
    }
    const finalDmg = Math.max(1, Math.round(amount));
    this.hp -= finalDmg;
    this.hitFlashTimer = 6;

    // Maintain strict anchor lock on hit
    if (this._fixedX !== undefined) {
      this.x = this._fixedX;
      this.y = this._fixedY;
    }
    this.vx = 0;
    this.vy = 0;
    this.knockbackVx = 0;
    this.knockbackVy = 0;

    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, this.y - 20, `-${finalDmg}`, '#C026D3');
    }

    if (this.hp <= 0) {
      this.detonate(source);
    }
    return finalDmg;
  }

  detonate(source) {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.hp = 0;
    this.dead = true;
    this.isDead = true;

    // Visual & Audio Detonation Explosion
    triggerGlobalScreenShake(8, 24);
    spawnImpactFlash(this.x, this.y, 90, '#F5D0FE');
    spawnSparks(this.x, this.y, '#C026D3', 24, 7.0);
    spawnSparks(this.x, this.y, '#E879F9', 18, 5.5);
    spawnSparks(this.x, this.y, '#FFFFFF', 12, 4.0);

    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
      audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 0.95);
      audioSystem.playSFX('Assets/Sound Effects/Skills/purpledeploy.mp3', 0.80);
    }

    // Radial Blast Damage to nearby entities
    const blastRadius = 110;
    const blastDamage = 28;
    const blastKnockback = 16.0;
    const targets = (state.fighters || []).filter(f => f && f !== this && f.hp > 0);

    for (let target of targets) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist <= blastRadius) {
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        applyDamageToTarget(target, blastDamage, source || this);
        if (typeof target.applyKnockback === 'function') {
          target.applyKnockback(Math.cos(angle) * blastKnockback, Math.sin(angle) * blastKnockback, 12);
        }
      }
    }

    // ── Dragon Backlash & Enrage Trigger ──
    const dragon = (state.fighters || []).find(f => f && (f.characterId === 'ender_dragon' || f.type === 'ender_dragon') && f.hp > 0);
    if (dragon) {
      const backlashDmg = 60;
      applyDamageToTarget(dragon, backlashDmg, source || this);
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(dragon.x, dragon.y - 35, `-${backlashDmg} BACKLASH!`, '#E879F9');
      }

      // Trigger dragon enrage response & flight direction shift
      if (typeof dragon._evaluateEnvironmentalReactivity === 'function') {
        dragon.patrolDirection = (dragon.patrolDirection || 1) * -1;
        dragon.targetAltitude = 1.7;
        triggerGlobalScreenShake(10, 28);
        dragon._playAudio('roar', 'Assets/Sound Effects/Skills/ragescream.mp3', 1.0);
      }
    }

    // Remove from active fighters array
    const idx = (state.fighters || []).indexOf(this);
    if (idx !== -1) {
      state.fighters.splice(idx, 1);
    }
  }

  draw(ctx) {
    if (!ctx) return;
    const sheetImg = getEndCrystalSpriteSheet();
    const isReady = Boolean(sheetImg && sheetImg.complete && sheetImg.naturalWidth > 0);
    const bobY = this._visualBobY !== undefined ? this._visualBobY : 0;

    ctx.save();
    ctx.translate(this.x, this.y + bobY);

    // 1. Retro Arcade Animated End Crystal (Snappy 12-FPS frame switching)
    const animTicks = 5;
    const frameIdx = Math.floor(this.animTimer / animTicks) % 6;
    const drawSize = 56;

    if (isReady) {
      const fw = 362;
      const fh = 724;
      const sx = frameIdx * fw;
      const sy = 0;

      ctx.save();
      ctx.imageSmoothingEnabled = false; // Authentic Minecraft pixel art nearest-neighbor sampling
      ctx.drawImage(
        sheetImg,
        sx, sy, fw, fh,
        -drawSize / 2, -drawSize * 0.75, drawSize, drawSize * 1.5
      );
      ctx.restore();
    } else {
      // Procedural fallback
      ctx.fillStyle = '#C026D3';
      ctx.beginPath();
      ctx.arc(0, -6, this.r * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#F5D0FE';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 2. Retro Arcade Pixel Energy Motes (2.0px discrete grid)
    const P = 2.0;
    const moteTicks = Math.floor(this.animTimer / 4);
    for (let m = 0; m < 4; m++) {
      const angle = (m / 4) * Math.PI * 2 + moteTicks * 0.20;
      const dist = 26 + ((moteTicks + m * 2) % 3) * 2.0;
      const mx = Math.round((Math.cos(angle) * dist) / P) * P;
      const my = Math.round((Math.sin(angle) * dist * 0.65) / P) * P;
      const mSize = (m % 2 === 0) ? P : P * 1.5;
      const mColor = (m % 3 === 0) ? '#FFFFFF' : (m % 2 === 0 ? '#F5D0FE' : '#E879F9');

      ctx.fillStyle = mColor;
      ctx.fillRect(mx - mSize / 2, my - mSize / 2, mSize, mSize);
    }

    // 3. Retro Hit Flash Overlay (Stepped 1-bit strobe)
    if (this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(-this.r * 0.9, -this.r * 1.1, this.r * 1.8, this.r * 2.0);
    }

    ctx.restore();
  }
}

