// ─────────────────────────────────────────────
// TOMBSTONE & ASCENDING GHOST SOUL DEATH EFFECT
// Satisfying elastic pop gravestone & ascending ethereal spirit soul on fighter death
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { isArenaDecorationsEnabled } from '../../systems/arenaDecorationSystem.js';
import { audioSystem } from '../../systems/audioSystem.js';

let _tombstoneImage = null;
let _ghostImage = null;

/**
 * Returns the cached or freshly initialized Image object for the gravestone/tombstone.
 * @returns {HTMLImageElement|null}
 */
export function getTombstoneImage() {
  if (typeof Image === 'undefined') return null;
  if (!_tombstoneImage) {
    _tombstoneImage = new Image();
    _tombstoneImage.src = 'Assets/Overlays/Arena Decoration/thumbstone.png';
    _tombstoneImage.onerror = () => {
      if (_tombstoneImage && _tombstoneImage.src.endsWith('.png')) {
        _tombstoneImage.src = 'Assets/Overlays/Arena Decoration/thumbstone.jpg';
      }
    };
  }
  return _tombstoneImage;
}

/**
 * Returns the cached or freshly initialized Image object for the ascending ghost soul.
 * @returns {HTMLImageElement|null}
 */
export function getGhostImage() {
  if (typeof Image === 'undefined') return null;
  if (!_ghostImage) {
    _ghostImage = new Image();
    _ghostImage.src = 'Assets/Overlays/Arena Decoration/Ghost.png';
    _ghostImage.onerror = () => {
      if (_ghostImage && _ghostImage.src.endsWith('.png')) {
        _ghostImage.src = 'Assets/Overlays/Arena Decoration/Ghost.jpg';
      }
    };
  }
  return _ghostImage;
}

// Proactive eager preloading in browser environment
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  getTombstoneImage();
  getGhostImage();
}

/**
 * Checks whether the gravestone death effect is enabled.
 * Defaults to true when arena decorations are active, or can be explicitly configured.
 * @returns {boolean}
 */
export function isGravestoneDeathEnabled() {
  if (typeof CONFIG !== 'undefined' && CONFIG.arenaDecorations?.enableGravestoneDeath !== undefined) {
    if (!CONFIG.arenaDecorations.enableGravestoneDeath) return false;
  }
  return isArenaDecorationsEnabled();
}

/**
 * Spawns a satisfying pop gravestone and ascending ghost soul where a fighter died.
 * @param {Object} fighter - The defeated fighter entity
 */
export function spawnTombstoneDeath(fighter) {
  if (!fighter || !isGravestoneDeathEnabled()) return;
  // Ignore turrets, dispensers, minions or illusions
  if (fighter.isTurret || fighter.isDispenser || fighter.isServantOfCthulhu || fighter.isMinion || fighter.isIllusion) return;
  if (fighter._tombstoneSpawned) return;
  fighter._tombstoneSpawned = true;

  if (!state.tombstoneDeathEffects) {
    state.tombstoneDeathEffects = [];
  }

  // Cap max active tombstones to prevent excessive memory overhead
  if (state.tombstoneDeathEffects.length >= 12) {
    state.tombstoneDeathEffects.shift();
  }

  const r = fighter.r || 25;
  // Center the gravestone strictly on the center body of the dead player
  const x = fighter.x;
  const y = fighter.y;

  const tombstone = {
    x,
    y,
    baseW: 42,
    baseH: 54,
    age: 0,
    popDuration: 20,
    scaleX: 0,
    scaleY: 0,
    jumpY: 0,
    sinkY: 0,
    alpha: 1.0,
    debris: [],
    ghost: {
      active: false,
      spawnDelay: 12, // Emerge at frame 12 (apex of tombstone pop)
      age: 0,
      x: x,
      y: y,
      targetW: 32,
      targetH: 29,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      vy: -1.75,
      swayPhase: Math.random() * Math.PI * 2,
      trailParticles: [],
      maxLife: 135,
    },
  };

  // Spawn 9 burst particles of dirt/grass/stone kickup on impact around the body center
  for (let i = 0; i < 9; i++) {
    const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.7;
    const speed = 2.0 + Math.random() * 3.8;
    tombstone.debris.push({
      x: x + (Math.random() - 0.5) * 18,
      y: y + 14 + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      size: 1.6 + Math.random() * 2.0,
      color: (i % 3 === 0) ? '#4D7C0F' : ((i % 2 === 0) ? '#374151' : '#1F2937'),
      life: 1.0,
      decay: 0.032 + Math.random() * 0.02,
    });
  }

  state.tombstoneDeathEffects.push(tombstone);

  // Play punchy earth planting/ground impact sound
  try {
    if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
      audioSystem.playSFX('crazydave_planting', 0.55);
    }
  } catch (_) {}
}

