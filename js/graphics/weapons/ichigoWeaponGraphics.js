import { state } from '../../core/state.js';

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

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  const scaleMult = isFinal ? 2.85 : ((isBankaiHollow || isShikaiHollow) ? 2.15 : (isBankai ? 1.95 : 1.85));
  ctx.scale(scale * scaleMult, scale * scaleMult);

  // ── Exact Crescent Parameters ──
  const R = isFinal ? 84 : ((isBankaiHollow || isShikaiHollow) ? 62 : (isBankai ? 54 : 56));
  const maxThick = isFinal ? 30 : ((isBankaiHollow || isShikaiHollow) ? 22 : (isBankai ? 19 : 20));
  const halfAngle = isFinal ? (0.70 * Math.PI) : ((isBankaiHollow || isShikaiHollow) ? (0.66 * Math.PI) : (0.64 * Math.PI));
  const px = 2.5; // Grid-snapped pixel unit

  // ── Palette Definition ──
  let cBorder, cSaturated, cBright, cCore, cAura, isDarkCore;

  if (isInfinityFrozen) {
    cBorder    = '#001a44';
    cSaturated = '#0055dd';
    cBright    = '#00e5ff';
    cCore      = '#ffffff';
    cAura      = `rgba(0, 229, 255, ${(0.35 * alpha).toFixed(2)})`;
    isDarkCore = false;
  } else if (isFinal) {
    cBorder    = '#200005';
    cSaturated = '#0a0002'; // Void core
    cBright    = '#ff1133';
    cCore      = '#ffffff';
    cAura      = `rgba(255, 20, 60, ${(0.35 * alpha).toFixed(2)})`;
    isDarkCore = true;
  } else if (isBankaiHollow) {
    cBorder    = '#180004';
    cSaturated = '#050002'; // Void core
    cBright    = '#ff2244';
    cCore      = '#ffffff';
    cAura      = `rgba(255, 30, 60, ${(0.35 * alpha).toFixed(2)})`;
    isDarkCore = true;
  } else if (isShikaiHollow) {
    cBorder    = '#020814';
    cSaturated = '#061020'; // Dark cyan void
    cBright    = '#00f0ff';
    cCore      = '#ffffff';
    cAura      = `rgba(0, 240, 255, ${(0.35 * alpha).toFixed(2)})`;
    isDarkCore = true;
  } else if (isBankai) {
    cBorder    = '#220008';
    cSaturated = '#080206'; // Void black core
    cBright    = '#ff1e32';
    cCore      = '#ffffff';
    cAura      = `rgba(220, 20, 40, ${(0.32 * alpha).toFixed(2)})`;
    isDarkCore = true;
  } else { // Standard Shikai
    cBorder    = '#00143a';
    cSaturated = '#0066ee';
    cBright    = '#00e5ff';
    cCore      = '#ffffff';
    cAura      = `rgba(0, 180, 255, ${(0.32 * alpha).toFixed(2)})`;
    isDarkCore = false;
  }

  // ── 1. Stepped Atmosphere Pixel Aura ──
  const auraR = R + px * 2.0;
  ctx.fillStyle = cAura;
  for (let a = -halfAngle; a <= halfAngle; a += 0.05) {
    const sx = Math.round((Math.cos(a) * auraR) / px) * px;
    const sy = Math.round((Math.sin(a) * auraR) / px) * px;
    ctx.fillRect(sx, sy, px, px);
  }

  // ── 2. Stepped High-Contrast Dark Border Perimeter ──
  ctx.fillStyle = cBorder;
  const numSteps = 32;
  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfAngle;
    const sx = Math.round((Math.cos(ang) * (R + px * 0.8)) / px) * px;
    const sy = Math.round((Math.sin(ang) * (R + px * 0.8)) / px) * px;
    ctx.fillRect(sx, sy, px, px);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfAngle;
    const taper = Math.cos(t * (Math.PI / 2));
    const inR = R - maxThick * Math.pow(taper, 1.32) - px;
    const sx = Math.round((Math.cos(ang) * inR) / px) * px;
    const sy = Math.round((Math.sin(ang) * inR) / px) * px;
    ctx.fillRect(sx, sy, px, px);
  }

  // ── 3. Dense Stepped Crescent Body Grid ──
  const minX = Math.floor((Math.cos(halfAngle) * R - maxThick) / px) * px;
  const maxX = Math.ceil(R / px) * px;
  const maxY = Math.ceil((Math.sin(halfAngle) * R) / px) * px;

  for (let gy = -maxY; gy <= maxY; gy += px) {
    for (let gx = minX; gx <= maxX; gx += px) {
      const dist = Math.sqrt(gx * gx + gy * gy);
      const ang = Math.atan2(gy, gx);

      if (Math.abs(ang) <= halfAngle) {
        const t = ang / halfAngle;
        const taper = Math.cos(t * (Math.PI / 2));
        const inR = R - maxThick * Math.pow(taper, 1.32);

        if (dist >= inR && dist <= R) {
          const depthFromApex = R - dist; // 0 at leading edge, maxThick at back

          if (depthFromApex < px * 1.3) {
            ctx.fillStyle = cCore; // Razor-sharp white-hot leading edge
          } else if (depthFromApex < px * 3.2) {
            ctx.fillStyle = cBright; // Saturated electric energy rim
          } else {
            ctx.fillStyle = isDarkCore ? cSaturated : ((Math.round(gx / px) + Math.round(gy / px)) % 2 === 0 ? cSaturated : cBright);
          }
          ctx.fillRect(Math.round(gx), Math.round(gy), px, px);
        }
      }
    }
  }

  // ── 4. Leading Apex Stepped Pixel Diamond Flare ──
  const apexX = Math.round(R / px) * px;
  ctx.fillStyle = cCore;
  ctx.fillRect(apexX - px * 0.5, -px * 0.5, px, px);
  ctx.fillRect(apexX - px * 2, -px * 0.5, px * 4, px);
  ctx.fillRect(apexX - px * 0.5, -px * 2, px, px * 4);

  // ── 5. Trailing Stepped Pixel Sparkles (3 Dynamic Motes) ──
  for (let s = 0; s < 3; s++) {
    const sSeed = s * 73.1 + qTime * 0.006;
    const sAng = (Math.sin(sSeed) * halfAngle * 0.7);
    const sT = Math.cos((sAng / halfAngle) * (Math.PI / 2));
    const sInR = R - maxThick * Math.pow(sT, 1.32) - (px * (2 + (s % 3) * 2));
    const sx = Math.round((Math.cos(sAng) * sInR) / px) * px;
    const sy = Math.round((Math.sin(sAng) * sInR) / px) * px;

    ctx.fillStyle = s % 2 === 0 ? cCore : cBright;
    ctx.fillRect(sx, sy, px, px);
  }

  ctx.restore();
}

