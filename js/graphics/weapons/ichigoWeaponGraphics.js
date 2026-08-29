import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

export function drawGetsugaSlash(ctx, p, isBlack) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const owner = state.fighters && state.fighters[p.owner];
  const form = p.getsugaForm || (isBlack ? (owner && owner.hollowMaskActive ? (owner.bankaiActive ? 'bankai_hollow' : 'hollow') : 'bankai') : 'shikai');
  
  const isFinal = form === 'final_bankai';
  const isBankaiHollow = form === 'bankai_hollow' || (owner && owner.bankaiActive && owner.hollowMaskActive);
  const isShikaiHollow = (form === 'hollow' || (owner && !owner.bankaiActive && owner.hollowMaskActive)) && !isBankaiHollow;
  const isBankai = form === 'bankai' || isBankaiHollow || isFinal;
  const isShikai = form === 'shikai' && !isBankai && !isShikaiHollow;

  const scale = owner ? Math.max(0.9, owner.r / 22) : 1.0;
  const lifeRatio = Math.max(0.2, (p.life || 30) / (p.maxLife || 30));
  const isInfinityFrozen = Boolean(p.isFrozenByInfinity);
  const fadeAlpha = (isInfinityFrozen && p.infinityFreezeTimer !== undefined && p.infinityFreezeTimer < 30) ? Math.max(0, p.infinityFreezeTimer / 30) : 1.0;
  const alpha = Math.min(1.0, lifeRatio * 1.30) * fadeAlpha;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  // Quantize time to 30 FPS for stepped retro anime feel
  const msPerFrame = 1000 / 30;
  const qTime = Math.floor(now / msPerFrame) * msPerFrame;

  // Dynamically scale visual crescent dimensions directly matching configured projectile radius
  const baseProjRadius = isFinal
    ? (CONFIG.ichigo?.bankaiFinalGetsugaRadius ?? 120)
    : (isBankaiHollow
      ? (CONFIG.ichigo?.bankaiHollowGetsugaRadius ?? 68)
      : (isShikaiHollow
        ? (CONFIG.ichigo?.hollowGetsugaRadius ?? 62)
        : (isBankai
          ? (CONFIG.ichigo?.bankaiGetsugaRadius ?? 58)
          : (CONFIG.ichigo?.getsugaRadius ?? 52))));

  const radiusScale = (p.r !== undefined && p.r > 0) ? (p.r / 38) : (baseProjRadius / 38);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(scale * radiusScale, scale * radiusScale);
  ctx.imageSmoothingEnabled = false; // Authentic nearest-neighbor pixel art rendering

  // ── Exact Crescent Parameters (Normalized to 38px base, scaled seamlessly by radiusScale) ──
  const P = 2.0; // Exact discrete pixel art grid unit matching Saitama
  const snap = (v) => Math.round(v / P) * P;

  const R = 38;
  const maxThick = 14; // Exact same slim thickness across all forms, matching normal Getsuga Tensho!
  const taperPower = 1.32; // Exact same slim needle-sharp double-tapering as normal Getsuga Tensho
  const halfAngle = 0.64 * Math.PI; // Exact same slim crescent arc span as normal Getsuga Tensho

  // ── Palette Definition ──
  let cBorder, cSaturated, cBright, cCore, cAura, isDarkCore;
  const isDarkMode = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode || (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))));

  if (isInfinityFrozen) {
    cBorder    = '#001a44';
    cSaturated = '#0055dd';
    cBright    = '#00e5ff';
    cCore      = '#ffffff';
    cAura      = `rgba(0, 229, 255, ${(0.35 * alpha).toFixed(2)})`;
    isDarkCore = false;
  } else if (isShikaiHollow) {
    cBorder    = '#020814';
    cSaturated = '#061020'; // Dark cyan void
    cBright    = '#00f0ff';
    cCore      = '#ffffff';
    cAura      = `rgba(0, 240, 255, ${(0.35 * alpha).toFixed(2)})`;
    isDarkCore = true;
  } else if (isBankai || isFinal || isBankaiHollow) {
    // Kuroi Getsuga Tensho — Authentic Black-Red Crimson Theme
    cBorder    = '#1A0006'; // Deep Obsidian Crimson outer border shell
    cSaturated = '#080003'; // Abyssal pitch-black void core
    cBright    = '#FF0033'; // Electric vivid blood-crimson flame rim
    cCore      = '#FFFFFF'; // Razor white-hot cutting edge
    cAura      = `rgba(220, 0, 45, ${(0.42 * alpha).toFixed(2)})`; // Radiant crimson flame atmosphere
    isDarkCore = true;
  } else { // Standard Shikai Azure
    cBorder    = '#00143a';
    cSaturated = '#0066ee';
    cBright    = '#00e5ff';
    cCore      = '#ffffff';
    cAura      = `rgba(0, 180, 255, ${(0.32 * alpha).toFixed(2)})`;
    isDarkCore = false;
  }

  const isInsideGetsuga = (rx, ry) => {
    const dist = Math.hypot(rx, ry);
    if (dist > R || dist <= 0) return false;
    const ang = Math.atan2(ry, rx);
    if (Math.abs(ang) > halfAngle) return false;
    const t = ang / halfAngle;
    const taper = Math.cos(t * (Math.PI / 2));
    const inR = R - maxThick * Math.pow(taper, taperPower);
    return dist >= inR;
  };

  const isInsideAura = (rx, ry) => {
    const dist = Math.hypot(rx, ry);
    if (dist > R + P * 2.0 || dist <= 0) return false;
    const ang = Math.atan2(ry, rx);
    if (Math.abs(ang) > halfAngle + 0.08) return false;
    const t = Math.min(1.0, Math.abs(ang) / halfAngle);
    const taper = Math.cos(t * (Math.PI / 2));
    const inR = R - (maxThick + P * 2.0) * Math.pow(taper, taperPower);
    return dist >= inR;
  };

  const minX = Math.floor((Math.cos(halfAngle) * R - maxThick - P * 3) / P) * P;
  const maxX = Math.ceil((R + P * 3) / P) * P;
  const maxY = Math.ceil((Math.sin(halfAngle) * R + P * 3) / P) * P;

  // ── 1. Atmosphere Stepped Pixel Aura ──
  ctx.fillStyle = cAura;
  for (let gy = -maxY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      if (isInsideAura(gx, gy) && !isInsideGetsuga(gx, gy)) {
        ctx.fillRect(snap(gx), snap(gy), P, P);
      }
    }
  }

  // ── 2. Discrete 2D Crescent Body Grid with 4-Neighbor Attached Border ──
  for (let gy = -maxY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      if (!isInsideGetsuga(gx, gy)) continue;

      const pxX = snap(gx);
      const pyY = snap(gy);

      // 4-neighbor attached border test matching Saitama skin technique
      const isBorder = !isInsideGetsuga(gx + P, gy) ||
                       !isInsideGetsuga(gx - P, gy) ||
                       !isInsideGetsuga(gx, gy + P) ||
                       !isInsideGetsuga(gx, gy - P);

      if (isBorder) {
        ctx.fillStyle = cBorder;
        ctx.fillRect(pxX, pyY, P, P);
        continue;
      }

      const dist = Math.hypot(gx, gy);
      const depthFromApex = R - dist;

      if (depthFromApex < P * 1.5) {
        ctx.fillStyle = cCore; // Razor-sharp white-hot leading edge
      } else if (depthFromApex < P * 3.4) {
        ctx.fillStyle = cBright; // Saturated electric blood-crimson flame rim (#FF0033)
      } else if (isDarkCore && depthFromApex < P * 5.2) {
        ctx.fillStyle = '#8B0014'; // Transition deep burning crimson layer
      } else {
        ctx.fillStyle = isDarkCore ? cSaturated : ((Math.round(gx / P) + Math.round(gy / P)) % 2 === 0 ? cSaturated : cBright);
      }
      ctx.fillRect(pxX, pyY, P, P);
    }
  }

  // ── 3. Leading Apex Stepped Pixel Diamond Flare ──
  const apexX = snap(R);
  ctx.fillStyle = cCore;
  const flareSpread = 2;
  ctx.fillRect(apexX - P * 0.5, -P * 0.5, P, P);
  ctx.fillRect(apexX - P * flareSpread, -P * 0.5, P * (flareSpread * 2), P);
  ctx.fillRect(apexX - P * 0.5, -P * flareSpread, P, P * (flareSpread * 2));

  // ── 4. Trailing Stepped Pixel Sparkles & Reiatsu Motes ──
  const moteCount = 3;
  for (let s = 0; s < moteCount; s++) {
    const sSeed = s * 73.1 + qTime * 0.006;
    const sAng = (Math.sin(sSeed) * halfAngle * 0.85);
    const sT = Math.cos((sAng / halfAngle) * (Math.PI / 2));
    const sInR = R - maxThick * Math.pow(sT, taperPower) - (P * (2 + (s % 3) * 2));
    const sx = snap(Math.cos(sAng) * sInR);
    const sy = snap(Math.sin(sAng) * sInR);

    ctx.fillStyle = (s % 3 === 0) ? cCore : ((s % 3 === 1) ? cBright : (isDarkCore ? '#8B0014' : cBorder));
    ctx.fillRect(sx, sy, P, P);
  }

  ctx.restore();
}

