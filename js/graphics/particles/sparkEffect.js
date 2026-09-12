// ─────────────────────────────────────────────
// SPARK EFFECT
// Visual-only particles for bullet impacts (e.g., Crimson Sniper wall hits)
// These bypass physics and collision entirely - pure visual decoration
// ─────────────────────────────────────────────
import { state, triggerGlobalScreenShake } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { fastCleanArray } from './visualTrailSystem.js';
import { triggerGenosSelfDestructFlash } from '../renderers/effectsRenderer.js';
import { ParticleSystem, isProtectedParticle } from '../../systems/particles/ParticleSystem.js';

import { drawGroundScorch, drawArcaneGroundScorch } from './renderers/groundDecalRenderers.js';
import {
  drawMeleeClashShockwave,
  drawMahoragaShoutShockwave,
  drawRikaRoarShockwave,
  drawPurpleShockwaveRing,
  drawAnimeImpactFrame,
  drawPunchWindSpeedLine,
  drawSaitamaCounterFrontalBlast,
  drawGojoRedFrontalBlast,
  drawArcaneShockwave,
} from './renderers/blastShockwaveRenderers.js';
import {
  drawMahitoSoulBubble,
  drawMahitoSoulShockwave,
  drawMahitoSoulCoreFlash,
  drawMahitoClawScratchBurst,
  drawMahitoDomainSoulTendrilStrike,
  drawCursedBiteMaw,
  drawArcaneFlash,
  drawArcaneGlyph,
  drawSpellStealWisp,
  drawHealingEffect,
  drawYutaBeamPinkCore,
  drawBoogieWoogieSwapBeam,
  drawCrimsonLightningCore,
  drawCrimsonLightningRing,
  drawRubbickCastSigil,
  drawRubbickGroundSigil,
} from './renderers/characterSpecialRenderers.js';

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return null;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
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
export function spawnCrimsonLightningImpact(x, y, radius = 60, isRubbick = false) {
  // 1. Bright white-crimson core flash
  ParticleSystem.spawn(x, y, 1, 'default', {
    vx: 0, vy: 0,
    size: radius * 0.6,
    decay: 0.08,
    type: isRubbick ? 'rubbickLightningCore' : 'crimsonLightningCore',
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
      type: isRubbick ? 'rubbickLightningRing' : 'crimsonLightningRing',
      isFlash: true,
      friction: 1,
      color: isRubbick ? 'lime' : 'crimson'
    });
  }

  // 3. Radial lightning arc sparks shooting outward
  const arcCount = 8 + Math.floor(Math.random() * 4);
  for (let i = 0; i < arcCount; i++) {
    const angle = (i / arcCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = 4 + Math.random() * 6;
    const rand = Math.random();
    let color;
    if (isRubbick) {
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
      type: isRubbick ? 'rubbickLightningArc' : 'crimsonLightningArc',
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

export function spawnSpellStealWisps(rubbick, target, color, count = 20) {
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
    spark.targetRef = rubbick;
    spark.color = color || '#39FF14'; // Fallback to green
    spark.size = 8 + Math.random() * 6; // Much larger
    spark.life = 1.5; // Start with >1 alpha to persist longer
    spark.decay = 0.01 + Math.random() * 0.01;
    spark.friction = 0.90;
    
    state.sparkEffects.push(spark);
  }
}

/**
 * Spawns an authentic discrete pixel-art Arcane Cast Sigil and muzzle burst
 * at the tip of Rubbick's staff when executing a basic attack (Arcane Bolt).
 * @param {number} x - Staff crystal tip X
 * @param {number} x - Staff crystal tip X
 * @param {number} y - Staff crystal tip Y
 * @param {number} angle - Aim angle / firing direction
 * @param {string} color - Theme color (defaults to '#00FF64')
 * @param {object} [fighter] - Rubbick fighter entity instance for ground decal / floor anchoring
 */
export function spawnRubbickCastEffect(x, y, angle = 0, color = '#00FF64', fighter = null) {
  if (!state.sparkEffects) return;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  if (state.sparkEffects.length >= (isMulti ? 250 : 500)) return;

  // 1. Expanding Arcane Runic Sigil (Magic Circle)
  const sigil = ParticleSystem.getParticle();
  sigil.x = x;
  sigil.y = y;
  sigil.vx = Math.cos(angle) * 0.4;
  sigil.vy = Math.sin(angle) * 0.4;
  sigil.size = 10;
  sigil.targetSize = 38;
  sigil.life = 1.0;
  sigil.decay = 1 / 18; // ~18 frames duration
  sigil.friction = 0.92;
  sigil.type = 'rubbickCastSigil';
  sigil.angle = angle;
  sigil.rotation = Math.random() * Math.PI * 2;
  sigil.color = color;
  state.sparkEffects.push(sigil);

  // 2. High-brightness emerald-white muzzle flash burst
  const flash = ParticleSystem.getParticle();
  flash.x = x;
  flash.y = y;
  flash.vx = 0;
  flash.vy = 0;
  flash.size = 16;
  flash.targetSize = 32;
  flash.life = 1.0;
  flash.decay = 1 / 10; // 10 frames
  flash.friction = 0;
  flash.type = 'arcaneFlash';
  flash.color = 'rgba(180, 255, 210, 1)';
  state.sparkEffects.push(flash);

  // 3. Directional Arcane Muzzle Sparks (Tight cone forward along angle)
  const sparkColors = ['#FFFFFF', '#00FF64', '#70FFAB', '#00E5FF'];
  const sparkCount = 8;
  for (let i = 0; i < sparkCount; i++) {
    const sAng = angle + (Math.random() - 0.5) * 0.55;
    const speed = 5 + Math.random() * 8;
    const spark = ParticleSystem.getParticle();
    spark.x = x;
    spark.y = y;
    spark.vx = Math.cos(sAng) * speed;
    spark.vy = Math.sin(sAng) * speed;
    spark.size = 2.0 + Math.random() * 2.5;
    spark.life = 1.0;
    spark.decay = 0.09 + Math.random() * 0.05; // 8-12 frames
    spark.friction = 0.88;
    spark.type = 'arcane';
    spark.color = sparkColors[i % sparkColors.length];
    state.sparkEffects.push(spark);
  }

  // 4. Subtle drifting arcane glyph fragments
  for (let g = 0; g < 3; g++) {
    const gAng = angle + (Math.random() - 0.5) * 0.8;
    const gSpeed = 1.5 + Math.random() * 2.5;
    const glyph = ParticleSystem.getParticle();
    glyph.x = x + Math.cos(gAng) * 8;
    glyph.y = y + Math.sin(gAng) * 8;
    glyph.vx = Math.cos(gAng) * gSpeed;
    glyph.vy = Math.sin(gAng) * gSpeed - 0.3;
    glyph.size = 3 + Math.random() * 3;
    glyph.life = 1.0;
    glyph.decay = 0.04 + Math.random() * 0.03; // ~15-25 frames
    glyph.friction = 0.94;
    glyph.type = 'arcaneGlyph';
    glyph.rotation = Math.random() * Math.PI * 2;
    glyph.rotationSpeed = (Math.random() - 0.5) * 0.15;
    glyph.color = sparkColors[g % sparkColors.length];
    glyph.glyphShape = (g % 2 === 0) ? 'diamond' : 'triangle';
    state.sparkEffects.push(glyph);
  }

  // 5. Supersonic Arcane Needle Speed Lines (Rule #16)
  spawnPunchWindSpeedLines(x, y, angle, 160, 'emerald');

  // 6. Ground Summoning Matrix beneath Rubbick's feet on the arena floor
  if (fighter && Number.isFinite(fighter.x) && Number.isFinite(fighter.y)) {
    const groundSigil = ParticleSystem.getParticle();
    groundSigil.x = fighter.x;
    groundSigil.y = fighter.y;
    groundSigil.vx = 0;
    groundSigil.vy = 0;
    groundSigil.size = 14;
    groundSigil.targetSize = (fighter.r || 25) * 2.3;
    groundSigil.life = 1.0;
    groundSigil.decay = 1 / 20; // ~20 frames duration
    groundSigil.friction = 0.90;
    groundSigil.type = 'rubbickGroundSigil';
    groundSigil.rotation = Math.random() * Math.PI * 2;
    groundSigil.color = color;
    state.sparkEffects.push(groundSigil);
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

    // Remove dead effects
    if (effect.life <= 0) {
      if (effect.isPixi && effect.sprite && effect.sprite.parent) {
        effect.sprite.parent.removeChild(effect.sprite);
        effect.sprite.destroy();
      }
      return false;
    }
    return true;
  });
}

function drawCrimsonSniperFlash(ctx, effect) {
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
}

function drawArcaneAscendLine(ctx, effect) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.max(0, Math.min(1.0, effect.life));
  const baseColor = effect.color || 'rgba(0, 255, 102, 1)';

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
  ctx.fillRect(cx - P * 0.5, cy - P * 0.5, P, P);

  ctx.fillStyle = baseColor.replace(/[\d\.]+\)$/, `${(alpha * 0.95).toFixed(2)})`);
  ctx.fillRect(cx - P * 1.5, cy - P * 0.5, P, P);
  ctx.fillRect(cx + P * 0.5, cy - P * 0.5, P, P);
  ctx.fillRect(cx - P * 0.5, cy - P * 1.5, P, P);
  ctx.fillRect(cx - P * 0.5, cy + P * 0.5, P, P);

  ctx.fillStyle = baseColor.replace(/[\d\.]+\)$/, `${(alpha * 0.40).toFixed(2)})`);
  ctx.fillRect(cx - P * 2.5, cy - P * 0.5, P, P);
  ctx.fillRect(cx + P * 1.5, cy - P * 0.5, P, P);
  ctx.fillRect(cx - P * 0.5, cy - P * 2.5, P, P);
  ctx.fillRect(cx - P * 0.5, cy + P * 1.5, P, P);

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
}

