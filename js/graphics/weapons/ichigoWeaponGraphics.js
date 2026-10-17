import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { getIchigoSwingKinematics } from '../fighters/ichigoSkin.js';

const _GETSUGA_CANVAS_SIZE = 228;
const _GETSUGA_HALF_SIZE = 114;
const _GETSUGA_BASE_R = 94;
const _GETSUGA_FRAME_COUNT = 6;
const _getsugaFrameCache = new Map();

const _GETSUGA_PALETTES = {
  bankai: {
    outerBloomNear: 'rgba(235, 10, 35, 0.78)',
    outerBloomFar: 'rgba(195, 0, 25, 0.28)',
    innerBloom: 'rgba(220, 8, 32, 0.60)',
    wispTip: '#990014',
    wispBody: '#FF1226',
    edgeDark: '#8C0012',
    edgeBright: '#FF0E24',
    bladeCore: '#FFFFFF',
    bladeInnerTooth: '#FF2434',
    splitRim: '#E60020',
    concaveRimDark: '#920012',
    concaveRimBright: '#EB0022',
    fireHot1: '#FF6E1A',
    fireHot2: '#FF4510',
    fireMid: '#E6001E',
    fireDeep: '#8F0012',
    veinCol: '#C8001A',
    coreVoid: '#060104',
    lightningHalo: 'rgba(255, 16, 44, 0.84)',
    afterglowWisp: 'rgba(220, 18, 42, 0.34)',
    lightningCore: '#FFFFFF',
    splinterCol: '#FF1E32'
  },
  hollow: {
    outerBloomNear: 'rgba(235, 10, 35, 0.75)',
    outerBloomFar: 'rgba(195, 0, 25, 0.26)',
    innerBloom: 'rgba(220, 8, 32, 0.56)',
    wispTip: '#990014',
    wispBody: '#FF1226',
    edgeDark: '#8C0012',
    edgeBright: '#FF0E24',
    bladeCore: '#FFFFFF',
    bladeInnerTooth: '#FF2434',
    splitRim: '#E60020',
    concaveRimDark: '#920012',
    concaveRimBright: '#EB0022',
    fireHot1: '#FF6E1A',
    fireHot2: '#FF4510',
    fireMid: '#E6001E',
    fireDeep: '#8F0012',
    veinCol: '#C8001A',
    coreVoid: '#060104',
    lightningHalo: 'rgba(255, 16, 44, 0.84)',
    afterglowWisp: 'rgba(220, 18, 42, 0.34)',
    lightningCore: '#FFFFFF',
    splinterCol: '#FF1E32'
  },
  shikai: {
    outerBloomNear: 'rgba(0, 195, 255, 0.78)',
    outerBloomFar: 'rgba(0, 140, 230, 0.28)',
    innerBloom: 'rgba(0, 180, 255, 0.60)',
    wispTip: '#004499',
    wispBody: '#00D5FF',
    edgeDark: '#003888',
    edgeBright: '#00C8FF',
    bladeCore: '#FFFFFF',
    bladeInnerTooth: '#66ECFF',
    splitRim: '#00B8FF',
    concaveRimDark: '#003E99',
    concaveRimBright: '#00CCFF',
    fireHot1: '#99FFFF',
    fireHot2: '#00F0FF',
    fireMid: '#0099FF',
    fireDeep: '#003C99',
    veinCol: '#0080EE',
    coreVoid: '#020818',
    lightningHalo: 'rgba(0, 210, 255, 0.84)',
    afterglowWisp: 'rgba(0, 185, 255, 0.34)',
    lightningCore: '#FFFFFF',
    splinterCol: '#00D8FF'
  },
  frozen: {
    outerBloomNear: 'rgba(0, 229, 255, 0.75)',
    outerBloomFar: 'rgba(0, 150, 255, 0.26)',
    innerBloom: 'rgba(0, 210, 255, 0.55)',
    wispTip: '#0044AA',
    wispBody: '#00E5FF',
    edgeDark: '#002B66',
    edgeBright: '#00E5FF',
    bladeCore: '#FFFFFF',
    bladeInnerTooth: '#80F2FF',
    splitRim: '#00BFFF',
    concaveRimDark: '#003380',
    concaveRimBright: '#00E5FF',
    fireHot1: '#E0FFFF',
    fireHot2: '#66F0FF',
    fireMid: '#00B8FF',
    fireDeep: '#0044AA',
    veinCol: '#0099FF',
    coreVoid: '#001436',
    lightningHalo: 'rgba(0, 229, 255, 0.84)',
    afterglowWisp: 'rgba(0, 200, 255, 0.34)',
    lightningCore: '#FFFFFF',
    splinterCol: '#00E5FF'
  }
};

