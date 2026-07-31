import { state } from '../../core/state.js';
import { ParticleRegistry } from './ParticleRegistry.js';

// Object Pool to eliminate GC thrashing
const SPARK_POOL_SIZE = 300;
const sparkPool = [];

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

  static returnParticle(spark) {
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
    sparkPool.push(spark);
  }

  static getDynamicQuality(isDomainClash) {
    const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';
    const qualityMultiplier = state.qualityLevel || 1.0;
    const fps = state.fps || 60;
    
    if ((isMulti || isDomainClash) && fps < 55) {
      return Math.min(qualityMultiplier, 0.3);
    }
    return qualityMultiplier;
  }

  static spawn(x, y, count = 8, type = 'crimson', overrideProps = {}) {
    if (!state.sparkEffects) state.sparkEffects = [];

    const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';
    const isDomainClash = state && state.fighters && (state.fighters.filter(f => f && f.domainActive).length > 1);
    
    const dynamicQuality = this.getDynamicQuality(isDomainClash);
    const MAX_PARTICLES = isDomainClash ? 30 : Math.floor((isMulti ? 100 : 200) * dynamicQuality);
    const adjustedCount = Math.max(1, Math.floor(count * (isDomainClash ? 0.3 : dynamicQuality)));

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
      spark.life = 1.0;
      spark.decay = config.decay !== undefined ? config.decay : 0.05;
      spark.friction = config.friction !== undefined ? config.friction : 0.92;
      spark.type = type;
      spark.color = config.color || 'white';
      spark.isFlash = config.isFlash || false;
      spark.isGlow = config.isGlow || false;
      spark.rotation = config.rotation || 0;
      spark.rotationSpeed = config.rotationSpeed || 0;

      // Apply any overrides passed in (like forcing radius for impact flash)
      Object.assign(spark, overrideProps);

      if (insertIdx !== -1) {
        state.sparkEffects[insertIdx] = spark;
      } else {
        state.sparkEffects.push(spark);
      }
    }
  }
}
