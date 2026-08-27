import { getHandSize, CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawTensaZangetsuKatana, drawBankaiSwordOrbitingAura } from '../weapons/ichigoWeaponGraphics.js';

let _hollowMaskImage = null;
let _hollowMaskImageLoading = false;

function _getHollowMaskImage() {
  if (_hollowMaskImage && _hollowMaskImage.complete && _hollowMaskImage.naturalWidth > 0) {
    return _hollowMaskImage;
  }
  if (!_hollowMaskImageLoading && typeof Image !== 'undefined') {
    _hollowMaskImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _hollowMaskImage = img;
      _hollowMaskImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Hollow Mask image at Assets/references/Hollow Mask.png', e);
      _hollowMaskImageLoading = false;
    };
    img.src = 'Assets/references/Hollow Mask.png';
    _hollowMaskImage = img;
  }
  return _hollowMaskImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getHollowMaskImage();
}

export function drawIchigoSkin(ctx, fighter) {
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const now = Date.now();
  const r = fighter.r;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // ── 1. Spiritual Pressure (Reiatsu) Aura ──
  const isBankai = Boolean(fighter.bankaiActive || fighter.skin === 'bankai' || fighter.skin === 'bankai_mask');
  const isMask = Boolean(
    fighter.hollowMaskActive || 
    fighter.skin === 'bankai_mask' || 
    fighter.skin === 'shikai_mask' ||
    (typeof state !== 'undefined' && state.showHollowMask && (fighter.type === 'ichigo' || fighter.characterId === 'ichigo'))
  );
  const isFrozen = Boolean(
    fighter.isFrozenByInfinity ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isTargetOfAmbush
  );

  const isBackSlungPose = Boolean(
    fighter._isWinnerReveal || 
    (typeof state !== 'undefined' && (
      state.gameState === 'faceoff' ||
      state.gameState === 'weaponIndex' || 
      state.gameState === 'characterSelect' || 
      state.gameState === 'indexDetail' || 
      state._isFaceOffScreenActive ||
      state.isRandomRollShowoff
    )) ||
    fighter.isDemoFighter ||
    fighter._isFaceOff
  );
  const isCountdownOrPreview = isBackSlungPose;

  const isBankaiChanneling = !isFrozen && Boolean(fighter.isChannelingBankai && fighter.bankaiChargeTimer > 0);
  const isBankaiBursting = !isFrozen && Boolean(fighter.bankaiBurstTimer && fighter.bankaiBurstTimer > 0);
  const auraOpacity = isBankai ? 0.85 : (isMask ? 0.65 : 0.25);

  let bankaiProg = 0;
  if (isBankaiChanneling) {
    const maxB = fighter.bankaiChargeMax || CONFIG.ichigo?.bankaiChargeFrames || 50;
    bankaiProg = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.bankaiChargeTimer || 0) / maxB)));
  }

  // ── 1.5. Bankai Channeling Vortex & Skyward Eruption Blast Pillar (World-Aligned: Always from Above/Skyward) ──
  if (isBankaiChanneling) {
    _drawBankaiTransformationVortex(ctx, r, bankaiProg, now, fighter);
  } else if (isBankaiBursting) {
    _drawBankaiEruptionBurst(ctx, r, fighter, now);
  }

  const formationTimer = fighter.hollowMaskFormationTimer !== undefined ? fighter.hollowMaskFormationTimer : 0;
  const formationMax = fighter.hollowMaskFormationMax || CONFIG.ichigo?.hollowMaskFormationFrames || 54;
  const isForming = isMask && formationTimer > 0;
  const formationProg = isForming ? Math.min(1.0, Math.max(0.0, 1.0 - (formationTimer / formationMax))) : 1.0;

  // ── 1.6. Hollow Mask Transformation Skyward Eruption Blast Pillar (White-Black Line Theme) ──
  const isHollowBursting = !isFrozen && isMask && (isForming || (fighter.hollowBurstTimer && fighter.hollowBurstTimer > 0));
  if (isHollowBursting) {
    _drawHollowEruptionBurst(ctx, r, fighter, now, formationProg);
  }

  // ── 1.8. Bankai & Hollow Mask 3D Ribbon Lifecycle Alpha ──
  // Ribbons show up during Bankai or Hollow Mask formation, then smoothly disappear
  // Strictly hidden during Champion Screen / Winner Reveal
  const isChampionScreen = Boolean(fighter._isWinnerReveal || (typeof state !== 'undefined' && state.gameState === 'champion'));
  let ribbonAlpha = 0;
  if (!isFrozen && !isChampionScreen) {
    if (isCountdownOrPreview) {
      if (isForming) {
        // Smoothly fade out ribbon as mask approaches completion (0.65 -> 0.95)
        ribbonAlpha = (formationProg >= 0.65) 
          ? Math.pow(Math.max(0.0, 1.0 - (formationProg - 0.65) / 0.30), 1.5)
          : 1.0;
      } else {
        ribbonAlpha = isBankai ? 1.0 : 0.0;
      }
    } else if (isBankaiChanneling) {
      ribbonAlpha = 0.0; // Strictly hidden during windup gathering phase
    } else if (isBankai) {
      const rMax = fighter.bankaiRibbonMax || 280;
      const rCur = fighter.bankaiRibbonTimer !== undefined ? fighter.bankaiRibbonTimer : (fighter.bankaiActive ? (fighter.bankaiTimer || 0) : 0);
      if (rCur > 0) {
        // Immediately active at full strength (1.0) with ZERO delay on release, then slowly disappears
        ribbonAlpha = Math.pow(Math.min(1.0, Math.max(0.0, rCur / rMax)), 1.15);
      }
    } else if (isForming) {
      // While Hollow Mask is forming, ribbon is active and smoothly fades away as it forms
      ribbonAlpha = (formationProg >= 0.65) 
        ? Math.pow(Math.max(0.0, 1.0 - (formationProg - 0.65) / 0.30), 1.5)
        : 1.0;
    }
  }

  // ── 1.9. Live Spiritual Pressure Aura: Back Layer (Volumetric Plasma Shroud & Floor Pool) ──
  if (!isLowQuality && !isCountdownOrPreview && (isBankai || isMask || (fighter.combatAuraOpacity && fighter.combatAuraOpacity > 0.05)) && !isFrozen && !isBankaiChanneling) {
    _drawBankaiLiveAura(ctx, r, isBankai, isMask, now, 'back');
  }

  ctx.save();
  // ── 2. Facing / Rotation Setup (Local Character Space) ──
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  if (!isLowQuality && ribbonAlpha > 0.01) {
    _drawIchigoFloatingReiatsuAura(ctx, r, isBankai, isMask, isFrozen, now, 'back', ribbonAlpha, isForming, formationProg);
  }

  const isBankaiForm = Boolean(fighter.bankaiActive || fighter.skin === 'bankai' || fighter.skin === 'bankai_mask');
  const isShikai = !isBankaiForm;
  const skinColor = '#FFE0BD';

  const hideHandsAndWeapon = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = hideHandsAndWeapon || fighter.hideFrontHand || isForming;
  const hideBackHand = hideHandsAndWeapon || fighter.hideBackHand;

  const isFrozenEntity = Boolean(
    fighter.isFrozenByInfinity ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isTargetOfAmbush
  );

  const isChanneling = Boolean(fighter.isChannelingGetsuga && fighter.getsugaChargeTimer > 0);
  let chargeProg = 0;
  if (isChanneling) {
    const chargeMax = fighter.getsugaChargeMax || CONFIG.ichigo?.getsugaChargeFrames || 50;
    chargeProg = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.getsugaChargeTimer || 0) / chargeMax)));
  }

  const isSlashing = Boolean(fighter.slashSwingTimer > 0);
  const isBankaiStance = isBackSlungPose && isBankai;
  let rawSlashProg = 0;
  let swingAngle = -0.16;
  let thrustDistance = 0;
  let bodyShiftX = 0;
  let bodyTilt = 0;

  if (isBankaiChanneling) {
    // Bleach Anime Iconic Bankai Channeling Stance:
    // Starts with sword lowered diagonally (+0.55 rad / ~32° down), then smoothly raises and points
    // the blade straight horizontally (0.0 rad) directly at the enemy while extending forward!
    const raiseProg = Math.min(1.0, bankaiProg / 0.48);
    const raiseEase = raiseProg * raiseProg * (3 - 2 * raiseProg); // smooth cubic ease
    const bankaiTremble = Math.sin(now * 0.075) * 0.025 * (0.3 + 0.7 * bankaiProg);

    const startAngle = 0.55; // Lowered diagonal stance (pointing down-right, ~31.5°)
    const targetAngle = 0.0; // Straight horizontal (pointing directly at the enemy)

    swingAngle = startAngle * (1.0 - raiseEase) + targetAngle * raiseEase + bankaiTremble;
    thrustDistance = -2.0 + 9.0 * raiseEase; // Extends forward pointing at the opponent
    bodyShiftX = -1.5 + 4.5 * raiseEase;     // Focus stance lunging forward
    bodyTilt = 0.03 * raiseEase + bankaiTremble * 0.4;
  } else if (isChanneling) {
    // Dynamic 2-Handed Overhead Sword Lift-Up Charging Animation:
    // As chargeProg increases (0 -> 1), sword lifts upward & backward from idle (-0.16 rad) up into the high sky (-2.10 rad / ~ -120°)
    const liftEase = Math.min(1.0, chargeProg * 1.7);
    const smoothLift = liftEase * liftEase * (3 - 2 * liftEase);
    const chargeTremble = Math.sin(Date.now() * 0.045) * 0.04 * (0.3 + 0.7 * chargeProg);

    swingAngle = -0.16 + (-2.10 - (-0.16)) * smoothLift + chargeTremble;
    thrustDistance = -4 - 6 * smoothLift; // Pulls back close to shoulder/head
    bodyShiftX = -1.5 - 3.0 * smoothLift; // Body coils back into power stance
    bodyTilt = -0.04 - 0.08 * smoothLift + chargeTremble * 0.5;
  } else if (isSlashing) {
    const maxT = fighter.slashSwingMaxTimer || 22;
    rawSlashProg = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT)));

    if (fighter.isGetsugaSlash) {
      // Powerful instantaneous downward vertical cleave starting directly from the high lifted sword overhead pose (-2.10 rad) down to (+1.35 rad)
      const slashPhase = 0.20; // Snappy, instantaneous down-chop (~4-5 frames)
      if (rawSlashProg < slashPhase) {
        const p = rawSlashProg / slashPhase;
        const sweepCurve = p * p * (3 - 2 * p); // smooth cubic down-chop
        swingAngle = -2.10 + (1.35 - (-2.10)) * sweepCurve;
        thrustDistance = -10 + 26 * Math.sin(p * Math.PI * 0.5); // -10px to +16px
        bodyShiftX = -4.5 + 9.5 * Math.sin(p * Math.PI * 0.5); // lunges forward -4.5px to +5.0px
        bodyTilt = -0.12 + 0.20 * Math.sin(p * Math.PI * 0.5);
      } else {
        // Recovery phase: +1.35 rad eases smoothly back to idle -0.16 rad
        const p = (rawSlashProg - slashPhase) / (1.0 - slashPhase);
        const easeP = 0.5 + 0.5 * Math.cos(p * Math.PI);
        swingAngle = -0.16 + (1.35 - (-0.16)) * easeP;
        thrustDistance = 16 * easeP;
        bodyShiftX = 5.0 * easeP;
        bodyTilt = 0.08 * easeP;
      }
    } else {
      // Standard basic attack / Shunpo slash
      if (rawSlashProg < 0.10) {
        // Phase 1: Rapid Windup snap (idle -> -1.35 rad / ~ -77°) with anticipation recoil
        const p = rawSlashProg / 0.10;
        const easeP = p * (2 - p);
        swingAngle = -0.16 + (-1.35 - (-0.16)) * easeP;
        thrustDistance = -8 * easeP;
        bodyShiftX = -2.5 * easeP;
        bodyTilt = -0.05 * easeP;
      } else if (rawSlashProg < 0.55) {
        // Phase 2: Downward cutting sweep (-1.35 rad -> +1.20 rad / ~ +69°) with kinetic power lunge
        const p = (rawSlashProg - 0.10) / 0.45;
        const sweepCurve = p * p * (3 - 2 * p); // smooth cubic ease
        swingAngle = -1.35 + (1.20 - (-1.35)) * sweepCurve;
        thrustDistance = -8 + 22 * Math.sin(p * Math.PI * 0.5); // seamless -8px to +14px
        bodyShiftX = -2.5 + 6.5 * Math.sin(p * Math.PI * 0.5); // surges forward from -2.5px to +4.0px
        bodyTilt = -0.05 + 0.10 * Math.sin(p * Math.PI * 0.5);
      } else {
        // Phase 3: Fluid Cosine Recovery (+1.20 rad -> idle -0.16 rad)
        const p = (rawSlashProg - 0.55) / 0.45;
        const easeP = 0.5 + 0.5 * Math.cos(p * Math.PI); // 1 -> 0
        swingAngle = -0.16 + (1.20 - (-0.16)) * easeP;
        thrustDistance = 14 * easeP; // seamlessly eases +14px back to 0px
        bodyShiftX = 4.0 * easeP;
      }
    }
  } else if (isBankaiStance) {
    // ── Bankai / Bankai + Hollow Mask Champion Stance (matches reference: hand on lower-left rim, blade extending low down-left) ──
    swingAngle = 2.65;
    thrustDistance = 0;
    bodyShiftX = 0;
    bodyTilt = 0;
  } else if (isBackSlungPose) {
    // Shikai Champion Screen / FaceOff / Preview back-slung pose: handle behind head, blade sweeping down-right
    swingAngle = facingLeft ? (Math.PI - Math.PI / 4.2) : (Math.PI / 4.2);
    thrustDistance = 0;
  } else if ((fighter.blockPoseTimer && fighter.blockPoseTimer > 0) || (fighter.parryHitAnimTimer && fighter.parryHitAnimTimer > 0)) {
    // ── Dynamic Zanjutsu Parry & Deflection Angles (4 Distinct Blade Postures) ──
    const pStance = fighter.parryStanceIndex || 0;
    // Stance 0: High Angled Slash Guard (~ -65° / -1.15 rad)
    // Stance 1: Low Reverse Guard Deflection (~ +75° / +1.30 rad)
    // Stance 2: Vertical Center Blade Guard (~ +90° / +1.57 rad)
    // Stance 3: 45° Cross Deflection Parry (~ -45° / -0.78 rad)
    let parryAngle = -1.15;
    if (pStance === 1) parryAngle = 1.30;
    else if (pStance === 2) parryAngle = 1.57;
    else if (pStance === 3) parryAngle = -0.78;

    if (fighter.parryHitAnimTimer && fighter.parryHitAnimTimer > 0) {
      const pProg = fighter.parryHitAnimTimer / 18;
      const jitter = Math.sin(pProg * Math.PI * 4) * 0.12 * pProg;
      swingAngle = parryAngle + jitter;
      thrustDistance = -6 * pProg;
      bodyShiftX = -3 * pProg;
      bodyTilt = -0.06 * pProg;
    } else {
      swingAngle = parryAngle;
      thrustDistance = -3;
      bodyShiftX = -1.5;
      bodyTilt = -0.03;
    }
  } else {
    // Active combat pose: pointing sword forward at the enemy target
    swingAngle = -0.16;
    thrustDistance = 0;
  }

  const renderZangetsu = () => {
    const hideWeapon = fighter.hideWeapon || (typeof state !== 'undefined' && state.showSkinOnly);
    if (hideWeapon) return;

    // Sword rotation and extension based on slash state vs countdown stance vs combat stance
    ctx.save();
    ctx.translate(thrustDistance + bodyShiftX, 0);
    ctx.rotate(swingAngle + bodyTilt);
    if (isBankaiStance) {
      ctx.scale(1, -1); // Orients razor cutting edge facing forward/outward and 3 fins on inner spine
    }

    if (isShikai) {
      // ── Shikai Zangetsu (Accurate Silver Blade + Black Spine + Trailing Ribbons) ──
      const swordStartX = (isSlashing || !isBackSlungPose) ? (r * 0.68) : (-r * 0.72);

      ctx.save();
      ctx.translate(swordStartX, 0);
      ctx.scale(0.90, 0.90);

      const handleLen = 32;
      const handleThick = 6.0;
      const hiltX = -handleLen;

      // 1. Draw Trailing White Cloth Ribbons from the Pommel (Dynamic 2-Pass White Cloth Ribbons)
      if (fighter.ribbonStrands && fighter.ribbonStrands.length === 3) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const pommel = getZangetsuPommelWorldPos(fighter);
        const swordAngle = (fighter.gunAngle || 0) + swingAngle + bodyTilt;
        const spd = Math.hypot(fighter.vx || 0, fighter.vy || 0);
        let perpX = (spd > 0.3) ? -(fighter.vy || 0) / spd : -Math.sin(swordAngle);
        let perpY = (spd > 0.3) ? (fighter.vx || 0) / spd : Math.cos(swordAngle);

        // Always guarantee the ribbon root is perfectly anchored to the sword pommel
        for (let s = 0; s < 3; s++) {
          const cfg = _ZANGETSU_STRAND_CONFIGS[s];
          const strand = fighter.ribbonStrands[s];
          if (!strand || strand.length < 2) continue;

          const rootX = pommel.x + perpX * cfg.rootOffset;
          const rootY = pommel.y + perpY * cfg.rootOffset;
          const dx = rootX - strand[0].x;
          const dy = rootY - strand[0].y;
          if (dx !== 0 || dy !== 0) {
            strand[0].x = rootX;
            strand[0].y = rootY;
            if (isFrozenEntity) {
              for (let i = 1; i < strand.length; i++) {
                strand[i].x += dx;
                strand[i].y += dy;
                if (strand[i].prevX !== undefined) strand[i].prevX += dx;
                if (strand[i].prevY !== undefined) strand[i].prevY += dy;
              }
            }
          }
        }

        // Draw in back-to-front order: Strand 2 (shortest/back), Strand 1 (medium), Strand 0 (longest/main)
        const drawOrder = [2, 1, 0];

        for (let idx = 0; idx < 3; idx++) {
          const s = drawOrder[idx];
          const cfg = _ZANGETSU_STRAND_CONFIGS[s];
          const strand = fighter.ribbonStrands[s];
          if (!strand || strand.length < 2) continue;

          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Pass 1: Crisp Dark Outer Border (creates depth separation when ribbons cross)
          ctx.beginPath();
          ctx.moveTo(strand[0].x, strand[0].y);
          for (let i = 1; i < strand.length - 1; i++) {
            const xc = (strand[i].x + strand[i + 1].x) / 2;
            const yc = (strand[i].y + strand[i + 1].y) / 2;
            ctx.quadraticCurveTo(strand[i].x, strand[i].y, xc, yc);
          }
          ctx.lineTo(strand[strand.length - 1].x, strand[strand.length - 1].y);
          ctx.strokeStyle = '#111111';
          ctx.lineWidth = cfg.width + 1.8;
          ctx.stroke();

          // Pass 2: White Cloth Ribbon Core with individual strand color tone
          ctx.beginPath();
          ctx.moveTo(strand[0].x, strand[0].y);
          for (let i = 1; i < strand.length - 1; i++) {
            const xc = (strand[i].x + strand[i + 1].x) / 2;
            const yc = (strand[i].y + strand[i + 1].y) / 2;
            ctx.quadraticCurveTo(strand[i].x, strand[i].y, xc, yc);
          }
          ctx.lineTo(strand[strand.length - 1].x, strand[strand.length - 1].y);
          ctx.strokeStyle = cfg.color;
          ctx.lineWidth = cfg.width;
          ctx.stroke();
        }

        // Fabric Pommel Wrap Knot in World Space
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(pommel.x, pommel.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      } else {
        // Fallback: Static 3 Bezier Ribbons for UI preview cards
        ctx.save();

        // Ribbon Strand 3 (Deepest downward loop, weaving behind)
        ctx.fillStyle = '#EAEAEA';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(hiltX - 1, 1);
        ctx.bezierCurveTo(hiltX - 10, 8, hiltX - 12, 20, hiltX - 2, 23);
        ctx.bezierCurveTo(hiltX + 8, 25, hiltX + 18, 18, hiltX + 32, 17);
        ctx.lineTo(hiltX + 30, 14);
        ctx.bezierCurveTo(hiltX + 18, 16, hiltX + 8, 22, hiltX - 2, 20);
        ctx.bezierCurveTo(hiltX - 8, 18, hiltX - 6, 8, hiltX - 1, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ribbon Strand 2 (Middle strand crossing under Strand 1)
        ctx.fillStyle = '#F5F5F5';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(hiltX - 1, 1);
        ctx.bezierCurveTo(hiltX - 6, 5, hiltX - 6, 15, hiltX + 2, 17);
        ctx.bezierCurveTo(hiltX + 12, 19, hiltX + 23, 14, hiltX + 38, 19);
        ctx.lineTo(hiltX + 36, 16);
        ctx.bezierCurveTo(hiltX + 23, 11, hiltX + 12, 16, hiltX + 2, 14);
        ctx.bezierCurveTo(hiltX - 4, 12, hiltX - 4, 4, hiltX, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ribbon Strand 1 (Front strand crossing over middle and waving to top tail)
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(hiltX - 1, 1);
        ctx.bezierCurveTo(hiltX - 8, 7, hiltX - 9, 18, hiltX - 1, 20);
        ctx.bezierCurveTo(hiltX + 8, 22, hiltX + 18, 10, hiltX + 32, 11);
        ctx.bezierCurveTo(hiltX + 38, 12, hiltX + 42, 13, hiltX + 45, 11);
        ctx.lineTo(hiltX + 43, 8);
        ctx.bezierCurveTo(hiltX + 40, 10, hiltX + 36, 9, hiltX + 30, 8);
        ctx.bezierCurveTo(hiltX + 18, 7, hiltX + 8, 18, hiltX - 1, 17);
        ctx.bezierCurveTo(hiltX - 6, 16, hiltX - 5, 6, hiltX, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fabric Pommel Wrap Knot
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(hiltX - 1.5, 0, 2.5, 3.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      // 2. Draw Handle (white wrapped directly around hilt, NO handguard/collar!)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(hiltX, -handleThick / 2, handleLen, handleThick);

      ctx.strokeStyle = '#D8D8D8';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let px = hiltX + 3; px < 0; px += 4) {
        ctx.moveTo(px, -handleThick / 2);
        ctx.lineTo(px + 2, handleThick / 2);
        ctx.moveTo(px + 2, -handleThick / 2);
        ctx.lineTo(px, handleThick / 2);
      }
      ctx.stroke();

      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(hiltX, -handleThick / 2, handleLen, handleThick);

      // 3. Blade Geometry
      const tipX = 120, tipY = -10;
      const cutoutR = 5.5;
      const cutoutCenterX = cutoutR, cutoutCenterY = 3.0;
      const heelX = cutoutR * 2, heelY = 18;

      // A) Black Back Spine Region
      ctx.fillStyle = '#1A1A1A';
      ctx.beginPath();
      ctx.moveTo(0, -3.0);
      ctx.lineTo(tipX, tipY);
      ctx.quadraticCurveTo(60, -2, heelX, cutoutCenterY);
      ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
      ctx.lineTo(0, 5.0);
      ctx.lineTo(0, -3.0);
      ctx.closePath();
      ctx.fill();

      // B) Silver Steel Blade Body
      ctx.fillStyle = '#F5F5F5';
      ctx.beginPath();
      ctx.moveTo(heelX, heelY);
      ctx.quadraticCurveTo(65, 15, tipX, tipY);
      ctx.quadraticCurveTo(60, -2, heelX, cutoutCenterY);
      ctx.lineTo(heelX, heelY);
      ctx.closePath();
      ctx.fill();

      // C) Outer Outline
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -3.0);
      ctx.lineTo(tipX, tipY);
      ctx.quadraticCurveTo(65, 15, heelX, heelY);
      ctx.lineTo(heelX, cutoutCenterY);
      ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
      ctx.lineTo(0, 5.0);
      ctx.lineTo(0, -3.0);
      ctx.closePath();
      ctx.stroke();

      // D) Hands gripping Shikai handle during active combat or champion screen
      if (!hideHandsAndWeapon) {
        if (!isBackSlungPose) {
          // Back hand (for 2-handed grip on heavy chop or charging stance)
          if ((isChanneling || isBankaiChanneling || (isSlashing && rawSlashProg >= 0.08 && rawSlashProg <= 0.65)) && !hideBackHand) {
            _drawIchigoHand(ctx, hiltX + 7, 0, skinColor, true);
          }
          // Front hand (main grip near guard)
          if (!hideFrontHand) {
            _drawIchigoHand(ctx, hiltX + 18, 0, skinColor, true);
          }
        } else if (isChampionScreen && !hideFrontHand) {
          // Front hand resting on lower-left of body circle during champion screen
          _drawIchigoHand(ctx, -r * 0.55, r * 0.45, skinColor, true);
        }
      }

      // E) Getsuga Tensho / Bankai Gathering Reiatsu Charging Aura
      if (isChanneling) {
        _drawGetsugaChargingAura(ctx, {
          isShikai: true,
          isBankai: false,
          isMask: isMask,
          chargeProg: chargeProg,
          fighter: fighter,
          tipX: tipX,
          tipY: tipY,
          heelX: heelX,
          heelY: heelY,
          cutoutCenterX: cutoutCenterX,
          cutoutCenterY: cutoutCenterY,
          cutoutR: cutoutR
        });
      } else if (isBankaiChanneling) {
        _drawBankaiChargingAura(ctx, tipX, tipY, heelX, heelY, cutoutCenterX, cutoutCenterY, cutoutR, bankaiProg);
      }

      ctx.restore();
    } else {
      // ── Tensa Zangetsu (Bankai daito) ──
      const swordLen = 94;
      const swordStartX = isBankaiStance ? (r * 0.82 + 16) : ((isSlashing || !isBackSlungPose) ? (r * 0.65) : (-r * 0.65));

      // Render dynamic physics-based Kusari chain in world coordinates during combat
      if (fighter.bankaiChainNodes && fighter.bankaiChainNodes.length >= 2 && !isBackSlungPose) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        _drawDynamicBankaiChain(ctx, fighter.bankaiChainNodes, isMask);
        ctx.restore();
      }

      // Render authentic enlarged Tensa Zangetsu katana (fins, 卍 tsuba, red diamonds)
      drawTensaZangetsuKatana(ctx, swordStartX, isMask, { 
        bladeLen: swordLen,
        skipChain: Boolean(fighter.bankaiChainNodes && !isBackSlungPose),
        isBankaiStance: isBankaiStance,
        isChampionScreen: isChampionScreen
      });

      // Live Kuroi Reiatsu aura emitting along the Bankai sword (during active combat only — strictly hidden during champion screen)
      if ((!isBackSlungPose || isBankaiStance) && !hideHandsAndWeapon && !isLowQuality && !isChampionScreen) {
        drawBankaiSwordOrbitingAura(ctx, swordStartX, swordLen, isMask, isFrozen);
      }

      // Hands gripping Bankai hilt during active combat or Bankai victory stance
      if ((!isBackSlungPose || isBankaiStance) && !hideHandsAndWeapon) {
        // Back hand (during 2-handed power chop or charging stance)
        if ((isChanneling || isBankaiChanneling || (isSlashing && rawSlashProg >= 0.08 && rawSlashProg <= 0.65)) && !hideBackHand) {
          _drawIchigoHand(ctx, swordStartX - 22, 0, skinColor, false);
        }
        // Front hand (main grip on the hilt/holder part behind guard, positioned cleanly on the handle)
        if (!hideFrontHand) {
          const frontHandOffsetX = isBankaiStance ? -16 : -10;
          const frontHandOffsetY = 0;
          _drawIchigoHand(ctx, swordStartX + frontHandOffsetX, frontHandOffsetY, skinColor, false);
        }
      }

      // Getsuga Tensho / Bankai Gathering Reiatsu Charging Aura
      if (isChanneling) {
        _drawGetsugaChargingAura(ctx, {
          isShikai: false,
          isBankai: true,
          isMask: isMask,
          chargeProg: chargeProg,
          fighter: fighter,
          swordStartX: swordStartX,
          swordLen: swordLen
        });
      } else if (isBankaiChanneling) {
        _drawBankaiChargingAura(ctx, swordStartX + swordLen, 0, swordStartX, 0, 0, 0, 0, bankaiProg);
      }
    }

    ctx.restore(); // end sword translate/rotate
  };

  // Render sword BEHIND body during champion screen / preview stance (except Bankai stance which renders in front)
  if (isBackSlungPose && !isBankaiStance) {
    renderZangetsu();
  }

  // ── 4. Main Body Circle Clip ──
  ctx.save();
  if (bodyShiftX !== 0 || bodyTilt !== 0) {
    ctx.translate(bodyShiftX, 0);
    ctx.rotate(bodyTilt);
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // ── Base Bankai & Hollow Mask Aesthetics ──
  // Peach skin base
  ctx.fillStyle = '#FFE0BD';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Orange hair (Standard spiky)
  ctx.fillStyle = '#FF7F00';
  ctx.beginPath();
  ctx.moveTo(-r, -r);
  ctx.lineTo(r, -r);
  // Draw spiky non-uniform crown fringe from right to left:
  ctx.lineTo(r, -r * 0.35);
  ctx.lineTo(r * 0.85, -r * 0.45);
  ctx.lineTo(r * 0.88, -r * 0.35);    // Spike 1 (leans right/outward)
  ctx.lineTo(r * 0.72, -r * 0.48);
  ctx.lineTo(r * 0.62, -r * 0.28);   // Spike 2 (leans right/outward)
  ctx.lineTo(r * 0.5, -r * 0.42);
  ctx.lineTo(r * 0.45, -r * 0.46);
  ctx.lineTo(r * 0.4, -r * 0.35);    // Spike 3 (leans left/inward)
  ctx.lineTo(r * 0.35, -r * 0.48);
  ctx.lineTo(r * 0.2, -r * 0.25);   // Spike 4 (leans left/inward)
  ctx.lineTo(r * 0.15, -r * 0.42);
  ctx.lineTo(r * 0.05, -r * 0.32);   // Spike 5 (center, vertical)
  ctx.lineTo(-r * 0.05, -r * 0.45);
  ctx.lineTo(-r * 0.12, -r * 0.25);  // Spike 6 (leans right/inward)
  ctx.lineTo(-r * 0.25, -r * 0.42);
  ctx.lineTo(-r * 0.32, -r * 0.35); // Spike 7 (leans right/inward)
  ctx.lineTo(-r * 0.45, -r * 0.45);
  ctx.lineTo(-r * 0.52, -r * 0.28);   // Spike 8 (leans right/inward)
  ctx.lineTo(-r * 0.7, -r * 0.42);
  ctx.lineTo(-r * 0.78, -r * 0.35); // Spike 9 (leans right/inward)
  ctx.lineTo(-r, -r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.8;
    if (isShikai) {
      // ── Standard Shikai robes: black robes covering from y = 0.1 ──
      ctx.fillStyle = '#111111';
      ctx.fillRect(-r, r * 0.1, r * 2, r * 0.95);

      // White collar inner lining (forming a V-neck)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, r * 0.1);
      ctx.lineTo(0, r * 0.42);
      ctx.lineTo(r * 0.25, r * 0.1);
      ctx.closePath();
      ctx.fill();

      // Wrap collar fold outlines (black robe wrap lines)
      const strapSign = facingLeft ? -1 : 1;
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25 * strapSign, r * 0.1);
      ctx.lineTo(0, r * 0.42);
      ctx.moveTo(r * 0.25 * strapSign, r * 0.1);
      ctx.lineTo(-r * 0.12 * strapSign, r * 0.49);
      ctx.stroke();

      // Diagonal Red Ribbon/Chain Strap (for holding Zangetsu on his back)
      // Invert local X when facingLeft so strap always canonically slants Top-Left to Bottom-Right in screen space!
      const strapStartX = -r * 0.35 * strapSign;
      const strapEndX = r * 0.25 * strapSign;

      ctx.save();
      // 1. Dark red shadow backing line
      ctx.strokeStyle = '#700c0f';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(strapStartX, r * 0.1);
      ctx.lineTo(strapEndX, r * 0.55);
      ctx.stroke();

      // 2. Red core line
      ctx.strokeStyle = '#E31B23';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(strapStartX, r * 0.1);
      ctx.lineTo(strapEndX, r * 0.55);
      ctx.stroke();

      // 3. Small red beads along the strap
      ctx.fillStyle = '#FF4D52';
      for (let t = 0.05; t <= 0.95; t += 0.16) {
        const px = strapStartX * (1 - t) + strapEndX * t;
        const py = r * 0.1 * (1 - t) + (r * 0.55) * t;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3a0002';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();

      // Flat white obi sash wrapped around waist
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-r * 0.75, r * 0.55, r * 1.5, r * 0.15);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(-r * 0.75, r * 0.55, r * 1.5, r * 0.15);

      // Central sash tie knot
      ctx.fillStyle = '#EBEBEB';
      ctx.beginPath();
      ctx.roundRect(-r * 0.08, r * 0.53, r * 0.16, r * 0.18, 3);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Hanging sash ribbons (tied tails hanging down)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      // Left ribbon tail
      ctx.moveTo(-r * 0.06, r * 0.68);
      ctx.lineTo(-r * 0.18, r * 0.95);
      ctx.lineTo(-r * 0.02, r * 0.95);
      ctx.lineTo(0, r * 0.68);
      ctx.closePath();
      // Right ribbon tail
      ctx.moveTo(0, r * 0.68);
      ctx.lineTo(r * 0.02, r * 0.95);
      ctx.lineTo(r * 0.18, r * 0.95);
      ctx.lineTo(r * 0.06, r * 0.68);
      ctx.closePath();
      ctx.fill();

      // Outlines for hanging ribbons
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      // Left tail outline
      ctx.moveTo(-r * 0.06, r * 0.68);
      ctx.lineTo(-r * 0.18, r * 0.95);
      ctx.lineTo(-r * 0.02, r * 0.95);
      ctx.lineTo(0, r * 0.68);
      // Right tail outline
      ctx.moveTo(0, r * 0.68);
      ctx.lineTo(r * 0.02, r * 0.95);
      ctx.lineTo(r * 0.18, r * 0.95);
      ctx.lineTo(r * 0.06, r * 0.68);
      ctx.stroke();
    } else {
      // ── Current Bankai robes with deep V-neck and split obi coat ──
      // Shihakusho (Black robe chest area)
      ctx.fillStyle = '#111111';
      ctx.fillRect(-r, r * 0.1, r * 2, r * 0.95);

      // Peach skin insert for the chest exposure inside the V-neck
      ctx.fillStyle = '#FFE0BD';
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.1);
      ctx.lineTo(0, r * 0.45);
      ctx.lineTo(r * 0.35, r * 0.1);
      ctx.closePath();
      ctx.fill();

      // White collar border trim
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.32, r * 0.1);
      ctx.lineTo(0, r * 0.42);
      ctx.lineTo(r * 0.32, r * 0.1);
      ctx.stroke();

      // Thin black outlines to frame the white collar border cleanly
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      
      // Outer black line against black robes
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.1);
      ctx.lineTo(0, r * 0.45);
      ctx.lineTo(r * 0.35, r * 0.1);
      ctx.stroke();

      // Inner black line against chest skin
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, r * 0.1);
      ctx.lineTo(0, r * 0.39);
      ctx.lineTo(r * 0.28, r * 0.1);
      ctx.stroke();

      // ── Shihakusho Coat Split & White Obi Belt ──
      // 1. White sash/belt base inside the inverted V split
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, r * 0.65);
      ctx.lineTo(-r * 0.28, r);
      ctx.lineTo(r * 0.28, r);
      ctx.closePath();
      ctx.fill();

      // 2. Grey details for obi belt fabric layers
      ctx.strokeStyle = '#D5D5D5';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, r * 0.78);
      ctx.lineTo(r * 0.12, r * 0.78);
      ctx.moveTo(-r * 0.18, r * 0.88);
      ctx.lineTo(r * 0.18, r * 0.88);
      ctx.stroke();

      // 3. Central black sash tie knot detail
      ctx.fillStyle = '#111111';
      ctx.fillRect(-r * 0.04, r * 0.72, r * 0.08, r * 0.28);

      // 4. White outer border lines for the split coat edges
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, r);
      ctx.lineTo(0, r * 0.65);
      ctx.lineTo(r * 0.28, r);
      ctx.stroke();

      // 5. Thin black outline to separate white split edges from black robes cleanly
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, r);
      ctx.lineTo(0, r * 0.65);
      ctx.lineTo(r * 0.28, r);
      ctx.stroke();
    }

    // ── Hollow Mask Overlay (Assets/references/Hollow Mask.png) ──
    // Fully occupies face and hair region across the body circle
    if (isMask && !isForming) {
      let maskCrackProgress = 0;
      if (!isChampionScreen && fighter.hollowMaskActive && fighter.hollowMaskTimer !== undefined) {
        const crackWindow = 180; // starts cracking in last 3 seconds (180 frames)
        if (fighter.hollowMaskTimer < crackWindow) {
          maskCrackProgress = Math.min(1.0, Math.max(0.0, (crackWindow - fighter.hollowMaskTimer) / crackWindow));
        }
      }

      const maskImg = _getHollowMaskImage();
      const destW = r * 2.15;
      const destH = r * 2.50;
      const destX = -destW / 2;
      const destY = -r * 1.08;

      if (maskImg && maskImg.complete && maskImg.naturalWidth > 0) {
        // Fully assembled Hollow Mask PNG
        ctx.save();
        ctx.drawImage(maskImg, 266, 143, 492, 747, destX, destY, destW, destH);
        ctx.restore();
      } else {
        ctx.fillStyle = "#FFFFFF"; // White mask base covering upper face
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.95, -Math.PI * 0.05, false);
        ctx.lineTo(0, r * 0.5);
        ctx.closePath();
        ctx.fill();

        // Red/Black jagged mask lines
        ctx.strokeStyle = "#B00000";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, -r * 0.4);
        ctx.lineTo(-r * 0.1, -r * 0.1);
        ctx.moveTo(-r * 0.6, -r * 0.2);
        ctx.lineTo(-r * 0.2, 0);
        ctx.moveTo(-r * 0.5, 0.1);
        ctx.lineTo(-r * 0.1, r * 0.3);
        ctx.stroke();

        // Hollow yellow eye iris details
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.1, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111111";
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.1, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spreading fracture fissures and breaking pieces when duration is expiring (strictly hidden during champion screen)
      if (maskCrackProgress > 0.01 && !isChampionScreen) {
        _drawHollowMaskCracks(ctx, r, maskCrackProgress, now, fighter);
      }
    }
  ctx.restore(); // end main body circle clip

  // ── 5. Outer Body Stroke & Bankai Channeling Body Edge Glow ──
  ctx.save();
  if (bodyShiftX !== 0 || bodyTilt !== 0) {
    ctx.translate(bodyShiftX, 0);
    ctx.rotate(bodyTilt);
  }

  if (isBankaiChanneling) {
    _drawBankaiBodyEdgeGlow(ctx, r, bankaiProg, now);
  }

  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ── 5.5. Hollow Mask Formation Animation (UNCLIPPED over character body) ──
  if (isMask && isForming) {
    ctx.save();
    if (bodyShiftX !== 0 || bodyTilt !== 0) {
      ctx.translate(bodyShiftX, 0);
      ctx.rotate(bodyTilt);
    }
    const maskImg = _getHollowMaskImage();
    const destW = r * 2.15;
    const destH = r * 2.50;
    const destX = -destW / 2;
    const destY = -r * 1.08;
    _drawHollowMaskFormation(ctx, r, formationProg, now, fighter, maskImg, destX, destY, destW, destH);
    ctx.restore();
  }

  // Render sword ON TOP of body circle during active fight or Bankai champion stance
  if (!isBackSlungPose || isBankaiStance) {
    renderZangetsu();
  }

  // ── 6. Foreground Floating Reiatsu Flame Aura (Wafting in front of robes, chest, and face) ──
  if (!isLowQuality && ribbonAlpha > 0.01) {
    _drawIchigoFloatingReiatsuAura(ctx, r, isBankai, isMask, isFrozen, now, 'front', ribbonAlpha, isForming, formationProg);
  }

  ctx.restore(); // end local body rotation

  // ── 6.5. Live Spiritual Pressure Aura: Front Layer (Spirit Heart Core & Micro-Lightning Discharges) ──
  if (!isLowQuality && !isCountdownOrPreview && (isBankai || isMask || (fighter.combatAuraOpacity && fighter.combatAuraOpacity > 0.05)) && !isFrozen && !isBankaiChanneling) {
    _drawBankaiLiveAura(ctx, r, isBankai, isMask, now, 'front');
  }

  // ── 7. Status Overlays (Paralyze, Stun, Freeze, Burn, Poison, etc.) ──
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore(); // end translation
}

