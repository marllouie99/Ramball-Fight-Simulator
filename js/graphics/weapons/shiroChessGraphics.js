// ─────────────────────────────────────────────
// SHIRO CHESS GRAPHICS & WEAPONS RENDERER
// Living Chess Troops, Disboard Floor Grid, & Vector Beams
// Adheres strictly to Repository Rules:
// - Rule 11: Zero ctx.shadowBlur / ctx.shadowColor
// - Rule 26: Clean concentric shockwave bands (Anti-cobweb standard)
// ─────────────────────────────────────────────

import { state, triggerGlobalScreenShake } from '../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../particles/sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

// Precomputed 8x8 tile assembly sequence normalized [0.0, 0.75]
// Center 4 tiles (d4, d5, e4, e5) plant first, followed by concentric expanding waves
const _CHESS_TILE_ASSEMBLE_ORDER = [];
for (let r = 0; r < 8; r++) {
  _CHESS_TILE_ASSEMBLE_ORDER[r] = [];
  for (let c = 0; c < 8; c++) {
    const dist = Math.hypot(c - 3.5, r - 3.5); // ~0.707 to ~4.95
    const maxDist = Math.hypot(3.5, 3.5);     // ~4.95
    const normDist = dist / maxDist;          // 0.0 -> 1.0
    const angle = Math.atan2(r - 3.5, c - 3.5);
    const normAngle = (angle + Math.PI) / (2 * Math.PI); // 0.0 -> 1.0
    // Primary radial wavefront with slight spiral sweep for organic digital assembly
    const rawOrder = normDist * 0.72 + normAngle * 0.18 + (((c * 3 + r * 7) % 5) * 0.02);
    _CHESS_TILE_ASSEMBLE_ORDER[r][c] = rawOrder * 0.75; // Clamped to [0.0, 0.75]
  }
}

/**
 * Draws the illuminated 8x8 Disboard Virtual Chessboard on the arena floor matching the iconic No Game No Life anime theme.
 * Light Tiles: Pastel Digital Mint Green (#74E798 / rgb(116, 231, 152))
 * Dark Tiles: Vibrant Deep Cobalt Blue (#3B5BDB / rgb(59, 91, 219))
 * Features: 1-by-1 tile assembly/planting animation, horizontal CRT projector static, rolling hologram scan-beam,
 * console screen vignette, and authentic retro CRT TV / Console Power-Off Shutdown sequence when no active troops remain.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} arena
 * @param {number} alpha - Opacity [0.0, 1.0]
 * @param {number} assembleProgress - Assembly progression [0.0, 1.0]
 * @param {number} shutdownProgress - CRT TV / Console Shutdown progression [0.0, 1.0]
 */
