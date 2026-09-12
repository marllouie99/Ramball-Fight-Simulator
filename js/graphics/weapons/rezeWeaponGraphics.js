// ─────────────────────────────────────────────
// Reze (The Bomb Devil Hybrid) Weapon Visuals & Explosive FX
// Chainsaw Man / Soviet Assassin & Bomb Devil
// Adheres strictly to:
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 16 (Manga Action Speed Line Effects — Construction & Angle Standards)
// - Rule 10 (WebGL / Canvas 2D Performance Preservation)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

let _rezeSpeedLineSeeds = null;

function _getRezeSpeedLineSeeds() {
  if (_rezeSpeedLineSeeds) return _rezeSpeedLineSeeds;
  _rezeSpeedLineSeeds = [];
  const lineCount = 24;
  for (let i = 0; i < lineCount; i++) {
    const norm = (i / (lineCount - 1)) * 2 - 1; // -1.0 to 1.0
    const perpOffset = norm * 35; // ±35px cluster width
    const normDist = 1 - Math.abs(norm);
    const baseLength = 35 + normDist * 55; // 35px to 90px parabolic length
    const speed = 1.2 + Math.random() * 0.8;
    const phase = Math.random() * 100;
    const maxThick = 1.0 + normDist * 1.2; // 1.0px to 2.2px max thickness
    _rezeSpeedLineSeeds.push({ perpOffset, baseLength, speed, phase, maxThick });
  }
  return _rezeSpeedLineSeeds;
}

/**
 * Draws Manga Action Speed Lines behind Reze during Supersonic Rocket Lunge (Rule 16 Compliant)
 */
export function drawRezeSpeedLines(ctx, fighter) {
  if (!fighter || !fighter.isRocketLunging) return;

  const r = fighter.r || 25;
  const aimAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const backOffset = r * 1.2;
  const seeds = _getRezeSpeedLineSeeds();
  const now = Date.now();

  ctx.save();
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 80);

    // Negative cosA/sinA streams strictly BEHIND the fighter
    const lineCenterX = fighter.x - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = fighter.y - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.baseLength * 0.5;
    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;
    const endX   = lineCenterX + cosA * halfLen;
    const endY   = lineCenterY + sinA * halfLen;

    // 4-point double-tapered needle polygon
    const midOff = halfLen * 0.15;
    const midX = lineCenterX + cosA * midOff;
    const midY = lineCenterY + sinA * midOff;
    const halfThick = seed.maxThick * 0.5;

    const topMidX = midX + perpX * halfThick;
    const topMidY = midY + perpY * halfThick;
    const botMidX = midX - perpX * halfThick;
    const botMidY = midY - perpY * halfThick;

    // 4-Slot Character Theme Palette (Rule 16 Standard)
    let color;
    if (i % 4 === 0) color = 'rgba(255, 107, 26, 0.90)';      // Tangerine Flame Orange
    else if (i % 4 === 1) color = 'rgba(255, 230, 0, 0.95)'; // Spark Gold
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.98)'; // Pure White Kinetic Core
    else color = 'rgba(30, 26, 36, 0.85)';                   // Dark Gunpowder Ink

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(topMidX, topMidY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(botMidX, botMidY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws Spark Flechette Projectile (tight flying spark needle with trailing embers)
 */
export function drawSparkFlechette(ctx, projectile) {
  const x = projectile.x;
  const y = projectile.y;
  const angle = projectile.angle || Math.atan2(projectile.vy, projectile.vx);
  const len = 14;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Outer orange combustion glow
  ctx.fillStyle = 'rgba(255, 107, 26, 0.40)';
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.8, 6.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sharp yellow/gold flechette core
  ctx.fillStyle = '#FFE600';
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, -2.5);
  ctx.lineTo(len * 0.5, 0); // Sharp needle tip
  ctx.lineTo(-len * 0.5, 2.5);
  ctx.closePath();
  ctx.fill();

  // White-hot center
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-len * 0.3, -1.0, len * 0.6, 2.0);

  ctx.restore();
}

/**
 * Draws Decoy Bomb Entity (Running Clone Silhouette with live spark fuse)
 */
export function drawRezeDecoy(ctx, decoy) {
  const r = decoy.r || 20;
  const now = Date.now();

  ctx.save();
  ctx.translate(decoy.x, decoy.y);
  ctx.rotate(decoy.angle || 0);

  // Shadowy clone body
  ctx.fillStyle = 'rgba(32, 27, 46, 0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FF6B1A';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Burning fuse on decoy head
  const fuseX = 0;
  const fuseY = -r * 0.9;
  ctx.fillStyle = '#FFE600';
  ctx.beginPath();
  ctx.arc(fuseX, fuseY - 6, 4.5 + Math.sin(now * 0.03) * 2.0, 0, Math.PI * 2);
  ctx.fill();

  // Floating warning text
  ctx.fillStyle = '#FFE600';
  ctx.font = '700 8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BOMB!', 0, -r - 12);

  ctx.restore();
}

