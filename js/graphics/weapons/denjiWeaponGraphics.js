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
      const bladeCount = opts?.shredBladeCount || 1;
      const attackSpeed = (bladeCount >= 3 ? 0.70 : (bladeCount === 2 ? 0.55 : 0.45));
      const chainSpeed = isLunging ? 0.80 : (isAttacking ? attackSpeed : 0.22); // px per ms
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
      const bladeCount = opts?.shredBladeCount || 1;
      const sparkCount = isLunging ? 4 : (bladeCount >= 3 ? 5 : (bladeCount === 2 ? 3 : 2));
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

/**
 * Draws bespoke 2D visual effects for Denji's 3-Hit Manga Storyboard Attack Animations:
 * - Frame 5 (Hit 1: Front Thrust Puncture) — Rear engine exhaust smoke puffs & point-blank thrust muzzle sparks.
 * - Frame 4 (Hit 2: Uppercut Split) — Dual rising 'V' blade crescent trails & upward rock debris / spark streams.
 * - Frame 1 (Hit 3: The Cross Cut) — Overlapping 'X' double-tapered crescent slashes & central starburst spark flare.
 *
 * Adheres strictly to:
 * - Rule 11 (Zero shadowBlur CPU Performance Preservation)
 * - Rule 15 (Double-Tapered Crescent Blade Slashes & Sinusoidal Eraser Wipe)
 * - Rule 16 (Manga Action Speed Lines Standard)
 */