export function drawDisboardChessboard(ctx, arena, alpha = 1.0, assembleProgress = 1.0, shutdownProgress = 0.0) {
  if (!arena || alpha <= 0.01) return;

  const cols = 8;
  const rows = 8;
  const tileW = arena.width / cols;
  const tileH = arena.height / rows;

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1.0, alpha));
  ctx.translate(arena.x, arena.y);

  const cx = arena.width / 2;
  const cy = arena.height / 2;
  const isShuttingDown = (shutdownProgress > 0 && shutdownProgress <= 1.0);

  let scaleX = 1.0;
  let scaleY = 1.0;

  if (isShuttingDown) {
    if (shutdownProgress < 0.45) {
      // Phase 1: Vertical squash toward horizontal center line
      const t = shutdownProgress / 0.45;
      scaleY = Math.max(0.002, Math.pow(1.0 - t, 2.5));
      scaleX = 1.0 + Math.sin(t * Math.PI) * 0.08;
    } else if (shutdownProgress < 0.80) {
      // Phase 2: Horizontal collapse from line into central phosphor dot
      const t = (shutdownProgress - 0.45) / 0.35;
      scaleY = 0.002;
      scaleX = Math.max(0.004, Math.pow(1.0 - t, 2.2));
    } else {
      // Phase 3: Total board content collapsed
      scaleX = 0;
      scaleY = 0;
    }
  }

  // 1. Checkered Tiles & Console Scanlines (with CRT squash transform if shutting down)
  if (scaleX > 0 && scaleY > 0) {
    ctx.save();
    if (isShuttingDown) {
      ctx.translate(cx, cy);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-cx, -cy);
    }

    const LIGHT_TILE = '#74E798'; // Pastel Digital Mint Green (#74E798)
    const DARK_TILE = '#3B5BDB';  // Vibrant Deep Cobalt Royal Blue (#3B5BDB)
    const isFullyAssembled = (assembleProgress >= 1.0 && !isShuttingDown);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isLight = (r + c) % 2 === 0;
        const tileStart = _CHESS_TILE_ASSEMBLE_ORDER[r][c];
        const tileDuration = 0.25;

        if (!isFullyAssembled && assembleProgress < tileStart) {
          // Holographic wireframe placeholder before tile is assembled
          ctx.strokeStyle = isLight
            ? 'rgba(116, 231, 152, 0.12)'
            : 'rgba(59, 91, 219, 0.14)';
          ctx.lineWidth = 1;
          ctx.strokeRect(c * tileW + 1, r * tileH + 1, tileW - 2, tileH - 2);
          continue;
        }

        let scale = 1.0;
        let dropY = 0;
        let snapFlash = 0;

        if (!isFullyAssembled && !isShuttingDown) {
          const localP = Math.min(1.0, (assembleProgress - tileStart) / tileDuration);
          // Cubic ease out for crisp digital landing
          const ease = 1.0 - Math.pow(1.0 - localP, 3);
          scale = 0.35 + ease * 0.65;
          dropY = (1.0 - ease) * -24; // Descends 24px down into arena floor
          snapFlash = Math.sin(localP * Math.PI); // Radiant laser snap flash on impact
        }

        ctx.save();
        ctx.translate(c * tileW + tileW / 2, r * tileH + tileH / 2 + dropY);
        if (scale !== 1.0) {
          ctx.scale(scale, scale);
        }

        // Tile fill
        ctx.fillStyle = isLight ? LIGHT_TILE : DARK_TILE;
        ctx.fillRect(-tileW / 2, -tileH / 2, tileW, tileH);

        // Clean tile seam joint stroke
        ctx.strokeStyle = isLight
          ? 'rgba(255, 255, 255, 0.28)'
          : 'rgba(30, 58, 138, 0.40)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-tileW / 2, -tileH / 2, tileW, tileH);

        // Holographic snap flash & neon bracket glow on landing
        if (snapFlash > 0.05) {
          // Glowing laser perimeter
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * snapFlash})`;
          ctx.lineWidth = 2.4;
          ctx.strokeRect(-tileW / 2, -tileH / 2, tileW, tileH);

          // Core holographic wash
          ctx.fillStyle = `rgba(224, 242, 254, ${0.40 * snapFlash})`;
          ctx.fillRect(-tileW / 2, -tileH / 2, tileW, tileH);

          // Tactical 4-corner snap brackets
          const bLen = 8;
          ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 * snapFlash})`;
          ctx.lineWidth = 2.8;

          // Top-Left
          ctx.beginPath();
          ctx.moveTo(-tileW / 2 + 1, -tileH / 2 + 1 + bLen);
          ctx.lineTo(-tileW / 2 + 1, -tileH / 2 + 1);
          ctx.lineTo(-tileW / 2 + 1 + bLen, -tileH / 2 + 1);
          ctx.stroke();

          // Top-Right
          ctx.beginPath();
          ctx.moveTo(tileW / 2 - 1 - bLen, -tileH / 2 + 1);
          ctx.lineTo(tileW / 2 - 1, -tileH / 2 + 1);
          ctx.lineTo(tileW / 2 - 1, -tileH / 2 + 1 + bLen);
          ctx.stroke();

          // Bottom-Left
          ctx.beginPath();
          ctx.moveTo(-tileW / 2 + 1, tileH / 2 - 1 - bLen);
          ctx.lineTo(-tileW / 2 + 1, tileH / 2 - 1);
          ctx.lineTo(-tileW / 2 + 1 + bLen, tileH / 2 - 1);
          ctx.stroke();

          // Bottom-Right
          ctx.beginPath();
          ctx.moveTo(tileW / 2 - 1 - bLen, tileH / 2 - 1);
          ctx.lineTo(tileW / 2 - 1, tileH / 2 - 1);
          ctx.lineTo(tileW / 2 - 1, tileH / 2 - 1 - bLen);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // High-Density Horizontal CRT Phosphor Scanline Mesh (Console Screen Effect)
    const scanShift = (now * 14) % 3;
    ctx.fillStyle = 'rgba(10, 18, 40, 0.08)';
    for (let y = scanShift; y < arena.height; y += 3) {
      ctx.fillRect(0, y, arena.width, 1.2);
    }

    // Dynamic Rolling Projector Beam Sweep (Slow vertical holographic roll)
    const beamY = (now * 75) % (arena.height + 60) - 30;
    const beamGrad = ctx.createLinearGradient(0, beamY - 25, 0, beamY + 25);
    beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.00)');
    beamGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.14)');
    beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0.00)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(0, Math.max(0, beamY - 25), arena.width, Math.min(arena.height, 50));

    // Secondary fine laser scanline at beam apex
    if (beamY >= 0 && beamY <= arena.height) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(0, beamY, arena.width, 1.5);
    }

    // Horizontal Projector Static Interference & Signal Noise Bars
    const seed = Math.floor(now * 18);
    const staticCount = 6;
    for (let i = 0; i < staticCount; i++) {
      const pseudoRand1 = Math.sin(seed * 11.13 + i * 7.7) * 10000;
      const norm1 = pseudoRand1 - Math.floor(pseudoRand1);
      const pseudoRand2 = Math.sin(seed * 23.41 + i * 13.9) * 10000;
      const norm2 = pseudoRand2 - Math.floor(pseudoRand2);
      const pseudoRand3 = Math.sin(seed * 37.89 + i * 5.3) * 10000;
      const norm3 = pseudoRand3 - Math.floor(pseudoRand3);

      const lineY = Math.floor(norm1 * arena.height);
      const lineX = Math.floor(norm2 * (arena.width * 0.4));
      const lineW = Math.floor(60 + norm3 * (arena.width * 0.65));
      const lineH = norm2 > 0.8 ? 2 : 1;
      const isBright = norm3 > 0.5;

      ctx.fillStyle = isBright
        ? `rgba(255, 255, 255, ${0.08 + norm2 * 0.12})`
        : `rgba(56, 189, 248, ${0.10 + norm1 * 0.14})`;
      ctx.fillRect(lineX, lineY, lineW, lineH);
    }

    // Console / Projector CRT Screen Vignette (Edge Shading)
    const lrGrad = ctx.createLinearGradient(0, 0, arena.width, 0);
    lrGrad.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
    lrGrad.addColorStop(0.06, 'rgba(15, 23, 42, 0.00)');
    lrGrad.addColorStop(0.94, 'rgba(15, 23, 42, 0.00)');
    lrGrad.addColorStop(1, 'rgba(15, 23, 42, 0.22)');
    ctx.fillStyle = lrGrad;
    ctx.fillRect(0, 0, arena.width, arena.height);

    const tbGrad = ctx.createLinearGradient(0, 0, 0, arena.height);
    tbGrad.addColorStop(0, 'rgba(15, 23, 42, 0.20)');
    tbGrad.addColorStop(0.06, 'rgba(15, 23, 42, 0.00)');
    tbGrad.addColorStop(0.94, 'rgba(15, 23, 42, 0.00)');
    tbGrad.addColorStop(1, 'rgba(15, 23, 42, 0.20)');
    ctx.fillStyle = tbGrad;
    ctx.fillRect(0, 0, arena.width, arena.height);

    // Outer Perimeter Glowing Console Screen Frame
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3.0;
    ctx.strokeRect(0, 0, arena.width, arena.height);

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(1.5, 1.5, arena.width - 3, arena.height - 3);

    ctx.restore();
  }

  // 2. Retro CRT TV / Game Console Power-Off Shutdown Laser & Phosphor FX
  if (isShuttingDown) {
    // Phase 1 & 2: Blinding Horizontal Phosphor Laser Line
    if (shutdownProgress < 0.80) {
      const lineW = arena.width * scaleX;
      const startX = cx - lineW / 2;
      const t = shutdownProgress < 0.45 ? (shutdownProgress / 0.45) : 1.0;

      // Wide outer cyan plasma wash
      const glowH = 18 * (1.0 - t * 0.4) + 4;
      ctx.fillStyle = `rgba(56, 189, 248, ${0.75 * (1.0 - shutdownProgress * 0.35)})`;
      ctx.fillRect(startX, cy - glowH / 2, lineW, glowH);

      // Digital mint inner plasma band
      const innerH = 6 * (1.0 - t * 0.3) + 2;
      ctx.fillStyle = `rgba(116, 231, 152, ${0.85 * (1.0 - shutdownProgress * 0.3)})`;
      ctx.fillRect(startX, cy - innerH / 2, lineW, innerH);

      // Pure white supersonic laser core line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.fillRect(startX, cy - 1.5, lineW, 3);

      // CRT phosphor static fizzle sparks at the collapsing ends
      const sparkCount = Math.floor((1.0 - shutdownProgress) * 6);
      for (let s = 0; s < sparkCount; s++) {
        const sx = startX + Math.random() * lineW;
        const sy = cy + (Math.random() - 0.5) * (glowH * 1.5);
        ctx.fillStyle = s % 2 === 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(56, 189, 248, 0.9)';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
    }

    // Phase 3: Final Phosphor Dot Decay & TV Shutdown Dissipation
    if (shutdownProgress >= 0.70) {
      const p3 = (shutdownProgress - 0.70) / 0.30;
      const dotR = Math.max(0.5, (1.0 - p3) * 7.0);
      const dotAlpha = Math.pow(1.0 - p3, 1.25);

      // Radial glowing phosphor halo
      ctx.fillStyle = `rgba(56, 189, 248, ${0.65 * dotAlpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Core white phosphor dot
      ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * dotAlpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle 4-cardinal phosphor flares
      const flareLen = dotR * 3.0;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * dotAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - flareLen, cy);
      ctx.lineTo(cx + flareLen, cy);
      ctx.moveTo(cx, cy - flareLen);
      ctx.lineTo(cx, cy + flareLen);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// Sprite Sheet Asset Loading & NGNL Theme Harmonizer Cache
// ─────────────────────────────────────────────
let _chessSetSpriteSheet = null;
let _chessSetSpriteSheetLoading = false;
let _cachedProcessedPieces = {};

function _processChessPiecesForNGNLTheme(sourceImg) {
  if (!sourceImg || !sourceImg.complete || sourceImg.naturalWidth <= 0 || typeof document === 'undefined') {
    return;
  }

  for (const [pieceType, frame] of Object.entries(CHESS_PIECE_FRAMES)) {
    try {
      const isRadiantQueen = (pieceType === 'queen');
      const pad = 6;
      const w = frame.sw + pad * 2;
      const h = frame.sh + pad * 2;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Draw original frame onto a temporary canvas to read pixel data
      const scratch = document.createElement('canvas');
      scratch.width = frame.sw;
      scratch.height = frame.sh;
      const sctx = scratch.getContext('2d');
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(sourceImg, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.sw, frame.sh);

      const imgData = sctx.getImageData(0, 0, frame.sw, frame.sh);
      const d = imgData.data;

      // 1. Build silhouette alpha mask for outline pass
      const mask = new Uint8Array(frame.sw * frame.sh);
      for (let i = 0; i < frame.sw * frame.sh; i++) {
        mask[i] = d[i * 4 + 3] > 30 ? 1 : 0;
      }

      // 2. Draw 2px crisp anime white/magenta neon outline
      ctx.fillStyle = isRadiantQueen ? '#EC4899' : '#FFFFFF';
      for (let y = 0; y < frame.sh; y++) {
        for (let x = 0; x < frame.sw; x++) {
          if (mask[y * frame.sw + x] === 1) {
            let isBorder = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (nx < 0 || nx >= frame.sw || ny < 0 || ny >= frame.sh || mask[ny * frame.sw + nx] === 0) {
                  isBorder = true;
                  break;
                }
              }
              if (isBorder) break;
            }
            if (isBorder) {
              ctx.fillRect(x + pad - 2, y + pad - 2, 5, 5);
            }
          }
        }
      }

      // 3. Color Grade Interior to NGNL Obsidian Cyberspace Navy Palette
      for (let y = 0; y < frame.sh; y++) {
        for (let x = 0; x < frame.sw; x++) {
          const idx = (y * frame.sw + x) * 4;
          const a = d[idx + 3];
          if (a < 30) continue;

          const r = d[idx];
          const g = d[idx + 1];
          const b = d[idx + 2];
          const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          if (isRadiantQueen) {
            // Luminous White Queen with Violet Core
            if (lum > 0.70) {
              d[idx] = 255; d[idx + 1] = 255; d[idx + 2] = 255; // #FFFFFF
            } else if (lum > 0.40) {
              d[idx] = 243; d[idx + 1] = 232; d[idx + 2] = 255; // #F3E8FF
            } else if (lum > 0.20) {
              d[idx] = 216; d[idx + 1] = 180; d[idx + 2] = 254; // #D8B4FE
            } else {
              d[idx] = 147; d[idx + 1] = 51; d[idx + 2] = 234;  // #9333EA
            }
          } else {
            // Obsidian Cyberspace Navy Palette matching NGNL Digital Theme
            if (lum > 0.75) {
              d[idx] = 224; d[idx + 1] = 242; d[idx + 2] = 254; // #E0F2FE (Cyan glint)
            } else if (lum > 0.50) {
              d[idx] = 56; d[idx + 1] = 189; d[idx + 2] = 248;  // #38BDF8 (Electric cyan accent)
            } else if (lum > 0.30) {
              d[idx] = 37; d[idx + 1] = 65; d[idx + 2] = 110;  // #25416E (Cobalt mid-tone)
            } else if (lum > 0.15) {
              d[idx] = 27; d[idx + 1] = 42; d[idx + 2] = 74;   // #1B2A4A (Deep obsidian navy)
            } else {
              d[idx] = 14; d[idx + 1] = 20; d[idx + 2] = 35;   // #0E1423 (Darkest ink outline)
            }
          }
          d[idx + 3] = a;
        }
      }

      sctx.putImageData(imgData, 0, 0);
      ctx.drawImage(scratch, pad, pad);

      _cachedProcessedPieces[pieceType] = {
        canvas,
        sw: frame.sw,
        sh: frame.sh,
        width: w,
        height: h,
        pad: pad,
        heightMultiplier: frame.heightMultiplier
      };
    } catch (e) {
      console.warn('Error processing chess piece sprite:', e);
    }
  }
}

export function _getChessSetSpriteSheet() {
  if (_chessSetSpriteSheet && _chessSetSpriteSheet.complete && _chessSetSpriteSheet.naturalWidth > 0) {
    if (Object.keys(_cachedProcessedPieces).length === 0) {
      _processChessPiecesForNGNLTheme(_chessSetSpriteSheet);
    }
    return _chessSetSpriteSheet;
  }
  if (!_chessSetSpriteSheetLoading && typeof Image !== 'undefined') {
    _chessSetSpriteSheetLoading = true;
    const img = new Image();
    img.onload = () => {
      _chessSetSpriteSheet = img;
      _chessSetSpriteSheetLoading = false;
      _processChessPiecesForNGNLTheme(img);
    };
    img.onerror = (e) => {
      console.warn('Failed to load Chess Set Sprite Sheet at Assets/model/shiro/Pixel Chess Set Sprite Sheet.png', e);
      _chessSetSpriteSheetLoading = false;
    };
    img.src = 'Assets/model/shiro/Pixel Chess Set Sprite Sheet.png?v=1';
    _chessSetSpriteSheet = img;
  }
  return _chessSetSpriteSheet;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getChessSetSpriteSheet();
}

export const CHESS_PIECE_FRAMES = {
  pawn:   { sx: 74,   sy: 129, sw: 165, sh: 279, heightMultiplier: 2.65 },
  rook:   { sx: 292,  sy: 108, sw: 187, sh: 300, heightMultiplier: 2.95 },
  knight: { sx: 538,  sy: 86,  sw: 206, sh: 321, heightMultiplier: 2.85 },
  bishop: { sx: 801,  sy: 38,  sw: 178, sh: 370, heightMultiplier: 3.0 },
  queen:  { sx: 1036, sy: 38,  sw: 188, sh: 370, heightMultiplier: 3.25 },
  king:   { sx: 1263, sy: 8,   sw: 188, sh: 401, heightMultiplier: 3.4 }
};

/**
 * Draws a discrete pixel-art Chess Troop Minion / Projectile using the official Pixel Chess Set Sprite Sheet.
 * Falls back seamlessly to procedural pixel-art rendering if the sprite sheet is loading or unavailable.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} troop
 */
export function drawChessTroop(ctx, troop) {
  if (!troop || troop.dead) return;

  const r = troop.radius || 14;

  ctx.save();

  // If currently in summon animation, apply smooth ascending & materializing transform
  let summonScale = 1.0;
  let summonAlpha = 1.0;
  let summonOffsetY = 0;

  if (troop.isMinion && troop.summonTimer && troop.summonTimer > 0) {
    const p = 1.0 - (troop.summonTimer / (troop.summonMaxTimer || 40)); // 0.0 -> 1.0
    // Smooth ease-out cubic curve
    const ease = 1.0 - Math.pow(1.0 - p, 3);
    summonAlpha = Math.min(1.0, 0.15 + ease * 0.85);
    summonScale = 0.45 + ease * 0.55;
    // Ascends gracefully from the illuminated tile ground (rises 28px up into locked tile position)
    summonOffsetY = (1.0 - ease) * 28;
  }

  ctx.globalAlpha = summonAlpha;
  ctx.translate(troop.x, troop.y - (troop.z || 0) - (troop.isMinion ? 0 : 0) + summonOffsetY);
  if (summonScale !== 1.0) {
    ctx.scale(summonScale, summonScale);
  }

  // When leaping (Knight L-jump), render subtle ground shadow underneath
  if (troop.z && troop.z > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(14, 15, 20, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, troop.z + r * 0.4, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Telegraphing charge aura when about to attack (Matching magenta/violet & cyan glow from screenshot)
  if (troop.isTelegraphing) {
    const pulse = 0.5 + 0.5 * Math.sin((typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.02);
    ctx.save();
    // Outer Radiant Magenta Silhouette Aura
    ctx.fillStyle = `rgba(236, 72, 153, ${0.30 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, r * 1.35 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();

    // Inner Glowing Cyan Base Ring
    ctx.fillStyle = `rgba(56, 189, 248, ${0.40 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.65, r * 1.15, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // When planted as a living minion on the board, pieces ALWAYS face upright towards the player/camera (angle = 0)
  // Only projectiles in flight rotate with their trajectory angle
  if (!troop.isMinion && troop.angle) {
    ctx.rotate(troop.angle);

    // Aerodynamic speed line needle trail trailing behind the flying small projectile piece
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-r * 2.4, -r * 0.45);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r * 2.4, r * 0.45);
    ctx.lineTo(-r * 1.5, 0);
    ctx.closePath();
    ctx.fill();

    // Sharp supersonic white core needle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.80)';
    ctx.beginPath();
    ctx.moveTo(-r * 1.6, -r * 0.20);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r * 1.6, r * 0.20);
    ctx.lineTo(-r * 1.0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const processed = _cachedProcessedPieces[troop.type] || _cachedProcessedPieces.pawn;
  const spriteSheet = _getChessSetSpriteSheet();
  const frame = CHESS_PIECE_FRAMES[troop.type] || CHESS_PIECE_FRAMES.pawn;

  // 1. Primary Render Pass: NGNL-Harmonized Pixel Chess Set with Crisp White Neon Outlines
  if (processed && processed.canvas) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const drawH = r * (processed.heightMultiplier || 2.4);
    const scale = drawH / processed.sh;
    const drawTotalW = processed.width * scale;
    const drawTotalH = processed.height * scale;
    const drawX = -drawTotalW / 2;
    const drawY = -drawH * 0.58 - processed.pad * scale;

    // Unified cyan/blue under-glow only for living chess troops on board
    const glowColor = 'rgba(56, 189, 248, 0.35)';
    if (troop.isMinion) {
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.ellipse(0, drawH * 0.35, r * 0.95, r * 0.40, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.drawImage(processed.canvas, drawX, drawY, drawTotalW, drawTotalH);
    ctx.restore();
  } else if (spriteSheet && spriteSheet.complete && spriteSheet.naturalWidth > 0 && frame) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const drawH = r * (frame.heightMultiplier || 2.4);
    const scale = drawH / frame.sh;
    const drawW = frame.sw * scale;
    const drawX = -drawW / 2;
    const drawY = -drawH * 0.58;

    // Unified cyan/blue under-glow only for living chess troops on board
    const glowColor = 'rgba(56, 189, 248, 0.35)';
    if (troop.isMinion) {
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.ellipse(0, drawH * 0.35, r * 0.95, r * 0.40, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.drawImage(spriteSheet, frame.sx, frame.sy, frame.sw, frame.sh, drawX, drawY, drawW, drawH);
    ctx.restore();
  } else {
    // 2. Fallback Render Pass: Authentic No Game No Life Vector Silhouette Chess Set
    const isRadiantQueen = (troop.type === 'queen');
    const isWhitePiece = (troop.isWhite || isRadiantQueen);
    const facingLeft = (troop.x > 270);

    // Unified cyan/blue under-glow only for living chess troops on board
    const glowColor = 'rgba(56, 189, 248, 0.35)';
    if (troop.isMinion) {
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.60, r * 0.95, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    switch (troop.type) {
      case 'pawn':
        _drawPawnPiece(ctx, r, isWhitePiece);
        break;
      case 'knight':
        _drawKnightPiece(ctx, r, isWhitePiece, facingLeft);
        break;
      case 'bishop':
        _drawBishopPiece(ctx, r, isWhitePiece);
        break;
      case 'rook':
        _drawRookPiece(ctx, r, isWhitePiece);
        break;
      case 'queen':
        _drawQueenPiece(ctx, r, true);
        break;
      default:
        _drawPawnPiece(ctx, r, isWhitePiece);
        break;
    }
  }

  // Overhead Lifetime / Health Ring
  if (troop.isMinion && troop.maxHp) {
    _drawTroopOverheadHud(ctx, troop, r);
  }

  ctx.restore();
}

function _drawPawnPiece(ctx, r, isWhite = false) {
  const fill = isWhite ? '#FFFFFF' : '#1E2C48';
  const stroke = isWhite ? '#C084FC' : '#FFFFFF';

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1.8, r * 0.12);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Flared Base
  ctx.moveTo(-r * 0.70, r * 0.65);
  ctx.lineTo(r * 0.70, r * 0.65);
  ctx.lineTo(r * 0.60, r * 0.45);
  // Waist curve in
  ctx.quadraticCurveTo(r * 0.25, r * 0.20, r * 0.35, -r * 0.05);
  // Collar ring
  ctx.lineTo(r * 0.55, -r * 0.08);
  ctx.lineTo(r * 0.55, -r * 0.20);
  ctx.lineTo(r * 0.28, -r * 0.22);
  // Head dome
  ctx.arc(0, -r * 0.52, r * 0.36, 0.2, Math.PI - 0.2, true);
  // Left collar ring
  ctx.lineTo(-r * 0.28, -r * 0.22);
  ctx.lineTo(-r * 0.55, -r * 0.20);
  ctx.lineTo(-r * 0.55, -r * 0.08);
  ctx.lineTo(-r * 0.35, -r * 0.05);
  // Left waist curve in
  ctx.quadraticCurveTo(-r * 0.25, r * 0.20, -r * 0.60, r * 0.45);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Subtle center glint/ring if white
  if (isWhite) {
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -r * 0.52, r * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function _drawKnightPiece(ctx, r, isWhite = false, facingLeft = false) {
  ctx.save();
  if (facingLeft) {
    ctx.scale(-1, 1);
  }

  const fill = isWhite ? '#FFFFFF' : '#1E2C48';
  const stroke = isWhite ? '#C084FC' : '#FFFFFF';

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1.8, r * 0.12);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Flared Base
  ctx.moveTo(-r * 0.70, r * 0.65);
  ctx.lineTo(r * 0.70, r * 0.65);
  ctx.lineTo(r * 0.60, r * 0.45);
  // Back mane curve going up to ears
  ctx.quadraticCurveTo(r * 0.55, -r * 0.20, r * 0.15, -r * 0.75);
  // Ear tip
  ctx.lineTo(r * 0.05, -r * 0.90);
  ctx.lineTo(-r * 0.15, -r * 0.70);
  // Forehead to snout tip
  ctx.lineTo(-r * 0.65, -r * 0.35);
  // Snout underside
  ctx.lineTo(-r * 0.75, -r * 0.15);
  ctx.lineTo(-r * 0.45, -r * 0.05);
  // Jaw / Throat arch to chest
  ctx.quadraticCurveTo(-r * 0.25, r * 0.20, -r * 0.60, r * 0.45);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Slanted teardrop eye cutout from NGNL anime
  ctx.fillStyle = isWhite ? '#8B5CF6' : '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(-r * 0.30, -r * 0.38, r * 0.12, r * 0.06, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Nostril slit cutout
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, -r * 0.18, r * 0.06, r * 0.03, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function _drawBishopPiece(ctx, r, isWhite = false) {
  const fill = isWhite ? '#FFFFFF' : '#1E2C48';
  const stroke = isWhite ? '#C084FC' : '#FFFFFF';

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1.8, r * 0.12);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Flared Base
  ctx.moveTo(-r * 0.70, r * 0.65);
  ctx.lineTo(r * 0.70, r * 0.65);
  ctx.lineTo(r * 0.55, r * 0.45);
  // Waist curve
  ctx.quadraticCurveTo(r * 0.22, r * 0.20, r * 0.30, -r * 0.10);
  // Collar rim
  ctx.lineTo(r * 0.45, -r * 0.15);
  ctx.lineTo(r * 0.20, -r * 0.25);
  // Mitre pointed dome up to finial apex
  ctx.quadraticCurveTo(r * 0.50, -r * 0.55, 0, -r * 0.95);
  // Left side of mitre
  ctx.quadraticCurveTo(-r * 0.50, -r * 0.55, -r * 0.20, -r * 0.25);
  ctx.lineTo(-r * 0.45, -r * 0.15);
  ctx.lineTo(-r * 0.30, -r * 0.10);
  ctx.quadraticCurveTo(-r * 0.22, r * 0.20, -r * 0.55, r * 0.45);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Finial cross on tip
  ctx.beginPath();
  ctx.arc(0, -r * 0.95, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Iconic NGNL centered cross emblem cutout (+)
  const crossColor = isWhite ? '#8B5CF6' : '#FFFFFF';
  ctx.fillStyle = crossColor;
  const cw = Math.max(2.5, r * 0.14);
  const ch = r * 0.40;
  const cy = -r * 0.55;
  // Vertical beam
  ctx.fillRect(-cw / 2, cy - ch / 2, cw, ch);
  // Horizontal beam
  const cBarW = r * 0.36;
  ctx.fillRect(-cBarW / 2, cy - cw / 2 - r * 0.05, cBarW, cw);
}

function _drawRookPiece(ctx, r, isWhite = false) {
  const fill = isWhite ? '#FFFFFF' : '#1E2C48';
  const stroke = isWhite ? '#C084FC' : '#FFFFFF';

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1.8, r * 0.12);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Flared Fortress Base
  ctx.moveTo(-r * 0.75, r * 0.65);
  ctx.lineTo(r * 0.75, r * 0.65);
  ctx.lineTo(r * 0.65, r * 0.45);
  // Tower shaft
  ctx.lineTo(r * 0.45, -r * 0.25);
  // Tower cornice
  ctx.lineTo(r * 0.65, -r * 0.30);
  // Battlement crenellations
  ctx.lineTo(r * 0.65, -r * 0.75); // right outer tooth
  ctx.lineTo(r * 0.38, -r * 0.75);
  ctx.lineTo(r * 0.38, -r * 0.55); // right notch
  ctx.lineTo(r * 0.18, -r * 0.55);
  ctx.lineTo(r * 0.18, -r * 0.75); // center tooth
  ctx.lineTo(-r * 0.18, -r * 0.75);
  ctx.lineTo(-r * 0.18, -r * 0.55); // left notch
  ctx.lineTo(-r * 0.38, -r * 0.55);
  ctx.lineTo(-r * 0.38, -r * 0.75); // left outer tooth
  ctx.lineTo(-r * 0.65, -r * 0.75);
  ctx.lineTo(-r * 0.65, -r * 0.30);
  ctx.lineTo(-r * 0.45, -r * 0.25);
  ctx.lineTo(-r * 0.65, r * 0.45);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Arched window slot cutout
  const winColor = isWhite ? '#8B5CF6' : '#FFFFFF';
  ctx.fillStyle = winColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.10, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function _drawQueenPiece(ctx, r, isWhite = true) {
  // In NGNL, the Queen is the radiant white crown piece from top-left of the screenshot!
  const fill = isWhite ? '#FFFFFF' : '#1E2C48';
  const stroke = isWhite ? '#EC4899' : '#FFFFFF';

  // Radiant outer halo for White Queen (NGNL Queen style)
  if (isWhite) {
    ctx.save();
    ctx.fillStyle = 'rgba(236, 72, 153, 0.22)';
    ctx.beginPath();
    ctx.arc(0, -r * 0.20, r * 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1.8, r * 0.14);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Flared Pedestal Base
  ctx.moveTo(-r * 0.80, r * 0.65);
  ctx.lineTo(r * 0.80, r * 0.65);
  ctx.lineTo(r * 0.70, r * 0.40);
  // Waist curve
  ctx.quadraticCurveTo(r * 0.25, r * 0.15, r * 0.50, -r * 0.15);
  // 7-Spike Starburst Crown (Authentic NGNL Queen Silhouette)
  ctx.lineTo(r * 0.88, -r * 0.30); // Spike 7 (rightmost)
  ctx.lineTo(r * 0.55, -r * 0.35);
  ctx.lineTo(r * 0.75, -r * 0.65); // Spike 6
  ctx.lineTo(r * 0.40, -r * 0.55);
  ctx.lineTo(r * 0.45, -r * 0.88); // Spike 5
  ctx.lineTo(r * 0.20, -r * 0.65);
  ctx.lineTo(0, -r * 0.98);        // Spike 4 (tallest center apex)
  ctx.lineTo(-r * 0.20, -r * 0.65);
  ctx.lineTo(-r * 0.45, -r * 0.88); // Spike 3
  ctx.lineTo(-r * 0.40, -r * 0.55);
  ctx.lineTo(-r * 0.75, -r * 0.65); // Spike 2
  ctx.lineTo(-r * 0.55, -r * 0.35);
  ctx.lineTo(-r * 0.88, -r * 0.30); // Spike 1 (leftmost)
  ctx.lineTo(-r * 0.50, -r * 0.15);
  ctx.quadraticCurveTo(-r * 0.25, r * 0.15, -r * 0.70, r * 0.40);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Centered royal cross cutout (+)
  const crossColor = isWhite ? '#8B5CF6' : '#FFFFFF';
  ctx.fillStyle = crossColor;
  const cw = Math.max(2.5, r * 0.14);
  const ch = r * 0.36;
  const cy = r * 0.05;
  // Vertical bar
  ctx.fillRect(-cw / 2, cy - ch / 2, cw, ch);
  // Horizontal bar
  const cBarW = r * 0.32;
  ctx.fillRect(-cBarW / 2, cy - cw / 2, cBarW, cw);
}

function _drawTroopOverheadHud(ctx, troop, r) {
  const hpPct = Math.max(0, Math.min(1, troop.hp / troop.maxHp));
  const barW = r * 2.4;
  const barH = 3.5;
  const barY = -r - 8;

  // Background
  ctx.fillStyle = 'rgba(14, 15, 20, 0.85)';
  ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

  // Health bar (Emerald Green -> Amber -> Red based on HP)
  ctx.fillStyle = hpPct > 0.5 ? '#10B981' : (hpPct > 0.25 ? '#F59E0B' : '#EF4444');
  ctx.fillRect(-barW / 2, barY, barW * hpPct, barH);

  // Subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);
}

function _getHarmonizedTileHighlight(col, row, type, alpha = 1.0) {
  // Universal Purple / Magenta Tactical Highlight Palette
  return {
    fill: `rgba(126, 34, 206, ${0.65 * alpha})`,
    stroke: `rgba(236, 72, 153, ${0.95 * alpha})`
  };
}

/**
 * Draws tactical threat/target reticles ONLY for the active attack lane, target square, and attacking piece.
 * Renders a clean glowing purple/magenta tile runway with laser guide trajectory.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} arena
 * @param {Array} minions
 * @param {number} alpha - Opacity [0.0, 1.0]
 */
export function drawTroopThreatTiles(ctx, arena, minions, alpha = 1.0) {
  if (!arena || !minions || minions.length === 0 || alpha <= 0.01) return;

  const cols = 8;
  const rows = 8;
  const tileW = arena.width / cols;
  const tileH = arena.height / rows;

  // Build occupancy set of friendly living minions (excluding the attacking piece)
  const occupied = new Set();
  for (const m of minions) {
    if (m && m.isMinion && !m.dead && m.tileCol !== undefined && m.tileRow !== undefined) {
      occupied.add(`${m.tileCol},${m.tileRow}`);
    }
  }

  ctx.save();
  ctx.translate(arena.x, arena.y);

  // 1. Subtle glowing under-feet discs for idle planted pieces (Zero box strokes or white corner clutter on idle squares)
  for (const troop of minions) {
    if (!troop || !troop.isMinion || troop.dead || troop.tileCol === undefined || troop.tileRow === undefined) continue;
    if (troop.isAttacking || troop.isTelegraphing) continue;

    const tx = troop.tileCol * tileW;
    const ty = troop.tileRow * tileH;

    ctx.fillStyle = `rgba(56, 189, 248, ${0.35 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(tx + tileW / 2, ty + tileH * 0.72, tileW * 0.36, tileH * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. High-Intensity Illuminated Purple/Magenta Attack Runway & Target Squares (Matching Pic 2)
  for (const troop of minions) {
    // Only display threat & target highlight for the troop that is actively telegraphing or attacking!
    if (!troop || !troop.isMinion || troop.dead || (!troop.isAttacking && !troop.isTelegraphing) || !troop.targetTile) continue;

    const myCol = troop.startTile ? troop.startTile.col : (troop.tileCol !== undefined ? troop.tileCol : 0);
    const myRow = troop.startTile ? troop.startTile.row : (troop.tileRow !== undefined ? troop.tileRow : 0);
    const tgtCol = troop.targetTile.col;
    const tgtRow = troop.targetTile.row;

    const activeDirC = Math.sign(tgtCol - myCol);
    const activeDirR = Math.sign(tgtRow - myRow);

    const threatTiles = [];

    // 1. Origin Anchor Square (Attacking piece's square)
    const origStyle = _getHarmonizedTileHighlight(myCol, myRow, 'origin', alpha);
    threatTiles.push({
      col: myCol,
      row: myRow,
      color: origStyle.fill,
      stroke: origStyle.stroke,
      corner: origStyle.corner,
      isOrigin: true
    });

    // 2. Active Charge Lane & Target Square (Strictly on the active attack vector)
    switch (troop.type) {
      case 'rook':
      case 'bishop':
      case 'queen':
        // Trace the direct charge ray from origin to target
        if (activeDirC !== 0 || activeDirR !== 0) {
          let curC = myCol + activeDirC;
          let curR = myRow + activeDirR;
          while (curC >= 0 && curC < cols && curR >= 0 && curR < rows) {
            if (curC === tgtCol && curR === tgtRow) {
              const s = _getHarmonizedTileHighlight(curC, curR, 'target', alpha);
              threatTiles.push({
                col: curC,
                row: curR,
                color: s.fill,
                stroke: s.stroke,
                corner: s.corner,
                isTarget: true,
                isMajor: true
              });
              break;
            } else {
              const s = _getHarmonizedTileHighlight(curC, curR, 'path', alpha);
              threatTiles.push({
                col: curC,
                row: curR,
                color: s.fill,
                stroke: s.stroke,
                corner: s.corner,
                isPath: true,
                isMajor: true
              });
            }
            curC += activeDirC;
            curR += activeDirR;
          }
        }
        break;

      case 'knight':
        if (tgtCol >= 0 && tgtCol < cols && tgtRow >= 0 && tgtRow < rows) {
          const s = _getHarmonizedTileHighlight(tgtCol, tgtRow, 'target', alpha);
          threatTiles.push({
            col: tgtCol,
            row: tgtRow,
            color: s.fill,
            stroke: s.stroke,
            isTarget: true,
            isMajor: true
          });
        }
        break;

      case 'pawn':
        if (tgtCol >= 0 && tgtCol < cols && tgtRow >= 0 && tgtRow < rows) {
          const s = _getHarmonizedTileHighlight(tgtCol, tgtRow, 'target', alpha);
          threatTiles.push({
            col: tgtCol,
            row: tgtRow,
            color: s.fill,
            stroke: s.stroke,
            isTarget: true,
            isMajor: true
          });
        }
        break;
    }

    // 1. Render the illuminated threat tile squares (purple wash + magenta border)
    for (const tile of threatTiles) {
      const tx = tile.col * tileW;
      const ty = tile.row * tileH;

      // Solid, rich purple/magenta glowing tile wash
      ctx.fillStyle = tile.color;
      ctx.fillRect(tx + 1, ty + 1, tileW - 2, tileH - 2);

      // Clean magenta outer perimeter border
      ctx.strokeStyle = tile.stroke;
      ctx.lineWidth = 2.0;
      ctx.strokeRect(tx + 1, ty + 1, tileW - 2, tileH - 2);
    }

    // 2. Render continuous connecting laser guide line from piece center to target center
    const startX = (myCol + 0.5) * tileW;
    const startY = (myRow + 0.5) * tileH;
    const endX = (tgtCol + 0.5) * tileW;
    const endY = (tgtRow + 0.5) * tileH;

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
    ctx.lineWidth = 2.0;

    if (troop.type === 'knight') {
      // Piecewise 2-segment L-shape trajectory matching Knight leap physics
      let cornerCol = myCol;
      let cornerRow = tgtRow;
      if (Math.abs(tgtCol - myCol) === 2) {
        cornerCol = tgtCol;
        cornerRow = myRow;
      }
      const cornerX = (cornerCol + 0.5) * tileW;
      const cornerY = (cornerRow + 0.5) * tileH;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(cornerX, cornerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else {
      // Direct continuous ray from origin center to target center (Pawn, Bishop, Rook, Queen)
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Renders all active Chess Combat Visual Effects.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} arena
 * @param {Array} vfxList
 */
export function drawChessAttackVfx(ctx, arena, vfxList) {
  if (!arena || !vfxList || vfxList.length === 0) return;

  for (const vfx of vfxList) {
    if (!vfx || vfx.timer <= 0) continue;

    switch (vfx.type) {
      case 'pawn_thrust':
        _drawPawnThrustVfx(ctx, vfx);
        break;
      case 'knight_shockwave':
        drawKnightShockwave(ctx, vfx);
        break;
      case 'knight_trail':
        _drawKnightTrailVfx(ctx, vfx);
        break;
      case 'bishop_slash':
        _drawBishopSlashVfx(ctx, vfx);
        break;
      case 'rook_ram':
        _drawRookRamVfx(ctx, vfx);
        break;
      case 'queen_whirlwind':
        _drawQueenWhirlwindVfx(ctx, vfx);
        break;
      case 'troop_plant':
        _drawTroopPlantCinematicVfx(ctx, arena, vfx);
        break;
    }
  }
}

function _drawPawnThrustVfx(ctx, vfx) {
  const { startX, startY, endX, endY, timer, maxTimer } = vfx;
  const progress = 1.0 - timer / maxTimer;
  const alpha = Math.sin(progress * Math.PI);

  ctx.save();
  // Cyan thrust core
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
  ctx.lineWidth = 3.0 * alpha;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Cyan outer aura
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.75 * alpha})`;
  ctx.lineWidth = 8.0 * alpha;
  ctx.stroke();

  // Tip spark diamond
  ctx.fillStyle = `rgba(255, 255, 255, ${0.90 * alpha})`;
  ctx.beginPath();
  ctx.arc(endX, endY, 6 * alpha, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function _drawKnightTrailVfx(ctx, vfx) {
  const { startX, startY, cornerX, cornerY, endX, endY, timer, maxTimer } = vfx;
  const progress = 1.0 - timer / maxTimer;
  const alpha = Math.pow(1.0 - progress, 1.2);

  ctx.save();
  ctx.strokeStyle = `rgba(245, 158, 11, ${0.75 * alpha})`;
  ctx.lineWidth = 3.5 * alpha;
  ctx.setLineDash([6, 4]);

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  if (cornerX !== undefined && cornerY !== undefined) {
    ctx.lineTo(cornerX, cornerY);
  }
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Draw corner waypoint dot
  if (cornerX !== undefined && cornerY !== undefined) {
    ctx.fillStyle = `rgba(252, 211, 77, ${0.80 * alpha})`;
    ctx.beginPath();
    ctx.arc(cornerX, cornerY, 3.5 * alpha, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _drawBishopSlashVfx(ctx, vfx) {
  const { x, y, angle, timer, maxTimer } = vfx;
  const progress = 1.0 - timer / maxTimer;
  const alpha = Math.sin(progress * Math.PI);
  const slashRadius = 38 * Math.pow(progress, 0.6);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle || (Math.PI / 4));

  // Double-Tapered Crescent Slash (Rule 15 Standard)
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.85 * alpha})`;
  ctx.lineWidth = 4.5 * alpha;
  ctx.beginPath();
  ctx.arc(0, 0, slashRadius, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.stroke();

  // Inner White Core
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
  ctx.lineWidth = 2.0 * alpha;
  ctx.beginPath();
  ctx.arc(0, 0, slashRadius, -Math.PI * 0.3, Math.PI * 0.3);
  ctx.stroke();

  ctx.restore();
}

function _drawRookRamVfx(ctx, vfx) {
  const { x, y, dirX, dirY, timer, maxTimer } = vfx;
  const progress = 1.0 - timer / maxTimer;
  const alpha = Math.sin(progress * Math.PI);
  const spread = 32 * Math.pow(progress, 0.7);

  ctx.save();
  ctx.translate(x, y);

  // Golden Ram Impact Shock Wave
  ctx.strokeStyle = `rgba(251, 191, 36, ${0.85 * alpha})`;
  ctx.lineWidth = 4.0 * alpha;
  ctx.beginPath();
  ctx.arc(0, 0, spread, 0, Math.PI * 2);
  ctx.stroke();

  // White Impact Center
  ctx.fillStyle = `rgba(255, 255, 255, ${0.90 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, spread * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function _drawQueenWhirlwindVfx(ctx, vfx) {
  const { x, y, timer, maxTimer } = vfx;
  const progress = 1.0 - timer / maxTimer;
  const alpha = Math.sin(progress * Math.PI);
  const currentR = 65 * Math.pow(progress, 0.7);
  const spinAngle = progress * Math.PI * 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spinAngle);

  // 8-Way Royal Crescent Blades
  ctx.strokeStyle = `rgba(236, 72, 153, ${0.80 * alpha})`;
  ctx.lineWidth = 3.5;

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const bx = Math.cos(angle) * currentR;
    const by = Math.sin(angle) * currentR;

    ctx.beginPath();
    ctx.arc(bx, by, 8 * alpha, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? `rgba(251, 191, 36, ${0.85 * alpha})` : `rgba(236, 72, 153, ${0.85 * alpha})`;
    ctx.fill();
  }

  // Concentric Expanding Aura
  ctx.beginPath();
  ctx.arc(0, 0, currentR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(251, 191, 36, ${0.70 * alpha})`;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Knight L-Gambit Landing Shockwave (Rule 26 Compliant).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} shockwave
 */
export function drawKnightShockwave(ctx, shockwave) {
  if (!shockwave || shockwave.timer <= 0) return;

  const { x, y, radius = 58, timer, maxTimer = 24 } = shockwave;
  const globalP = Math.max(0, Math.min(1.0, 1.0 - timer / maxTimer));

  ctx.save();
  ctx.translate(x, y);

  // 1. Ground Impact Flash Disc (Initial kinetic pop-in)
  const flashP = Math.sin(Math.min(1.0, globalP / 0.35) * Math.PI);
  if (flashP > 0.01) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * flashP})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.35 * Math.pow(globalP, 0.4), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(251, 191, 36, ${0.25 * flashP})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.65 * Math.pow(globalP, 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Sequential Water-Ripple Wavefronts (Rule 26: Staggered sequential concentric ripples)
  // 3 Staggered Ripple Rings popping out 1-by-1 like dipping fingers in steady water:
  const rippleOffsets = [0.00, 0.14, 0.28];
  const maxR = radius * 1.35;

  for (let k = 0; k < rippleOffsets.length; k++) {
    const tOffset = rippleOffsets[k];
    if (globalP < tOffset) continue;

    const localP = (globalP - tOffset) / (1.0 - tOffset);
    // Decelerating power curve for organic hydrodynamic wave propagation
    const waveR = maxR * Math.pow(localP, 0.62);
    const popIn = Math.min(1.0, localP / 0.12);
    const fadeOut = Math.pow(1.0 - localP, 1.35);
    const alpha = popIn * fadeOut;

    if (alpha <= 0.01) continue;

    // Expanding semi-transparent interior wash
    ctx.fillStyle = (k === 0)
      ? `rgba(245, 158, 11, ${0.15 * alpha})`
      : `rgba(251, 191, 36, ${0.08 * alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, waveR, 0, Math.PI * 2);
    ctx.fill();

    // Outer Amber Shockwave Stroke
    ctx.strokeStyle = (k === 0)
      ? `rgba(245, 158, 11, ${0.90 * alpha})`
      : `rgba(252, 211, 77, ${0.75 * alpha})`;
    ctx.lineWidth = Math.max(1.2, (3.6 - k * 0.8) * fadeOut);
    ctx.beginPath();
    ctx.arc(0, 0, waveR, 0, Math.PI * 2);
    ctx.stroke();

    // Supersonic Crisp White Core Leading Edge (Leading compression ring)
    if (k === 0 || k === 1) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha * popIn})`;
      ctx.lineWidth = Math.max(1.0, 1.8 * fadeOut);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0, waveR - 1.2), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 3. Discrete Radial Impact Spark Points (Rule 26: Discrete dots/particles only, ZERO radial spoke lines)
  const sparkCount = 8;
  const sparkProgress = Math.pow(globalP, 0.7);
  const sparkDist = radius * (0.4 + 0.9 * sparkProgress);
  const sparkAlpha = Math.pow(1.0 - globalP, 1.5);

  if (sparkAlpha > 0.05) {
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i * Math.PI * 2) / sparkCount + (i % 2 === 0 ? 0.15 : -0.15);
      const sx = Math.cos(angle) * sparkDist;
      const sy = Math.sin(angle) * sparkDist;
      const sz = Math.max(1.0, (i % 2 === 0 ? 3.0 : 2.0) * sparkAlpha);

      ctx.fillStyle = i % 2 === 0
        ? `rgba(255, 255, 255, ${0.90 * sparkAlpha})`
        : `rgba(252, 211, 77, ${0.85 * sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draws cinematic tile snap & holographic summon animation when a Chess Troop is planted on the board.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} arena
 * @param {object} vfx
 */
function _drawTroopPlantCinematicVfx(ctx, arena, vfx) {
  const { col, row, timer, maxTimer } = vfx;
  const progress = 1.0 - timer / maxTimer;
  const fadeOut = Math.pow(1.0 - progress, 1.3);
  const flashAlpha = Math.sin(Math.min(1.0, progress / 0.5) * Math.PI);

  const cols = 8;
  const rows = 8;
  const tileW = (arena && arena.width ? arena.width / cols : 56.25);
  const tileH = (arena && arena.height ? arena.height / rows : 56.25);
  const arenaX = arena ? arena.x : 0;
  const arenaY = arena ? arena.y : 0;

  const tx = arenaX + col * tileW;
  const ty = arenaY + row * tileH;
  const cx = tx + tileW / 2;
  const cy = ty + tileH / 2;

  const isLight = (col + row) % 2 === 0;
  const themeColor = isLight ? 'rgba(110, 231, 183,' : 'rgba(59, 130, 246,';
  const themeBorder = isLight ? 'rgba(167, 243, 208,' : 'rgba(147, 197, 253,';

  ctx.save();

  // 1. Vertical Holographic Light Pillar Beacon (Initial 65% of animation)
  if (progress < 0.65) {
    const beamP = progress / 0.65;
    const beamAlpha = Math.sin(beamP * Math.PI) * 0.55;
    const pillarH = tileH * (2.2 * (1.0 - beamP * 0.3));

    ctx.fillStyle = `${themeColor} ${beamAlpha * 0.35})`;
    ctx.fillRect(tx + 4, ty - pillarH + tileH, tileW - 8, pillarH);

    // Central bright core laser needle
    ctx.fillStyle = `rgba(255, 255, 255, ${beamAlpha * 0.85})`;
    ctx.fillRect(cx - 3, ty - pillarH + tileH, 6, pillarH);
  }

  // 2. High-Contrast Contracting Corner Lock-In Brackets (Elastic snap from 1.6x down to 1.0x)
  const bracketScale = progress <= 0.35
    ? 1.6 - (progress / 0.35) * 0.6
    : 1.0;
  const bracketAlpha = Math.min(1.0, fadeOut * 1.3);

  const bSizeW = (tileW - 4) * bracketScale;
  const bSizeH = (tileH - 4) * bracketScale;
  const bx = cx - bSizeW / 2;
  const by = cy - bSizeH / 2;
  const cLen = Math.max(7, Math.round(tileW * 0.22));

  // Neon Theme / Pure White snapping brackets
  ctx.strokeStyle = progress < 0.35
    ? `rgba(255, 255, 255, ${0.98 * bracketAlpha})`
    : `${themeBorder} ${0.95 * bracketAlpha})`;
  ctx.lineWidth = progress < 0.35 ? 3.5 : 2.4;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by); ctx.stroke();
  // Top-Right
  ctx.beginPath();
  ctx.moveTo(bx + bSizeW - cLen, by); ctx.lineTo(bx + bSizeW, by); ctx.lineTo(bx + bSizeW, by + cLen); ctx.stroke();
  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(bx, by + bSizeH - cLen); ctx.lineTo(bx, by + bSizeH); ctx.lineTo(bx + cLen, by + bSizeH); ctx.stroke();
  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(bx + bSizeW - cLen, by + bSizeH); ctx.lineTo(bx + bSizeW, by + bSizeH); ctx.lineTo(bx + bSizeW, by + bSizeH - cLen); ctx.stroke();

  // 3. Tile Surface Impact Flash (Pure White -> Theme Bloom)
  if (flashAlpha > 0.05) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.40 * flashAlpha})`;
    ctx.fillRect(tx + 2, ty + 2, tileW - 4, tileH - 4);

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * flashAlpha})`;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(tx + 2, ty + 2, tileW - 4, tileH - 4);
  }

  // 4. Concentric Expanding Shockwave Wavefronts (Rule 26 Anti-Cobweb Standard)
  const maxR = tileW * 1.35;
  const wave1R = maxR * Math.pow(progress, 0.65);

  // Translucent interior theme disc wash
  ctx.fillStyle = `${themeColor} ${0.22 * fadeOut})`;
  ctx.beginPath();
  ctx.arc(cx, cy, wave1R, 0, Math.PI * 2);
  ctx.fill();

  // Primary White Shockwave Core Ring
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * fadeOut})`;
  ctx.lineWidth = 3.0 * fadeOut + 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, wave1R, 0, Math.PI * 2);
  ctx.stroke();

  // Secondary Staggered Theme Expansion Ring (pops out at progress > 0.12)
  if (progress > 0.12) {
    const p2 = (progress - 0.12) / 0.88;
    const wave2R = maxR * 0.85 * Math.pow(p2, 0.60);
    const fade2 = Math.pow(1.0 - p2, 1.25);

    ctx.strokeStyle = `${themeBorder} ${0.90 * fade2})`;
    ctx.lineWidth = 2.2 * fade2 + 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, wave2R, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 5. Pixel-Art Diamond Spark Particles (4 Cardinal + 4 Diagonal)
  const sparkDist = tileW * 0.95 * Math.pow(progress, 0.70);
  const sparkFade = Math.pow(1.0 - progress, 1.2);
  if (sparkFade > 0.05) {
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const px = cx + Math.cos(angle) * sparkDist;
      const py = cy + Math.sin(angle) * sparkDist;
      const sz = Math.max(2, Math.round(4.0 * sparkFade));

      // Core white & theme glints
      ctx.fillStyle = i % 2 === 0 ? `rgba(255, 255, 255, ${0.95 * sparkFade})` : `${themeBorder} ${0.90 * sparkFade})`;
      ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
  }

  // 6. Center Rotating Tactical Rune Diamond
  const spinAngle = progress * Math.PI * 0.75;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spinAngle);
  const runeSize = (tileW * 0.38) * (1.0 - progress * 0.4);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.80 * fadeOut})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-runeSize / 2, -runeSize / 2, runeSize, runeSize);
  ctx.restore();

  ctx.restore();
}

