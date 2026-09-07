// ─────────────────────────────────────────────────────────────────────────────
// BLACK FLASH — Jujutsu Kaisen Cursed Energy Strike Effect (High-Impact Pixel Art)
// Optimized for Zero GC Overhead & Rock-Solid 60 FPS
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

// Pre-rendered Pixel Art Black Flash Singularity Void Core (Zero GC)
let _cachedBfCoreCanvas = null;

function _initBfCoreCanvas() {
  if (typeof document === 'undefined' || _cachedBfCoreCanvas) return;

  const P = 2.0;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = 26;
  const voidR = 18;
  const whiteR = 6;

  // 1. Outer Stepped Crimson Cursed Energy Halo
  g.fillStyle = 'rgba(255, 15, 30, 0.85)';
  for (let y = -outerR; y <= outerR; y += P) {
    for (let x = -outerR; x <= outerR; x += P) {
      const d = Math.hypot(x, y);
      if (d <= outerR && (Math.round(x / P) + Math.round(y / P)) % 2 === 0) {
        g.fillRect(cx + x - P / 2, cy + y - P / 2, P, P);
      }
    }
  }

  // 2. Mid Stark Black Singularity (Stepped Octagonal Void Sphere)
  g.fillStyle = '#000000';
  for (let y = -voidR; y <= voidR; y += P) {
    for (let x = -voidR; x <= voidR; x += P) {
      const d = Math.hypot(x, y);
      if (d <= voidR) {
        g.fillRect(cx + x - P / 2, cy + y - P / 2, P, P);
      }
    }
  }

  // 3. Central Pure-White Specular Flash Cluster
  g.fillStyle = '#FFFFFF';
  for (let y = -whiteR; y <= whiteR; y += P) {
    for (let x = -whiteR; x <= whiteR; x += P) {
      if (Math.abs(x) + Math.abs(y) <= whiteR) {
        g.fillRect(cx + x - P / 2, cy + y - P / 2, P, P);
      }
    }
  }

  _cachedBfCoreCanvas = c;
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
    const isLowPerf = Boolean((typeof state !== 'undefined' && state.performanceMode) || fps < 55);
    
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

    _initBfCoreCanvas();

    // 1. IMPACT CORE (Void Singularity Implosion)
    const core = _getBFParticle();
    core.type = 'bfCore';
    core.x = x; core.y = y;
    core.size = 10;
    core.maxSize = is1v2 ? 38 : 46;
    core.life = 1.0;
    core.decay = is1v2 ? 0.028 : 0.045;
    
    // Generate radial micro-fracture spikes radiating from core
    const P = 2.5;
    const microSpikes = [];
    const spikeCount = isLowPerf ? 4 : 6;
    for (let s = 0; s < spikeCount; s++) {
      const a = (s / spikeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const len = 12 + Math.random() * 14;
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
    lightning.decay = is1v2 ? 0.032 : 0.050;
    
    const boltCount = isLowPerf ? 4 : (is1v2 ? 5 : 6);
    const branches = isLowPerf ? 0 : (is1v2 ? 2 : 3);
    const lengthMult = is1v2 ? 0.95 : 1.1;
    
    const paths = _buildLightningSegments(boltCount, branches, lengthMult, isLowPerf);
    lightning.boltSegments = paths.boltSegments;
    lightning.branchSegments = paths.branchSegments;
    _blackFlashParticles.push(lightning);

    // 3. SUPERSONIC DIRECTIONAL PIXEL SPARKS (Action Streaks, No Diamonds)
    const streakCount = isLowPerf ? 4 : (is1v2 ? 6 : 8);
    const palette = ['#FFFFFF', '#FF0022', '#B30000', '#0E0F14'];
    for (let i = 0; i < streakCount; i++) {
      const angle = (i / streakCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const speed = (5.5 + Math.random() * 6.0) * (is1v2 ? 0.85 : 1.0);
      const spark = _getBFParticle();
      spark.type = 'bfSpark';
      spark.x = x; spark.y = y;
      spark.vx = Math.cos(angle) * speed;
      spark.vy = Math.sin(angle) * speed;
      spark.size = 2.0;
      spark.life = 1.0;
      spark.decay = (is1v2 ? 0.028 : 0.045) + Math.random() * 0.015;
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
// DRAW (High-Performance Stepped Pixel Art Passes — Zero Ring, Zero GC)
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

  // Single pass drawing for all Black Flash elements
  for (let i = 0; i < _blackFlashParticles.length; i++) {
    const p = _blackFlashParticles[i];
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.life <= 0) continue;

    if (p.type === 'bfLightning') {
      if (!p.boltSegments || p.boltSegments.length === 0) continue;
      
      const activeLife = Math.max(0, Math.min(1.0, p.life * (0.80 + Math.random() * 0.20)));
      if (activeLife <= 0.01) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = activeLife;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';

      // ── Layer 1: Crimson Red Spatial Distortion Outline (Outer Pixel Aura) ──
      ctx.strokeStyle = `rgba(255, 15, 25, ${(activeLife * 0.95).toFixed(3)})`;
      ctx.lineWidth = 6.0;
      ctx.beginPath();
      for (let s = 0; s < p.boltSegments.length; s++) {
        const seg = p.boltSegments[s];
        ctx.moveTo(seg.x0, seg.y0);
        ctx.lineTo(seg.x1, seg.y1);
      }
      if (p.branchSegments) {
        for (let s = 0; s < p.branchSegments.length; s++) {
          const seg = p.branchSegments[s];
          ctx.moveTo(seg.x0, seg.y0);
          ctx.lineTo(seg.x1, seg.y1);
        }
      }
      ctx.stroke();

      // ── Layer 2: Stark Black Manga Ink Core (Center Lightning) ──
      ctx.strokeStyle = `rgba(0, 0, 0, ${activeLife.toFixed(3)})`;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      for (let s = 0; s < p.boltSegments.length; s++) {
        const seg = p.boltSegments[s];
        ctx.moveTo(seg.x0, seg.y0);
        ctx.lineTo(seg.x1, seg.y1);
      }
      if (p.branchSegments) {
        for (let s = 0; s < p.branchSegments.length; s++) {
          const seg = p.branchSegments[s];
          ctx.moveTo(seg.x0, seg.y0);
          ctx.lineTo(seg.x1, seg.y1);
        }
      }
      ctx.stroke();

      // ── Layer 3: Hot Lilac-White Specular Center Streak ──
      ctx.strokeStyle = `rgba(243, 232, 255, ${(activeLife * 0.98).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let s = 0; s < p.boltSegments.length; s++) {
        const seg = p.boltSegments[s];
        ctx.moveTo(seg.x0, seg.y0);
        ctx.lineTo(seg.x1, seg.y1);
      }
      ctx.stroke();

      ctx.restore();

    } else if (p.type === 'bfCore') {
      p.size += (p.maxSize - p.size) * 0.28;
      const alpha = Math.max(0, Math.min(1.0, p.life * 1.2));
      if (alpha <= 0.01) continue;

      _initBfCoreCanvas();

      if (_cachedBfCoreCanvas) {
        const drawSize = Math.round(p.size * 2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(_cachedBfCoreCanvas, Math.round(p.x - drawSize / 2), Math.round(p.y - drawSize / 2), drawSize, drawSize);

        // Radiating Stepped Pixel Micro-Fractures (Fast stroke lines)
        if (p.microSpikes && p.microSpikes.length > 0) {
          ctx.translate(p.x, p.y);
          ctx.lineCap = 'square';

          // Outer Crimson Spikes
          ctx.strokeStyle = `rgba(255, 15, 30, ${(alpha * 0.90).toFixed(3)})`;
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          for (let s = 0; s < p.microSpikes.length; s++) {
            const spk = p.microSpikes[s];
            ctx.moveTo(spk.x0, spk.y0);
            ctx.lineTo(spk.x1, spk.y1);
          }
          ctx.stroke();

          // Inner Black Spikes
          ctx.strokeStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let s = 0; s < p.microSpikes.length; s++) {
            const spk = p.microSpikes[s];
            ctx.moveTo(spk.x0, spk.y0);
            ctx.lineTo(spk.x1 * 0.8, spk.y1 * 0.8);
          }
          ctx.stroke();
        }

        ctx.restore();
      }

    } else if (p.type === 'bfSpark') {
      // High-velocity Directional Pixel Action Streak (NO DIAMONDS)
      const alpha = Math.max(0, Math.min(1.0, p.life));
      if (alpha <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'square';

      const tailX = p.x - p.vx * 1.8;
      const tailY = p.y - p.vy * 1.8;

      // 1. Dark Red Trail Streak
      ctx.strokeStyle = 'rgba(180, 0, 20, 0.75)';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // 2. Core Color Line
      ctx.strokeStyle = p.color || '#FF0022';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tailX * 0.5 + p.x * 0.5, tailY * 0.5 + p.y * 0.5);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // 3. Leading Pure-White Specular Tip
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 2, 2);

      ctx.restore();
    }
  }

  ctx.restore();
}
