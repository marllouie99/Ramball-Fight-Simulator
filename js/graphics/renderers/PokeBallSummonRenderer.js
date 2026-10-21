// ============================================================================
// POKE BALL SUMMON & "FIGHT!" BANNER RENDERER
// Anime-Style Materialization from Energy Beam + High-Impact Arcade FIGHT! Slam
// Fully Rule 11 (No shadowBlur), Rule 26 (No cobweb meshes), & Rule 20 compliant
// ============================================================================
import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

// Pre-seeded pseudo-random offsets for Poke Ball diamond star sparkles
const _SPARK_OFFSETS = [
  { angle: 0.20, dist: 1.0, size: 7.0, speedY: 1.2, color: '#FFFFFF' },
  { angle: 0.65, dist: 0.8, size: 5.5, speedY: 0.9, color: '#FF2D55' },
  { angle: 1.15, dist: 1.2, size: 6.5, speedY: 1.4, color: '#FFE600' },
  { angle: 1.70, dist: 0.9, size: 5.0, speedY: 1.1, color: '#FFFFFF' },
  { angle: 2.25, dist: 1.1, size: 6.0, speedY: 1.3, color: '#FF2D55' },
  { angle: 2.80, dist: 0.7, size: 4.5, speedY: 0.8, color: '#FFE600' },
  { angle: 3.35, dist: 1.2, size: 7.5, speedY: 1.5, color: '#FFFFFF' },
  { angle: 3.90, dist: 0.9, size: 5.5, speedY: 1.0, color: '#FF2D55' },
  { angle: 4.45, dist: 1.1, size: 6.0, speedY: 1.2, color: '#FFE600' },
  { angle: 5.00, dist: 0.8, size: 5.0, speedY: 0.9, color: '#FFFFFF' },
  { angle: 5.55, dist: 1.3, size: 7.0, speedY: 1.4, color: '#FF2D55' },
  { angle: 6.10, dist: 1.0, size: 6.5, speedY: 1.1, color: '#FFE600' }
];

