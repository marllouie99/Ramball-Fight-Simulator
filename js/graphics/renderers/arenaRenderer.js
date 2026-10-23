import { state } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { GAME_MODES } from '../../core/modeConfig.js';
import { applyCameraToCtx, worldToScreen } from '../../systems/cameraSystem.js';
import { updateSaitamaWallShatters, drawSaitamaWallShatters } from '../particles/saitamaWallShatter.js';
import { drawTopHudNameShatters } from '../particles/hudShatterEffect.js';
import { isCrazyDavePresent, renderCrazyDaveGrassFloor, loadGrassTileSpriteSheet, getGrassTileSpriteSheet } from './grassFloorRenderer.js';
import { renderActiveArenaFloor } from '../../systems/arenaTileSystem.js';
import { drawHorizontalMapFeatures } from '../../systems/horizontalMapSystem.js';
import { drawHorizontalFighterDolls } from './horizontalDollRenderer.js';
import { drawCenterPlusObstacle } from '../../systems/arenaObstacleSystem.js';
import { drawDisboardChessboard, drawTroopThreatTiles } from '../weapons/shiroChessGraphics.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { shiroConfig } from '../../configs/characters/shiroConfig.js';
import { drawArenaDecorations } from '../../systems/arenaDecorationSystem.js';

/**
 * Renders a solid vector fissure crack (matching manga comic / PNG crack art).
 */
function drawSolidVectorCrack(ctx, crack, isDark = false) {
  const alpha = Math.min(1.0, crack.life / 30); // fade out at end of lifetime
  ctx.save();
  ctx.translate(crack.x, crack.y);
  ctx.rotate(crack.angle);

  let r = crack.seed;
  const rand = () => {
    r = (r * 9301 + 49297) % 233280;
    return r / 233280;
  };

  const fillStyle = isDark ? `rgba(235, 240, 250, ${alpha * 0.90})` : `rgba(15, 15, 18, ${alpha * 0.95})`;

  // Helper to draw a filled polygonal crack ribbon path with tapering thickness
  const drawPolygonalRibbon = (spineNodes) => {
    if (!spineNodes || spineNodes.length < 2) return;
    const lefts = [];
    const rights = [];

    for (let i = 0; i < spineNodes.length; i++) {
      const curr = spineNodes[i];
      let dx = 0, dy = 0;
      if (i === 0) {
        dx = spineNodes[1].x - curr.x;
        dy = spineNodes[1].y - curr.y;
      } else if (i === spineNodes.length - 1) {
        dx = curr.x - spineNodes[i - 1].x;
        dy = curr.y - spineNodes[i - 1].y;
      } else {
        dx = spineNodes[i + 1].x - spineNodes[i - 1].x;
        dy = spineNodes[i + 1].y - spineNodes[i - 1].y;
      }
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const halfW = Math.max(0.4, curr.w / 2);

      lefts.push({ x: curr.x + nx * halfW, y: curr.y + ny * halfW });
      rights.push({ x: curr.x - nx * halfW, y: curr.y - ny * halfW });
    }

    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(lefts[0].x, lefts[0].y);
    for (let i = 1; i < lefts.length; i++) {
      ctx.lineTo(lefts[i].x, lefts[i].y);
    }
    for (let i = rights.length - 1; i >= 0; i--) {
      ctx.lineTo(rights[i].x, rights[i].y);
    }
    ctx.closePath();
    ctx.fill();
  };

  const crackScale = crack.scale !== undefined ? crack.scale : 0.45;
  const crackThickMult = crack.thickness !== undefined ? crack.thickness : 0.35;

  // Generate 2 primary solid fissure branches splitting along the wall zone
  const primaryCount = 2;
  const primarySpines = [];

  for (let p = 0; p < primaryCount; p++) {
    const nodes = [];
    let cx = 0;
    let cy = 0;
    let dir = (p === 0 ? -1 : 1);
    let baseAngle = Math.PI + dir * (0.5 + rand() * 0.5); 
    let currentAngle = baseAngle;
    
    let startThick = (18 + rand() * 10) * crackThickMult; // Scaled core thickness
    const segCount = 6 + Math.floor(rand() * 4);

    nodes.push({ x: cx, y: cy, w: startThick });

    for (let s = 0; s < segCount; s++) {
      const segLen = (14 + rand() * 22) * crackScale;
      cx += Math.cos(currentAngle) * segLen;
      cy += Math.sin(currentAngle) * segLen;

      const progress = (s + 1) / segCount;
      const w = Math.max(0.3, startThick * Math.pow(1 - progress, 1.2));

      nodes.push({ x: cx, y: cy, w: w });

      // Sharp step-wise zig-zag turns
      const turnSign = (s % 2 === 0 ? 1 : -1);
      currentAngle += turnSign * (0.4 + rand() * 0.7);

      // Clamp so it stays outside the arena wall
      const limit = 1.35;
      if (currentAngle > Math.PI + limit) currentAngle = Math.PI + limit;
      if (currentAngle < Math.PI - limit) currentAngle = Math.PI - limit;
    }

    drawPolygonalRibbon(nodes);
    primarySpines.push(nodes);
  }

  // Generate sharp offshoot sub-branches splitting from the primary fissures
  for (const spine of primarySpines) {
    if (spine.length < 3) continue;
    const branchCount = 2 + Math.floor(rand() * 3);
    for (let b = 0; b < branchCount; b++) {
      const nodeIdx = 1 + Math.floor(rand() * (spine.length - 2));
      const parentNode = spine[nodeIdx];
      const parentNext = spine[nodeIdx + 1];

      const parentAngle = Math.atan2(parentNext.y - parentNode.y, parentNext.x - parentNode.x);
      const sideSign = (b % 2 === 0 ? 1 : -1);
      let branchAngle = parentAngle + sideSign * (0.8 + rand() * 0.6);

      const branchNodes = [];
      let cx = parentNode.x;
      let cy = parentNode.y;
      let branchStartThick = Math.min(parentNode.w * 0.75, (10 + rand() * 6) * crackThickMult);
      const branchSegs = 3 + Math.floor(rand() * 4);

      branchNodes.push({ x: cx, y: cy, w: branchStartThick });

      for (let bs = 0; bs < branchSegs; bs++) {
        const segLen = (10 + rand() * 16) * crackScale;
        cx += Math.cos(branchAngle) * segLen;
        cy += Math.sin(branchAngle) * segLen;

        const progress = (bs + 1) / branchSegs;
        const w = Math.max(0.3, branchStartThick * (1 - progress));

        branchNodes.push({ x: cx, y: cy, w: w });

        branchAngle += (bs % 2 === 0 ? 1 : -1) * (0.3 + rand() * 0.6);

        const limit = 1.4;
        if (branchAngle > Math.PI + limit) branchAngle = Math.PI + limit;
        if (branchAngle < Math.PI - limit) branchAngle = Math.PI - limit;
      }

      drawPolygonalRibbon(branchNodes);
    }
  }

  // Draw 1-2 small detached satellite cracks nearby for added detail
  const satelliteCount = 1 + Math.floor(rand() * 2);
  for (let sat = 0; sat < satelliteCount; sat++) {
    const satOffsetAngle = Math.PI + (rand() - 0.5) * 1.8;
    const satDist = (30 + rand() * 45) * crackScale;
    let cx = Math.cos(satOffsetAngle) * satDist;
    let cy = Math.sin(satOffsetAngle) * satDist;

    const satNodes = [];
    let satAngle = satOffsetAngle + (rand() - 0.5) * 1.2;
    let satThick = 5 + rand() * 4;
    const satSegs = 3 + Math.floor(rand() * 3);

    satNodes.push({ x: cx, y: cy, w: satThick });

    for (let ss = 0; ss < satSegs; ss++) {
      const len = 8 + rand() * 14;
      cx += Math.cos(satAngle) * len;
      cy += Math.sin(satAngle) * len;

      const progress = (ss + 1) / satSegs;
      const w = Math.max(0.4, satThick * (1 - progress));

      satNodes.push({ x: cx, y: cy, w: w });
      satAngle += (ss % 2 === 0 ? 1 : -1) * (0.4 + rand() * 0.5);
    }

    drawPolygonalRibbon(satNodes);
  }

  ctx.restore();
}


/**
 * Renders the Shiro & Sora Disboard Virtual Chessboard on the arena floor.
 * Placed strictly on the floor pass so all domain dim screens, arena borders,
 * wall cracks, speed lines, ground VFX, and character bodies render on top!
 */
