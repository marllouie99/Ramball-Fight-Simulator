import { state } from '../../core/state.js';

// bomberWeaponGraphics.js
//  - Use this file for bomber-specific weapon graphics and explosion rendering.
//  - Keep gameplay and tuning values in js/config.js; only visual/graphical details belong here.
//  - If you want to change bomber explosion visuals, edit the palette, effect sections,
//    or the drawBomberExplosionGraphic() function below.

// ─────────────────────────────────────────────
// PROCEDURAL TEXTURE SYSTEM
// ─────────────────────────────────────────────
// Generates noise textures and patterns for realistic explosion effects.

let _noiseCanvas = null;
let _noiseCtx = null;
let _noiseCache = new Map();

function getNoiseCanvas() {
  if (!_noiseCanvas) {
    _noiseCanvas = document.createElement('canvas');
    _noiseCanvas.width = 128;
    _noiseCanvas.height = 128;
    _noiseCtx = _noiseCanvas.getContext('2d');
  }
  return { canvas: _noiseCanvas, ctx: _noiseCtx };
}

function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function noise2D(x, y, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x, y, octaves = 4, seed = 0) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency, seed + i * 100);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

function generateNoiseTexture(size, seed, contrast = 1) {
  const key = `${size}-${seed}-${contrast}`;
  if (_noiseCache.has(key)) return _noiseCache.get(key);

  const { canvas, ctx } = getNoiseCanvas();
  canvas.width = size;
  canvas.height = size;
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = px / size;
      const ny = py / size;
      const n = fbm(nx * 4, ny * 4, 5, seed);
      const v = Math.pow(n, contrast) * 255;
      const idx = (py * size + px) * 4;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  _noiseCache.set(key, canvas);
  return canvas;
}

function generateFireTexture(size, seed, palette) {
  const key = `fire-${size}-${seed}`;
  if (_noiseCache.has(key)) return _noiseCache.get(key);

  const { canvas, ctx } = getNoiseCanvas();
  canvas.width = size;
  canvas.height = size;
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  const [br, bg, bb] = palette.bright;
  const [mr, mg, mb] = palette.mid;
  const [dr, dg, db] = palette.dark;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = px / size - 0.5;
      const ny = py / size - 0.5;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const angle = Math.atan2(ny, nx);

      const turbulence = fbm(nx * 6 + seed, ny * 6, 4, seed);
      const flicker = fbm(nx * 8 + seed * 2, ny * 8 + Date.now() * 0.001, 3, seed + 50);

      const intensity = Math.max(0, 1 - dist * 2.2);
      const fireIntensity = intensity * (0.5 + turbulence * 0.5) * (0.7 + flicker * 0.3);

      let r, g, b, a;
      if (fireIntensity > 0.7) {
        const t = (fireIntensity - 0.7) / 0.3;
        r = br * t + mr * (1 - t);
        g = bg * t + mg * (1 - t);
        b = bb * t + mb * (1 - t);
        a = 255;
      } else if (fireIntensity > 0.3) {
        const t = (fireIntensity - 0.3) / 0.4;
        r = mr * t + dr * (1 - t);
        g = mg * t + dg * (1 - t);
        b = mb * t + db * (1 - t);
        a = 220;
      } else if (fireIntensity > 0) {
        const t = fireIntensity / 0.3;
        r = dr * t;
        g = dg * t;
        b = db * t;
        a = 150 * t;
      } else {
        r = g = b = a = 0;
      }

      const idx = (py * size + px) * 4;
      data[idx] = Math.min(255, r);
      data[idx + 1] = Math.min(255, g);
      data[idx + 2] = Math.min(255, b);
      data[idx + 3] = Math.min(255, a);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  _noiseCache.set(key, canvas);
  return canvas;
}

function generateSmokeTexture(size, seed) {
  const key = `smoke-${size}-${seed}`;
  if (_noiseCache.has(key)) return _noiseCache.get(key);

  const { canvas, ctx } = getNoiseCanvas();
  canvas.width = size;
  canvas.height = size;
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = px / size - 0.5;
      const ny = py / size - 0.5;
      const dist = Math.sqrt(nx * nx + ny * ny);

      const cloud = fbm(nx * 3 + seed, ny * 3, 5, seed);
      const wisp = fbm(nx * 8 + seed * 1.5, ny * 8, 3, seed + 200);

      const edge = Math.max(0, 1 - dist * 2.5);
      const density = edge * (0.4 + cloud * 0.4 + wisp * 0.2);
      const alpha = Math.min(255, density * 255);

      const idx = (py * size + px) * 4;
      data[idx] = 70 + cloud * 30;
      data[idx + 1] = 65 + cloud * 25;
      data[idx + 2] = 60 + cloud * 20;
      data[idx + 3] = alpha;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  _noiseCache.set(key, canvas);
  return canvas;
}

function generatePoisonBubbleTexture(size, seed) {
  const key = `poison-${size}-${seed}`;
  if (_noiseCache.has(key)) return _noiseCache.get(key);

  const { canvas, ctx } = getNoiseCanvas();
  canvas.width = size;
  canvas.height = size;
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = px / size - 0.5;
      const ny = py / size - 0.5;
      const dist = Math.sqrt(nx * nx + ny * ny);

      const bubble = fbm(nx * 5 + seed, ny * 5, 4, seed);
      const shimmer = fbm(nx * 10 + seed, ny * 10, 2, seed + 300);

      const edge = Math.max(0, 1 - dist * 2.2);
      const intensity = edge * (0.5 + bubble * 0.5);
      const alpha = Math.min(255, intensity * 255);

      const bright = shimmer * 0.3 + 0.7;
      const idx = (py * size + px) * 4;
      data[idx] = Math.floor(26 * bright * intensity + 50);
      data[idx + 1] = Math.floor(200 * bright * intensity + 100);
      data[idx + 2] = Math.floor(26 * bright * intensity + 50);
      data[idx + 3] = alpha;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  _noiseCache.set(key, canvas);
  return canvas;
}