function _drawHollowMaskCracks(ctx, r, progress, now, fighter) {
  if (progress <= 0.02) return;
  const isChampionScreen = Boolean(fighter && (fighter._isWinnerReveal || (typeof state !== 'undefined' && (state.gameState === 'champion' || state.gameState === 'roundEnd' || state.gameState === 'matchEnd'))));
  if (isChampionScreen) return;

  const jitter = progress > 0.65 ? Math.sin(now * 0.08) * 0.85 * progress : 0;
  ctx.save();
  if (jitter !== 0) {
    ctx.translate(jitter, -jitter * 0.5);
  }

  // 5 distinct fracture branch fault lines traversing the skull mask
  const fractures = [
    // 1. Left Temple across eye orbit to lower jaw
    [
      { x: -r * 0.75, y: -r * 0.85 },
      { x: -r * 0.52, y: -r * 0.55 },
      { x: -r * 0.38, y: -r * 0.42 },
      { x: -r * 0.28, y: -r * 0.15 },
      { x: -r * 0.35, y:  r * 0.18 },
      { x: -r * 0.22, y:  r * 0.42 }
    ],
    // 2. Crown top down through center forehead into right cheek
    [
      { x: -r * 0.05, y: -r * 1.02 },
      { x:  r * 0.08, y: -r * 0.72 },
      { x: -r * 0.04, y: -r * 0.45 },
      { x:  r * 0.18, y: -r * 0.18 },
      { x:  r * 0.38, y:  r * 0.05 },
      { x:  r * 0.55, y:  r * 0.25 }
    ],
    // 3. Right brow across eye slit to outer cheek
    [
      { x:  r * 0.68, y: -r * 0.70 },
      { x:  r * 0.45, y: -r * 0.48 },
      { x:  r * 0.32, y: -r * 0.35 },
      { x:  r * 0.42, y: -r * 0.10 },
      { x:  r * 0.60, y:  r * 0.08 }
    ],
    // 4. Teeth / Jaw stress fracture upward
    [
      { x:  r * 0.02, y:  r * 0.55 },
      { x: -r * 0.12, y:  r * 0.32 },
      { x:  r * 0.05, y:  r * 0.12 },
      { x: -r * 0.08, y: -r * 0.08 }
    ],
    // 5. Left cheekplate web splinter
    [
      { x: -r * 0.38, y: -r * 0.42 },
      { x: -r * 0.60, y: -r * 0.28 },
      { x: -r * 0.72, y: -r * 0.05 }
    ]
  ];

  const pulse = 0.85 + 0.15 * Math.sin(now * 0.025);
  const glowAlpha = Math.min(1.0, progress * 1.3);

  // Pass 1: Inner Red/Crimson Spiritual Energy Glow Seeping Through
  for (let f = 0; f < fractures.length; f++) {
    const pts = fractures[f];
    const maxIdx = Math.min(pts.length, Math.floor(1 + progress * (pts.length - 0.2)));
    if (maxIdx < 2) continue;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < maxIdx; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = `rgba(255, 30, 20, ${(0.85 * glowAlpha * pulse).toFixed(3)})`;
    ctx.lineWidth = 3.2 * progress;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    ctx.stroke();

    // Hot Pure-White fissure core in advanced cracking
    if (progress > 0.5) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * (progress - 0.4) * 1.6).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // Pass 2: Sharp Manga Ink Jagged Crack Borders
  for (let f = 0; f < fractures.length; f++) {
    const pts = fractures[f];
    const maxIdx = Math.min(pts.length, Math.floor(1 + progress * (pts.length - 0.2)));
    if (maxIdx < 2) continue;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < maxIdx; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = '#0a0a0f';
    ctx.lineWidth = 1.6 + 0.8 * progress;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    ctx.stroke();
  }

  // Pass 3: In the final critical phase (progress > 0.70), draw broken/missing porcelain chip openings
  if (progress > 0.70) {
    // Left eye crack opening (revealing skin below)
    ctx.fillStyle = '#FFE0BD';
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.50);
    ctx.lineTo(-r * 0.35, -r * 0.38);
    ctx.lineTo(-r * 0.50, -r * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Right cheek crack opening
    ctx.fillStyle = '#FFE0BD';
    ctx.beginPath();
    ctx.moveTo(r * 0.25, -r * 0.15);
    ctx.lineTo(r * 0.42, 0);
    ctx.lineTo(r * 0.28, r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();
}

function _drawBankaiBodyEdgeGlow(ctx, r, bankaiProg, now) {
  const edgeProg = Math.min(1.0, Math.max(0.0, (bankaiProg - 0.15) / 0.55));
  const ease = edgeProg * edgeProg * (3 - 2 * edgeProg);
  if (ease <= 0.01) return;

  const pulse = 1.0 + Math.sin(now * 0.04) * 0.06;

  // 1. Soft Outer Crimson Halo (concentric stroke, no Gaussian blur overhead)
  ctx.strokeStyle = `rgba(220, 20, 20, ${(0.38 * ease * pulse).toFixed(3)})`;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 2.0, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Vibrant Crimson Red Body Rim (4.5px stroke)
  ctx.strokeStyle = `rgba(255, 30, 20, ${(0.82 * ease * pulse).toFixed(3)})`;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Hot Pure-White Edge Accent Line (Inner contour)
  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.92 * ease).toFixed(3)})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Subtle Micro Electric Crackles along Body Perimeter
  const arcCount = 5;
  for (let a = 0; a < arcCount; a++) {
    const baseAng = (a / arcCount) * Math.PI * 2 + now * 0.003;
    const aLen = (7 + 4 * Math.sin(now * 0.06 + a * 2.0)) * ease;
    const jag = (a % 2 === 0 ? 1 : -1) * (2.5 + Math.sin(now * 0.08 + a) * 2.0);

    const x1 = Math.cos(baseAng) * r;
    const y1 = Math.sin(baseAng) * r;
    const x2 = Math.cos(baseAng + 0.15) * (r + aLen * 0.6) + Math.cos(baseAng + Math.PI / 2) * jag;
    const y2 = Math.sin(baseAng + 0.15) * (r + aLen * 0.6) + Math.sin(baseAng + Math.PI / 2) * jag;
    const x3 = Math.cos(baseAng + 0.30) * (r + aLen * 0.3);
    const y3 = Math.sin(baseAng + 0.30) * (r + aLen * 0.3);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.strokeStyle = `rgba(220, 20, 20, ${(0.88 * ease).toFixed(3)})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 240, 240, ${(0.95 * ease).toFixed(3)})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
}

// Pre-allocated static buffers to eliminate GC allocations during rendering
const _LIVE_AURA_NUM_PTS = 16;
const _liveAuraPoints = [];
for (let i = 0; i < _LIVE_AURA_NUM_PTS; i++) {
  _liveAuraPoints.push({ x: 0, y: 0 });
}

function _drawBankaiLiveAura(ctx, r, isBankai, isMask, now, layer = 'back') {
  const isCountdownOrPreview = (typeof state !== 'undefined' && (
    state.gameState === 'countdown' || 
    state.gameState === 'faceoff' ||
    state.gameState === 'weaponIndex' || 
    state.gameState === 'characterSelect' || 
    state.gameState === 'indexDetail' || 
    state.gameState === 'matchEnd' || 
    state.gameState === 'roundEnd' ||
    state._isFaceOffScreenActive ||
    state.isRandomRollShowoff
  ));
  if (isCountdownOrPreview) return;

  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));

  // Form theme resolution:
  let theme = 'bankai';
  if (isBankai && isMask) theme = 'bankai_mask';
  else if (isBankai) theme = 'bankai';
  else if (isMask) theme = 'shikai_mask';
  else theme = 'shikai';

  if (layer === 'back') {
    ctx.save();
    
    // ══════════════════════════════════════════════════════════════════════
    // ── 1. SOFT VOLUMETRIC PLASMA SHROUD (Smooth Organic Bézier Contour) ──
    // ══════════════════════════════════════════════════════════════════════
    const numPoints = _LIVE_AURA_NUM_PTS;
    const baseRadius = r * 1.18;
    const points = _liveAuraPoints;

    for (let i = 0; i < numPoints; i++) {
      const theta = (Math.PI * 2 / numPoints) * i;
      const upFactor = Math.max(0, -Math.sin(theta) + 0.3) * 0.9;
      const wave1 = Math.sin(theta * 3.0 + now * 0.007) * 5.0;
      const wave2 = Math.cos(theta * 2.0 - now * 0.005) * 4.0;
      const flicker = Math.sin(now * 0.016 + i * 1.5) * 3.0 * (1.0 + upFactor * 0.5);
      const totalR = baseRadius + wave1 + wave2 + flicker + upFactor * (r * 0.35);

      points[i].x = Math.cos(theta) * totalR;
      points[i].y = Math.sin(theta) * totalR;
    }

    const getContourPath = () => {
      ctx.beginPath();
      let mx = (points[numPoints - 1].x + points[0].x) * 0.5;
      let my = (points[numPoints - 1].y + points[0].y) * 0.5;
      ctx.moveTo(mx, my);
      for (let i = 0; i < numPoints; i++) {
        const p = points[i];
        const next = points[(i + 1) % numPoints];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) * 0.5, (p.y + next.y) * 0.5);
      }
      ctx.closePath();
    };

    // Layer A: Outer Soft Ethereal Bloom (Scaled by 1.30)
    if (!isLowQuality) {
      ctx.save();
      ctx.scale(1.30, 1.30);
      getContourPath();
      if (theme === 'bankai_mask') ctx.fillStyle = 'rgba(255, 10, 40, 0.22)';
      else if (theme === 'bankai') ctx.fillStyle = 'rgba(220, 20, 40, 0.20)';
      else if (theme === 'shikai_mask') ctx.fillStyle = 'rgba(240, 245, 255, 0.20)';
      else ctx.fillStyle = 'rgba(0, 140, 255, 0.18)';
      ctx.fill();
      ctx.restore();
    }

    // Layer B: Middle Vibrant Fluid Glow (Scaled by 1.14)
    ctx.save();
    ctx.scale(1.14, 1.14);
    getContourPath();
    if (theme === 'bankai_mask') ctx.fillStyle = 'rgba(255, 30, 60, 0.32)';
    else if (theme === 'bankai') ctx.fillStyle = 'rgba(255, 40, 30, 0.30)';
    else if (theme === 'shikai_mask') ctx.fillStyle = 'rgba(220, 230, 245, 0.30)';
    else ctx.fillStyle = 'rgba(0, 210, 255, 0.32)';
    ctx.fill();
    ctx.restore();

    // Layer C: Core Luminous Fluid (Scaled 1.0)
    getContourPath();
    const coreGrad = ctx.createRadialGradient(0, -r * 0.2, r * 0.2, 0, 0, r * 1.35);
    if (theme === 'bankai_mask') {
      coreGrad.addColorStop(0.0, 'rgba(255, 240, 240, 0.85)');
      coreGrad.addColorStop(0.40, 'rgba(255, 20, 40, 0.60)');
      coreGrad.addColorStop(0.80, 'rgba(15, 2, 8, 0.50)');
      coreGrad.addColorStop(1.0, 'rgba(5, 0, 4, 0.15)');
    } else if (theme === 'bankai') {
      coreGrad.addColorStop(0.0, 'rgba(255, 120, 80, 0.70)');
      coreGrad.addColorStop(0.45, 'rgba(220, 20, 20, 0.45)');
      coreGrad.addColorStop(0.85, 'rgba(20, 4, 8, 0.35)');
      coreGrad.addColorStop(1.0, 'rgba(10, 2, 4, 0.05)');
    } else if (theme === 'shikai_mask') {
      coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.80)');
      coreGrad.addColorStop(0.45, 'rgba(200, 220, 240, 0.55)');
      coreGrad.addColorStop(0.85, 'rgba(180, 20, 30, 0.30)');
      coreGrad.addColorStop(1.0, 'rgba(10, 10, 15, 0.10)');
    } else {
      coreGrad.addColorStop(0.0, 'rgba(220, 250, 255, 0.70)');
      coreGrad.addColorStop(0.45, 'rgba(0, 229, 255, 0.45)');
      coreGrad.addColorStop(0.85, 'rgba(0, 100, 255, 0.25)');
      coreGrad.addColorStop(1.0, 'rgba(0, 30, 120, 0.05)');
    }
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Layer D: Soft Stylized Calligraphic Energy Contour Edge
    if (theme === 'bankai_mask') ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    else if (theme === 'bankai') ctx.strokeStyle = 'rgba(20, 2, 5, 0.60)';
    else if (theme === 'shikai_mask') ctx.strokeStyle = 'rgba(5, 5, 8, 0.65)';
    else ctx.strokeStyle = 'rgba(0, 40, 90, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // ══════════════════════════════════════════════════════════════════════
    // ── 2. FLOATING HOT CORE REIATSU PARTICLES (Rising Embers) ──
    // ══════════════════════════════════════════════════════════════════════
    const emberCount = 4;
    for (let p = 0; p < emberCount; p++) {
      const pProg = ((now * 0.0018 + p * (1.0 / emberCount)) % 1.0);
      const pAng = (p * (Math.PI * 2 / emberCount)) + Math.sin(now * 0.003 + p * 1.7) * 0.35;
      const pDist = r * (0.95 + 0.45 * (1.0 - pProg * 0.4));
      const px = Math.cos(pAng) * pDist + Math.sin(now * 0.004 + p) * 4.0;
      const py = Math.sin(pAng) * pDist - pProg * 28.0; // floats smoothly upward
      const pRadius = (2.4 + (p % 3) * 1.2) * (1.0 - pProg * 0.4);
      const pAlpha = Math.sin(pProg * Math.PI) * 0.95;

      if (pAlpha > 0.02) {
        let glowColor = 'rgba(255, 40, 30, 0.92)';
        let darkEdge = 'rgba(15, 2, 8, 0.45)';

        if (theme === 'bankai_mask') {
          glowColor = (p % 2 === 0) ? 'rgba(255, 20, 40, 0.95)' : 'rgba(220, 0, 30, 0.90)';
          darkEdge = 'rgba(10, 0, 4, 0.60)';
        } else if (theme === 'bankai') {
          glowColor = (p % 2 === 0) ? 'rgba(255, 50, 30, 0.92)' : 'rgba(220, 20, 40, 0.88)';
          darkEdge = 'rgba(15, 2, 8, 0.45)';
        } else if (theme === 'shikai_mask') {
          glowColor = (p % 2 === 0) ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 40, 60, 0.85)';
          darkEdge = 'rgba(10, 10, 15, 0.40)';
        } else {
          glowColor = 'rgba(0, 229, 255, 0.90)';
          darkEdge = 'rgba(0, 40, 120, 0.35)';
        }

        // Soft outer glowing halo with jet-black core
        const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pRadius * 2.4);
        pGrad.addColorStop(0.0, 'rgba(5, 5, 8, 1.0)');
        pGrad.addColorStop(0.40, glowColor);
        pGrad.addColorStop(0.80, darkEdge);
        pGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pRadius * 2.4, 0, Math.PI * 2);
        ctx.fill();

        // High-contrast jet-black void core
        ctx.fillStyle = '#050508';
        ctx.beginPath();
        ctx.arc(px, py, pRadius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ── 3. SOFT ETHEREAL GROUND FLOOR ENERGY GLOW ──
    // ══════════════════════════════════════════════════════════════════════
    const groundY = r * 0.35;
    const grx = r * 1.55;
    const gry = r * 0.70;
    const gGrad = ctx.createRadialGradient(0, groundY, 0, 0, groundY, grx);
    if (theme === 'bankai_mask') {
      gGrad.addColorStop(0.0, 'rgba(10, 0, 4, 0.50)');
      gGrad.addColorStop(0.6, 'rgba(255, 0, 40, 0.30)');
      gGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    } else if (theme === 'bankai') {
      gGrad.addColorStop(0.0, 'rgba(15, 2, 5, 0.45)');
      gGrad.addColorStop(0.6, 'rgba(220, 20, 30, 0.22)');
      gGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    } else if (theme === 'shikai_mask') {
      gGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.35)');
      gGrad.addColorStop(0.6, 'rgba(220, 20, 40, 0.18)');
      gGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    } else {
      gGrad.addColorStop(0.0, 'rgba(0, 229, 255, 0.38)');
      gGrad.addColorStop(0.6, 'rgba(0, 120, 255, 0.15)');
      gGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    }

    ctx.beginPath();
    ctx.ellipse(0, groundY, grx, gry, 0, 0, Math.PI * 2);
    ctx.fillStyle = gGrad;
    ctx.fill();

    ctx.restore();
  }

  if (layer === 'front') {
    ctx.save();

    // ══════════════════════════════════════════════════════════════════════
    // ── 4. FRONT FLOATING HOT CORE REIATSU EMBERS ──
    // ══════════════════════════════════════════════════════════════════════
    const frontMoteCount = 3;
    for (let m = 0; m < frontMoteCount; m++) {
      const mSeed = ((now * 0.0020 + m * (1.0 / frontMoteCount) + 0.35) % 1.0);
      const mAng = m * (Math.PI * 2 / frontMoteCount) + Math.sin(now * 0.003 + m) * 0.4;
      const mDist = r * (0.80 + (1.0 - mSeed * 0.3) * 0.45);
      const mX = Math.cos(mAng) * mDist + Math.sin(now * 0.004 + m) * 2.5;
      const mY = Math.sin(mAng) * mDist - mSeed * 22.0; // floats smoothly upward
      const mRadius = (2.0 + (m % 2) * 1.0) * (1.0 - mSeed * 0.35);
      const mAlpha = Math.sin(mSeed * Math.PI) * 0.90;

      if (mAlpha > 0.02) {
        let glowColor = 'rgba(255, 40, 30, 0.92)';
        if (theme === 'bankai_mask') {
          glowColor = (m % 2 === 0) ? 'rgba(255, 20, 40, 0.95)' : 'rgba(255, 255, 255, 0.90)';
        } else if (theme === 'bankai') {
          glowColor = (m % 2 === 0) ? 'rgba(255, 60, 40, 0.92)' : 'rgba(220, 20, 40, 0.88)';
        } else if (theme === 'shikai_mask') {
          glowColor = (m % 2 === 0) ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 40, 60, 0.85)';
        } else {
          glowColor = 'rgba(0, 229, 255, 0.92)';
        }

        const mGrad = ctx.createRadialGradient(mX, mY, 0, mX, mY, mRadius * 2.2);
        mGrad.addColorStop(0.0, 'rgba(5, 5, 8, 1.0)');
        mGrad.addColorStop(0.45, glowColor);
        mGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(mX, mY, mRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // High-contrast jet-black core
        ctx.fillStyle = '#050508';
        ctx.beginPath();
        ctx.arc(mX, mY, mRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}


const _BANKAI_3D_RIBBONS = [
  // Each ribbon orbits on a different tilted plane (tilt in radians) with Lissajous frequencies for organic 3D motion
  { id: 0, tilt:  0.00, yBase: -0.25, radiusX: 1.68, radiusZ: 1.25, pitch:  0.32, f1: 1.10, f2: 1.40, f3: 1.70, phase: 0.0,              maxThick: 10.5, span: 1.85 },
  { id: 1, tilt:  0.70, yBase:  0.05, radiusX: 1.62, radiusZ: 1.20, pitch: -0.28, f1: 1.30, f2: 1.60, f3: 1.90, phase: Math.PI * 0.55,  maxThick: 11.5, span: 1.95 },
  { id: 2, tilt: -0.52, yBase:  0.15, radiusX: 1.55, radiusZ: 1.15, pitch:  0.30, f1: 0.90, f2: 1.20, f3: 1.50, phase: Math.PI * 1.10,  maxThick: 11.0, span: 1.75 },
  { id: 3, tilt:  1.15, yBase: -0.05, radiusX: 1.72, radiusZ: 1.30, pitch: -0.38, f1: 1.15, f2: 1.50, f3: 1.80, phase: Math.PI * 1.65,  maxThick: 10.0, span: 1.80 }
];

const _MAX_RIBBON_NUM_PTS = 16;
const _ribbonSpline = [];
const _pathPtsTop = [];
const _pathPtsBot = [];
const _spinePts = [];
for (let i = 0; i <= _MAX_RIBBON_NUM_PTS + 6; i++) {
  _ribbonSpline.push({ u: 0, x: 0, y: 0, z: 0, tx: 0, ty: 0, nx: 0, ny: 0, thick: 0, depthScale: 0 });
  _pathPtsTop.push({ x: 0, y: 0 });
  _pathPtsBot.push({ x: 0, y: 0 });
  _spinePts.push({ x: 0, y: 0 });
}

function _drawIchigoFloatingReiatsuAura(ctx, r, isBankai, isMask, isFrozen, now, layer = 'all', ribbonAlpha = 1.0, isForming = false, formationProg = 1.0) {
  if (isFrozen || ribbonAlpha <= 0.01) return;

  // ── Hollow Mask Fusion Trajectory Calculation ──
  let radiusMultiplier = 1.0;
  let yBaseShift = 0.0;
  let spanMultiplier = 1.0;
  let spiralSpin = 0.0;
  let fuseAlpha = ribbonAlpha;

  if (isMask && isForming) {
    if (formationProg < 0.35) {
      radiusMultiplier = 1.0;
      yBaseShift = 0.0;
      spanMultiplier = 1.0;
      spiralSpin = 0.0;
    } else {
      const convergeP = Math.min(1.0, (formationProg - 0.35) / 0.45);
      const remain = Math.max(0.0, 1.0 - convergeP);
      const ease = remain * remain;
      radiusMultiplier = 0.10 + 0.90 * ease;
      yBaseShift = (-0.30) * (1.0 - ease);
      spanMultiplier = 0.40 + 0.60 * ease;
      spiralSpin = (1.0 - remain) * 6.28;
      if (convergeP >= 0.65) {
        fuseAlpha *= Math.pow(Math.max(0.0, 1.0 - (convergeP - 0.65) / 0.35), 1.5);
      }
    }
  }

  if (fuseAlpha <= 0.01) return;

  // Lissajous time base snapped to ~20 FPS for electric jittery movement
  const lissTime = Math.floor(now * 0.02) / 2.857;

  // ── LAYER: BACK (Back-Half 3D Orbiting Ribbons) ──
  if (layer === 'back' || layer === 'all') {
    ctx.save();
    ctx.globalAlpha = (ctx.globalAlpha || 1.0) * fuseAlpha;

    // 3D Lissajous Orbiting Slash Ribbons (Behind Body: z < 0.15)
    if (isBankai || isMask) {
      for (let rb = 0; rb < _BANKAI_3D_RIBBONS.length; rb++) {
        const rawRib = _BANKAI_3D_RIBBONS[rb];
        const t = lissTime + rawRib.phase + spiralSpin;
        let lx = Math.sin(t * rawRib.f1) + Math.cos(t * rawRib.f2 * 0.9);
        let ly = Math.sin(t * rawRib.f2) + Math.cos(t * rawRib.f3 * 1.1);
        let lz = Math.sin(t * rawRib.f3) + Math.cos(t * rawRib.f1 * 1.2);
        const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1;
        lx /= lLen; ly /= lLen; lz /= lLen;
        const crackleX = Math.sin(t * 30 + rawRib.id * 50) * 0.15;
        const crackleY = Math.cos(t * 35 + rawRib.id * 50) * 0.15;
        lx += crackleX;
        ly += crackleY;
        const theta = Math.atan2(ly, lx);
        if (lz < 0.15) {
          _drawOrbiting3dSlashRibbon(ctx, r, rawRib, theta, now, lz, false, radiusMultiplier, yBaseShift, spanMultiplier);
        }
      }
    }

    ctx.restore();
  }

  // ── LAYER: FRONT (Front-Half 3D Orbiting Ribbons & Chest Tendrils) ──
  if (layer === 'front' || layer === 'all') {
    ctx.save();
    ctx.globalAlpha = (ctx.globalAlpha || 1.0) * fuseAlpha;

    if (isBankai || isMask) {
      // 1. Rising Jagged Ink-Flame Tendrils on Chest & Collar (only in full Bankai)
      if (isBankai && !isMask) {
        const chestFlames = 4;
        for (let c = 0; c < chestFlames; c++) {
          const cx = -r * 0.35 + c * (r * 0.7 / (chestFlames - 1));
          const cy = r * 0.35 - (c % 2) * (r * 0.2);
          const wave = Math.sin(now * 0.005 + c * 1.9);
          const fH = (r * 0.45 + (c % 2) * (r * 0.15)) * (0.9 + wave * 0.2);
          const fW = r * 0.18;

          const tipX = cx + Math.sin(now * 0.004 + c * 2.3) * 5;
          const tipY = cy - fH;

          ctx.beginPath();
          ctx.moveTo(cx - fW * 0.5, cy);
          ctx.quadraticCurveTo(cx - fW * 0.6, cy - fH * 0.5, tipX, tipY);
          ctx.quadraticCurveTo(cx + fW * 0.6, cy - fH * 0.5, cx + fW * 0.5, cy);
          ctx.closePath();

          ctx.fillStyle = '#0a0a0a';
          ctx.fill();

          ctx.strokeStyle = 'rgba(220, 20, 20, 0.88)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }

      // 2. 3D Lissajous Orbiting Slash Ribbons (In Front of Body: z >= -0.15)
      for (let rf = 0; rf < _BANKAI_3D_RIBBONS.length; rf++) {
        const rawRibF = _BANKAI_3D_RIBBONS[rf];
        const tF = lissTime + rawRibF.phase + spiralSpin;
        let lfx = Math.sin(tF * rawRibF.f1) + Math.cos(tF * rawRibF.f2 * 0.9);
        let lfy = Math.sin(tF * rawRibF.f2) + Math.cos(tF * rawRibF.f3 * 1.1);
        let lfz = Math.sin(tF * rawRibF.f3) + Math.cos(tF * rawRibF.f1 * 1.2);
        const lfLen = Math.sqrt(lfx * lfx + lfy * lfy + lfz * lfz) || 1;
        lfx /= lfLen; lfy /= lfLen; lfz /= lfLen;
        const crackleXf = Math.sin(tF * 30 + rawRibF.id * 50) * 0.15;
        const crackleYf = Math.cos(tF * 35 + rawRibF.id * 50) * 0.15;
        lfx += crackleXf;
        lfy += crackleYf;
        const thetaF = Math.atan2(lfy, lfx);
        if (lfz >= -0.15) {
          _drawOrbiting3dSlashRibbon(ctx, r, rawRibF, thetaF, now, lfz, true, radiusMultiplier, yBaseShift, spanMultiplier);
        }
      }

      // 3. Floating Jagged Ink Spatter Embers in Front of Face / Silhouette
      const emberCount = 4;
      for (let e = 0; e < emberCount; e++) {
        const eProg = ((now * 0.0014 + e * (1.0 / emberCount)) % 1.0);
        const eX = Math.sin(e * 2.7 + now * 0.001) * (r * 0.8);
        const eY = r * 0.6 - eProg * (r * 2.0);
        const eSize = (1.8 + (e % 2) * 1.0) * (1.0 - eProg * 0.5);
        const eAlpha = Math.sin(eProg * Math.PI) * 0.95;

        if (eAlpha > 0.01) {
          ctx.save();
          ctx.translate(eX, eY);
          ctx.rotate(e * 1.2 + now * 0.002);

          ctx.beginPath();
          ctx.moveTo(0, -eSize * 1.3);
          ctx.lineTo(eSize * 0.6, 0);
          ctx.lineTo(0, eSize * 1.3);
          ctx.lineTo(-eSize * 0.6, 0);
          ctx.closePath();

          ctx.fillStyle = '#080808';
          ctx.globalAlpha = eAlpha;
          ctx.fill();

          ctx.strokeStyle = `rgba(220, 20, 20, ${(0.92 * eAlpha).toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();

          ctx.restore();
        }
      }
    }

    ctx.restore();
  }
}

