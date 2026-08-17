// ─────────────────────────────────────────────
// BLOOD EFFECT (PIXIJS WEBGL ACCELERATED)
// Small particle effect when fighters take damage
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { fastCleanArray } from './visualTrailSystem.js';
import { CONFIG } from '../../core/config.js';
import { bomberExplosionSystem } from './bomberExplosionVisuals.js';
import { burnEffectSystem } from './burnEffectVisuals.js';
import { ParticleSystem } from '../../systems/particles/ParticleSystem.js';

// Object pool for PixiJS Sprites to prevent GC thrashing
const bloodSpritePool = [];

// Helper to safely convert any color input (hex, RGBA, 32-bit int) into a valid 24-bit RGB numeric tint for PixiJS (0..0xFFFFFF)
function parseColorToHexNum(color) {
  if (typeof color === 'number') {
    return (color & 0xFFFFFF);
  }
  if (!color || typeof color !== 'string') return 0xe60000;

  let str = color.trim();
  if (str.startsWith('rgba') || str.startsWith('rgb')) {
    const parts = str.match(/[\d.]+/g);
    if (parts && parts.length >= 3) {
      const r = Math.max(0, Math.min(255, parseInt(parts[0]) || 0));
      const g = Math.max(0, Math.min(255, parseInt(parts[1]) || 0));
      const b = Math.max(0, Math.min(255, parseInt(parts[2]) || 0));
      return ((r << 16) + (g << 8) + b) & 0xFFFFFF;
    }
  }

  if (str.startsWith('#')) str = str.substring(1);
  else if (str.startsWith('0x')) str = str.substring(2);

  // If 8-character hex (#RRGGBBAA), drop the AA alpha suffix
  if (str.length === 8) {
    str = str.substring(0, 6);
  } else if (str.length === 3 || str.length === 4) {
    str = str[0] + str[0] + str[1] + str[1] + str[2] + str[2];
  }

  const parsed = parseInt(str, 16);
  if (!isNaN(parsed)) {
    return (parsed & 0xFFFFFF);
  }

  return 0xe60000;
}

function getBloodSprite() {
  if (bloodSpritePool.length > 0) {
    const s = bloodSpritePool.pop();
    s.visible = true;
    return s;
  }
  const s = new window.PIXI.Sprite(state.bloodSquareTexture);
  s.anchor.set(0.5); // Center origin
  state.pixiLayers.particles.addChild(s);
  return s;
}

function releaseBloodSprite(s) {
  if (!s) return;
  s.visible = false;
  bloodSpritePool.push(s);
}

/**
 * Spawns a blood effect at the fighter's position.
 */
export function spawnBloodEffect(fighter, amount = 10, damageAngle = null) {
  if (amount <= 0) return;
  if (!state.bloodEffects) state.bloodEffects = [];
  const isFFA = state && state.mode === GAME_MODES.FFA;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';
  const is1v2 = typeof state !== 'undefined' && state.mode && (state.mode === '1v2' || state.mode.includes('1v2'));

  const qualityMultiplier = state.qualityLevel || 1.0;
  let MAX_BLOOD_PARTICLES = Math.floor((is1v2 ? 30 : isFFA ? 30 : isMulti ? 60 : 100) * qualityMultiplier);

  const baseParticleCount = Math.max(2, Math.floor(amount / (is1v2 ? 6 : isFFA ? 6 : 3)));
  const particleCount = Math.max(1, Math.floor(baseParticleCount * qualityMultiplier));

  let color = fighter.color || '#e60000';
  if (color === '#ff4d4d' || color === '#ff4444') color = '#e60000';
  else if (color === '#4da3ff') color = '#0066ff';
  else if (color === '#ffd700') color = '#ff9900';
  else if (color === '#4dff4d') color = '#00cc00';

  const numericColor = parseColorToHexNum(color);

  for (let i = 0; i < particleCount; i++) {
    let angle = Math.random() * Math.PI * 2;
    const speed = 12 + Math.random() * 20;

    if (damageAngle !== null) {
      const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.6;
      angle = damageAngle + spreadAngle;
    }

    const size = 3 + Math.random() * 3;

    // Fast O(1) overwrite of random existing particle if over limit
    if (state.bloodEffects.length >= MAX_BLOOD_PARTICLES) {
       const overwriteIdx = Math.floor(Math.random() * state.bloodEffects.length);
       const old = state.bloodEffects[overwriteIdx];
       if (old && old.sprite) releaseBloodSprite(old.sprite);
       
       const sprite = getBloodSprite();
       sprite.tint = numericColor;
       sprite.width = size;
       sprite.height = size;
       
       state.bloodEffects[overwriteIdx] = {
         x: fighter.x + (Math.random() - 0.5) * fighter.r * 0.5,
         y: fighter.y + (Math.random() - 0.5) * fighter.r * 0.5,
         vx: Math.cos(angle) * speed,
         vy: Math.sin(angle) * speed,
         size: size,
         life: 1.0,           
         decay: 0.008 + Math.random() * 0.006, 
         airResistance: 0.94,
         friction: 0.90,
         sprite: sprite
       };
    } else {
       const sprite = getBloodSprite();
       sprite.tint = numericColor;
       sprite.width = size;
       sprite.height = size;

       state.bloodEffects.push({
         x: fighter.x + (Math.random() - 0.5) * fighter.r * 0.5,
         y: fighter.y + (Math.random() - 0.5) * fighter.r * 0.5,
         vx: Math.cos(angle) * speed,
         vy: Math.sin(angle) * speed,
         size: size,
         life: 1.0,           
         decay: 0.008 + Math.random() * 0.006, 
         airResistance: 0.94,
         friction: 0.90,
         sprite: sprite
       });
    }
  }
}

