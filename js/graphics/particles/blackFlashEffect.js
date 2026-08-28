// ─────────────────────────────────────────────────────────────────────────────
// BLACK FLASH — Jujutsu Kaisen Cursed Energy Strike Effect (High-Impact Pixel Art)
// ─────────────────────────────────────────────────────────────────────────────
import { state } from '../../core/state.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL OBJECT POOL (Zero GC Overhead design)
// ─────────────────────────────────────────────────────────────────────────────
const BF_POOL_SIZE = 90;
const _bfPool = [];

for (let i = 0; i < BF_POOL_SIZE; i++) {
  _bfPool.push({
    type: null,
    x: 0, y: 0, vx: 0, vy: 0,
    size: 0, maxSize: 0, life: 0, decay: 0, friction: 1,
    angle: 0, color: null,
    boltSegments: [], branchSegments: [], microSpikes: []
  });
}

function _getBFParticle() {
  return _bfPool.length > 0 ? _bfPool.pop() : {
    type: null, x: 0, y: 0, vx: 0, vy: 0,
    size: 0, maxSize: 0, life: 0, decay: 0, friction: 1,
    angle: 0, color: null,
    boltSegments: [], branchSegments: [], microSpikes: []
  };
}

function _returnBFParticle(p) {
  p.type = null; p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
  p.size = 0; p.maxSize = 0; p.life = 0; p.decay = 0; p.friction = 1;
  p.angle = 0; p.color = null;
  p.boltSegments.length = 0;
  p.branchSegments.length = 0;
  p.microSpikes.length = 0;
  _bfPool.push(p);
}

const _blackFlashParticles = [];

/**
 * Draws a stepped pixel-art line segment using square pixel blocks.
 */
function _drawPixelLine(ctx, x0, y0, x1, y1, P, color, sizeMultiplier = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.round(dist / P));
  const blockSize = Math.max(P, Math.round((P * sizeMultiplier) / P) * P);
  const halfBlock = blockSize / 2;
  ctx.fillStyle = color;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = Math.round((x0 + dx * t) / P) * P;
    const py = Math.round((y0 + dy * t) / P) * P;
    ctx.fillRect(px - halfBlock, py - halfBlock, blockSize, blockSize);
  }
}

