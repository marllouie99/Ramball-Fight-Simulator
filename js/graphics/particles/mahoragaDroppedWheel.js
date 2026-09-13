// ─────────────────────────────────────────────
// Mahoraga Dropped Eight-Handled Sword Wheel Physics Entity
// When Mahoraga dies, his Dharma Wheel detaches from his head
// and naturally drops/tumbles to the bottom of the arena with
// gravity, bouncing, floor shadow, metallic clatter sound, and settling.
// Rule 11 & Rule 12 Compliant (Zero shadowBlur CPU filters)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnSparks } from './sparkEffect.js';
import { drawMahoragaDharmaWheelCore, MAHORAGA_WEAPON_GRAPHICS } from '../weapons/mahoragaWeaponGraphics.js';

if (typeof state !== 'undefined' && !state.droppedMahoragaWheels) {
  state.droppedMahoragaWheels = [];
}

/**
 * Spawns a physical dropped Dharma Wheel when Mahoraga dies.
 * @param {object} fighter The dying Mahoraga instance
 */
export function spawnDroppedMahoragaWheel(fighter) {
  if (typeof state === 'undefined' || !fighter || fighter._wheelDropped) return;
  fighter._wheelDropped = true;
  if (!state.droppedMahoragaWheels) state.droppedMahoragaWheels = [];

  const startX = fighter.x || 0;
  const startY = (fighter.y || 0) - (fighter.r || 30) - 28;

  state.droppedMahoragaWheels.push({
    x: startX,
    y: startY,
    vx: (fighter.vx || 0) * 0.35 + (Math.random() - 0.5) * 2.0,
    vy: -2.5 - Math.random() * 1.5, // Initial upward jolt as it detaches from head
    gravity: 0.36,
    wheelRotation: fighter.wheelRotation || 0,
    vRot: (Math.random() > 0.5 ? 1 : -1) * (0.05 + Math.random() * 0.05),
    tiltAngle: (Math.random() - 0.5) * 0.2,
    vTilt: (Math.random() - 0.5) * 0.025,
    scaleX: MAHORAGA_WEAPON_GRAPHICS.wheel.scaleX,
    scaleY: MAHORAGA_WEAPON_GRAPHICS.wheel.scaleY,
    wheelRadius: MAHORAGA_WEAPON_GRAPHICS.wheel.wheelRadius,
    spokeRadius: MAHORAGA_WEAPON_GRAPHICS.wheel.spokeRadius,
    sphereRadius: MAHORAGA_WEAPON_GRAPHICS.wheel.sphereRadius,
    depthOffset: MAHORAGA_WEAPON_GRAPHICS.wheel.depthOffset,
    wheelGlowColor: fighter.wheelGlowColor || null,
    wheelGlowTimer: fighter.wheelGlowTimer || 0,
    gojoAdaptColorHistory: fighter.gojoAdaptColorHistory ? [...fighter.gojoAdaptColorHistory] : [],
    adaptationStage: fighter.adaptationStage ? { ...fighter.adaptationStage } : { melee: 0, ranged: 0, skill: 0 },
    adapted: fighter.adapted ? { ...fighter.adapted } : {},
    isMaxAdapted: Boolean(fighter.isMaxAdapted),
    bounces: 0,
    onGround: false,
    life: 600, // 10 seconds at 60 FPS
    maxLife: 600,
    sparkWispTimer: 0
  });
}

/**
 * Updates physics, collisions, bounces, and settling for all dropped wheels.
 */