function _renderGetsugaFrameToCtx(ctx, pal, frameIdx = 0) {
  const P = (typeof HTMLCanvasElement !== 'undefined') ? 1.0 : 8.0;
  const R_out = _GETSUGA_BASE_R;
  const halfSpan = 0.78 * Math.PI;
  const phase = frameIdx * 0.65;

  const evalCrescent = (rx, ry) => {
    const cx = rx + 12;
    const cy = ry * 1.06;
    const distOut = Math.hypot(cx, cy);
    if (distOut > R_out + 10 || distOut < 16) return null;

    const ang = Math.atan2(cy, cx);
    if (Math.abs(ang) > halfSpan) return null;

    const t = ang / halfSpan;
    const absT = Math.abs(t);

    const tipFade = Math.pow(Math.cos(absT * Math.PI * 0.5), 1.30);
    const bellySkew = 1.0 + 0.22 * Math.sin((t - 0.12) * Math.PI * 0.9);
    const cleanThick = 50.0 * tipFade * bellySkew;

    const depth = R_out - distOut;

    const hookCoord = depth * 0.22 + t * 3.4 - Math.sin(t * 2.0) * 0.8;
    const hookWave1 = Math.sin(hookCoord * 1.7 + phase * 0.35);
    const hookWave2 = Math.sin(hookCoord * 3.1 - t * 2.5 - phase * 0.5);
    const hookShape = Math.pow(Math.max(0, 0.55 * hookWave1 + 0.45 * hookWave2 + 0.35), 1.6);
    const fangExtend = hookShape * 15.5 * Math.pow(Math.max(0, 1.0 - absT * 1.04), 0.72);

    const outerPeelWave = Math.sin(depth * 0.85 - t * 10.5 + phase * 0.5);
    const outerWisp = (outerPeelWave > 0.65 && absT > 0.08 && absT < 0.88)
      ? (outerPeelWave - 0.65) * 6.5 * (1.0 - absT * 0.4)
      : 0;

    const outR = R_out + outerWisp;
    const inR = R_out - cleanThick - fangExtend;

    return {
      distOut, ang, t, absT, tipFade, cleanThick,
      depth, hookCoord, outR, inR
    };
  };

  // 1 & 2. Unified Single-Pass Rasterization: Bloom, Rim & Main Crescent Body
  const maxR2 = (R_out + 12) * (R_out + 12);
  const minR2 = 14 * 14;

  for (let gy = -112; gy <= 112; gy += P) {
    const cy = gy * 1.06;
    const cy2 = cy * cy;
    for (let gx = -112; gx <= 112; gx += P) {
      const cx = gx + 12;
      const d2 = cx * cx + cy2;
      if (d2 > maxR2 || d2 < minR2) continue;

      const info = evalCrescent(gx, gy);
      if (!info) continue;
      const { distOut, t, absT, tipFade, depth, hookCoord, outR, inR } = info;

      if (distOut > outR) {
        const bloomSpan = 2.6 * tipFade;
        if (bloomSpan > 0.25 && distOut <= outR + bloomSpan) {
          const d = distOut - outR;
          ctx.fillStyle = d < bloomSpan * 0.48 ? pal.outerBloomNear : pal.outerBloomFar;
          ctx.fillRect(gx, gy, P, P);
        }
        continue;
      }

      if (distOut < inR) {
        const inBloomSpan = 1.6 * tipFade;
        if (inBloomSpan > 0.25 && distOut >= inR - inBloomSpan && absT < 0.94) {
          ctx.fillStyle = pal.innerBloom;
          ctx.fillRect(gx, gy, P, P);
        }
        continue;
      }

      const totalThick = Math.max(1.0, outR - inR);
      const localNorm = (outR - distOut) / totalThick;

      const bellySwelling = (t > -0.22 && t < 0.68)
        ? Math.pow(Math.sin(((t + 0.22) / 0.90) * Math.PI), 1.25) * 11.5
        : 0;
      const whiteFangWave = Math.sin(hookCoord * 2.4 - t * 2.2 + phase * 0.3);
      const whitePeelSpikes = Math.pow(Math.max(0, whiteFangWave), 1.8) * 5.8 * tipFade;
      const whiteThick = Math.max(1.9, (4.6 + bellySwelling) * Math.pow(tipFade, 0.66) + whitePeelSpikes);

      let col;

      if (distOut > R_out) {
        col = (distOut > outR - 1.0) ? pal.wispTip : pal.wispBody;
      } else if (depth < 1.35) {
        col = (depth < 0.65) ? pal.edgeDark : pal.edgeBright;
      } else if (depth < 1.35 + whiteThick) {
        const splitDepth = 3.2 + (t + 0.64) * 3.8;
        const inUpperSplit = (t > -0.60 && t < -0.04) && Math.abs(depth - splitDepth) < (1.5 * Math.sin(((t + 0.60) / 0.56) * Math.PI));

        const fleck1U = (t - 0.04) / 0.026;
        const fleck1Env = Math.abs(fleck1U) < 1.0 ? Math.sqrt(1.0 - fleck1U * fleck1U) * 1.45 : 0;
        const isFleck1 = fleck1Env > 0 && Math.abs(depth - (6.4 + (t - 0.04) * 18.0)) < fleck1Env;

        const fleck2U = (t - 0.30) / 0.030;
        const fleck2Env = Math.abs(fleck2U) < 1.0 ? Math.sqrt(1.0 - fleck2U * fleck2U) * 1.60 : 0;
        const isFleck2 = fleck2Env > 0 && Math.abs(depth - (7.6 + (t - 0.30) * 18.0)) < fleck2Env;

        if (inUpperSplit) {
          col = Math.abs(depth - splitDepth) < 0.8 ? pal.coreVoid : pal.splitRim;
        } else if (isFleck1 || isFleck2) {
          col = pal.coreVoid;
        } else if (depth > 1.35 + whiteThick - 1.35) {
          col = pal.bladeInnerTooth;
        } else {
          col = pal.bladeCore;
        }
      } else if (localNorm > 0.89) {
        col = (localNorm > 0.95) ? pal.concaveRimDark : pal.concaveRimBright;
      } else {
        const behindWhite = depth - (1.35 + whiteThick);
        const normBehind = behindWhite / Math.max(1.0, totalThick - (1.35 + whiteThick));

        const brushStream = normBehind * 3.4 * Math.PI + t * 3.1 - phase * 0.3;
        const ribbonWave = Math.cos(brushStream) + 0.45 * Math.sin(brushStream * 1.9 - t * 2.4);

        const bellyFireEnv = (t > -0.22 && t < 0.72)
          ? Math.pow(Math.sin(((t + 0.22) / 0.94) * Math.PI), 1.12)
          : 0.12;

        const fireReachNorm = (0.16 + 0.60 * bellyFireEnv) * (0.52 + 0.48 * Math.max(-0.45, ribbonWave));

        const blackSlashCut = (normBehind > 0.22 && normBehind < 0.58) &&
          (Math.sin(hookCoord * 2.9 - t * 3.4 + phase * 0.25) > 0.62);

        const isInnerVein = (normBehind > 0.66 && normBehind < 0.81) &&
          (Math.sin(normBehind * 14.0 + t * 5.0 - phase * 0.4) > 0.42) &&
          (t > -0.55 && t < 0.65);

        if (normBehind < fireReachNorm && !blackSlashCut) {
          const fireDepthRatio = normBehind / Math.max(0.05, fireReachNorm);
          if (bellyFireEnv > 0.42 && fireDepthRatio < 0.54 && ribbonWave > -0.15) {
            col = (fireDepthRatio < 0.28 && ribbonWave > 0.30) ? pal.fireHot1 : pal.fireHot2;
          } else if (fireDepthRatio < 0.78) {
            col = pal.fireMid;
          } else {
            col = pal.fireDeep;
          }
        } else if (isInnerVein) {
          col = pal.veinCol;
        } else {
          col = pal.coreVoid;
        }
      }

      ctx.fillStyle = col;
      ctx.fillRect(gx, gy, P, P);
    }
  }

  // 3. Organic Tapered Floating Flame Droplets in the Concave Hollow
  const wispArcs = [
    { tStart: -0.44, tSpan: 0.11, rExtra: 6 },
    { tStart: -0.31, tSpan: 0.08, rExtra: 12 },
    { tStart:  0.14, tSpan: 0.09, rExtra: 6 }
  ];
  for (const wa of wispArcs) {
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const curT = wa.tStart + u * wa.tSpan;
      const curAng = curT * halfSpan;
      const tipFade = Math.pow(Math.cos(Math.abs(curT) * Math.PI * 0.5), 1.30);
      const bellySkew = 1.0 + 0.22 * Math.sin((curT - 0.12) * Math.PI * 0.9);
      const rPos = R_out - 50.0 * tipFade * bellySkew - wa.rExtra - Math.sin(u * Math.PI) * 2.5;
      const wx = Math.round(Math.cos(curAng) * rPos - 12);
      const wy = Math.round((Math.sin(curAng) * rPos) / 1.06);
      const env = Math.sin(u * Math.PI);
      if (env > 0.25) {
        ctx.fillStyle = pal.concaveRimBright;
        ctx.fillRect(wx - 1, wy - 1, 3, 2);
        if (env > 0.55) {
          ctx.fillStyle = pal.coreVoid;
          ctx.fillRect(wx, wy, 1, 1);
        }
      }
    }
  }

  // 4. Detached Tangential Reiatsu Slash Splinters & Embers
  const numSplinters = 28;
  for (let s = 0; s < numSplinters; s++) {
    const isOuter = (s % 3 !== 0);
    const tPos = -0.82 + ((s * 0.059 + frameIdx * 0.015) % 1.64);
    const ang = tPos * halfSpan;
    const absT = Math.min(1.0, Math.abs(tPos));
    const tipFade = Math.pow(Math.cos(absT * Math.PI * 0.5), 1.30);
    const bellySkew = 1.0 + 0.22 * Math.sin((tPos - 0.12) * Math.PI * 0.9);
    const cleanThick = 50.0 * tipFade * bellySkew;
    const radialOffset = isOuter
      ? (R_out + 4.5 + (s % 5) * 3.0)
      : (R_out - cleanThick - 7.0 - (s % 4) * 4.5);

    const sx = Math.cos(ang) * radialOffset - 12;
    const sy = (Math.sin(ang) * radialOffset) / 1.06;
    const tanX = -Math.sin(ang);
    const tanY = Math.cos(ang);
    const splinterLen = (s % 4 === 0) ? 5 : 3;

    ctx.fillStyle = (s % 6 === 0) ? pal.lightningCore : pal.splinterCol;
    for (let k = 0; k < splinterLen; k++) {
      ctx.fillRect(Math.round(sx + tanX * k), Math.round(sy + tanY * k), 1, 1);
    }
  }
}

function _getCachedGetsugaFrameCanvas(paletteKey, frameIdx, targetCtx) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  if (typeof HTMLCanvasElement === 'undefined') return null;

  const key = `${paletteKey}_${frameIdx}`;
  if (_getsugaFrameCache.has(key)) {
    return _getsugaFrameCache.get(key);
  }

  const offCanvas = document.createElement('canvas');
  if (!(offCanvas instanceof HTMLCanvasElement) || (targetCtx && offCanvas === targetCtx.canvas)) {
    return null;
  }

  offCanvas.width = _GETSUGA_CANVAS_SIZE;
  offCanvas.height = _GETSUGA_CANVAS_SIZE;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return null;

  offCtx.save();
  offCtx.imageSmoothingEnabled = false;
  offCtx.translate(_GETSUGA_HALF_SIZE, _GETSUGA_HALF_SIZE);
  const pal = _GETSUGA_PALETTES[paletteKey] || _GETSUGA_PALETTES.bankai;
  _renderGetsugaFrameToCtx(offCtx, pal, frameIdx);
  offCtx.restore();

  _getsugaFrameCache.set(key, offCanvas);
  return offCanvas;
}

export function clearGetsugaFrameCache() {
  _getsugaFrameCache.clear();
}

/**
 * Proactively warms up the Getsuga Tensho frame cache on browser idle / load
 * so there is zero rendering hitch or lag spike on first cast.
 */