function _drawOrbiting3dSlashRibbon(ctx, r, ribbon, theta, now, lzDepth, isFrontLayer, radiusMultiplier = 1.0, yBaseShift = 0.0, spanMultiplier = 1.0) {
  const rx = r * (ribbon.radiusX * radiusMultiplier);
  const rz = r * (ribbon.radiusZ * radiusMultiplier);
  const yCenter = r * (ribbon.yBase + yBaseShift);
  const span = ribbon.span * spanMultiplier;
  const maxThick = ribbon.maxThick * (0.65 + 0.35 * radiusMultiplier);

  const numPts = _MAX_RIBBON_NUM_PTS;
  let topCount = 0;
  let botCount = 0;
  let spineCount = 0;

  // Calculate 3D spine and normal vectors in preallocated buffer
  for (let k = 0; k <= numPts; k++) {
    const u = k / numPts;
    const ang = (theta - span * 0.5) + u * span;
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);

    const x3d = cosA * rx;
    const z3d = sinA * rz;
    const y3d = yCenter + sinA * (rz * Math.sin(ribbon.pitch)) + Math.sin(now * 0.003 + ribbon.id + u * 2.0) * 2.0;

    const depth = (z3d / rz);
    const depthScale = 0.72 + 0.28 * ((depth + 1.0) * 0.5);

    const dx = -sinA * rx;
    const dy = cosA * (rz * Math.sin(ribbon.pitch));
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const tx = dx / len;
    const ty = dy / len;
    const nx = -ty;
    const ny = tx;

    const baseTaper = Math.pow(Math.sin(u * Math.PI), 1.15);
    const thick = maxThick * depthScale * baseTaper;

    const spt = _ribbonSpline[k];
    spt.u = u;
    spt.x = x3d;
    spt.y = y3d;
    spt.z = z3d;
    spt.tx = tx;
    spt.ty = ty;
    spt.nx = nx;
    spt.ny = ny;
    spt.thick = thick;
    spt.depthScale = depthScale;

    _spinePts[spineCount].x = x3d;
    _spinePts[spineCount].y = y3d;
    spineCount++;
  }

  // Trace top edge from head (u=1) down to tail (u=0)
  for (let k = numPts; k >= 0; k--) {
    const pt = _ribbonSpline[k];
    const topX = pt.x + pt.nx * (pt.thick * 0.5);
    const topY = pt.y + pt.ny * (pt.thick * 0.5);

    // Barb 1: Leading thorn notch near u ~ 0.72
    if (k === Math.round(numPts * 0.72)) {
      const barbLen = 13.0 * pt.depthScale;
      const barbOut = (pt.thick * 0.6) + 4.0 * pt.depthScale;
      _pathPtsTop[topCount].x = pt.x - pt.tx * barbLen + pt.nx * barbOut;
      _pathPtsTop[topCount].y = pt.y - pt.ty * barbLen + pt.ny * barbOut;
      topCount++;
    }
    // Barb 2: Trailing stepped split fang near u ~ 0.38
    else if (k === Math.round(numPts * 0.38)) {
      const barbLen = 11.0 * pt.depthScale;
      const barbOut = (pt.thick * 0.55) + 3.0 * pt.depthScale;
      _pathPtsTop[topCount].x = pt.x - pt.tx * barbLen + pt.nx * barbOut;
      _pathPtsTop[topCount].y = pt.y - pt.ty * barbLen + pt.ny * barbOut;
      topCount++;
    }

    _pathPtsTop[topCount].x = topX;
    _pathPtsTop[topCount].y = topY;
    topCount++;
  }

  // Trace bottom edge from tail (u=0) up to head (u=1)
  for (let k = 0; k <= numPts; k++) {
    const pt = _ribbonSpline[k];
    const botX = pt.x - pt.nx * (pt.thick * 0.5);
    const botY = pt.y - pt.ny * (pt.thick * 0.5);

    // Secondary counter-fang on underside near u ~ 0.22 for alternating ribbons
    if (k === Math.round(numPts * 0.22) && ribbon.id % 2 === 1) {
      const barbLen = 8.5 * pt.depthScale;
      const barbOut = (pt.thick * 0.5) + 2.2 * pt.depthScale;
      _pathPtsBot[botCount].x = pt.x - pt.tx * barbLen - pt.nx * barbOut;
      _pathPtsBot[botCount].y = pt.y - pt.ty * barbLen - pt.ny * barbOut;
      botCount++;
    }

    _pathPtsBot[botCount].x = botX;
    _pathPtsBot[botCount].y = botY;
    botCount++;
  }

  // Draw 3D Barbed Closed Polygon on tilted orbital plane
  ctx.save();
  ctx.rotate(ribbon.tilt || 0);
  ctx.beginPath();
  if (topCount > 0) {
    ctx.moveTo(_pathPtsTop[0].x, _pathPtsTop[0].y);
    for (let i = 1; i < topCount; i++) {
      ctx.lineTo(_pathPtsTop[i].x, _pathPtsTop[i].y);
    }
  }
  for (let i = 0; i < botCount; i++) {
    ctx.lineTo(_pathPtsBot[i].x, _pathPtsBot[i].y);
  }
  ctx.closePath();

  // Solid Jet-Black Void Body
  ctx.fillStyle = '#080808';
  ctx.fill();

  // Glowing Crimson Red Outer Edges
  ctx.strokeStyle = `rgba(220, 20, 20, ${(isFrontLayer ? 0.95 : 0.75).toFixed(2)})`;
  ctx.lineWidth = isFrontLayer ? 1.8 : 1.3;
  ctx.stroke();

  // Intense Scarlet Center Spine Line (in front layer)
  if (isFrontLayer && spineCount > 0) {
    ctx.beginPath();
    ctx.moveTo(_spinePts[0].x, _spinePts[0].y);
    for (let i = 1; i < spineCount; i++) {
      ctx.lineTo(_spinePts[i].x, _spinePts[i].y);
    }
    ctx.strokeStyle = 'rgba(255, 30, 20, 0.90)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  ctx.restore();
}

