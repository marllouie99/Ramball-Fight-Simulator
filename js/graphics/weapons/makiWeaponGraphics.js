// ─────────────────────────────────────────────
// Maki Zen'in — Weapon & Soul Severing Visuals
// Split Soul Katana (Shakkontō) & Dragon-Bone (Ryūhoku)
// Adhering strictly to Repository Standards:
// - Rule 11: Zero shadowBlur / shadowColor
// - Rule 15: Double-tapered crescent blade slashes
// - Rule 16: Manga 4-point needle speed lines
// - Rule 20: Symmetrical hand placement standard
// ─────────────────────────────────────────────

import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { CONFIG, getHandSize } from '../../core/config.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawSplitSoulKatanaBladeMesh } from './tojiWeaponGraphics.js';

let _makiWeaponImage = null;
let _makiWeaponImageLoading = false;

export function _getMakiWeaponImage() {
  if (_makiWeaponImage && _makiWeaponImage.complete && _makiWeaponImage.naturalWidth > 0) {
    return _makiWeaponImage;
  }
  if (!_makiWeaponImageLoading && typeof Image !== 'undefined') {
    _makiWeaponImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _makiWeaponImage = img;
      _makiWeaponImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Maki weapon image at Assets/model/maki/Maki-weapon.png', e);
      _makiWeaponImageLoading = false;
    };
    img.src = 'Assets/model/maki/Maki-weapon.png?v=1';
    _makiWeaponImage = img;
  }
  return _makiWeaponImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getMakiWeaponImage();
}

/**
 * Draws Maki's weapons and hands adhering strictly to Rule 20 standard.
 * Features 3 completely unique, bespoke, non-chop combat stances:
 * - Hit 1: Battōjutsu Quick-Draw (Linear horizontal Iai flash from hip sheath, 0 downward chop)
 * - Hit 2: Air-Step Ascending Cleave (Low-to-high diagonal uppercut with air surface kick)
 * - Hit 3: Two-Handed Armor-Piercing Jet Thrust (Linear forward thrust & radial spatial soul rupture)
 */
