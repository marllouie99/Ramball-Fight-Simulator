// ─────────────────────────────────────────────
// HORIZONTAL FIGHTER DOLL RENDERER
// Renders animated / standing pixel-art character dolls in the space below
// the left and right side HUD cards during Horizontal Mode battles.
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

// Image cache for doll sprite sheets and static skin assets
const _dollImageCache = new Map();

/**
 * Loads and caches an image asset by source URL.
 * @param {string} src
 * @returns {HTMLImageElement|null}
 */
export function getDollImage(src) {
  if (!src) return null;
  let img = _dollImageCache.get(src);
  if (img) return img;

  if (typeof Image !== 'undefined') {
    img = new Image();
    img.src = src;
    _dollImageCache.set(src, img);
    return img;
  }
  return null;
}

// Pre-load common doll assets eagerly
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  // Add eager preloads here when new doll assets are integrated
}

/**
 * Known character doll metadata & sprite sheet configurations.
 */
export const DOLL_METADATA = {
  toji: {
    src: 'Assets/model/toji/Toji-skin.png',
    type: 'static',
    drawW: 155,
    drawH: 155,
    facingRight: false,
  },
  yuji: {
    src: 'Assets/model/yuji/Yuji-SKIN.png',
    type: 'static',
    drawW: 155,
    drawH: 155,
    facingRight: false,
  },
  power: {
    src: 'Assets/model/power/POWER-MODEL-SKIN.png',
    type: 'static',
    drawW: 155,
    drawH: 155,
    facingRight: false,
  },
  reze: {
    src: 'Assets/model/reze/REZE-MODEL-SKIN.png',
    type: 'static',
    drawW: 155,
    drawH: 155,
    facingRight: false,
  },
  nanami: {
    src: 'Assets/model/nanami/Nanami-PIXEL-SKIN.png',
    type: 'static',
    drawW: 155,
    drawH: 155,
    facingRight: false,
  },
  tanjiro: {
    src: 'Assets/model/tanjiro/Tanjiro-PIXEL-SKIN.png',
    type: 'static',
    drawW: 155,
    drawH: 155,
    facingRight: false,
  },
  johnWick: {
    src: 'Assets/model/johnWick/Johnwick-pixel-skin.png',
    type: 'static',
    drawW: 155,
    drawH: 155,
    facingRight: false,
  },
  ichigo: {
    src: 'Assets/model/ichigo/ichigo-shikai-skin.png',
    type: 'static',
    drawW: 155,
    drawH: 155,
    facingRight: false,
  },
  yuta: {
    src: 'Assets/model/yuta/Yuta-Pixel-Skin.png',
    type: 'static',
    drawW: 155,
    drawH: 155,
    facingRight: false,
  },
};

/**
 * Resolves the doll metadata for a given fighter entity or character config.
 * @param {object} fighter
 * @param {object} [fighterData]
 * @returns {object|null}
 */
function resolveDollMeta(fighter, fighterData) {
  if (!fighter && !fighterData) return null;
  const rawId = fighter?.characterId || fighter?.type || fighter?._def?.id || fighter?._def?.type || fighter?.name || fighterData?.name || fighterData?.characterId || '';
  const charId = String(rawId).toLowerCase().trim();
  
  // 1. Direct registry lookup
  if (DOLL_METADATA[charId]) {
    return DOLL_METADATA[charId];
  }

  // Normalized key lookup (e.g. "john wick" -> "johnwick")
  const normalizedId = charId.replace(/[^a-z0-9]/g, '');
  if (DOLL_METADATA[normalizedId]) {
    return DOLL_METADATA[normalizedId];
  }
  for (const key of Object.keys(DOLL_METADATA)) {
    if (key.toLowerCase() === normalizedId || (normalizedId.length >= 3 && normalizedId.includes(key.toLowerCase()))) {
      return DOLL_METADATA[key];
    }
  }

  // 2. Character config assets lookup
  const cfg = (CONFIG && (CONFIG[charId] || CONFIG[normalizedId])) ? (CONFIG[charId] || CONFIG[normalizedId]) : null;
  if (cfg?.assets?.doll) {
    return {
      src: cfg.assets.doll,
      type: 'spritesheet',
      cols: 3,
      rows: 1,
      frames: 3,
      frameW: 512,
      frameH: 458,
      ticksPerFrame: 10,
      drawW: 200,
      drawH: 200,
      facingRight: true,
      sequence: [0, 1, 2, 1],
      frameData: [
        { sx: 0,    sy: 0, sw: 512, sh: 458, footX: 217.3, footY: 457 },
        { sx: 512,  sy: 0, sw: 512, sh: 458, footX: 217.1, footY: 457 },
        { sx: 1024, sy: 0, sw: 512, sh: 458, footX: 215.3, footY: 457 },
      ],
    };
  }

  return null;
}

/**
 * Renders a single fighter doll below the side HUD.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter
 * @param {object} fighterData
 * @param {'left'|'right'} side
 * @param {object} arena
 * @param {number} tick
 * @param {boolean} isDark
 */
