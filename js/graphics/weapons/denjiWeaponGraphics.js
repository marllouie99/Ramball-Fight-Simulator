// ─────────────────────────────────────────────
// Denji (Chainsaw Devil) Weapon & Combat FX Visuals
// Adheres strictly to:
// - Rule 16 (Manga Action Speed Lines — 4-Point Filled Needle Polygons)
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// ─────────────────────────────────────────────

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

let _denjiSpeedLineSeeds = null;

function _initDenjiSpeedLineSeeds() {
  const seeds = [];
  const count = 22;
  for (let i = 0; i < count; i++) {
    const norm = (i / (count - 1)) * 2 - 1; // -1 to +1
    const perpOffset = norm * 32;          // Cluster width: ±32px (matching body radius 25px)
    const normDist = 1 - Math.abs(norm);   // Parabolic length
    const length = 40 + normDist * 50;     // 40px to 90px
    const speed = 1.2 + Math.random() * 0.8;
    const phase = Math.random() * 100;
    seeds.push({ perpOffset, length, speed, phase });
  }
  return seeds;
}

/**
 * Draws Manga Action Speed Lines behind Denji during Engine Lunges (Rule 16)
 */
export function drawDenjiSpeedLines(ctx, fighter) {
  if (!fighter || !fighter.isEngineLunging) return;

  if (!_denjiSpeedLineSeeds) {
    _denjiSpeedLineSeeds = _initDenjiSpeedLineSeeds();
  }

  const now = Date.now();
  const aimAngle = fighter.gunAngle || fighter.angle || 0;
  const backOffset = (fighter.r || 25) * 1.2;
  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);
  const perpX = -sinA;
  const perpY =  cosA;

  ctx.save();
  for (let i = 0; i < _denjiSpeedLineSeeds.length; i++) {
    const seed = _denjiSpeedLineSeeds[i];
    const travel = ((now * 0.001 * seed.speed * 60 + seed.phase) % 80);

    const lineCenterX = fighter.x - cosA * (backOffset + travel) + perpX * seed.perpOffset;
    const lineCenterY = fighter.y - sinA * (backOffset + travel) + perpY * seed.perpOffset;

    const halfLen = seed.length * 0.5;
    const startX = lineCenterX - cosA * halfLen;
    const startY = lineCenterY - sinA * halfLen;
    const endX   = lineCenterX + cosA * halfLen;
    const endY   = lineCenterY + sinA * halfLen;

    const midOff = halfLen * 0.15;
    const bulgeX = lineCenterX + cosA * midOff;
    const bulgeY = lineCenterY + sinA * midOff;
    const halfThick = 1.2;

    const topMidX = bulgeX + perpX * halfThick;
    const topMidY = bulgeY + perpY * halfThick;
    const botMidX = bulgeX - perpX * halfThick;
    const botMidY = bulgeY - perpY * halfThick;

    // 4-Slot Color Theme Standard (Rule 16)
    let color;
    if (i % 4 === 0) color = 'rgba(234, 179, 8, 0.90)';   // Chainsaw Amber Gold
    else if (i % 4 === 1) color = 'rgba(220, 38, 38, 0.85)'; // Blood Engine Crimson
    else if (i % 4 === 2) color = 'rgba(255, 255, 255, 0.95)'; // White-hot core
    else color = 'rgba(15, 23, 42, 0.90)';                 // Dark Gunmetal Ink

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

let _denjiChainsawBladeImage = null;
let _denjiChainsawBladeLoading = false;
let _denjiChainsawTeethImage = null;
let _denjiChainsawTeethLoading = false;
let _denjiChainsawBlockImage = null;
let _denjiChainsawBlockLoading = false;

export function _getDenjiChainsawBladeImage() {
  if (_denjiChainsawBladeImage && _denjiChainsawBladeImage.complete && _denjiChainsawBladeImage.naturalWidth > 0) {
    return _denjiChainsawBladeImage;
  }
  if (!_denjiChainsawBladeLoading && typeof Image !== 'undefined') {
    _denjiChainsawBladeLoading = true;
    const img = new Image();
    img.onload = () => { _denjiChainsawBladeImage = img; _denjiChainsawBladeLoading = false; };
    img.onerror = () => { _denjiChainsawBladeLoading = false; };
    img.src = 'Assets/model/denji/Chainsaw Blade Parts/chainsaw-blade-no-teeth-transparent.png?v=10';
    _denjiChainsawBladeImage = img;
  }
  return _denjiChainsawBladeImage;
}

export function _getDenjiChainsawTeethImage() {
  if (_denjiChainsawTeethImage && _denjiChainsawTeethImage.complete && _denjiChainsawTeethImage.naturalWidth > 0) {
    return _denjiChainsawTeethImage;
  }
  if (!_denjiChainsawTeethLoading && typeof Image !== 'undefined') {
    _denjiChainsawTeethLoading = true;
    const img = new Image();
    img.onload = () => { _denjiChainsawTeethImage = img; _denjiChainsawTeethLoading = false; };
    img.onerror = () => { _denjiChainsawTeethLoading = false; };
    img.src = 'Assets/model/denji/Chainsaw Blade Parts/chainsaw-chain-teeth-transparent.png?v=10';
    _denjiChainsawTeethImage = img;
  }
  return _denjiChainsawTeethImage;
}

export function _getDenjiChainsawBlockImage() {
  if (_denjiChainsawBlockImage && _denjiChainsawBlockImage.complete && _denjiChainsawBlockImage.naturalWidth > 0) {
    return _denjiChainsawBlockImage;
  }
  if (!_denjiChainsawBlockLoading && typeof Image !== 'undefined') {
    _denjiChainsawBlockLoading = true;
    const img = new Image();
    img.onload = () => { _denjiChainsawBlockImage = img; _denjiChainsawBlockLoading = false; };
    img.onerror = () => { _denjiChainsawBlockLoading = false; };
    img.src = 'Assets/model/denji/Chainsaw Blade Parts/chainsaw-chain-teeth-block.png?v=1';
    _denjiChainsawBlockImage = img;
  }
  return _denjiChainsawBlockImage;
}

// Proactive eager initialization in browser environment
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getDenjiChainsawBladeImage();
  _getDenjiChainsawTeethImage();
  _getDenjiChainsawBlockImage();
}

