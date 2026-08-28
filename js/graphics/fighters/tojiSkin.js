// ─────────────────────────────────────────────
// TOJI FUSHIGURO FIGHTER SKIN & BODY MODEL
// The Sorcerer Killer (Jujutsu Kaisen)
// Clean Minimalist Anime Aesthetic
// Adhering to Rule 19 (Upright Front POV),
// Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

// Pre-computed normalized anime bangs coordinates with clean stylized fringe strands
const _TOJI_BANGS = [
  { nx:  0.88, ny: -0.32 },
  { nx:  0.72, ny: -0.22 }, // Right outer fringe
  { nx:  0.58, ny: -0.30 },
  { nx:  0.44, ny: -0.20 }, // Right mid strand
  { nx:  0.32, ny: -0.32 },
  { nx:  0.18, ny: -0.10 }, // Signature Center-Right Long Spike
  { nx:  0.06, ny: -0.30 },
  { nx: -0.08, ny: -0.16 }, // Center-Left strand
  { nx: -0.22, ny: -0.28 },
  { nx: -0.36, ny: -0.18 }, // Left mid strand
  { nx: -0.50, ny: -0.30 },
  { nx: -0.66, ny: -0.18 }, // Left long side lock
  { nx: -0.78, ny: -0.26 },
  { nx: -0.88, ny: -0.32 }
];

/**
 * Draws Toji's hand/fist in clean pixel art style with warm athletic tan skin tone.
 */
function _drawTojiFist(ctx, x, y, radius, skinColor, fighter, isBack = false) {
  ctx.save();
  ctx.translate(x, y);
  drawPixelHand(ctx, 0, 0, radius, skinColor || '#D4A373');
  ctx.restore();
}

/**
 * Main Skin Renderer for Toji Fushiguro
 * Features:
 * - Pure solid jet-black anime hair with sharp spiky fringe bangs (NO white lines/stuff).
 * - Clean warm athletic tan skin face (NO ears, clean minimalist surface).
 * - Iconic subtle lip scar on the lower-right cheek/jaw (Rule 19 compliant: strictly NO eyes/mouth/nose).
 * - Clean solid black crewneck shirt texture fully spanning edge-to-edge (NO abs, pure clean fabric).
 * - Clean white Hakama pants texture fully spanning edge-to-edge with centered black ribbon bow and dangling sash tails.
 */
