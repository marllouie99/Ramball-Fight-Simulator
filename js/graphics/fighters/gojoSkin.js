import { CONFIG } from '../../core/config.js';

let _gojoImage = null;
let _gojoImageLoading = false;

/**
 * Preload and retrieve Gojo's PNG model
 */
function _getGojoImage() {
  if (_gojoImage && _gojoImage.complete && _gojoImage.naturalWidth > 0) {
    return _gojoImage;
  }
  if (!_gojoImageLoading && typeof Image !== 'undefined') {
    _gojoImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _gojoImage = img;
      _gojoImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Gojo pixel body model image at Assets/model/Saturo-Gojo-PIXEL-SKIN.png', e);
      _gojoImageLoading = false;
    };
    img.src = 'Assets/model/Saturo-Gojo-PIXEL-SKIN.png?v=1';
    _gojoImage = img;
  }
  return _gojoImage;
}

// Offscreen Low-Res Nearest-Neighbor Arcade Buffer for Gojo's Limitless Infinity Barrier
let _gojoInfinityArcadeCanvas = null;
let _gojoInfinityArcadeCtx = null;
let _gojoInfinityArcadeSize = 0;

function _getGojoInfinityArcadeBuffer(size, scale = 2.5) {
  const lowSize = Math.max(32, Math.ceil(size / scale));
  if (!_gojoInfinityArcadeCanvas || _gojoInfinityArcadeSize < lowSize) {
    _gojoInfinityArcadeSize = Math.max(128, lowSize);
    _gojoInfinityArcadeCanvas = document.createElement('canvas');
    _gojoInfinityArcadeCanvas.width = _gojoInfinityArcadeSize;
    _gojoInfinityArcadeCanvas.height = _gojoInfinityArcadeSize;
    _gojoInfinityArcadeCtx = _gojoInfinityArcadeCanvas.getContext('2d');
    _gojoInfinityArcadeCtx.imageSmoothingEnabled = false;
  }
  return { canvas: _gojoInfinityArcadeCanvas, ctx: _gojoInfinityArcadeCtx, lowSize, scale };
}