export function renderShiroChessboardFloor(ctx, arena) {
  if (!arena) return;
  const fighters = state.fighters;
  const shiroFighters = fighters ? fighters.filter(f => f && (f.characterId === 'shiro' || f.type === 'shiro' || f.characterId === 'sora' || f.type === 'sora')) : [];

  if (shiroFighters.length === 0) {
    state._shiroChessboardAlpha = 0.0;
    state._shiroChessboardAssembleProgress = 0.0;
    state._shiroChessboardShutdownTimer = 0;
    state._shiroChessboardWasActive = false;
    return;
  }

  let hasActiveTroops = false;
  const allMinions = [];

  for (const sf of shiroFighters) {
    if (sf.activeMinions && Array.isArray(sf.activeMinions)) {
      for (const m of sf.activeMinions) {
        if (m && !m.dead && (m.hp > 0 || !m.isMinion)) {
          hasActiveTroops = true;
        }
        allMinions.push(m);
      }
    }
  }

  if (state._shiroChessboardAlpha === undefined) state._shiroChessboardAlpha = 0.0;
  if (state._shiroChessboardAssembleProgress === undefined) state._shiroChessboardAssembleProgress = 0.0;
  if (state._shiroChessboardShutdownTimer === undefined) state._shiroChessboardShutdownTimer = 0;
  if (state._shiroChessboardWasActive === undefined) state._shiroChessboardWasActive = false;

  const cb = shiroConfig?.chessboard || CONFIG?.shiro?.chessboard || {};
  const SHUTDOWN_DURATION = cb.shutdownDuration ?? 28; // Duration in frames for CRT power-off collapse
  const ASSEMBLE_SPEED = cb.assembleDuration ? (1.0 / cb.assembleDuration) : 0.025; // Speed per frame
  const FADE_IN_SPEED = cb.fadeInSpeed ?? 0.12;
  const FADE_OUT_SPEED = cb.fadeOutSpeed ?? 0.10;
  const FADE_THRESHOLD = cb.shutdownFadeThreshold ?? 0.85;
  let shutdownProgress = 0.0;

  const getShiroVol = (key, defaultVol = 0.85) => {
    return shiroConfig.soundVolumes?.[key]
      ?? shiroConfig.audioVolumes?.[key]
      ?? CONFIG.shiro?.soundVolumes?.[key]
      ?? CONFIG.shiro?.audioVolumes?.[key]
      ?? defaultVol;
  };

  const areAllShiroDead = shiroFighters.length > 0 && shiroFighters.every(sf => sf.dead || sf.isDead || (sf.hp || 0) <= 0);
  let isShiroDefeatedInMatch = Boolean(state._shiroDefeatShutdown) || areAllShiroDead;

  if (typeof state !== 'undefined') {
    const winner = state.matchWinner || state.roundWinner;
    if (winner) {
      const isWinnerShiroOrAlly = shiroFighters.some(sf => {
        if (winner === sf) return true;
        if (state.getFighterTeam && typeof state.getFighterTeam === 'function' && Array.isArray(state.fighters)) {
          const winnerIdx = state.fighters.indexOf(winner);
          const sfIdx = state.fighters.indexOf(sf);
          if (winnerIdx !== -1 && sfIdx !== -1 && state.getFighterTeam(winnerIdx) === state.getFighterTeam(sfIdx)) {
            return true;
          }
        }
        return false;
      });
      if (!isWinnerShiroOrAlly) {
        isShiroDefeatedInMatch = true;
      }
    } else if (state.gameState === 'roundEnd' || state.gameState === 'matchEnd') {
      if (areAllShiroDead) {
        isShiroDefeatedInMatch = true;
      }
    }
  }

  const isDefeatShutdown = isShiroDefeatedInMatch;
  if (isDefeatShutdown) {
    state._shiroVictoryShutdown = false;
    state._shiroDefeatShutdown = true;
  }
  const isVictoryShutdown = Boolean(state._shiroVictoryShutdown) && !isDefeatShutdown;
  const shouldShutdown = isVictoryShutdown || isDefeatShutdown || (!hasActiveTroops && state._shiroChessboardWasActive);

  if (!shouldShutdown && hasActiveTroops) {
    // Active troops present during normal battle: if not already active, trigger chessboard turn-on sound effect
    if (!state._shiroChessboardWasActive && state._shiroChessboardAlpha <= 0.05) {
      audioSystem.playSFX('shiro_board_turnon', getShiroVol('boardAppear', 0.85));
    }
    state._shiroChessboardShutdownTimer = 0;
    state._shiroChessboardWasActive = true;
    state._shiroChessboardAlpha = Math.min(cb.maxAlpha ?? 1.0, state._shiroChessboardAlpha + FADE_IN_SPEED);
    state._shiroChessboardAssembleProgress = Math.min(1.0, state._shiroChessboardAssembleProgress + ASSEMBLE_SPEED);
  } else {
    // Shutdown branch (either victory shutdown, defeat shutdown, or all troops destroyed during fight)
    const shutdownDuration = state._shiroChessboardShutdownDuration || SHUTDOWN_DURATION;

    const isRoundOrMatchEnd = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
    const endTimer = (typeof state !== 'undefined' && (
      state.gameState === 'matchEnd' 
        ? (state.matchEndTimer || 0) 
        : (state.roundEndTimer || state.matchEndTimer || 0)
    )) || 0;

    // Start shutdown if not already running, BUT ONLY IF the board was actively visible!
    // On defeat: start shutdown immediately without waiting for victory timer!
    // On victory: wait until faah.mp3 (120f) and YOU WIN! announcer (80f) have finished (200 frames) before initiating shutdown!
    const canStartShutdown = isDefeatShutdown || (!isRoundOrMatchEnd || endTimer >= 200);
    if (state._shiroChessboardShutdownTimer === 0 && canStartShutdown) {
      if (state._shiroChessboardWasActive && state._shiroChessboardAlpha > 0.05) {
        state._shiroChessboardShutdownTimer = shutdownDuration;
        state._shiroChessboardShutdownStartAlpha = state._shiroChessboardAlpha;
        audioSystem.playSFX('shiro_board_shutdown', getShiroVol('boardShutdown', 0.85));

        // STRICT AUDIO SUPPRESSION: Only play shutdown voiceline on VICTORY! NEVER on defeat!
        if (isVictoryShutdown && !isDefeatShutdown) {
          const shutdownVoice = shiroConfig.sounds?.boardShutdownVoiceline || 'Assets/Sound Effects/Shiro/shiro_chessboard_shutdown_voiceline.mp3';
          audioSystem.playSFX(shutdownVoice, getShiroVol('boardShutdownVoiceline', 1.0));
        }

        // When the chessboard shuts down, destroy all active troops!
        for (const sf of shiroFighters) {
          sf.destroyAllActiveTroops?.(true);
        }
      }
    }

    if (isDefeatShutdown) {
      // Guarantee all active troops are destroyed when Shiro loses!
      for (const sf of shiroFighters) {
        if (sf.activeMinions && sf.activeMinions.length > 0) {
          sf.destroyAllActiveTroops?.(true);
        }
      }
    }

    if (state._shiroChessboardShutdownTimer > 0) {
      // Ensure all active troops are destroyed during chessboard shutdown
      for (const sf of shiroFighters) {
        if (sf.activeMinions && sf.activeMinions.length > 0) {
          sf.destroyAllActiveTroops?.(true);
        }
      }

      state._shiroChessboardShutdownTimer--;
      shutdownProgress = 1.0 - (state._shiroChessboardShutdownTimer / shutdownDuration);

      // Fade alpha from startAlpha during final dissipation threshold (never jump to 1.0!)
      const startAlpha = state._shiroChessboardShutdownStartAlpha ?? (cb.maxAlpha ?? 1.0);
      if (shutdownProgress >= FADE_THRESHOLD) {
        const fadeRatio = (1.0 - shutdownProgress) / Math.max(0.01, 1.0 - FADE_THRESHOLD);
        state._shiroChessboardAlpha = Math.max(0.0, startAlpha * fadeRatio);
      } else {
        state._shiroChessboardAlpha = startAlpha;
      }

      // Lock assemble progress at 1.0 during shutdown so no half-assembled wireframe tiles appear
      state._shiroChessboardAssembleProgress = 1.0;

      if (state._shiroChessboardShutdownTimer <= 0) {
        state._shiroChessboardWasActive = false;
        state._shiroChessboardAlpha = 0.0;
        state._shiroChessboardAssembleProgress = 0.0;
        state._shiroVictoryShutdown = false;
        state._shiroDefeatShutdown = false;
        state._shiroChessboardShutdownStartAlpha = null;
      }
    } else {
      // Fully powered off / fading out
      state._shiroChessboardAlpha = Math.max(0.0, state._shiroChessboardAlpha - FADE_OUT_SPEED);
      if (state._shiroChessboardAlpha <= 0.01) {
        state._shiroChessboardAssembleProgress = 0.0;
        state._shiroChessboardWasActive = false;
        state._shiroVictoryShutdown = false;
        state._shiroDefeatShutdown = false;
        state._shiroChessboardShutdownStartAlpha = null;
      }
    }
  }

  if (ctx && (state._shiroChessboardAlpha > 0.01 || state._shiroChessboardShutdownTimer > 0)) {
    drawDisboardChessboard(ctx, arena, state._shiroChessboardAlpha, state._shiroChessboardAssembleProgress, shutdownProgress);
    if (allMinions.length > 0 && shutdownProgress === 0.0) {
      drawTroopThreatTiles(ctx, arena, allMinions, state._shiroChessboardAlpha);
    }
  }
}

/**
 * Draws a rounded rectangle path with cross-environment fallback.
 */
function _drawRoundRectPath(ctx, rx, ry, rw, rh, rad) {
  rad = Math.min(rad, rw / 2, rh / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, rad);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(rx + rad, ry);
  ctx.lineTo(rx + rw - rad, ry);
  ctx.arcTo(rx + rw, ry, rx + rw, ry + rad, rad);
  ctx.lineTo(rx + rw, ry + rh - rad);
  ctx.arcTo(rx + rw, ry + rh, rx + rw - rad, ry + rh, rad);
  ctx.lineTo(rx + rad, ry + rh);
  ctx.arcTo(rx, ry + rh, rx, ry + rh - rad, rad);
  ctx.lineTo(rx, ry + rad);
  ctx.arcTo(rx, ry, rx + rad, ry, rad);
  ctx.closePath();
}

/**
 * Draws the polygonal boundary of a turnbuckle corner pauldron plate with inner diagonal brace.
 */
function _drawCornerCleatPolygon(ctx, cx, cy, sx, sy, armLen, thick, brace) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + sx * armLen, cy);
  ctx.lineTo(cx + sx * armLen, cy + sy * thick);
  ctx.lineTo(cx + sx * (thick + brace), cy + sy * thick);
  ctx.lineTo(cx + sx * thick, cy + sy * (thick + brace));
  ctx.lineTo(cx + sx * thick, cy + sy * armLen);
  ctx.lineTo(cx, cy + sy * armLen);
  ctx.closePath();
}

/**
 * Renders the high-octane comic anime arena border frame onto an offscreen canvas.
 * Perfectly mirrors the manga ink border, inner white highlight rim, 3D hard drop shadow,
 * and turnbuckle corner cleats of the fighter profile HUD.
 */
