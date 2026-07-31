// ─────────────────────────────────────────────────────────────────────────────
// BLACK FLASH — Jujutsu Kaisen-Inspired Cursed Energy Strike Effect
// ─────────────────────────────────────────────────────────────────────────────
// JJK Description:
//   When cursed energy flows through a strike at the exact moment of impact,
//   space distorts and twists, amplifying damage by a factor of 2.5.
//   Visually: a crimson-black void blooms at the point of impact, surrounded
//   by crackling cursed energy that fractures the air.
// ─────────────────────────────────────────────────────────────────────────────
import { state } from '../../core/state.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL OBJECT POOL
// ─────────────────────────────────────────────────────────────────────────────
const BF_POOL_SIZE = 80;
const _bfPool = [];
for (let i = 0; i < BF_POOL_SIZE; i++) _bfPool.push({});

function _getBFParticle() {
  return _bfPool.length > 0 ? _bfPool.pop() : {};
}
function _returnBFParticle(p) {
  p.type = null; p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
  p.size = 0; p.life = 0; p.decay = 0; p.friction = 1;
  p.angle = 0; p.color = null; p.data = null;
  p._jitterMain = null;
  p._jitterBranches = null;
  p._lastJitterTick = null;
  _bfPool.push(p);
}

// Separate array so we never mix with sparkEffects
const _blackFlashParticles = [];

