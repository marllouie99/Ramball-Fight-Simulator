// ─────────────────────────────────────────────
// SUKUNA FIGHTER SKIN & FACIAL TATTOO VISUALS
// Authentic 1:1 Procedural Pixel Art Model (King of Curses)
// Minimalist circle brawler aesthetic, upright front POV, faceless (Rule #19)
// ─────────────────────────────────────────────

/**
 * Authentic 1:1 Procedural Pixel Art Body for Ryomen Sukuna
 * Uses discrete stepped rasterization loop with zero subpixel bleed.
 */
export function drawSukunaPixelBody(ctx, r, fighter = null) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Palette Colors for Ryomen Sukuna
  const C = {
    outline: '#0E0F14',        // Deep dark pixel border
    tattooBlack: '#121118',    // Deep high-contrast tattoo black
    tattooAccent: '#281E24',   // Tattoo edge shade

    hairPink: '#C44E58',       // Sukuna base spiky pink
    hairCrown: '#E86E78',      // Top hair crown highlight
    hairMid: '#D45C66',        // Mid hair highlight
    hairShadow: '#8E2832',     // Bang tip shadow
    hairUndercut: '#1A1114',   // Dark undercut roots

    skinBase: (fighter && fighter.color) ? fighter.color : '#E8B4A2', // Pale crimson-tinged flesh tone
    skinHighlight: '#F5CDC0',  // Forehead & brow skin highlight
    skinShadow1: '#D09A88',    // Soft cheek shadow dither
    skinShadow2: '#B87A68',    // Deep jawline / neck shadow

    kimonoWhite: '#F4F4EC',    // Heian white robe
    kimonoShadow: '#D2D2C6',   // Robe fold shadow
    kimonoInner: '#1E1B26',    // Inner black collar wrap
    kimonoRed: '#8B1E2B'       // Crimson sash / trim
  };

  // Asymmetric spiky hairline calculation: 5 distinct spikes across forehead
  function getHairlineY(rx) {
    const nx = rx / r; // -1.0 to +1.0
    // 5 spikes: peaks at -0.65, -0.32, 0.0, +0.32, +0.65
    const wave = Math.abs(Math.sin((nx + 0.16) * Math.PI * 3.2));
    const centralExt = (1.0 - Math.abs(nx) * 0.22);
    return -r * 0.42 + r * 0.22 * centralExt * Math.pow(wave, 1.3);
  }

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

      const nx = rx / r; // -1.0 to +1.0
      const ny = ry / r; // -1.0 to +1.0
      const absX = Math.abs(nx);
      const hairlineY = getHairlineY(rx);

      // ──────────────────────────────────────────
      // ZONE 1: SPIKY PINK HAIR & DARK UNDERCUTS (ry < hairlineY)
      // ──────────────────────────────────────────
      if (ry < hairlineY) {
        let col = C.hairPink;
        if (ry < -r * 0.72) {
          col = C.hairCrown;
        } else if (ry < -r * 0.52 && absX < 0.45) {
          col = C.hairMid;
        } else if (ry > hairlineY - P * 2.0) {
          col = C.hairShadow;
        } else if (absX > 0.70) {
          col = C.hairShadow;
        }

        // Dark Sukuna undercuts around sides / temples
        if (ry > -r * 0.52 && absX > 0.52) {
          col = C.hairUndercut;
        }

        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: SUKUNA FACE & CURSED TATTOO MARKINGS (hairlineY <= ry < r * 0.38)
      // ──────────────────────────────────────────
      else if (ry < r * 0.38) {
        let isTattoo = false;

        // A. Forehead Central Diamond / Dot (ny ~ -0.28, absX <= 0.05)
        if (absX <= 0.05 && Math.abs(ny - (-0.28)) <= 0.045) isTattoo = true;

        // B. Forehead Chevrons ┌ and ┐ (nx ~ ±0.20 to ±0.34, ny ~ -0.32 to -0.16)
        const isChevronHoriz = (absX >= 0.16 && absX <= 0.32 && Math.abs(ny - (-0.28)) <= P / r * 0.7);
        const isChevronVert = (Math.abs(absX - 0.20) <= P / r * 0.7 && ny >= -0.28 && ny <= -0.14);
        const isChevronTip = (absX >= 0.20 && absX <= 0.28 && Math.abs(ny - (-0.14)) <= P / r * 0.7);
        if (isChevronHoriz || isChevronVert || isChevronTip) isTattoo = true;

        // C. Eye Slit Line Tattoos (nx ~ ±0.26 to ±0.48, ny ~ -0.06)
        if (absX >= 0.24 && absX <= 0.48 && Math.abs(ny - (-0.06)) <= P / r * 0.7) isTattoo = true;

        // D. Jagged Cheek Lightning Tattoos (nx ~ ±0.42 to ±0.78, ny ~ -0.02 to 0.22)
        const isCheekUpper = (Math.abs(ny - (0.02 + (absX - 0.40) * 0.30)) <= P / r * 0.8 && absX >= 0.40 && absX <= 0.70);
        const isCheekBranch = (Math.abs(ny - (0.12 - (absX - 0.50) * 0.20)) <= P / r * 0.8 && absX >= 0.50 && absX <= 0.78);
        const isCheekLower = (Math.abs(absX - 0.56) <= P / r * 0.8 && ny >= 0.06 && ny <= 0.22);
        if (isCheekUpper || isCheekBranch || isCheekLower) isTattoo = true;

        // E. Jawline Wrapping Band (nx ~ ±0.28 to ±0.82, ny ~ 0.26 to 0.36)
        const isJawBand = (Math.abs(ny - (0.24 + (absX - 0.28) * 0.14)) <= P / r * 0.8 && absX >= 0.28 && absX <= 0.82);
        if (isJawBand) isTattoo = true;

        if (isTattoo) {
          ctx.fillStyle = C.tattooBlack;
        } else {
          // Base Flesh Skin Tone
          let col = C.skinBase;
          if (ny < -0.15 && absX < 0.38) {
            col = C.skinHighlight;
          } else if (absX >= 0.55) {
            const dLevel = (absX - 0.55) / 0.40;
            if (dLevel > 0.5) {
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
      // ZONE 3: HEIAN KIMONO ROBE & CHIN CURSED MARKS (ry >= r * 0.38)
      // ──────────────────────────────────────────
      else {
        // F. 3 Upward Chin Spikes / Triangles on Center Chin
        const isChinCenter = (absX <= 0.04 && ny >= 0.38 && ny <= 0.50);
        const isChinLeft = (Math.abs(nx - (-0.12)) <= 0.035 && ny >= 0.40 && ny <= 0.48);
        const isChinRight = (Math.abs(nx - 0.12) <= 0.035 && ny >= 0.40 && ny <= 0.48);
        const isChinTattoo = (isChinCenter || isChinLeft || isChinRight);

        // G. Open V-Neck Collar & White Heian Robe (ny >= 0.46)
        const vNeckHalfW = Math.max(0, (ny - 0.36) * 0.42);
        const isVNeckSkin = (ny <= 0.60 && absX <= vNeckHalfW);
        const isInnerCollar = (absX >= vNeckHalfW && absX <= vNeckHalfW + 0.07 && ny >= 0.44);
        const isRedTrim = (absX >= vNeckHalfW + 0.07 && absX <= vNeckHalfW + 0.11 && ny >= 0.46);

        if (isChinTattoo) {
          ctx.fillStyle = C.tattooBlack;
        } else if (isVNeckSkin) {
          ctx.fillStyle = (ny > 0.48) ? C.skinShadow2 : C.skinShadow1;
        } else if (isInnerCollar) {
          ctx.fillStyle = C.kimonoInner;
        } else if (isRedTrim) {
          ctx.fillStyle = C.kimonoRed;
        } else {
          // White Heian Robe
          let col = C.kimonoWhite;
          if (absX > 0.65 || ny > 0.82) {
            col = ((gx + gy) % 2 === 0) ? C.kimonoShadow : C.kimonoWhite;
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Ryomen Sukuna
 */
export function drawSukunaBody(ctx, fighter) {
  const z = fighter.z || 0;
  const r = fighter.r;

  // Ground shadow when levitating
  if (z > 0) {
    const levFactor = Math.min(1.0, z / 35);
    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    ctx.scale(1.0, 0.35);

    const shadowGlow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6);
    shadowGlow.addColorStop(0, `rgba(0, 0, 0, ${0.7 * levFactor})`);
    shadowGlow.addColorStop(0.5, `rgba(0, 0, 0, ${0.4 * levFactor})`);
    shadowGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = shadowGlow;
    ctx.fill();

    ctx.restore();
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y - z);

  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);
  ctx.rotate(angle);

  // Mirror Y-axis vertically so hair stays on top (-Y) and body on bottom (+Y) when moving/aiming left (Rule #19)
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 1. Procedural Pixel Art Body with Stepped Outer Black Stroke
  drawSukunaPixelBody(ctx, r, fighter);

  // 2. Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
