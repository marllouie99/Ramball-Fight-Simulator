// ─────────────────────────────────────────────────────────────────────────────
// GETSUGA TENSHO HIT IMPACT EFFECT — Bleach Anime Spatial Reiatsu Cleave System
// High-performance, zero-allocation particle pipeline for Getsuga Tensho enemy impacts.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_GETSUGA_PARTICLES = 120;
const _pool = [];
const _activeEffects = [];

// Initialize zero-GC particle pool
for (let i = 0; i < MAX_GETSUGA_PARTICLES; i++) {
  _pool.push({
    type: 'slice', // 'slice', 'ring', 'needle', 'smoke'
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    length: 0,
    thickness: 0,
    size: 0,
    maxSize: 0,
    life: 0,
    maxLife: 0,
    form: 'shikai', // 'shikai', 'bankai', 'hollow', 'final_bankai'
    color: '#00E5FF',
    accentColor: '#FFFFFF',
    voidColor: '#000000',
    alpha: 1.0,
    scale: 1.0,
    curve: 0
  });
}

function _getParticle() {
  return _pool.length > 0 ? _pool.pop() : {
    type: 'slice', x: 0, y: 0, vx: 0, vy: 0, angle: 0,
    length: 0, thickness: 0, size: 0, maxSize: 0,
    life: 0, maxLife: 0, form: 'shikai',
    color: '#00E5FF', accentColor: '#FFFFFF', voidColor: '#000000',
    alpha: 1.0, scale: 1.0, curve: 0
  };
}

function _returnParticle(p) {
  _pool.push(p);
}

/**
 * Spawns an authentic anime Getsuga Tensho hit impact on a target.
 * @param {number} x Target hit X
 * @param {number} y Target hit Y
 * @param {number} hitAngle Angle of incoming Getsuga wave velocity
 * @param {string} form 'shikai', 'bankai', 'hollow', 'bankai_hollow', 'final_bankai'
 */
