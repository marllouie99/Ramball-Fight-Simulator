// ─────────────────────────────────────────────
// BLOOD EFFECT (PIXIJS WEBGL ACCELERATED)
// Small particle effect when fighters take damage
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { fastCleanArray } from './visualTrailSystem.js';
import { CONFIG } from '../../core/config.js';

// Object pool for PixiJS Sprites to prevent GC thrashing
const bloodSpritePool = [];

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
  if (!state.bloodEffects) state.bloodEffects = [];
  const isFFA = state && state.mode === GAME_MODES.FFA;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';

  const qualityMultiplier = state.qualityLevel || 1.0;
  let MAX_BLOOD_PARTICLES = Math.floor((isFFA ? 30 : isMulti ? 60 : 100) * qualityMultiplier);

  const baseParticleCount = Math.max(2, Math.floor(amount / (isFFA ? 6 : 3)));
  const particleCount = Math.max(1, Math.floor(baseParticleCount * qualityMultiplier));

  let color = fighter.color || '#e60000';
  if (color === '#ff4d4d' || color === '#ff4444') color = '#e60000';
  else if (color === '#4da3ff') color = '#0066ff';
  else if (color === '#ffd700') color = '#ff9900';
  else if (color === '#4dff4d') color = '#00cc00';

  const numericColor = parseInt(color.replace('#', '0x'), 16);

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