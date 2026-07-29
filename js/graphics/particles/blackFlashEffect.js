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
  _bfPool.push(p);
}

// Separate array so we never mix with sparkEffects
const _blackFlashParticles = [];

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
  core.decay = 0.045;
  core.friction = 1;
  _blackFlashParticles.push(core);

  // ── 2. SCREEN-WIDE CRIMSON-BLACK FLASH ───────────────────────────────────
  // Briefly darkens the whole canvas in deep crimson, like the anime closeup.
  const screenFlash = _getBFParticle();
  screenFlash.type = 'bfScreenFlash';
  screenFlash.x = x; screenFlash.y = y;
  screenFlash.size = 0; // unused
  screenFlash.life = 1.0;
  screenFlash.decay = 0.12; // very fast fade
  _blackFlashParticles.push(screenFlash);

  // ── 3. EXPANDING VOID SHOCKWAVE RINGS (2 rings) ──────────────────────────
  for (let r = 0; r < 2; r++) {
    const ring = _getBFParticle();
    ring.type = 'bfRing';
    ring.x = x; ring.y = y;
    ring.size = 10 + r * 15;
    ring.maxSize = 90 + r * 50;
    ring.life = 1.0;
    ring.decay = 0.035 + r * 0.02;
    ring.lineWidth = 3 - r;
    _blackFlashParticles.push(ring);
  }

  // ── 4. CURSED ENERGY JAGGED CRACK BOLTS ──────────────────────────────────
  // Radial lightning-like energy tendrils shooting outward.
  const boltCount = 10 + Math.floor(Math.random() * 4);
  for (let i = 0; i < boltCount; i++) {
    const baseAngle = (i / boltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const bolt = _getBFParticle();
    bolt.type = 'bfBolt';
    bolt.x = x; bolt.y = y;
    bolt.angle = baseAngle;
    // Generate jagged path segments
    const segCount = 4 + Math.floor(Math.random() * 3);
    const totalLen = 40 + Math.random() * 35;
    bolt.data = _buildJaggedPath(x, y, baseAngle, segCount, totalLen);
    bolt.life = 1.0;
    bolt.decay = 0.04 + Math.random() * 0.03;
    bolt.size = 1.5 + Math.random() * 1.5;
    _blackFlashParticles.push(bolt);
  }

  // ── 5. VOID PARTICLE SHARDS — small dark fragments flying out ────────────
  const shardCount = 14;
  for (let i = 0; i < shardCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3.5 + Math.random() * 6;
    const shard = _getBFParticle();
    shard.type = 'bfShard';
    shard.x = x; shard.y = y;
    shard.vx = Math.cos(angle) * speed;
    shard.vy = Math.sin(angle) * speed;
    shard.size = 3 + Math.random() * 4;
    shard.life = 1.0;
    shard.decay = 0.025 + Math.random() * 0.04;
    shard.friction = 0.91;
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
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Builds a jagged segmented path for the cursed energy bolt. */
function _buildJaggedPath(startX, startY, baseAngle, segs, totalLen) {
  const points = [{ x: startX, y: startY }];
  let cx = startX, cy = startY;
  const segLen = totalLen / segs;
  let angle = baseAngle;
  for (let s = 0; s < segs; s++) {
    angle += (Math.random() - 0.5) * 0.7; // jag left/right
    cx += Math.cos(angle) * segLen;
    cy += Math.sin(angle) * segLen;
    points.push({ x: cx, y: cy });
  }
  return points;
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
// DRAW — Call every frame to render all Black Flash particles
// ─────────────────────────────────────────────────────────────────────────────
export function drawBlackFlashEffects(ctx) {
  if (!ctx || _blackFlashParticles.length === 0) return;

  ctx.save();

  for (const p of _blackFlashParticles) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.life <= 0) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);

    if (p.type === 'bfScreenFlash') {
      // ── Full-screen deep crimson wash (JJK's signature red flash) ──────
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = p.life * 0.45;
      ctx.fillStyle = '#3b0000';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalCompositeOperation = 'source-over';

    } else if (p.type === 'bfCore') {
      // ── Expanding black void sphere ─────────────────────────────────────
      // Grows fast → shrinks (implosion feel)
      const growPhase = 1.0 - p.life;
      p.size = p.size + (p.maxSize - p.size) * 0.25;

      ctx.globalCompositeOperation = 'multiply';

      // Black void interior
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, `rgba(0, 0, 0, ${p.life})`);
      grad.addColorStop(0.6, `rgba(20, 0, 0, ${p.life * 0.85})`);
      grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';

    } else if (p.type === 'bfRing') {
      // ── Expanding void shockwave ring ──────────────────────────────────
      p.size = p.size + (p.maxSize - p.size) * 0.15;

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(180, 0, 0, ${p.life * 0.8})`;
      ctx.lineWidth = (p.lineWidth || 2) * p.life;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;

    } else if (p.type === 'bfBolt') {
      // ── Jagged cursed energy bolt ──────────────────────────────────────
      if (!p.data || p.data.length < 2) { ctx.restore(); continue; }

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 6;

      // Outer glow (deep red)
      ctx.strokeStyle = `rgba(200, 0, 0, ${p.life * 0.6})`;
      ctx.lineWidth = (p.size + 2) * p.life;
      ctx.shadowColor = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(p.data[0].x, p.data[0].y);
      for (let i = 1; i < p.data.length; i++) ctx.lineTo(p.data[i].x, p.data[i].y);
      ctx.stroke();

      // Core (white/bright red — cursed energy core)
      ctx.strokeStyle = `rgba(255, 200, 200, ${p.life * 0.9})`;
      ctx.lineWidth = p.size * p.life;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.moveTo(p.data[0].x, p.data[0].y);
      for (let i = 1; i < p.data.length; i++) ctx.lineTo(p.data[i].x, p.data[i].y);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;

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
      const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      glowGrad.addColorStop(0,   `rgba(255, 80, 0,  ${p.life * 0.7})`);
      glowGrad.addColorStop(0.4, `rgba(180, 0, 0,   ${p.life * 0.5})`);
      glowGrad.addColorStop(0.8, `rgba(80, 0, 0,    ${p.life * 0.25})`);
      glowGrad.addColorStop(1,   `rgba(0, 0, 0, 0)`);
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }

  ctx.restore();
}
