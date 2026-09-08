// ─────────────────────────────────────────────
// CHARACTER SPECIAL RENDERERS
// Specialized signature particle renderers (Mahito, Todo, Rubbick, Yuta, etc.)
// ─────────────────────────────────────────────

const _unitGradientCache = new Map();
function getUnitRadialGradient(ctx, key, stops) {
  let gradient = _unitGradientCache.get(key);
  if (!gradient) {
    gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (const [offset, color] of stops) gradient.addColorStop(offset, color);
    _unitGradientCache.set(key, gradient);
  }
  return gradient;
}

export function drawCrimsonLightningCore(ctx, effect) {
  const isRubbick = effect.type === 'rubbickLightningCore' || effect.type === 'tricksterLightningCore';
  effect.size += (100 * 0.8 - effect.size) * 0.2;
  ctx.fillStyle = `rgba(255, 255, 255, ${effect.life})`;
  
  ctx.beginPath();
  const points = 12;
  for (let p = 0; p < points; p++) {
    const angle = (p / points) * Math.PI * 2;
    const r = p % 2 === 0 ? effect.size : effect.size * 0.4;
    const px = effect.x + Math.cos(angle) * r;
    const py = effect.y + Math.sin(angle) * r;
    if (p === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = isRubbick ? `rgba(100, 255, 100, ${effect.life * 0.5})` : `rgba(255, 50, 50, ${effect.life * 0.5})`;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, effect.size * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export function drawMahitoSoulBubble(ctx, effect) {
  ctx.globalCompositeOperation = 'source-over';
  const col = effect.bubbleColor || { fill: 'rgba(217, 70, 239, 0.65)', stroke: '#F5D0FE' };
  const curSize = effect.size + (effect.targetSize - effect.size) * (1 - effect.life);
  const wobbleX = Math.sin((effect.wobblePhase || 0) + (1 - effect.life) * 8) * 4;
  const px = effect.x + wobbleX;
  const py = effect.y;

  ctx.beginPath();
  ctx.arc(px, py, Math.max(1, curSize), 0, Math.PI * 2);
  ctx.fillStyle = col.fill;
  ctx.fill();

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = col.stroke;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(px - curSize * 0.35, py - curSize * 0.35, Math.max(0.5, curSize * 0.28), 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${effect.life * 0.85})`;
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
}

export function drawCrimsonLightningRing(ctx, effect) {
  const isRubbick = effect.type === 'rubbickLightningRing' || effect.type === 'tricksterLightningRing';
  if (effect.targetSize) {
    effect.size += (effect.targetSize - effect.size) * 0.15;
  }
  ctx.strokeStyle = isRubbick ? `rgba(0, 200, 0, ${effect.life * 0.8})` : `rgba(200, 0, 0, ${effect.life * 0.8})`;
  ctx.lineWidth = 3 * effect.life;
  ctx.beginPath();
  const segments = 24;
  for (let seg = 0; seg <= segments; seg++) {
    const theta = (seg / segments) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * effect.size * 0.15;
    const rx = effect.x + Math.cos(theta) * (effect.size + jitter);
    const ry = effect.y + Math.sin(theta) * (effect.size + jitter);
    if (seg === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = isRubbick ? `rgba(200, 255, 200, ${effect.life * 0.5})` : `rgba(255, 200, 200, ${effect.life * 0.5})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let seg = 0; seg <= segments; seg++) {
    const theta = (seg / segments) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * effect.size * 0.1;
    const rx = effect.x + Math.cos(theta) * (effect.size * 0.85 + jitter);
    const ry = effect.y + Math.sin(theta) * (effect.size * 0.85 + jitter);
    if (seg === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.closePath();
  ctx.stroke();
}

export function drawMahitoSoulShockwave(ctx, effect) {
  if (effect.targetSize) {
    effect.size += (effect.targetSize - effect.size) * 0.16;
  }

  const P = 2.5;
  const radius = effect.size;
  const steps = Math.ceil(radius / P);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (effect.color === 'magenta') {
    ctx.fillStyle = `rgba(217, 70, 239, ${(effect.life * 0.85).toFixed(3)})`;
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const dist = Math.hypot(gx * P, gy * P);
        if (dist <= radius + P && dist > radius - P * 1.5) {
          if ((gx + gy) % 2 === 0 || effect.life > 0.5) {
            ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
          }
        }
      }
    }

    ctx.fillStyle = `rgba(15, 5, 20, ${(effect.life * 0.90).toFixed(3)})`;
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const dist = Math.hypot(gx * P, gy * P);
        if (dist <= radius - P * 1.5 && dist > radius - P * 2.5) {
          ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
        }
      }
    }
  } else {
    ctx.fillStyle = `rgba(0, 229, 255, ${(effect.life * 0.90).toFixed(3)})`;
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const dist = Math.hypot(gx * P, gy * P);
        if (dist <= radius + P && dist > radius - P * 1.2) {
          ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
        }
      }
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${(effect.life * 0.95).toFixed(3)})`;
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        const dist = Math.hypot(gx * P, gy * P);
        if (dist <= radius && dist > radius - P * 0.8) {
          ctx.fillRect(effect.x + gx * P, effect.y + gy * P, P, P);
        }
      }
    }
  }
  ctx.restore();
}

export function drawMahitoSoulCoreFlash(ctx, effect) {
  effect.size += (effect.targetSize - effect.size) * 0.22;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.5;

  const points = 16;
  for (let p = 0; p < points; p++) {
    const angle = (p / points) * Math.PI * 2;
    const factor = (p % 4 === 0) ? 1.0 : (p % 2 === 0 ? 0.65 : 0.35);
    const rayLen = effect.size * factor;
    const raySteps = Math.max(1, Math.round(rayLen / P));

    ctx.fillStyle = (p % 2 === 0) 
      ? `rgba(220, 38, 38, ${(effect.life * 0.85).toFixed(3)})` 
      : `rgba(217, 70, 239, ${(effect.life * 0.90).toFixed(3)})`;

    for (let s = 0; s <= raySteps; s++) {
      const rx = Math.round((effect.x + Math.cos(angle) * s * P) / P) * P;
      const ry = Math.round((effect.y + Math.sin(angle) * s * P) / P) * P;
      ctx.fillRect(rx, ry, P, P);
    }
  }

  ctx.fillStyle = `rgba(255, 255, 255, ${(effect.life * 0.95).toFixed(3)})`;
  const coreSize = Math.max(P * 2, Math.round((effect.size * 0.25) / P) * P);
  ctx.fillRect(effect.x - coreSize, effect.y - P, coreSize * 2, P * 2);
  ctx.fillRect(effect.x - P, effect.y - coreSize, P * 2, coreSize * 2);

  ctx.restore();
}

export function drawMahitoClawScratchBurst(ctx, effect) {
  const ang = effect.angle || 0;
  const radius = effect.size || 35;
  const alpha = Math.sin(effect.life * Math.PI);
  const slashOffsets = [-14, -7, 0, 7, 14];

  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.rotate(ang);

  slashOffsets.forEach((offY, idx) => {
    const cutLen = radius * (1.1 + (2 - Math.abs(idx - 2)) * 0.25);
    const startX = -cutLen * 0.5;
    const endX = cutLen * 0.5;
    const thick = (idx === 2 ? 3.5 : 2.5) * alpha;

    ctx.beginPath();
    ctx.moveTo(startX, offY);
    ctx.quadraticCurveTo(0, offY - thick, endX, offY);
    ctx.quadraticCurveTo(0, offY + thick, startX, offY);
    ctx.closePath();

    ctx.fillStyle = (idx % 2 === 0)
      ? `rgba(220, 38, 38, ${(0.92 * alpha).toFixed(3)})`
      : `rgba(217, 70, 239, ${(0.88 * alpha).toFixed(3)})`;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * alpha).toFixed(3)})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(startX, offY);
    ctx.lineTo(endX, offY);
    ctx.stroke();
  });

  ctx.restore();
}

export function drawMahitoDomainSoulTendrilStrike(ctx, effect) {
  const startX = effect.startX !== undefined ? effect.startX : effect.x;
  const startY = effect.startY !== undefined ? effect.startY : effect.y;
  const targetX = effect.targetX !== undefined ? effect.targetX : effect.x;
  const targetY = effect.targetY !== undefined ? effect.targetY : effect.y;
  const dx = targetX - startX;
  const dy = targetY - startY;
  const totalDist = Math.hypot(dx, dy) || 1;
  const baseAngle = Math.atan2(dy, dx);
  const cosA = Math.cos(baseAngle);
  const sinA = Math.sin(baseAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const progress = 1.0 - effect.life;
  const reachRatio = Math.min(1.0, progress / 0.20);
  const easeReach = Math.sin(reachRatio * (Math.PI / 2));
  const currentDist = totalDist * easeReach;
  const currentEndX = startX + cosA * currentDist;
  const currentEndY = startY + sinA * currentDist;

  const alpha = Math.sin(effect.life * Math.PI);
  if (alpha <= 0.01) return;

  ctx.save();

  ctx.strokeStyle = effect.isTransformed
    ? `rgba(217, 70, 239, ${(0.65 * alpha).toFixed(3)})`
    : `rgba(192, 38, 211, ${(0.60 * alpha).toFixed(3)})`;
  ctx.lineWidth = 14.0 * alpha;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  const segments = Math.max(6, Math.floor(currentDist / 22));
  for (let s = 1; s <= segments; s++) {
    const t = s / segments;
    const px = startX + (currentEndX - startX) * t;
    const py = startY + (currentEndY - startY) * t;
    const wave = Math.sin(t * Math.PI * 3 + (effect.wobblePhase || 0) + progress * 12) * (6.0 * (1 - t * 0.4));
    ctx.lineTo(px + perpX * wave, py + perpY * wave);
  }
  ctx.stroke();

  ctx.strokeStyle = effect.isTransformed ? '#4A044E' : '#3B0764';
  ctx.lineWidth = 7.5 * alpha;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  for (let s = 1; s <= segments; s++) {
    const t = s / segments;
    const px = startX + (currentEndX - startX) * t;
    const py = startY + (currentEndY - startY) * t;
    const wave = Math.sin(t * Math.PI * 3 + (effect.wobblePhase || 0) + progress * 12) * (5.0 * (1 - t * 0.4));
    ctx.lineTo(px + perpX * wave, py + perpY * wave);
  }
  ctx.stroke();

  ctx.strokeStyle = `rgba(245, 208, 254, ${(0.92 * alpha).toFixed(3)})`;
  ctx.lineWidth = 2.2 * alpha;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  for (let s = 1; s <= segments; s++) {
    const t = s / segments;
    const px = startX + (currentEndX - startX) * t;
    const py = startY + (currentEndY - startY) * t;
    const wave = Math.sin(t * Math.PI * 3 + (effect.wobblePhase || 0) + progress * 12) * (3.5 * (1 - t * 0.4));
    ctx.lineTo(px + perpX * wave, py + perpY * wave);
  }
  ctx.stroke();

  ctx.strokeStyle = `rgba(15, 15, 20, ${(0.95 * alpha).toFixed(3)})`;
  ctx.lineWidth = 1.8 * alpha;
  for (let s = 1; s < segments; s++) {
    if (s % 2 === 0) {
      const t = s / segments;
      const px = startX + (currentEndX - startX) * t;
      const py = startY + (currentEndY - startY) * t;
      const wave = Math.sin(t * Math.PI * 3 + (effect.wobblePhase || 0) + progress * 12) * (4.0 * (1 - t * 0.4));
      const cx = px + perpX * wave;
      const cy = py + perpY * wave;
      ctx.beginPath();
      ctx.moveTo(cx - perpX * 5.0, cy - perpY * 5.0);
      ctx.lineTo(cx + perpX * 5.0, cy + perpY * 5.0);
      ctx.stroke();
    }
  }

  if (reachRatio >= 0.5) {
    ctx.save();
    ctx.translate(currentEndX, currentEndY);
    ctx.rotate(baseAngle);

    const clawTalons = [-10, -3.5, 3.5, 10];
    clawTalons.forEach((offY, cIdx) => {
      const talonLen = (cIdx === 1 || cIdx === 2) ? 26 : 19;
      ctx.fillStyle = effect.isTransformed ? '#C026D3' : '#F5D0FE';
      ctx.beginPath();
      ctx.moveTo(-4, offY);
      ctx.lineTo(talonLen, offY * 0.6);
      ctx.lineTo(-4, offY + (offY >= 0 ? 2.5 : -2.5));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#181C26';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    ctx.fillStyle = effect.isTransformed ? '#3B0764' : '#581C87';
    ctx.beginPath();
    ctx.arc(-2, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#F5D0FE';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

export function drawCursedBiteMaw(ctx, effect) {
  const ang = effect.angle || 0;
  const progress = 1.0 - effect.life;
  const snapProgress = Math.min(1.0, progress / 0.50);
  const easeSnap = Math.pow(snapProgress, 2.5);
  const currentJawAngle = (1.0 - easeSnap) * 0.70 + 0.03;

  const jawRadius = effect.size || 28;
  const mainColor = effect.color || '#D946EF';

  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.rotate(ang);

  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.rotate(side * currentJawAngle);

    ctx.fillStyle = '#181C26';
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.arc(0, 0, jawRadius, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.lineTo(jawRadius * 0.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.0;

    const teethAngles = [-Math.PI * 0.22, 0, Math.PI * 0.22];
    teethAngles.forEach(tAng => {
      const fangBaseX = Math.cos(tAng) * jawRadius;
      const fangBaseY = Math.sin(tAng) * jawRadius;
      const fangTipX = Math.cos(tAng) * (jawRadius * 0.55);
      const fangTipY = Math.sin(tAng) * (jawRadius * 0.55);
      const perpX = -Math.sin(tAng) * 3.5;
      const perpY = Math.cos(tAng) * 3.5;

      ctx.beginPath();
      ctx.moveTo(fangBaseX + perpX, fangBaseY + perpY);
      ctx.lineTo(fangTipX, fangTipY);
      ctx.lineTo(fangBaseX - perpX, fangBaseY - perpY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }

  if (snapProgress >= 0.8) {
    ctx.fillStyle = `rgba(255, 255, 255, ${effect.life * 0.95})`;
    ctx.beginPath();
    ctx.arc(0, 0, jawRadius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawArcaneFlash(ctx, effect) {
  effect.size += (effect.targetSize - effect.size) * 0.12;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.max(0, Math.min(1.0, effect.life));
  const flashR = snap(effect.size);

  ctx.fillStyle = `rgba(0, 255, 120, ${(alpha * 0.80).toFixed(3)})`;
  ctx.fillRect(cx - flashR, cy - P, flashR * 2, P * 2);
  ctx.fillRect(cx - P, cy - flashR, P * 2, flashR * 2);

  const diagR = snap(flashR * 0.65);
  for (let d = -diagR; d <= diagR; d += P) {
    ctx.fillRect(cx + d, cy + d, P, P);
    ctx.fillRect(cx + d, cy - d, P, P);
  }

  const midR = snap(flashR * 0.40);
  ctx.fillStyle = `rgba(80, 255, 180, ${(alpha * 0.90).toFixed(3)})`;
  ctx.fillRect(cx - midR, cy - midR, midR * 2, midR * 2);

  const coreR = snap(flashR * 0.20);
  ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`;
  ctx.fillRect(cx - coreR, cy - coreR, coreR * 2, coreR * 2);

  ctx.restore();
}