export function preloadGetsugaFrames() {
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') return;
  for (const palKey of ['shikai', 'bankai', 'hollow', 'frozen']) {
    for (let f = 0; f < _GETSUGA_FRAME_COUNT; f++) {
      _getCachedGetsugaFrameCanvas(palKey, f, null);
    }
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => preloadGetsugaFrames());
  } else {
    setTimeout(preloadGetsugaFrames, 50);
  }
}

function _getsugaHash1(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Appends a crinkled lightning segment to the active Canvas 2D path.
 * Uses 2 intermediate jagged points and spike extension in 0 allocations / 0 draw calls.
 */
function _appendBoltSegmentToPath(ctx, x0, y0, x1, y1, crinkleAmp = 2.0, crinkleSeed = 1.0, spikeDx = 0, spikeDy = 0, spikeLen = 0) {
  if (!ctx || typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) return;
  const nx = -dy / dist;
  const ny = dx / dist;

  const c1 = (Math.sin(0.33 * Math.PI * 2.0 + crinkleSeed) * 0.65 + Math.sin(0.33 * Math.PI) * 0.35) * crinkleAmp * 0.88;
  const c2 = (Math.sin(0.67 * Math.PI * 2.0 + crinkleSeed) * 0.65 + Math.sin(0.67 * Math.PI) * 0.35) * crinkleAmp * 0.88;

  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + dx * 0.33 + nx * c1, y0 + dy * 0.33 + ny * c1);
  ctx.lineTo(x0 + dx * 0.67 + nx * c2, y0 + dy * 0.67 + ny * c2);
  ctx.lineTo(x1, y1);

  if (spikeLen > 0) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + spikeDx * spikeLen, y1 + spikeDy * spikeLen);
  }
}

/**
 * Fast single-segment lightning renderer using path stroke instead of per-pixel fillRect loop.
 */
