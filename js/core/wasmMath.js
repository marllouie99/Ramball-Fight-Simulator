/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WebAssembly Critical Math & Physics Kernel (WASM Acceleration)
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides high-performance compiled WebAssembly routines for distance calculations,
 * circular collision checks, numerical clamping, interpolation, and spatial grid hashing.
 * 
 * Features automatic boot-time instantiation and seamless zero-delay pure
 * JavaScript fallbacks.
 */

// Pure JS Fallbacks
export function jsDist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function jsDistSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function jsCircleCollide(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const r = r1 + r2;
  return (dx * dx + dy * dy) <= (r * r);
}

export function jsClamp(val, min, max) {
  return val < min ? min : (val > max ? max : val);
}

export function jsLerp(a, b, t) {
  return a + (b - a) * t;
}

export function jsSpatialGridHash(cellX, cellY) {
  return (((cellX + 2000) & 0xFFFF) << 16) | ((cellY + 2000) & 0xFFFF);
}

export function jsBatchCircleCollisions(targetX, targetY, targetR, entities, count, outMatches) {
  let matchCount = 0;
  for (let i = 0; i < count; i++) {
    const e = entities[i];
    if (!e) continue;
    const dx = e.x - targetX;
    const dy = e.y - targetY;
    const r = targetR + (e.r || 0);
    if ((dx * dx + dy * dy) <= (r * r)) {
      outMatches[matchCount++] = e;
    }
  }
  return matchCount;
}

// Active delegates (default to JS fallbacks, hot-swapped to WASM upon compilation)
export let wasmDist = jsDist;
export let wasmDistSq = jsDistSq;
export let wasmCircleCollide = jsCircleCollide;
export let wasmClamp = jsClamp;
export let wasmLerp = jsLerp;
export let wasmSpatialGridHash = jsSpatialGridHash;
export let wasmBatchCircleCollisions = jsBatchCircleCollisions;
export let isWasmReady = false;

// Compiled standalone WebAssembly binary (Base64)
const WASM_BASE64 = 'AGFzbQEAAAABIARgBHx8fHwBfGAGfHx8fHx8AX9gA3x8fAF8YAJ/fwF/AwcGAAABAgIDBz4GBGRpc3QAAAZkaXN0U3EAAQ1jaXJjbGVDb2xsaWRlAAIFY2xhbXAAAwRsZXJwAAQLc3BhdGlhbEhhc2gABQqLAQYYACACIAChIgAgAKIgAyABoSIBIAGioJ8LFwAgAiAAoSIAIACiIAMgAaEiASABoqALIgAgAyAAoSIAIACiIAQgAaEiASABoqAgAiAFoCICIAKiZQsKACAAIAGlIAKkCw0AIAAgASAAoSACoqALHAAgAEHQD2pB//8DcUEQdCABQdAPakH//wNxcgs=';

function base64ToUint8Array(b64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/**
 * Initializes the WebAssembly Math Kernel.
 */
export async function initWasmMath() {
  if (isWasmReady) return true;
  try {
    if (typeof WebAssembly === 'undefined') return false;
    const wasmBytes = base64ToUint8Array(WASM_BASE64);
    const wasmModule = await WebAssembly.compile(wasmBytes);
    const wasmInstance = await WebAssembly.instantiate(wasmModule, {});
    const exp = wasmInstance.exports;

    if (exp.dist && exp.distSq && exp.circleCollide && exp.clamp && exp.lerp && exp.spatialHash) {
      wasmDist = exp.dist;
      wasmDistSq = exp.distSq;
      wasmCircleCollide = (x1, y1, r1, x2, y2, r2) => exp.circleCollide(x1, y1, r1, x2, y2, r2) === 1;
      wasmClamp = exp.clamp;
      wasmLerp = exp.lerp;
      wasmSpatialGridHash = exp.spatialHash;
      isWasmReady = true;
      return true;
    }
  } catch {
    // Gracefully use pure JS fallbacks
  }
  return false;
}

// Auto-initialize in modern environments
if (typeof WebAssembly !== 'undefined') {
  initWasmMath().catch(() => {});
}
