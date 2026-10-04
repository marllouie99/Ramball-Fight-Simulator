import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { interactionManager } from '../interactions/index.js';

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

  const castingDeity = (state.fighters || []).find(f => 
    f && (f.characterId === 'namelessdeity' || f.characterId === 'nameless_deity' || f.type === 'namelessdeity') &&
    f.hp > 0 && !f.dead && !f.isDead &&
    (((f.destroyerWindupTimer || 0) > 0) || ((f.destroyerFireTimer || 0) > 0) || ((f.destroyerRecoveryTimer || 0) > 0))
  );

  const castingNaoya = (state.fighters || []).find(f =>
    f && (f.characterId === 'naoya' || f.characterId === 'naoya_zenin' || f.type === 'naoya') &&
    f.hp > 0 && !f.dead && !f.isDead &&
    f.isExecutingUlt && (f.ultPhase === 1 || f.ultPhase === 2)
  );

  const cinematicTarget = state.cameraFocusTarget;

  // Check for Boss Entrance Cinematic Sequence
  if (state.gameState === 'boss_intro') {
    camera.cinematicOverride = true;
    // Keep camera targetX, targetY, targetZoom as set by BossEntranceSequence
  } else if (cinematicTarget && typeof cinematicTarget.x === 'number' && typeof cinematicTarget.y === 'number' && state.gameState !== 'countdown') {
    camera.cinematicOverride = true;

    // Center camera on the victim with soft arena boundary clamp
    const minVictimCamX = arena.x - arena.width * 0.3;
    const maxVictimCamX = arena.x + arena.width * 1.3;
    const minVictimCamY = arena.y - arena.height * 0.3;
    const maxVictimCamY = arena.y + arena.height * 1.3;

    camera.targetX = Math.max(minVictimCamX, Math.min(maxVictimCamX, cinematicTarget.x));
    camera.targetY = Math.max(minVictimCamY, Math.min(maxVictimCamY, cinematicTarget.y));

    const makimaCfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
    camera.targetZoom = makimaCfg.crucifixionCameraZoom ?? 1.15;
  } else if (castingNaoya && state.gameState !== 'countdown') {
    // Naoya Zenin Ultimate: Screen-Wide Mach 3 Runway Acceleration Sprint
    // Unclamped direct camera tracking on Naoya so he stays 100% centered even at extreme vertical stratosphere apexes
    camera.cinematicOverride = true;
    camera.targetX = castingNaoya.x;
    camera.targetY = castingNaoya.y;

    const naoyaCfg = (typeof CONFIG !== 'undefined' && CONFIG.naoya) ? CONFIG.naoya : {};
    camera.targetZoom = naoyaCfg.ultCameraZoom ?? 1.12;
  } else if (castingDeity && state.gameState !== 'countdown') {
    // Special Interaction Hook: Disable camera zoom out during ultimate channeling
    const isSpecialSaitamaInteraction = Boolean(
      castingDeity.isRebouncingToCenter ||
      interactionManager.shouldOverrideCameraZoom(castingDeity, state.fighters)
    );

    const isFixed = (!camera.enabled || camera.mode === 'fixed');

    let startCombatZoom = 1.0;
    if (!isFixed && aliveFighters.length >= 2) {
      // Base envelope zoom for combatants in dynamic mode
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const f of aliveFighters) {
        const fx = f.x;
        const fy = f.y - (f.z ? f.z * 0.35 : 0);
        const r = f.r || 22;
        if (fx - r < minX) minX = fx - r;
        if (fx + r > maxX) maxX = fx + r;
        if (fy - r < minY) minY = fy - r;
        if (fy + r > maxY) maxY = fy + r;
      }
      const spanX = Math.max(60, maxX - minX);
      const spanY = Math.max(60, maxY - minY);
      const diagDist = Math.hypot(spanX, spanY);

      const screenW = state.canvas ? state.canvas.width : 540;
      const screenH = state.canvas ? state.canvas.height : 960;
      const safeW = screenW - 90;
      const safeH = Math.min(screenH - 240, 640);
      const padX = 60, padY = 60;
      const envelopeFit = Math.min(safeW / (spanX + padX), safeH / (spanY + padY));

      const minD = camCfg.minDist ?? 70;
      const maxD = camCfg.maxDist ?? 520;
      const normDist = Math.max(0, Math.min(1, (diagDist - minD) / (maxD - minD)));
      const smoothDist = normDist * normDist * (3 - 2 * normDist);
      startCombatZoom = Math.max(minZ, Math.min(maxZ, Math.min(maxZ - smoothDist * (maxZ - minZ), envelopeFit)));
    }

    const deityCfg = (typeof CONFIG !== 'undefined' && CONFIG.namelessdeity) ? CONFIG.namelessdeity : {};
    const finalDeityZoom = isSpecialSaitamaInteraction ? startCombatZoom : (deityCfg.destroyerCameraZoom ?? 0.93);

    // Phase 1: Channeling & Charging Windup (slowly and smoothly zoom out over the full windup duration)
    if ((castingDeity.destroyerWindupTimer || 0) > 0) {
      const windupMax = castingDeity.destroyerWindupMax || 393;
      const elapsed = Math.max(0, windupMax - castingDeity.destroyerWindupTimer);
      const rawT = Math.max(0, Math.min(1, elapsed / windupMax));
      // Hermite S-curve easing for silky-smooth gradual zoom out
      const smoothProgress = rawT * rawT * (3 - 2 * rawT);
      camera.targetZoom = startCombatZoom + (finalDeityZoom - startCombatZoom) * smoothProgress;
    } else if ((castingDeity.destroyerFireTimer || 0) > 0) {
      // Phase 2: Active Super-Beam Firing (held at target deity framing)
      camera.targetZoom = finalDeityZoom;
    } else if ((castingDeity.destroyerRecoveryTimer || 0) > 0) {
      // Phase 3: Post-Beam Recovery & Chuckle (smoothly ease back to standard combat/winner zoom)
      const recMax = castingDeity.destroyerRecoveryMax || 25;
      const recElapsed = Math.max(0, recMax - castingDeity.destroyerRecoveryTimer);
      const recT = Math.max(0, Math.min(1, recElapsed / recMax));
      const smoothRecT = recT * recT * (3 - 2 * recT);
      const endZoom = isFixed ? 1.0 : ((aliveFighters.length <= 1) ? (camCfg.winnerZoom ?? 1.10) : startCombatZoom);
      camera.targetZoom = finalDeityZoom + (endZoom - finalDeityZoom) * smoothRecT;
    } else {
      camera.targetZoom = finalDeityZoom;
    }

    if (isFixed) {
      // In fixed mode, camera stays firmly anchored at the arena center while smoothly scaling
      camera.targetX = arenaCenterX;
      camera.targetY = arenaCenterY;
    } else {
      // In dynamic tracking mode, pan between combatants
      const aliveOpponents = aliveFighters.filter(f => f !== castingDeity);
      let focusX = castingDeity.x;
      let focusY = castingDeity.y - (castingDeity.z ? castingDeity.z * 0.35 : 0);

      if (aliveOpponents.length > 0) {
        let avgOppX = 0;
        let avgOppY = 0;
        for (const opp of aliveOpponents) {
          avgOppX += opp.x;
          avgOppY += opp.y - (opp.z ? opp.z * 0.35 : 0);
        }
        avgOppX /= aliveOpponents.length;
        avgOppY /= aliveOpponents.length;
        focusX = (castingDeity.x + avgOppX) / 2;
        focusY = (castingDeity.y + avgOppY) / 2;
      } else {
        const aimAngle = castingDeity.destroyerCastAngle || castingDeity.gunAngle || 0;
        const beamFocusDist = Math.min(180, (castingDeity.destroyerBeamLength || 1400) * 0.15);
        focusX = (castingDeity.x + Math.cos(aimAngle) * beamFocusDist + arenaCenterX) / 2;
        focusY = (castingDeity.y + Math.sin(aimAngle) * beamFocusDist + arenaCenterY) / 2;
      }

      // Lock camera framing when active super-beam firing begins to prevent dragging as targets get pushed
      if ((castingDeity.destroyerFireTimer || 0) > 0) {
        if (!castingDeity._beamCamFocusX || !castingDeity._beamCamFocusY) {
          castingDeity._beamCamFocusX = focusX;
          castingDeity._beamCamFocusY = focusY;
        }
        focusX = castingDeity._beamCamFocusX;
        focusY = castingDeity._beamCamFocusY;
      } else if ((castingDeity.destroyerRecoveryTimer || 0) > 0 && castingDeity._beamCamFocusX) {
        focusX = castingDeity._beamCamFocusX;
        focusY = castingDeity._beamCamFocusY;
      } else {
        castingDeity._beamCamFocusX = null;
        castingDeity._beamCamFocusY = null;
      }

      camera.targetX = Math.max(minCamX, Math.min(maxCamX, focusX));
      camera.targetY = Math.max(minCamY, Math.min(maxCamY, focusY));
    }
  } else {
    camera.cinematicOverride = false;

    if (!camera.enabled || camera.mode === 'fixed' || state.gameState === 'countdown') {
      camera.targetX = arenaCenterX;
      camera.targetY = arenaCenterY;
      camera.targetZoom = 1.0;
    } else if (aliveFighters.length >= 2) {
      // Compute full bounding envelope across all active combatants
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let validCombatantsCount = 0;

      for (const f of aliveFighters) {
        if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) continue;
        const fx = f.x;
        const fy = f.y - (f.z ? f.z * 0.35 : 0);
        const r = Number.isFinite(f.r) ? f.r : 22;
        if (fx - r < minX) minX = fx - r;
        if (fx + r > maxX) maxX = fx + r;
        if (fy - r < minY) minY = fy - r;
        if (fy + r > maxY) maxY = fy + r;
        validCombatantsCount++;
      }

      if (validCombatantsCount === 0 || !Number.isFinite(minX) || !Number.isFinite(maxX)) {
        minX = arenaCenterX - 100;
        maxX = arenaCenterX + 100;
        minY = arenaCenterY - 100;
        maxY = arenaCenterY + 100;
      }

      const envelopeMidX = (minX + maxX) / 2;
      const envelopeMidY = (minY + maxY) / 2;
      const spanX = Math.max(60, maxX - minX);
      const spanY = Math.max(60, maxY - minY);
      const diagDist = Math.hypot(spanX, spanY);

      let midX = Number.isFinite(envelopeMidX) ? envelopeMidX : arenaCenterX;
      let midY = Number.isFinite(envelopeMidY) ? envelopeMidY : arenaCenterY;

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
        if (boss && challengers.length > 0 && Number.isFinite(boss.x) && Number.isFinite(boss.y)) {
          let closestCh = challengers[0];
          let minDistSq = Infinity;
          for (const ch of challengers) {
            if (!ch || !Number.isFinite(ch.x) || !Number.isFinite(ch.y)) continue;
            const dSq = (ch.x - boss.x) ** 2 + (ch.y - boss.y) ** 2;
            if (dSq < minDistSq) {
              minDistSq = dSq;
              closestCh = ch;
            }
          }
          if (closestCh && Number.isFinite(closestCh.x) && Number.isFinite(closestCh.y)) {
            const clashMidX = (boss.x + closestCh.x) / 2;
            const clashMidY = ((boss.y - (boss.z ? boss.z * 0.35 : 0)) + (closestCh.y - (closestCh.z ? closestCh.z * 0.35 : 0))) / 2;

            // Keep the full envelope firmly centered while adding subtle focus to active clash point
            midX = envelopeMidX * 0.85 + clashMidX * 0.15;
            midY = envelopeMidY * 0.85 + clashMidY * 0.15;
          }
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
      const safeTargetZoom = Math.max(minZ, Math.min(maxZ, calculatedZoom));
      camera.targetZoom = Number.isFinite(safeTargetZoom) ? safeTargetZoom : 1.0;

      // Smoothly pan camera to track combat centroid
      const safeMidX = Number.isFinite(midX) ? midX : arenaCenterX;
      const safeMidY = Number.isFinite(midY) ? midY : arenaCenterY;
      camera.targetX = Math.max(minCamX, Math.min(maxCamX, safeMidX));
      camera.targetY = Math.max(minCamY, Math.min(maxCamY, safeMidY));

    } else if (aliveFighters.length === 1) {
      // Winner focus during victory or solo stance
      const winner = aliveFighters[0];
      const winX = Number.isFinite(winner.x) ? winner.x : arenaCenterX;
      const winY = Number.isFinite(winner.y) ? (winner.y - (winner.z ? winner.z * 0.35 : 0)) : arenaCenterY;

      camera.targetX = Math.max(minCamX, Math.min(maxCamX, winX));
      camera.targetY = Math.max(minCamY, Math.min(maxCamY, winY));
      camera.targetZoom = camCfg.winnerZoom ?? 1.10;
    } else {
      camera.targetX = arenaCenterX;
      camera.targetY = arenaCenterY;
      camera.targetZoom = 1.0;
    }
  }

  // Smooth exponential interpolation (lerp)
  let posSmoothing = camera.smoothing;
  if (castingNaoya) {
    const baseSmoothing = CONFIG.naoya?.ultCameraSmoothing ?? 0.28;
    const camDist = Math.hypot(camera.targetX - camera.x, camera.targetY - camera.y);
    // Dynamic catchup: as Naoya accelerates into Mach 3 or sweeps along wide angled loops, dynamically scale up follow rate
    const catchup = Math.min(0.55, (camDist / 180) * 0.35);
    posSmoothing = Math.min(0.85, baseSmoothing + catchup);
  }

  // Defensive fallback against NaN in camera positions
  if (!Number.isFinite(camera.targetX)) camera.targetX = arenaCenterX;
  if (!Number.isFinite(camera.targetY)) camera.targetY = arenaCenterY;
  if (!Number.isFinite(camera.x)) camera.x = arenaCenterX;
  if (!Number.isFinite(camera.y)) camera.y = arenaCenterY;
  if (!Number.isFinite(camera.targetZoom)) camera.targetZoom = 1.0;
  if (!Number.isFinite(camera.zoom)) camera.zoom = 1.0;

  camera.x += (camera.targetX - camera.x) * posSmoothing;
  camera.y += (camera.targetY - camera.y) * posSmoothing;

  // Asymmetric zoom rate: responsive quick zoom-out when spreading, smooth cinematic zoom-in
  const zoomLerpRate = (camera.targetZoom < camera.zoom)
    ? (camera.zoomOutSmoothing ?? camCfg.zoomOutSmoothing ?? 0.085)
    : (camera.zoomSmoothing ?? camCfg.zoomSmoothing ?? 0.048);
  camera.zoom += (camera.targetZoom - camera.zoom) * zoomLerpRate;
}