function _drawGetsugaChargingAura(ctx, params) {
  const {
    isShikai = true,
    isBankai = false,
    isMask = false,
    chargeProg = 0,
    fighter,
    tipX = 120,
    tipY = -10,
    heelX = 11,
    heelY = 18,
    cutoutCenterX = 5.5,
    cutoutCenterY = 3.0,
    cutoutR = 5.5,
    swordStartX = 0,
    swordLen = 94
  } = params;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = now * 0.001;
  const pulse = 1.0 + 0.16 * Math.sin(time * 26.0);
  const auraAlpha = Math.min(1.0, (0.55 + 0.45 * chargeProg) * pulse);

  const isFinal = Boolean(fighter && (fighter.isFinalMassiveGetsuga || fighter._isFinalGetsugaCharging));
  const isBankaiHollow = isMask && isBankai;
  const isShikaiHollow = isMask && !isBankai;

  ctx.save();

  // ── Color theme definition matching active form ──
  let primaryColor, secondaryColor, coreColor, darkInkColor;
  if (isFinal) {
    primaryColor = '#E60026';   // Intense Ruby Crimson
    secondaryColor = '#FF3355'; // Scarlet Glow
    coreColor = '#FFFFFF';      // Pure White Laser Core
    darkInkColor = '#080004';   // Abyssal Black Void
  } else if (isBankaiHollow) {
    primaryColor = '#FF1E00';   // Blood Red
    secondaryColor = '#DC143C'; // Crimson Flame
    coreColor = '#FFFFFF';      // Pure White Lines
    darkInkColor = '#060102';   // Jet Black Void
  } else if (isShikaiHollow) {
    primaryColor = '#00E5FF';   // Electric Cyan
    secondaryColor = '#80F0FF'; // Bright Azure
    coreColor = '#FFFFFF';      // Pure White
    darkInkColor = '#0A0E18';   // Void Black Lines
  } else if (isBankai) {
    primaryColor = '#FF1E38';   // Crimson Neon
    secondaryColor = '#FF4455'; // Scarlet
    coreColor = '#FFFFFF';      // White Hot Core
    darkInkColor = '#0A0206';   // Pitch Black
  } else {
    // Standard Shikai
    primaryColor = '#00D5FF';   // Sky Blue
    secondaryColor = '#00F0FF'; // Electric Azure
    coreColor = '#FFFFFF';      // Pure White Core
    darkInkColor = '#004080';   // Deep Oceanic Contrast
  }

  if (isShikai) {
    // ══════════════════════════════════════════════════════════════════════
    // ── SHIKAI ZANGETSU: DYNAMIC FLOWING REIATSU ENERGY ERUPTION ──
    // ══════════════════════════════════════════════════════════════════════
    const expand = 2.5 + 5.0 * chargeProg * pulse;

    // Helper to trace dynamic Shikai blade with rippling Reiatsu waves
    const traceShikaiBlade = (exp = 0) => {
      ctx.beginPath();
      ctx.moveTo(-exp * 0.4, -3.0 - exp);
      // Animated wave along top cutting edge
      const waveTip = Math.sin(time * 24.0) * 1.5 * (0.3 + 0.7 * chargeProg);
      ctx.lineTo(tipX + exp + waveTip, tipY - exp * 0.3);
      ctx.quadraticCurveTo(65 + exp * 0.3, 15 + exp * 0.8, heelX + exp * 0.5, heelY + exp * 0.8);
      ctx.lineTo(heelX, cutoutCenterY + exp * 0.4);
      ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR + exp * 0.3, 0, Math.PI, true);
      ctx.lineTo(-exp * 0.4, 5.0 + exp);
      ctx.closePath();
    };

    // 1. Radiant Energy Cloak with dynamic shifting glow
    ctx.save();
    traceShikaiBlade(expand);
    const gradShift = Math.sin(time * 18.0) * 15;
    const outerGrad = ctx.createLinearGradient(0, 0, tipX + gradShift, tipY);
    if (isBankaiHollow || isFinal) {
      outerGrad.addColorStop(0.0, `rgba(8, 2, 4, ${(0.60 * auraAlpha).toFixed(3)})`);
      outerGrad.addColorStop(0.40, `rgba(220, 20, 60, ${(0.75 * auraAlpha).toFixed(3)})`);
      outerGrad.addColorStop(0.85, `rgba(255, 30, 0, ${(0.85 * auraAlpha).toFixed(3)})`);
      outerGrad.addColorStop(1.0, `rgba(255, 255, 255, ${(0.95 * auraAlpha).toFixed(3)})`);
    } else if (isShikaiHollow) {
      outerGrad.addColorStop(0.0, `rgba(10, 14, 24, ${(0.65 * auraAlpha).toFixed(3)})`);
      outerGrad.addColorStop(0.40, `rgba(0, 229, 255, ${(0.75 * auraAlpha).toFixed(3)})`);
      outerGrad.addColorStop(0.85, `rgba(160, 245, 255, ${(0.85 * auraAlpha).toFixed(3)})`);
      outerGrad.addColorStop(1.0, `rgba(255, 255, 255, ${(0.95 * auraAlpha).toFixed(3)})`);
    } else {
      outerGrad.addColorStop(0.0, `rgba(0, 100, 255, ${(0.45 * auraAlpha).toFixed(3)})`);
      outerGrad.addColorStop(0.45, `rgba(0, 213, 255, ${(0.70 * auraAlpha).toFixed(3)})`);
      outerGrad.addColorStop(0.85, `rgba(160, 245, 255, ${(0.85 * auraAlpha).toFixed(3)})`);
      outerGrad.addColorStop(1.0, `rgba(255, 255, 255, ${(0.95 * auraAlpha).toFixed(3)})`);
    }
    ctx.fillStyle = outerGrad;
    ctx.fill();
    ctx.restore();

    // 2. Dynamic Pulsing Outer Contour
    ctx.save();
    traceShikaiBlade(expand * 0.45);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.8 + 2.0 * chargeProg;
    ctx.stroke();
    ctx.restore();

    // 3. Fast-streaming Reiatsu lightning arcs along cleaver blade
    const arcCount = Math.floor(3 + 3 * chargeProg);
    for (let a = 0; a < arcCount; a++) {
      const aPhase = ((time * 16.0 + a * 1.8) % 1.0);
      const ax1 = aPhase * tipX;
      const ay1 = -3.0 + aPhase * tipY;
      const jitter = Math.sin(time * 30.0 + a * 4.0) * (3.0 + 4.0 * chargeProg);

      ctx.beginPath();
      ctx.moveTo(ax1, ay1);
      ctx.lineTo(ax1 + 12, ay1 + jitter);
      ctx.strokeStyle = (a % 2 === 0) ? coreColor : primaryColor;
      ctx.lineWidth = 1.2 + 0.8 * chargeProg;
      ctx.globalAlpha = 0.85 * auraAlpha;
      ctx.stroke();
    }

    // 4. Inward Swirling Reiatsu Particles condensing into the blade
    const orbCount = Math.floor(5 + 5 * chargeProg);
    for (let o = 0; o < orbCount; o++) {
      const ot = ((time * (1.8 + chargeProg * 1.5) + o * (1.0 / orbCount)) % 1.0);
      const swirlDist = (1.0 - ot) * (28 * (1.0 - chargeProg * 0.3));
      const swirlAngle = time * 8.0 + o * 1.25;
      const ox = (o / orbCount) * tipX + Math.cos(swirlAngle) * swirlDist;
      const oy = Math.sin(swirlAngle) * (swirlDist * 0.5);

      ctx.beginPath();
      ctx.arc(ox, oy, 1.4 + (1.0 - ot) * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = (o % 2 === 0) ? coreColor : primaryColor;
      ctx.globalAlpha = Math.sin(ot * Math.PI) * auraAlpha;
      ctx.fill();
    }

  } else {
    // ══════════════════════════════════════════════════════════════════════
    // ── BANKAI TENSA ZANGETSU: LIVING STREAMING KUROI REIATSU STORM ──
    // ══════════════════════════════════════════════════════════════════════
    const startX = swordStartX;
    const len = swordLen || 94;
    const bladeBaseX = startX + 5;
    const fin1StartX = startX + 52;
    const fin2StartX = startX + 66;
    const fin3StartX = startX + 80;
    const tipX = startX + len;
    const expand = 2.5 + 4.5 * chargeProg * pulse;
    const getSori = (x) => {
      const t = Math.max(0, Math.min(1.0, (x - bladeBaseX) / (tipX - bladeBaseX)));
      return -Math.pow(t, 1.45) * 8.5;
    };
    const tipY = getSori(tipX);

    // Helper to trace dynamic Bankai blade silhouette with active Reiatsu turbulence
    const traceBankaiBlade = (exp = 0) => {
      ctx.beginPath();
      const waveTop = Math.sin(time * 26.0) * 1.2 * (0.4 + 0.6 * chargeProg);
      const waveBot = Math.cos(time * 24.0) * 1.2 * (0.4 + 0.6 * chargeProg);

      // Cutting edge (-Y / top)
      ctx.moveTo(bladeBaseX, -2.8 - exp);
      ctx.quadraticCurveTo(startX + 50, getSori(startX + 50) - 2.8 - exp + waveTop, tipX + exp * 1.2, tipY + waveTop * 0.5);

      // Spine edge with 3 stepped fins (+Y / bottom)
      ctx.quadraticCurveTo(startX + 87, getSori(startX + 87) + 3.2 + exp + waveBot, fin3StartX + 2.2, getSori(fin3StartX) + 5.3 + exp);
      ctx.lineTo(fin2StartX + 12.2, getSori(fin2StartX + 12.2) + 2.5 + exp);
      ctx.lineTo(fin2StartX + 10.5, getSori(fin2StartX + 10.5) + 4.3 + exp);
      ctx.lineTo(fin2StartX + 2.2, getSori(fin2StartX) + 5.1 + exp);
      ctx.lineTo(fin1StartX + 12.2, getSori(fin1StartX + 12.2) + 2.7 + exp);
      ctx.lineTo(fin1StartX + 10.5, getSori(fin1StartX + 10.5) + 4.3 + exp);
      ctx.lineTo(fin1StartX + 2.2, getSori(fin1StartX) + 4.9 + exp);
      ctx.lineTo(fin1StartX, getSori(fin1StartX) + 2.8 + exp);
      ctx.lineTo(bladeBaseX, 2.8 + exp);
      ctx.closePath();
    };

    // 1. Turbulent Kuroi Reiatsu Plasma Sheath with dynamic flow
    ctx.save();
    traceBankaiBlade(expand);
    const gradOffset = Math.sin(time * 20.0) * 12;
    const bankaiGrad = ctx.createLinearGradient(bladeBaseX, -3.2, tipX + gradOffset, 5.8);
    bankaiGrad.addColorStop(0.0, `rgba(10, 2, 4, ${(0.45 * auraAlpha).toFixed(3)})`);
    bankaiGrad.addColorStop(0.35, `rgba(220, 20, 45, ${(0.65 * auraAlpha).toFixed(3)})`);
    bankaiGrad.addColorStop(0.75, `rgba(255, 40, 60, ${(0.80 * auraAlpha).toFixed(3)})`);
    bankaiGrad.addColorStop(1.0, `rgba(255, 255, 255, ${(0.92 * auraAlpha).toFixed(3)})`);
    ctx.fillStyle = bankaiGrad;
    ctx.fill();
    ctx.restore();

    // 2. Intense Burning Red Outer Energy Contour
    ctx.save();
    traceBankaiBlade(expand * 0.45);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.6 + 1.8 * chargeProg;
    ctx.stroke();
    ctx.restore();

    // 3. Fast Rushing Kuroi Lightning Discharges jumping along the entire blade
    const arcCount = Math.floor(4 + 4 * chargeProg);
    for (let a = 0; a < arcCount; a++) {
      const aPhase = ((time * (14.0 + chargeProg * 10.0) + a * 1.5) % 1.0);
      const ax = bladeBaseX + aPhase * (len - 10);
      const topY = getSori(ax) - 2.8;
      const botY = getSori(ax) + 4.0;
      const jitterX = Math.sin(time * 35.0 + a * 3.0) * (2.5 + 3.0 * chargeProg);

      ctx.beginPath();
      ctx.moveTo(ax, botY);
      ctx.lineTo(ax + jitterX, getSori(ax));
      ctx.lineTo(ax + 4 + jitterX * 0.5, topY);
      ctx.strokeStyle = (a % 2 === 0) ? coreColor : primaryColor;
      ctx.lineWidth = 1.2 + 0.8 * chargeProg;
      ctx.globalAlpha = 0.90 * auraAlpha;
      ctx.stroke();
    }

    // 4. High-Speed Kuroi Vortex Embers Spiraling into Tensa Zangetsu
    const emberCount = Math.floor(8 + 8 * chargeProg);
    for (let e = 0; e < emberCount; e++) {
      const et = ((time * (2.2 + chargeProg * 2.0) + e * (1.0 / emberCount)) % 1.0);
      const swirlDist = (1.0 - et) * (34 * (1.0 - chargeProg * 0.35));
      const swirlAng = time * 10.0 + e * 1.15;
      const targetBladeX = bladeBaseX + (e / emberCount) * (len - 8);
      const ex = targetBladeX + Math.cos(swirlAng) * swirlDist;
      const ey = getSori(targetBladeX) + Math.sin(swirlAng) * (swirlDist * 0.55);

      ctx.beginPath();
      ctx.arc(ex, ey, 1.4 + (1.0 - et) * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = (e % 3 === 0) ? coreColor : primaryColor;
      ctx.globalAlpha = Math.sin(et * Math.PI) * (0.85 * auraAlpha);
      ctx.fill();
    }
  }

  ctx.restore();
}

function _drawBankaiChargingAura(ctx, tipX, tipY, heelX, heelY, cutoutCenterX, cutoutCenterY, cutoutR, bankaiProg) {
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const pulse = 1.0 + 0.10 * Math.sin(now * 0.03);
  const auraAlpha = Math.min(1.0, bankaiProg * 2.0);

  ctx.save();

  // Surging Bankai Spiritual Pressure Eruption along Zangetsu
  const expand = (3.0 + 8.0 * bankaiProg) * pulse;
  ctx.beginPath();
  ctx.moveTo(-expand * 0.4, -3.0 - expand);
  ctx.lineTo(tipX + expand * 1.2, tipY - expand * 0.4);
  ctx.quadraticCurveTo(65 + expand * 0.3, 15 + expand * 1.0, heelX + expand * 0.6, heelY + expand * 1.0);
  ctx.lineTo(heelX, cutoutCenterY + expand * 0.5);
  ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR + expand * 0.4, 0, Math.PI, true);
  ctx.lineTo(-expand * 0.4, 5.0 + expand);
  ctx.closePath();

  const bGrad = ctx.createLinearGradient(0, 0, tipX, tipY);
  bGrad.addColorStop(0.0, `rgba(8, 2, 4, ${(0.85 * auraAlpha).toFixed(3)})`);
  bGrad.addColorStop(0.35, `rgba(220, 20, 60, ${(0.92 * auraAlpha).toFixed(3)})`);
  bGrad.addColorStop(0.70, `rgba(255, 30, 20, ${(0.95 * auraAlpha).toFixed(3)})`);
  bGrad.addColorStop(1.0, `rgba(255, 255, 255, ${(1.0 * auraAlpha).toFixed(3)})`);

  ctx.fillStyle = bGrad;
  ctx.fill();

  // Edge Laser Stroke
  ctx.strokeStyle = '#FF1E00';
  ctx.lineWidth = 2.0 + 2.0 * bankaiProg;
  ctx.stroke();

  ctx.restore();
}