function drawThunderSpark(ctx, effect) {
  ctx.strokeStyle = effect.color.replace('1)', `${effect.life})`);
  ctx.lineWidth = effect.size * 0.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(effect.x, effect.y);
  
  const tailX = effect.x - effect.vx * 3;
  const tailY = effect.y - effect.vy * 3;
  const midX = (effect.x + tailX) / 2 + (Math.random() - 0.5) * effect.size * 3;
  const midY = (effect.y + tailY) / 2 + (Math.random() - 0.5) * effect.size * 3;
  
  ctx.lineTo(midX, midY);
  ctx.lineTo(tailX, tailY);
  ctx.stroke();
}

function drawParrySpark(ctx, effect) {
  const speed = Math.hypot(effect.vx || 0, effect.vy || 0);
  const angle = Math.atan2(effect.vy || 0, effect.vx || 1);
  const tailLen = Math.max(10, speed * (2.8 + (1 - effect.life) * 1.6));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const isRicochet = effect.type === 'slashRicochet';
  const outerColor = isRicochet ? `rgba(255, 30, 40, ${effect.life * 0.65})` : `rgba(255, 90, 0, ${effect.life * 0.55})`;
  const midColor = isRicochet ? `rgba(255, 180, 50, ${effect.life * 0.85})` : `rgba(255, 220, 80, ${effect.life * 0.85})`;

  ctx.strokeStyle = outerColor;
  ctx.lineWidth = effect.size * 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(effect.x, effect.y);
  ctx.lineTo(effect.x - Math.cos(angle) * tailLen, effect.y - Math.sin(angle) * tailLen);
  ctx.stroke();

  ctx.strokeStyle = midColor;
  ctx.lineWidth = effect.size * 1.1;
  ctx.beginPath();
  ctx.moveTo(effect.x, effect.y);
  ctx.lineTo(effect.x - Math.cos(angle) * (tailLen * 0.75), effect.y - Math.sin(angle) * (tailLen * 0.75));
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 255, 255, ${effect.life * 0.98})`;
  ctx.lineWidth = Math.max(1, effect.size * 0.45);
  ctx.beginPath();
  ctx.moveTo(effect.x, effect.y);
  ctx.lineTo(effect.x - Math.cos(angle) * (tailLen * 0.45), effect.y - Math.sin(angle) * (tailLen * 0.45));
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 255, 255, ${effect.life})`;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, Math.max(1.3, effect.size * 0.5), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParryEmberStar(ctx, effect) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(effect.x, effect.y);
  if (effect.rotation !== undefined) {
    effect.rotation += effect.rotationSpeed || 0.1;
    ctx.rotate(effect.rotation);
  }

  const starSize = effect.size * (0.8 + Math.sin(effect.life * Math.PI) * 0.5);
  const alpha = effect.life;

  ctx.fillStyle = `rgba(255, 140, 10, ${alpha * 0.6})`;
  ctx.beginPath();
  ctx.arc(0, 0, starSize * 1.6, 0, Math.PI * 2);
  ctx.fill();

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
}

