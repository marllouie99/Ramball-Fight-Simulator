import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';

/**
 * Camera System for Circle Mini-Battle
 * Provides dynamic combat tracking, midpoint focus, distance-adaptive zoom,
 * and soft arena boundary clamping inspired by Boxx Arena battles.
 */

export function initCameraState() {
  const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena || { x: 40, y: 240, width: 450, height: 450 };
  const centerX = arena.x + arena.width / 2;
  const centerY = arena.y + arena.height / 2;

  const savedMode = (typeof localStorage !== 'undefined') ? (localStorage.getItem('cameraMode') || 'dynamic') : 'dynamic';

  return {
    enabled: true,
    mode: savedMode, // 'dynamic' | 'fixed'
    x: centerX,
    y: centerY,
    zoom: 1.0,
    targetX: centerX,
    targetY: centerY,
    targetZoom: 1.0,
    shakeX: 0,
    shakeY: 0,
    smoothing: 0.09,
    zoomSmoothing: 0.07,
    minZoom: 1.0,
    maxZoom: 1.15,
    toastText: '',
    toastTimer: 0
  };
}

export function resetCamera(immediate = false) {
  const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena || { x: 40, y: 240, width: 450, height: 450 };
  const centerX = arena.x + arena.width / 2;
  const centerY = arena.y + arena.height / 2;

  if (!state.camera) {
    state.camera = initCameraState();
  }

  state.camera.targetX = centerX;
  state.camera.targetY = centerY;
  state.camera.targetZoom = 1.0;

  if (immediate) {
    state.camera.x = centerX;
    state.camera.y = centerY;
    state.camera.zoom = 1.0;
  }
}

export function toggleCameraMode() {
  if (!state.camera) {
    state.camera = initCameraState();
  }
  if (state.camera.mode === 'dynamic') {
    state.camera.mode = 'fixed';
    state.camera.toastText = '📷 Camera: Fixed Arena';
    state.camera.toastTimer = 90;
  } else {
    state.camera.mode = 'dynamic';
    state.camera.toastText = '📷 Camera: Dynamic Tracking';
    state.camera.toastTimer = 90;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cameraMode', state.camera.mode);
  }
  const btn = document.getElementById('btn-camera');
  if (btn) {
    btn.innerText = (state.camera.mode === 'dynamic') ? 'ON' : 'OFF';
  }
}

export function setCameraMode(mode) {
  if (!state.camera) {
    state.camera = initCameraState();
  }
  state.camera.mode = mode;
  state.camera.toastText = mode === 'dynamic' ? '📷 Camera: Dynamic Tracking' : '📷 Camera: Fixed Arena';
  state.camera.toastTimer = 90;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cameraMode', state.camera.mode);
  }
  const btn = document.getElementById('btn-camera');
  if (btn) {
    btn.innerText = (state.camera.mode === 'dynamic') ? 'ON' : 'OFF';
  }
}

