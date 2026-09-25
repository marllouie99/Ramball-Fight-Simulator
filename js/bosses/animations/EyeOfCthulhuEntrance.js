// ─────────────────────────────────────────────
// EYE OF CTHULHU BOSS ENTRANCE ANIMATION
// Option 1: "Night Sky Swoop & Roar" (Authentic Terraria Descent)
// Features:
// 1. Sky Rumble & Atmospheric Anticipation (Frames 0–30):
//    - Deep groaning audio rumble (EyeOfCthulhu-noise1.mp3)
//    - Crimson atmospheric spores and embers drifting
//    - Boss held high in the night sky off-screen
// 2. Parabolic Sky Swoop & Ghost Afterimages (Frames 30–75):
//    - Smooth quadratic Bezier descent curve from upper sky into arena hover anchor
//    - Crimson ghost afterimages trailing behind
//    - Manga action speed lines (Rule 2.5 4-point needle polygons)
// 3. Ferocious Screech Roar & Pupil Gaze Lock (Frames 75–110):
//    - High screech roar audio (EyeOfCthulhu-noise3.mp3) + camera shake (3.5)
//    - Impact shockwave flash & diamond pupil specular flare
//    - Smooth angular interpolation locking gaze directly onto challengers
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks } from '../../graphics/particles/sparkEffect.js';

const CRIMSON_SPORE_COLORS = ['#E11D48', '#FB7185', '#9F1239', '#FFFFFF', '#BE123C'];

// Pre-seeded discrete speed lines following Rule 2.5
const PRESET_SPEED_LINES = [
  { lane: 0.15, backDist: 8,  len: 38, thickness: 1.8, baseAlpha: 0.85, colorIdx: 0 },
  { lane: 0.35, backDist: 18, len: 48, thickness: 2.2, baseAlpha: 0.95, colorIdx: 2 },
  { lane: 0.50, backDist: 12, len: 54, thickness: 2.0, baseAlpha: 0.90, colorIdx: 1 },
  { lane: 0.68, backDist: 22, len: 42, thickness: 1.6, baseAlpha: 0.80, colorIdx: 0 },
  { lane: 0.85, backDist: 14, len: 46, thickness: 2.0, baseAlpha: 0.90, colorIdx: 3 },
  { lane: 0.25, backDist: 30, len: 32, thickness: 1.4, baseAlpha: 0.70, colorIdx: 1 },
  { lane: 0.75, backDist: 28, len: 36, thickness: 1.5, baseAlpha: 0.75, colorIdx: 2 },
];

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

class EyeOfCthulhuEntranceClass {
  constructor() {
    this.isActive = false;
    this.boss = null;
    this.timer = 0;
    this.durationFrames = 110;
    this.particles = [];
    this._cachedSpeedLines = PRESET_SPEED_LINES;

    this._hasPlayedRumbleSfx = false;
    this._hasPlayedScreechSfx = false;
    this._audioPlaying = false;

    this._startSkyX = 0;
    this._startSkyY = 0;
    this._controlX = 0;
    this._controlY = 0;
    this._targetHoverX = 0;
    this._targetHoverY = 0;
    this._landingAngle = 0;
    this._targetAimAngle = 0;
    this._hasCompletedTurn = false;
  }

  /**
   * Returns whether Eye of Cthulhu's entrance audio is currently playing
   */
  isAudioPlaying() {
    return Boolean(this.isActive && this._audioPlaying);
  }

