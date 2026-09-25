// ─────────────────────────────────────────────
// Eye of Cthulhu — Authentic Terraria Sprite Sheet Skin Renderer
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { FighterRenderer } from '../renderers/fighterRenderer.js';
import { drawMinionHealthBar } from '../statusEffects.js';
import { drawTerrariaEyeGore } from '../particles/deathShatterEffect.js';

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

export function getEyePhase1Image() {
  if (!_phase1Image && typeof Image !== 'undefined') {
    _phase1Image = new Image();
    _phase1Image.onload = () => { _p1Loaded = true; };
    _phase1Image.onerror = (e) => { console.warn('Failed to load Eye of Cthulhu Phase 1 at Assets/model/Eye of Cthulhu.png', e); };
    _phase1Image.src = encodeURI('Assets/model/Eye of Cthulhu.png?v=1');
  }
  return _phase1Image;
}

export function getEyePhase2Image() {
  if (!_phase2Image && typeof Image !== 'undefined') {
    _phase2Image = new Image();
    _phase2Image.onload = () => { _p2Loaded = true; };
    _phase2Image.onerror = (e) => { console.warn('Failed to load Eye of Cthulhu Phase 2 at Assets/model/eye of cthulhu phase 2.png', e); };
    _phase2Image.src = encodeURI('Assets/model/eye of cthulhu phase 2.png?v=1');
  }
  return _phase2Image;
}

const _getPhase1Image = getEyePhase1Image;
const _getPhase2Image = getEyePhase2Image;