function generateCrackTexture(size, seed) {
  const key = `crack-${size}-${seed}`;
  if (_noiseCache.has(key)) return _noiseCache.get(key);

  const { canvas, ctx } = getNoiseCanvas();
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 2;

  const cx = size / 2;
  const cy = size / 2;

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + seededRand(seed + i) * 0.5;
    const len = size * 0.3 + seededRand(seed + i + 100) * size * 0.2;
    let x = cx;
    let y = cy;

    ctx.beginPath();
    ctx.moveTo(x, y);

    const segments = 5 + Math.floor(seededRand(seed + i + 200) * 4);
    for (let s = 0; s < segments; s++) {
      const progress = (s + 1) / segments;
      const wobble = (seededRand(seed + i * 100 + s) - 0.5) * 0.4;
      x = cx + Math.cos(angle + wobble) * len * progress;
      y = cy + Math.sin(angle + wobble) * len * progress;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _noiseCache.set(key, canvas);
  return canvas;
}

function generateDebrisTexture(size, seed) {
  const key = `debris-${size}-${seed}`;
  if (_noiseCache.has(key)) return _noiseCache.get(key);

  const { canvas, ctx } = getNoiseCanvas();
  canvas.width = size;
  canvas.height = size;
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = px / size - 0.5;
      const ny = py / size - 0.5;
      const dist = Math.sqrt(nx * nx + ny * ny);

      const rock = fbm(nx * 6 + seed, ny * 6, 4, seed);
      const edge = Math.max(0, 1 - dist * 2.8);
      const intensity = edge * (0.6 + rock * 0.4);
      const alpha = Math.min(255, intensity * 255);

      const idx = (py * size + px) * 4;
      data[idx] = Math.floor(50 + rock * 40);
      data[idx + 1] = Math.floor(35 + rock * 25);
      data[idx + 2] = Math.floor(15 + rock * 15);
      data[idx + 3] = alpha;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  _noiseCache.set(key, canvas);
  return canvas;
}

function drawTexturedCircle(ctx, x, y, radius, texture, alpha = 1, rotation = 0) {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(texture, -radius, -radius, radius * 2, radius * 2);
  ctx.rotate(-rotation);
  ctx.translate(-x, -y);
  ctx.globalAlpha = prevAlpha;
}

function drawTexturedRing(ctx, x, y, innerR, outerR, texture, alpha = 1) {
  // NOTE: clip() requires save/restore - cannot be optimized
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, outerR, 0, Math.PI * 2);
  ctx.arc(x, y, innerR, 0, Math.PI * 2, true);
  ctx.clip();
  ctx.drawImage(texture, x - outerR, y - outerR, outerR * 2, outerR * 2);
  ctx.restore();
}

function drawTexturedEllipse(ctx, x, y, rx, ry, texture, alpha = 1, rotation = 0) {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1, ry / rx);
  ctx.drawImage(texture, -rx, -rx, rx * 2, rx * 2);
  ctx.scale(1, rx / ry);
  ctx.rotate(-rotation);
  ctx.translate(-x, -y);
  ctx.globalAlpha = prevAlpha;
}

function drawCrackOverlay(ctx, x, y, radius, seed, alpha = 1) {
  const crackTex = generateCrackTexture(radius * 2, seed);
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(crackTex, x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = prevAlpha;
}

function drawSparkLines(ctx, x, y, radius, count, alpha, color) {
  const prevAlpha = ctx.globalAlpha;
  const prevStroke = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;
  const prevLineCap = ctx.lineCap;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  // OPTIMIZED: Removed shadowBlur (expensive operation)

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + seededRand(i * 17) * 0.3;
    const len = radius * (0.6 + seededRand(i * 23) * 0.8);
    const wobble = (seededRand(i * 31) - 0.5) * 0.2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + Math.cos(angle + wobble) * len,
      y + Math.sin(angle + wobble) * len
    );
    ctx.stroke();
  }

  ctx.lineCap = prevLineCap;
  ctx.lineWidth = prevLineWidth;
  ctx.strokeStyle = prevStroke;
  ctx.globalAlpha = prevAlpha;
}

