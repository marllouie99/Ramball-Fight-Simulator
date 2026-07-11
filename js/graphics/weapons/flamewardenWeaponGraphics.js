// flamewardenWeaponGraphics.js
//  - Use this file for Flamewarden-specific weapon graphics (flamethrower).
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change Flamewarden weapon visuals, edit the palette or drawOrangeFlamethrowerGun() below.

import { projectileSystem } from '../../systems/projectileSystem.js';
import { CONFIG } from '../../core/config.js';

// ─────────────────────────────────────────────
// FLAMETHROWER PARTICLE SYSTEM (High-Performance)
// ─────────────────────────────────────────────
// Uses additive blending for glow effect without expensive shadow operations.
// Max 60 particles for consistent 60fps with dense flame appearance.

const MAX_FLAME_PARTICLES = 60; // Reduced back to 60 for better performance against heavy visual fighters like Solar Champion

// Color stops: [lifeRatio, r, g, b, alpha]
// lifeRatio 0.0 = just born (white core), 1.0 = dying (smokey grey)
const FLAME_COLOR_STOPS = [
  [0.00, 255, 255, 255, 1.0],   // White core (hottest) - full alpha
  [0.10, 255, 250, 200, 1.0],   // Near white
  [0.25, 255, 220, 100, 0.95],  // Bright yellow
  [0.45, 255, 150,  20, 0.90],  // Orange
  [0.65, 255,  80,   0, 0.85],  // Deep orange
  [0.80, 200,  30,   0, 0.70],  // Dark red-orange
  [0.95, 120,  20,   0, 0.40],  // Dark red
  [1.00,  60,  60,  60, 0.0],   // Smoke (invisible)
];

function lerpColor(stops, t) {
  // Clamp t to 0-1 range
  t = Math.max(0, Math.min(1, t));
  
  // Find the two color stops to interpolate between
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  
  // Interpolate between the two stops
  const range = upper[0] - lower[0];
  const localT = range > 0 ? (t - lower[0]) / range : 0;
  
  return {
    r: Math.round(lower[1] + (upper[1] - lower[1]) * localT),
    g: Math.round(lower[2] + (upper[2] - lower[2]) * localT),
    b: Math.round(lower[3] + (upper[3] - lower[3]) * localT),
    a: lower[4] + (upper[4] - lower[4]) * localT,
  };
}

// Pre-computed colors table for zero object allocations in draw loop
const COLOR_LUT_SIZE = 256;
const PRECOMPUTED_COLORS = new Array(COLOR_LUT_SIZE);
for (let i = 0; i < COLOR_LUT_SIZE; i++) {
  const t = i / (COLOR_LUT_SIZE - 1);
  const color = lerpColor(FLAME_COLOR_STOPS, t);
  PRECOMPUTED_COLORS[i] = `rgba(${color.r},${color.g},${color.b},${color.a})`;
}

