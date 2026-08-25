// ─────────────────────────────────────────────
// MEGUMI FUSHIGURO FIGHTER SKIN & BODY MODEL
// Ten Shadows Sorcerer (Jujutsu Kaisen)
// Clean Minimalist Anime Aesthetic
// Matches Gojo's Tokyo Jujutsu High Uniform
// Adhering to Rule 19 (Upright Front POV),
// Rule 20 (Hand Visibility), and Rule 11 (Zero shadowBlur)
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawMegumiShadowBlade } from '../weapons/megumiWeaponGraphics.js';

// Pre-computed normalized coordinates for Megumi's organic anime bangs (stylized fringe)
const _MEGUMI_BANGS = [
  { nx:  0.88, ny: -0.32 },
  { nx:  0.72, ny: -0.20 }, // Right outer lock
  { nx:  0.56, ny: -0.28 },
  { nx:  0.40, ny: -0.14 }, // Right mid long spike
  { nx:  0.26, ny: -0.26 },
  { nx:  0.10, ny: -0.10 }, // Signature center-right fringe
  { nx: -0.05, ny: -0.28 },
  { nx: -0.20, ny: -0.12 }, // Signature center-left fringe
  { nx: -0.36, ny: -0.26 },
  { nx: -0.52, ny: -0.15 }, // Left mid long spike
  { nx: -0.68, ny: -0.28 },
  { nx: -0.80, ny: -0.18 }, // Left outer lock
  { nx: -0.88, ny: -0.32 }
];

/**
 * Draws Megumi's hand/fist with Jujutsu High uniform dark cuff and skin tone.
 * Fully compliant with Rule 20 (Hand Visibility & Skin Only).
 */
