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

// Preload immediately if running in browser
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getGojoImage();
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

    // === ANIME CHARACTER ROTATION LOGIC (Matches Yuji & Todo) ===
    const isCountdown = typeof state !== 'undefined' && state.gameState === 'countdown';
    const isWinnerScreen = fighter._isWinnerReveal || isCountdown || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd' || state.gameState === 'indexDetail' || state.gameState === 'index'));
    const isFloatingOrChanneling = isWinnerScreen || (z > 0) || fighter.isChannelingPurple || ((fighter.redEffectTimer || 0) > 0) || fighter.isChannelingDomainExpansion;

    if (!isFloatingOrChanneling) {
      const angle = fighter.gunAngle || 0;
      ctx.rotate(angle);

      const facingLeft = Math.abs(angle) > Math.PI / 2;
      if (facingLeft) {
        ctx.scale(1, -1);
      }
    }

    // === PIXEL ART GOJO LIMITLESS (INFINITY) SPATIAL DISTORTION BARRIER ===
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
      const pxSize = 2.5; // Stepped pixel grid size for barrier

      ctx.save();
      ctx.globalAlpha = (ctx.globalAlpha || 1.0) * fadeOpacity;

      // ── 1. Soft Pixel Atmosphere Aura Fill ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, barrierRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.16)';
      ctx.fill();
      ctx.restore();

      // ── 2. Clean Stepped Concentric Pixel Perimeter Rings ──
      // 2.1 Dark Outer Spatial Outline Ring
      ctx.fillStyle = 'rgba(8, 18, 32, 0.85)';
      for (let a = 0; a < 360; a += 0.8) {
        const rad = (a * Math.PI) / 180;
        const bx = Math.round((Math.cos(rad) * (barrierRadius + pxSize)) / pxSize) * pxSize;
        const by = Math.round((Math.sin(rad) * (barrierRadius + pxSize)) / pxSize) * pxSize;
        ctx.fillRect(bx, by, pxSize, pxSize);
      }

      // 2.2 Electric Cyan Primary Pixel Ring
      ctx.fillStyle = 'rgba(0, 229, 255, 0.95)';
      for (let a = 0; a < 360; a += 0.8) {
        const rad = (a * Math.PI) / 180;
        const bx = Math.round((Math.cos(rad) * barrierRadius) / pxSize) * pxSize;
        const by = Math.round((Math.sin(rad) * barrierRadius) / pxSize) * pxSize;
        ctx.fillRect(bx, by, pxSize, pxSize);
      }

      // 2.3 Inner White-Hot Specular Core Pixel Ring
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      for (let a = 0; a < 360; a += 0.8) {
        const rad = (a * Math.PI) / 180;
        const bx = Math.round((Math.cos(rad) * (barrierRadius - pxSize)) / pxSize) * pxSize;
        const by = Math.round((Math.sin(rad) * (barrierRadius - pxSize)) / pxSize) * pxSize;
        ctx.fillRect(bx, by, pxSize, pxSize);
      }

      // ── 2.4 Active Impact Rebound Shockwave Ripple Ring ──
      if (fighter.infinityBlockTimer > 0) {
        const blockMax = fighter.infinityBlockMaxTimer || 25;
        const blockProgress = 1.0 - (fighter.infinityBlockTimer / blockMax); // 0.0 -> 1.0
        const rippleRadius = barrierRadius + blockProgress * 32;
        const rippleAlpha = (1.0 - blockProgress) * 0.95;

        // Dark Outer Spatial Border
        ctx.strokeStyle = `rgba(8, 20, 36, ${rippleAlpha * 0.85})`;
        ctx.lineWidth = Math.max(1, 6 * (1.0 - blockProgress));
        ctx.beginPath();
        ctx.arc(0, 0, rippleRadius + 2, 0, Math.PI * 2);
        ctx.stroke();

        // Expanding Electric Cyan Impact Ring
        ctx.strokeStyle = `rgba(0, 229, 255, ${rippleAlpha})`;
        ctx.lineWidth = Math.max(1, 4 * (1.0 - blockProgress));
        ctx.beginPath();
        ctx.arc(0, 0, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Expanding White Impact Core
        ctx.strokeStyle = `rgba(255, 255, 255, ${rippleAlpha})`;
        ctx.lineWidth = Math.max(1, 2 * (1.0 - blockProgress));
        ctx.beginPath();
        ctx.arc(0, 0, rippleRadius - 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }



    // ═══════════════════════════════════════════════════════════════════
    // AUTHENTIC 1:1 PROCEDURAL PIXEL ART GOJO SATORU SKIN (Discrete Pixel Grid Engine)
    // ═══════════════════════════════════════════════════════════════════
    drawGojoPixelBody(ctx, fighter.r);

    // Overlays (stun, poison, etc)
    if (typeof fighter.drawStatusOverlays === 'function') {
      fighter.drawStatusOverlays(ctx, fighter.r);
    }

    ctx.restore();
}

/**
 * Authentic 1:1 Procedural Pixel Art Body for Gojo Satoru
 * Uses discrete stepped rasterization loop with zero subpixel bleed.
 */
export function drawGojoPixelBody(ctx, r) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
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
        ctx.fillStyle = C.outline;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Normalized coordinates from -1.0 to +1.0
      const nx = rx / r;
      const ny = ry / r;
      const absX = Math.abs(nx);

      // ──────────────────────────────────────────
      // 1. SCULPTED CHARCOAL BLINDFOLD GEOMETRY (1:1 Anime Reference)
      // ──────────────────────────────────────────
      // Top edge: Sleek, clean forehead line (-0.28) without bulky upward central bump
      const getBlindfoldTopY = (ax) => {
        return -0.28;
      };

      // Bottom edge: Distinct concave nose arch at center, smooth dual eye-cover dips (+0.10), tapering back up to temples
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
          ctx.fillStyle = C.outline;
        } else {
          let col = C.hairWhite;
          // Outer corner dither
          if (absX >= 0.55) {
            const dLevel = (absX - 0.55) / 0.45;
            if (dLevel > 0.5) {
              col = ((gx + gy) % 2 === 0) ? C.hairBlue : C.hairShadow;
            } else if ((gx + gy) % 3 === 0) {
              col = C.hairBlue;
            }
          }
          // Curved vertical hair partition lines
          else if (Math.abs(absX - (0.20 + (ny + 1.0) * 0.12)) <= P / r * 1.2) {
            col = C.hairBlue;
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
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
          ctx.fillStyle = C.outline;
        } else {
          let col = C.blindfoldMid;

          // Top highlight sheen rim
          if (ny < blindfoldTopY + 0.05) {
            col = C.blindfoldTop;
          }
          // Dual eye bulge silk leather specular reflection (matching anime reference)
          else if (absX >= 0.18 && absX <= 0.60 && ny >= -0.20 && ny <= 0.04) {
            const eyeCenterX = 0.39;
            const eyeDist = Math.hypot((absX - eyeCenterX) * 1.5, ny - (-0.08));
            if (eyeDist <= 0.10) {
              col = '#484C5E'; // Center eye bulge glint
            } else if (eyeDist <= 0.18) {
              col = '#383B4A'; // Secondary eye sheen
            } else if (Math.abs(ny - (-0.14)) <= P / r * 0.7) {
              col = C.blindfoldCrease1; // Fabric tension crease
            }
          }
          // Crease line in center nose region
          else if (absX <= 0.12 && Math.abs(ny - (-0.14)) <= P / r * 0.7) {
            col = C.blindfoldCrease1;
          }
          // Lower shadow shelf
          else if (ny >= blindfoldBottomY - 0.05) {
            col = C.blindfoldCrease2;
          }

          // Temple corner dither
          if (absX >= 0.62 && (gx + gy) % 2 === 0) {
            col = C.blindfoldCorner;
          }

          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE C: WARM FAIR SKIN & CHEEKS (blindfoldBottomY <= ny < 0.24)
      // ──────────────────────────────────────────
      else if (ny < 0.24) {
        if (isInsideBlindfold(nx, ny - P / r)) {
          ctx.fillStyle = C.outline;
        } else {
          let col = C.skinBase;
          // Left & right cheek shadow dither
          if (absX >= 0.55) {
            const dLevel = (absX - 0.55) / 0.45;
            if (dLevel > 0.6) {
              col = ((gx + gy) % 2 === 0) ? C.skinShadow2 : C.skinShadow1;
            } else if ((gx + gy) % 2 === 0) {
              col = C.skinShadow1;
            }
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE D: JUJUTSU HIGH UNIFORM (ny >= 0.24)
      // ──────────────────────────────────────────
      else {
        // Center covered zipper placket (-0.06 <= nx <= 0.06)
        const isZipper = (absX <= 0.07);
        const isZipperSeam = (Math.abs(absX - 0.07) <= P / r * 0.6);
        const isZipperHighlight = (nx >= -0.06 && nx <= -0.03 && ny >= 0.28);

        // Collar top horizontal rim (ny ~ 0.24)
        const isCollarRim = (ny <= 0.27 && absX <= 0.50);
        const isCollarHighlight = (ny >= 0.27 && ny <= 0.30 && absX <= 0.50);

        // Horizontal ribbed collar creases (ny ~ 0.34 and ny ~ 0.44)
        const isCrease1 = (Math.abs(ny - 0.35) <= P / r * 0.7 && absX <= 0.55);
        const isCrease1Hi = (Math.abs(ny - 0.32) <= P / r * 0.7 && absX <= 0.55);
        const isCrease2 = (Math.abs(ny - 0.46) <= P / r * 0.7 && absX <= 0.65);
        const isCrease2Hi = (Math.abs(ny - 0.43) <= P / r * 0.7 && absX <= 0.65);

        if (isZipperHighlight) {
          ctx.fillStyle = C.uniformHighlight;
        } else if (isZipperSeam) {
          ctx.fillStyle = C.outline;
        } else if (isZipper) {
          ctx.fillStyle = C.uniformZipper;
        } else if (isCollarRim) {
          ctx.fillStyle = C.outline;
        } else if (isCollarHighlight) {
          ctx.fillStyle = C.uniformHighlight;
        } else if (isCrease1 || isCrease2) {
          ctx.fillStyle = C.uniformCrease;
        } else if (isCrease1Hi || isCrease2Hi) {
          ctx.fillStyle = C.uniformHighlight;
        } else {
          let col = C.uniformBase;
          if (absX > 0.68 || ny > 0.82) {
            if ((gx + gy) % 2 === 0) col = C.uniformDither;
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}