export function drawGojoBody(ctx, fighter) {
    const z = fighter.z || 0;
    
    // Draw high-contrast ground shadow silhouette when levitating in the air
    if (z > 0) {
      const levFactor = Math.min(1.0, z / 35);
      ctx.save();
      ctx.translate(fighter.x, fighter.y);
      ctx.scale(1.0, 0.35); // Perspective ground flattening

      // 1. Soft Ambient Radial Ground Shadow
      const shadowGlow = ctx.createRadialGradient(0, 0, fighter.r * 0.2, 0, 0, fighter.r * 1.6);
      shadowGlow.addColorStop(0, `rgba(0, 0, 0, ${0.7 * levFactor})`);
      shadowGlow.addColorStop(0.5, `rgba(0, 0, 0, ${0.4 * levFactor})`);
      shadowGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, fighter.r * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = shadowGlow;
      ctx.fill();

      // 2. High-Contrast Dark Ground Silhouette Core
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r * (1.1 - levFactor * 0.25), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(10, 10, 15, ${0.8 * levFactor})`;
      ctx.fill();

      ctx.restore();
    }

    ctx.save();
    ctx.translate(fighter.x, fighter.y - z);

    // === ANIME CHARACTER ROTATION LOGIC (Rule 19 Standard) ===
    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const isWinnerScreen = fighter._isWinnerReveal || isCountdown || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'indexDetail' || state.gameState === 'index'));
    const is200Cinematic = fighter.isChannelingPurple && (fighter.is200PercentChannel || fighter.purpleUseCount === 1);

    if (!isWinnerScreen && !is200Cinematic) {
      const angle = fighter.gunAngle || 0;
      ctx.rotate(angle);

      const facingLeft = Math.abs(angle) > Math.PI / 2;
      if (facingLeft) {
        ctx.scale(1, -1);
      }
    }

    // === PIXEL ART GOJO LIMITLESS (INFINITY) SPATIAL DISTORTION BARRIER (Arcade Buffer) ===
    const isSaitamaCounterActive = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
      f && (f.characterId === 'saitama' || f.type === 'saitama') && 
      ((f._counterPunchTimer && f._counterPunchTimer > 0) || 
       (f._postCounterRecoveryTimer && f._postCounterRecoveryTimer > 0) || 
       (f._counterWindupTimer && f._counterWindupTimer > 0) ||
       f.isCountering)
    );
    const isBarrierSuppressed = Boolean(fighter.isTargetOfAmbush || fighter.caughtInSaitamaCounter || isSaitamaCounterActive);
    const fadeOpacity = isBarrierSuppressed ? 0 : (fighter.infinityFadeOpacity || 0);
    if (fadeOpacity > 0.005) {
      const time = Date.now();
      const infinityR = CONFIG.gojo?.infinityRadius ?? (fighter.r + 30);
      const pulse = Math.sin(time * 0.005) * 2.0;
      
      // Expanding bloom scale during fade-in (0.88 -> 1.0)
      const sizeScale = 0.88 + 0.12 * Math.sin(fadeOpacity * Math.PI * 0.5);
      const barrierRadius = (infinityR + pulse) * sizeScale;

      const ARCADE_SCALE = 2.5;
      const fullDiam = (barrierRadius + 8) * 2;
      const { canvas: lowCanvas, ctx: lowCtx, lowSize } = _getGojoInfinityArcadeBuffer(fullDiam, ARCADE_SCALE);

      lowCtx.clearRect(0, 0, lowSize, lowSize);
      lowCtx.imageSmoothingEnabled = false;

      const lowCenter = lowSize / 2;
      const lowRadius = barrierRadius / ARCADE_SCALE;
      const lowPx = 1.0;

      // 1. Soft Pixel Atmosphere Aura Fill
      lowCtx.beginPath();
      lowCtx.arc(lowCenter, lowCenter, lowRadius, 0, Math.PI * 2);
      lowCtx.fillStyle = 'rgba(0, 229, 255, 0.18)';
      lowCtx.fill();

      // 2. Dark Outer Spatial Outline Ring
      lowCtx.lineWidth = 1.6;
      lowCtx.strokeStyle = 'rgba(8, 18, 32, 0.90)';
      lowCtx.beginPath();
      lowCtx.arc(lowCenter, lowCenter, lowRadius + lowPx, 0, Math.PI * 2);
      lowCtx.stroke();

      // 3. Electric Cyan Primary Pixel Ring
      lowCtx.lineWidth = 1.2;
      lowCtx.strokeStyle = 'rgba(0, 229, 255, 0.98)';
      lowCtx.beginPath();
      lowCtx.arc(lowCenter, lowCenter, lowRadius, 0, Math.PI * 2);
      lowCtx.stroke();

      // 4. Inner White-Hot Specular Core Pixel Ring
      lowCtx.lineWidth = 0.9;
      lowCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      lowCtx.beginPath();
      lowCtx.arc(lowCenter, lowCenter, lowRadius - lowPx, 0, Math.PI * 2);
      lowCtx.stroke();

      // 5. Blit Low-Res Native Arcade Buffer to Main Canvas via Nearest-Neighbor Upscaling
      ctx.save();
      ctx.globalAlpha = (ctx.globalAlpha || 1.0) * fadeOpacity;
      ctx.imageSmoothingEnabled = false; // Chunky stepped retro arcade pixel circles!
      const drawSize = lowSize * ARCADE_SCALE;
      ctx.drawImage(lowCanvas, 0, 0, lowSize, lowSize, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTHENTIC 1:1 PROCEDURAL PIXEL ART GOJO SATORU SKIN (High Performance Offscreen Cached)
    // ═══════════════════════════════════════════════════════════════════
    drawGojoPixelBody(ctx, fighter.r);

    // Overlays (stun, poison, etc)
    if (typeof fighter.drawStatusOverlays === 'function') {
      fighter.drawStatusOverlays(ctx, fighter.r);
    }

    ctx.restore();
}

// Offscreen canvas cache for Gojo's pixel body model (avoids 1,200 fillRect calls per frame)
let _cachedGojoCanvas = null;
let _cachedGojoR = 0;

function _renderGojoPixelBodyToCanvas(destCtx, r) {
  destCtx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Palette Colors matching 1:1 Reference
  const C = {
    outline: '#0E0F14',        // Deep dark pixel border
    hairWhite: '#FFFFFF',      // Pure white hair core
    hairBlue: '#CAD6E8',       // Light ice-blue hair partition line
    hairShadow: '#8D9EB5',     // Corner hair shadow dither

    blindfoldHighlight: '#4E5264', // Topmost highlight rim
    blindfoldTop: '#434757',   // Blindfold top highlight band
    blindfoldMid: '#252731',   // Blindfold main charcoal body
    blindfoldTier1: '#383B4A', // Upper fabric band
    blindfoldCrease1: '#181921', // Upper horizontal crease seam
    blindfoldTier2: '#292B36', // Middle fabric band
    blindfoldCrease2: '#12131A', // Lower dark shadow seam line
    blindfoldTier3: '#323544', // Lower fabric shelf band
    blindfoldCorner: '#4A4E62', // Temple corner dither

    skinBase: '#FEDBC0',       // Warm fair skin
    skinShadow1: '#E9B796',    // Light cheek shadow dither
    skinShadow2: '#D89F7C',    // Deep cheek shadow dither

    uniformBase: '#262039',    // Deep indigo / midnight purple torso
    uniformHighlight: '#483C6B', // Collar rim / crease highlight
    uniformCrease: '#14121D',  // Collar fold / border crease
    uniformZipper: '#120F1C',  // Central covered zipper placket
    uniformDither: '#181326'   // Bottom perimeter shadow
  };

  const cx = destCtx.canvas.width / 2;
  const cy = destCtx.canvas.height / 2;

  destCtx.save();
  destCtx.translate(cx, cy);

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // ──────────────────────────────────────────
      // 0. PIXELATED BLACK STROKE BORDER
      // ──────────────────────────────────────────
      if (
        Math.hypot(rx + P, ry) > r ||
        Math.hypot(rx - P, ry) > r ||
        Math.hypot(rx, ry + P) > r ||
        Math.hypot(rx, ry - P) > r
      ) {
        destCtx.fillStyle = C.outline;
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      // Normalized coordinates from -1.0 to +1.0
      const nx = rx / r;
      const ny = ry / r;
      const absX = Math.abs(nx);

      // ──────────────────────────────────────────
      // 1. SCULPTED CHARCOAL BLINDFOLD GEOMETRY (1:1 Anime Reference)
      // ──────────────────────────────────────────
      const getBlindfoldTopY = (ax) => {
        return -0.28;
      };

      const getBlindfoldBottomY = (ax) => {
        if (ax <= 0.82) {
          return -0.02 + 0.12 * Math.sin(ax * (Math.PI / 0.82));
        }
        return -0.02 - (ax - 0.82) * 0.15;
      };

      const isInsideBlindfold = (x, y) => {
        const ax = Math.abs(x);
        return y >= getBlindfoldTopY(ax) && y < getBlindfoldBottomY(ax);
      };

      const blindfoldTopY = getBlindfoldTopY(absX);
      const blindfoldBottomY = getBlindfoldBottomY(absX);

      // ──────────────────────────────────────────
      // ZONE A: WHITE HAIR & ICE-BLUE STRANDS (ny < blindfoldTopY)
      // ──────────────────────────────────────────
      if (ny < blindfoldTopY) {
        if (isInsideBlindfold(nx, ny + P / r)) {
          destCtx.fillStyle = C.outline;
        } else {
          let col = C.hairWhite;
          if (absX >= 0.55) {
            const dLevel = (absX - 0.55) / 0.45;
            if (dLevel > 0.5) {
              col = ((gx + gy) % 2 === 0) ? C.hairBlue : C.hairShadow;
            } else if ((gx + gy) % 3 === 0) {
              col = C.hairBlue;
            }
          } else if (Math.abs(absX - (0.20 + (ny + 1.0) * 0.12)) <= P / r * 1.2) {
            col = C.hairBlue;
          }
          destCtx.fillStyle = col;
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE B: SCULPTED CHARCOAL BLINDFOLD (isInsideBlindfold)
      // ──────────────────────────────────────────
      else if (ny < blindfoldBottomY) {
        const isBorder = !isInsideBlindfold(nx, ny - P / r) ||
                         !isInsideBlindfold(nx, ny + P / r) ||
                         !isInsideBlindfold(nx - P / r, ny) ||
                         !isInsideBlindfold(nx + P / r, ny);

        if (isBorder) {
          destCtx.fillStyle = C.outline;
        } else {
          let col = C.blindfoldMid;

          if (ny < blindfoldTopY + 0.05) {
            col = C.blindfoldTop;
          } else if (absX >= 0.18 && absX <= 0.60 && ny >= -0.20 && ny <= 0.04) {
            const eyeCenterX = 0.39;
            const eyeDist = Math.hypot((absX - eyeCenterX) * 1.5, ny - (-0.08));
            if (eyeDist <= 0.10) {
              col = '#484C5E';
            } else if (eyeDist <= 0.18) {
              col = '#383B4A';
            } else if (Math.abs(ny - (-0.14)) <= P / r * 0.7) {
              col = C.blindfoldCrease1;
            }
          } else if (absX <= 0.12 && Math.abs(ny - (-0.14)) <= P / r * 0.7) {
            col = C.blindfoldCrease1;
          } else if (ny >= blindfoldBottomY - 0.05) {
            col = C.blindfoldCrease2;
          }

          if (absX >= 0.62 && (gx + gy) % 2 === 0) {
            col = C.blindfoldCorner;
          }

          destCtx.fillStyle = col;
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE C: WARM FAIR SKIN & CHEEKS (blindfoldBottomY <= ny < 0.24)
      // ──────────────────────────────────────────
      else if (ny < 0.24) {
        if (isInsideBlindfold(nx, ny - P / r)) {
          destCtx.fillStyle = C.outline;
        } else {
          let col = C.skinBase;
          if (absX >= 0.55) {
            const dLevel = (absX - 0.55) / 0.45;
            if (dLevel > 0.6) {
              col = ((gx + gy) % 2 === 0) ? C.skinShadow2 : C.skinShadow1;
            } else if ((gx + gy) % 2 === 0) {
              col = C.skinShadow1;
            }
          }
          destCtx.fillStyle = col;
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE D: JUJUTSU HIGH UNIFORM (ny >= 0.24)
      // ──────────────────────────────────────────
      else {
        const isZipper = (absX <= 0.07);
        const isZipperSeam = (Math.abs(absX - 0.07) <= P / r * 0.6);
        const isZipperHighlight = (nx >= -0.06 && nx <= -0.03 && ny >= 0.28);

        const isCollarRim = (ny <= 0.27 && absX <= 0.50);
        const isCollarHighlight = (ny >= 0.27 && ny <= 0.30 && absX <= 0.50);

        const isCrease1 = (Math.abs(ny - 0.35) <= P / r * 0.7 && absX <= 0.55);
        const isCrease1Hi = (Math.abs(ny - 0.32) <= P / r * 0.7 && absX <= 0.55);
        const isCrease2 = (Math.abs(ny - 0.46) <= P / r * 0.7 && absX <= 0.65);
        const isCrease2Hi = (Math.abs(ny - 0.43) <= P / r * 0.7 && absX <= 0.65);

        if (isZipperHighlight) {
          destCtx.fillStyle = C.uniformHighlight;
        } else if (isZipperSeam) {
          destCtx.fillStyle = C.outline;
        } else if (isZipper) {
          destCtx.fillStyle = C.uniformZipper;
        } else if (isCollarRim) {
          destCtx.fillStyle = C.outline;
        } else if (isCollarHighlight) {
          destCtx.fillStyle = C.uniformHighlight;
        } else if (isCrease1 || isCrease2) {
          destCtx.fillStyle = C.uniformCrease;
        } else if (isCrease1Hi || isCrease2Hi) {
          destCtx.fillStyle = C.uniformHighlight;
        } else {
          let col = C.uniformBase;
          if (absX > 0.68 || ny > 0.82) {
            if ((gx + gy) % 2 === 0) col = C.uniformDither;
          }
          destCtx.fillStyle = col;
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Authentic 1:1 Procedural Pixel Art Body for Gojo Satoru (High Performance Offscreen Cached)
 */
export function drawGojoPixelBody(ctx, r) {
  if (!_cachedGojoCanvas || _cachedGojoR !== r) {
    _cachedGojoR = r;
    const size = Math.ceil((r + 4) * 2);
    _cachedGojoCanvas = document.createElement('canvas');
    _cachedGojoCanvas.width = size;
    _cachedGojoCanvas.height = size;
    const offCtx = _cachedGojoCanvas.getContext('2d');
    _renderGojoPixelBodyToCanvas(offCtx, r);
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_cachedGojoCanvas, -_cachedGojoCanvas.width / 2, -_cachedGojoCanvas.height / 2);
  ctx.restore();
}
