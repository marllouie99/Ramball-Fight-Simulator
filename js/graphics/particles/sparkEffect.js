// ─────────────────────────────────────────────
// SPARK EFFECT
// Visual-only particles for bullet impacts (e.g., Crimson Sniper wall hits)
// These bypass physics and collision entirely - pure visual decoration
// ─────────────────────────────────────────────
import { state, triggerGlobalScreenShake } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { fastCleanArray } from './visualTrailSystem.js';
import { triggerGenosSelfDestructFlash } from '../renderers/effectsRenderer.js';

import { ParticleSystem } from '../../systems/particles/ParticleSystem.js';

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

// PERF: Radial gradients are defined at a fixed unit radius (centered at origin) so a single
// cached gradient can be reused for every particle instance/position/size via ctx.translate()
// + ctx.scale(), instead of calling ctx.createRadialGradient() fresh every frame per particle.
// Color stops that fade with `effect.life` are quantized into 20 buckets (~5% steps, imperceptible)
// so the cache stays small and bounded while still tracking the fade.
const _unitGradientCache = new Map();
function getUnitRadialGradient(ctx, key, stops) {
  let gradient = _unitGradientCache.get(key);
  if (!gradient) {
    gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (const [offset, color] of stops) gradient.addColorStop(offset, color);
    _unitGradientCache.set(key, gradient);
  }
  return gradient;
}

// Pre-allocated static segment geometry for animeImpactFrame (Zero Per-Frame Allocations)
const ANIME_IMPACT_SEGMENTS = [
  { t0: 0.00, t1: 0.09, maxSpike: 1.12 },
  { t0: 0.14, t1: 0.25, maxSpike: 1.30 },
  { t0: 0.29, t1: 0.44, maxSpike: 1.38 },
  { t0: 0.48, t1: 0.56, maxSpike: 1.15 },
  { t0: 0.60, t1: 0.72, maxSpike: 1.32 },
  { t0: 0.76, t1: 0.84, maxSpike: 1.20 },
  { t0: 0.88, t1: 0.94, maxSpike: 1.25 },
  { t0: 0.97, t1: 0.99, maxSpike: 1.10 },
];

/**
 * Spawns spark effects at a position (visual-only, no collision).
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} count - Number of sparks to spawn
 * @param {string} type - 'crimson' for red/orange sparks, 'flash' for impact flash
 */
export function spawnSparks(x, y, count = 8, type = 'crimson', customColor = null) {
  let overrideProps = {};
  if (customColor) {
    if (typeof customColor === 'object') {
      overrideProps = { ...customColor };
    } else {
      overrideProps = { color: customColor };
    }
  }
  ParticleSystem.spawn(x, y, count, type, overrideProps);
}

/**
 * Spawns floating rocks/debris under a telekinesis target
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} count - Number of rocks to spawn
 */
export function spawnTelekinesisDebris(x, y, count = 2) {
  ParticleSystem.spawn(x, y, count, 'telekinesisDebris');
}

/**
 * Spawns swirling wind debris (small pebbles and leaves) around Toji during his ultimate charge.
 */
export function spawnTojiWhirlingWindDebris(x, y, count = 2) {
  for (let i = 0; i < count; i++) {
    const isLeaf = Math.random() < 0.50;
    ParticleSystem.spawn(x, y, 1, isLeaf ? 'tojiWindLeaf' : 'tojiWindPebble');
  }
}

/**
 * Spawns an impact flash (visual-only).
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Flash radius
 */
export function spawnImpactFlash(x, y, radius = 20, type = 'default') {
  let pType = 'flash';
  let color = 'rgba(255, 255, 255, 1)';
  if (type === 'crimsonSniper') {
    pType = 'crimsonSniperFlash';
  } else if (type === 'layla') {
    pType = 'flash_layla';
    color = 'rgba(0, 229, 255, 0.85)';
  }
  
  ParticleSystem.spawn(x, y, 1, 'flash_default', {
    size: radius,
    decay: 0.15, // Fast fade
    type: pType,
    isFlash: true,
    color: color
  });
}

/**
 * Spawns lingering pink particles with white cores along Yuta's Pure Love Beam path when it expires.
 * These particles float gently and slowly fade away.
 */
export function spawnYutaBeamLingeringParticles(startX, startY, angle, beamLength = 2000, beamWidth = 170, count = 75) {
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  for (let i = 0; i < count; i++) {
    const dist = Math.random() * beamLength;
    const offsetW = (Math.random() - 0.5) * beamWidth * 1.2;
    const px = startX + Math.cos(angle) * dist + perpX * offsetW;
    const py = startY + Math.sin(angle) * dist + perpY * offsetW;

    // Varied size distribution matching reference image (large glowing orbs + medium + small specs)
    const rand = Math.random();
    let size = 2.0 + Math.random() * 2.0;
    if (rand > 0.75) size = 5.5 + Math.random() * 3.5;
    else if (rand < 0.25) size = 1.2 + Math.random() * 1.0;

    // Gentle upward float and lateral drift (floating like glowing embers in space)
    const vx = (Math.random() - 0.5) * 0.9;
    const vy = -0.3 - Math.random() * 0.9;

    ParticleSystem.spawn(px, py, 1, 'yutaBeamPinkCore', {
      vx,
      vy,
      size,
      life: 0.85 + Math.random() * 0.3,
      decay: 0.006 + Math.random() * 0.007, // Smooth slow decay over 80 - 160 frames (~1.5s - 2.8s)
      friction: 0.97
    });
  }
}

/**
 * Spawns a massive crimson lightning shockwave impact effect.
 * Used when the enhanced execute bullet hits a wall or pierces through a target.
 * Creates expanding jagged rings + radial lightning arcs.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Base radius
 */
export function spawnCrimsonLightningImpact(x, y, radius = 60, isTrickster = false) {
  // 1. Bright white-crimson core flash
  ParticleSystem.spawn(x, y, 1, 'default', {
    vx: 0, vy: 0,
    size: radius * 0.6,
    decay: 0.08,
    type: isTrickster ? 'tricksterLightningCore' : 'crimsonLightningCore',
    isFlash: true,
    friction: 1,
    color: 'white'
  });

  // 2. Expanding crimson shockwave rings (2 rings at different speeds)
  for (let ring = 0; ring < 2; ring++) {
    ParticleSystem.spawn(x, y, 1, 'default', {
      vx: 0, vy: 0,
      size: radius * 0.2, // starts small, expands
      targetSize: radius * (1.5 + ring * 0.8), // expand target
      decay: 0.04 + ring * 0.02,
      type: isTrickster ? 'tricksterLightningRing' : 'crimsonLightningRing',
      isFlash: true,
      friction: 1,
      color: isTrickster ? 'lime' : 'crimson'
    });
  }

  // 3. Radial lightning arc sparks shooting outward
  const arcCount = 8 + Math.floor(Math.random() * 4);
  for (let i = 0; i < arcCount; i++) {
    const angle = (i / arcCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = 4 + Math.random() * 6;
    const rand = Math.random();
    let color;
    if (isTrickster) {
      color = rand > 0.7 ? 'rgba(255, 255, 255, 1)' : (rand > 0.3 ? 'rgba(50, 255, 50, 1)' : 'rgba(0, 150, 0, 1)');
    } else {
      color = rand > 0.7 ? 'rgba(255, 255, 255, 1)' : (rand > 0.3 ? 'rgba(255, 30, 30, 1)' : 'rgba(150, 0, 0, 1)');
    }

    ParticleSystem.spawn(x, y, 1, 'default', {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      decay: 0.03 + Math.random() * 0.03,
      friction: 0.95,
      type: isTrickster ? 'tricksterLightningArc' : 'crimsonLightningArc',
      isFlash: false,
      angle: angle, // store for drawing direction
      color: color
    });
  }
}

/**
 * Spawns a massive scorch mark decal on the ground.
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} radius - The size of the scorch mark
 * @param {number} durationFrames - How many frames the scorch persists
 */
export function spawnGroundScorch(x, y, radius, durationFrames = 120, colorTheme = 'crimson') {
  const scorch = ParticleSystem.getParticle();
  scorch.x = x;
  scorch.y = y;
  scorch.vx = 0;
  scorch.vy = 0;
  scorch.size = radius;
  scorch.life = 1.0;
  scorch.decay = 1.0 / durationFrames;
  scorch.type = 'groundScorch';
  scorch.color = colorTheme;
  scorch.isFlash = true; // Hook into the flash rendering block

  // 1. Generate an organic, jagged scorch boundary
  scorch.points = scorch.points || [];
  scorch.points.length = 0;
  const numPoints = 16;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const r = radius * (0.6 + Math.random() * 0.5);
    scorch.points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r * 0.5 }); // squished for perspective
  }

  // 2. Generate detailed, static branching cracks
  scorch.cracks = scorch.cracks || [];
  scorch.cracks.length = 0;
  const numCracks = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numCracks; i++) {
    const angle = (i / numCracks) * Math.PI * 2 + (Math.random() - 0.5);
    const crackLength = radius * (0.8 + Math.random() * 0.6);
    let cx = 0, cy = 0;
    const path = [{ x: cx, y: cy }];
    const segments = 4 + Math.floor(Math.random() * 3);
    let currentAngle = angle;
    
    for (let s = 1; s <= segments; s++) {
      currentAngle += (Math.random() - 0.5) * 1.5; // Wander
      const segLen = crackLength / segments;
      cx += Math.cos(currentAngle) * segLen;
      cy += Math.sin(currentAngle) * segLen * 0.5;
      path.push({ x: cx, y: cy });
      
      // Generate a sub-branch occasionally
      if (Math.random() > 0.6) {
         let bx = cx, by = cy;
         let branchAngle = currentAngle + (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.6);
         const branchPath = [{ x: bx, y: by }];
         for (let b = 0; b < 2; b++) {
            bx += Math.cos(branchAngle) * (segLen * 0.8);
            by += Math.sin(branchAngle) * (segLen * 0.8) * 0.5;
            branchPath.push({ x: bx, y: by });
         }
         scorch.cracks.push(branchPath);
      }
    }
    scorch.cracks.push(path);
  }

  state.sparkEffects.push(scorch);
}

/**
 * Spawns an arcane crater (dark green/magical theme)
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} radius - The size of the scorch mark
 * @param {number} durationFrames - How many frames the scorch persists
 */
export function spawnArcaneCrater(x, y, radius, durationFrames = 120) {
  // Use the exact same generation logic as scorch but change type
  spawnGroundScorch(x, y, radius, durationFrames);
  const scorch = state.sparkEffects[state.sparkEffects.length - 1];
  scorch.type = 'arcaneGroundScorch';
}

/**
 * Spawns dark green arcane smoke.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} vx - X velocity
 * @param {number} vy - Y velocity
 * @param {string} smokeType - 'ground', 'airborne', or 'burst'
 */
export function spawnArcaneSmoke(x, y, vx = 0, vy = 0, smokeType = 'burst') {
  const smoke = ParticleSystem.getParticle();
  smoke.x = x;
  smoke.y = y;
  smoke.vx = vx + (Math.random() - 0.5) * 1.5;
  smoke.vy = vy + (Math.random() - 0.5) * 1.5;
  smoke.size = 10 + Math.random() * 10;
  smoke.targetSize = smoke.size + 20 + Math.random() * 20;
  
  if (smokeType === 'ground') {
    smoke.targetSize *= 2; 
    smoke.decay = 0.015 + Math.random() * 0.01;
    smoke.rotationSpeed = (Math.random() - 0.5) * 0.05;
    smoke.type = 'arcaneSmokeGround';
  } else if (smokeType === 'airborne') {
    smoke.size = 25 + Math.random() * 10; // Much larger base size
    smoke.targetSize = smoke.size + 15 + Math.random() * 10; 
    smoke.decay = 0.005 + Math.random() * 0.005; // Very slow decay
    smoke.rotationSpeed = (Math.random() - 0.5) * 0.01; // Very slow rotation
    smoke.type = 'arcaneSmokeAirborne';
  } else {
    smoke.decay = 0.02 + Math.random() * 0.02;
    smoke.rotationSpeed = (Math.random() - 0.5) * 0.05;
    smoke.type = 'arcaneSmoke';
  }
  
  smoke.life = 1.0;
  smoke.friction = 0.92;
  smoke.isFlash = false;
  smoke.rotation = Math.random() * Math.PI * 2;
  
  if (smokeType === 'airborne') {
    // Airborne cloud is ALWAYS a pure, vibrant magical blue/cyan
    smoke.color = `rgba(0, 200, 255, 0.7)`;
  } else {
    // Ground bursts mix light greys and brighter cyans, with much lower opacity
    const isCyan = Math.random() > 0.2; // 80% chance for cyan
    smoke.color = isCyan ? `rgba(0, 180, 255, 0.35)` : `rgba(80, 80, 80, 0.3)`;
  }
  
  state.sparkEffects.push(smoke);
  return smoke;
}

/**
 * Spawns hot, colored smoke escaping from the laser muzzle.
 */
export function spawnLaserSmoke(x, y, vx, vy) {
  const smoke = ParticleSystem.getParticle();
  smoke.x = x;
  smoke.y = y;
  
  // High initial velocity that slows down quickly due to high friction
  smoke.vx = vx + (Math.random() - 0.5) * 2.0;
  smoke.vy = vy + (Math.random() - 0.5) * 2.0;
  
  smoke.size = 5 + Math.random() * 8; // Small initially
  smoke.targetSize = smoke.size + 15 + Math.random() * 20; // Expands heavily
  
  smoke.decay = 0.015 + Math.random() * 0.01; // Dissipates fast
  smoke.rotationSpeed = (Math.random() - 0.5) * 0.08;
  smoke.type = 'laserSmoke';
  
  smoke.life = 1.0;
  smoke.friction = 0.90; // High air resistance
  smoke.isFlash = false;
  smoke.rotation = Math.random() * Math.PI * 2;
  
  const rand = Math.random();
  // Mix of bright orange, white, and dark grey ash smoke
  if (rand > 0.6) {
    smoke.color = 'rgba(255, 120, 0, 0.4)'; // Orange
  } else if (rand > 0.3) {
    smoke.color = 'rgba(255, 255, 255, 0.3)'; // White hot
  } else {
    smoke.color = 'rgba(50, 50, 50, 0.4)'; // Dark ash
  }
  
  state.sparkEffects.push(smoke);
  return smoke;
}

/**
 * Spawns an expanding blue/cyan shockwave ring on impact.
 * @param {number} x 
 * @param {number} y 
 */
export function spawnArcaneShockwave(x, y) {
  // Spawn two overlapping rings - deep blue and cyan - for a layered arcane look
  const blueWave = ParticleSystem.getParticle();
  blueWave.x = x;
  blueWave.y = y;
  blueWave.vx = 0;
  blueWave.vy = 0;
  blueWave.size = 10;
  blueWave.targetSize = 130;
  blueWave.life = 1.0;
  blueWave.decay = 1 / 45; // Slower fade, lasts 45 frames
  blueWave.friction = 0;
  blueWave.type = 'arcaneShockwave';
  blueWave.color = 'rgba(0, 100, 255, 1)'; // Deep blue
  state.sparkEffects.push(blueWave);

  const cyanWave = ParticleSystem.getParticle();
  cyanWave.x = x;
  cyanWave.y = y;
  cyanWave.vx = 0;
  cyanWave.vy = 0;
  cyanWave.size = 5;
  cyanWave.targetSize = 100;
  cyanWave.life = 1.0;
  cyanWave.decay = 1 / 30; // Lasts 30 frames
  cyanWave.friction = 0;
  cyanWave.type = 'arcaneShockwave';
  cyanWave.color = 'rgba(0, 255, 255, 1)'; // Bright Cyan
  state.sparkEffects.push(cyanWave);
}

/**
 * Spawns a bright arcane flash directly beneath the target's feet on landing.
 * @param {number} x
 * @param {number} y
 */
