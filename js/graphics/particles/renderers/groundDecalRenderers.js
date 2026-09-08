// ─────────────────────────────────────────────
// GROUND DECAL RENDERERS
// Optimized rendering for persistent scorch marks, ground fractures, and craters
// ─────────────────────────────────────────────

export function drawGroundScorch(ctx, effect, isGamePlay = true) {
  // Massive, highly-detailed organic scorch mark burned into the ground
  if (!isGamePlay) ctx.globalCompositeOperation = 'multiply';
  
  ctx.translate(effect.x, effect.y);

  // Deep burned organic polygon (dark blue/black for thunder, dark red/black for crimson)
  const isThunder = effect.color === 'thunder';
  ctx.fillStyle = isThunder ? `rgba(0, 10, 30, ${effect.life * 0.8})` : `rgba(30, 0, 0, ${effect.life * 0.8})`;
  ctx.beginPath();
  if (effect.points && effect.points.length > 0) {
    ctx.moveTo(effect.points[0].x, effect.points[0].y);
    for (let i = 1; i < effect.points.length; i++) {
      ctx.lineTo(effect.points[i].x, effect.points[i].y);
    }
  }
  ctx.closePath();
  ctx.fill();
  
  // Inner molten branching cracks (cyan for thunder, orange/red for crimson)
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = isThunder ? `rgba(0, 220, 255, ${effect.life * 0.8})` : `rgba(255, 60, 10, ${effect.life * 0.8})`;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1 + effect.life * 1.5;
  
  ctx.beginPath();
  if (effect.cracks && !isThunder) {
    // Rapidly shoot the cracks outward like a shockwave fracture!
    const shockwaveProgress = Math.min(1.0, (1.0 - effect.life) * 12.0); // Reaches 1.0 extremely fast

    ctx.strokeStyle = `rgba(255, 60, 10, ${effect.life * 0.8})`;
    ctx.lineWidth = 1 + effect.life * 1.5;
    for (const path of effect.cracks) {
      if (path.length > 0) {
        const drawSegments = Math.max(1, Math.floor(path.length * shockwaveProgress));
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < drawSegments; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
      }
    }
    ctx.stroke();
  }
}

export function drawArcaneGroundScorch(ctx, effect) {
  // ── PIXEL ART ARCANE GROUND SCORCH & RUNIC IMPACT CRATER ──
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = 2.5;
  const snap = (v) => Math.round(v / P) * P;
  const alpha = Math.max(0, Math.min(1.0, effect.life));
  const cx = snap(effect.x);
  const cy = snap(effect.y);

  // A. Stepped Pixel Scorched Crater Polygon
  if (effect.points && effect.points.length > 0) {
    ctx.fillStyle = `rgba(8, 18, 12, ${(alpha * 0.85).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(snap(cx + effect.points[0].x), snap(cy + effect.points[0].y));
    for (let i = 1; i < effect.points.length; i++) {
      ctx.lineTo(snap(cx + effect.points[i].x), snap(cy + effect.points[i].y));
    }
    ctx.closePath();
    ctx.fill();

    // Dark outer pixel border
    ctx.strokeStyle = `rgba(3, 10, 6, ${(alpha * 0.95).toFixed(3)})`;
    ctx.lineWidth = P;
    ctx.stroke();
  }

  // B. Glowing Pixelated Arcane Fractures & Rune Cracks
  if (effect.cracks && effect.cracks.length > 0) {
    for (const path of effect.cracks) {
      if (!path || path.length === 0) continue;
      for (let i = 0; i < path.length; i++) {
        const px = snap(cx + path[i].x);
        const py = snap(cy + path[i].y);
        
        // Dark outline pixel
        ctx.fillStyle = `rgba(0, 30, 15, ${(alpha * 0.70).toFixed(3)})`;
        ctx.fillRect(px - P, py - P, P * 3, P * 3);

        // Glowing emerald fracture pixel
        ctx.fillStyle = (i % 2 === 0) 
          ? `rgba(0, 255, 120, ${(alpha * 0.90).toFixed(3)})`
          : `rgba(0, 220, 180, ${(alpha * 0.80).toFixed(3)})`;
        ctx.fillRect(px, py, P, P);

        // Specular white ember in center
        if (i === 0 || i === path.length - 1) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`;
          ctx.fillRect(px, py, P * 0.8, P * 0.8);
        }
      }
    }
  }
  ctx.restore();
}
