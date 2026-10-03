// ─────────────────────────────────────────────
// Naoya Zenin — Fighter Skin & Body Model
// Adheres strictly to Repository Standards:
// - Rule 19: Upright Front POV Orientation
// - Rule 20: Canonical Default Model Hand Positioning
// - Rule 3.2: Faceless Minimalist Aesthetic
// - Rule 3.4: Discrete Lock Arrays for Hair (No Sine Waves)
// - Rule 3.5: Offscreen Canvas Caching Pattern
// - Rule 11: Zero shadowBlur / shadowColor
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';

let _cachedFighterCanvas = null;
let _cachedFighterR = 0;

/**
 * Rasterizes Naoya's authentic body model to an offscreen canvas for optimal 60 FPS performance (Rule 3.5).
 * @param {HTMLCanvasElement} canvas
 * @param {number} r
 */
function _renderNaoyaPixelBodyToCanvas(canvas, r) {
  const size = Math.ceil((r * 2.8) + 16);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cx = size / 2;
  const cy = size / 2;

  ctx.imageSmoothingEnabled = false;

  // 1. Torso Base Circle & Zenin Clan Dark Charcoal Haori (+Y)
  ctx.save();
  ctx.translate(cx, cy);

  // Outer dark haori silhouette
  ctx.fillStyle = '#1A1D24'; // Slate dark charcoal
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Haori side lapels & shoulder contours
  ctx.fillStyle = '#12141A'; // Deep obsidian shade
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.15, Math.PI * 0.85);
  ctx.lineTo(r * 0.70, r * 0.40);
  ctx.lineTo(-r * 0.70, r * 0.40);
  ctx.closePath();
  ctx.fill();

  // 2. Pale Sage-Green Under-Kimono (+Y Chest Center)
  ctx.fillStyle = '#D9E8D2'; // Pale sage kimono
  ctx.beginPath();
  ctx.moveTo(-r * 0.38, r * 0.10);
  ctx.lineTo(0, r * 0.55);
  ctx.lineTo(r * 0.38, r * 0.10);
  ctx.lineTo(r * 0.25, -r * 0.10);
  ctx.lineTo(-r * 0.25, -r * 0.10);
  ctx.closePath();
  ctx.fill();

  // Inner kimono neckline overlap (left over right collar)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.05);
  ctx.lineTo(0, r * 0.50);
  ctx.stroke();

  ctx.strokeStyle = '#8FA885';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(r * 0.35, r * 0.05);
  ctx.lineTo(-r * 0.05, r * 0.45);
  ctx.stroke();

  // 3. Dark Obi Sash (+Y Belt Zone: +r * 0.60 to +r * 0.78)
  ctx.fillStyle = '#0E1015'; // Dark ink obi
  ctx.fillRect(-r * 0.75, r * 0.60, r * 1.50, r * 0.18);

  ctx.strokeStyle = '#76E042'; // Electric lime micro-accent cord (obijime)
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, r * 0.69);
  ctx.lineTo(r * 0.75, r * 0.69);
  ctx.stroke();

  // 4. Face & Jaw Contour Zone (-r * 0.18 to +r * 0.15) (Faceless Minimalist Rule 3.2)
  ctx.fillStyle = '#FFDFC4'; // Fair anime skin tone
  ctx.beginPath();
  ctx.moveTo(-r * 0.60, -r * 0.18);
  ctx.lineTo(-r * 0.40, r * 0.18);
  ctx.lineTo(0, r * 0.26);
  ctx.lineTo(r * 0.40, r * 0.18);
  ctx.lineTo(r * 0.60, -r * 0.18);
  ctx.closePath();
  ctx.fill();

  // Jawline & Chin Soft Shadow
  ctx.fillStyle = '#EAB896';
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.18);
  ctx.lineTo(0, r * 0.26);
  ctx.lineTo(r * 0.35, r * 0.18);
  ctx.lineTo(0, r * 0.19);
  ctx.closePath();
  ctx.fill();

  // 5. Zenin Clan Left Ear Piercings (3 Gold Studs along left ear flank)
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(-r * 0.78, -r * 0.05, 1.4, 0, Math.PI * 2);
  ctx.arc(-r * 0.81, 0.0, 1.4, 0, Math.PI * 2);
  ctx.arc(-r * 0.80, r * 0.06, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // 6. Hair Model (Discrete Locks — Rule 3.4): Dyed Light Blonde with Dark Undercut
  // Tier 1: Dark Undercut / Roots (-r * 0.50 to -r * 0.10)
  ctx.fillStyle = '#1A1C23';
  ctx.beginPath();
  ctx.moveTo(-r * 0.80, -r * 0.10);
  ctx.lineTo(-r * 0.75, -r * 0.45);
  ctx.lineTo(r * 0.75, -r * 0.45);
  ctx.lineTo(r * 0.80, -r * 0.10);
  ctx.lineTo(r * 0.65, -r * 0.05);
  ctx.lineTo(0, -r * 0.20);
  ctx.lineTo(-r * 0.65, -r * 0.05);
  ctx.closePath();
  ctx.fill();

  // Tier 2: Base Dyed Blonde Hair Volume
  ctx.fillStyle = '#F1DF88'; // Pale golden blonde
  ctx.beginPath();
  ctx.arc(0, -r * 0.32, r * 0.84, Math.PI * 0.88, Math.PI * 2.12);
  ctx.fill();

  // Tier 3: Discrete Spiky Locks & Crown Tufts (-r * 1.15)
  // Left side tuft
  ctx.beginPath();
  ctx.moveTo(-r * 0.80, -r * 0.25);
  ctx.lineTo(-r * 0.92, -r * 0.55);
  ctx.lineTo(-r * 0.65, -r * 0.65);
  ctx.lineTo(-r * 0.60, -r * 1.05); // Left crown spike
  ctx.lineTo(-r * 0.35, -r * 0.82);
  ctx.lineTo(-r * 0.20, -r * 1.15); // Left-center main spike
  ctx.lineTo(0, -r * 0.88);
  ctx.lineTo(r * 0.25, -r * 1.12);  // Right-center main spike
  ctx.lineTo(r * 0.45, -r * 0.85);
  ctx.lineTo(r * 0.70, -r * 1.02);  // Right crown spike
  ctx.lineTo(r * 0.75, -r * 0.58);
  ctx.lineTo(r * 0.90, -r * 0.48);
  ctx.lineTo(r * 0.80, -r * 0.22);
  ctx.closePath();
  ctx.fill();

  // Tier 4: Sharp Bang Lock Strands framing face (-r * 0.35 to -r * 0.12)
  // Left side lock
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, -r * 0.30);
  ctx.lineTo(-r * 0.55, -r * 0.05);
  ctx.lineTo(-r * 0.42, -r * 0.25);
  ctx.closePath();
  ctx.fill();

  // Center swept fringe lock
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.35);
  ctx.lineTo(-r * 0.10, -r * 0.12); // Swept bang tip
  ctx.lineTo(r * 0.15, -r * 0.35);
  ctx.closePath();
  ctx.fill();

  // Right side lock
  ctx.beginPath();
  ctx.moveTo(r * 0.40, -r * 0.30);
  ctx.lineTo(r * 0.58, -r * 0.08);
  ctx.lineTo(r * 0.68, -r * 0.28);
  ctx.closePath();
  ctx.fill();

  // Specular Golden Hair Highlights (Crown Glint)
  ctx.fillStyle = '#FFF6B8';
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.70);
  ctx.lineTo(-r * 0.20, -r * 0.95);
  ctx.lineTo(0, -r * 0.75);
  ctx.lineTo(r * 0.22, -r * 0.92);
  ctx.lineTo(r * 0.45, -r * 0.70);
  ctx.lineTo(0, -r * 0.65);
  ctx.closePath();
  ctx.fill();

  // Dark manga ink outline around outer hair & collar
  ctx.strokeStyle = '#0E1015';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export function getNaoyaCachedCanvas(r) {
  if (!_cachedFighterCanvas || _cachedFighterR !== r) {
    if (!_cachedFighterCanvas && typeof document !== 'undefined') {
      _cachedFighterCanvas = document.createElement('canvas');
    }
    if (_cachedFighterCanvas) {
      _cachedFighterR = r;
      _renderNaoyaPixelBodyToCanvas(_cachedFighterCanvas, r);
    }
  }
  return _cachedFighterCanvas;
}