function _drawBankaiTransformationVortex(ctx, r, bankaiProg, now, fighter) {
  ctx.save();

  const vortexAlpha = Math.min(1.0, bankaiProg * 2.0);
  const pulse = 1.0 + Math.sin(now * 0.02) * 0.08;

  // ── Clean Spiritual Pressure Base Glow (Jet Black & Crimson Red) ──
  const baseR = r * (1.6 + bankaiProg * 1.2) * pulse;
  const grad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, baseR);
  grad.addColorStop(0.0, `rgba(220, 20, 20, ${(0.55 * vortexAlpha).toFixed(3)})`);
  grad.addColorStop(0.40, `rgba(18, 4, 12, ${(0.75 * vortexAlpha).toFixed(3)})`);
  grad.addColorStop(0.80, `rgba(6, 2, 8, ${(0.55 * vortexAlpha).toFixed(3)})`);
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, baseR, 0, Math.PI * 2);
  ctx.fill();

  // ── Subtle Spiritual Pressure Sparks ──
  const particleCount = 8;
  for (let p = 0; p < particleCount; p++) {
    const pProg = ((now * 0.0022 + p * (1.0 / particleCount)) % 1.0);
    const pDist = r * (0.7 + (1.0 - pProg) * 1.8);
    const pAngle = p * (Math.PI * 2 / particleCount) + now * 0.005;
    const px = Math.cos(pAngle) * pDist;
    const py = Math.sin(pAngle) * pDist;
    const pSize = (1.8 + (p % 2) * 1.0) * (1.0 - pProg * 0.5);

    ctx.fillStyle = (p % 2 === 0) 
      ? `rgba(220, 20, 20, ${(0.92 * (1.0 - pProg) * vortexAlpha).toFixed(3)})` 
      : `rgba(255, 230, 230, ${(0.98 * (1.0 - pProg) * vortexAlpha).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _drawBankaiSkywardSonicPillar(ctx, r, burstProg, alpha, now) {
  // Timing: Surges violently upward into the sky upon releasing Bankai
  const pillarProg = Math.min(1.0, burstProg / 0.70);
  const pillarHeight = 140 + Math.pow(pillarProg, 0.55) * 800; // Skyward beam reaching high into the air
  const pillarBaseW = (44 + 20 * (1.0 - burstProg));
  const pillarAlpha = Math.pow(1.0 - burstProg, 0.9) * alpha;

  if (pillarAlpha <= 0.01) return;

  ctx.save();

  // ── 1. Colossal Outer Black-Crimson Reiatsu Corona Shroud (Multi-Peak Needle Silhouette) ──
  const coronaW = pillarBaseW * 1.55;
  const coronaGrad = ctx.createLinearGradient(-coronaW, 0, coronaW, 0);
  coronaGrad.addColorStop(0.0, 'rgba(220, 20, 20, 0.0)');
  coronaGrad.addColorStop(0.20, `rgba(220, 20, 20, ${(0.80 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.42, `rgba(12, 4, 10, ${(0.92 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.50, `rgba(255, 30, 20, ${(0.98 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.58, `rgba(12, 4, 10, ${(0.92 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.80, `rgba(220, 20, 20, ${(0.80 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(1.0, 'rgba(220, 20, 20, 0.0)');

  // Outer Multi-Peak Needle Polygon (Exact match to Bleach anime reference)
  ctx.beginPath();
  ctx.moveTo(-coronaW, 0);
  ctx.lineTo(-coronaW * 0.75, -pillarHeight * 0.55);
  ctx.lineTo(-coronaW * 0.60, -pillarHeight * 0.52);
  ctx.lineTo(-coronaW * 0.40, -pillarHeight * 0.82);
  ctx.lineTo(-coronaW * 0.25, -pillarHeight * 0.78);
  ctx.lineTo(0, -pillarHeight);                      // Main Center Spear Peak
  ctx.lineTo(coronaW * 0.25, -pillarHeight * 0.75);
  ctx.lineTo(coronaW * 0.45, -pillarHeight * 0.80);
  ctx.lineTo(coronaW * 0.65, -pillarHeight * 0.50);
  ctx.lineTo(coronaW * 0.80, -pillarHeight * 0.54);
  ctx.lineTo(coronaW, 0);
  ctx.closePath();
  ctx.fillStyle = coronaGrad;
  ctx.fill();

  // ── 2. High-Density Black Void & Ruby Core Column ──
  const coreW = pillarBaseW * 0.75;
  const coreGrad = ctx.createLinearGradient(-coreW, 0, coreW, 0);
  coreGrad.addColorStop(0.0, 'rgba(12, 4, 10, 0.0)');
  coreGrad.addColorStop(0.20, `rgba(12, 4, 10, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.40, `rgba(220, 20, 20, ${(0.92 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.50, `rgba(255, 240, 240, ${(1.0 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.60, `rgba(220, 20, 20, ${(0.92 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.80, `rgba(12, 4, 10, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(1.0, 'rgba(12, 4, 10, 0.0)');

  ctx.beginPath();
  ctx.moveTo(-coreW, 0);
  ctx.lineTo(-coreW * 0.60, -pillarHeight * 0.60);
  ctx.lineTo(-coreW * 0.35, -pillarHeight * 0.88);
  ctx.lineTo(0, -pillarHeight * 0.98);               // Core Spear Tip
  ctx.lineTo(coreW * 0.35, -pillarHeight * 0.85);
  ctx.lineTo(coreW * 0.60, -pillarHeight * 0.56);
  ctx.lineTo(coreW, 0);
  ctx.closePath();
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // ── 3. Vertical Supersonic Speed Needle Streaks Inside Pillar ──
  const streakCount = 8;
  for (let s = 0; s < streakCount; s++) {
    const sNorm = (s / (streakCount - 1)) * 2 - 1; // -1 to +1
    const sx = sNorm * (coreW * 0.75);
    const sSpeed = 1.2 + (s % 3) * 0.4;
    const sTravel = ((now * 0.003 * sSpeed * 60 + s * 70) % (pillarHeight * 0.85));
    const sy = -sTravel;
    const sLen = 45 + (1.0 - Math.abs(sNorm)) * 65;
    const sThick = (1.5 + (1.0 - Math.abs(sNorm)) * 1.5) * (1.0 - burstProg * 0.4);

    let sColor;
    if (s % 4 === 0) sColor = `rgba(12, 4, 10, ${(0.95 * pillarAlpha).toFixed(3)})`;
    else if (s % 4 === 1) sColor = `rgba(220, 20, 20, ${(0.92 * pillarAlpha).toFixed(3)})`;
    else if (s % 4 === 2) sColor = `rgba(255, 45, 20, ${(0.95 * pillarAlpha).toFixed(3)})`;
    else sColor = `rgba(255, 240, 240, ${(0.98 * pillarAlpha).toFixed(3)})`;

    ctx.fillStyle = sColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy - sLen / 2);
    ctx.lineTo(sx + sThick, sy);
    ctx.lineTo(sx, sy + sLen / 2);
    ctx.lineTo(sx - sThick, sy);
    ctx.closePath();
    ctx.fill();
  }

  // ── 4. Transonic Mach Vapor Expansion Discs (Horizontal Condensation Rings) ──
  // Matching the 3 stacked horizontal supersonic vapor rings in the reference image
  const ringDefs = [
    { baseY: -25,  scaleX: 1.50, scaleY: 0.32, speed: 1.0, thick: 14.0 },
    { baseY: -95,  scaleX: 1.35, scaleY: 0.28, speed: 1.15, thick: 11.0 },
    { baseY: -185, scaleX: 1.15, scaleY: 0.24, speed: 1.30, thick: 8.5 }
  ];

  for (let rIdx = 0; rIdx < ringDefs.length; rIdx++) {
    const rd = ringDefs[rIdx];
    const ringProg = Math.min(1.0, burstProg * rd.speed);
    const rx = (pillarBaseW * 0.9 + ringProg * 175 * rd.scaleX);
    const ry = rx * rd.scaleY;
    const curY = rd.baseY - ringProg * 35; // Rises slightly as sonic wave expands upward
    const ringA = Math.sin(Math.min(1.0, burstProg * 1.4) * Math.PI) * pillarAlpha * 0.88;

    if (ringA > 0.01) {
      ctx.save();
      ctx.translate(0, curY);

      // Outer Crimson Vapor Ring
      ctx.strokeStyle = `rgba(220, 20, 20, ${(0.62 * ringA).toFixed(3)})`;
      ctx.lineWidth = rd.thick * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sharp Jet-Black Void Shock Edge
      ctx.strokeStyle = `rgba(12, 4, 10, ${(0.92 * ringA).toFixed(3)})`;
      ctx.lineWidth = 2.4 * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Fiery Red / Ruby Condensation Vapor Core
      ctx.strokeStyle = `rgba(255, 45, 20, ${(0.95 * ringA).toFixed(3)})`;
      ctx.lineWidth = 1.2 * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ── 5. Vertical Ascending Micro-Lightning Tendrils ──
  const boltCount = 4;
  for (let b = 0; b < boltCount; b++) {
    const bSide = b % 2 === 0 ? -1 : 1;
    const startY = -40 - b * 90;
    const bLen = (60 + (b % 2) * 45) * (1.0 - burstProg * 0.3);
    const bx = bSide * (coreW * 0.85);

    ctx.beginPath();
    ctx.moveTo(bx, startY);
    let curX = bx, curY = startY;
    const segs = 4;
    for (let s = 1; s <= segs; s++) {
      const frac = s / segs;
      const jag = (s % 2 === 0 ? 1 : -1) * (5.5 + Math.sin(now * 0.05 + b + s) * 3.5);
      curX = bx + bSide * (frac * 14) + jag;
      curY = startY - frac * bLen;
      ctx.lineTo(curX, curY);
    }
    ctx.strokeStyle = `rgba(220, 20, 20, ${(0.92 * pillarAlpha).toFixed(3)})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 220, 220, ${(0.98 * pillarAlpha).toFixed(3)})`;
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }

  ctx.restore();
}

function _drawBankaiEruptionBurst(ctx, r, fighter, now) {
  const maxB = fighter.bankaiBurstMax || CONFIG.ichigo?.bankaiBurstFrames || 36;
  const curB = fighter.bankaiBurstTimer || 0;
  const burstProg = Math.min(1.0, Math.max(0.0, 1.0 - (curB / maxB)));
  const alpha = Math.pow(1.0 - burstProg, 0.85);

  if (alpha <= 0.01) return;

  ctx.save();

  // ── 0. Skyward Sonic Reiatsu Blast Pillar & Transonic Mach Vapor Discs ──
  _drawBankaiSkywardSonicPillar(ctx, r, burstProg, alpha, now);

  // ── 1. Concentric Expanding Shockwave Blast Rings ──
  // Ring 1: Fast Supersonic Needle Shockwave Ring
  const needleR = r + burstProg * 380;
  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.98 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.0, 4.5 * (1.0 - burstProg));
  ctx.beginPath();
  ctx.arc(0, 0, needleR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(220, 20, 20, ${(0.92 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.0, 9.5 * (1.0 - burstProg));
  ctx.beginPath();
  ctx.arc(0, 0, needleR, 0, Math.PI * 2);
  ctx.stroke();

  // Ring 2: Clean Straight Crimson Spiritual Blastwave Shock Ring
  const blastR = r + Math.pow(burstProg, 0.72) * 260;
  ctx.beginPath();
  ctx.arc(0, 0, blastR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(220, 20, 20, ${(0.90 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.5, 7.0 * (1.0 - burstProg));
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, blastR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 60, 20, ${(0.95 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.0, 3.0 * (1.0 - burstProg));
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, blastR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 255, 240, ${(0.98 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(0.8, 1.2 * (1.0 - burstProg));
  ctx.stroke();

  // Ring 3: Inner Void Implosion Shock Ring
  const innerR = r + burstProg * 140;
  ctx.strokeStyle = `rgba(10, 4, 15, ${(0.94 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.0, 14.0 * (1.0 - burstProg));
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // ── 2. Shattering Crystalline Reiatsu Diamond Shards ──
  if (fighter.bankaiShards && fighter.bankaiShards.length > 0) {
    for (let s = 0; s < fighter.bankaiShards.length; s++) {
      const shard = fighter.bankaiShards[s];
      const relX = shard.x - fighter.x;
      const relY = shard.y - fighter.y;
      const shardAlpha = (shard.life || 1.0) * alpha;

      if (shardAlpha > 0.02) {
        ctx.save();
        ctx.translate(relX, relY);
        ctx.rotate(shard.rot || 0);

        const sz = shard.size || 7.5;
        // 4-point crystalline diamond shard polygon
        ctx.beginPath();
        ctx.moveTo(0, -sz * 1.4);
        ctx.lineTo(sz * 0.65, 0);
        ctx.lineTo(0, sz * 1.4);
        ctx.lineTo(-sz * 0.65, 0);
        ctx.closePath();

        ctx.fillStyle = shard.color || '#111111';
        ctx.globalAlpha = shardAlpha;
        ctx.fill();

        ctx.strokeStyle = (s % 2 === 0) 
          ? `rgba(255, 255, 255, ${(0.95 * shardAlpha).toFixed(3)})` 
          : `rgba(220, 20, 20, ${(0.92 * shardAlpha).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  // ── 3. Swirling Shihakusho Cloth Streamers ──
  if (fighter.bankaiClothStreamers && fighter.bankaiClothStreamers.length > 0) {
    for (let c = 0; c < fighter.bankaiClothStreamers.length; c++) {
      const st = fighter.bankaiClothStreamers[c];
      const relX = st.x - fighter.x;
      const relY = st.y - fighter.y;
      const stAlpha = (st.life || 1.0) * alpha;

      if (stAlpha > 0.02) {
        ctx.save();
        ctx.translate(relX, relY);
        ctx.rotate(st.angle || 0);

        const len = st.length || 20;
        const wid = st.width || 3.5;

        ctx.beginPath();
        ctx.moveTo(-len * 0.5, 0);
        ctx.quadraticCurveTo(0, Math.sin(now * 0.03 + c) * 6, len * 0.5, 0);
        ctx.strokeStyle = (c % 3 === 0) ? `rgba(220, 20, 20, ${(0.80 * stAlpha).toFixed(3)})` : `rgba(12, 5, 14, ${(0.95 * stAlpha).toFixed(3)})`;
        ctx.lineWidth = wid;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  // ── 4. Billowing Dark Ink-Smoke & Spirit Flame Clouds ──
  const smokeCount = 8;
  for (let sm = 0; sm < smokeCount; sm++) {
    const smAngle = sm * (Math.PI * 2 / smokeCount) + 0.2;
    const smDist = r * 0.8 + burstProg * 110;
    const smX = Math.cos(smAngle) * smDist;
    const smY = Math.sin(smAngle) * smDist;
    const smR = (14 + (sm % 3) * 6) * (1.0 + burstProg * 0.9);

    const smGrad = ctx.createRadialGradient(smX, smY, 0, smX, smY, smR);
    smGrad.addColorStop(0.0, `rgba(12, 4, 10, ${(0.85 * alpha).toFixed(3)})`);
    smGrad.addColorStop(0.55, `rgba(220, 20, 20, ${(0.45 * alpha).toFixed(3)})`);
    smGrad.addColorStop(0.85, `rgba(255, 45, 20, ${(0.25 * alpha).toFixed(3)})`);
    smGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = smGrad;
    ctx.beginPath();
    ctx.arc(smX, smY, smR, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 5. Forward Supersonic Reiatsu Wind Pressure Blastwave Cone (Black-Crimson Red) ──
  const aimAngle = fighter._bankaiBurstAngle !== undefined ? fighter._bankaiBurstAngle : (fighter.gunAngle || 0);
  ctx.save();
  ctx.rotate(aimAngle);

  const windReach = r * 1.2 + burstProg * 320;
  const halfArc = 0.70; // ~40° half angle (80° total focused core wind cone)
  const windAlpha = Math.pow(1.0 - burstProg, 1.1) * alpha;

  // Pass A: Forward Conical Black-Crimson Wind Pressure Gradient Fill
  const coneGrad = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, windReach);
  coneGrad.addColorStop(0.0, `rgba(12, 4, 10, ${(0.65 * windAlpha).toFixed(3)})`);
  coneGrad.addColorStop(0.35, `rgba(220, 20, 20, ${(0.45 * windAlpha).toFixed(3)})`);
  coneGrad.addColorStop(0.70, `rgba(255, 30, 0, ${(0.22 * windAlpha).toFixed(3)})`);
  coneGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, windReach, -halfArc, halfArc);
  ctx.closePath();
  ctx.fill();

  // Pass B: Straight Black-Crimson Wind Pressure Shock Arcs
  for (let w = 0; w < 3; w++) {
    const waveR = windReach * (0.65 + w * 0.18);
    
    // Outer Crimson Glow Arc
    ctx.beginPath();
    ctx.arc(0, 0, waveR, -halfArc, halfArc);
    ctx.strokeStyle = (w % 2 === 0) 
      ? `rgba(220, 20, 20, ${(0.92 * windAlpha).toFixed(3)})` 
      : `rgba(255, 30, 20, ${(0.95 * windAlpha).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.5, (6.0 - w * 1.5) * (1.0 - burstProg));
    ctx.stroke();

    // Dark Jet-Black Core Line
    ctx.beginPath();
    ctx.arc(0, 0, waveR, -halfArc, halfArc);
    ctx.strokeStyle = `rgba(12, 4, 10, ${(0.90 * windAlpha).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.8, (2.5 - w * 0.7) * (1.0 - burstProg));
    ctx.stroke();

    // Hot Ruby-White Wavefront Accent
    ctx.beginPath();
    ctx.arc(0, 0, waveR, -halfArc, halfArc);
    ctx.strokeStyle = `rgba(255, 240, 240, ${(0.98 * windAlpha).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.6, 1.0 * (1.0 - burstProg));
    ctx.stroke();
  }

  // Pass C: Forward Supersonic Black-Crimson Wind Needles / Vapor Streaks
  const needleCount = 12;
  for (let n = 0; n < needleCount; n++) {
    const norm = (n / (needleCount - 1)) * 2 - 1; // -1 to +1
    const nAng = norm * (halfArc * 0.85);
    const nDist = (r * 1.5) + burstProg * (260 + Math.abs(norm) * 70);
    const nLen = (42 + (1 - Math.abs(norm)) * 55) * (1.0 - burstProg * 0.4);
    const nThick = (2.4 + (1 - Math.abs(norm)) * 1.6) * (1.0 - burstProg * 0.5);

    const cosN = Math.cos(nAng);
    const sinN = Math.sin(nAng);
    const perpX = -sinN;
    const perpY = cosN;

    const startX = cosN * (nDist - nLen / 2);
    const startY = sinN * (nDist - nLen / 2);
    const midX = cosN * (nDist);
    const midY = sinN * (nDist);
    const endX = cosN * (nDist + nLen / 2);
    const endY = sinN * (nDist + nLen / 2);

    let nColor;
    if (n % 4 === 0) nColor = `rgba(12, 4, 10, ${(0.95 * windAlpha).toFixed(3)})`;      // Black void needle
    else if (n % 4 === 1) nColor = `rgba(220, 20, 20, ${(0.92 * windAlpha).toFixed(3)})`; // Crimson Reiatsu
    else if (n % 4 === 2) nColor = `rgba(255, 45, 20, ${(0.95 * windAlpha).toFixed(3)})`; // Fiery red
    else nColor = `rgba(255, 245, 240, ${(0.98 * windAlpha).toFixed(3)})`;                 // Ruby-white core

    ctx.fillStyle = nColor;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(midX + perpX * (nThick / 2), midY + perpY * (nThick / 2));
    ctx.lineTo(endX, endY);
    ctx.lineTo(midX - perpX * (nThick / 2), midY - perpY * (nThick / 2));
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  ctx.restore();
}

function _drawHollowSkywardSonicPillar(ctx, r, burstProg, alpha, now) {
  // Timing: Surges violently upward into the sky upon Hollow Mask Awakening
  const pillarProg = Math.min(1.0, burstProg / 0.70);
  const pillarHeight = 140 + Math.pow(pillarProg, 0.55) * 800; // Skyward beam reaching high into the air
  const pillarBaseW = (44 + 20 * (1.0 - burstProg));
  const pillarAlpha = Math.pow(1.0 - burstProg, 0.9) * alpha;

  if (pillarAlpha <= 0.01) return;

  ctx.save();

  // ── 1. Colossal Outer Hollow Reiatsu Corona Shroud (Multi-Peak Needle Silhouette: Pure White & Jet Black) ──
  const coronaW = pillarBaseW * 1.55;
  const coronaGrad = ctx.createLinearGradient(-coronaW, 0, coronaW, 0);
  coronaGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  coronaGrad.addColorStop(0.20, `rgba(255, 255, 255, ${(0.85 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.42, `rgba(10, 10, 14, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.50, `rgba(255, 255, 255, ${(1.0 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.58, `rgba(10, 10, 14, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.80, `rgba(255, 255, 255, ${(0.85 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  // Outer Multi-Peak Needle Polygon (White-Black Hollow aesthetic)
  ctx.beginPath();
  ctx.moveTo(-coronaW, 0);
  ctx.lineTo(-coronaW * 0.75, -pillarHeight * 0.55);
  ctx.lineTo(-coronaW * 0.60, -pillarHeight * 0.52);
  ctx.lineTo(-coronaW * 0.40, -pillarHeight * 0.82);
  ctx.lineTo(-coronaW * 0.25, -pillarHeight * 0.78);
  ctx.lineTo(0, -pillarHeight);                      // Main Center Spear Peak
  ctx.lineTo(coronaW * 0.25, -pillarHeight * 0.75);
  ctx.lineTo(coronaW * 0.45, -pillarHeight * 0.80);
  ctx.lineTo(coronaW * 0.65, -pillarHeight * 0.50);
  ctx.lineTo(coronaW * 0.80, -pillarHeight * 0.54);
  ctx.lineTo(coronaW, 0);
  ctx.closePath();
  ctx.fillStyle = coronaGrad;
  ctx.fill();

  // ── 2. High-Density Black Void & Stark Bone-White Core Column ──
  const coreW = pillarBaseW * 0.75;
  const coreGrad = ctx.createLinearGradient(-coreW, 0, coreW, 0);
  coreGrad.addColorStop(0.0, 'rgba(10, 10, 14, 0.0)');
  coreGrad.addColorStop(0.20, `rgba(10, 10, 14, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.40, `rgba(255, 255, 255, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.50, `rgba(255, 255, 255, ${(1.0 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.60, `rgba(255, 255, 255, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.80, `rgba(10, 10, 14, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(1.0, 'rgba(10, 10, 14, 0.0)');

  ctx.beginPath();
  ctx.moveTo(-coreW, 0);
  ctx.lineTo(-coreW * 0.60, -pillarHeight * 0.60);
  ctx.lineTo(-coreW * 0.35, -pillarHeight * 0.88);
  ctx.lineTo(0, -pillarHeight * 0.98);               // Core Spear Tip
  ctx.lineTo(coreW * 0.35, -pillarHeight * 0.85);
  ctx.lineTo(coreW * 0.60, -pillarHeight * 0.56);
  ctx.lineTo(coreW, 0);
  ctx.closePath();
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // ── 3. Vertical Supersonic Speed Needle Streaks Inside Pillar (White-Black Lines) ──
  const streakCount = 8;
  for (let s = 0; s < streakCount; s++) {
    const sNorm = (s / (streakCount - 1)) * 2 - 1; // -1 to +1
    const sx = sNorm * (coreW * 0.75);
    const sSpeed = 1.2 + (s % 3) * 0.4;
    const sTravel = ((now * 0.003 * sSpeed * 60 + s * 70) % (pillarHeight * 0.85));
    const sy = -sTravel;
    const sLen = 45 + (1.0 - Math.abs(sNorm)) * 65;
    const sThick = (1.5 + (1.0 - Math.abs(sNorm)) * 1.5) * (1.0 - burstProg * 0.4);

    let sColor;
    if (s % 3 === 0) sColor = `rgba(10, 10, 14, ${(0.95 * pillarAlpha).toFixed(3)})`;       // Manga dark ink line
    else if (s % 3 === 1) sColor = `rgba(255, 255, 255, ${(0.98 * pillarAlpha).toFixed(3)})`; // Pure white streak
    else sColor = `rgba(225, 235, 250, ${(0.95 * pillarAlpha).toFixed(3)})`;                  // Bone white streak

    ctx.fillStyle = sColor;
    ctx.beginPath();
    ctx.moveTo(sx, sy - sLen / 2);
    ctx.lineTo(sx + sThick, sy);
    ctx.lineTo(sx, sy + sLen / 2);
    ctx.lineTo(sx - sThick, sy);
    ctx.closePath();
    ctx.fill();
  }

  // ── 4. Transonic Mach Vapor Expansion Discs (Horizontal Condensation Rings) ──
  const ringDefs = [
    { baseY: -25,  scaleX: 1.50, scaleY: 0.32, speed: 1.0, thick: 14.0 },
    { baseY: -95,  scaleX: 1.35, scaleY: 0.28, speed: 1.15, thick: 11.0 },
    { baseY: -185, scaleX: 1.15, scaleY: 0.24, speed: 1.30, thick: 8.5 }
  ];

  for (let rIdx = 0; rIdx < ringDefs.length; rIdx++) {
    const rd = ringDefs[rIdx];
    const ringProg = Math.min(1.0, burstProg * rd.speed);
    const rx = (pillarBaseW * 0.9 + ringProg * 175 * rd.scaleX);
    const ry = rx * rd.scaleY;
    const curY = rd.baseY - ringProg * 35;
    const ringA = Math.sin(Math.min(1.0, burstProg * 1.4) * Math.PI) * pillarAlpha * 0.88;

    if (ringA > 0.01) {
      ctx.save();
      ctx.translate(0, curY);

      // Outer Pure White Vapor Ring
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.72 * ringA).toFixed(3)})`;
      ctx.lineWidth = rd.thick * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sharp Jet-Black Void Shock Edge
      ctx.strokeStyle = `rgba(10, 10, 14, ${(0.95 * ringA).toFixed(3)})`;
      ctx.lineWidth = 2.4 * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Stark Pure White Condensation Vapor Core
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.98 * ringA).toFixed(3)})`;
      ctx.lineWidth = 1.2 * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ── 5. Vertical Ascending Micro-Lightning Tendrils (White-Black Theme) ──
  const boltCount = 4;
  for (let b = 0; b < boltCount; b++) {
    const bSide = b % 2 === 0 ? -1 : 1;
    const startY = -40 - b * 90;
    const bLen = (60 + (b % 2) * 45) * (1.0 - burstProg * 0.3);
    const bx = bSide * (coreW * 0.85);

    ctx.beginPath();
    ctx.moveTo(bx, startY);
    let curX = bx, curY = startY;
    const segs = 4;
    for (let s = 1; s <= segs; s++) {
      const frac = s / segs;
      const jag = (s % 2 === 0 ? 1 : -1) * (5.5 + Math.sin(now * 0.05 + b + s) * 3.5);
      curX = bx + bSide * (frac * 14) + jag;
      curY = startY - frac * bLen;
      ctx.lineTo(curX, curY);
    }
    ctx.strokeStyle = `rgba(10, 10, 14, ${(0.95 * pillarAlpha).toFixed(3)})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.98 * pillarAlpha).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();
}

function _drawHollowEruptionBurst(ctx, r, fighter, now, formationProg = 0) {
  let burstProg = formationProg;
  if (fighter.hollowBurstTimer !== undefined && fighter.hollowBurstTimer > 0) {
    const maxB = fighter.hollowBurstMax || CONFIG.ichigo?.hollowBurstFrames || 36;
    burstProg = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.hollowBurstTimer / maxB)));
  }
  const alpha = Math.pow(1.0 - burstProg, 0.85);

  if (alpha <= 0.01) return;

  ctx.save();

  // ── 0. Skyward Sonic Reiatsu Blast Pillar & Transonic Mach Vapor Discs ──
  _drawHollowSkywardSonicPillar(ctx, r, burstProg, alpha, now);

  // ── 1. Concentric Expanding Shockwave Blast Rings (White-Black Lines) ──
  // Ring 1: Fast Supersonic Needle Shockwave Ring
  const needleR = r + burstProg * 380;
  ctx.strokeStyle = `rgba(10, 10, 14, ${(0.92 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.0, 8.5 * (1.0 - burstProg));
  ctx.beginPath();
  ctx.arc(0, 0, needleR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.98 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.0, 4.0 * (1.0 - burstProg));
  ctx.beginPath();
  ctx.arc(0, 0, needleR, 0, Math.PI * 2);
  ctx.stroke();

  // Ring 2: Clean Straight Bone-White Spiritual Blastwave Shock Ring
  const blastR = r + Math.pow(burstProg, 0.72) * 260;
  ctx.beginPath();
  ctx.arc(0, 0, blastR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(10, 10, 14, ${(0.90 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.5, 6.0 * (1.0 - burstProg));
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, blastR, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.98 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.0, 2.5 * (1.0 - burstProg));
  ctx.stroke();

  // Ring 3: Inner Void Implosion Shock Ring
  const innerR = r + burstProg * 140;
  ctx.strokeStyle = `rgba(5, 5, 8, ${(0.95 * alpha).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.0, 14.0 * (1.0 - burstProg));
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // ── 2. Shattering Hollow Bone Crystalline Shards (White-Black Theme) ──
  const shardCount = 16;
  for (let s = 0; s < shardCount; s++) {
    const sAng = (s / shardCount) * Math.PI * 2 + (s * 0.2);
    const sDist = r + burstProg * (110 + (s % 3) * 40);
    const sx = Math.cos(sAng) * sDist;
    const sy = Math.sin(sAng) * sDist;
    const sz = (5.5 + (s % 3) * 2.0) * (1.0 - burstProg * 0.4);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sAng + burstProg * 2.5);

    ctx.beginPath();
    ctx.moveTo(0, -sz * 1.3);
    ctx.lineTo(sz * 0.6, 0);
    ctx.lineTo(0, sz * 1.3);
    ctx.lineTo(-sz * 0.6, 0);
    ctx.closePath();

    ctx.fillStyle = (s % 2 === 0) ? '#FFFFFF' : '#111111';
    ctx.globalAlpha = alpha;
    ctx.fill();

    ctx.strokeStyle = (s % 2 === 0) 
      ? `rgba(10, 10, 14, ${(0.95 * alpha).toFixed(3)})` 
      : `rgba(255, 255, 255, ${(0.98 * alpha).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  // ── 3. Billowing Dark Ink-Smoke & Spirit Flame Clouds (Monochrome Theme) ──
  const smokeCount = 8;
  for (let sm = 0; sm < smokeCount; sm++) {
    const smAngle = sm * (Math.PI * 2 / smokeCount) + 0.2;
    const smDist = r * 0.8 + burstProg * 110;
    const smX = Math.cos(smAngle) * smDist;
    const smY = Math.sin(smAngle) * smDist;
    const smR = (14 + (sm % 3) * 6) * (1.0 + burstProg * 0.9);

    const smGrad = ctx.createRadialGradient(smX, smY, 0, smX, smY, smR);
    smGrad.addColorStop(0.0, `rgba(10, 10, 14, ${(0.85 * alpha).toFixed(3)})`);
    smGrad.addColorStop(0.55, `rgba(40, 40, 50, ${(0.45 * alpha).toFixed(3)})`);
    smGrad.addColorStop(0.85, `rgba(255, 255, 255, ${(0.22 * alpha).toFixed(3)})`);
    smGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = smGrad;
    ctx.beginPath();
    ctx.arc(smX, smY, smR, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 4. Forward Supersonic Hollow Wind Pressure Blastwave Cone (White-Black Lines) ──
  const aimAngle = fighter.gunAngle || 0;
  ctx.save();
  ctx.rotate(aimAngle);

  const windReach = r * 1.2 + burstProg * 320;
  const halfArc = 0.70; // ~40° half angle (80° total focused core wind cone)
  const windAlpha = Math.pow(1.0 - burstProg, 1.1) * alpha;

  // Pass A: Forward Conical Black-White Wind Pressure Gradient Fill
  const coneGrad = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, windReach);
  coneGrad.addColorStop(0.0, `rgba(10, 10, 14, ${(0.65 * windAlpha).toFixed(3)})`);
  coneGrad.addColorStop(0.35, `rgba(30, 30, 40, ${(0.45 * windAlpha).toFixed(3)})`);
  coneGrad.addColorStop(0.70, `rgba(255, 255, 255, ${(0.22 * windAlpha).toFixed(3)})`);
  coneGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, windReach, -halfArc, halfArc);
  ctx.closePath();
  ctx.fill();

  // Pass B: Straight White-Black Wind Pressure Shock Arcs
  for (let w = 0; w < 3; w++) {
    const waveR = windReach * (0.65 + w * 0.18);
    
    // Outer Pure White Glow Arc
    ctx.beginPath();
    ctx.arc(0, 0, waveR, -halfArc, halfArc);
    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * windAlpha).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.5, (5.5 - w * 1.4) * (1.0 - burstProg));
    ctx.stroke();

    // Dark Jet-Black Core Line
    ctx.beginPath();
    ctx.arc(0, 0, waveR, -halfArc, halfArc);
    ctx.strokeStyle = `rgba(10, 10, 14, ${(0.92 * windAlpha).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.8, (2.2 - w * 0.6) * (1.0 - burstProg));
    ctx.stroke();
  }

  // Pass C: Forward Supersonic White-Black Wind Needles
  const needleCount = 12;
  for (let n = 0; n < needleCount; n++) {
    const norm = (n / (needleCount - 1)) * 2 - 1; // -1 to +1
    const nAng = norm * (halfArc * 0.85);
    const nDist = (r * 1.5) + burstProg * (260 + Math.abs(norm) * 70);
    const nLen = (42 + (1 - Math.abs(norm)) * 55) * (1.0 - burstProg * 0.4);
    const nThick = (2.4 + (1 - Math.abs(norm)) * 1.6) * (1.0 - burstProg * 0.5);

    const cosN = Math.cos(nAng);
    const sinN = Math.sin(nAng);
    const perpX = -sinN;
    const perpY = cosN;

    const startX = cosN * (nDist - nLen / 2);
    const startY = sinN * (nDist - nLen / 2);
    const midX = cosN * (nDist);
    const midY = sinN * (nDist);
    const endX = cosN * (nDist + nLen / 2);
    const endY = sinN * (nDist + nLen / 2);

    let nColor;
    if (n % 3 === 0) nColor = `rgba(10, 10, 14, ${(0.95 * windAlpha).toFixed(3)})`;       // Black void needle
    else if (n % 3 === 1) nColor = `rgba(255, 255, 255, ${(0.98 * windAlpha).toFixed(3)})`; // Pure white needle
    else nColor = `rgba(225, 235, 250, ${(0.95 * windAlpha).toFixed(3)})`;                  // Bone white needle

    ctx.fillStyle = nColor;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(midX + perpX * (nThick / 2), midY + perpY * (nThick / 2));
    ctx.lineTo(endX, endY);
    ctx.lineTo(midX - perpX * (nThick / 2), midY - perpY * (nThick / 2));
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  ctx.restore();
}

function _drawBankaiActiveFlameWisps(ctx, r, now) {
  ctx.save();
  const wispCount = 6;
  for (let w = 0; w < wispCount; w++) {
    const wProg = ((now * 0.0028 + w * (1.0 / wispCount)) % 1.0);
    const wAng = (w / wispCount) * Math.PI * 2 + Math.sin(now * 0.012 + w) * 0.30;
    const wDist = r * (0.85 + 0.40 * wProg);
    const wx = Math.cos(wAng) * wDist;
    const wy = Math.sin(wAng) * wDist - wProg * 22; // rises upward
    const wR = (3.8 + (w % 2) * 2.2) * (1.0 - wProg * 0.65);
    const wAlpha = Math.sin(wProg * Math.PI) * 0.88;

    const wGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, wR * 1.6);
    wGrad.addColorStop(0.0, `rgba(255, 255, 255, ${(0.98 * wAlpha).toFixed(3)})`);
    wGrad.addColorStop(0.35, (w % 2 === 0) ? `rgba(255, 40, 30, ${(0.92 * wAlpha).toFixed(3)})` : `rgba(220, 20, 40, ${(0.92 * wAlpha).toFixed(3)})`);
    wGrad.addColorStop(0.70, `rgba(15, 2, 8, ${(0.75 * wAlpha).toFixed(3)})`);
    wGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.arc(wx, wy, wR * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floating Hot Core Particle Sparkles
  const sparkCount = 2;
  for (let s = 0; s < sparkCount; s++) {
    const sProg = ((now * 0.003 + s * (1.0 / sparkCount)) % 1.0);
    const sAng = (s * 2.2 + now * 0.004) % (Math.PI * 2);
    const sDist = r * (0.95 + 0.35 * (1.0 - sProg * 0.4));
    const sx = Math.cos(sAng) * sDist;
    const sy = Math.sin(sAng) * sDist - sProg * 20;
    const sR = (1.8 + (s % 2) * 0.8) * (1.0 - sProg * 0.3);
    const sAlpha = Math.sin(sProg * Math.PI) * 0.90;

    if (sAlpha > 0.02) {
      const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sR * 2.2);
      sGrad.addColorStop(0.0, 'rgba(5, 5, 8, 1.0)');
      sGrad.addColorStop(0.45, 'rgba(255, 40, 30, 0.95)');
      sGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, sR * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // High-contrast jet-black core
      ctx.fillStyle = '#050508';
      ctx.beginPath();
      ctx.arc(sx, sy, sR * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function _drawIchigoHand(ctx, hx, hy, skinColor, isShikai) {
  const handR = getHandSize ? getHandSize(6.5) : 6.5;

  ctx.save();
  ctx.translate(hx, hy);

  // Shihakusho black wrist sleeve cuff
  ctx.fillStyle = '#111111';
  ctx.fillRect(-handR - 4, -handR * 0.9, 5.5, handR * 1.8);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-handR - 4, -handR * 0.9, 5.5, handR * 1.8);

  // White cloth bandages on wrist for Shikai
  if (isShikai) {
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let bx = -handR - 3; bx < -handR + 1; bx += 2.5) {
      ctx.moveTo(bx, -handR * 0.8);
      ctx.lineTo(bx + 1.2, handR * 0.8);
    }
    ctx.stroke();
  }

  // Clenched fist / hand base
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, handR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Clenched knuckle creases
  ctx.strokeStyle = 'rgba(160, 90, 50, 0.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-handR * 0.2, -handR * 0.5);
  ctx.lineTo(handR * 0.4, -handR * 0.3);
  ctx.moveTo(-handR * 0.2, 0);
  ctx.lineTo(handR * 0.5, 0);
  ctx.moveTo(-handR * 0.2, handR * 0.5);
  ctx.lineTo(handR * 0.4, handR * 0.3);
  ctx.stroke();

  ctx.restore();
}

export function getZangetsuPommelWorldPos(fighter, isBankai = false) {
  if (!fighter) return { x: 0, y: 0 };
  const r = fighter.r || 25;
  const angle = fighter.gunAngle || 0;
  const facingLeft = Math.abs(angle) > Math.PI / 2;

  const isFrozen = Boolean(
    fighter.isFrozenByInfinity ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isTargetOfAmbush
  );

  const isBackSlungPose = Boolean(
    fighter._isWinnerReveal || 
    (typeof state !== 'undefined' && (
      state.gameState === 'faceoff' ||
      state.gameState === 'weaponIndex' || 
      state.gameState === 'characterSelect' || 
      state.gameState === 'indexDetail' || 
      state._isFaceOffScreenActive ||
      state.isRandomRollShowoff
    )) ||
    fighter.isDemoFighter ||
    fighter._isFaceOff
  );

  const isBankaiChanneling = Boolean(fighter.isChannelingBankai && fighter.bankaiChargeTimer > 0);
  const isChanneling = Boolean(fighter.isChannelingGetsuga && fighter.getsugaChargeTimer > 0);
  const isSlashing = Boolean(fighter.slashSwingTimer > 0);
  const isBankaiForm = Boolean(isBankai || fighter.bankaiActive || fighter.skin === 'bankai' || fighter.skin === 'bankai_mask');
  const isBankaiStance = isBackSlungPose && isBankaiForm;
  const maxT = fighter.slashSwingMaxTimer || 22;
  const rawSlashProg = isSlashing ? Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT))) : 0;

  let swingAngle = -0.16;
  let thrustDistance = 0;
  let bodyShiftX = 0;
  let bodyTilt = 0;

  if (isBankaiChanneling) {
    const maxB = fighter.bankaiChargeMax || CONFIG.ichigo?.bankaiChargeFrames || 50;
    const bankaiProg = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.bankaiChargeTimer || 0) / maxB)));
    const raiseProg = Math.min(1.0, bankaiProg / 0.48);
    const raiseEase = raiseProg * raiseProg * (3 - 2 * raiseProg);
    const bankaiTremble = Math.sin(Date.now() * 0.075) * 0.025 * (0.3 + 0.7 * bankaiProg);

    swingAngle = 0.55 * (1.0 - raiseEase) + bankaiTremble;
    thrustDistance = -2.0 + 9.0 * raiseEase;
    bodyShiftX = -1.5 + 4.5 * raiseEase;
    bodyTilt = 0.03 * raiseEase + bankaiTremble * 0.4;
  } else if (isChanneling) {
    const chargeMax = fighter.getsugaChargeMax || CONFIG.ichigo?.getsugaChargeFrames || 50;
    const chargeProg = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.getsugaChargeTimer || 0) / chargeMax)));
    const liftEase = Math.min(1.0, chargeProg * 1.7);
    const smoothLift = liftEase * liftEase * (3 - 2 * liftEase);
    const chargeTremble = Math.sin(Date.now() * 0.045) * 0.04 * (0.3 + 0.7 * chargeProg);

    swingAngle = -0.16 + (-2.10 - (-0.16)) * smoothLift + chargeTremble;
    thrustDistance = -4 - 6 * smoothLift;
    bodyShiftX = -1.5 - 3.0 * smoothLift;
    bodyTilt = -0.04 - 0.08 * smoothLift + chargeTremble * 0.5;
  } else if (isSlashing) {
    if (fighter.isGetsugaSlash) {
      const slashPhase = 0.20;
      if (rawSlashProg < slashPhase) {
        const p = rawSlashProg / slashPhase;
        const sweepCurve = p * p * (3 - 2 * p);
        swingAngle = -2.10 + (1.35 - (-2.10)) * sweepCurve;
        thrustDistance = -10 + 26 * Math.sin(p * Math.PI * 0.5);
        bodyShiftX = -4.5 + 9.5 * Math.sin(p * Math.PI * 0.5);
        bodyTilt = -0.12 + 0.20 * Math.sin(p * Math.PI * 0.5);
      } else {
        const p = (rawSlashProg - slashPhase) / (1.0 - slashPhase);
        const easeP = 0.5 + 0.5 * Math.cos(p * Math.PI);
        swingAngle = -0.16 + (1.35 - (-0.16)) * easeP;
        thrustDistance = 16 * easeP;
        bodyShiftX = 5.0 * easeP;
        bodyTilt = 0.08 * easeP;
      }
    } else {
      if (rawSlashProg < 0.10) {
        const p = rawSlashProg / 0.10;
        const easeP = p * (2 - p);
        swingAngle = -0.16 + (-1.35 - (-0.16)) * easeP;
        thrustDistance = -8 * easeP;
        bodyShiftX = -2.5 * easeP;
        bodyTilt = -0.05 * easeP;
      } else if (rawSlashProg < 0.55) {
        const p = (rawSlashProg - 0.10) / 0.45;
        const sweepCurve = p * p * (3 - 2 * p);
        swingAngle = -1.35 + (1.20 - (-1.35)) * sweepCurve;
        thrustDistance = -8 + 22 * Math.sin(p * Math.PI * 0.5);
        bodyShiftX = -2.5 + 6.5 * Math.sin(p * Math.PI * 0.5);
        bodyTilt = -0.05 + 0.10 * Math.sin(p * Math.PI * 0.5);
      } else {
        const p = (rawSlashProg - 0.55) / 0.45;
        const easeP = 0.5 + 0.5 * Math.cos(p * Math.PI);
        swingAngle = -0.16 + (1.20 - (-0.16)) * easeP;
        thrustDistance = 14 * easeP;
        bodyShiftX = 4.0 * easeP;
      }
    }
  } else if (isBankaiStance) {
    swingAngle = 2.65;
    thrustDistance = 0;
    bodyShiftX = 0;
  } else if (isBackSlungPose) {
    swingAngle = facingLeft ? (Math.PI - Math.PI / 4.2) : (Math.PI / 4.2);
    thrustDistance = 0;
  } else if ((fighter.blockPoseTimer && fighter.blockPoseTimer > 0) || (fighter.parryHitAnimTimer && fighter.parryHitAnimTimer > 0)) {
    const pStance = fighter.parryStanceIndex || 0;
    let parryAngle = -1.15;
    if (pStance === 1) parryAngle = 1.30;
    else if (pStance === 2) parryAngle = 1.57;
    else if (pStance === 3) parryAngle = -0.78;

    if (fighter.parryHitAnimTimer && fighter.parryHitAnimTimer > 0) {
      const pProg = fighter.parryHitAnimTimer / 18;
      const jitter = Math.sin(pProg * Math.PI * 4) * 0.12 * pProg;
      swingAngle = parryAngle + jitter;
      thrustDistance = -6 * pProg;
      bodyShiftX = -3 * pProg;
      bodyTilt = -0.06 * pProg;
    } else {
      swingAngle = parryAngle;
      thrustDistance = -3;
      bodyShiftX = -1.5;
      bodyTilt = -0.03;
    }
  } else {
    swingAngle = -0.16;
    thrustDistance = 0;
  }

  const swordStartX = isBankaiStance ? (r * 1.05) : ((isSlashing || !isBackSlungPose) ? (r * (isBankaiForm ? 0.65 : 0.68)) : (-r * (isBankaiForm ? 0.65 : 0.72)));
  const scale = isBankaiForm ? 1.0 : 0.90;
  const hiltOffset = isBankaiForm ? (32 + 4.2) : (32 * scale);

  // Exact 1:1 forward kinematics matching renderZangetsu:
  const innerX = swordStartX - hiltOffset;
  const innerY = 0;
  const theta = swingAngle + bodyTilt;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  const localX = innerX * cosT - innerY * sinT + (thrustDistance + bodyShiftX);
  let localY = innerX * sinT + innerY * cosT;

  // Apply facing flip
  if (facingLeft) {
    localY = -localY;
  }
  if (isBankaiStance) {
    localY = -localY;
  }

  // Apply fighter body angle
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const worldX = fighter.x + (localX * cosA - localY * sinA);
  const worldY = fighter.y + (localX * sinA + localY * cosA);

  return { x: worldX, y: worldY };
}

const _ZANGETSU_STRAND_CONFIGS = [
  {
    // Strand 0: Longest primary flowing sash (trails gracefully behind, high physical inertia)
    nodes: 14,
    linkDist: 5.5,
    damping: 0.94,
    gravity: 0.12,
    flutterSpeed: 0.003,
    flutterAmp: 0.8,
    flutterPhase: 0.0,
    lateralDrift: 0.8,
    width: 3.8,
    color: '#FFFFFF',
    rootOffset: 0.0
  },
  {
    // Strand 1: Medium secondary ribbon (fluttering alongside with air turbulence)
    nodes: 10,
    linkDist: 4.8,
    damping: 0.93,
    gravity: 0.10,
    flutterSpeed: 0.004,
    flutterAmp: 0.6,
    flutterPhase: 2.1,
    lateralDrift: -0.8,
    width: 2.8,
    color: '#F4F4F4',
    rootOffset: 2.0
  },
  {
    // Strand 2: Shorter loose wrap tail (rippling with micro-curls and high frequency)
    nodes: 7,
    linkDist: 4.2,
    damping: 0.92,
    gravity: 0.14,
    flutterSpeed: 0.005,
    flutterAmp: 0.5,
    flutterPhase: 4.5,
    lateralDrift: 0.8,
    width: 2.2,
    color: '#E8E8E8',
    rootOffset: -2.0
  }
];

export function updateZangetsuRibbonPhysics(fighter) {
  if (!fighter) return;

  // Skip Shikai ribbon physics when in Bankai form (ribbons not visible)
  if (fighter.bankaiActive || fighter.skin === 'bankai') return;

  const isFrozen = Boolean(
    fighter.isFrozenByInfinity ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isTargetOfAmbush
  );

  const pommel = getZangetsuPommelWorldPos(fighter);
  const angle = fighter.gunAngle || 0;

  // 1. Calculate Real Kinematic Movement & Velocity of the Pommel in World Space
  const prevPommelX = fighter._prevPommelX ?? pommel.x;
  const prevPommelY = fighter._prevPommelY ?? pommel.y;
  const pommelVx = isFrozen ? 0 : (pommel.x - prevPommelX);
  const pommelVy = isFrozen ? 0 : (pommel.y - prevPommelY);
  fighter._prevPommelX = pommel.x;
  fighter._prevPommelY = pommel.y;

  // 2. Calculate Sword Angular Velocity (Rotational Whip Dynamics)
  const prevAngle = fighter._prevRibbonAngle ?? angle;
  let angleDelta = isFrozen ? 0 : (angle - prevAngle);
  while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
  while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
  fighter._prevRibbonAngle = angle;

  // Tangential whip impulse from sword rotations (subdued for clean stability)
  const whipX = -Math.sin(angle) * angleDelta * 18;
  const whipY = Math.cos(angle) * angleDelta * 18;
  const centrifX = Math.cos(angle) * Math.abs(angleDelta) * 12;
  const centrifY = Math.sin(angle) * Math.abs(angleDelta) * 12;

  const spd = Math.hypot(pommelVx, pommelVy);

  // Perpendicular vector for lateral cloth fanout & wind separation
  let perpX, perpY;
  if (spd > 0.3) {
    perpX = -pommelVy / spd;
    perpY = pommelVx / spd;
  } else {
    perpX = -Math.sin(angle);
    perpY = Math.cos(angle);
  }

  // Initialize strands if not created or if node counts mismatch
  if (!fighter.ribbonStrands || fighter.ribbonStrands.length !== 3 || fighter.ribbonStrands[0].length !== _ZANGETSU_STRAND_CONFIGS[0].nodes) {
    fighter.ribbonStrands = [];
    for (let s = 0; s < 3; s++) {
      const cfg = _ZANGETSU_STRAND_CONFIGS[s];
      const nodes = [];
      const rx = pommel.x + perpX * cfg.rootOffset;
      const ry = pommel.y + perpY * cfg.rootOffset;

      for (let i = 0; i < cfg.nodes; i++) {
        const nx = rx - i * cfg.linkDist * Math.cos(angle) + perpX * (cfg.lateralDrift * (i / cfg.nodes));
        const ny = ry - i * cfg.linkDist * Math.sin(angle) + perpY * (cfg.lateralDrift * (i / cfg.nodes));
        nodes.push({
          x: nx,
          y: ny,
          prevX: nx,
          prevY: ny
        });
      }
      fighter.ribbonStrands.push(nodes);
    }
  }

  // If frozen, keep strand roots perfectly locked to pommel and maintain their rigid frozen shape
  if (isFrozen) {
    for (let s = 0; s < 3; s++) {
      const cfg = _ZANGETSU_STRAND_CONFIGS[s];
      const strand = fighter.ribbonStrands[s];
      if (!strand || strand.length < 2) continue;

      const rootX = pommel.x + perpX * cfg.rootOffset;
      const rootY = pommel.y + perpY * cfg.rootOffset;
      const dx = rootX - strand[0].x;
      const dy = rootY - strand[0].y;
      if (dx !== 0 || dy !== 0) {
        for (let i = 0; i < strand.length; i++) {
          strand[i].x += dx;
          strand[i].y += dy;
          strand[i].prevX = strand[i].x;
          strand[i].prevY = strand[i].y;
        }
      }
    }
    return;
  }

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const substeps = 2;

  // Run 2 physics substeps per frame for ultra-smooth cloth simulation
  for (let sub = 0; sub < substeps; sub++) {
    for (let s = 0; s < 3; s++) {
      const cfg = _ZANGETSU_STRAND_CONFIGS[s];
      const strand = fighter.ribbonStrands[s];
      if (!strand || strand.length < 2) continue;

      // Unique root attachment offset along the hilt wrap
      const rootX = pommel.x + perpX * cfg.rootOffset;
      const rootY = pommel.y + perpY * cfg.rootOffset;
      strand[0].x = rootX;
      strand[0].y = rootY;
      strand[0].prevX = rootX;
      strand[0].prevY = rootY;

      // Teleport or extreme stretch safety: if strand head moved too far, smoothly re-anchor nodes
      const _tdx = strand[0].x - (strand[1] ? strand[1].x : strand[0].x), _tdy = strand[0].y - (strand[1] ? strand[1].y : strand[0].y);
      if (strand[1] && (_tdx * _tdx + _tdy * _tdy) > 5625) { // 75^2
        for (let i = 1; i < strand.length; i++) {
          const nx = rootX - i * cfg.linkDist * Math.cos(angle);
          const ny = rootY - i * cfg.linkDist * Math.sin(angle);
          strand[i].x = nx;
          strand[i].y = ny;
          strand[i].prevX = nx;
          strand[i].prevY = ny;
        }
      }

      for (let i = 1; i < strand.length; i++) {
        const node = strand[i];
        const tailWeight = i / cfg.nodes;

        // Gentle, calm wave ripple propagating along the ribbon (subdued wiggle)
        const isCalmPose = isFrozen || Boolean(fighter._isWinnerReveal || (typeof state !== 'undefined' && (state.gameState === 'champion' || state.gameState === 'faceoff' || state.gameState === 'characterSelect')));
        const ampMult = isCalmPose ? 0.20 : 1.0;
        const wave = Math.sin(now * cfg.flutterSpeed - i * 0.45 + cfg.flutterPhase) * (cfg.flutterAmp * ampMult * (0.2 + 0.8 * tailWeight));
        const waveX = perpX * wave;
        const waveY = perpY * wave;

        // Aerodynamic drag opposing pommel movement + rotational whip
        const dragX = -pommelVx * 0.35 * (0.3 + 0.7 * tailWeight) + (whipX + centrifX) * tailWeight * 0.35;
        const dragY = -pommelVy * 0.35 * (0.3 + 0.7 * tailWeight) + (whipY + centrifY) * tailWeight * 0.35 + cfg.gravity * (0.4 + 0.6 * tailWeight);

        // Verlet velocity integration
        const vx = (node.x - (node.prevX ?? node.x)) * cfg.damping + (dragX + waveX) * 0.35;
        const vy = (node.y - (node.prevY ?? node.y)) * cfg.damping + (dragY + waveY) * 0.35;

        node.prevX = node.x;
        node.prevY = node.y;
        node.x += vx;
        node.y += vy;
      }

      // Distance Constraint Relaxation (Taut cloth links without elastic bounce)
      const linkDist = cfg.linkDist;
      for (let iter = 0; iter < 5; iter++) {
        for (let i = 1; i < strand.length; i++) {
          const prev = strand[i - 1];
          const node = strand[i];
          const dx = node.x - prev.x;
          const dy = node.y - prev.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

          if (dist !== linkDist) {
            const delta = (dist - linkDist) / dist;
            if (i === 1) {
              node.x -= dx * delta;
              node.y -= dy * delta;
            } else {
              node.x -= dx * delta * 0.55;
              node.y -= dy * delta * 0.55;
              prev.x += dx * delta * 0.45;
              prev.y += dy * delta * 0.45;
            }
          }
        }
      }
    }
  }
}

/**
 * Updates dynamic physics for Tensa Zangetsu's Kusari broken black chain.
 * Implements full Verlet integration, heavy iron gravity, aerodynamic drag,
 * rotational centrifugal whip, and rigid link relaxation constraints.
 */
export function updateTensaZangetsuChainPhysics(fighter) {
  if (!fighter) return;

  // Only run chain physics when Bankai is active
  if (!fighter.bankaiActive && fighter.skin !== 'bankai') {
    fighter.bankaiChainNodes = null;
    return;
  }

  const isFrozen = Boolean(
    fighter.isFrozenByInfinity ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isTargetOfAmbush
  );

  const pommel = getZangetsuPommelWorldPos(fighter, true);
  const angle = fighter.gunAngle || 0;

  // 1. Calculate Real Kinematic Movement & Velocity of the Pommel in World Space
  const prevChainX = fighter._prevChainX ?? pommel.x;
  const prevChainY = fighter._prevChainY ?? pommel.y;
  const chainVx = isFrozen ? 0 : (pommel.x - prevChainX);
  const chainVy = isFrozen ? 0 : (pommel.y - prevChainY);
  fighter._prevChainX = pommel.x;
  fighter._prevChainY = pommel.y;

  // 2. Calculate Sword Angular Velocity (Rotational Whip Dynamics)
  const prevAngle = fighter._prevChainAngle ?? angle;
  let angleDelta = isFrozen ? 0 : (angle - prevAngle);
  while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
  while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
  fighter._prevChainAngle = angle;

  // Tangential whip impulse from sword rotations
  const whipX = -Math.sin(angle) * angleDelta * 38;
  const whipY = Math.cos(angle) * angleDelta * 38;
  const centrifX = Math.cos(angle) * Math.abs(angleDelta) * 22;
  const centrifY = Math.sin(angle) * Math.abs(angleDelta) * 22;

  const chainNodeCount = 13;
  const linkDist = 3.2;

  // Initialize chain nodes if missing or count mismatch
  if (!fighter.bankaiChainNodes || fighter.bankaiChainNodes.length !== chainNodeCount) {
    fighter.bankaiChainNodes = [];
    for (let i = 0; i < chainNodeCount; i++) {
      const nx = pommel.x - i * linkDist * Math.cos(angle);
      const ny = pommel.y + i * linkDist * 0.8;
      fighter.bankaiChainNodes.push({
        x: nx,
        y: ny,
        prevX: nx,
        prevY: ny
      });
    }
  }

  const nodes = fighter.bankaiChainNodes;

  // If frozen, pin root to pommel and translate all links
  if (isFrozen) {
    const dx = pommel.x - nodes[0].x;
    const dy = pommel.y - nodes[0].y;
    if (dx !== 0 || dy !== 0) {
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].x += dx;
        nodes[i].y += dy;
        nodes[i].prevX = nodes[i].x;
        nodes[i].prevY = nodes[i].y;
      }
    }
    return;
  }

  const substeps = 2;
  const damping = 0.88;
  const gravity = 0.40; // Heavy iron gravity pull down

  for (let sub = 0; sub < substeps; sub++) {
    // Pin root strictly to pommel ring
    nodes[0].x = pommel.x;
    nodes[0].y = pommel.y;
    nodes[0].prevX = pommel.x;
    nodes[0].prevY = pommel.y;

    // Teleport check: if node[1] drifted wildly (> 80px), snap chain to pommel
    if (nodes[1]) {
      const _cdx = nodes[0].x - nodes[1].x, _cdy = nodes[0].y - nodes[1].y;
      if (_cdx * _cdx + _cdy * _cdy > 6400) { // 80^2
        for (let i = 1; i < nodes.length; i++) {
          const nx = pommel.x - i * linkDist * Math.cos(angle);
          const ny = pommel.y + i * linkDist * 0.8;
          nodes[i].x = nx;
          nodes[i].y = ny;
          nodes[i].prevX = nx;
          nodes[i].prevY = ny;
        }
      }
    }

    // Verlet integration with inertia, aerodynamic drag & gravity
    for (let i = 1; i < nodes.length; i++) {
      const node = nodes[i];
      const tailWeight = i / chainNodeCount;

      const dragX = -chainVx * 0.35 * (0.3 + 0.7 * tailWeight) + (whipX + centrifX) * tailWeight * 0.55;
      const dragY = -chainVy * 0.35 * (0.3 + 0.7 * tailWeight) + (whipY + centrifY) * tailWeight * 0.55 + gravity * (0.5 + 0.5 * tailWeight);

      const vx = (node.x - (node.prevX ?? node.x)) * damping + dragX * 0.45;
      const vy = (node.y - (node.prevY ?? node.y)) * damping + dragY * 0.45;

      node.prevX = node.x;
      node.prevY = node.y;
      node.x += vx;
      node.y += vy;
    }

    // Distance Constraint Relaxation (rigid iron chain links)
    for (let iter = 0; iter < 6; iter++) {
      for (let i = 1; i < nodes.length; i++) {
        const prev = nodes[i - 1];
        const node = nodes[i];
        const dx = node.x - prev.x;
        const dy = node.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

        if (dist !== linkDist) {
          const delta = (dist - linkDist) / dist;
          if (i === 1) {
            node.x -= dx * delta;
            node.y -= dy * delta;
          } else {
            node.x -= dx * delta * 0.60;
            node.y -= dy * delta * 0.60;
            prev.x += dx * delta * 0.40;
            prev.y += dy * delta * 0.40;
          }
        }
      }
    }
  }
}

/**
 * Draws dynamic Kusari chain links along the simulated physics nodes with batched drawing.
 */
function _drawDynamicBankaiChain(ctx, nodes, isMask) {
  if (!nodes || nodes.length < 2) return;

  const len = nodes.length - 1;
  const strokeOuter = isMask ? '#5A1212' : '#0D0D12';
  const strokeGleam = isMask ? 'rgba(255, 60, 0, 0.70)' : 'rgba(150, 160, 185, 0.60)';

  // 1. Batched outer iron links
  ctx.strokeStyle = strokeOuter;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i < len; i++) {
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const mx = (p1.x + p2.x) * 0.5;
    const my = (p1.y + p2.y) * 0.5;
    const pdx = p2.x - p1.x;
    const pdy = p2.y - p1.y;
    const ang = Math.atan2(pdy, pdx);
    const dist = Math.sqrt(pdx * pdx + pdy * pdy);
    const isOdd = (i % 2 === 1);
    const linkRx = Math.max(1.8, dist * 0.55);
    const linkRy = isOdd ? 1.0 : 1.7;

    ctx.ellipse(mx, my, linkRx, linkRy, ang, 0, Math.PI * 2);
  }
  ctx.stroke();

  // 2. Batched specular metallic gleam
  ctx.strokeStyle = strokeGleam;
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  for (let i = 0; i < len; i++) {
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const mx = (p1.x + p2.x) * 0.5;
    const my = (p1.y + p2.y) * 0.5;
    const pdx = p2.x - p1.x;
    const pdy = p2.y - p1.y;
    const ang = Math.atan2(pdy, pdx);
    const dist = Math.sqrt(pdx * pdx + pdy * pdy);
    const isOdd = (i % 2 === 1);
    const linkRx = Math.max(1.8, dist * 0.55);
    const linkRy = isOdd ? 1.0 : 1.7;

    ctx.ellipse(mx, my, linkRx * 0.65, linkRy * 0.5, ang, -Math.PI * 0.75, -Math.PI * 0.15);
  }
  ctx.stroke();
}

// ── 12-Sector Seamless Anatomical Shards for Hollow Mask Assembly Formation ──
const _MASK_FORMATION_SHARDS = [
  // 0. Top Forehead Central Crown
  {
    name: 'crest_top',
    poly: [[0.34, 0.00], [0.66, 0.00], [0.60, 0.24], [0.40, 0.24]],
    startDir: { x: 0.0, y: -1.0 },
    rot: -0.18,
    delay: 0.00
  },
  // 1. Top Left Temple Horn Spike
  {
    name: 'horn_left',
    poly: [[0.00, 0.00], [0.34, 0.00], [0.40, 0.24], [0.08, 0.26]],
    startDir: { x: -0.75, y: -0.65 },
    rot: 0.25,
    delay: 0.04
  },
  // 2. Top Right Temple Horn Spike (Crimson Stripes)
  {
    name: 'horn_right',
    poly: [[0.66, 0.00], [1.00, 0.00], [0.92, 0.26], [0.60, 0.24]],
    startDir: { x: 0.75, y: -0.65 },
    rot: -0.25,
    delay: 0.04
  },
  // 3. Left Brow & Upper Eye Socket
  {
    name: 'brow_left',
    poly: [[0.08, 0.26], [0.50, 0.24], [0.50, 0.39], [0.10, 0.41]],
    startDir: { x: -0.95, y: -0.30 },
    rot: 0.20,
    delay: 0.08
  },
  // 4. Right Brow & Upper Eye Socket (Crimson Stripes)
  {
    name: 'brow_right',
    poly: [[0.50, 0.24], [0.92, 0.26], [0.90, 0.41], [0.50, 0.39]],
    startDir: { x: 0.95, y: -0.30 },
    rot: -0.20,
    delay: 0.08
  },
  // 5. Left Cheek & Bone-White Plate
  {
    name: 'cheek_left',
    poly: [[0.06, 0.41], [0.44, 0.39], [0.44, 0.59], [0.08, 0.60]],
    startDir: { x: -1.0, y: 0.20 },
    rot: -0.22,
    delay: 0.12
  },
  // 6. Right Cheek & Visored Sunburst Plate
  {
    name: 'cheek_right',
    poly: [[0.56, 0.39], [0.94, 0.41], [0.92, 0.60], [0.56, 0.59]],
    startDir: { x: 1.0, y: 0.20 },
    rot: 0.22,
    delay: 0.12
  },
  // 7. Central Nasal Ridge Bone / Center Divider
  {
    name: 'nose_bridge',
    poly: [[0.44, 0.39], [0.56, 0.39], [0.56, 0.59], [0.44, 0.59]],
    startDir: { x: 0.0, y: -0.70 },
    rot: 0.15,
    delay: 0.15
  },
  // 8. Upper Gritted Teeth Row
  {
    name: 'upper_teeth',
    poly: [[0.14, 0.59], [0.86, 0.59], [0.80, 0.74], [0.20, 0.74]],
    startDir: { x: 0.0, y: 0.75 },
    rot: -0.12,
    delay: 0.18
  },
  // 9. Lower Left Jaw & Teeth
  {
    name: 'jaw_left',
    poly: [[0.16, 0.74], [0.50, 0.74], [0.50, 0.90], [0.26, 0.88]],
    startDir: { x: -0.70, y: 0.70 },
    rot: 0.22,
    delay: 0.22
  },
  // 10. Lower Right Jaw & Teeth (Crimson Marks)
  {
    name: 'jaw_right',
    poly: [[0.50, 0.74], [0.84, 0.74], [0.74, 0.88], [0.50, 0.90]],
    startDir: { x: 0.70, y: 0.70 },
    rot: -0.22,
    delay: 0.22
  },
  // 11. Pointed Chin Tip Vertex
  {
    name: 'chin_tip',
    poly: [[0.26, 0.88], [0.74, 0.88], [0.50, 1.00]],
    startDir: { x: 0.0, y: 1.0 },
    delay: 0.25
  }
];

function _drawHollowMaskFormation(ctx, r, formationProg, now, fighter, maskImg, destX, destY, destW, destH) {
  if (!maskImg || !maskImg.complete || maskImg.naturalWidth <= 0) return;

  // Spring overshoot easing function
  const easeOutBack = (t) => {
    const c1 = 1.35;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  // 1. Render each flying shard ONLY after hand has clutched the face (formationProg >= 0.35)
  if (formationProg >= 0.35) {
    const maskAssemblyProg = Math.min(1.0, (formationProg - 0.35) / 0.45); // 0.0 to 1.0 (Phase 2)

    for (let i = 0; i < _MASK_FORMATION_SHARDS.length; i++) {
      const shard = _MASK_FORMATION_SHARDS[i];
      const shardProg = Math.max(0, Math.min(1.0, (maskAssemblyProg - shard.delay) / Math.max(0.01, (1.0 - shard.delay))));
      
      // Overshoot ease curve
      const ease = (shardProg >= 1.0) ? 1.0 : easeOutBack(shardProg);
      const remain = Math.max(0, 1.0 - ease);
      
      // Tight outer trajectory flight offset directly around head & hand
      const dist = r * 1.25 * remain;
      const curOffX = shard.startDir.x * dist;
      const curOffY = shard.startDir.y * dist;
      const curRot = shard.rot * remain;
      const curScale = (shardProg >= 1.0) ? 1.0 : (0.75 + 0.25 * Math.min(1.0, ease));
      const curAlpha = (shardProg >= 1.0) ? 1.0 : Math.min(1.0, 0.30 + shardProg * 0.70);

      // Shard centroid in local destination space
      let cx = 0, cy = 0;
      for (const pt of shard.poly) {
        cx += destX + pt[0] * destW;
        cy += destY + pt[1] * destH;
      }
      cx /= shard.poly.length;
      cy /= shard.poly.length;

      ctx.save();
      ctx.globalAlpha = curAlpha;

      // Apply flight translation, rotation and scale relative to shard centroid
      ctx.translate(cx + curOffX, cy + curOffY);
      ctx.rotate(curRot);
      ctx.scale(curScale, curScale);
      ctx.translate(-cx, -cy);

      // Clip strictly to polygon boundary
      ctx.beginPath();
      shard.poly.forEach((pt, idx) => {
        const px = destX + pt[0] * destW;
        const py = destY + pt[1] * destH;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.clip();

      // Draw the actual Hollow Mask PNG inside this clipped fragment cleanly
      ctx.drawImage(maskImg, 266, 143, 492, 747, destX, destY, destW, destH);

      ctx.restore();
    }
  }

  // 2. Hand-to-Face Clutching Animation (Anime Visored Manifestation Gesture)
  let handX = 0, handY = 0, handRot = 0, handAlpha = 0, handOpen = 0;
  if (formationProg < 0.35) {
    // Phase 1: Hand rises to face FIRST (0.00 -> 0.35)
    const p = formationProg / 0.35;
    const ease = p * p * (3 - 2 * p); // smooth ease in-out
    // Start from sword guard / chest level (r * 0.45, r * 0.35) up to upper face (0, -r * 0.32)
    handX = (r * 0.45) * (1.0 - ease) + (0) * ease;
    handY = (r * 0.35) * (1.0 - ease) + (-r * 0.32) * ease;
    handRot = (0.55) * (1.0 - ease) + (-0.15) * ease;
    handAlpha = Math.min(1.0, p * 1.6);
    handOpen = ease; // fingers splaying open to clutch face
  } else if (formationProg < 0.80) {
    // Phase 2: Hand firmly clutching face WHILE mask pieces and ribbons assemble underneath (0.35 -> 0.80)
    const p = (formationProg - 0.35) / 0.45;
    const tremble = Math.sin(now * 0.09) * 1.4 * (1.0 - p * 0.25);
    handX = 0 + tremble;
    handY = -r * 0.32 + tremble * 0.5;
    handRot = -0.15 + tremble * 0.04;
    handAlpha = 1.0;
    handOpen = 1.0;
  } else {
    // Phase 3: Hand swiping downward / away as mask fuses and eyes ignite (0.80 -> 1.00)
    const p = (formationProg - 0.80) / 0.20;
    const ease = p * p; // accelerating pull-away
    // Slides from face down-right toward sword grip (0, -r * 0.32) -> (r * 0.60, r * 0.40)
    handX = (0) * (1.0 - ease) + (r * 0.60) * ease;
    handY = (-r * 0.32) * (1.0 - ease) + (r * 0.40) * ease;
    handRot = (-0.15) * (1.0 - ease) + (0.45) * ease;
    handAlpha = Math.max(0, 1.0 - p * 1.25);
    handOpen = 1.0 - p * 0.4;
  }

  const isBankaiForm = Boolean(fighter.bankaiActive || fighter.skin === 'bankai' || fighter.skin === 'bankai_mask');
  _drawFaceClutchingHand(ctx, r, handX, handY, handRot, handAlpha, handOpen, now, isBankaiForm);

  // 3. Seam snap-lock impact fusion & lightning flash when pieces converge (formationProg >= 0.80)
  if (formationProg >= 0.80) {
    const flashRatio = (formationProg - 0.80) / 0.20; // 0.0 -> 1.0
    const flashAlpha = Math.sin(flashRatio * Math.PI); // Smooth pulse peak

    if (flashAlpha > 0.01) {
      ctx.save();
      // Glowing white-hot & crimson fusion seam network
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * flashAlpha})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (const shard of _MASK_FORMATION_SHARDS) {
        shard.poly.forEach((pt, idx) => {
          const px = destX + pt[0] * destW;
          const py = destY + pt[1] * destH;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
      }
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 30, 0, ${0.80 * flashAlpha})`;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Radial energy flash burst on center of mask
      const grad = ctx.createRadialGradient(0, -r * 0.25, 0, 0, -r * 0.25, r * 1.35);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.90 * flashAlpha})`);
      grad.addColorStop(0.35, `rgba(255, 30, 0, ${0.65 * flashAlpha})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -r * 0.25, r * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Menacing golden hollow eyes ignition flare
      if (formationProg >= 0.85) {
        const eyeAlpha = Math.min(1.0, (formationProg - 0.85) / 0.15);
        ctx.fillStyle = `rgba(255, 215, 0, ${0.95 * eyeAlpha})`;
        ctx.beginPath();
        ctx.arc(-r * 0.32, -r * 0.12, 3.2, 0, Math.PI * 2);
        ctx.arc(r * 0.32, -r * 0.12, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 60, 0, ${0.80 * eyeAlpha})`;
        ctx.beginPath();
        ctx.arc(-r * 0.32, -r * 0.12, 6.0, 0, Math.PI * 2);
        ctx.arc(r * 0.32, -r * 0.12, 6.0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

function _drawFaceClutchingHand(ctx, r, hx, hy, rot, alpha, open, now, isBankai) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(hx, hy);
  ctx.rotate(rot);

  const handR = getHandSize ? getHandSize(6.5) : 6.5;
  const skinColor = '#FFE0BD';

  // 1. Black Shihakusho Sleeve Cuff on Wrist
  ctx.fillStyle = '#111111';
  ctx.fillRect(-handR * 2.2, -handR * 0.8, handR * 1.4, handR * 1.6);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-handR * 2.2, -handR * 0.8, handR * 1.4, handR * 1.6);

  // White cloth bandages on wrist for Shikai
  if (!isBankai) {
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let bx = -handR * 2.0; bx < -handR * 0.9; bx += 2.2) {
      ctx.moveTo(bx, -handR * 0.7);
      ctx.lineTo(bx + 1.0, handR * 0.7);
    }
    ctx.stroke();
  }

  // 2. Palm / Hand Back
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, handR * 1.15, handR * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Five Detailed Fingers Splayed Across the Face (Anime Visored Pose)
  const fingers = [
    { name: 'thumb',  bx: -handR * 0.4, by:  handR * 0.7, angle:  1.05, len: handR * 1.35, thick: 2.5 },
    { name: 'index',  bx: -handR * 0.5, by: -handR * 0.4, angle: -1.25, len: handR * 1.65, thick: 2.4 },
    { name: 'middle', bx: -handR * 0.1, by: -handR * 0.7, angle: -1.55, len: handR * 1.85, thick: 2.5 },
    { name: 'ring',   bx:  handR * 0.4, by: -handR * 0.6, angle: -1.85, len: handR * 1.75, thick: 2.4 },
    { name: 'pinky',  bx:  handR * 0.8, by: -handR * 0.2, angle: -2.15, len: handR * 1.45, thick: 2.2 }
  ];

  for (let i = 0; i < fingers.length; i++) {
    const f = fingers[i];
    const fLen = f.len * (0.65 + 0.35 * open);
    const fAngle = f.angle * (0.75 + 0.25 * open);
    const tipX = f.bx + Math.cos(fAngle) * fLen;
    const tipY = f.by + Math.sin(fAngle) * fLen;
    const midX = (f.bx + tipX) * 0.5 + Math.cos(fAngle + 0.35) * 1.8;
    const midY = (f.by + tipY) * 0.5 + Math.sin(fAngle + 0.35) * 1.8;

    // Finger body with skin tone
    ctx.strokeStyle = skinColor;
    ctx.lineWidth = f.thick;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.bx, f.by);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();

    // Finger joint outline
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(f.bx, f.by);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();

    // Fingertip claw / clutching crease
    ctx.fillStyle = '#E8B896';
    ctx.beginPath();
    ctx.arc(tipX, tipY, f.thick * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Red & black Reiatsu electric sparks crackling from fingertips during clutch
    if (open > 0.65 && Math.random() < 0.40) {
      ctx.strokeStyle = (i % 2 === 0) ? '#FF1E00' : '#111111';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + (Math.random() - 0.5) * 9, tipY + (Math.random() - 0.5) * 9);
      ctx.stroke();
    }
  }

  // 4. Knuckle creases
  ctx.strokeStyle = 'rgba(160, 90, 50, 0.7)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-handR * 0.3, -handR * 0.2);
  ctx.lineTo(handR * 0.4, -handR * 0.3);
  ctx.stroke();

  ctx.restore();
}