/** Generates a jagged path that branches out like cracks or tree branches. */
function _generateBranchingBolt(startX, startY, baseAngle, totalLen) {
  const mainPath = [];
  const branches = [];
  
  const steps = 4 + Math.floor(Math.random() * 2);
  const stepLen = totalLen / steps;
  
  let curX = startX;
  let curY = startY;
  let angle = baseAngle;
  mainPath.push({ x: curX, y: curY });
  
  for (let i = 1; i <= steps; i++) {
    angle += (Math.random() - 0.5) * 0.6; // jag left/right
    curX += Math.cos(angle) * stepLen;
    curY += Math.sin(angle) * stepLen;
    mainPath.push({ x: curX, y: curY });
    
    // Possibility to split/branch at intermediate nodes
    if (i === 2 || i === 3) {
      if (Math.random() < 0.75) {
        // Spawn a branch!
        const branchAngle = angle + (Math.random() < 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.45);
        const branchSteps = steps - i;
        const branchPath = [{ x: curX, y: curY }];
        let bx = curX;
        let by = curY;
        let ba = branchAngle;
        
        for (let b = 0; b < branchSteps; b++) {
          ba += (Math.random() - 0.5) * 0.55;
          bx += Math.cos(ba) * stepLen * 0.95;
          by += Math.sin(ba) * stepLen * 0.95;
          branchPath.push({ x: bx, y: by });
        }
        branches.push(branchPath);
      }
    }
  }
  
  return { mainPath, branches };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPAWN — Call this to trigger the Black Flash at (x, y)
// ─────────────────────────────────────────────────────────────────────────────
export function spawnBlackFlash(x, y) {
  const fps = (state && state.fps) || 60;
  // Throttle during low fps
  if (fps < 30 && Math.random() < 0.5) return;

  // ── 1. DARK VOID IMPLOSION CORE ──────────────────────────────────────────
  // A pitch-black sphere that expands fast, then implodes.
  const core = _getBFParticle();
  core.type = 'bfCore';
  core.x = x; core.y = y;
  core.vx = 0; core.vy = 0;
  core.size = 6;
  core.maxSize = 55;
  core.life = 1.0;
  core.decay = 0.025; // Implodes over 40 frames (~0.67s)
  core.friction = 1;
  _blackFlashParticles.push(core);

  // ── 2. SCREEN-WIDE CRIMSON-BLACK FLASH ───────────────────────────────────
  // Briefly darkens the whole canvas in deep crimson, like the anime closeup.
  const screenFlash = _getBFParticle();
  screenFlash.type = 'bfScreenFlash';
  screenFlash.x = x; screenFlash.y = y;
  screenFlash.size = 0; // unused
  screenFlash.life = 1.0;
  screenFlash.decay = 0.08; // Lingers on screen for ~12 frames (0.2s)
  _blackFlashParticles.push(screenFlash);

  // ── 3. EXPANDING VOID SHOCKWAVE RINGS (2 rings) ──────────────────────────
  for (let r = 0; r < 2; r++) {
    const ring = _getBFParticle();
    ring.type = 'bfRing';
    ring.x = x; ring.y = y;
    ring.size = 10 + r * 15;
    ring.maxSize = 90 + r * 50;
    ring.life = 1.0;
    ring.decay = 0.022 + r * 0.012; // Lingers for 30-45 frames
    ring.lineWidth = 3 - r;
    _blackFlashParticles.push(ring);
  }

  // ── 4. CURSED ENERGY JAGGED CRACK BOLTS ──────────────────────────────────
  // Radial lightning-like energy tendrils shooting outward.
  const boltCount = 7 + Math.floor(Math.random() * 3);
  for (let i = 0; i < boltCount; i++) {
    const baseAngle = (i / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const bolt = _getBFParticle();
    bolt.type = 'bfBolt';
    bolt.x = x; bolt.y = y;
    bolt.angle = baseAngle;
    
    // Use the branching generator
    const totalLen = 50 + Math.random() * 45;
    bolt.data = _generateBranchingBolt(x, y, baseAngle, totalLen);
    
    bolt.life = 1.0;
    bolt.decay = 0.020 + Math.random() * 0.015; // Lingers for 30-50 frames (~0.5s - 0.8s) so crackles are highly visible
    bolt.size = 2.5 + Math.random() * 2.5;
    _blackFlashParticles.push(bolt);
  }

  // ── 5. VOID PARTICLE SHARDS — small dark fragments flying out ────────────
  const shardCount = 8;
  for (let i = 0; i < shardCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4.5 + Math.random() * 8;
    const shard = _getBFParticle();
    shard.type = 'bfShard';
    shard.x = x; shard.y = y;
    shard.vx = Math.cos(angle) * speed;
    shard.vy = Math.sin(angle) * speed;
    shard.size = 3 + Math.random() * 4;
    shard.life = 1.0;
    shard.decay = 0.018 + Math.random() * 0.018; // Lingers for 30-55 frames
    shard.friction = 0.90;
    // Alternate between pitch black, deep crimson, and dark purple (JJK palette)
    const palette = ['#000000', '#1a0000', '#3b0000', '#1a001a', '#ff0000', '#cc0000'];
    shard.color = palette[Math.floor(Math.random() * palette.length)];
    _blackFlashParticles.push(shard);
  }

  // ── 6. CRIMSON INNER GLOW ─────────────────────────────────────────────────
  const glow = _getBFParticle();
  glow.type = 'bfGlow';
  glow.x = x; glow.y = y;
  glow.size = 30;
  glow.maxSize = 70;
  glow.life = 1.0;
  glow.decay = 0.05;
  _blackFlashParticles.push(glow);
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE — Call every frame from the main game loop
// ─────────────────────────────────────────────────────────────────────────────
export function updateBlackFlashEffects(frozen = false) {
  for (let i = _blackFlashParticles.length - 1; i >= 0; i--) {
    const p = _blackFlashParticles[i];
    if (!frozen) {
      p.life -= p.decay;
      if (p.vx !== undefined) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.friction !== undefined && p.friction < 1) {
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
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW — Call every frame from the main game loop
// ─────────────────────────────────────────────────────────────────────────────
export function drawBlackFlashEffects(ctx) {
  if (!ctx || _blackFlashParticles.length === 0) return;

  const originalGCO = ctx.globalCompositeOperation;
  const originalAlpha = ctx.globalAlpha;

  for (const p of _blackFlashParticles) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.life <= 0) continue;

    ctx.globalAlpha = Math.max(0, p.life);

    if (p.type === 'bfScreenFlash') {
      // ── Full-screen deep crimson wash (JJK's signature red flash) ──────
      const isGamePlay = (typeof state !== 'undefined' && state.gameState && ['fight', 'countdown', 'paused', 'roundEnd'].includes(state.gameState));
      if (isGamePlay) {
        // High-performance source-over translucent wash to avoid expensive canvas multiply blend-mode readback
        ctx.globalAlpha = p.life * 0.38;
        ctx.fillStyle = '#280005';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      } else {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = p.life * 0.45;
        ctx.fillStyle = '#3b0000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }

    } else if (p.type === 'bfCore') {
      // ── Expanding black void sphere ─────────────────────────────────────
      p.size = p.size + (p.maxSize - p.size) * 0.25;

      const isGamePlay = (typeof state !== 'undefined' && state.gameState && ['fight', 'countdown', 'paused', 'roundEnd'].includes(state.gameState));
      if (isGamePlay) {
        ctx.globalCompositeOperation = 'source-over'; // Fast drawing without readbacks
        // Fast flat circle fill instead of radial gradient creation
        ctx.fillStyle = 'rgba(10, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.75, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'multiply';
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, `rgba(0, 0, 0, 1.0)`);
        grad.addColorStop(0.6, `rgba(20, 0, 0, 0.85)`);
        grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

    } else if (p.type === 'bfRing') {
      // ── Expanding void shockwave ring (optimized shadowBlur removal) ────
      p.size = p.size + (p.maxSize - p.size) * 0.15;
      ctx.globalCompositeOperation = 'lighter';
      
      // Pass 1: Thick outer blur-simulating glow circle
      ctx.strokeStyle = `rgba(160, 0, 10, ${p.life * 0.25})`;
      ctx.lineWidth = (p.lineWidth || 2) * p.life + 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();

      // Pass 2: Sharp high-opacity inner core circle
      ctx.strokeStyle = `rgba(255, 30, 40, ${p.life * 0.8})`;
      ctx.lineWidth = (p.lineWidth || 2) * p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.globalCompositeOperation = 'source-over';

    } else if (p.type === 'bfBolt') {
      // ── Jagged cursed energy bolt with branching tree-branch paths ──
      if (!p.data || !p.data.mainPath || p.data.mainPath.length < 2) continue;

      // Rapidly flicker opacity for an electric, crackling look
      const flicker = 0.6 + Math.random() * 0.4;
      ctx.globalAlpha = Math.max(0, p.life * flicker);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'miter';
      
      // Calculate or retrieve cached jittered path points for this frame
      const jitterTick = Math.floor(Date.now() / 40); // 25Hz jitter is visual-equivalent to 60Hz but avoids recalculation
      if (!p._jitterMain || p._lastJitterTick !== jitterTick) {
        p._lastJitterTick = jitterTick;
        p._jitterMain = p.data.mainPath.map((pt, idx) => {
          if (idx === 0) return { x: pt.x, y: pt.y }; // keep starting center locked
          return {
            x: pt.x + (Math.random() - 0.5) * 10 * (1 - p.life * 0.5),
            y: pt.y + (Math.random() - 0.5) * 10 * (1 - p.life * 0.5)
          };
        });
        
        p._jitterBranches = p.data.branches.map(branch => {
          return branch.map((pt, idx) => {
            if (idx === 0) {
              return { x: p._jitterMain[2]?.x || pt.x, y: p._jitterMain[2]?.y || pt.y };
            }
            return {
              x: pt.x + (Math.random() - 0.5) * 10 * (1 - p.life * 0.5),
              y: pt.y + (Math.random() - 0.5) * 10 * (1 - p.life * 0.5)
            };
          });
        });
      }
      
      const jitterMain = p._jitterMain;
      const jitterBranches = p._jitterBranches;

      // ── Calculate dynamic growth progress ──
      const gMain = Math.min(1.0, (1.0 - p.life) / 0.22);
      let gBranch = 0.0;
      if (gMain > 0.5) {
        gBranch = (gMain - 0.5) / 0.5; // Scales from 0.0 to 1.0
      }

      // Avoid slice/creation overhead when fully grown (which is 78% of the duration)
      const drawMain = (gMain >= 0.999) ? jitterMain : _getSubPath(jitterMain, gMain);
      const drawBranches = (gBranch >= 0.999) 
        ? jitterBranches 
        : jitterBranches.map(branch => _getSubPath(branch, gBranch)).filter(b => b.length > 0);
      
      // Batch all paths (main + branches) into a single path and call stroke once to optimize Canvas draw calls
      const drawPathsCombined = (mainPoints, branchesList) => {
        ctx.beginPath();
        if (mainPoints && mainPoints.length >= 2) {
          ctx.moveTo(mainPoints[0].x, mainPoints[0].y);
          for (let i = 1; i < mainPoints.length; i++) ctx.lineTo(mainPoints[i].x, mainPoints[i].y);
        }
        for (const branch of branchesList) {
          if (branch && branch.length >= 2) {
            ctx.moveTo(branch[0].x, branch[0].y);
            for (let i = 1; i < branch.length; i++) ctx.lineTo(branch[i].x, branch[i].y);
          }
        }
        ctx.stroke();
      };
      
      const isGamePlay = (typeof state !== 'undefined' && state.gameState && ['fight', 'countdown', 'paused', 'roundEnd'].includes(state.gameState));
      if (isGamePlay) {
        // High-performance gameplay-optimized drawing (3 passes, no expensive flame-wisps)
        // Pass 1: Crimson/Black outer contour
        ctx.strokeStyle = `rgba(0, 0, 0, ${p.life * 0.9})`;
        ctx.lineWidth = (p.size * 3.5 + 4) * p.life;
        drawPathsCombined(drawMain, drawBranches);

        // Pass 2: Electric red-pink glow
        ctx.strokeStyle = `rgba(255, 20, 147, ${p.life * 0.85})`;
        ctx.lineWidth = (p.size * 2.0 + 1) * p.life;
        drawPathsCombined(drawMain, drawBranches);

        // Pass 3: White center core
        ctx.strokeStyle = `rgba(255, 255, 255, ${p.life * 0.95})`;
        ctx.lineWidth = p.size * 0.7 * p.life;
        drawPathsCombined(drawMain, drawBranches);
      } else {
        // Step 1: Draw massive deep crimson red glow under all paths
        ctx.strokeStyle = `rgba(160, 0, 10, ${p.life * 0.45})`;
        ctx.lineWidth = (p.size * 5.0 + 8) * p.life;
        drawPathsCombined(drawMain, drawBranches);

        // Step 2: Draw thick stark black contours
        ctx.strokeStyle = `rgba(0, 0, 0, ${p.life * 0.95})`;
        ctx.lineWidth = (p.size * 3.5 + 4) * p.life;
        drawPathsCombined(drawMain, drawBranches);

        // Step 3: Draw deep crimson red cores (#B30000)
        ctx.strokeStyle = `rgba(179, 0, 0, ${p.life * 0.95})`;
        ctx.lineWidth = (p.size * 1.5 + 1.2) * p.life;
        drawPathsCombined(drawMain, drawBranches);

        // Step 4: Draw thin electric lilac-tinted white center lines (#F3E8FF)
        ctx.strokeStyle = `rgba(243, 232, 255, ${p.life * 0.95})`;
        ctx.lineWidth = p.size * 0.5 * p.life;
        drawPathsCombined(drawMain, drawBranches);
        
        // Step 5: Draw flame-wisps on the main path nodes close to center (skipped at low alpha/life)
        if (p.life > 0.15) {
          const limitPts = Math.min(drawMain.length, 3);
          for (let j = 0; j < limitPts; j++) {
            const pt = drawMain[j];
            const progress = j / (drawMain.length - 1 || 1);
            const wispSize = (8 + (1 - progress) * 14) * p.life * (0.8 + Math.random() * 0.4);
            
            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(p.angle || 0);
            
            // Flame contour: stark black
            ctx.beginPath();
            ctx.moveTo(-wispSize * 0.25, 0);
            ctx.quadraticCurveTo(wispSize * 0.3, wispSize * 0.55, wispSize * 0.95, 0);
            ctx.quadraticCurveTo(wispSize * 0.3, -wispSize * 0.55, -wispSize * 0.25, 0);
            ctx.closePath();
            ctx.fillStyle = '#000000';
            ctx.fill();
            
            // Only draw detailed cores if the wisp is large enough to be resolved visually
            if (wispSize > 4) {
              // Inner deep crimson red flame core (#B30000)
              ctx.beginPath();
              ctx.moveTo(-wispSize * 0.15, 0);
              ctx.quadraticCurveTo(wispSize * 0.25, wispSize * 0.35, wispSize * 0.65, 0);
              ctx.quadraticCurveTo(wispSize * 0.25, -wispSize * 0.35, -wispSize * 0.15, 0);
              ctx.closePath();
              ctx.fillStyle = '#B30000';
              ctx.fill();
            }
            
            if (wispSize > 8) {
              // Lilac-tinted white hot core center (#F3E8FF)
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.quadraticCurveTo(wispSize * 0.15, wispSize * 0.15, wispSize * 0.4, 0);
              ctx.quadraticCurveTo(wispSize * 0.15, -wispSize * 0.15, 0, 0);
              ctx.closePath();
              ctx.fillStyle = '#F3E8FF';
              ctx.fill();
            }
            
            ctx.restore();
          }
        }
      }

    } else if (p.type === 'bfShard') {
      // ── Flying void fragment ───────────────────────────────────────────
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = p.color || '#000000';
      // Draw as a small diamond/shard shape
      const s = p.size * p.life;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x + s * 0.4, p.y);
      ctx.lineTo(p.x, p.y + s);
      ctx.lineTo(p.x - s * 0.4, p.y);
      ctx.closePath();
      ctx.fill();

      // Faint crimson glow around dark shards
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(120, 0, 0, ${p.life * 0.3})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

    } else if (p.type === 'bfGlow') {
      // ── Crimson inner radial glow ──────────────────────────────────────
      p.size = p.size + (p.maxSize - p.size) * 0.1;

      ctx.globalCompositeOperation = 'lighter';
      const isGamePlay = (typeof state !== 'undefined' && state.gameState && ['fight', 'countdown', 'paused', 'roundEnd'].includes(state.gameState));
      if (isGamePlay) {
        // Fast flat circle fill instead of radial gradient creation
        ctx.fillStyle = `rgba(180, 0, 10, ${p.life * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        // Red core gradient (lilac/deep crimson)
        glowGrad.addColorStop(0,   `rgba(180, 0, 10,  ${p.life * 0.7})`);
        glowGrad.addColorStop(0.4, `rgba(120, 0, 5,   ${p.life * 0.5})`);
        glowGrad.addColorStop(0.8, `rgba(60, 0, 2,    ${p.life * 0.25})`);
        glowGrad.addColorStop(1,   `rgba(0, 0, 0, 0)`);
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalCompositeOperation = originalGCO;
  ctx.globalAlpha = originalAlpha;
}

// Helper to calculate a sub-path of points up to a given progress fraction (0.0 to 1.0)
function _getSubPath(points, progress) {
  if (!points || points.length < 2) return [];
  if (progress <= 0.001) return [];
  if (progress >= 0.999) return points;
  
  const subPoints = [points[0]];
  const totalSegments = points.length - 1;
  const targetSeg = progress * totalSegments;
  const fullSegs = Math.floor(targetSeg);
  const partial = targetSeg - fullSegs;
  
  for (let i = 1; i <= fullSegs; i++) {
    subPoints.push(points[i]);
  }
  
  if (fullSegs < totalSegments && partial > 0.001) {
    const lastPt = points[fullSegs];
    const nextPt = points[fullSegs + 1];
    subPoints.push({
      x: lastPt.x + (nextPt.x - lastPt.x) * partial,
      y: lastPt.y + (nextPt.y - lastPt.y) * partial
    });
  }
  return subPoints;
}