export function updateCamera() {
  if (!state.camera) {
    state.camera = initCameraState();
  }

  const camera = state.camera;
  const arena = state.arena || CONFIG.arena || { x: 40, y: 240, width: 450, height: 450 };
  const arenaCenterX = arena.x + arena.width / 2;
  const arenaCenterY = arena.y + arena.height / 2;

  // Tick toast timer
  if (camera.toastTimer > 0) {
    camera.toastTimer--;
  }

  // Update shake from state
  camera.shakeX = state.shakeX || 0;
  camera.shakeY = state.shakeY || 0;

  // Only track dynamically during combat/countdown/roundEnd/matchEnd
  const isCombatActive = (
    state.gameState === 'playing' || 
    state.gameState === 'countdown' || 
    state.gameState === 'roundEnd' || 
    state.gameState === 'matchEnd'
  );

  if (!isCombatActive) {
    camera.targetX = arenaCenterX;
    camera.targetY = arenaCenterY;
    camera.targetZoom = 1.0;
    camera.x = arenaCenterX;
    camera.y = arenaCenterY;
    camera.zoom = 1.0;
    return;
  }

  if (!camera.enabled || camera.mode === 'fixed' || state.gameState === 'countdown') {
    camera.targetX = arenaCenterX;
    camera.targetY = arenaCenterY;
    camera.targetZoom = 1.0;
  } else {
    // Dynamic tracking mode
    // NOTE: In this game engine, fighter health is stored in `f.hp` (NOT `f.health`)!
    const aliveFighters = (state.fighters || []).filter(f => 
      f && 
      !f.isDead && 
      (f.hp > 0 || (typeof f.getDisplayHp === 'function' && f.getDisplayHp() > 0)) && 
      !f.isIllusion && 
      !f.isTurret && 
      !f.isMinion && 
      !f.isClone
    );

    if (aliveFighters.length >= 2) {
      // Calculate combat bounding box spanning all active fighters
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const f of aliveFighters) {
        if (f.x < minX) minX = f.x;
        if (f.x > maxX) maxX = f.x;
        if (f.y < minY) minY = f.y;
        if (f.y > maxY) maxY = f.y;
      }

      // Midpoint is the center of the bounding box spanning all active combatants
      // (ensures 1v2, 2v2, 1v1, and FFA are never biased towards whichever team has more members!)
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      const spanX = maxX - minX;
      const spanY = maxY - minY;
      const dist = Math.hypot(spanX, spanY);

      // Distance-to-zoom mapping (Smooth Hermite / Smoothstep)
      // Closer than 100px: subtle & cinematic maxZoom (1.15x) without over-zooming
      // Farther than 360px: standard arena minZoom (1.0x)
      const minD = 100;
      const maxD = 360;
      const normDist = Math.max(0, Math.min(1, (dist - minD) / (maxD - minD)));
      const smoothT = normDist * normDist * (3 - 2 * normDist);
      const minZ = camera.minZoom ?? 1.0;
      const maxZ = camera.maxZoom ?? 1.15;
      camera.targetZoom = maxZ - smoothT * (maxZ - minZ);

      // Soft clamp target position relative to arena center
      // Keeps the arena well-framed on mobile screen (max offset ~35% of arena size)
      const maxPanX = (arena.width / 2) * 0.35;
      const maxPanY = (arena.height / 2) * 0.35;
      const relX = midX - arenaCenterX;
      const relY = midY - arenaCenterY;

      camera.targetX = arenaCenterX + Math.max(-maxPanX, Math.min(maxPanX, relX));
      camera.targetY = arenaCenterY + Math.max(-maxPanY, Math.min(maxPanY, relY));

    } else if (aliveFighters.length === 1) {
      // Winner focus during victory or solo stance
      const winner = aliveFighters[0];
      const maxPanX = (arena.width / 2) * 0.35;
      const maxPanY = (arena.height / 2) * 0.35;
      const relX = winner.x - arenaCenterX;
      const relY = winner.y - arenaCenterY;

      camera.targetX = arenaCenterX + Math.max(-maxPanX, Math.min(maxPanX, relX));
      camera.targetY = arenaCenterY + Math.max(-maxPanY, Math.min(maxPanY, relY));
      camera.targetZoom = 1.08;
    } else {
      camera.targetX = arenaCenterX;
      camera.targetY = arenaCenterY;
      camera.targetZoom = 1.0;
    }
  }

  // Smooth exponential interpolation (lerp)
  camera.x += (camera.targetX - camera.x) * camera.smoothing;
  camera.y += (camera.targetY - camera.y) * camera.smoothing;
  camera.zoom += (camera.targetZoom - camera.zoom) * camera.zoomSmoothing;
}

export function applyCameraToCtx(ctx) {
  const cam = state.camera;
  const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena || { x: 40, y: 240, width: 450, height: 450 };
  const screenCenterX = state.canvas.width / 2;
  const screenCenterY = arena.y + arena.height / 2;

  if (cam && cam.enabled && cam.mode === 'dynamic') {
    ctx.translate(screenCenterX + (cam.shakeX || 0), screenCenterY + (cam.shakeY || 0));
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
  } else {
    // Fixed camera mode (still supports screen shake)
    const shakeX = (cam ? cam.shakeX : state.shakeX) || 0;
    const shakeY = (cam ? cam.shakeY : state.shakeY) || 0;
    if (shakeX !== 0 || shakeY !== 0) {
      ctx.translate(shakeX, shakeY);
    }
  }
}

/**
 * Converts a world coordinate (e.g. fighter.x, fighter.y) to screen coordinates
 * taking into account dynamic camera pan, distance zoom, and screen shake.
 * Used for screen-space dim overlays to keep radial blooms and halos locked to fighters.
 */
export function worldToScreen(worldX, worldY) {
  const cam = state.camera;
  const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena || { x: 40, y: 240, width: 450, height: 450 };
  const screenCenterX = state.canvas ? (state.canvas.width / 2) : 270;
  const screenCenterY = arena.y + arena.height / 2;

  if (cam && cam.enabled && cam.mode === 'dynamic') {
    const sx = screenCenterX + (cam.shakeX || 0) + (worldX - cam.x) * cam.zoom;
    const sy = screenCenterY + (cam.shakeY || 0) + (worldY - cam.y) * cam.zoom;
    return { x: sx, y: sy };
  } else {
    const shakeX = (cam ? cam.shakeX : state.shakeX) || 0;
    const shakeY = (cam ? cam.shakeY : state.shakeY) || 0;
    return { x: worldX + shakeX, y: worldY + shakeY };
  }
}

export function drawCameraToast(ctx) {
  if (!state.camera || state.camera.toastTimer <= 0) return;
  const alpha = Math.min(1, state.camera.toastTimer / 20);
  const text = state.camera.toastText;
  const cx = state.canvas.width / 2;
  const cy = 205; // Placed right below the top health HUD

  ctx.save();
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textW = ctx.measureText(text).width + 24;

  ctx.fillStyle = `rgba(15, 18, 26, ${0.85 * alpha})`;
  ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 * alpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cx - textW / 2, cy - 14, textW, 28, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}
