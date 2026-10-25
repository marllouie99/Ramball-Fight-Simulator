import { state } from '../../core/state.js';
import { drawSukunaFugaExplosionSprite } from '../weapons/sukunaWeaponGraphics.js';

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

function drawPixelDisc(ctx, cx, cy, r, P) {
  const snapR = Math.round(r / P) * P;
  if (snapR <= 0) return;
  ctx.beginPath();
  ctx.arc(cx, cy, snapR, 0, Math.PI * 2);
  ctx.fill();
}

function drawPixelRing(ctx, cx, cy, r, thick, P) {
  const snapR = Math.round(r / P) * P;
  if (snapR <= 0) return;
  const snapThick = Math.max(P, Math.round(thick / P) * P);
  ctx.save();
  ctx.lineWidth = snapThick;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.arc(cx, cy, snapR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawThermobaricExplosions(ctx) {
  if (!state.thermobaricExplosions || state.thermobaricExplosions.length === 0) return;

  // 30 FPS stepped timestamp for anime Sakuga keyframe animation
  const step30Frame = Math.floor(Date.now() / (1000 / 30));
  const nowTime = step30Frame * (1000 / 30);

  // Discrete pixel art grid constants (Getsuga Tensho / Genos standard)
  const P = 3.0;
  const snap = (v) => Math.round(v / P) * P;

  for (let i = state.thermobaricExplosions.length - 1; i >= 0; i--) {
    const exp = state.thermobaricExplosions[i];
    exp.life--;

    // Quantize progress to 30 FPS stepped keyframes (changes every 2 frames at 60Hz)
    const elapsed60 = exp.maxLife - exp.life;
    const elapsed30 = Math.floor(elapsed60 / 2) * 2;
    const craterProgress = Math.min(1.0, elapsed30 / exp.maxLife);
    const craterAlpha = Math.max(0, 1 - craterProgress);

    const explosionFrames = 50;
    const explosionElapsed60 = Math.min(explosionFrames, elapsed60);
    const explosionProgress = Math.min(1.0, Math.max(0.02, explosionElapsed60 / explosionFrames));
    const expAlpha = Math.max(0, 1 - explosionProgress);
    const blastExpansion = 1 - Math.pow(1 - explosionProgress, 2.2);
    const radius = exp.radius + (exp.maxRadius - exp.radius) * blastExpansion;

    const R = exp.maxRadius;
    const cx = exp.x;
    const cy = exp.y;
    const rimPts = exp.rimPoints || [];

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Helper: draw stepped pixel wobbly polygon
    const drawPixelWobblyContour = (scaleX, scaleY, rimScale) => {
      if (rimPts.length === 0) {
        const steps = 32;
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const px = snap(Math.cos(a) * scaleX);
          const py = snap(Math.sin(a) * scaleY);
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        return;
      }
      ctx.beginPath();
      for (let r = 0; r <= rimPts.length; r++) {
        const idx = r % rimPts.length;
        const pt = rimPts[idx];
        const w = pt.wobble * rimScale;
        const px = snap(Math.cos(pt.angle) * scaleX * w);
        const py = snap(Math.sin(pt.angle) * scaleY * w);
        if (r === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // ── CRATER PIXEL LAYERS (Scorched Earth & Molten Magma Reservoir) ──
    ctx.save();
    ctx.translate(cx, cy);

    // 1. Scorched Obsidian Perimeter
    ctx.save();
    ctx.globalAlpha = craterAlpha * 0.75;
    ctx.fillStyle = '#140a04';
    drawPixelWobblyContour(R * 0.9, R * 0.65, 1.05);
    ctx.fill();
    ctx.restore();

    // 2. Deep Pit Inner Crater
    ctx.save();
    ctx.globalAlpha = craterAlpha * 0.9;
    ctx.fillStyle = '#0a0603';
    drawPixelWobblyContour(R * 0.78, R * 0.56, 1.0);
    ctx.fill();
    ctx.restore();

    // 3. Stepped Caldera Rings
    ctx.save();
    ctx.globalAlpha = craterAlpha * 0.5;
    for (let ring = 0; ring < 3; ring++) {
      const ringR = snap(R * (0.35 + ring * 0.12));
      const ringAlpha = (1 - ring * 0.3) * craterAlpha;
      ctx.fillStyle = `rgba(90, 20, 0, ${ringAlpha * 0.6})`;
      drawPixelRing(ctx, 0, 0, ringR, P, P);
    }
    ctx.restore();

    // 4. Pulsing Molten Magma Core (Stepped Pixel Tiers)
    ctx.save();
    const magmaPulse = 0.85 + Math.sin(nowTime * 0.003 + (exp.seed || 0) * 10) * 0.15;
    ctx.globalAlpha = craterAlpha * magmaPulse;
    ctx.fillStyle = `rgba(200, 40, 0, ${0.5 * craterAlpha})`;
    drawPixelWobblyContour(R * 0.45 * magmaPulse, R * 0.32 * magmaPulse, 0.95);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 120, 20, ${0.75 * craterAlpha * magmaPulse})`;
    drawPixelWobblyContour(R * 0.35 * magmaPulse, R * 0.24 * magmaPulse, 0.9);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 230, 80, ${0.9 * craterAlpha * magmaPulse})`;
    drawPixelWobblyContour(R * 0.22 * magmaPulse, R * 0.15 * magmaPulse, 0.85);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // ── STEPPED PIXEL CRACK VEINS (Getsuga Tensho Technique) ──
    if (exp.cracks && exp.cracks.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      exp.cracks.forEach(crack => {
        const pts = crack.points;
        if (!pts || pts.length < 2) return;
        const crackThick = Math.max(P, snap(crack.width * 0.9));

        for (let pIdx = 1; pIdx < pts.length; pIdx++) {
          const prev = pts[pIdx - 1];
          const curr = pts[pIdx];
          const dx = curr.x - prev.x;
          const dy = curr.y - prev.y;
          const dist = Math.hypot(dx, dy);
          const steps = Math.max(1, Math.ceil(dist / P));

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const gx = snap(prev.x + dx * t);
            const gy = snap(prev.y + dy * t);

            // Dark obsidian crust border
            ctx.fillStyle = `rgba(20, 5, 0, ${0.9 * craterAlpha})`;
            ctx.fillRect(gx - crackThick, gy - crackThick, crackThick * 2 + P, crackThick * 2 + P);

            // Molten magma core
            ctx.fillStyle = `rgba(255, 160, 20, ${craterAlpha})`;
            ctx.fillRect(gx - crackThick / 2, gy - crackThick / 2, crackThick, crackThick);

            // White-hot core flash
            if (craterAlpha > 0.6 && s % 2 === 0) {
              ctx.fillStyle = `rgba(255, 255, 220, ${craterAlpha})`;
              ctx.fillRect(gx, gy, P, P);
            }
          }
        }
      });
      ctx.restore();
    }

    // ── 12-FRAME PIXEL-ART FUGA EXPLOSION & RULE 26 STAGGERED SHOCKWAVES ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.imageSmoothingEnabled = false;

    if (explosionProgress < 1.0) {
      // 1. Rule 26 Sequential Water-Ripple Concentric Shockwave Rings (Zero radial spokes!)
      const waveConfigs = [
        { delay: 0.00, dur: 0.72, speedPow: 0.42, maxScale: 1.00, thick: 12, col: '200, 20, 0', washCol: '255, 80, 10', washA: 0.16 },
        { delay: 0.12, dur: 0.72, speedPow: 0.46, maxScale: 0.88, thick: 8,  col: '255, 140, 0', washCol: '255, 150, 30', washA: 0.12 },
        { delay: 0.24, dur: 0.70, speedPow: 0.50, maxScale: 0.74, thick: 5,  col: '255, 250, 220', washCol: '255, 230, 140', washA: 0.10 }
      ];

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < waveConfigs.length; k++) {
        const wc = waveConfigs[k];
        const rawLp = (explosionProgress - wc.delay) / wc.dur;
        if (rawLp <= 0 || rawLp >= 1) continue;
        const popIn = Math.min(1.0, rawLp / 0.08);
        const fadeOut = Math.pow(1.0 - rawLp, 1.25);
        const waveAlpha = popIn * fadeOut;
        const waveR = R * wc.maxScale * Math.pow(rawLp, wc.speedPow);

        // Expanding translucent interior wash
        ctx.fillStyle = `rgba(${wc.washCol}, ${(wc.washA * waveAlpha).toFixed(3)})`;
        drawPixelDisc(ctx, 0, 0, waveR, P);

        // Crisp concentric compression band
        ctx.fillStyle = `rgba(${wc.col}, ${(0.92 * waveAlpha).toFixed(3)})`;
        drawPixelRing(ctx, 0, 0, waveR, Math.max(P, snap(wc.thick * (1 - rawLp * 0.65))), P);
      }
      ctx.restore();

      // 2. Render 12-Frame Pixel-Art Fuga Explosion Sprite (with procedural fallback if not yet loaded)
      const drewSprite = drawSukunaFugaExplosionSprite(ctx, exp, explosionProgress);

      if (!drewSprite) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Procedural fallback when running in headless Node environment
        const pH = snap(R * 3.0 * Math.sin(Math.min(1.0, explosionProgress * 1.35) * Math.PI));
        const pW = snap(R * 0.7 * (1 - explosionProgress * 0.4));
        const pillarStep = P * 2;
        if (pH > pillarStep) {
          for (let gy = 0; gy >= -pH; gy -= pillarStep) {
            const t = -gy / pH;
            const profile = Math.sin(t * Math.PI) * (1.1 - t * 0.35) + 0.15 * Math.pow(1 - t, 2);
            const w = snap(pW * profile);
            if (w <= 0) continue;
            const flicker = Math.sin(nowTime * 0.03 + gy * 0.2) * P;
            const effW = Math.max(P, w + flicker);
            ctx.fillStyle = `rgba(220, 30, 0, ${0.9 * expAlpha})`;
            ctx.fillRect(snap(-effW / 2), gy, snap(effW), pillarStep);
          }
        }
        if (explosionProgress < 0.5) {
          const coreA = (0.5 - explosionProgress) / 0.5;
          const coreR = snap(radius * (0.75 - explosionProgress * 0.4));
          if (coreR > P) {
            ctx.fillStyle = `rgba(255, 140, 0, ${0.85 * coreA})`;
            drawPixelDisc(ctx, 0, 0, coreR * 0.7, P);
          }
        }
        ctx.restore();
      }
    }

    ctx.restore();

    // ── DEBRIS, EMBERS & SMOKE (Stepped at 30 FPS Sakuga timing) ──
    if (exp.debris && exp.debris.length > 0) {
      if (elapsed60 % 2 === 0) {
        exp.debris.forEach((d, idx) => {
          d.x += d.vx * 2;
          d.y += d.vy * 2;
          if (d.type === 'ember') {
            d.vy -= 0.30;
            d.vx *= 0.98;
            d.x += Math.sin(nowTime * 0.004 + idx * 1.7) * 1.6;
          } else if (d.type === 'smoke') {
            d.vy -= 0.16;
            d.vx *= 0.94;
            d.vy *= 0.94;
            d.size += 0.30;
          } else {
            d.vy += 0.70;
          }
          d.rot += d.rotSpeed * 2;
        });
      }
      exp.debris.forEach((d) => {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        ctx.imageSmoothingEnabled = false;

        if (d.type === 'ember') {
          ctx.globalAlpha = craterAlpha * 0.95;
          const s = Math.max(P, snap(d.size));
          // Stepped pixel ember with white core and fiery gold halo
          ctx.fillStyle = '#FF3300';
          ctx.fillRect(-s, -s, s * 2, s * 2);
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(-s / 2, -s / 2, s, s);
          if (s >= P * 1.5) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(-P / 2, -P / 2, P, P);
          }
        } else if (d.type === 'smoke') {
          ctx.globalAlpha = craterAlpha * 0.4;
          const s = Math.max(P, snap(d.size));
          ctx.fillStyle = `rgba(25, 18, 14, ${craterAlpha * 0.6})`;
          ctx.fillRect(-s, -s, s * 2, s * 2);
          ctx.fillStyle = `rgba(45, 30, 22, ${craterAlpha * 0.4})`;
          ctx.fillRect(-s / 2, -s / 2, s, s);
        } else {
          ctx.globalAlpha = craterAlpha * 0.85;
          const s = Math.max(P, snap(d.size));
          ctx.fillStyle = '#1A0800';
          ctx.fillRect(-s / 2 - P / 2, -s / 2 - P / 2, s + P, s + P);
          ctx.fillStyle = d.color || '#8B2500';
          ctx.fillRect(-s / 2, -s / 2, s, s);
        }
        ctx.restore();
      });
    }

    // ── STEPPED PIXEL HEAT SHIMMER WISPS ──
    if (craterAlpha > 0.1) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.imageSmoothingEnabled = false;
      for (let w = 0; w < 6; w++) {
        const wx = snap(Math.sin(nowTime * 0.002 + w * 2.1 + (exp.seed || 0) * 8) * R * 0.4);
        const wPhase = ((nowTime * 0.001 + w * 1.3) % 3) / 3;
        const wy = snap(-wPhase * R * 2.5);
        const wAlpha = Math.sin(wPhase * Math.PI) * craterAlpha * 0.6;
        const wSize = Math.max(P, snap((2 + wPhase * 3) * P));
        ctx.fillStyle = (w % 2 === 0) ? `rgba(255, 180, 30, ${wAlpha})` : `rgba(255, 80, 0, ${wAlpha})`;
        ctx.fillRect(wx - wSize / 2, wy - wSize / 2, wSize, wSize);
        ctx.fillStyle = `rgba(255, 255, 220, ${wAlpha * 0.9})`;
        ctx.fillRect(wx - P / 2, wy - P / 2, P, P);
      }
      ctx.restore();
    }

    ctx.restore();

    if (exp.life <= 0) {
      state.thermobaricExplosions.splice(i, 1);
    }
  }
}


