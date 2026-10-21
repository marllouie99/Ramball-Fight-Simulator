// ─────────────────────────────────────────────────────────────────────────────
// GETSUGA TENSHO HIT IMPACT EFFECT — Bleach Anime Spatial Reiatsu Cleave System
// High-performance, zero-allocation particle pipeline for Getsuga Tensho enemy impacts.
// ─────────────────────────────────────────────────────────────────────────────

import { state } from '../../core/state.js';

const MAX_GETSUGA_PARTICLES = 280;
const _pool = [];
const _activeEffects = [];

// Initialize zero-GC particle pool
for (let i = 0; i < MAX_GETSUGA_PARTICLES; i++) {
  _pool.push({
    type: 'slice', // 'slice', 'ring', 'needle', 'smoke', 'explosion_wave'
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    length: 0,
    thickness: 0,
    size: 0,
    maxSize: 0,
    maxRadius: 0,
    delay: 0,
    life: 0,
    maxLife: 0,
    form: 'shikai', // 'shikai', 'bankai', 'hollow', 'final_bankai'
    color: '#00E5FF',
    accentColor: '#FFFFFF',
    voidColor: '#000000',
    washColor: 'rgba(0, 229, 255, 0.2)',
    alpha: 1.0,
    scale: 1.0,
    curve: 0
  });
}