function _drawCrinkledBoltSeg(ctx, x0, y0, r0, x1, y1, r1, crinkleAmp = 2.0, crinkleSeed = 1.0, spikeDx = 0, spikeDy = 0, spikeLen = 0) {
  if (!ctx || typeof ctx.beginPath !== 'function' || typeof ctx.stroke !== 'function' || typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') return;
  ctx.beginPath();
  _appendBoltSegmentToPath(ctx, x0, y0, x1, y1, crinkleAmp, crinkleSeed, spikeDx, spikeDy, spikeLen);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = Math.max(1, Math.round((r0 + r1) * 1.15));
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.stroke();
}

function _computeBoltBisectors(chain) {
  for (let i = 1; i < chain.length - 1; i++) {
    const prev = chain[i - 1];
    const curr = chain[i];
    const next = chain[i + 1];
    const v1x = curr.x - prev.x, v1y = curr.y - prev.y;
    const l1 = Math.hypot(v1x, v1y) || 1;
    const v2x = next.x - curr.x, v2y = next.y - curr.y;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const bx = (v1x / l1) - (v2x / l2);
    const by = (v1y / l1) - (v2y / l2);
    const bl = Math.hypot(bx, by) || 1;
    curr.spikeDx = bx / bl;
    curr.spikeDy = by / bl;
  }
}

function _renderGetsugaQuickStrikeSlot(ctx, slotIndex, strikeId, stage, pal) {
  if (stage >= 4) return;
  if (!ctx || typeof ctx.beginPath !== 'function' || typeof ctx.stroke !== 'function' || typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') return;

  const R_out = _GETSUGA_BASE_R;
  const halfSpan = 0.78 * Math.PI;
  const seed = strikeId * 71.3 + slotIndex * 149.7 + 19.0;

  const s1 = _getsugaHash1(seed * 1.13);
  const s2 = _getsugaHash1(seed * 2.57);
  const s3 = _getsugaHash1(seed * 3.91);

  let tStart, tEnd, radialMode;
  if (slotIndex === 0) {
    tStart = -0.70 + s1 * 0.15;
    tEnd = tStart + 0.38 + s2 * 0.10;
    radialMode = 'outer';
  } else if (slotIndex === 1) {
    tStart = -0.42 + s1 * 0.16;
    tEnd = tStart + 0.40 + s2 * 0.12;
    radialMode = 'inner';
  } else if (slotIndex === 2) {
    tStart = -0.05 + s1 * 0.15;
    tEnd = tStart + 0.40 + s2 * 0.12;
    radialMode = 'inner';
  } else {
    tStart = 0.20 + s1 * 0.15;
    tEnd = tStart + 0.38 + s2 * 0.10;
    radialMode = 'outer';
  }

  const toCrescentXY = (curT, rOff) => {
    const clampedT = Math.max(-0.88, Math.min(0.88, curT));
    const curAng = clampedT * halfSpan;
    const absT = Math.abs(clampedT);
    const tipFade = Math.pow(Math.cos(Math.min(1.0, absT) * Math.PI * 0.5), 1.30);
    const bellySkew = 1.0 + 0.22 * Math.sin((clampedT - 0.12) * Math.PI * 0.9);
    const cleanThick = 50.0 * tipFade * bellySkew;
    const baseR = (radialMode === 'inner')
      ? (R_out - cleanThick * 0.82)
      : (R_out + 1.0);
    const rPos = baseR + rOff;
    return {
      x: Math.cos(curAng) * rPos - 12,
      y: (Math.sin(curAng) * rPos) / 1.06
    };
  };

  const expandDist = (stage === 0) ? 0.0 : (stage === 1 ? 2.5 : 4.5);
  const splitDriftT = (stage === 0) ? 0.0 : (stage === 1 ? 0.030 : 0.050);
  const flipSign = (s3 > 0.5) ? 1 : -1;
  const isLoopStrike = (strikeId % 2 === 0);

  const trunkTemplate = isLoopStrike
    ? [
        { u: 0.00, rSwing:  0.00, w: 0.35, spike: 0 },
        { u: 0.15, rSwing: -0.18, w: 0.90, spike: 3 },
        { u: 0.34, rSwing:  0.80, w: 1.20, spike: 4 },
        { u: 0.52, rSwing:  0.38, w: 1.05, spike: 3 },
        { u: 0.70, rSwing:  0.95, w: 1.30, spike: 5 },
        { u: 0.86, rSwing: -0.10, w: 0.95, spike: 3 },
        { u: 1.00, rSwing:  0.00, w: 0.35, spike: 0 }
      ]
    : [
        { u: 0.00, rSwing:  0.00, w: 0.35, spike: 0 },
        { u: 0.18, rSwing: -0.55, w: 0.85, spike: 3 },
        { u: 0.36, rSwing:  0.65, w: 1.15, spike: 4 },
        { u: 0.54, rSwing: -0.50, w: 1.10, spike: 4 },
        { u: 0.74, rSwing:  0.85, w: 1.35, spike: 5 },
        { u: 0.88, rSwing:  0.25, w: 0.90, spike: 3 },
        { u: 1.00, rSwing:  0.00, w: 0.35, spike: 0 }
      ];

  const trunk = trunkTemplate.map((pt, idx) => {
    const h1 = _getsugaHash1(seed * 13.3 + idx * 7.1);
    const h2 = _getsugaHash1(seed * 29.7 + idx * 11.9);
    const halfDrift = (idx <= 2 ? -splitDriftT : splitDriftT);
    const curT = tStart + (tEnd - tStart) * pt.u + halfDrift;
    const baseSwing = pt.rSwing * flipSign * (7.0 + h2 * 4.0);
    const expSwing = baseSwing + (pt.rSwing >= 0 ? 1 : -1) * flipSign * expandDist;
    const xy = toCrescentXY(curT, expSwing);
    return {
      x: xy.x,
      y: xy.y,
      r: pt.w * (0.85 + h1 * 0.30),
      spike: pt.spike,
      cSeed: h1 * 6.28
    };
  });
  _computeBoltBisectors(trunk);

  const loopBranch = [
    trunk[1],
    (() => {
      const curT = tStart + (tEnd - tStart) * 0.32 - splitDriftT * 0.5;
      const swing = -flipSign * (7.5 + expandDist);
      const xy = toCrescentXY(curT, swing);
      return { x: xy.x, y: xy.y, r: 0.85, spike: 3, cSeed: 1.7 };
    })(),
    (() => {
      const curT = tStart + (tEnd - tStart) * 0.55 - splitDriftT * 0.3;
      const swing = -flipSign * (5.5 + expandDist);
      const xy = toCrescentXY(curT, swing);
      return { x: xy.x, y: xy.y, r: 0.95, spike: 3, cSeed: 3.1 };
    })(),
    (() => {
      const curT = tStart + (tEnd - tStart) * 0.72 + splitDriftT * 0.4;
      const swing = -flipSign * (8.5 + expandDist);
      const xy = toCrescentXY(curT, swing);
      return { x: xy.x, y: xy.y, r: 0.85, spike: 3, cSeed: 4.8 };
    })(),
    trunk[5]
  ];
  _computeBoltBisectors(loopBranch);

  const feelers = [
    [
      trunk[2],
      { x: trunk[2].x + (trunk[2].spikeDx || 0.7) * 6 - (trunk[2].spikeDy || 0.7) * 2.5, y: trunk[2].y + (trunk[2].spikeDy || 0.7) * 6 + (trunk[2].spikeDx || 0.7) * 2.5, r: 0.40, cSeed: 2.1 },
      { x: trunk[2].x + (trunk[2].spikeDx || 0.7) * 11 + (trunk[2].spikeDy || 0.7) * 2, y: trunk[2].y + (trunk[2].spikeDy || 0.7) * 11 - (trunk[2].spikeDx || 0.7) * 2, r: 0.25, cSeed: 4.2 }
    ],
    [
      loopBranch[1],
      { x: loopBranch[1].x + (loopBranch[1].spikeDx || -0.7) * 6.5, y: loopBranch[1].y + (loopBranch[1].spikeDy || -0.7) * 6.5, r: 0.40, cSeed: 5.1 },
      { x: loopBranch[1].x + (loopBranch[1].spikeDx || -0.7) * 11 + 2.5, y: loopBranch[1].y + (loopBranch[1].spikeDy || -0.7) * 11 - 2, r: 0.25, cSeed: 1.3 }
    ]
  ];

  // Stage 3: Soft curved S-wave ionized vapor wisp (00:03 in reference video)
  if (stage === 3) {
    ctx.strokeStyle = pal.afterglowWisp || pal.lightningHalo;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    _appendBoltSegmentToPath(ctx, trunk[1].x, trunk[1].y, loopBranch[2].x, loopBranch[2].y, 3.2, 0.8, 0, 0, 0);
    ctx.stroke();
    return;
  }

  // Stage 2: Shattered corner sparks & micro-arcs (00:02 in reference video)
  if (stage === 2) {
    const nodes = [trunk[1], trunk[2], trunk[4], trunk[5], loopBranch[1], loopBranch[3]];
    ctx.strokeStyle = pal.lightningHalo;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const sx = n.x + (n.spikeDx || 0.6) * 3.5;
      const sy = n.y + (n.spikeDy || 0.6) * 3.5;
      _appendBoltSegmentToPath(ctx, n.x, n.y, sx, sy, 1.2, n.cSeed, 0, 0, 0);
    }
    ctx.stroke();

    ctx.strokeStyle = pal.lightningCore;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const sx = n.x + (n.spikeDx || 0.6) * 3.5;
      const sy = n.y + (n.spikeDy || 0.6) * 3.5;
      _appendBoltSegmentToPath(ctx, n.x, n.y, sx, sy, 1.2, n.cSeed, 0, 0, 0);
    }
    ctx.stroke();
    return;
  }

  // Stage 1: Outward whip & clean two-piece fracture separation (00:01 in reference video)
  if (stage === 1) {
    const trunkActive = [0, 3, 4, 5];
    const loopActive = [0, 1];

    ctx.strokeStyle = pal.lightningHalo;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    for (let k = 0; k < trunkActive.length; k++) {
      const i = trunkActive[k];
      _appendBoltSegmentToPath(ctx, trunk[i].x, trunk[i].y, trunk[i + 1].x, trunk[i + 1].y, 1.6, trunk[i].cSeed, trunk[i + 1].spikeDx, trunk[i + 1].spikeDy, Math.round(trunk[i + 1].spike * 0.7));
    }
    for (let k = 0; k < loopActive.length; k++) {
      const i = loopActive[k];
      _appendBoltSegmentToPath(ctx, loopBranch[i].x, loopBranch[i].y, loopBranch[i + 1].x, loopBranch[i + 1].y, 1.5, loopBranch[i].cSeed, loopBranch[i + 1].spikeDx, loopBranch[i + 1].spikeDy, Math.round((loopBranch[i + 1].spike || 0) * 0.7));
    }
    ctx.stroke();

    ctx.strokeStyle = pal.lightningCore;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k < trunkActive.length; k++) {
      const i = trunkActive[k];
      _appendBoltSegmentToPath(ctx, trunk[i].x, trunk[i].y, trunk[i + 1].x, trunk[i + 1].y, 1.6, trunk[i].cSeed, trunk[i + 1].spikeDx, trunk[i + 1].spikeDy, Math.round(trunk[i + 1].spike * 0.65));
    }
    for (let k = 0; k < loopActive.length; k++) {
      const i = loopActive[k];
      _appendBoltSegmentToPath(ctx, loopBranch[i].x, loopBranch[i].y, loopBranch[i + 1].x, loopBranch[i + 1].y, 1.5, loopBranch[i].cSeed, loopBranch[i + 1].spikeDx, loopBranch[i + 1].spikeDy, Math.round((loopBranch[i + 1].spike || 0) * 0.65));
    }
    ctx.stroke();
    return;
  }

  // Stage 0: Peak strike & open diamond loop / S-whip flash (00:00 & 00:06 in reference video)
  const loopEndIdx = isLoopStrike ? (loopBranch.length - 1) : 2;

  ctx.strokeStyle = pal.lightningHalo;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  for (let i = 0; i < trunk.length - 1; i++) {
    _appendBoltSegmentToPath(ctx, trunk[i].x, trunk[i].y, trunk[i + 1].x, trunk[i + 1].y, 1.5, trunk[i].cSeed, trunk[i + 1].spikeDx, trunk[i + 1].spikeDy, trunk[i + 1].spike);
  }
  for (let i = 0; i < loopEndIdx; i++) {
    _appendBoltSegmentToPath(ctx, loopBranch[i].x, loopBranch[i].y, loopBranch[i + 1].x, loopBranch[i + 1].y, 1.4, loopBranch[i].cSeed || 1.5, loopBranch[i + 1].spikeDx || 0, loopBranch[i + 1].spikeDy || 0, loopBranch[i + 1].spike || 0);
  }
  for (const fl of feelers) {
    for (let i = 0; i < fl.length - 1; i++) {
      _appendBoltSegmentToPath(ctx, fl[i].x, fl[i].y, fl[i + 1].x, fl[i + 1].y, 1.0, fl[i].cSeed || 1.0, 0, 0, 0);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = pal.lightningCore;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i < trunk.length - 1; i++) {
    _appendBoltSegmentToPath(ctx, trunk[i].x, trunk[i].y, trunk[i + 1].x, trunk[i + 1].y, 1.5, trunk[i].cSeed, trunk[i + 1].spikeDx, trunk[i + 1].spikeDy, Math.max(0, trunk[i + 1].spike - 1));
  }
  for (let i = 0; i < loopEndIdx; i++) {
    _appendBoltSegmentToPath(ctx, loopBranch[i].x, loopBranch[i].y, loopBranch[i + 1].x, loopBranch[i + 1].y, 1.4, loopBranch[i].cSeed || 1.5, loopBranch[i + 1].spikeDx || 0, loopBranch[i + 1].spikeDy || 0, Math.max(0, (loopBranch[i + 1].spike || 0) - 1));
  }
  for (const fl of feelers) {
    for (let i = 0; i < fl.length - 1; i++) {
      _appendBoltSegmentToPath(ctx, fl[i].x, fl[i].y, fl[i + 1].x, fl[i + 1].y, 1.0, fl[i].cSeed || 1.0, 0, 0, 0);
    }
  }
  ctx.stroke();
}

/**
 * Renders live, fast-striking anime lightning discharges across the Getsuga Tensho crescent
 * matching the reference strike lifecycle (00:00 Diamond Loop Strike -> 00:01 Outward Whip & Two-Piece Breakup ->
 * 00:02 Shattered Sparks -> 00:03 Curved Ionized Vapor Wisp -> 00:06 Forked S/Z-Whip Strike).
 */
function _drawGetsugaElectricDischarges(ctx, pal, p, now) {
  const tick = Math.floor(now / 36) + (p && p.owner ? p.owner * 7 : 0);
  const slotOffsets = [0, 3, 1, 4];
  const cycleLen = 6;
  for (let slot = 0; slot < 4; slot++) {
    const slotTick = tick + slotOffsets[slot];
    const strikeId = Math.floor(slotTick / cycleLen);
    const stage = ((slotTick % cycleLen) + cycleLen) % cycleLen;
    _renderGetsugaQuickStrikeSlot(ctx, slot, strikeId, stage, pal);
  }
}

