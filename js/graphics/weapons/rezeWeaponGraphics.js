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

  ctx.strokeStyle = '#430363ff';
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

  const reach = slashFx.radius || 72;
  const arcAngle = slashFx.arc || ((110 * Math.PI) / 180);
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

  if (isThrust) {
    // ──────────────────────────────────────────
    // SUPERSONIC STILETTO PENETRATION THRUST (Strike 3)
    // ──────────────────────────────────────────
    const thrustLen = reach * (0.80 + Math.sin(Math.min(1.0, p / 0.35) * Math.PI * 0.5) * 0.30);
    const startX = 20;
    const endX = startX + thrustLen;
    const maxThick = 5.0 * (1.0 - Math.pow(p, 1.4));
    const midX = startX + thrustLen * 0.65;

    // 1. Dark Obsidian Outline Needle Polygon
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(midX, -maxThick - P);
    ctx.lineTo(endX + P * 2, 0);
    ctx.lineTo(midX, maxThick + P);
    ctx.closePath();
    ctx.fill();

    // 2. Pure Silver Outer Midtone
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(startX + P, 0);
    ctx.lineTo(midX, -maxThick);
    ctx.lineTo(endX, 0);
    ctx.lineTo(midX, maxThick);
    ctx.closePath();
    ctx.fill();

    // 3. Searing Razor-White Penetration Core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(startX + P * 2, 0);
    ctx.lineTo(midX, -maxThick * 0.5);
    ctx.lineTo(endX - P, 0);
    ctx.lineTo(midX, maxThick * 0.5);
    ctx.closePath();
    ctx.fill();

    // 4. Supersonic Conical Jet Diamonds & Piercing Impact Glint
    if (p < 0.45) {
      const glintP = 1.0 - (p / 0.45);
      ctx.save();
      ctx.globalAlpha *= glintP;
      ctx.fillStyle = '#FFFFFF';
      // Diamond shock ring 1
      const d1X = snap(startX + thrustLen * 0.45);
      ctx.fillRect(d1X - P, -P * 2, P * 2, P * 4);
      ctx.fillRect(d1X - P * 2, -P, P * 4, P * 2);
      // Piercing 4-point star at thrust tip
      const tipX = snap(endX);
      ctx.fillRect(tipX - P * 2, -P * 0.5, P * 4, P);
      ctx.fillRect(tipX - P * 0.5, -P * 2, P, P * 4);
      ctx.restore();
    }
  } else {
    // ──────────────────────────────────────────
    // SURGICAL STEEL CRESCENT SLASH ARC (Strikes 1 & 2)
    // ──────────────────────────────────────────
    const R = reach * (0.85 + Math.sin(Math.min(1.0, p / 0.30) * Math.PI * 0.5) * 0.20);
    const maxThick = 9.5;
    const halfAngle = arcAngle * 0.5;

    const sweepP = Math.min(1.0, p / 0.28);
    const dissolveP = (p > 0.42) ? ((p - 0.42) / 0.58) : 0;

    let minAng, maxAng;
    if (sweepDir === 1) {
      minAng = -halfAngle + arcAngle * dissolveP * 0.85;
      maxAng = -halfAngle + arcAngle * sweepP;
    } else {
      minAng = halfAngle - arcAngle * sweepP;
      maxAng = halfAngle - arcAngle * dissolveP * 0.85;
    }

    const span = maxAng - minAng;
    if (span > 0.04) {
      const isInsideKnifeSlash = (rx, ry) => {
        const dist = Math.hypot(rx, ry);
        if (dist > R || dist <= 0) return false;
        const ang = Math.atan2(ry, rx);
        if (ang < minAng || ang > maxAng) return false;

        const t = Math.max(0, Math.min(1.0, (ang - minAng) / span));
        const taper = Math.sin(t * Math.PI);
        if (taper <= 0) return false;

        const inR = R - maxThick * Math.pow(taper, 0.90);
        return dist >= inR;
      };

      const minX = Math.floor((Math.min(Math.cos(minAng), Math.cos(maxAng), Math.cos(0)) * R - maxThick - P * 2) / P) * P;
      const maxX = Math.ceil((R + P * 2) / P) * P;
      const maxY = Math.ceil((R + P * 2) / P) * P;

      for (let gy = -maxY; gy <= maxY; gy += P) {
        for (let gx = minX; gx <= maxX; gx += P) {
          if (!isInsideKnifeSlash(gx, gy)) continue;

          const px = snap(gx);
          const py = snap(gy);

          const isBorder = !isInsideKnifeSlash(gx + P, gy) ||
                           !isInsideKnifeSlash(gx - P, gy) ||
                           !isInsideKnifeSlash(gx, gy + P) ||
                           !isInsideKnifeSlash(gx, gy - P);

          if (isBorder) {
            ctx.fillStyle = '#0F172A'; // Obsidian ink border
            ctx.fillRect(px, py, P, P);
            continue;
          }

          const dist = Math.hypot(gx, gy);
          const depthFromApex = R - dist;

          if (depthFromApex < P * 1.5) {
            ctx.fillStyle = '#FFFFFF'; // Razor-sharp surgical steel cutting edge
          } else if (depthFromApex < P * 3.0) {
            ctx.fillStyle = '#F8FAFC'; // Pure silver blade core
          } else if (depthFromApex < P * 5.0) {
            ctx.fillStyle = '#CBD5E1'; // Steel reflection midtone
          } else {
            ctx.fillStyle = '#64748B'; // Deep gunmetal blade spine
          }

          ctx.fillRect(px, py, P, P);
        }
      }

      // Metallic Glint at Knife Cutting Apex
      if (p < 0.45) {
        const glintAlpha = (1.0 - p / 0.45);
        ctx.save();
        ctx.globalAlpha *= glintAlpha;
        ctx.fillStyle = '#FFFFFF';
        const apexX = snap(Math.cos(sweepDir === 1 ? maxAng : minAng) * R);
        const apexY = snap(Math.sin(sweepDir === 1 ? maxAng : minAng) * R);
        ctx.fillRect(apexX - P * 2, apexY, P * 4, P);
        ctx.fillRect(apexX, apexY - P * 2, P, P * 4);
        ctx.fillRect(apexX - P * 0.5, apexY - P * 0.5, P, P);
        ctx.restore();
      }
    }
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
  ctx.imageSmoothingEnabled = false;

  if (isHybrid) {
    // Devil Form: Pixel-art shockwave ring for ALL punches (no slash — bare-handed explosive punch)
    _drawRezePixelShockwaveRing(ctx, p, baseReach, P, snap, now, isFinisher);
  } else {
    // Human Form: Blade crescent slash visuals
    ctx.rotate(arcFx.angle || 0);
    if (isFinisher) {
      _drawRezePixelSparkSlapBlast(ctx, p, arcAngle, baseReach, isHybrid, P, snap, now);
    } else {
      _drawRezePixelSparkChopArc(ctx, p, arcAngle, baseReach, sweepDir, isHybrid, P, snap, now);
    }
  }

  ctx.restore();
}

