import { state } from '../state.js';

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
  }
}

class HighFidelityExplosionSystem {
  constructor() {
    this.particles = [];
  }

  spawnExplosion(x, y, radius, type = 'grenade') {
    // 0. Shockwave Ring (New)
    const shockwave = new Particle(x, y, 'shockwave', radius * 0.2);
    shockwave.life = 0.25;
    shockwave.maxLife = 0.25;
    shockwave.targetRadius = radius * 3.5; 
    this.particles.push(shockwave);

    // 1. Core Flash (Instant)
    const flash = new Particle(x, y, 'flash', radius * 1.5);
    flash.life = 0.15;
    flash.maxLife = 0.15;
    this.particles.push(flash);

    // 2. Organic Fireball 
    const fireCount = 8 + Math.random() * 4;
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
      this.particles.push(fire);
    }

    // 3. Dynamic Sparks (Streaks)
    const sparkCount = 12 + Math.random() * 8;
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
      this.particles.push(spark);
    }

    // 4. Smoke Clouds 
    const smokeCount = 5 + Math.random() * 4;
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
          this.particles.push(smoke);
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
    }
  }

  draw(ctx) {
    if (this.particles.length === 0) return;
    ctx.save();
    
    // Sort so smoke is drawn first, then shockwave, fire, flash, sparks
    const drawOrder = { 'smoke': 0, 'shockwave': 1, 'fire': 2, 'flash': 3, 'spark': 4 };
    const sorted = [...this.particles].sort((a, b) => drawOrder[a.type] - drawOrder[b.type]);

    for (const p of sorted) {
      if (p.type === 'shockwave') {
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.lineWidth = 10 * p.alpha;
        ctx.strokeStyle = `rgba(255, 220, 150, ${p.alpha * 0.8})`;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.9, 0, Math.PI * 2);
        ctx.lineWidth = 4 * p.alpha;
        ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      else if (p.type === 'flash') {
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
        grad.addColorStop(0.3, `rgba(255, 230, 150, ${p.alpha * 0.9})`);
        grad.addColorStop(1, `rgba(255, 100, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } 
      else if (p.type === 'fire') {
        ctx.globalCompositeOperation = 'screen';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        
        // Slightly squashed/irregular fireball
        ctx.scale(1, 0.85); 
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
        // Richer colors: White/Yellow core, Orange mid, Dark Red edge
        grad.addColorStop(0, `rgba(255, 240, 180, ${p.alpha})`);
        grad.addColorStop(0.3, `rgba(255, 150, 0, ${p.alpha * 0.9})`);
        grad.addColorStop(0.7, `rgba(200, 40, 0, ${p.alpha * 0.6})`);
        grad.addColorStop(1, `rgba(50, 0, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
      }
      else if (p.type === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        // Sparks shift from white/yellow to orange/red as they die
        const r = 255;
        const g = Math.floor(180 * p.alpha);
        const b = Math.floor(50 * p.alpha);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
        ctx.lineWidth = p.radius;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        // Streak length based on current velocity (simulates motion blur)
        const streakScale = 0.04;
        ctx.lineTo(p.x - p.vx * streakScale, p.y - p.vy * streakScale);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      else if (p.type === 'smoke') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
        grad.addColorStop(0, `rgba(80, 75, 75, ${p.alpha * 0.4})`);
        grad.addColorStop(0.6, `rgba(50, 45, 45, ${p.alpha * 0.2})`);
        grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Give smoke a simple circle shape to improve performance
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
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
