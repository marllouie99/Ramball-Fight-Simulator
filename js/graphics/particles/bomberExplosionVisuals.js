import { state } from '../../core/state.js';

// Object pool for PixiJS Sprites to eliminate VRAM allocations and GC thrashing
const pixiSpritePool = [];
let ringTexture = null;

function getRingTexture() {
  if (ringTexture) return ringTexture;
  if (!state.pixiApp) return null;
  const g = new window.PIXI.Graphics();
  g.lineStyle(12, 0xFFFFFF, 1.0);
  g.drawCircle(64, 64, 54);
  ringTexture = state.pixiApp.renderer.generateTexture(g);
  return ringTexture;
}

function getPixiSprite(type) {
  if (pixiSpritePool.length > 0) {
    const s = pixiSpritePool.pop();
    s.visible = true;
    if (type === 'shockwave') {
      s.texture = getRingTexture();
    } else {
      s.texture = state.baseCircleTexture;
    }
    return s;
  }
  
  if (!state.baseCircleTexture || !state.pixiLayers || !state.pixiLayers.particles) return null;
  
  const tex = type === 'shockwave' ? getRingTexture() : state.baseCircleTexture;
  const s = new window.PIXI.Sprite(tex);
  s.anchor.set(0.5);
  state.pixiLayers.particles.addChild(s);
  return s;
}

function releasePixiSprite(s) {
  if (!s) return;
  s.visible = false;
  pixiSpritePool.push(s);
}

class Particle {
  constructor(x, y, type, radius) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = radius;
    this.life = 1;
    this.maxLife = 1;
    this.alpha = 1;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.friction = 1;
    this.gravity = 0;
    this.color = '';
    this.history = []; // for sparks
    this.rotation = Math.random() * Math.PI * 2;
    this.sprite = null;
  }
}

class HighFidelityExplosionSystem {
  constructor() {
    this.particles = [];
  }

  clear() {
    for (const p of this.particles) {
      if (p.sprite) {
        releasePixiSprite(p.sprite);
        p.sprite = null;
      }
    }
    this.particles = [];
  }

  spawnExplosion(x, y, radius, type = 'grenade') {
    // 0. Shockwave Ring (New)
    const shockwave = new Particle(x, y, 'shockwave', radius * 0.2);
    shockwave.life = 0.25;
    shockwave.maxLife = 0.25;
    shockwave.targetRadius = radius * 3.5; 
    
    shockwave.sprite = getPixiSprite('shockwave');
    if (shockwave.sprite) {
      shockwave.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
    }
    this.particles.push(shockwave);

    // 1. Core Flash (Instant)
    const flash = new Particle(x, y, 'flash', radius * 1.5);
    flash.life = 0.15;
    flash.maxLife = 0.15;
    
    flash.sprite = getPixiSprite('flash');
    if (flash.sprite) {
      flash.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
    }
    this.particles.push(flash);

    const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';
    const particleScale = isMulti ? 0.4 : 1.0;

    // 2. Organic Fireball 
    const fireCount = Math.floor((8 + Math.random() * 4) * particleScale);
    for (let i = 0; i < fireCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.5; // Start slightly offset
      const fire = new Particle(x + Math.cos(angle)*dist, y + Math.sin(angle)*dist, 'fire', radius * (0.6 + Math.random() * 0.8));
      const speed = Math.random() * radius * 3;
      fire.vx = Math.cos(angle) * speed;
      fire.vy = Math.sin(angle) * speed;
      fire.friction = 0.82; 
      fire.life = 0.35 + Math.random() * 0.4;
      fire.maxLife = fire.life;
      fire.rotationSpeed = (Math.random() - 0.5) * 4;
      
      fire.sprite = getPixiSprite('fire');
      if (fire.sprite) {
        fire.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
      }
      this.particles.push(fire);
    }

    // 3. Dynamic Sparks (Streaks)
    const sparkCount = Math.floor((12 + Math.random() * 8) * particleScale);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = radius * 12 + Math.random() * radius * 10;
      const spark = new Particle(x, y, 'spark', 1.5 + Math.random() * 2.5);
      spark.vx = Math.cos(angle) * speed;
      spark.vy = Math.sin(angle) * speed;
      spark.friction = 0.94;
      spark.gravity = 600; 
      spark.life = 0.3 + Math.random() * 0.4;
      spark.maxLife = spark.life;
      
      spark.sprite = getPixiSprite('spark');
      if (spark.sprite) {
        spark.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
      }
      this.particles.push(spark);
    }

    // 4. Smoke Clouds 
    const smokeCount = Math.floor((5 + Math.random() * 4) * particleScale);
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * radius * 3;
      const smoke = new Particle(x, y, 'smoke', radius * (1.0 + Math.random() * 0.5));
      smoke.vx = Math.cos(angle) * speed;
      smoke.vy = Math.sin(angle) * speed;
      smoke.friction = 0.88;
      smoke.ay = -40; 
      smoke.life = 1.2 + Math.random() * 1.0;
      smoke.maxLife = smoke.life;
      smoke.rotationSpeed = (Math.random() - 0.5) * 2;
      