/**
 * Renders Naoya's authentic pixel art ghost model for afterimages and projected frames.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 * @param {number} r
 * @param {number} [alpha=0.5]
 */
export function drawNaoyaGhostModel(ctx, x, y, angle, r, alpha = 0.5) {
  if (alpha <= 0.01) return;
  const canvas = getNaoyaCachedCanvas(r);
  if (!canvas) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle || 0);

  // Rule 19: Vertical mirroring when aiming left
  const facingLeft = Math.abs(angle || 0) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const w = canvas.width;
  const h = canvas.height;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * Draws Naoya's full fighter skin adhering to Rule 19, Rule 20, and Rule 3.5.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter
 */
export function drawNaoyaSkin(ctx, fighter) {
  if (!fighter) return;

  const r = fighter.r || 25;
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);

  // 1. Offscreen Canvas Caching check
  getNaoyaCachedCanvas(r);

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(angle);

  // Rule 19: Vertical mirroring when aiming left
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // 2. Render Cached Pixel Art Body
  if (_cachedFighterCanvas) {
    const w = _cachedFighterCanvas.width;
    const h = _cachedFighterCanvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_cachedFighterCanvas, -w / 2, -h / 2, w, h);
  } else {
    // Fallback if canvas creation failed
    ctx.fillStyle = '#76E042';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Render Hand Layering & Dynamic Brawler Punches (Gojo-style snappy anime punches)
  const shouldHideHands = Boolean(
    (typeof state !== 'undefined' && state.showSkinOnly) ||
    fighter.hideHands
  );

  if (!shouldHideHands) {
    const handR = getHandSize(r * 0.30);
    const skinTone = '#FFDFC4';
    const handOutline = '#0E1015';

    const isPunching = Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
    const isUltSprinting = Boolean(fighter.isExecutingUlt && (fighter.ultPhase === 1 || fighter.ultPhase === 0));

    if (isPunching) {
      const maxT = fighter.punchAnimMaxTimer || 8;
      const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));

      let easePunch = 0;
      if (rawProgress < 0.28) {
        easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
      } else {
        const retractT = (rawProgress - 0.28) / 0.72;
        easePunch = Math.cos(retractT * (Math.PI / 2));
      }

      // Dynamic reach directly towards target so punch connects deeply into opponent
      let maxLunge = r * 1.85;
      const target = fighter.flurryTarget || fighter.target;
      if (target && !target.isDead) {
        const dx = target.x - fighter.x;
        const dy = (target.y - (target.z || 0)) - (fighter.y - (fighter.z || 0));
        const dist = Math.hypot(dx, dy);
        const targetR = target.r || r;
        const gap = dist - targetR - r * 0.82;
        const desiredReach = gap + Math.min(targetR * 0.5, 14);
        maxLunge = Math.max(r * 1.15, Math.min(r * 2.5, desiredReach));
      }
      const currentLunge = easePunch * maxLunge;

      // Alternating Left / Right 1-2 Boxer Punches (Upper Left & Lower Right Flanks)
      const isLeftPunch = (fighter.punchAnimHand === 1);
      
      let leftX, leftY, rightX, rightY;
      if (!isLeftPunch) {
        // Right fist (lower flank) lunges forward along +X
        rightX = r * 0.65 + currentLunge;
        rightY = r * 0.38 - Math.sin(rawProgress * Math.PI) * (r * 0.10);
        // Left fist (upper flank) stays forward in active boxer high guard
        leftX = r * 0.45 - easePunch * (r * 0.15);
        leftY = -r * 0.38;
      } else {
        // Left fist (upper flank) lunges forward along +X
        leftX = r * 0.65 + currentLunge;
        leftY = -r * 0.38 + Math.sin(rawProgress * Math.PI) * (r * 0.10);
        // Right fist (lower flank) stays forward in active boxer high guard
        rightX = r * 0.45 - easePunch * (r * 0.15);
        rightY = r * 0.38;
      }

      // Draw guarding fist first (under), then lunging punch fist on top
      if (!isLeftPunch) {
        drawPixelHand(ctx, leftX, leftY, handR * 0.95, skinTone, handOutline);
        drawPixelHand(ctx, rightX, rightY, handR * 1.10, skinTone, handOutline);
      } else {
        drawPixelHand(ctx, rightX, rightY, handR * 0.95, skinTone, handOutline);
        drawPixelHand(ctx, leftX, leftY, handR * 1.10, skinTone, handOutline);
      }
    } else if (isUltSprinting) {
      // Supersonic Mach 3 Sprint Arm-Pumping Cycle
      const p = Math.min(1.0, Math.max(0.0, fighter.ultRunwayProgress || 0));
      // Frequency accelerates from steady 0.50 rad/frame to blistering 1.15 rad/frame at Mach 3
      const freq = 0.50 + p * 0.65;
      const sprintPhase = (fighter.ultTimer || 0) * freq;
      
      // Dynamic swing amplitude: arm reaches forward and drives back
      const strokeAmp = (r * 0.70) + p * (r * 0.35); // 0.70r to 1.05r
      const stroke = Math.sin(sprintPhase);
      const strokeCos = Math.cos(sprintPhase);

      // Sprinter forward torso lean: hands shift forward as speed builds
      const forwardLean = (r * 0.15) + p * (r * 0.35);

      // Left Arm: on upper flank (-Y)
      const leftX = forwardLean - stroke * strokeAmp;
      const leftY = -r * 0.52 + strokeCos * (r * 0.12);

      // Right Arm: on lower flank (+Y), opposite phase
      const rightX = forwardLean + stroke * strokeAmp;
      const rightY = r * 0.52 - strokeCos * (r * 0.12);

      // Draw whichever hand is further back first, then front hand
      if (leftX < rightX) {
        drawPixelHand(ctx, leftX, leftY, handR, skinTone, handOutline);
        drawPixelHand(ctx, rightX, rightY, handR, skinTone, handOutline);
      } else {
        drawPixelHand(ctx, rightX, rightY, handR, skinTone, handOutline);
        drawPixelHand(ctx, leftX, leftY, handR, skinTone, handOutline);
      }

      // Supersonic Manga Speed Needles & Energy Slipstreams behind both fists (Rule 16)
      const renderSprintSlipstream = (handX, handY, isDrivingForward, isLime) => {
        const trailLen = (r * 0.85 + p * r * 1.5) * (isDrivingForward ? 1.25 : 0.75);
        const needleW = handR * (0.60 + p * 0.25);
        const mainColor = isLime ? 'rgba(118, 224, 66, 0.70)' : 'rgba(0, 242, 254, 0.70)';

        // 4-point Manga speed needle polygon trailing behind the fist (-X direction)
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.moveTo(handX - trailLen, handY);
        ctx.lineTo(handX - trailLen * 0.45, handY - needleW);
        ctx.lineTo(handX - handR * 0.4, handY);
        ctx.lineTo(handX - trailLen * 0.45, handY + needleW);
        ctx.closePath();
        ctx.fill();

        // Intense White core needle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
        ctx.beginPath();
        ctx.moveTo(handX - trailLen * 0.75, handY);
        ctx.lineTo(handX - trailLen * 0.40, handY - needleW * 0.40);
        ctx.lineTo(handX - handR * 0.3, handY);
        ctx.lineTo(handX - trailLen * 0.40, handY + needleW * 0.40);
        ctx.closePath();
        ctx.fill();
      };

      // Render slipstreams for both fists
      renderSprintSlipstream(leftX, leftY, leftX > forwardLean, false); // Cyan slipstream on upper arm
      renderSprintSlipstream(rightX, rightY, rightX > forwardLean, true);  // Lime slipstream on lower arm
    }
    // Idle / Moving Stance: Hands remain tucked inside sleeves/haori (hidden)
  }

  ctx.restore();
}