// Pre-initialize cached image references on load
if (typeof window !== 'undefined') {
  getEyePhase1Image();
  getEyePhase2Image();
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

function _drawAfterImages(ctx, afterImages, r) {
  if (!afterImages || afterImages.length === 0) return;
  const p1Img = _getPhase1Image();
  const p2Img = _getPhase2Image();

  for (let i = 0; i < afterImages.length; i++) {
    const ai = afterImages[i];
    if (!ai || ai.timer <= 0) continue;
    const progress = ai.timer / (ai.maxTimer || 14);
    const alpha = progress * 0.36; // Soft ethereal ghost trail opacity
    const img = ai.isPhase2 ? p2Img : p1Img;
    const frames = ai.isPhase2 ? PHASE2_FRAMES : PHASE1_FRAMES;
    const fBox = frames[0] || { sx: 16, sy: 345, sw: 270, sh: 198 };
    const aiR = ai.r || r || 32;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ai.x, ai.y);
    ctx.rotate(ai.angle);

    const facingLeft = Math.abs(ai.angle) > Math.PI / 2;
    if (facingLeft) {
      ctx.scale(1, -1);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      const drawHeight = aiR * 2.2;
      const drawWidth = drawHeight * (fBox.sw / fBox.sh);
      const drawX = -drawWidth * 0.65;
      const drawY = -drawHeight * 0.50;

      ctx.drawImage(
        img,
        fBox.sx, fBox.sy, fBox.sw, fBox.sh,
        drawX, drawY, drawWidth, drawHeight
      );
    } else {
      _drawProceduralEye(ctx, aiR, ai.isPhase2);
    }

    ctx.restore();
  }
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
  const alpha = Math.min(0.85, progress * 0.8 + 0.30);

  // 1. Concentric pulsing blood shockwave rings
  ctx.strokeStyle = `rgba(225, 29, 72, ${alpha * 0.6})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Swirling spiral peeling ribbons (4 arcs in crimson & iris cyan)
  for (let i = 0; i < 4; i++) {
    const arcStart = spinAngle * 1.5 + (i * Math.PI * 0.5);
    ctx.strokeStyle = (i % 2 === 1) ? `rgba(6, 182, 212, ${alpha * 0.9})` : `rgba(225, 29, 72, ${alpha})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.85 + i * 0.20), arcStart, arcStart + Math.PI * 0.75);
    ctx.stroke();
  }

  // 3. Peeling flesh tendril sparks flung outward
  ctx.fillStyle = '#DC2626';
  for (let j = 0; j < 6; j++) {
    const fAngle = spinAngle * 2.0 + (j * Math.PI / 3);
    const fDist = r * (1.1 + (j % 3) * 0.25);
    ctx.beginPath();
    ctx.arc(Math.cos(fAngle) * fDist, Math.sin(fAngle) * fDist, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws dynamic shredding cracks, tearing fissures, and peeling flaps across the eye during transformation
 */
function _drawShreddingBodyOverlay(ctx, r, progress, isPhase2) {
  ctx.save();
  const p1Img = _getPhase1Image();
  const p2Img = _getPhase2Image();

  if (!isPhase2) {
    // Stage 1: Expanding tearing stress fractures across cornea/pupil before shed
    const crackAlpha = Math.min(1.0, progress * 2.2);
    ctx.globalAlpha = crackAlpha;

    // Jagged radiating tearing crack lines across the eye
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    // Crack 1: center to top right
    ctx.moveTo(r * 0.35, 0);
    ctx.lineTo(r * 0.55, -r * 0.25);
    ctx.lineTo(r * 0.45, -r * 0.50);
    ctx.lineTo(r * 0.75, -r * 0.70);
    // Crack 2: center to bottom right
    ctx.moveTo(r * 0.35, 0);
    ctx.lineTo(r * 0.60, r * 0.30);
    ctx.lineTo(r * 0.50, r * 0.60);
    ctx.lineTo(r * 0.80, r * 0.65);
    // Crack 3: center across sclera
    ctx.moveTo(r * 0.35, 0);
    ctx.lineTo(0, -r * 0.35);
    ctx.lineTo(-r * 0.45, -r * 0.20);
    ctx.stroke();

    // Dark ink under-fissures for depth
    ctx.strokeStyle = '#111114';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(r * 0.35, 0); ctx.lineTo(r * 0.55, -r * 0.25);
    ctx.moveTo(r * 0.35, 0); ctx.lineTo(r * 0.60, r * 0.30);
    ctx.stroke();

    // Pulsing red central rupture core
    const pulseSize = r * (0.25 + progress * 0.35);
    ctx.fillStyle = `rgba(225, 29, 72, ${0.40 + Math.sin(Date.now() / 40) * 0.25})`;
    ctx.beginPath();
    ctx.arc(r * 0.35, 0, pulseSize, 0, Math.PI * 2);
    ctx.fill();

    // Model PNG Textured Peeling Strips curling outward from the eye body
    if (p1Img && p1Img.complete && p1Img.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      const flapPatches = [
        { sx: 171, sy: 383, sw: 70, sh: 70 }, // Iris/Pupil patch
        { sx: 120, sy: 350, sw: 70, sh: 70 }, // Upper Sclera Veins
        { sx: 120, sy: 440, sw: 70, sh: 70 }, // Lower Sclera Veins
        { sx: 60,  sy: 380, sw: 60, sh: 60 }, // Optic Nerve Roots
      ];

      for (let f = 0; f < flapPatches.length; f++) {
        const flapAngle = (f * Math.PI / 2) + progress * 2.5;
        const fx = Math.cos(flapAngle) * (r * (0.65 + progress * 0.35));
        const fy = Math.sin(flapAngle) * (r * (0.65 + progress * 0.35));
        const flapScale = 0.55 + progress * 0.65;
        const flapSize = r * 0.55 * flapScale;

        // Fleshy red connecting ligament stringers from rupture core to peeling flap
        ctx.strokeStyle = '#991B1B';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(r * 0.35, 0);
        ctx.quadraticCurveTo(fx * 0.5, fy * 0.5 + Math.sin(progress * 10 + f) * 5, fx, fy);
        ctx.stroke();

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(flapAngle + progress * Math.PI * 0.9);
        const patch = flapPatches[f];
        ctx.drawImage(
          p1Img,
          patch.sx, patch.sy, patch.sw, patch.sh,
          -flapSize * 0.5, -flapSize * 0.5, flapSize, flapSize
        );
        ctx.strokeStyle = '#111114';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-flapSize * 0.5, -flapSize * 0.5, flapSize, flapSize);
        ctx.restore();
      }
    } else {
      // Procedural peeling flaps fallback
      ctx.fillStyle = '#991B1B';
      for (let f = 0; f < 4; f++) {
        const flapAngle = (f * Math.PI / 2) + progress * 2.0;
        const fx = Math.cos(flapAngle) * (r * 0.85);
        const fy = Math.sin(flapAngle) * (r * 0.85);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(flapAngle) * (r * 0.3), fy + Math.sin(flapAngle) * (r * 0.3));
        ctx.lineTo(fx - Math.sin(flapAngle) * (r * 0.15), fy + Math.cos(flapAngle) * (r * 0.15));
        ctx.closePath();
        ctx.fill();
      }
    }
  } else {
    // Stage 2: Torn, ragged socket rim and bleeding meat flaps around the exposed maw
    if (p2Img && p2Img.complete && p2Img.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      const mawPatches = [
        { sx: 120, sy: 350, sw: 60, sh: 60, angle: -0.4 },
        { sx: 120, sy: 440, sw: 60, sh: 60, angle: 0.4 },
        { sx: 160, sy: 350, sw: 60, sh: 60, angle: -0.8 },
        { sx: 160, sy: 440, sw: 60, sh: 60, angle: 0.8 },
      ];
      for (let m = 0; m < mawPatches.length; m++) {
        const mp = mawPatches[m];
        const mx = Math.cos(mp.angle) * (r * 0.85);
        const my = Math.sin(mp.angle) * (r * 0.85);
        const mSize = r * 0.40;
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(mp.angle + Math.PI / 2);
        ctx.drawImage(
          p2Img,
          mp.sx, mp.sy, mp.sw, mp.sh,
          -mSize * 0.5, -mSize * 0.5, mSize, mSize
        );
        ctx.strokeStyle = '#111114';
        ctx.lineWidth = 1.0;
        ctx.strokeRect(-mSize * 0.5, -mSize * 0.5, mSize, mSize);
        ctx.restore();
      }
    }

    ctx.strokeStyle = '#991B1B';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();

    // Bleeding crimson teeth rim glints
    ctx.fillStyle = '#DC2626';
    for (let i = -3; i <= 3; i++) {
      const angle = (i * 0.28);
      const bx = Math.cos(angle) * (r * 0.85);
      const by = Math.sin(angle) * (r * 0.85);
      ctx.beginPath();
      ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function _drawShedGoreParticles(ctx, particles) {
  if (!particles || particles.length === 0) return;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation || 0);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha !== undefined ? p.alpha : 1.0));
    if (p.isEyeOfCthulhuGore && typeof drawTerrariaEyeGore === 'function') {
      drawTerrariaEyeGore(ctx, p);
    } else {
      ctx.fillStyle = p.color || '#DC2626';
      const s = p.size || 6;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      // Inner glint highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-s / 4, -s / 4, s / 2, s / 2);
    }
    ctx.restore();
  }
}