function _renderComicArenaBorder(oc, padding, arena, isDark) {
  const shape = arena.shape || 'rect';
  const x = padding;
  const y = padding;
  const w = arena.width;
  const h = arena.height;
  const cornerR = 8.0;

  oc.save();
  oc.imageSmoothingEnabled = true;

  if (shape === 'circle') {
    const cx = padding + w / 2;
    const cy = padding + h / 2;
    const ar = (arena.radius !== undefined ? arena.radius : (w / 2));

    // 1. 3D Comic Hard Drop Shadow (stepped strokes, Rule 11 compliant)
    const shadowDistX = 3.5;
    const shadowDistY = 4.5;
    oc.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(5, 6, 9, 0.65)';
    oc.lineWidth = 5.0;
    oc.beginPath();
    oc.arc(cx + shadowDistX, cy + shadowDistY, ar, 0, Math.PI * 2);
    oc.stroke();

    oc.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.40)' : 'rgba(5, 6, 9, 0.22)';
    oc.lineWidth = 6.5;
    oc.beginPath();
    oc.arc(cx + shadowDistX + 1.0, cy + shadowDistY + 1.0, ar, 0, Math.PI * 2);
    oc.stroke();

    // 2. Heavy Manga Ink Outer Ring (#050609)
    oc.strokeStyle = '#050609';
    oc.lineWidth = 5.0;
    oc.beginPath();
    oc.arc(cx, cy, ar, 0, Math.PI * 2);
    oc.stroke();

    // 3. Crisp Inner White Highlight Rim (#FFFFFF, inset 2.2px)
    const inset = 2.2;
    oc.strokeStyle = '#FFFFFF';
    oc.lineWidth = 2.0;
    oc.beginPath();
    oc.arc(cx, cy, ar - inset, 0, Math.PI * 2);
    oc.stroke();

    // 4. Tactical Inset Contrast Track (inset 4.2px)
    const inset2 = 4.2;
    oc.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.26)';
    oc.lineWidth = 1.0;
    oc.beginPath();
    oc.arc(cx, cy, ar - inset2, 0, Math.PI * 2);
    oc.stroke();

    // 5. 4 Cardinal Turnbuckle Cleats (0, 90, 180, 270 deg)
    const angles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
    for (const ang of angles) {
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const bx = cx + cosA * ar;
      const by = cy + sinA * ar;

      // Drop shadow for turnbuckle
      oc.save();
      oc.translate(bx + shadowDistX * 0.6, by + shadowDistY * 0.6);
      oc.rotate(ang);
      oc.fillStyle = '#050609';
      oc.fillRect(-4, -8, 8, 16);
      oc.restore();

      // Turnbuckle body
      oc.save();
      oc.translate(bx, by);
      oc.rotate(ang);
      oc.fillStyle = '#050609';
      oc.fillRect(-4, -8, 8, 16);
      oc.fillStyle = '#FFFFFF';
      oc.fillRect(-2, -6, 4, 12);
      // Center rivet
      oc.beginPath();
      oc.arc(0, 0, 2.5, 0, Math.PI * 2);
      oc.fillStyle = '#050609';
      oc.fill();
      oc.beginPath();
      oc.arc(0, 0, 1.2, 0, Math.PI * 2);
      oc.fillStyle = '#FFFFFF';
      oc.fill();
      oc.restore();
    }
  } else {
    // ── RECTANGULAR ARENA (Canonical Vertical & Standard Mode) ──

    // 1. 3D Comic Hard Drop Shadow (Down & Right, Rule 11 compliant)
    const shadowDistX = 3.5;
    const shadowDistY = 4.5;
    oc.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(5, 6, 9, 0.65)';
    oc.lineWidth = 5.0;
    oc.lineJoin = 'round';
    oc.lineCap = 'round';
    _drawRoundRectPath(oc, x + shadowDistX, y + shadowDistY, w, h, cornerR);
    oc.stroke();

    // Secondary softer edge shadow
    oc.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.40)' : 'rgba(5, 6, 9, 0.22)';
    oc.lineWidth = 6.5;
    _drawRoundRectPath(oc, x + shadowDistX + 1.0, y + shadowDistY + 1.0, w, h, cornerR);
    oc.stroke();

    // 2. Heavy Manga Ink Outer Frame (#050609)
    oc.strokeStyle = '#050609';
    oc.lineWidth = 5.0;
    oc.lineJoin = 'round';
    oc.lineCap = 'round';
    _drawRoundRectPath(oc, x, y, w, h, cornerR);
    oc.stroke();

    // 3. Crisp Inner White Highlight Rim (#FFFFFF, inset 2.2px)
    const inset = 2.2;
    oc.strokeStyle = '#FFFFFF';
    oc.lineWidth = 2.0;
    oc.lineJoin = 'round';
    oc.lineCap = 'round';
    _drawRoundRectPath(oc, x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(2, cornerR - inset));
    oc.stroke();

    // 4. Tactical Inset Contrast Track (inset 4.2px)
    const inset2 = 4.2;
    oc.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.26)';
    oc.lineWidth = 1.0;
    oc.lineJoin = 'round';
    _drawRoundRectPath(oc, x + inset2, y + inset2, w - inset2 * 2, h - inset2 * 2, Math.max(1, cornerR - inset2));
    oc.stroke();

    // 5. Chunky Comic Corner Turnbuckle Cleats
    const armLen = 26;
    const thick = 6.5;
    const brace = 8.5;
    const corners = [
      { cx: x, cy: y, sx: 1, sy: 1 },         // Top-Left
      { cx: x + w, cy: y, sx: -1, sy: 1 },     // Top-Right
      { cx: x, cy: y + h, sx: 1, sy: -1 },     // Bottom-Left
      { cx: x + w, cy: y + h, sx: -1, sy: -1 } // Bottom-Right
    ];

    for (const c of corners) {
      // 5a. Drop shadow for cleat
      _drawCornerCleatPolygon(oc, c.cx + c.sx * 2.0, c.cy + c.sy * 2.5, c.sx, c.sy, armLen, thick, brace);
      oc.fillStyle = isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(5, 6, 9, 0.55)';
      oc.fill();

      // 5b. Solid Comic Ink Outer Shell
      _drawCornerCleatPolygon(oc, c.cx, c.cy, c.sx, c.sy, armLen, thick, brace);
      oc.fillStyle = '#050609';
      oc.fill();
      oc.strokeStyle = '#050609';
      oc.lineWidth = 1.5;
      oc.lineJoin = 'miter';
      oc.stroke();

      // 5c. Inner Crisp White Highlight Core
      oc.strokeStyle = '#FFFFFF';
      oc.lineWidth = 1.8;
      oc.lineCap = 'round';
      // Horizontal arm core
      oc.beginPath();
      oc.moveTo(c.cx + c.sx * 6.5, c.cy + c.sy * 3.25);
      oc.lineTo(c.cx + c.sx * (armLen - 3), c.cy + c.sy * 3.25);
      oc.stroke();
      // Vertical arm core
      oc.beginPath();
      oc.moveTo(c.cx + c.sx * 3.25, c.cy + c.sy * 6.5);
      oc.lineTo(c.cx + c.sx * 3.25, c.cy + c.sy * (armLen - 3));
      oc.stroke();
      // Diagonal brace core
      oc.beginPath();
      oc.moveTo(c.cx + c.sx * 10.5, c.cy + c.sy * 3.25);
      oc.lineTo(c.cx + c.sx * 3.25, c.cy + c.sy * 10.5);
      oc.stroke();

      // 5d. Primary Vertex Turnbuckle Bolt
      const vx = c.cx + c.sx * 6.5;
      const vy = c.cy + c.sy * 6.5;
      oc.beginPath();
      oc.arc(vx, vy, 3.2, 0, Math.PI * 2);
      oc.fillStyle = '#050609';
      oc.fill();
      oc.beginPath();
      oc.arc(vx, vy, 2.2, 0, Math.PI * 2);
      oc.fillStyle = '#FFFFFF';
      oc.fill();
      oc.beginPath();
      oc.arc(vx, vy, 1.0, 0, Math.PI * 2);
      oc.fillStyle = '#050609';
      oc.fill();

      // 5e. Secondary Arm Rivets
      // Horizontal Arm Rivet
      const hx = c.cx + c.sx * 19;
      const hy = c.cy + c.sy * 3.25;
      oc.beginPath();
      oc.arc(hx, hy, 2.0, 0, Math.PI * 2);
      oc.fillStyle = '#050609';
      oc.fill();
      oc.beginPath();
      oc.arc(hx, hy, 1.2, 0, Math.PI * 2);
      oc.fillStyle = '#FFFFFF';
      oc.fill();

      // Vertical Arm Rivet
      const vix = c.cx + c.sx * 3.25;
      const viy = c.cy + c.sy * 19;
      oc.beginPath();
      oc.arc(vix, viy, 2.0, 0, Math.PI * 2);
      oc.fillStyle = '#050609';
      oc.fill();
      oc.beginPath();
      oc.arc(vix, viy, 1.2, 0, Math.PI * 2);
      oc.fillStyle = '#FFFFFF';
      oc.fill();
    }

    // 6. Tactical Midpoint Alignment Tabs
    const midpoints = [
      { mx: x + w * 0.5, my: y, isHoriz: true },         // Top Center
      { mx: x + w * 0.5, my: y + h, isHoriz: true },     // Bottom Center
      { mx: x, my: y + h * 0.5, isHoriz: false },        // Left Center
      { mx: x + w, my: y + h * 0.5, isHoriz: false }     // Right Center
    ];

    for (const m of midpoints) {
      if (m.isHoriz) {
        // Drop shadow
        oc.fillStyle = isDark ? 'rgba(0, 0, 0, 0.70)' : 'rgba(5, 6, 9, 0.40)';
        oc.fillRect(m.mx - 9 + 1.5, m.my - 2.5 + 2.0, 18, 5);
        // Outer black ink tab
        oc.fillStyle = '#050609';
        oc.fillRect(m.mx - 9, m.my - 2.5, 18, 5);
        // Inner white highlight core
        oc.fillStyle = '#FFFFFF';
        oc.fillRect(m.mx - 7, m.my - 1.0, 14, 2);
        // Center diamond pointer
        oc.beginPath();
        oc.moveTo(m.mx, m.my - 3);
        oc.lineTo(m.mx + 3, m.my);
        oc.lineTo(m.mx, m.my + 3);
        oc.lineTo(m.mx - 3, m.my);
        oc.closePath();
        oc.fillStyle = '#050609';
        oc.fill();
        oc.fillStyle = '#FFFFFF';
        oc.fillRect(m.mx - 0.75, m.my - 0.75, 1.5, 1.5);
      } else {
        // Drop shadow
        oc.fillStyle = isDark ? 'rgba(0, 0, 0, 0.70)' : 'rgba(5, 6, 9, 0.40)';
        oc.fillRect(m.mx - 2.5 + 1.5, m.my - 9 + 2.0, 5, 18);
        // Outer black ink tab
        oc.fillStyle = '#050609';
        oc.fillRect(m.mx - 2.5, m.my - 9, 5, 18);
        // Inner white highlight core
        oc.fillStyle = '#FFFFFF';
        oc.fillRect(m.mx - 1.0, m.my - 7, 2, 14);
        // Center diamond pointer
        oc.beginPath();
        oc.moveTo(m.mx - 3, m.my);
        oc.lineTo(m.mx, m.my + 3);
        oc.lineTo(m.mx + 3, m.my);
        oc.lineTo(m.mx, m.my - 3);
        oc.closePath();
        oc.fillStyle = '#050609';
        oc.fill();
        oc.fillStyle = '#FFFFFF';
        oc.fillRect(m.mx - 0.75, m.my - 0.75, 1.5, 1.5);
      }
    }
  }

  oc.restore();
}

