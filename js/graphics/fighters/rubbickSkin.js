// ─────────────────────────────────────────────
// Rubbick ("The Grand Magus" / "Trickster") Fighter Skin
// Strictly adheres to:
// - Saitama Tech (100% Discrete 2D Grid-Scan Pixel Art, P = 2.0)
// - Rule 19 (Upright Front POV, No Eyes/Mouth/Nose Minimalist Standard)
// - Rule 20 (Hand Visibility & Skin Only Guard)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { isSuppressedByGetsuga } from '../../entities/fighter.js';
import { isInsideEnemyGojoDomain } from '../../entities/fighters/rubbick/rubbickThemes.js';

const P = 2.0; // 2.0px discrete pixel art grid
const snap = (v) => Math.round(v / P) * P;

/**
 * Helper to compute cubic bezier point
 */
function cubicBezierPt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

/**
 * Helper to compute quadratic bezier point
 */
function quadBezierPt(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

/**
 * Draws Rubbick's entire body circle model in authentic Pixel Art Style ("Saitama Tech").
 * Minimalist circle brawler aesthetic, upright front POV, faceless (Rule #19 compliant).
 * 
 * Character Design (Grand Magus / Arcane Mage):
 * - Zone A: Pointed Wizard Cowl / Hood in dark emerald & mystic plum cloth with gold brow crest
 *           and glowing horizontal neon-green arcane eye/visor aperture slit (faceless).
 * - Zone B: High upturned standing mantle collar tips with gold embroidery, and center chest
 *           embedded Arcane Talisman / Power Gem (stepped neon green diamond with white glint).
 * - Zone C: Ornate gold runic magus sash & brass buckle.
 * - Zone D: Layered wizard robe skirt with shadow folds and emerald edge highlights.
 */
export function drawRubbickPixelBody(ctx, r, isGhost = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const steps = Math.ceil((r + P) / P);

  // Stepped Pixel Fill by Zone (Discrete 2D Grid Scan)
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // 4-Neighbor Attached Stepped Dark Manga Ink Border Shell
      if (
        Math.hypot(rx + P, ry) > r ||
        Math.hypot(rx - P, ry) > r ||
        Math.hypot(rx, ry + P) > r ||
        Math.hypot(rx, ry - P) > r
      ) {
        ctx.fillStyle = isGhost ? 'rgba(8, 18, 11, 0.85)' : '#0A0F0D';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // ── ZONE A: GRAND MAGUS POINTED WIZARD COWL / HOOD & ARCANE VISOR (ry < -r * 0.18) ──
      if (ry < -r * 0.18) {
        // A1. Glowing Horizontal Arcane Eye/Visor Aperture Slit (Rule 19 Compliant: Faceless, purely stylized visor)
        const inVisorBand = (ry >= -r * 0.36 && ry <= -r * 0.22 && Math.abs(rx) <= r * 0.42);
        if (inVisorBand) {
          if (Math.abs(rx) <= r * 0.32 && ry >= -r * 0.32 && ry <= -r * 0.26) {
            // Bright white-green arcane slit core
            if (Math.abs(rx) <= r * 0.12 && ry >= -r * 0.30 && ry <= -r * 0.28) {
              ctx.fillStyle = '#E6FFF0'; // Specular core flare
            } else {
              ctx.fillStyle = '#00FF64'; // Vivid neon-green visor slit
            }
          } else if (Math.abs(rx) <= r * 0.38) {
            ctx.fillStyle = '#008A3B'; // Slit outer energy gradient
          } else {
            ctx.fillStyle = '#080D0A'; // Inner cowl shadow veil
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // A2. Golden Brow Filigree / Crest on Cowl Forehead
        const inBrowCrest = (ry >= -r * 0.52 && ry <= -r * 0.38 && Math.abs(rx) <= r * 0.36);
        if (inBrowCrest) {
          // Center diamond peak
          if (Math.abs(rx) <= r * 0.10 && ry <= -r * 0.46) {
            ctx.fillStyle = '#FFF275'; // Top gold glint
          } else if (Math.abs(rx) <= r * 0.24 && ry <= -r * 0.42) {
            ctx.fillStyle = '#E5B824'; // Rich gold plate
          } else {
            ctx.fillStyle = '#8C6808'; // Gold shadow/edge
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // A3. Hood Pointed Peak & Cloth Folds
        if (ry < -r * 0.65) {
          // Top hood peak
          if (Math.abs(rx) < r * 0.35) {
            ctx.fillStyle = ry < -r * 0.80 ? '#33E27A' : '#00A847'; // Emerald peak highlight
          } else {
            ctx.fillStyle = '#007A33'; // Hood base emerald
          }
        } else {
          // Hood sides: dual-tone deep emerald & plum shadow
          if (Math.abs(rx) > r * 0.60) {
            ctx.fillStyle = '#1A1024'; // Mystic dark plum edge shadow
          } else if (Math.abs(rx) > r * 0.40) {
            ctx.fillStyle = '#0D3A20'; // Hood fold shadow
          } else {
            ctx.fillStyle = '#008A3B'; // Mid-tone emerald cloth
          }
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE B: HIGH UPTURNED STANDING COLLAR & CHEST POWER GEM (-r * 0.18 <= ry < r * 0.28) ──
      else if (ry < r * 0.28) {
        // B1. Center Embedded Arcane Talisman / Power Core (Diamond Emerald Crystal)
        const crystalDistX = Math.abs(rx);
        const crystalDistY = Math.abs(ry - r * 0.05);
        const inDiamondGem = (crystalDistX * 1.3 + crystalDistY <= r * 0.26);

        if (inDiamondGem) {
          if (crystalDistX * 1.3 + crystalDistY <= r * 0.12) {
            ctx.fillStyle = '#FFFFFF'; // Bright crystal glint
          } else if (crystalDistX * 1.3 + crystalDistY <= r * 0.20) {
            ctx.fillStyle = '#00FF64'; // Vivid arcane green core
          } else {
            ctx.fillStyle = '#009E44'; // Emerald facet shadow
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // Gem Golden Socket / Bezel
        const inGemSocket = (crystalDistX * 1.3 + crystalDistY <= r * 0.34);
        if (inGemSocket) {
          ctx.fillStyle = (ry < r * 0.05 && rx < 0) ? '#FFF275' : '#D4AF37';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // B2. Upturned Standing Collar Wings on Left & Right Shoulders
        const inCollarWing = (Math.abs(rx) >= r * 0.48 && ry <= r * 0.12);
        if (inCollarWing) {
          if (Math.abs(rx) >= r * 0.68) {
            ctx.fillStyle = '#D4AF37'; // Golden collar trim
          } else {
            ctx.fillStyle = (ry < 0) ? '#2B143D' : '#1C0E28'; // Deep plum velvet collar
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // B3. Tunic Upper Robe Cloth & Pleats
        if (Math.abs(rx) <= r * 0.18) {
          ctx.fillStyle = '#00A847'; // Chest center highlight
        } else if (Math.abs(rx) <= r * 0.48) {
          ctx.fillStyle = '#007A33'; // Base emerald tunic
        } else {
          ctx.fillStyle = '#0A2E1A'; // Tunic shadow fold
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE C: ORNATE MAGUS SASH / BELT & RUNES (r * 0.28 <= ry < r * 0.52) ──
      else if (ry < r * 0.52) {
        // C1. Center Brass/Gold Magus Buckle
        const isCenterBuckle = (Math.abs(rx) <= r * 0.24 && Math.abs(ry - r * 0.40) <= r * 0.10);
        if (isCenterBuckle) {
          if (Math.abs(rx) >= r * 0.20 || Math.abs(ry - r * 0.40) >= r * 0.08) {
            ctx.fillStyle = '#4A3500'; // Buckle dark rim
          } else if (rx < -P && ry < r * 0.40) {
            ctx.fillStyle = '#FFF275'; // Metallic glint
          } else {
            ctx.fillStyle = '#00FF64'; // Embedded center rune gem
          }
          ctx.fillRect(px, py, P, P);
          continue;
        }

        // C2. Golden Magus Sash with Glowing Arcane Rune Inlays
        const isRunePixel = (
          (Math.abs(rx - r * 0.38) <= P && Math.abs(ry - r * 0.40) <= P) ||
          (Math.abs(rx + r * 0.38) <= P && Math.abs(ry - r * 0.40) <= P) ||
          (Math.abs(rx - r * 0.56) <= P && Math.abs(ry - r * 0.40) <= P) ||
          (Math.abs(rx + r * 0.56) <= P && Math.abs(ry - r * 0.40) <= P)
        );

        if (isRunePixel) {
          ctx.fillStyle = '#00FF64'; // Inlaid green rune
        } else if (ry < r * 0.34) {
          ctx.fillStyle = '#FFF275'; // Top gold sash highlight
        } else if (ry > r * 0.46) {
          ctx.fillStyle = '#8C6808'; // Bottom sash shadow
        } else {
          ctx.fillStyle = '#D4AF37'; // Golden sash cloth
        }
        ctx.fillRect(px, py, P, P);
      }
      // ── ZONE D: LAYERED WIZARD ROBE SKIRT & BOTTOM HEMS (ry >= r * 0.52) ──
      else {
        // D1. Bottom Gold Hem Trim (ry >= r * 0.82)
        if (ry >= r * 0.82) {
          if (ry >= r * 0.88) {
            ctx.fillStyle = '#8C6808'; // Bottom shadow hem
          } else {
            ctx.fillStyle = '#D4AF37'; // Gold robe trim
          }
        }
        // D2. Wizard Skirt Emerald Folds & Plum Under-layer
        else {
          if (Math.abs(rx) < r * 0.25) {
            ctx.fillStyle = '#008A3B'; // Center front robe fold
          } else if (Math.abs(rx) < r * 0.55) {
            ctx.fillStyle = '#005E26'; // Mid robe fold
          } else if (Math.abs(rx) < r * 0.75) {
            ctx.fillStyle = '#082615'; // Deep pleat shadow
          } else {
            ctx.fillStyle = '#1C0E28'; // Outer plum under-robe
          }
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Draws Rubbick's iconic Grand Magus Mantle / Cape in authentic Pixel Art Style ("Saitama Tech").
 * Features dual-layer cloth physics (Rich Emerald Green top, Deep Mystic Violet underside),
 * gold trim edge, stepped fold creases, and two golden shoulder talisman clasps.
 */
export function drawRubbickPixelCape(ctx, r, inertiaX = 0, inertiaY = 0, gentleSway1 = 0, gentleSway2 = 0, waveRipple = 0, isGhost = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Cape Attachment / Collar Clasp Positions (Back of shoulders)
  const topAttach = { x: -r * 0.32, y: -r * 0.42 };
  const botAttach = { x: -r * 0.32, y: -r * 0.08 };

  // Outer Cape Boundary Points (Flowing backwards into -X)
  const topCapeTip = {
    x: -r * 1.95 + inertiaX * 0.85 + gentleSway1,
    y: -r * 0.95 + inertiaY * 0.6 - gentleSway2
  };
  const midCapeFold = {
    x: -r * 2.25 + inertiaX * 1.05 + gentleSway2,
    y: 0 + inertiaY * 0.8 + waveRipple
  };
  const botCapeTip = {
    x: -r * 1.85 + inertiaX * 0.85 - gentleSway1,
    y: r * 0.85 + inertiaY * 0.6 + gentleSway2
  };

  // Sample boundary perimeter vertices into stepped pixel points
  const poly = [];
  const N = 20;

  // 1. Top curve: topAttach -> topCapeTip
  const c1Top = { x: -r * 1.0 + inertiaX * 0.4, y: -r * 0.70 + inertiaY * 0.3 + gentleSway1 };
  const c2Top = { x: -r * 1.55 + inertiaX * 0.7 + gentleSway2, y: -r * 0.98 + inertiaY * 0.5 + waveRipple };
  for (let i = 0; i <= N; i++) {
    poly.push(cubicBezierPt(topAttach, c1Top, c2Top, topCapeTip, i / N));
  }

  // 2. Trailing edge: topCapeTip -> midCapeFold -> botCapeTip (Regal ragged wing shape)
  const cMid1 = { x: -r * 2.05 + inertiaX * 0.9 + gentleSway2, y: -r * 0.45 + inertiaY * 0.7 };
  const cMid2 = { x: -r * 2.0 + inertiaX * 0.8 - gentleSway1, y: r * 0.45 + inertiaY * 0.7 };
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    if (t <= 0.5) {
      poly.push(quadBezierPt(topCapeTip, cMid1, midCapeFold, t * 2));
    } else {
      poly.push(quadBezierPt(midCapeFold, cMid2, botCapeTip, (t - 0.5) * 2));
    }
  }

  // 3. Bottom curve: botCapeTip -> botAttach
  const c1Bot = { x: -r * 1.45 + inertiaX * 0.6 - gentleSway2, y: r * 0.65 + inertiaY * 0.4 - waveRipple };
  const c2Bot = { x: -r * 0.80 + inertiaX * 0.3, y: r * 0.22 + inertiaY * 0.2 };
  for (let i = 1; i <= N; i++) {
    poly.push(cubicBezierPt(botCapeTip, c1Bot, c2Bot, botAttach, i / N));
  }

  // Pass 1: Outer Dark Pixel Outline Shell (#0A0F0D)
  ctx.fillStyle = isGhost ? 'rgba(8, 18, 11, 0.85)' : '#0A0F0D';
  for (let j = 0; j < poly.length; j++) {
    const p1 = poly[j];
    const p2 = poly[(j + 1) % poly.length];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const stepCount = Math.max(2, Math.round(dist / P));
    for (let st = 0; st <= stepCount; st++) {
      const rx = p1.x + (p2.x - p1.x) * (st / stepCount);
      const ry = p1.y + (p2.y - p1.y) * (st / stepCount);
      ctx.fillRect(snap(rx) - P * 0.5, snap(ry) - P * 0.5, P * 2, P * 2);
    }
  }

  // Pass 2: Base Grand Magus Emerald Cloth Body (#007A33 / #00A344)
  ctx.fillStyle = isGhost ? 'rgba(0, 140, 60, 0.65)' : '#007A33';
  ctx.beginPath();
  poly.forEach((pt, idx) => {
    const px = snap(pt.x);
    const py = snap(pt.y);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  // Pass 3: Deep Mystic Plum Violet Underside Shadow Pixels along lower wing
  ctx.fillStyle = isGhost ? 'rgba(40, 16, 60, 0.60)' : '#241038';
  ctx.beginPath();
  const shadowStartIdx = Math.floor(poly.length * 0.38);
  const shadowEndIdx = Math.floor(poly.length * 0.85);
  ctx.moveTo(snap(poly[shadowStartIdx].x), snap(poly[shadowStartIdx].y));
  for (let k = shadowStartIdx; k <= shadowEndIdx; k++) {
    ctx.lineTo(snap(poly[k].x), snap(poly[k].y));
  }
  ctx.lineTo(snap(-r * 1.0), snap(r * 0.15));
  ctx.closePath();
  ctx.fill();

  // Pass 4: Stepped Pixel Gold Trim along trailing edge
  ctx.fillStyle = isGhost ? 'rgba(212, 175, 55, 0.65)' : '#D4AF37';
  for (let k = Math.floor(poly.length * 0.15); k <= Math.floor(poly.length * 0.65); k += 2) {
    ctx.fillRect(snap(poly[k].x), snap(poly[k].y), P, P);
  }

  // Pass 5: Stepped Pixel Fold Creases
  const drawPixelCrease = (fromPt, ctrlPt1, ctrlPt2, toPt, color) => {
    ctx.fillStyle = color;
    const stepCount = 14;
    for (let s = 0; s <= stepCount; s++) {
      const pt = cubicBezierPt(fromPt, ctrlPt1, ctrlPt2, toPt, s / stepCount);
      ctx.fillRect(snap(pt.x), snap(pt.y), P, P);
    }
  };

  const foldCol = isGhost ? 'rgba(10, 50, 25, 0.70)' : '#082E15';
  // Upper fold crease
  drawPixelCrease(
    topAttach,
    { x: -r * 0.85 + inertiaX * 0.3, y: -r * 0.50 + gentleSway1 },
    { x: -r * 1.40 + inertiaX * 0.6, y: -r * 0.35 + waveRipple },
    { x: midCapeFold.x + r * 0.20, y: midCapeFold.y - r * 0.20 },
    foldCol
  );
  // Lower fold crease
  drawPixelCrease(
    botAttach,
    { x: -r * 0.75 + inertiaX * 0.3, y: r * 0.12 - gentleSway2 },
    { x: -r * 1.30 + inertiaX * 0.5, y: r * 0.35 + waveRipple },
    { x: botCapeTip.x + r * 0.20, y: botCapeTip.y - r * 0.10 },
    foldCol
  );

  // Pass 6: Stepped Pixel Shoulder Talisman Buttons (Gold with Emerald Gems)
  const drawPixelCollarTalisman = (bx, by) => {
    const cx = snap(bx);
    const cy = snap(by);
    const btnR = snap(r * 0.13);
    const steps = Math.ceil(btnR / P);

    // Outline
    ctx.fillStyle = '#0A0F0D';
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        if (Math.hypot(gx * P, gy * P) <= btnR + P * 0.6) {
          ctx.fillRect(cx + gx * P, cy + gy * P, P, P);
        }
      }
    }
    // Gold Bezel
    ctx.fillStyle = '#D4AF37';
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        if (Math.hypot(gx * P, gy * P) <= btnR) {
          ctx.fillRect(cx + gx * P, cy + gy * P, P, P);
        }
      }
    }
    // Center Emerald Crystal
    ctx.fillStyle = '#00FF64';
    ctx.fillRect(cx, cy, P, P);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - P, cy - P, P, P);
  };

  drawPixelCollarTalisman(topAttach.x, topAttach.y);
  drawPixelCollarTalisman(botAttach.x, botAttach.y);

  ctx.restore();
}

/**
 * Draws an authentic stepped pixel-art Magus glove/hand for Rubbick.
 * Features dark leather palms, golden magus bracer, and glowing arcane emerald fingertips.
 */
export function drawRubbickPixelHand(ctx, handX, handY, handRadius, alpha = 1.0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;

  const gridR = Math.max(P * 2, handRadius);
  const steps = Math.ceil(gridR / P);

  // 1. Dark Manga Ink Outline Shell (#0A0F0D)
  ctx.fillStyle = '#0A0F0D';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= gridR + P * 0.75) {
        ctx.fillRect(snap(handX + gx * P), snap(handY + gy * P), P, P);
      }
    }
  }

  // 2. Base Dark Leather Glove Body (#14241B)
  const innerR = gridR - P * 0.4;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR) {
        const px = snap(handX + gx * P);
        const py = snap(handY + gy * P);

        // Gold Bracer Wrist Band (at -X / back of hand)
        if (gx * P < -innerR * 0.35) {
          ctx.fillStyle = (gy * P < 0) ? '#FFF275' : '#D4AF37';
        }
        // Glowing Emerald Fingertips (at +X / front of hand)
        else if (gx * P > innerR * 0.35) {
          ctx.fillStyle = (Math.abs(gy * P) < innerR * 0.3) ? '#E6FFF0' : '#00FF64';
        }
        // Deep Palm Leather
        else {
          ctx.fillStyle = (gy * P > innerR * 0.25) ? '#0A140F' : '#173022';
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Draws a dark emerald robe sleeve connecting the mantle shoulder to the hand (Pixel Art)
 */
export function drawRubbickArmSleeve(ctx, startX, startY, endX, endY, handRadius) {
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy);
  if (dist < handRadius * 0.3) return;

  const angle = Math.atan2(dy, dx);
  const perpAngle = angle + Math.PI / 2;
  const sleeveW = handRadius * 0.75;
  const px = Math.cos(perpAngle) * sleeveW;
  const py = Math.sin(perpAngle) * sleeveW;

  const sleevePts = [
    { x: startX + px * 0.75, y: startY + py * 0.75 },
    { x: endX - Math.cos(angle) * (handRadius * 0.25) + px, y: endY - Math.sin(angle) * (handRadius * 0.25) + py },
    { x: endX - Math.cos(angle) * (handRadius * 0.25) - px, y: endY - Math.sin(angle) * (handRadius * 0.25) - py },
    { x: startX - px * 0.75, y: startY - py * 0.75 }
  ];

  // Stepped pixel outline
  ctx.fillStyle = '#0A0F0D';
  for (let j = 0; j < sleevePts.length; j++) {
    const p1 = sleevePts[j];
    const p2 = sleevePts[(j + 1) % sleevePts.length];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(2, Math.round(len / P));
    for (let st = 0; st <= steps; st++) {
      const rx = p1.x + (p2.x - p1.x) * (st / steps);
      const ry = p1.y + (p2.y - p1.y) * (st / steps);
      ctx.fillRect(snap(rx) - P * 0.5, snap(ry) - P * 0.5, P * 2, P * 2);
    }
  }

  // Stepped pixel sleeve fill with gold cuff
  ctx.fillStyle = '#007A33';
  ctx.beginPath();
  sleevePts.forEach((pt, idx) => {
    if (idx === 0) ctx.moveTo(snap(pt.x), snap(pt.y));
    else ctx.lineTo(snap(pt.x), snap(pt.y));
  });
  ctx.closePath();
  ctx.fill();

  // Gold cuff band at wrist
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(snap(endX - Math.cos(angle) * handRadius * 0.3 - px * 0.7), snap(endY - Math.sin(angle) * handRadius * 0.3 - py * 0.7), P * 2, P * 2);
  ctx.fillRect(snap(endX - Math.cos(angle) * handRadius * 0.3 + px * 0.3), snap(endY - Math.sin(angle) * handRadius * 0.3 + py * 0.3), P * 2, P * 2);
}

/**
 * Draws a casting arm with dark emerald robe sleeve and magus glove (Pixel Art)
 */
export function drawRubbickArm(ctx, r, handX, handY, handRadius, shoulderY, isFront = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const startX = r * 0.15;
  const startY = shoulderY;
  drawRubbickArmSleeve(ctx, startX, startY, handX, handY, handRadius);

  // Stepped Pixel-Art Magus Glove
  drawRubbickPixelHand(ctx, handX, handY, handRadius);

  ctx.restore();
}

/**
 * Draws the full-body discrete pixel ghost model for Rubbick (Teleports & Afterimages)
 */
export function drawRubbickGhostModel(ctx, r) {
  drawRubbickPixelCape(ctx, r, 0, 0, 0, 0, 0, true);
  drawRubbickPixelBody(ctx, r, true);
  const handRadius = Math.max(r * 0.36, getHandSize(8.0));
  drawRubbickPixelHand(ctx, r * 0.85, 0, handRadius, 0.75);
}

/**
 * Draws the 6 orbiting magical stones/crystals in 100% authentic discrete pixel art style.
 * Renders in 3D orbit around Rubbick (drawBehind splits back half vs front half).
 */
export function drawRubbickPixelDebrisLayer(ctx, fighter, drawBehind) {
  if (!fighter || !fighter.orbitingDebris || fighter.orbitingDebris.length === 0 || isInsideEnemyGojoDomain(fighter)) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(fighter.x, fighter.y);

  const time = performance.now() / 1000;

  for (let i = 0; i < fighter.orbitingDebris.length; i++) {
    const debris = fighter.orbitingDebris[i];
    const angle = debris.baseAngle + time * (debris.speed * 60);
    const rotation = debris.baseRotation + time * (debris.rotationSpeed * 60);
    const zPhase = debris.baseZPhase + time * (debris.zSpeed * 60);

    // Math.sin(angle) < 0 is top half of 3D orbit (behind body)
    const isBehind = Math.sin(angle) < 0;
    if (isBehind !== drawBehind) continue;

    const dist = debris.dist;
    const px = Math.cos(angle) * dist;
    const py = -(fighter.z || 0) + Math.sin(angle) * (dist * 0.38) + Math.sin(zPhase) * 5;

    // 3D Depth Scaling: Rocks behind are smaller (0.75), rocks in front are larger (1.05)
    const depthScale = 0.88 + Math.sin(angle) * 0.18;
    const s = snap(debris.size * depthScale);
    const steps = Math.ceil((s + P) / P);

    ctx.save();
    ctx.translate(snap(px), snap(py));
    ctx.rotate(rotation);

    // 1. Stepped Pixel Dark Ink Outline Shell
    ctx.fillStyle = isBehind ? 'rgba(8, 18, 11, 0.60)' : '#0A0F0D';
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        if (Math.hypot(gx * P, gy * P) <= s + P * 0.75) {
          ctx.fillRect(snap(gx * P), snap(gy * P), P, P);
        }
      }
    }

    // 2. Stepped Pixel Basalt Rock Core & Emerald Crystal Facets
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const rx = gx * P;
        const ry = gy * P;
        const d = Math.hypot(rx, ry);
        if (d > s) continue;

        const bx = snap(rx);
        const by = snap(ry);

        // Specular glint
        if (rx < -s * 0.25 && ry < -s * 0.25) {
          ctx.fillStyle = isBehind ? '#B8FFDA' : '#FFFFFF';
        }
        // Glowing Emerald Facet
        else if (Math.abs(rx) <= s * 0.45 && Math.abs(ry) <= s * 0.45) {
          ctx.fillStyle = '#00FF64';
        }
        // Basalt Rock Shading
        else if (ry > s * 0.30 || rx > s * 0.35) {
          ctx.fillStyle = '#08120B';
        } else {
          ctx.fillStyle = '#112419';
        }
        ctx.fillRect(bx, by, P, P);
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Main Visual Skin Renderer for Rubbick ("The Grand Magus" / "Trickster")
 * Fully rebuilt in authentic discrete 2D pixel art style ("Saitama Tech").
 */
export function drawRubbickSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const now = Date.now();

  // 0. Draw afterimages (Teleport / Spell Steal ghost model skin)
  const isSuppressed = typeof fighter.areAttackEffectsSuppressed === 'function' ? fighter.areAttackEffectsSuppressed() : isSuppressedByGetsuga(fighter);
  if (fighter.afterImages && fighter.afterImages.length > 0 && !isSuppressed && !isInsideEnemyGojoDomain(fighter)) {
    ctx.save();
    for (let i = 0; i < fighter.afterImages.length; i++) {
      const ai = fighter.afterImages[i];
      if (!ai || ai.timer <= 0) continue;
      const progress = ai.timer / (ai.maxTimer || 20);
      const alpha = progress * 0.55;
      const aiAngle = ai.gunAngle !== undefined ? ai.gunAngle : (ai.angle || 0);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ai.x, ai.y);
      ctx.rotate(aiAngle);

      const facingLeft = Math.abs(aiAngle) > Math.PI / 2;
      if (facingLeft) ctx.scale(1, -1);

      drawRubbickGhostModel(ctx, ai.r || r);

      ctx.restore();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // Podium preview check: suppresses combat animation offsets during winner reveal podium display ONLY
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  const angle = isPodiumPreview ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // ─────────────────────────────────────────────
  // 1. DRAW CAPE (Authentic Pixel-Art Grand Magus Mantle)
  // ─────────────────────────────────────────────
  const vx = fighter.vx || 0;
  const vy = fighter.vy || 0;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  let localVx = vx * cosA + vy * sinA;
  let localVy = -vx * sinA + vy * cosA;
  if (facingLeft) localVy = -localVy;

  const inertiaX = Math.max(-r * 1.2, Math.min(r * 0.8, -localVx * 2.2));
  const inertiaY = Math.max(-r * 1.0, Math.min(r * 1.0, -localVy * 2.2));

  const gentleSway1 = Math.sin(now * 0.003) * (r * 0.12);
  const gentleSway2 = Math.cos(now * 0.0025) * (r * 0.10);
  const waveRipple = Math.sin(now * 0.006) * (r * 0.08);

  drawRubbickPixelCape(ctx, r, inertiaX, inertiaY, gentleSway1, gentleSway2, waveRipple, false);

  // ─────────────────────────────────────────────
  // 2. MAIN CIRCLE BODY (AUTHENTIC PIXEL ART MODEL)
  // ─────────────────────────────────────────────
  drawRubbickPixelBody(ctx, r, false);

  // ─────────────────────────────────────────────
  // 3. ARCANE RUNIC AURA (No shadowBlur - Rule #11)
  // ─────────────────────────────────────────────
  if (fighter.stolenType && !isLowQuality && !isInsideEnemyGojoDomain(fighter)) {
    ctx.save();
    const stolenPulse = Math.sin(now * 0.006) * 3;
    const ringR = r + 6 + stolenPulse;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = fighter.stolenColor || '#00FF64';
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.45 + Math.sin(now * 0.008) * 0.25;
    ctx.stroke();
    ctx.restore();
  }

  // ─────────────────────────────────────────────
  // 4. OFF-HAND CASTING / UNARMED HAND (Rule #20 Compliant)
  // ─────────────────────────────────────────────
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || isPodiumPreview;
  if (!shouldHideHands && !fighter.hideFrontHand) {
    const handRadius = Math.max(r * 0.36, getHandSize(8.0));
    
    // Telekinesis channel off-hand gesture pointing forward
    if (fighter.tkTimer > 0) {
      drawRubbickArm(ctx, r, r * 0.80, r * 0.15, handRadius, -r * 0.20, true);
    }
    // Unarmed or stolen non-staff weapon fallback
    else if (fighter.isUnarmed || fighter.hideWeapon) {
      drawRubbickPixelHand(ctx, r * 0.85, 0, handRadius);
    }
  }

  // Status Overlays (stun, slow, burn, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
