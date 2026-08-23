// ─────────────────────────────────────────────────────────────────────────────
// BLACK FLASH — Jujutsu Kaisen-Inspired Cursed Energy Strike Effect (High-Performance)
// ─────────────────────────────────────────────────────────────────────────────
import { state } from '../../core/state.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL OBJECT POOL (Zero GC Overhead design)
// ─────────────────────────────────────────────────────────────────────────────
const BF_POOL_SIZE = 80;
const _bfPool = [];

for (let i = 0; i < BF_POOL_SIZE; i++) {
  _bfPool.push({
    type: null,
    x: 0, y: 0, vx: 0, vy: 0,
    size: 0, maxSize: 0, life: 0, decay: 0, friction: 1,
    angle: 0, color: null,
    boltPath: null, branchPath: null
  });
}

function _getBFParticle() {
  return _bfPool.length > 0 ? _bfPool.pop() : {
    type: null, x: 0, y: 0, vx: 0, vy: 0,
    size: 0, maxSize: 0, life: 0, decay: 0, friction: 1,
    angle: 0, color: null,
    boltPath: null, branchPath: null
  };
}

function _returnBFParticle(p) {
  p.type = null; p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
  p.size = 0; p.maxSize = 0; p.life = 0; p.decay = 0; p.friction = 1;
  p.angle = 0; p.color = null;
  p.boltPath = null; p.branchPath = null;
  _bfPool.push(p);
}

const _blackFlashParticles = [];

// ─────────────────────────────────────────────────────────────────────────────
// PRE-RENDERED GLOW CANVASES (GPU Texture Blits — Zero Gradient Re-allocation)
// ─────────────────────────────────────────────────────────────────────────────
let _coreCanvas = null;

function _initCanvases() {
  if (typeof document === 'undefined' || _coreCanvas) return;

  // Pre-bake 128x128 Stark Void Implosion Core
  _coreCanvas = document.createElement('canvas');
  _coreCanvas.width = 128;
  _coreCanvas.height = 128;
  const cCtx = _coreCanvas.getContext('2d');
  const cGrad = cCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  cGrad.addColorStop(0,   'rgba(0, 0, 0, 1.0)');
  cGrad.addColorStop(0.5, 'rgba(25, 0, 5, 0.92)');
  cGrad.addColorStop(0.8, 'rgba(180, 0, 20, 0.35)');
  cGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  cCtx.fillStyle = cGrad;
  cCtx.fillRect(0, 0, 128, 128);
}

