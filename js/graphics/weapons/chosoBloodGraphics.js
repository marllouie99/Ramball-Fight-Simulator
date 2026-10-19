// ─────────────────────────────────────────────
// CHOSO BLOOD MANIPULATION & LASER GRAPHICS
// Renders:
// - Interactive Blood Droplet Nodes (Normal & Diode Ignition States)
// - Blood Manipulation: Convergence Beams & Targeting Needles
// - Blood Edge 5-Phase Melee Slashes & Dynamic Arm Linkages
// - Slicing Exorcist (Chakram) Rotary Blood Disc
// - Supernova Fragmentation Orbs & Detonations
// - Piercing Blood Mach 3 Supersonic Beam & Shockwaves
// Strictly adheres to:
// - Rule 15: Double-Tapered Crescent Slash & Recovery Eraser Wipe
// - Rule 16: Manga Speed Lines (4-Point Filled Needles)
// - Rule 26: Concentric Shockwaves (No Spoke Meshes / Anti-Cobweb)
// - Rule 11: Prohibition of shadowBlur / shadowColor
import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

/**
 * Calculates the maximum travel distance along a ray from (startX, startY) at angle
 * before impacting the arena perimeter walls.
 * Strictly prevents blood droplets, beams, and projectiles from spawning or firing outside the arena.
 *
 * @param {number} startX
 * @param {number} startY
 * @param {number} angle
 * @param {Object} arena
 * @param {number} [innerMargin=6]
 * @returns {number} Distance to arena wall boundary (clamped to >= 0)
 */
export function getRayArenaIntersection(startX, startY, angle, arena, innerMargin = 6) {
  if (!arena) return 500;

  const wallW = arena.wallWidth || 4;
  const margin = wallW + innerMargin;

  if (arena.shape === 'circle' || arena.radius) {
    const cx = arena.x + arena.width / 2;
    const cy = arena.y + arena.height / 2;
    const r = Math.max(10, (arena.radius || arena.width / 2) - margin);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dx = startX - cx;
    const dy = startY - cy;
    const b = 2 * (dx * cosA + dy * sinA);
    const c = dx * dx + dy * dy - r * r;
    const disc = b * b - 4 * c;
    if (disc < 0) return 0;
    const t = (-b + Math.sqrt(disc)) / 2;
    return Math.max(0, t);
  }

  const minX = arena.x + margin;
  const maxX = arena.x + arena.width - margin;
  const minY = arena.y + margin;
  const maxY = arena.y + arena.height - margin;

  const clampedX = Math.max(minX, Math.min(maxX, startX));
  const clampedY = Math.max(minY, Math.min(maxY, startY));

  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  let maxDist = Infinity;

  if (cosA > 0.0001) {
    const d = (maxX - clampedX) / cosA;
    if (d >= 0 && d < maxDist) maxDist = d;
  } else if (cosA < -0.0001) {
    const d = (minX - clampedX) / cosA;
    if (d >= 0 && d < maxDist) maxDist = d;
  }

  if (sinA > 0.0001) {
    const d = (maxY - clampedY) / sinA;
    if (d >= 0 && d < maxDist) maxDist = d;
  } else if (sinA < -0.0001) {
    const d = (minY - clampedY) / sinA;
    if (d >= 0 && d < maxDist) maxDist = d;
  }

  return Math.max(0, maxDist === Infinity ? 400 : maxDist);
}

/**
 * Draws an interactive Blood Droplet Node in the arena.
 * Blood droplets use 100% authentic default game system visuals rendered exclusively
 * via state.bloodEffects and bloodEffect.js (crisp red square pixel in air, flat puddle on ground).
 * Zero custom diode/emitter/circle overlays.
 */
export function drawBloodDropletNode(ctx, droplet) {
  // Intentionally empty: The game system's default particle pipeline (state.bloodEffects / bloodEffect.js)
  // renders all blood particles automatically with the authentic default pixel art red square/splatter design.
}

/**
 * Draws razor-thin targeting needle lines connecting blood nodes to target.
 */
