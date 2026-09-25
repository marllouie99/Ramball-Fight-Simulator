// ─────────────────────────────────────────────
// YUTA "THE BUSH CAMPER" BOSS ENTRANCE ANIMATION
// Features:
// 1. 6-Frame Pixel Bush Rustling Sprite Sheet animation
// 2. Dynamic leaf flutter & explosive burst particle system
// 3. Suspenseful katana/eye glint glowing through foliage
// 4. Parabolic airborne leap arc with pink cursed crescent blade slash
// 5. Ground landing impact & battle stance transition
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnSparks } from '../../graphics/particles/sparkEffect.js';

// Pre-computed exact frame bounding boxes (420x420) centered on each bush sprite
const BUSH_FRAME_RECTS = [
  { sx: 50, sy: 101, sw: 420, sh: 420 },    // Frame 0: Default compact
  { sx: 551, sy: 103, sw: 420, sh: 420 },   // Frame 1: Rustle left
  { sx: 1060, sy: 104, sw: 420, sh: 420 },  // Frame 2: Rustle right with loose leaves
  { sx: 62, sy: 540, sw: 420, sh: 420 },    // Frame 3: Rustle both sides
  { sx: 561, sy: 549, sw: 420, sh: 420 },   // Frame 4: Rustle top
  { sx: 1062, sy: 554, sw: 420, sh: 420 },  // Frame 5: Intense rustle shake
];

const LEAF_COLORS = ['#3B8226', '#225E16', '#84CC16', '#143D0F', '#4ADE80', '#15803D'];

let _bushSpriteImage = null;
let _bushSpriteLoading = false;

export function getBushSpriteSheet() {
  if (_bushSpriteImage && _bushSpriteImage.complete && _bushSpriteImage.naturalWidth > 0) {
    return _bushSpriteImage;
  }
  if (!_bushSpriteLoading && typeof Image !== 'undefined') {
    _bushSpriteLoading = true;
    const img = new Image();
    img.onload = () => {
      _bushSpriteImage = img;
      _bushSpriteLoading = false;
    };
    img.onerror = () => {
      _bushSpriteLoading = false;
    };
    img.src = encodeURI('Assets/model/Sprites/Bush- Rustling Pixel Bush Sprite Sheet.png');
    _bushSpriteImage = img;
  }
  return _bushSpriteImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getBushSpriteSheet();
}

class YutaBushEntranceClass {
  constructor() {
    this.isActive = false;
    this.boss = null;
    this.timer = 0;
    this.durationFrames = 150;
    this.particles = [];
    this.slashArcProgress = 0;
    this._hasPlayedRustleSfx = false;
    this._hasPlayedLeapSfx = false;
    this._hasPlayedLandSfx = false;
    this._hasPlayedVoiceline = false;
    this._voicelinePlaying = false;
    this._neutralAngle = 0;
    this._hasCompletedTurn = false;
  }

  /**
   * Starts Yuta's custom Bush Camper intro sequence
   */
  start(boss, durationFrames = 265) {
    this.isActive = true;
    this.boss = boss;
    this.timer = 0;
    this.durationFrames = durationFrames;
    this.particles = [];
    this.slashArcProgress = 0;
    this._hasPlayedRustleSfx = false;
    this._hasPlayedLeapSfx = false;
    this._hasPlayedLandSfx = false;
    this._hasPlayedVoiceline = false;
    this._voicelinePlaying = false;
    this._neutralAngle = 0;
    this._hasCompletedTurn = false;

    if (this.boss) {
      this.boss._hideInBush = true;
      this.boss.z = 0;
      this.boss.gunAngle = this._neutralAngle;
      this.boss.angle = this._neutralAngle;
      if (typeof this.boss.rightGunAngle !== 'undefined') this.boss.rightGunAngle = this._neutralAngle;
      if (typeof this.boss.leftGunAngle !== 'undefined') this.boss.leftGunAngle = this._neutralAngle;
    }
  }