/**
 * Renders the high-octane comic arena border, turnbuckle cleats, center obstacles,
 * wall cracks, and Saitama wall breaches.
 * Can be called during background setup and/or on the foreground layer to guarantee
 * that domain visuals, dim overlays, and shrine structures never cover or overlay the border.
 */
export function drawArenaBorder(ctx = state.ctx, alreadyInCameraSpace = false) {
  const arena = (typeof state !== 'undefined' && state.arena) || CONFIG.arena;
  if (!arena || !ctx) return;
  const isDark = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  const shape = arena.shape || 'rect';
  const borderKey = `${arena.width}_${arena.height}_${shape}_${isDark ? 'dark_comic' : 'light_comic'}_v2`;
  if (!state._arenaBorderCanvas || state._arenaBorderCanvas._key !== borderKey) {
    const padding = 60;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = arena.width + padding * 2;
    offCanvas.height = arena.height + padding * 2;
    const oc = offCanvas.getContext('2d');
    _renderComicArenaBorder(oc, padding, arena, isDark);
    offCanvas._key = borderKey;
    state._arenaBorderCanvas = offCanvas;
  }

  if (!alreadyInCameraSpace) {
    ctx.save();
    applyCameraToCtx(ctx);
  }

  // Draw cached comic arena border
  ctx.drawImage(state._arenaBorderCanvas, arena.x - 60, arena.y - 60);

  // ── Draw Seasonal Arena Corner Decorations (e.g. Halloween Cobwebs) ──
  drawArenaDecorations(ctx, arena);

  // ── Draw Center Plus (+) Arena Wall (FFA Obstacle) ──
  drawCenterPlusObstacle(ctx, arena, isDark);

  // ── Draw Wall Cracks (Decals) ──
  if (state.wallCracks && state.wallCracks.length > 0) {
    ctx.save();
    ctx.beginPath();
    const clipMarginTop = 75;
    const clipMarginBottom = 75;
    const clipMarginSides = 42;
    ctx.rect(
      arena.x - clipMarginSides,
      arena.y - clipMarginTop,
      arena.width + clipMarginSides * 2,
      arena.height + clipMarginTop + clipMarginBottom
    );
    ctx.clip();

    for (let i = state.wallCracks.length - 1; i >= 0; i--) {
      const crack = state.wallCracks[i];
      if (!alreadyInCameraSpace) {
        crack.life--;
      }
      if (crack.life <= 0) {
        state.wallCracks.splice(i, 1);
        continue;
      }
      drawSolidVectorCrack(ctx, crack, isDark);
    }
    ctx.restore();
  }

  // ── Draw Saitama Shattered Wall Breaches & Flying Line Shards ──
  if ((state.shatteredWalls && state.shatteredWalls.length > 0) || (CONFIG.saitama?.enableHudShatter && state.hudShatters && state.hudShatters.bottomHudShatter)) {
    if (!alreadyInCameraSpace) {
      updateSaitamaWallShatters();
    }
    drawSaitamaWallShatters(ctx, isDark, arena);
  }

  if (!alreadyInCameraSpace) {
    ctx.restore();
  }
}

export function drawArena() {
  const { ctx, canvas, arena, pixiLayers, pixiApp } = state;
  const isDark = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  const hasActiveDomain = state.fighters && state.fighters.some(f => f && (f.domainActive || f.stolenDomainActive || f._mahitoDomainActive || (f.characterId === 'cj' && (f.isBaguvixActive || f.isGodModeActive))) && typeof f.drawDomainBackground === 'function');
  const isStorming = Boolean(
    (state.fighters && state.fighters.some(f => 
      f && f.hp > 0 && (
        ((f.characterId === 'zeus' || f.type === 'zeus' || f._def?.id === 'zeus') && (f.isChargingStorm || f.stormActive)) ||
        (f.characterId === 'rubbick' && f.stormActive)
      )
    )) || (state.previewFighter && (state.previewFighter.isChargingStorm || state.previewFighter.stormActive))
  );
  const suppressArenaFloor = hasActiveDomain || isStorming;

  // 1. Draw outer background container (Original Colors)
  if (typeof window !== 'undefined' && window.PIXI && pixiApp && pixiLayers?.arena) {
    if (!state.arenaGraphics) {
      state.arenaGraphics = new window.PIXI.Graphics();
      pixiLayers.arena.addChild(state.arenaGraphics);
    }
    
    const g = state.arenaGraphics;
    g.clear();

    const parseColor = (c) => {
      if (typeof c === 'number') return { color: c, alpha: 1 };
      if (!c) return { color: 0x000000, alpha: 1 };
      let hex = c.replace('#', '');
      if (hex.length === 8) return { color: parseInt(hex.substring(0, 6), 16), alpha: parseInt(hex.substring(6, 8), 16) / 255 };
      if (hex.length === 6) return { color: parseInt(hex, 16), alpha: 1 };
      if (hex.length === 3) return { color: parseInt(hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2], 16), alpha: 1 };
      return { color: 0x000000, alpha: 1 };
    };

    const canvasBg = parseColor(isDark ? '#0A0C13' : (CONFIG.canvasBgColor === '#ffffffff' ? '#141622' : (CONFIG.canvasBgColor || '#141622')));
    const outerBg = parseColor(isDark ? '#0A0C13' : (CONFIG.arenaOuterBgColor === '#ffffffff' ? '#141622' : (CONFIG.arenaOuterBgColor || '#141622')));
    const innerBg = parseColor(isDark ? '#000000' : (CONFIG.arenaInnerBgColor || '#ffffffff'));

    const bleed = 4000;
    const bgW = pixiApp.screen.width + bleed * 2;
    const bgH = pixiApp.screen.height + bleed * 2;

    g.beginFill(canvasBg.color, canvasBg.alpha);
    g.drawRect(-bleed, -bleed, bgW, bgH);
    g.endFill();

    if (!suppressArenaFloor) {
      g.beginFill(outerBg.color, outerBg.alpha);
      g.drawRect(-bleed, -bleed, bgW, bgH);
      g.endFill();
    } else {
      g.beginFill(isDark ? 0x000000 : 0x080808, 1.0);
      g.drawRect(-bleed, -bleed, bgW, bgH);
      g.endFill();
    }

    // 2. Draw Floor Background (Original Colors or PvZ Grass Tiles)
    if (!suppressArenaFloor) {
      if (!state.floorGraphics && pixiLayers?.environment) {
        state.floorGraphics = new window.PIXI.Graphics();
        pixiLayers.environment.addChildAt(state.floorGraphics, 0);
      }
      if (state.floorGraphics) {
        const fg = state.floorGraphics;
        fg.clear();
        const floorColor = innerBg.color;
        fg.beginFill(floorColor, innerBg.alpha);
        const fBleed = 0;
        if (arena.shape === 'circle') {
          const cx = arena.x + arena.width / 2;
          const cy = arena.y + arena.height / 2;
          const ar = (arena.radius !== undefined ? arena.radius : (arena.width / 2)) + fBleed;
          fg.drawCircle(cx, cy, ar);
        } else {
          fg.drawRect(arena.x - fBleed, arena.y - fBleed, arena.width + fBleed * 2, arena.height + fBleed * 2);
        }
        fg.endFill();
      }
    } else {
      if (state.floorGraphics) {
        state.floorGraphics.clear();
      }
    }
  } else if (ctx && canvas) {
    // Canvas 2D fallback: Draw outer background under camera transform with bleed
    ctx.save();
    applyCameraToCtx(ctx);
    const bleed = 4000;
    const canvasBg = isDark ? '#0A0C13' : (CONFIG.canvasBgColor === '#ffffffff' ? '#141622' : (CONFIG.canvasBgColor || '#141622'));
    const outerBg = isDark ? '#0A0C13' : (CONFIG.arenaOuterBgColor === '#ffffffff' ? '#141622' : (CONFIG.arenaOuterBgColor || '#141622'));
    ctx.fillStyle = canvasBg;
    ctx.fillRect(-bleed, -bleed, canvas.width + bleed * 2, canvas.height + bleed * 2);
    if (!suppressArenaFloor) {
      ctx.fillStyle = outerBg;
      ctx.fillRect(-bleed, -bleed, canvas.width + bleed * 2, canvas.height + bleed * 2);
    } else {
      ctx.fillStyle = isDark ? '#000000' : '#080808';
      ctx.fillRect(-bleed, -bleed, canvas.width + bleed * 2, canvas.height + bleed * 2);
    }
    ctx.restore();
  }

  // 3. Clean solid background (no textures) matching HUD vibe
  if (state._arenaOuterDetailsCanvas) {
    state._arenaOuterDetailsCanvas = null;
  }

  // 4. Draw Arena Floor Background in Canvas 2D (Synchronized under Camera)
  {
    if (!suppressArenaFloor) {
      ctx.save();
      applyCameraToCtx(ctx);
      const fBleed = 0;
      renderActiveArenaFloor(ctx, arena, isDark, fBleed);
      const isGrandArena = (arena.width > 1000) || (state.mode === '3v3v3v3' || state.mode === '4v4' || state.mode === '2v2v2v2' || state.mode === 'Battle Royale 8');
      if (state.viewOrientation === 'horizontal' && isGrandArena) {
        drawHorizontalMapFeatures(ctx, arena);
      }
      renderShiroChessboardFloor(ctx, arena);
      ctx.restore();
    } else {
      renderShiroChessboardFloor(null, arena);
      if (hasActiveDomain && !state.pixiApp) {
        // In native Canvas 2D mode, render active domain background under camera transform
        const activeDomainFighter = state.fighters?.find(f => f && (f.domainActive || f.stolenDomainActive || f._mahitoDomainActive || (f.characterId === 'cj' && (f.isBaguvixActive || f.isGodModeActive))) && typeof f.drawDomainBackground === 'function');
        if (activeDomainFighter) {
          ctx.save();
          applyCameraToCtx(ctx);
          activeDomainFighter.drawDomainBackground(ctx);
          ctx.restore();
        }
      }
    }

    // Draw initial arena border layer
    drawArenaBorder(ctx, false);
  }

  // 5. In-Arena Floor Watermark Brand Tag (@CronosphereFOC) positioned below in the arena near bottom wall
  {
    const watermarkCfg = (typeof CONFIG !== 'undefined' && CONFIG.arenaWatermark) ? CONFIG.arenaWatermark : null;
    const showWatermark = watermarkCfg ? watermarkCfg.enabled !== false : true;
    if (showWatermark && !suppressArenaFloor) {
      ctx.save();
      applyCameraToCtx(ctx);
      const text = watermarkCfg?.text || '@CronosphereFOC';
      const fontSize = watermarkCfg?.fontSize || 14;
      const font = `700 ${fontSize}px ${watermarkCfg?.fontFamily || '"Outfit", "Rajdhani", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}`;
      ctx.font = font;
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = watermarkCfg?.letterSpacing || '1px';
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const watermarkX = arena.x + arena.width / 2;
      const bottomOffset = watermarkCfg?.bottomOffset || 22;
      const watermarkY = Math.round(arena.y + arena.height - bottomOffset);

      // Contrast stroke outline so bright font pops clearly against all arena tiles/floors
      const strokeWidth = watermarkCfg?.strokeWidth ?? 2.5;
      if (strokeWidth > 0) {
        ctx.strokeStyle = watermarkCfg?.strokeColor || 'rgba(0, 0, 0, 0.75)';
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, watermarkX, watermarkY);
      }

      // Bright font fill color
      ctx.fillStyle = watermarkCfg?.color || (isDark ? '#FFFFFF' : '#FFFFFF');
      ctx.fillText(text, watermarkX, watermarkY);
      ctx.restore();
    }
  }

  // 6. Cached Title Header (text only)
  const showTitle = (typeof CONFIG !== 'undefined' && CONFIG.showArenaTitle !== undefined) ? CONFIG.showArenaTitle : false;
  if (!showTitle) {
    return;
  }

  if (!state._titleHeaderCanvas || state._titleHeaderCanvasTheme !== (state.arenaTheme || 'light')) {
    // Prevent Flash of Unstyled Text (FOUT) and visual jumping by waiting for custom fonts
    if (document.fonts) {
      const harutoReady = document.fonts.check('900 42px "Haruto"');
      const glastReady = document.fonts.check('18px "Glast Blitch"');
      if (!harutoReady || !glastReady) {
        document.fonts.load('900 42px "Haruto"');
        document.fonts.load('18px "Glast Blitch"');
        return; // Skip rendering header completely until fonts are fully loaded
      }
    }

    const headerW = CONFIG.canvasWidth || 540;
    const headerH = 170;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = headerW;
    offCanvas.height = headerH;
    const oc = offCanvas.getContext('2d');

    // ── Title Text (rendered once) ────────────────────────────────────────
    const textCX = headerW / 2;
    oc.fillStyle = isDark ? '#ffffff' : '#000000';
    oc.font = '900 42px "Haruto", Arial';
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    oc.strokeStyle = isDark ? '#000000' : '#ffffff';
    oc.lineWidth = 4.5;
    oc.strokeText('Fight of Characters', textCX, 100);
    oc.fillText('Fight of Characters', textCX, 100);

    oc.font = '18px "Glast Blitch", Arial';
    oc.lineWidth = 3.5;
    oc.strokeText('Ball Fight Simulator', textCX, 135);
    oc.fillText('Ball Fight Simulator', textCX, 135);

    offCanvas._theme = state.arenaTheme || 'light';
    state._titleHeaderCanvas = offCanvas;
    state._titleHeaderCanvasTheme = offCanvas._theme;
  }

  // Blit the fully cached title header (text only) in one drawImage call
  // Position it relative to the arena and scale it using CONFIG.internalScale
  const scale = CONFIG.internalScale || 1.0;
  const drawW = state._titleHeaderCanvas.width * scale;
  const drawH = state._titleHeaderCanvas.height * scale;
  
  ctx.save();
  applyCameraToCtx(ctx);
  ctx.drawImage(state._titleHeaderCanvas, centerX - drawW / 2, arena.y - drawH - 10, drawW, drawH);
  
  // The title header banner ("FIGHT OF CHARACTERS") is drawn bright and clear above the arena
  ctx.restore();
}

