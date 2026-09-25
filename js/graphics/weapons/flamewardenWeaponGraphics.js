import { projectileSystem } from '../../systems/projectileSystem.js';
import { CONFIG, getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

// ─────────────────────────────────────────────
// FLAMETHROWER PARTICLE SYSTEM (Pixel Art Fire Edition)
// ─────────────────────────────────────────────
// Uses discrete stepped pixel blocks (P = 2.0px) with thermal fire quantization
// (White Core -> Solar Yellow -> Blazing Orange -> Volcanic Red -> Charcoal Smoke)

const MAX_FLAME_PARTICLES = 80;

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
        turbulence: 0,
        sprite: null
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
    let p = null;
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      if (!this.particles[i].active) {
        p = this.particles[i];
        break;
      }
    }
    
    if (!p) return;

    // Random spread around the nozzle angle
    const spread = (Math.random() - 0.5) * 0.8;
    const particleAngle = this.angle + spread;

    const speed = 200 + Math.random() * 150;
    const offsetDist = 6 + Math.random() * 6;

    p.active = true;
    p.x = this.originX + Math.cos(this.angle) * offsetDist;
    p.y = this.originY + Math.sin(this.angle) * offsetDist;
    p.vx = Math.cos(particleAngle) * speed;
    p.vy = Math.sin(particleAngle) * speed;
    p.life = 0;
    p.maxLife = 0.3 + Math.random() * 0.4;
    p.baseSize = 8 + Math.random() * 6;
    p.maxSize = 25 + Math.random() * 15;
    p.turbulence = Math.random() * 3 - 1.5;

    // WebGL PixiJS Sprite initialization
    p.sprite = getPixiSprite();
    if (p.sprite) {
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.alpha = 1.0;
      p.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
    }
  }

  // Update all particles (call every frame)
  update(dt) {
    let blackHoles = [];
    if (typeof projectileSystem !== 'undefined' && projectileSystem && projectileSystem.projectiles) {
      const hasBlackHoles = projectileSystem.projectiles.some(p => p.isBlackHole && p.transformed);
      if (hasBlackHoles) {
        blackHoles = projectileSystem.projectiles.filter(p => p.isBlackHole && p.transformed);
      }
    }

    if (this.active) {
      const qualityMultiplier = state.qualityLevel || 1.0;
      const baseSpawnCount = 3;
      const spawnCount = qualityMultiplier < 0.5 ? 1 : Math.max(1, Math.floor(baseSpawnCount * qualityMultiplier));
      for (let i = 0; i < spawnCount; i++) {
        this.spawnParticle();
      }
    }

    const arenaCenterX = state.arena.x + state.arena.width / 2;
    const arenaCenterY = state.arena.y + state.arena.height / 2;
    const maxDistance = Math.max(state.arena.width, state.arena.height) * 0.8;

    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      const distFromCenter = Math.hypot(p.x - arenaCenterX, p.y - arenaCenterY);
      if (distFromCenter > maxDistance) {
        if (p.sprite) {
          releasePixiSprite(p.sprite);
          p.sprite = null;
        }
        p.active = false;
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        if (p.sprite) {
          releasePixiSprite(p.sprite);
          p.sprite = null;
        }
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 20 * dt;
      p.vx += p.turbulence * 40 * dt;
      p.vx *= (1 - 2.5 * dt);
      p.vy *= (1 - 2.5 * dt);

      // WebGL Sprite transform & color sync
      if (p.sprite) {
        p.sprite.x = p.x;
        p.sprite.y = p.y;
        
        const lifeRatio = p.life / p.maxLife;
        const size = p.baseSize + (p.maxSize * 1.6 - p.baseSize) * lifeRatio;
        
        p.sprite.width = size * 2.2;
        p.sprite.height = size * 2.2;
        p.sprite.rotation = Math.atan2(p.vy, p.vx);
        
        const alphaScale = Math.max(0, lifeRatio > 0.8 ? 1.0 - ((lifeRatio - 0.8) / 0.2) : 1.0);
        
        if (lifeRatio < 0.2) {
          p.sprite.tint = 0xFFFFFF;
          p.sprite.alpha = alphaScale;
          p.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
        } else if (lifeRatio < 0.5) {
          p.sprite.tint = 0xFFBB22;
          p.sprite.alpha = alphaScale * 0.9;
          p.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
        } else if (lifeRatio < 0.8) {
          p.sprite.tint = 0xFF5500;
          p.sprite.alpha = alphaScale * 0.75;
          p.sprite.blendMode = window.PIXI.BLEND_MODES.ADD;
        } else {
          p.sprite.tint = 0x881100;
          p.sprite.alpha = alphaScale * 0.3;
          p.sprite.blendMode = window.PIXI.BLEND_MODES.NORMAL;
        }
      }

      if (blackHoles.length > 0) {
        for (const proj of blackHoles) {
          const dx = proj.x - p.x;
          const dy = proj.y - p.y;
          const pullRadius = proj.r * 2.5; 
          if (Math.abs(dx) > pullRadius || Math.abs(dy) > pullRadius) continue;
          const dist = Math.hypot(dx, dy);
          if (dist < pullRadius) {
            if (dist < proj.r * 0.5) {
              if (p.sprite) {
                releasePixiSprite(p.sprite);
                p.sprite = null;
              }
              p.active = false;
              break;
            } else {
              const pullBase = CONFIG?.black?.blackHolePullStrength || 1.0;
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
  }

  // Draw authentic pixel-art fire voxel clusters (Canvas 2D rendering)
  draw(ctx) {
    if (!ctx) return;
    const P = 2.0;
    const snap = (v) => Math.round(v / P) * P;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      const lifeRatio = p.life / p.maxLife;
      const currentSize = p.baseSize + (p.maxSize * 1.5 - p.baseSize) * lifeRatio;
      const s = Math.max(P * 2, snap(currentSize));
      const px = snap(p.x);
      const py = snap(p.y);

      const alpha = lifeRatio > 0.8 ? Math.max(0, 1.0 - (lifeRatio - 0.8) / 0.2) : 1.0;
      ctx.globalAlpha = alpha;

      if (lifeRatio < 0.20) {
        // Stage 1: Incandescent White-Hot Core
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(px - s / 2 + P, py - s / 2 + P, Math.max(P, s - P * 2), Math.max(P, s - P * 2));
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px - s / 4, py - s / 4, Math.max(P, s / 2), Math.max(P, s / 2));
      } else if (lifeRatio < 0.50) {
        // Stage 2: Blazing Solar Orange & Yellow
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
        ctx.fillStyle = '#F97316';
        ctx.fillRect(px - s / 2 + P, py - s / 2 + P, Math.max(P, s - P * 2), Math.max(P, s - P * 2));
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(px - s / 4, py - s / 4, Math.max(P, s / 2), Math.max(P, s / 2));
      } else if (lifeRatio < 0.80) {
        // Stage 3: Volcanic Crimson & Dark Orange Billow
        ctx.fillStyle = '#7C2D12';
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(px - s / 2 + P, py - s / 2 + P, Math.max(P, s - P * 2), Math.max(P, s - P * 2));
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(px - s / 4, py - s / 4, Math.max(P, s / 2), Math.max(P, s / 2));
      } else {
        // Stage 4: Cooling Charcoal Smoke & Embers
        ctx.fillStyle = '#262626';
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
        if ((i + Math.floor(lifeRatio * 10)) % 2 === 0) {
          ctx.fillStyle = '#EA580C';
          ctx.fillRect(px - P / 2, py - P / 2, P, P);
        }
      }

      // Discrete pixel sparks floating alongside
      if ((i % 3 === 0) && lifeRatio < 0.7) {
        const sparkOffset = ((i * 7) % 11 - 5) * P;
        ctx.fillStyle = (i % 2 === 0) ? '#FDE047' : '#FFFFFF';
        ctx.fillRect(px + sparkOffset, py - s * 0.6, P, P);
      }
    }

    ctx.restore();
  }

  isActive() {
    if (this.active) return true;
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      if (this.particles[i].active) return true;
    }
    return false;
  }

  clear() {
    for (let i = 0; i < MAX_FLAME_PARTICLES; i++) {
      if (this.particles[i].sprite) {
        releasePixiSprite(this.particles[i].sprite);
        this.particles[i].sprite = null;
      }
      this.particles[i].active = false;
    }
    this.active = false;
  }
}

// Export a shared instance for the weapon
export const flamewardenFlameSystem = new FlamethrowerParticleSystem();

export const FLAMEWARDEN_WEAPON_GRAPHICS = {
  positioning: {
    scale: 1.0,
    bodyOffset: -4,
  }
};

/**
 * Authentic 2.0px Discrete Pixel Art Flamethrower Gun
 * Rendered with heavy forged basalt/steel chassis, glowing sight glass, perforated heat vents, and brass nozzle.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} gunAngle
 * @param {number} r
 * @param {string} fighterColor
 */
export function drawOrangeFlamethrowerGun(ctx, x, y, gunAngle, r, fighterColor = '#FF8C00') {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  const P = 2.0; // 2.0px discrete grid
  const snap = (v) => Math.round(v / P) * P;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.rotate(gunAngle);
  
  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  
  // Position gun slightly forward from the fighter body
  const bodyOffset = Math.max(0, r - 6);
  ctx.translate(bodyOffset, 0);

  const scale = 1.0;

  // ── 1. REAR HEAVY HEAT/FUEL TANK (-12px to 2px, Y: -8px to +8px) ──
  // A. Outer Dark Ink Border
  ctx.fillStyle = '#0F0501';
  ctx.fillRect(snap(-12 * scale), snap(-8 * scale), snap(14 * scale), snap(16 * scale));

  // B. Tank Body (Burnished Copper / Magma Bronze)
  ctx.fillStyle = '#9A3412';
  ctx.fillRect(snap(-10 * scale), snap(-6 * scale), snap(10 * scale), snap(12 * scale));
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(snap(-10 * scale), snap(-6 * scale), snap(8 * scale), snap(4 * scale));

  // C. Molten Glass Sight-Gauge Column
  ctx.fillStyle = '#1C0B02';
  ctx.fillRect(snap(-7 * scale), snap(-4 * scale), snap(4 * scale), snap(8 * scale));
  ctx.fillStyle = '#FDE047'; // Molten plasma core in sight glass
  ctx.fillRect(snap(-6 * scale), snap(-3 * scale), snap(2 * scale), snap(6 * scale));
  ctx.fillStyle = '#FFFFFF'; // Specular gleam on sight glass
  ctx.fillRect(snap(-6 * scale), snap(-3 * scale), snap(2 * scale), snap(2 * scale));

  // D. Steel Reinforcement Tank Bracket Bands
  ctx.fillStyle = '#334155';
  ctx.fillRect(snap(-11 * scale), snap(-8 * scale), snap(2 * scale), snap(16 * scale));
  ctx.fillRect(snap(-2 * scale), snap(-8 * scale), snap(2 * scale), snap(16 * scale));

  // ── 2. FORGED RECEIVER / CHASSIS (2px to 22px, Y: -6px to +6px) ──
  // A. Receiver Ink Border
  ctx.fillStyle = '#0F0501';
  ctx.fillRect(snap(2 * scale), snap(-6 * scale), snap(20 * scale), snap(12 * scale));

  // B. Gunmetal Steel Body
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(snap(4 * scale), snap(-4 * scale), snap(16 * scale), snap(8 * scale));
  ctx.fillStyle = '#334155';
  ctx.fillRect(snap(4 * scale), snap(-4 * scale), snap(16 * scale), snap(3 * scale));

  // C. Upper Fiery Heat Rail (Orange Conduit)
  ctx.fillStyle = '#F97316';
  ctx.fillRect(snap(4 * scale), snap(-2 * scale), snap(14 * scale), snap(2 * scale));
  ctx.fillStyle = '#FDE047';
  ctx.fillRect(snap(8 * scale), snap(-2 * scale), snap(6 * scale), snap(2 * scale));

  // D. Lower Pistol Grip & Trigger Housing (6px to 12px, Y: 6px to 14px)
  ctx.fillStyle = '#0F0501';
  ctx.fillRect(snap(6 * scale), snap(6 * scale), snap(6 * scale), snap(8 * scale));
  ctx.fillStyle = '#1C1917';
  ctx.fillRect(snap(8 * scale), snap(6 * scale), snap(4 * scale), snap(6 * scale));

  // ── 3. PERFORATED HEAT BARREL SHROUD (22px to 38px, Y: -5px to +5px) ──
  // A. Barrel Outer Ink Border
  ctx.fillStyle = '#0F0501';
  ctx.fillRect(snap(22 * scale), snap(-5 * scale), snap(16 * scale), snap(10 * scale));

  // B. Heavy Dark Steel Sleeve
  ctx.fillStyle = '#475569';
  ctx.fillRect(snap(22 * scale), snap(-3 * scale), snap(14 * scale), snap(6 * scale));
  ctx.fillStyle = '#64748B';
  ctx.fillRect(snap(22 * scale), snap(-3 * scale), snap(14 * scale), snap(2 * scale));

  // C. Heat Cooling Vent Slots & Glowing Red Internal Heating Coils
  for (let i = 0; i < 3; i++) {
    const vx = snap((25 + i * 4) * scale);
    ctx.fillStyle = '#0F0501'; // Vent hole cutout
    ctx.fillRect(vx, snap(-2 * scale), snap(2 * scale), snap(4 * scale));
    ctx.fillStyle = '#EF4444'; // Glowing red heating element
    ctx.fillRect(vx, snap(-1 * scale), snap(2 * scale), snap(2 * scale));
    ctx.fillStyle = '#FDE047'; // White-hot central coil segment
    ctx.fillRect(vx, snap(0), snap(1 * scale), snap(1 * scale));
  }

  // ── 4. FLARED BRASS MUZZLE NOZZLE (38px to 46px, Y: -4px to +4px) ──
  // A. Nozzle Ink Border
  ctx.fillStyle = '#0F0501';
  ctx.fillRect(snap(38 * scale), snap(-4 * scale), snap(8 * scale), snap(8 * scale));

  // B. Flared Brass Stepped Nozzle
  ctx.fillStyle = '#B45309'; // Dark brass
  ctx.fillRect(snap(38 * scale), snap(-3 * scale), snap(6 * scale), snap(6 * scale));
  ctx.fillStyle = '#F59E0B'; // Highlighted gold-brass rim
  ctx.fillRect(snap(40 * scale), snap(-2 * scale), snap(4 * scale), snap(4 * scale));
  ctx.fillStyle = '#1C0B02'; // Hollow muzzle opening
  ctx.fillRect(snap(44 * scale), snap(-2 * scale), snap(2 * scale), snap(4 * scale));

  // ── 5. PILOT IGNITER TORCH & BLUE FLAME (42px, Y: -8px) ──
  ctx.fillStyle = '#0F0501';
  ctx.fillRect(snap(41 * scale), snap(-8 * scale), snap(3 * scale), snap(4 * scale));
  ctx.fillStyle = '#64748B';
  ctx.fillRect(snap(42 * scale), snap(-7 * scale), snap(2 * scale), snap(3 * scale));

  // Pilot flame (Cyan/White pixel diamond)
  ctx.fillStyle = '#00FFFF';
  ctx.fillRect(snap(41 * scale), snap(-10 * scale), snap(4 * scale), snap(3 * scale));
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(snap(42 * scale), snap(-9 * scale), snap(2 * scale), snap(2 * scale));

  // ── 6. DUAL PIXEL HANDS (Rule 20 / Rule 3.6) ──
  // Rear Grip Hand (holding main trigger)
  drawPixelHand(ctx, snap(8 * scale), snap(8 * scale), getHandSize(5.5), '#EA580C', '#0F0501');
  // Forward Steadying Hand (bracing under barrel shroud)
  drawPixelHand(ctx, snap(22 * scale), snap(4 * scale), getHandSize(5.5), '#EA580C', '#0F0501');

  ctx.restore();
}

/**
 * Renders a single flame projectile in authentic 2.0px discrete retro pixel art style.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} p - Flame projectile entity
 */
export function drawPixelFlameProjectile(ctx, p) {
  if (!p) return;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const maxLife = p.maxLife || p.startLife || 30;
  const progress = Math.max(0, Math.min(1.0, 1.0 - (p.life / maxLife)));

  // Radius expands as the flame plume travels forward
  const currentR = Math.max(P * 2, (p.r || 10) * (0.6 + progress * 0.8));
  const s = snap(currentR * 2);
  const px = snap(p.x);
  const py = snap(p.y);

  const isCyan = (typeof p.color === 'string' && (p.color.includes('0, 255, 255') || p.color.includes('#00FFFF') || p.color.includes('cyan')));

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const alpha = progress > 0.8 ? Math.max(0, 1.0 - (progress - 0.8) / 0.2) : 1.0;
  ctx.globalAlpha = alpha;

  if (isCyan) {
    // Rubbick Cyan Cursed Flame
    if (progress < 0.25) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(px - s / 2 + P, py - s / 2 + P, Math.max(P, s - P * 2), Math.max(P, s - P * 2));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px - s / 4, py - s / 4, Math.max(P, s / 2), Math.max(P, s / 2));
    } else if (progress < 0.60) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      ctx.fillStyle = '#0891B2';
      ctx.fillRect(px - s / 2 + P, py - s / 2 + P, Math.max(P, s - P * 2), Math.max(P, s - P * 2));
      ctx.fillStyle = '#67E8F9';
      ctx.fillRect(px - s / 4, py - s / 4, Math.max(P, s / 2), Math.max(P, s / 2));
    } else {
      ctx.fillStyle = '#164E63';
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(px - s / 4, py - s / 4, Math.max(P, s / 2), Math.max(P, s / 2));
    }
  } else {
    // Standard Volcanic Magma Flame
    if (progress < 0.25) {
      // Stage 1: Incandescent White-Hot Core
      ctx.fillStyle = '#0F0501';
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(px - s / 2 + P, py - s / 2 + P, Math.max(P, s - P * 2), Math.max(P, s - P * 2));
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(px - s / 4, py - s / 4, Math.max(P, s / 2), Math.max(P, s / 2));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px - P, py - P, P * 2, P * 2);
    } else if (progress < 0.55) {
      // Stage 2: Blazing Solar Yellow & Orange
      ctx.fillStyle = '#0F0501';
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(px - s / 2 + P, py - s / 2 + P, Math.max(P, s - P * 2), Math.max(P, s - P * 2));
      ctx.fillStyle = '#F97316';
      ctx.fillRect(px - s / 4, py - s / 4, Math.max(P, s / 2), Math.max(P, s / 2));
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(px - P, py - P, P * 2, P * 2);
    } else if (progress < 0.85) {
      // Stage 3: Volcanic Crimson & Dark Orange Billow
      ctx.fillStyle = '#0F0501';
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      ctx.fillStyle = '#7C2D12';
      ctx.fillRect(px - s / 2 + P, py - s / 2 + P, Math.max(P, s - P * 2), Math.max(P, s - P * 2));
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(px - s / 4, py - s / 4, Math.max(P, s / 2), Math.max(P, s / 2));
    } else {
      // Stage 4: Cooling Charcoal Smoke & Embers
      ctx.fillStyle = '#1C0B02';
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
      ctx.fillStyle = '#431407';
      ctx.fillRect(px - s / 2 + P, py - s / 2 + P, Math.max(P, s - P * 2), Math.max(P, s - P * 2));
      if (Math.round(px + py) % 2 === 0) {
        ctx.fillStyle = '#EA580C';
        ctx.fillRect(px - P / 2, py - P / 2, P, P);
      }
    }
  }

  // Trailing discrete pixel sparks
  if (progress < 0.75 && (Math.round(px) % 3 === 0)) {
    const sparkX = px + ((Math.round(py) % 5) - 2) * P;
    const sparkY = py - s * 0.5;
    ctx.fillStyle = (progress < 0.4) ? '#FFFFFF' : '#FDE047';
    ctx.fillRect(sparkX, sparkY, P, P);
  }

  ctx.restore();
}