export function updateDroppedMahoragaWheels() {
  if (typeof state === 'undefined' || !state.droppedMahoragaWheels || state.droppedMahoragaWheels.length === 0) return;

  const arena = state.arena || { x: 0, y: 0, width: 800, height: 600, radius: 400 };
  const isCircle = arena.shape === 'circle';
  const cx = arena.x + arena.width / 2;
  const cy = arena.y + arena.height / 2;
  const ar = arena.radius || (arena.width / 2);
  const wheelR = 24; // Physical collision radius

  for (let i = state.droppedMahoragaWheels.length - 1; i >= 0; i--) {
    const wheel = state.droppedMahoragaWheels[i];
    if (!wheel) continue;

    wheel.life--;
    if (wheel.life <= 0) {
      state.droppedMahoragaWheels.splice(i, 1);
      continue;
    }

    if (wheel.wheelGlowTimer > 0) wheel.wheelGlowTimer--;

    // Spawn subtle dissipating golden spark wisps while falling
    wheel.sparkWispTimer = (wheel.sparkWispTimer || 0) + 1;
    if (wheel.sparkWispTimer % 18 === 0 && wheel.life > 480 && !wheel.onGround) {
      spawnSparks(wheel.x, wheel.y, 2, 'arcane', wheel.wheelGlowColor || '#FFD700');
    }

    if (!wheel.onGround || Math.abs(wheel.vx) > 0.05 || Math.abs(wheel.vy) > 0.05) {
      // Gravity & physics integration
      wheel.vy += wheel.gravity;
      wheel.x += wheel.vx;
      wheel.y += wheel.vy;

      wheel.wheelRotation += wheel.vRot;
      wheel.tiltAngle = (wheel.tiltAngle || 0) + (wheel.vTilt || 0);

      wheel.vx *= 0.992;
      wheel.vy *= 0.995;

      if (isCircle) {
        // Circular arena collision
        const dx = wheel.x - cx;
        const dy = wheel.y - cy;
        const dist = Math.hypot(dx, dy);
        const maxDist = Math.max(10, ar - wheelR);

        if (dist >= maxDist) {
          const normX = dx / dist;
          const normY = dy / dist;

          wheel.x = cx + normX * maxDist;
          wheel.y = cy + normY * maxDist;

          const dot = wheel.vx * normX + wheel.vy * normY;
          if (dot > 0) {
            wheel.vx -= 1.45 * dot * normX;
            wheel.vy -= 1.45 * dot * normY;
          }

          wheel.vx *= 0.65;
          wheel.vy *= 0.55;
          wheel.vRot *= 0.70;
          wheel.vTilt = (wheel.vTilt || 0) * 0.60;
          wheel.bounces++;

          if (wheel.bounces <= 3 && (Math.hypot(wheel.vx, wheel.vy) > 1.2 || wheel.bounces === 1)) {
            const vol = Math.max(0.15, Math.min(0.55, 0.55 / wheel.bounces));
            audioSystem.playSFX('parry', vol, 0.9 + Math.random() * 0.2);
            spawnSparks(wheel.x, wheel.y, 4, 'arcane', wheel.wheelGlowColor || '#FFD700');
          }

          // If at the bottom half of circular floor and vertical speed is low, settle
          if (normY > 0.6 && Math.abs(wheel.vy) < 0.85) {
            wheel.vy = 0;
            if (Math.abs(wheel.vx) < 0.4) {
              wheel.onGround = true;
              wheel.vx = 0;
              wheel.vRot = 0;
              wheel.vTilt = 0;
            }
          }
        }
      } else {
        // Rectangular arena collision
        const floorY = arena.y + arena.height - wheelR;
        const leftX = arena.x + wheelR;
        const rightX = arena.x + arena.width - wheelR;

        if (wheel.x <= leftX) {
          wheel.x = leftX;
          wheel.vx = -wheel.vx * 0.55;
        } else if (wheel.x >= rightX) {
          wheel.x = rightX;
          wheel.vx = -wheel.vx * 0.55;
        }

        if (wheel.y >= floorY) {
          wheel.y = floorY;
          wheel.vy = -wheel.vy * 0.45;
          wheel.vx *= 0.75;
          wheel.vRot *= 0.75;
          wheel.vTilt = (wheel.vTilt || 0) * 0.55;
          wheel.bounces++;

          if (wheel.bounces <= 3 && (Math.abs(wheel.vy) > 0.8 || wheel.bounces === 1)) {
            const vol = Math.max(0.15, Math.min(0.55, 0.55 / wheel.bounces));
            audioSystem.playSFX('parry', vol, 0.9 + Math.random() * 0.2);
            spawnSparks(wheel.x, wheel.y, 4, 'arcane', wheel.wheelGlowColor || '#FFD700');
          }

          if (Math.abs(wheel.vy) < 0.8) {
            wheel.vy = 0;
            if (Math.abs(wheel.vx) < 0.3) {
              wheel.onGround = true;
              wheel.vx = 0;
              wheel.vRot = 0;
              wheel.vTilt = 0;
            }
          }
        }
      }
    } else {
      // Settled on arena ground
      wheel.vx *= 0.85;
      wheel.vRot *= 0.85;
      wheel.vTilt = (wheel.vTilt || 0) * 0.85;
    }
  }
}

/**
 * Draws all dropped Dharma Wheels on the arena floor with perspective ground shadows.
 */
export function drawDroppedMahoragaWheels(ctx) {
  if (typeof state === 'undefined' || !state.droppedMahoragaWheels || state.droppedMahoragaWheels.length === 0) return;

  const arena = state.arena || { x: 0, y: 0, width: 800, height: 600, radius: 400 };
  const isCircle = arena.shape === 'circle';
  const cx = arena.x + arena.width / 2;
  const cy = arena.y + arena.height / 2;
  const ar = arena.radius || (arena.width / 2);

  for (let i = 0; i < state.droppedMahoragaWheels.length; i++) {
    const wheel = state.droppedMahoragaWheels[i];
    if (!wheel) continue;

    const fadeAlpha = wheel.life < 60 ? (wheel.life / 60) : 1.0;

    // 1. Dynamic Perspective Ground Shadow Directly Underneath
    let floorY = arena.y + arena.height - 12;
    if (isCircle) {
      const dx = wheel.x - cx;
      if (Math.abs(dx) < ar) {
        floorY = cy + Math.sqrt(Math.max(0, ar * ar - dx * dx)) - 8;
      }
    }

    const heightAboveFloor = Math.max(0, floorY - wheel.y);
    const shadowScale = Math.max(0.35, 1.0 - Math.min(1.0, heightAboveFloor / 250) * 0.50);
    const shadowAlpha = Math.max(0.08, (1.0 - Math.min(1.0, heightAboveFloor / 250) * 0.70) * 0.50 * fadeAlpha);

    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.translate(wheel.x, floorY);
    ctx.scale(1.25 * shadowScale, 0.40 * shadowScale);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. 3D Dharma Wheel Render
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.translate(wheel.x, wheel.y);
    if (wheel.tiltAngle) {
      ctx.rotate(wheel.tiltAngle);
    }
    drawMahoragaDharmaWheelCore(ctx, wheel);
    ctx.restore();
  }
}

/**
 * Clears all dropped wheels on round reset.
 */
export function clearDroppedMahoragaWheels() {
  if (typeof state !== 'undefined' && state.droppedMahoragaWheels) {
    state.droppedMahoragaWheels.length = 0;
  }
}