// ──────────────────────────────────────────
// DOMAIN & ULTIMATE DIM SCREEN OVERLAYS
// (Extracted to ./domainDimOverlays.js)
// ──────────────────────────────────────────
export {
  excludeGojoInfinityFromDim,
  applyDomainArenaVignetteCutout,
  drawPurpleDimScreen,
  drawGojoDomainDimScreen,
  drawRubbickDomainDimScreen,
  drawSukunaDomainDimScreen,
  drawYutaDomainDimScreen,
  drawMahitoDomainDimScreen,
  drawTojiUltimateOverlay,
  drawNanamiOvertimeArenaOverlay,
  loadNanamiOvertimeOverlayImage,
  getNanamiOvertimeOverlayImage,
  drawGenosUltimateArenaOverlay,
  loadGenosUltimateOverlayImage,
  getGenosUltimateOverlayImage,
  drawMahoragaAdaptationDimScreen,
  drawMahoragaWheelArenaOverlay,
  loadMahoragaWheelOverlayImage,
  getMahoragaWheelOverlayImage,
  drawNanamiRatioCritDimScreen,
  drawMahoragaLevel8DimScreen,
  drawSaitamaSeriousPunchDimScreen,
  drawBankaiImpactDimScreen
} from './domainDimOverlays.js';

// ──────────────────────────────────────────
// DRAW — FUEL PICKUPS (Orange Fighter)
// ──────────────────────────────────────────
export function drawFuelPickups() {
  const { ctx, fuelPickups, fighters } = state;
  if (!fuelPickups || fuelPickups.length === 0) return;

  // Only draw fuel pickups if an Orange fighter is currently alive in the arena.
  const hasOrange = fighters && fighters.some(f => f && f.hp > 0 && f._def && f._def.type === 'orange');
  if (!hasOrange) return;

  fuelPickups.forEach(pickup => {
    if (!pickup.active) return;

    ctx.save();

    // Pulsing effect
    const pulse = 0.85 + Math.sin(pickup.pulsePhase) * 0.15;
    const r = pickup.radius * pulse; // base radius for scaling

    // ── Outer glow ──
    const glowGrad = ctx.createRadialGradient(pickup.x, pickup.y, r * 0.6, pickup.x, pickup.y, r * 2.2);
    glowGrad.addColorStop(0, 'rgba(255, 180, 30, 0.5)');
    glowGrad.addColorStop(0.5, 'rgba(255, 120, 0, 0.25)');
    glowGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Battery dimensions ──
    const bw = r * 1.6;   // battery body width (half)
    const bh = r * 1.1;   // battery body height (half)
    const br = r * 0.35;  // corner radius
    const nx = pickup.x;  // center x
    const ny = pickup.y;  // center y

    // ── Battery body (rounded rectangle) ──
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    roundedRect(ctx, nx - bw, ny - bh, bw * 2, bh * 2, br);
    ctx.fill();

    // ── Body metallic gradient overlay ──
    const bodyGrad = ctx.createLinearGradient(nx - bw, ny - bh, nx + bw, ny + bh);
    bodyGrad.addColorStop(0, '#6e6e6e');
    bodyGrad.addColorStop(0.3, '#8a8a8a');
    bodyGrad.addColorStop(0.5, '#b0b0b0');
    bodyGrad.addColorStop(0.7, '#8a8a8a');
    bodyGrad.addColorStop(1, '#5a5a5a');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    roundedRect(ctx, nx - bw + 1.5, ny - bh + 1.5, bw * 2 - 3, bh * 2 - 3, br - 1);
    ctx.fill();

    // ── Positive terminal nub (top) ──
    const nubW = r * 0.35;
    const nubH = r * 0.45;
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    roundedRect(ctx, nx - nubW, ny - bh - nubH, nubW * 2, nubH, r * 0.15);
    ctx.fill();
    // nub highlight
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    roundedRect(ctx, nx - nubW + 1, ny - bh - nubH + 1, nubW * 2 - 2, nubH * 0.55, r * 0.1);
    ctx.fill();

    // ── Fuel level indicator (colored bar inside battery) ──
    const fuelRatio = 0.75; // pickups are always "full" looking
    const barPad = r * 0.25;
    const barX = nx - bw + barPad;
    const barY = ny - bh + barPad;
    const barW = (bw * 2 - barPad * 2) * fuelRatio;
    const barH = bh * 2 - barPad * 2;

    // Bar background (dark empty portion)
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    roundedRect(ctx, barX, barY, bw * 2 - barPad * 2, barH, r * 0.12);
    ctx.fill();

    // Bar fill (green-to-orange gradient = energy)
    const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    barGrad.addColorStop(0, '#4caf50');
    barGrad.addColorStop(0.5, '#ff9800');
    barGrad.addColorStop(1, '#ff5722');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    roundedRect(ctx, barX, barY, barW, barH, r * 0.12);
    ctx.fill();

    // ── Small "F" label on the bar ──
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(r * 0.55)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', nx, ny);

    // ── Battery outline ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundedRect(ctx, nx - bw, ny - bh, bw * 2, bh * 2, br);
    ctx.stroke();

    ctx.restore();
  });
}