function _renderGetsugaWallPinSlot(ctx, wallSlot, strikeId, stage, pal) {
  if (stage >= 4) return;
  if (!ctx || typeof ctx.beginPath !== 'function' || typeof ctx.stroke !== 'function' || typeof ctx.moveTo !== 'function' || typeof ctx.lineTo !== 'function') return;

  const wallX = _GETSUGA_BASE_R - 12; // 82: Leading blade apex contact plane
  const seed = strikeId * 89.7 + wallSlot * 173.1 + 31.0;
  const s1 = _getsugaHash1(seed * 1.19);
  const s2 = _getsugaHash1(seed * 2.41);
  const s3 = _getsugaHash1(seed * 3.73);

  const expandDist = (stage === 0) ? 0.0 : (stage === 1 ? 5.0 : 8.0);
  const splitDrift = (stage === 0) ? 0.0 : (stage === 1 ? 5.5 : 9.0);
  const flipSign = (s3 > 0.5) ? 1 : -1;
  const isLoopStrike = ((strikeId + wallSlot) % 2 === 0);

  const mapPoint = (u, latSwing) => {
    if (wallSlot === 0 || wallSlot === 1) {
      const dirY = (wallSlot === 0) ? -1 : 1;
      const yStart = dirY * (4 + s1 * 8);
      const yEnd = dirY * (74 + s2 * 22);
      const y = yStart + (yEnd - yStart) * u;
      const x = wallX - 4 - u * 10 + latSwing * 0.85;
      return { x, y };
    }
    const xStart = wallX + 2;
    const xEnd = 22 + s1 * 14;
    const x = xStart + (xEnd - xStart) * u;
    const ySpan = (s2 - 0.5) * 44;
    const y = ySpan * u + latSwing * 1.05;
    return { x, y };
  };

  const trunkTemplate = isLoopStrike
    ? [
        { u: 0.00, rSwing:  0.00, w: 0.6, spike: 0 },
        { u: 0.16, rSwing: -0.25, w: 1.9, spike: 6 },
        { u: 0.35, rSwing:  1.20, w: 2.5, spike: 9 },
        { u: 0.52, rSwing:  0.55, w: 2.1, spike: 7 },
        { u: 0.72, rSwing:  1.40, w: 2.7, spike: 10 },
        { u: 0.86, rSwing: -0.15, w: 2.0, spike: 7 },
        { u: 1.00, rSwing:  0.00, w: 0.6, spike: 0 }
      ]
    : [
        { u: 0.00, rSwing:  0.00, w: 0.6, spike: 0 },
        { u: 0.18, rSwing: -0.90, w: 1.8, spike: 6 },
        { u: 0.37, rSwing:  1.05, w: 2.4, spike: 8 },
        { u: 0.55, rSwing: -0.80, w: 2.2, spike: 7 },
        { u: 0.75, rSwing:  1.35, w: 2.7, spike: 10 },
        { u: 0.89, rSwing:  0.35, w: 1.9, spike: 6 },
        { u: 1.00, rSwing:  0.00, w: 0.6, spike: 0 }
      ];

  const trunk = trunkTemplate.map((pt, idx) => {
    const h1 = _getsugaHash1(seed * 15.7 + idx * 7.3);
    const h2 = _getsugaHash1(seed * 27.1 + idx * 11.3);
    const uDrift = (idx <= 2 ? -splitDrift : splitDrift) / 85.0;
    const curU = Math.max(0, Math.min(1.08, pt.u + uDrift));
    const baseSwing = pt.rSwing * flipSign * (11.5 + h2 * 6.5);
    const expSwing = baseSwing + (pt.rSwing >= 0 ? 1 : -1) * flipSign * expandDist;
    const xy = mapPoint(curU, expSwing);
    return {
      x: xy.x,
      y: xy.y,
      r: pt.w * (0.88 + h1 * 0.28),
      spike: pt.spike,
      cSeed: h1 * 6.28
    };
  });
  _computeBoltBisectors(trunk);

  const loopBranch = [
    trunk[1],
    (() => {
      const xy = mapPoint(0.33 - splitDrift / 160.0, -flipSign * (13.5 + expandDist));
      return { x: xy.x, y: xy.y, r: 1.6, spike: 7, cSeed: 1.9 };
    })(),
    (() => {
      const xy = mapPoint(0.55 - splitDrift / 220.0, -flipSign * (9.5 + expandDist));
      return { x: xy.x, y: xy.y, r: 1.9, spike: 6, cSeed: 3.3 };
    })(),
    (() => {
      const xy = mapPoint(0.73 + splitDrift / 180.0, -flipSign * (15.0 + expandDist));
      return { x: xy.x, y: xy.y, r: 1.7, spike: 8, cSeed: 4.9 };
    })(),
    trunk[5]
  ];
  _computeBoltBisectors(loopBranch);

  const feelers = [
    [
      trunk[2],
      { x: trunk[2].x + (trunk[2].spikeDx || 0.7) * 11 - (trunk[2].spikeDy || 0.7) * 4, y: trunk[2].y + (trunk[2].spikeDy || 0.7) * 11 + (trunk[2].spikeDx || 0.7) * 4, r: 0.7, cSeed: 2.3 },
      { x: trunk[2].x + (trunk[2].spikeDx || 0.7) * 19 + (trunk[2].spikeDy || 0.7) * 3, y: trunk[2].y + (trunk[2].spikeDy || 0.7) * 19 - (trunk[2].spikeDx || 0.7) * 3, r: 0.35, cSeed: 4.4 }
    ],
    [
      loopBranch[1],
      { x: loopBranch[1].x + (loopBranch[1].spikeDx || -0.7) * 12, y: loopBranch[1].y + (loopBranch[1].spikeDy || -0.7) * 12, r: 0.7, cSeed: 5.2 },
      { x: loopBranch[1].x + (loopBranch[1].spikeDx || -0.7) * 19 + 4, y: loopBranch[1].y + (loopBranch[1].spikeDy || -0.7) * 19 - 3, r: 0.35, cSeed: 1.4 }
    ]
  ];

  if (stage === 3) {
    ctx.strokeStyle = pal.afterglowWisp || pal.lightningHalo;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    _appendBoltSegmentToPath(ctx, trunk[1].x, trunk[1].y, loopBranch[2].x, loopBranch[2].y, 5.5, 0.9, 0, 0, 0);
    ctx.stroke();
    return;
  }

  if (stage === 2) {
    const nodes = [trunk[1], trunk[2], trunk[4], trunk[5], loopBranch[1], loopBranch[3]];
    ctx.strokeStyle = pal.lightningHalo;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const sx = n.x + (n.spikeDx || 0.6) * 5.5;
      const sy = n.y + (n.spikeDy || 0.6) * 5.5;
      _appendBoltSegmentToPath(ctx, n.x, n.y, sx, sy, 1.6, n.cSeed, 0, 0, 0);
    }
    ctx.stroke();

    ctx.strokeStyle = pal.lightningCore;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const sx = n.x + (n.spikeDx || 0.6) * 5.5;
      const sy = n.y + (n.spikeDy || 0.6) * 5.5;
      _appendBoltSegmentToPath(ctx, n.x, n.y, sx, sy, 1.6, n.cSeed, 0, 0, 0);
    }
    ctx.stroke();
    return;
  }

  if (stage === 1) {
    const trunkActive = [0, 3, 4, 5];
    const loopActive = [0, 1];

    ctx.strokeStyle = pal.lightningHalo;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    for (let k = 0; k < trunkActive.length; k++) {
      const i = trunkActive[k];
      _appendBoltSegmentToPath(ctx, trunk[i].x, trunk[i].y, trunk[i + 1].x, trunk[i + 1].y, 2.4, trunk[i].cSeed, trunk[i + 1].spikeDx, trunk[i + 1].spikeDy, Math.round(trunk[i + 1].spike * 0.7));
    }
    for (let k = 0; k < loopActive.length; k++) {
      const i = loopActive[k];
      _appendBoltSegmentToPath(ctx, loopBranch[i].x, loopBranch[i].y, loopBranch[i + 1].x, loopBranch[i + 1].y, 2.2, loopBranch[i].cSeed, loopBranch[i + 1].spikeDx, loopBranch[i + 1].spikeDy, Math.round((loopBranch[i + 1].spike || 0) * 0.7));
    }
    ctx.stroke();

    ctx.strokeStyle = pal.lightningCore;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < trunkActive.length; k++) {
      const i = trunkActive[k];
      _appendBoltSegmentToPath(ctx, trunk[i].x, trunk[i].y, trunk[i + 1].x, trunk[i + 1].y, 2.4, trunk[i].cSeed, trunk[i + 1].spikeDx, trunk[i + 1].spikeDy, Math.round(trunk[i + 1].spike * 0.65));
    }
    for (let k = 0; k < loopActive.length; k++) {
      const i = loopActive[k];
      _appendBoltSegmentToPath(ctx, loopBranch[i].x, loopBranch[i].y, loopBranch[i + 1].x, loopBranch[i + 1].y, 2.2, loopBranch[i].cSeed, loopBranch[i + 1].spikeDx, loopBranch[i + 1].spikeDy, Math.round((loopBranch[i + 1].spike || 0) * 0.65));
    }
    ctx.stroke();
    return;
  }

  const loopEndIdx = isLoopStrike ? (loopBranch.length - 1) : 2;

  ctx.strokeStyle = pal.lightningHalo;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  for (let i = 0; i < trunk.length - 1; i++) {
    _appendBoltSegmentToPath(ctx, trunk[i].x, trunk[i].y, trunk[i + 1].x, trunk[i + 1].y, 2.3, trunk[i].cSeed, trunk[i + 1].spikeDx, trunk[i + 1].spikeDy, trunk[i + 1].spike);
  }
  for (let i = 0; i < loopEndIdx; i++) {
    _appendBoltSegmentToPath(ctx, loopBranch[i].x, loopBranch[i].y, loopBranch[i + 1].x, loopBranch[i + 1].y, 2.1, loopBranch[i].cSeed || 1.5, loopBranch[i + 1].spikeDx || 0, loopBranch[i + 1].spikeDy || 0, loopBranch[i + 1].spike || 0);
  }
  for (const fl of feelers) {
    for (let i = 0; i < fl.length - 1; i++) {
      _appendBoltSegmentToPath(ctx, fl[i].x, fl[i].y, fl[i + 1].x, fl[i + 1].y, 1.4, fl[i].cSeed || 1.0, 0, 0, 0);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = pal.lightningCore;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < trunk.length - 1; i++) {
    _appendBoltSegmentToPath(ctx, trunk[i].x, trunk[i].y, trunk[i + 1].x, trunk[i + 1].y, 2.3, trunk[i].cSeed, trunk[i + 1].spikeDx, trunk[i + 1].spikeDy, Math.max(0, trunk[i + 1].spike - 1));
  }
  for (let i = 0; i < loopEndIdx; i++) {
    _appendBoltSegmentToPath(ctx, loopBranch[i].x, loopBranch[i].y, loopBranch[i + 1].x, loopBranch[i + 1].y, 2.1, loopBranch[i].cSeed || 1.5, loopBranch[i + 1].spikeDx || 0, loopBranch[i + 1].spikeDy || 0, Math.max(0, (loopBranch[i + 1].spike || 0) - 1));
  }
  for (const fl of feelers) {
    for (let i = 0; i < fl.length - 1; i++) {
      _appendBoltSegmentToPath(ctx, fl[i].x, fl[i].y, fl[i + 1].x, fl[i + 1].y, 1.4, fl[i].cSeed || 1.0, 0, 0, 0);
    }
  }
  ctx.stroke();
}

