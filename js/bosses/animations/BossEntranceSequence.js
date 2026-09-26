// ─────────────────────────────────────────────
// BOSS ENTRANCE SEQUENCE
// Cinematic intro controller: camera zoom, atmospheric darkness, thematic lightning/FX,
// and arcade splash title card with skip support.
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { resetCamera, worldToScreen } from '../../systems/cameraSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';
import { YutaBushEntrance } from './YutaBushEntrance.js';
import { EyeOfCthulhuEntrance } from './EyeOfCthulhuEntrance.js';

class BossEntranceSequenceClass {
  constructor() {
    this.isActive = false;
    this.boss = null;
    this.timer = 0;
    this.durationFrames = 110;
    this.onComplete = null;
    this._hasPlayedSfx = false;
  }

  /**
   * Starts the cinematic Boss Entrance sequence
   */
  start(boss, onComplete) {
    if (!boss || !boss.isBoss) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    this.isActive = true;
    this.boss = boss;
    this.timer = 0;
    this.durationFrames = boss.bossConfig?.entranceDurationFrames || 110;
    this.onComplete = onComplete;
    this._hasPlayedSfx = false;
    state._bossEntranceActive = true;

    // 1. Camera focus and cinematic zoom
    if (state.camera) {
      state.camera.cinematicOverride = true;
      state.camera.targetX = boss.x;
      state.camera.targetY = boss.y;
      state.camera.targetZoom = boss.bossConfig?.entranceCameraZoom || 1.30;
      state.camera.smoothing = 0.12;
    }

    // Initialize challenger gun angles aiming directly at the boss while keeping body upright
    if (state.fighters) {
      const bossTargetX = boss.x;
      const bossTargetY = boss.y - (boss.z || 0) * 0.4;
      let primaryChallenger = null;
      state.fighters.forEach((f) => {
        if (f && f !== boss && !f.isBoss) {
          if (!primaryChallenger) primaryChallenger = f;
          const dx = bossTargetX - f.x;
          const dy = bossTargetY - f.y;
          const aimAngle = Math.atan2(dy, dx);
          f.gunAngle = aimAngle;
          if (typeof f.rightGunAngle !== 'undefined') f.rightGunAngle = aimAngle;
          if (typeof f.leftGunAngle !== 'undefined') f.leftGunAngle = aimAngle;
          // Normal upright body angle facing the boss horizontally (0 for right, Math.PI for left)
          f.angle = (dx >= 0) ? 0 : Math.PI;
        }
      });

      // Also aim the boss at the primary challenger from frame 1
      if (primaryChallenger && boss) {
        const isEyeOrYuta = (boss.characterId === 'eye_of_cthulhu' || boss.type === 'eye_of_cthulhu' || boss.characterId === 'yuta' || boss.type === 'yuta');
        if (!isEyeOrYuta) {
          const bdx = primaryChallenger.x - boss.x;
          const bdy = primaryChallenger.y - boss.y;
          const bossAim = Math.atan2(bdy, bdx);
          boss.gunAngle = bossAim;
          boss.angle = bossAim;
          if (typeof boss.rightGunAngle !== 'undefined') boss.rightGunAngle = bossAim;
          if (typeof boss.leftGunAngle !== 'undefined') boss.leftGunAngle = bossAim;
        }
      }
    }

    // 2. Initial ground burst or character-specific entrance initialization
    const isYuta = (boss.characterId === 'yuta' || boss.type === 'yuta');
    const isEye = (boss.characterId === 'eye_of_cthulhu' || boss.type === 'eye_of_cthulhu');
    if (isYuta) {
      YutaBushEntrance.start(boss, this.durationFrames);
    } else if (isEye) {
      EyeOfCthulhuEntrance.start(boss, this.durationFrames);
    } else {
      const flashColor = boss.bossConfig?.entranceAuraColor || '#00BFFF';
      spawnSparks(boss.x, boss.y, 25, flashColor, 10);
    }
  }

  /**
   * Skips the cutscene immediately
   */
  skip() {
    if (!this.isActive) return;
    this.finish();
  }

