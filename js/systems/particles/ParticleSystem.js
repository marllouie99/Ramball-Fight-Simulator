import { state } from '../../core/state.js';
import { ParticleRegistry } from './ParticleRegistry.js';

// Object Pool to eliminate GC thrashing
const SPARK_POOL_SIZE = 300;
const sparkPool = [];
const pixiSpritePool = []; // Pool for PixiJS Sprites

for (let i = 0; i < SPARK_POOL_SIZE; i++) {
  sparkPool.push({});
}

export class ParticleSystem {
  static getParticle() {
    if (sparkPool.length > 0) {
      return sparkPool.pop();
    }
    return {};
  }

  static getPixiSprite() {
    if (pixiSpritePool.length > 0) {
      const s = pixiSpritePool.pop();
      s.visible = true;
      return s;
    }
    if (!state.baseCircleTexture || !state.pixiLayers || !state.pixiLayers.particles) return null;
    const s = new window.PIXI.Sprite(state.baseCircleTexture);
    s.anchor.set(0.5);
    // Additive blending for standard sparks so they glow intensely
    s.blendMode = window.PIXI.BLEND_MODES.ADD;
    state.pixiLayers.particles.addChild(s);
    return s;
  }

  static returnParticle(spark) {
    if (spark.sprite) {
      spark.sprite.visible = false;
      pixiSpritePool.push(spark.sprite);
      spark.sprite = null;
    }
    // Reset properties to keep engine's hidden class optimized
    spark.x = 0;
    spark.y = 0;
    spark.vx = 0;
    spark.vy = 0;
    spark.size = 0;
    spark.life = 0;
    spark.decay = 0;
    spark.friction = 0;
    spark.type = null;
    spark.color = null;
    spark.isFlash = false;
    spark.isGlow = false;
    spark.rotation = 0;
    spark.rotationSpeed = 0;
    spark.cx = 0;
    spark.cy = 0;
    spark.orbitRadius = 0;
    spark.orbitAngle = 0;
    spark.orbitSpeed = 0;
    spark.isOrbit = false;
    spark.isPixi = false; // Flag to skip 2D canvas drawing
    sparkPool.push(spark);
  }

  static clearAll() {
    if (typeof state !== 'undefined') {
      if (state.sparkEffects) {
        for (const spark of state.sparkEffects) {
          if (spark) this.returnParticle(spark);
        }
      }
      if (state.bloodEffects) {
        for (const blood of state.bloodEffects) {
          if (blood) this.returnParticle(blood);
        }
      }
    }
  }

  static getDynamicQuality(isDomainClash) {
    return state.qualityLevel || 1.0;
  }

  static isStandOffMode() {
    return Boolean(
      typeof state !== 'undefined' && state.mode && (
        state.mode === 'Stand Off' ||
        state.mode === '1v2 Stand Off' ||
        state.mode === 'StandOff' ||
        (typeof state.mode === 'string' && state.mode.toLowerCase().includes('stand off'))
      )
    );
  }