export function drawCeroBeam(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));
  const alpha = lifeRatio;
  const P = 4.0; // Pixel art grid unit
  const snap = (v) => Math.round(v / P) * P;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  const beamHalfW = 32;
  const beamLength = 420;
  const startX = -30;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  // 1. Pixel-Art Dark Ink/Void Outer Shell
  ctx.fillStyle = `rgba(24, 0, 4, ${0.95 * alpha})`;
  for (let x = startX; x <= beamLength; x += P) {
    const normX = (x - startX) / (beamLength - startX);
    const headBulge = normX > 0.85 ? Math.sin((normX - 0.85) / 0.15 * Math.PI) * 12 : 0;
    const curW = beamHalfW + headBulge + P * 2;
    const topY = snap(-curW);
    const botY = snap(curW);
    ctx.fillRect(snap(x), topY, P, (botY - topY) + P);
  }

  // 2. Stepped Energy Bands (Crimson -> Pure White Core)
  const numBands = Math.ceil(beamHalfW / P);
  for (let b = numBands; b >= 0; b--) {
    const normB = b / numBands; // 1 = outer, 0 = core
    let col;
    if (normB > 0.75) {
      col = `rgba(139, 0, 10, ${0.85 * alpha})`; // Dark Crimson
    } else if (normB > 0.45) {
      col = `rgba(255, 20, 30, ${0.92 * alpha})`; // Vivid Cero Red
    } else if (normB > 0.20) {
      col = `rgba(255, 120, 80, ${0.96 * alpha})`; // Hot Orange-Red
    } else {
      col = `rgba(255, 255, 255, ${0.98 * alpha})`; // White-hot core
    }

    ctx.fillStyle = col;
    for (let x = startX; x <= beamLength; x += P) {
      const normX = (x - startX) / (beamLength - startX);
      const headBulge = normX > 0.85 ? Math.sin((normX - 0.85) / 0.15 * Math.PI) * 12 : 0;
      const curW = (beamHalfW + headBulge) * normB;
      const topY = snap(-curW);
      const botY = snap(curW);
      ctx.fillRect(snap(x), topY, P, Math.max(P, botY - topY));
    }
  }

  // 3. Pixel Shockwave Ring Columns
  const numRings = 5;
  for (let r = 0; r < numRings; r++) {
    const ringPhase = ((now * 0.003 * 40 + r * (beamLength / numRings)) % beamLength);
    const rx = snap(startX + ringPhase);
    const rw = beamHalfW + 16;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * alpha})`;
    ctx.fillRect(rx, snap(-rw), P, P * 2);
    ctx.fillRect(rx, snap(rw - P * 2), P, P * 2);
    ctx.fillStyle = `rgba(255, 40, 40, ${0.60 * alpha})`;
    ctx.fillRect(rx - P, snap(-rw - P), P * 3, P);
    ctx.fillRect(rx - P, snap(rw + P), P * 3, P);
  }

  // 4. Stepped Pixel Electric Arcs Crackling along beam
  const numCrackles = 6;
  for (let c = 0; c < numCrackles; c++) {
    const cSeed = c * 53.7 + now * 0.015;
    const cX1 = snap(startX + (Math.sin(cSeed) * 0.5 + 0.5) * beamLength);
    const cY1 = snap((Math.cos(cSeed * 1.3) * beamHalfW * 0.9));
    const cX2 = snap(cX1 + (Math.sin(cSeed * 2.1) * 24));
    const cY2 = snap(cY1 + (Math.cos(cSeed * 2.5) * 16));

    ctx.fillStyle = (c % 2 === 0) ? '#FFFFFF' : '#FF5555';
    ctx.fillRect(cX1, cY1, P, P);
    ctx.fillRect(snap((cX1 + cX2) / 2), snap((cY1 + cY2) / 2), P, P);
    ctx.fillRect(cX2, cY2, P, P);
  }

  // 5. Trailing Exploding Pixel Embers
  const numEmbers = 8;
  for (let e = 0; e < numEmbers; e++) {
    const eSeed = e * 89.3 + now * 0.008;
    const ex = snap(startX + (eSeed % beamLength));
    const ey = snap((Math.sin(eSeed * 3.7) * (beamHalfW + 20)));
    ctx.fillStyle = (e % 2 === 0) ? '#FFFFFF' : '#FF2233';
    ctx.fillRect(ex, ey, P, P);
  }

  ctx.restore();
}

let _shikaiSwordImage = null;
let _shikaiSwordImageLoading = false;

export function _getShikaiSwordImage() {
  if (_shikaiSwordImage && _shikaiSwordImage.complete && _shikaiSwordImage.naturalWidth > 0) {
    return _shikaiSwordImage;
  }
  if (!_shikaiSwordImageLoading && typeof Image !== 'undefined') {
    _shikaiSwordImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _shikaiSwordImage = img;
      _shikaiSwordImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Shikai sword image at Assets/model/ICHIGO-SHIKAI-SWORD.png', e);
      _shikaiSwordImageLoading = false;
    };
    img.src = 'Assets/model/ICHIGO-SHIKAI-SWORD.png';
    _shikaiSwordImage = img;
  }
  return _shikaiSwordImage;
}

let _shikaiSwordBladeImage = null;
let _shikaiSwordBladeImageLoading = false;

export function _getShikaiSwordBladeImage() {
  if (_shikaiSwordBladeImage && _shikaiSwordBladeImage.complete && _shikaiSwordBladeImage.naturalWidth > 0) {
    return _shikaiSwordBladeImage;
  }
  if (!_shikaiSwordBladeImageLoading && typeof Image !== 'undefined') {
    _shikaiSwordBladeImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _shikaiSwordBladeImage = img;
      _shikaiSwordBladeImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Shikai sword blade image at Assets/model/ICHIGO-SHIKAI-SWORD-BLADE.png', e);
      _shikaiSwordBladeImageLoading = false;
    };
    img.src = 'Assets/model/ICHIGO-SHIKAI-SWORD-BLADE.png';
    _shikaiSwordBladeImage = img;
  }
  return _shikaiSwordBladeImage;
}

let _bankaiSwordImage = null;
let _bankaiSwordImageLoading = false;

export function _getBankaiSwordImage() {
  if (_bankaiSwordImage && _bankaiSwordImage.complete && _bankaiSwordImage.naturalWidth > 0) {
    return _bankaiSwordImage;
  }
  if (!_bankaiSwordImageLoading && typeof Image !== 'undefined') {
    _bankaiSwordImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _bankaiSwordImage = img;
      _bankaiSwordImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Bankai sword image at Assets/model/ICHIGO-BANKAI-SWORD.png', e);
      _bankaiSwordImageLoading = false;
    };
    img.src = 'Assets/model/ICHIGO-BANKAI-SWORD.png';
    _bankaiSwordImage = img;
  }
  return _bankaiSwordImage;
}

let _bankaiSwordBladeImage = null;
let _bankaiSwordBladeImageLoading = false;

export function _getBankaiSwordBladeImage() {
  if (_bankaiSwordBladeImage && _bankaiSwordBladeImage.complete && _bankaiSwordBladeImage.naturalWidth > 0) {
    return _bankaiSwordBladeImage;
  }
  if (!_bankaiSwordBladeImageLoading && typeof Image !== 'undefined') {
    _bankaiSwordBladeImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _bankaiSwordBladeImage = img;
      _bankaiSwordBladeImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Bankai sword blade image at Assets/model/ICHIGO-BANKAI-SWORD-BLADE.png', e);
      _bankaiSwordBladeImageLoading = false;
    };
    img.src = 'Assets/model/ICHIGO-BANKAI-SWORD-BLADE.png';
    _bankaiSwordBladeImage = img;
  }
  return _bankaiSwordBladeImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getShikaiSwordImage();
  _getShikaiSwordBladeImage();
  _getBankaiSwordImage();
  _getBankaiSwordBladeImage();
}

export function drawShikaiZangetsu(ctx, x, y, angle, r) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const img = _getShikaiSwordImage();
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Crisp nearest-neighbor pixel art scaling
    const s = 0.20; // Exact preview scale
    ctx.scale(s, s);
    ctx.drawImage(img, -280, -60);
    ctx.restore();
    ctx.restore();
    return;
  }

  // Standalone weapon scale
  const scale = 0.78;
  ctx.scale(scale, scale);

  const handleLen = 42;
  const handleThick = 6.5;
  const hiltX = -handleLen; // -42

  // 1. Pixel Art White Cloth Ribbons from the Pommel
  ctx.save();

  // Ribbon Strand 3 (Deepest downward loop, weaving behind)
  ctx.fillStyle = '#cbd5e1';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(hiltX - 1, 1);
  ctx.lineTo(hiltX - 12, 10);
  ctx.lineTo(hiltX - 14, 24);
  ctx.lineTo(hiltX - 2, 27);
  ctx.lineTo(hiltX + 10, 30);
  ctx.lineTo(hiltX + 22, 22);
  ctx.lineTo(hiltX + 38, 20);
  ctx.lineTo(hiltX + 36, 17);
  ctx.lineTo(hiltX + 22, 19);
  ctx.lineTo(hiltX + 10, 26);
  ctx.lineTo(hiltX - 2, 24);
  ctx.lineTo(hiltX - 10, 22);
  ctx.lineTo(hiltX - 8, 9);
  ctx.lineTo(hiltX - 1, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ribbon Strand 2 (Middle strand crossing under Strand 1)
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(hiltX - 1, 1);
  ctx.lineTo(hiltX - 8, 6);
  ctx.lineTo(hiltX - 8, 18);
  ctx.lineTo(hiltX + 2, 20);
  ctx.lineTo(hiltX + 15, 22);
  ctx.lineTo(hiltX + 28, 16);
  ctx.lineTo(hiltX + 46, 23);
  ctx.lineTo(hiltX + 44, 20);
  ctx.lineTo(hiltX + 28, 13);
  ctx.lineTo(hiltX + 15, 19);
  ctx.lineTo(hiltX + 2, 17);
  ctx.lineTo(hiltX - 5, 15);
  ctx.lineTo(hiltX - 5, 5);
  ctx.lineTo(hiltX, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ribbon Strand 1 (Front strand crossing over middle and waving to top tail)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(hiltX - 1, 1);
  ctx.lineTo(hiltX - 10, 8);
  ctx.lineTo(hiltX - 11, 22);
  ctx.lineTo(hiltX - 1, 24);
  ctx.lineTo(hiltX + 10, 26);
  ctx.lineTo(hiltX + 22, 12);
  ctx.lineTo(hiltX + 38, 13);
  ctx.lineTo(hiltX + 54, 13);
  ctx.lineTo(hiltX + 52, 10);
  ctx.lineTo(hiltX + 36, 10);
  ctx.lineTo(hiltX + 22, 9);
  ctx.lineTo(hiltX + 10, 22);
  ctx.lineTo(hiltX - 1, 21);
  ctx.lineTo(hiltX - 8, 19);
  ctx.lineTo(hiltX - 7, 7);
  ctx.lineTo(hiltX, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fabric Pommel Wrap Knot
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(hiltX - 3.0, -3.5, 4.0, 7.0);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(hiltX - 3.0, -3.5, 4.0, 7.0);

  ctx.restore();

  // 2. Pixel Art Handle / Hilt (White wrapped cloth with diamond Ito stitches)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(hiltX, -handleThick / 2, handleLen, handleThick);

  // Pixel Ito stitches
  ctx.fillStyle = '#94a3b8';
  for (let px = hiltX + 3.5; px < 0; px += 5.5) {
    ctx.fillRect(px, -handleThick / 2, 2.0, 2.0);
    ctx.fillRect(px + 1.5, -0.5, 2.0, 1.5);
    ctx.fillRect(px, handleThick / 2 - 2.0, 2.0, 2.0);
  }

  // Handle outer outline
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(hiltX, -handleThick / 2, handleLen, handleThick);

  // 3. Pixel Art Blade Geometry
  const tipX = 145, tipY = -12;
  const cutoutR = 7.0;
  const cutoutCenterX = cutoutR, cutoutCenterY = 3.5;
  const heelX = cutoutR * 2, heelY = 22;

  // A) Draw Black Back Spine Region (Dark Gunmetal & Midnight Black)
  ctx.fillStyle = '#101216';
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(tipX, tipY);
  ctx.quadraticCurveTo(75, -2, heelX, cutoutCenterY);
  ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
  ctx.lineTo(0, 6.0);
  ctx.lineTo(0, -3.5);
  ctx.closePath();
  ctx.fill();

  // Upper spine top highlight line (pixel bevel)
  ctx.strokeStyle = '#2d3342';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -2.5);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // B) Draw Silver Steel Blade Body (Main Lower Region & Cutting Edge)
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(heelX, heelY);
  ctx.quadraticCurveTo(80, 18, tipX, tipY);
  ctx.quadraticCurveTo(75, -2, heelX, cutoutCenterY);
  ctx.lineTo(heelX, heelY);
  ctx.closePath();
  ctx.fill();

  // Upper blade seam shading band
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(heelX, cutoutCenterY + 1.5);
  ctx.quadraticCurveTo(75, -0.5, tipX, tipY);
  ctx.stroke();

  // Razor-sharp pure white cutting edge
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(heelX, heelY);
  ctx.quadraticCurveTo(80, 18, tipX, tipY);
  ctx.stroke();

  // C) Crisp Pixel Outer Outlines & Seam Details
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(tipX, tipY);
  ctx.quadraticCurveTo(80, 18, heelX, heelY);
  ctx.lineTo(heelX, cutoutCenterY);
  ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
  ctx.lineTo(0, 6.0);
  ctx.lineTo(0, -3.5);
  ctx.closePath();
  ctx.stroke();

  // Seam line separating Black Spine from Silver Steel Body
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(heelX, cutoutCenterY);
  ctx.quadraticCurveTo(75, -2, tipX, tipY);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws the authentic, high-fidelity Tensa Zangetsu (Fullbring / True Bankai Katana).
 * Features:
 * 1. Pitch-black daito blade with 3 stepped serrated fin notches along the upper spine and razor-polished kissaki tip.
 * 2. Authentic 4-pronged Manji (卍) black handguard with right-angle hooks and edge bevels.
 * 3. Hilt (Tsuka) with vibrant crimson red Samegawa (rayskin) background and black diamond-wrap cutouts (◆ ◆ ◆ ◆ ◆).
 * 4. Iron pommel cap (Kashira) with Sarute ring and dangling 3D linked Kusari black chain.
 */
export function drawTensaZangetsuKatana(ctx, swordStartX, isMask = false, opts = {}) {
  const bladeLen = opts.bladeLen || 94;

  const bladeImg = _getBankaiSwordBladeImage();
  if (bladeImg && bladeImg.complete && bladeImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const s = bladeLen / 566.0;
    ctx.translate(swordStartX, 0);
    ctx.scale(s, s);
    ctx.drawImage(bladeImg, -194, -78.5);
    ctx.restore();

    // Broken Black Chain (Kusari) if not skipped
    if (!opts.skipChain) {
      const hiltStartX = swordStartX - 32;
      const ringX = hiltStartX - 4.2;
      const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      const breathe = Math.sin(now * 0.0025) * 0.8;
      
      const chainLinks = [];
      const linkCount = 13;
      const isBankaiStance = Boolean(opts.isBankaiStance || opts.isChampionScreen);

      if (isBankaiStance) {
        const downX = Math.sin(2.65);
        const downY = -Math.cos(2.65);
        const perpDownX = downY;
        const perpDownY = -downX;

        for (let i = 0; i < linkCount; i++) {
          const t = i / (linkCount - 1);
          const hangLen = 28.0;
          const catenarySway = Math.sin(t * Math.PI) * (2.2 + breathe);
          const cx = ringX + t * hangLen * downX + catenarySway * perpDownX;
          const cy = 0 + t * hangLen * downY + catenarySway * perpDownY;
          const baseAng = Math.atan2(downY, downX);
          const swayAng = Math.cos(t * Math.PI) * 0.20;
          chainLinks.push({ x: cx, y: cy, ang: baseAng + swayAng });
        }
      } else {
        for (let i = 0; i < linkCount; i++) {
          const t = i / (linkCount - 1);
          const cx = ringX - t * 30.0;
          const cy = Math.sin(t * Math.PI) * (14.0 + breathe) + t * 4.0;
          const ang = Math.cos(t * Math.PI) * 0.85 - 0.25;
          chainLinks.push({ x: cx, y: cy, ang: ang });
        }
      }

      ctx.save();
      for (let c = 0; c < chainLinks.length; c++) {
        const cl = chainLinks[c];
        ctx.save();
        ctx.translate(cl.x, cl.y);
        ctx.rotate(cl.ang);

        const isOdd = (c % 2 === 1);
        const linkRx = 2.7;
        const linkRy = isOdd ? 1.0 : 1.6;

        ctx.fillStyle = '#0a0a0e';
        ctx.strokeStyle = '#2d3342';
        ctx.lineWidth = 1.0;
        ctx.fillRect(-linkRx, -linkRy, linkRx * 2, linkRy * 2);
        ctx.strokeRect(-linkRx, -linkRy, linkRx * 2, linkRy * 2);

        ctx.restore();
      }
      ctx.restore();
    }

    return;
  }

  const bladeBaseX = swordStartX + 5;
  const tipX = swordStartX + bladeLen;

  // ── 1. Hilt Handle (Tsuka) with Authentic Red Rayskin & Black Diamond Wrap ──
  const hiltStartX = swordStartX - 32;
  const hiltLen = 32;
  const hiltHalfW = 3.4;

  // 1a. Base Red Rayskin (Samegawa)
  ctx.fillStyle = '#A31313';
  ctx.fillRect(hiltStartX, -hiltHalfW, hiltLen, hiltHalfW * 2);
  
  const sameGrad = ctx.createLinearGradient(hiltStartX, -hiltHalfW, hiltStartX, hiltHalfW);
  sameGrad.addColorStop(0, '#7A0C0C');
  sameGrad.addColorStop(0.5, '#D32020');
  sameGrad.addColorStop(1, '#5C0808');
  ctx.fillStyle = sameGrad;
  ctx.fillRect(hiltStartX, -hiltHalfW + 0.4, hiltLen, (hiltHalfW * 2) - 0.8);

  // 1b. Black Silk Ito Wrap (Top & Bottom Edges)
  ctx.fillStyle = '#0D0D11';
  ctx.fillRect(hiltStartX, -hiltHalfW, hiltLen, 1.1);
  ctx.fillRect(hiltStartX, hiltHalfW - 1.1, hiltLen, 1.1);

  // 1c. Crisp Red Diamond Lozenges (◆ ◆ ◆ ◆ ◆ ◆) along the handle center
  const diamonds = [
    hiltStartX + 3.8,
    hiltStartX + 9.2,
    hiltStartX + 14.6,
    hiltStartX + 20.0,
    hiltStartX + 25.4,
    hiltStartX + 30.0
  ];
  for (let i = 0; i < diamonds.length; i++) {
    const cx = diamonds[i];
    // Black diagonal cross bands flanking the diamond
    ctx.fillStyle = '#0D0D11';
    ctx.beginPath();
    ctx.moveTo(cx - 2.6, -hiltHalfW);
    ctx.lineTo(cx, 0);
    ctx.lineTo(cx - 2.6, hiltHalfW);
    ctx.lineTo(cx - 3.8, hiltHalfW);
    ctx.lineTo(cx - 1.2, 0);
    ctx.lineTo(cx - 3.8, -hiltHalfW);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 2.6, -hiltHalfW);
    ctx.lineTo(cx, 0);
    ctx.lineTo(cx + 2.6, hiltHalfW);
    ctx.lineTo(cx + 3.8, hiltHalfW);
    ctx.lineTo(cx + 1.2, 0);
    ctx.lineTo(cx + 3.8, -hiltHalfW);
    ctx.closePath();
    ctx.fill();

    // Vivid red diamond core
    ctx.fillStyle = '#E61E1E';
    ctx.beginPath();
    ctx.moveTo(cx, -1.8);
    ctx.lineTo(cx + 1.7, 0);
    ctx.lineTo(cx, 1.8);
    ctx.lineTo(cx - 1.7, 0);
    ctx.closePath();
    ctx.fill();

    // Hot scarlet diamond center highlight
    ctx.fillStyle = '#FF5252';
    ctx.beginPath();
    ctx.moveTo(cx, -0.9);
    ctx.lineTo(cx + 0.9, 0);
    ctx.lineTo(cx, 0.9);
    ctx.lineTo(cx - 0.9, 0);
    ctx.closePath();
    ctx.fill();
  }

  // 1d. Handle Border Outlines
  ctx.strokeStyle = '#050508';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(hiltStartX, -hiltHalfW, hiltLen, hiltHalfW * 2);

  // 1e. Pommel Cap (Kashira) & Iron Ring (Sarute)
  ctx.fillStyle = '#08080C';
  ctx.fillRect(hiltStartX - 2.8, -hiltHalfW - 0.3, 3.0, (hiltHalfW * 2) + 0.6);
  ctx.strokeStyle = '#1F1F28';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(hiltStartX - 2.8, -hiltHalfW - 0.3, 3.0, (hiltHalfW * 2) + 0.6);

  // Iron Sarute ring loop at pommel end
  const ringX = hiltStartX - 4.2;
  ctx.beginPath();
  ctx.arc(ringX, 0, 2.2, 0, Math.PI * 2);
  ctx.strokeStyle = '#14141A';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // ── 2. Broken Black Chain (Kusari) with 3D Linked Loops (Natural Hanging Catenary Drape) ──
  if (!opts.skipChain) {
    const ringX = hiltStartX - 4.2;
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const breathe = Math.sin(now * 0.0025) * 0.8;
    
    // Natural hanging catenary drape under gravity with subtle breathing sway
    const chainLinks = [];
    const linkCount = 13;
    const isBankaiStance = Boolean(opts.isBankaiStance || opts.isChampionScreen);

    if (isBankaiStance) {
      // In Bankai Champion stance (swingAngle = 2.65, scale(1, -1)), hang chain straight downwards under gravity!
      const downX = Math.sin(2.65);  // ~ +0.4728
      const downY = -Math.cos(2.65); // ~ +0.8811
      const perpDownX = downY;       // ~ +0.8811
      const perpDownY = -downX;      // ~ -0.4728

      for (let i = 0; i < linkCount; i++) {
        const t = i / (linkCount - 1);
        const hangLen = 28.0;
        const catenarySway = Math.sin(t * Math.PI) * (2.2 + breathe);
        const cx = ringX + t * hangLen * downX + catenarySway * perpDownX;
        const cy = 0 + t * hangLen * downY + catenarySway * perpDownY;
        const baseAng = Math.atan2(downY, downX);
        const swayAng = Math.cos(t * Math.PI) * 0.20;
        chainLinks.push({ x: cx, y: cy, ang: baseAng + swayAng });
      }
    } else {
      for (let i = 0; i < linkCount; i++) {
        const t = i / (linkCount - 1);
        const cx = ringX - t * 30.0;
        const cy = Math.sin(t * Math.PI) * (14.0 + breathe) + t * 4.0;
        const ang = Math.cos(t * Math.PI) * 0.85 - 0.25;
        chainLinks.push({ x: cx, y: cy, ang: ang });
      }
    }

    ctx.save();
    for (let c = 0; c < chainLinks.length; c++) {
      const cl = chainLinks[c];
      ctx.save();
      ctx.translate(cl.x, cl.y);
      ctx.rotate(cl.ang);

      // Chain link outer loop
      const isOdd = (c % 2 === 1);
      const linkRx = 2.7;
      const linkRy = isOdd ? 1.0 : 1.6;

      ctx.beginPath();
      ctx.ellipse(0, 0, linkRx, linkRy, 0, 0, Math.PI * 2);
      ctx.strokeStyle = isMask ? '#5A1212' : '#0D0D12';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Specular metallic gleam
      ctx.beginPath();
      ctx.ellipse(-0.3, -0.3, linkRx * 0.65, linkRy * 0.5, 0, -Math.PI * 0.75, -Math.PI * 0.15);
      ctx.strokeStyle = isMask ? 'rgba(255, 60, 0, 0.65)' : 'rgba(135, 140, 165, 0.55)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }

  // ── 3. Blade Collar (Habaki) ──
  ctx.fillStyle = '#16161D';
  ctx.fillRect(swordStartX - 0.5, -3.5, 5.8, 7.0);
  ctx.strokeStyle = '#2B2B38';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(swordStartX - 0.5, -3.5, 5.8, 7.0);

  // ── 4. Slender Pitch-Black Katana Blade with Authentic Katana Sori Curvature & 3 Serrated Fin Steps ──
  const fin1StartX = swordStartX + 52;
  const fin2StartX = swordStartX + 66;
  const fin3StartX = swordStartX + 80;

  // Sori (Curvature) function: smooth upward katana arch toward Kissaki tip
  const getSori = (x) => {
    const t = Math.max(0, Math.min(1.0, (x - bladeBaseX) / (tipX - bladeBaseX)));
    return -Math.pow(t, 1.45) * 8.5;
  };

  const tipY = getSori(tipX); // -8.5

  // 4a. Blade Silhouette Path (with authentic upward Sori curvature and 3 stepped fins on the spine)
  ctx.beginPath();
  // Cutting edge (smooth curved top edge at -Y)
  ctx.moveTo(bladeBaseX, -2.8);
  ctx.quadraticCurveTo(swordStartX + 50, getSori(swordStartX + 50) - 2.8, tipX, tipY); // Needle sharp kissaki tip

  // Spine edge with 3 stepped fins (+Y side, trailing below following the sori curve)
  ctx.quadraticCurveTo(swordStartX + 87, getSori(swordStartX + 87) + 3.2, fin3StartX + 2.2, getSori(fin3StartX) + 5.3);

  // Fin 3 (nearest tip)
  ctx.lineTo(fin2StartX + 12.2, getSori(fin2StartX + 12.2) + 2.5);
  ctx.lineTo(fin2StartX + 10.5, getSori(fin2StartX + 10.5) + 4.3);
  ctx.lineTo(fin2StartX + 2.2, getSori(fin2StartX) + 5.1);

  // Fin 2
  ctx.lineTo(fin1StartX + 12.2, getSori(fin1StartX + 12.2) + 2.7);
  ctx.lineTo(fin1StartX + 10.5, getSori(fin1StartX + 10.5) + 4.3);
  ctx.lineTo(fin1StartX + 2.2, getSori(fin1StartX) + 4.9);

  // Fin 1 (nearest guard)
  ctx.lineTo(fin1StartX, getSori(fin1StartX) + 2.8);
  ctx.lineTo(bladeBaseX, 2.8);
  ctx.closePath();

  // 4b. Dark Obsidian Blade Body Fill
  const bladeGrad = ctx.createLinearGradient(bladeBaseX, -2.8, bladeBaseX, 5.8);
  bladeGrad.addColorStop(0, '#0C0C10');
  bladeGrad.addColorStop(0.42, '#14141A');
  bladeGrad.addColorStop(0.45, '#1A1A22');
  bladeGrad.addColorStop(0.85, '#22222E');
  bladeGrad.addColorStop(1, '#111116');
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  // 4c. Shinogi Ridge Line (Katana bevel separation line along curved spine)
  ctx.beginPath();
  ctx.moveTo(bladeBaseX, 0.0);
  ctx.quadraticCurveTo(swordStartX + 50, getSori(swordStartX + 50), tipX - 2.5, tipY + 0.4);
  ctx.strokeStyle = 'rgba(75, 80, 100, 0.50)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4d. Razor Cutting Edge Polished Steel / Crimson Highlight
  ctx.beginPath();
  ctx.moveTo(bladeBaseX, -2.4);
  ctx.quadraticCurveTo(swordStartX + 50, getSori(swordStartX + 50) - 2.4, tipX, tipY);
  ctx.strokeStyle = isMask ? 'rgba(255, 60, 0, 0.90)' : 'rgba(200, 215, 235, 0.80)';
  ctx.lineWidth = isMask ? 1.2 : 0.95;
  ctx.stroke();

  // 4e. Fin Step Accent Highlights (Metallic highlights on the 3 stepped notches)
  ctx.beginPath();
  // Fin 1 edge
  ctx.moveTo(fin1StartX, getSori(fin1StartX) + 2.8);
  ctx.lineTo(fin1StartX + 2.2, getSori(fin1StartX) + 4.9);
  ctx.lineTo(fin1StartX + 10.5, getSori(fin1StartX + 10.5) + 4.3);
  // Fin 2 edge
  ctx.moveTo(fin2StartX, getSori(fin2StartX) + 2.7);
  ctx.lineTo(fin2StartX + 2.2, getSori(fin2StartX) + 5.1);
  ctx.lineTo(fin2StartX + 10.5, getSori(fin2StartX + 10.5) + 4.3);
  // Fin 3 edge
  ctx.moveTo(fin3StartX, getSori(fin3StartX) + 2.5);
  ctx.lineTo(fin3StartX + 2.2, getSori(fin3StartX) + 5.3);
  ctx.quadraticCurveTo(swordStartX + 87, getSori(swordStartX + 87) + 3.2, tipX, tipY);
  ctx.strokeStyle = isMask ? 'rgba(255, 90, 20, 0.80)' : 'rgba(130, 140, 170, 0.65)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4f. Crisp Outer Silhouette Outline
  ctx.beginPath();
  ctx.moveTo(bladeBaseX, -2.8);
  ctx.quadraticCurveTo(swordStartX + 50, getSori(swordStartX + 50) - 2.8, tipX, tipY);
  ctx.quadraticCurveTo(swordStartX + 87, getSori(swordStartX + 87) + 3.2, fin3StartX + 2.2, getSori(fin3StartX) + 5.3);
  ctx.lineTo(fin2StartX + 12.2, getSori(fin2StartX + 12.2) + 2.5);
  ctx.lineTo(fin2StartX + 10.5, getSori(fin2StartX + 10.5) + 4.3);
  ctx.lineTo(fin2StartX + 2.2, getSori(fin2StartX) + 5.1);
  ctx.lineTo(fin1StartX + 12.2, getSori(fin1StartX + 12.2) + 2.7);
  ctx.lineTo(fin1StartX + 10.5, getSori(fin1StartX + 10.5) + 4.3);
  ctx.lineTo(fin1StartX + 2.2, getSori(fin1StartX) + 4.9);
  ctx.lineTo(fin1StartX, getSori(fin1StartX) + 2.8);
  ctx.lineTo(bladeBaseX, 2.8);
  ctx.closePath();
  ctx.strokeStyle = '#050508';
  ctx.lineWidth = 0.95;
  ctx.stroke();

  // ── 5. Handguard / Tsuba (Authentic 4-Pronged Manji 卍) ──
  ctx.fillStyle = '#08080C';
  ctx.strokeStyle = '#1F1F2A';
  ctx.lineWidth = 0.8;

  // Center hub
  ctx.fillRect(swordStartX - 2.8, -4.8, 5.6, 9.6);

  // Top Arm (-Y) with right-hook (+X)
  ctx.fillRect(swordStartX - 2.0, -12.8, 4.0, 8.5);
  ctx.fillRect(swordStartX + 1.5, -12.8, 6.2, 4.0);

  // Bottom Arm (+Y) with left-hook (-X)
  ctx.fillRect(swordStartX - 2.0, 4.3, 4.0, 8.5);
  ctx.fillRect(swordStartX - 7.7, 8.8, 6.2, 4.0);

  // Front/Right Arm (+X) with down-hook (+Y)
  ctx.fillRect(swordStartX + 2.8, -2.0, 7.5, 4.0);
  ctx.fillRect(swordStartX + 6.3, 1.5, 4.0, 6.0);

  // Back/Left Arm (-X) with up-hook (-Y)
  ctx.fillRect(swordStartX - 10.3, -2.0, 7.5, 4.0);
  ctx.fillRect(swordStartX - 10.3, -7.5, 4.0, 6.0);

  // Manji Outline & Edge Bevels
  ctx.beginPath();
  ctx.moveTo(swordStartX - 2.0, -4.8);
  ctx.lineTo(swordStartX - 2.0, -12.8);
  ctx.lineTo(swordStartX + 7.7, -12.8);
  ctx.lineTo(swordStartX + 7.7, -8.8);
  ctx.lineTo(swordStartX + 2.0, -8.8);
  ctx.lineTo(swordStartX + 2.0, -2.0);
  ctx.lineTo(swordStartX + 10.3, -2.0);
  ctx.lineTo(swordStartX + 10.3, 7.5);
  ctx.lineTo(swordStartX + 6.3, 7.5);
  ctx.lineTo(swordStartX + 6.3, 2.0);
  ctx.lineTo(swordStartX + 2.0, 2.0);
  ctx.lineTo(swordStartX + 2.0, 12.8);
  ctx.lineTo(swordStartX - 7.7, 12.8);
  ctx.lineTo(swordStartX - 7.7, 8.8);
  ctx.lineTo(swordStartX - 2.0, 8.8);
  ctx.lineTo(swordStartX - 2.0, 2.0);
  ctx.lineTo(swordStartX - 10.3, 2.0);
  ctx.lineTo(swordStartX - 10.3, -7.5);
  ctx.lineTo(swordStartX - 6.3, -7.5);
  ctx.lineTo(swordStartX - 6.3, -2.0);
  ctx.lineTo(swordStartX - 2.0, -2.0);
  ctx.closePath();
  ctx.stroke();
}

/**
 * Draws a visible, atmospheric Kuroi Reiatsu smoke aura emitting from Tensa Zangetsu during Bankai.
 * Dark smoke wisps with glowing crimson inner embers curl off the blade spine,
 * creating a menacing living weapon feel clearly visible during arena combat.
 */
export function drawBankaiSwordOrbitingAura(ctx, swordStartX, swordLen = 94, isMask = false, isFrozen = false) {
  // Live Bankai sword aura effect removed per user request
  return;
}

export function drawTensaZangetsu(ctx, x, y, angle, r, opts = {}) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const img = _getBankaiSwordImage();
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const s = 0.18;
    ctx.scale(s, s);
    ctx.drawImage(img, -410, -78.5);
    ctx.restore();
    ctx.restore();
    return;
  }

  const scale = opts.scale || 1.15;
  ctx.scale(scale, scale);

  const swordStartX = r * 0.7;
  drawTensaZangetsuKatana(ctx, swordStartX, Boolean(opts.isMask), opts);

  const isChampionScreen = Boolean(opts.isWinnerReveal || (typeof state !== 'undefined' && state.gameState === 'champion'));
  const isBattleState = (typeof state !== 'undefined' && state.gameState === 'playing');
  if (opts.showAura === true && !isChampionScreen && isBattleState) {
    drawBankaiSwordOrbitingAura(ctx, swordStartX, opts.bladeLen || 94, Boolean(opts.isMask), false);
  }

  ctx.restore();
}

/**
 * Draws Ichigo's signature Crescent Blade Slash Arc (Rule 15 Compliant).
 * Renders in world coordinates underneath/around the blade during active basic chops.
 * Form-specific palettes:
 *  - Shikai: Silver steel with sky-blue/cyan Reiatsu glow
 *  - Bankai: Deep Getsuga black void core with electric cyan Reiatsu edge
 *  - Hollow Mask: Black void core with flaming crimson/orange edge
 *  - Vasto Lorde: Demonic pitch-black core with blazing blood-red trim
 */
export function drawIchigoSlashArc(ctx, fighter) {
  if (!fighter || fighter.slashSwingTimer <= 0 || fighter.isGetsugaSlash || fighter.isChannelingGetsuga || fighter.isChannelingBankai || (fighter.shikaiReversionBurstTimer && fighter.shikaiReversionBurstTimer > 0)) return;

  const isFrozen = Boolean(
    fighter.isFrozenByInfinity ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) ||
    (fighter.electricStunTimer && fighter.electricStunTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    (fighter.hitStunTimer && fighter.hitStunTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isGrabbedByMahoraga ||
    fighter.isParalyzedByMahoraga ||
    fighter.isWallSlammed ||
    fighter.wallSlamPinnedX !== undefined ||
    fighter.isTargetOfAmbush
  );
  if (isFrozen) return;

  const maxT = fighter.slashSwingMaxTimer || 22;
  const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT)));

  const r = fighter.r || 25;
  const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const facingLeft = Math.abs(baseAngle) > Math.PI / 2;

  const isMask = Boolean(fighter.hollowMaskActive);
  const isBankai = Boolean(fighter.bankaiActive || fighter.skin === 'bankai');
  const isShikai = !isBankai;

  // Arc angles matching the exact sword rotation span (top-to-bottom downward power chop)
  const startOffset = -1.35; // ~ -77 degrees (upper-left chamber)
  const endOffset = 1.20;   // ~ +69 degrees (lower-right follow-through)

  let currentTipOffset = startOffset;
  let currentTailOffset = startOffset;
  let trailAlpha = 1.0;

  const windupCutoff = 0.10;
  const cutCutoff = 0.55;

  if (rawProgress < windupCutoff) {
    // Brief windup anticipation (trail hidden)
    return;
  } else if (rawProgress < cutCutoff) {
    // Active Cutting Phase: crescent expands with buttery cubic Hermite ease
    const t = (rawProgress - windupCutoff) / (cutCutoff - windupCutoff);
    const eased = t * t * (3 - 2 * t);
    currentTipOffset = startOffset + eased * (endOffset - startOffset);
    currentTailOffset = startOffset;
    trailAlpha = Math.sin(Math.min(1.0, t * 1.5) * (Math.PI / 2));
  } else {
    // Recovery Phase: Tip stays locked at final follow-through angle while tail cleanly erases
    const recP = (rawProgress - cutCutoff) / (1.0 - cutCutoff);
    const easedRec = 0.5 + 0.5 * Math.cos(recP * Math.PI);
    currentTipOffset = endOffset;
    currentTailOffset = endOffset - (endOffset - startOffset) * easedRec;
    trailAlpha = Math.sin((1.0 - recP) * (Math.PI / 2));
  }

  if (trailAlpha <= 0.01 || Math.abs(currentTipOffset - currentTailOffset) < 0.04) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(baseAngle);

  // Mirror vertically when aiming left so swing remains top-to-bottom
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const P = 2.4; // Pixel art grid scale
  const outerRadius = r + (isMask ? 76 : (isShikai ? 80 : 70));
  const maxThick = isMask ? 25.0 : (isShikai ? 27.0 : 23.0);
  const totalAngle = Math.abs(currentTipOffset - currentTailOffset);
  const arcSteps = Math.max(16, Math.round((totalAngle * outerRadius) / (P * 1.5)));

  // Pass 1: Pixel-Art Dark Ink / Void Outline Shell (Luminous in Dark Mode)
  const isDarkMode = Boolean(typeof state !== 'undefined' && (state.arenaTheme === 'dark' || state.darkMode || (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))));

  let outlineCol = `rgba(0, 20, 58, ${0.92 * trailAlpha})`;
  if (isDarkMode) {
    if (isMask && isBankai) outlineCol = `rgba(220, 38, 38, ${0.98 * trailAlpha})`;
    else if (isMask) outlineCol = `rgba(234, 88, 12, ${0.95 * trailAlpha})`;
    else if (isBankai) outlineCol = `rgba(220, 38, 38, ${0.98 * trailAlpha})`;
    else outlineCol = `rgba(2, 132, 199, ${0.92 * trailAlpha})`;
  } else {
    if (isMask && isBankai) outlineCol = `rgba(18, 0, 4, ${0.98 * trailAlpha})`;
    else if (isMask) outlineCol = `rgba(18, 5, 5, ${0.95 * trailAlpha})`;
    else if (isBankai) outlineCol = `rgba(8, 2, 4, ${0.98 * trailAlpha})`;
  }

  ctx.fillStyle = outlineCol;
  for (let i = 0; i <= arcSteps; i++) {
    const t = i / arcSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.26 + 0.74 * t);
    const rad = outerRadius + taper * 2.0;
    const thick = (maxThick * taper) + P * 2;
    const innerRad = rad - thick;

    const numRadSteps = Math.max(2, Math.round(thick / P));
    for (let ri = 0; ri <= numRadSteps; ri++) {
      const currentR = innerRad + (ri / numRadSteps) * thick;
      const rawX = Math.cos(ang) * currentR;
      const rawY = Math.sin(ang) * currentR;
      const px = Math.round(rawX / P) * P;
      const py = Math.round(rawY / P) * P;
      ctx.fillRect(px, py, P, P);
    }
  }

  // Pass 2: Stepped Pixel Reiatsu Core Body
  for (let i = 0; i <= arcSteps; i++) {
    const t = i / arcSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.26 + 0.74 * t);
    const rad = outerRadius + taper * 1.0;
    const thick = maxThick * taper;
    const innerRad = rad - thick;

    const numRadSteps = Math.max(1, Math.round(thick / P));
    for (let ri = 0; ri <= numRadSteps; ri++) {
      const rNorm = ri / numRadSteps; // 0 = inner, 1 = outer edge
      const currentR = innerRad + rNorm * thick;
      const rawX = Math.cos(ang) * currentR;
      const rawY = Math.sin(ang) * currentR;
      const px = Math.round(rawX / P) * P;
      const py = Math.round(rawY / P) * P;

      let col;
      if (isMask && isBankai) {
        if (rNorm > 0.85) col = '#FFFFFF';
        else if (rNorm > 0.6) col = isDarkMode ? '#FF4D6D' : '#FF2832';
        else if (rNorm > 0.3) col = isDarkMode ? '#FF1E28' : '#8B0000';
        else col = isDarkMode ? '#E11D48' : '#080003';
      } else if (isMask) {
        if (rNorm > 0.85) col = '#FFFFFF';
        else if (rNorm > 0.6) col = isDarkMode ? '#FFD000' : '#FFAA00';
        else if (rNorm > 0.3) col = isDarkMode ? '#FF4500' : '#FF2814';
        else col = isDarkMode ? '#EA580C' : '#180505';
      } else if (isBankai) {
        if (rNorm > 0.85) col = '#FFFFFF';
        else if (rNorm > 0.6) col = isDarkMode ? '#FF4D6D' : '#FF1E28';
        else if (rNorm > 0.3) col = isDarkMode ? '#FF1E28' : '#8B0014';
        else col = isDarkMode ? '#DC2626' : '#080204';
      } else {
        // Shikai Azure
        if (rNorm > 0.85) col = '#FFFFFF';
        else if (rNorm > 0.6) col = '#E0FFFF';
        else if (rNorm > 0.3) col = '#00E5FF';
        else col = '#0055DD';
      }

      ctx.fillStyle = col;
      ctx.fillRect(px, py, P, P);
    }

    // Pass 3: Leading Razor White Cutting Edge Pixels
    const leadRawX = Math.cos(ang) * (outerRadius + taper * 1.0);
    const leadRawY = Math.sin(ang) * (outerRadius + taper * 1.0);
    const lpx = Math.round(leadRawX / P) * P;
    const lpy = Math.round(leadRawY / P) * P;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(lpx, lpy, P, P);
  }

  // Pass 4: Trailing Reiatsu Pixel Sparks
  const numEmbers = 8;
  for (let eb = 0; eb < numEmbers; eb++) {
    const ebT = (eb / numEmbers + (Date.now() / 300)) % 1.0;
    const ebAng = currentTailOffset + ebT * (currentTipOffset - currentTailOffset);
    const ebDist = outerRadius - 10 - eb * 4;
    const ex = Math.round((Math.cos(ebAng) * ebDist) / P) * P;
    const ey = Math.round((Math.sin(ebAng) * ebDist) / P) * P;
    let col = '#FFFFFF';
    if (isMask && isBankai) col = (eb % 2 === 0) ? '#FF1E28' : '#FFFFFF';
    else if (isMask) col = (eb % 2 === 0) ? '#FFAA00' : '#FF2814';
    else if (isBankai) col = (eb % 2 === 0) ? '#FF1E28' : '#FFFFFF';
    else col = (eb % 2 === 0) ? '#00E5FF' : '#FFFFFF';

    ctx.fillStyle = col;
    ctx.fillRect(ex, ey, P, P);
  }

  ctx.restore();
}