  /**
   * Updates entrance timers and camera
   */
  update(dt = 1) {
    if (!this.isActive) return;

    this.timer += dt;

    const isYuta = (this.boss?.characterId === 'yuta' || this.boss?.type === 'yuta');
    const isEye = (this.boss?.characterId === 'eye_of_cthulhu' || this.boss?.type === 'eye_of_cthulhu');
    if (isYuta) {
      YutaBushEntrance.update(dt, this.timer, this.durationFrames);
    } else if (isEye) {
      EyeOfCthulhuEntrance.update(dt, this.timer, this.durationFrames);
    }

    // Continuously aim challenger gun angles dynamically at boss throughout the entrance sequence
    if (this.boss && state.fighters) {
      const bossTargetX = this.boss.x;
      const bossTargetY = this.boss.y - (this.boss.z || 0) * 0.4;
      let primaryChallenger = null;
      state.fighters.forEach((f) => {
        if (f && f !== this.boss && !f.isBoss && f.hp > 0) {
          if (!primaryChallenger) primaryChallenger = f;
          const dx = bossTargetX - f.x;
          const dy = bossTargetY - f.y;
          const aimAngle = Math.atan2(dy, dx);
          f.gunAngle = aimAngle;
          if (typeof f.rightGunAngle !== 'undefined') f.rightGunAngle = aimAngle;
          if (typeof f.leftGunAngle !== 'undefined') f.leftGunAngle = aimAngle;
          // Keep body upright facing toward boss side
          f.angle = (dx >= 0) ? 0 : Math.PI;
        }
      });

      // Continuously aim boss at primary challenger
      if (primaryChallenger && !isEye && !isYuta) {
        const bdx = primaryChallenger.x - this.boss.x;
        const bdy = primaryChallenger.y - this.boss.y;
        const bossAim = Math.atan2(bdy, bdx);
        this.boss.gunAngle = bossAim;
        this.boss.angle = bossAim;
        if (typeof this.boss.rightGunAngle !== 'undefined') this.boss.rightGunAngle = bossAim;
        if (typeof this.boss.leftGunAngle !== 'undefined') this.boss.leftGunAngle = bossAim;
      }
    }

    // Keep camera smoothly tracking the boss throughout entrance
    if (state.camera && this.boss) {
      state.camera.cinematicOverride = true;
      state.camera.targetX = this.boss.x;
      state.camera.targetY = this.boss.y - (this.boss.z || 0) * 0.4;
      state.camera.targetZoom = this.boss.bossConfig?.entranceCameraZoom || 1.30;
    }

    // Trigger Zeus entrance thunderclap at frame 15
    if (!this._hasPlayedSfx && this.timer >= 15) {
      this._hasPlayedSfx = true;
      const isZeus = (this.boss?.characterId === 'zeus' || this.boss?.type === 'zeus');
      if (isZeus) {
        audioSystem.playSFX('Assets/Sound Effects/Attacks/lasersniper1.mp3', 0.9, 0.75);
      }
    }

    const isVoicelinePlaying = (isYuta && YutaBushEntrance.isVoicelinePlaying());

    if ((this.timer >= this.durationFrames && !isVoicelinePlaying) || this.timer >= (this.durationFrames + 180)) {
      this.finish();
    }
  }

  /**
   * Immediately skips the entrance animation and transitions to battle
   */
  skip() {
    if (!this.isActive) return;
    this.finish();
  }

  /**
   * Concludes the cutscene and passes control back to gameFlow
   */
  finish() {
    this.isActive = false;
    state._bossEntranceActive = false;

    if (state.camera) {
      state.camera.cinematicOverride = false;
      state.camera.smoothing = 0.08;
      resetCamera(false);
    }

    const isYuta = Boolean(this.boss && (this.boss.characterId === 'yuta' || this.boss.type === 'yuta'));
    const isEye = Boolean(this.boss && (this.boss.characterId === 'eye_of_cthulhu' || this.boss.type === 'eye_of_cthulhu' || this.boss.characterId === 'eyeofcthulhu' || this.boss.type === 'eyeofcthulhu'));

    if (isYuta) {
      YutaBushEntrance.finish(this.boss);
    } else {
      YutaBushEntrance.finish(null);
    }

    if (isEye) {
      EyeOfCthulhuEntrance.finish(this.boss);
    } else {
      EyeOfCthulhuEntrance.finish(null);
    }

    // Signal HUD to smoothly fade in after boss entrance concludes
    state._bossEntranceHudFadeTimer = 0;

    const callback = this.onComplete;
    this.onComplete = null;
    this.boss = null;

    if (typeof callback === 'function') {
      callback();
    }
  }