// Helper to generate jagged branching lightning paths once on spawn (Zero Draw-Loop Overhead)
function _buildLightningPaths(boltCount, branches, lengthMult, isLowPerf) {
  const hasPath2D = typeof Path2D !== 'undefined';
  const boltPath = hasPath2D ? new Path2D() : null;
  const branchPath = hasPath2D ? new Path2D() : null;

  for (let b = 0; b < boltCount; b++) {
    const baseAngle = (b / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const totalLength = ((isLowPerf ? 55 : 85) + Math.random() * 40) * lengthMult;
    const steps = isLowPerf ? 3 : (4 + Math.floor(Math.random() * 2));
    const stepLen = totalLength / steps;

    let curX = 0;
    let curY = 0;
    let currentAngle = baseAngle;
    let branchQuota = branches;

    for (let i = 0; i < steps; i++) {
      currentAngle += (Math.random() - 0.5) * 1.1;
      const nextX = curX + Math.cos(currentAngle) * stepLen;
      const nextY = curY + Math.sin(currentAngle) * stepLen;

      if (hasPath2D) {
        boltPath.moveTo(curX, curY);
        boltPath.lineTo(nextX, nextY);
      }

      // Branching logic
      if (branchQuota > 0 && Math.random() < 0.45) {
        branchQuota--;
        const bAngle = currentAngle + (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.7);
        const bLen = stepLen * (1.3 + Math.random() * 0.6);
        const bNextX = nextX + Math.cos(bAngle) * bLen;
        const bNextY = nextY + Math.sin(bAngle) * bLen;

        if (hasPath2D) {
          branchPath.moveTo(nextX, nextY);
          branchPath.lineTo(bNextX, bNextY);

          // Micro-branch (skip in low perf)
          if (!isLowPerf && Math.random() < 0.3) {
            const mAngle = bAngle + (Math.random() > 0.5 ? 1 : -1) * 0.5;
            const mLen = bLen * 0.5;
            branchPath.moveTo(bNextX, bNextY);
            branchPath.lineTo(bNextX + Math.cos(mAngle) * mLen, bNextY + Math.sin(mAngle) * mLen);
          }
        }
      }

      curX = nextX;
      curY = nextY;
    }
  }

  return { boltPath, branchPath };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPAWN
// ─────────────────────────────────────────────────────────────────────────────
let _lastBFSpawnTime = 0;

export function spawnBlackFlash(x, y) {
  try {
    const fps = (state && state.fps) || 60;
    const isLowPerf = (typeof state !== 'undefined' && state.performanceMode) || fps < 55;
    
    // Bulletproof check for 1v2 mode
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

    // 1. IMPACT CORE (Void Implosion)
    const core = _getBFParticle();
    core.type = 'bfCore';
    core.x = x; core.y = y;
    core.size = 8;
    core.maxSize = 46;
    core.life = 1.0;
    core.decay = is1v2 ? 0.022 : 0.038;
    _blackFlashParticles.push(core);

    // 2. JAGGED LIGHTNING BURST (Pre-compiled Path2D)
    const lightning = _getBFParticle();
    lightning.type = 'bfLightning';
    lightning.x = x; lightning.y = y;
    lightning.size = 1.0; 
    lightning.life = 1.0;
    lightning.decay = is1v2 ? 0.030 : 0.052;
    
    const boltCount = isLowPerf ? 3 : (is1v2 ? 4 : 5);
    const branches = isLowPerf ? 0 : (is1v2 ? 1 : 2);
    const lengthMult = is1v2 ? 0.9 : 1.0;
    
    const paths = _buildLightningPaths(boltCount, branches, lengthMult, isLowPerf);
    lightning.boltPath = paths.boltPath;
    lightning.branchPath = paths.branchPath;
    _blackFlashParticles.push(lightning);

    // 3. SPATIAL DISTORTION SHOCKWAVE RING
    if (!isLowPerf) {
      const ring = _getBFParticle();
      ring.type = 'bfRing';
      ring.x = x; ring.y = y;
      ring.size = 10;
      ring.maxSize = is1v2 ? 95 : 125;
      ring.life = 1.0;
      ring.decay = is1v2 ? 0.025 : 0.045;
      _blackFlashParticles.push(ring);
    }

    // 4. CURSED INK SHARDS (Streamlined to 5 crisp diamond debris particles)
    const shardCount = isLowPerf ? 2 : (is1v2 ? 3 : 5);
    const palette = ['#000000', '#1a0000', '#ff001e'];
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = (4.5 + Math.random() * 5.5) * (is1v2 ? 0.85 : 1.0);
      const shard = _getBFParticle();
      shard.type = 'bfShard';
      shard.x = x; shard.y = y;
      shard.vx = Math.cos(angle) * speed;
      shard.vy = Math.sin(angle) * speed;
      shard.size = 3.5 + Math.random() * 4.5;
      shard.life = 1.0;
      shard.decay = (is1v2 ? 0.022 : 0.038) + Math.random() * 0.015;
      shard.friction = 0.92;
      shard.color = palette[i % palette.length];
      _blackFlashParticles.push(shard);
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
// DRAW (Batched Render Passes with Pre-Compiled Path2D)
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

  _initCanvases();
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';

  // Single pass drawing for all Black Flash elements
  for (let i = 0; i < _blackFlashParticles.length; i++) {
    const p = _blackFlashParticles[i];
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.life <= 0) continue;

    if (p.type === 'bfLightning') {
      if (!p.boltPath) continue;
      
      const activeLife = p.life * (0.75 + Math.random() * 0.25);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = Math.max(0, Math.min(1.0, activeLife));

      // ── Layer 1: Crimson Red Spatial Distortion Outline (Outer Aura) ──
      ctx.strokeStyle = `rgba(255, 15, 25, ${activeLife * 0.90})`;
      ctx.lineWidth = 14 * activeLife;
      ctx.stroke(p.boltPath);
      if (p.branchPath) {
        ctx.lineWidth = 7 * activeLife;
        ctx.stroke(p.branchPath);
      }

      // ── Layer 2: Stark Black Manga Ink Core (Center Lightning) ──
      ctx.strokeStyle = `rgba(0, 0, 0, ${activeLife})`;
      ctx.lineWidth = 6 * activeLife;
      ctx.stroke(p.boltPath);
      if (p.branchPath) {
        ctx.lineWidth = 2.8 * activeLife;
        ctx.stroke(p.branchPath);
      }

      // ── Layer 3: Hot Lilac-White Core Accent (Inner Spark Line) ──
      ctx.strokeStyle = `rgba(243, 232, 255, ${activeLife * 0.95})`;
      ctx.lineWidth = 1.6 * activeLife;
      ctx.stroke(p.boltPath);

      ctx.restore();

    } else if (p.type === 'bfCore') {
      p.size += (p.maxSize - p.size) * 0.25;
      
      if (_coreCanvas) {
        ctx.globalAlpha = Math.max(0, Math.min(1.0, p.life * 1.1));
        ctx.drawImage(_coreCanvas, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      }

    } else if (p.type === 'bfRing') {
      p.size += (p.maxSize - p.size) * 0.22;
      ctx.globalAlpha = Math.max(0, Math.min(1.0, p.life));

      // Outer dark red shockwave ring
      ctx.strokeStyle = `rgba(180, 0, 15, ${p.life * 0.75})`;
      ctx.lineWidth = 8 * p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();

      // Inner crisp crimson/lilac ring
      ctx.strokeStyle = `rgba(255, 230, 240, ${p.life * 0.85})`;
      ctx.lineWidth = 2 * p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.95, 0, Math.PI * 2);
      ctx.stroke();

    } else if (p.type === 'bfShard') {
      ctx.globalAlpha = Math.max(0, Math.min(1.0, p.life));
      ctx.fillStyle = p.color || '#000000';
      
      const s = p.size * p.life;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x + s * 0.45, p.y);
      ctx.lineTo(p.x, p.y + s);
      ctx.lineTo(p.x - s * 0.45, p.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}