export function drawArcaneGlyph(ctx, effect) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.max(0, Math.min(1.0, effect.life));
  const baseColor = effect.color || 'rgba(0, 255, 140, 1)';
  const colBody = baseColor.replace(/[\d.]+\)$/, `${alpha.toFixed(3)})`);
  const colCore = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`;
  const colDark = `rgba(5, 20, 10, ${(alpha * 0.85).toFixed(3)})`;

  ctx.translate(cx, cy);
  effect.rotation += effect.rotationSpeed || 0;
  const steppedAngle = Math.round(effect.rotation / (Math.PI / 4)) * (Math.PI / 4);
  ctx.rotate(steppedAngle);

  if (effect.glyphShape === 'diamond') {
    ctx.fillStyle = colDark;
    ctx.fillRect(-P * 2, -P * 3, P * 4, P);
    ctx.fillRect(-P * 3, -P * 2, P * 6, P * 4);
    ctx.fillRect(-P * 2, P * 2, P * 4, P);
    ctx.fillStyle = colBody;
    ctx.fillRect(-P * 1.5, -P * 2, P * 3, P * 4);
    ctx.fillRect(-P * 2, -P * 1.5, P * 4, P * 3);
    ctx.fillStyle = colCore;
    ctx.fillRect(-P * 0.5, -P * 0.5, P, P);
  } else if (effect.glyphShape === 'triangle') {
    ctx.fillStyle = colDark;
    ctx.fillRect(-P * 2.5, P * 1.5, P * 5, P);
    ctx.fillRect(-P * 2, P * 0.5, P * 4, P);
    ctx.fillRect(-P * 1.5, -P * 0.5, P * 3, P);
    ctx.fillRect(-P * 0.5, -P * 2.5, P, P * 2);
    ctx.fillStyle = colBody;
    ctx.fillRect(-P * 1.5, P * 0.5, P * 3, P);
    ctx.fillRect(-P, -P * 0.5, P * 2, P);
    ctx.fillRect(-P * 0.5, -P * 1.5, P, P);
    ctx.fillStyle = colCore;
    ctx.fillRect(-P * 0.5, 0, P, P);
  } else {
    ctx.fillStyle = colDark;
    ctx.fillRect(-P * 2.5, -P * 2.5, P * 5, P * 5);
    ctx.fillStyle = colBody;
    ctx.fillRect(-P * 1.5, -P * 1.5, P * 3, P * 3);
    ctx.fillStyle = colCore;
    ctx.fillRect(-P * 0.5, -P * 0.5, P, P);
  }
  ctx.restore();
}

export function drawSpellStealWisp(ctx, effect) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.min(1.0, effect.life);
  const moveAng = Math.atan2(effect.vy || 0, effect.vx || 1);

  const pr = snap(Math.max(P * 2, effect.size || 6));
  
  ctx.fillStyle = `rgba(5, 20, 10, ${(alpha * 0.90).toFixed(2)})`;
  ctx.fillRect(cx - pr - P, cy - P, (pr + P) * 2, P * 2);
  ctx.fillRect(cx - P, cy - pr - P, P * 2, (pr + P) * 2);
  ctx.fillRect(cx - pr * 0.7, cy - pr * 0.7, pr * 1.4, pr * 1.4);

  ctx.fillStyle = effect.color || '#00FF64';
  ctx.fillRect(cx - pr, cy - pr * 0.5, pr * 2, pr);
  ctx.fillRect(cx - pr * 0.5, cy - pr, pr, pr * 2);

  ctx.fillStyle = '#80FFB0';
  ctx.fillRect(cx - pr * 0.4, cy - pr * 0.4, pr * 0.8, pr * 0.8);

  ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(2)})`;
  ctx.fillRect(cx - P * 0.5, cy - P * 0.5, P, P);

  const tailSteps = 4;
  for (let s = 1; s <= tailSteps; s++) {
    const tNorm = s / tailSteps;
    const tx = snap(effect.x - Math.cos(moveAng) * s * 6 + (Math.sin(s * 3.7 + effect.life * 10) * P * 1.5));
    const ty = snap(effect.y - Math.sin(moveAng) * s * 6 + (Math.cos(s * 3.7 + effect.life * 10) * P * 1.5));
    const tAlpha = alpha * (1 - tNorm) * 0.85;
    if (tAlpha > 0.05) {
      ctx.fillStyle = (s === 1) ? `rgba(255, 255, 255, ${tAlpha.toFixed(2)})` : `rgba(0, 255, 100, ${tAlpha.toFixed(2)})`;
      ctx.fillRect(tx - P * 0.5, ty - P * 0.5, P, P);
    }
  }
  ctx.restore();
}

