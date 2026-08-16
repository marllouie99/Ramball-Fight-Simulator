// ─────────────────────────────────────────────────────────────────────────────
// BLACK FLASH — Jujutsu Kaisen-Inspired Cursed Energy Strike Effect (Optimized)
// ─────────────────────────────────────────────────────────────────────────────
import { state } from '../../core/state.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL OBJECT POOL (Zero GC Overhead design)
// ─────────────────────────────────────────────────────────────────────────────
const BF_POOL_SIZE = 100;
const _bfPool = [];

// A particle can have a large Float32Array to store static lightning geometry
// We store [x1, y1, x2, y2, isBranch] for each segment.
// We use 5 floats per segment. Up to 60 segments per lightning burst = 300 floats.
for (let i = 0; i < BF_POOL_SIZE; i++) {
  _bfPool.push({
    type: null,
    x: 0, y: 0, vx: 0, vy: 0,
    size: 0, life: 0, decay: 0, friction: 1,
    angle: 0, color: null,
    geom: new Float32Array(300),
    geomCount: 0 
  });
}

function _getBFParticle() {
  return _bfPool.length > 0 ? _bfPool.pop() : {
    type: null, x: 0, y: 0, vx: 0, vy: 0,
    size: 0, life: 0, decay: 0, friction: 1,
    angle: 0, color: null,
    geom: new Float32Array(300),
    geomCount: 0
  };
}

function _returnBFParticle(p) {
  p.type = null; p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
  p.size = 0; p.life = 0; p.decay = 0; p.friction = 1;
  p.angle = 0; p.color = null; p.geomCount = 0;
  _bfPool.push(p);
}

const _blackFlashParticles = [];

// ─────────────────────────────────────────────────────────────────────────────
// PRE-RENDERED GLOW CANVASES
// ─────────────────────────────────────────────────────────────────────────────
let redGlowCanvas = null;
let coreCanvas = null;

function _initCanvases() {
  if (typeof document === 'undefined' || redGlowCanvas) return;

  redGlowCanvas = document.createElement('canvas');
  redGlowCanvas.width = 128;
  redGlowCanvas.height = 128;
  const rgCtx = redGlowCanvas.getContext('2d');
  const rgGrad = rgCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  rgGrad.addColorStop(0,   'rgba(180, 0, 10, 0.75)');
  rgGrad.addColorStop(0.4, 'rgba(120, 0, 5, 0.5)');
  rgGrad.addColorStop(0.8, 'rgba(60, 0, 2, 0.25)');
  rgGrad.addColorStop(1,   'rgba(0, 0, 0, 0)');
  rgCtx.fillStyle = rgGrad;
  rgCtx.fillRect(0, 0, 128, 128);

  coreCanvas = document.createElement('canvas');
  coreCanvas.width = 128;
  coreCanvas.height = 128;
  const cCtx = coreCanvas.getContext('2d');
  const cGrad = cCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  cGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  cGrad.addColorStop(0.6, 'rgba(20, 0, 0, 0.85)');
  cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  cCtx.fillStyle = cGrad;
  cCtx.fillRect(0, 0, 128, 128);
}