export function spawnGetsugaHitEffect(x, y, hitAngle = 0, form = 'shikai') {
  const isFinal = form === 'final_bankai';
  const isHollow = form === 'hollow' || form === 'bankai_hollow';
  const isBankai = form === 'bankai' || form === 'bankai_hollow' || isFinal;

  let primaryColor = '#00E5FF'; // Cyan
  let accentColor = '#FFFFFF';
  let voidColor = '#001A33';
  let smokeColor = 'rgba(0, 229, 255, 0.4)';

  if (isFinal) {
    primaryColor = '#FF0A20'; // Blood Scarlet
    accentColor = '#FFFFFF';
    voidColor = '#050002';
    smokeColor = 'rgba(255, 10, 30, 0.5)';
  } else if (isHollow) {
    primaryColor = '#FF2814'; // Crimson Flame
    accentColor = '#FFAA00';
    voidColor = '#080004';
    smokeColor = 'rgba(255, 40, 20, 0.45)';
  } else if (isBankai) {
    primaryColor = '#FF1E28'; // Kuroi Crimson
    accentColor = '#FFE5E8';
    voidColor = '#080204';
    smokeColor = 'rgba(220, 20, 30, 0.45)';
  }

  const scale = isFinal ? 1.6 : (isHollow ? 1.25 : (isBankai ? 1.15 : 1.0));

  // 1. Primary Cross-Cleave Spatial Slash Scar (Across target body)
  const sliceAngles = [hitAngle + Math.PI / 2, hitAngle - Math.PI / 2 + 0.35];
  for (let s = 0; s < (isFinal ? 3 : 2); s++) {
    const p = _getParticle();
    p.type = 'slice';
    p.x = x + (Math.random() - 0.5) * 8;
    p.y = y + (Math.random() - 0.5) * 8;
    p.vx = Math.cos(hitAngle) * (2 + s * 2);
    p.vy = Math.sin(hitAngle) * (2 + s * 2);
    p.angle = sliceAngles[s % sliceAngles.length] + (Math.random() - 0.5) * 0.25;
    p.length = (42 + s * 14) * scale;
    p.thickness = (9.0 + s * 3.5) * scale;
    p.life = 0;
    p.maxLife = isFinal ? 20 : 16;
    p.form = form;
    p.color = primaryColor;
    p.accentColor = accentColor;
    p.voidColor = voidColor;
    p.alpha = 1.0;
    p.scale = scale;
    p.curve = (Math.random() - 0.5) * 0.3;
    _activeEffects.push(p);
  }

  // 2. Reiatsu Shockwave Distortion Ring
  const ringCount = isFinal ? 2 : 1;
  for (let r = 0; r < ringCount; r++) {
    const ring = _getParticle();
    ring.type = 'ring';
    ring.x = x;
    ring.y = y;
    ring.vx = Math.cos(hitAngle) * (3 + r * 2);
    ring.vy = Math.sin(hitAngle) * (3 + r * 2);
    ring.angle = hitAngle;
    ring.size = 6;
    ring.maxSize = (38 + r * 24) * scale;
    ring.thickness = (4.5 - r * 1.0) * scale;
    ring.life = 0;
    ring.maxLife = isFinal ? 22 : 16;
    ring.form = form;
    ring.color = primaryColor;
    ring.accentColor = accentColor;
    ring.voidColor = voidColor;
    ring.alpha = 1.0;
    _activeEffects.push(ring);
  }

  // 3. Exploding Reiatsu Needle Sparks (Needle polygons projecting forward along cut vector)
  const sparkCount = isFinal ? 14 : (isHollow || isBankai ? 10 : 8);
  for (let i = 0; i < sparkCount; i++) {
    const sp = _getParticle();
    sp.type = 'needle';
    sp.x = x + (Math.random() - 0.5) * 12;
    sp.y = y + (Math.random() - 0.5) * 12;
    const spread = hitAngle + (Math.random() - 0.5) * (Math.PI * 0.75);
    const speed = (6 + Math.random() * 10) * scale;
    sp.vx = Math.cos(spread) * speed;
    sp.vy = Math.sin(spread) * speed;
    sp.angle = spread;
    sp.length = (14 + Math.random() * 16) * scale;
    sp.thickness = (1.8 + Math.random() * 1.4) * scale;
    sp.life = 0;
    sp.maxLife = 12 + Math.floor(Math.random() * 8);
    sp.form = form;
    sp.color = (i % 3 === 0) ? accentColor : primaryColor;
    sp.accentColor = accentColor;
    sp.voidColor = voidColor;
    sp.alpha = 1.0;
    _activeEffects.push(sp);
  }

  // 4. Spiritual Pressure Reiatsu Smoke Wisps (Rising upward from wound)
  const smokeCount = isFinal ? 6 : (isBankai || isHollow ? 4 : 3);
  for (let m = 0; m < smokeCount; m++) {
    const sm = _getParticle();
    sm.type = 'smoke';
    sm.x = x + (Math.random() - 0.5) * 16;
    sm.y = y + (Math.random() - 0.5) * 16;
    sm.vx = (Math.random() - 0.5) * 1.5 + Math.cos(hitAngle) * 1.5;
    sm.vy = -1.5 - Math.random() * 2.5; // Wafts upward
    sm.size = (6 + Math.random() * 6) * scale;
    sm.maxSize = (18 + Math.random() * 12) * scale;
    sm.life = 0;
    sm.maxLife = 18 + Math.floor(Math.random() * 10);
    sm.form = form;
    sm.color = (m % 2 === 0) ? primaryColor : smokeColor;
    sm.accentColor = accentColor;
    sm.voidColor = voidColor;
    sm.alpha = 0.85;
    _activeEffects.push(sm);
  }
}

/**
 * Updates all active Getsuga Tensho impact particles.
 */
export function updateGetsugaImpactEffects() {
  for (let i = _activeEffects.length - 1; i >= 0; i--) {
    const p = _activeEffects[i];
    p.life++;

    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.92;
    p.vy *= 0.92;

    if (p.type === 'smoke') {
      p.size += (p.maxSize - p.size) * 0.09;
      p.alpha = Math.max(0, 1.0 - (p.life / p.maxLife));
    } else if (p.type === 'ring') {
      p.size += (p.maxSize - p.size) * 0.18;
      p.alpha = Math.max(0, 1.0 - (p.life / p.maxLife));
    } else if (p.type === 'slice') {
      p.alpha = Math.max(0, Math.sin((1.0 - p.life / p.maxLife) * Math.PI));
    } else if (p.type === 'needle') {
      p.alpha = Math.max(0, 1.0 - (p.life / p.maxLife));
    }

    if (p.life >= p.maxLife) {
      _activeEffects.splice(i, 1);
      _returnParticle(p);
    }
  }
}