// Helper to generate jagged branching pixel lightning segments on spawn
function _buildLightningSegments(boltCount, branches, lengthMult, isLowPerf) {
  const boltSegments = [];
  const branchSegments = [];
  const P = 2.5;

  for (let b = 0; b < boltCount; b++) {
    const baseAngle = (b / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    const totalLength = ((isLowPerf ? 65 : 95) + Math.random() * 45) * lengthMult;
    const steps = isLowPerf ? 3 : (4 + Math.floor(Math.random() * 2));
    const stepLen = totalLength / steps;

    let curX = 0;
    let curY = 0;
    let currentAngle = baseAngle;
    let branchQuota = branches;

    for (let i = 0; i < steps; i++) {
      currentAngle += (Math.random() - 0.5) * 1.15;
      const nextX = Math.round((curX + Math.cos(currentAngle) * stepLen) / P) * P;
      const nextY = Math.round((curY + Math.sin(currentAngle) * stepLen) / P) * P;

      boltSegments.push({ x0: curX, y0: curY, x1: nextX, y1: nextY });

      // Branching logic
      if (branchQuota > 0 && Math.random() < 0.50) {
        branchQuota--;
        const bAngle = currentAngle + (Math.random() > 0.5 ? 1 : -1) * (0.65 + Math.random() * 0.75);
        const bLen = stepLen * (1.35 + Math.random() * 0.65);
        const bNextX = Math.round((nextX + Math.cos(bAngle) * bLen) / P) * P;
        const bNextY = Math.round((nextY + Math.sin(bAngle) * bLen) / P) * P;

        branchSegments.push({ x0: nextX, y0: nextY, x1: bNextX, y1: bNextY });

        // Micro-branch
        if (!isLowPerf && Math.random() < 0.35) {
          const mAngle = bAngle + (Math.random() > 0.5 ? 1 : -1) * 0.55;
          const mLen = bLen * 0.55;
          const mNextX = Math.round((bNextX + Math.cos(mAngle) * mLen) / P) * P;
          const mNextY = Math.round((bNextY + Math.sin(mAngle) * mLen) / P) * P;
          branchSegments.push({ x0: bNextX, y0: bNextY, x1: mNextX, y1: mNextY });
        }
      }

      curX = nextX;
      curY = nextY;
    }
  }

  return { boltSegments, branchSegments };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPAWN
// ─────────────────────────────────────────────────────────────────────────────
let _lastBFSpawnTime = 0;

export function spawnBlackFlash(x, y) {
  try {
    const fps = (state && state.fps) || 60;
    const isLowPerf = (typeof state !== 'undefined' && state.performanceMode) || fps < 55;
    
    const is1v2 = typeof state !== 'undefined' && 
                  state.mode && 
                  typeof state.mode === 'string' && 
                  (state.mode === '1v2' || state.mode.includes('1v2'));
    
    // Throttle Black Flash spawns to prevent extreme multi-trigger frame drops
    const now = Date.now();
    const throttleTime = is1v2 ? 32 : 16;
    if (now - _lastBFSpawnTime < throttleTime) { 
      return;
    }
    _lastBFSpawnTime = now;
    
    if (fps < 30 && Math.random() < 0.6) return;

    // 1. IMPACT CORE (Void Singularity Implosion)
    const core = _getBFParticle();
    core.type = 'bfCore';
    core.x = x; core.y = y;
    core.size = 10;
    core.maxSize = is1v2 ? 42 : 52;
    core.life = 1.0;
    core.decay = is1v2 ? 0.024 : 0.040;
    
    // Generate 8 radial micro-fracture spikes radiating from core
    const P = 2.5;
    const microSpikes = [];
    const spikeCount = isLowPerf ? 6 : 8;
    for (let s = 0; s < spikeCount; s++) {
      const a = (s / spikeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const len = 14 + Math.random() * 18;
      microSpikes.push({
        x0: 0, y0: 0,
        x1: Math.round((Math.cos(a) * len) / P) * P,
        y1: Math.round((Math.sin(a) * len) / P) * P
      });
    }
    core.microSpikes = microSpikes;
    _blackFlashParticles.push(core);

    // 2. JAGGED LIGHTNING BURST (Stepped Pixel Art Fractures)
    const lightning = _getBFParticle();
    lightning.type = 'bfLightning';
    lightning.x = x; lightning.y = y;
    lightning.size = 1.0; 
    lightning.life = 1.0;
    lightning.decay = is1v2 ? 0.028 : 0.048;
    
    const boltCount = isLowPerf ? 4 : (is1v2 ? 5 : 6);
    const branches = isLowPerf ? 0 : (is1v2 ? 2 : 3);
    const lengthMult = is1v2 ? 0.95 : 1.1;
    
    const paths = _buildLightningSegments(boltCount, branches, lengthMult, isLowPerf);
    lightning.boltSegments = paths.boltSegments;
    lightning.branchSegments = paths.branchSegments;
    _blackFlashParticles.push(lightning);

    // 3. SPATIAL DISTORTION PIXEL SHOCKWAVE RING
    if (!isLowPerf) {
      const ring = _getBFParticle();
      ring.type = 'bfRing';
      ring.x = x; ring.y = y;
      ring.size = 12;
      ring.maxSize = is1v2 ? 100 : 135;
      ring.life = 1.0;
      ring.decay = is1v2 ? 0.025 : 0.045;
      _blackFlashParticles.push(ring);
    }

    // 4. SUPERSONIC DIRECTIONAL PIXEL SPARKS (Action Streaks, No Diamonds)
    const streakCount = isLowPerf ? 4 : (is1v2 ? 6 : 10);
    const palette = ['#FFFFFF', '#FF0022', '#B30000', '#0E0F14'];
    for (let i = 0; i < streakCount; i++) {
      const angle = (i / streakCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const speed = (5.5 + Math.random() * 6.5) * (is1v2 ? 0.85 : 1.0);
      const spark = _getBFParticle();
      spark.type = 'bfSpark';
      spark.x = x; spark.y = y;
      spark.vx = Math.cos(angle) * speed;
      spark.vy = Math.sin(angle) * speed;
      spark.size = 2.0;
      spark.life = 1.0;
      spark.decay = (is1v2 ? 0.026 : 0.042) + Math.random() * 0.015;
      spark.friction = 0.90;
      spark.color = palette[i % palette.length];
      _blackFlashParticles.push(spark);
    }
  } catch (err) {
    console.error("Error in spawnBlackFlash:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE (Zero-GC O(N) In-Place Array Compaction)
// ─────────────────────────────────────────────────────────────────────────────
export function updateBlackFlashEffects(frozen = false) {
  try {
    let writeIdx = 0;
    const len = _blackFlashParticles.length;
    for (let i = 0; i < len; i++) {
      const p = _blackFlashParticles[i];
      if (!frozen) {
        p.life -= p.decay;
        if (p.vx !== 0 || p.vy !== 0) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.friction < 1) {
            p.vx *= p.friction;
            p.vy *= p.friction;
          }
        }
      }
      if (p.life > 0) {
        _blackFlashParticles[writeIdx++] = p;
      } else {
        _returnBFParticle(p);
      }
    }
    _blackFlashParticles.length = writeIdx;
  } catch (err) {
    console.error("Error in updateBlackFlashEffects:", err);
  }
}

export function clearBlackFlashEffects() {
  for (let i = 0; i < _blackFlashParticles.length; i++) {
    _returnBFParticle(_blackFlashParticles[i]);
  }
  _blackFlashParticles.length = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW (Stepped Pixel Art Passes - Zero Diamond Shapes)
// ─────────────────────────────────────────────────────────────────────────────
export function drawBlackFlashEffects(ctx) {
  if (!ctx || _blackFlashParticles.length === 0) return;

  const isPodiumActive = typeof state !== 'undefined' && (
    (state.gameState === 'roundEnd' && state.roundEndTimer > 55) ||
    state.gameState === 'matchEnd'
  );
  if (isPodiumActive) {
    clearBlackFlashEffects();
    return;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const P = 2.5; // Stepped pixel grid size

  // Single pass drawing for all Black Flash elements
  for (let i = 0; i < _blackFlashParticles.length; i++) {
    const p = _blackFlashParticles[i];
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.life <= 0) continue;

    if (p.type === 'bfLightning') {
      if (!p.boltSegments || p.boltSegments.length === 0) continue;
      
      const activeLife = p.life * (0.75 + Math.random() * 0.25);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = Math.max(0, Math.min(1.0, activeLife));

      // ── Layer 1: Crimson Red Spatial Distortion Outline (Outer Pixel Aura) ──
      const colCrimson = `rgba(255, 15, 25, ${(activeLife * 0.92).toFixed(3)})`;
      for (const seg of p.boltSegments) {
        _drawPixelLine(ctx, seg.x0, seg.y0, seg.x1, seg.y1, P, colCrimson, 3.4);
      }
      if (p.branchSegments) {
        for (const seg of p.branchSegments) {
          _drawPixelLine(ctx, seg.x0, seg.y0, seg.x1, seg.y1, P, colCrimson, 2.4);
        }
      }

      // ── Layer 2: Stark Black Manga Ink Core (Center Lightning) ──
      const colBlack = `rgba(0, 0, 0, ${activeLife.toFixed(3)})`;
      for (const seg of p.boltSegments) {
        _drawPixelLine(ctx, seg.x0, seg.y0, seg.x1, seg.y1, P, colBlack, 2.2);
      }
      if (p.branchSegments) {
        for (const seg of p.branchSegments) {
          _drawPixelLine(ctx, seg.x0, seg.y0, seg.x1, seg.y1, P, colBlack, 1.4);
        }
      }

      // ── Layer 3: Hot Lilac-White Specular Center Streak ──
      const colLilac = `rgba(243, 232, 255, ${(activeLife * 0.98).toFixed(3)})`;
      for (const seg of p.boltSegments) {
        _drawPixelLine(ctx, seg.x0, seg.y0, seg.x1, seg.y1, P, colLilac, 1.0);
      }

      ctx.restore();

    } else if (p.type === 'bfCore') {
      p.size += (p.maxSize - p.size) * 0.26;
      const alpha = Math.max(0, Math.min(1.0, p.life * 1.15));
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = alpha;

      const coreR = Math.max(P * 2, p.size);
      const steps = Math.ceil(coreR / P);

      // 1. Outer Stepped Crimson Cursed Energy Halo
      ctx.fillStyle = 'rgba(255, 15, 30, 0.48)';
      for (let gy = -steps; gy <= steps; gy++) {
        for (let gx = -steps; gx <= steps; gx++) {
          const d = Math.hypot(gx * P, gy * P);
          if (d <= coreR && (gx + gy) % 2 === 0) {
            ctx.fillRect(gx * P, gy * P, P, P);
          }
        }
      }

      // 2. Mid Stark Black Singularity (Stepped Octagonal Void Sphere)
      ctx.fillStyle = '#000000';
      const voidR = coreR * 0.72;
      for (let gy = -steps; gy <= steps; gy++) {
        for (let gx = -steps; gx <= steps; gx++) {
          const d = Math.hypot(gx * P, gy * P);
          if (d <= voidR) {
            ctx.fillRect(gx * P, gy * P, P, P);
          }
        }
      }

      // 3. Central Pure-White Specular Flash Cluster
      ctx.fillStyle = '#FFFFFF';
      const whiteR = Math.max(P, voidR * 0.35);
      for (let gy = -2; gy <= 2; gy++) {
        for (let gx = -2; gx <= 2; gx++) {
          if (Math.hypot(gx * P, gy * P) <= whiteR) {
            ctx.fillRect(gx * P, gy * P, P, P);
          }
        }
      }

      // 4. Radiating Stepped Pixel Micro-Fractures
      if (p.microSpikes && p.microSpikes.length > 0) {
        const spikeAlpha = Math.max(0, Math.min(1.0, p.life));
        const spikeCol = `rgba(255, 15, 30, ${spikeAlpha.toFixed(3)})`;
        const spikeBlack = `rgba(0, 0, 0, ${spikeAlpha.toFixed(3)})`;
        for (const spk of p.microSpikes) {
          _drawPixelLine(ctx, spk.x0, spk.y0, spk.x1, spk.y1, P, spikeCol, 2.0);
          _drawPixelLine(ctx, spk.x0, spk.y0, spk.x1 * 0.8, spk.y1 * 0.8, P, spikeBlack, 1.0);
        }
      }

      ctx.restore();

    } else if (p.type === 'bfRing') {
      p.size += (p.maxSize - p.size) * 0.24;
      const alpha = Math.max(0, Math.min(1.0, p.life));
      const ringR = Math.max(P * 2, p.size);
      const steps = Math.ceil(ringR / P);

      ctx.save();
      ctx.translate(p.x, p.y);

      // Outer Stepped Crimson Pixel Shockwave Ring
      ctx.fillStyle = `rgba(220, 20, 40, ${(alpha * 0.80).toFixed(3)})`;
      for (let gy = -steps; gy <= steps; gy++) {
        for (let gx = -steps; gx <= steps; gx++) {
          const dist = Math.hypot(gx * P, gy * P);
          if (dist <= ringR + P && dist > ringR - P * 1.5) {
            if ((gx + gy) % 2 === 0 || p.life > 0.45) {
              ctx.fillRect(gx * P, gy * P, P, P);
            }
          }
        }
      }

      // Inner Crisp Lilac/White Specular Pixel Ring
      ctx.fillStyle = `rgba(255, 240, 245, ${(alpha * 0.90).toFixed(3)})`;
      for (let gy = -steps; gy <= steps; gy++) {
        for (let gx = -steps; gx <= steps; gx++) {
          const dist = Math.hypot(gx * P, gy * P);
          if (dist <= ringR * 0.95 + P && dist > ringR * 0.95 - P) {
            ctx.fillRect(gx * P, gy * P, P, P);
          }
        }
      }

      ctx.restore();

    } else if (p.type === 'bfSpark') {
      // High-velocity Directional Pixel Action Streak (NO DIAMONDS)
      ctx.save();
      const alpha = Math.max(0, Math.min(1.0, p.life));
      ctx.globalAlpha = alpha;

      const tailX = p.x - p.vx * 1.8;
      const tailY = p.y - p.vy * 1.8;

      // 1. Dark Red / Black Trail Streak
      _drawPixelLine(ctx, tailX, tailY, p.x, p.y, P, 'rgba(180, 0, 20, 0.75)', 1.8);

      // 2. Core Color Line
      _drawPixelLine(ctx, tailX * 0.5 + p.x * 0.5, tailY * 0.5 + p.y * 0.5, p.x, p.y, P, p.color || '#FF0022', 1.2);

      // 3. Leading Pure-White 1px Pixel Tip
      ctx.fillStyle = '#FFFFFF';
      const hx = Math.round(p.x / P) * P;
      const hy = Math.round(p.y / P) * P;
      ctx.fillRect(hx, hy, P, P);

      ctx.restore();
    }
  }

  ctx.restore();
}