export class FlamethrowerParticleSystem {
  constructor() {
    this.active = false;
    this.originX = 0;
    this.originY = 0;
    this.angle = 0;
    
    // Pre-allocate the particle pool
    this.particles = new Array(MAX_FLAME_PARTICLES);
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      this.particles[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        baseSize: 0,
        maxSize: 0,
        turbulence: 0
      };
    }
  }

  // Start emitting from nozzle position
  startEmitting(originX, originY, angle) {
    this.active = true;
    this.originX = originX;
    this.originY = originY;
    this.angle = angle;
  }

  stopEmitting() {
    this.active = false;
  }

  // Reset origin for continuous emission
  setOrigin(originX, originY, angle) {
    this.originX = originX;
    this.originY = originY;
    this.angle = angle;
  }

  // Spawn a single particle from the pool
  spawnParticle() {
    // Find the first inactive particle
    let p = null;
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      if (!this.particles[i].active) {
        p = this.particles[i];
        break;
      }
    }
    
    // If pool is full, do not spawn
    if (!p) return;

    // Random spread around the nozzle angle
    const spread = (Math.random() - 0.5) * 0.8; // ±0.4 radians (~23°)
    const particleAngle = this.angle + spread;

    // Initial velocity with some randomness
    const speed = 200 + Math.random() * 150; // pixels per second

    // Small offset from nozzle tip
    const offsetDist = 6 + Math.random() * 6;

    p.active = true;
    p.x = this.originX + Math.cos(this.angle) * offsetDist;
    p.y = this.originY + Math.sin(this.angle) * offsetDist;
    p.vx = Math.cos(particleAngle) * speed;
    p.vy = Math.sin(particleAngle) * speed;
    p.life = 0;
    p.maxLife = 0.3 + Math.random() * 0.4; // 0.3-0.7 seconds
    p.baseSize = 8 + Math.random() * 6;     // Start larger
    p.maxSize = 25 + Math.random() * 15;    // Grow bigger
    p.turbulence = Math.random() * 3 - 1.5; // For wobbly flame movement
  }

  // Update all particles (call every frame)
  update(dt) {
    // Pre-filter black holes once per frame to avoid O(particles * projectiles) cost
    const blackHoles = (typeof projectileSystem !== 'undefined' && projectileSystem && projectileSystem.projectiles) 
      ? projectileSystem.projectiles.filter(p => p.isBlackHole && p.transformed)
      : [];

    // Spawn more particles while active for denser flame
    if (this.active) {
      // Spawn 2-3 particles per frame to maintain ~60 particles alive
      const spawnCount = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < spawnCount; i++) {
        this.spawnParticle();
      }
    }

    // Update existing particles
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      // Update life
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      // Apply velocity with turbulence
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Add slight upward drift (hot air rises) and turbulence
      p.vy -= 20 * dt; // Gentle upward force
      p.vx += p.turbulence * 40 * dt; // Wobbly movement

      // Slight drag to slow down over time
      p.vx *= (1 - 0.8 * dt);
      p.vy *= (1 - 0.8 * dt);

      // Black Hole pull logic
      for (const proj of blackHoles) {
        const dx = proj.x - p.x;
        const dy = proj.y - p.y;
        const pullRadius = proj.r * 2.5; 
        
        if (Math.abs(dx) > pullRadius || Math.abs(dy) > pullRadius) continue;

        const dist = Math.hypot(dx, dy);
        
        if (dist < pullRadius) {
              if (dist < proj.r * 0.5) {
                p.active = false; // Destroy particle
                break;
              } else {
                // Apply pull
                const pullBase = CONFIG?.black?.blackHolePullStrength || 1.0;
                // vx/vy here are pixels per second. Convert per-frame pull to per-second:
                const pull = pullBase * 2.5 * (1 - dist / pullRadius) * (60 * dt) * 60;
                const nx = dx / dist;
                const ny = dy / dist;
                p.vx += nx * pull;
                p.vy += ny * pull;
              }
            }
          }
    }
  }

  // Draw all particles (call every frame)
  draw(ctx) {
    // Check if we have any active particles before saving context
    let hasActive = false;
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      if (this.particles[i].active) {
        hasActive = true;
        break;
      }
    }
    if (!hasActive) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow

    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      const lifeRatio = p.life / p.maxLife;

      // Size grows with distance from origin (based on life ratio)
      const size = p.baseSize + (p.maxSize - p.baseSize) * lifeRatio;

      // Get precomputed color string (avoid lerpColor object creation and string formatting)
      const colorIdx = Math.floor(lifeRatio * (COLOR_LUT_SIZE - 1));
      const colorStr = PRECOMPUTED_COLORS[Math.max(0, Math.min(COLOR_LUT_SIZE - 1, colorIdx))];

      // Draw the particle as a filled circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = colorStr;
      ctx.fill();
    }

    ctx.restore();
  }

  // Check if there are any active particles
  isActive() {
    if (this.active) return true;
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      if (this.particles[i].active) return true;
    }
    return false;
  }

  // Clear all particles
  clear() {
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      this.particles[i].active = false;
    }
    this.active = false;
  }
}