/**
 * Updates all blood effects.
 */
export function updateBloodEffects() {
  if (!state.bloodEffects) return;
  const arenaBottom = CONFIG.arena.y + CONFIG.arena.height;

  fastCleanArray(state.bloodEffects, (effect) => {
    effect.vx *= effect.airResistance;
    effect.vy *= effect.airResistance;
    effect.vy += 0.15;
    effect.x += effect.vx;
    effect.y += effect.vy;

    if (effect.y >= arenaBottom - effect.size / 2) {
      effect.y = arenaBottom - effect.size / 2;
      effect.vy *= -0.2;
      effect.vx *= effect.friction;
    }

    effect.life -= effect.decay;

    if (effect.life > 0) {
      // Sync to PixiJS Sprite
      effect.sprite.x = effect.x;
      effect.sprite.y = effect.y;
      effect.sprite.alpha = effect.life;
      effect.sprite.rotation = (effect.vx + effect.vy) * effect.life * 0.5;
      return true;
    } else {
      releaseBloodSprite(effect.sprite);
      return false;
    }
  });
}

/**
 * Deprecated: PixiJS automatically renders the sprites in the background scene graph.
 */
export function drawBloodEffects() {
  // Empty - kept so `renderSystem.js` doesn't crash before being updated
}

/**
 * Immediately clears ALL lingering battle visual effects so they vanish cleanly
 * when the champion-screen black overlay starts fading in (matchEndTimer === 60).
 * Properly releases PixiJS blood sprites back to the pool and clears every effect array.
 */
export function clearAllBattleEffects() {
  // 1. Release PixiJS blood sprites back to pool before clearing the array
  if (state.bloodEffects && state.bloodEffects.length > 0) {
    for (let i = 0; i < state.bloodEffects.length; i++) {
      const e = state.bloodEffects[i];
      if (e && e.sprite) releaseBloodSprite(e.sprite);
    }
    state.bloodEffects.length = 0;
  }

  // 2. Clear 2D-canvas & PixiJS-drawn effect arrays
  if (state.sparkEffects && state.sparkEffects.length > 0) {
    // Safely return all spark particles & their PixiJS Sprites to object pools
    for (let i = 0; i < state.sparkEffects.length; i++) {
      const e = state.sparkEffects[i];
      if (e) {
        ParticleSystem.returnParticle(e);
      }
    }
    state.sparkEffects.length = 0;
  }
  if (state.deathEffects) state.deathEffects.length = 0;
  if (state.doppelgangerDeathEffects) state.doppelgangerDeathEffects.length = 0;
  if (state.illusionDeathEffects) state.illusionDeathEffects.length = 0;
  if (state.illusionSpawnEffects) state.illusionSpawnEffects.length = 0;
  if (state.berserkerRageEffects) state.berserkerRageEffects.length = 0;
  if (state.floatingTexts) state.floatingTexts.length = 0;
  if (state.thermobaricExplosions) state.thermobaricExplosions.length = 0;

  // Clear WebGL particles
  bomberExplosionSystem.clear();
  burnEffectSystem.clear();

  // 3. Clear per-fighter attached visual effects (hitFlameWisps, afterImages, punchEffects, trails)
  if (state.fighters) {
    for (const f of state.fighters) {
      if (!f) continue;
      if (f.hitFlameWisps) f.hitFlameWisps.length = 0;
      if (f.afterImages) f.afterImages.length = 0;
      if (f.stealthAfterimages) f.stealthAfterimages.length = 0;
      if (f.adaptationAfterimages) f.adaptationAfterimages.length = 0;
      if (f.swordTrail) f.swordTrail.length = 0;
      if (f.punchEffects) f.punchEffects.length = 0;
      if (f.slashHitVisuals) f.slashHitVisuals.length = 0;
      if (f.flurrySlashVisuals) f.flurrySlashVisuals.length = 0;
    }
  }
}