export function applyCameraToCtx(ctx) {
  const cam = state.camera;
  const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena || { x: 40, y: 240, width: 450, height: 450 };
  const arenaCenterX = (arena.x || 0) + (arena.width || 450) / 2;
  const arenaCenterY = (arena.y || 0) + (arena.height || 450) / 2;
  const screenCenterX = (state.canvas && Number.isFinite(state.canvas.width)) ? (state.canvas.width / 2) : 270;
  const screenCenterY = arenaCenterY;

  const isDynamic = Boolean(cam && cam.enabled && (cam.mode === 'dynamic' || cam.cinematicOverride));
  const isZooming = Boolean(cam && Math.abs((cam.zoom || 1.0) - 1.0) > 0.0005);

  if (isDynamic || isZooming) {
    const camX = (cam && Number.isFinite(cam.x)) ? cam.x : arenaCenterX;
    const camY = (cam && Number.isFinite(cam.y)) ? cam.y : arenaCenterY;
    const camZoom = (cam && Number.isFinite(cam.zoom) && cam.zoom > 0) ? cam.zoom : 1.0;
    const shakeX = (cam && Number.isFinite(cam.shakeX)) ? cam.shakeX : 0;
    const shakeY = (cam && Number.isFinite(cam.shakeY)) ? cam.shakeY : 0;

    ctx.translate(screenCenterX + shakeX, screenCenterY + shakeY);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-camX, -camY);
  } else {
    // Fixed camera mode (still supports screen shake)
    const shakeX = ((cam ? cam.shakeX : state.shakeX) || 0);
    const shakeY = ((cam ? cam.shakeY : state.shakeY) || 0);
    if (Number.isFinite(shakeX) && Number.isFinite(shakeY) && (shakeX !== 0 || shakeY !== 0)) {
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
  const arenaCenterX = (arena.x || 0) + (arena.width || 450) / 2;
  const arenaCenterY = (arena.y || 0) + (arena.height || 450) / 2;
  const screenCenterX = (state.canvas && Number.isFinite(state.canvas.width)) ? (state.canvas.width / 2) : 270;
  const screenCenterY = arenaCenterY;

  const safeWorldX = Number.isFinite(worldX) ? worldX : arenaCenterX;
  const safeWorldY = Number.isFinite(worldY) ? worldY : arenaCenterY;

  const isDynamic = Boolean(cam && cam.enabled && (cam.mode === 'dynamic' || cam.cinematicOverride));
  const isZooming = Boolean(cam && Math.abs((cam.zoom || 1.0) - 1.0) > 0.0005);

  if (isDynamic || isZooming) {
    const camX = (cam && Number.isFinite(cam.x)) ? cam.x : arenaCenterX;
    const camY = (cam && Number.isFinite(cam.y)) ? cam.y : arenaCenterY;
    const camZoom = (cam && Number.isFinite(cam.zoom) && cam.zoom > 0) ? cam.zoom : 1.0;
    const sx = screenCenterX + (safeWorldX - camX) * camZoom;
    const sy = screenCenterY + (safeWorldY - camY) * camZoom;
    return { 
      x: Number.isFinite(sx) ? sx : screenCenterX, 
      y: Number.isFinite(sy) ? sy : screenCenterY 
    };
  } else {
    return { 
      x: Number.isFinite(safeWorldX) ? safeWorldX : screenCenterX, 
      y: Number.isFinite(safeWorldY) ? safeWorldY : screenCenterY 
    };
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