// ─────────────────────────────────────────────
// Chess Troop Destruction Shatter Particles
// ─────────────────────────────────────────────

export const CHESS_PIECE_THEMES = {
  pawn: {
    name: 'Pawn',
    colors: ['#FFFFFF', '#C084FC', '#38BDF8', '#1E293B', '#DDD6FE'],
    sparkColor: '#C084FC',
    flashColor: '#38BDF8'
  },
  knight: {
    name: 'Knight',
    colors: ['#74E798', '#38BDF8', '#FFFFFF', '#3B5BDB', '#A7F3D0'],
    sparkColor: '#74E798',
    flashColor: '#74E798'
  },
  bishop: {
    name: 'Bishop',
    colors: ['#A855F7', '#DDD6FE', '#FFFFFF', '#312E81', '#C084FC'],
    sparkColor: '#A855F7',
    flashColor: '#C084FC'
  },
  rook: {
    name: 'Rook',
    colors: ['#3B5BDB', '#38BDF8', '#FFFFFF', '#0F172A', '#93C5FD'],
    sparkColor: '#38BDF8',
    flashColor: '#3B5BDB'
  },
  queen: {
    name: 'Queen',
    colors: ['#EC4899', '#FCD34D', '#FFFFFF', '#8B5CF6', '#F472B6'],
    sparkColor: '#EC4899',
    flashColor: '#FCD34D'
  }
};