export function drawHealingEffect(ctx, effect) {
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.max(0, Math.min(1.0, effect.life));
  const col = effect.color || 'rgba(56, 189, 248, 1)';

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
  ctx.fillRect(cx - P * 0.5, cy - P * 0.5, P, P);

  ctx.fillStyle = col.replace(/[\d\.]+\)$/, `${(alpha * 0.90).toFixed(2)})`);
  ctx.fillRect(cx - P * 1.5, cy - P * 0.5, P, P);
  ctx.fillRect(cx + P * 0.5, cy - P * 0.5, P, P);
  ctx.fillRect(cx - P * 0.5, cy - P * 1.5, P, P);
  ctx.fillRect(cx - P * 0.5, cy + P * 0.5, P, P);

  ctx.fillStyle = col.replace(/[\d\.]+\)$/, `${(alpha * 0.35).toFixed(2)})`);
  ctx.fillRect(cx - P * 1.5, cy - P * 1.5, P, P);
  ctx.fillRect(cx + P * 0.5, cy - P * 1.5, P, P);
  ctx.fillRect(cx - P * 1.5, cy + P * 0.5, P, P);
  ctx.fillRect(cx + P * 0.5, cy + P * 0.5, P, P);
}

export function drawYutaBeamPinkCore(ctx, effect) {
  const alpha = Math.max(0, Math.min(1.0, effect.life));
  const lifeStep = Math.round(alpha * 20) / 20;

  const glowRadius = effect.size * 4.5;
  const gradient = getUnitRadialGradient(ctx, `yutaPinkCore_${lifeStep}`, [
    [0, `rgba(255, 255, 255, ${lifeStep})`],
    [0.15, `rgba(255, 230, 255, ${lifeStep * 0.95})`],
    [0.35, `rgba(235, 20, 190, ${lifeStep * 0.85})`],
    [0.65, `rgba(180, 0, 160, ${lifeStep * 0.40})`],
    [1, 'rgba(100, 0, 120, 0)']
  ]);

  ctx.globalCompositeOperation = 'lighter';
  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.scale(glowRadius, glowRadius);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.98})`;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, Math.max(1.0, effect.size * 0.5), 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
}

export function drawBoogieWoogieSwapBeam(ctx, effect) {
  const x1 = effect.x;
  const y1 = effect.y;
  const x2 = effect.targetX !== undefined ? effect.targetX : x1;
  const y2 = effect.targetY !== undefined ? effect.targetY : y1;
  const life = Math.max(0, Math.min(1.0, effect.life));
  const alpha = Math.min(1.0, Math.pow(life, 0.7));

  ctx.save();
  ctx.globalAlpha = 1.0;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const perpX = -dy / dist;
  const perpY = dx / dist;

  ctx.strokeStyle = `rgba(0, 100, 255, ${alpha * 0.80})`;
  ctx.lineWidth = Math.max(1.0, 8.0 * alpha);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(0, 230, 255, ${alpha * 0.95})`;
  ctx.lineWidth = Math.max(0.8, 4.2 * alpha);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 1.0})`;
  ctx.lineWidth = Math.max(0.4, 1.8 * alpha);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(200, 245, 255, ${alpha * 0.95})`;
  ctx.lineWidth = Math.max(0.4, 1.2 * alpha);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const segs = Math.max(5, Math.min(12, Math.floor(dist / 40)));
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const side = (i % 2 === 0 ? 1 : -1);
    const jitter = (side * 8 + Math.sin(i * 3 + life * 12) * 5) * alpha;
    const cx = x1 + dx * t + perpX * jitter;
    const cy = y1 + dy * t + perpY * jitter;
    ctx.lineTo(cx, cy);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const dotR = Math.max(1.0, 6.0 * alpha);
  for (const [nx, ny] of [[x1, y1], [x2, y2]]) {
    ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.90})`;
    ctx.beginPath();
    ctx.arc(nx, ny, dotR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 1.0})`;
    ctx.beginPath();
    ctx.arc(nx, ny, dotR * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Renders an expanding, discrete 2D pixel-art arcane magic circle (Runic Cast Sigil)
 * whenever Rubbick fires a basic attack (Arcane Bolt).
 * Adheres strictly to Rule #11 (no shadowBlur) and discrete stepped pixel art.
 */
export function drawRubbickCastSigil(ctx, effect) {
  if (!effect) return;
  effect.size += (effect.targetSize - effect.size) * 0.20;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.max(0, Math.min(1.0, effect.life));
  const progress = 1.0 - alpha;
  const r = snap(effect.size);
  if (r < P) {
    ctx.restore();
    return;
  }

  const baseCol = effect.color || '#00FF64';
  const ang = effect.angle !== undefined ? effect.angle : 0;
  effect.rotation = (effect.rotation || 0) + 0.08;

  ctx.translate(cx, cy);
  ctx.rotate(ang);

  // Optical aperture perspective: tilt circle slightly along attack vector
  ctx.scale(0.55 + 0.45 * (1 - progress * 0.5), 1.0);

  // 1. Dark ink backing ring for high-contrast visibility
  ctx.strokeStyle = `rgba(6, 18, 10, ${(alpha * 0.88).toFixed(3)})`;
  ctx.lineWidth = P * 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Main Outer Emerald Runic Ring with Stepped Inscriptions
  ctx.strokeStyle = baseCol;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = P;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Concentric Inner Mint Ring & Interlocking Sacred 8-Pointed Star
  const innerR = snap(r * 0.60);
  if (innerR > P * 2) {
    ctx.strokeStyle = '#70FFAB';
    ctx.lineWidth = P;
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.stroke();

    // Sacred 8-pointed star (two interleaved rotated squares)
    const starRot = effect.rotation * 0.5;
    for (let s = 0; s < 2; s++) {
      const offAng = starRot + (s * Math.PI / 4);
      ctx.beginPath();
      for (let pt = 0; pt <= 4; pt++) {
        const pAng = offAng + (pt * Math.PI / 2);
        const px = snap(Math.cos(pAng) * innerR);
        const py = snap(Math.sin(pAng) * innerR);
        if (pt === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = (s === 0) ? '#E6FFF0' : 'rgba(0, 255, 100, 0.7)';
      ctx.lineWidth = P * 0.8;
      ctx.stroke();
    }
  }

  // 4. Rotating Cardinal Diamond Runes with Specular Cores
  const rot = effect.rotation;
  for (let i = 0; i < 4; i++) {
    const nodeAng = rot + (i * Math.PI * 0.5);
    const nx = snap(Math.cos(nodeAng) * r);
    const ny = snap(Math.sin(nodeAng) * r);

    // Dark outline
    ctx.fillStyle = '#06120A';
    ctx.fillRect(nx - P * 2, ny - P * 2, P * 4, P * 4);
    // Emerald diamond
    ctx.fillStyle = baseCol;
    ctx.fillRect(nx - P * 1.5, ny - P * 0.5, P * 3, P);
    ctx.fillRect(nx - P * 0.5, ny - P * 1.5, P, P * 3);
    // Specular white center
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(nx - P * 0.5, ny - P * 0.5, P, P);
  }

  // 5. Cardinal & Diagonal Aperture Ray Spikes
  for (let i = 0; i < 8; i++) {
    const rayAng = rot * 0.5 + (i * Math.PI * 0.25);
    const isCardinal = (i % 2 === 0);
    const rayStart = isCardinal ? r - P * 2 : innerR;
    const rayEnd = isCardinal ? r + P * 4 : r - P;
    const rx1 = snap(Math.cos(rayAng) * rayStart);
    const ry1 = snap(Math.sin(rayAng) * rayStart);
    const rx2 = snap(Math.cos(rayAng) * rayEnd);
    const ry2 = snap(Math.sin(rayAng) * rayEnd);

    ctx.strokeStyle = isCardinal ? '#FFFFFF' : '#70FFAB';
    ctx.lineWidth = P;
    ctx.beginPath();
    ctx.moveTo(rx1, ry1);
    ctx.lineTo(rx2, ry2);
    ctx.stroke();
  }

  // 6. Central Anamorphic Emerald Optical Flare on burst frames
  if (progress < 0.60) {
    const flareProg = 1.0 - (progress / 0.60);
    const streakLen = snap(70 * Math.sin(flareProg * Math.PI * 0.5));

    // Intense cross flare along the aperture plane
    ctx.fillStyle = `rgba(255, 255, 255, ${(flareProg * alpha).toFixed(3)})`;
    ctx.fillRect(-P * 0.5, -streakLen, P, streakLen * 2);

    // Mint wings
    ctx.fillStyle = `rgba(112, 255, 171, ${(flareProg * alpha * 0.8).toFixed(3)})`;
    ctx.fillRect(-P, -snap(streakLen * 0.7), P * 2, snap(streakLen * 1.4));

    // Emerald halo
    ctx.fillStyle = `rgba(0, 255, 100, ${(flareProg * alpha * 0.5).toFixed(3)})`;
    ctx.fillRect(-P * 2, -snap(streakLen * 0.4), P * 4, snap(streakLen * 0.8));
  }

  // 7. Central Arcane Flash Core on initial burst frames
  if (progress < 0.40) {
    const coreProg = 1.0 - (progress / 0.40);
    const coreR = snap(r * 0.40 * coreProg);
    if (coreR > P) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(coreProg * alpha).toFixed(3)})`;
      ctx.fillRect(-coreR, -P, coreR * 2, P * 2);
      ctx.fillRect(-P, -coreR, P * 2, coreR * 2);
      ctx.fillStyle = baseCol;
      ctx.fillRect(-coreR * 0.6, -coreR * 0.6, coreR * 1.2, coreR * 1.2);
    }
  }

  ctx.restore();
}

/**
 * Renders an authentic 3D-perspective-squashed ground summoning matrix
 * directly beneath Rubbick on the arena floor when executing a basic attack.
 */
export function drawRubbickGroundSigil(ctx, effect) {
  if (!effect) return;
  effect.size += (effect.targetSize - effect.size) * 0.16;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(effect.x);
  const cy = snap(effect.y);
  const alpha = Math.max(0, Math.min(1.0, effect.life));
  const r = snap(effect.size);
  if (r < P * 2) {
    ctx.restore();
    return;
  }

  const baseCol = effect.color || '#00FF64';
  effect.rotation = (effect.rotation || 0) + 0.04;

  ctx.translate(cx, cy);
  // Perspective squashing for 3D floor plane
  ctx.scale(1.0, 0.45);

  // 1. Dark ink backing
  ctx.strokeStyle = `rgba(5, 18, 10, ${(alpha * 0.85).toFixed(3)})`;
  ctx.lineWidth = P * 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Main Outer Emerald Floor Ring
  ctx.strokeStyle = baseCol;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = P;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Inner Concentric Mint Ring
  const innerR = snap(r * 0.60);
  ctx.strokeStyle = '#70FFAB';
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Rotating 6-node Arcane Glyphs along outer ring
  const rot = effect.rotation;
  for (let i = 0; i < 6; i++) {
    const nodeAng = rot + (i * Math.PI / 3);
    const nx = snap(Math.cos(nodeAng) * r);
    const ny = snap(Math.sin(nodeAng) * r);

    ctx.fillStyle = '#06120A';
    ctx.fillRect(nx - P, ny - P, P * 2, P * 2);
    ctx.fillStyle = (i % 2 === 0) ? '#FFFFFF' : baseCol;
    ctx.fillRect(nx - P * 0.5, ny - P * 0.5, P, P);
  }

  // 5. Connecting Hexagram / Star Spokes
  for (let i = 0; i < 6; i++) {
    const spokeAng = rot + (i * Math.PI / 3);
    const sx1 = snap(Math.cos(spokeAng) * innerR);
    const sy1 = snap(Math.sin(spokeAng) * innerR);
    const sx2 = snap(Math.cos(spokeAng) * r);
    const sy2 = snap(Math.sin(spokeAng) * r);

    ctx.strokeStyle = `rgba(112, 255, 171, ${(alpha * 0.75).toFixed(3)})`;
    ctx.lineWidth = P;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
  }

  // 6. Central ground pulse
  const pulseR = snap(r * 0.35 * alpha);
  ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.60).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