export function drawLaserTelegraphLine(ctx, sourceX, sourceY, targetX, targetY, alpha = 0.6) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1.0, alpha);
  ctx.strokeStyle = '#FF2A55';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([6, 3]);

  ctx.beginPath();
  ctx.moveTo(sourceX, sourceY);
  ctx.lineTo(targetX, targetY);
  ctx.stroke();


  ctx.restore();
}

/**
 * Draws a supersonic piercing laser beam ribbon.
 * Features a white-hot laser core, radiant rose sheath, and concentric emitter waves.
 */
export function drawBloodLaserBeam(ctx, startX, startY, endX, endY, thickness = 4.5, alpha = 1.0) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1.0, alpha);

  const angle = Math.atan2(endY - startY, endX - startX);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const perpX = -sinA;
  const perpY = cosA;

  // 1. Outer Sanguine Laser Bloom Sheath
  ctx.beginPath();
  ctx.moveTo(startX - perpX * (thickness * 2.2), startY - perpY * (thickness * 2.2));
  ctx.lineTo(endX - perpX * (thickness * 2.2), endY - perpY * (thickness * 2.2));
  ctx.lineTo(endX + perpX * (thickness * 2.2), endY + perpY * (thickness * 2.2));
  ctx.lineTo(startX + perpX * (thickness * 2.2), startY + perpY * (thickness * 2.2));
  ctx.closePath();
  ctx.fillStyle = 'rgba(163, 29, 29, 0.35)';
  ctx.fill();

  // 2. Mid Radiant Laser Sheath (Hot Pink / Crimson)
  ctx.beginPath();
  ctx.moveTo(startX - perpX * (thickness * 1.2), startY - perpY * (thickness * 1.2));
  ctx.lineTo(endX - perpX * (thickness * 1.2), endY - perpY * (thickness * 1.2));
  ctx.lineTo(endX + perpX * (thickness * 1.2), endY + perpY * (thickness * 1.2));
  ctx.lineTo(startX + perpX * (thickness * 1.2), startY + perpY * (thickness * 1.2));
  ctx.closePath();
  ctx.fillStyle = '#FF2A55';
  ctx.fill();

  // 3. Supersonic Pure White Laser Core
  ctx.beginPath();
  ctx.moveTo(startX - perpX * (thickness * 0.45), startY - perpY * (thickness * 0.45));
  ctx.lineTo(endX - perpX * (thickness * 0.45), endY - perpY * (thickness * 0.45));
  ctx.lineTo(endX + perpX * (thickness * 0.45), endY + perpY * (thickness * 0.45));
  ctx.lineTo(startX + perpX * (thickness * 0.45), startY + perpY * (thickness * 0.45));
  ctx.closePath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();


  ctx.restore();
}

/**
 * Draws the spinning Slicing Exorcist (Karisō) Blood Chakram disc.
 */
