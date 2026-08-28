// ─────────────────────────────────────────────
// YUTA OKKOTSU FIGHTER SKIN & BODY MODEL
// Special Grade Jujutsu Sorcerer (Jujutsu Kaisen)
// Supports High-Definition Pixel-Art Model from:
// Assets/model/Yuta-SKIN.png
// With procedural canvas fallback matching the model sheet:
// 1. Signature Jet-Black Swept Bangs & Curved Side Locks
// 2. Fair Ivory-Peach Skin Tone with Subtle Weary Eye Shadow Nuance
// 3. High Standing Wrap Collar with Upper Gold Swirl Button #1
// 4. Stepped Asymmetrical Chest Lapel Line with Gold Swirl Button #2
// 5. Vertical Side Seam Line Dropping Straight Down the White Jacket
// 6. Cinched White Jacket Bottom Hem & Dark Charcoal Uniform Trousers
// 7. Iconic White Hanging Ribbon / Drawstring Bow at Front Waistband
// 8. Dark Charcoal Sword Case Shoulder Strap & Silver Engagement Ring
// Rule 19 (Upright Front POV), Rule 20 (Hand Visibility), and Rule 11 Compliant
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { FighterRenderer, drawPixelHand } from '../renderers/fighterRenderer.js';

let _yutaSkinImage = null;
let _yutaSkinImageLoading = false;

export function _getYutaSkinImage() {
  if (_yutaSkinImage && _yutaSkinImage.complete && _yutaSkinImage.naturalWidth > 0) {
    return _yutaSkinImage;
  }
  if (!_yutaSkinImageLoading && typeof Image !== 'undefined') {
    _yutaSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _yutaSkinImage = img;
      _yutaSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Yuta pixel skin image at Assets/model/Yuta-PIXEL-SKIN.png', e);
      _yutaSkinImageLoading = false;
    };
    img.src = 'Assets/model/Yuta-PIXEL-SKIN.png?v=1';
    _yutaSkinImage = img;
  }
  return _yutaSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getYutaSkinImage();
}

/**
 * Draws Yuta's iconic golden Jujutsu High swirl buttons
 */
function drawGoldSwirlButton(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);

  // Outer gold button circle
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#D4AF37'; // Rich antique gold
  ctx.fill();
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Subtle metallic highlight crescent
  ctx.beginPath();
  ctx.arc(-radius * 0.25, -radius * 0.25, radius * 0.50, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 248, 190, 0.65)';
  ctx.fill();

  // Inner black swirl / emblem
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 1.5);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Yuta's hand with white uniform sleeve cuff, skin tone, and signature silver engagement ring.
 * Fully compliant with Rule 20 (Hand Visibility & Skin Only).
 */