  static spawn(x, y, count = 8, type = 'crimson', overrideProps = {}) {
    if (!state.sparkEffects) state.sparkEffects = [];

    const isStandOff = this.isStandOffMode();
    const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
    const is1v2 = typeof state !== 'undefined' && state.mode && (state.mode === '1v2' || state.mode.includes('1v2'));
    const isDomainClash = state && state.fighters && (state.fighters.filter(f => f && f.domainActive).length > 1);
    
    const dynamicQuality = this.getDynamicQuality(isDomainClash);
    // Stand Off mode has high-frequency clashes across 2000-2500 HP: limit max active particles to prevent FPS drop
    const MAX_PARTICLES = isDomainClash ? 25 : isStandOff ? 40 : is1v2 ? 45 : Math.floor((isMulti ? 80 : 160) * dynamicQuality);
    const countScale = isDomainClash ? 0.30 : isStandOff ? 0.35 : is1v2 ? 0.45 : isMulti ? 0.60 : 1.0;
    const adjustedCount = Math.max(1, Math.floor(count * countScale * dynamicQuality));

    const generator = ParticleRegistry[type] || ParticleRegistry['default'];

    for (let i = 0; i < adjustedCount; i++) {
      let insertIdx = -1;
      if (state.sparkEffects.length >= MAX_PARTICLES) {
        // Fast O(1) overwrite instead of O(N) shift
        insertIdx = Math.floor(Math.random() * state.sparkEffects.length);
        const oldest = state.sparkEffects[insertIdx];
        if (oldest) this.returnParticle(oldest);
      }

      const config = generator();
      const spark = this.getParticle();
      
      const angle = Math.random() * Math.PI * 2;
      const speed = config.speed !== undefined ? config.speed : 0;
      
      spark.x = x;
      spark.y = y;
      
      if (config.isOrbit) {
        spark.cx = x;
        spark.cy = y;
        spark.orbitRadius = config.orbitRadius || (30 + Math.random() * 65);
        spark.orbitAngle = angle;
        spark.orbitSpeed = config.orbitSpeed !== undefined ? config.orbitSpeed : ((0.05 + Math.random() * 0.05) * (Math.random() > 0.5 ? 1 : -1));
        spark.x = x + Math.cos(angle) * spark.orbitRadius;
        spark.y = y + Math.sin(angle) * (spark.orbitRadius * 0.55);
        spark.vx = 0;
        spark.vy = 0;
      } else {
        // Use predefined vx/vy if config provides it, otherwise calculate from angle and speed
        spark.vx = config.vx !== undefined ? config.vx : Math.cos(angle) * speed;
        spark.vy = config.vy !== undefined ? config.vy : Math.sin(angle) * speed;
      }
      
      spark.size = config.size !== undefined ? config.size : 2;
      spark.life = config.life !== undefined ? config.life : 1.0;
      spark.decay = isStandOff ? Math.max(config.decay || 0.02, 0.035 + Math.random() * 0.02) : (config.decay !== undefined ? config.decay : 0.02);
      spark.friction = config.friction !== undefined ? config.friction : 0.95;
      spark.type = config.type || type;
      spark.color = config.color || '#ff0000';
      spark.isFlash = config.isFlash || false;
      spark.isGlow = config.isGlow || false;
      spark.rotation = config.rotation || 0;
      spark.rotationSpeed = config.rotationSpeed || 0;
      spark.isOrbit = config.isOrbit || false;

      // --- PIXIJS SYNC ---
      // We only convert standard sparks to PixiJS Sprites.
      // Complex procedural shapes (like scorch marks) remain on the 2D canvas.
      const isStandardSpark = !spark.isFlash && !spark.isPinkCore && !['thunderSpark', 'groundScorch', 'arcaneGroundScorch', 'telekinesisDebris', 'parrySpark', 'slashRicochet', 'parryEmberStar', 'yutaBeamPinkCore'].includes(spark.type);
      if (isStandardSpark) {
        spark.isPixi = true;
        spark.sprite = this.getPixiSprite();
        if (spark.sprite) {
          // Parse color e.g. "rgba(255, 0, 0, 1)" or "#ff0000"
          let numColor = 0xffffff;
          if (spark.color.startsWith('#')) {
            numColor = parseInt(spark.color.replace('#', '0x'), 16);
          } else if (spark.color.startsWith('rgba')) {
            const parts = spark.color.match(/[\d.]+/g);
            if (parts && parts.length >= 3) {
              const r = parseInt(parts[0]);
              const g = parseInt(parts[1]);
              const b = parseInt(parts[2]);
              numColor = (r << 16) + (g << 8) + b;
            }
          }
          spark.sprite.tint = (numColor & 0xFFFFFF);
          spark.sprite.width = spark.size * 2;
          spark.sprite.height = spark.size * 2;
          spark.sprite.x = spark.x;
          spark.sprite.y = spark.y;
          spark.sprite.alpha = spark.life;
        }
      } else {
        spark.isPixi = false;
        spark.sprite = null;
      }

      // Apply overrides passed in (like forcing radius for impact flash)
      Object.assign(spark, overrideProps);

      // If a custom blendMode was provided, apply it to the sprite now that overrides are assigned
      if (spark.isPixi && spark.sprite && spark.blendMode !== undefined) {
        spark.sprite.blendMode = spark.blendMode;
      }

      if (insertIdx !== -1) {
        state.sparkEffects[insertIdx] = spark;
      } else {
        state.sparkEffects.push(spark);
      }
    }
  }
}