function drawCrimsonLightningArc(ctx, effect) {
  const len = effect.size * 4;
  const angle = Math.atan2(effect.vy, effect.vx);
  ctx.strokeStyle = effect.color.replace('1)', `${effect.life})`);
  ctx.lineWidth = 1 + effect.life;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(effect.x, effect.y);
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
}

function drawArcaneSmoke(ctx, effect) {
  if (effect.type === 'arcaneSmokeAirborne') {
    effect.size += (effect.targetSize - effect.size) * 0.03;
  } else {
    effect.size += (effect.targetSize - effect.size) * 0.07;
  }
  
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.5;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.max(0, Math.min(1.0, effect.life * 0.9));
  const smR = Math.max(P * 2, snap(effect.size * 0.75));

  ctx.translate(cx, cy);

  const isAir = (effect.type === 'arcaneSmokeAirborne');
  const colBorder = isAir ? `rgba(5, 30, 20, ${(alpha * 0.8).toFixed(2)})` : `rgba(15, 25, 20, ${(alpha * 0.7).toFixed(2)})`;
  const colBody = isAir ? `rgba(0, 200, 140, ${(alpha * 0.65).toFixed(2)})` : `rgba(40, 100, 75, ${(alpha * 0.50).toFixed(2)})`;
  const colHighlight = isAir ? `rgba(180, 255, 220, ${(alpha * 0.85).toFixed(2)})` : `rgba(120, 200, 160, ${(alpha * 0.60).toFixed(2)})`;

  ctx.fillStyle = colBorder;
  ctx.fillRect(-smR - P, -smR * 0.6 - P, (smR + P) * 2, (smR * 0.6 + P) * 2);
  ctx.fillRect(-smR * 0.6 - P, -smR - P, (smR * 0.6 + P) * 2, (smR + P) * 2);
  ctx.fillRect(-smR * 0.4 - P, smR * 0.2 - P, (smR * 0.8 + P) * 2, (smR * 0.4 + P) * 2);

  ctx.fillStyle = colBody;
  ctx.fillRect(-smR, -smR * 0.6, smR * 2, smR * 1.2);
  ctx.fillRect(-smR * 0.6, -smR, smR * 1.2, smR * 2);
  ctx.fillRect(-smR * 0.4, smR * 0.2, smR * 1.6, smR * 0.8);

  ctx.fillStyle = colHighlight;
  ctx.fillRect(-smR * 0.6, -smR * 0.8, smR * 0.8, smR * 0.6);
  ctx.fillRect(-smR * 0.8, -smR * 0.4, smR * 0.5, smR * 0.5);

  ctx.restore();
}