// Helper to generate jagged branching lightning geometry directly into a typed array
function _buildLightningGeometry(geom, startX, startY, baseAngle, totalLength, branches) {
  let segIndex = 0;
  const steps = 4 + Math.floor(Math.random() * 3);
  const stepLen = totalLength / steps;
  
  let curX = startX;
  let curY = startY;
  let currentAngle = baseAngle;
  
  for (let i = 0; i < steps; i++) {
    if (segIndex >= 295) break; // Array bounds protection
    
    // Jagged angle variation (sharp turns, no smooth curves)
    currentAngle += (Math.random() - 0.5) * 1.2; 
    
    const nextX = curX + Math.cos(currentAngle) * stepLen;
    const nextY = curY + Math.sin(currentAngle) * stepLen;
    
    // Main bolt segment (0 = main)
    geom[segIndex++] = curX;
    geom[segIndex++] = curY;
    geom[segIndex++] = nextX;
    geom[segIndex++] = nextY;
    geom[segIndex++] = 0; 
    
    // Create thinner branch branching outward?
    if (branches > 0 && Math.random() < 0.4) {
      branches--;
      const branchAngle = currentAngle + (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8);
      const branchLen = stepLen * (1.5 + Math.random());
      
      const bNextX = nextX + Math.cos(branchAngle) * branchLen;
      const bNextY = nextY + Math.sin(branchAngle) * branchLen;
      
      // Branch segment (1 = branch, drawn thinner)
      geom[segIndex++] = nextX;
      geom[segIndex++] = nextY;
      geom[segIndex++] = bNextX;
      geom[segIndex++] = bNextY;
      geom[segIndex++] = 1; 
      
      // Secondary micro-branch?
      if (Math.random() < 0.3) {
         const microAngle = branchAngle + (Math.random() > 0.5 ? 1 : -1) * 0.5;
         const microLen = branchLen * 0.6;
         geom[segIndex++] = bNextX;
         geom[segIndex++] = bNextY;
         geom[segIndex++] = bNextX + Math.cos(microAngle) * microLen;
         geom[segIndex++] = bNextY + Math.sin(microAngle) * microLen;
         geom[segIndex++] = 2; // micro branch
      }
    }
    
    curX = nextX;
    curY = nextY;
  }
  
  return segIndex; // Total float count
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
    
    // Throttle Black Flash spawns to prevent extreme lag spikes
    const now = Date.now();
    const throttleTime = is1v2 ? 32 : 16; // Fix: Reduce throttle to 32ms in 1v2 mode to allow rapid multi-target triggers
    if (now - _lastBFSpawnTime < throttleTime) { 
      return;
    }
    _lastBFSpawnTime = now;
    
    if (fps < 30 && Math.random() < 0.6) return;

    // 1. IMPACT CORE (Void)
    const core = _getBFParticle();
    core.type = 'bfCore';
    core.x = x; core.y = y;
    core.size = 6;
    core.maxSize = 45;
    core.life = 1.0;
    core.decay = is1v2 ? 0.018 : 0.035; // Fix: Slower decay in 1v2 mode to match normal duration (~55 frames)
    _blackFlashParticles.push(core);

    // 2. JAGGED LIGHTNING BURST
    const lightning = _getBFParticle();
    lightning.type = 'bfLightning';
    lightning.x = x; lightning.y = y;
    lightning.size = 1.0; 
    lightning.life = 1.0;
    lightning.decay = is1v2 ? 0.025 : 0.05; // Fix: Slower decay in 1v2 mode to match normal duration (~40 frames)
    
    // Calculate static geometry once at spawn
    const boltCount = isLowPerf ? 2 : is1v2 ? 4 : 7; // Fix: Slightly more bolts (4 vs 3) in 1v2 for better visibility
    const branches = isLowPerf ? 0 : is1v2 ? 2 : 3;  // Fix: Slightly more branches (2 vs 1) in 1v2 for fullness
    const lengthMult = is1v2 ? 0.9 : 1.0;             // Fix: Slightly larger length multiplier (0.9 vs 0.8)
    let offsetIndex = 0;
    
    for (let b = 0; b < boltCount; b++) {
      const angle = (b / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const length = ((isLowPerf ? 60 : 90) + Math.random() * 50) * lengthMult;
      
      const written = _buildLightningGeometry(
        lightning.geom.subarray(offsetIndex), 
        0, 0, angle, length, branches
      );
      offsetIndex += written;
      if (offsetIndex >= 295) break; 
    }
    lightning.geomCount = offsetIndex;
    
    _blackFlashParticles.push(lightning);

    // 3. SHOCKWAVE RING (Optimized/Simplified in 1v2)
    if (!isLowPerf) {
      const ring = _getBFParticle();
      ring.type = 'bfRing';
      ring.x = x; ring.y = y;
      ring.size = 10;
      ring.maxSize = is1v2 ? 90 : 120;
      ring.life = 1.0;
      ring.decay = is1v2 ? 0.02 : 0.04; // Fix: Slower decay in 1v2 mode (~50 frames)
      _blackFlashParticles.push(ring);
    }

    // 4. SHARDS
    const shardCount = isLowPerf ? 2 : is1v2 ? 4 : 8;
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (4 + Math.random() * 6) * (is1v2 ? 0.8 : 1.0);
      const shard = _getBFParticle();
      shard.type = 'bfShard';
      shard.x = x; shard.y = y;
      shard.vx = Math.cos(angle) * speed;
      shard.vy = Math.sin(angle) * speed;
      shard.size = 3 + Math.random() * 5;
      shard.life = 1.0;
      shard.decay = (is1v2 ? 0.015 : 0.03) + Math.random() * (is1v2 ? 0.01 : 0.02); // Fix: Slower decay in 1v2 mode (~40-66 frames)
      shard.friction = 0.92;
      const palette = ['#000000', '#1a0000', '#ff0000'];
      shard.color = palette[Math.floor(Math.random() * palette.length)];
      _blackFlashParticles.push(shard);
    }
  } catch (err) {
    console.error("Error in spawnBlackFlash:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────
export function updateBlackFlashEffects(frozen = false) {
  try {
    for (let i = _blackFlashParticles.length - 1; i >= 0; i--) {
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
      if (p.life <= 0) {
        _blackFlashParticles.splice(i, 1);
        _returnBFParticle(p);
      }
    }
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
// DRAW
// ─────────────────────────────────────────────────────────────────────────────
export function drawBlackFlashEffects(ctx) {
  if (!ctx || _blackFlashParticles.length === 0) return;

  const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd');
  if (isMatchEnded) {
    clearBlackFlashEffects();
    return;
  }

  const is1v2 = typeof state !== 'undefined' && state.mode && (state.mode === '1v2' || state.mode.includes('1v2'));

  _initCanvases();
  ctx.save();
  ctx.lineJoin = 'miter'; // sharp corners
  ctx.lineCap = 'butt';

  for (let i = 0; i < _blackFlashParticles.length; i++) {
    const p = _blackFlashParticles[i];
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.life <= 0) continue;

    ctx.save();
    
    // Make lightning randomly flicker in opacity for an unstable look
    let activeLife = p.life;
    if (p.type === 'bfLightning') {
      activeLife = p.life * (0.6 + Math.random() * 0.4);
    }
    ctx.globalAlpha = Math.max(0, activeLife);

    if (p.type === 'bfLightning') {
      ctx.translate(p.x, p.y);
      
      // Give it a tiny bit of jittering scale to make it look highly unstable and pulsing
      const jitterScale = 1.0 + (Math.random() - 0.5) * 0.05;
      ctx.scale(jitterScale, jitterScale);

      // Build the single unified path for each thickness level to massively optimize stroke calls
      const drawLayer = (color, baseWidth) => {
        ctx.strokeStyle = color;
        
        // Pass 1: Main Bolts
        ctx.lineWidth = baseWidth * 1.0 * activeLife;
        ctx.beginPath();
        for (let j = 0; j < p.geomCount; j += 5) {
          if (p.geom[j+4] === 0) {
            ctx.moveTo(p.geom[j], p.geom[j+1]);
            ctx.lineTo(p.geom[j+2], p.geom[j+3]);
          }
        }
        ctx.stroke();

        // Pass 2: Branches
        ctx.lineWidth = baseWidth * 0.6 * activeLife;
        ctx.beginPath();
        for (let j = 0; j < p.geomCount; j += 5) {
          if (p.geom[j+4] === 1) {
            ctx.moveTo(p.geom[j], p.geom[j+1]);
            ctx.lineTo(p.geom[j+2], p.geom[j+3]);
          }
        }
        ctx.stroke();
        
        // Pass 3: Micro-Branches
        ctx.lineWidth = baseWidth * 0.3 * activeLife;
        ctx.beginPath();
        for (let j = 0; j < p.geomCount; j += 5) {
          if (p.geom[j+4] === 2) {
            ctx.moveTo(p.geom[j], p.geom[j+1]);
            ctx.lineTo(p.geom[j+2], p.geom[j+3]);
          }
        }
        ctx.stroke();
      };
      
      // Layer 1: Crimson Red Glow / Spatial Distortion (Outer)
      ctx.globalCompositeOperation = 'source-over'; 
      drawLayer(`rgba(255, 10, 20, ${activeLife * 0.85})`, 16);
      
      // Skip the second, larger red glow pass in 1v2 mode to cut down stroke calls by 33%
      if (!is1v2) {
        drawLayer(`rgba(160, 0, 10, ${activeLife * 0.6})`, 24); // Extended soft glow
      }
      
      // Layer 2: Solid Stark Black Ink Core (Inner)
      drawLayer(`rgba(0, 0, 0, ${activeLife})`, 8);

    } else if (p.type === 'bfCore') {
      p.size = p.size + (p.maxSize - p.size) * 0.25;
      
      ctx.globalCompositeOperation = 'source-over';
      
      if (coreCanvas) {
        ctx.drawImage(coreCanvas, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      } else {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, `rgba(0, 0, 0, ${p.life})`);
        grad.addColorStop(0.6, `rgba(20, 0, 0, ${p.life * 0.85})`);
        grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
    } else if (p.type === 'bfRing') {
      p.size = p.size + (p.maxSize - p.size) * 0.2;
      ctx.globalCompositeOperation = 'source-over';
      
      // Outer dark red expanding ring
      ctx.strokeStyle = `rgba(168, 0, 10, ${p.life * 0.7})`;
      ctx.lineWidth = (is1v2 ? 6 : 12) * p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();

      if (!is1v2) {
        // Inner sharp red line (skip in 1v2 mode to save fill/stroke complexity)
        ctx.strokeStyle = `rgba(255, 30, 30, ${p.life})`;
        ctx.lineWidth = 3 * p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.95, 0, Math.PI * 2);
        ctx.stroke();
      }

    } else if (p.type === 'bfShard') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = p.color || '#000000';
      
      const s = p.size * p.life;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x + s * 0.4, p.y);
      ctx.lineTo(p.x, p.y + s);
      ctx.lineTo(p.x - s * 0.4, p.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}