  /**
   * Returns whether Yuta's entrance voiceline is currently playing
   */
  isVoicelinePlaying() {
    return Boolean(this.isActive && this._voicelinePlaying);
  }

  /**
   * Checks whether Yuta is currently concealed inside the bush
   */
  isHiding(fighter) {
    if (!this.isActive || !fighter || fighter !== this.boss) return false;
    return Boolean(fighter._hideInBush && this.timer < 65);
  }

  /**
   * Spawns a floating leaf particle
   */
  _spawnLeaf(x, y, vx, vy, isBurst = false) {
    const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
    const size = isBurst ? (2.5 + Math.random() * 3.5) : (2.0 + Math.random() * 2.5);
    this.particles.push({
      x,
      y,
      vx,
      vy,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      size,
      color,
      alpha: 1.0,
      life: isBurst ? Math.floor(40 + Math.random() * 35) : Math.floor(30 + Math.random() * 25),
      maxLife: isBurst ? 75 : 55
    });
  }

  /**
   * Explosive burst of pixel leaves when Yuta leaps out
   */
  _spawnLeafBurst(cx, cy, count = 28) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 2.5 + Math.random() * 6.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed * 0.7 - 2.5; // Slight upward bias
      this._spawnLeaf(cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20, vx, vy, true);
    }
  }

  /**
   * Per-frame logic update
   */
  update(dt = 1, entranceTimer = 0, totalDuration = 150) {
    if (!this.isActive || !this.boss) return;

    this.timer = entranceTimer;
    this.durationFrames = totalDuration;

    const bX = this.boss.x;
    const bY = this.boss.y;

    // ── Phase 1: Bush Rustling (Frames 0 to 65) ──
    if (this.timer < 65) {
      this.boss._hideInBush = true;
      this.boss.z = 0;
      this.boss.gunAngle = this._neutralAngle;
      this.boss.angle = this._neutralAngle;
      if (typeof this.boss.rightGunAngle !== 'undefined') this.boss.rightGunAngle = this._neutralAngle;
      if (typeof this.boss.leftGunAngle !== 'undefined') this.boss.leftGunAngle = this._neutralAngle;

      // Subtle ambient foliage rustles
      if (this.timer % 12 === 0 && this.timer > 8) {
        const leafAngle = Math.random() * Math.PI * 2;
        const leafDist = 15 + Math.random() * 20;
        const lx = bX + Math.cos(leafAngle) * leafDist;
        const ly = bY + Math.sin(leafAngle) * leafDist;
        const lvx = (Math.random() - 0.5) * 1.5;
        const lvy = -1.2 - Math.random() * 1.5;
        this._spawnLeaf(lx, ly, lvx, lvy, false);
      }

      // Rustling audio cue
      if (!this._hasPlayedRustleSfx && this.timer >= 12) {
        this._hasPlayedRustleSfx = true;
        audioSystem.playSFX('Assets/Sound Effects/Sprites SFX/walk-on-grass.mp3', 0.6, 1.0);
      }
    }
    // ── Phase 2: Leap Out of the Bush (Frames 65 to 90) ──
    else if (this.timer >= 65 && this.timer < 90) {
      this.boss._hideInBush = false;

      // Trigger leap event on initial frame 65
      if (!this._hasPlayedLeapSfx) {
        this._hasPlayedLeapSfx = true;
        this._spawnLeafBurst(bX, bY, 32);
        spawnSparks(bX, bY, 22, '#FF1493', 9);
        audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.95, 1.1);
        if (state.camera) {
          state.camera.shakeIntensity = 6.0;
        }

        // Set neutral angle on emerge — Yuta faces a default direction, NOT aimed at challengers yet
        this._neutralAngle = 0;
        this.boss.gunAngle = this._neutralAngle;
        this.boss.angle = this._neutralAngle;
        if (typeof this.boss.rightGunAngle !== 'undefined') this.boss.rightGunAngle = this._neutralAngle;
        if (typeof this.boss.leftGunAngle !== 'undefined') this.boss.leftGunAngle = this._neutralAngle;
      }

      // Keep angle locked to neutral during leap
      this.boss.gunAngle = this._neutralAngle;
      this.boss.angle = this._neutralAngle;

      // Trigger entrance voiceline right after Yuta leaps out from the bush
      const voicelineDelay = this.boss?.bossConfig?.entranceVoicelineDelay ?? 70;
      if (!this._hasPlayedVoiceline && this.timer >= voicelineDelay) {
        this._hasPlayedVoiceline = true;
        this._voicelinePlaying = true;
        const voicelineSrc = this.boss?.bossConfig?.entranceVoiceline || 'Assets/Sound Effects/Boss Voiceline SFX/yuta-boss-entrance-voiceline.mp3';
        const voicelineVol = this.boss?.bossConfig?.entranceVoicelineVolume ?? 1.0;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(voicelineSrc, voicelineVol, 1.0, 0, 0, () => {
            this._voicelinePlaying = false;
          });
        }
      }

      // Parabolic jump trajectory: 0 -> 1 -> 0
      const leapProgress = (this.timer - 65) / 25;
      const jumpZ = Math.sin(leapProgress * Math.PI) * 78;
      this.boss.z = jumpZ;
      this.slashArcProgress = leapProgress;
    }
    // ── Phase 3: Landing & Ready Stance (Frames 90 to end) ──
    else {
      this.boss._hideInBush = false;
      this.boss.z = 0;

      // Fallback check for voiceline if delay was set after landing
      const voicelineDelay = this.boss?.bossConfig?.entranceVoicelineDelay ?? 70;
      if (!this._hasPlayedVoiceline && this.timer >= voicelineDelay) {
        this._hasPlayedVoiceline = true;
        this._voicelinePlaying = true;
        const voicelineSrc = this.boss?.bossConfig?.entranceVoiceline || 'Assets/Sound Effects/Boss Voiceline SFX/yuta-boss-entrance-voiceline.mp3';
        const voicelineVol = this.boss?.bossConfig?.entranceVoicelineVolume ?? 1.0;
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(voicelineSrc, voicelineVol, 1.0, 0, 0, () => {
            this._voicelinePlaying = false;
          });
        }
      }

      if (!this._hasPlayedLandSfx) {
        this._hasPlayedLandSfx = true;
        spawnSparks(bX, bY, 18, '#FFFFFF', 6);
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash3.mp3', 0.7, 0.95);
        if (state.camera) {
          state.camera.shakeIntensity = 4.5;
        }
      }

      // Smooth body turn: Rotate from neutral angle toward the challengers over 40 frames
      if (!this._hasCompletedTurn) {
        const turnDuration = 40;
        const turnProgress = Math.min(1.0, (this.timer - 90) / turnDuration);
        // Smoothstep easing for natural deceleration
        const ease = turnProgress * turnProgress * (3 - 2 * turnProgress);

        // Calculate target angle toward challengers' midpoint
        let targetX = bX;
        let targetY = bY + 100; // fallback: face downward
        if (state.fighters) {
          const challengers = [];
          for (let i = 1; i < state.fighters.length; i++) {
            if (state.fighters[i] && state.fighters[i].hp > 0) {
              challengers.push(state.fighters[i]);
            }
          }
          if (challengers.length > 0) {
            targetX = challengers.reduce((s, c) => s + c.x, 0) / challengers.length;
            targetY = challengers.reduce((s, c) => s + c.y, 0) / challengers.length;
          }
        }
        const targetAngle = Math.atan2(targetY - bY, targetX - bX);

        // Shortest-path angle interpolation
        let diff = targetAngle - this._neutralAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const currentAngle = this._neutralAngle + diff * ease;

        // Rotate gunAngle to face challengers during entrance cutscene (body angle remains neutral)
        this.boss.gunAngle = currentAngle;
        this.boss.angle = this._neutralAngle;
        if (typeof this.boss.rightGunAngle !== 'undefined') this.boss.rightGunAngle = currentAngle;
        if (typeof this.boss.leftGunAngle !== 'undefined') this.boss.leftGunAngle = currentAngle;

        if (turnProgress >= 1.0) {
          this._hasCompletedTurn = true;
        }
      }
    }

    // Update floating leaf particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.09; // Gravity
      p.vx *= 0.96; // Air resistance
      p.rot += p.rotSpeed;
      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Resets all internal state and restores boss
   */
  finish(boss = null) {
    const targetBoss = boss || this.boss;
    if (targetBoss) {
      targetBoss._hideInBush = false;
      targetBoss.z = 0;
    }
    this.isActive = false;
    this.boss = null;
    this.timer = 0;
    this.particles = [];
    this._hasPlayedVoiceline = false;
    this._voicelinePlaying = false;
  }

  /**
   * Computes the current sprite sheet frame index based on entrance timing
   */
  _getCurrentFrameIndex() {
    if (this.timer < 30) {
      return Math.floor(this.timer / 6) % 6;
    } else if (this.timer < 50) {
      return Math.floor((this.timer - 30) / 4) % 6;
    } else if (this.timer < 65) {
      return Math.floor((this.timer - 50) / 3) % 6;
    } else {
      // After emerging, the bush rests in a settled parted state
      return 3;
    }
  }

  /**
   * Draws the ground-level bush underneath fighters
   */
  drawGround(ctx, fighter) {
    if (!this.isActive || !fighter || fighter !== this.boss) return;

    const img = getBushSpriteSheet();
    const isReady = Boolean(img && img.complete && img.naturalWidth > 0);

    const frameIdx = this._getCurrentFrameIndex();
    const rect = BUSH_FRAME_RECTS[frameIdx] || BUSH_FRAME_RECTS[0];

    const bX = fighter.x;
    const bY = fighter.y;
    const r = fighter.r || 25;
    const drawSize = r * 3.6; // Snugly conceals Yuta

    // Horizontal foliage jitter / wobble while rustling
    let shakeX = 0;
    let shakeY = 0;
    if (this.timer < 65) {
      const shakeIntensity = 1.0 + (this.timer / 65) * 4.5;
      shakeX = Math.sin(this.timer * 0.9) * shakeIntensity;
      shakeY = Math.cos(this.timer * 1.3) * (shakeIntensity * 0.4);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false; // Authentic discrete pixel art crispness

    if (isReady) {
      // Ground Shadow underneath the bush
      ctx.beginPath();
      ctx.ellipse(bX, bY + drawSize * 0.28, drawSize * 0.42, drawSize * 0.16, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 15, 20, 0.45)';
      ctx.fill();

      // Draw Bush Sprite
      ctx.drawImage(
        img,
        rect.sx, rect.sy, rect.sw, rect.sh,
        bX - drawSize / 2 + shakeX,
        bY - drawSize / 2 + shakeY,
        drawSize, drawSize
      );
    } else {
      // Procedural pixel-art foliage fallback while sprite sheet is loading
      this._drawProceduralBush(ctx, fighter, drawSize, shakeX, shakeY);
    }

    ctx.restore();
  }

  /**
   * Authentic procedural pixel-art foliage fallback to ensure zero blank frames
   */
  _drawProceduralBush(ctx, fighter, drawSize, shakeX, shakeY) {
    const bX = fighter.x + shakeX;
    const bY = fighter.y + shakeY;
    const r = drawSize * 0.38;

    // Ground shadow
    ctx.beginPath();
    ctx.ellipse(bX, bY + r * 0.65, r * 0.95, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 15, 20, 0.45)';
    ctx.fill();

    // Layered foliage lobes
    const lobes = [
      { ox: 0, oy: -r * 0.15, rad: r * 0.68, col: '#3B8226', notch: '#15803D' },
      { ox: -r * 0.36, oy: r * 0.05, rad: r * 0.56, col: '#2E6E1E', notch: '#143D0F' },
      { ox: r * 0.36, oy: r * 0.05, rad: r * 0.56, col: '#2E6E1E', notch: '#143D0F' },
      { ox: -r * 0.18, oy: r * 0.25, rad: r * 0.52, col: '#225E16', notch: '#0E280A' },
      { ox: r * 0.18, oy: r * 0.25, rad: r * 0.52, col: '#225E16', notch: '#0E280A' },
      { ox: 0, oy: -r * 0.38, rad: r * 0.42, col: '#84CC16', notch: '#3B8226' }
    ];

    for (const lobe of lobes) {
      const lx = bX + lobe.ox;
      const ly = bY + lobe.oy;

      ctx.beginPath();
      ctx.arc(lx, ly, lobe.rad, 0, Math.PI * 2);
      ctx.fillStyle = lobe.col;
      ctx.fill();

      ctx.strokeStyle = '#0E230A';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.fillStyle = lobe.notch;
      ctx.fillRect(lx - 4, ly - 4, 8, 4);
      ctx.fillRect(lx - 2, ly + 2, 4, 4);
    }
  }

  /**
   * Draws foreground elements (Suspense Glint, Leaping Katana Slash Arc, Floating Leaves)
   */
  drawForeground(ctx, fighter) {
    if (!this.isActive || !fighter || fighter !== this.boss) return;

    const bX = fighter.x;
    const bY = fighter.y;

    ctx.save();

    // 1. Suspenseful Katana / Eye Glint shining through the bush (Frames 45 to 65)
    if (this.timer >= 45 && this.timer < 65) {
      const glintProg = (this.timer - 45) / 20;
      const glintAlpha = Math.min(1.0, glintProg * 1.5);
      const glintScale = 0.5 + Math.sin(glintProg * Math.PI * 0.5) * 1.2;
      const gx = bX + 2;
      const gy = bY - 8;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.globalAlpha = glintAlpha;

      // Pink cursed energy ambient glow
      ctx.beginPath();
      ctx.arc(0, 0, 14 * glintScale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 20, 147, 0.35)';
      ctx.fill();

      // Sharp central twinkle core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5 * glintScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 2. Upward Crescent Katana Slash Arc during Leap (Frames 65 to 88)
    if (this.timer >= 65 && this.timer < 88) {
      const slashP = (this.timer - 65) / 23;
      const slashAlpha = Math.max(0, 1.0 - slashP * 0.9);
      const slashRadius = (fighter.r || 25) * (1.8 + slashP * 1.4);
      const startAngle = -Math.PI * 0.85;
      const endAngle = 0.15;

      ctx.save();
      ctx.translate(bX, bY - (fighter.z || 0));
      ctx.globalAlpha = slashAlpha;

      // Pink outer cursed slash
      ctx.beginPath();
      ctx.arc(0, 0, slashRadius, startAngle, endAngle);
      ctx.strokeStyle = '#FF1493';
      ctx.lineWidth = 5.0;
      ctx.lineCap = 'round';
      ctx.stroke();

      // White core slash
      ctx.beginPath();
      ctx.arc(0, 0, slashRadius, startAngle + 0.1, endAngle - 0.1);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.restore();
    }

    // 3. Floating & Bursting Pixel Leaf Particles
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.alpha <= 0.01) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      // Discrete pixel rhombus / leaf shape
      const s = p.size;
      ctx.fillRect(-s / 2, -s / 2, s, s);

      // Dark edge pixel for depth
      ctx.fillStyle = '#0E1E0A';
      ctx.fillRect(-s / 2, s / 2 - 1, s, 1);

      ctx.restore();
    }

    ctx.restore();
  }
}

export const YutaBushEntrance = new YutaBushEntranceClass();