function drawTojiWindPebble(ctx, effect) {
  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.rotate(effect.rotation || 0);
  ctx.fillStyle = effect.color || '#3A3D40';
  ctx.globalAlpha = Math.min(1.0, effect.life * 1.3);
  
  ctx.beginPath();
  const s = effect.size;
  ctx.moveTo(-s, -s * 0.6);
  ctx.lineTo(s * 0.8, -s * 0.8);
  ctx.lineTo(s, s * 0.4);
  ctx.lineTo(-s * 0.4, s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTojiWindLeaf(ctx, effect) {
  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.rotate((effect.rotation || 0) + effect.life * 0.1);
  ctx.fillStyle = effect.color || '#2E8B57';
  ctx.globalAlpha = Math.min(1.0, effect.life * 1.3);
  
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
}

function drawTelekinesisDebris(ctx, effect) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.min(1.0, effect.life * 1.25);
  const s = Math.max(P * 2, snap(effect.size || 6));

  ctx.translate(cx, cy);
  if (effect.rotation) {
    const snappedRot = Math.round(effect.rotation / (Math.PI / 8)) * (Math.PI / 8);
    ctx.rotate(snappedRot);
  }

  if (effect.type === 'telekinesisDebris') {
    const auraTime = performance.now() * 0.005 + (effect.rotation || 0);
    for (let a = 0; a < 3; a++) {
      const aAng = auraTime + (a * Math.PI * 2 / 3);
      const ax = snap(Math.cos(aAng) * (s * 1.4));
      const ay = snap(Math.sin(aAng) * (s * 1.4));
      ctx.fillStyle = (a % 2 === 0) 
        ? `rgba(0, 255, 100, ${(alpha * 0.80).toFixed(2)})` 
        : `rgba(255, 255, 255, ${(alpha * 0.85).toFixed(2)})`;
      ctx.fillRect(ax, ay, P, P);
    }
  }

  ctx.fillStyle = `rgba(10, 18, 14, ${(alpha * 0.95).toFixed(2)})`;
  ctx.fillRect(-s - P, -s * 0.6 - P, (s + P) * 2, (s * 0.6 + P) * 2);
  ctx.fillRect(-s * 0.7 - P, -s - P, (s * 0.7 + P) * 2, (s + P) * 2);

  ctx.fillStyle = `rgba(28, 42, 35, ${alpha.toFixed(2)})`;
  ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
  ctx.fillRect(-s * 0.7, -s * 0.9, s * 1.4, s * 1.8);

  ctx.fillStyle = `rgba(52, 85, 70, ${alpha.toFixed(2)})`;
  ctx.fillRect(-s * 0.8, -s * 0.7, s * 1.2, s * 1.1);
  ctx.fillRect(-s * 0.5, -s * 0.8, s * 1.0, s * 1.3);

  ctx.fillStyle = `rgba(100, 240, 160, ${(alpha * 0.90).toFixed(2)})`;
  ctx.fillRect(-s * 0.7, -s * 0.8, s * 0.8, P);
  ctx.fillRect(-s * 0.8, -s * 0.5, P, s * 0.6);

  ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(2)})`;
  ctx.fillRect(-s * 0.4, -s * 0.6, P, P);

  ctx.restore();
}

function drawArcaneSparkle(ctx, effect) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.max(0, Math.min(1.0, effect.life));
  const baseCol = effect.color || '#00FF64';

  ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(2)})`;
  ctx.fillRect(cx - P * 0.5, cy - P * 0.5, P, P);

  ctx.fillStyle = baseCol;
  ctx.globalAlpha = alpha * 0.90;
  ctx.fillRect(cx - P * 1.5, cy - P * 0.5, P, P);
  ctx.fillRect(cx + P * 0.5, cy - P * 0.5, P, P);
  ctx.fillRect(cx - P * 0.5, cy - P * 1.5, P, P);
  ctx.fillRect(cx - P * 0.5, cy + P * 0.5, P, P);

  if (effect.vx || effect.vy) {
    const tx = snap(effect.x - (effect.vx || 0) * 1.8);
    const ty = snap(effect.y - (effect.vy || 0) * 1.8);
    ctx.globalAlpha = alpha * 0.50;
    ctx.fillRect(tx - P * 0.5, ty - P * 0.5, P, P);
  }

  ctx.restore();
}