export function drawDenjiAttackSlashFX(ctx, fighter, r = 25, now = Date.now()) {
  if (!fighter || !fighter.slashSwingTimer || fighter.slashSwingTimer <= 0) return;
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const maxT = fighter.slashSwingMaxTimer || 14;
  const progress = Math.max(0.0, Math.min(1.0, 1.0 - (fighter.slashSwingTimer / maxT)));
  const combo = (fighter.sawComboCount !== undefined ? fighter.sawComboCount : 0) % 3;
  const step = (fighter.lastExecutedSawCombo !== undefined) ? fighter.lastExecutedSawCombo : combo;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (step === 0) {
    // ══════════════════════════════════════════════════════════════
    // FRAME 5: THE FRONT THRUST PUNCTURE (Rear Smoke & Twin Muzzle Sparks)
    // ══════════════════════════════════════════════════════════════
    const thrustEase = Math.sin(progress * Math.PI);
    const fade = Math.max(0, 1.0 - progress);

    // 1. Dual Rear Exhaust Muffler Smoke Puffs (Puffing backward from -X)
    const puffCount = 3;
    for (let i = 0; i < puffCount; i++) {
      const pProg = Math.min(1.0, progress * 1.3 + i * 0.12);
      const puffDist = 10 + pProg * 28;
      const puffR = 3.5 + pProg * 8.0;
      const puffAlpha = (1.0 - pProg) * 0.75;

      if (puffAlpha <= 0) continue;

      // Top pipe exhaust puff (cy: -r * 0.28)
      const topX = snap(-r * 0.75 - puffDist);
      const topY = snap(-r * 0.28 - (i * 3));
      // Bottom pipe exhaust puff (cy: +r * 0.28)
      const botX = snap(-r * 0.75 - puffDist);
      const botY = snap(r * 0.28 + (i * 3));

      // Layered stepped shading (Dark outline -> Mid gray -> Pure white core)
      ctx.fillStyle = `rgba(15, 23, 42, ${puffAlpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(topX, topY, puffR + 1.5, 0, Math.PI * 2);
      ctx.arc(botX, botY, puffR + 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(148, 163, 184, ${puffAlpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(topX, topY, puffR, 0, Math.PI * 2);
      ctx.arc(botX, botY, puffR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${puffAlpha * 0.95})`;
      ctx.beginPath();
      ctx.arc(topX - 1, topY - 1, puffR * 0.45, 0, Math.PI * 2);
      ctx.arc(botX - 1, botY - 1, puffR * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Point-Blank Thrust Muzzle Sparks at Twin Blade Nose Tips (+r * 2.8)
    if (thrustEase > 0.3) {
      const tipX = snap(r * 2.75);
      const topTipY = snap(-r * 0.22);
      const botTipY = snap(r * 0.22);

      for (let s = 0; s < 4; s++) {
        const spAngle = (s - 1.5) * 0.45;
        const spDist = 6 + (now * 0.15 + s * 11) % 18;
        const spX1 = tipX + Math.cos(spAngle) * spDist;
        const spY1 = topTipY + Math.sin(spAngle) * spDist;
        const spX2 = tipX + Math.cos(spAngle) * spDist;
        const spY2 = botTipY + Math.sin(spAngle) * spDist;

        ctx.fillStyle = (s % 2 === 0) ? '#FFFFFF' : '#FEF08A';
        ctx.fillRect(snap(spX1), snap(spY1), P, P);
        ctx.fillRect(snap(spX2), snap(spY2), P, P);
      }
    }
  } else if (step === 1) {
    // ══════════════════════════════════════════════════════════════
    // FRAME 4: THE UPPERCUT SPLIT (Rising V-Crescent Trails & Ground Debris)
    // ══════════════════════════════════════════════════════════════
    const swingProg = progress;

    // 1. Dual Rising 'V' Crescent Blade Trails
    _drawDoubleTaperedSlashArc(ctx, r * 2.4, -0.75, -0.15, 9.0, swingProg, '#EAB308', '#FEF08A', '#DC2626');
    _drawDoubleTaperedSlashArc(ctx, r * 2.4, 0.15, 0.75, 9.0, swingProg, '#EAB308', '#FEF08A', '#DC2626');

    // 2. Ascending Ground Debris Particles & Sparks
    const debrisCount = 6;
    for (let d = 0; d < debrisCount; d++) {
      const debProg = (swingProg + d * 0.15) % 1.0;
      const debX = snap(r * 0.8 + d * 5 + debProg * 12);
      const debY = snap((d % 2 === 0 ? -1 : 1) * (r * 0.3 + debProg * (r * 1.2)));
      const debSize = (d % 3 === 0) ? 3.0 : 2.0;

      // Dark rock debris chunk
      ctx.fillStyle = (d % 2 === 0) ? '#0F172A' : '#334155';
      ctx.fillRect(debX, debY, debSize, debSize);

      // Upward flaring spark fleck
      if (d % 2 === 0) {
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(debX + 2, debY - 2, 1.5, 1.5);
      }
    }
  } else {
    // ══════════════════════════════════════════════════════════════
    // FRAME 1: THE CROSS CUT (Overlapping 'X' Slashes & Starburst Spark Flash)
    // ══════════════════════════════════════════════════════════════
    const swingProg = progress;

    // 1. Dual Overlapping 'X' Crescent Slashes (Rule 15 Double-Tapered Standard)
    // Slash 1: Sweeping top-left down-right across target center
    _drawDoubleTaperedSlashArc(ctx, r * 2.6, -0.60, 0.60, 11.0, swingProg, '#EAB308', '#FFFFFF', '#DC2626');
    // Slash 2: Sweeping bottom-left up-right across target center
    _drawDoubleTaperedSlashArc(ctx, r * 2.6, 0.60, -0.60, 11.0, swingProg, '#EAB308', '#FFFFFF', '#DC2626');

    // 2. Focal Starburst Spark Flare at Intersection Center (x: +r * 1.15, y: 0)
    const focalX = snap(r * 1.15);
    const focalY = 0;
    const starEase = Math.sin(swingProg * Math.PI);
    if (starEase > 0.1) {
      const starRadius = Math.round(14 * starEase);

      // Concentric ignition flare ring (Rule 11: Zero shadowBlur)
      ctx.fillStyle = `rgba(249, 115, 22, ${0.45 * starEase})`;
      ctx.beginPath();
      ctx.arc(focalX, focalY, starRadius + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(234, 179, 8, ${0.75 * starEase})`;
      ctx.beginPath();
      ctx.arc(focalX, focalY, starRadius, 0, Math.PI * 2);
      ctx.fill();

      // 8-Point Diamond Spark Needles
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(focalX, focalY - starRadius * 1.4);
      ctx.lineTo(focalX + starRadius * 0.3, focalY);
      ctx.lineTo(focalX, focalY + starRadius * 1.4);
      ctx.lineTo(focalX - starRadius * 0.3, focalY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(focalX - starRadius * 1.4, focalY);
      ctx.lineTo(focalX, focalY + starRadius * 0.3);
      ctx.lineTo(focalX + starRadius * 1.4, focalY);
      ctx.lineTo(focalX - starRadius * 0.3, focalY);
      ctx.closePath();
      ctx.fill();

      // 4-Diagonal Micro-Needles
      const diagR = starRadius * 0.85;
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.moveTo(focalX - diagR, focalY - diagR);
      ctx.lineTo(focalX, focalY);
      ctx.lineTo(focalX + diagR, focalY + diagR);
      ctx.lineTo(focalX, focalY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(focalX - diagR, focalY + diagR);
      ctx.lineTo(focalX, focalY);
      ctx.lineTo(focalX + diagR, focalY - diagR);
      ctx.lineTo(focalX, focalY);
      ctx.closePath();
      ctx.fill();

      // Micro sparks exploding from the intersection
      for (let sp = 0; sp < 6; sp++) {
        const ang = sp * (Math.PI / 3) + swingProg * 2;
        const dist = 6 + (swingProg * 28 + sp * 5) % 24;
        const px = snap(focalX + Math.cos(ang) * dist);
        const py = snap(focalY + Math.sin(ang) * dist);
        ctx.fillStyle = (sp % 2 === 0) ? '#FFFFFF' : '#DC2626';
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Draws a Double-Tapered Crescent Slash Arc adhering to Rule 15 standard:
 * - Sinusoidal power tapering (Math.pow(Math.sin(t * Math.PI), 1.15))
 * - Dynamic tail-to-tip eraser wipe during recovery phase
 */
function _drawDoubleTaperedSlashArc(ctx, radius, startAngle, endAngle, maxThick, progress, themeColor, coreColor, accentColor) {
  const isReverse = endAngle < startAngle;
  const minA = Math.min(startAngle, endAngle);
  const maxA = Math.max(startAngle, endAngle);
  const span = maxA - minA;

  // Dynamic Eraser Wipe: Tip leads, Tail follows and erases
  const leadP = Math.min(1.0, progress * 1.6);
  const tailP = Math.max(0.0, (progress - 0.35) / 0.65);
  const currentSpan = span * (leadP - tailP);
  if (currentSpan <= 0.01) return;

  const curStart = isReverse ? (maxA - leadP * span) : (minA + tailP * span);
  const curEnd   = isReverse ? (maxA - tailP * span) : (minA + leadP * span);

  const segments = 16;
  const outerPts = [];
  const innerPts = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = curStart + (curEnd - curStart) * t;
    // Sinusoidal power tapering
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.3 + 0.7 * t);
    const thick = maxThick * taper;

    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    outerPts.push({ x: snap(cosA * (radius + thick * 0.5)), y: snap(sinA * (radius + thick * 0.5)) });
    innerPts.push({ x: snap(cosA * (radius - thick * 0.5)), y: snap(sinA * (radius - thick * 0.5)) });
  }

  // 1. Dark ink boundary / accent rim
  ctx.fillStyle = accentColor || 'rgba(220, 38, 38, 0.85)';
  ctx.beginPath();
  ctx.moveTo(outerPts[0].x, outerPts[0].y);
  for (let p of outerPts) ctx.lineTo(p.x, p.y);
  for (let j = innerPts.length - 1; j >= 0; j--) ctx.lineTo(innerPts[j].x, innerPts[j].y);
  ctx.closePath();
  ctx.fill();

  // 2. Main theme color core
  ctx.fillStyle = themeColor || '#EAB308';
  ctx.beginPath();
  ctx.moveTo(outerPts[0].x, outerPts[0].y);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = curStart + (curEnd - curStart) * t;
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15);
    const thick = (maxThick * 0.65) * taper;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    ctx.lineTo(snap(cosA * (radius + thick * 0.5)), snap(sinA * (radius + thick * 0.5)));
  }
  for (let j = segments; j >= 0; j--) {
    const t = j / segments;
    const a = curStart + (curEnd - curStart) * t;
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15);
    const thick = (maxThick * 0.65) * taper;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    ctx.lineTo(snap(cosA * (radius - thick * 0.5)), snap(sinA * (radius - thick * 0.5)));
  }
  ctx.closePath();
  ctx.fill();

  // 3. Specular white-hot core line
  ctx.fillStyle = coreColor || '#FFFFFF';
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = curStart + (curEnd - curStart) * t;
    const taper = Math.pow(Math.sin(t * Math.PI), 1.3);
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const px = snap(cosA * radius);
    const py = snap(sinA * radius);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = coreColor || '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
