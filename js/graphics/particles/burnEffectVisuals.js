// js/graphics/particles/burnEffectVisuals.js
import { state } from '../../core/state.js';

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
    return p;
  }

  _returnParticle(p) {
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
    const isMulti = state && (state.mode === '2v2' || state.mode === 'FFA');
    
    // OPTIMIZED: More aggressive limits for multi-fighter battles
    const maxBurn = isMulti ? 40 : 200;
    const fpsBasedLimit = state.fps < 40 ? 25 : maxBurn;
    if (this.particles.length > fpsBasedLimit) return;
    
    const r = fighter.r;
    const fireChance = state.fps < 40 ? 0.2 : 0.4;
    const sparkChance = state.fps < 40 ? 0.1 : 0.2;
    const smokeChance = state.fps < 40 ? 0.08 : 0.15;

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
      const dist = Math.random() * r * 0.8;
      const px = fighter.x + Math.cos(angle) * dist;
      const py = fighter.y + Math.sin(angle) * dist;
      
      const p = this._getParticle(px, py, 'fire', 4 + Math.random() * 6);
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.life = p.maxLife;
      p.vx = flowVx + (Math.random() - 0.5) * 12;
      p.vy = flowVy + (Math.random() - 0.5) * 12;
      p.gravity = gravity;
      this.particles.push(p);
    }

    // 2. Ember Sparks (crackles)
    if (Math.random() < sparkChance) {
      const angle = Math.random() * Math.PI * 2;
      const px = fighter.x + Math.cos(angle) * r;
      const py = fighter.y + Math.sin(angle) * r;
      
      const p = this._getParticle(px, py, 'spark', 1.5 + Math.random() * 1.5);
      p.maxLife = 0.15 + Math.random() * 0.15;
      p.life = p.maxLife;
      const sparkAngle = fighter.isChannelingDivineFlame 
        ? ((fighter.gunAngle || 0) + Math.PI + (Math.random() - 0.5) * 0.8)
        : Math.hypot(fighter.vx || 0, fighter.vy || 0) > 0.5
          ? (Math.atan2(-(fighter.vy || 0), -(fighter.vx || 0)) + (Math.random() - 0.5) * 0.8)
          : (-Math.PI / 2 + (Math.random() - 0.5) * 1.5);
      const speed = 40 + Math.random() * 40;
      p.vx = Math.cos(sparkAngle) * speed;
      p.vy = Math.sin(sparkAngle) * speed;
      p.gravity = gravity;
      this.particles.push(p);
    }

    // 3. Smoke (rising ash)
    if (Math.random() < smokeChance) {
      const px = fighter.x + (Math.random() - 0.5) * r * 0.6;
      const py = fighter.y - r * 0.3;
      
      const p = this._getParticle(px, py, 'smoke', 6 + Math.random() * 8);
      p.maxLife = 0.6 + Math.random() * 0.4;
      p.life = p.maxLife;
      p.vx = flowVx * 0.5 + (Math.random() - 0.5) * 8;
      p.vy = flowVy * 0.5 + (Math.random() - 0.5) * 8 - 10;
      p.gravity = -10;
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

    // OPTIMIZED: Skip expensive composite operations during low FPS
    const useSimpleRender = state.fps < 40 && state.gameState === 'playing';

    // Pre-sort so lighter elements blend correctly if needed, but lighter handles it regardless.
    this.particles.sort((a, b) => b.life - a.life);
    ctx.save();

    // Use source-over blending because lighter blending is invisible against light arena backgrounds
    ctx.globalCompositeOperation = 'source-over';

    for (const p of this.particles) {
      if (p.type === 'fire') {
        const progress = p.life / p.maxLife;
        const size = p.size * (1.2 + (1 - progress) * 0.5); // Grows slightly as it lives

        if (useSimpleRender) {
          ctx.fillStyle = `rgba(255, 150, 50, ${progress * 0.7})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
        
        // Brighter colors that fade out cleanly without getting muddy
        if (progress > 0.6) { // Young
          grad.addColorStop(0, `rgba(255, 255, 255, ${progress})`);
          grad.addColorStop(0.5, `rgba(255, 220, 50, ${progress * 0.9})`);
          grad.addColorStop(1, `rgba(255, 100, 0, 0)`);
        } else { // Older
          grad.addColorStop(0, `rgba(255, 150, 20, ${progress * 0.8})`);
          grad.addColorStop(0.7, `rgba(200, 40, 0, ${progress * 0.4})`);
          grad.addColorStop(1, `rgba(100, 0, 0, 0)`);
        }
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        
        // Restore fluid, flowy procedural shape
        const numPoints = 10;
        const points = [];
        for (let j = 0; j < numPoints; j++) {
          const theta = (j / numPoints) * Math.PI * 2;
          let r = size;
          
          const turbulence = (p.x + p.y) % 10;
          const billow = Math.sin(theta * 2 - p.life * 8 + turbulence);
          const cut = Math.pow(Math.sin(theta * 3 - p.life * 12 + turbulence * 1.5), 2);
          
          const deform = 0.1 + ((1.0 - progress) * 0.4); 
          r += size * deform * billow;
          r -= size * deform * cut * 0.7;
          
          r = Math.max(size * 0.3, r);
          
          // Volumetric wobble
          const wobbleX = Math.sin(p.life * 15 + p.y * 0.1) * 2;
          
          points.push({
            x: p.x + wobbleX + Math.cos(theta) * r,
            y: p.y + Math.sin(theta) * r
          });
        }
        
        // Draw smooth closed loop
        const startX = (points[numPoints - 1].x + points[0].x) / 2;
        const startY = (points[numPoints - 1].y + points[0].y) / 2;
        ctx.moveTo(startX, startY);
        
        for (let j = 0; j < numPoints; j++) {
          const curr = points[j];
          const next = points[(j + 1) % numPoints];
          const midX = (curr.x + next.x) / 2;
          const midY = (curr.y + next.y) / 2;
          ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
        }
        ctx.closePath();
        ctx.fill();
      }
      else if (p.type === 'spark') {
        const progress = p.life / p.maxLife;
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
        const progress = p.life / p.maxLife;
        // Blend from dark purple/red to black based on progress - kept VERY faint to avoid muddy overlap
        const alpha = Math.sin(progress * Math.PI) * 0.1;
        
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.2);
        grad.addColorStop(0, `rgba(40, 20, 50, ${alpha})`); 
        grad.addColorStop(0.6, `rgba(20, 15, 25, ${alpha * 0.6})`);
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
