// js/weaponVisual/burnEffectVisuals.js
import { state } from '../state.js';

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
  }
}

class BurnEffectSystem {
  constructor() {
    this.particles = [];
  }

  // Clear particles when round ends or resets
  clear() {
    this.particles = [];
  }

  /**
   * Spawns particles on an active burning fighter.
   * Call this every frame inside the update loop for fighters with burnTimer > 0.
   */
  spawnBurnParticles(fighter) {
    if (this.particles.length > 250) return;
    const r = fighter.r;
    
    // 1. Fire particles (dense center flame)
    if (Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * r * 0.8;
      const px = fighter.x + Math.cos(angle) * dist;
      const py = fighter.y + Math.sin(angle) * dist;
      
      const p = new BurnParticle(px, py, 'fire', 4 + Math.random() * 6);
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.life = p.maxLife;
      // Inherit a portion of the fighter's velocity for realistic trailing
      p.vx += fighter.vx * 0.5;
      p.vy += fighter.vy * 0.5;
      this.particles.push(p);
    }

    // 2. Ember Sparks (crackles)
    if (Math.random() < 0.2) {
      const angle = Math.random() * Math.PI * 2;
      const px = fighter.x + Math.cos(angle) * r;
      const py = fighter.y + Math.sin(angle) * r;
      
      const p = new BurnParticle(px, py, 'spark', 1.5 + Math.random() * 1.5);
      p.maxLife = 0.15 + Math.random() * 0.15;
      p.life = p.maxLife;
      const sparkAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5; // biased upwards
      const speed = 60 + Math.random() * 60;
      p.vx = Math.cos(sparkAngle) * speed + fighter.vx * 0.3;
      p.vy = Math.sin(sparkAngle) * speed + fighter.vy * 0.3;
      this.particles.push(p);
    }

    // 3. Smoke (rising ash)
    if (Math.random() < 0.15) {
      const px = fighter.x + (Math.random() - 0.5) * r * 0.6;
      const py = fighter.y - r * 0.5; // spawn near top
      
      const p = new BurnParticle(px, py, 'smoke', 6 + Math.random() * 8);
      p.maxLife = 0.6 + Math.random() * 0.4;
      p.life = p.maxLife;
      p.vx = (Math.random() - 0.5) * 10 + fighter.vx * 0.2;
      p.vy = -40 - Math.random() * 20 + fighter.vy * 0.2;
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
        this.particles.splice(i, 1);
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
        p.size = Math.max(0.1, p.size - 4 * dt); // shrink
      } else if (p.type === 'smoke') {
        p.size += 8 * dt; // expand
      } else if (p.type === 'spark') {
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 3) p.history.shift();
      }
    }
  }

  draw(ctx) {
    if (this.particles.length === 0) return;

    ctx.save();

    for (const p of this.particles) {
      const progress = p.life / p.maxLife;

      if (p.type === 'fire') {
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, `rgba(255, 255, 255, ${progress})`);
        grad.addColorStop(0.2, `rgba(255, 200, 50, ${progress * 0.9})`);
        grad.addColorStop(0.5, `rgba(255, 80, 0, ${progress * 0.6})`);
        grad.addColorStop(1, `rgba(180, 0, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } 
      else if (p.type === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, ${120 + progress * 135}, 40, ${progress})`;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (p.history.length > 1) {
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let i = 1; i < p.history.length; i++) {
            ctx.lineTo(p.history[i].x, p.history[i].y);
          }
        } else {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
        }
        ctx.stroke();
      } 
      else if (p.type === 'smoke') {
        ctx.globalCompositeOperation = 'source-over';
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, `rgba(50, 45, 45, ${progress * 0.45})`);
        grad.addColorStop(0.6, `rgba(25, 25, 25, ${progress * 0.2})`);
        grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

export const burnEffectSystem = new BurnEffectSystem();