/**
 * Renders 3 staggered quick-strike lightning bursts along the wall contact plane and pinned target zone
 * when Getsuga Tensho slams into and grinds against an arena wall.
 */
function _drawGetsugaWallPinLightningBurst(ctx, pal, p, now) {
  const pinFrames = p.getsugaWallShakeCounter || 1;
  const tick = Math.floor(now / 32) + (p && p.owner ? p.owner * 11 : 0);
  const slotOffsets = [0, 2, 4];
  const cycleLen = 5;

  for (let wallSlot = 0; wallSlot < 3; wallSlot++) {
    // On initial wall impact (first 6 frames), synchronize an immediate Stage 0 -> Stage 1 impact surge
    if (pinFrames <= 6 && wallSlot < 2) {
      const impactStage = pinFrames <= 3 ? 0 : 1;
      _renderGetsugaWallPinSlot(ctx, wallSlot, 1, impactStage, pal);
      continue;
    }
    const slotTick = tick + slotOffsets[wallSlot];
    const strikeId = Math.floor(slotTick / cycleLen) + 2;
    const stage = ((slotTick % cycleLen) + cycleLen) % cycleLen;
    _renderGetsugaWallPinSlot(ctx, wallSlot, strikeId, stage, pal);
  }
}

export function drawGetsugaSlash(ctx, p, isBlack) {
  let angle = p.angle;
  if (p.vx !== 0 || p.vy !== 0) {
    angle = Math.atan2(p.vy, p.vx);
    p.angle = angle;
  } else if (p._resumeVx !== undefined && p._resumeVy !== undefined && (p._resumeVx !== 0 || p._resumeVy !== 0)) {
    angle = Math.atan2(p._resumeVy, p._resumeVx);
    p.angle = angle;
  } else if (p.launchAngle !== undefined) {
    angle = p.launchAngle;
  } else if (p.originalAngle !== undefined) {
    angle = p.originalAngle;
  } else if (angle === undefined) {
    angle = 0;
  }
  const owner = state.fighters && state.fighters[p.owner];
  const form = p.getsugaForm || (isBlack ? 'bankai' : 'shikai');

  const isFinal = form === 'final_bankai';
  const isBankaiHollow = form === 'bankai_hollow';
  const isShikaiHollow = form === 'hollow';
  const isBankai = form === 'bankai' || isBankaiHollow || isFinal;

  const scale = owner ? Math.max(0.9, owner.r / 22) : 1.0;
  const isInfinityFrozen = Boolean(p.isFrozenByInfinity);
  const fadeAlpha = (isInfinityFrozen && p.infinityFreezeTimer !== undefined && p.infinityFreezeTimer < 30) ? Math.max(0, p.infinityFreezeTimer / 30) : 1.0;
  const alpha = isInfinityFrozen ? fadeAlpha : 1.0;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  const frameIdx = Math.floor(now / (1000 / 24)) % _GETSUGA_FRAME_COUNT;

  const baseProjRadius = isFinal
    ? (CONFIG.ichigo?.bankaiFinalGetsugaRadius ?? 120)
    : (isBankaiHollow
      ? (CONFIG.ichigo?.bankaiHollowGetsugaRadius ?? (CONFIG.ichigo?.getsugaRadius ?? 100))
      : (isShikaiHollow
        ? (CONFIG.ichigo?.hollowGetsugaRadius ?? (CONFIG.ichigo?.getsugaRadius ?? 100))
        : (isBankai
          ? (CONFIG.ichigo?.bankaiGetsugaRadius ?? 110)
          : (CONFIG.ichigo?.getsugaRadius ?? 100))));

  const targetRadius = (p.r !== undefined && p.r > 0) ? p.r : baseProjRadius;
  const radiusScale = targetRadius / _GETSUGA_BASE_R;

  let paletteKey = 'shikai';
  if (isInfinityFrozen) {
    paletteKey = 'frozen';
  } else if (isBankai || isFinal || isBankaiHollow) {
    paletteKey = 'bankai';
  } else if (isShikaiHollow) {
    paletteKey = 'hollow';
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(scale * radiusScale, scale * radiusScale);
  ctx.imageSmoothingEnabled = false;

  const cachedCanvas = (typeof ctx.drawImage === 'function')
    ? _getCachedGetsugaFrameCanvas(paletteKey, frameIdx, ctx)
    : null;

  const pal = _GETSUGA_PALETTES[paletteKey] || _GETSUGA_PALETTES.bankai;
  const prevAlpha = ctx.globalAlpha !== undefined ? ctx.globalAlpha : 1.0;

  if (cachedCanvas) {
    ctx.globalAlpha = prevAlpha * alpha;
    ctx.drawImage(cachedCanvas, -_GETSUGA_HALF_SIZE, -_GETSUGA_HALF_SIZE, _GETSUGA_CANVAS_SIZE, _GETSUGA_CANVAS_SIZE);
  } else {
    _renderGetsugaFrameToCtx(ctx, pal, frameIdx);
  }

  // Dynamic lightning strikes quickly moving around the crescent (matching reference video)
  ctx.globalAlpha = prevAlpha * alpha;
  _drawGetsugaElectricDischarges(ctx, pal, p, now);

  // Wall-pin impact lightning burst when Getsuga Tensho slams into, grinds against, and clips out of an arena wall
  const isWallPinned = !isInfinityFrozen && (p.hasHitWall || p.isWallPenetrating || (p.vx === 0 && p.vy === 0 && (p.getsugaWallShakeCounter !== undefined || p._resumeVx !== undefined)));
  if (isWallPinned) {
    _drawGetsugaWallPinLightningBurst(ctx, pal, p, now);
  }
  ctx.globalAlpha = prevAlpha;

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
      console.warn('Failed to load Shikai sword image at Assets/model/ichigo/ICHIGO-SHIKAI-SWORD.png', e);
      _shikaiSwordImageLoading = false;
    };
    img.src = 'Assets/model/ichigo/ICHIGO-SHIKAI-SWORD.png';
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
      console.warn('Failed to load Shikai sword blade image at Assets/model/ichigo/ICHIGO-SHIKAI-SWORD-BLADE.png', e);
      _shikaiSwordBladeImageLoading = false;
    };
    img.src = 'Assets/model/ichigo/ICHIGO-SHIKAI-SWORD-BLADE.png';
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
      console.warn('Failed to load Bankai sword image at Assets/model/ichigo/ICHIGO-BANKAI-SWORD.png', e);
      _bankaiSwordImageLoading = false;
    };
    img.src = 'Assets/model/ichigo/ICHIGO-BANKAI-SWORD.png';
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
      console.warn('Failed to load Bankai sword blade image at Assets/model/ichigo/ICHIGO-BANKAI-SWORD-BLADE.png', e);
      _bankaiSwordBladeImageLoading = false;
    };
    img.src = 'Assets/model/ichigo/ICHIGO-BANKAI-SWORD-BLADE.png';
    _bankaiSwordBladeImage = img;
  }
  return _bankaiSwordBladeImage;
}

