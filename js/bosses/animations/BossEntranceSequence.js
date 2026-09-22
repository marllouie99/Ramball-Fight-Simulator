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

    // 2. Initial ground burst or character-specific entrance initialization
    const isYuta = (boss.characterId === 'yuta' || boss.type === 'yuta');
    if (isYuta) {
      YutaBushEntrance.start(boss, this.durationFrames);
    } else {
      const flashColor = boss.bossConfig?.entranceAuraColor || '#00BFFF';
      spawnImpactFlash(boss.x, boss.y, boss.r * 2.8, flashColor);
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
    if (isYuta) {
      YutaBushEntrance.update(dt, this.timer, this.durationFrames);
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

    const isVoicelinePlaying = isYuta && YutaBushEntrance.isVoicelinePlaying();

    if (this.timer >= this.durationFrames && !isVoicelinePlaying) {
      this.finish();
    }
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

    YutaBushEntrance.finish(this.boss);

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

    // 2. Thematic Entrance Divine Bolt (Zeus) or Light Column — skip for Yuta's Bush Camper entrance
    const isYuta = (this.boss.characterId === 'yuta' || this.boss.type === 'yuta');
    const screenPos = worldToScreen(this.boss.x, this.boss.y);
    if (!isYuta && this.timer >= 10 && this.timer <= 45) {
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
    let bossTitle = config.bossTitle || '✦ SUPREME BOSS ✦';
    let bossSubtitle = config.bossSubtitle || 'DREADED ARENA OVERLORD';
    let topTag = '✦ BOSS ENCOUNTER ✦';

    if (isYuta) {
      topTag = '✦ BOSS ENCOUNTER ✦';
      bossName = (this.boss.name || this.boss._def?.name || 'YUTA OKKOTSU').toUpperCase();
      bossSubtitle = this.boss.bossConfig?.bossSubtitle || config.bossSubtitle || 'THE BUSH CAMPER — SPECIAL GRADE SORCERER';
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
