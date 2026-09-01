import { state } from '../../core/state.js';

function _isDarkMode() {
  return Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' ||
      state.darkMode ||
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );
}

export function drawThermobaricExplosions(ctx) {
  if (!state.thermobaricExplosions || state.thermobaricExplosions.length === 0) return;

  // 30 FPS stepped timestamp for anime Sakuga keyframe animation
  const step30Frame = Math.floor(Date.now() / (1000 / 30));
  const nowTime = step30Frame * (1000 / 30);

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
    const explosionElapsed30 = Math.floor(explosionElapsed60 / 2) * 2;
    const explosionProgress = Math.min(1.0, explosionElapsed30 / explosionFrames);
    const expAlpha = Math.max(0, 1 - explosionProgress);
    const radius = exp.radius + (exp.maxRadius - exp.radius) * Math.sin(explosionProgress * Math.PI * 0.5);

    const R = exp.maxRadius;
    const cx = exp.x;
    const cy = exp.y;
    const rimPts = exp.rimPoints || [];

    ctx.save();

    // Helper: draw wobbly ellipse from pre-generated rim points
    const drawWobblyEllipse = (scaleX, scaleY, rimScale) => {
      if (rimPts.length === 0) { ctx.arc(0, 0, scaleX, 0, Math.PI * 2); return; }
      ctx.beginPath();
      for (let r = 0; r < rimPts.length; r++) {
        const pt = rimPts[r];
        const nextPt = rimPts[(r + 1) % rimPts.length];
        const w = pt.wobble * rimScale;
        const px = Math.cos(pt.angle) * scaleX * w;
        const py = Math.sin(pt.angle) * scaleY * w;
        const nw = nextPt.wobble * rimScale;
        const nx = Math.cos(nextPt.angle) * scaleX * nw;
        const ny = Math.sin(nextPt.angle) * scaleY * nw;
        if (r === 0) ctx.moveTo(px, py);
        const midX = (px + nx) / 2;
        const midY = (py + ny) / 2;
        ctx.quadraticCurveTo(px, py, midX, midY);
      }
      ctx.closePath();
    };

    // â”€â”€ CRATER LAYERS â”€â”€
    ctx.save();
    ctx.translate(cx, cy);

    ctx.save();
    ctx.globalAlpha = craterAlpha * 0.7;
    ctx.fillStyle = '#1a1008';
    drawWobblyEllipse(R * 0.9, R * 0.65, 1.05);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = craterAlpha * 0.85;
    ctx.fillStyle = '#0d0a06';
    drawWobblyEllipse(R * 0.78, R * 0.56, 1.0);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = craterAlpha * 0.9;
    const depGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.55);
    depGrad.addColorStop(0, `rgba(40, 10, 0, ${craterAlpha})`);
    depGrad.addColorStop(0.6, `rgba(20, 8, 2, ${craterAlpha * 0.9})`);
    depGrad.addColorStop(1, 'rgba(15, 5, 0, 0)');
    ctx.fillStyle = depGrad;
    drawWobblyEllipse(R * 0.65, R * 0.45, 0.95);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = craterAlpha * 0.5;
    for (let ring = 0; ring < 3; ring++) {
      const ringR = R * (0.35 + ring * 0.12);
      const ringAlpha = (1 - ring * 0.3) * craterAlpha;
      ctx.strokeStyle = `rgba(80, 20, 0, ${ringAlpha * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringR, ringR * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    const magmaPulse = 0.85 + Math.sin(nowTime * 0.003 + (exp.seed || 0) * 10) * 0.15;
    const magmaGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.4 * magmaPulse);
    magmaGrad.addColorStop(0, `rgba(255, 220, 80, ${0.85 * craterAlpha * magmaPulse})`);
    magmaGrad.addColorStop(0.3, `rgba(255, 120, 20, ${0.7 * craterAlpha * magmaPulse})`);
    magmaGrad.addColorStop(0.6, `rgba(200, 40, 0, ${0.45 * craterAlpha})`);
    magmaGrad.addColorStop(1, 'rgba(80, 10, 0, 0)');
    ctx.fillStyle = magmaGrad;
    ctx.beginPath();
    drawWobblyEllipse(R * 0.4 * magmaPulse, R * 0.28 * magmaPulse, 0.9);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = craterAlpha * 0.6;
    for (let v = 0; v < 6; v++) {
      const va = (v / 6) * Math.PI * 2 + (exp.seed || 0) * 5;
      const vLen = R * (0.25 + (exp.seed || 0.5) * 0.2);
      ctx.strokeStyle = `rgba(255, 80, 0, ${0.7 * craterAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const cp1x = Math.cos(va + 0.3) * vLen * 0.4;
      const cp1y = Math.sin(va + 0.3) * vLen * 0.4 * 0.7;
      const cp2x = Math.cos(va - 0.2) * vLen * 0.7;
      const cp2y = Math.sin(va - 0.2) * vLen * 0.7 * 0.7;
      const evx = Math.cos(va) * vLen;
      const evy = Math.sin(va) * vLen * 0.7;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, evx, evy);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = craterAlpha * 0.35;
    ctx.strokeStyle = `rgba(120, 40, 0, ${craterAlpha * 0.5})`;
    ctx.lineWidth = 2.5;
    drawWobblyEllipse(R * 0.78, R * 0.56, 1.0);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // ── CURVED BEZIER CRACK VEINS ──
    if (exp.cracks && exp.cracks.length > 0) {
      const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
      ctx.save();
      exp.cracks.forEach(crack => {
        const pts = crack.points;
        if (!pts || pts.length < 2) return;

        if (isLowQuality) {
          // Fast path: draw only 1 stroke instead of 3
          ctx.strokeStyle = `rgba(255, 100, 0, ${0.7 * craterAlpha})`;
          ctx.lineWidth = (crack.width + 1) * craterAlpha;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let p = 1; p < pts.length; p++) {
            const pt = pts[p];
            if (pt.cpx !== undefined) {
              ctx.quadraticCurveTo(pt.cpx, pt.cpy, pt.x, pt.y);
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
          ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(255, 80, 0, ${0.8 * craterAlpha})`;
          ctx.lineWidth = (crack.width + 3) * craterAlpha;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let p = 1; p < pts.length; p++) {
            const pt = pts[p];
            if (pt.cpx !== undefined) {
              ctx.quadraticCurveTo(pt.cpx, pt.cpy, pt.x, pt.y);
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
          ctx.stroke();

          ctx.strokeStyle = `rgba(15, 5, 0, ${0.9 * craterAlpha})`;
          ctx.lineWidth = crack.width * craterAlpha;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let p = 1; p < pts.length; p++) {
            const pt = pts[p];
            if (pt.cpx !== undefined) {
              ctx.quadraticCurveTo(pt.cpx, pt.cpy, pt.x, pt.y);
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
          ctx.stroke();

          ctx.strokeStyle = `rgba(255, 200, 100, ${0.5 * craterAlpha})`;
          ctx.lineWidth = Math.max(0.5, (crack.width - 1) * 0.5 * craterAlpha);
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let p = 1; p < pts.length; p++) {
            const pt = pts[p];
            if (pt.cpx !== undefined) {
              ctx.quadraticCurveTo(pt.cpx, pt.cpy, pt.x, pt.y);
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // ── EXPLOSION FLASH ──
    ctx.save();
    ctx.translate(cx, cy);

    if (explosionProgress < 1.0) {
      if (explosionProgress < 0.5) {
        const spikeAlpha = (0.5 - explosionProgress) / 0.5;
        ctx.save();
        const numSpikes = 14;
        for (let s = 0; s < numSpikes; s++) {
          const angle = (Math.PI * 2 / numSpikes) * s + (s % 2 === 0 ? 0.15 : -0.15);
          const spikeLen = R * (1.0 + (exp.seed || 0.5) * 0.6) * (explosionProgress * 2.5);
          const spikeW = (12 + s % 3 * 6) * spikeAlpha;
          ctx.save();
          ctx.rotate(angle);
          ctx.fillStyle = `rgba(10, 5, 0, ${spikeAlpha * 0.9})`;
          ctx.beginPath();
          ctx.moveTo(R * 0.15, -spikeW * 0.3);
          ctx.quadraticCurveTo(spikeLen * 0.5, -spikeW * 0.5, spikeLen, 0);
          ctx.quadraticCurveTo(spikeLen * 0.5, spikeW * 0.5, R * 0.15, spikeW * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 24 * (1 - explosionProgress);
      ctx.strokeStyle = `rgba(180, 10, 0, ${0.85 * expAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 14 * (1 - explosionProgress);
      ctx.strokeStyle = `rgba(255, 140, 0, ${0.9 * expAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 6 * (1 - explosionProgress);
      ctx.strokeStyle = `rgba(255, 250, 200, ${expAlpha})`;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      const pH = R * 3.0 * Math.sin(explosionProgress * Math.PI);
      const pW = R * 0.7 * (1 - explosionProgress * 0.4);
      if (pH > 1) {
        const pGrad = ctx.createLinearGradient(0, 0, 0, -pH);
        pGrad.addColorStop(0, `rgba(255, 255, 240, ${0.95 * expAlpha})`);
        pGrad.addColorStop(0.15, `rgba(255, 180, 30, ${0.85 * expAlpha})`);
        pGrad.addColorStop(0.5, `rgba(220, 40, 0, ${0.6 * expAlpha})`);
        pGrad.addColorStop(0.8, `rgba(60, 10, 0, ${0.3 * expAlpha})`);
        pGrad.addColorStop(1, 'rgba(20, 5, 0, 0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.moveTo(-pW * 0.5, 0);
        ctx.bezierCurveTo(-pW * 0.6, -pH * 0.3, -pW * 0.9, -pH * 0.7, -pW * 0.4, -pH);
        ctx.lineTo(pW * 0.4, -pH);
        ctx.bezierCurveTo(pW * 0.9, -pH * 0.7, pW * 0.6, -pH * 0.3, pW * 0.5, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      if (explosionProgress < 0.5) {
        const coreA = (0.5 - explosionProgress) / 0.5;
        const coreR = radius * (0.75 - explosionProgress * 0.4);
        const cG = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, coreR));
        cG.addColorStop(0, `rgba(255, 255, 255, ${coreA})`);
        cG.addColorStop(0.25, `rgba(255, 245, 210, ${0.9 * coreA})`);
        cG.addColorStop(0.6, `rgba(255, 120, 0, ${0.5 * coreA})`);
        cG.addColorStop(1, 'rgba(200, 20, 0, 0)');
        ctx.fillStyle = cG;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, coreR), 0, Math.PI * 2);
        ctx.fill();
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
        ctx.translate(d.x - cx, d.y - cy);
        ctx.rotate(d.rot);
        const isDark = _isDarkMode();

        if (d.type === 'ember') {
          ctx.globalAlpha = craterAlpha * 0.9;
          if (isDark) {
            const s = Math.max(2, Math.round(d.size / 2) * 2);
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(-s, -s, s * 2, s * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(-s / 2, -s / 2, s, s);
          } else {
            ctx.fillStyle = 'rgba(255, 102, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(0, 0, d.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.arc(0, 0, d.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, d.size * 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (d.type === 'smoke') {
          ctx.globalAlpha = craterAlpha * 0.25;
          if (isDark) {
            const s = Math.max(3, Math.round(d.size / 2) * 2);
            ctx.fillStyle = `rgba(30, 20, 15, ${craterAlpha * 0.5})`;
            ctx.fillRect(-s / 2, -s / 2, s, s);
          } else {
            ctx.fillStyle = `rgba(60, 50, 40, ${craterAlpha * 0.15})`;
            ctx.beginPath();
            ctx.arc(0, 0, d.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(30, 20, 15, ${craterAlpha * 0.4})`;
            ctx.beginPath();
            ctx.arc(0, 0, d.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.globalAlpha = craterAlpha * 0.85;
          ctx.fillStyle = d.color;
          if (isDark) {
            const s = Math.max(2, Math.round(d.size / 2) * 2);
            ctx.fillRect(-s / 2, -s / 2, s, s);
          } else {
            ctx.beginPath();
            const s = d.size;
            ctx.moveTo(-s * 0.5, -s * 0.3);
            ctx.lineTo(s * 0.2, -s * 0.5);
            ctx.lineTo(s * 0.5, s * 0.1);
            ctx.lineTo(s * 0.1, s * 0.5);
            ctx.lineTo(-s * 0.4, s * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
        ctx.restore();
      });
    }

    // â”€â”€ RISING HEAT SHIMMER WISPS â”€â”€
    if (craterAlpha > 0.1) {
      ctx.save();
      ctx.globalAlpha = craterAlpha * 0.2;
      for (let w = 0; w < 5; w++) {
        const wx = Math.sin(nowTime * 0.002 + w * 2.1 + (exp.seed || 0) * 8) * R * 0.4;
        const wPhase = ((nowTime * 0.001 + w * 1.3) % 3) / 3;
        const wy = -wPhase * R * 2.5;
        const wAlpha = Math.sin(wPhase * Math.PI) * craterAlpha * 0.2;
        const wSize = 5 + wPhase * 15;
        const hG = ctx.createRadialGradient(wx, wy, 0, wx, wy, wSize);
        hG.addColorStop(0, `rgba(200, 100, 30, ${wAlpha})`);
        hG.addColorStop(1, 'rgba(100, 40, 10, 0)');
        ctx.fillStyle = hG;
        ctx.beginPath();
        ctx.arc(wx, wy, wSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();

    if (exp.life <= 0) {
      state.thermobaricExplosions.splice(i, 1);
    }
  }
}
