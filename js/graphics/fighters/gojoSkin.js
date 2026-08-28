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
      console.warn('Failed to load Gojo body model image at Assets/model/Saturo Gojo.png', e);
      _gojoImageLoading = false;
    };
    img.src = 'Assets/model/Saturo Gojo.png';
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

      ctx.restore();
    }



    // ═══════════════════════════════════════════════════════════════════
    // RENDER GOJO PNG MODEL OR PIXEL ART FALLBACK
    // ═══════════════════════════════════════════════════════════════════
    const r = fighter.r;
    const img = _getGojoImage();

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false; // Crisp nearest-neighbor pixel art scaling
      // Exact centered bounding-box crop of Gojo's character model (sx: 44, sy: 50, sw: 422, sh: 422)
      // Scaled with modelScale 1.15 to match John Wick, Mahito, and Ichigo
      const modelScale = 1.15;
      const drawR = r * modelScale;
      ctx.drawImage(img, 44, 50, 422, 422, -drawR, -drawR, drawR * 2, drawR * 2);
      ctx.restore();

      // Overlays (stun, poison, etc)
      if (typeof fighter.drawStatusOverlays === 'function') {
        fighter.drawStatusOverlays(ctx, fighter.r);
      }
      ctx.restore();
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTHENTIC 1:1 PIXEL ART GOJO SATORU SKIN (64x64 Grid Engine)
    // ═══════════════════════════════════════════════════════════════════
    const P = r / 30; // Pixel grid block unit (60x60 grid spanning circle diameter)

    // Palette Colors matching Reference Image 1
    const C = {
      outline: '#0e0f14',        // Deep dark pixel border
      hairWhite: '#ffffff',      // Pure white hair core
      hairBlue: '#cad6e8',       // Light ice-blue hair partition line
      hairShadow: '#8d9eb5',     // Corner hair shadow dither
      
      blindfoldTop: '#434757',   // Blindfold top highlight band
      blindfoldMid: '#252731',   // Blindfold main charcoal body
      blindfoldCrease: '#13141a',// Blindfold horizontal crease
      blindfoldCorner: '#363a48',// Blindfold corner dither

      skinBase: '#fedbc0',       // Warm fair skin
      skinShadow1: '#e9b796',    // Light cheek shadow dither
      skinShadow2: '#d89f7c',    // Deep cheek shadow dither

      uniformBase: '#262039',    // Deep indigo / midnight purple torso
      uniformHighlight: '#483c6b',// Collar rim / crease highlight
      uniformCrease: '#14121d',  // Collar fold / border crease
      uniformZipper: '#120f1c',  // Central covered zipper placket
      uniformDither: '#181326',  // Bottom perimeter shadow
    };

    const px = (gx, gy, fill) => {
      if (!fill) return;
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(P), Math.round(P));
    };

    const pxRect = (gx, gy, gw, gh, fill) => {
      if (!fill) return;
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(gx * P), Math.round(gy * P), Math.round(gw * P), Math.round(gh * P));
    };

    // Clip to base circle to maintain exact fighter collision silhouette
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    // ── 1. BASE FACE SKIN & CHEEK DITHER ──
    pxRect(-30, -30, 60, 60, C.skinBase);

    // Left & Right Cheek Shadow Dither Matrix
    for (let gy = -1; gy <= 14; gy++) {
      for (let gx = -28; gx <= 28; gx++) {
        const absX = Math.abs(gx);
        if (absX >= 18) {
          const ditherLevel = (absX - 18) / 10; // 0 to 1
          const isChecker1 = (gx + gy) % 2 === 0;
          const isChecker2 = (gx + gy) % 4 === 0;

          if (ditherLevel > 0.65) {
            px(gx, gy, isChecker1 ? C.skinShadow2 : C.skinShadow1);
          } else if (ditherLevel > 0.3) {
            if (isChecker1) px(gx, gy, C.skinShadow1);
          } else if (isChecker2) {
            px(gx, gy, C.skinShadow1);
          }
        }
      }
    }

    // ── 2. WHITE HAIR & ICE-BLUE STRANDS (Top) ──
    pxRect(-30, -30, 60, 20, C.hairWhite);

    // Hair Outer Corner Shadow Dithering
    for (let gy = -30; gy <= -10; gy++) {
      for (let gx = -28; gx <= 28; gx++) {
        const absX = Math.abs(gx);
        if (absX >= 16) {
          const hDist = (absX - 16) / 12;
          if (hDist > 0.6) {
            if ((gx + gy) % 2 === 0) px(gx, gy, C.hairBlue);
            else if ((gx + gy) % 4 === 1) px(gx, gy, C.hairShadow);
          } else if (hDist > 0.25) {
            if ((gx + gy) % 3 === 0) px(gx, gy, C.hairBlue);
          }
        }
      }
    }

    // 2 Curved Vertical Hair Partition Lines (terminating at the raised blindfold tab)
    for (let gy = -26; gy <= -12; gy++) {
      const prog = (gy + 26) / 14; // 0 (top) to 1 (bottom)
      const leftX = Math.round(-6 - prog * 4);
      const rightX = Math.round(6 + prog * 4);

      px(leftX, gy, C.hairBlue);
      px(leftX + 1, gy, C.hairBlue);
      px(rightX, gy, C.hairBlue);
      px(rightX - 1, gy, C.hairBlue);
    }

    // ── 3. SCULPTED CHARCOAL BLINDFOLD (Exact 1:1 Reference Match) ──
    // ── 3.1 Raised Top Center Crest Profile (____/‾‾‾‾\____) ──
    // Center raised tab (gx = -12 to 12, gy = -13 to -10)
    pxRect(-12, -13, 24, 4, C.blindfoldMid);
    // Left & Right lower shoulders (gx < -12 and gx > 12, gy = -10 to -8)
    pxRect(-30, -10, 18, 3, C.blindfoldMid);
    pxRect(12, -10, 18, 3, C.blindfoldMid);

    // ── Top Border Outline (Stepped crest outline) ──
    // Center raised top line
    pxRect(-12, -14, 24, 1, C.outline);
    // Angled shoulder steps
    px(-13, -13, C.outline);
    px(-14, -12, C.outline);
    px(12, -13, C.outline);
    px(13, -12, C.outline);
    // Left & right horizontal top shoulders
    pxRect(-30, -11, 16, 1, C.outline);
    pxRect(14, -11, 16, 1, C.outline);

    // ── Topmost Highlight Rim ──
    pxRect(-12, -13, 24, 1, '#4e5264');
    px(-13, -12, '#4e5264');
    px(12, -12, '#4e5264');
    pxRect(-30, -10, 16, 1, '#4e5264');
    pxRect(14, -10, 16, 1, '#4e5264');

    // ── 3.2 3-Tier Fabric Shading & Double Horizontal Crease Lines ──
    // Tier 1 (Upper Fabric Band)
    pxRect(-12, -12, 24, 4, '#383b4a');
    pxRect(-30, -9, 18, 2, '#383b4a');
    pxRect(12, -9, 18, 2, '#383b4a');

    // Crease 1 (Upper Horizontal Seam Line at gy = -7)
    pxRect(-30, -7, 60, 1, '#181921');

    // Tier 2 (Middle Fabric Band at gy = -6 to -4)
    pxRect(-30, -6, 60, 3, '#292b36');

    // Crease 2 (Lower Dark Shadow Seam Line at gy = -3)
    pxRect(-30, -3, 60, 1, '#12131a');

    // Tier 3 (Lower Fabric Shelf Band at gy = -2 to 1)
    pxRect(-30, -2, 60, 3, '#323544');

    // ── 3.3 Corner Checkerboard Dither Patches (Temples) ──
    for (let gy = -10; gy <= -1; gy++) {
      for (let gx = -28; gx <= 28; gx++) {
        const absX = Math.abs(gx);
        if (absX >= 18) {
          if ((gx + gy) % 2 === 0) {
            px(gx, gy, '#4a4e62');
          }
        }
      }
    }

    // ── 3.4 Organic Stepped Eye Dips & Nose Arch (Bottom Profile) ──
    // Left eye dip fill (gx = -18 to -5, gy = -1 to 1)
    pxRect(-18, -1, 14, 2, '#292b36');
    pxRect(-16, 0, 10, 2, '#292b36');
    pxRect(-14, 1, 6, 1, '#323544'); // Lower shelf highlight

    // Right eye dip fill (gx = 5 to 18, gy = -1 to 1)
    pxRect(4, -1, 14, 2, '#292b36');
    pxRect(6, 0, 10, 2, '#292b36');
    pxRect(8, 1, 6, 1, '#323544');

    // ── Stepped Bottom Perimeter Outline ──
    // Far left outer corner
    pxRect(-30, -2, 10, 1, C.outline);
    px(-20, -1, C.outline);
    // Left eye dip contour
    px(-19, 0, C.outline);
    pxRect(-18, 1, 4, 1, C.outline);
    pxRect(-14, 2, 6, 1, C.outline); // Bottom of left eye dip
    pxRect(-8, 1, 3, 1, C.outline);
    px(-5, 0, C.outline);
    // Center nose bridge arch
    px(-4, -1, C.outline);
    pxRect(-3, -2, 6, 1, C.outline); // Top of nose arch
    px(3, -1, C.outline);
    // Right eye dip contour
    px(4, 0, C.outline);
    pxRect(5, 1, 3, 1, C.outline);
    pxRect(8, 2, 6, 1, C.outline);  // Bottom of right eye dip
    pxRect(14, 1, 4, 1, C.outline);
    px(18, 0, C.outline);
    px(19, -1, C.outline);
    // Far right outer corner
    pxRect(20, -2, 10, 1, C.outline);

    // ── 4. JUJUTSU HIGH HIGH-COLLAR UNIFORM (Bottom: gy >= 7) ──
    // Torso Base Fill
    pxRect(-30, 14, 60, 18, C.uniformBase);

    // Tall Upright Collar Box (gx = -14 to 14, gy = 7 to 14)
    pxRect(-14, 7, 28, 8, C.uniformBase);

    // Outer Slanted Collar Wings (gx = -26 to -14 and 14 to 26)
    for (let step = 0; step < 12; step++) {
      const cxL = -14 - step;
      const cxR = 14 + step;
      const cy = 7 + Math.round(step * 0.65);
      pxRect(cxL, cy, 1, 30 - cy, C.uniformBase);
      pxRect(cxR, cy, 1, 30 - cy, C.uniformBase);
      px(cxL, cy, C.outline); // Collar outer rim
      px(cxR, cy, C.outline);
    }

    // Collar Top Horizontal Rim Outline
    pxRect(-14, 7, 28, 1, C.outline);
    pxRect(-14, 8, 28, 1, C.uniformHighlight); // Rim top highlight
    pxRect(-14, 7, 1, 7, C.outline);
    pxRect(13, 7, 1, 7, C.outline);

    // ── Horizontal Ribbed Collar Creases ──
    // Upper Collar Creases (Rib 1)
    pxRect(-13, 10, 10, 1, C.uniformCrease);
    pxRect(-13, 9, 10, 1, C.uniformHighlight);
    pxRect(3, 10, 10, 1, C.uniformCrease);
    pxRect(3, 9, 10, 1, C.uniformHighlight);

    // Lower Collar Creases (Rib 2)
    pxRect(-16, 13, 13, 1, C.uniformCrease);
    pxRect(-16, 12, 13, 1, C.uniformHighlight);
    pxRect(3, 13, 13, 1, C.uniformCrease);
    pxRect(3, 12, 13, 1, C.uniformHighlight);

    // Mid-Chest Horizontal Seam Lines
    pxRect(-24, 17, 21, 1, C.uniformCrease);
    pxRect(-24, 16, 21, 1, C.uniformHighlight);
    pxRect(3, 17, 21, 1, C.uniformCrease);
    pxRect(3, 16, 21, 1, C.uniformHighlight);

    // ── Central Covered Zipper / Button Placket Strip ──
    pxRect(-2, 7, 4, 24, C.uniformZipper);
    pxRect(-3, 7, 1, 24, C.outline);
    pxRect(2, 7, 1, 24, C.outline);
    pxRect(-2, 8, 1, 22, C.uniformHighlight); // Zipper left specular line

    // ── Uniform Bottom Perimeter Dither Shading ──
    for (let gy = 20; gy <= 30; gy++) {
      for (let gx = -28; gx <= 28; gx++) {
        const uDist = (gy - 20) / 10;
        if (uDist > 0.4 && (gx + gy) % 2 === 0) {
          px(gx, gy, C.uniformDither);
        }
      }
    }

    ctx.restore(); // Undo circle clip

    // ── 5. STEPPED CIRCULAR PIXEL BORDER (Exact Circular Outline) ──
    ctx.save();
    for (let a = 0; a < 360; a += 1.2) {
      const rad = (a * Math.PI) / 180;
      const bx = Math.round(Math.cos(rad) * 29.5);
      const by = Math.round(Math.sin(rad) * 29.5);
      pxRect(bx - 1, by - 1, 3, 3, C.outline);
    }
    ctx.restore();

    // Overlays (stun, poison, etc)
    if (typeof fighter.drawStatusOverlays === 'function') {
      fighter.drawStatusOverlays(ctx, fighter.r);
    }

    ctx.restore();
}