/**
 * Pixel Art Shockwave Ring — Devil Form Bare-Handed Explosive Punch Visual
 * Draws concentric expanding octagonal shockwave rings with pixelated geometry:
 * - Outer ring: Dark ink outline (#14101A) with fiery orange (#FF2E00) fill
 * - Middle ring: Bright tangerine (#FF7A00) with gold (#FFE600) highlights
 * - Inner ring: White-hot (#FFFFFF) detonation core
 * - Radiating pixel spark shards shooting outward
 * - Zero shadowBlur (Rule 11)
 */
function _drawRezePixelShockwaveRing(ctx, p, reach, P, snap, now, isFinisher = false) {
  const alpha = (p <= 0.55) ? 1.0 : Math.cos(((p - 0.55) / 0.45) * (Math.PI * 0.5));
  if (alpha <= 0.01) return;

  // Expansion curve: fast initial burst, then decelerating
  const expandP = Math.pow(Math.min(1.0, p / 0.35), 0.55);
  const maxR = reach * (isFinisher ? 1.75 : 1.45);
  const curR = maxR * (0.25 + expandP * 0.75);

  // Ring thickness tapers as it expands (finisher is thicker)
  const ringThick = Math.max(P * 2, (P * (isFinisher ? 9.5 : 7.5)) * (1.0 - expandP * 0.65));
  const innerR = Math.max(0, curR - ringThick);

  ctx.save();
  ctx.globalAlpha *= alpha;

  // Octagonal pixel ring rasterization
  const gridExtent = Math.ceil((curR + P * 3) / P) * P;

  // --- Pass 1: Outer Ring (fiery shockwave band) ---
  for (let gy = -gridExtent; gy <= gridExtent; gy += P) {
    for (let gx = -gridExtent; gx <= gridExtent; gx += P) {
      const dist = Math.hypot(gx, gy);

      // Inside the ring band?
      if (dist > curR || dist < innerR) continue;

      const px = snap(gx);
      const py = snap(gy);

      // 4-neighbor border test for crisp pixel outline
      const isBorder =
        Math.hypot(gx + P, gy) > curR || Math.hypot(gx + P, gy) < innerR ||
        Math.hypot(gx - P, gy) > curR || Math.hypot(gx - P, gy) < innerR ||
        Math.hypot(gx, gy + P) > curR || Math.hypot(gx, gy + P) < innerR ||
        Math.hypot(gx, gy - P) > curR || Math.hypot(gx, gy - P) < innerR;

      if (isBorder) {
        ctx.fillStyle = '#14101A'; // Dark ink pixel outline
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Depth-based color banding within the ring
      const depthNorm = (dist - innerR) / ringThick; // 0 = inner edge, 1 = outer edge

      if (depthNorm > 0.75) {
        // Outer cutting edge: bright yellow-white
        ctx.fillStyle = '#FFE600';
      } else if (depthNorm > 0.45) {
        // Mid band: vibrant tangerine orange
        ctx.fillStyle = '#FF7A00';
      } else if (depthNorm > 0.18) {
        // Inner glow: deep explosive red-orange
        ctx.fillStyle = '#FF2E00';
      } else {
        // Core edge: hot gold
        ctx.fillStyle = '#FFF033';
      }

      ctx.fillRect(px, py, P, P);
    }
  }

  // --- Pass 2: White-hot inner detonation core (early phase only) ---
  if (p < 0.40) {
    const coreAlpha = (1.0 - p / 0.40);
    const coreR = innerR * 0.55;
    ctx.save();
    ctx.globalAlpha *= coreAlpha;
    for (let gy = -gridExtent; gy <= gridExtent; gy += P) {
      for (let gx = -gridExtent; gx <= gridExtent; gx += P) {
        const dist = Math.hypot(gx, gy);
        if (dist > coreR) continue;
        const px = snap(gx);
        const py = snap(gy);
        const coreBorder = Math.hypot(gx + P, gy) > coreR || Math.hypot(gx - P, gy) > coreR ||
                           Math.hypot(gx, gy + P) > coreR || Math.hypot(gx, gy - P) > coreR;
        ctx.fillStyle = coreBorder ? '#FFE600' : '#FFFFFF';
        ctx.fillRect(px, py, P, P);
      }
    }
    ctx.restore();
  }

  // --- Pass 3: Radiating pixel spark shards ---
  const sparkCount = isFinisher ? 12 : 8;
  const sparkLen = P * (isFinisher ? 4.5 + expandP * 3.5 : 3.5 + expandP * 2.5);
  const sparkThick = P;
  const sparkBaseR = curR + P * 2;
  const rotOffset = (now * 0.0012) % (Math.PI * 2);

  for (let i = 0; i < sparkCount; i++) {
    const ang = (i / sparkCount) * Math.PI * 2 + rotOffset;
    const sx = snap(Math.cos(ang) * sparkBaseR);
    const sy = snap(Math.sin(ang) * sparkBaseR);

    // Each spark shard is a short pixel line along the radial direction
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);

    // Alternate spark colors: orange, yellow, white, dark
    let sparkColor;
    if (i % 4 === 0) sparkColor = '#FF2E00';
    else if (i % 4 === 1) sparkColor = '#FFE600';
    else if (i % 4 === 2) sparkColor = '#FFFFFF';
    else sparkColor = '#FF7A00';

    ctx.fillStyle = sparkColor;
    for (let s = 0; s < sparkLen; s += P) {
      const ppx = snap(sx + dx * s);
      const ppy = snap(sy + dy * s);
      ctx.fillRect(ppx, ppy, sparkThick, sparkThick);
    }
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
        ctx.fillStyle = isHybrid ? '#FF2E00' : '#430363ff';
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
 * Draws Reze's Punch AOE Explosion Detonation (Bomb Devil Hybrid Combat)
 * Features:
 * - Concentric expanding fireball envelopes (molten blast red, radiant orange, spark yellow)
 * - White-hot incandescent detonation apex
 * - Supersonic Mach compression shockwave ring & secondary gold ring
 * - Radiating pixel spark shards
 * - Zero shadowBlur (Rule 11)
 */
export function drawRezePalmBlast(ctx, blast) {
  if (!blast || blast.timer <= 0) return;

  // Backward compatibility: If blast specifies arc and is not a punch explosion, forward to martial arc
  if (blast.arc !== undefined && !blast.isPunchExplosion) {
    drawRezePixelMartialArc(ctx, blast);
    return;
  }

  const p = Math.max(0, Math.min(1.0, 1.0 - (blast.timer / blast.maxTimer)));
  const isFinisher = Boolean(blast.isFinisher);
  const maxR = blast.radius || (isFinisher ? 95 : 70);
  const curR = maxR * Math.pow(p, 0.48);
  const alpha = 1.0 - Math.pow(p, 1.35);
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.translate(blast.x, blast.y);

  // 1. Concentric Fireball Expanding Rings (Rule 11: Zero shadowBlur)
  ctx.fillStyle = `rgba(255, 46, 0, ${0.32 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 1.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 107, 26, ${0.52 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 0.82, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 230, 0, ${0.72 * alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 0.52, 0, Math.PI * 2);
  ctx.fill();

  // White-hot detonation apex
  if (p < 0.45) {
    const coreA = (1.0 - p / 0.45) * alpha;
    ctx.fillStyle = `rgba(255, 255, 255, ${coreA * 0.92})`;
    ctx.beginPath();
    ctx.arc(0, 0, curR * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Supersonic Mach Compression Shockwave Ring
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
  ctx.lineWidth = isFinisher ? 2.5 : 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, curR, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Secondary Spark Gold Shockwave Ring
  ctx.strokeStyle = `rgba(255, 230, 0, ${0.70 * alpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, curR * 0.76, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Radiating Pixel Spark Shards
  const shardCount = isFinisher ? 8 : 5;
  const P = 2.0;
  for (let i = 0; i < shardCount; i++) {
    const ang = (i / shardCount) * Math.PI * 2 + 0.3;
    const sDist = curR * (0.88 + (i % 3) * 0.22);
    const sx = Math.round((Math.cos(ang) * sDist) / P) * P;
    const sy = Math.round((Math.sin(ang) * sDist) / P) * P;
    const size = (i % 2 === 0) ? P * 1.5 : P;
    ctx.fillStyle = (i % 2 === 0) ? '#FFFFFF' : '#FFE600';
    ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
  }

  ctx.restore();
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

  // Transformation Shockwave Rings (Theme Colors: Imperial Plum #430363 & Spark Gold #FFE600)
  if (nuke.isTransformationBlast) {
    ctx.strokeStyle = `rgba(67, 3, 99, ${0.80 * alpha})`;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, 0, curR * 1.08, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 230, 0, ${0.90 * alpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, curR * 0.78, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

let _rezeWeaponImage = null;
let _rezeWeaponImageLoading = false;

export function _getRezeWeaponImage() {
  if (_rezeWeaponImage && _rezeWeaponImage.complete && _rezeWeaponImage.naturalWidth > 0) {
    return _rezeWeaponImage;
  }
  if (!_rezeWeaponImageLoading && typeof Image !== 'undefined') {
    _rezeWeaponImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _rezeWeaponImage = img;
      _rezeWeaponImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Reze weapon image at Assets/model/REZE-WEAPON.png', e);
      _rezeWeaponImageLoading = false;
    };
    img.src = 'Assets/model/REZE-WEAPON.png?v=3';
    _rezeWeaponImage = img;
  }
  return _rezeWeaponImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getRezeWeaponImage();
}

/**
 * Pre-compiled discrete pixel runs for the 100% retro pixel art Chef's Knife (Fallback renderer)
 * Matches Zangetsu & Nanami Cleaver blocky pixel style.
 */
export const _REZE_KNIFE_PIXEL_RUNS = [
  [45,7,34,"#0B0D13"],[12,8,34,"#0B0D13"],[46,8,1,"#FFFFFF"],[47,8,1,"#CBD5E1"],[48,8,2,"#64748B"],[50,8,29,"#1E2330"],[79,8,22,"#0B0D13"],[6,9,6,"#0B0D13"],[12,9,3,"#FFFFFF"],[15,9,30,"#3E414D"],[45,9,1,"#0B0D13"],[46,9,1,"#FFFFFF"],[47,9,1,"#CBD5E1"],[48,9,2,"#64748B"],[50,9,29,"#2B3242"],[79,9,22,"#1E2330"],[101,9,4,"#0B0D13"],[6,10,1,"#0B0D13"],[7,10,5,"#FFFFFF"],[12,10,1,"#CBD5E1"],[13,10,2,"#94A3B8"],[15,10,30,"#2A2C35"],[45,10,1,"#0B0D13"],[46,10,1,"#FFFFFF"],[47,10,1,"#CBD5E1"],[48,10,2,"#64748B"],[50,10,29,"#475569"],[79,10,22,"#2B3242"],[101,10,4,"#1E2330"],[105,10,5,"#0B0D13"],[6,11,1,"#0B0D13"],[7,11,3,"#E2E8F0"],[10,11,3,"#CBD5E1"],[13,11,2,"#94A3B8"],[15,11,30,"#181920"],[45,11,1,"#0B0D13"],[46,11,1,"#E2E8F0"],[47,11,1,"#CBD5E1"],[48,11,2,"#64748B"],[50,11,51,"#475569"],[101,11,4,"#2B3242"],[105,11,5,"#1E2330"],[110,11,4,"#0B0D13"],[6,12,1,"#0B0D13"],[7,12,3,"#E2E8F0"],[10,12,3,"#CBD5E1"],[13,12,2,"#94A3B8"],[15,12,7,"#181920"],[22,12,3,"#0B0D13"],[25,12,5,"#181920"],[30,12,3,"#0B0D13"],[33,12,5,"#181920"],[38,12,3,"#0B0D13"],[41,12,4,"#181920"],[45,12,1,"#0B0D13"],[46,12,1,"#E2E8F0"],[47,12,1,"#CBD5E1"],[48,12,2,"#64748B"],[50,12,28,"#475569"],[78,12,1,"#94A3B8"],[79,12,11,"#475569"],[90,12,11,"#94A3B8"],[101,12,3,"#475569"],[104,12,1,"#94A3B8"],[105,12,5,"#2B3242"],[110,12,4,"#1E2330"],[114,12,3,"#0B0D13"],[6,13,1,"#0B0D13"],[7,13,3,"#E2E8F0"],[10,13,3,"#CBD5E1"],[13,13,2,"#94A3B8"],[15,13,6,"#181920"],[21,13,1,"#0B0D13"],[22,13,2,"#FFFFFF"],[24,13,1,"#E2E8F0"],[25,13,1,"#0B0D13"],[26,13,3,"#181920"],[29,13,1,"#0B0D13"],[30,13,2,"#FFFFFF"],[32,13,1,"#E2E8F0"],[33,13,1,"#0B0D13"],[34,13,3,"#181920"],[37,13,1,"#0B0D13"],[38,13,2,"#FFFFFF"],[40,13,1,"#E2E8F0"],[41,13,1,"#0B0D13"],[42,13,3,"#181920"],[45,13,1,"#0B0D13"],[46,13,1,"#E2E8F0"],[47,13,1,"#CBD5E1"],[48,13,2,"#64748B"],[50,13,64,"#94A3B8"],[114,13,3,"#1E2330"],[117,13,3,"#0B0D13"],[6,14,1,"#0B0D13"],[7,14,3,"#E2E8F0"],[10,14,3,"#CBD5E1"],[13,14,2,"#94A3B8"],[15,14,6,"#181920"],[21,14,1,"#0B0D13"],[22,14,1,"#E2E8F0"],[23,14,1,"#CBD5E1"],[24,14,1,"#94A3B8"],[25,14,1,"#0B0D13"],[26,14,3,"#181920"],[29,14,1,"#0B0D13"],[30,14,1,"#E2E8F0"],[31,14,1,"#CBD5E1"],[32,14,1,"#94A3B8"],[33,14,1,"#0B0D13"],[34,14,3,"#181920"],[37,14,1,"#0B0D13"],[38,14,1,"#E2E8F0"],[39,14,1,"#CBD5E1"],[40,14,1,"#94A3B8"],[41,14,1,"#0B0D13"],[42,14,3,"#181920"],[45,14,1,"#0B0D13"],[46,14,1,"#E2E8F0"],[47,14,1,"#CBD5E1"],[48,14,2,"#64748B"],[50,14,40,"#94A3B8"],[90,14,24,"#CBD5E1"],[114,14,6,"#94A3B8"],[120,14,2,"#0B0D13"],[6,15,1,"#0B0D13"],[7,15,3,"#E2E8F0"],[10,15,3,"#CBD5E1"],[13,15,2,"#94A3B8"],[15,15,6,"#181920"],[21,15,1,"#0B0D13"],[22,15,1,"#CBD5E1"],[23,15,1,"#94A3B8"],[24,15,1,"#64748B"],[25,15,1,"#0B0D13"],[26,15,3,"#181920"],[29,15,1,"#0B0D13"],[30,15,1,"#CBD5E1"],[31,15,1,"#94A3B8"],[32,15,1,"#64748B"],[33,15,1,"#0B0D13"],[34,15,3,"#181920"],[37,15,1,"#0B0D13"],[38,15,1,"#CBD5E1"],[39,15,1,"#94A3B8"],[40,15,1,"#64748B"],[41,15,1,"#0B0D13"],[42,15,3,"#181920"],[45,15,1,"#0B0D13"],[46,15,1,"#E2E8F0"],[47,15,1,"#CBD5E1"],[48,15,2,"#64748B"],[50,15,67,"#CBD5E1"],[117,15,4,"#FFFFFF"],[121,15,2,"#0B0D13"],[6,16,1,"#0B0D13"],[7,16,3,"#E2E8F0"],[10,16,3,"#CBD5E1"],[13,16,2,"#94A3B8"],[15,16,7,"#181920"],[22,16,3,"#0B0D13"],[25,16,5,"#181920"],[30,16,3,"#0B0D13"],[33,16,5,"#181920"],[38,16,3,"#0B0D13"],[41,16,4,"#181920"],[45,16,1,"#0B0D13"],[46,16,1,"#E2E8F0"],[47,16,1,"#CBD5E1"],[48,16,2,"#64748B"],[50,16,54,"#CBD5E1"],[104,16,1,"#E2E8F0"],[105,16,3,"#CBD5E1"],[108,16,2,"#F1F5F9"],[110,16,3,"#E2E8F0"],[113,16,4,"#FFFFFF"],[117,16,4,"#0B0D13"],[6,17,4,"#0B0D13"],[10,17,3,"#CBD5E1"],[13,17,2,"#94A3B8"],[15,17,30,"#181920"],[45,17,1,"#0B0D13"],[46,17,1,"#E2E8F0"],[47,17,1,"#CBD5E1"],[48,17,2,"#64748B"],[50,17,49,"#CBD5E1"],[99,17,5,"#E2E8F0"],[104,17,4,"#F1F5F9"],[108,17,5,"#FFFFFF"],[113,17,4,"#0B0D13"],[10,18,1,"#0B0D13"],[11,18,2,"#CBD5E1"],[13,18,2,"#94A3B8"],[15,18,30,"#181920"],[45,18,1,"#0B0D13"],[46,18,1,"#E2E8F0"],[47,18,1,"#CBD5E1"],[48,18,2,"#64748B"],[50,18,40,"#CBD5E1"],[90,18,9,"#E2E8F0"],[99,18,5,"#F1F5F9"],[104,18,4,"#FFFFFF"],[108,18,5,"#0B0D13"],[11,19,1,"#0B0D13"],[12,19,1,"#CBD5E1"],[13,19,2,"#94A3B8"],[15,19,26,"#181920"],[41,19,4,"#111217"],[45,19,1,"#0B0D13"],[46,19,1,"#E2E8F0"],[47,19,1,"#CBD5E1"],[48,19,2,"#64748B"],[50,19,28,"#CBD5E1"],[78,19,1,"#E2E8F0"],[79,19,5,"#CBD5E1"],[84,19,11,"#E2E8F0"],[95,19,4,"#F1F5F9"],[99,19,5,"#FFFFFF"],[104,19,4,"#0B0D13"],[12,20,1,"#0B0D13"],[13,20,2,"#94A3B8"],[15,20,8,"#111217"],[23,20,9,"#181920"],[32,20,9,"#111217"],[41,20,5,"#0B0D13"],[46,20,1,"#E2E8F0"],[47,20,1,"#CBD5E1"],[48,20,2,"#64748B"],[50,20,20,"#CBD5E1"],[70,20,20,"#E2E8F0"],[90,20,5,"#F1F5F9"],[95,20,4,"#FFFFFF"],[99,20,5,"#0B0D13"],[13,21,1,"#0B0D13"],[14,21,1,"#94A3B8"],[15,21,8,"#0B0D13"],[23,21,9,"#111217"],[32,21,9,"#0B0D13"],[45,21,1,"#0B0D13"],[46,21,1,"#E2E8F0"],[47,21,1,"#CBD5E1"],[48,21,2,"#64748B"],[50,21,34,"#E2E8F0"],[84,21,6,"#F1F5F9"],[90,21,5,"#FFFFFF"],[95,21,4,"#0B0D13"],[14,22,1,"#0B0D13"],[23,22,9,"#0B0D13"],[46,22,1,"#E2E8F0"],[47,22,1,"#CBD5E1"],[48,22,2,"#64748B"],[50,22,28,"#E2E8F0"],[78,22,6,"#F1F5F9"],[84,22,6,"#FFFFFF"],[90,22,5,"#0B0D13"],[46,23,1,"#0B0D13"],[47,23,1,"#CBD5E1"],[48,23,2,"#64748B"],[50,23,20,"#E2E8F0"],[70,23,8,"#F1F5F9"],[78,23,6,"#FFFFFF"],[84,23,6,"#0B0D13"],[47,24,1,"#CBD5E1"],[48,24,2,"#64748B"],[50,24,20,"#F1F5F9"],[70,24,8,"#FFFFFF"],[78,24,6,"#0B0D13"],[47,25,1,"#0B0D13"],[48,25,2,"#64748B"],[50,25,20,"#FFFFFF"],[70,25,8,"#0B0D13"],[48,26,22,"#0B0D13"]
];

/**
 * Draws the 100% discrete pixel art Chef Knife using pre-compiled pixel runs.
 */
export function _drawDiscretePixelChefKnife(ctx, ox = 0, oy = 0, scale = 1.0) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < _REZE_KNIFE_PIXEL_RUNS.length; i++) {
    const run = _REZE_KNIFE_PIXEL_RUNS[i];
    ctx.fillStyle = run[3];
    ctx.fillRect(run[0], run[1], run[2], 1);
  }
  ctx.restore();
}

/**
 * Draws Reze's Concealed Kitchen Chef's Knife in authentic 100% retro pixel art style.
 * 1:1 match with Zangetsu & Nanami Cleaver standard.
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Offset X
 * @param {number} y Offset Y
 * @param {number} angle Facing/Wielding angle
 * @param {number} r Fighter body radius
 * @param {Object} opts Extra options (isPreview, scale, showHand, isReverseGrip, now)
 */
export function drawRezeTacticalKnife(ctx, x = 0, y = 0, angle = 0, r = 25, opts = {}) {
  const now = opts.now || Date.now();
  const isPreview = Boolean(opts.isPreview);
  const isReverseGrip = Boolean(opts.isReverseGrip);
  const scale = opts.scale || 1.0;

  ctx.save();
  ctx.translate(x, y);

  // Facing orientation & local coordinate transforms
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  const baseAngle = facingLeft ? Math.PI : 0;
  let diff = angle - baseAngle;
  let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (facingLeft) {
    normDiff = -normDiff;
  }
  ctx.rotate(baseAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  ctx.rotate(normDiff);

  if (isReverseGrip) {
    ctx.rotate(Math.PI * 0.72);
  }

  ctx.scale(scale, scale);

  // Standalone preview subtle floating breathing bob
  if (isPreview) {
    ctx.translate(0, Math.sin(now / 350) * 1.5);
  }

  const wImg = _getRezeWeaponImage();
  if (wImg && wImg.complete && wImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const s = isPreview ? 1.05 : 0.68;
    const anchorX = 30 * s;
    const anchorY = 14 * s;
    const drawW = 128 * s;
    const drawH = 36 * s;
    ctx.drawImage(wImg, 0, 0, wImg.naturalWidth, wImg.naturalHeight, -anchorX, -anchorY, drawW, drawH);
    ctx.restore();
  } else {
    const s = isPreview ? 1.05 : 0.68;
    _drawDiscretePixelChefKnife(ctx, -30 * s, -14 * s, s);
  }

  // Preview sparkle glints
  if (isPreview) {
    const glintPulse = Math.sin(now / 180) * 0.4 + 0.6;
    ctx.save();
    ctx.globalAlpha *= glintPulse;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(78, 1, 3, 3);
    ctx.fillRect(77, 2, 5, 1);
    ctx.fillRect(79, 0, 1, 5);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws Reze's Weapon Preview for Weapon Studio & Weapon Index Screen
 */
export function drawRezeWeaponPreview(ctx, x = 0, y = 0, angle = 0, r = 25, opts = {}) {
  const isHybrid = Boolean(state.showRezeTransformation);
  if (!isHybrid) {
    // Human Form: Soviet Concealed Tactical Chef Knife
    drawRezeTacticalKnife(ctx, x, y, angle, r, { ...opts, isPreview: true, scale: 1.15 });
  } else {
    // Bomb Devil Form: Tactical Knife with dormant flame aura
    drawRezeTacticalKnife(ctx, x, y, angle, r, { ...opts, isPreview: true, scale: 1.15 });
  }
}