/**
 * Updates all active tombstone pops, debris, and ascending ghost souls.
 */
export function updateTombstoneDeathEffects() {
  if (!state.tombstoneDeathEffects || state.tombstoneDeathEffects.length === 0) return;

  for (let i = state.tombstoneDeathEffects.length - 1; i >= 0; i--) {
    const t = state.tombstoneDeathEffects[i];
    t.age++;

    // ── 1. Tombstone Pop Squash-and-Stretch Kinematics ──
    if (t.age <= 5) {
      // Stage 1: Explosive upward pop out of the ground (stretch vertically)
      const p = t.age / 5;
      t.jumpY = -Math.sin(p * Math.PI * 0.5) * 14;
      t.scaleY = 0.2 + p * 1.10; // 0.2 -> 1.30 (tall stretch)
      t.scaleX = 0.2 + p * 0.55; // 0.2 -> 0.75 (narrow squash)
    } else if (t.age <= 10) {
      // Stage 2: Heavy ground contact slam (squash down onto turf)
      const p = (t.age - 5) / 5;
      t.jumpY = -14 * (1 - p) + 1.5 * p;
      t.scaleY = 1.30 - p * 0.48; // 1.30 -> 0.82 (wide squash)
      t.scaleX = 0.75 + p * 0.47; // 0.75 -> 1.22
    } else if (t.age <= 18) {
      // Stage 3: Damped elastic rebound settling to rest
      const p = (t.age - 10) / 8;
      const rebound = Math.sin(p * Math.PI) * Math.exp(-p * 2.2);
      t.jumpY = -rebound * 3.0;
      t.scaleY = 1.0 - rebound * 0.18;
      t.scaleX = 1.0 + rebound * 0.16;
    } else {
      // Stage 4: Solid stationary anchor
      t.jumpY = 0;
      t.scaleX = 1.0;
      t.scaleY = 1.0;
    }

    // ── 2. Ground Debris Physics ──
    for (let d = t.debris.length - 1; d >= 0; d--) {
      const p = t.debris[d];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.26; // Gravity
      p.vx *= 0.93; // Air friction
      p.life -= p.decay;
      if (p.life <= 0) {
        t.debris.splice(d, 1);
      }
    }

    // ── 3. Tombstone Persistence & Ground Sink Fade ──
    if (t.age > 300) {
      const fadeP = (t.age - 300) / 35;
      t.sinkY = fadeP * 7;
      t.alpha = Math.max(0, 1 - fadeP);
    }

    // ── 4. Ascending Ghost Soul Kinematics ──
    const g = t.ghost;
    if (t.age >= g.spawnDelay && !g.active) {
      g.active = true;
      try {
        if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
          audioSystem.playSFX('effect_flare', 0.32);
        }
      } catch (_) {}
    }

    if (g.active) {
      g.age++;

      if (g.age <= 16) {
        // Ghost emergence: bloomed ethereal expansion from tombstone crown
        const p = g.age / 16;
        g.scaleX = p * 1.15;
        g.scaleY = p * 1.15;
        g.alpha = Math.min(0.92, p * 1.15);
        g.y += g.vy;
      } else {
        // Floating soul ascension with ethereal sway & pulse
        g.y += g.vy;
        g.vy *= 0.996; // Gentle weightless drift

        const sway = Math.sin((g.age + g.swayPhase) * 0.08) * 8.5;
        const breathingY = 1.0 + Math.sin(g.age * 0.12) * 0.08;
        const breathingX = 1.0 - Math.sin(g.age * 0.12) * 0.06;

        g.currentSway = sway;
        g.scaleX = breathingX;
        g.scaleY = breathingY;

        // Trailing spiritual soul motes
        if (g.age % 4 === 0 && g.age < 110) {
          g.trailParticles.push({
            x: g.x + sway + (Math.random() - 0.5) * 8,
            y: g.y + 11,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 0.35 + Math.random() * 0.45,
            size: 1.8 + Math.random() * 1.2,
            life: 1.0,
            decay: 0.038,
            color: (Math.random() < 0.5) ? '#BAE6FD' : '#E0F2FE',
          });
        }

        // Dissipation into the heavens
        if (g.age > 85) {
          const dissolveP = (g.age - 85) / 50;
          g.alpha = Math.max(0, 0.92 * (1 - dissolveP));
          g.scaleX *= (1 + dissolveP * 0.35);
          g.scaleY *= (1 + dissolveP * 0.35);
        }
      }

      // Update soul trail motes
      for (let m = g.trailParticles.length - 1; m >= 0; m--) {
        const mote = g.trailParticles[m];
        mote.x += mote.vx;
        mote.y += mote.vy;
        mote.life -= mote.decay;
        if (mote.life <= 0) {
          g.trailParticles.splice(m, 1);
        }
      }
    }

    // ── 5. Cleanup when completely finished ──
    const tombstoneDone = t.alpha <= 0;
    const ghostDone = !g.active || (g.age >= g.maxLife && g.trailParticles.length === 0);
    if (tombstoneDone && ghostDone) {
      state.tombstoneDeathEffects.splice(i, 1);
    }
  }
}