export function drawMakiWeapons(ctx, fighter, r, facingLeft = false) {
  const handRadius = getHandSize(r * 0.30);
  let leftX = -r * 0.82;
  let leftY = r * 0.38;
  const rightX = r * 0.82;
  const rightY = r * 0.38;

  // Dynamic swing / thrust angle and position offsets
  let weaponRot = 0;
  let weaponLunge = 0;
  let weaponOffX = 0;
  let weaponOffY = 0;
  let isJetThrusting = false;
  let isTwoHanded = false;

  if (fighter.swordSwingTimer > 0) {
    const maxT = fighter.swordSwingMax || 24;
    const progress = Math.max(0, Math.min(1.0, 1.0 - fighter.swordSwingTimer / maxT));
    const step = fighter.swordComboStep || 1;

    if (step === 1) {
      // Hit 1: The Overhead Strike (Two-handed downward chop)
      isTwoHanded = true;
      if (progress < 0.35) {
        const wp = progress / 0.35;
        const ease = Math.sin(wp * Math.PI * 0.5);
        weaponRot = -1.20 * ease;
        weaponLunge = -6.0 * ease;
        weaponOffY = -4.0 * ease;
      } else {
        const sp = (progress - 0.35) / 0.65;
        const ease = Math.sin(sp * Math.PI * 0.5);
        weaponRot = -1.20 + 1.80 * ease;
        weaponLunge = -6.0 + 26.0 * Math.sin(sp * Math.PI);
        weaponOffY = -4.0 + 6.0 * ease;
      }
    } else if (step === 2) {
      // Hit 2: The Underhand Uppercut (Low rising cleave)
      if (progress < 0.30) {
        const wp = progress / 0.30;
        const ease = Math.sin(wp * Math.PI * 0.5);
        weaponRot = 0.85 * ease;
        weaponLunge = -4.0 * ease;
        weaponOffY = 6.0 * ease;
        leftX = -r * 0.70;
        leftY = r * 0.40;
      } else {
        const sp = (progress - 0.30) / 0.70;
        const ease = Math.sin(sp * Math.PI * 0.5);
        weaponRot = 0.85 - 2.10 * ease;
        weaponLunge = -4.0 + 24.0 * Math.sin(sp * Math.PI);
        weaponOffY = 6.0 - 12.0 * ease;
        leftX = rightX - 8;
        leftY = rightY - 4;
      }
    }
    // HIT 3: THE SPINNING SWEEP (FRAME 5)
    // (Full 360° whirlwind spinning horizontal sweep)
    // ──────────────────────────────────────────
    else {
      isJetThrusting = true;
      const ease = Math.sin(progress * Math.PI * 0.5);
      weaponRot = 0.0; // Horizontal blade alignment
      weaponLunge = 34.0 * Math.sin(progress * Math.PI); // Extended reach during full spin
      weaponOffY = 0.0;
      // Extended wide arms for centrifugal spin
      leftX = -r * 0.70;
      leftY = r * 0.40;
    }
  } else if (fighter.dragonBoneActive) {
    isTwoHanded = true; // Mandatory 2-handed grip for the entire Dragon-Bone sequence (stab to throw & groundPin)
    const phase = fighter.dragonBonePhase || 'dash';
    const timer = fighter.dragonBonePhaseTimer || 0;
    const maxT = fighter.dragonBonePhaseMax || 12;
    const progress = Math.min(1.0, timer / Math.max(1, maxT));

    if (phase === 'windup') {
      // Draw the two-handed point back before the committed dash
      const ease = Math.sin(progress * Math.PI * 0.5);
      weaponRot = 0.0;
      weaponLunge = -22.0 * ease;
      weaponOffY = -4.0 * ease;
    } else if (phase === 'dash') {
      // Phase 2: High-Speed Impalement Dash - Two-handed pointed thrust lock
      weaponRot = 0.0;
      weaponLunge = 26.0;
      isJetThrusting = true;
    } else if (phase === 'stab') {
      // Phase 3: Hold the blade through the target before beginning the lift
      weaponRot = 0.0;
      weaponLunge = 26.0 + 4.0 * progress;
      isJetThrusting = true;
    } else if (phase === 'lift') {
      // Phase 4: Hoisting the impaled enemy high overhead with both hands
      const ease = Math.sin(progress * Math.PI * 0.5);
      weaponRot = -1.65 * ease; // Lifts straight up overhead
      weaponLunge = 0.0;
      weaponOffY = 0.0;
    } else if (phase === 'throw') {
      const chopAngle = (CONFIG.maki?.dragonBoneThrowChopAngle ?? 0.85);
      // Phase 5: Two-handed forward and downward chop
      if (progress < 0.5) {
        const sp = progress / 0.5;
        const ease = Math.sin(sp * Math.PI * 0.5);
        weaponRot = -1.65 + (1.65 + chopAngle) * ease;
        weaponLunge = 10.0 * ease;
        weaponOffY = 4.0 * ease;
      } else {
        const rp = (progress - 0.5) / 0.5;
        const ease = Math.pow(1.0 - rp, 1.4);
        weaponRot = chopAngle * ease;
        weaponLunge = 26.0 * ease;
        weaponOffY = 4.0 * ease;
      }
    } else if (phase === 'groundPin') {
      const chopAngle = (CONFIG.maki?.dragonBoneThrowChopAngle ?? 0.85);
      // Phase 6: Pinned firmly into the floor with both hands
      if (progress < 0.70) {
        weaponRot = chopAngle;
        weaponLunge = 24.0;
        weaponOffY = 6.0;
      } else {
        const extractP = (progress - 0.70) / 0.30;
        const ease = Math.sin(extractP * Math.PI * 0.5);
        weaponRot = chopAngle * (1.0 - ease);
        weaponLunge = 24.0 * (1.0 - ease);
        weaponOffY = 6.0 * (1.0 - ease);
        if (extractP > 0.6) {
          isTwoHanded = false;
          const returnEase = (extractP - 0.6) / 0.4;
          leftX = (rightX - 6) + (-r * 0.82 - (rightX - 6)) * returnEase;
          leftY = (rightY + 2) + (r * 0.38 - (rightY + 2)) * returnEase;
        }
      }
    }
  } else if (fighter.riposteTimer > 0) {
    // Reverse-grip guard stance
    weaponRot = -1.45;
    weaponLunge = -2.0;
  }

  // 1. Draw Left Hand (Fist on lower-left flank if not in a two-handed stance)
  if (!isTwoHanded) {
    drawPixelHand(ctx, leftX, leftY, handRadius, '#D4A373', '#0E0F14');
  }

  // The pinned-target overlay already draws the blade through the enemy; avoid a second katana mesh.
  const isBladeShownInPinnedTarget = fighter.dragonBoneActive &&
    fighter.dragonBoneTarget?.isPinnedByMaki &&
    ['stab', 'lift', 'throw'].includes(fighter.dragonBonePhase);

  // 2. Draw Split Soul Katana anchored at Right Hand & Hands in local weapon space
  ctx.save();
  ctx.translate(rightX + weaponOffX, rightY + weaponOffY);

  // Support Weapon Customizations
  const customWp = (typeof state !== 'undefined' && state.weaponCustomizations?.maki) || {};
  const wpOffX = customWp.offsetX || 0;
  const wpOffY = customWp.offsetY || 0;
  const wpScaleMult = (customWp.scale || 1.0) * 0.65;
  const wpAngleOff = customWp.angleOffset || 0;

  ctx.translate(wpOffX, wpOffY);
  ctx.rotate(weaponRot + wpAngleOff);
  ctx.translate(weaponLunge, 0);

  // 2A. Render authentic Split Soul Katana scaled independently (White Fur Collar, Damascus Blade & Kashira Pommel)
  if (!isBladeShownInPinnedTarget) {
    ctx.save();
    ctx.scale(wpScaleMult, wpScaleMult);
    drawSplitSoulKatanaBladeMesh(ctx, '#D4A373', false);
    ctx.restore();
  }

  // 3. Render Hands Gripping the Katana Tsuka in Unscaled Character Space (1:1 size matching Left Hand & Toji)
  if (isTwoHanded) {
    // Rear support hand (Left Hand) gripping lower handle
    drawPixelHand(ctx, -handRadius * 1.35, 0, handRadius, '#D4A373', '#0E0F14');
    // Main hand (Right Hand) gripping near collar
    drawPixelHand(ctx, 0, 0, handRadius, '#D4A373', '#0E0F14');
  } else {
    // Single main hand (Right Hand) on grip
    drawPixelHand(ctx, 0, 0, handRadius, '#D4A373', '#0E0F14');
  }

  ctx.restore();

  // 4. Dragon-Bone Kinetic Exhaust VFX (when stored charges > 0 or during Hit 3 Jet Thrust)
  if ((fighter.kineticCharges && fighter.kineticCharges > 0) || isJetThrusting) {
    _drawKineticExhaustFlames(ctx, fighter, rightX + weaponOffX, rightY + weaponOffY, r, isJetThrusting);
  }
}