/**
 * Renders all active Getsuga Tensho hit impact visual effects.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawGetsugaImpactEffects(ctx) {
  if (_activeEffects.length === 0) return;

  const P = 2.4; // Pixel art grid scale
  const snap = (v) => Math.round(v / P) * P;

  ctx.save();

  for (let i = 0; i < _activeEffects.length; i++) {
    const p = _activeEffects[i];
    if (p.alpha <= 0.01) continue;

    const isBankai = p.form === 'bankai' || p.form === 'bankai_hollow' || p.form === 'final_bankai';
    const isHollow = p.form === 'hollow' || p.form === 'bankai_hollow';

    // ─────────────────────────────────────────────────────────────
    // 1. SPATIAL CLEAVE SCAR (Stepped Pixel Crescent Slice)
    // ─────────────────────────────────────────────────────────────
    if (p.type === 'slice') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const halfL = p.length * 0.5;
      const maxThick = p.thickness * p.alpha;
      const steps = Math.max(10, Math.round(p.length / (P * 1.5)));

      // Pass 1: Pixel Outer Glow Shell
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.65;
      for (let s = 0; s <= steps; s++) {
        const t = (s / steps) * 2 - 1; // -1 to 1
        const xPos = snap(t * halfL);
        const curveOff = (1 - t * t) * p.curve * 8;
        const curThick = (1 - t * t) * (maxThick + P * 2);
        const topY = snap(-curThick * 0.5 + curveOff);
        const botY = snap(curThick * 0.5 + curveOff);
        ctx.fillRect(xPos, topY, P, Math.max(P, botY - topY));
      }

      // Pass 2: Stepped Core
      ctx.fillStyle = isBankai ? p.voidColor : p.accentColor;
      ctx.globalAlpha = p.alpha * 0.95;
      for (let s = 0; s <= steps; s++) {
        const t = (s / steps) * 2 - 1;
        const xPos = snap(t * halfL * 0.85);
        const curveOff = (1 - t * t) * p.curve * 8;
        const curThick = (1 - t * t) * maxThick * 0.6;
        const topY = snap(-curThick * 0.5 + curveOff);
        const botY = snap(curThick * 0.5 + curveOff);
        ctx.fillRect(xPos, topY, P, Math.max(P, botY - topY));
      }

      // Pass 3: White-Hot Center Needle Spine
      ctx.fillStyle = p.accentColor;
      ctx.globalAlpha = p.alpha * 0.98;
      for (let xPos = -halfL * 0.95; xPos <= halfL * 0.95; xPos += P) {
        ctx.fillRect(snap(xPos), snap(p.curve * 4), P, P);
      }

      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 2. EXPANDING REIATSU SHOCKWAVE RING (Stepped Pixel Ring)
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'ring') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const rX = p.size;
      const rY = p.size * 0.65;
      const ringSteps = Math.max(14, Math.round((Math.PI * 2 * rX) / (P * 2)));

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.80;
      for (let s = 0; s <= ringSteps; s++) {
        const ang = (s / ringSteps) * Math.PI * 2;
        const px = snap(Math.cos(ang) * rX);
        const py = snap(Math.sin(ang) * rY);
        ctx.fillRect(px, py, P, P);
      }

      if (p.alpha > 0.4) {
        ctx.fillStyle = p.accentColor;
        ctx.globalAlpha = p.alpha * 0.65;
        for (let s = 0; s <= ringSteps; s += 2) {
          const ang = (s / ringSteps) * Math.PI * 2;
          const px = snap(Math.cos(ang) * rX * 0.85);
          const py = snap(Math.sin(ang) * rY * 0.85);
          ctx.fillRect(px, py, P, P);
        }
      }

      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 3. EXPLODING NEEDLE SPARKS (Stepped Pixel Needle Streaks)
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'needle') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const len = p.length;
      const th = Math.max(P, p.thickness * p.alpha);
      const steps = Math.max(4, Math.round(len / P));

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.95;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const lx = snap(t * len);
        const bulge = Math.sin(t * Math.PI) * th;
        const topY = snap(-bulge * 0.5);
        const botY = snap(bulge * 0.5);
        ctx.fillRect(lx, topY, P, Math.max(P, botY - topY));
      }

      // White-Hot Leading Tip
      ctx.fillStyle = p.accentColor;
      ctx.fillRect(snap(len * 0.8), 0, P, P);

      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. RISING SPIRITUAL PRESSURE SMOKE WISPS (Stepped Pixel Clusters)
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'smoke') {
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.55;
      const smokeR = p.size;
      const gR = Math.ceil(smokeR / P);
      for (let gy = -gR; gy <= gR; gy++) {
        for (let gx = -gR; gx <= gR; gx++) {
          const dist = Math.sqrt(gx * gx + gy * gy) * P;
          if (dist <= smokeR) {
            ctx.fillStyle = (dist < smokeR * 0.5 && isBankai) ? p.voidColor : p.color;
            ctx.fillRect(snap(p.x + gx * P), snap(p.y + gy * P), P, P);
          }
        }
      }
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Resets all active Getsuga impact effects (e.g. between matches/rounds).
 */
export function clearGetsugaImpactEffects() {
  while (_activeEffects.length > 0) {
    _returnParticle(_activeEffects.pop());
  }
}