/**
 * Renders all active tombstones, ground contact shadows, and ascending ghosts.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawTombstoneDeathEffects(ctx) {
  if (!ctx || !state.tombstoneDeathEffects || state.tombstoneDeathEffects.length === 0) return;

  const tombImg = getTombstoneImage();
  const ghostImg = getGhostImage();

  for (const t of state.tombstoneDeathEffects) {
    if (t.alpha <= 0.001) continue;

    // ── 1. Ground Contact Shadow Ellipse ──
    ctx.save();
    ctx.translate(t.x, t.y + t.baseH * 0.44);
    ctx.scale(Math.max(0.1, t.scaleX), 1.0);
    ctx.fillStyle = `rgba(5, 6, 9, ${0.42 * t.alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, t.baseW * 0.46, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 2. Ground Dirt Debris Kick ──
    if (t.debris && t.debris.length > 0) {
      for (const d of t.debris) {
        if (d.life <= 0) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1.0, d.life * t.alpha));
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
        ctx.restore();
      }
    }

    // ── 3. Gravestone Pop Body ──
    if (tombImg && tombImg.complete && tombImg.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false; // Authentic crisp pixel art!
      ctx.globalAlpha = Math.max(0, Math.min(1.0, t.alpha));
      ctx.translate(t.x, t.y + t.jumpY + t.sinkY);
      ctx.scale(t.scaleX, t.scaleY);
      // Centered directly on dead player's body center (t.x, t.y)
      ctx.drawImage(tombImg, -t.baseW / 2, -t.baseH / 2, t.baseW, t.baseH);
      ctx.restore();
    }

    // ── 4. Ascending Ghost Soul ──
    const g = t.ghost;
    if (g && g.active && g.alpha > 0.001) {
      const sway = g.currentSway || 0;
      const tilt = Math.sin((g.age + g.swayPhase) * 0.08) * 0.14;

      // Soul Trail Motes
      if (g.trailParticles && g.trailParticles.length > 0) {
        for (const mote of g.trailParticles) {
          if (mote.life <= 0) continue;
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1.0, mote.life * g.alpha));
          ctx.fillStyle = mote.color;
          ctx.fillRect(mote.x - mote.size / 2, mote.y - mote.size / 2, mote.size, mote.size);
          ctx.restore();
        }
      }

      // Ethereal Aura Glow Disc behind the ghost
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1.0, g.alpha * 0.38));
      const auraGrad = ctx.createRadialGradient(
        g.x + sway, g.y, 2,
        g.x + sway, g.y, g.targetW * 0.85
      );
      auraGrad.addColorStop(0, 'rgba(224, 242, 254, 0.6)');
      auraGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.3)');
      auraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(g.x + sway, g.y, g.targetW * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ghost Pixel Sprite
      if (ghostImg && ghostImg.complete && ghostImg.naturalWidth > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = Math.max(0, Math.min(1.0, g.alpha));
        ctx.translate(g.x + sway, g.y);
        ctx.rotate(tilt);
        ctx.scale(g.scaleX, g.scaleY);
        ctx.drawImage(ghostImg, -g.targetW / 2, -g.targetH / 2, g.targetW, g.targetH);
        ctx.restore();
      }
    }
  }
}

/**
 * Clears all active tombstone death effects.
 * Called on match restart or round reset.
 */
export function clearTombstoneDeathEffects() {
  if (state.tombstoneDeathEffects) {
    state.tombstoneDeathEffects.length = 0;
  }
}