/**
 * Renders the authentic Split Soul Katana skewering directly through the enemy body circle.
 * Exactly matches user's reference diagram:
 * - Hilt/tsuba & white fur collar at entry side (outside body)
 * - Blade shaft transfixing through the center of the enemy circle
 * - Sharp tapered blade tip protruding out the far/exit side
 * - Gushing arterial exit wound blood spray & entry wound gore puncture
 * - Incandescent razor highlight core and specular tip glint
 */
export function drawMakiImpaledTargetOverlay(ctx, target, maki = null) {
  if (!target || target.isDead || !target.isPinnedByMaki) return;

  const tr = target.r || 25;
  const bladeAngle = (target._makiPinnedBladeAngle !== undefined && target._makiPinnedBladeAngle !== null)
    ? target._makiPinnedBladeAngle
    : (maki ? maki.gunAngle || 0 : 0);

  if (maki) {
    const cfg = CONFIG.maki || {};
    const phase = maki.dragonBonePhase;
    const timer = maki.dragonBonePhaseTimer || 0;
    const maxT = Math.max(1, maki.dragonBonePhaseMax || 1);
    const progress = Math.min(1.0, timer / maxT);
    let weaponRot = 0;
    let weaponLunge = 0;

    if (phase === 'stab') {
      weaponLunge = 26.0 + 4.0 * progress;
    } else if (phase === 'lift') {
      weaponRot = -1.65 * Math.sin(progress * Math.PI * 0.5);
    } else if (phase === 'throw') {
      const chopAngle = (CONFIG.maki?.dragonBoneThrowChopAngle ?? 0.85);
      if (progress < 0.5) {
        const throwProgress = progress / 0.5;
        const ease = Math.sin(throwProgress * Math.PI * 0.5);
        weaponRot = -1.65 + (1.65 + chopAngle) * ease;
        weaponLunge = 10.0 * ease;
      } else {
        const recovery = (progress - 0.5) / 0.5;
        const ease = Math.pow(1.0 - recovery, 1.4);
        weaponRot = chopAngle * ease;
        weaponLunge = 26.0 * ease;
      }
    }

    const customWp = state.weaponCustomizations?.maki || {};
    const gunAngle = maki.gunAngle || 0;
    const facingLeft = Math.abs(Math.atan2(Math.sin(gunAngle), Math.cos(gunAngle))) > Math.PI / 2;

    ctx.save();
    ctx.translate(maki.x, maki.y);
    ctx.rotate(gunAngle);
    if (facingLeft) ctx.scale(1, -1);
    ctx.translate((maki.r || 25) * 0.82, (maki.r || 25) * 0.38);
    ctx.translate(customWp.offsetX || 0, customWp.offsetY || 0);
    ctx.rotate(weaponRot + (customWp.angleOffset || 0));
    ctx.translate(weaponLunge, 0);
    const weaponScale = (customWp.scale || 1.0) * 0.65;
    ctx.scale(weaponScale, weaponScale);
    drawSplitSoulKatanaBladeMesh(ctx, '#D4A373', false);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.rotate(bladeAngle);

  // Entry wound gore puncture
  ctx.fillStyle = '#991B1B';
  ctx.beginPath();
  ctx.arc(-tr, 0, 6.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-tr - 2, 2, 3, 5);
  ctx.fillRect(-tr - 1, 6, 2, 4);

  // 5. Exit Wound Arterial Spray (+tr)
  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.arc(tr, 0, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Splattering droplets bursting forward from exit wound
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(tr + 4, -5, 3, 3);
  ctx.fillRect(tr + 8, 4, 3, 2.5);
  ctx.fillRect(tr + 13, -2, 2.5, 2.5);
  ctx.fillRect(tr + 18, 3, 2, 2);

  ctx.restore();
}

/**
 * Procedural fallback for Split Soul Katana with authentic tsuba & white fur collar matching Toji.
 */
function _drawProceduralSplitSoulKatana(ctx, r) {
  ctx.save();
  ctx.scale(0.65, 0.65);
  drawSplitSoulKatanaBladeMesh(ctx, '#D4A373', false);
  ctx.restore();
}

/**
 * Renders kinetic jet exhaust flames from the blade's rear nozzles.
 */
function _drawKineticExhaustFlames(ctx, fighter, hx, hy, r, isBurst = false) {
  const charges = isBurst ? 3 : Math.min(3, fighter.kineticCharges || 0);
  ctx.save();
  ctx.translate(hx - 8, hy);

  const flameColors = ['#F59E0B', '#EF4444', '#DC2626'];
  const burstMultiplier = isBurst ? 1.8 : 1.0;

  for (let i = 0; i < charges; i++) {
    const len = (8 + i * 5 + Math.random() * 4) * burstMultiplier;
    const spread = (i - 1) * 3.5;
    ctx.fillStyle = flameColors[i];
    ctx.beginPath();
    ctx.moveTo(0, spread - 1.8);
    ctx.lineTo(-len, spread);
    ctx.lineTo(0, spread + 1.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Renders bespoke anime visual effects for Maki's combat stances and skills.
 */
export function drawMakiComboSlashVFX(ctx, fighter, r, facingLeft = false) {
  if (!fighter || (fighter.swordSwingTimer <= 0 && !fighter.dragonBoneActive)) return;

  ctx.save();

  // ──────────────────────────────────────────
  // SKILL 1: DRAGON-BONE SKEWER & THROW VFX
  // ──────────────────────────────────────────
  if (fighter.dragonBoneActive) {
    const phase = fighter.dragonBonePhase || 'dash';

    if (phase === 'dash') {
      // High-speed jet needle trails
      _drawNeedleSpeedLine(ctx, -r * 0.8, -6, 0, 42, '#F59E0B');
      _drawNeedleSpeedLine(ctx, -r * 0.8, 6, 0, 36, '#EF4444');
      _drawNeedleSpeedLine(ctx, -r * 1.2, 0, 0, 48, '#FFFFFF');
    } else if (phase === 'throw') {
      const maxT = Math.max(1, fighter.dragonBonePhaseMax || 1);
      const timer = fighter.dragonBonePhaseTimer || 0;
      const progress = Math.min(1.0, timer / maxT);
      if (progress >= 0.25) {
        const chopP = (progress - 0.25) / 0.75;
        const taper = Math.sin(chopP * Math.PI);
        _drawNeedleSpeedLine(ctx, r * 1.5, 4, 0.40, 30 * taper, '#F59E0B');
        _drawNeedleSpeedLine(ctx, r * 1.7, 8, 0.50, 24 * taper, '#FFFFFF');
      }
    } else if (phase === 'groundPin') {
      const maxT = Math.max(1, fighter.dragonBonePhaseMax || 1);
      const timer = fighter.dragonBonePhaseTimer || 0;
      const progress = Math.min(1.0, timer / maxT);
      if (progress < 0.70) {
        const pulse = Math.sin((progress / 0.70) * Math.PI);
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.85 * pulse})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(r * 1.5, 8, 14 * pulse + 4, 6 * pulse + 2, 0.45, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(220, 38, 38, ${0.75 * pulse})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(r * 1.5, 8, 22 * pulse + 6, 9 * pulse + 3, 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const maxT = fighter.swordSwingMax || 24;
  const progress = Math.max(0, Math.min(1.0, 1.0 - fighter.swordSwingTimer / maxT));
  const step = fighter.swordComboStep || 1;

  // ──────────────────────────────────────────
  // STEP 1: THE OVERHEAD STRIKE VFX (FRAME 1)
  // (Heavy vertical downward chop crescent & impact shockwave)
  // ──────────────────────────────────────────
  if (step === 1) {
    if (progress >= 0.20 && progress <= 0.95) {
      const p = (progress - 0.20) / 0.75;
      const swingP = Math.min(1.0, p / 0.42);
      const recP = p > 0.42 ? (p - 0.42) / 0.58 : 0;

      const slashRadius = r * 3.30;
      const startArc = -Math.PI * 0.60;  // High overhead
      const maxArc = Math.PI * 0.28;     // Downward ground strike
      const totalArc = maxArc - startArc;

      const currentStart = startArc + totalArc * Math.pow(recP, 1.4);
      const currentEnd = startArc + totalArc * Math.sin(swingP * Math.PI * 0.5);

      if (Math.abs(currentEnd - currentStart) > 0.05) {
        const taper = Math.pow(Math.sin(p * Math.PI), 1.15) * (1.0 - recP * 0.5);

        // 1. Outer Crimson Soul Glow
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.90)';
        ctx.lineWidth = Math.max(1, 16 * taper);
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 0.1, slashRadius, currentStart, currentEnd, false);
        ctx.stroke();

        // 2. Violet Kinetic Edge
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.95)';
        ctx.lineWidth = Math.max(1, 8 * taper);
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 0.1, slashRadius, currentStart, currentEnd, false);
        ctx.stroke();

        // 3. Incandescent White Razor Core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(1, 3.2 * taper);
        ctx.beginPath();
        ctx.arc(r * 0.35, -r * 0.1, slashRadius, currentStart, currentEnd, false);
        ctx.stroke();

        // 4. Downward needle speed lines
        _drawNeedleSpeedLine(ctx, r * 1.5, -4, 0.25, 28 * taper, '#DC2626');
        _drawNeedleSpeedLine(ctx, r * 1.5, 4, 0.25, 22 * taper, '#FFFFFF');
      }
    }
  }
  // ──────────────────────────────────────────
  // STEP 2: THE UNDERHAND UPPERCUT VFX (FRAME 4)
  // (Bottom-to-Top ascending uppercut crescent & air surface bounce ring)
  // ──────────────────────────────────────────
  else if (step === 2) {
    if (progress >= 0.18 && progress <= 0.95) {
      const p = (progress - 0.18) / 0.77;
      const swingP = Math.min(1.0, p / 0.46);
      const recP = p > 0.46 ? (p - 0.46) / 0.54 : 0;

      const slashRadius = r * 3.10;
      const startArc = Math.PI * 0.30;   // Starts bottom-right
      const maxArc = -Math.PI * 0.60;    // Sweeps UPWARDS to top-left
      const totalArc = maxArc - startArc;

      const currentStart = startArc + totalArc * Math.pow(recP, 1.4);
      const currentEnd = startArc + totalArc * Math.sin(swingP * Math.PI * 0.5);

      if (Math.abs(currentEnd - currentStart) > 0.05) {
        const taper = Math.pow(Math.sin(p * Math.PI), 1.15) * (1.0 - recP * 0.5);

        // 1. Ascending Soul Glow Ribbon (Sweeps upward)
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
        ctx.lineWidth = Math.max(1, 16 * taper);
        ctx.beginPath();
        ctx.arc(r * 0.4, -r * 0.2, slashRadius, currentStart, currentEnd, true);
        ctx.stroke();

        // 2. Solar Crimson Accent Ribbon
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.90)';
        ctx.lineWidth = Math.max(1, 8 * taper);
        ctx.beginPath();
        ctx.arc(r * 0.4, -r * 0.2, slashRadius, currentStart, currentEnd, true);
        ctx.stroke();

        // 3. Pure Razor White Core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(1, 3.0 * taper);
        ctx.beginPath();
        ctx.arc(r * 0.4, -r * 0.2, slashRadius, currentStart, currentEnd, true);
        ctx.stroke();

        // 4. Atmospheric Air Surface Bounce Ring (Under feet)
        if (p >= 0.25 && p <= 0.70) {
          const ringP = (p - 0.25) / 0.45;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * (1.0 - ringP)})`;
          ctx.lineWidth = 1.8 * (1.0 - ringP);
          ctx.beginPath();
          ctx.ellipse(-r * 0.2, r * 0.6, 20 * ringP + 5, 8 * ringP + 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }
  // ──────────────────────────────────────────
  // STEP 3: THE SPINNING SWEEP VFX (FRAME 5)
  // (Full 360° concentric whirlwind blade disc & rotating vortex trails)
  // ──────────────────────────────────────────
  else {
    if (progress >= 0.15 && progress <= 0.95) {
      const p = (progress - 0.15) / 0.80;
      const spinP = Math.min(1.0, p / 0.55);
      const recP = p > 0.55 ? (p - 0.55) / 0.45 : 0;
      const taper = Math.pow(Math.sin(p * Math.PI), 1.1) * (1.0 - recP * 0.5);

      const discRadius = r * 3.20;
      const currentArc = Math.PI * 2 * Math.sin(spinP * Math.PI * 0.5);

      // 1. Concentric Whirlwind Outer Soul Disc
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = Math.max(1, 14 * taper);
      ctx.beginPath();
      ctx.arc(0, 0, discRadius, 0, currentArc);
      ctx.stroke();

      // 2. Fierce Crimson Intermediate Ring
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.90)';
      ctx.lineWidth = Math.max(1, 8 * taper);
      ctx.beginPath();
      ctx.arc(0, 0, discRadius * 0.88, 0, currentArc);
      ctx.stroke();

      // 3. Incandescent White Razor Core Disc
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1, 3.2 * taper);
      ctx.beginPath();
      ctx.arc(0, 0, discRadius * 0.88, 0, currentArc);
      ctx.stroke();

      // 4. Spiral Perimeter Needle Speed Lines
      for (let i = 0; i < 4; i++) {
        const needleAngle = (currentArc - i * (Math.PI * 0.45));
        const nx = Math.cos(needleAngle) * discRadius;
        const ny = Math.sin(needleAngle) * discRadius;
        _drawNeedleSpeedLine(ctx, nx, ny, needleAngle + Math.PI * 0.5, 24 * taper, i % 2 === 0 ? '#F59E0B' : '#FFFFFF');
      }

      // 5. Ground Shockwave Ring on Full Spin Crest
      if (p >= 0.40) {
        const ringP = (p - 0.40) / 0.60;
        ctx.strokeStyle = `rgba(220, 38, 38, ${0.75 * (1.0 - ringP)})`;
        ctx.lineWidth = 2.0 * (1.0 - ringP);
        ctx.beginPath();
        ctx.arc(0, 0, discRadius * (1.0 + ringP * 0.4), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/**
 * Helper to render Rule 16 4-point filled needle speed lines trailing slashes.
 */
function _drawNeedleSpeedLine(ctx, x, y, angle, length, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const halfLen = length * 0.5;
  const thick = 1.8;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-halfLen, 0);       // sharp trailing tip
  ctx.lineTo(0, -thick);         // top mid
  ctx.lineTo(halfLen, 0);        // sharp leading tip
  ctx.lineTo(0, thick);          // bot mid
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Legacy compatibility export for drawMakiSoulSlash.
 */
export function drawMakiSoulSlash(ctx, x, y, angle, radius, progress, color = '#8B5CF6') {
  if (progress <= 0 || progress >= 1.0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const startArc = -Math.PI * 0.45;
  const endArc = Math.PI * 0.45;
  const totalArc = endArc - startArc;

  const currentAngle = startArc + totalArc * progress;
  const maxThick = 12 * Math.sin(progress * Math.PI);

  // Outer Soul Aura
  ctx.beginPath();
  ctx.arc(0, 0, radius, startArc, currentAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = maxThick * 1.4;
  ctx.stroke();

  // Pure Razor White Core
  ctx.beginPath();
  ctx.arc(0, 0, radius, startArc, currentAngle);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = maxThick * 0.6;
  ctx.stroke();

  ctx.restore();
}