function drawBubbleParticles(ctx, x, y, radius, count, alpha, seed) {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;

  for (let i = 0; i < count; i++) {
    const angle = seededRand(seed + i * 13) * Math.PI * 2;
    const dist = seededRand(seed + i * 17) * radius;
    const bx = x + Math.cos(angle) * dist;
    const by = y + Math.sin(angle) * dist;
    const br = 2 + seededRand(seed + i * 19) * 4;

    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(150, 255, 150, ${0.6 + seededRand(seed + i) * 0.4})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + seededRand(seed + i + 50) * 0.3})`;
    ctx.fill();
  }
  ctx.globalAlpha = prevAlpha;
}

function drawEmberParticles(ctx, x, y, radius, count, alpha, seed, color) {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;

  for (let i = 0; i < count; i++) {
    const angle = seededRand(seed + i * 11) * Math.PI * 2;
    const dist = seededRand(seed + i * 13) * radius;
    const ex = x + Math.cos(angle) * dist;
    const ey = y + Math.sin(angle) * dist;
    const er = 1 + seededRand(seed + i * 17) * 3;

    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fillStyle = color;
    // OPTIMIZED: Removed shadowBlur (expensive operation)
    ctx.fill();
  }
  ctx.globalAlpha = prevAlpha;
}

function drawSwirlTexture(ctx, x, y, radius, alpha, seed, color1, color2) {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;

  const arms = 6;
  for (let i = 0; i < arms; i++) {
    const angle = (i / arms) * Math.PI * 2;
    const swirl = fbm(Math.cos(angle) * 2 + seed, Math.sin(angle) * 2, 3, seed);

    ctx.beginPath();
    ctx.moveTo(x, y);
    const len = radius * (0.5 + swirl * 0.5);
    const cx = x + Math.cos(angle + 0.5) * len * 0.6;
    const cy = y + Math.sin(angle + 0.5) * len * 0.6;
    ctx.quadraticCurveTo(cx, cy, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.strokeStyle = color1;
    ctx.lineWidth = 3 + swirl * 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.globalAlpha = prevAlpha;
}

function drawHeatDistortion(ctx, x, y, radius, alpha) {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * 0.15;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
  grad.addColorStop(0, 'rgba(255, 200, 100, 0.3)');
  grad.addColorStop(0.5, 'rgba(255, 150, 50, 0.1)');
  grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = prevAlpha;
}

function drawScorchDetail(ctx, x, y, radius, alpha, seed) {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;

  const charGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  charGrad.addColorStop(0, 'rgba(5, 2, 0, 0.9)');
  charGrad.addColorStop(0.4, 'rgba(15, 5, 0, 0.7)');
  charGrad.addColorStop(0.7, 'rgba(30, 10, 2, 0.4)');
  charGrad.addColorStop(1, 'rgba(40, 15, 5, 0)');

  ctx.fillStyle = charGrad;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  const ashGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.5);
  ashGrad.addColorStop(0, 'rgba(20, 10, 5, 0.6)');
  ashGrad.addColorStop(1, 'rgba(30, 15, 5, 0)');
  ctx.fillStyle = ashGrad;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 0.5, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = prevAlpha;
}

export const BOMBER_WEAPON_GRAPHICS = {
  grenade: {
    bodyColor: '#3d5c3d',        // Military olive green
    bodyHighlight: '#5a7a52',     // Lighter green highlight
    bodyShadow: '#2a3d2a',        // Darker green shadow
    bandColor: '#1a1a1a',         // Black bands
    bandHighlight: '#333333',     // Band highlight
    fuseColor: '#8b7355',         // Brown fuse
    pinColor: '#c0c0c0',          // Silver pin
    warningColor: '#ff6600',      // Orange warning stripes
    sparkCore: '#ffffff',         // White spark core
    sparkGlow: '#ffaa00',         // Orange spark glow
    trailColor: 'rgba(100, 180, 100, 0.5)', // Green trail
  },
  screenShake: {
    enabled: true,
    grenadeIntensity: 5,
    stickyIntensity: 6,
    c4Intensity: 12,
    deathC4Intensity: 15,
    clusterIntensity: 8,
    duration: 12,
    frequency: 0.8,
  },
  dynamicLighting: {
    enabled: true,
    grenadeLightRadius: 100,
    stickyLightRadius: 120,
    c4LightRadius: 180,
    deathC4LightRadius: 220,
    clusterLightRadius: 150,
    lightDuration: 20,
    lightColor: '#FF8800',
    lightIntensity: 0.6,
  },
  blastIndicator: {
    enabled: true,
    grenadeAlpha: 0.15,
    stickyAlpha: 0.20,
    c4Alpha: 0.25,
    pulseSpeed: 0.1,
    ringCount: 2,
    ringSpacing: 0.3,
  },
};

export function drawBomberExplosionGraphic(p) {
  // drawBomberExplosionGraphic is the single entry point for bomber explosion rendering.
  // Edit this function to change how bomber explosions look on screen.
  const ctx = state.ctx;
  const x = p.x;
  const y = p.y;
  const now = Date.now();
  const lifeRatio = Math.max(0, Math.min(1, p.life / (p.maxLife || 1)));
  const fadeAlpha = lifeRatio;
  const type = p.explosionType || 'grenade';

  // Explosion color palette by type. Adjust these values to change the blast tint.
  const typePalette = {
    grenade: { bright: '255,230,180', mid: '255,130,40', dark: '200,55,25' },
    sticky: { bright: '255,240,190', mid: '255,140,45', dark: '220,85,35' },
    c4: { bright: '255,245,205', mid: '255,120,35', dark: '190,40,20' },
    deathC4: { bright: '255,250,220', mid: '255,110,30', dark: '160,20,10' },
    cluster: { bright: '255,225,150', mid: '255,150,50', dark: '210,90,30' },
    poison: { bright: '255,255,255', mid: '77,255,77', dark: '26,139,26' },
  };
  const palette = typePalette[type] || typePalette.grenade;

  // Effect sections below control the different explosion layers. Pick one and edit its rendering logic.

  // FLASH: fast bright burst when the explosion begins.
  if (p.isExplosionFlash) {
    const prevAlpha = ctx.globalAlpha;
    const radius = p.r * (1 + (1 - lifeRatio) * 0.4);
    const alpha = fadeAlpha;
    const isPoison = p.explosionType === 'poison';

    // Inner bright core - solid circle
    ctx.globalAlpha = 0.9 * alpha;
    ctx.fillStyle = isPoison ? '#ccffcc' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Mid glow - solid circle
    ctx.globalAlpha = 0.5 * alpha;
    ctx.fillStyle = isPoison ? '#66ff66' : '#ffe8c0';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Outer soft glow - solid circle
    ctx.globalAlpha = 0.25 * alpha;
    ctx.fillStyle = isPoison ? 'rgb(77,255,77)' : `rgb(${palette.bright})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = prevAlpha;
    return;
  }

  // FIREBALL: glowing core and heat glow effect.
  if (p.isExplosionFireball) {
    // Removed globalCompositeOperation='lighter' for performance — use alpha blending instead
    const ballRadius = p.r * (0.75 + (1 - lifeRatio) * 0.5);
    const alpha = fadeAlpha;
    const isPoison = p.explosionType === 'poison';

    // Outer glow - solid circle
    ctx.globalAlpha = 0.4 * alpha;
    ctx.fillStyle = isPoison ? 'rgb(26,139,26)' : `rgb(${palette.dark})`;
    ctx.beginPath();
    ctx.arc(x, y, ballRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Mid layer - solid circle
    ctx.globalAlpha = 0.6 * alpha;
    ctx.fillStyle = isPoison ? 'rgb(61,220,61)' : `rgb(${palette.mid})`;
    ctx.beginPath();
    ctx.arc(x, y, ballRadius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core - solid circle
    ctx.globalAlpha = 0.85 * alpha;
    ctx.fillStyle = isPoison ? 'rgb(144,238,144)' : `rgb(${palette.bright})`;
    ctx.beginPath();
    ctx.arc(x, y, ballRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // White hot center
    ctx.globalAlpha = 0.7 * alpha;
    ctx.fillStyle = isPoison ? '#e8ffe8' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, ballRadius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    return;
  }

  // SHOCKWAVE: expanding ring line that pulses outward.
  if (p.isExplosionShockwave) {
    const prevStroke = ctx.strokeStyle;
    const prevLineWidth = ctx.lineWidth;
    const ringRadius = p.r * (1 + (1 - lifeRatio) * 0.7);
    const ringAlpha = Math.max(0, fadeAlpha * 0.9 * (1 - Math.abs(0.5 - lifeRatio) * 1.8));
    const isPoison = p.explosionType === 'poison';
    ctx.strokeStyle = isPoison
      ? `rgba(100,255,100,${ringAlpha})`
      : `rgba(255,235,170,${ringAlpha})`;
    ctx.lineWidth = 6 + 8 * ringAlpha;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = prevLineWidth;
    ctx.strokeStyle = prevStroke;
    return;
  }

  // SMOKE: fading smoke cloud around the explosion.
  if (p.isExplosionSmoke) {
    const prevAlpha = ctx.globalAlpha;
    const smokeRadius = p.r + (p.maxRadius - p.r) * (1 - lifeRatio);
    const alpha = fadeAlpha * 0.2;
    const isPoison = p.explosionType === 'poison';

    // Outer smoke - solid circle
    ctx.globalAlpha = alpha;
    ctx.fillStyle = isPoison ? '#1a5c1a' : '#404040';
    ctx.beginPath();
    ctx.arc(x, y, smokeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner smoke - solid circle
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = isPoison ? '#3dba3d' : '#707070';
    ctx.beginPath();
    ctx.arc(x, y, smokeRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = prevAlpha;
    return;
  }

  // SCORCH: ground scorch mark that appears on impact.
  if (p.isExplosionScorch) {
    const prevAlpha = ctx.globalAlpha;
    const scorchRadius = p.r;
    const alpha = 0.25 * fadeAlpha;

    // Scorch mark - solid ellipse
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath();
    ctx.ellipse(x, y, scorchRadius, scorchRadius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = prevAlpha;
    return;
  }

  // EMBER: glowing ember particle ring inside the explosion.
  if (p.isExplosionEmber) {
    const prevFill = ctx.fillStyle;
    const emberAlpha = Math.max(0, fadeAlpha * 0.9);
    const isPoison = p.explosionType === 'poison';
    if (isPoison) {
      // Poison bubbles — bright green with glow
      // OPTIMIZED: Removed shadowBlur (expensive operation)
      ctx.fillStyle = `rgba(144,238,144,${emberAlpha})`;
    } else {
      // Fire embers — orange glow
      const emberHue = 30 + Math.floor(lifeRatio * 20);
      ctx.fillStyle = `rgba(255,${emberHue + 130},70,${emberAlpha})`;
    }
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = prevFill;
    return;
  }

  // SPARK: electrical or bright spark lines around the blast.
  if (p.isExplosionSpark) {
    const prevFill = ctx.fillStyle;
    const prevStroke = ctx.strokeStyle;
    const prevLineWidth = ctx.lineWidth;
    const sparkAlpha = fadeAlpha * 0.85;
    ctx.fillStyle = `rgba(255, 255, 150, ${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(x, y, p.r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 225, 110, ${sparkAlpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - p.r, y);
    ctx.lineTo(x + p.r, y);
    ctx.moveTo(x, y - p.r);
    ctx.lineTo(x, y + p.r);
    ctx.stroke();
    ctx.lineWidth = prevLineWidth;
    ctx.strokeStyle = prevStroke;
    ctx.fillStyle = prevFill;
    return;
  }

  // DEBRIS: chunked debris pieces that fly out from the explosion.
  if (p.isExplosionDebris) {
    const debrisAlpha = fadeAlpha * 0.85;
    ctx.translate(x, y);
    ctx.rotate(p.rotation || 0);
    ctx.fillStyle = `rgba(85, 51, 0, ${debrisAlpha})`;
    ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
    ctx.rotate(-(p.rotation || 0));
    ctx.translate(-x, -y);
    return;
  }

  // BASE EFFECT: removed — the complex quadratic curve fallback was causing performance
  // issues. All explosion types now have specific effects above. This code should never run.
  // Keeping it as a safety net but with minimal rendering cost.
  const baseRadius = p.r;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = fadeAlpha * 0.3;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#2d8a2d';
  ctx.fill();
  ctx.globalAlpha = prevAlpha;
}

// ─────────────────────────────────────────────
// HIGH-QUALITY BOMBER GRENADE DRAWING
// ─────────────────────────────────────────────
//
// drawBomberGrenade renders a detailed, military-style fragmentation grenade
// with body segments, fuse mechanism, safety pin, and animated spark effects.
//
// Usage: Call drawBomberGrenade(ctx, x, y, radius, options) from draw.js
// Options: { rotation, isSticky, sparkPhase, trailPoints, shadowAlpha, zHeight }
export function drawBomberGrenade(ctx, x, y, radius, options = {}) {
  const {
    rotation = 0,
    isSticky = false,
    sparkPhase = 0,
    trailPoints = [],
    shadowAlpha = 0.25,
    zHeight = 0,
  } = options;

  const cfg = BOMBER_WEAPON_GRAPHICS.grenade;

  // Manual state backup for grenade
  ctx.translate(x, y - zHeight);

  // ── TRAIL EFFECT (Simplified Shadow Silhouettes) ───────────────────────
  // Limit trail points to 3 for performance
  const maxTrailPoints = 3;
  if (trailPoints.length > 0) {
    const prevAlpha = ctx.globalAlpha;
    const trailSlice = trailPoints.slice(-maxTrailPoints);
    // Draw shadow silhouettes at each trail point (newest to oldest)
    for (let i = trailSlice.length - 1; i >= 0; i--) {
      const tp = trailSlice[i];
      const tx = tp.x - x;
      const ty = tp.y - y + zHeight;
      // Fade out older trail points
      const age = (trailSlice.length - 1 - i) / trailSlice.length;
      const alpha = (1 - age) * 0.35;
      const scale = 1 - age * 0.25;

      // Use simple circle instead of complex shapes for performance
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(tx, ty, radius * scale * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
    }
    ctx.globalAlpha = prevAlpha;
  }

  // ── SHADOW ────────────────────────────────────────────────────────────────
  const prevShadowColor = ctx.shadowColor;
  const prevShadowBlur = ctx.shadowBlur;
  const prevShadowOffsetY = ctx.shadowOffsetY;
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.9, radius * 0.85, radius * 0.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.fill();
  ctx.shadowColor = prevShadowColor;
  ctx.shadowBlur = prevShadowBlur;
  ctx.shadowOffsetY = prevShadowOffsetY;

  // ── GRENADE ROTATION ─────────────────────────────────────────────────────
  ctx.rotate(rotation);

  // ── GRENADE BODY (main sphere) ────────────────────────────────────────────
  // Outer glow for depth (OPTIMIZED: removed shadowBlur)
  const prevBodyShadowColor = ctx.shadowColor;
  const prevBodyShadowBlur = ctx.shadowBlur;
  const prevBodyShadowOffsetY = ctx.shadowOffsetY;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 3;

  // Main body gradient (olive green with metallic sheen)
  const bodyGrad = ctx.createRadialGradient(
    -radius * 0.3, -radius * 0.3, 0,
    0, 0, radius
  );
  bodyGrad.addColorStop(0, cfg.bodyHighlight);
  bodyGrad.addColorStop(0.4, cfg.bodyColor);
  bodyGrad.addColorStop(1, cfg.bodyShadow);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.shadowColor = prevBodyShadowColor;
  ctx.shadowBlur = prevBodyShadowBlur;
  ctx.shadowOffsetY = prevBodyShadowOffsetY;

  // ── BODY SEGMENT BANDS (horizontal grooves) ─────────────────────────────
  const prevBandAlpha = ctx.globalAlpha;
  ctx.globalAlpha = 0.7;

  // Top band
  ctx.beginPath();
  ctx.ellipse(0, -radius * 0.35, radius * 0.88, radius * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = cfg.bandColor;
  ctx.fill();

  // Bottom band
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.35, radius * 0.88, radius * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = cfg.bandColor;
  ctx.fill();

  // Band highlights
  ctx.strokeStyle = cfg.bandHighlight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -radius * 0.35, radius * 0.88, radius * 0.12, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.35, radius * 0.88, radius * 0.12, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = prevBandAlpha;

  // ── WARNING STRIPES (hazard pattern) ────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
  ctx.clip();

  // Diagonal warning stripes
  const stripeCount = 6;
  const stripeWidth = radius * 0.18;
  for (let i = -stripeCount; i <= stripeCount; i += 2) {
    const offset = i * (radius * 0.22);
    ctx.fillStyle = cfg.warningColor;
    ctx.fillRect(-radius, offset - stripeWidth / 2, radius * 2, stripeWidth);
  }
  ctx.restore();

  // ── FUSE NECK (top section) ──────────────────────────────────────────────
  const prevNeckShadowColor = ctx.shadowColor;
  const prevNeckShadowBlur = ctx.shadowBlur;
  const prevNeckShadowOffsetY = ctx.shadowOffsetY;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 2;

  // Neck base
  ctx.beginPath();
  ctx.ellipse(0, -radius * 0.85, radius * 0.35, radius * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = cfg.bandColor;
  ctx.fill();

  // Neck body
  const neckGrad = ctx.createLinearGradient(-radius * 0.25, -radius, radius * 0.25, -radius);
  neckGrad.addColorStop(0, cfg.bandHighlight);
  neckGrad.addColorStop(0.5, cfg.bandColor);
  neckGrad.addColorStop(1, '#111111');

  ctx.fillStyle = neckGrad;
  ctx.fillRect(-radius * 0.25, -radius * 1.15, radius * 0.5, radius * 0.3);

  // Neck top rim
  ctx.beginPath();
  ctx.ellipse(0, -radius * 1.15, radius * 0.25, radius * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = cfg.bandHighlight;
  ctx.fill();

  ctx.shadowColor = prevNeckShadowColor;
  ctx.shadowBlur = prevNeckShadowBlur;
  ctx.shadowOffsetY = prevNeckShadowOffsetY;

  // ── FUSE CORD ─────────────────────────────────────────────────────────────
  const prevFuseStroke = ctx.strokeStyle;
  const prevFuseLineWidth = ctx.lineWidth;
  const prevFuseLineCap = ctx.lineCap;
  ctx.strokeStyle = cfg.fuseColor;
  ctx.lineWidth = radius * 0.08;
  ctx.lineCap = 'round';

  // Coiled fuse effect
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.15);
  const fuseLength = radius * 0.5;
  const coils = 3;
  for (let i = 0; i <= coils; i++) {
    const t = i / coils;
    const yOff = -radius * 1.15 - t * fuseLength;
    const xOff = Math.sin(t * Math.PI * 4) * radius * 0.15;
    ctx.lineTo(xOff, yOff);
  }
  ctx.stroke();
  ctx.lineCap = prevFuseLineCap;
  ctx.lineWidth = prevFuseLineWidth;
  ctx.strokeStyle = prevFuseStroke;

  // ── SAFETY PIN (ring) ────────────────────────────────────────────────────
  const prevPinStroke = ctx.strokeStyle;
  const prevPinLineWidth = ctx.lineWidth;
  const prevPinLineCap = ctx.lineCap;
  const prevPinFill = ctx.fillStyle;
  ctx.strokeStyle = cfg.pinColor;
  ctx.lineWidth = radius * 0.06;
  ctx.lineCap = 'round';

  const pinRadius = radius * 0.22;
  const pinX = radius * 0.55;
  const pinY = -radius * 0.7;

  // Pin ring
  ctx.beginPath();
  ctx.arc(pinX, pinY, pinRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Pin arms
  ctx.beginPath();
  ctx.moveTo(pinX - pinRadius, pinY);
  ctx.lineTo(pinX - pinRadius * 2.2, pinY);
  ctx.moveTo(pinX + pinRadius, pinY);
  ctx.lineTo(pinX + pinRadius * 2.2, pinY);
  ctx.stroke();

  // Pin center dot
  ctx.beginPath();
  ctx.arc(pinX, pinY, radius * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = cfg.pinColor;
  ctx.fill();

  ctx.fillStyle = prevPinFill;
  ctx.lineCap = prevPinLineCap;
  ctx.lineWidth = prevPinLineWidth;
  ctx.strokeStyle = prevPinStroke;

  // ── SPARK / IGNITER (animated) ────────────────────────────────────────────
  if (isSticky) {
    const sparkIntensity = 0.5 + Math.sin(sparkPhase) * 0.5;
    const sparkX = 0;
    const sparkY = -radius * 1.15 - radius * 0.5;

    // Outer glow
    const sparkGlow = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, radius * 0.4);
    sparkGlow.addColorStop(0, `rgba(255, 200, 50, ${0.8 * sparkIntensity})`);
    sparkGlow.addColorStop(0.4, `rgba(255, 120, 0, ${0.5 * sparkIntensity})`);
    sparkGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = sparkGlow;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Spark particles
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + sparkPhase * 0.5;
      const dist = radius * 0.15 + Math.sin(sparkPhase + i) * radius * 0.08;
      const px = sparkX + Math.cos(angle) * dist;
      const py = sparkY + Math.sin(angle) * dist;
      const pSize = radius * 0.05 + Math.sin(sparkPhase * 2 + i) * radius * 0.02;

      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, ${200 + i * 10}, 100, ${0.9 * sparkIntensity})`;
      ctx.fill();
    }

    // Core spark
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, radius * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = cfg.sparkCore;
    // OPTIMIZED: Removed shadowBlur (expensive operation)
    ctx.fill();
  }

  // ── SPECULAR HIGHLIGHT (top-left shine) ──────────────────────────────────
  const prevSpecAlpha = ctx.globalAlpha;
  ctx.globalAlpha = 0.4;
  const specGrad = ctx.createRadialGradient(
    -radius * 0.35, -radius * 0.35, 0,
    -radius * 0.35, -radius * 0.35, radius * 0.5
  );
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = prevSpecAlpha;

  // ── OUTLINE ──────────────────────────────────────────────────────────────
  const prevOutlineStroke = ctx.strokeStyle;
  const prevOutlineLineWidth = ctx.lineWidth;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = prevOutlineLineWidth;
  ctx.strokeStyle = prevOutlineStroke;

  // Restore grenade states
  ctx.translate(-x, -(y - zHeight));
}

// ─────────────────────────────────────────────
// GRENADE TRAIL EFFECT HELPER
// ─────────────────────────────────────────────
// Draws a smooth trail behind the grenade showing its arc trajectory
export function drawGrenadeTrail(ctx, points, radius, color) {
  if (!points || points.length < 2) return;

  const prevAlpha = ctx.globalAlpha;
  const prevStroke = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;
  const prevLineCap = ctx.lineCap;
  const prevLineJoin = ctx.lineJoin;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = color || 'rgba(100, 180, 100, 0.4)';
  ctx.lineWidth = radius * 0.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  // Fade trail end
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = radius * 0.4;
  ctx.stroke();

  ctx.lineJoin = prevLineJoin;
  ctx.lineCap = prevLineCap;
  ctx.lineWidth = prevLineWidth;
  ctx.strokeStyle = prevStroke;
  ctx.globalAlpha = prevAlpha;
}

// ─────────────────────────────────────────────
// HIGH-QUALITY C4 EXPLOSIVE DRAWING
// ─────────────────────────────────────────────
//
// drawBomberC4 renders a detailed, military-style C4 explosive charge
// with body texture, detonator cap, wires, blinking LED, and "C-4" marking.
//
// Usage: Call drawBomberC4(ctx, x, y, radius, options) from draw.js
// Options: {
//   rotation,        // rotation angle in radians
//   sparkPhase,      // animation phase for LED blink (0-2PI)
//   trailPoints,     // array of {x, y} for motion trail
//   shadowAlpha,     // shadow opacity (default 0.25)
//   zHeight,         // Z offset for 3D effect (default 0)
//   isDeathC4,       // if true, uses death C4 color scheme (red/orange glow)
//   pulseIntensity   // pulse effect intensity (0-1)
// }
export function drawBomberC4(ctx, x, y, radius, options = {}) {
  const {
    rotation = 0,
    sparkPhase = 0,
    trailPoints = [],
    shadowAlpha = 0.25,
    zHeight = 0,
    isDeathC4 = false,
    pulseIntensity = 1,
  } = options;

  // C4 color palette - military tan/beige plastic
  const c4Colors = isDeathC4 ? {
    bodyMain: '#8B4513',        // Saddle brown for death C4
    bodyLight: '#CD853F',       // Peru highlight
    bodyDark: '#5C2E0A',        // Dark brown shadow
    bandColor: '#4A2508',       // Darker brown bands
    capColor: '#2a2a2a',        // Dark detonator cap
    capHighlight: '#555555',    // Cap highlight
    wireColor: '#8B0000',       // Dark red wires
    ledOn: '#FF0000',           // Red LED
    ledOff: '#330000',          // Off LED
    textColor: '#1a0a00',       // Dark text
    warningColor: '#FF4500',    // Orange-red warning
  } : {
    bodyMain: '#D4C4A8',        // Main tan/beige C4 color
    bodyLight: '#E8DCC8',       // Light tan highlight
    bodyDark: '#A89878',        // Darker tan shadow
    bandColor: '#8B7355',       // Brown bands
    capColor: '#2a2a2a',        // Dark detonator cap
    capHighlight: '#555555',    // Cap highlight
    wireColor: '#333333',       // Dark gray wires
    ledOn: '#00FF00',           // Green LED (armed)
    ledOff: '#003300',          // Off LED
    textColor: '#2a2010',       // Dark brown text
    warningColor: '#FF6600',    // Orange warning stripes
  };

  const cfg = c4Colors;

  // Manual state backup for C4
  ctx.translate(x, y - zHeight);

  // ── TRAIL EFFECT (Shadow Silhouettes) ───────────────────────────────────
  if (trailPoints.length > 0) {
    const prevAlpha = ctx.globalAlpha;
    for (let i = trailPoints.length - 1; i >= 0; i--) {
      const tp = trailPoints[i];
      const tx = tp.x - x;
      const ty = tp.y - y + zHeight;
      const age = (trailPoints.length - 1 - i) / trailPoints.length;
      const alpha = (1 - age) * 0.35;
      const scale = 1 - age * 0.25;

      ctx.translate(tx, ty);
      ctx.rotate(rotation);
      ctx.globalAlpha = alpha;

      // Dark silhouette of C4 block
      ctx.fillStyle = isDeathC4 ? '#3a1a0a' : '#4a4030';
      ctx.fillRect(-radius * scale * 1.1, -radius * scale * 0.7, radius * 2.2 * scale, radius * 1.4 * scale);

      ctx.rotate(-rotation);
      ctx.translate(-tx, -ty);
    }
    ctx.globalAlpha = prevAlpha;
  }

  // ── SHADOW ────────────────────────────────────────────────────────────────
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.85, radius * 1.15, radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.fill();

  // ── C4 ROTATION ──────────────────────────────────────────────────────────
  ctx.rotate(rotation);

  // ── PULSE EFFECT (for armed C4) ──────────────────────────────────────────
  const pulse = 1 + Math.sin(sparkPhase * 2) * 0.03 * pulseIntensity;
  ctx.scale(pulse, pulse);

  // ── C4 MAIN BODY (rectangular block) ─────────────────────────────────────
  // Shadow for depth (OPTIMIZED: removed shadowBlur)
  const prevShadowColor = ctx.shadowColor;
  const prevShadowOffsetY = ctx.shadowOffsetY;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 4;

  // Main body gradient - tan/beige plastic with 3D effect
  const bodyGrad = ctx.createLinearGradient(
    -radius * 1.0, -radius * 0.6,
    radius * 1.0, radius * 0.6
  );
  bodyGrad.addColorStop(0, cfg.bodyLight);
  bodyGrad.addColorStop(0.3, cfg.bodyMain);
  bodyGrad.addColorStop(0.7, cfg.bodyMain);
  bodyGrad.addColorStop(1, cfg.bodyDark);

  // Draw main rectangular body
  const bodyWidth = radius * 2.0;
  const bodyHeight = radius * 1.3;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, radius * 0.15);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = prevShadowColor;
  ctx.shadowOffsetY = prevShadowOffsetY;

  // ── BODY TEXTURE (subtle plastic texture lines) ─────────────────────────
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = cfg.bodyDark;
  ctx.lineWidth = 0.5;
  for (let i = -3; i <= 3; i++) {
    const yOff = i * radius * 0.18;
    ctx.beginPath();
    ctx.moveTo(-bodyWidth / 2 + radius * 0.1, yOff);
    ctx.lineTo(bodyWidth / 2 - radius * 0.1, yOff);
    ctx.stroke();
  }
  ctx.globalAlpha = prevAlpha;

  // ── WARNING STRIPES (hazard pattern on sides) ────────────────────────────
  ctx.save(); // Keep clip save
  ctx.globalAlpha = 0.7;
  const stripeWidth = radius * 0.12;
  const stripeSpacing = radius * 0.24;

  // Left side stripes
  ctx.beginPath();
  ctx.rect(-bodyWidth / 2, -bodyHeight / 2, radius * 0.25, bodyHeight);
  ctx.clip();
  for (let i = -6; i <= 6; i++) {
    const offset = i * stripeSpacing - bodyHeight / 2;
    ctx.fillStyle = cfg.warningColor;
    ctx.translate(-bodyWidth / 2, 0);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-bodyHeight, offset - stripeWidth / 2, bodyHeight * 2, stripeWidth);
    ctx.rotate(-Math.PI / 4);
    ctx.translate(bodyWidth / 2, 0);
  }
  ctx.restore();

  ctx.save(); // Keep clip save
  ctx.globalAlpha = 0.7;
  // Right side stripes
  ctx.beginPath();
  ctx.rect(bodyWidth / 2 - radius * 0.25, -bodyHeight / 2, radius * 0.25, bodyHeight);
  ctx.clip();
  for (let i = -6; i <= 6; i++) {
    const offset = i * stripeSpacing - bodyHeight / 2;
    ctx.fillStyle = cfg.warningColor;
    ctx.translate(bodyWidth / 2, 0);
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-bodyHeight, offset - stripeWidth / 2, bodyHeight * 2, stripeWidth);
    ctx.rotate(Math.PI / 4);
    ctx.translate(-bodyWidth / 2, 0);
  }
  ctx.restore();

  // ── C-4 TEXT MARKING ─────────────────────────────────────────────────────
  const prevTextAlpha = ctx.globalAlpha;
  ctx.font = `bold ${radius * 0.45}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = cfg.textColor;
  ctx.globalAlpha = 0.85;
  ctx.fillText('C-4', 0, radius * 0.05);
  ctx.globalAlpha = prevTextAlpha;

  // ── DETONATOR CAP (top center) ──────────────────────────────────────────
  // Shadow for depth (OPTIMIZED: removed shadowBlur)
  const prevCapShadowColor = ctx.shadowColor;
  const prevCapShadowOffsetY = ctx.shadowOffsetY;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 2;

  const capWidth = radius * 0.5;
  const capHeight = radius * 0.35;
  const capY = -bodyHeight / 2 - capHeight * 0.3;

  // Cap base
  const capGrad = ctx.createLinearGradient(-capWidth / 2, capY, capWidth / 2, capY);
  capGrad.addColorStop(0, cfg.capHighlight);
  capGrad.addColorStop(0.5, cfg.capColor);
  capGrad.addColorStop(1, '#111111');

  ctx.beginPath();
  ctx.roundRect(-capWidth / 2, capY - capHeight / 2, capWidth, capHeight, radius * 0.08);
  ctx.fillStyle = capGrad;
  ctx.fill();

  // Cap top rim
  ctx.beginPath();
  ctx.ellipse(0, capY - capHeight / 2, capWidth / 2, capHeight * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = cfg.capHighlight;
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = prevCapShadowColor;
  ctx.shadowOffsetY = prevCapShadowOffsetY;

  // ── DETONATOR NECK (connection to body) ──────────────────────────────────
  ctx.fillStyle = cfg.capColor;
  ctx.beginPath();
  ctx.moveTo(-capWidth * 0.35, capY - capHeight / 2);
  ctx.lineTo(-bodyWidth * 0.15, -bodyHeight / 2 + radius * 0.1);
  ctx.lineTo(bodyWidth * 0.15, -bodyHeight / 2 + radius * 0.1);
  ctx.lineTo(capWidth * 0.35, capY - capHeight / 2);
  ctx.closePath();
  ctx.fill();

  // ── LED INDICATOR LIGHT (blinking) ───────────────────────────────────────
  const ledPhase = Math.sin(sparkPhase * 3);
  const ledOn = ledPhase > 0.3;

  // LED body
  const ledRadius = radius * 0.1;
  const ledX = 0;
  const ledY = capY - capHeight * 0.15;

  const ledGrad = ctx.createRadialGradient(ledX - ledRadius * 0.3, ledY - ledRadius * 0.3, 0, ledX, ledY, ledRadius);
  ledGrad.addColorStop(0, ledOn ? '#FFFFFF' : cfg.ledOff);
  ledGrad.addColorStop(0.5, ledOn ? cfg.ledOn : cfg.ledOff);
  ledGrad.addColorStop(1, ledOn ? '#880000' : '#110000');

  ctx.beginPath();
  ctx.arc(ledX, ledY, ledRadius, 0, Math.PI * 2);
  ctx.fillStyle = ledGrad;
  ctx.fill();

  // LED highlight
  if (ledOn) {
    ctx.beginPath();
    ctx.arc(ledX - ledRadius * 0.25, ledY - ledRadius * 0.25, ledRadius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
  }

  // ── WIRES (connecting to detonator) ──────────────────────────────────────
  ctx.strokeStyle = cfg.wireColor;
  const prevLineWidth = ctx.lineWidth;
  const prevLineCap = ctx.lineCap;
  ctx.lineWidth = radius * 0.04;
  ctx.lineCap = 'round';

  // Left wire
  ctx.beginPath();
  ctx.moveTo(-capWidth * 0.3, capY);
  ctx.quadraticCurveTo(-capWidth * 0.5, capY + radius * 0.2, -capWidth * 0.4, capY + radius * 0.4);
  ctx.stroke();

  // Right wire
  ctx.beginPath();
  ctx.moveTo(capWidth * 0.3, capY);
  ctx.quadraticCurveTo(capWidth * 0.5, capY + radius * 0.2, capWidth * 0.4, capY + radius * 0.4);
  ctx.stroke();

  // Wire connectors on cap
  ctx.fillStyle = cfg.wireColor;
  ctx.beginPath();
  ctx.arc(-capWidth * 0.3, capY, radius * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(capWidth * 0.3, capY, radius * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Reset line styles
  ctx.lineWidth = prevLineWidth;
  ctx.lineCap = prevLineCap;

  // ── BODY EDGE HIGHLIGHTS ─────────────────────────────────────────────────
  const prevEdgeAlpha = ctx.globalAlpha;
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = cfg.bodyLight;
  ctx.lineWidth = 1.5;

  // Top highlight
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 + radius * 0.2, -bodyHeight / 2 + radius * 0.1);
  ctx.lineTo(bodyWidth / 2 - radius * 0.2, -bodyHeight / 2 + radius * 0.1);
  ctx.stroke();

  // Left highlight
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 + radius * 0.1, -bodyHeight / 2 + radius * 0.2);
  ctx.lineTo(-bodyWidth / 2 + radius * 0.1, bodyHeight / 2 - radius * 0.2);
  ctx.stroke();

  // ── BODY SHADOW EDGE ─────────────────────────────────────────────────────
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = cfg.bodyDark;
  ctx.lineWidth = 1.5;

  // Bottom shadow
  ctx.beginPath();
  ctx.moveTo(-bodyWidth / 2 + radius * 0.2, bodyHeight / 2 - radius * 0.1);
  ctx.lineTo(bodyWidth / 2 - radius * 0.2, bodyHeight / 2 - radius * 0.1);
  ctx.stroke();

  // Right shadow
  ctx.beginPath();
  ctx.moveTo(bodyWidth / 2 - radius * 0.1, -bodyHeight / 2 + radius * 0.2);
  ctx.lineTo(bodyWidth / 2 - radius * 0.1, bodyHeight / 2 - radius * 0.2);
  ctx.stroke();

  // ── OUTLINE ──────────────────────────────────────────────────────────────
  ctx.globalAlpha = 1.0; // Reset alpha for outline
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, radius * 0.15);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.globalAlpha = prevEdgeAlpha;

  // Restore C4 states (reverse order of transforms)
  ctx.scale(1 / pulse, 1 / pulse);
  ctx.rotate(-rotation);
  ctx.translate(-x, -(y - zHeight));
}