export function drawCeroBeam(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Outer red energy column (cero width reads from config, default 80px)
  const beamWidth = 60;
  const beamLength = 400; // Large visual column

  // Outer Crimson Glow
  const grad = ctx.createLinearGradient(0, -beamWidth, 0, beamWidth);
  grad.addColorStop(0, 'rgba(139, 0, 0, 0)');
  grad.addColorStop(0.3, `rgba(255, 10, 10, ${0.8 * lifeRatio})`);
  grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * lifeRatio})`); // white hot core
  grad.addColorStop(0.7, `rgba(255, 10, 10, ${0.8 * lifeRatio})`);
  grad.addColorStop(1.0, 'rgba(139, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(-50, -beamWidth, beamLength + 50, beamWidth * 2);

  // Add round energy sparks/circles on the beam tip
  ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * lifeRatio})`;
  ctx.beginPath();
  ctx.arc(beamLength, 0, beamWidth * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(220, 10, 10, ${0.75 * lifeRatio})`;
  ctx.beginPath();
  ctx.arc(beamLength, 0, beamWidth * 0.9, 0, Math.PI * 2);
  ctx.fill();

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
  if (!fighter || fighter.slashSwingTimer <= 0 || fighter.isGetsugaSlash || fighter.isChannelingGetsuga || fighter.isChannelingBankai || fighter.isFrozenByInfinity || (fighter.timeStopTimer && fighter.timeStopTimer > 0) || (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0)) return;

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

  const outerRadius = r + (isMask ? 76 : (isShikai ? 80 : 70));
  const maxThick = isMask ? 25.0 : (isShikai ? 27.0 : 23.0);
  const numSteps = 32;

  // 1. Pass 1: Spiritual Pressure / Reiatsu Outer Soft Glow Bloom
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius + taper * 5.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius - (maxThick * taper) - taper * 4.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (isMask && isBankai) {
    ctx.fillStyle = `rgba(255, 20, 50, ${0.60 * trailAlpha})`;
  } else if (isMask) {
    ctx.fillStyle = `rgba(255, 40, 20, ${0.52 * trailAlpha})`;
  } else if (isBankai) {
    ctx.fillStyle = `rgba(220, 20, 30, ${0.52 * trailAlpha})`;
  } else {
    ctx.fillStyle = `rgba(0, 191, 255, ${0.45 * trailAlpha})`;
  }
  ctx.fill();

  // 2. Pass 2: High-Density Core Blade Crescent Polygon
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius + taper * 1.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius - (maxThick * taper);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (isMask && isBankai) {
    ctx.fillStyle = `rgba(8, 0, 3, ${0.98 * trailAlpha})`;
  } else if (isMask) {
    ctx.fillStyle = `rgba(18, 5, 5, ${0.95 * trailAlpha})`;
  } else if (isBankai) {
    ctx.fillStyle = `rgba(8, 2, 4, ${0.98 * trailAlpha})`;
  } else {
    ctx.fillStyle = `rgba(242, 246, 255, ${0.96 * trailAlpha})`;
  }
  ctx.fill();

  // 3. Pass 3: Brilliant Cutting Edge Highlight Line
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius - (maxThick * taper * 0.15);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  if (isMask && isBankai) {
    ctx.strokeStyle = `rgba(255, 40, 30, ${0.98 * trailAlpha})`;
    ctx.lineWidth = 2.2;
  } else if (isMask) {
    ctx.strokeStyle = `rgba(255, 120, 0, ${0.88 * trailAlpha})`;
    ctx.lineWidth = 2.0;
  } else if (isBankai) {
    ctx.strokeStyle = `rgba(255, 30, 20, ${0.95 * trailAlpha})`;
    ctx.lineWidth = 2.0;
  } else {
    ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 * trailAlpha})`;
    ctx.lineWidth = 2.0;
  }
  ctx.stroke();

  // 4. Pass 4: Dynamic Reiatsu Speed Needles flying from cutting tip
  if (rawProgress >= 0.15 && rawProgress <= 0.50) {
    const sparkT = (rawProgress - 0.15) / 0.35;
    const tipAngle = currentTipOffset;
    const sparkCount = 3;
    ctx.save();
    for (let s = 0; s < sparkCount; s++) {
      const spOffset = (s - 1) * 0.08;
      const spAng = tipAngle + spOffset;
      const spDist = outerRadius + 4 + (s * 3);
      const spLen = 12 + (1 - sparkT) * 10;
      
      const spX1 = Math.cos(spAng) * spDist;
      const spY1 = Math.sin(spAng) * spDist;
      const spX2 = spX1 + Math.cos(spAng + 0.4) * spLen;
      const spY2 = spY1 + Math.sin(spAng + 0.4) * spLen;

      ctx.beginPath();
      ctx.moveTo(spX1, spY1);
      ctx.lineTo(spX2, spY2);

      if (isMask && isBankai) ctx.strokeStyle = (s % 2 === 0) ? `rgba(255, 40, 30, ${0.92 * trailAlpha})` : `rgba(255, 255, 255, ${0.95 * trailAlpha})`;
      else if (isMask) ctx.strokeStyle = `rgba(255, 160, 20, ${0.85 * trailAlpha})`;
      else if (isBankai) ctx.strokeStyle = (s % 2 === 0) ? `rgba(255, 30, 20, ${0.90 * trailAlpha})` : `rgba(255, 240, 240, ${0.95 * trailAlpha})`;
      else ctx.strokeStyle = (s % 2 === 0) ? `rgba(0, 229, 255, ${0.85 * trailAlpha})` : `rgba(255, 255, 255, ${0.90 * trailAlpha})`;

      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

