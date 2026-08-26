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

  ctx.save();

  for (let i = 0; i < _activeEffects.length; i++) {
    const p = _activeEffects[i];
    if (p.alpha <= 0.01) continue;

    const isBankai = p.form === 'bankai' || p.form === 'bankai_hollow' || p.form === 'final_bankai';
    const isHollow = p.form === 'hollow' || p.form === 'bankai_hollow';

    // ─────────────────────────────────────────────────────────────
    // 1. SPATIAL CLEAVE SCAR (Double-tapered crescent slice)
    // ─────────────────────────────────────────────────────────────
    if (p.type === 'slice') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const halfL = p.length * 0.5;
      const maxThick = p.thickness * p.alpha;

      // Outer Reiatsu Glow Bloom
      ctx.beginPath();
      ctx.moveTo(-halfL, 0);
      ctx.quadraticCurveTo(0, -maxThick * 1.5 + p.curve * 10, halfL, 0);
      ctx.quadraticCurveTo(0, maxThick * 1.5 + p.curve * 10, -halfL, 0);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.55;
      ctx.fill();

      // Pitch-Black Kuroi Void Core (or Pure White core for Shikai)
      ctx.beginPath();
      ctx.moveTo(-halfL * 0.9, 0);
      ctx.quadraticCurveTo(0, -maxThick * 0.85 + p.curve * 8, halfL * 0.9, 0);
      ctx.quadraticCurveTo(0, maxThick * 0.85 + p.curve * 8, -halfL * 0.9, 0);
      ctx.closePath();
      ctx.fillStyle = isBankai ? p.voidColor : p.accentColor;
      ctx.globalAlpha = p.alpha * 0.95;
      ctx.fill();

      // Sharp Cutting Edge Center Needle
      ctx.beginPath();
      ctx.moveTo(-halfL * 1.05, 0);
      ctx.lineTo(halfL * 1.05, 0);
      ctx.strokeStyle = p.accentColor;
      ctx.lineWidth = isBankai ? 2.2 : 1.8;
      ctx.globalAlpha = p.alpha * 0.98;
      ctx.stroke();

      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 2. EXPANDING REIATSU SHOCKWAVE RING
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'ring') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.beginPath();
      // Elliptical shockwave elongated along the wave cutting axis
      ctx.ellipse(0, 0, p.size, p.size * 0.65, 0, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.0, p.thickness * p.alpha);
      ctx.globalAlpha = p.alpha * 0.80;
      ctx.stroke();

      // Inner white-hot shockwave trim
      if (p.alpha > 0.4) {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.85, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.strokeStyle = p.accentColor;
        ctx.lineWidth = 1.0;
        ctx.globalAlpha = p.alpha * 0.65;
        ctx.stroke();
      }
      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 3. EXPLODING NEEDLE SPARKS (4-point filled needle polygons)
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'needle') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const len = p.length;
      const th = p.thickness * p.alpha;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len * 0.35, -th);
      ctx.lineTo(len, 0);
      ctx.lineTo(len * 0.35, th);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.95;
      ctx.fill();

      // White-hot needle core
      ctx.beginPath();
      ctx.moveTo(len * 0.1, 0);
      ctx.lineTo(len * 0.4, -th * 0.4);
      ctx.lineTo(len * 0.85, 0);
      ctx.lineTo(len * 0.4, th * 0.4);
      ctx.closePath();
      ctx.fillStyle = p.accentColor;
      ctx.globalAlpha = p.alpha * 0.80;
      ctx.fill();

      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. RISING SPIRITUAL PRESSURE SMOKE WISPS
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'smoke') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * 0.45;
      ctx.fill();

      if (isBankai) {
        // Dark inner smoke nucleus
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = p.voidColor;
        ctx.globalAlpha = p.alpha * 0.65;
        ctx.fill();
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