export function drawTojiSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // 1. Orientation & Mirroring (Rule 19 Upright POV)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  // Color Palette Definitions
  const skinTan       = '#E8BD9B';
  const shirtBlack    = '#15161B';
  const shirtCollar   = '#0C0D10';
  const hakamaWhite   = '#FFFFFF';
  const hakamaShadow  = '#D4DAE4';
  const sashBlack     = '#101115';
  const hairBlack     = '#0E0F14';

  // ── CLIPPED BODY CIRCLE MESH ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // A. BASE LAYER: Warm Tan Skin
  ctx.fillStyle = skinTan;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Subtle 3D skin shading
  if (!isLowQuality) {
    const skinGrad = ctx.createRadialGradient(-r * 0.20, -r * 0.15, r * 0.20, 0, 0, r * 1.05);
    skinGrad.addColorStop(0, 'rgba(255, 238, 225, 0.25)');
    skinGrad.addColorStop(0.70, 'rgba(198, 138, 101, 0.12)');
    skinGrad.addColorStop(1.0, 'rgba(140, 80, 50, 0.35)');
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // B. CLEAN SOLID BLACK CREWNECK SHIRT TEXTURE (+Y Mid Torso: y = +0.26*r to +0.66*r, fully spanning edge-to-edge)
  ctx.fillStyle = shirtBlack;
  ctx.fillRect(-r * 1.05, r * 0.26, r * 2.1, r * 0.40);

  // Clean Curved Crewneck Collar (Framing the throat/neck)
  ctx.fillStyle = shirtCollar;
  ctx.beginPath();
  ctx.moveTo(-r * 0.38, r * 0.26);
  ctx.quadraticCurveTo(0, r * 0.38, r * 0.38, r * 0.26);
  ctx.lineTo(r * 0.33, r * 0.23);
  ctx.quadraticCurveTo(0, r * 0.34, -r * 0.33, r * 0.23);
  ctx.closePath();
  ctx.fill();

  // Crewneck Collar Rim Stroke
  ctx.strokeStyle = '#08090C';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.38, r * 0.26);
  ctx.quadraticCurveTo(0, r * 0.38, r * 0.38, r * 0.26);
  ctx.stroke();

  // C. CLEAN WHITE HAKAMA PANTS TEXTURE (+Y Bottom: y = +0.66*r to +1.0*r, fully spanning edge-to-edge)
  ctx.fillStyle = hakamaWhite;
  ctx.fillRect(-r * 1.05, r * 0.66, r * 2.1, r * 0.40);

  // Hakama Vertical Pleat Shadows
  ctx.strokeStyle = hakamaShadow;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  // Center pleat
  ctx.moveTo(0, r * 0.76);
  ctx.lineTo(0, r);
  // Left pleats
  ctx.moveTo(-r * 0.38, r * 0.72);
  ctx.lineTo(-r * 0.42, r);
  ctx.moveTo(-r * 0.70, r * 0.72);
  ctx.lineTo(-r * 0.74, r);
  // Right pleats
  ctx.moveTo(r * 0.38, r * 0.72);
  ctx.lineTo(r * 0.42, r);
  ctx.moveTo(r * 0.70, r * 0.72);
  ctx.lineTo(r * 0.74, r);
  ctx.stroke();

  // Hakama Waistband Top Seam
  ctx.strokeStyle = '#0E0E12';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.66);
  ctx.lineTo(r, r * 0.66);
  ctx.stroke();

  // Black Cord Sash Band across waist (Edge-to-edge)
  ctx.fillStyle = sashBlack;
  ctx.fillRect(-r * 1.05, r * 0.66, r * 2.1, r * 0.07);

  // White Belt Loops
  ctx.fillStyle = hakamaWhite;
  ctx.strokeStyle = '#0E0E12';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-r * 0.42, r * 0.65, r * 0.08, r * 0.09);
  ctx.fillRect(-r * 0.42, r * 0.65, r * 0.08, r * 0.09);
  ctx.strokeRect(r * 0.34, r * 0.65, r * 0.08, r * 0.09);
  ctx.fillRect(r * 0.34, r * 0.65, r * 0.08, r * 0.09);

  // Centered Black Ribbon Bow Knot
  ctx.fillStyle = '#060709';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.72, r * 0.10, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left Ribbon Loop
  ctx.fillStyle = sashBlack;
  ctx.beginPath();
  ctx.ellipse(-r * 0.14, r * 0.71, r * 0.10, r * 0.05, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Right Ribbon Loop
  ctx.beginPath();
  ctx.ellipse(r * 0.14, r * 0.71, r * 0.10, r * 0.05, 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Two Dangling Ribbon Tails Trailing Down (Matching Reference Photo)
  ctx.strokeStyle = '#060709';
  ctx.lineWidth = 0.8;
  // Left Tail
  ctx.beginPath();
  ctx.moveTo(-r * 0.04, r * 0.73);
  ctx.lineTo(-r * 0.14, r * 0.94);
  ctx.lineTo(-r * 0.05, r * 0.96);
  ctx.lineTo(0, r * 0.74);
  ctx.closePath();
  ctx.fillStyle = sashBlack;
  ctx.fill();
  ctx.stroke();

  // Right Tail
  ctx.beginPath();
  ctx.moveTo(0, r * 0.74);
  ctx.lineTo(r * 0.05, r * 0.96);
  ctx.lineTo(r * 0.14, r * 0.94);
  ctx.lineTo(r * 0.04, r * 0.73);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // D. SIGNATURE CORNER LIP SCAR (Positioned neatly on lower-right face above shirt collar)
  ctx.save();
  ctx.strokeStyle = '#7D3224';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.20, r * 0.12);
  ctx.lineTo(r * 0.36, r * 0.21);
  ctx.stroke();

  // Deep cut inner crease
  ctx.strokeStyle = '#4A160E';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(r * 0.21, r * 0.125);
  ctx.lineTo(r * 0.35, r * 0.205);
  ctx.stroke();

  // Subtle upper highlight
  ctx.strokeStyle = 'rgba(255, 220, 205, 0.55)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(r * 0.20, r * 0.10);
  ctx.lineTo(r * 0.34, r * 0.19);
  ctx.stroke();
  ctx.restore();

  // E. SIGNATURE JET-BLACK ANIME HAIR (-Y Top Hemisphere - Pure solid black, NO white lines)
  // Hair Base Mesh
  ctx.fillStyle = hairBlack;
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 0.32);

  // Trace the stylized layered bangs
  for (let i = 0; i < _TOJI_BANGS.length; i++) {
    const pt = _TOJI_BANGS[i];
    ctx.lineTo(r * pt.nx, r * pt.ny);
  }
  ctx.lineTo(-r * 1.05, -r * 0.32);
  ctx.closePath();
  ctx.fill();

  // Spiky Outer Crown Tufts (Subtle spikes breaking the top circle silhouette naturally)
  ctx.beginPath();
  // Top-left spike
  ctx.moveTo(-r * 0.65, -r * 0.75);
  ctx.lineTo(-r * 0.82, -r * 0.95);
  ctx.lineTo(-r * 0.45, -r * 0.88);
  // Top-center spike
  ctx.moveTo(-r * 0.25, -r * 0.90);
  ctx.lineTo(0, -r * 1.05);
  ctx.lineTo(r * 0.20, -r * 0.92);
  // Top-right spike
  ctx.moveTo(r * 0.45, -r * 0.85);
  ctx.lineTo(r * 0.80, -r * 0.96);
  ctx.lineTo(r * 0.68, -r * 0.70);
  ctx.fill();

  // Crisp Manga Hairline Ink Outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * _TOJI_BANGS[0].nx, r * _TOJI_BANGS[0].ny);
  for (let i = 1; i < _TOJI_BANGS.length; i++) {
    const pt = _TOJI_BANGS[i];
    ctx.lineTo(r * pt.nx, r * pt.ny);
  }
  ctx.stroke();

  ctx.restore(); // End clipped body circle

  // ── BOLD BLACK BODY OUTLINE ──
  ctx.strokeStyle = '#0A0B0E';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Status Overlays (Stun, Freeze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore(); // End main transform
}