  /**
   * Starts the Eye of Cthulhu "Night Sky Swoop & Roar" entrance sequence
   */
  start(boss, durationFrames = 110) {
    this.isActive = true;
    this.boss = boss;
    this.timer = 0;
    this.durationFrames = durationFrames;
    this.particles = [];
    this._hasPlayedRumbleSfx = false;
    this._hasPlayedScreechSfx = false;
    this._hasCompletedTurn = false;
    this._audioPlaying = true;

    const arena = state.arena || CONFIG.arena || { x: 20, y: 120, width: 500, height: 700 };
    const arenaCenterX = (typeof arena.x === 'number' && typeof arena.width === 'number')
      ? arena.x + arena.width * 0.5
      : 270;
    const arenaTopY = (typeof arena.y === 'number' && typeof arena.height === 'number')
      ? arena.y + arena.height * 0.28
      : 280;

    // Target hover anchor in the upper-center of the arena (matches standard Boss formation)
    this._targetHoverX = arenaCenterX;
    this._targetHoverY = arenaTopY;

    // Initial sky position: high off-screen up and to the right
    this._startSkyX = this._targetHoverX + 240;
    this._startSkyY = this._targetHoverY - 500;

    // Parabolic swoop control point (dips past center then curves smoothly up into position)
    this._controlX = this._targetHoverX - 100;
    this._controlY = this._targetHoverY + 80;

    // Initial heading points along the initial tangent of the dive curve
    const initialDx = this._controlX - this._startSkyX;
    const initialDy = this._controlY - this._startSkyY;
    const initialAngle = Math.atan2(initialDy, initialDx);

    if (this.boss) {
      this.boss.x = this._startSkyX;
      this.boss.y = this._startSkyY;
      this.boss.z = 0;
      this.boss.gunAngle = initialAngle;
      this.boss.angle = initialAngle;
      this.boss.afterImages = [];
      this.boss.hideHands = true;
      this.boss.hideGun = true;
    }

    // Spawn initial atmospheric crimson sky spores
    for (let i = 0; i < 24; i++) {
      this._spawnSpore(
        this._targetHoverX + (Math.random() - 0.5) * 400,
        this._targetHoverY - 200 + Math.random() * 350,
        (Math.random() - 0.5) * 1.2,
        0.5 + Math.random() * 1.5
      );
    }
  }

  /**
   * Spawns a floating atmospheric crimson spore particle
   */
  _spawnSpore(x, y, vx, vy) {
    const color = CRIMSON_SPORE_COLORS[Math.floor(Math.random() * CRIMSON_SPORE_COLORS.length)];
    const size = 2.0 + Math.random() * 2.5;
    this.particles.push({
      x,
      y,
      vx,
      vy,
      size,
      color,
      alpha: 1.0,
      life: Math.floor(45 + Math.random() * 35),
      maxLife: 80
    });
  }

  /**
   * Evaluates quadratic Bezier curve point B(t)
   */
  _getBezierPoint(t) {
    const invT = 1 - t;
    const x = invT * invT * this._startSkyX + 2 * invT * t * this._controlX + t * t * this._targetHoverX;
    const y = invT * invT * this._startSkyY + 2 * invT * t * this._controlY + t * t * this._targetHoverY;
    return { x, y };
  }

  /**
   * Evaluates quadratic Bezier derivative tangent B'(t)
   */
  _getBezierTangent(t) {
    const invT = 1 - t;
    const dx = 2 * invT * (this._controlX - this._startSkyX) + 2 * t * (this._targetHoverX - this._controlX);
    const dy = 2 * invT * (this._controlY - this._startSkyY) + 2 * t * (this._targetHoverY - this._controlY);
    return { dx, dy, angle: Math.atan2(dy, dx) };
  }