export function drawMegumiFist(ctx, x, y, radius, skinColor = '#FFE0BD', fighter = null, isBack = false) {
  ctx.save();
  ctx.translate(x, y);

  // 1. JJK High Uniform Deep Violet-Navy Sleeve Cuff (Matches Gojo - coming from body side along -X)
  ctx.fillStyle = '#211A36';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-radius * 1.05, -radius * 0.70, radius * 0.95, radius * 1.40, 2);
  ctx.fill();
  ctx.stroke();

  // 2. Skin Knuckle / Fist Base Circle at center (0, 0)
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = skinColor;
  ctx.fill();

  // Dark Outline
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Subtle Knuckle Crease
  ctx.strokeStyle = '#C48A68';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.35);
  ctx.lineTo(0,  radius * 0.35);
  ctx.stroke();

  // Subtle Seafoam / Jade Cursed Energy Wisps around hands if channeling
  if (fighter && (fighter.combatAuraOpacity > 0.1 || fighter.isSubmerged || fighter.totalityActive)) {
    const auraAlpha = Math.min(1.0, (fighter.combatAuraOpacity || 0.6) * 0.7);
    ctx.strokeStyle = `rgba(46, 230, 168, ${auraAlpha})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.25, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws Megumi's underfoot liquid shadow reservoir aura.
 * Zero shadowBlur filters (Rule 11 compliant).
 */
export function drawMegumiShadowAura(ctx, fighter) {
  const r = fighter.r || 25;
  const isWinnerScreen = fighter._isWinnerReveal || (typeof state !== 'undefined' && (state.gameState === 'matchEnd' || state.gameState === 'roundEnd'));
  if (isWinnerScreen) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const auraAlpha = Math.max(0.2, fighter.combatAuraOpacity || 0.4);

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.scale(1.0, 0.40); // Perspective ground flattening

  // 1. Fluid Liquid Shadow Base Puddle on Ground with dynamic expansion/contraction
  const puddlePulse = Math.sin(now * 0.003) * 2.0;
  const isSubmerged = Boolean(fighter.isSubmerged);
  const isErupting = Boolean(fighter.isErupting);

  let poolScale = 1.0;
  if (isSubmerged) {
    const sinkP = fighter.submergeSinkProgress !== undefined ? fighter.submergeSinkProgress : 1.0;
    const ease = 0.5 - 0.5 * Math.cos(Math.min(1.0, Math.max(0.0, sinkP)) * Math.PI);
    poolScale = 1.0 + 0.70 * ease;
  } else if (isErupting) {
    const maxE = fighter.eruptMaxTimer || 22;
    const riseP = fighter.eruptRiseProgress !== undefined ? fighter.eruptRiseProgress : (1.0 - ((fighter.eruptTimer || 0) / maxE));
    const ease = 0.5 - 0.5 * Math.cos(Math.min(1.0, Math.max(0.0, riseP)) * Math.PI);
    poolScale = 1.70 - 0.70 * ease;
  }

  const puddleRadius = (r * 1.55 + puddlePulse) * poolScale;

  const shadowGrad = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, puddleRadius);
  shadowGrad.addColorStop(0, `rgba(5, 7, 12, ${(isSubmerged || isErupting) ? 0.98 : 0.90 * auraAlpha})`);
  shadowGrad.addColorStop(0.55, `rgba(12, 18, 32, ${(isSubmerged || isErupting) ? 0.88 : 0.60 * auraAlpha})`);
  shadowGrad.addColorStop(0.80, `rgba(46, 230, 168, ${(isSubmerged || isErupting) ? 0.45 : 0.20 * auraAlpha})`);
  shadowGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.beginPath();
  ctx.arc(0, 0, puddleRadius, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  // 2. Liquid Shadow Swirl Tendril Rings & Boiling Bubbles
  ctx.strokeStyle = (isSubmerged || isErupting) ? 'rgba(46, 230, 168, 0.70)' : `rgba(18, 28, 46, ${0.55 * auraAlpha})`;
  ctx.lineWidth = (isSubmerged || isErupting) ? 2.2 : 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, puddleRadius * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  if (isSubmerged || isErupting) {
    // Boiling inner shadow ring
    ctx.strokeStyle = 'rgba(10, 14, 24, 0.90)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(0, 0, puddleRadius * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    // Swirling shadow eyes / cursed particles
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + now * 0.004;
      const d = puddleRadius * (0.35 + 0.35 * Math.sin(now * 0.005 + i));
      const px = Math.cos(a) * d;
      const py = Math.sin(a) * d;
      ctx.fillStyle = (i % 2 === 0) ? '#2EE6A8' : '#1C2D4A';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // 3. Floating Shadow Spores & Seafoam Cursed Sparks (Steady 4-point emitters)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + (now * 0.0015 * (i % 2 === 0 ? 1 : -1));
      const dist = r * (0.8 + 0.35 * Math.sin(now * 0.002 + i));
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;

      ctx.beginPath();
      ctx.arc(px, py, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = (i % 2 === 0) ? `rgba(46, 230, 168, ${0.75 * auraAlpha})` : `rgba(20, 30, 50, ${0.85 * auraAlpha})`;
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Main Skin Renderer for Megumi Fushiguro
 * Features:
 * - Tokyo Jujutsu High Uniform copied directly from Gojo (Deep Violet-Navy #211A36 with exact high collar, central placket & seams).
 * - Base Skin Tone: #FFE0BD (same as Gojo).
 * - Authentic Spiky Anime Hair with natural multi-layered fringe bangs and flaring crown spikes.
 * - Smooth sinking and erupting vertical transitions during Shadow Sink.
 * - Strictly Rule 19 compliant: zero eyes/mouth/nose.
 */
export function drawMegumiSkin(ctx, fighter) {
  // If fully submerged in the middle of gliding, suppress body rendering
  if (fighter.isSubmerged && (fighter.submergeSinkProgress === undefined || fighter.submergeSinkProgress >= 1.0)) {
    return;
  }

  const r = fighter.r || 25;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // Handle smooth vertical sinking / water-level floor plane clipping in WORLD SPACE (centered on floor puddle)
  let appliedClip = false;
  if (fighter.isSubmerged && (fighter.submergeSinkProgress || 0) < 1.0) {
    const p = Math.min(1.0, Math.max(0.0, fighter.submergeSinkProgress || 0));
    const easeSink = 0.5 - 0.5 * Math.cos(p * Math.PI); // Smooth Cosine S-curve
    const sinkOffset = easeSink * (r * 2.2);

    ctx.save();
    appliedClip = true;
    ctx.beginPath();
    ctx.rect(-r * 3.5, -r * 4.0, r * 7.0, (r * 0.35) + (r * 4.0) - sinkOffset);
    ctx.clip();
    ctx.translate(0, sinkOffset);
  } else if (fighter.isErupting && (fighter.eruptTimer || 0) > 0) {
    const maxE = fighter.eruptMaxTimer || 22;
    const p = Math.min(1.0, Math.max(0.0, fighter.eruptRiseProgress !== undefined ? fighter.eruptRiseProgress : (1.0 - (fighter.eruptTimer / maxE))));
    const easeRise = 0.5 - 0.5 * Math.cos(p * Math.PI); // Smooth Cosine S-curve
    const riseOffset = (1.0 - easeRise) * (r * 2.2);

    ctx.save();
    appliedClip = true;
    ctx.beginPath();
    ctx.rect(-r * 3.5, -r * 4.0, r * 7.0, (r * 0.35) + (r * 4.0) - riseOffset);
    ctx.clip();
    ctx.translate(0, riseOffset);
  }

  // 1. Orientation & Mirroring (Rule 19 Upright POV)
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  ctx.rotate(angle);

  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft && !fighter.isSpinning) {
    ctx.scale(1, -1);
  }

  // ── CLIPPED BODY CIRCLE MESH ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // --- 1. Base (Skin Color) - Same as Gojo ---
  ctx.fillStyle = '#FFE0BD';
  ctx.fill();

  // --- 2. JJK High Uniform Torso Base - Copied Directly from Gojo ---
  ctx.fillStyle = '#211A36'; // Official JJK Deep Violet-Navy
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.55);
  ctx.lineTo(-r * 0.45, r * 0.35);
  ctx.lineTo(-r * 0.42, r * 0.22);
  ctx.quadraticCurveTo(0, r * 0.26, r * 0.42, r * 0.22);
  ctx.lineTo(r * 0.45, r * 0.35);
  ctx.lineTo(r, r * 0.55);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  // --- 3. Megumi Jet-Black Anime Hair Base Mesh ---
  ctx.fillStyle = '#0E1017';
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 0.32);

  // Trace the stylized layered bangs
  for (let i = 0; i < _MEGUMI_BANGS.length; i++) {
    const pt = _MEGUMI_BANGS[i];
    ctx.lineTo(r * pt.nx, r * pt.ny);
  }
  ctx.lineTo(-r * 1.05, -r * 0.32);
  ctx.closePath();
  ctx.fill();

  // Subtle Dark Midnight Blue Hair Sheen
  if (!isLowQuality) {
    ctx.fillStyle = '#181E2E';
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.65);
    ctx.quadraticCurveTo(0, -r * 0.80, r * 0.85, -r * 0.65);
    ctx.quadraticCurveTo(0, -r * 0.50, -r * 0.85, -r * 0.65);
    ctx.closePath();
    ctx.fill();
  }

  // Crisp Manga Hairline Ink Outline along Bangs
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * _MEGUMI_BANGS[0].nx, r * _MEGUMI_BANGS[0].ny);
  for (let i = 1; i < _MEGUMI_BANGS.length; i++) {
    const pt = _MEGUMI_BANGS[i];
    ctx.lineTo(r * pt.nx, r * pt.ny);
  }
  ctx.stroke();

  // --- 4. High Collar Detail & Central Placket - Copied Directly from Gojo ---
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  // Collar Rim & Outer Edge Outline
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.55);
  ctx.lineTo(-r * 0.45, r * 0.35);
  ctx.lineTo(-r * 0.42, r * 0.22);
  ctx.quadraticCurveTo(0, r * 0.26, r * 0.42, r * 0.22);
  ctx.lineTo(r * 0.45, r * 0.35);
  ctx.lineTo(r, r * 0.55);
  ctx.stroke();

  // Central Covered Zip/Button Placket (Vertical strip running up the neck/chest)
  ctx.fillStyle = '#141024'; // Deep Violet-Black Placket Fill
  ctx.beginPath();
  ctx.rect(-r * 0.08, r * 0.24, r * 0.16, r * 0.76);
  ctx.fill();

  ctx.strokeStyle = '#0E0B1A';
  ctx.lineWidth = 2;
  ctx.strokeRect(-r * 0.08, r * 0.24, r * 0.16, r * 0.76);

  // Horizontal Fabric Folds & Collar Creases
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.8;

  // Upper collar crease folds
  ctx.beginPath();
  ctx.moveTo(-r * 0.40, r * 0.30);
  ctx.lineTo(-r * 0.08, r * 0.33);
  ctx.moveTo(r * 0.08, r * 0.33);
  ctx.lineTo(r * 0.40, r * 0.30);

  // Lower collar / shoulder seam lines
  ctx.moveTo(-r * 0.45, r * 0.38);
  ctx.quadraticCurveTo(-r * 0.25, r * 0.44, -r * 0.08, r * 0.42);
  ctx.moveTo(r * 0.08, r * 0.42);
  ctx.quadraticCurveTo(r * 0.25, r * 0.44, r * 0.45, r * 0.38);

  // Mid-chest horizontal fabric folds
  ctx.moveTo(-r * 0.85, r * 0.52);
  ctx.lineTo(-r * 0.08, r * 0.50);
  ctx.moveTo(r * 0.08, r * 0.50);
  ctx.lineTo(r * 0.85, r * 0.52);
  ctx.stroke();

  ctx.restore(); // End clipped body circle

  // ── EXTERNAL SPIKY CROWN TUFTS (Authentic Megumi Sea-Urchin Silhouette) ──
  ctx.fillStyle = '#0E1017';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;
  ctx.lineJoin = 'round';

  // 1. Far-Left Outer Spike (~9:30 o'clock)
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.42);
  ctx.lineTo(-r * 1.15, -r * 0.65);
  ctx.lineTo(-r * 0.65, -r * 0.70);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Mid-Left Crown Spike (~11 o'clock)
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.72);
  ctx.lineTo(-r * 0.82, -r * 1.12);
  ctx.lineTo(-r * 0.32, -r * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Center-Top Prominent Spike (~12 o'clock)
  ctx.beginPath();
  ctx.moveTo(-r * 0.26, -r * 0.90);
  ctx.lineTo(0, -r * 1.22);
  ctx.lineTo(r * 0.24, -r * 0.92);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Mid-Right Crown Spike (~1 o'clock)
  ctx.beginPath();
  ctx.moveTo(r * 0.32, -r * 0.88);
  ctx.lineTo(r * 0.80, -r * 1.10);
  ctx.lineTo(r * 0.65, -r * 0.70);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. Far-Right Outer Spike (~2:30 o'clock)
  ctx.beginPath();
  ctx.moveTo(r * 0.68, -r * 0.65);
  ctx.lineTo(r * 1.15, -r * 0.62);
  ctx.lineTo(r * 0.78, -r * 0.40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ── BOLD BLACK BODY CIRCLE OUTLINE (Matches Gojo) ──
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 3.0;
  ctx.strokeStyle = '#111111';
  ctx.stroke();

  // ── HAND RENDERING (Rule 20 Guard Compliant) ──
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!shouldHideHands) {
    const handRadius = getHandSize(6.8, fighter);

    const isPunching = Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
    const isSummoningOrMudras = Boolean(fighter.isChannelingMahoraga || fighter.totalityActive || fighter.domainActive);

    let frontHandX = r * 0.95;
    let frontHandY = 0;
    let backHandX  = r * 0.65;
    let backHandY  = -r * 0.15;
    let showBackHand = false;

    if (isPunching) {
      const punchProg = 1 - (fighter.punchAnimTimer / (fighter.punchMaxTime || 18));
      const lungeExtension = Math.sin(punchProg * Math.PI) * 22;
      frontHandX = r * 0.95 + lungeExtension * 1.40;
      frontHandY = Math.sin(punchProg * Math.PI) * (r * 0.08);
    } else if (isSummoningOrMudras) {
      // Ten Shadows Mudra / Shadow Puppet Hand Sign (Two hands clasped together along +X)
      showBackHand = true;
      frontHandX = r * 0.88;
      frontHandY = r * 0.18;
      backHandX  = r * 0.88;
      backHandY  = -r * 0.18;
    } else {
      // Natural diagonal combat guard stance matching reference: Hand at (r * 0.62, r * 0.28), blade angled steeply upward (-1.12 rad / ~ -64°)
      frontHandX = r * 0.62;
      frontHandY = r * 0.28;
    }

    // Back Hand (Behind or Secondary mudra stance)
    if (showBackHand && !fighter.hideBackHand) {
      drawMegumiFist(ctx, backHandX, backHandY, handRadius * 0.90, '#FFE0BD', fighter, true);
    }

    // Front Hand & Cursed Sword (Diagonal Upright Guard stance, Downward Chop, and Toji-Style Ambush Thrust)
    if (!fighter.hideFrontHand) {
      const isSwinging = Boolean(fighter.slashSwingTimer && fighter.slashSwingTimer > 0);
      const isThrust = Boolean(fighter.isThrustAttack);
      let swingProgress = 0;
      let swordAngle = -1.12; // Natural steep diagonal upright guard angle (~ -64 degrees matching reference)

      if (isSwinging && isThrust) {
        // Buttery Smooth Toji-Style Supersonic Forward Piercing Thrust (Zero Snapping)
        const maxT = fighter.slashSwingMaxTimer || 22;
        swingProgress = 1 - (fighter.slashSwingTimer / maxT);

        if (swingProgress < 0.25) {
          // 1. Smooth Anticipation Leveling (0.0 -> 0.25, ~5 frames): Gentle Hermite curve, zero snappy pull back
          const t = swingProgress / 0.25;
          const easeT = t * t * (3 - 2 * t); // Smooth S-curve transition
          frontHandX = r * 0.62 - easeT * (r * 0.08); // Subtle natural weight shift (r * 0.62 -> r * 0.54)
          frontHandY = r * 0.28 * (1 - easeT); // Smoothly glides to center line Y = 0
          swordAngle = -1.12 + easeT * 1.12; // Smoothly levels blade from -1.12 rad to 0.0 rad
        } else if (swingProgress < 0.48) {
          // 2. Explosive Supersonic Piercing Plunge (0.25 -> 0.48, ~5 frames)
          const t = (swingProgress - 0.25) / 0.23;
          const easeThrust = 1 - Math.pow(1 - t, 3.5); // Explosive forward plunge
          frontHandX = (r * 0.54) + easeThrust * (r * 1.71); // Lunges forward from r * 0.54 to r * 2.25!
          frontHandY = 0;
          swordAngle = 0.0; // Laser-straight horizontal piercing plunge
        } else if (swingProgress < 0.58) {
          // 3. Kinetic Apex Impact Hold (0.48 -> 0.58, ~2.5 frames): Holds peak extension on impact
          frontHandX = r * 2.25;
          frontHandY = 0;
          swordAngle = 0.0;
        } else {
          // 4. Fluid Decelerating Retraction & Guard Reset (0.58 -> 1.0, ~9 frames): Smooth cosine ease, zero jump
          const recP = (swingProgress - 0.58) / 0.42;
          const easeRec = 0.5 + 0.5 * Math.cos(recP * Math.PI); // Cosine curve with 0 derivative at both ends
          frontHandX = r * 0.62 + easeRec * (r * 1.63); // Smoothly glides back to r * 0.62
          frontHandY = r * 0.28 * (1 - easeRec); // Glides back to r * 0.28
          swordAngle = -1.12 + (0.0 - (-1.12)) * easeRec; // Glides back to -1.12 rad guard
        }
      } else if (isSwinging) {
        // Standard Nanami-Style Decoupled Downward Chop
        swingProgress = 1 - (fighter.slashSwingTimer / (fighter.slashSwingMaxTimer || 18));

        if (swingProgress < 0.15) {
          // 1. Snappy Overhead Windup: -1.12 rad -> -1.47 rad (overhead cocked back)
          const t = swingProgress / 0.15;
          const easeWindup = Math.sin(t * (Math.PI / 2));
          swordAngle = -1.12 - easeWindup * 0.35;
          const pullBack = -Math.sin(t * Math.PI) * 4;
          frontHandX = r * 0.62 + pullBack;
          frontHandY = r * 0.28 - t * (r * 0.25);
        } else if (swingProgress < 0.58) {
          // 2. Powerful Supersonic Downward Chop: -1.47 rad -> +1.20 rad
          const t = (swingProgress - 0.15) / 0.43;
          const easeChop = t * t * (3 - 2 * t); // Smooth Hermite S-Curve
          swordAngle = -1.47 + easeChop * 2.67;
          const lunge = Math.sin(t * Math.PI) * 18;
          frontHandX = r * 0.62 + lunge;
          frontHandY = -r * 0.05 + t * (r * 0.30);
        } else {
          // 3. Fluid Follow-through & Smooth Glide Recovery: +1.20 rad -> -1.12 rad
          const recP = (swingProgress - 0.58) / 0.42;
          const easeRec = 0.5 + 0.5 * Math.cos(recP * Math.PI); // Cosine ease-out
          swordAngle = -1.12 + (1.20 - (-1.12)) * easeRec;
          frontHandX = r * 0.62 + easeRec * 3;
          frontHandY = r * 0.28;
        }
      }

      // Draw Megumi's Cursed Sword (Broad Slab Blade)
      drawMegumiShadowBlade(ctx, frontHandX, frontHandY, swordAngle, r, isSwinging, swingProgress);

      // Draw Grip Fist
      drawMegumiFist(ctx, frontHandX, frontHandY, handRadius, '#FFE0BD', fighter, false);
    }
  }

  // Status Overlays (Stun, Paralyze, Freeze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  if (appliedClip) {
    ctx.restore(); // Restore clipping plane
  }

  ctx.restore(); // End main transform
}

/**
 * Renders Megumi's Translucent Ghost Model / Shadow Clone Afterimage
 */
export function drawMegumiGhostSkin(ctx, x, y, angle = 0, r = 25, alpha = 0.5) {
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

  // 1. Spectral Shadow / Seafoam Outer Glow
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(46, 230, 168, 0.22)';
  ctx.fill();

  // 2. Clipped Body
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // Skin
  ctx.fillStyle = '#FFE0BD';
  ctx.fillRect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1);

  // Uniform Torso
  ctx.fillStyle = '#211A36';
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.55);
  ctx.lineTo(-r * 0.45, r * 0.35);
  ctx.lineTo(-r * 0.42, r * 0.22);
  ctx.quadraticCurveTo(0, r * 0.26, r * 0.42, r * 0.22);
  ctx.lineTo(r * 0.45, r * 0.35);
  ctx.lineTo(r, r * 0.55);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  // Spiky Hair & Bangs
  ctx.fillStyle = '#0E1017';
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 1.05);
  ctx.lineTo(r * 1.05, -r * 0.32);
  for (let i = 0; i < _MEGUMI_BANGS.length; i++) {
    const pt = _MEGUMI_BANGS[i];
    ctx.lineTo(r * pt.nx, r * pt.ny);
  }
  ctx.lineTo(-r * 1.05, -r * 0.32);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // 3. Protruding Spiky Crown Tufts
  ctx.fillStyle = '#0E1017';
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.42);
  ctx.lineTo(-r * 1.15, -r * 0.65);
  ctx.lineTo(-r * 0.65, -r * 0.70);
  ctx.moveTo(-r * 0.62, -r * 0.72);
  ctx.lineTo(-r * 0.82, -r * 1.12);
  ctx.lineTo(-r * 0.32, -r * 0.88);
  ctx.moveTo(-r * 0.26, -r * 0.90);
  ctx.lineTo(0, -r * 1.22);
  ctx.lineTo(r * 0.24, -r * 0.92);
  ctx.moveTo(r * 0.32, -r * 0.88);
  ctx.lineTo(r * 0.80, -r * 1.10);
  ctx.lineTo(r * 0.65, -r * 0.70);
  ctx.moveTo(r * 0.68, -r * 0.65);
  ctx.lineTo(r * 1.15, -r * 0.62);
  ctx.lineTo(r * 0.78, -r * 0.40);
  ctx.fill();

  // 4. Spectral Outline
  ctx.strokeStyle = 'rgba(46, 230, 168, 0.85)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
