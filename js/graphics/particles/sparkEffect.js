// ─────────────────────────────────────────────
// SPARK EFFECT
// Visual-only particles for bullet impacts (e.g., Crimson Sniper wall hits)
// These bypass physics and collision entirely - pure visual decoration
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { fastCleanArray } from './visualTrailSystem.js';

import { ParticleSystem } from '../../systems/particles/ParticleSystem.js';

/**
 * Spawns spark effects at a position (visual-only, no collision).
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} count - Number of sparks to spawn
 * @param {string} type - 'crimson' for red/orange sparks, 'flash' for impact flash
 */
export function spawnSparks(x, y, count = 8, type = 'crimson') {
  ParticleSystem.spawn(x, y, count, type);
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
  ParticleSystem.spawn(x, y, 1, 'flash_default', {
    size: radius,
    decay: 0.15, // Fast fade
    type: type === 'crimsonSniper' ? 'crimsonSniperFlash' : 'flash',
    isFlash: true,
    color: 'rgba(255, 255, 255, 1)'
  });
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
    const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';
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

  for (const effect of state.sparkEffects) {
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
      } else if (effect.type === 'spellStealWisp') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = effect.color || '#39FF14';
        ctx.globalAlpha = effect.life * 0.8;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'groundScorch') {
        // Massive, highly-detailed organic scorch mark burned into the ground
        ctx.globalCompositeOperation = 'multiply';
        
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
        ctx.shadowBlur = 5;
        ctx.shadowColor = effect.color;
        
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
        ctx.globalCompositeOperation = 'multiply';
        
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
        ctx.globalCompositeOperation = 'multiply';
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
        // Impact flash - radial gradient glow
        const gradient = ctx.createRadialGradient(
          effect.x, effect.y, 0,
          effect.x, effect.y, effect.size
        );
        // Deep crimson core, sharp black edge
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(0.3, 'rgba(200, 0, 20, 0.6)');
        gradient.addColorStop(1, 'rgba(50, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else if (effect.type === 'arcaneAscendLine') {
        // Glowing vertical thin line ascending upwards
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = effect.color.replace('1)', `${effect.life})`);
        ctx.shadowBlur = 10;
        ctx.shadowColor = effect.color;
        ctx.lineWidth = effect.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(effect.x, effect.y);
        // Draw the line pointing downwards (opposite to vy) with a long stretch to form a beam
        ctx.lineTo(effect.x - effect.vx * 15, effect.y - effect.vy * 15); 
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'arcaneShockwave') {
        // Expanding dark green shockwave ring
        effect.size += (effect.targetSize - effect.size) * 0.06; // Much slower, graceful expansion
        
        ctx.strokeStyle = effect.color.replace('1)', `${effect.life})`);
        ctx.lineWidth = 6 * effect.life; // Thins out as it expands
        
        ctx.shadowBlur = 20 * effect.life;
        ctx.shadowColor = 'rgba(50, 255, 120, 1)';
        ctx.globalCompositeOperation = 'lighter'; // Neon additive edge
        
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'rikaRoarShockwave') {
        // Expanding hot-pink & dark ink cursed roar shockwave ring
        if (effect.targetSize) {
          effect.size += (effect.targetSize - effect.size) * 0.16;
        }
        
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
      } else if (effect.type === 'arcaneFlash') {
        // Bright radial flash beneath feet on landing
        effect.size += (effect.targetSize - effect.size) * 0.06; // Slower size blooming
        
        const gradient = ctx.createRadialGradient(
          effect.x, effect.y, 0,
          effect.x, effect.y, effect.size
        );
        gradient.addColorStop(0, `rgba(200, 255, 230, ${effect.life * 0.9})`);
        gradient.addColorStop(0.3, `rgba(100, 255, 180, ${effect.life * 0.6})`);
        gradient.addColorStop(0.7, `rgba(30, 200, 100, ${effect.life * 0.3})`);
        gradient.addColorStop(1, 'rgba(30, 200, 100, 0)');
        
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect.type === 'arcaneGlyph') {
        // Floating arcane glyph fragments - diamonds, triangles, squares
        ctx.translate(effect.x, effect.y);
        effect.rotation += effect.rotationSpeed;
        ctx.rotate(effect.rotation);
        
        // ctx.globalCompositeOperation = 'lighter'; // Removed so it shows up on white backgrounds!
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = effect.color.replace('1)', `${effect.life})`);
        ctx.shadowBlur = 8;
        ctx.shadowColor = effect.color;
        
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
        
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.rotate(-effect.rotation);
        ctx.translate(-effect.x, -effect.y);
      } else if (effect.type === 'healing') {
        // Bright blue healing particles for Gojo's Reverse Cursed Technique
        ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(50, 150, 255, 1)';
        
        const gradient = ctx.createRadialGradient(
          effect.x, effect.y, 0,
          effect.x, effect.y, effect.size
        );
        gradient.addColorStop(0, `rgba(200, 240, 255, ${effect.life})`);
        gradient.addColorStop(0.4, `rgba(50, 150, 255, ${effect.life * 0.8})`);
        gradient.addColorStop(1, 'rgba(0, 100, 200, 0)');
        
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
      } else {
        // Default impact flash
        const gradient = ctx.createRadialGradient(
          effect.x, effect.y, 0,
          effect.x, effect.y, effect.size
        );
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 180, 80, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
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
           ctx.shadowBlur = 30;
           ctx.shadowColor = `rgba(50, 255, 120, ${effect.life})`;
           ctx.strokeStyle = `rgba(50, 255, 120, ${effect.life * 0.9})`;
           ctx.lineWidth = 6; // Thick stroke so the edge peeks out
           ctx.stroke(); 
           
           ctx.shadowBlur = 0; // Reset
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
      const auraGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, effect.size * 1.5);
      auraGradient.addColorStop(0, `rgba(46, 139, 87, ${effect.life * 0.6})`);
      auraGradient.addColorStop(1, 'rgba(46, 139, 87, 0)');
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(0, 0, effect.size * 1.5, 0, Math.PI * 2);
      ctx.fill();

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

      // Ground impact shadow (dark circle at base for visibility on white)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = isYutaClash ? `rgba(40, 10, 35, ${effect.life * 0.45})` : (isTojiClash ? `rgba(20, 22, 25, ${effect.life * 0.5})` : (isMahoragaClash ? `rgba(35, 30, 10, ${effect.life * 0.45})` : `rgba(30, 10, 40, ${effect.life * 0.4})`));
      ctx.beginPath();
      ctx.ellipse(effect.x, effect.y + 5, effect.size * 1.1, effect.size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';

      if (isMahoragaClash) {
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
    } else if (effect.type === 'rikaRoarShockwave') {
      // Expanding dark purple & hot pink cursed energy roar shockwave ring
      effect.size += (effect.targetSize - effect.size) * 0.18;
      
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = 25 * effect.life;
      ctx.shadowColor = 'rgba(255, 20, 147, 1)';

      // Outer glowing hot pink cursed energy shockwave ring
      ctx.strokeStyle = `rgba(255, 20, 147, ${effect.life * 0.95})`;
      ctx.lineWidth = 12 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();

      // Middle dark-purple contrast ring
      ctx.strokeStyle = `rgba(138, 43, 226, ${effect.life * 0.8})`;
      ctx.lineWidth = 6 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.82), 0, Math.PI * 2);
      ctx.stroke();

      // Inner white-hot core ring
      ctx.shadowColor = 'rgba(255, 255, 255, 1)';
      ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
      ctx.lineWidth = 4 * effect.life;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(1, effect.size * 0.65), 0, Math.PI * 2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    } else {
      // Standard spark - small glowing dot with gradient
      const gradient = ctx.createRadialGradient(
        effect.x, effect.y, 0,
        effect.x, effect.y, effect.size
      );
      gradient.addColorStop(0, effect.color);
      gradient.addColorStop(0.5, effect.color.replace('1)', '0.6)'));
      
      if (effect.type === 'crimsonSniper') {
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (effect.type === 'lightningTrail') {
        gradient.addColorStop(1, effect.color.replace(/[\d.]+\)$/, '0)'));
      } else if (effect.type === 'rikaCurse') {
        gradient.addColorStop(1, effect.color.replace('1)', '0)'));
      } else {
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
      }

      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
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
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';
  const fps = state.fps || 60;
  const MAX_SHOCKWAVES = isMulti ? (fps < 45 ? 5 : 10) : 20;

  if (state.sparkEffects.length >= MAX_SHOCKWAVES) {
    const oldest = state.sparkEffects.shift();
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
  shockwave.isFlash = true;
  shockwave.color = 'clash';

  state.sparkEffects.push(shockwave);
}

/**
 * Spawns an expanding dark purple/pink cursed energy roar shockwave ring for Rika.
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Target radius of shockwave
 */
export function spawnRikaRoarShockwave(x, y, radius = 180) {
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Stand Off' && state.mode !== 'Training';
  const fps = state.fps || 60;
  const MAX_SHOCKWAVES = isMulti ? (fps < 45 ? 5 : 10) : 25;

  if (state.sparkEffects.length >= MAX_SHOCKWAVES) {
    const oldest = state.sparkEffects.shift();
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

  state.sparkEffects.push(shockwave);
}