export function spawnArcaneFlash(x, y) {
  const flash = ParticleSystem.getParticle();
  flash.x = x;
  flash.y = y;
  flash.vx = 0;
  flash.vy = 0;
  flash.size = 50;
  flash.targetSize = 90;
  flash.life = 1.0;
  flash.decay = 1 / 30; // Slower flash, lasts 30 frames
  flash.friction = 0;
  flash.type = 'arcaneFlash';
  flash.color = 'rgba(100, 255, 180, 1)'; // Bright green-white
  state.sparkEffects.push(flash);
}

/**
 * Spawns floating arcane glyph fragments (diamonds, triangles, squares) that hover and fade.
 * @param {number} x
 * @param {number} y
 * @param {number} count
 */
export function spawnArcaneGlyphs(x, y, count = 12) {
  const shapes = ['diamond', 'triangle', 'square'];
  const colors = [
    'rgba(30, 200, 100, 1)',  // Green
    'rgba(50, 220, 255, 1)',  // Cyan
    'rgba(100, 255, 180, 1)', // Bright green-white
    'rgba(40, 255, 140, 1)',  // Neon green
  ];
  
  for (let i = 0; i < count; i++) {
    const glyph = ParticleSystem.getParticle();
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 40;
    
    glyph.x = x + Math.cos(angle) * dist;
    glyph.y = y + Math.sin(angle) * dist;
    // Very gentle drift - hover instead of flying outward
    glyph.vx = (Math.random() - 0.5) * 0.8;
    glyph.vy = -0.3 - Math.random() * 0.7; // Slight upward float
    glyph.size = 3 + Math.random() * 5;
    glyph.life = 1.0;
    glyph.decay = 0.015 + Math.random() * 0.015; // ~30-60 frames
    glyph.friction = 0.97;
    glyph.type = 'arcaneGlyph';
    glyph.rotation = Math.random() * Math.PI * 2;
    glyph.rotationSpeed = (Math.random() - 0.5) * 0.1;
    glyph.color = colors[Math.floor(Math.random() * colors.length)];
    glyph.glyphShape = shapes[Math.floor(Math.random() * shapes.length)];
    state.sparkEffects.push(glyph);
  }
}

/**
 * Dead sparks are returned to the pool instead of being spliced out.
 */

export function spawnSpellStealWisps(trickster, target, color, count = 20) {
  for (let i = 0; i < count; i++) {
    const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
    if (state.sparkEffects.length >= (isMulti ? 250 : 500)) return;
    
    const spark = ParticleSystem.getParticle();
    
    // Spawn in a wide circle around the opponent
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = target.r + 30 + Math.random() * 40;
    spark.x = target.x + Math.cos(angle) * spawnDist;
    spark.y = target.y + Math.sin(angle) * spawnDist;
    
    // Initial burst outwards
    spark.vx = Math.cos(angle) * (2 + Math.random() * 5);
    spark.vy = Math.sin(angle) * (2 + Math.random() * 5);
    
    spark.type = 'spellStealWisp';
    spark.isFlash = true;
    spark.targetRef = trickster;
    spark.color = color || '#39FF14'; // Fallback to green
    spark.size = 8 + Math.random() * 6; // Much larger
    spark.life = 1.5; // Start with >1 alpha to persist longer
    spark.decay = 0.01 + Math.random() * 0.01;
    spark.friction = 0.90;
    
    state.sparkEffects.push(spark);
  }
}

/**
 * Update all spark physics and lifespans
 * @param {boolean} frozen - Whether time is stopped (sparks still decay)
 */
export function updateSparkEffects(frozen = false) {
  fastCleanArray(state.sparkEffects, (effect) => {
    // Sparks always decay, even when frozen in time sphere
    effect.life -= effect.decay;

    // Only move if not frozen
    if (!frozen) {
      if (effect.type === 'spellStealWisp' && effect.targetRef && effect.targetRef.hp > 0) {
        // Homing behavior
        const target = effect.targetRef;
        const dx = target.x - effect.x;
        const dy = (target.y - target.r/2) - effect.y; // aim for center
        const dist = Math.hypot(dx, dy) || 1;
        
        effect.vx += (dx / dist) * 1.5;
        effect.vy += (dy / dist) * 1.5;
        
        // Speed limit
        const maxSpeed = 15;
        const speed = Math.hypot(effect.vx, effect.vy);
        if (speed > maxSpeed) {
          effect.vx = (effect.vx / speed) * maxSpeed;
          effect.vy = (effect.vy / speed) * maxSpeed;
        }
        
        if (dist < 30) {
          effect.life -= 0.1; // fade out quickly on hit
        }
      }

      effect.x += effect.vx;
      effect.y += effect.vy;
      effect.vx *= effect.friction;
      effect.vy *= effect.friction;
      
      // Make telekinesis debris continuously bob and drift after stopping
      if (effect.type === 'telekinesisDebris') {
        effect.y += Math.sin(effect.life * 30 + effect.rotation) * 0.4;
        effect.x += Math.cos(effect.life * 20 + effect.rotation) * 0.2;
      }

      if (effect.type === 'tojiWindPebble' || effect.type === 'tojiWindLeaf') {
        effect.orbitAngle = (effect.orbitAngle || 0) + (effect.orbitSpeed || 0.05);
        effect.rotation += effect.rotationSpeed;
        
        // Strict orbital circular motion around Toji's area
        const r = effect.orbitRadius || 50;
        effect.x = effect.cx + Math.cos(effect.orbitAngle) * r;
        effect.y = effect.cy + Math.sin(effect.orbitAngle) * (r * 0.55) + Math.sin(effect.orbitAngle * 3) * 3;
      }
      
      // Make scattered debris roll across the ground
      if (effect.type === 'telekinesisDebrisScattered') {
        const speedSq = effect.vx * effect.vx + effect.vy * effect.vy;
        if (speedSq > 0.01) {
          const speed = Math.sqrt(speedSq);
          // Roll based on speed and inverse size (smaller rocks roll faster)
          effect.rotation += (effect.vx > 0 ? speed : -speed) / (effect.size * 2);
        }
      }
    }

    // --- PIXIJS SYNC ---
    if (effect.isPixi && effect.sprite) {
      effect.sprite.x = effect.x;
      effect.sprite.y = effect.y;
      effect.sprite.alpha = effect.life;
      effect.sprite.rotation = effect.rotation;
    }

    // Remove dead effects — return to pool instead of splice
    if (effect.life <= 0) {
      ParticleSystem.returnParticle(effect);
      return false;
    }
    return true;
  });
}

/**
 * Draws all spark effects using gradient-based glow (no shadowBlur).
 */
