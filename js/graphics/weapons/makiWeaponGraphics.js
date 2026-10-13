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

    // Dynamically derive phase boundaries from Escanor-style configured frame timings
    const liftF = (typeof fighter.swordSwingLiftFrames === 'number')
      ? fighter.swordSwingLiftFrames
      : (step === 3 ? (CONFIG.maki?.hit3LiftFrames || 7) : (step === 2 ? (CONFIG.maki?.hit2LiftFrames || 8) : (CONFIG.maki?.hit1LiftFrames || 8)));
    const holdF = (typeof fighter.swordSwingHoldFrames === 'number')
      ? fighter.swordSwingHoldFrames
      : (step === 3 ? (CONFIG.maki?.hit3HoldFrames || 4) : (step === 2 ? (CONFIG.maki?.hit2HoldFrames || 3) : (CONFIG.maki?.hit1HoldFrames || 3)));
    const strikeF = (typeof fighter.swordSwingStrikeFrames === 'number')
      ? fighter.swordSwingStrikeFrames
      : (step === 3 ? (CONFIG.maki?.hit3StrikeFrames || 22) : (step === 2 ? (CONFIG.maki?.hit2StrikeFrames || 6) : (CONFIG.maki?.hit1StrikeFrames || 5)));
    const pinF = (typeof fighter.swordSwingImpactLockFrames === 'number')
      ? fighter.swordSwingImpactLockFrames
      : ((typeof fighter.swordSwingLockFrames === 'number')
        ? fighter.swordSwingLockFrames
        : ((typeof fighter.swordSwingPinFrames === 'number')
          ? fighter.swordSwingPinFrames
          : (step === 3 ? (CONFIG.maki?.hit3ImpactLockFrames || CONFIG.maki?.hit3PinFrames || 8) : (step === 2 ? (CONFIG.maki?.hit2ImpactLockFrames || CONFIG.maki?.hit2PinFrames || 5) : (CONFIG.maki?.hit1ImpactLockFrames || CONFIG.maki?.hit1PinFrames || 6)))));
    const recF = (typeof fighter.swordSwingRecFrames === 'number')
      ? fighter.swordSwingRecFrames
      : (step === 3 ? (CONFIG.maki?.hit3RecoveryFrames || 14) : (step === 2 ? (CONFIG.maki?.hit2RecoveryFrames || 10) : (CONFIG.maki?.hit1RecoveryFrames || 10)));

    const totalF = Math.max(1, liftF + holdF + strikeF + pinF + recF);
    const coilP = liftF / totalF;
    const holdP = (liftF + holdF) / totalF;
    const strikeP = (liftF + holdF + strikeF) / totalF;
    const pinP = (liftF + holdF + strikeF + pinF) / totalF;

    if (step === 1) {
      // ──────────────────────────────────────────
      // HIT 1: THE OVERHEAD CHOP & GROUND PIN
      // Phase 1 (0 to coilP): Overhead lift coil (-1.55 rad backswing, arms drawn back)
      // Phase 2 (coilP to holdP): Poised overhead apex hold (Escanor lift-hold)
      // Phase 3 (holdP to strikeP): Hypersonic whip strike accelerating into ground slam (+1.10 rad)
      // Phase 4 (strikeP to pinP): MELEE GROUND PIN — Katana stays locked/pinned to the floor!
      // Phase 5 (pinP to 1.0): Dislodges from floor and smoothly recovers into stance
      // ──────────────────────────────────────────
      isTwoHanded = true;
      if (progress < coilP) {
        const wp = progress / Math.max(0.01, coilP);
        const ease = Math.sin(wp * Math.PI * 0.5);
        weaponRot = -1.55 * ease;
        weaponLunge = -10.0 * ease;
        weaponOffY = -8.0 * ease;
        leftX = rightX - 8;
        leftY = rightY - 4;
      } else if (progress < holdP) {
        // Poised overhead hold
        weaponRot = -1.55;
        weaponLunge = -10.0;
        weaponOffY = -8.0;
        leftX = rightX - 8;
        leftY = rightY - 4;
      } else if (progress < strikeP) {
        // Hypersonic whip acceleration into ground slam (+1.10 rad)
        const sp = (progress - holdP) / Math.max(0.01, (strikeP - holdP));
        const whipEase = Math.pow(sp, 2.6);
        weaponRot = -1.55 + 2.65 * whipEase;
        weaponLunge = -10.0 + 34.0 * whipEase;
        weaponOffY = -8.0 + 22.0 * whipEase;
        leftX = rightX - 8;
        leftY = rightY - 4;
      } else if (progress < pinP) {
        // MELEE IMPACT LOCK: Blade stays firmly embedded in the floor at impact angle (zero shaking)
        weaponRot = 1.10;
        weaponLunge = 24.0;
        weaponOffY = 14.0;
      } else {
        // Recovery: Dislodging blade from floor and returning to guard
        const rp = (progress - pinP) / Math.max(0.01, (1.0 - pinP));
        const settleEase = Math.pow(1.0 - rp, 1.8);
        const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
        weaponRot = (1.10 * settleEase) - (0.28 * springWave);
        weaponLunge = (24.0 * settleEase) - (6.0 * springWave);
        weaponOffY = (14.0 * settleEase) - (4.0 * springWave);
        if (rp > 0.40) {
          isTwoHanded = false;
          const returnEase = (rp - 0.40) / 0.60;
          leftX = (rightX - 8) + (-r * 0.82 - (rightX - 8)) * returnEase;
          leftY = (rightY - 4) + (r * 0.38 - (rightY - 4)) * returnEase;
        }
      }
    } else if (step === 2) {
      // ──────────────────────────────────────────
      // HIT 2: THE UNDERHAND UPPERCUT & APEX CLEAVE IMPACT LOCK
      // Phase 1 (0 to coilP): Two-handed underhand scoop anticipation (+1.35 rad down-back coil)
      // Phase 2 (coilP to holdP): Poised two-handed scoop hold
      // Phase 3 (holdP to strikeP): Hypersonic rising whip snap to apex (-1.65 rad)
      // Phase 4 (strikeP to pinP): APEX IMPACT LOCK — Locked firmly at peak vertical cleave (zero shaking)
      // Phase 5 (pinP to 1.0): Recovery & two-handed stance settle
      // ──────────────────────────────────────────
      isTwoHanded = true;
      if (progress < coilP) {
        const wp = progress / Math.max(0.01, coilP);
        const ease = Math.sin(wp * Math.PI * 0.5);
        weaponRot = 1.35 * ease;
        weaponLunge = -9.0 * ease;
        weaponOffY = 12.0 * ease;
      } else if (progress < holdP) {
        // Poised in two-handed low scoop stance
        weaponRot = 1.35;
        weaponLunge = -9.0;
        weaponOffY = 12.0;
      } else if (progress < strikeP) {
        // Hypersonic ascending whip stroke to apex (-1.65 rad)
        const sp = (progress - holdP) / Math.max(0.01, (strikeP - holdP));
        const whipEase = Math.pow(sp, 2.6);
        weaponRot = 1.35 - 3.00 * whipEase;
        weaponLunge = -9.0 + 33.0 * whipEase;
        weaponOffY = 12.0 - 30.0 * whipEase;
      } else if (progress < pinP) {
        // APEX CLEAVE IMPACT LOCK: Clean, firmly locked at apex (zero shaking)
        weaponRot = -1.65;
        weaponLunge = 24.0;
        weaponOffY = -18.0;
      } else {
        const rp = (progress - pinP) / Math.max(0.01, (1.0 - pinP));
        const settleEase = Math.pow(1.0 - rp, 1.8);
        const springWave = Math.sin(rp * Math.PI * 2.2) * Math.exp(-rp * 4.2);
        weaponRot = (-1.65 * settleEase) + (0.35 * springWave);
        weaponLunge = (24.0 * settleEase) - (6.0 * springWave);
        weaponOffY = (-18.0 * settleEase) + (4.0 * springWave);
        if (rp > 0.40) {
          isTwoHanded = false;
          const returnEase = (rp - 0.40) / 0.60;
          leftX = (rightX - 8) + (-r * 0.82 - (rightX - 8)) * returnEase;
          leftY = (rightY - 4) + (r * 0.38 - (rightY - 4)) * returnEase;
        }
      }
    }
    // ──────────────────────────────────────────
    // ──────────────────────────────────────────
    // HIT 3: THE SPINNING SWEEP & SUNDER IMPACT LOCK
    // Phase 1 (0 to coilP): Two-handed anticipation load across chest
    // Phase 2 (coilP to holdP): Poised torque hold at peak potential energy
    // Phase 3 (holdP to strikeP): Hypersonic 360° whirlwind rotation orbiting around body center
    // Phase 4 (strikeP to pinP): SUNDER IMPACT LOCK — Katana firmly locked in follow-through cleave plane
    // Phase 5 (pinP to 1.0): Spring-damped return to guard without unwinding backwards
    // ──────────────────────────────────────────
    else {
      isTwoHanded = true;
      const orbitRx = r * 0.85;
      const orbitRy = r * 0.72;
      const startAng = 0.55;
      const lockAng = 0.55;
      const lockRot = 0.80;
      const lockHx = Math.cos(lockAng) * orbitRx;
      const lockHy = Math.sin(lockAng) * orbitRy;

      if (progress < coilP) {
        // Phase 1: Draw two hands and hilt into coiled anticipation ready stance
        const wp = progress / Math.max(0.01, coilP);
        const ease = Math.sin(wp * Math.PI * 0.5);
        const curHx = rightX + (lockHx - rightX) * ease;
        const curHy = rightY + (lockHy - rightY) * ease;

        weaponOffX = curHx - rightX;
        weaponOffY = curHy - rightY;
        weaponRot = startAng * ease;
        weaponLunge = -6.0 * ease;
      } else if (progress < holdP) {
        // Phase 2: Poised hold at ready tension
        weaponOffX = lockHx - rightX;
        weaponOffY = lockHy - rightY;
        weaponRot = startAng;
        weaponLunge = -6.0;
      } else if (progress < strikeP) {
        // Phase 3: Hypersonic 360° whirlwind whip strike orbiting continuously around body center
        const sp = (progress - holdP) / Math.max(0.01, (strikeP - holdP));
        const whipEase = Math.pow(sp, 1.25);
        const sweepAngle = startAng + (Math.PI * 2) * whipEase;
        const curHx = Math.cos(sweepAngle) * orbitRx;
        const curHy = Math.sin(sweepAngle) * orbitRy;

        weaponOffX = curHx - rightX;
        weaponOffY = curHy - rightY;
        weaponRot = sweepAngle + 0.25;
        weaponLunge = 28.0 * Math.sin(whipEase * Math.PI);
      } else if (progress < pinP) {
        // Phase 4: SUNDER IMPACT LOCK — Locked firmly in front-right cleave plane (zero shaking)
        weaponOffX = lockHx - rightX;
        weaponOffY = lockHy - rightY;
        weaponRot = lockRot;
        weaponLunge = 22.0;
      } else {
        // Phase 5: Spring-damped return from lock angle to neutral guard (NEVER unwinds backwards!)
        const rp = (progress - pinP) / Math.max(0.01, (1.0 - pinP));
        const settleEase = Math.pow(1.0 - rp, 1.8);
        const springWave = Math.sin(rp * Math.PI * 2.0) * Math.exp(-rp * 4.0);

        const lockOffX = lockHx - rightX;
        const lockOffY = lockHy - rightY;
        weaponOffX = (lockOffX * settleEase) + (1.5 * springWave);
        weaponOffY = (lockOffY * settleEase) + (1.5 * springWave);
        weaponRot = (lockRot * settleEase) - (0.22 * springWave);
        weaponLunge = (22.0 * settleEase) - (5.0 * springWave);

        if (rp > 0.40) {
          isTwoHanded = false;
          const returnEase = (rp - 0.40) / 0.60;
          leftX = (rightX + weaponOffX - 8) + (-r * 0.82 - (rightX + weaponOffX - 8)) * returnEase;
          leftY = (rightY + weaponOffY - 4) + (r * 0.38 - (rightY + weaponOffY - 4)) * returnEase;
        }
      }
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

  // Dynamically derive phase boundaries from Escanor-style configured frame timings
  const liftF = (typeof fighter.swordSwingLiftFrames === 'number')
    ? fighter.swordSwingLiftFrames
    : (step === 3 ? (CONFIG.maki?.hit3LiftFrames || 7) : (step === 2 ? (CONFIG.maki?.hit2LiftFrames || 8) : (CONFIG.maki?.hit1LiftFrames || 8)));
  const holdF = (typeof fighter.swordSwingHoldFrames === 'number')
    ? fighter.swordSwingHoldFrames
    : (step === 3 ? (CONFIG.maki?.hit3HoldFrames || 4) : (step === 2 ? (CONFIG.maki?.hit2HoldFrames || 3) : (CONFIG.maki?.hit1HoldFrames || 3)));
  const strikeF = (typeof fighter.swordSwingStrikeFrames === 'number')
    ? fighter.swordSwingStrikeFrames
    : (step === 3 ? (CONFIG.maki?.hit3StrikeFrames || 22) : (step === 2 ? (CONFIG.maki?.hit2StrikeFrames || 6) : (CONFIG.maki?.hit1StrikeFrames || 5)));
  const pinF = (typeof fighter.swordSwingImpactLockFrames === 'number')
    ? fighter.swordSwingImpactLockFrames
    : ((typeof fighter.swordSwingLockFrames === 'number')
      ? fighter.swordSwingLockFrames
      : ((typeof fighter.swordSwingPinFrames === 'number')
        ? fighter.swordSwingPinFrames
        : (step === 3 ? (CONFIG.maki?.hit3ImpactLockFrames || CONFIG.maki?.hit3PinFrames || 8) : (step === 2 ? (CONFIG.maki?.hit2ImpactLockFrames || CONFIG.maki?.hit2PinFrames || 5) : (CONFIG.maki?.hit1ImpactLockFrames || CONFIG.maki?.hit1PinFrames || 6)))));
  const recF = (typeof fighter.swordSwingRecFrames === 'number')
    ? fighter.swordSwingRecFrames
    : (step === 3 ? (CONFIG.maki?.hit3RecoveryFrames || 14) : (step === 2 ? (CONFIG.maki?.hit2RecoveryFrames || 10) : (CONFIG.maki?.hit1RecoveryFrames || 10)));

  const totalF = Math.max(1, liftF + holdF + strikeF + pinF + recF);
  const strikeStartP = (liftF + holdF) / totalF;
  const strikeEndP = (liftF + holdF + strikeF) / totalF;
  const pinEndP = (liftF + holdF + strikeF + pinF) / totalF;

  // ──────────────────────────────────────────
  // STEP 1: THE OVERHEAD STRIKE VFX (FRAME 1)
  // Shinobi-Style Annular Filled Ribbon Mesh with Translucent Soul Wash & Razor White Rim
  // ──────────────────────────────────────────
  if (step === 1) {
    if (progress >= strikeStartP && progress <= 0.98) {
      const p = (progress - strikeStartP) / Math.max(0.01, (1.0 - strikeStartP));
      const activeWindow = Math.max(0.01, (strikeEndP - strikeStartP) / (1.0 - strikeStartP));
      const pinWindow = Math.max(0.01, (pinEndP - strikeStartP) / (1.0 - strikeStartP));
      const swingP = Math.min(1.0, p / activeWindow);
      const recP = p > pinWindow ? (p - pinWindow) / Math.max(0.01, (1.0 - pinWindow)) : 0;

      const outerR = r * 3.50;
      const innerR = r * 1.40;
      const totalArc = CONFIG.maki?.hit1ArcAngle || ((140 * Math.PI) / 180);
      const startArc = -totalArc * 0.58;  // High overhead
      const maxArc = totalArc * 0.42;     // Downward ground strike

      const currentStart = startArc + totalArc * Math.pow(recP, 1.8);
      const currentEnd = startArc + totalArc * Math.pow(swingP, 2.0);

      if (currentEnd - currentStart > 0.04) {
        const taper = Math.pow(Math.sin(p * Math.PI), 1.15) * (1.0 - recP * 0.45);
        const cx = r * 0.38;
        const cy = -r * 0.08;

        ctx.save();
        // 1. Translucent Soul Wash Ribbon (Filled Annular Sector)
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, currentStart, currentEnd, false);
        ctx.arc(cx, cy, innerR, currentEnd, currentStart, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(220, 38, 38, ${0.44 * taper})`;
        ctx.fill();

        // 2. High-Density Inner Violet Kinetic Wash
        ctx.beginPath();
        ctx.arc(cx, cy, outerR * 0.92, currentStart, currentEnd, false);
        ctx.arc(cx, cy, innerR * 1.45, currentEnd, currentStart, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(168, 85, 247, ${0.32 * taper})`;
        ctx.fill();

        // 3. Sub-Razor Outer Crimson Ionization Rim
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.90 * taper})`;
        ctx.lineWidth = Math.max(1, 5.5 * taper);
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, currentStart, currentEnd, false);
        ctx.stroke();

        // 4. Supersonic White Razor Edge Rim
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * taper})`;
        ctx.lineWidth = Math.max(1, 3.2 * taper);
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, currentStart, currentEnd, false);
        ctx.stroke();

        // 5. Leading Kissaki Tip Glint & Diamond Cross
        const tipX = cx + Math.cos(currentEnd) * outerR;
        const tipY = cy + Math.sin(currentEnd) * outerR;
        _drawTipGlint(ctx, tipX, tipY, 4.5 * taper, '#FFFFFF');

        // 6. Trailing Speed Needles (Rule 16)
        _drawNeedleSpeedLine(ctx, cx + Math.cos(currentEnd - 0.28) * (outerR * 0.88), cy + Math.sin(currentEnd - 0.28) * (outerR * 0.88), currentEnd, 28 * taper, '#FFFFFF');
        _drawNeedleSpeedLine(ctx, cx + Math.cos(currentEnd - 0.55) * (outerR * 0.72), cy + Math.sin(currentEnd - 0.55) * (outerR * 0.72), currentEnd, 24 * taper, '#DC2626');

        // 7. Ground Pin Compression Ring & Floor Sparks (When blade pins into ground)
        if (progress >= strikeEndP && progress <= pinEndP) {
          const pinT = (progress - strikeEndP) / Math.max(0.01, (pinEndP - strikeEndP));
          const pinAlpha = (1.0 - pinT);
          const impactX = cx + Math.cos(maxArc) * outerR;
          const impactY = cy + Math.sin(maxArc) * outerR;

          // Concentric Ground Compression Ring (Rule 26 compliant)
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * pinAlpha})`;
          ctx.lineWidth = 2.0 * pinAlpha;
          ctx.beginPath();
          ctx.ellipse(impactX, impactY, 15 * (1 + pinT * 0.4), 7 * (1 + pinT * 0.4), 0, 0, Math.PI * 2);
          ctx.stroke();

          // Floor sparks (discrete dots, Rule 26 compliant)
          ctx.fillStyle = '#F59E0B';
          for (let s = 0; s < 4; s++) {
            const sparkAng = (s * Math.PI * 0.5) + (pinT * 0.4);
            const sparkDist = (7 + s * 3.5) * (1 + pinT * 0.6);
            ctx.fillRect(impactX + Math.cos(sparkAng) * sparkDist - 1, impactY + Math.sin(sparkAng) * sparkDist * 0.5 - 1, 2, 2);
          }
        }
        ctx.restore();
      }
    }
  }
  // ──────────────────────────────────────────
  // STEP 2: THE UNDERHAND UPPERCUT VFX (FRAME 4)
  // Ascending Annular Ribbon Mesh with Solar Crimson Rim & Air Surface Bounce Ring
  // ──────────────────────────────────────────
  else if (step === 2) {
    if (progress >= strikeStartP && progress <= 0.98) {
      const p = (progress - strikeStartP) / Math.max(0.01, (1.0 - strikeStartP));
      const activeWindow = Math.max(0.01, (strikeEndP - strikeStartP) / (1.0 - strikeStartP));
      const pinWindow = Math.max(0.01, (pinEndP - strikeStartP) / (1.0 - strikeStartP));
      const swingP = Math.min(1.0, p / activeWindow);
      const recP = p > pinWindow ? (p - pinWindow) / Math.max(0.01, (1.0 - pinWindow)) : 0;

      const outerR = r * 3.40;
      const innerR = r * 1.35;
      const totalArc = -(CONFIG.maki?.hit2ArcAngle || ((150 * Math.PI) / 180)); // Counter-clockwise sweep
      const startArc = -totalArc * 0.35;   // Low scooping angle
      const endArc = startArc + totalArc; // High ascending apex

      const currentStart = startArc + totalArc * Math.pow(recP, 1.8);
      const currentEnd = startArc + totalArc * Math.pow(swingP, 2.0);

      if (Math.abs(currentEnd - currentStart) > 0.04) {
        const taper = Math.pow(Math.sin(p * Math.PI), 1.15) * (1.0 - recP * 0.45);
        const cx = r * 0.40;
        const cy = -r * 0.12;

        ctx.save();
        // 1. Translucent Violet Soul Wash Ribbon (Filled Annular Sector)
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, currentStart, currentEnd, true);
        ctx.arc(cx, cy, innerR, currentEnd, currentStart, false);
        ctx.closePath();
        ctx.fillStyle = `rgba(168, 85, 247, ${0.46 * taper})`;
        ctx.fill();

        // 2. Solar Crimson Intermediate Wash
        ctx.beginPath();
        ctx.arc(cx, cy, outerR * 0.92, currentStart, currentEnd, true);
        ctx.arc(cx, cy, innerR * 1.45, currentEnd, currentStart, false);
        ctx.closePath();
        ctx.fillStyle = `rgba(239, 68, 68, ${0.30 * taper})`;
        ctx.fill();

        // 3. Sub-Razor Violet Ionization Rim
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.90 * taper})`;
        ctx.lineWidth = Math.max(1, 5.5 * taper);
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, currentStart, currentEnd, true);
        ctx.stroke();

        // 4. Supersonic White Razor Edge Rim
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * taper})`;
        ctx.lineWidth = Math.max(1, 3.2 * taper);
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, currentStart, currentEnd, true);
        ctx.stroke();

        // 5. Leading Kissaki Tip Glint
        const tipX = cx + Math.cos(currentEnd) * outerR;
        const tipY = cy + Math.sin(currentEnd) * outerR;
        _drawTipGlint(ctx, tipX, tipY, 4.5 * taper, '#FFFFFF');

        // 6. Trailing Speed Needles
        _drawNeedleSpeedLine(ctx, cx + Math.cos(currentEnd + 0.28) * (outerR * 0.88), cy + Math.sin(currentEnd + 0.28) * (outerR * 0.88), currentEnd, 28 * taper, '#FFFFFF');
        _drawNeedleSpeedLine(ctx, cx + Math.cos(currentEnd + 0.55) * (outerR * 0.72), cy + Math.sin(currentEnd + 0.55) * (outerR * 0.72), currentEnd, 24 * taper, '#8B5CF6');

        // 7. Atmospheric Air Surface Bounce Ring (Under feet)
        if (p >= 0.20 && p <= 0.75) {
          const ringP = (p - 0.20) / 0.55;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * (1.0 - ringP)})`;
          ctx.lineWidth = 1.8 * (1.0 - ringP);
          ctx.beginPath();
          ctx.ellipse(-r * 0.2, r * 0.6, 20 * ringP + 5, 8 * ringP + 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
  // ──────────────────────────────────────────
  // STEP 3: THE SPINNING SWEEP VFX (FRAME 5)
  // Full 360° Concentric Whirlwind Annular Disc with Amber & Crimson Washes
  // ──────────────────────────────────────────
  else {
    if (progress >= strikeStartP && progress <= 0.98) {
      const p = (progress - strikeStartP) / Math.max(0.01, (1.0 - strikeStartP));
      const activeWindow = Math.max(0.01, (strikeEndP - strikeStartP) / (1.0 - strikeStartP));
      const pinWindow = Math.max(0.01, (pinEndP - strikeStartP) / (1.0 - strikeStartP));
      const spinP = Math.min(1.0, p / activeWindow);
      const recP = p > pinWindow ? (p - pinWindow) / Math.max(0.01, (1.0 - pinWindow)) : 0;
      const taper = Math.pow(Math.sin(p * Math.PI), 1.1) * (1.0 - recP * 0.45);

      const outerR = r * 3.55;
      const innerR = r * 1.35;
      const totalArc = CONFIG.maki?.hit3ArcAngle || (Math.PI * 2);
      const startArc = 0.55 + totalArc * Math.pow(recP, 1.8);
      const endArc = 0.55 + totalArc * Math.pow(spinP, 1.25);

      if (endArc - startArc > 0.05) {
        ctx.save();
        // 1. Concentric Whirlwind Outer Soul Amber Wash
        ctx.beginPath();
        ctx.arc(0, 0, outerR, startArc, endArc, false);
        ctx.arc(0, 0, innerR, endArc, startArc, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(245, 158, 11, ${0.42 * taper})`;
        ctx.fill();

        // 2. Fierce Crimson Intermediate Wash
        ctx.beginPath();
        ctx.arc(0, 0, outerR * 0.92, startArc, endArc, false);
        ctx.arc(0, 0, innerR * 1.45, endArc, startArc, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(220, 38, 38, ${0.32 * taper})`;
        ctx.fill();

        // 3. Sub-Razor Amber Ionization Rim
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.90 * taper})`;
        ctx.lineWidth = Math.max(1, 5.5 * taper);
        ctx.beginPath();
        ctx.arc(0, 0, outerR, startArc, endArc, false);
        ctx.stroke();

        // 4. Incandescent White Razor Core Disc Rim
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * taper})`;
        ctx.lineWidth = Math.max(1, 3.2 * taper);
        ctx.beginPath();
        ctx.arc(0, 0, outerR, startArc, endArc, false);
        ctx.stroke();

        // 5. Leading Kissaki Tip Glint
        const tipX = Math.cos(endArc) * outerR;
        const tipY = Math.sin(endArc) * outerR;
        _drawTipGlint(ctx, tipX, tipY, 5.0 * taper, '#FFFFFF');

        // 6. Spiral Perimeter Needle Speed Lines
        for (let i = 0; i < 4; i++) {
          const needleAngle = (endArc - i * (Math.PI * 0.45));
          const nx = Math.cos(needleAngle) * outerR;
          const ny = Math.sin(needleAngle) * outerR;
          _drawNeedleSpeedLine(ctx, nx, ny, needleAngle + Math.PI * 0.5, 26 * taper, i % 2 === 0 ? '#F59E0B' : '#FFFFFF');
        }

        // 7. Ground Shockwave Ring on Full Spin Crest
        if (p >= 0.35) {
          const ringP = (p - 0.35) / 0.65;
          ctx.strokeStyle = `rgba(220, 38, 38, ${0.75 * (1.0 - ringP)})`;
          ctx.lineWidth = 2.0 * (1.0 - ringP);
          ctx.beginPath();
          ctx.arc(0, 0, outerR * (1.0 + ringP * 0.35), 0, Math.PI * 2);
          ctx.stroke();
        }

        // 8. Ground Sunder Pin Compression & Ember Ring (Rule 26)
        if (progress >= strikeEndP && progress <= pinEndP) {
          const pinT = (progress - strikeEndP) / Math.max(0.01, (pinEndP - strikeEndP));
          const pinAlpha = (1.0 - pinT);
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.80 * pinAlpha})`;
          ctx.lineWidth = 2.2 * pinAlpha;
          ctx.beginPath();
          ctx.arc(0, 0, outerR * (1.0 + pinT * 0.2), 0, Math.PI * 2);
          ctx.stroke();

          // Perimeter sparks (discrete dots, Rule 26 compliant)
          ctx.fillStyle = '#EF4444';
          for (let s = 0; s < 6; s++) {
            const spkAng = (s * Math.PI / 3) + (pinT * 0.5);
            const spkDist = outerR * (1.02 + pinT * 0.15);
            ctx.fillRect(Math.cos(spkAng) * spkDist - 1, Math.sin(spkAng) * spkDist - 1, 2, 2);
          }
        }
        ctx.restore();
      }
    }
  }

  ctx.restore();
}

/**
 * Renders a crisp 4-point diamond cross glint at the kissaki (leading blade tip).
 * Adheres strictly to Rule 11 (Zero shadowBlur) using clean vector polygon geometry.
 */
function _drawTipGlint(ctx, x, y, size, color = '#FFFFFF') {
  if (size <= 0.2) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  // White core circle
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
  ctx.fill();

  // Vertical needle glint
  ctx.beginPath();
  ctx.moveTo(0, -size * 2.2);
  ctx.lineTo(size * 0.45, 0);
  ctx.lineTo(0, size * 2.2);
  ctx.lineTo(-size * 0.45, 0);
  ctx.closePath();
  ctx.fill();

  // Horizontal needle glint
  ctx.beginPath();
  ctx.moveTo(-size * 2.2, 0);
  ctx.lineTo(0, size * 0.45);
  ctx.lineTo(size * 2.2, 0);
  ctx.lineTo(0, -size * 0.45);
  ctx.closePath();
  ctx.fill();
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