      smoke.sprite = getPixiSprite('smoke');
      if (smoke.sprite) {
        smoke.sprite.blendMode = window.PIXI.BLEND_MODES.NORMAL;
      }
      this.particles.push(smoke);
    }
  }

  update(dt) {
    const fpsScale = dt * 60; // normalize friction to 60fps
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.type === 'fire' && Math.random() > 0.8) {
          const smoke = new Particle(p.x, p.y, 'smoke', p.radius * 1.2);
          smoke.vx = p.vx * 0.3;
          smoke.vy = p.vy * 0.3;
          smoke.friction = 0.9;
          smoke.ay = -25;
          smoke.life = 0.8 + Math.random() * 0.6;
          smoke.maxLife = smoke.life;
          smoke.rotationSpeed = (Math.random() - 0.5) * 1.5;
          
          smoke.sprite = getPixiSprite('smoke');
          if (smoke.sprite) {
            smoke.sprite.blendMode = window.PIXI.BLEND_MODES.NORMAL;
          }
          this.particles.push(smoke);
        }
        
        if (p.sprite) {
          releasePixiSprite(p.sprite);
          p.sprite = null;
        }
        
        this.particles.splice(i, 1);
        continue;
      }

      // Non-linear alpha for snappier fade
      let progress = p.life / p.maxLife;
      if (p.type === 'flash' || p.type === 'shockwave') {
         p.alpha = Math.pow(progress, 3); // fades out quickly
      } else {
         p.alpha = progress;
      }

      // Physics
      p.vx += p.ax * dt;
      p.vy += (p.ay + p.gravity) * dt;
      p.vx *= Math.pow(p.friction, fpsScale);
      p.vy *= Math.pow(p.friction, fpsScale);
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      if (p.rotationSpeed) p.rotation += p.rotationSpeed * dt;

      if (p.type === 'fire') {
        p.radius = Math.max(0.1, p.radius * Math.pow(0.97, fpsScale));
      } else if (p.type === 'smoke') {
        p.radius = p.radius + 20 * dt;
      } else if (p.type === 'shockwave') {
        // Expand shockwave towards target radius
        p.radius += (p.targetRadius - p.radius) * 12 * dt;
      }

      // Sync with PixiJS Sprite in WebGL coordinates (GPU renders it)
      if (p.sprite) {
        p.sprite.x = p.x;
        p.sprite.y = p.y;
        p.sprite.alpha = p.alpha;
        
        if (p.type === 'shockwave') {
          p.sprite.width = p.radius * 2;
          p.sprite.height = p.radius * 2;
          p.sprite.tint = 0xFFD880; // glowing light orange/yellow
          p.sprite.alpha = p.alpha * 0.85;
        } else if (p.type === 'flash') {
          p.sprite.width = p.radius * 2;
          p.sprite.height = p.radius * 2;
          p.sprite.tint = 0xFFA500;
          p.sprite.alpha = p.alpha;
        } else if (p.type === 'fire') {
          p.sprite.width = p.radius * 2.2;
          p.sprite.height = p.radius * 2.2;
          p.sprite.rotation = p.rotation;
          
          // Flame colors: bright yellow -> orange -> dark red
          if (p.alpha > 0.65) {
            p.sprite.tint = 0xFFF5CC; // white-hot yellow core
          } else if (p.alpha > 0.35) {
            p.sprite.tint = 0xFF9900; // orange
          } else {
            p.sprite.tint = 0xBB2200; // red
          }
        } else if (p.type === 'spark') {
          // Stretch spark along velocity vector (motion blur)
          const speed = Math.hypot(p.vx, p.vy);
          p.sprite.rotation = Math.atan2(p.vy, p.vx);
          p.sprite.width = Math.max(4, speed * 0.08); // length
          p.sprite.height = p.radius * 1.8; // thickness
          
          // Spark color shifts as it cools down
          p.sprite.tint = p.alpha > 0.5 ? 0xFFEE44 : 0xFF3300;
        } else if (p.type === 'smoke') {
          p.sprite.width = p.radius * 2.0;
          p.sprite.height = p.radius * 2.0;
          p.sprite.rotation = p.rotation;
          p.sprite.alpha = p.alpha * 0.25; // faint smoke cloud
          p.sprite.tint = 0x2E2A2B;
        }
      }
    }
  }

  draw(ctx) {
    // Deprecated: PixiJS automatically renders the sprites in the background scene graph.
  }
}

export const bomberExplosionSystem = new HighFidelityExplosionSystem();

export const BOMBER_EXPLOSION_VISUAL_CONFIG = {
  screenShake: {
    enabled: true,
    grenadeIntensity: 5,
    stickyIntensity: 6,
    c4Intensity: 12,
    deathC4Intensity: 15,
    clusterIntensity: 8,
    duration: 20,
    frequency: 0.8,
  },
  dynamicLighting: {
    enabled: true,
    grenadeLightRadius: 100,
    stickyLightRadius: 120,
    c4LightRadius: 180,
    deathC4LightRadius: 220,
    clusterLightRadius: 150,
    lightDuration: 20,
    lightColor: '#FF8800',
    lightIntensity: 0.6,
  },
  blastIndicator: {
    enabled: true,
    grenadeAlpha: 0.15,
    stickyAlpha: 0.20,
    c4Alpha: 0.25,
    pulseSpeed: 0.1,
    ringCount: 2,
    ringSpacing: 0.3,
  },
};

// Deprecated function, kept for backward compatibility if ever called directly
export function drawBomberExplosion(p) {
}