export function drawSparkEffects(layer = 'all') {
  const { ctx } = state;
  if (!ctx) return;

  const isGamePlay = (typeof state !== 'undefined' && state.gameState && ['fight', 'countdown', 'paused', 'roundEnd', 'matchEnd', 'playing'].includes(state.gameState));

  for (const effect of state.sparkEffects) {
    // PixiJS sparks are rendered in the WebGL scene graph, so we skip drawing them in 2D
    if (effect.isPixi) continue;

    const isBackground = effect.type === 'groundScorch' || 
                         effect.type === 'arcaneGroundScorch';
    
    if (layer === 'background' && !isBackground) continue;
    if (layer === 'foreground' && isBackground) continue;

    // Skip effects with non-finite coordinates to prevent createRadialGradient errors
    if (!Number.isFinite(effect.x) || !Number.isFinite(effect.y) || !Number.isFinite(effect.size)) continue;

    ctx.save();
    ctx.globalAlpha = effect.life;

    if (effect.isFlash) {
      if (effect.type === 'crimsonLightningCore' || effect.type === 'tricksterLightningCore') {
        // Sharp blinding core flash with jagged edges
        const isTrickster = effect.type === 'tricksterLightningCore';
        effect.size += (100 * 0.8 - effect.size) * 0.2; // Expand fast
        ctx.fillStyle = `rgba(255, 255, 255, ${effect.life})`;
        
        ctx.beginPath();
        // Draw a starburst/jagged flash shape
        const points = 12;
        for (let p = 0; p < points; p++) {
          const angle = (p / points) * Math.PI * 2;
          const r = p % 2 === 0 ? effect.size : effect.size * 0.4;
          const px = effect.x + Math.cos(angle) * r;
          const py = effect.y + Math.sin(angle) * r;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        
        // Outer colored glow (GPU blend mode lighter for fast zero-lag glow)
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = isTrickster ? `rgba(100, 255, 100, ${effect.life * 0.5})` : `rgba(255, 50, 50, ${effect.life * 0.5})`;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'mahitoSoulBubble') {
        ctx.globalCompositeOperation = 'source-over';
        const col = effect.bubbleColor || { fill: 'rgba(217, 70, 239, 0.65)', stroke: '#F5D0FE' };
        const curSize = effect.size + (effect.targetSize - effect.size) * (1 - effect.life);
        const wobbleX = Math.sin((effect.wobblePhase || 0) + (1 - effect.life) * 8) * 4;
        const px = effect.x + wobbleX;
        const py = effect.y;

        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, curSize), 0, Math.PI * 2);
        ctx.fillStyle = col.fill;
        ctx.fill();

        ctx.lineWidth = 1.2;
        ctx.strokeStyle = col.stroke;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px - curSize * 0.35, py - curSize * 0.35, Math.max(0.5, curSize * 0.28), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${effect.life * 0.85})`;
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'groundScorch') {
        // Massive, highly-detailed organic scorch mark burned into the ground
        if (!isGamePlay) ctx.globalCompositeOperation = 'multiply';
        
        ctx.translate(effect.x, effect.y);

        // Deep burned organic polygon (dark blue/black for thunder, dark red/black for crimson)
        const isThunder = effect.color === 'thunder';
        ctx.fillStyle = isThunder ? `rgba(0, 10, 30, ${effect.life * 0.8})` : `rgba(30, 0, 0, ${effect.life * 0.8})`;
        ctx.beginPath();
        if (effect.points && effect.points.length > 0) {
          ctx.moveTo(effect.points[0].x, effect.points[0].y);
          for (let i = 1; i < effect.points.length; i++) {
            ctx.lineTo(effect.points[i].x, effect.points[i].y);
          }
        }
        ctx.closePath();
        ctx.fill();
        
        // Inner molten branching cracks (cyan for thunder, orange/red for crimson)
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = isThunder ? `rgba(0, 220, 255, ${effect.life * 0.8})` : `rgba(255, 60, 10, ${effect.life * 0.8})`;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1 + effect.life * 1.5;
        
        ctx.beginPath();
        if (effect.cracks && !isThunder) {
          // Rapidly shoot the cracks outward like a shockwave fracture!
          const shockwaveProgress = Math.min(1.0, (1.0 - effect.life) * 12.0); // Reaches 1.0 extremely fast

          ctx.strokeStyle = `rgba(255, 60, 10, ${effect.life * 0.8})`;
          ctx.lineWidth = 1 + effect.life * 1.5;
          for (const path of effect.cracks) {
            if (path.length > 0) {
              const drawSegments = Math.max(1, Math.floor(path.length * shockwaveProgress));
              ctx.moveTo(path[0].x, path[0].y);
              for (let i = 1; i < drawSegments; i++) {
                ctx.lineTo(path[i].x, path[i].y);
              }
            }
          }
          ctx.stroke();
        }
      } else if (effect.type === 'thunderSpark') {
        // Draw as a small jagged lightning bolt trailing behind its velocity
        ctx.strokeStyle = effect.color.replace('1)', `${effect.life})`);
        ctx.lineWidth = effect.size * 0.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(effect.x, effect.y);
        
        // Draw a jagged tail based on velocity
        const tailX = effect.x - effect.vx * 3;
        const tailY = effect.y - effect.vy * 3;
        const midX = (effect.x + tailX) / 2 + (Math.random() - 0.5) * effect.size * 3;
        const midY = (effect.y + tailY) / 2 + (Math.random() - 0.5) * effect.size * 3;
        
        ctx.lineTo(midX, midY);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        
      } else if (effect.type === 'arcaneGroundScorch') {
        // Massive, highly-detailed organic scorch mark burned into the ground
        if (!isGamePlay) ctx.globalCompositeOperation = 'multiply';
        
        ctx.translate(effect.x, effect.y);

        // Deep black/blue burned organic polygon
        ctx.fillStyle = `rgba(10, 15, 30, ${effect.life * 0.8})`;
        ctx.beginPath();
        if (effect.points && effect.points.length > 0) {
          ctx.moveTo(effect.points[0].x, effect.points[0].y);
          for (let i = 1; i < effect.points.length; i++) {
            ctx.lineTo(effect.points[i].x, effect.points[i].y);
          }
        }
        ctx.closePath();
        ctx.fill();
        
        // Inner molten branching cracks (glowing blue/cyan)
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(40, 200, 255, ${effect.life * 0.8})`;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1 + effect.life * 1.5;
        
        ctx.beginPath();
        if (effect.cracks) {
          for (const path of effect.cracks) {
            if (path.length > 0) {
              ctx.moveTo(path[0].x, path[0].y);
              for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
              }
            }
          }
        }
        ctx.stroke();
        
        // Darker outer cracks for depth
        ctx.strokeStyle = `rgba(0, 10, 40, ${effect.life * 0.9})`; // Dark blue/black
        ctx.lineWidth = 2 + effect.life * 2;
        if (!isGamePlay) ctx.globalCompositeOperation = 'multiply';
        ctx.stroke();
        
        ctx.translate(-effect.x, -effect.y);
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'crimsonLightningRing' || effect.type === 'tricksterLightningRing') {
        const isTrickster = effect.type === 'tricksterLightningRing';
        // Expanding jagged crimson shockwave ring
        // Expand size toward target
        if (effect.targetSize) {
          effect.size += (effect.targetSize - effect.size) * 0.15;
        }
        ctx.strokeStyle = isTrickster ? `rgba(0, 200, 0, ${effect.life * 0.8})` : `rgba(200, 0, 0, ${effect.life * 0.8})`;
        ctx.lineWidth = 3 * effect.life;
        ctx.beginPath();
        // Draw jagged circle instead of smooth
        const segments = 24;
        for (let seg = 0; seg <= segments; seg++) {
          const theta = (seg / segments) * Math.PI * 2;
          const jitter = (Math.random() - 0.5) * effect.size * 0.15;
          const rx = effect.x + Math.cos(theta) * (effect.size + jitter);
          const ry = effect.y + Math.sin(theta) * (effect.size + jitter);
          if (seg === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
        // Inner white ring
        ctx.strokeStyle = isTrickster ? `rgba(200, 255, 200, ${effect.life * 0.5})` : `rgba(255, 200, 200, ${effect.life * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let seg = 0; seg <= segments; seg++) {
          const theta = (seg / segments) * Math.PI * 2;
          const jitter = (Math.random() - 0.5) * effect.size * 0.1;
          const rx = effect.x + Math.cos(theta) * (effect.size * 0.85 + jitter);
          const ry = effect.y + Math.sin(theta) * (effect.size * 0.85 + jitter);
          if (seg === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (effect.type === 'crimsonSniperFlash') {
        // Impact flash - radial gradient glow (cached: stops are life-independent, fade via ctx.globalAlpha)
        const gradient = getUnitRadialGradient(ctx, 'crimsonSniperFlash', [
          [0, 'rgba(0, 0, 0, 0.8)'],
          [0.3, 'rgba(200, 0, 20, 0.6)'],
          [1, 'rgba(50, 0, 0, 0)']
        ]);
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.scale(effect.size, effect.size);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
      } else if (effect.type === 'arcaneAscendLine') {
        // ── Pixel Art Style Regen / Healing Ascending Particle ──
        const P = 2.0;
        const snap = (v) => Math.round(v / P) * P;
        const cx = snap(effect.x);
        const cy = snap(effect.y);
        const alpha = Math.max(0, Math.min(1.0, effect.life));
        const baseColor = effect.color || 'rgba(0, 255, 102, 1)';

        // 1. Leading Pixel Art Cross / Sparkle (+)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        // White-hot center pixel
        ctx.fillRect(cx - P * 0.5, cy - P * 0.5, P, P);

        // 4 cardinal pixel arms (Regen Emerald / Green)
        ctx.fillStyle = baseColor.replace(/[\d\.]+\)$/, `${(alpha * 0.95).toFixed(2)})`);
        ctx.fillRect(cx - P * 1.5, cy - P * 0.5, P, P); // Left
        ctx.fillRect(cx + P * 0.5, cy - P * 0.5, P, P); // Right
        ctx.fillRect(cx - P * 0.5, cy - P * 1.5, P, P); // Top
        ctx.fillRect(cx - P * 0.5, cy + P * 0.5, P, P); // Bottom

        // Outer corner glow pixels (soft halo)
        ctx.fillStyle = baseColor.replace(/[\d\.]+\)$/, `${(alpha * 0.40).toFixed(2)})`);
        ctx.fillRect(cx - P * 2.5, cy - P * 0.5, P, P);
        ctx.fillRect(cx + P * 1.5, cy - P * 0.5, P, P);
        ctx.fillRect(cx - P * 0.5, cy - P * 2.5, P, P);
        ctx.fillRect(cx - P * 0.5, cy + P * 1.5, P, P);

        // 2. Stepped Ascending Pixel Tail trailing behind
        const tailSteps = 4;
        for (let s = 1; s <= tailSteps; s++) {
          const tNorm = s / tailSteps;
          const tx = snap(effect.x - effect.vx * s * 3.5);
          const ty = snap(effect.y - effect.vy * s * 3.5);
          const tailAlpha = alpha * (1 - tNorm) * 0.75;
          if (tailAlpha > 0.05) {
            ctx.fillStyle = (s === 1)
              ? `rgba(255, 255, 255, ${tailAlpha.toFixed(2)})`
              : baseColor.replace(/[\d\.]+\)$/, `${tailAlpha.toFixed(2)})`);
            ctx.fillRect(tx - P * 0.5, ty - P * 0.5, P, P);
          }
        }
      } else if (effect.type === 'arcaneShockwave') {
        // Expanding dark green shockwave ring
        effect.size += (effect.targetSize - effect.size) * 0.06; // Much slower, graceful expansion
        
        ctx.globalCompositeOperation = 'lighter'; // Neon additive edge
        
        // Simulated glow ring
        ctx.strokeStyle = effect.color.replace('1)', `${effect.life * 0.25})`);
        ctx.lineWidth = 12 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();

        // Main ring
        ctx.strokeStyle = effect.color.replace('1)', `${effect.life})`);
        ctx.lineWidth = 6 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'mahoragaShoutShockwave') {
        // Expanding golden & silver roar shockwave ring
        if (effect.targetSize) {
          effect.size += (effect.targetSize - effect.size) * 0.16;
        }
        
        // 1. Golden Outer Glow Ring
        ctx.strokeStyle = `rgba(255, 215, 0, ${effect.life * 0.85})`;
        ctx.lineWidth = 7 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Silver Contrast Ring
        ctx.strokeStyle = `rgba(224, 232, 255, ${effect.life * 0.9})`;
        ctx.lineWidth = 3 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size * 0.95), 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === 'rikaRoarShockwave') {
        // Expanding hot-pink & dark ink cursed roar shockwave ring
        if (effect.targetSize) {
          effect.size += (effect.targetSize - effect.size) * 0.16;
        }
        
        const isGamePlay = (typeof state !== 'undefined' && state.gameState && ['fight', 'countdown', 'paused', 'roundEnd', 'matchEnd', 'playing'].includes(state.gameState));
        if (isGamePlay) {
          // Gameplay-optimized dual-stroke ring
          ctx.strokeStyle = `rgba(255, 20, 147, ${effect.life * 0.85})`;
          ctx.lineWidth = 6 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
          ctx.lineWidth = 2.5 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size * 0.94), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // 1. Hot Pink Outer Glow Ring
          ctx.strokeStyle = `rgba(255, 20, 147, ${effect.life * 0.85})`;
          ctx.lineWidth = 7 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
          ctx.stroke();

          // 2. High-contrast Black Ink Outline Ring (visible on light backgrounds)
          ctx.strokeStyle = `rgba(10, 2, 5, ${effect.life * 0.9})`;
          ctx.lineWidth = 3 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size * 0.95), 0, Math.PI * 2);
          ctx.stroke();

          // 3. Piercing White-Hot Inner Core Ring
          ctx.strokeStyle = `rgba(255, 240, 245, ${effect.life * 0.95})`;
          ctx.lineWidth = 2 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size * 0.92), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (effect.type === 'mahitoSoulShockwave') {
        // Expanding nested pixel-art magenta & cyan soul disfigurement shockwave rings
        if (effect.targetSize) {
          effect.size += (effect.targetSize - effect.size) * 0.16;
        }

        const P = 2.5; // Stepped pixel grid size
        const radius = effect.size;
        const steps = Math.ceil(radius / P);

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        if (effect.color === 'magenta') {
          // Stepped pixel shockwave ring (hot purple/magenta)
          ctx.fillStyle = `rgba(217, 70, 239, ${(effect.life * 0.85).toFixed(3)})`;
          for (let gy = -steps; gy <= steps; gy++) {
            for (let gx = -steps; gx <= steps; gx++) {
              const dist = Math.hypot(gx * P, gy * P);
              if (dist <= radius + P && dist > radius - P * 1.5) {
                if ((gx + gy) % 2 === 0 || effect.life > 0.5) {
                  ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
                }
              }
            }
          }

          // Dark ink contrast pixel ring
          ctx.fillStyle = `rgba(15, 5, 20, ${(effect.life * 0.90).toFixed(3)})`;
          for (let gy = -steps; gy <= steps; gy++) {
            for (let gx = -steps; gx <= steps; gx++) {
              const dist = Math.hypot(gx * P, gy * P);
              if (dist <= radius - P * 1.5 && dist > radius - P * 2.5) {
                ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
              }
            }
          }
        } else {
          // Inner cyan/white pixel shockwave ring
          ctx.fillStyle = `rgba(0, 229, 255, ${(effect.life * 0.90).toFixed(3)})`;
          for (let gy = -steps; gy <= steps; gy++) {
            for (let gx = -steps; gx <= steps; gx++) {
              const dist = Math.hypot(gx * P, gy * P);
              if (dist <= radius + P && dist > radius - P * 1.2) {
                ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
              }
            }
          }

          // Bright white core pixel ring
          ctx.fillStyle = `rgba(255, 255, 255, ${(effect.life * 0.95).toFixed(3)})`;
          for (let gy = -steps; gy <= steps; gy++) {
            for (let gx = -steps; gx <= steps; gx++) {
              const dist = Math.hypot(gx * P, gy * P);
              if (dist <= radius && dist > radius - P * 0.8) {
                ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
              }
            }
          }
        }
        ctx.restore();
      } else if (effect.type === 'mahitoSoulCoreFlash') {
        // Stepped 8-bit starburst flash representing organic soul shifting & blood rupture
        effect.size += (effect.targetSize - effect.size) * 0.22;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const P = 2.5;

        // 1. Pixel Art 8-Bit Starburst Core
        const points = 16;
        for (let p = 0; p < points; p++) {
          const angle = (p / points) * Math.PI * 2;
          const factor = (p % 4 === 0) ? 1.0 : (p % 2 === 0 ? 0.65 : 0.35);
          const rayLen = effect.size * factor;
          const raySteps = Math.max(1, Math.round(rayLen / P));

          ctx.fillStyle = (p % 2 === 0) 
            ? `rgba(220, 38, 38, ${(effect.life * 0.85).toFixed(3)})` 
            : `rgba(217, 70, 239, ${(effect.life * 0.90).toFixed(3)})`;

          for (let s = 0; s <= raySteps; s++) {
            const rx = Math.round((effect.x + Math.cos(angle) * s * P) / P) * P;
            const ry = Math.round((effect.y + Math.sin(angle) * s * P) / P) * P;
            ctx.fillRect(rx, ry, P, P);
          }
        }

        // 2. Pure-White 4-Point Pixel Core Diamond
        ctx.fillStyle = `rgba(255, 255, 255, ${(effect.life * 0.95).toFixed(3)})`;
        const coreSize = Math.max(P * 2, Math.round((effect.size * 0.25) / P) * P);
        ctx.fillRect(effect.x - coreSize, effect.y - P, coreSize * 2, P * 2);
        ctx.fillRect(effect.x - P, effect.y - coreSize, P * 2, coreSize * 2);

        ctx.restore();
      } else if (effect.type === 'mahitoClawScratchBurst') {
        // 5-Blade Razor Claw Slash Lacerations cutting across target
        const ang = effect.angle || 0;
        const radius = effect.size || 35;
        const alpha = Math.sin(effect.life * Math.PI);
        const slashOffsets = [-14, -7, 0, 7, 14];

        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(ang);

        slashOffsets.forEach((offY, idx) => {
          const cutLen = radius * (1.1 + (2 - Math.abs(idx - 2)) * 0.25);
          const startX = -cutLen * 0.5;
          const endX = cutLen * 0.5;
          const thick = (idx === 2 ? 3.5 : 2.5) * alpha;

          // Double-tapered razor laceration streak
          ctx.beginPath();
          ctx.moveTo(startX, offY);
          ctx.quadraticCurveTo(0, offY - thick, endX, offY);
          ctx.quadraticCurveTo(0, offY + thick, startX, offY);
          ctx.closePath();

          // Crimson + Magenta Cursed Energy fill
          ctx.fillStyle = (idx % 2 === 0)
            ? `rgba(220, 38, 38, ${(0.92 * alpha).toFixed(3)})`
            : `rgba(217, 70, 239, ${(0.88 * alpha).toFixed(3)})`;
          ctx.fill();

          // White-hot core streak
          ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(startX, offY);
          ctx.lineTo(endX, offY);
          ctx.stroke();
        });

        ctx.restore();
      } else if (effect.type === 'mahitoDomainSoulTendrilStrike') {
        // Long-range Transfigured Flesh Tendril / Soul Arm reaching from Mahito to target
        const startX = effect.startX !== undefined ? effect.startX : effect.x;
        const startY = effect.startY !== undefined ? effect.startY : effect.y;
        const targetX = effect.targetX !== undefined ? effect.targetX : effect.x;
        const targetY = effect.targetY !== undefined ? effect.targetY : effect.y;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const totalDist = Math.hypot(dx, dy) || 1;
        const baseAngle = Math.atan2(dy, dx);
        const cosA = Math.cos(baseAngle);
        const sinA = Math.sin(baseAngle);
        const perpX = -sinA;
        const perpY = cosA;

        const progress = 1.0 - effect.life; // 0 to 1
        const reachRatio = Math.min(1.0, progress / 0.20);
        const easeReach = Math.sin(reachRatio * (Math.PI / 2));
        const currentDist = totalDist * easeReach;
        const currentEndX = startX + cosA * currentDist;
        const currentEndY = startY + sinA * currentDist;

        const alpha = Math.sin(effect.life * Math.PI);
        if (alpha > 0.01) {
          ctx.save();

          // 1. Outer Cursed Energy Aura Glow Stream (Magenta/Violet)
          ctx.strokeStyle = effect.isTransformed
            ? `rgba(217, 70, 239, ${(0.65 * alpha).toFixed(3)})`
            : `rgba(192, 38, 211, ${(0.60 * alpha).toFixed(3)})`;
          ctx.lineWidth = 14.0 * alpha;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          const segments = Math.max(6, Math.floor(currentDist / 22));
          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const px = startX + (currentEndX - startX) * t;
            const py = startY + (currentEndY - startY) * t;
            const wave = Math.sin(t * Math.PI * 3 + (effect.wobblePhase || 0) + progress * 12) * (6.0 * (1 - t * 0.4));
            ctx.lineTo(px + perpX * wave, py + perpY * wave);
          }
          ctx.stroke();

          // 2. Dense Transfigured Flesh Tendril Body (Dark violet / organic muscle sinew)
          ctx.strokeStyle = effect.isTransformed ? '#4A044E' : '#3B0764';
          ctx.lineWidth = 7.5 * alpha;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const px = startX + (currentEndX - startX) * t;
            const py = startY + (currentEndY - startY) * t;
            const wave = Math.sin(t * Math.PI * 3 + (effect.wobblePhase || 0) + progress * 12) * (5.0 * (1 - t * 0.4));
            ctx.lineTo(px + perpX * wave, py + perpY * wave);
          }
          ctx.stroke();

          // 3. Inner Luminous Lilac-White Soul Channel
          ctx.strokeStyle = `rgba(245, 208, 254, ${(0.92 * alpha).toFixed(3)})`;
          ctx.lineWidth = 2.2 * alpha;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const px = startX + (currentEndX - startX) * t;
            const py = startY + (currentEndY - startY) * t;
            const wave = Math.sin(t * Math.PI * 3 + (effect.wobblePhase || 0) + progress * 12) * (3.5 * (1 - t * 0.4));
            ctx.lineTo(px + perpX * wave, py + perpY * wave);
          }
          ctx.stroke();

          // 4. Black Surgical Stitches crossing the tendril at segment joints
          ctx.strokeStyle = `rgba(15, 15, 20, ${(0.95 * alpha).toFixed(3)})`;
          ctx.lineWidth = 1.8 * alpha;
          for (let s = 1; s < segments; s++) {
            if (s % 2 === 0) {
              const t = s / segments;
              const px = startX + (currentEndX - startX) * t;
              const py = startY + (currentEndY - startY) * t;
              const wave = Math.sin(t * Math.PI * 3 + (effect.wobblePhase || 0) + progress * 12) * (4.0 * (1 - t * 0.4));
              const cx = px + perpX * wave;
              const cy = py + perpY * wave;
              ctx.beginPath();
              ctx.moveTo(cx - perpX * 5.0, cy - perpY * 5.0);
              ctx.lineTo(cx + perpX * 5.0, cy + perpY * 5.0);
              ctx.stroke();
            }
          }

          // 5. Giant Transfigured Claw at Tip (materializing as it reaches target)
          if (reachRatio >= 0.5) {
            ctx.save();
            ctx.translate(currentEndX, currentEndY);
            ctx.rotate(baseAngle);

            const clawTalons = [-10, -3.5, 3.5, 10];
            clawTalons.forEach((offY, cIdx) => {
              const talonLen = (cIdx === 1 || cIdx === 2) ? 26 : 19;
              ctx.fillStyle = effect.isTransformed ? '#C026D3' : '#F5D0FE';
              ctx.beginPath();
              ctx.moveTo(-4, offY);
              ctx.lineTo(talonLen, offY * 0.6);
              ctx.lineTo(-4, offY + (offY >= 0 ? 2.5 : -2.5));
              ctx.closePath();
              ctx.fill();

              ctx.strokeStyle = '#181C26';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            });

            // Hand knuckle node
            ctx.fillStyle = effect.isTransformed ? '#3B0764' : '#581C87';
            ctx.beginPath();
            ctx.arc(-2, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#F5D0FE';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.restore();
          }

          ctx.restore();
        }
      } else if (effect.type === 'saitamaCounterFrontalBlast') {
        // Massive Wide Long Frontal Supersonic Shockwave Blast (PIXEL ART STYLE - YELLOW CONE SHAPE)
        const startX = effect.x;
        const startY = effect.y;
        const angle = effect.angle || 0;
        const reach = effect.reach || 750;
        const arc = effect.arcAngle || (Math.PI * 0.75);
        const progress = 1.0 - effect.life; // 0 to 1
        const alpha = Math.sin(effect.life * Math.PI);

        if (alpha > 0.01) {
          ctx.save();
          ctx.translate(startX, startY);
          ctx.rotate(angle);

          const P = 3.0; // Pixel art grid scale
          const snap = (v) => Math.round(v / P) * P;

          // Fast supersonic expansion along length: reaches full length by progress = 0.25
          const currentReach = reach * Math.min(1.0, progress * 4.0);

          // ── 1. PIXEL-ART FRACTURED YELLOW CONCUSSIVE CONE SHARDS ──
          const shardPolys = [
            // Top outer wing shard
            [ { x: 0, y: 0 }, { x: currentReach * 0.40, y: -currentReach * 0.32 }, { x: currentReach * 0.65, y: -currentReach * 0.16 }, { x: currentReach * 0.32, y: 0 } ],
            // Top mid shard
            [ { x: 0, y: 0 }, { x: currentReach * 0.65, y: -currentReach * 0.16 }, { x: currentReach * 0.92, y: 0 }, { x: currentReach * 0.60, y: currentReach * 0.08 } ],
            // Bottom mid shard
            [ { x: 0, y: 0 }, { x: currentReach * 0.60, y: currentReach * 0.08 }, { x: currentReach * 0.88, y: currentReach * 0.20 }, { x: currentReach * 0.38, y: currentReach * 0.32 } ],
            // Bottom outer wing shard
            [ { x: 0, y: 0 }, { x: currentReach * 0.38, y: currentReach * 0.32 }, { x: currentReach * 0.62, y: currentReach * 0.42 }, { x: currentReach * 0.25, y: currentReach * 0.15 } ],
            // Centerline supersonic piercing shard
            [ { x: currentReach * 0.32, y: 0 }, { x: currentReach * 0.92, y: 0 }, { x: currentReach * 1.08, y: 0 }, { x: currentReach * 0.75, y: -currentReach * 0.06 } ]
          ];

          shardPolys.forEach((pts, sIdx) => {
            // Pass 1: Pixel Outline
            ctx.fillStyle = '#111114';
            for (let j = 0; j < pts.length; j++) {
              const p1 = pts[j];
              const p2 = pts[(j + 1) % pts.length];
              const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              const steps = Math.max(2, Math.round(dist / P));
              for (let st = 0; st <= steps; st++) {
                const rx = p1.x + (p2.x - p1.x) * (st / steps);
                const ry = p1.y + (p2.y - p1.y) * (st / steps);
                ctx.fillRect(snap(rx) - P * 0.5, snap(ry) - P * 0.5, P * 2, P * 2);
              }
            }

            // Pass 2: Stepped Yellow/Gold Shard Body
            const shardCol = (sIdx % 2 === 0) 
              ? `rgba(255, 235, 59, ${(0.85 * alpha).toFixed(3)})`  // Radiant Safety Yellow
              : `rgba(255, 215, 0, ${(0.90 * alpha).toFixed(3)})`;   // Vivid Golden Yellow
            ctx.fillStyle = shardCol;
            ctx.beginPath();
            pts.forEach((pt, pIdx) => {
              const px = snap(pt.x);
              const py = snap(pt.y);
              if (pIdx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.fill();

            // Pass 3: White-Hot Highlight Edge Pixels
            ctx.fillStyle = `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})`;
            for (let j = 0; j < pts.length; j++) {
              const p1 = pts[j];
              const p2 = pts[(j + 1) % pts.length];
              const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              const steps = Math.max(1, Math.round(dist / (P * 2)));
              for (let st = 0; st <= steps; st++) {
                const rx = p1.x + (p2.x - p1.x) * (st / steps);
                const ry = p1.y + (p2.y - p1.y) * (st / steps);
                ctx.fillRect(snap(rx), snap(ry), P, P);
              }
            }
          });

          // ── 2. STEPPED PIXEL JAGGED CONCUSSIVE FISSURE SHOCKWAVE LINES ──
          const fissures = [
            [ { x: 0, y: 0 }, { x: currentReach * 0.20, y: -currentReach * 0.12 }, { x: currentReach * 0.45, y: -currentReach * 0.22 }, { x: currentReach * 0.70, y: -currentReach * 0.32 } ],
            [ { x: 0, y: 0 }, { x: currentReach * 0.25, y: 0 }, { x: currentReach * 0.55, y: currentReach * 0.02 }, { x: currentReach * 0.85, y: -currentReach * 0.02 }, { x: currentReach * 1.10, y: 0 } ],
            [ { x: 0, y: 0 }, { x: currentReach * 0.18, y: currentReach * 0.10 }, { x: currentReach * 0.42, y: currentReach * 0.20 }, { x: currentReach * 0.68, y: currentReach * 0.30 } ]
          ];

          fissures.forEach(fiss => {
            ctx.fillStyle = `rgba(255, 255, 255, ${(0.98 * alpha).toFixed(3)})`;
            for (let j = 0; j < fiss.length - 1; j++) {
              const p1 = fiss[j];
              const p2 = fiss[j + 1];
              const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              const steps = Math.max(2, Math.round(dist / P));
              for (let st = 0; st <= steps; st++) {
                const rx = p1.x + (p2.x - p1.x) * (st / steps);
                const ry = p1.y + (p2.y - p1.y) * (st / steps);
                ctx.fillRect(snap(rx), snap(ry), P * 1.5, P * 1.5);
              }
            }
          });

          // ── 3. CONCENTRIC STEPPED PIXEL ARC SHOCKWAVE RINGS ──
          const numRings = 3;
          for (let rIdx = 0; rIdx < numRings; rIdx++) {
            const ringDist = currentReach * (0.35 + rIdx * 0.30);
            const ringArc = arc * 0.75;
            const ringSteps = 16;
            ctx.fillStyle = `rgba(255, 235, 59, ${(0.75 * alpha).toFixed(3)})`;
            for (let st = 0; st <= ringSteps; st++) {
              const ang = -ringArc * 0.5 + (st / ringSteps) * ringArc;
              const rx = Math.cos(ang) * ringDist;
              const ry = Math.sin(ang) * ringDist;
              ctx.fillRect(snap(rx), snap(ry), P * 1.5, P * 1.5);
            }
          }

          // ── 4. FLOATING SHATTERED GOLDEN PIXEL EMBERS ──
          const numEmbers = 12;
          for (let eb = 0; eb < numEmbers; eb++) {
            const ebSeed = eb * 19.7 + progress * 40;
            const ebX = snap(currentReach * (0.15 + (eb % 6) * 0.15) + (ebSeed * 0.5));
            const ebY = snap(((eb % 4) - 1.5) * (currentReach * 0.18) + Math.sin(ebSeed) * 15);
            ctx.fillStyle = (eb % 2 === 0) ? '#FFEE58' : '#FFFFFF';
            ctx.fillRect(ebX, ebY, P, P);
          }

          ctx.restore();
        }
      } else if (effect.type === 'cursedBiteMaw') {
        // Cursed Jaw Bite Attack Visual (Fanged jaws snapping shut over target)
        const ang = effect.angle || 0;
        const progress = 1.0 - effect.life;
        const snapProgress = Math.min(1.0, progress / 0.50);
        const easeSnap = Math.pow(snapProgress, 2.5);
        const currentJawAngle = (1.0 - easeSnap) * 0.70 + 0.03;

        const jawRadius = effect.size || 28;
        const mainColor = effect.color || '#D946EF';

        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(ang);

        for (let side = -1; side <= 1; side += 2) {
          ctx.save();
          ctx.rotate(side * currentJawAngle);

          // Cursed Dark Jaw Frame
          ctx.fillStyle = '#181C26';
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 2.2;

          ctx.beginPath();
          ctx.arc(0, 0, jawRadius, -Math.PI * 0.35, Math.PI * 0.35);
          ctx.lineTo(jawRadius * 0.2, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Sharp Fanged Teeth (3 large white fangs per jaw)
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.0;

          const teethAngles = [-Math.PI * 0.22, 0, Math.PI * 0.22];
          teethAngles.forEach(tAng => {
            const fangBaseX = Math.cos(tAng) * jawRadius;
            const fangBaseY = Math.sin(tAng) * jawRadius;
            const fangTipX = Math.cos(tAng) * (jawRadius * 0.55);
            const fangTipY = Math.sin(tAng) * (jawRadius * 0.55);
            const perpX = -Math.sin(tAng) * 3.5;
            const perpY = Math.cos(tAng) * 3.5;

            ctx.beginPath();
            ctx.moveTo(fangBaseX + perpX, fangBaseY + perpY);
            ctx.lineTo(fangTipX, fangTipY);
            ctx.lineTo(fangBaseX - perpX, fangBaseY - perpY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });

          ctx.restore();
        }

        // Central Impact Crunch Flash when jaws snap shut
        if (snapProgress >= 0.8) {
          ctx.fillStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
          ctx.beginPath();
          ctx.arc(0, 0, jawRadius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      } else if (effect.type === 'arcaneFlash') {
        // Bright radial flash beneath feet on landing
        effect.size += (effect.targetSize - effect.size) * 0.06; // Slower size blooming

        // Cache gradient per quantized life step (unit radius, reused via translate+scale below)
        const lifeStep = Math.round(effect.life * 20) / 20;
        const gradient = getUnitRadialGradient(ctx, `arcaneFlash_${lifeStep}`, [
          [0, `rgba(200, 255, 230, ${lifeStep * 0.9})`],
          [0.3, `rgba(100, 255, 180, ${lifeStep * 0.6})`],
          [0.7, `rgba(30, 200, 100, ${lifeStep * 0.3})`],
          [1, 'rgba(30, 200, 100, 0)']
        ]);

        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.scale(effect.size, effect.size);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'arcaneGlyph') {
        // Floating arcane glyph fragments - diamonds, triangles, squares
        ctx.translate(effect.x, effect.y);
        effect.rotation += effect.rotationSpeed;
        ctx.rotate(effect.rotation);
        
        // ctx.globalCompositeOperation = 'lighter'; // Removed so it shows up on white backgrounds!
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = effect.color.replace('1)', `${effect.life})`);
        const s = effect.size;
        ctx.beginPath();
        
        if (effect.glyphShape === 'diamond') {
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.6, 0);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.6, 0);
          ctx.closePath();
        } else if (effect.glyphShape === 'triangle') {
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.85, s * 0.7);
          ctx.lineTo(-s * 0.85, s * 0.7);
          ctx.closePath();
        } else { // square
          ctx.rect(-s * 0.5, -s * 0.5, s, s);
        }
        
        ctx.fill();
        
        // Thin bright outline for crispness
        ctx.strokeStyle = `rgba(200, 255, 230, ${effect.life * 0.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.rotate(-effect.rotation);
        ctx.translate(-effect.x, -effect.y);
      } else if (effect.type === 'healing') {
        // ── Pixel Art Style Healing / RCT Sparkle (+) ──
        const P = 2.0;
        const snap = (v) => Math.round(v / P) * P;
        const cx = snap(effect.x);
        const cy = snap(effect.y);
        const alpha = Math.max(0, Math.min(1.0, effect.life));
        const col = effect.color || 'rgba(56, 189, 248, 1)';

        // White-hot center pixel
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
        ctx.fillRect(cx - P * 0.5, cy - P * 0.5, P, P);

        // 4 cardinal healing arms
        ctx.fillStyle = col.replace(/[\d\.]+\)$/, `${(alpha * 0.90).toFixed(2)})`);
        ctx.fillRect(cx - P * 1.5, cy - P * 0.5, P, P);
        ctx.fillRect(cx + P * 0.5, cy - P * 0.5, P, P);
        ctx.fillRect(cx - P * 0.5, cy - P * 1.5, P, P);
        ctx.fillRect(cx - P * 0.5, cy + P * 0.5, P, P);

        // Soft corner pixel halo
        ctx.fillStyle = col.replace(/[\d\.]+\)$/, `${(alpha * 0.35).toFixed(2)})`);
        ctx.fillRect(cx - P * 1.5, cy - P * 1.5, P, P);
        ctx.fillRect(cx + P * 0.5, cy - P * 1.5, P, P);
        ctx.fillRect(cx - P * 1.5, cy + P * 0.5, P, P);
        ctx.fillRect(cx + P * 0.5, cy + P * 0.5, P, P);
      } else if (effect.type === 'yutaBeamPinkCore' || effect.isPinkCore) {
        // Lingering pink/magenta orb with pure white-hot center core (Matching user reference image)
        const alpha = Math.max(0, Math.min(1.0, effect.life));
        const lifeStep = Math.round(alpha * 20) / 20;

        // 1. Smooth, glowing radial gradient halo (Magenta / Deep Pink Bloom)
        const glowRadius = effect.size * 4.5;
        const gradient = getUnitRadialGradient(ctx, `yutaPinkCore_${lifeStep}`, [
          [0, `rgba(255, 255, 255, ${lifeStep})`],
          [0.15, `rgba(255, 230, 255, ${lifeStep * 0.95})`],
          [0.35, `rgba(235, 20, 190, ${lifeStep * 0.85})`],
          [0.65, `rgba(180, 0, 160, ${lifeStep * 0.40})`],
          [1, 'rgba(100, 0, 120, 0)']
        ]);

        ctx.globalCompositeOperation = 'lighter'; // Additive blending for overlapping glowing orbs
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.scale(glowRadius, glowRadius);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();

        // 2. Piercing crisp solid pure-white central dot
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.98})`;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(1.0, effect.size * 0.5), 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'boogieWoogieSwapBeam') {
        // ── AOI TODO BOOGIE WOOGIE INSTANTANEOUS SWAP BEAM & LIGHTNING ARCS ──
        const x1 = effect.x;
        const y1 = effect.y;
        const x2 = effect.targetX || x1;
        const y2 = effect.targetY || y1;
        const life = effect.life;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 1. Broad Outer Deep Cyan Spatial Distortion Energy Beam
        ctx.strokeStyle = `rgba(0, 150, 255, ${life * 0.75})`;
        ctx.lineWidth = 14 * life;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 2. Vivid Electric Cyan Core Swap Beam
        ctx.strokeStyle = `rgba(0, 240, 255, ${life * 0.95})`;
        ctx.lineWidth = 6 * life;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 3. White-Hot Central Beam Core
        ctx.strokeStyle = `rgba(255, 255, 255, ${life * 0.98})`;
        ctx.lineWidth = 2.5 * life;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 4. Jagged Spatial Lightning Arc Overlay
        ctx.strokeStyle = `rgba(0, 240, 255, ${life * 0.90})`;
        ctx.lineWidth = 2.0 * life;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        const segs = 6;
        const perpX = -dy / (dist || 1);
        const perpY = dx / (dist || 1);

        for (let i = 1; i < segs; i++) {
          const t = i / segs;
          const side = (i % 2 === 0 ? 1 : -1);
          const jitter = side * (12 + (Math.sin(i * 3 + life * 10) * 8)) * life;
          const cx = x1 + dx * t + perpX * jitter;
          const cy = y1 + dy * t + perpY * jitter;
          ctx.lineTo(cx, cy);
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.restore();
      } else if (effect.type === 'meleeClashShockwave') {
        if (effect.targetSize) {
          effect.size += (effect.targetSize - effect.size) * 0.15;
        }
        const isGojo = effect.clashType === 'gojo' || effect.clashType === 'gojo_infinity';
        const P = 2.5;
        const radius = Math.max(P * 2, effect.size);
        const steps = Math.ceil(radius / P);

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // Outer themed pixel ring
        ctx.fillStyle = isGojo ? `rgba(0, 229, 255, ${(effect.life * 0.85).toFixed(3)})` : `rgba(255, 60, 60, ${(effect.life * 0.85).toFixed(3)})`;
        for (let gy = -steps; gy <= steps; gy++) {
          for (let gx = -steps; gx <= steps; gx++) {
            const dist = Math.hypot(gx * P, gy * P);
            if (dist <= radius + P && dist > radius - P * 1.5) {
              if ((gx + gy) % 2 === 0 || effect.life > 0.5) {
                ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
              }
            }
          }
        }

        // Inner white pixel core ring
        ctx.fillStyle = `rgba(255, 255, 255, ${(effect.life * 0.95).toFixed(3)})`;
        for (let gy = -steps; gy <= steps; gy++) {
          for (let gx = -steps; gx <= steps; gx++) {
            const dist = Math.hypot(gx * P, gy * P);
            if (dist <= radius * 0.75 + P && dist > radius * 0.75 - P) {
              ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
            }
          }
        }

        ctx.restore();
      } else {
        // ── Default Pixel Art Impact Flash ──
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const P = 2.0;
        const flashR = Math.max(P * 2, effect.size * effect.life);
        const flashSteps = Math.ceil(flashR / P);

        // 8-bit starburst pixel cross
        ctx.fillStyle = `rgba(255, 200, 80, ${(effect.life * 0.75).toFixed(3)})`;
        ctx.fillRect(effect.x - flashR, effect.y - P, flashR * 2, P * 2);
        ctx.fillRect(effect.x - P, effect.y - flashR, P * 2, flashR * 2);

        // Center diamond
        ctx.fillStyle = `rgba(255, 255, 255, ${(effect.life * 0.95).toFixed(3)})`;
        const coreR = Math.max(P, Math.round((flashR * 0.4) / P) * P);
        ctx.fillRect(effect.x - coreR, effect.y - coreR, coreR * 2, coreR * 2);

        ctx.restore();
      }
    } else if (effect.type === 'parrySpark') {
      // ── High-Velocity Metal Welding Spark Streak (Matching Reference Image) ──
      const speed = Math.hypot(effect.vx || 0, effect.vy || 0);
      const angle = Math.atan2(effect.vy || 0, effect.vx || 1);
      const tailLen = Math.max(10, speed * (2.8 + (1 - effect.life) * 1.6));

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 1. Outer Fiery Amber-Orange Glow Streak
      ctx.strokeStyle = `rgba(255, 90, 0, ${effect.life * 0.55})`;
      ctx.lineWidth = effect.size * 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(effect.x - Math.cos(angle) * tailLen, effect.y - Math.sin(angle) * tailLen);
      ctx.stroke();

      // 2. Hot Gold Inner Streak
      ctx.strokeStyle = `rgba(255, 220, 80, ${effect.life * 0.85})`;
      ctx.lineWidth = effect.size * 1.1;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(effect.x - Math.cos(angle) * (tailLen * 0.75), effect.y - Math.sin(angle) * (tailLen * 0.75));
      ctx.stroke();

      // 3. White-Hot Intense Needle Core
      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
      ctx.lineWidth = Math.max(1, effect.size * 0.45);
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(effect.x - Math.cos(angle) * (tailLen * 0.45), effect.y - Math.sin(angle) * (tailLen * 0.45));
      ctx.stroke();

      // 4. Glowing White Head Tip Dot
      ctx.fillStyle = `rgba(255, 255, 255, ${effect.life})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1.3, effect.size * 0.5), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    } else if (effect.type === 'parryEmberStar') {
      // ── Splintering Metal Welding Ember Sparkle (4-Point Star Glint) ──
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(effect.x, effect.y);
      if (effect.rotation !== undefined) {
        effect.rotation += effect.rotationSpeed || 0.1;
        ctx.rotate(effect.rotation);
      }

      const starSize = effect.size * (0.8 + Math.sin(effect.life * Math.PI) * 0.5);
      const alpha = effect.life;

      // Outer Fiery Orange Halo
      ctx.fillStyle = `rgba(255, 140, 10, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(0, 0, starSize * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 4-Point White-Hot Sparkle Cross
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.beginPath();
      ctx.moveTo(0, -starSize * 2.4);
      ctx.lineTo(starSize * 0.35, -starSize * 0.35);
      ctx.lineTo(starSize * 2.4, 0);
      ctx.lineTo(starSize * 0.35, starSize * 0.35);
      ctx.lineTo(0, starSize * 2.4);
      ctx.lineTo(-starSize * 0.35, starSize * 0.35);
      ctx.lineTo(-starSize * 2.4, 0);
      ctx.lineTo(-starSize * 0.35, -starSize * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    } else if (effect.type === 'crimsonLightningArc' || effect.type === 'tricksterLightningArc') {
      // Lightning arc spark — draw as a short jagged line instead of a dot
      const len = effect.size * 4;
      const angle = Math.atan2(effect.vy, effect.vx);
      ctx.strokeStyle = effect.color.replace('1)', `${effect.life})`);
      ctx.lineWidth = 1 + effect.life;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      // 3-segment jagged line
      for (let seg = 1; seg <= 3; seg++) {
        const t = seg / 3;
        const jx = (Math.random() - 0.5) * len * 0.4;
        const jy = (Math.random() - 0.5) * len * 0.4;
        ctx.lineTo(
          effect.x + Math.cos(angle) * len * t + jx,
          effect.y + Math.sin(angle) * len * t + jy
        );
      }
        ctx.stroke();
      } else if (effect.type === 'arcaneSmokeAirborne' || effect.type === 'arcaneSmoke' || effect.type === 'arcaneSmokeGround' || effect.type === 'laserSmoke') {
        // Soft, expanding, rotating slow smoke
        if (effect.type === 'arcaneSmokeAirborne') {
           effect.size += (effect.targetSize - effect.size) * 0.02; // Expand slowly
        } else {
           effect.size += (effect.targetSize - effect.size) * 0.05; // Expand fast
        }
        
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.rotation + effect.life * effect.rotationSpeed);
        
        // Use a flat, solid color fill so it looks like a stylized solid cloud
        ctx.fillStyle = effect.color;
        
        ctx.beginPath();
        // Draw overlapping puffs to create a cloudy/smoky cluster
        ctx.arc(0, 0, effect.size * 0.7, 0, Math.PI * 2); 
        ctx.arc(-effect.size * 0.4, -effect.size * 0.2, effect.size * 0.5, 0, Math.PI * 2); 
        ctx.arc(effect.size * 0.4, -effect.size * 0.2, effect.size * 0.5, 0, Math.PI * 2); 
        ctx.arc(-effect.size * 0.3, effect.size * 0.4, effect.size * 0.4, 0, Math.PI * 2); 
        ctx.arc(effect.size * 0.3, effect.size * 0.4, effect.size * 0.4, 0, Math.PI * 2);
        
        if (effect.type === 'arcaneSmokeAirborne') {
           // Draw neon glowing edges FIRST
           ctx.globalCompositeOperation = 'lighter';
           ctx.strokeStyle = `rgba(50, 255, 120, ${effect.life * 0.9})`;
           ctx.lineWidth = 6; // Thick stroke so the edge peeks out
           ctx.stroke(); 
           
           ctx.globalCompositeOperation = 'source-over'; // Reset
        }
        
        // Fill the solid inner cloud body OVER the glowing skeleton
        // This covers the inner intersecting lines, leaving only the outer halo
        ctx.fill();
        
        ctx.rotate(-(effect.rotation + effect.life * effect.rotationSpeed));
        ctx.translate(-effect.x, -effect.y);
      } else if (effect.type === 'tojiWindPebble') {
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.rotation || 0);
        ctx.fillStyle = effect.color || '#3A3D40';
        ctx.globalAlpha = Math.min(1.0, effect.life * 1.3);
        
        // Irregular tiny pebble shape
        ctx.beginPath();
        const s = effect.size;
        ctx.moveTo(-s, -s * 0.6);
        ctx.lineTo(s * 0.8, -s * 0.8);
        ctx.lineTo(s, s * 0.4);
        ctx.lineTo(-s * 0.4, s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (effect.type === 'tojiWindLeaf') {
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate((effect.rotation || 0) + effect.life * 0.1);
        ctx.fillStyle = effect.color || '#2E8B57';
        ctx.globalAlpha = Math.min(1.0, effect.life * 1.3);
        
        // Delicate leaf shape (pointed oval with central vein)
        const lw = effect.size * 1.6;
        const lh = effect.size * 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, lw, lh, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-lw * 0.7, 0);
        ctx.lineTo(lw * 0.7, 0);
        ctx.stroke();
        ctx.restore();
      } else if (effect.type === 'telekinesisDebris' || effect.type === 'telekinesisDebrisScattered') {
      // Draw a detailed rocky shape with shading and magical aura
      ctx.translate(effect.x, effect.y);
      if (effect.rotation) ctx.rotate(effect.rotation);
      ctx.rotate(effect.life * effect.rotationSpeed * 100 || 0);

      // Draw a subtle magical aura beneath the rock
      if (isGamePlay) {
        ctx.fillStyle = `rgba(46, 139, 87, ${effect.life * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, 0, effect.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const auraGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, effect.size * 1.5);
        auraGradient.addColorStop(0, `rgba(46, 139, 87, ${effect.life * 0.6})`);
        auraGradient.addColorStop(1, 'rgba(46, 139, 87, 0)');
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(0, 0, effect.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rock base polygon (dark shadow side)
      ctx.beginPath();
      ctx.moveTo(-effect.size, -effect.size * 0.5);
      ctx.lineTo(-effect.size * 0.3, -effect.size * 0.9);
      ctx.lineTo(effect.size * 0.7, -effect.size * 0.6);
      ctx.lineTo(effect.size, effect.size * 0.3);
      ctx.lineTo(effect.size * 0.4, effect.size * 0.8);
      ctx.lineTo(-effect.size * 0.7, effect.size * 0.7);
      ctx.closePath();
      ctx.fillStyle = `rgba(15, 20, 15, ${effect.life})`;
      ctx.fill();

      // Highlight/texture polygon (lit side)
      ctx.beginPath();
      ctx.moveTo(-effect.size * 0.9, -effect.size * 0.4);
      ctx.lineTo(-effect.size * 0.3, -effect.size * 0.8);
      ctx.lineTo(effect.size * 0.6, -effect.size * 0.5);
      ctx.lineTo(effect.size * 0.1, effect.size * 0.1);
      ctx.lineTo(-effect.size * 0.5, 0);
      ctx.closePath();
      ctx.fillStyle = effect.color.replace('1)', `${effect.life})`); // The green/grey color
      ctx.fill();
      
      // A small bright highlight for depth (edge highlight)
      ctx.beginPath();
      ctx.moveTo(-effect.size * 0.2, -effect.size * 0.7);
      ctx.lineTo(effect.size * 0.3, -effect.size * 0.4);
      ctx.lineTo(-effect.size * 0.1, -effect.size * 0.2);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${effect.life * 0.3})`;
      ctx.fill();
      
      // Magical glowing outline
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(0, 255, 100, ${effect.life * 0.6})`;
      ctx.stroke();
    } else if (effect.type === 'meleeClashShockwave') {
      // Expanding ground shockwave ring for Sukuna-Gojo & Sukuna-Yuta/Rika clashes & Mahoraga teleports
      effect.size += (effect.targetSize - effect.size) * 0.08;
      const isYutaClash = (effect.clashType === 'yuta');
      const isTojiClash = (effect.clashType === 'toji');
      const isMahoragaClash = (effect.clashType === 'mahoraga');
      const isTodoClap = (effect.clashType === 'todo');
      const isGenosClash = (effect.clashType === 'genos' || effect.clashType === 'orange');
      const isInfinityClash = (effect.clashType === 'gojo_infinity');

      // Ground impact shadow (dark circle at base for visibility on white)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = isTodoClap ? `rgba(0, 40, 80, ${effect.life * 0.45})` : (isYutaClash ? `rgba(0, 0, 0, 0)` : (isTojiClash ? `rgba(0, 0, 0, 0)` : (isGenosClash ? `rgba(0, 0, 0, 0)` : (isInfinityClash ? `rgba(0, 0, 0, 0)` : (isMahoragaClash ? `rgba(35, 30, 10, ${effect.life * 0.45})` : `rgba(30, 10, 40, ${effect.life * 0.4})`)))));
      ctx.beginPath();
      ctx.ellipse(effect.x, effect.y + 5, effect.size * 1.1, effect.size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';

      if (isTodoClap) {
        // ── AOI TODO BOOGIE WOOGIE CLAP SHOCKWAVE ──
        // 1. Outer Electric Cyan Cursed Energy Ring
        ctx.strokeStyle = `rgba(0, 240, 255, ${effect.life * 0.95})`;
        ctx.lineWidth = 10 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 1.1, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Vivid Electric Blue Second Ring
        ctx.strokeStyle = `rgba(0, 150, 255, ${effect.life * 0.90})`;
        ctx.lineWidth = 6 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.75, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Inner White-Hot Clap Pressure Core
        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
        ctx.lineWidth = 4 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.40, 0, Math.PI * 2);
        ctx.stroke();

        // 4. Radiant Cursed Energy Rays radiating from clap center
        ctx.strokeStyle = `rgba(0, 240, 255, ${effect.life * 0.85})`;
        ctx.lineWidth = 2.5 * effect.life;
        for (let i = 0; i < 6; i++) {
          const rayAngle = (Math.PI / 3) * i;
          const r1 = effect.size * 0.3;
          const r2 = effect.size * 1.2;
          ctx.beginPath();
          ctx.moveTo(effect.x + Math.cos(rayAngle) * r1, effect.y + Math.sin(rayAngle) * r1);
          ctx.lineTo(effect.x + Math.cos(rayAngle) * r2, effect.y + Math.sin(rayAngle) * r2);
          ctx.stroke();
        }
      } else if (isGenosClash) {
        // ── GENOS INCINERATION STOMP SHOCKWAVE ──
        const isDarkMode = Boolean(
          typeof state !== 'undefined' && (
            state.arenaTheme === 'dark' || 
            state.darkMode || 
            (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
          )
        );

        if (isDarkMode) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          const P = 2.0;
          const snap = (v) => Math.round(v / P) * P;
          const steps = 36;

          // Discrete stepped pixel concentric shockwave loops
          for (let st = 0; st < steps; st++) {
            const ang = (st / steps) * Math.PI * 2;
            const cosA = Math.cos(ang);
            const sinA = Math.sin(ang);

            // Outer Obsidian Border
            const r0 = snap(effect.size);
            ctx.fillStyle = '#150500';
            ctx.fillRect(snap(effect.x + cosA * (r0 + P)), snap(effect.y + sinA * (r0 + P)), P, P);

            // Outer Fiery Orange Pixel Ring
            ctx.fillStyle = '#FF5500';
            ctx.fillRect(snap(effect.x + cosA * r0), snap(effect.y + sinA * r0), P, P);

            // Mid Golden Heat Loop
            const r1 = snap(effect.size * 0.75);
            ctx.fillStyle = '#FFE600';
            ctx.fillRect(snap(effect.x + cosA * r1), snap(effect.y + sinA * r1), P, P);

            // Inner White-Hot Ring
            const r2 = snap(effect.size * 0.45);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(snap(effect.x + cosA * r2), snap(effect.y + sinA * r2), P, P);
          }
          ctx.restore();
        } else {
          // Outer Incineration Fiery Orange Thermal Ring
          ctx.strokeStyle = `rgba(255, 60, 0, ${effect.life * 0.95})`;
          ctx.lineWidth = 12 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
          ctx.stroke();

          // Middle Golden Heat Wave Ring
          ctx.strokeStyle = `rgba(255, 170, 0, ${effect.life * 0.90})`;
          ctx.lineWidth = 7 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size * 0.75, 0, Math.PI * 2);
          ctx.stroke();

          // Inner White-Hot Blast Core Ring
          ctx.strokeStyle = `rgba(255, 245, 200, ${effect.life * 0.98})`;
          ctx.lineWidth = 4 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size * 0.45, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (isMahoragaClash) {
        // ── MAHORAGA DIVINE TELEPORT / IMPACT GROUND SHOCKWAVE ──
        // Outer Golden Divine Aura Ring
        ctx.strokeStyle = `rgba(255, 215, 0, ${effect.life * 0.95})`;
        ctx.lineWidth = 12 * effect.life;
        ctx.beginPath();
        ctx.ellipse(effect.x, effect.y + 4, effect.size * 1.15, effect.size * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner White-Hot Impact Force Ring
        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
        ctx.lineWidth = 6 * effect.life;
        ctx.beginPath();
        ctx.ellipse(effect.x, effect.y + 4, effect.size * 0.80, effect.size * 0.26, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (isYutaClash) {
        // ── YUTA & RIKA VS SUKUNA CLASH SHOCKWAVE ──
        // Outer Hot Pink / Dark Magenta Ring (Yuta & Rika's Pure Love / Monstrous Cursed Energy)
        ctx.strokeStyle = `rgba(138, 43, 226, ${effect.life * 0.9})`;
        ctx.lineWidth = 15 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 20, 147, ${effect.life * 0.98})`;
        ctx.lineWidth = 11 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Crimson Blood Ring (Sukuna's Cursed Energy)
        ctx.strokeStyle = `rgba(255, 30, 60, ${effect.life * 0.95})`;
        ctx.lineWidth = 8 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        // White core flash
        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
        ctx.lineWidth = 4 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
        ctx.stroke();

        // Dynamic Katana / Cleave X-shaped Cross Slash at clash center
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate(Math.PI / 4 + (1 - effect.life) * 0.2);
        const slashLen = effect.size * 0.75;
        
        ctx.strokeStyle = `rgba(255, 30, 60, ${effect.life * 0.7})`;
        ctx.lineWidth = 7 * effect.life;
        ctx.beginPath();
        ctx.moveTo(-slashLen, 0); ctx.lineTo(slashLen, 0);
        ctx.moveTo(0, -slashLen); ctx.lineTo(0, slashLen);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
        ctx.lineWidth = 3.5 * effect.life;
        ctx.beginPath();
        ctx.moveTo(-slashLen, 0); ctx.lineTo(slashLen, 0);
        ctx.moveTo(0, -slashLen); ctx.lineTo(0, slashLen);
        ctx.stroke();
        ctx.restore();
      } else if (isInfinityClash) {
        // ── GOJO LIMITLESS BARRIER REBOUND SHOCKWAVE ──
        const isDarkMode = Boolean(
          typeof state !== 'undefined' && (
            state.arenaTheme === 'dark' || 
            state.darkMode || 
            (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
          )
        );

        if (isDarkMode) {
          // ── DARK MODE: CLEAN STEPPED PIXELATED CONCENTRIC SHOCKWAVE RING ──
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          const P = 2.0;
          const snap = (v) => Math.round(v / P) * P;
          const steps = 36;

          for (let st = 0; st < steps; st++) {
            const ang = (st / steps) * Math.PI * 2;
            const cosA = Math.cos(ang);
            const sinA = Math.sin(ang);

            // Outer Obsidian Border
            const r0 = snap(effect.size);
            ctx.fillStyle = `rgba(8, 18, 32, ${effect.life * 0.90})`;
            ctx.fillRect(snap(effect.x + cosA * (r0 + P)), snap(effect.y + sinA * (r0 + P)), P, P);

            // Outer Electric Cyan Pixel Ring
            ctx.fillStyle = `rgba(0, 229, 255, ${effect.life * 0.95})`;
            ctx.fillRect(snap(effect.x + cosA * r0), snap(effect.y + sinA * r0), P, P);

            // Mid Cursed Indigo Pixel Loop
            const r1 = snap(effect.size * 0.75);
            ctx.fillStyle = `rgba(0, 140, 255, ${effect.life * 0.85})`;
            ctx.fillRect(snap(effect.x + cosA * r1), snap(effect.y + sinA * r1), P, P);

            // Inner White-Hot Core Pixel Ring
            const r2 = snap(effect.size * 0.45);
            ctx.fillStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
            ctx.fillRect(snap(effect.x + cosA * r2), snap(effect.y + sinA * r2), P, P);
          }
          ctx.restore();
        } else {
          // ── LIGHT MODE: SIMPLE CLEAN CONCENTRIC SHOCKWAVE RING ──
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';

          // Outer Soft Obsidian Contrast Border
          ctx.strokeStyle = `rgba(8, 18, 32, ${effect.life * 0.70})`;
          ctx.lineWidth = 10 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size + 1.5, 0, Math.PI * 2);
          ctx.stroke();

          // Primary Electric Cyan Ring
          ctx.strokeStyle = `rgba(0, 229, 255, ${effect.life * 0.95})`;
          ctx.lineWidth = 6 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
          ctx.stroke();

          // Mid Cursed Blue Ring
          ctx.strokeStyle = `rgba(0, 140, 255, ${effect.life * 0.85})`;
          ctx.lineWidth = 4 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size * 0.75, 0, Math.PI * 2);
          ctx.stroke();

          // Inner White-Hot Core Ring
          ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
          ctx.lineWidth = 2.5 * effect.life;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, effect.size * 0.45, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
        }
      } else if (isTojiClash) {
        // ── TOJI PHYSICAL SHOCKWAVE ──
        // Outer Dark Slate Air Pressure Ring
        ctx.strokeStyle = `rgba(45, 50, 55, ${effect.life * 0.8})`;
        ctx.lineWidth = 18 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();

        // Middle Purple Soul Aura Ring
        ctx.strokeStyle = `rgba(160, 80, 240, ${effect.life * 0.85})`;
        ctx.lineWidth = 10 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.85, 0, Math.PI * 2);
        ctx.stroke();

        // Inner White-Hot Impact Force Ring
        ctx.strokeStyle = `rgba(250, 252, 255, ${effect.life * 0.9})`;
        ctx.lineWidth = 6 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.6, 0, Math.PI * 2);
        ctx.stroke();

        // High-Speed Wind Distortion Lines (Inner Starburst)
        ctx.save();
        ctx.translate(effect.x, effect.y);
        ctx.rotate((1 - effect.life) * 0.5);
        ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.5})`;
        ctx.lineWidth = 2 * effect.life;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
           const angle = (i / 8) * Math.PI * 2;
           ctx.moveTo(Math.cos(angle) * (effect.size * 0.2), Math.sin(angle) * (effect.size * 0.2));
           ctx.lineTo(Math.cos(angle) * (effect.size * 0.9), Math.sin(angle) * (effect.size * 0.9));
        }
        ctx.stroke();
        ctx.restore();
      } else {
        // Outer purple ring (Gojo's cursed energy) - thick with dark outline
        ctx.strokeStyle = `rgba(60, 0, 80, ${effect.life * 0.9})`;
        ctx.lineWidth = 14 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();
        
        // Main purple ring
        ctx.strokeStyle = `rgba(180, 60, 255, ${effect.life * 0.95})`;
        ctx.lineWidth = 10 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner crimson ring (Sukuna's cursed energy)
        ctx.strokeStyle = `rgba(255, 50, 80, ${effect.life * 0.95})`;
        ctx.lineWidth = 8 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        
        // White core flash with dark outline
        ctx.strokeStyle = `rgba(40, 40, 40, ${effect.life * 0.8})`;
        ctx.lineWidth = 5 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = `rgba(255, 240, 240, ${effect.life * 0.9})`;
        ctx.lineWidth = 3 * effect.life;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 0.35, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
    } else if (effect.type === 'mahoragaShoutShockwave') {
      // Expanding golden & silver roar shockwave ring
      effect.size += (effect.targetSize - effect.size) * 0.18;
      
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Outer glowing golden shockwave ring
      ctx.strokeStyle = `rgba(255, 215, 0, ${effect.life * 0.95})`;
      ctx.lineWidth = 12 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      // Middle silver contrast ring
      ctx.strokeStyle = `rgba(224, 232, 255, ${effect.life * 0.8})`;
      ctx.lineWidth = 6 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.82), 0, Math.PI * 2);
      ctx.stroke();

      // Inner white-hot core ring
      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
      ctx.lineWidth = 4 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.65), 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    } else if (effect.type === 'rikaRoarShockwave') {
      // Expanding dark purple & hot pink cursed energy roar shockwave ring
      effect.size += (effect.targetSize - effect.size) * 0.18;
      
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // High-performance double-stroke glow without shadowBlur
      ctx.strokeStyle = `rgba(255, 20, 147, ${effect.life * 0.95})`;
      ctx.lineWidth = 9 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
      ctx.lineWidth = 4 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.75), 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    } else if (effect.type === 'animeImpactFrame') {
      const isDark = _isDarkMode();

      if (isDark) {
        // ── DARK MODE CLEAN PIXELATED SHOCKWAVE RING ONLY ──
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.translate(effect.x, effect.y);

        const progress = Math.min(1.0, Math.max(0.0, 1.0 - effect.life));
        const alpha = Math.min(1.0, effect.life * 1.35);
        const P = 2.0; // Stepped pixel grid size
        const snap = (v) => Math.round(v / P) * P;

        const isGold = (effect.color === 'gold');
        const isBlackPink = (effect.color === 'blackpink' || effect.color === 'pink');
        const isOrange = (effect.color === 'orange');
        const isCyan = (effect.color === 'cyan' || effect.color === 'blue' || effect.color === 'infinity' || effect.color === 'gojo');
        const isCrimson = (effect.color === 'crimson' || effect.color === 'red' || effect.color === 'sukuna');

        let colRing, colHighlight;
        if (isGold) {
          colRing = `rgba(255, 215, 0, ${alpha * 0.95})`;
          colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
        } else if (isBlackPink) {
          colRing = `rgba(255, 20, 147, ${alpha * 0.95})`;
          colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
        } else if (isOrange) {
          colRing = `rgba(255, 80, 0, ${alpha * 0.95})`;
          colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
        } else if (isCyan) {
          colRing = `rgba(0, 229, 255, ${alpha * 0.95})`;
          colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
        } else if (isCrimson) {
          colRing = `rgba(255, 36, 0, ${alpha * 0.95})`;
          colHighlight = `rgba(255, 255, 255, ${alpha * 0.98})`;
        } else {
          colRing = `rgba(255, 255, 255, ${alpha * 0.95})`;
          colHighlight = `rgba(220, 240, 255, ${alpha * 0.98})`;
        }

        // Discrete Pixel Circle Shockwave Ring
        const ringRadius = effect.size * (0.25 + 0.85 * Math.pow(progress, 0.65));
        const ringThick = Math.max(P * 1.5, Math.round((P * 2.2 * effect.life) / P) * P);
        const innerR = Math.max(0, ringRadius - ringThick);
        const outerR = ringRadius + P * 0.5;

        const maxGridSteps = Math.ceil(outerR / P);

        // Render discrete pixel shockwave ring with 0 GC
        for (let gy = -maxGridSteps; gy <= maxGridSteps; gy++) {
          const ry = gy * P;
          for (let gx = -maxGridSteps; gx <= maxGridSteps; gx++) {
            const rx = gx * P;
            const dist = Math.hypot(rx, ry);
            if (dist < innerR || dist > outerR) continue;

            const px = snap(rx);
            const py = snap(ry);

            // Core highlight pixel line vs main colored pixel band
            if (dist >= ringRadius - P * 0.5 && dist <= ringRadius + P * 0.5) {
              ctx.fillStyle = colHighlight;
            } else {
              ctx.fillStyle = colRing;
            }
            ctx.fillRect(px, py, P, P);
          }
        }

        ctx.restore();
      } else {
        // ── LIGHT MODE GLOBAL PIXEL-ART PUNCH IMPACT CRESCENT & ACTION LINES ──
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.translate(effect.x, effect.y);
        ctx.rotate((effect.hitAngle || 0) + Math.PI);

        const alpha = effect.life;
        const R = effect.size;
        const P = 2.0; // Stepped pixel unit

        const outerR = R * 1.12;
        const innerR = R * 0.84;
        const halfArc = Math.PI * 0.72;
        const totalArc = halfArc * 2;

        const isGold = (effect.color === 'gold');
        const isBlackPink = (effect.color === 'blackpink');
        const isOrange = (effect.color === 'orange');
        const isCyan = (effect.color === 'cyan' || effect.color === 'blue' || effect.color === 'infinity');
        const isCrimson = (effect.color === 'crimson' || effect.color === 'red' || effect.color === 'sukuna');

        // 1. Stepped Pixel Radial Action Lines
        const lineCount = 14;
        const startRad = innerR * 0.85;

        let lineColorA, lineColorB;
        if (isGold) { lineColorA = '#0E0F14'; lineColorB = '#FFD700'; }
        else if (isBlackPink) { lineColorA = '#0E0F14'; lineColorB = '#FF1493'; }
        else if (isOrange) { lineColorA = '#FFFFFF'; lineColorB = '#FF5000'; }
        else if (isCyan) { lineColorA = '#00142D'; lineColorB = '#00E5FF'; }
        else if (isCrimson) { lineColorA = '#140205'; lineColorB = '#FF2400'; }
        else { lineColorA = '#0E0F14'; lineColorB = '#FFFFFF'; }

        for (let i = 0; i < lineCount; i++) {
          const a = -halfArc + (i / (lineCount - 1)) * totalArc;
          const len = R * (0.55 + Math.abs(Math.sin(i * 2.3)) * 0.45);
          const col = (i % 3 === 0) ? lineColorA : lineColorB;
          ctx.fillStyle = col;

          const lineSteps = Math.max(1, Math.round(len / P));
          for (let s = 0; s <= lineSteps; s++) {
            const curD = startRad + s * P;
            const px = Math.round((Math.cos(a) * curD) / P) * P;
            const py = Math.round((Math.sin(a) * curD) / P) * P;
            ctx.fillRect(px, py, P, P);
          }
        }

        // 2. Stepped 8-Segment Chopped Pixel Impact Crescent Pieces
        const alphaFill = Math.min(1.0, alpha * 1.25);

        for (let sIdx = 0; sIdx < ANIME_IMPACT_SEGMENTS.length; sIdx++) {
          const seg = ANIME_IMPACT_SEGMENTS[sIdx];
          const segN = 8;
          const segPeakIdx = 4;

          let segColor;
          if (isGold) segColor = (sIdx % 3 === 0) ? '#0E0F14' : '#FFC800';
          else if (isBlackPink) segColor = (sIdx % 3 === 0) ? '#0E0F14' : '#FF1493';
          else if (isOrange) segColor = (sIdx % 2 === 0) ? '#FF5000' : '#FFB400';
          else if (isCyan) segColor = (sIdx % 3 === 0) ? '#00142D' : '#00E5FF';
          else if (isCrimson) segColor = (sIdx % 3 === 0) ? '#140205' : '#DC143C';
          else segColor = '#0E0F14';

          ctx.fillStyle = segColor;

          for (let i = 0; i <= segN; i++) {
            const localT = i / segN;
            const globalT = seg.t0 + localT * (seg.t1 - seg.t0);
            const a = -halfArc + globalT * totalArc;

            let r;
            if (i === 0 || i === segN) r = outerR * 0.80;
            else if (i === segPeakIdx) r = outerR * seg.maxSpike;
            else r = outerR * ((i % 2 === 0) ? 0.90 : 1.05);

            const rSpan = r - innerR;
            const rSteps = Math.max(1, Math.round(rSpan / P));
            for (let s = 0; s <= rSteps; s++) {
              const curR = innerR + s * P;
              const px = Math.round((Math.cos(a) * curR) / P) * P;
              const py = Math.round((Math.sin(a) * curR) / P) * P;
              ctx.fillRect(px, py, P, P);
            }
          }
        }

        // 3. Central 4-Point Pure-White Specular Pixel Diamond
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-P * 2, -P * 0.5, P * 4, P);
        ctx.fillRect(-P * 0.5, -P * 2, P, P * 4);

        ctx.restore();
      }
    } else if (effect.type === 'punchWindSpeedLine') {
      // ── SUPERSONIC PUNCH WIND SPEED LINE STREAK ──
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const alpha = Math.min(1.0, effect.life * 1.4);
      const lineAngle = effect.angle || 0;
      const len = (effect.length || 150) * (0.6 + 0.4 * effect.life);
      const halfLen = len / 2;

      ctx.translate(effect.x, effect.y);
      ctx.rotate(lineAngle);

      // Gradient line stroke fading smoothly at both ends
      const grad = ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
      const col = effect.color || '#FF8800';
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.25, col);
      grad.addColorStop(0.75, col);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = (effect.size || 2.5) * effect.life;
      ctx.beginPath();
      ctx.moveTo(-halfLen, 0);
      ctx.lineTo(halfLen, 0);
      ctx.stroke();

      // White-hot core center streak for supersonic punch feel
      if (effect.isCore) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(2)})`;
        ctx.lineWidth = Math.max(1, (effect.size || 2.5) * 0.45 * effect.life);
        ctx.beginPath();
        ctx.moveTo(-halfLen * 0.65, 0);
        ctx.lineTo(halfLen * 0.65, 0);
        ctx.stroke();
      }

      ctx.restore();
    } else {
      // Standard spark - small glowing dot
      const safeColor = (typeof effect.color === 'string' && effect.color) ? effect.color : '#00E5FF';
      const isGamePlay = (typeof state !== 'undefined' && state.gameState && ['fight', 'countdown', 'paused', 'roundEnd', 'matchEnd', 'playing'].includes(state.gameState));
      if (isGamePlay) {
        // During gameplay: skip per-particle radial gradient (saves huge CPU time per frame)
        ctx.fillStyle = safeColor;
      } else {
        const gradient = ctx.createRadialGradient(
          effect.x, effect.y, 0,
          effect.x, effect.y, Math.max(0.1, effect.size || 1)
        );
        gradient.addColorStop(0, safeColor);
        const halfColor = (typeof safeColor === 'string' && safeColor.includes('1)')) ? safeColor.replace('1)', '0.6)') : safeColor;
        gradient.addColorStop(0.5, halfColor);
        
        if (effect.type === 'crimsonSniper') {
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (effect.type === 'lightningTrail') {
          const zeroColor = (typeof safeColor === 'string' && safeColor.includes('1)')) ? safeColor.replace(/[\d.]+\)$/, '0)') : 'rgba(0, 229, 255, 0)';
          gradient.addColorStop(1, zeroColor);
        } else if (effect.type === 'rikaCurse') {
          const zeroColor = (typeof safeColor === 'string' && safeColor.includes('1)')) ? safeColor.replace('1)', '0)') : 'rgba(0, 0, 0, 0)';
          gradient.addColorStop(1, zeroColor);
        } else {
          gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        }
        ctx.fillStyle = gradient;
      }

      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(0.1, effect.size || 1), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Spawns a ground shockwave effect for Sukuna-Gojo & Sukuna-Yuta melee clashes.
 * Creates an expanding ring with purple/pink energy and crimson energy.
 * @param {number} x - X position (midpoint between fighters)
 * @param {number} y - Y position (ground level)
 * @param {number} radius - Base radius of the shockwave
 * @param {string} clashType - 'gojo' or 'yuta'
 */
export function spawnMeleeClashShockwave(x, y, radius = 80, clashType = 'gojo') {
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const fps = state.fps || 60;
  const MAX_SHOCKWAVES = isMulti ? (fps < 45 ? 5 : 10) : 20;
  let insertIdx = -1;
  if (state.sparkEffects.length >= MAX_SHOCKWAVES) {
    insertIdx = Math.floor(Math.random() * state.sparkEffects.length);
    const oldest = state.sparkEffects[insertIdx];
    if (oldest) ParticleSystem.returnParticle(oldest);
  }

  const shockwave = ParticleSystem.getParticle();
  shockwave.x = x;
  shockwave.y = y;
  shockwave.vx = 0;
  shockwave.vy = 0;
  shockwave.size = radius * 0.2; // starts small
  shockwave.targetSize = radius; // expands to this size
  shockwave.life = 1.0;
  shockwave.decay = 0.04; // lasts ~25 frames
  shockwave.friction = 1;
  shockwave.type = 'meleeClashShockwave';
  shockwave.clashType = clashType;
  shockwave.isFlash = false;
  shockwave.color = 'clash';
  if (insertIdx !== -1) {
    state.sparkEffects[insertIdx] = shockwave;
  } else {
    state.sparkEffects.push(shockwave);
  }
}

export function spawnAnimePunchImpactFrame(x, y, radius = 55, hitAngle = 0, color = 'black') {
  const shockwave = ParticleSystem.getParticle();
  shockwave.x = x;
  shockwave.y = y;
  shockwave.vx = 0;
  shockwave.vy = 0;
  shockwave.size = radius; // start at full size
  shockwave.targetSize = radius;
  shockwave.life = 1.0;
  shockwave.decay = 0.055; // ~18 frames of high-visibility sakuga impact
  shockwave.type = 'animeImpactFrame';
  shockwave.hitAngle = hitAngle;
  shockwave.color = color;

  state.sparkEffects.push(shockwave);
}

/**
 * Spawns an expanding dark purple/pink cursed energy roar shockwave ring for Rika.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Target radius of shockwave
 */
export function spawnRikaRoarShockwave(x, y, radius = 180) {
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const fps = state.fps || 60;
  const MAX_SHOCKWAVES = isMulti ? (fps < 45 ? 5 : 10) : 25;
  let insertIdx = -1;
  if (state.sparkEffects.length >= MAX_SHOCKWAVES) {
    insertIdx = Math.floor(Math.random() * state.sparkEffects.length);
    const oldest = state.sparkEffects[insertIdx];
    if (oldest) ParticleSystem.returnParticle(oldest);
  }

  const shockwave = ParticleSystem.getParticle();
  shockwave.x = x;
  shockwave.y = y;
  shockwave.vx = 0;
  shockwave.vy = 0;
  shockwave.size = 12;
  shockwave.targetSize = radius;
  shockwave.life = 1.0;
  shockwave.decay = 0.035; // lasts ~28 frames
  shockwave.type = 'rikaRoarShockwave';
  shockwave.isFlash = true;
  shockwave.color = 'pinkCurse';
  if (insertIdx !== -1) {
    state.sparkEffects[insertIdx] = shockwave;
  } else {
    state.sparkEffects.push(shockwave);
  }
}

/**
 * Spawns an expanding golden/silver roar shockwave ring for Mahoraga's Divine Shout.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Target radius of shockwave
 */
export function spawnMahoragaShoutShockwave(x, y, radius = 180) {
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const fps = state.fps || 60;
  const MAX_SHOCKWAVES = isMulti ? (fps < 45 ? 5 : 10) : 25;
  let insertIdx = -1;
  if (state.sparkEffects.length >= MAX_SHOCKWAVES) {
    insertIdx = Math.floor(Math.random() * state.sparkEffects.length);
    const oldest = state.sparkEffects[insertIdx];
    if (oldest) ParticleSystem.returnParticle(oldest);
  }

  const shockwave = ParticleSystem.getParticle();
  shockwave.x = x;
  shockwave.y = y;
  shockwave.vx = 0;
  shockwave.vy = 0;
  shockwave.size = 12;
  shockwave.targetSize = radius;
  shockwave.life = 1.0;
  shockwave.decay = 0.035; // lasts ~28 frames
  shockwave.type = 'mahoragaShoutShockwave';
  shockwave.isFlash = true;
  shockwave.color = 'gold';
  if (insertIdx !== -1) {
    state.sparkEffects[insertIdx] = shockwave;
  } else {
    state.sparkEffects.push(shockwave);
  }
}

/**
 * Spawns a massive concentric gold/silver shockwave & outward spark blast for Mahoraga's Divine Shout.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Target radius of shockwave
 */
export function spawnMahoragaShoutBurst(x, y, radius = 180) {
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const fps = state.fps || 60;
  const MAX_PARTICLES = isMulti ? (fps < 45 ? 100 : 250) : 400;

  // Concentric Shockwave 1 (Outer Gold)
  spawnMahoragaShoutShockwave(x, y, radius);

  // Concentric Shockwave 2 (Medium Gold, Faster decay)
  const sw2 = ParticleSystem.getParticle();
  sw2.x = x; sw2.y = y; sw2.vx = 0; sw2.vy = 0;
  sw2.size = 15; sw2.targetSize = radius * 0.75;
  sw2.life = 1.0; sw2.decay = 0.045;
  sw2.type = 'mahoragaShoutShockwave';
  sw2.isFlash = true; sw2.color = 'gold';
  state.sparkEffects.push(sw2);

  // Concentric Shockwave 3 (Inner Silver, Fastest decay)
  const sw3 = ParticleSystem.getParticle();
  sw3.x = x; sw3.y = y; sw3.vx = 0; sw3.vy = 0;
  sw3.size = 25; sw3.targetSize = radius * 0.50;
  sw3.life = 1.0; sw3.decay = 0.055;
  sw3.type = 'mahoragaShoutShockwave';
  sw3.isFlash = true; sw3.color = 'silver';
  state.sparkEffects.push(sw3);

  // Outward exploding sparks
  for (let i = 0; i < 30; i++) {
    let insertIdx = -1;
    if (state.sparkEffects.length >= MAX_PARTICLES) {
      insertIdx = Math.floor(Math.random() * state.sparkEffects.length);
      const oldest = state.sparkEffects[insertIdx];
      if (oldest) ParticleSystem.returnParticle(oldest);
    }

    const angle = (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
    const speed = 5 + Math.random() * 9;

    const spark = ParticleSystem.getParticle();
    spark.x = x + Math.cos(angle) * 15;
    spark.y = y + Math.sin(angle) * 15;
    spark.vx = Math.cos(angle) * speed;
    spark.vy = Math.sin(angle) * speed;
    spark.size = 2 + Math.random() * 3;
    spark.life = 1.0;
    spark.decay = 0.02 + Math.random() * 0.02; // lasts ~25-50 frames
    spark.friction = 0.93;
    spark.type = 'silver';
    spark.color = Math.random() < 0.70 ? '#FFD700' : '#E8F5FF';

    if (insertIdx !== -1) {
      state.sparkEffects[insertIdx] = spark;
    } else {
      state.sparkEffects.push(spark);
    }
  }
}

/**
 * Spawns an energetic cyborg rocket thruster dash visual when Genos ignites his jet boosters off a wall.
 * @param {number} x - Launch X position at arena wall
 * @param {number} y - Launch Y position at arena wall
 * @param {number} dashAngle - Angle of the thruster dash trajectory (radians)
 */
export function spawnGenosThrusterDashVisual(x, y, dashAngle = 0) {
  if (typeof spawnImpactFlash === 'function') {
    spawnImpactFlash(x, y, 42, '#FF5500');
  }
  if (typeof spawnMeleeClashShockwave === 'function') {
    spawnMeleeClashShockwave(x, y, 75, 'gojo');
  }
  if (typeof spawnSparks === 'function') {
    spawnSparks(x, y, 12, 'orange');
  }

  // Thruster back-fire jet particles opposite to dash angle
  const backAngle = dashAngle + Math.PI;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const fps = (state && state.fps) || 60;
  const MAX_PARTICLES = isMulti ? (fps < 45 ? 50 : 100) : 150;

  for (let i = 0; i < 8; i++) {
    let insertIdx = -1;
    if (state.sparkEffects && state.sparkEffects.length >= MAX_PARTICLES) {
      insertIdx = Math.floor(Math.random() * state.sparkEffects.length);
      const oldest = state.sparkEffects[insertIdx];
      if (oldest) ParticleSystem.returnParticle(oldest);
    }

    const spread = backAngle + (Math.random() - 0.5) * 0.7;
    const speed = 4 + Math.random() * 8;

    const spark = ParticleSystem.getParticle();
    spark.x = x;
    spark.y = y;
    spark.vx = Math.cos(spread) * speed;
    spark.vy = Math.sin(spread) * speed;
    spark.size = 3 + Math.random() * 4;
    spark.life = 1.0;
    spark.decay = 0.04 + Math.random() * 0.03;
    spark.friction = 0.90;
    spark.color = Math.random() < 0.6 ? '#FF5500' : '#FFD700';

    if (state.sparkEffects) {
      if (insertIdx !== -1) {
        state.sparkEffects[insertIdx] = spark;
      } else {
        state.sparkEffects.push(spark);
      }
    }
  }
}

/**
 * Spawns directional wind speed line streaks streaming along punch trajectory for Machine Gun Blows.
 * @param {number} x - Origin X
 * @param {number} y - Origin Y
 * @param {number} punchAngle - Trajectory angle in radians
 * @param {number} length - Base speed line length
 * @param {string} theme - Color theme ('orange' for Genos)
 */
export function spawnPunchWindSpeedLines(x, y, punchAngle = 0, length = 160, theme = 'orange') {
  const lineCount = 7;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const fps = (state && state.fps) || 60;
  const MAX_PARTICLES = isMulti ? (fps < 45 ? 60 : 120) : 200;

  for (let i = 0; i < lineCount; i++) {
    let insertIdx = -1;
    if (state.sparkEffects && state.sparkEffects.length >= MAX_PARTICLES) {
      insertIdx = Math.floor(Math.random() * state.sparkEffects.length);
      const oldest = state.sparkEffects[insertIdx];
      if (oldest) ParticleSystem.returnParticle(oldest);
    }

    // Offset parallel lines perpendicular to punch angle
    const perpAngle = punchAngle + Math.PI / 2;
    const perpOffset = (Math.random() - 0.5) * 55;
    const alongOffset = (Math.random() - 0.5) * 40;

    const startX = x + Math.cos(perpAngle) * perpOffset + Math.cos(punchAngle) * alongOffset;
    const startY = y + Math.sin(perpAngle) * perpOffset + Math.sin(punchAngle) * alongOffset;

    const lineSpeed = 8 + Math.random() * 12;

    const line = ParticleSystem.getParticle();
    line.x = startX;
    line.y = startY;
    line.vx = Math.cos(punchAngle) * lineSpeed;
    line.vy = Math.sin(punchAngle) * lineSpeed;
    line.size = 1.8 + Math.random() * 2.5;
    line.length = length * (0.7 + Math.random() * 0.6);
    line.angle = punchAngle + (Math.random() - 0.5) * 0.08;
    line.life = 1.0;
    line.decay = 0.07 + Math.random() * 0.04;
    line.friction = 0.96;
    line.type = 'punchWindSpeedLine';
    line.isCore = Math.random() < 0.6;

    if (theme === 'orange') {
      const colors = ['#FFFFFF', '#FF5500', '#FF9900', '#FFCC00', '#FF3300'];
      line.color = colors[Math.floor(Math.random() * colors.length)];
    } else {
      line.color = Math.random() < 0.5 ? '#FFFFFF' : '#00E5FF';
    }

    if (state.sparkEffects) {
      if (insertIdx !== -1) {
        state.sparkEffects[insertIdx] = line;
      } else {
        state.sparkEffects.push(line);
      }
    }
  }
}

/**
 * Spawns Saitama's Serious Skill Counter Wide Long Frontal Supersonic Shockwave Blast (Death Punch Canyon).
 * @param {number} x - Origin X (fist position)
 * @param {number} y - Origin Y (fist position)
 * @param {number} angle - Facing/Punch trajectory angle in radians
 * @param {number} reach - Length of the frontal shockwave (default 750px)
 * @param {number} arcAngle - Wide frontal cone angle in radians (default 135 deg)
 */
export function spawnSaitamaCounterFrontalBlast(x, y, angle = 0, reach = 750, arcAngle = Math.PI * 0.75) {
  const blast = ParticleSystem.getParticle();
  blast.x = x;
  blast.y = y;
  blast.vx = 0;
  blast.vy = 0;
  blast.angle = angle;
  blast.reach = reach;
  blast.arcAngle = arcAngle;
  blast.life = 1.0;
  blast.decay = 0.038; // ~26 frames duration (fast, punchy supersonic shockwave)
  blast.friction = 1.0;
  blast.type = 'saitamaCounterFrontalBlast';
  blast.isFlash = true;

  if (state.sparkEffects) {
    state.sparkEffects.push(blast);
  }

  // Sequential expanding shockwaves along the corridor
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const distances = [60, 180, 320, 480, 640];
  const radii = [90, 125, 160, 200, 240];

  distances.forEach((dist, idx) => {
    if (dist < reach) {
      const swX = x + cosA * dist;
      const swY = y + sinA * dist;
      if (typeof spawnMeleeClashShockwave === 'function') {
        spawnMeleeClashShockwave(swX, swY, radii[idx] || 120, 'gold');
      }
    }
  });

  // High-speed wind streaks along the corridor
  if (typeof spawnPunchWindSpeedLines === 'function') {
    spawnPunchWindSpeedLines(x, y, angle, 260, 'orange');
    spawnPunchWindSpeedLines(x + cosA * 150, y + sinA * 150, angle, 280, 'orange');
    spawnPunchWindSpeedLines(x + cosA * 300, y + sinA * 300, angle, 300, 'orange');
  }

  // Fiery orange/gold sparks bursting along the corridor
  if (typeof spawnSparks === 'function') {
    spawnSparks(x + cosA * 40, y + sinA * 40, 18, 'gold');
    spawnSparks(x + cosA * 160, y + sinA * 160, 14, 'orange');
    spawnSparks(x + cosA * 320, y + sinA * 320, 10, 'crimson');
  }
}

/**
 * Spawns Jujutsu Kaisen Aoi Todo Boogie Woogie Cursed Energy (CE) particle burst
 * and quick radial anime action speed lines when Todo claps his hands.
 * @param {number} x - Clap origin X coordinate
 * @param {number} y - Clap origin Y coordinate
 * @param {number} angle - Aim or trajectory angle (optional)
 */
export function spawnTodoClapCEParticles(x, y, angle = 0) {
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const fps = (state && state.fps) || 60;
  const MAX_PARTICLES = isMulti ? (fps < 45 ? 80 : 140) : 250;

  // 1. Dense Electric Cyan & Cursed Indigo CE Particle Burst
  const ceCount = 18;
  const ceColors = ['#00E5FF', '#FFFFFF', '#0099FF', '#8A2BE2', '#00FFFF', '#3A86FF'];
  
  for (let i = 0; i < ceCount; i++) {
    let insertIdx = -1;
    if (state.sparkEffects && state.sparkEffects.length >= MAX_PARTICLES) {
      insertIdx = Math.floor(Math.random() * state.sparkEffects.length);
      const oldest = state.sparkEffects[insertIdx];
      if (oldest) ParticleSystem.returnParticle(oldest);
    }

    const pAngle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 12;

    const p = ParticleSystem.getParticle();
    p.x = x;
    p.y = y;
    p.vx = Math.cos(pAngle) * speed;
    p.vy = Math.sin(pAngle) * speed;
    p.size = 2.5 + Math.random() * 3.5;
    p.life = 1.0;
    p.decay = 0.05 + Math.random() * 0.04;
    p.friction = 0.90;
    p.color = ceColors[Math.floor(Math.random() * ceColors.length)];
    p.type = 'lightningTrail';

    if (state.sparkEffects) {
      if (insertIdx !== -1) state.sparkEffects[insertIdx] = p;
      else state.sparkEffects.push(p);
    }
  }

  // 2. Quick Anime Radial Speed Line Vibe (Supersonic needle streaks bursting radially from clap)
  const lineCount = 12;
  for (let i = 0; i < lineCount; i++) {
    let insertIdx = -1;
    if (state.sparkEffects && state.sparkEffects.length >= MAX_PARTICLES) {
      insertIdx = Math.floor(Math.random() * state.sparkEffects.length);
      const oldest = state.sparkEffects[insertIdx];
      if (oldest) ParticleSystem.returnParticle(oldest);
    }

    const lineAngle = (i / lineCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const lineSpeed = 10 + Math.random() * 14;
    const distOffset = 8 + Math.random() * 15;

    const line = ParticleSystem.getParticle();
    line.x = x + Math.cos(lineAngle) * distOffset;
    line.y = y + Math.sin(lineAngle) * distOffset;
    line.vx = Math.cos(lineAngle) * lineSpeed;
    line.vy = Math.sin(lineAngle) * lineSpeed;
    line.size = 2.0 + Math.random() * 2.2;
    line.length = 150 + Math.random() * 80;
    line.angle = lineAngle;
    line.life = 1.0;
    line.decay = 0.12 + Math.random() * 0.05; // Quick burst fade (~8-10 frames) for anime impact feel
    line.friction = 0.91;
    line.type = 'punchWindSpeedLine';
    line.isCore = Math.random() < 0.7;
    line.color = Math.random() < 0.5 ? '#FFFFFF' : (Math.random() < 0.5 ? '#00E5FF' : '#00A8FF');

    if (state.sparkEffects) {
      if (insertIdx !== -1) state.sparkEffects[insertIdx] = line;
      else state.sparkEffects.push(line);
    }
  }
}

/**
 * Spawns a high-contrast visual spark explosion on sword/guard parries.
 * Uses a uniform bright gold & white-hot spark palette across all parries.
 */
export function spawnParrySparksEffect(x, y, count = 28) {
  const mainColor = '#FFD700'; // Bright Gold
  const coreColor = '#FFFFFF'; // White-hot core

  // 1. High-velocity directional metal welding needle spark streaks
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 7 + Math.random() * 17;
    spawnSparks(x, y, 1, 'parrySpark', {
      color: (i % 2 === 0) ? coreColor : mainColor,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.0 + Math.random() * 3.0,
      decay: 0.04 + Math.random() * 0.05
    });
  }

  // 2. Splintering 4-point cross star ember sparkles
  const emberCount = 14 + Math.floor(Math.random() * 6);
  for (let i = 0; i < emberCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 11;
    spawnSparks(x, y, 1, 'parryEmberStar', {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.2 + Math.random() * 3.2,
      decay: 0.035 + Math.random() * 0.045
    });
  }

  // 3. Blinding White-Hot Center Flare Burst
  spawnImpactFlash(x, y, 55, 'default');
  spawnImpactFlash(x, y, 35, 'default');

  // 4. Shockwave clash ring
  if (typeof spawnMeleeClashShockwave === 'function') {
    spawnMeleeClashShockwave(x, y, 70, 'gojo');
  }
}

/**
 * Spawns an epic high-fidelity anime self-destruction explosion visual sequence for Genos.
 * Includes multi-layered shockwave rings, ground scorch decals, sakuga impact frames,
 * thermal fireball spark bursts, radial wind lines, and smoke plumes.
 */
export function spawnGenosSelfDestructExplosion(x, y, radius = 220) {
  // Trigger massive arena screen shake (24 intensity, 60 frames)
  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(24, 60);
  }

  // ✦ Cyan Electric Starburst Flash — matching the reference spark visual
  triggerGenosSelfDestructFlash(x, y);

  // Expanding shockwave rings (Cyan + white) to complement the electric starburst
  if (typeof spawnMeleeClashShockwave === 'function') {
    spawnMeleeClashShockwave(x, y, radius * 1.8, 'gojo');  // Outer glowing cyan ring
    spawnMeleeClashShockwave(x, y, radius * 1.0, 'gojo');  // Inner tight cyan ring
  }
}

/**
 * Spawns an epic JJK Sakuga Boogie Woogie swap visual effect connecting two swapped positions (x1,y1) and (x2,y2).
 * Includes electric cyan vector beams, spatial shockwaves, impact flashes, and lightning sparks.
 */
export function spawnBoogieWoogieSwapEffect(x1, y1, x2, y2) {
  if (!state || !state.sparkEffects) return;

  // 1. Swap Lightning Vector Beam (lasts ~25 frames)
  const beam = ParticleSystem.getParticle();
  beam.x = x1;
  beam.y = y1;
  beam.targetX = x2;
  beam.targetY = y2;
  beam.size = 50; // MUST be finite number so line 593 doesn't skip it!
  beam.life = 1.0;
  beam.decay = 0.04;
  beam.type = 'boogieWoogieSwapBeam';
  beam.isFlash = true; // MUST be true to route into flash particle renderer!
  beam.isPixi = false; // MUST be false for 2D Canvas rendering!
  state.sparkEffects.push(beam);

  // 2. Dual Shockwaves at both Swap Positions
  spawnMeleeClashShockwave(x1, y1, 85, 'todo');
  spawnMeleeClashShockwave(x2, y2, 85, 'todo');

  // 3. Dual Cyan Sakuga Impact Flashes
  spawnImpactFlash(x1, y1, 35, '#00E5FF');
  spawnImpactFlash(x2, y2, 35, '#00E5FF');

  // 4. Dense Electric Cyan Sparks along the Swap Trajectory
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.min(22, Math.max(8, Math.floor(dist / 25)));

  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const px = x1 + dx * ratio;
    const py = y1 + dy * ratio;

    const sparkAngle = Math.random() * Math.PI * 2;
    const sparkSpeed = 3 + Math.random() * 8;
    spawnSparks(px, py, 1, 'lightningTrail', {
      color: (i % 2 === 0) ? '#00E5FF' : '#FFFFFF',
      vx: Math.cos(sparkAngle) * sparkSpeed,
      vy: Math.sin(sparkAngle) * sparkSpeed,
      size: 2.0 + Math.random() * 2.5,
      decay: 0.04 + Math.random() * 0.03
    });
  }
}

/**
 * Spawns Mahito's 5-Blade Razor Claw laceration slash impact burst across the struck entity.
 */
export function spawnMahitoClawScratchImpact(x, y, angle = 0, isTransformed = false) {
  if (!state || !state.sparkEffects) return;

  const slash = ParticleSystem.getParticle();
  slash.x = x;
  slash.y = y;
  slash.angle = angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.35;
  slash.size = isTransformed ? 48 : 36;
  slash.life = 1.0;
  slash.decay = 0.08;
  slash.type = 'mahitoClawScratchBurst';
  slash.isFlash = true;
  slash.isPixi = false;
  state.sparkEffects.push(slash);

  // Spurt of crimson blood splatters & neon magenta Cursed Energy sparks
  spawnSparks(x, y, isTransformed ? 12 : 8, 'basic', {
    color: isTransformed ? '#D946EF' : '#DC2626',
    speed: 6.0,
    size: 2.2,
    decay: 0.06
  });

  // Impact Shockwave
  spawnMeleeClashShockwave(x, y, isTransformed ? 45 : 32, isTransformed ? '#D946EF' : '#C026D3');
}

/**
 * Spawns Mahito's JJK Soul Disfigurement Detonation explosion.
 * Features:
 * - Nested expanding shockwave rings of neon magenta & electric cyan
 * - Blinding starburst core flash with jagged edges representing unstable soul transformation
 * - A flurry of high-speed flying soul/blood sparks (crimson, magenta, cyan)
 */
export function spawnMahitoSoulExplosion(x, y, radius = 95, isCompact = false) {
  if (!state || !state.sparkEffects) return;

  // 1. Core Blinding Starburst Flash
  const coreFlash = ParticleSystem.getParticle();
  coreFlash.x = x;
  coreFlash.y = y;
  coreFlash.vx = 0;
  coreFlash.vy = 0;
  coreFlash.size = radius * 0.4;
  coreFlash.targetSize = radius * 0.95;
  coreFlash.life = 1.0;
  coreFlash.decay = 0.065; // ~15 frames
  coreFlash.type = 'mahitoSoulCoreFlash';
  coreFlash.isFlash = true;
  coreFlash.isPixi = false;
  state.sparkEffects.push(coreFlash);

  // 2. Primary Expanding Shockwave (Outer Magenta/Indigo)
  const outerSw = ParticleSystem.getParticle();
  outerSw.x = x;
  outerSw.y = y;
  outerSw.vx = 0;
  outerSw.vy = 0;
  outerSw.size = 10;
  outerSw.targetSize = radius;
  outerSw.life = 1.0;
  outerSw.decay = 0.045; // ~22 frames
  outerSw.type = 'mahitoSoulShockwave';
  outerSw.isFlash = true;
  outerSw.isPixi = false;
  outerSw.color = 'magenta';
  state.sparkEffects.push(outerSw);

  // 3. Secondary Expanding Shockwave (Inner Cyan/White, faster decay)
  if (!isCompact) {
    const innerSw = ParticleSystem.getParticle();
    innerSw.x = x;
    innerSw.y = y;
    innerSw.vx = 0;
    innerSw.vy = 0;
    innerSw.size = 15;
    innerSw.targetSize = radius * 0.7;
    innerSw.life = 1.0;
    innerSw.decay = 0.055;
    innerSw.type = 'mahitoSoulShockwave';
    innerSw.isFlash = true;
    innerSw.isPixi = false;
    innerSw.color = 'cyan';
    state.sparkEffects.push(innerSw);
  }

  // 4. Violent explosion sparks flying in all directions
  const sparkColors = ['#DC2626', '#D946EF', '#00E5FF', '#F5D0FE'];
  const sparkCount = isCompact ? 6 : 24;
  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 10;
    const color = sparkColors[i % sparkColors.length];
    
    spawnSparks(x, y, 1, 'basic', {
      color: color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.5 + Math.random() * 2.2,
      decay: 0.035 + Math.random() * 0.035
    });
  }
}

/**
 * Spawns organic cursed energy soul bubbles that swell, float upward, and pop around Mahito.
 * Used during his Evasion Reconsolidation / Body Expansion phase.
 */
export function spawnMahitoSoulBubbles(x, y, count = 3) {
  if (!state || !state.sparkEffects) return;

  const bubbleColors = [
    { fill: 'rgba(217, 70, 239, 0.65)', stroke: '#F5D0FE' },
    { fill: 'rgba(192, 38, 211, 0.60)', stroke: '#D946EF' },
    { fill: 'rgba(168, 85, 247, 0.60)', stroke: '#E879F9' }
  ];

  for (let i = 0; i < count; i++) {
    const p = ParticleSystem.getParticle();
    p.x = x + (Math.random() - 0.5) * 28;
    p.y = y + (Math.random() - 0.5) * 28;
    p.vx = (Math.random() - 0.5) * 1.4;
    p.vy = -1.0 - Math.random() * 1.8;
    p.size = 4 + Math.random() * 5;
    p.targetSize = p.size * (1.8 + Math.random() * 0.8);
    p.life = 1.0;
    p.decay = 0.03 + Math.random() * 0.02;
    p.type = 'mahitoSoulBubble';
    p.isFlash = false;
    p.isPixi = false;
    p.bubbleColor = bubbleColors[i % bubbleColors.length];
    p.wobblePhase = Math.random() * Math.PI * 2;
    state.sparkEffects.push(p);
  }
}

/**
 * Spawns a visceral cursed jaw bite attack effect.
 * Features upper and lower fanged jaws snapping shut over the target with blood & cursed spark flash.
 */
export function spawnBiteAttackEffect(x, y, angle = 0, color = '#D946EF') {
  if (!state || !state.sparkEffects) return;

  const jaw = ParticleSystem.getParticle();
  jaw.x = x;
  jaw.y = y;
  jaw.vx = 0;
  jaw.vy = 0;
  jaw.angle = angle;
  jaw.color = color;
  jaw.size = 28;
  jaw.life = 1.0;
  jaw.decay = 0.075; // ~13 frames
  jaw.type = 'cursedBiteMaw';
  jaw.isFlash = false;
  jaw.isPixi = false;
  state.sparkEffects.push(jaw);

  // Impact flash & blood splatters
  spawnImpactFlash(x, y, 36, color);
  if (typeof spawnBloodEffect === 'function') {
    spawnBloodEffect({ x, y, r: 12, color: '#DC2626' }, 8);
  }
}

/**
 * Spawns Mahito's Domain Expansion Long-Range Sure-Hit Soul Tendril Strike.
 * Stretches a high-speed transfigured fleshy stitched arm directly from Mahito to the distant target.
 */
export function spawnMahitoDomainSoulTendrilStrike(startX, startY, targetX, targetY, isTransformed = false) {
  if (!state || !state.sparkEffects) return;

  const tendril = ParticleSystem.getParticle();
  tendril.x = (startX + targetX) / 2;
  tendril.y = (startY + targetY) / 2;
  tendril.startX = startX;
  tendril.startY = startY;
  tendril.targetX = targetX;
  tendril.targetY = targetY;
  tendril.isTransformed = isTransformed;
  tendril.wobblePhase = Math.random() * Math.PI * 2;
  tendril.size = 20;
  tendril.life = 1.0;
  tendril.decay = 0.065; // ~15 frames duration
  tendril.type = 'mahitoDomainSoulTendrilStrike';
  tendril.isFlash = true;
  tendril.isPixi = false;
  state.sparkEffects.push(tendril);

  // Burst of soul sparks & bubbles at point of origin
  spawnSparks(startX, startY, 4, 'basic', {
    color: isTransformed ? '#C026D3' : '#D946EF',
    speed: 4.0,
    size: 2.0,
    decay: 0.08
  });

  // Spawn claw scratch impact burst at target position
  const strikeAngle = Math.atan2(targetY - startY, targetX - startX);
  spawnMahitoClawScratchImpact(targetX, targetY, strikeAngle, isTransformed);

  // Expanding magenta soul shockwave ring at target
  const sw = ParticleSystem.getParticle();
  sw.x = targetX;
  sw.y = targetY;
  sw.size = 8;
  sw.targetSize = 48;
  sw.life = 1.0;
  sw.decay = 0.06;
  sw.type = 'mahitoSoulShockwave';
  sw.isFlash = true;
  sw.isPixi = false;
  sw.color = 'magenta';
  state.sparkEffects.push(sw);

  // Organic soul bubbles floating from impact
  spawnMahitoSoulBubbles(targetX, targetY, 2);
}