// ─────────────────────────────────────────────
// Eye of Cthulhu — Authentic Terraria Sprite Sheet Skin Renderer
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { FighterRenderer } from '../renderers/fighterRenderer.js';

let _phase1Image = null;
let _phase2Image = null;
let _p1Loaded = false;
let _p2Loaded = false;

// 6-Frame horizontal bounding boxes derived from asset analysis
const PHASE1_FRAMES = [
  { sx: 16,   sy: 345, sw: 270, sh: 198 },
  { sx: 316,  sy: 345, sw: 259, sh: 198 },
  { sx: 609,  sy: 345, sw: 261, sh: 198 },
  { sx: 904,  sy: 345, sw: 262, sh: 198 },
  { sx: 1198, sy: 345, sw: 259, sh: 198 },
  { sx: 1489, sy: 345, sw: 269, sh: 198 },
];

const PHASE2_FRAMES = [
  { sx: 22,   sy: 348, sw: 252, sh: 197 },
  { sx: 310,  sy: 348, sw: 258, sh: 197 },
  { sx: 620,  sy: 348, sw: 260, sh: 197 },
  { sx: 913,  sy: 348, sw: 262, sh: 197 },
  { sx: 1196, sy: 348, sw: 265, sh: 197 },
  { sx: 1494, sy: 348, sw: 256, sh: 197 },
];

function _getPhase1Image() {
  if (!_phase1Image && typeof Image !== 'undefined') {
    _phase1Image = new Image();
    _phase1Image.onload = () => { _p1Loaded = true; };
    _phase1Image.onerror = (e) => { console.warn('Failed to load Eye of Cthulhu Phase 1 at Assets/model/Eye of Cthulhu.png', e); };
    _phase1Image.src = encodeURI('Assets/model/Eye of Cthulhu.png?v=1');
  }
  return _phase1Image;
}

function _getPhase2Image() {
  if (!_phase2Image && typeof Image !== 'undefined') {
    _phase2Image = new Image();
    _phase2Image.onload = () => { _p2Loaded = true; };
    _phase2Image.onerror = (e) => { console.warn('Failed to load Eye of Cthulhu Phase 2 at Assets/model/eye of cthulhu phase 2.png', e); };
    _phase2Image.src = encodeURI('Assets/model/eye of cthulhu phase 2.png?v=1');
  }
  return _phase2Image;
}

// Pre-initialize cached image references on load
if (typeof window !== 'undefined') {
  _getPhase1Image();
  _getPhase2Image();
}

/**
 * Procedural fallback renderer if sprite sheet is loading or missing
 */
