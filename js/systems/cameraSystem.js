import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { GAME_MODES } from '../core/modeConfig.js';

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
    smoothing: CONFIG.camera?.smoothing ?? 0.085,
    zoomSmoothing: CONFIG.camera?.zoomSmoothing ?? 0.048,
    zoomOutSmoothing: CONFIG.camera?.zoomOutSmoothing ?? 0.085,
    minZoom: CONFIG.camera?.minZoom ?? 0.65,
    maxZoom: CONFIG.camera?.maxZoom ?? 1.18,
    cinematicOverride: false,
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
  state.camera.cinematicOverride = false;

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
  import('../graphics/hudManager.js').then(m => m.clearHealthHud && m.clearHealthHud()).catch(() => {});
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
  import('../graphics/hudManager.js').then(m => m.clearHealthHud && m.clearHealthHud()).catch(() => {});
}

export function updateCamera() {
  if (!state.camera) {
    state.camera = initCameraState();
  }

  const camera = state.camera;
  const camCfg = CONFIG.camera || {};
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
    camera.cinematicOverride = false;
    return;
  }

  const cinematicTarget = state.cameraFocusTarget;

  // Check for Boss Entrance Cinematic Sequence
  if (state.gameState === 'boss_intro') {
    camera.cinematicOverride = true;
    // Keep camera targetX, targetY, targetZoom as set by BossEntranceSequence
  } else if (cinematicTarget && typeof cinematicTarget.x === 'number' && typeof cinematicTarget.y === 'number' && state.gameState !== 'countdown') {
    camera.cinematicOverride = true;

    // Center camera on the victim with soft arena boundary clamp
    const minCamX = arena.x - arena.width * 0.3;
    const maxCamX = arena.x + arena.width * 1.3;
    const minCamY = arena.y - arena.height * 0.3;
    const maxCamY = arena.y + arena.height * 1.3;

    camera.targetX = Math.max(minCamX, Math.min(maxCamX, cinematicTarget.x));
    camera.targetY = Math.max(minCamY, Math.min(maxCamY, cinematicTarget.y));

    const makimaCfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    camera.targetZoom = makimaCfg.crucifixionCameraZoom ?? 1.15;
  } else {
    camera.cinematicOverride = false;

    if (!camera.enabled || camera.mode === 'fixed' || state.gameState === 'countdown') {
      camera.targetX = arenaCenterX;
      camera.targetY = arenaCenterY;
      camera.targetZoom = 1.0;
    } else {
      // Dynamic tracking mode
      // NOTE: In this game engine, fighter health is stored in `f.hp` (NOT `f.health`)!
      const isPrimaryCombatant = (f) => Boolean(
        f &&
        !f.isDead &&
        (f.hp > 0 || (typeof f.getDisplayHp === 'function' && f.getDisplayHp() > 0)) &&
        !f.isIllusion &&
        !f.isTurret &&
        !f.isMinion &&
        !f.isClone &&
        !f.isEndCrystal &&
        !f.isDeployable &&
        !f.isIceWall &&
        !f.isEvasionMinion &&
        !f.isTransfiguredHuman
      );

      const aliveFighters = (state.fighters || []).filter(isPrimaryCombatant);
      const minZ = camera.minZoom ?? camCfg.minZoom ?? 0.65;
      const maxZ = camera.maxZoom ?? camCfg.maxZoom ?? 1.18;

      // Soft camera pan limits (allows expansive tracking beyond arena perimeter for airborne/edge entities)
      const minCamX = arena.x - arena.width * 0.6;
      const maxCamX = arena.x + arena.width * 1.6;
      const minCamY = arena.y - arena.height * 0.6;
      const maxCamY = arena.y + arena.height * 1.6;

      if (aliveFighters.length >= 2) {
        // Compute full bounding envelope across all active combatants
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const f of aliveFighters) {
          const fx = f.x;
          const fy = f.y - (f.z ? f.z * 0.35 : 0);
          const r = f.r || 22;
          if (fx - r < minX) minX = fx - r;
          if (fx + r > maxX) maxX = fx + r;
          if (fy - r < minY) minY = fy - r;
          if (fy + r > maxY) maxY = fy + r;
        }

        const envelopeMidX = (minX + maxX) / 2;
        const envelopeMidY = (minY + maxY) / 2;
        const spanX = Math.max(60, maxX - minX);
        const spanY = Math.max(60, maxY - minY);
        const diagDist = Math.hypot(spanX, spanY);

        let midX = envelopeMidX;
        let midY = envelopeMidY;

        const is1v2 = Boolean(
          state.mode === 'Boss Battle' ||
          state.mode === '1v2 Stand Off' ||
          state.mode === '1v2' ||
          state.mode === 'Stand Off 1v2' ||
          (typeof GAME_MODES !== 'undefined' && (state.mode === GAME_MODES.BOSS_BATTLE || state.mode === GAME_MODES.STAND_OFF_1V2))
        );

        if (is1v2) {
          const boss = aliveFighters.find(f => f === state.fighters?.[0] || f.isBoss || f.fighterIndex === 0) || aliveFighters[0];
          const challengers = aliveFighters.filter(f => f !== boss);
          if (boss && challengers.length > 0) {
            let closestCh = challengers[0];
            let minDistSq = Infinity;
            for (const ch of challengers) {
              const dSq = (ch.x - boss.x) ** 2 + (ch.y - boss.y) ** 2;
              if (dSq < minDistSq) {
                minDistSq = dSq;
                closestCh = ch;
              }
            }
            const clashMidX = (boss.x + closestCh.x) / 2;
            const clashMidY = ((boss.y - (boss.z ? boss.z * 0.35 : 0)) + (closestCh.y - (closestCh.z ? closestCh.z * 0.35 : 0))) / 2;

            // Keep the full envelope firmly centered while adding subtle focus to active clash point
            midX = envelopeMidX * 0.85 + clashMidX * 0.15;
            midY = envelopeMidY * 0.85 + clashMidY * 0.15;
          }
        }

        // Viewport-adaptive zoom calculation:
        // Ensures all entities remain inside the safe window screen area with generous margins
        const screenW = state.canvas ? state.canvas.width : 540;
        const screenH = state.canvas ? state.canvas.height : 960;
        const safeW = screenW - 90; // 45px safe padding on left/right screen edges
        const safeH = Math.min(screenH - 240, 640); // 120px safe padding top/bottom for HUD & timer
        const padX = 60; // World padding around entity box for hitboxes & auras
        const padY = 60;

        const fitZoomX = safeW / (spanX + padX);
        const fitZoomY = safeH / (spanY + padY);
        const envelopeFit = Math.min(fitZoomX, fitZoomY);

        // Distance curve mapping (Smooth Hermite from close melee to wide spread)
        const minD = camCfg.minDist ?? 70;
        const maxD = camCfg.maxDist ?? 520;
        const normDist = Math.max(0, Math.min(1, (diagDist - minD) / (maxD - minD)));
        const smoothT = normDist * normDist * (3 - 2 * normDist);
        const distanceZoom = maxZ - smoothT * (maxZ - minZ);

        // Blend: dynamic smooth distance zoom constrained by envelope viewport fit
        const calculatedZoom = Math.min(distanceZoom, envelopeFit);
        camera.targetZoom = Math.max(minZ, Math.min(maxZ, calculatedZoom));

        // Smoothly pan camera to track combat centroid
        camera.targetX = Math.max(minCamX, Math.min(maxCamX, midX));
        camera.targetY = Math.max(minCamY, Math.min(maxCamY, midY));

      } else if (aliveFighters.length === 1) {
        // Winner focus during victory or solo stance
        const winner = aliveFighters[0];
        const winX = winner.x;
        const winY = winner.y - (winner.z ? winner.z * 0.35 : 0);

        camera.targetX = Math.max(minCamX, Math.min(maxCamX, winX));
        camera.targetY = Math.max(minCamY, Math.min(maxCamY, winY));
        camera.targetZoom = camCfg.winnerZoom ?? 1.10;
      } else {
        camera.targetX = arenaCenterX;
        camera.targetY = arenaCenterY;
        camera.targetZoom = 1.0;
      }
    }
  }

  // Smooth exponential interpolation (lerp)
  camera.x += (camera.targetX - camera.x) * camera.smoothing;
  camera.y += (camera.targetY - camera.y) * camera.smoothing;

  // Asymmetric zoom rate: responsive quick zoom-out when spreading, smooth cinematic zoom-in
  const zoomLerpRate = (camera.targetZoom < camera.zoom)
    ? (camera.zoomOutSmoothing ?? camCfg.zoomOutSmoothing ?? 0.085)
    : (camera.zoomSmoothing ?? camCfg.zoomSmoothing ?? 0.048);
  camera.zoom += (camera.targetZoom - camera.zoom) * zoomLerpRate;
}

export function applyCameraToCtx(ctx) {
  const cam = state.camera;
  const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena || { x: 40, y: 240, width: 450, height: 450 };
  const screenCenterX = state.canvas.width / 2;
  const screenCenterY = arena.y + arena.height / 2;

  if (cam && cam.enabled && (cam.mode === 'dynamic' || cam.cinematicOverride)) {
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

  if (cam && cam.enabled && (cam.mode === 'dynamic' || cam.cinematicOverride)) {
    const sx = screenCenterX + (worldX - cam.x) * cam.zoom;
    const sy = screenCenterY + (worldY - cam.y) * cam.zoom;
    return { x: sx, y: sy };
  } else {
    return { x: worldX, y: worldY };
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