let _ichigoBankaiFrame1 = null;
let _ichigoBankaiFrame1Loading = false;
let _ichigoBankaiFrame2 = null;
let _ichigoBankaiFrame2Loading = false;
// Calibrated geometry for Ichigo Bankai & Shikai attack effects
export const ICHIGO_BANKAI_ATTACK_CONFIG = {
  cx: 156.77,
  cy: 732.07,
  baseR: 688.66,
  rotOffset: -0.027,
  src: 'Assets/model/ichigo/Ichigo-bankai-attack.png'
};

export const ICHIGO_SHIKAI_ATTACK_CONFIG = {
  cx: 156.77,
  cy: 732.07,
  baseR: 688.66,
  rotOffset: -0.027,
  src: 'Assets/model/ichigo/Ichigo-shikai-attack.png'
};

let _ichigoBankaiAttackImg = null;
let _ichigoBankaiAttackImgLoading = false;
let _ichigoShikaiAttackImg = null;
let _ichigoShikaiAttackImgLoading = false;

export function _getIchigoBankaiAttackImage() {
  if (_ichigoBankaiAttackImg && _ichigoBankaiAttackImg.complete && _ichigoBankaiAttackImg.naturalWidth > 0) return _ichigoBankaiAttackImg;
  if (!_ichigoBankaiAttackImgLoading && typeof Image !== 'undefined') {
    _ichigoBankaiAttackImgLoading = true;
    const img = new Image();
    img.onload = () => { _ichigoBankaiAttackImg = img; _ichigoBankaiAttackImgLoading = false; };
    img.onerror = () => { _ichigoBankaiAttackImgLoading = false; };
    img.src = `${ICHIGO_BANKAI_ATTACK_CONFIG.src}?v=4`;
    _ichigoBankaiAttackImg = img;
  }
  return _ichigoBankaiAttackImg;
}

export function _getIchigoShikaiAttackImage() {
  if (_ichigoShikaiAttackImg && _ichigoShikaiAttackImg.complete && _ichigoShikaiAttackImg.naturalWidth > 0) return _ichigoShikaiAttackImg;
  if (!_ichigoShikaiAttackImgLoading && typeof Image !== 'undefined') {
    _ichigoShikaiAttackImgLoading = true;
    const img = new Image();
    img.onload = () => { _ichigoShikaiAttackImg = img; _ichigoShikaiAttackImgLoading = false; };
    img.onerror = () => { _ichigoShikaiAttackImgLoading = false; };
    img.src = `${ICHIGO_SHIKAI_ATTACK_CONFIG.src}?v=4`;
    _ichigoShikaiAttackImg = img;
  }
  return _ichigoShikaiAttackImg;
}