// Export a shared instance for the weapon
export const flamewardenFlameSystem = new FlamethrowerParticleSystem();

export const FLAMEWARDEN_WEAPON_GRAPHICS = {
  flamethrower: {
    tankGradient1: '#ff7b00',         // Fuel tank light
    tankGradient2: '#cc5500',         // Fuel tank mid
    tankGradient3: '#8a3a00',         // Fuel tank dark
    tankStroke: '#2b1200',            // Tank outline
    tankDetail: 'rgba(0,0,0,0.3)',   // Tank detail lines
    bodyGradient1: '#4a4e54',         // Main body light
    bodyGradient2: '#2c2f33',         // Main body dark
    bodyStroke: '#181a1c',            // Body outline
    bodyHighlight: '#ff7b00',         // Orange highlight line
    gripColor: '#1e2124',             // Grip color
    gripStroke: '#0f1012',            // Grip outline
    shieldGradient1: '#b8babc',       // Heat shield light
    shieldGradient2: '#72767a',       // Heat shield dark
    shieldStroke: '#36393e',          // Shield outline
    ventColor: '#222',                // Heat vent cutouts
    ventGlow: '#ff3300',              // Glowing heat in vents
    nozzleGradient1: '#5a4f4c',      // Muzzle nozzle light
    nozzleGradient2: '#2c2524',       // Muzzle nozzle dark
    nozzleStroke: '#1a1514',          // Nozzle outline
    pilotBracket: '#333',             // Pilot light bracket
    pilotCore: '#00ffff',             // Blueish pilot core
    pilotHighlight: '#ffffff',        // White pilot highlight
  },
  positioning: {
    scale: 1.2,
    bodyOffset: -5,                   // Offset from fighter body edge
  },
  dimensions: {
    tankWidth: 14,
    tankHeight: 14,
    tankRadius: 3,
    bodyLength: 22,
    shieldLength: 16,
    nozzleLength: 6,
  },
};