/**
 * Draws Reze's Concealed Knife Slash (Human Form Light Attack String & Aerial Dive Bomb)
 * Clean, razor-sharp surgical steel blade crescent rasterized in 2D Cartesian grid
 */
export function drawRezeKnifeSlash(ctx, slashFx) {
  if (!slashFx || slashFx.timer <= 0) return;

  const p = Math.max(0, Math.min(1.0, 1.0 - (slashFx.timer / slashFx.maxTimer)));
  const alpha = (p <= 0.60) ? 1.0 : Math.cos(((p - 0.60) / 0.40) * (Math.PI * 0.5));
  if (alpha <= 0.01) return;

  const reach = slashFx.radius || 54;
  const arcAngle = slashFx.arc || ((100 * Math.PI) / 180);
  const sweepDir = slashFx.sweepDir || 1;
  const isThrust = Boolean(slashFx.isThrust);
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  ctx.translate(slashFx.x, slashFx.y);
  ctx.rotate(slashFx.angle || 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;

  const R = reach * (0.85 + Math.sin(Math.min(1.0, p / 0.30) * Math.PI * 0.5) * 0.20);
  const maxThick = isThrust ? 9.0 : 7.0;
  const halfAngle = arcAngle * 0.5;

  const sweepP = Math.min(1.0, p / 0.25);
  const dissolveP = (p > 0.45) ? ((p - 0.45) / 0.55) : 0;

  let minAng, maxAng;
  if (sweepDir === 1) {
    minAng = -halfAngle + arcAngle * dissolveP * 0.80;
    maxAng = -halfAngle + arcAngle * sweepP;
  } else {
    minAng = halfAngle - arcAngle * sweepP;
    maxAng = halfAngle - arcAngle * dissolveP * 0.80;
  }

  const span = maxAng - minAng;
  if (span <= 0.04) {
    ctx.restore();
    return;
  }

  const isInsideKnifeSlash = (rx, ry) => {
    const dist = Math.hypot(rx, ry);
    if (dist > R || dist <= 0) return false;
    const ang = Math.atan2(ry, rx);
    if (ang < minAng || ang > maxAng) return false;

    const t = Math.max(0, Math.min(1.0, (ang - minAng) / span));
    const taper = Math.sin(t * Math.PI);
    if (taper <= 0) return false;

    const inR = R - maxThick * Math.pow(taper, 0.85);
    return dist >= inR;
  };

  const minX = Math.floor((Math.min(Math.cos(minAng), Math.cos(maxAng), Math.cos(0)) * R - maxThick - P * 2) / P) * P;
  const maxX = Math.ceil((R + P * 2) / P) * P;
  const maxY = Math.ceil((R + P * 2) / P) * P;

  // Solid Cartesian Scan
  for (let gy = -maxY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      if (!isInsideKnifeSlash(gx, gy)) continue;

      const px = snap(gx);
      const py = snap(gy);

      // 4-Neighbor Attached Border Test (Deep steel-blue / obsidian ink outline)
      const isBorder = !isInsideKnifeSlash(gx + P, gy) ||
                       !isInsideKnifeSlash(gx - P, gy) ||
                       !isInsideKnifeSlash(gx, gy + P) ||
                       !isInsideKnifeSlash(gx, gy - P);

      if (isBorder) {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const dist = Math.hypot(gx, gy);
      const depthFromApex = R - dist;

      if (depthFromApex < P * 1.5) {
        ctx.fillStyle = '#FFFFFF'; // Razor-sharp surgical steel cutting edge
      } else if (depthFromApex < P * 3.0) {
        ctx.fillStyle = '#F1F5F9'; // Pure silver blade core
      } else if (depthFromApex < P * 4.8) {
        ctx.fillStyle = '#CBD5E1'; // Steel reflection midtone
      } else {
        ctx.fillStyle = '#64748B'; // Deep gunmetal blade spine
      }

      ctx.fillRect(px, py, P, P);
    }
  }

  // Metallic Glint at Knife Apex
  if (p < 0.40) {
    const glintAlpha = (1.0 - p / 0.40);
    ctx.save();
    ctx.globalAlpha *= glintAlpha;
    ctx.fillStyle = '#FFFFFF';
    const apexX = snap(Math.cos(sweepDir === 1 ? maxAng : minAng) * R);
    const apexY = snap(Math.sin(sweepDir === 1 ? maxAng : minAng) * R);
    ctx.fillRect(apexX - P, apexY, P * 3, P);
    ctx.fillRect(apexX, apexY - P, P, P * 3);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws Reze's Basic Attack: Explosive Martial Arts (120° Frontal Arc in Authentic Clean Pixel Art)
 * Used in Bomb Devil Form
 */
export function drawRezePixelMartialArc(ctx, arcFx) {
  if (!arcFx || arcFx.timer <= 0) return;

  const p = Math.max(0, Math.min(1.0, 1.0 - (arcFx.timer / arcFx.maxTimer)));
  const isFinisher = Boolean(arcFx.isFinisher);
  const isHybrid = Boolean(arcFx.isHybrid);
  const arcAngle = arcFx.arc || ((120 * Math.PI) / 180);
  const baseReach = arcFx.radius || (isHybrid ? 75 : 65);
  const sweepDir = arcFx.sweepDir || 1; // 1 = Left-to-Right, -1 = Right-to-Left
  const P = 2.0; // Discrete pixel art unit matching Ichigo / Saitama
  const snap = (v) => Math.round(v / P) * P;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  ctx.translate(arcFx.x, arcFx.y);
  ctx.rotate(arcFx.angle || 0);
  ctx.imageSmoothingEnabled = false;

  if (isFinisher) {
    _drawRezePixelSparkSlapBlast(ctx, p, arcAngle, baseReach, isHybrid, P, snap, now);
  } else {
    _drawRezePixelSparkChopArc(ctx, p, arcAngle, baseReach, sweepDir, isHybrid, P, snap, now);
  }

  ctx.restore();
}

/**
 * Clean 2D Cartesian Grid Rasterization for 1:1 Pixel Art Flame Crescent (Hits 1 & 2)
 * Matches user's exact reference image: vibrant orange blade body, bright gold outer rim,
 * white apex highlight, jagged saw-tooth flame notches, and dark purple cutout crevices.
 */
function _drawRezePixelSparkChopArc(ctx, p, arcAngle, reach, sweepDir, isHybrid, P, snap, now) {
  const alpha = (p <= 0.60) ? 1.0 : Math.cos(((p - 0.60) / 0.40) * (Math.PI * 0.5));
  if (alpha <= 0.01) return;

  const R = reach * (0.85 + Math.sin(Math.min(1.0, p / 0.30) * Math.PI * 0.5) * 0.20);
  const maxThick = isHybrid ? 16.0 : 14.0;
  const halfAngle = arcAngle * 0.5;

  // Active sweep angle window
  const sweepP = Math.min(1.0, p / 0.25);
  const dissolveP = (p > 0.45) ? ((p - 0.45) / 0.55) : 0;

  let minAng, maxAng;
  if (sweepDir === 1) {
    minAng = -halfAngle + arcAngle * dissolveP * 0.80;
    maxAng = -halfAngle + arcAngle * sweepP;
  } else {
    minAng = halfAngle - arcAngle * sweepP;
    maxAng = halfAngle - arcAngle * dissolveP * 0.80;
  }

  const span = maxAng - minAng;
  if (span <= 0.06) return;

  // Sawtooth notch profile along inner curve
  const getToothNotch = (t) => {
    if (t < 0.12 || t > 0.88) return 0;
    const localT = (t - 0.12) / 0.76;
    const toothPhase = (localT * 3.0) % 1.0;
    const saw = Math.sin(toothPhase * Math.PI);
    return Math.pow(Math.max(0, saw), 1.5) * (P * 3.0);
  };

  // Mathematical flame crescent boundary test
  const isInsideSparkChop = (rx, ry) => {
    const dist = Math.hypot(rx, ry);
    if (dist > R || dist <= 0) return false;
    const ang = Math.atan2(ry, rx);
    if (ang < minAng || ang > maxAng) return false;

    const t = Math.max(0, Math.min(1.0, (ang - minAng) / span));
    const taper = Math.sin(t * Math.PI);
    if (taper <= 0) return false;

    const toothCut = getToothNotch(t);
    const inR = R - (maxThick * Math.pow(taper, 0.70) - toothCut);
    return dist >= inR;
  };

  const minX = Math.floor((Math.min(Math.cos(minAng), Math.cos(maxAng), Math.cos(0)) * R - maxThick - P * 2) / P) * P;
  const maxX = Math.ceil((R + P * 2) / P) * P;
  const maxY = Math.ceil((R + P * 2) / P) * P;

  ctx.save();
  ctx.globalAlpha *= alpha;

  // Continuous 2D Cartesian Crescent Grid with 1:1 Layered Shading
  for (let gy = -maxY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      if (!isInsideSparkChop(gx, gy)) continue;

      const px = snap(gx);
      const py = snap(gy);

      // 4-Neighbor Attached Border Test (Generates clean solid 1-pixel dark ink outline)
      const isBorder = !isInsideSparkChop(gx + P, gy) ||
                       !isInsideSparkChop(gx - P, gy) ||
                       !isInsideSparkChop(gx, gy + P) ||
                       !isInsideSparkChop(gx, gy - P);

      if (isBorder) {
        ctx.fillStyle = '#14101A';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const dist = Math.hypot(gx, gy);
      const ang = Math.atan2(gy, gx);
      const t = (ang - minAng) / span;
      const depth = R - dist;

      // 1:1 Color Scheme matching reference image:
      // 1. Outer cutting rim: Bright Yellow (#FFE600) with White (#FFFFFF) apex core
      if (depth < P * 1.5) {
        if (t > 0.25 && t < 0.75 && depth < P * 0.9) {
          ctx.fillStyle = '#FFFFFF'; // White hot outer edge
        } else {
          ctx.fillStyle = '#FFE600'; // Radiant Yellow outer rim
        }
      } 
      // 2. Mid outer layer: Gold to Bright Tangerine Orange
      else if (depth < P * 3.2) {
        if (t > 0.35 && t < 0.65 && depth < P * 2.2) {
          ctx.fillStyle = '#FFF033'; // Warm gold midtone
        } else {
          ctx.fillStyle = '#FF7A00'; // Vibrant Orange body
        }
      }
      // 3. Flame Body & Inner Teeth Layer:
      else {
        const toothVal = getToothNotch(t);
        if (toothVal > P * 1.6) {
          ctx.fillStyle = '#261830'; // Deep dark purple-black crevice cutout
        } else if (toothVal > P * 0.4) {
          ctx.fillStyle = '#FFE600'; // Radiant yellow tooth highlight
        } else {
          ctx.fillStyle = isHybrid ? '#FF2E00' : '#FF5500'; // Fiery deep orange
        }
      }

      ctx.fillRect(px, py, P, P);
    }
  }

  // Metallic / Spark Glint at Leading Tip
  if (p < 0.40) {
    const glintAlpha = (1.0 - p / 0.40);
    ctx.save();
    ctx.globalAlpha *= glintAlpha;
    ctx.fillStyle = '#FFFFFF';
    const apexAng = (sweepDir === 1) ? maxAng : minAng;
    const apexX = snap(Math.cos(apexAng) * R);
    const apexY = snap(Math.sin(apexAng) * R);
    ctx.fillRect(apexX - P, apexY, P * 3, P);
    ctx.fillRect(apexX, apexY - P, P, P * 3);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Clean 2D Cartesian Grid Rasterization for Slim Supersonic Shockwave Crescents ("Spark Slap" Finisher)
 * Replaces chunky fan wedge with sleek concentric compression crescents and starburst
 */
function _drawRezePixelSparkSlapBlast(ctx, p, arcAngle, reach, isHybrid, P, snap, now) {
  const alpha = (p <= 0.60) ? 1.0 : Math.cos(((p - 0.60) / 0.40) * (Math.PI * 0.5));
  if (alpha <= 0.01) return;

  const expandP = Math.sin(Math.min(1.0, p / 0.30) * Math.PI * 0.5);
  const R1 = reach * (0.85 + expandP * (isHybrid ? 0.35 : 0.25));
  const maxThick1 = isHybrid ? 8.5 : 7.0;
  const halfAngle = arcAngle * 0.5;

  const R2 = R1 * 0.78;
  const maxThick2 = 5.0;

  const isInsideCrescent = (rx, ry, radius, thick) => {
    const dist = Math.hypot(rx, ry);
    if (dist > radius || dist <= 0) return false;
    const ang = Math.atan2(ry, rx);
    if (Math.abs(ang) > halfAngle) return false;

    const t = Math.max(0, Math.min(1.0, (ang + halfAngle) / (halfAngle * 2)));
    const taper = Math.pow(Math.sin(t * Math.PI), 1.25);
    const inR = radius - thick * taper;
    return dist >= inR;
  };

  const minX = Math.floor((Math.cos(halfAngle) * R1 - maxThick1 - P * 2) / P) * P;
  const maxX = Math.ceil((R1 + P * 2) / P) * P;
  const maxY = Math.ceil((Math.sin(halfAngle) * R1 + P * 2) / P) * P;

  ctx.save();
  ctx.globalAlpha *= alpha;

  // Wave 1: Leading Slim Compression Crescent
  for (let gy = -maxY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      if (!isInsideCrescent(gx, gy, R1, maxThick1)) continue;

      const px = snap(gx);
      const py = snap(gy);

      const isBorder = !isInsideCrescent(gx + P, gy, R1, maxThick1) ||
                       !isInsideCrescent(gx - P, gy, R1, maxThick1) ||
                       !isInsideCrescent(gx, gy + P, R1, maxThick1) ||
                       !isInsideCrescent(gx, gy - P, R1, maxThick1);

      if (isBorder) {
        ctx.fillStyle = '#14101A';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const dist = Math.hypot(gx, gy);
      const depthFromApex = R1 - dist;

      if (depthFromApex < P * 1.5) {
        ctx.fillStyle = '#FFFFFF';
      } else if (depthFromApex < P * 2.8) {
        ctx.fillStyle = '#FFE600';
      } else {
        ctx.fillStyle = isHybrid ? '#FF2E00' : '#FF6B1A';
      }

      ctx.fillRect(px, py, P, P);
    }
  }

  // Wave 2: Secondary Echo Crescent
  if (p < 0.70) {
    for (let gy = -maxY; gy <= maxY; gy += P) {
      for (let gx = minX; gx <= maxX; gx += P) {
        if (!isInsideCrescent(gx, gy, R2, maxThick2)) continue;

        const px = snap(gx);
        const py = snap(gy);

        const isBorder = !isInsideCrescent(gx + P, gy, R2, maxThick2) ||
                         !isInsideCrescent(gx - P, gy, R2, maxThick2) ||
                         !isInsideCrescent(gx, gy + P, R2, maxThick2) ||
                         !isInsideCrescent(gx, gy - P, R2, maxThick2);

        if (isBorder) {
          ctx.fillStyle = '#14101A';
          ctx.fillRect(px, py, P, P);
          continue;
        }

        const dist = Math.hypot(gx, gy);
        const depthFromApex = R2 - dist;
        ctx.fillStyle = (depthFromApex < P * 1.5) ? '#FFFFFF' : '#FFE600';
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  // White-Hot Palm Origin Starburst
  if (p < 0.35) {
    const flareAlpha = (1.0 - p / 0.35);
    ctx.save();
    ctx.globalAlpha *= flareAlpha;
    ctx.fillStyle = '#FFFFFF';
    const flareSize = snap(8 * (1.0 - p * 0.7));
    ctx.fillRect(-flareSize, -P, flareSize * 2, P * 2);
    ctx.fillRect(-P, -flareSize, P * 2, flareSize * 2);
    ctx.fillStyle = '#FFE600';
    ctx.fillRect(-flareSize * 0.5, -flareSize * 0.5, flareSize, flareSize);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Backward-compatible wrapper for older calls
 */
export function drawRezePalmBlast(ctx, blast) {
  drawRezePixelMartialArc(ctx, {
    x: blast.x,
    y: blast.y,
    angle: blast.angle,
    arc: blast.arc,
    radius: blast.radius,
    timer: blast.timer,
    maxTimer: blast.maxTimer,
    isFinisher: true,
    isHybrid: false
  });
}

/**
 * Draws Megaton Tsar Nuke Ultimate Visuals (Exploding Fireball, Mach Rings, Scorch Crater)
 */
export function drawRezeMegatonNuke(ctx, nuke) {
  const p = Math.max(0, Math.min(1.0, 1.0 - (nuke.timer / nuke.maxTimer)));
  const maxR = nuke.radius || 220;
  const curR = maxR * Math.pow(p, 0.5);
  const alpha = 1.0 - Math.pow(p, 1.2);

  ctx.save();
  ctx.translate(nuke.x, nuke.y);

  // 1. Concentric Fireball Expanding Rings (Rule 11: Zero shadowBlur)
  ctx.fillStyle = `rgba(255, 46, 0, ${0.35 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 1.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 107, 26, ${0.55 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 230, 0, ${0.75 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // White-hot nuclear detonation core
  if (p < 0.4) {
    const coreAlpha = (1.0 - (p / 0.4));
    ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha * 0.95})`;
    ctx.beginPath();
    ctx.arc(0, 0, curR * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Supersonic Mach Compression Shockwave Rings
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, curR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 107, 26, ${0.60 * alpha})`;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