/**
 * Main Eye of Cthulhu Skin Renderer
 * Renders the authentic animated 6-frame pixel art sprite sheet
 */
export function drawEyeOfCthulhuSkin(ctx, fighter) {
  if (!ctx || !fighter) return;

  // Render dash afterimages in world space behind the fighter
  if (fighter.afterImages && fighter.afterImages.length > 0) {
    _drawAfterImages(ctx, fighter.afterImages, fighter.r || 32);
  }

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

  const shudderX = isTransforming ? (Math.random() - 0.5) * ((fighter.transformationProgress || 0) * 8.0) : 0;
  const shudderY = isTransforming ? (Math.random() - 0.5) * ((fighter.transformationProgress || 0) * 8.0) : 0;

  ctx.save();
  ctx.translate(fighter.x + shudderX, fighter.y - (fighter.z || 0) + shudderY);

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

  // Draw tearing cracks and peeling overlays during transformation
  if (isTransforming) {
    _drawShreddingBodyOverlay(ctx, r, fighter.transformationProgress || 0, isPhase2);
  }

  // Status overlays & hit flash
  FighterRenderer.drawStatusOverlays(ctx, fighter);

  ctx.restore();
}

/**
 * Renders the Servant of Cthulhu minion entity using the miniature animated Phase 1 sprite sheet
 */
export function drawServantOfCthulhuMinion(ctx, minion) {
  if (!ctx || !minion) return;
  const r = minion.r || 10;
  const img = _getPhase1Image();
  const ticksPerFrame = 6;
  const currentFrameCount = (typeof state !== 'undefined' && state.frameCount !== undefined)
    ? state.frameCount
    : Math.floor(Date.now() / 16);

  const frameIndex = Math.floor(currentFrameCount / ticksPerFrame) % PHASE1_FRAMES.length;
  const fBox = PHASE1_FRAMES[frameIndex] || PHASE1_FRAMES[0];

  ctx.save();
  ctx.translate(minion.x, minion.y);

  const angle = minion.gunAngle !== undefined ? minion.gunAngle : (minion.angle !== undefined ? minion.angle : (Math.atan2(minion.vy || 0, minion.vx || 0)));
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

  // Hit flash white overlay
  if (minion.hitFlashTimer > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, minion.hitFlashTimer / 6)})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // Draw floating minion health bar in world space above servant head
  if (minion.hp > 0) {
    drawMinionHealthBar(
      ctx,
      minion.x,
      minion.y - r - 10,
      Math.max(26, r * 2.4),
      5,
      minion.hp,
      minion.maxHp || 120,
      minion.color || '#E11D48'
    );
  }
}

// Backwards compatibility alias
export const drawServantOfCthulhuProjectile = drawServantOfCthulhuMinion;