export function drawOrangeFlamethrowerGun(ctx, x, y, gunAngle, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);
  
  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }
  
  // Start closer to the fighter body
  ctx.translate(Math.max(0, r + FLAMEWARDEN_WEAPON_GRAPHICS.positioning.bodyOffset), 0);

  const cfg = FLAMEWARDEN_WEAPON_GRAPHICS;
  const scale = cfg.positioning.scale;

  // Setup generic shadow (OPTIMIZED: removed shadowBlur)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 2;

  // -- 1. Rear Fuel Tank / Base --
  ctx.beginPath();
  ctx.roundRect(-10 * scale, -7 * scale, cfg.dimensions.tankWidth * scale, cfg.dimensions.tankHeight * scale, cfg.dimensions.tankRadius);
  const tankGradient = ctx.createLinearGradient(-10 * scale, -7 * scale, 4 * scale, 7 * scale);
  tankGradient.addColorStop(0, cfg.flamethrower.tankGradient1);
  tankGradient.addColorStop(0.5, cfg.flamethrower.tankGradient2);
  tankGradient.addColorStop(1, cfg.flamethrower.tankGradient3);
  ctx.fillStyle = tankGradient;
  ctx.fill();
  ctx.strokeStyle = cfg.flamethrower.tankStroke;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Tank details
  ctx.beginPath();
  ctx.moveTo(-6 * scale, -4 * scale);
  ctx.lineTo(-6 * scale, 4 * scale);
  ctx.moveTo(-2 * scale, -4 * scale);
  ctx.lineTo(-2 * scale, 4 * scale);
  ctx.strokeStyle = cfg.flamethrower.tankDetail;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // -- 2. Main Body (Dark Metal) --
  ctx.beginPath();
  ctx.moveTo(2 * scale, -5 * scale);
  ctx.lineTo(24 * scale, -4 * scale);
  ctx.lineTo(24 * scale, 5 * scale);
  ctx.lineTo(2 * scale, 6 * scale);
  ctx.closePath();
  const bodyGradient = ctx.createLinearGradient(2 * scale, -5 * scale, 24 * scale, 6 * scale);
  bodyGradient.addColorStop(0, cfg.flamethrower.bodyGradient1);
  bodyGradient.addColorStop(1, cfg.flamethrower.bodyGradient2);
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  ctx.strokeStyle = cfg.flamethrower.bodyStroke;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Orange highlight line on body
  ctx.beginPath();
  ctx.moveTo(4 * scale, 0);
  ctx.lineTo(20 * scale, 0);
  ctx.strokeStyle = cfg.flamethrower.bodyHighlight;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // -- 3. Lower Grip / Trigger Housing --
  ctx.beginPath();
  ctx.moveTo(6 * scale, 6 * scale);
  ctx.lineTo(12 * scale, 6 * scale);
  ctx.lineTo(10 * scale, 14 * scale);
  ctx.lineTo(4 * scale, 14 * scale);
  ctx.closePath();
  ctx.fillStyle = cfg.flamethrower.gripColor;
  ctx.fill();
  ctx.strokeStyle = cfg.flamethrower.gripStroke;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // -- 4. Heat Shield / Barrel Sleeve --
  ctx.beginPath();
  ctx.moveTo(24 * scale, -6 * scale);
  ctx.lineTo(40 * scale, -4 * scale);
  ctx.lineTo(40 * scale, 5 * scale);
  ctx.lineTo(24 * scale, 7 * scale);
  ctx.closePath();
  const shieldGradient = ctx.createLinearGradient(24 * scale, -6 * scale, 40 * scale, 7 * scale);
  shieldGradient.addColorStop(0, cfg.flamethrower.shieldGradient1);
  shieldGradient.addColorStop(1, cfg.flamethrower.shieldGradient2);
  ctx.fillStyle = shieldGradient;
  ctx.fill();
  ctx.strokeStyle = cfg.flamethrower.shieldStroke;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Heat vent cutouts
  ctx.fillStyle = cfg.flamethrower.ventColor;
  for (let i = 0; i < 3; i++) {
    const vx = (27 + i * 4) * scale;
    ctx.fillRect(vx, -2 * scale, 1.5 * scale, 5 * scale);
  }

  // Glowing heat inside vents
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = cfg.flamethrower.ventGlow;
  for (let i = 0; i < 3; i++) {
    const vx = (27.5 + i * 4) * scale;
    ctx.fillRect(vx, -1.5 * scale, 0.5 * scale, 4 * scale);
  }
  // Shadow for depth (OPTIMIZED: removed shadowBlur)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 2;

  // -- 5. Muzzle Nozzle --
  ctx.beginPath();
  ctx.moveTo(40 * scale, -3 * scale);
  ctx.lineTo(46 * scale, -2 * scale);
  ctx.lineTo(46 * scale, 3 * scale);
  ctx.lineTo(40 * scale, 4 * scale);
  ctx.closePath();
  const nozzleGradient = ctx.createLinearGradient(40 * scale, -3 * scale, 46 * scale, 4 * scale);
  nozzleGradient.addColorStop(0, cfg.flamethrower.nozzleGradient1);
  nozzleGradient.addColorStop(1, cfg.flamethrower.nozzleGradient2);
  ctx.fillStyle = nozzleGradient;
  ctx.fill();
  ctx.strokeStyle = cfg.flamethrower.nozzleStroke;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // -- 6. Pilot Light --
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Pilot light bracket
  ctx.fillStyle = cfg.flamethrower.pilotBracket;
  ctx.fillRect(44 * scale, -5 * scale, 1.5 * scale, 4 * scale);
  
  // Pilot flame
  ctx.beginPath();
  ctx.arc(44.75 * scale, -6 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = cfg.flamethrower.pilotCore;
  // OPTIMIZED: Removed shadowBlur (expensive operation)
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(44.75 * scale, -6 * scale, 0.8 * scale, 0, Math.PI * 2);
  ctx.fillStyle = cfg.flamethrower.pilotHighlight;
  // OPTIMIZED: Removed shadowBlur (expensive operation)
  ctx.fill();

  ctx.restore();
}