  /**
   * Screen-space 2D rendering of the cinematic overlay and title card
   */
  draw(ctx) {
    if (!this.isActive || !this.boss) return;

    const canvasW = state.canvas ? state.canvas.width : 540;
    const canvasH = state.canvas ? state.canvas.height : 960;
    const config = this.boss.bossConfig || {};
    const themeColor = config.themeColor || '#00BFFF';

    const p = Math.min(1.0, this.timer / this.durationFrames);
    const fadeIn = Math.min(1.0, this.timer / 20);
    const fadeOut = Math.max(0, 1.0 - (this.timer - (this.durationFrames - 20)) / 20);
    const alpha = Math.min(fadeIn, fadeOut);

    ctx.save();

    // 1. Ambient Darkness Overlay removed per user request (Zero screen dim)

    // 2. Thematic Entrance Divine Bolt (Zeus) or Light Column — skip for Yuta and Eye of Cthulhu
    const isYuta = (this.boss.characterId === 'yuta' || this.boss.type === 'yuta');
    const isEye = (this.boss.characterId === 'eye_of_cthulhu' || this.boss.type === 'eye_of_cthulhu');
    const screenPos = worldToScreen(this.boss.x, this.boss.y);
    if (!isYuta && !isEye && this.timer >= 10 && this.timer <= 45) {
      const strikeProg = (this.timer - 10) / 35;
      const boltAlpha = Math.max(0, 1 - strikeProg) * alpha;

      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4.0;
      ctx.globalAlpha = boltAlpha * 0.95;
      ctx.beginPath();
      ctx.moveTo(screenPos.x, 0);
      ctx.lineTo(screenPos.x + 8, screenPos.y * 0.35);
      ctx.lineTo(screenPos.x - 10, screenPos.y * 0.65);
      ctx.lineTo(screenPos.x, screenPos.y);
      ctx.stroke();

      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 8.0;
      ctx.globalAlpha = boltAlpha * 0.45;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Arcade Splash Card (Positioned in the top header zone above the arena)
    const arenaTop = (state.arena && typeof state.arena.y === 'number') ? state.arena.y : 170;
    const cardY = Math.max(50, arenaTop - 78);
    let bossName = (this.boss.name || this.boss._def?.name || this.boss.characterId || 'BOSS').toUpperCase();
    let bossTitle = this.boss.bossConfig?.bossTitle || config.bossTitle || '✦ SUPREME BOSS ✦';
    let bossSubtitle = this.boss.bossConfig?.bossSubtitle || config.bossSubtitle || this.boss.bossConfig?.bossTitle || config.bossTitle || 'DREADED ARENA OVERLORD';
    let topTag = '✦ BOSS ENCOUNTER ✦';

    if (isYuta) {
      topTag = '✦ BOSS ENCOUNTER ✦';
      bossName = (this.boss.name || this.boss._def?.name || 'YUTA OKKOTSU').toUpperCase();
      bossSubtitle = this.boss.bossConfig?.bossSubtitle || config.bossSubtitle || 'THE BUSH CAMPER — SPECIAL GRADE SORCERER';
    } else if (isEye) {
      topTag = '✦ BOSS ENCOUNTER ✦';
      bossName = 'EYE OF CTHULHU';
      bossSubtitle = this.boss.bossConfig?.bossSubtitle || config.bossSubtitle || 'YOU FEEL AN EVIL PRESENCE WATCHING YOU...';
    }

    ctx.textAlign = 'center';

    // Top Tag Banner
    ctx.font = '700 12px "Silkscreen", monospace, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.fillStyle = '#FF3344';
    ctx.globalAlpha = alpha;
    ctx.fillText(topTag, canvasW / 2, cardY - 24);

    // Boss Name Plate
    ctx.font = '700 38px "Silkscreen", monospace, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.fillStyle = themeColor;
    ctx.globalAlpha = alpha;
    ctx.fillText(bossName, canvasW / 2, cardY + 14);

    // Boss Subtitle / Epithet (Simple, crisp, high-contrast text)
    const isDark = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode));
    ctx.font = '700 12px "Silkscreen", monospace, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillStyle = isDark ? '#E2E8F0' : '#0F172A';
    ctx.globalAlpha = alpha;
    ctx.fillText(bossSubtitle, canvasW / 2, cardY + 38);

    // Skip Hint
    if (this.timer >= 25) {
      const skipAlpha = Math.min(1.0, (this.timer - 25) / 20) * alpha;
      ctx.font = '700 10px "Silkscreen", monospace, sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 23, 42, 0.55)';
      ctx.globalAlpha = skipAlpha;
      const isTouchOrMobile = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
      const skipHintText = isTouchOrMobile ? '[ TAP SCREEN TO SKIP ]' : '[ PRESS ESC TO SKIP ]';
      ctx.fillText(skipHintText, canvasW / 2, canvasH * 0.92);
    }

    ctx.restore();
  }
}

export const BossEntranceSequence = new BossEntranceSequenceClass();