function drawSingleFighterDoll(ctx, fighter, fighterData, side, arena, tick, isDark) {
  if (!fighter && !fighterData) return;

  const centerX = side === 'left' ? 118 : (960 - 118);
  const baselineY = Math.round(arena.y + arena.height - 4); // ~466px

  const isDead = Boolean(fighter?.hp !== undefined && fighter.hp <= 0);
  const isHit = Boolean(fighter?.hitStunTimer && fighter.hitStunTimer > 0);
  const phase = side === 'left' ? 0 : Math.PI * 0.5;

  const dollMeta = resolveDollMeta(fighter, fighterData);
  if (!dollMeta) return;

  const isSpriteSheet = dollMeta.type === 'spritesheet';

  // For static skins, apply gentle synthetic breathing bounce; for sprite sheets, the frames themselves provide the natural inhale/exhale
  const bounceY = (isDead || isSpriteSheet) ? 0 : Math.sin(tick * 0.08 + phase) * 2.0;
  const shakeX = isHit ? (Math.sin(tick * 0.8) * 3.5) : 0;

  // 1. Floor Shadow Ellipse
  ctx.save();
  ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.20)';
  ctx.beginPath();
  ctx.ellipse(centerX + shakeX, baselineY, 44, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Resolve Doll Asset
  const img = dollMeta ? getDollImage(dollMeta.src) : null;

  ctx.save();
  ctx.translate(centerX + shakeX, baselineY + bounceY);

  // Direction: P1 (left) faces right towards center; P2 (right) faces left towards center
  const isFacingRight = dollMeta ? dollMeta.facingRight : true;
  const scaleX = side === 'left' ? (isFacingRight ? 1 : -1) : (isFacingRight ? -1 : 1);
  ctx.scale(scaleX, 1);

  if (isDead) {
    ctx.globalAlpha = 0.55;
  }

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false; // Preserve authentic pixel art fidelity

    if (isSpriteSheet) {
      const seq = dollMeta.sequence || [0, 1, 2, 3, 4, 5];
      const frameCount = seq.length;
      const tpf = dollMeta.ticksPerFrame || 9;
      const seqIndex = isDead ? 0 : Math.floor((tick / tpf) % frameCount);
      const frameIdx = seq[seqIndex];
      const fd = dollMeta.frameData ? dollMeta.frameData[frameIdx] : null;

      const fw = fd ? fd.sw : (dollMeta.frameW || 512);
      const fh = fd ? fd.sh : (dollMeta.frameH || 512);
      const sx = fd ? fd.sx : ((frameIdx % (dollMeta.cols || 3)) * fw);
      const sy = fd ? fd.sy : (Math.floor(frameIdx / (dollMeta.cols || 3)) * fh);

      const targetHeight = dollMeta.drawH || 200;
      const baseFrameHeight = dollMeta.targetFrameH || dollMeta.frameH || fh;
      const scale = targetHeight / baseFrameHeight;

      const dw = fw * scale;
      const dh = fh * scale;

      const footX = fd ? fd.footX : fw / 2;
      const footY = fd ? fd.footY : fh;
      const drawX = -footX * scale;
      const drawY = -footY * scale;

      ctx.drawImage(
        img,
        sx, sy, fw, fh,
        drawX, drawY,
        dw, dh
      );
    } else {
      // Static doll / skin PNG
      const dw = dollMeta.drawW || 155;
      const dh = dollMeta.drawH || 155;
      ctx.drawImage(img, -dw / 2, -dh, dw, dh);
    }
  } else if (typeof fighter.drawBody === 'function') {
    // Procedural fighter skin model fallback
    ctx.save();
    const modelScale = 2.4;
    ctx.scale(modelScale, modelScale);
    ctx.translate(0, -fighter.r * 1.1);
    fighter.drawBody(ctx);
    ctx.restore();
  } else {
    // Elegant fallback circular avatar with theme color aura
    const themeColor = fighterData?.color || '#38BDF8';
    ctx.beginPath();
    ctx.arc(0, -45, 36, 0, Math.PI * 2);
    ctx.fillStyle = themeColor;
    ctx.fill();
    ctx.strokeStyle = isDark ? '#FFFFFF' : '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Main export: Draws left and right fighter dolls in horizontal 1v1 / match layout.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fighter0
 * @param {object} fighter1
 * @param {object} fighter0Data
 * @param {object} fighter1Data
 * @param {object} arena
 */
export function drawHorizontalFighterDolls(ctx, fighter0, fighter1, fighter0Data, fighter1Data, arena) {
  if (!ctx || !arena) return;
  if (!fighter0 && !fighter1) return;

  const isDark = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode));
  // Continuous 60fps time-based tick for fluid animation cycling
  const tick = Math.floor((typeof performance !== 'undefined' ? performance.now() : Date.now()) / (1000 / 60));

  // Render Left Doll (Player 1 / Team 0)
  if (fighter0) {
    drawSingleFighterDoll(ctx, fighter0, fighter0Data, 'left', arena, tick, isDark);
  }

  // Render Right Doll (Player 2 / Team 1)
  if (fighter1) {
    drawSingleFighterDoll(ctx, fighter1, fighter1Data, 'right', arena, tick, isDark);
  }
}