// Helper: draw a rounded rectangle path
function roundedRect(ctx, x, y, w, h, r) {
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  const radius = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * Measures text width for fighter display names, accounting for custom corner bracket framing (e.g. 『SHIRO』).
 */
export function measureDecoratedFighterName(ctx, name) {
  if (!name || typeof name !== 'string') return 0;
  const match = name.match(/^(.*?)『(.*?)』(.*)$/);
  if (!match) {
    return ctx.measureText(name).width;
  }
  const prefix = match[1];
  const innerText = match[2];
  const suffix = match[3];

  const prefixW = prefix ? ctx.measureText(prefix).width : 0;
  const innerW = ctx.measureText(innerText).width;
  const suffixW = suffix ? ctx.measureText(suffix).width : 0;

  const fontMatch = (ctx.font || '').match(/(\d+(?:\.\d+)?)px/);
  const fontSize = fontMatch ? parseFloat(fontMatch[1]) : 42;
  const capH = fontSize * 0.84;
  const bracketH = Math.round(capH * 0.48);
  const bracketW = Math.max(5, Math.round(bracketH * 0.58));
  const bracketGap = Math.max(2, Math.round(fontSize * 0.08));

  return prefixW + bracketW + bracketGap + innerW + bracketGap + bracketW + suffixW;
}

/**
 * Draws a fighter's display name. If the name is framed with Japanese corner brackets 『...』 (e.g. 『SHIRO』),
 * it renders authentic No Game No Life / Kuhaku corner brackets calibrated to the reference standard:
 * - Opening bracket 『: anchored at UPPER-LEFT, framing letter crown, height = ~48% of letter cap height.
 * - Closing bracket 』: anchored at LOWER-RIGHT, aligned with baseline, height = ~48% of letter cap height.
 * - Double-line hollow white corner bracket geometry matching the reference.
 */
export function drawDecoratedFighterName(ctx, name, x, y, options = {}) {
  if (!name || typeof name !== 'string') return;
  const match = name.match(/^(.*?)『(.*?)』(.*)$/);

  const textColor = options.color || options.fillColor || ctx.fillStyle || '#FFFFFF';
  ctx.fillStyle = textColor;
  if (options.stroke) {
    ctx.strokeStyle = options.strokeColor || '#000000';
    ctx.lineWidth = (typeof options.strokeWidth === 'number') ? options.strokeWidth : 1.5;
  }

  if (!match) {
    if (options.stroke) {
      ctx.strokeText(name, x, y);
    }
    ctx.fillText(name, x, y);
    return;
  }

  const prefix = match[1];
  const innerText = match[2];
  const suffix = match[3];

  const fontMatch = (ctx.font || '').match(/(\d+(?:\.\d+)?)px/);
  const fontSize = fontMatch ? parseFloat(fontMatch[1]) : 42;

  // Bracket dimensions calibrated to reference standard (short corner marks)
  const innerMetrics = ctx.measureText ? ctx.measureText(innerText) : null;
  const actualAscent = (innerMetrics && Number.isFinite(innerMetrics.actualBoundingBoxAscent) && innerMetrics.actualBoundingBoxAscent > 0)
    ? innerMetrics.actualBoundingBoxAscent
    : (fontSize * 0.84);
  const capH = Math.max(actualAscent, fontSize * 0.84);

  const bracketH = Math.round(capH * 0.48);
  const bracketW = Math.max(5, Math.round(bracketH * 0.58));
  const bracketGap = Math.max(2, Math.round(fontSize * 0.08));

  const prefixW = prefix ? ctx.measureText(prefix).width : 0;
  const innerW = innerMetrics ? (innerMetrics.width || 0) : ctx.measureText(innerText).width;
  const suffixW = suffix ? ctx.measureText(suffix).width : 0;
  const totalW = prefixW + bracketW + bracketGap + innerW + bracketGap + bracketW + suffixW;

  const textAlign = ctx.textAlign || 'left';
  const textBaseline = ctx.textBaseline || 'bottom';

  // Compute horizontal X start anchor
  let curX = x;
  if (textAlign === 'center') {
    curX = x - totalW / 2;
  } else if (textAlign === 'right') {
    curX = x - totalW;
  }

  // Compute vertical Y anchors (letter top & baseline)
  let topY = y;
  let baselineY = y + capH;
  if (textBaseline === 'bottom') {
    baselineY = y;
    topY = y - capH;
  } else if (textBaseline === 'middle') {
    topY = y - capH / 2;
    baselineY = y + capH / 2;
  } else if (textBaseline === 'top') {
    topY = y;
    baselineY = y + capH;
  }

  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;

  // 1. Draw prefix if present
  if (prefix) {
    if (options.stroke) ctx.strokeText(prefix, curX, y);
    ctx.fillText(prefix, curX, y);
    curX += prefixW;
  }

  const leftBracketX = curX;
  curX += bracketW + bracketGap;
  const innerTextX = curX;

  // 2. Draw inner text (e.g. SHIRO)
  if (options.stroke) ctx.strokeText(innerText, innerTextX, y);
  ctx.fillText(innerText, innerTextX, y);
  curX += innerW + bracketGap;

  const rightBracketX = curX;
  curX += bracketW;

  // 3. Draw suffix if present (e.g. WINS!)
  if (suffix) {
    if (options.stroke) ctx.strokeText(suffix, curX, y);
    ctx.fillText(suffix, curX, y);
  }

  // 4. Draw Hollow White Corner Brackets
  const color = options.color || ctx.fillStyle || '#A855F7';
  const strokeW = Math.max(1.2, Math.round(fontSize * 0.035 * 10) / 10);
  const hollowGap = Math.max(1.2, Math.round(fontSize * 0.035 * 10) / 10);
  const armThick = strokeW * 2 + hollowGap;

  const drawCornerL = (bx, by, bw, bh) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    // Outer L
    ctx.beginPath();
    ctx.moveTo(bx + bw, by + strokeW / 2);
    ctx.lineTo(bx + strokeW / 2, by + strokeW / 2);
    ctx.lineTo(bx + strokeW / 2, by + bh);
    ctx.stroke();

    // Inner L
    ctx.beginPath();
    ctx.moveTo(bx + bw, by + armThick - strokeW / 2);
    ctx.lineTo(bx + armThick - strokeW / 2, by + armThick - strokeW / 2);
    ctx.lineTo(bx + armThick - strokeW / 2, by + bh);
    ctx.stroke();

    // End caps
    ctx.beginPath();
    ctx.moveTo(bx + bw, by);
    ctx.lineTo(bx + bw, by + armThick);
    ctx.moveTo(bx, by + bh);
    ctx.lineTo(bx + armThick, by + bh);
    ctx.stroke();

    ctx.restore();
  };

  // Draw Opening Bracket 『 at TOP-LEFT (anchored slightly above letter crown)
  const leftBracketY = topY - Math.max(2, Math.round(fontSize * 0.05));
  drawCornerL(leftBracketX, leftBracketY, bracketW, bracketH);

  // Draw Closing Bracket 』 at BOTTOM-RIGHT (bottom aligned with baseline, rotated 180)
  const rightCenterCX = rightBracketX + bracketW / 2;
  const rightCenterCY = baselineY + 1 - bracketH / 2;
  ctx.save();
  ctx.translate(rightCenterCX, rightCenterCY);
  ctx.rotate(Math.PI);
  drawCornerL(-bracketW / 2, -bracketH / 2, bracketW, bracketH);
  ctx.restore();

  ctx.restore();
}

/**
 * Draws the Match Fighter Names above Top Arena Wall (e.g. "GOJO VS SUKUNA" / "SAITAMA VS GOJO").
 * Rendered on top of dim screens and domain barriers to ensure 100% visibility during ultimates & counters.
 * @param {CanvasRenderingContext2D} ctx - Target canvas context
 * @param {boolean} [alreadyInCameraSpace=false] - Whether camera transform is already applied to ctx
 */