function drawDefaultImpactFlash(ctx, effect) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const flashR = Math.max(P * 2, effect.size * effect.life);

  ctx.fillStyle = `rgba(255, 200, 80, ${(effect.life * 0.75).toFixed(3)})`;
  ctx.fillRect(effect.x - flashR, effect.y - P, flashR * 2, P * 2);
  ctx.fillRect(effect.x - P, effect.y - flashR, P * 2, flashR * 2);

  ctx.fillStyle = `rgba(255, 255, 255, ${(effect.life * 0.95).toFixed(3)})`;
  const coreR = Math.max(P, Math.round((flashR * 0.4) / P) * P);
  ctx.fillRect(effect.x - coreR, effect.y - coreR, coreR * 2, coreR * 2);

  ctx.restore();
}

function drawStandardSpark(ctx, effect, isGamePlay) {
  const safeColor = (typeof effect.color === 'string' && effect.color) ? effect.color : '#00E5FF';
  if (isGamePlay) {
    ctx.fillStyle = safeColor;
  } else {
    const r = Math.max(0.1, effect.size || 1);
    const gradient = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, r);
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

// ─────────────────────────────────────────────
// O(1) SPARK RENDERER DISPATCH TABLE
// Replaces 2,400+ line linear if-else ladders with instant dictionary lookup
// ─────────────────────────────────────────────
const SPARK_RENDERERS = {
  // Ground Decals
  groundScorch: (ctx, effect, isGamePlay) => drawGroundScorch(ctx, effect, isGamePlay),
  arcaneGroundScorch: (ctx, effect) => drawArcaneGroundScorch(ctx, effect),

  // Blast & Shockwaves
  meleeClashShockwave: drawMeleeClashShockwave,
  mahoragaShoutShockwave: drawMahoragaShoutShockwave,
  rikaRoarShockwave: drawRikaRoarShockwave,
  purpleShockwaveRing: drawPurpleShockwaveRing,
  animeImpactFrame: drawAnimeImpactFrame,
  punchWindSpeedLine: drawPunchWindSpeedLine,
  saitamaCounterFrontalBlast: drawSaitamaCounterFrontalBlast,
  gojoRedFrontalBlast: drawGojoRedFrontalBlast,
  arcaneShockwave: drawArcaneShockwave,

  // Character Specials
  mahitoSoulBubble: drawMahitoSoulBubble,
  mahitoSoulShockwave: drawMahitoSoulShockwave,
  mahitoSoulCoreFlash: drawMahitoSoulCoreFlash,
  mahitoClawScratchBurst: drawMahitoClawScratchBurst,
  mahitoDomainSoulTendrilStrike: drawMahitoDomainSoulTendrilStrike,
  cursedBiteMaw: drawCursedBiteMaw,
  arcaneFlash: drawArcaneFlash,
  arcaneGlyph: drawArcaneGlyph,
  spellStealWisp: drawSpellStealWisp,
  rubbickCastSigil: drawRubbickCastSigil,
  rubbickGroundSigil: drawRubbickGroundSigil,
  healing: drawHealingEffect,
  yutaBeamPinkCore: drawYutaBeamPinkCore,
  boogieWoogieSwapBeam: drawBoogieWoogieSwapBeam,
  crimsonLightningCore: drawCrimsonLightningCore,
  rubbickLightningCore: drawCrimsonLightningCore,
  tricksterLightningCore: drawCrimsonLightningCore,
  crimsonLightningRing: drawCrimsonLightningRing,
  rubbickLightningRing: drawCrimsonLightningRing,
  tricksterLightningRing: drawCrimsonLightningRing,

  // Compact Particles
  crimsonSniperFlash: drawCrimsonSniperFlash,
  arcaneAscendLine: drawArcaneAscendLine,
  thunderSpark: drawThunderSpark,
  parrySpark: drawParrySpark,
  slashRicochet: drawParrySpark,
  parryEmberStar: drawParryEmberStar,
  crimsonLightningArc: drawCrimsonLightningArc,
  rubbickLightningArc: drawCrimsonLightningArc,
  tricksterLightningArc: drawCrimsonLightningArc,
  arcaneSmokeAirborne: drawArcaneSmoke,
  arcaneSmoke: drawArcaneSmoke,
  arcaneSmokeGround: drawArcaneSmoke,
  laserSmoke: drawArcaneSmoke,
  tojiWindPebble: drawTojiWindPebble,
  tojiWindLeaf: drawTojiWindLeaf,
  telekinesisDebris: drawTelekinesisDebris,
  telekinesisDebrisScattered: drawTelekinesisDebris,
  arcane: drawArcaneSparkle,
};

/**
 * Draws all spark effects using O(1) table dispatch (no shadowBlur).
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
    if (!Number.isFinite(effect.x) || !Number.isFinite(effect.y)) continue;
    if (effect.size !== undefined && !Number.isFinite(effect.size)) continue;

    ctx.save();
    ctx.globalAlpha = effect.life;

    const renderer = SPARK_RENDERERS[effect.type];
    if (renderer) {
      renderer(ctx, effect, isGamePlay);
    } else if (effect.isFlash) {
      drawDefaultImpactFlash(ctx, effect);
    } else {
      drawStandardSpark(ctx, effect, isGamePlay);
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
  const isGojoInfinity = (clashType === 'gojo_infinity');
  if (isGojoInfinity) {
    const maxGojoInfinity = CONFIG.gojo?.infinityMaxActiveShockwaves ?? 2;
    let gojoInfinityCount = 0;
    let oldestGojoInfinity = null;

    for (let i = 0; i < state.sparkEffects.length; i++) {
      const p = state.sparkEffects[i];
      if (p && p.type === 'meleeClashShockwave' && p.clashType === 'gojo_infinity' && p.life > 0) {
        gojoInfinityCount++;
        if (!oldestGojoInfinity || p.life < oldestGojoInfinity.life) {
          oldestGojoInfinity = p;
        }
      }
    }

    if (gojoInfinityCount >= maxGojoInfinity && oldestGojoInfinity) {
      // Re-energize and reposition the oldest active Gojo Infinity shockwave without allocating new particles
      oldestGojoInfinity.x = x;
      oldestGojoInfinity.y = y;
      oldestGojoInfinity.size = radius * 0.25;
      oldestGojoInfinity.targetSize = radius;
      oldestGojoInfinity.life = 1.0;
      oldestGojoInfinity.decay = 0.055;
      return;
    }
  }

  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const fps = state.fps || 60;
  const MAX_SHOCKWAVES = isMulti ? (fps < 45 ? 60 : 120) : 180;
  let insertIdx = -1;
  if (state.sparkEffects.length >= MAX_SHOCKWAVES) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const randIdx = Math.floor(Math.random() * state.sparkEffects.length);
      const cand = state.sparkEffects[randIdx];
      if (cand && !isProtectedParticle(cand)) {
        insertIdx = randIdx;
        ParticleSystem.returnParticle(cand);
        break;
      }
    }
  }

  const shockwave = ParticleSystem.getParticle();
  shockwave.x = x;
  shockwave.y = y;
  shockwave.vx = 0;
  shockwave.vy = 0;
  shockwave.size = radius * 0.2; // starts small
  shockwave.targetSize = radius; // expands to this size
  shockwave.life = 1.0;
  shockwave.decay = isGojoInfinity ? 0.055 : 0.04;
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

  shockwave.isProtected = true;
  shockwave.isPixi = false;
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
  const MAX_SHOCKWAVES = isMulti ? (fps < 45 ? 60 : 120) : 180;
  let insertIdx = -1;
  if (state.sparkEffects.length >= MAX_SHOCKWAVES) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const randIdx = Math.floor(Math.random() * state.sparkEffects.length);
      const cand = state.sparkEffects[randIdx];
      if (cand && !isProtectedParticle(cand)) {
        insertIdx = randIdx;
        ParticleSystem.returnParticle(cand);
        break;
      }
    }
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
  const MAX_SHOCKWAVES = isMulti ? (fps < 45 ? 60 : 120) : 180;
  let insertIdx = -1;
  if (state.sparkEffects.length >= MAX_SHOCKWAVES) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const randIdx = Math.floor(Math.random() * state.sparkEffects.length);
      const cand = state.sparkEffects[randIdx];
      if (cand && !isProtectedParticle(cand)) {
        insertIdx = randIdx;
        ParticleSystem.returnParticle(cand);
        break;
      }
    }
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
      for (let attempt = 0; attempt < 8; attempt++) {
        const randIdx = Math.floor(Math.random() * state.sparkEffects.length);
        const cand = state.sparkEffects[randIdx];
        if (cand && !isProtectedParticle(cand)) {
          insertIdx = randIdx;
          ParticleSystem.returnParticle(cand);
          break;
        }
      }
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
      for (let attempt = 0; attempt < 8; attempt++) {
        const randIdx = Math.floor(Math.random() * state.sparkEffects.length);
        const cand = state.sparkEffects[randIdx];
        if (cand && !isProtectedParticle(cand)) {
          insertIdx = randIdx;
          ParticleSystem.returnParticle(cand);
          break;
        }
      }
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

    if (theme === 'emerald' || theme === 'arcane') {
      const colors = ['#FFFFFF', '#00FF64', '#70FFAB', '#00E5FF', '#06120A'];
      line.color = colors[Math.floor(Math.random() * colors.length)];
    } else if (theme === 'orange') {
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
 * @param {number} reach - Length of the frontal shockwave (default 1000px)
 * @param {number} arcAngle - Wide frontal cone angle in radians (default 120 deg)
 */
export function spawnSaitamaCounterFrontalBlast(x, y, angle = 0, reach = 1000, arcAngle = (120 * Math.PI) / 180) {
  const blast = ParticleSystem.getParticle();
  blast.x = x;
  blast.y = y;
  blast.vx = 0;
  blast.vy = 0;
  blast.size = reach;
  blast.targetSize = reach;
  blast.angle = angle;
  blast.reach = reach;
  blast.arcAngle = arcAngle;
  blast.life = 1.0;
  blast.decay = 0.038; // ~26 frames duration (fast, punchy supersonic shockwave)
  blast.friction = 1.0;
  blast.type = 'saitamaCounterFrontalBlast';
  blast.isFlash = true;
  blast.isProtected = true;
  blast.isPixi = false;
  blast.sprite = null;

  if (state.sparkEffects) {
    state.sparkEffects.push(blast);
  }

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Crisp punch impact flash at fist origin
  if (typeof spawnImpactFlash === 'function') {
    spawnImpactFlash(x, y, 45, '#FFEE58');
  }

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
 * Spawns a massive Jujutsu Kaisen Cursed Technique Reversal: Red frontal repulsion blast.
 * Creates an intense crimson/ruby supersonic shockwave laser corridor with fractured shards,
 * distortion arcs, expanding repulsion rings, and high-velocity cursed energy sparks.
 * @param {number} x - Origin X (Gojo's position)
 * @param {number} y - Origin Y
 * @param {number} angle - Facing/Blast trajectory angle in radians
 * @param {number} reach - Length of the frontal corridor (default 650px)
 * @param {number} arcAngle - Frontal cone angle in radians (default 0.76 rad / ~44 deg)
 */
export function spawnGojoRedFrontalBlast(x, y, angle = 0, reach = 650, arcAngle = 0.76, opts = {}) {
  const finalReach = reach || (typeof CONFIG !== 'undefined' && (CONFIG.gojo?.redFrontalReach || CONFIG.gojo?.redRange)) || 650;
  const finalArc = arcAngle || (typeof CONFIG !== 'undefined' && CONFIG.gojo?.redFrontalArc) || 0.76;
  const blast = ParticleSystem.getParticle();
  blast.x = x;
  blast.y = y;
  blast.vx = 0;
  blast.vy = 0;
  blast.size = finalReach;
  blast.targetSize = finalReach;
  blast.angle = angle;
  blast.reach = finalReach;
  blast.arcAngle = finalArc;
  blast.life = 1.0;
  blast.decay = 0.040; // ~25 frames duration
  blast.friction = 1.0;
  blast.type = 'gojoRedFrontalBlast';
  blast.isFlash = true;
  blast.isProtected = true;
  blast.isPixi = false;
  blast.sprite = null;
  blast.colorTheme = opts.colorTheme || (opts.isRubbick ? 'green' : 'red');
  blast.isRubbick = Boolean(opts.isRubbick || opts.isTrickster);

  if (state.sparkEffects) {
    state.sparkEffects.push(blast);
  }

  // Dense burst of directional sparks along the origin & axis
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const sparkType = (blast.colorTheme === 'green' || blast.isRubbick) ? 'arcane' : 'crimsonSniper';
  spawnSparks(x, y, 30, sparkType);
  spawnSparks(x + cosA * 150, y + sinA * 150, 16, sparkType);
  spawnSparks(x + cosA * 320, y + sinA * 320, 12, sparkType);
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
      for (let attempt = 0; attempt < 8; attempt++) {
        const randIdx = Math.floor(Math.random() * state.sparkEffects.length);
        const cand = state.sparkEffects[randIdx];
        if (cand && !isProtectedParticle(cand)) {
          insertIdx = randIdx;
          ParticleSystem.returnParticle(cand);
          break;
        }
      }
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
      for (let attempt = 0; attempt < 8; attempt++) {
        const randIdx = Math.floor(Math.random() * state.sparkEffects.length);
        const cand = state.sparkEffects[randIdx];
        if (cand && !isProtectedParticle(cand)) {
          insertIdx = randIdx;
          ParticleSystem.returnParticle(cand);
          break;
        }
      }
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

  // 1. Swap Lightning Vector Beam (lasts ~26 frames, thin crisp laser)
  const beam = ParticleSystem.getParticle();
  beam.x = x1;
  beam.y = y1;
  beam.targetX = x2;
  beam.targetY = y2;
  beam.size = 50;
  beam.life = 1.0;
  beam.decay = 0.038; // ~26 frames duration
  beam.type = 'boogieWoogieSwapBeam';
  beam.isFlash = true;
  beam.isProtected = true; // Never evict
  beam.isPixi = false;
  beam.vx = 0;
  beam.vy = 0;
  beam.friction = 0;
  state.sparkEffects.push(beam);

  // 2. Dual Shockwaves at both Swap Positions
  spawnMeleeClashShockwave(x1, y1, 65, 'todo');
  spawnMeleeClashShockwave(x2, y2, 65, 'todo');

  // 3. Dual Cyan Impact Flashes
  spawnImpactFlash(x1, y1, 25, '#00E5FF');
  spawnImpactFlash(x2, y2, 25, '#00E5FF');

  // 4. Subtle Electric Cyan Sparks along Swap Trajectory
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.min(18, Math.max(6, Math.floor(dist / 30)));

  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const px = x1 + dx * ratio;
    const py = y1 + dy * ratio;

    const sparkAngle = Math.random() * Math.PI * 2;
    const sparkSpeed = 1.5 + Math.random() * 4;
    spawnSparks(px, py, 1, 'lightningTrail', {
      color: (i % 2 === 0) ? '#00E5FF' : '#FFFFFF',
      vx: Math.cos(sparkAngle) * sparkSpeed,
      vy: Math.sin(sparkAngle) * sparkSpeed,
      size: 1.5 + Math.random() * 1.5,
      decay: 0.045 + Math.random() * 0.02
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

/**
 * Spawns simple, clean expanding Purple shockwave repulsion rings (like Gojo's Red).
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} radius - Max explosion radius
 * @param {boolean} is200 - True if 200% empowered cast
 */
export function spawnPurpleShockwaveRings(x, y, radius = 280, is200 = false, isGreen = false) {
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const fps = state.fps || 60;
  const MAX_SHOCKWAVES = isMulti ? (fps < 45 ? 6 : 12) : 25;

  const ringConfigs = isGreen ? [
    { startSize: 14, targetMult: 1.0, decay: 0.038, color: is200 ? 'rgba(50, 255, 120, 0.95)' : 'rgba(0, 255, 100, 0.95)' },
    { startSize: 8,  targetMult: 0.76, decay: 0.044, color: 'rgba(0, 200, 70, 0.90)' },
    { startSize: 4,  targetMult: 0.52, decay: 0.050, color: 'rgba(255, 255, 255, 0.95)' },
  ] : [
    { startSize: 14, targetMult: 1.0, decay: 0.038, color: is200 ? 'rgba(224, 102, 255, 0.95)' : 'rgba(191, 90, 242, 0.95)' },
    { startSize: 8,  targetMult: 0.76, decay: 0.044, color: 'rgba(138, 43, 226, 0.90)' },
    { startSize: 4,  targetMult: 0.52, decay: 0.050, color: 'rgba(255, 255, 255, 0.95)' },
  ];

  if (is200) {
    ringConfigs.push({ startSize: 20, targetMult: 1.18, decay: 0.032, color: isGreen ? 'rgba(200, 255, 220, 0.85)' : 'rgba(0, 255, 255, 0.85)' });
  }

  for (let r = 0; r < ringConfigs.length; r++) {
    const cfg = ringConfigs[r];
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
    shockwave.size = cfg.startSize;
    shockwave.targetSize = radius * cfg.targetMult;
    shockwave.life = 1.0;
    shockwave.decay = cfg.decay;
    shockwave.type = 'purpleShockwaveRing';
    shockwave.is200 = is200;
    shockwave.color = cfg.color;
    shockwave.isFlash = false;

    if (insertIdx !== -1) {
      state.sparkEffects[insertIdx] = shockwave;
    } else {
      state.sparkEffects.push(shockwave);
    }
  }

  // Also spawn clean impact flash & lightning sparks
  spawnImpactFlash(x, y, radius * 0.35, isGreen ? '#00FF64' : '#BF5AF2');
  spawnSparks(x, y, is200 ? 16 : 10, 'lightningTrail', isGreen ? '#00FF64' : '#8A2BE2');
  spawnSparks(x, y, is200 ? 8 : 4, 'lightningTrail', isGreen ? '#B3FFCC' : '#00FFFF');
}