/**
 * Renders Toji's Ghost Model Afterimage with full skin details, translucent ethereal energy, and spiky anime silhouette.
 */
export function drawTojiGhostSkin(ctx, x, y, angle = 0, r = 25, alpha = 0.5, isDomain = false) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const facingLeft = Math.abs(normAngle) > Math.PI / 2;
  ctx.rotate(angle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 1. Spectral Cursed Energy Outer Glow Aura
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.30, 0, Math.PI * 2);
  ctx.fillStyle = isDomain ? 'rgba(160, 48, 255, 0.35)' : 'rgba(255, 30, 86, 0.28)';
  ctx.fill();

  // 2. Clipped Body Circle with Toji's actual skin model
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // A. Tan Athletic Skin
  ctx.fillStyle = '#E8BD9B';
  ctx.fillRect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1);

  // B. Black Shirt Texture
  ctx.fillStyle = '#15161B';
  ctx.fillRect(-r * 1.05, r * 0.26, r * 2.1, r * 0.40);

  // Shirt Collar
  ctx.strokeStyle = '#0C0D10';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, r * 0.16, r * 0.38, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // C. White Hakama Pants Texture
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-r * 1.05, r * 0.66, r * 2.1, r * 0.40);

  // Black Sash Band
  ctx.fillStyle = '#101115';
  ctx.fillRect(-r * 1.05, r * 0.66, r * 2.1, r * 0.07);

  // Ribbon knot
  ctx.fillStyle = '#060709';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.72, r * 0.10, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // D. Lip Scar
  ctx.strokeStyle = '#7D3224';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(r * 0.20, r * 0.12);
  ctx.lineTo(r * 0.36, r * 0.21);
  ctx.stroke();

  // E. Solid Jet-Black Anime Hair
  ctx.fillStyle = '#0E0F14';
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 0.32);
  for (let i = 0; i < _TOJI_BANGS.length; i++) {
    const pt = _TOJI_BANGS[i];
    ctx.lineTo(r * pt.nx, r * pt.ny);
  }
  ctx.lineTo(-r * 1.05, -r * 0.32);
  ctx.closePath();
  ctx.fill();

  // Spiky Outer Crown Tufts
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.75);
  ctx.lineTo(-r * 0.82, -r * 0.95);
  ctx.lineTo(-r * 0.45, -r * 0.88);
  ctx.moveTo(-r * 0.25, -r * 0.90);
  ctx.lineTo(0, -r * 1.05);
  ctx.lineTo(r * 0.20, -r * 0.92);
  ctx.moveTo(r * 0.45, -r * 0.85);
  ctx.lineTo(r * 0.80, -r * 0.96);
  ctx.lineTo(r * 0.68, -r * 0.70);
  ctx.fill();

  // Crisp Manga Hairline Ink Outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(r * _TOJI_BANGS[0].nx, r * _TOJI_BANGS[0].ny);
  for (let i = 1; i < _TOJI_BANGS.length; i++) {
    const pt = _TOJI_BANGS[i];
    ctx.lineTo(r * pt.nx, r * pt.ny);
  }
  ctx.stroke();

  ctx.restore(); // End clipped body circle

  // 3. Spectral Body Outline
  ctx.strokeStyle = isDomain ? 'rgba(180, 100, 255, 0.90)' : 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