export function drawArenaMatchNames(ctx, alreadyInCameraSpace = false) {
  if (CONFIG.hudHideAll) return;
  if (typeof state === 'undefined' || !state || !state.fighters || state.fighters.length === 0) return;
  if (!ctx) return;
  if (state.gameState !== 'playing' && state.gameState !== 'countdown' && state.gameState !== 'roundEnd' && state.gameState !== 'matchEnd') return;

  const arena = state.arena || CONFIG.arena;
  if (!arena) return;

  const isPrimaryFighter = (f) => Boolean(
    f &&
    !f.isTurret &&
    !f.isMinion &&
    !f.isEndCrystal &&
    !f.isDeployable &&
    !f.isIceWall &&
    !f.isIllusion &&
    !f.isRika &&
    !f.isEvasionMinion &&
    !f.isTransfiguredHuman &&
    !f.isClone &&
    !f.owner &&
    f.type !== 'Turret' &&
    f.type !== 'turret' &&
    f.type !== 'Dispenser' &&
    f.type !== 'dispenser' &&
    !f._def?.isTurret &&
    !f._def?.isMinion
  );

  const mainFighters = state.fighters.filter(isPrimaryFighter);
  if (mainFighters.length === 0) return;

  const isHorizontal = Boolean(typeof state !== 'undefined' && state.viewOrientation === 'horizontal');
  const centerX = isHorizontal ? (state.canvas?.width ? state.canvas.width / 2 : 480) : (arena.x + arena.width / 2);
  const isDark = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode));

  ctx.save();
  // In vertical portrait mode, anchor match names to top arena wall in camera space.
  // In horizontal widescreen mode, HUD names and top wall UI elements remain strictly screen-locked in viewport space.
  if (!alreadyInCameraSpace && !isHorizontal) {
    applyCameraToCtx(ctx);
  } else if (alreadyInCameraSpace && isHorizontal) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // If Top HUD Name Shatter is active, render the natural hanging/falling letter shards
  const isShattered = CONFIG.saitama?.enableHudShatter ? drawTopHudNameShatters(ctx, isDark, arena) : false;
  if (isShattered) {
    ctx.restore();
    return;
  }

  const nameFont = '700 42px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';
  const vsFont = '700 24px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif';

  ctx.font = nameFont;
  ctx.textBaseline = 'bottom';
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = '0.5px';
  }

  const getFighterDisplayName = (f, uppercase = true) => {
    if (!f) return '';
    const charId = f.characterId || f.type || (f._def && (f._def.id || f._def.type));
    const charCfg = (charId && CONFIG && CONFIG[charId]) ? CONFIG[charId] : null;
    const rawName = charCfg?.displayName || charCfg?.name || f.displayName || f.name || f._def?.displayName || f._def?.name || charId || 'P';
    const isSans = Boolean(charId === 'sans' || (typeof rawName === 'string' && rawName.toLowerCase() === 'sans'));
    if (isSans) return 'sans';
    return uppercase ? String(rawName).toUpperCase() : String(rawName);
  };

  const getFighterThemeColor = (f, fallbackColor = '#38BDF8') => {
    if (!f) return fallbackColor;
    const isYuta = Boolean(f.characterId === 'yuta' || f.type === 'yuta' || (f._def && (f._def.id === 'yuta' || f._def.type === 'yuta')));
    if (isYuta) return '#FF1493';
    const charId = f.characterId || f.type || (f._def && (f._def.id || f._def.type));
    const charCfg = (charId && CONFIG && CONFIG[charId]) ? CONFIG[charId] : null;
    let color = charCfg?.themeColor ||
      f.themeColor ||
      f._def?.themeColor ||
      (f.fighterIndex !== undefined && FIGHTER_DEFS && FIGHTER_DEFS[f.fighterIndex] ? FIGHTER_DEFS[f.fighterIndex].themeColor : null) ||
      charCfg?.color ||
      f.color ||
      f._def?.color ||
      (f.fighterIndex !== undefined && FIGHTER_DEFS && FIGHTER_DEFS[f.fighterIndex] ? FIGHTER_DEFS[f.fighterIndex].color : null) ||
      fallbackColor;
    if (typeof color === 'string' && /^[0-9a-fA-F]{3,8}$/.test(color)) {
      color = '#' + color;
    }
    return color;
  };

  const getHudNameColor = (f, fallbackColor) => {
    let color = getFighterThemeColor(f, fallbackColor);
    if (typeof color === 'string' && /^[0-9a-fA-F]{3,8}$/.test(color)) {
      color = '#' + color;
    }
    if (isDark || typeof color !== 'string' || !color.startsWith('#')) return color;

    const hex = color.slice(1);
    const normalized = hex.length === 3
      ? hex.split('').map(channel => channel + channel).join('')
      : (hex.length >= 8 ? hex.slice(0, 6) : hex);
    if (normalized.length !== 6) return color;

    const darken = channel => Math.round(parseInt(channel, 16) * 0.78).toString(16).padStart(2, '0');
    return `#${darken(normalized.slice(0, 2))}${darken(normalized.slice(2, 4))}${darken(normalized.slice(4, 6))}`;
  };

  const is1v2 = (state.mode === 'Boss Battle' || state.mode === GAME_MODES?.BOSS_BATTLE || state.mode === '1v2 Stand Off' || state.mode === '1v2' || state.mode === 'Stand Off 1v2' || state.mode === GAME_MODES?.STAND_OFF_1V2);
  const is2v2 = (state.mode === '2v2' || state.mode === 'Tactical 2v2' || state.mode === GAME_MODES?.TWO_VS_TWO || state.mode === GAME_MODES?.TACTICAL_2V2);
  const is4v4 = (state.mode === '4v4' || state.mode === 'Tactical 4v4' || state.mode === GAME_MODES?.TACTICAL_4V4);
  const isDuel1v1 = (mainFighters.length === 2 && !is2v2 && !is4v4 && !is1v2);

  // In Boss Battle and 1v1 Duel modes, fighter names and healthbars are rendered in DOM (#hudTopContainer).
  // Skip canvas names to prevent duplicate clashing behind the Top HUD.
  if (is1v2 || isDuel1v1) {
    ctx.restore();
    return;
  }

  let team0 = [];
  let team1 = [];

  if (typeof state.getFighterTeam === 'function') {
    mainFighters.forEach(f => {
      const origIdx = state.fighters.indexOf(f);
      const t = state.getFighterTeam(origIdx);
      if (t === 0) team0.push(f);
      else if (t === 1) team1.push(f);
    });
  }

  if (team0.length === 0 && team1.length === 0) {
    if (is2v2 && mainFighters.length >= 4) {
      team0 = [mainFighters[0], mainFighters[1]];
      team1 = [mainFighters[2], mainFighters[3]];
    } else if (mainFighters.length === 2) {
      team0 = [mainFighters[0]];
      team1 = [mainFighters[1]];
    }
  }

  const isTeamMatch = (team0.length > 0 && team1.length > 0 && (team0.length + team1.length === mainFighters.length));
  const team0Data = team0.map(f => ({
    name: getFighterDisplayName(f, true),
    color: getHudNameColor(f, '#38BDF8'),
    fighter: f
  }));

  const team1Data = team1.map(f => ({
    name: getFighterDisplayName(f, true),
    color: getHudNameColor(f, '#F87171'),
    fighter: f
  }));

  const isGrandBattleMode = Boolean(
    state.mode === '3v3v3v3' || state.mode === '4v4' || state.mode === '2v2v2v2' ||
    state.mode === 'Battle Royale 8' || state.mode === 'Grand Battle' ||
    state.mode === '3v3v3v3 Teamfight' || state.mode === '4v4 Grand War' || state.mode === '2v2v2v2 Quad Battle' ||
    (arena && arena.width > 1000)
  );
  const isSideHudHorizontal = isHorizontal && !isGrandBattleMode;

  const drawHorizontalTopWallHud = (leftFighters, rightFighters, leftData, rightData, renderDolls = true) => {
    const sideFontSize = 34;
    const customSideFont = `700 ${sideFontSize}px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif`;
    const stackedSideFont = `700 20px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif`;
    const maxSideW = 176;

    const drawSideColumnNames = (dataArr, x, baseY, align) => {
      // In 1v1 mode (single fighter per side), draw the large top wall flank name above the side card.
      // In multi-fighter modes (e.g. 2v2 or FFA), names are placed directly on each fighter's
      // respective healthbar/skillbar block in the DOM instead of stacking on canvas.
      if (!dataArr || dataArr.length !== 1) return;
      ctx.save();
      ctx.textBaseline = 'top';
      ctx.textAlign = align;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';

      ctx.font = customSideFont;
      const td = dataArr[0];
      const measuredW = measureDecoratedFighterName(ctx, td.name);
      const scale = measuredW > maxSideW ? maxSideW / measuredW : 1.0;
      if (scale < 1.0) {
        ctx.translate(x, baseY);
        ctx.scale(scale, scale);
        ctx.translate(-x, -baseY);
      }
      ctx.fillStyle = td.color;
      drawDecoratedFighterName(ctx, td.name, x, baseY, {
        color: td.color,
        stroke: !isDark,
        strokeWidth: 0.5
      });
      ctx.restore();
    };

    const nameY = arena.y;
    // Player / Team 1 on Left Flank (aligned with top arena wall: left 18px, top y: arena.y)
    drawSideColumnNames(leftData, 18, nameY, 'left');

    // Player / Team 2 on Right Flank (aligned with top arena wall: right 18px / x: 960 - 18, top y: arena.y, right-aligned)
    drawSideColumnNames(rightData, 960 - 18, nameY, 'right');

    // ── Center Top-Wall Round Banner & Win Bullets: [BULLETS] ── [ROUND BANNER] ── [BULLETS] ──
    const isFfaMatch = Boolean(
      state.mode === 'FFA' || state.mode === 'Tactical FFA' || state.mode === 'FFA 4-Player' ||
      (typeof GAME_MODES !== 'undefined' && (state.mode === GAME_MODES.FFA || state.mode === GAME_MODES.TACTICAL_FFA))
    );

    if (!isFfaMatch) {
      const roundNum = state.roundNum || 1;
      let roundText = 'ROUND 1';
      if (roundNum === 2) {
        roundText = 'ROUND 2';
      } else if (roundNum >= 3) {
        roundText = 'FINAL ROUND';
      }

      ctx.save();
      const bannerFont = '700 11px "Press Start 2P", "Silkscreen", monospace';
      ctx.font = bannerFont;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
      const textMetrics = ctx.measureText(roundText);
      const textW = textMetrics.width;

      const pillPadX = 14;
      const pillW = Math.max(92, Math.round(textW + pillPadX * 2));
      const pillH = 22;
      const pillRadius = 6;
      const pillX = Math.round(centerX - pillW / 2);
      const pillY = Math.round(arena.y - pillH / 2);

      // ── Top-Wall Win Bullets ──
      const isTwoFighterMatch = (leftFighters.length === 1 && rightFighters.length === 1);
      if (isTwoFighterMatch) {
        const fighter0 = leftFighters[0];
        const fighter1 = rightFighters[0];
        const p1Index = state.fighters ? state.fighters.indexOf(fighter0) : 0;
        const p2Index = state.fighters ? state.fighters.indexOf(fighter1) : 1;
        const p1Wins = (p1Index >= 0 && state.scores ? state.scores[p1Index] : 0) || 0;
        const p2Wins = (p2Index >= 0 && state.scores ? state.scores[p2Index] : 0) || 0;
        const maxBullets = 2;
        const bulletR = 5.5;
        const bulletGap = 16;
        const bulletOffsetFromPill = 20;

        const drawTopWallBullet = (bx, filled, fighterColor) => {
          ctx.beginPath();
          ctx.arc(bx, arena.y, bulletR, 0, Math.PI * 2);
          if (filled) {
            ctx.fillStyle = fighterColor || '#FFD700';
            ctx.strokeStyle = isDark ? '#FFFFFF' : '#000000';
            ctx.lineWidth = 1.8;
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillStyle = isDark ? '#141824' : '#FFFAF0';
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.45)' : '#000000';
            ctx.lineWidth = 1.8;
            ctx.fill();
            ctx.stroke();
          }
        };

        // P1 Bullets (Left side of Pill): Bullet 0 (outer left), Bullet 1 (inner left)
        const p1Color = leftData[0]?.color || '#FF4D4D';
        for (let i = 0; i < maxBullets; i++) {
          const bx = pillX - bulletOffsetFromPill - (maxBullets - 1 - i) * bulletGap;
          const filled = i < p1Wins;
          drawTopWallBullet(bx, filled, p1Color);
        }

        // P2 Bullets (Right side of Pill): Bullet 0 (inner right), Bullet 1 (outer right)
        const p2Color = rightData[0]?.color || '#38BDF8';
        for (let i = 0; i < maxBullets; i++) {
          const bx = pillX + pillW + bulletOffsetFromPill + i * bulletGap;
          const filled = i < p2Wins;
          drawTopWallBullet(bx, filled, p2Color);
        }
      } else if (isTeamMatch && state.teamScores) {
        // Team Match Bullets (2v2 etc)
        const team0Wins = state.teamScores[0] || 0;
        const team1Wins = state.teamScores[1] || 0;
        const maxBullets = 2;
        const bulletR = 5.5;
        const bulletGap = 16;
        const bulletOffsetFromPill = 20;

        const drawTopWallBullet = (bx, filled, color) => {
          ctx.beginPath();
          ctx.arc(bx, arena.y, bulletR, 0, Math.PI * 2);
          if (filled) {
            ctx.fillStyle = color || '#FFD700';
            ctx.strokeStyle = isDark ? '#FFFFFF' : '#000000';
            ctx.lineWidth = 1.8;
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillStyle = isDark ? '#141824' : '#FFFAF0';
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.45)' : '#000000';
            ctx.lineWidth = 1.8;
            ctx.fill();
            ctx.stroke();
          }
        };

        for (let i = 0; i < maxBullets; i++) {
          const bx = pillX - bulletOffsetFromPill - (maxBullets - 1 - i) * bulletGap;
          const filled = i < team0Wins;
          drawTopWallBullet(bx, filled, leftData[0]?.color || '#FF4D4D');
        }

        for (let i = 0; i < maxBullets; i++) {
          const bx = pillX + pillW + bulletOffsetFromPill + i * bulletGap;
          const filled = i < team1Wins;
          drawTopWallBullet(bx, filled, rightData[0]?.color || '#38BDF8');
        }
      }

      // Pill Background
      ctx.fillStyle = isDark ? '#141824' : '#FFFAF0';
      ctx.strokeStyle = isDark ? '#FFD700' : '#000000';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pillX, pillY, pillW, pillH, pillRadius);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();
      ctx.stroke();

      // Text inside pill
      ctx.fillStyle = isDark ? '#FFD700' : '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(roundText, centerX, arena.y + 0.5);
      ctx.restore();
    }

    // ── Horizontal Side Character Dolls (Occupying Space Below Left & Right HUDs in 1v1 Mode) ──
    const shouldRenderDolls = renderDolls && leftData.length === 1 && rightData.length === 1 && leftFighters[0] && rightFighters[0];
    if (shouldRenderDolls) {
      drawHorizontalFighterDolls(ctx, leftFighters[0], rightFighters[0], leftData[0], rightData[0], arena);
    }
  };

  // If in Horizontal Side HUD mode, render names on the flanks above side cards
  if (isSideHudHorizontal) {
    if (isTeamMatch) {
      drawHorizontalTopWallHud(team0, team1, team0Data, team1Data);
    } else {
      const leftFighters = mainFighters.filter((_, idx) => idx % 2 === 0);
      const rightFighters = mainFighters.filter((_, idx) => idx % 2 === 1);
      const leftData = leftFighters.map(f => ({
        name: getFighterDisplayName(f, true),
        color: getHudNameColor(f, '#38BDF8'),
        fighter: f
      }));
      const rightData = rightFighters.map(f => ({
        name: getFighterDisplayName(f, true),
        color: getHudNameColor(f, '#F87171'),
        fighter: f
      }));
      drawHorizontalTopWallHud(leftFighters, rightFighters, leftData, rightData);
    }
    ctx.restore();
    return;
  }

  // ── Vertical Mode / Non-Side-HUD Centered Names Rendering ──
  if (isTeamMatch) {
    const hasStackedTeam = team0.length > 1 || team1.length > 1;
    const nameFontSize = hasStackedTeam ? 44 : 60;
    const customFighterFont = `700 ${nameFontSize}px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif`;
    const customVsFont = `700 ${hasStackedTeam ? 22 : 24}px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif`;

    let wTeam0 = 0;
    team0Data.forEach(td => {
      ctx.font = customFighterFont;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
      wTeam0 = Math.max(wTeam0, measureDecoratedFighterName(ctx, td.name));
    });

    let wTeam1 = 0;
    team1Data.forEach(td => {
      ctx.font = customFighterFont;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
      wTeam1 = Math.max(wTeam1, measureDecoratedFighterName(ctx, td.name));
    });

    ctx.font = customVsFont;
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = '0.5px';
    }
    const vsText = 'vs';
    const wVs = ctx.measureText(vsText).width;

    const pad = 14;
    const totalW = wTeam0 + pad + wVs + pad + wTeam1;
    const maxW = arena.width - 16;
    const scale = totalW > maxW ? maxW / totalW : 1.0;

    const bottomY = arena.y - 12;
    const lineSpacing = hasStackedTeam ? 34 : 0;
    const topY = bottomY - lineSpacing;
    const midY = (topY + bottomY) / 2;

    ctx.save();
    if (scale < 1.0) {
      const scaleAnchorY = hasStackedTeam ? midY : bottomY;
      ctx.translate(centerX, scaleAnchorY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -scaleAnchorY);
    }

    const startX = centerX - totalW / 2;
    const vsX = startX + wTeam0 + pad;
    const team1X = vsX + wVs + pad;

    ctx.textAlign = 'left';
    const drawHudName = (td, x, y) => {
      ctx.font = customFighterFont;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
      ctx.fillStyle = td.color;
      drawDecoratedFighterName(ctx, td.name, x, y, {
        color: td.color,
        stroke: !isDark,
        strokeWidth: 0.5
      });
    };

    // Render Team 0 (Left Side)
    if (team0Data.length === 1) {
      drawHudName(team0Data[0], startX, hasStackedTeam ? midY : bottomY);
    } else {
      drawHudName(team0Data[0], startX, topY);
      drawHudName(team0Data[1], startX, bottomY);
    }

    // Render Center "vs"
    ctx.font = customVsFont;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
    ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
    ctx.fillText(vsText, vsX, (hasStackedTeam ? midY : bottomY) - 1.5);

    // Render Team 1 (Right Side)
    if (team1Data.length === 1) {
      drawHudName(team1Data[0], team1X, hasStackedTeam ? midY : bottomY);
    } else {
      drawHudName(team1Data[0], team1X, topY);
      drawHudName(team1Data[1], team1X, bottomY);
    }

    ctx.restore();
  } else {
    const fighterData = mainFighters.map(f => ({
      name: getFighterDisplayName(f, true),
      color: getHudNameColor(f, '#F8FAFC')
    }));

    if (fighterData.length === 3) {
      // 3-Player Vertical FFA Triangular Arrangement:
      //         NAME (P1)
      //            VS
      //    NAME (P2)   NAME (P3)
      const nameFontSize = 26;
      const customFighterFont = `700 ${nameFontSize}px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif`;
      const customVsFont = `700 18px "Silkscreen", "Press Start 2P", "Rajdhani", monospace, sans-serif`;

      const bottomY = arena.y - 12;
      const topY = bottomY - 50;
      const vsY = Math.round((topY + bottomY) / 2) - 1;

      ctx.save();
      ctx.font = customFighterFont;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
      ctx.textBaseline = 'bottom';

      // 1. Top Centered Fighter (Player 1) - Uniform Fixed Font Size
      ctx.save();
      ctx.textAlign = 'center';
      drawDecoratedFighterName(ctx, fighterData[0].name, centerX, topY, {
        color: fighterData[0].color,
        stroke: !isDark,
        strokeWidth: 1.5
      });
      ctx.restore();

      // 2. Center "VS" Emblem
      ctx.save();
      ctx.font = customVsFont;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark ? '#94A3B8' : '#334155';
      if (!isDark) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.0;
        ctx.strokeText('VS', centerX, vsY);
      }
      ctx.fillText('VS', centerX, vsY);
      ctx.restore();

      // 3. Bottom Left Fighter (Player 2) & Bottom Right Fighter (Player 3) - Left & Right Aligned
      const leftX = arena.x + 6;
      const rightX = arena.x + arena.width - 6;

      // Player 2 (Left - aligned to left)
      ctx.save();
      ctx.textAlign = 'left';
      drawDecoratedFighterName(ctx, fighterData[1].name, leftX, bottomY, {
        color: fighterData[1].color,
        stroke: !isDark,
        strokeWidth: 1.5
      });
      ctx.restore();

      // Player 3 (Right - aligned to right)
      ctx.save();
      ctx.textAlign = 'right';
      drawDecoratedFighterName(ctx, fighterData[2].name, rightX, bottomY, {
        color: fighterData[2].color,
        stroke: !isDark,
        strokeWidth: 1.5
      });
      ctx.restore();

      ctx.restore();
    } else {
      // Multi-fighter FFA fallback: horizontal row joined with "vs"
      const pad = 10;
      const vsText = 'vs';
      const textY = arena.y - 12;

      let totalW = 0;
      fighterData.forEach((fd, i) => {
        ctx.font = nameFont;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
        totalW += measureDecoratedFighterName(ctx, fd.name);
        if (i < fighterData.length - 1) {
          ctx.font = vsFont;
          if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
          totalW += pad + ctx.measureText(vsText).width + pad;
        }
      });

      const maxW = arena.width - 16;
      const scale = totalW > maxW ? maxW / totalW : 1.0;
      ctx.save();
      ctx.translate(centerX, textY);
      ctx.scale(scale, 1.0);
      ctx.translate(-centerX, -textY);

      let startX = centerX - totalW / 2;
      ctx.textAlign = 'left';

      fighterData.forEach((fd, i) => {
        ctx.font = nameFont;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
        ctx.fillStyle = fd.color;
        drawDecoratedFighterName(ctx, fd.name, startX, textY, {
          color: fd.color,
          stroke: !isDark,
          strokeWidth: 1.5
        });
        startX += measureDecoratedFighterName(ctx, fd.name);

        if (i < fighterData.length - 1) {
          startX += pad;
          ctx.font = vsFont;
          if ('letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
          ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
          ctx.fillText(vsText, startX, textY - 1.5);
          startX += ctx.measureText(vsText).width + pad;
        }
      });
      ctx.restore();
    }
  }

  ctx.restore();
}


