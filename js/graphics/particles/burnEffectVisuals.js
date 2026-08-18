// js/graphics/particles/burnEffectVisuals.js
import { state } from '../../core/state.js';

// Object pool for PixiJS Sprites to eliminate VRAM allocations and GC thrashing
const pixiSpritePool = [];
function getPixiSprite() {
  if (pixiSpritePool.length > 0) {
    const s = pixiSpritePool.pop();
    s.visible = true;
    return s;
  }
  if (!state.baseCircleTexture || !state.pixiLayers || !state.pixiLayers.particles) return null;
  const s = new window.PIXI.Sprite(state.baseCircleTexture);
  s.anchor.set(0.5);
  state.pixiLayers.particles.addChild(s);
  return s;
}

function releasePixiSprite(s) {
  if (!s) return;
  s.visible = false;
  pixiSpritePool.push(s);
}

class BurnParticle {
  constructor(x, y, type, size) {
    this.x = x;
    this.y = y;
    this.type = type; // 'fire' | 'spark' | 'smoke'
    this.size = size;
    this.life = 1.0;
    this.maxLife = 1.0;
    this.vx = (Math.random() - 0.5) * 20;
    this.vy = -30 - Math.random() * 40; // upward bias
    this.gravity = -20; // gentle upward lift
    this.friction = 0.96;
    this.color = '';
    this.history = [];
    this.sprite = null;
  }
}

class BurnEffectSystem {
  constructor() {
    this.particles = [];
    this._pool = [];
    this._POOL_SIZE = 200;
    // Pre-allocate pool
    for (let i = 0; i < this._POOL_SIZE; i++) {
      this._pool.push(new BurnParticle(0, 0, 'fire', 1));
    }
  }

  _getParticle(x, y, type, size) {
    let p;
    if (this._pool.length > 0) {
      p = this._pool.pop();
    } else {
      p = new BurnParticle(x, y, type, size);
    }
    p.x = x;
    p.y = y;
    p.type = type;
    p.size = size;
    p.life = 1.0;
    p.maxLife = 1.0;
    p.vx = (Math.random() - 0.5) * 20;
    p.vy = -30 - Math.random() * 40;
    p.gravity = -20;
    p.friction = 0.96;
    p.color = '';
    p.history = [];
    
    // Acquire a WebGL sprite for GPU rendering
    p.sprite = getPixiSprite();
    if (p.sprite) {
      p.sprite.width = size * 2.5;
      p.sprite.height = size * 2.5;
      p.sprite.x = x;
      p.sprite.y = y;
      p.sprite.alpha = 1.0;
      p.sprite.rotation = Math.random() * Math.PI * 2;
      
      // Select appropriate blending and colors based on particle type
      if (type === 'fire') {
        p.sprite.tint = 0xFF6600; // Orange core
        p.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
      } else if (type === 'spark') {
        p.sprite.tint = 0xFFDD44; // Gold sparks
        p.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
      } else { // smoke
        p.sprite.tint = 0x302A38; // Dark purple-grey ash
        p.sprite.blendMode = window.PIXI.BLEND_MODES.NORMAL;
      }
    }
    return p;
  }

  _returnParticle(p) {
    if (p.sprite) {
      releasePixiSprite(p.sprite);
      p.sprite = null;
    }
    if (this._pool.length < this._POOL_SIZE) {
      this._pool.push(p);
    }
  }

  // Clear particles when round ends or resets
  clear() {
    for (const p of this.particles) {
      this._returnParticle(p);
    }
    this.particles = [];
  }

  /**
   * Spawns particles on an active burning fighter.
   * Call this every frame inside the update loop for fighters with burnTimer > 0.
   */
  spawnBurnParticles(fighter) {
    const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
    
    // OPTIMIZED: More aggressive limits for multi-fighter battles
    const maxBurn = isMulti ? 40 : 200;
    const fpsBasedLimit = state.performanceMode ? 25 : maxBurn;
    if (this.particles.length > fpsBasedLimit) return;
    
    const r = fighter.r;
    const fireChance = state.performanceMode ? 0.2 : 0.4;
    const sparkChance = state.performanceMode ? 0.1 : 0.2;
    const smokeChance = state.performanceMode ? 0.08 : 0.15;

    // Determine directional flow vector based on channeling angle or movement
    let flowVx = 0;
    let flowVy = -12; // gentle soft upward drift when stationary
    let gravity = -6;

    if (fighter.isChannelingDivineFlame) {
      // Flow backward along arrow axis (opposite gunAngle)
      const rearAngle = (fighter.gunAngle || 0) + Math.PI;
      const speed = 25 + Math.random() * 25;
      flowVx = Math.cos(rearAngle) * speed;
      flowVy = Math.sin(rearAngle) * speed;
      gravity = 0;
    } else if (Math.hypot(fighter.vx || 0, fighter.vy || 0) > 0.5) {
      // Flow backward relative to movement direction
      flowVx = -(fighter.vx || 0) * 1.2;
      flowVy = -(fighter.vy || 0) * 1.2;
      gravity = -4;
    }
    
    // 1. Fire particles (dense center flame)
    if (Math.random() < fireChance) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * r * 0.6;
      const px = fighter.x + Math.cos(angle) * dist;
      const py = fighter.y + Math.sin(angle) * dist;
      
      const p = this._getParticle(px, py, 'fire', 1.5 + Math.random() * 2.0);
      p.maxLife = 0.30 + Math.random() * 0.20;
      p.life = p.maxLife;
      p.vx = flowVx + (Math.random() - 0.5) * 8;
      p.vy = flowVy + (Math.random() - 0.5) * 8;
      p.gravity = gravity;
      this.particles.push(p);
    }