export function _getIchigoBankaiAttackFrame(frameNumber = 2) {
  return _getIchigoBankaiAttackImage();
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getShikaiSwordImage();
  _getShikaiSwordBladeImage();
  _getBankaiSwordImage();
  _getBankaiSwordBladeImage();
  _getIchigoBankaiAttackImage();
  _getIchigoShikaiAttackImage();
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

      // Iron Sarute ring loop at pommel end
      ctx.beginPath();
      ctx.arc(ringX, 0, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#08080C';
      ctx.fill();
      ctx.strokeStyle = isMask ? '#5A1212' : '#14141A';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ringX, 0, 1.4, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.strokeStyle = isMask ? 'rgba(255, 60, 0, 0.65)' : 'rgba(135, 140, 165, 0.55)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      
      const chainLinks = [];
      const linkCount = 15;
      const isBankaiStance = Boolean(opts.isBankaiStance || opts.isChampionScreen);

      if (isBankaiStance) {
        const downX = Math.sin(2.65);
        const downY = -Math.cos(2.65);
        const perpDownX = downY;
        const perpDownY = -downX;

        for (let i = 0; i < linkCount; i++) {
          const t = i / (linkCount - 1);
          const hangLen = 32.0;
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
          const cx = ringX - t * 34.0;
          const cy = Math.sin(t * Math.PI * 0.85) * (14.0 + breathe) + t * 4.0;
          const ang = Math.cos(t * Math.PI * 0.85) * 0.80 - 0.20;
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
        const linkRx = 2.8;
        const linkRy = isOdd ? 1.1 : 1.7;

        ctx.beginPath();
        ctx.ellipse(0, 0, linkRx, linkRy, 0, 0, Math.PI * 2);
        ctx.fillStyle = isOdd ? '#060608' : '#0a0a0e';
        ctx.fill();
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
    const linkCount = 15;
    const isBankaiStance = Boolean(opts.isBankaiStance || opts.isChampionScreen);

    if (isBankaiStance) {
      // In Bankai Champion stance (swingAngle = 2.65, scale(1, -1)), hang chain straight downwards under gravity!
      const downX = Math.sin(2.65);  // ~ +0.4728
      const downY = -Math.cos(2.65); // ~ +0.8811
      const perpDownX = downY;       // ~ +0.8811
      const perpDownY = -downX;      // ~ -0.4728

      for (let i = 0; i < linkCount; i++) {
        const t = i / (linkCount - 1);
        const hangLen = 32.0;
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
        const cx = ringX - t * 34.0;
        const cy = Math.sin(t * Math.PI * 0.85) * (14.0 + breathe) + t * 4.0;
        const ang = Math.cos(t * Math.PI * 0.85) * 0.80 - 0.20;
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
      const linkRx = 2.8;
      const linkRy = isOdd ? 1.1 : 1.7;

      ctx.beginPath();
      ctx.ellipse(0, 0, linkRx, linkRy, 0, 0, Math.PI * 2);
      ctx.fillStyle = isOdd ? '#060608' : '#0a0a0e';
      ctx.fill();
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

  const kin = getIchigoSwingKinematics(fighter);
  if (kin.phase <= 2) {
    // Phase 1 (Lift) & Phase 2 (Poised Hold): Slash trail is hidden during anticipation
    return;
  }

  const r = fighter.r || 25;
  const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const facingLeft = Math.abs(baseAngle) > Math.PI / 2;

  const isMask = Boolean(fighter.hollowMaskActive);
  const isBankai = Boolean(fighter.bankaiActive || fighter.skin === 'bankai');
  const isShikai = !isBankai;
  const isBankaiOrMask = isBankai || isMask;

  const startOffset = kin.startAngle;
  const endOffset = kin.endAngle;
  const isReverseSweep = (startOffset > endOffset); // Step 2 (Rising Scoop) sweeps upward!

  let currentStartA = startOffset;
  let currentEndA = endOffset;
  let recP = 0;

  if (kin.phase === 3) {
    // Phase 3: Hypersonic Whip Strike Window — leading edge is 100% locked to kissaki (Rule 30)
    if (!isReverseSweep) {
      currentStartA = startOffset;
      currentEndA = kin.swingAngle;
    } else {
      currentStartA = kin.swingAngle;
      currentEndA = startOffset;
    }
    recP = 0;
  } else if (kin.phase === 4) {
    // Phase 4: THE IMPACT LOCK / LATCH (Rule 30)
    // Full glorious slash ribbon held firmly 100% unfurled on the impact plane across the impact freeze!
    if (!isReverseSweep) {
      currentStartA = startOffset;
      currentEndA = endOffset;
    } else {
      currentStartA = endOffset;
      currentEndA = startOffset;
    }
    recP = 0;
  } else if (kin.phase === 5) {
    // Phase 5: Extraction & Recovery Settle
    // Dynamic Tail-to-Tip Eraser Wipe (Rule 15 & Rule 30):
    // The leading edge stays locked at the cleave plane while the trailing tail chases it!
    const rp = Math.min(1.0, Math.max(0, kin.recP));
    recP = Math.pow(rp, 1.4);
    if (!isReverseSweep) {
      currentStartA = startOffset + (endOffset - startOffset) * recP;
      currentEndA = endOffset;
    } else {
      currentStartA = endOffset;
      currentEndA = startOffset + (endOffset - startOffset) * recP;
    }
  } else {
    return;
  }

  const angularSpan = Math.abs(currentEndA - currentStartA);
  if (angularSpan <= 0.04) return;

  const trailAlpha = Math.max(0, 1.0 - recP * 0.85);
  if (trailAlpha <= 0.01) return;

  const minAng = Math.min(currentStartA, currentEndA);
  const maxAng = Math.max(currentStartA, currentEndA);
  const span = maxAng - minAng;
  if (span <= 0.02) return;

  const tx = fighter.swordTremorX || 0;
  const ty = fighter.swordTremorY || 0;

  ctx.save();
  ctx.translate(fighter.x + tx, fighter.y + ty);
  ctx.rotate(baseAngle);
  ctx.imageSmoothingEnabled = false; // Authentic nearest-neighbor pixel art rendering

  // Mirror vertically when aiming left so swing remains natural
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const P = 2.0; // Exact discrete pixel art grid unit matching Yuta & Saitama standard
  const snap = (v) => Math.round(v / P) * P;

  // Full-Length Geometric Enveloping Standard (Rule 30):
  // Inner radius clamped to r + 10 so the crescent wraps from blade collar/hilt to kissaki tip
  const outerRadius = r + 92;
  const innerRadius = r + 10;
  const maxThick = 26.0;

  const outlineCol = isBankaiOrMask
    ? `rgba(20, 2, 8, ${(0.96 * trailAlpha).toFixed(2)})` // Deep Obsidian Crimson ink shell
    : `rgba(0, 16, 44, ${(0.94 * trailAlpha).toFixed(2)})`; // Deep Abyssal Indigo ink shell

  const isInsideSlash = (rx, ry) => {
    const dist = Math.hypot(rx, ry);
    if (dist <= 0) return false;
    let ang = Math.atan2(ry, rx);
    while (ang < minAng - Math.PI) ang += Math.PI * 2;
    while (ang > maxAng + Math.PI) ang -= Math.PI * 2;

    if (ang < minAng || ang > maxAng) return false;

    let t = 0.5;
    if (Math.abs(currentEndA - currentStartA) >= 0.0001) {
      t = (ang - currentStartA) / (currentEndA - currentStartA);
    }
    t = Math.max(0, Math.min(1.0, t));

    const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.26 + 0.74 * t);
    const thick = maxThick * taper;
    const outR = outerRadius + taper * 2.0;
    const inR = Math.max(innerRadius, outR - thick);
    return dist >= inR && dist <= outR;
  };

  const minX = Math.floor((-outerRadius - P * 2) / P) * P;
  const maxX = Math.ceil((outerRadius + P * 2) / P) * P;
  const minY = Math.floor((-outerRadius - P * 2) / P) * P;
  const maxY = Math.ceil((outerRadius + P * 2) / P) * P;

  const step = kin.step || fighter.slashSwingVariant || fighter.swordComboStep || 1;

  // ── 2D Discrete Crescent Grid with 4-Neighbor Attached Border (Rule 30) ──
  for (let gy = minY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      if (!isInsideSlash(gx, gy)) continue;

      const pxX = snap(gx);
      const pyY = snap(gy);

      // 4-neighbor attached border test matching Yuta & Saitama standard
      const isBorder = !isInsideSlash(gx + P, gy) ||
                       !isInsideSlash(gx - P, gy) ||
                       !isInsideSlash(gx, gy + P) ||
                       !isInsideSlash(gx, gy - P);

      if (isBorder) {
        ctx.fillStyle = outlineCol;
        ctx.fillRect(pxX, pyY, P, P);
        continue;
      }

      const dist = Math.hypot(gx, gy);
      let ang = Math.atan2(gy, gx);
      while (ang < minAng - Math.PI) ang += Math.PI * 2;
      while (ang > maxAng + Math.PI) ang -= Math.PI * 2;

      let t = 0.5;
      if (Math.abs(currentEndA - currentStartA) >= 0.0001) {
        t = (ang - currentStartA) / (currentEndA - currentStartA);
      }
      t = Math.max(0, Math.min(1.0, t));

      const taper = Math.pow(Math.sin(t * Math.PI), 1.15) * (0.26 + 0.74 * t);
      const outR = outerRadius + taper * 2.0;
      const depthFromApex = outR - dist;

      let col;
      if (depthFromApex < P * 1.4) {
        col = '#FFFFFF'; // Razor-sharp white-hot cutting edge apex
      } else if (isBankaiOrMask) {
        // Kuroi Getsuga Authentic Black-Red Crimson Theme
        if (depthFromApex < P * 3.0) {
          col = '#FFF0F2'; // Glowing pastel crimson highlight rim
        } else if (depthFromApex < P * 5.2) {
          col = '#FF0033'; // Vibrant electric blood-crimson
        } else if (depthFromApex < P * 7.5) {
          col = (step === 3) ? '#800012' : '#B80020'; // Deep saturated burning crimson layer
        } else {
          col = '#080003'; // Abyssal pitch-black obsidian void core
        }
      } else {
        // Shikai Azure / Cyan Theme
        if (depthFromApex < P * 3.0) {
          col = '#E0FFFF'; // Glowing pastel cyan highlight rim
        } else if (depthFromApex < P * 5.2) {
          col = '#00E5FF'; // Vibrant electric cyan
        } else if (depthFromApex < P * 7.5) {
          col = (step === 3) ? '#0038A8' : '#0055DD'; // Deep saturated cobalt layer
        } else {
          col = '#00143A'; // Abyssal midnight-blue void core
        }
      }

      ctx.fillStyle = col;
      ctx.fillRect(pxX, pyY, P, P);
    }
  }

  // ── Discrete Reiatsu Stepped Pixel Sparks along crescent span ──
  const numEmbers = 12;
  const primaryColor = isBankaiOrMask ? '#FF0033' : '#00E5FF';
  for (let eb = 0; eb < numEmbers; eb++) {
    const ebT = (eb / numEmbers + (Date.now() / 280)) % 1.0;
    const ebAng = minAng + ebT * span;
    const ebDist = outerRadius - 8 - eb * 3.5;
    const ex = snap(Math.cos(ebAng) * ebDist);
    const ey = snap(Math.sin(ebAng) * ebDist);
    const col = (eb % 2 === 0) ? primaryColor : '#FFFFFF';

    ctx.fillStyle = col;
    ctx.fillRect(ex, ey, P, P);
  }

  // ── Impact Lock Kissaki Sparks & Detonation (During Pin Phase / Phase 4) ──
  if (kin.phase === 4) {
    const tipAng = isReverseSweep ? minAng : maxAng;
    const tipX = snap(Math.cos(tipAng) * (outerRadius - 4));
    const tipY = snap(Math.sin(tipAng) * (outerRadius - 4));

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(tipX - P, tipY - P, P * 2, P * 2);

    for (let s = 0; s < 6; s++) {
      const sAng = tipAng + (Math.sin(s * 1.7 + Date.now() * 0.02)) * 0.7;
      const sDist = (outerRadius - 4) + (s * 2.5);
      const sx = snap(Math.cos(sAng) * sDist);
      const sy = snap(Math.sin(sAng) * sDist);
      ctx.fillStyle = (s % 2 === 0) ? primaryColor : '#FFFFFF';
      ctx.fillRect(sx, sy, P, P);
    }
  }

  ctx.restore();
}