function _getParticle() {
  return _pool.length > 0 ? _pool.pop() : {
    type: 'slice', x: 0, y: 0, vx: 0, vy: 0, angle: 0,
    length: 0, thickness: 0, size: 0, maxSize: 0, maxRadius: 0, delay: 0,
    life: 0, maxLife: 0, form: 'shikai',
    color: '#00E5FF', accentColor: '#FFFFFF', voidColor: '#000000',
    washColor: 'rgba(0, 229, 255, 0.2)',
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
  const isDarkMode = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode || (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))));

  let primaryColor = '#00E5FF'; // Cyan
  let accentColor = '#FFFFFF';
  let voidColor = isDarkMode ? '#0077FF' : '#001A33';
  let smokeColor = 'rgba(0, 229, 255, 0.4)';

  if (isFinal) {
    primaryColor = '#FF0A20'; // Blood Scarlet
    accentColor = '#FFFFFF';
    voidColor = isDarkMode ? '#FF4D6D' : '#050002';
    smokeColor = isDarkMode ? 'rgba(255, 60, 80, 0.65)' : 'rgba(255, 10, 30, 0.5)';
  } else if (isHollow) {
    primaryColor = '#FF2814'; // Crimson Flame
    accentColor = '#FFAA00';
    voidColor = isDarkMode ? '#FF6B4A' : '#080004';
    smokeColor = isDarkMode ? 'rgba(255, 80, 40, 0.60)' : 'rgba(255, 40, 20, 0.45)';
  } else if (isBankai) {
    primaryColor = '#FF1E28'; // Kuroi Crimson
    accentColor = '#FFE5E8';
    voidColor = isDarkMode ? '#FF4D6D' : '#080204';
    smokeColor = isDarkMode ? 'rgba(255, 50, 70, 0.60)' : 'rgba(220, 20, 30, 0.45)';
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
 * Spawns a massive Bleach anime Reiatsu detonation explosion when Getsuga Tensho expires.
 * Complies strictly with Rule 26 (Clean Concentric Shockwaves) and Rule 11 (Zero shadowBlur).
 * @param {number} x Blast center X
 * @param {number} y Blast center Y
 * @param {number} blastRadius Outer explosion radius
 * @param {string} form 'shikai', 'bankai', 'hollow', 'bankai_hollow', 'final_bankai'
 * @param {number} blastAngle Angle of incoming slash trajectory
 */
export function spawnGetsugaExplosion(x, y, blastRadius = 110, form = 'shikai', blastAngle = 0) {
  const isFinal = form === 'final_bankai';
  const isHollow = form === 'hollow' || form === 'bankai_hollow';
  const isBankai = form === 'bankai' || form === 'bankai_hollow' || isFinal;
  const isDarkMode = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode || (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))));

  let primaryColor = '#00D5FF';
  let accentColor = '#FFFFFF';
  let voidColor = isDarkMode ? '#0077FF' : '#001A33';
  let washColor = 'rgba(0, 213, 255, 0.22)';
  let smokeColor = 'rgba(0, 229, 255, 0.45)';

  if (isFinal) {
    primaryColor = '#FF0A20';
    accentColor = '#FFFFFF';
    voidColor = isDarkMode ? '#FF3B5C' : '#050002';
    washColor = 'rgba(255, 10, 32, 0.30)';
    smokeColor = isDarkMode ? 'rgba(255, 50, 70, 0.65)' : 'rgba(255, 10, 30, 0.55)';
  } else if (form === 'bankai_hollow') {
    primaryColor = '#FF1E00';
    accentColor = '#FFAA00';
    voidColor = isDarkMode ? '#FF2244' : '#060002';
    washColor = 'rgba(255, 30, 0, 0.28)';
    smokeColor = isDarkMode ? 'rgba(255, 60, 20, 0.65)' : 'rgba(255, 30, 10, 0.55)';
  } else if (isHollow) {
    primaryColor = '#FF2E00';
    accentColor = '#FFAA00';
    voidColor = isDarkMode ? '#FF5533' : '#080004';
    washColor = 'rgba(255, 46, 0, 0.26)';
    smokeColor = isDarkMode ? 'rgba(255, 70, 30, 0.60)' : 'rgba(255, 40, 10, 0.50)';
  } else if (isBankai) {
    primaryColor = '#DC143C';
    accentColor = '#FFFFFF';
    voidColor = isDarkMode ? '#FF3355' : '#080103';
    washColor = 'rgba(220, 20, 60, 0.26)';
    smokeColor = isDarkMode ? 'rgba(255, 40, 60, 0.60)' : 'rgba(220, 20, 30, 0.50)';
  }

  const scale = isFinal ? 1.5 : (isHollow ? 1.25 : (isBankai ? 1.15 : 1.0));
  const effectiveRadius = blastRadius * scale;

  // 1. Concentric Shockwave Discs (Rule 26: Staggered Water-Ripple Wavefronts)
  const waveConfigs = [
    { delay: 0, rMult: 0.70, maxLife: 18 },
    { delay: 3, rMult: 1.05, maxLife: 22 },
    { delay: 6, rMult: 1.40, maxLife: 26 }
  ];

  for (let w = 0; w < waveConfigs.length; w++) {
    const wc = waveConfigs[w];
    const wave = _getParticle();
    wave.type = 'explosion_wave';
    wave.x = x;
    wave.y = y;
    wave.vx = 0;
    wave.vy = 0;
    wave.delay = wc.delay;
    wave.size = 0;
    wave.maxRadius = effectiveRadius * wc.rMult;
    wave.life = 0;
    wave.maxLife = wc.maxLife;
    wave.form = form;
    wave.color = primaryColor;
    wave.accentColor = accentColor;
    wave.voidColor = voidColor;
    wave.washColor = washColor;
    wave.alpha = 1.0;
    _activeEffects.push(wave);
  }

  // 2. Spatial Cross-Cleave Shatter Blades (Reiatsu razor shards)
  const sliceAngles = [
    blastAngle - 1.10,
    blastAngle - 0.55,
    blastAngle,
    blastAngle + 0.55,
    blastAngle + 1.10
  ];
  for (let s = 0; s < sliceAngles.length; s++) {
    const sl = _getParticle();
    sl.type = 'slice';
    sl.x = x + (Math.random() - 0.5) * 10;
    sl.y = y + (Math.random() - 0.5) * 10;
    const ang = sliceAngles[s] + (Math.random() - 0.5) * 0.18;
    const spd = (5.5 + s * 1.2) * scale;
    sl.vx = Math.cos(ang) * spd;
    sl.vy = Math.sin(ang) * spd;
    sl.angle = ang + Math.PI / 2;
    sl.length = (55 + s * 14) * scale;
    sl.thickness = (11 + s * 3.5) * scale;
    sl.life = 0;
    sl.maxLife = 18 + s * 2;
    sl.form = form;
    sl.color = primaryColor;
    sl.accentColor = accentColor;
    sl.voidColor = voidColor;
    sl.alpha = 1.0;
    sl.scale = scale;
    sl.curve = (Math.random() - 0.5) * 0.25;
    _activeEffects.push(sl);
  }

  // 3. Exploding Reiatsu Needle Sparks (360-degree omnidirectional needle emission)
  const needleCount = isFinal ? 26 : (isHollow || isBankai ? 20 : 16);
  for (let i = 0; i < needleCount; i++) {
    const sp = _getParticle();
    sp.type = 'needle';
    sp.x = x + (Math.random() - 0.5) * 14;
    sp.y = y + (Math.random() - 0.5) * 14;
    const ang = (i / needleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const speed = (6.0 + Math.random() * 11.0) * scale;
    sp.vx = Math.cos(ang) * speed;
    sp.vy = Math.sin(ang) * speed;
    sp.angle = ang;
    sp.length = (16 + Math.random() * 18) * scale;
    sp.thickness = (2.0 + Math.random() * 1.6) * scale;
    sp.life = 0;
    sp.maxLife = 14 + Math.floor(Math.random() * 10);
    sp.form = form;
    sp.color = (i % 3 === 0) ? accentColor : primaryColor;
    sp.accentColor = accentColor;
    sp.voidColor = voidColor;
    sp.alpha = 1.0;
    _activeEffects.push(sp);
  }

  // 4. Spiritual Pressure Smoke / Miasma Wisps (Billowing upward from crater)
  const smokeCount = isFinal ? 8 : (isBankai || isHollow ? 6 : 5);
  for (let m = 0; m < smokeCount; m++) {
    const sm = _getParticle();
    sm.type = 'smoke';
    sm.x = x + (Math.random() - 0.5) * (effectiveRadius * 0.5);
    sm.y = y + (Math.random() - 0.5) * (effectiveRadius * 0.5);
    const ang = Math.random() * Math.PI * 2;
    const distSpeed = 1.2 + Math.random() * 2.8;
    sm.vx = Math.cos(ang) * distSpeed;
    sm.vy = -2.0 - Math.random() * 3.2; // Wafts upward
    sm.size = (8 + Math.random() * 10) * scale;
    sm.maxSize = (24 + Math.random() * 18) * scale;
    sm.life = 0;
    sm.maxLife = 22 + Math.floor(Math.random() * 12);
    sm.form = form;
    sm.color = (m % 2 === 0) ? primaryColor : smokeColor;
    sm.accentColor = accentColor;
    sm.voidColor = voidColor;
    sm.alpha = 0.90;
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
    } else if (p.type === 'explosion_wave') {
      if (p.life >= p.delay) {
        const activeFrames = p.life - p.delay;
        const totalFrames = p.maxLife - p.delay;
        const lp = Math.min(1.0, Math.max(0.0, activeFrames / totalFrames));
        p.size = p.maxRadius * Math.pow(lp, 0.45);
        const popIn = lp < 0.10 ? (lp / 0.10) : 1.0;
        const fadeOut = Math.pow(1.0 - lp, 1.25);
        p.alpha = popIn * fadeOut;
      } else {
        p.alpha = 0;
        p.size = 0;
      }
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
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < _activeEffects.length; i++) {
    const p = _activeEffects[i];
    if (p.alpha <= 0.01) continue;

    const isBankai = p.form === 'bankai' || p.form === 'bankai_hollow' || p.form === 'final_bankai';
    const isHollow = p.form === 'hollow' || p.form === 'bankai_hollow';

    // ─────────────────────────────────────────────────────────────
    // 0. CLEAN CONCENTRIC DETONATION SHOCKWAVES (Rule 26 Compliant)
    // ─────────────────────────────────────────────────────────────
    if (p.type === 'explosion_wave') {
      if (p.life < p.delay || p.alpha <= 0.01 || p.size <= 1) continue;

      ctx.save();

      const curR = p.size;
      const washAlpha = p.alpha * 0.35;

      // 1. Expanding Translucent Wash Disc
      ctx.fillStyle = p.washColor || 'rgba(0, 213, 255, 0.2)';
      ctx.globalAlpha = washAlpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, curR, 0, Math.PI * 2);
      ctx.fill();

      // 2. Void Accent Energy Ring (Bankai / Hollow dark aura rim & Shikai deep navy rim)
      if (p.voidColor) {
        ctx.strokeStyle = p.voidColor;
        ctx.lineWidth = Math.max(2, (p.form === 'shikai' ? 2.5 : 4.0) * p.alpha);
        ctx.globalAlpha = p.alpha * (p.form === 'shikai' ? 0.50 : 0.70);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, curR - 3), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Primary Theme Compression Band
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(2, 3.5 * p.alpha);
      ctx.globalAlpha = p.alpha * 0.90;
      ctx.beginPath();
      ctx.arc(p.x, p.y, curR, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Supersonic White Leading Inner Rim
      ctx.strokeStyle = p.accentColor || '#FFFFFF';
      ctx.lineWidth = Math.max(1.5, 2.0 * p.alpha);
      ctx.globalAlpha = p.alpha * 0.95;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, curR - 1.5), 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      continue;
    }

    // ─────────────────────────────────────────────────────────────
    // 1. SPATIAL CLEAVE SHARDS (High-Performance 3-Layer Polygon Cleave)
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'slice') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const halfL = p.length * 0.5;
      const maxThick = p.thickness * p.alpha;
      const curve = p.curve || 0;
      const STEPS = 8;

      // Layer 1: Outer energetic shell polygon
      ctx.globalAlpha = p.alpha * 0.95;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-halfL, 0);
      for (let s = 1; s < STEPS; s++) {
        const u = -1 + (2 * s) / STEPS;
        const taper = 1 - u * u;
        const curveOff = taper * curve * 8;
        const topY = -taper * maxThick * 0.5 + curveOff;
        ctx.lineTo(u * halfL, topY);
      }
      ctx.lineTo(halfL, 0);
      for (let s = STEPS - 1; s >= 1; s--) {
        const u = -1 + (2 * s) / STEPS;
        const taper = 1 - u * u;
        const curveOff = taper * curve * 8;
        const botY = taper * maxThick * 0.5 + curveOff;
        ctx.lineTo(u * halfL, botY);
      }
      ctx.closePath();
      ctx.fill();

      // Layer 2: Void / dark core for Bankai / Hollow forms
      if (isBankai || isHollow) {
        ctx.fillStyle = p.voidColor;
        ctx.beginPath();
        ctx.moveTo(-halfL * 0.88, 0);
        for (let s = 1; s < STEPS; s++) {
          const u = -1 + (2 * s) / STEPS;
          const taper = 1 - u * u;
          const curveOff = taper * curve * 8;
          const topY = -taper * maxThick * 0.32 + curveOff;
          ctx.lineTo(u * halfL * 0.88, topY);
        }
        ctx.lineTo(halfL * 0.88, 0);
        for (let s = STEPS - 1; s >= 1; s--) {
          const u = -1 + (2 * s) / STEPS;
          const taper = 1 - u * u;
          const curveOff = taper * curve * 8;
          const botY = taper * maxThick * 0.32 + curveOff;
          ctx.lineTo(u * halfL * 0.88, botY);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Layer 3: White-hot core spine line
      ctx.strokeStyle = p.accentColor;
      ctx.lineWidth = Math.max(1.5, 2.2 * p.alpha);
      ctx.beginPath();
      ctx.moveTo(-halfL * 0.78, 0);
      for (let s = 1; s < STEPS; s++) {
        const u = -1 + (2 * s) / STEPS;
        const taper = 1 - u * u;
        const curveOff = taper * curve * 8;
        ctx.lineTo(u * halfL * 0.78, curveOff);
      }
      ctx.lineTo(halfL * 0.78, 0);
      ctx.stroke();

      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 2. EXPANDING REIATSU SHOCKWAVE RING (High-Performance Ellipse Ring)
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'ring') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const rX = p.size;
      const rY = p.size * 0.65;

      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(2, (p.thickness || 3.5) * p.alpha);
      ctx.globalAlpha = p.alpha * 0.80;
      ctx.beginPath();
      ctx.ellipse(0, 0, rX, rY, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (p.alpha > 0.4 && p.accentColor) {
        ctx.strokeStyle = p.accentColor;
        ctx.lineWidth = Math.max(1.5, ((p.thickness || 3.5) * 0.55) * p.alpha);
        ctx.globalAlpha = p.alpha * 0.65;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, rX * 0.85), Math.max(1, rY * 0.85), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 3. EXPLODING NEEDLE SPARKS (Rule 16 Manga Action Needle Polygons)
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'needle') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const len = p.length;
      const halfTh = Math.max(1.0, (p.thickness * p.alpha) * 0.5);
      const midX = len * 0.42;

      ctx.globalAlpha = p.alpha * 0.95;

      // 4-point filled needle polygon (Rule 16 standard)
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, 0); // sharp trailing tail
      ctx.lineTo(midX, -halfTh); // top shoulder
      ctx.lineTo(len, 0); // sharp leading tip
      ctx.lineTo(midX, halfTh); // bottom shoulder
      ctx.closePath();
      ctx.fill();

      // White-hot inner core needle
      if (p.accentColor) {
        ctx.fillStyle = p.accentColor;
        ctx.beginPath();
        ctx.moveTo(len * 0.25, 0);
        ctx.lineTo(len * 0.60, -halfTh * 0.45);
        ctx.lineTo(len * 0.95, 0);
        ctx.lineTo(len * 0.60, halfTh * 0.45);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. RISING SPIRITUAL PRESSURE SMOKE WISPS (Layered Reiatsu Cloud Puffs)
    // ─────────────────────────────────────────────────────────────
    else if (p.type === 'smoke') {
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.55;
      const smokeR = p.size;

      // Outer billowing spiritual pressure cloud disc
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, smokeR, 0, Math.PI * 2);
      ctx.fill();

      // Organic puff volume (subtle satellite lobes for anime cloud texture)
      ctx.beginPath();
      ctx.arc(p.x - smokeR * 0.28, p.y - smokeR * 0.20, smokeR * 0.70, 0, Math.PI * 2);
      ctx.arc(p.x + smokeR * 0.25, p.y - smokeR * 0.15, smokeR * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Dense void/shadow center for Bankai or Hollow
      if (isBankai || isHollow) {
        ctx.fillStyle = p.voidColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, smokeR * 0.50, 0, Math.PI * 2);
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