    // 2. Ember Sparks (crackles)
    if (Math.random() < sparkChance) {
      const angle = Math.random() * Math.PI * 2;
      const px = fighter.x + Math.cos(angle) * r * 0.8;
      const py = fighter.y + Math.sin(angle) * r * 0.8;
      
      const p = this._getParticle(px, py, 'spark', 1.0 + Math.random() * 1.0);
      p.maxLife = 0.15 + Math.random() * 0.15;
      p.life = p.maxLife;
      const sparkAngle = fighter.isChannelingDivineFlame 
          ? ((fighter.gunAngle || 0) + Math.PI + (Math.random() - 0.5) * 0.8)
          : Math.hypot(fighter.vx || 0, fighter.vy || 0) > 0.5
            ? (Math.atan2(-(fighter.vy || 0), -(fighter.vx || 0)) + (Math.random() - 0.5) * 0.8)
            : (-Math.PI / 2 + (Math.random() - 0.5) * 1.5);
      const speed = 25 + Math.random() * 25;
      p.vx = Math.cos(sparkAngle) * speed;
      p.vy = Math.sin(sparkAngle) * speed;
      p.gravity = gravity;
      this.particles.push(p);
    }

    // 3. Smoke (rising ash)
    if (Math.random() < smokeChance) {
      const px = fighter.x + (Math.random() - 0.5) * r * 0.5;
      const py = fighter.y - r * 0.3;
      
      const p = this._getParticle(px, py, 'smoke', 2.0 + Math.random() * 2.5);
      p.maxLife = 0.5 + Math.random() * 0.3;
      p.life = p.maxLife;
      p.vx = flowVx * 0.5 + (Math.random() - 0.5) * 6;
      p.vy = flowVy * 0.5 + (Math.random() - 0.5) * 6 - 8;
      p.gravity = -8;
      p.friction = 0.98;
      this.particles.push(p);
    }
  }

  update(dt) {
    const fpsScale = dt * 60;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        // Swap-and-pop: O(1) removal + return to pool
        const last = this.particles.pop();
        if (i < this.particles.length) {
          this.particles[i] = last;
        }
        this._returnParticle(p);
        continue;
      }

      // Physics integration
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(p.friction, fpsScale);
      p.vy *= Math.pow(p.friction, fpsScale);
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Type behaviors
      if (p.type === 'fire') {
        p.size = Math.max(0.1, p.size - 3 * dt); // shrink
      } else if (p.type === 'smoke') {
        p.size += 4 * dt; // expand
      } else if (p.type === 'spark') {
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 3) p.history.shift();
      }

      // Update PixiJS Sprite in WebGL coordinates (GPU renders it)
      if (p.sprite) {
        p.sprite.x = p.x;
        p.sprite.y = p.y;
        
        const progress = p.life / p.maxLife;
        if (p.type === 'fire') {
          // Fire scales dynamically: grows slightly, then fades out in colors
          const size = p.size * (1.1 + (1 - progress) * 0.4);
          p.sprite.width = size * 1.5;
          p.sprite.height = size * 1.5;
          p.sprite.alpha = progress * 0.75;
          if (progress > 0.6) {
            p.sprite.tint = 0xFFF2A3; // bright white/yellow core
          } else if (progress > 0.35) {
            p.sprite.tint = 0xFF8800; // hot orange
          } else {
            p.sprite.tint = 0xBB2200; // cooling red
          }
        } else if (p.type === 'spark') {
          p.sprite.width = p.size * 1.2;
          p.sprite.height = p.size * 1.2;
          p.sprite.alpha = progress;
          p.sprite.tint = progress > 0.55 ? 0xFFEE44 : 0xFF4400;
        } else if (p.type === 'smoke') {
          p.sprite.width = p.size * 1.4;
          p.sprite.height = p.size * 1.4;
          p.sprite.alpha = Math.sin(progress * Math.PI) * 0.12; // very faint translucent ash
        }
      }
    }
  }

  draw(ctx) {
    // Deprecated: PixiJS automatically renders the sprites in the background scene graph.
  }
}

export const burnEffectSystem = new BurnEffectSystem();