/**
 * Spawns a high-impact digital crystal glass shatter effect when a chess troop is destroyed.
 * Features faceted geometric polygonal shards with physics, upward launch, floor bounce,
 * digital square spark bursts, and screen shake.
 * @param {object} troop
 */
export function spawnChessTroopShatter(troop) {
  if (!troop || typeof state === 'undefined') return;
  if (!state.deathEffects) state.deathEffects = [];

  const qualityMultiplier = state.qualityLevel || 1.0;
  const isMulti = typeof state !== 'undefined' && state.mode && state.mode !== '1v1' && state.mode !== 'Training';
  const MAX_DEATH_EFFECTS = Math.floor((isMulti ? 50 : 120) * qualityMultiplier);

  const baseR = troop.r || (troop.radius || 15);
  const type = troop.type || 'pawn';
  const theme = CHESS_PIECE_THEMES[type] || CHESS_PIECE_THEMES.pawn;

  // 1. Screen Shake & Impact Flash
  try {
    triggerGlobalScreenShake(type === 'queen' ? 6 : (type === 'rook' ? 5 : 3), 12);
    spawnImpactFlash(troop.x, troop.y, baseR * 2.4, theme.flashColor);
    spawnSparks(troop.x, troop.y, Math.floor(14 * qualityMultiplier), 'cyan', theme.sparkColor);
    spawnSparks(troop.x, troop.y, Math.floor(10 * qualityMultiplier), 'white', '#FFFFFF');
  } catch (e) {}

  // 2. Spawn 12 - 18 Faceted Crystal Polygonal Shards
  const shardCount = type === 'queen' ? Math.floor(18 * qualityMultiplier) : Math.floor(12 * qualityMultiplier);
  const baseSpeed = type === 'queen' ? 9.5 : 7.5;

  for (let i = 0; i < shardCount; i++) {
    if (state.deathEffects.length >= MAX_DEATH_EFFECTS) {
      const nonPermIndex = state.deathEffects.findIndex(e => !e.isEyeOfCthulhuGore && !e.isPermanentGore && !e.isNamelessDeityAssetGore);
      if (nonPermIndex !== -1) {
        state.deathEffects.splice(nonPermIndex, 1);
      } else if (state.deathEffects.length > 90) {
        state.deathEffects.shift();
      }
    }

    const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.5;
    const speed = baseSpeed + Math.random() * 6.5;
    const shardColor = theme.colors[i % theme.colors.length];
    const shardSize = baseR * (0.30 + Math.random() * 0.38);

    // Randomize 3-point crystal or 4-point diamond geometry
    const isDiamond = Math.random() < 0.55;
    const points = isDiamond ? [
      { x: 0, y: -shardSize * 1.25 },
      { x: shardSize * 0.65, y: -shardSize * 0.1 },
      { x: 0, y: shardSize * 0.95 },
      { x: -shardSize * 0.65, y: -shardSize * 0.1 }
    ] : [
      { x: 0, y: -shardSize * 1.15 },
      { x: shardSize * 0.75, y: shardSize * 0.75 },
      { x: -shardSize * 0.75, y: shardSize * 0.75 }
    ];

    state.deathEffects.push({
      x: troop.x + (Math.random() - 0.5) * (baseR * 0.35),
      y: troop.y + (Math.random() - 0.5) * (baseR * 0.35),
      vx: Math.cos(angle) * speed + (troop.vx || 0) * 0.25,
      vy: Math.sin(angle) * speed - (3.5 + Math.random() * 4.5), // Explosive vertical pop
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.85,
      size: shardSize,
      color: shardColor,
      points: points,
      isChessTroopShatter: true,
      life: 1.0,
      maxLife: 1.0,
      decay: 0.012 + Math.random() * 0.008,
      gravity: 0.32,
      restitution: 0.40 + Math.random() * 0.12,
      isSettled: false
    });
  }
}

/**
 * Renders a single digital crystal glass shard for destroyed chess troops.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} effect
 */
export function drawChessTroopShatterShard(ctx, effect) {
  const points = effect.points;
  ctx.beginPath();
  if (points && points.length >= 3) {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  } else {
    const s = effect.size || 8;
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.65, 0);
    ctx.lineTo(0, s * 0.9);
    ctx.lineTo(-s * 0.65, 0);
  }
  ctx.closePath();

  // 1. Neon Crystal Base Fill
  ctx.fillStyle = effect.color || '#38BDF8';
  ctx.fill();

  // 2. White Specular Glint Ridge
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 3. Crisp Manga Dark Ink Boundary
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4. Digital Square Sparkle Trailing Glint
  if (effect.life > 0.45 && Math.random() < 0.25) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-1.5, -1.5, 3, 3);
  }
}