  /**
   * Per-frame logic update
   */
  update(dt = 1, entranceTimer = 0, totalDuration = 110) {
    if (!this.isActive || !this.boss) return;

    this.timer = entranceTimer;
    this.durationFrames = totalDuration;

    // ── Phase 1: Sky Rumble & Atmosphere (Frames 0 to 30) ──
    if (this.timer < 30) {
      this.boss.x = this._startSkyX;
      this.boss.y = this._startSkyY;
      this.boss.z = 0;

      // Play deep groaning sky rumble SFX at frame 2
      if (!this._hasPlayedRumbleSfx && this.timer >= 2) {
        this._hasPlayedRumbleSfx = true;
        this._audioPlaying = true;
        const rumbleSrc = this.boss?.bossConfig?.entranceRumble || 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise1.mp3';
        const rumbleVol = this.boss?.bossConfig?.entranceRumbleVolume ?? 0.95;
        audioSystem.playSFX(rumbleSrc, rumbleVol, 0.85);
      }

      // Atmospheric camera framing centered on arena hover position
      if (state.camera) {
        state.camera.targetX = this._targetHoverX;
        state.camera.targetY = this._targetHoverY;
      }

      // Continuously spawn drifting atmospheric spores
      if (this.timer % 3 === 0) {
        this._spawnSpore(
          this._targetHoverX + (Math.random() - 0.5) * 440,
          this._targetHoverY - 260 + Math.random() * 200,
          (Math.random() - 0.5) * 1.0,
          0.8 + Math.random() * 1.6
        );
      }
    }
    // ── Phase 2: Parabolic Sky Swoop & Ghost Afterimages (Frames 30 to 70) ──
    else if (this.timer >= 30 && this.timer < 70) {
      const swoopProgress = (this.timer - 30) / 40;
      const easedT = easeInOutCubic(Math.min(1.0, Math.max(0, swoopProgress)));

      const pos = this._getBezierPoint(easedT);
      const tangent = this._getBezierTangent(easedT);

      this.boss.x = pos.x;
      this.boss.y = pos.y;
      this.boss.gunAngle = tangent.angle;
      this.boss.angle = tangent.angle;
      this._landingAngle = tangent.angle;

      // Camera smoothly locks onto the descending boss
      if (state.camera) {
        state.camera.targetX = this.boss.x;
        state.camera.targetY = this.boss.y;
      }

      // Push crimson afterimages every 2 frames during flight
      if (this.timer % 2 === 0) {
        if (!this.boss.afterImages) this.boss.afterImages = [];
        this.boss.afterImages.push({
          x: this.boss.x,
          y: this.boss.y,
          angle: this.boss.gunAngle,
          timer: 14,
          maxTimer: 14,
          isPhase2: false,
          r: this.boss.r || 32
        });
      }
    }
    // ── Phase 3: Screech Roar, Shockwave & Pupil Gaze Lock (Frames 70 to end) ──
    else {
      // Screech Roar & Camera Shake Trigger at Frame 70
      if (!this._hasPlayedScreechSfx) {
        this._hasPlayedScreechSfx = true;
        this._audioPlaying = true;
        const roarSrc = this.boss?.bossConfig?.entranceRoar || 'Assets/Sound Effects/SkillEffects/EyeOfCthulhu-noise3.mp3';
        const roarVol = this.boss?.bossConfig?.entranceRoarVolume ?? 1.0;
        audioSystem.playSFX(roarSrc, roarVol, 1.0, 0, 0, () => {
          this._audioPlaying = false;
        });
        
        if (state.camera) {
          state.camera.shakeIntensity = 3.8;
        }

        // Spawn crimson spark burst (no giant obscuring flash circle)
        spawnSparks(this.boss.x, this.boss.y, 20, '#E11D48', 9);
      }

      // Subtle atmospheric hover breathing bob
      const hoverBob = Math.sin((this.timer - 70) * 0.14) * 3.2;
      this.boss.x = this._targetHoverX;
      this.boss.y = this._targetHoverY + hoverBob;

      // Smooth pupil gaze lock: rotate gunAngle toward challengers over 28 frames
      if (!this._hasCompletedTurn) {
        const turnDuration = 28;
        const turnProgress = Math.min(1.0, (this.timer - 70) / turnDuration);
        const ease = turnProgress * turnProgress * (3 - 2 * turnProgress);

        let targetX = this._targetHoverX;
        let targetY = this._targetHoverY + 120; // fallback: look downward towards arena
        if (state.fighters) {
          const challengers = [];
          for (let i = 0; i < state.fighters.length; i++) {
            const f = state.fighters[i];
            if (f && !f.isBoss && f.hp > 0 && f !== this.boss) {
              challengers.push(f);
            }
          }
          if (challengers.length > 0) {
            targetX = challengers.reduce((sum, c) => sum + c.x, 0) / challengers.length;
            targetY = challengers.reduce((sum, c) => sum + c.y, 0) / challengers.length;
          }
        }

        this._targetAimAngle = Math.atan2(targetY - this.boss.y, targetX - this.boss.x);

        let diff = this._targetAimAngle - this._landingAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const currentAngle = this._landingAngle + diff * ease;
        this.boss.gunAngle = currentAngle;
        this.boss.angle = currentAngle;

        if (turnProgress >= 1.0) {
          this._hasCompletedTurn = true;
        }
      }
    }

    // Update active ghost afterimages
    if (this.boss && this.boss.afterImages) {
      for (let i = this.boss.afterImages.length - 1; i >= 0; i--) {
        const ai = this.boss.afterImages[i];
        ai.timer -= dt;
        if (ai.timer <= 0) {
          this.boss.afterImages.splice(i, 1);
        }
      }
    }

    // Update drifting crimson spore particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Resets all entrance state and restores boss for battle
   */
  finish(boss = null) {
    const targetBoss = boss || this.boss;
    if (targetBoss) {
      const arena = state.arena || CONFIG.arena || { x: 20, y: 120, width: 500, height: 700 };
      const fallbackX = (typeof arena.x === 'number' && typeof arena.width === 'number')
        ? arena.x + arena.width * 0.5
        : 270;
      const fallbackY = (typeof arena.y === 'number' && typeof arena.height === 'number')
        ? arena.y + arena.height * 0.28
        : 280;

      targetBoss.x = (this._targetHoverX && this._targetHoverX > 100) ? this._targetHoverX : fallbackX;
      targetBoss.y = (this._targetHoverY && this._targetHoverY > 100) ? this._targetHoverY : fallbackY;
      targetBoss.z = 0;
      targetBoss.gunAngle = this._targetAimAngle || Math.PI * 0.5;
      targetBoss.angle = this._targetAimAngle || Math.PI * 0.5;
      targetBoss.afterImages = [];
      targetBoss.hideHands = true;
      targetBoss.hideGun = true;
    }
    this.isActive = false;
    this.boss = null;
    this.timer = 0;
    this.particles = [];
    this._hasPlayedRumbleSfx = false;
    this._hasPlayedScreechSfx = false;
    this._audioPlaying = false;
  }

  /**
   * Draws ground shadow / silhouette underneath boss (disabled per user request)
   */
  drawGround(ctx, fighter) {
    // Disabled silhouette effect per user request
    return;
  }

  /**
   * Draws foreground speed lines, pupil diamond specular flare, and atmospheric spores
   */
  drawForeground(ctx, fighter) {
    if (!this.isActive || !fighter || fighter !== this.boss) return;

    ctx.save();

    // 1. Manga Action Speed Lines during Parabolic Descent (Frames 30 to 75)
    this._drawSpeedLines(ctx, fighter);

    // 2. Drifting Crimson Atmospheric Spores
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.alpha <= 0.01) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      const s = p.size;
      ctx.fillRect(-s / 2, -s / 2, s, s);

      // Dark edge pixel for discrete depth
      ctx.fillStyle = '#4C0519';
      ctx.fillRect(-s / 2, s / 2 - 1, s, 1);

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draws 4-point filled needle polygons trailing behind the descending eye (Rule 2.5)
   */
  _drawSpeedLines(ctx, boss) {
    if (this.timer < 30 || this.timer >= 75) return;
    const progress = (this.timer - 30) / 45;
    const alpha = Math.sin(progress * Math.PI) * 0.90;
    if (alpha <= 0.01) return;

    const r = boss.r || 32;
    const aimAngle = boss.gunAngle || boss.angle || 0;
    const cosA = Math.cos(aimAngle);
    const sinA = Math.sin(aimAngle);
    const perpX = -sinA;
    const perpY = cosA;

    const palette = ['#E11D48', '#FB7185', '#FFFFFF', '#881337'];

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < this._cachedSpeedLines.length; i++) {
      const line = this._cachedSpeedLines[i];
      const lateral = (line.lane - 0.5) * (r * 2.5);
      const backOffset = r * 0.9 + line.backDist;
      const length = line.len * (0.85 + 0.35 * Math.sin(this.timer * 0.45 + i));

      // Trailing sharp tip
      const startX = boss.x - cosA * (backOffset + length) + perpX * lateral;
      const startY = boss.y - sinA * (backOffset + length) + perpY * lateral;

      // Leading sharp tip
      const endX = boss.x - cosA * backOffset + perpX * lateral;
      const endY = boss.y - sinA * backOffset + perpY * lateral;

      // Mid-body needle thickness (1.2px – 2.2px max)
      const midDist = length * 0.55;
      const midX = boss.x - cosA * (backOffset + midDist) + perpX * lateral;
      const midY = boss.y - sinA * (backOffset + midDist) + perpY * lateral;
      const halfThick = (line.thickness || 1.6) * 0.5;

      const topMidX = midX + perpX * halfThick;
      const topMidY = midY + perpY * halfThick;
      const botMidX = midX - perpX * halfThick;
      const botMidY = midY - perpY * halfThick;

      ctx.fillStyle = palette[line.colorIdx % palette.length];
      ctx.globalAlpha = alpha * line.baseAlpha;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(topMidX, topMidY);
      ctx.lineTo(endX, endY);
      ctx.lineTo(botMidX, botMidY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

export const EyeOfCthulhuEntrance = new EyeOfCthulhuEntranceClass();