export function drawBloodChakram(ctx, chakram) {
  if (!chakram || chakram.isDead) return;

  const x = chakram.x;
  const y = chakram.y;
  const r = chakram.r || 16;
  const rot = chakram.rotation || 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // Outer high-pressure fluid rim
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 42, 85, 0.35)';
  ctx.fill();

  // Rotary Saw Teeth (4 high-pressure crescent spurs)
  const teeth = 4;
  ctx.fillStyle = '#A31D1D';
  for (let i = 0; i < teeth; i++) {
    const angle = (i * Math.PI * 2) / teeth;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(r * 0.4, 0);
    ctx.quadraticCurveTo(r * 0.9, -r * 0.3, r * 1.3, 0);
    ctx.lineTo(r * 0.7, r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Inner compressed core
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#6B111E';
  ctx.fill();

  // White center compression point
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Supernova orbiting orbs and shrapnel pellets.
 */
export function drawSupernovaVisuals(ctx, fighter) {
  if (!fighter) return;

  // 1. Orbiting Compressed Blood Spheres before detonation
  if (fighter.isChargingSupernova && fighter.supernovaOrbs && fighter.supernovaOrbs.length > 0) {
    ctx.save();
    for (let i = 0; i < fighter.supernovaOrbs.length; i++) {
      const orb = fighter.supernovaOrbs[i];
      const ox = fighter.x + Math.cos(orb.angle) * orb.dist;
      const oy = (fighter.y - (fighter.z || 0)) + Math.sin(orb.angle) * orb.dist;

      ctx.beginPath();
      ctx.arc(ox, oy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#A31D1D';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ox, oy, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#FF2A55';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ox - 1.2, oy - 1.2, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * Draws the colossal Mach 3 Piercing Blood death beam.
 */
export function drawPiercingBloodBeam(ctx, fighter) {
  if (!fighter || !fighter.isFiringPiercingBlood) return;

  const r = fighter.r || 25;
  const startX = fighter.x;
  const startY = fighter.y - (fighter.z || 0);
  const angle = fighter.piercingBloodAngle !== undefined ? fighter.piercingBloodAngle : (fighter.gunAngle || 0);
  const arena = (typeof state !== 'undefined' && state.arena) || (typeof CONFIG !== 'undefined' && CONFIG.arena);
  const maxBeamLength = arena ? getRayArenaIntersection(startX, startY, angle, arena, 6) : 1200;
  const beamLength = Math.min(1200, maxBeamLength);
  const endX = startX + Math.cos(angle) * beamLength;
  const endY = startY + Math.sin(angle) * beamLength;
  const beamWidth = fighter.piercingBloodWidth || 26;
  const progress = fighter.piercingBloodProgress || 1.0;

  ctx.save();

  // 1. Colossal Outer Hydraulic Bloom
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(163, 29, 29, 0.40)';
  ctx.lineWidth = beamWidth * 1.8 * progress;
  ctx.lineCap = 'round';
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 2. High-Pressure Burning Crimson Sheath
  ctx.beginPath();
  ctx.strokeStyle = '#FF1E44';
  ctx.lineWidth = beamWidth * 1.1 * progress;
  ctx.lineCap = 'round';
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 3. Supersonic White-Hot Laser Core
  ctx.beginPath();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = beamWidth * 0.42 * progress;
  ctx.lineCap = 'round';
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 4. Muzzle Blast Compression Rings (Rule 26 Compliant)
  for (let i = 0; i < 3; i++) {
    const ringR = (r * 0.9) + (i * 12) + Math.sin(performance.now() * 0.05 + i) * 3;
    ctx.beginPath();
    ctx.arc(startX + Math.cos(angle) * (r + i * 8), startY + Math.sin(angle) * (r + i * 8), ringR, 0, Math.PI * 2);
    ctx.strokeStyle = (i === 0) ? '#FFFFFF' : '#FF2A55';
    ctx.lineWidth = 2.0 - i * 0.4;
    ctx.stroke();
  }


  ctx.restore();
}

/**
 * Draws double-tapered Blood Edge crescent slashes with Rule 15 eraser wipe.
 */
export function drawBloodEdgeSlashArc(ctx, fighter) {
  if (!fighter || fighter.slashSwingTimer <= 0) return;

  const r = fighter.r || 25;
  const totalFrames = fighter.slashSwingMax || 28;
  const elapsed = totalFrames - fighter.slashSwingTimer;
  const progress = Math.min(1.0, elapsed / totalFrames);

  const aimAngle = fighter.slashCastAngle !== undefined ? fighter.slashCastAngle : (fighter.gunAngle || 0);
  const arcSpan = (130 * Math.PI) / 180;
  const reach = fighter.meleeReach || 70;

  // Rule 15: Double-tapered crescent with sinusoidal power curve
  const startAngle = aimAngle - arcSpan / 2;
  const currentEndAngle = startAngle + arcSpan * Math.min(1.0, progress * 1.6);
  const eraserStartAngle = (progress > 0.60) ? (startAngle + arcSpan * Math.pow((progress - 0.60) / 0.40, 1.4)) : startAngle;

  if (currentEndAngle <= eraserStartAngle) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(fighter.x, fighter.y - (fighter.z || 0), reach, eraserStartAngle, currentEndAngle);
  ctx.strokeStyle = '#FF2A55';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(fighter.x, fighter.y - (fighter.z || 0), reach - 3, eraserStartAngle, currentEndAngle);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}