/**
 * Draws the authentic Chainsaw Man chainsaw blade:
 * Uses chainsaw-blade-no-teeth-transparent.png & chainsaw-chain-teeth-block.png
 * Cut to pure straight guide bar and cutting chain track (sx = 547..2141, sw = 1594, sh = 369)
 * 1:1 Match with Chainsaw Man anime appearance (protruding directly out of helmet/forearm)
 * Features continuous racetrack modular chain teeth animation (turned ON, idle rumble, attack revving)
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} length - Total length of the blade (e.g. 72 for forehead, 58 for arm)
 * @param {number} thickness - Height/thickness of the blade (e.g. 17 for forehead, 13.5 for arm)
 * @param {number} now - Animation timestamp
 * @param {Object} [opts={}] - Combat states ({ isAttacking, isLunging, isSawing, isMassacre })
 */
export function drawAuthenticChainsawBlade(ctx, length, thickness, now = Date.now(), opts = {}) {
  const straightLen = Math.round(length - thickness / 2);
  const halfH = Math.max(3, Math.round(thickness / 2));
  const totalLen = Math.round(length);

  const isLunging = Boolean(opts.isLunging || opts.isEngineLunging || opts.isMassacre);
  const isAttacking = Boolean(opts.isAttacking || opts.isSawing || opts.isPunching);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Chainsaw Engine Rumble & Harmonic Jitter (Turned ON Running Motor)
  const rumbleRate = isLunging ? 0.32 : (isAttacking ? 0.20 : 0.11);
  const rumbleAmp = isLunging ? 0.75 : (isAttacking ? 0.45 : 0.20);
  const rumbleY = Math.sin(now * rumbleRate) * rumbleAmp;
  const rumbleAngle = Math.cos(now * (rumbleRate * 0.85)) * (isLunging ? 0.015 : (isAttacking ? 0.008 : 0.004));
  ctx.translate(0, rumbleY);
  ctx.rotate(rumbleAngle);

  const bladeImg = _getDenjiChainsawBladeImage();
  const blockImg = _getDenjiChainsawBlockImage();
  const teethImg = _getDenjiChainsawTeethImage();
  const hasBlade = Boolean(bladeImg && bladeImg.complete && bladeImg.naturalWidth > 0);
  const hasBlock = Boolean(blockImg && blockImg.complete && blockImg.naturalWidth > 0);
  const hasTeeth = Boolean(teethImg && teethImg.complete && teethImg.naturalWidth > 0);

  if (hasBlade || hasBlock || hasTeeth) {
    // Cut out left-side bracket & sprocket: sx = 547, sy = 168, sw = 1594, sh = 369 (aspect ratio: 1594 : 369)
    const bladeW = length;
    const bladeH = Math.round((length * 369) / 1594);

    // Layer 1: Pure straight guide bar plate (Solid Base)
    if (hasBlade) {
      ctx.drawImage(bladeImg, 547, 168, 1594, 369, 0, -bladeH / 2, bladeW, bladeH);
    }

    // Layer 2: Modular Animated Chain Loop using chainsaw-chain-teeth-block.png
    if (hasBlock) {
      const R = Math.max(2.5, bladeH * 0.46);
      const trackStraight = bladeW - R;
      const noseArcLen = Math.PI * R;
      const totalPerimeter = trackStraight * 2 + noseArcLen;

      // Calibrated sleek tooth proportions (Rule 19 & Anime Reference proportions)
      const toothH = bladeH * 0.38;
      const toothW = toothH * (232 / 143);
      const toothSpacing = Math.max(6, Math.round(bladeH * 0.52)); // ~8px - 10px pitch spacing
      const numTeeth = Math.ceil(totalPerimeter / toothSpacing);

      // High-speed realistic chainsaw motor RPM (turned ON buzz)
      const chainSpeed = isLunging ? 0.80 : (isAttacking ? 0.45 : 0.22); // px per ms
      const chainOffset = ((now * chainSpeed) % totalPerimeter);

      for (let i = 0; i < numTeeth; i++) {
        const d = (i * toothSpacing + chainOffset) % totalPerimeter;
        let tx = 0;
        let ty = 0;
        let rot = 0;

        if (d < trackStraight) {
          // Top Rail: cutting tooth travels forward (+X towards blade tip)
          tx = d;
          ty = -bladeH * 0.44;
          rot = 0;
        } else if (d < trackStraight + noseArcLen) {
          // Nose Curve: cutting tooth revolves smoothly 180° around the tip
          const u = (d - trackStraight) / noseArcLen;
          const th = -Math.PI / 2 + u * Math.PI;
          tx = trackStraight + Math.cos(th) * R;
          ty = Math.sin(th) * R;
          rot = th + Math.PI / 2;
        } else {
          // Bottom Rail: chain link returns backward (-X towards engine)
          const u = d - (trackStraight + noseArcLen);
          tx = trackStraight - u;
          ty = bladeH * 0.44;
          rot = Math.PI;
        }

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(rot);
        ctx.drawImage(blockImg, -toothW * 0.5, -toothH * 0.70, toothW, toothH);
        ctx.restore();
      }
    } else if (hasTeeth) {
      // Fallback: static/texture chain teeth overlay if block image is not yet loaded
      const topH = Math.round(bladeH * (172 / 369));
      const botH = bladeH - topH;
      ctx.drawImage(teethImg, 547, 168, 1594, 172, 0, -bladeH / 2, bladeW, topH);
      ctx.drawImage(teethImg, 547, 340, 1594, 197, 0, -bladeH / 2 + topH, bladeW, botH);
    }

    // Micro Friction Sparks when Revving/Attacking/Lunging
    if (isAttacking || isLunging) {
      const sparkCount = isLunging ? 4 : 2;
      for (let i = 0; i < sparkCount; i++) {
        const sparkSeed = ((now * 0.08 + i * 41) % 100) / 100;
        const spX = Math.round(bladeW * (0.25 + sparkSeed * 0.70));
        const spY = Math.round(i % 2 === 0 ? -bladeH / 2 - 1 - (sparkSeed * 2.5) : bladeH / 2 + 1 + (sparkSeed * 2.0));
        ctx.fillStyle = (i % 3 === 0) ? '#FEF08A' : ((i % 3 === 1) ? '#F97316' : '#DC2626');
        ctx.fillRect(spX, spY, 1.5, 1.5);
      }
    }
  } else {
    // ── Procedural Guide Bar Plate Fallback ──
    ctx.fillStyle = '#0E1118';
    ctx.fillRect(0, -halfH - 1, straightLen, 1);
    ctx.fillRect(0, halfH, straightLen, 1);

    for (let nx = 0; nx <= halfH; nx++) {
      const colX = straightLen + nx;
      const curH = Math.round(Math.sqrt(Math.max(0, halfH * halfH - nx * nx)));
      ctx.fillRect(colX, -curH - 1, 1, 1);
      ctx.fillRect(colX, curH, 1, 1);
    }

    for (let x = 0; x <= totalLen; x++) {
      let topY = -halfH;
      let botY = halfH - 1;

      if (x > straightLen) {
        const nx = x - straightLen;
        const curH = Math.round(Math.sqrt(Math.max(0, halfH * halfH - nx * nx)));
        topY = -curH;
        botY = curH - 1;
      }

      if (topY > botY) continue;

      for (let y = topY; y <= botY; y++) {
        let color;
        if (y === topY) color = '#181F2B';
        else if (y === topY + 1) color = (x % 3 === 0) ? '#FFFFFF' : '#E4EBF2';
        else if (y === topY + 2) color = ((x + y) % 7 === 0) ? '#B8C2CE' : '#CBD5E1';
        else if (y === 0 || y === -1) {
          if (y === -1 && x < straightLen - 2) color = (x % 4 === 0) ? '#748090' : '#8A96A6';
          else color = ((x * 3 + y * 7) % 5 === 0) ? '#9BA5B4' : '#B3BCC8';
        } else if (y === botY - 1) color = '#748090';
        else if (y === botY) color = '#181F2B';
        else {
          const hash = (x * 13 + y * 29) % 11;
          if (hash === 0) color = '#8893A2';
          else if (hash === 1) color = '#D8DFE8';
          else if (hash <= 4) color = '#A4AFC0';
          else color = '#BAC4D2';
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  ctx.restore();
}

/**
 * Draws Denji's Ripcord & Forearm Chainsaw Preview for Weapon Detail Studio
 */
export function drawDenjiWeaponPreview(ctx, x = 0, y = 0, angle = 0, r = 25, opts = {}) {
  const sawLen = 68;
  const sawThick = 14.5;
  const now = Date.now();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Engine Starter Grip & Ripcord Ring at Base
  ctx.fillStyle = '#090D16';
  ctx.fillRect(-15, -sawThick / 2 - 2, 13, sawThick + 4);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(-14, -sawThick / 2 - 1, 10, sawThick + 2);
  ctx.fillStyle = '#F97316'; // Orange pull cord
  ctx.fillRect(-18, -1.5, 4, 3);
  ctx.fillStyle = '#CBD5E1'; // Metallic pull ring
  ctx.fillRect(-22, -4, 5, 8);
  ctx.fillStyle = '#090D16';
  ctx.fillRect(-20, -1.5, 2, 3);

  // 2. Authentic Chainsaw Blade (1:1 with Reference Picture 1)
  drawAuthenticChainsawBlade(ctx, sawLen, sawThick, now, opts);

  ctx.restore();
}