export function drawYutaFist(ctx, x, y, radius, skinColor = '#FABC95', fighter = null, isLeft = false) {
  ctx.save();
  ctx.translate(x, y);

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Special Grade White Uniform Sleeve Cuff (Pixel Art Stepped Rect)
  const cuffX = -radius * 1.1;
  const cuffY = -radius * 0.72;
  const cuffW = radius * 1.0;
  const cuffH = radius * 1.44;

  // Stepped Dark Ink Outline for Sleeve
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(cuffX - P), snap(cuffY - P), snap(cuffW + P * 2), snap(cuffH + P * 2));
  // White Fabric Fill
  ctx.fillStyle = '#FAFAFC';
  ctx.fillRect(snap(cuffX), snap(cuffY), snap(cuffW), snap(cuffH));
  // Sleeve Fold Crease Pixel
  ctx.fillStyle = '#D0D8E2';
  ctx.fillRect(snap(cuffX + cuffW * 0.5), snap(cuffY + P), P, snap(cuffH - P * 2));

  // 2. Skin Knuckle / Fist in Pixel Art Style
  drawPixelHand(ctx, 0, 0, radius, skinColor);

  // 3. Signature Silver Engagement Ring (on left hand) in Pixel Art
  if (isLeft) {
    const rx = snap(radius * 0.25);
    const ry = snap(-radius * 0.15);
    ctx.fillStyle = '#0E0F14';
    ctx.fillRect(rx - P, ry - P, P * 3, P * 3);
    ctx.fillStyle = '#E8ECEF';
    ctx.fillRect(rx, ry, P * 2, P * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(rx, ry, P, P); // Ring shine glint
  }

  // 4. Subtle Cursed Energy (Pink/Magenta Bloom) around hands when active
  if (fighter && (fighter.combatAuraOpacity > 0.1 || fighter.isChannelingDomain || (fighter.flurrySlashTimer || 0) > 0)) {
    const auraAlpha = Math.min(1.0, (fighter.combatAuraOpacity || 0.6) * 0.8);
    ctx.strokeStyle = `rgba(255, 20, 147, ${auraAlpha})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.25, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Main entry point — Draws Yuta Okkotsu's stylized anime character body circle.
 */
export function drawYutaSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  ctx.save();
  ctx.translate(fighter.x || 0, (fighter.y || 0) - (fighter.z || 0));

  // Facing orientation & Rule 19 local space transform
  const angle = isPodiumPreview ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);

  // Vertical flip when aiming left so hair stays at -Y (Top) and uniform stays at +Y (Bottom)
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // ── 1. CLIPPED BODY CIRCLE ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  const yutaImg = _getYutaSkinImage();
  if (yutaImg && yutaImg.complete && yutaImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for authentic pixel art
    const modelScale = 1.04;
    const drawR = r * modelScale;
    ctx.drawImage(yutaImg, -drawR, -drawR, drawR * 2, drawR * 2);
    ctx.restore();
  } else {
    // Base Skin Fill — Warm Peach (#FABC95) matching Yuta face model
    ctx.fillStyle = '#FABC95';
    ctx.fillRect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1);

    // Subtle warm skin cheek/side contour shading
    const cheekGrad = ctx.createRadialGradient(0, -r * 0.1, r * 0.3, 0, 0, r);
    cheekGrad.addColorStop(0, 'rgba(255, 245, 240, 0.25)');
    cheekGrad.addColorStop(0.7, 'rgba(238, 208, 190, 0.25)');
    cheekGrad.addColorStop(1, 'rgba(215, 175, 155, 0.45)');
    ctx.fillStyle = cheekGrad;
    ctx.fillRect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1);

    // Signature Weary Under-Brow Eye Shadow (Tired dark circles nuance - Rule 19 compliant, NO eyes/pupils)
    ctx.fillStyle = 'rgba(175, 135, 120, 0.22)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.30, -r * 0.04, r * 0.22, r * 0.07, 0.08, 0, Math.PI * 2);
    ctx.ellipse( r * 0.30, -r * 0.04, r * 0.22, r * 0.07, -0.08, 0, Math.PI * 2);
    ctx.fill();

    // ── 2. SPECIAL GRADE WHITE JUJUTSU HIGH UNIFORM JACKET ──

    // A. Main White Uniform Jacket Body (+Y)
    ctx.fillStyle = '#FAFAFC';
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, r * 0.08);
    ctx.lineTo( r * 1.05, r * 0.08);
    ctx.lineTo( r * 1.05, r * 0.72);
    ctx.lineTo(-r * 1.05, r * 0.72);
    ctx.closePath();
    ctx.fill();

    // Soft Silver-Slate Fabric Crease & Fold Shading (Anime Reference Shading)
    ctx.fillStyle = 'rgba(205, 214, 226, 0.38)';
    // Left side fold shadow
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, r * 0.18);
    ctx.lineTo(-r * 0.45, r * 0.28);
    ctx.lineTo(-r * 0.55, r * 0.68);
    ctx.lineTo(-r * 1.05, r * 0.72);
    ctx.closePath();
    ctx.fill();

    // Right side fold shadow
    ctx.beginPath();
    ctx.moveTo( r * 1.05, r * 0.18);
    ctx.lineTo( r * 0.55, r * 0.28);
    ctx.lineTo( r * 0.65, r * 0.68);
    ctx.lineTo( r * 1.05, r * 0.72);
    ctx.closePath();
    ctx.fill();

    // B. High Standing Wrap Collar
    // Neck Throat Shadow (Inside the top collar cavity)
    ctx.fillStyle = '#DFB79E';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.04, r * 0.22, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // Standing White Collar Structure (Curving naturally around the neck)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.30, r * 0.02);
    ctx.quadraticCurveTo(0, r * 0.06, r * 0.28, r * 0.02); // Top rim of collar
    ctx.lineTo(r * 0.26, r * 0.20);
    ctx.quadraticCurveTo(0, r * 0.24, -r * 0.28, r * 0.20); // Bottom rim of collar
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Collar Flap Overlap Line (Vertical seam on the right side of collar)
    ctx.beginPath();
    ctx.moveTo(r * 0.12, r * 0.03);
    ctx.lineTo(r * 0.14, r * 0.20);
    ctx.stroke();

    // Upper Gold Button #1 on the High Collar (Character's left / Viewer's right)
    const buttonRadius = Math.max(1.8, r * 0.055);
    drawGoldSwirlButton(ctx, r * 0.20, r * 0.11, buttonRadius);

    // C. Stepped Asymmetrical Chest Lapel Line & Outer Gold Button #2
    // Soft shadow along the overlapping flap
    ctx.fillStyle = 'rgba(195, 206, 220, 0.45)';
    ctx.beginPath();
    ctx.moveTo( r * 0.14, r * 0.20);
    ctx.lineTo( r * 0.48, r * 0.22);
    ctx.lineTo( r * 0.42, r * 0.72);
    ctx.lineTo( r * 0.36, r * 0.72);
    ctx.lineTo( r * 0.42, r * 0.26);
    ctx.lineTo( r * 0.14, r * 0.24);
    ctx.closePath();
    ctx.fill();

    // Single Crisp Seam Line: Horizontal along upper chest, then dropping straight down
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.14, r * 0.20);
    ctx.lineTo(r * 0.48, r * 0.22); // Horizontal flap top edge
    ctx.lineTo(r * 0.42, r * 0.72); // Vertical seam line down to bottom hem
    ctx.stroke();

    // Outer Gold Button #2 on the Chest Flap Corner
    drawGoldSwirlButton(ctx, r * 0.46, r * 0.22, buttonRadius);

    // D. White Jacket Cinched Bottom Hem Band
    ctx.fillStyle = '#F2F4F7';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.rect(-r * 1.05, r * 0.66, r * 2.1, r * 0.06);
    ctx.fill();
    ctx.stroke();

    // ── 3. DARK CHARCOAL TROUSERS & HANGING WHITE DRAWSTRING RIBBON ──
    // Dark uniform pants at bottom rim
    ctx.fillStyle = '#23242B';
    ctx.fillRect(-r * 1.05, r * 0.72, r * 2.1, r * 0.38);

    // Pants Center Vertical Inseam
    ctx.strokeStyle = '#14151A';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.72);
    ctx.lineTo(0, r * 1.05);
    ctx.stroke();

    // Iconic White Hanging Ribbon / Drawstring Bow (Anime Reference Center Waistband)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.1;

    // Dual hanging ribbon loops / tails
    ctx.beginPath();
    // Left ribbon tail
    ctx.moveTo(-r * 0.06, r * 0.70);
    ctx.lineTo(-r * 0.08, r * 0.95);
    ctx.lineTo(-r * 0.02, r * 0.92);
    ctx.lineTo(-r * 0.01, r * 0.70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    // Right ribbon tail
    ctx.moveTo( r * 0.01, r * 0.70);
    ctx.lineTo( r * 0.02, r * 0.92);
    ctx.lineTo( r * 0.08, r * 0.95);
    ctx.lineTo( r * 0.06, r * 0.70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center knot of the ribbon
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, r * 0.71, Math.max(1.4, r * 0.04), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ── 4. DARK CHARCOAL SWORD CASE SHOULDER STRAP ──
    // Dark charcoal fabric strap passing smoothly over right shoulder (Viewer's left)
    ctx.strokeStyle = '#23242B';
    ctx.lineWidth = Math.max(2.2, r * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.65, -r * 0.22);
    ctx.quadraticCurveTo(-r * 0.58, r * 0.15, -r * 0.52, r * 0.66);
    ctx.stroke();

    // Strap subtle edge highlight
    ctx.strokeStyle = '#383B46';
    ctx.lineWidth = Math.max(0.7, r * 0.025);
    ctx.beginPath();
    ctx.moveTo(-r * 0.63, -r * 0.22);
    ctx.quadraticCurveTo(-r * 0.56, r * 0.15, -r * 0.50, r * 0.64);
    ctx.stroke();

    // ── 5. YUTA'S SIGNATURE JET-BLACK SWEPT HAIR (SMOOTH ANIME BANGS) ──
    // Base Black Hair Mass (-Y Top Region)
    ctx.fillStyle = '#121318';
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, -r * 1.05);
    ctx.lineTo( r * 1.05, -r * 1.05);
    ctx.lineTo( r * 1.05, -r * 0.30);

    // Smooth, organic anime bangs sweeping from left to right:
    ctx.quadraticCurveTo(r * 0.92, -r * 0.15, r * 0.82, -r * 0.18);
    ctx.quadraticCurveTo(r * 0.70, -r * 0.26, r * 0.55, -r * 0.12);
    ctx.quadraticCurveTo(r * 0.38, -r * 0.22, r * 0.18, -r * 0.05);
    ctx.quadraticCurveTo(r * 0.08, -r * 0.24, -r * 0.04, -r * 0.26);
    ctx.quadraticCurveTo(-r * 0.10, -r * 0.18, -r * 0.22, -r * 0.08);
    ctx.quadraticCurveTo(-r * 0.38, -r * 0.24, -r * 0.55, -r * 0.14);
    ctx.quadraticCurveTo(-r * 0.72, -r * 0.28, -r * 0.82, -r * 0.18);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.14, -r * 1.05, -r * 0.30);

    ctx.closePath();
    ctx.fill();

    // Deep Slate/Violet-Tinted Hair Sheen / Highlight Polygon (Volumetric Top-Light)
    ctx.fillStyle = '#262734';
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.90);
    ctx.quadraticCurveTo(0, -r * 0.65, r * 0.75, -r * 0.90);
    ctx.quadraticCurveTo(r * 0.45, -r * 0.52, 0, -r * 0.48);
    ctx.quadraticCurveTo(-r * 0.45, -r * 0.52, -r * 0.75, -r * 0.90);
    ctx.closePath();
    ctx.fill();

    // Subtle Specular Hair Streak
    ctx.strokeStyle = 'rgba(80, 82, 105, 0.70)';
    ctx.lineWidth = Math.max(1.1, r * 0.04);
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.70);
    ctx.quadraticCurveTo(-r * 0.10, -r * 0.56, r * 0.45, -r * 0.68);
    ctx.stroke();

    // Crisp Manga Hairline Outlines (Bottom edge of bangs)
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1.6, r * 0.055);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, -r * 0.30);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.14, -r * 0.82, -r * 0.18);
    ctx.quadraticCurveTo(-r * 0.72, -r * 0.28, -r * 0.55, -r * 0.14);
    ctx.quadraticCurveTo(-r * 0.38, -r * 0.24, -r * 0.22, -r * 0.08);
    ctx.quadraticCurveTo(-r * 0.10, -r * 0.18, -r * 0.04, -r * 0.26);
    ctx.quadraticCurveTo(r * 0.08, -r * 0.24, r * 0.18, -r * 0.05);
    ctx.quadraticCurveTo(r * 0.38, -r * 0.22, r * 0.55, -r * 0.12);
    ctx.quadraticCurveTo(r * 0.70, -r * 0.26, r * 0.82, -r * 0.18);
    ctx.quadraticCurveTo(r * 0.92, -r * 0.15, r * 1.05, -r * 0.30);
    ctx.stroke();
  }

  ctx.restore(); // Undo Body Circle Clip

  // ── 6. OUTER BODY BORDER OUTLINE ──
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 3.2;
  ctx.stroke();

  // ── 7. STATUS OVERLAYS (Freeze, Paralyze, Stun, RCT) ──
  FighterRenderer.drawStatusOverlays(ctx, fighter);

  ctx.restore();
}

/**
 * Draws Yuta's spectral ghost afterimage model during dashes, flurry combos, and teleports.
 */
export function drawYutaGhostSkin(ctx, x, y, angle = 0, r = 25, alpha = 0.5) {
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

  // 1. Spectral Cursed Energy Outer Glow (Pink/Magenta)
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 20, 147, 0.25)';
  ctx.fill();

  // 2. Clipped Body
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  const yutaImg = _getYutaSkinImage();
  if (yutaImg && yutaImg.complete && yutaImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const modelScale = 1.04;
    const drawR = r * modelScale;
    ctx.drawImage(yutaImg, -drawR, -drawR, drawR * 2, drawR * 2);
    ctx.restore();
  } else {
    // Skin
    ctx.fillStyle = '#FABC95';
    ctx.fillRect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1);

    // White Uniform Jacket
    ctx.fillStyle = '#FAFAFC';
    ctx.fillRect(-r * 1.05, r * 0.08, r * 2.1, r * 0.64);

    // Dark Pants
    ctx.fillStyle = '#23242B';
    ctx.fillRect(-r * 1.05, r * 0.72, r * 2.1, r * 0.38);

    // Black Hair Mass
    ctx.fillStyle = '#121318';
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, -r * 1.05);
    ctx.lineTo( r * 1.05, -r * 1.05);
    ctx.lineTo( r * 1.05, -r * 0.30);
    ctx.quadraticCurveTo(r * 0.92, -r * 0.15, r * 0.82, -r * 0.18);
    ctx.quadraticCurveTo(r * 0.70, -r * 0.26, r * 0.55, -r * 0.12);
    ctx.quadraticCurveTo(r * 0.38, -r * 0.22, r * 0.18, -r * 0.05);
    ctx.quadraticCurveTo(r * 0.08, -r * 0.24, -r * 0.04, -r * 0.26);
    ctx.quadraticCurveTo(-r * 0.10, -r * 0.18, -r * 0.22, -r * 0.08);
    ctx.quadraticCurveTo(-r * 0.38, -r * 0.24, -r * 0.55, -r * 0.14);
    ctx.quadraticCurveTo(-r * 0.72, -r * 0.28, -r * 0.82, -r * 0.18);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.14, -r * 1.05, -r * 0.30);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore(); // Undo clip

  // Ghost outline
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.restore();
}