function _drawProceduralEye(ctx, r, isPhase2) {
  // Eyeball body
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FAFAFA';
  ctx.fill();

  // Veins
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.4);
  ctx.lineTo(-r * 0.1, -r * 0.1);
  ctx.lineTo(r * 0.3, -r * 0.3);
  ctx.moveTo(-r * 0.4, r * 0.3);
  ctx.lineTo(-r * 0.0, r * 0.1);
  ctx.stroke();

  if (isPhase2) {
    // Open ravenous fanged maw
    ctx.beginPath();
    ctx.arc(r * 0.15, 0, r * 0.65, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.fillStyle = '#1A0507';
    ctx.fill();

    // Teeth
    ctx.fillStyle = '#FFFFFF';
    for (let i = -2; i <= 2; i++) {
      const ty = i * (r * 0.22);
      ctx.beginPath();
      ctx.moveTo(r * 0.1, ty - 4);
      ctx.lineTo(r * 0.55, ty);
      ctx.lineTo(r * 0.1, ty + 4);
      ctx.fill();
    }
  } else {
    // Iris & Pupil
    ctx.beginPath();
    ctx.arc(r * 0.35, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#06B6D4';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(r * 0.45, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
  }
  ctx.restore();
}

function _drawDashSpeedLines(ctx, r) {
  ctx.save();
  const colors = ['#E11D48', '#FF4D6D', '#FFFFFF', '#881337'];
  for (let i = 0; i < 5; i++) {
    const yOff = (i - 2) * (r * 0.35) + ((i * 17) % 7) - 3;
    const startX = -r * 1.6 - ((i * 23) % 25);
    const endX = startX - (r * 1.8 + ((i * 31) % 30));
    const thick = 1.2 + (i % 2) * 0.8;
    const midX = (startX + endX) / 2;

    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(startX, yOff);
    ctx.lineTo(midX, yOff - thick);
    ctx.lineTo(endX, yOff);
    ctx.lineTo(midX, yOff + thick);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function _drawWindupTelegraph(ctx, r) {
  ctx.save();
  const pulse = Math.sin(Date.now() / 60) * 0.5 + 0.5;
  ctx.strokeStyle = `rgba(225, 29, 72, ${0.4 + pulse * 0.5})`;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, r * (1.1 + pulse * 0.15), 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(225, 29, 72, ${0.6 + pulse * 0.4})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(r * 0.8, 0);
  ctx.lineTo(r * 0.8 + 220, 0);
  ctx.stroke();
  ctx.restore();
}

function _drawTransformationVortex(ctx, r, spinAngle, progress) {
  ctx.save();
  const alpha = Math.min(0.65, progress * 0.7 + 0.25);
  ctx.strokeStyle = `rgba(225, 29, 72, ${alpha})`;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
  ctx.stroke();

  // 3 Swirling concentric arcs around the eye
  for (let i = 0; i < 3; i++) {
    const arcStart = spinAngle + (i * Math.PI * 2 / 3);
    ctx.strokeStyle = (i === 1) ? `rgba(6, 182, 212, ${alpha * 0.85})` : `rgba(255, 77, 109, ${alpha})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.95 + i * 0.22), arcStart, arcStart + Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

function _drawShedGoreParticles(ctx, particles) {
  if (!particles || particles.length === 0) return;
  ctx.save();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation || 0);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha !== undefined ? p.alpha : 1.0));
    ctx.fillStyle = p.color || '#DC2626';
    const s = p.size || 6;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    // Inner glint highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-s / 4, -s / 4, s / 2, s / 2);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Main Eye of Cthulhu Skin Renderer
 * Renders the authentic animated 6-frame pixel art sprite sheet
 */
export function drawEyeOfCthulhuSkin(ctx, fighter) {
  if (!ctx || !fighter) return;

  // Render flying shed gore particles in world space
  if (fighter.shedGoreParticles && fighter.shedGoreParticles.length > 0) {
    _drawShedGoreParticles(ctx, fighter.shedGoreParticles);
  }

  const r = fighter.r || 32;
  const isTransforming = Boolean(fighter.isTransforming || fighter.aiState === 'TRANSFORMATION');
  
  let isPhase2 = false;
  if (isTransforming) {
    isPhase2 = Boolean(fighter.hasShedPupil || (fighter.transformationProgress !== undefined && fighter.transformationProgress >= 0.48));
  } else {
    isPhase2 = Boolean(
      (fighter.bossState && fighter.bossState.phase === 2) ||
      fighter.isPhase2 ||
      fighter._isPhase2 ||
      (fighter.hp > 0 && fighter.maxHp > 0 && (fighter.hp / fighter.maxHp) <= 0.50)
    );
  }

  const img = isPhase2 ? _getPhase2Image() : _getPhase1Image();
  const frames = isPhase2 ? PHASE2_FRAMES : PHASE1_FRAMES;
  const ticksPerFrame = isTransforming ? 3 : (isPhase2 ? 4 : 8);

  const currentFrameCount = (typeof state !== 'undefined' && state.frameCount !== undefined)
    ? state.frameCount
    : Math.floor(Date.now() / 16);

  const frameIndex = Math.floor(currentFrameCount / ticksPerFrame) % frames.length;
  const fBox = frames[frameIndex] || frames[0];

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  if (isTransforming) {
    // Rapid 360° axial rotation during transformation
    const spinAngle = fighter.transformationSpinAngle || 0;
    ctx.rotate(spinAngle);
    _drawTransformationVortex(ctx, r, spinAngle, fighter.transformationProgress || 0);
  } else {
    const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);
    ctx.rotate(angle);

    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft) {
      ctx.scale(1, -1);
    }
  }

  // Draw Windup Telegraph Indicator
  if (fighter.isWindupTelegraph) {
    _drawWindupTelegraph(ctx, r);
  }

  // Draw 4-point Needle Dash Speed Lines behind tendrils
  if (fighter.isRamming) {
    _drawDashSpeedLines(ctx, r);
  }

  // Draw sprite image or fallback
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Sizing: Eyeball sphere radius matches r, with trailing tendrils extending to -X
    const drawHeight = r * 2.2;
    const drawWidth = drawHeight * (fBox.sw / fBox.sh);
    const drawX = -drawWidth * 0.65; // Eyeball center aligned with (0,0)
    const drawY = -drawHeight * 0.50;

    ctx.drawImage(
      img,
      fBox.sx, fBox.sy, fBox.sw, fBox.sh,
      drawX, drawY, drawWidth, drawHeight
    );
    ctx.restore();
  } else {
    _drawProceduralEye(ctx, r, isPhase2);
  }

  // Status overlays & hit flash
  FighterRenderer.drawStatusOverlays(ctx, fighter);

  ctx.restore();
}

/**
 * Renders the Servant of Cthulhu minion projectile using the miniature animated Phase 1 sprite sheet
 */
export function drawServantOfCthulhuProjectile(ctx, p) {
  if (!ctx || !p) return;
  const r = p.r || 10;
  const img = _getPhase1Image();
  const ticksPerFrame = 6;
  const currentFrameCount = (typeof state !== 'undefined' && state.frameCount !== undefined)
    ? state.frameCount
    : Math.floor(Date.now() / 16);

  const frameIndex = Math.floor(currentFrameCount / ticksPerFrame) % PHASE1_FRAMES.length;
  const fBox = PHASE1_FRAMES[frameIndex] || PHASE1_FRAMES[0];

  ctx.save();
  ctx.translate(p.x, p.y);

  const angle = Math.atan2(p.vy || 0, p.vx || 0);
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Draw miniature sprite image or fallback
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Scale to miniature servant size (~10-12px radius)
    const drawHeight = r * 2.2;
    const drawWidth = drawHeight * (fBox.sw / fBox.sh);
    const drawX = -drawWidth * 0.65;
    const drawY = -drawHeight * 0.50;

    ctx.drawImage(
      img,
      fBox.sx, fBox.sy, fBox.sw, fBox.sh,
      drawX, drawY, drawWidth, drawHeight
    );
    ctx.restore();
  } else {
    _drawProceduralEye(ctx, r, false);
  }

  ctx.restore();
}