function easeOutBack(t) {
  const c1 = 1.35;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Draws a 4-point diamond star spark (Poke Ball energy glitter).
 */
function draw4PointStar(ctx, cx, cy, radius, color, alpha) {
  if (alpha <= 0.01 || radius <= 0.5) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;

  const innerR = radius * 0.28;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(innerR, -innerR);
  ctx.lineTo(radius, 0);
  ctx.lineTo(innerR, innerR);
  ctx.lineTo(0, radius);
  ctx.lineTo(-innerR, innerR);
  ctx.lineTo(-radius, 0);
  ctx.lineTo(-innerR, -innerR);
  ctx.closePath();
  ctx.fill();

  // White specular center core
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a chamfered polygon path (45-degree angled corner notches).
 */
function drawChamferedPath(ctx, x, y, w, h, ch) {
  ch = Math.min(ch, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + ch, y);
  ctx.lineTo(x + w - ch, y);
  ctx.lineTo(x + w, y + ch);
  ctx.lineTo(x + w, y + h - ch);
  ctx.lineTo(x + w - ch, y + h);
  ctx.lineTo(x + ch, y + h);
  ctx.lineTo(x, y + h - ch);
  ctx.lineTo(x, y + ch);
  ctx.closePath();
}

/**
 * Draws the UNDER-layer elements of the Poke Ball summon:
 * Floor energy disc, descending laser beam, and expanding concentric shockwave rings.
 */
export function drawPokeBallSummonUnder(ctx, fighter, progress) {
  if (!fighter || progress < 0 || progress >= 1.0) return;

  const fx = fighter.x;
  const fy = fighter.y - (fighter.z || 0);
  const fr = fighter.r || 25;

  ctx.save();

  // 1. Descending Poke Ball Energy Laser Beam (Frames 0 - 15, progress 0.0 - 0.35)
  if (progress < 0.35) {
    const beamP = progress / 0.35;
    const beamAlpha = (1.0 - beamP * 0.85);
    const beamW = Math.max(3, fr * (1.2 - beamP * 0.8));

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, beamAlpha));

    // Outer crimson sheath
    ctx.strokeStyle = '#FF2D55';
    ctx.lineWidth = beamW * 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fx, fy - 600);
    ctx.lineTo(fx, fy + fr * 0.5);
    ctx.stroke();

    // Pure white supersonic core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = beamW * 0.6;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 600);
    ctx.lineTo(fx, fy + fr * 0.5);
    ctx.stroke();

    ctx.restore();
  }

  // 2. Floor Energy Ring / Disc at the base of the fighter
  const floorY = fy + fr * 0.75;
  const maxRx = fr * 1.8;
  const maxRy = fr * 0.75;
  const discScale = Math.min(1.0, progress * 4.0);
  const rx = maxRx * discScale;
  const ry = maxRy * discScale;
  const floorAlpha = Math.max(0, (1.0 - progress) * 1.1);

  if (rx > 1 && floorAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, floorAlpha);

    // Floor Ellipse Radial Fill
    const floorGrad = ctx.createRadialGradient(fx, floorY, 2, fx, floorY, rx);
    floorGrad.addColorStop(0.0, '#FFFFFF');
    floorGrad.addColorStop(0.35, '#FF2D55');
    floorGrad.addColorStop(0.75, 'rgba(255, 45, 85, 0.45)');
    floorGrad.addColorStop(1.0, 'rgba(255, 45, 85, 0)');

    ctx.beginPath();
    ctx.ellipse(fx, floorY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = floorGrad;
    ctx.fill();

    // Sharp outer rim stroke
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // 3. Clean Concentric Supersonic Ground Shockwave Compression Ring (Rule 26 Compliant)
  if (progress >= 0.10 && progress <= 0.85) {
    const waveP = (progress - 0.10) / 0.75;
    const waveR = fr * (0.6 + waveP * 2.8);
    const waveRy = waveR * 0.48;
    const waveAlpha = Math.pow(1.0 - waveP, 1.35) * 0.90;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, waveAlpha));

    // Supersonic white leading core
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.0, 3.0 * (1.0 - waveP));
    ctx.beginPath();
    ctx.ellipse(fx, floorY, waveR, waveRy, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Crimson ionization rim
    ctx.strokeStyle = '#FF2D55';
    ctx.lineWidth = Math.max(1.0, 1.5 * (1.0 - waveP));
    ctx.beginPath();
    ctx.ellipse(fx, floorY, waveR + 2, waveRy + 1, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws the OVER-layer elements of the Poke Ball summon:
 * Glowing white energy silhouette burst and radiant 4-point diamond star sparkles.
 */
export function drawPokeBallSummonOver(ctx, fighter, progress) {
  if (!fighter || progress < 0 || progress >= 1.0) return;

  const fx = fighter.x;
  const fy = fighter.y - (fighter.z || 0);
  const fr = fighter.r || 25;

  ctx.save();

  // 1. Glowing Energy Silhouette Bloom (Frames 0 - 22, progress 0.0 - 0.50)
  if (progress < 0.50) {
    const bloomP = progress / 0.50;
    const bloomAlpha = Math.pow(1.0 - bloomP, 1.25) * 0.92;
    const bloomR = fr * (1.3 + bloomP * 0.4);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, bloomAlpha));

    const bloomGrad = ctx.createRadialGradient(fx, fy, 4, fx, fy, bloomR);
    bloomGrad.addColorStop(0.0, '#FFFFFF');
    bloomGrad.addColorStop(0.40, 'rgba(255, 255, 255, 0.95)');
    bloomGrad.addColorStop(0.70, '#FF2D55');
    bloomGrad.addColorStop(1.0, 'rgba(255, 45, 85, 0)');

    ctx.beginPath();
    ctx.arc(fx, fy, bloomR, 0, Math.PI * 2);
    ctx.fillStyle = bloomGrad;
    ctx.fill();

    // High-energy white flash disc
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 0.85 * (1.0 - bloomP), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 2. Poke Ball Starburst Energy Diamond Sparks
  if (progress >= 0.08 && progress < 0.90) {
    const sparkP = (progress - 0.08) / 0.82;
    const baseDist = fr * (0.8 + sparkP * 2.8);

    for (let i = 0; i < _SPARK_OFFSETS.length; i++) {
      const sp = _SPARK_OFFSETS[i];
      const d = baseDist * sp.dist;
      const sx = fx + Math.cos(sp.angle) * d;
      const sy = fy + Math.sin(sp.angle) * (d * 0.55) - (sparkP * 35 * sp.speedY);
      const sRadius = sp.size * (1.0 - sparkP * 0.7);
      const sAlpha = Math.sin(sparkP * Math.PI) * 0.95;

      draw4PointStar(ctx, sx, sy, sRadius, sp.color, sAlpha);
    }
  }

  ctx.restore();
}

/**
 * Draws the high-impact comic-manga "FIGHT!" banner during match start.
 * Features a dynamic slanted placard, 14px manga outline, fiery electric gradient,
 * and seamless zoom/dissolve exit into combat.
 */
export function drawFightBanner(ctx, width, height) {
  if (typeof state === 'undefined' || !state) return;
  const timer = state.fightBannerTimer || 0;
  if (timer <= 0) return;

  const maxFrames = state.fightBannerMax || 52;
  const elapsed = maxFrames - timer;

  // Scale and Alpha Kinematics
  let scale = 1.0;
  let alpha = 1.0;

  const holdEnd = Math.max(20, maxFrames - 12);
  if (elapsed < 6) {
    // Phase 1: Hypersonic Slam-In (Scale 2.4 -> 1.0 with easeOutBack)
    const t = elapsed / 6;
    scale = 2.4 - 1.4 * easeOutBack(t);
    alpha = Math.min(1.0, t * 1.8);
  } else if (elapsed <= holdEnd) {
    // Phase 2: High-Voltage Standoff Hold (Steady 1.0 with subtle micro-rumble)
    scale = 1.0 + Math.sin((elapsed - 6) * 0.18) * 0.015;
    alpha = 1.0;
  } else {
    // Phase 3: Combat Breakout Zoom & Dissolve (Scale 1.0 -> 1.4, Alpha 1.0 -> 0.0)
    const outT = (elapsed - holdEnd) / (maxFrames - holdEnd);
    scale = 1.0 + outT * 0.42;
    alpha = Math.max(0, 1.0 - outT * 1.5);
  }

  if (alpha <= 0.01 || scale <= 0.05) return;

  const isHorizontal = Boolean(state.viewOrientation === 'horizontal');
  const cx = width / 2;
  const cy = isHorizontal ? (height * 0.485) : 465;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Dynamic Manga Tilt (-6 degrees)
  ctx.rotate(-0.105);
  ctx.scale(scale, scale);

  const bannerW = 280;
  const bannerH = 76;
  const ch = 16;

  // 1. 3D Comic Hard Drop Shadow (Rule 11 compliant)
  ctx.save();
  ctx.translate(4, 5);
  drawChamferedPath(ctx, -bannerW / 2, -bannerH / 2, bannerW, bannerH, ch);
  ctx.fillStyle = '#050609';
  ctx.fill();
  ctx.restore();

  // 2. Banner Dark Slate Body
  drawChamferedPath(ctx, -bannerW / 2, -bannerH / 2, bannerW, bannerH, ch);
  ctx.fillStyle = '#080A12';
  ctx.fill();

  // 3. Heavy Outer Manga Ink Border
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // 4. Inner White Highlight Rim
  drawChamferedPath(ctx, -bannerW / 2 + 2.5, -bannerH / 2 + 2.5, bannerW - 5, bannerH - 5, ch - 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 5. Flanking Manga Speed Chevrons (« FIGHT! »)
  const chevX = bannerW / 2 - 22;
  // Left Chevrons
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(-chevX, -12);
  ctx.lineTo(-chevX + 10, 0);
  ctx.lineTo(-chevX, 12);
  ctx.lineTo(-chevX - 4, 12);
  ctx.lineTo(-chevX + 6, 0);
  ctx.lineTo(-chevX - 4, -12);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-chevX - 10, -12);
  ctx.lineTo(-chevX, 0);
  ctx.lineTo(-chevX - 10, 12);
  ctx.lineTo(-chevX - 14, 12);
  ctx.lineTo(-chevX - 4, 0);
  ctx.lineTo(-chevX - 14, -12);
  ctx.closePath();
  ctx.fill();

  // Right Chevrons
  ctx.beginPath();
  ctx.moveTo(chevX, -12);
  ctx.lineTo(chevX - 10, 0);
  ctx.lineTo(chevX, 12);
  ctx.lineTo(chevX + 4, 12);
  ctx.lineTo(chevX - 6, 0);
  ctx.lineTo(chevX + 4, -12);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(chevX + 10, -12);
  ctx.lineTo(chevX, 0);
  ctx.lineTo(chevX + 10, 12);
  ctx.lineTo(chevX + 14, 12);
  ctx.lineTo(chevX + 4, 0);
  ctx.lineTo(chevX + 14, -12);
  ctx.closePath();
  ctx.fill();

  // 6. High-Impact "FIGHT!" Typography
  ctx.font = '900 italic 56px "Outfit", "Rajdhani", "Impact", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // Heavy 14px Manga Ink Outline
  ctx.strokeStyle = '#050609';
  ctx.lineWidth = 14;
  ctx.strokeText('FIGHT!', 0, 0);

  // Fiery Electric Gradient Fill
  const fightGrad = ctx.createLinearGradient(0, -26, 0, 24);
  fightGrad.addColorStop(0.0, '#FFFFFF'); // white hot core
  fightGrad.addColorStop(0.24, '#FFE043'); // electric yellow
  fightGrad.addColorStop(0.65, '#FF5722'); // blazing manga orange
  fightGrad.addColorStop(1.0, '#B71C1C'); // deep crimson
  ctx.fillStyle = fightGrad;
  ctx.fillText('FIGHT!', 0, 0);

  // Top Specular Highlight Edge
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('FIGHT!', -1, -2);

  ctx.restore();
}
