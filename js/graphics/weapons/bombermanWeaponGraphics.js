// ═══════════════════════════════════════════════════════════════════════════
// BOMBER MAN — Bomb, Cross-Blast Explosion & Power-Up Tile Graphics
// Strictly adheres to Rules 11 (Zero shadowBlur), 20 (Hand Grip Anchor),
// 26 (Staggered Water-Ripple Shockwaves, Anti-Cobweb), and 31 (Uncropped Caps)
// ═══════════════════════════════════════════════════════════════════════════

// ── Authentic 16-Bit Pixel Art Bomb Animation Frames (ADHWK1.gif -> bomb-1.png .. bomb-3.png) ──
const BOMBERMAN_BOMB_FRAME_COUNT = 3;
const BOMBERMAN_BOMB_FRAME_PATHS = [
  'Assets/model/bomberman/bomb/bomb-1.png',
  'Assets/model/bomberman/bomb/bomb-2.png',
  'Assets/model/bomberman/bomb/bomb-3.png',
];
let _bombermanBombFrames = [];
let _bombermanBombFramesLoading = false;

export function _getBombermanBombFrames() {
  if (
    _bombermanBombFrames.length === BOMBERMAN_BOMB_FRAME_COUNT &&
    _bombermanBombFrames.every((img) => img && img.complete && img.naturalWidth > 0)
  ) {
    return _bombermanBombFrames;
  }
  if (!_bombermanBombFramesLoading && typeof Image !== 'undefined') {
    _bombermanBombFramesLoading = true;
    _bombermanBombFrames = [];
    BOMBERMAN_BOMB_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _bombermanBombFrames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load Bomberman bomb frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=1`;
      _bombermanBombFrames[idx] = img;
    });
  }
  return _bombermanBombFrames;
}

// ── 12-Frame Authentic Retro Pixel Art Cross Explosion (dFOsRT.gif -> explosion-1.png .. explosion-12.png) ──
const BOMBERMAN_EXPLOSION_FRAME_COUNT = 12;
const BOMBERMAN_EXPLOSION_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/model/bomberman/explosion/explosion-${i + 1}.png`
);
let _bombermanExplosionFrames = [];
let _bombermanExplosionFramesLoading = false;

export function _getBombermanExplosionFrames() {
  if (
    _bombermanExplosionFrames.length === BOMBERMAN_EXPLOSION_FRAME_COUNT &&
    _bombermanExplosionFrames.every((img) => img && img.complete && img.naturalWidth > 0)
  ) {
    return _bombermanExplosionFrames;
  }
  if (!_bombermanExplosionFramesLoading && typeof Image !== 'undefined') {
    _bombermanExplosionFramesLoading = true;
    _bombermanExplosionFrames = [];
    BOMBERMAN_EXPLOSION_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _bombermanExplosionFrames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load Bomberman explosion frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=1`;
      _bombermanExplosionFrames[idx] = img;
    });
  }
  return _bombermanExplosionFrames;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getBombermanBombFrames();
  _getBombermanExplosionFrames();
}

/**
 * Draws a compact round bomb held in Bomber Man's canonical right hand (0, 0).
 * Rule 20: Never draws duplicate hands; the canonical hand is drawn by bombermanSkin.js.
 */
export function drawHeldBomb(ctx, fighter) {
  if (!ctx) return;
  const activeCount = fighter?.activeBombs?.length || 0;
  const maxBombs = fighter?.maxBombs || 1;
  if (activeCount >= maxBombs && (fighter?.plantCooldownTimer || 0) > 12) {
    return;
  }

  ctx.save();
  const tick = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.012;
  const pulse = 1 + Math.sin(tick) * 0.05;
  const fighterR = fighter?.r || 25;
  
  // Chunky, substantial cartoon bomb proportion: sphere diameter ~28-32px (approx half helmet size)
  const baseBombR = fighterR * 0.52;
  const bombR = baseBombR * pulse;

  // Anchored resting cleanly on the right hand palm / lower-right flank (Zero overlaying or clipping)
  const bx = fighterR * 0.30;
  const by = -fighterR * 0.14;

  const bombFrames = _getBombermanBombFrames();
  // Rhythmic breathing / fuse sizzling cycle across bomb frames [0, 1, 2, 1]
  const cycleIndex = Math.floor(tick * 3.5) % 4;
  const frameIdx = cycleIndex === 3 ? 1 : cycleIndex;
  const bombImg = bombFrames[frameIdx] || bombFrames[0];

  if (bombImg && bombImg.complete && bombImg.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    // holdSize scaled to full authentic frame proportion (sphere takes ~55% of 256x256 image)
    const holdSize = bombR * 3.55;
    ctx.drawImage(bombImg, bx - holdSize * 0.498, by - holdSize * 0.441, holdSize, holdSize);
    ctx.restore();
    return;
  }

  // ── Procedural Fallback Pass (Matching scaled-up chunky bomb proportions) ──
  // Outer dark manga ink outline (Rule 32)
  ctx.fillStyle = '#0E0F14';
  ctx.beginPath();
  ctx.arc(bx, by, bombR + 2.0, 0, Math.PI * 2);
  ctx.fill();

  // Cast-iron spherical bomb body
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(bx, by, bombR, 0, Math.PI * 2);
  ctx.fill();

  // Inner metallic shading crescent
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(bx - bombR * 0.12, by - bombR * 0.12, bombR * 0.72, 0, Math.PI * 2);
  ctx.fill();

  // Crisp specular highlight dot
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(bx - bombR * 0.36, by - bombR * 0.36, bombR * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // Top fuse cap & sizzling spark
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(bx, by - bombR, 3.6, 0, Math.PI * 2);
  ctx.fill();

  const sparkX = bx + Math.sin(tick * 3.0) * 2.0;
  const sparkY = by - bombR - 5.5;
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.arc(sparkX, sparkY, 4.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(sparkX, sparkY, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a tile-centered or kicked traveling bomb on the arena floor.
 * When kicked (`bomb.isTraveling === true`), displays kinetic afterimage rings
 * and discrete dust motes trailing behind the sliding bomb.
 */
export function drawPlantedBomb(ctx, bomb) {
  if (!ctx || !bomb) return;
  ctx.save();
  ctx.translate(bomb.x, bomb.y);

  const maxFuse = Math.max(1, bomb.maxFuse || 110);
  const fuseLeft = Math.max(0, bomb.fuseTimer ?? maxFuse);
  const lifeProgress = 1 - fuseLeft / maxFuse;
  const isDanger = fuseLeft <= 35;

  const freq = isDanger ? 0.45 : 0.22;
  const swell = 1 + Math.sin((maxFuse - fuseLeft) * freq) * (isDanger ? 0.14 : 0.09);
  const baseR = bomb.r || 22;
  const r = baseR * swell;

  if (bomb.kickHitPauseTimer > 0) {
    // Kick impact freeze shimmer ring during hit pause
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.92)';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (bomb.isTraveling) {
    // Kicked Traveling Bomb Trail (concentric afterimage circles & discrete dust dots)
    const speed = Math.hypot(bomb.vx || 0, bomb.vy || 0);
    const dirX = speed > 0.01 ? -bomb.vx / speed : -1;
    const dirY = speed > 0.01 ? -bomb.vy / speed : 0;

    for (let t = 1; t <= 3; t++) {
      const dist = t * 11;
      const tx = dirX * dist;
      const ty = dirY * dist;
      const trailR = r * (1 - t * 0.18);
      const alpha = (0.36 - t * 0.09).toFixed(3);
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tx, ty, trailR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Kinetic slipstream ring around traveling bomb
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.75)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 1. Ground contact shadow ellipse
  ctx.fillStyle = 'rgba(14, 15, 20, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, baseR * 0.72, r * 0.85, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Outer warning pulse ring when nearing detonation
  if (isDanger && Math.floor(fuseLeft / 3) % 2 === 0) {
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4. Authentic 16-Bit Pixel Art Bomb Sprite (ADHWK1.gif -> bomb-1.png .. bomb-3.png)
  const bombFrames = _getBombermanBombFrames();
  const animCadence = isDanger ? 4 : 8;
  const cycleIndex = Math.floor((maxFuse - fuseLeft) / animCadence) % 4;
  const frameIdx = cycleIndex === 3 ? 1 : cycleIndex; // [0, 1, 2, 1] rhythmic pulsing
  const bombImg = bombFrames[frameIdx];

  let renderedSprite = false;
  if (bombImg && bombImg.complete && bombImg.naturalWidth > 0) {
    const drawSize = r * 2.8;
    ctx.imageSmoothingEnabled = false;
    // Offset slightly (-drawSize * 0.58) so the circular bomb core sits right at (0, 0) and the fuse/spark sits above
    ctx.drawImage(bombImg, -drawSize / 2, -drawSize * 0.58, drawSize, drawSize);

    // Flashing crimson-danger outline when nearing detonation
    if (isDanger && Math.floor(fuseLeft / 3) % 2 === 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    renderedSprite = true;
  }

  // Fallback to crisp procedural bomb body if sprite is still loading or in headless tests
  if (!renderedSprite) {
    // 5. Manga ink outline (#0E0F14)
    ctx.fillStyle = '#0E0F14';
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
    ctx.fill();

    // 6. Spherical cast-iron bomb body (flashes crimson-orange in danger window)
    const flashRed = isDanger && Math.floor(fuseLeft / 4) % 2 === 0;
    ctx.fillStyle = flashRed ? '#B91C1C' : '#0F172A';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner volume sphere
    ctx.fillStyle = flashRed ? '#EF4444' : '#1E293B';
    ctx.beginPath();
    ctx.arc(-r * 0.08, -r * 0.08, r * 0.86, 0, Math.PI * 2);
    ctx.fill();

    // Mid-tone steel reflection band
    ctx.fillStyle = flashRed ? '#F97316' : '#334155';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.2, r * 0.56, 0, Math.PI * 2);
    ctx.fill();

    // Crisp glossy specular highlight
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(-r * 0.36, -r * 0.36, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Secondary micro specular dot
    ctx.beginPath();
    ctx.arc(-r * 0.14, -r * 0.52, r * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // 7. Top nozzle collar & burning fuse cord
    const capY = -r * 0.92;
    ctx.fillStyle = '#0E0F14';
    ctx.beginPath();
    ctx.arc(0, capY, 5.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(0, capY, 3.6, 0, Math.PI * 2);
    ctx.fill();

    const cordLen = Math.max(3, (1 - lifeProgress * 0.75) * 10);
    const sparkX = Math.sin(fuseLeft * 0.6) * 2.5;
    const sparkY = capY - cordLen;

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, capY - 1);
    ctx.quadraticCurveTo(3, capY - cordLen * 0.5, sparkX, sparkY);
    ctx.stroke();

    // 8. Sizzling fuse spark (concentric glow circles, zero shadowBlur per Rule 11)
    ctx.fillStyle = 'rgba(249, 115, 22, 0.38)';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 2.3, 0, Math.PI * 2);
    ctx.fill();

    // Discrete square ember dots around spark (Rule 26: standalone dots, zero radial lines)
    for (let i = 0; i < 3; i++) {
      const angle = fuseLeft * 0.35 + i * 2.1;
      const dist = 5 + (i % 2) * 3;
      const ex = sparkX + Math.cos(angle) * dist;
      const ey = sparkY + Math.sin(angle) * dist;
      ctx.fillStyle = i % 2 === 0 ? '#FDE047' : '#FB923C';
      ctx.fillRect(ex - 1.2, ey - 1.2, 2.4, 2.4);
    }
  }

  ctx.restore();
}

/**
 * Helper to draw a single rounded orthogonal flame pillar from (0,0) to (endX, endY).
 * Rule 31: Uses smooth rounded semicircular end caps (ctx.arc) and radial gradients
 * so no rectangular box cutoffs ever appear.
 */
function _drawRoundedFlameArm(ctx, endX, endY, halfThick, alpha) {
  const len = Math.hypot(endX, endY);
  if (len <= 1) return;

  ctx.save();
  const angle = Math.atan2(endY, endX);
  ctx.rotate(angle);

  const layers = [
    { scale: 1.15, color: `rgba(220, 38, 38, ${(0.36 * alpha).toFixed(3)})` },
    { scale: 0.92, color: `rgba(249, 115, 22, ${(0.78 * alpha).toFixed(3)})` },
    { scale: 0.64, color: `rgba(250, 204, 21, ${(0.92 * alpha).toFixed(3)})` },
    { scale: 0.34, color: `rgba(255, 255, 255, ${(0.96 * alpha).toFixed(3)})` },
  ];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const r = halfThick * layer.scale;
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.lineTo(len, -r);
    ctx.arc(len, 0, r, -Math.PI * 0.5, Math.PI * 0.5, false);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders Bomber Man's classic 4-way orthogonal '+' cross explosion and
 * Rule 26 staggered concentric water-ripple shockwave rings.
 */
export function drawBombExplosion(ctx, exp) {
  if (!ctx || !exp) return;
  const maxTimer = Math.max(1, exp.maxTimer || 28);
  const progress = Math.min(1, Math.max(0, 1 - exp.timer / maxTimer));
  const fadeAlpha = Math.pow(1 - progress, 1.15);
  if (fadeAlpha <= 0.01) return;

  ctx.save();
  ctx.translate(exp.x, exp.y);

  const halfThick = (exp.thickness || 36) * 0.5 * (1 - progress * 0.25);

  // 1. Soft 360-degree radial epicenter bloom (Rule 31 feathered boundary)
  const centerBloomR = Math.max(48, halfThick * 2.4);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, centerBloomR);
  grad.addColorStop(0, `rgba(255, 255, 255, ${(0.85 * fadeAlpha).toFixed(3)})`);
  grad.addColorStop(0.45, `rgba(251, 146, 60, ${(0.55 * fadeAlpha).toFixed(3)})`);
  grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, centerBloomR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Orthogonal 4-Way Cross Explosion (Animated 12-Frame Sprite + Wall-Clamped Clipping)
  const reachRight = exp.reachRight ?? exp.blastRadius ?? 65;
  const reachLeft = exp.reachLeft ?? exp.blastRadius ?? 65;
  const reachDown = exp.reachDown ?? exp.blastRadius ?? 65;
  const reachUp = exp.reachUp ?? exp.blastRadius ?? 65;

  const expFrames = _getBombermanExplosionFrames();
  const frameIdx = Math.min(11, Math.floor(progress * 12));
  const expImg = expFrames[frameIdx];
  const hasSprite = expImg && expImg.complete && (expImg.naturalWidth > 0 || expImg.width > 0);

  if (hasSprite) {
    ctx.save();
    // Clip explosion arms strictly to wall collision boundaries
    ctx.beginPath();
    ctx.rect(-reachLeft - 8, -reachUp - 8, reachLeft + reachRight + 16, reachUp + reachDown + 16);
    ctx.clip();

    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = fadeAlpha;
    const maxReach = Math.max(reachRight, reachLeft, reachDown, reachUp, exp.blastRadius || 65);
    // 216px active explosion inside 256px canvas (108px reach per arm from center)
    const drawSize = (maxReach / 108) * 256;
    ctx.drawImage(expImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    ctx.restore();
  } else {
    // Procedural Fallback (Headless testing & pre-load)
    const growFactor = progress < 0.16 ? progress / 0.16 : 1.0;
    _drawRoundedFlameArm(ctx, reachRight * growFactor, 0, halfThick, fadeAlpha);
    _drawRoundedFlameArm(ctx, -reachLeft * growFactor, 0, halfThick, fadeAlpha);
    _drawRoundedFlameArm(ctx, 0, reachDown * growFactor, halfThick, fadeAlpha);
    _drawRoundedFlameArm(ctx, 0, -reachUp * growFactor, halfThick, fadeAlpha);
  }

  // 3. Rule 26: Staggered Concentric Water-Ripple Shockwave Rings (t0=0.00, t1=0.12, t2=0.24)
  const offsets = [0.0, 0.12, 0.24];
  const maxRingR = Math.min(130, (exp.blastRadius || 65) * 0.85);
  for (let k = 0; k < offsets.length; k++) {
    const t0 = offsets[k];
    if (progress <= t0) continue;
    const lp = Math.min(1, (progress - t0) / (1 - t0));
    const ringR = maxRingR * Math.pow(lp, 0.62);
    const popIn = lp < 0.1 ? lp / 0.1 : 1.0;
    const ringFade = Math.pow(1 - lp, 1.25) * popIn;
    if (ringFade <= 0.02 || ringR <= 1) continue;

    if (k === 0) {
      ctx.fillStyle = `rgba(255, 107, 26, ${(0.16 * ringFade).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = `rgba(249, 115, 22, ${(0.82 * ringFade).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, 4.0 * (1 - lp * 0.65));
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();

    if (ringR > 4) {
      ctx.strokeStyle = `rgba(254, 240, 138, ${(0.75 * ringFade).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.0, 2.0 * (1 - lp * 0.65));
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, ringR - 2.2), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 4. Discrete standalone square ember particles (Rule 26 compliant: no connecting lines)
  const emberCount = 8;
  for (let i = 0; i < emberCount; i++) {
    const seedAngle = i * ((Math.PI * 2) / emberCount) + 0.35;
    const dist = (18 + (i % 3) * 16) * Math.pow(progress, 0.7);
    const ex = Math.cos(seedAngle) * dist;
    const ey = Math.sin(seedAngle) * dist;
    const sz = Math.max(1.5, 3.6 * (1 - progress));
    ctx.fillStyle =
      i % 2 === 0
        ? `rgba(254, 240, 138, ${fadeAlpha.toFixed(3)})`
        : `rgba(251, 146, 60, ${fadeAlpha.toFixed(3)})`;
    ctx.fillRect(ex - sz * 0.5, ey - sz * 0.5, sz, sz);
  }

  ctx.restore();
}

/**
 * Draws classic retro Bomberman arcade power-up icon tile popups above Bomber Man
 * when activating Bomb Up, Fire Up, Kick, or Invincible.
 */
export function drawBombermanPowerupPopup(ctx, vfx) {
  if (!ctx || !vfx) return;
  const maxTimer = Math.max(1, vfx.maxTimer || 36);
  const progress = Math.min(1, Math.max(0, 1 - vfx.timer / maxTimer));
  const alpha = progress < 0.7 ? 1.0 : (1 - progress) / 0.3;
  if (alpha <= 0.02) return;

  ctx.save();
  const floatY = vfx.y - progress * 22;
  ctx.translate(vfx.x, floatY);
  ctx.globalAlpha = alpha;

  const boxSize = 22;
  const half = boxSize * 0.5;

  // Classic retro arcade power-up tile panel
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-half - 2, -half - 2, boxSize + 4, boxSize + 4);

  ctx.fillStyle = vfx.bgColor || '#FACC15';
  ctx.fillRect(-half, -half, boxSize, boxSize);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-half + 1.5, -half + 1.5, boxSize - 3, boxSize - 3);

  // Inner icon symbol
  if (vfx.type === 'bombUp') {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, 1.5, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(2, -5.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (vfx.type === 'fireUp') {
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(0, 1, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, 2, 3.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (vfx.type === 'bombKick') {
    // Classic Bomberman Pink Kick Boot icon
    ctx.fillStyle = '#EC4899';
    ctx.fillRect(-5, -5, 6, 8);
    ctx.fillRect(-5, 0, 11, 5);
  } else if (vfx.type === 'invincible') {
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── 12-Frame Kick Impact Animation Pipeline (The Reze Model) ──
const BOMBERMAN_KICK_FRAME_COUNT = 12;
const BOMBERMAN_KICK_FRAME_PATHS = Array.from(
  { length: 12 },
  (_, i) => `Assets/model/bomberman/kick/kick-${i + 1}.png`
);

let _bombermanKickFrames = [];
let _bombermanKickFramesLoading = false;

export function _getBombermanKickFrames() {
  if (
    _bombermanKickFrames.length === BOMBERMAN_KICK_FRAME_COUNT &&
    _bombermanKickFrames.every((img) => img && img.complete && img.naturalWidth > 0)
  ) {
    return _bombermanKickFrames;
  }
  if (!_bombermanKickFramesLoading && typeof Image !== 'undefined') {
    _bombermanKickFramesLoading = true;
    _bombermanKickFrames = [];
    BOMBERMAN_KICK_FRAME_PATHS.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        _bombermanKickFrames[idx] = img;
      };
      img.onerror = (e) => {
        console.warn(`Failed to load Bomberman kick frame ${idx + 1} at ${src}:`, e);
      };
      img.src = `${src}?v=1`;
      _bombermanKickFrames[idx] = img;
    });
  }
  return _bombermanKickFrames;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getBombermanKickFrames();
}

/**
 * Draws the 12-frame retro pixel art kick impact star flash.
 * Renders the 4-pointed golden-amber diagonal cross star flash at (x, y).
 */
export function drawBombermanKickEffectSprite(ctx, x, y, maxR = 48, p = 0, alpha = 1.0, angle = 0) {
  if (!ctx) return;
  const frames = _getBombermanKickFrames();
  const frameIndex = Math.min(11, Math.max(0, Math.floor(p * 12)));
  const frameImg = frames[frameIndex];

  ctx.save();
  ctx.translate(x, y);
  if (angle) {
    ctx.rotate(angle);
  }

  const fadeAlpha = p > 0.8 ? Math.max(0, (1.0 - p) / 0.2) : 1.0;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * fadeAlpha));

  if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    const scale = (maxR * 2.0) / 256.0;
    const drawW = 256 * scale;
    const drawH = 256 * scale;
    ctx.drawImage(frameImg, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    // Procedural fallback matching the 4-pointed diagonal cross star
    const starR = maxR * (1 - p * 0.35);
    ctx.fillStyle = '#FAC23A';
    for (let i = 0; i < 4; i++) {
      const rot = Math.PI / 4 + i * (Math.PI / 2);
      ctx.save();
      ctx.rotate(rot);
      ctx.fillRect(-starR * 0.15, -starR * 0.15, starR * 0.3, starR);
      ctx.restore();
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-starR * 0.25, -starR * 0.25, starR * 0.5, starR * 0.5);
  }

  ctx.restore();
}
